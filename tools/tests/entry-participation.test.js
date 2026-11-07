const assert = require('node:assert/strict');
const { test } = require('node:test');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');
const approvals = { evidence: true };
function payload() {
  const p = F.payload('competitors', 2026);
  p.entryLists = [{ eventId: 'test-event', roundIds: ['R1'], complete: true, sourceId: 'entries',
    entries: [{ car: '1', driverRef: 'alex', codriverRef: 'new', class: 'OPEN', vehicle: 'Synthetic car',
      roundIds: ['R1'], status: 'entered', statusEvidence: '', participationEvidence: 'Supported regional field; day 1',
      locator: 'Row 1 regional entry' }] }];
  return p;
}
function plan(p = payload(), docs = F.docs(), choices = {}) { return AI.plan(p, docs, choices, approvals); }
test('entry-only profiles persist separately, appear in model and never enter standings', () => {
  const r = plan();
  assert.deepEqual(r.errors, []);
  assert.equal(r.afterModel.people.length, 2);
  assert.equal(r.afterModel.people[0].entries.length, 1);
  assert.equal(r.afterModel.people[0].apps.length, 0);
  assert.equal(r.afterModel.standings.drivers.length, 0);
  assert.equal(r.changes.length, 2);
  assert.ok(!Object.keys(r.docs).some(p => /rounds\//.test(p)));
  assert.equal(plan(payload(), r.docs).changes.length, 0);
  assert.ok(AI.projectPublic(r.docs['data/seasons/2026/season.json']).entryLists);
});
test('classification / DNF imports preserve entries, confirmations, scores and deduplicate profiles', () => {
  const result = AI.plan(F.payload('results', 2026), F.docs(), {}, approvals);
  result.docs['data/seasons/2026/season.json'].msa.confirmedRounds = ['R1'];
  const r = plan(payload(), result.docs);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.afterModel.standings, result.afterModel.standings);
  assert.deepEqual(r.docs['data/seasons/2026/season.json'].msa.confirmedRounds, ['R1']);
  assert.equal(r.afterModel.people[0].apps.length, 1);
  assert.equal(r.afterModel.people[0].entries.length, 1);
  assert.equal(r.afterModel.rounds[0].entryParticipation.entries[0].recordedStart, true);
  const p = F.payload('results', 2026), e = p.rounds[0].entries[0];
  e.status = 'DNF'; e.pos = null; e.total = null; e.stages = 1; e.times[1] = null; e.stagePos[1] = null;
  p.coverage[0].classified = 0; p.coverage[0].DNF = 1;
  const dnf = AI.plan(p, r.docs, {}, approvals);
  assert.deepEqual(dnf.errors, []);
  assert.equal(dnf.afterModel.standings.drivers[0].starts, 1);
  assert.equal(dnf.afterModel.standings.drivers[0].total, 0);
  assert.equal(dnf.afterModel.rounds[0].entryParticipation.entries[0].recordedStart, true);
  assert.deepEqual(dnf.docs['data/seasons/2026/season.json'].entryLists, r.docs['data/seasons/2026/season.json'].entryLists);
});
test('official DNS persists without creating a start; inferred DNS blocks', () => {
  const p = payload(); p.entryLists[0].entries[0].status = 'DNS';
  assert.ok(plan(p).errors.some(e => /infer DNS/.test(e)));
  p.entryLists[0].entries[0].statusEvidence = 'Official entry addendum row 1: DNS';
  const r = plan(p); assert.deepEqual(r.errors, []);
  assert.equal(r.afterModel.standings.drivers.length, 0);
  assert.equal(r.afterModel.people[0].entries[0].status, 'DNS');
  const classified = F.payload('results', 2026), e = classified.rounds[0].entries[0];
  e.status = 'DNS'; e.pos = null; e.total = null; e.stages = 0; e.times = [null, null]; e.stagePos = [null, null];
  classified.coverage[0].classified = 0; classified.coverage[0].DNS = 1;
  const existingDNS = AI.plan(classified, plan().docs, {}, approvals);
  assert.deepEqual(existingDNS.errors, []);
  assert.equal(existingDNS.afterModel.rounds[0].entryParticipation.entries[0].recordedDNS, true);
  assert.equal(existingDNS.afterModel.rounds[0].entryParticipation.entries[0].recordedStart, false);
  assert.equal(existingDNS.afterModel.standings.drivers.length, 0);
});
test('event-only evidence never assigns days, complete known selections count an event once', () => {
  const docs = F.docs(), p = payload();
  docs['data/seasons/2026/season.json'].rounds.push({ id: 'R2', eventId: 'test-event', day: 'Day 2', date: '2026-02-02' });
  p.entryLists[0].roundIds = [];
  p.entryLists[0].entries[0].roundIds = [];
  const r = plan(p, docs); assert.deepEqual(r.errors, []);
  assert.deepEqual(r.afterModel.people[0].entries[0].roundIds, []);
  p.entryLists[0].roundIds = ['R1', 'R2']; p.entryLists[0].entries[0].roundIds = ['R1', 'R2'];
  const both = plan(p, docs); assert.deepEqual(both.errors, []);
  assert.equal(both.afterModel.entryLists[0].entries.length, 1);
  assert.equal(both.afterModel.people[0].entries.length, 1);
  assert.equal(both.afterModel.standings.drivers.length, 0);
  p.entryLists[0].entries[0].roundIds = ['R1'];
  const second = F.copy(p.entryLists[0].entries[0]); second.car = '2'; second.roundIds = ['R2'];
  p.entryLists[0].entries.push(second); p.coverage[0].rows = 2;
  const split = plan(p, docs); assert.deepEqual(split.errors, []);
  assert.equal(split.afterModel.entryLists[0].eventEntries, 1);
});
test('source coverage, scopes, private fields and duplicate identity guard publication', () => {
  for (const mutate of [
    p => p.entryLists[0].complete = false,
    p => p.entryLists[0].entries[0].roundIds.push('R2'),
    p => p.entryLists[0].entries[0].participationEvidence = '',
    p => p.coverage[0].rows = 2,
    p => p.entryLists[0].entries[0].licence = 'private',
    p => p.entryLists[0].entries[0].codriverRef = 'alex',
    p => p.entryLists[0].eventId = 'unrelated'
  ]) {
    const p = payload(); mutate(p); assert.ok(plan(p).errors.length);
  }
  const r = plan(), se = r.docs['data/seasons/2026/season.json'];
  se.entryLists[0].entries.push(F.copy(se.entryLists[0].entries[0]));
  assert.ok(AI.validateDocuments(r.docs).some(i => /duplicate resolved/.test(i.msg)));
  se.entryLists[0].entries.pop(); se.entryLists[0].entries[0].points = 50;
  assert.ok(AI.validateDocuments(r.docs).some(i => /unknown field points/.test(i.msg)));
});
test('aliases reuse stable IDs; substitutions never credit the absent entered partner or invent a crew start', () => {
  const result = AI.plan(F.payload('results', 2026), F.docs(), {}, approvals);
  const p = payload(); p.competitors[0].name = 'A Test';
  p.competitors[1].name = 'Casey Substitute';
  const r = plan(p, result.docs);
  assert.deepEqual(r.errors, []);
  const alex = r.afterModel.people.find(p => p.id === 'alex-test'), substitute = r.afterModel.people.find(p => p.name === 'Casey Substitute');
  assert.equal(alex.entries[0].recordedStart, true);
  assert.equal(substitute.entries[0].recordedStart, false);
  assert.equal(substitute.apps.length, 0);
  assert.equal(r.afterModel.rounds[0].entryParticipation.entries[0].recordedStart, false);
  assert.deepEqual(r.afterModel.standings, result.afterModel.standings);
  const renumbered = payload(); renumbered.entryLists[0].entries[0].car = '50';
  const sameCrew = plan(renumbered, result.docs);
  assert.deepEqual(sameCrew.errors, []);
  assert.equal(sameCrew.afterModel.rounds[0].entryParticipation.entries[0].recordedStart, true);
  assert.deepEqual(sameCrew.afterModel.standings, result.afterModel.standings);
});
test('unknown/incomplete manual evidence remains explicitly partial and never affects scoring', () => {
  const r = plan(); r.docs['data/seasons/2026/season.json'].entryLists[0].complete = false;
  assert.deepEqual(AI.validateDocuments(r.docs).filter(i => i.level === 'error'), []);
  const p = F.payload('results', 2026), classified = AI.plan(p, r.docs, {}, approvals);
  assert.deepEqual(classified.errors, []);
  assert.equal(classified.afterModel.rounds[0].entryParticipation.complete, false);
});
test('backup/history undo are whole-document compatible; old classification reimport preserves entry evidence', () => {
  const r = plan(), backup = JSON.parse(JSON.stringify({ format: 'nr-rally-backup', version: 1, docs: r.docs }));
  assert.deepEqual(AI.validateDocuments(backup.docs).filter(i => i.level === 'error'), []);
  const classified = AI.plan(F.payload('results', 2026), backup.docs, {}, approvals);
  assert.deepEqual(classified.errors, []);
  const reimport = AI.plan(F.payload('results', 2026), classified.docs, {}, approvals);
  assert.deepEqual(reimport.errors, []); assert.equal(reimport.changes.length, 0);
  const undo = F.copy(r.docs);
  r.changes.forEach(c => { if (c.before) undo[c.path] = c.before; else delete undo[c.path]; });
  assert.deepEqual(undo, F.docs());
});
