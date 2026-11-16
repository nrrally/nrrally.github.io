/* Synthetic-only public/admin policy regression. All provider traffic is intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const AI = require('../../assets/ai-import.js');
const F = require('./ai-fixtures.js');
const root = path.resolve(__dirname, '..', '..');

async function main() {
  const f = F.preEventEntries(), store = new Map(), writes = [], external = [], errors = [];
  function put(key, value) {
    store.set(key, { name: 'projects/nr-synthetic/databases/(default)/documents/' + key,
      fields: { json: { stringValue: JSON.stringify(value) } }, updateTime: '2026-01-01T00:00:00Z' });
  }
  put('docs/site', f.docs['data/site.json']);
  put('docs/people', f.people);
  put('docs/season_2026', f.season);
  put('public/site', f.docs['data/site.json']);
  put('public/people', f.people);
  put('public/season_2026', { season: AI.projectPublic(f.season, f.people), rounds: {} });
  store.set('config/admins', { fields: { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } } });
  store.set('config/revision', { fields: { n: { integerValue: '1' } } });
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }[path.extname(file)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const user = { email: 'admin@example.com', name: 'Synthetic admin', photo: '' };
      window.NR_TEST_AUTH = { ready: () => Promise.resolve(), user: () => user, observe: fn => fn(user),
        signIn: () => Promise.resolve(user), signOut: () => Promise.resolve(), token: () => Promise.resolve('fake') };
      localStorage.setItem('nr-rs-welcome-until', String(Date.now() + 86400000));
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = request.url();
      if (url === base + '/assets/firebase-config.js') return route.fulfill({ contentType: 'text/javascript',
        body: 'window.NR_FIREBASE={projectId:"nr-synthetic",apiKey:"fake",authDomain:"nr-synthetic.firebaseapp.com"};' });
      if (url.startsWith(base + '/')) return route.continue();
      if (!url.startsWith('https://firestore.googleapis.com/')) { external.push(url); return route.abort(); }
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (request.method() !== 'GET') {
        writes.push(url);
        return route.fulfill({ status: 403, headers, body: '{"error":{"message":"Synthetic test rejects writes"}}' });
      }
      const key = decodeURIComponent(new URL(url).pathname.split('/documents/')[1] || '');
      const value = store.get(key) || (!key.includes('/') ?
        { documents: [...store.entries()].filter(([id]) => id.startsWith(key + '/')).map(([, doc]) => doc) } : null);
      return route.fulfill({ status: value ? 200 : 404, headers, contentType: 'application/json',
        body: JSON.stringify(value || {}) });
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-11-17T10:00:00Z'));
    page.on('pageerror', error => errors.push(error.message));
    async function visit(hash, admin = false) {
      await page.goto(base + (admin ? '/admin/index.html' : '/index.html') + hash);
      await page.locator(admin ? '.adm-main h1' : '.site-header').waitFor();
      if (admin) {
        await page.evaluate(value => { location.hash = value; }, hash);
        await page.locator('.adm-main h1').filter({ hasText: /^RallyeSport$/ }).waitFor();
      }
    }
    for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await visit('#/2026/rounds?competition=rs');
      assert.match(await page.locator('main').innerText(), /Synthetic Launch Event/);
      assert.match(await page.locator('main').innerText(), /Non-scoring event/);
      await page.locator('a[href*="rallyesport-event/rs-r5/classification"]').first().click();
      await page.getByRole('heading', { name: 'Entries received — event not yet held' }).waitFor();
      assert.match(await page.locator('main').innerText(), /Synthetic entry vehicle/);
      assert.match(await page.locator('main').innerText(), /Partial list/);
      assert.equal(await page.locator('.result-classification').count(), 0);
      const entrySize = await page.locator('.result-entry-table').evaluate(el => ({
        width: el.clientWidth, scroll: el.scrollWidth,
        cells: [...el.querySelectorAll('td')].map(td => [td.clientWidth, td.scrollWidth])
      }));
      assert.ok(entrySize.scroll <= entrySize.width, JSON.stringify({ width, theme, entrySize }));
      await page.locator('.result-entry-table').focus();
      assert.equal(await page.locator('.result-entry-table').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (process.env.RALLY_SCREENSHOT_DIR && [390, 1440].includes(width)) {
        fs.mkdirSync(process.env.RALLY_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.RALLY_SCREENSHOT_DIR, 'entries-' + width + '-' + theme + '.png'), fullPage: true });
      }
      await page.getByRole('link', { name: 'Stage graph', exact: true }).click();
      await page.getByRole('heading', { name: 'Results not published yet' }).waitFor();
      assert.equal(await page.locator('.graph svg').count(), 0);
      await page.getByRole('link', { name: 'View entries received', exact: true }).click();
      await page.getByRole('heading', { name: 'Entries received — event not yet held' }).waitFor();
      await visit('#/2026/rallyesport/rs-r1-classification/classification?competition=rs');
      const launch = await page.locator('tr[data-car="1"]').innerText();
      assert.match(launch, /RS0/); assert.match(launch, /TEST/); assert.match(launch, /01:00.1/);
      assert.match(await page.locator('main').innerText(), /excluded from championship totals and round counts/);
      await visit('#/2026/rallyesport/rs-r1-classification/graph?competition=rs');
      assert.match(await page.locator('main').innerText(), /Non-scoring event/);
      assert.ok(await page.locator('svg').count());
      await visit('#/2026/standings?competition=rs&pts=split');
      const standings = await page.locator('main').innerText();
      assert.match(standings, /Provisional/); assert.match(standings, /R1/);
      assert.ok(!standings.includes('Synthetic Launch Event'));
      assert.equal(await page.locator('.filters a').filter({ hasText: /^RS0$/ }).count(), 0);
      assert.ok(!await page.locator('table').innerText().then(text => text.includes('RS0')));
      await visit('#/2026/person/synthetic-driver-1?competition=rs');
      assert.match(await page.locator('main').innerText(), /45 pts/);
      assert.ok((await page.locator('.kpi span').allTextContents()).includes('Championship appearances'));
      assert.match(await page.locator('main').innerText(), /Synthetic Launch Event/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await visit('#/rallyesport/eligibility', true);
      assert.match(await page.locator('.adm-main').innerText(), /Entry-based driver and co-driver eligibility/);
      assert.equal(await page.locator('[aria-label^="Membership eligibility for"]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await visit('#/rallyesport/events/rs-r1/rows', true);
      await page.locator('.rs-crew-row summary').first().click();
      assert.equal(await page.getByText('Private launch-only RS0 review evidence', { exact: true }).count(), 1);
      assert.match(await page.locator('.rs-crew-row').first().innerText(), /never applies to later championship entries/i);
      await visit('#/rallyesport/events/rs-r2/rows', true);
      await page.locator('.rs-crew-row summary').first().click();
      const status = page.locator('.rs-crew-row').first().locator('.fld').filter({
        has: page.locator('.fl').filter({ hasText: /^Printed RS status$/ })
      }).locator('select');
      assert.deepEqual(await status.locator('option').allTextContents(), ['classified', 'DNF', 'DNS']);
      assert.equal(await page.getByText('Invitation status', { exact: true }).count(), 0);
      await visit('#/rallyesport/events/rs-r5/entries', true);
      assert.match(await page.locator('.adm-main').innerText(), /RS0 applicability remains unresolved/);
      assert.equal(await page.getByLabel('Received driver', { exact: true }).inputValue(), 'synthetic-driver-1');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.getByLabel('Received vehicle', { exact: true }).fill('Edited synthetic vehicle');
    await page.getByLabel('Entered class (not scoring)', { exact: true }).fill('RS0');
    await page.getByRole('link', { name: 'Scoring checks', exact: true }).click();
    await page.getByRole('heading', { name: 'Validation before publishing' }).waitFor();
    assert.match(await page.locator('.adm-main').innerText(), /No RS data validation errors/);
    await page.getByRole('link', { name: 'Events & results', exact: true }).click();
    await page.locator('a.rs-event-link[href="#/rallyesport/events/rs-r5"]').click();
    await page.getByRole('link', { name: 'Entries received', exact: true }).click();
    assert.equal(await page.getByLabel('Received vehicle', { exact: true }).inputValue(), 'Edited synthetic vehicle');
    await page.getByRole('button', { name: '+ Add received crew', exact: true }).click();
    await page.getByLabel('Received driver', { exact: true }).nth(1).selectOption('synthetic-driver-2');
    await page.getByLabel('Received car number', { exact: true }).nth(1).fill('302');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Remove received crew', exact: true }).nth(1).click();
    assert.equal(await page.locator('.rs-received-entry').count(), 1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Remove received crew', exact: true }).click();
    assert.equal(await page.locator('.rs-received-entry').count(), 0);
    const publicRoute = '#/2026/rallyesport-event/rs-r5/classification?competition=rs';
    const publishSynthetic = () => put('public/season_2026', { season: AI.projectPublic(f.season, f.people), rounds: {} });
    f.data.entryLists[0].entries[0].vehicle = 'Data-only updated vehicle';
    publishSynthetic();
    await visit(publicRoute);
    await page.getByRole('heading', { name: 'Entries received — event not yet held' }).waitFor();
    assert.match(await page.locator('main').innerText(), /Data-only updated vehicle/);
    f.data.results.push(F.revisedRallyeSport(true).data.results.at(-1));
    publishSynthetic();
    await visit(publicRoute);
    await page.reload();
    await page.locator('.result-classification').waitFor();
    await page.getByText('Entries received (retained separately from results)', { exact: true }).click();
    assert.match(await page.locator('main').innerText(), /Data-only updated vehicle/);
    assert.equal(await page.locator('tr[data-entry-car="301"]').count(), 1);
    f.data.results.pop();
    f.data.entryLists[0].entries = [];
    publishSynthetic();
    await visit(publicRoute);
    await page.reload();
    await page.getByText('No entries recorded in this published partial list.', { exact: true }).waitFor();
    delete f.data.entryLists;
    publishSynthetic();
    await visit(publicRoute);
    await page.reload();
    await page.getByText('No entries published yet.', { exact: true }).waitFor();
    await visit('#/rallyesport/events/rs-r2/source', true);
    await page.getByLabel('Private source examination evidence').fill('Synthetic complete source review');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Confirm complete source examination' }).click();
    assert.equal(await page.locator('#rsClassOrderStatus').innerText(), 'Reviewed snapshot matches.');
    await page.getByLabel('Official source URL').fill('https://example.com/changed-source.pdf');
    await page.evaluate(() => { location.hash = '#/rallyesport/checks'; });
    await page.getByRole('heading', { name: 'Validation before publishing' }).waitFor();
    assert.match(await page.locator('.adm-main').innerText(), /class-order review.*stale/i);
    await page.evaluate(() => { location.hash = '#/rallyesport/events/rs-r2/source'; });
    await page.getByRole('button', { name: 'Remove class-order review' }).click();
    assert.equal(await page.locator('#rsClassOrderStatus').innerText(), 'No valid class-order review.');
    await visit('#/rallyesport/setup', true);
    await page.locator('.fld').filter({
      has: page.locator('.fl').filter({ hasText: /^Private entry-based policy evidence$/ })
    }).locator('textarea').fill('');
    await page.evaluate(() => { location.hash = '#/rallyesport/checks'; });
    await page.getByRole('heading', { name: 'Validation before publishing' }).waitFor();
    assert.match(await page.locator('.adm-main').innerText(), /entry-based.*(?:unsupported|evidence|required|reviewed)/i);
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(writes, []);
    console.log('PASS revised RS public/admin workflow at four widths and both themes; synthetic only, no writes.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
