const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const PDF = require('../../assets/classification-pdf.js');
const F = require('./ai-fixtures.js');
const MI = require('../../assets/membership-identifiers.js');

function example() {
  const f = F.rawRS0Example(true), draft = E.ingestRallyeSportTiming(f.season, f.people, f.input);
  assert.deepEqual(draft.issues, []);
  f.data.results.push(draft.result);
  const season = AI.projectPublic(f.season, f.people);
  const model = E.buildSeason({ season, rounds: {}, people: f.people, publicProjection: true });
  return { display: P.eventResult(model, 'rs-r5', 'classification'), source: season.rallyesport.results.at(-1) };
}
test('PDF data preserves published timing, RS0 event position and provisional source status', () => {
  const { display, source } = example(), data = PDF.prepare(display, source, 'rs');
  assert.equal(data.state, 'Provisional classification');
  assert.equal(data.classified, 7);
  const rs0 = data.rows.find(row => row.car === '300');
  assert.equal(rs0.pos, '1');
  assert.equal(rs0.cls, 'RS0');
  assert.equal(rs0.classPos, '1');
  assert.equal(rs0.stagesCompleted, '6');
  assert.equal(rs0.total, '6:00.01');
  assert.deepEqual(rs0.stages, source.entries.find(row => row.car === '300').times);
  assert.equal(rs0.penalty, '0:00.00');
  assert.equal(rs0.crew, 'Synthetic RS0 driver / Synthetic RS0 codriver');
});
test('unpublished, empty or ambiguous source cannot become a classification PDF', () => {
  const { display, source } = example();
  assert.throws(() => PDF.prepare({ ...display, published: false }, source, 'rs'), /No published/);
  assert.throws(() => PDF.prepare(display, { entries: [] }, 'rs'), /No published/);
  assert.throws(() => PDF.prepare(display, { entries: [source.entries[0], source.entries[0]] }, 'rs'), /Duplicate car/);
  assert.throws(() => PDF.prepare(display, { entries: source.entries.slice(1) }, 'rs'), /invalid|match/);
  assert.throws(() => PDF.prepare({ ...display, rows: display.rows.map((row, i) => i === 1 ? display.rows[0] : row) }, source, 'rs'), /ambiguous/);
  assert.throws(() => PDF.prepare(display, { ...source, entries: source.entries.map((entry, i) =>
    i === 0 ? { ...entry, times: [...entry.times, '1:00.00'] } : entry) }, 'rs'), /invalid|ambiguous/);
});
test('mixed unresolved and ambiguous crew roles retain names/placeholders without blocking a private PDF', () => {
  const { display, source } = example();
  const first = display.rows[0], second = display.rows[1];
  const people = { people: [{ id: 'verified', name: first.driver.name, aliases: [] }] };
  first.driver = { ...first.driver, id: 'verified' };
  first.codriver = { ...first.codriver, id: null };
  second.driver = { ...second.driver, id: 'verified', ambiguous: true };
  const numbers = { ...MI.emptyNumbers(), people: { verified: { msaNumber: '00123' } } };
  const joined = MI.exportRows(display.rows, numbers, people, MI.publicPeople(people));
  const data = PDF.prepare(display, source, 'rs', joined);
  assert.equal(data.rows[0].crew, first.driver.name + ' / ' + first.codriver.name);
  assert.equal(data.rows[0].licences, 'MSA 00123 / No MSA Number');
  assert.equal(data.rows[1].licences, 'No MSA Number / No MSA Number');
  assert.match(data.notes.at(-1), /Unresolved crew roles: \d+\. Membership numbers omitted; printed names are unchanged/);
  assert.equal(data.rows.length, source.entries.length);
});
test('unclear source status is not converted into a final classification', () => {
  const { display, source } = example();
  assert.equal(PDF.prepare({ ...display, state: 'Finality unclear' }, source, 'rs').state, 'Finality unclear');
  assert.equal(PDF.prepare({ ...display, state: 'Pending technical checks' }, source, 'rs').state, 'Pending technical checks');
});
test('not-classified rows retain source totals and counts without inventing a position', () => {
  const { display, source } = example();
  const rows = display.rows.map((row, i) => i ? row : { ...row, status: 'DNF' });
  const data = PDF.prepare({ ...display, rows }, source, 'rs');
  assert.equal(data.rows[0].pos, 'DNF');
  assert.equal(data.rows[0].total, source.entries.find(entry => entry.car === rows[0].car).total);
  assert.equal(data.classified, rows.length - 1);
  assert.equal(data.unclassified, 1);
});
test('Stg counts only valid recorded times for raw and legacy classifications', () => {
  const f = F.rawRallyeSportTiming();
  Object.assign(f.input.rows[5], { status: 'DNF', times: ['1:00.01', '1:00.02', null, null, null, null], finalTime: null });
  Object.assign(f.input.rows[6], { status: 'DNS', times: Array(6).fill(null), finalTime: null });
  const draft = E.ingestRallyeSportTiming(f.season, f.people, f.input);
  assert.deepEqual(draft.issues, []);
  f.data.results.push(draft.result);
  const season = AI.projectPublic(f.season, f.people);
  const display = P.eventResult(E.buildSeason({ season, rounds: {}, people: f.people, publicProjection: true }), 'rs-r5', 'classification');
  const source = season.rallyesport.results.at(-1), before = JSON.stringify(source);
  const data = PDF.prepare(display, source, 'rs');
  for (const [car, count] of [['1', '6'], ['6', '2'], ['7', '0']])
    assert.equal(data.rows.find(row => row.car === car).stagesCompleted, count);
  assert.equal(JSON.stringify(source), before, 'export does not change published rows');
  const stored = { ...display, rows: display.rows.map(row => row.car === '6' ? { ...row, stages: 4 } : row) };
  assert.equal(PDF.prepare(stored, source, 'rs').rows.find(row => row.car === '6').stagesCompleted, '2');
  stored.rows[0] = { ...stored.rows[0], linkedNrStages: 8 };
  const linked = PDF.prepare(stored, source, 'rs');
  assert.equal(linked.rows[0].linkedNrStages, 8);
  assert.equal(linked.rows[0].stagesCompleted, '6');
  assert.match(linked.notes.at(-1), /NR is the separately matched broader source-printed count/);
  const legacy = { ...source }; delete legacy.timingCalculation;
  const legacyData = PDF.prepare(display, legacy, 'rs');
  assert.equal(legacyData.rows.find(row => row.car === '1').stagesCompleted, '6');
  assert.equal(legacyData.rows.find(row => row.car === '6').stagesCompleted, '2');
  assert.equal(legacyData.rows.find(row => row.car === '7').stagesCompleted, '0');
  assert.match(legacyData.notes.at(-1), /counts recorded stage times; it does not prove a start or completion/);
  const missing = { ...legacy, entries: legacy.entries.map((entry, i) => i ? entry : { ...entry, times: undefined }) };
  assert.equal(PDF.prepare(display, missing, 'rs').rows.find(row => row.car === '1').stagesCompleted, '—');
  const malformed = { ...legacy, entries: legacy.entries.map((entry, i) =>
    i ? entry : { ...entry, times: ['not a time', ...entry.times.slice(1)] }) };
  assert.throws(() => PDF.prepare(display, malformed, 'rs'), /stage timing is invalid/);
  const invalid = structuredClone(source); invalid.entries[0].total = '0:00.00';
  assert.throws(() => PDF.prepare(display, invalid, 'rs'), /raw timing is invalid/);
});
test('stage counts cover TEST rows and championship wording comes from explicit public event status', () => {
  const f = F.revisedRallyeSport(true), season = AI.projectPublic(f.season, f.people);
  const model = E.buildSeason({ season, rounds: {}, people: f.people, publicProjection: true });
  const launch = P.eventResult(model, 'rs-r1', 'classification');
  const launchSource = season.rallyesport.results[0];
  const launchData = PDF.prepare(launch, launchSource, 'rs');
  assert.equal(launch.championshipStatus, 'Non-scoring event · not a championship round');
  assert.equal(launchData.championshipStatus, launch.championshipStatus);
  assert.equal(launchData.rows.find(row => row.status === 'TEST').stagesCompleted, '1');
  const scoring = P.eventResult(model, 'rs-r5', 'classification');
  assert.equal(scoring.championshipStatus, 'Round 4');
  const noStatusModel = { ...model, rallyesport: { ...model.rallyesport,
    events: model.rallyesport.events.map(event => {
      if (event.id !== 'rs-r5') return event;
      const copy = { ...event }; delete copy.countsForChampionship; return copy;
    }) } };
  const noStatus = P.eventResult(noStatusModel, 'rs-r5', 'classification');
  assert.equal(noStatus.championshipStatus, '');
  assert.equal(PDF.prepare(noStatus, season.rallyesport.results.find(result => result.eventId === 'rs-r5'), 'rs')
    .championshipStatus, '');
});
test('NR round wording and recorded stage count are retained without a generic club label', () => {
  const docs = F.docs(), season = docs['data/seasons/2026/season.json'], people = docs['data/people.json'];
  season.rounds = [{ id: 'R1', eventId: 'test-event', day: 'Day 1', date: '2026-02-01' }];
  const source = F.payload('results', 2026).rounds[0];
  source.id = 'R1';
  const display = P.result(E.buildSeason({ season, rounds: { R1: source }, people }), 'nr', 'R1', 'classification');
  const data = PDF.prepare(display, source, 'nr');
  assert.equal(data.championshipStatus, 'Round 1');
  assert.equal(data.rows[0].stagesCompleted, '2');
  assert.doesNotMatch(data.championshipStatus, /Club Championship/);
});
test('source finality and technical-check note remain unchanged', () => {
  const { display, source } = example();
  const text = 'Technical checks remain pending.';
  const data = PDF.prepare({ ...display, state: 'Provisional classification', notes: [text] }, source, 'rs');
  assert.equal(data.state, 'Provisional classification');
  assert.equal(data.championshipStatus, display.championshipStatus);
  assert.deepEqual(data.notes, [text, 'Stg counts recorded stage times; it does not prove a start or completion.']);
});
test('scoresheet uses reference columns, nonzero penalty colour, bold totals and SAST calendar date', () => {
  const { display, source } = example(), data = PDF.prepare(display, source, 'rs');
  data.rows[0].linkedNrStages = 8;
  class Document {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 842, getHeight: () => 595 }, getNumberOfPages: () => 1 };
      this.lastAutoTable = { finalY: 100 }; this.texts = [];
    }
    setFont() {} setTextColor() {} setFontSize() {} setDrawColor() {} setLineWidth() {}
    line() {} addImage() {} setPage() {} addPage() {}
    getImageProperties() { return { width: 364, height: 100, fileType: 'PNG' }; }
    splitTextToSize(value) { return [value]; }
    text(value) { this.texts.push(value); }
    autoTable(options) { this.options = options; }
  }
  const doc = PDF.build({ ...data, championshipStatus: 'Round 4', date: '28 November 2026' },
    Document, '', new Date('2026-11-17T23:30:00Z'));
  assert.deepEqual(doc.options.columns.map(column => column.header),
    ['Pos', 'Car', 'DRIVER / CO-DRIVER', 'CL', 'CAR model', 'Stg', ...data.stages, 'PEN', 'TOTAL', 'Diff 1st', 'Diff prev']);
  assert.equal(doc.options.body[0].stagesCompleted, 'RS 6\nNR 8');
  assert.equal(doc.options.body[1].stagesCompleted, 'RS 6\nNR —');
  function style(key, penalty) {
    const cell = { section: 'body', column: { dataKey: key }, row: { raw: { penalty } }, cell: { styles: {} } };
    doc.options.didParseCell(cell); return cell.cell.styles;
  }
  assert.equal(style('total', '0:00.00').fontStyle, 'bold');
  assert.deepEqual(style('penalty', '0:00.01').textColor, [219, 40, 50]);
  assert.equal(style('penalty', '0:00.00').textColor, undefined);
  assert.equal(style('penalty', 'unavailable').textColor, undefined);
  assert.ok(doc.texts.includes('Round 4 · Generated 18 November 2026 01:30 SAST'));
  doc.options.didDrawPage();
  assert.ok(doc.texts.includes('Round 4  ·  28 November 2026'));
  assert.ok(!doc.texts.some(text => String(text).includes('Club Championship')));
});
