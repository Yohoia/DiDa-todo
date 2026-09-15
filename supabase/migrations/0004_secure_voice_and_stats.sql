-- 付费语音接口的共享限流，以及服务端聚合的专注统计。

-- ============ voice_rate_limits：每用户、每分钟原子计数 ============
create table if not exists public.voice_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('transcribe', 'parse')),
  window_start timestamptz not null,
  request_count int not null default 1 check (request_count >= 1),
  primary key (user_id, scope, window_start)
);

alter table public.voice_rate_limits enable row level security;

-- 客户端不能直接读写计数，只能由下方 security definer 函数消费配额。
revoke all on table public.voice_rate_limits from anon, authenticated;

create or replace function public.consume_voice_quota(p_scope text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  request_limit integer;
  current_window timestamptz := date_trunc('minute', now());
  current_count integer;
begin
  if current_user_id is null then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  request_limit := case p_scope
    when 'transcribe' then 8
    when 'parse' then 16
    else null
  end;
  if request_limit is null then
    raise invalid_parameter_value using message = 'invalid voice quota scope';
  end if;

  insert into public.voice_rate_limits (user_id, scope, window_start, request_count)
  values (current_user_id, p_scope, current_window, 1)
  on conflict (user_id, scope, window_start)
  do update set request_count = public.voice_rate_limits.request_count + 1
  returning request_count into current_count;

  -- 清理仅限当前用户的历史桶，避免这张小表无限增长。
  delete from public.voice_rate_limits
  where user_id = current_user_id
    and window_start < now() - interval '1 day';

  return query
  select
    current_count <= request_limit,
    greatest(1, ceil(extract(epoch from (current_window + interval '1 minute' - now())))::integer);
end;
$$;

revoke all on function public.consume_voice_quota(text) from public, anon;
grant execute on function public.consume_voice_quota(text) to authenticated;

-- ============ get_focus_stats：数据库端聚合，避免 PostgREST 默认 1000 行截断 ============
create or replace function public.get_focus_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with boundaries as (
    select (now() at time zone 'Asia/Shanghai')::date as today
  ),
  focus_by_day as (
    select
      (started_at at time zone 'Asia/Shanghai')::date as day,
      sum(greatest(duration_seconds, 0))::bigint as seconds
    from public.focus_sessions
    where user_id = auth.uid() and mode = 'focus'
    group by 1
  ),
  completed as (
    select (completed_at at time zone 'Asia/Shanghai')::date as day
    from public.tasks
    where user_id = auth.uid() and completed and completed_at is not null
  )
  select jsonb_build_object(
    'activity', coalesce(
      (select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), seconds) from focus_by_day),
      '{}'::jsonb
    ),
    'completedTasks', (select count(*) from completed),
    'completedTasksThisMonth', (
      select count(*)
      from completed, boundaries
      where completed.day >= date_trunc('month', boundaries.today)::date
        and completed.day <= boundaries.today
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
      where focus_by_day.day >= boundaries.today - (extract(isodow from boundaries.today)::integer - 1)
        and focus_by_day.day <= boundaries.today
    ), 0)
  )
  from boundaries;
$$;

revoke all on function public.get_focus_stats() from public, anon;
grant execute on function public.get_focus_stats() to authenticated;
