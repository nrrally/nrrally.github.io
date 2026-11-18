/* Synthetic marshals timing and event-only RS0; no provider access. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const C = require('../../assets/public-components.js');
const F = require('./ai-fixtures.js');

function fixture() {
  return F.rawRallyeSportTiming();
}
function ingest(f) { return E.ingestRallyeSportTiming(f.season, f.people, f.input); }
function install(f, review = true) {
  const draft = ingest(f);
  assert.deepEqual(draft.issues, []);
  assert.ok(draft.result);
  if (review) draft.result.finalityReview = { acceptedForScoring: true, evidence: 'Synthetic explicit permission to score provisional timing.',
    digest: E.rallyeSportClassOrderDigest(draft.result) };
  f.data.results.push(draft.result);
  return draft.result;
}
function build(f) {
  return E.buildSeason({ season: AI.projectPublic(f.season, f.people), rounds: {}, people: f.people, publicProjection: true });
}
test('raw timing preserves exact source strings, adds penalties, reconciles and computes provisional positions', () => {
  const f = fixture(), before = JSON.stringify(f), result = ingest(f);
  assert.equal(JSON.stringify(f), before, 'pure transformation');
  assert.deepEqual(result.issues, []);
  const raw = result.result;
  assert.equal(raw.status, 'Provisional classification');
  assert.equal(raw.finalityReview, undefined, 'calculation is not human scoring permission');
  assert.equal(raw.currentFinalityReview, undefined, 'calculation is not official final confirmation');
  assert.deepEqual(raw.entries[0].times, f.input.rows[0].times);
  assert.equal(raw.entries[0].penalty, '0:00.01');
  assert.equal(raw.entries[0].total, '6:00.22');
  assert.equal(raw.entries[1].pos, 2);
  assert.equal(raw.entries[2].classPos, 2, 'RS0 does not consume RS2 class position');
  assert.deepEqual(raw.entries[0].stagePos, Array(6).fill(null), 'no invented printed stage ranks');
  assert.deepEqual(raw.timingCalculation.finalTimes, f.input.rows.map(row => row.finalTime));
});
test('reviewed roster resolves car-only timings for explicit short and long stage layouts', () => {
  for (const count of [1, 3, 8]) {
    const f = F.rawRS0Example(true);
    f.input.stages = Array.from({ length: count }, (_, i) => ({ id: 'test-' + (i + 1), label: 'Test ' + (i + 1) }));
    f.input.rows.forEach((row, i) => {
      const hundredths = i === 0 ? 3 : i === 2 ? 1 : i + 1;
      row.times = ['1:00.0' + hundredths, ...Array(count - 1).fill('1:00.00')];
      row.finalTime = count + ':00.0' + hundredths;
      for (const field of ['driver', 'codriver', 'driverId', 'codriverId', 'class', 'vehicle']) delete row[field];
    });
    const raw = install(f), model = build(f);
    assert.deepEqual(raw.stages, f.input.stages);
    assert.equal(raw.entries[2].driverId, undefined);
    assert.equal(raw.entries[2].identityReview.driverId, 'synthetic-rs0-driver');
    assert.equal(raw.entries[2].class, 'RS0');
    assert.deepEqual(raw.entries[2].stagePos, Array(count).fill(null));
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).entries[2].driverPoints, 0);
    assert.equal(E.validateRallyeSport(f.data, f.season, {}, f.people).filter(row => row.level === 'error').length, 0);
    assert.notEqual(model.rallyesport.scoring.status, 'invalid');
    const graph = P.resultGraph(model, 'rs', raw.id);
    assert.equal(graph.stages.length, count);
    assert.equal(graph.entries.find(row => row.car === '300').times.length, count);
    assert.equal(graph.progression['300'].pos.at(-1), 1);
    assert.equal(graph.progression['300'].cpos.at(-1), 1);
    const priorDigest = raw.finalityReview.digest;
    raw.stages[0].label += ' changed';
    assert.notEqual(E.rallyeSportClassOrderDigest(raw), priorDigest);
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).finalityBasis, 'source-provisional');
  }
});
test('missing or conflicting reviewed roster and stage layout block car-based intake', () => {
  for (const change of [
    f => { delete f.data.entryLists; },
    f => { f.data.entryLists[0].entries[0].car = ''; },
    f => { f.data.entryLists[0].entries[1].car = f.data.entryLists[0].entries[0].car; },
    f => { f.data.entryLists[0].entries[0].enteredClass = ''; },
    f => { f.data.entryLists[0].entries[0].driverId = 'unknown'; },
    f => { f.people.people.push({ ...f.people.people.find(p => p.id === f.input.rows[0].driverId) }); },
    f => { f.people.people.push({ id: 'ambiguous-other', name: f.input.rows[0].driver, aliases: [] }); },
    f => { f.input.rows[0].car = '999'; },
    f => { f.input.rows[0].driverId = f.input.rows[1].driverId; },
    f => { f.input.rows[0].class = 'RS4'; },
    f => { delete f.input.stages; },
    f => { f.input.stages = []; },
    f => { f.input.stages[1] = { ...f.input.stages[0] }; },
    f => { f.input.rows[0].times.pop(); },
    f => { f.input.rows[0].times[0] = null; },
    f => { f.input.rows[0].finalTime = '6:00.20'; }
  ]) {
    const f = fixture(); change(f);
    const result = ingest(f);
    assert.equal(result.result, null, change.toString());
    assert.ok(result.issues.length);
  }
});
test('an event-level NR link allows independent raw timing, but NR round/stage links still block it', () => {
  const f = fixture(), unlinked = ingest(f).result;
  f.data.events.at(-1).nrEventId = 'test-event';
  const raw = install(f);
  const { finalityReview, ...draft } = raw;
  assert.deepEqual(draft, unlinked, 'event association never changes source timings or calculation');
  assert.equal(raw.nrRoundId, undefined);
  assert.ok(raw.stages.every(stage => stage.nrStage === undefined));
  assert.throws(() => E.copyReviewedRallyeSportTimes(raw, { id: 'R1', stages: ['SS1'] }, f.people), /explicitly linked/);
  assert.equal(E.validateRallyeSport(f.data, f.season, {}, f.people).filter(row => row.level === 'error').length, 0);
  assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).status, 'ready');
  assert.notEqual(build(f).rallyesport.scoring.status, 'invalid');
  for (const change of [
    result => { result.nrRoundId = 'R1'; },
    result => { result.stages[0].nrStage = 'SS1'; }
  ]) {
    const g = fixture();
    g.data.events.at(-1).nrEventId = 'test-event';
    const result = install(g); change(result);
    result.finalityReview.digest = E.rallyeSportClassOrderDigest(result);
    assert.ok(E.validateRallyeSport(g.data, g.season, {}, g.people).some(row =>
      row.level === 'error' && /raw timing:.*linked NR rounds or mapped NR stages/.test(row.msg)));
    assert.match(E.calculateRallyeSportScoring(g.data, g.season, g.people).results.at(-1).reason, /Raw timing calculation is invalid/);
    assert.equal(build(g).rallyesport.scoring.status, 'invalid');
  }
});
test('mismatches, unsupported precision/formats/statuses/ties and identity/class changes block the whole conversion', () => {
  for (const change of [
    f => { f.input.rows[0].finalTime = '6:00.21'; },
    f => { f.input.rows[0].times[0] = ''; },
    f => { f.input.rows[0].times[0] = 0.0007; },
    f => { f.input.rows[0].times[0] = '1:60.01'; },
    f => { f.input.rows[0].times[0] = '1:00.001'; },
    f => { f.input.rows[0].times[0] = '0:00.00'; },
    f => { f.input.rows[0].penalty = null; },
    f => { f.input.rows[0].penalty = '-0:00.01'; },
    f => { delete f.input.precision; },
    f => { f.input.precision = 4; },
    f => { f.input.rows[1].penalty = f.input.rows[0].penalty; f.input.rows[1].finalTime = f.input.rows[0].finalTime; },
    f => { f.input.rows[0].status = 'DNF'; },
    f => { delete f.input.rows[0].status; },
    f => { f.input.rows[0].driver = 'Unreviewed substitute'; },
    f => { f.input.rows[0].driverId = f.input.rows[1].driverId; },
    f => { f.input.rows[0].codriverId = f.input.rows[0].driverId; },
    f => { f.input.rows[0].class = 'RS4'; },
    f => { f.input.rows[0].class = 'TEST'; },
    f => { f.input.rows[0].driverId = '__proto__'; },
    f => { delete f.input.rows[1].nonScoringEvidence; },
    f => { f.input.rows[0].licence = 'forbidden'; },
    f => { f.input.source.file = 'C:\\private\\synthetic.xlsx'; },
    f => { f.people.people[2].aliases.push(f.input.rows[0].driver); },
    f => { f.input.nrRoundId = 'R1'; },
    f => { f.input.stages[0].nrStage = 'SS1'; },
    f => { f.data.results.push({ id: 'existing', eventId: 'rs-r5' }); }
  ]) {
    const f = fixture(); change(f);
    const converted = ingest(f);
    assert.equal(converted.result, null, change.toString());
    assert.ok(converted.issues.length);
  }
});
test('published compatible provisional points retain RS0 P2 without displacement or historical exclusion', () => {
  const f = fixture(), raw = install(f);
  const score = E.calculateRallyeSportScoring(f.data, f.season, f.people);
  const round = score.results.find(row => row.eventId === 'rs-r5');
  assert.equal(round.status, 'ready');
  const zero = round.entries.find(row => row.car === '2');
  assert.equal(zero.driverPoints, 0); assert.equal(zero.codriverPoints, 0);
  assert.equal(zero.driverEligibility.status, 'event-non-scoring');
  assert.equal(zero.driverEligibility.scoringPosition, null);
  const without = F.copy(f);
  without.data = without.season.rallyesport;
  const otherRaw = without.data.results.at(-1);
  otherRaw.entries.splice(1, 1); otherRaw.timingCalculation.finalTimes.splice(1, 1);
  otherRaw.entries.forEach((entry, i) => { entry.pos = i + 1; });
  otherRaw.finalityReview.digest = E.rallyeSportClassOrderDigest(otherRaw);
  const withoutScore = E.calculateRallyeSportScoring(without.data, without.season, without.people);
  assert.deepEqual(round.entries.filter(row => row.car !== '2'),
    withoutScore.results.find(row => row.eventId === 'rs-r5').entries);
  for (const role of ['driver', 'codriver']) {
    const table = score.provisionalStandings[role === 'driver' ? 'overallDrivers' : 'overallCodrivers'];
    const person = table.find(row => row.id === 'synthetic-' + role + '-2');
    assert.ok(person.points > 0, 'prior RS2 results count');
    assert.ok(person.rank > 0, 'earlier scoring participation keeps its season rank');
  }
  const model = build(f);
  assert.notEqual(model.rallyesport.scoring.status, 'invalid');
  const display = P.eventResult(model, 'rs-r5', 'classification');
  assert.equal(display.state, 'Provisional classification');
  assert.equal(display.pointsLabel, 'Provisional points');
  assert.equal(display.rows.find(row => row.car === '2').pos, 2);
  assert.equal(display.rows.find(row => row.car === '3').classPos, 2);
  assert.match(C.resultClassification(display), /Recorded finish:/);
  assert.match(C.resultClassification(display), /Calculated total/);
  assert.equal(raw.status, 'Provisional classification');
  assert.ok(P.home(model, 'rs').scoring.provisional);
  assert.equal(E.validateRallyeSport(f.data, f.season, {}, f.people).filter(row => row.level === 'error').length, 0);
  const projected = AI.projectPublic(f.season, f.people);
  assert.doesNotMatch(JSON.stringify(projected.rallyesport), /nonScoringEvidence|eventNonScoringReview|identityEvidence/);
  assert.equal(projected.rallyesport.results.at(-1).entries[1].publicEventNonScoring, true);
});
test('synthetic cars 100/200/300 preserve event and graph positions while RS0 has no championship rank', () => {
  for (const wins of [false, true]) {
    const f = F.rawRS0Example(wins), raw = install(f), model = build(f);
    const score = E.calculateRallyeSportScoring(f.data, f.season, f.people);
    const round = score.results.find(row => row.eventId === raw.eventId);
    assert.equal(round.status, 'ready');
    const display = P.eventResult(model, raw.eventId, 'classification');
    const graph = P.resultGraph(model, 'rs', raw.id);
    assert.deepEqual(display.rows.slice(0, 3).map(row => row.car), wins ? ['300', '200', '100'] : ['100', '200', '300']);
    assert.equal(display.rows[0].previousGap, '—');
    assert.equal(display.rows[1].previousGap, '+0:00.01');
    assert.equal(display.rows[2].previousGap, '+0:00.01');
    assert.equal(graph.calculatedFromTiming, true);
    for (const [car, expectedPos, cls, expectedPoints] of [
      ['100', wins ? 3 : 1, 'RS4', 15], ['200', 2, 'RS2', 15], ['300', wins ? 1 : 3, 'RS0', 0]
    ]) {
      const source = raw.entries.find(row => row.car === car);
      const row = display.rows.find(row => row.car === car);
      const points = round.entries.find(row => row.car === car);
      const plotted = graph.entries.find(row => row.car === car);
      assert.equal(row.pos, expectedPos);
      assert.equal(row.cls, cls);
      assert.equal(row.classPos, 1);
      assert.equal(points.driverPoints, expectedPoints); assert.equal(points.codriverPoints, expectedPoints);
      assert.equal(graph.progression[car].pos.at(-1), expectedPos);
      assert.equal(graph.progression[car].cpos.at(-1), 1);
      assert.deepEqual(plotted.times, source.times.map(E.parseRallyeSportTime));
      assert.equal(plotted.totalText, source.total);
      assert.equal(graph.progression[car].gap.at(-1), (expectedPos - 1) / 100);
    }
    const zero = round.entries.find(row => row.car === '300');
    assert.equal(zero.driverEligibility.scoringPosition, null);
    assert.equal(zero.codriverEligibility.scoringPosition, null);
    for (const role of ['driver', 'codriver']) {
      const id = 'synthetic-rs0-' + role;
      const table = score.provisionalStandings[role === 'driver' ? 'overallDrivers' : 'overallCodrivers'];
      const cls = score.provisionalStandings[role === 'driver' ? 'classDrivers' : 'classCodrivers'].RS0;
      assert.equal(table.find(row => row.id === id).rank, null);
      assert.equal(cls.find(row => row.id === id).rank, null);
      const profile = P.profile([model], 'rs', id, f.people.people.find(person => person.id === id));
      const app = profile.seasons[0].row.apps.find(app => app.eventId === raw.eventId);
      assert.equal(app.pos, wins ? 1 : 3);
      assert.equal(app.classPos, 1);
      assert.equal(app.points, 0);
      assert.match(app.graphHref, /cars=300/);
      assert.equal(profile.stats.find(stat => stat[0] === 'Best result')[1], wins ? '1st' : '3rd');
    }
    assert.equal(round.entries.find(row => row.car === '100').driverEligibility.scoringPosition, 1);
    assert.equal(round.entries.find(row => row.car === '200').driverEligibility.scoringPosition, 1);
  }
});
test('declared retirements retain partial stages but no invented total/rank; DNS never adds starts', () => {
  const f = fixture();
  for (const [i, status] of [[5, 'DNF'], [6, 'DNS']]) {
    f.input.rows[i].status = status;
    f.input.rows[i].times = i === 5 ? ['1:00.01', null, null, null, null, null] : Array(6).fill(null);
    f.input.rows[i].finalTime = null;
  }
  const raw = install(f), score = E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1);
  assert.equal(score.status, 'ready', 'six declared classified/DNF starters');
  assert.equal(raw.entries[5].total, null); assert.equal(raw.entries[5].pos, null);
  assert.deepEqual(raw.entries[5].times, f.input.rows[5].times);
  assert.equal(score.entries[5].driverPoints, 0); assert.equal(score.entries[6].driverPoints, null);
  assert.equal(build(f).rallyesport.scoring.status, 'incomplete');
});
test('RS0-only people have zero points and no season rank; public snapshot tampering is rejected', () => {
  const f = fixture();
  for (const role of ['driver', 'codriver']) {
    const id = 'synthetic-new-' + role;
    f.people.people.push({ id, name: 'Synthetic new ' + role, aliases: [] });
    f.input.rows[1][role] = 'Synthetic new ' + role; f.input.rows[1][role + 'Id'] = id;
    f.data.entryLists[0].entries[1][role + 'Id'] = id;
  }
  install(f);
  const model = build(f);
  const zero = model.rallyesport.scoring.provisionalStandings.overallDrivers.find(row => row.id === 'synthetic-new-driver');
  assert.equal(zero.rank, null); assert.equal(zero.points, 0);
  assert.ok(P.standings(model, 'rs', 'driver', {}).classes.some(row => row.id === 'RS0'));
  for (const tamper of [
    rs => { rs.scoring.results.at(-1).entries[1].driverPoints = 15; },
    rs => { rs.scoring.provisionalStandings.classDrivers.RS0[0].rank = 1; },
    rs => { rs.scoring.provisionalStandings.classDrivers.RS0[0].eligibilityStatus = 'eligible'; },
    rs => { rs.results.at(-1).entries[0].total = '6:00.23'; },
    rs => { delete rs.results.at(-1).entries[1].publicEventNonScoring; }
  ]) {
    const projected = AI.projectPublic(f.season, f.people);
    tamper(projected.rallyesport);
    assert.equal(E.buildSeason({ season: projected, rounds: {}, people: f.people, publicProjection: true }).rallyesport.scoring.status, 'invalid');
  }
});
test('integer precision and scoring-review binding are exact; malformed input is refused', () => {
  for (const precision of [0, 1, 3]) {
    const f = fixture(), suffix = precision ? '.' + '0'.repeat(precision) : '';
    f.input.precision = precision;
    f.input.rows.forEach((row, i) => {
      row.times = Array(6).fill('1:00' + suffix); row.penalty = '0:0' + (i + 1) + suffix;
      row.finalTime = '6:0' + (i + 1) + suffix;
    });
    const raw = install(f);
    assert.equal(raw.entries[0].total, '6:01' + suffix);
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).status, 'ready');
    raw.notes.push('Results are final pending post-event technical checks.');
    raw.finalityReview.digest = E.rallyeSportClassOrderDigest(raw);
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).finalityBasis, 'user-confirmed');
    raw.source.description += ' changed';
    assert.equal(E.calculateRallyeSportScoring(f.data, f.season, f.people).results.at(-1).status, 'blocked');
  }
  for (const input of [null, {}, { rows: [null] }]) {
    const f = fixture(); f.input = input;
    assert.equal(ingest(f).result, null);
  }
  const f = fixture();
  f.input.precision = 3;
  f.input.rows.forEach((row, i) => {
    row.times = Array(6).fill('1:59.999'); row.penalty = '0:00.' + String(7 + i).padStart(3, '0');
    row.finalTime = '12:00.' + String(1 + i).padStart(3, '0');
  });
  assert.equal(install(f).entries[0].total, '12:00.001', 'exact millisecond carry, no rounding');
});
test('tampered totals, rankings, provenance and unreviewed/remapped RS0 fail publication', () => {
  for (const change of [
    raw => { raw.entries[0].total = '6:00.23'; },
    raw => { raw.entries[0].times[0] = '1:00.02'; },
    raw => { raw.entries[0].pos = 2; },
    raw => { raw.timingCalculation.finalTimes[0] = '6:00.00'; },
    raw => { raw.timingCalculation.extra = true; },
    raw => { raw.entries[0].stagePos[0] = 1; },
    raw => { delete raw.entries[1].eventNonScoringReview; },
    raw => { raw.classMappings = { RS0: 'RS2' }; raw.classMappingEvidence = 'Not permitted'; }
  ]) {
    const f = fixture(), raw = install(f); change(raw);
    assert.ok(E.validateRallyeSport(f.data, f.season, {}, f.people).some(row => row.level === 'error'), change.toString());
  }
});
test('provisional raw timing scores automatically but cannot finalize the championship', () => {
  const f = fixture(), raw = install(f, false);
  let score = E.calculateRallyeSportScoring(f.data, f.season, f.people);
  assert.equal(score.results.at(-1).finalityBasis, 'source-provisional');
  for (let n = 6; n <= 7; n++) {
    f.data.events.push({ ...F.copy(f.data.events.at(-1)), id: 'rs-r' + n, roundNumber: n - 1 });
    f.data.results.push({ ...F.copy(f.data.results[1]), id: 'result-' + n, eventId: 'rs-r' + n });
  }
  score = E.calculateRallyeSportScoring(f.data, f.season, f.people);
  assert.equal(score.status, 'incomplete');
  assert.equal(score.results.find(row => row.resultId === raw.id).status, 'ready');
  assert.ok(score.provisionalStandings);
  assert.equal(score.standings, null);
  const built = build(f);
  assert.notEqual(built.rallyesport.scoring.status, 'invalid');
  assert.ok(P.home(built, 'rs').scoring.provisional);
  const before = built.rallyesport.scoring;
  const detail = model => P.eventResult(model, raw.eventId, 'classification');
  const calendar = model => P.calendar(model, 'rs').events.find(event => event.id === raw.eventId).rounds[0];
  assert.equal(detail(built).pointsLabel, 'Provisional points');
  assert.equal(calendar(built).state, 'Provisional classification');
  raw.status = 'Final classification'; // Explicit external confirmation would be required operationally.
  const final = build(f);
  score = final.rallyesport.scoring;
  assert.equal(score.status, 'ready');
  assert.deepEqual(score.standings, before.provisionalStandings);
  assert.deepEqual(score.results.find(row => row.resultId === raw.id).entries,
    before.results.find(row => row.resultId === raw.id).entries);
  assert.equal(detail(final).state, 'Final classification');
  assert.deepEqual(detail(final).rows, detail(built).rows);
  assert.deepEqual(P.resultGraph(final, 'rs', raw.id), P.resultGraph(built, 'rs', raw.id));
  assert.ok(calendar(final).winner);
  assert.deepEqual(calendar(final), { ...calendar(built), state: 'Final classification' });
  raw.notes.push('Results are final pending post-event technical checks.');
  raw.finalityReview = { acceptedForScoring: true, evidence: 'Synthetic scoring review', digest: E.rallyeSportClassOrderDigest(raw) };
  const pending = build(f).rallyesport.scoring;
  assert.equal(pending.results.find(row => row.resultId === raw.id).finalityBasis, 'user-confirmed');
  assert.deepEqual(pending.provisionalStandings, score.standings, 'permission to score does not finalize the standings');
});
test('a later changed final replaces the provisional RS round in the published totals', () => {
  const f = F.revisedRallyeSport(true), source = f.data.results[1];
  source.status = 'Provisional Official Classification 1/1';
  const provisional = build(f), target = score => score.results.find(row => row.resultId === source.id);
  const before = target(provisional.rallyesport.scoring);
  assert.equal(before.finalityBasis, 'source-provisional');
  const [a, b] = source.entries;
  assert.equal(a.class, b.class);
  const final = F.copy(source);
  final.status = 'Final Official Classification';
  for (const key of ['pos', 'classPos', 'times', 'stagePos', 'total']) {
    [final.entries[0][key], final.entries[1][key]] = [final.entries[1][key], final.entries[0][key]];
  }
  f.data.results[1] = final;
  const model = build(f), after = target(model.rallyesport.scoring);
  assert.equal(after.finalityBasis, 'source-final');
  assert.equal(after.entries.find(row => row.car === a.car).driverPoints, before.entries.find(row => row.car === b.car).driverPoints);
  assert.equal(model.rallyesport.scoring.results.filter(row => row.eventId === final.eventId).length, 1);
  const totals = model => model.rallyesport.scoring.provisionalStandings.overallDrivers;
  assert.equal(totals(model).find(row => row.id === 'synthetic-driver-1').points -
    totals(provisional).find(row => row.id === 'synthetic-driver-1').points, -3);
  assert.equal(P.eventResult(model, final.eventId, 'classification').state, 'Final classification');
  assert.equal(E.finalityDowngrade(final, source, 'rs'), true);
});
test('without new data archived NR/RS sporting outputs and legacy role split remain unchanged', () => {
  const f = F.revisedRallyeSport(), before = JSON.stringify(f.docs);
  const baseline = build(f);
  const context = { module: { exports: {} } };
  vm.runInNewContext(execFileSync('git', ['show', '56ad227e63246673adf30d1a4802bfdc571fabf5:assets/engine.js'], { encoding: 'utf8' }), context);
  const released = context.module.exports.buildSeason({ season: AI.projectPublic(f.season, f.people),
    rounds: {}, people: f.people, publicProjection: true });
  assert.deepEqual(JSON.parse(JSON.stringify(baseline)), JSON.parse(JSON.stringify(released)), 'released engine parity without new data');
  const nrInput = { season: AI.projectPublic(f.season, f.people), people: f.people, publicProjection: true,
    rounds: { R1: { id: 'R1', title: 'Synthetic NR classification', status: 'Final classification',
      stages: ['SS1'], entries: [{ car: '91', driver: 'Alex Test', codriver: '', class: 'OPEN',
        status: 'classified', pos: 1, total: '1:00.0', times: ['1:00.0'], stagePos: [1], pen: null }] } } };
  assert.deepEqual(JSON.parse(JSON.stringify(E.buildSeason(nrInput))),
    JSON.parse(JSON.stringify(context.module.exports.buildSeason(nrInput))), 'released engine parity with scored NR result');
  ingest(fixture());
  assert.equal(JSON.stringify(f.docs), before);
  assert.deepEqual(build(f), baseline);
  const g = fixture();
  g.input.rows[2].codriver = ''; g.input.rows[2].codriverId = '';
  g.data.entryLists[0].entries[2].codriverId = '';
  install(g);
  const scored = E.calculateRallyeSportScoring(g.data, g.season, g.people).results.at(-1).entries;
  assert.equal(scored.find(row => row.car === '3').driverPoints, 12);
  assert.equal(scored.find(row => row.car === '3').codriverPoints, null);
  assert.equal(scored.find(row => row.car === '4').codriverEligibility.scoringPosition, 2);
});
test('legacy published points and private-derived decisions survive while standings are relabelled', () => {
  const f = F.revisedRallyeSport(true);
  for (let n = 6; n <= 7; n++) {
    f.data.events.push({ ...F.copy(f.data.events.at(-1)), id: 'rs-r' + n, roundNumber: n - 1 });
    f.data.results.push({ ...F.copy(f.data.results[1]), id: 'result-' + n, eventId: 'rs-r' + n });
  }
  const source = f.data.results[1];
  source.status = 'Provisional classification';
  source.finalityReview = { acceptedForScoring: true, evidence: 'Synthetic accepted source.' };
  const context = { module: { exports: {} } };
  vm.runInNewContext(execFileSync('git', ['show', '56ad227e63246673adf30d1a4802bfdc571fabf5:assets/engine.js'], { encoding: 'utf8' }), context);
  const before = context.module.exports.calculateRallyeSportScoring(f.data, f.season, f.people);
  assert.equal(before.status, 'ready');
  const season = AI.projectPublic(f.season, f.people);
  season.rallyesport.scoring = JSON.parse(JSON.stringify(before));
  const after = E.buildSeason({ season, rounds: {}, people: f.people, publicProjection: true }).rallyesport.scoring;
  assert.equal(after.status, 'incomplete');
  assert.deepEqual(after.results, season.rallyesport.scoring.results);
  assert.deepEqual(after.provisionalStandings, season.rallyesport.scoring.standings);
  assert.equal(after.standings, null);
  delete source.finalityReview;
  const legacyBlocked = context.module.exports.calculateRallyeSportScoring(f.data, f.season, f.people);
  season.rallyesport.scoring = JSON.parse(JSON.stringify(legacyBlocked));
  assert.equal(E.buildSeason({ season, rounds: {}, people: f.people, publicProjection: true })
    .rallyesport.scoring.results.find(row => row.resultId === source.id).status, 'blocked');
  assert.equal(build(f).rallyesport.scoring.results.find(row => row.resultId === source.id).status, 'ready',
    'only rebuilding from reviewed working data unlocks the event');
});
