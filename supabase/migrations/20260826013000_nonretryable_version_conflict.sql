-- PostgREST retries SQLSTATE 40001 as a serialization failure. A stale
-- expected-version write is an application conflict, so use a non-retryable
-- PostgreSQL exception and let the Next.js repository translate it to 409.
create or replace function public.edit_care_entry(
  p_entry_id uuid,
  p_expected_version integer,
  p_content text default null,
  p_title text default null,
  p_revert_from_version integer default null
)
returns public.entry_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := (select private.current_app_role());
  actor_clinic uuid := (select private.current_clinic_id());
  entry_row public.care_entries;
  current_row public.entry_versions;
  source_row public.entry_versions;
  new_row public.entry_versions;
  next_version integer;
  next_title text;
  next_content text;
  audit_action text;
begin
  if actor_id is null or actor_role not in ('staff', 'clinician') then
    raise exception using errcode = '42501', message = 'ENTRY_EDIT_FORBIDDEN';
  end if;

  select * into entry_row from public.care_entries e where e.id = p_entry_id for update;
  if not found or entry_row.clinic_id <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;

  if entry_row.author_id <> actor_id or entry_row.author_role <> actor_role then
    raise exception using errcode = '42501', message = 'ENTRY_OWNERSHIP_DENIED';
  end if;

  if entry_row.current_version <> p_expected_version then
    raise exception using
      errcode = 'P0001',
      message = 'VERSION_CONFLICT',
      detail = json_build_object(
        'current_version', entry_row.current_version,
        'attempted_version', p_expected_version
      )::text;
  end if;

  select * into current_row
  from public.entry_versions v
  where v.care_entry_id = p_entry_id and v.version = entry_row.current_version;

  if p_revert_from_version is not null then
    select * into source_row
    from public.entry_versions v
    where v.care_entry_id = p_entry_id and v.version = p_revert_from_version;
    if not found then
      raise exception using errcode = '22023', message = 'REVERT_SOURCE_NOT_FOUND';
    end if;
    next_title := source_row.title;
    next_content := source_row.content;
    audit_action := 'ENTRY_REVERTED';
  else
    next_title := coalesce(nullif(trim(p_title), ''), current_row.title);
    next_content := nullif(trim(p_content), '');
    if next_content is null then
      raise exception using errcode = '22023', message = 'ENTRY_CONTENT_REQUIRED';
    end if;
    audit_action := 'ENTRY_UPDATED';
  end if;

  next_version := entry_row.current_version + 1;
  insert into public.entry_versions (
    care_entry_id, version, title, content, actor_id, reverted_from_version
  ) values (
    p_entry_id, next_version, next_title, next_content, actor_id, p_revert_from_version
  ) returning * into new_row;

  update public.care_entries
  set current_version = next_version, updated_at = now()
  where id = p_entry_id;

  insert into public.audit_logs (
    clinic_id, actor_id, action, entity_type, entity_id,
    from_version, to_version, metadata
  ) values (
    actor_clinic, actor_id, audit_action, 'care_entry', p_entry_id,
    entry_row.current_version, next_version,
    case when p_revert_from_version is null then '{}'::jsonb
      else jsonb_build_object('reverted_from_version', p_revert_from_version) end
  );

  return new_row;
end;
$$;
