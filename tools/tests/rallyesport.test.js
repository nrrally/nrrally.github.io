/* Synthetic RallyeSport fixtures only; no provider, database or live-result requests. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');

const ruleset = {
  code: 'clubman-sprint-2026-v1', year: 2026,
  title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
  version: 1, issueDate: '2026-07-09',
  sourceUrl: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf'
};
function fixture() {
  const people = { people: [] }, entries = [];
  for (let n = 1; n <= 15; n++) {
    people.people.push({ id: 'driver-' + n, name: 'Driver ' + n, aliases: [] });
    people.people.push({ id: 'codriver-' + n, name: 'Co-driver ' + n, aliases: [] });
    entries.push({
      car: String(n), driver: 'Driver ' + n, codriver: 'Co-driver ' + n, class: 'RS2',
      status: 'classified', pos: n, classPos: n, times: ['00:01.' + String(n).padStart(2, '0')],
      stagePos: [n], total: '00:01.' + String(n).padStart(2, '0'), penalty: null, invited: false
    });
  }
  const event = {
    id: 'legends', name: 'Synthetic Legends', dates: '2026-01-01', rulesetConfirmed: true,
    rulesetEvidence: 'Synthetic user-confirmed applicability', countsForChampionship: true,
    championshipEvidence: 'Synthetic championship evidence', doublePoints: false
  };
  const result = {
    id: 'legends-classification', eventId: event.id, title: 'Official RS classification',
    status: 'Final classification', stages: [{ id: 'ss1', label: 'SS1' }],
    source: { file: 'synthetic.pdf', url: 'https://example.com/synthetic.pdf' }, notes: [], entries
  };
  const data = { ruleset, events: [event], results: [result], nonScoringPeople: [],
    membershipReview: {
      sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic reviewed membership roster.',
      people: Object.fromEntries(people.people.map(person => [person.id, { status: 'eligible', basis: 'membership-sheet' }]))
    } };
  return { data, event, result, people };
}
function eventScore(f) {
  return E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people).results[0];
}
function seasonScore(f) {
  return E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
}
test('optional RS source vehicles validate and project without affecting scoring or NR', () => {
  const f = fixture(), season = F.season(2026), before = seasonScore(f);
  f.result.entries[0].vehicle = 'Synthetic RS hatchback';
  assert.deepEqual(E.validateRallyeSport(f.data, season, {}, f.people), []);
  assert.deepEqual(seasonScore(f), before);
  const projected = AI.projectPublic({ ...season, rallyesport: f.data }, f.people);
  assert.equal(projected.rallyesport.results[0].entries[0].vehicle, 'Synthetic RS hatchback');
  assert.equal(projected.rallyesport.results[0].entries[1].vehicle, undefined);
  const nrBefore = E.buildSeason({ season, rounds: {}, people: f.people });
  const nrAfter = E.buildSeason({ season: { ...season, rallyesport: f.data }, rounds: {}, people: f.people });
  delete nrBefore.rallyesport; delete nrAfter.rallyesport;
  assert.deepEqual(nrAfter, nrBefore);
  f.result.entries[0].vehicle = { model: 'Invalid shape' };
  assert.ok(E.validateRallyeSport(f.data, season, {}, f.people).some(issue => /source vehicle/.test(issue.msg)));
  f.result.entries[0].vehicle = 'x'.repeat(201);
  assert.ok(E.validateRallyeSport(f.data, season, {}, f.people).some(issue => /source vehicle/.test(issue.msg)));
  delete f.result.entries[0].vehicle;
  assert.deepEqual(seasonScore(f), before);
});
test('reviewed entry-based policy scores both roles without membership, licence, invitation or manual exclusions', () => {
  const f = F.revisedRallyeSport(), before = JSON.stringify(f.data);
  assert.deepEqual(E.validateRallyeSport(f.data, f.season, {}, f.people), []);
  const scoring = E.calculateRallyeSportScoring(f.data, f.season, f.people);
  assert.equal(scoring.status, 'blocked', 'upcoming championship classification is not invented');
  assert.equal(scoring.standings, null);
  assert.deepEqual(scoring.results.map(row => row.eventId), ['rs-r2', 'rs-r3', 'rs-r4', 'rs-r5']);
  assert.equal(scoring.results[3].status, 'blocked');
  for (const row of scoring.results.slice(0, 3)) {
    assert.equal(row.status, 'ready');
    assert.deepEqual(row.entries.slice(0, 3).map(entry => [entry.driverPoints, entry.codriverPoints]),
      [[15, 15], [12, 12], [10, 10]]);
    for (const entry of row.entries) for (const role of ['driver', 'codriver']) {
      assert.equal(entry[role + 'Eligibility'].status, 'eligible');
      assert.ok(['RS2', 'RS4'].includes(entry[role + 'Eligibility'].scoringClass));
      assert.equal(entry[role + 'Eligibility'].membershipStatus, undefined);
    }
    assert.equal(row.entries[7].driverPoints, 0, 'evidenced DNF');
    assert.equal(row.entries[7].codriverPoints, 0);
    assert.equal(row.entries[8].driverPoints, null, 'unproven DNF');
    assert.equal(row.entries[8].codriverPoints, null);
    assert.equal(row.entries[9].driverPoints, null, 'DNS');
    assert.equal(row.entries[9].codriverPoints, null);
  }
  assert.equal(scoring.provisionalStandings.overallDrivers[0].points, 45);
  assert.equal(scoring.provisionalStandings.overallCodrivers[0].points, 45);
  assert.deepEqual(scoring.provisionalStandings.classDrivers.RS0, []);
  assert.deepEqual(scoring.provisionalStandings.classCodrivers.RS0, []);
  assert.equal(JSON.stringify(f.data), before, 'private legacy evidence and source rows are not rewritten');
  f.data.membershipReview.reviewed = false;
  f.data.membershipReview.evidence = '';
  assert.deepEqual(E.validateRallyeSport(f.data, f.season, {}, f.people), [],
    'inactive evidence does not require a fabricated membership verification');
  assert.deepEqual(E.calculateRallyeSportScoring(f.data, f.season, f.people), scoring);
  delete f.data.membershipReview;
  assert.deepEqual(E.calculateRallyeSportScoring(f.data, f.season, f.people), scoring, 'roster not required');
  const complete = F.revisedRallyeSport(true);
  const four = E.calculateRallyeSportScoring(complete.data, complete.season, complete.people);
  assert.equal(four.status, 'incomplete');
  assert.equal(four.standings, null);
  assert.match(four.reason, /six to eight rounds/);
  assert.equal(four.provisionalStandings.overallDrivers[0].points, 60);
});
test('entry-based projection agrees with working computations, preserves launch source and strips private policy/evidence', () => {
  const f = F.revisedRallyeSport(true);
  const working = E.buildSeason({ season: f.season, people: f.people });
  const projection = AI.projectPublic(f.season, f.people);
  const publicModel = E.buildSeason({ season: projection, people: f.people, publicProjection: true });
  assert.deepEqual(publicModel.rallyesport.scoring, working.rallyesport.scoring);
  assert.deepEqual(projection.rallyesport.eligibilityPolicy, { code: 'entry-based-2026-v1' });
  assert.equal(projection.rallyesport.scoring.membershipReviewApplied, undefined);
  assert.equal(projection.rallyesport.membershipReview, undefined);
  assert.equal(projection.rallyesport.nonScoringPeople, undefined);
  assert.ok(!JSON.stringify(projection).includes('Synthetic private'));
  assert.ok(!JSON.stringify(projection).includes('Synthetic explicit launch-only'));
  assert.equal(projection.rallyesport.events[0].countsForChampionship, false);
  assert.equal(projection.rallyesport.events[0].roundNumber, undefined);
  const row = projection.rallyesport.results[0].entries[0];
  assert.equal(row.publicLaunchNonScoring, true);
  assert.equal(row.launchNonScoringReview, undefined);
  assert.equal(row.class, 'TEST');
  assert.equal(row.status, 'TEST');
  assert.deepEqual(row.times, ['01:00.1']);
  const graphSource = F.copy(projection.rallyesport.results[0]);
  graphSource.stages[0].nrStage = 'ss1';
  const graph = E.buildRallyeSportGraph(graphSource, ['ss1'], 'loss');
  assert.equal(graph[0].values[0], 0);
  assert.deepEqual(graph[0].entry.times, row.times);
  const nrWorking = { ...working }; delete nrWorking.rallyesport;
  const nrOnly = E.buildSeason({ season: { ...f.season, rallyesport: undefined }, people: f.people });
  delete nrOnly.rallyesport;
  assert.deepEqual(nrWorking, nrOnly);
  for (const mutate of [
    p => { p.rallyesport.scoring.eligibilityPolicyApplied = 'unknown'; },
    p => { p.rallyesport.scoring.results[0].entries[0].driverEligibility.scoringClass = 'RS0'; },
    p => { p.rallyesport.events[0].countsForChampionship = true; },
    p => { p.rallyesport.events[0].roundNumber = 1; },
    p => { delete p.rallyesport.results[0].entries[0].publicLaunchNonScoring; }
  ]) {
    const bad = F.copy(projection); mutate(bad);
    assert.equal(E.buildSeason({ season: bad, people: f.people, publicProjection: true }).rallyesport.scoring.status, 'invalid');
  }
});
test('entry-based validation refuses unsupported TEST/status mappings and launch exceptions outside their source event', () => {
  for (const mutate of [
    f => { f.data.eligibilityPolicy.evidence = ''; },
    f => { f.data.eligibilityPolicy.reviewed = false; },
    f => { f.data.eligibilityPolicy.code = 'unknown'; },
    f => { f.season.year = 2027; },
    f => { f.data.events[0].roundNumber = 1; },
    f => { delete f.data.events[0].countsForChampionship; },
    f => { f.data.results[1].entries[0].status = 'TEST'; },
    f => { f.data.results[1].entries[0].class = 'TEST'; },
    f => { f.data.results[1].entries[0].status = 'nonsense'; },
    f => { f.data.results[1].entries[0].class = 'RS0'; },
    f => { f.data.results[1].entries[0].launchNonScoringReview = { evidence: 'Not a launch' }; },
    f => { f.data.results[0].entries[0].launchNonScoringReview.evidence = ''; },
    f => { delete f.data.results[0].entries[0].launchNonScoringReview; }
  ]) {
    const f = F.revisedRallyeSport(); mutate(f);
    assert.ok(E.validateRallyeSport(f.data, f.season, {}, f.people).some(issue => issue.level === 'error'));
    assert.ok(AI.validateDocuments(f.docs).some(issue => issue.level === 'error'), 'restore/import publish boundary uses shared validation');
  }
  for (const [field, value] of [['status', 'TEST'], ['status', 'nonsense'], ['class', 'TEST'], ['class', 'RS0']]) {
    const f = F.revisedRallyeSport(); f.data.results[1].entries[0][field] = value;
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results[0].status, 'blocked');
  }
  const f = F.revisedRallyeSport();
  f.data.results[1].entries[0].codriver = '';
  assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results[0].entries[0].codriverPoints, null);
});
test('2026 role-specific scoring applies the SSR class scale and toggle never changes official order', () => {
  const f = fixture();
  let score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.deepEqual(score.entries.slice(0, 3).map(({ car, driverPoints, codriverPoints }) => ({ car, driverPoints, codriverPoints })), [
    { car: '1', driverPoints: 15, codriverPoints: 15 },
    { car: '2', driverPoints: 12, codriverPoints: 12 },
    { car: '3', driverPoints: 10, codriverPoints: 10 }
  ]);
  assert.equal(score.entries[10].driverPoints, 1);
  assert.equal(score.entries[14].codriverPoints, 1);
  f.data.nonScoringPeople = ['driver-1'];
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 15);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[1].codriverPoints, 12);
  assert.equal(f.result.entries[0].pos, 1);
  f.data.nonScoringPeople = ['codriver-1'];
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 15);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(score.entries[1].codriverPoints, 15);
  f.data.nonScoringPeople = [];
  assert.equal(eventScore(f).entries[0].driverPoints, 15);
});
test('invitational exclusion is distinct from member toggle and eligible order shifts per role', () => {
  const f = fixture();
  f.result.entries[0].invited = true;
  const score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[1].codriverPoints, 15);
});
test('membership exclusions are role-specific, retain the partner order, and appear as RS0 at zero points', () => {
  const f = fixture();
  f.data.membershipReview.people['driver-1'].status = 'non-member';
  const scoring = seasonScore(f);
  const row = scoring.results[0].entries[0];
  assert.equal(row.driverPoints, 0);
  assert.equal(row.codriverPoints, 15);
  assert.equal(row.driverEligibility.scoringClass, 'RS0');
  assert.equal(row.driverEligibility.scoringPosition, null);
  assert.equal(row.codriverEligibility.scoringPosition, 1);
  assert.equal(scoring.results[0].status, 'ready');
  assert.equal(f.result.entries[0].pos, 1);
  assert.equal(f.result.entries[0].class, 'RS2');
  const standings = scoring.standings || scoring.provisionalStandings;
  const excluded = standings.overallDrivers.find(person => person.id === 'driver-1');
  assert.equal(excluded.rank, null);
  assert.equal(excluded.points, 0);
  assert.equal(excluded.scoringClass, 'RS0');
  assert.match(excluded.eligibilityReason, /confirmed as a non-member/);
  assert.equal(standings.overallCodrivers.find(person => person.id === 'codriver-1').rank, 1);
  const sourceEntry = JSON.parse(JSON.stringify(f.result.entries[0]));
  const projected = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  assert.equal(projected.rallyesport.membershipReview, undefined);
  assert.equal(JSON.stringify(projected).includes('Synthetic reviewed membership roster'), false);
  assert.deepEqual(
    (({ status, class: sourceClass, pos, classPos, times }) => ({ status, class: sourceClass, pos, classPos, times }))(projected.rallyesport.results[0].entries[0]),
    (({ status, class: sourceClass, pos, classPos, times }) => ({ status, class: sourceClass, pos, classPos, times }))(sourceEntry),
    'public scoring preserves the source role order, class, position and timing'
  );
  assert.equal(projected.rallyesport.scoring.results[0].entries[0].driverPoints, 0);
  assert.equal(projected.rallyesport.scoring.results[0].entries[0].codriverPoints, 15);
});
test('per-entry identity reviews resolve eligibility before membership lookup and aggregate under the canonical ID', () => {
  const f = fixture();
  const canonical = { id: 'canonical-reviewed-person', name: 'Canonical Synthetic Person', aliases: [] };
  f.people.people.push(canonical);
  f.data.membershipReview.people[canonical.id] = { status: 'eligible', basis: 'membership-sheet' };
  f.data.events = [];
  f.data.results = [];
  for (let round = 1; round <= 2; round++) {
    const event = { ...f.event, id: 'identity-event-' + round };
    const result = { ...f.result, id: 'identity-result-' + round, eventId: event.id,
      entries: f.result.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) };
    result.entries[0].driver = 'Unmatched printed spelling ' + round;
    result.entries[0].identityReview = {
      driverId: canonical.id,
      evidence: 'Synthetic per-entry identity confirmation'
    };
    f.data.events.push(event);
    f.data.results.push(result);
  }
  const scoring = seasonScore(f);
  assert.equal(scoring.results[0].entries[0].driverEligibility.status, 'eligible');
  assert.equal(scoring.results[1].entries[0].driverEligibility.status, 'eligible');
  const standings = scoring.standings || scoring.provisionalStandings;
  const person = standings.overallDrivers.find(row => row.id === canonical.id);
  assert.equal(person.points, 30);
  assert.equal(person.rank, 1);
  assert.equal(f.data.results[0].entries[0].driver, 'Unmatched printed spelling 1',
    'printed source names remain unchanged');
});
test('reviewed membership statuses require valid provenance and unknown decisions fail closed', () => {
  const invalidReviews = [
    null,
    { sourceDate: '2026-11-09', reviewed: false, evidence: 'Synthetic review', people: {} },
    { sourceDate: '2026-11-09', reviewed: true, evidence: '', people: {} },
    { sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic review', people: [] },
    { sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic review', people: {
      'missing-profile': { status: 'eligible', basis: 'membership-sheet' }
    } },
    { sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic review', people: {
      'driver-1': { status: 'eligible', basis: 'user-confirmed' }
    } },
    { sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic review', people: {
      'driver-1': { status: 'unknown', basis: 'membership-sheet' }
    } }
  ];
  invalidReviews.forEach(review => {
    const f = fixture();
    f.data.membershipReview = review;
    assert.equal(seasonScore(f).status, 'invalid');
    assert.ok(E.validateRallyeSport(f.data, F.season(2026), {}, f.people)
      .some(issue => /membership review|membership decision/.test(issue.msg)));
  });
  const missingReview = fixture();
  delete missingReview.data.membershipReview;
  assert.equal(seasonScore(missingReview).status, 'invalid');

  const unlisted = fixture();
  delete unlisted.data.membershipReview.people['driver-1'];
  let score = eventScore(unlisted);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].driverEligibility.status, 'unverified');
  assert.equal(score.entries[0].driverEligibility.membershipStatus, 'unverified');
  for (const [status, reason] of [
    ['missing-license', /licence evidence is missing/],
    ['missing-membership-reference', /membership reference evidence is missing/],
    ['profile-incomplete', /profile is not complete/]
  ]) {
    const f = fixture();
    f.data.membershipReview.people['driver-1'].status = status;
    score = eventScore(f);
    assert.equal(score.entries[0].driverPoints, 0);
    assert.equal(score.entries[0].driverEligibility.membershipStatus, status);
    assert.match(score.entries[0].driverEligibility.reason, reason);
  }
  const future = fixture();
  assert.equal(E.calculateRallyeSportScoring(future.data, { year: 2027 }, future.people).status, 'unconfigured');
});
test('championship totals require the SSR round-count pattern and use shared class points for overall tables', () => {
  function seasonFixture(roundCount, doubleRounds) {
    const f = fixture();
    f.data.events = [];
    f.data.results = [];
    for (let n = 1; n <= roundCount; n++) {
      const event = { ...f.event, id: 'event-' + n, name: 'Synthetic event ' + n, doublePoints: doubleRounds.includes(n),
        doublePointsEvidence: doubleRounds.includes(n) ? 'Synthetic bulletin evidence' : undefined,
        startDate: '2026-02-01', doublePointsBulletinDate: doubleRounds.includes(n) ? '2026-01-18' : undefined };
      const result = { ...f.result, id: 'result-' + n, eventId: event.id,
        entries: f.result.entries.map(entry => ({ ...entry, pos: entry.pos, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) };
      f.data.events.push(event); f.data.results.push(result);
    }
    return f;
  }
  let f = seasonFixture(6, []);
  let score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.status, 'ready');
  assert.equal(score.standings.overallDrivers[0].points, 90);
  assert.equal(score.standings.classDrivers.RS2[0].points, 90);
  assert.equal(score.standings.overallCodrivers[0].points, 90);
  f = seasonFixture(5, [3]);
  score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.status, 'ready');
  assert.equal(score.standings.overallDrivers[0].points, 90);
  f.data.events[2].doublePointsBulletinDate = '2026-01-19';
  score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.status, 'blocked');
  assert.match(score.results.find(row => row.eventId === 'event-3').reason, /at least 14 days/);
  assert.ok(E.validateRallyeSport(f.data, F.season(2026), {}, f.people).some(issue => /at least 14 days/.test(issue.msg)));
  f.data.events[2].doublePointsBulletinDate = '2026-01-18';
  delete f.data.events[2].startDate;
  score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.status, 'blocked');
  assert.match(score.results.find(row => row.eventId === 'event-3').reason, /valid event start and bulletin issue dates/);
  assert.ok(E.validateRallyeSport(f.data, F.season(2026), {}, f.people).some(issue => /event start and bulletin issue dates/.test(issue.msg)));
  f = seasonFixture(5, []);
  assert.equal(E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people).status, 'incomplete');
  f = seasonFixture(6, [2]);
  score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.status, 'blocked');
  assert.equal(score.results.find(row => row.eventId === 'event-2').status, 'blocked');
  assert.match(score.results.find(row => row.eventId === 'event-2').reason, /only for a five-round championship/);
  f = seasonFixture(5, [2, 4]);
  assert.equal(E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people).status, 'blocked');
  f = seasonFixture(9, []);
  assert.equal(E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people).status, 'blocked');
});
test('standalone 2026 RS R5 projection scores only reviewed single points and preserves NR records/model', () => {
  const f = fixture(), season = F.season(2026), nrRound = F.payload('results', 2026).rounds[0];
  const rounds = { [nrRound.id]: nrRound };
  const nrRawBefore = JSON.stringify({ season, rounds });
  const withoutRs = E.buildSeason({ season, rounds, people: f.people });
  const nrSnapshot = model => {
    const copy = { ...model };
    delete copy.rallyesport;
    return JSON.stringify(copy);
  };
  const nrModelBefore = nrSnapshot(withoutRs);
  f.data.events = [];
  f.data.results = [];
  for (let n = 1; n <= 5; n++) {
    const event = { ...f.event, id: 'scenario-rs-r' + n, roundNumber: n,
      name: n === 5 ? 'Synthetic standalone RS R5' : 'Synthetic completed RS R' + n,
      dates: 'Synthetic 2026 date', nrEventId: undefined, doublePoints: false };
    const result = { ...f.result, id: event.id + '-classification', eventId: event.id,
      title: 'Synthetic final RS R' + n + ' classification', status: 'Final classification',
      nrRoundId: undefined, entries: f.result.entries.map(entry => ({
        ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice()
      })) };
    f.data.events.push(event);
    f.data.results.push(result);
  }
  season.rallyesport = f.data;
  assert.deepEqual(E.validateSeason(season, rounds, f.people), [],
    'the reviewed standalone R5 source record is valid without an NR event, round or stage');
  const working = E.buildSeason({ season, rounds, people: f.people });
  const workingR5 = working.rallyesport.scoring.results.find(row => row.eventId === 'scenario-rs-r5');
  assert.equal(workingR5.status, 'ready',
    'R5 points require the supported ruleset, event applicability/championship review, source-final classification and supported starter evidence');
  assert.equal(workingR5.entries[0].driverPoints, 15,
    'no double-points bulletin means R5 retains the single-point scale');
  assert.equal(working.rallyesport.scoring.status, 'incomplete');
  assert.equal(working.rallyesport.scoring.standings, null);
  assert.match(working.rallyesport.scoring.reason, /Five rounds require exactly one bulletin-confirmed double-points event/);
  assert.ok(working.rallyesport.scoring.provisionalStandings,
    'provisional totals remain distinguishable from unavailable final championship standings');
  assert.equal(nrSnapshot(working), nrModelBefore,
    'adding the RS R5 event leaves the complete NR model unchanged');
  assert.equal(JSON.stringify({ season: { ...season, rallyesport: undefined }, rounds }), nrRawBefore,
    'working/projection processing leaves the 2026 NR season and raw result record unchanged');
  assert.equal(f.data.events[4].nrEventId, undefined);
  assert.equal(f.data.results[4].nrRoundId, undefined);

  const published = AI.projectPublic(season, f.people);
  const publicR5 = published.rallyesport.scoring.results.find(row => row.eventId === 'scenario-rs-r5');
  assert.equal(publicR5.status, 'ready');
  assert.equal(publicR5.entries[0].driverPoints, 15);
  assert.equal(published.rallyesport.scoring.status, 'incomplete');
  assert.equal(published.rallyesport.scoring.standings, null);
  assert.equal(published.rallyesport.events[4].doublePoints, undefined,
    'private bulletin decision metadata is not exposed as public evidence');
  assert.equal(published.rallyesport.results[4].status, 'Final classification');
  assert.equal(published.rallyesport.results[4].entries[0].pos, 1);
  assert.deepEqual(published.rallyesport.results[4].entries[0].times, ['00:01.01']);
  assert.equal(published.rallyesport.results[4].nrRoundId, undefined);
  const publicModel = E.buildSeason({ season: published, rounds, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.scoring.status, 'incomplete');
  assert.deepEqual(publicModel.rallyesport.scoring.results.find(row => row.eventId === 'scenario-rs-r5'), publicR5);
  assert.equal(nrSnapshot(publicModel), nrModelBefore,
    'consuming the published RS snapshot also leaves the full NR model unchanged');
  assert.equal(JSON.stringify({ season: { ...season, rallyesport: undefined }, rounds }), nrRawBefore,
    'public projection leaves the source 2026 NR records unchanged too');

  const unsupported = JSON.parse(JSON.stringify(season));
  unsupported.rallyesport.events[4].rulesetConfirmed = false;
  const unsupportedScore = E.buildSeason({ season: unsupported, rounds, people: f.people }).rallyesport.scoring;
  assert.equal(unsupportedScore.results.find(row => row.eventId === 'scenario-rs-r5').status, 'blocked',
    'without positive event applicability review, R5 cannot score');
  assert.equal(unsupportedScore.results.find(row => row.eventId === 'scenario-rs-r5').entries.length, 0);
});
test('equal season totals share a rank without a fabricated season tie-break order', () => {
  const f = fixture();
  for (let round = 1; round <= 6; round++) {
    const event = { ...f.event, id: 'round-' + round };
    const result = { ...f.result, id: 'classification-' + round, eventId: event.id,
      entries: f.result.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) };
    if (round % 2 === 0) {
      result.entries[0].pos = 2; result.entries[1].pos = 1;
      result.entries[0].classPos = 2; result.entries[1].classPos = 1;
    }
    f.data.events.push(event); f.data.results.push(result);
  }
  f.data.events.shift(); f.data.results.shift();
  const score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  const first = score.standings.overallDrivers.filter(row => row.id === 'driver-1')[0];
  const second = score.standings.overallDrivers.filter(row => row.id === 'driver-2')[0];
  assert.equal(first.points, second.points);
  assert.equal(first.rank, second.rank);
  assert.match(score.reason, /season tie-breaks are unresolved/);
});
test('source-evidenced started DNF publishes zero points and counts as a starter; unproven DNF, DNS and TEST stay distinct', () => {
  const f = fixture();
  f.result.entries[14].status = 'DNS';
  f.result.entries[14].pos = null;
  f.result.entries[14].total = null;
  let score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /Fewer than 15/);
  f.result.entries[14].status = 'classified';
  f.result.entries[14].pos = 15;
  f.result.entries[14].classPos = 15;
  f.result.entries[14].total = '00:01.15';
  f.result.entries[0].status = 'DNF';
  f.result.entries[0].pos = null;
  f.result.entries[0].classPos = null;
  f.result.entries[0].total = null;
  score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(score.entries[1].driverPoints, 15);

  f.result.entries[0].times = [null];
  f.result.entries[0].stagePos = [null];
  f.result.entries[14].status = 'DNS';
  f.result.entries[14].pos = null;
  f.result.entries[14].total = null;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /cannot be confirmed.*DNF has no recorded start evidence/);
  f.event.starterCount = 15;
  f.event.starterCountEvidence = 'Synthetic official entry count';
  score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, null);
  f.result.entries[0].startEvidence = 'Synthetic source-listed start';
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  f.result.entries[0].status = 'DNS';
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, null);
  f.result.entries[0].status = 'TEST';
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  f.result.entries[0].status = 'DNF';
  delete f.result.entries[0].startEvidence;
  f.event.starterCount = 14;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /below 15/);

  delete f.event.starterCount;
  delete f.event.starterCountEvidence;
  f.result.entries[0].status = 'classified';
  f.result.entries[0].pos = 2;
  f.result.entries[0].classPos = 2;
  f.result.entries[14].status = 'classified';
  f.result.entries[14].classPos = 15;
  f.result.entries[0].total = '00:01.01';
  f.result.entries[14].pos = 15;
  f.result.entries[14].total = '00:01.15';
  f.result.entries[1].pos = 2;
  f.result.entries[0].classPos = 2;
  f.result.entries[1].classPos = 2;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /tied scoring position remains unresolved/);
});
test('started DNF zeroes require an eligible known role in a supported class', () => {
  const f = fixture();
  const dnf = f.result.entries[0];
  dnf.status = 'DNF';
  dnf.pos = null;
  dnf.classPos = null;
  dnf.total = null;

  f.data.nonScoringPeople = ['driver-1'];
  let score = eventScore(f);
  const firstResult = seasonScore(f);
  const firstStandings = firstResult.standings || firstResult.provisionalStandings;
  assert.ok(firstStandings, score.reason);
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(score.entries[0].driverEligibility.status, 'manual-exclusion');
  assert.equal(firstStandings.overallDrivers.find(row => row.id === 'driver-1').rank, null);
  assert.equal(firstStandings.overallDrivers.find(row => row.id === 'driver-1').points, 0);
  assert.equal(firstStandings.overallCodrivers.find(row => row.id === 'codriver-1').points, 0);

  f.data.nonScoringPeople = [];
  dnf.invited = true;
  score = eventScore(f);
  const invitedResult = seasonScore(f);
  const invitedStandings = invitedResult.standings || invitedResult.provisionalStandings;
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(invitedStandings.overallDrivers.find(row => row.id === 'driver-1').rank, null);

  dnf.invited = false;
  dnf.driver = 'Unreviewed DNF driver';
  score = eventScore(f);
  const unknownResult = seasonScore(f);
  const unknownStandings = unknownResult.standings || unknownResult.provisionalStandings;
  assert.equal(score.entries[0].driverPoints, 0, 'unresolved membership is non-scoring rather than assumed eligible');
  assert.equal(score.entries[0].codriverPoints, 0);
  const unknownStanding = unknownStandings.overallDrivers.find(row => row.id === E.slug(dnf.driver));
  assert.equal(unknownStanding.rank, null);
  assert.equal(unknownStanding.points, 0);

  dnf.driver = 'Driver 1';
  dnf.class = 'UNCONFIGURED';
  score = eventScore(f);
  const unsupportedResult = seasonScore(f);
  const unsupportedStandings = unsupportedResult.standings || unsupportedResult.provisionalStandings;
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, null);
  assert.equal(score.entries[0].driverEligibility.scoringClass, 'UNCONFIGURED');
  assert.equal(score.entries[0].codriverEligibility.scoringClass, 'UNCONFIGURED');
  assert.ok(unsupportedStandings.classDrivers.UNCONFIGURED === undefined);
});
test('the evidence-backed 2026 six-starter review changes only the RS event threshold', () => {
  function setNonTestStarters(f, count) {
    f.result.entries.forEach((entry, index) => {
      if (index < count) {
        entry.status = 'classified';
        entry.pos = index + 1;
        entry.classPos = index + 1;
        entry.total = '00:01.' + String(index + 1).padStart(2, '0');
        entry.times = ['00:01.' + String(index + 1).padStart(2, '0')];
        entry.stagePos = [index + 1];
        return;
      }
      entry.status = 'DNS';
      entry.pos = null;
      entry.classPos = null;
      entry.total = null;
      entry.times = [null];
      entry.stagePos = [null];
    });
  }
  function review(f) {
    f.data.starterMinimumReview = {
      minimum: 6,
      reviewed: true,
      evidence: 'Synthetic provenance for a user-reported 2026 review; no written amendment supplied.'
    };
  }

  const baseline = fixture();
  setNonTestStarters(baseline, 14);
  assert.equal(eventScore(baseline).status, 'blocked', 'without a review, the printed SSR V1 minimum remains 15');
  setNonTestStarters(baseline, 15);
  assert.equal(eventScore(baseline).status, 'ready');

  const revised = fixture();
  review(revised);
  setNonTestStarters(revised, 5);
  let score = eventScore(revised);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /Fewer than 6 source-backed starters/);
  setNonTestStarters(revised, 6);
  assert.equal(eventScore(revised).status, 'ready', 'exactly six evidenced starters meet the review');
  setNonTestStarters(revised, 14);
  assert.equal(eventScore(revised).status, 'ready');

  const unknownDnf = fixture();
  review(unknownDnf);
  setNonTestStarters(unknownDnf, 5);
  const dnf = unknownDnf.result.entries[5];
  dnf.status = 'DNF';
  score = eventScore(unknownDnf);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /6-starter requirement cannot be confirmed.*DNF has no recorded start evidence/);
  dnf.startEvidence = 'Synthetic source-listed start';
  score = eventScore(unknownDnf);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[5].driverPoints, 0);

  const testBoundary = fixture();
  review(testBoundary);
  setNonTestStarters(testBoundary, 5);
  testBoundary.result.entries[5].status = 'TEST';
  score = eventScore(testBoundary);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /Fewer than 6 source-backed starters, including TEST and invitational entries/);
  testBoundary.result.entries[5].startEvidence = 'Synthetic source-listed TEST start';
  testBoundary.event.starterCount = 5;
  testBoundary.event.starterCountEvidence = 'Synthetic older count excluding the TEST row';
  score = eventScore(testBoundary);
  assert.equal(score.status, 'blocked',
    'a reviewed count that predates the inclusive TEST-starter rule conflicts with the evidenced total');
  assert.match(score.reason, /starter count is invalid, unsupported or conflicts with source-backed starter evidence/);
  testBoundary.event.starterCount = 6;
  testBoundary.event.starterCountEvidence = 'Synthetic reviewed count including the evidenced TEST start';
  score = eventScore(testBoundary);
  assert.equal(score.status, 'ready', 'a TEST entry counts toward the minimum only with start evidence');
  assert.equal(score.entries[5].driverPoints, 0);
  setNonTestStarters(testBoundary, 6);
  testBoundary.result.entries[6].status = 'TEST';
  score = eventScore(testBoundary);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[6].driverPoints, 0, 'TEST remains non-scoring even when the starter threshold is met');

  const unsupportedStatus = fixture();
  review(unsupportedStatus);
  setNonTestStarters(unsupportedStatus, 6);
  unsupportedStatus.result.entries[6].status = 'DSQ';
  score = eventScore(unsupportedStatus);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /source status has no configured championship semantics/);
});
test('R1-R4 event points use the reviewed minimum, preserve R2-R4 points, and never finalize the season', () => {
  const f = fixture();
  f.data.events = [];
  f.data.results = [];
  for (let round = 1; round <= 4; round++) {
    const event = { ...f.event, id: 'synthetic-rs-r' + round, roundNumber: round };
    const result = { ...f.result, id: 'synthetic-rs-result-' + round, eventId: event.id,
      entries: f.result.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) };
    if (round === 1) {
      const last = result.entries[14];
      last.status = 'DNS'; last.pos = null; last.classPos = null; last.total = null;
      last.times = [null]; last.stagePos = [null];
    }
    f.data.events.push(event);
    f.data.results.push(result);
  }
  const before = seasonScore(f);
  assert.equal(before.results.find(row => row.eventId === 'synthetic-rs-r1').status, 'blocked');
  const unchangedRounds = before.results.filter(row => /^synthetic-rs-r[234]$/.test(row.eventId));
  assert.equal(unchangedRounds.length, 3);
  f.data.starterMinimumReview = {
    minimum: 6,
    reviewed: true,
    evidence: 'Synthetic provenance for a user-reported 2026 review; no written amendment supplied.'
  };
  const after = seasonScore(f);
  assert.equal(after.results.filter(row => row.status === 'ready').length, 4);
  assert.deepEqual(after.results.filter(row => /^synthetic-rs-r[234]$/.test(row.eventId)), unchangedRounds,
    'R2-R4 event points and order remain identical');
  assert.equal(after.results.find(row => row.eventId === 'synthetic-rs-r1').entries[0].driverPoints, 15);
  assert.equal(after.starterMinimum.minimum, 6);
  assert.equal(after.starterMinimum.basis, 'user-reported-review');
  assert.equal(after.status, 'incomplete', 'four eligible event rounds do not satisfy the season round-count rule');
  assert.equal(after.standings, null, 'the change does not declare final championship standings');
  assert.ok(after.provisionalStandings);

  const season = { ...F.season(2026), rallyesport: f.data };
  const sourceRules = JSON.parse(JSON.stringify(f.data.ruleset));
  const nrRound = F.payload('results', 2026).rounds[0];
  const rounds = { [nrRound.id]: nrRound };
  const baseModel = E.buildSeason({ season: F.season(2026), rounds, people: f.people });
  const publicSeason = AI.projectPublic(season, f.people);
  assert.deepEqual(publicSeason.rallyesport.ruleset, sourceRules, 'the printed SSR source record remains unchanged');
  assert.equal(publicSeason.rallyesport.starterMinimumReview, undefined, 'private review evidence is not published');
  assert.deepEqual(publicSeason.rallyesport.scoring.starterMinimum, { minimum: 6, basis: 'user-reported-review' });
  assert.equal(publicSeason.rallyesport.scoring.status, 'incomplete');
  const publicModel = E.buildSeason({ season: publicSeason, rounds, people: f.people, publicProjection: true });
  assert.deepEqual(publicModel.rallyesport.scoring.results, after.results);
  const nrOnly = model => {
    const copy = JSON.parse(JSON.stringify(model));
    delete copy.rallyesport;
    return copy;
  };
  assert.deepEqual(nrOnly(publicModel), nrOnly(baseModel), 'the full NR model remains unchanged');
});
test('starter-minimum review evidence fails closed and never configures another year', () => {
  const invalidReviews = [
    null,
    { minimum: 6, evidence: '' },
    { minimum: 6, reviewed: false, evidence: 'Synthetic unreviewed report' },
    { minimum: 6, evidence: 'Synthetic evidence without explicit review' },
    { minimum: 6, evidence: '   ' },
    { minimum: 15, evidence: 'Synthetic wrong value' },
    { minimum: 6, evidence: 'Synthetic evidence', source: 'unsupported field' },
    'six'
  ];
  invalidReviews.forEach(review => {
    const f = fixture();
    f.data.starterMinimumReview = review;
    assert.equal(seasonScore(f).status, 'invalid');
    assert.ok(E.validateRallyeSport(f.data, F.season(2026), {}, f.people)
      .some(issue => /starter minimum review/.test(issue.msg)));
  });
  const future = fixture();
  future.data.starterMinimumReview = {
    minimum: 6, reviewed: true, evidence: 'Synthetic 2026-only review'
  };
  assert.equal(E.calculateRallyeSportScoring(future.data, { year: 2027 }, future.people).status, 'unconfigured');
  assert.ok(E.validateRallyeSport(future.data, { year: 2027, events: [], rounds: [] }, {}, future.people)
    .some(issue => /supported only for the 2026 RallyeSport season/.test(issue.msg)));
});
test('started DNF zeroes survive the public scoring snapshot while unproven starts remain unavailable', () => {
  const f = fixture();
  f.result.entries[0].status = 'DNF';
  f.result.entries[0].pos = null;
  f.result.entries[0].classPos = null;
  f.result.entries[0].total = null;
  const projected = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  const publicScore = projected.rallyesport.scoring.results[0];
  assert.equal(publicScore.status, 'ready');
  assert.equal(publicScore.entries[0].driverPoints, 0);
  assert.equal(publicScore.entries[0].codriverPoints, 0);
  assert.equal(projected.rallyesport.results[0].entries[0].startEvidence, undefined);
  const publicModel = E.buildSeason({ season: projected, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].driverPoints, 0);
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].codriverPoints, 0);

  f.result.entries[0].times = [null];
  f.result.entries[0].stagePos = [null];
  f.event.starterCount = 15;
  f.event.starterCountEvidence = 'Synthetic source-backed event count';
  const unproven = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  assert.equal(unproven.rallyesport.scoring.results[0].entries[0].driverPoints, null);
  assert.equal(unproven.rallyesport.scoring.results[0].entries[0].codriverPoints, null);
});
test('a later DNF stage observation survives an earlier missing stage without filling the gap', () => {
  const f = fixture();
  f.result.stages = [
    { id: 'stage1', label: 'Stage 1' },
    { id: 'stage2', label: 'Stage 2' },
    { id: 'stage3', label: 'Stage 3' }
  ];
  f.result.entries.forEach((entry, i) => {
    entry.times = ['00:01.00', null, null];
    entry.stagePos = [i + 1, null, null];
  });
  const retired = f.result.entries[0];
  retired.status = 'DNF';
  retired.pos = null;
  retired.classPos = null;
  retired.times = ['00:01.00', null, '00:03.00'];
  retired.stagePos = [1, null, 7];
  retired.total = null;
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.deepEqual(issues, []);
  const built = E.buildRallyeSport(f.data, f.people, { year: 2026 });
  assert.deepEqual(built.results[0].entries[0].times, ['00:01.00', null, '00:03.00']);
  assert.deepEqual(built.results[0].entries[0].stagePos, [1, null, 7]);
  assert.equal(eventScore(f).status, 'ready');
  assert.equal(eventScore(f).entries[0].driverPoints, 0);
});
test('unknown/non-scoring classes, invitation status, finality and non-2026 scope fail closed', () => {
  const f = fixture();
  f.result.entries[0].invited = null;
  assert.match(eventScore(f).reason, /status is not confirmed/);
  f.result.entries[0].invited = false;
  f.result.status = 'Provisional classification';
  assert.match(eventScore(f).reason, /provisional/);
  f.result.status = 'Final classification';
  f.result.entries[0].class = 'UNKNOWN';
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.deepEqual(issues, []);
  assert.match(eventScore(f).reason, /category has no configured scoring semantics/);
  assert.equal(E.calculateRallyeSportScoring(f.data, { year: 2027 }, f.people).status, 'unconfigured');
});
test('a user-confirmed pre-issue 2026 event can use the SSR profile without changing its source order', () => {
  const f = fixture();
  f.event.dates = '2026-06-01';
  f.event.rulesetEvidence = 'Synthetic explicit applicability confirmation for a pre-issue event';
  f.result.status = 'FINAL RESULTS';
  const score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(f.result.status, 'FINAL RESULTS');
  assert.equal(f.result.entries[0].pos, 1);
});
test('a started TEST row is retained and counts toward the event threshold without scoring', () => {
  const f = fixture();
  f.result.stages = [{ id: 'stage1', label: 'Stage 1' }, { id: 'stage2', label: 'Stage 2' }];
  f.result.entries.forEach(entry => {
    entry.times = [entry.times[0], null];
    entry.stagePos = [entry.stagePos[0], null];
  });
  const entry = f.result.entries[0];
  entry.status = 'TEST';
  entry.pos = null;
  entry.classPos = null;
  entry['class'] = 'TEST';
  entry.times = ['00:01.00', '00:02.00'];
  entry.stagePos = [null, null];
  entry.total = '00:03.00';
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.ok(!issues.some(issue => /status must be classified/.test(issue.msg)));
  assert.deepEqual(issues, []);
  assert.equal(eventScore(f).status, 'ready');
  const built = E.buildRallyeSport(f.data, f.people, { year: 2026 });
  assert.equal(built.results[0].entries[0].status, 'TEST');
  assert.deepEqual(built.results[0].entries[0].times, ['00:01.00', '00:02.00']);
  assert.equal(built.results[0].entries[0].pos, null);
  assert.equal(eventScore(f).entries[0].driverPoints, 0);
});
test('TEST entries retain event order but never score championship points or become a scoring class', () => {
  const f = fixture();
  f.people.people.push({ id: 'driver-16', name: 'Driver 16', aliases: [] },
    { id: 'codriver-16', name: 'Co-driver 16', aliases: [] });
  f.result.entries.push({ ...f.result.entries[14], car: '16', driver: 'Driver 16', codriver: 'Co-driver 16',
    pos: 16, classPos: 16, times: ['00:01.16'], stagePos: [16], total: '00:01.16' });
  const testRow = f.result.entries[0];
  testRow.status = 'TEST';
  testRow.class = 'TEST';
  testRow.pos = 1;
  testRow.classPos = 1;
  testRow.total = '00:01.00';
  const score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[0].driverPoints, 0);
  assert.equal(score.entries[0].codriverPoints, 0);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(f.result.entries[0].pos, 1);
  assert.equal(f.result.entries[0].class, 'TEST');
});
test('a source-backed TEST classification can publish faithful category and file evidence without an invented URL', () => {
  const f = fixture();
  f.result.source = { file: 'Attached final results PDF', description: 'User-supplied official final classification' };
  const entry = f.result.entries[0];
  entry.status = 'TEST';
  entry.class = 'TEST';
  entry.pos = null;
  entry.classPos = null;
  entry.total = null;
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.deepEqual(issues, []);
  const projection = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  const built = E.buildSeason({ season: projection, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(built.rallyesport.results[0].entries[0].class, 'TEST');
  assert.equal(built.rallyesport.results[0].entries[0].status, 'TEST');
  assert.equal(built.rallyesport.results[0].source.url, undefined);
  assert.equal(built.rallyesport.results[0].source.file, 'Attached final results PDF');
  assert.equal(built.rallyesport.scoring.results[0].status, 'ready');
});
test('printed class positions preserve a tied overall order across classes; unresolved same-class ties remain blocked', () => {
  const f = fixture();
  f.result.entries.forEach((entry, i) => {
    if (i === 0 || i === 2) {
      entry['class'] = 'RS2';
      entry.classPos = i === 0 ? 1 : 2;
      entry.pos = i === 0 ? 1 : 2;
    } else if (i === 1 || i === 3) {
      entry['class'] = 'RS4';
      entry.classPos = i === 1 ? 1 : 2;
      entry.pos = i === 1 ? 1 : 2;
    } else {
      entry['class'] = 'RS2';
      entry.classPos = i - 1;
      entry.pos = i + 1;
    }
  });
  let score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[0].driverPoints, 15);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[2].driverPoints, 12);
  assert.equal(score.entries[3].driverPoints, 12);
  f.result.entries[0].classPos = 2;
  f.result.entries[2].classPos = 2;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /tied scoring position remains unresolved/);
});
test('partially printed class positions use one consistent official order and withhold tied or conflicting sources', () => {
  const f = fixture();
  f.result.entries.forEach((entry, i) => {
    entry.class = i < 2 ? 'RS2' : 'RS4';
    entry.pos = i + 1;
    entry.classPos = i < 2 ? i + 1 : i - 1;
  });
  f.result.entries[0].pos = 5;
  f.result.entries[0].classPos = 2;
  f.result.entries[1].pos = 3;
  f.result.entries[1].classPos = null;
  f.result.entries[2].pos = 1;
  f.result.entries[3].pos = 2;
  f.result.entries[4].pos = 4;
  let score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[0].driverPoints, 12);
  assert.equal(f.result.entries[0].classPos, 2);
  assert.equal(f.result.entries[1].classPos, null);

  f.result.entries[1].pos = 5;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /tied scoring position remains unresolved/);

  f.result.entries[1].pos = 5;
  f.result.entries[1].classPos = 1;
  f.result.entries[0].pos = 3;
  score = eventScore(f);
  assert.equal(score.status, 'blocked');
  assert.match(score.reason, /overall and class positions conflict/);
});
test('explicit scoring-class mappings are classification-scoped and preserve the printed category', () => {
  const f = fixture();
  f.result.entries.forEach(entry => { entry.class = '2WD'; });
  f.result.classMappings = { '2WD': 'RS4' };
  f.result.classMappingEvidence = 'Synthetic reviewer-confirmed, event-specific mapping';
  assert.deepEqual(E.validateRallyeSport(f.data, F.season(2026), {}, f.people), []);
  let score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.entries[0].driverPoints, 15);
  assert.equal(f.result.entries[0].class, '2WD');

  const otherEvent = { ...f.event, id: 'other-event', name: 'Other synthetic event' };
  const otherResult = { ...f.result, id: 'other-result', eventId: otherEvent.id,
    entries: f.result.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) };
  delete otherResult.classMappings;
  delete otherResult.classMappingEvidence;
  f.data.events.push(otherEvent);
  f.data.results.push(otherResult);
  score = E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people);
  assert.equal(score.results.find(row => row.eventId === f.event.id).status, 'ready');
  assert.match(score.results.find(row => row.eventId === otherEvent.id).reason, /explicit event-specific scoring-class mapping/);
});
test('standalone RS event validates without any NR event, round or stage association', () => {
  const f = fixture();
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.deepEqual(issues, []);
});
test('optional RS round numbers are explicit, positive and unique without requiring NR rounds', () => {
  const f = fixture();
  f.event.roundNumber = 2;
  f.data.events.push({ id: 'standalone-r1', name: 'Synthetic standalone', roundNumber: 1 });
  assert.deepEqual(E.validateRallyeSport(f.data, { year: 2026, events: [], rounds: [] }, {}, f.people), []);
  f.data.events[1].roundNumber = 2;
  assert.ok(E.validateRallyeSport(f.data, { year: 2026, events: [], rounds: [] }, {}, f.people)
    .some(issue => issue.msg.includes('duplicates RS round number 2')));
  f.data.events[1].roundNumber = 0;
  assert.ok(E.validateRallyeSport(f.data, { year: 2026, events: [], rounds: [] }, {}, f.people)
    .some(issue => issue.msg.includes('positive integer')));
});
test('reviewed stage reuse is selective, reports conflicts/missing/unmatched rows and never mutates its input', () => {
  const f = fixture();
  f.result.nrRoundId = 'R1';
  f.result.stages = [{ id: 'ss8', label: 'SS8', nrStage: 'SS8' }, { id: 'ss9', label: 'SS9', nrStage: 'SS9' }];
  f.result.entries = [f.result.entries[0], f.result.entries[1], f.result.entries[2]].map((entry, i) => ({
    ...entry, times: i === 0 ? ['00:01.50', null] : [null, null], stagePos: [null, null]
  }));
  f.result.entries[1].car = '99';
  const nr = { id: 'R1', stages: ['SS8', 'SS9'], entries: [
    { car: '1', driver: 'Driver 1', codriver: 'Co-driver 1', status: 'DNF', class: 'NR-CLASS',
      pos: null, pen: '99:00.0', total: null, times: ['00:01.00', null] },
    { car: '3', driver: 'Driver 3', codriver: 'Co-driver 3', status: 'classified', class: 'NR-CLASS',
      pos: 1, total: '00:05.00', times: ['00:02.00', '00:03.00'] }
  ] };
  const rsBefore = JSON.stringify(f.result);
  const preview = E.copyReviewedRallyeSportTimes(f.result, nr, f.people);
  assert.equal(JSON.stringify(f.result), rsBefore);
  assert.deepEqual(preview.entries[0].times, ['00:01.50', null]);
  assert.deepEqual(preview.entries[0].timeEvidence || [], []);
  assert.equal(preview.entries[1].car, '99');
  assert.deepEqual(preview.entries[1].times, [null, null]);
  assert.deepEqual(preview.entries[2].times, ['00:02.00', '00:03.00']);
  assert.deepEqual(preview.entries[2].timeEvidence[0], {
    kind: 'reviewed-nr-copy', nrRoundId: 'R1', nrCar: '3', nrStage: 'SS8', value: '00:02.00'
  });
  assert.equal(preview.entries[2].status, 'classified');
  assert.equal(preview.entries[2].class, 'RS2');
  assert.equal(preview.entries[2].penalty, null);
  assert.equal(preview.report.conflicts.length, 1);
  assert.equal(preview.report.missing.length, 1);
  assert.equal(preview.report.unmatched.length, 1);
  assert.equal(preview.report.copied.filter(item => !item.unchanged).length, 2);
  nr.entries[0].times[0] = '00:99.00';
  assert.equal(preview.entries[0].times[0], '00:01.50');
  assert.throws(() => E.copyReviewedRallyeSportTimes(f.result, { ...nr, id: 'R2' }, f.people), /explicitly linked/);
});
test('shared-stage time copy accepts reviewed spelling variants but never matches on car number alone', () => {
  const f = fixture();
  f.result.nrRoundId = 'R1';
  f.result.stages = [{ id: 'ss8', label: 'SS8', nrStage: 'SS8' }];
  f.result.entries = [{ ...f.result.entries[0], driver: 'NR spelling differs', times: [null], stagePos: [null],
    identityReview: { driverId: 'driver-1', codriverId: 'codriver-1', evidence: 'Synthetic same-event reviewed crew identity.' } }];
  const nr = { id: 'R1', stages: ['SS8'], entries: [
    { car: '1', driver: 'Driver 1', codriver: 'Co-driver 1', status: 'classified', times: ['00:01.00'] }
  ] };
  const reviewed = E.copyReviewedRallyeSportTimes(f.result, nr, f.people);
  assert.deepEqual(reviewed.entries[0].times, ['00:01.00']);
  assert.equal(reviewed.report.unmatched.length, 0);
  const unreviewed = { ...f.result, entries: [{ ...f.result.entries[0], identityReview: undefined }] };
  const notMatched = E.copyReviewedRallyeSportTimes(unreviewed, nr, f.people);
  assert.deepEqual(notMatched.entries[0].times, [null]);
  assert.equal(notMatched.report.unmatched.length, 1, 'a matching car number does not establish a crew identity');
});
test('stage subsets SS6–9, SS8–12 and SS8–11 align by explicit stage IDs, not array position', () => {
  const nrStages = ['SS6', 'SS7', 'SS8', 'SS9', 'SS10', 'SS11', 'SS12'];
  function overlay(labels) {
    const result = { id: 'subset', stages: labels.map(label => ({ id: label.toLowerCase(), label, nrStage: label })),
      entries: [{ car: '1', driver: 'Synthetic Driver', class: 'RS2', status: 'classified', times: labels.map(() => '1:00.0'),
        stagePos: labels.map((_, i) => i + 1), total: '4:00.0', pos: 1 }] };
    return E.buildRallyeSportGraph(result, nrStages, 'spos')[0].values;
  }
  assert.deepEqual(overlay(['SS6', 'SS7', 'SS8', 'SS9']), [1, 2, 3, 4, null, null, null]);
  assert.deepEqual(overlay(['SS8', 'SS9', 'SS10', 'SS11', 'SS12']), [null, null, 1, 2, 3, 4, 5]);
  assert.deepEqual(overlay(['SS8', 'SS9', 'SS10', 'SS11']), [null, null, 1, 2, 3, 4, null]);
});
test('stage positions and per-stage loss remain visible after a missing earlier stage time', () => {
  const nrStages = ['SS8', 'SS9'];
  const result = { id: 'gap-overlay',
    stages: nrStages.map(label => ({ id: label.toLowerCase(), label, nrStage: label })),
    entries: [
      { car: '1', driver: 'Synthetic One', class: 'RS2', status: 'DNF', times: [null, '00:03.00'], stagePos: [null, 7] },
      { car: '2', driver: 'Synthetic Two', class: 'RS2', status: 'classified', times: [null, '00:02.00'], stagePos: [null, 1] }
    ] };
  assert.deepEqual(E.buildRallyeSportGraph(result, nrStages, 'spos')[0].values, [null, 7]);
  assert.deepEqual(E.buildRallyeSportGraph(result, nrStages, 'loss')[0].values, [null, 1]);
  assert.deepEqual(E.buildRallyeSportGraph(result, nrStages, 'pos')[0].values, [null, null, null]);
});
test('RS graph ordering and differences preserve hundredths without changing NR time precision', () => {
  const result = { id: 'precise-overlay',
    stages: [{ id: 'ss1', label: 'SS1', nrStage: 'SS1' }],
    entries: [
      { car: '1', driver: 'Synthetic One', class: 'RS2', status: 'classified', times: ['1:00.01'], stagePos: [2], total: '1:00.01', pos: 2 },
      { car: '2', driver: 'Synthetic Two', class: 'RS2', status: 'classified', times: ['1:00.04'], stagePos: [1], total: '1:00.04', pos: 1 }
    ] };
  const loss = E.buildRallyeSportGraph(result, ['SS1'], 'loss');
  const gap = E.buildRallyeSportGraph(result, ['SS1'], 'gap');
  assert.deepEqual(loss.map(row => row.values), [[0], [0.03]]);
  assert.deepEqual(gap.map(row => row.values), [[0, 0], [0.03, 0.03]]);
  assert.equal(loss[0].timePrecision, 2);
  assert.equal(E.parseTime('1:00.04'), 60);
});
test('public projection hides member toggles, invitation flags and applicability evidence while preserving result and points', () => {
  const f = fixture();
  f.data.nonScoringPeople = ['driver-1'];
  f.event.doublePointsBulletinDate = '2026-01-18';
  const projection = AI.projectPublic({ year: 2026, rallyesport: f.data }, f.people);
  assert.equal(projection.rallyesport.nonScoringPeople, undefined);
  assert.equal(projection.rallyesport.events[0].rulesetEvidence, undefined);
  assert.equal(projection.rallyesport.events[0].championshipEvidence, undefined);
  assert.equal(projection.rallyesport.events[0].doublePointsBulletinDate, undefined);
  assert.equal(projection.rallyesport.results[0].entries[0].invited, undefined);
  assert.equal(projection.rallyesport.results[0].entries[0].pos, 1);
  assert.equal(projection.rallyesport.scoring.results[0].entries[0].driverPoints, 0);
  assert.equal(projection.rallyesport.scoring.results[0].entries[0].codriverPoints, 15);
  assert.equal(projection.rallyesport.ruleset.issueDate, '2026-07-09');
  assert.equal(projection.rallyesport.events[0].starterCount, undefined);
  assert.equal(projection.rallyesport.events[0].starterCountEvidence, undefined);
  assert.equal(projection.rallyesport.results[0].entries[0].startEvidence, undefined);
});
test('public seasons without RallyeSport stay unconfigured rather than invalid', () => {
  const built = E.buildSeason({ season: F.season(2026), rounds: {}, people: F.docs()['data/people.json'], publicProjection: true });
  assert.equal(built.rallyesport.scoring.status, 'unconfigured');
});
test('published scoring survives projection consumption, with role toggles and explicit provisional blocked rounds', () => {
  function sixRoundFixture() {
    const f = fixture();
    f.data.events = [];
    f.data.results = [];
    for (let n = 1; n <= 6; n++) {
      f.data.events.push({ ...f.event, id: 'event-' + n, doublePoints: false });
      f.data.results.push({ ...f.result, id: 'result-' + n, eventId: 'event-' + n,
        entries: f.result.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) });
    }
    return f;
  }
  const f = sixRoundFixture();
  f.data.nonScoringPeople = ['driver-1'];
  const privateSeason = { ...F.season(2026), rallyesport: f.data };
  const projection = AI.projectPublic(privateSeason, f.people);
  assert.equal(projection.rallyesport.nonScoringPeople, undefined);
  assert.equal(projection.rallyesport.results[0].entries[0].invited, undefined);
  const publicModel = E.buildSeason({ season: projection, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.scoring.status, 'ready');
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].driverPoints, 0);
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].codriverPoints, 15);
  assert.equal(publicModel.rallyesport.scoring.standings.overallDrivers.find(row => row.id === 'driver-2').points, 90);
  assert.equal(publicModel.rallyesport.scoring.standings.overallCodrivers.find(row => row.id === 'codriver-1').points, 90);
  const demoSeason = JSON.parse(JSON.stringify(projection));
  delete demoSeason.rallyesport.scoring;
  const demoModel = E.buildSeason({ season: demoSeason, rounds: {}, people: f.people });
  assert.equal(demoModel.rallyesport.scoring.status, 'invalid');
  assert.match(demoModel.rallyesport.scoring.reason, /reviewed 2026 membership eligibility map is required/i);
  assert.deepEqual(demoModel.rallyesport.scoring.results, []);

  f.data.results[2].status = 'Provisional classification';
  const blockedProjection = AI.projectPublic(privateSeason, f.people);
  const blockedModel = E.buildSeason({ season: blockedProjection, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(blockedModel.rallyesport.scoring.status, 'blocked');
  assert.equal(blockedModel.rallyesport.scoring.results.find(row => row.eventId === 'event-3').status, 'blocked');
  assert.ok(blockedModel.rallyesport.scoring.provisionalStandings.overallDrivers.length);
  assert.deepEqual(blockedModel.rallyesport.scoring.includedProvisionalEvents, ['event-1', 'event-2', 'event-4', 'event-5', 'event-6']);
  assert.deepEqual(blockedModel.rallyesport.scoring.excludedProvisionalEvents.map(row => row.eventId), ['event-3']);
  assert.equal(blockedModel.rallyesport.scoring.provisionalStandings.overallDrivers.find(row => row.id === 'driver-2').points, 75);

  const malformed = JSON.parse(JSON.stringify(projection));
  malformed.rallyesport.scoring.results[0].entries[0].car = 'not-a-source-car';
  const invalidModel = E.buildSeason({ season: malformed, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(invalidModel.rallyesport.scoring.status, 'invalid');
  assert.match(invalidModel.rallyesport.scoring.reason, /malformed or incompatible/);
});
test('reviewed RS crew-role identities survive public projection without exposing review evidence or changing NR', () => {
  const f = fixture();
  const row = f.result.entries[0];
  row.driver = 'Synthetic Shared Name';
  row.codriver = 'Synthetic Shared Name';
  f.people.people.push(
    { id: 'synthetic-driver-junior', name: 'Synthetic Driver Junior', aliases: [] },
    { id: 'synthetic-driver-senior', name: 'Synthetic Driver Senior', aliases: [] }
  );
  row.identityReview = {
    driverId: 'synthetic-driver-junior', codriverId: 'synthetic-driver-senior',
    evidence: 'Synthetic user-confirmed car 88 assignment: junior driver, senior co-driver.'
  };
  assert.deepEqual(E.validateRallyeSport(f.data, F.season(2026), {}, f.people), []);
  const scoring = eventScore(f);
  assert.equal(scoring.status, 'ready');
  const privateModel = E.buildSeason({ season: { ...F.season(2026), rallyesport: f.data }, rounds: {}, people: f.people });
  assert.equal(privateModel.rallyesport.results[0].entries[0].driverId, 'synthetic-driver-junior');
  assert.equal(privateModel.rallyesport.results[0].entries[0].codriverId, 'synthetic-driver-senior');
  const projected = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  const publicEntry = projected.rallyesport.results[0].entries[0];
  assert.equal(publicEntry.driver, 'Synthetic Shared Name');
  assert.equal(publicEntry.codriver, 'Synthetic Shared Name');
  assert.equal(projected.rallyesport.results[0].entries[0].identityReview, undefined);
  assert.deepEqual(publicEntry.publicIdentity, {
    driverId: 'synthetic-driver-junior', codriverId: 'synthetic-driver-senior'
  });
  assert.equal(JSON.stringify(publicEntry).includes('Synthetic user-confirmed'), false,
    'private role-assignment evidence is not published');
  const publicModel = E.buildSeason({ season: projected, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.scoring.results[0].status, 'ready');
  const builtEntry = publicModel.rallyesport.results[0].entries[0];
  assert.equal(builtEntry.driver, 'Synthetic Shared Name');
  assert.equal(builtEntry.codriver, 'Synthetic Shared Name');
  assert.equal(builtEntry.driverId, 'synthetic-driver-junior');
  assert.equal(builtEntry.codriverId, 'synthetic-driver-senior');
  assert.ok(publicModel.rallyesport.scoring.provisionalStandings.overallDrivers
    .some(person => person.id === 'synthetic-driver-junior'));
  assert.ok(publicModel.rallyesport.scoring.provisionalStandings.overallCodrivers
    .some(person => person.id === 'synthetic-driver-senior'));

  const nrRound = { id: 'R1', stages: ['SS1'], entries: [
    { car: '77', driver: 'NR Driver', codriver: '', class: 'OPEN', status: 'classified', pos: 1, times: ['1:00.0'], total: '1:00.0' }
  ] };
  f.people.people.push({ id: 'nr-driver', name: 'NR Driver', aliases: [] });
  const baselineNr = E.buildSeason({ season: F.season(2026), rounds: { R1: nrRound }, people: f.people });
  const projectedNr = E.buildSeason({ season: projected, rounds: { R1: nrRound }, people: f.people, publicProjection: true });
  assert.deepEqual(projectedNr.standings, baselineNr.standings);
  assert.deepEqual(projectedNr.rounds[0].entries, baselineNr.rounds[0].entries);

  const invalid = JSON.parse(JSON.stringify(f.data));
  invalid.results[0].entries[0].identityReview.codriverId = 'synthetic-driver-junior';
  assert.ok(E.validateRallyeSport(invalid, F.season(2026), {}, f.people)
    .some(issue => /reviewed driver and co-driver must be distinct/.test(issue.msg)));
  invalid.results[0].entries[0].identityReview.codriverId = 'missing-profile';
  assert.ok(E.validateRallyeSport(invalid, F.season(2026), {}, f.people)
    .some(issue => /reviewed co-driver refers to an unknown profile/.test(issue.msg)));
});
test('a partial identity review maps only its reviewed role and preserves source names', () => {
  const f = fixture();
  f.people.people.push({ id: 'canonical-driver', name: 'Canonical Driver', aliases: ['canonical driver'] });
  const row = f.result.entries[0];
  row.driver = 'canonical driver';
  row.codriver = 'Co-driver 1';
  row.identityReview = {
    driverId: 'canonical-driver',
    evidence: 'Synthetic reviewer confirms the driver profile.'
  };
  assert.deepEqual(E.validateRallyeSport(f.data, F.season(2026), {}, f.people), []);
  const privateModel = E.buildSeason({ season: { ...F.season(2026), rallyesport: f.data }, rounds: {}, people: f.people });
  assert.equal(privateModel.rallyesport.results[0].entries[0].driver, 'canonical driver',
    'the classification row retains its exact printed source spelling');
  assert.equal(privateModel.rallyesport.results[0].entries[0].driverId, 'canonical-driver');
  assert.equal(privateModel.rallyesport.results[0].entries[0].codriverId, 'codriver-1');
  assert.ok(privateModel.rallyesport.scoring.provisionalStandings.overallDrivers
    .some(person => person.id === 'canonical-driver' && person.name === 'Canonical Driver'));
  const projection = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  assert.equal(projection.rallyesport.results[0].entries[0].driver, 'canonical driver');
  assert.deepEqual(projection.rallyesport.results[0].entries[0].publicIdentity, { driverId: 'canonical-driver' });
  assert.ok(projection.rallyesport.scoring.provisionalStandings.overallDrivers
    .some(person => person.id === 'canonical-driver' && person.name === 'Canonical Driver'));
  const publicModel = E.buildSeason({ season: projection, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.results[0].entries[0].driverId, 'canonical-driver');
  assert.equal(publicModel.rallyesport.results[0].entries[0].codriverId, 'codriver-1',
    'an unreviewed role can still resolve independently from its printed name');
});
test('user-confirmed finality permits RS scoring without rewriting source status or hiding source qualifications', () => {
  const f = fixture();
  f.result.status = 'Provisional Official Classification 4/4';
  f.result.notes = ['Source footer: results are final pending post-event technical checks.'];
  f.result.finalityReview = {
    acceptedForScoring: true,
    evidence: 'Synthetic user confirmation to treat this supplied classification as final for scoring.'
  };
  const score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.equal(score.finalityBasis, 'user-confirmed');
  const projection = AI.projectPublic({ ...F.season(2026), rallyesport: f.data }, f.people);
  assert.equal(projection.rallyesport.results[0].status, 'Provisional Official Classification 4/4');
  assert.equal(projection.rallyesport.results[0].finalityReview, undefined);
  assert.equal(projection.rallyesport.results[0].notes[0], f.result.notes[0]);
  assert.equal(projection.rallyesport.scoring.results[0].finalityBasis, 'user-confirmed');
  const publicModel = E.buildSeason({ season: projection, rounds: {}, people: f.people, publicProjection: true });
  assert.equal(publicModel.rallyesport.scoring.results[0].status, 'ready');
  const pendingChecks = JSON.parse(JSON.stringify(f.data));
  pendingChecks.results[0].status = 'Final Official Classification';
  delete pendingChecks.results[0].finalityReview;
  assert.equal(E.calculateRallyeSportScoring(pendingChecks, { year: 2026 }, f.people).results[0].status, 'blocked',
    'a source heading that says final pending checks is not treated as cleared without review');
  pendingChecks.results[0].finalityReview = JSON.parse(JSON.stringify(f.result.finalityReview));
  assert.equal(E.calculateRallyeSportScoring(pendingChecks, { year: 2026 }, f.people).results[0].finalityBasis, 'user-confirmed');
  const unreviewed = JSON.parse(JSON.stringify(f.data));
  delete unreviewed.results[0].finalityReview;
  assert.equal(E.calculateRallyeSportScoring(unreviewed, { year: 2026 }, f.people).results[0].status, 'blocked');
  unreviewed.results[0].finalityReview = { acceptedForScoring: true, evidence: '' };
  assert.ok(E.validateRallyeSport(unreviewed, F.season(2026), {}, f.people)
    .some(issue => /finality review evidence is required/.test(issue.msg)));
});
test('RS mutations cannot change NR standings, and NR changes cannot change RS official results or points', () => {
  const f = fixture(), season = F.season(2026), people = { people: [
    ...f.people.people, { id: 'nr-driver', name: 'NR Driver', aliases: [] }
  ] };
  const rawRound = { id: 'R1', stages: ['SS1'], entries: [
    { car: '77', driver: 'NR Driver', codriver: '', class: 'OPEN', status: 'classified', pos: 1, times: ['1:00.0'], total: '1:00.0' }
  ] };
  const rsFirst = E.buildSeason({ season, rounds: { R1: rawRound }, people });
  const baselineNr = JSON.stringify({ standings: rsFirst.standings, entries: rsFirst.rounds[0].entries });
  f.data.nonScoringPeople = ['driver-1'];
  f.data.results[0].entries[0].status = 'DNF';
  f.data.results[0].entries[0].penalty = '99:00.0';
  const rsMutated = E.buildSeason({ season: { ...season, rallyesport: f.data }, rounds: { R1: rawRound }, people });
  assert.equal(JSON.stringify({ standings: rsMutated.standings, entries: rsMutated.rounds[0].entries }), baselineNr);
  const pointsBeforeNrChange = eventScore(f);
  const changedNrRound = { ...rawRound, entries: [{ ...rawRound.entries[0], status: 'DNF', pos: null, total: null, class: 'OTHER', pen: '20:00.0' }] };
  const rsAfterNrChange = E.buildSeason({ season: { ...season, rallyesport: f.data }, rounds: { R1: changedNrRound }, people });
  assert.equal(rsAfterNrChange.rallyesport.results[0].entries[0].status, 'DNF');
  assert.deepEqual(rsAfterNrChange.rallyesport.scoring.results[0], pointsBeforeNrChange);
});
