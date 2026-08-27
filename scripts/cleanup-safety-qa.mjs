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
const qaPatientId = '20000000-0000-4000-8000-000000000007';

const { data: drafts, error: draftError } = await supabase
  .from('care_entries')
  .select('id')
  .eq('patient_id', qaPatientId)
  .eq('entry_type', 'ai_scribe_draft');
if (draftError) throw new Error(`care_entries: ${draftError.message}`);
const draftIds = (drafts ?? []).map((row) => row.id);

let highlightIds = [];
if (draftIds.length) {
  const { data: spans, error: spanError } = await supabase
    .from('provenance_spans')
    .select('highlight_id')
    .in('source_entry_id', draftIds);
  if (spanError) throw new Error(`provenance_spans: ${spanError.message}`);
  highlightIds = [...new Set((spans ?? []).map((row) => row.highlight_id))];
  if (highlightIds.length) {
    const { error } = await supabase.from('highlights').delete().in('id', highlightIds);
    if (error) throw new Error(`highlights: ${error.message}`);
  }
}

console.log(JSON.stringify({
  cleaned: true,
  patient: 'QA-0001',
  immutableDraftsRetained: draftIds.length,
  derivedHighlightsRemoved: highlightIds.length,
  visibleDemoPatientsTouched: false,
  immutableAndAuditHistoryPreserved: true,
}, null, 2));
