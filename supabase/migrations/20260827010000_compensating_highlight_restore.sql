create or replace function public.restore_highlight_state(
  p_highlight_id uuid,
  p_status public.highlight_status,
  p_pinned boolean
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
begin
  if actor_id is null or actor_role <> 'clinician' then
    raise exception using errcode = '42501', message = 'RESTORE_FORBIDDEN';
  end if;

  select * into highlight_row
  from public.highlights h
  where h.id = p_highlight_id
  for update;

  if not found or highlight_row.clinic_id <> actor_clinic then
    raise exception using errcode = '42501', message = 'CLINIC_SCOPE_DENIED';
  end if;

  update public.highlights
  set status = p_status,
      pinned = p_pinned,
      updated_at = now()
  where id = p_highlight_id;

  insert into public.audit_logs (
    clinic_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    actor_clinic, actor_id, 'HIGHLIGHT_STATE_RESTORED', 'highlight', p_highlight_id,
    jsonb_build_object(
      'from_status', highlight_row.status,
      'to_status', p_status,
      'from_pinned', highlight_row.pinned,
      'to_pinned', p_pinned
    )
  );

  return jsonb_build_object('status', p_status, 'pinned', p_pinned);
end;
$$;

revoke all on function public.restore_highlight_state(uuid, public.highlight_status, boolean) from public;
grant execute on function public.restore_highlight_state(uuid, public.highlight_status, boolean) to authenticated;
