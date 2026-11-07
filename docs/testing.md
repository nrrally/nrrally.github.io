# Testing

## Quick checks (anyone, with Node.js 18 or later)

Download a backup first (Admin → Dashboard → Backups), then run:

```
node tools/validate.js nr-rally-backup-2026-11-06.json      # checks every season. Exits with code 1 if there are errors.
node tools/report.js 2026 nr-rally-backup-2026-11-06.json   # lists every override and note, for review
```

The admin runs the same per-round checks before it lets you publish.

## AI Import regression checks (synthetic, no live database)

```
node --test tools/tests/ai-import.test.js
node --test tools/tests/entry-participation.test.js
node tools/tests/ai-import-e2e.js
node tools/tests/site-theme-e2e.js
node --test tools/tests/rally-notice.test.js
node tools/tests/rally-notice-e2e.js
node --test tools/tests/analytics.test.js
node tools/tests/analytics-e2e.js
node tools/tests/admin-access-e2e.js
```

The first command needs Node only. The browser test needs an existing Playwright installation (`PLAYWRIGHT_MODULE` may point to it). It serves the checkout locally, supplies fake authentication and intercepts Firestore requests with an in-process mock; other external requests are refused. Never run synthetic imports against live Firebase.

The admin access browser test covers signed-out and non-admin routes, authorized simulation and live
admin, reload, sign-out, authorization failures and delayed requests. It uses synthetic data and
intercepts all network access. The hosted app and its simulation are client-side: anyone can inspect
or download the public JavaScript. Interface gating is not code confidentiality. Private data is
protected by the deployed Firestore rules, not by hiding the interface; `docs/firestore.rules` specifies
verified-email allowlist checks for working data and writes. Verify the deployed rules separately.
It also verifies that enabled published analytics never loads the tag in live admin or simulation,
and that simulation analytics edits cannot change published settings.

The public theme test uses synthetic published documents and read-only mocked requests. It checks public routes at 320, 390, 768 and 1440 pixels (home, driver/co-driver standings and filters, rounds, all three round tabs, crews, profiles, info, season-specific sources and missing-page/round/profile states), saved light/dark preferences, primary-button WCAG AA contrast, final/provisional/unclear headings (including legacy page-count headings), consistent source badges, printed disclosure, loading/empty/unconfigured/database-failure links and JavaScript-free disclaimer access. The AI Import E2E also checks the persistent disclaimer link on dashboard, backup import, AI Import, results editing, calendar, competitors/profile editing, season settings, site info, history and review/publish. The link is static outside both apps' render roots, so route changes and sign-in/error rendering cannot remove it. These checks do not certify all WCAG criteria or replace visual review.

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
separately downloaded runtime for **only** the generated all-A test ID. Do not download or use a
real property's tag, stream or configuration in this test. Keep Google's script outside the repo;
it is not a dependency to commit, and can change independently of this code.

PowerShell example (use an existing Node/Playwright installation):

```powershell
$fake = 'G-' + ('A' * 10)
curl.exe --fail --silent --show-error ("https://www.googletagmanager.com/gtag/js?id=" + $fake) --output <scratch>\synthetic-gtag.js
$env:GA_SYNTHETIC_RUNTIME = '<scratch>\synthetic-gtag.js'
node tools\tests\analytics-runtime-e2e.js
```

The only external download is this generated-ID script. Every browser request is intercepted:
local assets and Firestore are synthetic, the downloaded runtime is fulfilled locally, collection
is recorded and fulfilled without forwarding, and all other destinations are aborted. Service
workers are blocked. The script refuses any runtime containing another GA4 Measurement ID.
It prints a content hash so a passing run identifies the unpinned snapshot. Allow about three
minutes: the actual SDK batches subsequent collection requests, so immediate mock-style timing
is insufficient.

The check verifies one initial view, route/profile/round/history navigation, no query/replaceState
duplicates, standalone privacy/disclaimer, category-only `dl`, fixed `dt`, empty `dr`, suppressed
HTTP Referer, no User-ID or private synthetic markers in any captured request, no additional CSP
requirements, and opt-out unloading/cookie removal. Click/form/scroll probes do not produce
enhanced events with the downloaded fake-container runtime. A deliberately issued
`user_engagement` event probes actual SDK default parameters; it is not evidence that the fake
container auto-fired engagement. First-visit/session flags and browser/cookie identifiers still
appear, as expected for analytics.

On 2026-11-07 the actual-runtime check passed with snapshot SHA256
`affda88a3989d647cf5aafe9313025cad825bff95f47f3e716d0d0335878f573`.
No raw query, DOM title, profile/round identifier, page referrer or HTTP Referer escaped in the
captured traffic, and no CSP expansion or production code change was required.
This does **not** test a real stream's remotely supplied Enhanced Measurement, automatic-event
configuration, connected destinations, server processing or Realtime. Turning on history/search/
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

- **Before changing `assets/engine.js`:** run the engine regression. Any change in 2026 points is a bug, unless a deliberate data correction explains it. If one does, record it in `decisions.md`.
- **After changing `assets/admin.js` or `assets/site.js`:** run the end-to-end test.
