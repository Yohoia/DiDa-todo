-- DiDa-todo 统一 schema（幂等：可重复执行）
-- 覆盖全部持久化数据：
--   登录注册     → Supabase Auth 托管（auth.users），新用户由触发器自动建档
--   用户档案     → profiles（昵称/头像/语言/主题，替代 cookie）
--   工作台偏好   → user_preferences（周起始/音效/番茄时长/自动休息/容量/提醒）
--   任务/子任务  → tasks / subtasks
--   语音         → voice_captures（原文+解析留档）/ voice_hotwords（语料库）
--   专注统计     → focus_sessions（Insights 数据源，统计全部派生不落表）
-- 设计要点：
--   1. RLS 第一天就启用（auth.uid() = user_id），应用层 + 数据库双重隔离
--   2. date/time 是唯一时间事实；schedule 派生自二者 + duration_minutes
--   3. 纯派生值（inWorkList 等）不入库；统计/经验值从事实表计算，不冗余存储
--   4. One Thing（featured）用部分唯一索引保证每用户至多一条

-- ============ 通用：updated_at 触发器 ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ profiles：用户档案 ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  locale text not null default 'zh-CN' check (locale in ('zh-CN', 'en')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============ user_preferences：工作台偏好 ============
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_day text not null default 'Monday' check (first_day in ('Monday', 'Sunday')),
  sound boolean not null default true,
  pomodoro_duration int not null default 25 check (pomodoro_duration between 5 and 120),
  auto_break boolean not null default false,
  daily_capacity int not null default 8 check (daily_capacity between 1 and 20),
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "preferences select own" on public.user_preferences;
create policy "preferences select own" on public.user_preferences
  for select using (auth.uid() = user_id);
drop policy if exists "preferences insert own" on public.user_preferences;
create policy "preferences insert own" on public.user_preferences
  for insert with check (auth.uid() = user_id);
drop policy if exists "preferences update own" on public.user_preferences;
create policy "preferences update own" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 新用户自动建档（注册即有 profiles + preferences 行） ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ tasks：任务 ============
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  list text not null check (list in ('Inbox', 'Work', 'Study', 'Life')),
  tags text[] not null default '{}',
  date date,
  time time,
  duration_minutes int,                    -- 日历时间块时长（原 schedule.duration）
  priority smallint not null default 3 check (priority between 1 and 3),
  estimate int not null default 1 check (estimate >= 1),
  reminder text not null default 'None',
  completed boolean not null default false,
  completed_at timestamptz,
  frozen boolean not null default false,   -- 承诺锁
  featured boolean not null default false, -- One Thing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 每用户至多一条未完成的 One Thing
create unique index if not exists tasks_one_thing
  on public.tasks (user_id) where featured and not completed;

-- 常用查询路径
create index if not exists tasks_user_date on public.tasks (user_id, date);
create index if not exists tasks_user_list on public.tasks (user_id, list) where not completed;
create index if not exists tasks_user_completed on public.tasks (user_id, completed);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "tasks select own" on public.tasks;
create policy "tasks select own" on public.tasks
  for select using (auth.uid() = user_id);
drop policy if exists "tasks insert own" on public.tasks;
create policy "tasks insert own" on public.tasks
  for insert with check (auth.uid() = user_id);
drop policy if exists "tasks update own" on public.tasks;
create policy "tasks update own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tasks delete own" on public.tasks;
create policy "tasks delete own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ============ subtasks：子任务 ============
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subtasks_task on public.subtasks (task_id, position);

alter table public.subtasks enable row level security;

drop policy if exists "subtasks select own" on public.subtasks;
create policy "subtasks select own" on public.subtasks
  for select using (auth.uid() = user_id);
drop policy if exists "subtasks insert own" on public.subtasks;
create policy "subtasks insert own" on public.subtasks
  for insert with check (auth.uid() = user_id);
drop policy if exists "subtasks update own" on public.subtasks;
create policy "subtasks update own" on public.subtasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "subtasks delete own" on public.subtasks;
create policy "subtasks delete own" on public.subtasks
  for delete using (auth.uid() = user_id);

-- ============ voice_captures：语音留档 ============
-- 注意：持久化转写文本后，README 的"录音即传即弃"隐私说明需要同步改为
-- "音频即传即弃，转写文本与解析结果保存在你的账户下，可随时删除"。
create table if not exists public.voice_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transcript text not null,
  parsed jsonb,                        -- 解析结果留档（复看/调试/统计）
  task_count int not null default 0,   -- 实际落库的待办数
  duration_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists voice_captures_user_time
  on public.voice_captures (user_id, created_at desc);

alter table public.voice_captures enable row level security;

drop policy if exists "voice_captures select own" on public.voice_captures;
create policy "voice_captures select own" on public.voice_captures
  for select using (auth.uid() = user_id);
drop policy if exists "voice_captures insert own" on public.voice_captures;
create policy "voice_captures insert own" on public.voice_captures
  for insert with check (auth.uid() = user_id);
drop policy if exists "voice_captures delete own" on public.voice_captures;
create policy "voice_captures delete own" on public.voice_captures
  for delete using (auth.uid() = user_id);

-- ============ voice_hotwords：语音热词（设置页语料库） ============
create table if not exists public.voice_hotwords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 20),
  weight int not null default 3 check (weight between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

alter table public.voice_hotwords enable row level security;

drop policy if exists "hotwords select own" on public.voice_hotwords;
create policy "hotwords select own" on public.voice_hotwords
  for select using (auth.uid() = user_id);
drop policy if exists "hotwords insert own" on public.voice_hotwords;
create policy "hotwords insert own" on public.voice_hotwords
  for insert with check (auth.uid() = user_id);
drop policy if exists "hotwords update own" on public.voice_hotwords;
create policy "hotwords update own" on public.voice_hotwords
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "hotwords delete own" on public.voice_hotwords;
create policy "hotwords delete own" on public.voice_hotwords
  for delete using (auth.uid() = user_id);

-- ============ focus_sessions：专注记录（Insights 数据源） ============
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  mode text not null default 'focus' check (mode in ('focus', 'break')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int not null default 0,
  completed boolean not null default false
);

create index if not exists focus_sessions_user_time
  on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists "focus select own" on public.focus_sessions;
create policy "focus select own" on public.focus_sessions
  for select using (auth.uid() = user_id);
drop policy if exists "focus insert own" on public.focus_sessions;
create policy "focus insert own" on public.focus_sessions
  for insert with check (auth.uid() = user_id);
drop policy if exists "focus update own" on public.focus_sessions;
create policy "focus update own" on public.focus_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "focus delete own" on public.focus_sessions;
create policy "focus delete own" on public.focus_sessions
  for delete using (auth.uid() = user_id);
