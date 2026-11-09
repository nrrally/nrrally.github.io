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

## 2026-11-08: authorized season-wide getting-started guide release

- Local work based on `b818767` integrates final SEO main `c06c390` locally, preserving
  metadata, icons, crawler files and release records. The user explicitly selected
  **"Push the guide live."** This authorizes a normal code/documentation push to
  `origin/main` and Pages deployment only; no PR, Firebase write, settings/rules change
  or provider configuration change is authorized.
- Before release, fetched main and verified `c06c39079c40c7c4d2351702a7f7a4bea8ed080d`
  is an ancestor of the reviewed local branch. The authorized release identity and
  repository push permission were verified privately. Recheck main immediately before
  pushing; no force push. Record actual deployment separately after verifying Pages.
- The database-independent guide now introduces the whole season and a general event
  journey, without named event examples, specific fees or unusual event procedures.
  It keeps spectator safety, the neutral National/Regional comparison, entry versus
  start and championship eligibility, separate NR rounds on some two-day weekends,
  official links and independence disclosures. Routes and topic anchors are unchanged.
- The National/Regional comparison names the class structures and explains fuel
  distinctions, verified against 2026 NR SSRs 3 and 11.3 and National SSRs 910,
  911 and 912. The 2026 NR SSRs state National rules prevail in a conflict; readers
  are directed to both applicable SSRs and a technical official, not a blanket eligibility claim.
- Removed the visible guide-edition/check-date notice and header badge at user request.
  Maintainer metadata remains 2026, checked 8 November 2026; dated source labels and
  current-regulations guidance remain. No newer season's rules were verified or implied.
  Review actual applicable sources annually; this local copy does not establish current
  eligibility or replace official documents.
- Coordinated query versions are `guide-1` across public, admin, disclaimer and privacy
  entry points. No data migration, scoring, import, Auth, notice or analytics contract
  change. Already-open tabs are not upgraded; retire old admin tabs before new data.
  A compatible prior code release can be restored separately; rollback does not restore data.
- Validation after integrating SEO main: 23 guide, season, SEO, analytics and notice
  synthetic unit tests, plus responsive public and admin-access browser regressions passed.
  Synthetic analytics and rally-notice browser regressions also passed before integration.
  Browser requests were intercepted/mocked; no live data, Auth, deployed rules or real
  analytics were exercised. Annual review and any subsequent authorized release remain
  separate work.

Deployment verified at `39f7aef64777ceedabbd1712e8d056a8159e8b56`: Pages built that
exact commit, 20 deployed runtime/crawl/brand files matched Git blobs byte-for-byte,
and HTTP/www redirected to canonical HTTPS. Live guide smoke covered 320/1440 widths,
light/dark, topic expansion, 2026 class/fuel and season content, independence disclosure,
absence of the edition banner and retained SEO canonical. Firebase requests were
intercepted with synthetic responses and all other external requests blocked; no real
analytics, private data, live authentication or deployed rules were tested.

This documentation-only follow-up records the verification and changes no runtime,
data, contract or provider behavior. Recheck main before its normal push; verify its
final Pages build afterward and report its SHA in the handoff.

## 2026-11-08: small authorized SEO release

Approval: the user requested conservative optimization of existing content and said
**"You can just push those changes live if they're tiny."** This release is confined
to static HTML metadata, two crawl-discovery files and the existing original favicon,
with synthetic regressions and recovery/testing documentation. Normal non-force push
to `origin/main` (Pages root) is within that small-release scope. No PR, Firebase
write/settings/rules, Analytics/Search Console/provider change, content campaign,
routing/hosting redesign or future-season creation is included or authorized.

Reviewed base: fresh remote main and latest built Pages SHA
`b8187675d983bb8c8e9dd67f8a4c468ccfb703af`. The approved signed-in release identity
and repository push permission were verified privately; credentials are process-scoped,
with no global credential/account change. Recheck main immediately before pushing.

Changes: one static canonical on each public document (root, privacy and disclaimer),
descriptive evergreen initial home title, homepage WebSite name/root URL microdata
without executable JSON-LD or CSP changes, and a stable 192x192 PNG fallback rendered
directly from the existing NR SVG monogram. The SVG remains the browser favicon on
all four shells; the formerly unused 64x64 PNG with a different motif is replaced.
Existing descriptions were already useful and are retained. Admin already had
`noindex, nofollow`; it remains crawlable so that directive can be read.
`robots.txt` advertises a sitemap containing only the three canonical public documents.
No fragment URLs, fake modification dates, event/result rich-data claims, hidden
keywords or AI-specific files are added.

Compatibility/recovery: visible page content, responsive/themes/guide, rendered route
titles, source/reference edition (2026), scoring, data/Auth/notice/analytics behavior
and all contracts are unchanged. No migration or shared runtime/CSS change; coordinated
asset query version remains `season-1`. A code-only rollback to the reviewed base restores
the old metadata/icon and removes crawl files without touching data. Recovery/testing
docs explain static canonicals, crawlable noindex and favicon reproduction.

Validation: 16 targeted synthetic units passed via
`node --test tools\tests\seo.test.js tools\tests\getting-started.test.js tools\tests\analytics.test.js tools\tests\rally-notice.test.js`.
`site-theme-e2e.js` and `admin-access-e2e.js` passed with intercepted synthetic
Firebase/Google requests, including responsive 320/390/768/1440 layouts, light/dark,
hash navigation, reference guide, error/unconfigured states, no-JS public documents
and signed-out/non-admin/admin simulation. New assertions cover static canonical and
microdata persistence, PNG declarations/dimensions, sitemap/robots and retained noindex.
The PNG was rendered and visually checked as the original NR monogram. Existing
external Node/Playwright and Edge were reused; no dependency was added.
The first robots unit assertion needed CRLF normalization for Windows; all final
selected tests passed. No live database writes or analytics were sent.

Primary guidance checked 8 November 2026:
[favicons](https://developers.google.com/search/docs/appearance/favicon-in-search),
[site names](https://developers.google.com/search/docs/appearance/site-names),
[JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[AI features](https://developers.google.com/search/docs/appearance/ai-features).
Google requires no special AI markup/files or extra AI Overview/AI Mode optimizations.

Limitations: hash-route results/profiles/guide topics are not reliably separately
crawlable landing pages. This is deliberately not presented as solved by canonicals
or a sitemap; a larger URL/hosting change needs separate approval. Google decides
indexing, rankings, site names and favicon display; recrawling can take days/weeks.
No Search Console inspection, ranking/Core Web Vitals certification, real Auth/rules,
private fixture or actual Google runtime verification was performed by this release.
After pushing, verify Pages SHA, canonical HTTPS and live bytes/UI separately and
record deployment evidence, not merely successful git transport.

Deployment verified at `0bc94e2eb8a8eab372b33142c3c0dd29b8ff8d59`: Pages reported that
exact SHA built without error. All 20 runtime/crawl/brand files matched pushed Git
blobs byte-for-byte, including root/index, all four shells, PNG, robots and sitemap;
HTTP and www redirected to canonical HTTPS. Live browser smoke at 320/1440 px in
light/dark themes retained Home/standings/round graph/guide/missing-route rendering,
root canonical/microdata, disclosure and no public noindex. PNG decoded at 192x192.
Static privacy/disclaimer content/canonicals remained available without JavaScript;
admin retained its noindex and independent disclosure. Firebase was intercepted with
synthetic responses/config; Auth SDK and analytics were blocked. No live sign-in,
private data, database mutation or analytics collection was exercised.

This documentation-only follow-up records verified deployment here and in recovery
before its own normal non-force main push. Runtime, crawl metadata/icon, data,
contracts and operational behavior remain unchanged from `0bc94e2`; no new migration
or provider change. Check fresh main before pushing and verify the final documentation
SHA against Pages/live files afterward. The final SHA is reported in the handoff rather
than embedding a self-referential commit hash in this record.

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

## 2026-11-09: local RallyeSport foundation and header logo preparation

This is an isolated local implementation only. The user expressly prohibited pushing,
opening a PR, deployment, live-data publication, Firebase/settings/rules changes and
external-provider writes. No permission to release this code is implied. The worktree
branch is `mimullan-microsoft-rallyesport-foundation`, based on `f050312`; no live
season event or result records were added.

The optional `season.rallyesport` model now supports independent RS events and official
classifications, RS2/RS4 event points and season tables, the 2026 Rallysprint SSR
profile, a season-scoped person-level “Non-Scoring RS Member” toggle, separate event
invitation exclusion, a manual admin editor using the normal staging/review/publish
path, public RS tables/routes, and optional explicitly mapped overlays on NR graphs.
RS-only events need no NR calendar entry. Shared stage times can be copied only after
explicit round/stage/car/crew review; stored times are snapshots with provenance and do
not follow later NR edits. The overlay uses only RS rows and never feeds NR statistics.
No NR results, statuses, classes, penalties, points, eligibility or totals are imported
into RS by default. Existing seasons without the optional field remain valid; there is
no migration. Contract version is 1 and coordinated asset query strings are
`rallyesport-1`.

The rules profile is based on the full official [2026 MSA RallyeSport Association
Club Standing Supplementary Regulations — Rallysprint, Version 1, issued 9 July
2026](https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf).
The printed title and SSR 1.2 set its scope; it is not inferred from the filename. The
user confirmed applicability to the 2026 club classifications at Legends, Ermelo and
TRAC, and to the independent June Round 1 classification despite the July issue date.
This event-specific confirmation does not apply the rules to other events or years.
The implementation uses the SSR 6.1.1–6.1.3 class points for overall and
class tables, excludes invitational entries, and applies the 15-starter event minimum.
By user direction, people are assumed paid up unless individually toggled non-scoring;
this is an assumption, not verified membership. SSR 7.2's five-round double-pointer
exception is supported only with one bulletin-backed event; double-points declarations
at other round counts are withheld pending clarification. A five-round double-pointer
also requires separate ISO event and bulletin dates that pass the SSR's 14-day notice
check. No future-year or other competition rule profile is added.

Read-only inspection of the supplied June result sheet identified a standalone final
classification with two stages, separate overall/class positions, a TEST row and DNF
rows with non-prefix stage observations. No competitor rows or event calendar data were
copied into this repository, and the sensitive membership workbook was not inspected.
Synthetic coverage now recognizes the source's `FINAL RESULTS` heading without
rewriting it, preserves TEST without treating it as DNS/DNF, leaves its scoring and
starter semantics blocked, uses printed class position to score when overall
positions tie across classes, withholds still-tied class scoring positions, and retains
a later DNF observation after a missing earlier stage.

Unresolved limits remain explicit: SSR 7.4 and 7.6 are blank, so DNF points and awards
are not inferred. SSR 7.5 addresses a round despite its championship-ties heading; the
app does not recompute its stage-time tie-break. A still-tied scoring position is
withheld and equal season totals share a displayed rank without a season winner/tie-break.
Unspecified categories and round qualification are not guessed. No November or other
real event data was added.

The user-approved supplied Northern Regions logo is included in the public, admin and
static headers. The original NR `brand.svg` and `favicon.png` remain the favicons; no
official logo favicon or replacement NR artwork is used. Recovery/testing docs and
browser checks are updated, and the asset is source-controlled without modifying
`firebase-config.js`.

Validation: `node --test tools\tests\*.test.js` passed all 71 synthetic unit tests;
targeted RS, season-readiness and original-favicon tests passed; JavaScript
syntax checks passed. `site-theme-e2e.js` and `admin-access-e2e.js` passed with local
browser fixtures and intercepted requests, including RS editor simulation with zero
writes, an RS-only public table preserving TEST/class position/non-prefix times, and
responsive header checks. Browser runners do not contact real Firebase,
Google Analytics or other external providers. No private result fixtures, live sign-in,
deployed rules, real data migration or actual publication was tested. This entry records
local preparation, not release approval or deployment evidence.

### Local RS follow-up corrections (not pushed or published)

The local continuation corrects the implementation boundaries above; it does not
authorize a release. A started DNF earns no RS championship points but counts as a
starter when source evidence or a reviewed non-TEST starter count establishes it. A
no-time DNF is not assumed to have started. TEST rows remain in event results, never
score and do not get a championship class table; if fewer than 15 non-TEST starters are
established and TEST entries could change the SSR 7.3 threshold, scoring stays blocked.
This follows the user-confirmed DNF rule and preserves the unresolved TEST-starter
question. The prior paragraph's statement that any DNF blocks scoring and that TEST
starter treatment is wholly unsupported is superseded by this clarification.

Class scoring now uses one consistent position basis per class: printed class positions
only when complete, otherwise overall positions for every entry in that class. Conflicting
or still-tied order blocks points. The RS graph preserves hundredths for stage metrics and
tooltips, retains independent later-stage observations after gaps, and explicitly treats
RS and NR positions/gaps as separate comparisons; NR calculations are unchanged.

Published scoring snapshots are consumed only at the public boundary; private/admin
calculation recomputes from private eligibility inputs. Provisional in-season tables show
supported completed events and disclose excluded/blocked events, without asserting final
qualification or a champion. Reviewed NR-time reuse previews matched, conflicting,
missing and unmatched rows; it fills blank RS cells only after confirmation, preserving
conflicts and RS-only crews. File-only source evidence is supported without an invented
URL. Backup restore and undo warn about RS data loss/replacement before mutation, profile
merges retain season-scoped RS non-scoring decisions, and demo mode does not imply it can
reconstruct private eligibility.

Validation uses synthetic records and local/mock browser traffic only; it does not read
the sensitive membership workbook, publish real RS results, or contact live Firebase or
analytics. The user-approved private source-result preview remains under session-state
`files` and outside the repository. No code, real result records or private membership
data were pushed, deployed, published, or written to Firebase/providers.

Verification for this continuation: all 79 synthetic Node tests passed; the mocked
admin-access and public site-theme browser suites passed with zero external requests or
database writes. The private local preview rendered five season events and four source
classifications (71 rows), with no remote assets. It produced provisional points only
from the two supported final events; R1's source categories/TEST threshold, R2's
provisional finality, and the unrun R5 remain disclosed and excluded rather than zeroed.
One repeated-name crew-role conflict is retained as unresolved private identity evidence.

### Local RS homepage/calendar and explicit round-number follow-up (not pushed or published)

The local continuation keeps NR as the homepage default and adds section-local keyboard
controls for the driver/co-driver leader cards, driver class leaders, and the home result
cards. RS panels use only RS-derived points and clearly label provisional totals and
blocked events. The full calendar includes RS-only events; a shared NR/RS card is created
only by an explicit `nrEventId`, never by matching names, dates, or array order. Results
cards remain competition-specific, and the home toggle does not alter NR hero statistics,
standings, graphs, or season data. An RS `roundNumber` is optional, positive, unique and
independent of NR numbering.

The private preview now carries the user-confirmed R1-only 2WD→RS2 and 4WD→RS4 mapping.
R1 remains blocked because the documented 14 non-TEST starters are below SSR 7.3's
threshold and the TEST contribution is unresolved; no R1 points are invented. The
private preview shows R1–R5 in the user-supplied sequence, the scheduled 28 November
R5 without results, and a synthetic-only NR + RS badge example. R2–R4 are known shared
weekends, but this preview contains no NR event IDs, so it displays them separately
rather than guessing a merge. All actual source-result data and the preview remain under
session-state `files`, outside Git. The membership workbook was not opened or used.

The coordinated cache version advances to `rallyesport-2` across public, admin,
disclaimer and privacy shells. Retire old admin tabs before editing. The logo integration
from local commit `3e806da` remains in this branch; original NR SVG/PNG favicon assets are
preserved. No schema migration is required because RS is an optional season subdocument;
the homepage projection reads the existing published RS scoring snapshot while admin
continues recalculating from private working inputs. No Firebase, History, rules,
settings, external provider, live data, deployment or publication operation occurred.
This local preparation does not approve any push.

Validation uses synthetic data and mocked/intercepted browser traffic:
`node --test tools/tests/*.test.js` passes all 81 tests, including RS round-number
validation; `site-theme-e2e.js` verifies RS snapshot consumption,
NR-default panels, independent RS cards, explicit combined-card badges and no-NR access at
mobile/desktop widths in light/dark themes; `admin-access-e2e.js` passes with no writes.
The private file preview's interactive leader/results toggles were also browser-checked
from `file://` with zero external requests. No real deployment, Firebase rules, live Auth,
or public data publication was tested.
