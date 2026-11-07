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

## AI Import capabilities and limits

The versioned capability profile in `assets/ai-import.js` describes the algorithms above, not all possible future championship rules. Point scales, class IDs/descriptions, class-only exclusions, minimum starts and calendars are configurable. An empty overall scale can express class-only scoring. Co-driver class maps affect the displayed class, not separate co-driver points.

All-round/unweighted aggregation, overall-plus-class totals, equal crew credit, eligibility-first ordering, DNF/DNS handling, scored-class precedence and countback are fixed policies. Best-N/dropped or weighted rounds, stage/bonus points, per-class scales, membership filters, independent co-driver scoring, different tie-breaks and DSQ/NC/restart semantics are unsupported. Missing or incompatible rule declarations block imports; there is no AI-generated-code execution or silent fallback.

AI-imported regulations require cited clauses and explicit human review. This cannot detect a regulation that both AI and reviewer overlook. New results clear that round's MSA confirmation; reviewed scoring/calendar amendments clear season confirmations. AI cannot declare points officially confirmed.

Season/dataset checks are shared by admin publishing and the Node validator: finite non-negative scales, minimum starts, unique identifiers, season/calendar relationships, resolved class membership and unambiguous profile names. The publish path reruns them after a concurrent-edit rebase.
