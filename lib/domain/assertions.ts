import type { AssertionKind, SourceGroundedAssertion } from './models';

export type CandidateAssertion = {
  kind: AssertionKind;
  claim: string;
  sourceText: string;
  startOffset: number;
  endOffset: number;
  contradictory?: boolean;
};

const FREQUENCIES: Array<[RegExp, string]> = [
  [/\b(?:bid|twice\s+(?:a\s+day|daily))\b/gi, 'twice_daily'],
  [/\b(?:qd|once\s+(?:a\s+day|daily))\b/gi, 'once_daily'],
  [/\b(?:tid|three\s+times\s+(?:a\s+day|daily))\b/gi, 'three_times_daily'],
];
const MEDICATIONS = ['metformin', 'atorvastatin', 'amoxicillin', 'penicillin', 'aspirin', 'lisinopril', 'insulin'];
const ALLERGENS = ['penicillin', 'amoxicillin', 'aspirin', 'latex', 'sulfa'];
const REACTIONS = ['anaphylaxis', 'rash', 'hives', 'swelling', 'wheeze'];
const STOP_WORDS = new Set(['after', 'before', 'daily', 'patient', 'reports', 'reported', 'remains', 'still', 'the', 'this', 'that', 'with', 'without']);

function unique(values: string[]) { return [...new Set(values)]; }
function subset(left: string[], right: string[]) { return left.every((value) => right.includes(value)); }
function normalizeFrequencyWords(value: string) {
  return FREQUENCIES.reduce((text, [pattern, canonical]) => text.replace(pattern, canonical), value.toLowerCase());
}
function polarity(value: string): 'negative' | 'positive' {
  return /\b(?:denies|denied|no|not|negative\s+for|without|never)\b/i.test(value) ? 'negative' : 'positive';
}
function medicationNames(value: string) {
  const lowered = value.toLowerCase();
  const known = MEDICATIONS.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(lowered));
  const beforeDose = [...lowered.matchAll(/\b([a-z][a-z-]{2,})\s+\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml)\b/g)].map((match) => match[1]);
  return unique([...known, ...beforeDose]);
}
function medicationStatus(value: string) {
  const statuses: string[] = [];
  if (/\b(?:active|continue|continued|continuing|taking|restart(?:ed|ing)?)\b/i.test(value)) statuses.push('active');
  if (/\b(?:discontinue(?:d)?|stopped|ceased|not\s+taking)\b/i.test(value)) statuses.push('discontinued');
  return unique(statuses);
}

export type CriticalClinicalTokens = {
  numbers: string[];
  units: string[];
  medications: string[];
  frequencies: string[];
  polarity: 'negative' | 'positive';
  medicationStatus: string[];
  allergens: string[];
  reactions: string[];
};

export function extractCriticalClinicalTokens(value: string): CriticalClinicalTokens {
  const normalized = normalizeFrequencyWords(value);
  return {
    numbers: unique([...normalized.matchAll(/\b\d+(?:\.\d+)?\b/g)].map((match) => String(Number(match[0])))),
    units: unique([...normalized.matchAll(/(?:%|\b(?:mcg|mg|g|ml|mmol\/l|mmhg)\b)/gi)].map((match) => match[0].toLowerCase())),
    medications: medicationNames(normalized),
    frequencies: FREQUENCIES.map(([, canonical]) => canonical).filter((frequency) => normalized.includes(frequency)),
    polarity: polarity(normalized),
    medicationStatus: medicationStatus(normalized),
    allergens: ALLERGENS.filter((allergen) => new RegExp(`\\b${allergen}\\b`, 'i').test(normalized)),
    reactions: REACTIONS.filter((reaction) => new RegExp(`\\b${reaction}\\b`, 'i').test(normalized)),
  };
}

function criticalMismatch(kind: AssertionKind, source: CriticalClinicalTokens, claim: CriticalClinicalTokens) {
  if (!subset(claim.numbers, source.numbers)) return 'Critical numeric value does not match the source';
  if (!subset(claim.units, source.units)) return 'Clinical unit does not match the source';
  if (!subset(claim.medications, source.medications)) return 'Medication identity does not match the source';
  if (!subset(claim.frequencies, source.frequencies)) return 'Medication frequency does not match the source';
  if (claim.medicationStatus.length && !subset(claim.medicationStatus, source.medicationStatus)) return 'Medication status does not match the source';
  if (source.polarity !== claim.polarity) return 'Assertion polarity does not match the source';
  if (kind === 'allergy') {
    if (!subset(claim.allergens, source.allergens)) return 'Allergy allergen does not match the source';
    if (claim.reactions.length && !subset(claim.reactions, source.reactions)) return 'Allergy reaction does not match the source';
  }
  return undefined;
}

function semanticTerms(value: string) {
  return unique(normalizeFrequencyWords(value).replace(/[^a-z0-9_.]+/g, ' ').trim().split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term)));
}

export function validateSourceGrounding(candidate: CandidateAssertion): SourceGroundedAssertion {
  const boundsValid = Number.isInteger(candidate.startOffset) && Number.isInteger(candidate.endOffset)
    && candidate.startOffset >= 0 && candidate.endOffset > candidate.startOffset
    && candidate.endOffset <= candidate.sourceText.length;
  if (!boundsValid) return { ...candidate, releaseState: 'abstained', reviewReason: 'Exact source span is missing or invalid' };
  const excerpt = candidate.sourceText.slice(candidate.startOffset, candidate.endOffset).trim();
  if (!excerpt) return { ...candidate, releaseState: 'abstained', reviewReason: 'Exact source span is missing or invalid' };
  if (candidate.contradictory) return { ...candidate, releaseState: 'needs_review', reviewReason: 'Conflicting evidence requires human review' };

  const mismatch = criticalMismatch(
    candidate.kind,
    extractCriticalClinicalTokens(excerpt),
    extractCriticalClinicalTokens(candidate.claim),
  );
  if (mismatch) return { ...candidate, releaseState: 'abstained', reviewReason: mismatch };

  const claimTerms = semanticTerms(candidate.claim);
  const sourceTerms = semanticTerms(excerpt);
  const supported = claimTerms.filter((term) => sourceTerms.includes(term));
  if (!claimTerms.length || supported.length / claimTerms.length < .5) {
    return { ...candidate, releaseState: 'abstained', reviewReason: 'Ordinary semantic support is insufficient' };
  }
  return { ...candidate, releaseState: 'grounded' };
}
