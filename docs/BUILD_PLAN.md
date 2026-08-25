# Build Plan Status

The first working prototype was a React/TypeScript Cloudflare Worker site with D1 and a private Sites deployment. It remains preserved at the pre-migration checkpoint below. The active migration replaces its runtime authority with native Next.js, Supabase Auth, Supabase PostgreSQL, and PostgreSQL RLS for deployment on Vercel.

Current validation: lint, TypeScript, Python test compilation, and the native Next.js production build pass. The Supabase-backed micro-tests are implemented but cannot be reported as passing until migrations and seed data are applied to a real project. The private Sites build remains a fallback, not the final submission deployment.

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
- **Tests/benchmark/docs:** Python tests target the local demo APIs and cookie; benchmark sends the demo cookie; README, Technical Brief, Demo Script, and Attribution describe the prototype stack.

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
- Stage E — test migration complete and pushed; live database/RLS/persistence execution is blocked on Supabase project configuration.
- Stage F — blocked before deployment: no Supabase project values or Vercel connection are configured.
- Stage G — intentionally pending until the Supabase/Vercel deployment is verified; the fallback D1/Sites runtime has not been removed.
- Stage H — architecture and setup documentation updated; final public URL and validation evidence remain pending.
