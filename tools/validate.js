#!/usr/bin/env node
/* Checks the results data: every season, round, competitor and link between them.
   Run it on a backup downloaded from the admin:   node tools/validate.js nr-rally-backup-2026-11-06.json
   Exits with code 1 if it finds errors. */
const fs = require('fs'), path = require('path');
const { readJson, exists, listRoundFiles, hasPhoto, sourceLabel, E } = require('./load.js');
let errors = 0, warnings = 0;
const gh = !!process.env.GITHUB_ACTIONS;
function err(file, msg) { errors++; console.log(gh ? `::error file=${file}::${msg}` : `ERROR   ${file}: ${msg}`); }
function warn(file, msg) { warnings++; console.log(gh ? `::warning file=${file}::${msg}` : `warning ${file}: ${msg}`); }
function tryRead(rel) { try { return readJson(rel); } catch (e) { err(rel, exists(rel) ? 'not valid JSON: ' + e.message : 'file is missing'); return null; } }

console.log(`Checking ${sourceLabel()}`);
const site = tryRead('data/site.json'), people = tryRead('data/people.json');
if (site && people) {
  const years = (site.seasons || []).map(s => +s.year);
  if (!years.length) err('data/site.json', 'no seasons listed');
  if (years.indexOf(+site.currentSeason) < 0) err('data/site.json', `currentSeason ${site.currentSeason} is not one of the seasons`);
  const ids = {}, names = {};
  (people.people || []).forEach(p => {
    if (!p.id || !p.name) err('data/people.json', 'a competitor has no id or name');
    if (ids[p.id]) err('data/people.json', `id "${p.id}" is used twice`); ids[p.id] = 1;
    [p.name].concat(p.aliases || []).forEach(n => { const k = E.normName(n).toLowerCase(); if (names[k] && names[k] !== p.id) warn('data/people.json', `"${n}" belongs to both ${names[k]} and ${p.id}`); names[k] = p.id; });
    if (/^db:/.test(p.photo || '')) { if (hasPhoto(p.photo.slice(3)) === false) warn('data/people.json', `${p.name}'s photo isn't in this backup`); }
    else if (p.photo && !/^https?:/.test(p.photo) && !exists(p.photo)) err('data/people.json', `${p.name}'s photo ${p.photo} is missing`);
  });
  for (const y of years) {
    const sp = `data/seasons/${y}/season.json`, season = tryRead(sp);
    if (!season) continue;
    if (+season.year !== y) err(sp, `year inside the file is ${season.year}, expected ${y}`);
    const evs = {}; (season.events || []).forEach(e => { if (evs[e.id]) err(sp, `event id ${e.id} is used twice`); evs[e.id] = 1; });
    const rounds = {}, seen = {};
    (season.rounds || []).forEach(r => {
      if (seen[r.id]) err(sp, `round ${r.id} is listed twice`); seen[r.id] = 1;
      if (!evs[r.eventId]) err(sp, `round ${r.id} points at unknown event "${r.eventId}"`);
      const rp = `data/seasons/${y}/rounds/${r.id}.json`;
      if (r.results && !exists(rp)) err(sp, `round ${r.id} is marked as having results but ${rp} is missing`);
      if (!r.results && exists(rp)) warn(rp, `results file exists but round ${r.id} isn't marked "results": true, so the site ignores it`);
      if (r.results && exists(rp)) {
        const raw = tryRead(rp); if (!raw) return;
        rounds[r.id] = raw;
        E.validateRound(raw, {}).forEach(i => { if (i.level === 'error') err(rp, i.msg); else if (i.level === 'warn') warn(rp, i.msg); });
        if (raw.source && raw.source.pdf && !exists(raw.source.pdf)) err(rp, `the PDF ${raw.source.pdf} is missing`);
      }
    });
    listRoundFiles(y).forEach(f => { const id = f.replace(/\.json$/, ''); if (!seen[id]) warn(`data/seasons/${y}/rounds/${f}`, `not on the ${y} calendar, so the site ignores it`); });
    (season.documents || []).forEach(d => { if (d.url && !/^https?:/i.test(d.url) && !exists(d.url)) err(sp, `document "${d.title}" points at missing file ${d.url}`); });
    (season.msa && season.msa.confirmedRounds || []).forEach(id => { if (!rounds[id]) warn(sp, `MSA-confirmed round ${id} has no results`); });
    try {
      const m = E.buildSeason({ season, rounds, people });
      console.log(`${y}: ${m.rounds.length}/${(season.rounds || []).length} rounds with results · ${m.standings.drivers.length} drivers · ${m.standings.codrivers.length} co-drivers` + (m.standings.drivers[0] ? ` · leader ${m.standings.drivers[0].name} (${m.standings.drivers[0].total})` : ''));
    } catch (e) { err(sp, 'the standings could not be calculated: ' + e.message); }
  }
}
console.log(errors ? `\n${errors} error(s), ${warnings} warning(s). Fix the errors and publish again; the site was not updated.` : `\nData OK (${warnings} warning${warnings === 1 ? '' : 's'}).`);
process.exit(errors ? 1 : 0);
