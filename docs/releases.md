# Release and recovery records

This ledger is part of recovery, not proof that a release was authorized or deployed.
Code deployment, database publication and provider configuration are different operations.
Update this file **before every push**, together with affected documentation.
After an approved deployment, verify its actual SHA/status and record that separately.
Do not put private History identifiers, account identities, property IDs or backups here.

## Before EVERY push

1. Read [AGENTS.md](../AGENTS.md). Confirm the current request expressly authorizes the
   intended push and destination. A previous deployment approval is not reusable.
2. Fetch the intended remote branch; compare its exact SHA with the reviewed base.
   Inspect working changes, staged diff, new files and commit range. Do not force-push
   over someone else's changes or deploy from an unreviewed branch.
3. Update affected schema, architecture, scoring, UI, administration, lifecycle,
   testing, provider, privacy and recovery documentation. Add/update the release entry
   below even for a documentation-only push. Record unchanged operational scope explicitly.
4. Record validation commands/results and what could not be checked. Verify links and
   examples contain no private data. No test writes/analytics traffic may reach live services.
5. Record contract/cache compatibility and data migrations (or explicitly none),
   guide source edition, manual operational steps and rollback compatibility.
6. Record approval scope and planned destination. Keep credentials process-scoped;
   verify identity and repository permission without exposing tokens.
7. Commit code and documentation together or as a reviewed coherent local series.
   Review `git status --short` and `git diff --cached --check` before the authorized push.
8. For approved deployment, verify GitHub Pages built the intended code SHA; check the
   canonical domain, HTTPS, assets, public routes and admin sign-in. Record actual
   deployment separately; do not confuse a successful push with a successful Pages build.

This is a human/agent release invariant, not a pre-push hook or CI gate. A failed check
must be addressed; there is no automation that can infer approvals or certify private recovery.

## 2026-11-08: local season-rollover readiness (not deployed)

- Verified remote `main` and local starting HEAD:
  `6f83f22f517996ed27950f68d67383106f6fc790`.
  The read-only Pages API reported that same latest built commit, legacy branch
  deployment from `main` at `/`, custom domain `nrrally.co.za`, HTTPS enforced.
- Scope: truthful calendar-only Home/Sources/standings/Crews; suppress empty unknown
  event-entry summaries while retaining evidenced zero/partial/day coverage; strict
  date-only South Africa calendar statuses and accessible missing-round links;
  season-relative Info navigation; explicit bundled guide reference edition;
  manual copied-settings warning; comprehensive recovery and annual lifecycle docs.
- Guide remains reference year 2026, checked 8 November 2026. No new-year rule claims.
  Existing scoring, import policy, Auth, GA startup/privacy and active notice algorithms
  are unchanged. No live settings, data, rules, DNS or provider changes.
- Coordinated asset version: `season-1`; engine entry contract remains 2, AI envelope
  remains version 1, analytics/rally-notice engine contracts remain 1.
  Backup format remains version 1. No migration or new Firestore field required.
- Future rollback: use a compatible v4 release, not v1-v3 bundled-data releases;
  retain current entry-aware/analytics-aware editors. See [recovery.md](recovery.md).
- Validation and review results are recorded below before local handoff.
- Approval: local implementation only. **No push, PR, deployment, live export or publish
  is authorized or performed by this work.** A fictional year in tests is not a live season.

### Validation record

- `node --test tools\tests\*.test.js`: all 50 synthetic tests passed, including DNS-only empty standings.
- `season-readiness.test.js` also passed with `TZ=Pacific/Honolulu` and
  `TZ=Pacific/Kiritimati`; South African midnight, invalid dates and leap dates are covered.
- `node tools\tests\site-theme-e2e.js`: passed, including the mocked future default,
  calendar-only/entry-only/archived navigation, guide edition and 320/1440 light/dark
  additions; existing 390/768/1440/320 guide/route/print/failure coverage retained.
- `ai-import-e2e.js`, `rally-notice-e2e.js`, `analytics-e2e.js`,
  `admin-access-e2e.js`: all passed with synthetic intercepted Firebase/Google requests.
- JavaScript syntax checks, coordinated asset-version unit checks, `git diff --check`
  and local documentation file/heading-link checks passed before handoff.
- Used an external existing Node/Playwright installation and Edge; no package manifest,
  production dependency, CI pipeline, source fixture or provider snapshot was added.
- Did not export/read real sports data, run private real-2026 fixtures, replay a private
  configured GA container, test real sign-in/rules, send analytics, or change any live state.
  Engine/scoring and analytics startup code are unchanged; synthetic populated-2026
  regression is covered. Historical configured-container replay evidence remains in
  testing docs, explicitly snapshot-specific rather than newly verified.

## Historical baseline: 2026-11-08 guide/copy cleanup

The verified deployed base above adds the original Northern Regions newcomer guide and
concise site copy. Guide topics are bundled and independent of database availability.
Earlier compatible work introduced entry evidence, independent disclosures, explicit
active-rally settings, optional privacy-safe GA4 and the global startup suppression fix.
The historical source and test discussion lives in [decisions.md](decisions.md),
[testing.md](testing.md) and [runbook.md](runbook.md); do not infer current stream settings,
database revision, owners or private source availability from that history.

A separately authorized event-metadata update added official entry-list, noticeboard
and spectator-guide links for four 2026 events without scoring changes. The actual
published/working season documents and private History/source register are authoritative;
do not reproduce private revision/account identifiers as timeless repository configuration.
