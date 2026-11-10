/* Synthetic-only browser regression. All non-local traffic is intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const fixtures = require('./ai-fixtures.js').docs();
fixtures['data/site.json'].analytics = { enabled: true, measurementId: 'G-' + 'A'.repeat(10) };
const workingSeason = fixtures['data/seasons/2026/season.json'];
const workingPeople = fixtures['data/people.json'];
workingSeason.rounds[0].results = true;
workingPeople.people.push(
  { id: 'blake-example', name: 'Blake Example', aliases: [], bio: '', photo: '', links: {} },
  { id: 'blake-duplicate', name: 'Blake Duplicated', aliases: [], bio: '', photo: '', links: {} },
  { id: 'casey-match', name: 'Casey Match', aliases: [], bio: '', photo: '', links: {} },
  { id: 'drew-match', name: 'Drew Match', aliases: [], bio: '', photo: '', links: {} },
  { id: 'row-test', name: 'Test Entrant', aliases: [], bio: '', photo: '', links: {} }
);
const nrRound = { id: 'R1', title: 'Synthetic NR classification', status: 'Final Official Classification',
  stages: ['SS1', 'SS2'], source: { file: 'nr.pdf', url: 'https://example.com/nr.pdf' }, notes: [], entries: [
    { car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'OPEN', status: 'classified', pos: 1,
      times: ['01:10.0', null], total: '02:30.0', pen: null },
    { car: '3', driver: 'Casey Match', codriver: 'Drew Match', class: 'OPEN', status: 'classified', pos: 2,
      times: ['02:00.0', '03:00.0'], total: '05:00.0', pen: null }
  ] };
workingSeason.rallyesport = {
  ruleset: { code: 'clubman-sprint-2026-v1', year: 2026,
    title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
    version: 1, issueDate: '2026-07-09',
    sourceUrl: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf' },
  events: [{ id: 'synthetic-rs-event', name: 'Synthetic RS event', dates: 'Synthetic date',
    rulesetConfirmed: true, rulesetEvidence: 'Synthetic event applicability', countsForChampionship: true,
    championshipEvidence: 'Synthetic championship status', doublePoints: false }],
  starterMinimumReview: { minimum: 6, reviewed: true, evidence: 'Synthetic user-reported review; no written amendment supplied.' },
  membershipReview: {
    sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic reviewed membership roster.',
    people: Object.fromEntries(workingPeople.people.map(person => [person.id, { status: 'eligible', basis: 'membership-sheet' }]))
  },
  nonScoringPeople: ['blake-duplicate'],
  results: [{ id: 'synthetic-rs-result', eventId: 'synthetic-rs-event', title: 'Synthetic official classification',
    status: 'Final classification', nrRoundId: 'R1',
    source: { file: 'Synthetic attached source title', description: 'Synthetic official final classification' },
    notes: [], stages: [{ id: 'ss1', label: 'SS1', nrStage: 'SS1' }, { id: 'ss2', label: 'SS2', nrStage: 'SS2' }],
    entries: [
      { car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'RS2', status: 'classified', pos: 1, classPos: 1,
        total: '02:30.0', penalty: null, times: ['01:11.0', null], stagePos: [1, null], invited: false },
      { car: '3', driver: 'Casey Match', codriver: 'Drew Match', class: '2WD<SVG ONLOAD="WINDOW.RSXSS=1">', status: 'classified', pos: 2, classPos: 2,
        total: '05:00.0', penalty: null, times: [null, null], stagePos: [null, null], invited: false },
      { car: '99', driver: 'Test Entrant', codriver: '', class: 'TEST', status: 'TEST', pos: null, classPos: null,
        total: null, penalty: null, times: [null, null], stagePos: [null, null], invited: false }
    ] }]
};
const repo = path.resolve(__dirname, '..', '..');
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const docs = new Map(), writes = [], external = [], errors = [];
const field = value => ({ stringValue: JSON.stringify(value) });
function put(key, fields) { docs.set(key, { name: prefix + key, fields, updateTime: '2027-01-01T00:00:00Z' }); }
put('docs/site', { json: field(fixtures['data/site.json']) });
put('docs/people', { json: field(fixtures['data/people.json']) });
put('docs/season_2026', { json: field(fixtures['data/seasons/2026/season.json']) });
put('docs/round_2026_R1', { json: field(nrRound) });
put('public/site', { json: field(fixtures['data/site.json']) });
put('public/people', { json: field(fixtures['data/people.json']) });
put('public/season_2026', { json: field({ season: AI.projectPublic(workingSeason, workingPeople), rounds: { R1: nrRound } }) });
const historicalSeason = JSON.parse(JSON.stringify(workingSeason));
delete historicalSeason.rallyesport;
put('history/rs-overwrite-1', { group: { stringValue: 'rs-overwrite-1' }, at: { stringValue: '2026-12-01T00:00:00Z' },
  by: { stringValue: 'Synthetic User' }, message: { stringValue: 'Older NR season update' },
  path: { stringValue: 'data/seasons/2026/season.json' }, kind: { stringValue: 'update' },
  before: { stringValue: JSON.stringify(historicalSeason) }, after: { stringValue: JSON.stringify(workingSeason) } });
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
  let release, waiting, block = false, denyAdmins = false, removeAdmin = false, rejectRsWarning = false;
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
    const page = await ctx.newPage(), dialogs = [], dialogWaiters = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => {
      dialogs.push(d.message());
      if (dialogWaiters.length) dialogWaiters.shift()(d.message());
      if (rejectRsWarning && /RallyeSport data/.test(d.message())) await d.dismiss();
      else await d.accept();
    });
    const signin = () => page.locator('#signInBtn').waitFor();
    const admin = () => page.locator('.adm-main').waitFor();
    const nextDialogMessage = () => new Promise(resolve => dialogWaiters.push(resolve));
    const absent = async () => {
      await signin();
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.equal(await page.locator('link[rel="icon"][type="image/png"]').getAttribute('href'), '../assets/favicon.png');
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
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.deepEqual(await page.locator('.brand-mark').evaluate(async img => { await img.decode(); return [img.getAttribute('src'), img.naturalWidth, img.naturalHeight]; }),
        ['../assets/official-logo.jpg', 270, 143]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (width <= 390) assert.equal(await page.locator('.adm-top .brand').evaluate(el =>
        el.getBoundingClientRect().bottom <= el.parentElement.querySelector('.chg').getBoundingClientRect().top + 1), true);
    }
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText('Ruleset evidence').waitFor();
    const starterThreshold = page.getByLabel('Threshold used for RS event points');
    const starterEvidence = page.getByLabel('Six-starter review evidence');
    const membershipStatus = page.getByLabel('Membership eligibility for Alex Test');
    const membershipBasis = page.getByLabel('Decision basis for Alex Test');
    const membershipEvidence = page.getByLabel('Private override provenance for Alex Test');
    assert.equal(await starterThreshold.inputValue(), 'six');
    assert.match(await starterEvidence.inputValue(), /Synthetic user-reported review/);
    assert.equal(await membershipStatus.inputValue(), 'eligible');
    assert.equal(await membershipBasis.inputValue(), 'membership-sheet');
    assert.equal(await membershipEvidence.isDisabled(), true);
    await membershipBasis.selectOption('user-confirmed');
    assert.equal(await membershipEvidence.isDisabled(), false);
    await membershipEvidence.fill('Synthetic separate user-confirmed provenance.');
    assert.equal(await membershipEvidence.inputValue(), 'Synthetic separate user-confirmed provenance.');
    await membershipStatus.selectOption('missing-license');
    assert.equal(await membershipStatus.inputValue(), 'missing-license');
    await membershipStatus.selectOption('eligible');
    await membershipBasis.selectOption('membership-sheet');
    assert.equal(await membershipEvidence.inputValue(), '');
    assert.equal(await membershipEvidence.isDisabled(), true,
      'changing away from a user-confirmed override clears and disables its private per-person evidence');
    await starterThreshold.selectOption('ssr-v1');
    assert.equal(await starterEvidence.isDisabled(), true, 'evidence control is disabled for the SSR baseline');
    await starterThreshold.selectOption('six');
    assert.equal(await starterEvidence.isDisabled(), false, 'evidence control is enabled for the six-starter review');
    await starterEvidence.fill('Synthetic user-reported review; no written amendment supplied.');
    assert.equal(await page.getByLabel('Source file/title').inputValue(), 'Synthetic attached source title');
    assert.equal(await page.getByLabel('Official source URL').inputValue(), '');
    assert.equal(await page.getByLabel('Source description').inputValue(), 'Synthetic official final classification');
    assert.equal(await page.getByLabel('Printed RS category').nth(2).inputValue(), 'TEST');
    assert.equal(await page.getByLabel('Printed RS status').nth(2).inputValue(), 'TEST');
    const unsafeCategoryLabel = 'Scoring class for printed 2WD<SVG ONLOAD="WINDOW.RSXSS=1">';
    await page.getByLabel(unsafeCategoryLabel).selectOption('RS2');
    assert.equal(await page.locator('svg[onload]').count(), 0, 'printed categories render as text, not executable markup');
    await page.getByLabel('Scoring-class mapping evidence').fill('Synthetic event-specific mapping evidence');
    assert.equal(await page.getByLabel('Printed RS category').nth(1).inputValue(), '2WD<SVG ONLOAD="WINDOW.RSXSS=1">');
    const stageTimes = page.locator('input[placeholder^="e.g. 01:23.45"]');
    await stageTimes.nth(0).fill('01:11.0');
    await page.getByRole('button', { name: 'Review and copy mapped NR stage times' }).click();
    await page.getByText(/stage times and provenance must align/).waitFor();
    assert.equal(await stageTimes.nth(0).inputValue(), '01:11.0');
    await stageTimes.nth(0).fill('01:11.0, ');
    await page.getByRole('button', { name: 'Review and copy mapped NR stage times' }).click();
    await page.getByText(/Copied 2 reviewed blank RS stage value/).waitFor();
    const review = dialogs[dialogs.length - 1];
    assert.match(review, /New blank RS times to copy: 2/);
    assert.match(review, /Conflicting existing RS times \(left unchanged\): 1/);
    assert.match(review, /Missing mapped NR observations \(left unchanged\): 1/);
    assert.match(review, /Unmatched RS-only\/unresolved crews \(preserved\): 1/);
    assert.match(await stageTimes.nth(0).inputValue(), /^01:11\.0, $/);
    assert.equal(await stageTimes.nth(1).inputValue(), '02:00.0, 03:00.0');
    assert.equal(await stageTimes.nth(2).inputValue(), ', ');
    await page.evaluate(() => location.hash = '#/competitor/blake-example');
    await page.getByLabel('Duplicate profile').selectOption('blake-duplicate');
    await page.getByRole('button', { name: 'Merge', exact: true }).click();
    assert.match(dialogs[dialogs.length - 1], /Merge Blake Duplicated into Blake Example/);
    await page.evaluate(() => location.hash = '#/rallyesport');
    assert.equal(await page.getByRole('checkbox', { name: /Blake Example — Manual RS scoring exclusion/ }).isChecked(), true);
    assert.equal(await page.getByRole('checkbox', { name: /Blake Duplicated — Manual RS scoring exclusion/ }).count(), 0);
    assert.equal(await page.getByLabel('Membership eligibility for Blake Example').inputValue(), 'eligible');
    assert.equal(await page.getByLabel('Membership eligibility for Blake Duplicated').count(), 0,
      'profile merges move the reviewed membership decision to the surviving stable ID');

    const backupWithoutRs = JSON.parse(JSON.stringify(workingSeason));
    delete backupWithoutRs.rallyesport;
    const oldBackup = { format: 'nr-rally-backup', version: 1, exportedAt: '2026-01-01T00:00:00Z',
      docs: { 'data/site.json': fixtures['data/site.json'], 'data/people.json': workingPeople,
        'data/seasons/2026/season.json': backupWithoutRs }, photos: {} };
    const backupWithoutSeason = { format: 'nr-rally-backup', version: 1, exportedAt: '2025-01-01T00:00:00Z',
      docs: { 'data/site.json': fixtures['data/site.json'], 'data/people.json': workingPeople }, photos: {} };
    await page.evaluate(() => location.hash = '#/');
    await page.getByText('Backups', { exact: true }).waitFor();
    rejectRsWarning = true;
    const oldBackupPrompt = nextDialogMessage(), oldBackupRsWarning = nextDialogMessage();
    await page.locator('label.file-btn').filter({ hasText: 'Restore from a backup' }).locator('input[type=file]')
      .setInputFiles({ name: 'synthetic-pre-rs-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(oldBackup)) });
    assert.match(await oldBackupPrompt, /Replace the working copy with the backup/);
    assert.match(await oldBackupRsWarning, /source and stage-time evidence.*Non-Scoring RS Member decisions/);
    await page.evaluate(() => location.hash = '#/rallyesport');
    assert.equal(await page.getByRole('checkbox', { name: /Blake Example — Manual RS scoring exclusion/ }).isChecked(), true);
    assert.equal(await stageTimes.nth(0).inputValue(), '01:11.0, ');
    await page.evaluate(() => location.hash = '#/');
    await page.getByText('Backups', { exact: true }).waitFor();
    const deleteSeasonPrompt = nextDialogMessage(), deleteSeasonRsWarning = nextDialogMessage();
    await page.locator('label.file-btn').filter({ hasText: 'Restore from a backup' }).locator('input[type=file]')
      .setInputFiles({ name: 'synthetic-season-deletion-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backupWithoutSeason)) });
    assert.match(await deleteSeasonPrompt, /Replace the working copy with the backup/);
    assert.match(await deleteSeasonRsWarning, /delete RallyeSport data/);
    rejectRsWarning = false;
    await page.evaluate(() => location.hash = '#/history');
    await page.getByText('Older NR season update').waitFor();
    rejectRsWarning = true;
    const undoUnpublishedPrompt = nextDialogMessage(), undoRsWarning = nextDialogMessage();
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.match(await undoUnpublishedPrompt, /unpublished changes.*Undoing this change/);
    assert.match(await undoRsWarning, /History undo will replace or delete RallyeSport data/);
    rejectRsWarning = false;
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText('Ruleset evidence').waitFor();
    assert.equal(await page.getByRole('checkbox', { name: /Blake Example — Manual RS scoring exclusion/ }).isChecked(), true);
    await page.reload(); await admin();
    assert.ok(await page.locator('#demoBtn').isVisible());
    await page.click('#demoBtn'); await page.locator('.demo-bar').waitFor();
    assert.match(await page.locator('.demo-bar').innerText(), /Simulation.*nothing is ever saved/);
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText(/Demo data is a public projection/).waitFor();
    await page.evaluate(() => location.hash = '#/publish');
    await page.getByText('Nothing to publish').waitFor();
    await page.evaluate(() => location.hash = '#/');
    await page.locator('#nsYear').fill('2027');
    await page.getByLabel('Copy settings from').selectOption('2026');
    await page.getByRole('button', { name: 'Create season' }).click();
    await page.locator('#yearSel').waitFor();
    assert.equal(await page.locator('#yearSel').inputValue(), '2027');
    await page.evaluate(() => location.hash = '#/season');
    await page.getByRole('button', { name: 'Open the public site on 2027' }).waitFor();
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText('No scoring rules are configured for 2027. Do not copy the 2026 profile into another year without applicable regulations.').waitFor();
    await page.getByText('No RS events are recorded for this season. Adding an RS event does not require adding an NR event.').waitFor();
    assert.equal(await page.getByText('Synthetic RS event', { exact: true }).count(), 0,
      'the real admin rollover does not copy prior-year RS events or classifications');
    await page.locator('#yearSel').selectOption('2026');
    await page.getByText('Synthetic RS event', { exact: true }).waitFor();
    assert.equal(writes.length, 0, 'the rollover rehearsal remains an unpublished demo');
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText(/Demo data is a public projection/).waitFor();
    await page.getByLabel('Review state').selectOption('true');
    await page.getByLabel('Private source provenance').fill('Synthetic demo-only review evidence; no real roster is available.');
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    assert.equal(await page.locator('#addAdminBtn').count(), 0);
    assert.ok(await page.isChecked('#analyticsEnabled'));
    assert.equal(await page.locator('script[src*="googletagmanager"]').count(), 0);
    await page.uncheck('#analyticsEnabled');
    await page.evaluate(() => location.hash = '#/history'); await page.getByText('The history is kept in the database. Sign in to see it.').waitFor();
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    await page.getByText('Tagline', { exact: true }).locator('..').locator('input').fill('Synthetic practice change');
    await page.evaluate(() => location.hash = '#/publish'); await page.locator('#pubGo').waitFor();
    assert.equal(await page.locator('#pubGo').isDisabled(), false,
      'synthetic demo review inputs allow validation without treating the public projection as private eligibility evidence');
    await page.click('#pubGo'); await page.getByText(/Demo:.*would have been saved/).waitFor();
    assert.equal(writes.length, 0);
    assert.equal(JSON.parse(docs.get('public/site').fields.json.stringValue).analytics.enabled, true);
    await page.evaluate(() => location.hash = '#/rallyesport');
    await page.getByText('Ruleset evidence').waitFor();
    await page.getByRole('button', { name: /verified 2026 SSR V1/ }).click();
    await page.getByRole('button', { name: '+ Add RS event' }).click();
    const newRsEvent = page.locator('article').filter({ hasText: 'New RallyeSport event' });
    await newRsEvent.getByLabel('RS event name').waitFor();
    assert.ok(await page.getByText('No NR event association', { exact: true }).count());
    await newRsEvent.getByLabel('Reviewed event starter count (optional)').waitFor();
    await newRsEvent.getByRole('button', { name: '+ Add classification' }).click();
    await newRsEvent.getByRole('button', { name: '+ Add selected RS stage' }).click();
    await newRsEvent.getByRole('button', { name: '+ Add classification row' }).waitFor();
    await newRsEvent.getByRole('button', { name: '+ Add classification row' }).click();
    await newRsEvent.getByLabel('Source file/title').waitFor();
    assert.ok(await newRsEvent.getByLabel('Source description').count());
    assert.ok(await newRsEvent.getByLabel('Printed RS category').count());
    assert.ok(await newRsEvent.getByLabel('Printed RS status').count());
    assert.ok(await newRsEvent.locator('.fld').filter({ hasText: 'Printed RS status' }).count());
    assert.ok(await newRsEvent.getByLabel('Separate scoring-finality review').count());
    const finalityReview = newRsEvent.getByLabel('Separate scoring-finality review');
    const finalityEvidence = newRsEvent.getByLabel('Finality-review evidence');
    assert.equal(await finalityEvidence.isDisabled(), true,
      'finality evidence cannot be edited unless the separate review is selected');
    await finalityReview.selectOption('user-confirmed');
    assert.equal(await finalityEvidence.isDisabled(), false);
    await finalityEvidence.fill('Synthetic user-confirmed classification finality.');
    await finalityReview.selectOption('');
    assert.equal(await finalityEvidence.isDisabled(), true,
      'deselecting the review disables its evidence field');
    await finalityEvidence.evaluate(el => {
      el.disabled = false;
      el.value = 'Synthetic text must not reactivate finality.';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => location.hash = '#/publish');
    await page.locator('#pubGo').waitFor();
    await page.evaluate(() => location.hash = '#/rallyesport');
    await newRsEvent.getByLabel('Finality-review evidence').waitFor();
    assert.equal(await finalityReview.inputValue(), '',
      'editing evidence after deselection does not recreate a scoring-finality review');
    assert.equal(await finalityEvidence.isDisabled(), true);
    await newRsEvent.getByLabel('Reviewed driver identity (optional)').selectOption('alex-test');
    await newRsEvent.getByLabel('Reviewed co-driver identity (optional)').selectOption('blake-example');
    await newRsEvent.getByLabel('Identity-review evidence').fill('Synthetic reviewed driver and co-driver roles; printed names remain unchanged.');
    assert.ok(await page.getByText(/Manual RS scoring exclusion/).count());
    assert.ok(await page.locator('.fld').filter({ hasText: 'Invitation status' }).count());
    await page.click('#leaveDemoBtn'); await page.locator('.demo-bar').waitFor({ state: 'detached' }); await admin();
    assert.equal(await page.locator('.demo-bar').count(), 0);
    await page.evaluate(() => location.hash = '#/site'); await page.locator('#activeRallyEnabled').waitFor();
    assert.notEqual(await page.getByText('Tagline', { exact: true }).locator('..').locator('input').inputValue(), 'Synthetic practice change');
    assert.ok(await page.isChecked('#analyticsEnabled'));
    assert.equal(await page.locator('script[src*="googletagmanager"]').count(), 0);
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
