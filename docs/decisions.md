# Decisions and known limitations

A short record of why the site is built this way. When a decision changes, add a new entry rather than editing an old one.

## Decisions

**D1 — Static site, no application server (November 2026).**
- *Why:* free hosting, nothing to patch, and it runs on any web host.

**D2 — The GitHub repository was the database; each publish was one commit (5 November 2026).**
- Superseded by D10.

**D3 — GitHub Pages deploys from the branch; there's no build pipeline (6 November 2026).**
- *Why:* one less moving part.

**D4 — Store raw official data exactly as printed; calculate everything else.**
- *Why:* any number can be traced back to the official sheet.
- Corrections are explicit overrides with a reason (`credit`, `scoredClass`, `classMap`, `extraStarts`, `skipSumCheck`).

**D5 — Where the official sheet and the championship standings disagree, scoring follows the standings.**
- The override is applied with its reason shown on the site.
- `node tools/report.js` lists them all.

**D6 — Import results by pasting text copied from the PDF; don't read PDFs in the browser.**
- *Why:* no PDF library to maintain.
- Two official layouts are recognised. Scanned sheets are typed in.

**D7 — Hash-based routes.**
- *Why:* they work on any static host without server rewrite rules.

**D8 — Keep third-party code to a minimum.**
- The public site has none.
- The admin loads only Google's sign-in SDK.

**D9 — Seasons are self-contained; people are shared across seasons.**

**D10 — Results data moves out of the public repository into a private database, with Google sign-in for admins (6 November 2026).**
- *How:* Cloud Firestore and Firebase Authentication, on Firebase's free Spark plan. GitHub Pages now hosts code only.
- *Why:*
  - A public repository shows every past version of every file forever, so a later bio, photo or contact detail could never really be removed.
  - Admins needed proper sign-in instead of GitHub tokens.
  - Access is now enforced by the database's rules, not by obscurity.
- Supersedes D2.

**D11 — A publish is one atomic commit that also rebuilds the public copy and bumps a revision counter.**
- *Why:* the website always sees a consistent set of documents.
- If someone else published in the meantime, their changes are reloaded and kept. If both admins changed the same document, the second publish is refused, never overwritten.

**D12 — Use the Firestore REST API with plain `fetch`; use the Firebase SDK only for the Google sign-in pop-up.**
- *Why:* less third-party code, easy to read, and it can be tested end to end against a simulated database.

**D13 — Photos are small JPEGs stored in the database; official PDFs aren't stored by the system.**
- *Why:* Firebase's file storage needs the pay-as-you-go plan, so a card would have to be on file.
- PDFs are linked at their official source and kept in the private project archive.

**D14 — The database is in africa-south1 (Johannesburg).**
- *Why:* data stays in South Africa and is close to its users.
- The location can't be changed later.

**D15 — No results data in the code or the repository (7 November 2026).**
- The public site and the admin read only from the database. There's no fallback to files and no built-in data.
- An empty database is filled from a backup file.
- *Why:* there is one source of truth, and the public repository holds no personal data.

**D16 — The importer is deterministic and fails closed; the checks are the safety net.**
- No AI or external service is involved.
- PDF text is accepted only in the known official layouts; anything else is refused.
- A spreadsheet template covers scans and new layouts.
- Every row must pass the "adds up to the official total" check and the others in [data-entry-guide.md](data-entry-guide.md) before it can be published.
- New names that look like existing competitors are flagged.

**D17 — Demo mode uses the published copy.**
- *Why:* admins can practise, including a pre-season import rehearsal, without any data in the code and with no risk of saving.

## Known limitations

- **Copied PDF text can't show skipped stages.** For crews that retired part-way, the importer can't tell which stages were skipped, so it flags those rows for a manual check.
- **Scanned sheets have no text.** They're typed in, either through the spreadsheet template or straight into the table.
- **A new PDF layout from the timing provider** is refused by the text importer until a developer adds it. The spreadsheet route still works meanwhile.
- **Visitors with a page already open** see new results when they refresh.
- **Photos aren't kept in the history.** An undo can remove a photo but not bring an old one back. Backups do include photos.
- **Free-plan limits:** 50,000 document reads a day. A visit to the site reads about 3 documents, so roughly 15,000 visits a day. If the limit is reached, the site stops showing data until midnight Pacific time (about 09:00 or 10:00 South African time).
- **Editing documents directly in the Firebase console** doesn't update the public copy or the history. Use the admin page.
