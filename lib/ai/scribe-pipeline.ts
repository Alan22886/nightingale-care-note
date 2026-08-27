import { createHash, randomUUID } from 'node:crypto';
import { processSession, type ScribeProvider } from './provider';
import { validateSourceGrounding } from '../domain/assertions';
import { findTypedConflicts, type ComparableAssertion } from '../domain/conflicts';
import type { AssertionKind } from '../domain/models';
import { ApiError, type AuthContext } from '../server/auth';

type Row = Record<string, unknown>;
type ExistingAssertion = ComparableAssertion & { sourceHash?: string };

function nestedRows(row: Row, key: string) { return (row[key] as Row[] | undefined) ?? []; }
function currentVersion(row: Row) {
  return nestedRows(row, 'entry_versions').find((version) => Number(version.version) === Number(row.current_version));
}
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function assertionKind(value: unknown): AssertionKind {
  return ['allergy', 'medication', 'dosage', 'lab', 'symptom', 'follow_up'].includes(String(value)) ? value as AssertionKind : 'symptom';
}
function riskFor(kind: AssertionKind, conflict: boolean) {
  if (kind === 'allergy') return .95;
  if (conflict || kind === 'dosage') return .9;
  if (kind === 'lab') return .7;
  return .55;
}

function existingAssertions(entries: Row[]): ExistingAssertion[] {
  const assertions: ExistingAssertion[] = [];
  for (const entry of entries) {
    const version = currentVersion(entry);
    if (!version || typeof version.content !== 'string') continue;
    const content = version.content;
    const patterns: Array<[AssertionKind, RegExp]> = [
      ['dosage', /\b[A-Za-z][A-Za-z-]+\s+\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml)\s+(?:BID|QD|TID|once daily|twice daily|three times daily)\b/gi],
      ['allergy', /\b(?:no\s+(?:known\s+)?|documented\s+)?(?:penicillin|amoxicillin|aspirin|latex|sulfa)\s+allerg(?:y|ies)(?:\s+(?:with|causing)\s+(?:anaphylaxis|rash|hives|swelling|wheeze))?/gi],
      ['medication', /\b(?:metformin|atorvastatin|amoxicillin|penicillin|aspirin|lisinopril|insulin)\s+(?:is\s+)?(?:active|continued|continuing|discontinued|stopped|restarted)\b/gi],
    ];
    for (const [kind, pattern] of patterns) {
      for (const match of content.matchAll(pattern)) {
        const excerpt = match[0].trim();
        const start = match.index ?? content.indexOf(excerpt);
        assertions.push({
          id: `${String(entry.id)}:${start}`,
          kind,
          claim: excerpt,
          authorRole: String(entry.author_role),
          sourceEntryId: String(entry.id),
          sourceVersionId: String(version.id),
          sourceExcerpt: excerpt,
          sourceHash: sha256(excerpt),
          startOffset: start,
          endOffset: start + excerpt.length,
        });
      }
    }
  }
  return assertions;
}

async function loadScribeContext(context: AuthContext, patientId: string) {
  const [patientResult, profilesResult, entriesResult] = await Promise.all([
    context.supabase.from('patients').select('id, clinic_id, full_name').eq('id', patientId).maybeSingle(),
    context.supabase.from('profiles').select('full_name').eq('clinic_id', context.profile.clinicId),
    context.supabase.from('care_entries').select('id, author_role, current_version, entry_versions(id, version, content)').eq('patient_id', patientId),
  ]);
  if (patientResult.error || !patientResult.data) throw new ApiError(403, 'Patient scope denied');
  if (patientResult.data.clinic_id !== context.profile.clinicId) throw new ApiError(403, 'Patient scope denied');
  if (profilesResult.error || entriesResult.error) throw new ApiError(500, 'Scribe context unavailable');
  return {
    knownNames: [patientResult.data.full_name, context.profile.name, ...(profilesResult.data ?? []).map((profile) => profile.full_name)],
    entries: (entriesResult.data ?? []) as Row[],
  };
}

export async function runScribePipeline(
  context: AuthContext,
  input: { patientId: string; rawText: string },
  provider?: ScribeProvider,
) {
  if (context.profile.role !== 'clinician') throw new ApiError(403, 'Clinical scribe access denied');
  const scoped = await loadScribeContext(context, input.patientId);
  const processed = await processSession(input.rawText, { knownNames: scoped.knownNames }, provider);
  const priorAssertions = existingAssertions(scoped.entries);
  const grounded: Row[] = [];
  const withheld: Row[] = [];
  const needsReview: Row[] = [];

  for (const [index, fact] of processed.output.facts.entries()) {
    const startOffset = processed.redaction.redacted.indexOf(fact.sourceExcerpt);
    const groundedResult = validateSourceGrounding({
      kind: assertionKind(fact.kind),
      claim: fact.text,
      sourceText: processed.redaction.redacted,
      startOffset,
      endOffset: startOffset < 0 ? -1 : startOffset + fact.sourceExcerpt.length,
    });
    const base = {
      id: `candidate-${index}`,
      kind: fact.kind,
      category: fact.category,
      claim: fact.text,
      source_excerpt: fact.sourceExcerpt,
      source_hash: sha256(fact.sourceExcerpt),
      start_offset: startOffset,
      end_offset: startOffset < 0 ? -1 : startOffset + fact.sourceExcerpt.length,
      review_reason: groundedResult.reviewReason ?? null,
    };
    if (groundedResult.releaseState !== 'grounded') {
      withheld.push({ ...base, release_state: 'abstained' });
      continue;
    }
    const comparable: ComparableAssertion = { id: base.id, kind: fact.kind, claim: fact.text, authorRole: 'system' };
    const conflicts = findTypedConflicts(comparable, priorAssertions);
    const risk = riskFor(fact.kind, conflicts.length > 0);
    const assertion = {
      ...base,
      release_state: conflicts.length ? 'needs_review' : 'grounded',
      trust_state: conflicts.length ? 'Conflict Detected' : 'AI Suggested',
      severity: risk >= .95 ? 'Critical' : risk >= .7 ? 'Attention' : 'Follow-up',
      score_components: { risk, unresolved: conflicts.length ? 1 : .4, recency: 1, clinicalChange: .7, conflict: conflicts.length ? 1 : 0, confirmation: 0 },
      conflict_sources: conflicts.map((conflict) => ({
        scope: conflict.scope,
        participants: conflict.participants,
        source_entry_id: conflict.right.sourceEntryId,
        source_version_id: conflict.right.sourceVersionId,
        source_excerpt: conflict.right.sourceExcerpt,
        source_hash: (conflict.right as ExistingAssertion).sourceHash,
        start_offset: conflict.right.startOffset,
        end_offset: conflict.right.endOffset,
      })),
    };
    (conflicts.length ? needsReview : grounded).push(assertion);
    priorAssertions.push(comparable);
  }

  const sourceSessionId = randomUUID();
  const { data, error } = await context.supabase.rpc('persist_scribe_draft', {
    p_patient_id: input.patientId,
    p_redacted_source: processed.redaction.redacted,
    p_summary: processed.output.summary,
    p_categories: processed.redaction.categories,
    p_assertions: [...grounded, ...needsReview],
    p_withheld: withheld,
    p_provider: processed.provider.name,
    p_model: processed.provider.model,
    p_source_session_id: sourceSessionId,
  });
  if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
  return {
    draft: data,
    provider: processed.provider,
    redaction: { categories: processed.redaction.categories, providerReceived: processed.redaction.redacted },
    summary: processed.output.summary,
    groundedAssertions: grounded,
    withheldAssertions: withheld,
    needsReviewAssertions: needsReview,
    conflicts: needsReview.flatMap((assertion) => assertion.conflict_sources as Row[]),
  };
}
