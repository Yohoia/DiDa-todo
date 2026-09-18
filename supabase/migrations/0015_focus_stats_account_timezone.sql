-- Let the stats RPC resolve the account timezone in one database round trip.
-- Explicit timezone arguments remain authoritative for compatibility and tests.
create or replace function public.get_focus_stats(p_time_zone text default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with preferences as (
    select
      coalesce(p_time_zone, max(time_zone), 'Asia/Shanghai') as time_zone,
      coalesce(max(pomodoro_duration), 25)::integer as pomodoro_minutes,
      coalesce(max(daily_focus_goal_minutes), 120)::integer as daily_focus_goal_minutes
    from public.user_preferences where user_id = auth.uid()
  ),
  boundaries as (
    select (now() at time zone preferences.time_zone)::date as today from preferences
  ),
  focus_by_day as (
    select
      (started_at at time zone preferences.time_zone)::date as day,
      sum(greatest(duration_seconds, 0))::bigint as seconds
    from public.focus_sessions, preferences
    where user_id = auth.uid() and mode = 'focus'
    group by 1
  ),
  completed as (
    select
      tasks.id,
      tasks.list,
      tasks.estimate,
      (completed_at at time zone preferences.time_zone)::date as day
    from public.tasks, boundaries, preferences
    where user_id = auth.uid()
      and completed
      and completed_at is not null
      and (completed_at at time zone preferences.time_zone)::date
        >= date_trunc('month', boundaries.today)::date
      and (completed_at at time zone preferences.time_zone)::date <= boundaries.today
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
    'timeZone', preferences.time_zone,
    'activity', coalesce(
      (select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), seconds) from focus_by_day),
      '{}'::jsonb
    ),
    'completedActivity', coalesce((
      select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), count) from (
        select (completed_at at time zone preferences.time_zone)::date as day, count(*)
        from public.tasks, preferences
        where user_id = auth.uid() and completed and completed_at is not null
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
      from public.focus_sessions, boundaries, preferences
      where focus_sessions.user_id = auth.uid()
        and focus_sessions.task_id is null
        and focus_sessions.mode = 'focus'
        and (focus_sessions.started_at at time zone preferences.time_zone)::date
          >= date_trunc('month', boundaries.today)::date
        and (focus_sessions.started_at at time zone preferences.time_zone)::date
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
  from boundaries, preferences;
$$;

revoke all on function public.get_focus_stats(text) from public, anon;
grant execute on function public.get_focus_stats(text) to authenticated;
