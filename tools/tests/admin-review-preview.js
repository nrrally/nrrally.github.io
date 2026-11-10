/* Loopback-only synthetic review. Never connects to Firebase or accepts publication.
   Run with Node; stop the process when review is finished. No dependencies required. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const AI = require('../../assets/ai-import.js');
const { fixtures, nrRound } = require('./admin-access-e2e.js');
const root = path.resolve(__dirname, '..', '..');
const docs = JSON.parse(JSON.stringify(fixtures));
const people = docs['data/people.json'];
const season = docs['data/seasons/2026/season.json'];
const rs = season.rallyesport;
rs.results[0].entries[1].class = 'RS2';
rs.results[0].entries[1].classPos = 2;
rs.events[0].name = 'Synthetic Riverside Sprint';
rs.events[0].roundNumber = 1;
rs.events[0].starterCount = 6;
rs.events[0].starterCountEvidence = 'Synthetic reviewed count; local demonstration only.';
rs.membershipReview.people['alex-test'].status = 'missing-license';
rs.results[0].entries[2].times = ['01:40.0', null];
for (let n = 4; n <= 6; n++) {
  const id = 'synthetic-driver-' + n;
  people.people.push({ id, name: 'Synthetic Driver ' + n, aliases: [], bio: '', photo: '', links: {} });
  rs.membershipReview.people[id] = { status: 'eligible', basis: 'membership-sheet' };
  rs.results[0].entries.push({ car: String(n), driver: 'Synthetic Driver ' + n, codriver: '',
    class: n === 6 ? 'RS4' : 'RS2', status: 'classified', pos: n, classPos: n === 6 ? 1 : n,
    times: ['02:10.0', '02:20.0'], stagePos: [n, n], total: '04:30.0', penalty: null, invited: false });
}
for (let n = 2; n <= 4; n++) {
  const event = { ...rs.events[0], id: 'synthetic-rs-event-' + n, name: 'Synthetic RS meeting ' + n, roundNumber: n };
  const result = JSON.parse(JSON.stringify(rs.results[0]));
  result.id = 'synthetic-rs-result-' + n; result.eventId = event.id;
  if (n === 4) result.status = 'Provisional classification';
  rs.events.push(event); rs.results.push(result);
}
docs['data/seasons/2026/rounds/R1.json'] = nrRound;
const prefix = 'projects/nr-synthetic/databases/(default)/documents/';
const field = value => ({ stringValue: JSON.stringify(value) });
const store = {};
function put(id, fields) { store[id] = { name: prefix + id, fields, updateTime: '2026-01-01T00:00:00Z' }; }
put('docs/site', { json: field(docs['data/site.json']) });
put('docs/people', { json: field(people) });
put('docs/season_2026', { json: field(season) });
put('docs/round_2026_R1', { json: field(nrRound) });
put('public/site', { json: field(docs['data/site.json']) });
put('public/people', { json: field(people) });
put('public/season_2026', { json: field({ season: AI.projectPublic(season, people), rounds: { R1: nrRound } }) });
put('config/admins', { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } });
put('config/revision', { n: { integerValue: '1' } });
const shim = `
window.NR_FIREBASE={projectId:"nr-synthetic",apiKey:"fake",authDomain:"nr-synthetic.firebaseapp.com"};
(() => {
  let current={email:"admin@example.com",name:"Synthetic review admin",photo:""};
  window.NR_TEST_AUTH={ready:()=>Promise.resolve(),user:()=>current,observe:()=>{},
    signIn:()=>Promise.resolve(current={email:"admin@example.com",name:"Synthetic review admin",photo:""}),
    signOut:()=>{current=null;return Promise.resolve();},token:()=>Promise.resolve("synthetic-local-only")};
  const store=${JSON.stringify(store).replace(/</g, '\\u003c')};
  window.fetch=(input,options={})=>{
    const url=new URL(typeof input==="string"?input:input.url,location.href);
    if(options.method && options.method!=="GET")return Promise.reject(new Error("Local review is read-only: publication and provider writes are disabled."));
    const marker="/databases/(default)/documents";
    if(url.origin!=="https://firestore.googleapis.com" || !url.pathname.includes("/projects/nr-synthetic/") || !url.pathname.includes(marker))
      return Promise.reject(new Error("External network is disabled in this synthetic preview."));
    const key=decodeURIComponent(url.pathname.split(marker)[1].replace(/^\\//,""));
    let value=store[key];
    if(!key.includes("/")) value={documents:Object.keys(store).filter(id=>id.startsWith(key+"/")).map(id=>store[id])};
    return Promise.resolve(new Response(JSON.stringify(value||{}),{status:value?200:404,headers:{"Content-Type":"application/json"}}));
  };
})();
`;
const server = http.createServer((req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end('Read-only preview'); return; }
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'none'");
  if (pathname === '/__preview.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(shim); return; }
  if (pathname === '/assets/firebase-config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end('/* Synthetic configuration supplied by preview shim. */'); return; }
  const name = pathname === '/' || pathname === '/admin/' ? '/admin/index.html' : pathname;
  if (!/^\/(?:assets\/[\w.-]+|admin\/index\.html|index\.html|disclaimer\.html|privacy\.html)$/.test(name)) {
    res.writeHead(404); res.end('Not part of this review'); return;
  }
  const file = path.join(root, ...name.split('/').filter(Boolean));
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }[path.extname(file)];
  res.writeHead(200, { 'Content-Type': type || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (name.endsWith('.html')) {
    const html = fs.readFileSync(file, 'utf8').replace('<body class="adm-body">', '<body class="adm-body"><aside class="demo-bar">SYNTHETIC LOCAL REVIEW - no real competitors or database connection. Working edits are temporary; publication is disabled.</aside>')
      .replace('<script src=', '<script src="/__preview.js"></script><script src=');
    res.end(html);
  } else fs.createReadStream(file).pipe(res);
});
server.listen(0, '127.0.0.1', () => console.log('Synthetic admin review: http://127.0.0.1:' + server.address().port + '/admin/index.html#/rallyesport'));
