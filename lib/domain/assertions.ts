import type { AssertionKind, SourceGroundedAssertion } from './models';

type CandidateAssertion = { kind: AssertionKind; claim: string; sourceText: string; startOffset: number; endOffset: number; contradictory?: boolean };

export function validateSourceGrounding(candidate: CandidateAssertion): SourceGroundedAssertion {
  const excerpt = candidate.sourceText.slice(candidate.startOffset, candidate.endOffset).trim();
  if (!excerpt || candidate.startOffset < 0 || candidate.endOffset > candidate.sourceText.length) {
    return { ...candidate, releaseState: 'abstained', reviewReason: 'Insufficient evidence to surface confidently' };
  }
  if (candidate.contradictory) {
    return { ...candidate, releaseState: 'needs_review', reviewReason: 'Conflicting evidence requires human review' };
  }
  const normalizedClaim = candidate.claim.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim();
  const normalizedExcerpt = excerpt.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim();
  const claimTerms = normalizedClaim.split(' ').filter((term) => term.length > 2);
  const groundedTerms = claimTerms.filter((term) => normalizedExcerpt.includes(term));
  if (!claimTerms.length || groundedTerms.length / claimTerms.length < .5) {
    return { ...candidate, releaseState: 'abstained', reviewReason: 'Insufficient evidence to surface confidently' };
  }
  return { ...candidate, releaseState: 'grounded' };
}
