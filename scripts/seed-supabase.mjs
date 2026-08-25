import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const url = required('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const demoPassword = required('SUPABASE_DEMO_PASSWORD');
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = {
  clinicA: '10000000-0000-4000-8000-000000000001',
  clinicB: '10000000-0000-4000-8000-000000000002',
  sarah: '20000000-0000-4000-8000-000000000001',
  jason: '20000000-0000-4000-8000-000000000002',
  mei: '20000000-0000-4000-8000-000000000003',
  daniel: '20000000-0000-4000-8000-000000000004',
  farah: '20000000-0000-4000-8000-000000000005',
  clinicBPatient: '20000000-0000-4000-8000-000000000006',
  apr15: '30000000-0000-4000-8000-000000000001',
  feb06: '30000000-0000-4000-8000-000000000002',
  aug13: '30000000-0000-4000-8000-000000000003',
  aug23: '30000000-0000-4000-8000-000000000004',
  aug24: '30000000-0000-4000-8000-000000000005',
  apr15v1: '31000000-0000-4000-8000-000000000001',
  feb06v1: '31000000-0000-4000-8000-000000000002',
  aug13v1: '31000000-0000-4000-8000-000000000003',
  aug23v1: '31000000-0000-4000-8000-000000000004',
  aug24v1: '31000000-0000-4000-8000-000000000005',
  aug24v2: '31000000-0000-4000-8000-000000000006',
  hba: '40000000-0000-4000-8000-000000000001',
  dizziness: '40000000-0000-4000-8000-000000000002',
  renal: '40000000-0000-4000-8000-000000000003',
  medication: '40000000-0000-4000-8000-000000000004',
  redaction: '70000000-0000-4000-8000-000000000001',
};

const emailByRole = {
  patient: process.env.SUPABASE_DEMO_PATIENT_EMAIL ?? 'patient@nightingale.demo',
  staff: process.env.SUPABASE_DEMO_STAFF_EMAIL ?? 'staff@nightingale.demo',
  clinician: process.env.SUPABASE_DEMO_CLINICIAN_EMAIL ?? 'clinician@nightingale.demo',
  admin: process.env.SUPABASE_DEMO_ADMIN_EMAIL ?? 'admin@nightingale.demo',
  clinicBClinician:
    process.env.SUPABASE_DEMO_CLINIC_B_EMAIL ?? 'clinician-b@nightingale.demo',
};

async function getOrCreateUser(email, role) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const existing = data.users.find((user) => user.email === email);
    if (existing) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: { demo_role: role },
      });
      if (updateError) throw updateError;
      return existing.id;
    }
    if (data.users.length < 100) break;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { demo_role: role },
  });
  if (error) throw error;
  return data.user.id;
}

async function upsert(table, rows, options = { onConflict: 'id' }) {
  const { error } = await supabase.from(table).upsert(rows, options);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function insertImmutable(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: 'id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`${table}: ${error.message}`);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const span = (content, excerpt) => {
  const start = content.indexOf(excerpt);
  if (start < 0) throw new Error(`Seed provenance excerpt not found: ${excerpt}`);
  return { start_offset: start, end_offset: start + excerpt.length, source_excerpt: excerpt, source_hash: sha256(excerpt) };
};

const users = {
  patient: await getOrCreateUser(emailByRole.patient, 'patient'),
  staff: await getOrCreateUser(emailByRole.staff, 'staff'),
  clinician: await getOrCreateUser(emailByRole.clinician, 'clinician'),
  admin: await getOrCreateUser(emailByRole.admin, 'admin'),
  clinicBClinician: await getOrCreateUser(emailByRole.clinicBClinician, 'clinician'),
};

await upsert('clinics', [
  { id: ids.clinicA, name: 'Harbour Family Clinic' },
  { id: ids.clinicB, name: 'Eastside Medical Clinic' },
]);

await upsert('patients', [
  { id: ids.sarah, clinic_id: ids.clinicA, external_id: 'ST-2048', full_name: 'Sarah Tan', date_of_birth: '1972-04-12', summary: 'Diabetes and hypertension review', conditions: ['Type 2 diabetes', 'Hypertension'] },
  { id: ids.jason, clinic_id: ids.clinicA, external_id: 'JL-1842', full_name: 'Jason Lee', date_of_birth: '1985-11-08', summary: 'Routine follow-up', conditions: ['Asthma'] },
  { id: ids.mei, clinic_id: ids.clinicA, external_id: 'MN-2310', full_name: 'Mei Nordin', date_of_birth: '1968-02-19', summary: 'Medication review', conditions: ['Hyperlipidaemia'] },
  { id: ids.daniel, clinic_id: ids.clinicA, external_id: 'DK-0974', full_name: 'Daniel Koh', date_of_birth: '1991-07-03', summary: 'Follow-up', conditions: ['Migraine'] },
  { id: ids.farah, clinic_id: ids.clinicA, external_id: 'FA-3401', full_name: 'Farah Aziz', date_of_birth: '1978-09-27', summary: 'Annual review', conditions: ['Hypertension'] },
  { id: ids.clinicBPatient, clinic_id: ids.clinicB, external_id: 'EW-1001', full_name: 'Eleanor Wong', date_of_birth: '1980-01-16', summary: 'Clinic B isolation fixture', conditions: ['Type 2 diabetes'] },
]);

await upsert('profiles', [
  { id: users.patient, clinic_id: ids.clinicA, patient_id: ids.sarah, full_name: 'Sarah Tan', role: 'patient' },
  { id: users.staff, clinic_id: ids.clinicA, patient_id: null, full_name: 'Nurse Alice Wong', role: 'staff' },
  { id: users.clinician, clinic_id: ids.clinicA, patient_id: null, full_name: 'Dr Marcus Lim', role: 'clinician' },
  { id: users.admin, clinic_id: ids.clinicA, patient_id: null, full_name: 'Clinic Admin', role: 'admin' },
  { id: users.clinicBClinician, clinic_id: ids.clinicB, patient_id: null, full_name: 'Dr Priya Nair', role: 'clinician' },
]);

const content = {
  apr15: 'HbA1c baseline 7.1%. Hypertension controlled. No dizziness or medication tolerance concerns reported.',
  feb06: 'HbA1c measured at 7.3%. Blood pressure stable. Continue current medication and reinforce meal planning.',
  aug13: 'Renal function laboratory follow-up remains pending. Open for 12 days and assigned to Nurse Alice.',
  aug23: 'Patient reports episodes of dizziness since the medication adjustment last week. She believes she stopped metformin after the change.',
  aug24v1: 'HbA1c has increased from 7.1% to 8.3%. Treatment plan: continue metformin 500 mg twice daily pending review.',
  aug24v2: 'HbA1c has increased from 7.1% to 8.3%. Sarah clarified she has continued metformin 500 mg twice daily; the earlier AI statement was incomplete.',
};

await upsert('care_entries', [
  { id: ids.apr15, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult', visibility: 'patient', current_version: 1, trust_state: 'Clinician Confirmed', decay_tier: 'compressed', created_at: '2025-04-15T01:35:00Z', updated_at: '2025-04-15T01:35:00Z' },
  { id: ids.feb06, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'system', author_id: null, entry_type: 'ai_doctor_consult_summary', visibility: 'internal', current_version: 1, trust_state: 'Clinician Confirmed', decay_tier: 'summary', created_at: '2026-02-06T07:10:00Z', updated_at: '2026-02-06T07:10:00Z' },
  { id: ids.aug13, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'staff', author_id: users.staff, entry_type: 'nurse_followup', visibility: 'internal', current_version: 1, trust_state: null, decay_tier: 'full', created_at: '2026-08-13T03:20:00Z', updated_at: '2026-08-13T03:20:00Z' },
  { id: ids.aug23, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'system', author_id: null, entry_type: 'ai_patient_session_summary', visibility: 'internal', current_version: 1, trust_state: 'Conflict Detected', decay_tier: 'full', superseded_by: ids.aug24, created_at: '2026-08-23T12:04:00Z', updated_at: '2026-08-23T12:04:00Z' },
  { id: ids.aug24, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult', visibility: 'patient', current_version: 2, trust_state: 'Clinician Confirmed', decay_tier: 'full', created_at: '2026-08-24T08:18:00Z', updated_at: '2026-08-25T06:32:00Z' },
]);

await insertImmutable('entry_versions', [
  { id: ids.apr15v1, care_entry_id: ids.apr15, version: 1, title: 'Annual chronic care review', content: content.apr15, actor_id: users.clinician, created_at: '2025-04-15T01:35:00Z' },
  { id: ids.feb06v1, care_entry_id: ids.feb06, version: 1, title: 'Routine diabetes review', content: content.feb06, actor_id: null, created_at: '2026-02-06T07:10:00Z' },
  { id: ids.aug13v1, care_entry_id: ids.aug13, version: 1, title: 'Post-adjustment laboratory follow-up', content: content.aug13, actor_id: users.staff, created_at: '2026-08-13T03:20:00Z' },
  { id: ids.aug23v1, care_entry_id: ids.aug23, version: 1, title: 'Patient check-in before review', content: content.aug23, actor_id: null, created_at: '2026-08-23T12:04:00Z' },
  { id: ids.aug24v1, care_entry_id: ids.aug24, version: 1, title: 'Diabetes review and treatment plan', content: content.aug24v1, actor_id: users.clinician, created_at: '2026-08-24T08:18:00Z' },
  { id: ids.aug24v2, care_entry_id: ids.aug24, version: 2, title: 'Diabetes review and treatment plan', content: content.aug24v2, actor_id: users.clinician, created_at: '2026-08-25T06:32:00Z' },
]);

await upsert('redaction_events', [{ id: ids.redaction, clinic_id: ids.clinicA, categories: ['NAME', 'ID', 'PHONE'], provider: 'mock', created_at: '2026-08-23T12:03:00Z' }]);
await upsert('ai_scribed_notes', [
  { care_entry_id: ids.feb06, clinic_id: ids.clinicA, patient_id: ids.sarah, interaction_type: 'doctor_patient_consult', provider: 'mock', model: 'deterministic-v1', prompt_version: 'scribe-v1', redaction_event_id: ids.redaction, source_session_id: 'session-feb06', created_at: '2026-02-06T07:10:00Z' },
  { care_entry_id: ids.aug23, clinic_id: ids.clinicA, patient_id: ids.sarah, interaction_type: 'ai_patient_session', provider: 'mock', model: 'deterministic-v1', prompt_version: 'scribe-v1', redaction_event_id: ids.redaction, source_session_id: 'session-aug23', created_at: '2026-08-23T12:04:00Z' },
], { onConflict: 'care_entry_id' });

await upsert('highlights', [
  { id: ids.hba, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'lab_abnormality', title: 'HbA1c worsening', detail: '7.1% → 8.3% since previous review', severity: 'Attention', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: .7, unresolved: .2, recency: .85, clinicalChange: 1, conflict: 0, confirmation: 1 }, occurred_at: '2026-08-24T08:18:00Z' },
  { id: ids.dizziness, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'new_symptom', title: 'Dizziness following medication change', detail: 'Reported by patient 2 days ago', severity: 'Attention', trust_state: 'AI Suggested', status: 'suggested', pinned: false, score_components: { risk: .7, unresolved: .7, recency: 1, clinicalChange: 1, conflict: .4, confirmation: 0 }, occurred_at: '2026-08-23T12:04:00Z' },
  { id: ids.renal, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'unresolved_task', title: 'Renal function test still pending', detail: 'Open for 12 days · Assigned to Nurse Alice', severity: 'Follow-up', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: .45, unresolved: 1, recency: .6, clinicalChange: .5, conflict: 0, confirmation: 1 }, occurred_at: '2026-08-13T03:20:00Z' },
  { id: ids.medication, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'medication_change', title: 'Medication record corrected', detail: 'Clinician clarified metformin was not stopped', severity: 'Follow-up', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: .45, unresolved: 0, recency: .85, clinicalChange: .8, conflict: 1, confirmation: 1 }, occurred_at: '2026-08-24T08:18:00Z' },
]);

await upsert('provenance_spans', [
  { id: '41000000-0000-4000-8000-000000000001', highlight_id: ids.hba, source_entry_id: ids.aug24, source_version_id: ids.aug24v2, ...span(content.aug24v2, 'HbA1c has increased from 7.1% to 8.3%') },
  { id: '41000000-0000-4000-8000-000000000002', highlight_id: ids.dizziness, source_entry_id: ids.aug23, source_version_id: ids.aug23v1, ...span(content.aug23, 'dizziness since the medication adjustment last week') },
  { id: '41000000-0000-4000-8000-000000000003', highlight_id: ids.renal, source_entry_id: ids.aug13, source_version_id: ids.aug13v1, ...span(content.aug13, 'Renal function laboratory follow-up remains pending.') },
  { id: '41000000-0000-4000-8000-000000000004', highlight_id: ids.medication, source_entry_id: ids.aug24, source_version_id: ids.aug24v2, ...span(content.aug24v2, 'Sarah clarified she has continued metformin 500 mg twice daily; the earlier AI statement was incomplete') },
]);

await upsert('comments', [
  { id: '50000000-0000-4000-8000-000000000001', clinic_id: ids.clinicA, patient_id: ids.sarah, entry_id: ids.aug13, author_id: users.staff, body: '@clinician Could you confirm whether dizziness warrants an earlier review?', internal: true, resolved: false, created_at: '2026-08-24T01:10:00Z' },
  { id: '50000000-0000-4000-8000-000000000002', clinic_id: ids.clinicA, patient_id: ids.sarah, entry_id: ids.aug13, author_id: users.clinician, body: 'Reviewed. Keeping this open until the renal panel is back.', internal: true, resolved: false, created_at: '2026-08-24T02:15:00Z' },
]);

await upsert('tasks', [{ id: '60000000-0000-4000-8000-000000000001', clinic_id: ids.clinicA, patient_id: ids.sarah, source_entry_id: ids.aug13, title: 'Renal function laboratory follow-up', owner_id: users.staff, status: 'Open', patient_visible: true, created_at: '2026-08-13T03:20:00Z' }]);

await upsert('clinic_importance_weights', [
  { clinic_id: ids.clinicA, category: 'lab_abnormality', multiplier: 1.17 },
  { clinic_id: ids.clinicA, category: 'new_symptom', multiplier: 1.12 },
  { clinic_id: ids.clinicA, category: 'unresolved_task', multiplier: 1.08 },
  { clinic_id: ids.clinicA, category: 'medication_change', multiplier: 1.28 },
  { clinic_id: ids.clinicA, category: 'administrative', multiplier: .84 },
], { onConflict: 'clinic_id,category' });

console.log(JSON.stringify({
  seeded: true,
  clinics: 2,
  patients: 6,
  demoUsers: Object.keys(users),
  note: 'No password or service key was written to output.',
}, null, 2));
