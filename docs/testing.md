# Testing

## Quick checks (anyone, with Node.js 18 or later)

Download a backup first (Admin → Dashboard → Backups), then run:

```
node tools/validate.js nr-rally-backup-2026-11-06.json      # checks every season. Exits with code 1 if there are errors.
node tools/report.js 2026 nr-rally-backup-2026-11-06.json   # lists every override and note, for review
```

The admin runs the same per-round checks before it lets you publish.

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
