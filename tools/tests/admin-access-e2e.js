/* Synthetic-only browser regression. All non-local traffic is intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixtures = require('./ai-fixtures.js').docs();
const repo = path.resolve(__dirname, '..', '..');
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const docs = new Map(), writes = [], external = [], errors = [];
const field = value => ({ stringValue: JSON.stringify(value) });
function put(key, fields) { docs.set(key, { name: prefix + key, fields, updateTime: '2027-01-01T00:00:00Z' }); }
put('docs/site', { json: field(fixtures['data/site.json']) });
put('docs/people', { json: field(fixtures['data/people.json']) });
put('docs/season_2026', { json: field(fixtures['data/seasons/2026/season.json']) });
put('public/site', { json: field(fixtures['data/site.json']) });
put('public/people', { json: field(fixtures['data/people.json']) });
put('public/season_2026', { json: field({ season: fixtures['data/seasons/2026/season.json'], rounds: {} }) });
put('config/admins', { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } });
put('config/revision', { n: { integerValue: '1' } });

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
  let release, waiting, block = false, denyAdmins = false, removeAdmin = false;
  try {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      let current = sessionStorage.getItem('synthetic-user') || '', listener = () => {};
      function user() { return current ? { email: current, name: 'Synthetic User', photo: '' } : null; }
      window.testAuth = {
        select: email => { window.testEmail = email; },
        change: email => { current = email; if (email) sessionStorage.setItem('synthetic-user', email); else sessionStorage.removeItem('synthetic-user'); listener(user()); },
        fail: value => { window.testFailure = value; }
      };
      window.NR_TEST_AUTH = {
        ready: () => Promise.resolve(), user,
        observe: fn => { listener = fn; fn(user()); },
        signIn: () => window.testFailure ? Promise.reject(new Error('Synthetic sign-in failure')) :
          (window.testAuth.change(window.testEmail || 'admin@example.com'), Promise.resolve(user())),
        signOut: () => { window.testAuth.change(''); return Promise.resolve(); },
        token: () => window.testTokenFailure ? Promise.reject(new Error('Synthetic token failure')) : Promise.resolve(current ? 'fake:' + current : null)
      };
    });
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url === base + '/assets/firebase-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.NR_FIREBASE={projectId:"nr-synthetic",apiKey:"fake",authDomain:"nr-synthetic.firebaseapp.com"};' });
      if (url.startsWith(base + '/')) return route.continue();
      if (!url.startsWith('https://firestore.googleapis.com/')) { external.push(url); return route.abort(); }
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const rel = new URL(url).pathname.split('/documents')[1], key = rel.slice(1);
      const authorized = req.headers().authorization === 'Bearer fake:admin@example.com';
      let status = 200, body;
      if (req.method() !== 'GET') {
        writes.push({ rel, body: req.postData() }); body = { writeResults: [] };
      } else if ((!key.startsWith('public/') && !authorized) || (key === 'config/admins' && denyAdmins)) {
        status = 403; body = { error: { status: 'PERMISSION_DENIED' } };
      } else {
        if (block && key === 'public/site') {
          block = false; waiting(); await new Promise(resolve => { release = resolve; });
        }
        if (key === 'config/admins' && removeAdmin) body = { fields: { emails: { arrayValue: { values: [] } } } };
        else if (!key.includes('/')) body = { documents: [...docs.entries()].filter(([k]) => k.startsWith(key + '/')).map(([, d]) => d) };
        else if (docs.has(key)) body = docs.get(key);
        else { status = 404; body = {}; }
      }
      await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    const signin = () => page.locator('#signInBtn').waitFor();
    const admin = () => page.locator('.adm-main').waitFor();
    const absent = async () => {
      await signin();
      assert.equal(await page.locator('#demoBtn, .adm-main, .demo-bar, .adm-nav').count(), 0);
      assert.ok(await page.locator('.site-disclosure').isVisible());
    };
    for (const hash of ['', '#/site', '#/publish', '#/history', '#/demo', '#/competitors']) {
      await page.goto(base + '/admin/index.html' + hash); await absent();
      await page.reload(); await absent();
    }
    await page.evaluate(() => { window.testAuth.fail(true); });
    await page.click('#signInBtn'); await page.getByText('Synthetic sign-in failure').waitFor(); await absent();
    await page.evaluate(() => { window.testAuth.fail(false); window.testAuth.select('stranger@example.com'); });
    await page.click('#signInBtn'); await page.getByText(/this account can.t open the admin/).waitFor(); await absent();
    await page.reload(); await page.getByText(/this account can.t open the admin/).waitFor(); await absent();
    await page.getByRole('button', { name: 'Use a different Google account' }).click(); await absent();
    await page.evaluate(() => window.testAuth.select('admin@example.com'));
    await page.click('#signInBtn'); await admin();
    assert.ok(await page.locator('#demoBtn').isVisible());
    await page.click('#demoBtn'); await page.locator('.demo-bar').waitFor();
    assert.match(await page.locator('.demo-bar').innerText(), /Simulation.*nothing is ever saved/);
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    assert.equal(await page.locator('#addAdminBtn').count(), 0);
    await page.evaluate(() => location.hash = '#/history'); await page.getByText('The history is kept in the database. Sign in to see it.').waitFor();
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    await page.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Synthetic practice change');
    await page.evaluate(() => location.hash = '#/publish'); await page.locator('#pubGo').waitFor();
    await page.click('#pubGo'); await page.getByText(/Demo:.*would have been saved/).waitFor();
    assert.equal(writes.length, 0);
    await page.click('#leaveDemoBtn'); await admin();
    assert.equal(await page.locator('.demo-bar').count(), 0);
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    assert.notEqual(await page.getByText('Tagline', { exact: true }).locator('..').locator('input').inputValue(), 'Synthetic practice change');
    await page.click('#demoBtn'); await page.locator('.demo-bar').waitFor();
    await page.reload(); await admin(); assert.equal(await page.locator('.demo-bar').count(), 0);
    await page.click('#demoBtn'); await page.locator('.demo-bar').waitFor();
    await page.click('#signOutBtn'); await absent();
    await page.reload(); await absent();
    await page.evaluate(() => window.testAuth.select('admin@example.com'));
    await page.click('#signInBtn'); await admin();
    denyAdmins = true;
    await page.click('#demoBtn'); await page.getByText(/database refused/i).first().waitFor(); await absent();
    denyAdmins = false;
    await page.click('#signInBtn'); await admin();
    removeAdmin = true;
    await page.click('#demoBtn'); await page.getByText(/this account can.t open the admin/).waitFor(); await absent();
    removeAdmin = false;
    await page.click('#signInBtn'); await admin();
    const started = new Promise(resolve => { waiting = resolve; }); block = true;
    await page.click('#demoBtn'); await started;
    await page.evaluate(() => window.testAuth.change(''));
    await absent(); release();
    await page.waitForTimeout(200); await absent();
    await page.evaluate(() => window.testAuth.select('admin@example.com'));
    await page.click('#signInBtn'); await admin();
    await page.click('#demoBtn'); await page.locator('.demo-bar').waitFor();
    await page.evaluate(() => window.testAuth.change('stranger@example.com')); await absent();
    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    await admin();
    await page.evaluate(() => { window.testTokenFailure = true; });
    await page.click('#demoBtn'); await page.getByText(/Synthetic token failure/).first().waitFor(); await absent();
    assert.equal(writes.length, 0); assert.deepEqual(external, []); assert.deepEqual(errors, []);
    await ctx.close();
    console.log('Admin access E2E passed: signed-out, non-admin, admin simulation, refresh, sign-out, denied access and delayed-load race; no writes.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
