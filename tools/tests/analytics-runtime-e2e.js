/* Actual Google tag supplied externally; synthetic origins/data, all browser traffic intercepted.
   Optional offline remote-container replay replaces property IDs in memory before execution. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const repo = path.resolve(__dirname, '..', '..');
const measurementId = 'G-' + 'A'.repeat(10);
const base = 'https://synthetic.example.test';
const tagPath = process.env.GA_SYNTHETIC_RUNTIME;
assert.ok(tagPath, 'Set GA_SYNTHETIC_RUNTIME to the downloaded Google tag for the generated all-A test ID.');
const originalRuntime = fs.readFileSync(tagPath, 'utf8');
// Explicit offline replay only: replace property IDs before executing a captured remote container.
// Never fetch or forward a browser request, even when testing remotely configured transformations.
const runtime = process.env.GA_OFFLINE_REDACT_IDS === '1' ?
  originalRuntime.replace(/G-[A-Z0-9]{10}(?![A-Z0-9])/g, measurementId) : originalRuntime;
assert.ok(runtime.includes(measurementId), 'Runtime must be downloaded for the generated test ID, never a real property.');
assert.ok([...runtime.matchAll(/G-[A-Z0-9]{10}(?![A-Z0-9])/g)].every(m => m[0] === measurementId),
  'Refuse any runtime containing another GA4 Measurement ID.');
const fixtures = F.docs(), site = fixtures['data/site.json'];
site.analytics = { enabled: true, measurementId };
const external = [], collectors = [], scriptHeaders = [], errors = [], csp = [];
let runtimeDelay = 0;
function events() {
  return collectors.flatMap(record => {
    const url = new URL(record.url), common = new URLSearchParams(url.search);
    return (record.body ? record.body.split('\n') : ['']).map(line => {
      const params = new URLSearchParams(common);
      new URLSearchParams(line).forEach((v, k) => params.set(k, v));
      return { ...record, params: Object.fromEntries(params) };
    });
  });
}
function views() { return events().filter(e => e.params.en === 'page_view'); }
function assertPrivateAbsent() {
  for (const record of [...collectors, ...scriptHeaders, ...external]) {
    const text = JSON.stringify(record);
    assert.ok(!/SYNTHETIC_PRIVATE|PRIVATE_QUERY|PRIVATE_PROFILE|PRIVATE_REFERRER|PRIVATE_TITLE|PRIVATE_SEARCH/i.test(decodeURIComponent(text)), 'Private synthetic marker leaked into a runtime request.');
  }
  for (const e of events()) {
    assert.equal(e.params.tid, measurementId);
    if (e.params.dl) assert.ok(/^https:\/\/synthetic\.example\.test\/#\/(?:home|standings\/(?:drivers|codrivers)|rounds|round\/(?:graph|classification|stages)|crews|person|about|info|privacy|disclaimer)$/.test(e.params.dl), 'Runtime event must retain a category-only URL.');
    if (e.params.dt) assert.ok(/^(?:Home|Standings|Rounds|Round|Crews|Crew profile|Sources|Info|Privacy|Disclaimer) - Northern Regions Rally$/.test(e.params.dt), 'Runtime event must retain a fixed category title.');
    assert.ok(!e.params.dr, 'Runtime must not send a page referrer.');
    assert.ok(!e.headers.referer, 'Collector HTTP Referer must be suppressed.');
    assert.ok(!e.params.uid, 'No User-ID may be sent.');
  }
  for (const record of collectors) {
    const query = new URL(record.url).searchParams;
    for (const params of [query, ...record.body.split('\n').map(line => new URLSearchParams(line))]) {
      const location = params.get('dl');
      if (location) assert.ok(/^https:\/\/synthetic\.example\.test\/#\/(?:home|standings\/(?:drivers|codrivers)|rounds|round\/(?:graph|classification|stages)|crews|person|about|info|privacy|disclaimer)$/.test(location), 'Raw query/body location must be sanitized even if another field overrides it.');
      assert.ok(!params.get('dr'), 'Raw query/body referrer must be empty.');
      if (params.get('dt')) assert.ok(/^(?:Home|Standings|Rounds|Round|Crews|Crew profile|Sources|Info|Privacy|Disclaimer) - Northern Regions Rally$/.test(params.get('dt')), 'Raw query/body title must be fixed.');
    }
  }
  for (const record of scriptHeaders) assert.ok(!record.headers.referer);
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url.startsWith('https://www.googletagmanager.com/gtag/js?')) {
        assert.equal(new URL(url).searchParams.get('id'), measurementId);
        scriptHeaders.push({ url, headers: await req.allHeaders() });
        if (runtimeDelay) await new Promise(resolve => setTimeout(resolve, runtimeDelay));
        return route.fulfill({ contentType: 'text/javascript', body: runtime });
      }
      if (/^https:\/\/(?:www|region1)\.google-analytics\.com\/g\/collect/.test(url)) {
        collectors.push({ url, body: req.postData() || '', headers: await req.allHeaders(), method: req.method() });
        // Synthetic response, never route.continue/fetch: no collection leaves the browser.
        return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': base } });
      }
      if (url.startsWith('https://firestore.googleapis.com/')) {
        assert.ok(url.includes('/projects/nr-synthetic/'));
        assert.equal(req.method(), 'GET');
        const id = url.split('/public/')[1];
        const value = id === 'site' ? site : id === 'people' ? fixtures['data/people.json'] :
          id === 'season_2026' ? { season: fixtures['data/seasons/2026/season.json'], rounds: {} } : null;
        return route.fulfill({ status: value ? 200 : 404, headers: { 'Access-Control-Allow-Origin': base },
          contentType: 'application/json', body: JSON.stringify(value ? { fields: { json: { stringValue: JSON.stringify(value) } } } : {}) });
      }
      if (url.startsWith(base + '/')) {
        const pathname = new URL(url).pathname;
        if (pathname === '/referral.html') return route.fulfill({ contentType: 'text/html',
          body: '<a href="/index.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE#/2026/standings?search=PRIVATE_SEARCH">Visit synthetic archive</a>' });
        if (pathname === '/assets/firebase-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.NR_FIREBASE={projectId:"nr-synthetic"};' });
        if (pathname.startsWith('/admin/')) return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'admin', 'index.html'), 'utf8') });
        const file = path.resolve(repo, '.' + pathname);
        assert.ok(file.startsWith(repo + path.sep));
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ contentType: { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
      }
      external.push({ url, body: req.postData() || '', headers: await req.allHeaders() });
      return route.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused to|violates/.test(m.text())) csp.push(m.text()); });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', e => console.error('CSP violation: ' + e.blockedURI));
    });
    async function flush() {
      // The real tag batches collector traffic, including pagehide engagement events.
      await page.waitForTimeout(5500);
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await page.waitForTimeout(1500);
    }
    await page.goto(base + '/referral.html?PRIVATE_REFERRER=SYNTHETIC_PRIVATE');
    await page.getByRole('link').click();
    await page.waitForSelector('#main');
    assert.ok(await page.evaluate(() => document.referrer.includes('PRIVATE_REFERRER')), 'Fixture must exercise a real sensitive document.referrer.');
    await flush();
    console.log('Runtime initial event names:', events().map(e => e.params.en).join(', ') || '(none)');
    assert.equal(views().length, 1, 'Actual runtime must send exactly one initial manual pageview.');
    assertPrivateAbsent();
    const commands = await page.evaluate(() => window.dataLayer.filter(a => a[0]).map(a => Array.from(a)));
    assert.equal(commands.find(a => a[0] === 'config')[2].send_page_view, false);
    const globalIndex = commands.findIndex(a => a[0] === 'set');
    assert.ok(globalIndex >= 0 && globalIndex < commands.findIndex(a => a[0] === 'js'));
    assert.equal(commands[globalIndex][1].send_page_view, false);
    await page.evaluate(() => {
      document.title = 'PRIVATE_TITLE SYNTHETIC_PRIVATE';
      location.hash = '#/2026/standings?search=PRIVATE_SEARCH';
      history.replaceState(null, '', '?PRIVATE_QUERY=SYNTHETIC_PRIVATE#/2026/standings?search=PRIVATE_SEARCH');
      dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await flush();
    assert.equal(views().length, 1, 'Query/replaceState must not add pageviews with this runtime.');
    // Probe real SDK defaults explicitly; this is not a claim that the SDK auto-fired this event.
    const defaultEvents = events().length;
    await page.evaluate(id => window.gtag('event', 'user_engagement', { send_to: id }), measurementId);
    await flush();
    assert.ok(events().length > defaultEvents);
    assert.ok(events().some(e => e.params.en === 'user_engagement'));
    assertPrivateAbsent();
    for (const [hash, category] of [['#/person/PRIVATE_PROFILE_ONE?search=PRIVATE_SEARCH', 'person'],
      ['#/person/PRIVATE_PROFILE_TWO', 'person'], ['#/round/PRIVATE_PROFILE_ROUND/classification', 'round/classification'], ['#/info', 'info']]) {
      const n = views().length;
      await page.evaluate(h => location.hash = h, hash);
      await flush();
      assert.equal(views().length, n + 1);
      assert.equal(views().at(-1).params.dl, base + '/#/' + category);
      assertPrivateAbsent();
    }
    await page.evaluate(id => window.gtag('event', 'user_engagement', { send_to: id }), measurementId);
    await flush();
    assert.equal(events().filter(e => e.params.en === 'user_engagement').at(-1).params.dl, base + '/#/info',
      'Default events must follow the latest sanitized category, not the initial config.');
    assertPrivateAbsent();
    // Exercise enhancement-prone DOM interactions without navigating or sending real input.
    const beforeInteractions = events().length;
    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'https://outbound.example.test/PRIVATE_PROFILE?PRIVATE_QUERY=SYNTHETIC_PRIVATE';
      a.textContent = 'SYNTHETIC_PRIVATE';
      a.addEventListener('click', e => e.preventDefault());
      document.body.appendChild(a); a.click(); a.remove();
      const form = document.createElement('form'), input = document.createElement('input');
      input.name = 'search'; input.value = 'PRIVATE_SEARCH';
      form.appendChild(input); form.addEventListener('submit', e => e.preventDefault());
      document.body.appendChild(form); input.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit(); form.remove();
      scrollTo(0, document.documentElement.scrollHeight);
    });
    await flush(); assert.equal(events().length, beforeInteractions, 'Fake-container runtime should not enhance clicks, forms or scroll.');
    assertPrivateAbsent();
    const n = views().length;
    await page.evaluate(() => location.hash = '#/admin?PRIVATE_QUERY=SYNTHETIC_PRIVATE');
    await flush();
    assert.equal(views().length, n);
    assertPrivateAbsent();
    await page.goBack(); await flush(); assert.equal(views().length, n + 1);
    await page.goForward(); await flush(); assert.equal(views().length, n + 1);
    await page.goto(base + '/privacy.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE');
    await page.waitForSelector('#analyticsToggle'); await flush();
    assert.equal(views().length, n + 2);
    assert.equal(views().at(-1).params.dl, base + '/#/privacy');
    assertPrivateAbsent();
    const beforeDisclaimer = views().length;
    await page.goto(base + '/disclaimer.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE'); await flush();
    assert.equal(views().length, beforeDisclaimer + 1);
    assert.equal(views().at(-1).params.dl, base + '/#/disclaimer');
    await page.goto(base + '/privacy.html'); await flush(); assertPrivateAbsent();
    runtimeDelay = 800;
    const pendingViews = views().length;
    await page.goto(base + '/index.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE#/info', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('script[src*="googletagmanager"]'));
    await page.evaluate(() => location.hash = '#/admin?PRIVATE_QUERY=SYNTHETIC_PRIVATE');
    await flush(); assert.equal(views().length, pendingViews, 'A pending container must stay disabled on an excluded route.');
    assertPrivateAbsent();
    await page.evaluate(() => location.hash = '#/info'); await flush();
    assert.equal(views().length, pendingViews + 1);
    assertPrivateAbsent();
    runtimeDelay = 0;
    await page.goto(base + '/privacy.html'); await flush();
    runtimeDelay = 800;
    const pendingOptOut = collectors.length;
    await page.goto(base + '/privacy.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('script[src*="googletagmanager"]'));
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Turn off analytics' }).click()]);
    await flush();
    assert.equal(collectors.length, pendingOptOut, 'Opt-out before container execution must not allow automatic initialization traffic.');
    runtimeDelay = 0;
    const optedOut = collectors.length, tagCount = scriptHeaders.length;
    assert.equal((await ctx.cookies()).filter(c => /^_ga/.test(c.name)).length, 0);
    await page.goto(base + '/index.html?PRIVATE_QUERY=SYNTHETIC_PRIVATE#/info');
    await flush();
    assert.equal(collectors.length, optedOut); assert.equal(scriptHeaders.length, tagCount);
    assertPrivateAbsent();
    assert.deepEqual(errors, []);
    assert.deepEqual(csp, [], 'Actual runtime must not require additional CSP permissions.');
    assert.deepEqual(external, [], 'Unknown runtime destinations must be assessed, not allowed silently.');
    console.log('PASS actual Google runtime: initial/manual/query/profile/round/privacy pageviews, category payloads, HTTP referrer suppression, opt-out/cookies; collector traffic fully intercepted.');
    console.log('Actual event names observed:', [...new Set(events().map(e => e.params.en))].join(', '));
    console.log('Runtime snapshot SHA256:', require('node:crypto').createHash('sha256').update(runtime).digest('hex'));
    console.log('Initial first-visit/session flags:', JSON.stringify({ firstVisit: events()[0].params._fv, sessionStart: events()[0].params._ss }));
  } finally { await browser.close(); }
}
main().catch(e => {
  console.error(e);
  console.error('Observed event summary:', events().map(e => ({ event: e.params.en, location: e.params.dl, referrer: e.params.dr })));
  console.error('Raw location fields:', collectors.map(r => ({ query: new URL(r.url).searchParams.get('dl'),
    body: r.body.split('\n').map(line => new URLSearchParams(line).get('dl')) })));
  console.error('CSP issues:', csp);
  console.error('Other blocked destinations:', external.map(e => new URL(e.url).origin + new URL(e.url).pathname));
  process.exitCode = 1;
});
