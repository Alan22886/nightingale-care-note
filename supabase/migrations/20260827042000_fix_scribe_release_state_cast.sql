-- PostgreSQL resolves the CASE expression in the original function body as text.
-- Patch the already-deployed function forward without rewriting migration history.
do $$
declare
  prior_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    to_regprocedure('public.persist_scribe_draft(uuid,text,text,text[],jsonb,jsonb,text,text,text)')
  ) into prior_definition;

  if prior_definition is null then
    raise exception 'PERSIST_SCRIBE_DRAFT_NOT_FOUND';
  end if;

  corrected_definition := replace(
    prior_definition,
    'case when has_conflict then ''review_required'' else ''internal'' end,',
    'case when has_conflict then ''review_required''::public.entry_release_state else ''internal''::public.entry_release_state end,'
  );

  if corrected_definition = prior_definition then
    raise exception 'PERSIST_SCRIBE_RELEASE_CAST_PATCH_NOT_APPLIED';
  end if;

  execute corrected_definition;
end;
$$;
