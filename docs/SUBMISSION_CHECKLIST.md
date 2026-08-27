# Nightingale Submission Checklist

## Repository

- [ ] GitHub repository is Public: <https://github.com/Alan22886/nightingale-care-note>
- [ ] Default branch is `main`
- [ ] Final documentation/audit commit is pushed and `main` matches `origin/main`
- [x] README is evaluator-readable and visible at repository root
- [x] `.env.example` contains placeholders only
- [x] No secret, `.env.local`, credential, real PHI, build output, or virtual environment is tracked
- [ ] Final working tree is clean after PDF/commit verification

## Live demo

- [x] Canonical URL works: <https://nightingale-care-note.vercel.app>
- [x] No evaluator authentication blocker
- [x] Clinician Sarah Glance, Why this, evidence, voice, and Identity & Access work
- [x] Staff action-oriented Sarah view works
- [x] Patient Sarah experience, family prototype, and Capture consultation work
- [x] Admin oversight and Identity & Access work
- [x] Role switching and menu coordination work
- [x] Sarah → Daniel patient-specific Record consult binding works
- [ ] Recheck canonical URL logged out/incognito immediately before sending

## Technical Brief

- [x] Final Markdown source exists: `docs/TECHNICAL_BRIEF.md`
- [x] Final print-ready PDF exists and opens correctly: `output/pdf/TECHNICAL_BRIEF.pdf`
- [ ] Repository links to both source and PDF resolve after push
- [ ] Attach PDF to submission email or provide an evaluator-accessible link

## Demo video

- [ ] Record the 4–6 minute product-led demo
- [ ] Review audio, cursor visibility, pacing, and no-secret exposure
- [ ] Upload as public/unlisted evaluator-accessible video
- [ ] Verify video logged out/incognito
- [ ] Replace README Demo Video placeholder with final URL
- [ ] Replace submission email Demo Video placeholder with final URL

## Attribution

- [x] `ATTRIBUTION.txt` exists
- [x] Significant direct libraries, purposes, and readily verified licenses are listed
- [x] Original bundled assets and external hosted services are identified

## Testing and performance

- [x] Clean `npm ci` - 0 vulnerabilities
- [x] Lint - PASS
- [x] Typecheck - PASS
- [x] Focused safety tests - 23/23 PASS
- [x] Production Supabase/RLS/persistence tests - 17/17 PASS
- [x] Production webpack build - PASS
- [x] Production benchmark - P50 207.60 / P95 268.50 / P99 322.75 ms / 0 failures
- [x] QA cleanup removed transient derived highlights; visible patients untouched

## Submission email

- [x] Recipient: `ira.kumar@ntngale.com`
- [x] CC: `frank.ng@ntu.edu.sg`, `carrene.teo@ntu.edu.sg`
- [x] Subject: `Nightingale 72HR Build — Alan Chu`
- [x] GitHub URL included
- [x] Live Demo URL included
- [ ] Demo Video URL inserted
- [ ] Technical Brief PDF attached or linked
- [ ] Final link/attachment check completed before Send

## Final visibility and send

- [ ] Open GitHub repository logged out/incognito
- [ ] Open Vercel canonical URL logged out/incognito
- [ ] Open video logged out/incognito
- [ ] Open/download Technical Brief PDF from its submitted location
- [ ] Send before **Friday, 28 Aug 2026, 5:30 PM SGT/MYT**
