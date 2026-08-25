# Nightingale Care Note

**Clinicians should not have to reread six months of history. In ten seconds, they should know the three things that matter most now.**

Nightingale Care Note is an AI-native longitudinal clinical memory and collaboration layer. It reduces fragmented history into three current priorities while keeping every important claim explainable, traceable, and reversible. All records in this prototype are synthetic.

## Product walkthrough

Open Sarah Tan at `/patients/sarah-tan` (or `/`). The clinician workspace supports:

- exactly three ranked Glance highlights with Source, Accept, Dismiss, Pin, and “Why this?”;
- source navigation to the immutable care-entry version and exact originating span;
- clear AI Suggested, Clinician Confirmed, Conflict Detected, and superseded-history states;
- April 2025, February 2026, and August 2026 longitudinal context plus HbA1c trend;
- threaded comments, mentions, resolve/unresolve, task ownership, and task status;
- treatment-plan editing, ordered snapshots, generated diffs, and revert-as-new-version;
- server-issued demo identities for patient, staff, clinician, and admin views;
- a patient-facing summary that excludes internal comments and raw AI-scribed notes;
- a pre-provider redaction demonstration for name, ID, phone, email, address, and DOB;
- bounded clinic-level importance learning from Source Open, Accept, Pin, and Dismiss.

## Architecture

The submission architecture is native Next.js 16 + TypeScript on Vercel, backed by Supabase Auth and Supabase PostgreSQL with PostgreSQL Row-Level Security. Server routes derive identity from the signed Supabase session and query through the authenticated Supabase client, so RLS—not browser state—is the primary clinic and record boundary. Domain logic remains in `lib/domain`, separate from rendering and transport.

```text
Browser → Next.js on Vercel → authenticated server routes → Supabase PostgreSQL + RLS

Source interaction → PHI redaction → provider abstraction → structured result
                   → Supabase PostgreSQL → importance engine → Glance View
```

SQL migrations in `supabase/migrations/` cover clinics, profiles, patients, care entries, immutable versions, comments, tasks, highlights, provenance spans, AI-scribed metadata, importance feedback, clinic weights, audit logs, and redaction events. Transactional PostgreSQL functions implement versioned edit/revert and persistent bounded learning.

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

No OpenAI key is required. The deterministic scribe provider is the safe default. `OPENAI_API_KEY`, if enabled, remains server-only; the provider pipeline always calls `redactBeforeProvider()` before invocation and validates structured output before mutation.

## Supabase setup, migrations, and seed

Create a Supabase project, then use the official Supabase CLI from the repository root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
npm run db:seed
```

`scripts/seed-supabase.mjs` uses the server-only secret key to create/reuse five Auth users, two clinics, six patients, and the Sarah Tan story. It never prints credentials. Re-running it preserves immutable care-entry history.

## Authentication, RBAC, and clinic isolation

`POST /api/session` maps an allowlisted demo role to a server-known synthetic account and signs in through Supabase Auth using a server-only password. The role value selects an account; it never becomes authorization authority. Every protected route verifies Supabase claims and loads the RLS-visible profile. Policies deny cross-clinic access, patient access to internal comments/raw AI notes/audit data, and cross-author overwrites between staff and clinicians.

## Importance and learning

The LLM does not rank care. `lib/domain/importance.ts` computes:

```text
base = risk + unresolved action + recency + clinical change + conflict + confirmation
final = base × clinic category multiplier
```

Human-readable reasons come from the contributing score components. Feedback signals are Pin +3, Accept +2, Source Open +1, Dismiss −2. Each signal nudges a category multiplier by 0.025 and clamps it to 0.80–1.35, preventing preference learning from overwhelming clinical importance.

## Provenance, revisions, and concurrency

A highlight stores the source entry, immutable version, start/end offsets, excerpt, and source hash field in the relational schema. Resolution verifies the exact slice. A source click scrolls, expands context, and highlights the cited text.

Care-entry versions are monotonically increasing full snapshots. Reverting Version 1 creates a later version with `reverted_from = 1`; no history is erased. Updates include an expected version. A stale same-section write receives 409 with current and attempted versions, while independent sections update separately. Audit records contain actor/action/entity/version metadata, never note bodies.

## Tests and quality gates

After applying migrations and seeding, run while `npm run dev` is active:

```bash
npm run lint
npm run typecheck
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

Additional tests cover PHI redaction, payload validation, ranking bounds, persistence across new sessions, and patient authorization.

## Deployment

Import the GitHub repository into Vercel, keep the framework preset as Next.js, and configure the same Supabase values in Vercel Project Settings → Environment Variables for Production and Preview. Set `NEXT_PUBLIC_SITE_URL` to the final Vercel URL. Apply/seed Supabase before validating the deployment.

## Known limitations

- Demo role switching uses real Supabase Auth sessions but is intentionally a presentation convenience, not a general sign-in UI.
- Live Supabase authorization/persistence tests and the Vercel deployment require project credentials and are not represented as complete until run against the configured project.
- The prior D1/Sites implementation remains in Git history. Its runtime files are retained only as a fallback until the Vercel deployment is verified, then will be removed in the cleanup stage.
- Arbitrary selected-text comments, CRDT editing, production voice transcription, EHR/FHIR integration, and real patient data are intentionally excluded.
- The optional OpenAI provider adapter is represented by the safe provider interface; only the deterministic provider is enabled in this build.

## What we deliberately did not build

- **CRDT collaboration:** section-level optimistic concurrency demonstrates safe clinical conflict behavior with far less complexity.
- **Full voice pipeline:** Glance, provenance, RBAC, and auditability carry the core product value.
- **AI-only ranking:** rejected because clinical prioritization must remain interpretable and testable.
- **Real integrations:** synthetic data keeps the prototype safe and focused on the trust problem.

See `docs/TECHNICAL_BRIEF.md` and `docs/DEMO_SCRIPT.md` for architecture and the recommended 4–6 minute presentation.
