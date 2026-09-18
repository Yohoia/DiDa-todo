-- Auth deletes this user's parent tasks as part of the same account cascade.
-- Its restricted database role cannot update tasks from a subtask trigger.
-- Skip only Auth-role deletes; client edits keep invoker RLS/version checks.
create or replace function public.advance_subtask_parent_version()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' and current_user = 'supabase_auth_admin' then
    return null;
  end if;
  if tg_op <> 'INSERT' then
    update public.tasks set updated_at = clock_timestamp() where id = old.task_id;
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.task_id <> old.task_id) then
    update public.tasks set updated_at = clock_timestamp() where id = new.task_id;
  end if;
  return null;
end;
$$;
