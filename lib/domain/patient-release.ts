type PatientReleaseCandidate = { visibility?: string; entry_type?: string; author_role?: string; trust_state?: string };

export function isPatientReleased(candidate: PatientReleaseCandidate) {
  const authoredByCareTeam = candidate.author_role === 'clinician' || candidate.author_role === 'staff';
  const deterministicPatientEntry = candidate.entry_type === 'patient_submitted';
  return candidate.visibility === 'patient'
    && !candidate.entry_type?.startsWith('ai_')
    && (authoredByCareTeam || deterministicPatientEntry)
    && candidate.trust_state !== 'AI Suggested'
    && candidate.trust_state !== 'Conflict Detected'
    && candidate.trust_state !== 'Needs Review';
}
