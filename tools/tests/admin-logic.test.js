/* Synthetic-only catalogue and rendering checks; no provider access. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const MI = require('../../assets/membership-identifiers.js');
const catalogue = require('../../assets/admin-logic.js');
const F = require('./ai-fixtures.js');
const root = path.resolve(__dirname, '..', '..');

function harness(engine = E) {
  const docs = F.docs(), season = docs['data/seasons/2026/season.json'];
  season.rallyesport = { events: [{ id: 'rs-only', name: 'Synthetic RS event', dates: '' }],
    results: [{ id: 'rs-source', eventId: 'rs-only', title: 'Synthetic source', status: 'Provisional classification',
      source: { file: 'synthetic.pdf', url: '' }, notes: [], stages: [{ id: 'ss1', label: 'SS1' }],
      entries: [{ car: '91', driver: 'Alex Test', codriver: '', class: 'RS2', status: 'classified', pos: 1,
        classPos: 1, total: '01:00.0', times: ['01:00.0'], stagePos: [1], invited: false }] }] };
  const ROOT = { addEventListener() {} };
  const window = { NREngine: engine, NRAIImport: AI, NRMembershipIdentifiers: MI, NRAdminLogic: catalogue, addEventListener() {} };
  const location = { hash: '#/rallyesport' };
  const context = { window, location, document: { getElementById: () => ROOT }, console, setTimeout, clearTimeout };
  const code = fs.readFileSync(path.join(root, 'assets', 'admin.js'), 'utf8');
  vm.runInNewContext(code.slice(0, code.indexOf('  /* ------------------------------------------------------------------ boot */')) +
    'window.testAdmin = { A, viewRallyeSport, viewLogic, changes, workingDocs, publicDocs, buildWrites, publishIssues, entryContractError, stageAll, stageUndo, binds, acts, setRender: function (fn) { render = fn; } }; })();', context);
  const api = window.testAdmin;
  for (const [key, obj] of Object.entries(docs)) api.A.docs[key] = { orig: E.prettyJson(obj) + '\n', obj, deleted: false };
  api.A.year = 2026; api.A.mode = 'live'; api.A.user = { email: 'admin@example.com' };
  return { api, location, window };
}
test('class-order review needs evidence and an explicit complete-source confirmation', () => {
  const { api, location, window } = harness();
  location.hash = '#/rallyesport/events/rs-only/source';
  api.setRender(() => {});
  const result = api.workingDocs()['data/seasons/2026/season.json'].rallyesport.results[0];
  const originalUrl = result.source.url, html = api.viewRallyeSport();
  const evidenceKey = html.match(/<textarea data-k="([^"]+)"[^>]*id="rsClassOrderEvidence"/)[1];
  const confirmKey = html.match(/<button[^>]*data-act="([^"]+)"[^>]*id="rsClassOrderConfirm"/)[1];
  assert.equal(result.classOrderReview, undefined);
  assert.throws(() => api.acts[confirmKey](), /evidence/);
  api.binds[evidenceKey]('Synthetic complete amended source');
  window.confirm = () => false;
  api.acts[confirmKey]();
  assert.equal(result.classOrderReview, undefined);
  window.confirm = message => { assert.match(message, /complete source and every classification row/); return true; };
  api.acts[confirmKey]();
  assert.equal(result.classOrderReview.evidence, 'Synthetic complete amended source');
  assert.equal(E.rallyeSportClassOrder(result).status, 'ready');
  assert.equal(result.source.url, originalUrl);
  result.source.url = 'https://example.com/corrected.pdf';
  assert.equal(E.rallyeSportClassOrder(result).status, 'unavailable');
  assert.match(api.viewRallyeSport(), /stale/);
  assert.match(harness({ ...E, rallyeSportClassOrderContractVersion: 0 }).api.entryContractError(), /RallyeSport scripts are missing or out of date/);
});
test('RS entry editor stages stable identities and uses atomic public/History/revision writes', () => {
  const { api, location, window } = harness();
  const f = F.preEventEntries(), s = f.season, path = 'data/seasons/2026/season.json';
  delete s.rallyesport.entryLists;
  for (const [key, obj] of Object.entries(f.docs)) api.A.docs[key] = { orig: E.prettyJson(obj) + '\n', obj, deleted: false };
  api.A.meta[path] = 'synthetic-version';
  api.A.rev = { n: 9, updateTime: 'synthetic-revision' };
  api.setRender(() => {});
  window.confirm = () => true;
  location.hash = '#/rallyesport/events/rs-r5/entries';
  function act(label) {
    const html = api.viewRallyeSport(), escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const key = html.match(new RegExp('<button[^>]*data-act="([^"]+)"[^>]*>' + escaped + '</button>'))[1];
    api.acts[key]();
  }
  function field(label, value) {
    const html = api.viewRallyeSport(), escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const key = html.match(new RegExp('<span class="fl">' + escaped + '</span><(?:input|select) data-k="([^"]+)"'))[1];
    api.binds[key](value);
  }
  act('Add RS entry list');
  field('RS entry source title', 'Synthetic received entries');
  field('RS entry source date', '2026-11-16');
  act('+ Add received crew');
  field('Received driver', 'synthetic-driver-1');
  field('Received co-driver', 'synthetic-codriver-1');
  field('Entered class (not scoring)', 'RS 4');
  field('Received car number', '301');
  field('Received vehicle', 'Synthetic vehicle');
  assert.equal(api.publishIssues().filter(issue => issue.level === 'error').length, 0);
  const list = s.rallyesport.entryLists[0];
  assert.equal(list.entries[0].enteredClass, 'RS4');
  const writes = api.buildWrites(api.changes(), 'Synthetic entries received').writes;
  const write = suffix => writes.find(row => row.update && row.update.name.endsWith(suffix));
  assert.equal(write('docs/season_2026').currentDocument.updateTime, 'synthetic-version');
  assert.equal(write('config/revision').currentDocument.updateTime, 'synthetic-revision');
  const projected = JSON.parse(write('public/season_2026').update.fields.json.stringValue);
  assert.equal(projected.season.rallyesport.entryLists[0].entries[0].car, '301');
  const history = writes.find(row => row.update && row.update.name.includes('/history/')).update.fields;
  assert.equal(history.by.stringValue, 'admin@example.com');
  assert.equal(JSON.parse(history.after.stringValue).rallyesport.entryLists[0].entries.length, 1);
  assert.equal(JSON.parse(history.before.stringValue).rallyesport.entryLists, undefined);
  field('Received vehicle', 'Changed vehicle');
  assert.equal(list.entries[0].vehicle, 'Changed vehicle');
  field('Received co-driver', 'synthetic-driver-1');
  assert.ok(api.publishIssues().some(issue => issue.level === 'error'));
  field('Received co-driver', '');
  act('Remove received crew');
  assert.equal(list.entries.length, 0);
  act('Remove RS entry list');
  assert.equal(s.rallyesport.entryLists.length, 0);
  assert.match(harness({ ...E, rallyeSportEntryListContractVersion: 0 }).api.entryContractError(), /RS entry-list scripts/);
});
test('private membership numbers stay out of public projections and survive restore/undo guards', async () => {
  const { api } = harness();
  const path = 'data/membership-numbers.json';
  const emptyNumbers = MI.emptyNumbers();
  const numbers = { format: MI.numbersFormat, version: 1,
    people: { 'alex-test': { msaNumber: '00123', rsNumbers: ['00456'] } } };
  api.A.docs[path] = { orig: E.prettyJson(emptyNumbers) + '\n', obj: numbers, deleted: false };
  api.A.meta[path] = 'synthetic-private-numbers-version';
  api.A.rev = { n: 1, updateTime: 'synthetic-revision' };
  const projection = api.publicDocs();
  assert.equal(projection.some(doc => doc.id === 'membership_numbers'), false);
  assert.equal(JSON.stringify(projection).includes('00123'), false);
  assert.equal(JSON.stringify(projection).includes('00456'), false);
  const writes = api.buildWrites(api.changes(), 'Synthetic private numbers').writes;
  assert.equal(writes.some(write => write.update && write.update.name.includes('/public/')), false,
    'a private-number-only publication leaves every public document untouched');
  const privateWrite = writes.find(write => write.update && write.update.name.endsWith('/docs/membership_numbers'));
  assert.equal(privateWrite.currentDocument.updateTime, 'synthetic-private-numbers-version');
  const revisionWrite = writes.find(write => write.update && write.update.name.endsWith('/config/revision'));
  assert.equal(revisionWrite.currentDocument.updateTime, 'synthetic-revision');
  const privateHistory = writes.find(write => write.update && write.update.name.includes('/history/')).update.fields;
  assert.equal(privateHistory.before.stringValue, E.prettyJson(emptyNumbers) + '\n');
  assert.match(privateHistory.after.stringValue, /00123/);
  assert.match(privateHistory.after.stringValue, /00456/);

  const backupDocs = JSON.parse(JSON.stringify(api.workingDocs()));
  delete backupDocs[path];
  await api.stageAll({ docs: backupDocs, photos: {} });
  assert.deepEqual(JSON.parse(JSON.stringify(api.workingDocs()[path])), numbers);
  assert.equal(api.stageUndo({ items: [{ path, before: null, after: E.prettyJson(numbers) + '\n' }] }), true);
  assert.equal(api.workingDocs()[path], undefined,
    'undo restores the recorded absence after confirming the sidecar still matches the History after-image');
});
test('undoing a profile merge validates private numbers against the same History profile before-image', () => {
  const { api } = harness(), path = 'data/membership-numbers.json', peoplePath = 'data/people.json';
  const beforePeople = structuredClone(api.workingDocs()[peoplePath]);
  const source = { id: 'merged-source', name: 'Synthetic merged source', aliases: [] };
  beforePeople.people.push(source);
  const beforeNumbers = { ...MI.emptyNumbers(), people: { [source.id]: { msaNumber: '00123' } } };
  const afterNumbers = MI.mergeProfileIdentifiers(beforeNumbers, 'alex-test', source.id);
  api.A.docs[path] = { orig: JSON.stringify(afterNumbers), obj: afterNumbers, deleted: false };
  assert.equal(api.stageUndo({ items: [
    { path, before: JSON.stringify(beforeNumbers), after: JSON.stringify(afterNumbers) },
    { path: peoplePath, before: JSON.stringify(beforePeople), after: JSON.stringify(api.workingDocs()[peoplePath]) }
  ] }), true);
  assert.deepEqual(JSON.parse(JSON.stringify(api.workingDocs()[path])), beforeNumbers);
  assert.ok(api.workingDocs()[peoplePath].people.some(person => person.id === source.id));
});
test('catalogue is a closed source-linked graph with explicit branch outcomes', () => {
  const ids = catalogue.topics.map(topic => topic.id), seen = new Set(ids);
  assert.equal(seen.size, ids.length);
  assert.equal(ids.length, 34);
  assert.match(catalogue.baseline, /^[a-f0-9]{40}$/);
  assert.deepEqual(catalogue.groups.map(group => group.id), ['nr', 'rs', 'shared']);
  const files = new Map();
  for (const topic of catalogue.topics) {
    assert.ok(catalogue.groups.some(group => group.id === topic.group));
    assert.ok(topic.intro && topic.inputs && topic.nodes.length >= 2);
    for (const id of topic.related) assert.ok(seen.has(id), id);
    for (const node of topic.nodes) {
      assert.ok(node.question && node.branches.length && node.evidence.length);
      for (const branch of node.branches) {
        assert.ok(branch.when && branch.outcome);
        if (branch.next) assert.ok(seen.has(branch.next), branch.next);
      }
      for (const ref of node.evidence) {
        assert.equal(ref.revision, undefined, 'use the immutable baseline unless explicitly marked current');
        assert.match(ref.path, /^(assets|docs)\//);
        assert.ok(!ref.path.includes('..'));
        const key = ref.current ? ref.path : (ref.revision || catalogue.baseline) + ':' + ref.path;
        if (!files.has(key)) files.set(key,
          (ref.current ? fs.readFileSync(path.join(root, ...ref.path.split('/')), 'utf8') :
            execFileSync('git', ['show', key], { cwd: root, encoding: 'utf8', windowsHide: true })).split('\n'));
        const lines = files.get(key);
        assert.ok(ref.start > 0 && ref.end >= ref.start && ref.end <= lines.length, JSON.stringify(ref));
        assert.ok(lines.slice(ref.start - 1, ref.end).join('\n').trim());
      }
    }
  }
});
test('every topic renders escaped navigable evidence without editing or projecting data', () => {
  const { api } = harness();
  const before = JSON.stringify(api.workingDocs()), projected = JSON.stringify(api.publicDocs());
  const scores = JSON.stringify(E.buildSeason({ season: api.workingDocs()['data/seasons/2026/season.json'], people: F.docs()['data/people.json'] }));
  for (const topic of catalogue.topics) {
    const html = api.viewLogic(topic.group, topic.id);
    assert.ok(html.includes('id="logicTopicTitle"'));
    assert.ok(html.includes('aria-label="Decision flow"'));
    assert.ok(html.includes('/blob/' + catalogue.baseline + '/'));
    assert.ok(html.includes('audited immutable revision'));
    assert.ok(!html.includes('legacy baseline') && !html.includes('release branch'));
    assert.ok(!html.includes('data-k=') && !html.includes('data-act='));
  }
  const missing = api.viewLogic('rs', '<script>');
  assert.match(missing, /Topic not found/);
  assert.ok(!missing.includes('<script>'));
  assert.equal(JSON.stringify(api.workingDocs()), before);
  assert.equal(JSON.stringify(api.publicDocs()), projected);
  assert.equal(JSON.stringify(E.buildSeason({ season: api.workingDocs()['data/seasons/2026/season.json'], people: F.docs()['data/people.json'] })), scores);
  assert.equal(api.changes().length, 0);
});
test('RS task rendering and disclosure never mutate draft, NR model or public projection', () => {
  const { api, location } = harness();
  const before = JSON.stringify(api.workingDocs()), projected = JSON.stringify(api.publicDocs()), issues = JSON.stringify(api.publishIssues());
  for (const route of ['setup', 'eligibility', 'checks', 'events', 'events/rs-only/event', 'events/rs-only/source',
    'events/rs-only/stages', 'events/rs-only/rows', 'events/rs-only/preview', 'events/unknown/rows']) {
    location.hash = '#/rallyesport/' + route;
    const html = api.viewRallyeSport();
    assert.match(html, /aria-label="RallyeSport workspace"/);
    assert.ok(!html.includes('<div class="form-grid"><div class="form-grid">'));
    assert.equal(JSON.stringify(api.workingDocs()), before);
    assert.equal(api.changes().length, 0);
  }
  assert.equal(JSON.stringify(api.publicDocs()), projected);
  assert.equal(JSON.stringify(api.publishIssues()), issues);
});
test('explanations keep sensitive distinctions and are admin-only assets', () => {
  const text = id => JSON.stringify(catalogue.topics.find(topic => topic.id === id));
  assert.match(text('nr-finality'), /regardless of source finality/);
  assert.match(text('nr-finality'), /does not establish a mismatch/);
  assert.match(text('rs-starters'), /No written amendment/);
  assert.match(text('rs-starters'), /official DNF need additional stage evidence/);
  assert.match(text('rs-points'), /official status establishes start even without stage observations/);
  assert.match(text('rs-roles'), /Independently remove excluded co-drivers/);
  assert.match(text('rs-members'), /NOT non-membership assertions/);
  assert.match(text('rs-totals'), /Share rank/);
  assert.match(text('rs-scope'), /future year/);
  assert.match(text('nr-national-entry'), /round 2 onward/);
  assert.match(text('nr-national-entry'), /uncredited role/);
  assert.match(text('shared-finality'), /separately reviewed acceptedForScoring/);
  assert.match(text('rs-class-display'), /without changing printed rows/);
  assert.match(text('shared-linked-display'), /Conflicting crew/);
  assert.doesNotMatch(text('rs-profiles'), /Never use an NR vehicle/);
  const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
  assert.match(admin, /admin-logic\.js/);
  assert.match(admin, /noindex, nofollow/);
  for (const file of ['index.html', 'privacy.html', 'disclaimer.html']) assert.ok(!/admin-logic\.(?:js|css)/.test(fs.readFileSync(path.join(root, file), 'utf8')));
});
test('new decision evidence points at the relevant audited implementation', () => {
  const checks = [
    ['nr-national-entry', 'diagnostic scope', 'function nrNationalEntryDiagnostics'],
    ['nr-national-entry', 'same-event car and role diagnostic', 'source.driverId !== entry.driverId'],
    ['shared-finality', 'current-finality digest and acceptance', 'function currentFinalityAccepted'],
    ['rs-class-display', 'class-order review', 'function rallyeSportClassOrder'],
    ['shared-linked-display', 'vehicle matching and conflict checks', 'function rsVehicle'],
    ['shared-linked-display', 'source-backed winners and scope', 'function sourceWinner']
  ];
  for (const [id, symbol, expected] of checks) {
    const ref = catalogue.topics.find(topic => topic.id === id).nodes.flatMap(node => node.evidence)
      .find(item => item.symbol === symbol);
    assert.ok(ref, symbol);
    const lines = execFileSync('git', ['show', catalogue.baseline + ':' + ref.path],
      { cwd: root, encoding: 'utf8', windowsHide: true }).split('\n');
    assert.ok(lines.slice(ref.start - 1, ref.end).join('\n').includes(expected), symbol);
  }
});
test('entry-based admin shows inactive legacy evidence and validates unsupported imported source statuses', () => {
  const { api, location } = harness(), f = F.revisedRallyeSport();
  for (const [key, obj] of Object.entries(f.docs)) api.A.docs[key] = { orig: E.prettyJson(obj) + '\n', obj, deleted: false };
  const before = JSON.stringify(api.workingDocs());
  assert.equal(api.entryContractError(), '', 'matching contract must allow review/restore/publication checks');
  assert.match(harness({ ...E, rallyeSportContractVersion: 1 }).api.entryContractError(), /RallyeSport scripts are missing or out of date/,
    'cached legacy engines must not restore or publish revised data');
  location.hash = '#/rallyesport/eligibility';
  const eligibility = api.viewRallyeSport();
  assert.match(eligibility, /Entry-based driver and co-driver eligibility/);
  assert.ok(!eligibility.includes('Membership eligibility for '));
  assert.ok(!eligibility.includes('Manual RS scoring exclusion</'));
  location.hash = '#/rallyesport/events/rs-r1/rows';
  const rows = api.viewRallyeSport();
  assert.match(rows, /Private launch-only RS0 review evidence/);
  assert.match(rows, /TEST/);
  location.hash = '#/rallyesport/setup';
  assert.match(api.viewRallyeSport(), /Private entry-based policy evidence/);
  assert.equal(JSON.stringify(api.workingDocs()), before);
  assert.equal(api.changes().length, 0);
});
