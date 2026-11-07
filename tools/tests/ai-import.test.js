const assert = require('node:assert/strict');
const { test } = require('node:test');
const AI = require('../../assets/ai-import.js');
const E = require('../../assets/engine.js');
const F = require('./ai-fixtures.js');
const approvals = { rules: true, evidence: true };
function plan(p, docs = F.docs(), choices = {}) { return AI.plan(p, docs, choices, approvals); }
function rejects(mutator, task = 'season') {
  const p = F.payload(task, task === 'season' ? 2027 : 2026); mutator(p);
  assert.ok(AI.assess(p).errors.length, 'Expected rejection');
}
test('strict schema, versions, unsafe keys, truncation and resource limits', () => {
  const p = F.payload(); assert.deepEqual(AI.parse(JSON.stringify(p)), p);
  assert.throws(() => AI.parse('{"format":'), /Invalid JSON/);
  assert.throws(() => AI.parse('```json\n' + JSON.stringify(p) + '\n```'), /Invalid JSON/);
  for (const edit of [q => q.version = 2, q => q.admins = [], q => q.season.events[0].id = 'constructor', q => q.rounds = {}, q => q.target.year = '2027']) {
    const bad = F.copy(p); edit(bad); assert.throws(() => AI.parse(JSON.stringify(bad)));
  }
  assert.throws(() => AI.parse(JSON.stringify(p).replace('"sources":', '"__proto__":{},"sources":')), /unsafe/);
  assert.throws(() => AI.parse(' '.repeat(AI.contract.limits.bytes + 1)), /4 MiB/);
});
test('new season is scoped, does not switch default, preserves private profiles and is idempotent', () => {
  const docs = F.docs(), snapshot = F.copy(docs), p = F.payload();
  const r = plan(p, docs); assert.deepEqual(r.errors, []);
  assert.deepEqual(docs, snapshot); assert.equal(r.docs['data/site.json'].currentSeason, 2026);
  assert.equal(r.docs['data/people.json'].people[0].bio, 'Preserve this');
  assert.equal(r.changes.length, 2); assert.equal(r.docs['data/seasons/2027/season.json']._aiImport.approved, true);
  assert.equal(plan(p, r.docs).changes.length, 0);
  const amendment = F.copy(p); amendment.task = 'amendment';
  assert.equal(plan(amendment, r.docs).changes.length, 0);
});
test('every unsupported/unknown rule, missing evidence and incomplete coverage blocks', () => {
  Object.keys(AI.policy).forEach(k => rejects(p => p.rules[k].value = 'different-policy'));
  rejects(p => p.rules.aggregation.value = null);
  rejects(p => p.rules.aggregation.assessment = 'unknown');
  rejects(p => p.sources[0].readable = false);
  rejects(p => p.sources[0].url = 'javascript:alert(1)');
  rejects(p => p.sources[0].date = '2027-02-30');
  rejects(p => p.evidence = []);
  rejects(p => p.coverage[0].complete = false);
  rejects(p => p.coverage[0].omissions.push('missing page'));
  const p = F.payload(); assert.ok(AI.plan(p, F.docs(), {}, { evidence: true }).errors.some(e => /approve every rule/.test(e)));
});
test('entry lists bulk-add name-only profiles with no starts/results/class maps', () => {
  const r = plan(F.payload('competitors', 2026));
  assert.deepEqual(r.errors, []); assert.equal(r.docs['data/people.json'].people.length, 2);
  assert.equal(r.afterModel.standings.drivers.length, 0);
  assert.equal(Object.keys(r.docs).filter(k => /rounds\//.test(k)).length, 0);
  assert.deepEqual(r.docs['data/seasons/2026/season.json'].classMap.drivers, {});
  assert.equal(plan(F.payload('competitors', 2026), r.docs).changes.length, 0);
});
test('classification scores site-calculated points, references cancelled-stage labels and repeats safely', () => {
  const p = F.payload('results', 2026), r = plan(p);
  assert.deepEqual(r.errors, []); assert.equal(r.afterModel.standings.drivers[0].total, 15);
  assert.equal(r.afterModel.standings.codrivers[0].starts, 1);
  assert.deepEqual(r.docs['data/seasons/2026/rounds/R1.json'].stages, ['SS1', 'SS3']);
  assert.equal(plan(p, r.docs).changes.length, 0);
  assert.ok(!('_aiImport' in AI.projectPublic(r.docs['data/seasons/2026/rounds/R1.json'])));
});
test('invalid status, stage lengths, time ranges, references, sources and counts cannot stage', () => {
  const edits = [
    p => p.rounds[0].entries[0].status = 'DSQ', p => p.rounds[0].entries[0].pos = 0,
    p => p.rounds[0].entries[0].times[0] = '1:60.0', p => p.rounds[0].entries[0].times[0] = '1:00.123',
    p => p.rounds[0].entries[0].total = '1:61:00.0', p => p.rounds[0].entries[0].times.pop(),
    p => p.rounds[0].entries[0].driverRef = 'missing', p => p.sources[0].kind = 'EntryList',
    p => p.coverage[0].rows = 2, p => p.rounds[0].entries[0].car = '__proto__',
    p => p.rounds[0].entries[0].credit = { driverRef: null, codriverRef: null, noCodriver: true, why: 'AI guess' }
  ];
  edits.forEach(edit => rejects(edit, 'results'));
  const p = F.payload('results', 2026); p.rounds[0].entries[0].total = '3:01.0';
  assert.ok(plan(p).errors.some(e => /stage times/.test(e)));
});
test('missing DNF times stay null and count a start, DNS never counts', () => {
  const p = F.payload('results', 2026), e = p.rounds[0].entries[0];
  e.status = 'DNF'; e.pos = null; e.total = null; e.stages = 1; e.times[1] = null; e.stagePos[1] = null;
  p.coverage[0].classified = 0; p.coverage[0].DNF = 1;
  const r = plan(p); assert.deepEqual(r.errors, []); assert.equal(r.afterModel.standings.drivers[0].starts, 1);
  assert.equal(r.afterModel.standings.drivers[0].total, 0);
  e.status = 'DNS'; e.stages = 0; e.times = [null, null]; e.stagePos = [null, null];
  p.coverage[0].DNF = 0; p.coverage[0].DNS = 1;
  const dns = plan(p); assert.deepEqual(dns.errors, []); assert.equal(dns.afterModel.standings.drivers.length, 0);
});
test('ambiguous aliases, lookalikes and wrong AI IDs require explicit resolution', () => {
  const docs = F.docs(), p = F.payload('competitors', 2026);
  p.competitors[0].name = 'Alex Tst';
  assert.equal(AI.identities(p, docs['data/people.json'])[0].choice, '');
  assert.ok(plan(p, docs).errors.length);
  assert.deepEqual(plan(p, docs, { alex: 'alex-test' }).errors, []);
  docs['data/people.json'].people.push({ id: 'other', name: 'Other Person', aliases: ['Alex Test'] });
  p.competitors[0].name = 'Alex Test';
  assert.equal(AI.identities(p, docs['data/people.json'])[0].exact.length, 2);
  assert.ok(plan(p, docs).errors.length);
});
test('slug collisions allocate stable IDs, while cross-profile aliases block', () => {
  const docs = F.docs(); docs['data/people.json'].people.push({ id: 'blake-example', name: 'Different Identity', aliases: [] });
  const r = plan(F.payload('competitors', 2026), docs); assert.deepEqual(r.errors, []);
  assert.equal(r.docs['data/people.json'].people.find(p => p.name === 'Blake Example').id, 'blake-example-2');
  const p = F.payload('competitors', 2026); p.competitors[1].aliases = ['Alex Test'];
  assert.ok(plan(p, docs, { new: 'new' }).errors.some(e => /Ambiguous/.test(e)));
});
test('amendments preserve omitted data and invalidate MSA confirmation; manual settings edits block until reviewed', () => {
  const r = plan(F.payload()), p = F.payload('amendment');
  r.docs['data/seasons/2027/season.json'].msa.confirmedRounds = ['R1'];
  p.season = { pointsScale: { overall: [12], cls: [4] } };
  p.evidence = [{ ref: 'season.pointsScale', sourceId: 'ssr', locator: 'Amended clause' }];
  const a = plan(p, r.docs); assert.deepEqual(a.errors, []);
  const s = a.docs['data/seasons/2027/season.json'];
  assert.equal(s.events.length, 1); assert.deepEqual(s.msa.confirmedRounds, []);
  s.minStarts = 3; assert.ok(AI.validateDocuments(a.docs).some(e => /changed/.test(e.msg)));
  s._aiImport.signature = AI.signature(s); assert.deepEqual(AI.validateDocuments(a.docs).filter(i => i.level === 'error'), []);
  s._aiImport.version = 2; assert.ok(AI.validateDocuments(a.docs).some(i => /Unknown AI/.test(i.msg)));
});
test('same car with different crew does not inherit old credit/skip-sum overrides', () => {
  const p = F.payload('results', 2026), r = plan(p), old = r.docs['data/seasons/2026/rounds/R1.json'].entries[0];
  old.skipSumCheck = true; old.credit = { driver: 'Alex Test', why: 'Old official exception' };
  old.notes = ['old crew note'];
  const same = plan(p, r.docs); assert.equal(same.docs['data/seasons/2026/rounds/R1.json'].entries[0].skipSumCheck, true);
  p.competitors[0].name = 'Charlie Synthetic'; p.competitors[1].name = 'Delta Fixture';
  const changed = plan(p, r.docs); assert.deepEqual(changed.errors, []);
  assert.equal(changed.docs['data/seasons/2026/rounds/R1.json'].entries[0].skipSumCheck, undefined);
  assert.equal(changed.docs['data/seasons/2026/rounds/R1.json'].entries[0].credit, undefined);
});
test('class-only ranking and countback after position 30 use documented policy', () => {
  const s = F.season(2026); s.pointsScale = { overall: [10], cls: [] }; s.minStarts = 0;
  const raw = {
    id: 'R1', stages: ['SS1'], entries: [
      { car: '1', driver: 'Zed Winner', codriver: '', class: 'TEST', status: 'classified', pos: 1, times: ['1:00.0'], total: '1:00.0' },
      { car: '2', driver: 'Zed Thirtyone', codriver: '', class: 'OPEN', status: 'classified', pos: 31, times: ['2:00.0'], total: '2:00.0' },
      { car: '3', driver: 'Alpha Thirtytwo', codriver: '', class: 'OPEN', status: 'classified', pos: 32, times: ['3:00.0'], total: '3:00.0' }
    ]
  };
  let m = E.buildSeason({ season: s, rounds: { R1: raw }, people: { people: [] } });
  assert.equal(m.rounds[0].entries[0].points.overall, 0); assert.equal(m.rounds[0].entries[1].points.overall, 10);
  s.pointsScale.overall = [];
  m = E.buildSeason({ season: s, rounds: { R1: raw }, people: { people: [] } });
  assert.ok(m.standings.drivers.findIndex(r => r.name === 'Zed Thirtyone') < m.standings.drivers.findIndex(r => r.name === 'Alpha Thirtytwo'));
});
test('large complete entry batch stages without per-person forms and prompt excludes private fields', () => {
  const docs = F.docs(), p = F.payload('competitors', 2026);
  p.competitors = []; p.evidence = [];
  for (let i = 0; i < 1500; i++) {
    const name = 'Synthetic Person ' + i, id = 'synthetic-' + i;
    docs['data/people.json'].people.push({ id, name, aliases: [], bio: 'PRIVATE', photo: '', links: {} });
    p.competitors.push({ ref: 'ref-' + i, name, existingId: null, aliases: [] });
    p.evidence.push({ ref: 'competitors.ref-' + i, sourceId: 'entries', locator: 'Row ' + i });
  }
  p.coverage[0].rows = 750;
  assert.ok(AI.bytes(JSON.stringify(p)) < AI.contract.limits.bytes);
  const start = performance.now(), r = plan(p, docs);
  assert.deepEqual(r.errors, []); assert.equal(r.changes.length, 0);
  assert.ok(performance.now() - start < 10000, '1500 exact identities should process within 10 seconds');
  const prompt = AI.prompt({ target: p.target, baseToken: p.baseToken, existingNames: [] }, 'setup');
  assert.ok(!prompt.includes('PRIVATE')); assert.ok(prompt.includes('No prompt')); assert.ok(prompt.includes('additionalProperties'));
});
