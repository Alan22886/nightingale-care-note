import { extractCriticalClinicalTokens } from './assertions.ts';
import type { AssertionKind, ConflictParticipants, ConflictScope } from './models';

export type ComparableAssertion = {
  id: string;
  kind: AssertionKind;
  claim: string;
  authorRole: string;
  sourceEntryId?: string;
  sourceVersionId?: string;
  sourceExcerpt?: string;
  startOffset?: number;
  endOffset?: number;
};

export type DetectedConflict = {
  scope: ConflictScope;
  participants: ConflictParticipants;
  left: ComparableAssertion;
  right: ComparableAssertion;
};

function participants(left: ComparableAssertion, right: ComparableAssertion): ConflictParticipants {
  return left.authorRole === 'system' || right.authorRole === 'system' ? 'ai-human' : 'human-human';
}
function sameMedication(left: ReturnType<typeof extractCriticalClinicalTokens>, right: ReturnType<typeof extractCriticalClinicalTokens>) {
  return left.medications.some((medication) => right.medications.includes(medication));
}
function differs(left: string[], right: string[]) {
  return left.length > 0 && right.length > 0 && (left.length !== right.length || left.some((value) => !right.includes(value)));
}

export function detectTypedConflict(left: ComparableAssertion, right: ComparableAssertion): DetectedConflict | null {
  const leftTokens = extractCriticalClinicalTokens(left.claim);
  const rightTokens = extractCriticalClinicalTokens(right.claim);
  if (left.kind === 'allergy' && right.kind === 'allergy') {
    const sameAllergen = leftTokens.allergens.some((allergen) => rightTokens.allergens.includes(allergen));
    if (sameAllergen && leftTokens.polarity !== rightTokens.polarity) return { scope: 'allergy', participants: participants(left, right), left, right };
    return null;
  }
  if (!['medication', 'dosage'].includes(left.kind) || !['medication', 'dosage'].includes(right.kind) || !sameMedication(leftTokens, rightTokens)) return null;
  if (leftTokens.medicationStatus.includes('active') && rightTokens.medicationStatus.includes('discontinued')
    || leftTokens.medicationStatus.includes('discontinued') && rightTokens.medicationStatus.includes('active')) {
    return { scope: 'medication', participants: participants(left, right), left, right };
  }
  if (differs(leftTokens.numbers, rightTokens.numbers) || differs(leftTokens.units, rightTokens.units) || differs(leftTokens.frequencies, rightTokens.frequencies)) {
    return { scope: 'dosage', participants: participants(left, right), left, right };
  }
  return null;
}

export function findTypedConflicts(candidate: ComparableAssertion, existing: ComparableAssertion[]) {
  return existing.map((assertion) => detectTypedConflict(candidate, assertion)).filter((item): item is DetectedConflict => Boolean(item));
}
