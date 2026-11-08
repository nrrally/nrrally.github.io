const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..');
const code = fs.readFileSync(path.join(root, 'assets', 'getting-started.js'), 'utf8');
function guide() {
  const context = { window: {} };
  vm.runInNewContext(code, context);
  return context.window.NRGettingStarted.view();
}
test('the bundled guide covers a season and the mechanics of an event without event-specific examples', () => {
  const view = guide();
  assert.equal(view.title, 'Getting started in NR Rally');
  assert.equal((view.html.match(/<h1>/g) || []).length, 1);
  for (const id of ['watch', 'crew', 'rules', 'national-regional', 'ready', 'before', 'arrival', 'during', 'after', 'season', 'references']) {
    assert.ok(view.html.includes('id="guide-' + id + '"'), id);
  }
  for (const phrase of ['Standing Supplementary Regulations', 'Supplementary Regulations',
    'club membership', 'NRC1&ndash;NRC4', 'NR1&ndash;NR4', 'NR0', 'class points but no overall NR points', 'National rules prevail in a conflict',
    'homologation', 'non-homologated', 'control racing fuel', 'no additives', 'methanol', 'GCR 240',
    'generally cheaper', 'documentation', 'scrutineering', 'briefing', 'timecard', 'time controls',
    'flying finish', 'Service', 'Provisional results', 'Entering does not establish a start',
    'minimum number of round starts', 'separate NR rounds and classifications', 'current regulations']) {
    assert.ok(view.html.includes(phrase), phrase);
  }
  assert.ok(!/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|eval)\s*\(/.test(code));
  assert.ok(!/start at least (?:five|5)/i.test(view.html), 'Do not hard-code a season minimum');
  assert.ok(!/\bR\s?\d{3,}/.test(view.html), 'No quoted entry prices');
  assert.ok(!/ICAM|GR Legends|re-scrut|8 November 2026|reference edition/i.test(view.html));
  assert.ok(view.html.includes('time-control check-in and a stage start are separate'));
});
test('watching is the welcoming starting point, with competition requirements kept in crew sections', () => {
  const html = guide().html;
  const opening = html.slice(0, html.indexOf('<nav class="guide-jumps"'));
  const watch = html.slice(html.indexOf('id="guide-watch"'), html.indexOf('id="guide-crew"'));
  assert.ok(opening.includes('Come watch a Northern Regions rally'));
  assert.ok(opening.includes('If you later want to join a crew'));
  assert.ok(!/\blicen[cs]e|eligibility|approved|first three steps/i.test(opening));
  assert.ok(watch.includes('Just come and watch'));
  assert.ok(!/\blicen[cs]e|club membership|car&rsquo;s eligibility/i.test(watch));
  for (const phrase of ['spectator guide', 'designated viewing areas', 'do not enter or cross a live stage',
    'gap between cars does not mean the road is open']) assert.ok(watch.toLowerCase().includes(phrase), phrase);
  assert.ok(!/rally[- ]raid|Your first three steps|guide-orientation/i.test(html));
  assert.ok(html.includes('To <strong>compete</strong>'));
});
test('maintainer edition metadata stays independent of season without a visible edition notice', () => {
  const context = { window: {} };
  vm.runInNewContext(code, context);
  assert.equal(context.window.NRGettingStarted.edition.year, 2026);
  assert.equal(context.window.NRGettingStarted.edition.checked, '8 November 2026');
  const html = context.window.NRGettingStarted.view().html;
  assert.ok(!/reference edition|checked 8 November 2026|not verified for other seasons/i.test(html));
  assert.ok(html.includes('2026 Northern Regions Rally SSRs'));
  assert.ok(html.includes('Check the current regulations and event bulletins'));
});
test('topic anchors resolve uniquely and all references are official HTTPS destinations', () => {
  const html = guide().html;
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  const links = [...html.matchAll(/<a href="([^"]+)"([^>]*)>/g)];
  for (const [, href, attributes] of links) {
    if (href.startsWith('#/getting-started/')) {
      assert.ok(ids.includes('guide-' + href.split('/').at(-1)), href);
    } else if (!href.startsWith('#/')) {
      const url = new URL(href);
      assert.equal(url.protocol, 'https:');
      assert.ok(['www.motorsport.co.za', 'msaonline.co.za', 'nrcsa.co.za'].includes(url.hostname));
      assert.ok(attributes.includes('rel="noopener noreferrer"'));
    }
  }
  assert.ok(!/<(?:script|iframe|form)\b|\son\w+=/i.test(html));
});
test('the guide is loaded before the SPA and shares the coordinated asset version', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('assets/getting-started.js') < html.indexOf('assets/site.js'));
  const versions = [...html.matchAll(/assets\/[^"]+\?v=([^"]+)/g)].map(m => m[1]);
  assert.equal(new Set(versions).size, 1);
});
