const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');
const measurementId = 'G-' + 'A'.repeat(10);
test('analytics is optional, strictly validated, and retained in public projection and backups', () => {
  assert.deepEqual(E.validateAnalytics(undefined), []);
  for (const analytics of [{ enabled: false, measurementId: '' }, { enabled: false, measurementId },
    { enabled: true, measurementId }]) {
    assert.deepEqual(E.validateAnalytics(analytics), []);
    const docs = F.docs(); docs['data/site.json'].analytics = analytics;
    assert.deepEqual(AI.validateDocuments(docs).filter(i => i.level === 'error'), []);
    assert.deepEqual(AI.projectPublic(docs['data/site.json']).analytics, analytics);
    assert.deepEqual(JSON.parse(JSON.stringify({ docs })).docs['data/site.json'].analytics, analytics);
  }
  assert.deepEqual(E.validateDataset(F.docs()).filter(i => i.level === 'error'), []);
});
test('malformed, legacy, injection and extra settings fail publication without echoing the ID', () => {
  const invalid = [null, [], true, {}, { enabled: 'true', measurementId }, { enabled: true, measurementId: '' },
    { enabled: false, measurementId: null }, { enabled: false, measurementId: 123 },
    { enabled: true, measurementId, userId: 'private' }];
  for (const id of ['UA-123-1', 'GT-' + 'A'.repeat(10), measurementId.toLowerCase(),
    measurementId + '\n', measurementId + ' ', ' ' + measurementId, measurementId.slice(0, -1),
    measurementId + 'X', '<img src=x>', 'G-" onload=', 'G-你好你好你好你好你好']) invalid.push({ enabled: false, measurementId: id });
  for (const analytics of invalid) {
    const errors = E.validateAnalytics(analytics);
    assert.ok(errors.length, JSON.stringify(analytics));
    assert.ok(!errors.join(' ').includes(measurementId));
    const docs = F.docs(); docs['data/site.json'].analytics = analytics;
    assert.ok(AI.validateDocuments(docs).some(i => i.path === 'data/site.json' && i.level === 'error'));
  }
});
test('privacy is a dedicated static page, linked from Info/footer, not a popup or an admin script', () => {
  const root = path.resolve(__dirname, '..', '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const html = read('privacy.html'), site = read('assets/site.js'), admin = read('admin/index.html');
  assert.ok(html.includes('id="analyticsToggle"'));
  assert.ok(html.includes('data-disclaimer data-privacy'));
  assert.ok(!html.includes('<dialog'));
  assert.ok(!read('index.html').includes('id="analyticsToggle"'));
  assert.ok(!read('disclaimer.html').includes('id="analyticsToggle"'));
  assert.ok(!admin.includes('assets/analytics.js'));
  assert.equal((site.match(/href="privacy.html"/g) || []).length, 2);
  const versions = ['index.html', 'privacy.html', 'disclaimer.html', 'admin/index.html'].flatMap(file =>
    [...read(file).matchAll(/assets\/(?:styles\.css|rally-notice\.(?:css|js)|analytics\.js|engine\.js|site\.js|ai-import\.js|admin\.(?:css|js))\?v=([^"]+)/g)].map(m => m[1]));
  assert.equal(new Set(versions).size, 1);
  assert.equal(E.analyticsContractVersion, 1);
});
