create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('patient', 'staff', 'clinician', 'admin', 'system');
create type public.entry_visibility as enum ('internal', 'patient');
create type public.trust_state as enum ('AI Suggested', 'Clinician Confirmed', 'Clinician Rejected', 'Conflict Detected', 'Superseded');
create type public.task_status as enum ('Open', 'In Progress', 'Done');
create type public.highlight_status as enum ('suggested', 'accepted', 'dismissed');
create type public.highlight_severity as enum ('Critical', 'Attention', 'Follow-up');
create type public.feedback_action as enum ('pin', 'accept', 'source_open', 'dismiss');

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  external_id text not null,
  full_name text not null check (length(trim(full_name)) > 0),
  date_of_birth date not null,
  summary text not null default '',
  conditions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, external_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  role public.app_role not null check (role <> 'system'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((role = 'patient' and patient_id is not null) or (role <> 'patient' and patient_id is null))
);

create table public.care_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_role public.app_role not null,
  author_id uuid references public.profiles(id) on delete set null,
  entry_type text not null check (length(trim(entry_type)) > 0),
  visibility public.entry_visibility not null default 'internal',
  current_version integer not null default 1 check (current_version > 0),
  trust_state public.trust_state,
  decay_tier text not null default 'full' check (decay_tier in ('full', 'summary', 'compressed')),
  superseded_by uuid references public.care_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((author_role = 'system' and author_id is null) or (author_role <> 'system' and author_id is not null))
);

create table public.entry_versions (
  id uuid primary key default gen_random_uuid(),
  care_entry_id uuid not null references public.care_entries(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null check (length(trim(title)) > 0),
  content text not null check (length(trim(content)) > 0),
  actor_id uuid references public.profiles(id) on delete set null,
  reverted_from_version integer,
  created_at timestamptz not null default now(),
  unique (care_entry_id, version),
  check (reverted_from_version is null or reverted_from_version > 0)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  entry_id uuid not null references public.care_entries(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  internal boolean not null default true,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  source_entry_id uuid references public.care_entries(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 500),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status public.task_status not null default 'Open',
  patient_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  category text not null check (category in ('medication_change', 'new_symptom', 'lab_abnormality', 'unresolved_task', 'allergy', 'diagnosis_change', 'administrative')),
  title text not null check (length(trim(title)) between 1 and 500),
  detail text not null check (length(trim(detail)) between 1 and 2000),
  severity public.highlight_severity not null,
  trust_state public.trust_state not null,
  status public.highlight_status not null default 'suggested',
  pinned boolean not null default false,
  score_components jsonb not null default '{}'::jsonb check (jsonb_typeof(score_components) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provenance_spans (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  source_entry_id uuid not null references public.care_entries(id) on delete restrict,
  source_version_id uuid not null references public.entry_versions(id) on delete restrict,
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null,
  source_excerpt text not null check (length(source_excerpt) > 0),
  source_hash text not null check (length(source_hash) = 64),
  created_at timestamptz not null default now(),
  unique (highlight_id, source_version_id, start_offset, end_offset),
  check (end_offset > start_offset)
);

create table public.redaction_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  categories text[] not null default '{}',
  provider text not null,
  created_at timestamptz not null default now()
);

create table public.ai_scribed_notes (
  care_entry_id uuid primary key references public.care_entries(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  interaction_type text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  redaction_event_id uuid references public.redaction_events(id) on delete set null,
  source_session_id text not null,
  created_at timestamptz not null default now()
);

create table public.importance_feedback (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  category text not null,
  action public.feedback_action not null,
  signal smallint not null check (signal between -2 and 3),
  created_at timestamptz not null default now()
);

create table public.clinic_importance_weights (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  category text not null,
  multiplier numeric(4,3) not null default 1.000 check (multiplier between 0.800 and 1.350),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, category)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  from_version integer,
  to_version integer,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index idx_profiles_clinic_role on public.profiles (clinic_id, role);
create index idx_patients_clinic_name on public.patients (clinic_id, full_name);
create index idx_entries_patient_created on public.care_entries (patient_id, created_at desc);
create index idx_entries_clinic_patient on public.care_entries (clinic_id, patient_id);
create index idx_versions_entry_version on public.entry_versions (care_entry_id, version desc);
create index idx_comments_entry_created on public.comments (entry_id, created_at);
create index idx_comments_patient_open on public.comments (patient_id, resolved) where resolved = false;
create index idx_tasks_patient_status on public.tasks (patient_id, status);
create index idx_tasks_owner_status on public.tasks (owner_id, status);
create index idx_highlights_patient_active on public.highlights (patient_id, pinned desc, occurred_at desc) where status <> 'dismissed';
create index idx_provenance_highlight on public.provenance_spans (highlight_id);
create index idx_feedback_clinic_category on public.importance_feedback (clinic_id, category, created_at desc);
create index idx_audit_entity on public.audit_logs (entity_type, entity_id, created_at desc);
create index idx_audit_clinic_created on public.audit_logs (clinic_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger patients_set_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger highlights_set_updated_at before update on public.highlights for each row execute function public.set_updated_at();
