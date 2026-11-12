# Recovery and maintainer reconstruction

**Read this first after losing a chat or taking over the repository.** The code and these
linked documents are the persistent design/operations record. They deliberately do not
contain private data, accounts or credentials. A fresh authorized agent can reconstruct
the application and understand the workflows from Git; it cannot reconstruct private
Firestore records, access or source decisions without the private recovery package.

Read [AGENTS.md](../AGENTS.md), [releases.md](releases.md) and the actual checked-out code.
Before **every push**, update affected documentation and recovery/release records.
Older chat checkpoints are provenance, not current configuration or authorization.
No code task by itself permits a live export, direct write, push or deployment.

### Display consolidation phases 1-6

The approved final phase shares Crews, cross-season profiles, Sources and Info
through explicit pure contracts and one component family. Every normal NR/RS
public page now shares structure, field slots, wording and responsive/focus policy;
sporting data, awards and colour themes remain independent. The final
[surface inventory and intentional boundaries](display-consolidation-plan.md#completed-locally-phase-6)
records the legacy RS aggregate compatibility landing and out-of-scope admin.

Directory starts, event/round counts and documented entries remain separate.
Profiles distinguish printed/credited roles, role/car appearances and evidenced
championship role-round starts, with explicit MSA-only/no-graph and unknown states.
Launch stays in RS history/statistics but not championship starts/points; blocked
snapshots cannot expose stale awards. Sources retains finality/technical holds,
NR MSA evidence and pending site-calculated qualifications. Info uses only its own
published regulations; a display-only whitelist retains RS title/source/date/version
during the existing load. Shared editorial text, contacts/channels and documents
stay explicitly Northern Regions site context. Guide edition/CTA are unchanged.

114 targeted tests and all four browser suites (public responsive/theme,
navigation, entry-policy public/admin, AI-import) pass. Actual common fields/styles,
search, keyboard table focus, identities/archives, document ownership and legacy
missing-coverage cases are covered across 320/390/768/1440px and both themes.
Eighty local synthetic captures were checked; representative new views inspected.
Full changed/untracked scope and static/test/documentation diff were reviewed.
No live/private/provider access, data write, scoring/projector/schema change,
data publication or implementation-time release occurred. The user has since
explicitly authorized the code-only `origin/main` release; see the pre-push
approval record in [releases.md](releases.md#2026-11-12-authorized-six-phase-display-consolidation-release-pre-push).
Keep the matching display modules, scripts,
styles and four `rs-visual-3` shells together; rollback is static-only, with no
database restore. Existing tabs do not automatically upgrade. The normal push and
live static-byte verification are complete: Pages' build API reports the release
commit built and all eight changed canonical shell/runtime files match that commit's
Git blobs. The successful Pages Actions run and deployment object still report the
old base SHA; consult the release ledger for this metadata inconsistency and the
independent byte evidence. Live data, sign-in and Firebase rules were not tested.

### Compact public display follow-up (deployed)

The code-only follow-up deployed as
`c6935762b109434aee57ae5d7ecf3c269509833e`, starting from the verified deployed
baseline `76d0c52ba4ada467b42129ecf4daa72713ec9733`. It adds conditional eligibility
asterisks/footnotes, one role-aware Crew Standings field and evidence-based distinct
Crew Starts, and single-number classification awards only for equal known role points.
The four shells coordinate `rs-visual-4`. Pages built that SHA and the changed live
shells/runtime assets matched Git blobs. No public data, scoring engine, projector,
schema or provider was changed. Roll back this static follow-up to the baseline above;
no database restore or data migration is needed. Existing tabs may require reload.
The [release record](releases.md#2026-11-12-compact-public-display-follow-up-deployed)
contains exact verification details.

### Home eligibility tidy-up (deployed)

The Home-only follow-up deployed as `a5e30374cf2958d4d3e69eb0ef22b304705ce148`,
starting at deployed `c6935762b109434aee57ae5d7ecf3c269509833e`.
It removes repeated eligibility labels from NR/RS Home leader/class cards and featured
leaders, adds a subtle name-adjacent mark only for explicit ineligibility, and a single
conditional explanatory note below the cards. Missing RS eligibility stays unmarked;
the existing provisional status and scoring remain unchanged. Four shells coordinate
`rs-visual-5`; static rollback is to `c6935762b109434aee57ae5d7ecf3c269509833e` and
`rs-visual-4`. No database restore or data migration is needed; old tabs may need reload.
The deployment verification is recorded in the release ledger, separately from the
deployed code commit's pre-push record.

A separate RS profile report was checked read-only before the class-order release.
R1-R3 Class pos values were unavailable in profiles and event classifications.
The prior profile and classification adapters displayed `entry.classPos` from each public
result; they did not drop a published position. The official sheets do not print separate
class positions. A calculated source-class order must be distinguished from a printed
position and from role-specific championship scoring, and requires a review tied to
the exact source and classification snapshot. NR's existing engine already calculates
class order within its scored NR class; the RS gap reflects different data paths, not
an inherent inability to calculate from RS sources. The reviewed-snapshot guard is
an additional requirement for this approved RS display and is not an existing NR
per-result attestation.

RS car numbers and vehicle descriptions are separate source fields. Empty RS `vehicle`
means the make/model was not recorded even when the independent RS source sheet
prints it; it does not mean the numbered car is unknown. The existing explicit NR
reuse operation copies reviewed stage times only, not vehicles. Source-backed vehicle
correction or a separately reviewed vehicle-copy workflow is outside this change.

The user approved compatible validation and reviewed R1-R3 publication. The compatible
code was deployed and verified before activation. The coordinator reports that, after
the user confirmed old admin tabs were closed, fresh protected baseline and precommit
backups were made and the reviewed activation was committed atomically with working,
public, revision and attributed History updates. Readback matched; scoring, NR data,
source rows and finality were unchanged. The coordinator also verified a public profile
and all three classifications at narrow and wide widths after activation. This documentation
session did not access private provider data or perform that activation.

For any later review or publication, retire old admin tabs, obtain a fresh backup and
use the audited workflow with current revision/preconditions and user attribution.
Review every source and public row, including statuses and categories; do not infer
completeness from contiguous positions. Preserve printed finality and technical-check
notices. Source or row changes invalidate the marker; inspect and renew the review
before publishing. Old admin validators may reject existing review fields: restore
compatible code or use a separately authorized, backed-up audited data migration.
Static rollback alone does not remove published markers or restore database data.

Public source checks found the following source-identity complication: the current
R1 source URL ending `ClubProvisionalv2.pdf` returns 404; the Sportity noticeboard's
amended provisional source uses `ClubProvisonalv2.pdf`. Its order differs from the
earlier signed final source. Do not silently substitute either source or promote R1's
finality. For R1, a review without source correction must explicitly record the working
noticeboard document and the broken stored URL discrepancy in private review evidence;
the snapshot must bind the actual unchanged stored URL, not pretend it is the working
URL. If the stored URL changes later, the review must be renewed. R2's official sheet
is final; R3's final sheet explicitly remains pending post-event technical checks.
Source URL correction is a separately reviewed data change and is not included here.
Evidence: [R1 noticeboard and amended provisional](https://webapp.sportity.com/event/NRC2026/119aa2b0-25f8-4ac1-b221-ae2a9509e91e),
[R2 source](https://nrcsa.co.za/uploads/public-results/public-results-1787478941259-f0617396e5b52c62.pdf),
and [R3 source](https://nrcsa.co.za/uploads/public-results/public-results-1793517444397-32a5c67c5b92d1f1.pdf).
The R2 sheet reports 14 classified and six non-classified; R3 reports 16 and three.
These counts are source evidence to reconcile, not a generic completeness heuristic.
The R1 amended provisional has 12 classified and four DNF rows. Anonymous read-only
comparison of all three current published snapshots against those exact sheets matched
every car number, printed class, overall position and DNF/DNS status: 16, 20 and 19
rows respectively. That finding was limited to the public snapshot and those fields.
The coordinator reports independently repeating the source and working/public
comparison before activation; future reviewers must repeat it and stop on drift.

#### Historical phase 5 checkpoint

The latest approved local phase 5 shares NR/RS result headers/navigation/tabs,
classification, source/award disclosures, graph controls/legend and full/selected
stage tables through explicit read-only adapters/components. `site.js` retains a
single shared SVG/comparison/interaction runtime. NR credited identities and
overall/class awards remain distinct from RS official classification and independent
class-role awards. Printed RS finals/penalties and hundredths, source finality and
technical holds, DNS/DNF/unavailable, sparse axes, dynamic source-owned links and
launch exclusion are preserved. No scoring engine, projection or data schema changed.
See the [phase 5 inventory and decisions](display-consolidation-plan.md#completed-locally-phase-5).

107 targeted synthetic tests, the full public responsive/theme suite, navigation,
entry-policy public/admin and AI-import browser suites pass. Equivalent result DOM/
styles, keyboard/filter/legend/tab interactions, missing totals, source positions and
precision have focused coverage. Local screenshots were checked outside Git.
No live/private/provider access, data write, commit, push or deployment occurred.
Phase 6 has not started. Keep the matching new display modules, scripts, styles and
four `rs-visual-3` shells together; rollback is static-only, with no database restore.
Existing tabs do not automatically upgrade. Release still requires separate approval.

#### Historical phase 4 checkpoint

The current approved local phase 4 also consolidates both role/class Standings pages
and all six legacy RS cumulative tables through the pure display adapter and one
shared page/table. Presentation now includes the same centered Pos, class, total,
round, role-start and qualification fields, responsive sticky/mobile policy and
native filters; `pts=split` remains valid under the neutral **Points breakdown**
label. Independent NR awards/countback/eligibility and RS class ranks/ties/zero/
unknown/provisional/launch rules remain unchanged. See the [phase 4 inventory and
decisions](display-consolidation-plan.md#completed-locally-phase-4).

97 targeted synthetic tests and the full public, navigation and entry-policy browser suites pass.
Standings browser checks cover both themes, four widths, equivalent-field DOM/styles,
keyboard scrolling, filters and inherited routes; screenshots were inspected outside
Git. Only static display/test/documentation files changed. No provider/private data,
scoring/projection/schema, publication or deployment was accessed or changed.
The unreleased batch still uses matching `rs-visual-3` modules/styles/shells.
Static-only rollback requires those together, not a database restore. At that
checkpoint phase 5 had not started; the current local phase 5 record above supersedes it.

#### Historical phases 1-2 checkpoint

**Superseded local checkpoint:** the next approved phase 3 is also implemented,
as recorded in the [phase record](display-consolidation-plan.md#completed-locally-phase-3)
and current release-ledger entry. Home, Rounds and Info's event section now share
calendar/event/round/winner components and explicit date/link/source contracts.
Date-first ordering puts known dates before undated events, with stable source ties;
related NR dates are labelled context, not an assigned RS day. Dynamic inherited NR
SRS links remain data-driven. Upcoming/pending winners are not invented. Matching
new modules and `rs-visual-3` shells remain one unreleased static-only batch.
There is no provider/data/schema change, commit, push or deployment authorization.

From baseline `5d45f8bfecc8cd828a04070dc19e062089073819`, the user approved phased
implementation with identical NR/RS presentation apart from competition facts and
existing branding/colours. `assets/public-model.js` now supplies explicit read-only Home
contracts and NR/RS adapters; `assets/public-components.js` renders the sole shared
Home structure. `index.html` must load both before `site.js`. Keep these assets and the
matching shells together on any separately approved release/rollback.

The local changes include the earlier RS featured Driver leader improvement, shared
hero/four-stat/status/role/class-card layout and wording, real missing states, source-
scoped starts and class-only RS points. Joint leaders remain joint; launch is retained
in event/stage counts but excluded from championship figures. Shared RS fact helpers
are extracted unchanged for other views. Calendar card internals and later pages are
not consolidated yet. The [phase record and next plan](display-consolidation-plan.md)
documents product decisions and the remaining work.

86 targeted synthetic Node tests, public theme/NR-RS computed-layout comparison,
navigation and entry-policy browser suites passed. No provider/private data was
accessed. No scoring/schema/publication, guide-edition, colours or analytics changes
are included. No commit, push or deployment is authorized; the verified deployed
repair below remains `rs-visual-2`. `rs-visual-3` is prepared consistently in all four
local shells. Static rollback requires matching shell/assets only; no data restore.

### Released RS public visual parity

The public-UI release was committed as
`3a68799272a72d2e2a60baaf681b812ce3196d1f` and pushed normally to `origin/main`.
GitHub Pages built that exact SHA. The canonical HTTPS JavaScript and stylesheet
matched the commit's Git blobs byte-for-byte; the homepage, admin, disclaimer and
privacy shells all returned HTTP 200 and contained the coordinated cache token.
RS now follows the NR presentation for homepage class labels and starts,
year-round wording, standings position/class labels, round winners and Crews layout.
Related NR event links are read from the current public NR event only when its explicit
ID matches the RS event's `nrEventId`; do not hardcode a link or treat NR results as RS
results. The coordinator separately reported the verified TRAC N4 supplementary-regs
link was added to the live NR record through its guarded audited workflow. This UI work
does not access or modify Firebase/GCP or any live record.

The initial parity deployment used coordinated static query version `rs-visual-1`;
the authorized repair below advanced it to `rs-visual-2` in the public, admin,
disclaimer and privacy shells. Reload old tabs. Rollback is static-only: restore
matching shell versions and assets together; there is no corresponding data/schema
migration.
Synthetic public browser coverage passed at 320/390/768/1440 px in both themes, the RS
entry-policy browser regression passed, all 41 RallyeSport unit checks and 18
season-readiness checks passed. On 2026-11-11 the user authorized the normal non-force
release to `origin/main` and waived an additional local review because the changes are
cosmetic. No PR was created, and no Firebase/GCP/data operation or provider change was
performed as part of this UI release.
The deployment scope, verification and remaining limitations are in
[releases.md](releases.md#2026-11-11-authorized-rs-public-visual-parity-release)
and the test cases are in [testing.md](testing.md).

### Authorized RS public parity repair

After live testing the parity release, the user reported duplicate RS class badges on
Crews and directly requested evidence-based round-start labels for the overall RS
driver/co-driver homepage leaders, a centered compact RS standings position column,
and RS4 red / RS2 blue badges matching NR1 / NR2. The repair is based on
`25ddbe865475c7ff532924b8ddf86c1f27c4d390` and was released in
`eb31b7832016744fdbf1c8648c74f4c080a9d86f`. It removes duplicate class/status badges
without collapsing distinct source classes, uses the existing evidence-based RS start
count helper, changes presentation only, and coordinates the shell asset version at
`rs-visual-2`. Synthetic browser coverage passed at 320/390/768/1440 px in both themes,
along with the entry-policy, RallyeSport and season-readiness regressions. Pages built
the release SHA; live `site.js` and `styles.css` matched its Git blobs, and all four
shells served HTTP 200 with the new cache token. No Firebase/GCP/data operation is part
of this repair. See the [release record](releases.md#2026-11-11-authorized-rs-parity-repair).

### RS entry-based policy activation: recovery state

On 2026-11-11 the coordinator confirmed completion of the separately authorized 2026
data activation after compatible code was deployed. The coordinator reports fresh protected
baseline/precommit backups, inventory/version preconditions, a synthetic transaction/conflict
rehearsal and one atomic working-season/public-season/revision/attributed-History commit,
labelled **GitHub Copilot (direct Firebase)**. Full readback matched the validated candidate;
working/public scoring and independent before/after reference and crew-role audits agreed.
NR inputs and calculations were unchanged. This documentation session did not access the
database or independently repeat those private checks.

The reviewed entry-based policy is now active: `rs-r1` is an unnumbered non-scoring
**Launch Event**, and `rs-r2` through `rs-r5` display championship R1-R4. Championship
driver/co-driver roles and tables contain no RS0. The confirmed launch crew alone has
event-scoped effective RS0 with printed TEST evidence unchanged; no global identity
exclusion is introduced. Upcoming R4 remains blocked without an invented classification;
the four-round provisional championship gate and existing DNS/DNF rules are unchanged.
Existing S2 Mine wording is retained. The coordinator also reports a live browser smoke
pass at 390/1440 px using canonical static assets and read-only public data, with analytics
disabled and private/write traffic blocked. It covered both provisional role standings,
the scored R1-R3 columns (not the unscored upcoming R4), launch scope/RS0 and the absence
of RS0 markers in the three championship classifications, without page errors.

**Older-code-only rollback is now unsafe.** Restore matching private working/public
backups atomically with current revision/History preconditions before reverting to a
legacy-only runtime; never patch public points or remove policy markers in isolation.
Use contract 2 assets together (`rs-entry-1`), retire old admin tabs, and review any
restore/undo that would remove the policy. Private backup references, exact versions,
History identifiers, crew identities and decision evidence remain outside public Git.
See [the migration contract](data-model.md#entry-based-policy-migration) and
[the activation record](releases.md#2026-11-11-rs-entry-based-policy-activation-documentation-only-completion).

### Authorized RS entry-based compatible-code release (preceded activation)

The isolated implementation starts from freshly fetched
`7aed656766ff3ce9992601ae962d7c41a62284b6`. After implementation and synthetic
verification, the user authorized release of the reviewed compatible code/documentation
batch by normal non-force push to `origin/main` and Pages verification. This code release
does not authorize Firebase/GCP/data reads or writes, provider changes, PR creation or
database publication. Data migration belongs to a separately guarded authorized workflow.

RS contract 2 adds an explicit reviewed 2026 entry-based eligibility policy; existing
documents continue legacy scoring until a separately approved field migration.
Before push, remote main and latest built Pages were freshly checked at the base above.
All 117 unit tests and revised/legacy public/admin browser regressions pass. Four synthetic
legacy-policy comparisons also preserve actual scores, projections and old-published
public models against that base (ignoring JSON object-key order). This supports safe
code-first deployment without inspecting or changing the live database; it does not
certify the correctness of real source data.
The [schema/migration record](data-model.md#entry-based-policy-migration) lists every
proposed event-scope/round-number change, the launch-only source-row review, preserved
IDs/NR/source evidence, public snapshot compatibility, privacy and rollback requirements.
Never infer the exact private launch crew row/identities from this synthetic code fixture.
No actual private snapshot was available or needed for this work.

When the reviewed policy is activated, the June launch retains event data but has no
championship round number or contribution;
the four championship events display R1-R4. Both championship crew roles qualify
without membership/licence/invitation/manual exclusions. DNS, DNF start evidence,
minimum starters, finality, scales, order, ties and four-round provisional finality are
unchanged. Printed TEST survives only as reviewed launch source evidence with effective
RS0 for that crew, not a global person restriction. Unknown inputs are rejected.
No printed SSR amendment or future-year policy is asserted.

The `rs-entry-1` shell/asset query versions must remain coordinated. Compatible code
must be released and old admin tabs retired before any separately approved data change.
After data migration, code-only rollback is unsafe: restore matching private working
data and its regenerated public bundle atomically with revision/History preconditions
before restoring older code. Keep full private backups and provenance; Git cannot
recover them. The Logic explorer labels preserved pinned links as legacy baseline and
its new policy-helper link as mutable release `main`, not an immutable source citation.
Keep existing S2 Mine wording for this release; the SN/S2 discrepancy is not a code-release
blocker and must not be resolved by guessing. No upcoming result/date/programme
is invented. Validation and operational limitations are recorded in [releases.md](releases.md).

The compatible-code release was verified built at
`800f679179133c3f15e9a1cda510428cc4b301cb`, Pages workflow `43037869747`;
Pages reported that exact SHA built at `2026-11-11T14:23:10Z` without error.
All 24 checked canonical static files (22 HTML/runtime/brand files plus robots/sitemap)
matched Git blobs byte-for-byte; unversioned shells and canonical HTTPS redirects passed.
Revised public/admin and existing legacy public browser checks passed against a downloaded
snapshot of those exact deployed bytes with synthetic intercepted providers and no writes.
Engine SHA-256 is `c7d7a2fcfa4410bf24fc6b2d6380d91013e5a626de225b0cbdfefc7558e4465b`;
public-projector wrapper `assets/ai-import.js` SHA-256 is
`171706846ea6f5eb6e5baa7b85160567ee049573f6676932f0d87a4f98bf044b`.
No Firebase/GCP/data access or policy activation accompanied this deployment.
This same-release documentation-only handover changes no runtime, behavior, cache version,
data or authorization scope. Recheck resulting main/Pages and unchanged runtime bytes
after its normal push; the code SHA above is not a permanent claim about latest main.

### Authorized public welcome/navigation/guide UI release

The welcome titled **Welcome to RallyeSport** is owned by `assets/display-context.js`,
not the separate active-event warning in `assets/rally-notice.js`. Continue, Info or
Escape now save a seven-day expiry in browser local storage (`nr-rs-welcome-until`).
Reloads/restarts retain the preference; after expiry the next NR-to-RS switch can show
the welcome again. Storage failure logs a warning and retains only current-page dismissal.
Clearing browser site storage resets it; no server-side preference needs recovery.
The existing explicit welcome helper and active-event reminder can still reopen their
respective dialogs. Analytics choice/consent behavior and active-event session bypass
are unchanged. See [architecture.md](architecture.md) and [testing.md](testing.md).

The results header collapses its links to a hamburger with a visible MENU label
(and a close icon when expanded) at/below 1200 px, based on viewport
width rather than device type; wider windows keep full navigation. Year, NR/RS and theme
controls remain available. Escape, selection, outside click/focus and breakpoint resizing
close the menu with appropriate focus handling. Static privacy/disclaimer and admin
navigation are unchanged. Getting started now retains the year selector/pill; existing
year-prefixed routes carry results context, not a different yearly guide. Its content,
reference edition and database-independent rendering remain unchanged.
The shared guide also expands the existing National/Regional comparison with a visible
RS club-championship explanation. It covers standalone/shared selected-stage programmes,
round-to-round variation, typical lower costs without a guarantee, separate RS SSRs and
the need to check each event's SRs/official programme. The dated RS reference link is
reused from the existing documented 2026 source; no new scoring rules or later edition
are claimed.

This local change is based on `95643f5e7ef02dc904c52eeb95d7f7b7a1ad56af`.
Coordinated `welcome-7d-1` shell/asset queries require reloading open tabs.
Static rollback must keep shells/assets together; older code ignores the new local key.
No scoring/schema/rules/guide-edition change, data migration, Firebase/GCP access or
database publication is needed. The user subsequently authorized committing and normally
pushing this complete reviewed UI batch to `origin/main` for Pages deployment.
This excludes Firebase/GCP access, data/scoring/provider changes and PR creation.
This pre-push record is not a deployment claim; verify the exact Pages SHA and live bytes.
Release authentication preflight must check repository push permission: a process token
can mask the documented linked keyring account. Remove overrides only in the release
process when using that existing account; do not extract tokens or change global sign-in.
Validation and remaining release limitations are recorded in [releases.md](releases.md).

The release was subsequently verified built at
`c9fe6085a476ee392718871e52ffd83926dc7110`, with all 22 canonical HTTPS
HTML/runtime/brand files byte-identical to their Git blobs. The intercepted navigation
browser regression passed against a downloaded snapshot of those deployed files,
including NR/RS, light/dark, narrow/wide layouts, MENU states and guide/year context.
The synthetic review preview has been stopped. Real authenticated sign-in and live
provider/data verification remain outside scope. This same-release documentation-only
handover changes no runtime or data; recheck current main/Pages rather than assuming
this historical SHA is still the latest build.

### RS class display continuity

Public RS class labels use the existing result-specific mappings; printed source
categories remain intact in source records and admin editing. Graph legends, stage
tables, classifications, crews and profiles share the mapped display convention.
Unmapped categories are not inferred, and role eligibility/RS0 remains separate.
The points/split toggle stays in place. The coordinated `rs-classes-1` shell/asset
version is presentation-only: no engine, schema, rules or data migration, Firebase/GCP
access or publication. Reload old tabs; roll back the matching static shells/assets
together without restoring or republishing the database. See [releases.md](releases.md).
Code commit `51a523858ce690262585100bb1e1816fdba3cb3d` was verified built, with
all 22 canonical static files byte-identical to Git and focused synthetic live-asset
checks passing every affected RS surface at 320/390/768/1440 px in both themes.
The deployment record explains the initial Pages metadata mismatch and verified rebuild.
This same-release documentation handover changes no runtime or data; recheck current
Pages/main rather than treating this historical SHA as the latest deployment forever.

### RS standings split display

The RS standings points/split control shows each existing per-round score and its
RS class contribution. RS overall totals reuse class points; no extra overall points
are awarded. Class filters retain their independently calculated RS tables; RS0 remains
unranked and provisional tables still exclude blocked events. The `rs-split-1` shell
query version must be kept coordinated across public/admin/privacy/disclaimer on
rollback. No schema, scoring, rules, Firebase or data migration accompanies this UI
change. Reload old tabs; static rollback needs no database restore or republish.
Release approval, checks and deployment verification are recorded in [releases.md](releases.md).
The code release was verified built at `3d4b48e74c09340327b9b0285a73613d479bfa17`,
with all 22 canonical HTML/runtime/brand files matching Git. A documentation-only
handover follows that release; recheck current Pages/main rather than assuming this
historical code SHA is still the latest build.

### Authorized RS workspace / logic-explorer code release

The presentation-only work based on `bcb4c8a68f975c7f7bdfa725839de4f3d798d8bc`
adds task-based RS editing and a read-only admin logic explorer. See
[data-entry-guide.md](data-entry-guide.md#rallyesport-workspace-and-logic-explorer) and
[architecture.md](architecture.md#admin-presentation-and-explanation-maintenance).
There is no schema/rules/scoring/contract migration, Firebase/GCP/workbook access or
data publication. After local review, the user authorized a commit and normal
`origin/main` code/documentation push for live review. Only GitHub Pages and canonical
static-runtime verification accompany this release. This pre-push entry does not assert
a completed deployment; approval and verification scope belong in [releases.md](releases.md).

The code release was subsequently verified built at
`1ba4ca3687b44454c19f4dc8fd604949542d8a88`, with all 21 deployed HTML/runtime/brand
files matching Git and canonical HTTPS redirects verified. Synthetic browser checks using
the actual deployed static files passed the admin gate, all explorer topics, RS tasks and
mobile/desktop layouts without provider traffic or writes. The documentation-only
verification follow-up and limits are recorded in [releases.md](releases.md). This does
not verify real sign-in, private data, roster/source truth or deployed Firestore rules.

Keep the new JS/CSS and HTML shell references together on code rollback. The common
`admin-logic-1` query version changes static cache URLs only. Retire/reload old admin tabs
before subsequent authorized data work: open tabs do not upgrade automatically.
Presentation rollback does not require restoring or republishing Firestore.
Private drafts still need private backups; the static explorer contains no live records
and cannot explain/recover an individual's missing review evidence by itself.
Its source links deliberately use the audited immutable baseline, not current admin line
numbers. A future scoring/processing change must update this maintained explanation too.

For GitHub CLI release authentication, prefer its standard `gh auth git-credential`
helper scoped to the release process. Do not extract tokens or hand-build a shell
username/password credential protocol. If a credential appears in an error, stop its
use, have the owner revoke the applicable authorization and sign in afresh, and obtain
confirmation before resuming. Revocation does not erase existing logs or tool output.

## 1. Establish what exists before touching it

1. Confirm the repository remote, checkout/worktree, branch, clean/dirty state and exact
   HEAD. Preserve other work. Fetch the intended remote branch without resetting files.
   Compare its SHA to [releases.md](releases.md) and read the intervening diff.
2. Inspect `CNAME`, `.nojekyll`, entry HTML CSP/script references and
   `assets/firebase-config.js`. A Firebase web configuration identifies a project;
   it is not admin authorization. Do not replace installed values with an empty template.
3. Read GitHub Pages settings and latest build status through authorized GitHub access.
   A commit in `main` is not necessarily the deployed build. Check canonical HTTPS
   redirects and current assets separately. Do not trigger a build simply to inspect.
4. Determine privately who owns GitHub, the domain, Firebase and optionally GA, and where
   the backups/source/test kit are. Do not record identities in this public document.
5. If live inspection is authorized, distinguish working data from published data and
   draft edits. Use read-only inspection first. A public snapshot does not contain private
   metadata/History/config and is not a full backup.
6. Read known limitations below before asserting recovery. Keep unavailable components
   listed explicitly; do not fill missing data with test fixtures or guessed rules.

### Repository and provider reference state

At the 2026-11-08 local readiness baseline, remote main and latest built Pages commit were
`6f83f22f517996ed27950f68d67383106f6fc790`. Pages was legacy branch deployment from
`main` at `/`, with `CNAME: nrrally.co.za` and HTTPS enforced. This is a dated observation,
not a permanent deployment assertion; recheck for a later handover.

The canonical public address is `https://nrrally.co.za/`, administration is `/admin/`.
The GitHub repository is `nrrally/nrrally.github.io`; its default Pages address is not the
canonical domain. Firebase/Firestore and Google Auth are separate from GitHub Pages.
The design uses `africa-south1` Johannesburg, standard Firestore default database and a
free-plan deployment; the code cannot prove the current billing plan or cloud location.

The user-authorized season-readiness code release was subsequently verified at
`12503221d3b0cf0575026cae6169e7e2e34520dc`, including Pages build, byte-identical
static assets and canonical HTTPS redirects. See [releases.md](releases.md) for
the verification scope and documentation-only follow-up. Recheck current Pages/main
at handover; synthetic UI smoke does not verify private live data, Auth or deployed rules.

The user subsequently authorized a season-wide guide code release. Its approval, source
edition, validation, compatibility and actual deployment status belong in
[releases.md](releases.md); the approval does not authorize Firebase/provider changes.
The guide remains database-independent and its 2026 edition metadata is for maintainers,
not a visible edition badge. Verify the currently built SHA rather than assuming release.
Its code commit `39f7aef64777ceedabbd1712e8d056a8159e8b56` was verified built,
with matching deployed assets and synthetic browser smoke; the documentation-only
follow-up and limitations are recorded in [releases.md](releases.md). This does not
verify live private data, authentication, rules or future regulations.

The unified NR/RS display release was verified built at
`6c2c736a37483bd7b33ff637ddd2d50bb9f69261`, with matching committed/deployed
runtime bytes and intercepted synthetic browser checks on the canonical site.
Its actual deployment record and documentation-only verification follow-up are in
[releases.md](releases.md). No database migration or provider change accompanied it;
this is not verification of live source data, authentication or rules.

The subsequent 2026 RS starter/role-eligibility release was verified built at
`1a089ad6ba5b880b94627d2c398d46ee73c27986`, with all 20 live assets matching its Git
blobs in the coordinator's checks. The coordinator also verified a protected 43-document
backup followed by one version-guarded atomic RS-only publication at
`2026-11-10T15:56:39.640614Z`: four intended writes, including one user-attributed History
entry labelled **GitHub Copilot (direct Firebase)**. Full readback verified 44 documents
and unchanged NR data. The documentation agent did not access Firebase/GCP; private
backup contents, account identities and History IDs are not reproduced here.

Coordinator live browser checks covered the approved RS results/standings and NR's 124
result rows, seven classification/stage tables and ten standings tables, without writes
or unexpected requests. R5 is still unclassified and standings provisional; this is not
a championship-finality or future-regulations determination. See [releases.md](releases.md)
for the code/data sequencing and same-release documentation-only follow-up. Runtime,
cache version (`competition-3`), guide reference edition (2026) and provider behavior are
unchanged by that follow-up. Preserve the compatible pre-change data backup and audited
before/after record: rolling back to an older runtime now requires a coordinated compatible
data snapshot, not code alone. Any data restoration still needs its own authorization,
version preconditions and atomic attributed History. Recheck live/main state at handover.

## 2. Technical inventory and reading map

There is no package manifest, bundler, application server or compiled output to recover.
The deployment tree itself is the static site. Node is a developer/test dependency only.

| File or group | Recovery purpose and important interfaces |
|---|---|
| `index.html` | Public shell, static no-JS disclosure, CSP, script order, asset cache version |
| `admin/index.html` | Admin shell and stricter no-analytics CSP; independent disclosure outside app root |
| `disclaimer.html`, `privacy.html` | Standalone legal/privacy explanations readable without JS/results; nonblocking active reminder |
| `assets/site.js` | REST published-document loader, `buildSeason` caller, season/hash context, page views, SVG charts, profile-photo loader |
| `assets/engine.js` | Pure parsing/validation/scoring/entry identity and loss logic; CommonJS in tools, `window.NREngine` in browsers |
| `assets/admin.js` | Google auth/session, working draft, editors, import review, `buildWrites`, atomic publish/rebase, undo, backups, admin list |
| `assets/ai-import.js` | Versioned JSON envelope/schema, capability profile, prompts, identity/rule/evidence review, canonical signatures, scoped plan, public projection |
| `assets/getting-started.js` | Bundled original newcomer journey, explicit `edition`, dated official sources; no database dependency |
| `assets/rally-notice.js` | Independent `public/site` promise shared by results/analytics, explicit activation, modal/reminder, visit bypass |
| `assets/analytics.js` | Validated published settings, global-default startup suppression, sanitized manual views, persistent opt-out |
| `assets/firebase-config.js` | Public project connection identifiers; preserve installed config, never substitute another project by guess |
| `assets/styles.css`, `admin.css`, `rally-notice.css` | Responsive light/dark/print styling, original identity and yellow event notice |
| `assets/official-logo.jpg` | User-supplied Northern Regions header logo; does not replace the site's NR SVG or PNG favicons |
| `assets/brand.svg`, `track-motif.svg`, `favicon.png` | Original static identity/artwork and NR favicon assets, not competitor photos |
| `CNAME`, `.nojekyll`, `.gitignore` | Custom domain, unbuilt Pages serving and private-data exclusion conventions |
| `robots.txt`, `sitemap.xml` | Crawl discovery for the canonical root/privacy/disclaimer only; admin remains crawlable so its HTML `noindex` can be read |
| `tools/load.js`, `validate.js`, `report.js` | Read a privately held app backup; validate dataset and enumerate overrides/notes |
| `tools/tests` | Public synthetic unit/VM/browser fixtures; no live write target or real competitor archive |
| `docs/firestore.rules` | Reference access rules; not proof the deployed rules match |
| `docs/data-model.md` | Full field/path mapping and public projection, backup and entry contracts |
| `docs/scoring-rules.md` | Algorithms, precedence, DNF/DNS and supported/unsupported SSR changes |
| `docs/data-entry-guide.md` | Exact import/manual/identity/source/override steps |
| `docs/season-lifecycle.md` | Calendar-only, annual guide review, event and archive/default cutover workflow |
| `docs/architecture.md`, `runbook.md` | Runtime/provider/auth boundaries, configuration and operational incidents |
| `docs/testing.md`, `decisions.md`, `releases.md` | Reproduction commands, historical reasoning, current release scope and verification limits |

### Dependency and compatibility inventory

Public results code uses browser APIs and no framework/CDN dependency. Optional enabled
GA loads Google's runtime; that is third-party executable code, not a sandboxed collector.
Admin uses dynamically imported Firebase **Auth only**, currently pinned by `FB_SDK` in
`admin.js` (inspect its value before an update). Firestore uses REST `fetch`, not the
Firestore or Firebase Analytics SDK. Google popup/auth provider settings are external.

Node 18+ runs pure tests/tools. Browser tests use Playwright plus an installed Chromium/
Edge binary. `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` may select private/external
installations. There is no production `npm install` or `npm run build`. Missing tools can
be installed externally after a missing-tool failure; do not invent blanket CI infrastructure.

All dependent query-string asset versions across public/admin/privacy/disclaimer must
match (current local version in [releases.md](releases.md)). This invalidates normal HTTP
asset caches; it is not an automatic upgrade of already-running tabs. Retire old admin
tabs before new entry/settings data. Contract versions are checked by new admin code:
entry-aware engine/import 2, rally notice 1, analytics 1; AI envelope/backup version 1.
Older already-loaded editors do not gain these guards retrospectively.

The user-authorized RS presentation/profile-parity release uses coordinated `competition-4`
asset queries. Its reviewed parent is `4d9ba9e3e20b862aca6e68fcd3d4090c2bd5653f`;
verify the resulting main/Pages SHA and static bytes rather than assuming deployment.
It reads existing
published role-scoring data without a migration or republish. An optional source-only
RS entry `vehicle` field is now understood by the engine/admin; do not enter or
publish it from an older admin validator. Retire old tabs before any separately approved
data edit. Approval covers code/documentation deployment only, not provider operations.
No database/admin writes or Firebase/GCP/workbook access accompany this release;
the existing coordinated scoring/data rollback requirements remain unchanged.

## 3. Runtime and data reconstruction

Public startup reads `public/site` and `public/people`, then `public/season_<year>`.
Each document wraps serialized JSON in `fields.json.stringValue` over Firestore REST.
The public site cannot read `docs/`, `history/` or `config/`. Result loading is cache
`no-store` on initial reads; built season models/photos are kept in memory for that page.
Reload to see a newer publication. A profile page loads all offered season bundles.
Missing any required bundle can currently prevent the profile from rendering: it does
not silently drop an unavailable historical season.

`NREngine.buildSeason({season, rounds, people})` derives standings, graph progressions,
result appearances and entry participation. No computed points/leader/graph is persisted.
Raw sports records live only in Firestore. Default settings are not rules: absent active
notice/analytics stays disabled; missing entries are unknown rather than zero; absent
results/documents show explanations. The guide is the database-independent exception:
reference content remains available during setup/outage, not cached results.

Hash paths require no server rewrites. Year-qualified paths select archives; bare paths
use the current in-page season/default. Profile IDs are stable, URI-encoded once and
HTML-escaped, not a name-derived identifier on each render. Guide paths remain shared.
Info documents/events and Sources notes/MSA evidence are selected-season content;
Site & info introduction/social/contact/useful links are global and must be evergreen.

### Search metadata and favicon

Public HTML declares one static canonical per document: `https://nrrally.co.za/`,
`/privacy.html` and `/disclaimer.html`. `/index.html` and every app hash view share the
root canonical; JavaScript must not replace it or add route-specific `noindex`.
The homepage has evergreen descriptive initial title/description and nonexecuting
`WebSite` microdata with the existing site name and canonical root URL. CSP is unchanged;
do not allow inline scripts merely to add JSON-LD. The site remains an independent archive,
not an official organisation. Existing rendered route titles remain unchanged.

`robots.txt` allows crawling, including admin and assets, and advertises the three-URL
sitemap. Admin HTML already supplies `noindex, nofollow`; blocking `/admin/` in robots
would prevent crawlers reading that directive. Neither robots nor noindex is access
control: Firebase rules still protect private data. Do not add fragments, admin,
Firestore documents, fabricated `lastmod` dates or unverified events to the sitemap.
Hash-route results/profiles/guide topics are not reliably separate Google landing pages;
fixing that needs a separately approved routing/hosting approach, not sitemap entries.

The supplied Northern Regions logo is used in the public, admin and static-document
headers at its source dimensions; the light rectangle is retained in dark mode. It is
not a favicon. All HTML shells continue to use the original `brand.svg` and `favicon.png`
NR icons. The logo file is a user-provided asset, not a change to the site's original
favicon/identity artwork. The authorized competition-display release coordinates cache
query versions as `competition-1` across index, admin, disclaimer and privacy; its base
release used `rallyesport-12`. This does not establish a deployed version; see the release
ledger. Existing tabs do not upgrade automatically. These favicon hints do not guarantee indexing,
ranking, site-name selection or display; recrawling can take days or weeks.

The small user-authorized SEO code release was verified on Pages at
`0bc94e2eb8a8eab372b33142c3c0dd29b8ff8d59`: 20 served runtime/crawl/brand files
matched Git blobs, root/HTTPS redirects matched, and synthetic live browser smoke
preserved mobile/desktop light/dark routes, guide edition, static privacy/disclaimer,
root canonical/site-name microdata and admin noindex. PNG decoded as 192x192.
Firebase responses/config were synthetic; Auth and analytics were blocked.
This is deployment/implementation evidence, not proof of Google indexing/ranking,
private data, sign-in/rules or official-source currency. See [releases.md](releases.md)
for scope and the documentation-only follow-up; recheck current main/Pages on handover.

### Working/public schemas and default handling

Use [data-model.md](data-model.md) for every field. The main path mappings are:

- `data/site.json` -> `docs/site`; public clone excludes legacy `repo`.
- `data/people.json` -> `docs/people`; published people whitelist id/name/aliases/bio/photo/links.
- `data/seasons/<year>/season.json` -> `docs/season_<year>`.
- `data/seasons/<year>/rounds/<id>.json` -> `docs/round_<year>_<id>`.
- Optional `season.rallyesport` stays inside the same season document; there is no
  separate RS collection, publication path or migration.
- `public/season_<year>` is `{season, rounds}` built from enabled round files;
  `AI.projectPublic` removes `_aiImport`, adds classification finality evidence when needed,
  and removes RS member toggles, invitation flags and applicability/bulletin evidence while
  deriving RS scoring from the private working season and people document.
- `photos/<id>` contains JPEG `b64`/type, publicly readable, not a private draft collection.
- `config/admins` is the verified-email allowlist, separate from Firebase/GitHub owners.
  `config/revision` contains the publication counter/version.
- `history/<group>-<n>` has time, by, message, path, kind and before/after JSON text per change.
  Binary photo contents are not retained there.

**Projection is not a universal private-field whitelist.** People are whitelisted; site
and season/round objects are copied with named private fields removed. Unknown working
fields can leak if added without schema/projection review. Never put private arbitrary
metadata in working sports objects just because the collection itself is private.
AI input is strict, but that does not turn general manual/backup documents into a
universal privacy sanitizer. Audit projections whenever adding fields.

Manual new-season creation clears entry evidence, calendars, documents, notes, classMaps,
MSA confirmations and AI approval, but copies class/points/minimum-start values. They
must be reviewed against actual SSRs; no annual manual approval flag proves verification.
The AI signature/evidence gate is additional and applies only to AI-reviewed metadata.
RS events/results/rules are not copied into a new season. An absent RS field remains a
valid older-season shape and does not change NR scoring or output.

### Sports semantics that must survive recovery

An event is not a scoring round; array order assigns round numbers, IDs link stored records.
A two-day event may have separate NR classifications, but dates alone do not establish them.
People are global profiles; only season apps/entries make them participants in that year.
Entry source sports evidence, coverage and explicit day membership are distinct from starts.
Do not create DNS from absence, map entry classes to scoring overrides, or allocate all days
to a weekend entry. Deduplicate resolved event crews, not just car numbers.

Store printed time/position/class/crew fields unchanged. `scoredClass` overrides the
credited driver's season `classMap`, then printed class. Co-driver classMap affects the
displayed class, not independent co-driver points. `credit` and `noCodriver` change
attributed roles/starts with reasons; `extraStarts` requires official championship evidence
for a start missing from the sheet. DNF counts a zero-point start, DNS does not.
`skipSumCheck` is an explained exception, not a way to hide an import error.

Overall/class scales, class-only categories and minimum starts are values. Best-N/dropped/
weighted rounds, bonuses, membership-filtered scoring, per-class scales, independently
different crew points, new tie-breaks and DSQ/NC/restart policy are not automatically
supported. The exact list is in [scoring-rules.md](scoring-rules.md). Unknown policy needs
an implemented engine change and fixtures; approving an AI checkbox cannot implement it.
Stage cumulative positions stop at the first missing time; printed penalties enter only
at classification Final, not at a guessed stage. Final is an endpoint, not source finality.

RallyeSport is a separate optional season subdocument. Keep RS event/result IDs, classes,
stage selection, official order/status, penalties and derived scores isolated from NR.
Reviewed shared-stage reuse stores a time-value snapshot plus explicit provenance; it is
not a live pointer and never imports NR status, class, position, penalty or points. Public
graphs are independent public views; RS stage ranks/gaps are not NR ranks/gaps, and RS
graph precision does not change NR calculations. One persistent header NR/RS control
selects home leaders/classes/results, standings, calendars, crews and profile histories.
NR is the default; RS never borrows NR data for empty seasons. The same graph interactions,
six metrics and head-to-head are available on each competition's own stage axes.
RS home/calendar and championship event links open graphs first, including existing
bare result URLs. `/classification` and `/stages` select the other result tabs;
previous/next and round navigation stay within RS. A table-first landing is not evidence
that source timing is absent: check the actual graph entry journey. Truly absent timing
or printed stage ranks is explicitly disclosed without manufacturing values.
Cross-result switching follows only a unique explicit `nrRoundId` and existing target,
otherwise selected-competition rounds. Missing RS timing/ranks remain missing, and
unresolved printed identities are not merged or linked to an invented profile.
RS round numbers are independent and RS-only events need no NR calendar entry. The
2026 Rallysprint SSR V1 profile is user-confirmed only for a privately reviewed 2026
classification set, including a pre-issue independent event. The event identities and
source records remain outside this public repository. This is not a general retroactive
rule or a future-season confirmation. Other categories are
preserved in event results but block that event's scoring. The user-confirmed DNF rule is
zero RS championship points for a starter who does not finish, while counting that
starter for the applicable 2026 event minimum only with source-backed start evidence or
a reviewed total starter count. The 2026 threshold includes source-evidenced TEST,
invitation and RS0 starters; DNS does not count. The published 2026 SSR V1 says 15; a
separate user-reported six-starter review can be recorded only with required private
evidence in the 2026 RS season document. The public scoring snapshot discloses the
applied value and its basis, not the private evidence. Do not describe the user report
as written SSR text. TEST entries are retained and never score but count toward the
minimum only with actual start evidence. The unspecified
non-scoring class, blank SSR 7.4/7.6 details, season
tie-break and SSR 7.5 tie-break implementation remain limitations. Do not broaden these
rules during restore or a future annual copy. See the
[RS scoring boundaries](scoring-rules.md#rallyesport-separate-ruleset-and-records).

The 2026 RS `membershipReview` map, manual scoring exclusions, event invitation/
applicability/bulletin inputs, and row identity/finality evidence are in the private
season document and its History/backup. The map uses stable person IDs after per-entry
identity review; it contains no membership/licence identifiers or workbook rows.
Eligibility requires a matching complete profile with both membership fields. Missing
or ambiguous evidence is unverified, not confirmed non-membership. User-confirmed
eligibility overrides have their own private provenance. The public projection strips
these inputs and evidence but retains derived per-role statuses/reasons, points and the
`user-confirmed` finality basis needed to explain scoring. The public projection contains
only source-backed RS results plus derived public scoring; never restore a hand-edited
public projection.
The public scoring snapshot is not trusted by private/admin calculations, and demo mode
cannot reconstruct its private eligibility inputs. Normal app backup restore and undo
replace the season as a whole; an RS-specific loss/replacement warning precedes mutation
and cancellation leaves the draft unchanged. Check RS evidence after restore in ordinary
review. Profile merges carry a manual exclusion and move identical membership decisions across
verified profile IDs, updating reviewed entry IDs without changing NR results. Conflicting
membership decisions must be resolved before merge. The isolated local feature work has made no Firebase,
History, rules or provider changes.

## 4. Auth, rules and administrative audit boundaries

Google sign-in authenticates; the allowlist and deployed Firestore rules authorize.
The reference rules require verified email and its lower-case membership for protected
collections. Public bundles/photos are intentionally readable. History allows create/read,
not update/delete for site admins; unknown collection paths are refused.

Client UI guards and simulation sign-in are not secrecy. JavaScript and interface code
are public; authorized simulation reads published data and cannot save. The server rules
are the actual private-data boundary. Node/Playwright mocks are not proof of deployed
rule enforcement, real Google popup behavior, IAM or external recovery credentials.

Normal **Review & publish** performs a single Firestore `documents:commit` of:
changed working documents with `updateTime` or nonexistence preconditions, changed photos,
rebuilt public documents, deleted removed-season bundles, revision+1 with a version
precondition, and new attributed History entries with nonexistence preconditions.
On a revision clash, it reloads unrelated working changes and retries once, revalidating;
a same-document edit is a conflict, not last-writer-wins.

Atomicity is a **write** property. A browser making several independent public reads is
not guaranteed a common read timestamp across them. If a publish races page loading,
refresh before comparing cross-document data. Photos also lack the same individual
version guard as working documents; console/server writes that bypass revision can evade
normal coordination. Never treat a global counter alone as protection against every writer.

**Exception: Site & info -> Admins saves immediately.** `saveAdmins` uses the allowlist's
updateTime but does not go through Review & publish, bump revision or add normal site
History. App backups omit it. Record this configuration change privately and verify access.
Other project ownership/Auth/rules/DNS/GA-console changes are outside normal site History.
Do not describe every Firebase operation as undoable by the app.

### Future authorized direct Firebase operation

Prefer normal admin publication. If a user explicitly delegates a direct sports/settings
write to Copilot, first obtain the correct project/account access privately and define
the exact changed objects. Do not use console edits that leave projections/History stale.

1. Read fresh working/public/revision documents and relevant photos/config with their
   server updateTimes. Preserve private before snapshots, all source artifacts and the
   requested user attribution. Pause coordinated writers if snapshot consistency needs it.
2. Validate the intended full dataset using shared engine/import rules and inspect a
   before/after diff. Retain unrelated edits; produce the same public projection as admin.
3. Build one bounded atomic commit with changed-document and revision preconditions,
   public updates, any intended deletions, and append-only History before/after entries.
   Use the exact label **GitHub Copilot (direct Firebase)** in the message and attribute
   `by` to the authorizing user, not an invented bot/admin identity. Keep attribution private.
4. Guard public/photo/config versions too when relevant to the direct operation.
   Check safe document/request/write limits (conservative 1 MiB per document with reserve,
   10 MiB request, at most 500 writes). Never split an inconsistent restore across commits
   merely to fit limits; plan a separately authorized migration/recovery instead.
5. A stale version rejects the whole commit. Reread and review; do not blindly retry
   with removed preconditions or overwrite a concurrent edit.
6. Verify the atomic result read-only, public/source behavior and attributed History.
   Store the private recovery snapshot/source evidence outside Git; update operational
   docs and release records before any subsequent authorized push.

If tooling/permissions cannot perform an atomic audited change, stop. A later History
write is not equivalent. Project-wide configuration, allowlist, photos and History recovery
may exceed the app's history model and require an explicitly designed owner-level plan.

## 5. Private recovery package

Keep this package encrypted/access-controlled, outside the public checkout, with at least
two authorized custodians and a tested retrieval/restore procedure. The repository records
the categories, not real file paths, people, account emails, tokens or access challenges.

| Component | Why the public repository/app backup is insufficient |
|---|---|
| App backup with timestamp/hash and published-vs-draft label | Contains sports docs and referenced photos, not full project state |
| PITR-timestamp Firestore document export or privately validated equivalent | Needed for a point-in-time Firestore document set; export does not include Auth, Storage object bytes, rules/config or provider state |
| Original official PDFs/calendar/SSRs/bulletins/MSA points | URLs can disappear; printed data and overrides require actual source artifacts |
| Private decision/provenance notes | Explain identity/credit/class/extra-start/exception choices and consent |
| Access register/recovery procedures | GitHub/org, domain registrar/DNS, Firebase/GCP owners, allowlisted admins and GA custodians |
| Auth/project/provider configuration inventory | Auth users/providers/authorized domains, rules, web config, IAM, billing/quota/location, GA stream settings |
| DNS/Pages configuration record | Zone/verification/TLS/redirects and unrelated mail records must survive a domain rebuild |
| Private test kit and representative source fixtures | Reproduces verified actual-season arithmetic/import layout regression |
| Authorized offline Google runtime snapshots | Reproduces captured-container startup behavior; never commit real property scripts/IDs |

App backups include `exportedBy` and can contain private metadata; even name-only official
sports data can be personal. `.gitignore` is not sanitization. Do not paste backups into AI
services, put them in issues/PRs, or attach them as public debugging fixtures.

### Precisely what the app backup does and does not do

`backupText` serializes the browser's current undeleted `A.docs`, including unpublished
changes. It collects staged photo bytes or fetches existing DB photos referenced by current
profiles. It does **not** list/export all `photos/`, History, allowlist, revision,
public projections, Auth users, rules, project owners/configuration, DNS or GA-console state.
Photos not referenced by those profiles are not included. Photo reads can be later than
the working-data load; this is not a guaranteed point-in-time database snapshot.

`readBackup` checks JSON, format and required site content; it is not a full versioned
project-export validator. Publication then validates the working dataset. `stageAll`
replaces working docs, marking ones absent from the backup deleted, and stages supplied
profile photos; it is **not** an exact whole-photo-collection prune/restore. It has an
extra loss confirmation for reduced/replaced entry evidence. Restoring a backup may
remove analytics/active settings or recover an old enabled configuration when published.
Review every site diff explicitly.

History stores before/after JSON of changes, not binary photo payloads. Undo stages the
selected group's before versions against today's working copy, and a later publish makes
a new audit group. Undo of an older group can erase later edits to those same documents.
It is not a reverse transaction guarded against the selected historical after state.
Undo can remove a newly referenced photo but cannot resurrect its old bytes without a backup.

### Point-in-time Firestore export and restore limits

The regular managed Firestore export is **not** an exact snapshot at export start; it may
include document changes made while it runs. A point-in-time export requires PITR to be
enabled and an explicit whole-minute timestamp within the retained PITR window (currently
up to seven days, not earlier than `earliestVersionTime`). Verify the selected timestamp,
database, project, completed operation metadata and exported object set before treating it
as a recovery point. See Google's [Firestore export/import guide](https://firebase.google.com/docs/firestore/manage-data/export-import).

Managed export/import requires Firestore `datastore.databases.export` / `datastore.databases.import`
permissions and Cloud Storage access for the operator and Firestore service agent; the
documented managed roles are Cloud Datastore Import Export Admin (or broader Owner) and
Storage Admin for the bucket. A project owner or authorized operator must verify the live
IAM bindings, PITR state, billing, database location and bucket policy before an export.
The repository does not establish those permissions or prove that a suitable bucket exists.

A Firestore export covers Firestore documents, not a complete Firebase project. It does
not capture Authentication users, Firebase Storage object bytes, Firestore rules/index
definitions, project/IAM ownership, app configuration, DNS, Pages or Analytics settings.
Keep separate protected recovery artifacts for those services and verify photo bytes,
History, allowlist, revision and public-document scope. A managed import overwrites
documents with matching IDs but leaves unaffected documents in place; it is not an exact
delete-and-replace restore. Use a reviewed isolated restore target or a separately planned
controlled recovery, and preserve target state and History before any production restore.

For a release involving legacy clients, merely asking admins to close tabs is not an
enforceable freeze. A practical server-side freeze is a separately authorized temporary
Firestore rules change denying all writes to the affected site collections, verified
against old and new clients, followed by a controlled release and a reviewed rule rollback.
That changes production rules and is **not** part of this local-only preparation; without
an authorized, verified server-side freeze or equivalent guard, do not claim writers are
stopped.

## 6. Safe restoration and rollback

### Application data restore into an existing intact project

Only after explicit user authorization:

1. Confirm project, allowed admin identity, deployed compatible code and target scope.
   Do not import a fixture to "see if it works." Preserve current private working/public/
   revision/config/photo state before replacement; coordinate writers and record versions.
2. Verify the chosen backup's provenance/hash, timestamp, whether drafts are included,
   complete season/person/entry coverage and required photo bytes. Run
   `node tools\validate.js <private-backup.json>` and
   `node tools\report.js <year> <private-backup.json>` from the checkout.
3. Rehearse in mocked tests or authorized simulation; simulation is published-data based,
   not a full recovery dry run. Check restored sources, contracts, rules and configured IDs
   privately. Use a specifically authorized isolated test project for a cloud restore
   rehearsal only if needed; never silently select it or copy personal data into a public fixture.
4. In **Dashboard -> Backups -> Restore from a backup**, select the app-format file.
   Review entry-loss warnings and every working diff, deletions, default year, sources,
   classMap/credit exceptions, analytics/notice settings and photo availability.
5. Use **Review & publish** only after full review. Its atomic commit refuses stale
   versions and oversized data; conflict means reload/review, not force overwrite.
6. Verify the live public bundles, classifications/points/profiles/source status and
   new History read-only. Take a fresh authorized private backup and keep the pre-restore one.

### Lost/empty project or full provider reconstruction

Recover owners/account access first. Recreate the project/Google Auth/domain/rules bootstrap
under owner authorization using [README](../README.md) and the private config register.
An app backup can repopulate sports docs and referenced photos in a properly configured
empty database; it cannot restore deleted Auth users, owner roles, History, allowlist,
revision chronology or GA properties. New-public reconstruction from working docs is
deliberate publication, not restoration of the exact historic published state.

A full database/Auth/provider restore needs a separately reviewed owner-level plan:
verify snapshot readTime/versions, record existing target state, avoid overwriting
append-only History, restore compatible project/security/config and verify access.
Privileged server tools can bypass client rules; they must not be treated as permission
to silently replace History or invalidate concurrent work. If the full restore cannot fit
one atomic audited commit, do not claim that the app provides atomic full-project recovery.
Plan staged recovery with controlled outage/readers, documented checkpoints and authorization.

If private data/source backups are missing, recover only available code/config and state the
loss. Official PDFs can support a new carefully reviewed transcription, not perfect recovery
of all prior identity/override/consent/history decisions. Never derive those from imagination.

### Code rollback without data rollback

Inspect the diff and data contracts before reverting. Roll back to a compatible v4 code
commit by a new reviewed commit; preserve firebase config and CNAME. Do not deploy v1-v3
bundled-data versions or an editor predating current entries/notice/analytics.
Deploying old code does not roll back Firestore. Likewise History undo does not roll back
HTML, guide edition, GA stream configuration or provider rules.

Keep analytics disabled during an incompatible privacy regression; disabling is a separately
authorized settings publication and affects newly loaded pages, not cached open tabs.
Verify Pages built the approved rollback SHA and domain/HTTPS/auth/assets. Record the change
in [releases.md](releases.md) before pushing and its actual deployment after verification.

## 7. Hosting/domain/deployment reconstruction

GitHub Pages serves the repository root from main; `.nojekyll` bypasses Jekyll and no build
command is required. Changing code on a feature branch is local review, not deployment.
The repository CNAME and Pages settings must agree; Pages settings can themselves create
a main-branch CNAME commit. Fetch/reconcile it instead of overwriting it.

For a separately authorized domain change, verify ownership for the organization through
GitHub Settings -> Pages and its generated TXT challenge before pointing traffic. Obtain
the actual challenge from GitHub, not a guessed value. Preserve domain verification.
In repository Settings -> Pages configure the custom domain, then update only required
DNS records using the registrar's actual interface. Preserve MX/TXT/mail/other records.
Use current [GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
and [verification instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
Do not use a historic nameserver/IP record as a current requirement.

Add canonical/applied www domains to Firebase Authentication authorized domains while
retaining required existing domains and the installed Firebase `authDomain`; do not assume
the authDomain must become the custom site hostname. Verify DNS propagation, apex/www
routing, certificate issuance and HTTPS enforcement independently. Pending certificate
is not success. No need to change Firebase Hosting: this site is hosted by Pages.

### GitHub credential mismatch: safe process-scoped strategy

The app-provided `GH_TOKEN`/`GITHUB_TOKEN`, gh's stored account and Git Credential Manager
can select different identities. A successful `gh api` read does not prove a git push has
write permission. Verify the intended authorized identity with `gh api user`, then repository
permissions privately; do not publish identity dumps or token output.

If an explicitly authorized account should be used rather than an injected token, remove
the conflicting token variables only inside the command process. Use the authorized
stored gh account/session without globally switching GCM or changing global git settings.
For an authorized push, the proven helper strategy is command-scoped:

```powershell
# Only after explicit push approval and verified gh identity/permissions.
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin <reviewed-branch>
```

The empty helper clears the inherited helper for that invocation; gh provides credentials
without printing a token. Do not run it as a diagnostic probe, put tokens in command arguments,
disable TLS, force-push, or infer approval from this example. This task's release is local only.

## 8. Analytics/notice recovery and diagnosis

Follow [runbook.md](runbook.md#google-analytics-4) and
[testing.md](testing.md#optional-actual-google-runtime-check). Analytics settings reside in
published site config and are staged/audited like other site changes, not hard-coded.
They are publicly visible in a browser but still must not enter public docs/fixtures.
Absent/disabled/malformed/unreadable config or excluded routes must not load GA.

The old startup sequence waited for `onload` to configure the stream. Captured configured
containers auto-initialized earlier and sent a raw URL/title/referrer pageview. Queue global
`send_page_view:false` plus safe page context **before** js/config/script insertion; update
global category context on navigation and do not pin stale per-stream context.
Do not discard suppression defaults on an excluded route while the tag is pending.
One initial manual view and sanitized query **and** body fields are required; a safe
effective event cannot excuse an unsafe duplicate/raw query.

The generated-ID Google runtime did not reproduce every configured-container behavior.
An authorized offline captured-container replay, IDs replaced in memory, is stronger
snapshot-specific evidence. All browser requests must be intercepted, collection fulfilled
locally, unexpected hosts aborted, service workers blocked and private IDs not printed.
Never fetch/forward a real stream merely to rerun local tests; keep captured scripts private.
No snapshot proves future remotely changed Enhanced Measurement, connected destinations,
server processing, legal consent or Realtime. Keep all Enhanced Measurement off, verify
live configuration separately after intended deployment and treat provider changes as review.

Privacy opt-out uses browser-local `nr-analytics-choice`; it sets disable flags, removes
accessible first-party GA cookies and reloads to unload the tag. It cannot recall sent
requests, delete GA-stored data, or impose a preference on every browser. Storage failures
are surfaced/fail closed. Global theme preference is unrelated.

Active-rally notice uses `site.activeRally`, explicit enabled/name/validated NRC HTTPS
destination and activation ID, not calendar status. It reads site independently and retains
its modal/reminder outside the app render root. The bypass is visit/tab `sessionStorage`,
renewed activation shows again; disclaimer/privacy start with nonblocking reminders.
Unknown site settings on outage cannot prove whether an event is active. Admin is exempt.

## 9. Failure diagnosis order

| Symptom | Read-only first checks | Safe next action once authorized |
|---|---|---|
| Missing results but guide works | Connection config, published/site and season availability, network/status, quotas | Restore publication/connection, not bundled fallback |
| Empty new year shows no entrants | Actual entry evidence/scopes and selected year | Obtain official entries; do not reuse archive people as entrants |
| Past round awaiting results | Calendar date validity, official cancellation/postponement/classification source | Update sourced facts/import whole classification |
| Info opens wrong year | Hash prefix, season selection, global useful links versus season docs | Correct year-specific documents/navigation |
| Old guide differs from SSRs | Maintainer edition metadata, labelled sources and actual official new editions | Review/rewrite dated copy; do not relabel old content |
| Wrong points/crew/start | Printed source, class/credit precedence, DNS/DNF/extraStarts, MSA evidence | Explain corrections through reviewed overrides |
| Import refuses PDF | Known layout, selectable text, all page/row counts | Use manual/spreadsheet route or implement tested parser |
| AI rules/signature block | Missing sources, unsupported policy or changed signed settings | Actual rule review or developer implementation, never fabricated support |
| Publish conflict | Fresh document updateTimes and revision, same-document versus unrelated edit | Preserve private draft, rebase/review; never remove guards |
| Oversize commit/bundle | Write/request/document budgets | Plan smaller complete task or storage migration; do not partial-publish broken season |
| Google login blocked | Popup, authorized domain, verified account, allowlist and deployed rules | Owner/admin correct specific config; do not broadly relax rules/CSP |
| Unexpected analytics request | Stream Enhanced Measurement, startup queue order, raw query/body/referrer, opt-out | Authorized disable and tested fix; avoid real-ID fixtures |
| Site changes not visible | Latest Pages build SHA, HTML version, browser model cache, published versus working | Refresh/redeploy or publish only with separate approval |
| Photo absent after undo | History has no bytes, profile db reference, backup photo coverage | Recover authorized private photo bytes/consent |

## 10. Reproduce and hand over honestly

Run public synthetic units and applicable mocked browser tests from [testing.md](testing.md).
They cover calendar-only/unknown/known-empty/entry-only behavior, dates/timezones, archived
seasons, guide outage/navigation, entry deduplication, auth/session, atomic publication,
backup/undo/conflict flows, notice and analytics privacy. No production writes or analytics
are needed. Actual 2026 arithmetic/import fixtures remain private; missing private tests
must be reported, not replaced with a claim of full real-data verification.

For a new handover, record reviewed commit/base, tested commands/results, unavailable private
components, guide edition, contracts, deploy/publish/restore permissions and remaining tasks
in the release record. Give the authorized custodian the private package through an approved
private channel. Keep repository docs current at every push so recovery does not depend on
the next chat surviving. These instructions are comprehensive about the solution's observable
design and workflows, but cannot promise seamless reconstruction of lost private state.
