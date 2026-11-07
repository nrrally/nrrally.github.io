#!/usr/bin/env node
/* Lists every manual decision recorded in the results data, so the data documents itself:
   overrides on result rows (points credit, scored class, sum-check exceptions), starts recorded
   without a sheet row, season class assignments that differ from the printed class, and notes.
   Usage:  node tools/report.js [year] <backup.json>     (default: every season) */
const { loadSeason, readJson, E } = require('./load.js');
const yearArg = process.argv.slice(2).find(a => /^\d{4}$/.test(a));
const only = yearArg ? +yearArg : null;
const site = readJson('data/site.json');
const years = (site.seasons || []).map(s => +s.year).filter(y => !only || y === only).sort();
if (!years.length) { console.log('No matching season.'); process.exit(1); }

for (const y of years) {
  const { season, rounds, model } = loadSeason(y);
  console.log(`\n=== ${y}: ${season.championship || ''} ===`);
  const conf = (season.msa && season.msa.confirmedRounds) || [];
  console.log(`Rounds with results: ${model.rounds.map(r => r.id).join(', ') || 'none'}`);
  console.log(`Points confirmed against ${season.msa && season.msa.label || 'the official standings'}: ${conf.join(', ') || 'none'}` + (season.msa && season.msa.generated ? ` (published ${season.msa.generated})` : ''));
  (season.notes || []).forEach(n => console.log(`Season note: ${n}`));

  for (const r of model.rounds) {
    const raw = rounds[r.id], lines = [];
    (raw.notes || []).forEach(n => lines.push(`note: ${n}`));
    (raw.entries || []).forEach(e => {
      if (e.credit) {
        const c = e.credit, who = [];
        if (c.driver) who.push(`driver points to ${c.driver}`);
        if (c.codriver) who.push(`co-driver points to ${c.codriver}`);
        if (c.noCodriver) who.push('no co-driver start counted');
        lines.push(`car ${e.car}: CREDIT ${who.join('; ')} (printed ${e.driver} / ${e.codriver}). Why: ${c.why || '(no reason given)'}`);
      }
      if (e.scoredClass) lines.push(`car ${e.car}: SCORED CLASS ${E.normClass(e.scoredClass)} on this row (printed ${E.normClass(e['class'])})`);
      if (e.skipSumCheck) lines.push(`car ${e.car}: total accepted as printed although stage times + penalty differ`);
      (e.notes || []).forEach(n => lines.push(`car ${e.car}: note: ${n}`));
    });
    r.entries.forEach(e => { if (e.cls !== e.printedClass && !(raw.entries.find(x => String(x.car) === e.car) || {}).scoredClass) lines.push(`car ${e.car}: scored in ${e.cls} (season class of ${e.champDriver}); sheet prints ${e.printedClass}`); });
    (raw.extraStarts || []).forEach(x => lines.push(`EXTRA START car ${x.car} ${x.driver} / ${x.codriver} (${x['class']}), 0 points: ${x.note || ''}`));
    console.log(`\n${r.id} (${r.title || 'no title'}; ${r.status || 'no status'}; ${r.confirmed ? 'points confirmed' : 'points calculated'})`);
    if (raw.source && (raw.source.file || raw.source.url)) console.log(`  source: ${raw.source.file || ''} ${raw.source.url ? '<' + raw.source.url + '>' : ''}`);
    lines.length ? lines.forEach(l => console.log('  - ' + l)) : console.log('  - no overrides or notes');
  }

  const cm = season.classMap || {};
  for (const [k, label] of [['drivers', 'driver'], ['codrivers', 'co-driver']]) {
    const m = cm[k] || {}, ids = Object.keys(m);
    if (ids.length) console.log(`\nSeason ${label} classes (${ids.length}): ` + ids.map(id => `${id}=${m[id]}`).join(', '));
  }
}
