# Build Plan Status

The first working prototype was a React/TypeScript Cloudflare Worker site with D1 and a private Sites deployment. It remains preserved at the pre-migration checkpoint below. The active migration replaces its runtime authority with native Next.js, Supabase Auth, Supabase PostgreSQL, and PostgreSQL RLS for deployment on Vercel.

Current hardening adds forward-only release-state/RLS enforcement, a deterministic `/api/scribe` runtime, critical-token grounding, contextual redaction, typed conflicts, safety-floor acknowledgement, and server-side provenance verification. Final production migration, test, benchmark, and deployment evidence is reported from the completed release rather than assumed from an earlier checkpoint.

## Pre-Supabase working checkpoint

- Commit: `01aacba388d1c062dc4285d76f25631c47d5da0a`
- GitHub `origin/main` was verified at the same commit before migration.
- Working tree was clean and the existing private Sites deployment remained available as a fallback.
- This commit and all earlier prototype history must remain unchanged.

## Supabase / Vercel migration

The submission architecture is now fixed as Next.js + TypeScript on Vercel, backed by Supabase Auth and Supabase PostgreSQL with Row-Level Security. The existing product behavior and domain logic remain the migration baseline; this is an infrastructure replacement, not a redesign.

### Dependency audit

- **D1:** `db/index.ts`, `db/schema.ts`, `db/env.d.ts`, `drizzle.config.ts`, `drizzle/`, the Cloudflare binding in `vite.config.ts`, and Drizzle/D1 packages.
- **Isolate-local authority:** `lib/server/demo-store.ts`, `lib/server/importance-state.ts`, and API routes for entries, audit, and importance.
- **Sites identity:** `lib/server/demo-auth.ts`, `app/chatgpt-auth.ts`, the `nightingale_demo_identity` cookie, and the role-switch/session endpoint.
- **Sites hosting/runtime:** `.openai/hosting.json`, `vite.config.ts`, Vinext, Wrangler, Cloudflare plugins/types, Sites plugin, and Vinext package scripts.
- **Client-local mutations:** `app/workspace.tsx` currently owns comments, task status, revisions, feedback, and seeded timeline state in React state; these must move behind authenticated Supabase-backed APIs.
- **Historical tests/benchmark/docs:** the pre-migration benchmark used an obsolete demo cookie; the active benchmark now authenticates through `/api/session` and reuses the Supabase session cookie.

### Staged migration plan

1. Add native Next.js tooling, Supabase clients/configuration, PostgreSQL migrations, RLS policies, transactional database functions, and repeatable seed assets.
2. Replace all authoritative local repositories with Supabase-backed repositories and server routes.
3. Replace demo cookies with Supabase Auth sessions; retain role switching only through a server-only demo-account exchange.
4. Connect the existing UI interactions to authenticated APIs without changing the visual/product design.
5. Run real persistence, RLS, authorization, revision, concurrency, learning, redaction, ranking, lint, typecheck, and build validation.
6. Deploy through Vercel and verify the public application before removing D1/Sites runtime coupling.
7. Remove obsolete runtime dependencies and update every deliverable to the final architecture.

### Migration gates

- No in-memory store may remain authoritative.
- All clinical and collaboration mutations must survive refresh, process restart, and deployment-instance changes.
- RLS is the primary clinic/role/data-visibility enforcement boundary; server checks supplement it.
- Editing and reverting use PostgreSQL transactions with expected-version checks and metadata-only audit writes.
- Feedback and learned multipliers persist per clinic and remain bounded to 0.80–1.35.
- The existing Sites deployment is preserved until the Supabase/Vercel application is verified.

### Stage status

- Stage A — complete and pushed: Supabase clients/config, relational migrations, RLS policies, transactional functions, repeatable Auth/data seed.
- Stages B–D — complete and pushed: Supabase repositories, Auth sessions, protected API routes, and existing UI interactions wired to persistent APIs.
- Stage E — expanded: focused unit and live QA-only tests now cover runtime grounding, release RLS, contextual redaction, conflict detection, provenance fail-closed behavior, internal scribe persistence, and safety floors in addition to the original suite.
- Stage F — complete: Supabase environment configuration and the canonical Vercel production deployment are verified.
- Stage G — complete: obsolete D1/Sites runtime files and dependencies were removed only after the production RLS/persistence suite passed.
- Stage H — complete: architecture, setup, demo, attribution, public URL, and validation evidence reflect the final deployment.

### Production verification — 26 Aug 2026

- Canonical URL: <https://nightingale-care-note.vercel.app>
- Vercel deployment: `dpl_BHNFg6cscHStLjAxNbQ6ceCCRm2f`
- Public smoke check: HTTP 200, HTML response.
- Live suite: 13/13 tests passed against the deployed application and linked Supabase project.
- Security evidence: real Supabase Auth sessions, cross-clinic RLS denial, patient visibility restrictions, author-role protections, persistent mutations, deterministic 409 version conflicts, bounded clinic learning, and pre-provider PHI redaction.
