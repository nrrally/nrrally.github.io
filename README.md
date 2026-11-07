# Northern Regions Rally — results site

Results, standings, crew profiles and interactive stage graphs for the MSA Northern Regions Regional Rally Championship. Everything is built only from the official classification PDFs, never from live timing.

This is an independent archive, not an official championship publication. Final classifications are the normal source; provisional or unclear headings remain labelled, including legacy imports without explicit finality metadata. Points and graphs are site-derived, even where recorded points match cited MSA standings. NRC South Africa and Motorsport South Africa are the authoritative sources for official decisions and discrepancies. Every public view carries a short disclosure linking to `disclaimer.html`, which remains available without JavaScript or the results database; the disclosure is also retained in print. The visual identity uses white, red and charcoal with an original NR monogram and abstract stage-route artwork. It contains no manufacturer logos, copied motorsport branding or national flag motifs.

The setup has three parts:

- **Public site:** https://nrrally.github.io. It works on phones and has a season picker.
- **Admin page:** https://nrrally.github.io/admin/. Admins sign in with their Google account to add results, edit competitors, start seasons and publish.
- **Data:** a private Google Firebase database (Cloud Firestore) in Johannesburg. The website reads only the published copy. Drafts, the change history and the admin list are visible only to admins.

GitHub holds the code. There are no servers to run, and it costs nothing on Firebase's free plan.

**Code baseline: v4.** Results and competitor data come only from Firestore; there is no bundled data or file fallback. Keep backups, official PDFs and the private test kit outside this repository. For an existing installation, preserve `assets/firebase-config.js` and follow the code-update checklist in `docs/runbook.md` rather than repeating first-time setup.

## One-off setup

**A. Firebase project** (console.firebase.google.com, using a personal Google account with 2-Step Verification on)
1. Create a project. You can leave Google Analytics off. Don't add billing.
2. Go to **Authentication → Sign-in method → Google → Enable**.
3. Go to **Authentication → Settings → Authorized domains** and add `nrrally.github.io`.
4. Go to **Firestore Database → Create database**:
   - Edition: **Standard**
   - Location: **africa-south1 (Johannesburg)**
   - Mode: **Start in production mode**
5. Go to **Project settings → General → Your apps** and register a web app (leave Firebase Hosting unticked). Keep its `firebaseConfig` block for step C.

**B. Database rules and the first admin**
1. Go to **Firestore Database → Rules**. Replace everything with the contents of `docs/firestore.rules`, then click **Publish**.
2. Go to **Firestore Database → Data → Start collection**:
   - Collection ID: `config`
   - Document ID: `admins`
   - Field: name `emails`, type **array**. Add one **string** value: your Google address in lower case.
   - Click **Save**.

**C. Connect and upload the website**
1. Open `assets/firebase-config.js` in a text editor such as Notepad. Replace the empty `const firebaseConfig = { … };` block with yours, then save. These values aren't secrets; the database rules control access.
2. In the GitHub repository `nrrally/nrrally.github.io`, upload the files: **Add file → Upload files**, drag in everything, then **Commit changes**. Pages must be set to deploy from branch `main`, folder `/`.

**D. First load**
1. Open https://nrrally.github.io/admin/ and choose **Sign in with Google**.
2. Choose **Choose a backup file** and pick the latest backup from the private project archive (for example `data-backup-2026-11-06.json`).
3. Review the changes, then choose **Publish to the website**.

## After each round

Follow `docs/data-entry-guide.md`. In short:

1. **Import:**
   - **For a PDF in the usual layout:** open it in Chrome or Edge, press **Ctrl+A** then **Ctrl+C**, and paste it under Results → the round.
   - **For a scan or a new layout:** use the **spreadsheet template**.
2. **Check:**
   - Make sure the import summary says every classified row adds up.
   - Fix any errors.
   - Read the checks, including look-alike names and crews that retired part-way.
3. **Publish:** go to **Review & publish**. It's live straight away.

Nothing goes live until you publish, and every publish can be undone.

## Other tasks

- **Competitors:** one profile per person, shared by every season. Each profile has:
  - **Also printed as:** other spellings used on sheets.
  - **Merge:** combines duplicate profiles.
  - **Season class:** the class a person is scored in for that season.
  - **Bio, photo and links:** optional, and only with the competitor's permission (POPIA).
- **New season:** go to **Dashboard → Start the next season**. Then add events and rounds, and add the SSRs under **Season settings**. When it should become the default, choose **Open the public site on <year>**.
- **AI Import:** bulk-prepare new seasons, calendars, classes, entry-list names and official results. The admin generates a versioned prompt for free ChatGPT or Claude; you attach official files in your own AI chat and paste the returned JSON back. Review sources, identities, scoring and consequences, then stage and publish normally. Manual editing remains available. Unsupported or uncertain scoring rules are blocked, never guessed. See [the AI Import guide](docs/data-entry-guide.md#ai-import-free-chatgpt-or-claude).
- **Undo:** **History** lists every publish. **Undo** stages the previous version for review and publishing.
- **Admins:** go to **Site & info → Admins** to add or remove Google accounts. Changes take effect immediately.
- **Backups:** go to **Dashboard → Backups → Download a backup**. Do this monthly and keep the file in the private archive. **Restore from a backup** stages the backup's contents for publishing.

## Maintenance

| Task | When |
|---|---|
| Add results | After each event |
| Download a backup | Monthly |
| Start a new season | Once a year |
| Review the admin list and owners | Once a year (see `docs/runbook.md`) |
| Software review | At least annually: review the pinned Google sign-in SDK, browser compatibility and provider changes; test updates before deploying (see `docs/runbook.md`). |

For developers and future maintainers, start with `docs/README.md`.
