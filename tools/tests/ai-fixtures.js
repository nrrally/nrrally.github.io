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
    p.coverage = [{ sourceId: 'results', kind: 'results', locator: 'Page 1', complete: true, rows: 1, classified: 1, DNF: 0, DNS: 0, omissions: [],
      classification: { batchIndex: 1, totalBatches: 1, pages: [1], totalPages: 1, totalRows: 1 } }];
  }
  return p;
}
function revisedRallyeSport(withUpcoming = false) {
  const all = docs(), s = all['data/seasons/2026/season.json'], people = all['data/people.json'];
  const entries = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    for (const role of ['driver', 'codriver']) people.people.push({
      id: 'synthetic-' + role + '-' + n, name: 'Synthetic ' + role + ' ' + n, aliases: []
    });
    return { car: String(n), driver: 'Synthetic driver ' + n, codriver: 'Synthetic codriver ' + n,
      class: n === 7 ? 'RS4' : 'RS2', status: n === 8 || n === 9 ? 'DNF' : n === 10 ? 'DNS' : 'classified',
      pos: n <= 7 ? n : null, classPos: n <= 7 ? n === 7 ? 1 : n : null,
      times: [n <= 8 ? '01:00.' + n : null], stagePos: [n <= 8 ? n : null],
      total: n <= 7 ? '01:00.' + n : null, penalty: null, invited: n === 1 };
  });
  const events = ['Launch Event', 'GR Legends', 'Ermelo', 'TRAC N4', 'Willem Prinsloo / S2 Mine'].map((name, i) => ({
    id: 'rs-r' + (i + 1), name: 'Synthetic ' + name, dates: '', roundNumber: i === 0 ? undefined : i,
    countsForChampionship: i !== 0, championshipEvidence: 'Synthetic reviewed event scope.',
    rulesetConfirmed: true, rulesetEvidence: 'Synthetic applicability.', doublePoints: false
  }));
  const results = events.slice(0, withUpcoming ? 5 : 4).map(event => ({
    id: event.id + '-classification', eventId: event.id, title: 'Synthetic official classification',
    status: 'Final classification', source: { file: 'synthetic.pdf' }, notes: [],
    stages: [{ id: 'ss1', label: 'SS1' }], entries: copy(entries)
  }));
  results[0].entries[0].status = 'TEST';
  results[0].entries[0].class = 'TEST';
  results[0].entries[0].launchNonScoringReview = { evidence: 'Synthetic explicit launch-only crew classification.' };
  s.rallyesport = {
    ruleset: { code: 'clubman-sprint-2026-v1', year: 2026,
      title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
      version: 1, issueDate: '2026-07-09', sourceUrl: 'https://example.com/synthetic-rs-ssr.pdf' },
    eligibilityPolicy: { code: 'entry-based-2026-v1', reviewed: true, evidence: 'Synthetic user-confirmed entry-based policy; not an SSR amendment.' },
    starterMinimumReview: { minimum: 6, reviewed: true, evidence: 'Synthetic reviewed six-starter minimum; no written amendment.' },
    membershipReview: { sourceDate: '2026-11-09', reviewed: true, evidence: 'Synthetic private legacy membership evidence.',
      people: { 'synthetic-driver-1': { status: 'non-member', basis: 'membership-sheet' },
        'synthetic-codriver-1': { status: 'missing-license', basis: 'membership-sheet' } } },
    nonScoringPeople: ['synthetic-driver-1', 'synthetic-codriver-2'], events, results
  };
  return { docs: all, season: s, people, data: s.rallyesport };
}
function preEventEntries() {
  const f = revisedRallyeSport();
  f.data.events.at(-1).name = 'Synthetic upcoming RS event';
  f.data.events.at(-1).dates = '2026-11-28';
  f.data.entryLists = [{ eventId: 'rs-r5', complete: false,
    source: { title: 'Synthetic entries received', date: '2026-11-16', url: '' },
    entries: [{ car: '301', driverId: 'synthetic-driver-1', codriverId: 'synthetic-codriver-1',
      enteredClass: 'RS4', vehicle: 'Synthetic entry vehicle' }] }];
  return f;
}
function rawRallyeSportTiming() {
  const f = revisedRallyeSport();
  const rows = Array.from({ length: 7 }, (_, i) => ({
    car: String(i + 1), driver: 'Synthetic driver ' + (i + 1), codriver: 'Synthetic codriver ' + (i + 1),
    driverId: 'synthetic-driver-' + (i + 1), codriverId: 'synthetic-codriver-' + (i + 1),
    class: i === 6 ? 'RS4' : 'RS2', vehicle: 'Synthetic car', status: 'classified',
    times: ['1:00.01', '1:00.02', '1:00.03', '1:00.04', '1:00.05', '1:00.06'],
    penalty: '0:00.0' + (i + 1), finalTime: '6:00.' + (22 + i)
  }));
  rows[1].class = 'RS0';
  rows[1].nonScoringEvidence = 'Synthetic explicit RS0 classification for this event only.';
  f.data.entryLists = [{ eventId: 'rs-r5', complete: true,
    source: { title: 'Synthetic entered classes', date: '2026-11-17', url: '' },
    entries: rows.map(row => ({ car: row.car, driverId: row.driverId, codriverId: row.codriverId,
      enteredClass: row.class, vehicle: row.vehicle })) }];
  f.input = { id: 'synthetic-timing', eventId: 'rs-r5', title: 'Synthetic marshals timing',
    source: { file: 'synthetic.xlsx', description: 'Synthetic SS1-SS6 timing sheet, not official final results.' },
    precision: 2, identityEvidence: 'Synthetic exact role/class reconciliation.',
    stages: Array.from({ length: 6 }, (_, i) => ({ id: 'ss' + (i + 1), label: 'SS' + (i + 1) })), rows };
  return f;
}
function rawRS0Example(wins = false) {
  const f = rawRallyeSportTiming();
  f.input.rows.forEach((row, i) => {
    row.car = String((i + 1) * 100);
    row.class = i === 0 ? 'RS4' : i === 2 ? 'RS0' : 'RS2';
    delete row.nonScoringEvidence;
    if (i === 2) {
      row.nonScoringEvidence = 'Synthetic event-only RS0 review.';
      for (const role of ['driver', 'codriver']) {
        row[role] = 'Synthetic RS0 ' + role;
        row[role + 'Id'] = 'synthetic-rs0-' + role;
        f.people.people.push({ id: row[role + 'Id'], name: row[role], aliases: [] });
      }
    }
    const rank = wins && i === 0 ? 3 : wins && i === 2 ? 1 : i + 1;
    row.times = ['1:00.0' + rank, ...Array(5).fill('1:00.00')];
    row.penalty = '0:00.00';
    row.finalTime = '6:00.0' + rank;
    Object.assign(f.data.entryLists[0].entries[i], { car: row.car, driverId: row.driverId,
      codriverId: row.codriverId, enteredClass: row.class });
  });
  return f;
}
module.exports = { copy, docs, season, payload, source, revisedRallyeSport, preEventEntries, rawRallyeSportTiming, rawRS0Example };
