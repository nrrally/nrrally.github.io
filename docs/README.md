# Maintainer documentation — start here

Read this if you're taking over the Northern Regions Rally results site, moving it to another platform, or fixing something. It doesn't assume you were part of how the site was built.

## What the system is

There are two parts:

- **A public results site** for the MSA Northern Regions Regional Rally Championship.
- **An admin page** where results and competitor details are maintained. Admins sign in with Google.

Results come only from the official classification PDFs, never from live timing. Standings, points and stage graphs are calculated in the visitor's browser from the raw official data each time a page loads. Nothing calculated is stored.

## Where everything lives

| What | Where | Who can see it |
|---|---|---|
| Code and these docs | GitHub repository `nrrally/nrrally.github.io` (organisation `nrrally`) | Public. It holds no results or personal data. |
| Live site | https://nrrally.github.io, served by GitHub Pages | Public |
| Admin page | https://nrrally.github.io/admin/ | Anyone can open the page, but only Google accounts on the admin list can read or change data |
| Results data, competitor profiles, history | Firebase project (Cloud Firestore, Johannesburg region) | The published copy is public. Everything else is admins only. |
| Official PDFs, data-decision notes, backups, full test kit | Private project archive (`nr-rally-private-archive.zip`, kept in the maintainer's OneDrive) | Private |

## The five rules the system is built on

1. **Official classifications only.** Never use live timing.
2. **Store what's printed.** Times, penalties and positions are kept exactly as printed. Corrections are made through overrides, never by editing printed values.
3. **Calculate, don't store.** Points, standings and graphs are worked out from the raw data, so fixing one time fixes everything that depends on it.
4. **Every override explains itself.** Each override carries a reason that is shown on the site. `node tools/report.js <year> <backup.json>` lists all of them.
5. **Every change is reviewed and kept.** Each publish is recorded with who made it and when, and any publish can be undone.

## Documents

- [data-entry-guide.md](data-entry-guide.md): how to load a round's results correctly, how the import and its checks work, and the judgement calls.
- [architecture.md](architecture.md): the parts, how data flows, the security model, and what to change to move platforms.
- [firestore.rules](firestore.rules): the database's access rules, to paste into the Firebase console.
- [data-model.md](data-model.md): every data file and field.
- [scoring-rules.md](scoring-rules.md): how points, classes, eligibility, ties and stage graphs are calculated.
- [decisions.md](decisions.md): why it's built this way, and its known limitations.
- [runbook.md](runbook.md): routine tasks, incidents, backups and handing over.
- [testing.md](testing.md): how to check a change before it goes live.

The repository's top-level `README.md` is the admin's user guide: how to set up the site and how to add results.
