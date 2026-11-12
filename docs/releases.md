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

## RS linked venue and surface (authorized pre-push)

- The user authorized this narrow display fix and a normal live push. RS Home/calendar
  and result headers show independently missing venue and surface from uniquely and
  explicitly related NR event/round metadata, labelled as related NR information.
  RS-owned fields take precedence; ambiguous, missing or conflicting day-specific
  evidence remains unavailable. No name/date matching or data mutation is used.
- Synthetic `node --test tools\tests\public-display.test.js tools\tests\rallyesport.test.js`
  passed 90 tests, covering precedence, links, conflicts, provenance and unchanged scoring.
  `node tools\tests\site-theme-e2e.js` passed with intercepted synthetic providers at
  320/390/768/1440 px in both themes. These checks do not certify live data or provider
  configuration.
- Keep the four shells on `rs-visual-7` with their matching display modules. Static
  rollback is to `cd278b5eb0e4a223d83a2964e829c15b25da611d` (`rs-visual-6`); existing
  tabs may require reload. No data migration or database restore is needed.
- This release changes no sporting calculations, source links, vehicle data, schema,
  projection, provider configuration, guide edition or analytics behavior. It makes
  no Firebase/data writes; the separately identified R1 source URL is unchanged.
  Target is `origin/main`, after fresh exact-parent, scoped-account and diff checks.
  Pages and live-byte verification remain pending until deployment.

## 2026-11-12: RS reviewed source class positions (pre-push)

- The user approved the compatible validation, display and reviewed R1-R3 publication
  and authorized a normal push to live. This release contains only static code, tests
  and documentation. No private Firebase/provider access, provider configuration,
  source correction or database write is authorized for this session. Reviewed data
  activation is a separate, user-approved coordinator operation after this code is
  deployed, with fresh backup, attribution, History and revision preconditions.
- RS classification and both role profiles display calculated source-class positions
  only for a complete, explicitly reviewed, exact matching snapshot. A conditional
  accessible footnote distinguishes them from printed positions and championship
  scoring; mapped source classes are identified. Ties, unreviewed/changed sources,
  unsupported categories or contradictory positions are not calculated. Existing
  printed positions, NR scoring, RS scores, source finality and technical-check notices
  remain unchanged. No vehicle/model enrichment or R1 broken-source URL change is made.
- The working `classOrderReview` version 1 stores a SHA-256 source/row snapshot digest
  and private review evidence; projection publishes only the version, flag and digest.
  Stale or malformed reviews block admin publication. The digest is an integrity guard,
  not proof of reviewer identity or source completeness. [Recovery](recovery.md)
  documents the public source comparison, the R1 stored/working URL distinction and
  mandatory independent activation review. No existing records are auto-migrated.
- Targeted synthetic Node suites for RallyeSport, admin logic, display, season readiness,
  entries and AI import passed 147 tests. Public browser theme, admin-access and RS
  entry-policy browser suites passed at 320/390/768/1440 px in both themes with
  intercepted synthetic providers. Runtime syntax and `git diff --check` passed.
  These checks do not certify live permissions or any future data publication.
- Keep all four shells on `rs-visual-6`, with matching engine, admin and display files;
  retire old admin tabs before activating markers. Before any activation, static
  rollback is to `6e0916b4b4c1e7e114ec7f63932bac4791506f87`. Once markers exist,
  old admin validators may reject them; restore compatible code or use a separately
  approved, backed-up audited data migration rather than assuming static rollback
  removes them. No database restoration is part of this release. The guide edition,
  analytics behavior and provider configuration are unchanged.
- Planned destination is `origin/main`, normally and non-force after fresh exact-parent,
  scope, account and staged-diff checks. Pages build and live static-byte verification
  are pending until the push; this record is not proof of deployment.

### Deployment, activation and documentation-only follow-up

- The compatible code was normally pushed and the Pages build and workflow completed
  for that exact code revision. The four live shells and changed runtime assets matched
  their Git blobs; the coordinated cache token remains `rs-visual-6`.
- The coordinator reports that the user-confirmed closed admin tabs, fresh protected
  full baseline and immediate precommit backups preceded the separately authorized
  activation. Complete source classifications were reviewed against fresh working and
  public rows, with source-file hashes checked. A synthetic transaction rehearsal
  covered conflicts, isolation and readback. The single atomic operation updated the
  working/public documents, revision and attributed History; inventory and public
  readback matched. Private review evidence was not published.
- Coordinator verification reports unchanged scoring, NR data, source rows and
  finality; no vehicle enrichment or source-link correction. Read-only public browser
  checks covered a profile and the three classifications at narrow and wide widths.
  The existing R1 broken source link remains a separately reviewed correction. A future
  source or row edit invalidates its review, and old admin tabs must remain retired.
- This authorized follow-up pushes only these documentation records, normally to
  `origin/main` after exact-parent, account, clean-scope and staged-diff guards. It
  changes no runtime behavior, cache token, scoring, schema, provider or data; no
  additional activation or restore is authorized. The guide reference edition and
  analytics behavior remain unchanged. Documentation-only changes have no test suite;
  review the diff and verify Pages after the push. Deployment of this follow-up is
  pending until independently confirmed.
- For recovery after activation, preserve the compatible code and protected backups.
  Static rollback alone neither removes the review fields nor restores data; older
  validators may reject them. Any data rollback or marker removal needs separate
  authorization, fresh backup, attribution and atomic working/public/revision/History
  coordination. Git alone cannot recover the private evidence or backups.

## 2026-11-12: authorized six-phase display consolidation release (pre-push)

- The user explicitly authorized **"push to live and ill test"** for the completed
  six-phase NR/RS display consolidation. Scope is the reviewed code and documentation
  in this worktree pushed normally to `origin/main`, followed by Pages/live static
  verification. This is not authorization for Firebase/GCP/data/admin changes.
- Fresh preflight fetch found `origin/main` exactly at
  `5d45f8bfecc8cd828a04070dc19e062089073819`, the worktree HEAD and exact parent;
  no main drift or local commits. Repository default branch is `main`. Worktree
  changes are the consolidated static runtime, focused synthetic tests and related
  docs listed in the reviewed diff; no user/unrelated paths. Commit must include the
  required Copilot App coauthor trailer. Only a normal non-force push is permitted.
- The final targeted command passes **114/114**:
  `node --test tools\tests\public-display.test.js tools\tests\season-readiness.test.js tools\tests\rallyesport.test.js tools\tests\entry-participation.test.js tools\tests\getting-started.test.js tools\tests\analytics.test.js`.
  Full public responsive/theme, navigation, revised entry-policy public/admin and
  AI-import browser suites pass. Eighty local synthetic captures were checked;
  representative new views inspected. `node --check` passes for both display
  modules and `site.js`; `git diff --check` is clean. No test provider writes.
- Code and operational behavior: shared NR/RS display adapters/components across
  six approved phases. Preserves independent data/scoring and colours, source
  ownership, guide edition/CTA, role/start/launch/finality semantics and privacy.
  The historical `/rallyesport` aggregate compatibility route remains. No scoring,
  engine, projector, public data/schema or provider change; no data migration or
  database restore. Cache tokens are coordinated at `rs-visual-3` in `index.html`,
  `admin/index.html`, `disclaimer.html` and `privacy.html`. Rollback is the prior
  static revision; active tabs may need reload. Live/private data correctness,
  sign-in and deployed Firebase rules are not certified by these synthetic tests.
- Pages workflow/result and served canonical asset checks are **pending** until the
  authorized push. Do not treat this pre-push record as proof of deployment. Record
  the exact resulting commit, Pages build, and live byte verification separately.

### Deployment verification and documentation-only follow-up

- The normal non-force push succeeded to `origin/main` at
  `87290a7384c4b65c1d7442111887558a7dc470b3` using the user-approved existing
  `michaelmullanyza-1` keyring account through an isolated temporary `GH_CONFIG_DIR`
  and the standard `gh auth git-credential` helper. `origin/main` now points at this
  exact SHA. The temporary auth selection is session-scoped and removed after
  verification; no token was displayed or extracted, and no global auth/config was
  changed.
- The GitHub Pages builds API reports this exact commit with status `built`, created
  `2026-11-12T04:38:17Z`, and no build error. The Pages Actions run `43156108073`
  completed successfully, but its `head_sha` and the associated GitHub Pages
  deployment object still report the prior base
  `5d45f8bfecc8cd828a04070dc19e062089073819`. Treat that workflow/deployment SHA
  metadata as inconsistent, not as evidence for the new commit. Independent canonical
  delivery verification below confirms the deployed output is the release.
- All eight changed canonical HTML/runtime files were downloaded from
  `https://nrrally.co.za/` and hashed against their Git blobs at the release SHA:
  `index.html`, `admin/index.html`, `disclaimer.html`, `privacy.html`,
  `assets/site.js`, `assets/styles.css`, `assets/public-model.js` and
  `assets/public-components.js`. Every blob matched byte-for-byte. The root/admin/
  privacy/disclaimer routes and versioned new assets return HTTPS 200; `www` and
  the default Pages hostname redirect to canonical HTTPS. The live root shell
  references the coordinated `rs-visual-3` assets.
- This deployed-byte verification record is a documentation-only follow-up: **no
  runtime behavior, source data, scoring, schema, cache token, provider configuration,
  permissions or guide edition changes.** It does not certify live competitor/source
  truth, admin sign-in or Firebase rules. The requested live test remains with the
  user; no browser traffic, Firebase/GCP access or data writes were performed.

## 2026-11-12: compact public display follow-up (deployed)

- The user explicitly requested a quieter eligibility marker, a single Crew
  **Standings** and **Starts** column, removal of the displayed entry-count column,
  and merging equal driver/co-driver points on result classifications. The user
  authorized a normal push to live, with no local review requirement. Scope is this
  code/documentation release to `origin/main`; no Firebase/data/provider writes.
- Fresh `git fetch origin main` found `origin/main` exactly at
  `76d0c52ba4ada467b42129ecf4daa72713ec9733`, matching this worktree's HEAD and the
  prior verified deployment record. No unrelated changes or local commits were
  present. The changed scope is the pure public display model/components/styles,
  four cache-token shells, focused synthetic tests and directly related testing,
  recovery and display-consolidation documentation. Commit must include the required
  Copilot App coauthor trailer; only a normal non-force push is authorized.
- Eligibility stars appear next to names only when the row has an actually
  ineligible NR role or explicit RS0/non-scoring role. A single accessible footnote
  follows the table only when needed; NR explains minimum starts and RS retains the
  SSR 6.1/non-membership caveat. Unknown/unavailable evidence is not converted into
  an eligibility claim. Crew starts count distinct established championship rounds
  once across roles/cars; DNS does not count, RS DNF needs source evidence, and
  unknown-only start coverage displays unavailable. Entries stay in the data model
  but not in the Crew table. Equal role points collapse only when both values are
  numeric and no role has special qualification; unequal, missing and non-scoring
  values remain role-specific, including real zeroes. No engine/scoring/data/schema,
  privacy, branding/theme or route change.
- All four shells coordinate `rs-visual-4`. Rollback is static to
  `76d0c52ba4ada467b42129ecf4daa72713ec9733` (`rs-visual-3`); no data migration or
  database restore is needed. Old tabs may need reload. Validation: the targeted
  synthetic Node command passes **119/119**; the public responsive/theme suite passes
  at 320/390/768/1440px in light/dark; navigation, revised RS entry-policy,
  AI-import and admin-access browser suites pass with synthetic intercepted data.
  No live data, Firebase, analytics or provider traffic was used.
- For the authorized push, select only the already user-approved
  `michaelmullanyza-1` account via a temporary scoped credential context; never expose
  token material or change global auth/config. The normal push completed as
  `c6935762b109434aee57ae5d7ecf3c269509833e`, with exact parent
  `76d0c52ba4ada467b42129ecf4daa72713ec9733`; the worktree is clean and
  `origin/main` matches the release. Pages Actions run `43162450583` succeeded for
  that SHA and the Pages build API reported `built`. Live `index.html`,
  `admin/index.html`, `disclaimer.html`, `privacy.html`, `assets/public-model.js`,
  `assets/public-components.js` and `assets/styles.css` matched their Git blobs
  byte-for-byte. No Firebase/data writes.

## 2026-11-12: Home eligibility display follow-up (pre-push)

- The user requests the same tidy eligibility presentation on Home as on Crews and
  explicitly confirms **"push to live when done."** Scope is Home presentation,
  focused tests and directly related documentation; publish normally to `main` only.
  The preceding compact-display commit `c6935762b109434aee57ae5d7ecf3c269509833e`
  (`rs-visual-4`) is the expected parent. No Firebase/data/provider writes, scoring,
  source data, schema, rules or global authentication changes are included.
- Shared NR/RS Home leader, co-driver, class and featured-leader cards no longer repeat
  “Eligible” or “Minimum starts not met” labels. A subtle asterisk sits next to a
  name only when the adapter has explicit ineligibility; one concise footnote appears
  below all leader cards only when such a displayed row exists. NR preserves its
  exact minimum-start meaning. Missing RS eligibility stays unmarked and is not
  called eligible; provisional scoring disclosure, source eligibility reasons,
  ranks, points, classes, starts, ties and distinct themes are unchanged. Cache tokens
  are coordinated at `rs-visual-5` in the four HTML shells; rollback is static to
  parent `c6935762b109434aee57ae5d7ecf3c269509833e` / `rs-visual-4`, with no data
  rollback or migration. Existing tabs may need reload.
- Focused synthetic tests cover explicit NR under-minimum and eligible states, conditional
  single note, links/description semantics, role and tied leader cards, unknown RS
  eligibility, and absence of repetitive labels. Featured leaders include all first-place
  ties in footnote discovery, even when the tie exceeds the normal five-row list cap.
  The targeted Node suite passes
  **122/122**; the public responsive/theme browser suite passes at
  320/390/768/1440px in light/dark, with Home accessibility/layout assertions; the
  revised RS entry-policy public/admin suite also passes. Testing uses synthetic
  intercepted data; no live result/data read is part of testing.
- Separate read-only investigation of the reported RS profile class positions found
  `—` for R1-R3 in both profile history and the corresponding public classification
  tables. `public-model.js` copies `entry.classPos` into profile history; the result
  adapter/component also use the published entry class position. Thus the shared
  renderer is not dropping an available value: the public result records do not
  supply it for those entries. This change intentionally does not infer a class
  position from championship points/rank or edit/publish data. Correcting source
  positions requires verified official-source evidence and a separately authorized,
  guarded data publication. No competitor names or private data are committed here.
- Before pushing, fetch and confirm `origin/main` still exactly equals the parent,
  inspect full diff/status, commit with the required Copilot App coauthor trailer and
  use only the already approved `michaelmullanyza-1` credential in a temporary scope.
  The fresh fetch confirmed both `HEAD` and `origin/main` exactly equal the expected
  parent `c6935762b109434aee57ae5d7ecf3c269509833e`, with no local commits ahead.
  The reviewed change set is 13 expected files (Home model/component/style, four
  coordinated shells, focused unit/browser tests and related display/testing/
  recovery/release docs), with no unrelated/untracked files. The approved-account
  gate initially stopped the release: an account lookup mistakenly used the misspelled
  `michaelmullanya-1` and the inherited Git credential resolved to a different identity.
  No push or global authentication change was made during that attempt. On resumption
  the correctly spelled `michaelmullanyza-1` is available via the existing GitHub CLI
  keyring when inherited token overrides are removed from the temporary process; the
  GitHub API confirmed that identity. Repeat exact-parent and scope checks; use only
  this temporary credential context and a normal non-force push. Pages SHA/build and
  live changed-byte verification remain pending.

### Home eligibility deployment verification

The approved account `michaelmullanyza-1` pushed commit
`a5e30374cf2958d4d3e69eb0ef22b304705ce148` normally to `main` from the exact
expected parent. Pages run `43184792632` succeeded for that commit and the Pages
build API reported `built` for it. All four live shells and the changed model,
component and stylesheet matched the commit's Git blobs byte-for-byte; the shells
carry `rs-visual-5`. No Firebase or data writes were made.

The separately authorized follow-up push records that verified deployment in this
ledger and recovery guide only; site behavior, runtime assets, data and recovery
procedure do not change. Approval is limited to these two documentation files and a
normal push from parent `a5e30374cf2958d4d3e69eb0ef22b304705ce148`. Rollback is
the preceding commit if needed, with no database operation. Verification: inspect the
two-file diff and whitespace, confirm exact parent and clean staged scope, and verify
the Pages workflow for the resulting commit. This documentation record is not itself
proof that the documentation-only push deployed.

## Local only: approved display consolidation phase 6

- The implementation completed as an unreleased phases 1-6 batch at unchanged local baseline
  `5d45f8bfecc8cd828a04070dc19e062089073819`. Approval covers phase 6 implementation
  and final public audit only. No commit, push, deployment, provider access or data
  publication is authorized by this phase.
- Added pure directory, explicit cross-season profile, Sources and Info adapters
  and one component family for both contexts. Replaced the remaining normal page
  renderers with thin aliases; removed obsolete render helpers. Crews now shares
  nine fields, search and mobile cards; profiles share eight KPI slots, role charts
  and twelve-field history. Missing fields remain honestly unavailable, not absent.
  Fixed responsive grid rows overriding search's hidden state.
- Preserves unique/multiple classes, canonical/unresolved identities, printed versus
  credited roles, MSA-only/no-graph starts, role/car appearances versus unique role-
  round starts, two NR rounds at one event, launch visibility/exclusion, DNS/DNF,
  blocked/missing/zero awards and source precision/finality. No scoring calculation
  changed. Source pages preserve MSA confirmation/edition and pending site-calculated
  qualifications, own rules/notes and private-commentary exclusion.
- Info retains published RS source metadata during the existing load through a
  title/URL/date/version whitelist; no additional read or schema. NR documents are
  not relabelled as RS regulations. Shared site editorial copy, channels/contacts
  and references are explicitly NR context. Guide reference edition and CTA remain
  unchanged. Related NR links, including SRS, remain dynamic and source-owned.
- 114/114 targeted synthetic tests pass, including seven new phase 6 contracts.
  Full public responsive/theme, navigation, revised entry-policy public/admin and
  AI-import browser suites pass. Four widths, both themes, exact equivalent
  directory/history structure, real fields/styles, search/focus/identity/history,
  source/doc ownership and legacy missing-data regressions are covered. Eighty
  synthetic captures were checked outside Git; representative new screens inspected.
  Complete static/test/doc diff and untracked scope reviewed; no live certification.
- Whole-site audit found no remaining normal NR/RS parallel page renderer.
  Historical `/rallyesport` without an ID intentionally keeps its aggregate
  compatibility frame and explanatory facts around six shared standings tables
  and shared calendar. Optional retirement is deferred, not silently redirected.
  Admin operational surfaces and a future third league's verified sporting adapter
  remain outside this public-display implementation.
- Updated plan/index, architecture, lifecycle, testing and recovery. No engine,
  projector, public data/schema, provider, analytics, guide or theme-token changes.
  No Firebase/live read/write, commit, push or deployment. The matching
  `rs-visual-3` modules/styles/four shells remain one unreleased static batch;
  rollback restores those together, without a data migration/database restore.
  Retire old tabs before a future approved release/data publish. All six phases
  were implemented locally before the subsequent 2026-11-12 release authorization;
  no implementation blockers remained.

## Local only: approved display consolidation phase 5 (prior checkpoint)

- Continues the unreleased phases 1-4 batch at unchanged baseline
  `5d45f8bfecc8cd828a04070dc19e062089073819`. Approval covers phase 5 implementation
  only, not phase 6, commit, push, deployment, provider access or data publication.
- Added explicit read-only result/graph contracts and one shared result shell,
  twelve-field classification/card layout, award/source disclosures, graph
  controls/legend/line policy and full/selected stage tables. Existing result,
  historical/yearless and legacy routes remain supported. Tabs now retain car and
  metric choices consistently in NR as in RS. Legacy RS overview event listings
  reuse the shared calendar; its six cumulative tables remain shared.
- Preserves NR engine-owned credited identities/classes/overall awards and RS source
  order, independent class-role awards, published final totals/penalty strings,
  hundredths and event mappings. Source finality/technical holds remain separate
  from points availability. Missing timing/totals/ranks are not invented; missing
  previous totals cannot create a Diff prev or winner claim. Launch has results/
  timing but no championship awards. Related NR sources/dates remain labelled and
  dynamic; no hardcoded TRAC link.
- 107 targeted synthetic tests pass. Full public browser suite passes in both
  contexts at 320/390/768/1440px, light/dark, with exact common DOM/layout, keyboard,
  filter, legend, tooltip, tab/query, source, launch, future and sparse timing
  regressions. Navigation, entry-policy public/admin and AI-import browser suites
  pass. Local presentation captures pass without unexpected requests/page errors/
  overflow; representative result/graph/stage screenshots were inspected outside Git.
  Full static diff and changed/untracked scope were reviewed.
- Updated plan, architecture, lifecycle, testing, recovery and index. No engine,
  projector, schema/public data, provider, analytics, guide or theme-token changes.
  No Firebase/live read/write or live certification. Matching `rs-visual-3` scripts,
  styles and four shells stay one unreleased static batch; rollback needs those
  together, no data migration/database restore. Retire old tabs before a future
  release/data publish. Phase 6 has not started; no implementation blockers remain.

## Local only: approved display consolidation phase 4 (prior checkpoint)

- Continues the unreleased phases 1-3 batch at unchanged baseline
  `5d45f8bfecc8cd828a04070dc19e062089073819`. The user approved phase 4 implementation
  only, not phase 5, a commit, push, deployment, provider access or data publication.
- Added explicit read-only standings contracts/adapters reusing Home scoring/row
  facts. Both main NR/RS driver/co-driver role/class pages and all six legacy RS
  cumulative tables now share one page/table composition. Existing routes, aliases,
  source classification links and `pts=split` remain supported. Result-detail/event
  scoring tables and Crews/profile summaries remain later-phase work.
- Common centered Pos, Competitor/Class/round/Total/Rounds started fields, class-view
  Overall pos/Class pts, visible scoring qualification, accessible headers/caption,
  sticky/mobile columns, keyboard scroll and native active filters. Neutral **Points
  breakdown** replaces the misleading RS "Overall + class split" wording in both
  contexts; NR role switches now retain breakdown like RS.
- NR engine countback, eligibility, awards/class-only points, MSA credits and
  confirmations remain authoritative. RS published role/class ranks, joint places,
  class-only totals, revised/legacy eligibility, four-round provisional gate and
  launch exclusion remain intact. Missing/blocked values and unknown starts never
  become zero; an empty points table does not claim no source starts. Future
  results/links are not invented. Existing colours are unchanged.
- 97 targeted synthetic Node tests pass, including exact semantic and equivalent-
  contract structural checks and all six legacy cumulative slots. Navigation and
  revised entry-policy public/admin browser suites pass. The full public suite passes and covers
  both contexts, 320/390/768/1440px, light/dark, DOM/computed-layout equivalence,
  keyboard scrolling, role/class/display links and existing public regressions.
  NR/RS Standings screenshots at 390/1440px were visually inspected outside Git.
- Updated the phase plan, architecture, lifecycle, testing, recovery and index.
  No engine/scoring/projector, public data/schema, guide, analytics, provider or theme
  token changes. No Firebase/live data access or live verification. All shells retain
  the coherent unreleased `rs-visual-3` token; restore matching scripts/styles/shells
  together, with no data migration or database restore. Open tabs do not auto-upgrade.

## Local only: approved display consolidation phase 3 (prior checkpoint)

- Continues the unreleased phases 1-2 batch at unchanged baseline
  `5d45f8bfecc8cd828a04070dc19e062089073819`. The coordinator relayed explicit phase 3
  implementation scope only. No commit/push/deployment, provider access, data write
  or subsequent phase is authorized.
- Extended the pure public model with calendar/event/round/winner contracts and
  NR/RS adapters. One component path now renders Home and Rounds calendars, Info's
  event section and the Rounds winners table. Removed duplicate calendar/winner
  markup; kept result-detail/graph/stage, standings and other Info content out of
  this phase. Common metadata/entry availability, labels, badges and responsive
  row policy retain existing competition theme tokens.
- Explicit decisions: chronological parents, dated before undated, stable source ties,
  published NR child order; labelled related NR date context never assigns an RS
  day; separate own/related NR URL groups; dynamic SRS inheritance by exact
  `nrEventId`, no copied NR classification; no invented missing result URLs, dates,
  stage totals or winners. Combined explicit mappings and standalone events survive.
  Source-backed class winners retain mapping/order semantics; full crew names and
  common finality badges replace NR abbreviations. NR provisional/unclear winner
  claims are now withheld without changing their accessible classifications/scoring.
- All 91 targeted synthetic Node tests pass. Full public theme, navigation and RS
  entry-policy public/admin browser suites pass. Shared event-card DOM and computed
  layout match at 320/390/768/1440px in light/dark; existing date, entry-coverage,
  source/finality and other-page regressions pass. Synthetic Rounds screenshots at
  390/1440px were visually inspected; captures remain outside Git. All external
  traffic was intercepted, with no writes.
- Updated phase plan, architecture, recovery, testing and documentation index.
  Unchanged engine, scorer/public projection, analytics, guide, data/schema and
  provider configuration. No Firebase access, live verification or TRAC URL read.
  The coherent unreleased batch keeps `rs-visual-3` in all four shells; restore
  matching modules/styles/shells together for static-only rollback, with no data
  migration/restore. Old open tabs do not automatically upgrade.

## Local only: approved display consolidation phases 1-2 (prior checkpoint)

- Baseline remains `5d45f8bfecc8cd828a04070dc19e062089073819`. The user approved
  incremental implementation of identical NR/RS consumption, fields, wording and
  layout apart from data and existing branding/colours. This authorizes phases 1-2
  locally, not a commit, push, deployment, provider access or data publication.
- Added `assets/public-model.js` with explicit pure Home contracts/adapters and
  extracted existing RS appearance/start/contribution facts for reuse. Added
  `assets/public-components.js` with the one Home hero/stat/status/leader/class-card
  presentation. The NR/RS Home copies in `site.js` are removed in favor of `homeView`;
  the RS compatibility wrapper is only a delegate. The earlier local Driver leader
  improvement is incorporated into the shared card.
- Meaningful product decisions: common neutral season kicker/headline and labels;
  same four stat slots even before results (unknown driver/stage facts show `—`);
  RS championship round count excludes launch while events/stages retain it; same
  qualification/scoring disclosure and responsive grid; truthful class ranking bases;
  direct role/class standings links; observed-maximum bar scaling, known DNF zeros
  vs unavailable gaps. Exact facts/limits and the next phases are in the phase record.
  Distinct NR/RS colours and guide CTA/content remain unchanged.
- Phase 3 has not started: calendar section/link composition is shared but existing
  competition-specific event-card internals remain. Standings, result/stage pages,
  Crews/profiles and Info remain for later phases. No engine/scoring, public projection/
  schema, raw data, source URL, analytics, provider configuration or season creation.
- Passed 86 targeted Node tests (public-display, season-readiness, RallyeSport,
  entry-participation, Getting Started, analytics), `site-theme-e2e.js` with NR/RS DOM/wording/
  computed layout equality at 320/390/768/1440px in light/dark, keyboard navigation
  via `navigation-e2e.js`, and `rs-entry-policy-e2e.js`. All external traffic was
  intercepted; runtimes/fixtures remain synthetic and dependencies outside Git.
- Updated architecture, lifecycle, testing, recovery, documentation index and
  consolidation phase record. Coordinated local shell token remains `rs-visual-3`,
  including the two new public scripts before `site.js`. Restore matching scripts,
  styles and all four shells together for static-only rollback. Old tabs do not
  upgrade automatically. No release or data rollback operation was performed.

## Earlier local checkpoint: RS featured leader and consolidation assessment

- Baseline: `5d45f8bfecc8cd828a04070dc19e062089073819`. The user requested an immediate
  local RS Driver leader visual fix and an in-depth consolidation assessment/plan.
  Shared style explicitly means layout/wording, not unifying NR and RS colours.
  No commit, push, deployment, larger refactor or provider/data access is authorized.
- `assets/site.js` now composes the RS featured card with NR's existing `.champ`
  hierarchy: Driver leader/provisional eyebrow, prominent linked names, class-only
  points, role-specific evidence-based starts, sole-leader margin, existing round
  bars and co-driver line underneath. Ties are not arbitrarily broken and do not
  select a driver chart. Standings-only identities show unavailable starts.
  NR rendering/scoring, RS policy/scores, themes and branding are unchanged.
- Added/updated focused synthetic rendering/browser assertions. Passed
  `node --test tools\tests\season-readiness.test.js tools\tests\rallyesport.test.js`
  (60 tests: 19 rendering/readiness, 41 RS),
  `node tools\tests\site-theme-e2e.js` and
  `node tools\tests\rs-entry-policy-e2e.js` (four widths, light/dark, both contexts).
  Runtime dependencies remain outside Git. No live service or private data was used.
- Added `docs/display-consolidation-plan.md` with file-level evidence, root causes,
  contracts, six migration phases, invariants, verification, tradeoffs and approval
  boundaries; linked it from the documentation index and architecture/recovery docs.
  Only the immediate card fix is implemented; the plan is not a consolidation release.
- Prepared coordinated `rs-visual-3` query tokens across index/admin/disclaimer/privacy.
  No schema/data migration, Firebase/GCP operation, provider configuration, guide
  edition or analytics change. Rollback restores matching static shells/assets only;
  old tabs require reload. Any future push requires fresh drift/scope checks and
  explicit new authorization. The deployed `rs-visual-2` release remains unchanged.

## 2026-11-11: authorized RS parity repair

- After live testing the recent public parity release, the user directly reported that
  RS2/RS4 badges appeared twice on Crews and requested three additional visual fixes:
  rounds-started labels on the overall RS driver/co-driver homepage leaders, a centered
  compact Pos column on RS standings, and RS4 red / RS2 blue badges matching NR1 / NR2.
- The repair changes only `assets/site.js`, `assets/styles.css`, the synthetic public
  tests, the four public/admin/disclaimer/privacy HTML cache references, and these
  directly related testing/recovery/release records. Duplicate scoring badges are
  suppressed only when that scoring class is already represented by a source class;
  distinct RS2 and RS4 source classes remain visible. The round-start labels use the
  existing evidence-based helper and do not change scoring, eligibility or totals.
- The coordinated shell token advances from `rs-visual-1` to `rs-visual-2` so open tabs
  can load the repaired runtime. Rollback restores the matching static shells/assets
  together. No schema, source data, scoring rules, Firebase/GCP, provider configuration,
  analytics behavior or private data changes are included.
- Synthetic validation passed: `node tools\tests\site-theme-e2e.js` across 320/390/768/
  1440 px in light/dark themes, `node tools\tests\rs-entry-policy-e2e.js`,
  `node --test tools\tests\rallyesport.test.js` (41 checks),
  `node --test tools\tests\season-readiness.test.js` (18 checks), and `git diff --check`.
  The new multi-class regression fails against the old renderer with two RS2 badges
  and passes with one each of the genuine RS2/RS4 classes; browser assertions also check
  leader starts, color parity and position-column alignment.
- The fresh pre-push check confirmed `origin/main` was
  `25ddbe865475c7ff532924b8ddf86c1f27c4d390`, exactly the repair parent, with one local
  commit ahead, no remote-ahead commits and a clean worktree. Commit
  `eb31b7832016744fdbf1c8648c74f4c080a9d86f` was pushed normally and without force to
  `origin/main`. No PR was created and no Firebase/GCP/data operation was performed.
- GitHub Pages built `eb31b7832016744fdbf1c8648c74f4c080a9d86f`. At
  `https://nrrally.co.za/`, `assets/site.js` and `assets/styles.css` returned HTTP 200
  and matched the pushed Git blobs byte-for-byte. The root, admin, disclaimer and privacy
  shells also returned HTTP 200 and carry `rs-visual-2`. This verifies the deployed
  static repair, not authenticated/private data.
- This documentation-only handover records the verified repair deployment and changes
  no runtime, scoring, data or cache behavior. Before its own normal push, recheck
  `origin/main`; afterward verify the final Pages SHA and unchanged runtime assets.

## 2026-11-11: authorized RS public visual parity release

- Implemented in an isolated worktree from `3e778f76178b2a0448cb3f764c4b32c12d6b536f`.
  The user authorized release to `origin/main`: "can you push and ill test it in live.
  as its just cosmetic changes it doesnt need my local first review." This release covers
  the completed public RS presentation parity only: homepage class badges and
  evidence-based rounds-started labels; NR-style year heading; related NR event links
  resolved from the explicit `nrEventId`; NR-style position/class labels; source-backed
  RS round winners; and a clearer, narrow-screen RS Crews layout. NR rendering/scoring,
  RS eligibility and points, result/source records, guide edition and analytics behavior
  are unchanged. No live Firebase/GCP access or writes were made by this implementation.
- Related NR links are rendered from the current public NR event links and entry-list
  source only when the explicit RS-to-NR event relationship resolves. The code contains
  no TRAC URL or other hardcoded NR event URL. Therefore a separately authorized NR
  link edit is inherited dynamically; no code/data migration is needed for it.
- RS starts are distinct championship-result events per person and role. A classified
  result establishes a start; DNF requires source start evidence, and an unresolved DNF
  produces an unavailable total. DNS is not counted. Non-scoring events do not contribute.
  RS round winners use classified source positions only, respect result finality and
  technical-check qualifications, and do not infer winners for provisional/unfinalized
  or unpublished events. The non-scoring launch remains visibly identified.
- Coordinated shell/asset query version is `rs-visual-1` across `index.html`,
  `admin/index.html`, `disclaimer.html` and `privacy.html`; retire/reload older open tabs.
  This is presentation-only, so rollback requires restoring the matching static shells
  and assets together but no database restore or republish. No scoring schema, source
  records, data migration, Firebase rules, hosting or provider configuration changed.
- Synthetic validation passed: `node tools\tests\site-theme-e2e.js` at 320/390/768/1440 px
  in light/dark themes; `node tools\tests\rs-entry-policy-e2e.js`;
  `node --test tools\tests\rallyesport.test.js` (41 checks);
  `node --test tools\tests\season-readiness.test.js` (18 checks); and `git diff --check`.
  Browser requests were intercepted and synthetic; no real provider data, public
  deployment, or live NR link was queried by these tests.
- Fresh release preflight fetched `origin/main` at
  `3e778f76178b2a0448cb3f764c4b32c12d6b536f`; it matches the worktree base with no
  divergent commits. The complete reviewed scope is the 11 changed code, test, shell and
  documentation paths; there are no untracked files. The latest Pages API build also
  reports this same SHA built (`2026-11-11T14:33:30Z`). The approved existing keyring
  account has repository push permission, verified without extracting a token or changing
  global authentication. Commit `3a68799272a72d2e2a60baaf681b812ce3196d1f` was pushed
  normally and without force to `origin/main`. No PR was created, and no Firebase/GCP/data
  operation or provider change was performed as part of this release.
- GitHub Pages reports `3a68799272a72d2e2a60baaf681b812ce3196d1f` built without error.
  At `https://nrrally.co.za/`, `assets/site.js` and `assets/styles.css` returned HTTP 200
  and matched their Git blobs byte-for-byte. The root, admin, disclaimer and privacy HTML
  shells also returned HTTP 200 and contain the coordinated `rs-visual-1` cache token.
  This verifies the static release only; it does not verify authenticated or private live
  data. The user will perform the live UI review.
- Reload old tabs to receive `rs-visual-1`. Rollback is static-only; no database restore
  is needed. Live authenticated data/source verification remains outside this release.
- This documentation-only handover records the completed push and static Pages checks.
  It changes no runtime behavior, scoring, data, cache version or authorization scope.
  Before its own normal push, recheck `origin/main`; afterward verify the resulting Pages
  SHA and that the runtime assets remain unchanged.

## 2026-11-11: RS entry-based policy activation (documentation-only completion)

- After the compatible-code deployment below, the coordinator confirmed the separately
  approved 2026 data migration completed. This entry records that coordinator's report,
  not a new database read/write or independent private-data verification by this session.
  The coordinator delegated a same-release documentation-only commit/normal non-force
  `origin/main` push and Pages verification; no runtime/data/provider change is authorized
  by this documentation follow-up.
- The coordinator reports fresh protected baseline/precommit backups, inventory/version
  guards, a successful synthetic transaction/conflict rehearsal and one atomic update of
  the working season, regenerated public season, shared revision and attributed History,
  labelled **GitHub Copilot (direct Firebase)**. Full endpoint readback matched the
  validated candidate; working/public scoring and independent before/after reference
  and championship driver/co-driver role audits agreed. NR remained unchanged.
- `entry-based-2026-v1` is active. `rs-r1` is the unnumbered non-scoring Launch Event;
  preserved IDs `rs-r2` through `rs-r5` display championship R1-R4. No championship role
  is marked RS0, and RS0 standings tables are empty. The confirmed launch crew's RS0 review is
  scoped to that event only, preserving printed TEST/timing evidence. No global
  exclusion or fabricated membership verification is added.
- Upcoming R4 remains blocked without an invented classification. The four-round
  provisional gate, DNS/DNF, starters, finality, scales and tie rules stay unchanged.
  Existing S2 Mine wording is retained.
- The coordinator additionally reports a live browser smoke pass at 390/1440 px, using
  canonical static assets and read-only public data with analytics disabled and
  private/write traffic blocked. Both provisional role standings, scored R1-R3 columns,
  launch scope/RS0 and the absence of RS0 markers in the three championship
  classifications passed without page errors. The upcoming unscored R4 is appropriately
  absent from scored-only columns. No runtime/data change was needed for this check.
  Named totals and the private verification artifact are deliberately not reproduced here.
- Private backups, exact revision/History identifiers, person/result identifiers,
  account registers, membership evidence and decision provenance are not copied to Git.
  The [migration contract](data-model.md#entry-based-policy-migration) and
  [recovery state](recovery.md#rs-entry-based-policy-activation-recovery-state) now record
  activation rather than leaving the rollout described only as proposed.
- This push changes documentation only: no runtime/scoring behavior, query version,
  guide edition, data, rules, analytics, permissions or provider settings. Prior runtime
  validation remains applicable; review docs/privacy/links and whitespace. Guard freshly
  fetched `origin/main` at `79c8b3d94dd1656e44619c766dfc1de3395f5c54`, use the approved
  existing process-scoped credential helper without token extraction/global-auth changes,
  then verify the exact resulting Pages SHA and unchanged canonical static bytes.
  After activation an older-code rollback requires atomic restoration of the matching
  private working/public backups first; a static rollback alone is unsafe.

## 2026-11-11: authorized RS entry-based compatible-code release

- Base and freshly fetched `origin/main`:
  `7aed656766ff3ce9992601ae962d7c41a62284b6`. Work is isolated on the RS entry-based
  worktree branch. The initial assignment was implementation/synthetic verification only;
  after review the user asked "cool - do you need something from me or do we push ?"
  and authorized proceeding with the compatible-code release. The coordinator delegated
  the reviewed commit and normal non-force `origin/main` push with Pages/static-byte
  verification. This scope excludes PR creation, Firebase/GCP/data reads or writes,
  database publication, rules/settings changes and unrelated backup work. Separately
  guarded data migration is not performed by this code-release workflow.
  The unrelated uncommitted graph-label work in another worktree was not imported.
- RS contract 2 adds explicit private `entry-based-2026-v1` policy review/provenance;
  archived/absent-policy documents retain legacy scoring. Championship driver and
  co-driver eligibility no longer depends on membership/licence/invitation or manual
  person exclusions. Old private evidence is retained without asserting verification.
  DNS, source-evidenced DNF, minimum starters, finality, scales/order/ties/double-points
  and provisional championship gate are unchanged; NR is unchanged.
- Existing non-scoring-event and display-number fields express the launch plus R1-R4
  without renaming stable IDs, changing historical links or NR associations. Public
  results/graphs/event history retain launch data; championship table columns/bars and
  championship appearance counts exclude it. Event stats are distinct from championship
  appearances, not silently deleted.
- A narrow private launch source-row review yields effective RS0 for both crew roles
  only at a non-scoring, unnumbered event, retaining printed TEST and all timing/source
  evidence. TEST is not a supported championship status/class or inferred mapping.
  Unknown inputs and incompatible policy/snapshot shapes fail explicitly. Admin policy,
  status options, inactive legacy controls, validation and Logic explorer explain this
  as a user-confirmed decision, not a printed SSR amendment.
- Public projection strips private policy/launch/membership provenance and emits only
  policy/applied markers, public championship scope and the reviewed launch boolean.
  Shared validation covers admin publication, restore and import document checks.
  Generic AI/PDF/spreadsheet imports remain NR-only; no new RS parser is claimed.
  The Node validator reports the active entry-based policy.
- All 117 synthetic unit checks pass (`node --test tools\tests\*.test.js`); revised RS browser
  regression passes all four widths (320/390/768/1440) and both themes; existing public
  theme and admin-access regressions pass. The admin contract guard now requires the
  matching RS contract 2/helpers, rejecting stale cached engines before restore/publish.
  Admin checks include all 30 logic topics, responsive light/dark RS tasks, keyboard/focus,
  unchanged drafts, editing/reuse/restore/merge/simulation and access/race handling.
  Browser requests are intercepted; no writes or real analytics
  traffic are forwarded. See [testing.md](testing.md) for precise cases/commands.
  Four synthetic legacy-policy comparisons against the reviewed base preserve actual
  scores, projections and old-published public models (JSON key order ignored). This
  confirms the code-first compatibility path; real data correctness and authenticated
  live admin sign-in remain untested. This pre-push record is not a deployment claim.
- Proposed database fields and sequencing are in
  [data-model.md](data-model.md#entry-based-policy-migration). They are not a live-data
  diff: exact private result/car/role identities and any additional unknown categories
  must be reviewed from a fresh authorized private backup before migration. Preserve
  existing Willem Prinsloo / S2 Mine wording pending SN/S2 clarification; no date,
  entrant, stage programme, finality evidence or upcoming classification is invented.
- Coordinated shell/asset query version: `rs-entry-1`. Guide reference edition stays
  2026; no Firebase rules, hosting architecture, analytics or permissions change.
  Release compatible code before separately approved atomic audited data migration;
  retire old admin tabs. After migration, restore matching backed-up working/public
  data with revision/History coordination before an older-code rollback. Static rollback
  alone is insufficient. New Logic explorer policy evidence links explicitly use mutable
  release `main` (not an immutable baseline).
- Release preflight confirms approved existing keyring credentials have repository push
  permission using a temporary non-secret GH configuration and process-scoped standard
  `gh auth git-credential`; no token extraction or global authentication change.
  Fresh remote main and latest built Pages both remain exactly the reviewed base above.
  Review staged scope/privacy/whitespace and recheck main immediately before pushing.
  After push, verify the exact Pages SHA, canonical HTTPS and all deployed static bytes
  against Git blobs, not Windows checkout line endings. Record actual deployment
  evidence separately; no real Firebase/Auth/Analytics calls belong in these checks.
- Compatible-code deployment verified at
  `800f679179133c3f15e9a1cda510428cc4b301cb`: workflow `43037869747` succeeded;
  Pages reported that exact commit built at `2026-11-11T14:23:10Z` without error.
  All **24** checked canonical static files (22 HTML/runtime/brand files and
  `robots.txt`/`sitemap.xml`) matched their Git blobs byte-for-byte with `rs-entry-1`.
  Unversioned root/admin/privacy/disclaimer shells also matched; HTTP, www and default
  Pages-domain requests redirected to canonical HTTPS. Engine SHA-256:
  `c7d7a2fcfa4410bf24fc6b2d6380d91013e5a626de225b0cbdfefc7558e4465b`;
  `assets/ai-import.js` public-projector wrapper SHA-256:
  `171706846ea6f5eb6e5baa7b85160567ee049573f6676932f0d87a4f98bf044b`.
- Revised public/admin and existing legacy public browser regressions both passed again
  against an outside-Git snapshot of those downloaded deployed bytes. Provider requests
  were intercepted with synthetic data; no real Auth/Firestore/Analytics calls or writes.
  The earlier full admin-access runner passed against the identical release source.
  No live data/source correctness, authenticated sign-in or database activation is claimed.
- The same-release documentation-only handover records these actual outcomes. It changes
  no runtime, scoring behavior, cache version, data or approval scope. Re-fetch/guard
  `origin/main` at the code SHA above, review the docs-only staged diff and whitespace,
  normally push without force, then verify the resulting Pages SHA and the unchanged
  canonical runtime files. Report the final documentation/deployment SHA in the handoff.

## 2026-11-11: authorized public welcome/navigation/guide UI release

- Fetched `origin/main` and worktree HEAD both matched
  `95643f5e7ef02dc904c52eeb95d7f7b7a1ad56af`, reconfirmed before release. After local
  preview/review the user explicitly requested a visible MENU label and "push to live",
  authorizing commit and normal non-force `origin/main` push/Pages deployment of this
  whole UI batch. No PR, Firebase/GCP access, data publication or provider changes are
  authorized. This pre-push entry does not assert a completed deployment.
- The requested welcome is **Welcome to RallyeSport** in `display-context.js`, not
  the independent active-rally warning. Continue, Info and Escape now persist a
  seven-day absolute expiry in `nr-rs-welcome-until` local storage. Automatic NR-to-RS
  switches suppress the welcome before expiry without extending it, including after
  reload/restart; at expiry the next switch shows it. Navigation/refresh alone do not
  open it. Route cleanup does not acknowledge it. Explicit manual helper reopening,
  keyboard/focus behavior and the static privacy/disclaimer controls are preserved.
- Invalid/expired preferences do not suppress it. Storage read/write failure logs a
  warning and preserves only page-local dismissal; clearing site storage resets it.
  Analytics opt-out/consent and active-rally session bypass/manual reminder are unchanged.
  The privacy page now explains the separate seven-day preference.
- NRC's rendered desktop/mobile menus were inspected in real Chromium: full wide
  navigation becomes a hamburger with stacked links, toggle-to-close and closure on
  selection. Our implementation uses that responsive principle, not NRC code/assets,
  at a header-content-tested 1200 px breakpoint. Narrow desktop windows also collapse;
  wide navigation remains full. The accessible disclosure closes on Escape, selection,
  outside click/focus and breakpoint changes. Active routes, year, NR/RS and theme
  controls remain intact. Short menus scroll vertically, never horizontally.
  The hamburger now includes a clearly visible MENU label, retained alongside the
  close icon while expanded; accessible Main menu naming and expanded state remain.
- Getting started retains the same year selector/pill as other results pages.
  Existing year-prefixed routing carries the selected results context through guide
  links/topics, year changes, reload/history and return navigation. It still renders one
  shared guide without new yearly content, edition relabelling or a database dependency.
- The same shared guide now meaningfully includes RS in its National/Regional comparison:
  club championship, standalone or shared selected-stage programmes that vary by round,
  typically the lowest costs without a price guarantee, and its own SSRs. Newcomers are
  directed to the applicable RS SSRs and each round's event SRs/official programme for
  exact stages, entry/licensing requirements and costs. The dated 2026 RS SSR link is
  reused from the existing documented source; NRC/NR technical distinctions are retained.
  The user also supplied that exact official PDF URL: it appears inline as
  **2026 RallyeSport SSRs** and in the dated reference list, with the existing safe
  external-link attributes, not the misleading NR label from the pasted link.
- No engine/scoring/schema/rules or database changes, migrations or publication.
  Guide reference edition stays 2026. Shell/asset queries advance together to
  `welcome-7d-1` across index/admin/disclaimer/privacy. Reload old tabs; roll back
  matching static shells/assets together, with no database restore needed. Older code
  ignores the new preference key.
- Validation: all 112 synthetic Node tests passed. The intercepted rally-notice browser
  suite passed first selection,
  reload/restart persistence, one millisecond before/exact seven-day expiry, Continue,
  Info, Escape, explicit reopen, privacy-shell sharing and storage-denied fallback,
  alongside existing active-rally/admin/mock-publication/focus/responsive regressions.
  The intercepted analytics, full public theme and admin-access browser suites passed,
  with no live collection or provider writes. The focused navigation runner passed both
  themes/competitions at 320/390/768/1024/1199/1200/1201/1440 px, including all routes,
  guide year context/content, selector/theme behavior, keyboard/focus/outside/selection,
  including identical NRC/NR/RS guide copy and readable RS text in both contexts,
  short-height scrolling and bidirectional resize. Existing split/profile test assertions
  now wait for their rendered destination rather than just the new URL; the initial
  split timing failure was also reproduced with baseline code before updating those waits.
- Re-run focused synthetic tests after the MENU label/layout adjustment, review the full
  diff/untracked paths and whitespace, then recheck remote main before the authorized
  normal push. Use process-scoped standard GitHub CLI credentials without extracting
  tokens or changing global authentication. Verify Pages built the pushed SHA, canonical
  HTTPS and static-file bytes; keep any synthetic live-asset browser replay intercepted.
  Stop the loopback synthetic preview after review. Real sign-in, data/source truth and
  deployed Firestore rules remain outside this code-only release.
- Final pre-push checks after adding MENU passed: all 112 Node tests plus navigation,
  active-rally/welcome and full public-theme browser runners. MENU remains visible in
  both disclosure states, the icon changes correctly and the 320 px layout still fits.
  Earlier same-batch analytics/admin browser passes remain recorded above.
- The first push attempt was refused with HTTP 403 by the process-token identity;
  no remote ref changed. A read-only preflight confirmed the pre-existing documented
  keyring release account has repository push permission. The release retry removes
  token overrides only from its own process and uses `gh auth git-credential`; no token
  extraction, account registration or global authentication change is involved.
- Deployment verified: the normal non-force push succeeded at
  `c9fe6085a476ee392718871e52ffd83926dc7110`; Pages workflow `42997965175` succeeded
  and the Pages API reported that exact SHA **built**, with no build error.
  All 22 canonical HTTPS HTML/runtime/brand files matched that commit's Git blobs
  byte-for-byte (compare Git blobs, not Windows checkout line endings).
  The navigation browser runner also passed against a downloaded snapshot of those
  deployed bytes: NR/RS, both themes, all eight widths, guide/year context, MENU states,
  keyboard/focus/outside/selection and resizing, with provider traffic intercepted.
  No live Firebase/GCP, Auth or Analytics calls were made; real authenticated admin
  sign-in and live source-data correctness were not tested. Admin static assets matched
  Git, and the earlier synthetic admin-access regression passed.
- The detached loopback review preview has been stopped. This same-release
  documentation-only handover changes no runtime, behavior, cache version, data or
  approval scope. Guard remote main at the verified SHA above before the normal
  follow-up push; verify Pages builds its resulting documentation SHA and that all
  22 runtime/static files still match. No new code validation is required for these
  documentation-only edits. Current main/Pages must be checked rather than treating
  the historical verification SHA as the latest deployment indefinitely.

## 2026-11-11: authorized RS class-label continuity release

- Freshly fetched base: `bf698ff9c80014e998322d78a414a357b66713ff`. The user requested
  mapped RS2/RS4 public labels in place of the older source category labels, retaining
  the points/split toggle. The coordinating request expressly authorizes implementing,
  testing, a normal non-force `origin/main` push and Pages/static verification.
  No Firebase/GCP access, reads, writes, data publication or provider changes are included.
- A shared display helper reuses each published result's explicit class mapping in RS
  classifications, crews, cross-season profiles, graph pickers/legends and stage tables.
  Source notes disclose mapped classes without repeating the old aliases. Headers say
  RS class rather than incorrectly claiming the mapped text is the printed category.
  Unmapped categories are not guessed; eligibility/RS0 remains separate. Admin source
  editing and the underlying categories/mappings remain unchanged.
- Scoring, eligibility, engine, schema, NR rendering and published source data are
  unchanged. The retained toggle does not introduce overall points or support for
  unknown future regulations. No migration or database republish is needed. Guide
  reference edition remains 2026; analytics/privacy behavior is unchanged.
  Coordinated shell cache queries advance to `rs-classes-1`; reload old tabs and keep
  shell/runtime versions together on rollback. A static rollback needs no data restore.
- Validation: 107 Node tests passed, including explicit mapping, unmapped/TEST,
  source/model/scoring preservation and unchanged NR output. Public browser regressions
  cover both mappings, expanded notes, profiles, crews, graphs and stage times at
  320/390/768/1440 px in both themes. All five synthetic public/admin/import/notice/analytics
  browser suites passed; all provider traffic was intercepted and no synthetic collection
  reached live services. Optional actual-Google-runtime replay and live sign-in are
  outside this display change; real data/source correctness and deployed rules are
  not certified by synthetic checks.
- Before push, review all changed/untracked paths and whitespace, verify the exact
  remote base, and use only temporary non-secret GH configuration with the approved
  existing keyring account and standard scoped `gh auth git-credential` helper.
  No token extraction or global authentication change. Verify the resulting Pages SHA
  and canonical deployed file bytes after pushing; this is a pre-push scope record,
  not a claim that deployment has already completed.

### Deployment verification and documentation-only follow-up

- Code commit `51a523858ce690262585100bb1e1816fdba3cb3d` was normally pushed to main.
  The initial Pages run checked out that commit, but reported the previous revision as
  its build version. A rebuild of unchanged main aligned the metadata: Pages reports
  that exact code SHA **built** at `2026-11-11T07:36:54Z`. All 22 canonical HTML,
  runtime and brand files matched Git byte-for-byte; canonical HTTPS remains enforced.
- Focused browser checks using actual deployed static assets with synthetic mapped
  source records passed classifications (including expanded notes), graph legends and
  filters, stage times, crews, profiles and the retained standings toggle at all four
  widths in both themes. Source fixtures were unchanged, with no page errors, unexpected
  requests or real provider traffic. No live Firebase/GCP access or writes occurred.
  A broader deployed replay hit an existing asynchronous profile-to-graph assertion;
  it is not claimed as a full deployed-suite pass. The complete local synthetic suite
  passed, and the focused deployed checks explicitly await/reload each route.
- This follow-up updates only this release record and the recovery handover.
  **No runtime, data, scoring, schema or operational behavior changes.** Before its
  normal push, confirm main is still the verified code SHA and review the two-document
  staged diff. Verify the resulting Pages metadata and unchanged canonical runtime
  bytes after pushing. Real source correctness, live sign-in and deployed rules
  remain outside this display-only verification.

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
