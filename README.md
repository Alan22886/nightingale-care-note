# Nightingale Care Note

**A shared longitudinal care note that helps clinicians understand what matters now in under 10 seconds - without hiding where AI-derived information came from.**

- **Live demo:** <https://nightingale-care-note.vercel.app>
- **Demo video:** _Add the final public or unlisted video URL before submission_
- **Technical brief:** [Markdown](docs/TECHNICAL_BRIEF.md) · [Print-ready PDF](output/pdf/TECHNICAL_BRIEF.pdf)
- **Final audit:** [Requirement matrix and validation evidence](docs/FINAL_AUDIT.md)

All people, records, identifiers, and clinical stories in this prototype are synthetic.

## Why Nightingale

The problem is not a lack of patient information; it is the time and cognitive cost of determining what matters now. Nightingale reduces a fragmented record to three current priorities while keeping reduction reversible, prioritization explainable, and clinician judgment authoritative.

## 10-second Glance

Sarah Tan's clinician view surfaces exactly three priorities: dizziness after a medication change, worsening HbA1c, and a pending renal-function follow-up. Deterministic components cover risk, unresolved action, recency, clinical change, conflict, and confirmation. A bounded clinic multiplier may reorder ordinary workflow attention, but a deterministic safety floor remains first and cannot be dismissed.

**Learning adapts workflow ordering, never clinical truth or deterministic safety risk.**

## Provenance and trust

Every surfaced highlight cites an immutable care-entry version, exact character span, stored excerpt, and SHA-256 source hash. The server verifies the source, version, bounds, excerpt, and hash before returning the claim. **No valid provenance means no normal surfaced AI claim.** “View evidence” scrolls to the source entry and temporarily marks the exact phrase.

The UI intentionally avoids decorative confidence percentages. It exposes observable workflow states instead: AI Suggested, Clinician Confirmed, Clinician Rejected, Conflict Detected, Needs Review, and Superseded.

## Safety architecture

The real runtime path is:

```text
Authenticate and authorize
→ contextual PHI redaction
→ deterministic provider
→ schema validation
→ critical-token grounding
→ typed conflict detection
→ deterministic risk floor
→ abstain or Needs Review
→ internal draft + provenance + metadata-only audit
```

Critical-token grounding checks medication identity, numbers, dose, units, frequency, laboratory values, polarity, allergy, reaction, and medication status. Unsupported or mismatched assertions are withheld instead of becoming normal clinical facts. Conflict detection is deliberately narrow: allergy polarity, medication status, and dosage across AI-human or human-human assertions.

## Patient experience

Patient View is a separate, plain-language experience centered on identity, what to know, what to do next, current and recent care, and the care team. It does not expose internal comments, raw AI notes, provenance, ranking mechanics, revisions, or internal trust states. Patient-visible records cross a separate release boundary enforced in both application logic and PostgreSQL RLS.

The family-profile flow is a clearly labelled synthetic consent prototype. It is not delegated hospital-account federation.

## Voice Capture prototype

The clinical and patient capture surfaces demonstrate ready, recording, paused, processing, and review states with patient-specific synthetic fixtures. Clinician completion can feed synthetic text into the real `/api/scribe` safety pipeline and creates only an internal draft against hidden `QA-0001`.

There is **no microphone access, audio upload, speech-to-text, diarization, live LLM transcription, or production ambient listening**. The UI demonstrates the intended workflow, not a live audio system.

## Architecture

```text
Browser → Next.js 16 / TypeScript on Vercel
        → authenticated server routes
        → Supabase Auth + PostgreSQL + Row-Level Security

Stored safe highlights → provenance verification → importance engine → Glance
```

The active relational model covers clinics, profiles, patients, care entries, immutable versions, comments, tasks, highlights, provenance spans, AI-scribed metadata, feedback, clinic weights, redaction events, and audit logs. Section-level expected-version checks return deterministic `409 Conflict`; reverts and clinical Undo create compensating versions instead of deleting history.

## Runtime AI pipeline

`POST /api/scribe` authenticates the caller, permits only an authorized clinician in the patient clinic, redacts before provider processing, validates and grounds assertions, detects supported conflicts, applies the safety floor, abstains when necessary, and persists only an internal or review-required draft with provenance and audit metadata.

The default and only implemented provider is `deterministic-clinical-v2`. No external LLM or OpenAI key is used. This makes the evaluated safety path reproducible and demo-safe.

## Security and RLS

The role selector signs into allowlisted synthetic Supabase Auth accounts; browser-selected role text is never authorization authority. PostgreSQL policies enforce clinic scope, patient ownership, release state, role permissions, author ownership, and denial of internal resources. Staff cannot overwrite clinician notes, clinicians cannot overwrite staff notes, patients cannot read another patient or internal AI/comments/revisions, and Clinic A cannot read Clinic B.

PHI redaction covers contextual known names (including titled and CJK names), ID, phone, email, address/multiline address, and DOB while preserving medication, dose, frequency, laboratory values, and non-identifying clinical dates. In a production redactor, false negatives are privacy failures and false positives are clinical-accuracy failures; both require evaluation.

## Performance

The production benchmark signs in through `/api/session`, reuses the authenticated cookie, performs 15 warmups, then measures 100 `/api/highlights` requests; any non-200 fails the run. Final audit on 28 Aug 2026:

```text
P50 207.60 ms · P95 268.50 ms · P99 322.75 ms · failures 0
```

The required warm-path target is P95 ≤ 300 ms.

## Testing

```bash
npm run lint
npm run typecheck
npm run test:safety
NIGHTINGALE_BASE_URL=https://nightingale-care-note.vercel.app npm run test:micro
npx next build --webpack
NIGHTINGALE_BASE_URL=https://nightingale-care-note.vercel.app npm run benchmark:glance
```

Final audit results: npm audit 0 vulnerabilities, focused safety 23/23, live Supabase/RLS/persistence suite 17/17, and a successful production webpack build. The challenge-named Python tests are retained exactly in `tests/`.

## Demo accounts and role switching

Use **Viewing as** to switch among Dr Marcus Lim (Clinician), Nurse Alice Wong (Staff), Sarah Tan (Patient), and Clinic Admin. Each switch performs a server-side Supabase Auth session exchange. No credentials are shown to the evaluator.

## Local development

Requirements: Node 22.13+, Python 3.11+, and a Supabase project.

```bash
npm ci
cp .env.example .env.local
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
npm run db:seed
npm run dev
```

Create the Python environment once:

```bash
python3 -m venv .venv
.venv/bin/pip install pytest
```

`.env.example` contains placeholders only. Never commit `.env.local`, the Supabase secret key, or the server-only demo password.

## Known limitations

- Deterministic provider, not a live production LLM; extraction and conflict coverage are intentionally narrow.
- Synthetic Voice Capture only; no real audio, STT, diarization, or ambient listening.
- No EHR/FHIR integration or real patient data.
- Family connection is a session-only consent/federation prototype.
- Entry-level comments work; Reply creates a mention-prefilled follow-up rather than a nested parent/child thread.
- Task status persists and can be undone; the API supports owner changes, but the current UI does not expose task reassignment.
- No seeded AI nurse-consult summary; the shared care-entry model supports AI entries, and the demo includes AI doctor and AI patient-session entries.
- At 390 px the collaboration drawer has an 18 px transformed edge beyond the viewport; the document itself does not horizontally scroll.

## Attribution

See [ATTRIBUTION.txt](ATTRIBUTION.txt). OpenAI Codex was used as an AI-assisted development tool.
