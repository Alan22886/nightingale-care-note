import type { SupabaseClient } from '@supabase/supabase-js';
import { isPatientReleased } from '../domain/patient-release';
import { ApiError, type AuthContext } from './auth';
import { failClosedHighlights } from './provenance';

function ensure<T>(data: T | null, error: { message: string; code?: string } | null, fallback = 'Database operation failed'): T {
  if (error) throw new ApiError(error.code === '42501' ? 403 : 500, error.message || fallback);
  if (data === null) throw new ApiError(404, fallback);
  return data;
}

function withOrderedVersions<T extends { entry_versions?: Array<{ version: number }> }>(entry: T): T {
  entry.entry_versions?.sort((left, right) => left.version - right.version);
  return entry;
}

function withCurrentVersionOnly<T extends { current_version: number; entry_versions?: Array<{ version: number }> }>(entry: T): T {
  return { ...entry, entry_versions: entry.entry_versions?.filter((version) => version.version === entry.current_version) };
}

export async function getPatientWorkspace(context: AuthContext, patientId: string) {
  const db = context.supabase;
  const [patientResult, patientsResult, entriesResult, commentsResult, tasksResult, highlightsResult, weightsResult] = await Promise.all([
    db.from('patients').select('*').eq('id', patientId).maybeSingle(),
    db.from('patients').select('id, external_id, full_name, date_of_birth, summary, conditions').not('external_id', 'like', 'QA-%').order('full_name'),
    db.from('care_entries').select('*, author:profiles!care_entries_author_id_fkey(full_name, role), entry_versions(*, actor:profiles!entry_versions_actor_id_fkey(full_name))').eq('patient_id', patientId).order('created_at', { ascending: false }),
    db.from('comments').select('*, author:profiles!comments_author_id_fkey(full_name, role)').eq('patient_id', patientId).order('created_at'),
    db.from('tasks').select('*, owner:profiles!tasks_owner_id_fkey(full_name, role)').eq('patient_id', patientId).order('created_at'),
    db.from('highlights').select('*, provenance_spans(*)').eq('patient_id', patientId).order('occurred_at', { ascending: false }),
    db.from('clinic_importance_weights').select('category, multiplier'),
  ]);

  const patient = ensure(patientResult.data, patientResult.error, 'Patient not found or denied');
  const entries = ensure(entriesResult.data, entriesResult.error);
  const highlights = await failClosedHighlights(db, ensure(highlightsResult.data, highlightsResult.error), entries);
  return {
    identity: context.profile,
    patient,
    patients: ensure(patientsResult.data, patientsResult.error),
    entries: context.profile.role === 'patient' ? entries.filter(isPatientReleased).map(withCurrentVersionOnly) : entries,
    comments: ensure(commentsResult.data, commentsResult.error),
    tasks: ensure(tasksResult.data, tasksResult.error),
    highlights,
    weights: Object.fromEntries(
      ensure(weightsResult.data, weightsResult.error).map((row) => [row.category, Number(row.multiplier)]),
    ),
  };
}

export async function getPatientsDirectory(context: AuthContext) {
  const db = context.supabase;
  const [patientsResult, tasksResult] = await Promise.all([
    db.from('patients').select('id, external_id, full_name, date_of_birth, summary, conditions').not('external_id', 'like', 'QA-%').order('full_name'),
    db.from('tasks').select('patient_id, title, status, created_at').neq('status', 'Done').order('created_at', { ascending: false }),
  ]);
  const patients = ensure(patientsResult.data, patientsResult.error);
  const tasks = ensure(tasksResult.data, tasksResult.error);
  const highlights = (await listHighlights(db)).filter((item) => item.status !== 'dismissed');
  return patients.map((patient) => ({
    ...patient,
    active_priorities: highlights.filter((item) => item.patient_id === patient.id).length,
    next_follow_up: tasks.find((task) => task.patient_id === patient.id) ?? null,
  }));
}

export async function getEntry(db: SupabaseClient, entryId: string, role?: AuthContext['profile']['role']) {
  const result = await db
    .from('care_entries')
    .select('*, author:profiles!care_entries_author_id_fkey(full_name, role), entry_versions(*, actor:profiles!entry_versions_actor_id_fkey(full_name))')
    .eq('id', entryId)
    .maybeSingle();
  const entry = withOrderedVersions(ensure(result.data, result.error, 'Entry not found or denied'));
  return role === 'patient' ? withCurrentVersionOnly(entry) : entry;
}

export async function editEntry(
  db: SupabaseClient,
  entryId: string,
  input: { expectedVersion: number; content?: string; title?: string; revertFrom?: number },
) {
  const { data, error } = await db.rpc('edit_care_entry', {
    p_entry_id: entryId,
    p_expected_version: input.expectedVersion,
    p_content: input.content ?? null,
    p_title: input.title ?? null,
    p_revert_from_version: input.revertFrom ?? null,
  });
  if (error) {
    if (error.code === '40001' || error.message.includes('VERSION_CONFLICT')) {
      throw new ApiError(409, 'Version conflict', error.details);
    }
    if (error.code === '42501') throw new ApiError(403, error.message);
    throw new ApiError(400, error.message);
  }
  return data;
}

export async function listHighlights(db: SupabaseClient, patientId?: string) {
  let query = db.from('highlights').select('*, provenance_spans(*, source_version:entry_versions!provenance_spans_source_version_id_fkey(id, care_entry_id, content))').order('occurred_at', { ascending: false });
  if (patientId) query = query.eq('patient_id', patientId);
  const { data, error } = await query;
  const highlights = ensure(data, error);
  const entriesById = new Map<string, { id: string; entry_versions: Array<Record<string, unknown>> }>();
  for (const highlight of highlights) {
    for (const span of (highlight.provenance_spans ?? []) as Array<Record<string, unknown>>) {
      const version = span.source_version as Record<string, unknown> | null;
      const entryId = String(span.source_entry_id);
      if (!version || String(version.care_entry_id) !== entryId) continue;
      const entry = entriesById.get(entryId) ?? { id: entryId, entry_versions: [] };
      entry.entry_versions.push(version);
      entriesById.set(entryId, entry);
    }
  }
  return failClosedHighlights(db, highlights, [...entriesById.values()]);
}

export async function listAudit(db: SupabaseClient, patientId?: string) {
  let query = db.from('audit_logs').select('*').order('created_at', { ascending: false });
  if (patientId) {
    const { data: entries, error: entryError } = await db.from('care_entries').select('id').eq('patient_id', patientId);
    const allowedIds = ensure(entries, entryError).map((entry) => entry.id);
    query = query.in('entity_id', allowedIds.length ? allowedIds : ['00000000-0000-0000-0000-000000000000']);
  }
  const { data, error } = await query;
  return ensure(data, error);
}

export async function recordFeedback(db: SupabaseClient, highlightId: string, action: string) {
  const { data, error } = await db.rpc('record_importance_feedback', {
    p_highlight_id: highlightId,
    p_action: action,
  });
  if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
  return data;
}

export async function restoreHighlightState(db: SupabaseClient, highlightId: string, status: string, pinned: boolean) {
  const { data, error } = await db.rpc('restore_highlight_state', {
    p_highlight_id: highlightId,
    p_status: status,
    p_pinned: pinned,
  });
  if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
  return data;
}

export async function listWeights(db: SupabaseClient) {
  const { data, error } = await db.from('clinic_importance_weights').select('category, multiplier');
  return Object.fromEntries(
    ensure(data, error).map((row) => [row.category, Number(row.multiplier)]),
  );
}
