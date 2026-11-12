/* Synthetic display contracts only; no provider/network or browser dependencies. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const C = require('../../assets/public-components.js');
const F = require('./ai-fixtures.js');

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function fixture() {
  const f = F.revisedRallyeSport(true), raw = F.payload('results', 2026).rounds[0];
  raw.entries[0].driver = 'Synthetic driver 1';
  raw.entries[0].codriver = 'Synthetic codriver 1';
  return { f, raw };
}
function build(f, rounds = {}) {
  return E.buildSeason({ season: AI.projectPublic(f.season, f.people), rounds, people: f.people, publicProjection: true });
}
test('directories preserve role evidence, distinct events, unique classes and unresolved source identities', () => {
  const { f, raw } = fixture();
  f.data.results[2].entries[0].class = 'RS4';
  const model = build(f, { R1: raw }), entry = model.rallyesport.results[1].entries[0];
  model.rallyesport.results[1].entries.push({ ...entry, car: '91', driver: 'Unresolved source',
    driverKnown: false, driverId: 'unresolved-source', codriver: '' });
  const before = JSON.stringify(freeze(model)), nr = P.directory(model, 'nr'), rs = P.directory(model, 'rs');
  const person = rs.rows.find(row => row.id === entry.driverId);
  assert.deepEqual(person.classes, ['RS0', 'RS2', 'RS4'], 'launch classification and both actual championship classes remain distinct');
  assert.equal(new Set(person.cars).size, person.cars.length);
  assert.equal(person.events, new Set(person.apps.map(app => app.eventId)).size);
  assert.equal(person.championshipEvents, new Set(person.apps.filter(app => app.championship).map(app => app.eventId)).size);
  assert.equal(person.starts[0], P.rsRoundsStarted(model, person.id, 'driver'));
  assert.equal(person.startsCount, person.championshipEvents,
    'distinct championship starts count once across roles and exclude the launch event');
  const unresolved = rs.rows.find(row => row.name === 'Unresolved source');
  assert.equal(unresolved.href, null);
  assert.deepEqual(unresolved.starts, [null, null]);
  assert.equal(unresolved.startsCount, null);
  assert.equal(unresolved.entered, null, 'NR entry links do not establish an RS entry register');
  assert.ok(nr.rows.every(row => row.apps.every(app => !app.href.includes('/rallyesport/'))));
  assert.equal(JSON.stringify(model), before);
});
test('Crew starts stay unavailable for a DNS-only record rather than claiming zero starts', () => {
  const { f, raw } = fixture(), entry = raw.entries[0];
  entry.status = 'DNS'; entry.pos = null; entry.total = null; entry.stages = 0;
  const model = build(f, { R1: raw }), row = P.directory(model, 'nr').rows.find(person => person.name === entry.driver);
  assert.ok(row);
  assert.equal(row.startsCount, null);
});
test('RS Crew starts require source evidence for a DNF, then count that round once', () => {
  const { f } = fixture(), model = build(f), result = model.rallyesport.results[1], entry = result.entries[0];
  model.rallyesport.results.forEach(round => round.entries.forEach(candidate => {
    if (candidate.driverId === entry.driverId || candidate.codriverId === entry.driverId) candidate.status = 'DNS';
  }));
  entry.status = 'DNF'; entry.times = []; entry.stagePos = []; entry.startEvidence = '';
  const unavailable = P.directory(model, 'rs').rows.find(person => person.id === entry.driverId);
  assert.ok(unavailable);
  assert.equal(unavailable.startsCount, null, 'an unproven DNF is not a start or a zero');

  entry.startEvidence = 'Official source records a start';
  const evidenced = P.directory(model, 'rs').rows.find(person => person.id === entry.driverId);
  assert.equal(evidenced.startsCount, 1, 'source evidence establishes one championship-round start');
});
test('profile starts and awards stay unavailable for unproven DNF and blocked scoring rather than becoming zero', () => {
  const { f } = fixture(), model = build(f), result = model.rallyesport.results[1], entry = result.entries[0];
  entry.status = 'DNF'; entry.times = []; entry.stagePos = []; entry.startEvidence = '';
  const score = model.rallyesport.scoring.results.find(score => score.resultId === result.id);
  score.status = 'blocked';
  const display = P.profile([freeze(model)], 'rs', entry.driverId);
  assert.equal(display.stats.find(stat => stat[0] === 'Starts')[1], null);
  assert.equal(display.seasons[0].row.apps.find(app => app.car === entry.car && app.href.includes(result.id)).points, null);
  assert.equal(display.seasons[0].charts[0].row.rounds[result.id], undefined);
});
test('NR directories distinguish multi-day rounds, printed roles, credited roles and MSA-only starts', () => {
  const season = F.season(2026), raw = F.payload('results', 2026).rounds[0], people = F.docs()['data/people.json'];
  season.rounds.push({ ...season.rounds[0], id: 'R2', n: 2, day: 'Day 2' });
  raw.entries[0].driver = 'Alex Test';
  raw.entries[0].codriver = 'Blake Example';
  raw.entries[0].credit = { driver: raw.entries[0].codriver, codriver: raw.entries[0].driver };
  raw.extraStarts = [{ car: '99', driver: 'MSA Only', codriver: '', class: 'OPEN' }];
  const model = freeze(E.buildSeason({ season, rounds: { R1: raw, R2: raw }, people }));
  const display = P.directory(model, 'nr'), person = display.rows.find(row => row.id === model.rounds[0].entries[0].driverId);
  assert.equal(person.events, 1);
  assert.equal(person.championshipEvents, 2, 'two rounds at one event are not one championship round');
  assert.equal(person.apps[0].role, 'driver', 'the printed source role remains visible');
  assert.equal(person.apps[0].creditedRole, 'codriver');
  assert.match(person.apps[0].note, /Printed Driver; championship credit: Co-driver/);
  assert.equal(person.startsCount, 2, 'same-event Day 1 and Day 2 starts remain separate rounds');
  const msa = display.rows.find(row => row.name === 'MSA Only');
  assert.deepEqual(msa.starts, [2, 0]);
  assert.equal(msa.startsCount, 2, 'MSA-only credited starts are counted once across roles');
  assert.ok(msa.apps.every(app => !app.graphHref && app.note.includes('absent from this classification')));
  const profile = P.profile([model], 'nr', person.id);
  assert.equal(profile.stats.find(stat => stat[0] === 'Starts')[1], 2);
  assert.deepEqual(profile.seasons[0].charts.map(chart => chart.role), ['driver', 'codriver']);
});
test('profiles retain cross-season roles, credited NR starts and independent RS source history without global context', () => {
  const { f, raw } = fixture(), first = build(f, { R1: raw });
  const next = F.copy(raw);
  [next.entries[0].driver, next.entries[0].codriver] = [raw.entries[0].codriver, raw.entries[0].driver];
  const second = E.buildSeason({ season: F.season(2027), rounds: { R1: next }, people: f.people });
  const id = first.rounds[0].entries[0].driverId;
  const before = JSON.stringify(freeze([first, second])), nr = P.profile([second, first], 'nr', id);
  assert.deepEqual(new Set(nr.roles), new Set(['driver', 'codriver']));
  assert.equal(nr.seasons.length, 2);
  assert.equal(nr.stats.find(stat => stat[0] === 'Starts')[1], 2);
  assert.ok(nr.seasons.every(season => season.row.apps.every(app => app.href.startsWith('#/' + season.year + '/round/'))));
  const rs = P.profile([first], 'rs', id);
  assert.ok(rs.seasons.every(season => season.row.apps.every(app => app.href.includes('/rallyesport/'))));
  assert.ok(rs.seasons[0].charts.every(chart => chart.classOnly && !chart.model.rounds.some(round => round.id === first.rallyesport.results[0].id)));
  assert.equal(JSON.stringify([first, second]), before);
});
test('shared directories and profile history have identical equivalent-field structures and wording', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw }), id = model.rounds[0].entries[0].driverId;
  const shape = html => html.replace(/>[^<]*</g, '><').replace(/href="[^"]*"/g, 'href="LINK"')
    .replace(/data-s="[^"]*"/g, 'data-s="SEARCH"').replace(/class="cls [^"]*"/g, 'class="cls CLASS"');
  const dirs = ['nr', 'rs'].map(mode => {
    const display = P.directory(model, mode);
    display.rows = display.rows.filter(row => row.id === id);
    display.rows[0].classes = display.rows[0].classes.slice(0, 1);
    return C.directory(display).html;
  });
  assert.equal(shape(dirs[0]), shape(dirs[1]));
  const profiles = ['nr', 'rs'].map(mode => {
    const display = P.profile([model], mode, id);
    display.seasons[0].row.apps = display.seasons[0].row.apps.slice(0, 1).map(app => ({ ...app, note: '' }));
    const html = C.profile(display, '<div class="profile-head">Header</div>', [['Chart']]).html;
    return html.match(/<div class="table-wrap profile-history"[\s\S]*?<\/table>/)[0];
  });
  assert.equal(shape(profiles[0]), shape(profiles[1]));
});
test('Crews combine role standings and count distinct round starts once across roles', () => {
  const season = F.season(2026), people = F.docs()['data/people.json'], raw = F.payload('results', 2026).rounds[0];
  season.minStarts = 3;
  season.rounds.push({ ...season.rounds[0], id: 'R2', n: 2, day: 'Day 2' });
  const base = raw.entries[0];
  raw.entries = [
    { ...base, car: '1', driver: 'Alex Test', codriver: 'Blake Example', pos: 1 },
    { ...base, car: '2', driver: 'Blake Example', codriver: 'Alex Test', pos: 2 }
  ];
  const second = F.copy(raw);
  const model = freeze(E.buildSeason({ season, rounds: { R1: raw, R2: second }, people }));
  const display = P.directory(model, 'nr'), alex = display.rows.find(row => row.name === 'Alex Test');
  assert.deepEqual(alex.starts, [2, 2], 'role-specific evidence remains available to other views');
  assert.equal(alex.startsCount, 2, 'multiple cars and both roles in a round do not inflate the Crew count');
  assert.equal(alex.hasIneligible, true);
  const html = C.directory(display).html;
  assert.equal((html.match(/<th scope="col">Standings<\/th>/g) || []).length, 1);
  assert.match(html, /crew-standing-role-label">Driver<\/span> P\d+[^<]*<\/span><span class="crew-standing-role"><span class="crew-standing-role-label">Co-driver<\/span>/);
  assert.doesNotMatch(html, /Driver standings|Co-driver standings|Events entered \(documented\)/);
  assert.match(html, /aria-describedby="crew-eligibility-note"/);
  assert.match(html, /id="crew-eligibility-note"/);
  assert.equal((html.match(/class="eligibility-mark"/g) || []).length,
    display.rows.filter(row => row.hasIneligible).length);

  const eligibleSeason = F.copy(season);
  eligibleSeason.minStarts = 0;
  const eligible = C.directory(P.directory(E.buildSeason({ season: eligibleSeason,
    rounds: { R1: raw, R2: second }, people }), 'nr')).html;
  assert.doesNotMatch(eligible, /crew-eligibility-note|class="eligibility-mark"/,
    'eligible lists do not get per-row qualifiers or an empty footnote');
});
test('Info keeps NR documents separate from explicit RS rules and labels shared site provenance', () => {
  const { f, raw } = fixture(), model = freeze(build(f, { R1: raw }));
  const site = freeze({ info: { intro: 'Synthetic Northern Regions editorial text',
    documents: [{ title: 'Shared site reference', url: 'https://example.com/shared' }] } });
  const metadata = freeze({ ruleset: { title: 'Synthetic RS source edition', sourceUrl: 'https://example.com/rs-rules',
    issueDate: '2026-07-09' } });
  const nr = P.information(model, 'nr', site, metadata), rs = P.information(model, 'rs', site, metadata);
  assert.deepEqual(nr.documents, model.documents);
  assert.deepEqual(rs.documents.map(doc => doc.url), ['https://example.com/rs-rules']);
  assert.deepEqual(P.information(model, 'rs', site).documents, []);
  assert.ok(rs.documents.every(doc => !model.documents.some(nr => nr.url === doc.url)));
  const html = C.information(rs, 'Channels').html;
  assert.match(html, /Shared site information · Northern Regions context/);
  assert.match(html, /Synthetic Northern Regions editorial text/);
  assert.match(html, /not this competition’s regulations/);
  assert.match(html, /#\/getting-started/);
});
test('sources retain source-owned finality and notes without leaking other competition or private commentary', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw });
  assert.match(C.sources(P.sources(model, 'nr')).html, /Points are calculated here from the official classifications, not yet confirmed by MSA/);
  model.notes.push('Synthetic NR-only season note');
  model.rounds[0].confirmed = true;
  model.msa = { label: 'Synthetic MSA standings', generated: 'Synthetic edition', url: 'https://example.com/nr-only-msa' };
  model.rallyesport.results[1].source.description = 'Private upload commentary';
  const before = JSON.stringify(freeze(model)), nr = P.sources(model, 'nr'), rs = P.sources(model, 'rs');
  assert.ok(C.sources(nr).html.includes('Synthetic NR-only season note'));
  assert.match(C.sources(nr).html, /R1 points checked against Synthetic MSA standings \(Synthetic edition\)/);
  const html = C.sources(rs).html;
  assert.doesNotMatch(html, /Synthetic NR-only season note|Synthetic MSA standings|Private upload commentary|\/round\//);
  assert.ok(rs.results.every(result => result.sourceLinks.every(link => !link.url.includes('nr-only'))));
  assert.match(html, /Sources &amp; data notes/);
  assert.equal(JSON.stringify(model), before);
});
test('result adapters preserve NR printed/credited identities, class-only awards, DNF/DNS and unknown totals', () => {
  const season = F.season(2026), raw = F.payload('results', 2026).rounds[0], base = raw.entries[0];
  raw.stages = ['SS1', 'SS3'];
  raw.status = 'Provisional classification';
  raw.entries = [
    { ...base, car: '1', driver: 'Source Driver', codriver: 'Source Co', class: 'OPEN', pos: 1,
      scoredClass: 'TEST', credit: { driver: 'Credited Driver', noCodriver: true, why: 'Synthetic credited identity.' } },
    { ...base, car: '2', driver: 'Missing Total', codriver: 'Co Two', class: 'OPEN', pos: 2, total: null },
    { ...base, car: '3', driver: 'Recorded DNF', codriver: 'Co Three', status: 'DNF', pos: null },
    { ...base, car: '4', driver: 'Recorded DNS', codriver: 'Co Four', status: 'DNS', pos: null }
  ];
  const model = freeze(E.buildSeason({ season, rounds: { R1: raw }, people: { people: [] } })), before = JSON.stringify(model);
  const display = P.result(model, 'nr', 'R1', 'classification', {});
  assert.equal(display.state, 'Provisional classification');
  assert.deepEqual(display.stages, ['SS1', 'SS3']);
  display.rows.forEach(row => {
    const source = model.rounds[0].entries.find(entry => entry.car === row.car);
    assert.deepEqual([row.car, row.status, row.pos, row.classPos, row.cls, row.stages],
      [source.car, source.status, source.pos, source.classPos, source.cls, source.stagesCompleted]);
    assert.equal(row.points[0].points, source.points?.total ?? null);
    assert.equal(row.points[1].points, source.noCreditCodriver ? null : source.points?.total ?? null);
  });
  assert.deepEqual(display.rows[0].points.map(row => row.points), [5, null], 'no extra overall award for a class-only entrant or uncredited co-driver');
  assert.match(display.rows[0].credit, /Credited Driver.*no co-driver start counted/);
  assert.equal(display.rows[0].classNote, 'sheet: OPEN');
  assert.equal(display.rows[1].total, '—');
  assert.equal(display.rows[1].gap, '—');
  assert.deepEqual(display.rows.slice(2).map(row => row.points[0].points), [0, null]);
  assert.ok(!display.awards.some(row => row.car === '1' && row.role === 'codriver'));
  const html = C.resultShell(display, C.resultClassification(display)).html;
  for (const text of ['Source Driver', 'Credited Driver', 'Synthetic credited identity.', 'sheet: OPEN', 'DNF', 'DNS']) assert.ok(html.includes(text), text);
  assert.equal(JSON.stringify(model), before);
});
test('classification points collapse equal known role awards but retain unequal, missing and non-scoring distinctions', () => {
  function html(driver, codriver, driverHelp = '', codriverHelp = '') {
    return C.resultClassification({ scoringBasis: 'Synthetic scoring basis', awards: [], rows: [{
      car: '1', pos: 1, status: 'classified', driver: { name: 'Driver', href: null },
      codriver: { name: 'Co-driver', href: null }, cls: 'RS2', classNote: '', vehicle: 'Car',
      stages: 1, penalty: '—', total: '1:00.00', gap: '—', previousGap: '—', classPos: 1, credit: '',
      points: [
        { role: 'driver', points: driver, detail: 'RS2', detailHelp: driverHelp },
        { role: 'codriver', points: codriver, detail: 'RS2', detailHelp: codriverHelp }
      ]
    }] });
  }
  const equal = html(15, 15);
  assert.match(equal, /result-points-equal/);
  assert.match(equal, /Driver and co-driver each scored 15 championship points/);
  assert.equal((equal.match(/<b aria-hidden="true">15<\/b>/g) || []).length, 1);
  assert.doesNotMatch(equal, />D <b|>C <b/);

  const equalZero = html(0, 0);
  assert.equal((equalZero.match(/<b aria-hidden="true">0<\/b>/g) || []).length, 1,
    'zero is a known equal award, not missing data');
  const unequal = html(12, 10);
  assert.match(unequal, /aria-label="Driver points">D <b>12<\/b>/);
  assert.match(unequal, /aria-label="Co-driver points">C <b>10<\/b>/);
  const missing = html(0, null);
  assert.match(missing, /aria-label="Driver points">D <b>0<\/b>/);
  assert.match(missing, /aria-label="Co-driver points">C <b>—<\/b>/);
  const nonScoring = html(0, 0, 'Non-scoring role', '');
  assert.doesNotMatch(nonScoring, /result-points-equal/,
    'an RS0/non-scoring zero is not presented as an earned equal award');
  assert.match(nonScoring, /aria-label="Driver points">D <b>0<\/b>/);
  assert.match(nonScoring, /aria-label="Co-driver points">C <b>0<\/b>/);
});
test('result gaps never skip a classified row with an unavailable official total', () => {
  const { f, raw } = fixture(), base = raw.entries[0];
  raw.entries = [0, 1, 2].map(index => ({ ...base, car: String(index + 1), pos: index + 1,
    total: index === 1 ? null : index === 0 ? '1:00.0' : '1:02.0' }));
  f.data.results[1].entries = f.data.results[1].entries.slice(0, 3).map((entry, index) => ({
    ...entry, pos: index + 1, status: 'classified', total: raw.entries[index].total
  }));
  const model = freeze(build(f, { R1: raw }));
  for (const [mode, id] of [['nr', 'R1'], ['rs', f.data.results[1].id]]) {
    const display = P.result(model, mode, id, 'classification');
    assert.deepEqual(display.rows.map(row => row.previousGap), ['—', '—', '—']);
    assert.equal(display.rows[2].gap, '+0:02.0', 'known leader gap is independent of the unavailable previous gap');
  }
});
test('RS result facts retain source order, independent class-role ranks, printed hundredths and technical holds', () => {
  const { f } = fixture(), source = f.data.results[1];
  source.classMappings = { '2WD': 'RS2' };
  source.entries[0].class = '2WD';
  source.entries[0].total = '02:00.04'; source.entries[0].penalty = '00:01.02';
  const model = build(f), result = model.rallyesport.results[1];
  result.notes.push('results are final pending post-event technical checks');
  const score = model.rallyesport.scoring.results.find(row => row.resultId === result.id);
  Object.assign(score.entries[0], { driverPoints: 0, codriverPoints: 15,
    driverEligibility: { status: 'unverified', scoringClass: 'RS0', scoringPosition: null },
    codriverEligibility: { status: 'eligible', scoringClass: 'RS2', scoringPosition: 1 } });
  result.source.description = 'Do not forward private upload commentary';
  result.entries[0].identityReview = { why: 'Do not forward private identity review' };
  const before = JSON.stringify(freeze(model)), display = P.result(model, 'rs', result.id, 'classification');
  assert.equal(display.state, 'Pending technical checks');
  assert.equal(display.pointsLabel, 'Points available', 'source status and accepted awards are distinct facts');
  assert.deepEqual(display.rows.map(row => row.car), result.entries.map(row => row.car));
  assert.deepEqual([display.rows[0].pos, display.rows[0].classPos, display.rows[0].cls, display.rows[0].total, display.rows[0].penalty],
    [result.entries[0].pos, result.entries[0].classPos, 'RS2', '02:00.04', '00:01.02']);
  assert.deepEqual(display.rows[0].points.map(row => row.points), [0, 15]);
  assert.equal(display.rows[0].stages, null, 'observed timing is not invented as a printed completed-stage count');
  assert.deepEqual(display.awards.filter(row => row.car === result.entries[0].car).map(row => [row.role, row.rank, row.points]),
    [['codriver', 1, 15], ['driver', null, 0]]);
  assert.doesNotMatch(JSON.stringify(display), /Do not forward|identityReview|classMappingEvidence/);
  assert.equal(JSON.stringify(model), before);
});
test('shared result shell, classification, filters and both stage tables have identical common markup', () => {
  const { f, raw } = fixture(), source = f.data.results[1];
  raw.stages = source.stages.map(stage => stage.label || stage.id);
  raw.entries[0].times = source.entries[0].times.slice();
  raw.entries[0].stagePos = source.entries[0].stagePos.slice();
  const model = build(f, { R1: raw });
  const nr = P.result(model, 'nr', 'R1', 'classification'), rs = P.result(model, 'rs', model.rallyesport.results[1].id, 'classification');
  const shape = html => html.replace(/>[^<]*</g, '><').replace(/href="[^"]*"/g, 'href="PROFILE"')
    .replace(/class="cls [^"]*"/g, 'class="cls CLASS"').replace(/data-car="[^"]*"/g, 'data-car="CAR"');
  const firstTable = html => html.slice(0, html.indexOf('</tbody>')).replace(/(<tbody><tr\b[\s\S]*?<\/tr>)[\s\S]*$/, '$1') + '</tbody></table></div>';
  assert.equal(shape(firstTable(C.resultClassification(nr))), shape(firstTable(C.resultClassification(rs))));
  const headers = html => html.match(/<thead>[\s\S]*?<\/thead>/)[0];
  assert.equal(headers(C.resultClassification(nr)), headers(C.resultClassification(rs)), 'exact common header wording and attributes');
  assert.equal(C.resultShell(nr, '').html.match(/<nav class="tabs"[\s\S]*?<\/nav>/)[0].replace(/href="[^"]*"/g, 'href="TAB"'),
    C.resultShell(rs, '').html.match(/<nav class="tabs"[\s\S]*?<\/nav>/)[0].replace(/href="[^"]*"/g, 'href="TAB"'));
  const controls = [nr.graph, rs.graph].map(graph => C.graphControls(graph, ['1'], graph.metrics[0], ['#123456']));
  assert.equal(controls[0].metrics, controls[1].metrics, 'all metric labels, help controls and attributes are common');
  assert.equal(shape(firstTable(C.stageTable(nr.graph))), shape(firstTable(C.stageTable(rs.graph))));
  assert.equal(shape(C.stageTable(nr.graph, ['1'], ['#123456'])), shape(C.stageTable(rs.graph, ['1'], ['#123456'])));
  assert.match(controls[0].metrics, /role="group" aria-label="Measure"/);
  assert.doesNotMatch(controls[0].metrics, /role="tablist"/);
});
test('both graph adapters retain engine-owned values and their independent sparse stage axes for every metric', () => {
  const { f, raw } = fixture(), result = f.data.results[1];
  result.stages = [{ id: 'foreign-8', label: 'RS 8' }, { id: 'foreign-11', label: 'RS 11' }];
  result.entries[0].times = [null, '1:00.03']; result.entries[0].stagePos = [null, 7];
  const model = freeze(build(f, { R1: raw })), before = JSON.stringify(model);
  const nr = P.resultGraph(model, 'nr', 'R1'), rs = P.resultGraph(model, 'rs', result.id);
  assert.deepEqual(nr.progression, model.rounds[0].progression);
  assert.deepEqual(nr.stages, model.rounds[0].stages);
  assert.deepEqual(rs.stages, ['RS 8', 'RS 11']);
  const source = model.rallyesport.results[1], adapted = { ...source, stages: source.stages.map(stage => ({ ...stage, nrStage: stage.id })) };
  for (const metric of P.resultMetrics) {
    E.buildRallyeSportGraph(adapted, source.stages.map(stage => stage.id), metric.id).forEach(series => {
      assert.deepEqual(rs.progression[series.entry.car][metric.id === 'loss' ? 'delta' : metric.id], series.values);
    });
  }
  assert.deepEqual(rs.entries[0].times, [null, 60.03]);
  assert.deepEqual(rs.entries[0].stagePos, [null, 7]);
  assert.equal(rs.timePrecision, 2);
  assert.ok(rs.progression[rs.entries[0].car].cum.every(value => value === null || typeof value === 'number'));
  assert.equal(JSON.stringify(model), before);
});
test('launch, future/undated/pending and unavailable scoring never acquire fabricated awards or winners', () => {
  const { f } = fixture(), model = build(f);
  const launch = P.result(model, 'rs', model.rallyesport.results[0].id, 'classification');
  assert.equal(launch.scope, 'Non-scoring event');
  assert.ok(launch.rows.every(row => row.points.every(role => role.points === null)));
  assert.deepEqual(launch.awards, []);
  assert.ok(launch.graph.entries.some(row => row.times.some(time => time != null)));
  const pending = P.result(model, 'nr', 'R1', 'classification');
  assert.equal(pending.published, false);
  assert.equal(pending.pointsLabel, 'Points unavailable');
  assert.equal(pending.graph, null);
  assert.deepEqual(pending.rows, []);
  const now = Date.parse('2026-01-01T00:00:00Z');
  assert.match(C.resultShell(pending, '', now).html, /Upcoming/);
  const undated = { ...pending, date: '', dateIso: '' };
  assert.equal((C.resultShell(undated, '', now).html.match(/Date to be confirmed/g) || []).length, 1);
  assert.equal(P.result(model, 'rs', 'not-a-source-result', 'graph'), null);
  const result = model.rallyesport.results[1], score = model.rallyesport.scoring.results.find(row => row.resultId === result.id);
  score.status = 'blocked'; score.entries = [];
  result.status = 'Provisional classification';
  const blocked = P.result(freeze(model), 'rs', result.id, 'classification');
  assert.equal(blocked.state, 'Provisional classification');
  assert.ok(blocked.rows.every(row => row.points.every(role => role.points === null)));
  assert.equal(blocked.pointsLabel, 'Points unavailable');
  assert.doesNotMatch(C.resultShell(blocked, C.resultClassification(blocked)).html, /Round winners|finished ahead|winner/i);
});
test('result navigation retains cars, metrics, historical routes and explicitly related source-owned links', () => {
  const { f, raw } = fixture();
  const result = f.data.results[1], event = f.data.events.find(event => event.id === result.eventId);
  event.nrEventId = f.season.events[0].id;
  f.season.events[0].links.srs = 'https://example.com/dynamic-synthetic-srs.pdf';
  result.source.url = 'https://example.com/own-rs-classification.pdf';
  const model = freeze(build(f, { R1: raw }));
  for (const [mode, id, path] of [['nr', 'R1', '/round/R1/'], ['rs', result.id, '/rallyesport/' + result.id + '/']]) {
    const display = P.result(model, mode, id, 'stages', { cars: '1,2', m: 'cgap', rs: '1' });
    display.tabs.forEach(tab => {
      assert.ok(tab.href.startsWith('#/2026' + path + tab.id + '?'));
      const query = new URLSearchParams(tab.href.split('?')[1]);
      assert.deepEqual([query.get('cars'), query.get('m'), query.get('competition'), query.has('rs')], ['1,2', 'cgap', mode, false]);
    });
    assert.ok(display.navigation.every(row => row.href.includes('/stages?competition=' + mode)));
    assert.equal(display.tabs.filter(tab => tab.selected).length, 1);
  }
  const rs = P.result(model, 'rs', result.id, 'classification');
  assert.deepEqual(rs.sourceLinks, [{ label: 'Official source classification', url: result.source.url }]);
  assert.ok(rs.related.some(group => group.label === 'Related NR event links' && group.links.some(link => link.url.includes('dynamic-synthetic-srs'))));
  assert.ok(!rs.sourceLinks.some(link => link.url.includes('dynamic-synthetic-srs')));
  const changed = build(f);
  changed.rallyesport.events.find(row => row.id === event.id).nrEventId = 'unmapped';
  assert.deepEqual(P.result(changed, 'rs', result.id, 'graph').related, []);
});
test('stage tables preserve missing times with published positions, official finals, penalties and empty timing', () => {
  const { f } = fixture(), result = f.data.results[1];
  result.stages = [{ id: 'one', label: 'Final' }, { id: 'three', label: 'SS3' }];
  result.entries[0].times = [null, '0:01.03']; result.entries[0].stagePos = [4, 2];
  result.entries[0].total = '01:59.07'; result.entries[0].penalty = '00:02.03';
  const graph = P.resultGraph(freeze(build(f)), 'rs', result.id);
  const selected = C.stageTable(graph, [graph.entries[0].car], ['#123456']);
  assert.match(selected, /<b class="mono">—<\/b><small>P4/);
  assert.match(selected, /01:59.07/);
  assert.match(selected, /penalty 00:02.03/);
  assert.match(selected, /0:01.03/);
  assert.doesNotMatch(selected, /undefined|NaN/);
  assert.equal(C.stageTable({ ...graph, entries: graph.entries.map(entry => ({ ...entry, times: [null, null] })) }),
    '<div class="card empty">No stage times are available.</div>');
});
test('result components escape source/identity text and reject unsafe source destinations without mutation', () => {
  const { f, raw } = fixture(), model = freeze(build(f, { R1: raw }));
  const display = P.result(model, 'nr', 'R1', 'classification');
  display.name = '<img src=x onerror=alert(1)>';
  display.rows[0].driver.name = '<script>alert(1)</script>';
  display.notes.push('<svg onload=alert(1)>');
  display.sourceLinks = [{ label: 'Unsafe', url: 'javascript:alert(1)' }, { label: 'Safe', url: 'https://example.com/a?x=1&y=2' }];
  const html = C.resultShell(display, C.resultClassification(display)).html;
  assert.doesNotMatch(html, /<script>|<img|<svg onload|javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /https:\/\/example.com\/a\?x=1&amp;y=2/);
  assert.throws(() => P.resultGraph(model, 'unknown', 'R1'), /Unsupported result competition/);
});
test('standings preserve every NR role, award component, filtered overall order and qualification without mutating sources', () => {
  const { f, raw } = fixture();
  f.season.minStarts = 2;
  f.season.msa = { confirmedRounds: ['R1'], label: 'Synthetic MSA standings',
    url: 'https://example.com/synthetic-msa.pdf', generated: 'Synthetic issue date' };
  const model = freeze(build(f, { R1: raw })), before = JSON.stringify(model);
  for (const [role, key] of [['driver', 'drivers'], ['codriver', 'codrivers']]) {
    const all = P.standings(model, 'nr', role, {});
    assert.deepEqual(all.rows.map(row => [row.id, row.rank, row.points, row.starts, row.ineligible]),
      model.standings[key].map(row => [row.id, row.rank, row.total, row.starts, !row.eligible]));
    assert.deepEqual(all.columns.map(column => [column.id, column.note]), [['R1', '']]);
    assert.match(all.notes.find(note => note.links.length).text, /Synthetic MSA standings.*Synthetic issue date/);
    for (const cls of all.classes) {
      const selected = P.standings(model, 'nr', role, { class: cls.id, pts: 'split' });
      const rawRows = model.standings[key].filter(row => row.cls === cls.id);
      assert.deepEqual(selected.rows.map(row => [row.id, row.rank, row.overallRank, row.points]),
        rawRows.map((row, i) => [row.id, i + 1, row.rank, row.total]));
      selected.rows.forEach((row, index) => {
        assert.equal(row.classPoints, Object.values(rawRows[index].rounds).reduce((sum, item) => sum + item.c, 0));
        row.cells.forEach((cell, i) => {
          const value = rawRows[index].rounds[selected.columns[i].id];
          assert.equal(cell.points, value ? value.pts : null);
          if (value && value.status !== 'DNF') assert.equal(cell.detail, value.o + '+' + value.c);
        });
      });
      assert.ok(selected.controls.roles.every(control => control.href.includes('pts=split')));
      assert.match(C.standings(selected).html, /scope="col" class="num">Overall pos/);
    }
  }
  assert.equal(JSON.stringify(model), before);
  assert.throws(() => P.standings(model, 'nr', 'invalid'), /Unsupported standings role/);
});
test('standings show one accessible asterisk and a conditional bottom footnote for actual ineligibility', () => {
  const { f, raw } = fixture();
  f.season.minStarts = 2;
  const ineligible = P.standings(freeze(build(f, { R1: raw })), 'nr', 'driver');
  assert.ok(ineligible.rows.some(row => row.ineligible));
  assert.match(ineligible.ineligibleNote, /^\* Minimum starts not met\.$/);
  const ineligibleHtml = C.standings(ineligible).html;
  assert.equal((ineligibleHtml.match(/class="eligibility-mark"/g) || []).length,
    ineligible.rows.filter(row => row.ineligible).length);
  assert.match(ineligibleHtml, /aria-describedby="standings-eligibility-note"/);
  assert.match(ineligibleHtml, /id="standings-eligibility-note"/);
  assert.doesNotMatch(ineligibleHtml, /standing-qualifier/,
    'qualification wording is not repeated in each row');

  const { f: eligibleFixture, raw: eligibleRaw } = fixture();
  eligibleFixture.season.minStarts = 0;
  const eligible = P.standings(freeze(build(eligibleFixture, { R1: eligibleRaw })), 'nr', 'driver');
  assert.ok(eligible.rows.every(row => !row.ineligible));
  assert.equal(eligible.ineligibleNote, undefined);
  assert.doesNotMatch(C.standings(eligible).html, /standings-eligibility-note|class="eligibility-mark"/);
});
test('NR countback, class-only awards, credited DNF, missing rounds and eligibility remain engine-owned', () => {
  const s = F.season(2026), first = F.payload('results', 2026).rounds[0], second = F.copy(first);
  s.minStarts = 2;
  s.rounds.push({ ...s.rounds[0], id: 'R2', date: '2026-03-01' });
  const entry = first.entries[0];
  first.entries = [
    { ...entry, car: '1', driver: 'Countback A', codriver: 'Co A', class: 'OPEN', pos: 1 },
    { ...entry, car: '2', driver: 'Countback B', codriver: 'Co B', class: 'OPEN', pos: 2 },
    { ...entry, car: '3', driver: 'Class Only', codriver: 'Co Only', class: 'TEST', pos: 3 },
    { ...entry, car: '4', driver: 'Credited DNF', codriver: 'Co DNF', class: 'OPEN', status: 'DNF', pos: null }
  ];
  second.entries = [
    { ...first.entries[0], pos: 2 }, { ...first.entries[1], pos: 1 }, { ...first.entries[2], pos: 3 }
  ];
  const model = freeze(E.buildSeason({ season: s, rounds: { R1: first, R2: second }, people: { people: [] } }));
  for (const [role, key] of [['driver', 'drivers'], ['codriver', 'codrivers']]) {
    const display = P.standings(model, 'nr', role, { pts: 'split' });
    assert.deepEqual(display.rows.map(row => [row.name, row.rank, row.points]), model.standings[key].map(row => [row.name, row.rank, row.total]));
    assert.deepEqual(display.rows.slice(0, 2).map(row => row.rank), [1, 2], 'NR does not acquire RS shared ranks');
    assert.equal(display.rows[0].points, display.rows[1].points, 'equal NR totals retain engine countback/name ordering');
    const only = display.rows.find(row => row.name.includes('Only'));
    assert.ok(only.cells.every(cell => cell.detail.startsWith('0+')), 'class-only entries never acquire an overall award');
    const dnf = display.rows.find(row => row.name.includes('DNF'));
    assert.deepEqual([dnf.starts, dnf.ineligible, dnf.cells[0].points, dnf.cells[0].status, dnf.cells[1].points],
      [1, true, 0, 'DNF', null]);
    assert.match(C.standings(display).html, /No recorded championship start/);
    assert.ok(display.columns.every(column => column.note), 'unconfirmed qualifications remain attached to their own rounds');
  }
});
test('RS standings preserve snapshot class ranks, role-specific ties, totals, zero and honest starts; launch never supplies a column', () => {
  const { f } = fixture();
  f.data.results[2].entries[0].class = 'RS4';
  f.data.results[2].entries[6].classPos = 2;
  const model = freeze(build(f)), before = JSON.stringify(model);
  const tables = model.rallyesport.scoring.provisionalStandings;
  for (const [role, overallKey, classKey] of [
    ['driver', 'overallDrivers', 'classDrivers'], ['codriver', 'overallCodrivers', 'classCodrivers']
  ]) {
    for (const cls of ['', 'RS2', 'RS4']) {
      const display = P.standings(model, 'rs', role, { class: cls, pts: 'split' });
      const rawRows = cls ? tables[classKey][cls] : tables[overallKey];
      assert.deepEqual(display.rows.map(row => [row.id, row.rank, row.points]), rawRows.map(row => [row.id, row.rank, row.points]));
      assert.equal(display.scoring.provisional, true);
      assert.deepEqual(display.columns.map(column => column.label), ['R1', 'R2', 'R3', 'R4']);
      assert.ok(!display.columns.some(column => column.id === 'rs-r1-classification'));
      display.rows.forEach(row => {
        assert.equal(row.overallRank, tables[overallKey].find(person => person.id === row.id).rank);
        const points = P.rsPersonRoundPoints(model, row.id, role, cls);
        assert.deepEqual(row.cells.map(cell => cell.points), display.columns.map(column => points[column.id]?.pts ?? null));
        if (cls) assert.ok(row.classes.every(value => value === cls));
      });
      assert.deepEqual(display.controls.roles.map(control => new URLSearchParams(control.href.split('?')[1]).get('pts')), ['split', 'split']);
    }
    const overall = P.standings(model, 'rs', role);
    assert.equal(overall.rows.find(row => row.id === 'synthetic-' + role + '-8').points, 0);
    assert.equal(overall.rows.find(row => row.id === 'synthetic-' + role + '-8').starts, 4);
    assert.deepEqual(overall.rows.find(row => row.id === 'synthetic-' + role + '-1').classes, ['RS2', 'RS4']);
    const tied = P.standings(freeze(build(fixture().f)), 'rs', role);
    assert.ok(tied.rows.some((row, index) => index && row.rank === tied.rows[index - 1].rank), 'published RS tied ranks survive');
  }
  assert.equal(JSON.stringify(model), before);
  assert.doesNotMatch(JSON.stringify(P.standings(model, 'rs', 'driver')), /identityReview|membershipReview|startEvidence|nonScoringPeople/);
});
test('RS missing/blocked snapshots, legacy RS0 and standings-only people never gain inferred points, rank or starts', () => {
  const { f } = fixture(), model = build(f);
  const snapshot = model.rallyesport.scoring.provisionalStandings;
  snapshot.overallDrivers.push({ id: 'standings-only', name: 'Snapshot only', rank: 99, points: 0, eligibilityStatus: 'eligible' });
  const person = P.standings(freeze(model), 'rs', 'driver').rows.find(row => row.id === 'standings-only');
  assert.equal(person.starts, null);
  assert.equal(person.points, 0);
  assert.ok(person.cells.every(cell => cell.points === null));
  const projected = AI.projectPublic(f.season, f.people);
  delete projected.rallyesport.scoring;
  const missing = E.buildSeason({ season: projected, rounds: {}, people: f.people, publicProjection: true });
  const unavailable = P.standings(missing, 'rs', 'driver');
  assert.equal(unavailable.scoring.available, false);
  assert.deepEqual(unavailable.rows, []);
  assert.match(C.standings(unavailable).html, /Championship totals are not available/);
  const legacy = F.revisedRallyeSport(true);
  delete legacy.data.eligibilityPolicy;
  const legacyModel = E.buildSeason({ season: legacy.season, rounds: {}, people: legacy.people });
  const legacyDisplay = P.standings(legacyModel, 'rs', 'driver', { class: 'RS0', pts: 'split' });
  assert.equal(legacyDisplay.selectedClass, 'RS0');
  assert.ok(legacyDisplay.rows.length, 'legacy non-scoring table remains reachable');
  assert.ok(legacyDisplay.rows.every(row => row.rank == null && row.ineligible && row.points === 0));
  assert.match(C.standings(legacyDisplay).html, /standings-eligibility-note/);
  assert.match(C.standings(legacyDisplay).html, /does not establish non-membership/);
  const blocked = build(f), score = blocked.rallyesport.scoring;
  const resultId = score.results[0].resultId;
  score.results[0].status = 'blocked'; score.results[0].entries = [];
  const display = P.standings(freeze(blocked), 'rs', 'driver');
  const index = display.columns.findIndex(column => column.id === resultId);
  assert.ok(index >= 0);
  assert.ok(display.columns[index].note);
  assert.ok(display.rows.every(row => row.cells[index].points === null));
});
test('standings distinguish unsupported DNF starts, future columns and ready versus provisional season snapshots', () => {
  const { f } = fixture();
  Object.assign(f.data.results[2].entries[0], {
    status: 'DNF', pos: null, classPos: null, times: [null], stagePos: [null], total: null
  });
  const uncertain = freeze(build(f));
  for (const role of ['driver', 'codriver']) {
    const row = P.standings(uncertain, 'rs', role).rows.find(row => row.id === 'synthetic-' + role + '-1');
    assert.equal(row.starts, null, 'earlier scored appearances do not resolve a later unproven DNF');
    assert.equal(row.cells[1].points, null, 'unproven DNF points are not a known zero');
  }
  const future = P.standings(freeze(build(F.revisedRallyeSport(false))), 'rs', 'driver');
  assert.deepEqual(future.columns.map(column => column.label), ['R1', 'R2', 'R3'], 'a future round has no invented result column');
  assert.equal(future.scoring.provisional, true);
  const held = F.revisedRallyeSport(true);
  held.data.results[1].status = 'Provisional classification';
  held.data.results.slice(2).forEach(result => Object.assign(result.entries[6], {
    status: 'DNS', pos: null, classPos: null, times: [null], stagePos: [null], total: null
  }));
  const heldModel = freeze(build(held));
  assert.equal(P.rsRoundsStarted(heldModel, 'synthetic-driver-7', 'driver'), 1);
  const emptyClass = P.standings(heldModel, 'rs', 'driver', { class: 'RS4' });
  assert.equal(emptyClass.scoring.available, true);
  assert.deepEqual(emptyClass.rows, []);
  assert.equal(emptyClass.emptyState, 'no-points');
  assert.match(C.standings(emptyClass).html, /No points have been established for this table/);
  assert.doesNotMatch(C.standings(emptyClass).html, /No recorded championship starts/);
  const ready = F.revisedRallyeSport(true);
  for (const n of [5, 6]) {
    const event = { ...ready.data.events[1], id: 'synthetic-extra-' + n, name: 'Synthetic extra event ' + n, roundNumber: n };
    ready.data.events.push(event);
    ready.data.results.push({ ...F.copy(ready.data.results[1]), id: event.id + '-classification', eventId: event.id });
  }
  const model = freeze(build(ready));
  assert.equal(model.rallyesport.scoring.status, 'ready');
  const display = P.standings(model, 'rs', 'driver');
  assert.equal(display.scoring.provisional, false);
  assert.deepEqual(display.rows.map(row => [row.id, row.rank, row.points]),
    model.rallyesport.scoring.standings.overallDrivers.map(row => [row.id, row.rank, row.points]));
  assert.match(C.standings(display).html, /<b>Championship points\.<\/b>/);
});
test('equivalent standings contracts use identical markup, controls, accessible slots and escaped content in any competition', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw });
  const nr = P.standings(model, 'nr', 'driver', { class: 'OPEN', pts: 'split' });
  const rs = P.standings(model, 'rs', 'driver', { class: 'RS2', pts: 'split' });
  assert.deepEqual(Object.keys(nr).sort(), Object.keys(rs).sort());
  assert.deepEqual(Object.keys(nr.rows[0]).sort(), Object.keys(rs.rows[0]).sort());
  const equivalent = { ...rs, ...F.copy(nr), competition: { id: 'rs' } };
  assert.equal(C.standings(equivalent).html, C.standings(nr).html);
  equivalent.competition.id = 'synthetic-third-context';
  assert.equal(C.standingsTable(equivalent), C.standingsTable(nr));
  assert.match(C.standings(nr).html, /aria-label="Standings role"/);
  assert.match(C.standings(nr).html, /aria-label="Points display"/);
  assert.match(C.standings(nr).html, /scope="row"/);
  const unsafe = F.copy(nr);
  unsafe.rows[0].name = '<script>bad</script>';
  assert.ok(!C.standings(unsafe).html.includes('<script>'));
  assert.match(C.standings(unsafe).html, /&lt;script&gt;/);
});
test('NR and RS adapters preserve independent facts, public scope, zero/unknown and immutable source models', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw });
  freeze(model);
  const before = JSON.stringify(model), nr = P.home(model, 'nr'), rs = P.home(model, 'rs');
  assert.deepEqual(Object.keys(nr), Object.keys(rs));
  assert.deepEqual(Object.keys(nr.scoring), Object.keys(rs.scoring));
  assert.deepEqual(Object.keys(nr.drivers[0]), Object.keys(rs.drivers[0]));
  assert.equal(nr.drivers[0].points, 15, 'NR keeps overall plus class');
  assert.equal(rs.drivers[0].points, 60, 'RS keeps four class-only awards');
  assert.equal(nr.counts.rounds, 1);
  assert.equal(rs.counts.rounds, 4, 'launch is not a championship round');
  assert.equal(rs.counts.events, 5, 'launch remains an event');
  assert.equal(rs.counts.stages, 5, 'launch remains in event stage statistics');
  assert.equal(rs.scoring.provisional, true, 'four rounds never become final awards');
  assert.equal(rs.drivers.find(row => row.id === 'synthetic-driver-8').points, 0);
  assert.equal(rs.drivers.find(row => row.id === 'synthetic-driver-8').starts, 4);
  assert.equal(P.rsRoundsStarted(model, 'synthetic-driver-9', 'driver'), null, 'unproven DNF stays unknown');
  assert.equal(P.rsRoundsStarted(model, 'synthetic-driver-10', 'driver'), 0, 'DNS creates no start');
  assert.deepEqual(rs.drivers[0].bars.map(bar => bar.label), ['R1', 'R2', 'R3', 'R4']);
  assert.equal(JSON.stringify(model), before);
  assert.doesNotMatch(JSON.stringify(rs), /membershipReview|startEvidence|identityReview|nonScoringPeople|invited/);
  assert.throws(() => P.home(model, 'unsupported'), /Unsupported public display competition/);
});
test('actual multi-class standings remain role-specific and repeated cars/roles do not inflate round starts', () => {
  const { f } = fixture();
  f.data.results[2].entries[0].class = 'RS4';
  f.data.results[2].entries[6].classPos = 2;
  const model = build(f);
  const entry = model.rallyesport.results[1].entries[0];
  model.rallyesport.results[1].entries.push({ ...entry, car: 'extra-car' });
  model.rallyesport.results[1].entries.push({ ...entry, car: 'role-switch',
    driverId: 'synthetic-driver-2', driver: 'Synthetic driver 2',
    codriverId: 'synthetic-driver-1', codriver: 'Synthetic driver 1', codriverKnown: true });
  const home = P.rsHome(freeze(model));
  const driver = home.drivers.find(row => row.id === 'synthetic-driver-1');
  assert.deepEqual(driver.classes, ['RS2', 'RS4']);
  assert.equal(driver.starts, 4);
  assert.equal(P.rsRoundsStarted(model, driver.id, 'codriver'), 1, 'another role does not change driver starts');
  assert.equal(driver.points, 60, 'public snapshot remains authoritative, not re-scored from duplicate source rows');
  assert.equal(home.classes.find(cls => cls.id === 'RS4').rows.find(row => row.id === driver.id).points, 15);
});
test('calendar-only NR/RS use the same four stat slots and honest unavailable results', () => {
  const f = F.revisedRallyeSport(), season = F.copy(f.season);
  season.rallyesport.results = [];
  const model = E.buildSeason({ season, rounds: {}, people: f.people });
  for (const mode of ['nr', 'rs']) {
    const home = P.home(model, mode), html = C.home(home, '<div>Calendar boundary</div>').html;
    assert.equal(home.counts.rounds, 0);
    assert.equal(home.counts.drivers, null);
    assert.equal(home.counts.stages, null);
    assert.equal((html.match(/class="hero-stat"/g) || []).length, 4);
    assert.match(html, /No results yet/);
    assert.doesNotMatch(html, /Championship leaders/);
    assert.match(html, /<b>—<\/b><span>Drivers scored<\/span>/);
    assert.match(html, /<b>—<\/b><span>Recorded special stages<\/span>/);
  }
});
test('missing or incompatible published RS snapshot does not recover points from source entries', () => {
  const { f } = fixture(), projected = AI.projectPublic(f.season, f.people);
  delete projected.rallyesport.scoring;
  const model = E.buildSeason({ season: projected, rounds: {}, people: f.people, publicProjection: true });
  const home = P.rsHome(model), html = C.home(home, '').html;
  assert.equal(home.scoring.available, false);
  assert.equal(home.counts.drivers, null);
  assert.deepEqual(home.drivers, []);
  assert.match(html, /Points unavailable/);
  assert.match(html, /Driver leader unavailable/);
  assert.match(html, /Co-driver leader: unavailable/);
});
test('one Home renderer has identical markup and wording for identical display facts regardless of competition identity', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw });
  const home = P.nrHome(model);
  const other = F.copy(home);
  other.competition.id = 'synthetic-third-context';
  other.competition.name = 'Another synthetic competition';
  const first = C.home(home, '<div>Shared calendar boundary</div>');
  const second = C.home(other, '<div>Shared calendar boundary</div>');
  assert.equal(second.html.replace(other.competition.name, home.competition.name), first.html,
    'the presentation has no competition-specific composition branch');
  for (const adapted of [home, P.rsHome(model)]) {
    const html = C.home(adapted, '').html;
    for (const wording of ['Drivers</h3>', 'Co-drivers</h3>', 'Class leaders · drivers', 'Full standings →', 'Full calendar →',
      'Championship standings', 'Scoring notes', 'Table →', 'Rounds with results'])
      assert.ok(html.includes(wording), wording);
    assert.match(html, /rounds? started/);
    assert.doesNotMatch(html, /Full RS|RS tables|RS class leaders/);
  }
});
test('joint leaders, absent co-drivers, missing source history and true zero points have explicit shared states', () => {
  const { f } = fixture(), model = build(f), home = P.rsHome(model);
  assert.match(C.champCard(home), /Driver leaders · provisional/);
  assert.doesNotMatch(C.champCard(home), /minibars|clear of/);
  home.drivers = [{ ...home.drivers[0], starts: null, points: 0 }];
  home.codrivers = [];
  assert.match(C.champCard(home), /0 points/);
  assert.match(C.champCard(home), /Rounds started unavailable/);
  assert.match(C.champCard(home), /Lead unavailable/);
  assert.match(C.champCard(home), /Co-driver leader: unavailable/);
  home.drivers.push({ ...home.drivers[0], rank: 2, points: 15 });
  home.drivers[0].points = null;
  assert.match(C.champCard(home), /Lead unavailable/);
  assert.doesNotMatch(C.champCard(home), /clear of/);
});
test('shared components escape source text, preserve scoped profile/table links and label chart gaps accessibly', () => {
  const { f, raw } = fixture(), home = P.nrHome(build(f, { R1: raw }));
  home.competition.name = '<img src=x onerror=alert(1)>';
  home.drivers[0].name = 'A <script>bad()</script>';
  home.drivers[0].bars.push({ label: 'R2', points: null, status: 'No recorded start' });
  home.drivers[0].bars.push({ label: 'R3', points: 0, status: 'DNF' });
  const html = C.home(home, '').html;
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /aria-label="R2: unavailable · No recorded start"/);
  assert.match(html, /aria-label="R3: 0 pts · DNF"/);
  assert.match(html, /<span>0<\/span><em>R3<\/em>/, 'known DNF zero stays distinct from a missing contribution');
  assert.match(html, /#\/2026\/person\/synthetic-driver-1\?competition=nr/);
  assert.match(html, /#\/2026\/standings\/codrivers\?competition=nr/);
  assert.match(html, /#\/2026\/standings\?class=OPEN&amp;competition=nr/);
});
test('calendar adapters produce exactly the same event, row and winner markup for equivalent sporting facts', () => {
  const { f, raw } = fixture(), model = build(f, { R1: raw });
  model.classes = [{ id: 'RS2' }, { id: 'RS4' }];
  model.calendar[0].day = '';
  model.rounds[0].entries[0].cls = 'RS2';
  const event = model.rallyesport.events[1], result = model.rallyesport.results[1];
  model.rallyesport.events = [{ ...event, nrEventId: undefined, name: model.events[0].name,
    dates: model.calendar[0].date, venue: model.events[0].venue, surface: model.events[0].surface }];
  model.rallyesport.results = [{ ...result, source: model.rounds[0].source, stages: model.rounds[0].stages,
    entries: model.rounds[0].entries.map(row => ({ ...row, class: row.cls })) }];
  const nr = P.calendar(model, 'nr'), rs = P.calendar(model, 'rs');
  // Only identity/route facts differ; no presentation flags or league-specific classes.
  rs.events[0].badge = nr.events[0].badge;
  rs.events[0].rounds[0].href = nr.events[0].rounds[0].href;
  rs.events[0].rounds[0].classificationHref = nr.events[0].rounds[0].classificationHref;
  assert.equal(C.calendar(rs, 0), C.calendar(nr, 0));
  assert.deepEqual(C.rounds(rs, 0), C.rounds(nr, 0));
  assert.ok(C.infoEvents(rs, 0).includes(C.calendar(rs, 0)));
  assert.ok(C.home(P.rsHome(build(f)), C.calendar(rs, 0)).html.includes(C.calendar(rs, 0)));
});
test('both calendars order known dates first, retain equal-date source order, and leave undated rounds honest', () => {
  const { f } = fixture(), model = build(f);
  for (const mode of ['nr', 'rs']) {
    const source = mode === 'nr' ? model.events : model.rallyesport.events;
    const template = { ...source[0], nrEventId: undefined, startDate: undefined };
    const events = [
      { ...template, id: 'late', dates: '30–31 October 2026' },
      { ...template, id: 'unknown', dates: '' },
      { ...template, id: 'first', dates: '2026-06-06' },
      { ...template, id: 'same-date', dates: '6 June 2026' },
      { ...template, id: 'bad-date', dates: '31 February 2026' },
      { ...template, id: 'bad-month', dates: '6 Juniper 2026' },
      { ...template, id: 'bad-range', dates: '30–99 October 2026' },
      { ...template, id: 'bad-iso', dates: '2026-02-30' }
    ];
    if (mode === 'nr') model.events = events;
    else model.rallyesport.events = events;
    const display = P.calendar(freeze(F.copy(model)), mode);
    assert.deepEqual(display.events.map(row => row.id), ['first', 'same-date', 'late', 'unknown', 'bad-date', 'bad-month', 'bad-range', 'bad-iso']);
    assert.equal(display.events[3].sortDate, '');
    assert.equal(display.events[7].date, '', 'an invalid ISO date must not roll into a different month');
    assert.match(C.calendar(display, Date.parse('2026-06-06T12:00Z')), /Date to be confirmed/);
  }
});
test('explicit relationships inherit dynamic NR links and date context, never NR classifications or presumed RS days', () => {
  const { f } = fixture(), model = build(f);
  model.events[0].dates = '30–31 October 2026';
  model.events[0].links = { results: 'https://example.com/nr-results', srs: 'https://example.com/srs-first' };
  const event = model.rallyesport.events[1];
  event.nrEventId = model.events[0].id;
  event.dates = '';
  let adapted = P.calendar(model, 'rs').events.find(row => row.id === event.id);
  assert.equal(adapted.dateSource, 'Related NR event dates');
  assert.equal(adapted.date, '30–31 October 2026');
  assert.equal(adapted.rounds[0].dateIso, '', 'the NR programme does not assign an RS scoring day');
  assert.match(adapted.rounds[0].href, /rallyesport\/rs-r2-classification\/graph/);
  assert.deepEqual(adapted.links, []);
  assert.equal(adapted.related[0].label, 'Related NR event links');
  model.events[0].links.srs = 'https://example.com/srs-changed';
  let html = C.calendar(P.calendar(model, 'rs'), 0);
  assert.match(html, /srs-changed/);
  assert.doesNotMatch(html, /srs-first|\/round\//);
  delete model.events[0].links.srs;
  assert.doesNotMatch(C.calendar(P.calendar(model, 'rs'), 0), /Supplementary regs/);
  event.nrEventId = 'unmatched';
  adapted = P.calendar(model, 'rs').events.find(row => row.id === event.id);
  assert.equal(adapted.date, '');
  assert.deepEqual(adapted.related, []);
  delete event.nrEventId;
  event.dates = 'July 2026';
  adapted = P.calendar(model, 'rs').events.find(row => row.id === event.id);
  assert.equal(adapted.date, 'July 2026');
  assert.equal(adapted.sortDate, '', 'a month alone does not invent a day');
});
test('NR multi-day parents, RS launch and combined mapping keep distinct source children and safe links', () => {
  const { f } = fixture(), model = build(f);
  model.calendar.push({ ...model.calendar[0], id: 'R2', n: 2, date: '', day: 'Day 2' });
  model.rallyesport.events[1].nrEventId = model.events[0].id;
  model.rallyesport.events[3].nrEventId = model.rallyesport.events[2].id;
  model.events[0].links = { srs: 'javascript:alert(1)' };
  const nr = P.calendar(model, 'nr'), rs = P.calendar(model, 'rs'), combined = P.calendar(freeze(model), 'all');
  assert.equal(nr.events[0].rounds.length, 2);
  assert.equal(nr.events[0].rounds[1].published, false);
  assert.equal(nr.events[0].rounds[1].date, '');
  assert.equal(combined.events.find(row => row.badge === 'NR + RS').rounds.length, 3);
  assert.equal(combined.events.length, nr.events.length + rs.events.length - 1);
  const launch = rs.events.find(row => row.id === 'rs-r1');
  assert.equal(launch.rounds[0].label, 'Launch event');
  assert.match(C.eventCard(launch, 0), /Non-scoring event · not a championship round/);
  assert.doesNotMatch(C.calendar(nr, 0), /javascript:/);
  assert.doesNotMatch(C.calendar(rs, 0), /\/round\//);
  assert.equal(C.calendar({ year: 2026, events: [], classes: [] }, 0),
    '<div class="card empty">No events have been added to the 2026 calendar yet.</div>');
});
test('source winners respect mappings, ties, actual positions, pending finality and upcoming results without reading points', () => {
  const { f } = fixture(), model = build(f), result = model.rallyesport.results[1];
  result.classMappings = { SOURCE: 'RS4' };
  result.entries[0].class = 'SOURCE';
  result.entries[0].classPos = 1;
  result.entries[6].classPos = 2;
  function round() { return P.calendar(model, 'rs').events.find(row => row.id === result.eventId).rounds[0]; }
  assert.match(C.roundRow(round(), 0), /1 stage ·/);
  assert.equal(round().classWinners.RS4.driver, result.entries[0].driver);
  result.entries[6].classPos = 1;
  assert.equal(round().classWinners.RS4, null, 'ambiguous printed class positions do not select an arbitrary winner');
  result.entries[6].classPos = 2;
  result.entries[1].pos = 1;
  assert.equal(round().winner, null, 'ambiguous first position is not arbitrarily selected');
  result.entries[1].pos = 2;
  result.entries[0].status = 'DNS';
  assert.equal(round().winner, null, 'DNS is not the event winner');
  result.entries[0].status = 'classified';
  result.notes = ['Results are final pending post-event technical checks'];
  assert.equal(round().winner, null);
  assert.equal(round().state, 'Pending technical checks');
  result.notes = [];
  result.status = 'Provisional classification';
  model.rallyesport.scoring.results = [];
  assert.equal(round().winner, null);
  model.rallyesport.results = model.rallyesport.results.filter(row => row.eventId !== 'rs-r5');
  const future = P.calendar(model, 'rs').events.find(row => row.id === 'rs-r5').rounds[0];
  assert.equal(future.winner, null);
  assert.equal(future.stages, null);
  assert.equal(future.classificationHref, null);
  assert.equal(future.state, 'Not published');
  const { raw } = fixture(), nrModel = build(f, { R1: raw });
  nrModel.rounds[0].provisional = true;
  assert.equal(P.calendar(nrModel, 'nr').events[0].rounds[0].winner, null);
  nrModel.rounds[0].provisional = false;
  nrModel.rounds[0].finalityUnclear = true;
  assert.equal(P.calendar(nrModel, 'nr').events[0].rounds[0].winner, null);
});
