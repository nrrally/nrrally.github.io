/* Synthetic fixtures only; VM rendering makes no database or analytics requests. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');
const root = path.resolve(__dirname, '..', '..');
const code = fs.readFileSync(path.join(root, 'assets', 'site.js'), 'utf8');
function harness(now = '2027-03-01T10:00:00Z') {
  class Clock extends Date { static now() { return Date.parse(now); } }
  const window = { NREngine: E, NR_FIREBASE: {}, NRGettingStarted: { edition: { year: 2026 } }, addEventListener() {} };
  const context = {
    window, Date: Clock, console, location: { hash: '' }, URLSearchParams,
    localStorage: { getItem: () => null },
    document: { getElementById: () => ({}), documentElement: { setAttribute() {} } }
  };
  const instrumented = code.slice(0, code.indexOf('  /* ------------------------------------------------------------------ boot */')) +
    `window.testSite = { ST, useSeason, fmtDate, calendarStatus, viewHome, viewStandings,
      viewRounds, viewRound, viewCrews, viewAbout, viewInfo, viewPerson, header, viewRallyeSport,
      rememberCompetition, viewRsHome, viewRsStandings, viewRsCrews, viewRsPerson, viewRsGraph, rsGraphModel,
      rsPersonRoundPoints, pointsSvg };
    })();`;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', 'display-context.js'), 'utf8'), context);
  vm.runInNewContext(instrumented, context);
  const api = window.testSite;
  const docs = F.docs();
  api.ST.site = { ...docs['data/site.json'], currentSeason: 2027,
    seasons: [{ year: 2026 }, { year: 2027 }] };
  api.ST.people = docs['data/people.json'];
  api.ST.peopleIndex = E.peopleIndex(api.ST.people);
  api.ST.profiles = { 'alex-test': api.ST.people.people[0] };
  return api;
}
function emptySeason() {
  const s = F.season(2027);
  s.documents = []; s.events[0].surface = ''; s.events[0].links = {};
  s.rounds[0].date = '2027-03-01'; s.rounds[0].day = '';
  s.classMap = { drivers: {}, codrivers: {} };
  s.msa = { confirmedRounds: [] }; s.notes = [];
  return s;
}
function select(api, season, rounds = {}, publicProjection = false) {
  const model = E.buildSeason({ season, rounds, people: api.ST.people, publicProjection });
  api.ST.models[season.year] = model;
  api.useSeason(model);
  return model;
}
test('RS graphs use independent stage axes and cannot mix into NR graphs, even with legacy overlay queries', () => {
  const api = harness(), s = emptySeason();
  s.rallyesport = {
    events: [{ id: 'rs-only', name: 'Synthetic RS-only Event', dates: '2027-03-01' }],
    results: [{ id: 'rs-only-results', eventId: 'rs-only', title: 'Final RS classification', status: 'Final classification',
      nrRoundId: 'R1', source: { file: 'synthetic.pdf', url: 'https://example.com/rs.pdf' }, notes: [],
      stages: [{ id: 'ss8', label: 'SS8', nrStage: 'SS8' }, { id: 'ss9', label: 'SS9', nrStage: 'SS9' }],
      entries: [{ car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'RS2', status: 'classified', pos: 1,
        classPos: 1, total: '2:00.0', penalty: null, times: ['1:00.0', '1:00.0'], stagePos: [1, 1] }] }],
    nonScoringPeople: []
  };
  const raw = { id: 'R1', stages: ['SS8', 'SS9'], entries: [
    { car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'OPEN', status: 'classified', pos: 1, total: '2:00.0', times: ['1:00.0', '1:00.0'] }
  ] };
  select(api, s, { R1: raw });
  const defaultGraph = api.viewRound('R1', 'graph', { cars: '1', m: 'pos' }).html;
  assert.ok(!defaultGraph.includes('Show RS overlay'));
  assert.ok(!defaultGraph.includes('data-key="RS:rs-only-results:1"'));
  const overlay = api.viewRound('R1', 'graph', { cars: '1', m: 'pos', rs: '1' }).html;
  assert.ok(!overlay.includes('data-key="RS:'));
  assert.ok(!overlay.includes('Show RS overlay'));
  const rsGraph = api.viewRsGraph('rs-only-results', { cars: '1' }).html;
  assert.ok(rsGraph.includes('data-hl="RS:rs-only-results:1"'));
  assert.ok(!rsGraph.includes('NR position'));
  assert.ok(rsGraph.includes('aria-label="RS result views"'));
  const rsPage = api.viewRallyeSport().html;
  assert.ok(rsPage.includes('Synthetic RS-only Event'));
  assert.ok(rsPage.includes('Final RS classification'));
  assert.ok(!api.viewHome().html.includes('Synthetic RS-only Event'));
  assert.ok(!api.viewStandings('driver', {}).html.includes('Synthetic RS-only Event'));
});
test('public RallyeSport pages show provisional cumulative tables and disclose unscored events', () => {
  const api = harness(), season = emptySeason(), people = { people: [] }, entries = [];
  for (let n = 1; n <= 15; n++) {
    people.people.push({ id: 'rs-driver-' + n, name: 'RS Driver ' + n, aliases: [] });
    people.people.push({ id: 'rs-co-' + n, name: 'RS Co-driver ' + n, aliases: [] });
    entries.push({ car: String(n), driver: 'RS Driver ' + n, codriver: 'RS Co-driver ' + n,
      class: 'RS2', status: 'classified', pos: n, classPos: n, total: '00:01.0',
      times: ['00:01.0'], stagePos: [n], invited: false });
  }
  const event = id => ({ id, name: id === 'ready-rs' ? 'Ready RS round' : 'Blocked RS round',
    dates: 'Synthetic', rulesetConfirmed: true, rulesetEvidence: 'Synthetic confirmation',
    countsForChampionship: true, championshipEvidence: 'Synthetic round status', doublePoints: false });
  const result = (id, status) => ({ id: id + '-results', eventId: id, title: 'Synthetic classification',
    status, source: { file: 'synthetic.pdf', url: 'https://example.com/synthetic.pdf' }, notes: [],
    stages: [{ id: 'stage1', label: 'Stage 1' }],
    entries: entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() })) });
  season.year = 2026;
  const raw = { ruleset: {
    code: 'clubman-sprint-2026-v1', year: 2026,
    title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
    version: 1, issueDate: '2026-07-09',
    sourceUrl: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf'
  }, events: [event('ready-rs'), event('blocked-rs')], results: [
    result('ready-rs', 'Final classification'), result('blocked-rs', 'Provisional classification')
  ], nonScoringPeople: [], membershipReview: {
    sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic reviewed membership roster.',
    people: Object.fromEntries(people.people.map(person => [person.id, { status: 'eligible', basis: 'membership-sheet' }]))
  } };
  season.rallyesport = E.projectRallyeSport(raw, season, people);
  api.ST.people = people;
  const model = E.buildSeason({ season, rounds: {}, people, publicProjection: true });
  api.ST.models[season.year] = model;
  api.useSeason(model);
  assert.equal(model.rallyesport.scoring.status, 'blocked');
  assert.ok(model.rallyesport.scoring.provisionalStandings.overallDrivers.length);
  const page = api.viewRallyeSport().html;
  assert.ok(page.includes('Provisional RS points'));
  assert.ok(page.includes('blocked events are excluded, not scored as zero.'));
  assert.ok(page.includes('Ready RS round'));
  assert.ok(page.includes('Not scored: Blocked RS round — The source classification is provisional'));
  assert.equal(model.rallyesport.scoring.provisionalStandings.overallDrivers[0].scoringClass, undefined,
    'the real projected eligible standings row has no scoringClass property');
  api.rememberCompetition('rs');
  assert.ok(api.viewRsStandings('driver', {}).html.includes('</td><td>RS2</td>'));
  assert.ok(!page.includes('RS2 / RS4'));

  raw.events.push(event('second-ready-rs'));
  raw.results.push(result('second-ready-rs', 'Final classification'));
  raw.results[0].entries[1].class = 'RS4';
  raw.results[2].entries[0].class = 'RS4';
  raw.results[2].entries[1].class = 'RS4';
  season.rallyesport = E.projectRallyeSport(raw, season, people);
  select(api, season, {}, true);
  function scoringCell(html, name) {
    const row = html.split('<tr>').find(text => text.includes('>' + name + '</a>'));
    assert.ok(row, name);
    return row.split('</tr>')[0];
  }
  for (const role of ['driver', 'codriver']) {
    const name = role === 'driver' ? 'RS Driver ' : 'RS Co-driver ';
    const overall = api.viewRsStandings(role, {}).html;
    assert.ok(scoringCell(overall, name + '1').includes('</td><td>RS2 + RS4</td>'),
      'multiple actual scoring classes are explicit, not a generic alternative');
    assert.ok(scoringCell(overall, name + '2').includes('</td><td>RS4</td>'));
    const classView = api.viewRsStandings(role, { class: 'RS4' }).html;
    assert.ok(scoringCell(classView, name + '1').includes('</td><td>RS4</td>'),
      'a class table shows only that class even for a multi-class competitor');
  }
  const listing = api.viewRallyeSport().html;
  assert.ok(scoringCell(listing, 'RS Driver 1').includes('</td><td>RS2 + RS4</td>'));
  assert.ok(!listing.includes('RS2 / RS4'));
});
function entryList(entries, complete = true) {
  return { eventId: 'test-event', roundIds: ['R1'], complete,
    source: { file: 'synthetic-entries.pdf', url: 'https://example.com/entries', date: '', locator: 'Synthetic only' },
    entries };
}
const crew = { car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'OPEN', vehicle: '',
  roundIds: ['R1'], status: 'entered', statusEvidence: '', participationEvidence: 'Synthetic NR day evidence', locator: 'Row 1' };
test('calendar-only and wholly empty seasons show only known calendar facts, not result statistics or leaders', () => {
  const api = harness(), s = emptySeason();
  select(api, s);
  const html = api.viewHome().html;
  assert.ok(html.includes('Events listed'));
  assert.ok(html.includes('Rounds listed'));
  for (const absent of ['Drivers scored', 'special stages', 'Championship leaders', 'NR Entries unknown']) assert.ok(!html.includes(absent), absent);
  for (const present of ['See the calendar', 'Regulations &amp; info', 'Getting started in NR Rally', 'No results yet']) assert.ok(html.includes(present), present);
  assert.ok(!api.viewAbout().html.includes('Stage graphs'));
  assert.ok(!api.viewAbout().html.includes('Points</h2>'));
  assert.ok(api.viewAbout().html.includes('#/2027/info'));
  assert.ok(!api.viewStandings('driver', {}).html.includes('Minimum 1 starts'));
  assert.ok(api.viewCrews().html.includes('Earlier participation is not a new-season entry'));
  s.events = []; s.rounds = [];
  select(api, s);
  assert.ok(api.viewHome().html.includes('No events have been added to the 2027 calendar'));
  assert.ok(!api.viewHome().html.includes('Events listed'));
  assert.ok(api.viewInfo().html.includes('No documents have been added for 2027'));
});
test('a first 2027 RS-only classification survives public projection without an NR result or unverified RS points', () => {
  const api = harness(), season = emptySeason();
  season.events = [];
  season.rounds = [];
  const people = { people: [
    { id: 'alex-test', name: 'Alex Test', aliases: [] },
    { id: 'blake-example', name: 'Blake Example', aliases: [] }
  ] };
  season.rallyesport = {
    events: [{ id: 'rs-only-2027-opening', name: 'Synthetic RS-only opening event', dates: 'Synthetic date' }],
    results: [{ id: 'rs-only-2027-opening-final', eventId: 'rs-only-2027-opening',
      title: 'Synthetic official RS classification', status: 'Final classification',
      source: { file: 'synthetic-2027-rs.pdf', url: 'https://example.com/synthetic-2027-rs.pdf' },
      notes: [], stages: [{ id: 'ss8', label: 'SS8' }],
      entries: [{ car: '88', driver: 'Alex Test', codriver: 'Blake Example', class: 'RS2',
        status: 'classified', pos: 1, classPos: 1, total: '00:01.00', penalty: null,
        times: ['00:01.00'], stagePos: [1] }] }],
    nonScoringPeople: []
  };
  assert.deepEqual(E.validateSeason(season, {}, people), [],
    'a source-backed standalone RS result does not require an NR event, round or stage');
  const projection = AI.projectPublic(season, people);
  assert.equal(projection.rallyesport.events.length, 1);
  assert.equal(projection.rallyesport.results[0].title, 'Synthetic official RS classification');
  assert.equal(projection.rallyesport.scoring.status, 'unconfigured',
    '2026 SSR scoring is not inferred for 2027');
  const model = E.buildSeason({ season: projection, rounds: {}, people, publicProjection: true });
  assert.deepEqual(model.calendar, []);
  assert.deepEqual(model.rounds, []);
  assert.deepEqual(model.standings.drivers, []);
  assert.deepEqual(model.standings.codrivers, []);
  assert.equal(model.rallyesport.results[0].entries[0].status, 'classified');
  assert.equal(model.rallyesport.scoring.status, 'unconfigured');
  assert.deepEqual(model.rallyesport.scoring.results, []);
  api.ST.people = people;
  api.ST.peopleIndex = E.peopleIndex(people);
  api.ST.profiles = { 'alex-test': people.people[0], 'blake-example': people.people[1] };
  api.ST.models[2027] = model;
  api.useSeason(model);
  const rsHtml = api.viewRallyeSport().html;
  assert.ok(rsHtml.includes('Synthetic RS-only opening event'));
  assert.ok(rsHtml.includes('Synthetic official RS classification'));
  assert.ok(rsHtml.includes('Championship totals are not available.'));
  assert.ok(!rsHtml.includes('<th>Points</th>'));
  assert.ok(api.viewHome().html.includes('No results yet'),
    'an RS-only 2027 classification does not create an NR result or NR standings');
});
test('calendar days use South Africa midnight, strict dates, leap years and timezone-independent formatting', () => {
  for (const now of ['2027-02-28T21:59:59Z', '2027-02-28T22:00:00Z', '2027-03-01T22:00:00Z']) {
    const api = harness(now);
    assert.equal(api.calendarStatus('2027-03-01'),
      now.includes('21:59') ? 'Upcoming' : now.startsWith('2027-02-28') ? 'Scheduled today' : 'Awaiting results');
    for (const invalid of ['', '2027-02-29', '2027-02-30', '2027-13-01', '2027-3-1', 'not a date', '2027-03-01T00:00:00Z']) {
      assert.equal(api.calendarStatus(invalid), 'Date to be confirmed', invalid);
      if (invalid) assert.equal(api.fmtDate(invalid), 'Date to be confirmed');
    }
    assert.equal(api.calendarStatus('2028-02-29'), 'Upcoming');
    assert.ok(api.fmtDate('2027-03-01').includes('2027'));
  }
});
test('missing round pages and cards distinguish future, today, undated and past without activating a live notice', () => {
  const api = harness(), s = emptySeason();
  s.rounds = ['2027-02-28', '2027-03-01', '2027-03-02', '', '2027-02-30'].map((date, i) =>
    ({ id: 'R' + (i + 1), eventId: 'test-event', date, day: '' }));
  select(api, s);
  const html = api.viewRounds().html;
  for (const label of ['Awaiting results', 'Scheduled today', 'Upcoming', 'Date to be confirmed']) assert.ok(html.includes(label), label);
  assert.ok(html.includes('href="#/2027/round/R1?competition=nr"'));
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('<h2>Awaiting results</h2>'));
  assert.ok(api.viewRound('R2', 'classification', {}).html.includes('<h2>Scheduled today</h2>'));
  assert.ok(api.viewRound('R4', 'stages', {}).html.includes('<h2>Date to be confirmed</h2>'));
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('do not confirm the rally ran or is live'));
  assert.ok(!html.includes('<span> · results'));
  assert.equal((html.match(/Date to be confirmed/g) || []).length, 2);
  for (const id of ['R4', 'R5']) {
    const detail = api.viewRound(id, 'graph', {}).html;
    assert.equal((detail.match(/Date to be confirmed/g) || []).length, 1);
    assert.ok(!detail.includes('Round ' + id.slice(1) + ' · '));
  }
  s.rounds[0].day = 'Day 1';
  select(api, s);
  assert.ok(api.viewRounds().html.includes('Day 1 · results not published yet'));
  assert.equal(api.ST.site.activeRally, undefined);
});
test('Info preserves supplied document date text without weakening strict calendar dates', () => {
  const api = harness(), s = emptySeason();
  const dates = ['2026-07-09', '9 July 2026', 'July 2026, Version 2', '2026-02-30', '<unconfirmed & supplied>', ''];
  s.documents = dates.map((date, i) => ({ title: 'Synthetic source ' + i, kind: 'SSR', date, url: 'https://example.com/source', note: i === 5 ? 'Date not supplied' : '' }));
  api.ST.site.info.intro = 'Evergreen synthetic introduction.';
  select(api, s);
  const html = api.viewInfo().html;
  assert.ok(html.includes('Dated ' + api.fmtDate('2026-07-09')));
  assert.ok(!html.includes('Dated 2026-07-09'));
  for (const value of ['Dated 9 July 2026', 'Dated July 2026, Version 2',
    'Dated 2026-02-30', 'Dated &lt;unconfirmed &amp; supplied&gt;', 'Date not supplied']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('Dated Date to be confirmed'));
  assert.ok(!html.includes('Shared championship introduction'));
  assert.equal(api.calendarStatus('9 July 2026'), 'Date to be confirmed');
  assert.equal(api.calendarStatus('2026-02-30'), 'Date to be confirmed');
});
test('unknown, partial, known-empty and two-day entry evidence retains its distinct counting semantics', () => {
  const api = harness(), s = emptySeason();
  select(api, s);
  assert.ok(!api.viewRounds().html.includes('NR Entries'));
  s.entryLists = [entryList([], false)];
  select(api, s);
  assert.ok(!api.viewRounds().html.includes('NR Entries'));
  assert.ok(api.viewRounds().html.includes('round entry coverage incomplete'));
  s.entryLists[0].complete = true;
  select(api, s);
  assert.ok(api.viewRounds().html.includes('0 NR Entries'));
  s.rounds.push({ id: 'R2', eventId: 'test-event', date: '', day: '' });
  s.entryLists = [entryList([{ ...crew, roundIds: ['R1', 'R2'] }])];
  s.entryLists[0].roundIds = ['R1', 'R2'];
  const model = select(api, s);
  assert.equal(model.entryLists[0].eventEntries, 1);
  assert.equal(model.standings.drivers.length, 0);
  assert.ok(api.viewRounds().html.includes('1 NR Entries'));
  assert.equal((api.viewRounds().html.match(/1 documented round entry/g) || []).length, 2);
  assert.ok(api.viewHome().html.includes('See documented entry-list crews'));
  assert.ok(api.viewAbout().html.includes('Entry evidence'));
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('Entry source'));
  assert.ok(api.viewPerson('alex-test').html.includes('No classification appearances recorded for this season'));
  assert.ok(!api.viewPerson('alex-test').html.includes('<tbody>'));
  s.entryLists[0].complete = false; s.entryLists[0].entries[0].roundIds = [];
  select(api, s);
  assert.ok(api.viewRounds().html.includes('1 NR Entries (partial)'));
  assert.ok(api.viewRounds().html.includes('round entry coverage unknown'));
});
test('archived scoring, source status and historical profiles stay separate from a new season', () => {
  const api = harness(), old = emptySeason(); old.year = 2026;
  old.notes = ['Synthetic archive note']; old.msa = { confirmedRounds: ['R1'], label: 'Synthetic MSA', url: 'https://example.com/points' };
  const raw = F.payload('results', 2026).rounds[0];
  raw.entries = raw.entries.map(e => ({ ...e, driver: 'Alex Test', codriver: 'Blake Example' }));
  const prior = select(api, old, { R1: raw });
  const points = JSON.stringify(prior.standings);
  assert.equal(prior.standings.drivers[0].total, 15);
  assert.equal(prior.standings.codrivers[0].total, 15);
  assert.equal(prior.standings.drivers[0].starts, 1);
  assert.equal(prior.standings.drivers[0].eligible, true);
  assert.ok(api.viewAbout().html.includes('Synthetic archive note'));
  assert.ok(api.viewAbout().html.includes('Stage graphs'));
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('Points match MSA'));
  const s = emptySeason();
  select(api, s);
  assert.equal(api.ST.models[2027].people.length, 0);
  assert.ok(!api.viewAbout().html.includes('Synthetic archive note'));
  assert.ok(!api.viewAbout().html.includes('Synthetic MSA'));
  assert.ok(api.viewPerson('alex-test').html.includes('2026 season'));
  assert.ok(!api.viewPerson('alex-test').html.includes('2027 season</h2>'));
  assert.equal(JSON.stringify(prior.standings), points);
  const rescored = E.buildSeason({ season: old, rounds: { R1: raw }, people: api.ST.people });
  assert.equal(JSON.stringify(rescored.standings), points);
  assert.ok(api.viewInfo().html.includes('2027 information'));
  assert.ok(api.header('info').includes('href="#/2027/info?competition=nr"'));
  assert.ok(!/reference guide|season-pill|seasonSel/.test(api.header('getting-started')));
  select(api, old, { R1: { ...raw, status: 'Provisional classification' } });
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('Provisional sheet'));
  select(api, old, { R1: { ...raw, status: 'Classification' } });
  assert.ok(api.viewRound('R1', 'graph', {}).html.includes('finality unclear'));
});
test('published DNS-only classifications do not produce an unexplained empty standings table', () => {
  const api = harness(), s = emptySeason();
  const raw = F.payload('results').rounds[0];
  raw.entries = raw.entries.map(e => ({ ...e, driver: 'Alex Test', codriver: 'Blake Example',
    status: 'DNS', pos: null, total: null, stages: 0, times: [null, null], stagePos: [null, null] }));
  const model = select(api, s, { R1: raw });
  assert.equal(model.standings.drivers.length, 0);
  assert.equal(model.standings.codrivers.length, 0);
  assert.ok(api.viewHome().html.includes('No scored starts yet'));
  for (const role of ['driver', 'codriver']) {
    const html = api.viewStandings(role, {}).html;
    assert.ok(html.includes('championship starts yet for 2027'));
    assert.ok(html.includes('Entries and DNS do not create starts'));
    assert.ok(!html.includes('<tbody>'));
  }
});
test('RS context has honest empty views, preserves guide/info content and never relabels NR statistics', () => {
  const api = harness(), season = emptySeason();
  const raw = F.payload('results', 2027).rounds[0];
  select(api, season, { R1: raw });
  const info = api.viewInfo().html, nr = api.viewHome().html;
  api.rememberCompetition('rs');
  for (const html of [api.viewHome().html, api.viewRsStandings('driver', {}).html, api.viewRounds().html,
    api.viewRsCrews().html, api.viewRsPerson('alex-test').html]) {
    assert.ok(!html.includes('Every NR stage'));
    assert.ok(!html.includes('Driver standings:'));
    assert.ok(!html.includes('Best result'));
    assert.ok(!html.includes('href="#/2027/round/'));
  }
  assert.ok(api.viewHome().html.includes('No RS data is published for 2027'));
  assert.ok(api.viewRsPerson('alex-test').html.includes('No published RS history'));
  assert.equal(api.viewInfo().html.replaceAll('competition=rs', 'competition=nr'), info);
  api.rememberCompetition('nr');
  assert.equal(api.viewHome().html, nr);
});
test('RS crews and cross-season profiles use resolved RS identities and official positions, not NR appearances or inferred starts', () => {
  const api = harness(), season = emptySeason();
  season.rallyesport = { events: [{ id: 'rs-event', name: 'Standalone RS' }], results: [{
    id: 'rs-result', eventId: 'rs-event', status: 'Final classification', title: 'Synthetic RS source',
    stages: [{ id: 'rs-a', label: 'RS A' }, { id: 'rs-b', label: 'RS B' }],
    entries: [{ car: '91', driver: 'Printed spelling', codriver: 'Unresolved name', class: 'RS4',
      publicIdentity: { driverId: 'alex-test' }, status: 'classified', pos: 7, classPos: 3,
      times: [null, '1:00.01'], stagePos: [null, 2], total: null }]
  }], scoring: { status: 'unconfigured', reason: 'No verified rules', results: [], standings: null } };
  select(api, season, {}, true);
  api.rememberCompetition('rs');
  const crews = api.viewRsCrews().html, person = api.viewRsPerson('alex-test').html;
  assert.ok(crews.includes('Alex Test'));
  assert.ok(crews.includes('Unresolved name'));
  assert.ok(crews.includes('Source name; profile unresolved'));
  assert.ok(!crews.includes('/person/unresolved-name'));
  assert.ok(!crews.includes('Blake Example'));
  assert.ok(person.includes('7th'));
  assert.ok(person.includes('Unavailable'));
  assert.ok(!person.includes('>Starts<'));
  assert.ok(!person.includes('NR1'));
  assert.ok(person.includes('competition=rs'));
  api.ST.models[2027].rallyesport.scoring.results = [{
    resultId: 'rs-result', status: 'ready', entries: [{
      car: '91', driverPoints: 0, codriverPoints: 0,
      driverEligibility: { status: 'unverified', scoringClass: 'RS0',
        reason: 'RS0 Non-Scoring SSR 6.1 — eligibility is unverified, pending review.' }
    }]
  }];
  const reviewedCrews = api.viewRsCrews().html, reviewedPerson = api.viewRsPerson('alex-test').html;
  assert.ok(reviewedCrews.includes('<th>Championship status</th>'));
  assert.ok(reviewedCrews.includes('RS0 · Non-Scoring*'));
  assert.ok(!reviewedCrews.includes('eligibility unverified'));
  assert.ok(reviewedPerson.includes('<th>Source class</th><th>Championship scoring</th>'));
  assert.ok(reviewedPerson.includes('Official position / finish'));
  const classification = api.viewRallyeSport('rs-result', {}).html;
  assert.ok(classification.includes('scope="col">Official finish</th>'));
  assert.ok(!classification.includes('<th>Official status</th>'));
  assert.ok(reviewedPerson.includes('RS4'));
  assert.ok(reviewedPerson.includes('7 · classified'));
  for (const html of [reviewedCrews, reviewedPerson]) {
    assert.ok(html.includes('RS0 Non-Scoring SSR 6.1'));
    assert.ok(!html.includes('RS0 roles receive'));
  }
  const before = JSON.stringify(api.ST.models[2027].rallyesport);
  api.viewRsGraph('rs-result', { m: 'spos', cars: '91' });
  assert.equal(JSON.stringify(api.ST.models[2027].rallyesport), before);
});
test('shared RS graph controls, head-to-head and stage tables preserve hundredths, official finals and gaps', () => {
  const api = harness(), season = emptySeason();
  season.rallyesport = { events: [{ id: 'rs-event', name: 'RS-only graph' }], results: [{
    id: 'rs-result', eventId: 'rs-event', status: 'Final classification', title: 'Synthetic RS source',
    stages: ['A', 'B', 'C'].map(id => ({ id, label: 'RS ' + id })),
    entries: [
      { car: '91', driver: 'Alex Test', codriver: '', class: 'RS4', status: 'classified', pos: 7, classPos: 3,
        times: ['1:00.01', null, '1:00.03'], stagePos: [1, null, 7], total: null },
      { car: '92', driver: 'Blake Example', codriver: '', class: 'RS4', status: 'classified', pos: 2, classPos: 1,
        times: ['1:00.04', '0:01.00', '1:00.00'], stagePos: [2, 1, 1], total: '2:01.04' }
    ]
  }] };
  const model = select(api, season), before = JSON.stringify(model);
  api.rememberCompetition('rs');
  const r = api.rsGraphModel(model.rallyesport.results[0], model.rallyesport.events[0]);
  assert.deepEqual(Array.from(r.progression['91'].cum), [60.01, null, null, null]);
  assert.deepEqual(Array.from(r.progression['91'].pos), [1, null, null, 7]);
  assert.equal(r.progression['91'].delta[2], 0.03);
  assert.equal(r.timePrecision, 2);
  const html = api.viewRsGraph('rs-result', { cars: '91,92' }).html;
  for (const text of ['Head-to-head', 'Stage by stage', 'Top 5', '>All<', '>Clear<', 'data-quick="RS4"',
    '0.03s', 'Official total gap unavailable', 'P7']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/data-metric=/g) || []).length, 6);
  for (const tab of ['/graph?', '/classification?', '/stages?']) assert.ok(html.includes('rs-result' + tab));
  const stageHtml = api.viewRsGraph('rs-result', {}, 'stages').html;
  assert.ok(stageHtml.includes('1:00.01'));
  assert.ok(stageHtml.includes('Highlighted: fastest RS time'));
  assert.ok(!stageHtml.includes('fastest NR'));
  assert.equal(JSON.stringify(model), before, 'display adaptation never rewrites source data or scoring');
});
test('RS classification leads with compact source results and independent role scores, not review commentary', () => {
  const api = harness(), season = emptySeason();
  season.rallyesport = { events: [{ id: 'rs-event', name: 'Synthetic RS event' }], results: [{
    id: 'rs-result', eventId: 'rs-event', status: 'Final classification', title: 'Synthetic source heading',
    source: { file: 'synthetic.pdf', description: 'Private upload handling commentary' },
    notes: ['Synthetic official source qualification.'], classMappings: { '2WD': 'RS2' },
    classMappingEvidence: 'Private reviewer rationale',
    stages: [{ id: 'ss1', label: 'SS1' }],
    entries: [
      { car: '91', driver: 'Alex Test', codriver: 'Blake Example', class: '2WD', status: 'classified',
        pos: 6, classPos: 3, total: '1:00.01', penalty: '0:01.02', times: ['0:58.99'] },
      { car: '92', driver: 'Unresolved source name', codriver: '', class: 'RS4', status: 'DNF',
        pos: null, classPos: null, total: null, penalty: null, times: [null] }
    ]
  }] };
  const model = select(api, season);
  api.rememberCompetition('rs');
  model.rallyesport.scoring.results = [{
    resultId: 'rs-result', status: 'ready', entries: [{
      car: '91', driverPoints: 0, codriverPoints: 15,
      driverEligibility: { status: 'unverified', scoringClass: 'RS0' },
      codriverEligibility: { status: 'eligible', scoringClass: 'RS2', scoringPosition: 1 }
    }]
  }];
  const before = JSON.stringify(model), nrBefore = api.viewRound('R1', 'classification', {}).html;
  const html = api.viewRallyeSport('rs-result', {}).html;
  const tableStart = html.indexOf('<div class="table-wrap rs-classification">');
  const sourceNotes = html.indexOf('<details class="notes rs-source-notes">');
  assert.ok(tableStart > 0 && sourceNotes > tableStart);
  assert.ok(!html.slice(0, tableStart).includes('Synthetic official source qualification'));
  assert.ok(!html.includes('Private reviewer rationale'));
  assert.ok(!html.includes('Private upload handling commentary'));
  assert.ok(html.includes('Synthetic official source qualification.'));
  assert.ok(html.includes('Championship class mapping: 2WD → RS2'));
  assert.ok(html.includes('aria-label="Driver"><span><a'));
  assert.ok(html.includes('RS0 · Non-Scoring*'));
  assert.ok(html.includes('aria-label="Co-driver"><span>Blake Example'));
  assert.ok(html.includes('title="Driver championship points">D <b>0</b>'));
  assert.ok(html.includes('title="Co-driver championship points">C <b>15</b>'));
  for (const value of ['2WD', 'Class pos: 3', 'classified', '1:00.01', '0:01.02']) assert.ok(html.includes(value), value);
  assert.ok(html.indexOf('data-car="91"') < html.indexOf('data-car="92"'), 'official source order is unchanged');
  assert.ok(html.includes('<details class="notes rs-scoring-order">'));
  assert.ok(!html.includes('<details open'));
  assert.equal((html.match(/class="small muted rs-eligibility-note"/g) || []).length, 1);
  const home = api.viewRsHome().html;
  assert.ok(!home.includes('RS0 Non-Scoring SSR 6.1'));
  assert.ok(!home.includes('Private reviewer rationale'));
  assert.equal(JSON.stringify(model), before, 'rendering does not modify source data or scoring');
  assert.equal(api.viewRound('R1', 'classification', {}).html, nrBefore);
});
test('initial public HTML contains an accessible loader before any public JavaScript initialization', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /class="loading" role="status" aria-live="polite"/);
  assert.ok(html.indexOf('Loading results') < html.indexOf('<script src='));
});
test('a shared stable-ID profile retains RS R2/R4 charts and car details for RS0 without borrowing NR data', () => {
  const api = harness(), season = F.season(2026);
  api.ST.profiles['alex-test'] = { id: 'alex-test', name: 'Alex Test', photo: 'assets/brand.svg',
    bio: 'Synthetic shared biography.', links: { website: 'https://example.com/synthetic-profile' } };
  season.rallyesport = {
    events: [2, 4].map(n => ({ id: 'rs-r' + n, name: 'Synthetic RS R' + n, roundNumber: n })),
    results: [2, 4].map(n => ({
      id: 'rs-result-' + n, eventId: 'rs-r' + n, title: 'Synthetic source', status: 'Final classification',
      stages: [{ id: 'ss1', label: 'SS1' }], source: { file: 'synthetic.pdf' }, notes: [],
      entries: [{ car: String(n + 70), driver: 'Alex Test', codriver: '', class: 'RS4', pos: 6, classPos: 3,
        status: 'classified', times: ['1:00.01'], stagePos: [1], total: '1:00.01' }]
    }))
  };
  const nr = F.copy(F.payload('results', 2026).rounds[0]);
  nr.entries[0].vehicle = 'Synthetic NR-only vehicle';
  const model = select(api, season, { R1: nr });
  model.rallyesport.scoring.results = [2, 4].map(n => ({
    resultId: 'rs-result-' + n, status: 'ready',
    entries: [{ car: String(n + 70), driverPoints: n === 2 ? 0 : null,
      driverEligibility: { status: 'unverified', scoringClass: 'RS0' } }]
  }));
  api.rememberCompetition('rs');
  const before = JSON.stringify(model), html = api.viewRsPerson('alex-test').html;
  for (const text of ['profile-head', 'Synthetic shared biography.', 'assets/brand.svg', 'Driver points by round',
    'class="carno-lg">72', 'class="carno-lg">74', 'Not recorded', 'RS0 · Non-Scoring*',
    '/graph?cars=72&competition=rs', '2026 standings']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('NR statistics are not included'));
  assert.ok(!html.includes('Synthetic NR-only vehicle'));
  const points = api.rsPersonRoundPoints(model, 'alex-test', 'driver');
  assert.equal(points['rs-result-2'].pts, 0);
  assert.equal(points['rs-result-4'], undefined, 'unavailable points are not rendered as zero');
  const svg = api.pointsSvg({ rounds: [2, 4].map(n => ({ id: 'rs-result-' + n, n })), events: [] },
    { rounds: points }, 600, true);
  assert.ok(svg.includes('Championship: 0'));
  assert.ok(svg.includes('>–</text>'));
  assert.ok(!svg.includes('Overall:'));
  model.rallyesport.results[0].entries[0].vehicle = 'Synthetic RS-only vehicle';
  assert.ok(api.viewRsPerson('alex-test').html.includes('Synthetic RS-only vehicle'));
  delete model.rallyesport.results[0].entries[0].vehicle;
  assert.equal(JSON.stringify(model), before, 'all rendering leaves the model unchanged');
});
