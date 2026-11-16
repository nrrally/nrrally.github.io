/* Synthetic editorial projection checks; no provider access or sporting-data edits. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../../assets/engine.js');
const AI = require('../../assets/ai-import.js');
const P = require('../../assets/public-model.js');
const C = require('../../assets/public-components.js');
const F = require('./ai-fixtures.js');

const OLD_INFO = 'The MSA Northern Regions Regional Rally Championship runs alongside the national rounds held in the Northern Regions. This site publishes the official classifications, the championship standings and stage-by-stage graphs for Northern Regions crews.';

function buildNR() {
  const season = F.season(2026);
  season.msa = {
    confirmedRounds: ['R1'], label: 'MSA Northern Regions points',
    generated: '15 September 2026', url: 'https://example.com/standings.pdf'
  };
  season.notes = [
    "MSA's points PDF lists the top 19 drivers and co-drivers only, so the other crews' R1–R5 points are calculated here with the same scale.",
    'Retained synthetic note.'
  ];
  const round = F.payload('results', 2026).rounds[0];
  round.notes = [
    'SS2 does not appear on the sheet; SS4 shows the same 5:34.1 for most crews, as printed.'
  ];
  const model = E.buildSeason({ season, rounds: { R1: round }, people: { people: [] } });
  return { model, round };
}

function buildRS() {
  const fixture = F.revisedRallyeSport(true);
  fixture.data.results[0].notes = [
    'For this R1 classification only, the user confirmed that 2WD maps to RS2 and 4WD maps to RS4.',
    'The source heading/status remains Provisional Official Classification 4/4. The user confirmed this supplied result may be treated as final for scoring; this does not revise the source document or establish that a later official version was published.',
    'Identity review: the user confirmed car 212 driver identity in both source sheets; the canonical profile is Synthetic driver 1.',
    'Retained note before. No licence numbers are transcribed. Retained note after.',
    'Retained synthetic source note.'
  ];
  const model = E.buildSeason({
    season: AI.projectPublic(fixture.season, fixture.people),
    rounds: {}, people: fixture.people, publicProjection: true
  });
  return { model, resultId: fixture.data.results[0].id };
}

test('approved NR wording is projected without mutating source records or sporting output', () => {
  const { model, round } = buildNR();
  const before = JSON.stringify(model);
  const display = P.result(model, 'nr', 'R1', 'classification');
  assert.equal(display.pointsLabel, 'MSA comparison recorded');
  assert.ok(display.notes.includes('Stage times are shown as published in the linked classification.'));
  assert.ok(!display.notes.some(note => /SS2 does not appear|same 5:34\.1/.test(note)));
  assert.equal(display.rows.length, round.entries.length);
  assert.deepEqual(round.notes, [
    'SS2 does not appear on the sheet; SS4 shows the same 5:34.1 for most crews, as printed.'
  ], 'source commentary remains intact');

  const source = P.sources(model, 'nr');
  assert.ok(source.notes.includes('Points not listed in the cited MSA standings are calculated on this site.'));
  assert.ok(source.notes.includes('Retained synthetic note.'));
  assert.ok(!source.notes.some(note => /top 19|same scale/.test(note)));
  assert.ok(!source.sections[0].paragraphs.some(text => /minimum .*starts for eligibility|Overall:|Class:/.test(text)));
  assert.ok(source.sections[0].paragraphs.includes(
    'R1 points checked against MSA Northern Regions points (15 September 2026). For official results and points, consult NRC South Africa and Motorsport South Africa.'
  ));
  assert.equal(P.information(model, 'nr', { info: { intro: OLD_INFO } }).intro,
    'This site displays results transcribed from official classifications and independently compiles standings and stage graphs for Northern Regions crews.');
  assert.equal(JSON.stringify(model), before, 'copy changes do not mutate source, positions, times, points, or standings');
});

test('approved RS commentary is omitted while source status, rank, classes, times and points remain', () => {
  const { model, resultId } = buildRS();
  const before = JSON.stringify(model);
  const display = P.result(model, 'rs', resultId, 'classification');
  const original = model.rallyesport.results.find(result => result.id === resultId);
  assert.equal(display.sourceStatus, original.status);
  assert.equal(display.sourceTitle, original.title);
  assert.equal(display.rows.length, original.entries.length);
  assert.deepEqual(display.rows.map(row => [row.car, row.pos, row.status, row.printedClass, row.total]),
    original.entries.map(entry => [String(entry.car), entry.pos, entry.status, entry.class, entry.total || '—']));
  assert.ok(display.notes.includes('Retained synthetic source note.'));
  assert.ok(display.notes.includes('Retained note before. Retained note after.'));
  assert.ok(!JSON.stringify(display.notes).match(/user.confirmed|identity review|licence numbers|explicitly reviewed crew/i));
  assert.ok(!/user.confirmed|identity review|licence numbers|entry-based eligibility/i.test(
    C.sources(P.sources(model, 'rs')).html));

  const standings = P.standings(model, 'rs', 'driver');
  const html = C.standings(standings).html;
  assert.ok(!/entry-based eligibility|membership, licence|invitation do not exclude|six-starter|SSR V1 states 15|tie-breaks remain unresolved/i.test(html));
  assert.ok(html.includes('Equal totals share a displayed position; consult the official standings for any championship tie-break.'));
  assert.equal(JSON.stringify(model), before, 'the public copy projection leaves all published source and score facts intact');
});
