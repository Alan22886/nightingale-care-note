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

The application uses React 19, TypeScript, Vinext/Next-compatible routing, Cloudflare Workers, and a relational D1 schema managed by Drizzle. UI state gives the demo immediate interaction feedback; protected API boundaries independently resolve an HttpOnly demo identity and enforce clinic/role policy. Domain logic lives in `lib/domain`, separate from rendering and transport code.

The full relational schema covers clinics, profiles, patients, care entries, immutable versions, comments, tasks, highlights, provenance spans, AI-scribed metadata, importance feedback, clinic weights, audit logs, and redaction events. The generated migration is in `drizzle/`.

> Prototype persistence note: the deployed schema is D1-ready; the compact authorization/revision micro-test API currently uses an isolate-local repository so tests are deterministic without database bootstrap. Production should switch that repository to D1 transactions before handling real records. The user-facing prototype contains synthetic data only.

## Setup

Requirements: Node 22.13+ and Python 3.11+.

```bash
npm install
npm run dev
```

The local app is normally available at `http://localhost:3000`.

Create the Python test environment once:

```bash
python3 -m venv .venv
.venv/bin/pip install pytest
```

## Environment variables

No key is required. The deterministic scribe provider is the safe default. Copy `.env.example` only when enabling an optional live provider. `OPENAI_API_KEY` must remain server-side. The provider pipeline always calls `redactBeforeProvider()` before provider invocation and validates the returned structure before mutation.

## Database and seed

The D1 binding is declared as `DB` in `.openai/hosting.json`.

```bash
npm run db:generate
```

The prototype’s synthetic records are declared in the workspace/demo fixtures. For production, apply `drizzle/*.sql` through the deployment environment, then move the fixtures into an idempotent D1 seed script.

## Authentication, RBAC, and clinic isolation

`POST /api/session` accepts only an allowlisted demo role and issues an HttpOnly, same-site identity cookie. Every protected API route resolves this cookie server-side; it does not trust a client-provided role. The policy layer denies cross-clinic access, patient access to internal comments/raw AI notes, and cross-author overwrites between staff and clinicians. `/api/security` provides a small explicit denial boundary for demonstration and tests.

For production, ChatGPT/SIWC or another verified identity provider should identify the human, while the same server policy maps that identity to clinic and role. Demo role switching is intentionally not production authentication.

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

Run while `npm run dev` is active:

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

Additional tests cover PHI redaction, payload validation, ranking bounds, and patient authorization.

## Known limitations

- Demo identity switching is for presentation, not production authentication.
- The micro-test API repository must be moved from isolate memory to D1 transactions before real multi-user use.
- Arbitrary selected-text comments, CRDT editing, production voice transcription, EHR/FHIR integration, and real patient data are intentionally excluded.
- The optional OpenAI provider adapter is represented by the safe provider interface; only the deterministic provider is enabled in this build.

## What we deliberately did not build

- **CRDT collaboration:** section-level optimistic concurrency demonstrates safe clinical conflict behavior with far less complexity.
- **Full voice pipeline:** Glance, provenance, RBAC, and auditability carry the core product value.
- **AI-only ranking:** rejected because clinical prioritization must remain interpretable and testable.
- **Real integrations:** synthetic data keeps the prototype safe and focused on the trust problem.

See `docs/TECHNICAL_BRIEF.md` and `docs/DEMO_SCRIPT.md` for architecture and the recommended 4–6 minute presentation.
