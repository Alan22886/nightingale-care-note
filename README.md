# Nightingale Care Note

**Clinicians should not have to reread six months of history. In ten seconds, they should know the three things that matter most now.**

Nightingale Care Note is an AI-native longitudinal clinical memory and collaboration layer. It reduces fragmented history into three current priorities while keeping every important claim explainable, traceable, and reversible. All records in this prototype are synthetic.

## Product walkthrough

Open Sarah Tan at `/patients/sarah-tan` (or `/`). The clinician workspace supports:

- exactly three ranked Glance highlights with View evidence, Accept/Acknowledge, Dismiss where safe, Pin, and “Why this?”;
- source navigation to the immutable care-entry version and exact originating span;
- clear AI Suggested, Clinician Confirmed, Conflict Detected, and superseded-history states;
- April 2025, February 2026, and August 2026 longitudinal context plus HbA1c trend;
- threaded comments, mentions, resolve/unresolve, task ownership, and task status;
- treatment-plan editing, ordered snapshots, generated diffs, and revert-as-new-version;
- server-issued demo identities for patient, staff, clinician, and admin views;
- a patient-facing summary whose application filter and PostgreSQL RLS both require explicitly released content;
- contextual pre-provider redaction for known names, ID, phone, email, address, and DOB;
- a synthetic Voice Capture UI connected to the real internal-draft `/api/scribe` safety pipeline;
- bounded clinic-level importance learning from Source Open, Accept, Pin, and ordinary Dismiss; safety-floor findings use Acknowledge.

## Architecture

The submission architecture is native Next.js 16 + TypeScript on Vercel, backed by Supabase Auth and Supabase PostgreSQL with PostgreSQL Row-Level Security. Server routes derive identity from the signed Supabase session and query through the authenticated Supabase client, so RLS—not browser state—is the primary clinic and record boundary. Domain logic remains in `lib/domain`, separate from rendering and transport.

```text
Browser → Next.js on Vercel → authenticated server routes → Supabase PostgreSQL + RLS

Raw consultation text → contextual PHI redaction → deterministic provider
→ schema validation → critical-token grounding → typed conflict detection
→ deterministic risk floor → abstention → internal draft + provenance/audit

Stored safe highlights → server provenance verification → importance engine → Glance View
```

SQL migrations in `supabase/migrations/` cover clinics, profiles, patients, care entries and explicit release states, immutable versions, comments, tasks, highlights, provenance spans, AI-scribed metadata, importance feedback, clinic weights, audit logs, and redaction events. Transactional PostgreSQL functions implement versioned edit/revert, internal scribe-draft persistence, and persistent bounded learning.

## Setup

Requirements: Node 22.13+, Python 3.11+, and a Supabase project.

```bash
npm install
npm run db:seed
npm run dev
```

The local app is normally available at `http://localhost:3000`.

Create the Python test environment once:

```bash
python3 -m venv .venv
.venv/bin/pip install pytest
```

## Environment variables

Copy `.env.example` to `.env.local`. Set the public project URL and publishable key, plus the server-only Supabase secret key and a strong shared password used only to provision the synthetic demo accounts. Never expose the secret key or demo password with a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste secrets into issue/commit output.

No OpenAI key is required or used. The implemented provider is `deterministic-clinical-v2`. It receives only contextually redacted synthetic text, and its output passes schema, grounding, conflict, risk, provenance, and persistence controls. This build does not contain a live LLM or speech-to-text adapter.

## Supabase setup, migrations, and seed

Create a Supabase project, then use the official Supabase CLI from the repository root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
npm run db:seed
```

`scripts/seed-supabase.mjs` uses the server-only secret key to create/reuse the synthetic users, two clinics, visible demo stories, and hidden `QA-0001`. It never prints credentials. For production hardening fixtures, `npm run db:provision-safety` touches only `QA-0001`; it does not broadly reseed or mutate visible demo patients.

## Authentication, RBAC, and clinic isolation

`POST /api/session` maps an allowlisted demo role to a server-known synthetic account and signs in through Supabase Auth using a server-only password. The role value selects an account; it never becomes authorization authority. Every protected route verifies Supabase claims and loads the RLS-visible profile. Policies deny cross-clinic access, patient access to internal comments/raw AI notes/audit data, and cross-author overwrites between staff and clinicians. Patient care-entry SELECT additionally requires ownership, patient visibility, `release_state = released`, a non-AI entry type, and a trust state other than AI Suggested, Conflict Detected, or Needs Review. The application applies the same release predicate as defense in depth.

## Importance and learning

The LLM does not rank care. `lib/domain/importance.ts` computes:

```text
base = risk + unresolved action + recency + clinical change + conflict + confirmation
final = base × clinic category multiplier
```

Human-readable reasons come from the contributing score components. Feedback signals are Pin +3, Accept +2, Source Open +1, Dismiss −2, and Acknowledge 0. The exposure-aware update is `raw_delta = signal × 0.100 / max(4, prior_signal_count + 1)`. Non-zero stored deltas have a precision floor of 0.001; multipliers are clamped to 0.80–1.35, and raw/applied deltas are audited. Safety-floor findings cannot be dismissed in the UI or database.

Learning adapts workflow ordering, never clinical truth or deterministic safety risk.

## Provenance, revisions, and concurrency

A highlight stores the source entry, immutable version, start/end offsets, excerpt, and SHA-256 source hash. The server workspace verifies the source version, exact slice, excerpt, and hash before returning a highlight. Invalid or absent provenance fails closed: the normal claim is withheld and a deduplicated audit event is attempted. An evidence click scrolls, expands context, and highlights the cited text.

Care-entry versions are monotonically increasing full snapshots. Reverting Version 1 creates a later version with `reverted_from = 1`; no history is erased. Updates include an expected version. A stale same-section write receives 409 with current and attempted versions, while independent sections update separately. Audit records contain actor/action/entity/version metadata, never note bodies.

## Tests and quality gates

After applying migrations and seeding, run while `npm run dev` is active:

```bash
npm run lint
npm run typecheck
npm run test:safety
npm run test:micro
npm run build
npm run benchmark:glance
```

The required tests keep their challenge-specified filenames:

- `test_rbac_scope.py`
- `test_revision_history.py`
- `test_highlight_provenance.py`
- `test_concurrent_edits.py`
- `test_self_learning_importance.py`

Focused safety tests cover adversarial grounding, contextual PHI redaction, patient release RLS, malformed provenance, typed conflicts, internal scribe persistence, role boundaries, and safety-floor acknowledgement. Live mutations use only hidden `QA-0001`.

## Deployment

Production is deployed at <https://nightingale-care-note.vercel.app>. The Vercel project uses the Next.js framework preset and the same public Supabase URL/key and server-only demo password in Production and Preview. The Supabase secret key is used only for local provisioning and is not required by the deployed runtime.

To validate another deployment after applying migrations and seeding, set the target URL only for the test process:

```bash
NIGHTINGALE_BASE_URL=https://your-deployment.example npm run test:micro
```

## Known limitations

- Demo role switching uses real Supabase Auth sessions but is intentionally a presentation convenience, not a general sign-in UI.
- Runtime Voice Capture remains synthetic: it does not access a microphone or perform speech-to-text. Clinician completion sends synthetic text through `/api/scribe` and persists only an internal `QA-0001` draft; staff/patient previews do not invoke privileged generation.
- The prior D1/Sites implementation remains available in Git history, but its obsolete runtime files and dependencies are no longer part of the active tree.
- Arbitrary selected-text comments, CRDT editing, production voice transcription, EHR/FHIR integration, and real patient data are intentionally excluded.
- The provider interface is deliberately narrow; only the deterministic provider is implemented in this build.

## What we deliberately did not build

- **CRDT collaboration:** section-level optimistic concurrency demonstrates safe clinical conflict behavior with far less complexity.
- **Live voice pipeline:** the UI demonstrates synthetic capture and the real text safety path, but no microphone, transcription, or live LLM is present.
- **AI-only ranking:** rejected because clinical prioritization must remain interpretable and testable.
- **Real integrations:** synthetic data keeps the prototype safe and focused on the trust problem.

See `docs/TECHNICAL_BRIEF.md` and `docs/DEMO_SCRIPT.md` for architecture and the recommended 4–6 minute presentation.
