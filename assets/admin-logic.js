/* Read-only explanation catalogue. It never evaluates competitors or configures rules.
   Evidence is pinned to the audited runtime; review this catalogue when policy changes. */
(function (root) {
  'use strict';
  if (typeof window !== 'undefined') {
    (() => {
      const param = new URLSearchParams(window.location.search).get("scoutTheme");
      const theme =
        param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    })();
  }
  function source(path, start, end, symbol) { return { path: path, start: start, end: end, symbol: symbol }; }
  function node(question, branches, evidence) { return { question: question, branches: branches, evidence: evidence }; }
  function branch(when, outcome, next) { return { when: when, outcome: outcome, next: next || '' }; }
  function topic(id, group, title, intro, inputs, nodes, related) {
    return { id: id, group: group, title: title, intro: intro, inputs: inputs, nodes: nodes, related: related || [] };
  }
  var topics = [
    topic('nr-intake', 'nr', 'From source document to NR result',
      'An entry list is not a classification. The site stores printed evidence and applies explicit exceptions separately; it never consumes live timing.',
      'Official PDF text or spreadsheet; round/calendar IDs; printed stage labels, rows, status, totals and notes.', [
        node('Which intake path is being used?', [
          branch('Known PDF layout', 'The deterministic parser recognises the NRC/RallyScoring layouts. Unknown layouts are refused, not guessed.'),
          branch('Scan or another layout', 'Use the spreadsheet template or manual editor. A copied retired-crew row still needs column-by-column checking; text can lose skipped-stage alignment.'),
          branch('Optional AI preparation', 'An admin transfers documents to their chosen service, then reviews strict JSON locally. No automatic document upload, model execution or publication.', 'shared-ai')
        ], [source('assets/engine.js', 1425, 1530, 'parseClassificationText'), source('assets/engine.js', 1567, 1621, 'spreadsheetTemplate / parseSpreadsheet')]),
        node('Do the saved rows pass validation?', [
          branch('Error', 'Missing stages/car/driver/class, duplicate cars/positions, invalid status/time, or a classified row without position/total blocks publication.'),
          branch('Complete times and no skipSumCheck', 'Stage sum plus penalty must match the printed total to the tenth (difference greater than 0.05 is an error).'),
          branch('Missing times or warning', 'Missing co-driver, gaps in positions, a faster total behind a slower one, stage-count mismatch and unchecked totals are warnings, not publication errors. They still require review.'),
          branch('Printed total itself differs', 'An explicit skipSumCheck preserves that total; the operating procedure requires a reason in row notes. This is not a recalculation of the official sheet.')
        ], [source('assets/engine.js', 1237, 1296, 'validateRound'), source('docs/data-entry-guide.md', 122, 171, 'Step by step / Judgement calls')]),
        node('Will a row be visible on the public site?', [
          branch('Working draft only', 'Not yet. Only rounds marked as having results are included when the public bundle is rebuilt.', 'shared-publish'),
          branch('Published', 'NR uses the published raw records to calculate its model in the visitor browser. There is no bundled-results fallback.', 'nr-points')
        ], [source('assets/admin.js', 437, 449, 'publicDocs'), source('assets/site.js', 155, 171, 'loadSeason')])
      ], ['nr-credit', 'nr-finality', 'shared-ai']),
    topic('nr-credit', 'nr', 'Which person and class receive the points?',
      'Printed crew appearances and championship credit are deliberately different records. This is a key place to look when a co-driver report appears unexpected.',
      'Printed names/class; stable people/aliases; row credit, scoredClass and notes; season driver/co-driver class maps.', [
        node('Who receives championship credit?', [
          branch('No credit override', 'Resolve the printed driver/co-driver to shared profiles. Both receive the same result points.'),
          branch('credit.driver / credit.codriver', 'Use the explicitly credited person in that role instead. The printed crew still appears in the source result and profile history.'),
          branch('credit.noCodriver', 'Do not count a co-driver start or points for this result. This does not erase the printed co-driver.')
        ], [source('assets/engine.js', 151, 178, 'computeRound credit'), source('assets/engine.js', 245, 266, 'standings'), source('assets/engine.js', 297, 324, 'profile appearances')]),
        node('Which class is used for scoring?', [
          branch('Row scoredClass exists', 'Use that normalized class first.'),
          branch('Otherwise credited driver has season class', 'Use season.classMap.drivers for the credited driver.'),
          branch('Otherwise', 'Use the normalized printed class. The co-driver season class map does NOT independently change this result\'s points.')
        ], [source('assets/engine.js', 137, 178, 'buildSeason / computeRound')]),
        node('Which class is displayed in season standings?', [
          branch('Role-specific season map exists', 'Display that person\'s driver or co-driver season class.'),
          branch('No role map', 'Use their latest represented round class in calendar order. Class filtering is explained under ranking.', 'nr-ranking')
        ], [source('assets/engine.js', 267, 281, 'standings displayed class')]),
        node('What explains an exception to the printed sheet?', [
          branch('Recorded override', 'Credit reasons, class differences and row notes are collected into public data notes. The procedure follows reviewed MSA standings discrepancies, not a guessed correction.'),
          branch('No evidence', 'Do not infer a swap from names, car number or a low report position. Inspect the stored override and its source first.')
        ], [source('docs/data-entry-guide.md', 154, 171, 'Judgement calls'), source('assets/site.js', 1737, 1745, 'viewAbout data notes')])
      ], ['nr-points', 'nr-starts', 'nr-profiles']),
    topic('nr-points', 'nr', 'NR event points: overall plus class',
      'NR does not apply the RS membership filter. But "if you enter, you score" is not literally the implemented rule: entries alone earn no points, DNS has none, and DNF is zero.',
      'Recorded classification status and official position; scored class; season overall/cls scales and classOnly flags.', [
        node('What is the result status?', [
          branch('classified', 'Sort classified crews by official overall position, then allocate overall and class points. Do not rank from total times.'),
          branch('DNF', 'Overall 0 + class 0 = total 0, with a start.', 'nr-starts'),
          branch('DNS', 'Points are null; there is no championship start.'),
          branch('Entry evidence only', 'No result points or start is created.', 'nr-entries')
        ], [source('assets/engine.js', 180, 197, 'computeRound points')]),
        node('Is the scored class class-only?', [
          branch('Yes, e.g. a configured NR0 class', 'Skip this crew in overall scoring rank, but still allocate class points. The next scoring crew moves up the overall scale.'),
          branch('No', 'Use the next overall scale value among non-class-only classified crews.'),
          branch('Scale exhausted', 'Award zero for the exhausted component, not a repeating final scale value.')
        ], [source('assets/engine.js', 137, 140, 'classOnly'), source('assets/engine.js', 181, 191, 'overall and class ranks')]),
        node('How are class points and crew totals built?', [
          branch('Each scored class', 'Allocate class points in official finishing order within that class. Round total = overall + class.'),
          branch('Driver and co-driver', 'Apply the same crew total to each credited role (except explicit noCodriver). This differs from RS independent role ranking.', 'rs-roles')
        ], [source('assets/engine.js', 181, 197, 'computeRound'), source('assets/engine.js', 245, 266, 'standings credits')])
      ], ['nr-credit', 'nr-ranking', 'rs-points']),
    topic('nr-starts', 'nr', 'Starts, zeroes and missing NR rounds',
      'A zero-point start, a DNS and no recorded result are distinct. Eligibility is based on starts, not entry-list participation.',
      'Result status; credited identities; extraStarts; season.minStarts.', [
        node('Does this role have a recorded start?', [
          branch('Classified or DNF result', 'Count one round for the credited person. DNF is a start even with no times in NR.'),
          branch('DNS / no role ID / noCodriver', 'Do not add that role\'s round to standings.'),
          branch('extraStarts', 'Add an explicitly recorded missing-sheet start as DNF with zero points and msaOnly provenance. The procedure requires MSA evidence.')
        ], [source('assets/engine.js', 245, 266, 'standings'), source('assets/ai-import.js', 304, 313, 'extra-start evidence')]),
        node('Has the person reached the configured minimum?', [
          branch('Starts >= minStarts', 'Eligible for the NR table ordering.'),
          branch('Fewer starts', 'Keep their points, but place them after eligible people and mark them with *. A higher total can therefore sit below a lower one.', 'nr-ranking')
        ], [source('assets/engine.js', 269, 285, 'standings eligibility'), source('assets/site.js', 659, 675, 'ineligible rows / legend')]),
        node('What is shown in a per-round cell?', [
          branch('DNF / extra start', 'Display DNF, representing a recorded start and zero points.'),
          branch('No round record', 'Display a dash with "Did not start" in the NR standings UI. It is not a zero-point result and does not prove DNS in the source.'),
          branch('Classified', 'Display the calculated points, with an optional overall + class breakdown.')
        ], [source('assets/site.js', 657, 675, 'viewStandings cells')])
      ], ['nr-credit', 'nr-entries', 'nr-ranking']),
    topic('nr-ranking', 'nr', 'Why is a person higher or lower in NR standings?',
      'Driver and co-driver tables are independent aggregations, not a single combined crew ranking.',
      'All represented round points/finishing positions; starts; minimum starts; display class and class filter.', [
        node('Which ordering comparison decides first?', [
          branch('Eligibility differs', 'Eligible people come first, regardless of total points.'),
          branch('Same eligibility, different total', 'Higher sum of all round points comes first. There are no dropped rounds, weighting or stage bonuses.'),
          branch('Equal total', 'Count back overall finishing positions: more firsts, then seconds, and so on across every represented position, including beyond 30.'),
          branch('Still tied', 'Sort by name and assign sequential row ranks. This is NOT the RS shared-rank policy.')
        ], [source('assets/engine.js', 267, 294, 'standings total / sort / rank')]),
        node('Is a class filter selected?', [
          branch('Yes', 'Filter the overall table by the displayed season class, keep its existing ordering, add a sequential class-view position and a class-points column. It is not re-sorted by class-only points.'),
          branch('No', 'Show overall ranks with total overall + class points.')
        ], [source('assets/site.js', 634, 676, 'viewStandings')]),
        node('Could a co-driver report differ from the driver report?', [
          branch('Different partners, credits or starts', 'The co-driver\'s own credited results determine their total and eligibility. Review per-round credit/noCodriver/extraStarts before assuming a scoring error.', 'nr-credit'),
          branch('Only display class differs', 'A co-driver class map affects displayed class/filtering, not separate result points.')
        ], [source('assets/engine.js', 245, 294, 'standings')])
      ], ['nr-starts', 'nr-finality', 'rs-totals']),
    topic('nr-finality', 'nr', 'NR source finality is not MSA confirmation',
      'Two independent labels answer different questions: what does the classification claim, and have these points been checked against the MSA sheet?',
      'Printed status; finalityUnclear; season.msa.confirmedRounds; recorded result/calculation.', [
        node('What source-finality badge is shown?', [
          branch('Status includes provisional', 'Show Provisional / Provisional sheet.'),
          branch('Recognised Final [Official] Classification, optionally page count, and not finalityUnclear', 'Show Final / Final classification.'),
          branch('Any other status or explicit finalityUnclear', 'Show Finality unclear. Do not turn an acknowledgement into a final source.')
        ], [source('assets/engine.js', 236, 240, 'computeRound flags'), source('assets/site.js', 83, 95, 'classificationState / classificationBadge')]),
        node('Is the round in confirmedRounds?', [
          branch('Yes', 'Show Points match MSA. This is a manually recorded comparison, not a live PDF comparison.'),
          branch('No', 'Show Points calculated, a dagger in standings, and provisional wording for unconfirmed points. Missing confirmation does not establish a mismatch.'),
          branch('Known mismatch', 'The site does not discover or fix it automatically. Compare the source and record reviewed exceptions; do not tick confirmation until points match.', 'nr-credit')
        ], [source('assets/site.js', 1018, 1026, 'round points badge'), source('assets/site.js', 650, 677, 'MSA legend'), source('docs/data-entry-guide.md', 154, 171, 'Judgement calls')]),
        node('Are NR points withheld because the source is provisional?', [
          branch('No', 'buildSeason calculates from recorded rows regardless of source finality and MSA confirmation. Labels qualify the numbers; they do not gate the NR calculation. RS behaves differently.', 'rs-finality'),
          branch('AI result replacement / scoring-calendar amendment', 'The AI path clears affected MSA confirmations. This is not a universal automatic clear for every manual cell edit; admins must recheck comparisons.')
        ], [source('assets/engine.js', 135, 197, 'buildSeason'), source('assets/ai-import.js', 411, 414, 'settings confirmation reset'), source('assets/ai-import.js', 459, 468, 'round confirmation reset')])
      ], ['nr-intake', 'rs-finality', 'nr-graphs']),
    topic('nr-entries', 'nr', 'Entry evidence and participation counts',
      'Entry evidence can keep a person visible before results exist without manufacturing starts, DNS or points.',
      'Source coverage, complete flag, event/round IDs, per-crew day scope and official entry status; stable identities.', [
        node('What does the entry source establish?', [
          branch('No list / empty partial list', 'Coverage is unknown; do not report zero participation.'),
          branch('Partial nonempty list', 'Show documented entries with partial-coverage wording.'),
          branch('Complete empty list', 'A known complete-zero count is possible.'),
          branch('Day scope missing', 'Keep event-only evidence. Do not allocate it to every day or round.')
        ], [source('assets/engine.js', 325, 345, 'entryLists / entryParticipation'), source('assets/site.js', 590, 614, 'entry summaries')]),
        node('Does an entered crew appear in results?', [
          branch('Matching stable crew / credited crew in scoped event rounds', 'Recognise a recorded start (or explicit recorded DNS separately). A reused car number is not identity evidence.'),
          branch('Substitute partner or no matching classification', 'Preserve the entered crew. Do not credit an absent partner or infer DNS from their absence.'),
          branch('Official DNS or withdrawal', 'Require distinct official status evidence. "Entered" otherwise means start unknown.')
        ], [source('assets/engine.js', 325, 345, 'scoped starts'), source('assets/engine.js', 1164, 1170, 'entryCrewRecorded'), source('assets/engine.js', 1171, 1236, 'validateEntryLists')]),
        node('How do entries contribute to the site?', [
          branch('Participation', 'Deduplicate stable crew pairs per physical event, not per day. Documented event counts and entry-only profiles stay separate from classified appearances.'),
          branch('Championship', 'Entry rows never create results, starts, points or season class overrides. Unresolved entry names block publish; explicitly resolve or add them.', 'shared-identity')
        ], [source('assets/engine.js', 325, 345, 'entryLists'), source('assets/site.js', 1349, 1374, 'round participation'), source('assets/admin.js', 157, 175, 'entryIdentityNotice')])
      ], ['nr-starts', 'nr-profiles', 'shared-calendar']),
    topic('nr-graphs', 'nr', 'NR stage graphs and the Final endpoint',
      'Graphs illustrate recorded stage progress, not a new official classification or a certification of finality.',
      'Stage times and printed stage positions; scored classes; official totals/positions; status.', [
        node('Is there a continuous stage-time prefix?', [
          branch('Yes', 'Add times stage by stage to tenths of a second. At each point, position = 1 + number of faster cumulative times; do the same within scored class.'),
          branch('A missing/invalid stage occurs', 'Stop that car\'s cumulative line; do not fill the gap or interpolate. A later source time remains available as a stage observation.'),
          branch('Gap metrics', 'Subtract the fastest available cumulative time overall or in the scored class.')
        ], [source('assets/engine.js', 198, 226, 'computeRound progression')]),
        node('Which metric is selected?', [
          branch('Time lost', 'Subtract the fastest NR recorded time on that stage.'),
          branch('Stage position', 'Use the position printed on the sheet, not a rank invented from times.'),
          branch('Position / gap final endpoint', 'Use classified crews\' official total, overall position and computed scored-class position. Total penalties enter at Final, not apportioned across stages.')
        ], [source('assets/engine.js', 204, 230, 'progression and stage loss')]),
        node('Does the word Final certify a final source?', [
          branch('No', 'Final names the classification endpoint. Check the independent source-finality badge. Non-classified crews have no Final point. NR and RS graphs use separate pools.', 'nr-finality')
        ], [source('assets/site.js', 1734, 1736, 'graph explanation'), source('assets/site.js', 779, 807, 'independent RS graph adapter')])
      ], ['rs-graphs', 'nr-points']),
    topic('nr-profiles', 'nr', 'NR profiles, crew reports and archives',
      'Stable IDs connect reviewed identities across seasons. Participation, printed appearances and championship credit must not be conflated.',
      'Person ID, aliases, appearance roles, credited roles, entry evidence and each selected season model.', [
        node('Is the person printed or only credited?', [
          branch('Printed crew member', 'Keep the result appearance, role and partner. Assign points only when that ID is credited.'),
          branch('Credited substitute not printed', 'Add a credited-only appearance with no printed role.'),
          branch('Extra start', 'Add an MSA-only zero-point DNF appearance; do not invent a printed classification row.')
        ], [source('assets/engine.js', 297, 324, 'person apps')]),
        node('Is there entry evidence but no result appearance?', [
          branch('Yes', 'Keep an entry-only profile/history and documented event participation. Do not manufacture a standing, result statistics or start.'),
          branch('Cross-season profile', 'Load the offered season bundles under the same canonical ID. An unavailable required bundle can prevent profile rendering rather than silently dropping history.')
        ], [source('assets/engine.js', 325, 345, 'person entries'), source('docs/recovery.md', 164, 174, 'public loading and profiles')]),
        node('What determines the profile points chart?', [
          branch('NR role standings', 'Use that person\'s credited per-round overall + class values. A dash means no represented round; DNF represents zero.'),
          branch('Switching to RS', 'Keep person/season context, but use separate RS appearances, source vehicles and scores; do not borrow NR values.', 'rs-profiles')
        ], [source('assets/site.js', 1665, 1705, 'pointsBars / pointsSvg'), source('assets/site.js', 1427, 1449, 'rsAppearances')]),
        node('Which results make the headline NR statistics?', [
          branch('Starts and finishes', 'Count credited driver/co-driver round records as starts; only their classified records are finishes. Printed appearances without credit are not extra championship starts.'),
          branch('Best finish, wins and podiums', 'Use the official overall position of credited classified records, not championship points rank or class position.'),
          branch('Stage wins', 'Count printed stage-position 1 observations from those credited records, including a crew that later retires. Do not rank missing times to invent a stage win.')
        ], [source('assets/site.js', 1564, 1587, 'viewPerson NR statistics')])
      ], ['nr-credit', 'nr-entries', 'shared-identity']),
    topic('rs-scope', 'rs', 'RS starts with a separate, year-specific ruleset',
      'RallyeSport is not an NR class. The sole supported scoring profile is the explicitly reviewed 2026 Rallysprint SSR V1, issued 9 July 2026.',
      'Season year; ruleset code/year; independent RS events/classifications; reviewed shared people IDs.', [
        node('Is the selected profile clubman-sprint-2026-v1 for 2026?', [
          branch('Yes, and season is 2026', 'Select the explicit eligibility policy, then continue to reviewed starter inputs and event-level gates.', 'rs-members'),
          branch('Missing profile or another year', 'Return unconfigured scoring. Preserve source event tables. Never silently copy NR rules or assume 2026 applies to a future year.')
        ], [source('assets/engine.js', 479, 491, 'calculateRallyeSportScoring'), source('assets/engine.js', 973, 982, 'ruleset validation')]),
        node('Does the RS event need an NR counterpart?', [
          branch('Standalone', 'No. Independent events, classifications, round numbers and stage axes work with no NR calendar/results.'),
          branch('Shared physical event', 'Association requires explicit IDs. Names, dates or array order do not establish a link; optional time reuse is a reviewed snapshot only.', 'rs-copy')
        ], [source('assets/engine.js', 984, 1021, 'RS event validation'), source('assets/site.js', 779, 807, 'rsGraphModel')]),
        node('Are all SSR clauses implemented?', [
          branch('No', 'Only processing decisions listed here apply. Blank finisher/awards clauses, unspecified non-scoring categories, new policies and future-year regulations are not filled in by the app.', 'shared-limits')
        ], [source('docs/scoring-rules.md', 172, 184, 'unresolved RS boundaries')])
      ], ['rs-members', 'rs-starters', 'rs-finality']),
    topic('rs-events', 'rs', 'Can this RS event earn championship points?',
      'Validation, event-point readiness and final championship readiness are different gates. A faithful source table may be visible while scoring is blocked.',
      'Championship/applicability evidence; result; double-points declaration/dates; finality; classes; source rows; starters; invitation review.', [
        node('Is the event explicitly a championship round?', [
          branch('countsForChampionship is not true', 'Do not create a championship scoring row for this event. A recorded event classification can still be displayed.'),
          branch('Confirmed true', 'A complete official classification must exist. Publishing validation also requires championship evidence.')
        ], [source('assets/engine.js', 518, 549, 'counted events / score rows'), source('assets/engine.js', 1002, 1010, 'event evidence validation')]),
        node('Are applicability and double-points inputs complete?', [
          branch('SSR applicability not confirmed with evidence', 'Block this event.'),
          branch('Double points unknown', 'Block this event; absence is not an implicit false.'),
          branch('Double points true', 'Require official bulletin evidence, real event/bulletin dates, at least 14 days notice, exactly five counted events and exactly one double-points event. Otherwise block.'),
          branch('Double points false', 'No multiplier. Continue through the remaining event gates.')
        ], [source('assets/engine.js', 573, 582, 'event rule gates')]),
        node('Do source and review inputs allow scoring?', [
          branch('Unaccepted finality', 'Block event points; do not hide the source.', 'rs-finality'),
          branch('Unknown status/category, incomplete classified position/total, duplicate cars, insufficient starters or legacy-only unknown invitation status', 'Block event points, never substitute zero for the blocked event. Entry-based policy does not require invitation confirmation.', 'rs-starters'),
          branch('All gates pass', 'Check consistent official ordering, then independently rank eligible driver and co-driver roles.', 'rs-order')
        ], [source('assets/engine.js', 580, 616, 'source and starter gates')])
      ], ['rs-finality', 'rs-starters', 'rs-totals']),
    topic('rs-starters', 'rs', 'RS event starter minimum: evidence, not entries',
      'This is an event-wide threshold, not a per-person or per-class minimum. The published SSR text and the separately recorded user review are not the same authority.',
      '2026 starterMinimumReview; source rows/status/times/stage positions/startEvidence; reviewed event starterCount and evidence.', [
        node('Which threshold is configured?', [
          branch('No starterMinimumReview', 'Apply the published SSR V1 baseline: 15 starters.'),
          branch('Explicit minimum 6, reviewed true, evidence present and supported fields only', 'Use six as a separate user-reported 2026 review. No written amendment is recorded; do not claim the PDF says six.'),
          branch('Review malformed, unreviewed or evidence-free', 'Return invalid scoring, with no silent fallback to 6 or 15. Another year cannot inherit this review.')
        ], [source('assets/engine.js', 492, 512, 'starterMinimum selection')]),
        node('Who counts as a source-backed starter?', [
          branch('classified', 'Counts as a starter.'),
          branch('DNF / invitational / RS0', 'Official DNF counts as started, including without recorded times. Membership exclusion is not a start exclusion. Entry-based championship TEST inputs are unsupported and block scoring. Legacy TEST still needs actual start evidence.'),
          branch('DNS', 'Never counts, regardless of recorded observations.')
        ], [source('assets/engine.js', 555, 572, 'hasStartEvidence / starterProblem')]),
        node('Is a reviewed event starter count supplied?', [
          branch('Yes', 'Require a non-negative integer plus evidence, no less than known source-backed starters and no greater than classification row count. A count below the threshold blocks scoring.'),
          branch('No and known starters meet threshold', 'Threshold passes from source rows.'),
          branch('No and source-status starters are too few', 'Block for the unchanged minimum. Do not invent missing classification rows or TEST starts.')
        ], [source('assets/engine.js', 559, 572, 'starterProblem'), source('assets/engine.js', 1133, 1137, 'starter count validation')]),
        node('Does an official DNF need additional stage evidence?', [
          branch('No', 'The source classification establishes the start. An eligible DNF receives zero points even without timing observations.', 'rs-points')
        ], [source('assets/engine.js', 644, 651, 'DNF points')])
      ], ['rs-members', 'rs-points', 'rs-events']),
    topic('rs-members', 'rs', 'RS person eligibility and private review evidence',
      'A reviewed entry-based policy replaces membership exclusions without rewriting historical membership evidence. No policy means the legacy membership workflow, not an automatic migration.',
      'Reviewed 2026-11-09 membership map keyed by stable profile ID; private provenance; membership status/basis; optional per-row reviewed identity.', [
        node('Does the season use the reviewed entry-based 2026 policy?', [
          branch('entry-based-2026-v1, reviewed with private evidence', 'Both driver and co-driver qualify in RS2/RS4. Ignore membership, licence, invitation and season manual exclusions for scoring. Preserve private legacy evidence without marking it verified. Official classified/DNF establishes start; DNS excludes. This user decision is not a printed SSR amendment.', 'rs-roles'),
          branch('Malformed / unreviewed / unsupported policy', 'Invalid scoring; never fall back silently. Another year needs its own implemented policy.'),
          branch('Policy absent', 'The following membership-map branches describe legacy scoring only.')
        ], [{ path: 'assets/engine.js', start: 45, end: 65, symbol: 'Entry-based policy and launch classification', revision: 'main' }]),
        node('Legacy only: does the season have a valid reviewed map?', [
          branch('No / invalid / unreviewed', 'Fail closed: scoring is invalid. No automatic paid-up assumption or use in another year.'),
          branch('Yes', 'Resolve each role\'s profile ID (including an explicit identityReview when present), then look up that ID. A missing person decision becomes unverified.')
        ], [source('assets/engine.js', 50, 87, 'rallyeSportEntryPerson / validRallyeSportMembershipReview'), source('assets/engine.js', 513, 540, 'membership lookup')]),
        node('What supports an eligible decision?', [
          branch('Documented review procedure', 'A matched Profile Complete record needs both licence and membership reference evidence. Active/Inactive/Invite Pending account labels do not change this. A qualifying complete match takes precedence over an incomplete duplicate.'),
          branch('User-confirmed exception', 'Use a distinct user-confirmed basis and private per-person provenance; do not relabel it as a workbook correction.'),
          branch('Runtime boundary', 'The engine validates the decision map, date, stable IDs, statuses and basis/evidence shape. It does NOT independently verify the external roster\'s truth.')
        ], [source('docs/scoring-rules.md', 110, 122, 'membership review'), source('assets/engine.js', 72, 87, 'map validation')]),
        node('Which non-eligible state was recorded?', [
          branch('Confirmed non-member', 'This specifically asserts non-membership.'),
          branch('Missing licence / membership reference / incomplete profile / unverified', 'These are distinct evidence gaps, NOT non-membership assertions. Public labels remain RS0 Non-Scoring without exposing private evidence.'),
          branch('Manual exclusion / invitation / TEST', 'These are independent reasons for non-scoring and do not rewrite the membership status.', 'rs-roles')
        ], [source('assets/engine.js', 59, 71, 'membership messages'), source('assets/site.js', 689, 701, 'public eligibility labels')])
      ], ['rs-roles', 'shared-identity', 'shared-projection']),
    topic('rs-roles', 'rs', 'RS driver and co-driver score independently',
      'Entry-based championship entrants are not removed or re-ranked for membership, licence or invitation. Legacy exclusions below apply only when the reviewed entry-based policy is absent.',
      'Per-role membership status/ID; TEST status, invitation flag, season manual exclusions; source scoring class/order.', [
        node('Which exclusion wins for this role under legacy policy only?', [
          branch('TEST source status', 'Use test / RS0 Invitational.'),
          branch('Otherwise invited true', 'Use invitational / RS0.'),
          branch('Otherwise person in manual nonScoringPeople', 'Use manual-exclusion / RS0; keep underlying membershipStatus.'),
          branch('Otherwise', 'Use the role\'s reviewed membership status. Eligible roles use configured scoring class; all other roles use RS0.')
        ], [source('assets/engine.js', 524, 540, 'eligibility precedence')]),
        node('How does a classified eligible role get a scoring position?', [
          branch('Drivers', 'Use consistent official order within RS2/RS4. Entry-based policy keeps every classified driver; only legacy policy removes excluded drivers.'),
          branch('Co-drivers', 'Independently remove excluded co-drivers under legacy policy only. Entry-based policy removes only missing co-driver names, not membership/licence/invitation cases.'),
          branch('Excluded partner under legacy policy', 'Only that role is removed from its scoring pool. Entry-based championship policy has no excluded partner.')
        ], [source('assets/engine.js', 591, 597, 'scoringRoles'), source('assets/engine.js', 617, 633, 'role ranks and points')]),
        node('How does this affect the event display?', [
          branch('Official classification', 'Preserve source class, position, time, status and row order in the data. Public RS class labels use any recorded event-specific mapping; independent role scoring labels and points remain separate.'),
          branch('Secondary scoring-order table', 'Ranked eligible people first; excluded roles have no scoring rank. The RS0 marker means Non-Scoring, not necessarily non-member.', 'rs-points')
        ], [source('assets/site.js', 838, 873, 'rsEventScoringTable'), source('assets/site.js', 889, 936, 'RS classification')])
      ], ['rs-order', 'rs-points', 'rs-members']),
    topic('rs-order', 'rs', 'RS source categories and consistent scoring order',
      'Official event positions and championship scoring ranks answer different questions. The app does not re-run the official stage-time tie-break.',
      'Printed class/category, optional classification-scoped classMappings/evidence; overall and class positions.', [
        node('Is the printed category configured?', [
          branch('RS2 or RS4', 'Use that scoring class, preserving the printed category.'),
          branch('Another classified category', 'Block unless an explicit classification-specific evidence-backed mapping to RS2/RS4 is recorded. Do not carry mappings to other events.'),
          branch('TEST', 'Never map TEST into championship scoring. Under entry-based policy it is unsupported except retained printed launch evidence with an explicit row launchNonScoringReview: effective RS0 for both roles, event countsForChampionship false and no roundNumber. This never excludes the person at later events. Unknown inputs are not converted.')
        ], [source('assets/engine.js', 45, 49, 'rallyeSportScoringClass'), source('assets/engine.js', 1041, 1061, 'mapping validation'), source('assets/engine.js', 583, 584, 'category scoring gate')]),
        node('Which official order field is used within a class?', [
          branch('Every classified entry in that scoring class has a valid classPos', 'Use printed class positions throughout that class.'),
          branch('Any classPos missing', 'Use official overall position for every classified entry in that class. Never mix the two position fields.')
        ], [source('assets/engine.js', 598, 608, 'useClassPositions')]),
        node('Is the order still tied or contradictory?', [
          branch('Tied scoring position within class', 'Withhold event points for review. Do not recompute SSR 7.5 stage-time tie-break.'),
          branch('Printed class and overall order conflict', 'Withhold event points.'),
          branch('Same overall position in different classes', 'That alone is not an unresolved within-class tie. Source positions remain unchanged.')
        ], [source('assets/engine.js', 598, 616, 'orderIssue')])
      ], ['rs-roles', 'rs-points', 'rs-totals']),
    topic('rs-finality', 'rs', 'RS finality, provisional sources and technical checks',
      'Unlike NR, RS event points require accepted scoring finality. Acceptance for scoring does not rewrite a source heading or prove technical clearance.',
      'Printed result status and notes; optional acceptedForScoring review with evidence; source qualifications.', [
        node('Does the source qualify as final automatically?', [
          branch('Recognised Final [Official] Classification or Results (optional page count), no pending-technical-check note', 'Source-final basis can pass the finality gate.'),
          branch('Provisional, unclear, or "results are final pending post-event technical checks"', 'Not automatically accepted for points. Keep the official result available and its qualifications visible.')
        ], [source('assets/engine.js', 549, 554, 'sourceFinal'), source('assets/engine.js', 580, 582, 'finality gate')]),
        node('Is there a separate evidence-backed user finality review?', [
          branch('acceptedForScoring true and nonblank evidence', 'Allow finality for scoring with user-confirmed basis. Preserve printed status, footer and notes. Other gates can still block points.'),
          branch('No', 'Provisional or unclear classifications remain unscored. Merely entering evidence without selecting the separate review cannot activate it in admin.')
        ], [source('assets/engine.js', 88, 91, 'rallyeSportFinalityAccepted'), source('assets/admin.js', 1619, 1631, 'separate finality controls')]),
        node('What does the public UI disclose?', [
          branch('Pending technical-check note', 'Retain the visible Technical checks pending badge and source qualifications even when user-confirmed scoring is allowed.'),
          branch('Points blocked', 'Show event points unavailable with the blocking reason; omit championship points columns rather than printing a fake zero.'),
          branch('No MSA comparison', 'RS has no NR-style MSA confirmedRounds comparison gate. Do not transplant Points match MSA into RS.')
        ], [source('assets/site.js', 743, 763, 'rsResultHeader'), source('assets/site.js', 889, 936, 'classification display'), source('assets/engine.js', 479, 735, 'RS scoring inputs')])
      ], ['rs-events', 'rs-points', 'nr-finality']),
    topic('rs-points', 'rs', 'RS points, zero and unavailable are different',
      'RS awards class-scale points, not NR overall-plus-class. Overall Clubman totals reuse those points; they are not a second points allocation.',
      'Ready event; independent role scoring position/class and eligibility; official result status; doublePoints.', [
        node('Is the event ready to score?', [
          branch('No', 'No per-entry event score is established. Exclude this event from provisional totals; do not substitute zero.', 'rs-events'),
          branch('Yes, role classified and eligible', 'Class ranks 1-10 earn 15,12,10,8,7,6,5,4,3,2. Every rank from 11 onward earns 1. Multiply by 2 only for the supported explicit double-points case.'),
          branch('No co-driver', 'Co-driver eligibility/points are null, not a zero-point unnamed person.')
        ], [source('assets/engine.js', 479, 482, 'pointScale'), source('assets/engine.js', 617, 633, 'role awards'), source('assets/engine.js', 635, 652, 'row points')]),
        node('What does a non-classified or excluded role receive in a ready event?', [
          branch('Eligible DNF with supported class', 'Zero points, no scoring position; official status establishes start even without stage observations.'),
          branch('Unsupported class', 'No invented points; unresolved category semantics still block scoring.'),
          branch('DNS', 'Null points, never a start.'),
          branch('Legacy policy only: non-eligible / invitation / TEST with non-DNS source row', 'Zero championship points and no rank, shown as RS0. Entry-based policy ignores those exclusions; championship TEST inputs block rather than receiving zero.')
        ], [source('assets/engine.js', 635, 652, 'driverPoints / codriverPoints')]),
        node('How does the website distinguish zero and missing?', [
          branch('Numeric score, including 0', 'Keep it in event/profile/standings values.'),
          branch('Null / blocked / no scored result', 'Show unavailable/dash rather than 0. Profile points bars leave gaps; DNF retains its status.'),
          branch('Event classification', 'Source finish and independent role scores are separate columns; RS0 never rewrites the official result.')
        ], [source('assets/site.js', 889, 936, 'classification cells'), source('assets/site.js', 1642, 1665, 'rsPersonRoundPoints / rsPointsBars')])
      ], ['rs-totals', 'rs-roles', 'nr-points']),
    topic('rs-totals', 'rs', 'RS cumulative tables and championship readiness',
      'Ready event points do not by themselves establish a final championship, award eligibility or a champion.',
      'Explicit counted event set; ready/blocked event rows; double-points events; all per-role class points.', [
        node('Does the counted season satisfy the supported round pattern?', [
          branch('Six to eight counted rounds and no double-points event', 'Round-count rule can pass.'),
          branch('Five counted rounds with exactly one valid bulletin-confirmed double-points event', 'The five-round exception can pass.'),
          branch('Four championship rounds plus a launch event', 'Keep provisional cumulative totals from ready championship events only. The launch has no round number, contributes no championship points or round/statistics count, but retains all event appearances, results and graphs. Never bypass the round-count rule.'),
          branch('Other pattern / >8 rounds / unsupported double declaration', 'Season is incomplete or blocked with a reason; the app does not select a double-points event to fix it.')
        ], [source('assets/engine.js', 710, 725, 'roundRule / status')]),
        node('Are all confirmed championship events ready?', [
          branch('Yes and round pattern passes', 'Return ready standings. The unresolved equal-total rule still applies; this is not an official championship certification.'),
          branch('Some ready, season incomplete/blocked', 'Build explicitly provisional cumulative tables using ready events only. Disclose included/excluded events and reasons.'),
          branch('None ready', 'No cumulative table. Source event results remain available.')
        ], [source('assets/engine.js', 710, 734, 'standings / provisionalStandings'), source('assets/site.js', 703, 716, 'rsScoringNotice')]),
        node('How are people aggregated and ranked?', [
          branch('Eligible role with numeric points', 'Sum by stable ID separately for drivers and co-drivers, in overall and actual RS2/RS4 class tables.'),
          branch('Equal season totals', 'Share rank = 1 + number of people with higher totals. Alphabetical presentation is not a season tie-break or winner declaration.'),
          branch('Legacy only: excluded role, non-DNS source', 'Keep a zero-point unranked RS0 row after eligible rows. Entry-based championship tables have RS2/RS4 only; the launch-only RS0 review never enters these totals.'),
          branch('Standings split display', 'Show each scored round with its RS class contribution. Overall totals reuse those class points; there is no separate overall award.')
        ], [source('assets/engine.js', 657, 709, 'buildStandings')])
      ], ['rs-events', 'rs-points', 'shared-limits']),
    topic('rs-copy', 'rs', 'Reviewed time reuse: NR source to independent RS snapshot',
      'The optional reuse action reduces transcription, not competition separation. It never creates a live NR/RS link.',
      'Explicit nrRoundId; exact RS->NR stage mappings; car plus known/reviewed driver/co-driver IDs; blank RS cells.', [
        node('Is the source match fully specified?', [
          branch('Missing explicit round/stage link or invalid alignment', 'Stop with an error.'),
          branch('Car plus known driver and co-driver match exactly one NR row', 'Review the mapped observations; reviewed aliases/identity IDs may resolve spelling differences.'),
          branch('Unresolved person / car-only match / multiple or no crew matches', 'Leave the RS crew unchanged and report it as unmatched. NR DNS rows are skipped.')
        ], [source('assets/engine.js', 845, 875, 'copyReviewedRallyeSportTimes')]),
        node('What happens to each mapped time cell?', [
          branch('RS blank, NR observation present', 'Propose the exact printed time string with reviewed-copy provenance.'),
          branch('Already identical', 'Report unchanged.'),
          branch('Different existing RS value / missing NR observation', 'Preserve the RS value/gap and report a conflict/missing observation.'),
          branch('Human cancels or helper errors', 'Apply no copy. The helper produces a new entries array; admin applies only after confirmation.')
        ], [source('assets/engine.js', 876, 894, 'copy cell handling'), source('assets/admin.js', 1417, 1442, 'copyReviewedRsTimes')]),
        node('What is never copied or automatically updated?', [
          branch('Competition semantics', 'Never copy NR status, class, position, penalty or points. RS-only stages remain independently entered.'),
          branch('Later NR correction', 'Does not update RS. Changing a mapped round/stage in admin clears affected copied times/provenance; manual times stay independent.')
        ], [source('assets/admin.js', 1649, 1689, 'mapping changes'), source('docs/scoring-rules.md', 212, 220, 'shared-stage reuse')])
      ], ['rs-graphs', 'shared-identity']),
    topic('rs-graphs', 'rs', 'RS graphs preserve independent observations and precision',
      'RS graphs use the same presentation controls as NR, but only RS source times, stage axes, official final data and comparison pools.',
      'Selected classification stages/times, printed stage positions, source classes or explicit mappings, official status/positions/total.', [
        node('Is cumulative timing continuous?', [
          branch('All prior stages have times', 'Build cumulative time and compare against RS-only cars, overall or by scoring class. Preserve source precision including hundredths.'),
          branch('Earlier stage missing', 'Cumulative values stay discontinuous; no interpolation. Later actual stage observations still support stage loss and printed stage position metrics.')
        ], [source('assets/engine.js', 768, 810, 'buildRallyeSportGraph')]),
        node('Is a stage-position or loss metric selected?', [
          branch('Printed stage position present', 'Use it verbatim; missing positions are not recomputed from times.'),
          branch('Time loss', 'Subtract the fastest recorded RS stage time.'),
          branch('No times / no printed stage ranks', 'Show an explicit unavailable explanation, while preserving any official Final data.')
        ], [source('assets/engine.js', 797, 810, 'stage metrics'), source('assets/site.js', 764, 777, 'viewRsGraph')]),
        node('What is the Final endpoint?', [
          branch('Classified', 'Use official source overall/class position or official-total gap. Do not recompute official positions or apply role-scoring ranks to this endpoint.'),
          branch('DNF / DNS / TEST', 'No Final point.'),
          branch('Graph class / championship class', 'Graph grouping uses source class or explicit mapping, NOT a role\'s RS0 exclusion; eligibility labels remain separate.')
        ], [source('assets/engine.js', 811, 843, 'Final and series'), source('assets/site.js', 779, 807, 'rsGraphModel')])
      ], ['nr-graphs', 'rs-finality', 'rs-order']),
    topic('rs-profiles', 'rs', 'RS crews, profiles and points history',
      'A non-scoring person still has an official sporting history. Unavailable points and missing vehicles must not be filled from NR.',
      'Known canonical IDs; publicIdentity mappings; source names, car, partner, optional vehicle and official appearances; role scores.', [
        node('Can the printed name resolve to a known shared person?', [
          branch('Known canonical ID', 'Aggregate appearances and link to that profile under the same cross-season identity.'),
          branch('Unresolved', 'Keep the printed crew visible without an invented canonical profile link. Crew listings use result/car/role scoped keys rather than merging uncertain people.')
        ], [source('assets/engine.js', 50, 58, 'rallyeSportEntryPerson'), source('assets/site.js', 1427, 1473, 'rsAppearances / viewRsCrews')]),
        node('Is the role RS0 or points unavailable?', [
          branch('RS0 with numeric zero', 'Keep source appearances, selected-car graph links and zero-point history; no championship rank.'),
          branch('No scored result / null points', 'Leave a gap/dash in per-event points. Do not show a fabricated zero.'),
          branch('Missing optional RS vehicle', 'Display Not recorded. Never use an NR vehicle for an RS appearance.')
        ], [source('assets/site.js', 1500, 1565, 'RS profile'), source('assets/site.js', 1642, 1665, 'RS points chart')]),
        node('What survives competition switching?', [
          branch('Canonical person and selected season', 'Keep shared profile context (photo/bio/links) while switching separate NR and RS sports records. RS never enters NR statistics.')
        ], [source('assets/site.js', 1427, 1449, 'RS-only appearances'), source('docs/scoring-rules.md', 200, 219, 'competition-specific display')])
      ], ['rs-points', 'nr-profiles', 'shared-projection']),
    topic('shared-ai', 'shared', 'AI preparation cannot invent a policy or publish',
      'The optional AI path is an NR preparation contract, not an RS rules interpreter or a model-controlled database writer.',
      'Versioned JSON, official sources/locators, declared fixed policies, coverage, identities, human rules/evidence/finality approvals.', [
        node('Does the returned pack meet the contract?', [
          branch('Wrong schema/version, unsafe keys, truncated/oversized or unsupported rule', 'Reject before changing the working copy. A reviewer checkbox cannot enable an unknown policy.'),
          branch('Whole classification', 'One combined batch must contain every page exactly once, with reconciled row/status totals. Per-page imports replace, not append; partial coverage is blocked.'),
          branch('Rules and source evidence supported', 'Continue to identity/source/override review and change preview.')
        ], [source('assets/ai-import.js', 235, 274, 'assess coverage / policies'), source('docs/data-entry-guide.md', 5, 20, 'AI workflow')]),
        node('What does human review permit?', [
          branch('Rules and evidence approved', 'Stage the scoped preview only after review; no automatic public default-season switch.'),
          branch('Provisional / unclear classification', 'Separate acknowledgement permits staging, not rewriting source finality.'),
          branch('Settings changed after review', 'Signature/version/policy checks block publish until reviewed again; unsupported policy requires implementation and regression tests.')
        ], [source('assets/ai-import.js', 324, 348, 'validateDocuments / projectPublic'), source('assets/ai-import.js', 349, 365, 'plan approvals')]),
        node('What happens on replacement?', [
          branch('Same car AND resolved crew', 'Existing evidence-backed NR credit/class/skip-sum/notes may be retained.'),
          branch('Reused car with different crew', 'Do not inherit previous exceptions. Review removals/starts/points/ranks; affected confirmation is cleared.'),
          branch('Incomplete local draft', 'Download privately if needed; no private preparation is persisted in browser storage by this workflow.')
        ], [source('assets/ai-import.js', 431, 468, 'replacement and confirmation'), source('docs/data-entry-guide.md', 65, 77, 'local drafts and limits')])
      ], ['shared-identity', 'shared-publish', 'shared-limits']),
    topic('shared-identity', 'shared', 'Stable identities, aliases and human decisions',
      'A similar name or a reused car number is not identity proof. People are shared across seasons; sports records remain season/competition-specific.',
      'Stable profile ID, canonical name, verified aliases, printed names and optional RS identityReview.', [
        node('Does a name match a known name/alias?', [
          branch('Unique reviewed name or alias', 'Resolve to the existing stable ID. Normalization folds accents/case/spacing for lookup, not to prove two people are the same.'),
          branch('Unknown / similar', 'Use explicit human matching or create a distinct profile after checking. Fuzzy suggestions are not automatic identity decisions.'),
          branch('RS reviewed role ID supplied', 'Use that known ID for that role while preserving the printed name; require identity-review evidence.')
        ], [source('assets/engine.js', 39, 58, 'normalization / RS person'), source('assets/engine.js', 117, 132, 'peopleIndex'), source('assets/engine.js', 1090, 1106, 'RS identity validation')]),
        node('Can an unresolved name publish?', [
          branch('NR entry-list name', 'Never auto-added; blocks until explicitly resolved or added.'),
          branch('Legacy NR classification-only name', 'Existing publish preparation can add a new profile automatically; read the lookalike warning first.'),
          branch('AI results', 'Resolved duplicate seats/credits/people are checked before staging. Aliases cannot be used to bypass collisions.')
        ], [source('assets/admin.js', 152, 180, 'preparePublishPeople / entryIdentityNotice'), source('assets/ai-import.js', 324, 338, 'resolved AI round validation')]),
        node('Does identity allow records to cross competition boundaries?', [
          branch('Shared profile only', 'Names, aliases and profile identity may be shared. Points, source classifications, minimum starts, status and championship rules do not cross.'),
          branch('Car/time association', 'Requires an explicit reviewed same-event match; never infer it from car alone.', 'rs-copy')
        ], [source('assets/engine.js', 845, 875, 'time-copy identity match'), source('docs/README.md', 25, 33, 'separate scoring models')])
      ], ['nr-credit', 'rs-members', 'rs-profiles']),
    topic('shared-publish', 'shared', 'Draft, validate, review, publish and conflict',
      'Navigating the admin does not publish. The explorer only reads its bundled explanation catalogue and never edits the draft.',
      'In-memory working documents; original text/versions; complete validators; authenticated user; revision and history.', [
        node('Has an admin only edited or navigated?', [
          branch('Yes', 'Changes stay in the current browser working draft. Navigation/RS task switches keep it. Closing, reload or signing out can lose unsaved work; download a private backup where appropriate.'),
          branch('Review & publish', 'Review diffs, resolve identities and run complete dataset/rule checks. Errors block; warnings require review. Demo never saves.')
        ], [source('assets/admin.js', 56, 103, 'working state / changes'), source('assets/admin.js', 1929, 1967, 'viewPublish')]),
        node('What is committed together?', [
          branch('Authorized publication', 'Working document updates, rebuilt public bundles, revision increment and attributed per-document before/after History are one atomic request with version preconditions.'),
          branch('Oversized operation', 'Refuse above 500 writes, safe 1 MiB document size or 10 MiB atomic request. No partial publish.')
        ], [source('assets/admin.js', 450, 478, 'buildWrites')]),
        node('Does every admin action use Review & publish?', [
          branch('Admin-list change', 'No. The existing admin-list save takes effect immediately through its own version-checked write. It is not part of publication History or a working-draft undo.'),
          branch('Provider access or configuration', 'Owner accounts, Auth, DNS, photos and provider settings are not recovered just by undoing a document publication.', 'shared-access')
        ], [source('assets/admin.js', 563, 566, 'saveAdmins'), source('docs/recovery.md', 1, 17, 'recovery boundary')]),
        node('Did another admin publish meanwhile?', [
          branch('Different documents', 'Reload their changes, preserve this draft and rerun validation before retrying.'),
          branch('Same changed document', 'Refuse overwrite. Preserve a private backup, reload and reconcile.'),
          branch('History undo / restore', 'Stages whole-document versions for review, not a full provider/photo/Auth recovery; loss warnings cover RS and entry evidence.')
        ], [source('assets/admin.js', 480, 556, 'rebase / publish / stageUndo'), source('assets/admin.js', 376, 417, 'restore loss guards')])
      ], ['shared-projection', 'shared-access']),
    topic('shared-projection', 'shared', 'What becomes public and how RS snapshots work',
      'The static admin UI and this catalogue are not confidential. Private review data relies on authentication and database rules, not a hidden link.',
      'Working site/people/season/round docs; explicit public projection; RS derived scoring; publicIdentity.', [
        node('Is this NR or RS public scoring?', [
          branch('NR', 'Publish raw classifications/settings. Each visitor computes NR points in buildSeason.'),
          branch('RS', 'Compute reviewed scores from private inputs during projection, store the scoring snapshot publicly, and consume that snapshot without reconstructing the private roster.'),
          branch('RS snapshot absent/malformed/incompatible', 'Report invalid/unavailable scoring, not a guessed recalculation from stripped inputs. Source classifications remain displayable.')
        ], [source('assets/admin.js', 437, 449, 'publicDocs'), source('assets/engine.js', 362, 447, 'buildRallyeSport / compatibility')]),
        node('Which RS inputs are stripped?', [
          branch('Season / event review', 'Remove manual exclusions, private starter/membership reviews, championship/applicability/double-points evidence and reviewed starter counts.'),
          branch('Result / row review', 'Remove finalityReview, invitation flags, startEvidence and identityReview. Keep reviewed role IDs only as publicIdentity, plus public scoring outcomes and finalityBasis.'),
          branch('Source evidence', 'Printed classification, public notes, mappings/mapping evidence and time-copy provenance remain source context; do not enter secrets there.')
        ], [source('assets/engine.js', 736, 766, 'projectRallyeSport')]),
        node('Is projection a generic secret scrubber?', [
          branch('No', 'Only known private fields are stripped. New fields require privacy review. Names, biographies, photos, links and public scoring outcomes are intentionally published.'),
          branch('Simulation', 'Starts from the public projection and removes the RS snapshot before private validation. It cannot reconstruct missing private eligibility inputs or reproduce real published RS scoring.')
        ], [source('assets/ai-import.js', 340, 347, 'projectPublic'), source('assets/admin.js', 342, 368, 'demo data / readPublished'), source('docs/decisions.md', 140, 141, 'projection limitation')])
      ], ['shared-access', 'rs-members', 'rs-totals']),
    topic('shared-calendar', 'shared', 'Empty seasons, dates and competition navigation',
      'Calendar labels describe supplied dates, not live event status, starts or official regulations. NR and RS use separate event lists under one selected competition.',
      'Selected season/competition; calendar dates and explicit links; published rounds; entry coverage; guide edition.', [
        node('Are results present for the selected season?', [
          branch('Calendar only / empty', 'Show supplied events/documents and entry evidence. Do not fabricate leaders, result counts, stage programmes, standings or MSA confirmation.'),
          branch('Published round available', 'Link to its source classification/graph and evidence-qualified points.'),
          branch('RS only', 'Keep independent RS results usable even without an NR round or result.')
        ], [source('docs/season-lifecycle.md', 90, 120, 'calendar-only lifecycle'), source('assets/site.js', 634, 646, 'empty NR standings'), source('assets/site.js', 939, 960, 'RS tables')]),
        node('What does a date-only calendar label mean?', [
          branch('Real ISO date', 'Compare against South Africa UTC+02 calendar day: Upcoming, Scheduled today, or Awaiting results. It does not activate a live notice.'),
          branch('Missing / invalid date', 'Date to be confirmed; do not infer a day or event start. RS display date parsing is presentation, not an SSR bulletin-date ruling.'),
          branch('Open tab crosses midnight', 'Navigation/refresh is needed to update labels; there is no automatic event-status feed.')
        ], [source('assets/site.js', 47, 78, 'calendarDate / calendarStatus'), source('docs/decisions.md', 116, 121, 'date limitations')]),
        node('Which context affects navigation?', [
          branch('NR/RS control', 'Switch competition-specific home, calendar, standings, crews, profile sports history and graphs. Never mix NR and RS series/statistics.'),
          branch('Year-qualified route', 'Select its archive; bare routes use in-page/default season. Keep stable person IDs across switching.'),
          branch('Guide', 'Bundled and database-independent, with an explicitly maintained 2026 reference edition. A new season does not update old technical/licensing guidance.')
        ], [source('docs/scoring-rules.md', 200, 219, 'public context'), source('docs/recovery.md', 176, 185, 'hash routes / guide')])
      ], ['shared-missing', 'nr-entries', 'shared-notices']),
    topic('shared-missing', 'shared', 'Missing data is not zero or a fallback archive',
      'The database is the results source. This catalogue explains behavior without loading, diagnosing or certifying a competitor\'s live data.',
      'Published site/people/season bundle responses; timing observations; result/score availability; selected route.', [
        node('Is the public database configured and available?', [
          branch('Not configured / unpublished / unavailable', 'Show an explicit setup, empty or failure state. Never substitute synthetic or bundled results. The independent disclaimer/guide can remain readable.'),
          branch('Known season bundle missing', 'Report that season as unpublished. An unknown year in a public URL is instead normalized to the configured default season; it does not create that year.'),
          branch('Success', 'Use published documents with no-store initial requests, then in-memory models. Reload for new publication.')
        ], [source('assets/site.js', 126, 171, 'public data loading'), source('assets/site.js', 310, 318, 'requested year fallback'), source('docs/recovery.md', 164, 185, 'runtime reconstruction')]),
        node('What are common distinct missing states?', [
          branch('No entry coverage', 'Unknown participation, not zero.', 'nr-entries'),
          branch('No stage time / printed stage rank', 'Graph gap or unavailable metric, not 0 time or an inferred rank.', 'rs-graphs'),
          branch('No scored RS event', 'Unavailable points, not zero. A ready eligible official DNF has zero points.', 'rs-points'),
          branch('NR DNF', 'A real zero-point start, not absence.', 'nr-starts')
        ], [source('assets/engine.js', 193, 197, 'NR result statuses'), source('assets/engine.js', 635, 652, 'RS missing points')])
      ], ['shared-projection', 'shared-calendar']),
    topic('shared-notices', 'shared', 'Public notice and analytics display boundaries',
      'These are site-operation decisions, not competition scoring. They apply without changing NR/RS standings or treating a calendar date as live timing.',
      'Explicit published activeRally/analytics settings; activation identity; visit bypass; local opt-out; sanitized route categories.', [
        node('Does the calendar date automatically trigger a live-rally notice?', [
          branch('No', 'An admin explicitly publishes the active-rally notice. Its independent site-settings loader keeps it on results/guide/error views.'),
          branch('Visitor continues', 'Visit-scoped bypass leaves a reminder. A changed activation reopens the notice; it is not permission to load live timing here.')
        ], [source('docs/decisions.md', 93, 96, 'D21 active rally')]),
        node('Can admin/explorer use be sent to real analytics?', [
          branch('Admin or simulation', 'Analytics is excluded. No analytics script is loaded by the admin shell.'),
          branch('Public analytics not explicitly enabled / invalid / opted out', 'Do not collect. Default startup suppression precedes any enabled provider runtime.'),
          branch('Enabled public analytics', 'Use manually sanitized generic routes, not raw person IDs/hash paths or full referrers. Synthetic verification must never forward to real collection.')
        ], [source('docs/decisions.md', 81, 87, 'D19 analytics'), source('docs/recovery.md', 129, 133, 'analytics architecture')])
      ], ['shared-access', 'shared-calendar']),
    topic('shared-access', 'shared', 'Admin access, static source and recovery limits',
      'The explorer lives inside the existing authenticated admin shell. Public source visibility is not private-data access.',
      'Google sign-in, verified-email allowlist, server-side database rules, simulation state, private backups and provider custody.', [
        node('Can a signed-out/non-admin visitor enter the UI?', [
          branch('No authorized session', 'Keep the sign-in/denied screen. A logic deep link must not bypass it.'),
          branch('Authorized admin', 'Use existing admin access; the explorer needs no new database permission, reads or writes.'),
          branch('Downloaded JavaScript', 'The repository and static catalogue are inspectable. Do not put credentials, account registers or private competitor evidence in them.')
        ], [source('assets/admin.js', 634, 641, 'render access gate'), source('docs/testing.md', 107, 114, 'access testing boundary')]),
        node('Does a local code task authorize provider actions?', [
          branch('No', 'No implied push, PR, deployment, rule/schema change or database publication. Direct authorized Firebase changes require atomic before/after attributed History, not a later note.'),
          branch('Recovery', 'Git alone cannot restore Firestore, photos, Auth, owners, DNS or provider config. Keep authorized private backups/source and access records outside the public repo.'),
          branch('Undo', 'Stages previous document content for review. It is not a full-project/photo-byte/provider restore.')
        ], [source('docs/recovery.md', 1, 16, 'recovery authorization'), source('docs/decisions.md', 120, 139, 'recovery limitations')])
      ], ['shared-publish', 'shared-projection']),
    topic('shared-limits', 'shared', 'Unsupported, unresolved and human-review boundaries',
      'This explorer documents the implemented decision paths, not every sporting regulation. It never invents a rule to fill a gap.',
      'Actual supported policy/profile and explicit review evidence; year; source order; unresolved rule clauses.', [
        node('Is a requested NR policy configurable?', [
          branch('Scales/classes/class-only exclusions/minStarts/calendar', 'Supported settings can represent these values. They are not automatic verification of the governing year\'s regulations.'),
          branch('Best-N, dropped/weighted rounds, bonuses, membership filter, independent co-driver scoring, new tie/DSQ/NC/restart semantics', 'Not supported by the NR capability policy. Requires code and regression coverage, not an approval checkbox.')
        ], [source('docs/scoring-rules.md', 222, 226, 'AI capabilities / fixed NR policies')]),
        node('Is the RS meaning documented and implemented?', [
          branch('Unresolved official within-class tie', 'Withhold event points; do not recompute the stage-time tie-break.', 'rs-order'),
          branch('Equal championship totals', 'Share rank; no invented season tie-break or winner.', 'rs-totals'),
          branch('Blank SSR 7.4 / 7.6, unknown finisher/awards/non-scoring category or future-year policy', 'No inferred qualification, per-class minimum or new-year rules. Obtain written clarification and implement/test where necessary.')
        ], [source('docs/scoring-rules.md', 141, 187, 'RS boundaries')]),
        node('Does a reviewed input prove external truth?', [
          branch('No', 'Code checks shape, supported policy and consistency. It cannot prove a source is complete, a workbook match correct, a technical inspection cleared or regulations current.'),
          branch('Catalogue maintenance', 'This is a manually curated explanation of the audited runtime, not an executable scorer or a live individual diagnosis. Re-audit source links and prose whenever processing changes.')
        ], [source('docs/data-entry-guide.md', 5, 20, 'human review'), source('docs/scoring-rules.md', 228, 230, 'review limitations')])
      ], ['nr-finality', 'rs-scope', 'shared-ai'])
  ];
  var catalogue = {
    baseline: 'bcb4c8a68f975c7f7bdfa725839de4f3d798d8bc',
    groups: [{ id: 'nr', label: 'Northern Regions', description: 'Raw results to points, starts, standings and display' },
      { id: 'rs', label: 'RallyeSport', description: 'Reviewed event gates and independent role scoring' },
      { id: 'shared', label: 'Shared workflow', description: 'Intake, identities, publication and honest display' }],
    topics: topics
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = catalogue;
  else root.NRAdminLogic = catalogue;
})(typeof window !== 'undefined' ? window : globalThis);
