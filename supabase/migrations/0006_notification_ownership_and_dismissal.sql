-- 清空通知使用持久隐藏标记，不删除去重记录，避免回访补扫重新提醒。
alter table public.notifications add column if not exists dismissed_at timestamptz;

-- 修复旧数据中可能存在的跨用户关联：保留记录，但解除错误关联和唯一索引占位。
update public.notifications n
set task_id = null, dismissed_at = coalesce(n.dismissed_at, now()), read = true
where n.task_id is not null and not exists (
  select 1 from public.tasks t where t.id = n.task_id and t.user_id = n.user_id
);

drop trigger if exists notifications_ensure_task_owner on public.notifications;
create trigger notifications_ensure_task_owner
  before insert or update of task_id, user_id on public.notifications
  for each row execute function public.ensure_task_belongs_to_user();

drop policy if exists "notifications insert own" on public.notifications;
create policy "notifications insert own" on public.notifications
  for insert with check (
    auth.uid() = user_id
    and task_id is not null
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      (task_id is null and dismissed_at is not null)
      or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    )
  );
