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

**D18 — Optional admin-operated AI preparation, never AI publication (November 2026).**
- D16 remains true for deterministic PDF/spreadsheet parsers. AI Import is a separate
  opt-in preparation path: documents are uploaded by the admin in their chosen chat,
  not sent by this application. Strict contracts, evidence, supported policy, identity,
  complete-classification review and normal publish apply.
- No model output implements new scoring policy or makes a classification final.

**D19 — Optional GA4 with explicit privacy boundaries (November 2026).**
- Qualifies D8's original "public site has none": optional published enabled analytics
  loads Google runtime. Results/guide still have no framework or analytics dependency.
- Manual generic route categories, empty referrer, global preinitialization suppression,
  opt-out and admin exclusions minimize data; the stream must keep Enhanced Measurement off.
- Configured-container offline replay caught a raw automatic startup view that a generated
  fake-container snapshot missed. Per-stream suppression alone was insufficient.
  [testing.md](testing.md) records the snapshot-specific evidence and provider limitations.

**D20 — Entry evidence is participation, not starts (November 2026).**
- Stable shared identities, source-backed NR membership/day scope and deduplicated event
  counts preserve entry-only people without changing points, DNS/DNF or MSA confirmations.
- Unknown entry coverage is not zero. Missing/empty-partial event summaries are suppressed;
  known complete-zero, partial nonempty and round scope evidence remain distinguishable.

**D21 — Active rally is an explicit publication decision, never date inference (November 2026).**
- Independent site-settings loading retains the warning on results/guide/error routes.
  Visit-scoped bypass leaves a reminder; changed activation reopens the notice.
- Future/today/past calendar labels say nothing about live event status.

**D22 — Generic season-rollover presentation and explicit guide edition (local November 2026 work).**
- Empty seasons display supplied calendar/documents and entry evidence, not fabricated
  standings, leaders, stage programmes or official confirmations. Archives/scoring stay intact.
- Strict date-only South African calendar statuses distinguish undated/future/today/
  past-awaiting-results, with no automated live notice.
- The bundled guide remains explicitly a 2026 reference until actual new editions and
  all dated body content are reviewed. No future rules/data are created by this change.
- Manual copied settings are unapproved placeholders with an explicit warning and annual
  operational review, not a speculative new CMS/automatic regulation interpreter.

**D23 — Persistent repository recovery documentation at EVERY push (user requirement).**
- README links the recovery inventory and AGENTS.md release invariant. Affected docs
  and recovery/release records must be updated before every push, not only major releases.
- Public documentation records code/workflows/boundaries, never private identities/data.
  Git cannot recreate private Firestore/Auth/config/History/source state; custodians must
  retain a separate privately stored recovery package.

## Known limitations

- **Manual annual rules review is operational.** Manual copied settings do not have an
  automatic rule-approval gate; actual governing SSR verification remains required.
- **The guide is a dated reference.** Changing default season does not update its
  technical/licensing/fuel guidance; metadata and sources/body need separate annual review.
- **Calendar status is not official event status.** Clock/date validity affects labels;
  an open page needs navigation/refresh after midnight. Past dates do not prove an event ran.
- **Copied PDF text can't show skipped stages.** For crews that retired part-way, the importer can't tell which stages were skipped, so it flags those rows for a manual check.
- **Scanned sheets have no text.** They're typed in, either through the spreadsheet template or straight into the table.
- **A new PDF layout from the timing provider** is refused by the text importer until a developer adds it. The spreadsheet route still works meanwhile.
- **Visitors with a page already open** see new results when they refresh.
- **Photos aren't kept in the history.** An undo can remove a photo but not bring an old one back. Backups do include photos.
- **Free-plan limits:** the documented Firestore allowance is 50,000 reads a day; verify current quotas in the provider console. A basic public load reads roughly three documents, but profile pages load all seasons, photos add reads, and admin/rules access also contributes. A simple visits estimate is not capacity planning. Quota exhaustion can make results unavailable until the provider reset (normally midnight Pacific time).
- **Editing documents directly in the Firebase console** doesn't update the public copy or the history. Use the admin page.
- **Direct Copilot writes require atomic attributed site History** labelled
  `GitHub Copilot (direct Firebase)` and full version/projection coordination. Do not
  use the console then add history later. Follow [recovery.md](recovery.md).
- **App backups are not full-project backups.** They omit config/History/Auth/all photos
  and can include drafts with photo reads at different times. Undo cannot restore photo bytes.
- **Admin-list saves bypass publication History.** They use their own version guard and
  take effect immediately; provider/owner changes also need separate private recovery records.
- **Atomic writes do not provide a common browser-read snapshot.** Refresh during
  cross-document verification; direct writers bypassing revision require stronger guards.
- **Public projections are not generic privacy sanitizers.** New arbitrary site/season/
  round fields need explicit review; only known private metadata is stripped there.
