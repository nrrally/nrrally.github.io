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

## 2026-11-08: local season-wide getting-started guide

- Local work based on `b818767`; fetched main at `0bc94e2` includes independent SEO
  changes that overlap entry HTML, browser tests and recovery/release documentation.
  No push, PR, deployment, Firebase or provider write is authorized by this request.
  Reconcile the then-current main and revalidate before any separately authorized release.
- The database-independent guide now introduces the whole season and a general event
  journey, without named event examples, specific fees or unusual event procedures.
  It keeps spectator safety, the neutral National/Regional comparison, entry versus
  start and championship eligibility, separate NR rounds on some two-day weekends,
  official links and independence disclosures. Routes and topic anchors are unchanged.
- Removed the visible guide-edition/check-date notice and header badge at user request.
  Maintainer metadata remains 2026, checked 8 November 2026; dated source labels and
  current-regulations guidance remain. No newer season's rules were verified or implied.
  Review actual applicable sources annually; this local copy does not establish current
  eligibility or replace official documents.
- Coordinated query versions are `guide-1` across public, admin, disclaimer and privacy
  entry points. No data migration, scoring, import, Auth, notice or analytics contract
  change. Already-open tabs are not upgraded; retire old admin tabs before new data.
  A compatible prior code release can be restored separately; rollback does not restore data.
- Validation: 12 guide/season synthetic unit tests, responsive public theme/browser tests,
  and synthetic admin-access, analytics and rally-notice browser regressions passed.
  Browser requests were intercepted/mocked; no live data, Auth, deployed rules or real
  analytics were exercised. Annual review and any subsequent authorized release remain
  separate work.

## 2026-11-08: authorized season-readiness release

The user subsequently authorized deployment: **"you can push them live."** This
supersedes the local-only scope of the historical preparation entries below for
code/documentation release only. It does not authorize Firebase data/settings/rules
writes, a new season, a PR, or a provider configuration change.

Pre-push checks: clean reviewed branch at `8a9f987`, remote main still
`6f83f22f517996ed27950f68d67383106f6fc790`, no divergent remote commits.
The approved signed-in release account's identity and repository push permission
were verified privately; credentials remain command/process-scoped.
Release uses a normal non-force push of the reviewed commits and this record to
`origin/main`, which Pages serves at repository root on `nrrally.co.za`.

Scope and compatibility: the two reviewed local commits below, coordinated
`season-1` assets, unchanged entry/AI/notice/analytics contracts and 2026 guide edition.
No data migration, database publication, DNS change or scoring change is required.
Affected architecture/schema/lifecycle/recovery/testing docs are included in the push.
Prior validation: 51 synthetic units, timezone checks and responsive public browser
regressions passed; import/notice/analytics/admin-access suites also passed during
preparation. No real-data/private runtime fixtures or live Auth/rules verification.

Deployment verified for code release
`12503221d3b0cf0575026cae6169e7e2e34520dc`: Pages reported that exact commit built,
all 19 public/admin/static assets matched their pushed Git blobs byte-for-byte,
and HTTP/www redirected to canonical HTTPS. Live UI smoke used synthetic intercepted
Firebase responses for populated 2026, calendar-only 2027, unknown-date card/detail,
guide reference edition and signed-out admin shell. Google Auth SDK requests were
deliberately blocked; actual sign-in and deployed rules were not exercised.
No Firebase writes/settings changes or analytics collection occurred.
Pre-release synthetic units were rerun: all 51 passed.

This documentation-only follow-up records that verified deployment and updates the
recovery entry point before its own normal push to main. Runtime/data/contracts are
unchanged from the verified code release; no additional permission or migration is
required. Its final commit must also be checked against Pages and live asset contents
after pushing; report the final SHA in the release handoff rather than embedding a
self-referential commit hash here.

Retire old admin tabs or hard-refresh before future edits; already-open pages do
not automatically upgrade. Private real-data fixtures, live Auth/rules and future
GA provider configuration remain outside this verification.

## 2026-11-08: local season-rollover readiness (historical preparation)

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

## 2026-11-08: local review follow-up (historical preparation)

Preserves local commit `280bce6` as the preceding commit; no amendment or remote changes.
Removes stray separators for absent round days and duplicate unknown-date labels on
calendar cards/detail pages, retaining valid calendar statuses. Tightens calendar-only
Home and guide-edition text and removes repetitive Info intro subtext; selected-year
context, source/safety content and the 2026/nonverified-for-other-seasons warning remain.

Document dates are supplied strings in the AI contract even though the manual editor
offers a date input. Info now formats valid ISO source dates but preserves escaped
free-form/invalid supplied text and omits the prefix for absent dates. Strict round
schedule/date-status validation is unchanged. Added focused unit/browser regressions.
No scoring, data contract, analytics, active-notice, guide edition or live state changes.
Asset version remains `season-1` within this unpushed local release.

Follow-up validation: all 51 synthetic units passed, including source-date preservation
and single unknown-date labels; all seven readiness tests passed in Honolulu and
Kiritimati timezones. The public responsive browser suite passed, including missing-round
navigation, concise guide warning and existing populated-season/entry behavior.
JavaScript syntax and whitespace checks passed. All browser data/requests were mocked.
No push/deployment/live data change is authorized or performed.

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
