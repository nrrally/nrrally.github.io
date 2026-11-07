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
| Configure optional Google Analytics | After compatible code deployment and GA stream setup | Site & info → Google Analytics 4: enter the Measurement ID, enable, Review & publish. Disable and publish to stop new visits tracking. Follow setup below. |
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

For the active-rally notice and analytics, deploy the coordinated `ga-1` HTML, scripts and styles before
enabling it. Existing settings without `activeRally` remain disabled; no Firestore migration,
entry backfill, auth/domain change or rules publication is needed. Never enable a rally as
part of a code release without an explicit admin decision. After an intended enable/publish,
check a fresh session, **View past results**, another public route, the disclaimer and admin access.
An already open tab needs a refresh to read changed settings. Restoring an older backup can
remove active settings; review the Site & info diff before publishing. Do not roll back to an
older editor while this feature is in use.

## Google Analytics 4

Keep this separate from Firebase project creation, authentication and database rules. No Google
credentials, Measurement ID, stream ID or GA account data need to be committed. The stream ID is
not the Measurement ID used by the website. The Measurement ID is publicly visible to visitors,
not a secret or an authorization token.

1. Sign in yourself at [Google Analytics](https://analytics.google.com/) with the intended Google
   account. An old account can be reused, but create a **fresh GA4 property** rather than reusing
   an old Universal Analytics tracker. In **Admin → Create → Property**, choose a name, South Africa
   reporting time zone and ZAR currency as appropriate. Complete Google's property setup and terms.
   A separate Analytics account is optional; use **Create → Account** if separation is wanted.
2. Under **Admin → Data collection and modification → Data streams**, add a **Web** stream for
   the canonical HTTPS site URL and choose a stream name. Do not add an app stream or link/change
   the existing Firebase project. Copy the web stream's **Measurement ID**, beginning `G-`.
3. **Before enabling the site, switch off Enhanced Measurement** for this stream. Ensure
   **Page views → Show advanced settings → Page changes based on browser history events** is off.
   Keep site search, scroll, outbound clicks, downloads, video and form interactions off as well.
   `send_page_view:false` in code suppresses config's initial view, but does **not** suppress
   Enhanced Measurement history events. Do not add another tag/snippet, Tag Manager container,
   connected advertising destination or custom automatic event configuration. Leave Google
   Signals, user-provided data collection and advertising personalization off in the property.
   Review data sharing and retention for the intended purpose.
4. Deploy the compatible code, including `privacy.html`, before entering the ID. Check results,
   Info/footer privacy links, admin and active-rally notice. With no analytics settings, there
   must be no requests to Google Analytics or Google Tag Manager.
5. In the site's **Site & info → Google Analytics 4**, enter the Measurement ID, enable, then
   **Review & publish**. Review the site diff; this atomically publishes settings and records
   attributed History. Changing the ID or disabling later uses the same flow. No database
   migration, auth/domain change or rules update is needed. Existing tabs need a refresh.
   Background loading plus opt-out is the selected behavior, not a consent/compliance guarantee.
   Review applicable requirements with suitable advice before enabling for the audience.

### Safe live verification (after deployment and intended enable)

Use only your own browser, ordinary public routes and synthetic navigation text; never enter
names, email addresses, tokens or other private information into a verification URL. Confirm
Enhanced Measurement is off first. Do not test with a real ID in local synthetic fixtures.

- In a fresh browser session without an analytics-blocking extension, open the public site, then
  **GA → Reports → Realtime** for the new property. Navigate Home → Standings → Info → Privacy.
  Realtime should show the generic titles/categories after processing; standard reports can take
  24-48 hours. Realtime alone is not proof that payloads are safe or views are not duplicated.
- In browser DevTools Network, inspect the `gtag/js` load and GA `g/collect` requests. Check
  `page_view` counts: one per initial rendered route and route change, none for filter/query-only
  changes. `dl` should contain only a synthetic category URL such as `/#/standings/drivers`,
  `dt` a generic title, and `dr` no referrer. No person/round identifier, query or search text
  should be present. Automatic session/engagement events may still appear. Never export private
  browsing URLs or the configured ID into source, public screenshots or development logs.
- On **Privacy & analytics**, turn analytics off. It reloads, clears accessible `_ga` cookies
  and saves the browser-local choice. Refresh and navigate again, including another tab: there
  should be no further tag/collection requests. Allow it again to reverse the preference. A
  request already sent cannot be recalled; GA's stored data is not deleted by this control.
- Verify `/admin/` has no analytics requests. Disable analytics in Site & info and publish;
  a fresh public load must make no GA requests even in a browser that previously allowed it.
  Blocking Google hosts must not break results, the active-rally reminder or the privacy page.

If there is no Realtime activity, check the selected property/stream, enabled published settings,
browser opt-out, blockers and Network/CSP errors. Don't relax CSP broadly or enable advertising
features to make a test pass. This integration permits `www.googletagmanager.com` scripts and
`www.google-analytics.com`/`region1.google-analytics.com` connections only; provider endpoint changes
need a reviewed code update. Local tests mock the tag and collector and cannot certify Google's
actual runtime or property configuration.

For a pre-release check using the actual Google runtime but no real property, use the optional
[synthetic runtime check](testing.md#optional-actual-google-runtime-check). It records actual
collector payloads without forwarding them. A pass verifies that snapshot's behavior with its
generated-ID container, not the actual stream's remote settings. Default session/first-visit
metadata and engagement remain possible even with Enhanced Measurement off. Enhanced Measurement
or later remote customizations can defeat manual pageview counts and data minimization by supplying
their own URL/search/form/link parameters; keep it off and recheck live traffic after any GA changes.

Restoring an older backup without `analytics` disables it only after publishing. Undo can restore
previous settings, including a previous ID or enabled state; review that deliberately. Do not
roll back to an older editor while analytics settings are in use. Emergency disable takes effect
for newly loaded/refreshed pages, not already-open pages that have cached published settings.

Sources: [Google setup](https://support.google.com/analytics/answer/9304153),
[Enhanced Measurement](https://support.google.com/analytics/answer/9216061),
[manual pageviews and history caveat](https://developers.google.com/analytics/devguides/collection/ga4/views).

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
