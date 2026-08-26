export type Role = 'patient' | 'staff' | 'clinician' | 'admin';
export type HighlightCategory = 'lab_abnormality' | 'new_symptom' | 'unresolved_task' | 'medication_change' | 'administrative';
export type FeedbackAction = 'pin' | 'accept' | 'source_open' | 'dismiss';
export type HighlightStatus = 'suggested' | 'accepted' | 'dismissed';
export type TrustState = 'AI Suggested' | 'Clinician Confirmed' | 'Clinician Rejected' | 'Conflict Detected' | 'Superseded' | 'Needs Review';
export type AssertionKind = 'allergy' | 'medication' | 'dosage' | 'lab' | 'symptom' | 'follow_up';
export type AssertionReleaseState = 'grounded' | 'needs_review' | 'abstained';
export type ConflictScope = 'allergy' | 'medication' | 'dosage';
export type ConflictParticipants = 'ai-human' | 'human-human';

export type DemoIdentity = { id: string; name: string; role: Role; clinicId: string; patientId?: string };
export type ScoreComponents = { risk: number; unresolved: number; recency: number; clinicalChange: number; conflict: number; confirmation: number };
export type Highlight = {
  id: string; category: HighlightCategory; title: string; detail: string; level: 'Critical' | 'Attention' | 'Follow-up';
  sourceEntryId: string; sourceVersionId: string; startOffset: number; endOffset: number; sourceExcerpt: string;
  trust: TrustState; occurredAt: string; components: ScoreComponents; pinned?: boolean; status?: HighlightStatus;
};
export type EntryVersion = { id: string; version: number; content: string; actor: string; createdAt: string; revertedFrom?: number };
export type CareEntry = {
  id: string; type: string; label: string; author: string; authorRole: Role | 'system'; date: string; time: string;
  title: string; content: string; visibility: 'internal' | 'patient'; trust?: TrustState; ai?: boolean; decayTier?: 'full' | 'summary' | 'compressed';
  versions: EntryVersion[]; supersededBy?: string;
};
export type AuditEvent = { id: string; actor: string; action: string; entityType: string; entityId: string; at: string; fromVersion?: number; toVersion?: number };
export type SourceGroundedAssertion = { kind: AssertionKind; claim: string; sourceText: string; startOffset: number; endOffset: number; releaseState: AssertionReleaseState; reviewReason?: string };
export type ClinicalConflict = { scope: ConflictScope; participants: ConflictParticipants; sourceAssertionIds: [string, string]; state: 'needs_review' | 'resolved'; resolution?: string };
