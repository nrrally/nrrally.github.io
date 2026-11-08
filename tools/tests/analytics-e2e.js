/* Synthetic settings, authentication, Google tag and collection only; no live requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const repo = path.resolve(__dirname, '..', '..');
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const store = new Map(), unexpected = [], errors = [], warnings = [], hits = [], tags = [];
const measurementId = 'G-' + 'A'.repeat(10), secondId = 'G-' + 'B'.repeat(10);
const config = () => ({ enabled: true, measurementId });
let clock = 0, commits = 0, tagFailure = false, tagDelay = 0, siteFailure = false, seasonFailure = false, legacyEngine = false;
function set(key, fields) {
  store.set(key, { name: prefix + key, fields, updateTime: new Date(Date.UTC(2027, 0, 1, 0, 0, ++clock)).toISOString() });
}
function put(key, value) { set(key, { json: { stringValue: JSON.stringify(value) } }); }
function json(key) { const d = store.get(key); return d && JSON.parse(d.fields.json.stringValue); }
const fixtures = F.docs();
for (const [p, value] of Object.entries(fixtures)) {
  const m = p.match(/seasons\/(\d+)\/(?:(?:rounds\/(.+))|season)\.json/);
  const id = p === 'data/site.json' ? 'site' : p === 'data/people.json' ? 'people' : m[2] ? 'round_' + m[1] + '_' + m[2] : 'season_' + m[1];
  put('docs/' + id, value);
}
put('public/site', fixtures['data/site.json']); put('public/people', fixtures['data/people.json']);
put('public/season_2026', { season: fixtures['data/seasons/2026/season.json'], rounds: {} });
set('config/admins', { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } });
set('config/revision', { n: { integerValue: '1' } });
function handle(req) {
  const rel = new URL(req.url()).pathname.split('/documents')[1], key = rel.slice(1);
  if (req.method() === 'GET') {
    if (siteFailure && key === 'public/site' || seasonFailure && key === 'public/season_2026') return [503, {}];
    if (!key.includes('/')) {
      const documents = [...store.entries()].filter(([k]) => k.startsWith(key + '/')).map(([, v]) => v);
      if (key === 'history') documents.sort((a, b) => b.fields.at.stringValue.localeCompare(a.fields.at.stringValue));
      return [200, { documents }];
    }
    return store.has(key) ? [200, store.get(key)] : [404, {}];
  }
  assert.equal(req.method(), 'POST'); assert.equal(rel, ':commit');
  const body = JSON.parse(req.postData());
  for (const w of body.writes) {
    const key = (w.update ? w.update.name : w.delete).slice(prefix.length), prior = store.get(key), pre = w.currentDocument;
    if (pre && (pre.exists === false && prior || pre.updateTime && (!prior || prior.updateTime !== pre.updateTime))) {
      return [409, { error: { status: 'FAILED_PRECONDITION', message: 'Synthetic conflict' } }];
    }
  }
  commits++;
  return [200, { writeResults: body.writes.map(w => {
    const key = (w.update ? w.update.name : w.delete).slice(prefix.length);
    if (w.update) set(key, w.update.fields); else store.delete(key);
    return { updateTime: store.has(key) ? store.get(key).updateTime : new Date().toISOString() };
  }) }];
}
const mockTag = `
  const layer = window.dataLayer;
  const globals = {};
  const tagId = new URL(document.currentScript.src).searchParams.get('id');
  window.NR_TEST_GA_PRELOAD = layer.map(args => Array.from(args));
  function process(args) {
    if (args[0] === 'set') Object.assign(globals, args[1]);
    if (args[0] === 'config') {
      if (args[2].send_page_view !== false) throw new Error('Automatic pageviews not suppressed');
      document.cookie = '_ga=synthetic; path=/';
      document.cookie = '_ga_SYNTHETIC=synthetic; path=/';
    }
    if (args[0] === 'event' && !window['ga-disable-' + args[2].send_to]) {
      fetch('https://www.google-analytics.com/g/collect', {method:'POST',body:JSON.stringify({event:args[1],...args[2]})});
    }
  }
  layer.forEach(process);
  // Real configured containers can auto-initialize independently of the queued per-stream config.
  // Global suppression must already be queued when the tag executes.
  if (globals.send_page_view !== false && !window['ga-disable-' + tagId]) {
    fetch('https://www.google-analytics.com/g/collect', {method:'POST',body:JSON.stringify({
      event:'page_view',page_location:location.href,page_referrer:document.referrer,page_title:document.title
    })});
  }
  layer.push = function(args) { const n = Array.prototype.push.call(layer,args); process(args); return n; };
`;
async function main() {
  const server = http.createServer((req, res) => {
    const file = path.resolve(repo, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    async function context(options = {}) {
      const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, ...options });
      await ctx.addInitScript(`window.NR_TEST_AUTH = {
        ready: () => Promise.resolve(), user: () => ({email:'admin@example.com',name:'Synthetic Admin',photo:''}),
        token: () => Promise.resolve('fake:admin@example.com'), signOut: () => Promise.resolve()
      };`);
      await ctx.route('**/*', async route => {
        const req = route.request(), url = req.url();
        if (url === base + '/assets/firebase-config.js') return route.fulfill({ contentType: 'text/javascript',
          body: 'window.NR_FIREBASE={projectId:"nr-synthetic",apiKey:"fake",authDomain:"nr-synthetic.firebaseapp.com"};' });
        if (legacyEngine && url.startsWith(base + '/assets/engine.js')) return route.fulfill({ contentType: 'text/javascript',
          body: fs.readFileSync(path.join(repo, 'assets', 'engine.js'), 'utf8') + '\ndelete window.NREngine.analyticsContractVersion;' });
        if (url.startsWith(base + '/')) return route.continue();
        if (url.startsWith('https://www.googletagmanager.com/gtag/js?')) {
          tags.push(url);
          if (tagDelay) await new Promise(resolve => setTimeout(resolve, tagDelay));
          if (tagFailure) return route.abort();
          return route.fulfill({ contentType: 'text/javascript', body: mockTag });
        }
        if (url === 'https://www.google-analytics.com/g/collect') {
          hits.push(JSON.parse(req.postData()));
          return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        if (url.startsWith('https://firestore.googleapis.com/')) {
          assert.ok(url.includes('/projects/nr-synthetic/'));
          const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
          if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          const [status, body] = handle(req);
          return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
        }
        unexpected.push(url); return route.abort();
      });
      ctx.on('page', p => {
        p.on('pageerror', e => errors.push(e.message));
        p.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
        p.on('dialog', d => d.accept());
      });
      return ctx;
    }
    const ctx = await context(), page = await ctx.newPage(), admin = await ctx.newPage();
    let visits = 0;
    const visit = async (url = '/index.html#/') => {
      const target = new URL(base + url); target.searchParams.set('__syntheticVisit', ++visits);
      await page.goto(target.href); await page.waitForSelector('#main'); await page.waitForTimeout(100);
    };
    const go = async hash => { await admin.evaluate(h => location.hash = h, hash); await admin.waitForTimeout(100); };
    const published = () => admin.getByRole('heading', { name: 'Nothing to publish' }).waitFor();
    const publish = async () => { await go('#/publish'); await admin.click('#pubGo'); await published(); };
    const waitHits = n => page.waitForFunction(() => window.dataLayer && window.dataLayer.filter(a => a[0] === 'event').length >= 1)
      .then(async () => { for (let i = 0; i < 50 && hits.length < n; i++) await page.waitForTimeout(20); assert.equal(hits.length, n); });
    const setPublic = analytics => { const site = json('public/site'); if (analytics === undefined) delete site.analytics; else site.analytics = analytics; put('public/site', site); };
    // Default and disabled/unconfigured states never request the Google script or collection.
    await visit(); await visit('/privacy.html'); assert.equal(tags.length, 0);
    for (const cfg of [{ enabled: false, measurementId: '' }, { enabled: false, measurementId }, { enabled: true, measurementId: '' },
      { enabled: true, measurementId: measurementId + '\n' }, { enabled: true, measurementId: '<img src=x>' }]) {
      setPublic(cfg); await visit(); await visit('/privacy.html'); assert.equal(tags.length, 0);
      assert.equal(await page.locator('img[src=x]').count(), 0);
    }
    setPublic(undefined);
    // Manual admin editing stays staged; invalid IDs block publication without unsafe attributes.
    await admin.goto(base + '/admin/index.html'); await admin.waitForSelector('.adm-main h1'); await go('#/site');
    assert.equal(await admin.isChecked('#analyticsEnabled'), false);
    await go('#/publish'); await published(); await go('#/site');
    await admin.check('#analyticsEnabled'); await admin.fill('#analyticsMeasurementId', 'UA-123-1');
    await go('#/publish'); assert.ok(await admin.isDisabled('#pubGo')); assert.equal(commits, 0);
    await go('#/site'); await admin.fill('#analyticsMeasurementId', measurementId);
    await visit(); assert.equal(tags.length, 0);
    await publish(); assert.equal(commits, 1);
    assert.deepEqual(json('docs/site').analytics, config()); assert.deepEqual(json('public/site').analytics, config());
    assert.ok([...store.entries()].some(([k,v]) => k.startsWith('history/') && v.fields.by.stringValue === 'admin@example.com' &&
      v.fields.path.stringValue === 'data/site.json' && JSON.parse(v.fields.after.stringValue).analytics.enabled));
    // One initial view; queries, searches, titles, IDs and referrers never enter Google payloads.
    await visit('/index.html?email=private@example.com#/2026/standings?search=Private+Name');
    await waitHits(1); assert.equal(tags.length, 1);
    assert.equal(hits[0].page_location, base + '/#/standings/drivers');
    assert.equal(hits[0].page_title, 'Standings - Northern Regions Rally'); assert.equal(hits[0].page_referrer, '');
    const commands = await page.evaluate(() => window.dataLayer.map(a => Array.from(a)));
    const preload = await page.evaluate(() => window.NR_TEST_GA_PRELOAD);
    const globalIndex = preload.findIndex(a => a[0] === 'set');
    assert.ok(globalIndex >= 0 && globalIndex < preload.findIndex(a => a[0] === 'js'));
    assert.ok(globalIndex < preload.findIndex(a => a[0] === 'config'));
    assert.equal(preload[globalIndex][1].send_page_view, false);
    assert.equal(preload[globalIndex][1].page_location, base + '/#/standings/drivers');
    assert.equal(preload[globalIndex][1].page_referrer, '');
    const cfg = commands.find(a => a[0] === 'config')[2];
    assert.equal(cfg.send_page_view, false); assert.equal(cfg.allow_google_signals, false);
    assert.equal(Object.prototype.hasOwnProperty.call(cfg, 'page_location'), false, 'Per-stream config must not pin the initial category over later global context.');
    assert.equal(cfg.allow_ad_personalization_signals, false); assert.equal(cfg.cookie_expires, 31536000);
    const consent = commands.find(a => a[0] === 'consent')[2]; assert.equal(consent.ad_storage, 'denied');
    assert.equal(Object.prototype.hasOwnProperty.call(consent, 'analytics_storage'), false);
    await page.evaluate(() => { document.title = 'Private Name'; location.hash = '#/2026/standings?search=AnotherSecret'; });
    await page.waitForTimeout(100); assert.equal(hits.length, 1);
    await page.evaluate(() => { history.replaceState(null, '', '#/2026/standings?search=SecretThree'); dispatchEvent(new HashChangeEvent('hashchange')); });
    await page.waitForTimeout(100); assert.equal(hits.length, 1);
    for (const [hash, category] of [['#/2026/standings/codrivers', 'standings/codrivers'], ['#/round/secret-round/classification?query=Hidden', 'round/classification'],
      ['#/person/private-person', 'person'], ['#/person/other-private-person', 'person'],
      ['#/getting-started', 'getting-started'], ['#/getting-started/secret-topic?email=Hidden', 'getting-started'],
      ['#/info', 'info']]) {
      const count = hits.length; await page.evaluate(h => location.hash = h, hash); await waitHits(count + 1);
      assert.equal(hits.at(-1).page_location, base + '/#/' + category);
      if (category === 'getting-started') assert.equal(hits.at(-1).page_title, 'Getting started - Northern Regions Rally');
    }
    assert.ok(await page.locator('main a[href="privacy.html"]').isVisible());
    assert.ok(await page.locator('footer a[href="privacy.html"]').isVisible());
    const beforePrivate = hits.length;
    for (const hash of ['#/admin?email=private@example.com', '#/auth/private-user', '#/unknown?search=secret']) {
      await page.evaluate(h => location.hash = h, hash); await page.waitForTimeout(100);
    }
    assert.equal(hits.length, beforePrivate);
    await page.evaluate(() => location.hash = '#/info'); await waitHits(beforePrivate + 1);
    assert.equal(await page.evaluate(() => window.dataLayer.filter(a => a[0] === 'set').at(-1)[1].page_location), base + '/#/info');
    const beforeBack = hits.length; await page.goBack(); await page.waitForTimeout(100); assert.equal(hits.length, beforeBack);
    await page.goForward(); await waitHits(beforeBack + 1);
    assert.ok(!/Private|private|Secret|secret|Hidden|email=|search=/.test(JSON.stringify(hits)));
    assert.equal(tags.length, 1);
    const beforeSeasons = hits.length;
    await page.evaluate(() => { window.NRAnalytics.page([], 2026); window.NRAnalytics.page([], 2026); window.NRAnalytics.page([], 2027); });
    await waitHits(beforeSeasons + 2);
    assert.equal(hits.at(-1).page_location, base + '/#/home');
    // Privacy page has no modal, works on small screens, and owns the reversible opt-out.
    const beforePrivacy = hits.length;
    await visit('/privacy.html?email=private@example.com'); await waitHits(beforePrivacy + 1);
    assert.equal(hits.at(-1).page_location, base + '/#/privacy');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 600 });
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        assert.ok(await page.getByRole('button', { name: 'Turn off analytics' }).isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Turn off analytics' }).click()]);
    await page.waitForSelector('#analyticsStatus'); assert.ok((await page.innerText('#analyticsStatus')).includes('off in this browser'));
    const afterOptOut = hits.length, afterTags = tags.length;
    assert.equal((await ctx.cookies()).filter(c => /^_ga/.test(c.name)).length, 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('nr-analytics-choice')), 'off');
    await visit(); await page.evaluate(() => location.hash = '#/info'); await page.waitForTimeout(100);
    await visit('/disclaimer.html'); assert.equal(hits.length, afterOptOut); assert.equal(tags.length, afterTags);
    const sibling = await ctx.newPage(); await sibling.goto(base + '/index.html'); await sibling.waitForSelector('#main');
    assert.equal(tags.length, afterTags); await sibling.close();
    await visit('/privacy.html');
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Allow analytics' }).click()]);
    await page.waitForTimeout(100); assert.equal(hits.length, afterOptOut + 1);
    // Storage event propagates opt-out to an already-running tab and unloads the runtime.
    const other = await ctx.newPage(); await other.goto(base + '/index.html'); await other.waitForSelector('#main');
    await other.waitForTimeout(100); const beforeCross = hits.length;
    await page.evaluate(() => localStorage.setItem('nr-analytics-choice', 'off'));
    await other.waitForTimeout(200); await other.evaluate(() => location.hash = '#/info'); await other.waitForTimeout(100);
    assert.equal(hits.length, beforeCross); assert.equal(await other.evaluate(() => !!window.gtag), false); await other.close();
    await page.evaluate(() => localStorage.removeItem('nr-analytics-choice'));
    // Failed tag does not block results, retry navigation or the active-rally notice.
    tagFailure = true; const active = json('public/site');
    active.activeRally = { enabled: true, name: 'Synthetic Rally', url: 'https://nrcsa.co.za/', activationId: 'synthetic-activation' }; put('public/site', active);
    const failureHits = hits.length; await visit(); await page.locator('dialog[open]').waitFor();
    await page.getByRole('button', { name: 'View past results' }).click(); await page.evaluate(() => location.hash = '#/info');
    await page.waitForTimeout(100); assert.ok(await page.locator('#main').isVisible()); assert.equal(hits.length, failureHits);
    await visit('/privacy.html'); assert.ok((await page.innerText('#analyticsStatus')).includes('unavailable')); tagFailure = false;
    delete active.activeRally; put('public/site', active);
    // Opt-out while the external tag is pending prevents any config/pageview after its arrival.
    tagDelay = 500;
    await page.goto(base + '/privacy.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('script[src^="https://www.googletagmanager.com"]'));
    const raceHits = hits.length;
    await page.getByRole('button', { name: 'Turn off analytics' }).click(); await page.waitForTimeout(650);
    assert.equal(hits.length, raceHits); tagDelay = 0;
    await page.evaluate(() => localStorage.removeItem('nr-analytics-choice'));
    tagDelay = 500;
    const pendingHits = hits.length;
    await page.goto(base + '/index.html#/info', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('script[src^="https://www.googletagmanager.com"]'));
    await page.evaluate(() => location.hash = '#/admin');
    await page.waitForTimeout(600); assert.equal(hits.length, pendingHits);
    await page.evaluate(() => location.hash = '#/info'); await waitHits(pendingHits + 1);
    tagDelay = 0;
    // Storage denial fails closed and remains a visible warning, including failed preference writes.
    const denied = await context(); await denied.addInitScript(`Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Synthetic storage denied'); };`);
    const deniedPage = await denied.newPage(), deniedTags = tags.length;
    await deniedPage.goto(base + '/privacy.html'); await deniedPage.waitForSelector('#analyticsStatus');
    assert.ok((await deniedPage.innerText('#analyticsStatus')).includes('cannot save'));
    await deniedPage.getByRole('button', { name: 'Allow analytics' }).click(); assert.equal(tags.length, deniedTags); await denied.close();
    const writeDenied = await context(), writeDeniedPage = await writeDenied.newPage();
    await writeDeniedPage.goto(base + '/privacy.html'); await writeDeniedPage.waitForFunction(() => !!window.gtag);
    await writeDeniedPage.waitForTimeout(100);
    await writeDeniedPage.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Synthetic write denied'); }; });
    const writeDeniedHits = hits.length;
    await writeDeniedPage.getByRole('button', { name: 'Turn off analytics' }).click();
    assert.ok((await writeDeniedPage.innerText('#analyticsStatus')).includes('off on this page'));
    assert.equal(await writeDeniedPage.evaluate(id => window['ga-disable-' + id], measurementId), true);
    assert.equal((await writeDenied.cookies()).filter(c => /^_ga/.test(c.name)).length, 0);
    await writeDeniedPage.evaluate(() => window.NRAnalytics.page(['info']));
    await writeDeniedPage.waitForTimeout(100); assert.equal(hits.length, writeDeniedHits); await writeDenied.close();
    // No-JS disclosure remains readable; missing/failed public settings produce no Google traffic.
    const noJS = await context({ javaScriptEnabled: false }), staticPage = await noJS.newPage();
    await staticPage.goto(base + '/privacy.html'); assert.ok(await staticPage.getByRole('heading', { name: 'Privacy & analytics', exact: true }).isVisible()); await noJS.close();
    await page.evaluate(() => localStorage.removeItem('nr-analytics-choice'));
    const excludedTags = tags.length;
    for (const url of ['/index.html#/admin', '/index.html#/auth/private-user', '/index.html#/unknown?search=Private']) {
      await visit(url); assert.equal(tags.length, excludedTags);
    }
    siteFailure = true; const failedTags = tags.length; await visit('/privacy.html'); await visit();
    assert.equal(tags.length, failedTags); siteFailure = false;
    seasonFailure = true; await visit(); assert.ok(await page.getByRole('heading', { name: 'Results are temporarily unavailable' }).isVisible()); seasonFailure = false;
    // Disable, update ID, backup and undo all follow the same whole-site atomic workflow.
    await go('#/site'); await admin.uncheck('#analyticsEnabled'); await publish();
    assert.equal(json('public/site').analytics.enabled, false);
    const disabledTags = tags.length; await visit(); assert.equal(tags.length, disabledTags);
    await go('#/site'); await admin.fill('#analyticsMeasurementId', secondId); await admin.check('#analyticsEnabled'); await publish();
    assert.equal(json('public/site').analytics.measurementId, secondId);
    await visit(); assert.ok(tags.at(-1).endsWith(secondId));
    await go('#/');
    const [download] = await Promise.all([admin.waitForEvent('download'), admin.getByText('Download a backup', { exact: true }).click()]);
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(backup.docs['data/site.json'].analytics, json('docs/site').analytics);
    await go('#/import'); await admin.locator('input[type=file]').first().setInputFiles({ name: 'synthetic-backup.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'nr-rally-backup', version: 1, docs: fixtures, photos: {} })) });
    await admin.waitForSelector('#pubGo'); assert.ok(json('public/site').analytics);
    await admin.click('#pubGo'); await published(); assert.equal(json('public/site').analytics, undefined);
    await go('#/history'); await admin.locator('tbody tr').first().getByRole('button', { name: 'Undo', exact: true }).click();
    await admin.waitForSelector('#pubGo'); assert.equal(json('public/site').analytics, undefined);
    await admin.click('#pubGo'); await published(); assert.deepEqual(json('public/site').analytics, backup.docs['data/site.json'].analytics);
    // Same-site edits conflict; unrelated edits retain the latest analytics; invalid rebase is refused.
    await go('#/site'); await admin.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Synthetic tagline');
    const concurrent = json('docs/site'); concurrent.analytics.enabled = false; put('docs/site', concurrent); set('config/revision', { n: { integerValue: '30' } });
    await go('#/publish'); await admin.click('#pubGo'); await admin.waitForSelector('#reloadBtn'); assert.equal(json('docs/site').analytics.enabled, false);
    await admin.click('#reloadBtn'); await published();
    await go('#/season'); await admin.getByText('Championship name', { exact: true }).locator('..').locator('input').fill('Synthetic season draft');
    concurrent.analytics = config(); put('docs/site', concurrent); set('config/revision', { n: { integerValue: '31' } });
    await publish(); assert.deepEqual(json('public/site').analytics, config());
    await go('#/season'); await admin.getByText('Championship name', { exact: true }).locator('..').locator('input').fill('Another synthetic season draft');
    concurrent.analytics.measurementId = 'malformed'; put('docs/site', concurrent); set('config/revision', { n: { integerValue: '32' } });
    const beforeInvalid = commits; await go('#/publish'); await admin.click('#pubGo');
    await admin.locator('.toast.bad').filter({ hasText: 'Analytics needs' }).waitFor(); assert.equal(commits, beforeInvalid);
    assert.deepEqual(json('public/site').analytics, config()); concurrent.analytics = config(); put('docs/site', concurrent);
    legacyEngine = true; await admin.reload(); await admin.waitForSelector('.adm-main h1');
    await go('#/site'); await admin.fill('#analyticsMeasurementId', secondId); await go('#/publish');
    assert.ok(await admin.isDisabled('#pubGo')); assert.ok((await admin.innerText('main')).includes('Analytics scripts are missing or out of date'));
    assert.equal(await admin.locator('script[src*="googletagmanager"]').count(), 0);
    assert.ok(warnings.some(w => w.includes('could not load'))); assert.ok(warnings.some(w => w.includes('storage is unavailable')));
    assert.ok(!warnings.join(' ').includes(measurementId)); assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    console.log('PASS GA4: staged/atomic settings, validation, ID update, History, backup/restore/undo/rebase; manual sanitized views, no duplicate/search/admin tracking; dedicated privacy, reversible and cross-tab opt-out, cookies, race/failure/storage/no-JS and 320px layouts. All Google/Firebase calls mocked.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
