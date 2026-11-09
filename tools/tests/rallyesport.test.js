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
  const data = { ruleset, events: [event], results: [result], nonScoringPeople: [] };
  return { data, event, result, people };
}
function eventScore(f) {
  return E.calculateRallyeSportScoring(f.data, { year: 2026 }, f.people).results[0];
}
test('2026 role-specific scoring applies the SSR class scale and toggle never changes official order', () => {
  const f = fixture();
  let score = eventScore(f);
  assert.equal(score.status, 'ready');
  assert.deepEqual(score.entries.slice(0, 3), [
    { car: '1', driverPoints: 15, codriverPoints: 15 },
    { car: '2', driverPoints: 12, codriverPoints: 12 },
    { car: '3', driverPoints: 10, codriverPoints: 10 }
  ]);
  assert.equal(score.entries[10].driverPoints, 1);
  assert.equal(score.entries[14].codriverPoints, 1);
  f.data.nonScoringPeople = ['driver-1'];
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, 15);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[1].codriverPoints, 12);
  assert.equal(f.result.entries[0].pos, 1);
  f.data.nonScoringPeople = ['codriver-1'];
  score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, 15);
  assert.equal(score.entries[0].codriverPoints, null);
  assert.equal(score.entries[1].codriverPoints, 15);
  f.data.nonScoringPeople = [];
  assert.equal(eventScore(f).entries[0].driverPoints, 15);
});
test('invitational exclusion is distinct from member toggle and eligible order shifts per role', () => {
  const f = fixture();
  f.result.entries[0].invited = true;
  const score = eventScore(f);
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, null);
  assert.equal(score.entries[1].driverPoints, 15);
  assert.equal(score.entries[1].codriverPoints, 15);
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
test('DNF earns no points but counts as a starter only with evidence or a reviewed event count', () => {
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
  assert.equal(score.entries[0].driverPoints, null);
  assert.equal(score.entries[0].codriverPoints, null);
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
  assert.equal(eventScore(f).entries[0].driverPoints, null);
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
test('a TEST row is retained with its source status and may block the starter threshold while ambiguous', () => {
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
  assert.equal(eventScore(f).status, 'blocked');
  const built = E.buildRallyeSport(f.data, f.people, { year: 2026 });
  assert.equal(built.results[0].entries[0].status, 'TEST');
  assert.deepEqual(built.results[0].entries[0].times, ['00:01.00', '00:02.00']);
  assert.equal(built.results[0].entries[0].pos, null);
  assert.match(eventScore(f).reason, /whether TEST entries count toward SSR 7\.3 remains unresolved/);
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
  assert.deepEqual(score.entries[0], { car: '1', driverPoints: null, codriverPoints: null });
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
  assert.equal(built.rallyesport.scoring.results[0].status, 'blocked');
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
test('standalone RS event validates without any NR event, round or stage association', () => {
  const f = fixture();
  const issues = E.validateRallyeSport(f.data, F.season(2026), {}, f.people);
  assert.deepEqual(issues, []);
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
  assert.equal(projection.rallyesport.scoring.results[0].entries[0].driverPoints, null);
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
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].driverPoints, null);
  assert.equal(publicModel.rallyesport.scoring.results[0].entries[0].codriverPoints, 15);
  assert.equal(publicModel.rallyesport.scoring.standings.overallDrivers.find(row => row.id === 'driver-2').points, 90);
  assert.equal(publicModel.rallyesport.scoring.standings.overallCodrivers.find(row => row.id === 'codriver-1').points, 90);
  const demoSeason = JSON.parse(JSON.stringify(projection));
  delete demoSeason.rallyesport.scoring;
  const demoModel = E.buildSeason({ season: demoSeason, rounds: {}, people: f.people });
  assert.equal(demoModel.rallyesport.scoring.status, 'incomplete');
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
