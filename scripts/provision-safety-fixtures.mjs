import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabase = createClient(
  required('NEXT_PUBLIC_SUPABASE_URL'),
  required('SUPABASE_SECRET_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const demoPassword = required('SUPABASE_DEMO_PASSWORD');
const clinicId = '10000000-0000-4000-8000-000000000001';
const patientId = '20000000-0000-4000-8000-000000000007';
const clinicianEntryId = '30000000-0000-4000-8000-000000000006';
const clinicianVersionId = '31000000-0000-4000-8000-000000000007';
const safetyHighlightId = '40000000-0000-4000-8000-000000000006';
const qaEmail = process.env.SUPABASE_DEMO_QA_PATIENT_EMAIL || 'qa-patient@nightingale.demo';
const clinicianContent = 'Isolated clinician persistence fixture. This record never appears in the demo directory.';

async function upsert(table, rows, options = { onConflict: 'id' }) {
  const { error } = await supabase.from(table).upsert(rows, options);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function insertImmutable(table, rows) {
  await upsert(table, rows, { onConflict: 'id', ignoreDuplicates: true });
}

async function getOrCreateQaUser() {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email === qaEmail);
    if (user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: { demo_role: 'patient' },
      });
      if (updateError) throw updateError;
      return user.id;
    }
    if (data.users.length < 100) break;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: qaEmail,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { demo_role: 'patient' },
  });
  if (error) throw error;
  return data.user.id;
}

const qaUserId = await getOrCreateQaUser();
const { data: clinician, error: clinicianError } = await supabase
  .from('profiles').select('id').eq('clinic_id', clinicId).eq('role', 'clinician').limit(1).single();
if (clinicianError) throw new Error(`clinician profile: ${clinicianError.message}`);

await upsert('patients', [{
  id: patientId,
  clinic_id: clinicId,
  external_id: 'QA-0001',
  full_name: 'Automated Test Patient',
  date_of_birth: '1990-01-01',
  summary: 'Isolated persistence fixture',
  conditions: ['Test fixture — not for display'],
}]);
await upsert('profiles', [{
  id: qaUserId,
  clinic_id: clinicId,
  patient_id: patientId,
  full_name: 'Automated Test Patient',
  role: 'patient',
}]);

await insertImmutable('care_entries', [{
  id: clinicianEntryId, clinic_id: clinicId, patient_id: patientId,
  author_role: 'clinician', author_id: clinician.id, entry_type: 'doctor_consult',
  visibility: 'internal', release_state: 'internal', current_version: 1,
  trust_state: 'Clinician Confirmed', decay_tier: 'full',
  created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z',
}]);
await insertImmutable('entry_versions', [{
  id: clinicianVersionId, care_entry_id: clinicianEntryId, version: 1,
  title: 'QA clinician fixture', content: clinicianContent, actor_id: clinician.id,
  created_at: '2026-08-01T00:00:00Z',
}]);

const fixtures = [
  ['001', 'QA released fixture', 'Released clinician-approved QA content.', 'Clinician Confirmed', 'released', 'patient'],
  ['002', 'QA AI suggested fixture', 'AI Suggested QA content must remain inaccessible.', 'AI Suggested', 'internal', 'patient'],
  ['003', 'QA conflict fixture', 'Conflict Detected QA content must remain inaccessible.', 'Conflict Detected', 'review_required', 'patient'],
  ['004', 'QA needs review fixture', 'Needs Review QA content must remain inaccessible.', 'Needs Review', 'review_required', 'patient'],
  ['005', 'QA internal fixture', 'Internal QA content must remain inaccessible.', 'Clinician Confirmed', 'internal', 'internal'],
];
await insertImmutable('care_entries', fixtures.map(([suffix, , , trust, release, visibility]) => ({
  id: `33000000-0000-4000-8000-000000000${suffix}`,
  clinic_id: clinicId, patient_id: patientId, author_role: 'clinician', author_id: clinician.id,
  entry_type: 'doctor_consult', visibility, release_state: release, current_version: 1,
  trust_state: trust, decay_tier: 'full',
  created_at: '2026-08-01T00:10:00Z', updated_at: '2026-08-01T00:10:00Z',
})));
await insertImmutable('entry_versions', fixtures.map(([suffix, title, content]) => ({
  id: `33100000-0000-4000-8000-000000000${suffix}`,
  care_entry_id: `33000000-0000-4000-8000-000000000${suffix}`,
  version: 1, title, content, actor_id: clinician.id, created_at: '2026-08-01T00:10:00Z',
})));

await upsert('highlights', [{
  id: safetyHighlightId, clinic_id: clinicId, patient_id: patientId, category: 'allergy',
  title: 'QA safety-floor signal', detail: 'Hidden safety-floor interaction fixture',
  severity: 'Critical', trust_state: 'AI Suggested', status: 'suggested', pinned: false,
  score_components: { risk: .95, unresolved: 1, recency: .5, clinicalChange: .5, conflict: 0, confirmation: 0 },
  occurred_at: '2026-08-01T00:01:00Z',
}]);
const excerpt = 'Isolated clinician persistence fixture';
const start = clinicianContent.indexOf(excerpt);
await upsert('provenance_spans', [{
  id: '41000000-0000-4000-8000-000000000006', highlight_id: safetyHighlightId,
  source_entry_id: clinicianEntryId, source_version_id: clinicianVersionId,
  start_offset: start, end_offset: start + excerpt.length, source_excerpt: excerpt,
  source_hash: createHash('sha256').update(excerpt).digest('hex'),
}]);

console.log(JSON.stringify({ provisioned: true, patient: 'QA-0001', visibleDemoPatientsTouched: false }, null, 2));
