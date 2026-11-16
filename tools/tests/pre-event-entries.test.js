/* Synthetic event entry contracts. No provider or private data. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const C = require('../../assets/public-components.js');
const F = require('./ai-fixtures.js');
function model(f) {
  return E.buildSeason({ season: AI.projectPublic(f.season, f.people),
    rounds: {}, people: f.people, publicProjection: true });
}
function display(f, tab = 'classification') { return P.eventResult(model(f), 'rs-r5', tab); }
test('RS entry add/edit/remove is data-only; NR and RS sporting facts remain unchanged', () => {
  const f = F.preEventEntries(), before = model(F.revisedRallyeSport());
  for (const change of [
    () => {},
    () => { f.data.entryLists[0].entries[0].enteredClass = 'RS0'; },
    () => { f.data.entryLists[0].entries[0].vehicle = 'Changed synthetic vehicle'; },
    () => { f.data.entryLists[0].entries = []; }
  ]) {
    change();
    assert.deepEqual(E.validateRallyeSportEntryLists(f.data, f.people), []);
    assert.deepEqual(AI.validateDocuments(f.docs).filter(issue => issue.level === 'error'), []);
    const built = model(f);
    assert.deepEqual(built.standings, before.standings);
    assert.deepEqual(built.people, before.people);
    assert.deepEqual(built.rallyesport.results, before.rallyesport.results);
    assert.deepEqual(built.rallyesport.scoring, before.rallyesport.scoring);
    for (const mode of ['nr', 'rs']) {
      assert.deepEqual(P.home(built, mode), P.home(before, mode));
      assert.deepEqual(P.directory(built, mode), P.directory(before, mode));
    }
    assert.equal(display(f).published, false);
    assert.deepEqual(display(f).rows, []);
  }
});
test('pre-event Classification is reachable without fake results and keeps the shared tabs', () => {
  const f = F.preEventEntries(), d = display(f), text = C.resultShell(d, '', Date.parse('2026-11-17T10:00:00Z')).html;
  assert.match(P.calendar(model(f), 'rs').events.find(event => event.id === 'rs-r5').rounds[0].classificationHref, /rallyesport-event\/rs-r5\/classification/);
  assert.match(text, /Entries received — event not yet held/);
  assert.match(text, /Synthetic driver 1/);
  assert.match(text, /Entered class/);
  assert.match(text, /not a confirmed scoring decision/);
  assert.match(text, /Partial list/);
  assert.doesNotMatch(text, /Official finish:|Championship pts|<th[^>]*>Pos|result-points/);
  assert.equal(d.graph, null);
  assert.equal(d.tabs.length, 3);
  assert.ok(d.navigation.some(item => item.selected && /rs-r5/.test(item.href)));
  assert.equal(P.eventResult(model(f), 'missing', 'classification'), null);
  for (const tab of ['graph', 'stages']) {
    assert.match(C.resultShell(display(f, tab), '').html, /View entries received/);
  }
});
test('missing results do not assert an event is still in the future after its scheduled date', () => {
  const d = display(F.preEventEntries());
  for (const now of ['2026-11-28T10:00:00Z', '2026-11-29T10:00:00Z']) {
    const html = C.resultShell(d, '', Date.parse(now)).html;
    assert.match(html, /Entries received — results not yet published/);
    assert.doesNotMatch(html, /event not yet held/);
  }
  d.dateIso = '';
  assert.match(C.resultShell(d, '', Date.parse('2026-11-17T10:00:00Z')).html, /results not yet published/);
});
test('absent, empty, complete and partial fields stay honest and escaped', () => {
  const f = F.preEventEntries(), list = f.data.entryLists[0], row = list.entries[0];
  row.car = ''; row.codriverId = ''; row.vehicle = ''; row.enteredClass = '';
  assert.deepEqual(E.validateRallyeSportEntryLists(f.data, f.people), []);
  let html = C.resultShell(display(f), '').html;
  assert.equal((html.match(/<td[^>]*>Not supplied<\/td>/g) || []).length, 4);
  row.vehicle = '<img src=x onerror=alert(1)>';
  assert.match(C.resultShell(display(f), '').html, /&lt;img/);
  list.entries = [];
  assert.match(C.resultShell(display(f), '').html, /No entries recorded in this published partial list/);
  list.complete = true;
  assert.match(C.resultShell(display(f), '').html, /Complete list as at source date/);
  delete f.data.entryLists;
  assert.match(C.resultShell(display(f), '').html, /No entries published yet/);
});
test('NR entries never become RS entrants and event/result IDs cannot collide', () => {
  const f = F.preEventEntries();
  delete f.data.entryLists;
  f.data.events.at(-1).nrEventId = 'test-event';
  f.season.entryLists = [{ eventId: 'test-event', roundIds: [], complete: false,
    source: { file: 'Synthetic NR entries', url: 'https://example.com/nr-entries.pdf', date: '2026-11-16', locator: 'Synthetic NR scope' },
    entries: [{ car: '301', driver: 'Synthetic driver 1', codriver: 'Synthetic codriver 1',
      class: 'NR2', vehicle: 'NR-only vehicle', roundIds: [], status: 'entered',
      statusEvidence: '', participationEvidence: 'Synthetic NR-only evidence', locator: 'Synthetic row' }] }];
  const d = display(f);
  assert.equal(d.receivedEntries, null);
  assert.doesNotMatch(C.resultShell(d, '').html, /NR-only vehicle|Synthetic driver 1/);
  assert.equal(d.published, false);
  const oldResult = f.data.results[1];
  f.data.events.at(-1).id = oldResult.id;
  const future = P.eventResult(model(f), oldResult.id, 'classification');
  assert.equal(future.published, false, 'event route must not resolve an unrelated result with the same ID');
  assert.equal(P.result(model(f), 'rs', oldResult.id, 'classification').published, true);
});
test('stable role identities, duplicate seats/cars, public fields, dates and classes are validated', () => {
  for (const mutate of [
    f => { f.data.entryLists[0].entries[0].driverId = 'unknown'; },
    f => { f.data.entryLists[0].entries[0].codriverId = 'synthetic-driver-1'; },
    f => { f.data.entryLists[0].entries.push({ ...f.data.entryLists[0].entries[0] }); },
    f => { f.data.entryLists[0].eventId = 'test-event'; },
    f => { f.data.entryLists[0].source.date = '2026-02-30'; },
    f => { f.data.entryLists[0].source.url = 'javascript:alert(1)'; },
    f => { f.data.entryLists[0].source.url = 'https://user:pass@example.com/'; },
    f => { f.data.entryLists[0].source.licence = 'forbidden'; },
    f => { f.data.entryLists[0].entries[0].email = 'forbidden'; },
    f => { f.data.entryLists[0].entries[0].enteredClass = 'rs 4'; },
    f => { f.data.entryLists[0].entries[0].points = 45; },
    f => { f.data.entryLists[0].entries[0].driverId = '__proto__'; }
  ]) {
    const f = F.preEventEntries(); mutate(f);
    assert.ok(E.validateRallyeSportEntryLists(f.data, f.people).length, mutate.toString());
    assert.ok(AI.validateDocuments(f.docs).some(issue => issue.level === 'error'));
  }
});
test('official results take precedence on the same event URL and retain independent entries', () => {
  const f = F.preEventEntries(), official = F.revisedRallyeSport(true).data.results.at(-1);
  const original = F.copy(f.data.entryLists);
  f.data.results.push(official);
  const d = display(f), html = C.resultClassification(d);
  assert.equal(d.published, true);
  assert.equal(d.rows[0].car, '1');
  assert.match(html, /Official finish:/);
  assert.match(html, /Entries received \(retained separately from results\)/);
  assert.match(html, /Synthetic entry vehicle/);
  assert.deepEqual(f.data.entryLists, original);
  assert.ok(d.tabs.every(tab => /rallyesport-event\/rs-r5/.test(tab.href)));
  assert.deepEqual(P.result(model(f), 'rs', official.id, 'classification').receivedEntries, d.receivedEntries);
});
test('projection allowlist and evidence-loss guards cover restore/undo/replacement', () => {
  const f = F.preEventEntries(), baseline = F.copy(f.season);
  f.data.entryLists[0].source.privateNote = 'must not project';
  f.data.entryLists[0].entries[0].privateNote = 'must not project';
  assert.doesNotMatch(JSON.stringify(AI.projectPublic(f.season, f.people).rallyesport.entryLists), /privateNote|must not project/);
  assert.equal(E.entryEvidenceLoss(baseline, F.revisedRallyeSport().season), true);
  assert.equal(E.entryEvidenceLoss(baseline, F.copy(baseline)), false);
  for (const mutate of [
    s => { s.rallyesport.entryLists[0].entries = []; },
    s => { s.rallyesport.entryLists[0].entries[0].enteredClass = 'RS2'; },
    s => { s.rallyesport.entryLists[0].source.title = 'Replacement'; },
    s => { s.rallyesport.entryLists = []; }
  ]) {
    const next = F.copy(baseline); mutate(next);
    assert.equal(E.entryEvidenceLoss(baseline, next), true);
  }
});
