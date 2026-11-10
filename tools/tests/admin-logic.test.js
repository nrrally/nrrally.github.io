/* Synthetic-only catalogue and rendering checks; no provider access. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const catalogue = require('../../assets/admin-logic.js');
const F = require('./ai-fixtures.js');
const root = path.resolve(__dirname, '..', '..');

function harness() {
  const docs = F.docs(), season = docs['data/seasons/2026/season.json'];
  season.rallyesport = { events: [{ id: 'rs-only', name: 'Synthetic RS event', dates: '' }],
    results: [{ id: 'rs-source', eventId: 'rs-only', title: 'Synthetic source', status: 'Provisional classification',
      source: { file: 'synthetic.pdf', url: '' }, notes: [], stages: [{ id: 'ss1', label: 'SS1' }],
      entries: [{ car: '91', driver: 'Alex Test', codriver: '', class: 'RS2', status: 'classified', pos: 1,
        classPos: 1, total: '01:00.0', times: ['01:00.0'], stagePos: [1], invited: false }] }] };
  const ROOT = { addEventListener() {} };
  const window = { NREngine: E, NRAIImport: AI, NRAdminLogic: catalogue, addEventListener() {} };
  const location = { hash: '#/rallyesport' };
  const context = { window, location, document: { getElementById: () => ROOT }, console, setTimeout, clearTimeout };
  const code = fs.readFileSync(path.join(root, 'assets', 'admin.js'), 'utf8');
  vm.runInNewContext(code.slice(0, code.indexOf('  /* ------------------------------------------------------------------ boot */')) +
    'window.testAdmin = { A, viewRallyeSport, viewLogic, changes, workingDocs, publicDocs, publishIssues }; })();', context);
  const api = window.testAdmin;
  for (const [key, obj] of Object.entries(docs)) api.A.docs[key] = { orig: E.prettyJson(obj) + '\n', obj, deleted: false };
  api.A.year = 2026; api.A.mode = 'live'; api.A.user = { email: 'admin@example.com' };
  return { api, location };
}
test('catalogue is a closed source-linked graph with explicit branch outcomes', () => {
  const ids = catalogue.topics.map(topic => topic.id), seen = new Set(ids);
  assert.equal(seen.size, ids.length);
  assert.equal(ids.length, 30);
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
        assert.match(ref.path, /^(assets|docs)\//);
        assert.ok(!ref.path.includes('..'));
        if (!files.has(ref.path)) files.set(ref.path, execFileSync('git', ['show', catalogue.baseline + ':' + ref.path],
          { cwd: root, encoding: 'utf8', windowsHide: true }).split('\n'));
        const lines = files.get(ref.path);
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
  assert.match(text('rs-starters'), /total can satisfy the event threshold/);
  assert.match(text('rs-points'), /Null points/);
  assert.match(text('rs-roles'), /Independently remove excluded co-drivers/);
  assert.match(text('rs-members'), /NOT non-membership assertions/);
  assert.match(text('rs-totals'), /Share rank/);
  assert.match(text('rs-scope'), /future year/);
  const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
  assert.match(admin, /admin-logic\.js/);
  assert.match(admin, /noindex, nofollow/);
  for (const file of ['index.html', 'privacy.html', 'disclaimer.html']) assert.ok(!/admin-logic\.(?:js|css)/.test(fs.readFileSync(path.join(root, file), 'utf8')));
});
