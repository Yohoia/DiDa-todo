-- Keep aggregate notification display data language-independent.
alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;
