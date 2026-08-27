-- Keep the conditional trust-state assignment strongly typed as its PostgreSQL enum.
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
    'case when has_conflict then ''Conflict Detected'' else ''AI Suggested'' end',
    'case when has_conflict then ''Conflict Detected''::public.trust_state else ''AI Suggested''::public.trust_state end'
  );

  if corrected_definition = prior_definition then
    raise exception 'PERSIST_SCRIBE_TRUST_CAST_PATCH_NOT_APPLIED';
  end if;

  execute corrected_definition;
end;
$$;
