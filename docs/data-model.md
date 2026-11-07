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
| `history/<publish>-<n>` | `{ group, at, by, message, path, kind, before, after }`: one per changed document per publish. `before` and `after` are the document's text, or `null`. Photos are listed but their content isn't kept. |
| `config/admins` | `{ emails: ["name@gmail.com", …] }`, in lower case. |
| `config/revision` | `{ n, at, by }`, increased by every publish. |

**Backups.** A backup downloaded from the admin is one JSON file:
```
{ "format": "nr-rally-backup", "version": 1, "exportedAt": "…", "exportedBy": "…",
  "docs": { "data/site.json": {…}, "data/people.json": {…}, "data/seasons/2026/season.json": {…}, … },
  "photos": { "<personId>": "<JPEG as base64>" } }
```
`tools/validate.js`, `tools/report.js` and the test kit read backups directly.

## Conventions

- **Times** are strings exactly as printed: `"m:ss.s"` for stage times (e.g. `"12:36.3"`), and `"h:mm:ss.s"` or `"m:ss.s"` for totals and penalties.
  - `null` or `""` means no time.
  - The engine converts times to seconds, rounded to 0.1 s (`parseTime`).
- **Classes** are stored upper-case with no spaces (`"NR1"`). `normClass` removes spaces and upper-cases, so `"NR 1"` becomes `"NR1"`.
- **People** are matched by name, ignoring case, accents and repeated spaces.
  - `"Jan van der Merwe"` and `"Jan Van Der Merwe"` match the same profile.
  - Other spellings go in that profile's `aliases`.
  - A name that matches no profile gets an id made from the name (`slug`), and the admin adds a profile for it when you publish.
- **Ids** are lower-case slugs (e.g. `jan-van-der-merwe`). A person's id never changes when they're renamed, so profile links stay valid.

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
