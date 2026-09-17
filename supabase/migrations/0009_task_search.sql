-- Database-side task search with bounded pagination and owner-only RLS.
-- The window count is computed before LIMIT, unlike an RPC response count.
drop function if exists public.search_tasks(text, integer, integer);
create or replace function public.search_tasks(
  p_query text,
  p_limit integer,
  p_offset integer
)
returns table(task jsonb, total_count bigint)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_pattern text :=
    '%' ||
    replace(replace(replace(lower(p_query), '\', '\\'), '%', '\%'), '_', '\_') ||
    '%';
begin
  if nullif(trim(p_query), '') is null then
    return;
  end if;

  return query
  select
    to_jsonb(page) - 'total_count' as task,
    page.total_count
  from (
    select
      tasks.*,
      count(*) over () as total_count
    from public.tasks
    where user_id = auth.uid()
      and (
        lower(title) like v_pattern escape '\'
        or lower(description) like v_pattern escape '\'
        or exists (
          select 1
          from unnest(tags) as tag
          where lower(tag) like v_pattern escape '\'
        )
      )
    order by completed asc, updated_at desc, id asc
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
    offset greatest(coalesce(p_offset, 0), 0)
  ) as page;
end;
$$;

revoke all on function public.search_tasks(text, integer, integer) from public, anon;
grant execute on function public.search_tasks(text, integer, integer) to authenticated;

-- Supabase exposes contrib extensions in the `extensions` schema. Local PGlite
-- does not, so the function remains correct there while this index is skipped.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    create extension if not exists pg_trgm with schema extensions;
    execute $ddl$
      create index if not exists tasks_user_title_trgm
      on public.tasks using gin (lower(title) extensions.gin_trgm_ops);
      create index if not exists tasks_user_description_trgm
      on public.tasks using gin (lower(description) extensions.gin_trgm_ops);
    $ddl$;
  end if;
end;
$$;
