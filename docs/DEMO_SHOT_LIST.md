# Nightingale Demo Shot List

Target runtime: **5:10–5:30**. Record at approximately 1280–1440 px. Start from a fresh clinician session on Sarah Tan. Avoid mutations on visible patients.

| Time | Page | Role / patient | Interaction | Narration focus | Mutation |
|---|---|---|---|---|---|
| 0:00–0:25 | Sarah Care Note | Clinician / Sarah | Hold on header + Glance | Fragmented history → three things that matter now | None |
| 0:25–0:55 | Sarah Glance | Clinician / Sarah | Scan exactly 3 priorities | Deterministic attention, concise hierarchy | None |
| 0:55–1:20 | Sarah Glance | Clinician / Sarah | Open Why this? on dizziness | Risk vs importance; bounded learning; safety floor | None |
| 1:20–2:00 | Sarah Glance → Timeline | Clinician / Sarah | View evidence | Immutable version, exact span, fail-closed provenance | Source Open records +1 feedback. Reversible but avoid repeated takes. |
| 2:00–2:35 | Sarah Timeline | Clinician / Sarah | Point to Aug 23 conflict and Aug 24 correction | Trust states; preserve both sources; clinician authority; abstention | None |
| 2:35–2:55 | Collaboration drawer | Clinician / Sarah | Open comments/tasks; do not submit | Mentions, resolve, owner/status, persistence | None |
| 2:55–3:05 | Revision drawer | Clinician / Sarah | Open current history/diff; do not edit | Expected-version checks; compensating revert/Undo | None |
| 3:05–3:40 | Patient View | Patient / Sarah | Switch role; scan plain-language sections | Separate release boundary; no internal morphology | Auth/session change only |
| 3:30–3:40 | Patient profile rail | Patient / Sarah | Open Add family member, show consent, close | Synthetic prototype; no real delegated access | None; do not connect |
| 3:40–4:05 | Record consult | Clinician / Sarah | Switch back; open capture drawer | Honest no-microphone UI; active user/patient binding | Auth/session change only |
| 4:05–4:20 | Patients → Daniel → Record consult | Clinician / Daniel | Open Daniel capture and show speaker names | Patient-specific fixture | None |
| 4:20–4:50 | Prepared capture result or Brief | Clinician / QA-0001 only if live | Explain redaction → ground → conflict → risk → abstain | Real deterministic `/api/scribe` safety flow | If processed live, creates internal QA-only draft; run cleanup afterward |
| 4:50–5:10 | Identity & Access + Brief | Clinician / Sarah | Open access panel, then architecture/performance | Supabase Auth/RLS; P95 268.50 ms | None |
| 5:10–5:25 | Sarah Glance | Clinician / Sarah | Return to top | Read less without trusting blindly | None |

## Recording safeguards

- Do not Accept, Dismiss, Pin, edit, comment, resolve, assign, or change task status on Sarah or another visible patient.
- A single View evidence click records ordinary source-open learning. If a clean read-only take is required, use a prepared duplicate/local capture; otherwise this bounded signal is safe and reversible.
- If demonstrating `/api/scribe`, use hidden `QA-0001` only and run `npm run db:cleanup-safety` afterward.
- Do not show `.env.local`, browser developer storage, Vercel/Supabase secret settings, terminal history containing environment values, or private dashboards.
- Keep the video URL public or unlisted and test it in a logged-out/incognito window.
