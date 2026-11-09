# Recovery and maintainer reconstruction

**Read this first after losing a chat or taking over the repository.** The code and these
linked documents are the persistent design/operations record. They deliberately do not
contain private data, accounts or credentials. A fresh authorized agent can reconstruct
the application and understand the workflows from Git; it cannot reconstruct private
Firestore records, access or source decisions without the private recovery package.

Read [AGENTS.md](../AGENTS.md), [releases.md](releases.md) and the actual checked-out code.
Before **every push**, update affected documentation and recovery/release records.
Older chat checkpoints are provenance, not current configuration or authorization.
No code task by itself permits a live export, direct write, push or deployment.

## 1. Establish what exists before touching it

1. Confirm the repository remote, checkout/worktree, branch, clean/dirty state and exact
   HEAD. Preserve other work. Fetch the intended remote branch without resetting files.
   Compare its SHA to [releases.md](releases.md) and read the intervening diff.
2. Inspect `CNAME`, `.nojekyll`, entry HTML CSP/script references and
   `assets/firebase-config.js`. A Firebase web configuration identifies a project;
   it is not admin authorization. Do not replace installed values with an empty template.
3. Read GitHub Pages settings and latest build status through authorized GitHub access.
   A commit in `main` is not necessarily the deployed build. Check canonical HTTPS
   redirects and current assets separately. Do not trigger a build simply to inspect.
4. Determine privately who owns GitHub, the domain, Firebase and optionally GA, and where
   the backups/source/test kit are. Do not record identities in this public document.
5. If live inspection is authorized, distinguish working data from published data and
   draft edits. Use read-only inspection first. A public snapshot does not contain private
   metadata/History/config and is not a full backup.
6. Read known limitations below before asserting recovery. Keep unavailable components
   listed explicitly; do not fill missing data with test fixtures or guessed rules.

### Repository and provider reference state

At the 2026-11-08 local readiness baseline, remote main and latest built Pages commit were
`6f83f22f517996ed27950f68d67383106f6fc790`. Pages was legacy branch deployment from
`main` at `/`, with `CNAME: nrrally.co.za` and HTTPS enforced. This is a dated observation,
not a permanent deployment assertion; recheck for a later handover.

The canonical public address is `https://nrrally.co.za/`, administration is `/admin/`.
The GitHub repository is `nrrally/nrrally.github.io`; its default Pages address is not the
canonical domain. Firebase/Firestore and Google Auth are separate from GitHub Pages.
The design uses `africa-south1` Johannesburg, standard Firestore default database and a
free-plan deployment; the code cannot prove the current billing plan or cloud location.

The user-authorized season-readiness code release was subsequently verified at
`12503221d3b0cf0575026cae6169e7e2e34520dc`, including Pages build, byte-identical
static assets and canonical HTTPS redirects. See [releases.md](releases.md) for
the verification scope and documentation-only follow-up. Recheck current Pages/main
at handover; synthetic UI smoke does not verify private live data, Auth or deployed rules.

The user subsequently authorized a season-wide guide code release. Its approval, source
edition, validation, compatibility and actual deployment status belong in
[releases.md](releases.md); the approval does not authorize Firebase/provider changes.
The guide remains database-independent and its 2026 edition metadata is for maintainers,
not a visible edition badge. Verify the currently built SHA rather than assuming release.
Its code commit `39f7aef64777ceedabbd1712e8d056a8159e8b56` was verified built,
with matching deployed assets and synthetic browser smoke; the documentation-only
follow-up and limitations are recorded in [releases.md](releases.md). This does not
verify live private data, authentication, rules or future regulations.

## 2. Technical inventory and reading map

There is no package manifest, bundler, application server or compiled output to recover.
The deployment tree itself is the static site. Node is a developer/test dependency only.

| File or group | Recovery purpose and important interfaces |
|---|---|
| `index.html` | Public shell, static no-JS disclosure, CSP, script order, asset cache version |
| `admin/index.html` | Admin shell and stricter no-analytics CSP; independent disclosure outside app root |
| `disclaimer.html`, `privacy.html` | Standalone legal/privacy explanations readable without JS/results; nonblocking active reminder |
| `assets/site.js` | REST published-document loader, `buildSeason` caller, season/hash context, page views, SVG charts, profile-photo loader |
| `assets/engine.js` | Pure parsing/validation/scoring/entry identity and loss logic; CommonJS in tools, `window.NREngine` in browsers |
| `assets/admin.js` | Google auth/session, working draft, editors, import review, `buildWrites`, atomic publish/rebase, undo, backups, admin list |
| `assets/ai-import.js` | Versioned JSON envelope/schema, capability profile, prompts, identity/rule/evidence review, canonical signatures, scoped plan, public projection |
| `assets/getting-started.js` | Bundled original newcomer journey, explicit `edition`, dated official sources; no database dependency |
| `assets/rally-notice.js` | Independent `public/site` promise shared by results/analytics, explicit activation, modal/reminder, visit bypass |
| `assets/analytics.js` | Validated published settings, global-default startup suppression, sanitized manual views, persistent opt-out |
| `assets/firebase-config.js` | Public project connection identifiers; preserve installed config, never substitute another project by guess |
| `assets/styles.css`, `admin.css`, `rally-notice.css` | Responsive light/dark/print styling, original identity and yellow event notice |
| `assets/official-logo.jpg` | User-supplied Northern Regions header logo; does not replace the site's NR SVG or PNG favicons |
| `assets/brand.svg`, `track-motif.svg`, `favicon.png` | Original static identity/artwork and NR favicon assets, not competitor photos |
| `CNAME`, `.nojekyll`, `.gitignore` | Custom domain, unbuilt Pages serving and private-data exclusion conventions |
| `robots.txt`, `sitemap.xml` | Crawl discovery for the canonical root/privacy/disclaimer only; admin remains crawlable so its HTML `noindex` can be read |
| `tools/load.js`, `validate.js`, `report.js` | Read a privately held app backup; validate dataset and enumerate overrides/notes |
| `tools/tests` | Public synthetic unit/VM/browser fixtures; no live write target or real competitor archive |
| `docs/firestore.rules` | Reference access rules; not proof the deployed rules match |
| `docs/data-model.md` | Full field/path mapping and public projection, backup and entry contracts |
| `docs/scoring-rules.md` | Algorithms, precedence, DNF/DNS and supported/unsupported SSR changes |
| `docs/data-entry-guide.md` | Exact import/manual/identity/source/override steps |
| `docs/season-lifecycle.md` | Calendar-only, annual guide review, event and archive/default cutover workflow |
| `docs/architecture.md`, `runbook.md` | Runtime/provider/auth boundaries, configuration and operational incidents |
| `docs/testing.md`, `decisions.md`, `releases.md` | Reproduction commands, historical reasoning, current release scope and verification limits |

### Dependency and compatibility inventory

Public results code uses browser APIs and no framework/CDN dependency. Optional enabled
GA loads Google's runtime; that is third-party executable code, not a sandboxed collector.
Admin uses dynamically imported Firebase **Auth only**, currently pinned by `FB_SDK` in
`admin.js` (inspect its value before an update). Firestore uses REST `fetch`, not the
Firestore or Firebase Analytics SDK. Google popup/auth provider settings are external.

Node 18+ runs pure tests/tools. Browser tests use Playwright plus an installed Chromium/
Edge binary. `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` may select private/external
installations. There is no production `npm install` or `npm run build`. Missing tools can
be installed externally after a missing-tool failure; do not invent blanket CI infrastructure.

All dependent query-string asset versions across public/admin/privacy/disclaimer must
match (current local version in [releases.md](releases.md)). This invalidates normal HTTP
asset caches; it is not an automatic upgrade of already-running tabs. Retire old admin
tabs before new entry/settings data. Contract versions are checked by new admin code:
entry-aware engine/import 2, rally notice 1, analytics 1; AI envelope/backup version 1.
Older already-loaded editors do not gain these guards retrospectively.

## 3. Runtime and data reconstruction

Public startup reads `public/site` and `public/people`, then `public/season_<year>`.
Each document wraps serialized JSON in `fields.json.stringValue` over Firestore REST.
The public site cannot read `docs/`, `history/` or `config/`. Result loading is cache
`no-store` on initial reads; built season models/photos are kept in memory for that page.
Reload to see a newer publication. A profile page loads all offered season bundles.
Missing any required bundle can currently prevent the profile from rendering: it does
not silently drop an unavailable historical season.

`NREngine.buildSeason({season, rounds, people})` derives standings, graph progressions,
result appearances and entry participation. No computed points/leader/graph is persisted.
Raw sports records live only in Firestore. Default settings are not rules: absent active
notice/analytics stays disabled; missing entries are unknown rather than zero; absent
results/documents show explanations. The guide is the database-independent exception:
reference content remains available during setup/outage, not cached results.

Hash paths require no server rewrites. Year-qualified paths select archives; bare paths
use the current in-page season/default. Profile IDs are stable, URI-encoded once and
HTML-escaped, not a name-derived identifier on each render. Guide paths remain shared.
Info documents/events and Sources notes/MSA evidence are selected-season content;
Site & info introduction/social/contact/useful links are global and must be evergreen.

### Search metadata and favicon

Public HTML declares one static canonical per document: `https://nrrally.co.za/`,
`/privacy.html` and `/disclaimer.html`. `/index.html` and every app hash view share the
root canonical; JavaScript must not replace it or add route-specific `noindex`.
The homepage has evergreen descriptive initial title/description and nonexecuting
`WebSite` microdata with the existing site name and canonical root URL. CSP is unchanged;
do not allow inline scripts merely to add JSON-LD. The site remains an independent archive,
not an official organisation. Existing rendered route titles remain unchanged.

`robots.txt` allows crawling, including admin and assets, and advertises the three-URL
sitemap. Admin HTML already supplies `noindex, nofollow`; blocking `/admin/` in robots
would prevent crawlers reading that directive. Neither robots nor noindex is access
control: Firebase rules still protect private data. Do not add fragments, admin,
Firestore documents, fabricated `lastmod` dates or unverified events to the sitemap.
Hash-route results/profiles/guide topics are not reliably separate Google landing pages;
fixing that needs a separately approved routing/hosting approach, not sitemap entries.

The supplied Northern Regions logo is used in the public, admin and static-document
headers at its source dimensions; the light rectangle is retained in dark mode. It is
not a favicon. All HTML shells continue to use the original `brand.svg` and `favicon.png`
NR icons. The logo file is a user-provided asset, not a change to the site's original
favicon/identity artwork. Cache query versions are coordinated as `rallyesport-2` for
the RS feature and logo integration. These favicon hints do not guarantee indexing,
ranking, site-name selection or display; recrawling can take days or weeks.

The small user-authorized SEO code release was verified on Pages at
`0bc94e2eb8a8eab372b33142c3c0dd29b8ff8d59`: 20 served runtime/crawl/brand files
matched Git blobs, root/HTTPS redirects matched, and synthetic live browser smoke
preserved mobile/desktop light/dark routes, guide edition, static privacy/disclaimer,
root canonical/site-name microdata and admin noindex. PNG decoded as 192x192.
Firebase responses/config were synthetic; Auth and analytics were blocked.
This is deployment/implementation evidence, not proof of Google indexing/ranking,
private data, sign-in/rules or official-source currency. See [releases.md](releases.md)
for scope and the documentation-only follow-up; recheck current main/Pages on handover.

### Working/public schemas and default handling

Use [data-model.md](data-model.md) for every field. The main path mappings are:

- `data/site.json` -> `docs/site`; public clone excludes legacy `repo`.
- `data/people.json` -> `docs/people`; published people whitelist id/name/aliases/bio/photo/links.
- `data/seasons/<year>/season.json` -> `docs/season_<year>`.
- `data/seasons/<year>/rounds/<id>.json` -> `docs/round_<year>_<id>`.
- Optional `season.rallyesport` stays inside the same season document; there is no
  separate RS collection, publication path or migration.
- `public/season_<year>` is `{season, rounds}` built from enabled round files;
  `AI.projectPublic` removes `_aiImport`, adds classification finality evidence when needed,
  and removes RS member toggles, invitation flags and applicability/bulletin evidence while
  deriving RS scoring from the private working season and people document.
- `photos/<id>` contains JPEG `b64`/type, publicly readable, not a private draft collection.
- `config/admins` is the verified-email allowlist, separate from Firebase/GitHub owners.
  `config/revision` contains the publication counter/version.
- `history/<group>-<n>` has time, by, message, path, kind and before/after JSON text per change.
  Binary photo contents are not retained there.

**Projection is not a universal private-field whitelist.** People are whitelisted; site
and season/round objects are copied with named private fields removed. Unknown working
fields can leak if added without schema/projection review. Never put private arbitrary
metadata in working sports objects just because the collection itself is private.
AI input is strict, but that does not turn general manual/backup documents into a
universal privacy sanitizer. Audit projections whenever adding fields.

Manual new-season creation clears entry evidence, calendars, documents, notes, classMaps,
MSA confirmations and AI approval, but copies class/points/minimum-start values. They
must be reviewed against actual SSRs; no annual manual approval flag proves verification.
The AI signature/evidence gate is additional and applies only to AI-reviewed metadata.
RS events/results/rules are not copied into a new season. An absent RS field remains a
valid older-season shape and does not change NR scoring or output.

### Sports semantics that must survive recovery

An event is not a scoring round; array order assigns round numbers, IDs link stored records.
A two-day event may have separate NR classifications, but dates alone do not establish them.
People are global profiles; only season apps/entries make them participants in that year.
Entry source sports evidence, coverage and explicit day membership are distinct from starts.
Do not create DNS from absence, map entry classes to scoring overrides, or allocate all days
to a weekend entry. Deduplicate resolved event crews, not just car numbers.

Store printed time/position/class/crew fields unchanged. `scoredClass` overrides the
credited driver's season `classMap`, then printed class. Co-driver classMap affects the
displayed class, not independent co-driver points. `credit` and `noCodriver` change
attributed roles/starts with reasons; `extraStarts` requires official championship evidence
for a start missing from the sheet. DNF counts a zero-point start, DNS does not.
`skipSumCheck` is an explained exception, not a way to hide an import error.

Overall/class scales, class-only categories and minimum starts are values. Best-N/dropped/
weighted rounds, bonuses, membership-filtered scoring, per-class scales, independently
different crew points, new tie-breaks and DSQ/NC/restart policy are not automatically
supported. The exact list is in [scoring-rules.md](scoring-rules.md). Unknown policy needs
an implemented engine change and fixtures; approving an AI checkbox cannot implement it.
Stage cumulative positions stop at the first missing time; printed penalties enter only
at classification Final, not at a guessed stage. Final is an endpoint, not source finality.

RallyeSport is a separate optional season subdocument. Keep RS event/result IDs, classes,
stage selection, official order/status, penalties and derived scores isolated from NR.
Reviewed shared-stage reuse stores a time-value snapshot plus explicit provenance; it is
not a live pointer and never imports NR status, class, position, penalty or points. Public
graph overlays are optional presentation only; RS stage ranks/gaps are not NR ranks/gaps,
and RS graph precision does not change NR calculations. The homepage retains NR leaders
and round cards by default; local section controls expose separate RS tables/results, and
the full calendar includes both using only explicit `nrEventId` links for shared cards.
RS round numbers are independent and RS-only events need no NR calendar entry. The
2026 Rallysprint SSR V1 profile is event-confirmed for the four specified 2026 classifications (June Round 1
despite the July issue date and the Legends, Ermelo and TRAC club classifications). This
is not a general retroactive rule or a future-season confirmation. Other categories are
preserved in event results but block that event's scoring. The user-confirmed DNF rule is
zero RS championship points for a starter who does not finish, while counting that
starter for the 15-starter requirement only with source-backed start evidence or reviewed
non-TEST event count. TEST entries are retained and never score; whether they count toward
the 15-starter minimum remains unresolved when fewer than 15 non-TEST starters are
established. The unspecified non-scoring class, blank SSR 7.4/7.6 details, season
tie-break and SSR 7.5 tie-break implementation remain limitations. Do not broaden these
rules during restore or a future annual copy. See the
[RS scoring boundaries](scoring-rules.md#rallyesport-separate-ruleset-and-records).

The RS member toggle and event invitation/applicability/bulletin inputs are in the private
season document and its History/backup. The public projection contains only source-backed
RS results plus derived public points/tables; never restore a hand-edited public projection.
The public scoring snapshot is not trusted by private/admin calculations, and demo mode
cannot reconstruct its private eligibility inputs. Normal app backup restore and undo
replace the season as a whole; an RS-specific loss/replacement warning precedes mutation
and cancellation leaves the draft unchanged. Check RS evidence after restore in ordinary
review. Profile merges carry a non-scoring decision across verified profile IDs in every
season without changing NR results. The isolated local feature work has made no Firebase,
History, rules or provider changes.

## 4. Auth, rules and administrative audit boundaries

Google sign-in authenticates; the allowlist and deployed Firestore rules authorize.
The reference rules require verified email and its lower-case membership for protected
collections. Public bundles/photos are intentionally readable. History allows create/read,
not update/delete for site admins; unknown collection paths are refused.

Client UI guards and simulation sign-in are not secrecy. JavaScript and interface code
are public; authorized simulation reads published data and cannot save. The server rules
are the actual private-data boundary. Node/Playwright mocks are not proof of deployed
rule enforcement, real Google popup behavior, IAM or external recovery credentials.

Normal **Review & publish** performs a single Firestore `documents:commit` of:
changed working documents with `updateTime` or nonexistence preconditions, changed photos,
rebuilt public documents, deleted removed-season bundles, revision+1 with a version
precondition, and new attributed History entries with nonexistence preconditions.
On a revision clash, it reloads unrelated working changes and retries once, revalidating;
a same-document edit is a conflict, not last-writer-wins.

Atomicity is a **write** property. A browser making several independent public reads is
not guaranteed a common read timestamp across them. If a publish races page loading,
refresh before comparing cross-document data. Photos also lack the same individual
version guard as working documents; console/server writes that bypass revision can evade
normal coordination. Never treat a global counter alone as protection against every writer.

**Exception: Site & info -> Admins saves immediately.** `saveAdmins` uses the allowlist's
updateTime but does not go through Review & publish, bump revision or add normal site
History. App backups omit it. Record this configuration change privately and verify access.
Other project ownership/Auth/rules/DNS/GA-console changes are outside normal site History.
Do not describe every Firebase operation as undoable by the app.

### Future authorized direct Firebase operation

Prefer normal admin publication. If a user explicitly delegates a direct sports/settings
write to Copilot, first obtain the correct project/account access privately and define
the exact changed objects. Do not use console edits that leave projections/History stale.

1. Read fresh working/public/revision documents and relevant photos/config with their
   server updateTimes. Preserve private before snapshots, all source artifacts and the
   requested user attribution. Pause coordinated writers if snapshot consistency needs it.
2. Validate the intended full dataset using shared engine/import rules and inspect a
   before/after diff. Retain unrelated edits; produce the same public projection as admin.
3. Build one bounded atomic commit with changed-document and revision preconditions,
   public updates, any intended deletions, and append-only History before/after entries.
   Use the exact label **GitHub Copilot (direct Firebase)** in the message and attribute
   `by` to the authorizing user, not an invented bot/admin identity. Keep attribution private.
4. Guard public/photo/config versions too when relevant to the direct operation.
   Check safe document/request/write limits (conservative 1 MiB per document with reserve,
   10 MiB request, at most 500 writes). Never split an inconsistent restore across commits
   merely to fit limits; plan a separately authorized migration/recovery instead.
5. A stale version rejects the whole commit. Reread and review; do not blindly retry
   with removed preconditions or overwrite a concurrent edit.
6. Verify the atomic result read-only, public/source behavior and attributed History.
   Store the private recovery snapshot/source evidence outside Git; update operational
   docs and release records before any subsequent authorized push.

If tooling/permissions cannot perform an atomic audited change, stop. A later History
write is not equivalent. Project-wide configuration, allowlist, photos and History recovery
may exceed the app's history model and require an explicitly designed owner-level plan.

## 5. Private recovery package

Keep this package encrypted/access-controlled, outside the public checkout, with at least
two authorized custodians and a tested retrieval/restore procedure. The repository records
the categories, not real file paths, people, account emails, tokens or access challenges.

| Component | Why the public repository/app backup is insufficient |
|---|---|
| App backup with timestamp/hash and published-vs-draft label | Contains sports docs and referenced photos, not full project state |
| Consistent full database snapshot/export or privately validated equivalent | Needed for private History, config, all photos/orphans, unknown docs and reliable versions |
| Original official PDFs/calendar/SSRs/bulletins/MSA points | URLs can disappear; printed data and overrides require actual source artifacts |
| Private decision/provenance notes | Explain identity/credit/class/extra-start/exception choices and consent |
| Access register/recovery procedures | GitHub/org, domain registrar/DNS, Firebase/GCP owners, allowlisted admins and GA custodians |
| Auth/project/provider configuration inventory | Auth users/providers/authorized domains, rules, web config, IAM, billing/quota/location, GA stream settings |
| DNS/Pages configuration record | Zone/verification/TLS/redirects and unrelated mail records must survive a domain rebuild |
| Private test kit and representative source fixtures | Reproduces verified actual-season arithmetic/import layout regression |
| Authorized offline Google runtime snapshots | Reproduces captured-container startup behavior; never commit real property scripts/IDs |

App backups include `exportedBy` and can contain private metadata; even name-only official
sports data can be personal. `.gitignore` is not sanitization. Do not paste backups into AI
services, put them in issues/PRs, or attach them as public debugging fixtures.

### Precisely what the app backup does and does not do

`backupText` serializes the browser's current undeleted `A.docs`, including unpublished
changes. It collects staged photo bytes or fetches existing DB photos referenced by current
profiles. It does **not** list/export all `photos/`, History, allowlist, revision,
public projections, Auth users, rules, project owners/configuration, DNS or GA-console state.
Photos not referenced by those profiles are not included. Photo reads can be later than
the working-data load; this is not a guaranteed point-in-time database snapshot.

`readBackup` checks JSON, format and required site content; it is not a full versioned
project-export validator. Publication then validates the working dataset. `stageAll`
replaces working docs, marking ones absent from the backup deleted, and stages supplied
profile photos; it is **not** an exact whole-photo-collection prune/restore. It has an
extra loss confirmation for reduced/replaced entry evidence. Restoring a backup may
remove analytics/active settings or recover an old enabled configuration when published.
Review every site diff explicitly.

History stores before/after JSON of changes, not binary photo payloads. Undo stages the
selected group's before versions against today's working copy, and a later publish makes
a new audit group. Undo of an older group can erase later edits to those same documents.
It is not a reverse transaction guarded against the selected historical after state.
Undo can remove a newly referenced photo but cannot resurrect its old bytes without a backup.

## 6. Safe restoration and rollback

### Application data restore into an existing intact project

Only after explicit user authorization:

1. Confirm project, allowed admin identity, deployed compatible code and target scope.
   Do not import a fixture to "see if it works." Preserve current private working/public/
   revision/config/photo state before replacement; coordinate writers and record versions.
2. Verify the chosen backup's provenance/hash, timestamp, whether drafts are included,
   complete season/person/entry coverage and required photo bytes. Run
   `node tools\validate.js <private-backup.json>` and
   `node tools\report.js <year> <private-backup.json>` from the checkout.
3. Rehearse in mocked tests or authorized simulation; simulation is published-data based,
   not a full recovery dry run. Check restored sources, contracts, rules and configured IDs
   privately. Use a specifically authorized isolated test project for a cloud restore
   rehearsal only if needed; never silently select it or copy personal data into a public fixture.
4. In **Dashboard -> Backups -> Restore from a backup**, select the app-format file.
   Review entry-loss warnings and every working diff, deletions, default year, sources,
   classMap/credit exceptions, analytics/notice settings and photo availability.
5. Use **Review & publish** only after full review. Its atomic commit refuses stale
   versions and oversized data; conflict means reload/review, not force overwrite.
6. Verify the live public bundles, classifications/points/profiles/source status and
   new History read-only. Take a fresh authorized private backup and keep the pre-restore one.

### Lost/empty project or full provider reconstruction

Recover owners/account access first. Recreate the project/Google Auth/domain/rules bootstrap
under owner authorization using [README](../README.md) and the private config register.
An app backup can repopulate sports docs and referenced photos in a properly configured
empty database; it cannot restore deleted Auth users, owner roles, History, allowlist,
revision chronology or GA properties. New-public reconstruction from working docs is
deliberate publication, not restoration of the exact historic published state.

A full database/Auth/provider restore needs a separately reviewed owner-level plan:
verify snapshot readTime/versions, record existing target state, avoid overwriting
append-only History, restore compatible project/security/config and verify access.
Privileged server tools can bypass client rules; they must not be treated as permission
to silently replace History or invalidate concurrent work. If the full restore cannot fit
one atomic audited commit, do not claim that the app provides atomic full-project recovery.
Plan staged recovery with controlled outage/readers, documented checkpoints and authorization.

If private data/source backups are missing, recover only available code/config and state the
loss. Official PDFs can support a new carefully reviewed transcription, not perfect recovery
of all prior identity/override/consent/history decisions. Never derive those from imagination.

### Code rollback without data rollback

Inspect the diff and data contracts before reverting. Roll back to a compatible v4 code
commit by a new reviewed commit; preserve firebase config and CNAME. Do not deploy v1-v3
bundled-data versions or an editor predating current entries/notice/analytics.
Deploying old code does not roll back Firestore. Likewise History undo does not roll back
HTML, guide edition, GA stream configuration or provider rules.

Keep analytics disabled during an incompatible privacy regression; disabling is a separately
authorized settings publication and affects newly loaded pages, not cached open tabs.
Verify Pages built the approved rollback SHA and domain/HTTPS/auth/assets. Record the change
in [releases.md](releases.md) before pushing and its actual deployment after verification.

## 7. Hosting/domain/deployment reconstruction

GitHub Pages serves the repository root from main; `.nojekyll` bypasses Jekyll and no build
command is required. Changing code on a feature branch is local review, not deployment.
The repository CNAME and Pages settings must agree; Pages settings can themselves create
a main-branch CNAME commit. Fetch/reconcile it instead of overwriting it.

For a separately authorized domain change, verify ownership for the organization through
GitHub Settings -> Pages and its generated TXT challenge before pointing traffic. Obtain
the actual challenge from GitHub, not a guessed value. Preserve domain verification.
In repository Settings -> Pages configure the custom domain, then update only required
DNS records using the registrar's actual interface. Preserve MX/TXT/mail/other records.
Use current [GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
and [verification instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
Do not use a historic nameserver/IP record as a current requirement.

Add canonical/applied www domains to Firebase Authentication authorized domains while
retaining required existing domains and the installed Firebase `authDomain`; do not assume
the authDomain must become the custom site hostname. Verify DNS propagation, apex/www
routing, certificate issuance and HTTPS enforcement independently. Pending certificate
is not success. No need to change Firebase Hosting: this site is hosted by Pages.

### GitHub credential mismatch: safe process-scoped strategy

The app-provided `GH_TOKEN`/`GITHUB_TOKEN`, gh's stored account and Git Credential Manager
can select different identities. A successful `gh api` read does not prove a git push has
write permission. Verify the intended authorized identity with `gh api user`, then repository
permissions privately; do not publish identity dumps or token output.

If an explicitly authorized account should be used rather than an injected token, remove
the conflicting token variables only inside the command process. Use the authorized
stored gh account/session without globally switching GCM or changing global git settings.
For an authorized push, the proven helper strategy is command-scoped:

```powershell
# Only after explicit push approval and verified gh identity/permissions.
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin <reviewed-branch>
```

The empty helper clears the inherited helper for that invocation; gh provides credentials
without printing a token. Do not run it as a diagnostic probe, put tokens in command arguments,
disable TLS, force-push, or infer approval from this example. This task's release is local only.

## 8. Analytics/notice recovery and diagnosis

Follow [runbook.md](runbook.md#google-analytics-4) and
[testing.md](testing.md#optional-actual-google-runtime-check). Analytics settings reside in
published site config and are staged/audited like other site changes, not hard-coded.
They are publicly visible in a browser but still must not enter public docs/fixtures.
Absent/disabled/malformed/unreadable config or excluded routes must not load GA.

The old startup sequence waited for `onload` to configure the stream. Captured configured
containers auto-initialized earlier and sent a raw URL/title/referrer pageview. Queue global
`send_page_view:false` plus safe page context **before** js/config/script insertion; update
global category context on navigation and do not pin stale per-stream context.
Do not discard suppression defaults on an excluded route while the tag is pending.
One initial manual view and sanitized query **and** body fields are required; a safe
effective event cannot excuse an unsafe duplicate/raw query.

The generated-ID Google runtime did not reproduce every configured-container behavior.
An authorized offline captured-container replay, IDs replaced in memory, is stronger
snapshot-specific evidence. All browser requests must be intercepted, collection fulfilled
locally, unexpected hosts aborted, service workers blocked and private IDs not printed.
Never fetch/forward a real stream merely to rerun local tests; keep captured scripts private.
No snapshot proves future remotely changed Enhanced Measurement, connected destinations,
server processing, legal consent or Realtime. Keep all Enhanced Measurement off, verify
live configuration separately after intended deployment and treat provider changes as review.

Privacy opt-out uses browser-local `nr-analytics-choice`; it sets disable flags, removes
accessible first-party GA cookies and reloads to unload the tag. It cannot recall sent
requests, delete GA-stored data, or impose a preference on every browser. Storage failures
are surfaced/fail closed. Global theme preference is unrelated.

Active-rally notice uses `site.activeRally`, explicit enabled/name/validated NRC HTTPS
destination and activation ID, not calendar status. It reads site independently and retains
its modal/reminder outside the app render root. The bypass is visit/tab `sessionStorage`,
renewed activation shows again; disclaimer/privacy start with nonblocking reminders.
Unknown site settings on outage cannot prove whether an event is active. Admin is exempt.

## 9. Failure diagnosis order

| Symptom | Read-only first checks | Safe next action once authorized |
|---|---|---|
| Missing results but guide works | Connection config, published/site and season availability, network/status, quotas | Restore publication/connection, not bundled fallback |
| Empty new year shows no entrants | Actual entry evidence/scopes and selected year | Obtain official entries; do not reuse archive people as entrants |
| Past round awaiting results | Calendar date validity, official cancellation/postponement/classification source | Update sourced facts/import whole classification |
| Info opens wrong year | Hash prefix, season selection, global useful links versus season docs | Correct year-specific documents/navigation |
| Old guide differs from SSRs | Maintainer edition metadata, labelled sources and actual official new editions | Review/rewrite dated copy; do not relabel old content |
| Wrong points/crew/start | Printed source, class/credit precedence, DNS/DNF/extraStarts, MSA evidence | Explain corrections through reviewed overrides |
| Import refuses PDF | Known layout, selectable text, all page/row counts | Use manual/spreadsheet route or implement tested parser |
| AI rules/signature block | Missing sources, unsupported policy or changed signed settings | Actual rule review or developer implementation, never fabricated support |
| Publish conflict | Fresh document updateTimes and revision, same-document versus unrelated edit | Preserve private draft, rebase/review; never remove guards |
| Oversize commit/bundle | Write/request/document budgets | Plan smaller complete task or storage migration; do not partial-publish broken season |
| Google login blocked | Popup, authorized domain, verified account, allowlist and deployed rules | Owner/admin correct specific config; do not broadly relax rules/CSP |
| Unexpected analytics request | Stream Enhanced Measurement, startup queue order, raw query/body/referrer, opt-out | Authorized disable and tested fix; avoid real-ID fixtures |
| Site changes not visible | Latest Pages build SHA, HTML version, browser model cache, published versus working | Refresh/redeploy or publish only with separate approval |
| Photo absent after undo | History has no bytes, profile db reference, backup photo coverage | Recover authorized private photo bytes/consent |

## 10. Reproduce and hand over honestly

Run public synthetic units and applicable mocked browser tests from [testing.md](testing.md).
They cover calendar-only/unknown/known-empty/entry-only behavior, dates/timezones, archived
seasons, guide outage/navigation, entry deduplication, auth/session, atomic publication,
backup/undo/conflict flows, notice and analytics privacy. No production writes or analytics
are needed. Actual 2026 arithmetic/import fixtures remain private; missing private tests
must be reported, not replaced with a claim of full real-data verification.

For a new handover, record reviewed commit/base, tested commands/results, unavailable private
components, guide edition, contracts, deploy/publish/restore permissions and remaining tasks
in the release record. Give the authorized custodian the private package through an approved
private channel. Keep repository docs current at every push so recovery does not depend on
the next chat surviving. These instructions are comprehensive about the solution's observable
design and workflows, but cannot promise seamless reconstruction of lost private state.
