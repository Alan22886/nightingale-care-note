create type public.entry_release_state as enum ('internal', 'review_required', 'approved', 'released');

alter table public.care_entries
  add column release_state public.entry_release_state not null default 'internal';

-- Only records that already met the strict application release rule are released.
-- Every unknown, AI-authored, conflicted, or internal row remains internal by default.
update public.care_entries
set release_state = 'released'
where visibility = 'patient'
  and entry_type not like 'ai\_%' escape '\'
  and (author_role in ('clinician', 'staff') or entry_type = 'patient_submitted')
  and trust_state is distinct from 'AI Suggested'::public.trust_state
  and trust_state is distinct from 'Conflict Detected'::public.trust_state
  and trust_state is distinct from 'Needs Review'::public.trust_state;

alter table public.ai_scribed_notes
  add column structured_output jsonb not null default '{}'::jsonb
  check (jsonb_typeof(structured_output) = 'object');

drop policy care_entries_select_permitted on public.care_entries;
create policy care_entries_select_permitted
on public.care_entries for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (
    (select private.current_app_role()) in ('clinician', 'admin')
    or (
      (select private.current_app_role()) = 'staff'
      and entry_type not like 'ai\_%' escape '\'
    )
    or (
      (select private.current_app_role()) = 'patient'
      and patient_id = (select private.current_patient_id())
      and visibility = 'patient'
      and release_state = 'released'
      and entry_type not like 'ai\_%' escape '\'
      and trust_state is distinct from 'AI Suggested'::public.trust_state
      and trust_state is distinct from 'Conflict Detected'::public.trust_state
      and trust_state is distinct from 'Needs Review'::public.trust_state
    )
  )
);

create or replace function public.persist_scribe_draft(
  p_patient_id uuid,
  p_redacted_source text,
  p_summary text,
  p_categories text[],
  p_assertions jsonb,
  p_withheld jsonb,
  p_provider text,
  p_model text,
  p_source_session_id text
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
  patient_clinic uuid;
  entry_id uuid := extensions.gen_random_uuid();
  version_id uuid := extensions.gen_random_uuid();
  redaction_id uuid := extensions.gen_random_uuid();
  highlight_id uuid;
  assertion jsonb;
  conflict_source jsonb;
  has_conflict boolean := jsonb_path_exists(p_assertions, '$[*] ? (@.release_state == "needs_review")');
  persisted_count integer := 0;
  withheld_count integer := jsonb_array_length(coalesce(p_withheld, '[]'::jsonb));
begin
  if actor_id is null or actor_role <> 'clinician' then
    raise exception using errcode = '42501', message = 'SCRIBE_PERSIST_FORBIDDEN';
  end if;
  select p.clinic_id into patient_clinic from public.patients p where p.id = p_patient_id;
  if patient_clinic is null or patient_clinic <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;
  if length(trim(p_redacted_source)) = 0 or length(trim(p_summary)) = 0
    or jsonb_typeof(coalesce(p_assertions, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_withheld, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'SCRIBE_PAYLOAD_INVALID';
  end if;

  insert into public.redaction_events (id, clinic_id, categories, provider)
  values (redaction_id, actor_clinic, coalesce(p_categories, '{}'::text[]), p_provider);

  insert into public.care_entries (
    id, clinic_id, patient_id, author_role, author_id, entry_type,
    visibility, release_state, current_version, trust_state
  ) values (
    entry_id, actor_clinic, p_patient_id, 'system', null, 'ai_scribe_draft',
    'internal', case when has_conflict then 'review_required' else 'internal' end,
    1, case when has_conflict then 'Conflict Detected' else 'AI Suggested' end
  );

  insert into public.entry_versions (id, care_entry_id, version, title, content, actor_id)
  values (version_id, entry_id, 1, 'AI scribe internal draft', trim(p_redacted_source), actor_id);

  insert into public.ai_scribed_notes (
    care_entry_id, clinic_id, patient_id, interaction_type, provider, model,
    prompt_version, redaction_event_id, source_session_id, structured_output
  ) values (
    entry_id, actor_clinic, p_patient_id, 'synthetic_text_consult', p_provider, p_model,
    'scribe-safety-v2', redaction_id, p_source_session_id,
    jsonb_build_object('summary', p_summary, 'assertions', p_assertions, 'withheld', p_withheld)
  );

  for assertion in select value from jsonb_array_elements(coalesce(p_assertions, '[]'::jsonb)) loop
    if (assertion->>'release_state') not in ('grounded', 'needs_review')
      or coalesce(assertion->>'source_excerpt', '') = ''
      or (assertion->>'start_offset')::integer < 0
      or (assertion->>'end_offset')::integer <= (assertion->>'start_offset')::integer then
      raise exception using errcode = '22023', message = 'SCRIBE_ASSERTION_INVALID';
    end if;
    highlight_id := extensions.gen_random_uuid();
    insert into public.highlights (
      id, clinic_id, patient_id, category, title, detail, severity,
      trust_state, status, pinned, score_components, occurred_at
    ) values (
      highlight_id, actor_clinic, p_patient_id, assertion->>'category', assertion->>'claim',
      case when assertion->>'release_state' = 'needs_review'
        then 'Conflicting evidence requires explicit clinical resolution'
        else 'Source-grounded internal scribe assertion' end,
      (assertion->>'severity')::public.highlight_severity,
      (assertion->>'trust_state')::public.trust_state,
      'suggested', false, assertion->'score_components', now()
    );
    insert into public.provenance_spans (
      highlight_id, source_entry_id, source_version_id, start_offset, end_offset,
      source_excerpt, source_hash
    ) values (
      highlight_id, entry_id, version_id,
      (assertion->>'start_offset')::integer, (assertion->>'end_offset')::integer,
      assertion->>'source_excerpt', assertion->>'source_hash'
    );
    for conflict_source in select value from jsonb_array_elements(coalesce(assertion->'conflict_sources', '[]'::jsonb)) loop
      if conflict_source->>'source_entry_id' is not null and conflict_source->>'source_version_id' is not null then
        insert into public.provenance_spans (
          highlight_id, source_entry_id, source_version_id, start_offset, end_offset,
          source_excerpt, source_hash
        ) values (
          highlight_id,
          (conflict_source->>'source_entry_id')::uuid,
          (conflict_source->>'source_version_id')::uuid,
          (conflict_source->>'start_offset')::integer,
          (conflict_source->>'end_offset')::integer,
          conflict_source->>'source_excerpt', conflict_source->>'source_hash'
        );
      end if;
    end loop;
    insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      actor_clinic, actor_id,
      case when assertion->>'release_state' = 'needs_review' then 'SCRIBE_ASSERTION_CONFLICT' else 'SCRIBE_ASSERTION_GROUNDED' end,
      'care_entry', entry_id,
      jsonb_build_object('kind', assertion->>'kind', 'release_state', assertion->>'release_state', 'highlight_id', highlight_id)
    );
    persisted_count := persisted_count + 1;
  end loop;

  for assertion in select value from jsonb_array_elements(coalesce(p_withheld, '[]'::jsonb)) loop
    insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      actor_clinic, actor_id, 'SCRIBE_ASSERTION_WITHHELD', 'care_entry', entry_id,
      jsonb_build_object('kind', assertion->>'kind', 'reason', assertion->>'review_reason')
    );
  end loop;

  insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, to_version, metadata)
  values (
    actor_clinic, actor_id, 'SCRIBE_DRAFT_CREATED', 'care_entry', entry_id, 1,
    jsonb_build_object('provider', p_provider, 'model', p_model, 'persisted_assertions', persisted_count, 'withheld_assertions', withheld_count)
  );

  return jsonb_build_object(
    'entryId', entry_id,
    'versionId', version_id,
    'releaseState', case when has_conflict then 'review_required' else 'internal' end,
    'persistedAssertions', persisted_count,
    'withheldAssertions', withheld_count
  );
end;
$$;

revoke all on function public.persist_scribe_draft(uuid, text, text, text[], jsonb, jsonb, text, text, text) from public;
grant execute on function public.persist_scribe_draft(uuid, text, text, text[], jsonb, jsonb, text, text, text) to authenticated;

create or replace function public.record_provenance_failure(p_highlight_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := (select private.current_app_role());
  actor_clinic uuid := (select private.current_clinic_id());
  highlight_clinic uuid;
begin
  if actor_id is null or actor_role not in ('staff', 'clinician', 'admin') then
    raise exception using errcode = '42501', message = 'PROVENANCE_AUDIT_FORBIDDEN';
  end if;
  select h.clinic_id into highlight_clinic from public.highlights h where h.id = p_highlight_id;
  if highlight_clinic is null or highlight_clinic <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;
  if not exists (
    select 1 from public.audit_logs a
    where a.action = 'PROVENANCE_VALIDATION_FAILED'
      and a.entity_id = p_highlight_id
      and a.created_at > now() - interval '1 hour'
  ) then
    insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
    values (actor_clinic, actor_id, 'PROVENANCE_VALIDATION_FAILED', 'highlight', p_highlight_id, jsonb_build_object('reason', left(p_reason, 160)));
  end if;
end;
$$;

revoke all on function public.record_provenance_failure(uuid, text) from public;
grant execute on function public.record_provenance_failure(uuid, text) to authenticated;

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
  prior_signal_count integer;
  raw_delta numeric;
  delta numeric(6,4);
  learned_multiplier numeric(4,3);
  safety_floor boolean;
begin
  if actor_id is null or actor_role not in ('staff', 'clinician') then
    raise exception using errcode = '42501', message = 'FEEDBACK_FORBIDDEN';
  end if;
  select * into highlight_row from public.highlights h where h.id = p_highlight_id for update;
  if not found or highlight_row.clinic_id <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;
  safety_floor := highlight_row.severity = 'Critical'
    or coalesce((highlight_row.score_components->>'risk')::numeric, 0) >= 0.9;
  if safety_floor and p_action = 'dismiss' then
    raise exception using errcode = '22023', message = 'SAFETY_FLOOR_DISMISS_FORBIDDEN';
  end if;
  signal_value := case p_action when 'pin' then 3 when 'accept' then 2 when 'source_open' then 1 when 'dismiss' then -2 when 'acknowledge' then 0 end;
  select count(*) into prior_signal_count from public.importance_feedback f where f.clinic_id = actor_clinic and f.category = highlight_row.category;
  raw_delta := signal_value * (0.100 / greatest(4, prior_signal_count + 1));
  delta := case when raw_delta = 0 then 0 else sign(raw_delta) * greatest(abs(raw_delta), 0.001) end;
  insert into public.importance_feedback (clinic_id, highlight_id, actor_id, category, action, signal)
  values (actor_clinic, p_highlight_id, actor_id, highlight_row.category, p_action, signal_value);
  insert into public.clinic_importance_weights (clinic_id, category, multiplier)
  values (actor_clinic, highlight_row.category, greatest(0.800, least(1.350, 1.000 + delta)))
  on conflict (clinic_id, category) do update
  set multiplier = greatest(0.800, least(1.350, public.clinic_importance_weights.multiplier + delta)), updated_at = now()
  returning multiplier into learned_multiplier;
  update public.highlights
  set pinned = case when p_action = 'pin' then true else pinned end,
      status = case when p_action in ('accept', 'acknowledge') then 'accepted'::public.highlight_status when p_action = 'dismiss' then 'dismissed'::public.highlight_status else status end,
      updated_at = now()
  where id = p_highlight_id;
  insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    actor_clinic, actor_id,
    case p_action when 'pin' then 'HIGHLIGHT_PINNED' when 'accept' then 'HIGHLIGHT_ACCEPTED' when 'dismiss' then 'HIGHLIGHT_DISMISSED' when 'acknowledge' then 'SAFETY_FLOOR_ACKNOWLEDGED' else 'HIGHLIGHT_SOURCE_OPENED' end,
    'highlight', p_highlight_id,
    jsonb_build_object('category', highlight_row.category, 'signal', signal_value, 'prior_category_signals', prior_signal_count, 'raw_delta', raw_delta, 'applied_delta', delta, 'safety_floor', safety_floor)
  );
  return jsonb_build_object(
    'category', highlight_row.category, 'multiplier', learned_multiplier,
    'status', case when p_action in ('accept', 'acknowledge') then 'accepted' when p_action = 'dismiss' then 'dismissed' else highlight_row.status::text end,
    'pinned', (highlight_row.pinned or p_action = 'pin'), 'safetyFloor', safety_floor
  );
end;
$$;

revoke all on function public.record_importance_feedback(uuid, public.feedback_action) from public;
grant execute on function public.record_importance_feedback(uuid, public.feedback_action) to authenticated;

create or replace function public.restore_highlight_state(p_highlight_id uuid, p_status public.highlight_status, p_pinned boolean)
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
  safety_floor boolean;
begin
  if actor_id is null or actor_role <> 'clinician' then raise exception using errcode = '42501', message = 'RESTORE_FORBIDDEN'; end if;
  select * into highlight_row from public.highlights h where h.id = p_highlight_id for update;
  if not found or highlight_row.clinic_id <> actor_clinic then raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED'; end if;
  safety_floor := highlight_row.severity = 'Critical' or coalesce((highlight_row.score_components->>'risk')::numeric, 0) >= 0.9;
  if safety_floor and p_status = 'dismissed' then raise exception using errcode = '22023', message = 'SAFETY_FLOOR_DISMISS_FORBIDDEN'; end if;
  update public.highlights set status = p_status, pinned = p_pinned, updated_at = now() where id = p_highlight_id;
  insert into public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
  values (actor_clinic, actor_id, 'HIGHLIGHT_STATE_RESTORED', 'highlight', p_highlight_id, jsonb_build_object('from_status', highlight_row.status, 'to_status', p_status, 'from_pinned', highlight_row.pinned, 'to_pinned', p_pinned));
  return jsonb_build_object('status', p_status, 'pinned', p_pinned);
end;
$$;

revoke all on function public.restore_highlight_state(uuid, public.highlight_status, boolean) from public;
grant execute on function public.restore_highlight_state(uuid, public.highlight_status, boolean) to authenticated;
