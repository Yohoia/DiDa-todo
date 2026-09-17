-- Additive recurrence support: complete one occurrence to create at most one next.
alter table public.tasks add column if not exists repeat_interval_days integer;
alter table public.tasks add column if not exists repeat_parent_id uuid references public.tasks(id) on delete set null;
alter table public.tasks add constraint tasks_repeat_interval_valid check (repeat_interval_days is null or repeat_interval_days between 1 and 365);
create unique index tasks_one_repeat_child on public.tasks(repeat_parent_id) where repeat_parent_id is not null;

create function public.ensure_repeat_parent_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.repeat_parent_id is not null and (
    new.repeat_parent_id = new.id or not exists (
      select 1 from public.tasks where id = new.repeat_parent_id and user_id = new.user_id
    )
  ) then
    raise foreign_key_violation using message = 'repeat_parent_id must belong to user_id';
  end if;
  return new;
end;
$$;
create trigger tasks_repeat_parent_owner before insert or update of repeat_parent_id, user_id on public.tasks
for each row execute function public.ensure_repeat_parent_owner();

create function public.create_next_task_occurrence()
returns trigger language plpgsql set search_path = public as $$
declare
  today_key date := (now() at time zone 'Asia/Shanghai')::date;
  base_date date := coalesce(new.date, today_key);
  next_date date;
  child_id uuid;
begin
  if old.completed or not new.completed or new.repeat_interval_days is null then return new; end if;
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
create trigger tasks_create_next_occurrence after update of completed on public.tasks
for each row execute function public.create_next_task_occurrence();
