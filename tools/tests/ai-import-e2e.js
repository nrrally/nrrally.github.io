/* Runs only against synthetic data and an in-process Firestore mock.
   PLAYWRIGHT_MODULE may point at an existing Playwright installation. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const repo = path.resolve(__dirname, '..', '..');
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const store = new Map(), requests = [], unexpected = [], pageErrors = [];
let clock = 0, commits = 0;
function stamp() { return new Date(Date.UTC(2027, 0, 1, 0, 0, ++clock)).toISOString(); }
function set(key, fields) { store.set(key, { name: prefix + key, fields, updateTime: stamp() }); }
function json(key) { const d = store.get(key); return d && JSON.parse(d.fields.json.stringValue); }
function id(p) {
  if (p === 'data/site.json') return 'site';
  if (p === 'data/people.json') return 'people';
  const m = p.match(/seasons\/(\d+)\/(?:(?:rounds\/(.+))|season)\.json/);
  return m[2] ? 'round_' + m[1] + '_' + m[2] : 'season_' + m[1];
}
for (const [p, value] of Object.entries(F.docs())) set('docs/' + id(p), { json: { stringValue: JSON.stringify(value) } });
set('config/admins', { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } });
set('config/revision', { n: { integerValue: '1' } });
function handle(method, url, body) {
  const rel = new URL(url).pathname.split('/documents')[1];
  if (method === 'GET') {
    const key = rel.slice(1);
    if (!key.includes('/')) {
      const documents = Array.from(store.entries()).filter(([k]) => k.startsWith(key + '/')).map(([, v]) => v);
      if (key === 'history') documents.sort((a, b) => (b.fields.at.stringValue).localeCompare(a.fields.at.stringValue));
      return [200, { documents }];
    }
    return store.has(key) ? [200, store.get(key)] : [404, { error: { status: 'NOT_FOUND' } }];
  }
  assert.equal(rel, ':commit'); assert.equal(method, 'POST');
  for (const w of body.writes) {
    const key = (w.update ? w.update.name : w.delete).slice(prefix.length), prior = store.get(key), pre = w.currentDocument;
    if (pre && (pre.exists === false && prior || pre.updateTime && (!prior || prior.updateTime !== pre.updateTime))) {
      return [409, { error: { status: 'FAILED_PRECONDITION', message: 'Synthetic conflict' } }];
    }
  }
  commits++;
  const writeResults = body.writes.map(w => {
    const key = (w.update ? w.update.name : w.delete).slice(prefix.length);
    if (w.update) set(key, w.update.fields); else store.delete(key);
    return { updateTime: store.has(key) ? store.get(key).updateTime : stamp() };
  });
  return [200, { writeResults }];
}
async function main() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(repo, '.' + rel);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 950 } });
    await ctx.addInitScript(`window.NR_TEST_AUTH = {
      ready: () => Promise.resolve(), user: () => ({email:'admin@example.com',name:'Synthetic Admin',photo:''}),
      token: () => Promise.resolve('fake:admin@example.com'), signOut: () => Promise.resolve()
    };`);
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url === base + '/assets/firebase-config.js') return route.fulfill({ contentType: 'text/javascript',
        body: 'window.NR_FIREBASE={projectId:"nr-synthetic",apiKey:"fake",authDomain:"nr-synthetic.firebaseapp.com"};' });
      if (url.startsWith(base + '/')) return route.continue();
      if (url.startsWith('https://firestore.googleapis.com/')) {
        requests.push(req.method() + ' ' + url);
        const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const [status, body] = handle(req.method(), url, req.postData() ? JSON.parse(req.postData()) : null);
        return route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
      }
      unexpected.push(url); return route.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push(e.message));
    let refuseEntryLoss = false;
    page.on('dialog', d => refuseEntryLoss && d.message().includes('removes saved entry-list evidence') ? d.dismiss() : d.accept());
    const go = async hash => { await page.evaluate(h => location.hash = h, hash); await page.waitForTimeout(80); };
    const checked = async () => { await page.check('#aiRulesApprove'); await page.check('#aiEvidenceApprove'); await page.click('#aiPreview'); };
    const token = async () => (await page.inputValue('#aiPrompt')).match(/"baseToken": "([^"]+)"/)[1];
    const read = async p => { await page.fill('#aiJSON', JSON.stringify(p)); await page.click('#aiRead'); };
    const publish = async () => { await go('#/publish'); await page.click('#pubGo'); await page.waitForSelector('.callout.good'); };
    await page.goto(base + '/admin/index.html'); await page.waitForSelector('.adm-main h1');
    for (const hash of ['#/', '#/import', '#/ai-import', '#/results/R1', '#/events',
      '#/competitors', '#/competitor/alex-test', '#/season', '#/site', '#/history', '#/publish']) {
      await go(hash);
      assert.equal(await page.locator('.site-disclosure a[href="../disclaimer.html"]').count(), 1);
      assert.ok(await page.locator('.site-disclosure a[href="../disclaimer.html"]').isVisible());
    }
    await go('#/site');
    await page.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Manual draft survives');
    await go('#/ai-import');
    await page.fill('#aiSources', 'ssr.pdf - SSR v1; official https://example.com/ssr.pdf');
    await page.click('#aiGenerate');
    assert.ok(!(await page.inputValue('#aiPrompt')).includes('Alex Test'));
    await page.fill('#aiJSON', '{bad'); await page.click('#aiRead');
    assert.ok((await page.innerText('#aiErrors')).includes('Invalid JSON')); assert.equal(commits, 0);
    await page.click('#aiRepair'); assert.ok((await page.inputValue('#aiPrompt')).includes('Repair these'));
    const p = F.payload(); p.baseToken = await token();
    const unsupported = F.copy(p); unsupported.rules.aggregation.value = 'best-five';
    await read(unsupported); assert.ok((await page.innerText('#aiErrors')).includes('Unsupported'));
    assert.equal(await page.locator('#aiStage').count(), 0); assert.equal(commits, 0);
    await read(p); await checked(); await page.waitForSelector('#aiStage');
    assert.equal(commits, 0); assert.ok((await page.innerText('#aiConsequences')).includes('2027'));
    await go('#/site');
    await page.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Still preserved');
    await go('#/ai-import');
    await page.click('#aiStage');
    // Unrelated site text is intentionally outside the import snapshot and must be retained.
    await page.waitForSelector('#pubGo'); assert.equal(commits, 0);
    await page.click('#pubGo'); await page.waitForSelector('.callout.good');
    assert.equal(json('docs/site').tagline, 'Still preserved'); assert.equal(json('docs/site').currentSeason, 2026);
    assert.equal(json('docs/season_2027')._aiImport.approved, true);
    assert.ok(!('_aiImport' in json('public/season_2027').season));
    const firstCommits = commits;
    await go('#/ai-import'); await page.selectOption('#aiTask', 'amendment');
    await page.selectOption('#aiYear', '2027'); await page.fill('#aiSources', 'ssr.pdf - SSR');
    await page.click('#aiGenerate'); const amended = F.payload('amendment'); amended.baseToken = await token();
    await read(amended); await checked(); assert.ok((await page.innerText('#aiConsequences')).includes('(0 documents)'));
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download local import draft' }).click();
    const saved = await (await download).path(); assert.ok(saved);
    await page.selectOption('#aiTask', 'competitors');
    await page.locator('label').filter({ hasText: 'Resume saved import draft' }).locator('input').setInputFiles(saved);
    await page.waitForSelector('#aiRulesApprove'); assert.equal(await page.inputValue('#aiTask'), 'amendment');
    assert.equal(commits, firstCommits);
    // A changed target invalidates the preview and requires rechecking.
    await checked(); await go('#/season');
    await page.getByText('Minimum starts to be eligible', { exact: true }).locator('..').locator('input').fill('2');
    await go('#/publish'); assert.equal(await page.isDisabled('#pubGo'), true);
    await go('#/ai-import'); await page.click('#aiStage'); assert.ok((await page.innerText('#toasts')).includes('draft changed'));
    await page.click('#aiRecheck'); await checked(); await page.click('#aiStage');
    await page.waitForSelector('.adm-main h1');
    await page.getByRole('heading', { name: 'Nothing to publish' }).waitFor();
    assert.equal(json('docs/season_2027').minStarts, 1);
    // Entry-only preparation adds names, never starts or results.
    await go('#/ai-import'); await page.selectOption('#aiTask', 'competitors'); await page.selectOption('#aiYear', '2027');
    await page.fill('#aiSources', 'entries.pdf - Official Entry List'); await page.click('#aiGenerate');
    const entries = F.payload('competitors', 2027); entries.baseToken = await token();
    entries.entryLists = [{ eventId: 'test-event', roundIds: ['R1'], sourceId: 'entries', complete: true,
      entries: [{ car: '1', driverRef: 'alex', codriverRef: 'new', class: 'OPEN', vehicle: 'Entry car',
        roundIds: ['R1'], status: 'entered', statusEvidence: '', participationEvidence: 'Regional day 1 entry',
        locator: 'Published regional row 1' }] }];
    await read(entries);
    const entryDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download local import draft' }).click();
    const entrySaved = await (await entryDownload).path();
    await page.locator('label').filter({ hasText: 'Resume saved import draft' }).locator('input').setInputFiles(entrySaved);
    await read(entries); await page.check('#aiEvidenceApprove'); await page.click('#aiPreview'); await page.click('#aiStage'); await publish();
    assert.equal(json('docs/people').people.length, 2); assert.ok(!store.has('docs/round_2027_R1'));
    assert.equal(json('public/season_2027').season.entryLists[0].entries.length, 1);
    await go('#/events'); await page.locator('.entry-editor summary').click();
    await page.getByText('Entry vehicle', { exact: true }).locator('..').locator('input').fill('Manually noted entry car');
    await publish();
    assert.equal(json('docs/season_2027').entryLists[0].entries[0].vehicle, 'Manually noted entry car');
    await go('#/history'); await page.getByRole('button', { name: 'Undo', exact: true }).first().click(); await publish();
    assert.equal(json('public/season_2027').season.entryLists[0].entries[0].vehicle, 'Entry car');
    await go('#/');
    const backupDownload = page.waitForEvent('download'); await page.click('#backupBtn');
    const backup = JSON.parse(fs.readFileSync(await (await backupDownload).path(), 'utf8'));
    assert.equal(backup.docs['data/seasons/2027/season.json'].entryLists[0].entries.length, 1);
    delete backup.docs['data/seasons/2027/season.json'].entryLists;
    refuseEntryLoss = true;
    await page.locator('label').filter({ hasText: 'Restore from a backup' }).locator('input').setInputFiles({
      name: 'synthetic-old-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))
    });
    await page.waitForTimeout(150);
    assert.ok((await page.innerText('#toasts')).includes('entry evidence retained'));
    refuseEntryLoss = false;
    // Results produce site-calculated points and private evidence.
    await go('#/ai-import'); await page.selectOption('#aiTask', 'results'); await page.selectOption('#aiYear', '2027');
    await page.selectOption('#aiRound', 'R1'); await page.fill('#aiSources', 'results.pdf - Final Classification'); await page.click('#aiGenerate');
    const result = F.payload('results', 2027); result.baseToken = await token();
    const duplicate = F.copy(result); duplicate.rounds[0].entries[0].codriverRef = 'alex';
    await read(duplicate); await page.check('#aiEvidenceApprove'); await page.click('#aiPreview');
    assert.ok((await page.innerText('#aiErrors')).includes('duplicate resolved'));
    assert.equal(await page.locator('#aiStage').count(), 0);
    result.competitors[0].name = 'A Test'; result.rounds[0].status = 'Provisional classification';
    await read(result);
    assert.ok((await page.innerText('main')).includes('provisional or unclear classification finality'));
    await page.check('#aiEvidenceApprove'); await page.click('#aiPreview');
    assert.ok((await page.innerText('#aiErrors')).includes('Acknowledge'));
    assert.equal(await page.locator('#aiStage').count(), 0);
    await page.check('#aiFinalityApprove'); await page.click('#aiPreview'); await page.click('#aiStage'); await publish();
    assert.ok(json('docs/round_2027_R1')._aiImport);
    assert.equal(json('docs/round_2027_R1').entries[0].driver, 'A Test');
    assert.equal(json('public/season_2027').rounds.R1.status, 'Provisional classification');
    assert.ok(!('_aiImport' in json('public/season_2027').rounds.R1));
    assert.equal(json('public/season_2027').season.entryLists[0].entries.length, 1);
    const publicPage = await ctx.newPage(); publicPage.on('pageerror', e => pageErrors.push(e.message));
    await publicPage.goto(base + '/index.html#/2027/standings'); await publicPage.waitForSelector('main table');
    assert.ok((await publicPage.innerText('main')).includes('Alex Test'));
    assert.ok((await publicPage.innerText('main')).includes('15'));
    await publicPage.goto(base + '/index.html#/2027/round/R1/classification');
    await publicPage.waitForSelector('.round-meta');
    assert.ok((await publicPage.innerText('.round-meta')).includes('Provisional sheet'));
    assert.ok((await publicPage.innerText('main')).includes('1 documented round entries'));
    await publicPage.goto(base + '/index.html#/person/alex-test'); await publicPage.waitForSelector('.profile-head');
    assert.ok((await publicPage.innerText('main')).includes('1 events entered'));
    assert.equal(await publicPage.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '1');
    const published = json('public/season_2027'), unclearBundle = F.copy(published);
    unclearBundle.rounds.R1.status = 'Classification'; unclearBundle.rounds.R1.finalityUnclear = true;
    set('public/season_2027', { json: { stringValue: JSON.stringify(unclearBundle) } });
    await publicPage.goto(base + '/index.html#/2027/round/R1/classification'); await publicPage.reload(); await publicPage.waitForSelector('.round-meta');
    assert.ok((await publicPage.innerText('.round-meta')).includes('Classification finality unclear'));
    assert.ok(!(await publicPage.innerText('.round-meta')).includes('Final classification'));
    await publicPage.goto(base + '/index.html#/2027/rounds'); await publicPage.reload();
    await publicPage.waitForSelector('main table');
    assert.ok((await publicPage.innerText('main table')).includes('Finality unclear'));
    set('public/season_2027', { json: { stringValue: JSON.stringify(published) } });
    const beforePartial = JSON.stringify(json('docs/round_2027_R1')), partialCommits = commits;
    await go('#/ai-import');
    const partial = F.copy(result);
    partial.coverage[0].locator = 'Page 2 of 2';
    partial.coverage[0].classification = { batchIndex: 2, totalBatches: 2, pages: [2], totalPages: 2, totalRows: 2 };
    await read(partial); assert.ok((await page.innerText('#aiErrors')).includes('Combine all batches'));
    assert.equal(await page.locator('#aiStage').count(), 0);
    const partialDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download local import draft' }).click();
    const partialSaved = JSON.parse(fs.readFileSync(await (await partialDownload).path(), 'utf8'));
    assert.deepEqual(JSON.parse(partialSaved.state.text), partial);
    assert.equal(commits, partialCommits); assert.equal(JSON.stringify(json('docs/round_2027_R1')), beforePartial);
    // Undo retains normal review/publish flow.
    await go('#/history'); await page.getByRole('button', { name: 'Undo', exact: true }).first().click(); await page.waitForSelector('#pubGo');
    await page.click('#pubGo'); await page.waitForSelector('.callout.good');
    assert.ok(!store.has('docs/round_2027_R1'));
    // Oversized documents are refused before any atomic commit is sent.
    const beforeSizeCheck = commits;
    await go('#/season');
    const notes = page.getByText('Season notes (shown under “Sources & data notes”)', { exact: true }).locator('..').locator('textarea');
    await notes.fill('x'.repeat(1048576)); await go('#/publish'); await page.click('#pubGo');
    assert.ok((await page.innerText('#toasts')).includes('1 MiB')); assert.equal(commits, beforeSizeCheck);
    await go('#/season'); await notes.fill('');
    // Publish revalidates an unrelated document loaded during revision rebase.
    await go('#/ai-import'); await page.selectOption('#aiTask', 'results'); await page.selectOption('#aiYear', '2027');
    await page.selectOption('#aiRound', 'R1'); await page.fill('#aiSources', 'results.pdf'); await page.click('#aiGenerate');
    result.baseToken = await token();
    await read(result); assert.equal(await page.isChecked('#aiFinalityApprove'), false);
    await page.check('#aiEvidenceApprove'); await page.check('#aiFinalityApprove'); await page.click('#aiPreview'); await page.click('#aiStage'); await publish();
    await go('#/results/R1'); await page.locator('tr[data-row="0"] input.wv').fill('Our changed car');
    await go('#/publish');
    const remoteSeason = json('docs/season_2027'); remoteSeason.minStarts = 2;
    remoteSeason.entryLists[0].entries[0].points = 50;
    set('docs/season_2027', { json: { stringValue: JSON.stringify(remoteSeason) } });
    set('config/revision', { n: { integerValue: '99' } });
    const beforeRebase = commits;
    await page.click('#pubGo'); await page.waitForTimeout(250);
    assert.ok((await page.innerText('#toasts')).includes('rules/settings changed'));
    assert.ok((await page.innerText('#toasts')).includes('unknown field points'));
    assert.equal(commits, beforeRebase);
    assert.equal(json('public/season_2027').rounds.R1.entries[0].vehicle, 'Test car');
    assert.deepEqual(pageErrors, []); assert.deepEqual(unexpected, []);
    console.log('PASS synthetic AI Import E2E: identity collisions, printed aliases, finality acknowledgment/public badges, partial-response retention/rejection, prompts, scoped drafts, resume, repeat imports, entries/results, privacy, undo, size limits and rebase validation.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
