const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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
  for (const file of ['index.html', 'disclaimer.html', 'privacy.html', 'admin/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const matches = [...html.matchAll(/assets\/(?:styles\.css|display-context\.js|rally-notice\.(?:css|js)|engine\.js|site\.js|ai-import\.js|admin\.(?:css|js))\?v=([^"]+)/g)];
    assert.ok(matches.length >= 3); versions.push(...matches.map(m => m[1]));
    if (file.startsWith('admin')) assert.ok(!html.includes('rally-notice.js'));
  }
  assert.equal(new Set(versions).size, 1);
  assert.equal(E.rallyNoticeContractVersion, 1);
});

function welcomeHarness(saved = new Map(), failure = '') {
  let now = Date.parse('2027-01-01T10:00:00Z'), dialog = null;
  const warnings = [], key = 'nr-rs-welcome-until';
  const button = { addEventListener(type, fn) { this[type] = fn; } };
  const link = { ...button, setAttribute() {} };
  const document = {
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {} }, appendChild(el) { dialog = el; } },
    querySelector: () => dialog,
    getElementById: () => ({ focus() {} }),
    createElement: () => ({
      setAttribute() {}, querySelector: selector => selector === 'a' ? link : button,
      addEventListener(type, fn) { this[type] = fn; },
      showModal() {}, close() {}, remove() { dialog = null; }
    })
  };
  const window = { addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../assets/display-context.js'), 'utf8'), {
    window, document, URLSearchParams, location: { search: '' },
    Date: { now: () => now },
    console: { warn: message => warnings.push(message) },
    localStorage: {
      getItem(k) { if (failure === 'read') throw new Error('Synthetic read failure'); return saved.get(k) || null; },
      setItem(k, value) { if (failure === 'write') throw new Error('Synthetic write failure'); saved.set(k, value); }
    }
  });
  return {
    show: () => window.NRDisplay.welcome('#/info?competition=rs', true),
    manual: () => window.NRDisplay.welcome('#/info?competition=rs'),
    close: () => window.NRDisplay.closeWelcome(),
    dismiss(method) {
      if (method === 'escape') dialog.cancel({ preventDefault() {} });
      else (method === 'info' ? link : button).click();
    },
    open: () => !!dialog, time: value => { now = value; }, saved, warnings, key
  };
}
test('welcome dismissal persists for exactly seven days without extending on suppressed visits', () => {
  const first = welcomeHarness(), start = Date.parse('2027-01-01T10:00:00Z'), week = 7 * 86400000;
  first.show(); assert.equal(first.open(), true);
  first.close(); assert.equal(first.saved.has(first.key), false, 'route/cleanup close is not acceptance');
  first.show(); first.dismiss('continue'); assert.equal(first.open(), false);
  assert.equal(first.saved.get(first.key), String(start + week));
  const reload = welcomeHarness(first.saved);
  reload.time(start + week - 1); reload.show(); assert.equal(reload.open(), false);
  assert.equal(reload.saved.get(reload.key), String(start + week), 'suppression is not sliding');
  reload.time(start + week); reload.show(); assert.equal(reload.open(), true);
  reload.dismiss('escape');
  assert.equal(reload.saved.get(reload.key), String(start + 2 * week));
});
test('welcome Info and Escape dismissals persist; explicit manual reopen still works', () => {
  for (const method of ['info', 'escape']) {
    const h = welcomeHarness();
    h.show(); h.dismiss(method); h.show(); assert.equal(h.open(), false);
    h.manual(); assert.equal(h.open(), true);
    h.close();
    const restart = welcomeHarness(h.saved);
    restart.show(); assert.equal(restart.open(), false);
  }
});
test('unreadable or unwritable welcome storage warns and retains only page-local dismissal', () => {
  for (const failure of ['read', 'write']) {
    const h = welcomeHarness(new Map(), failure);
    h.show(); assert.equal(h.open(), true);
    h.dismiss('continue'); h.show(); assert.equal(h.open(), false);
    assert.ok(h.warnings.some(w => w.includes(failure === 'read' ? 'could not be read' : 'could not be saved')));
    const reload = welcomeHarness(h.saved, failure);
    reload.show(); assert.equal(reload.open(), true);
  }
});
test('invalid, expired or implausibly future welcome preferences do not suppress the notice', () => {
  for (const value of ['not-a-time', 'Infinity', '-1', '0', String(Date.parse('2028-01-01'))]) {
    const h = welcomeHarness(new Map([['nr-rs-welcome-until', value]]));
    h.show(); assert.equal(h.open(), true, value);
  }
});
