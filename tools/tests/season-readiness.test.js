/* Synthetic fixtures only; VM rendering makes no database or analytics requests. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../../assets/engine.js');
const F = require('./ai-fixtures.js');
const root = path.resolve(__dirname, '..', '..');
const code = fs.readFileSync(path.join(root, 'assets', 'site.js'), 'utf8');
function harness(now = '2027-03-01T10:00:00Z') {
  class Clock extends Date { static now() { return Date.parse(now); } }
  const window = { NREngine: E, NR_FIREBASE: {}, NRGettingStarted: { edition: { year: 2026 } }, addEventListener() {} };
  const context = {
    window, Date: Clock, console, location: { hash: '' },
    localStorage: { getItem: () => null },
    document: { getElementById: () => ({}), documentElement: { setAttribute() {} } }
  };
  const instrumented = code.slice(0, code.indexOf('  /* ------------------------------------------------------------------ boot */')) +
    `window.testSite = { ST, useSeason, fmtDate, calendarStatus, viewHome, viewStandings,
      viewRounds, viewRound, viewCrews, viewAbout, viewInfo, viewPerson, header };
    })();`;
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
function select(api, season, rounds = {}) {
  const model = E.buildSeason({ season, rounds, people: api.ST.people });
  api.ST.models[season.year] = model;
  api.useSeason(model);
  return model;
}
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
  assert.ok(html.includes('href="#/2027/round/R1"'));
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
  assert.ok(api.header('info').includes('href="#/2027/info"'));
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
