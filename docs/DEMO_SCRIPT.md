# Nightingale Care Note — 4–6 Minute Demo

Production: <https://nightingale-care-note.vercel.app>

## Opening · 20–30 seconds

“Clinicians should not have to reread six months of fragmented history before every consultation. Nightingale Care Note turns that history into the three things that matter most now—in under ten seconds—while keeping every AI-surfaced insight verifiable at its source.”

## Scenario A — Glance and provenance · ~90 seconds

1. Open the production URL; Sarah Tan loads as **Dr Marcus Lim · Clinician**.
2. Pause on the exactly three priorities: HbA1c 7.1 → 8.3, dizziness after medication change, renal labs pending.
3. Open **Why this?** on dizziness. Point out that each reason comes from the deterministic scoring components and that the clinic multiplier is bounded.
4. Click **View evidence**. The timeline scrolls to the AI Patient Session and highlights the exact phrase “dizziness since the medication adjustment last week.”
5. Point out **AI Suggested** and **Conflict Detected**. The earlier “stopped metformin” statement remains visible, while the Aug 24 clinician clarification is authoritative.
6. Accept or pin an ordinary highlight. For a protected finding, show **Safety floor** and **Acknowledge**; it cannot be misleadingly dismissed.

## Scenario A2 — Runtime scribe safety · ~45 seconds

1. Select **Record consult** as the clinician and run the synthetic capture.
2. Explain that no microphone or speech-to-text is active: the fixture text is sent to the real `/api/scribe` endpoint.
3. Show grounded, withheld, and needs-review sections. The generated record remains an internal draft against hidden `QA-0001`, never a released visible-patient fact.

## Scenario B — Collaboration and audit · ~2 minutes

1. Switch to **Nurse Alice Wong · Staff**; note that this signs into a real server-recognized Supabase Auth demo account.
2. Open **Comments & tasks**. Add `@clinician Please review dizziness before the next appointment`, resolve/unresolve a thread, and change the renal follow-up to **In Progress**.
3. Switch to **Dr Marcus Lim · Clinician**. Pin or accept a relevant highlight.
4. Select **Edit treatment plan**, change one sentence, and save. Explain expected-version conflict protection.
5. The revision drawer shows a new immutable version and a meaningful before/after diff.
6. Refresh once to show the edit persists, then restore Version 1. Emphasize that restore creates another PostgreSQL-backed version; it never deletes intervening history.

## Scenario C — Longitudinal context and learning · ~90 seconds

1. Scan August 2026, February 2026, and April 2025 entries. Show manual notes, AI-scribed notes, and compressed old context.
2. Use the small HbA1c line: 7.1 → 7.3 → 8.3.
3. Filter **AI** and explain the preserved metformin conflict.
4. Open “Why this?” after pinning a medication-change item. The category multiplier increases conservatively and can add “frequently confirmed by this clinic.”
5. Explain that old source remains retrievable; only default presentation is compressed.

## Architecture and security close · ~45 seconds

1. Open **Security → Pre-LLM redaction**. Show name, Singapore-style ID, phone, email, address, and DOB replaced before provider invocation.
2. Switch to **Sarah Tan · Patient**. The Glance/internal timeline and Security surface disappear; only patient-visible summary and instructions remain.
3. Mention that PostgreSQL RLS—not UI hiding—produces the automated denial proofs for raw AI notes, internal comments, cross-role overwrites, and cross-clinic access.

## Final sentence

“Nightingale helps clinicians read less without asking them to trust blindly: reduction stays reversible, ranking stays explainable, and every important claim stays traceable.”
