# Nightingale Care Note - 4–6 Minute Demo

Production: <https://nightingale-care-note.vercel.app>

## 0:00–0:25 · The problem

Open on Sarah Tan as **Dr Marcus Lim · Clinician**.

“Clinicians should not have to reread six months of fragmented history before every consultation. Nightingale turns that history into the three things that matter most now - in under ten seconds - while keeping every AI-surfaced insight verifiable at its source.

Clinical AI should reduce the time required to understand a patient without reducing the clinician’s ability to verify, question, or override what the AI surfaces.”

## 0:25–1:20 · Ten-second Glance

Pause on the three priorities: dizziness after medication change, HbA1c 7.1% → 8.3%, and renal-function follow-up pending.

Open **Why this?** on dizziness.

“The ranking is not an LLM opinion. Deterministic components cover risk, unresolved action, recency, clinical change, conflict, and confirmation. The clinic can learn bounded workflow preferences, but a safety floor remains authoritative.”

Point to Accept, Dismiss, Pin, and the protected Acknowledge behavior if showing `QA-0001` in a separate prepared tab. Do not mutate Sarah for the recording.

“Learning adapts workflow ordering, never clinical truth or deterministic safety risk.”

## 1:20–2:00 · Evidence Thread

Click **View evidence** on dizziness. Let the page scroll to the AI Patient Session and pause on the exact highlighted phrase.

“This is the Evidence Thread: the claim resolves to an immutable entry version, exact source span, stored excerpt, and integrity hash. The server verifies that chain before returning the claim.

Every AI-derived claim must either map to valid evidence or abstain.”

## 2:00–2:35 · Trust and conflict

Point to **Conflict Detected**, the earlier “stopped metformin” wording, and the clinician correction that Sarah continued metformin 500 mg twice daily.

“Both versions remain visible. Clinician-confirmed information becomes authoritative without silently rewriting the earlier AI memory. Supported conflicts become Needs Review; unsupported assertions are withheld as insufficient evidence.

We intentionally do not show self-reported model confidence. Instead, we expose verifiable trust states.”

## 2:35–3:05 · Collaboration and immutable history

Open **Comments & follow-up**. Show the `@clinician` comment, resolve/reopen controls, task owner, and task status. Prefer read-only demonstration; if changing status, immediately use Undo.

Open **Edit treatment plan** and then Revision history without saving a new edit. Show the existing diff and explain:

“Expected-version checks prevent silent last-write-wins. Revert and clinical Undo create a new compensating version; intervening history is never deleted.”

## 3:05–3:40 · Patient View

Use **Viewing as → Sarah Tan · Patient**.

“This is a separate product experience: identity, what to know, what to do next, current care, recent care, and the care team. Internal comments, raw AI notes, provenance mechanics, revisions, and ranking states are absent.

Patient-facing information crosses a separate release boundary enforced both in application logic and PostgreSQL RLS.”

At desktop width, point briefly to **Add family member** and its consent/limitations copy. Do not connect it during the recording.

## 3:40–4:20 · Honest Voice Capture prototype

Return to Clinician, open **Record consult**, and show Sarah in the speaker preview. Optionally navigate Sarah → Patients → Daniel → Record consult to show current-patient binding, then return to Sarah.

“This is a workflow prototype, not live audio. It does not access a microphone, upload audio, perform speech recognition, diarization, or live LLM transcription. A patient-specific synthetic transcript can feed the real `/api/scribe` safety path; clinician runs persist only an internal draft against hidden QA-0001.”

If demonstrating processing, stop only after confirming the active patient and mention that the mutation is isolated to hidden QA data.

## 4:20–4:50 · Evaluation and abstention

Use the prepared Voice result or Technical Brief diagram.

“The runtime authenticates and authorizes, redacts PHI before provider processing, validates the schema, grounds critical tokens, detects narrow allergy/medication/dosage conflicts, applies a deterministic risk floor, and either creates an internal review draft or abstains.

The provider is deterministic-clinical-v2 - chosen so this safety pathway is reproducible, testable, and demo-safe.”

## 4:50–5:10 · Architecture and measured performance

Briefly show **Demo → Identity & access**, then the Technical Brief architecture diagram.

“Next.js runs on Vercel with Supabase Auth, PostgreSQL, and Row-Level Security. The final production benchmark used a real session, 15 warmups, and 100 measured requests: P95 was 268.50 milliseconds with zero failures, below the 300-millisecond target.”

## 5:10–5:25 · Close

Return to Sarah’s three priorities.

“Nightingale helps clinicians read less without asking them to trust blindly: reduction stays reversible, ranking stays explainable, and every important claim stays traceable.”
