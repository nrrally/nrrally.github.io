/* Synthetic-only database, auth and publication. All external traffic is intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const repo = path.resolve(__dirname, '..', '..');
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const store = new Map(), unexpected = [], errors = [], warnings = [];
let clock = 0, commits = 0, unavailable = '', delay = 0, legacyEngine = false;
function set(key, fields) {
  store.set(key, { name: prefix + key, fields, updateTime: new Date(Date.UTC(2027, 0, 1, 0, 0, ++clock)).toISOString() });
}
function put(key, value) { set(key, { json: { stringValue: JSON.stringify(value) } }); }
function json(key) { const d = store.get(key); return d && JSON.parse(d.fields.json.stringValue); }
function id(p) {
  if (p === 'data/site.json') return 'site';
  if (p === 'data/people.json') return 'people';
  const m = p.match(/seasons\/(\d+)\/(?:(?:rounds\/(.+))|season)\.json/);
  return m[2] ? 'round_' + m[1] + '_' + m[2] : 'season_' + m[1];
}
const fixtures = F.docs();
for (const [p, value] of Object.entries(fixtures)) put('docs/' + id(p), value);
put('public/site', fixtures['data/site.json']); put('public/people', fixtures['data/people.json']);
put('public/season_2026', { season: fixtures['data/seasons/2026/season.json'], rounds: {} });
set('config/admins', { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } });
set('config/revision', { n: { integerValue: '1' } });
function handle(method, url, body) {
  const rel = new URL(url).pathname.split('/documents')[1], key = rel.slice(1);
  if (method === 'GET') {
    if (!key.includes('/')) {
      const documents = [...store.entries()].filter(([k]) => k.startsWith(key + '/')).map(([, v]) => v);
      if (key === 'history') documents.sort((a, b) => b.fields.at.stringValue.localeCompare(a.fields.at.stringValue));
      return [200, { documents }];
    }
    return store.has(key) ? [200, store.get(key)] : [404, {}];
  }
  assert.equal(method, 'POST'); assert.equal(rel, ':commit');
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
async function main() {
  const server = http.createServer((req, res) => {
    const file = path.resolve(repo, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
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
          body: fs.readFileSync(path.join(repo, 'assets', 'engine.js'), 'utf8') + '\ndelete window.NREngine.rallyNoticeContractVersion;' });
        if (url.startsWith(base + '/')) return route.continue();
        if (url.startsWith('https://firestore.googleapis.com/')) {
          assert.ok(url.includes('/projects/nr-synthetic/'));
          const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
          if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (delay && url.endsWith('/public/season_2026')) await new Promise(resolve => setTimeout(resolve, delay));
          const [status, body] = unavailable && url.endsWith('/public/' + unavailable) ? [503, {}] :
            handle(req.method(), url, req.postData() ? JSON.parse(req.postData()) : null);
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
    const ctx = await context(), admin = await ctx.newPage(), page = await ctx.newPage();
    const go = async hash => { await admin.evaluate(h => location.hash = h, hash); await admin.waitForTimeout(100); };
    const published = () => admin.getByRole('heading', { name: 'Nothing to publish' }).waitFor();
    const publish = async () => { await go('#/publish'); await admin.click('#pubGo'); await published(); };
    const visit = async hash => { await page.goto(base + '/index.html' + hash); await page.reload(); await page.waitForSelector('#main'); };
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const open = () => page.locator('dialog.rally-notice[open]');
    await visit('#/');
    assert.equal(await page.locator('.rally-reminder, .rally-notice').count(), 0);
    await admin.goto(base + '/admin/index.html'); await admin.waitForSelector('.adm-main h1');
    await go('#/site'); await admin.waitForSelector('#activeRallyEnabled');
    assert.equal(await admin.isChecked('#activeRallyEnabled'), false);
    await go('#/publish'); assert.ok((await admin.innerText('main')).includes('Nothing to publish'));
    await go('#/site');
    await admin.fill('#activeRallyName', 'Synthetic Rally');
    await admin.fill('#activeRallyUrl', 'https://nrcsa.co.za/events/synthetic?year=2027#entries');
    await admin.check('#activeRallyEnabled');
    assert.equal(commits, 0);
    await visit('#/'); assert.equal(await open().count(), 0);
    await publish();
    assert.equal(commits, 1);
    const active = json('docs/site').activeRally;
    assert.deepEqual(json('public/site').activeRally, active);
    assert.equal(active.enabled, true);
    assert.ok([...store.entries()].some(([k, v]) => k.startsWith('history/') && v.fields.path.stringValue === 'data/site.json' &&
      v.fields.by.stringValue === 'admin@example.com' && JSON.parse(v.fields.after.stringValue).activeRally.enabled));
    await go('#/site');
    await admin.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Synthetic unrelated site edit');
    await publish(); assert.equal(json('docs/site').activeRally.activationId, active.activationId);
    await visit('#/standings');
    await open().waitFor();
    assert.equal(await open().locator('h1').innerText(), 'Synthetic Rally is currently active.');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'rally-official');
    assert.equal(await open().locator('.rally-official').getAttribute('href'), active.url);
    // Native modal focus cannot escape to the underlying archive.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      assert.ok(await page.evaluate(() => document.activeElement.closest('dialog') !== null));
    }
    await open().getByRole('button', { name: 'View past results' }).click();
    assert.equal(await open().count(), 0); assert.ok(await page.locator('.rally-reminder').isVisible());
    assert.ok(await page.evaluate(() => document.activeElement.closest('.rally-reminder') !== null));
    for (const hash of ['#/', '#/standings', '#/standings/codrivers', '#/rounds', '#/round/missing',
      '#/crews', '#/person/missing', '#/info', '#/about', '#/missing']) {
      await page.evaluate(h => location.hash = h, hash);
      assert.ok(await page.locator('.rally-reminder').isVisible()); assert.equal(await open().count(), 0);
    }
    await page.reload(); await page.waitForSelector('#main'); assert.equal(await open().count(), 0);
    await page.goto(base + '/disclaimer.html');
    assert.ok(await page.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    assert.ok(await page.locator('.rally-reminder').isVisible()); assert.equal(await open().count(), 0);
    await visit('#/'); assert.equal(await open().count(), 0);
    const fresh = await context(), newVisit = await fresh.newPage();
    await newVisit.goto(base + '/index.html'); await newVisit.locator('dialog[open]').waitFor();
    await newVisit.locator('dialog[open] a[href="disclaimer.html"]').click();
    assert.ok(await newVisit.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    assert.equal(await newVisit.locator('dialog[open]').count(), 0);
    await newVisit.goto(base + '/index.html'); await newVisit.locator('dialog[open]').waitFor();
    await fresh.close();
    // Full notice and reminder are usable at 320 px, either theme, and a short viewport.
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 600 });
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        await page.locator('.rally-reminder button').click();
        assert.ok(await open().isVisible()); await noOverflow();
        assert.equal(await open().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 223, 72)');
        assert.ok(await open().evaluate(el => el.scrollWidth <= el.clientWidth));
        const contrast = await open().locator('.rally-official').evaluate(el => {
          const style = getComputedStyle(el);
          function luminance(color) {
            const c = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
              v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
            });
            return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
          }
          const a = luminance(style.color), b = luminance(style.backgroundColor);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        });
        assert.ok(contrast >= 4.5);
        await page.keyboard.press('Escape'); assert.equal(await open().count(), 0); await noOverflow();
      }
    }
    if (process.env.RALLY_SCREENSHOT_DIR) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('.rally-reminder button').click();
      await page.screenshot({ path: path.join(process.env.RALLY_SCREENSHOT_DIR, 'rally-notice-desktop.png') });
      await page.setViewportSize({ width: 320, height: 700 });
      await page.screenshot({ path: path.join(process.env.RALLY_SCREENSHOT_DIR, 'rally-notice-mobile.png') });
      await page.keyboard.press('Escape');
      await page.screenshot({ path: path.join(process.env.RALLY_SCREENSHOT_DIR, 'rally-reminder-mobile.png') });
    }
    await page.locator('.rally-reminder button').click();
    await page.emulateMedia({ media: 'print' });
    assert.ok(await page.locator('.site-disclosure').isVisible());
    assert.ok(await page.locator('.rally-reminder').isVisible());
    assert.equal(await open().isVisible(), false);
    await page.emulateMedia({ media: 'screen' });
    await page.keyboard.press('Escape');
    // Settings load independently of slow, failed, missing seasons and failed people.
    unavailable = 'season_2026'; await visit('#/'); assert.ok(await page.locator('.rally-reminder').isVisible());
    await page.getByRole('heading', { name: 'Results are temporarily unavailable' }).waitFor();
    unavailable = 'people'; await visit('#/'); assert.ok(await page.locator('.rally-reminder').isVisible());
    unavailable = ''; const seasonBundle = json('public/season_2026'); store.delete('public/season_2026');
    await visit('#/'); await page.getByRole('heading', { name: 'Results coming soon' }).waitFor();
    assert.ok(await page.locator('.rally-reminder').isVisible()); put('public/season_2026', seasonBundle);
    delay = 400;
    await page.evaluate(() => sessionStorage.removeItem('nr-active-rally-bypass'));
    await page.goto(base + '/index.html'); await open().waitFor(); delay = 0;
    await page.keyboard.press('Escape');
    // Rename/destination edits reset bypass; disable/re-enable also gets a new activation.
    await go('#/site'); await admin.fill('#activeRallyName', 'Another Synthetic Rally'); await publish();
    await visit('#/'); await open().waitFor(); await page.keyboard.press('Escape');
    await go('#/site'); await admin.fill('#activeRallyUrl', 'https://www.nrcsa.co.za/'); await publish();
    await visit('#/'); await open().waitFor(); await page.keyboard.press('Escape');
    const priorId = json('docs/site').activeRally.activationId;
    await go('#/site'); await admin.uncheck('#activeRallyEnabled'); await publish();
    await go('#/site'); await admin.check('#activeRallyEnabled'); await publish();
    assert.notEqual(json('docs/site').activeRally.activationId, priorId);
    await visit('#/'); await open().waitFor(); await page.keyboard.press('Escape');
    // Invalid destination blocks the publish button and writes nothing.
    await go('#/site'); await admin.fill('#activeRallyUrl', 'https://evil.example/');
    await go('#/publish'); assert.ok(await admin.isDisabled('#pubGo'));
    await admin.click('#discardBtn'); await admin.getByRole('heading', { name: 'Nothing to publish' }).waitFor();
    // Backup preserves settings; restoring an older backup removes them only through publish.
    await go('#/publish');
    await go('#/');
    const [download] = await Promise.all([admin.waitForEvent('download'), admin.getByText('Download a backup', { exact: true }).click()]);
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(backup.docs['data/site.json'].activeRally, json('docs/site').activeRally);
    await go('#/import');
    await admin.locator('input[type=file]').first().setInputFiles({ name: 'synthetic-backup.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'nr-rally-backup', version: 1, docs: fixtures, photos: {} })) });
    await admin.waitForSelector('#pubGo');
    const beforeRestore = commits; await admin.click('#pubGo'); await published();
    assert.equal(commits, beforeRestore + 1); assert.equal(json('public/site').activeRally, undefined);
    await visit('#/'); assert.equal(await page.locator('.rally-reminder').count(), 0);
    // Undo the restore is staged, then reactivates with a fresh token.
    await go('#/history');
    await admin.locator('tbody tr').first().getByRole('button', { name: 'Undo', exact: true }).click();
    await admin.waitForSelector('#pubGo'); assert.equal(json('public/site').activeRally, undefined);
    await admin.click('#pubGo'); await published();
    assert.notEqual(json('public/site').activeRally.activationId, backup.docs['data/site.json'].activeRally.activationId);
    await visit('#/'); await open().waitFor(); await page.keyboard.press('Escape');
    // Unrelated concurrent changes are rebased without dropping the latest notice.
    await go('#/site'); await admin.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Synthetic rebased tagline');
    const concurrent = json('docs/site'); concurrent.activeRally.name = 'Concurrent Synthetic Rally';
    // Both sessions edited site: this must refuse, not merge or overwrite.
    put('docs/site', concurrent); set('config/revision', { n: { integerValue: '30' } });
    await go('#/publish'); await admin.click('#pubGo'); await admin.waitForSelector('#reloadBtn');
    assert.equal(json('docs/site').activeRally.name, 'Concurrent Synthetic Rally');
    await admin.click('#reloadBtn'); await published();
    await go('#/season');
    await admin.getByText('Championship name', { exact: true }).locator('..').locator('input').fill('Synthetic season draft');
    const newest = json('docs/site'); newest.activeRally.name = 'Latest Synthetic Rally'; put('docs/site', newest);
    set('config/revision', { n: { integerValue: '31' } });
    await publish(); assert.equal(json('public/site').activeRally.name, 'Latest Synthetic Rally');
    const safePublic = json('public/site').activeRally;
    await go('#/season');
    await admin.getByText('Championship name', { exact: true }).locator('..').locator('input').fill('Second synthetic season draft');
    const unsafeLatest = json('docs/site'); unsafeLatest.activeRally.url = 'https://evil.example/'; put('docs/site', unsafeLatest);
    set('config/revision', { n: { integerValue: '32' } });
    const beforeInvalidRebase = commits;
    await go('#/publish'); await admin.click('#pubGo');
    await admin.locator('.toast.bad').filter({ hasText: 'Active rally destination' }).waitFor();
    assert.equal(commits, beforeInvalidRebase); assert.deepEqual(json('public/site').activeRally, safePublic);
    put('docs/site', newest);
    // Mixed cached engine refuses publishing even with otherwise valid drafts.
    legacyEngine = true; await admin.reload(); await admin.waitForSelector('.adm-main h1');
    await go('#/site'); await admin.fill('#activeRallyName', 'Must not publish');
    await go('#/publish'); assert.ok(await admin.isDisabled('#pubGo'));
    assert.ok((await admin.innerText('main')).includes('Rally-notice scripts are missing or out of date')); legacyEngine = false;
    assert.equal(await admin.locator('.rally-notice, .rally-reminder').count(), 0);
    // Storage denial still allows the current page to be browsed, but never silently persists a bypass.
    const denied = await context();
    await denied.addInitScript(`Storage.prototype.getItem = Storage.prototype.setItem = Storage.prototype.removeItem = () => { throw new Error('Synthetic denied storage'); };`);
    const deniedPage = await denied.newPage();
    await deniedPage.goto(base + '/index.html'); await deniedPage.locator('dialog[open]').waitFor();
    await deniedPage.getByRole('button', { name: 'View past results' }).click();
    await deniedPage.evaluate(() => location.hash = '#/info');
    assert.equal(await deniedPage.locator('dialog[open]').count(), 0);
    assert.ok(await deniedPage.locator('.rally-reminder').isVisible());
    await deniedPage.reload(); await deniedPage.locator('dialog[open]').waitFor(); await denied.close();
    assert.ok(warnings.some(m => m.includes('visit storage is unavailable')));
    // Long and markup-like names remain text, even in a short 320 px viewport.
    const publishedSite = json('public/site'), longName = { ...publishedSite,
      activeRally: { ...publishedSite.activeRally, name: '<img src=x onerror=alert(1)>' + 'X'.repeat(90) } };
    put('public/site', longName); await page.setViewportSize({ width: 320, height: 400 });
    await visit('#/'); await open().waitFor();
    assert.equal(await open().locator('img').count(), 0);
    assert.equal(await open().locator('h1').innerText(), longName.activeRally.name + ' is currently active.');
    assert.ok(await open().evaluate(el => el.scrollWidth <= el.clientWidth)); await noOverflow();
    await page.keyboard.press('Escape'); await noOverflow(); put('public/site', publishedSite);
    // Unsafe stored configuration never produces a foreign redirect or blocks the disclaimer.
    const malformed = json('public/site'); malformed.activeRally.url = 'javascript:alert(1)'; put('public/site', malformed);
    await page.goto(base + '/disclaimer.html');
    assert.ok(await page.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
    unavailable = 'site'; await page.reload();
    assert.ok(await page.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    assert.ok((await page.innerText('.rally-reminder')).includes('could not be checked'));
    const noJS = await context({ javaScriptEnabled: false }), staticPage = await noJS.newPage();
    await staticPage.goto(base + '/disclaimer.html'); assert.ok(await staticPage.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    await noJS.close();
    unavailable = ''; store.delete('public/site');
    await page.goto(base + '/disclaimer.html'); await page.reload();
    assert.equal(await page.locator('.rally-reminder, .rally-notice').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    console.log('PASS rally notice: manual staging, atomic publish/History, undo/restore/rebase, safe NRC URLs, session-scoped bypass/reactivation, public/error/disclaimer/admin coverage, focus/keyboard, themes and 320px layout.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
