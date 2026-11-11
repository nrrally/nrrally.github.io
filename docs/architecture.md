# Architecture

## Overview

```
Visitors ──HTTPS──▶ https://nrrally.co.za/   GitHub Pages: the code only (HTML, CSS, JavaScript), no results data
    │
    │ read the published copy, no sign-in
    ▼
Cloud Firestore (Firebase project, region africa-south1 Johannesburg)
    public/    the published copy the website reads        anyone can read
    photos/    profile photos                              anyone can read
    docs/      the working data                            admins only
    history/   every published change (before and after)   admins only, append-only
    config/    admin list, publish counter                 admins only
    ▲
    │ Google sign-in, then read and write
Admin page (https://nrrally.co.za/admin/)
```

Hosting and data use two providers, with optional public analytics and no application server:

- **GitHub** (organisation `nrrally`) stores and serves the code. It holds no results or personal data.
- **Firebase** (a Google Cloud project on the free Spark plan) provides Google sign-in (Firebase Authentication) and the database (Cloud Firestore).
- **Google Analytics 4**, if explicitly enabled in published settings, measures generic public page categories. It is separate from Firebase Analytics.

## Parts

| Part | Files | What it does |
|---|---|---|
| Engine | `assets/engine.js` | Pure functions shared by the site, admin and Node tools: NR and independent RS models/scoring, reviewed stage-time snapshot copying, RS graph progressions, checks, and existing importers. No browser or network code. See [data-entry-guide.md](data-entry-guide.md). |
| Public site | `index.html`, `assets/site.js`, `assets/styles.css`, `assets/display-context.js` | A single-page app. Reads `public/site`, `public/people` and `public/season_<year>` through the Firestore REST API, then calls `NREngine.buildSeason`. A shared NR/RS preference selects independent views and graph axes, never mixed series. |
| Getting started | `assets/getting-started.js` | Bundled original guide, independent of results/database state. Maintainer edition metadata and dated sources support annual review separately from season cutover; no edition badge is rendered. |
| Active-rally notice | `assets/rally-notice.js`, `assets/rally-notice.css`, `disclaimer.html` | Reads only `public/site`; shares that initial promise with the results app. Native full-page yellow modal, followed by a sticky compact reminder after bypass. Not loaded by the admin. |
| Optional analytics & privacy | `assets/analytics.js`, `privacy.html` | Shares the public site settings promise, validates GA4 settings and sends manual sanitized pageviews after rendering. Dedicated static privacy notice and persistent browser opt-out; never loaded by admin. |
| Admin | `admin/index.html`, `assets/admin.js`, `assets/admin.css` | Google sign-in, an in-memory editable copy of the data, checks, points preview, publishing, history and undo, backups and the admin list. |
| Admin logic explorer | `assets/admin-logic.js`, `assets/admin-logic.css` | Admin-only entry point for a bundled, read-only NR/RS/shared decision catalogue. Conditional flows and revision-pinned code/docs evidence; no dataset evaluation, rules configuration or provider access. Static source is public. |
| AI preparation | `assets/ai-import.js` | Pure versioned contract/prompt generation, strict parsing, capability/evidence checks, identity assessment and scoped change planning. Shared by admin and Node tests/tools; no network or provider SDK. |
| Connection settings | `assets/firebase-config.js` | Says which Firebase project to use. Public by design: it identifies the project and grants no access. |
| Access rules | `docs/firestore.rules` | The database's security rules, pasted into the Firebase console. They decide who can read and write what. |
| Tools | `tools/load.js`, `tools/validate.js`, `tools/report.js` | Node scripts that run on a backup file: check all data, and list every override and note. |

### Admin presentation and explanation maintenance

RS uses hash routes `#/rallyesport/{events,setup,eligibility,checks}` and
`#/rallyesport/events/<eventId>/{event,source,stages,rows,preview}`. Existing bound controls
still edit the same objects and use the same validators/projection/publish pipeline.
Task, search and disclosure state are ephemeral UI state, not schema fields.

`#/logic/<nr|rs|shared>/<topicId>` renders a manually curated directed topic graph.
Each decision has conditions/outcomes and evidence `{path,start,end,symbol}`. Evidence
links are immutable GitHub blobs pinned to `bcb4c8a68f975c7f7bdfa725839de4f3d798d8bc`,
the audited pre-change runtime; current admin line numbers will differ after layout work.
The scorer is unchanged from that revision; later display-only changes are documented
separately. This catalogue is not
generated from executable branches: when processing changes, re-audit affected topics,
outcomes, links and related paths, then advance the baseline after the supporting code
exists in an inspectable commit. Do not silently link moving `main` or reinterpret old rules.
The Node catalogue checks verify graph closure and pinned source ranges, not semantic
truth. Human comparison against implementation/docs remains essential.

The explorer's responsive Clawpilot palette is scoped to its components. Existing admin
authentication, Firestore REST and Auth SDK adapters, database rules and CSP are unchanged.
Only the admin shell includes the new assets. Coordinated HTML query version
`rs-split-1` busts caches across public/admin/disclaimer/privacy; it is not a data or
scoring-contract version.

## Public site

### Routes

| Route | Shows |
|---|---|
| `#/` | Home page for the current season |
| `#/<year>` | Home page for that season |
| `#/<year>/standings`, `#/<year>/standings/codrivers` | Standings. Optional `?class=NR1&pts=split`, or `?competition=rs&class=RS2&pts=split` for RS. |
| `#/<year>/rounds` | Calendar and the round winners |
| `#/<year>/round/<id>/graph`, `…/classification`, `…/stages` | One round. The graph takes `?cars=200,201&m=gap`, where `m` is one of `pos`, `gap`, `cpos`, `cgap`, `loss`, `spos`. |
| `#/<year>/rallyesport` | Legacy RS championship tables, with graph-first event links. |
| `#/<year>/rallyesport/<resultId>`, `…/<resultId>/graph`, `…/classification`, `…/stages` | RS result defaults to Stage graph, including legacy bare result links. Classification and Stage times are explicit tabs. RS-only events need no NR round. |
| `#/<year>/crews` | Everyone in the season |
| `#/person/<id>` | One person across all seasons |
| `#/getting-started`, `#/getting-started/<topic>` | Shared newcomer guide, not a season-specific rules page |
| `#/<year>/about` | Sources and data notes |
| `#/<year>/info`, `#/info` | Selected-season documents/events plus shared championship introduction and labelled shared useful links |

Routes without a year use the current season, so older links still work. Hash routing means the host needs no rewrite rules.

Every public hash route carries `competition=nr|rs`. The header control beside the
theme control persists `nr-competition` locally; URL context takes precedence on
refresh/back/forward, with explicit NR result and RS routes preserving their original
competition. Legacy homepage `leaders/classes/results=rs` links activate site-wide RS.
Home, standings, rounds, crews, profiles and sources use only that competition.
Getting Started and Info retain their content. Privacy/disclaimer share display
preferences and mode-qualified return links; admin never loads the preference module.
Each deliberate NR-to-RS switch opens a native labelled welcome dialog with Info and
Continue, keyboard focus containment, Escape and focus restoration. Navigation and
refresh do not reopen it. Cross-competition result switching requires a unique explicit
`nrRoundId` association and an existing destination; otherwise it returns to rounds.

Data loading works like this:
- **The code holds no results data.** The site reads only the published copy from the database (`public/` documents, no sign-in needed).
- **If the database is unreachable, or nothing has been published,** visitors see a short message ("Results coming soon" or "temporarily unavailable"). The site never shows old or built-in data.
- **The guide remains available** with missing, unconfigured or unavailable results. It is reference content, not a results fallback.
- **Loading is visible immediately:** initial HTML includes a live status before any
  scripts, and subsequent asynchronous season/profile loads replace old content with
  a loading status. Ready content or an explicit failure message replaces it.

### Independent RallyeSport data and graph presentation

Optional `season.rallyesport` lives inside that season document so existing staged edits,
whole-document backups/restores, revision preconditions, History/undo, rebase validation
and atomic public projection apply without a second write path or collection. Older
seasons with no RS field keep their NR behavior and are not rewritten by viewing the
public site. New-season creation does not copy an old RS ruleset, event or result.

NR and RS event IDs, result rows, official order/status, classes, penalties, points,
eligibility, season totals and stage selections remain independent. RS-only events do
not need an NR event/round/stage. A shared event or result can have explicit optional NR
associations. Reviewed stage-time reuse is a one-time copy into RS `times` with provenance;
it requires exact mapped stage IDs and matching car plus reviewed stable crew identities.
It does not copy NR status/class/order/penalty/points, and subsequent NR changes cannot
change the RS snapshot. A discrepancy remains a human review decision.

The public RS tables consume the validated published RS scoring snapshot; private
calculation remains the separate ruleset scorer. Invitation flags, member toggles,
applicability/bulletin evidence and other decision metadata are removed from the public
projection. NR's statistics and histories never consume RS values. RS profile links use
reviewed stable identities and RS-only history across offered seasons. Unresolved crew
names remain visible without fabricated person links or name-based identity merging.
Profiles describe source/classified appearances, not inferred championship starts.

RS presentation follows the NR information hierarchy: classification immediately after
the result tabs, compact two-person crew cells, position/car/class badges and aligned
totals/role points. On narrow screens the same RS source rows become labelled crew cards;
names and individual championship status do not require sideways scrolling. Stage times
remain in their existing tab. Source notes and the secondary role-specific scoring-order
table are closed native disclosures below the classification. Detailed review rationale
is not rendered in the public result header. A short RS0 footnote is used only where
non-scoring people are displayed, not on the homepage's ranked/class leaders.

Both competitions reuse the profile header (photo, biography and social links) and
responsive season-points SVG renderer. RS supplies its own event/role points, including
explicit zeros for RS0; unavailable points remain gaps, not zeros. RS profiles retain
source car numbers, optional source vehicle, partners, official results, recorded stage
wins, standings summaries and graph links selecting that appearance's car. Crews and
standings retain the corresponding role/class and per-event detail. Competition switches
keep a canonical person and selected season; they never transfer NR results or vehicle
details into an RS appearance. An absent RS vehicle is shown as "Not recorded".

The shared graph UI provides the same six metrics, car/class quick filters, legend
highlighting, tooltips, head-to-head bars/table and stage table in both modes. An RS
display adapter uses each classification's own stage IDs/labels and the existing pure
RS graph calculations, including standalone events; it never overlays NR series.
Missing timing and printed stage ranks remain missing. Cumulative values require
preceding times; Final uses official classified totals/positions/status. RS source
precision is retained, including hundredths; existing NR precision stays unchanged.
The pure helper's older explicit-stage mapping capability remains available, but
public `rs=1` links no longer mix graph series.

RS homepage/calendar cards say Graph and open it directly, as NR cards do. Bare legacy
RS result links also render the graph; explicit classification URLs preserve table access.
All result views share Stage graph, Classification and Stage times tabs, previous/next
and round navigation. Car/metric selection persists between the RS tabs. Stage times
reuse the shared renderer with RS precision and official printed ranks. Absent source
timing or printed stage positions has a visible unavailable message, not an invented
graph/rank; any valid official Final observations remain available independently.

Each calendar shows only its competition in its own event/round order, with
source-backed dates and undated entries labelled. RS cards can indicate an explicit shared `nrEventId`, but
do not include NR results. Empty RS seasons never borrow NR leaders/results.
RS overrides only primary-accent tokens and the decorative hero track to blue in
light/dark; NR stays red. Logos, series/category and success/warning colors remain.

Calendar-only models display known events/rounds without result statistics or leaders.
Missing-round cards/pages use strict date-only dates compared with South African UTC+02:00
calendar days; scheduled-today/past-awaiting-results are not live-event assertions.
Missing entry summaries are suppressed, while evidenced complete zero, partial counts and
unknown day coverage remain distinct. Empty Sources provides season documents and entry
provenance rather than graph/points claims. See [season-lifecycle.md](season-lifecycle.md).

Profile photos (`photo: "db:<id>"`) are read from `photos/<id>`. Visitors see new results the next time they load or refresh a page.

### Active-rally notice

Only published `site.activeRally.enabled:true` activates the notice. Site settings load independently
of people and seasons, so empty, missing, slow or failed results cannot remove an already loaded
notice. Its DOM lives outside the results render root, covering every public hash route and error
screen. The yellow warning overrides light/dark palette choices without changing the site's
white/red/charcoal branding.

The primary link navigates to the validated official NRC destination in the same tab.
**View past results** and Escape dismiss the native modal and leave the compact reminder, which
has the same official link and **Show rally notice**. Focus starts on the official link, remains
inside the modal while open, and moves to the reminder on dismissal. Controls support keyboard
navigation, narrow screens and scrollable short viewports.

The bypass is stored in `sessionStorage` as the activation ID, rally name and normalized destination,
not in a cookie or persistent local preference. It survives routes and reloads in that tab's visit;
a fresh browser session shows the notice again. Storage denial is logged and falls back to in-memory
dismissal on the current page, with the reminder still present; a reload can show the notice again.
Publication renews the ID for changed enabled settings, including reactivation through undo/restore.
Open pages read new settings on refresh, not by background polling.

The standalone disclaimer deliberately shows only the reminder initially, even without a bypass,
so the warning can never hide the disclaimer. Reading it does not itself bypass the results warning.
Its content remains available without JavaScript or the database. Failed or invalid notice settings
are logged; the disclaimer adds an official-source fallback message instead of blocking its content.
If `public/site` itself cannot be read, the site cannot know whether a rally is active; it never
guesses or serves cached activation settings. The static independent-site disclosure remains.
The admin does not load the notice script; an admin-sign-in link is also available within the modal.
Printing retains the compact reminder and independent disclosure, not the full-page overlay.

All dependent script/style references share a cache version across public, disclaimer and admin pages.
The admin refuses restoration/publication with a mixed or missing rally-notice engine contract.
Deploy compatible code before enabling the feature, and do not use older editors for active settings.

### Optional GA4 and privacy

`analytics.js` shares `NRRallyNotice.sitePromise`, so it adds no Firestore reads and never delays
results or the rally notice. Only valid published enabled settings and an allowed browser preference
load the async tag from `www.googletagmanager.com`. Absent, disabled, malformed or unreadable settings,
storage denial, explicit opt-out, unknown/auth/admin routes and no JavaScript produce no initial GA
requests. The standalone privacy page uses the same non-blocking notice behavior as the disclaimer.

`site.js` reports rendered routes, not history events. The module maps them to generic home,
standings (driver/co-driver), rounds, round (graph/classification/stages), crews, profile, sources and
info categories, plus standalone disclaimer/privacy categories. Full route identities are used
only in memory to distinguish navigation from query/filter rerenders; they never enter the tag's
data layer. Event URLs use only the origin and a synthetic category fragment; titles are fixed,
referrers empty. Seasons, person/round IDs, query strings, search text, DOM titles and account
information are not passed to GA. Before inserting Google's script, the module queues consent
restrictions and **global** `gtag('set', …)` defaults with `send_page_view:false` and sanitized
page location/title/referrer, then `js` and per-stream `config`. Real configured containers can
auto-initialize independently of the per-stream config; delaying these defaults until `onload`,
or using only per-stream suppression, can emit an extra raw-document pageview. The global page
context is updated before each manual view, so default events inherit the latest safe category.
Page context is not pinned in per-stream config, which can take precedence over later global
updates. Queued protective configuration is retained while a pending tag is disabled; deleting
it can defer raw automatic initialization until tracking resumes. No manual events are queued
before the runtime is ready, and the disable flag prevents collection while excluded or opted out.
**The stream's Enhanced Measurement must also be off**, including history-based pageviews,
search, forms, outbound clicks, downloads and other enhanced events; remote settings can otherwise
override this manual-only design. Google automatic session/engagement events and browser metadata
may still exist. Reporting categories are deliberately less detailed than actual rally URLs.

The privacy page owns the `nr-analytics-choice` localStorage control. Opt-out immediately sets
Google's disable flag, clears accessible first-party GA cookies and reloads to unload the runtime;
opt-in reloads too. Storage events propagate choice changes to other open tabs. Failed reads fail
closed; failed writes visibly keep analytics off on that page without reloading and losing the
in-memory choice. No geolocation or consent inference is used. The tag denies advertising storage,
advertising user data and ad personalization; it does not assert an analytics consent grant.
The ordinary automatic-loading policy is not evidence of legal consent or a consent-management system.
Google Signals and ad-personalization signals are disabled. The configured cookie lifetime is one year.
The static notice explains cookies, Google processing, network IP exposure, local preference scope
and the limits of opt-out, without claiming compliance.

Public CSP permits only the Google tag script host and standard/region1 GA collection endpoints
in addition to existing resources. No analytics hosts are added to the admin CSP. Public referrer
policy is `no-referrer`. Tag-load failures warn without retry loops or blocking results. Mocked tests
cannot establish real provider behavior, lawful consent or stream-side settings.

An optional actual-runtime test loads a generated-ID Google tag from a local downloaded snapshot
and intercepts every browser request; see [testing.md](testing.md#optional-actual-google-runtime-check).
The original generated-ID snapshot masked automatic initialization in a configured real stream.
Offline replay of a captured real-stream container, with property IDs substituted in memory,
reproduced that leak and verifies the global-preinitialization fix with all traffic intercepted.
Both snapshots preserve sanitized query/body fields, suppressed HTTP referrers and manual counts
with the fix. First-visit/session flags and cookie/browser identifiers remain expected.
A captured snapshot is not a guarantee about later property configuration. Enhanced Measurement can issue its
own history pageviews or include search terms, form/link metadata and event-specific URL parameters
despite `send_page_view:false`; it must stay off. CSP restricts destinations, not collector payloads,
and the loaded Google JavaScript can read the page. This is not a sandbox or a guarantee against
future SDK changes or subsequently changed stream settings.

## Admin

1. **Sign in.** The Firebase Authentication SDK opens Google's sign-in pop-up. It is the admin's only third-party code, loaded from `www.gstatic.com` and pinned to the version in `FB_SDK` in `assets/admin.js`. The session lasts until the tab is closed.
2. **Load.** The admin lists `docs/`, then reads `config/admins` and `config/revision`. The database refuses all three unless the signed-in email is on the admin list.
3. **Edit.** Changes are kept in the browser until you publish.
4. **Publish.** One atomic commit (Firestore REST `documents:commit`) writes everything at once:
   - **Changed `docs/` documents.** Each must still be the version that was loaded (`currentDocument.updateTime`), or must not exist yet.
   - **Changed photos.**
   - **The whole public copy, rebuilt from the working copy.** For people, only the public fields are copied (id, name, aliases, bio, photo, links).
   - **`config/revision` + 1.** If anyone else has published since you loaded, the commit fails. The admin then reloads their documents and retries once. If you both changed the same document, it stops and explains instead.
   - **One `history/` entry per changed document,** with the text before and after.
5. **Undo.** Stages the "before" versions from one publish so you can review and publish them.
6. **Backups.** Downloads current undeleted working draft documents and current-profile referenced photos as one JSON file (`format: nr-rally-backup`). Not History, config, Auth or all photo records; not a guaranteed point-in-time export. Restoring replaces working docs and stages supplied photos for publication, not a full-project restore. See [recovery.md](recovery.md#precisely-what-the-app-backup-does-and-does-not-do).
7. **Demo mode.** After authorized Google admin sign-in, loads the published copy into a practice simulation that can never save. Returning to live admin reloads working data and discards simulation changes; sign-out or account changes clear the simulation. Public results remain readable without sign-in. It's used for training and pre-season import rehearsal.
8. **Admin list.** `config/admins` is edited under Site & info → Admins. Changes take effect immediately with an updateTime precondition, outside publication/revision/History and app backup.

9. **AI Import.** Admin-operated prompt/file upload in a separate free AI chat, followed by local JSON parsing, evidence/identity/rules review and scoped staging. A pack token correlates the response; a local canonical snapshot detects changed target data. Neither is authorization. Preparation may be downloaded/resumed privately; it is not stored remotely until reviewed data is staged and explicitly published.

Publishing validates the full working dataset at entry and on every retry after rebase. Season/round `_aiImport` metadata is excluded from public bundles. Private working/history/public documents must fit a conservative 1 MiB budget (2 KiB reserved for Firestore metadata), with at most 500 writes and a 10 MiB request. Oversized publication is rejected without partial writes. Undoing a season addition removes its public bundle as well.

## Security model

- **Identity.** Admins use Google accounts, which should have 2-Step Verification on. The site never handles passwords or long-lived keys.
- **Authorisation.** Google's servers enforce `docs/firestore.rules`:
  - `public/` and `photos/` can be read by anyone;
  - everything else is admins only;
  - history is append-only;
  - the admin list can't be emptied.
- **Data location.** Firestore stores the data in `africa-south1` (Johannesburg).
- **The public repository** holds code and documentation only.
- **Content-Security-Policy.** Both pages limit where scripts load from and where data can be sent:
  - the public site may load optional GA from `www.googletagmanager.com` and connect to `firestore.googleapis.com`, `www.google-analytics.com` and `region1.google-analytics.com`, plus same-origin resources;
  - the admin page may also talk to Google's sign-in services.
- **No visitor accounts.** Optional explicitly enabled GA sets analytics cookies and sends minimized categories; absent/disabled settings do not load it. The local privacy preference is not a consent certification.
- **Write atomicity, not cross-request read snapshots.** The publication commits related documents atomically, but independent browser fetches can race a publish. Refresh before cross-document verification. Direct/console writes bypassing revision can defeat normal coordination; photos lack individual working-document version guards. See [recovery.md](recovery.md#4-auth-rules-and-administrative-audit-boundaries).
- **Projection boundary.** People are whitelisted; site/season/round projection strips named private fields, not every possible unknown field. Review new fields for public exposure.

## What depends on which provider

| Provider | Used for | To move away |
|---|---|---|
| GitHub Pages | Hosting the static files | Copy the files to any static host. Add the new web address to Firebase → Authentication → Settings → Authorized domains. |
| Firebase Authentication | Google sign-in | Replace `auth()` in `assets/admin.js`. It returns an object with `ready`, `user`, `signIn`, `signOut` and `token`. |
| Cloud Firestore | Storage | Replace these functions with equivalents for the new store, then restore a backup into it: `liveLoad`, `buildWrites`/`publish`/`rebase`, `loadHistory`, `saveAdmins` and `photoB64` in `assets/admin.js`; `getPublic` and `loadPhoto` in `assets/site.js`. |

Everything else works on plain JSON documents and doesn't change. The data model is the same as before (see [data-model.md](data-model.md)).

## Dependencies

- **Public results/guide UI:** no framework dependency; optional GA loads third-party runtime only when enabled.
- **Admin page:** the Firebase JS SDK (Auth only) from Google's CDN. Before raising `FB_SDK`, read the release notes.
- **Tools and tests:** Node.js 18 or later.
- **Browser tests:** external Playwright and Chromium/Edge. No production install/build is required.

For complete file/contract inventory, deployment/recovery and maintenance invariants start
with [recovery.md](recovery.md). Update this architecture and affected docs/release records
before every push that changes their described behavior.
