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

function secondCrew(p) {
  const r = p.rounds[0], e = F.copy(r.entries[0]);
  e.car = '2'; e.pos = 2; e.driverRef = 'other-driver'; e.codriverRef = 'other-co';
  e.credit = null;
  e.times = ['2:00.0', '2:00.0']; e.total = '4:00.0'; e.stagePos = [2, 2];
  p.competitors.push({ ref: 'other-driver', name: 'Charlie Synthetic', existingId: null, aliases: [] },
    { ref: 'other-co', name: 'Delta Fixture', existingId: null, aliases: [] });
  ['other-driver', 'other-co'].forEach(ref => p.evidence.push({ ref: 'competitors.' + ref, sourceId: 'results', locator: 'Car 2' }));
  p.evidence.push({ ref: 'rounds.R1.entries.2', sourceId: 'results', locator: 'Car 2' });
  r.entries.push(e); p.coverage[0].rows++; p.coverage[0].classified++; p.coverage[0].classification.totalRows++;
  return e;
}
function override(p, car, credit) {
  if (!p.sources.some(s => s.id === 'standings')) p.sources.push(F.source('standings', 'Standings'));
  p.evidence.push({ ref: 'rounds.R1.entries.' + car + '.override', sourceId: 'standings', locator: 'Official credit exception for car ' + car });
  p.rounds[0].entries.find(e => e.car === car).credit = credit;
}
function extra(p, car, driverRef, codriverRef) {
  if (!p.sources.some(s => s.id === 'standings')) p.sources.push(F.source('standings', 'Standings'));
  p.rounds[0].extraStarts.push({ car, driverRef, codriverRef, class: 'OPEN', note: 'Official zero-point start',
    sourceId: 'standings', locator: 'Official starts table' });
}
test('resolved identities cannot occupy both printed crew roles, including two references selected as one person', () => {
  const p = F.payload('results', 2026), docs = F.docs(), snapshot = F.copy(docs);
  p.rounds[0].entries[0].codriverRef = 'alex';
  let r = plan(p, docs); assert.ok(r.errors.some(e => /duplicate resolved printed crew/.test(e))); assert.deepEqual(r.changes, []);
  p.rounds[0].entries[0].codriverRef = 'new';
  r = plan(p, docs, { new: 'alex-test' }); assert.ok(r.errors.some(e => /duplicate resolved printed crew/.test(e)));
  assert.deepEqual(docs, snapshot);
});
test('duplicate resolved crews or members in separate cars block before standings can overwrite', () => {
  const p = F.payload('results', 2026), e = secondCrew(p);
  assert.deepEqual(plan(p).errors, []);
  e.driverRef = 'alex'; e.codriverRef = 'new';
  const r = plan(p);
  assert.ok(r.errors.some(e => /duplicate resolved scored credit/.test(e))); assert.deepEqual(r.changes, []);
  e.driverRef = 'other-driver'; // Even one duplicated co-driver would overwrite a standings record.
  assert.ok(plan(p).errors.some(e => /duplicate resolved scored credit/.test(e)));
});
test('evidence-backed credit collisions block, while swaps and distinct credited crews remain valid', () => {
  const p = F.payload('results', 2026);
  override(p, '1', { driverRef: 'new', codriverRef: null, noCodriver: false, why: 'Official driver correction' });
  assert.ok(plan(p).errors.some(e => /duplicate resolved scored credit/.test(e)));
  p.rounds[0].entries[0].credit.codriverRef = 'alex';
  assert.deepEqual(plan(p).errors, []); // A documented driver/co-driver swap is valid.
  const other = secondCrew(p);
  assert.deepEqual(plan(p).errors, []);
  override(p, '2', { driverRef: 'alex', codriverRef: null, noCodriver: false, why: 'Conflicting official correction' });
  assert.ok(plan(p).errors.some(e => /duplicate resolved scored credit/.test(e)));
  other.credit.driverRef = 'other-driver'; other.credit.noCodriver = true;
  const valid = plan(p); assert.deepEqual(valid.errors, []); assert.equal(valid.afterModel.standings.codrivers.length, 1);
  p.rounds[0].entries[0].credit = { driverRef: 'new', codriverRef: null, noCodriver: true, why: 'Only driver credited' };
  assert.deepEqual(plan(p).errors, []); // Suppressed co-driver credit must not create a false collision.
});
test('new and retained extra starts cannot conflict with printed identities or credited results', () => {
  const p = F.payload('results', 2026); secondCrew(p);
  const existing = plan(p); assert.deepEqual(existing.errors, []);
  p.rounds[0].entries.pop(); p.coverage[0].rows--; p.coverage[0].classified--; p.coverage[0].classification.totalRows--;
  extra(p, '3', 'other-driver', 'other-co');
  assert.deepEqual(plan(p).errors, []); // Independent crew with an evidenced extra start.
  p.rounds[0].extraStarts[0].driverRef = 'alex';
  assert.ok(plan(p).errors.some(e => /duplicate resolved/.test(e)));
  p.rounds[0].extraStarts[0].driverRef = 'other-driver';
  p.rounds[0].extraStarts[0].codriverRef = 'other-driver';
  assert.ok(plan(p).errors.some(e => /duplicate resolved/.test(e)));
  p.rounds[0].extraStarts = [];
  existing.docs['data/seasons/2026/rounds/R1.json'].extraStarts = [
    { car: '3', driver: 'Alex Test', codriver: '', class: 'OPEN', note: 'Retained start' }
  ];
  assert.ok(plan(p, existing.docs).errors.some(e => /duplicate resolved/.test(e)));
  // Extra-start identity appears only through a credit override, not a printed crew.
  const credited = F.payload('results', 2026); secondCrew(credited);
  credited.rounds[0].entries.pop(); credited.coverage[0].rows--; credited.coverage[0].classified--; credited.coverage[0].classification.totalRows--;
  override(credited, '1', { driverRef: 'other-driver', codriverRef: null, noCodriver: false, why: 'Official credited driver' });
  extra(credited, '3', 'other-driver', 'other-co');
  assert.ok(plan(credited).errors.some(e => /duplicate resolved scored credit/.test(e)));
});
test('preserved legacy overrides and post-staging edits cannot introduce duplicate AI round credits', () => {
  const p = F.payload('results', 2026); secondCrew(p);
  const r = plan(p); assert.deepEqual(r.errors, []);
  r.docs['data/seasons/2026/rounds/R1.json'].entries[1].credit = { driver: 'Alex Test', why: 'Old conflicting credit' };
  assert.ok(plan(p, r.docs).errors.some(e => /duplicate resolved scored credit/.test(e)));
  assert.ok(AI.validateDocuments(r.docs).some(i => /duplicate resolved scored credit/.test(i.msg)));
  const legacy = F.copy(r.docs); delete legacy['data/seasons/2026/rounds/R1.json']._aiImport;
  assert.ok(!AI.validateDocuments(legacy).some(i => /duplicate resolved/.test(i.msg)), 'Do not change legacy manual workflow validation');
});
test('alias-based results preserve supplied printed spellings and resolve one stable profile', () => {
  const p = F.payload('results', 2026);
  p.competitors[0].name = 'A Test';
  const r = plan(p); assert.deepEqual(r.errors, []);
  assert.equal(r.docs['data/seasons/2026/rounds/R1.json'].entries[0].driver, 'A Test');
  assert.equal(r.afterModel.standings.drivers[0].id, 'alex-test');
  assert.equal(r.afterModel.standings.drivers[0].name, 'Alex Test');
  assert.equal(r.docs['data/people.json'].people.find(p => p.id === 'alex-test').name, 'Alex Test');
  assert.equal(plan(p, r.docs).changes.length, 0);
  // A verified non-canonical spelling becomes an alias, but is not rewritten on the raw row.
  p.competitors[0].name = 'Alex Tst';
  const matched = plan(p, F.docs(), { alex: 'alex-test' }); assert.deepEqual(matched.errors, []);
  assert.equal(matched.docs['data/seasons/2026/rounds/R1.json'].entries[0].driver, 'Alex Tst');
  assert.ok(matched.docs['data/people.json'].people[0].aliases.includes('Alex Tst'));
  assert.equal(matched.afterModel.standings.drivers[0].id, 'alex-test');
});
test('provisional and unclear finality warn and require independent acknowledgment without changing printed status', () => {
  for (const status of ['Provisional classification', 'Classification', 'Not final classification', 'Preliminary Final Classification']) {
    const p = F.payload('results', 2026); p.rounds[0].status = status;
    const a = AI.assess(p); assert.deepEqual(a.errors, []); assert.ok(a.warns.some(w => /finality/.test(w)));
    const blocked = plan(p); assert.ok(blocked.errors.some(e => /Acknowledge/.test(e))); assert.deepEqual(blocked.changes, []);
    const accepted = AI.plan(p, F.docs(), {}, { evidence: true, finality: true });
    assert.deepEqual(accepted.errors, []);
    const raw = accepted.docs['data/seasons/2026/rounds/R1.json'];
    assert.equal(raw.status, status); assert.equal(raw._aiImport.finalityAcknowledged, true);
    assert.equal(accepted.afterModel.rounds[0].provisional, /provisional/i.test(status));
    const publicRound = AI.projectPublic(raw);
    assert.equal(publicRound.finalityUnclear, !/provisional/i.test(status));
    const publicModel = E.buildSeason({ season: accepted.docs['data/seasons/2026/season.json'],
      rounds: { R1: publicRound }, people: accepted.docs['data/people.json'] });
    assert.equal(publicModel.rounds[0].finalityUnclear, !/provisional/i.test(status));
  }
  assert.ok(!AI.needsFinalityReview('Final Official Classification'));
  assert.ok(!AI.needsFinalityReview('Final classification'));
});
test('partial or duplicate classification batches/pages never replace an existing round', () => {
  const complete = F.payload('results', 2026); secondCrew(complete);
  const existing = plan(complete); assert.deepEqual(existing.errors, []);
  const snapshot = F.copy(existing.docs), partial = F.payload('results', 2026);
  partial.coverage[0].locator = 'Page 2 of 2';
  // Reproduced old contract: matching page-local counts and "complete" are insufficient.
  delete partial.coverage[0].classification;
  assert.ok(plan(partial, existing.docs).errors.some(e => /whole-classification/.test(e)));
  partial.coverage[0].classification = { batchIndex: 2, totalBatches: 2, pages: [2], totalPages: 2, totalRows: 2 };
  let blocked = plan(partial, existing.docs);
  assert.ok(blocked.errors.some(e => /Combine all batches/.test(e))); assert.deepEqual(blocked.changes, []);
  partial.coverage[0].classification.batchIndex = 1; partial.coverage[0].classification.totalBatches = 1;
  assert.ok(plan(partial, existing.docs).errors.some(e => /missing or duplicate/i.test(e)));
  partial.coverage[0].classification.pages = [2, 2];
  assert.ok(plan(partial, existing.docs).errors.some(e => /missing or duplicate/i.test(e)));
  partial.coverage.push(F.copy(partial.coverage[0])); // Duplicate batch reports must not count as assembly.
  assert.ok(plan(partial, existing.docs).errors.some(e => /counts must match/.test(e)));
  assert.deepEqual(existing.docs, snapshot);
});
test('combined whole-classification coverage reconciles rows and pages and reimports without data loss', () => {
  const p = F.payload('results', 2026); secondCrew(p);
  p.coverage[0].locator = 'All pages 1-2, entire classification';
  p.coverage[0].classification.pages = [1, 2]; p.coverage[0].classification.totalPages = 2;
  const assembled = plan(p); assert.deepEqual(assembled.errors, []);
  assert.equal(assembled.docs['data/seasons/2026/rounds/R1.json'].entries.length, 2);
  const repeated = plan(p, assembled.docs); assert.deepEqual(repeated.errors, []); assert.equal(repeated.changes.length, 0);
  p.coverage[0].classification.totalRows = 3;
  assert.ok(plan(p, assembled.docs).errors.some(e => /totalRows/.test(e)));
  p.coverage[0].classification.totalRows = 2; p.coverage[0].sourceId = 'different-source';
  assert.ok(plan(p, assembled.docs).errors.length);
});
