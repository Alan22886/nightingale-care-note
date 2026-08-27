import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const url = required('NEXT_PUBLIC_SUPABASE_URL');
const secretKey = required('SUPABASE_SECRET_KEY');
const demoPassword = required('SUPABASE_DEMO_PASSWORD');
const supabase = createClient(url, secretKey, {
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
  qaPatient: '20000000-0000-4000-8000-000000000007',
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
  qaClinicianEntry: '30000000-0000-4000-8000-000000000006',
  qaStaffEntry: '30000000-0000-4000-8000-000000000007',
  qaClinicianVersion: '31000000-0000-4000-8000-000000000007',
  qaStaffVersion: '31000000-0000-4000-8000-000000000008',
  qaHighlight: '40000000-0000-4000-8000-000000000005',
  qaTask: '60000000-0000-4000-8000-000000000002',
  qaSafetyHighlight: '40000000-0000-4000-8000-000000000006',
  redaction: '70000000-0000-4000-8000-000000000001',
};

const emailByRole = {
  patient: process.env.SUPABASE_DEMO_PATIENT_EMAIL || 'patient@nightingale.demo',
  staff: process.env.SUPABASE_DEMO_STAFF_EMAIL || 'staff@nightingale.demo',
  clinician: process.env.SUPABASE_DEMO_CLINICIAN_EMAIL || 'clinician@nightingale.demo',
  admin: process.env.SUPABASE_DEMO_ADMIN_EMAIL || 'admin@nightingale.demo',
  clinicBClinician:
    process.env.SUPABASE_DEMO_CLINIC_B_EMAIL || 'clinician-b@nightingale.demo',
  qaPatient: process.env.SUPABASE_DEMO_QA_PATIENT_EMAIL || 'qa-patient@nightingale.demo',
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
  qaPatient: await getOrCreateUser(emailByRole.qaPatient, 'patient'),
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
  { id: ids.qaPatient, clinic_id: ids.clinicA, external_id: 'QA-0001', full_name: 'Automated Test Patient', date_of_birth: '1990-01-01', summary: 'Isolated persistence fixture', conditions: ['Test fixture — not for display'] },
]);

await upsert('profiles', [
  { id: users.patient, clinic_id: ids.clinicA, patient_id: ids.sarah, full_name: 'Sarah Tan', role: 'patient' },
  { id: users.staff, clinic_id: ids.clinicA, patient_id: null, full_name: 'Nurse Alice Wong', role: 'staff' },
  { id: users.clinician, clinic_id: ids.clinicA, patient_id: null, full_name: 'Dr Marcus Lim', role: 'clinician' },
  { id: users.admin, clinic_id: ids.clinicA, patient_id: null, full_name: 'Clinic Admin', role: 'admin' },
  { id: users.clinicBClinician, clinic_id: ids.clinicB, patient_id: null, full_name: 'Dr Priya Nair', role: 'clinician' },
  { id: users.qaPatient, clinic_id: ids.clinicA, patient_id: ids.qaPatient, full_name: 'Automated Test Patient', role: 'patient' },
]);

const content = {
  apr15: 'HbA1c baseline 7.1%. Hypertension controlled. No dizziness or medication tolerance concerns reported.',
  feb06: 'HbA1c measured at 7.3%. Blood pressure stable. Continue current medication and reinforce meal planning.',
  aug13: 'Renal function laboratory follow-up remains pending. Open for 12 days and assigned to Nurse Alice.',
  aug23: 'Patient reports episodes of dizziness since the medication adjustment last week. She believes she stopped metformin after the change.',
  aug24v1: 'HbA1c has increased from 7.1% to 8.3%. Treatment plan: continue metformin 500 mg twice daily pending review.',
  aug24v2: 'HbA1c has increased from 7.1% to 8.3%. Sarah clarified she has continued metformin 500 mg twice daily; the earlier AI statement was incomplete.',
};

await insertImmutable('care_entries', [
  { id: ids.apr15, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult', visibility: 'patient', release_state: 'released', current_version: 1, trust_state: 'Clinician Confirmed', decay_tier: 'compressed', created_at: '2025-04-15T01:35:00Z', updated_at: '2025-04-15T01:35:00Z' },
  { id: ids.feb06, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'system', author_id: null, entry_type: 'ai_doctor_consult_summary', visibility: 'internal', release_state: 'internal', current_version: 1, trust_state: 'Clinician Confirmed', decay_tier: 'summary', created_at: '2026-02-06T07:10:00Z', updated_at: '2026-02-06T07:10:00Z' },
  { id: ids.aug13, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'staff', author_id: users.staff, entry_type: 'nurse_followup', visibility: 'internal', release_state: 'internal', current_version: 1, trust_state: null, decay_tier: 'full', created_at: '2026-08-13T03:20:00Z', updated_at: '2026-08-13T03:20:00Z' },
  { id: ids.aug23, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'system', author_id: null, entry_type: 'ai_patient_session_summary', visibility: 'internal', release_state: 'internal', current_version: 1, trust_state: 'Conflict Detected', decay_tier: 'full', superseded_by: ids.aug24, created_at: '2026-08-23T12:04:00Z', updated_at: '2026-08-23T12:04:00Z' },
  { id: ids.aug24, clinic_id: ids.clinicA, patient_id: ids.sarah, author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult', visibility: 'patient', release_state: 'released', current_version: 2, trust_state: 'Clinician Confirmed', decay_tier: 'full', created_at: '2026-08-24T08:18:00Z', updated_at: '2026-08-25T06:32:00Z' },
]);

await insertImmutable('entry_versions', [
  { id: ids.apr15v1, care_entry_id: ids.apr15, version: 1, title: 'Annual chronic care review', content: content.apr15, actor_id: users.clinician, created_at: '2025-04-15T01:35:00Z' },
  { id: ids.feb06v1, care_entry_id: ids.feb06, version: 1, title: 'Routine diabetes review', content: content.feb06, actor_id: null, created_at: '2026-02-06T07:10:00Z' },
  { id: ids.aug13v1, care_entry_id: ids.aug13, version: 1, title: 'Post-adjustment laboratory follow-up', content: content.aug13, actor_id: users.staff, created_at: '2026-08-13T03:20:00Z' },
  { id: ids.aug23v1, care_entry_id: ids.aug23, version: 1, title: 'Patient check-in before review', content: content.aug23, actor_id: null, created_at: '2026-08-23T12:04:00Z' },
  { id: ids.aug24v1, care_entry_id: ids.aug24, version: 1, title: 'Diabetes review and treatment plan', content: content.aug24v1, actor_id: users.clinician, created_at: '2026-08-24T08:18:00Z' },
  { id: ids.aug24v2, care_entry_id: ids.aug24, version: 2, title: 'Diabetes review and treatment plan', content: content.aug24v2, actor_id: users.clinician, created_at: '2026-08-25T06:32:00Z' },
]);

const miniStories = [
  {
    patientId: ids.jason,
    entries: [
      { title: 'Asthma control review', content: 'Night-time wheeze has increased to twice weekly. Inhaler technique reviewed and spacer use reinforced.', type: 'doctor_consult', role: 'clinician', visibility: 'patient', trust: 'Clinician Confirmed', at: '2026-08-20T02:20:00Z' },
      { title: 'Telephone follow-up', content: 'No urgent breathlessness reported. Follow-up is booked after two weeks of regular preventer use.', type: 'nurse_followup', role: 'staff', visibility: 'patient', trust: null, at: '2026-08-25T03:10:00Z' },
    ],
    highlights: [
      { title: 'Night-time wheeze increasing', detail: 'Now occurring twice weekly', category: 'new_symptom', severity: 'Attention', trust: 'Clinician Confirmed', entry: 0, excerpt: 'Night-time wheeze has increased to twice weekly' },
      { title: 'Technique review completed', detail: 'Spacer use reinforced at latest visit', category: 'medication_change', severity: 'Follow-up', trust: 'Clinician Confirmed', entry: 0, excerpt: 'Inhaler technique reviewed and spacer use reinforced' },
    ],
    task: 'Review symptom diary after regular preventer use',
  },
  {
    patientId: ids.mei,
    entries: [
      { title: 'Lipid therapy review', content: 'LDL cholesterol remains above the agreed target. Mei reports muscle aches after restarting atorvastatin.', type: 'doctor_consult', role: 'clinician', visibility: 'patient', trust: 'Clinician Confirmed', at: '2026-08-18T05:40:00Z' },
      { title: 'Medication tolerance check', content: 'Muscle symptoms are unchanged but remain mild. Medication review is scheduled before any dose adjustment.', type: 'nurse_followup', role: 'staff', visibility: 'patient', trust: null, at: '2026-08-24T01:45:00Z' },
    ],
    highlights: [
      { title: 'LDL remains above target', detail: 'Requires treatment review', category: 'lab_abnormality', severity: 'Attention', trust: 'Clinician Confirmed', entry: 0, excerpt: 'LDL cholesterol remains above the agreed target' },
      { title: 'Muscle aches after restart', detail: 'Mild and unchanged at follow-up', category: 'new_symptom', severity: 'Follow-up', trust: 'AI Suggested', entry: 1, excerpt: 'Muscle symptoms are unchanged but remain mild' },
    ],
    task: 'Complete medication tolerance review',
  },
  {
    patientId: ids.daniel,
    entries: [
      { title: 'Migraine pattern review', content: 'Headache frequency has improved from six to three days monthly. No new neurological warning symptoms reported.', type: 'doctor_consult', role: 'clinician', visibility: 'patient', trust: 'Clinician Confirmed', at: '2026-08-19T07:15:00Z' },
      { title: 'Trigger diary follow-up', content: 'Sleep disruption remains the most consistent trigger. Daniel will continue the diary until the next review.', type: 'nurse_followup', role: 'staff', visibility: 'patient', trust: null, at: '2026-08-26T00:30:00Z' },
    ],
    highlights: [
      { title: 'Migraine frequency improving', detail: 'Six → three days per month', category: 'new_symptom', severity: 'Follow-up', trust: 'Clinician Confirmed', entry: 0, excerpt: 'Headache frequency has improved from six to three days monthly' },
      { title: 'Sleep disruption remains a trigger', detail: 'Continue diary until next review', category: 'unresolved_task', severity: 'Follow-up', trust: 'Clinician Confirmed', entry: 1, excerpt: 'Sleep disruption remains the most consistent trigger' },
    ],
    task: 'Bring completed migraine trigger diary',
  },
  {
    patientId: ids.farah,
    entries: [
      { title: 'Annual hypertension review', content: 'Home blood pressure readings are mostly within target. One elevated evening pattern needs confirmation.', type: 'doctor_consult', role: 'clinician', visibility: 'patient', trust: 'Clinician Confirmed', at: '2026-08-17T02:05:00Z' },
      { title: 'Home monitoring follow-up', content: 'Farah has recorded morning and evening readings for seven days. The completed log is ready for review.', type: 'nurse_followup', role: 'staff', visibility: 'patient', trust: null, at: '2026-08-25T06:25:00Z' },
    ],
    highlights: [
      { title: 'Evening pressure pattern to confirm', detail: 'Review the completed seven-day log', category: 'lab_abnormality', severity: 'Follow-up', trust: 'AI Suggested', entry: 0, excerpt: 'One elevated evening pattern needs confirmation' },
      { title: 'Home monitoring complete', detail: 'Seven-day log ready for review', category: 'unresolved_task', severity: 'Follow-up', trust: 'Clinician Confirmed', entry: 1, excerpt: 'The completed log is ready for review' },
    ],
    task: 'Review seven-day home blood pressure log',
  },
];

let miniEntryIndex = 1;
let miniHighlightIndex = 1;
for (const story of miniStories) {
  const storyEntries = story.entries.map((entry) => {
    const index = miniEntryIndex++;
    return {
      ...entry,
      id: `32000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      versionId: `32100000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    };
  });
  await insertImmutable('care_entries', storyEntries.map((entry) => ({
    id: entry.id, clinic_id: ids.clinicA, patient_id: story.patientId,
    author_role: entry.role, author_id: entry.role === 'clinician' ? users.clinician : users.staff,
    entry_type: entry.type, visibility: entry.visibility, release_state: entry.visibility === 'patient' ? 'released' : 'internal', current_version: 1,
    trust_state: entry.trust, decay_tier: 'full', created_at: entry.at, updated_at: entry.at,
  })));
  await insertImmutable('entry_versions', storyEntries.map((entry) => ({
    id: entry.versionId, care_entry_id: entry.id, version: 1, title: entry.title,
    content: entry.content, actor_id: entry.role === 'clinician' ? users.clinician : users.staff,
    created_at: entry.at,
  })));
  for (const highlight of story.highlights) {
    const index = miniHighlightIndex++;
    const source = storyEntries[highlight.entry];
    const highlightId = `42000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    await upsert('highlights', [{
      id: highlightId, clinic_id: ids.clinicA, patient_id: story.patientId,
      category: highlight.category, title: highlight.title, detail: highlight.detail,
      severity: highlight.severity, trust_state: highlight.trust, status: 'suggested', pinned: false,
      score_components: { risk: .45, unresolved: .55, recency: .8, clinicalChange: .65, conflict: 0, confirmation: highlight.trust === 'Clinician Confirmed' ? 1 : 0 },
      occurred_at: source.at,
    }]);
    await upsert('provenance_spans', [{
      id: `42100000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      highlight_id: highlightId, source_entry_id: source.id, source_version_id: source.versionId,
      ...span(source.content, highlight.excerpt),
    }]);
  }
  const storyIndex = miniStories.indexOf(story) + 1;
  await upsert('tasks', [{
    id: `62000000-0000-4000-8000-${String(storyIndex).padStart(12, '0')}`,
    clinic_id: ids.clinicA, patient_id: story.patientId, source_entry_id: storyEntries.at(-1).id,
    title: story.task, owner_id: users.staff, status: 'Open', patient_visible: true,
    created_at: storyEntries.at(-1).at,
  }]);
  await upsert('comments', [{
    id: `52000000-0000-4000-8000-${String(storyIndex).padStart(12, '0')}`,
    clinic_id: ids.clinicA, patient_id: story.patientId, entry_id: storyEntries.at(-1).id,
    author_id: users.staff, body: 'Follow-up context reviewed with the care team.', internal: true,
    resolved: false, created_at: storyEntries.at(-1).at,
  }]);
}

const qaClinicianContent = 'Isolated clinician persistence fixture. This record never appears in the demo directory.';
const qaStaffContent = 'Isolated staff persistence fixture for comments, tasks, and author ownership checks.';
await insertImmutable('care_entries', [
  { id: ids.qaClinicianEntry, clinic_id: ids.clinicA, patient_id: ids.qaPatient, author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult', visibility: 'internal', release_state: 'internal', current_version: 1, trust_state: 'Clinician Confirmed', decay_tier: 'full', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: ids.qaStaffEntry, clinic_id: ids.clinicA, patient_id: ids.qaPatient, author_role: 'staff', author_id: users.staff, entry_type: 'nurse_followup', visibility: 'internal', release_state: 'internal', current_version: 1, trust_state: null, decay_tier: 'full', created_at: '2026-08-01T00:05:00Z', updated_at: '2026-08-01T00:05:00Z' },
]);
await insertImmutable('entry_versions', [
  { id: ids.qaClinicianVersion, care_entry_id: ids.qaClinicianEntry, version: 1, title: 'QA clinician fixture', content: qaClinicianContent, actor_id: users.clinician, created_at: '2026-08-01T00:00:00Z' },
  { id: ids.qaStaffVersion, care_entry_id: ids.qaStaffEntry, version: 1, title: 'QA staff fixture', content: qaStaffContent, actor_id: users.staff, created_at: '2026-08-01T00:05:00Z' },
]);
const qaReleaseFixtures = [
  { id: '33000000-0000-4000-8000-000000000001', versionId: '33100000-0000-4000-8000-000000000001', title: 'QA released fixture', content: 'Released clinician-approved QA content.', trust: 'Clinician Confirmed', release: 'released', visibility: 'patient' },
  { id: '33000000-0000-4000-8000-000000000002', versionId: '33100000-0000-4000-8000-000000000002', title: 'QA AI suggested fixture', content: 'AI Suggested QA content must remain inaccessible.', trust: 'AI Suggested', release: 'internal', visibility: 'patient' },
  { id: '33000000-0000-4000-8000-000000000003', versionId: '33100000-0000-4000-8000-000000000003', title: 'QA conflict fixture', content: 'Conflict Detected QA content must remain inaccessible.', trust: 'Conflict Detected', release: 'review_required', visibility: 'patient' },
  { id: '33000000-0000-4000-8000-000000000004', versionId: '33100000-0000-4000-8000-000000000004', title: 'QA needs review fixture', content: 'Needs Review QA content must remain inaccessible.', trust: 'Needs Review', release: 'review_required', visibility: 'patient' },
  { id: '33000000-0000-4000-8000-000000000005', versionId: '33100000-0000-4000-8000-000000000005', title: 'QA internal fixture', content: 'Internal QA content must remain inaccessible.', trust: 'Clinician Confirmed', release: 'internal', visibility: 'internal' },
];
await insertImmutable('care_entries', qaReleaseFixtures.map((fixture) => ({
  id: fixture.id, clinic_id: ids.clinicA, patient_id: ids.qaPatient,
  author_role: 'clinician', author_id: users.clinician, entry_type: 'doctor_consult',
  visibility: fixture.visibility, release_state: fixture.release, current_version: 1,
  trust_state: fixture.trust, decay_tier: 'full', created_at: '2026-08-01T00:10:00Z', updated_at: '2026-08-01T00:10:00Z',
})));
await insertImmutable('entry_versions', qaReleaseFixtures.map((fixture) => ({
  id: fixture.versionId, care_entry_id: fixture.id, version: 1, title: fixture.title,
  content: fixture.content, actor_id: users.clinician, created_at: '2026-08-01T00:10:00Z',
})));
await upsert('highlights', [{ id: ids.qaHighlight, clinic_id: ids.clinicA, patient_id: ids.qaPatient, category: 'administrative', title: 'QA persistence signal', detail: 'Hidden automated test fixture', severity: 'Follow-up', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: 0, unresolved: .2, recency: .5, clinicalChange: 0, conflict: 0, confirmation: 1 }, occurred_at: '2026-08-01T00:00:00Z' }]);
await upsert('highlights', [{ id: ids.qaSafetyHighlight, clinic_id: ids.clinicA, patient_id: ids.qaPatient, category: 'allergy', title: 'QA safety-floor signal', detail: 'Hidden safety-floor interaction fixture', severity: 'Critical', trust_state: 'AI Suggested', status: 'suggested', pinned: false, score_components: { risk: .95, unresolved: 1, recency: .5, clinicalChange: .5, conflict: 0, confirmation: 0 }, occurred_at: '2026-08-01T00:01:00Z' }]);
await upsert('provenance_spans', [{ id: '41000000-0000-4000-8000-000000000005', highlight_id: ids.qaHighlight, source_entry_id: ids.qaClinicianEntry, source_version_id: ids.qaClinicianVersion, ...span(qaClinicianContent, 'Isolated clinician persistence fixture') }]);
await upsert('provenance_spans', [{ id: '41000000-0000-4000-8000-000000000006', highlight_id: ids.qaSafetyHighlight, source_entry_id: ids.qaClinicianEntry, source_version_id: ids.qaClinicianVersion, ...span(qaClinicianContent, 'Isolated clinician persistence fixture') }]);
await upsert('tasks', [{ id: ids.qaTask, clinic_id: ids.clinicA, patient_id: ids.qaPatient, source_entry_id: ids.qaStaffEntry, title: 'QA persistence task', owner_id: users.staff, status: 'Open', patient_visible: false, created_at: '2026-08-01T00:05:00Z' }]);

await upsert('redaction_events', [{ id: ids.redaction, clinic_id: ids.clinicA, categories: ['NAME', 'ID', 'PHONE'], provider: 'mock', created_at: '2026-08-23T12:03:00Z' }]);
await upsert('ai_scribed_notes', [
  { care_entry_id: ids.feb06, clinic_id: ids.clinicA, patient_id: ids.sarah, interaction_type: 'doctor_patient_consult', provider: 'mock', model: 'deterministic-v1', prompt_version: 'scribe-v1', redaction_event_id: ids.redaction, source_session_id: 'session-feb06', created_at: '2026-02-06T07:10:00Z' },
  { care_entry_id: ids.aug23, clinic_id: ids.clinicA, patient_id: ids.sarah, interaction_type: 'ai_patient_session', provider: 'mock', model: 'deterministic-v1', prompt_version: 'scribe-v1', redaction_event_id: ids.redaction, source_session_id: 'session-aug23', created_at: '2026-08-23T12:04:00Z' },
], { onConflict: 'care_entry_id' });

await upsert('highlights', [
  { id: ids.hba, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'lab_abnormality', title: 'HbA1c worsening', detail: '7.1% → 8.3% since previous review', severity: 'Attention', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: .7, unresolved: .2, recency: .85, clinicalChange: 1, conflict: 0, confirmation: 1 }, occurred_at: '2026-08-24T08:18:00Z' },
  { id: ids.dizziness, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'new_symptom', title: 'Dizziness following medication change', detail: 'Reported by patient 2 days ago', severity: 'Attention', trust_state: 'AI Suggested', status: 'suggested', pinned: false, score_components: { risk: .7, unresolved: .7, recency: 1, clinicalChange: 1, conflict: .4, confirmation: 0 }, occurred_at: '2026-08-23T12:04:00Z' },
  { id: ids.renal, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'unresolved_task', title: 'Renal function test still pending', detail: 'Open for 12 days · Assigned to Nurse Alice', severity: 'Follow-up', trust_state: 'Clinician Confirmed', status: 'suggested', pinned: false, score_components: { risk: .45, unresolved: 1, recency: .6, clinicalChange: .5, conflict: 0, confirmation: 1 }, occurred_at: '2026-08-13T03:20:00Z' },
  { id: ids.medication, clinic_id: ids.clinicA, patient_id: ids.sarah, category: 'medication_change', title: 'Medication record corrected', detail: 'Clinician clarified metformin was not stopped', severity: 'Follow-up', trust_state: 'Clinician Confirmed', status: 'dismissed', pinned: false, score_components: { risk: .45, unresolved: 0, recency: .85, clinicalChange: .8, conflict: 1, confirmation: 1 }, occurred_at: '2026-08-24T08:18:00Z' },
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
  patients: 7,
  demoUsers: Object.keys(users),
  note: 'No password or service key was written to output.',
}, null, 2));
