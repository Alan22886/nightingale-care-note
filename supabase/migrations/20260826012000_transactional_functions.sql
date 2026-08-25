revoke update on public.care_entries from authenticated;
grant update (visibility, trust_state, decay_tier, superseded_by) on public.care_entries to authenticated;

create or replace function public.reject_immutable_version_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'ENTRY_VERSIONS_ARE_IMMUTABLE';
end;
$$;

create trigger entry_versions_immutable
before update or delete on public.entry_versions
for each row execute function public.reject_immutable_version_change();

create or replace function public.validate_provenance_span()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_content text;
  version_entry_id uuid;
  resolved_excerpt text;
begin
  select v.content, v.care_entry_id
  into source_content, version_entry_id
  from public.entry_versions v
  where v.id = new.source_version_id;

  if source_content is null or version_entry_id <> new.source_entry_id then
    raise exception using errcode = '23514', message = 'PROVENANCE_VERSION_ENTRY_MISMATCH';
  end if;

  resolved_excerpt := substring(
    source_content from new.start_offset + 1 for new.end_offset - new.start_offset
  );

  if resolved_excerpt <> new.source_excerpt then
    raise exception using errcode = '23514', message = 'PROVENANCE_SPAN_MISMATCH';
  end if;

  if encode(extensions.digest(new.source_excerpt, 'sha256'), 'hex') <> new.source_hash then
    raise exception using errcode = '23514', message = 'PROVENANCE_HASH_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger provenance_spans_validate
before insert or update on public.provenance_spans
for each row execute function public.validate_provenance_span();

create or replace function public.create_care_entry(
  p_patient_id uuid,
  p_entry_type text,
  p_visibility public.entry_visibility,
  p_title text,
  p_content text,
  p_trust_state public.trust_state default null
)
returns public.care_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := (select private.current_app_role());
  actor_clinic uuid := (select private.current_clinic_id());
  patient_clinic uuid;
  created_entry public.care_entries;
begin
  if actor_id is null or actor_role not in ('patient', 'staff', 'clinician') then
    raise exception using errcode = '42501', message = 'ENTRY_CREATE_FORBIDDEN';
  end if;

  select p.clinic_id into patient_clinic from public.patients p where p.id = p_patient_id;
  if patient_clinic is null or patient_clinic <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;

  if actor_role = 'patient' and (
    p_patient_id <> (select private.current_patient_id()) or p_visibility <> 'patient'
  ) then
    raise exception using errcode = '42501', message = 'PATIENT_ENTRY_SCOPE_DENIED';
  end if;

  if length(trim(p_title)) = 0 or length(trim(p_content)) = 0 then
    raise exception using errcode = '22023', message = 'ENTRY_CONTENT_REQUIRED';
  end if;

  insert into public.care_entries (
    clinic_id, patient_id, author_role, author_id, entry_type,
    visibility, current_version, trust_state
  ) values (
    actor_clinic, p_patient_id, actor_role, actor_id, p_entry_type,
    p_visibility, 1, p_trust_state
  ) returning * into created_entry;

  insert into public.entry_versions (
    care_entry_id, version, title, content, actor_id
  ) values (
    created_entry.id, 1, trim(p_title), trim(p_content), actor_id
  );

  insert into public.audit_logs (
    clinic_id, actor_id, action, entity_type, entity_id, to_version
  ) values (
    actor_clinic, actor_id, 'ENTRY_CREATED', 'care_entry', created_entry.id, 1
  );

  return created_entry;
end;
$$;

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
      errcode = '40001',
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

create or replace function public.record_importance_feedback(
  p_highlight_id uuid,
  p_action public.feedback_action
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := (select private.current_app_role());
  actor_clinic uuid := (select private.current_clinic_id());
  highlight_row public.highlights;
  signal_value smallint;
  delta numeric(4,3);
  learned_multiplier numeric(4,3);
begin
  if actor_id is null or actor_role not in ('staff', 'clinician') then
    raise exception using errcode = '42501', message = 'FEEDBACK_FORBIDDEN';
  end if;

  select * into highlight_row
  from public.highlights h
  where h.id = p_highlight_id
  for update;

  if not found or highlight_row.clinic_id <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;

  signal_value := case p_action
    when 'pin' then 3
    when 'accept' then 2
    when 'source_open' then 1
    when 'dismiss' then -2
  end;
  delta := signal_value * 0.025;

  insert into public.importance_feedback (
    clinic_id, highlight_id, actor_id, category, action, signal
  ) values (
    actor_clinic, p_highlight_id, actor_id, highlight_row.category, p_action, signal_value
  );

  insert into public.clinic_importance_weights (clinic_id, category, multiplier)
  values (actor_clinic, highlight_row.category, greatest(0.800, least(1.350, 1.000 + delta)))
  on conflict (clinic_id, category) do update
  set multiplier = greatest(
        0.800,
        least(1.350, public.clinic_importance_weights.multiplier + delta)
      ),
      updated_at = now()
  returning multiplier into learned_multiplier;

  update public.highlights
  set pinned = case when p_action = 'pin' then true else pinned end,
      status = case
        when p_action = 'accept' then 'accepted'::public.highlight_status
        when p_action = 'dismiss' then 'dismissed'::public.highlight_status
        else status
      end,
      updated_at = now()
  where id = p_highlight_id;

  insert into public.audit_logs (
    clinic_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    actor_clinic, actor_id,
    case p_action
      when 'pin' then 'HIGHLIGHT_PINNED'
      when 'accept' then 'HIGHLIGHT_ACCEPTED'
      when 'dismiss' then 'HIGHLIGHT_DISMISSED'
      else 'HIGHLIGHT_SOURCE_OPENED'
    end,
    'highlight', p_highlight_id,
    jsonb_build_object('category', highlight_row.category, 'signal', signal_value)
  );

  return jsonb_build_object(
    'category', highlight_row.category,
    'multiplier', learned_multiplier,
    'status', case
      when p_action = 'accept' then 'accepted'
      when p_action = 'dismiss' then 'dismissed'
      else highlight_row.status::text
    end,
    'pinned', (highlight_row.pinned or p_action = 'pin')
  );
end;
$$;

revoke all on function public.create_care_entry(uuid, text, public.entry_visibility, text, text, public.trust_state) from public;
revoke all on function public.edit_care_entry(uuid, integer, text, text, integer) from public;
revoke all on function public.record_importance_feedback(uuid, public.feedback_action) from public;
grant execute on function public.create_care_entry(uuid, text, public.entry_visibility, text, text, public.trust_state) to authenticated;
grant execute on function public.edit_care_entry(uuid, integer, text, text, integer) to authenticated;
grant execute on function public.record_importance_feedback(uuid, public.feedback_action) to authenticated;
