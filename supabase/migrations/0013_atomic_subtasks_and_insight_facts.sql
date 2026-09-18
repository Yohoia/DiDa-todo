-- A task and its child list share one row version and one transaction.
create or replace function public.set_task_version()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_task_version();

-- Direct child writes from an older client must also invalidate task snapshots.
create or replace function public.advance_subtask_parent_version()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op <> 'INSERT' then
    update public.tasks set updated_at = clock_timestamp() where id = old.task_id;
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.task_id <> old.task_id) then
    update public.tasks set updated_at = clock_timestamp() where id = new.task_id;
  end if;
  return null;
end;
$$;

drop trigger if exists subtasks_advance_parent_version on public.subtasks;
create trigger subtasks_advance_parent_version after insert or update or delete on public.subtasks
  for each row execute function public.advance_subtask_parent_version();

create or replace function public.update_task_with_subtasks(
  p_task_id uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb,
  p_subtasks jsonb
)
returns table(updated_at timestamptz)
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  current_version timestamptz;
  assignments text := '';
  field text;
  child jsonb;
  position_index integer := 0;
  written integer;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_patch) is distinct from 'object'
     or jsonb_typeof(p_subtasks) is distinct from 'array' then
    raise invalid_parameter_value using message = 'invalid task patch';
  end if;
  for field in select jsonb_object_keys(p_patch) loop
    if not (field = any(array['title','description','list','tags','date','time',
      'duration_minutes','priority','estimate','reminder','repeat_interval_days',
      'completed','completed_at','frozen','featured'])) then
      raise invalid_parameter_value using message = 'unsupported task field';
    end if;
    assignments := assignments || format('%I = (jsonb_populate_record(null::public.tasks, $1)).%I, ', field, field);
  end loop;

  select task.updated_at into current_version from public.tasks task
    where task.id = p_task_id and task.user_id = auth.uid() for update;
  if not found or (p_expected_updated_at is not null and current_version <> p_expected_updated_at) then
    return;
  end if;
  if (select count(*) from jsonb_array_elements(p_subtasks)) <>
     (select count(distinct item->>'id') from jsonb_array_elements(p_subtasks) item) then
    raise invalid_parameter_value using message = 'duplicate or missing subtask id';
  end if;

  -- Update children first so completing a repeat clones the confirmed child list.
  for child in select value from jsonb_array_elements(p_subtasks) loop
    if nullif(btrim(child->>'title'), '') is null or char_length(child->>'title') > 200 then
      raise invalid_parameter_value using message = 'invalid subtask title';
    end if;
    insert into public.subtasks as existing (id, task_id, user_id, title, completed, position)
    values ((child->>'id')::uuid, p_task_id, auth.uid(), child->>'title',
      coalesce((child->>'completed')::boolean, false), position_index)
    on conflict (id) do update set title = excluded.title, completed = excluded.completed,
      position = excluded.position
      where existing.task_id = p_task_id and existing.user_id = auth.uid();
    get diagnostics written = row_count;
    if written <> 1 then
      raise invalid_parameter_value using message = 'subtask belongs to another task';
    end if;
    position_index := position_index + 1;
  end loop;
  delete from public.subtasks existing where existing.task_id = p_task_id
    and existing.user_id = auth.uid()
    and not exists (select 1 from jsonb_array_elements(p_subtasks) item
      where (item->>'id')::uuid = existing.id);

  return query execute 'update public.tasks set ' || assignments ||
    'updated_at = clock_timestamp() where id = $2 and user_id = auth.uid() returning updated_at'
    using p_patch, p_task_id;
end;
$$;

revoke all on function public.update_task_with_subtasks(uuid,timestamptz,jsonb,jsonb) from public, anon;
grant execute on function public.update_task_with_subtasks(uuid,timestamptz,jsonb,jsonb) to authenticated;

-- Per-day facts include prior months for a complete seven-day review.
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
    'completedActivity', coalesce((
      select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), count) from (
        select (completed_at at time zone p_time_zone)::date as day, count(*)
        from public.tasks where user_id = auth.uid() and completed and completed_at is not null
        group by 1
      ) daily_completed
    ), '{}'::jsonb),
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
