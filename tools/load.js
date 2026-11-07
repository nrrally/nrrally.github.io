// Node helper used by the tools and tests: reads a backup file downloaded from the admin (Dashboard → Backups)
// and builds a season. Give the backup as an argument ending in .json, or in the NR_DATA environment variable.
const fs = require('fs'), path = require('path');
const E = require('../assets/engine.js');
const ROOT = path.resolve(__dirname, '..');
const SRC = process.argv.slice(2).find(a => /\.json$/i.test(a)) || process.env.NR_DATA || '';
if (!SRC) { console.error('Give a backup file downloaded from the admin, e.g.  node tools/validate.js nr-rally-backup-2027-03-01.json'); process.exit(2); }
const BACKUP = JSON.parse(fs.readFileSync(path.resolve(SRC), 'utf8'));
if (!BACKUP || BACKUP.format !== 'nr-rally-backup' || !BACKUP.docs) throw new Error(`${SRC} isn't a backup made by the admin`);
function exists(p) { return Object.prototype.hasOwnProperty.call(BACKUP.docs, p); }
function readJson(p) {
  if (!exists(p)) { const e = new Error(`${p} is missing`); e.code = 'ENOENT'; throw e; }
  return JSON.parse(JSON.stringify(BACKUP.docs[p]));
}
function listRoundFiles(year) {
  const pre = `data/seasons/${year}/rounds/`;
  return Object.keys(BACKUP.docs).filter(k => k.startsWith(pre)).map(k => k.slice(pre.length));
}
function hasPhoto(id) { return !!(BACKUP.photos && BACKUP.photos[id]); }
function sourceLabel() { return `backup ${path.basename(SRC)} (exported ${BACKUP.exportedAt || 'unknown'})`; }
function loadSeason(year) {
  const site = readJson('data/site.json'), people = readJson('data/people.json');
  const season = readJson(`data/seasons/${year}/season.json`);
  const rounds = {};
  for (const r of season.rounds) {
    const f = `data/seasons/${year}/rounds/${r.id}.json`;
    if (r.results && exists(f)) rounds[r.id] = readJson(f);
  }
  return { site, people, season, rounds, model: E.buildSeason({ season, rounds, people }) };
}
module.exports = { ROOT, readJson, exists, listRoundFiles, hasPhoto, sourceLabel, loadSeason, E };
