-- Account deletion audit and per-user date display preferences.

drop function if exists public.get_focus_stats();

alter table public.user_preferences
  add column if not exists time_zone text not null default 'Asia/Shanghai';
alter table public.user_preferences
  add column if not exists hour_12 boolean not null default false;

create or replace function public.validate_user_time_zone()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.time_zone is null or not exists (
    select 1 from pg_timezone_names where name = new.time_zone
  ) then
    raise invalid_parameter_value using message = 'invalid time zone';
  end if;
  return new;
end;
$$;

drop trigger if exists user_preferences_validate_time_zone on public.user_preferences;
create trigger user_preferences_validate_time_zone
  before insert or update of time_zone on public.user_preferences
  for each row execute function public.validate_user_time_zone();

-- Kept outside auth.users so the security audit survives account deletion. It
-- deliberately contains no email, task content, transcript, or credentials.
create table if not exists public.account_deletion_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null check (status in ('requested', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.account_deletion_audits enable row level security;
revoke all on table public.account_deletion_audits from anon, authenticated;

create or replace function public.get_focus_stats(p_time_zone text default 'Asia/Shanghai')
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with boundaries as (
    select (now() at time zone p_time_zone)::date as today
  ),
  preferences as (
    select
      coalesce(max(pomodoro_duration), 25)::integer as pomodoro_minutes,
      coalesce(max(daily_focus_goal_minutes), 120)::integer as daily_focus_goal_minutes
    from public.user_preferences where user_id = auth.uid()
  ),
  focus_by_day as (
    select
      (started_at at time zone p_time_zone)::date as day,
      sum(greatest(duration_seconds, 0))::bigint as seconds
    from public.focus_sessions
    where user_id = auth.uid() and mode = 'focus'
    group by 1
  ),
  completed as (
    select
      tasks.id,
      tasks.list,
      tasks.estimate,
      (completed_at at time zone p_time_zone)::date as day
    from public.tasks, boundaries
    where user_id = auth.uid()
      and completed
      and completed_at is not null
      and (completed_at at time zone p_time_zone)::date
        >= date_trunc('month', boundaries.today)::date
      and (completed_at at time zone p_time_zone)::date <= boundaries.today
  ),
  completed_effort as (
    select
      completed.id,
      completed.list,
      completed.estimate * preferences.pomodoro_minutes * 60 as estimated_seconds,
      coalesce((
        select sum(greatest(focus_sessions.duration_seconds, 0))
        from public.focus_sessions
        where focus_sessions.user_id = auth.uid()
          and focus_sessions.task_id = completed.id
      ), 0)::bigint as actual_seconds
    from completed, preferences
  ),
  check_in_days as (
    select day from focus_by_day
    union
    select day from completed
  )
  select jsonb_build_object(
    'activity', coalesce(
      (select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), seconds) from focus_by_day),
      '{}'::jsonb
    ),
    'completedTasks', (select count(*) from public.tasks where user_id = auth.uid() and completed),
    'completedTasksThisMonth', (select count(*) from completed),
    'checkInDaysThisMonth', (
      select count(*) from check_in_days, boundaries
      where check_in_days.day >= date_trunc('month', boundaries.today)::date
        and check_in_days.day <= boundaries.today
    ),
    'focusSeconds', coalesce((select sum(seconds) from focus_by_day), 0),
    'focusSecondsThisMonth', coalesce((
      select sum(seconds)
      from focus_by_day, boundaries
      where focus_by_day.day >= date_trunc('month', boundaries.today)::date
        and focus_by_day.day <= boundaries.today
    ), 0),
    'focusSecondsThisWeek', coalesce((
      select sum(seconds)
      from focus_by_day, boundaries
      where focus_by_day.day
        >= boundaries.today - (extract(isodow from boundaries.today)::integer - 1)
        and focus_by_day.day <= boundaries.today
    ), 0),
    'estimatedSecondsThisMonth', coalesce(
      (select sum(estimated_seconds) from completed_effort), 0
    ),
    'actualTaskSecondsThisMonth', coalesce(
      (select sum(actual_seconds) from completed_effort), 0
    ),
    'unlinkedTaskSecondsThisMonth', coalesce((
      select sum(greatest(focus_sessions.duration_seconds, 0))
      from public.focus_sessions, boundaries
      where focus_sessions.user_id = auth.uid()
        and focus_sessions.task_id is null
        and focus_sessions.mode = 'focus'
        and (focus_sessions.started_at at time zone p_time_zone)::date
          >= date_trunc('month', boundaries.today)::date
        and (focus_sessions.started_at at time zone p_time_zone)::date
          <= boundaries.today
    ), 0),
    'listDistributionThisMonth', coalesce((
      select jsonb_object_agg(list, count)
      from (
        select list, count(*) as count from completed group by list
      ) distribution
    ), '{}'::jsonb),
    'dailyFocusGoalMinutes', (select daily_focus_goal_minutes from preferences)
  )
  from boundaries;
$$;

revoke all on function public.get_focus_stats(text) from public, anon;
grant execute on function public.get_focus_stats(text) to authenticated;

create or replace function public.create_next_task_occurrence()
returns trigger language plpgsql set search_path = public as $$
declare
  user_time_zone text;
  today_key date;
  base_date date;
  next_date date;
  child_id uuid;
begin
  select coalesce(time_zone, 'Asia/Shanghai') into user_time_zone
  from public.user_preferences where user_id = new.user_id;
  today_key := (now() at time zone coalesce(user_time_zone, 'Asia/Shanghai'))::date;
  if old.completed or not new.completed or new.repeat_interval_days is null then return new; end if;
  base_date := coalesce(new.date, today_key);
  next_date := base_date + greatest(1, floor((today_key - base_date)::numeric / new.repeat_interval_days)::integer + 1) * new.repeat_interval_days;
  insert into public.tasks (user_id, title, description, list, tags, date, time, duration_minutes, priority, estimate, reminder, repeat_interval_days, repeat_parent_id)
  values (new.user_id, new.title, new.description, new.list, new.tags, next_date, new.time, new.duration_minutes, new.priority, new.estimate, new.reminder, new.repeat_interval_days, new.id)
  on conflict (repeat_parent_id) where repeat_parent_id is not null do nothing returning id into child_id;
  if child_id is not null then
    insert into public.subtasks (task_id, user_id, title, completed, position)
    select child_id, new.user_id, title, false, position from public.subtasks where task_id = new.id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.sync_growth_rewards()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  user_time_zone text;
  enabled boolean;
  total_focus_seconds bigint;
  completed_count bigint;
  max_streak integer;
  plant_count integer;
begin
  if current_user_id is null then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  select gamification_enabled, coalesce(time_zone, 'Asia/Shanghai')
    into enabled, user_time_zone
  from public.user_preferences where user_id = current_user_id;
  if not coalesce(enabled, true) then return; end if;

  with ordered_focus as (
    select
      duration_seconds,
      ended_at,
      sum(greatest(duration_seconds, 0)) over (
        order by started_at, id rows between unbounded preceding and 1 preceding
      ) as previous_seconds
    from public.focus_sessions
    where user_id = current_user_id and mode = 'focus'
  ),
  boundaries as (
    select
      'focus-block-' || ((floor((previous_seconds + duration_seconds - 1) / 7200) + 1)::integer)::text as event_key,
      coalesce(ended_at, now()) as planted_at,
      (floor((previous_seconds + duration_seconds - 1) / 7200)::integer) as block_number
    from ordered_focus
    where floor((previous_seconds + duration_seconds) / 7200)
      > floor(coalesce(previous_seconds, 0) / 7200)
  ),
  inserted_events as (
    insert into public.growth_events
      (user_id, event_type, event_key, xp, coins, metadata, source_at)
    select current_user_id, 'focus_plant', event_key, 120, 10,
      jsonb_build_object('block', block_number + 1), planted_at
    from boundaries
    on conflict do nothing
    returning event_key, source_at, metadata
  )
  insert into public.growth_plants (user_id, event_key, symbol, planted_at)
  select
    current_user_id,
    event_key,
    (array['tree','forest','potted','leaf'])[1 + ((metadata->>'block')::integer - 1) % 4],
    source_at
  from inserted_events
  on conflict do nothing;

  select
    coalesce(sum(greatest(focus_sessions.duration_seconds, 0)), 0),
    (select count(*) from public.tasks
      where user_id = current_user_id and completed)
  into total_focus_seconds, completed_count
  from public.focus_sessions
  where focus_sessions.user_id = current_user_id
    and focus_sessions.mode = 'focus';

  select max(streak) into max_streak from (
    select count(*) as streak
    from (
      select day, row_number() over (order by day) as row_number
      from (
        select distinct ((started_at at time zone user_time_zone)::date) as day
        from public.focus_sessions
        where user_id = current_user_id and mode = 'focus'
      ) focus_days
    ) numbered
    group by day - row_number::integer
  ) streaks;
  select count(*) into plant_count
  from public.growth_plants where user_id = current_user_id;

  if total_focus_seconds >= 1 then
    insert into public.growth_events
      (user_id,event_type,event_key,xp,coins,metadata,source_at)
    values (current_user_id,'achievement','first-focus',20,5,'{"kind":"first-focus"}',now())
    on conflict do nothing;
  end if;
  if total_focus_seconds >= 36000 then
    insert into public.growth_events
      (user_id,event_type,event_key,xp,coins,metadata,source_at)
    values (current_user_id,'achievement','focus-10-hours',100,20,'{"kind":"focus-10-hours"}',now())
    on conflict do nothing;
  end if;
  if completed_count >= 50 then
    insert into public.growth_events
      (user_id,event_type,event_key,xp,coins,metadata,source_at)
    values (current_user_id,'achievement','tasks-50',100,20,'{"kind":"tasks-50"}',now())
    on conflict do nothing;
  end if;
  if coalesce(max_streak, 0) >= 7 then
    insert into public.growth_events
      (user_id,event_type,event_key,xp,coins,metadata,source_at)
    values (current_user_id,'achievement','focus-streak-7',120,25,'{"kind":"focus-streak-7"}',now())
    on conflict do nothing;
  end if;
  if plant_count >= 10 then
    insert into public.growth_events
      (user_id,event_type,event_key,xp,coins,metadata,source_at)
    values (current_user_id,'achievement','plants-10',150,30,'{"kind":"plants-10"}',now())
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.sync_growth_rewards() from public, anon;
grant execute on function public.sync_growth_rewards() to authenticated;
