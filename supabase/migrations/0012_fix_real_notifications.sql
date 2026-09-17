-- 0010 added aggregate notifications, but 0006's ownership policies still
-- required every notification to reference an owned task.
drop policy if exists "notifications insert own" on public.notifications;
create policy "notifications insert own" on public.notifications
  for insert with check (
    auth.uid() = user_id
    and (
      (type = 'daily_digest' and task_id is null)
      or (
        type = 'task_due'
        and task_id is not null
        and exists (
          select 1 from public.tasks task
          where task.id = task_id and task.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (
        select 1 from public.tasks task
        where task.id = task_id and task.user_id = auth.uid()
      )
    )
  );
