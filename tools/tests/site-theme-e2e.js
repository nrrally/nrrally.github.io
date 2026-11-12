/* Synthetic public-site checks only; never reads or writes the live database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const F = require('./ai-fixtures.js');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const repo = path.resolve(__dirname, '..', '..');
const docs = F.docs(), source = F.payload('results', 2026).rounds[0];
const season = JSON.parse(JSON.stringify(docs['data/seasons/2026/season.json']));
const nrEventId = season.events[0].id;
season.events[0].dates = '2026-02-01';
season.rounds[0].date = '2026-02-01';
const sharedNrEvents = [
  { id: 'synthetic-gr-legends', name: 'Synthetic GR Legends Rally', dates: '10–11 July 2026', venue: 'Soetdoring', surface: 'Gravel' },
  { id: 'synthetic-ermelo', name: 'Synthetic INGCO Ermelo Rally', dates: '21 August 2026', venue: 'Ermelo' },
  { id: 'synthetic-trac', name: 'Synthetic TRAC N4 Rally', dates: '30 October 2026', venue: 'Dullstroom' }
];
sharedNrEvents[0].links = {
  results: 'https://example.com/synthetic-nr-results',
  entryList: 'https://example.com/synthetic-nr-entry-list',
  srs: 'https://example.com/synthetic-nr-srs',
  noticeboard: 'https://example.com/synthetic-nr-noticeboard',
  spectatorGuide: 'https://example.com/synthetic-nr-spectator-guide'
};
season.events.push(...sharedNrEvents);
const people = F.copy(docs['data/people.json']);
Object.assign(people.people.find(person => person.id === 'alex-test'), {
  bio: 'Synthetic competitor biography.', photo: 'assets/brand.svg',
  links: { website: 'https://example.com/synthetic-profile' }
});
people.people.push({ id: 'blake-example', name: 'Blake Example', aliases: [], bio: '', photo: '', links: {} });
people.people.push({ id: 'reviewed-rs-driver', name: 'Reviewed RS driver', aliases: [] });
people.people.push({ id: 'reviewed-rs-codriver', name: 'Reviewed RS co-driver', aliases: [] });
people.people.push({ id: 'rs-launch-driver', name: 'Launch Example', aliases: [] });
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
  id: 'synthetic-rs-launch', name: 'Synthetic Launch Event', dates: '6 June 2026',
  rulesetConfirmed: true, rulesetEvidence: 'Synthetic SSR applicability',
  countsForChampionship: false, championshipEvidence: 'Synthetic event is explicitly outside the championship',
  doublePoints: false
});
rsEvents.unshift(rsEvents.pop());
const rsResult = {
  id: 'synthetic-rs-r2-results', eventId: rsEvents.find(event => event.roundNumber === 2).id, title: 'Synthetic RS final classification',
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
events: rsEvents, results: [rsResult], nonScoringPeople: [],
starterMinimumReview: { minimum: 6, reviewed: true, evidence: 'Synthetic user-reported review; no written amendment supplied.' },
membershipReview: {
  sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic reviewed membership roster.',
  people: Object.fromEntries(people.people.map(person => [person.id, { status: 'eligible', basis: 'membership-sheet' }]))
} };
season.rallyesport.membershipReview.people['alex-test'] = { status: 'missing-license', basis: 'membership-sheet' };
season.rallyesport.membershipReview.people['rs-driver-6'] = { status: 'unverified', basis: 'membership-sheet' };
rsResult.entries.forEach((entry, i) => {
entry.driver = 'Synthetic Driver ' + (i + 1);
entry.codriver = 'Synthetic Co-driver ' + (i + 1);
});
rsResult.entries[0].driver = 'Alex Test';
rsResult.entries[0].codriver = 'Blake Example';
rsResult.entries[5].class = 'RS4';
rsResult.entries[2].class = 'RS4';
rsResult.entries[3].vehicle = 'Synthetic RS hatchback';
rsResult.entries[1].driver = 'Same source name';
rsResult.entries[1].codriver = 'Same source name';
rsResult.entries[1].identityReview = {
  driverId: 'reviewed-rs-driver', codriverId: 'reviewed-rs-codriver',
  evidence: 'Synthetic reviewer-confirmed distinct crew roles.'
};
season.rallyesport.results.push({
  ...rsResult, id: 'synthetic-rs-r1-finality-review', eventId: rsEvents.find(event => event.roundNumber === 1).id,
  title: 'Synthetic provisional classification', status: 'Provisional classification', nrRoundId: undefined,
  stages: [{ id: 'ss1', label: 'SS1' }], notes: [],
  entries: rsResult.entries.map(entry => ({ ...entry, times: entry.times.slice(), stagePos: entry.stagePos.slice() }))
});
season.rallyesport.results[1].entries[3].class = 'RS4';
season.rallyesport.results.push({
  id: 'synthetic-rs-r3-provisional', eventId: rsEvents.find(event => event.roundNumber === 3).id,
  title: 'Synthetic unfinalized classification', status: 'Provisional classification',
  stages: [{ id: 'ss1', label: 'SS1' }],
  entries: [{ car: '44', driver: 'Synthetic Driver 4', codriver: 'Synthetic Co-driver 4', class: 'RS4',
    status: 'DNF', pos: null, classPos: null, times: [null], stagePos: [null], penalty: null, total: null },
  { car: '43', driver: 'Synthetic Driver 3', codriver: 'Synthetic Co-driver 3', class: 'RS4',
    status: 'DNS', pos: null, classPos: null, times: [null], stagePos: [null], penalty: null, total: null }]
});
season.rallyesport.results.push({
  id: 'synthetic-rs-launch-result', eventId: rsEvents[0].id, title: 'Synthetic launch classification',
  status: 'Final classification', source: { url: 'https://example.com/synthetic-rs-launch.pdf' },
  stages: [{ id: 'launch-ss1', label: 'Launch SS1' }],
  entries: [{ car: '99', driver: 'Launch Example', codriver: '', class: 'RS2', status: 'classified',
    pos: 1, classPos: 1, times: ['00:01.00'], stagePos: [1], penalty: null, total: '00:01.00' }]
});
rsResult.entries[2].status = 'DNF';
rsResult.entries[2].pos = null;
rsResult.entries[2].classPos = null;
rsResult.entries[2].total = null;
rsResult.entries[2].class = 'RS4';
const initialRsProjection = AI.projectPublic(season, people);
initialRsProjection.rallyesport.events.forEach(event => {
  const sourceEvent = rsEvents.find(row => row.id === event.id);
  if (sourceEvent && typeof sourceEvent.countsForChampionship === 'boolean')
    event.countsForChampionship = sourceEvent.countsForChampionship;
});
const initialRsData = F.copy(initialRsProjection.rallyesport);
const bundle = { season: initialRsProjection, rounds: { R1: {
...source, entries: source.entries.map(e => ({ ...e, driver: 'Alex Test', codriver: 'Blake Example' }))
} } };
const published = {
site: { ...docs['data/site.json'], siteName: 'Northern Regions Rally', tagline: 'Synthetic preview data only.' },
people, season_2026: bundle
};
const standingsParityModel = E.buildSeason({ season: bundle.season, rounds: bundle.rounds, people, publicProjection: true });
const standingsParity = ['nr', 'rs'].map(mode => {
  const display = P.standings(standingsParityModel, mode, 'driver');
  const row = display.rows.find(row => !row.ineligible && row.classes.length === 1 && row.cells.some(cell => cell.points != null));
  const column = row.cells.findIndex(cell => cell.points != null);
  display.rows = [{ ...row, cells: [row.cells[column]] }];
  display.ineligibleNote = undefined;
  display.columns = [{ ...display.columns[column], note: 'Synthetic shared qualification field.' }];
  return display;
});
bundle.season.minStarts = 2;
const resultParity = ['nr', 'rs'].map(mode => {
  const display = P.result(standingsParityModel, mode, mode === 'nr' ? 'R1' : rsResult.id, 'classification');
  const row = display.rows.find(row => row.driver.href && row.codriver.href && row.points.every(role => !role.detailHelp && role.points != null));
  display.rows = [{ ...row, points: row.points.map(role => ({ ...role, points: 15, detailHelp: '' })) }];
  display.awards = display.awards.filter(award => award.car === row.car);
  return display;
});
const reviewFixture = F.revisedRallyeSport();
const reviewResult = reviewFixture.data.results[1];
reviewResult.entries[0].classPos = null;
reviewResult.notes.push('Results are final pending post-event technical checks');
reviewResult.classOrderReview = { version: 1, reviewed: true,
  digest: E.rallyeSportClassOrderDigest(reviewResult), evidence: 'Synthetic complete source review' };
const reviewModel = E.buildSeason({ season: AI.projectPublic(reviewFixture.season, reviewFixture.people),
  rounds: {}, people: reviewFixture.people, publicProjection: true });
const reviewDisplay = P.result(reviewModel, 'rs', reviewResult.id, 'classification');
const reviewProfiles = ['driverId', 'codriverId'].map(role =>
  P.profile([reviewModel], 'rs', reviewModel.rallyesport.results[1].entries[0][role]));
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
      const layout = await page.evaluate(() => ({
        viewport: window.innerWidth, document: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll('body *')).map(element => {
          const box = element.getBoundingClientRect();
          return { tag: element.tagName, className: String(element.className || ''), left: Math.round(box.left),
            right: Math.round(box.right), width: Math.round(box.width), scroll: element.scrollWidth };
        }).filter(element => element.right > window.innerWidth + 1).slice(0, 8)
        ,chain: (() => { const out = []; let element = document.querySelector('.result-classification');
          while (element) { const box = element.getBoundingClientRect(), style = getComputedStyle(element);
            out.push([element.tagName, String(element.className || ''), Math.round(box.left), Math.round(box.right),
              style.display, style.minWidth, style.overflowX]); element = element.parentElement; }
          return out;
        })()
      }));
      assert.equal(layout.document <= layout.viewport, true,
        'no horizontal overflow at ' + page.url() + ': ' + JSON.stringify(layout));
      assert.equal(await page.evaluate(() => {
        const brand = document.querySelector('.brand-text'), controls = document.querySelector('.display-controls');
        if (!brand || !controls) return false;
        const a = brand.getBoundingClientRect(), b = controls.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }), false, 'branding and display controls must not overlap');
    };
    const navigate = async (p, name) => {
      const toggle = p.locator('#navigationToggle');
      if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
      await p.locator('.nav').getByRole('link', { name, exact: true }).click();
    };
    const homePresentation = () => page.evaluate(() => {
      const selectors = ['.hero', '.hero-kicker', '.hero .eyebrow', '.hero h1', '.hero-stats', '.hero-stat',
        '.hero-stat b', '.hero-stat span', '.hero-actions', '.hero-actions a', '.home-status', '.home-note',
        '.home-scoring-notes', '.home-competition-head', '.grid.grid-3', '.champ', '.champ h3',
        '.leader-card-head', '.leader', '.leader .pos', '.leader .who', '.leader .pts', '.home-classes'];
      return {
        stats: Array.from(document.querySelectorAll('.hero-stat span'), el => el.textContent),
        actions: Array.from(document.querySelectorAll('.hero-actions a'), el => el.textContent),
        headings: Array.from(document.querySelectorAll('.home-competition-head h2, .rounds-section-head h2'), el => el.textContent),
        heroStructure: Array.from(document.querySelectorAll('.hero *'), el => [el.tagName, el.className]),
        styles: selectors.map(selector => {
          const element = document.querySelector(selector), style = getComputedStyle(element);
          return [selector, element.tagName, ...['display', 'padding', 'margin', 'gap', 'fontSize', 'fontWeight',
            'lineHeight', 'borderRadius', 'textAlign'].map(property => style[property])];
        })
      };
    });
    const calendarPresentation = () => page.evaluate(() => {
      const card = document.querySelector('.event-card');
      return {
        roundColumns: getComputedStyle(card.querySelector('.event-round')).gridTemplateColumns.split(' ').length,
        structure: Array.from(card.querySelectorAll('*'), element => [element.tagName, element.className]),
        styles: ['.event-top', '.event-topline', '.meta', '.event-scope', '.event-entries', '.event-own-links',
          '.event-round', '.rnd', '.w', '.event-round-title', '.go'].map(selector => {
          const element = card.querySelector(selector), style = getComputedStyle(element);
          return [selector, element.tagName, ...['display', 'padding', 'margin', 'gap',
            'fontSize', 'fontWeight', 'lineHeight', 'borderRadius', 'textAlign']
            .map(key => style[key])];
        })
      };
    });
    const standingsPresentation = () => page.evaluate(() => {
      const table = document.querySelector('.standings-table');
      return {
        heading: document.querySelector('.page-head h1').textContent,
        introduction: document.querySelector('.page-head p:last-child').textContent,
        headers: Array.from(table.querySelectorAll('thead th'), el => el.querySelector('a') ? 'Round' : el.textContent),
        headerStructure: Array.from(table.querySelectorAll('thead *'), el => [el.tagName, el.className]),
        rowStructure: Array.from(table.querySelector('tbody tr').querySelectorAll('*'),
          el => [el.tagName, el.classList.contains('cls') ? 'cls CLASS' : el.className]),
        controls: Array.from(document.querySelectorAll('.filters nav, .page-head nav'),
          el => [el.getAttribute('aria-label'), el.querySelectorAll('[aria-current="page"]').length]),
        styles: ['.page-head', '.page-head h1', '.filters', '.standings-qualification', '.standings-scroll', '.standings-table',
          '.standings-table .s-pos', '.standings-table .s-name', '.standings-eligibility-footnote', '.standing-classes',
          '.standing-round-name', '.standings-table .total', '.standings-table tbody td:last-child'].map(selector => {
          const el = document.querySelector(selector);
          if (!el) return [selector, null];
          const style = getComputedStyle(el);
          return [selector, ...['display', 'padding', 'margin', 'gap', 'fontSize', 'fontWeight',
            'lineHeight', 'borderRadius', 'textAlign', 'position'].map(key => style[key])];
        })
      };
    });
    const resultPresentation = () => page.evaluate(() => {
      const table = document.querySelector('.result-classification');
      return {
        headers: Array.from(table.querySelectorAll('thead th'), el => [el.textContent, el.getAttribute('scope')]),
        row: Array.from(table.querySelector('tbody tr').querySelectorAll('*'), el => [el.tagName,
          el.classList.contains('cls') ? 'CLASS' : el.classList.contains('pos') ? 'POS' : el.className,
          el.getAttribute('aria-label'), el.getAttribute('data-label')]),
        tabs: Array.from(document.querySelectorAll('.tabs a'), el => [el.textContent, el.getAttribute('aria-current')]),
        styles: ['.result-head', '.round-meta', '.tabs', '.result-classification', '.result-pos', '.result-car', '.result-crew',
          '.result-crew-role', '.result-role-status', '.result-total', '.result-points', '.result-scoring-order summary'].map(selector => {
          const el = document.querySelector(selector), style = getComputedStyle(el);
          return [selector, ...['display', 'padding', 'margin', 'gap', 'fontSize', 'fontWeight', 'lineHeight',
            'borderRadius', 'textAlign', 'whiteSpace', 'wordBreak'].map(key => style[key])];
        })
      };
    });
    const remainingPresentation = selectors => page.evaluate(selectors => ({
      heading: document.querySelector('main h1').textContent,
      headers: Array.from(document.querySelectorAll('main table:first-of-type thead th'),
        el => [el.textContent, el.getAttribute('scope')]),
      kpis: Array.from(document.querySelectorAll('.kpi span'), el => el.textContent),
      styles: selectors.map(selector => {
        const el = document.querySelector(selector);
        if (!el) return [selector, null];
        const style = getComputedStyle(el);
        return [selector, ...['display', 'padding', 'margin', 'gap', 'fontSize', 'fontWeight',
          'lineHeight', 'borderRadius', 'textAlign', 'whiteSpace', 'wordBreak'].map(key => style[key])];
      })
    }), selectors);
    for (const theme of ['light', 'dark']) {
      await visit('#/?competition=nr');
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const [route, selectors] of [
          ['crews', ['.page-head', '.filters', '.search', '.directory-table', '.directory-identity', '.directory-starts']],
          ['person/alex-test', ['.profile-head', '.kpis', '.kpi', '.profile-points', '.profile-history']],
          ['about', ['.page-head', '.sources-table', '.sources-table th', '.prose']],
          ['info', ['.page-head', '.guide-entry', '.section', '.doc-list', '.doc']]
        ]) {
          const layouts = [];
          for (const mode of ['nr', 'rs']) {
            await visit('#/' + route + '?competition=' + mode);
            await noOverflow();
            layouts.push(await remainingPresentation(selectors));
            const region = page.locator('main [role="region"]').first();
            if (await region.count()) {
              await region.focus();
              assert.equal(await region.evaluate(el => document.activeElement === el), true);
              assert.equal(await region.getAttribute('tabindex'), '0');
            }
            if (route === 'crews') {
              await page.getByRole('searchbox', { name: 'Search crews' }).fill('No synthetic competitor matches this');
              assert.equal(await page.locator('#crewTable tbody tr:visible').count(), 0);
              await page.getByRole('searchbox', { name: 'Search crews' }).fill('Alex Test');
              assert.equal(await page.locator('#crewTable tbody tr:visible').count(), 1);
              await page.getByRole('searchbox', { name: 'Search crews' }).fill('');
            }
            if (route === 'info') {
              assert.equal(await page.getByRole('link', { name: 'Start with the spectator, crew and season guide' }).count(), 1);
              assert.equal(await page.locator('a[href="https://example.com/synthetic-rs-ssr.pdf"]').count(), mode === 'rs' ? 1 : 0);
            }
          }
          assert.deepEqual(layouts[1], layouts[0], route + ': common fields and layout at ' + width + '/' + theme);
        }
      }
    }
    if (process.env.RS_PRESENTATION_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.RS_PRESENTATION_SCREENSHOT_DIR, { recursive: true });
      await visit('#/?competition=nr');
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const [name, hash] of [
          ['nr-home', '#/?competition=nr'], ['nr-classification', '#/round/R1/classification?competition=nr'],
          ['nr-rounds', '#/rounds?competition=nr'], ['rs-rounds', '#/rounds?competition=rs'],
          ['nr-standings', '#/standings?competition=nr'], ['rs-standings', '#/standings?competition=rs'],
          ['rs-home', '#/?competition=rs'], ['rs-classification', '#/rallyesport/synthetic-rs-r2-results/classification'],
          ['nr-graph', '#/round/R1/graph?competition=nr&cars=1'], ['nr-stages', '#/round/R1/stages?competition=nr'],
          ['rs-graph', '#/rallyesport/synthetic-rs-r2-results/graph?cars=1,2'],
          ['rs-stages', '#/rallyesport/synthetic-rs-r2-results/stages'],
          ['nr-profile', '#/person/alex-test?competition=nr'], ['rs-profile', '#/person/alex-test?competition=rs'],
          ['nr-crews', '#/crews?competition=nr'], ['rs-crews', '#/crews?competition=rs'],
          ['nr-sources', '#/about?competition=nr'], ['rs-sources', '#/about?competition=rs'],
          ['nr-info', '#/info?competition=nr'], ['rs-info', '#/info?competition=rs']
          ]) {
            await visit(hash); await noOverflow();
            await page.screenshot({ path: path.join(process.env.RS_PRESENTATION_SCREENSHOT_DIR,
              name + '-' + width + '-' + theme + '.png'), fullPage: !/classification|graph|stages|crews/.test(name) });
          }
        }
      }
      if (process.env.RS_PRESENTATION_CAPTURE_ONLY === '1') {
        assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
        console.log('PASS synthetic NR/RS desktop/mobile presentation captures; no unexpected requests or page errors.');
        return;
      }
    }
    const eventCount = async expected => {
      for (const hash of ['#/', '#/rounds']) {
        await visit(hash);
        const entryNotes = page.locator('.event-entries');
        assert.equal(await entryNotes.count(), await page.locator('.event-card').count());
        assert.equal(await entryNotes.first().innerText(), expected || 'Event entries unavailable');
        assert.ok((await page.locator('.event-top > .meta').first().innerText()).endsWith('gravel'));
        const text = await page.innerText('main');
        assert.ok(!text.includes('documented event crew entries'));
        assert.ok(!text.includes('NR Entries'));
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
          assert.equal(await page.locator('#home-eligibility-note').innerText(), '* Minimum starts not met.');
          assert.ok(await page.locator('.leader a[aria-describedby="home-eligibility-note"]').count(),
            'under-minimum names link to the single conditional Home footnote');
          assert.ok(await page.locator('.leader a[aria-describedby="home-eligibility-note"] + .eligibility-mark[aria-hidden="true"]').count(),
            'the visible asterisk is hidden from assistive technology while the link references its explanation');
          assert.doesNotMatch((await page.locator('.leader').allInnerTexts()).join('\n'), /Eligible|Minimum starts not met/,
            'qualification labels are not repeated on every Home leader row');
        }
        if (hash.startsWith('#/standings')) assert.equal(await page.locator('.page-head p').last().innerText(),
          'Published championship points and recorded round starts.');
        if (hash === '#/rounds') assert.equal(await page.locator('.page-head p').last().innerText(),
          'Choose a round for graphs, classifications and stage times.');
        if (hash === '#/crews') assert.equal(await page.locator('.page-head p').last().innerText(),
          'Drivers and co-drivers documented in classifications and entry evidence.');
      }
    }
    const projectedScoring = initialRsProjection.rallyesport.scoring;
    assert.equal(projectedScoring.results.find(row => row.eventId === rsEvents.find(event => event.roundNumber === 2).id).status, 'ready');
    assert.equal(projectedScoring.results.find(row => row.eventId === rsEvents.find(event => event.roundNumber === 2).id).finalityBasis, 'user-confirmed');
    const projectedDnf = projectedScoring.results.find(row => row.resultId === rsResult.id).entries.find(row => row.car === '3');
    assert.deepEqual([projectedDnf.driverPoints, projectedDnf.codriverPoints], [0, 0]);
    assert.deepEqual([projectedDnf.driverEligibility.status, projectedDnf.codriverEligibility.status],
      ['eligible', 'eligible']);
    assert.deepEqual([projectedDnf.driverEligibility.scoringClass, projectedDnf.codriverEligibility.scoringClass],
      ['RS4', 'RS4']);
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].driver, 'Same source name');
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].codriver, 'Same source name');
    assert.equal(initialRsProjection.rallyesport.results[0].entries[1].identityReview, undefined);
    assert.ok(projectedScoring.provisionalStandings, 'unresolved rounds leave supported RS points available provisionally');
    assert.equal(initialRsProjection.rallyesport.nonScoringPeople, undefined);
    assert.equal(initialRsProjection.rallyesport.results[0].entries[0].invited, undefined);
    assert.equal(initialRsProjection.rallyesport.events[0].rulesetConfirmed, undefined);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const presentations = [];
        for (const [index, mode] of ['nr', 'rs'].entries()) {
          await visit('#/standings?competition=' + mode);
          await page.evaluate(display => {
            document.querySelector('main').innerHTML = window.NRPublicComponents.standings(display).html;
          }, standingsParity[index]);
          presentations.push(await standingsPresentation());
          await noOverflow();
          const region = page.getByRole('region', { name: 'Drivers standings table' });
          await region.focus();
          assert.equal(await region.evaluate(element => element === document.activeElement), true);
          if (width <= 390) {
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('.standings-scroll').scrollLeft > 0);
          }
        }
        assert.deepEqual(presentations[1], presentations[0],
          'equivalent NR/RS standings fields use identical headings, structure, controls, typography, sticky/mobile policy and spacing');
        const resultPresentations = [];
        for (const [index, mode] of ['nr', 'rs'].entries()) {
          await visit('#/standings?competition=' + mode);
          await page.evaluate(display => {
            document.querySelector('main').innerHTML = window.NRPublicComponents.resultShell(display,
              window.NRPublicComponents.resultClassification(display)).html;
          }, resultParity[index]);
          resultPresentations.push(await resultPresentation());
          await noOverflow();
          const region = page.getByRole('region', { name: 'Classification table', exact: true });
          await region.focus();
          assert.equal(await region.evaluate(element => element === document.activeElement), true);
          await page.locator('.result-scoring-order summary').focus();
          await page.keyboard.press('Enter');
          assert.ok(await page.locator('.result-scoring-order table').isVisible());
        }
        assert.deepEqual(resultPresentations[1], resultPresentations[0],
          'actual NR/RS result adapters share exact header wording, row structure, tabs, responsive layout and computed typography/spacing');
        await page.evaluate(display => {
          document.querySelector('main').innerHTML = window.NRPublicComponents.resultShell(display,
            window.NRPublicComponents.resultClassification(display)).html;
        }, reviewDisplay);
        assert.equal(await page.locator('.result-classpos [aria-describedby="result-class-position-note"]').count(), 1);
        assert.match(await page.locator('#result-class-position-note').innerText(), /reviewed source classification/);
        await noOverflow();
        for (const profile of reviewProfiles) {
          await page.evaluate(display => {
            document.querySelector('main').innerHTML = window.NRPublicComponents.profile(display, '',
              display.seasons.map(season => season.charts.map(() => ''))).html;
          }, profile);
          assert.equal(await page.locator('[aria-describedby="profile-class-position-note-0"]').count(), 1);
          assert.match(await page.locator('#profile-class-position-note-0').innerText(), /not a championship scoring rank/);
          await noOverflow();
        }
        await visit('#/standings?class=OPEN&pts=split&competition=nr');
        await page.getByRole('link', { name: 'Co-drivers', exact: true }).click();
        await page.getByRole('heading', { name: 'Co-drivers', exact: true }).waitFor();
        assert.ok(page.url().includes('class=OPEN') && page.url().includes('pts=split'),
          'NR role switching retains the same class and breakdown state as RS');
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
        assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 0, 'NR results remain the default on the homepage');
        const nrHomePresentation = await homePresentation();
        const nrCalendarPresentation = await calendarPresentation();
        await page.locator('.home-scoring-notes summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.home-scoring-notes').getAttribute('open'), '');
        await page.keyboard.press('Enter');
        await visit('#/?classes=rs');
        assert.equal(await competitionSwitch().getAttribute('aria-checked'), 'true', 'legacy links select site-wide RS mode');
        assert.equal(await page.getByRole('dialog').count(), 0, 'deep links are not deliberate switches');
        await page.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
        assert.deepEqual(await homePresentation(), nrHomePresentation,
          'NR and RS share hero structure, exact wording, field slots and computed layout/type/spacing at every width/theme');
        await page.locator('.home-scoring-notes summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.home-scoring-notes').getAttribute('open'), '');
        await page.keyboard.press('Enter');
        await noOverflow();
        assert.equal(await page.getByRole('link', { name: 'Full standings →' }).getAttribute('href'), '#/2026/standings?competition=rs');
        assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=rs');
        assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 6);
        assert.deepEqual(await calendarPresentation(), nrCalendarPresentation,
          'equivalent published NR/RS calendar cards have identical structure, typography, spacing and responsive layout');
        assert.ok((await page.locator('.home-note').innerText()).includes('Provisional points'));
        assert.ok(!(await page.locator('.home-note').innerText()).includes('blocked or unscored'));
        assert.ok(!(await page.locator('.home-classes').innerText()).includes('Provisional points'),
          'class rows do not repeat the section-level provisional note');
        await visit('#/2026/standings?competition=rs');
        const rs0Standing = page.locator('table.data tbody tr').filter({ hasText: 'Alex Test' }).first();
        assert.match(await rs0Standing.innerText(), /—.*Alex Test.*RS0.*0/s);
        const eligibleStanding = page.locator('table.data tbody tr').filter({ hasText: 'Reviewed RS driver' }).first();
        assert.equal(await eligibleStanding.locator('.standing-classes .cls').innerText(), 'RS2',
          'actual projected rows without scoringClass derive their class from the role-specific class table');
        assert.ok(!(await page.locator('main').innerText()).includes('RS2 / RS4'));
        assert.ok((await page.locator('main').innerText()).includes('RS0 Non-Scoring SSR 6.1'));
        const tableValues = () => page.locator('table.data tbody tr').evaluateAll(rows => rows.map(row =>
          Array.from(row.cells, cell => cell.hasAttribute('data-points') ?
            cell.getAttribute('data-points') : cell.textContent.trim())));
        const ordinaryRows = await tableValues();
        await page.getByRole('link', { name: 'Points breakdown' }).click();
        await page.locator('.filters .seg a.on').filter({ hasText: 'Points breakdown' }).waitFor();
        assert.ok(page.url().includes('pts=split'));
        assert.deepEqual(await tableValues(), ordinaryRows, 'the split never changes standings values or ordering');
        assert.match(await page.locator('.standings-status').innerText(), /Class points also form the overall total; no separate overall award/i);
        assert.match(await page.locator('.standings-notes').textContent(), /overall totals reuse class points; no separate overall points/i);
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Reviewed RS driver' }).innerText(), /RS2 \d+/);
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 4' }).innerText(), /RS4 \d+[\s\S]*RS2 \d+/);
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Alex Test' }).innerText(), /RS0 0/);
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 3' }).innerText(), /RS4 0/);
        await noOverflow();
        await page.getByRole('link', { name: 'RS4', exact: true }).click();
        await page.locator('.filters .seg a.on').filter({ hasText: /^RS4$/ }).waitFor();
        assert.ok(page.url().includes('pts=split'));
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 4' }).innerText(), /RS4 \d+/);
        assert.doesNotMatch(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 4' }).innerText(), /RS2 \d+/);
        await page.getByRole('link', { name: 'Co-drivers', exact: true }).click();
        await page.getByRole('heading', { name: 'Co-drivers', exact: true }).waitFor();
        assert.ok(page.url().includes('pts=split'));
        assert.ok(page.url().includes('class=RS4'));
        assert.match(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Co-driver 6' }).innerText(), /RS4 \d+/);
        await page.getByRole('link', { name: 'Points', exact: true }).click();
        await page.waitForURL(url => !url.hash.includes('pts=split'));
        await page.locator('.filters .seg a.on').filter({ hasText: /^Points$/ }).waitFor();
        assert.ok(!page.url().includes('pts=split'));
        assert.equal(await page.locator('table.data .ptcell').count(), 0);
        await page.goBack();
        assert.ok(page.url().includes('pts=split'));
        await page.reload();
        assert.ok(page.url().includes('pts=split'));
        await noOverflow();
        await visit('#/2026/standings?competition=rs');
        await competitionSwitch().click();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'false');
        await page.goBack();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'true');
        assert.equal(await page.getByRole('dialog').count(), 0);
        await page.goForward();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'false');
        await page.evaluate(() => localStorage.removeItem('nr-rs-welcome-until'));
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
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'true');
        assert.equal(await welcome.count(), 0, 'acknowledged welcome stays suppressed on another RS switch');
        await page.evaluate(() => window.NRDisplay.welcome('#/info?competition=rs'));
        await welcome.waitFor();
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await visit('#/?competition=rs');
        await page.getByRole('heading', { name: 'Championship leaders' }).waitFor();
        await page.getByRole('heading', { name: 'Drivers', exact: true }).waitFor();
        const rsChampCard = page.locator('.champ');
        assert.equal(await rsChampCard.locator('.eyebrow').innerText(), 'DRIVER LEADER · PROVISIONAL');
        assert.equal(await page.locator('#home-eligibility-note').count(), 0,
          'RS Home shows no eligibility footnote without an explicit ineligible ranked row');
        assert.doesNotMatch((await page.locator('.leader').allInnerTexts()).join('\n'), /Eligible|Scoring status unavailable/,
          'RS unknown/provisional status is not restated as a positive eligibility claim');
        assert.ok(await rsChampCard.locator('h3 a[href*="/person/"]').count(),
          'RS uses the same prominent linked driver heading as NR');
        assert.match(await rsChampCard.locator('h3 + p').innerText(), /\d+ points · RS[24][\s\S]*rounds? started[\s\S]*\d+ clear of /);
        assert.ok((await rsChampCard.innerText()).includes('Co-driver leader:'));
        assert.equal(await rsChampCard.locator('.minibars [title*="Launch"]').count(), 0);
        assert.deepEqual(await rsChampCard.locator('.minibars em').allTextContents(), ['R1', 'R2', 'R3'],
          'championship bars retain round labels and omit upcoming events without results');
        assert.ok(await rsChampCard.locator('a[href*="/person/"][href*="competition=rs"]').count(),
          'RS leaders link to RS-only profiles');
        const rsDriverCard = page.locator('.leader-card-head').filter({ has: page.getByRole('heading', { name: 'Drivers', exact: true }) }).locator('xpath=..');
        const rsCodriverCard = page.locator('.leader-card-head').filter({ has: page.getByRole('heading', { name: 'Co-drivers', exact: true }) }).locator('xpath=..');
        assert.equal(await rsDriverCard.locator('.leader').count(), 5, 'RS driver leader cards are capped at five rows');
        assert.equal(await rsCodriverCard.locator('.leader').count(), 5, 'RS co-driver leader cards are capped at five rows');
        const rsDriverLink = rsDriverCard.locator('a[href*="/standings?"]');
        const rsCodriverLink = rsCodriverCard.locator('a[href*="/standings/codrivers?"]');
        assert.equal(await rsDriverLink.count(), 1, 'full driver tables remain linked');
        assert.equal(await rsCodriverLink.count(), 1, 'full co-driver tables remain linked');
        assert.equal(await rsDriverLink.innerText(), 'Table →');
        assert.equal(await rsCodriverLink.innerText(), 'Table →');
        for (const [label, card] of [['driver', rsDriverCard], ['co-driver', rsCodriverCard]]) {
          const leaderMeta = await card.locator('.leader').first().locator('.who div').first().innerText();
          assert.match(leaderMeta, /(?:\d+ rounds? started|Rounds started unavailable)/,
            `RS ${label} leaders show evidence-based rounds started`);
        }
        assert.match((await page.locator('.home-note').innerText()).trim(),
          /^Provisional points\. Class points also form the overall total; no separate overall award\. Standings & scoring notes →$/);
        assert.equal(await page.locator('.home-classes .card').count(), 2,
          'non-scoring people are not presented as class leaders');
        const classBadgeColors = await page.evaluate(() => {
          function color(cls) {
            const badge = document.createElement('span');
            badge.className = 'cls ' + cls;
            document.body.appendChild(badge);
            const value = getComputedStyle(badge).backgroundColor;
            badge.remove();
            return value;
          }
          return { rs2: color('RS2'), nr2: color('NR2'), rs4: color('RS4'), nr1: color('NR1') };
        });
        assert.equal(classBadgeColors.rs2, classBadgeColors.nr2, 'RS2 matches the NR2 blue');
        assert.equal(classBadgeColors.rs4, classBadgeColors.nr1, 'RS4 matches the NR1 red');
        assert.ok(!(await page.locator('main').innerText()).includes('RS0 Non-Scoring SSR 6.1'),
          'the homepage does not repeat the scoring footnote');
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
        assert.equal(await rsChampCard.locator('.eyebrow').innerText(), 'DRIVER LEADERS · PROVISIONAL');
        assert.ok(tiedChampText.includes('RS Tie Driver A'));
        assert.ok(tiedChampText.includes('RS Tie Driver B'));
        assert.ok(tiedChampText.includes('42 points'));
        assert.ok(tiedChampText.includes('Rounds started unavailable'),
          'standings-only fixture identities do not acquire a fabricated zero-start count');
        assert.ok(!tiedChampText.includes('clear of'), 'tied leaders do not acquire a fabricated sole-leader margin');
        assert.equal(await rsChampCard.locator('.minibars').count(), 0, 'ties do not select an arbitrary driver for the bars');
        provisionalTables.overallDrivers = [];
        provisionalTables.overallCodrivers = [];
        await visit('#/?leaders=rs&classes=rs&results=rs');
        const unavailableChampText = await page.locator('.champ').innerText();
        assert.ok(unavailableChampText.includes('Driver leader unavailable.'));
        assert.ok(unavailableChampText.includes('Co-driver leader: unavailable.'));
        provisionalTables.overallDrivers = originalRsLeaders.drivers;
        provisionalTables.overallCodrivers = originalRsLeaders.codrivers;
        await visit('#/?leaders=rs&classes=rs&results=rs');
        const sharedNrProfileLeader = rsCodriverCard.locator('.leader').filter({ hasText: 'Blake Example' }).first();
        assert.ok(await sharedNrProfileLeader.count(), 'an eligible RS entrant may also be an NR profile');
        assert.equal(await sharedNrProfileLeader.locator('a[href*="/person/"][href*="competition=rs"]').count(), 1);
        assert.equal(await rsDriverCard.locator('.leader').filter({ hasText: 'Alex Test' }).count(), 0,
          'a role missing licence evidence stays out of ranked RS leaders');
        assert.ok((await sharedNrProfileLeader.innerText()).includes('pts'),
          'the public UI consumes projected points across supported synthetic events');
        const rsOnlyLeader = rsDriverCard.locator('.leader').filter({ hasText: 'Reviewed RS driver' }).first();
        assert.ok(await rsOnlyLeader.count(), 'RS-only competitors remain visible in the RS leader list');
        assert.equal(await rsOnlyLeader.locator('a[href*="/person/"][href*="competition=rs"]').count(), 1);
        assert.deepEqual(await page.locator('.hero-stat b').allTextContents(), ['3 / 5', '6', '13', '4'],
          'RS round counts exclude launch while event/stage counts retain it in the shared four-stat layout');
        await page.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
        const homeRsClassesText = await page.locator('.home-classes').innerText();
        assert.ok(homeRsClassesText.includes('Reviewed RS driver'), homeRsClassesText);
        await page.waitForFunction(() => document.querySelectorAll('.event-card[data-competition="rs"]').length === 6);
        assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 6);
        assert.ok((await page.locator('.event-card').first().innerText()).includes('Synthetic Launch Event'),
          'calendar chronology retains stable source order for same-date events instead of pushing launch after numbered rounds');
        const sharedRsCard = page.locator('.event-card').filter({ hasText: 'Synthetic RS R2' });
        assert.ok((await sharedRsCard.innerText()).includes('10–11 July 2026'),
          'a shared RS-only view can display the linked NR event date without assigning it as RS scoring evidence');
        assert.match(await sharedRsCard.locator('.meta').innerText(), /Soetdoring.*Related NR event.*Gravel.*Related NR event/s);
        assert.match(await page.locator('.event-card').filter({ hasText: 'Synthetic Launch Event' }).locator('.meta').innerText(),
          /Venue unavailable.*Surface unavailable/s);
        assert.ok((await page.locator('main').innerText()).includes('The 2026 rounds'));
        const relatedLinks = sharedRsCard.locator('.event-related-links');
        assert.ok((await relatedLinks.innerText()).includes('Related NR event links'));
        assert.deepEqual(await relatedLinks.locator('a').allTextContents(),
          ['Official results ↗', 'Entry list ↗', 'Supplementary regs ↗', 'Noticeboard ↗', 'Spectator guide ↗']);
        assert.equal(await relatedLinks.locator('a[href="https://example.com/synthetic-nr-srs"]').count(), 1);
        const nrLinkedWithoutLinks = page.locator('.event-card').filter({ hasText: 'Synthetic RS R3' });
        assert.equal(await nrLinkedWithoutLinks.locator('.event-related-links').count(), 0,
          'an explicit NR event relationship without populated NR links renders no invented URLs');
        assert.equal(await page.locator('.event-card[data-competition="nr"]').count(), 0);
        assert.ok(await rsDriverCard.locator('.leader .who .cls').count(), 'RS driver leaders show their scored class labels');
        assert.ok(await rsCodriverCard.locator('.leader .who .cls').count(), 'RS co-driver leaders show their scored class labels');
        const roundsStarted = page.locator('.home-classes .leader');
        assert.ok((await roundsStarted.filter({ hasText: 'Synthetic Driver 3' }).innerText()).includes('2 rounds started'),
          'an evidenced DNF counts once, while an additional DNS does not add a started round');
        assert.ok((await roundsStarted.filter({ hasText: 'Synthetic Driver 4' }).innerText()).includes('3 rounds started'),
          'official DNF counts even when timing is missing');
        assert.equal(await page.locator('.participation-alert').count(), 0);
        await noOverflow();
        assert.equal(await page.locator('.home-classes .leader').filter({ hasText: 'Launch Example' }).count(), 0,
          'a non-scoring launch appearance is excluded from championship class leaders');
        const palette = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return { accent: css.getPropertyValue('--accent').trim(), category: css.getPropertyValue('--nr2'), good: css.getPropertyValue('--good') };
        });
        assert.equal(palette.accent, theme === 'light' ? '#1254b5' : '#9dc4ff');
        await navigate(page, 'Standings');
        await page.getByRole('heading', { name: 'Drivers', exact: true }).waitFor();
        assert.ok(!(await page.innerText('main')).includes('Minimum 1 starts'));
        assert.equal(await page.locator('table.data thead th').first().innerText(), 'POS',
          'RS standings use the NR position label');
        const positionHeader = page.locator('table.data thead th').first();
        const positionCell = page.locator('table.data tbody tr').first().locator('td').first();
        assert.equal(await positionHeader.evaluate(element => getComputedStyle(element).textAlign), 'center');
        assert.equal(await positionCell.evaluate(element => getComputedStyle(element).textAlign), 'center');
        assert.ok((await positionHeader.boundingBox()).width <= 56,
          'the RS position column keeps the compact NR-sized padding');
        assert.ok(await page.locator('table.data tbody .cls.RS2, table.data tbody .cls.RS4').count(),
          'RS standings use the shared colour-coded class labels');
        await page.getByRole('link', { name: 'RS4', exact: true }).click();
        await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 4' }).waitFor();
        const partialDriver = page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Driver 4' });
        assert.equal(await partialDriver.locator('td').last().innerText(), '3');
        assert.equal(await partialDriver.locator('.participation-alert').count(), 0);
        await page.getByRole('link', { name: 'Co-drivers', exact: true }).click();
        await page.getByRole('heading', { name: 'Co-drivers', exact: true }).waitFor();
        assert.equal(await page.locator('table.data tbody tr').filter({ hasText: 'Synthetic Co-driver 4' }).locator('td').last().innerText(), '3');
        await navigate(page, 'Crews');
        await page.getByRole('heading', { name: 'Crews', exact: true }).waitFor();
        const unverifiedCrew = page.locator('#crewTable tbody tr').filter({ hasText: 'Synthetic Driver 6' });
        assert.ok((await unverifiedCrew.locator('.rs-crew-identity').innerText()).includes('Synthetic Driver 6'));
        assert.equal(await unverifiedCrew.locator('.rs-crew-identity .eligibility-mark').count(), 1,
          'only the non-scoring competitor gets the subtle eligibility marker next to the name');
        assert.ok((await unverifiedCrew.locator('.rs-crew-class').innerText()).includes('RS0 · Non-Scoring'));
        const multiClassCrew = page.locator('#crewTable tbody tr').filter({ hasText: 'Synthetic Driver 4' }).locator('.rs-crew-class');
        assert.equal(await multiClassCrew.locator('.cls.RS2').count(), 1);
        assert.equal(await multiClassCrew.locator('.cls.RS4').count(), 1,
          'genuine multi-class crews retain both unique source classes without duplicating scoring badges');
        assert.equal(await page.locator('#crewTable tbody tr').filter({ hasText: 'Synthetic Driver 4' }).locator('.rs-crew-starts').innerText(), '3');
        assert.equal(await page.locator('#crewTable tbody tr').filter({ hasText: 'Synthetic Driver 4' }).locator('.participation-alert').count(), 0);
        assert.deepEqual(await page.locator('#crewTable thead th').allTextContents(),
          ['Competitor', 'Role', 'Class / status', 'Standings', 'Starts',
            'Events / championship rounds', 'Car(s)']);
        assert.ok((await page.locator('main').innerText()).includes('does not establish non-membership'),
          'the single footnote preserves the RS0 eligibility caveat');
        assert.ok(!(await page.locator('main').innerText()).includes('RS0 roles receive'));
        await page.getByRole('link', { name: 'Synthetic Driver 4', exact: true }).click();
        assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '3');
        assert.equal(await page.locator('.profile-history .participation-alert').count(), 0);
        await noOverflow();
        await navigate(page, 'Crews');
        await page.getByRole('link', { name: 'Alex Test', exact: true }).click();
        await page.locator('.profile-head h1').filter({ hasText: 'Alex Test' }).waitFor();
        assert.equal(await page.locator('.profile-head .bio').innerText(), 'Synthetic competitor biography.');
        assert.equal(await page.locator('.profile-head img').getAttribute('src'), 'assets/brand.svg');
        assert.equal(await page.locator('.profile-head a[href="https://example.com/synthetic-profile"]').count(), 1);
        assert.equal(await page.locator('.rs-profile-points svg[aria-label="Points by round"]').count(), 1,
          'RS0 people retain the season graph');
        assert.ok((await page.locator('.rs-profile-points').innerText()).includes('0'));
        assert.ok(!(await page.innerText('main')).includes('NR statistics are not included'));
        assert.ok((await page.innerText('main')).includes('Not recorded'), 'a missing RS vehicle is not copied from NR');
        assert.ok(await page.locator('a[href*="/graph?cars=1"][href*="competition=rs"]').count());
        assert.equal(await page.locator('.kpi').filter({ hasText: 'Starts' }).locator('b').innerText(), '2',
          'RS profiles expose evidenced championship starts in the common KPI slot');
        assert.equal(await page.locator('a[href*="/round/"]').count(), 0);
        const sharedProfileHeader = await page.locator('.profile-head').innerText();
        await competitionSwitch().click();
        await page.waitForURL(url => url.hash.includes('/person/alex-test?competition=nr'));
        assert.equal(await page.locator('.profile-head').innerText(), sharedProfileHeader,
          'switching keeps the canonical person, shared biography and selected season');
        assert.ok(await page.locator('.chart-card svg[aria-label="Points by round"]').count(),
          'NR keeps its existing points chart');
        await competitionSwitch().click();
        await page.waitForURL(url => url.hash.includes('/person/alex-test?competition=rs'));
        await page.locator('.rs-profile-points svg').waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await page.locator('.profile-head').innerText(), sharedProfileHeader);
        assert.equal(await page.locator('.rs-profile-points svg').count(), 1);
        await page.locator('a[href*="/graph?cars=1"][href*="competition=rs"]').first().click();
        await page.locator('.car-btn[data-car="1"][aria-pressed="true"]').waitFor();
        await page.locator('.chart-card svg').waitFor();
        assert.equal(await page.locator('.car-btn[aria-pressed="true"]').count(), 1);
        assert.equal(await page.locator('.car-btn[data-car="1"]').getAttribute('aria-pressed'), 'true',
          'RS0 profile graphs open with that person’s car selected');
        await visit('#/person/alex-test?competition=rs');
        await page.reload();
        await page.locator('.profile-head h1').filter({ hasText: 'Alex Test' }).waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0);
        await navigate(page, 'Getting started');
        await page.locator('.getting-started').waitFor();
        assert.equal(await competitionSwitch().getAttribute('aria-checked'), 'true');
        await navigate(page, 'Info');
        await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
        assert.ok(page.url().includes('competition=rs'));
        await navigate(page, 'Home');
        await page.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
        await page.goto(base + '/index.html');
        await page.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0, 'stored RS entry does not reopen welcome');
        await noOverflow();
        await competitionSwitch().focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => !location.hash.includes('results=rs') &&
          !location.hash.includes('leaders=rs') && !location.hash.includes('classes=rs') &&
          document.querySelectorAll('.event-card[data-competition="rs"]').length === 0);
        assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 0);
        assert.equal(await page.locator('.event-card[data-competition="nr"]').count(), 4);
        const nrPalette = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return { accent: css.getPropertyValue('--accent').trim(), category: css.getPropertyValue('--nr2'), good: css.getPropertyValue('--good') };
        });
        assert.equal(nrPalette.accent, theme === 'light' ? '#c51f32' : '#ff9ba6');
        assert.equal(nrPalette.category, palette.category);
        assert.equal(nrPalette.good, palette.good);
        await competitionSwitch().click();
        await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'true');
        await page.evaluate(() => window.NRDisplay.welcome('#/info?competition=rs'));
        await page.getByRole('dialog').getByRole('link', { name: 'click here to find out more' }).click();
        await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
        assert.ok(page.url().includes('competition=rs'));
        assert.equal(await page.getByRole('dialog').count(), 0);
        await visit('#/rallyesport/synthetic-rs-r2-results/classification');
        assert.match(await page.locator('.round-meta').innerText(), /Soetdoring.*Related NR event.*Gravel.*Related NR event/s);
        await noOverflow();
        const dnfRow = page.locator('.rs-classification tbody tr[data-car="3"]');
        assert.equal(await dnfRow.count(), 1);
        assert.equal(await dnfRow.locator('.rs-result-car').innerText(), '3');
        assert.equal(await dnfRow.locator('.rs-result-finish').innerText(), 'DNF');
        assert.equal(await dnfRow.locator('.participation-alert').count(), 0, 'timed DNF is not flagged');
        assert.deepEqual(await dnfRow.locator('.rs-result-points b').allTextContents(), ['0'],
          'equal known driver/co-driver DNF awards display once');
        assert.match(await dnfRow.locator('.rs-result-points .result-points-equal').getAttribute('aria-label'),
          /Driver and co-driver each scored 0 championship points/);
        await visit('#/rallyesport/synthetic-rs-r3-provisional/classification');
        const uncertainRow = page.locator('tr[data-car="44"]');
        assert.equal(await uncertainRow.locator('.participation-alert').count(), 0);
        assert.equal(await page.locator('tr[data-car="43"] .participation-alert').count(), 0, 'DNS is not ambiguous');
        assert.equal(await uncertainRow.locator('.rs-result-finish').innerText(), 'DNF');
        assert.doesNotMatch(await uncertainRow.innerText(), /participation is unresolved/);
        await noOverflow();
        await visit('#/2026/rounds?competition=rs');
        assert.match(await page.locator('.event-card').filter({ hasText: 'Synthetic RS R2' }).locator('.meta').innerText(),
          /Soetdoring.*Related NR event.*Gravel.*Related NR event/s);
        await noOverflow();
        await visit('#/rounds');
        assert.equal(await page.locator('.event-card').count(), 4, 'NR calendar includes NR events only');
        assert.deepEqual(await page.locator('.competition-badge').allTextContents(), ['NR', 'NR', 'NR', 'NR']);
        assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 0);
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
        const layout = await page.evaluate(() => {
          const tabs = document.querySelector('.tabs').getBoundingClientRect();
          const table = document.querySelector('.rs-classification').getBoundingClientRect();
          const crew = document.querySelector('.rs-result-crew').getBoundingClientRect();
          return { gap: table.top - tabs.bottom, crewLeft: crew.left, crewRight: crew.right, width: innerWidth };
        });
        assert.ok(layout.gap >= 0 && layout.gap <= 24, 'classification follows the tabs without a commentary wall');
        if (width <= 640) {
          assert.ok(layout.crewLeft >= 0 && layout.crewRight <= width, 'mobile crew and role scoring are visible without sideways scrolling');
          assert.equal(await page.locator('.rs-classification').evaluate(el => el.scrollWidth <= el.clientWidth), true);
        }
        assert.equal(await page.locator('.rs-result-points').count(), 15);
        assert.ok(!technicalChecksText.includes('2026 RS event minimum'));
        assert.ok(!technicalChecksText.includes('results are final pending'));
        assert.ok(technicalChecksText.includes('Pending technical checks'));
        assert.equal(await page.locator('.rs-source-notes').getAttribute('open'), null);
        assert.equal(await page.locator('.rs-scoring-order').getAttribute('open'), null);
        assert.ok(technicalChecksText.includes('RS0 · Non-Scoring*'));
        assert.ok((await page.locator('main').textContent()).includes('championship scoring'));
        const unverifiedSource = page.locator('table.data').first().locator('tbody tr').filter({ hasText: 'Synthetic Driver 6' });
        assert.equal(await unverifiedSource.locator('.rs-result-pos').innerText(), '6');
        assert.equal(await unverifiedSource.locator('.rs-result-car').innerText(), '6');
        assert.equal(await unverifiedSource.locator('[aria-label="Driver"]').textContent(), 'Synthetic Driver 6RS0 · Non-Scoring*');
        assert.equal(await unverifiedSource.locator('[aria-label="Co-driver"]').textContent(), 'Synthetic Co-driver 6RS4');
        assert.equal(await unverifiedSource.locator('.rs-result-class .cls').innerText(), 'RS4');
        assert.equal(await unverifiedSource.locator('.result-classpos').innerText(), '6');
        assert.equal(await unverifiedSource.locator('.rs-result-finish').innerText(), 'classified');
        assert.ok((await unverifiedSource.innerText()).includes('RS0 · Non-Scoring*'));
        assert.ok(!technicalChecksText.includes('eligibility unverified'));
        assert.ok(!technicalChecksText.includes('membership eligibility is unverified'));
        assert.ok(technicalChecksText.includes('Official finish is separate from each person’s championship scoring.'));
        assert.ok(await page.locator('.note-mark[title*="does not establish non-membership"]').count(),
          'the RS0 marker does not imply non-membership');
        assert.ok(technicalChecksText.includes('RS0 Non-Scoring SSR 6.1'));
        const sourceRow = page.locator('table.data tbody tr').filter({ hasText: 'Alex Test' }).first();
        assert.equal(await sourceRow.locator('.rs-result-pos').innerText(), '1');
        assert.equal(await sourceRow.locator('.rs-result-car').innerText(), '1');
        assert.equal(await sourceRow.locator('[aria-label="Driver"]').textContent(), 'Alex TestRS0 · Non-Scoring*');
        assert.equal(await sourceRow.locator('[aria-label="Co-driver"]').textContent(), 'Blake ExampleRS2');
        assert.equal(await sourceRow.locator('.rs-result-class .cls').innerText(), 'RS2');
        assert.equal(await sourceRow.locator('.rs-result-finish').innerText(), 'classified');
        assert.deepEqual(await sourceRow.locator('.rs-result-points b').allTextContents(), ['0', '15']);
        assert.ok(!technicalChecksText.includes('user-confirmed scoring finality'));
        assert.ok(!technicalChecksText.includes('Scoring finality is user-confirmed'));
        await page.locator('.rs-source-notes summary').focus();
        await page.keyboard.press('Enter');
        const sourceNotesText = await page.locator('.rs-source-notes').innerText();
        assert.ok(sourceNotesText.includes('results are final pending post-event technical checks'));
        assert.ok(sourceNotesText.includes('2026 RS event minimum: 6 source-backed starters'));
        assert.ok(sourceNotesText.includes('Published SSR V1 states 15; no written amendment is recorded.'));
        await page.locator('.rs-scoring-order summary').click();
        assert.ok(await page.locator('.rs-scoring-order table').isVisible());
        await noOverflow();
        await visit('#/rallyesport/synthetic-rs-r1-finality-review/classification');
        assert.equal(await page.locator('.rs-result-points').count(), 15);
        await visit('#/rallyesport');
        assert.ok(!(await page.locator('main').innerText()).includes('2026 RS event minimum'));
        await page.locator('.rs-scoring-notes summary').click();
        assert.ok((await page.locator('main').innerText()).includes('2026 RS event minimum: 6 source-backed starters'));
        await visit('#/person/rs-driver-3?competition=rs');
        assert.ok(!(await page.locator('main').innerText()).includes('Published SSR V1'));
        assert.equal(await page.locator('.rs-profile-points svg').count(), 1);
        await visit('#/person/rs-driver-4?competition=rs');
        assert.ok((await page.locator('main').innerText()).includes('Synthetic RS hatchback'));
        assert.ok(!(await page.locator('main').innerText()).includes('NR statistics are not included'));
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
          if (id === 'synthetic-rs-r2-results') {
            await page.locator('.chart-card .hit').first().hover();
            assert.match(await page.locator('.tip').innerText(), /Driver championship scoring: RS0 · Non-Scoring\*/,
              'the RS graph tooltip identifies the non-scoring role without altering official timing');
          }
          assert.equal(await page.locator('[data-metric]').count(), 6);
          assert.deepEqual(await page.locator('.tabs a').allTextContents(), ['Stage graph', 'Classification', 'Stage times']);
          await page.locator('[data-quick="none"]').click();
          await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 0);
          await page.locator('[data-car="1"]').click(); await page.locator('[data-car="2"]').click();
          await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
          await page.locator('[data-metric="loss"]').click();
          await page.waitForFunction(() => document.querySelector('[data-metric="loss"]').getAttribute('aria-pressed') === 'true');
          await page.locator('.tabs').getByRole('link', { name: 'Classification', exact: true }).click();
          await page.locator('.rs-classification').waitFor();
          await page.locator('.tabs').getByRole('link', { name: 'Stage times', exact: true }).click();
          await page.waitForURL(url => url.hash.includes('/' + id + '/stages?'));
          await page.getByText('Highlighted: fastest time in this competition on the stage.', { exact: false }).waitFor();
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
    assert.ok((await page.locator('main').innerText()).includes('RS0 · Non-Scoring*'));
    assert.ok(await page.locator('.note-mark[title*="does not establish non-membership"]').count(),
      'the profile marker does not imply non-membership');
    await page.locator('main a[href*="/rallyesport/"]').first().click();
    await page.locator('.chart-card svg').waitFor();
    const timingResult = bundle.season.rallyesport.results[0], savedTiming = F.copy(timingResult.entries);
    timingResult.entries.forEach(entry => { entry.times = timingResult.stages.map(() => null); entry.stagePos = timingResult.stages.map(() => null); });
    await visit('#/2026/rallyesport/' + timingResult.id);
    await page.getByText('No stage timing is published for this result.', { exact: true }).waitFor();
    await page.locator('[data-metric="spos"]').click();
    await page.getByText('No official stage positions are published for this result.', { exact: false }).waitFor();
    assert.equal(await page.locator('.chart-card .series circle').count(), 0);
    await page.locator('.tabs').getByRole('link', { name: 'Stage times', exact: true }).click();
    await page.getByText('No stage times are available.', { exact: true }).waitFor();
    timingResult.entries = savedTiming;
    await visit('#/?competition=rs');
    await page.locator('.footer a[href="privacy.html"]').click();
    assert.equal(await page.locator('#competitionBtn').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('html').getAttribute('data-competition'), 'rs');
    await page.locator('.nav').getByRole('link', { name: 'Site info', exact: true }).click();
    await page.getByRole('heading', { name: 'About the championship', exact: true }).waitFor();
    assert.ok(page.url().includes('competition=rs'));
    await visit('#/2026/about?competition=rs');
    await page.getByRole('heading', { name: 'Sources & data notes', exact: true }).waitFor();
    assert.equal(await page.locator('a[href*="/round/"]').count(), 0);
    const deniedPage = await ctx.newPage();
    await deniedPage.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Synthetic storage denial'); }; });
    await deniedPage.goto(base + '/index.html#/?competition=nr');
    await deniedPage.locator('#competitionBtn').click();
    await deniedPage.getByRole('button', { name: 'Continue', exact: true }).click();
    await deniedPage.reload();
    await deniedPage.getByRole('heading', { name: 'Class leaders · drivers' }).waitFor();
    assert.equal(await deniedPage.getByRole('dialog').count(), 0);
    await navigate(deniedPage, 'Crews');
    await deniedPage.getByRole('heading', { name: 'Crews', exact: true }).waitFor();
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
        const toggle = page.locator('#navigationToggle');
        if (await toggle.isVisible()) await toggle.click();
        assert.ok(await page.locator('.nav a.active').evaluate(el => {
          const a = el.getBoundingClientRect(), n = el.closest('nav').getBoundingClientRect();
          return a.left >= n.left - 1 && a.right <= n.right + 1;
        }), 'Active guide navigation remains visible on mobile');
        if (await toggle.isVisible()) await page.keyboard.press('Escape');
        assert.equal(await page.locator('#seasonSel, .season-pill').count(), 1);
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
        const jump = page.locator('.guide-jumps a[href="#/2026/getting-started/during?competition=nr"]');
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
      assert.equal(await page.locator('.hero-kicker').textContent(), '2026 · Season overview');
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
          const notes = page.locator('.result-source-notes'), summary = notes.locator('summary');
          assert.equal(await summary.innerText(), 'Source & scoring notes');
          assert.equal(await notes.getAttribute('open'), null);
          assert.equal(await notes.locator(':scope > div').isVisible(), false);
          assert.ok(await page.locator('.round-meta .badge.final').isVisible());
          assert.ok(await page.locator('.round-meta .badge.calc').isVisible());
          await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await notes.locator(':scope > div').isVisible(), true);
          const text = await notes.innerText();
          assert.ok(text.includes(bundle.rounds.R1.title));
          assert.ok(text.includes(bundle.rounds.R1.status));
          assert.ok(text.includes(bundle.rounds.R1.source.file));
          assert.ok(text.includes('Live timing is not used.'));
          assert.ok(text.includes('Synthetic round discrepancy & source evidence'));
          assert.ok(text.includes('Car 1: Synthetic crew discrepancy <evidence>'));
          assert.equal(await notes.locator('evidence').count(), 0);
          assert.equal(await notes.locator('a[href="' + sourceBefore.url + '"]').count(), 1);
          assert.ok(await notes.getByRole('link', { name: 'Copy of the PDF ↗', exact: true }).isVisible());
          await noOverflow();
          await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await notes.locator(':scope > div').isVisible(), false);
        }
      }
    }
    bundle.rounds.R1.notes = notesBefore; bundle.rounds.R1.source = sourceBefore;
    bundle.rounds.R1.entries[0].notes = crewNotesBefore;
    const graphEntriesBefore = bundle.rounds.R1.entries, firstGraphEntry = graphEntriesBefore[0];
    bundle.rounds.R1.entries = graphEntriesBefore.concat([{
      ...F.copy(firstGraphEntry), car: '2', driver: 'Synthetic graph rival', codriver: 'Synthetic graph co-driver', pos: 2,
      times: firstGraphEntry.times.map(time => E.fmtTime(E.parseTime(time) + .1)),
      total: E.fmtTime(E.parseTime(firstGraphEntry.total) + .1, true)
    }]);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/round/R1/graph?competition=nr&cars=1,2&m=pos');
        await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
        await page.locator('[data-metric="loss"]').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-metric="loss"]').getAttribute('aria-pressed') === 'true');
        await page.locator('.legend button').first().focus();
        assert.equal(await page.locator('.chart-card .series.dim').count(), 1);
        await page.locator('[data-metric="loss"]').focus();
        assert.equal(await page.locator('.chart-card .series.dim').count(), 0);
        for (const tab of ['Classification', 'Stage times', 'Stage graph']) {
          await page.locator('.tabs').getByRole('link', { name: tab, exact: true }).click();
          const query = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
          assert.deepEqual([query.get('cars'), query.get('m')], ['1,2', 'loss'], 'NR retains car/metric state across all tabs like RS');
          await noOverflow();
        }
        await page.getByRole('heading', { name: 'Head-to-head', exact: true }).waitFor();
        await page.locator('[data-quick="none"]').click();
        await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 0);
        await page.locator('[data-quick="' + firstGraphEntry.class + '"]').click();
        await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 2);
        assert.equal(await page.locator('.chart-card .series[data-key^="RS:"]').count(), 0);
        assert.equal(await page.locator('.chart-card .series path').first().evaluate(path => getComputedStyle(path).strokeDasharray), 'none');
        await page.locator('.chart-card .hit').first().hover();
        assert.ok((await page.locator('.tip').innerText()).includes('#1 ' + firstGraphEntry.driver.split(' ').pop()));
        await noOverflow();
      }
    }
    bundle.rounds.R1.entries = graphEntriesBefore;
    const stagesBefore = bundle.rounds.R1.stages;
    bundle.rounds.R1.stages = ['Final'].concat(stagesBefore.slice(1));
    await visit('#/round/R1/graph?competition=nr&cars=1&m=pos');
    await page.locator('.chart-card .hit').first().hover();
    assert.equal(await page.locator('.tip h4').textContent(), 'After Final', 'a stage named Final is not the classification endpoint');
    await page.locator('.chart-card .hit').last().hover();
    assert.equal(await page.locator('.tip h4').textContent(), 'Final (official, incl. penalties)');
    bundle.rounds.R1.stages = stagesBefore;
    // Finality is derived from headings, not merely from the absence of "provisional".
    for (const [status, unclear, label] of [
      ['Final Official Classification', false, 'Final classification'],
      ['Final Official Classification 5/5', false, 'Final classification'],
      ['Provisional Official Classification 8/8', false, 'Provisional classification'],
      ['Classification', false, 'Finality unclear'],
      ['', false, 'Finality unclear'],
      ['Final Official Classification', true, 'Finality unclear']
    ]) {
      bundle.rounds.R1.status = status; bundle.rounds.R1.finalityUnclear = unclear;
      await visit('#/round/R1/classification');
      assert.ok((await page.innerText('.round-meta')).includes(label));
      await visit('#/about');
      assert.equal(await page.locator('main table .badge').innerText(), label);
      const expected = label === 'Final classification' ? 'Final' :
        label === 'Provisional classification' ? 'Provisional' : 'Finality unclear';
      await visit('#/rounds');
      assert.equal(await page.locator('main table .badge').innerText(), expected);
    }
    const savedNrFinality = F.copy(bundle.rounds.R1);
    bundle.rounds.R1.status = 'Final Official Classification';
    bundle.rounds.R1.notes = ['Results are final pending post event technical checks.'];
    bundle.rounds.R1.currentFinalityReview = { version: 1, confirmedFinal: true,
      digest: E.currentFinalityDigest(bundle.rounds.R1, 'nr') };
    bundle.season.rallyesport = F.copy(initialRsData);
    const reviewedRs = bundle.season.rallyesport.results.find(result => result.id === rsResult.id);
    reviewedRs.currentFinalityReview = { version: 1, confirmedFinal: true,
      digest: E.currentFinalityDigest(reviewedRs, 'rs') };
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const hash of ['#/round/R1/classification?competition=nr',
          '#/rallyesport/synthetic-rs-r2-results/classification?competition=rs']) {
          await visit(hash);
          assert.doesNotMatch(await page.locator('main').innerText(), /confirmed by user|independent technical clearance/i);
          assert.match(await page.locator('.round-meta').innerText(), /Final classification/);
          await page.locator('.result-source-notes summary').click();
          assert.doesNotMatch(await page.locator('.result-source-notes').innerText(), /pending post.?event technical checks/i);
          await noOverflow();
        }
      }
    }
    bundle.rounds.R1 = savedNrFinality;
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
      ['Pos', 'No.', 'Crew', 'Class', 'Car', 'Stages', 'Penalty', 'Official total', 'Diff 1st', 'Diff prev', 'Class pos', 'Championship pts']);
    const rsCells = page.locator('main table tbody tr').first().locator('td');
    assert.equal(await rsCells.nth(0).innerText(), 'TEST');
    assert.equal(await rsCells.nth(1).innerText(), '88');
    assert.equal(await rsCells.nth(10).innerText(), '3');
    assert.equal(await rsCells.nth(2).locator('.result-finish').innerText(), 'TEST');
    assert.equal(await rsCells.nth(7).locator('b').innerText(), '—');
    assert.ok(!(await page.locator('main table tbody').innerText()).includes('DNS'));
    await page.locator('.tabs').getByRole('link', { name: 'Stage times', exact: true }).click();
    await page.getByText('Highlighted: fastest time in this competition on the stage.', { exact: false }).waitFor();
    const stageCells = page.locator('main table tbody tr').first().locator('th,td');
    assert.equal(await stageCells.nth(1).innerText(), '0:01.0\n—');
    assert.equal(await stageCells.nth(2).innerText(), '—\n—');
    assert.equal(await stageCells.nth(3).innerText(), '0:03.0\nP7');
    await visit('#/rallyesport/synthetic-rs-result/graph?cars=88&m=spos');
    assert.equal(await page.locator('.series circle').count(), 1, 'a later printed stage position survives a missing earlier time');
    assert.deepEqual(await page.locator('.axis .lbl').allTextContents(), ['Stage 1', 'Stage 2', 'Stage 3']);
    await page.locator('.hit[data-i="2"]').hover();
    assert.ok((await page.locator('.tip').innerText()).includes('P7'));
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.getByRole('heading', { name: 'Rounds & stage graphs', exact: true }).waitFor();
    assert.ok(page.url().includes('/rounds?competition=nr'), 'unmapped standalone result switches to NR rounds, not a guessed mapping');
    const standaloneRs = bundle.season.rallyesport;
    const graphResult = standaloneRs.results[0];
    graphResult.nrRoundId = 'R1';
    graphResult.stages = [{ id: 'ss1', label: 'SS1', nrStage: 'SS1' }, { id: 'ss3', label: 'SS3', nrStage: 'SS3' }];
    graphResult.entries = [
      { car: '88', driver: 'Alex Test', codriver: '', class: 'RS2', status: 'classified', pos: 1, classPos: 1,
        total: '1:00.01', times: ['1:00.01', '00:01.00'], stagePos: [1, 1] },
      { car: '89', driver: 'Blake Example', codriver: '', class: 'RS2', status: 'classified', pos: 2, classPos: 2,
        total: '1:00.04', times: ['1:00.04', '00:01.00'], stagePos: [2, 1] }
    ];
    graphResult.entries[0].class = '2WD';
    graphResult.entries[1].class = '4WD';
    graphResult.classMappings = { '2WD': 'RS2', '4WD': 'RS4' };
    graphResult.classMappingEvidence = 'Synthetic event-specific category review';
    const mappedSourceBefore = F.copy(graphResult);
    bundle.season.rallyesport = F.copy(initialRsData);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const hash of [
          '#/2026/?competition=rs',
          '#/2026/rounds?competition=rs',
          '#/2026/standings?competition=rs',
          '#/rallyesport/synthetic-rs-r2-results/classification',
          '#/rallyesport/synthetic-rs-r2-results/graph?cars=1,6',
          '#/rallyesport/synthetic-rs-r2-results/stages',
          '#/2026/crews?competition=rs',
          '#/2026/person/alex-test?competition=rs',
          '#/2026/person/blake-example?competition=rs'
        ]) {
          await visit(hash);
          if (hash.includes('/classification')) await page.locator('.rs-source-notes summary').click();
          const text = await page.locator('main').textContent();
          assert.doesNotMatch(text, /\b[24]WD\b/, 'RS public surfaces use only the explicit mapped class labels');
          if (!hash.includes('/person/blake-example')) assert.match(text, /RS2/, hash + ': ' + text);
          if (!hash.includes('/person/')) assert.match(text, /RS4/);
          if (hash.includes('/graph')) {
            assert.match(await page.locator('.legend').innerText(), /RS2[\s\S]*RS4/);
            assert.equal(await page.locator('[data-quick="RS2"]').count(), 1);
            assert.equal(await page.locator('[data-quick="RS4"]').count(), 1);
          }
          if (hash.includes('/rounds')) {
            const winners = page.locator('main table.data').last();
            assert.equal(await winners.locator('tbody tr').count(), 6, await page.locator('main').innerText());
            assert.ok((await winners.innerText()).includes('Launch event'), await winners.innerText());
            const r2Winner = winners.locator('tbody tr').filter({ hasText: 'Synthetic RS R2' });
            assert.ok((await r2Winner.innerText()).includes('Pending technical checks'));
            assert.ok(!(await r2Winner.innerText()).includes('Synthetic Driver 1'),
              'a source note that withholds finality does not announce a round winner');
            const r1Winner = winners.locator('tbody tr').filter({ hasText: 'Synthetic RS R1' });
            assert.ok((await r1Winner.innerText()).includes('Alex Test / Blake Example'),
              'the source-classified winner follows an accepted finality review, not championship points');
            assert.ok((await r1Winner.innerText()).includes('Synthetic Driver 3'),
              'class winners are derived from official class positions');
            assert.equal(await winners.locator('tbody tr').filter({ hasText: 'Synthetic RS R3' }).locator('.badge').getAttribute('aria-label'), 'Provisional classification',
              'unfinalized classifications do not announce a round winner');
            const launchWinner = winners.locator('tbody tr').filter({ hasText: 'Synthetic Launch Event' });
            assert.ok((await launchWinner.innerText()).includes('Launch event'));
            assert.ok((await launchWinner.innerText()).includes('Launch Example'));
            const upcoming = winners.locator('tbody tr').filter({ hasText: 'Synthetic RS R5' });
            assert.ok((await upcoming.innerText()).includes('Not published'));
            assert.ok(!(await upcoming.innerText()).includes('Synthetic Driver'),
              'upcoming events do not acquire a fabricated winner');
          }
          if (hash.includes('/crews')) assert.equal(await page.locator('.rs-crews-table').count(), 1);
          await noOverflow();
        }
      }
    }
    bundle.season.rallyesport = standaloneRs;
    assert.deepEqual(graphResult, mappedSourceBefore, 'browsing never rewrites source categories or mappings');
    await visit('#/rallyesport/synthetic-rs-result/classification');
    assert.ok(!(await page.locator('main').innerText()).includes('Championship class mapping'));
    await page.locator('.rs-source-notes summary').click();
    assert.ok((await page.locator('main').innerText()).includes('Displayed classes: RS2, RS4'));
    assert.ok(!(await page.locator('main').textContent()).includes('Synthetic event-specific category review'),
      'private review evidence is not rendered as public commentary');
    assert.deepEqual(await page.locator('.rs-result-class .cls').allTextContents(), ['RS2', 'RS4']);
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
    assert.equal(await page.locator('nav[aria-label="Result views"]').count(), 1);
    assert.equal(await page.locator('.series:not([data-key^="RS:"])').count(), 0);
    assert.equal(await page.locator('.chart-card .series path').first().evaluate(path => getComputedStyle(path).strokeDasharray), 'none');
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
    await page.waitForFunction(() => document.querySelectorAll('.car-btn[aria-pressed="true"]').length === 1);
    assert.equal(await page.locator('.car-btn[aria-pressed="true"]').getAttribute('data-car'), '88');
    await page.locator('[data-quick="top5"]').click();
    await page.locator('[data-quick="all"]').click();
    await page.locator('[data-hl]').first().focus();
    assert.equal(await page.locator('.series.dim').count(), 1);
    await noOverflow();
    await visit('#/round/R1/classification');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.waitForFunction(() => document.getElementById('competitionBtn').getAttribute('aria-checked') === 'true');
    assert.equal(await page.getByRole('dialog').count(), 0);
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
    await eventCount('1 documented event entry');
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').count(), 1);
    bundle.season.events[0].links.entryList = 'https://example.com/entries';
    await eventCount('1 documented event entry');
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').count(), 1);
    assert.equal(await page.locator('.event-top a[href="https://example.com/entries"]').innerText(), 'Entry list ↗');
    bundle.season.events[0].links.entryList = 'https://example.com/another-entry-list';
    await eventCount('1 documented event entry');
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
      assert.equal(await link.getAttribute('href'), '#/2026/person/' + encodeURIComponent(id) + '?competition=nr');
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
    assert.equal(await page.getByRole('heading', { name: 'Class leaders · drivers' }).count(), 1);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=nr',
      'the NR empty standings state retains the NR calendar link');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.event-card[data-competition="rs"]').length === 6);
    assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 6);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=rs',
      'the NR no-scored-starts branch switches its calendar link to RS results');
    delete bundle.season.rallyesport;
    bundle.rounds.R1.entries = entriesBefore;
    legacyEngine = true;
    for (const hash of ['#/', '#/rounds', '#/round/R1/classification', '#/crews', '#/person/alex-test']) {
      await visit(hash);
      assert.ok(!(await page.innerText('main')).includes('Something went wrong'));
      assert.equal(await page.getByText('Events entered (documented)', { exact: true }).count(), 0);
      if (hash === '#/crews') {
        assert.equal(await page.getByRole('columnheader', { name: 'Starts', exact: true }).count(), 1);
        assert.equal(await page.getByRole('columnheader', { name: 'Standings', exact: true }).count(), 1);
      }
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
    await eventCount('3 documented event entries');
    bundle.season.entryLists[0].entries.push({ ...entered, driver: 'Alex Test', car: '4', roundIds: ['R2'] });
    await eventCount('3 documented event entries');
    bundle.season.entryLists[0].entries.pop();
    await visit('#/rounds');
    const upcoming = page.locator('.event-card[data-competition="nr"]').filter({ hasText: 'Synthetic Event' }).first()
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
    await eventCount('1 documented event entry (partial)');
    await visit('#/rounds');
    assert.ok((await upcoming.nth(0).innerText()).includes('partial day coverage'));
    assert.ok((await upcoming.nth(1).innerText()).includes('round entry coverage incomplete'));
    bundle.season.entryLists[0].entries = [entered]; bundle.season.entryLists[0].roundIds = [];
    await eventCount('1 documented event entry (partial)');
    await visit('#/rounds');
    for (let i = 0; i < 2; i++) {
      const text = await upcoming.nth(i).innerText();
      assert.ok(text.includes('round entry coverage unknown'));
      assert.ok(!text.includes('0 documented'));
    }
    bundle.season.entryLists[0].entries = [];
    await eventCount('');
    bundle.season.entryLists[0].complete = true;
    await eventCount('0 documented event entries');
    bundle.season.entryLists[0].entries = Array.from({ length: 20 }, (_, i) => ({
      ...entered, driver: 'Synthetic Crew ' + i, car: String(i + 1)
    }));
    await eventCount('20 documented event entries');
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
    assert.equal(await page.getByRole('heading', { name: 'Class leaders · drivers' }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=nr',
      'the NR no-results branch retains the NR calendar link');
    await page.getByRole('switch', { name: 'RallyeSport competition' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.event-card[data-competition="rs"]').length === 6);
    assert.equal(await page.locator('.event-card[data-competition="rs"]').count(), 6);
    assert.equal(await page.getByRole('link', { name: 'Full calendar →' }).getAttribute('href'), '#/2026/rounds?competition=rs',
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
    await page.getByRole('heading', { name: 'No results yet', exact: true }).waitFor();
    for (const hash of ['#/2027/standings?competition=rs', '#/2027/rounds?competition=rs', '#/2027/crews?competition=rs',
      '#/2027/person/alex-test?competition=rs']) {
      await visit(hash);
      assert.equal(await page.getByRole('switch', { name: 'RallyeSport competition' }).getAttribute('aria-checked'), 'true');
      assert.equal(await page.locator('a[href*="/round/"]').count(), 0, 'RS empty seasons never expose NR results as RS');
    }
    await visit('#/2027/rounds?competition=rs');
    await page.locator('#seasonSel').selectOption('2026');
    await page.waitForURL(url => url.hash === '#/2026/rounds?competition=rs');
    await page.getByRole('heading', { name: 'Rounds & stage graphs' }).waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: 'Rounds & stage graphs' }).waitFor();
    assert.equal(await page.locator('#seasonSel').inputValue(), '2027');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.addInitScript(() => { Date.now = () => Date.parse('2027-03-01T10:00:00Z'); });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('nr-theme', t), theme);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await visit('#/');
        const home = await page.innerText('main');
        for (const absent of ['NR Entries unknown', 'Championship leaders']) assert.ok(!home.includes(absent), absent);
        assert.deepEqual(await page.locator('.hero-stat b').allTextContents(), ['0 / 5', '1', '—', '—']);
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
        assert.equal(await page.locator('#seasonSel').inputValue(), '2027');
        assert.equal(await page.locator('.guide-edition').count(), 0);
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
    assert.equal(await page.getByRole('heading', { name: 'Class leaders · drivers' }).count(), 0,
      'NR home does not include RS leader blocks');
    assert.ok((await page.innerText('main')).includes('No events have been added to the 2027 calendar'),
      'the standalone RS event does not create an NR calendar event');
    await visit('#/2027/rallyesport');
    assert.match(await page.innerText('main'), /RS points unavailable/i);
    assert.ok(!(await page.innerText('main')).includes('Provisional cumulative points'),
      'unconfigured 2027 rules do not show provisional or zero RS points');
    await visit('#/2027/rallyesport/rs-only-2027-opening-final/classification');
    await page.getByRole('heading', { name: 'Synthetic RS-only 2027 opening' }).waitFor();
    assert.ok((await page.textContent('main')).includes('Synthetic 2027 RS final classification'));
    assert.ok((await page.innerText('main')).includes('Points unavailable'));
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
    await navigate(page, 'Home');
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
    console.log('PASS public theme: shared NR/RS layouts, independent data/graphs/profiles, welcome keyboard behavior; responsive palettes, guide, source evidence, print and disclosures.');
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
module.exports = { published };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
