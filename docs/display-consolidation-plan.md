# Public display consolidation: assessment and migration record

## Status and scope

Assessment baseline: `5d45f8bfecc8cd828a04070dc19e062089073819` on main.
The user subsequently approved implementation in phases, with identical consumption,
fields, qualifying states, wording, layout and spacing across competitions, apart from
their data and existing branding/colours. **Phases 1-6 were released** in
`87290a7384c4b65c1d7442111887558a7dc470b3`; deployment verification is recorded at
`76d0c52ba4ada467b42129ecf4daa72713ec9733`. The separately approved compact Crews/
Standings/classification follow-up is deployed in `c6935762b109434aee57ae5d7ecf3c269509833e`.
The Home eligibility tidy-up is a small follow-up to that display work, not a new
consolidation phase. No provider access, data publication or schema migration is
authorized. The optional Getting Started CTA rewrite remains unapproved.

The user's clarification governs the design: **shared style means text hierarchy,
wording such as "Pos", and the structure of cards, rounds and calendars, not identical
competition colours.** Preserve NR's and RS's existing branding, accent tokens, light/
dark palettes and class colours. Use NR as the presentation reference, not as the RS
sporting model. This is feasible within the current static architecture.

## Finding: one platform, parallel page renderers

There are not two hosted applications. There is one public SPA, router, public loader,
season envelope, identity directory, stylesheet and competition preference. The pure
engine builds an NR model with an independent nested RallyeSport model. Pages then
branch between NR and RS HTML-generation functions.

The separation of scoring/data is necessary. The duplicated HTML is not. Current
coupling makes it easy to add a heading, field, spacing rule or empty state to NR
without changing RS. The repeated parity repairs are evidence of that failure mode.
Simply routing RS through the existing NR functions would be unsafe: those functions
expect NR-only globals and semantics, not just different competition names.

### Evidence map

This is the historical assessment map before phases 1-2. Its line references describe
the pre-consolidation working tree, including the local leader-card repair; several
Home functions below have now been removed. The completed-phase section records
the current implementation paths.

| Area | Shared today | Parallel paths / constraint | Evidence |
|---|---|---|---|
| Loading and context | Public site/people/season loader; `E.buildSeason`; one router and competition preference | `useSeason` populates NR-oriented globals: round/event indexes, classes, standings and last round. RS accesses nested models independently. | `assets/site.js:208` (`loadSeason`), `:227` (`useSeason`), `:374` (`render`); `assets/engine.js:149`, `:376` |
| Home | Grid, cards, class badges, miniature bars, link helpers and theme tokens | `viewHome` and `viewRsHome` assemble separate heroes, feature/leader cards, metrics and notices. This task narrows one visible mismatch without consolidating those paths. | `assets/site.js:477`, `:544` (`homeRallyeSportChampCard`), `:593` (`viewRsHome`) |
| Calendar | `eventLinks`, date helpers, explicit NR/RS event relationship | `eventCards` branches into NR per-round rows and RS event/result cards. RS round-number ordering puts the unnumbered launch after championship events; the combined mode has its own date/merge path. | `assets/site.js:650` (`eventLinks`), `:673`, `:689`, `:713` |
| Standings | Table primitives, role/class controls, profile links, badges | `viewStandings` / `viewRsStandings` / `rsStandingsTable`; NR filters overall rows by class, whereas RS has independently ranked class tables. Different points fields and responsive column markup leak into layout. | `assets/site.js:769`, `:860`, `:958`; `assets/engine.js:149`, `:779` |
| Rounds / winners | Page shell, event list and links | NR winner rows derive from NR rounds; `rsRoundWinnersTable` uses RS source classifications/finality and non-scoring/upcoming states. | `assets/site.js:40`, `:1117` (`viewRounds`) |
| Result shell / classification | Profile/time/URL helpers, cards and tables | `viewRound` / `rsResultHeader` and `roundClassification` / `viewRallyeSport` separately build tabs, summaries and rows. RS official classification and independent role awards are not NR credited starts/points. | `assets/site.js:1159`, `:892`, `:1495`, `:1043`; `assets/engine.js:376` |
| Graphs / stages | Most controls, chart renderer, comparisons and stage tables already reused | `rsGraphModel` adapts independent RS data to a graph model. Some league-specific text replacement and `r.rs` branches remain. Data precision and metric availability differ. | `assets/site.js:929`, `:1201`, `:1443`, `:1479`, `:1534`; `assets/engine.js:827` |
| Crews | Search, profile links, badges, table styles | `viewCrews` aggregates NR starts/documented entries; `viewRsCrews` aggregates source appearances, roles, class sets and unique events. The repaired duplicate badge came from displaying overlapping source/scoring class sets twice. | `assets/site.js:1563`, `:1584`, `:1607`, `:1632` |
| Profiles | `profileHeader`, KPI and point-chart helpers | `viewPerson` switches/restores global season context for historical NR output; `viewRsPerson` traverses explicit season models. NR starts/wins and RS appearances/official finishes cannot be relabelled interchangeably. | `assets/site.js:1752`, `:1682`, `:1813`, `:1860` |
| Sources / data notes | Disclosure and document/link styles | `viewAbout` and `viewRsSources` have different page structures and content. Source classification status and scoring-readiness notices are different concepts. | `assets/site.js:1900`, `:1887` |
| Info | One `viewInfo` already | Shared renderer still reads NR `D.documents`, `D.events`, `D.calendar`, with NR-specific introductory wording even in RS context. A single renderer alone does not ensure correct competition provenance. | `assets/site.js:1954` (`viewInfo`) |
| Getting Started | One bundled original guide; available before results/database loading | Intentionally dated reference material, not season-generated competition rules. Shared CTAs still have NR wording; changing that wording is a separate approval. | `assets/site.js:380`; `assets/getting-started.js:5`, `:88` |
| Responsive / accessibility | Shared navigation, theme, loading/error states, grid/table/chart primitives | NR standings use sticky/mobile columns; RS classification becomes cards at 640px and RS Crews at 900px. These are separate presentation policies, not just palette choices. | `assets/styles.css:251`, `:274`, `:426`, `:434`, `:461`; `assets/display-context.js` |

### Why drift persists

1. **No presentation boundary.** Page code both interprets the competition model and
   emits HTML. Fields such as NR `total`/`cls` and RS `points`/class-table membership
   determine markup instead of being adapted before rendering.
2. **NR-global coupling.** Reuse of NR page functions implicitly brings NR season,
   round, entry and scoring assumptions. RS therefore has parallel implementations.
3. **Partial component reuse.** Helpers share individual badges/charts but not the
   complete leader, round, standings or crew composition. A shared badge cannot
   prevent the caller from displaying the same class twice.
4. **Capabilities expressed as league checks.** `competition === 'rs'`, `r.rs`,
   bespoke field reads and text substitutions mix sporting differences with display
   choices. A change to one branch is not mechanically required in the other.
5. **Tests emphasize facts and route operation, not a common structural contract.**
   Existing synthetic coverage is valuable, but two independently valid pages can
   still differ in heading level, wording, column alignment or responsive layout.

These are architectural observations, not a claim about the original author's intent.
There is no need to change hosting, add a framework or combine scoring engines.

## Target architecture

Keep the current pure engine and public projection. Introduce a small, pure,
read-only presentation adapter for each competition and one common set of components/
page renderers. The dependency direction should be:

```
Published public records
  -> existing engine validation and independent NR / RS models
  -> NR display adapter | RS display adapter
  -> common page/component contracts
  -> shared HTML, CSS, route bindings and chart mounts
```

Target boundaries (the Home adapters/components are implemented in phases 1-2;
the later-page migrations remain proposed):

- `assets/public-model.js`: explicit NR/RS display adapters, exported for browser
  and Node tests using the repository's existing plain-JavaScript module pattern.
  Add JSDoc discriminated contracts rather than introducing a build step.
- `assets/public-components.js`: common escaped HTML composition for headings,
  badges, leader cards, event/round rows, result headers, tables and empty states.
  Formatting uses explicit value/status/precision metadata, not league-name regexes.
- `assets/site.js`: retain loading, routing, UI state, event binding and chart mounting;
  gradually replace parallel page bodies with shared pages composed from adapters.
- `assets/styles.css`: keep competition theme tokens; attach responsive behavior to
  component classes/capabilities rather than duplicating NR/RS selectors.
- `assets/engine.js`: stays responsible for sporting calculation and public snapshot
  validation; no HTML, DOM, provider reads or display wording added.

Do not introduce a generic plugin framework. Start with the two supported adapters,
the fields actual pages require, and explicit unavailable states. Keep safe URL/
escaping helpers shared and avoid circular imports between router and components.
Adapters must not write back to their input models or read private working records.

### Required display contracts

| Contract | Minimum information / invariant |
|---|---|
| Competition and season | Stable competition key, season, display name, theme key, class definitions, rules/points basis and capabilities. The theme key changes colour, not markup. Never substitute the route year for the guide's reference edition. |
| Identity and role | Stable person ID plus printed display name, resolution state and role. Person identities remain cross-season; result/round keys are namespaced by competition/season. Never join by a shared name, car number or matching class suffix. |
| Values | Distinguish known number (including zero), unknown, unavailable and blocked with a public reason where appropriate. No null-to-zero conversion, dummy dates, fabricated stage positions or success-shaped fallback. |
| Class membership | Separate printed/source class, reviewed event-specific mapped class and scoring class. Present unique badges with provenance/status; preserve a person's genuine RS2 and RS4 memberships and role-specific class ranks. |
| Standings | Role, rank/tie group, class scope, points total and named components/basis, start evidence, eligibility state, provisional reason, round contributions. NR overall-plus-class awards remain distinct from RS class-only totals. Don't infer overall rank from a selected class table. |
| Leader | All equal leaders, optional next distinct score/margin, profile links, class badges, starts with availability, round contributions and finality. No arbitrary tie winner or miniature chart for an arbitrarily selected joint leader. |
| Event / round / result | Event identity plus zero or more championship rounds/results, label/number, own source IDs, event status, championship-counting flag and optional explicit related-event mapping. Two NR day rounds are not one RS round. |
| Dates and ordering | Source-backed display/date fields, date provenance, confidence and deterministic undated ordering. Linked NR date fallback is display-only, never an RS scoring date. No guessed day allocations. |
| Links | Safe destination, label, owner competition/event and relation (`own` or `related`). Inherit NR links only through an exact existing `nrEventId`; label them related NR links. Never imply an NR classification is RS official results or copy stale URLs into RS records. |
| Participation | Entries, appearances, finishes and starts are separate measures with role/round/event scope and coverage. Missing entry lists are not zero entrants; documented lists are not inferred all-event participation. |
| Results / winners | Source finality, classification status, published position/total, role awards and championship-counting state. A source-final winner can coexist with provisional championship scoring. Future/unfinalized results have no invented winner. |
| Stage / graph | Independent axis, printed times/positions, null gaps, penalty/official total, precision, supported metrics and accessible labels. RS hundredths must survive; official finals need not equal available stage sums. |
| Documents / Info | Competition-owned vs explicitly shared documents, dated source metadata and availability. No automatic transfer of NR regulations, social identity or event lists to RS through a shared renderer. |

Capabilities should describe real differences (for example separate points components,
documented entry coverage, supported graph metrics). They must not be a large matrix
of per-league visual exceptions that recreates two renderers behind one function.

### Sporting and privacy invariants

- Keep all NR calculation, eligibility ordering, credited identities, class overrides,
  extra starts, countback, archive behavior and stable cross-season profiles unchanged.
- Public RS consumes a validated published snapshot. Missing/incompatible snapshots
  remain unavailable; the display adapter must not recalculate eligibility from
  stripped private data.
- Preserve the reviewed 2026 entry-based eligibility policy and older-season policy
  behavior. Keep RS2 and RS4 separate and event-specific mappings local to their event.
- Preserve the four-round provisional championship gate and explicit excluded/blocked
  rounds. Partial standings are not final awards, and an excluded round is not zero.
- Retain launch results, event stats, profiles and graphs; exclude the launch from
  championship points, rounds and starts. Its non-scoring label remains visible.
- RS starts are per person, role and distinct championship result: classified or
  evidenced DNF counts; DNS does not. An unproven DNF yields an unavailable total.
  Multiple cars/roles do not inflate one role's count. Standings-only data must not
  manufacture a zero-start history.
- Do not conflate source classification finality, score readiness, person eligibility
  and season finality into one boolean "final".
- Keep public results read-only. Do not copy membership, licence/review evidence,
  private start evidence, allowlists or working metadata into display contracts.
- Preserve sanitized analytics categories, global-default preinitialization, opt-out
  and admin exclusion. No raw identity/query/source URL should enter analytics.

## Phased implementation plan

Each phase is an independently reviewable static-code change after separate approval.
Do not run the whole plan as one cosmetic release. No phase below requires a database
write. If absent metadata needs new public fields later, stop for a separate reviewed
schema/projection and audited-publication proposal instead of inferring it.

### Phase 1: baseline, contracts and adapters (completed locally)

Dependency: approval of scope and contracts.

- Add focused adapter tests and semantic baseline fixtures before extraction.
  Inventory every displayed field with owner/source/availability, especially Info,
  starts, ranks, class scope, event relationships and graph precision.
- Implement minimal NR/RS adapters in `public-model.js` for Home first. Keep other
  pages on current models until migrated; do not normalize the engine's stored schema.
- Pass explicit context into new code rather than reading `D`, `ROUND_IDS` or
  `standingIdx`. Freeze synthetic inputs to catch accidental mutation.
- Exit: identical existing NR/RS scoring hashes and canonical display facts; no
  provider requests added; unknown/blocked inputs survive normalization.

### Phase 2: common primitives and Home (completed locally)

Dependency: Phase 1.

- Extract common section/empty/status/class/leader/minibar composition into
  `public-components.js`. Migrate NR and RS Home to the same compositions.
- Use common wording/hierarchy ("Driver leader", "Co-driver leader", "Pos",
  "Rounds started") with explicit plural/tie/provisional handling.
- Keep competition hero copy/brand and different sporting notices data-driven.
  No new starter/entrant metric without the corresponding evidence contract.
- Exit: structural component tests run the same renderer with both adapters;
  responsive feature/class/role cards match NR's layout quality without changing NR
  output, RS colours or any totals.

### Phase 3: one calendar and Rounds overview (completed locally)

Dependency: Phase 2 primitives and Phase 1 event contracts.

- Replace NR/RS branches in `eventCards`, `rallyeSportEventCard` and
  `rallyeSportResultCard` with one event card and round/result row component.
- Make Home and Rounds call the same calendar renderer; derive the Info event list
  from that same adapter rather than independently walking NR data.
- Normalize event parents and multiple round children without flattening NR two-day
  rounds into one event result. Retain the combined-mode explicit mapping behavior.
- Separate own links from related NR links, preserving exact source destinations.
  Test dynamic changed/missing NR `srs` links, unknown relationship and RS-only events.
- Use shared winners-table composition with source-aware rows, including launch,
  pending, upcoming and no-results states.
- Date-first ordering is now the explicit common policy below: launch stays in
  chronological context, not after the numbered rounds. No date is invented.
- Exit: one calendar HTML path; known/fallback/unknown dates and links retain
  provenance; all events/results remain reachable, with no fabricated winners.

### Phase 4: shared standings (implemented locally)

Dependency: Phases 1-2.

- Replace `viewStandings` / `viewRsStandings` table assembly with one role/class
  standings page and column descriptors.
- Keep common position/name/points/round columns and responsive policy. Optional NR
  award components, RS class-specific rank and season eligibility explanation come
  from the contract, not league-name string replacement.
- Route legacy RS overview tables through the same component, preserving anchors.
- Exit: centered Pos, stable keyboard/sort/filter behavior and accessible headers;
  NR countback/eligibility and RS equal ranks/class-only totals unchanged.

### Phase 5: result shell, classification, graphs and stage tables (implemented locally)

Dependency: Phases 1-4 and explicit result/stage contracts.

- Share tabs, previous/next navigation, event/source headers and classification row
  composition between `viewRound`, `rsResultHeader` and `viewRallyeSport`.
- Retain `E.buildRallyeSportGraph`; adapt NR and RS once into explicit graph metric/
  precision/status contracts. Remove text replacements and incidental `r.rs` checks
  only when their semantics are represented in those contracts.
- Keep own stage axes, official printed final totals, missing stage cells, hundredths,
  DNS/DNF and independent role awards. No bundled data or live timing introduced.
- Exit: graph controls, class/car filtering, head-to-head, stage headers, timing
  precision and independent-axis guarantees pass in both contexts, including launch
  and sparse results. Legacy direct links still select the same result/tab.

### Phase 6: Crews, profiles, Sources/Info and cleanup

Dependency: migrated components/contracts from preceding phases.

- Share crew directory/search/responsive rows, with deduplicated class/status
  composition and distinct labels for documented entries, starts and appearances.
- Make profile generation use explicit per-season adapter context. Remove NR global
  season switching only after cross-season parity tests pass; preserve stable URLs,
  credited identities and own-competition history.
- Share Sources page layout while retaining each competition's own source notes,
  rules/scales and score-readiness disclosures.
- Correct Info's data ownership using the contract. Display explicitly shared
  information as shared and missing RS-specific metadata honestly; do not relabel NR
  regulations as RS regulations. Editorial/schema choices need separate approval.
- Leave the already shared Getting Started renderer database-independent and its
  explicit reference edition unchanged. Any CTA wording revision is separately reviewed.
- Delete replaced wrappers and CSS only after confirming no router, legacy link,
  tests or admin dependency still uses them. Document the remaining intentional
  competition differences.
- Exit: common page renderers across the agreed surface, no duplicate page markup
  retained as a fallback, and new presentation changes exercised against both adapters.

## Verification and release gates

Keep two kinds of tests: shared presentation contracts and independent sporting
invariants. Pixel equality is not the goal: branding, data length and optional factual
columns differ. Verify matching structure/wording/alignment and honest missing states.

| Dimension | Required cases / checks |
|---|---|
| Public pages | Home, both-role Standings, calendar/Rounds, classification, graphs, stage times, Crews, cross-season profiles, Sources, Info and database-independent guide |
| Layout | 320/390/768/1440px, light/dark/system, long names/URLs, multi-class labels, ties, no overflow, position alignment, sticky columns, print and reduced motion |
| Accessibility | Heading order, table headers, keyboard search/filter/tab/competition controls, focus/route history, status announcements and safe external links |
| Calendar | NR-only, RS-only, explicitly shared, multiple NR rounds per event, launch, future event, absent date, related date fallback, present/absent/changed related links |
| Sporting | NR archive/current scoring; RS reviewed policy and provisional gate; launch exclusion; DNS/evidenced/unproven DNF; multi-car/role deduplication; ties; class-only totals; blocked snapshots |
| Timing / identity | Unknown IDs, stable cross-season IDs, printed vs credited names, source/mapped classes, missing times, independent axes, hundredths and official finals |
| Privacy / navigation | Public projection only, no input mutation/writes, unchanged canonical/legacy hashes and preferences, no raw personal/query/source fields in analytics |

Run the smallest phase-specific Node tests first, then relevant browser suites:
`season-readiness.test.js`, `rallyesport.test.js`, `entry-participation.test.js`,
`getting-started.test.js`, `navigation-e2e.js`, `site-theme-e2e.js` and
`rs-entry-policy-e2e.js` as applicable. Run analytics regressions if route/render
notification boundaries change. Add adapter/component tests using synthetic fixtures;
do not install a second testing stack or commit private fixtures/screenshots.

Before any authorized release, re-fetch main, inspect drift and full diff/untracked
files, update affected documentation and the release ledger, coordinate all four
shell asset versions, and record exact phase/approval/limitations. Verify Pages SHA
and live static assets only after an authorized normal push. Old tabs do not upgrade
automatically; retire old admin tabs before any separately authorized data publication.
Rollback is a coherent static revert of that phase's shells/assets; no data restore is
needed for these proposed display-only phases.

## Tradeoffs and decisions still needing approval

- **Prefer pure adapters over rewriting the engine.** This adds one explicit boundary
  but protects source fidelity and archived scoring; rewriting scorers for common
  field names is much riskier and not part of display consolidation.
- **Prefer incremental plain JS over a framework/build migration.** The problem is
  duplicated composition, not missing tooling. A framework rewrite adds deployment,
  recovery and accessibility risk without fixing sporting-data ambiguity.
- **Prefer explicit capabilities over a universal table.** A small optional-column
  contract is clearer than either dropping NR detail or showing fictitious RS fields.
  Stop generalizing when a field is genuinely absent.
- **Review calendar ordering, responsive table policy and Info ownership.** These
  can change visible behavior beyond wording. Phase review should resolve them before
  replacing either current path.
- **Keep editorial/rules changes separate.** Competition names/colours and supported
  data may vary; technical/licensing guidance and future seasons are not generated
  merely by changing a name or year.

Phases 1-2 have no unresolved technical blocker. The remaining migration needs
phase-scoped implementation instructions and separate release approval. Incomplete RS metadata is a data/
provenance constraint, not permission to invent fields; the initial adapters must
support that absence. Provider/data access is not necessary for this plan.

## Completed locally: phases 1-2

This is the earlier checkpoint; the phase 3 record below supersedes its next-step notes.

The approved core mandate is enforced by one Home presentation, not matching copies.
`assets/public-model.js` defines `HomeDisplay`, `HomeRow`, `HomeClass`, `HomeCounts`
and `HomeScoring` JSDoc contracts, with explicit NR/RS adapters. They read existing
validated engine models, emit limited public facts and scoped links, distinguish
known zero from unavailable, and do not mutate sources or recalculate awards.
Existing pure RS appearance/start/contribution helpers were extracted here and are
reused by the remaining site views, preventing a second set of start-evidence rules.

`assets/public-components.js` has the sole Home hero/stat/status/leader/class-card
markup and wording. It has no competition-specific composition branch. In
`assets/site.js`, `viewHome` and the compatibility `viewRsHome` delegate through
`homeView`; the former NR/RS Home bodies and miniature/card copies are removed.
`index.html` loads the model and components before `site.js`. Existing theme tokens
continue to provide the distinct colours. No engine, provider, projection/schema,
analytics, guide-content or sporting-rule changes were made.

### Product decisions within these phases

| Decision | Behavior and reason |
|---|---|
| Identical Home language/slots | Both use the same season-overview kicker, neutral headline, championship identity field, site-level tagline (or shared neutral description), four stats, action labels, leader headings, Table/Full standings/Full calendar wording, scoring disclosure and section spacing. The NR-only geography kicker is replaced, not copied onto RS. |
| Four statistics even before results | Rounds with results, Events, Drivers scored and Recorded special stages retain the same slots. Supplied calendar counts are known; absent driver/stage facts are `—`, not invented zero claims. Calendar-only pages share No results yet and do not fabricate leaders. |
| Championship vs event counts | RS Rounds with results counts distinct championship events/results only, excluding launch. Events/stages still include launch. The scoring disclosure states these scopes. NR keeps its own round/day and recorded-stage counts. |
| Common qualification field | Every ranked leader row shows class badges, rounds started and a qualification slot. Values come from existing eligibility/evidence, not a new policy. NR credited starts are explained; RS role starts require evidence. |
| Correct ranking basis | NR class panels retain the existing overall-order/overall-total class filter, explicitly labelled. RS panels retain independent class ranks and class totals. Neither adapter invents the other's point components. |
| Complete shared leader card | NR and RS use the prominent driver heading, points/classes/starts/lead, round bars and co-driver line underneath. Equal leaders remain joint; missing co-driver/start/lead/class facts stay explicit. A sole leader without an eligible comparator never gets a fabricated margin. |
| Charts | Both use the same per-card observed-maximum bar scaling, with published contributions only. Known DNF zero shows `0` with DNF in its accessible description; unavailable contributions show `—`. Launch/upcoming results are not fabricated into RS championship bars. |
| Responsive layout | Both use one class-card grid policy and wrapping/qualification styles. Card count follows actual class data; individual role tables are capped at five leaders, class tables at three, as before. Empty configured classes use the same unavailable card state. |
| Navigation | Home Table links now go to the corresponding role/class standings in both contexts, not RS's legacy combined table page. Existing legacy URLs remain supported on their unchanged routes. Profile links carry stable ID, season and competition. |
| Guide | The guide CTA wording and dated guide content are unchanged; no unapproved editorial rewrite. |
| Phase boundary | The calendar section heading/link is shared, but its event cards remain `eventCards(mode)`. Calendar internals and every other page remain in their current paths; phase 3 has not begun. Do not describe this as complete site-wide parity. |

### Verification and remaining work

`tools/tests/public-display.test.js` adds seven focused contracts: immutable independent
NR/RS facts; genuine multi-class membership and repeated-car start deduplication;
calendar-only four-slot availability; missing published snapshots; identical output
for identical facts regardless of competition identity; tied/missing/zero states; and
escaped text, scoped navigation and accessible chart gaps/zeros.

86 targeted Node tests passed across public-display, season-readiness, RallyeSport,
entry participation, Getting Started and analytics. The public theme browser suite now compares
NR/RS fixed Home DOM structure, exact shared labels and computed typography, padding,
margins, gaps and alignment at 320/390/768/1440px in light/dark. It also checks native
scoring-disclosure keyboard operation, source links, multi-class/starts, launch,
future/empty/blocked states and unchanged other-page sporting behavior.
Navigation and RS entry-policy browser suites passed with all external traffic
intercepted. No live/private data or writes were used.

The shared renderer can consume another adapter without copying Home markup; this
does not register or invent RallyXCross rules, data, class names or routes. A future
league still requires explicitly supported sporting/data contracts and approved
integration. There is no generic plugin framework.

Next planned phase is the common calendar/event/round/winner presentation, preserving
explicit link provenance and event-vs-round distinctions. Standings, results/stages,
Crews/profiles and Info follow only in their later phases. No technical blocker was
found in phases 1-2. Report this checkpoint before beginning further phases.

Shell token `rs-visual-3` is prepared across public/admin/disclaimer/privacy; nothing
has been committed or deployed. Recovery remains a coherent static-only rollback.

## Completed locally: phase 3

The next approved increment extends `public-model.js` with `CalendarDisplay`,
`EventDisplay`, `RoundDisplay`, `EventLink` and `Winner` contracts and explicit NR/RS
calendar adapters. `public-components.js` now owns the only event-card, round-row,
source-link group and winners-table markup. Home, Rounds and Info's event section
consume that calendar, rather than maintaining three event lists. `viewRounds` is
one delegate with identical title, heading, introduction, table labels and layout.
The old RS calendar/card/winner functions and NR calendar/table markup are removed.
Existing result/graph/stage detail renderers are not consolidated in this phase.

### Ordering and provenance decisions

- Both calendars, Info event lists and winner tables use date-first parent order.
  Known dates precede undated events; equal dates and undated events retain source
  order. NR children retain their published round/day sequence, not a guessed new
  day allocation. Round numbers/identities and all sporting calculations are unchanged.
  A dated launch therefore appears in chronological context, not last merely because
  it has no championship round number.
- Sort dates prefer a valid explicit start date, then NR child dates where present,
  then a supported exact date/range in the supplied event text. Strict ISO validation
  rejects rolled-over days; invalid months/ranges and month-only text do not acquire
  invented day precision. Freeform supplied text is preserved and escaped.
- RS uses its own supplied dates first. Only an exact `nrEventId` match can supply
  missing parent date context, explicitly labelled **Related NR event dates**. This
  sorts the related event but does not assign an RS classification/scoring day or a
  scheduled-today claim to an RS round. Venue/surface/entry totals are not copied.
- Own URLs appear under **Event links**. Inherited URLs remain under **Related NR
  event links**, including **Official results**, so they cannot be mistaken for an
  RS classification. URLs are read dynamically from the NR event; changed/deleted
  supplementary-regs links propagate without code changes. No TRAC destination is
  embedded. Missing/broken relationships supply no links or dates.
- Combined mode still groups RS children under the explicitly matched NR parent,
  prefixes their round labels with RS and retains standalone/unmatched RS events.
  Only actual NR parents can satisfy that mapping, not a coincidentally named RS ID.

### Common presentation and sporting boundaries

Metadata, scope, event-entry and round-entry slots share wording and styles;
unavailable facts remain explicit. NR two-day entry coverage and known-zero totals
retain their existing meanings. RS source-row counts are not called entry totals.
One responsive row/grid policy uses existing competition theme tokens, with no RS
markup/CSS variant. At narrow widths the action moves below the row text; long
names/metadata can wrap without compressing the content into an unusable sliver.

Winner rows cover published, upcoming, launch and missing dates identically.
Source/classified positions and event-specific mappings determine candidates, never
championship points. Ambiguous ties remain unavailable. A final source classification
or accepted published RS finality review is required; pending technical checks take
precedence. NR provisional/unclear sheets previously displayed a leading crew as a
winner; the shared overview now withholds that unqualified claim, while the actual
classification remains reachable. This changes presentation, not NR ranks or scoring.
Class winners retain the established printed-class-position/overall-order fallback;
full driver/co-driver names replace NR's abbreviated class surnames. Launch winners
are source-event winners, explicitly non-scoring, not championship round awards.

Future NR rounds keep their existing pending-detail URLs. A future RS event without
a result ID has no invented result/graph URL: its row remains an honest unavailable
action. Unifying pending and published result-detail shells belongs to phase 5.
Info's non-calendar documents, introduction and other content remain for phase 6.
Home's existing latest-result selection is unchanged; this phase orders calendar
parents/overview rows, not scoring chronology or historical result lists.

### Verification and operational scope

Five additional focused tests compare exact NR/RS calendar and Rounds HTML for
equivalent adapter facts and exercise immutable source models, same/unknown/invalid/
month-only dates, absent and dynamic links, matched/unmatched/misleading IDs,
multi-day entry scope, launch, future results, mappings, ties and finality. The
91-test targeted command passes. The full public theme suite passes, including exact
event-card DOM and computed layout comparisons across four widths and both themes,
future/unknown dates, source/finality and two-day entry regressions. Navigation and
revised entry-policy browser suites pass with synthetic intercepted providers and no
writes. NR/RS Home, Rounds, Classification and Profile screenshots were captured
outside Git at 390/1440px; both Rounds views were visually inspected.

No phase 4 implementation, engine/scoring/schema/provider/data change, future league
configuration, commit, push or deployment is included. The still-unreleased coherent
batch retains `rs-visual-3` in all four shells. Restore its matching scripts/styles/
shells together; no database restore is required. Next is phase 4, shared standings,
only after this checkpoint has been reported. That checkpoint is historical; the
subsequently approved phase 4 implementation is recorded below.

## Completed locally: phase 4

The user approved only the next standings phase. One explicit, pure
`StandingsDisplay` adapter in `assets/public-model.js:402` supplies both public
competitions; `assets/public-components.js:189` and `:231` own the sole cumulative
table and complete standings-page markup. The adapter extends the Home row/scoring
contracts and reuses the established appearance, contribution and start-evidence
helpers. It never writes, recalculates sporting awards or repairs a missing snapshot.

### Surface inventory and migration boundary

| Surface | Phase 4 disposition |
|---|---|
| NR driver/co-driver overall and class-filtered standings | `viewStandings` (`assets/site.js:454`) delegates to the common adapter/page. All published NR classes are retained, including a used class-only class. |
| RS driver/co-driver overall, RS2, RS4 and legacy RS0 standings | `viewRsStandings` (`assets/site.js:501`) delegates to the same adapter/page. Revised entry-based seasons do not acquire a selectable championship RS0 class. |
| Year-qualified/yearless `/standings` and `/standings/codrivers` | Existing router, competition preference, explicit `competition` and legacy `leaders=rs` / `classes=rs` / `results=rs` selection continue to reach the common path (`assets/site.js:200`, `:331`). No new aliases or redirects were invented. |
| Legacy `/rallyesport` combined overview | All six cumulative slots (overall driver/co-driver plus RS2/RS4 by role) use `standingsTable`, through the wrapper at `assets/site.js:578` and overview at `:636`. Existing route, section order and source classifications remain. |
| Home leader/class tables | Already shared in phase 2; unchanged here. |
| Per-event scoring order and classification tables | Not cumulative standings. `rsEventScoringTable` (`assets/site.js:583`) and result-ID branches remain phase 5 work. |
| Crews and profile rank/points summaries | Not season standings pages. NR/RS Crews (`assets/site.js:1142`, `:1182`) and profiles (`:1232`, `:1302`) remain later-phase work. |
| Sources/Info rules explanations and admin preview tables | Explanatory scales/source tables and admin editing surfaces, not additional public cumulative standings. No migration in phase 4. |

### Common presentation and explicit decisions

- Both pages say **Drivers / Co-drivers**, **Pos**, **All classes**, **Points** and
  **Points breakdown**. The former "Overall + class split" control was misleading
  for RS's class-only points, so the common neutral label replaces it in both.
  Existing `pts=split` URLs retain their meaning.
- Both use the same introduction, role/class/display controls, visible scoring
  status/basis/qualification, keyboard-operable scoring disclosure, source notes,
  position/name/class/round/total/**Rounds started** fields and empty-state actions.
  A class-filtered view adds the same **Overall pos** and **Class pts** slots.
  Class badges remain visible in filtered views too. No column is secretly omitted
  just because a competition cannot establish its value.
- The position column is centered and compact in both. Position/name remain sticky;
  narrow screens place Total alongside the name and allow a focusable, horizontally
  scrollable table. Names/qualifiers wrap within the same bounds; column and row
  headers have scopes and the table has a descriptive caption. Existing league and
  RS2-blue/RS4-red theme tokens are unchanged.
- Role switching now retains both class and breakdown for NR, matching RS; neither
  switching roles nor changing points display recalculates scores or ordering.
  Active navigation uses native links and `aria-current`, not incomplete ARIA tabs.
- NR class views still filter the overall standings. Their Pos is the ordinal in
  that filtered order, **not an independent class championship rank**; Overall pos
  preserves the engine rank and Class pts sums existing recorded class awards.
  NR total, countback through all finishing positions/name, eligibility ordering,
  class-only awards, MSA credits and confirmation/source notes remain engine-owned.
- RS uses the exact selected published role/class table and ranks, including joint
  positions; no NR countback or extra overall award is applied. Four-round totals
  stay provisional. Blocked/unconfigured snapshots never recover points from
  source classifications. Unsupported season rules remain unavailable.
- Starts are role-specific championship starts across classes in both views, not
  class-only starts or entries. NR retains established credits; RS retains evidence
  checks, per-result deduplication and honest unknowns. A standings-only identity or
  an unresolved DNF does not become zero starts. Launch never supplies a championship
  column, total or start, while its source results/history remain reachable.
- Known zero, recorded DNF and missing contributions remain distinct. Ordinary cells
  show DNF for an established zero-point DNF, and breakdown shows its zero plus
  status/components. Missing/blocked contributions show an em dash, not zero.
  No result column or URL is invented for an unpublished future event.
- Empty standings are not evidence of no starts. Only an established absence of
  NR role credits uses the no-starts message; a class with source starts but no
  supported points says no points have been established. Missing results and
  unavailable scoring retain separate shared states.

### Verification and operational scope

Six additional focused contracts bring the targeted command to **97 passing tests**.
They compare exact authoritative NR/RS order/rank/points/components/links, filtered
NR totals, countback, eligibility, class-only awards, DNF/missing starts, actual
multi-class membership, shared RS ties, legacy RS0, four-round versus ready snapshots,
blocked/missing snapshots, starts without class points and immutable/public-only facts. Equivalent display facts
produce exact common HTML, with escaping and accessible field/header assertions.
The VM integration verifies that all six legacy cumulative tables use this component.

The full public browser suite passed. It compares equivalent NR/RS adapter rows and round fields
for exact common DOM, wording and computed typography/spacing/sticky/mobile policy
at 320/390/768/1440px in light/dark. It exercises real role/class/breakdown links,
back/reload, active navigation, keyboard table scrolling and qualifications. Sporting
data, class counts, text-dependent geometry and deliberately distinct colours are
not falsely required to match. Existing public page, empty/future season, source,
graph and classification checks remain active. Navigation and revised entry-policy
public/admin browser suites passed with intercepted synthetic providers and no writes.
NR/RS Standings screenshots at 390/1440px were inspected outside Git.

No phase 5 work, scoring/projection/schema/provider/data change, future league
configuration, commit, push or deployment is included. The coherent unreleased
phases 1-4 batch retains `rs-visual-3` in all four shells; restore matching modules,
styles and shells together. No data migration or database restore is required.
Existing tabs do not automatically upgrade. Live/private data was not inspected;
this is local synthetic verification, not a live-data certification.

## Completed locally: phase 5

The approved phase shares result presentation, not source interpretation or scoring.
`public-model.js` supplies explicit read-only result, row, role-award, navigation,
graph/metric and precision contracts. `public-components.js` owns the result shell,
classification, disclosures, graph controls/legend and selected/full stage tables.
`site.js` has one `viewResult` dispatcher and retains one SVG/head-to-head/mounted
interaction runtime. The duplicated headers, tabs, classifications and notes are
removed; no league-text replacements or `r.rs` rendering branches remain.

### Result-surface inventory

| Surface | Phase 5 disposition |
|---|---|
| NR `/round/:id` and graph/classification/stages suffixes | All dispatch through the shared result shell; an omitted suffix remains graph. A known unpublished calendar round gets an honest pending shell. |
| RS `/rallyesport/:id` and graph/classification/stages suffixes | All dispatch through the same shell/components; an omitted suffix remains graph. An unknown source-result ID remains not found. |
| Year-qualified, yearless and historical links | Existing router/context resolution remains unchanged. Generated tabs remain year/competition scoped and retain `cars` and `m` in both contexts. |
| Legacy no-ID `/rallyesport` overview | Its event-classification listing now uses the shared calendar. The six cumulative standings tables still use phase 4's shared table; scoring notices remain source-specific. |
| Combined/legacy `rs` graph query | Still cannot overlay or borrow another competition's stages/results. Source-scoped series keys remain distinct. |
| Home/calendar/standings/profile result links | Existing destinations continue through the shared dispatcher; no profile/directory renderer migration is included. |
| Admin source review, Crews, profiles, Sources/Info editorial content | Not migrated in this phase; phase 6 and provider workflows remain out of scope. |

### Presentation and factual decisions

- Both classifications have the same twelve fields, in the same order: Pos, No.,
  Crew, Class, Car, Stages, Penalty, Official total, Diff 1st, Diff prev, Class pos,
  Championship pts. Both use the same narrow-width cards and desktop table, with
  independent Driver/Co-driver values and an explicit official-finish fact.
  Unknown fields remain unavailable rather than being hidden or inferred.
- Both have the same navigation, tabs, source/award disclosures, accessible table
  regions, car/class controls, six neutral metric labels, legend, plot line style,
  comparisons and stage layout. Distinct theme/class colours remain unchanged.
  Tabs preserve car/metric choices in both contexts; previous/next intentionally
  retain the existing selection-reset policy.
- NR printed identities/classes remain separate from credited identities, scored
  classes and overall/class components, including class-only entrants and
  no-credit co-drivers. The engine is unchanged. RS printed class position remains
  a source fact, not an independent driver/co-driver scoring position. A shared
  award disclosure therefore distinguishes **Official position** from **Class
  scoring position** instead of inventing one universal championship rank.
- Source finality/technical holds remain distinct from accepted points. A ready
  award snapshot cannot relabel a provisional or technically qualified source as
  final. Launch retains timing/classification/statistics but no championship
  awards or scoring-review requirement. Upcoming results/winners are not invented.
- Each graph retains its own engine-derived stage axis, source mappings,
  discontinuities and metric availability. RS running class metrics still use the
  existing engine's event-specific mapping; final class position remains printed
  source evidence. No NR stage axis or classification is assigned to RS.
- Stage durations now use the same clock layout with explicit precision, including
  RS hundredths. Printed RS final-total/penalty strings remain exact. Known zero
  penalties remain zero; missing totals never become arithmetic zero or a claimed
  winner. Diff prev is unavailable when the immediately preceding classified row
  lacks a total; a known leader gap remains independently available.
- A source stage named Final is not confused with the classification endpoint in
  tables, comparisons or tooltips. The endpoint label does not certify finality.
  Published positions survive missing stage times; no missing position is inferred.
- Own source links and explicitly related NR event links remain separate, dynamic
  and clearly labelled. Related NR dates do not assign an RS scoring day.
  Inherited SRS links remain data-driven; there is no hardcoded TRAC destination.
  Public adapters whitelist relevant source facts and omit private upload/review
  commentary. Old `rs-*` result classes are only compatibility aliases on shared
  markup in both contexts; neutral result selectors own presentation.

### Verification and boundary

107 targeted synthetic tests pass, including nine result contracts plus the VM
comparison regression, unchanged scoring/entry/privacy suites, all six legacy
standings slots, exact equivalent-field structure and every engine graph metric.
The full public browser suite passes at 320/390/768/1440px in both themes with
NR/RS DOM/computed-layout comparisons, table focus, keyboard controls, tab/query
retention, filtering, legend highlighting, tooltips, launch, future/undated/mapped/
unmapped/source-qualified/empty/sparse results and hundredths. Navigation,
entry-policy public/admin and AI-import browser suites also pass with intercepted
synthetic providers. Presentation capture checks pass without page errors,
unexpected requests or viewport overflow; representative classification, graph and
stage screenshots in both contexts/themes at 390/1440px were visually inspected
outside Git. The complete static diff and changed/untracked scope were reviewed.

No phase 6, engine/projection/schema/data/provider/analytics/guide/theme-token change,
commit, push or deployment is included. The matching unreleased `rs-visual-3`
modules/styles/four shells remain one static batch; no data migration or database
restore is required. Live/private data was not read or certified. No implementation
blocker remains; phase 6 and release each require a separate instruction.

## Completed locally: phase 6

The final approved phase replaces the remaining normal NR/RS Crews, profile,
Sources and Info page bodies with pure `directory`, `profile`, `sources` and
`information` contracts in `assets/public-model.js` and one corresponding component
family in `assets/public-components.js`. `site.js` retains thin route aliases plus
the shared photo/social, search and SVG mounting runtime. No larger plugin system,
new league data, sporting computation or provider workflow was introduced.

### Common fields and semantic decisions

- Crews has the same nine fields in both contexts: Competitor, Role, Class / status,
  Driver standings, Co-driver standings, Starts, Events / championship rounds,
  Events entered (documented), Car(s). Names/car-number search, qualifiers, scoped
  headers, focusable table region and mobile cards use the same markup/CSS.
  Responsive search explicitly respects hidden rows; grid display cannot override it.
- Classes are unique source/scoring identities, not repeated badges for each role.
  Actual multi-class participation remains visible. An RS0 scoring qualification
  does not replace a source class or declare non-membership. Unresolved RS source
  names remain separate role/car records without guessed identity links.
- Directory events are distinct event IDs. Championship rounds are distinct NR
  round IDs or RS championship event IDs, excluding launch. NR two-day events
  therefore remain one event and two rounds. Documented entries are separate;
  absent NR coverage and unavailable RS entry registers show unavailable, not zero
  or a copied NR entry count.
- Profiles share the same header, eight KPI slots, season/role summaries, points
  charts, explicit entry evidence and twelve-field participation history. The slots
  are Starts, Event appearances, Championship appearances, Finishes, Best result,
  Recorded 1st places, Podiums and Recorded stage wins. Appearance totals count
  role/car records, explicitly not unique starts. Recorded positions are not a
  claim that a provisional source certifies a winner.
- NR finish statistics retain credited records; RS finish statistics retain source
  roles, including launch. Starts sum championship role-round evidence, not entries
  or appearance rows: NR engine credits/MSA-only starts and RS classified/evidenced
  DNF, deduplication, DNS and unknown-DNF rules remain intact. Missing timing cannot
  establish stage wins. Blocked snapshots cannot leak stale points into history or
  charts. Class-only RS charts do not invent an overall award.
- NR history retains printed role, separate credited role and explicit differing-
  credit notes. MSA-only starts stay labelled without a graph for an absent car.
  Histories follow published event/round order inside each explicit loaded season;
  profiles no longer temporarily change global season context. Canonical identities,
  archived/yearless routes, photos and social links remain supported; generated
  identity links now consistently retain their year and competition.
- Sources shares one source table, classification/finality badges, source disclosures,
  entry evidence, rules/points/graph explanations, classes and notes. NR confirmation
  text and MSA edition/source, site-calculated pending points, independent RS rules,
  technical holds and non-scoring qualifications stay their own facts. Private upload
  commentary and the other competition's notes are not used as fallback prose.
- Info shares documents, calendar and site-reference structure. NR documents come
  from the NR season; RS documents come only from the published RS ruleset metadata
  whitelist (title/source URL/issue date/version), retained during the existing load.
  No new network read or data-model field is needed. Supplied non-ISO/invalid document
  dates remain supplied text rather than silently rolling into another date.
  Global editorial copy, channels/contacts and documents are explicitly labelled
  Northern Regions site context, not RS regulations or verified representatives.
  Getting Started's edition, database-independent path and exact CTA stay unchanged.

### Whole-site audit and intentional boundaries

| Surface | Final disposition |
|---|---|
| Home / leader and class cards | Shared phase 2 components, data qualifications and field slots. |
| Calendar / event / round / winners, including Info events | Shared phase 3 contracts and components; explicit source-owned related links, ordering and unavailable states. |
| Standings and all six legacy RS cumulative tables | Shared phase 4 page/table; independent engine ranks, rules and award components remain data. |
| Result shell / classifications / graph controls / stages / historical aliases | Shared phase 5 contracts/components and one SVG/head-to-head interaction runtime; independent source axes and precision remain data. |
| Crews / cross-season profiles / Sources / Info | Shared phase 6 components above; no parallel current page HTML generators remain. |
| Getting Started / shell / navigation / photo-social loading / errors | Already common; preserved, including guide edition/CTA and competition colours. Static disclaimer/privacy pages remain shared, not league variants. |
| Historical `/rallyesport` without a result ID | Intentionally retains its aggregate landing, section ordering and RS-only explanatory disclosure for old links. Its six tables and event listing already use shared components. There is no NR counterpart to merge or new parallel renderer for a future league. Optional retirement of that compatibility composition is deferred; no redirect/deprecation was authorized. |
| Admin editing / logic catalogue / provider workflows | Intentionally outside this public-display migration. Distinct operational tasks are not competing public layouts. No engine, projector or public schema change. |

Future league support needs a verified sporting model plus explicit adapters into
these contracts and equivalent-fact regression cases, not another page family.
Unsupported rules or absent evidence must remain unavailable; reusing the display
does not authorize copying NR or RS rules, entrants, calendars or guide editions.

### Verification and completion boundary

Seven new focused contracts bring the targeted command in [testing.md](testing.md)
to **114/114 passing tests**. They cover immutable role/start/entry/source facts,
multi-day NR rounds, real multi-class badges, unresolved RS names, printed and
credited roles, MSA-only starts, entry-only/cross-season history, unproven DNF,
blocked awards, document ownership, pending/confirmed MSA qualifications and private
commentary exclusion. Equivalent directory/history facts produce exact common HTML.
Existing engine, RS policy, scoring, entry/privacy/guide and archived regressions pass.

The full public responsive/theme suite passes. It compares actual Crews, profiles,
Sources and Info common fields/headers and computed typography/spacing/layout at
320/390/768/1440px in both themes, excluding deliberately distinct colours and
data-dependent content geometry. It exercises no-match/name search at narrow widths,
focusable regions, identities/escaping, archives, source status, own document links,
legacy missing coverage and the unchanged guide CTA. Navigation, revised entry-policy
public/admin and AI-import browser suites also pass on the final runtime. Eighty
synthetic captures across twenty routes, two widths and both themes were checked;
representative new views were inspected outside Git. No unexpected requests, page
errors or viewport overflow were accepted. This is not a full WCAG/live-data audit.

The full changed/untracked scope and static/test/doc diff were reviewed. Engine,
projector, schema/public data, providers, analytics, guide and theme tokens are
unchanged. No provider/Firebase access, data write, commit, push or deployment
occurred. All six approved consolidation phases are complete and released, with no
implementation blocker. Keep the coherent `rs-visual-3` modules/styles/four shells
together in the deployed baseline; no data migration or database restore is needed.
The approved compact-display follow-up below coordinates a new `rs-visual-4` token
across all four shells. No later consolidation phase has been started.

## Compact public display follow-up (separate user approval)

The user requested a quieter eligibility cue, a denser Crews list and concise points
in the shared classification:

- Standings and Crews put a subtle accessible `*` after a competitor's name only when
  at least one role is actually ineligible. One explanatory footnote appears at the
  bottom only when such a row exists. Unknown, provisional or merely absent evidence
  is not relabelled eligible or ineligible; NR retains its minimum-start explanation,
  and RS0 retains the SSR 6.1/non-membership caveat.
- Crews has one role-aware **Standings** cell and one **Starts** cell. Distinct,
  established championship rounds count once across roles and cars. DNS does not
  count; RS DNF requires start evidence; unknown DNF/status/identity coverage remains
  `—`, not a fabricated zero. Entry counts stay in the model and historical details,
  but are removed from the Crews presentation.
- Classifications show equal driver/co-driver points once only when both values are
  known numeric awards with no role-specific qualification. The accessible label
  states that both roles earned that amount. Unequal, missing, blocked, non-scoring
  and role-specific awards remain separate; zero remains a real value.
- Home driver, co-driver and class leader cards use the same compact eligibility
  treatment: no repeated “Eligible”/minimum-start labels, a subtle name-adjacent
  marker only for explicit ineligibility, and one conditional footnote after the
  complete leader area. NR under-minimum states retain their exact reason. Missing
  RS eligibility is not converted into either an eligible claim or an ineligible mark;
  section-level provisional status remains unchanged.

This is presentation-only: no engine/scoring, public data, schema, provider, Firebase,
or theme change. The four HTML shells coordinate `rs-visual-5`. No data migration is
required; static rollback is to the preceding deployed `rs-visual-4` release and
existing open tabs need a reload. Synthetic coverage includes multi-role/multi-car
round deduplication, DNS-only unknown starts, eligibility footnote presence/absence,
equal/unequal/zero/missing/non-scoring points, tied Home leaders, unknown RS
eligibility, both themes, and 320/390/768/1440px. The full test command and
release/deployment state are recorded in [testing.md](testing.md) and
[releases.md](releases.md).
