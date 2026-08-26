-- One-time cleanup for historical live tests that mutated the human-facing Sarah demo.
-- Future tests use patient QA-0001 and never touch these records.

begin;

lock table public.entry_versions in access exclusive mode;

update public.care_entries
set current_version = case id
  when '30000000-0000-4000-8000-000000000005'::uuid then 2
  when '30000000-0000-4000-8000-000000000003'::uuid then 1
end,
updated_at = case id
  when '30000000-0000-4000-8000-000000000005'::uuid then '2026-08-25T06:32:00Z'::timestamptz
  else '2026-08-13T03:20:00Z'::timestamptz
end
where id in (
  '30000000-0000-4000-8000-000000000005'::uuid,
  '30000000-0000-4000-8000-000000000003'::uuid
);

delete from public.audit_logs
where entity_id in (
  '30000000-0000-4000-8000-000000000005'::uuid,
  '30000000-0000-4000-8000-000000000003'::uuid
);

alter table public.entry_versions disable trigger entry_versions_immutable;
delete from public.entry_versions
where (care_entry_id = '30000000-0000-4000-8000-000000000005'::uuid and version > 2)
   or (care_entry_id = '30000000-0000-4000-8000-000000000003'::uuid and version > 1);
alter table public.entry_versions enable trigger entry_versions_immutable;

delete from public.comments
where patient_id = '20000000-0000-4000-8000-000000000001'::uuid
  and id not in (
    '50000000-0000-4000-8000-000000000001'::uuid,
    '50000000-0000-4000-8000-000000000002'::uuid
  );

delete from public.importance_feedback
where highlight_id in (
  '40000000-0000-4000-8000-000000000001'::uuid,
  '40000000-0000-4000-8000-000000000002'::uuid,
  '40000000-0000-4000-8000-000000000003'::uuid,
  '40000000-0000-4000-8000-000000000004'::uuid
);

update public.tasks set status = 'Open'
where id = '60000000-0000-4000-8000-000000000001'::uuid;

update public.highlights set status = 'suggested', pinned = false
where id in (
  '40000000-0000-4000-8000-000000000001'::uuid,
  '40000000-0000-4000-8000-000000000002'::uuid,
  '40000000-0000-4000-8000-000000000003'::uuid,
  '40000000-0000-4000-8000-000000000004'::uuid
);

insert into public.clinic_importance_weights (clinic_id, category, multiplier)
values
  ('10000000-0000-4000-8000-000000000001', 'lab_abnormality', 1.17),
  ('10000000-0000-4000-8000-000000000001', 'new_symptom', 1.12),
  ('10000000-0000-4000-8000-000000000001', 'unresolved_task', 1.08),
  ('10000000-0000-4000-8000-000000000001', 'medication_change', 1.28),
  ('10000000-0000-4000-8000-000000000001', 'administrative', .84)
on conflict (clinic_id, category) do update
set multiplier = excluded.multiplier, updated_at = now();

commit;
