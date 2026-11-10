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
season.events[0].dates = '2026-02-01';
season.rounds[0].date = '2026-02-01';
const sharedNrEvents = [
  { id: 'synthetic-gr-legends', name: 'Synthetic GR Legends Rally', dates: '10–11 July 2026', venue: 'Soetdoring' },
  { id: 'synthetic-ermelo', name: 'Synthetic INGCO Ermelo Rally', dates: '21 August 2026', venue: 'Ermelo' },
  { id: 'synthetic-trac', name: 'Synthetic TRAC N4 Rally', dates: '30 October 2026', venue: 'Dullstroom' }
];
season.events.push(...sharedNrEvents);
const people = F.copy(docs['data/people.json']);
people.people.push({ id: 'blake-example', name: 'Blake Example', aliases: [], bio: '', photo: '', links: {} });
people.people.push({ id: 'reviewed-rs-driver', name: 'Reviewed RS driver', aliases: [] });
people.people.push({ id: 'reviewed-rs-codriver', name: 'Reviewed RS co-driver', aliases: [] });
for (let i = 1; i <= 15; i++) {
  people.people.push({ id: 'rs-driver-' + i, name: 'Synthetic Driver ' + i, aliases: [], bio: '', photo: '', links: {} });
  people.people.push({ id: 'rs-codriver-' + i, name: 'Synthetic Co-driver ' + i, aliases: [], bio: '', photo: '', links: {} });
}
const rsEvents = [1, 2, 3, 4, 5].map(roundNumber => ({
  id: 'synthetic-rs-r' + roundNumber, roundNumber, name: 'Synthetic RS R' + roundNumber,
  dates: ({ 1: '6 June 2026', 2: '', 3: '21/22 August 2026', 4: '30/31 October 2026', 5: '28 November 2026' })[roundNumber],
  rulesetConfirmed: true, rulesetEvidence: 'Synthetic SSR applicability',
  countsForChampionship: true, championshipEvidence: 'Synthetic round evidence', doublePoints: false,
  nrEventId: ({ 2: sharedNrEvents[0].id, 3: sharedNrEvents[1].id, 4: sharedNrEvents[2].id })[roundNumber]
}));
rsEvents.push({
  id: 'synthetic-rs-undated', roundNumber: 6, name: 'Synthetic undated RS event', dates: '',
  rulesetConfirmed: true, rulesetEvidence: 'Synthetic SSR applicability',
  countsForChampionship: false, championshipEvidence: 'Synthetic event is explicitly outside the championship',
  doublePoints: false
});
const rsResult = {
  id: 'synthetic-rs-r2-results', eventId: rsEvents[1].id, title: 'Synthetic RS final classification',
  status: 'Final classification', source: { file: 'synthetic-rs.pdf', url: 'https://example.com/synthetic-rs.pdf' },
  finalityReview: { acceptedForScoring: true, evidence: 'Synthetic user-confirmed finality review.' },
  notes: ['Source footer: results are final pending post-event technical checks such as fuel testing.'],
  stages: [{ id: 'ss1', label: 'SS1' }],
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
rsResult.entries[0].driver = 'Alex Test';
rsResult.entries[1].driver = 'Same source name';
rsResult.entries[1].codriver = 'Same source name';
rsResult.entries[1].identityReview = {
  driverId: 'reviewed-rs-driver', codriverId: 'reviewed-rs-codriver',
  evidence: 'Synthetic reviewer-confirmed distinct crew roles.'
};
season.rallyesport.results.push({
  ...rsResult, id: 'synthetic-rs-r1-finality-review', eventId: rsEvents[0].id,
  title: 'Synthetic user-reviewed classification', status: 'Provisional classification', nrRoundId: undefined,
  stages: [{ id: 'ss1', label: 'SS1' }], notes: [],
  entries: rsResult.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() }))
});
rsResult.entries[2].status = 'DNF';
rsResult.entries[2].pos = null;
rsResult.entries[2].classPos = null;
rsResult.entries[2].total = null;
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
let configured = true, seasonDelay = 0, scriptDelay = 0;
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
      if (url.startsWith(base + '/assets/display-context.js') && scriptDelay) await new Promise(resolve => setTimeout(resolve, scriptDelay));
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
      if (!/competition=|(?:leaders|classes|results)=rs|\/rallyesport/.test(hash)) hash += (hash.includes('?') ? '&' : '?') + 'competition=nr';
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
    const noOverflow = async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.equal(await page.evaluate(() => {
        const brand = document.querySelector('.brand-text'), controls = document.querySelector('.display-controls');
        if (!brand || !controls) return false;
        const a = brand.getBoundingClientRect(), b = controls.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }), false, 'branding and display controls must not overlap');
    };
    const eventCount = async expected => {
      for (const hash of ['#/', '#/rounds']) {
        await visit(hash);
        const entryNotes = page.locator('.event-top > .small');
        if (expected) {
          assert.equal(await entryNotes.count(), 1);
          assert.equal(await entryNotes.first().innerText(), expected);
        } else assert.equal(await entryNotes.count(), 0);
        assert.ok((await page.locator('.event-top > .meta').first().innerText()).endsWith('gravel'));
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
    assert.equal(projectedScoring.results.find(row => row.eventId === rsEvents[1].id).finalityBasis, 'user-confirmed');
    assert.deepEqual(projectedScoring.results.find(row => row.resultId === rsResult.id).entries.find(row => row.car === '3'),
      { car: '3', driverPoints: 0, codriverPoints: 0 });
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].driver, 'Same source name');
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].codriver, 'Same source name');
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].identityReview, undefined);
    assert.ok(projectedScoring.provisionalStandings, 'unresolved rounds leave supported RS points available provisionally');
    assert.equal(initialRsProjection.rallyesport.nonScoringPeople, undefined);
    assert.equal(initialRsProjection.rallyesport.results[0].entries[0].invited, undefined);
    assert.equal(initialRsProjection.rallyesport.events[0].rulesetConfirmed, undefined);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/');
        assert.equal(await page.getByRole('heading', { name: 'Class leaders · drivers' }).count(), 1);
        const competitionSwitch = () => page.getByRole('switch', { name: 'RallyeSport competition' });
        assert.equal(await competitionSwitch().count(), 1);
        assert.equal(await page.locator('[data-home-competition-switch]').count(), 0);
        assert.equal(await competitionSwitch().getAttribute('aria-checked'), 'false');
        assert.equal(await page.getByRole('link', { name: 'Full standings →' }).getAttribute('href'), '#/2026/standings?competition=nr');
        assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=nr');
        assert.equal(await page.locator('.champ a[href*="/person/"]').count(), 2,
          'NR profile links remain in the default NR leader card');
        assert.equal(await page.locator('.rs-event-card').count(), 0, 'NR results remain the default on the homepage');
        await visit('#/?classes=rs');
        assert.equal(await competitionSwitch().getAttribute('aria-checked'), 'true', 'legacy links select site-wide RS mode');
        assert.equal(await page.getByRole('dialog').count(), 0, 'deep links are not deliberate switches');
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        assert.equal(await page.getByRole('link', { name: 'Full RS tables →' }).getAttribute('href'), '#/2026/standings?competition=rs');
        assert.equal(await page.getByRole('link', { name: 'Full RS calendar & results →' }).getAttribute('href'), '#/2026/rounds?competition=rs');
        assert.equal(await page.locator('.rs-event-card').count(), 6);
        assert.ok((await page.locator('.home-rs-note').innerText()).includes('Provisional RS points'));
        assert.ok(!(await page.locator('.home-rs-note').innerText()).includes('blocked or unscored'));
        assert.ok(!(await page.locator('.home-rs-classes').innerText()).includes('Provisional RS points'),
          'class rows do not repeat the section-level provisional note');
        await competitionSwitch().click();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'false');
        await page.goBack();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'true');
        assert.equal(await page.getByRole('dialog').count(), 0);
        await page.goForward();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'false');
        await competitionSwitch().focus();
        await page.keyboard.press('Enter');
        const welcome = page.getByRole('dialog', { name: 'Welcome to RallyeSport' });
        await welcome.waitFor();
        assert.equal(await welcome.getAttribute('aria-describedby'), 'rsWelcomeText');
        await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Continue');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'click here to find out more');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Continue');
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'competitionBtn');
        await competitionSwitch().click();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'false');
        await competitionSwitch().focus();
        await page.keyboard.press('Space');
        await welcome.waitFor();
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await page.getByRole('heading', { name: 'Championship leaders' }).waitFor();
        await page.locator('.leader-card-head').filter({ hasText: 'RS drivers' }).waitFor();
        const rsChampCard = page.locator('.champ');
        assert.ok((await rsChampCard.innerText()).includes('Provisional RS driver leader'));
        assert.ok((await rsChampCard.innerText()).includes('Provisional RS co-driver leader'));
        assert.ok(await rsChampCard.locator('a[href*="/person/"][href*="competition=rs"]').count(),
          'RS leaders link to RS-only profiles');
        const rsDriverCard = page.locator('.leader-card-head').filter({ hasText: 'RS drivers' }).locator('xpath=..');
        const rsCodriverCard = page.locator('.leader-card-head').filter({ hasText: 'RS co-drivers' }).locator('xpath=..');
        assert.equal(await rsDriverCard.locator('.leader').count(), 5, 'RS driver leader cards are capped at five rows');
        assert.equal(await rsCodriverCard.locator('.leader').count(), 5, 'RS co-driver leader cards are capped at five rows');
        const rsDriverLink = rsDriverCard.locator('a[href*="/rallyesport"]');
        const rsCodriverLink = rsCodriverCard.locator('a[href*="/rallyesport"]');
        assert.equal(await rsDriverLink.count(), 1, 'full driver tables remain linked');
        assert.equal(await rsCodriverLink.count(), 1, 'full co-driver tables remain linked');
        assert.ok((await rsDriverLink.innerText()).includes('RS tables'));
        assert.ok((await rsCodriverLink.innerText()).includes('RS tables'));
        assert.equal((await page.locator('.home-rs-note').innerText()).trim(), 'Provisional RS points. RS tables.');
        assert.doesNotMatch((await page.locator('.leader').allInnerTexts()).join('\n'), /Provisional RS points/,
          'provisional status is stated once at section level, not repeated below each row');
        const provisionalTables = published.season_2026.season.rallyesport.scoring.provisionalStandings;
        const originalRsLeaders = {
          drivers: JSON.parse(JSON.stringify(provisionalTables.overallDrivers)),
          codrivers: JSON.parse(JSON.stringify(provisionalTables.overallCodrivers))
        };
        provisionalTables.overallDrivers = [
          { id: 'rs-tie-a', name: 'RS Tie Driver A', points: 42, rank: 1 },
          { id: 'rs-tie-b', name: 'RS Tie Driver B', points: 42, rank: 1 }
        ];
        provisionalTables.overallCodrivers = [{ id: 'rs-codriver-leader', name: 'RS Co-driver Leader', points: 37, rank: 1 }];
        await visit('#/?leaders=rs&classes=rs&results=rs');
        const tiedChampText = await page.locator('.champ').innerText();
        assert.ok(tiedChampText.includes('Provisional RS driver leaders'));
        assert.ok(tiedChampText.includes('RS Tie Driver A, RS Tie Driver B'));
        assert.ok(tiedChampText.includes('42 pts'));
        provisionalTables.overallDrivers = [];
        provisionalTables.overallCodrivers = [];
        await visit('#/?leaders=rs&classes=rs&results=rs');
        const unavailableChampText = await page.locator('.champ').innerText();
        assert.ok(unavailableChampText.includes('Provisional RS driver leaders unavailable.'));
        assert.ok(unavailableChampText.includes('Provisional RS co-driver leaders unavailable.'));
        provisionalTables.overallDrivers = originalRsLeaders.drivers;
        provisionalTables.overallCodrivers = originalRsLeaders.codrivers;
        await visit('#/?leaders=rs&classes=rs&results=rs');
        const rsLeader = rsDriverCard.locator('.leader').first();
        assert.ok((await rsLeader.innerText()).includes('Alex Test'), 'an RS entrant may also be an NR profile');
        assert.equal(await rsLeader.locator('a[href*="/person/"][href*="competition=rs"]').count(), 1);
        assert.ok((await rsLeader.innerText()).includes('30pts'), 'the public UI consumes projected points across both supported synthetic events');
        const rsOnlyLeader = rsDriverCard.locator('.leader').filter({ hasText: 'Reviewed RS driver' }).first();
        assert.ok(await rsOnlyLeader.count(), 'RS-only competitors remain visible in the RS leader list');
        assert.equal(await rsOnlyLeader.locator('a[href*="/person/"][href*="competition=rs"]').count(), 1);
        assert.equal(await page.locator('.hero-stats').count(), 0, 'RS home never shows NR hero statistics');
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        assert.ok((await page.locator('.home-rs-classes').innerText()).includes('Reviewed RS driver'));
        await page.waitForFunction(() => document.querySelectorAll('.rs-event-card').length === 6);
        assert.equal(await page.locator('.rs-event-card').count(), 6);
        assert.ok((await page.locator('.rs-event-card').first().innerText()).includes('RS R1'));
        const sharedRsCard = page.locator('.rs-event-card').filter({ hasText: 'Synthetic RS R2' });
        assert.ok((await sharedRsCard.innerText()).includes('10–11 July 2026'),
          'a shared RS-only view can display the linked NR event date without assigning it as RS scoring evidence');
        assert.equal(await page.locator('.event-card:not(.rs-event-card)').count(), 0);
        const palette = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return { accent: css.getPropertyValue('--accent').trim(), category: css.getPropertyValue('--nr2'), good: css.getPropertyValue('--good') };
        });
        assert.equal(palette.accent, theme === 'light' ? '#1254b5' : '#9dc4ff');
        const nav = name => page.locator('.nav').getByRole('link', { name, exact: true });
        await nav('Standings').click();
        await page.getByRole('heading', { name: 'RS drivers', exact: true }).waitFor();
        assert.ok(!(await page.innerText('main')).includes('Minimum 1 starts'));
        await page.getByRole('link', { name: 'RS4', exact: true }).click();
        await page.getByText('No points have been established for this table.', { exact: true }).waitFor();
        await page.getByRole('link', { name: 'Co-drivers', exact: true }).click();
        await page.getByRole('heading', { name: 'RS co-drivers', exact: true }).waitFor();
        await nav('Crews').click();
        await page.getByRole('heading', { name: 'RS crews', exact: true }).waitFor();
        await page.getByRole('link', { name: 'Alex Test', exact: true }).click();
        await page.getByText('RallyeSport profile · RS history only', { exact: true }).waitFor();
        assert.ok(!(await page.innerText('main')).includes('Starts'));
        assert.equal(await page.locator('a[href*="/round/"]').count(), 0);
        await page.reload();
        await page.getByText('RallyeSport profile · RS history only', { exact: true }).waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0);
        await nav('Getting started').click();
        await page.locator('.getting-started').waitFor();
        assert.equal(await competitionSwitch().getAttribute('aria-checked'), 'true');
        await nav('Info').click();
        await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
        assert.ok(page.url().includes('competition=rs'));
        await nav('Home').click();
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        await page.goto(base + '/index.html');
        await page.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0, 'stored RS entry does not reopen welcome');
        await noOverflow();
        await competitionSwitch().focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => !location.hash.includes('results=rs') &&
          !location.hash.includes('leaders=rs') && !location.hash.includes('classes=rs') &&
          document.querySelectorAll('.rs-event-card').length === 0);
        assert.equal(await page.locator('.rs-event-card').count(), 0);
        assert.equal(await page.locator('.event-card:not(.rs-event-card)').count(), 4);
        const nrPalette = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return { accent: css.getPropertyValue('--accent').trim(), category: css.getPropertyValue('--nr2'), good: css.getPropertyValue('--good') };
        });
        assert.equal(nrPalette.accent, theme === 'light' ? '#c51f32' : '#ff9ba6');
        assert.equal(nrPalette.category, palette.category);
        assert.equal(nrPalette.good, palette.good);
        await competitionSwitch().click();
        await page.getByRole('dialog').getByRole('link', { name: 'click here to find out more' }).click();
        await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
        assert.ok(page.url().includes('competition=rs'));
        assert.equal(await page.getByRole('dialog').count(), 0);
        await visit('#/rallyesport/synthetic-rs-r2-results/classification');
        const dnfRow = page.locator('tbody tr').filter({ has: page.getByText('DNF', { exact: true }) });
        assert.equal(await dnfRow.count(), 1);
        const dnfCells = await dnfRow.locator('td').allTextContents();
        assert.equal(dnfCells[2], '3');
        assert.equal(dnfCells[dnfCells.length - 2], '0');
        assert.equal(dnfCells[dnfCells.length - 1], '0');
        await visit('#/rounds');
        assert.equal(await page.locator('.event-card').count(), 4, 'NR calendar includes NR events only');
        assert.deepEqual(await page.locator('.competition-badge').allTextContents(), ['NR', 'NR', 'NR', 'NR']);
        assert.equal(await page.locator('.rs-event-card').count(), 0);
        assert.equal(await page.locator('.event-round[href*="/rallyesport/"]').count(), 0);
        const calendarCards = await page.locator('.event-card').allInnerTexts();
        assert.ok(calendarCards[0].includes('Synthetic Event'), 'the earliest synthetic NR event remains in date order');
        assert.ok(calendarCards[1].includes('Synthetic GR Legends Rally'));
        assert.ok(calendarCards[2].includes('Synthetic INGCO Ermelo Rally'));
        assert.ok(calendarCards[3].includes('Synthetic TRAC N4 Rally'));
        assert.ok(calendarCards.every(text => !text.includes('user confirmed this supplied classification')),
          'home and calendar avoid repeated finality commentary');
        await visit('#/rallyesport/synthetic-rs-r2-results/classification');
        const technicalChecksText = await page.locator('main').innerText();
        assert.ok(technicalChecksText.includes('RS event points'));
        assert.ok(technicalChecksText.includes('Subject to post-event technical checks; clearance unverified.'));
        assert.ok(!technicalChecksText.includes('user-confirmed scoring finality'));
        assert.ok(!technicalChecksText.includes('Scoring finality is user-confirmed'));
        assert.ok((await page.locator('main').innerText()).includes('results are final pending post-event technical checks'));
        await visit('#/rallyesport/synthetic-rs-r1-finality-review/classification');
        const reviewedFinalityText = await page.locator('main').innerText();
        assert.ok(reviewedFinalityText.includes('RS event points'));
        assert.ok(!reviewedFinalityText.includes('user-confirmed scoring finality'));
        assert.ok(!reviewedFinalityText.includes('Scoring finality is user-confirmed'));
        await noOverflow();
      }
    }
    // Reach graphs through the same actual home/calendar journeys, not just direct graph URLs.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await visit('#/?competition=nr');
      await page.locator('.event-round[href*="/round/"]').first().click();
      await page.locator('.chart-card svg').waitFor();
      assert.equal(await page.locator('.tabs a').count(), 3);
      for (const start of ['#/?competition=rs', '#/2026/rounds?competition=rs']) {
        for (const id of ['synthetic-rs-r1-finality-review', 'synthetic-rs-r2-results']) {
          await visit(start);
          const card = page.locator('.event-round[href*="/' + id + '/graph?"]');
          assert.ok((await card.innerText()).includes('Graph →'));
          await card.click();
          await page.locator('.chart-card svg').waitFor();
          assert.equal(await page.locator('[data-metric]').count(), 6);
          assert.deepEqual(await page.locator('.tabs a').allTextContents(), ['Stage graph', 'Classification', 'Stage times']);
          await page.locator('[data-quick="none"]').click();
          await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 0);
          await page.locator('[data-car="1"]').click(); await page.locator('[data-car="2"]').click();
          await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
          await page.locator('[data-metric="loss"]').click();
          await page.waitForFunction(() => document.querySelector('[data-metric="loss"]').getAttribute('aria-pressed') === 'true');
          await page.locator('.tabs').getByRole('link', { name: 'Classification', exact: true }).click();
          await page.getByText('Official position', { exact: true }).waitFor();
          await page.locator('.tabs').getByRole('link', { name: 'Stage times', exact: true }).click();
          await page.waitForURL(url => url.hash.includes('/' + id + '/stages?'));
          await page.getByText('Highlighted: fastest RS time on the stage.', { exact: false }).waitFor();
          assert.ok(await page.locator('td.fastest').count(), 'RS stage view visibly highlights source-backed fastest times');
          await page.locator('.tabs').getByRole('link', { name: 'Stage graph', exact: true }).click();
          await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
          assert.equal(await page.locator('[data-metric="loss"]').getAttribute('aria-pressed'), 'true');
          await noOverflow();
          const adjacent = id === 'synthetic-rs-r1-finality-review' ? 'synthetic-rs-r2-results' : 'synthetic-rs-r1-finality-review';
          await page.locator('.page-head').getByRole('link', { name: id === 'synthetic-rs-r1-finality-review' ? 'Next →' : '← Previous', exact: true }).click();
          await page.waitForURL(url => url.hash.includes('/' + adjacent + '/graph?'));
          await page.locator('.chart-card svg').waitFor();
        }
      }
    }
    // Legacy result, championship listing and profile links must not strand visitors on tables.
    await visit('#/2026/rallyesport/synthetic-rs-r1-finality-review');
    await page.locator('.chart-card svg').waitFor();
    await visit('#/2026/rallyesport');
    await page.locator('main a[href*="/synthetic-rs-r2-results/graph?"]').click();
    await page.locator('.chart-card svg').waitFor();
    await visit('#/2026/person/alex-test?competition=rs');
    await page.locator('main a[href*="/rallyesport/"]').first().click();
    await page.locator('.chart-card svg').waitFor();
    const timingResult = bundle.season.rallyesport.results[0], savedTiming = F.copy(timingResult.entries);
    timingResult.entries.forEach(entry => { entry.times = timingResult.stages.map(() => null); entry.stagePos = timingResult.stages.map(() => null); });
    await visit('#/2026/rallyesport/' + timingResult.id);
    await page.getByText('No RS stage timing is published for this result.', { exact: true }).waitFor();
    await page.locator('[data-metric="spos"]').click();
    await page.getByText('No official RS stage positions are published for this result.', { exact: false }).waitFor();
    assert.equal(await page.locator('.chart-card .series circle').count(), 0);
    await page.locator('.tabs').getByRole('link', { name: 'Stage times', exact: true }).click();
    await page.getByText('No RS stage times are available.', { exact: true }).waitFor();
    timingResult.entries = savedTiming;
    await visit('#/?competition=rs');
    await page.locator('.footer a[href="privacy.html"]').click();
    assert.equal(await page.locator('#competitionBtn').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('html').getAttribute('data-competition'), 'rs');
    await page.locator('.nav').getByRole('link', { name: 'Site info', exact: true }).click();
    await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
    assert.ok(page.url().includes('competition=rs'));
    await visit('#/2026/about?competition=rs');
    await page.getByRole('heading', { name: 'RS sources & data notes', exact: true }).waitFor();
    assert.equal(await page.locator('a[href*="/round/"]').count(), 0);
    const deniedPage = await ctx.newPage();
    await deniedPage.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Synthetic storage denial'); }; });
    await deniedPage.goto(base + '/index.html#/?competition=nr');
    await deniedPage.locator('#competitionBtn').click();
    await deniedPage.getByRole('button', { name: 'Continue', exact: true }).click();
    await deniedPage.reload();
    await deniedPage.getByRole('heading', { name: 'RS class leaders · drivers' }).waitFor();
    assert.equal(await deniedPage.getByRole('dialog').count(), 0);
    await deniedPage.locator('.nav').getByRole('link', { name: 'Crews', exact: true }).click();
    await deniedPage.getByRole('heading', { name: 'RS crews', exact: true }).waitFor();
    await deniedPage.close();
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
        const jump = page.locator('.guide-jumps a[href="#/getting-started/during?competition=nr"]');
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
          await page.waitForSelector('.tabs a.on[href*="/' + tab + '?"]');
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
    await visit('#/rallyesport/synthetic-rs-result/classification');
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
    await visit('#/rallyesport/synthetic-rs-result/graph?cars=88&m=spos');
    assert.equal(await page.locator('.series circle').count(), 1, 'a later printed stage position survives a missing earlier time');
    assert.deepEqual(await page.locator('.axis .lbl').allTextContents(), ['Stage 1', 'Stage 2', 'Stage 3']);
    await page.locator('.hit[data-i="2"]').hover();
    assert.ok((await page.locator('.tip').innerText()).includes('P7'));
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.getByRole('heading', { name: 'Rounds & stage graphs', exact: true }).waitFor();
    assert.ok(page.url().includes('/rounds?competition=nr'), 'unmapped standalone result switches to NR rounds, not a guessed mapping');
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
    await visit('#/rallyesport/synthetic-rs-result/classification');
    assert.ok((await page.locator('main').innerText()).includes('Reviewed scoring-class mapping: 2WD → RS2'));
    assert.equal(await page.locator('main table tbody tr').first().locator('td').nth(5).innerText(), '2WD');
    await visit('#/2026/round/R1/graph?cars=1&m=loss&rs=1');
    assert.ok((await page.locator('.chart-title').innerText()).includes('Time lost'));
    assert.equal(await page.locator('.series[data-key^="RS:"]').count(), 0, 'legacy overlay queries cannot mix competitions');
    await visit('#/2026/rallyesport/synthetic-rs-result/graph?cars=88,89&m=loss');
    assert.equal(await page.getByRole('heading', { name: 'Head-to-head', exact: true }).count(), 1);
    assert.ok((await page.locator('.h2h-sum').innerText()).includes('0.03s'));
    assert.equal(await page.locator('[data-metric]').count(), 6);
    assert.equal(await page.locator('[data-quick="RS2"]').count(), 1);
    assert.equal(await page.getByRole('heading', { name: 'Stage by stage', exact: true }).count(), 1);
    assert.deepEqual(await page.locator('.chart-card .axis .lbl').allTextContents(), ['SS1', 'SS3']);
    assert.ok((await page.locator('main').innerText()).includes('RS-only stages'));
    assert.equal(await page.locator('.series:not([data-key^="RS:"])').count(), 0);
    assert.ok((await page.locator('.axis text').allTextContents()).includes('+0.01s'));
    await page.locator('.hit[data-i="0"]').hover();
    const graphTip = page.locator('.tip');
    await graphTip.waitFor({ state: 'visible' });
    assert.ok((await graphTip.innerText()).includes('+0.03s'));
    for (const metric of ['pos', 'gap', 'cpos', 'cgap', 'loss', 'spos']) {
      await page.locator('[data-metric="' + metric + '"]').click();
      await page.waitForFunction(m => document.querySelector('[data-metric="' + m + '"]').getAttribute('aria-pressed') === 'true', metric);
      assert.equal(await page.locator('.series:not([data-key^="RS:"])').count(), 0);
    }
    await page.locator('[data-quick="none"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 0);
    await page.locator('[data-car="88"]').click(); await page.locator('[data-car="89"]').click();
    await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
    await page.locator('[data-quick="RS2"]').click();
    assert.equal(await page.locator('.car-btn[aria-pressed="true"]').count(), 2);
    await page.locator('[data-quick="top5"]').click();
    await page.locator('[data-quick="all"]').click();
    await page.locator('[data-hl]').first().focus();
    assert.equal(await page.locator('.series.dim').count(), 1);
    await noOverflow();
    await visit('#/round/R1/classification');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.ok(page.url().includes('/rallyesport/synthetic-rs-result/classification?competition=rs'), 'only the explicit nrRoundId maps a detail switch');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.locator('.round-meta').waitFor();
    assert.ok(page.url().includes('/round/R1/classification?competition=nr'));
    graphResult.entries[0].pos = 7; graphResult.entries[0].total = null;
    await visit('#/rallyesport/synthetic-rs-result/graph?cars=88,89&m=pos');
    assert.ok((await page.locator('.h2h-sum').innerText()).includes('P7'));
    assert.ok((await page.locator('.h2h-sum').innerText()).includes('Official total gap unavailable'));
    await page.locator('.chart-card .hit[data-i="2"]').hover();
    assert.ok((await page.locator('.tip').innerText()).includes('P7'), 'final position remains official even without an official total');
    const finalCells = await page.locator('.h2h tbody tr').last().locator('td').allTextContents();
    assert.equal(finalCells[1], '—');
    assert.equal(finalCells[4], '—', 'missing official total cannot turn into a zero running gap');
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
    assert.ok(page.url().endsWith('/person/entry-person-stable?competition=nr'));
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
    assert.equal(await page.locator('.event-round[href="#/2026/round/R1?competition=nr"]').count(), 1);
    await visit('#/standings');
    assert.ok((await page.innerText('main')).includes('not yet confirmed by MSA'));
    await visit('#/about');
    assert.ok((await page.innerText('main')).includes('Points are calculated here from the official classifications'));
    for (const id of ['entry /?&#% +person', 'entry" onmouseover="window.attributeBroken=true']) {
      published.people.people.find(p => p.name === 'Casey Entry').id = id;
      await visit('#/crews');
      const link = page.getByRole('link', { name: 'Casey Entry', exact: true });
      assert.equal(await link.getAttribute('href'), '#/person/' + encodeURIComponent(id) + '?competition=nr');
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
    assert.equal(await page.getByRole('heading', { name: 'RS class leaders · drivers' }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=nr',
      'the NR empty standings state retains the NR calendar link');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.rs-event-card').length === 6);
    assert.equal(await page.locator('.rs-event-card').count(), 6);
    assert.equal(await page.getByRole('link', { name: 'Full RS calendar & results →' }).getAttribute('href'), '#/2026/rounds?competition=rs',
      'the NR no-scored-starts branch switches its calendar link to RS results');
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
    const upcoming = page.locator('.event-card:not(.rs-event-card)').filter({ hasText: 'Synthetic Event' }).first()
      .locator('.event-round.upcoming');
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
    scriptDelay = 1000;
    await page.goto(base + '/index.html', { waitUntil: 'commit' });
    await page.getByRole('status').filter({ hasText: 'Loading results' }).waitFor();
    assert.equal(await page.locator('.site-header').count(), 0, 'HTML loader is visible before display scripts run');
    await page.waitForSelector('.site-header');
    scriptDelay = 0;
    await page.goto(base + '/index.html');
    await page.waitForSelector('.loading');
    assert.ok(await page.locator('.site-disclosure a[href="disclaimer.html"]').isVisible());
    await page.waitForSelector('.site-header');
    assert.equal(await page.locator('.loading').count(), 0);
    seasonDelay = 0;
    const savedRounds = bundle.rounds;
    bundle.rounds = {};
    bundle.season.rallyesport = F.copy(initialRsData);
    await visit('#/');
    await page.getByRole('heading', { name: 'No results yet' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'RS class leaders · drivers' }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=nr',
      'the NR no-results branch retains the NR calendar link');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.rs-event-card').length === 6);
    assert.equal(await page.locator('.rs-event-card').count(), 6);
    assert.equal(await page.getByRole('link', { name: 'Full RS calendar & results →' }).getAttribute('href'), '#/2026/rounds?competition=rs',
      'the NR no-results branch switches its calendar link to RS results');
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
    await visit('#/2027/?competition=rs');
    await page.getByText('No RS data is published for 2027.', { exact: false }).waitFor();
    for (const hash of ['#/2027/standings?competition=rs', '#/2027/rounds?competition=rs', '#/2027/crews?competition=rs',
      '#/2027/person/alex-test?competition=rs']) {
      await visit(hash);
      assert.equal(await page.getByRole('switch', { name: 'RallyeSport competition' }).getAttribute('aria-checked'), 'true');
      assert.equal(await page.locator('a[href*="/round/"]').count(), 0, 'RS empty seasons never expose NR results as RS');
    }
    await visit('#/2027/rounds?competition=rs');
    await page.locator('#seasonSel').selectOption('2026');
    await page.waitForURL(url => url.hash === '#/2026/rounds?competition=rs');
    await page.getByRole('heading', { name: 'RS rounds & stage graphs' }).waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: 'RS rounds & stage graphs' }).waitFor();
    assert.equal(await page.locator('#seasonSel').inputValue(), '2027');
    assert.equal(await page.getByRole('dialog').count(), 0);
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
        await page.waitForURL(url => url.hash === '#/2026/info?competition=nr');
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
    const savedNextBundle = published.season_2027;
    const rsOnlyNext = F.copy(next);
    rsOnlyNext.events = [];
    rsOnlyNext.rounds = [];
    rsOnlyNext.entryLists = [];
    rsOnlyNext.rallyesport = {
      events: [{ id: 'rs-only-2027-opening', name: 'Synthetic RS-only 2027 opening', dates: 'Synthetic date' }],
      results: [{ id: 'rs-only-2027-opening-final', eventId: 'rs-only-2027-opening',
        title: 'Synthetic 2027 RS final classification', status: 'Final classification',
        source: { file: 'synthetic-2027-rs.pdf', url: 'https://example.com/synthetic-2027-rs.pdf' },
        notes: [], stages: [{ id: 'ss8', label: 'SS8' }],
        entries: [{ car: '88', driver: 'Alex Test', codriver: 'Blake Example', class: 'RS2',
          status: 'classified', pos: 1, classPos: 1, total: '00:01.00', penalty: null,
          times: ['00:01.00'], stagePos: [1] }] }],
      nonScoringPeople: []
    };
    const projectedRsOnlyNext = AI.projectPublic(rsOnlyNext, people);
    assert.equal(projectedRsOnlyNext.rallyesport.scoring.status, 'unconfigured',
      'the synthetic public 2027 season does not infer a future RS ruleset');
    published.season_2027 = { season: projectedRsOnlyNext, rounds: {} };
    await visit('#/');
    assert.equal(await page.locator('#seasonSel').inputValue(), '2027');
    await page.getByRole('heading', { name: 'No results yet' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'RS class leaders · drivers' }).count(), 0,
      'NR home does not include RS leader blocks');
    assert.ok((await page.innerText('main')).includes('No events have been added to the 2027 calendar'),
      'the standalone RS event does not create an NR calendar event');
    await visit('#/2027/rallyesport');
    assert.match(await page.innerText('main'), /RS championship scoring: unconfigured/i);
    assert.ok(!(await page.innerText('main')).includes('Provisional cumulative points'),
      'unconfigured 2027 rules do not show provisional or zero RS points');
    await visit('#/2027/rallyesport/rs-only-2027-opening-final/classification');
    await page.getByRole('heading', { name: 'Synthetic RS-only 2027 opening' }).waitFor();
    assert.ok((await page.innerText('main')).includes('Synthetic 2027 RS final classification'));
    assert.ok((await page.innerText('main')).includes('No championship points are published for this event.'));
    assert.ok((await page.innerText('main')).includes('00:01.00'));
    assert.equal(await page.locator('th').filter({ hasText: 'Driver RS points' }).count(), 0,
      'the 2027 classification displays no inferred RS points');
    published.season_2027 = savedNextBundle;
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
    console.log('PASS public theme: site-wide NR/RS context, separate views/graphs/profiles, welcome keyboard behavior; responsive palettes, guide, source evidence, print and disclosures.');
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
module.exports = { published };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
