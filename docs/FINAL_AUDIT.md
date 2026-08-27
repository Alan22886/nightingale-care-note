# Nightingale Care Note - Final Audit

Audit date: **28 Aug 2026 (SGT)**

Implementation baseline audited: `c742bdcd9cbd51148d1010abbdee5ce8e4f1c832`

Canonical production: <https://nightingale-care-note.vercel.app>

Status definitions: **PASS** = implemented and verified; **PARTIAL** = useful implementation with a stated gap; **MISSING** = explicit requirement absent; **BONUS** = challenge bonus implemented and verified.

## Original-brief requirement matrix

| Status | Requirement | Implementation and evidence | Demo location | Known limitation |
|---|---|---|---|---|
| PASS | Shared longitudinal Care Note | Unified patient workspace with identity, Glance, timeline, current care, comments, tasks, versions, and provenance. Sarah contains Apr 2025, Feb 2026, and Aug 2026 history. | Sarah clinician workspace | Not an EHR replacement or integration. |
| PASS | Glance readable/actionable in under 10 seconds | Exactly three Sarah clinician priorities with concise fact, source/time, Why this, evidence, and actions. Production DOM manually verified. | Sarah → What matters now | Staff sees a narrower action-oriented subset by design. |
| PASS | Longitudinal timeline and metadata | Ordered care entries include author/role, timestamp, type, trust, decay tier, and source links. | Sarah → Timeline / Longitudinal Ribbon | No arbitrary timeline query builder. |
| PARTIAL | AI notes from doctor, nurse, and patient-session interactions | Seed contains distinct AI doctor-consult and AI patient-session entries; relational AI metadata and shared entry model are implemented. | Sarah → AI filter | No seeded AI nurse-consult summary. |
| PASS | Human/AI distinction | AI entries have `✦ AI` labels and trust morphology; manual clinician and staff/nurse entries remain distinct. | Sarah → Timeline | None observed. |
| PARTIAL | Threaded comments, replies, mentions, assignments | Persistent comments, `@mentions`, resolve/unresolve, Reply prefill, task owner, and task status work. | Comments & follow-up | Reply posts a follow-up comment rather than a nested parent/child thread. Task owner is visible and API-updatable, but UI reassignment is absent. |
| PASS | Revision history, changes, and revert | Full immutable snapshots, ordered versions, generated before/after diff, expected-version writes, and revert-as-new-version. Live tests verify audit transition. | Edit treatment plan / Revision history | Editing is scoped to the treatment-plan section, not a rich document editor. |
| PASS | AI Scribe integration and provenance pointer | `ai_scribed_notes` metadata connects entry, interaction, provider/model/prompt/redaction/session. Highlights resolve to exact version/span. | Sarah AI entries; View evidence | Deterministic provider only. |
| BONUS | Adaptive importance logic | Deterministic components plus exposure-aware clinic/category weights; persistent bounded multiplier 0.80–1.35; live test verifies adaptation. | Why this?; `test_self_learning_importance.py` | Learns from explicit Source/Accept/Pin/Dismiss signals, not arbitrary manually selected phrases. |
| PASS | Quick accept/reject with risk reason and provenance | Accept, permitted Dismiss, safety-floor Acknowledge, Pin, component-derived Why this, and View evidence. | Sarah Glance; QA safety fixture | Safety-floor items intentionally cannot be dismissed. |
| BONUS | Hybrid storage/data decay | `full`, `summary`, and `compressed` tiers with source retained; persistent entities are not deleted for age alone. | Sarah timeline: Apr/Feb/Aug | Demonstrates policy/UI metadata, not physical cold-storage movement. |
| PASS | Patient RBAC | Patient sees only own released, patient-visible, non-AI safe entries and patient-visible tasks. Internal comments, raw AI, audit, provenance, and revisions are denied. | Viewing as Sarah; live RLS tests | Demo account flow, not production identity onboarding. |
| PASS | Staff RBAC | Staff sees clinic patients/non-AI entries, comments, and tasks; cannot overwrite clinician-authored content. | Viewing as Nurse Alice; live tests | Conservative: no unrestricted raw AI timeline. |
| PASS | Clinician RBAC | Clinician can view full clinic record, review AI, act on highlights, collaborate, and version clinician content; cannot overwrite staff-authored notes. | Viewing as Dr Marcus; live tests | Editing intentionally scoped. |
| PASS | Admin RBAC | Clinic-scoped read-only oversight, history, and Identity & Access; mutations withheld. | Viewing as Clinic Admin | No large admin dashboard, intentionally. |
| PASS | Server-side/clinic enforcement | Supabase Auth identity, authenticated routes, PostgreSQL RLS, author policies, Clinic A→B denial, and defense-in-depth application filters. | Demo → Identity & access; `test_rbac_scope.py` | Role selector is presentation convenience. |
| PASS | Traceable highlight to exact source span | Highlight stores source entry/version/offsets/excerpt/hash. Server validates; browser test confirmed exact dizziness source highlight. | Dizziness → View evidence | Integrity errors are withheld rather than repaired automatically. |
| PASS | Conflict precedence/review | Earlier AI “stopped metformin” remains; later clinician clarification is authoritative and superseding. Typed conflicts enter review state. | Sarah Aug 23/24 entries | Detection is narrow: allergy polarity, medication status, dosage/frequency. |
| PARTIAL | Patient Voice Capture bonus | Patient-specific synthetic ready/recording/paused/processing/review UI with plain-language draft and explicit no-audio copy. | Patient → Capture consultation | No microphone, audio upload, STT, or persistence to the care record. |
| PARTIAL | Clinical/staff Voice Capture bonus | Current patient/active user binding, synthetic speaker preview/transcript, options, structured draft, provenance preview, review gate; clinician synthetic text reaches real `/api/scribe`. | Record consult; Sarah/Daniel binding verified | No real recording, diarization, noisy-audio processing, multilingual STT, or ambient listening. |
| PASS | Latency P95 ≤ 300 ms | Real session/cookie, 15 warmups, 100 measured production requests, hard failure on non-200. Final P95 268.50 ms. | `scripts/benchmark-glance.mjs` | P99 322.75 ms is reported but not a challenge gate. |
| PASS | Synthetic data and privacy | Five visible synthetic patients plus hidden QA-0001; no real PHI or third-party dataset. Pre-provider redaction and clean metadata-only audit. | Patient directory; PHI redaction demo | Prototype redactor is deterministic, not a certified clinical DLP system. |
| PASS | Required Python micro-tests | Exact filenames retained for RBAC, revisions, provenance, concurrent edits, and bonus learning; live suite 17/17. | `tests/` | Requires configured Supabase/live target. |
| PASS | Concurrent edits | Independent clinician/staff sections update; stale same-section write returns deterministic 409 with current/attempted versions. | `test_concurrent_edits.py` | Section-level optimistic concurrency, not CRDT. |
| PASS | Deliverable: working Git repository/history | Public GitHub origin with meaningful history preserved. Pre-audit `main` matched `origin/main`. | GitHub repository | Final docs commit must be pushed after this audit. |
| PASS | Deliverable: evaluator README | Concise first-screen value proposition, live demo, video placeholder, brief/PDF/audit links, setup, security, runtime, tests, performance, and limitations. | Repository root | Demo video URL requires manual replacement. |
| PASS | Deliverable: 2–3 page Technical Brief | Evaluator-oriented source covers thesis, scoring, provenance, abstention, conflicts, release, runtime, architecture, benchmark, voice, and trade-offs. | `docs/TECHNICAL_BRIEF.md` | PDF pagination is separately rendered and verified. |
| PASS | Deliverable: attribution | Significant direct libraries, purpose/license, hosted services, deterministic provider, development tool, and original assets listed. | `ATTRIBUTION.txt` | Transitive package inventory is represented by the lockfile, not duplicated. |
| PARTIAL | Deliverable: demo video | Product-led 5:25 script and precise shot list prepared. | `docs/DEMO_SCRIPT.md`; `docs/DEMO_SHOT_LIST.md` | Recording/upload/link insertion is manual. |

No explicit core original-brief requirement is wholly **MISSING**. The PARTIAL items are documented implementation boundaries, not concealed claims.

## Safety and 48-hour hint alignment

### Extraction, grounding, abstention

The implemented path is `raw source → structured assertion → critical-token grounding → display wording`. Grounding evaluates medication identity, numbers, dose, units, frequency, laboratory values, negation/polarity, allergy, reaction, and medication status. Adversarial tests reject 500→1000 mg, twice→once daily, HbA1c 7.3→8.3, denied→asserted symptoms, and no-allergy→allergy. Missing/invalid spans, token mismatch, or insufficient semantic support abstain; supported contradictions become Needs Review.

### Risk versus importance

Risk is safety severity if true. Importance is workflow attention now. A deterministic safety floor is applied independently from bounded learned workflow ordering. Critical/risk ≥ 0.9 findings remain surfaced; Dismiss is rejected at API/database level and the UI offers Acknowledge. **Learning adapts workflow ordering, never clinical truth or deterministic safety risk.**

### Trust states, not decorative confidence

The UI contains no self-reported confidence percentage or arbitrary Medium/High confidence badge. AI Suggested, Clinician Confirmed, Clinician Rejected, Conflict Detected, Needs Review, and Superseded describe observable provenance/review states. This avoids implying model calibration that has not been established.

### PHI redaction

Before provider processing, deterministic contextual rules redact patient, clinician/staff, and family names; titled and CJK names; ID; phone; email; DOB; address/multiline address; structured JSON/key-value fixtures; and combined PHI. Tests preserve medication, dose/frequency, HbA1c/laboratory values, and non-identifying dates. A false negative is a privacy failure; a false positive is a clinical-accuracy failure because it can remove relevant context.

### Patient release boundary

`release_state` supports `internal`, `review_required`, `approved`, and `released`. Patient RLS requires actual `released` state plus ownership, patient visibility, non-AI entry type, and a safe trust state. Live tests allow the released QA record and deny another patient, internal, AI Suggested, Conflict Detected/Needs Review, raw AI, internal comments, and historical internal revisions. Enforcement exists at both the application layer and PostgreSQL RLS layer.

## Runtime `/api/scribe` audit

Verified code/test sequence:

1. Supabase session authentication.
2. Clinician role and patient/clinic scope authorization.
3. Contextual PHI redaction before provider invocation.
4. `deterministic-clinical-v2` provider.
5. Structured output/schema validation.
6. Critical-token and exact-span grounding.
7. Narrow typed conflict detection.
8. Deterministic risk-floor application.
9. Abstention / Needs Review partition.
10. Internal or review-required persistence.
11. Immutable provenance creation.
12. Metadata-only audit.

No external LLM is used. The deterministic provider makes the evaluated safety pathway reproducible and demo-safe.

## Collaboration and Undo audit

| Mutation | Persistent behavior | Undo behavior | Audit result |
|---|---|---|---|
| Accept / Dismiss / Pin | PostgreSQL function updates highlight/learning | Restore previous status/pin via compensating restore | PASS |
| Safety Acknowledge | Records review; signal 0 | Restore previous state | PASS |
| Resolve/unresolve comment | Persistent resolution state | Restores previous state | PASS |
| Comment creation | Persistent comment | Undo resolves the new comment; it does not delete it | PARTIAL but honest |
| Task status | Persistent Open/In Progress/Done | Restores previous status | PASS |
| Task assignment | API accepts owner change | No current UI assignment control/Undo | PARTIAL |
| Treatment plan edit/revert | New immutable version and audit | New compensating version; no deletion | PASS |

## Production UI and responsive audit

Browser inspection was performed on the canonical production application with explicit viewport emulation. No screenshots are claimed; the browser screenshot endpoint was unavailable, so validation used DOM snapshots, element bounds, interaction results, and document overflow measurements.

| Viewport / role | Result |
|---|---|
| 1440×900 clinician | No page horizontal overflow; Sarah identity, 5 milestones, 3 priorities, context rail, timeline, and actions present. |
| 1280×800 clinician/admin/patient | No page horizontal overflow; admin oversight and patient family rail/consent prototype verified. |
| 834×900 clinician/admin | No page horizontal overflow; tablet hierarchy remains usable. |
| 390×844 clinician/patient | No page horizontal overflow; patient experience and capture entry usable. Longitudinal ribbon intentionally scrolls horizontally within its own container. |
| 390×844 drawers | Edit drawer fits. Collaboration drawer has a settled 18 px transformed right edge beyond the viewport while the document stays non-scrollable; marked PARTIAL. |

Interaction verification:

- Demo and Viewing-as menus are mutually coordinated; opening one closes the other.
- Both chevrons measured at 0 px vertical-center delta.
- Role choice auto-closes and changes the real signed-in view.
- Patients → Sarah/Daniel → Record consult works.
- Sarah speaker fixture names Sarah; Daniel fixture names Daniel and contains no Sarah speaker.
- Dizziness View evidence navigates to the Patient Session and exact phrase.
- Patient View excludes internal Glance/timeline/trust details and exposes only released plain-language care.
- Admin is oversight/read-only; staff shows care-coordination emphasis without clinician edit controls.

## Signature interactions

| Interaction | Implemented | Perceptible/distinctive | Clinical appropriateness |
|---|---|---|---|
| Evidence Thread | Yes: direct source/version/span with temporary exact-text mark | Clear through View evidence and source-target morphology | Supports verification without a generic modal. |
| Trust Morphology | Yes: restrained shapes/labels for AI, confirmed, conflict, superseded, and safety floor | Visible without decorative confidence | Neutral, status-driven, and non-alarmist. |
| Longitudinal Ribbon | Yes: five Sarah milestones with date/title and direct navigation | Distinct compact memory map | Helps orient without becoming a chart/dashboard. |

## Synthetic-data and final visible-state audit

- Sarah remains the rich canonical story with exactly 3 clinician priorities and 5 clinician milestones.
- Current treatment plan is Version 2; two care-team comments remain open; renal follow-up is Open and assigned to Nurse Alice Wong.
- Sarah's three priorities are present; no rich-demo item is dismissed.
- Daniel, Farah, Jason, and Mei remain coherent visible mini-stories in the patient directory.
- QA-0001 is absent from visible patient navigation.
- Live tests mutated QA-0001 only. Cleanup removed 4 derived QA highlights, retained 28 immutable QA drafts plus audit history, and touched no visible demo patient.

## Security, repository, and dependency audit

- `.env.example` is the only tracked environment file and contains blank placeholders plus synthetic demo emails.
- `.env.local`, `.venv`, `node_modules`, `.next`, build output, logs, and key/certificate patterns are ignored.
- Current tracked content and practical full-history scans found no GitHub/OpenAI/Supabase token signature, service-role assignment, Vercel token, or private-key block.
- No real patient data or private personal credential was found.
- Direct dependency licenses were verified from installed package metadata; attribution now reflects actual bundled image assets.
- No security exclusion/remediation was necessary during this pass.

## Final validation results

| Gate | Exact result |
|---|---|
| Clean install | `npm ci --registry=https://registry.npmjs.org` - 369 packages installed; 370 audited; 0 vulnerabilities |
| npm audit | Included in clean install; 0 vulnerabilities |
| Lint | `npm run lint` - PASS |
| Typecheck | `npm run typecheck` - PASS |
| Focused safety | `npm run test:safety` - 23/23 PASS |
| Live production suite | `NIGHTINGALE_BASE_URL=https://nightingale-care-note.vercel.app ... npm run test:micro` - 17/17 PASS in 47.07 s |
| Production build | `npx next build --webpack` - PASS; 14 pages/routes generated and all dynamic routes traced |
| Default build note | `npm run build` reached Turbopack but sandbox denied its helper-process port; no source compile defect was reported |
| Final production benchmark | 15 warmups + 100 measured; 100/100 HTTP 200; P50 207.60 ms; P95 268.50 ms; P99 322.75 ms; target PASS |
| Canonical smoke/UI | Production loaded and all audited role/interaction flows above passed |

The first benchmark attempt ended without percentiles after a transient TLS `ECONNRESET`; the completed retry above is the only final measured result used in documentation.

## Genuine gaps discovered

1. No seeded AI nurse-consult summary despite the brief naming all three AI interaction types.
2. Reply is mention-prefilled follow-up, not a nested threaded reply.
3. UI exposes task status but not owner reassignment, even though API/RLS support owner updates.
4. Mobile collaboration drawer's transformed edge extends 18 px beyond 390 px viewport.
5. Demo video is not yet recorded/uploaded; its README/email URL remains a placeholder.

No product code was changed in this frozen pass. The gaps are documented instead of being expanded into another development cycle.
