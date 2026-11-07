/* Synthetic public-site checks only; never reads or writes the live database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const repo = path.resolve(__dirname, '..', '..');
const docs = F.docs(), source = F.payload('results', 2026).rounds[0];
const bundle = { season: docs['data/seasons/2026/season.json'], rounds: { R1: {
  ...source, entries: source.entries.map(e => ({ ...e, driver: 'Alex Test', codriver: 'Blake Example' }))
} } };
const published = {
  site: { ...docs['data/site.json'], siteName: 'Northern Regions Rally', tagline: 'Synthetic preview data only.' },
  people: docs['data/people.json'], season_2026: bundle
};
const errors = [], unexpected = [];
let databaseDown = false;
let configured = true, seasonDelay = 0;
async function main() {
  const server = http.createServer((req, res) => {
    const file = path.resolve(repo, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url === base + '/assets/firebase-config.js') return route.fulfill({
        contentType: 'text/javascript', body: configured ? 'window.NR_FIREBASE={projectId:"nr-synthetic"};' : 'window.NR_FIREBASE={};'
      });
      if (url.startsWith(base + '/')) return route.continue();
      if (url.startsWith('https://firestore.googleapis.com/')) {
        assert.equal(req.method(), 'GET');
        if (url.endsWith('/season_2026') && seasonDelay) await new Promise(resolve => setTimeout(resolve, seasonDelay));
        const value = published[url.split('/').pop()];
        return route.fulfill({ status: databaseDown ? 503 : value ? 200 : 404,
          headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json',
          body: JSON.stringify(value ? { fields: { json: { stringValue: JSON.stringify(value) } } } : {}) });
      }
      unexpected.push(url); return route.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const visit = async hash => {
      await page.goto(base + '/index.html' + hash);
      await page.reload();
      await page.waitForSelector('.site-header');
      assert.equal(await page.locator('.site-disclosure').count(), 1);
      assert.equal(await page.locator('.site-disclosure a[href="disclaimer.html"]').count(), 1);
      assert.equal(await page.locator('.footer a[href="disclaimer.html"]').count(), 1);
      assert.ok((await page.innerText('.site-disclosure')).includes('not this site'));
    };
    const noOverflow = async () => assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth), true);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const hash of ['#/', '#/standings', '#/standings/codrivers', '#/standings?class=OPEN', '#/rounds',
        '#/round/R1/graph', '#/round/R1/classification', '#/round/R1/stages', '#/round/missing',
        '#/crews', '#/person/alex-test', '#/person/missing', '#/info', '#/about', '#/2026/about', '#/missing']) {
        await visit(hash); await noOverflow();
      }
    }
    // Both saved choices override the system preference and survive navigation.
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      await visit('#/');
      assert.equal(await page.locator('.hero-kicker').textContent(), 'Gauteng · Limpopo · Mpumalanga · Free State · North West');
      assert.equal(await page.getAttribute('html', 'data-theme'), theme);
      const contrast = await page.locator('.hero .btn.primary').evaluate(el => {
        const style = getComputedStyle(el);
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
            v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
          });
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        };
        const a = luminance(style.color), b = luminance(style.backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      assert.ok(contrast >= 4.5, 'Primary button contrast must meet WCAG AA');
      await page.click('#themeBtn');
      assert.equal(await page.getAttribute('html', 'data-theme'), theme === 'light' ? 'dark' : 'light');
    }
    // Finality is derived from headings, not merely from the absence of "provisional".
    for (const [status, unclear, label] of [
      ['Final Official Classification', false, 'Final classification'],
      ['Final Official Classification 5/5', false, 'Final classification'],
      ['Provisional Official Classification 8/8', false, 'Provisional sheet'],
      ['Classification', false, 'Classification finality unclear'],
      ['', false, 'Classification finality unclear'],
      ['Final Official Classification', true, 'Classification finality unclear']
    ]) {
      bundle.rounds.R1.status = status; bundle.rounds.R1.finalityUnclear = unclear;
      await visit('#/round/R1/classification');
      assert.ok((await page.innerText('.round-meta')).includes(label));
      await visit('#/about');
      const expected = label === 'Final classification' ? 'Final' :
        label === 'Provisional sheet' ? 'Provisional' : 'Finality unclear';
      assert.equal(await page.locator('main table .badge').innerText(), expected);
      await visit('#/rounds');
      assert.equal(await page.locator('main table .badge').innerText(), expected);
    }
    await page.emulateMedia({ media: 'print' });
    assert.ok(await page.locator('.site-disclosure').isVisible());
    await page.emulateMedia({ media: 'screen' });
    // Modest entry-only display, unknown day coverage and explicit classification DNS.
    const peopleBefore = F.copy(published.people), entriesBefore = F.copy(bundle.rounds.R1.entries);
    published.people.people.push({ id: 'entry-person-stable', name: 'Casey Entry', aliases: [], bio: '', photo: '', links: {} });
    const entered = { car: '2', driver: 'Casey Entry', codriver: '', class: 'OPEN', vehicle: 'Entry car', roundIds: [],
      status: 'entered', statusEvidence: '', participationEvidence: 'Regional event entry; no day evidence', locator: 'Entry row 2' };
    bundle.season.entryLists = [{ eventId: 'test-event', roundIds: [], complete: true,
      source: { file: 'entries.json', url: 'https://example.com/entries', date: '2026-02-01', locator: 'Complete event list; days unknown' },
      entries: [entered] }];
    await page.setViewportSize({ width: 320, height: 1000 });
    await visit('#/crews');
    assert.ok((await page.innerText('main')).includes('Casey Entry'));
    await page.getByRole('link', { name: 'Casey Entry', exact: true }).click();
    await page.waitForSelector('.profile-head');
    assert.ok(page.url().endsWith('/person/entry-person-stable'));
    assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '0');
    await page.locator('main details summary').click();
    assert.ok((await page.innerText('main')).includes('event only; day scope unknown'));
    await noOverflow();
    await visit('#/round/R1/classification');
    assert.ok((await page.innerText('main')).includes('day scope unknown'));
    assert.ok(!(await page.innerText('main')).includes('1 crews not recorded as started'));
    const dns = { ...entriesBefore[0], status: 'DNS', pos: null, total: null, stages: 0,
      times: [null, null], stagePos: [null, null] };
    bundle.rounds.R1.entries = [dns];
    await visit('#/person/alex-test');
    assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '0');
    await visit('#/');
    await page.getByRole('heading', { name: 'No scored starts yet' }).waitFor();
    published.people = peopleBefore; bundle.rounds.R1.entries = entriesBefore; delete bundle.season.entryLists;
    seasonDelay = 500;
    await page.goto(base + '/index.html');
    await page.waitForSelector('.loading');
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await page.waitForSelector('.site-header');
    seasonDelay = 0;
    const savedRounds = bundle.rounds;
    bundle.rounds = {};
    await visit('#/');
    await page.getByRole('heading', { name: 'No results yet' }).waitFor();
    bundle.rounds = savedRounds;
    const savedSite = published.site;
    delete published.site;
    await page.reload();
    await page.getByRole('heading', { name: 'Results coming soon' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    published.site = savedSite;
    configured = false;
    await page.reload();
    await page.getByRole('heading', { name: 'Site not connected yet' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    configured = true;
    databaseDown = true;
    await page.goto(base + '/index.html');
    await page.getByRole('heading', { name: 'Results are temporarily unavailable' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await page.locator('.site-disclosure a[href="disclaimer.html"]').click();
    await page.getByRole('heading', { name: 'Independent by design.' }).waitFor();
    assert.ok((await page.innerText('.site-disclosure')).includes('take precedence'));
    assert.equal(await page.locator('a[href="https://nrcsa.co.za/"]').count(), 1);
    assert.equal(await page.locator('a[href="https://motorsport.co.za/"]').count(), 1);
    await noOverflow();
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    const staticPage = await noJS.newPage();
    await staticPage.goto(base + '/disclaimer.html');
    assert.ok(await staticPage.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    await staticPage.goto(base + '/index.html');
    assert.ok(await staticPage.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await staticPage.goto(base + '/admin/index.html');
    assert.ok(await staticPage.locator('.site-disclosure a[href="../disclaimer.html"]').isVisible());
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    console.log('PASS public theme: responsive routes, saved themes, AA button contrast, final/provisional/unclear headings, sources, print, offline disclaimer and no-JS disclosures.');
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
