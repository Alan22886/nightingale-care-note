-- Shrink each feedback signal relative to prior category interactions so sparse,
-- fatigued, or repeatedly exposed feedback cannot dominate clinic-wide ordering.
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
  delta numeric(6,4);
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

  select count(*) into prior_signal_count
  from public.importance_feedback f
  where f.clinic_id = actor_clinic and f.category = highlight_row.category;

  delta := signal_value * (0.100 / greatest(4, prior_signal_count + 1));

  insert into public.importance_feedback (
    clinic_id, highlight_id, actor_id, category, action, signal
  ) values (
    actor_clinic, p_highlight_id, actor_id, highlight_row.category, p_action, signal_value
  );

  insert into public.clinic_importance_weights (clinic_id, category, multiplier)
  values (actor_clinic, highlight_row.category, greatest(0.800, least(1.350, 1.000 + delta)))
  on conflict (clinic_id, category) do update
  set multiplier = greatest(0.800, least(1.350, public.clinic_importance_weights.multiplier + delta)),
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
    jsonb_build_object('category', highlight_row.category, 'signal', signal_value, 'prior_category_signals', prior_signal_count)
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

revoke all on function public.record_importance_feedback(uuid, public.feedback_action) from public;
grant execute on function public.record_importance_feedback(uuid, public.feedback_action) to authenticated;
