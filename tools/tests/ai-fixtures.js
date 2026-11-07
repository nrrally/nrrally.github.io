/* Synthetic data only. Shared by the local import and mocked-browser tests. */
const AI = require('../../assets/ai-import.js');
function copy(x) { return JSON.parse(JSON.stringify(x)); }
function season(year = 2027) {
  return {
    year, championship: 'Synthetic Rally Championship', shortName: 'Synthetic', status: 'planned',
    pointsScale: { overall: [10, 6, 3], cls: [5, 3, 1] }, minStarts: 1,
    classes: [{ id: 'OPEN', desc: 'Open', classOnly: false }, { id: 'TEST', desc: 'Class only', classOnly: true }],
    documents: [{ title: 'Synthetic SSR', kind: 'SSR', date: '2027-01-01', url: 'https://example.com/ssr.pdf' }],
    events: [{ id: 'test-event', name: 'Synthetic Event', short: 'Test', dates: '2027-02-01', venue: 'Test venue', surface: 'gravel', links: {} }],
    rounds: [{ id: 'R1', eventId: 'test-event', day: 'Day 1', date: '2027-02-01' }], notes: []
  };
}
function docs() {
  const s = season(2026);
  s.classMap = { drivers: {}, codrivers: {} }; s.msa = { confirmedRounds: [] };
  return {
    'data/site.json': { siteName: 'Synthetic Rally', currentSeason: 2026, seasons: [{ year: 2026, label: '2026' }], info: { documents: [] }, social: [], contact: {} },
    'data/people.json': { people: [{ id: 'alex-test', name: 'Alex Test', aliases: ['A Test'], bio: 'Preserve this', photo: '', links: {} }] },
    'data/seasons/2026/season.json': s
  };
}
function source(id, kind) {
  return { id, kind, title: 'Synthetic ' + kind, file: id + '.pdf', url: 'https://example.com/' + id + '.pdf',
    date: '2027-01-01', version: '1', readable: true, supersedes: null };
}
function payload(task = 'season', year = 2027) {
  const p = {
    format: 'nr-rally-ai-import', version: 1, task, target: { year, roundId: task === 'results' ? 'R1' : null },
    baseToken: 'synthetic-pack', sources: [source('ssr', 'SSR')], rules: null, season: null,
    competitors: [], rounds: [], issues: [], coverage: [], evidence: []
  };
  if (task === 'season' || task === 'amendment') {
    p.season = season(year); p.rules = {};
    Object.keys(AI.policy).forEach(k => { p.rules[k] = { value: AI.policy[k], sourceId: 'ssr', locator: 'Clause ' + k, assessment: 'supported' }; });
    Object.keys(p.season).forEach(k => p.evidence.push({ ref: 'season.' + k, sourceId: 'ssr', locator: 'Table ' + k }));
    p.coverage.push({ sourceId: 'ssr', kind: 'regulations', locator: 'All scoring clauses', complete: true, rows: 0, classified: 0, DNF: 0, DNS: 0, omissions: [] });
  }
  if (task === 'competitors') {
    p.sources = [source('entries', 'EntryList')];
    p.competitors = [{ ref: 'alex', name: 'Alex Test', existingId: null, aliases: [] }, { ref: 'new', name: 'Blake Example', existingId: null, aliases: [] }];
    p.evidence = p.competitors.map(c => ({ ref: 'competitors.' + c.ref, sourceId: 'entries', locator: 'Row 1 crew' }));
    p.coverage = [{ sourceId: 'entries', kind: 'entries', locator: 'Page 1', complete: true, rows: 1, classified: 0, DNF: 0, DNS: 0, omissions: [] }];
  }
  if (task === 'results') {
    p.sources = [source('results', 'Classification')];
    p.competitors = [{ ref: 'alex', name: 'Alex Test', existingId: null, aliases: [] }, { ref: 'new', name: 'Blake Example', existingId: null, aliases: [] }];
    p.evidence = p.competitors.map(c => ({ ref: 'competitors.' + c.ref, sourceId: 'results', locator: 'Car 1' }));
    p.rounds = [{ id: 'R1', title: 'Synthetic classification', status: 'Final Official Classification', stages: ['SS1', 'SS3'], notes: [],
      source: { sourceId: 'results', file: 'results.pdf', url: 'https://example.com/results.pdf' },
      entries: [{ status: 'classified', pos: 1, car: '1', driverRef: 'alex', codriverRef: 'new', class: 'OPEN', vehicle: 'Test car', stages: 2,
        times: ['1:00.0', '2:00.0'], stagePos: [1, 1], pen: null, total: '3:00.0', credit: null, scoredClass: null, notes: [] }], extraStarts: [] }];
    p.evidence.push({ ref: 'rounds.R1.entries.1', sourceId: 'results', locator: 'Car 1, page 1' });
    p.coverage = [{ sourceId: 'results', kind: 'results', locator: 'Page 1', complete: true, rows: 1, classified: 1, DNF: 0, DNS: 0, omissions: [] }];
  }
  return p;
}
module.exports = { copy, docs, season, payload, source };
