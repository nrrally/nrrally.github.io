# Testing

## Revised RS entry-based policy (synthetic)

```
node --test tools\tests\rallyesport.test.js tools\tests\season-readiness.test.js tools\tests\admin-logic.test.js tools\tests\ai-import.test.js
node tools\tests\rs-entry-policy-e2e.js
node tools\tests\site-theme-e2e.js
node tools\tests\admin-access-e2e.js
```

`revisedRallyeSport()` in `tools/tests/ai-fixtures.js` is entirely synthetic. It
represents the preserved five event IDs, an unnumbered non-scoring launch, R1-R4
championship display numbers, three completed championship events and an unclassified
upcoming event (optionally with synthetic results). It does not assert live entrants,
dates, stages or venue truth. The launch's synthetic TEST crew has an explicit local
RS0 review; the same people score normally at subsequent events despite legacy
non-member/missing-licence/manual-exclusion and invitation evidence.

`node --test tools\tests\public-display.test.js tools\tests\rallyesport.test.js`
also checks RS location inheritance independently for venue and surface, RS precedence,
exact event/round links, unavailable or conflicting relationships and day metadata,
provenance and unchanged scoring. The public theme suite checks linked and unlinked
locations on Home, calendar and result views at its four widths and both themes.

Unit checks cover both roles, absent roster decisions, unchanged source/private evidence,
RS2/RS4 ranks/points, evidenced and unproven DNF, DNS, absent co-driver, three-ready/four-
counted provisional totals, all-four-ready still provisional, launch timing retention,
public/private agreement, projection privacy, unsupported policy/status/class/TEST
rejection and incompatible public markers. VM checks cover launch classifications,
graphs, profile/crew event versus championship appearances, championship table columns
and points bars. Matching RS contract 2 permits admin restore/publication checks; the
cached legacy contract is explicitly rejected. Existing legacy policy and NR regression
cases remain unchanged.

The browser runner intercepts every provider request and rejects writes/external traffic.
At 320/390/768/1440 px in both themes it visits revised public calendar, launch
classification/graph, standings and profile, plus admin policy/eligibility/source rows.
It checks preserved TEST/time evidence with effective RS0, no championship RS0 option,
no launch championship column, 45-point three-round totals, inactive roster/invitation
controls, allowed result-status options and explicit errors for cleared policy evidence.
It uses the externally installed Playwright module (`PLAYWRIGHT_MODULE`) and cleans up
its loopback server/browser. It does not access a private backup, live Auth/Firestore,
Pages, real analytics, actual competitor/source mappings or provider configuration.

## Admin workspace and logic explorer (synthetic)

```
node --test tools\tests\admin-logic.test.js
node tools\tests\admin-access-e2e.js
node tools\tests\site-theme-e2e.js
node tools\tests\ai-import-e2e.js
```

The catalogue test needs Node and local Git history for the pinned evidence revision.
It checks all 30 IDs, groups, connected paths, conditional outcomes and exact source ranges;
renders every topic and RS task in an instrumented VM; and compares serialized working
documents, NR scoring, public projection and validation before/after. It does not expose a
production test API or prove the prose matches every executable condition.

The admin browser suite checks all topics, evidence links/disclosures, search including no
matches, hash/heading focus, signed-out/non-admin deep links and unchanged full draft
backups. RS task paths run at 320/390/768/1440 px, light/dark: no horizontal page overflow,
no nested grids, native keyboard row expansion, retained select focus/disclosure state,
membership search and reversible controls. Existing edit, time-copy, identity/finality,
restore/merge/undo/simulation/rollover/publication checks remain in the same intercepted
runner. Optional `ADMIN_LOGIC_SCREENSHOT_DIR` saves synthetic review captures outside Git.
These checks do not certify every WCAG criterion or any provider/live data state.

For a human local review, `node tools\tests\admin-review-preview.js` starts a loopback-only
server at the printed ephemeral URL, with fictional 2026 records and a prominent synthetic
banner. It uses no installed package, live Auth, real credentials or Firestore traffic.
Its injected local-only adapter rejects all writes and external fetches; a self-only CSP
also restricts browser connections. Ordinary in-memory editing is temporary. Publishing
and admin-list saves must fail explicitly. Sign-in may land on Dashboard; choose RallyeSport
or Logic explorer afterwards. The preview adapter is never included in production HTML.
Stop this process when review is finished. Do not use it to inspect a real backup or claim
that a synthetic preview verifies deployed permissions.

## Quick checks (anyone, with Node.js 18 or later)

For authorized live data maintenance, use a privately stored backup (Admin → Dashboard →
Backups). Code-only development needs no live export. Then run:

```
node tools/validate.js nr-rally-backup-2026-11-06.json      # checks every season. Exits with code 1 if there are errors.
node tools/report.js 2026 nr-rally-backup-2026-11-06.json   # lists every override and note, for review
```

The admin runs the same per-round checks before it lets you publish.
For a private admin backup, `tools/validate.js` also recalculates RallyeSport from the
working season, prints the applied starter minimum/basis and each ready event's per-car
points, independently of any public scoring snapshot. Keep the backup and its output
private.

## AI Import regression checks (synthetic, no live database)

For small search-metadata/icon changes, run `node --test tools\tests\seo.test.js`
plus `node tools\tests\site-theme-e2e.js` and `node tools\tests\admin-access-e2e.js`.
The SEO checks cover unique static canonicals, evergreen titles/descriptions, CSP-safe
homepage WebSite microdata, only real canonical sitemap URLs, crawlable admin noindex,
and PNG signature/exact square dimensions with the original NR SVG retained in every
shell. Browser checks also verify the supplied header logo loads unchanged in public,
admin and static headers, including narrow admin layouts.
The public browser runner asserts the canonical/microdata/icon remain present and
no public noindex appears across responsive hash navigation and failure states.
Browser requests remain synthetic/intercepted. These are implementation regressions,
not a Search Console inspection or evidence of Google indexing/ranking.

```
node --test tools/tests/ai-import.test.js
node --test tools/tests/entry-participation.test.js
node tools/tests/ai-import-e2e.js
node tools/tests/site-theme-e2e.js
node --test tools/tests/rally-notice.test.js
node tools/tests/rally-notice-e2e.js
node --test tools/tests/analytics.test.js
node --test tools/tests/getting-started.test.js
node --test tools/tests/season-readiness.test.js
node tools/tests/analytics-e2e.js
node tools/tests/admin-access-e2e.js
```

The first command needs Node only. The browser test needs an existing Playwright installation (`PLAYWRIGHT_MODULE` may point to it). It serves the checkout locally, supplies fake authentication and intercepts Firestore requests with an in-process mock; other external requests are refused. Never run synthetic imports against live Firebase.

The rally-notice unit/browser runners also cover the distinct **Welcome to RallyeSport**
dialog in `display-context.js`. Synthetic clocks check first NR-to-RS selection, Continue,
Info and Escape acknowledgement, unchanged expiry across reloads, a new context carrying
only persisted storage (browser-restart equivalent), one millisecond before/exactly at
seven-day expiry, invalid stored values, read/write failures and page-only fallback.
Route cleanup must not acknowledge the welcome. Explicit manual reopening and shared
privacy-shell suppression remain available; the active-rally warning retains its separate
session bypass and manual reminder. The public theme suite keeps keyboard/focus and
responsive welcome checks, including suppressed repeat switches. No live database or
analytics requests are used.

Run `node tools\tests\navigation-e2e.js` for the responsive public header. It reuses
synthetic published fixtures and intercepts all external traffic. It checks full
navigation at 1440/1201 px and collapsed navigation at 1200/1199/1024/768/390/320 px,
both themes and NR/RS: all links, active route, year/theme controls, Enter/Space/Tab,
Escape/focus restoration, outside click/focus, selection closure, resize in both
directions, a visible MENU label and open/closed icons, and a short viewport with a
reachable last link. Header controls must not
overlap and navigation must not scroll horizontally on either side of the breakpoint.
Multi-year fixtures check that the selector stays visible on Getting started, preserves
context through reload/back/forward and return navigation, and never changes the shared
guide's content. Optional `NAVIGATION_SCREENSHOT_DIR` writes synthetic captures outside
Git. The NRC design reference was inspected separately in real Chromium at wide/narrow
viewports; no NRC code/assets are included.
The guide unit test checks the visible NRC/NR/RS comparison, retained National/Regional
distinction, club/standalone/selected-stage explanation, variable round programme,
qualified cost comparison, RS SSRs and event-specific requirements. It preserves the
dated existing RS source URL. The navigation browser runner verifies identical guide
copy in both NR/RS contexts and readable, overflow-free RS copy at every tested width.

### Season-readiness reproduction

`season-readiness.test.js` renders the actual public-site functions in an instrumented
Node VM, with synthetic season models and no boot/network/analytics. Production code
does not expose a test API. It verifies calendar-only/wholly empty seasons; useful Home
actions and omission of zero result statistics/leaders; missing/partial/complete-empty/
two-day entry counts and day scope; entry-only profiles; archived notes/MSA/results and
historical identities; strict invalid/leap dates; future/today/past/undated missing rounds;
selected-season Info links; and the guide header retaining its season control without an edition badge.
Populated synthetic 2026 models retain standings/points/status evidence unchanged.

Date assertions pin 21:59:59 UTC, 22:00:00 UTC and the following South African midnight,
not just midday examples. Round-date formatting explicitly uses UTC and status compares
South Africa UTC+02:00 calendar days, independent of visitor timezone. Reproduce in
different process timezones if changing the date implementation:

```powershell
node --test tools\tests\season-readiness.test.js tools\tests\getting-started.test.js
$env:TZ = 'Pacific/Honolulu'
node --test tools\tests\season-readiness.test.js
$env:TZ = 'Pacific/Kiritimati'
node --test tools\tests\season-readiness.test.js
Remove-Item Env:TZ
```

Review regressions also assert no leading separator for an unknown round day and
only one unknown-date label per calendar card/detail page. Valid statuses remain
visible. Info source-date tests cover valid ISO formatting, free-form dates/edition
text, invalid ISO preservation, escaped supplied text and absent dates. Calendar
status still rejects every non-ISO/invalid date. The browser regression verifies
unknown-date cards/detail pages alongside existing populated-season behavior.

The public theme browser regression adds a fictional 2027 bundle only in its mocked
Firestore responses. It changes the synthetic default, checks calendar-only states
and unknown metadata at 320/1440 px in light/dark themes, all date labels, missing-round
navigation, empty Sources/Crews/standings, selected-season Info switching, entry-only
crew/profile history and the guide's labelled 2026 sources without an edition warning. Existing wider route/theme/
guide/loading/error/print/privacy tests remain in that same runner. No 2027 data file,
live season, real competitor fixture or regulation claim is produced.

The same browser regression also renders a synthetic standalone 2027 RS classification
with no NR event, round or result, then opens its public RS result route. It asserts the
homepage remains NR-empty, the classification is visible, and the absent 2027 RS rules
produce no event points or standings.

RS public copy regressions keep user-review provenance out of the prominent event-points
summary, retain printed source qualification and technical-check status, and keep
provisional standings concise while identifying excluded events and their blocking reasons.
The synthetic public browser suite checks the RS standings points/split toggle at
320/390/768/1440 px in both themes. It compares all table values and ordering across
views, checks per-round RS2/RS4, class changes, DNF and RS0, and preserves split mode
across role/class navigation, history and reload. RS uses class points for overall
totals, not a second overall award. Browser traffic remains intercepted.
Mapped-class regressions check both source-category mappings across RS classifications,
expanded source notes, crews, profiles, graph legends/pickers and stage times at all
four widths in both themes. VM checks preserve source/model/scoring bytes and NR
rendering; unmapped categories and TEST remain unchanged rather than guessed.

These checks verify behavior, not the truth/currency of actual new SSRs or a private
database backup. The guide unit checks assert maintainer edition metadata, labelled sources
and absence of a visible edition notice even without
database context. Existing browser tests cover missing/unconfigured/unavailable results
and notice/analytics on guide navigation. No remote analytics is forwarded.

The admin access browser test covers signed-out and non-admin routes, authorized simulation and live
admin, reload, sign-out, authorization failures and delayed requests. It uses synthetic data and
intercepts all network access. The hosted app and its simulation are client-side: anyone can inspect
or download the public JavaScript. Interface gating is not code confidentiality. Private data is
protected by the deployed Firestore rules, not by hiding the interface; `docs/firestore.rules` specifies
verified-email allowlist checks for working data and writes. Verify the deployed rules separately.
It also verifies that enabled published analytics never loads the tag in live admin or simulation,
and that simulation analytics edits cannot change published settings.

The public theme test uses synthetic published documents and read-only mocked requests. It checks public routes at 320, 390, 768 and 1440 pixels (home, driver/co-driver standings and filters, rounds, all three round tabs, crews, profiles, info, season-specific sources and missing-page/round/profile states), saved light/dark preferences, primary-button WCAG AA contrast, final/provisional/unclear headings (including legacy page-count headings), consistent source badges, printed disclosure, loading/empty/unconfigured/database-failure links and JavaScript-free disclaimer access. The AI Import E2E also checks the persistent disclaimer link on dashboard, backup import, AI Import, results editing, calendar, competitors/profile editing, season settings, site info, history and review/publish. The link is static outside both apps' render roots, so route changes and sign-in/error rendering cannot remove it. These checks do not certify all WCAG criteria or replace visual review.

The public browser fixture also creates a synthetic 2026 RS season, derives its private
scoring before `AI.projectPublic`, and verifies that `buildSeason` consumes the published
snapshot without private membership/invitation inputs. It checks NR as the homepage
default; the keyboard-operable global NR/RS control; provisional labels;
standalone RS event cards; explicitly associated RS event badges without mixed results; and
RS access with NR results absent. When RS is selected, the prominent leader card uses
RS driver/co-driver leaders, preserves ties, and shows an unavailable state when a table
has no leader rows; NR remains the default. Provisional status is stated at section level,
not repeated beneath every RS row. It also checks RS-only profile history,
source technical-check qualifications remain visible, and each competition's
calendar retains its event/round order while explicitly labelling undated entries. These routes run
at desktop/mobile widths in light and dark themes, with all requests intercepted and no
database writes. Additional regressions cover persistent mode through all navigation,
reload/back/forward, season selection, legacy links and denied browser storage within
the app; verified/missing result associations; empty RS seasons; resolved versus
unresolved crew identities; RS-only standings, sources and cross-season profiles.
The synthetic 2026 RS fixture also includes a role with missing licence evidence.
Public assertions verify that its official class, position and result remain unchanged,
while scoring, standings, profile markers and the RS graph tooltip identify it as RS0
with zero championship points and no rank. No private membership evidence or identifiers
may appear in public HTML.
Public championship labels are binary: eligible roles retain RS2/RS4 and excluded roles
show "RS0 · Non-Scoring", not the private review reason. Synthetic browser checks pair
an RS0 person with an eligible partner and verify individual labels directly in Results,
unchanged official classified status/classes/positions, and independent zero/nonzero
points. Crews has a separate Championship status column; the shared SSR 6.1 explanation
does not assert non-membership merely because a role is Non-Scoring.
RS presentation checks now require the classification directly below its tabs, with no
introductory commentary wall; source/scoring notes and the secondary scoring-order table
start closed and remain keyboard-operable. Official classes, finish order, class positions,
totals/penalties and mixed-role points remain intact. Stage values are checked in Stage
times rather than repeated as classification columns. At mobile widths the classification
becomes labelled crew cards, with both names/statuses visible without horizontal scrolling.
Homepage tests keep the short provisional label, RS-only hero statistics and leader graph,
but exclude the repeated RS0 essay and non-scoring "class leaders".

The shared-profile regression switches a canonical synthetic person NR -> RS -> NR
without losing season/person context, photo, bio, social link or points chart. RS0 retains
its chart, zero points and selected-car graph; unsupported points are not rendered as zero.
An additional synthetic R2/R4-only appearance scenario preserves car numbers with no RS
vehicle and proves the NR vehicle is never borrowed. Optional source vehicles are validated,
projected and edited in the synthetic admin regression without changing scores.
`RS_PRESENTATION_SCREENSHOT_DIR` saves NR/RS Home, Rounds, Classification and Profile captures
at 1440/390 px outside Git. Set `RS_PRESENTATION_CAPTURE_ONLY=1` for captures only; that is
not a full-suite result. These use the same local server and intercepted synthetic requests.
The same graph UI is exercised for all six metrics, car selection, Top 5/All/Clear/class
filters, legend focus/highlighting, tooltips, head-to-head and stage tables. Tests assert
no NR/RS series mixing, independent standalone RS stage axes, official Final semantics,
hundredths precision and missing timing/ranks without interpolation or inferred totals.
Welcome tests cover repeated deliberate entry, no reopening on refresh/navigation,
label/description, Tab/Shift-Tab, Escape, Info and focus restoration. Palette invariants,
responsive brand/control separation and privacy-page mode continuity are covered.
Initial HTML loading is tested before a delayed script; delayed season loads and
unavailable data must replace loading with content or explicit errors.

Graph-discovery regressions click actual NR and RS homepage/calendar cards, rather
than proving only a directly entered `/graph` URL. At desktop/mobile widths both
standalone and explicitly linked RS events must open a rendered graph with all six
metrics, filters and two-car head-to-head. They traverse all three result tabs and
return with the selected cars/metric intact. Legacy bare result, championship listing
and profile event links must also reach a graph. Missing-timing and printed-rank
fixtures show explicit limitations while preserving official Final data.
Stage-times transitions wait for the destination URL and visible explanatory text before
asserting fastest-time highlighting; a click completing does not mean hash rendering
has completed. This avoids an assertion-before-render race without sleeps or weaker checks.

The RS engine regressions also cover explicitly reviewed driver/co-driver profile IDs
for identical printed names, unchanged source-row spellings, private identity-review
stripping, source finality qualifications that require an explicit user scoring review,
and public `finalityBasis` disclosure. The admin browser test fills the manual identity
and finality review controls using synthetic profiles; deselecting finality disables its
evidence field, and a forced input event cannot recreate the scoring review. The
shared-stage copy test accepts
a spelling difference only when stable crew identities have been reviewed, and proves a
matching car number alone remains unmatched.
Started DNF regressions distinguish source-evidenced rows (zero points in the private
calculation and projected public snapshot) from DNFs without row-level start evidence
(unavailable points even when an event starter count is reviewed), DNS and TEST rows.

The competition-display private local preview uses the actual public shell/assets and
only synthetic NR/RS fixtures, with a loopback-only server, fixture fetch shim and
self-only CSP. Preview tooling, dependencies and captures stay outside Git. Visual
review covers desktop/mobile, both competitions/themes, head-to-head and the welcome;
browser checks reject external requests and page errors and assert primary-button
contrast and no overflow. It is not a deployment or evidence about actual classifications.
The preview's richer three-stage synthetic times have matching synthetic official totals
for classified rows; a deliberately missing stage remains missing. Do not confuse the
unit/browser fixture's simpler one-stage result with a production rendering limitation.
Any separate private source-classification preview must report the production
validator's current result and distinguish structural validity from championship
readiness. Synthetic evidence cannot resolve starter counts, double-points bulletins
or missing future results.
The private source preview must show actual engine validation status and never hide an
identity error or fabricate standings. These private review artifacts and source files
must remain outside Git. The RS eligibility regressions use synthetic identities and
decision maps only; a private membership workbook is not a test fixture.

The getting-started unit checks cover the season and general event journey, official-source allowlist, unique working
topic anchors, a spectator-first opening without competition prerequisites, spectator safety,
no rally-raid or named event examples, no unverified TC target calculation, no quoted prices or hard-coded
minimum-start threshold, and coordinated script loading.
The public theme E2E also checks the guide at all four widths in both themes, native keyboard
expanders, topic focus/scroll below the header, print detail, homepage hero actions and guide-button
navigation, entry links and guide access with
missing/unconfigured/unavailable results. `PLAYWRIGHT_EXECUTABLE_PATH` may select an existing Edge
or Chromium installation. The analytics E2E verifies generic `getting-started` payloads even for
unknown/private-looking topic/query values, and the active-rally E2E retains its warning on guide
routes. All data and collection remain mocked; these tests do not verify official documents'
future currency. Recheck source links and regulations when reviewing guide content.

The active-rally tests verify absent/disabled defaults, exact safe HTTPS NRC destination validation,
malformed settings rejection, unchanged scoring and coordinated cache versions. Mocked browser checks
exercise staged enable/name/destination edits, atomic public projection and attributed History,
disable/reactivation, backup preservation, legacy restore, undo renewal, same-site conflicts and
unrelated revision rebase. Public checks cover initial deep links, visit-scoped dismissal, reloads,
fresh sessions, persistent reminders on routes and results failures, independently loaded settings,
disclaimer access (including no JavaScript), admin exemption, modal focus/Tab/Escape, both themes,
320-1440 px layouts, print disclosure and storage-denied behavior. All database writes are mocked;
synthetic fixtures only. `PLAYWRIGHT_EXECUTABLE_PATH` can select an existing Chromium/Edge binary
for this test. `RALLY_SCREENSHOT_DIR` optionally saves synthetic desktop/mobile previews outside
the repository. Database unavailability cannot reveal whether a rally is active; this is not an
offline blocker or a substitute for an official event portal.

The GA4 checks use generated synthetic Measurement IDs, a fake Google tag/collector, mocked
Firestore and fake authentication. They cover absent/disabled/unconfigured/malformed settings,
strict ID format and safe errors, staged enable/disable/ID updates, public projection, attributed
History, backup/legacy restore/undo, same-site conflicts, unrelated-document rebase and invalid
rebase rejection, plus cache contract/version checks. Browser tests cover exactly one initial
pageview, hash navigation/back/forward, query/filter rerenders, generic profile/round categories,
fixed titles and empty referrers, private/auth/admin exclusions, advertising flags, dedicated
privacy links from Info/footer (no popup), 320-1440 px layouts in both color schemes, cookie cleanup,
reversible persistent opt-out across loads/tabs, cross-tab storage changes, pending-load opt-out,
tag failure with active-rally notice/results, storage denial, missing settings/results and no-JS
privacy access. All external requests are intercepted; no GA/Firebase account or live database is
used. The fake tag checks commands and mocked payloads, not Google's real SDK. Stream-side
Enhanced Measurement, actual provider requests, Realtime and consent requirements require the
separate post-deployment checks in [runbook.md](runbook.md#google-analytics-4).

### Optional actual Google runtime check

`analytics-runtime-e2e.js` runs Google's actual JavaScript against synthetic HTTPS origins,
generated settings and synthetic Firestore fixtures. Unlike the usual mock suite, it requires a
separately downloaded runtime, normally for the generated all-A test ID. Keep Google's script outside the repo;
it is not a dependency to commit, and can change independently of this code.

PowerShell example (use an existing Node/Playwright installation):

```powershell
$fake = 'G-' + ('A' * 10)
curl.exe --fail --silent --show-error ("https://www.googletagmanager.com/gtag/js?id=" + $fake) --output <scratch>\synthetic-gtag.js
$env:GA_SYNTHETIC_RUNTIME = '<scratch>\synthetic-gtag.js'
node tools\tests\analytics-runtime-e2e.js
```

The usual external download is this generated-ID script. Every browser request is intercepted:
local assets and Firestore are synthetic, the downloaded runtime is fulfilled locally, collection
is recorded and fulfilled without forwarding, and all other destinations are aborted. Service
workers are blocked. By default the script refuses any runtime containing another GA4 Measurement ID.
For an explicitly authorized **offline replay** of a captured configured stream, pass its external
scratch path in `GA_SYNTHETIC_RUNTIME` and set `GA_OFFLINE_REDACT_IDS=1`. Property IDs are replaced
with the generated ID in memory before execution; the original is not printed or committed.
This mode never downloads, forwards, creates or edits a stream; all browser requests remain
intercepted. Do not commit captured provider scripts or property configuration.
It prints a hash of the executed, ID-substituted content so a passing run identifies the snapshot.
Allow several minutes: the actual SDK batches subsequent collection requests, so immediate mock-style timing
is insufficient.

The check verifies one initial view, route/profile/round/history navigation, no query/replaceState
duplicates, standalone privacy/disclaimer, category-only `dl`, fixed `dt`, empty `dr` in **each raw
query and event-body field** as well as effective events, suppressed
HTTP Referer, no User-ID or private synthetic markers in any captured request, no additional CSP
requirements, and opt-out unloading/cookie removal. Click/form/scroll probes do not produce
enhanced events with the downloaded fake-container runtime. A deliberately issued
`user_engagement` event probes actual SDK default parameters and latest-category global defaults; it is not evidence that the fake
container auto-fired engagement. First-visit/session flags and browser/cookie identifiers still
appear, as expected for analytics.

On 2026-11-07 the actual-runtime check passed with snapshot SHA256
`affda88a3989d647cf5aafe9313025cad825bff95f47f3e716d0d0335878f573`.
That generated-ID container did **not** reproduce a real configured container's initialization.
A later offline captured-container replay exposed two initial views: a raw document URL/query,
DOM title and document.referrer, followed by the safe manual view. Moving only per-stream config
before script insertion did not fix it. `ga-3` queues global `send_page_view:false` and sanitized
page context before `js`, config and script insertion, and refreshes global context on navigation.
The safe context is not pinned in per-stream config, and pending global suppression is not
discarded on excluded routes: regressions cover both stale default-event categories and deferred
raw initialization on return to a public route.
The configured-container regression passes with executed ID-substituted snapshot SHA256
`642fa549563ccf17f0f6d321c883e583163df1768b6cbfd4041b9a6506dc49d8`.
The mock now simulates independent automatic initialization unless global suppression was already
queued, preventing the original timing error from passing that suite. Actual-container replay also
checks excluded navigation and opt-out while the script is pending.
No CSP expansion is required. These checks do **not** verify later remotely supplied Enhanced Measurement,
automatic-event configuration, connected destinations, server processing or Realtime. Turning on history/search/
form/link enhancements can supply their own event parameters and defeat the manual-only privacy
design; keep the actual stream's Enhanced Measurement off and perform the live checks separately.

Coverage includes schema/version/unsafe-field rejection, evidence and unsupported rules, large entry batches, identity ambiguity and slug collisions, entry-only zero starts, cancelled stages and DNF/DNS, exact arithmetic, scoped/idempotent amendments, same-car/different-crew overrides, private metadata projection, stale review and resumable drafts, explicit publishing, public standings, undo, document limits and validation after rebase. The 1,500-exact-identity batch must complete within 10 seconds.

Continue running the private engine/importer and admin/site regressions below: the synthetic suite does not replace established 2026 coverage. No real competitor fixtures or documents belong in this repository.

Focused review regressions also cover same-person crew roles, duplicate crew/credit assignments across cars, new/retained extra-start conflicts, valid credit swaps and suppressed co-driver credit, printed alias preservation, independent provisional-finality acknowledgment, and incomplete/duplicate page/batch rejection versus complete combined classification reimports.

Entry participation checks cover entry-only stable profiles, explicit DNS evidence, classification/DNF
deduplication, aliases and substituted partners, event-only versus explicit day coverage, unknown/partial
sources, repeated entry/classification imports, unchanged scoring and MSA confirmations, rejection of
private/scoring fields, backup compatibility and whole-document undo. Mocked browser tests also exercise
entry-pack download/resume, manual editing, atomic public projection, History undo, older-backup loss
confirmation and entry validation after concurrent rebase. Public tests cover stable entry-only profile
links at 320 px, understated counts, unknown day wording, classification DNS excluded from Starts and
the no-scored-starts home state. All external writes remain intercepted.
Review regressions additionally cover URL-significant and attribute-breaking stable profile IDs;
explicit manual alias/new-person decisions, classification-only legacy auto-add and concurrent entry
identity rebase; same-count/different-crew and reduced-scope backup loss versus no-loss restore;
mixed cached engine/import contracts; and upcoming two-day calendar counts with one-day-only,
unknown-scope, partial and missing entry evidence.
Public event cards show concise NR entry counts after the surface, qualify partial lists, and
suppress the event summary for missing or empty partial lists rather than inventing zero.
Where entry evidence exists, round-level partial/unknown coverage and source links remain.
Checks cover event-level
crew deduplication across days, known-empty complete lists, retained entry-source links, and removal
of the homepage entry-summary/points callout and the Crews entry-versus-start sentence. Detailed
points and participation explanations remain on the relevant standings, sources and profile views.
Concise homepage, rounds, standings and Crews introductions and profile entry summaries are checked
against their displayed wording. Round source/discrepancy notes stay collapsed behind "Source & notes"
on all three tabs; browser checks verify keyboard expansion/collapse, preserved source/PDF links and
escaped round/crew evidence, visible status badges, tab navigation, and both themes at 320/1440 px.

## RallyeSport regressions (synthetic only)

Run:

```
node --test tools/tests/rallyesport.test.js tools/tests/season-readiness.test.js
```

Fixtures are synthetic. Engine coverage asserts the 2026 class scale, the distinct
event-invitation exclusion and per-person season toggle, asymmetric driver/co-driver
re-ranking and toggle reversal, role-specific membership exclusions and RS0 zero-point
rows, identity-review resolution before eligibility lookup and canonical accumulation,
missing/ambiguous membership statuses and strict private override evidence, the original
15-starter SSR baseline and evidence-backed six-starter review (including exactly five,
six and fourteen starters), source-evidenced TEST/invitation starter counting and DNS/
unknown-DNF boundaries, malformed reviews and 2027 non-inheritance, blocked round-tie
cases, unconfigured years/classes, standalone RS-only validation, private-field
projection, one-time explicit NR stage-time snapshots and two-way NR/RS isolation. Synthetic cases
also cover a user-confirmed pre-issue 2026 event, preserving a `Final Results` heading
and TEST row without rewriting their source status or awarding championship points,
consistent per-class ordering when class positions are partial, separate printed class
positions under tied overall order, unresolved within-class ties and a later DNF stage
time after an earlier missing observation. RS graph tests cover non-prefix stage values
and hundredth-second differences without changing NR precision. The public VM regression
checks the working-to-public-to-builder scoring path, public source preservation and
review-evidence stripping, R1-R4 event points with R2-R4 unchanged and four-round
championship incompleteness, ready and blocked states,
provisional tables with excluded rounds disclosed, unchanged NR graph defaults, a mapped
dashed RS overlay, separate RS tables and RS-only events absent from NR Home or standings.
Homepage regressions also cover the three visible, keyboard-operable NR/RS switches
staying synchronized when any is clicked, legacy partial RS links, browser history and
back navigation, the compact provisional label, five-row RS leader cards with links to
full tables, and merged
NR-only, RS-only and explicitly shared calendar entries ordered by available dates
without duplicating shared events or guessing undated order. A linked RS-only calendar
view may display the linked NR event's exact date when RS dates are absent; that
display-only fallback never writes an RS scoring date.

The public RS parity regression extends `site-theme-e2e.js`: homepage driver and
co-driver leader rows carry their class badges and evidence-based round-start counts.
Class leaders count classified and evidenced-DNF starts, do not count DNS, mark an
unproven DNF unavailable, and exclude the launch. Standings use the shared class badges,
NR's "Pos" heading and a centered compact position column. RS2 uses the NR2 blue and
RS4 the NR1 red in both themes. Calendar checks cover the shared year heading, source
links from an explicitly related NR event only, and no invented link block when the
related NR event has no published links. The RS round-winners table uses source
classifications, withholding winners for pending or unfinalized results and upcoming
events while labelling the launch as non-scoring. Crews tests preserve both genuine
RS2/RS4 source classes while ensuring an overlapping scoring class is not rendered as
a duplicate badge. Crews are also checked for distinct-event counts and labelled
narrow-screen cards. The full public theme runner exercises these routes at
320/390/768/1440 px in both themes; all provider requests remain synthetic/read-only.
Run it with
`node tools\tests\site-theme-e2e.js`. The separate `rs-entry-policy-e2e.js` and
RallyeSport engine regressions remain required to confirm that presentation changes
do not alter the 2026 entry-based policy, launch exclusion, or NR scoring.

The approved local display-consolidation phases 1-2 replace both Home markup paths with
one renderer. `public-display.test.js` adds seven focused adapter/component contracts,
covering immutable independent facts, real multi-class membership, source-evidenced
starts without repeated-car inflation, unknown vs zero, missing published snapshots,
identical presentation for identical facts, ties/missing roles, escaped text, scoped
links and accessible gap/zero chart labels. `season-readiness.test.js` keeps the
featured heading/points/classes/starts/bar/co-driver regression and checks calendar-
only four-stat placeholders without invented scores. Run:
`node --test tools\tests\public-display.test.js tools\tests\season-readiness.test.js tools\tests\rallyesport.test.js tools\tests\entry-participation.test.js tools\tests\getting-started.test.js tools\tests\analytics.test.js`
(114 tests after phase 6).

`site-theme-e2e.js` compares fixed Home DOM/wording and computed display, padding,
margin, gap, typography and alignment across NR/RS at all four widths and both themes,
excluding deliberately distinct colours. It checks keyboard scoring disclosures,
real role/class links, launch exclusion from championship round counts, and known/
missing/provisional/empty facts. Run it plus `navigation-e2e.js` and
`rs-entry-policy-e2e.js`; source classification, graphs and later-page regressions
remain in those suites. The [phase record](display-consolidation-plan.md) describes
the remaining calendar and later-page work, which is not part of phases 1-2.

Phase 3 adds five calendar contracts to that same test file: exact common calendar/
Rounds HTML from equivalent NR/RS adapter facts; stable date-first ordering and strict
invalid/undated/month-only handling; dynamic own/related link ownership and no guessed
RS dates/results; NR multi-day and combined-mode explicit mapping including misleading
RS IDs; and source/mapped class winners, ties, DNS, technical/finality holds and
upcoming unavailable values. Home, Rounds and Info's event section share calendar
output. The theme suite compares actual NR/RS event-card DOM, computed typography,
padding/margins/gaps/alignment and responsive column count at 320/390/768/1440 in
light/dark, excluding data-dependent geometry and deliberately distinct colours.
Existing future/today/past/unknown-day, source link, winner, launch and two-day entry
coverage regressions remain active. `navigation-e2e.js` and `rs-entry-policy-e2e.js`
also cover the unchanged route/theme/policy behavior with synthetic providers only.

Phase 4 adds six standings contracts: exact NR engine order/countback/eligibility,
class-only and filtered-overall components; authoritative RS overall/class ranks and
ties; both roles and real multi-class entries; known zero/recorded versus unproven DNF;
unavailable starts; legacy RS0; launch/future column exclusion; missing/blocked versus
ready/four-round provisional snapshots; source starts without class points;
immutability, public facts, escaping and exact
common markup for equivalent contracts. The VM test explicitly covers all six legacy
RS cumulative tables. Existing scoring suites remain unchanged and required.

The public theme suite compares equivalent NR/RS standings rows/round fields for
common headings, DOM/headers/field slots, computed typography/spacing, centered Pos
and sticky/mobile policy at 320/390/768/1440px in light/dark, excluding theme colours
and genuine data-dependent geometry. It exercises table focus/keyboard horizontal
scroll, native active controls, both competitions' class/role/breakdown preservation,
back/reload and visible provisional/MSA qualifications. Optional presentation captures
now include Standings. Navigation and RS entry-policy public/admin checks remain
required; no live provider read/write is part of these tests.

Phase 5 adds nine result contracts and a VM missing-total comparison regression:
NR printed/credited identities, class-only/no-credit/DNF/DNS awards; RS independent
class-role ranks, printed hundredths and technical holds; exact shared shell/
classification/control/stage structure; independent sparse axes and every engine
metric; launch/pending/blocked states; historical tab/query/source ownership;
missing stages with printed positions and stages named Final; escaping/privacy;
and unavailable immediately previous totals without losing a known leader gap.

The full public suite compares equivalent result headers, fields, DOM and computed
spacing/responsive policy in both contexts at 320/390/768/1440px in light/dark.
It exercises keyboard car/class/metric controls, legend highlighting, source
disclosures, focusable tables, car/metric retention through every tab, tooltips
(including a source stage named Final), shared line style and unchanged RS
hundredths/independent axes. Run the targeted command above plus
`node tools\tests\site-theme-e2e.js`, `node tools\tests\navigation-e2e.js`,
`node tools\tests\rs-entry-policy-e2e.js` and `node tools\tests\ai-import-e2e.js`.
All pass locally with synthetic intercepted providers. Optional
`RS_PRESENTATION_SCREENSHOT_DIR` captures Home/Rounds/Standings/results/graphs/stages/
profiles at 390/1440px in both themes; `RS_PRESENTATION_CAPTURE_ONLY=1` stops after
checking those captures for overflow, unexpected requests and page errors.
Keep screenshots/dependencies outside Git. These checks do not certify live data.

Phase 6 adds seven focused contracts for directory/profile/Sources/Info facts:
unique multi-class badges and unresolved source identities; unproven DNF/blocked
awards versus zero; NR two-day event/round counts, printed versus credited roles and
MSA-only starts; immutable cross-season roles without global context switching;
exact equivalent directory/history structure; explicit document ownership; and
source finality, pending/confirmed MSA qualifications, notes and privacy. Existing
entry-only, unusual-identity, archived-source, missing-role, DNS/DNF and legacy
cached-engine regressions remain active. Missing coverage keeps the common field
with an unavailable value rather than removing it or supplying zero.

The public browser suite now compares actual Crews/profile/Sources/Info fields,
scoped headers and computed spacing/typography/layout at 320/390/768/1440px in
light/dark. It exercises labelled search (including no matches on mobile grids),
keyboard focus on scrollable regions, canonical identity links/escaping, archived
profiles, source/finality badges, RS-only rules ownership and the unchanged guide
CTA. Full public, navigation, revised entry-policy public/admin and AI-import suites
pass on the completed runtime, with synthetic intercepted providers only.
The targeted command passes **114/114**. Eighty synthetic presentation captures
cover twenty NR/RS routes at 390/1440px in both themes; representative Crews,
profile, Sources and Info screens were inspected outside Git. Capture mode now
includes Crews/Sources/Info; long Crews captures use the viewport for legibility.
No unexpected requests, page errors or horizontal viewport overflow were accepted.
These are focused accessibility/interaction checks, not a complete WCAG audit or
certification of live/private data. No provider access, data write or release occurs.

## Compact standings, Crews and classification display

The compact follow-up adds synthetic contracts for conditional accessible eligibility
markers/footnotes, role-aware combined Crew standings, one deduplicated championship
Starts count, and equal driver/co-driver points. Edge cases include multiple cars and
roles in a round, NR multi-day rounds, RS launch exclusion, DNS-only and unsupported/
unproven starts, unavailable identities, genuine zero points, unequal/missing awards,
and RS0/non-scoring roles. Unknown data remains `—`; roles are merged only when both
numeric awards are equal and neither has role-specific qualification.

The targeted Node command passes **122/122**:

```
node --test tools\tests\public-display.test.js tools\tests\season-readiness.test.js tools\tests\rallyesport.test.js tools\tests\entry-participation.test.js tools\tests\getting-started.test.js tools\tests\analytics.test.js
```

`site-theme-e2e.js` passes at 320/390/768/1440px in light/dark and checks the actual
standings, Crews and classification views, exact shared headers, ineligible-only
asterisks and footnotes, keyboard/table focus, visual one-number equal points and
accessible role labels. It also checks the Home treatment across leader, co-driver,
class and featured/tied rows, conditional note, accessible description, unknown RS
eligibility and no repeated labels at all responsive widths and both themes.
Navigation, revised RS entry-policy public/admin, AI Import and admin access browser
suites also pass with synthetic intercepted data. No live provider or Firebase
requests/writes are part of these checks.

For calculated RS source-class positions, test the reviewed snapshot contract with
synthetic results only. Exercise source and row edits, incomplete reviews, printed versus
calculated positions, ties, missing or ambiguous source categories, DNS/DNF and
conflicting official positions. Check the same value and accessible conditional
explanation in result classification and profile history without using points or
role-specific eligibility. A provisional source and a final source pending technical
checks must retain their original notices. Responsive checks must cover both themes
and narrow and wide layouts. Absence of review must preserve legacy unavailable states.
The targeted Node suites exercise the canonical SHA-256 vectors, private-evidence
projection, source/row invalidation, both roles and three independently reviewed
synthetic rounds, mapped classes, printed positions, missing/non-classified rows,
legacy snapshots and unchanged scoring. The public browser runner checks described-by
footnotes in both role profiles and classifications at 320/390/768/1440 px, light and
dark. The RS admin browser runner confirms the explicit review, then changes a source
and verifies the stale-review publication error before removing it. All data and
provider responses in these runners are synthetic.

Synthetic RS identity regressions exercise private role review through public projection
and model construction, checking distinct role IDs, unchanged printed names, omitted
private evidence and unchanged NR results. Started-DNF regressions verify zero points
only for resolved eligible roles in supported classes; invitations, non-scoring people,
unknown identities and unsupported classes remain unavailable.
Mocked admin tests exercise the real selective-copy preview (matched, conflicting,
missing and RS-only crews), the copy button, no mutation on cancellation/error, file-only
sources and TEST entry, backup/undo warnings, profile merges and demo projection
boundaries. These tests do not certify unresolved SSR clauses or a live dataset.

## Manual check after a publish

1. Open the changed round on the site and compare the Classification tab with the official PDF.
2. Check the standings and one crew's profile page.
3. If MSA has published standings that include the round, compare the points.

## Full test kit (private)

The full test kit is in the private project archive, in `test-kit/`. It's private because its test data includes licence numbers and other details from the official sheets. "Code" below means a copy of the repository (GitHub → Code → Download ZIP, unzipped).

Extract the archive outside the repository and run the commands from that private directory, passing the code checkout as `<code>`. Install Playwright there, not in the public checkout. Backups and fixtures must stay private even when a test fails. Node.js is only needed for development checks, not for hosting the site.

| Test | Command | What it proves |
|---|---|---|
| Data check, engine regression and importer | `node test-kit/run-all.js <code> [backup.json]` | The data is consistent. The engine still produces the verified 2026 results, which were checked against MSA's published R1–R5 points. Pasted text from the official PDFs is read correctly. |
| Admin and site end-to-end | `node test-kit/admin-e2e.js <code>` | Runs against a simulated database and a fake Google sign-in, so it never touches the real project. Covers the site holding no data of its own, the first load from a backup, publish, the public site reading only published data, edits and checks, a new season with a PDF import, refusal of an unknown layout, the spreadsheet template and its checks, look-alike names, photos, undo, both kinds of concurrent edit, the admin list, a stranger being refused, backups and demo mode. Needs Playwright (`npm i -D playwright` then `npx playwright install chromium`). |

**What the tests can't cover:** the real Google sign-in pop-up and the real database rules. Check those by hand after a change to sign-in or to `docs/firestore.rules`:

1. Sign in as an admin.
2. In a private window, check that the public site loads.
3. Sign in with a Google account that isn't on the admin list, and check that it's refused.

## Rule for code changes

- **Before EVERY push:** update affected documentation and recovery/release records, including
  the actual validation performed and limitations. Use [releases.md](releases.md#before-every-push).
- **Before changing `assets/engine.js`:** run the engine regression. Any change in 2026 points is a bug, unless a deliberate data correction explains it. If one does, record it in `decisions.md`.
- **After changing `assets/admin.js` or `assets/site.js`:** run the end-to-end test.
