# Release and recovery records

This ledger is part of recovery, not proof that a release was authorized or deployed.
Code deployment, database publication and provider configuration are different operations.
Update this file **before every push**, together with affected documentation.
After an approved deployment, verify its actual SHA/status and record that separately.
Do not put private History identifiers, account identities, property IDs or backups here.

## Before EVERY push

1. Read [AGENTS.md](../AGENTS.md). Confirm the current request expressly authorizes the
   intended push and destination. A previous deployment approval is not reusable.
2. Fetch the intended remote branch; compare its exact SHA with the reviewed base.
   Inspect working changes, staged diff, new files and commit range. Do not force-push
   over someone else's changes or deploy from an unreviewed branch.
3. Update affected schema, architecture, scoring, UI, administration, lifecycle,
   testing, provider, privacy and recovery documentation. Add/update the release entry
   below even for a documentation-only push. Record unchanged operational scope explicitly.
4. Record validation commands/results and what could not be checked. Verify links and
   examples contain no private data. No test writes/analytics traffic may reach live services.
5. Record contract/cache compatibility and data migrations (or explicitly none),
   guide source edition, manual operational steps and rollback compatibility.
6. Record approval scope and planned destination. Keep credentials process-scoped;
   verify identity and repository permission without exposing tokens.
7. Commit code and documentation together or as a reviewed coherent local series.
   Review `git status --short` and `git diff --cached --check` before the authorized push.
8. For approved deployment, verify GitHub Pages built the intended code SHA; check the
   canonical domain, HTTPS, assets, public routes and admin sign-in. Record actual
   deployment separately; do not confuse a successful push with a successful Pages build.

This is a human/agent release invariant, not a pre-push hook or CI gate. A failed check
must be addressed; there is no automation that can infer approvals or certify private recovery.

## 2026-11-11: authorized RS standings split display

- Based on freshly fetched `origin/main`
  `891c170a156c1dc8e9f135fa6ab91977d8fecdc7`. The user requested the RS Standings
  toggle and explicitly authorized testing and pushing live: a normal non-force
  code/documentation push to `origin/main` and Pages verification. No Firebase/GCP,
  rules, data publication, season creation or provider configuration change is included.
- RS driver/co-driver standings gain the NR-style Points / Overall + class split control.
  Split mode annotates each existing round value with its contributing RS class, including
  zero and class changes. Overall totals reuse class points; there is no separate overall
  award. Existing role-specific class tables, positions, eligibility, provisional and
  unavailable values are not recalculated by the toggle. Role/class navigation retains
  the display choice. The logic explorer and public route/testing/recovery notes describe it.
- The engine, scoring, schema, public data, authentication and analytics are unchanged;
  no migration or data republish is needed. HTML asset query versions advance together
  to `rs-split-1`. Guide reference edition stays 2026. Reload old tabs; presentation-only
  rollback restores matching shell/assets and needs no database restore. Private backups
  and real source/roster verification remain outside the scope of this code change.
- Validation: all 106 Node tests and the synthetic public, admin access, AI import,
  rally notice and analytics browser suites passed. Public checks cover split values, class changes,
  RS0 and DNF, navigation/history/reload, and 320/390/768/1440 px in both themes. Browser
  provider requests are intercepted; no synthetic analytics reaches a real collector.
  The admin season-creation assertion waits for the selected year rather than merely the
  already-present selector, avoiding a pre-existing asynchronous-render race in the test.
  Optional actual-Google-runtime replay is not part of this display change and is not
  claimed here. These checks do not certify real data, live sign-in or deployed rules.
- The approved existing write-capable keyring account is used through temporary,
  non-secret, process-scoped GH configuration and `gh auth git-credential`; no token
  extraction or global authentication change. Verify exact remote base and staged scope
  before push. Pages status and canonical byte comparisons must be verified after push;
  this pre-push record is not a claim that deployment has already succeeded.

### Deployment verification and documentation-only follow-up

- The code release was normally pushed as `3d4b48e74c09340327b9b0285a73613d479bfa17`.
  GitHub Pages built that exact SHA at `2026-11-11T07:13:52Z`, from `main` at `/`;
  the configured canonical domain is `nrrally.co.za` with HTTPS enforced.
- All 22 tracked HTML, runtime and brand files matched the built commit byte-for-byte
  at the canonical site with the release query version. The canonical homepage, admin,
  privacy and disclaimer endpoints returned HTTP 200. This does not verify live sign-in,
  private data, real standings/source correctness or deployed Firestore rules.
- This same-release follow-up updates only this verification record and recovery
  handover. **No runtime, scoring, data, schema or operational behavior changes.**
  Before its normal push, confirm main is still the verified code SHA and review the
  documentation-only staged diff. Verify the resulting Pages build and unchanged
  canonical runtime bytes after pushing; report the resulting SHA separately.

## 2026-11-10: authorized RS admin workspace and logic-explorer release

- Based on freshly fetched, clean `origin/main`/HEAD
  `bcb4c8a68f975c7f7bdfa725839de4f3d798d8bc`. After local implementation/review,
  the user approved "we can commit and ill review live". This authorizes committing
  the reviewed code/documentation, a normal non-force push to `origin/main`, and
  Pages/static-runtime verification. Preflight re-fetched that exact base with no drift
  and confirmed the reviewed 18 paths only. No PR, Firebase/GCP/workbook access,
  rules/schema/scoring change or data publication is authorized or performed.
- RS administration is divided into events/results, season setup, people/eligibility
  and scoring checks. A selected event has evidence, classification source, stages/reuse,
  collapsible crew rows and points-preview tasks; its compact switcher retains the task
  without repeating every event card. Membership review uses searchable cards.
  Keyboard focus, selected task and disclosure state are UI-only; the existing draft,
  editing bindings, complete validators and Review & publish pipeline remain in place.
- The admin-only Logic explorer has 30 searchable, connected NR/RS/shared topics,
  numbered decision flows, branch conditions/outcomes, unsupported cases and per-decision
  exact source links pinned to the audited baseline above. It distinguishes NR/RS rules,
  source positions versus points, independent RS roles, missing versus zero,
  source finality versus MSA confirmation, provisional season totals, graph observations,
  projection/privacy and unsupported years. It is manually curated documentation,
  not a scoring engine, live competitor diagnosis or certification of source evidence.
- The pure engine, public renderer, AI contract/projection, authentication/provider
  adapter, Firestore rules, schema and scoring decisions are unchanged. Static cache
  query versions advance together to `admin-logic-1` in public/admin/privacy/disclaimer
  shells; new catalogue/style assets load only in admin. No migration or database
  republish is needed. Guide reference edition stays 2026; analytics remains excluded
  from admin and synthetic traffic never reaches collection.
- Validation: all **106 Node tests** passed, including catalogue graph/source-range checks
  and VM assertions that browsing every topic/task preserves drafts, scoring, projections
  and validation. `node tools\tests\admin-access-e2e.js` passed all-topic navigation/search,
  access gates, keyboard/disclosures/focus and RS tasks at 320/390/768/1440 px in light/dark,
  unchanged full draft backups and existing editing/reuse/restore/merge/simulation checks.
  `node tools\tests\site-theme-e2e.js` and `node tools\tests\ai-import-e2e.js` passed.
  Existing external Node/Playwright and installed Edge were reused; no dependencies
  installed or global settings changed. Release preflight repeated these checks successfully:
  **106/106 Node tests**, all three browser suites and `git diff --check` passed.
  Full diff and all four new synthetic/catalogue files were reviewed; only the 18
  reviewed paths are in scope. Staged whitespace/scope review and the final remote-base
  guard precede committing/pushing. Stop on unexpected remote drift.
- A loopback-only synthetic review helper is reproducible with
  `node tools\tests\admin-review-preview.js`. Its prominent banner, injected local adapter,
  read-only server and self-only CSP prevent live Auth, external fetches and publication.
  In-memory edits remain temporary. Desktop/mobile captures are outside Git. Stop the
  preview process after review. These results do not verify deployed rules, real roster
  correctness, a private backup, source completeness or every WCAG criterion.
- Recovery: keep code/CSS/shell versions together. Retire/reload old admin tabs before
  subsequent separately authorized data work. Presentation-only rollback needs no data
  restore; existing compatible snapshot/data constraints still apply. The static public
  catalogue is not confidential and cannot recover private working data. Future processing
  changes require a semantic re-audit of topics and immutable evidence links, not just
  passing the source-range test.
- Release authentication uses the expressly approved existing write-capable keyring
  account through a temporary non-secret, process-scoped GH configuration and standard
  `gh auth git-credential`; identity and repository push permission were verified.
  No token extraction or global authentication changes.
  The selected ID-based noreply author/committer and Copilot coauthor trailer are retained.
  Immediately before push, require `origin/main` still to equal the reviewed base.
  Pages completion and canonical live byte comparisons will be reported after the push;
  this pre-push record is not a claim that deployment has already succeeded.

### Deployment verification and documentation-only follow-up

- The reviewed implementation was committed and normally pushed to `origin/main` as
  `1ba4ca3687b44454c19f4dc8fd604949542d8a88`. GitHub Pages reported that exact
  commit **built** at `2026-11-10T18:32:08Z`, from `main` at `/`, with canonical
  `nrrally.co.za` and HTTPS enforced.
- After the build, all **21** canonical deployed HTML/runtime/brand files matched
  the commit's Git blobs byte-for-byte, including both new explorer assets and all four
  coordinated HTML shells. HTTP canonical-domain and default Pages-domain requests
  redirected to the canonical domain.
- A fresh browser loaded the actual canonical deployed static assets, with all Auth
  and Firestore responses replaced by synthetic in-process data and every other external
  request refused. Signed-out explorer deep-link gating, all 30 topic headings, NR/RS
  decision paths, search, RS task navigation/event selection, keyboard disclosures,
  390/1440 px layouts and public startup passed. There were no attempted writes,
  external provider/analytics requests or page errors. The smoke harness was corrected
  to assert disclosure toggling relative to its retained state, not assume a previously
  opened row had reset; no runtime change was needed.
- No live sign-in, private records, real roster/source verification, Firebase/GCP/workbook
  access or data publication was attempted. Existing open tabs still require a reload.
  The local synthetic review server was stopped after canonical verification.
- This follow-up changes only this deployment record and the recovery handover.
  **No runtime, scoring, schema, data or operational behavior changes.** It is the
  documentation completion of the same approved release, not approval for another code
  release. Before its normal push, require remote main still to equal the verified code
  commit above, review the two-document diff and staged whitespace, and then verify
  Pages built the documentation commit with the same 21 runtime files unchanged.

## 2026-11-10: authorized RS presentation and information-parity release

- Based on clean HEAD and freshly fetched `origin/main`
  `4d9ba9e3e20b862aca6e68fcd3d4090c2bd5653f`. The user requested NR-style RS
  information density, less repeated commentary and feature parity, especially profiles.
  Following synthetic/visual review, the user explicitly approved "Push to live."
  This authorizes a normal non-force code/documentation push to `origin/main` and Pages
  verification only; no database/admin writes, workbook or Firebase/GCP access.
  Release preflight re-fetched the exact reviewed base with no drift and confirmed only
  the reviewed 19 paths changed. The approved existing keyring account was verified with
  push permission through a temporary non-secret, process-scoped GH context; no tokens
  were extracted and no global authentication settings changed.
- RS classification now follows the tabs immediately, using compact crew/position/car
  cells, separate source class/official finish, total/penalty and independent role scores.
  Narrow screens show labelled crew cards. Stage timings remain in Stage times.
  Source notes and the secondary scoring order are closed, keyboard-accessible disclosures.
  Official qualifications remain accessible; pending technical checks keep a visible badge.
  Reviewer evidence is not rendered as result-header commentary.
- Removed the homepage's repeated RS0 essay/non-scoring leader card. Kept a short
  provisional note and added RS-only hero statistics/latest-graph action and leader bars.
  Other RS tables/profiles use a short SSR 6.1 footnote, not a declaration of non-membership.
  Detailed scoring limitations remain available in scoring notes.
- RS reuses NR's profile header and season-points SVG renderer, with separate RS role
  values and gaps for unavailable points. Profiles retain source car numbers, partners,
  source vehicle when recorded, official results, recorded stage wins, standings links and
  selected-car graphs even for RS0. Crews has corresponding class/standing/appearance
  details; championship tables show per-event points. Canonical person/season context
  survives switching. No NR results, times, points or vehicle values are copied into RS.
- Optional RS entry `vehicle` is validated source-only text (maximum 200 characters),
  carried through the public projection and editable in admin. Existing data needs no
  migration or publication. Missing vehicle displays "Not recorded"; missing timing/points
  are not fabricated. Older admin validators do not accept newly populated vehicle fields,
  so retire old tabs before such a separately approved data edit.
- Cache queries advance together to `competition-4` across public, admin, privacy
  and disclaimer shells. Scoring policy/calculations, source classifications, memberships,
  NR behavior, guide reference edition (2026), analytics, Auth and provider configuration
  are unchanged. Existing compatible scoring/data rollback requirements still apply.
- Validation: `node --test --test-reporter=spec` passed all 102 tests (zero failures).
  `node tools\tests\site-theme-e2e.js` passed at 320/390/768/1440 px, including light/dark,
  keyboard disclosures, mixed-role source preservation and canonical profile switching.
  `node tools\tests\admin-access-e2e.js` passed, including optional source vehicle editing.
  These used the supplied external Node/Playwright and installed Edge with process-only
  environment variables; no installs or global settings changed. `git diff --check` passed.
  Desktop/mobile before/after captures remain outside Git. All fixtures/requests were
  synthetic/intercepted; none certify a real competitor's record or provider state.
- Release checks repeated the Node and public/admin browser commands above successfully:
  102/102 Node tests and both browser suites passed again; `git diff --check` passed
  with exactly the reviewed 19 modified paths and no untracked files. Staged
  whitespace/scope review is required before committing.
  The commit uses the previously selected ID-based noreply
  author/committer and required Copilot coauthor trailer. Immediately before pushing,
  require remote main still to equal the reviewed base above; stop on drift or failure.
  After pushing, verify the exact Pages build SHA and canonical live static bytes.
  Deployment results are reported separately after verification, not assumed here.

## 2026-11-10: authorized RS release preparation (push gate pending)

The user approved the reviewed preview with "ok push to live and i'll test more."
The coordinator has limited this worktree's current action to preparing a local commit;
push must wait for its explicit database-preflight gate. The coordinator exclusively owns
protected backups, audited database publication and readback. This agent has not accessed
Firebase/GCP or the private workbook/reconciliation data and will not do so.

Fresh fetch confirmed both local HEAD and origin/main at the reviewed
`75c906a3cd3085fd457dd9f2a16e1bf9ad68835b`, with no base drift. The intended later
destination is a normal, non-force update to origin/main and GitHub Pages; no push or
deployment has occurred at this preparation stage. The local commit uses the previously
user-selected ID-based noreply author/committer scoped only to that commit, plus the
required Copilot co-author trailer; no global identity/authentication setting is changed.

Scope is the six-starter review, retrospective role-specific 2026 RS membership policy,
private validation/admin controls and privacy-preserving public projection, plus the
reviewed championship/source UX corrections documented below. Asset queries are
coordinated at `competition-3`. NR calculations/source data, static hosting, the guide's
2026 reference edition, analytics, Auth and provider configuration are unchanged.
Code-before-data compatibility, retirement of old admin tabs, coordinated rollback and
the still-open finality/double-points/R5/2027 boundaries remain as documented below.
Prior "not released" records describe preparation history, not a veto on this new approval.
Actual code deployment and database publication must each be verified separately.
Release-preparation validation: the final full Node suite completed with 99 tests passed,
zero failures. The public theme suite passed after the actual-class standings fix;
Official finish headers also pass focused Node assertions. The admin access suite
passed during this preparation series. All browser provider traffic was intercepted
with synthetic fixtures. Diff whitespace checks passed; no untracked files were present.
These checks do not certify actual source truth, live authentication, deployed rules or
the coordinator's separate private candidate/publication.

### Actual deployment and audited publication verification

- The authorized normal, non-force push advanced the reviewed parent to
  `1a089ad6ba5b880b94627d2c398d46ee73c27986`. GitHub Pages built that exact SHA
  successfully. The coordinator verified all 20 live assets against its Git blobs.
  The first push attempt was rejected under an account without repository permission;
  the successful push used the existing authorized keyring credential through the
  standard `gh auth git-credential` helper with a temporary isolated configuration.
  No token was extracted or global authentication setting changed; the temporary
  configuration was removed.
- The coordinator reports that the final protected Firestore backup contained 43
  documents. At `2026-11-10T15:56:39.640614Z`, one version-guarded atomic RS-only
  transaction performed the four intended writes, including one History entry
  attributed to the user and labelled **GitHub Copilot (direct Firebase)**.
  Full post-publication readback verified 44 documents and unchanged NR data.
  Private History IDs, account identities, workbook/reconciliation data and backup
  contents remain outside Git. These publication facts are supplied by the coordinator;
  this worktree's agent did not access Firebase/GCP.
- Coordinator live browser checks verified the approved RS results/standings and NR's
  124 result rows, seven classification/stage tables and ten standings tables, without
  writes or unexpected requests. R5 remains unclassified and championship standings
  remain provisional. These checks do not resolve unverified finality, double-points,
  tie-break or future-year regulations.
- Recovery now requires the compatible reviewed data snapshot as well as code:
  restoring an older runtime alone can misinterpret the revised eligibility policy.
  Preserve the protected pre-change backup and audited before/after record; any data
  rollback needs separate authorization, version preconditions and atomic History.
  Old admin tabs were closed and edits paused before the coordinated rollout; that
  user-confirmed pause is not a permanent server-side write freeze.
- This documentation-only verification follow-up is within the same user-authorized
  release. Only `docs/releases.md` and `docs/recovery.md` change. Runtime assets, scoring,
  data contracts, `competition-3` cache queries, the guide's 2026 reference edition,
  Auth, analytics and provider configuration are unchanged. No further database
  operation is authorized or performed here. Before its normal non-force push, verify
  main still equals `1a089ad6ba5b880b94627d2c398d46ee73c27986`; stop on drift.
  Review the docs-only diff and whitespace, then verify the resulting Pages build SHA
  separately. Existing code tests apply; no runtime behavior changes in this follow-up.

## 2026-11-10: local 2026 RS starter-threshold implementation (not released)

- Based on fetched `origin/main` `75c906a3cd3085fd457dd9f2a16e1bf9ad68835b`, which
  matched the requested review baseline before edits. This is isolated local work only:
  no commit, push, deployment, Firebase/GCP access, data export, authentication or write
  occurred. No database publication or code release is authorized by this change.
- The engine keeps the published 2026 SSR V1's 15-starter event minimum as the default.
  A 2026-only `rallyesport.starterMinimumReview` can apply six only when it has exactly
  `minimum: 6`, `reviewed: true` and non-empty evidence. Unreviewed, malformed or
  evidence-free records fail closed. The source SSR profile/title/URL stay unchanged;
  no written amendment or bulletin was supplied. The private evidence is stripped from
  public projection while the calculated snapshot retains the applied minimum and basis.
- R1-R4 are still individual event-point decisions: event-specific classification,
  ruleset, championship and other existing evidence must be verified before an event
  scores. Four scoring events do not satisfy SSR 7.2's season round-count rule. R5 remains
  unclassified, double-points/finality and other gates remain unresolved, and the
  championship cannot be marked final. Existing DNF, TEST, invitation, identity and
  membership behavior is unchanged; no membership-policy expansion was made.
- The admin has a 2026-only control for the SSR baseline versus the reported six-starter
  review, with required private evidence. Public RS surfaces distinguish the user-reported
  six from the printed SSR V1 value of 15 without exposing evidence or changing source
  classifications. A non-2026 review is rejected and can be removed in the admin.
  All shell asset queries are coordinated at `competition-2`; already-open tabs still
  require retirement/reload.
- No Firestore schema migration or data edit was made. After a separately authorized
  code deployment and retiring old admin tabs, the coordinator can record
  `starterMinimumReview` in the 2026 working `docs/season_2026` document, including the
  reviewed provenance and explicit lack of a written amendment. Verify existing R1-R4
  `countsForChampionship`, applicability and other event evidence against the private
  sources; do not infer or rewrite source rows, R5 or other-year policy. Use Admin Review
  & publish to atomically create the public `public/season_2026` projection and attributed
  History before/after. Before publishing, run `node tools/validate.js <private-backup.json>`
  and independently compare its recalculated R1-R4 event points, applied threshold/basis,
  blocked reasons and unchanged NR results with the admin preview and reviewed sources.
- Validation uses synthetic-only records: focused RS and season tests, public-theme and
  admin-access browser regressions, JavaScript syntax checks, and a synthetic-backup
  `tools/validate.js` recomputation. No private source record, competitor data or provider
  response was used. This does not verify production classifications, membership,
  eligibility or History; coordinator review and separate release/publication approval
  remain required.

## 2026-11-10: local 2026 RS membership-scoring expansion (not released)

- This uncommitted continuation retains the 2026-only, evidence-backed six-starter review
  above and implements the user's finalized retrospective membership policy for all 2026
  RS scoring rounds. It supersedes the earlier local entry's statement that membership
  behavior was unchanged. Work remains isolated and preview-only: no commit, push,
  deployment, Firebase/GCP access, data export, authentication, provider write or
  publication occurred. No release or database-publication approval is implied.
- The private working schema adds `rallyesport.membershipReview` with
  `sourceDate: "2026-11-09"`, `reviewed: true`, private review evidence, and a `people`
  map keyed by stable RS profile ID. Each decision records a validated status and basis;
  user-confirmed decisions require their own private evidence. The map contains no
  licence/member numbers, workbook row numbers, aliases or workbook text. A matching
  complete profile with both membership fields establishes eligibility irrespective of
  account status; a qualifying complete duplicate suffices. Missing, incomplete or
  ambiguous decisions fail closed with distinct public reasons and never imply confirmed
  non-membership. Per-entry `identityReview` is resolved before this map is applied.
- Driver and co-driver eligibility, scoring positions, points and standings are
  independent. Excluded roles remain visible after ranked roles as RS0 with zero points
  and no rank; their eligible partner is not demoted. Existing manual exclusions,
  invitations and TEST entries remain distinct gates. Original classification rows,
  official positions, times, source order and vehicle class are preserved. The public
  projection contains only derived role status/reason and scoring outputs, never the
  private review map or evidence. An eligible DNF in an unsupported category remains
  unscored (`UNCONFIGURED`), not mislabeled RS0 or membership-ineligible.
- The 2026 six-starter count includes all evidenced actual starters, including TEST,
  invitations and RS0 entries; DNS and DNF without start evidence do not count. The
  printed SSR V1 source remains at 15, with the six recorded only as a user-reported
  review and not as a written amendment. R1-R4 are not made final by this change:
  R5 remains without a classification, and double-points, finality and other unresolved
  scoring gates remain in force. No 2027 rule is configured; NR model, source records,
  starts, calculations and rendering remain isolated.
- The coordinator-owned candidate update, after separate authorization, is to record the
  reviewed 2026 `membershipReview` and its private provenance in working
  `docs/season_2026`, apply only the already-decided per-entry identity reviews after
  private reconciliation, and retain the separate `starterMinimumReview`. The coordinator
  must independently recompute all 2026 RS scoring rounds against the reviewed candidate
  and sources, compare source rows/classes/times and every driver/co-driver event and
  championship total, verify NR output is unchanged, and review all blocked reasons.
  Reconcile stale curated scoring commentary from prior threshold decisions while
  preserving official source notes and classification data; the data-entry guide now
  records this check.
  Only after that verification should the authorized Admin Review & publish workflow
  create the public `public/season_2026` projection and attributed History before/after.
  Public output may contain derived eligibility/reasons and scoring only; no membership
  identifiers or private evidence.
- Compatibility sequencing is material: the `competition-3` code must be deployed
  before the new candidate is published, and old admin tabs must be retired. Until the
  candidate includes the reviewed membership map, the new engine intentionally fails
  closed for 2026 RS scoring rather than reusing the historical implicit-eligibility
  behavior. Publishing the candidate to an older runtime would not provide the new
  role-specific policy. After publication, rollback to code that predates this map is
  not data-compatible; any rollback must coordinate a compatible reviewed data snapshot.
  No Firestore path migration is introduced; the public scoring projection is extended
  with derived per-role eligibility fields and must be generated by the compatible code.
- Validation performed here: all 99 synthetic Node unit tests passed, including the 51
  focused tests across `rallyesport.test.js` and `season-readiness.test.js`; JavaScript
  syntax checks for all changed JavaScript files and `git diff --check` passed. The
  `admin-access-e2e.js` and `site-theme-e2e.js` browser suites then passed using the
  already-installed Playwright module and Edge with process-only environment variables;
  all provider requests were mocked/intercepted. Browser fixes updated stale assertions
  for projected per-role fields, the eligible NR-linked co-driver versus an RS0
  missing-licence driver, accessible tooltip reasons, UI-backed profile-merge checks,
  and the current inclusive starter-count label. A synthetic regression verifies that a
  reviewed count excluding an evidenced TEST starter conflicts with the now-inclusive
  starter total; the count including it is accepted. No private workbook/source records,
  actual competitor fixture or provider response was used. Synthetic tests do not verify
  real 2026 event eligibility, source truth, production History, finality or publication.
- The working tree is uncommitted. The current review base remains
  `75c906a3cd3085fd457dd9f2a16e1bf9ad68835b`, matching the requested baseline checked
  before implementation. This record and code do not authorize a push, release, data
  update or deployment; those need separate coordinator/user approval.

### Local championship-status wording follow-up (preview only)

Crews now separates the person's name from a labelled Championship status column.
Excluded roles visibly distinguish eligibility unverified, missing licence evidence,
confirmed non-membership and other exclusion reasons instead of displaying bare RS0.
Standings, derived event scoring and profile columns say Championship scoring; official
classification points/status columns and graph labels explicitly identify championship
scoring. A nearby note explains: "Classified describes the official event finish. RS0
describes championship scoring only." The SSR 6.1 footnote remains.
An official RS4 classified finish can therefore coexist with unverified championship
eligibility without implying non-membership or rewriting the result. This is presentation
only: scoring, role-specific eligibility, source classes/order/positions/times, NR and
provider behavior are unchanged. Cache version remains `competition-3` within this
unreleased work. No data migration or release/publication approval is introduced.
Validation: all 51 focused RS/season Node tests passed, including explicit separate
source-result/championship-status assertions. The public theme browser suite passed
with synthetic fixtures at desktop/mobile widths in both themes, including a classified
RS4 P6 source row whose driver has unverified RS0 championship eligibility and whose
partner remains independently eligible. JavaScript syntax and `git diff --check` passed.
No actual competitor data, workbook or provider access was used.

### Local binary public scoring-label correction (preview only)

The subsequent user-directed correction supersedes the reason-specific public labels
above. Every excluded role is now labelled "RS0 · Non-Scoring", while eligible roles
retain their actual RS2/RS4 championship class. Crews, profiles, standings, scoring tables,
leader markers and graph legends/tooltips use this consistent public wording. Results
show the championship status directly beneath each individual driver's/co-driver's name,
so mixed-eligibility crews are explicit. Official finish status/class/positions/times stay
separate and unchanged. The SSR 6.1 explanation states that RS0 is not a declaration of
non-membership. Private eligibility reasons and fail-closed scoring are unchanged; no
identity or membership decision is inferred from this wording change. No provider access,
database edit, release, deployment or publication is authorized or performed.
Validation: 51/51 focused RS/season Node tests passed; the synthetic public theme browser
suite passed across responsive light/dark views, with explicit mixed-eligibility
per-person status and unchanged source-field/points assertions. JavaScript syntax and
`git diff --check` passed. This does not validate any actual eligibility decision.

### Local actual-class standings labels (preview only)

Overall eligible standings rows do not carry a singular scoringClass field. Public
standings now derive the person's actual class membership from the corresponding
driver/co-driver class standings rather than rendering the ambiguous "RS2 / RS4"
fallback. A genuinely multi-class scorer shows "RS2 + RS4" overall; class tables show
only the selected class. Missing derived class data is explicitly unavailable rather
than guessed. This uses the existing published projection without a schema migration.
RS0 Non-Scoring rows stay separate; points and official classifications are unchanged.
Results also labels the preserved source status column "Official finish", with the
profile column labelled "Official position / finish". No provider/data/release operation
is involved. Cache version remains `competition-3` within this uncommitted preview.
Validation: 51 focused Node tests passed, including projected rows without scoringClass,
both roles' actual single/multiple class membership, class-filtered tables and Official
finish headers. The synthetic public theme browser suite passed with a real projected-row
shape asserting RS2 instead of the former generic fallback. Syntax and diff checks passed.
## 2026-11-10: authorized unified NR/RS display and loading release

- Based on November 9 RallyeSport main
  `3734d91408d9d3c5504d9e66329f47de0c06f3ee`. Following private preview and the
  graph-discovery correction, the user explicitly said **"I think it looks great - push
  and lets test."** This authorizes committing the reviewed code/documentation,
  a normal non-force push to `origin/main`, Pages deployment and no-write live-site
  checks. Firebase/GCP access, data publication, rules/settings, admin workflows,
  provider changes and the earlier RS database rollout remain excluded.
  Origin is the expected GitHub repository; fresh fetched main and Pages baseline both
  match the reviewed parent. Recheck main immediately before pushing and stop on
  divergence. Release authentication and commit identity are scoped per process/command;
  the user explicitly selected the verified push account's ID-based GitHub noreply identity.
  No global authentication/configuration is changed. Actual deployment is recorded
  separately after verifying the built SHA; this entry alone is not deployment evidence.
- Replaces three homepage switches with one header NR/RS preference, defaulting to NR.
  URL/local storage preserve competition through navigation, refresh, history and season
  changes; legacy result/home links remain supported. Home, standings, calendars,
  crews, profiles and sources are competition-specific. Detailed-result switching uses
  only a unique explicit existing association, otherwise rounds. Empty RS seasons
  never borrow NR data. Resolved RS identities link to RS-only cross-season history;
  unresolved printed names remain visible without fabricated profiles.
- RS uses a blue primary accent and decorative hero track in light/dark, NR remains red.
  Category/series, warning/success colors and logos are unchanged. Public mobile header
  rows accommodate the added control without overlapping the brand; admin layout is
  excluded. Every deliberate NR-to-RS switch shows the accessible welcome with Info,
  Continue, Escape, focus containment/restoration; normal RS navigation/reload does not.
  Getting Started and Info copy and the guide's explicit 2026 reference edition remain.
- RS reuses the full NR graph UI: six metrics, car/class filters, quick selections,
  tooltips, legend interaction, head-to-head bars/table and stage table. Only its own
  stage axes/source field are plotted, including standalone events; old `rs=1` links no
  longer mix series. Existing pure RS parsing is exported and cumulative display values
  are exposed additively; no scorer, scoring policy or official classification changed.
  RS hundredths are retained; missing times/ranks remain missing, cumulative gaps stop
  after missing timing, and official classified Final values are never inferred.
- Initial HTML now contains an accessible loading status before scripts, with loading
  feedback during later asynchronous season/profile reads and explicit error replacement.
  Simple text is intentional; no sprite artwork, dependencies or animation were added.
  Privacy copy discloses the saved competition preference. No analytics runtime behavior
  changed; synthetic pending-tag races use deterministic test gates instead of delays.
- User preview correction: RS graphs existed but home/calendar and legacy result links
  still opened the old classification table, unlike NR. Direct graph-URL tests missed
  that real navigation mismatch. RS cards now say Graph and open it first, as do
  championship event links and bare legacy result URLs. Explicit `/classification` and
  `/stages` views share three tabs, previous/next and round navigation, and retain
  car/metric choices across tabs. Stage times reuse the shared renderer with RS precision.
  Missing timing and printed ranks are explicitly disclosed. No source/scoring change.
  Journey regressions click home/calendar cards for standalone and linked RS events
  at desktop/mobile, plus legacy/listing/profile links, three-tab navigation and
  head-to-head; all pass alongside 93 synthetic units. The visible loopback preview
  was reproduced/refreshed, and its session-only richer fixture's synthetic classified
  totals corrected to match its synthetic times; preview fixture simplicity/inconsistency
  was separate from the table-first production routing bug.
- Compatibility/recovery: `competition-1` cache query versions are coordinated across
  index/admin/disclaimer/privacy. Public pages load `display-context.js` before the app;
  admin does not. No data migration, engine contract version, schema, Auth, administration,
  notice, analytics, database rules or provider configuration change. This deployment
  includes all matching assets/shells; retire old admin tabs before new
  data; existing tabs do not upgrade automatically. Restoring the reviewed base's
  complete code restores the previous presentation without a database rollback.
- Validation: all 93 synthetic Node unit tests and public theme, analytics, rally-notice,
  admin-access and AI Import browser regressions pass. Tests use intercepted fixtures,
  fake collection/authentication where needed and no live writes. Separate loopback
  preview checks cover desktop/mobile NR/RS light/dark, welcome/head-to-head, legal-page
  continuity, primary contrast at least 4.5:1, no overflow/external requests/page errors.
  These checks do not certify every WCAG criterion, deployed services, official source
  truth, private backups, rules or current regulations.
- The pre-release browser rerun exposed an assertion-before-hash-render race after
  clicking Stage times. The test now waits for the destination `/stages` URL and
  intended visible RS text, then asserts actual fastest-time highlighting. No arbitrary
  sleep, removed assertion or production workaround was used. Repeated public browser
  runs and the full release suites pass. A pre-release deployed NR snapshot (standings,
  classification, stage table and graph observations) uses intercepted synthetic data
  for exact post-release comparison; no Firebase/Auth/Google collection is contacted.
- The first release authentication attempt stopped before any push: a temporary custom
  credential helper malformed its protocol fields and Git exposed a credential in its
  error output. The user confirmed revoking the old GitHub CLI OAuth authorization,
  completing a fresh browser sign-in, and resuming this release. The replacement is
  used only through the standard `gh auth git-credential` helper, scoped per process;
  no replacement token is extracted or custom password protocol constructed. Fresh
  account permissions, unchanged remote parent and built Pages baseline were verified.
  This recovery follow-up changes documentation only; runtime behavior is unchanged.
- Remaining source boundaries: unavailable timing/printed ranks and unresolved identities
  remain unavailable; source appearances do not establish starts. Blocked/provisional RS
  scoring gates remain in force. With denied storage, app URLs preserve competition;
  persistence across plain static-document links still depends on browser storage.
  Any subsequent unrelated release needs fresh explicit approval, main comparison and deployment checks.

### Actual deployment verification

- The authorized non-force push advanced the reviewed November 9 parent to
  `6c2c736a37483bd7b33ff637ddd2d50bb9f69261`, containing implementation
  `d98304104d88d8ebafa1f06fbad401733cf038e8` and the documentation-only credential
  recovery follow-up. Remote main and the successful Pages build matched that exact SHA.
  Canonical HTTPS returned 200; HTTP redirected to `https://nrrally.co.za/`.
  Pages remains legacy `main` at `/`, with the expected CNAME and HTTPS enforcement.
- Deployed index/admin/privacy/disclaimer HTML and display-context/site/engine/styles
  assets match their committed Git blobs byte for byte. Compare Git blobs rather than
  Windows checkout bytes, which may have CRLF conversions.
- Browser smoke against the actual deployed static assets passed at 1440px and 390px,
  light/dark: initial delayed-script loader, repeated welcome, persistent context,
  standalone/linked graph-first RS journeys, six metrics, car selection/head-to-head,
  all three tabs with visible fastest-time highlighting, legacy graph links, static legal
  pages and signed-out admin. NR standings, classification, stage table and graph
  observations exactly match the pre-release deployed baseline with identical synthetic
  inputs. Screenshots were visually reviewed. No page errors, warnings or unexpected
  external requests remained. The first smoke's incomplete local connection fixture
  omitted admin's sign-in prerequisites; correcting only that synthetic fixture and
  providing signed-out fake Auth resolved the check, with no production workaround.
- All provider requests were intercepted with synthetic data/Auth; the browser issued
  no writes or real collection. These checks verify deployed code, not actual Firebase
  data, live authentication, provider configuration, rules, source truth or missing source
  timing. No Firebase/GCP/data/rules/admin or earlier database-rollout changes occurred.
- This verification-record follow-up is documentation only, covered by the same release
  handoff. Runtime assets, scoring/data contracts, cache versions and recovery procedure
  are unchanged. Existing synthetic suites and deployed-code results apply; fresh remote
  comparison, diff/privacy checks and final Pages SHA verification are still required.

## 2026-11-08: authorized season-wide getting-started guide release

- Local work based on `b818767` integrates final SEO main `c06c390` locally, preserving
  metadata, icons, crawler files and release records. The user explicitly selected
  **"Push the guide live."** This authorizes a normal code/documentation push to
  `origin/main` and Pages deployment only; no PR, Firebase write, settings/rules change
  or provider configuration change is authorized.
- Before release, fetched main and verified `c06c39079c40c7c4d2351702a7f7a4bea8ed080d`
  is an ancestor of the reviewed local branch. The authorized release identity and
  repository push permission were verified privately. Recheck main immediately before
  pushing; no force push. Record actual deployment separately after verifying Pages.
- The database-independent guide now introduces the whole season and a general event
  journey, without named event examples, specific fees or unusual event procedures.
  It keeps spectator safety, the neutral National/Regional comparison, entry versus
  start and championship eligibility, separate NR rounds on some two-day weekends,
  official links and independence disclosures. Routes and topic anchors are unchanged.
- The National/Regional comparison names the class structures and explains fuel
  distinctions, verified against 2026 NR SSRs 3 and 11.3 and National SSRs 910,
  911 and 912. The 2026 NR SSRs state National rules prevail in a conflict; readers
  are directed to both applicable SSRs and a technical official, not a blanket eligibility claim.
- Removed the visible guide-edition/check-date notice and header badge at user request.
  Maintainer metadata remains 2026, checked 8 November 2026; dated source labels and
  current-regulations guidance remain. No newer season's rules were verified or implied.
  Review actual applicable sources annually; this local copy does not establish current
  eligibility or replace official documents.
- Coordinated query versions are `guide-1` across public, admin, disclaimer and privacy
  entry points. No data migration, scoring, import, Auth, notice or analytics contract
  change. Already-open tabs are not upgraded; retire old admin tabs before new data.
  A compatible prior code release can be restored separately; rollback does not restore data.
- Validation after integrating SEO main: 23 guide, season, SEO, analytics and notice
  synthetic unit tests, plus responsive public and admin-access browser regressions passed.
  Synthetic analytics and rally-notice browser regressions also passed before integration.
  Browser requests were intercepted/mocked; no live data, Auth, deployed rules or real
  analytics were exercised. Annual review and any subsequent authorized release remain
  separate work.

Deployment verified at `39f7aef64777ceedabbd1712e8d056a8159e8b56`: Pages built that
exact commit, 20 deployed runtime/crawl/brand files matched Git blobs byte-for-byte,
and HTTP/www redirected to canonical HTTPS. Live guide smoke covered 320/1440 widths,
light/dark, topic expansion, 2026 class/fuel and season content, independence disclosure,
absence of the edition banner and retained SEO canonical. Firebase requests were
intercepted with synthetic responses and all other external requests blocked; no real
analytics, private data, live authentication or deployed rules were tested.

This documentation-only follow-up records the verification and changes no runtime,
data, contract or provider behavior. Recheck main before its normal push; verify its
final Pages build afterward and report its SHA in the handoff.

## 2026-11-08: small authorized SEO release

Approval: the user requested conservative optimization of existing content and said
**"You can just push those changes live if they're tiny."** This release is confined
to static HTML metadata, two crawl-discovery files and the existing original favicon,
with synthetic regressions and recovery/testing documentation. Normal non-force push
to `origin/main` (Pages root) is within that small-release scope. No PR, Firebase
write/settings/rules, Analytics/Search Console/provider change, content campaign,
routing/hosting redesign or future-season creation is included or authorized.

Reviewed base: fresh remote main and latest built Pages SHA
`b8187675d983bb8c8e9dd67f8a4c468ccfb703af`. The approved signed-in release identity
and repository push permission were verified privately; credentials are process-scoped,
with no global credential/account change. Recheck main immediately before pushing.

Changes: one static canonical on each public document (root, privacy and disclaimer),
descriptive evergreen initial home title, homepage WebSite name/root URL microdata
without executable JSON-LD or CSP changes, and a stable 192x192 PNG fallback rendered
directly from the existing NR SVG monogram. The SVG remains the browser favicon on
all four shells; the formerly unused 64x64 PNG with a different motif is replaced.
Existing descriptions were already useful and are retained. Admin already had
`noindex, nofollow`; it remains crawlable so that directive can be read.
`robots.txt` advertises a sitemap containing only the three canonical public documents.
No fragment URLs, fake modification dates, event/result rich-data claims, hidden
keywords or AI-specific files are added.

Compatibility/recovery: visible page content, responsive/themes/guide, rendered route
titles, source/reference edition (2026), scoring, data/Auth/notice/analytics behavior
and all contracts are unchanged. No migration or shared runtime/CSS change; coordinated
asset query version remains `season-1`. A code-only rollback to the reviewed base restores
the old metadata/icon and removes crawl files without touching data. Recovery/testing
docs explain static canonicals, crawlable noindex and favicon reproduction.

Validation: 16 targeted synthetic units passed via
`node --test tools\tests\seo.test.js tools\tests\getting-started.test.js tools\tests\analytics.test.js tools\tests\rally-notice.test.js`.
`site-theme-e2e.js` and `admin-access-e2e.js` passed with intercepted synthetic
Firebase/Google requests, including responsive 320/390/768/1440 layouts, light/dark,
hash navigation, reference guide, error/unconfigured states, no-JS public documents
and signed-out/non-admin/admin simulation. New assertions cover static canonical and
microdata persistence, PNG declarations/dimensions, sitemap/robots and retained noindex.
The PNG was rendered and visually checked as the original NR monogram. Existing
external Node/Playwright and Edge were reused; no dependency was added.
The first robots unit assertion needed CRLF normalization for Windows; all final
selected tests passed. No live database writes or analytics were sent.

Primary guidance checked 8 November 2026:
[favicons](https://developers.google.com/search/docs/appearance/favicon-in-search),
[site names](https://developers.google.com/search/docs/appearance/site-names),
[JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[AI features](https://developers.google.com/search/docs/appearance/ai-features).
Google requires no special AI markup/files or extra AI Overview/AI Mode optimizations.

Limitations: hash-route results/profiles/guide topics are not reliably separately
crawlable landing pages. This is deliberately not presented as solved by canonicals
or a sitemap; a larger URL/hosting change needs separate approval. Google decides
indexing, rankings, site names and favicon display; recrawling can take days/weeks.
No Search Console inspection, ranking/Core Web Vitals certification, real Auth/rules,
private fixture or actual Google runtime verification was performed by this release.
After pushing, verify Pages SHA, canonical HTTPS and live bytes/UI separately and
record deployment evidence, not merely successful git transport.

Deployment verified at `0bc94e2eb8a8eab372b33142c3c0dd29b8ff8d59`: Pages reported that
exact SHA built without error. All 20 runtime/crawl/brand files matched pushed Git
blobs byte-for-byte, including root/index, all four shells, PNG, robots and sitemap;
HTTP and www redirected to canonical HTTPS. Live browser smoke at 320/1440 px in
light/dark themes retained Home/standings/round graph/guide/missing-route rendering,
root canonical/microdata, disclosure and no public noindex. PNG decoded at 192x192.
Static privacy/disclaimer content/canonicals remained available without JavaScript;
admin retained its noindex and independent disclosure. Firebase was intercepted with
synthetic responses/config; Auth SDK and analytics were blocked. No live sign-in,
private data, database mutation or analytics collection was exercised.

This documentation-only follow-up records verified deployment here and in recovery
before its own normal non-force main push. Runtime, crawl metadata/icon, data,
contracts and operational behavior remain unchanged from `0bc94e2`; no new migration
or provider change. Check fresh main before pushing and verify the final documentation
SHA against Pages/live files afterward. The final SHA is reported in the handoff rather
than embedding a self-referential commit hash in this record.

## 2026-11-08: authorized season-readiness release

The user subsequently authorized deployment: **"you can push them live."** This
supersedes the local-only scope of the historical preparation entries below for
code/documentation release only. It does not authorize Firebase data/settings/rules
writes, a new season, a PR, or a provider configuration change.

Pre-push checks: clean reviewed branch at `8a9f987`, remote main still
`6f83f22f517996ed27950f68d67383106f6fc790`, no divergent remote commits.
The approved signed-in release account's identity and repository push permission
were verified privately; credentials remain command/process-scoped.
Release uses a normal non-force push of the reviewed commits and this record to
`origin/main`, which Pages serves at repository root on `nrrally.co.za`.

Scope and compatibility: the two reviewed local commits below, coordinated
`season-1` assets, unchanged entry/AI/notice/analytics contracts and 2026 guide edition.
No data migration, database publication, DNS change or scoring change is required.
Affected architecture/schema/lifecycle/recovery/testing docs are included in the push.
Prior validation: 51 synthetic units, timezone checks and responsive public browser
regressions passed; import/notice/analytics/admin-access suites also passed during
preparation. No real-data/private runtime fixtures or live Auth/rules verification.

Deployment verified for code release
`12503221d3b0cf0575026cae6169e7e2e34520dc`: Pages reported that exact commit built,
all 19 public/admin/static assets matched their pushed Git blobs byte-for-byte,
and HTTP/www redirected to canonical HTTPS. Live UI smoke used synthetic intercepted
Firebase responses for populated 2026, calendar-only 2027, unknown-date card/detail,
guide reference edition and signed-out admin shell. Google Auth SDK requests were
deliberately blocked; actual sign-in and deployed rules were not exercised.
No Firebase writes/settings changes or analytics collection occurred.
Pre-release synthetic units were rerun: all 51 passed.

This documentation-only follow-up records that verified deployment and updates the
recovery entry point before its own normal push to main. Runtime/data/contracts are
unchanged from the verified code release; no additional permission or migration is
required. Its final commit must also be checked against Pages and live asset contents
after pushing; report the final SHA in the release handoff rather than embedding a
self-referential commit hash here.

Retire old admin tabs or hard-refresh before future edits; already-open pages do
not automatically upgrade. Private real-data fixtures, live Auth/rules and future
GA provider configuration remain outside this verification.

## 2026-11-08: local season-rollover readiness (historical preparation)

- Verified remote `main` and local starting HEAD:
  `6f83f22f517996ed27950f68d67383106f6fc790`.
  The read-only Pages API reported that same latest built commit, legacy branch
  deployment from `main` at `/`, custom domain `nrrally.co.za`, HTTPS enforced.
- Scope: truthful calendar-only Home/Sources/standings/Crews; suppress empty unknown
  event-entry summaries while retaining evidenced zero/partial/day coverage; strict
  date-only South Africa calendar statuses and accessible missing-round links;
  season-relative Info navigation; explicit bundled guide reference edition;
  manual copied-settings warning; comprehensive recovery and annual lifecycle docs.
- Guide remains reference year 2026, checked 8 November 2026. No new-year rule claims.
  Existing scoring, import policy, Auth, GA startup/privacy and active notice algorithms
  are unchanged. No live settings, data, rules, DNS or provider changes.
- Coordinated asset version: `season-1`; engine entry contract remains 2, AI envelope
  remains version 1, analytics/rally-notice engine contracts remain 1.
  Backup format remains version 1. No migration or new Firestore field required.
- Future rollback: use a compatible v4 release, not v1-v3 bundled-data releases;
  retain current entry-aware/analytics-aware editors. See [recovery.md](recovery.md).
- Validation and review results are recorded below before local handoff.
- Approval: local implementation only. **No push, PR, deployment, live export or publish
  is authorized or performed by this work.** A fictional year in tests is not a live season.

### Validation record

- `node --test tools\tests\*.test.js`: all 50 synthetic tests passed, including DNS-only empty standings.
- `season-readiness.test.js` also passed with `TZ=Pacific/Honolulu` and
  `TZ=Pacific/Kiritimati`; South African midnight, invalid dates and leap dates are covered.
- `node tools\tests\site-theme-e2e.js`: passed, including the mocked future default,
  calendar-only/entry-only/archived navigation, guide edition and 320/1440 light/dark
  additions; existing 390/768/1440/320 guide/route/print/failure coverage retained.
- `ai-import-e2e.js`, `rally-notice-e2e.js`, `analytics-e2e.js`,
  `admin-access-e2e.js`: all passed with synthetic intercepted Firebase/Google requests.
- JavaScript syntax checks, coordinated asset-version unit checks, `git diff --check`
  and local documentation file/heading-link checks passed before handoff.
- Used an external existing Node/Playwright installation and Edge; no package manifest,
  production dependency, CI pipeline, source fixture or provider snapshot was added.
- Did not export/read real sports data, run private real-2026 fixtures, replay a private
  configured GA container, test real sign-in/rules, send analytics, or change any live state.
  Engine/scoring and analytics startup code are unchanged; synthetic populated-2026
  regression is covered. Historical configured-container replay evidence remains in
  testing docs, explicitly snapshot-specific rather than newly verified.

## 2026-11-08: local review follow-up (historical preparation)

Preserves local commit `280bce6` as the preceding commit; no amendment or remote changes.
Removes stray separators for absent round days and duplicate unknown-date labels on
calendar cards/detail pages, retaining valid calendar statuses. Tightens calendar-only
Home and guide-edition text and removes repetitive Info intro subtext; selected-year
context, source/safety content and the 2026/nonverified-for-other-seasons warning remain.

Document dates are supplied strings in the AI contract even though the manual editor
offers a date input. Info now formats valid ISO source dates but preserves escaped
free-form/invalid supplied text and omits the prefix for absent dates. Strict round
schedule/date-status validation is unchanged. Added focused unit/browser regressions.
No scoring, data contract, analytics, active-notice, guide edition or live state changes.
Asset version remains `season-1` within this unpushed local release.

Follow-up validation: all 51 synthetic units passed, including source-date preservation
and single unknown-date labels; all seven readiness tests passed in Honolulu and
Kiritimati timezones. The public responsive browser suite passed, including missing-round
navigation, concise guide warning and existing populated-season/entry behavior.
JavaScript syntax and whitespace checks passed. All browser data/requests were mocked.
No push/deployment/live data change is authorized or performed.

## Historical baseline: 2026-11-08 guide/copy cleanup

The verified deployed base above adds the original Northern Regions newcomer guide and
concise site copy. Guide topics are bundled and independent of database availability.
Earlier compatible work introduced entry evidence, independent disclosures, explicit
active-rally settings, optional privacy-safe GA4 and the global startup suppression fix.
The historical source and test discussion lives in [decisions.md](decisions.md),
[testing.md](testing.md) and [runbook.md](runbook.md); do not infer current stream settings,
database revision, owners or private source availability from that history.

A separately authorized event-metadata update added official entry-list, noticeboard
and spectator-guide links for four 2026 events without scoring changes. The actual
published/working season documents and private History/source register are authoritative;
do not reproduce private revision/account identifiers as timeless repository configuration.

## 2026-11-09: local RallyeSport foundation and header logo preparation

This is an isolated local implementation only. The user expressly prohibited pushing,
opening a PR, deployment, live-data publication, Firebase/settings/rules changes and
external-provider writes. No permission to release this code is implied. The worktree
branch is `mimullan-microsoft-rallyesport-foundation`, based on `f050312`; no live
season event or result records were added.

The optional `season.rallyesport` model now supports independent RS events and official
classifications, RS2/RS4 event points and season tables, the 2026 Rallysprint SSR
profile, a season-scoped person-level “Non-Scoring RS Member” toggle, separate event
invitation exclusion, a manual admin editor using the normal staging/review/publish
path, public RS tables/routes, and optional explicitly mapped overlays on NR graphs.
RS-only events need no NR calendar entry. Shared stage times can be copied only after
explicit round/stage/car/crew review; stored times are snapshots with provenance and do
not follow later NR edits. The overlay uses only RS rows and never feeds NR statistics.
No NR results, statuses, classes, penalties, points, eligibility or totals are imported
into RS by default. Existing seasons without the optional field remain valid; there is
no migration. Contract version is 1 and coordinated asset query strings are
`rallyesport-1`.

The rules profile is based on the full official [2026 MSA RallyeSport Association
Club Standing Supplementary Regulations — Rallysprint, Version 1, issued 9 July
2026](https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf).
The printed title and SSR 1.2 set its scope; it is not inferred from the filename. The
user confirmed applicability for the privately reviewed 2026 classification set,
including a pre-issue independent event. Event identities and supporting source records
remain in the private review archive; this event-specific confirmation does not apply
the rules to other events or years.
The implementation uses the SSR 6.1.1–6.1.3 class points for overall and
class tables, excludes invitational entries, and applies the 15-starter event minimum.
By user direction, people are assumed paid up unless individually toggled non-scoring;
this is an assumption, not verified membership. SSR 7.2's five-round double-pointer
exception is supported only with one bulletin-backed event; double-points declarations
at other round counts are withheld pending clarification. A five-round double-pointer
also requires separate ISO event and bulletin dates that pass the SSR's 14-day notice
check. No future-year or other competition rule profile is added.

Review of private source material informed synthetic coverage for independent event
records, separately printed positions, TEST rows, and non-prefix DNF stage observations.
No competitor rows or real event-calendar records were copied into this repository, and
the sensitive membership workbook was not inspected. Synthetic coverage recognizes a
source's final-results wording without rewriting it, preserves TEST without treating it
as DNS/DNF, withholds unresolved scoring, uses one consistent position basis within a
class, and retains later DNF observations after missing earlier stages.

Unresolved limits remain explicit: SSR 7.4 and 7.6 are blank, so DNF points and awards
are not inferred. SSR 7.5 addresses a round despite its championship-ties heading; the
app does not recompute its stage-time tie-break. A still-tied scoring position is
withheld and equal season totals share a displayed rank without a season winner/tie-break.
Unspecified categories and round qualification are not guessed. No November or other
real event data was added.

The user-approved supplied Northern Regions logo is included in the public, admin and
static headers. The original NR `brand.svg` and `favicon.png` remain the favicons; no
official logo favicon or replacement NR artwork is used. Recovery/testing docs and
browser checks are updated, and the asset is source-controlled without modifying
`firebase-config.js`.

Validation: `node --test tools\tests\*.test.js` passed all 71 synthetic unit tests;
targeted RS, season-readiness and original-favicon tests passed; JavaScript
syntax checks passed. `site-theme-e2e.js` and `admin-access-e2e.js` passed with local
browser fixtures and intercepted requests, including RS editor simulation with zero
writes, an RS-only public table preserving TEST/class position/non-prefix times, and
responsive header checks. Browser runners do not contact real Firebase,
Google Analytics or other external providers. No private result fixtures, live sign-in,
deployed rules, real data migration or actual publication was tested. This entry records
local preparation, not release approval or deployment evidence.

### Local RS follow-up corrections (not pushed or published)

The local continuation corrects the implementation boundaries above; it does not
authorize a release. A started DNF earns no RS championship points but counts as a
starter when source evidence or a reviewed non-TEST starter count establishes it. A
no-time DNF is not assumed to have started. TEST rows remain in event results, never
score and do not get a championship class table; if fewer than 15 non-TEST starters are
established and TEST entries could change the SSR 7.3 threshold, scoring stays blocked.
This follows the user-confirmed DNF rule and preserves the unresolved TEST-starter
question. The prior paragraph's statement that any DNF blocks scoring and that TEST
starter treatment is wholly unsupported is superseded by this clarification.

Class scoring now uses one consistent position basis per class: printed class positions
only when complete, otherwise overall positions for every entry in that class. Conflicting
or still-tied order blocks points. The RS graph preserves hundredths for stage metrics and
tooltips, retains independent later-stage observations after gaps, and explicitly treats
RS and NR positions/gaps as separate comparisons; NR calculations are unchanged.

Published scoring snapshots are consumed only at the public boundary; private/admin
calculation recomputes from private eligibility inputs. Provisional in-season tables show
supported completed events and disclose excluded/blocked events, without asserting final
qualification or a champion. Reviewed NR-time reuse previews matched, conflicting,
missing and unmatched rows; it fills blank RS cells only after confirmation, preserving
conflicts and RS-only crews. File-only source evidence is supported without an invented
URL. Backup restore and undo warn about RS data loss/replacement before mutation, profile
merges retain season-scoped RS non-scoring decisions, and demo mode does not imply it can
reconstruct private eligibility.

Validation uses synthetic records and local/mock browser traffic only; it does not read
the sensitive membership workbook, publish real RS results, or contact live Firebase or
analytics. User-approved source-result previews remain under session-state `files` and
outside the repository. No code, real result records or private membership data were
pushed, deployed, published, or written to Firebase/providers.

Earlier continuation verification passed 79 synthetic Node tests and the mocked admin
and public browser suites. The current private source review remains blocked by an
unresolved repeated printed crew name; the actual engine reports that validation error,
withholds scoring for all events, and displays no standings. Source-specific spellings
that are not safely attributable to reviewed people remain unmerged. Technical-check
qualifications, starter-count uncertainty, and provisional source status remain visible
in the private preview. No private result rows are documented here.

### Local RS homepage/calendar and explicit round-number follow-up (not pushed or published)

The local continuation keeps NR as the homepage default and adds section-local keyboard
controls for the driver/co-driver leader cards, driver class leaders, and the home result
cards. RS panels use only RS-derived points and clearly label provisional totals and
blocked events. The full calendar includes RS-only events; a shared NR/RS card is created
only by an explicit `nrEventId`, never by matching names, dates, or array order. Results
cards remain competition-specific, and the home toggle does not alter NR hero statistics,
standings, graphs, or season data. An RS `roundNumber` is optional, positive, unique and
independent of NR numbering.

The private preview retains user-confirmed classification-scoped category mapping and
the supplied independent round ordering. Dates are used only where supported; undated
events remain explicitly undated. The private preview has no real NR result/calendar
data, and shared cards are not inferred without an explicit NR event association. All
actual source-result data and previews remain under session-state `files`, outside Git.
The membership workbook was not opened or used.

The coordinated cache version advances to `rallyesport-3` across public, admin,
disclaimer and privacy shells. Retire old admin tabs before editing. The logo integration
from local commit `3e806da` remains in this branch; original NR SVG/PNG favicon assets are
preserved. No schema migration is required because RS is an optional season subdocument;
the homepage projection reads the existing published RS scoring snapshot while admin
continues recalculating from private working inputs. No Firebase, History, rules,
settings, external provider, live data, deployment or publication operation occurred.
This local preparation does not approve any push.

The prior local test run passed all 81 synthetic Node tests and the mocked admin/public
browser suites. On this resumed continuation, Node.js was not available on the shell
`PATH`, so the final synthetic browser-test fixture edits could not be rerun. The
production RS engine was rerun in a local browser against the private working snapshot:
it reported the retained crew-role validation error, blocked all five event rows, and
returned neither ready nor provisional standings. The actual-app private preview and
source preview were rechecked from `file://`: no external hosts, no failed local assets,
and the validation error remained visible. No real deployment, Firebase rules, live
Auth, or public data publication was tested.

The final local review also verified the offline actual-app preview after the homepage
and calendar changes. It shows synthetic NR data with private RS records, keeps NR as
the default, exposes separate RS result cards, orders dated events by supplied date
evidence, labels undated events, and displays the unresolved identity validation error
without inventing standings. Source qualifications and mapping notes are retained. The
source and actual-app previews remain in session-state `files`; only synthetic
regressions and generic behavior are documented in Git. The coordinated cache query
version is `rallyesport-3`. No live server, external traffic, Firebase operation, push,
deployment, or publication was used. Re-run the Node test suite when Node.js is
available before treating the final browser-test edits as verified or approving any
future push.

## Local-only reviewed RS identity and finality follow-up (not released)

This follow-up supersedes the earlier local-only note immediately above about the
unresolved identical-name row and unavailable Node runtime. It completes the two
explicitly user-reviewed identity decisions and the user-confirmed scoring finality for
the supplied R1-R4 classifications. It is a local working change only: no push, PR,
Firebase read/write, History change, database publication, deployment or external
provider operation was performed.

The private RS model now records reviewed driver/co-driver profile IDs separately from
source-printed names, plus evidence-backed finality acceptance separately from the
classification's title/status/notes. The production validator requires distinct known
profiles and review evidence; scoring and reviewed same-event time-copy matching use
the reviewed identities. A matching car number without reviewed crew identities remains
unmatched. Public projection removes private review evidence and retains only the
derived `user-confirmed` finality basis for disclosure. A source that says post-event
checks remain pending is not independently treated as cleared. Homepage cards and
classification point summaries distinguish the accepted scoring basis from the printed
source qualification.

The admin now exposes manual controls for row-specific driver/co-driver identity review
and source-finality acceptance/evidence. These are draft fields subject to the existing
shared validation and **Review & publish** flow; incomplete evidence blocks normal
publication. The public homepage/calendar behavior remains NR-default. The coordinated
asset query advances to `rallyesport-5` across index, admin, disclaimer and privacy.
Fields are optional under the RS layer; absent RS data and all NR calculations remain
unchanged. No migration or rules change is included.

The private working dataset's production RS structural validator reports **0 errors**.
R2, R3 and R4 event scores are available on the explicitly user-confirmed basis. R1
remains event-points-blocked: 14 non-TEST starters are evidenced and whether the TEST
entry counts toward the 15-starter requirement is unresolved. R5 has no classification.
No double-points bulletin is supplied, so final five-round qualification and a champion
remain blocked. R3/R4 source notes still say post-event technical checks are pending;
their completion is not independently evidenced. The user-confirmed scoring decision is
not represented as an updated official source document. The membership workbook was not
inspected. All real records and previews remain in session-state files, outside Git.

Latest verification on the exact local worktree: `node --test tools\tests\*.test.js`
passed all 84 synthetic unit tests. `site-theme-e2e.js`, `admin-access-e2e.js` and
`ai-import-e2e.js` passed with mocked browser traffic and no writes. The production
validator reports 0 structural errors for the private working dataset; this does not
make the championship complete or authorize publication. The actual-app preview uses
a private read-only local copy of current public NR data with the private RS records,
not a synthetic NR dataset or live connection. Its browser smoke verified four NR home
cards, three independent section switches, five-row RS leader cards with full-table
links, a six-card combined calendar (one NR-only, three NR+RS and two RS-only), the
local source-review link, 320px layout without horizontal overflow, and zero external
requests, unexpected fetches or page errors. The dated R1 card appears before the later
NR rounds; shared events are not duplicated. Source qualification remains visible on
the result detail pages while home/calendar cards stay concise.

The private scoring report remains blocked overall: R1 event points are held because
14 non-TEST starters are evidenced and TEST starter treatment for the 15-starter rule
is unresolved; R5 has no classification; no double-points bulletin is available, so
final five-round qualification and a champion remain unavailable. R2-R4 event scores
are supported on the user's scoring-finality confirmation, separately from printed
source statuses; R3/R4 technical-check completion is not evidenced. No official
document was rewritten.

The release-safety gate is still unmet. Read-only per-document Firestore reads are not
a consistent point-in-time full-database backup; export/PITR configuration, destination
storage and required permissions have not been verified, and no production backup is
claimed. The app-format backup is incomplete for full database recovery (see
[recovery](recovery.md#precisely-what-the-app-backup-does-and-does-not-do)). The exact
deployed legacy admin code preserves unknown fields on ordinary writes, but a newly
loaded old admin can restore a pre-RS whole-season backup and erase RS. Revision
preconditions protect stale writes, not that restore path; no enforceable writer freeze
or restore guard has been established. These checks do not test live Auth/rules, an
official technical-clearance document, or an authorized release.

No push, PR, Firebase write, History mutation, deployment, publication, rules/settings
change or external-provider write occurred. All real records and previews remain in
session-state files outside Git; the membership workbook was not inspected.

### Local preview/date and recovery-readiness correction

The RS-only event view now uses an explicitly linked NR event's exact displayed date only
when the RS event has no date; it does not populate RS event dates or scoring inputs. The
calendar parser recognizes date ranges such as `10–11 July 2026` for ordering. A reviewed
same-event crew match supports displaying a canonical NR profile while printed RS source
names remain unchanged. The actual-app offline
preview banner no longer links outside the browser's mounted preview root; the source
review remains a separate local preview.

Focused synthetic RS and season-readiness unit coverage passed (**37 passed, 0 failed**).
The mocked public theme, admin-access and AI-import browser suites also passed, using the
existing portable Node/browser modules with command-scoped `NODE_PATH` and no installs.
No production Google Cloud/Firebase permission check was possible: this worktree
has no `gcloud`, `firebase` or `gsutil` executable, and no authenticated read-only cloud
capability was available. No IAM, PITR, bucket or project state was queried. Public
Firebase documentation was consulted only; it states regular managed Firestore exports
are not exact point-in-time snapshots, while a PITR export requires PITR and a valid
whole-minute timestamp. No actual export/backup was started. Recovery scope and restore
limits are documented in [recovery](recovery.md#point-in-time-firestore-export-and-restore-limits).
An enforceable writer freeze would require a separately authorized server-side control,
such as a tested temporary rules write-deny; none was applied.

### Local RS role-identity projection and private preview reconciliation

The public RS projection now carries only the reviewed role-specific person IDs as
`publicIdentity`, while removing private identity-review evidence and leaving printed
driver/co-driver source names unchanged. The public RS result model and scoring standings
therefore resolve an identical-name crew to its separately reviewed driver and co-driver.
The source-results table remains plain text; no profile links were added. NR results,
standings and statistics are unchanged. Coordinated asset query versions are `rallyesport-6`.

The local-only identity reconciliation uses the user-confirmed captured NR public
people/season documents. It maps only unique exact-name/alias matches or qualifying
same-event crew evidence; unmatched identities remain separate preview-only RS candidates,
not asserted globally new and not authorized for live insertion. The mapping, reconciled
working copy and preview data remain outside Git. The actual-app offline preview was
regenerated from the reconciled public people fixture; automated checks verified all
published RS scoring identities resolve and the full captured NR model is unchanged.

Focused synthetic RS/season tests passed (37 passed, 0 failed), including private source
to public projection, role-distinct identities/standings, omitted evidence and NR parity.
The mocked public theme browser suite passed. No provider, Firebase/Google Cloud,
production-data or credential access occurred; no commit, push, publication, deployment,
database write or rule/settings change occurred.

### Local RS source-audit, scoring and homepage-preview follow-up (not released)

This continuation is local-only and does not authorize a push, PR, publication or
deployment. The RS started-DNF zero-point path now requires a resolved eligible role in
a supported class; invitation, non-scoring, unresolved-identity and unsupported-class
cases remain unavailable. NR scoring behavior is unchanged. The three compact homepage
NR/RS switches now stay synchronized, including keyboard activation, browser history and
partial legacy RS URLs. NR remains the default; the home provisional label is brief while
detailed RS pages retain their qualifications. Coordinated asset query versions are
`rallyesport-7`. No schema/contract migration or live data change is required.

Four supplied classifications were audited against their source PDFs. The private
off-Git correction ledger records 35 transcription/review corrections and the compared
field groups; source-backed positions, statuses, classes, times, penalties and totals
were not otherwise changed. Finality-review evidence hashes are unchanged. The private
reconciliation maps 55 RS profiles to 48 captured NR identities, retains 19 unresolved
RS-only candidates with deterministic public IDs, and excludes two non-person/role
labels from global people records. No ambiguous NR target was guessed. One potential
within-RS name variation remains flagged; the source profiles remain separate pending
confirmation. Source records, identity rationale and reconciled working data remain
outside Git.

The regenerated production-projection snapshot contains 91 people (72 captured NR plus
19 RS-only candidates); all 98 scoring identity references in ready events resolve, and
the complete captured NR rounds, standings, calendar, people model and public season
projection compare unchanged. R2-R4 scoring is ready; R1 remains blocked by the
unresolved TEST-starter threshold and R5 has no complete classification, so the overall
RS championship remains blocked and no final champion is asserted. The actual-app
offline preview shows the verified started-DNF zeroes. It uses only local captured data,
has a restrictive CSP and fetch shim, and has no live database or external requests.

Validation on this worktree: 39 synthetic RS/season unit tests passed;
`tools/tests/site-theme-e2e.js` passed; the actual-app preview browser smoke passed at
320/390/768/1440 px in light and dark themes, including synchronized controls, history,
legacy deep links, classification point display, zero external requests and no page or
console errors. JavaScript syntax checks passed. These checks do not certify unresolved
membership/non-scoring-class semantics, final RS championship eligibility, live Auth or
rules. No Firebase/Google Cloud access, provider write, commit, push, PR or deployment
occurred.

### Local RS provenance and homepage/admin safety follow-up (not released)

Private identity and source-audit rationale now distinguishes source/coordinator-reviewed
matches from the identity and spelling decisions explicitly confirmed by the user.
Reconciliation and source-audit digests were refreshed.

On the homepage, all three NR/RS controls now also switch the prominent leaders card:
RS mode shows provisional RS driver/co-driver leaders, retains ties, and states when
either table has no leader rows. Repeated provisional captions below each RS row were
removed in favor of the single section note. The admin finality-evidence field is disabled
unless the separate user finality review is selected, and its input handler cannot create
that review implicitly. The coordinated current cache token is `rallyesport-8` across all
HTML shells and recovery/data-entry docs; prior release-history tokens are unchanged.

Validation on this local worktree: synthetic RS/season tests, public homepage/theme E2E,
admin access E2E including forced evidence editing after deselection, JavaScript syntax
checks, private artifact digest checks, and offline Edge preview at 320/390/768/1440 px in
both themes. The preview had no external requests or page/console errors. No Firebase/
Google Cloud access, provider write, commit, push, PR, publication or deployment occurred.

### Local homepage RS link-routing follow-up (not released)

The synchronized homepage mode now routes **Full standings** to RS tables and **Full
calendar** to the RS events/classifications view when RS is selected; NR mode retains
the NR standings and calendar routes. This is consistent in populated, no-scored-starts
and no-results homepage branches. Browser regressions cover both modes and the empty
states. The current coordinated shell token is `rallyesport-9`; recovery and data-entry
guidance were updated, and the private actual-app preview is refreshed from local
captured fixtures. No schema, scoring, provider, or operational behavior changed.

Validation: `node --test tools/tests/rallyesport.test.js
tools/tests/season-readiness.test.js` passed (39 tests); `tools/tests/site-theme-e2e.js`
passed with populated NR/RS and no-results/no-scored-starts link assertions.
JavaScript syntax and `git diff --check` passed. The refreshed actual-app offline preview
passed Edge checks at 320/390/768/1440 px in light/dark themes, with no external or
fixture-blocked traffic and no page errors. This remains local work only: no Firebase/
Google Cloud access or writes, commit, push, publication, PR or deployment occurred.
Deployment approval is not in scope, and cache invalidation does not update already-open
tabs.

### Local RS 2026/2027 scenario rehearsal (not released)

The admin's actual new-season action is exercised in demo mode from a synthetic 2026
season containing RS events/results. A new 2027 season copies only the existing NR
settings placeholders; it contains no copied NR event/result or RS event/classification/
rules/member decisions, and the 2026 archive remains selectable. The admin now says
explicitly that RS data is not copied.

Shared-engine and public-projection synthetic coverage models a first 2027 RS-only final
classification with no NR calendar/result. Validation accepts the independent official
source record and the public projection preserves its classification, while NR standings
remain empty and 2026 scoring rules are not inferred for 2027; RS championship totals are
unconfigured. The public browser regression also opens the actual synthetic 2027 homepage
and RS result route with no NR events/rounds/results, verifying the classification renders
without inferred RS points or standings. Existing 2026 two-way isolation coverage continues to verify an RS change
does not alter NR standings/rows and an NR change does not alter RS official results or
calculated points. No 2027 rule, calendar or production data was created.

Final validation: 41 RS/season unit tests passed; the public theme E2E passed, including
the 2027 standalone RS public-home/list/result paths, and the admin access E2E passed
with the synthetic category-markup case. JavaScript syntax checks and `git diff --check`
passed. Browser network access was intercepted; no admin write was issued. The coordinated
current token is `rallyesport-12`.
This remains local-only with no Firebase/Google Cloud access, backup/export, commit, push,
publication, PR or deployment. Unknown 2027 NR/RS regulations, memberships and
tie/eligibility policy still require source verification before scoring or official
season standings.

Full branch review found and the local candidate corrected three tightly related issues:
HTML-escape printed category text in the admin mapping label; allow independent reviewed
identity selection per crew role and project only the reviewed role; and replace
source-like competitor names in synthetic regression rows with fabricated identities.
The admin browser fixture now includes an HTML-markup category regression. The public RS
points summary now omits repeated user-review provenance and shortens provisional copy,
while retaining printed source qualifications and blocked-event reasons.

The user separately delegated an overnight code push and live sanity check covering NR
and RS. This entry does not claim that release or any live comparison occurred: the
worktree remains uncommitted and no live site was inspected. The coordinating session
retains Firebase/GCP ownership and will pin the exact candidate and complete its required
preflight before any authorized code push; no live data/settings write is part of this
local work.

### User-authorized RS data-first publication (site release pending)

The user authorized the coordinator to publish the reviewed RS data before the site-code
release. Before publication, a local backup covered the Firestore documents in scope only;
it was not a full Firebase backup and does not recover Auth users, storage/photos, rules,
settings or provider configuration. The RS publication and its site History before/after
record were applied atomically with the explicit attribution label
**GitHub Copilot (direct Firebase)** and user attribution. Exact post-write readback was
used for local validation.

Readback validation matched the independent model across 124 NR and 71 RS result rows,
10 NR and 6 RS standings tables, and 7 NR stage tables. Responsive checks covered eight
viewports/states; nine older-site compatibility routes were also exercised. The mock-auth
admin check was read-only. These checks do not constitute live authentication or deployed
Firestore-rules testing.

The RS championship remains gated where source/review requirements are unresolved: R1 is
blocked by its starter-threshold evidence, R5 has no complete classification, and no final
championship result is asserted from those gaps. 2027 scoring rules and eligibility remain
unconfigured; no future rules were inferred. The site-code push, Pages build and live-site
verification are still pending. This data-first publication does not itself authorize or
claim a code deployment.
