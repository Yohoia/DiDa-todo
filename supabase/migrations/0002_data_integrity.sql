-- 收紧跨表归属与事实字段约束。
-- 本项目没有 projects 表：任务的 list 字段就是工作/学习/生活清单的唯一归属来源。

create or replace function public.ensure_task_belongs_to_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_id is not null and not exists (
    select 1
    from public.tasks
    where id = new.task_id and user_id = new.user_id
  ) then
    raise foreign_key_violation using message = 'task_id must belong to user_id';
  end if;
  return new;
end;
$$;

drop trigger if exists subtasks_ensure_task_owner on public.subtasks;
create trigger subtasks_ensure_task_owner
  before insert or update of task_id, user_id on public.subtasks
  for each row execute function public.ensure_task_belongs_to_user();

drop trigger if exists focus_sessions_ensure_task_owner on public.focus_sessions;
create trigger focus_sessions_ensure_task_owner
  before insert or update of task_id, user_id on public.focus_sessions
  for each row execute function public.ensure_task_belongs_to_user();

drop policy if exists "subtasks select own" on public.subtasks;
create policy "subtasks select own" on public.subtasks
  for select using (
    auth.uid() = user_id
    and exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
  );
drop policy if exists "subtasks insert own" on public.subtasks;
create policy "subtasks insert own" on public.subtasks
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
  );
drop policy if exists "subtasks update own" on public.subtasks;
create policy "subtasks update own" on public.subtasks
  for update using (
    auth.uid() = user_id
    and exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
  ) with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
  );
drop policy if exists "subtasks delete own" on public.subtasks;
create policy "subtasks delete own" on public.subtasks
  for delete using (
    auth.uid() = user_id
    and exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
  );

drop policy if exists "focus select own" on public.focus_sessions;
create policy "focus select own" on public.focus_sessions
  for select using (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
    )
  );
drop policy if exists "focus insert own" on public.focus_sessions;
create policy "focus insert own" on public.focus_sessions
  for insert with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
    )
  );
drop policy if exists "focus update own" on public.focus_sessions;
create policy "focus update own" on public.focus_sessions
  for update using (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
    )
  ) with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
    )
  );
drop policy if exists "focus delete own" on public.focus_sessions;
create policy "focus delete own" on public.focus_sessions
  for delete using (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid())
    )
  );

alter table public.voice_captures
  drop constraint if exists voice_captures_duration_nonnegative;
alter table public.voice_captures
  add constraint voice_captures_duration_nonnegative
  check (duration_seconds is null or duration_seconds >= 0) not valid;

alter table public.focus_sessions
  drop constraint if exists focus_sessions_duration_nonnegative;
alter table public.focus_sessions
  add constraint focus_sessions_duration_nonnegative
  check (duration_seconds >= 0) not valid;

alter table public.focus_sessions
  drop constraint if exists focus_sessions_time_order;
alter table public.focus_sessions
  add constraint focus_sessions_time_order
  check (ended_at is null or ended_at >= started_at) not valid;
