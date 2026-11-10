# Scoring and calculation rules

These rules are implemented in `assets/engine.js` (`buildSeason`). The values they use — points scales, classes and minimum starts — come from each season's `season.json`.

The 2026 settings follow the 2026 MSA Northern Regions Regional Rally SSRs (Version 2, 9 July 2026). Calculated points for rounds 1–5 match MSA's published Northern Regions points (15 September 2026) exactly, for every driver and co-driver that document lists.

## Each round

1. **Results come from the official classification.** Each entry is classified (with a position and total), DNF or DNS.
2. **Scored class.** The first of these that applies is used:
   1. the row's `scoredClass` override;
   2. the season class of the credited driver (`season.classMap.drivers`);
   3. the class printed on the sheet.
3. **Overall points.** Classified crews are taken in official finishing order. Crews in class-only classes (e.g. NR0) are skipped. The n-th scoring crew gets `pointsScale.overall[n-1]`; beyond the end of the scale it gets 0.
4. **Class points.** Within each scored class, again in official finishing order, the n-th crew gets `pointsScale.cls[n-1]`.
5. **Round points** = overall + class. A DNF scores 0 but counts as a start. A DNS is not a start.
6. **Credit.** Points go to the printed driver and co-driver, unless the row has a `credit` override:
   - `credit.driver` or `credit.codriver` replaces the printed name.
   - `credit.noCodriver` means no co-driver start is counted.
7. **Extra starts** (`extraStarts`) count as a start with 0 points.

## Standings

Driver and co-driver standings are kept separately. Both crew members score the same points from a result.

- **Total** is the sum of round points. **Starts** is the number of rounds with a result (DNF counts, DNS doesn't).
- **Eligible** means starts ≥ `minStarts`. Eligible crews are listed first, then ineligible ones, marked `*`.
- **Order:** higher total first. Ties are broken on countback: more 1st places, then more 2nd places, and so on, using overall finishing positions. Any tie left after that is sorted by name.
  Countback considers all represented finishing positions, including positions beyond 30.
- **Displayed class:** the person's season class (`classMap.drivers` or `classMap.codrivers`) if set; otherwise the class from their most recent round.

## Stage graphs

- **Cumulative time.** For each car, stage times are added up stage by stage. It stops at the car's first missing time, which is usually a retirement.
- **Position after stage k:** 1 + the number of cars with a lower cumulative time among all cars that have a time after stage k.
  - Class position is worked out the same way within the scored class.
  - Gap = cumulative time − the leader's cumulative time. Class gap is measured against the class leader.
- **The "Final" point is the official classification:**
  - official total (penalties included), official position and class position;
  - classified cars only.
  - Penalties are only printed as totals, so they show up only at Final.
- **Time lost** on a stage = the car's stage time − the fastest Northern Regions time on that stage.
- **Stage result** is the stage position printed on the sheet.

## Checks (`validateRound`)

**Errors** block publishing in the admin and fail `tools/validate.js`:
- missing car number, driver or class;
- the same car twice, or the same position twice;
- a classified crew without a position or total;
- a time not in `m:ss.s` form;
- an invalid status;
- stage times + penalty not equal to the total. This check is skipped when `skipSumCheck` is set.

**Warnings** are shown but don't block publishing:
- missing co-driver;
- a classified crew with empty stage times, so its total can't be checked;
- positions not consecutive;
- a slower total placed ahead of a faster one;
- "stages completed" not matching the number of times filled in.

**Notes:** names not yet in `people.json`. These are added automatically when you publish.

## Confirmed against the official standings

`season.msa.confirmedRounds` lists the rounds whose points have been checked against the published MSA standings. The site marks those rounds "Points match MSA". All other rounds show "Points calculated" and are treated as provisional.

## RallyeSport (separate ruleset and records)

RallyeSport scoring is implemented in separate `buildRallyeSport` /
`calculateRallyeSportScoring` functions and reads only `season.rallyesport` plus
reviewed shared person identities. No NR points scale, minimum starts, status,
class, penalties, event/round assignment, standings or totals enter RS calculations.
RS event tables preserve the official order/status even when scoring is blocked.

The only supported profile is the actual **2026 MSA RallyeSport Association Club
Standing Supplementary Regulations — Rallysprint, Version 1, issued 9 July 2026**,
available from [Motorsport South Africa](https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf).
The document's printed heading and SSR 1.2 identify the Rallysprint rules and limit
them to the 2026 calendar year; embedded PDF metadata is not the scope evidence.
SSR 6.1.1–6.1.3 supports class points of 15, 12, 10, 8, 7, 6, 5, 4, 3, 2, then
1 from 11th onward. Those class points are also used for the overall Clubman’s
Challenge; this is **not** NR overall-plus-class scoring. Only RS2 and RS4 are
configured. The user confirmed the SSRs for the privately reviewed 2026 classification set,
including a pre-issue independent event. That confirmation is event-specific; keep its
source records in the private review archive. The rule profile is not a default for
other events or future years.

The implementation applies the documented scoring scope conservatively:

- The event must be explicitly confirmed for the selected SSRs and as a championship
  round; double-points status must be explicit, with bulletin evidence when enabled.
- SSR 7.3 in the published 2026 SSR V1 states a 15-starter event minimum, not a
  per-competitor or per-class minimum. The user has separately reported a revised
  2026 RallyeSport minimum of six; no written amendment or bulletin has been supplied.
  The working season can record this as `starterMinimumReview` with explicit review and
  required evidence.
  When absent, the printed 15 remains the baseline; when present, only the explicit
  evidence-backed value six is supported. Unreviewed, malformed or evidence-free review data blocks
  scoring rather than silently reverting to either value. This is a 2026 RS-only user
  review, not a claim that the published SSR text has changed, and it is not inherited
  by another year.
- The applied minimum is for total starters at the event, not per competitor or class.
  Started DNF rows earn no points but count as starters only when start evidence exists.
  A no-time DNF is not proof of a start. The user-confirmed 2026 threshold counts all
  source-evidenced starters, including TEST and invitational/RS0 entries; DNS does not
  count. A TEST or DNF needs actual start evidence to count. A reviewed `starterCount`
  and evidence may establish a total only when it is consistent with known source-backed
  starters. No TEST ambiguity is used to infer a start.
- A private, reviewed `membershipReview` is required before 2026 RS scoring. It is
  season-scoped and keyed by stable profile ID after any per-entry `identityReview`.
  Eligibility requires a matching complete profile with both licence and membership
  reference evidence; account Active/Inactive/Invite Pending labels do not change it.
  A qualifying complete match takes precedence over an incomplete duplicate. User-
  confirmed eligibility corrections require their own private provenance and are not
  represented as workbook corrections. No licence/member identifiers, workbook rows,
  aliases or workbook contents are stored in the repository or public projection.
  Unmatched/ambiguous people remain unverified; missing licence, missing membership
  reference and incomplete profile are distinct statuses, not assertions of
  non-membership. Invalid, absent or unreviewed 2026 membership data fails closed, and
  the map never configures another year.
- Driver and co-driver eligibility is applied independently. Eligible members are
  ranked and receive points in their own class order with excluded roles removed;
  partners retain their independent scoring position. Ineligible, unverified, manual-
  exclusion, invitation and TEST roles receive zero championship points when a source
  result exists, have no scoring rank, and appear after ranked people as RS0. Existing
  manual exclusions remain separate from membership status. Original source class,
  position, time and finish order stay unchanged. Public RS0 markers and explanations
  distinguish confirmed non-membership from missing/unverified evidence.
- Event points require either a source classification explicitly marked final or an
  evidence-backed, private `finalityReview` explicitly accepting the supplied source
  classification for scoring. A user-confirmed scoring decision does not rewrite the
  source heading, status, footer or notes and does not establish that technical checks
  were independently completed; UI summaries distinguish this basis and retain source
  qualifications. A source-evidenced started DNF is published with zero event points
  and counts as a starter under the user's explicit 2026 clarification. A DNF with no
  row-level start evidence has unavailable (`null`) points, even when a separate event
  count establishes the minimum; DNS remains unavailable and TEST/invitation rows remain
  non-scoring. Official rows remain published unchanged. SSR 7.4's finisher wording is blank, so no additional finisher
  rule or awards logic is inferred.
- Official `TEST` rows and their printed order/status remain in event results, are
  excluded from championship points and appear at the bottom as RS0 Invitational, as
  SSR 6.1(a) specifies. Source-evidenced TEST starters do count toward the user-confirmed
  six-starter threshold but receive no points. Stage observations are recorded independently: a later-stage time after
  an earlier missing value remains visible in the source row and is never filled or
  treated as a gapless prefix.
- Class points use the printed class position when present, otherwise the official overall
  position for every entry in that class if any class position is missing. This avoids
  comparing unlike position fields. A shared overall position across different classes is
  not an unresolved within-class tie. Contradictory or still-tied scoring order blocks
  points; the app does not recompute the SSR 7.5 stage-time tie-break. Source positions
  remain unchanged.
- SSR 7.5 is headed championship ties, but its wording addresses a round and specifies
  quickest stage time, then counts of second-fastest stage times and so on. This app does
  not recompute that official tie-break; a still-tied scoring position is withheld for
  review. Equal season totals share the same displayed rank, with no season-level
  tie-break or winner claimed.
- SSR 7.2 requires at least six and no more than eight rounds, or five with exactly one
  double-points event announced by bulletin 14 days beforehand. The implementation
  applies double points only in that explicit five-round case; a double-points
  declaration with any other round count blocks that event and the season pending
  clarification. For the five-round exception, both the event start date and bulletin
  issue date are required as real ISO calendar dates, and the engine checks the 14-day
  notice interval. The current five-round season has no supplied bulletin; the engine
  does not select a double-points event. If otherwise-supported completed events have
  points while another event or season rule is unresolved, clearly labelled provisional
  cumulative tables are available with excluded rounds and their reasons. Final
  championship eligibility and a final champion remain gated. R1-R4 can each earn event
  points when their own evidence is confirmed, but four scoring rounds do not satisfy
  SSR 7.2's season round-count rule; cumulative totals remain provisional.

SSR 6.1(a)/(b) eligibility is implemented with the reviewed 2026 person-ID map described
above, not an assumption of paid-up status. The independent manual exclusion remains a
separate override, and invitation exclusion is not treated as a membership decision.
The unspecified non-scoring source class is not configured. A non-standard printed
category blocks its scoring unless an explicit, classification-scoped mapping to RS2/RS4
is recorded with evidence; the printed category remains in event results, mappings are
not inferred or reused across events, and TEST is never mapped into championship scoring.

No class-minimum-start rule, DNF finisher definition, championship tie-break, future
year rules or non-scoring-class semantics are inferred. SSR 7.4 and 7.6 are blank.
When those clauses or application to another competition/year matter, obtain written
rule clarification before enabling the affected calculation. A scoreboard explains
unconfigured/blocked scoring while preserving official result tables.

### RS graph presentation and source reuse

The NR graph calculations remain unchanged. Public graphs never combine NR and RS
series: the site-wide control selects one competition, with independent RS event/stage
axes, including standalone events. The shared UI provides the same six metrics,
car/class filters, tooltips, legend highlighting, stage table and head-to-head.
RS uses only its selected classification's times and official final position/status/total.
RS per-stage positions and gaps are compared within RS; NR positions and gaps within NR.
Each valid later RS stage observation is retained for per-stage metrics when an earlier
stage is missing; cumulative values remain discontinuous. RS graph parsing preserves
source precision, including hundredths, for ranking, differences and labels; NR parsing
and calculations retain existing precision. Missing printed stage positions are not
recomputed from times. Graph presentation never infers person/result matches from car
numbers, changes NR series or adds RS to NR statistics. The pure helper's explicit-stage
mapping remains supported internally, but no public overlay control remains.

On the homepage the NR overall/class leader panels and NR round cards remain the
default. One header NR/RS control switches every public competition-specific view,
including all three home sections, keyboard use and browser history.
Partial legacy RS deep links also activate site-wide RS. The homepage uses a short
provisional-points label; detailed RS views retain scoring qualifications and blocked
round disclosures. Calendars show only the selected competition. An NR + RS event badge
on an RS card requires an explicit `nrEventId`; it does not include NR results. Event
names, dates or array order never establish an association. RS round numbers remain
independent. These are display changes only; scoring policy and classifications are unchanged.

For shared physical stages, the admin offers a human-confirmed, one-time copy of RS
stage-time values from an explicitly linked NR round, requiring the exact stage mapping
and matching car plus reviewed stable crew identities. The copied strings and provenance
are stored in RS; later NR corrections/status changes do not propagate. Only time values
are copied—never NR DNF/DNS status, class, order, penalty or points. RS-only stages remain
manually/source entered. The review preview copies only into blank RS time cells, flags
different existing values for human review, and preserves missing/unmatched RS-only crews.
The user must confirm before applying; on cancellation or error no RS data is changed.
This minimizes duplicate time entry without creating live cross-competition coupling.

## AI Import capabilities and limits

The versioned capability profile in `assets/ai-import.js` describes the algorithms above, not all possible future championship rules. Point scales, class IDs/descriptions, class-only exclusions, minimum starts and calendars are configurable. An empty overall scale can express class-only scoring. Co-driver class maps affect the displayed class, not separate co-driver points.

All-round/unweighted aggregation, overall-plus-class totals, equal crew credit, eligibility-first ordering, DNF/DNS handling, scored-class precedence and countback are fixed policies. Best-N/dropped or weighted rounds, stage/bonus points, per-class scales, membership filters, independent co-driver scoring, different tie-breaks and DSQ/NC/restart semantics are unsupported. Missing or incompatible rule declarations block imports; there is no AI-generated-code execution or silent fallback.

AI-imported regulations require cited clauses and explicit human review. This cannot detect a regulation that both AI and reviewer overlook. New results clear that round's MSA confirmation; reviewed scoring/calendar amendments clear season confirmations. AI cannot declare points officially confirmed.

Season/dataset checks are shared by admin publishing and the Node validator: finite non-negative scales, minimum starts, unique identifiers, season/calendar relationships, resolved class membership and unambiguous profile names. The publish path reruns them after a concurrent-edit rebase.
