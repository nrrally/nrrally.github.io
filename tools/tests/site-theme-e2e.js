/* Synthetic public-site checks only; never reads or writes the live database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const repo = path.resolve(__dirname, '..', '..');
const docs = F.docs(), source = F.payload('results', 2026).rounds[0];
const season = JSON.parse(JSON.stringify(docs['data/seasons/2026/season.json']));
const nrEventId = season.events[0].id;
const people = F.copy(docs['data/people.json']);
people.people.push({ id: 'blake-example', name: 'Blake Example', aliases: [], bio: '', photo: '', links: {} });
for (let i = 1; i <= 15; i++) {
  people.people.push({ id: 'rs-driver-' + i, name: 'Synthetic Driver ' + i, aliases: [], bio: '', photo: '', links: {} });
  people.people.push({ id: 'rs-codriver-' + i, name: 'Synthetic Co-driver ' + i, aliases: [], bio: '', photo: '', links: {} });
}
const rsEvents = [1, 2, 3, 4, 5].map(roundNumber => ({
  id: 'synthetic-rs-r' + roundNumber, roundNumber, name: 'Synthetic RS R' + roundNumber,
  dates: '2026-0' + roundNumber + '-01', rulesetConfirmed: true, rulesetEvidence: 'Synthetic SSR applicability',
  countsForChampionship: true, championshipEvidence: 'Synthetic round evidence', doublePoints: false,
  nrEventId: roundNumber === 2 ? nrEventId : undefined
}));
const rsResult = {
  id: 'synthetic-rs-r2-results', eventId: rsEvents[1].id, title: 'Synthetic RS final classification',
  status: 'Final classification', nrRoundId: 'R1', source: { file: 'synthetic-rs.pdf', url: 'https://example.com/synthetic-rs.pdf' },
  notes: [], stages: [{ id: 'ss1', label: 'SS1', nrStage: 'SS1' }],
  entries: Array.from({ length: 15 }, (_, i) => ({
    car: String(i + 1), driver: 'Alex Test', codriver: 'Blake Example', class: 'RS2', status: 'classified',
    pos: i + 1, classPos: i + 1, times: ['00:01.' + String(i + 1).padStart(2, '0')],
    stagePos: [i + 1], penalty: null, total: '00:01.' + String(i + 1).padStart(2, '0'), invited: false
  }))
};
season.rallyesport = { ruleset: { code: 'clubman-sprint-2026-v1', year: 2026, title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
  version: 1, issueDate: '2026-07-09', sourceUrl: 'https://example.com/synthetic-rs-ssr.pdf' },
events: rsEvents, results: [rsResult], nonScoringPeople: [] };
rsResult.entries.forEach((entry, i) => {
entry.driver = 'Synthetic Driver ' + (i + 1);
entry.codriver = 'Synthetic Co-driver ' + (i + 1);
});
const initialRsProjection = AI.projectPublic(season, people);
const initialRsData = F.copy(initialRsProjection.rallyesport);
const bundle = { season: initialRsProjection, rounds: { R1: {
...source, entries: source.entries.map(e => ({ ...e, driver: 'Alex Test', codriver: 'Blake Example' }))
} } };
const published = {
site: { ...docs['data/site.json'], siteName: 'Northern Regions Rally', tagline: 'Synthetic preview data only.' },
people, season_2026: bundle
};
const errors = [], unexpected = [];
let databaseDown = false;
let configured = true, seasonDelay = 0;
let legacyEngine = false;
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
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url.startsWith(base + '/assets/engine.js') && legacyEngine) return route.fulfill({
        contentType: 'text/javascript', body: fs.readFileSync(path.join(repo, 'assets', 'engine.js'), 'utf8') +
          `\nconst build = window.NREngine.buildSeason; window.NREngine.buildSeason = opts => {
            const m = build(opts); delete m.entryLists;
            m.people.forEach(p => delete p.entries); m.rounds.forEach(r => delete r.entryParticipation); return m;
          }; delete window.NREngine.entryContractVersion;`
      });
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
      assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://nrrally.co.za/');
      assert.equal(await page.locator('meta[name="robots"]').count(), 0);
      assert.equal(await page.locator('[itemscope][itemtype="https://schema.org/WebSite"]').count(), 1);
      assert.equal(await page.locator('meta[itemprop="name"]').getAttribute('content'), 'Northern Regions Rally');
      assert.equal(await page.locator('link[rel="icon"][type="image/png"]').getAttribute('href'), 'assets/favicon.png');
      assert.deepEqual(await page.locator('.brand-mark').evaluate(async img => { await img.decode(); return [img.getAttribute('src'), img.naturalWidth, img.naturalHeight]; }),
        ['assets/official-logo.jpg', 270, 143]);
      assert.equal(await page.locator('.site-disclosure').count(), 1);
      assert.equal(await page.locator('.site-disclosure a[href="disclaimer.html"]').count(), 1);
      assert.equal(await page.locator('.footer a[href="disclaimer.html"]').count(), 1);
      assert.ok((await page.innerText('.site-disclosure')).includes('not this site'));
    };
    const noOverflow = async () => assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth), true);
    const eventCount = async expected => {
      for (const hash of ['#/', '#/rounds']) {
        await visit(hash);
        if (expected) assert.equal(await page.locator('.event-top > .small').innerText(), expected);
        else assert.equal(await page.locator('.event-top > .small').count(), 0);
        assert.ok((await page.locator('.event-top > .meta').innerText()).endsWith('gravel'));
        assert.equal(await page.locator('.event-top > .meta + .small').count(), expected ? 1 : 0);
        const text = await page.innerText('main');
        assert.ok(!text.includes('documented event crew entries'));
        assert.ok(!text.includes('documented event entries'));
        assert.ok(!text.includes('day scope only where evidenced'));
        assert.ok(!text.includes('Points for R1 are calculated on this site.'));
        assert.ok(!text.includes('Treat them as provisional until MSA publishes.'));
        await noOverflow();
      }
    };
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const hash of ['#/', '#/standings', '#/standings/codrivers', '#/standings?class=OPEN', '#/rounds',
        '#/round/R1/graph', '#/round/R1/classification', '#/round/R1/stages', '#/round/missing',
        '#/crews', '#/person/alex-test', '#/person/missing', '#/info', '#/about', '#/2026/about',
        '#/getting-started', '#/getting-started/national-regional', '#/2026/getting-started/ready', '#/missing']) {
        await visit(hash); await noOverflow();
        if (hash === '#/') {
          assert.equal(await page.locator('.hero > p').last().innerText(), published.site.tagline);
          assert.deepEqual(await page.locator('.hero-actions a').allTextContents(),
            ['Open the latest stage graph', 'Championship standings', 'Getting started in NR Rally']);
        }
        if (hash.startsWith('#/standings')) assert.equal(await page.locator('.page-head p').last().innerText(),
          'Overall + class points · Minimum 1 starts for eligibility.');
        if (hash === '#/rounds') assert.equal(await page.locator('.page-head p').last().innerText(),
          'Choose a round for graphs, classifications and stage times.');
        if (hash === '#/crews') assert.equal(await page.locator('.page-head p').last().innerText(),
          'Drivers and co-drivers in 2026 Northern Regions classifications and entry lists.');
      }
    }
    const projectedScoring = initialRsProjection.rallyesport.scoring;
    assert.equal(projectedScoring.results.find(row => row.eventId === rsEvents[1].id).status, 'ready');
    assert.ok(projectedScoring.provisionalStandings, 'unresolved rounds leave supported RS points available provisionally');
    assert.equal(initialRsProjection.rallyesport.nonScoringPeople, undefined);
    assert.equal(initialRsProjection.rallyesport.results[0].entries[0].invited, undefined);
    assert.equal(initialRsProjection.rallyesport.events[0].rulesetConfirmed, undefined);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/');
        const nrHeroStats = await page.locator('.hero-stats').innerText();
        assert.equal(await page.getByRole('heading', { name: 'Class leaders · drivers' }).count(), 1);
        assert.equal(await page.getByRole('link', { name: 'Show RS driver leaders' }).count(), 1);
        assert.equal(await page.getByRole('link', { name: 'Show RS co-driver leaders' }).count(), 1);
        assert.equal(await page.getByRole('link', { name: 'Show RS class leaders' }).count(), 1);
        assert.equal(await page.getByRole('link', { name: 'Switch to RS results' }).count(), 1);
        assert.equal(await page.locator('.rs-event-card').count(), 0, 'standalone RS events stay out of default NR result cards');
        await page.getByRole('link', { name: 'Show RS class leaders' }).click();
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        assert.ok((await page.locator('.home-rs-note').innerText()).includes('Provisional RS points'));
        assert.ok((await page.locator('.home-rs-classes').innerText()).includes('Provisional RS points'));
        await page.getByRole('link', { name: 'Show NR class leaders' }).click();
        const driverToggle = page.getByRole('link', { name: 'Show RS driver leaders' });
        await driverToggle.focus(); await page.keyboard.press('Enter');
        await page.getByRole('heading', { name: 'RS drivers', exact: true }).waitFor();
        assert.ok((await page.locator('.leader-card-head').allTextContents()).some(text => text.includes('RS co-drivers')));
        assert.ok((await page.locator('.home-rs-note').innerText()).includes('Provisional RS points'));
        const rsLeader = page.locator('.leader-card-head').filter({ hasText: 'RS drivers' }).locator('xpath=..').locator('.leader').first();
        assert.ok((await rsLeader.innerText()).includes('Synthetic Driver 1'));
        assert.ok((await rsLeader.innerText()).includes('15pts'), 'the public UI consumes the projected event points');
        assert.equal(await page.locator('.hero-stats').innerText(), nrHeroStats, 'NR hero statistics do not change with RS views');
        await page.getByRole('link', { name: 'Show RS class leaders' }).click();
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        assert.ok((await page.locator('.home-rs-classes').innerText()).includes('Synthetic Driver 1'));
        await page.getByRole('link', { name: 'Show NR class leaders' }).click();
        await page.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
        await page.getByRole('link', { name: 'Show NR driver leaders' }).click();
        await page.getByRole('heading', { name: 'Drivers', exact: true }).waitFor();
        const resultsToggle = page.getByRole('link', { name: 'Switch to RS results' });
        await resultsToggle.focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => location.hash.includes('results=rs') &&
          document.querySelectorAll('.rs-event-card').length === 5);
        assert.equal(await page.locator('.rs-event-card').count(), 5);
        assert.ok((await page.locator('.rs-event-card').first().innerText()).includes('RS R1'));
        assert.equal(await page.locator('.event-card:not(.rs-event-card)').count(), 0);
        const nrResultsToggle = page.getByRole('link', { name: 'Switch to NR results' });
        await nrResultsToggle.focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => !location.hash.includes('results=rs') &&
          document.querySelectorAll('.rs-event-card').length === 0);
        assert.equal(await page.locator('.rs-event-card').count(), 0);
        assert.equal(await page.locator('.event-card:not(.rs-event-card)').count(), 1);
        await visit('#/rounds');
        await page.waitForFunction(() => document.querySelectorAll('.competition-badge').length === 5);
        assert.equal(await page.locator('.event-card').count(), 5, 'explicitly shared RS event is merged into its NR event card');
        assert.deepEqual(await page.locator('.competition-badge').allTextContents(), ['NR + RS', 'RS', 'RS', 'RS', 'RS']);
        assert.equal(await page.locator('.rs-event-card').count(), 4, 'only unlinked RS events get separate full-calendar cards');
        assert.equal(await page.locator('.event-round[href*="/rallyesport/"]').count(), 1);
        await noOverflow();
      }
    }
    // A bundled guide is readable without results; topic navigation works by keyboard.
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/getting-started');
        assert.equal(await page.locator('main h1').innerText(), 'Getting started in NR Rally');
        const opening = await page.locator('.getting-started .page-head').innerText();
        assert.ok(opening.includes('Come watch a Northern Regions rally'));
        assert.ok(!/\blicen[cs]e|eligibility|approved|first three steps/i.test(opening));
        assert.equal(await page.locator('.guide-orientation').count(), 0);
        assert.ok(!/rally[- ]raid/i.test(await page.locator('.getting-started').textContent()));
        assert.equal(await page.locator('.nav a[aria-current="page"]').innerText(), 'Getting started');
        assert.ok(await page.locator('.nav a.active').evaluate(el => {
          const a = el.getBoundingClientRect(), n = el.closest('nav').getBoundingClientRect();
          return a.left >= n.left - 1 && a.right <= n.right + 1;
        }), 'Active guide navigation remains visible on mobile');
        assert.equal(await page.locator('#seasonSel').count(), 0);
        assert.equal(await page.locator('main details').count(), 10);
        if (process.env.GUIDE_SCREENSHOT_DIR && theme === 'light' && [1440, 390].includes(width)) {
          fs.mkdirSync(process.env.GUIDE_SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({ path: path.join(process.env.GUIDE_SCREENSHOT_DIR, 'nr-guide-' + width + '.png') });
        }
        for (const detail of await page.locator('main details').all()) {
          await detail.locator('summary').focus();
          await page.keyboard.press('Enter');
          assert.equal(await detail.getAttribute('open'), '');
        }
        assert.ok((await page.locator('main').innerText()).includes('Entering does not establish a start'));
        await noOverflow();
        const jump = page.locator('.guide-jumps a[href="#/getting-started/during"]');
        await jump.focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement.id === 'guide-during');
        assert.ok(await page.locator('#guide-during').isVisible());
        assert.ok(await page.locator('#guide-during').evaluate(el => el.getBoundingClientRect().top >=
          document.querySelector('.site-header').getBoundingClientRect().bottom));
      }
    }
    await visit('#/getting-started');
    await page.emulateMedia({ media: 'print' });
    assert.ok(await page.locator('.guide-detail').first().isVisible(), 'Print includes collapsed guide detail');
    assert.ok(await page.locator('.site-disclosure').isVisible());
    await page.emulateMedia({ media: 'screen' });
    await visit('#/');
    await page.locator('.hero-actions').getByRole('link', { name: 'Getting started in NR Rally', exact: true }).click();
    await page.getByRole('heading', { name: 'Getting started in NR Rally', exact: true }).waitFor();
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
    // Source evidence remains keyboard-accessible on every round tab, with badges outside the disclosure.
    const notesBefore = F.copy(bundle.rounds.R1.notes), sourceBefore = F.copy(bundle.rounds.R1.source);
    const crewNotesBefore = F.copy(bundle.rounds.R1.entries[0].notes);
    bundle.rounds.R1.notes = ['Synthetic round discrepancy & source evidence'];
    bundle.rounds.R1.entries[0].notes = ['Synthetic crew discrepancy <evidence>'];
    bundle.rounds.R1.source.pdf = 'https://example.com/classification.pdf';
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/round/R1/graph');
        for (const [tab, name] of [['graph', 'Stage graph'], ['classification', 'Classification'], ['stages', 'Stage times']]) {
          await page.locator('.tabs').getByRole('link', { name, exact: true }).click();
          await page.waitForSelector('.tabs a.on[href$="/' + tab + '"]');
          const notes = page.locator('details.notes'), summary = notes.locator('summary');
          assert.equal(await summary.innerText(), 'Source & notes');
          assert.equal(await notes.getAttribute('open'), null);
          assert.equal(await notes.locator('div').isVisible(), false);
          assert.ok(await page.locator('.round-meta .badge.final').isVisible());
          assert.ok(await page.locator('.round-meta .badge.calc').isVisible());
          await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await notes.locator('div').isVisible(), true);
          const text = await notes.innerText();
          assert.ok(text.includes(bundle.rounds.R1.title));
          assert.ok(text.includes(bundle.rounds.R1.status));
          assert.ok(text.includes(bundle.rounds.R1.source.file));
          assert.ok(text.includes('Live timing is not used.'));
          assert.ok(text.includes('Synthetic round discrepancy & source evidence'));
          assert.ok(text.includes('Car 1: Synthetic crew discrepancy <evidence>'));
          assert.equal(await notes.locator('evidence').count(), 0);
          assert.equal(await notes.locator('a[href="' + sourceBefore.url + '"]').count(), 1);
          assert.ok(await notes.getByRole('link', { name: 'the official PDF', exact: true }).isVisible());
          await noOverflow();
          await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await notes.locator('div').isVisible(), false);
        }
      }
    }
    bundle.rounds.R1.notes = notesBefore; bundle.rounds.R1.source = sourceBefore;
    bundle.rounds.R1.entries[0].notes = crewNotesBefore;
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
    bundle.season.rallyesport = {
      ruleset: { code: 'clubman-sprint-2026-v1', year: 2026 },
      events: [{ id: 'synthetic-rs', name: 'Synthetic RS-only event', dates: 'Synthetic date' }],
      results: [{ id: 'synthetic-rs-result', eventId: 'synthetic-rs', title: 'Synthetic final result',
        status: 'Final classification', source: { file: 'synthetic.pdf', url: 'https://example.com/synthetic.pdf' },
        notes: [], stages: [{ id: 'stage1', label: 'Stage 1' }, { id: 'stage2', label: 'Stage 2' }, { id: 'stage3', label: 'Stage 3' }],
        entries: [{ car: '88', driver: 'Alex Test', codriver: 'Blake Example', class: 'TEST', status: 'TEST',
          pos: null, classPos: 3, times: ['00:01.0', null, '00:03.0'], stagePos: [null, null, 7], penalty: null, total: null }] }]
    };
    await visit('#/rallyesport/synthetic-rs-result');
    assert.equal(await page.locator('main h1').innerText(), 'Synthetic RS-only event');
    assert.deepEqual(await page.locator('main table thead th').allTextContents(),
      ['Official position', 'Official class position', 'Car', 'Driver', 'Co-driver', 'Class', 'Official status',
        'Stage 1', 'Stage 2', 'Stage 3', 'Penalty', 'Official total']);
    const rsCells = page.locator('main table tbody tr').first().locator('td');
    assert.equal(await rsCells.nth(0).innerText(), 'TEST');
    assert.equal(await rsCells.nth(1).innerText(), '3');
    assert.equal(await rsCells.nth(6).innerText(), 'TEST');
    assert.equal(await rsCells.nth(7).innerText(), '00:01.0');
    assert.equal(await rsCells.nth(8).innerText(), '—');
    assert.equal(await rsCells.nth(9).innerText(), '00:03.0');
    assert.ok(!(await page.locator('main table tbody').innerText()).includes('DNS'));
    const graphResult = bundle.season.rallyesport.results[0];
    graphResult.nrRoundId = 'R1';
    graphResult.stages = [{ id: 'ss1', label: 'SS1', nrStage: 'SS1' }, { id: 'ss3', label: 'SS3', nrStage: 'SS3' }];
    graphResult.entries = [
      { car: '88', driver: 'Alex Test', codriver: '', class: 'RS2', status: 'classified', pos: 1, classPos: 1,
        total: '1:00.01', times: ['1:00.01', '00:01.00'], stagePos: [1, 1] },
      { car: '89', driver: 'Blake Example', codriver: '', class: 'RS2', status: 'classified', pos: 2, classPos: 2,
        total: '1:00.04', times: ['1:00.04', '00:01.00'], stagePos: [2, 1] }
    ];
    graphResult.entries.forEach(entry => { entry.class = '2WD'; });
    graphResult.classMappings = { '2WD': 'RS2' };
    graphResult.classMappingEvidence = 'Synthetic event-specific category review';
    await visit('#/rallyesport/synthetic-rs-result');
    assert.ok((await page.locator('main').innerText()).includes('Reviewed scoring-class mapping: 2WD → RS2'));
    assert.equal(await page.locator('main table tbody tr').first().locator('td').nth(5).innerText(), '2WD');
    await visit('#/2026/round/R1/graph?cars=1&m=loss&rs=1');
    assert.ok((await page.locator('.chart-title').innerText()).includes('Time lost'));
    assert.ok((await page.locator('main').innerText()).includes('separate source fields'));
    assert.ok((await page.locator('.axis text').allTextContents()).includes('+0.01s'));
    await page.locator('.hit[data-i="0"]').hover();
    const graphTip = page.locator('.tip');
    await graphTip.waitFor({ state: 'visible' });
    assert.ok((await graphTip.innerText()).includes('+0.03s'));
    delete bundle.season.rallyesport;
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
    assert.ok(!(await page.innerText('main')).includes('Entry does not prove a start.'));
    await page.getByRole('link', { name: 'Casey Entry', exact: true }).click();
    await page.waitForSelector('.profile-head');
    assert.ok(page.url().endsWith('/person/entry-person-stable'));
    assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '0');
    assert.equal(await page.locator('main details summary').innerText(), '1 events entered');
    await page.locator('main details summary').click();
    assert.ok((await page.innerText('main')).includes('event only; day scope unknown'));
    assert.ok((await page.innerText('main')).includes('entry only; not recorded as started in this scope'));
    assert.equal(await page.locator('main details a[href="https://example.com/entries"]').count(), 1);
    await noOverflow();
    await eventCount('1 NR Entries');
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').count(), 1);
    bundle.season.events[0].links.entryList = 'https://example.com/entries';
    await eventCount('1 NR Entries');
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').count(), 1);
    assert.equal(await page.getByRole('link', { name: 'Entry list ↗', exact: true }).count(), 1);
    bundle.season.events[0].links.entryList = 'https://example.com/another-entry-list';
    await eventCount('1 NR Entries');
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').count(), 1);
    assert.equal(await page.locator('.event-top a[href="https://example.com/another-entry-list"]').count(), 1);
    delete bundle.season.events[0].links.entryList;
    assert.equal(await page.locator('.event-round[href="#/2026/round/R1"]').count(), 1);
    await visit('#/standings');
    assert.ok((await page.innerText('main')).includes('not yet confirmed by MSA'));
    await visit('#/about');
    assert.ok((await page.innerText('main')).includes('Points are calculated here from the official classifications'));
    for (const id of ['entry /?&#% +person', 'entry" onmouseover="window.attributeBroken=true']) {
      published.people.people.find(p => p.name === 'Casey Entry').id = id;
      await visit('#/crews');
      const link = page.getByRole('link', { name: 'Casey Entry', exact: true });
      assert.equal(await link.getAttribute('href'), '#/person/' + encodeURIComponent(id));
      assert.equal(await link.getAttribute('onmouseover'), null);
      await link.hover();
      assert.equal(await page.evaluate(() => window.attributeBroken), undefined);
      await link.click();
      await page.waitForSelector('.profile-head');
      assert.ok((await page.locator('.profile-head').innerText()).includes('Casey Entry'));
      assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '0');
    }
    await visit('#/round/R1/classification');
    assert.ok((await page.innerText('main')).includes('day scope unknown'));
    assert.ok(!(await page.innerText('main')).includes('1 crews not recorded as started'));
    const dns = { ...entriesBefore[0], status: 'DNS', pos: null, total: null, stages: 0,
      times: [null, null], stagePos: [null, null] };
    bundle.rounds.R1.entries = [dns];
    bundle.season.rallyesport = F.copy(initialRsData);
    await visit('#/person/alex-test');
    assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '0');
    await visit('#/');
    await page.getByRole('heading', { name: 'No scored starts yet' }).waitFor();
    assert.ok(await page.getByRole('heading', { name: 'RallyeSport points' }).isVisible(),
      'RS points remain visible when NR has no scored starts');
    await page.getByRole('link', { name: 'Switch to RS results' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.rs-event-card').length === 5);
    assert.equal(await page.locator('.rs-event-card').count(), 5);
    delete bundle.season.rallyesport;
    bundle.rounds.R1.entries = entriesBefore;
    legacyEngine = true;
    for (const hash of ['#/', '#/rounds', '#/round/R1/classification', '#/crews', '#/person/alex-test']) {
      await visit(hash);
      assert.ok(!(await page.innerText('main')).includes('Something went wrong'));
      assert.equal(await page.getByText('Events entered (documented)', { exact: true }).count(), 0);
    }
    legacyEngine = false;
    const calendarBefore = F.copy(bundle.season.rounds), roundsBefore = bundle.rounds;
    bundle.rounds = {};
    bundle.season.rounds.push({ id: 'R2', eventId: 'test-event', day: 'Day 2', date: '2026-02-02', results: false });
    bundle.season.entryLists[0].roundIds = ['R1', 'R2'];
    bundle.season.entryLists[0].entries = [
      { ...entered, driver: 'Alex Test', car: '1', roundIds: ['R1'] },
      { ...entered, driver: 'Blake Example', car: '2', roundIds: ['R2'] },
      { ...entered, car: '3', roundIds: [] }
    ];
    await eventCount('3 NR Entries');
    bundle.season.entryLists[0].entries.push({ ...entered, driver: 'Alex Test', car: '4', roundIds: ['R2'] });
    await eventCount('3 NR Entries');
    bundle.season.entryLists[0].entries.pop();
    await visit('#/rounds');
    const upcoming = page.locator('.event-round.upcoming');
    assert.equal(await upcoming.count(), 2);
    for (let i = 0; i < 2; i++) {
      assert.ok((await upcoming.nth(i).innerText()).includes('1 documented round entry (partial day coverage)'));
      assert.ok((await upcoming.nth(i).innerText()).includes('other entries have unknown day scope'));
      assert.ok(!(await upcoming.nth(i).innerText()).includes('DNS'));
    }
    await noOverflow();
    bundle.season.entryLists[0].entries = [{ ...entered, driver: 'Alex Test', roundIds: ['R1'] }];
    await visit('#/rounds');
    assert.ok((await upcoming.nth(0).innerText()).includes('1 documented round entry'));
    assert.ok((await upcoming.nth(1).innerText()).includes('0 documented round entries'));
    bundle.season.entryLists[0].complete = false;
    await eventCount('1 NR Entries (partial)');
    await visit('#/rounds');
    assert.ok((await upcoming.nth(0).innerText()).includes('partial day coverage'));
    assert.ok((await upcoming.nth(1).innerText()).includes('round entry coverage incomplete'));
    bundle.season.entryLists[0].entries = [entered]; bundle.season.entryLists[0].roundIds = [];
    await eventCount('1 NR Entries (partial)');
    await visit('#/rounds');
    for (let i = 0; i < 2; i++) {
      const text = await upcoming.nth(i).innerText();
      assert.ok(text.includes('round entry coverage unknown'));
      assert.ok(!text.includes('0 documented'));
    }
    bundle.season.entryLists[0].entries = [];
    await eventCount('');
    bundle.season.entryLists[0].complete = true;
    await eventCount('0 NR Entries');
    bundle.season.entryLists[0].entries = Array.from({ length: 20 }, (_, i) => ({
      ...entered, driver: 'Synthetic Crew ' + i, car: String(i + 1)
    }));
    await eventCount('20 NR Entries');
    delete bundle.season.entryLists;
    await eventCount('');
    await visit('#/rounds');
    assert.ok(!(await upcoming.first().innerText()).includes('round entry coverage'));
    bundle.season.rounds = calendarBefore; bundle.rounds = roundsBefore;
    published.people = peopleBefore; bundle.rounds.R1.entries = entriesBefore; delete bundle.season.entryLists;
    seasonDelay = 500;
    await page.goto(base + '/index.html');
    await page.waitForSelector('.loading');
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await page.waitForSelector('.site-header');
    seasonDelay = 0;
    const savedRounds = bundle.rounds;
    bundle.rounds = {};
    bundle.season.rallyesport = F.copy(initialRsData);
    await visit('#/');
    await page.getByRole('heading', { name: 'No results yet' }).waitFor();
    assert.ok(await page.getByRole('heading', { name: 'RallyeSport points' }).isVisible(),
      'RS tables remain accessible when the NR season has no results');
    await page.getByRole('link', { name: 'Switch to RS results' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.rs-event-card').length === 5);
    assert.equal(await page.locator('.rs-event-card').count(), 5);
    delete bundle.season.rallyesport;
    bundle.rounds = savedRounds;
    // A fictional next season is only a mocked response, never a persisted season.
    const oldSite = published.site;
    const next = F.season(2027);
    next.documents = []; next.notes = []; next.msa = { confirmedRounds: [] };
    next.events[0].surface = ''; next.events[0].dates = ''; next.events[0].links = {};
    next.rounds = ['2027-02-28', '2027-03-01', '2027-03-02', '', '2027-02-30'].map((date, i) =>
      ({ id: 'R' + (i + 1), eventId: 'test-event', day: '', date }));
    published.season_2027 = { season: next, rounds: {} };
    published.site = { ...oldSite, currentSeason: 2027, seasons: [{ year: 2026 }, { year: 2027 }] };
    await page.addInitScript(() => { Date.now = () => Date.parse('2027-03-01T10:00:00Z'); });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/');
        const home = await page.innerText('main');
        for (const absent of ['Drivers scored', 'special stages', 'NR Entries unknown', 'Championship leaders']) assert.ok(!home.includes(absent), absent);
        assert.deepEqual(await page.locator('.hero-actions a').allTextContents(),
          ['See the calendar', 'Regulations & info', 'Getting started in NR Rally']);
        assert.deepEqual(await page.locator('.event-round.upcoming .go').allTextContents(),
          ['Awaiting results', 'Scheduled today', 'Upcoming']);
        for (const card of await page.locator('.event-round.upcoming').all()) {
          const text = await card.innerText();
          assert.ok(!text.includes('· results'));
          assert.ok((text.match(/Date to be confirmed/g) || []).length <= 1);
        }
        await page.locator('.event-round.upcoming').nth(3).click();
        await page.getByRole('heading', { name: 'Date to be confirmed', exact: true }).waitFor();
        assert.equal((await page.innerText('main')).match(/Date to be confirmed/g).length, 1);
        await visit('#/2027/rounds');
        await page.locator('.event-round.upcoming').first().click();
        await page.getByRole('heading', { name: 'Awaiting results', exact: true }).waitFor();
        await noOverflow();
        await visit('#/2027/about');
        assert.equal(await page.getByRole('heading', { name: 'Stage graphs', exact: true }).count(), 0);
        await visit('#/2027/crews');
        assert.ok((await page.innerText('main')).includes('Earlier participation is not a new-season entry'));
        await visit('#/2027/info');
        assert.ok((await page.innerText('main')).includes('No documents have been added for 2027'));
        await page.locator('#seasonSel').selectOption('2026');
        await page.waitForURL(url => url.hash === '#/2026/info');
        await page.getByRole('heading', { name: '2026 regulations & documents' }).waitFor();
        await visit('#/2027/getting-started');
        assert.equal(await page.locator('.season-pill, #seasonSel, .guide-edition').count(), 0);
        assert.ok((await page.locator('.guide-references').innerText()).includes('2026 Northern Regions Rally SSRs'));
        assert.ok(!/reference edition|checked 8 November 2026/i.test(await page.locator('.getting-started').innerText()));
        await noOverflow();
      }
    }
    next.entryLists = [{ eventId: 'test-event', roundIds: ['R1'], complete: true,
      source: { file: 'synthetic.pdf', url: 'https://example.com/entries', date: '', locator: 'Synthetic only' },
      entries: [{ car: '1', driver: 'Alex Test', codriver: 'Blake Example', class: 'OPEN', vehicle: '',
        roundIds: ['R1'], status: 'entered', statusEvidence: '', participationEvidence: 'Synthetic NR day evidence', locator: 'Row 1' }] }];
    await visit('#/2027/crews');
    assert.equal(await page.locator('#crewTable tbody tr').count(), 2);
    await page.getByRole('link', { name: 'Alex Test', exact: true }).click();
    await page.getByRole('heading', { name: '2027 season', exact: true }).waitFor();
    assert.ok((await page.innerText('main')).includes('2026 season'));
    await visit('#/2027/standings');
    assert.ok((await page.innerText('main')).includes('entries alone do not score'));
    await visit('#/2027/about');
    assert.ok((await page.innerText('main')).includes('Entry evidence'));
    published.site = oldSite; delete published.season_2027;
    const savedSite = published.site;
    delete published.site;
    await page.reload();
    await page.getByRole('heading', { name: 'Results coming soon' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await page.getByRole('link', { name: 'Getting started in NR Rally', exact: true }).click();
    await page.getByRole('heading', { name: 'Getting started in NR Rally', exact: true }).waitFor();
    await noOverflow();
    published.site = savedSite;
    configured = false;
    await page.goto(base + '/index.html');
    await page.reload();
    await page.getByRole('heading', { name: 'Site not connected yet' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await visit('#/getting-started/ready');
    assert.ok(await page.locator('#guide-ready').isVisible());
    await page.locator('.nav').getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('heading', { name: 'Site not connected yet' }).waitFor();
    configured = true;
    databaseDown = true;
    await page.goto(base + '/index.html');
    await page.getByRole('heading', { name: 'Results are temporarily unavailable' }).waitFor();
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await visit('#/getting-started');
    assert.ok(await page.locator('.getting-started').isVisible());
    await page.locator('.site-disclosure a[href="disclaimer.html"]').click();
    await page.getByRole('heading', { name: 'Independent by design.' }).waitFor();
    assert.ok((await page.innerText('.site-disclosure')).includes('take precedence'));
    assert.equal(await page.locator('main a[href="https://nrcsa.co.za/"]').count(), 1);
    assert.equal(await page.locator('a[href="https://motorsport.co.za/"]').count(), 1);
    await noOverflow();
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    await noJS.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    const staticPage = await noJS.newPage();
    for (const file of ['index.html', 'disclaimer.html', 'privacy.html']) {
      await staticPage.goto(base + '/' + file);
      assert.equal(await staticPage.locator('link[rel="canonical"]').count(), 1);
      assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute('href'),
        'https://nrrally.co.za/' + (file === 'index.html' ? '' : file));
      assert.equal(await staticPage.locator('meta[name="robots"]').count(), 0);
      assert.equal(await staticPage.locator('link[rel="icon"][type="image/png"]').getAttribute('sizes'), '192x192');
    }
    await staticPage.goto(base + '/privacy.html');
    assert.deepEqual(await staticPage.locator('.brand-mark').evaluate(async img => { await img.decode(); return [img.getAttribute('src'), img.naturalWidth, img.naturalHeight]; }),
      ['assets/official-logo.jpg', 270, 143]);
    assert.ok(await staticPage.getByRole('heading', { name: 'Privacy & analytics', exact: true }).isVisible());
    await staticPage.goto(base + '/disclaimer.html');
    assert.deepEqual(await staticPage.locator('.brand-mark').evaluate(async img => { await img.decode(); return [img.getAttribute('src'), img.naturalWidth, img.naturalHeight]; }),
      ['assets/official-logo.jpg', 270, 143]);
    assert.ok(await staticPage.getByRole('heading', { name: 'Independent by design.' }).isVisible());
    await staticPage.goto(base + '/index.html');
    assert.ok(await staticPage.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await staticPage.goto(base + '/admin/index.html');
    assert.equal(await staticPage.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
    assert.ok(await staticPage.locator('.site-disclosure a[href="../disclaimer.html"]').isVisible());
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    console.log('PASS public theme: NR defaults; RS leader/class/results toggles, independent rounds and explicit shared-event calendar badges; responsive keyboard/theme states; NR guide, source evidence, print and disclosures.');
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
