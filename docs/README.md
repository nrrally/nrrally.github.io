# Maintainer documentation — start here

Read this if you're taking over the Northern Regions Rally results site, moving it to another platform, or fixing something. It doesn't assume you were part of how the site was built.

**Recovery entry point:** [recovery.md](recovery.md) inventories the entire solution, safe
restore/rollback, provider boundaries, private recovery requirements and failure diagnosis.
Read [AGENTS.md](../AGENTS.md) and [releases.md](releases.md) for the mandatory
**documentation update before EVERY push** and current local/deployed scope.
For annual operation start with [season-lifecycle.md](season-lifecycle.md).
Public Git cannot recover private Firestore/Auth/config/History/source data by itself.

## What the system is

There are two parts:

- **A public results site** for the MSA Northern Regions Regional Rally Championship, with an independent, secondary RallyeSport scoreboard.
- **An admin page** where results and competitor details are maintained. Admins sign in with Google.

Results come only from official classification PDFs, never from live timing. NR standings, points and stage graphs are calculated in the visitor's browser from raw NR results each time a page loads; NR does not store derived scoring snapshots. RallyeSport is a separate competition: its validated scoring snapshots are stored with the published RS data and never feed NR standings or statistics.

## Where everything lives

| What | Where | Who can see it |
|---|---|---|
| Code and these docs | GitHub repository `nrrally/nrrally.github.io` (organisation `nrrally`) | Public. It holds no results or personal data. |
| Live site | https://nrrally.co.za/, served by GitHub Pages | Public |
| Admin page | https://nrrally.co.za/admin/ | Anyone can open the page, but only Google accounts on the admin list can read or change data |
| Results data, competitor profiles, history | Firebase project (Cloud Firestore, Johannesburg region) | The published copy is public. Everything else is admins only. |
| Official PDFs, data-decision notes, backups, full test kit, access/config recovery register | Privately maintained archive and recovery package, outside the repository | Private; custody and completeness must be verified |

## The five rules the system is built on

1. **Official classifications only.** Never use live timing.
2. **Store what's printed.** Times, penalties and positions are kept exactly as printed. Corrections are made through overrides, never by editing printed values.
3. **Keep scoring models separate.** NR points, standings and graphs are calculated from raw NR results in the visitor's browser. Published RallyeSport scoring snapshots are stored with RS data; they do not affect NR results, points or statistics.
4. **Every override explains itself.** Each override carries a reason that is shown on the site. `node tools/report.js <year> <backup.json>` lists all of them.
5. **Every publication is reviewed and kept.** Each publish records who/when and document before/after. Undo stages earlier versions, not a full project/photograph restore. Admin-list and owner/provider changes are outside this flow.

## Documents

- [recovery.md](recovery.md): comprehensive reconstruction inventory, private recovery package, versioned/atomic restoration, hosting/credentials, boundaries and diagnosis.
- [season-lifecycle.md](season-lifecycle.md): pre-season calendar-only setup, unknown/partial/entry-only behavior, date semantics, annual guide review and event/default/archive lifecycle.
- [releases.md](releases.md): mandatory before-every-push checklist, baseline and local release/validation record.
- [data-entry-guide.md](data-entry-guide.md): how to load a round's results correctly, how the import and its checks work, and the judgement calls.
- [architecture.md](architecture.md): the parts, how data flows, the security model, and what to change to move platforms.
- [firestore.rules](firestore.rules): the database's access rules, to paste into the Firebase console.
- [data-model.md](data-model.md): every data file and field.
- [scoring-rules.md](scoring-rules.md): how points, classes, eligibility, ties and stage graphs are calculated.
- RallyeSport event/results/scoring boundaries are described in [scoring-rules.md](scoring-rules.md) and [data-model.md](data-model.md); its calculations never feed NR standings or statistics.
- [decisions.md](decisions.md): why it's built this way, and its known limitations.
- [runbook.md](runbook.md): routine tasks, incidents, backups and handing over.
- [testing.md](testing.md): how to check a change before it goes live.

The repository's top-level `README.md` is the admin's user guide: how to set up the site and how to add results.
