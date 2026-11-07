# Runbook

## Routine tasks

| Task | When | How |
|---|---|---|
| Add a round's results | After each event | Follow [data-entry-guide.md](data-entry-guide.md). Keep the official PDF in the private archive. |
| Pre-season import rehearsal | Before the first event of each season | In demo mode, import the new season's first official PDF (see the end of the data entry guide) |
| Mark rounds as confirmed | When MSA publishes updated standings | Admin → Season settings → MSA standings: update the link and date, then tick the rounds whose points match |
| Start a new season | Once a year | Admin → AI Import for reviewed bulk setup from official regulations; or Dashboard → Start the next season for manual setup. Follow the AI Import section in the data entry guide. |
| Make the new season the default | When it starts | Admin → Season settings → Open the public site on <year> |
| Direct visitors to an active rally | When entries open, by explicit admin decision | Admin → Site & info → Rally in progress: name, official HTTPS NRC address, enable, then Review & publish. Disable and publish when the active period ends. |
| Back up | Monthly, and before big changes | Admin → Dashboard → Backups → Download a backup. Save it in the private project archive. |
| Check the data | After a big change, or before a handover | `node tools/validate.js <backup.json>` and `node tools/report.js <year> <backup.json>` |
| Add or remove an admin | As needed | Admin → Site & info → Admins (takes effect immediately) |
| Check usage | Now and then | Firebase console → Firestore → Usage. The free plan allows 50,000 reads a day. |
| Review software and recovery | At least annually | Review the pinned Firebase Auth SDK and provider changes, run the private tests, and rehearse backup restoration against the simulated database. |

## Updating the code

V4 is the maintained baseline. GitHub Pages serves code only; Firestore is the only source of results and competitor data.

1. Keep a current database backup and the private test kit outside the checkout. Never commit backups, official PDFs, competitor fixtures or generated previews containing results. `.gitignore` guards common private-data paths, but does not remove files already tracked or prevent a forced add.
2. Preserve the installed `assets/firebase-config.js` when adopting a release archive: an empty template must not replace the live connection settings.
3. Run the checks in [testing.md](testing.md). Use the simulated database for rehearsal; do not restore test fixtures into the live project.
4. Review `git diff` and `git status --short`, including new files. Ensure no `data/` files or identifying examples are included. Uploading replacement files alone does not delete legacy files: remove them explicitly from the deployment tree.
5. Deploy the reviewed code through the approved GitHub workflow. A code update does not require re-importing data or republishing database rules unless those changes are separately intended.
6. Check public results and Google sign-in after deployment. With no file fallback, missing published data, changed rules or a database outage make results unavailable; resolve that before cutover.

Deleting files from the current tree does not remove earlier commits, tags, forks, cached pages or downloaded copies. Historical cleanup and live cutover need a separately coordinated plan; do not restore v1-v3 to roll back a code change.

For the active-rally notice, deploy the coordinated `rally-1` HTML, scripts and styles before
enabling it. Existing settings without `activeRally` remain disabled; no Firestore migration,
entry backfill, auth/domain change or rules publication is needed. Never enable a rally as
part of a code release without an explicit admin decision. After an intended enable/publish,
check a fresh session, **View past results**, another public route, the disclaimer and admin access.
An already open tab needs a refresh to read changed settings. Restoring an older backup can
remove active settings; review the Site & info diff before publishing. Do not roll back to an
older editor while this feature is in use.

## Access

Keep the named access register in the private project archive, not this public document. Record these roles there and keep them up to date.

| What | Where it's managed | Keep at least |
|---|---|---|
| Admin list (who can sign in to the admin) | Admin → Site & info → Admins (stored in `config/admins`) | 2 people |
| Firebase project owners (console, rules, billing) | Firebase console → Project settings → Users and permissions | 2 people, with 2-Step Verification on |
| GitHub organisation owners (code, hosting) | github.com/nrrally → People | 2 people, with two-factor sign-in on |

| Role | Who | Since |
|---|---|---|
| Firebase owner | | |
| Firebase owner (backup) | | |
| GitHub owner | | |
| GitHub owner (backup) | | |
| Admins | | |

**When someone leaves:**
1. Remove them from the admin list.
2. Remove them from the Firebase project and the GitHub organisation.

## Incidents

| Symptom | Likely cause | What to do |
|---|---|---|
| Admin: "This web address isn't allowed to use Google sign-in" | The site's address is missing from Firebase's authorized domains | Firebase → Authentication → Settings → Authorized domains → add it |
| Admin: "the browser blocked the Google sign-in window" | Pop-ups are blocked | Allow pop-ups for the site, then try again |
| Admin: "Signed in as …, but this account can't open the admin" | That Google account isn't on the admin list, or the database rules were changed | Another admin adds the account. If nobody can sign in, check the rules (paste `docs/firestore.rules` again) and `config/admins` in the Firebase console. |
| Admin: "Couldn't load Google sign-in" | A network problem, or an extension blocking `www.gstatic.com` | Try another network or browser. If the browser console shows a Content-Security-Policy error, add the blocked address to the CSP line in `admin/index.html`. |
| Wrong result is live | Data-entry error | Fix it in the admin and publish, or Admin → History → Undo |
| The importer says the text "doesn't match the official results layouts" | The timing provider changed its PDF layout | Use the spreadsheet template for now. Ask a developer to add the layout (see the end of the data entry guide). |
| AI Import reports unsupported or unresolved rules | Regulations exceed the engine's declared capabilities, or sources are missing | Obtain the missing official documents or download the repair/developer handoff prompt. Do not approximate the rules to get past validation. |
| AI Import says the draft changed | Target season or identities changed after prompt generation/review | Recheck against the current draft and review again; generate a new pack if the task/target changed. |
| Publishing says imported settings changed | A scoring/document/calendar edit invalidated the rules review | Compare changed values with the official regulations. Review in Season settings if policies still apply; otherwise import the amended regulations. |
| Publishing reports a document/request/write limit | Firestore atomic publication capacity exceeded | Save a private backup/import draft and reduce the batch or metadata size. A season bundle that exceeds 1 MiB needs a separately planned storage change, not partial publication. |
| The site says "Results coming soon" or "temporarily unavailable" | Nothing published, the database unreachable, or the daily read limit hit | Check the Firebase console (Firestore data, usage, rules). If the database was emptied, restore the latest backup through the admin. |
| "Someone else published changes to …" | Two admins changed the same item | Download a backup (it includes your changes), reload, then make your edit again |
| An admin's Google account is compromised | — | Remove it from the admin list at once. Check History and undo anything unexpected. The person then secures their Google account. |
| Something was deleted by mistake | — | History → Undo. If that isn't possible, restore the latest backup (Dashboard → Backups) and publish. |
| Lost access to every admin account | — | A Firebase project owner edits `config/admins` in the Firebase console (Firestore → Data) |

## Handing over

1. Add the new maintainer:
   - as an owner of the Firebase project;
   - as an owner of the GitHub organisation;
   - to the admin list.
2. Give them the private project archive, which holds the official PDFs, the data notes, the latest backups and the test kit.
3. Point them to `docs/README.md`.
4. Once they've published a test change, remove yourself if you're stepping away.
