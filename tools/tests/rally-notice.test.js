const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');
const notice = () => ({ enabled: true, name: 'Synthetic Rally', url: 'https://nrcsa.co.za/events/test?year=2027#entries', activationId: 'synthetic-activation-1' });
test('absent notice preserves legacy documents, disabled notice and active NRC event URLs validate', () => {
  assert.deepEqual(E.validateActiveRally(undefined), []);
  assert.deepEqual(E.validateActiveRally(notice()), []);
  assert.deepEqual(E.validateActiveRally({ ...notice(), enabled: false, name: '' }), []);
  const docs = F.docs();
  assert.deepEqual(E.validateDataset(docs).filter(i => i.level === 'error'), []);
  docs['data/site.json'].activeRally = notice();
  assert.deepEqual(AI.validateDocuments(docs).filter(i => i.level === 'error'), []);
  assert.deepEqual(AI.projectPublic(docs['data/site.json']).activeRally, notice());
  const model = () => E.buildSeason({ season: docs['data/seasons/2026/season.json'], people: docs['data/people.json'], rounds: {} });
  const before = model(); delete docs['data/site.json'].activeRally;
  assert.deepEqual(model(), before);
});
test('NRC destination is restricted to safe exact HTTPS hosts, without credentials or ports', () => {
  for (const url of ['https://nrcsa.co.za/', 'https://www.nrcsa.co.za/event/test', 'HTTPS://NRCSA.CO.ZA/entries']) {
    assert.ok(E.nrcDestination(url));
  }
  for (const url of ['', null, 42, 'javascript:alert(1)', 'http://nrcsa.co.za/', '//nrcsa.co.za/',
    'https://nrcsa.co.za.evil.example/', 'https://evil.example/nrcsa.co.za', 'https://nrcsa.co.za@evil.example/',
    'https://user:pass@nrcsa.co.za/', 'https://nrcsa.co.za:444/', 'https://entries.nrcsa.co.za/',
    'https://nrcsa.co.za\\@evil.example/', ' https://nrcsa.co.za/', 'https://nrcsa.co.za/\nentries']) {
    assert.equal(E.nrcDestination(url), '', String(url));
    assert.ok(E.validateActiveRally({ ...notice(), url }).length);
  }
});
test('malformed settings block publication, including disabled unsafe destinations', () => {
  for (const cfg of [null, [], true, { ...notice(), enabled: 'true' }, { ...notice(), name: '' },
    { ...notice(), name: 'x'.repeat(121) }, { ...notice(), name: 'Line\nbreak' },
    { ...notice(), activationId: '' }, { ...notice(), activationId: null }, { ...notice(), surprise: true },
    { ...notice(), enabled: false, url: 'javascript:alert(1)' }]) {
    assert.ok(E.validateActiveRally(cfg).length);
    const docs = F.docs(); docs['data/site.json'].activeRally = cfg;
    assert.ok(AI.validateDocuments(docs).some(i => i.path === 'data/site.json' && i.level === 'error'));
  }
});
test('notice and publishing scripts/styles use one coordinated cache version; admin has no blocker', () => {
  const root = path.resolve(__dirname, '..', '..');
  const versions = [];
  for (const file of ['index.html', 'disclaimer.html', 'admin/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const matches = [...html.matchAll(/assets\/(?:styles\.css|rally-notice\.(?:css|js)|engine\.js|site\.js|ai-import\.js|admin\.(?:css|js))\?v=([^"]+)/g)];
    assert.ok(matches.length >= 3); versions.push(...matches.map(m => m[1]));
    if (file.startsWith('admin')) assert.ok(!html.includes('rally-notice.js'));
  }
  assert.equal(new Set(versions).size, 1);
  assert.equal(E.rallyNoticeContractVersion, 1);
});
