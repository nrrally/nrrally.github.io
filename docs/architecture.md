# Architecture

## Overview

```
Visitors ──HTTPS──▶ https://nrrally.github.io   GitHub Pages: the code only (HTML, CSS, JavaScript), no data
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
Admin page (https://nrrally.github.io/admin/)
```

Two providers are involved, and there's no application server:

- **GitHub** (organisation `nrrally`) stores and serves the code. It holds no results or personal data.
- **Firebase** (a Google Cloud project on the free Spark plan) provides Google sign-in (Firebase Authentication) and the database (Cloud Firestore).

## Parts

| Part | Files | What it does |
|---|---|---|
| Engine | `assets/engine.js` | Pure functions shared by the site, admin and Node tools: time parsing, name matching and look-alike detection, the season model (points, classes, standings, stage progressions, crew histories), checks, and the importers for pasted PDF text (known layouts only) and spreadsheets. No browser or network code. See [data-entry-guide.md](data-entry-guide.md). |
| Public site | `index.html`, `assets/site.js`, `assets/styles.css` | A single-page app. Reads `public/site`, `public/people` and `public/season_<year>` through the Firestore REST API, then calls `NREngine.buildSeason`. |
| Admin | `admin/index.html`, `assets/admin.js`, `assets/admin.css` | Google sign-in, an in-memory editable copy of the data, checks, points preview, publishing, history and undo, backups and the admin list. |
| AI preparation | `assets/ai-import.js` | Pure versioned contract/prompt generation, strict parsing, capability/evidence checks, identity assessment and scoped change planning. Shared by admin and Node tests/tools; no network or provider SDK. |
| Connection settings | `assets/firebase-config.js` | Says which Firebase project to use. Public by design: it identifies the project and grants no access. |
| Access rules | `docs/firestore.rules` | The database's security rules, pasted into the Firebase console. They decide who can read and write what. |
| Tools | `tools/load.js`, `tools/validate.js`, `tools/report.js` | Node scripts that run on a backup file: check all data, and list every override and note. |

## Public site

### Routes

| Route | Shows |
|---|---|
| `#/` | Home page for the current season |
| `#/<year>` | Home page for that season |
| `#/<year>/standings`, `#/<year>/standings/codrivers` | Standings. Optional `?class=NR1&pts=split`. |
| `#/<year>/rounds` | Calendar and the round winners |
| `#/<year>/round/<id>/graph`, `…/classification`, `…/stages` | One round. The graph takes `?cars=200,201&m=gap`, where `m` is one of `pos`, `gap`, `cpos`, `cgap`, `loss`, `spos`. |
| `#/<year>/crews` | Everyone in the season |
| `#/person/<id>` | One person across all seasons |
| `#/<year>/about` | Sources and data notes |
| `#/info` | Info page |

Routes without a year use the current season, so older links still work. Hash routing means the host needs no rewrite rules.

Data loading works like this:
- **The code holds no results data.** The site reads only the published copy from the database (`public/` documents, no sign-in needed).
- **If the database is unreachable, or nothing has been published,** visitors see a short message ("Results coming soon" or "temporarily unavailable"). The site never shows old or built-in data.

Profile photos (`photo: "db:<id>"`) are read from `photos/<id>`. Visitors see new results the next time they load or refresh a page.

## Admin

1. **Sign in.** The Firebase Authentication SDK opens Google's sign-in pop-up. It is the only third-party code, loaded from `www.gstatic.com` and pinned to the version in `FB_SDK` in `assets/admin.js`. The session lasts until the tab is closed.
2. **Load.** The admin lists `docs/`, then reads `config/admins` and `config/revision`. The database refuses all three unless the signed-in email is on the admin list.
3. **Edit.** Changes are kept in the browser until you publish.
4. **Publish.** One atomic commit (Firestore REST `documents:commit`) writes everything at once:
   - **Changed `docs/` documents.** Each must still be the version that was loaded (`currentDocument.updateTime`), or must not exist yet.
   - **Changed photos.**
   - **The whole public copy, rebuilt from the working copy.** For people, only the public fields are copied (id, name, aliases, bio, photo, links).
   - **`config/revision` + 1.** If anyone else has published since you loaded, the commit fails. The admin then reloads their documents and retries once. If you both changed the same document, it stops and explains instead.
   - **One `history/` entry per changed document,** with the text before and after.
5. **Undo.** Stages the "before" versions from one publish so you can review and publish them.
6. **Backups.** Downloads every document and photo as one JSON file (`format: nr-rally-backup`). Restoring stages a backup for publishing. An empty database can only be filled from a backup file; the code contains no data to fall back on.
7. **Demo mode.** Loads the published copy (readable by anyone) into a practice session that can never save. It's used for training and for the pre-season import rehearsal.
8. **Admin list.** `config/admins` is edited under Site & info → Admins. Changes take effect immediately.

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
  - the public site may talk only to `firestore.googleapis.com`;
  - the admin page may also talk to Google's sign-in services.
- **No visitor tracking.** The public site sets no cookies and has no visitor accounts.

## What depends on which provider

| Provider | Used for | To move away |
|---|---|---|
| GitHub Pages | Hosting the static files | Copy the files to any static host. Add the new web address to Firebase → Authentication → Settings → Authorized domains. |
| Firebase Authentication | Google sign-in | Replace `auth()` in `assets/admin.js`. It returns an object with `ready`, `user`, `signIn`, `signOut` and `token`. |
| Cloud Firestore | Storage | Replace these functions with equivalents for the new store, then restore a backup into it: `liveLoad`, `buildWrites`/`publish`/`rebase`, `loadHistory`, `saveAdmins` and `photoB64` in `assets/admin.js`; `getPublic` and `loadPhoto` in `assets/site.js`. |

Everything else works on plain JSON documents and doesn't change. The data model is the same as before (see [data-model.md](data-model.md)).

## Dependencies

- **Public site:** none.
- **Admin page:** the Firebase JS SDK (Auth only) from Google's CDN. Before raising `FB_SDK`, read the release notes.
- **Tools and tests:** Node.js 18 or later.
