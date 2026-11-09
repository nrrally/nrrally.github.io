# Data model

All data is JSON documents.
- **In the admin and the tools,** each document has a path (`data/site.json`, `data/seasons/2026/rounds/R4.json` and so on).
- **In the database,** each path maps to one document id, and the JSON is stored as text in the field `json`.

Data is stored in a stable layout (`prettyJson` in `engine.js`), so the history's before and after texts stay readable.

| Path (admin, tools, backups) | Database document (working data) | Published copy (read by the website) |
|---|---|---|
| `data/site.json` | `docs/site` | `public/site` (without `repo`) |
| `data/people.json` | `docs/people` | `public/people` (only id, name, aliases, bio, photo, links) |
| `data/seasons/<year>/season.json` | `docs/season_<year>` | `public/season_<year>`: `{ "season": …, "rounds": { "R1": …, … } }` |
| `data/seasons/<year>/rounds/<id>.json` | `docs/round_<year>_<id>` | included in `public/season_<year>` |
| a profile photo | `photos/<personId>`: `{ b64, type }`, a JPEG up to 640 px | the same document (public) |

Other database documents:

| Document | Contents |
|---|---|
| `history/<publish>-<n>` | `{ group, at, by, message, path, kind, before, after }`: one per changed document per publish. `before` and `after` are the document's text, or `null`. Photos are listed but their content isn't kept. Admin-list saves do not create these entries. |
| `config/admins` | `{ emails: ["name@gmail.com", …] }`, in lower case. |
| `config/revision` | `{ n, at, by }`, increased by every publish. |

**AI preparation metadata.** Imported season and round documents may contain `_aiImport`. It is admin-only: retained in working data, private backups and history, and removed from the public projection. Season metadata stores version, supported rule declarations and cited sources, approval and a canonical settings/calendar signature. Changing those settings invalidates approval until a human reviews them. Round metadata stores reviewed source/coverage/evidence; it never contains computed points. Old seasons without this field retain legacy behavior.

**Import contract.** `assets/ai-import.js` exports `contract` with the exact version-1 nested schema, evidence-reference conventions, supported policy and limits. The envelope is `{format:"nr-rally-ai-import", version:1, task, target:{year,roundId}, baseToken, sources, rules, season, competitors, rounds, issues, coverage, evidence}`. Unknown properties are rejected. `season`/`rules` are null for competitor/results tasks. Competitors use task-local references; the site resolves them and allocates stable profile IDs. Results use those references, explicit statuses and printed times, not executable instructions, arbitrary database paths or precomputed points.

A saved local preparation file has `format: "nr-rally-ai-draft"`, version 1 and `state` containing task/target, source checklist, returned text, pack token and a local base snapshot. It is not a database backup, contains private context and cannot be restored through the backup workflow.

Result coverage requires `classification: {batchIndex:1, totalBatches:1, pages:[...], totalPages, totalRows}`. Pages must list the whole source document exactly once, and totals must reconcile with all result rows. Multiple or incomplete page/batch responses must be combined outside the site before import; they cannot replace or append to a round individually. Other coverage kinds omit this field. Round review metadata records `finalityAcknowledged` when the admin explicitly acknowledges a provisional or unclear classification; it is not an official-final confirmation.

The public projection adds `finalityUnclear` for AI-imported rounds whose status is neither explicitly final nor provisional. Public classification badges then say finality is unclear, rather than assuming final; private review metadata still remains excluded.

**Backups.** A backup downloaded from the admin is one JSON file:
```
{ "format": "nr-rally-backup", "version": 1, "exportedAt": "…", "exportedBy": "…",
  "docs": { "data/site.json": {…}, "data/people.json": {…}, "data/seasons/2026/season.json": {…}, … },
  "photos": { "<personId>": "<JPEG as base64>" } }
```
`tools/validate.js`, `tools/report.js` and the test kit read backups directly.

The backup contains the current browser working draft, not necessarily published data,
and only supplied/referenced profile photos. It excludes History, config/admins,
revision, public snapshots, orphan photos, Auth, rules and provider configuration.
It is not a point-in-time full-project export. Restore stages whole working-document
replacement, entry-evidence-loss review and supplied photos; it does not prune/restore
every photo record or recreate external accounts. See [recovery.md](recovery.md#precisely-what-the-app-backup-does-and-does-not-do).

## Conventions

- **Times** are strings exactly as printed: `"m:ss.s"` for stage times (e.g. `"12:36.3"`), and `"h:mm:ss.s"` or `"m:ss.s"` for totals and penalties.
  - `null` or `""` means no time.
  - The engine converts times to seconds, rounded to 0.1 s (`parseTime`).
- **Classes** are stored upper-case with no spaces (`"NR1"`). `normClass` removes spaces and upper-cases, so `"NR 1"` becomes `"NR1"`.
- **People** are matched by name, ignoring case, accents and repeated spaces.
  - `"Jan van der Merwe"` and `"Jan Van Der Merwe"` match the same profile.
  - Other spellings go in that profile's `aliases`.
  - Classification-only names that match no profile retain the legacy automatic profile creation on publish.
    Unresolved entry-list names require an explicit existing-profile/verified-alias or new-person decision first,
    even when also printed in a classification. This is checked again after revision rebase.
- **Ids** are normally lower-case slugs (e.g. `jan-van-der-merwe`), but existing non-slug profile IDs remain supported.
  Public profile links URL-encode the ID and HTML-escape the attribute, then decode the route segment once.
  A person's id never changes when they're renamed.

## site.json

| Field | Type | Meaning |
|---|---|---|
| `siteName`, `tagline` | string | Header name and the strapline on the home page |
| `currentSeason` | number | The season the site opens on |
| `seasons` | `[{year, label}]` | Every season the site offers (each needs `seasons/<year>/season.json`) |
| `info.intro` | string | Intro text on the Info page |
| `info.documents` | `[{title, url, note}]` | "Useful links" on the Info page |
| `social` | `[{network, label, url}]` | `network` is one of facebook, instagram, whatsapp, youtube, tiktok, x, website. An empty `url` shows "Coming soon". |
| `contact` | `{email, note}` | Shown on the Info page. An empty email is hidden. |
| `repo` | `{owner, name, branch}` | Not used any more (it was used when the data was kept on GitHub). It isn't published. |
| `activeRally` | optional `{enabled, name, url, activationId}` | Manually controlled public active-event warning. Absent means disabled. Included in `public/site`. |
| `analytics` | optional `{enabled, measurementId}` | Optional public GA4 background tracking. Absent means disabled. Included in `public/site`. |

`activeRally.enabled` is a boolean, `name` is at most 120 characters (non-empty when enabled),
and `url` must be HTTPS on exactly `nrcsa.co.za` or `www.nrcsa.co.za`, without credentials or
a custom port. Official event paths, queries and fragments are supported. `activationId` is
an opaque 8-80 character identifier (`A-Z`, `a-z`, digits, `_`, `-`), generated by the admin.
It is a dismissal scope, not authentication. Calendar dates, season status and entry lists do not
enable the notice. There is no initial database migration or live write.

These settings use the ordinary whole-site staged edit, atomic publication, revision rebase,
History and backup/restore flows. Publication of changed enabled settings renews `activationId`,
including restore and undo, so a visitor who bypassed an earlier activation sees a fresh notice.
Unchanged active settings retain their ID on unrelated publications. Restoring a legacy backup
without this field disables the notice only when published; review that site diff deliberately.
Concurrent site edits conflict rather than overwrite; unrelated-document rebase retains the
latest site settings. No collection, Firestore rule, result or scoring change is involved.

`analytics.enabled` must be a boolean. `measurementId` must be a string matching `G-` followed
by exactly 10 uppercase ASCII letters or digits; an empty string is allowed only when disabled.
Unknown fields, non-GA4 IDs, whitespace and malformed values block publication, including after
revision rebase or backup restore. Validation messages do not echo supplied IDs. No real ID belongs
in source, fixtures, documentation or development logs. The Measurement ID is public in the
published settings and browsers; it does not grant account or database access.

Analytics uses the same whole-site staged editing, atomic working/public/revision/History commit,
backup and undo as other site settings. Database History intentionally retains the site's before/after
settings, including the ID, and attributes publication to the signed-in admin. Same-site edits
conflict; unrelated-document rebase retains and validates the latest configuration. Restoring a
legacy backup removes analytics only when published; undo can restore its previous configuration.
No migration, live initial write, new collection or Firestore rule is required. Old tabs read changes
only on refresh. Visitors' `nr-analytics-choice` (`on`/`off`) is browser-local, never a database setting.

## people.json

```json
{ "people": [ { "id": "jan-van-der-merwe", "name": "Jan van der Merwe", "aliases": ["Jan Van Der Merwe"],
                "bio": "", "photo": "", "links": { "instagram": "https://…" } } ] }
```

- `photo` is empty, `db:<id>` (a photo stored in the database under `photos/<id>`), or an `https://` address.
- `links` keys: instagram, facebook, youtube, tiktok, x, website.
- Bios, photos and links are only published with the person's consent.

## seasons/<year>/season.json

| Field | Meaning |
|---|---|
| `year`, `championship`, `shortName` | Identity of the season |
| `status` | `planned`, `in progress` or `complete` |
| `pointsScale.overall` | Points for 1st, 2nd, 3rd… overall. The 2026 scale is 20 down to 1. |
| `pointsScale.cls` | Points for 1st, 2nd, 3rd… in class. The 2026 scale is 30, 26, 23, 20, 18, 17 … 3. |
| `minStarts` | Starts needed to be eligible (2026: 5) |
| `classes` | `[{id, desc, classOnly?}]`. `classOnly: true` (e.g. NR0) scores class points but no overall points. |
| `classMap.drivers` / `classMap.codrivers` | `{personId: class}`: the class a person is scored in all season, when it differs from what a sheet prints |
| `msa` | `{label, url, generated, confirmedRounds[]}`: the official standings, and which rounds' points have been checked against them |
| `documents` | `[{title, kind, date, url}]`: SSRs and other documents for the Info page |
| `events` | `[{id, name, short, dates, venue, surface, links:{results, entryList, srs, noticeboard, spectatorGuide}}]` |
| `rounds` | `[{id, eventId, day, date, results}]` in calendar order. A round's number is its position in this list. `results: true` means a round file exists; the site only loads rounds with this flag. |
| `notes` | Season-level data notes, shown on the site's "Sources & data notes" page |
| `rallyesport` | Optional, independent RS events/classifications and RS-only decision inputs; absent means no RS data. See below. |

Round `date` is strict date-only `YYYY-MM-DD` for calendar display; invalid/blank dates
remain unconfirmed, not normalized to another day. Event `dates` is supplied display
text, never parsed to infer round allocations. Public calendar status compares to
South African UTC+02:00 days, not the visitor timezone. Neither dates nor season status
activate the rally notice. Unknown venue/surface/links/day allocation stays blank.
Manual new-season settings are copied placeholders with no persisted rule approval;
classMap, MSA confirmations, notes/documents/events/results/entry lists start empty.
See [the yearly workflow](season-lifecycle.md).

Document `date` is a supplied string: the manual editor offers an ISO date input,
but the AI schema accepts strings and older/imported/backed-up sources may contain
free-form edition/date text. Info formats valid ISO dates and otherwise preserves the
escaped supplied text verbatim, including malformed ISO text rather than normalizing
it or claiming a scheduled date. Missing dates have no "Dated" prefix. This source
display does not relax strict round schedule/status validation.

## Optional RallyeSport season layer

`season.rallyesport` is an optional object in the same versioned season document:

```json
{
  "ruleset": {
    "code": "clubman-sprint-2026-v1",
    "year": 2026,
    "title": "2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint",
    "version": 1,
    "issueDate": "2026-07-09",
    "sourceUrl": "https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf"
  },
  "events": [{
    "id": "rs-event-id",
    "name": "Printed RS event name",
    "dates": "Source-backed display text",
    "nrEventId": "optional-explicit-NR-event-id",
    "rulesetConfirmed": true,
    "rulesetEvidence": "Event-specific applicability evidence",
    "countsForChampionship": true,
    "championshipEvidence": "Event-specific championship evidence",
    "doublePoints": false,
    "doublePointsEvidence": "Required only when doublePoints is true"
  }],
  "results": [{
    "id": "rs-result-id",
    "eventId": "rs-event-id",
    "title": "Official classification",
    "status": "Final classification",
    "nrRoundId": "optional-explicit-NR-round-id",
    "source": { "file": "official-file.pdf", "url": "https://example.com/official-file.pdf" },
    "notes": [],
    "stages": [{ "id": "ss8", "label": "SS8", "nrStage": "optional-exact-NR-stage-id" }],
    "entries": [{
      "car": "1", "driver": "Stable-name-or-alias", "codriver": "Stable-name-or-alias",
      "class": "RS2", "status": "classified", "pos": 1, "classPos": 1,
      "times": ["01:23.4"], "stagePos": [1], "penalty": null, "total": "01:23.4",
      "timeEvidence": [null], "notes": [], "invited": false
    }]
  }],
  "nonScoringPeople": ["stable-person-id"]
}
```

Only the exact reviewed 2026 SSR V1 ruleset profile is currently recognized, and only
for 2026. Event-specific applicability is separately recorded; the user confirmed it
for the 2026 club classifications at Legends, Ermelo and TRAC, and for the independent
June Round 1 classification despite the July issue date; this does not establish
applicability to future seasons or other competitions. No real event/results are
preloaded. `nrEventId`, `nrRoundId` and
each `stages[].nrStage` are optional independent associations; stage arrays are explicit
subsets and are never aligned by date or position.

For SSR 7.2's five-round double-points exception, `startDate` and
`doublePointsBulletinDate` are strict ISO dates. The engine requires an evidence note
and checks that the bulletin date is at least 14 days before the event; the bulletin
date and evidence remain private in the public projection. These dates are required
only when an event is marked double-points.

RS rows preserve printed RS position/status, class, each separately recorded stage
value, penalty and total. Missing values are null/empty, not zero; RS final status and
position are never inferred from sums. Unknown RS categories block publication until
their class/rules are confirmed; RS2 and RS4 are the only configured categories.
`TEST` is a preserved source status, not an alias for DNS or DNF; its scoring/starter
semantics are unsupported and block event points. Class scoring order uses printed
`classPos` when present, otherwise `pos` within class; a still-tied scoring position
blocks points. Later-stage times remain independent observations even after an earlier
missing value.
`timeEvidence` is stage-aligned. For `reviewed-nr-copy`, it records the NR round, car,
exact stage ID and copied value as a snapshot; it never becomes a live pointer.

`nonScoringPeople` is private, season-scoped stable IDs. An absent toggle means the
user-directed assumption that the person is paid up for RS scoring; it is not a
membership verification claim. A checked person is excluded only from that role's RS
scoring order; the crew partner can still score. The separate per-entry `invited`
boolean is required for every classified row before points can be calculated. These
decision inputs and event applicability/bulletin evidence are stripped from the public
projection. The projection retains source links, official result rows, derived event
points and derived RS standings only.

The public tables and scorer are rebuilt from this optional layer on load. The public
bundle contains RS data inside `public/season_<year>`; there is no separate collection
or publication path. App backups and whole-document History include the working RS
field; public projection excludes the private decision inputs. Existing generic restore,
undo and revision/rebase validators therefore retain and validate the RS layer as part
of the same season document. See [recovery.md](recovery.md).

## Documented entry participation (stored on the season)

Optional `season.entryLists` keeps official entry evidence independent of classifications. Each list is
`{eventId, roundIds, complete, source:{file,url,date,locator}, entries:[...]}`. There is one reviewed list
per event. `roundIds` describes known day coverage, not an instruction to assign every crew to every day.
Missing lists mean unknown coverage, not zero entrants. `complete:false` supports explicitly partial
manual evidence; AI replacements require complete, reconciled supported-field coverage.

Each crew is `{car,driver,codriver,class,vehicle,roundIds,status,statusEvidence,participationEvidence,locator}`.
Names and classes retain the source spelling; names resolve against stable profiles and verified aliases.
`class` is the printed **entry** class, never a scoring override. `participationEvidence` documents
supported Northern Regions membership and day scope. Exclude national/club-only rows without NR evidence.
Only necessary public sports fields are accepted; licence/identity/contact details, points and stage
times are rejected. Unknown fields also block normal publication and revision rebase.

`status` is `entered`, `DNS` or `withdrawn`. DNS/withdrawal requires explicit official status evidence:
absence from a classification is not DNS. A published start list alone does not prove an actual start.
`roundIds:[]` records an event entry with unknown day membership. Explicit day selections, such as the
official NRC `regional_days` values `both`, `day1` and `day2`, can establish round membership when the
event dates/format match the calendar. A two-day entry counts as one **event** entry and two documented
**round** entries, never as two event entries.

The computed model exposes `entryLists`, `round.entryParticipation` and `person.entries` separately
from result entries, scored standings and `person.apps`. Crew matching uses resolved identities, not
car number alone; changed crews remain separate. A person can have an entered role/partner and a
different classified role/partner without gaining a second start. Per-event profile counts deduplicate
by event; scoring, finishes, minimum starts, countback, class/credit overrides and extra starts are unchanged.
Profiles do not count classification DNS as starts.

The version-1 AI envelope accepts optional top-level `entryLists` for the `competitors` task. Its crew
rows use `driverRef`/`codriverRef` instead of names and its lists use `sourceId` instead of `source`.
Normal identity review resolves these to the stored shape. Old profile-only packs remain readable,
with an explicit warning that no participation is saved. A complete reviewed entry import replaces
only that event's entry list; omitted event lists are retained. Classification/regulations imports
cannot replace entry lists and do not erase them. Entry-only imports do not invalidate MSA confirmations.

This additive season field uses the existing atomic publication, public season bundle, History/undo
and version-1 backup layout; no Firestore collection or rule change is needed. Public entry provenance
is intentionally limited to sports evidence; private AI review metadata remains excluded. Restoring a
backup that removes or replaces saved crew/source evidence, reduces documented day scope or loses
complete coverage requires an extra warning/confirmation, even when row counts are unchanged or larger.
Crew comparison resolves stable profiles/aliases; row order and additional evidenced days are not losses.
Deploy compatible readers/editors **before** publishing entry evidence. Older deployed code can display classifications
but does not validate or display this field; reverting code after backfill is not a safe editing workflow.

## seasons/<year>/rounds/<id>.json

One official classification for one Northern Regions round. Most fields are copied as printed.

| Field | Meaning |
|---|---|
| `id` | Matches the calendar entry (e.g. `R4`) |
| `title`, `status` | As printed. A status containing "Provisional" is flagged on the site. |
| `stages` | Stage names in order, as printed (e.g. `["SS8","SS9"]`). Cancelled stages are left out. |
| `notes` | Round notes shown on the site |
| `source` | `{file, url}`: the PDF's file name and the page it was published on. Keep the PDF itself in the private project archive. |
| `entries` | One object per car (below) |
| `extraStarts` | Optional `[{car, driver, codriver, class, note}]`: starts the official standings record for a crew that isn't on the sheet. Each counts as a start with 0 points. |

Fields in each entry:

| Field | Meaning |
|---|---|
| `status` | `classified`, `DNF` or `DNS` |
| `pos` | Official position (classified crews only) |
| `car`, `driver`, `codriver`, `class`, `vehicle` | As printed. `class` is the printed class. |
| `stages` | Stages completed, as printed |
| `times[]` | One stage time per entry in `stages`, in the same order. `null` where the car has no time. |
| `stagePos[]` | Official stage positions, in the same order |
| `pen`, `total` | Penalty and official total, as printed. `total` is `null` unless the crew is classified. |
| `credit` | Optional override `{driver?, codriver?, noCodriver?, why}`, used when the championship standings credit the result to a different person than the sheet shows, or count no co-driver start. `why` is shown on the site. |
| `scoredClass` | Optional override: the class to score this row in |
| `skipSumCheck` | Optional `true`: the printed total is accepted even though stage times plus penalty don't add up to it |
| `notes` | Optional per-car notes shown on the site |

To list every override in the data, run `node tools/report.js <year> <backup.json>` using a backup kept outside the repository.
