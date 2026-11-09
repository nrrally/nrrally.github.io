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
configured. These SSRs are confirmed by the user for the 2026 club classifications
at Legends, Ermelo and TRAC, and for the independent June Round 1 classification despite
the July issue date. That confirmation is specific to those events; the rule profile is
not a default for other events or future years.

The implementation applies the documented scoring scope conservatively:

- The event must be explicitly confirmed for the selected SSRs and as a championship
  round; double-points status must be explicit, with bulletin evidence when enabled.
- SSR 7.3's minimum is 15 starters total at the event, not per competitor or class.
- Invitational entries do not score, but remain in the official classification.
  Their exclusion is distinct from the user-directed per-person “Non-Scoring RS Member”
  toggle. Absent that season-scoped toggle, everyone is assumed paid up for RS scoring;
  that assumption is not verified. Each role's eligible finishing order is recalculated
  independently, so a toggled driver/co-driver does not suppress their partner's points.
- Points and standings require a source classification explicitly marked final. Any DNF
  blocks that event's points because SSR 7.4's finisher provision is blank. DNS is not
  treated as a starter. Official rows remain published unchanged.
- Official `TEST` rows are retained as `TEST`; they are not rewritten as DNS or DNF.
  Their scoring/starter treatment is not configured, so an event containing one remains
  blocked for points. Stage observations are recorded independently: a later-stage time
  after an earlier missing value remains visible in the source row and is never filled or
  treated as a gapless prefix.
- Class points use the printed class position when present, otherwise the official overall
  position to order entries within that class. A shared overall position across different
  classes is not an unresolved within-class tie. If a class scoring position is still tied,
  points are withheld; the app does not recompute the SSR 7.5 stage-time tie-break. Source
  overall/class positions remain unchanged.
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
  notice interval. Season totals remain unavailable until the round-count requirement
  and all scored event rows are supported.

SSR 6.1(a)/(b) eligibility wording has been clarified by the user for implementation:
assume paid-up status, provide the independent person toggle, and defer actual
membership verification. The toggle is not evidence that a person paid dues. Event
invitation exclusion remains a separate input. The unspecified non-scoring class is not
configured; an unknown category blocks publication rather than being dropped or ranked.

No class-minimum-start rule, DNF finisher definition, championship tie-break, future
year rules or non-scoring-class semantics are inferred. SSR 7.4 and 7.6 are blank.
When those clauses or application to another competition/year matter, obtain written
rule clarification before enabling the affected calculation. A scoreboard explains
unconfigured/blocked scoring while preserving official result tables.

### RS graph overlay and source reuse

The NR graph remains unchanged and RS overlays are off by default. When explicitly
enabled, dashed RS series use only the selected RS classification's times, official
final RS position/status/total, and its explicit `nrStage` mapping to place observations
on the NR x-axis. Intermediate stage ranks/gaps are RS time comparisons, not official
NR calculations. The overlay does not infer a person or result match from car number,
change NR series, or add RS to NR statistics.

For shared physical stages, the admin offers a human-confirmed, one-time copy of RS
stage-time values from an explicitly linked NR round, requiring the exact stage mapping
and matching car plus reviewed stable crew identities. The copied strings and provenance
are stored in RS; later NR corrections/status changes do not propagate. Only time values
are copied—never NR DNF/DNS status, class, order, penalty or points. RS-only stages remain
manually/source entered. This minimizes duplicate time entry without creating live
cross-competition coupling.

## AI Import capabilities and limits

The versioned capability profile in `assets/ai-import.js` describes the algorithms above, not all possible future championship rules. Point scales, class IDs/descriptions, class-only exclusions, minimum starts and calendars are configurable. An empty overall scale can express class-only scoring. Co-driver class maps affect the displayed class, not separate co-driver points.

All-round/unweighted aggregation, overall-plus-class totals, equal crew credit, eligibility-first ordering, DNF/DNS handling, scored-class precedence and countback are fixed policies. Best-N/dropped or weighted rounds, stage/bonus points, per-class scales, membership filters, independent co-driver scoring, different tie-breaks and DSQ/NC/restart semantics are unsupported. Missing or incompatible rule declarations block imports; there is no AI-generated-code execution or silent fallback.

AI-imported regulations require cited clauses and explicit human review. This cannot detect a regulation that both AI and reviewer overlook. New results clear that round's MSA confirmation; reviewed scoring/calendar amendments clear season confirmations. AI cannot declare points officially confirmed.

Season/dataset checks are shared by admin publishing and the Node validator: finite non-negative scales, minimum starts, unique identifiers, season/calendar relationships, resolved class membership and unambiguous profile names. The publish path reruns them after a concurrent-edit rebase.
