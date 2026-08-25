create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.clinic_id from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function private.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.patient_id from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function private.is_clinic_member(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (select private.current_clinic_id()) = target_clinic
$$;

revoke all on function private.current_clinic_id() from public;
revoke all on function private.current_app_role() from public;
revoke all on function private.current_patient_id() from public;
revoke all on function private.is_clinic_member(uuid) from public;
grant execute on function private.current_clinic_id() to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.current_patient_id() to authenticated;
grant execute on function private.is_clinic_member(uuid) to authenticated;

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.care_entries enable row level security;
alter table public.entry_versions enable row level security;
alter table public.comments enable row level security;
alter table public.tasks enable row level security;
alter table public.highlights enable row level security;
alter table public.provenance_spans enable row level security;
alter table public.redaction_events enable row level security;
alter table public.ai_scribed_notes enable row level security;
alter table public.importance_feedback enable row level security;
alter table public.clinic_importance_weights enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.clinics, public.profiles, public.patients, public.care_entries,
  public.entry_versions, public.comments, public.tasks, public.highlights,
  public.provenance_spans, public.redaction_events, public.ai_scribed_notes,
  public.importance_feedback, public.clinic_importance_weights, public.audit_logs
  to authenticated;
grant insert on public.care_entries, public.comments, public.tasks to authenticated;
grant update on public.care_entries to authenticated;
grant update (resolved) on public.comments to authenticated;
grant update (status, owner_id) on public.tasks to authenticated;

create policy clinics_select_own
on public.clinics for select to authenticated
using (id = (select private.current_clinic_id()));

create policy profiles_select_permitted
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (
    clinic_id = (select private.current_clinic_id())
    and (select private.current_app_role()) in ('staff', 'clinician', 'admin')
  )
);

create policy patients_select_permitted
on public.patients for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (
    (select private.current_app_role()) in ('staff', 'clinician', 'admin')
    or (
      (select private.current_app_role()) = 'patient'
      and id = (select private.current_patient_id())
    )
  )
);

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
      and entry_type not like 'ai\_%' escape '\'
    )
  )
);

create policy care_entries_insert_owned
on public.care_entries for insert to authenticated
with check (
  clinic_id = (select private.current_clinic_id())
  and care_entries.patient_id in (
    select p.id from public.patients p
    where p.clinic_id = (select private.current_clinic_id())
  )
  and author_id = (select auth.uid())
  and author_role = (select private.current_app_role())
  and (
    (select private.current_app_role()) in ('staff', 'clinician')
    or (
      (select private.current_app_role()) = 'patient'
      and patient_id = (select private.current_patient_id())
      and visibility = 'patient'
    )
  )
);

create policy care_entries_update_owned
on public.care_entries for update to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and author_id = (select auth.uid())
  and author_role = (select private.current_app_role())
  and (select private.current_app_role()) in ('staff', 'clinician')
)
with check (
  clinic_id = (select private.current_clinic_id())
  and author_id = (select auth.uid())
  and author_role = (select private.current_app_role())
  and (select private.current_app_role()) in ('staff', 'clinician')
);

create policy entry_versions_select_via_entry
on public.entry_versions for select to authenticated
using (
  exists (
    select 1 from public.care_entries e
    where e.id = entry_versions.care_entry_id
  )
);

create policy comments_select_permitted
on public.comments for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (
    (select private.current_app_role()) in ('staff', 'clinician', 'admin')
    or (
      (select private.current_app_role()) = 'patient'
      and patient_id = (select private.current_patient_id())
      and internal = false
    )
  )
);

create policy comments_insert_clinic_member
on public.comments for insert to authenticated
with check (
  clinic_id = (select private.current_clinic_id())
  and author_id = (select auth.uid())
  and (select private.current_app_role()) in ('staff', 'clinician')
  and exists (
    select 1 from public.care_entries e
    where e.id = comments.entry_id
      and e.patient_id = comments.patient_id
      and e.clinic_id = comments.clinic_id
  )
);

create policy comments_update_resolution
on public.comments for update to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician')
)
with check (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician')
);

create policy tasks_select_permitted
on public.tasks for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (
    (select private.current_app_role()) in ('staff', 'clinician', 'admin')
    or (
      (select private.current_app_role()) = 'patient'
      and patient_id = (select private.current_patient_id())
      and patient_visible = true
    )
  )
);

create policy tasks_insert_clinic_member
on public.tasks for insert to authenticated
with check (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician')
  and exists (
    select 1 from public.profiles owner
    where owner.id = tasks.owner_id and owner.clinic_id = tasks.clinic_id
  )
);

create policy tasks_update_clinic_member
on public.tasks for update to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician')
)
with check (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician')
  and exists (
    select 1 from public.profiles owner
    where owner.id = tasks.owner_id and owner.clinic_id = tasks.clinic_id
  )
);

create policy highlights_select_clinic_team
on public.highlights for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician', 'admin')
);

create policy provenance_select_authorized_source
on public.provenance_spans for select to authenticated
using (
  exists (
    select 1 from public.highlights h
    join public.care_entries e on e.id = provenance_spans.source_entry_id
    where h.id = provenance_spans.highlight_id
      and h.clinic_id = (select private.current_clinic_id())
      and (
        (select private.current_app_role()) in ('clinician', 'admin')
        or (
          (select private.current_app_role()) = 'staff'
          and e.entry_type not like 'ai\_%' escape '\'
        )
      )
  )
);

create policy redaction_events_select_clinical
on public.redaction_events for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('clinician', 'admin')
);

create policy ai_scribed_notes_select_clinical
on public.ai_scribed_notes for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('clinician', 'admin')
);

create policy importance_feedback_select_clinic_team
on public.importance_feedback for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician', 'admin')
);

create policy clinic_weights_select_clinic_team
on public.clinic_importance_weights for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician', 'admin')
);

create policy audit_logs_select_clinic_team
on public.audit_logs for select to authenticated
using (
  clinic_id = (select private.current_clinic_id())
  and (select private.current_app_role()) in ('staff', 'clinician', 'admin')
);
