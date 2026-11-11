/* Synthetic-only public navigation; all external traffic is intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { published } = require('./site-theme-e2e.js');
const repo = path.resolve(__dirname, '..', '..');
published.site.seasons = [{ year: 2026 }, { year: 2027 }];
published.season_2027 = structuredClone(published.season_2026);
published.season_2027.season.year = 2027;

async function main() {
  const server = http.createServer((req, res) => {
    const file = path.resolve(repo, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const errors = [], unexpected = [];
  try {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url === base + '/assets/firebase-config.js') return route.fulfill({
        contentType: 'text/javascript', body: 'window.NR_FIREBASE={projectId:"nr-synthetic"};'
      });
      if (url.startsWith(base + '/')) return route.continue();
      if (url.startsWith('https://firestore.googleapis.com/')) {
        assert.equal(req.method(), 'GET');
        assert.ok(url.includes('/projects/nr-synthetic/'));
        const value = published[url.split('/').pop()];
        return route.fulfill({ status: value ? 200 : 404, headers: { 'Access-Control-Allow-Origin': '*' },
          contentType: 'application/json', body: JSON.stringify(value ? { fields: { json: { stringValue: JSON.stringify(value) } } } : {}) });
      }
      unexpected.push(url); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const button = () => page.getByRole('button', { name: 'Main menu', exact: true, includeHidden: true });
    const nav = () => page.getByRole('navigation', { name: 'Main', exact: true });
    const fit = async () => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow');
      assert.ok(await page.locator('.header-inner').evaluate(header => {
        const boxes = [...header.children].filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect());
        return boxes.every((a, i) => boxes.every((b, j) => i === j ||
          a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1));
      }), 'header controls do not overlap');
      if (await nav().isVisible()) {
        const sizes = await nav().evaluate(el => ({ viewport: innerWidth, content: el.scrollWidth, available: el.clientWidth }));
        assert.ok(sizes.content <= sizes.available, 'all navigation fits without horizontal scrolling: ' + JSON.stringify(sizes));
      }
    };
    let sharedGuideText;
    for (const theme of ['light', 'dark']) {
      for (const width of [1440, 1201, 1200, 1199, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const competition of ['nr', 'rs']) {
          await page.goto(base + '/index.html#/2026/?competition=' + competition);
          await page.locator('#competitionBtn').waitFor();
          await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
          await page.reload(); await page.locator('#competitionBtn').waitFor();
          const compact = width <= 1200;
          assert.equal(await button().isVisible(), compact, String(width));
          assert.equal(await nav().isVisible(), !compact);
          assert.equal(await button().getAttribute('aria-controls'), 'publicNav');
          await fit();
          if (compact) {
            assert.equal(await button().innerText(), 'MENU');
            assert.ok(await button().locator('span').isVisible());
            await button().focus(); await page.keyboard.press('Enter');
            assert.equal(await button().getAttribute('aria-expanded'), 'true');
            assert.equal(await button().innerText(), 'MENU');
            assert.ok(await button().locator('.nav-cross').isVisible());
            assert.equal(await button().locator('.nav-bars').isVisible(), false);
            await page.keyboard.press('Tab');
            assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Home');
            await page.keyboard.press('Escape');
            assert.equal(await button().getAttribute('aria-expanded'), 'false');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'navigationToggle');
            await page.keyboard.press('Space'); await fit();
            await button().click(); assert.equal(await nav().isVisible(), false);
            await button().click(); await page.locator('main h1').first().click();
            assert.equal(await nav().isVisible(), false, 'outside click closes');
            await button().click();
            await page.locator('#themeBtn').focus();
            assert.equal(await nav().isVisible(), false, 'moving focus outside closes');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'themeBtn');
          }
          for (const name of ['Standings', 'Rounds & graphs', 'Crews', 'Getting started', 'Info', 'Home']) {
            if (compact) await button().click();
            const link = nav().getByRole('link', { name, exact: true });
            assert.ok((await link.getAttribute('href')).includes('competition=' + competition));
            await link.click();
            await page.waitForFunction(expected => document.querySelector('#publicNav a.active')?.textContent === expected, name);
            assert.equal(await page.locator('#competitionBtn').getAttribute('aria-checked'), String(competition === 'rs'));
            if (compact) {
              assert.equal(await button().getAttribute('aria-expanded'), 'false');
              assert.equal(await nav().isVisible(), false);
              assert.ok(await page.evaluate(() => !!document.activeElement.closest('main')), 'route selection focuses content');
            }
            await fit();
          }
          await page.locator('#seasonSel').selectOption('2027');
          await page.waitForFunction(() => document.querySelector('.brand-text span')?.textContent.includes('2027') && location.hash.includes('/2027'));
          assert.ok(page.url().includes('competition=' + competition));
          if (compact) await button().click();
          await nav().getByRole('link', { name: 'Getting started', exact: true }).click();
          await page.locator('.getting-started').waitFor();
          assert.equal(await page.locator('#seasonSel').inputValue(), '2027');
          assert.ok(await page.locator('#seasonSel').isVisible(), 'shared guide retains the year selector');
          const guide = await page.locator('.getting-started').innerText();
          if (sharedGuideText === undefined) sharedGuideText = guide;
          else assert.equal(guide, sharedGuideText, 'NR and RS share the same newcomer guide');
          const comparison = page.locator('section[aria-labelledby="guide-national-regional"]');
          assert.ok(await comparison.getByRole('heading', { name: 'RallyeSport (RS): a club championship', exact: true }).isVisible());
          assert.ok((await comparison.innerText()).includes('typically the lowest-cost'));
          assert.ok((await comparison.innerText()).includes('varies from round to round'));
          const rsRules = comparison.getByRole('link', { name: '2026 RallyeSport SSRs', exact: true });
          assert.ok(await rsRules.isVisible());
          assert.equal(await rsRules.getAttribute('href'), 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf');
          assert.equal(await rsRules.getAttribute('rel'), 'noopener noreferrer');
          assert.ok(await comparison.locator('.guide-copy').evaluate(el => el.scrollWidth <= el.clientWidth));
          await page.locator('#seasonSel').selectOption('2026');
          await page.waitForURL(url => url.hash.includes('/2026/getting-started'));
          await page.waitForFunction(() => document.getElementById('seasonSel')?.value === '2026');
          assert.equal(await page.locator('.getting-started').innerText(), guide, 'year changes context, not guide content');
          await page.reload(); await page.locator('.getting-started').waitFor();
          assert.equal(await page.locator('#seasonSel').inputValue(), '2026');
          await page.goBack();
          await page.waitForFunction(() => document.getElementById('seasonSel')?.value === '2027');
          await page.goForward();
          await page.waitForFunction(() => document.getElementById('seasonSel')?.value === '2026');
          if (compact) await button().click();
          await nav().getByRole('link', { name: 'Home', exact: true }).click();
          await page.locator('.hero').waitFor();
          assert.equal(await page.locator('#seasonSel').inputValue(), '2026');
          assert.ok(page.url().includes('competition=' + competition));
          if (compact) {
            await button().click(); await page.locator('#themeBtn').click();
            assert.equal(await nav().isVisible(), false, 'theme interaction closes the dropdown');
            assert.equal(await page.locator('html').getAttribute('data-theme'), theme === 'light' ? 'dark' : 'light');
          }
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/index.html#/?competition=nr'); await nav().waitFor();
    await nav().getByRole('link', { name: 'Standings', exact: true }).focus();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForFunction(() => document.activeElement.id === 'navigationToggle');
    await button().click(); await nav().getByRole('link', { name: 'Info', exact: true }).focus();
    await page.setViewportSize({ width: 1201, height: 900 }); await nav().waitFor();
    await page.waitForFunction(() => document.getElementById('navigationToggle').getAttribute('aria-expanded') === 'false');
    assert.equal(await button().getAttribute('aria-expanded'), 'false');
    await fit();
    await page.setViewportSize({ width: 390, height: 320 });
    await page.waitForFunction(() => document.activeElement.id === 'navigationToggle');
    await button().click();
    await nav().getByRole('link', { name: 'Info', exact: true }).scrollIntoViewIfNeeded();
    assert.ok(await nav().getByRole('link', { name: 'Info', exact: true }).evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }), 'last menu link is reachable in a short viewport');
    await fit();
    await page.keyboard.press('Escape');
    if (process.env.NAVIGATION_SCREENSHOT_DIR) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        if (width === 390) await button().click();
        await page.screenshot({ path: path.join(process.env.NAVIGATION_SCREENSHOT_DIR, 'navigation-' + width + '.png') });
      }
    }
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    console.log('PASS navigation: viewport collapse/resize, keyboard/Escape/focus/outside/selection, NR/RS routes/year/theme, desktop and narrow layouts in both themes; external traffic intercepted.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
