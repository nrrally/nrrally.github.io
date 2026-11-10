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

## 2026-11-10: authorized unified NR/RS display and loading release

- Based on November 9 RallyeSport main
  `3734d91408d9d3c5504d9e66329f47de0c06f3ee`. Following private preview and the
  graph-discovery correction, the user explicitly said **"I think it looks great - push
  and lets test."** This authorizes committing the reviewed code/documentation,
  a normal non-force push to `origin/main`, Pages deployment and no-write live-site
  checks. Firebase/GCP access, data publication, rules/settings, admin workflows,
  provider changes and the earlier RS database rollout remain excluded.
  Origin is the expected GitHub repository; fresh fetched main and Pages baseline both
  match the reviewed parent. Recheck main immediately before pushing and stop on
  divergence. Release authentication and commit identity are scoped per process/command;
  the user explicitly selected the verified push account's ID-based GitHub noreply identity.
  No global authentication/configuration is changed. Actual deployment is recorded
  separately after verifying the built SHA; this entry alone is not deployment evidence.
- Replaces three homepage switches with one header NR/RS preference, defaulting to NR.
  URL/local storage preserve competition through navigation, refresh, history and season
  changes; legacy result/home links remain supported. Home, standings, calendars,
  crews, profiles and sources are competition-specific. Detailed-result switching uses
  only a unique explicit existing association, otherwise rounds. Empty RS seasons
  never borrow NR data. Resolved RS identities link to RS-only cross-season history;
  unresolved printed names remain visible without fabricated profiles.
- RS uses a blue primary accent and decorative hero track in light/dark, NR remains red.
  Category/series, warning/success colors and logos are unchanged. Public mobile header
  rows accommodate the added control without overlapping the brand; admin layout is
  excluded. Every deliberate NR-to-RS switch shows the accessible welcome with Info,
  Continue, Escape, focus containment/restoration; normal RS navigation/reload does not.
  Getting Started and Info copy and the guide's explicit 2026 reference edition remain.
- RS reuses the full NR graph UI: six metrics, car/class filters, quick selections,
  tooltips, legend interaction, head-to-head bars/table and stage table. Only its own
  stage axes/source field are plotted, including standalone events; old `rs=1` links no
  longer mix series. Existing pure RS parsing is exported and cumulative display values
  are exposed additively; no scorer, scoring policy or official classification changed.
  RS hundredths are retained; missing times/ranks remain missing, cumulative gaps stop
  after missing timing, and official classified Final values are never inferred.
- Initial HTML now contains an accessible loading status before scripts, with loading
  feedback during later asynchronous season/profile reads and explicit error replacement.
  Simple text is intentional; no sprite artwork, dependencies or animation were added.
  Privacy copy discloses the saved competition preference. No analytics runtime behavior
  changed; synthetic pending-tag races use deterministic test gates instead of delays.
- User preview correction: RS graphs existed but home/calendar and legacy result links
  still opened the old classification table, unlike NR. Direct graph-URL tests missed
  that real navigation mismatch. RS cards now say Graph and open it first, as do
  championship event links and bare legacy result URLs. Explicit `/classification` and
  `/stages` views share three tabs, previous/next and round navigation, and retain
  car/metric choices across tabs. Stage times reuse the shared renderer with RS precision.
  Missing timing and printed ranks are explicitly disclosed. No source/scoring change.
  Journey regressions click home/calendar cards for standalone and linked RS events
  at desktop/mobile, plus legacy/listing/profile links, three-tab navigation and
  head-to-head; all pass alongside 93 synthetic units. The visible loopback preview
  was reproduced/refreshed, and its session-only richer fixture's synthetic classified
  totals corrected to match its synthetic times; preview fixture simplicity/inconsistency
  was separate from the table-first production routing bug.
- Compatibility/recovery: `competition-1` cache query versions are coordinated across
  index/admin/disclaimer/privacy. Public pages load `display-context.js` before the app;
  admin does not. No data migration, engine contract version, schema, Auth, administration,
  notice, analytics, database rules or provider configuration change. This deployment
  includes all matching assets/shells; retire old admin tabs before new
  data; existing tabs do not upgrade automatically. Restoring the reviewed base's
  complete code restores the previous presentation without a database rollback.
- Validation: all 93 synthetic Node unit tests and public theme, analytics, rally-notice,
  admin-access and AI Import browser regressions pass. Tests use intercepted fixtures,
  fake collection/authentication where needed and no live writes. Separate loopback
  preview checks cover desktop/mobile NR/RS light/dark, welcome/head-to-head, legal-page
  continuity, primary contrast at least 4.5:1, no overflow/external requests/page errors.
  These checks do not certify every WCAG criterion, deployed services, official source
  truth, private backups, rules or current regulations.
- The pre-release browser rerun exposed an assertion-before-hash-render race after
  clicking Stage times. The test now waits for the destination `/stages` URL and
  intended visible RS text, then asserts actual fastest-time highlighting. No arbitrary
  sleep, removed assertion or production workaround was used. Repeated public browser
  runs and the full release suites pass. A pre-release deployed NR snapshot (standings,
  classification, stage table and graph observations) uses intercepted synthetic data
  for exact post-release comparison; no Firebase/Auth/Google collection is contacted.
- Remaining source boundaries: unavailable timing/printed ranks and unresolved identities
  remain unavailable; source appearances do not establish starts. Blocked/provisional RS
  scoring gates remain in force. With denied storage, app URLs preserve competition;
  persistence across plain static-document links still depends on browser storage.
  Any subsequent unrelated release needs fresh explicit approval, main comparison and deployment checks.

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
user confirmed applicability for the privately reviewed 2026 classification set,
including a pre-issue independent event. Event identities and supporting source records
remain in the private review archive; this event-specific confirmation does not apply
the rules to other events or years.
The implementation uses the SSR 6.1.1–6.1.3 class points for overall and
class tables, excludes invitational entries, and applies the 15-starter event minimum.
By user direction, people are assumed paid up unless individually toggled non-scoring;
this is an assumption, not verified membership. SSR 7.2's five-round double-pointer
exception is supported only with one bulletin-backed event; double-points declarations
at other round counts are withheld pending clarification. A five-round double-pointer
also requires separate ISO event and bulletin dates that pass the SSR's 14-day notice
check. No future-year or other competition rule profile is added.

Review of private source material informed synthetic coverage for independent event
records, separately printed positions, TEST rows, and non-prefix DNF stage observations.
No competitor rows or real event-calendar records were copied into this repository, and
the sensitive membership workbook was not inspected. Synthetic coverage recognizes a
source's final-results wording without rewriting it, preserves TEST without treating it
as DNS/DNF, withholds unresolved scoring, uses one consistent position basis within a
class, and retains later DNF observations after missing earlier stages.

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
analytics. User-approved source-result previews remain under session-state `files` and
outside the repository. No code, real result records or private membership data were
pushed, deployed, published, or written to Firebase/providers.

Earlier continuation verification passed 79 synthetic Node tests and the mocked admin
and public browser suites. The current private source review remains blocked by an
unresolved repeated printed crew name; the actual engine reports that validation error,
withholds scoring for all events, and displays no standings. Source-specific spellings
that are not safely attributable to reviewed people remain unmerged. Technical-check
qualifications, starter-count uncertainty, and provisional source status remain visible
in the private preview. No private result rows are documented here.

### Local RS homepage/calendar and explicit round-number follow-up (not pushed or published)

The local continuation keeps NR as the homepage default and adds section-local keyboard
controls for the driver/co-driver leader cards, driver class leaders, and the home result
cards. RS panels use only RS-derived points and clearly label provisional totals and
blocked events. The full calendar includes RS-only events; a shared NR/RS card is created
only by an explicit `nrEventId`, never by matching names, dates, or array order. Results
cards remain competition-specific, and the home toggle does not alter NR hero statistics,
standings, graphs, or season data. An RS `roundNumber` is optional, positive, unique and
independent of NR numbering.

The private preview retains user-confirmed classification-scoped category mapping and
the supplied independent round ordering. Dates are used only where supported; undated
events remain explicitly undated. The private preview has no real NR result/calendar
data, and shared cards are not inferred without an explicit NR event association. All
actual source-result data and previews remain under session-state `files`, outside Git.
The membership workbook was not opened or used.

The coordinated cache version advances to `rallyesport-3` across public, admin,
disclaimer and privacy shells. Retire old admin tabs before editing. The logo integration
from local commit `3e806da` remains in this branch; original NR SVG/PNG favicon assets are
preserved. No schema migration is required because RS is an optional season subdocument;
the homepage projection reads the existing published RS scoring snapshot while admin
continues recalculating from private working inputs. No Firebase, History, rules,
settings, external provider, live data, deployment or publication operation occurred.
This local preparation does not approve any push.

The prior local test run passed all 81 synthetic Node tests and the mocked admin/public
browser suites. On this resumed continuation, Node.js was not available on the shell
`PATH`, so the final synthetic browser-test fixture edits could not be rerun. The
production RS engine was rerun in a local browser against the private working snapshot:
it reported the retained crew-role validation error, blocked all five event rows, and
returned neither ready nor provisional standings. The actual-app private preview and
source preview were rechecked from `file://`: no external hosts, no failed local assets,
and the validation error remained visible. No real deployment, Firebase rules, live
Auth, or public data publication was tested.

The final local review also verified the offline actual-app preview after the homepage
and calendar changes. It shows synthetic NR data with private RS records, keeps NR as
the default, exposes separate RS result cards, orders dated events by supplied date
evidence, labels undated events, and displays the unresolved identity validation error
without inventing standings. Source qualifications and mapping notes are retained. The
source and actual-app previews remain in session-state `files`; only synthetic
regressions and generic behavior are documented in Git. The coordinated cache query
version is `rallyesport-3`. No live server, external traffic, Firebase operation, push,
deployment, or publication was used. Re-run the Node test suite when Node.js is
available before treating the final browser-test edits as verified or approving any
future push.

## Local-only reviewed RS identity and finality follow-up (not released)

This follow-up supersedes the earlier local-only note immediately above about the
unresolved identical-name row and unavailable Node runtime. It completes the two
explicitly user-reviewed identity decisions and the user-confirmed scoring finality for
the supplied R1-R4 classifications. It is a local working change only: no push, PR,
Firebase read/write, History change, database publication, deployment or external
provider operation was performed.

The private RS model now records reviewed driver/co-driver profile IDs separately from
source-printed names, plus evidence-backed finality acceptance separately from the
classification's title/status/notes. The production validator requires distinct known
profiles and review evidence; scoring and reviewed same-event time-copy matching use
the reviewed identities. A matching car number without reviewed crew identities remains
unmatched. Public projection removes private review evidence and retains only the
derived `user-confirmed` finality basis for disclosure. A source that says post-event
checks remain pending is not independently treated as cleared. Homepage cards and
classification point summaries distinguish the accepted scoring basis from the printed
source qualification.

The admin now exposes manual controls for row-specific driver/co-driver identity review
and source-finality acceptance/evidence. These are draft fields subject to the existing
shared validation and **Review & publish** flow; incomplete evidence blocks normal
publication. The public homepage/calendar behavior remains NR-default. The coordinated
asset query advances to `rallyesport-5` across index, admin, disclaimer and privacy.
Fields are optional under the RS layer; absent RS data and all NR calculations remain
unchanged. No migration or rules change is included.

The private working dataset's production RS structural validator reports **0 errors**.
R2, R3 and R4 event scores are available on the explicitly user-confirmed basis. R1
remains event-points-blocked: 14 non-TEST starters are evidenced and whether the TEST
entry counts toward the 15-starter requirement is unresolved. R5 has no classification.
No double-points bulletin is supplied, so final five-round qualification and a champion
remain blocked. R3/R4 source notes still say post-event technical checks are pending;
their completion is not independently evidenced. The user-confirmed scoring decision is
not represented as an updated official source document. The membership workbook was not
inspected. All real records and previews remain in session-state files, outside Git.

Latest verification on the exact local worktree: `node --test tools\tests\*.test.js`
passed all 84 synthetic unit tests. `site-theme-e2e.js`, `admin-access-e2e.js` and
`ai-import-e2e.js` passed with mocked browser traffic and no writes. The production
validator reports 0 structural errors for the private working dataset; this does not
make the championship complete or authorize publication. The actual-app preview uses
a private read-only local copy of current public NR data with the private RS records,
not a synthetic NR dataset or live connection. Its browser smoke verified four NR home
cards, three independent section switches, five-row RS leader cards with full-table
links, a six-card combined calendar (one NR-only, three NR+RS and two RS-only), the
local source-review link, 320px layout without horizontal overflow, and zero external
requests, unexpected fetches or page errors. The dated R1 card appears before the later
NR rounds; shared events are not duplicated. Source qualification remains visible on
the result detail pages while home/calendar cards stay concise.

The private scoring report remains blocked overall: R1 event points are held because
14 non-TEST starters are evidenced and TEST starter treatment for the 15-starter rule
is unresolved; R5 has no classification; no double-points bulletin is available, so
final five-round qualification and a champion remain unavailable. R2-R4 event scores
are supported on the user's scoring-finality confirmation, separately from printed
source statuses; R3/R4 technical-check completion is not evidenced. No official
document was rewritten.

The release-safety gate is still unmet. Read-only per-document Firestore reads are not
a consistent point-in-time full-database backup; export/PITR configuration, destination
storage and required permissions have not been verified, and no production backup is
claimed. The app-format backup is incomplete for full database recovery (see
[recovery](recovery.md#precisely-what-the-app-backup-does-and-does-not-do)). The exact
deployed legacy admin code preserves unknown fields on ordinary writes, but a newly
loaded old admin can restore a pre-RS whole-season backup and erase RS. Revision
preconditions protect stale writes, not that restore path; no enforceable writer freeze
or restore guard has been established. These checks do not test live Auth/rules, an
official technical-clearance document, or an authorized release.

No push, PR, Firebase write, History mutation, deployment, publication, rules/settings
change or external-provider write occurred. All real records and previews remain in
session-state files outside Git; the membership workbook was not inspected.

### Local preview/date and recovery-readiness correction

The RS-only event view now uses an explicitly linked NR event's exact displayed date only
when the RS event has no date; it does not populate RS event dates or scoring inputs. The
calendar parser recognizes date ranges such as `10–11 July 2026` for ordering. A reviewed
same-event crew match supports displaying a canonical NR profile while printed RS source
names remain unchanged. The actual-app offline
preview banner no longer links outside the browser's mounted preview root; the source
review remains a separate local preview.

Focused synthetic RS and season-readiness unit coverage passed (**37 passed, 0 failed**).
The mocked public theme, admin-access and AI-import browser suites also passed, using the
existing portable Node/browser modules with command-scoped `NODE_PATH` and no installs.
No production Google Cloud/Firebase permission check was possible: this worktree
has no `gcloud`, `firebase` or `gsutil` executable, and no authenticated read-only cloud
capability was available. No IAM, PITR, bucket or project state was queried. Public
Firebase documentation was consulted only; it states regular managed Firestore exports
are not exact point-in-time snapshots, while a PITR export requires PITR and a valid
whole-minute timestamp. No actual export/backup was started. Recovery scope and restore
limits are documented in [recovery](recovery.md#point-in-time-firestore-export-and-restore-limits).
An enforceable writer freeze would require a separately authorized server-side control,
such as a tested temporary rules write-deny; none was applied.

### Local RS role-identity projection and private preview reconciliation

The public RS projection now carries only the reviewed role-specific person IDs as
`publicIdentity`, while removing private identity-review evidence and leaving printed
driver/co-driver source names unchanged. The public RS result model and scoring standings
therefore resolve an identical-name crew to its separately reviewed driver and co-driver.
The source-results table remains plain text; no profile links were added. NR results,
standings and statistics are unchanged. Coordinated asset query versions are `rallyesport-6`.

The local-only identity reconciliation uses the user-confirmed captured NR public
people/season documents. It maps only unique exact-name/alias matches or qualifying
same-event crew evidence; unmatched identities remain separate preview-only RS candidates,
not asserted globally new and not authorized for live insertion. The mapping, reconciled
working copy and preview data remain outside Git. The actual-app offline preview was
regenerated from the reconciled public people fixture; automated checks verified all
published RS scoring identities resolve and the full captured NR model is unchanged.

Focused synthetic RS/season tests passed (37 passed, 0 failed), including private source
to public projection, role-distinct identities/standings, omitted evidence and NR parity.
The mocked public theme browser suite passed. No provider, Firebase/Google Cloud,
production-data or credential access occurred; no commit, push, publication, deployment,
database write or rule/settings change occurred.

### Local RS source-audit, scoring and homepage-preview follow-up (not released)

This continuation is local-only and does not authorize a push, PR, publication or
deployment. The RS started-DNF zero-point path now requires a resolved eligible role in
a supported class; invitation, non-scoring, unresolved-identity and unsupported-class
cases remain unavailable. NR scoring behavior is unchanged. The three compact homepage
NR/RS switches now stay synchronized, including keyboard activation, browser history and
partial legacy RS URLs. NR remains the default; the home provisional label is brief while
detailed RS pages retain their qualifications. Coordinated asset query versions are
`rallyesport-7`. No schema/contract migration or live data change is required.

Four supplied classifications were audited against their source PDFs. The private
off-Git correction ledger records 35 transcription/review corrections and the compared
field groups; source-backed positions, statuses, classes, times, penalties and totals
were not otherwise changed. Finality-review evidence hashes are unchanged. The private
reconciliation maps 55 RS profiles to 48 captured NR identities, retains 19 unresolved
RS-only candidates with deterministic public IDs, and excludes two non-person/role
labels from global people records. No ambiguous NR target was guessed. One potential
within-RS name variation remains flagged; the source profiles remain separate pending
confirmation. Source records, identity rationale and reconciled working data remain
outside Git.

The regenerated production-projection snapshot contains 91 people (72 captured NR plus
19 RS-only candidates); all 98 scoring identity references in ready events resolve, and
the complete captured NR rounds, standings, calendar, people model and public season
projection compare unchanged. R2-R4 scoring is ready; R1 remains blocked by the
unresolved TEST-starter threshold and R5 has no complete classification, so the overall
RS championship remains blocked and no final champion is asserted. The actual-app
offline preview shows the verified started-DNF zeroes. It uses only local captured data,
has a restrictive CSP and fetch shim, and has no live database or external requests.

Validation on this worktree: 39 synthetic RS/season unit tests passed;
`tools/tests/site-theme-e2e.js` passed; the actual-app preview browser smoke passed at
320/390/768/1440 px in light and dark themes, including synchronized controls, history,
legacy deep links, classification point display, zero external requests and no page or
console errors. JavaScript syntax checks passed. These checks do not certify unresolved
membership/non-scoring-class semantics, final RS championship eligibility, live Auth or
rules. No Firebase/Google Cloud access, provider write, commit, push, PR or deployment
occurred.

### Local RS provenance and homepage/admin safety follow-up (not released)

Private identity and source-audit rationale now distinguishes source/coordinator-reviewed
matches from the identity and spelling decisions explicitly confirmed by the user.
Reconciliation and source-audit digests were refreshed.

On the homepage, all three NR/RS controls now also switch the prominent leaders card:
RS mode shows provisional RS driver/co-driver leaders, retains ties, and states when
either table has no leader rows. Repeated provisional captions below each RS row were
removed in favor of the single section note. The admin finality-evidence field is disabled
unless the separate user finality review is selected, and its input handler cannot create
that review implicitly. The coordinated current cache token is `rallyesport-8` across all
HTML shells and recovery/data-entry docs; prior release-history tokens are unchanged.

Validation on this local worktree: synthetic RS/season tests, public homepage/theme E2E,
admin access E2E including forced evidence editing after deselection, JavaScript syntax
checks, private artifact digest checks, and offline Edge preview at 320/390/768/1440 px in
both themes. The preview had no external requests or page/console errors. No Firebase/
Google Cloud access, provider write, commit, push, PR, publication or deployment occurred.

### Local homepage RS link-routing follow-up (not released)

The synchronized homepage mode now routes **Full standings** to RS tables and **Full
calendar** to the RS events/classifications view when RS is selected; NR mode retains
the NR standings and calendar routes. This is consistent in populated, no-scored-starts
and no-results homepage branches. Browser regressions cover both modes and the empty
states. The current coordinated shell token is `rallyesport-9`; recovery and data-entry
guidance were updated, and the private actual-app preview is refreshed from local
captured fixtures. No schema, scoring, provider, or operational behavior changed.

Validation: `node --test tools/tests/rallyesport.test.js
tools/tests/season-readiness.test.js` passed (39 tests); `tools/tests/site-theme-e2e.js`
passed with populated NR/RS and no-results/no-scored-starts link assertions.
JavaScript syntax and `git diff --check` passed. The refreshed actual-app offline preview
passed Edge checks at 320/390/768/1440 px in light/dark themes, with no external or
fixture-blocked traffic and no page errors. This remains local work only: no Firebase/
Google Cloud access or writes, commit, push, publication, PR or deployment occurred.
Deployment approval is not in scope, and cache invalidation does not update already-open
tabs.

### Local RS 2026/2027 scenario rehearsal (not released)

The admin's actual new-season action is exercised in demo mode from a synthetic 2026
season containing RS events/results. A new 2027 season copies only the existing NR
settings placeholders; it contains no copied NR event/result or RS event/classification/
rules/member decisions, and the 2026 archive remains selectable. The admin now says
explicitly that RS data is not copied.

Shared-engine and public-projection synthetic coverage models a first 2027 RS-only final
classification with no NR calendar/result. Validation accepts the independent official
source record and the public projection preserves its classification, while NR standings
remain empty and 2026 scoring rules are not inferred for 2027; RS championship totals are
unconfigured. The public browser regression also opens the actual synthetic 2027 homepage
and RS result route with no NR events/rounds/results, verifying the classification renders
without inferred RS points or standings. Existing 2026 two-way isolation coverage continues to verify an RS change
does not alter NR standings/rows and an NR change does not alter RS official results or
calculated points. No 2027 rule, calendar or production data was created.

Final validation: 41 RS/season unit tests passed; the public theme E2E passed, including
the 2027 standalone RS public-home/list/result paths, and the admin access E2E passed
with the synthetic category-markup case. JavaScript syntax checks and `git diff --check`
passed. Browser network access was intercepted; no admin write was issued. The coordinated
current token is `rallyesport-12`.
This remains local-only with no Firebase/Google Cloud access, backup/export, commit, push,
publication, PR or deployment. Unknown 2027 NR/RS regulations, memberships and
tie/eligibility policy still require source verification before scoring or official
season standings.

Full branch review found and the local candidate corrected three tightly related issues:
HTML-escape printed category text in the admin mapping label; allow independent reviewed
identity selection per crew role and project only the reviewed role; and replace
source-like competitor names in synthetic regression rows with fabricated identities.
The admin browser fixture now includes an HTML-markup category regression. The public RS
points summary now omits repeated user-review provenance and shortens provisional copy,
while retaining printed source qualifications and blocked-event reasons.

The user separately delegated an overnight code push and live sanity check covering NR
and RS. This entry does not claim that release or any live comparison occurred: the
worktree remains uncommitted and no live site was inspected. The coordinating session
retains Firebase/GCP ownership and will pin the exact candidate and complete its required
preflight before any authorized code push; no live data/settings write is part of this
local work.

### User-authorized RS data-first publication (site release pending)

The user authorized the coordinator to publish the reviewed RS data before the site-code
release. Before publication, a local backup covered the Firestore documents in scope only;
it was not a full Firebase backup and does not recover Auth users, storage/photos, rules,
settings or provider configuration. The RS publication and its site History before/after
record were applied atomically with the explicit attribution label
**GitHub Copilot (direct Firebase)** and user attribution. Exact post-write readback was
used for local validation.

Readback validation matched the independent model across 124 NR and 71 RS result rows,
10 NR and 6 RS standings tables, and 7 NR stage tables. Responsive checks covered eight
viewports/states; nine older-site compatibility routes were also exercised. The mock-auth
admin check was read-only. These checks do not constitute live authentication or deployed
Firestore-rules testing.

The RS championship remains gated where source/review requirements are unresolved: R1 is
blocked by its starter-threshold evidence, R5 has no complete classification, and no final
championship result is asserted from those gaps. 2027 scoring rules and eligibility remain
unconfigured; no future rules were inferred. The site-code push, Pages build and live-site
verification are still pending. This data-first publication does not itself authorize or
claim a code deployment.
