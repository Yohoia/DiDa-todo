-- 站内通知中心：任务到期提醒持久化。
-- 设计要点：
--   1. 一任务至多一条 task_due 通知（唯一索引兜底，多标签页/补扫重复写入安全）
--   2. 错过页面的提醒在用户回访时补扫生成，因此无需后台 Cron
--   3. RLS 仅本人读写；任务删除时通知级联清理

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('task_due')),
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_task_once
  on public.notifications (task_id);

create index if not exists notifications_user_inbox
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications insert own" on public.notifications;
create policy "notifications insert own" on public.notifications
  for insert with check (auth.uid() = user_id);
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications
  for delete using (auth.uid() = user_id);
