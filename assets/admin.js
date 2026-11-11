/* Northern Regions Rally — admin.
   Admins sign in with Google. The results data lives in a private Cloud Firestore database; edits are kept in
   the browser until you publish, then saved in one step together with a refreshed public copy that the
   website reads, and a history entry that can be undone. Demo mode edits a copy and never saves.
   See docs/architecture.md. */
(function () {
  'use strict';
  var E = window.NREngine;
  var AI = window.NRAIImport;
  var ROOT = document.getElementById('admin');
  var SITE = 'data/site.json', PEOPLE = 'data/people.json';
  function seasonPath(y) { return 'data/seasons/' + y + '/season.json'; }
  function roundPath(y, id) { return 'data/seasons/' + y + '/rounds/' + id + '.json'; }
  function photoPath(id) { return 'data/people/' + id + '.jpg'; }

  /* ------------------------------------------------------------------ utils */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(obj) { return E.prettyJson(obj) + '\n'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function lines(t) { return String(t || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
  function words(t) { return String(t || '').split(/[,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function nums(t) { return words(t).map(Number).filter(function (n) { return !isNaN(n); }); }
  function uniqueId(base, taken) { base = base || 'item'; var id = base, n = 2; while (taken[id]) id = base + '-' + (n++); return id; }
  function numOrNull(v) { v = String(v == null ? '' : v).trim(); return v === '' || isNaN(+v) ? null : +v; }
  function strOrNull(v) { v = String(v == null ? '' : v).trim(); return v === '' ? null : v; }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:|mailto:)/i.test(u) || /^[\w./-]+$/.test(u) ? u : ''; }
  function when(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var s = (Date.now() - d) / 1000;
    if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  }
  function fileToB64(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).replace(/^data:[^,]*,/, '')); }; r.onerror = function () { rej(new Error('Could not read ' + file.name)); }; r.readAsDataURL(file); });
  }
  function imageToJpegB64(file, max) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.86).replace(/^data:[^,]*,/, ''));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That file is not an image the browser can read.')); };
      img.src = url;
    });
  }
  function download(name, text) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------------ state: the working copy of /data */
  function newState() { return { mode: null, user: null, docs: {}, bins: {}, meta: {}, rev: null, admins: null, empty: false, photoCache: {}, dropPublic: [], year: null, open: {}, imp: null, history: null, lastCommit: null }; }
  var A = newState(), sessionVersion = 0;
  function clearSession() { sessionVersion++; A = newState(); }
  function checkSession(version, user) {
    var current = AUTH && AUTH.user();
    if (version !== sessionVersion || !current || !user || current.email !== user.email) throw new Error('The admin session changed. Sign in again.');
  }
  function getDoc(p) { var d = A.docs[p]; return d && !d.deleted ? d.obj : null; }
  function putDoc(p, obj) { var d = A.docs[p]; if (d) { d.obj = obj; d.deleted = false; } else A.docs[p] = { orig: null, obj: obj, deleted: false }; }
  function dropDoc(p) { if (A.docs[p]) A.docs[p].deleted = true; }
  function site() { return getDoc(SITE); }
  function peopleDoc() { var p = getDoc(PEOPLE); if (!p) { p = { people: [] }; putDoc(PEOPLE, p); } if (!p.people) p.people = []; return p; }
  function season(y) { return getDoc(seasonPath(y == null ? A.year : y)); }
  function rawRound(id, y) { return getDoc(roundPath(y == null ? A.year : y, id)); }
  function years() { return ((site() && site().seasons) || []).map(function (s) { return +s.year; }).sort(function (a, b) { return b - a; }); }
  function calRound(id, y) { var s = season(y); return s ? (s.rounds || []).filter(function (r) { return r.id === id; })[0] : null; }
  function roundNo(id, y) { var s = season(y); var i = s ? (s.rounds || []).map(function (r) { return r.id; }).indexOf(id) : -1; return i + 1; }
  function eventById(id, y) { var s = season(y); return s ? (s.events || []).filter(function (e) { return e.id === id; })[0] : null; }
  function model(y) {
    y = y == null ? A.year : y;
    var s = season(y); if (!s) return null;
    var rounds = {}; (s.rounds || []).forEach(function (r) { var raw = rawRound(r.id, y); if (raw && r.results) rounds[r.id] = raw; });
    return E.buildSeason({ season: s, rounds: rounds, people: peopleDoc() });
  }
  function changes() {
    var out = [];
    Object.keys(A.docs).sort().forEach(function (p) {
      var d = A.docs[p];
      if (d.deleted) { if (d.orig != null) out.push({ path: p, kind: 'delete', before: d.orig }); return; }
      var t = norm(d.obj);
      if (d.orig == null) out.push({ path: p, kind: 'add', text: t, before: '' });
      else if (t !== d.orig) out.push({ path: p, kind: 'update', text: t, before: d.orig });
    });
    Object.keys(A.bins).sort().forEach(function (p) {
      var b = A.bins[p];
      out.push(b.deleted ? { path: p, kind: 'delete', binary: true } : { path: p, kind: 'update', b64: b.b64, binary: true });
    });
    return out;
  }
  function workingDocs() {
    var docs = {};
    Object.keys(A.docs).forEach(function (p) { if (!A.docs[p].deleted) docs[p] = A.docs[p].obj; });
    return docs;
  }
  function entryContractError() {
    if (!E || E.analyticsContractVersion !== 1 || typeof E.validateAnalytics !== 'function') {
      return 'Analytics scripts are missing or out of date. Refresh this page with Ctrl+Shift+R before restoring or publishing; nothing has been published.';
    }
    if (E.rallyeSportContractVersion !== 2 || typeof E.validateRallyeSport !== 'function' || typeof E.projectRallyeSport !== 'function' ||
      typeof E.rallyeSportEntryPolicy !== 'function' || typeof E.rallyeSportLaunchRS0 !== 'function') {
      return 'RallyeSport scripts are missing or out of date. Refresh this page with Ctrl+Shift+R before restoring or publishing; nothing has been published.';
    }
    if (!E || E.rallyNoticeContractVersion !== 1 || typeof E.validateActiveRally !== 'function' || typeof E.nrcDestination !== 'function') {
      return 'Rally-notice scripts are missing or out of date. Refresh this page with Ctrl+Shift+R before restoring or publishing; nothing has been published.';
    }
    return !E || E.entryContractVersion !== 2 || typeof E.validateEntryLists !== 'function' || typeof E.entryEvidenceLoss !== 'function' ||
      !AI || AI.entryContractVersion !== 2 || typeof AI.validateDocuments !== 'function' ?
      'Entry-aware scripts are missing or out of date. Refresh this page with Ctrl+Shift+R before restoring or publishing; nothing has been published.' : '';
  }
  function requireEntryContract() { var err = entryContractError(); if (err) throw new Error(err); }
  function publishIssues() {
    var err = entryContractError();
    return err ? [{ level: 'error', path: SITE, msg: err }] : AI.validateDocuments(workingDocs());
  }
  function label(p) {
    var m;
    if (p === SITE) return 'Site & info';
    if (p === PEOPLE) return 'Competitors';
    if ((m = p.match(/^data\/seasons\/(\d+)\/season\.json$/))) return m[1] + ' season settings & calendar';
    if ((m = p.match(/^data\/seasons\/(\d+)\/rounds\/(.+)\.json$/))) return m[1] + ' ' + m[2] + ' results';
    if ((m = p.match(/^data\/people\/(.+)\.\w+$/))) return 'Photo: ' + m[1];
    return p;
  }
  function knownNames(kind) {
    var idx = E.peopleIndex(peopleDoc()), unknown = {};
    years().forEach(function (y) {
      var s = season(y); if (!s) return;
      if (kind !== 'results') (s.entryLists || []).forEach(function (l) { l.entries.forEach(function (e) {
        [e.driver, e.codriver].forEach(function (n) {
          if (!E.normName(n)) return; var x = idx.resolve(n); if (!x.known) unknown[x.name] = 1;
        });
      }); });
      if (kind !== 'entries') (s.rounds || []).forEach(function (r) {
        var raw = rawRound(r.id, y); if (!raw) return;
        (raw.entries || []).concat(raw.extraStarts || []).forEach(function (e) {
          [e.driver, e.codriver, e.credit && e.credit.driver, e.credit && e.credit.codriver].forEach(function (n) {
            if (!E.normName(n)) return; var x = idx.resolve(n); if (!x.known) unknown[x.name] = 1;
          });
        });
      });
    });
    return Object.keys(unknown).sort();
  }
  function legacyUnknownNames() {
    var entries = knownNames('entries').map(E.slug);
    return knownNames('results').filter(function (n) { return entries.indexOf(E.slug(n)) < 0; });
  }
  function preparePublishPeople() {
    var entries = knownNames('entries');
    if (entries.length) throw new Error('Resolve entry-list identities in Competitors before publishing: ' + entries.join(', ') + '. Choose an existing profile / verified alias or explicitly add a new competitor; entry names are never auto-added.');
    var unknown = legacyUnknownNames(); if (unknown.length) addPeople(unknown);
  }
  function entryIdentityNotice() {
    var unknown = knownNames('entries'), doc = peopleDoc();
    if (!unknown.length) return '';
    return '<div class="callout warn entry-identities"><div><b>Resolve entry-list identities before publishing.</b> Entry names are never auto-added, even if also printed in results. Match a verified spelling to an existing profile, or explicitly decide that this is a new person. Do not infer identity from a car number.' +
      unknown.map(function (n) {
        var like = E.similarNames(n, doc);
        return '<div class="actions"><b>' + esc(n) + '</b>' + (like.length ? '<span class="small">Looks like: ' + esc(like.join(', ')) + '. Similarity is not identity evidence.</span>' : '') +
          select(function (id) {
            if (!id) return;
            var p = doc.people.filter(function (x) { return x.id === id; })[0];
            if (p && window.confirm('Official evidence confirms "' + n + '" is an alternate spelling of ' + p.name + '? Add it as a verified alias?')) {
              p.aliases = p.aliases || []; p.aliases.push(n); render();
            }
          }, '', [['', 'Match to an existing profile (verified alias)']].concat(doc.people.map(function (p) { return [p.id, p.name]; }))) +
          btn(function () {
            if (window.confirm('Add "' + n + '" as a distinct new competitor? Check existing profiles and official evidence first; this must not be an alternate spelling of an existing person.')) { addPeople([n]); render(); }
          }, 'Add as new competitor: ' + n, 'tiny') + '</div>';
      }).join('') + '</div></div>';
  }
  function addPeople(names) {
    var doc = peopleDoc(), taken = {}; doc.people.forEach(function (p) { taken[p.id] = 1; });
    names.forEach(function (n) { var id = uniqueId(E.slug(n), taken); taken[id] = 1; doc.people.push({ id: id, name: n, aliases: [], bio: '', photo: '', links: {} }); });
    doc.people.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /* ------------------------------------------------------------------ sign-in (Google, via Firebase Authentication)
     The Firebase JavaScript SDK is used only for the Google sign-in pop-up. Data is read and written with
     plain HTTPS calls to the Cloud Firestore REST API, carrying the signed-in user's ID token; the database's
     security rules (docs/firestore.rules) decide what each user may do. Automated tests supply a fake
     sign-in object as window.NR_TEST_AUTH. */
  var FB = window.NR_FIREBASE || {};
  var FB_SDK = '13.2.0';
  var CONFIGURED = !!(FB.projectId && FB.apiKey && FB.authDomain);
  var DB = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FB.projectId || 'none') + '/databases/(default)/documents';
  var NAME = 'projects/' + (FB.projectId || 'none') + '/databases/(default)/documents/';
  var AUTH = null, AUTH_PENDING = null;
  async function auth() {
    if (AUTH) return AUTH;
    if (window.NR_TEST_AUTH) return (AUTH = window.NR_TEST_AUTH);
    if (AUTH_PENDING) return AUTH_PENDING;
    AUTH_PENDING = initAuth();
    try { return await AUTH_PENDING; } finally { AUTH_PENDING = null; }
  }
  async function initAuth() {
    var app, au;
    try {
      app = await import('https://www.gstatic.com/firebasejs/' + FB_SDK + '/firebase-app.js');
      au = await import('https://www.gstatic.com/firebasejs/' + FB_SDK + '/firebase-auth.js');
    } catch (e) { throw new Error('Couldn\'t load Google sign-in (' + (e && e.message || e) + '). Check your internet connection, or whether a browser extension is blocking www.gstatic.com.'); }
    var a = au.getAuth(app.initializeApp(FB));
    try { await au.setPersistence(a, au.browserSessionPersistence); } catch (e) { /* falls back to the default */ }
    function user() { var u = a.currentUser; return u ? { email: String(u.email || '').toLowerCase(), name: u.displayName || u.email, photo: u.photoURL || '' } : null; }
    AUTH = {
      ready: function () { return a.authStateReady ? a.authStateReady() : Promise.resolve(); },
      user: user,
      signIn: function () { var p = new au.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return au.signInWithPopup(a, p).then(user); },
      signOut: function () { return au.signOut(a); },
      token: function () { return a.currentUser ? a.currentUser.getIdToken() : Promise.resolve(null); },
      observe: function (fn) { return au.onAuthStateChanged(a, function () { fn(user()); }); }
    };
    return AUTH;
  }
  function authError(e) {
    var c = (e && e.code) || '';
    if (/unauthorized-domain/.test(c)) return 'This web address isn\'t allowed to use Google sign-in yet. In the Firebase console, add ' + location.hostname + ' under Authentication → Settings → Authorized domains.';
    if (/popup-blocked/.test(c)) return 'The browser blocked the Google sign-in window. Allow pop-ups for this site, then try again.';
    if (/operation-not-allowed/.test(c)) return 'Google sign-in isn\'t switched on. In the Firebase console: Authentication → Sign-in method → Google → Enable.';
    if (/network-request-failed/.test(c)) return 'Couldn\'t reach Google. Check your internet connection and try again.';
    if (/invalid-api-key|api-key-not-valid/.test(c)) return 'The Firebase settings in assets/firebase-config.js don\'t match your project. Copy the firebaseConfig block again.';
    return (e && e.message) || String(e);
  }

  /* ------------------------------------------------------------------ the database (Cloud Firestore REST API)
     Layout (see docs/data-model.md):
       docs/{id}        the working data, one JSON document per id (site, people, season_2026, round_2026_R1 …)  — admins only
       public/{id}      the published copy the website reads (site, people, season_<year> bundles)                 — anyone can read
       photos/{id}      profile photos, JPEG as base64                                                              — anyone can read
       history/{id}     one entry per changed document per publish (before/after), grouped by publish               — admins only
       config/admins    { emails: [...] } — who may sign in to the admin
       config/revision  { n, at, by } — bumped by every publish, so a publish built from stale data is refused */
  function fsVal(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(fsVal) } };
    return { mapValue: { fields: fsFields(v) } };
  }
  function fsFields(o) { var f = {}; Object.keys(o).forEach(function (k) { if (o[k] !== undefined) f[k] = fsVal(o[k]); }); return f; }
  function fsPlain(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fsPlain);
    if ('mapValue' in v) return fsObj((v.mapValue && v.mapValue.fields) || {});
    return null;
  }
  function fsObj(fields) { var o = {}; Object.keys(fields || {}).forEach(function (k) { o[k] = fsPlain(fields[k]); }); return o; }
  function docKey(d) { return String(d.name).split('/').pop(); }
  async function fs(method, path, body, opt) {
    opt = opt || {};
    var version = sessionVersion, mode = A.mode;
    if (method !== 'GET' && mode !== 'live') throw new Error('Database writes are only available in the live admin.');
    var headers = {}, tok;
    try {
      tok = AUTH ? await AUTH.token() : null;
      if (A.user && !tok) throw new Error('No sign-in token is available.');
    } catch (e) {
      if (version === sessionVersion && A.user) { clearSession(); signInState.err = 'Sign-in failed: ' + authError(e); render(); }
      throw e;
    }
    if (method !== 'GET') {
      checkSession(version, A.user);
      if (A.mode !== 'live' || !tok) throw new Error('The admin session changed. Nothing was sent.');
    }
    if (tok) headers.Authorization = 'Bearer ' + tok;
    if (body) headers['Content-Type'] = 'application/json';
    var r;
    try { r = await fetch(DB + path, { method: method, headers: headers, cache: 'no-store', body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { throw new Error('Couldn\'t reach the database. Check your internet connection and try again.'); }
    var j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.ok) return j;
    if (r.status === 404 && opt.allow404) return null;
    var code = (j && j.error && j.error.status) || '', err = new Error((j && j.error && j.error.message) || ('The database returned ' + r.status));
    err.status = r.status; err.code = code;
    if (r.status === 401 || r.status === 403 || code === 'PERMISSION_DENIED' || code === 'UNAUTHENTICATED') {
      err.denied = true; err.message = 'The database refused this. Your Google account may not be on the admin list, or the database rules haven\'t been set up yet.';
      if (A.mode && version === sessionVersion) { clearSession(); signInState.err = err.message; render(); }
    } else if (opt.commit && (code === 'FAILED_PRECONDITION' || code === 'ALREADY_EXISTS' || code === 'ABORTED' || code === 'NOT_FOUND')) err.conflict = true;
    throw err;
  }
  async function listAll(coll, extra) {
    var out = [], tok = '';
    do {
      var j = await fs('GET', '/' + coll + '?pageSize=300' + (extra || '') + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''));
      ((j && j.documents) || []).forEach(function (d) { out.push(d); });
      tok = j && j.nextPageToken;
    } while (tok);
    return out;
  }
  function idFor(path) {
    var m;
    if (path === SITE) return 'site';
    if (path === PEOPLE) return 'people';
    if ((m = path.match(/^data\/seasons\/(\d+)\/season\.json$/))) return 'season_' + m[1];
    if ((m = path.match(/^data\/seasons\/(\d+)\/rounds\/(.+)\.json$/))) return 'round_' + m[1] + '_' + m[2];
    throw new Error('No database id for ' + path);
  }
  function pathFor(id) {
    var m;
    if (id === 'site') return SITE;
    if (id === 'people') return PEOPLE;
    if ((m = id.match(/^season_(\d+)$/))) return seasonPath(m[1]);
    if ((m = id.match(/^round_(\d+)_(.+)$/))) return roundPath(m[1], m[2]);
    return null;
  }
  function photoIdOf(path) { var m = String(path).match(/^data\/people\/(.+)\.jpg$/); return m ? m[1] : null; }
  function revOf(d) { return d ? { n: fsObj(d.fields).n || 0, updateTime: d.updateTime } : null; }
  function adminsOf(d) { return d ? { list: (fsObj(d.fields).emails || []).map(function (x) { return String(x).toLowerCase(); }), updateTime: d.updateTime } : null; }
  function requireAdmin(admins, version, user) {
    checkSession(version, user);
    if (!admins || admins.list.indexOf(user.email.toLowerCase()) < 0) {
      clearSession(); signInState.denied = user.email; render();
      var denied = new Error('This account is not on the admin list.'); denied.denied = true; throw denied;
    }
  }

  async function liveLoad(version, user) {
    var docs = await listAll('docs');
    var res = await Promise.all([fs('GET', '/config/admins', null, { allow404: true }), fs('GET', '/config/revision', null, { allow404: true })]);
    var admins = adminsOf(res[0]);
    requireAdmin(admins, version, user);
    A.docs = {}; A.meta = {}; A.bins = {}; A.photoCache = {}; A.history = null; A.dropPublic = [];
    docs.forEach(function (d) {
      var p = pathFor(docKey(d)); if (!p) return;
      var obj; try { obj = JSON.parse(fsObj(d.fields).json); } catch (e) { throw new Error(label(p) + ' in the database isn\'t valid data (' + e.message + ').'); }
      A.docs[p] = { orig: norm(obj), obj: obj, deleted: false }; A.meta[p] = d.updateTime;
    });
    A.admins = admins; A.rev = revOf(res[1]);
    A.empty = !A.docs[SITE];
    if (!A.empty) afterLoad();
  }
  async function demoLoad(version, user) {   // explore with the published data; nothing is ever saved
    if (!CONFIGURED) throw new Error('The demo needs the database connection (assets/firebase-config.js).');
    var admins = adminsOf(await fs('GET', '/config/admins', null, { allow404: true }));
    requireAdmin(admins, version, user);
    var staged = await readPublished();
    checkSession(version, user);
    A = newState(); A.mode = 'demo'; A.user = user;
    Object.keys(staged.docs).forEach(function (p) {
      var obj = clone(staged.docs[p]);
      if (/^data\/seasons\/\d+\/season\.json$/.test(p) && obj.rallyesport) delete obj.rallyesport.scoring;
      A.docs[p] = { orig: norm(obj), obj: obj, deleted: false };
    });
    afterLoad();
  }
  async function readPublished() {   // the published copy (public/ documents), which anyone can read
    async function pub(id) { var d = await fs('GET', '/public/' + encodeURIComponent(id), null, { allow404: true }); return d ? JSON.parse(fsObj(d.fields).json) : null; }
    var out = { docs: {} }, s = await pub('site');
    if (!s) throw new Error('Nothing has been published yet, so there\'s nothing to explore in the demo.');
    out.docs[SITE] = s; out.docs[PEOPLE] = (await pub('people')) || { people: [] };
    var ys = (s.seasons || []).map(function (x) { return x.year; });
    for (var i = 0; i < ys.length; i++) {
      var b = await pub('season_' + ys[i]); if (!b) continue;
      out.docs[seasonPath(ys[i])] = b.season;
      Object.keys(b.rounds || {}).forEach(function (id) { out.docs[roundPath(ys[i], id)] = b.rounds[id]; });
    }
    return out;
  }
  function afterLoad() {
    peopleDoc();
    var ys = years();
    if (A.year == null || ys.indexOf(A.year) < 0) A.year = ys.indexOf(+site().currentSeason) >= 0 ? +site().currentSeason : ys[0];
  }
  /* Replace the whole working copy with a set of documents (import or restore). Documents not in the set are
     removed; nothing is saved until you publish. Photos from a backup are staged too. */
  async function stageAll(set) {
    requireEntryContract();
    var rsLoss = rallyeSportReplacementLoss(set.docs);
    var entryLoss = Object.keys(A.docs).some(function (p) {
      var before = A.docs[p].obj, after = set.docs[p];
      return !A.docs[p].deleted && before && E.entryEvidenceLoss(before, after, peopleDoc(), set.docs[PEOPLE]);
    });
    if (entryLoss && !window.confirm('This backup removes saved entry-list evidence or replaces crew/source details or day scope. Review the differences. Restore anyway? History records the replacement only when you publish.')) throw new Error('Backup restore cancelled; entry evidence retained.');
    if (rsLoss.length && !window.confirm(rallyeSportLossMessage(rsLoss, 'backup restore'))) throw new Error('Backup restore cancelled; RallyeSport data retained.');
    Object.keys(A.docs).forEach(function (p) { if (!set.docs[p]) A.docs[p].deleted = true; });
    Object.keys(set.docs).forEach(function (p) {
      var obj = clone(set.docs[p]);
      if (A.docs[p]) { A.docs[p].obj = obj; A.docs[p].deleted = false; } else A.docs[p] = { orig: null, obj: obj, deleted: false };
    });
    var ppl = (set.docs[PEOPLE] && A.docs[PEOPLE].obj.people) || [];
    for (var i = 0; i < ppl.length; i++) {
      var p = ppl[i], b64 = set.photos && set.photos[p.id];
      if (b64) { A.bins[photoPath(p.id)] = { b64: b64, deleted: false }; p.photo = 'db:' + p.id; }
    }
    afterLoad();
  }
  function rallyeSportReplacementLoss(setDocs) {
    var affected = [];
    Object.keys(A.docs).forEach(function (p) {
      var match = p.match(/^data\/seasons\/(\d+)\/season\.json$/), before = A.docs[p].obj, after = setDocs[p];
      if (!match || !before) return;
      var currentRs = A.docs[p].deleted ? null : before.rallyesport, nextRs = after && after.rallyesport;
      if ((currentRs || nextRs) && norm(currentRs) !== norm(nextRs)) affected.push(match[1]);
    });
    return affected;
  }
  function rallyeSportLossMessage(yearsAffected, operation) {
    return 'This ' + operation + ' will replace or delete RallyeSport data for season ' + yearsAffected.join(', ') +
      ', including independent events, official classifications/results, source and stage-time evidence, and season-scoped Non-Scoring RS Member decisions. ' +
      'Cancel leaves the working copy unchanged. Continue?';
  }
  function readBackup(text) {
    var b; try { b = JSON.parse(text); } catch (e) { throw new Error('That file isn\'t a backup (it isn\'t valid JSON).'); }
    if (!b || b.format !== 'nr-rally-backup' || !b.docs || !b.docs[SITE]) throw new Error('That file isn\'t a backup made by this admin.');
    return b;
  }
  async function backupText() {
    var out = { format: 'nr-rally-backup', version: 1, exportedAt: new Date().toISOString(), exportedBy: A.user ? A.user.email : 'demo', docs: {}, photos: {} };
    Object.keys(A.docs).sort().forEach(function (p) { if (!A.docs[p].deleted) out.docs[p] = A.docs[p].obj; });
    var ppl = ((out.docs[PEOPLE] || {}).people) || [];
    for (var i = 0; i < ppl.length; i++) {
      var p = ppl[i], bin = A.bins[photoPath(p.id)];
      if (bin && !bin.deleted) out.photos[p.id] = bin.b64;
      else if (/^db:/.test(p.photo || '')) { var b64 = await photoB64(p.photo.slice(3)); if (b64) out.photos[p.id] = b64; }
    }
    return JSON.stringify(out, null, 1);
  }
  async function photoB64(id) {
    if (A.photoCache[id] !== undefined) return A.photoCache[id];
    var d = await fs('GET', '/photos/' + encodeURIComponent(id), null, { allow404: true });
    A.photoCache[id] = d ? fsObj(d.fields).b64 : null;
    return A.photoCache[id];
  }

  /* The published copy: rebuilt from the full working copy on every publish. Only fields meant for the public
     are copied, so private fields added to the working data later never reach the website. */
  function publicDocs() {
    var out = [], st = clone(site()); delete st.repo;
    out.push({ id: 'site', json: JSON.stringify(st) });
    out.push({ id: 'people', json: JSON.stringify({ people: peopleDoc().people.map(function (p) {
      return { id: p.id, name: p.name, aliases: p.aliases || [], bio: p.bio || '', photo: p.photo || '', links: p.links || {} };
    }) }) });
    years().forEach(function (y) {
      var se = season(y); if (!se) return;
      var rounds = {}; (se.rounds || []).forEach(function (r) { var raw = r.results && rawRound(r.id, y); if (raw) rounds[r.id] = AI.projectPublic(raw); });
      out.push({ id: 'season_' + y, json: JSON.stringify({ season: AI.projectPublic(se, peopleDoc()), rounds: rounds }) });
    });
    return out;
  }
  function buildWrites(list, message) {
    var now = new Date().toISOString(), by = A.user.email, group = now.replace(/\D/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 8);
    var W = [], track = {};
    list.forEach(function (c) {                         // 1. working data, refused if it changed since it was loaded
      if (c.binary) return;
      var pre = A.meta[c.path] ? { updateTime: A.meta[c.path] } : { exists: false }, name = NAME + 'docs/' + idFor(c.path);
      W.push(c.kind === 'delete' ? { 'delete': name, currentDocument: pre } : { update: { name: name, fields: fsFields({ json: c.text, updatedAt: now, updatedBy: by }) }, currentDocument: pre });
      track[W.length - 1] = c.path;
    });
    list.forEach(function (c) {                         // 2. photos
      if (!c.binary) return;
      var name = NAME + 'photos/' + photoIdOf(c.path);
      W.push(c.kind === 'delete' ? { 'delete': name } : { update: { name: name, fields: fsFields({ b64: c.b64, type: 'image/jpeg', updatedAt: now }) } });
    });
    publicDocs().forEach(function (d) { W.push({ update: { name: NAME + 'public/' + d.id, fields: fsFields({ json: d.json, updatedAt: now }) } }); });   // 3. the published copy
    var removedSeasons = list.filter(function (c) { return c.kind === 'delete' && /^data\/seasons\/\d+\/season\.json$/.test(c.path); }).map(function (c) { return 'season_' + c.path.split('/')[2]; });
    Array.from(new Set((A.dropPublic || []).concat(removedSeasons))).forEach(function (id) { W.push({ 'delete': NAME + 'public/' + id }); });
    var revAt = W.length;                               // 4. the revision: any publish by someone else since we loaded makes this whole commit fail
    W.push({ update: { name: NAME + 'config/revision', fields: fsFields({ n: (A.rev ? A.rev.n : 0) + 1, at: now, by: by }) }, currentDocument: A.rev ? { updateTime: A.rev.updateTime } : { exists: false } });
    list.forEach(function (c, i) {                      // 5. history, one entry per changed document
      W.push({ update: { name: NAME + 'history/' + group + '-' + i, fields: fsFields({ group: group, at: now, by: by, message: message, path: c.path, kind: c.kind,
        before: c.binary ? null : (c.before || null), after: c.binary || c.kind === 'delete' ? null : c.text }) }, currentDocument: { exists: false } });
    });
    if (W.length > 500) throw new Error('This publish needs ' + W.length + ' writes (maximum 500). Use smaller reviewed imports; nothing was published.');
    W.forEach(function (w) {
      if (w.update && AI.bytes(JSON.stringify(w.update)) > 1048576 - 2048) throw new Error('A database document exceeds the safe 1 MiB limit. Reduce the import or archive size; nothing was published.');
    });
    if (AI.bytes(JSON.stringify({ writes: W })) > 10 * 1024 * 1024) throw new Error('This atomic publish exceeds 10 MiB. Reduce the batch; nothing was published.');
    return { writes: W, track: track, revAt: revAt };
  }
  async function rebase(list) {   // someone else published since we loaded: take their changes, keep ours — unless we both changed the same document
    var mine = {}; list.forEach(function (c) { if (!c.binary) mine[c.path] = true; });
    var docs = await listAll('docs'), rev = await fs('GET', '/config/revision', null, { allow404: true });
    var latest = {}; docs.forEach(function (d) { var p = pathFor(docKey(d)); if (p) latest[p] = d; });
    var clash = Object.keys(mine).filter(function (p) { return (latest[p] ? latest[p].updateTime : null) !== (A.meta[p] || null); });
    if (clash.length) { var err = new Error('Someone else published changes to ' + clash.map(label).join(', ') + ' after you opened the admin.'); err.conflict = true; err.clash = true; throw err; }
    Object.keys(latest).forEach(function (p) {
      if (mine[p]) return;
      var obj = JSON.parse(fsObj(latest[p].fields).json);
      A.docs[p] = { orig: norm(obj), obj: obj, deleted: false }; A.meta[p] = latest[p].updateTime;
    });
    Object.keys(A.docs).forEach(function (p) { if (!latest[p] && !mine[p] && A.meta[p]) { delete A.docs[p]; delete A.meta[p]; } });
    A.rev = revOf(rev);
  }
  async function publish(message) {
    requireEntryContract();
    preparePublishPeople();
    prepareRallyNotice();
    var list = changes(); if (!list.length) throw new Error('There are no changes to publish.');
    function checkPublish() {
      var errors = publishIssues().filter(function (i) { return i.level === 'error'; });
      if (errors.length) throw new Error(errors.map(function (i) { return label(i.path) + ': ' + i.msg; }).join('\n'));
    }
    checkPublish();
    if (A.mode === 'demo') { markSaved(); return { demo: true, files: list.length }; }
    if (A.mode !== 'live') throw new Error('The admin session changed. Nothing was published.');
    var res, b;
    for (var attempt = 0; ; attempt++) {
      checkPublish();
      b = buildWrites(list, message);
      try { res = await fs('POST', ':commit', { writes: b.writes }, { commit: true }); break; }
      catch (e) {
        if (!e.conflict || e.clash || attempt > 0) throw e;
        await rebase(list);
        preparePublishPeople();
        prepareRallyNotice();
        list = changes();
      }
    }
    var wr = (res && res.writeResults) || [];
    Object.keys(b.track).forEach(function (i) { var p = b.track[i]; if (A.docs[p] && A.docs[p].deleted) delete A.meta[p]; else if (wr[i] && wr[i].updateTime) A.meta[p] = wr[i].updateTime; });
    A.rev = { n: (A.rev ? A.rev.n : 0) + 1, updateTime: wr[b.revAt] && wr[b.revAt].updateTime };
    markSaved(); A.history = null; A.empty = false;
    return { files: list.length };
  }
  function markSaved() {
    Object.keys(A.docs).forEach(function (p) { var d = A.docs[p]; if (d.deleted) delete A.docs[p]; else d.orig = norm(d.obj); });
    Object.keys(A.bins).forEach(function (p) { var id = photoIdOf(p), b = A.bins[p]; if (id) A.photoCache[id] = b.deleted ? null : b.b64; });
    A.bins = {}; A.dropPublic = [];
  }
  function stageRemove(path) { if (photoIdOf(path)) A.bins[path] = { deleted: true }; else dropDoc(path); }
  async function loadHistory() {
    var docs = await listAll('history', '&orderBy=' + encodeURIComponent('at desc'));
    var groups = {}, order = [];
    docs.forEach(function (d) {
      var f = fsObj(d.fields);
      if (!groups[f.group]) { groups[f.group] = { group: f.group, at: f.at, by: f.by, message: f.message, items: [] }; order.push(f.group); }
      groups[f.group].items.push(f);
    });
    return order.map(function (g) { return groups[g]; });
  }
  function stageUndo(g) {
    var rsLoss = [];
    g.items.forEach(function (it) {
      var match = it.path.match(/^data\/seasons\/(\d+)\/season\.json$/), doc = A.docs[it.path];
      if (!match || !doc) return;
      var current = doc.deleted ? null : doc.obj;
      var beforeObj = it.before == null ? null : JSON.parse(it.before);
      var currentRs = current && current.rallyesport, beforeRs = beforeObj && beforeObj.rallyesport;
      if ((currentRs || beforeRs) && norm(currentRs) !== norm(beforeRs)) rsLoss.push(match[1]);
    });
    if (rsLoss.length && !window.confirm(rallyeSportLossMessage(rsLoss, 'History undo'))) return false;
    var before = clone(peopleDoc().people);
    g.items.forEach(function (it) {
      if (photoIdOf(it.path)) return;                   // photos aren't kept in the history
      if (it.before == null) { if (A.docs[it.path]) dropDoc(it.path); }
      else { var obj = JSON.parse(it.before); if (A.docs[it.path]) { A.docs[it.path].obj = obj; A.docs[it.path].deleted = false; } else A.docs[it.path] = { orig: null, obj: obj, deleted: false }; }
    });
    var keep = {}; peopleDoc().people.forEach(function (p) { if (/^db:/.test(p.photo || '')) keep[p.photo] = 1; });
    before.forEach(function (p) { if (/^db:/.test(p.photo || '') && !keep[p.photo]) A.bins[photoPath(p.photo.slice(3))] = { deleted: true }; });
    afterLoad();
    return true;
  }
  async function saveAdmins(list) {   // takes effect immediately (it isn't part of a publish)
    var r = await fs('POST', ':commit', { writes: [{ update: { name: NAME + 'config/admins', fields: fsFields({ emails: list }) }, currentDocument: { updateTime: A.admins.updateTime } }] }, { commit: true });
    A.admins = { list: list, updateTime: r.writeResults[0].updateTime };
  }

  /* ------------------------------------------------------------------ rendering infrastructure */
  var binds = {}, acts = {}, seq = 0, liveRefresh = null;
  function K(fn) { var k = 'k' + (++seq); binds[k] = fn; return k; }
  function ACT(fn) { var k = 'a' + (++seq); acts[k] = fn; return k; }
  function input(fn, value, attrs) { return '<input data-k="' + K(fn) + '" value="' + esc(value == null ? '' : value) + '"' + (attrs ? ' ' + attrs : '') + '>'; }
  function area(fn, value, attrs) { return '<textarea data-k="' + K(fn) + '"' + (attrs ? ' ' + attrs : '') + '>' + esc(value == null ? '' : value) + '</textarea>'; }
  function select(fn, value, opts, attrs) {
    var has = opts.some(function (o) { return String(o[0]) === String(value == null ? '' : value); });
    if (!has && value) opts = opts.concat([[value, value]]);
    return '<select data-k="' + K(fn) + '"' + (attrs ? ' ' + attrs : '') + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value == null ? '' : value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function check(fn, on, text, attrs) { return '<label class="chk"><input type="checkbox" data-k="' + K(fn) + '"' + (on ? ' checked' : '') + (attrs ? ' ' + attrs : '') + '><span>' + text + '</span></label>'; }
  function fileIn(fn, accept, text) { return '<label class="btn file-btn"><input type="file" class="sr-only" accept="' + accept + '" data-k="' + K(fn) + '">' + text + '</label>'; }
  function fld(lbl, control, help, cls) { return '<label class="fld' + (cls ? ' ' + cls : '') + '"><span class="fl">' + lbl + '</span>' + control + (help ? '<small>' + help + '</small>' : '') + '</label>'; }
  function btn(fn, text, cls, attrs) { return '<button type="button" class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + ACT(fn) + '"' + (attrs ? ' ' + attrs : '') + '>' + text + '</button>'; }
  function toast(msg, kind) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, kind === 'bad' ? 9000 : 4500);
  }
  var busyCount = 0;
  function busy(on) { busyCount += on ? 1 : -1; document.body.classList.toggle('is-busy', busyCount > 0); }
  function runAct(fn, el) {
    try {
      var r = fn(el);
      if (r && typeof r.then === 'function') { busy(true); r.then(function () { busy(false); }, function (e) { busy(false); toast(e.message || String(e), 'bad'); if (window.console) console.error(e); render(); }); }
    } catch (e) { toast(e.message || String(e), 'bad'); if (window.console) console.error(e); }
  }
  var edited = debounce(function () { updateBadge(); if (liveRefresh) { try { liveRefresh(); } catch (e) { if (window.console) console.error(e); } } }, 250);
  ROOT.addEventListener('input', function (ev) {
    var t = ev.target, k = t.getAttribute && t.getAttribute('data-k');
    if (!k || !binds[k] || t.type === 'checkbox' || t.type === 'file' || t.tagName === 'SELECT') return;
    binds[k](t.value, t); edited();
  });
  ROOT.addEventListener('change', function (ev) {
    var t = ev.target, k = t.getAttribute && t.getAttribute('data-k');
    if (!k || !binds[k]) return;
    if (t.type === 'checkbox') runAct(function () { return binds[k](t.checked, t); });
    else if (t.type === 'file') { var files = t.files; if (files && files.length) runAct(function () { return binds[k](files, t); }); t.value = ''; return; }
    else if (t.tagName === 'SELECT') runAct(function () { return binds[k](t.value, t); });
    else { if (t.hasAttribute('data-rerender')) render(); return; }
    edited();
    if (t.hasAttribute('data-rerender')) render();
  });
  ROOT.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el) return; var fn = acts[el.getAttribute('data-act')]; if (!fn) return;
    ev.preventDefault(); runAct(fn, el);
  });
  window.addEventListener('beforeunload', function (ev) { if (A.mode && (changes().length || A.ai && A.ai.text)) { ev.preventDefault(); ev.returnValue = ''; } });
  window.addEventListener('hashchange', function () {
    render();
    if (['rallyesport', 'logic'].indexOf(route().view) >= 0) {
      var heading = ROOT.querySelector('#logicTopicTitle') || ROOT.querySelector('.rs-pane:not([hidden]) h4') || ROOT.querySelector('main h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    }
  });

  function route() {
    var parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { view: parts[0] || 'dashboard', a: parts[1] || '', b: parts[2] || '', c: parts[3] || '' };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function updateBadge() {
    var n = changes().length, el = document.getElementById('chg');
    if (el) { el.textContent = n ? n + ' unpublished change' + (n === 1 ? '' : 's') : 'All changes published'; el.className = 'chg' + (n ? ' on' : ''); }
    var pb = document.getElementById('pubBtn'); if (pb) pb.classList.toggle('primary', n > 0);
  }

  /* ------------------------------------------------------------------ shell */
  var NAV = [['dashboard', 'Dashboard'], ['ai-import', 'AI Import'], ['results', 'Results'], ['events', 'Events & calendar'], ['rallyesport', 'RallyeSport'], ['logic', 'Logic explorer'], ['competitors', 'Competitors'], ['season', 'Season settings'], ['site', 'Site & info'], ['history', 'History'], ['publish', 'Review & publish']];
  function render() {
    var focus = document.activeElement, focusIndex = -1, focusLabel = '';
    if (route().view === 'rallyesport' && focus && ROOT.contains(focus) && focus.hasAttribute('data-k')) {
      focusIndex = Array.prototype.indexOf.call(ROOT.querySelectorAll('main [data-k]'), focus);
      focusLabel = focus.getAttribute('aria-label') || (focus.closest('.fld') && focus.closest('.fld').querySelector('.fl').textContent) || '';
    }
    binds = {}; acts = {}; liveRefresh = null;
    var keepY = window.scrollY;
    if (!A.mode) { ROOT.innerHTML = viewSignIn(); return; }
    var r = route();
    var html;
    if (!site()) r = { view: 'import' };
    try {
      switch (r.view) {
        case 'import': html = viewImport(); break;
        case 'ai-import': html = viewAIImport(); break;
        case 'results': html = viewResults(r.a); break;
        case 'events': html = viewEvents(); break;
        case 'rallyesport': html = viewRallyeSport(); break;
        case 'logic': html = viewLogic(r.a, r.b); break;
        case 'competitors': html = viewCompetitors(); break;
        case 'competitor': html = viewCompetitor(r.a); break;
        case 'season': html = viewSeason(); break;
        case 'site': html = viewSite(); break;
        case 'history': html = viewHistory(); break;
        case 'publish': html = viewPublish(); break;
        default: html = viewDashboard();
      }
    } catch (e) { html = '<div class="card empty"><h2>Something went wrong</h2><p class="mono small">' + esc(e.message) + '</p></div>'; if (window.console) console.error(e); }
    var active = r.view === 'competitor' ? 'competitors' : r.view;
    var ys = years();
    var who = A.mode === 'live' ? '<span class="who">' + (A.user.photo ? '<img src="' + esc(A.user.photo) + '" alt="" referrerpolicy="no-referrer">' : '') + '<span><b>' + esc(A.user.name || A.user.email) + '</b><small>' + esc(A.user.email) + '</small></span></span>' :
      '<span class="who demo"><span><b>Demo mode</b><small>Nothing is saved</small></span></span>';
    ROOT.innerHTML = (A.mode === 'demo' ? '<div class="demo-bar">Simulation — practise freely with a copy of the published data; nothing is ever saved. ' + btn(leaveDemo, 'Return to live admin', 'tiny', 'id="leaveDemoBtn"') + '</div>' : '') +
      '<header class="adm-top"><div class="checker" aria-hidden="true"></div><div class="adm-top-in">' +
      '<a class="brand" href="#/"><img class="brand-mark" src="../assets/official-logo.jpg" alt="" width="270" height="143">' +
      '<span class="brand-text"><strong>' + esc((site() && site().siteName) || 'Rally results') + '</strong><span>Admin</span></span></a>' +
      (ys.length ? '<label class="season-sel"><span class="sr-only">Season</span>' + select(function (v) { A.year = +v; A.imp = null; A.open = {}; render(); }, A.year, ys.map(function (y) { return [y, y + ' season']; }), 'id="yearSel"') + '</label>' : '') +
      '<span id="chg" class="chg"></span>' +
      '<a class="btn" id="pubBtn" href="#/publish">Review &amp; publish</a>' + who +
      (A.mode === 'live' ? btn(startDemo, 'Practise in simulation', 'tiny', 'id="demoBtn"') : '') +
      '<button type="button" class="btn tiny ghost" id="signOutBtn" data-act="' + ACT(signOut) + '">Sign out</button>' +
      '</div></header><div class="adm-wrap"><nav class="adm-nav" aria-label="Admin sections">' +
      (site() ? NAV : [['import', 'Load the data'], ['publish', 'Review & publish']]).map(function (n) { return '<a href="#/' + n[0] + '"' + (n[0] === active ? ' class="on" aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('') +
      '<a class="ext" href="../#/' + A.year + '" target="_blank" rel="noopener">View public site ↗</a>' +
      '</nav><main id="main" class="adm-main" data-admin-route="' + esc(location.hash) + '">' + html + '</main></div>';
    updateBadge();
    if (liveRefresh) liveRefresh();
    if (focusIndex >= 0) {
      var replacement = ROOT.querySelectorAll('main [data-k]')[focusIndex];
      var replacementLabel = replacement && (replacement.getAttribute('aria-label') || (replacement.closest('.fld') && replacement.closest('.fld').querySelector('.fl').textContent) || '');
      if (replacement && replacement.tagName === focus.tagName && replacementLabel === focusLabel) replacement.focus({ preventScroll: true });
    }
    window.scrollTo(0, route().view === r.view ? keepY : 0);
  }
  async function signOut() {
    if (A.mode && changes().length && !window.confirm('You have unpublished changes. Leave and lose them?')) return;
    clearSession(); signInState.denied = ''; signInState.err = ''; location.hash = '#/'; render();
    try { await (await auth()).signOut(); }
    catch (e) { signInState.err = 'Sign-out failed: ' + authError(e); render(); }
  }
  async function startDemo() {
    if (busyCount) throw new Error('Wait for the current operation to finish before starting the simulation.');
    if (changes().length && !window.confirm('Discard unpublished live changes and start the simulation?')) return;
    var user = A.user; clearSession(); A.user = user; var version = sessionVersion;
    render();
    try { await demoLoad(version, user); go('#/'); }
    catch (e) { if (version === sessionVersion) { clearSession(); signInState.err = authError(e); render(); } throw e; }
  }
  async function leaveDemo() {
    if (busyCount) throw new Error('Wait for the current operation to finish before leaving the simulation.');
    if (changes().length && !window.confirm('Discard simulation changes and return to the live admin?')) return;
    clearSession(); render(); await enter();
  }
  function pageHead(eyebrow, title, intro, side) {
    return '<div class="page-head"><div><p class="eyebrow">' + eyebrow + '</p><h1>' + title + '</h1>' + (intro ? '<p>' + intro + '</p>' : '') + '</div>' + (side || '') + '</div>';
  }

  /* The explorer is static documentation inside the normal admin access gate. */
  function logicHash(id) {
    var topic = window.NRAdminLogic.topics.filter(function (item) { return item.id === id; })[0];
    return '#/logic/' + topic.group + '/' + topic.id;
  }
  function filterLogic(query) {
    A.logicQuery = query;
    var q = query.trim().toLowerCase(), count = 0, group = route().a || 'nr';
    ROOT.querySelectorAll('[data-logic-topic]').forEach(function (item) {
      var show = q ? item.getAttribute('data-search').indexOf(q) >= 0 : item.getAttribute('data-group') === group;
      item.hidden = !show; if (show) count++;
    });
    var status = document.getElementById('logicSearchStatus');
    if (status) status.textContent = count + ' topic' + (count === 1 ? '' : 's') + (q ? ' across both competitions and shared workflow' : ' in this section');
  }
  ROOT.addEventListener('input', function (ev) { if (ev.target.id === 'logicSearch') filterLogic(ev.target.value); });
  function viewLogic(groupId, topicId) {
    var catalogue = window.NRAdminLogic;
    if (!catalogue) throw new Error('The logic catalogue is missing. Refresh the admin page to load the matching assets.');
    var group = catalogue.groups.filter(function (item) { return item.id === groupId; })[0] || catalogue.groups[0];
    var topic = catalogue.topics.filter(function (item) { return item.id === topicId && item.group === group.id; })[0];
    if (!topicId) topic = catalogue.topics.filter(function (item) { return item.group === group.id; })[0];
    function link(id, label) {
      var item = catalogue.topics.filter(function (value) { return value.id === id; })[0];
      return '<a href="' + logicHash(id) + '">' + esc(label || item.title) + ' <span aria-hidden="true">&rarr;</span></a>';
    }
    var html = pageHead('Admin reference · read only', 'Logic explorer', 'Follow the inputs, decisions and visible outcomes. This explains the website; it does not change rules, score a person or certify an official result.');
    html += '<div class="logic-explorer"><nav class="logic-groups" aria-label="Logic competition">' +
      catalogue.groups.map(function (item) { return '<a href="#/logic/' + item.id + '"' + (item.id === group.id ? ' aria-current="page"' : '') + '><b>' +
        esc(item.label) + '</b><span>' + esc(item.description) + '</span></a>'; }).join('') + '</nav>' +
      '<p class="logic-boundary"><b>Scope:</b> NR uses each season\'s configured values; the only supported RS profile is 2026. This catalogue does not change with the admin season selector (currently ' + A.year +
      '); another RS year needs separately implemented and reviewed rules. No live competitor data is used here. Static source/content is public; private access is unchanged.</p>' +
      '<div class="logic-layout"><aside class="logic-index"><label for="logicSearch"><b>Find a decision</b></label><input id="logicSearch" type="search" value="' +
      esc(A.logicQuery || '') + '" placeholder="Try co-driver, provisional, RS0..." aria-describedby="logicSearchStatus">' +
      '<p id="logicSearchStatus" class="small" role="status"></p><nav aria-label="Logic topics">' +
      catalogue.topics.map(function (item) {
        return '<a data-logic-topic data-group="' + item.group + '" data-search="' + esc(JSON.stringify(item).toLowerCase()) + '" href="' + logicHash(item.id) + '"' +
          (topic && topic.id === item.id ? ' aria-current="page"' : '') + '><small>' + esc(item.group.toUpperCase()) + '</small>' + esc(item.title) + '</a>';
      }).join('') + '</nav></aside><article class="logic-topic">';
    if (!topic) html += '<h2 id="logicTopicTitle">Topic not found in this section</h2><p>Choose an evidenced decision from the index. No rule is inferred for an unknown link.</p>';
    else {
      html += '<p class="logic-kicker">' + esc(group.label) + ' · decision path</p><h2 id="logicTopicTitle">' + esc(topic.title) + '</h2><p>' + esc(topic.intro) +
        '</p><div class="logic-inputs"><b>Inputs to inspect</b><p>' + esc(topic.inputs) + '</p></div>' +
        '<ol class="logic-flow" aria-label="Decision flow">' + topic.nodes.map(function (node, i) {
          return '<li><div class="logic-node-heading"><span class="logic-step" aria-label="Step ' + (i + 1) + '">' + (i + 1) + '</span><h3>' + esc(node.question) +
            '</h3></div><div class="logic-branches">' + node.branches.map(function (branch) {
              return '<div class="logic-branch"><b>' + esc(branch.when) + '</b><p>' + esc(branch.outcome) + '</p>' +
                (branch.next ? link(branch.next, 'Follow this path') : '') + '</div>';
            }).join('') + '</div><details class="logic-evidence"><summary>Evidence for this decision (' + node.evidence.length + ')</summary><ul>' +
            node.evidence.map(function (ref) {
              var revision = ref.revision || catalogue.baseline;
              var url = 'https://github.com/nrrally/nrrally.github.io/blob/' + revision + '/' + ref.path + '#L' + ref.start + '-L' + ref.end;
              return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(ref.symbol) + '</a><code>' + esc(ref.path) + ':' + ref.start + '-' + ref.end +
                (ref.revision ? ' (release branch; not an immutable baseline)' : ' (legacy baseline)') + '</code></li>';
            }).join('') + '</ul></details></li>';
        }).join('') + '</ol>' +
        '<nav class="logic-related" aria-label="Continue exploring"><h3>Connected decisions</h3>' + topic.related.map(function (id) { return link(id); }).join('') + '</nav>';
    }
    html += '<footer class="logic-maintenance">Evidence baseline <code>' + catalogue.baseline.slice(0, 7) + '</code> · ' + catalogue.topics.length +
      ' curated topics. Source links open the audited revision, not changing main. This is a maintained explanation, not a second scoring engine. Re-audit when processing changes. External evidence links need GitHub connectivity; the explorer itself renders locally.</footer></article></div></div>';
    liveRefresh = function () { filterLogic(A.logicQuery || ''); };
    return html;
  }

  /* ------------------------------------------------------------------ sign in */
  var signInState = { err: '', denied: '' };
  var observingAuth = false;
  function observeAuth(au) {
    if (observingAuth || !au.observe) return;
    au.observe(function (u) {
      if (A.user && (!u || u.email !== A.user.email)) {
        clearSession(); signInState.err = 'Your sign-in changed. Sign in again.'; render();
      }
    });
    observingAuth = true;
  }
  function googleMark() { return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg>'; }
  function viewSignIn() {
    var s = signInState;
    return '<div class="signin"><div class="card signin-card"><div class="checker" aria-hidden="true"></div>' +
      '<p class="eyebrow">Results admin</p><h1>Sign in to edit the site</h1>' +
      '<p>Admins sign in with their Google account. Only accounts on the admin list can see or change the results data.</p>' +
      (!CONFIGURED ? '<div class="callout warn"><div><b>This site isn\'t connected to its database yet.</b> Paste the <code>firebaseConfig</code> block from the Firebase console into <code>assets/firebase-config.js</code>, then upload that file to the website (see the README).</div></div>' : '') +
      (s.denied ? '<div class="callout bad"><div><b>Signed in as ' + esc(s.denied) + ', but this account can\'t open the admin.</b> Ask an existing admin to add this address under Site &amp; info → Admins. Setting up for the first time? Check that the database rules are published and that your address is in <code>config/admins</code> in the Firebase console.<div class="actions">' + btn(signOut, 'Use a different Google account', 'tiny') + '</div></div></div>' : '') +
      (s.err ? '<div class="callout bad"><div><b>Couldn\'t sign in.</b> ' + esc(s.err) + '</div></div>' : '') +
      '<div class="actions">' + (CONFIGURED ? btn(async function () {
        s.err = ''; s.denied = '';
        var au = await auth(); await au.ready(); observeAuth(au);
        try { await au.signIn(); } catch (e) { if (/popup-closed|cancelled-popup/.test((e && e.code) || '')) return; s.err = authError(e); render(); return; }
        await enter();
      }, googleMark() + ' Sign in with Google', 'primary google', 'id="signInBtn"') : '') +
      '</div>' +
      '<p class="small muted">You stay signed in until you close this tab or choose Sign out. Changes are recorded with your name.</p></div></div>';
  }
  async function enter() {   // after Google sign-in: check access, then load the data
    var au = await auth(), u = au.user(); if (!u) return;
    clearSession(); A.user = u; var version = sessionVersion;
    try { await liveLoad(version, u); }
    catch (e) { if (version !== sessionVersion) return; clearSession(); if (e.denied) { signInState.denied = u.email; render(); return; } throw e; }
    checkSession(version, u); A.user = u;
    A.mode = 'live'; signInState.err = ''; signInState.denied = '';
    toast('Signed in as ' + u.email, 'good');
    go(A.empty ? '#/import' : '#/');
  }
  function viewImport() {
    var html = pageHead('First-time setup or recovery', 'Load the results data', 'The database is empty. Load a backup file once, check it, then publish. After that, everything is edited here. The site\'s code never contains results data.');
    var staged = changes().length;
    html += '<div class="card"><h3>From a backup file</h3><p class="small">A backup downloaded from this admin (Dashboard → Backups). The private project archive holds <code>data-backup-2026-11-06.json</code> with all the 2026 results.</p><div class="actions">' +
      fileIn(async function (files) { await stageAll(readBackup(await files[0].text())); toast('Backup loaded. Check it, then publish.', 'good'); go('#/publish'); }, 'application/json,.json', 'Choose a backup file') + '</div></div>';
    if (staged) html += '<div class="callout"><div>' + staged + ' document' + (staged === 1 ? '' : 's') + ' loaded and waiting. <a href="#/publish">Review &amp; publish</a></div></div>';
    return html;
  }
  function backupCard() {
    return '<div class="card"><h3>Backups</h3><p class="small">A backup is one file holding every season, competitor and photo. Download one each month and keep it in the private project archive. Restoring replaces the working copy with the backup; nothing changes on the site until you publish.</p><div class="actions">' +
      btn(async function () { download('nr-rally-backup-' + new Date().toISOString().slice(0, 10) + '.json', await backupText()); toast('Backup downloaded.', 'good'); }, 'Download a backup', '', 'id="backupBtn"') +
      fileIn(async function (files) {
        var b = readBackup(await files[0].text());
        if (!window.confirm('Replace the working copy with the backup from ' + (b.exportedAt || 'this file').slice(0, 10) + '? Nothing changes on the site until you publish.')) return;
        await stageAll(b); toast('Backup loaded. Review the changes, then publish.', 'good'); go('#/publish');
      }, 'application/json,.json', 'Restore from a backup') + '</div></div>';
  }

  /* ------------------------------------------------------------------ dashboard */
  function viewDashboard() {
    var s = season(), m = model(), cal = (s && s.rounds) || [];
    var done = cal.filter(function (r) { return r.results; }), next = cal.filter(function (r) { return !r.results; })[0];
    var issues = { error: 0, warn: 0 }, perRound = [];
    done.forEach(function (r) {
      var raw = rawRound(r.id); if (!raw) return;
      var iss = E.validateRound(raw, {}); var e = iss.filter(function (x) { return x.level === 'error'; }).length, w = iss.filter(function (x) { return x.level === 'warn'; }).length;
      issues.error += e; issues.warn += w; if (e || w) perRound.push([r.id, e, w]);
    });
    var unknown = knownNames(), nChg = changes().length;
    var html = pageHead(esc(A.mode === 'live' ? 'Signed in as ' + A.user.email : 'Demo'), A.year + ' season', 'Add results after each round, keep competitor profiles up to date and publish when you\'re ready. Nothing goes live until you publish.');
    html += '<div class="grid grid-3">' +
      '<div class="card stat-card"><p class="eyebrow">Rounds with results</p><b>' + done.length + ' / ' + cal.length + '</b><span>' + esc(s ? (s.status || '') : '') + '</span>' +
      (next ? '<a class="btn primary" href="#/results/' + next.id + '">Add ' + next.id + ' results</a>' : (cal.length ? '<span class="small muted">Every round on the calendar has results.</span>' : '<a class="btn" href="#/events">Add events &amp; rounds</a>')) + '</div>' +
      '<div class="card stat-card"><p class="eyebrow">Checks</p><b>' + (issues.error ? issues.error + ' error' + (issues.error === 1 ? '' : 's') : 'No errors') + '</b><span>' + issues.warn + ' warning' + (issues.warn === 1 ? '' : 's') + ' to review</span>' +
      (perRound.length ? '<div class="mini-list">' + perRound.map(function (x) { return '<a href="#/results/' + x[0] + '">' + x[0] + ': ' + (x[1] ? x[1] + ' error' + (x[1] === 1 ? '' : 's') : '') + (x[1] && x[2] ? ', ' : '') + (x[2] ? x[2] + ' warning' + (x[2] === 1 ? '' : 's') : '') + '</a>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="card stat-card"><p class="eyebrow">Unpublished</p><b>' + (nChg ? nChg + ' change' + (nChg === 1 ? '' : 's') : 'Nothing waiting') + '</b><span>' + (A.mode === 'live' ? 'Publishing updates the public site straight away.' : 'Demo mode never saves.') + '</span>' +
      (nChg ? '<a class="btn primary" href="#/publish">Review &amp; publish</a>' : '') + '</div></div>';
    if (m && m.standings.drivers.length) {
      html += '<div class="section"><div class="section-head"><h2>Standings preview</h2><span class="small muted">Includes unpublished changes</span></div><div class="grid grid-2">' +
        ['drivers', 'codrivers'].map(function (k) {
          return '<div class="card"><h3>' + (k === 'drivers' ? 'Drivers' : 'Co-drivers') + '</h3><table class="data mini"><tbody>' + m.standings[k].slice(0, 6).map(function (r) {
            return '<tr><td class="num">' + r.rank + '</td><td>' + esc(r.name) + (r.eligible ? '' : ' *') + '</td><td><span class="cls ' + esc(r.cls) + '">' + esc(r.cls) + '</span></td><td class="num"><b>' + r.total + '</b></td></tr>';
          }).join('') + '</tbody></table></div>';
        }).join('') + '</div></div>';
    }
    if (unknown.length) html += '<div class="callout" style="margin-top:18px"><div><b>' + unknown.length + ' new name' + (unknown.length === 1 ? '' : 's') + ' in the results</b> will be added to Competitors when you publish: ' + esc(unknown.slice(0, 8).join(', ')) + (unknown.length > 8 ? '…' : '') + '. If one is just another spelling of an existing competitor, add it as an “also printed as” name instead.</div></div>';
    html += '<div class="section"><div class="section-head"><h2>Start the next season</h2></div>' + newSeasonCard() + '</div>';
    html += '<div class="section">' + backupCard() + '</div>';
    return html;
  }
  function newSeasonCard() {
    var ys = years(), next = (ys[0] || new Date().getFullYear()) + 1, st = A.newSeason || (A.newSeason = { year: next, from: ys[0], current: false });
    return '<div class="card"><p style="margin-top:0">Creates an empty calendar for a new year and copies the classes, points scales and minimum starts from an earlier season. NR results, events and documents start empty. RS events, classifications and rules are not copied. Earlier seasons stay on the site; visitors switch with the season picker.</p><p><strong>Copied settings are placeholders, not approved new-year rules.</strong> Verify classes, points, minimum starts and supported scoring policies against the new official SSRs before publishing. Do not invent missing calendar details or entry lists. The bundled Getting started guide has its own reference edition and needs a separate annual review.</p><div class="form-grid">' +
      fld('Year', input(function (v) { st.year = numOrNull(v); }, st.year, 'inputmode="numeric" id="nsYear"')) +
      fld('Copy settings from', select(function (v) { st.from = +v; }, st.from, ys.map(function (y) { return [y, y]; }))) +
      '<div class="fld">' + check(function (v) { st.current = v; }, st.current, 'Make it the season the public site opens on') + '</div></div>' +
      '<div class="actions">' + btn(function () {
        var y = st.year; if (!y || y < 1990 || y > 2100) throw new Error('Enter a four-digit year.');
        if (years().indexOf(y) >= 0) throw new Error('There is already a ' + y + ' season.');
        var src = season(st.from) || {};
        var fresh = { year: y, championship: src.championship || '', shortName: src.shortName || '', status: 'planned', pointsScale: clone(src.pointsScale || { overall: [], cls: [] }), minStarts: src.minStarts || 0,
          classes: clone(src.classes || []), classMap: { drivers: {}, codrivers: {} }, msa: { label: (src.msa && src.msa.label) || 'MSA standings', url: '', generated: '', confirmedRounds: [] }, documents: [], events: [], rounds: [], notes: [] };
        putDoc(seasonPath(y), fresh);
        site().seasons.push({ year: y, label: String(y) }); site().seasons.sort(function (a, b) { return a.year - b.year; });
        if (st.current) site().currentSeason = y;
        A.year = y; A.newSeason = null; toast(y + ' season created. Add its events and rounds next, then publish.', 'good'); go('#/events');
      }, 'Create season', 'primary', 'id="nsBtn"') + '</div></div>';
  }

  /* ------------------------------------------------------------------ AI preparation and local review */
  function aiSnapshot(year) {
    var docs = workingDocs(), selected = { people: (peopleDoc().people || []).map(function (p) { return { id: p.id, name: p.name, aliases: p.aliases || [] }; }),
      seasons: site().seasons };
    Object.keys(docs).forEach(function (p) { if (p.indexOf('data/seasons/' + year + '/') === 0) selected[p] = docs[p]; });
    return AI.canonical(selected);
  }
  function aiResetReview(st) { st.payload = null; st.preview = null; st.errors = []; st.choices = {}; st.rules = false; st.evidence = false; st.finality = false; st.page = 0; st.identityPage = 0; st.identities = null; }
  function aiContext(st) {
    var se = season(st.year), context = { task: st.task, target: { year: st.year, roundId: st.task === 'results' ? st.roundId : null },
      baseToken: st.token, sourceChecklist: st.sources, calendar: se ? se.rounds.map(function (r) { return { id: r.id, eventId: r.eventId, day: r.day, date: r.date }; }) : [],
      events: se ? se.events.map(function (e) { return { id: e.id, name: e.name, dates: e.dates }; }) : [],
      classes: se ? se.classes : [], existingNames: [] };
    if (st.includeNames) context.existingNames = peopleDoc().people.map(function (p) { return { id: p.id, name: p.name, aliases: p.aliases || [] }; });
    return context;
  }
  function aiRead(st) {
    aiResetReview(st);
    try {
      var p = AI.parse(st.text);
      if (!st.token || p.baseToken !== st.token || p.task !== st.task || p.target.year !== st.year || p.target.roundId !== (st.task === 'results' ? st.roundId : null)) throw new Error('The response does not match this prompt pack/task/target. Generate a pack and ask the AI to copy its target and baseToken.');
      st.payload = p; st.errors = AI.assess(p).errors;
    } catch (e) { st.errors = [e.message]; }
    render();
  }
  function aiPreview(st) {
    if (!st.payload) throw new Error('Read the returned JSON first.');
    if (st.base !== aiSnapshot(st.year)) throw new Error('The target season or identity list changed. Choose Recheck against current draft, then review again.');
    st.preview = AI.plan(st.payload, workingDocs(), st.choices, { rules: st.rules, evidence: st.evidence, finality: st.finality });
    st.errors = st.preview.errors; render();
  }
  function aiIssues(errors, warns) {
    return '<ul class="issues">' + errors.map(function (s) { return '<li class="error"><b>Blocked</b> ' + esc(s) + '</li>'; }).concat((warns || []).map(function (s) { return '<li class="warn"><b>Check</b> ' + esc(s) + '</li>'; })).join('') + '</ul>';
  }
  function aiReviewedSettingsCard(s) {
    if (!s || !s._aiImport) return '';
    var m = s._aiImport, changed = m.signature !== AI.signature(s);
    return '<div class="card"><h3>Imported regulations review</h3><p class="small">' + (changed ? 'Settings or calendar changed since the last rules review. Publishing is blocked.' : 'Supported rules reviewed. Changes to scoring, documents or calendar require a fresh review.') +
      ' Compare the values and every governing clause; AI evidence is not a guarantee.</p><details><summary>Rule declarations and sources</summary><pre class="ai-json">' + esc(JSON.stringify({ rules: m.rules, sources: m.sources }, null, 2)) + '</pre></details>' +
      (changed ? btn(function () {
        if (!m.rules || Object.keys(AI.policy).some(function (k) { return !m.rules[k] || m.rules[k].value !== AI.policy[k] || m.rules[k].assessment !== 'supported'; })) throw new Error('Unsupported rules cannot be approved. Prepare a corrected regulations import.');
        if (!window.confirm('Have you compared ALL changed values with the official regulations and verified that every declared scoring policy still applies? If rules changed, cancel and import the new regulations.')) return;
        m.signature = AI.signature(s); m.approved = true; if (s.msa) s.msa.confirmedRounds = []; render();
      }, 'I reviewed the changed settings against the regulations', '', 'id="aiSettingsApprove"') : '') + '</div>';
  }
  function viewAIImport() {
    var st = A.ai || (A.ai = { task: 'season', year: Math.max.apply(null, years()) + 1, roundId: '', phase: 'regulations', sources: '', includeNames: false,
      text: '', token: '', base: '', prompt: '', errors: [], choices: {}, rules: false, evidence: false, page: 0, search: '' });
    var html = pageHead('Document preparation · local review only', 'AI Import', 'Prepare a season, entries or official results with free ChatGPT or Claude. You upload documents in your own chat; this site never sends them to AI. Nothing is saved until normal publishing.');
    html += '<div class="callout warn"><div><b>AI can be wrong.</b> No prompt guarantees correctness. Use official SSRs/SRs and amendments, entry lists and classifications; verify the cited pages. Sportity links may require login: download the actual files. Free chat accounts do not provide free API access. Never attach backups or private licence/contact information to AI.</div></div>';
    html += aiReviewedSettingsCard(season(st.year));
    function changeTarget(fn) { return function (v) { fn(v); st.token = ''; st.prompt = ''; aiResetReview(st); render(); }; }
    var rounds = (season(st.year) && season(st.year).rounds) || [];
    html += '<div class="card"><h3>1. Choose the task and documents</h3><div class="form-grid">' +
      fld('Task', select(changeTarget(function (v) { st.task = v; st.year = v === 'season' ? Math.max.apply(null, years()) + 1 : A.year; st.roundId = ''; }),
        st.task, [['season', 'New season'], ['amendment', 'Update season / regulations'], ['competitors', 'Entry-list crews & participation'], ['results', 'Official round results']], 'id="aiTask"')) +
      fld('Target year', st.task === 'season' ? input(changeTarget(function (v) { st.year = +v; }), st.year, 'type="number" min="1990" max="2100" id="aiYear"') :
        select(changeTarget(function (v) { st.year = +v; st.roundId = ''; }), st.year, years().map(function (y) { return [y, y]; }), 'id="aiYear"')) +
      fld('Prompt phase', select(function (v) { st.phase = v; st.prompt = ''; render(); }, st.phase, [['regulations', 'Regulations / capability check'], ['setup', 'Calendar, classes and entries'], ['results', 'One official classification']], 'id="aiPhase"')) +
      (st.task === 'results' ? fld('Round', select(changeTarget(function (v) { st.roundId = v; }), st.roundId, [['', 'Choose round']].concat(rounds.map(function (r) { return [r.id, r.id + ' · ' + r.date]; })), 'id="aiRound"')) : '') +
      fld('Document checklist', area(function (v) { st.sources = v; st.prompt = ''; }, st.sources, 'rows="4" id="aiSources"'),
        'List filenames, document kinds, versions/dates and official URLs. Regulations tasks need SSRs and amendments; results need the official classification. Upload documents yourself to the AI.', 'span3') +
      '<div class="fld span3">' + check(function (v) { st.includeNames = v; st.prompt = ''; render(); }, st.includeNames,
        'Include existing names/aliases in the prompt (optional: only share with your chosen AI if appropriate)', 'id="aiNames"') + '</div></div><div class="actions">' +
      btn(function () {
        if (!Number.isInteger(st.year) || st.year < 1990 || st.year > 2100) throw new Error('Choose a valid year.');
        if (st.task === 'season' && season(st.year)) throw new Error('That season exists. Use Update season / regulations.');
        if (st.task !== 'season' && !season(st.year)) throw new Error('Choose an existing season.');
        if (st.task === 'results' && !rounds.some(function (r) { return r.id === st.roundId; })) throw new Error('Choose an existing round.');
        if (!st.sources.trim()) throw new Error('List the official documents you will attach.');
        st.token = crypto.randomUUID(); st.base = aiSnapshot(st.year); aiResetReview(st);
        st.prompt = AI.prompt(aiContext(st), st.phase); render();
      }, 'Generate prompt pack', 'primary', 'id="aiGenerate"') +
      fileIn(async function (files) {
        var text = await files[0].text(); if (AI.bytes(text) > 12 * 1024 * 1024) throw new Error('Saved import draft is too large.');
        var saved; try { saved = JSON.parse(text); } catch (e) { throw new Error('Saved draft is not valid JSON.'); }
        if (!saved || saved.format !== 'nr-rally-ai-draft' || saved.version !== 1 || !saved.state) throw new Error('Choose a saved AI Import draft, not a backup.');
        var v = saved.state;
        if (['season', 'amendment', 'competitors', 'results'].indexOf(v.task) < 0 || !Number.isInteger(v.year) ||
          ['regulations', 'setup', 'results'].indexOf(v.phase) < 0 || ['roundId', 'sources', 'text', 'token', 'base'].some(function (k) { return typeof v[k] !== 'string'; })) throw new Error('Invalid saved import draft.');
        A.ai = { task: v.task, year: v.year, roundId: v.roundId, phase: v.phase, sources: v.sources, includeNames: false, text: v.text,
          token: v.token, base: v.base, prompt: '', errors: [], choices: {}, rules: false, evidence: false, page: 0, search: '' };
        if (v.text) aiRead(A.ai); else render();
      }, 'application/json,.json', 'Resume saved import draft') + '</div></div>';
    if (st.token) {
      if (st.prompt) html += '<div class="card"><h3>2. Copy the prompt and attach your files in the AI chat</h3><p class="small">For large seasons use complete smaller setup/entry batches. Results require one WHOLE round classification with every page and reconciled total rows. Per-page imports replace, never append: combine all pages/batches in your AI chat before returning JSON. Partial responses can be downloaded locally but cannot stage. Free account limits vary.</p>' +
        '<textarea class="mono" rows="8" readonly id="aiPrompt">' + esc(st.prompt) + '</textarea><div class="actions">' +
        btn(async function () { if (!navigator.clipboard) throw new Error('Clipboard unavailable. Select and copy the prompt text above.'); await navigator.clipboard.writeText(st.prompt); toast('Prompt copied.', 'good'); }, 'Copy prompt', '', 'id="aiCopy"') +
        btn(function () { download('ai-import-instructions-' + st.year + '.txt', st.prompt); download('ai-import-contract-v1.json', JSON.stringify(AI.contract, null, 2)); }, 'Download prompt & contract') + '</div></div>';
      html += '<div class="card"><h3>3. Read the returned JSON</h3>' +
        area(function (v) { st.text = v; aiResetReview(st); }, st.text, 'rows="7" class="mono" id="aiJSON" placeholder="Paste one complete JSON object (no Markdown fences)"') +
        '<div class="actions">' + btn(function () { aiRead(st); }, 'Read returned JSON', 'primary', 'id="aiRead"') +
        fileIn(async function (files) {
          if (files[0].size > AI.contract.limits.bytes) throw new Error('JSON exceeds 4 MiB; ask for a smaller batch.');
          st.text = await files[0].text(); aiRead(st);
        }, 'application/json,.json', 'Choose returned JSON') +
        btn(function () { download('ai-import-draft-' + st.year + '.json', JSON.stringify({ format: 'nr-rally-ai-draft', version: 1, state: {
          task: st.task, year: st.year, roundId: st.roundId, phase: st.phase, sources: st.sources, text: st.text, token: st.token, base: st.base
        } }, null, 2)); }, 'Download local import draft') +
        (st.errors.length ? btn(function () { st.prompt = AI.prompt(aiContext(st), st.phase, st.errors); render(); }, 'Generate repair / developer handoff prompt', '', 'id="aiRepair"') : '') + '</div></div>';
    }
    if (st.errors.length) html += '<div class="card" id="aiErrors"><h3>Import blockers</h3>' + aiIssues(st.errors) + '</div>';
    if (!st.payload || AI.assess(st.payload).errors.length) return html;
    var p = st.payload, assessment = AI.assess(p), ids = st.identities || (st.identities = AI.identities(p, peopleDoc())), stale = st.base !== aiSnapshot(st.year);
    html += '<div class="card"><h3>4. Review identities, evidence and rules</h3>' +
      aiIssues([], assessment.warns) +
      (stale ? '<p class="bad-line">The draft changed since this pack was generated. Recheck below; nothing can stage from a stale preview.</p>' : '') +
      '<details><summary>Sources, coverage and field evidence</summary><pre class="ai-json">' + esc(JSON.stringify({ sources: p.sources, coverage: p.coverage, evidence: p.evidence, rules: p.rules, issues: p.issues }, null, 2)) + '</pre></details>' +
      '<p class="small">' + ids.length + ' competitor references. Exact unique names resolve automatically; look-alikes, alias proposals and AI identity suggestions require your decision. No fuzzy merge is automatic.</p>' +
      aiIdentityTable(st, ids) + '<div class="chk-row">' +
      (p.rules ? check(function (v) { st.rules = v; st.preview = null; render(); }, st.rules, 'I verified every supported rule and changed setting against the official regulations', 'id="aiRulesApprove"') : '') +
      check(function (v) { st.evidence = v; st.preview = null; render(); }, st.evidence, 'I checked source coverage, all unclear/missing times and every proposed identity/credit/class/extra-start exception', 'id="aiEvidenceApprove"') +
      (p.rounds.some(function (r) { return AI.needsFinalityReview(r.status); }) ? check(function (v) { st.finality = v; st.preview = null; render(); }, st.finality,
        'I acknowledge this classification is provisional or its finality is unclear; staging does not make it final', 'id="aiFinalityApprove"') : '') +
      '</div><div class="actions">' + btn(function () { aiPreview(st); }, 'Calculate change preview', 'primary', (stale ? 'disabled ' : '') + 'id="aiPreview"') +
      btn(function () { st.base = aiSnapshot(st.year); st.rules = false; st.evidence = false; st.finality = false; st.preview = null; st.identities = null; st.errors = AI.assess(st.payload).errors; render(); }, 'Recheck against current draft', '', 'id="aiRecheck"') + '</div></div>';
    if (st.preview && !st.preview.errors.length) {
      var preview = st.preview, changes = preview.changes;
      html += '<div class="card" id="aiConsequences"><h3>5. Proposed changes (' + changes.length + ' documents)</h3>' + aiIssues([], preview.warns) +
        '<p class="small">Omitted fields and unrelated seasons remain unchanged. Scoped entry lists replace only the reviewed event list and never create starts/points or clear MSA confirmations. Legacy profile-only packs do not log participation. Rules/results changes clear affected MSA confirmations. Nothing switches the public default season automatically.</p>' +
        changes.map(function (c) { return '<details><summary>' + esc(label(c.path)) + '</summary><pre class="ai-json">' +
          esc(JSON.stringify({ before: c.before, after: c.after }, null, 2)) + '</pre></details>'; }).join('') +
        aiStandingsPreview(preview) + aiResultPreview(st, p) + '<div class="actions">' +
        btn(function () {
          if (st.base !== aiSnapshot(st.year)) throw new Error('The draft changed. Recheck and review again.');
          var checked = AI.plan(st.payload, workingDocs(), st.choices, { rules: st.rules, evidence: st.evidence, finality: st.finality });
          if (checked.errors.length) throw new Error(checked.errors.join('\n'));
          checked.changes.forEach(function (c) { putDoc(c.path, clone(c.after)); });
          st.base = aiSnapshot(st.year); st.preview = null; st.errors = []; st.text = ''; A.year = st.year;
          toast(checked.changes.length ? 'Reviewed import staged. Nothing is live until you publish.' : 'No changes: this data is already present.', 'good'); go('#/publish');
        }, 'Stage this reviewed task in the working draft', 'primary', 'id="aiStage"') + '</div></div>';
    }
    return html;
  }
  function aiIdentityTable(st, ids) {
    var search = (st.identitySearch || '').toLowerCase(), candidateSearch = (st.candidateSearch || '').toLowerCase();
    var filtered = ids.filter(function (r) { return (r.name + ' ' + r.ref).toLowerCase().indexOf(search) >= 0; });
    var last = Math.max(0, Math.ceil(filtered.length / 50) - 1); st.identityPage = Math.min(st.identityPage || 0, last);
    return '<div class="form-grid">' +
      fld('Search imported names', input(function (v) { st.identitySearch = v; st.identityPage = 0; }, st.identitySearch, 'data-rerender id="aiIdentitySearch"')) +
      fld('Find another existing profile', input(function (v) { st.candidateSearch = v; }, st.candidateSearch, 'data-rerender id="aiCandidateSearch"'), 'Search name or ID to add matching profiles to the choices (up to 30).') +
      '</div><div class="table-wrap"><table class="data mini"><thead><tr><th>Printed name</th><th>Aliases proposed</th><th>Identity decision</th></tr></thead><tbody>' +
      filtered.slice(st.identityPage * 50, st.identityPage * 50 + 50).map(function (row) {
        var choice = Object.prototype.hasOwnProperty.call(st.choices, row.ref) ? st.choices[row.ref] : row.choice;
        var candidates = peopleDoc().people.filter(function (p) {
          return row.exact.indexOf(p.id) >= 0 || p.id === row.suggested || p.id === choice || row.similar.indexOf(p.name) >= 0;
        });
        if (candidateSearch) peopleDoc().people.filter(function (p) { return (p.id + ' ' + p.name).toLowerCase().indexOf(candidateSearch) >= 0; }).slice(0, 30).forEach(function (p) { if (!candidates.some(function (x) { return x.id === p.id; })) candidates.push(p); });
        return '<tr><td>' + esc(row.name) + (row.similar.length ? '<small> Looks like: ' + esc(row.similar.join(', ')) + '</small>' : '') + '</td><td>' + esc(row.aliases.join(', ')) + '</td><td>' +
          select(function (v) { st.choices[row.ref] = v; st.preview = null; }, choice, [['', 'Choose identity'], ['new', 'New person']].concat(candidates.map(function (p) { return [p.id, p.name]; })), 'aria-label="Identity for ' + esc(row.name) + '"') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="actions">' +
      btn(function () { st.identityPage--; render(); }, 'Previous names', 'tiny', st.identityPage ? '' : 'disabled') +
      '<span class="small">Names page ' + (st.identityPage + 1) + ' of ' + (last + 1) + '</span>' +
      btn(function () { st.identityPage++; render(); }, 'Next names', 'tiny', st.identityPage < last ? '' : 'disabled') + '</div>';
  }
  function aiStandingsPreview(preview) {
    if (!preview.afterModel) return '';
    return ['drivers', 'codrivers'].map(function (role) {
      var before = {};
      if (preview.beforeModel) preview.beforeModel.standings[role].forEach(function (r) { before[r.id] = r; });
      return '<details><summary>' + (role === 'drivers' ? 'Driver' : 'Co-driver') + ' starts / points / standings consequences</summary><div class="table-wrap"><table class="data mini"><thead><tr><th>Name</th><th>Before starts / points / rank</th><th>After starts / points / rank</th></tr></thead><tbody>' +
        preview.afterModel.standings[role].map(function (r) { var b = before[r.id]; delete before[r.id]; return '<tr><td>' + esc(r.name) + '</td><td>' + (b ? b.starts + ' / ' + b.total + ' / ' + b.rank : 'Not listed') + '</td><td>' + r.starts + ' / ' + r.total + ' / ' + r.rank + '</td></tr>'; }).join('') +
        Object.keys(before).map(function (id) { var r = before[id]; return '<tr><td>' + esc(r.name) + '</td><td>' + r.starts + ' / ' + r.total + ' / ' + r.rank + '</td><td>Removed from this season</td></tr>'; }).join('') + '</tbody></table></div></details>';
    }).join('');
  }
  function aiResultPreview(st, p) {
    var rows = [];
    p.rounds.forEach(function (r) { r.entries.forEach(function (e) { rows.push({ round: r.id, entry: e }); }); });
    var filtered = rows.filter(function (r) { return (r.round + ' ' + r.entry.car + ' ' + r.entry.driverRef + ' ' + r.entry.codriverRef).toLowerCase().indexOf((st.search || '').toLowerCase()) >= 0; });
    var last = Math.max(0, Math.ceil(filtered.length / 50) - 1); st.page = Math.min(st.page || 0, last);
    return '<h3>Result row review (' + rows.length + ' rows)</h3>' + fld('Search round/car/competitor reference', input(function (v) { st.search = v; st.page = 0; }, st.search, 'data-rerender id="aiSearch"')) +
      '<div class="table-wrap"><table class="data mini"><thead><tr><th>Round / car / status</th><th>Driver / co-driver references</th><th>Stage times as printed</th><th>Total</th></tr></thead><tbody>' +
      filtered.slice(st.page * 50, st.page * 50 + 50).map(function (r) { var e = r.entry; return '<tr><td>' + esc(r.round + ' / ' + e.car + ' / ' + e.status) + '</td><td>' + esc(e.driverRef + ' / ' + (e.codriverRef || '')) +
        '</td><td class="mono small">' + esc(e.times.map(function (t) { return t === null ? 'missing' : t; }).join(' | ')) + '</td><td>' + esc(e.total || '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="actions">' + btn(function () { st.page--; render(); }, 'Previous 50', 'tiny', st.page ? '' : 'disabled') +
      '<span class="small">Page ' + (st.page + 1) + ' of ' + (last + 1) + '</span>' + btn(function () { st.page++; render(); }, 'Next 50', 'tiny', st.page < last ? '' : 'disabled') + '</div>';
  }

  /* ------------------------------------------------------------------ results */
  var STATUS = [['classified', 'Classified'], ['DNF', 'DNF'], ['DNS', 'DNS']];
  function classOpts(blank) { var s = season(); return (blank ? [['', blank]] : []).concat((s.classes || []).map(function (c) { return [c.id, c.id]; })); }
  function peopleList() {
    var out = []; peopleDoc().people.forEach(function (p) { out.push(p.name); (p.aliases || []).forEach(function (a) { out.push(a); }); });
    return '<datalist id="dl-people">' + out.sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
  }
  function cleanEntry(e) {
    return { status: e.status || 'classified', pos: e.status && e.status !== 'classified' ? null : numOrNull(e.pos), car: String(e.car || ''), driver: e.driver || '', codriver: e.codriver || '', 'class': E.normClass(e['class']),
      vehicle: e.vehicle || '', stages: numOrNull(e.stages), times: (e.times || []).map(strOrNull), stagePos: (e.stagePos || []).map(numOrNull), pen: strOrNull(e.pen), total: strOrNull(e.total) };
  }
  function ensureArrays(raw) {
    var n = (raw.stages || []).length;
    (raw.entries || []).forEach(function (e) {
      e.times = (e.times || []).slice(0, n); while (e.times.length < n) e.times.push(null);
      e.stagePos = (e.stagePos || []).slice(0, n); while (e.stagePos.length < n) e.stagePos.push(null);
    });
  }
  function viewResults(id) {
    var s = season(), cal = (s && s.rounds) || [];
    var html = pageHead(A.year + ' · results', 'Results', 'Enter each round from its official classification PDF. Copy the text out of the PDF and paste it in, or type and correct it in the table. Never use live timing.');
    if (!cal.length) return html + '<div class="card empty"><h2>No rounds on the ' + A.year + ' calendar yet</h2><p><a class="btn primary" href="#/events">Add events &amp; rounds</a></p></div>';
    if (!id || !calRound(id)) id = (cal.filter(function (r) { return !r.results; })[0] || cal[cal.length - 1]).id;
    var meta = calRound(id), ev = eventById(meta.eventId) || { name: meta.eventId };
    html += '<div class="round-switch">' + cal.map(function (r, i) {
      var e = eventById(r.eventId) || {};
      return '<a href="#/results/' + r.id + '" class="' + (r.id === id ? 'on' : '') + '">' + (r.results ? '<i class="dot ok"></i>' : '<i class="dot"></i>') + 'R' + (i + 1) + ' ' + esc(e.short || r.eventId) + '</a>';
    }).join('') + '</div>';
    var raw = rawRound(id);
    html += '<div class="round-title"><h2>Round ' + roundNo(id) + ' · ' + esc(ev.name) + '</h2><span class="muted">' + esc(meta.day) + (meta.date ? ' · ' + esc(meta.date) : '') + ' · file ' + esc(id) + '.json</span></div>';
    html += importPanel(id, !raw);
    if (!raw) {
      html += '<div class="card empty"><h3>No results for this round yet</h3><p>Paste the text from the official PDF above, or start with an empty table and type the results in.</p>' +
        btn(function () { putDoc(roundPath(A.year, id), { id: id, title: '', status: 'Final Official Classification', stages: ['SS1', 'SS2', 'SS3', 'SS4', 'SS5', 'SS6'], notes: [], source: { file: '', url: (ev.links && ev.links.results) || '' }, entries: [] }); meta.results = true; addRow(rawRound(id)); render(); }, 'Start with an empty table', '', 'id="blankBtn"') + '</div>';
      return html;
    }
    ensureArrays(raw);
    html += peopleList();
    var msa = s.msa || (s.msa = { label: '', url: '', generated: '', confirmedRounds: [] });
    if (!msa.confirmedRounds) msa.confirmedRounds = [];
    var src = raw.source || (raw.source = { file: '', url: '' });
    html += '<div class="card"><h3>Sheet details</h3><div class="form-grid">' +
      fld('Title on the sheet', input(function (v) { raw.title = v; }, raw.title), '', 'span2') +
      fld('Sheet status', input(function (v) { raw.status = v; }, raw.status, 'list="dl-status"'), 'As printed, e.g. “Final Official Classification”. A status containing “Provisional” is flagged on the site.') +
      fld('Stages', input(function (v) { raw.stages = words(v.toUpperCase()); ensureArrays(raw); }, (raw.stages || []).join(', '), 'data-rerender spellcheck="false" id="fStages"'), 'Stage names in order, separated by commas (e.g. SS1, SS3, SS4 if SS2 was cancelled).') +
      fld('Results page', input(function (v) { src.url = v; }, src.url, 'type="url" placeholder="https://"'), 'Where the PDF was published (e.g. the event\'s results page).') +
      fld('PDF file name', input(function (v) { src.file = v; }, src.file), 'The name of the official PDF, for the record. Keep the PDF itself in the private project archive.') +
      fld('Notes shown with this round', area(function (v) { raw.notes = lines(v); }, (raw.notes || []).join('\n'), 'rows="3"'), 'One per line — for example remarks printed on the sheet.', 'span2') +
      '<div class="fld span2">' + check(function (v) { var i = msa.confirmedRounds.indexOf(id); if (v && i < 0) msa.confirmedRounds.push(id); if (!v && i >= 0) msa.confirmedRounds.splice(i, 1); }, msa.confirmedRounds.indexOf(id) >= 0, 'Points for this round match the published MSA standings') + '<small>Tick once MSA\'s standings include this round and agree. Unticked rounds show as “points calculated”.</small></div>' +
      '</div><datalist id="dl-status"><option value="Final Official Classification"><option value="Provisional Official Classification"></datalist></div>';
    html += '<div class="card" id="valCard"><h3>Checks</h3><div id="val"></div></div>';
    html += resultsGrid(raw);
    html += extraStartsCard(raw);
    html += '<div class="card"><div class="card-head"><h3>Points preview</h3><span class="small muted">Computed exactly as the public site will, including unpublished changes</span></div><div id="pts"></div></div>';
    html += '<div class="card danger"><h3>Remove this round\'s results</h3><p class="small">Takes the round off the standings and graphs when you publish. The calendar entry stays.</p>' +
      btn(function () { if (!window.confirm('Remove the ' + id + ' results? (Nothing changes on the site until you publish.)')) return; dropDoc(roundPath(A.year, id)); meta.results = false; var i = msa.confirmedRounds.indexOf(id); if (i >= 0) msa.confirmedRounds.splice(i, 1); render(); }, 'Remove results', 'bad') + '</div>';
    liveRefresh = function () { refreshResults(id); };
    return html;
  }
  function addRow(raw) {
    var n = (raw.stages || []).length, cl = (raw.entries || []).filter(function (e) { return e.status === 'classified'; }).length;
    raw.entries.push({ status: 'classified', pos: cl + 1, car: '', driver: '', codriver: '', 'class': '', vehicle: '', stages: n, times: new Array(n).fill(null), stagePos: new Array(n).fill(null), pen: null, total: null });
  }
  function resultsGrid(raw) {
    var S = raw.stages || [];
    var head = '<tr><th>#</th><th>Status</th><th class="num">Pos</th><th>Car</th><th>Driver</th><th>Co-driver</th><th>Class</th><th>Vehicle</th><th class="num" title="Stages completed">Stg</th>' +
      S.map(function (s) { return '<th class="num">' + esc(s) + '<br><small>time · pos</small></th>'; }).join('') + '<th>Penalty</th><th>Total</th><th></th></tr>';
    var body = raw.entries.map(function (e, i) {
      var more = A.open[i];
      var flags = (e.credit || e.scoredClass || (e.notes && e.notes.length) || e.skipSumCheck) ? ' has-more' : '';
      var row = '<tr data-row="' + i + '"><td class="num muted">' + (i + 1) + '</td>' +
        '<td>' + select(function (v) { e.status = v; if (v !== 'classified') { e.pos = null; e.total = null; } render(); }, e.status || 'classified', STATUS) + '</td>' +
        '<td>' + input(function (v) { e.pos = numOrNull(v); }, e.pos, 'class="w3" inputmode="numeric"' + (e.status !== 'classified' ? ' disabled' : '')) + '</td>' +
        '<td>' + input(function (v) { e.car = v.trim(); }, e.car, 'class="w4"') + '</td>' +
        '<td>' + input(function (v) { e.driver = v; }, e.driver, 'class="wn" list="dl-people"') + '</td>' +
        '<td>' + input(function (v) { e.codriver = v; }, e.codriver, 'class="wn" list="dl-people"') + '</td>' +
        '<td>' + select(function (v) { e['class'] = v; }, e['class'], classOpts('—')) + '</td>' +
        '<td>' + input(function (v) { e.vehicle = v; }, e.vehicle, 'class="wv"') + '</td>' +
        '<td>' + input(function (v) { e.stages = numOrNull(v); }, e.stages, 'class="w3" inputmode="numeric"') + '</td>' +
        S.map(function (s, k) {
          return '<td class="stc">' + input(function (v) { e.times[k] = strOrNull(v); }, e.times[k], 'class="wt" placeholder="m:ss.s" spellcheck="false"') + input(function (v) { e.stagePos[k] = numOrNull(v); }, e.stagePos[k], 'class="w2" inputmode="numeric" title="Stage position"') + '</td>';
        }).join('') +
        '<td>' + input(function (v) { e.pen = strOrNull(v); }, e.pen, 'class="wt" placeholder="0:00"') + '</td>' +
        '<td>' + input(function (v) { e.total = strOrNull(v); }, e.total, 'class="wh" placeholder="h:mm:ss.s"' + (e.status !== 'classified' ? ' disabled' : '')) + '</td>' +
        '<td class="nowrap">' + btn(function () { A.open[i] = !A.open[i]; render(); }, more ? 'Less' : 'More', 'tiny' + flags, 'title="Points credit, scored class and notes"') + btn(function () { raw.entries.splice(i, 1); A.open = {}; render(); }, '✕', 'tiny ghost', 'title="Delete this row" aria-label="Delete row ' + (i + 1) + '"') + '</td></tr>';
      if (more) {
        var cr = e.credit || {};
        var setCredit = function (k, v) { var c = e.credit || {}; if (v === '' || v === false || v == null) delete c[k]; else c[k] = v; if (Object.keys(c).length) e.credit = c; else delete e.credit; };
        row += '<tr class="more-row"><td></td><td colspan="' + (11 + S.length) + '"><div class="form-grid tight">' +
          fld('Scored class', select(function (v) { if (v) e.scoredClass = v; else delete e.scoredClass; }, e.scoredClass || '', classOpts('Automatic')), 'Normally automatic: the competitor\'s season class (Competitors) or the class printed on the sheet.') +
          fld('Points go to driver', input(function (v) { setCredit('driver', v.trim()); }, cr.driver, 'list="dl-people" placeholder="as printed"'), 'Only if the championship credits someone other than the printed driver.') +
          fld('Points go to co-driver', input(function (v) { setCredit('codriver', v.trim()); }, cr.codriver, 'list="dl-people" placeholder="as printed"')) +
          '<div class="fld">' + check(function (v) { setCredit('noCodriver', v); }, cr.noCodriver, 'Don\'t count a co-driver start') + '</div>' +
          fld('Why (shown on the site)', input(function (v) { setCredit('why', v.trim()); }, cr.why), '', 'span2') +
          fld('Notes for this car', area(function (v) { var l = lines(v); if (l.length) e.notes = l; else delete e.notes; }, (e.notes || []).join('\n'), 'rows="2"'), 'One per line.', 'span2') +
          '<div class="fld span2">' + check(function (v) { if (v) e.skipSumCheck = true; else delete e.skipSumCheck; }, e.skipSumCheck, 'The total is printed this way on the sheet even though the stage times don\'t add up to it') + '</div>' +
          '</div></td></tr>';
      }
      return row;
    }).join('');
    return '<div class="card grid-card"><div class="card-head"><h3>Classification (' + raw.entries.length + ' rows)</h3><span class="small muted">Times as printed: m:ss.s for stages, h:mm:ss.s for totals. Leave a stage empty if the crew didn\'t complete it.</span></div>' +
      '<div class="table-wrap"><table class="data edit"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="actions">' + btn(function () { addRow(raw); render(); }, '+ Add a row', '', 'id="addRowBtn"') + btn(function () { sortRows(raw); render(); }, 'Sort: classified by position, then DNF and DNS') + '</div></div>';
  }
  function sortRows(raw) {
    var rank = { classified: 0, DNF: 1, DNS: 2 };
    raw.entries.sort(function (a, b) { var ra = rank[a.status] || 0, rb = rank[b.status] || 0; if (ra !== rb) return ra - rb; if (ra === 0) return (a.pos || 999) - (b.pos || 999); return (b.stages || 0) - (a.stages || 0); });
    A.open = {};
  }
  function extraStartsCard(raw) {
    var xs = raw.extraStarts || [];
    return '<details class="card"' + (xs.length ? ' open' : '') + '><summary><h3>Starts recorded by MSA but missing from the sheet (' + xs.length + ')</h3></summary><p class="small muted">Rare. Use only when the MSA standings count a start for a crew that isn\'t on this round\'s official sheet; it scores 0 points but counts as a start.</p>' +
      xs.map(function (x, i) {
        return '<div class="form-grid tight bordered">' + fld('Car', input(function (v) { x.car = v; }, x.car)) + fld('Driver', input(function (v) { x.driver = v; }, x.driver, 'list="dl-people"')) + fld('Co-driver', input(function (v) { x.codriver = v; }, x.codriver, 'list="dl-people"')) +
          fld('Class', select(function (v) { x['class'] = v; }, x['class'], classOpts('—'))) + fld('Note (shown on the site)', input(function (v) { x.note = v; }, x.note), '', 'span2') +
          '<div class="fld">' + btn(function () { xs.splice(i, 1); if (!xs.length) delete raw.extraStarts; render(); }, 'Remove', 'tiny ghost') + '</div></div>';
      }).join('') + '<div class="actions">' + btn(function () { raw.extraStarts = xs; xs.push({ car: '', driver: '', codriver: '', 'class': '', note: '' }); render(); }, '+ Add a start') + '</div></details>';
  }
  function refreshResults(id) {
    var raw = rawRound(id); if (!raw) return;
    var val = document.getElementById('val'), pts = document.getElementById('pts');
    var iss = E.validateRound(raw, { people: peopleDoc() });
    Array.prototype.forEach.call(document.querySelectorAll('tr[data-row]'), function (tr) { tr.classList.remove('row-error', 'row-warn'); });
    iss.forEach(function (x) { if (x.row == null) return; var tr = document.querySelector('tr[data-row="' + x.row + '"]'); if (tr) tr.classList.add(x.level === 'error' ? 'row-error' : x.level === 'warn' ? 'row-warn' : 'row-info'); });
    if (val) {
      var order = { error: 0, warn: 1, info: 2 };
      iss.sort(function (a, b) { return order[a.level] - order[b.level]; });
      val.innerHTML = iss.length ? '<ul class="issues">' + iss.map(function (x) { return '<li class="' + x.level + '"><b>' + (x.level === 'error' ? 'Error' : x.level === 'warn' ? 'Check' : 'Note') + '</b> ' + esc(x.msg) + '</li>'; }).join('') + '</ul>' : '<p class="ok-line">Everything adds up: positions, totals and stage times are consistent.</p>';
    }
    if (pts) {
      var m; try { m = model(); } catch (e) { pts.innerHTML = '<p class="bad-line">Points can\'t be worked out yet: ' + esc(e.message) + '</p>'; return; }
      var r = m && m.rounds.filter(function (x) { return x.id === id; })[0];
      if (!r) { pts.innerHTML = '<p class="muted">No results.</p>'; return; }
      var ents = r.entries.slice().sort(function (a, b) { var ra = a.status === 'classified' ? 0 : a.status === 'DNF' ? 1 : 2, rb = b.status === 'classified' ? 0 : b.status === 'DNF' ? 1 : 2; return ra - rb || (a.pos || 0) - (b.pos || 0); });
      pts.innerHTML = '<div class="table-wrap"><table class="data mini"><thead><tr><th class="num">Pos</th><th>Car</th><th>Points to (driver / co-driver)</th><th>Scored class</th><th class="num">Class pos</th><th class="num">Overall</th><th class="num">Class</th><th class="num">Total</th></tr></thead><tbody>' +
        ents.map(function (e) {
          return '<tr><td class="num">' + (e.status === 'classified' ? e.pos : e.status) + '</td><td>' + esc(e.car) + '</td><td>' + esc(e.champDriver) + ' / ' + (e.noCreditCodriver ? '<span class="muted">no co-driver start</span>' : esc(e.champCodriver)) + '</td><td><span class="cls ' + esc(e.cls) + '">' + esc(e.cls) + '</span>' + (e.cls !== e.printedClass ? ' <span class="small muted">(sheet ' + esc(e.printedClass) + ')</span>' : '') + '</td><td class="num">' + (e.classPos || '') + '</td>' +
            '<td class="num">' + (e.points ? e.points.overall : '–') + '</td><td class="num">' + (e.points ? e.points.cls : '–') + '</td><td class="num"><b>' + (e.points ? e.points.total : '–') + '</b></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  }
  function importPanel(id, open) {
    var st = A.imp && A.imp.id === id ? A.imp : (A.imp = { id: id, kind: 'pdf', text: '', res: null });
    var raw0 = rawRound(id);
    function read(text) {
      if (!String(text || '').trim()) throw new Error('Paste the text first.');
      var res = st.kind === 'pdf' ? E.parseClassificationText(text, { people: peopleDoc() }) : E.parseSpreadsheet(text);
      if (res.error) throw new Error(res.error);
      if (!res.entries || !res.entries.length) throw new Error('No result rows were found. Check you copied the whole sheet, or use the spreadsheet template.');
      st.res = res; render();
    }
    var html = '<details class="card imp"' + (open || st.res ? ' open' : '') + '><summary><h3>' + (open ? 'Import the official results' : 'Replace with an import') + '</h3></summary>' +
      '<p class="small muted">Nothing is saved by importing. The rows go into the table below, every row is checked, and nothing reaches the website until you publish.</p>' +
      '<div class="seg" role="tablist">' + btn(function () { st.kind = 'pdf'; st.res = null; render(); }, 'Text copied from the PDF', st.kind === 'pdf' ? 'on' : '') + btn(function () { st.kind = 'sheet'; st.res = null; render(); }, 'Spreadsheet (any sheet, including scans)', st.kind === 'sheet' ? 'on' : '') + '</div>';
    if (st.kind === 'pdf') {
      html += '<ol class="steps"><li>Open the official classification PDF in Chrome or Edge.</li><li>Press <kbd>Ctrl</kbd>+<kbd>A</kbd> then <kbd>Ctrl</kbd>+<kbd>C</kbd> to copy all its text.</li><li>Paste it below and choose <b>Read the results</b>.</li></ol>' +
        '<p class="small muted">Works for the two official layouts used in 2026 (the nrcsa.co.za results system and RallyScoring). Any other layout is refused, never guessed. Scanned or photographed sheets have no text: use the spreadsheet option or type into the table.</p>';
    } else {
      html += '<ol class="steps"><li>' + btn(function () {
          var stages = (raw0 && raw0.stages && raw0.stages.length) ? raw0.stages : null;
          download('results-template-' + A.year + '-' + id + '.csv', E.spreadsheetTemplate(stages));
        }, 'Download a template for this round', 'tiny', 'id="tplBtn"') + ' and open it in Excel. ' + (raw0 && raw0.stages && raw0.stages.length ? 'It has a column for each of this round\'s stages.' : 'It has six stage columns: rename them to match the sheet (SS1, SS3…) and delete the ones you don\'t need.') + '</li>' +
        '<li>Before typing, select all the cells and set them to <b>Text</b> (Home → Number format → Text), so Excel doesn\'t change times such as 7:41.5.</li>' +
        '<li>Type one row per car, exactly as printed. <b>Status</b> is Classified, DNF or DNS. Leave a stage empty if the car has no time for it.</li>' +
        '<li>Select the filled cells including the header row, copy, and paste them below. Or save as CSV and choose the file.</li></ol>';
    }
    html += area(function (v) { st.text = v; }, st.text, 'rows="7" class="mono" spellcheck="false" placeholder="Paste here…" id="impText"') +
      '<div class="actions">' + btn(function () { read(st.text); }, 'Read the results', 'primary', 'id="impRead"') +
      (st.kind === 'sheet' ? fileIn(async function (files) { st.text = await files[0].text(); read(st.text); }, '.csv,.tsv,.txt,text/csv,text/plain', 'Choose a CSV file') : '') + '</div>';
    if (st.res) {
      var r = st.res, S = r.stages || [];
      var count = { classified: 0, DNF: 0, DNS: 0 }; r.entries.forEach(function (e) { count[e.status] = (count[e.status] || 0) + 1; });
      var sums = E.sumReport({ stages: S, entries: r.entries.map(cleanEntry) });
      var idx = E.peopleIndex(peopleDoc()), fresh = {};
      r.entries.forEach(function (e) { [e.driver, e.codriver].forEach(function (n) { if (E.normName(n) && !idx.resolve(n).known) fresh[E.normName(n)] = E.similarNames(n, peopleDoc()); }); });
      var notes = (r.warnings || []).map(function (w) { return ['warn', w]; });
      notes.unshift(sums.mismatched.length ? ['error', sums.mismatched.length + ' classified row' + (sums.mismatched.length > 1 ? 's don\'t' : ' doesn\'t') + ' add up (car ' + sums.mismatched.join(', ') + '): stage times + penalty differ from the total. Compare those rows with the PDF after importing.'] :
        ['ok', sums.matched + ' of ' + sums.classified + ' classified rows add up exactly (stage times + penalty = official total).' + (sums.unchecked.length ? ' Not checkable (missing times): car ' + sums.unchecked.join(', ') + '.' : '')]);
      Object.keys(fresh).forEach(function (n) { notes.push(fresh[n].length ? ['warn', 'New name "' + n + '" looks like existing competitor "' + fresh[n][0] + '". If it\'s the same person, add it under Competitors → ' + fresh[n][0] + ' → Also printed as.'] : ['info', 'New competitor: ' + n + '.']); });
      html += '<div class="imp-result"><p><b>Found ' + r.entries.length + ' rows</b> (' + count.classified + ' classified, ' + count.DNF + ' DNF, ' + count.DNS + ' DNS)' + (r.format ? ' · ' + esc(r.format) + (r.format === 'Spreadsheet' ? '' : ' layout') : '') + ' · stages: ' + esc(S.join(', ')) +
        (r.title ? '<br><span class="small muted">' + esc(r.title) + (r.status ? ' — ' + esc(r.status) : '') + '</span>' : '') + '</p>' +
        '<ul class="issues">' + notes.map(function (n) { var lv = n[0] === 'ok' ? 'info ok' : n[0]; return '<li class="' + lv + '"><b>' + (n[0] === 'ok' ? 'Adds up' : n[0] === 'error' ? 'Error' : n[0] === 'warn' ? 'Check' : 'Note') + '</b> ' + esc(n[1]) + '</li>'; }).join('') + '</ul>' +
        '<div class="table-wrap"><table class="data mini"><thead><tr><th class="num">Pos</th><th>Car</th><th>Driver</th><th>Co-driver</th><th>Class</th><th>Stage times</th><th>Total</th></tr></thead><tbody>' +
        r.entries.slice(0, 80).map(function (e) { return '<tr' + (sums.mismatched.indexOf(String(e.car)) >= 0 ? ' class="row-error"' : '') + '><td class="num">' + (e.status === 'classified' ? esc(e.pos) : esc(e.status)) + '</td><td>' + esc(e.car) + '</td><td>' + esc(e.driver) + '</td><td>' + esc(e.codriver) + '</td><td>' + esc(e['class']) + '</td><td class="mono small">' + esc((e.times || []).map(function (t) { return t || '—'; }).join('  ')) + '</td><td class="mono">' + esc(e.total || '') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="actions">' + btn(function () { applyImport(id, r); A.imp = null; toast('Results imported. Review the checks below, then publish.', 'good'); render(); }, raw0 ? 'Replace this round\'s results with these ' + r.entries.length + ' rows' : 'Use these ' + r.entries.length + ' rows', 'primary', 'id="impApply"') + btn(function () { st.res = null; render(); }, 'Cancel') + '</div></div>';
    }
    return html + '</details>';
  }
  function applyImport(id, res) {
    var meta = calRound(id), old = rawRound(id) || {}, ev = eventById(meta.eventId) || {};
    var byCar = {}; (old.entries || []).forEach(function (e) { byCar[e.car] = e; });
    var entries = res.entries.map(function (e) {
      var n = cleanEntry(e), o = byCar[n.car];
      if (o) ['credit', 'scoredClass', 'notes', 'skipSumCheck'].forEach(function (k) { if (o[k] != null) n[k] = clone(o[k]); });
      return n;
    });
    var raw = { id: id, title: res.title || old.title || '', status: res.status || old.status || '', stages: res.stages && res.stages.length ? res.stages : (old.stages || []), notes: old.notes || [],
      source: old.source || { file: '', url: (ev.links && ev.links.results) || '' }, entries: entries };
    if (old.extraStarts) raw.extraStarts = old.extraStarts;
    ensureArrays(raw);
    putDoc(roundPath(A.year, id), raw); meta.results = true; A.open = {};
  }

  /* ------------------------------------------------------------------ events & calendar */
  var LINKS = [['results', 'Official results page'], ['entryList', 'Entry list'], ['srs', 'Supplementary regulations'], ['noticeboard', 'Noticeboard (Sportity)'], ['spectatorGuide', 'Spectator guide']];
  function viewEvents() {
    var s = season(); s.events = s.events || []; s.rounds = s.rounds || [];
    var html = pageHead(A.year + ' · calendar', 'Events &amp; calendar', 'An event is one rally weekend; each day that has its own Northern Regions classification is a round. Rounds are numbered in calendar order.');
    html += '<div class="section"><div class="section-head"><h2>Events</h2></div>';
    html += s.events.map(function (ev, i) {
      ev.links = ev.links || {};
      var used = s.rounds.some(function (r) { return r.eventId === ev.id; });
      return '<div class="card"><div class="card-head"><h3>' + esc(ev.name || 'New event') + '</h3><span class="small muted">id: ' + esc(ev.id) + '</span></div><div class="form-grid">' +
        fld('Name', input(function (v) { ev.name = v; }, ev.name), '', 'span2') + fld('Short name', input(function (v) { ev.short = v; }, ev.short), 'Used on buttons and tables, e.g. “Ermelo”.') +
        fld('Dates', input(function (v) { ev.dates = v; }, ev.dates, 'placeholder="21–22 August ' + A.year + '"')) + fld('Venue', input(function (v) { ev.venue = v; }, ev.venue)) +
        fld('Surface', select(function (v) { ev.surface = v; }, ev.surface || '', [['', '—'], ['Gravel', 'Gravel'], ['Tarmac', 'Tarmac'], ['Mixed', 'Mixed']])) +
        LINKS.map(function (l) { return fld(l[1], input(function (v) { if (v.trim()) ev.links[l[0]] = v.trim(); else delete ev.links[l[0]]; }, ev.links[l[0]], 'type="url" placeholder="https://"')); }).join('') +
        '</div>' + entryListEditor(s, ev) + '<div class="actions">' + (used ? '<span class="small muted">Remove its rounds first to delete this event.</span>' : btn(function () { if (window.confirm('Delete ' + (ev.name || 'this event') + '?')) { s.events.splice(i, 1); render(); } }, 'Delete event', 'tiny ghost')) + '</div></div>';
    }).join('');
    var ne = A.newEvent || (A.newEvent = { name: '' });
    html += '<div class="card add-card"><div class="form-grid">' + fld('New event name', input(function (v) { ne.name = v; }, ne.name, 'placeholder="e.g. TRAC N4 Rally" id="neName"'), '', 'span2') + '<div class="fld">' +
      btn(function () {
        if (!ne.name.trim()) throw new Error('Type the event name first.');
        var taken = {}; s.events.forEach(function (e) { taken[e.id] = 1; });
        s.events.push({ id: uniqueId(E.slug(ne.name), taken), name: ne.name.trim(), short: ne.name.trim().replace(/\s+Rally$/i, ''), dates: '', venue: '', surface: 'Gravel', links: {} });
        A.newEvent = null; render();
      }, '+ Add event', 'primary', 'id="neBtn"') + '</div></div></div></div>';
    html += '<div class="section"><div class="section-head"><h2>Rounds</h2></div>';
    if (!s.events.length) html += '<div class="card empty">Add an event first.</div>';
    else {
      html += '<div class="table-wrap"><table class="data edit"><thead><tr><th>Round</th><th>File</th><th>Event</th><th>Day</th><th>Date</th><th>Results</th><th></th></tr></thead><tbody>' +
        s.rounds.map(function (r, i) {
          return '<tr><td><b>R' + (i + 1) + '</b></td><td class="mono small">' + esc(r.id) + '</td><td>' + select(function (v) { r.eventId = v; }, r.eventId, s.events.map(function (e) { return [e.id, e.name]; })) + '</td>' +
            '<td>' + input(function (v) { r.day = v; }, r.day, 'list="dl-days" class="wv"') + '</td><td>' + input(function (v) { r.date = v; }, r.date, 'type="date"') + '</td>' +
            '<td>' + (r.results ? '<a href="#/results/' + r.id + '">✓ Edit</a>' : '<a href="#/results/' + r.id + '">Add</a>') + '</td>' +
            '<td>' + (r.results ? '' : btn(function () { if (window.confirm('Remove round R' + (i + 1) + ' from the calendar?')) { s.rounds.splice(i, 1); render(); } }, '✕', 'tiny ghost', 'aria-label="Remove round"')) + '</td></tr>';
        }).join('') + '</tbody></table></div><datalist id="dl-days"><option value="One-day event"><option value="Day 1 (Friday)"><option value="Day 2 (Saturday)"></datalist>';
      var nr = A.newRound || (A.newRound = { eventId: s.events[s.events.length - 1].id, day: 'Day 1 (Friday)', date: '' });
      html += '<div class="card add-card"><div class="form-grid">' + fld('Event', select(function (v) { nr.eventId = v; }, nr.eventId, s.events.map(function (e) { return [e.id, e.name]; }))) +
        fld('Day', input(function (v) { nr.day = v; }, nr.day, 'list="dl-days"')) + fld('Date', input(function (v) { nr.date = v; }, nr.date, 'type="date"')) + '<div class="fld">' +
        btn(function () {
          var max = 0; s.rounds.forEach(function (r) { var n = +String(r.id).replace(/\D/g, ''); if (n > max) max = n; });
          s.rounds.push({ id: 'R' + (max + 1), eventId: nr.eventId, day: nr.day, date: nr.date });
          A.newRound = { eventId: nr.eventId, day: /Day 1/.test(nr.day) ? 'Day 2 (Saturday)' : nr.day, date: '' }; render();
        }, '+ Add round', 'primary', 'id="nrBtn"') + '</div></div><p class="small muted">New rounds go to the end of the calendar. Add them in date order.</p></div>';
    }
    return html + '</div>';
  }

  /* ------------------------------------------------------------------ competitors */
  function entryListEditor(s, ev) {
    var list = (s.entryLists || []).filter(function (l) { return l.eventId === ev.id; })[0];
    if (!list) return '<div class="actions">' + btn(function () {
      s.entryLists = s.entryLists || [];
      s.entryLists.push({ eventId: ev.id, roundIds: [], complete: false,
        source: { file: '', url: ev.links.entryList || '', date: new Date().toISOString().slice(0, 10), locator: '' }, entries: [] });
      render();
    }, 'Note an official entry list', 'tiny') + '</div>';
    var rounds = s.rounds.filter(function (r) { return r.eventId === ev.id; });
    function scope(value) {
      return rounds.map(function (r) { return check(function (v) {
        var i = value.indexOf(r.id); if (v && i < 0) value.push(r.id); else if (!v && i >= 0) value.splice(i, 1);
      }, value.indexOf(r.id) >= 0, r.id + ' · ' + r.day); }).join('');
    }
    return '<details class="entry-editor"><summary>Entry evidence · ' + list.entries.length + ' crews</summary><p class="small muted">Entry only, never a start or points. Leave round selections empty for event-only evidence. Only select days the source explicitly covers; absence from results does not prove DNS. Resolve alternate spellings in Competitors before publishing.</p><div class="form-grid">' +
      fld('Entry-list file / title', input(function (v) { list.source.file = v; }, list.source.file)) +
      fld('Entry-list URL', input(function (v) { list.source.url = v; }, list.source.url, 'type="url"')) +
      fld('Source date / retrieved', input(function (v) { list.source.date = v; }, list.source.date, 'type="date"')) +
      fld('Coverage / exclusions / locator', input(function (v) { list.source.locator = v; }, list.source.locator), 'Record supported NR field and any national/club exclusions.', 'span3') +
      '<div class="fld span3">' + check(function (v) { list.complete = v; }, list.complete, 'Complete supported NR entry-list coverage') + scope(list.roundIds) + '</div></div>' +
      list.entries.map(function (e, i) {
        return '<div class="card"><div class="form-grid">' +
          fld('Entry car', input(function (v) { e.car = v; }, e.car)) +
          fld('Entry driver', input(function (v) { e.driver = v; }, e.driver)) +
          fld('Entry co-driver', input(function (v) { e.codriver = v; }, e.codriver)) +
          fld('Printed entry class', input(function (v) { e['class'] = E.normClass(v); }, e['class'])) +
          fld('Entry vehicle', input(function (v) { e.vehicle = v; }, e.vehicle)) +
          fld('Entry status', select(function (v) { e.status = v; }, e.status, [['entered', 'Entered (start unknown)'], ['DNS', 'Official DNS'], ['withdrawn', 'Official withdrawal']])) +
          fld('Official status evidence', input(function (v) { e.statusEvidence = v; }, e.statusEvidence), 'Required for DNS or withdrawal.') +
          fld('NR membership and day evidence', input(function (v) { e.participationEvidence = v; }, e.participationEvidence)) +
          fld('Entry row locator', input(function (v) { e.locator = v; }, e.locator)) +
          '<div class="fld span3">' + scope(e.roundIds) + '</div></div>' +
          btn(function () { if (window.confirm('Remove this saved entry evidence from the draft?')) { list.entries.splice(i, 1); render(); } }, 'Remove entry', 'tiny ghost') + '</div>';
      }).join('') + '<div class="actions">' +
      btn(function () { list.entries.push({ car: '', driver: '', codriver: '', 'class': '', vehicle: '', roundIds: [],
        status: 'entered', statusEvidence: '', participationEvidence: '', locator: '' }); render(); }, '+ Add entered crew', 'tiny') +
      btn(function () { if (window.confirm('Remove this event entry list? Its evidence will be removed only after publishing.')) {
        s.entryLists = s.entryLists.filter(function (l) { return l !== list; }); render();
      } }, 'Remove entry list', 'tiny ghost') + '</div></details>';
  }
  function appearances() {
    var out = {};
    years().forEach(function (y) {
      var m; try { m = model(y); } catch (e) { return; }
      if (!m) return;
      m.people.forEach(function (p) { (out[p.id] = out[p.id] || []).push({ year: y, apps: p.apps, entries: p.entries }); });
    });
    return out;
  }
  function viewCompetitors() {
    var doc = peopleDoc(), apps = appearances(), unknown = legacyUnknownNames();
    var html = pageHead('All seasons', 'Competitors', 'One profile per person, shared by every season. Names on the official sheets are matched to a profile by its name or any of its “also printed as” spellings.',
      '<div class="actions">' + btn(function () {
        var n = window.prompt('Full name of the new competitor'); if (!n || !n.trim()) return;
        var taken = {}; doc.people.forEach(function (p) { taken[p.id] = 1; });
        var id = uniqueId(E.slug(n), taken); doc.people.push({ id: id, name: n.trim(), aliases: [], bio: '', photo: '', links: {} });
        doc.people.sort(function (a, b) { return a.name.localeCompare(b.name); }); go('#/competitor/' + id);
      }, '+ Add competitor', 'primary') + '</div>');
    html += entryIdentityNotice();
    if (unknown.length) html += '<div class="callout"><div><b>' + unknown.length + ' classification-only name' + (unknown.length === 1 ? '' : 's') + ' not in the list yet:</b> ' + esc(unknown.join(', ')) + '. These legacy result names are added automatically when you publish. If one is another spelling of an existing competitor, open that competitor and add it under “also printed as”. ' + btn(function () { addPeople(unknown); render(); }, 'Add them now', 'tiny') + '</div></div>';
    html += '<div class="filters"><label class="sr-only" for="pSearch">Search competitors</label><input id="pSearch" class="search" type="search" placeholder="Search names…" autocomplete="off" data-k="' + K(function (v) {
      v = v.trim().toLowerCase(); Array.prototype.forEach.call(document.querySelectorAll('#pTable tbody tr'), function (tr) { tr.hidden = !!v && tr.getAttribute('data-s').indexOf(v) < 0; });
    }) + '"></div>';
    html += '<div class="table-wrap"><table class="data" id="pTable"><thead><tr><th>Name</th><th>Also printed as</th><th class="num">Starts listed</th><th>Seasons</th><th>Profile</th></tr></thead><tbody>' +
      doc.people.map(function (p) {
        var a = apps[p.id] || [], n = 0; a.forEach(function (s) { n += s.apps.filter(function (app) { return app.credited && app.status !== 'DNS'; }).length; });
        var prof = [p.photo ? 'photo' : '', p.bio ? 'bio' : '', p.links && Object.keys(p.links).length ? 'links' : ''].filter(Boolean).join(', ');
        return '<tr data-s="' + esc((p.name + ' ' + (p.aliases || []).join(' ')).toLowerCase()) + '"><td><a href="#/competitor/' + encodeURIComponent(p.id) + '"><b>' + esc(p.name) + '</b></a></td><td class="small">' + esc((p.aliases || []).join(', ')) + '</td><td class="num">' + n + '</td><td>' + a.map(function (s) { return s.year; }).join(', ') + '</td><td class="small muted">' + (prof || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }
  var SOCIALS = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['x', 'X'], ['website', 'Website']];
  function viewCompetitor(id) {
    var doc = peopleDoc(), p = doc.people.filter(function (x) { return x.id === id; })[0];
    if (!p) return '<div class="card empty"><h2>Competitor not found</h2><p><a href="#/competitors">Back to competitors</a></p></div>';
    p.aliases = p.aliases || []; p.links = p.links || {};
    var s = season(); s.classMap = s.classMap || { drivers: {}, codrivers: {} }; s.classMap.drivers = s.classMap.drivers || {}; s.classMap.codrivers = s.classMap.codrivers || {};
    var apps = appearances()[id] || [];
    var bin = A.bins[photoPath(id)], photoSrc = '';
    if (bin && !bin.deleted) photoSrc = 'data:image/jpeg;base64,' + bin.b64;
    else if (/^db:/.test(p.photo || '')) {
      var pid = p.photo.slice(3);
      if (A.photoCache[pid]) photoSrc = 'data:image/jpeg;base64,' + A.photoCache[pid];
      else if (A.photoCache[pid] === undefined) photoB64(pid).then(function (b) { if (b && route().view === 'competitor') render(); });
    } else if (/^https:/.test(p.photo || '')) photoSrc = p.photo;
    var html = '<p class="crumbs"><a href="#/competitors">← Competitors</a></p>' + pageHead('Competitor · id ' + esc(id), esc(p.name), 'The id stays the same if you rename someone, so links to their profile keep working.');
    html += '<div class="grid grid-2 top"><div class="card"><h3>Profile</h3><div class="form-grid one">' +
      fld('Name shown on the site', input(function (v) { p.name = v; }, p.name)) +
      fld('Also printed as', area(function (v) { p.aliases = lines(v); }, p.aliases.join('\n'), 'rows="3"'), 'Other spellings used on official sheets, one per line, such as initials or an alternative surname spelling. Results printed with these names count for this person.') +
      fld('Short bio', area(function (v) { p.bio = v.trim(); }, p.bio, 'rows="4" maxlength="700"'), 'A few lines: car, club, years rallying. Only publish what the competitor is happy to share.') +
      '</div></div><div class="card"><h3>Photo</h3><div class="photo-edit">' + (photoSrc ? '<img src="' + esc(photoSrc) + '" alt="">' : '<div class="avatar ph">' + esc(p.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')) + '</div>') +
      '<div>' + fileIn(async function (files) {
        var b64 = await imageToJpegB64(files[0], 640); A.bins[photoPath(id)] = { b64: b64, deleted: false }; p.photo = 'db:' + id; render(); toast('Photo added (resized to 640 px). It\'s uploaded when you publish.', 'good');
      }, 'image/*', p.photo ? 'Replace photo' : 'Upload photo') + (p.photo ? btn(function () { if (/^db:/.test(p.photo)) stageRemove(photoPath(p.photo.slice(3))); p.photo = ''; render(); }, 'Remove', 'tiny ghost') : '') +
      '<p class="small muted">Use a photo you have permission to publish. It is resized in your browser before uploading.</p></div></div>' +
      '<h3 style="margin-top:16px">Links</h3><div class="form-grid">' + SOCIALS.map(function (sx) { return fld(sx[1], input(function (v) { if (v.trim()) p.links[sx[0]] = v.trim(); else delete p.links[sx[0]]; }, p.links[sx[0]], 'type="url" placeholder="https://"')); }).join('') + '</div></div></div>';
    html += '<div class="card"><h3>' + A.year + ' class</h3><p class="small muted" style="margin-top:4px">The class this person is scored in for the whole ' + A.year + ' season. Leave on “as printed” to use the class on each sheet. Set it when the sheet and the championship disagree.</p><div class="form-grid">' +
      fld('As a driver', select(function (v) { if (v) s.classMap.drivers[id] = v; else delete s.classMap.drivers[id]; }, s.classMap.drivers[id] || '', classOpts('As printed on each sheet'))) +
      fld('As a co-driver', select(function (v) { if (v) s.classMap.codrivers[id] = v; else delete s.classMap.codrivers[id]; }, s.classMap.codrivers[id] || '', classOpts('Same as their driver'))) + '</div></div>';
    html += '<div class="card"><h3>Results listed</h3>' + (apps.length ? apps.map(function (sx) {
      return '<p class="small"><b>' + sx.year + ':</b> ' + sx.apps.map(function (a) { return esc(a.r) + ' car ' + esc(a.car) + ' (' + (a.status === 'classified' ? 'P' + a.pos : esc(a.status)) + (a.pts != null ? ', ' + a.pts + ' pts' : '') + ')'; }).join(' · ') + '</p>';
    }).join('') : '<p class="muted">None yet.</p>') + '</div>';
    var others = doc.people.filter(function (x) { return x.id !== id; });
    var mg = A.merge && A.merge.id === id ? A.merge : (A.merge = { id: id, other: '' });
    html += '<div class="card"><h3>Merge a duplicate into ' + esc(p.name) + '</h3><p class="small muted">If the same person has two profiles (two spellings), merge the other one into this one. Its name and spellings become “also printed as” names here and the other profile is removed.</p><div class="form-grid">' +
      fld('Duplicate profile', select(function (v) { mg.other = v; }, mg.other, [['', 'Choose…']].concat(others.map(function (x) { return [x.id, x.name]; })))) + '<div class="fld">' +
      btn(function () {
        var o = doc.people.filter(function (x) { return x.id === mg.other; })[0]; if (!o) throw new Error('Choose the duplicate profile first.');
        var membershipMoves = [];
        years().forEach(function (y) {
          var se = season(y), rs = se && se.rallyesport, review = rs && rs.membershipReview;
          if (!review) return;
          if (typeof review !== 'object' || Array.isArray(review) || !review.people ||
            typeof review.people !== 'object' || Array.isArray(review.people)) {
            throw new Error('The saved RallyeSport membership review is malformed. Repair it before merging profiles.');
          }
          var oldDecision = review.people[o.id], targetDecision = review.people[id];
          if (oldDecision && targetDecision && JSON.stringify(oldDecision) !== JSON.stringify(targetDecision)) {
            throw new Error('The profiles have conflicting RallyeSport membership decisions. Resolve them before merging.');
          }
          if (oldDecision) membershipMoves.push({ review: review, oldDecision: oldDecision });
        });
        if (!window.confirm('Merge ' + o.name + ' into ' + p.name + '?')) return;
        [o.name].concat(o.aliases || []).forEach(function (n) { if (n !== p.name && p.aliases.indexOf(n) < 0) p.aliases.push(n); });
        if (!p.bio && o.bio) p.bio = o.bio; if (!p.photo && o.photo) p.photo = o.photo;
        Object.keys(o.links || {}).forEach(function (k) { if (!p.links[k]) p.links[k] = o.links[k]; });
        years().forEach(function (y) {
          var se = season(y); if (!se) return;
          if (se.classMap) ['drivers', 'codrivers'].forEach(function (k) {
            var cm = se.classMap[k] || {};
            if (cm[o.id] && !cm[id]) cm[id] = cm[o.id];
            delete cm[o.id];
          });
          if (se.rallyesport) {
            var rs = se.rallyesport;
            if (rs.membershipReview && rs.membershipReview.people) {
              if (!rs.membershipReview.people[id] && rs.membershipReview.people[o.id]) {
                rs.membershipReview.people[id] = membershipMoves.filter(function (move) { return move.review === rs.membershipReview; })[0].oldDecision;
              }
              delete rs.membershipReview.people[o.id];
            }
            (rs.results || []).forEach(function (result) {
              (result.entries || []).forEach(function (entry) {
                var identity = entry.identityReview;
                if (!identity) return;
                if (identity.driverId === o.id) identity.driverId = id;
                if (identity.codriverId === o.id) identity.codriverId = id;
              });
            });
            if (Array.isArray(rs.nonScoringPeople)) {
              var people = rs.nonScoringPeople, oldIndex = people.indexOf(o.id);
              if (oldIndex >= 0) {
                if (people.indexOf(id) < 0) people.push(id);
                rs.nonScoringPeople = people.filter(function (personId) { return personId !== o.id; });
              }
            }
          }
        });
        doc.people.splice(doc.people.indexOf(o), 1); A.merge = null; toast('Merged. Publish to make it live.', 'good'); render();
      }, 'Merge') + '</div></div></div>';
    html += '<div class="card danger"><h3>Delete profile</h3><p class="small">' + (apps.length ? 'This person appears in results, so their profile would simply be re-created from the sheets. Merge instead if it\'s a duplicate.' : 'Removes the profile.') + '</p>' +
      (apps.length ? '' : btn(function () { if (!window.confirm('Delete ' + p.name + '?')) return; doc.people.splice(doc.people.indexOf(p), 1); if (/^db:/.test(p.photo || '')) stageRemove(photoPath(p.photo.slice(3))); go('#/competitors'); }, 'Delete', 'bad')) + '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ season settings */
  function listEditor(arr, fields, addLabel, blank) {
    return arr.map(function (item, i) {
      return '<div class="form-grid tight bordered">' + fields.map(function (f) { return f(item, i); }).join('') + '<div class="fld">' + btn(function () { arr.splice(i, 1); render(); }, 'Remove', 'tiny ghost') + '</div></div>';
    }).join('') + '<div class="actions">' + btn(function () { arr.push(blank()); render(); }, addLabel) + '</div>';
  }
  function rallyeSportData(s) {
    var data = s.rallyesport || { events: [], results: [] };
    if (!Array.isArray(data.events) || !Array.isArray(data.results) ||
      data.nonScoringPeople != null && !Array.isArray(data.nonScoringPeople)) {
      throw new Error('RallyeSport data is malformed. Review the saved season document before editing; unsupported fields are not normalized automatically.');
    }
    return data;
  }
  function copyReviewedRsTimes(result, y) {
    if (!result.nrRoundId) throw new Error('Choose an explicitly linked NR round first.');
    var nr = rawRound(result.nrRoundId, y);
    if (!nr) throw new Error('The linked NR round has no source-backed results.');
    if (!(result.entries || []).length) throw new Error('Add RS classification rows before copying times.');
    var preview = E.copyReviewedRallyeSportTimes(result, nr, peopleDoc()), report = preview.report;
    function examples(items, render) { return items.slice(0, 5).map(render).join('; ') + (items.length > 5 ? '; and ' + (items.length - 5) + ' more' : ''); }
    var message = 'Review mapped NR times before applying this independent RS snapshot.\n\n' +
      'New blank RS times to copy: ' + report.copied.filter(function (item) { return !item.unchanged; }).length +
      '\nAlready identical: ' + report.copied.filter(function (item) { return item.unchanged; }).length +
      '\nConflicting existing RS times (left unchanged): ' + report.conflicts.length +
      '\nMissing mapped NR observations (left unchanged): ' + report.missing.length +
      '\nUnmatched RS-only/unresolved crews (preserved): ' + report.unmatched.length +
      '\nNR DNS rows skipped: ' + report.skippedDns.length;
    if (report.conflicts.length) message += '\n\nConflicts: ' + examples(report.conflicts, function (item) {
      return 'car ' + item.car + ' ' + item.stage + ' RS=' + item.rsValue + ', NR=' + item.nrValue;
    });
    if (report.missing.length) message += '\n\nMissing: ' + examples(report.missing, function (item) { return 'car ' + item.car + ' ' + item.stage; });
    if (report.unmatched.length) message += '\n\nUnmatched: ' + examples(report.unmatched, function (item) { return 'car ' + item.car + ' (' + item.reason + ')'; });
    message += '\n\nApply only new values into blank RS cells? Existing RS evidence and all RS status/class/order/penalty/points remain unchanged.';
    if (!window.confirm(message)) return;
    result.entries = preview.entries;
    var added = report.copied.filter(function (item) { return !item.unchanged; }).length;
    toast(added ? 'Copied ' + added + ' reviewed blank RS stage value(s); existing conflicts were preserved.' :
      'No RS times changed; conflicts, missing values and unmatched rows were preserved.', added ? 'good' : 'warn');
  }
  function rsNav(items, selected, label) {
    return '<nav class="rs-work-nav" aria-label="' + esc(label) + '">' + items.map(function (item) {
      return '<a href="' + item[0] + '"' + (item[2] === selected ? ' class="on" aria-current="page"' : '') + '>' + esc(item[1]) + '</a>';
    }).join('') + '</nav>';
  }
  function rsPane(id, selected, title) {
    return '<section class="rs-pane" aria-label="' + esc(title) + '"' + (id === selected ? '' : ' hidden') + '>';
  }
  ROOT.addEventListener('toggle', function (ev) {
    var id = ev.target.getAttribute && ev.target.getAttribute('data-rs-disclosure');
    if (id) A.open[id] = ev.target.open;
  }, true);
  function filterRsMembers(query) {
    A.rsMemberQuery = query;
    var needle = query.trim().toLowerCase(), count = 0;
    ROOT.querySelectorAll('[data-rs-person]').forEach(function (item) {
      item.hidden = item.getAttribute('data-rs-person').indexOf(needle) < 0;
      if (!item.hidden && item.classList.contains('rs-member')) count++;
    });
    var status = document.getElementById('rsMemberSearchStatus');
    if (status) status.textContent = count + ' matching profiles';
  }
  ROOT.addEventListener('input', function (ev) { if (ev.target.id === 'rsMemberSearch') filterRsMembers(ev.target.value); });
  function viewRallyeSport() {
    var s = season(), data = rallyeSportData(s), built = model(A.year), scoring = built.rallyesport.scoring;
    var r = route(), section = ['events', 'setup', 'eligibility', 'checks'].indexOf(r.a) >= 0 ? r.a : 'events';
    var entryPolicy = E.rallyeSportEntryPolicy(data);
    var pane = ['event', 'source', 'stages', 'rows', 'preview'].indexOf(r.c) >= 0 ? r.c : 'event';
    var review = data.membershipReview && typeof data.membershipReview === 'object' && !Array.isArray(data.membershipReview) ?
      data.membershipReview : { sourceDate: '2026-11-09', reviewed: false, evidence: '', people: {} };
    var reviewPeople = review.people && typeof review.people === 'object' && !Array.isArray(review.people) ? review.people : {};
    var html = pageHead(A.year + ' · independent competition', 'RallyeSport', 'One task at a time. Edits stay in your working draft across these sections until Review & publish.');
    html += rsNav([['#/rallyesport/events', 'Events & results', 'events'], ['#/rallyesport/setup', 'Season setup', 'setup'],
      ['#/rallyesport/eligibility', 'People & eligibility', 'eligibility'], ['#/rallyesport/checks', 'Scoring checks', 'checks']], section, 'RallyeSport workspace');
    html += '<div class="rs-context"><span><b>' + data.events.length + ' RS events</b> · Scoring: ' + esc(scoring.status) + '</span><a href="#/logic/rs/rs-scope">Explore RS processing logic</a></div>';
    if (section === 'setup' || section === 'eligibility') html += '<details class="card"><summary><b>Eligibility &amp; unresolved rule boundaries</b></summary><p>' +
      (entryPolicy ? 'The user-confirmed entry-based policy qualifies both crew roles without membership, licence, invitation or season manual exclusions. DNS earns no points; a DNF needs start evidence for zero points. Only RS2/RS4 score. Printed TEST evidence is retained only with a reviewed launch-only RS0 exception. The four-round championship remains provisional; this is not a printed SSR amendment. Legacy private membership evidence is retained, not marked verified or used for scoring. ' :
        'Legacy policy: only a reviewed, person-matched 2026 membership decision can establish eligibility. Missing or ambiguous records are unverified and score as RS0, not as confirmed non-members. Drivers and co-drivers are assessed separately; an excluded person does not change their partner’s scoring order. ') +
      'Source classes, official positions, times and finish order stay unchanged. NR data and calculations are unchanged. SSR 7.5 specifies stage-time round tie-breaks, but this app does not recompute tied official positions. Finisher qualification and season tie-break order remain unresolved.</p>' +
      (A.mode === 'demo' ? '<p>Demo data is a public projection: its published scoring snapshot is removed before private validation. Member, invitation and starter-count inputs are not public, so this demo cannot reconstruct eligibility or reproduce the published scoring calculation.</p>' : '') + '</details>';
    if (section === 'setup') {
    if (A.year === 2026) html += '<div class="card"><h3>RS eligibility policy</h3><div class="form-grid">' +
      fld('Scoring policy', select(function (v) {
        s.rallyesport = data;
        if (v === 'entry-based-2026-v1') {
          if (!entryPolicy) data.eligibilityPolicy = { code: v, reviewed: true, evidence: '' };
        }
        else delete data.eligibilityPolicy;
      }, entryPolicy ? 'entry-based-2026-v1' : '',
        [['', 'Legacy reviewed membership policy'], ['entry-based-2026-v1', 'User-confirmed entry-based 2026 policy']], 'data-rerender'),
        'Changing this draft does not publish. No blanket verification or membership-map rewrite is performed.', 'span2') +
      fld('Private entry-based policy evidence', area(function (v) {
        if (data.eligibilityPolicy) data.eligibilityPolicy.evidence = v;
      }, data.eligibilityPolicy && data.eligibilityPolicy.evidence || '', 'rows="3" maxlength="1000"' + (entryPolicy ? '' : ' disabled')),
        'Record the user decision, not a claim that SSR 6.1 was amended. Required before scoring/publication.', 'span2') + '</div></div>';
    html += '<div class="card"><h3>Ruleset evidence</h3>';
    if (A.year === 2026) {
      html += '<p class="small">The supported profile is the 2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint, Version 1, issued 9 July 2026. SSR 1.2 limits it to calendar year 2026. It is not a default for other RS events or seasons.</p>' +
        '<p><a href="https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf" target="_blank" rel="noopener">Open official SSR PDF ↗</a></p>' +
        btn(function () {
          s.rallyesport = data;
          data.ruleset = { code: 'clubman-sprint-2026-v1', year: 2026, title: '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint',
            version: 1, issueDate: '2026-07-09', sourceUrl: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-RallyeSport-Association-SSRs-V1.pdf' };
          render();
        }, data.ruleset ? 'Re-select verified 2026 SSR V1' : 'Use verified 2026 SSR V1', 'tiny');
    } else {
      html += '<p class="small">No scoring rules are configured for ' + A.year + '. Do not copy the 2026 profile into another year without applicable regulations.</p>';
      if (Object.prototype.hasOwnProperty.call(data, 'starterMinimumReview')) {
        html += '<div class="callout warn"><div><b>Unsupported 2026-only starter review</b><p>This review cannot configure ' + A.year + ' RS scoring. Remove it before publishing this season.</p>' +
          btn(function () {
            s.rallyesport = data;
            delete data.starterMinimumReview;
            render();
          }, 'Remove 2026-only review', 'tiny ghost') + '</div></div>';
      }
    }
    html += '</div>';
    if (A.year === 2026) {
      var starterReview = data.starterMinimumReview;
      var reviewedSix = starterReview && typeof starterReview === 'object' && starterReview.minimum === 6;
      html += '<div class="card"><h3>2026 RS event starter threshold</h3>' +
        '<p class="small">SSR 7.3 in the published 2026 SSR V1 says 15 event starters. A six-starter value is a separate user-reported review, not wording in that document; no written amendment has been supplied. This review applies only to 2026 RallyeSport and is kept as private evidence.</p>' +
        '<div class="form-grid">' +
        fld('Threshold used for RS event points', select(function (v) {
          s.rallyesport = data;
          if (v === 'six') {
            if (!reviewedSix) data.starterMinimumReview = { minimum: 6, reviewed: true, evidence: '' };
          } else delete data.starterMinimumReview;
        }, reviewedSix ? 'six' : 'ssr-v1',
          [['ssr-v1', 'Published SSR V1 baseline — 15 starters'], ['six', 'User-reported 2026 review — 6 starters']], 'data-rerender'),
          'The baseline applies when no review is recorded. Select six only with an evidence note; malformed or evidence-free reviews block scoring.', 'span2') +
        fld('Six-starter review evidence', area(function (v) {
          s.rallyesport = data;
          if (data.starterMinimumReview && typeof data.starterMinimumReview === 'object') data.starterMinimumReview.evidence = v;
        }, reviewedSix && typeof starterReview.evidence === 'string' ? starterReview.evidence : '',
          'rows="3"' + (reviewedSix ? '' : ' disabled')),
          'Record the provenance of the user-reported confirmation and state that no written amendment was supplied. Do not describe six as text of SSR V1.', 'span2') +
        '</div></div>';
    }
    }
    if (section === 'eligibility' && entryPolicy) {
      html += '<div class="card"><h3>Entry-based driver and co-driver eligibility</h3><p>Every championship entrant qualifies in RS2 or RS4. Membership, licence, invitation and legacy manual exclusions no longer remove either role or re-rank the field. Identity reviews still resolve stable profiles; unknown classes/statuses require an explicit supported decision. DNS and DNF start-evidence rules still apply.</p><p>Legacy membership decisions and manual exclusions are preserved privately for recovery but are inactive under this policy. They are not verified by selecting this policy. The launch-only TEST-to-RS0 review belongs on that event’s source row, never on a person’s season record.</p></div>';
    }
    if (section === 'eligibility' && !entryPolicy) {
    html += '<div class="card"><label class="fld"><span class="fl">Find a person</span><input id="rsMemberSearch" type="search" value="' + esc(A.rsMemberQuery || '') +
      '" placeholder="Search shared profile names" aria-describedby="rsMemberSearchStatus"></label><p class="small" id="rsMemberSearchStatus" role="status"></p></div>';
    liveRefresh = function () { filterRsMembers(A.rsMemberQuery || ''); };
    if (A.year === 2026) {
      var people = peopleDoc().people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      var memberStatuses = [
        ['unverified', 'Unverified — pending review'],
        ['eligible', 'Eligible — complete profile and both membership fields'],
        ['non-member', 'Confirmed non-member'],
        ['missing-license', 'Licence evidence missing — not a non-member determination'],
        ['missing-membership-reference', 'Membership reference missing — not a non-member determination'],
        ['profile-incomplete', 'Profile not complete — eligibility not established']
      ];
      html += '<div class="card"><h3>2026 RS membership eligibility review</h3>' +
        '<p class="small">Review each person independently. Unknown or ambiguous evidence means unverified, not confirmed non-membership. Never enter licence/member numbers or workbook contents here.</p>' +
        '<details class="rs-help"><summary>Roster review procedure &amp; evidence requirements</summary><p class="small">Apply the reviewed 9 November 2026 roster retrospectively to all 2026 RS rounds. Mark a person eligible only when a matching Profile Complete record has both a licence number and membership reference. Active, Inactive and Invite Pending account labels do not change this rule. A qualifying complete match takes precedence over an incomplete duplicate. Unknown, unmatched or ambiguous people remain unverified. The exact user-confirmed eligibility corrections are recorded as private per-person overrides with their own provenance; do not relabel them as workbook corrections.</p></details>' +
        '<div class="form-grid">' +
        fld('Roster review date', '<input value="2026-11-09" readonly aria-label="Roster review date">', 'Source date for the privately reviewed membership sheet.') +
        fld('Review state', select(function (v) {
          data.membershipReview = review;
          review.reviewed = v === 'true';
        }, review.reviewed === true ? 'true' : 'false', [['false', 'Not confirmed'], ['true', 'Reviewed and confirmed']], 'data-rerender')) +
        fld('Private source provenance', area(function (v) {
          data.membershipReview = review;
          review.sourceDate = '2026-11-09';
          review.evidence = v;
        }, review.evidence || '', 'rows="2" maxlength="1000"'),
          'Describe the private review source without copying identifiers or workbook contents.', 'span2') +
        '</div><div class="rs-member-list">' +
        people.map(function (person) {
          var decision = reviewPeople[person.id] || { status: 'unverified', basis: 'membership-sheet' };
          return '<div class="rs-member" data-rs-person="' + esc(person.name.toLowerCase()) + '"><h4>' + esc(person.name) + '</h4><div class="form-grid tight">' + fld('Eligibility outcome',
            select(function (v) {
              data.membershipReview = review;
              review.sourceDate = '2026-11-09';
              review.people = reviewPeople;
              reviewPeople[person.id] = reviewPeople[person.id] || { basis: 'membership-sheet' };
              reviewPeople[person.id].status = v;
            }, memberStatuses.some(function (item) { return item[0] === decision.status; }) ? decision.status : 'unverified',
              memberStatuses, 'data-rerender aria-label="Membership eligibility for ' + esc(person.name) + '"')) + fld('Decision basis',
            select(function (v) {
              data.membershipReview = review;
              review.sourceDate = '2026-11-09';
              review.people = reviewPeople;
              reviewPeople[person.id] = reviewPeople[person.id] || { status: 'unverified' };
              reviewPeople[person.id].basis = v;
              if (v !== 'user-confirmed') delete reviewPeople[person.id].evidence;
            }, decision.basis === 'user-confirmed' ? 'user-confirmed' : 'membership-sheet',
              [['membership-sheet', 'Reviewed roster decision'], ['user-confirmed', 'User-confirmed override']],
              'data-rerender aria-label="Decision basis for ' + esc(person.name) + '"')) +
            fld('Private override provenance', area(function (v) {
              data.membershipReview = review;
              review.sourceDate = '2026-11-09';
              review.people = reviewPeople;
              reviewPeople[person.id] = reviewPeople[person.id] || { status: 'unverified', basis: 'user-confirmed' };
              if (reviewPeople[person.id].basis === 'user-confirmed') reviewPeople[person.id].evidence = v;
            }, decision.basis === 'user-confirmed' ? decision.evidence || '' : '',
              'rows="2" maxlength="1000" aria-label="Private override provenance for ' + esc(person.name) + '"' +
                (decision.basis === 'user-confirmed' ? '' : ' disabled'))) +
            '</div></div>';
        }).join('') + '</div>' +
        '<p class="small muted">Unlisted stable profile IDs remain unverified and non-scoring until reviewed. A manual RS exclusion below is independent and is never removed or overridden by this roster map.</p></div>';
    }
    html += '<div class="card"><h3>Manual RS scoring exclusions</h3><p class="small muted">This legacy season-scoped admin override remains independent of the membership roster. It excludes only the selected person’s RS points; it never changes NR records or the membership decision. A manual exclusion is not itself proof that a person is a non-member.</p>' +
      (peopleDoc().people.length ? '<div class="chk-row">' + peopleDoc().people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (person) {
        return '<div class="rs-exclusion" data-rs-person="' + esc(person.name.toLowerCase()) + '">' + check(function (on) {
          s.rallyesport = data;
          data.nonScoringPeople = data.nonScoringPeople || [];
          var i = data.nonScoringPeople.indexOf(person.id);
          if (on && i < 0) data.nonScoringPeople.push(person.id);
          if (!on && i >= 0) data.nonScoringPeople.splice(i, 1);
        }, (data.nonScoringPeople || []).indexOf(person.id) >= 0, esc(person.name) + ' — Manual RS scoring exclusion', 'data-rerender') + '</div>';
      }).join('') + '</div>' : '<p class="small">Add reviewed shared identities in Competitors before scoring results.</p>') + '</div>';
    }
    if (section === 'checks') {
    var hasInvalidStarterReview = Object.prototype.hasOwnProperty.call(data, 'starterMinimumReview') && !scoring.starterMinimum;
    var starterRequirement = A.year !== 2026 ? 'no event starter minimum is configured for this year' :
      hasInvalidStarterReview ? 'a valid, evidence-backed 2026 minimum (the current review is invalid, so scoring is withheld)' :
      !scoring.starterMinimum ? 'the published SSR V1 baseline of 15, when that profile is selected' :
    (scoring.starterMinimum.minimum + ' source-backed starters overall; DNS does not count (' +
        (scoring.starterMinimum.basis === 'user-reported-review' ?
          'the six-starter value is a user-reported review, not text in SSR V1; no written amendment is supplied' :
          'the published SSR V1 baseline of 15 applies') + ')');
    html += '<div class="card"><h3>Championship scoring state</h3><p><b>' + esc(scoring.status) + '</b> — ' + esc(scoring.reason || '') + '</p><p class="small muted">Official RS event classifications remain displayable even when event scoring is blocked or the overall championship is incomplete. Event points require ' + esc(starterRequirement) + ', confirmed event applicability, ' + (entryPolicy ? 'entry-based eligibility in RS2/RS4' : 'explicit invitation status and reviewed membership eligibility') + ', reviewed competitor identities, and either source-confirmed finality or an evidence-backed user finality review. A user review never changes printed source wording or proves a technical check was completed. An evidenced DNF counts as a starter and an eligible role gets zero points. A reviewed event total may satisfy the event threshold but does not prove an individual DNF started; without row start evidence its eligible points remain unavailable. Eligible event points do not establish final championship eligibility or a champion.</p></div>';
    var rsIssues = E.validateRallyeSport(data, s, Object.fromEntries((s.rounds || []).map(function (round) { return [round.id, rawRound(round.id)]; })), peopleDoc());
    html += '<div class="card"><h3>Validation before publishing</h3>' + (rsIssues.length ? aiIssues(rsIssues.map(function (issue) { return issue.msg; })) : '<p class="ok-line">No RS data validation errors.</p>') +
      '<p class="small muted">Data validation and scoring readiness are separate checks. Review &amp; publish still runs the complete dataset validation.</p></div>';
    html += '<div class="rs-event-list">' + data.events.map(function (event) {
      var score = (scoring.results || []).filter(function (row) { return row.eventId === event.id; })[0];
      return '<a class="card rs-event-link" href="#/rallyesport/events/' + encodeURIComponent(event.id) + '/preview"><b>' + esc(event.name) + '</b><span>' +
        esc(score ? score.status + ' — ' + (score.reason || 'Event points available') : 'No event score available — ' + (scoring.reason || 'Review the scoring inputs')) + '</span></a>';
    }).join('') + '</div>';
    }
    if (section !== 'events') return html;
    html += '<div class="section"><div class="section-head"><h2>Independent RS events</h2>' + btn(function () {
      s.rallyesport = data;
      var id = uniqueId('rs-event-' + A.year, Object.fromEntries(data.events.map(function (e) { return [e.id, true]; })));
      data.events.push({ id: id, name: 'New RallyeSport event', dates: '' });
      go('#/rallyesport/events/' + encodeURIComponent(id));
    }, '+ Add RS event') + '</div>';
    if (!data.events.length) html += '<div class="card empty">No RS events are recorded for this season. Adding an RS event does not require adding an NR event.</div>';
    var eventList = '<div class="rs-event-list">' + data.events.map(function (event) {
      var result = data.results.filter(function (row) { return row.eventId === event.id; })[0];
      return '<a class="card rs-event-link' + (r.b === event.id ? ' on' : '') + '" href="#/rallyesport/events/' + encodeURIComponent(event.id) + '"' +
        (r.b === event.id ? ' aria-current="page"' : '') + '><b>' + esc(event.name || event.id) + '</b><span>' +
        esc((event.countsForChampionship === false ? 'Non-scoring event · not a championship round' : event.roundNumber == null ? 'Round not assigned' : 'RS round ' + event.roundNumber) + ' · ' + (result ? result.entries.length + ' source rows' : 'No classification')) + '</span></a>';
    }).join('') + '</div>';
    if (!r.b) return html + eventList + '<p class="small muted">Choose an event to edit its evidence, stages or classification. Season-wide settings and membership reviews are in their own sections above.</p></div>';
    if (!data.events.some(function (event) { return event.id === r.b; })) return html + eventList + '<div class="card empty">This RS event is not in the selected season. Choose an event above.</div></div>';
    html += '<div class="rs-event-switch"><a href="#/rallyesport/events">All RS events</a>' +
      fld('Selected RS event', select(function (id) { go('#/rallyesport/events/' + encodeURIComponent(id) + '/' + pane); },
        r.b, data.events.map(function (event) { return [event.id, event.name || event.id]; }), 'id="rsEventSwitch"')) + '</div>';
    html += data.events.map(function (event, eventIndex) {
      if (event.id !== r.b) return '';
      var result = data.results.filter(function (r) { return r.eventId === event.id; })[0];
      var nrRoundChoices = [['', 'Standalone RS event (no NR round)']].concat((s.rounds || []).map(function (round) { return [round.id, round.id + ' · ' + ((eventById(round.eventId, A.year) || {}).name || round.eventId)]; }));
      var stages = result ? result.stages || [] : [];
      var nrRaw = result && result.nrRoundId ? rawRound(result.nrRoundId, A.year) : null;
      var scoreRow = result && (scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0];
      var sourceCategories = Object.create(null);
      (result && result.entries || []).forEach(function (entry) {
        var category = String(entry['class'] || '').replace(/\s+/g, '').toUpperCase();
        if ((entryPolicy || entry.status === 'classified') && category && ['RS2', 'RS4', 'TEST'].indexOf(category) < 0) sourceCategories[category] = entry['class'];
      });
      var eventPath = '#/rallyesport/events/' + encodeURIComponent(event.id);
      return '<article class="card rs-editor"><div class="section-head"><h3>' + esc(event.name || event.id) + '</h3>' + btn(function () {
        if (!window.confirm('Remove this RS event and its independent classification?')) return;
        s.rallyesport = data;
        data.events.splice(eventIndex, 1);
        data.results = data.results.filter(function (r) { return r.eventId !== event.id; });
        go('#/rallyesport/events');
      }, 'Remove event', 'tiny ghost') + '</div>' +
        rsNav([['event', 'Event & evidence'], ['source', 'Classification source'], ['stages', 'Stages & reuse'], ['rows', 'Crew rows'], ['preview', 'Points preview']].map(function (item) {
          return [eventPath + '/' + item[0], item[1], item[0]];
        }), pane, 'Selected RS event tasks') + rsPane('event', pane, 'RS event and scoring evidence') + '<div class="form-grid">' +
        fld('RS event name', input(function (v) { event.name = v; }, event.name, 'maxlength="200"')) +
        fld('Dates as printed', input(function (v) { event.dates = v; }, event.dates || '', 'maxlength="200"')) +
        fld('RS round number (optional)', input(function (v) { event.roundNumber = numOrNull(v); }, event.roundNumber, 'inputmode="numeric" min="1"'), 'Independent RS numbering; never derived from an NR round.') +
        fld('Event start date (SSR 7.2 check)', input(function (v) { event.startDate = v || undefined; }, event.startDate || '', 'type="date"'), 'Required only for a double-points event.') +
        fld('Optional associated NR event', select(function (v) { if (v) event.nrEventId = v; else delete event.nrEventId; }, event.nrEventId || '',
          [['', 'No NR event association']].concat((s.events || []).map(function (ev) { return [ev.id, ev.name || ev.id]; })))) +
        fld('SSR applicability for this event', select(function (v) { event.rulesetConfirmed = v === '' ? undefined : v === 'true'; }, event.rulesetConfirmed == null ? '' : String(event.rulesetConfirmed),
          [['', 'Unconfirmed'], ['true', 'Confirmed for selected SSRs'], ['false', 'Not governed by selected SSRs']], 'data-rerender')) +
        fld('Applicability evidence', input(function (v) { event.rulesetEvidence = v; }, event.rulesetEvidence || '', 'maxlength="1000"'), 'For example, the event-specific confirmation and document locator.', 'span2') +
        fld('Championship status', select(function (v) { event.countsForChampionship = v === '' ? undefined : v === 'true'; }, event.countsForChampionship == null ? '' : String(event.countsForChampionship),
          [['', 'Unconfirmed'], ['true', 'Counts toward championship'], ['false', 'Event only; not a championship round']], 'data-rerender')) +
        fld('Championship evidence', input(function (v) { event.championshipEvidence = v; }, event.championshipEvidence || '', 'maxlength="1000"'), '', 'span2') +
        fld('Reviewed event starter count (optional)', input(function (v) { event.starterCount = numOrNull(v); }, event.starterCount, 'inputmode="numeric" min="0"'), 'Count all source-confirmed starters; DNS does not count. A DNF row still needs actual start evidence. Legacy TEST evidence is not a supported championship status under the entry-based policy.', 'span2') +
        fld('Event starter-count evidence', input(function (v) { event.starterCountEvidence = v; }, event.starterCountEvidence || '', 'maxlength="1000"'), 'Record the source and locator for the reviewed total.', 'span2') +
        fld('Double points', select(function (v) { event.doublePoints = v === '' ? undefined : v === 'true'; }, event.doublePoints == null ? '' : String(event.doublePoints),
          [['', 'Unconfirmed'], ['false', 'No bulletin-confirmed double points'], ['true', 'Bulletin confirms double points']], 'data-rerender')) +
        fld('Double-points bulletin evidence', input(function (v) { event.doublePointsEvidence = v; }, event.doublePointsEvidence || '', 'maxlength="1000"'), '', 'span2') +
        fld('Bulletin issue date (SSR 7.2 check)', input(function (v) { event.doublePointsBulletinDate = v || undefined; }, event.doublePointsBulletinDate || '', 'type="date"'), 'The bulletin must precede the event by at least 14 days.') + '</div>' +
        '</section>' + (result ? rsPane('source', pane, 'Classification source and finality') + '<h4>Official RS classification</h4><div class="form-grid">' +
          fld('Classification title', input(function (v) { result.title = v; }, result.title || '', 'maxlength="200"')) +
          fld('Printed finality/status', input(function (v) { result.status = v; }, result.status || '', 'maxlength="200"'), 'Enter the source wording; do not infer finality.') +
          fld('Separate scoring-finality review', select(function (v) {
            if (v === 'user-confirmed') result.finalityReview = result.finalityReview || { acceptedForScoring: true, evidence: '' };
            else delete result.finalityReview;
          }, result.finalityReview && result.finalityReview.acceptedForScoring ? 'user-confirmed' : '',
            [['', 'No separate user finality review'], ['user-confirmed', 'User confirms supplied classification may be scored']], 'data-rerender'),
            'Use only for an explicit human decision. This does not revise the printed source status or establish external technical clearance.') +
          fld('Finality-review evidence', area(function (v) {
            if (!result.finalityReview || !result.finalityReview.acceptedForScoring) return;
            result.finalityReview.evidence = v;
          }, result.finalityReview && result.finalityReview.evidence || '',
            'rows="2"' + (result.finalityReview && result.finalityReview.acceptedForScoring ? '' : ' disabled')),
            'Required whenever a user-confirmed scoring-finality review is selected.', 'span2') +
          fld('Source file/title', input(function (v) { result.source.file = v; }, result.source.file || '', 'maxlength="200"')) +
          fld('Source description', input(function (v) { result.source.description = v; }, result.source.description || '', 'maxlength="1000"'), 'For an attached/private source without a public URL, identify the document without entering a local path.') +
          fld('Official source URL', input(function (v) { result.source.url = v; }, result.source.url || '', 'type="url" maxlength="2000"'), 'HTTPS source for this exact classification.', 'span2') +
          '</div><div class="form-grid">' +
          (Object.keys(sourceCategories).length ? Object.keys(sourceCategories).map(function (category) {
            return fld('Scoring class for printed ' + esc(sourceCategories[category]), select(function (v) {
              result.classMappings = result.classMappings || {};
              if (v) result.classMappings[category] = v;
              else delete result.classMappings[category];
              if (!Object.keys(result.classMappings).length) {
                delete result.classMappings;
                delete result.classMappingEvidence;
              }
            }, (result.classMappings || {})[category] || '', [['', 'Unmapped'], ['RS2', 'RS2'], ['RS4', 'RS4']], 'data-rerender'));
          }).join('') : '<p class="small muted">No non-standard classified category needs an explicit scoring-class mapping.</p>') +
          fld('Scoring-class mapping evidence', input(function (v) { result.classMappingEvidence = v; }, result.classMappingEvidence || '', 'maxlength="1000"'),
            'Required when a printed category is mapped. This evidence is included with the public classification.', 'span2') +
          fld('Classification notes', area(function (v) { result.notes = lines(v); }, (result.notes || []).join('\n'), 'rows="2"'), '', 'span3') + '</div></section>' +
          rsPane('stages', pane, 'RS stages and independent time reuse') + '<div class="form-grid">' +
          fld('Optional linked NR round', select(function (v) {
            var oldRound = result.nrRoundId;
            if (v) result.nrRoundId = v; else delete result.nrRoundId;
            if (oldRound !== result.nrRoundId) (result.entries || []).forEach(function (entry) {
              (entry.timeEvidence || []).forEach(function (evidence, i) {
                if (evidence) { entry.timeEvidence[i] = null; entry.times[i] = null; }
              });
            });
            render();
          }, result.nrRoundId || '', nrRoundChoices, 'data-rerender')) +
          '</div>' +
          '<div class="section-head"><h4>Explicit RS stage selection and optional NR stage mapping</h4>' + btn(function () {
            var n = stages.length + 1, label = 'SS' + n;
            stages.push({ id: uniqueId(label.toLowerCase(), Object.fromEntries(stages.map(function (x) { return [x.id, true]; }))), label: label });
            (result.entries || []).forEach(function (entry) { entry.times = (entry.times || []).concat([null]); entry.stagePos = (entry.stagePos || []).concat([null]); if (entry.timeEvidence) entry.timeEvidence.push(null); });
            render();
          }, '+ Add selected RS stage', 'tiny') + '</div>' +
          (stages.length ? stages.map(function (stage, stageIndex) {
            var stageOptions = [['', 'RS-only / no NR mapping']].concat((nrRaw && nrRaw.stages || []).map(function (nrStage) { return [nrStage, nrStage]; }));
            return '<div class="form-grid tight bordered">' + fld('Stable stage ID', input(function (v) { stage.id = v; }, stage.id, 'maxlength="40"')) +
              fld('Official stage name', input(function (v) { stage.label = v; }, stage.label, 'maxlength="40"')) +
              fld('Explicit NR stage mapping', select(function (v) {
                if (v) stage.nrStage = v; else delete stage.nrStage;
                (result.entries || []).forEach(function (entry) {
                  if (entry.timeEvidence && entry.timeEvidence[stageIndex]) {
                    entry.timeEvidence[stageIndex] = null; entry.times[stageIndex] = null;
                  }
                });
              }, stage.nrStage || '', stageOptions, 'data-rerender')) +
              '<div class="fld">' + btn(function () {
                if (!window.confirm('Remove this RS stage and its corresponding times?')) return;
                stages.splice(stageIndex, 1);
                (result.entries || []).forEach(function (entry) { entry.times.splice(stageIndex, 1); if (entry.stagePos) entry.stagePos.splice(stageIndex, 1); if (entry.timeEvidence) entry.timeEvidence.splice(stageIndex, 1); });
                render();
              }, 'Remove stage', 'tiny ghost') + '</div></div>';
          }).join('') : '<p class="small muted">No stages selected. Add only stages supported by this RS classification.</p>') +
          '<p class="small muted">Time reuse copies reviewed values into blank RS cells only. Existing conflicts, missing observations and RS-only crews are preserved. No NR status, class, position, penalty or points is copied; later NR edits do not update this snapshot.</p>' +
          btn(function () { copyReviewedRsTimes(result, A.year); render(); }, 'Review and copy mapped NR stage times', 'tiny') + '</section>' +
          rsPane('rows', pane, 'Official classification crew rows') +
          '<div class="section-head"><h4>Official classification rows</h4>' + btn(function () {
            result.entries.push({ car: '', driver: '', codriver: '', class: 'RS2', status: 'unreviewed', pos: null, classPos: null,
              times: stages.map(function () { return null; }), stagePos: stages.map(function () { return null; }), penalty: null, total: null, invited: null });
            render();
          }, '+ Add classification row', 'tiny') + '</div>' +
          (result.entries || []).map(function (entry, rowIndex) {
            function field(label, key, value, attrs) { return fld(label, input(function (v) { entry[key] = v; }, value == null ? '' : value, attrs || '')); }
            function setIdentity(role, value) {
              entry.identityReview = entry.identityReview || { evidence: '' };
              if (value) entry.identityReview[role === 'driver' ? 'driverId' : 'codriverId'] = value;
              else delete entry.identityReview[role === 'driver' ? 'driverId' : 'codriverId'];
              if (!entry.identityReview.driverId && !entry.identityReview.codriverId && !entry.identityReview.evidence) delete entry.identityReview;
            }
            var identityChoices = [['', 'Unreviewed / source name only']].concat(peopleDoc().people.slice()
              .sort(function (a, b) { return a.name.localeCompare(b.name); })
              .map(function (person) { return [person.id, person.name]; }));
            var disclosure = event.id + '-row-' + rowIndex;
            return '<details class="rs-crew-row" data-rs-disclosure="' + esc(disclosure) + '"' + (A.open[disclosure] || !entry.car ? ' open' : '') + '><summary><span class="rs-row-number">#' + esc(entry.car || '?') + '</span><span><b>' + esc(entry.driver || 'New driver') + (entry.codriver ? ' / ' + esc(entry.codriver) : '') + '</b><small>' +
              esc((entry['class'] || 'Class unknown') + ' · ' + (entry.status || 'Status unknown') + ' · Row ' + (rowIndex + 1)) + '</small></span></summary><div class="rs-row-body"><div class="actions">' +
              btn(function () { result.entries.splice(rowIndex, 1); A.open = {}; render(); }, 'Remove row', 'tiny bad') + '</div>' +
              '<div class="form-grid tight">' + field('Car', 'car', entry.car, 'maxlength="40"') + field('Driver profile name', 'driver', entry.driver) +
              field('Co-driver profile name', 'codriver', entry.codriver || '') +
              fld('Reviewed driver identity (optional)', select(function (v) { setIdentity('driver', v); },
                entry.identityReview && entry.identityReview.driverId || '', identityChoices, 'data-rerender')) +
              fld('Reviewed co-driver identity (optional)', select(function (v) { setIdentity('codriver', v); },
                entry.identityReview && entry.identityReview.codriverId || '', identityChoices, 'data-rerender')) +
              fld('Identity-review evidence', area(function (v) {
                entry.identityReview = entry.identityReview || {};
                entry.identityReview.evidence = v;
                if (!entry.identityReview.driverId && !entry.identityReview.codriverId && !v) delete entry.identityReview;
              }, entry.identityReview && entry.identityReview.evidence || '', 'rows="2"'),
                'Required when either reviewed identity is selected. Keep printed source names above unchanged; never identify a person or role from car number alone. Use an NR main spelling only for a reviewed same-event car-and-crew match.', 'span2') +
              field('Printed RS category', 'class', entry['class'], 'maxlength="80"') +
              field('Printed vehicle/model (optional)', 'vehicle', entry.vehicle || '', 'maxlength="200"') +
              fld('Printed RS status', entryPolicy && ['classified', 'DNF', 'DNS'].indexOf(entry.status) >= 0 ?
                select(function (v) { entry.status = v; }, entry.status, [['classified', 'classified'], ['DNF', 'DNF'], ['DNS', 'DNS']], 'data-rerender') :
                input(function (v) { entry.status = v; }, entry.status, 'maxlength="80" data-rerender'),
                entryPolicy ? 'Supported result statuses: classified, DNF, DNS. Retain printed TEST only for the reviewed launch exception; unsupported inputs block publication.' : '') +
              (entryPolicy && (entry.status === 'TEST' || E.normClass(entry['class']) === 'TEST') ?
                fld('Private launch-only RS0 review evidence', area(function (v) {
                  if (v) entry.launchNonScoringReview = { evidence: v };
                  else delete entry.launchNonScoringReview;
                }, entry.launchNonScoringReview && entry.launchNonScoringReview.evidence || '', 'rows="2" maxlength="1000"'),
                  'Only the explicitly confirmed launch crew, both roles, at a non-scoring event with no round number. Preserves printed TEST and all times. Never applies to later championship entries.', 'span2') : '') +
              field('Start evidence (when a DNF has no stage observation)', 'startEvidence', entry.startEvidence || '', 'maxlength="1000"') +
              fld('Official overall position', input(function (v) { entry.pos = numOrNull(v); }, entry.pos, 'inputmode="numeric" data-rerender')) +
              fld('Official class position', input(function (v) { entry.classPos = numOrNull(v); }, entry.classPos, 'inputmode="numeric"')) +
              field('Official total', 'total', entry.total || '') + field('Separate penalty', 'penalty', entry.penalty || '') +
              (entryPolicy ? '<p class="small muted">Entry-based eligibility: invitation evidence does not exclude either crew role.</p>' :
                fld('Invitation status', select(function (v) { entry.invited = v === '' ? undefined : v === 'true'; }, entry.invited == null ? '' : String(entry.invited),
                [['', 'Unreviewed'], ['false', 'Not invitational'], ['true', 'Invitational — no championship points']], 'data-rerender'))) +
              fld('Stage times in selected-stage order', input(function (v) {
                entry.times = v.split(',').map(function (x) { x = x.trim(); return x || null; });
                if (entry.timeEvidence) entry.timeEvidence = entry.timeEvidence.map(function (evidence, i) { return evidence && evidence.value === entry.times[i] ? evidence : null; });
              }, (entry.times || []).map(function (v) { return v == null ? '' : v; }).join(', '), 'placeholder="e.g. 01:23.45, 02:10.00"'), 'Comma-separated; blanks stay missing, never zero.', 'span2') +
              fld('Official stage positions (optional)', input(function (v) { entry.stagePos = v.split(',').map(function (x) { return x.trim() ? numOrNull(x) : null; }); },
                (entry.stagePos || []).map(function (v) { return v == null ? '' : v; }).join(', '), 'placeholder="e.g. 2, 1"'), 'Comma-separated in selected-stage order.', 'span2') +
              fld('Row notes', area(function (v) { entry.notes = lines(v); }, (entry.notes || []).join('\n'), 'rows="2"'), '', 'span2') + '</div></div></details>';
          }).join('') +
          (!(result.entries || []).length ? '<p class="small muted">No source rows yet. Add the complete official classification; never infer missing rows from entry lists.</p>' : '') + '</section>' +
          rsPane('preview', pane, 'RS event points preview') +
          (scoreRow ? '<div class="card subcard"><h4>Current RS event-points preview</h4><p><b>' + esc(scoreRow.status) + '</b> — ' + esc(scoreRow.reason || 'Points are calculated independently for each eligible crew role.') + '</p>' +
            (scoreRow.status === 'ready' ? '<div class="table-wrap"><table class="data"><thead><tr><th>Car</th><th>Driver</th><th>Driver points</th><th>Co-driver</th><th>Co-driver points</th></tr></thead><tbody>' +
              (result.entries || []).map(function (entry) {
                var p = (scoreRow.entries || []).filter(function (row) { return row.car === String(entry.car); })[0] || {};
                return '<tr><td>' + esc(entry.car) + '</td><td>' + esc(entry.driver) + '</td><td class="num">' + (p.driverPoints == null ? '—' : p.driverPoints) + '</td><td>' + esc(entry.codriver || '—') + '</td><td class="num">' + (p.codriverPoints == null ? '—' : p.codriverPoints) + '</td></tr>';
              }).join('') + '</tbody></table></div>' : '<p class="small muted">No points are shown while the supported rule inputs are incomplete.</p>') + '</div>' : '<div class="card empty">No championship score is established for this event. Check Event &amp; evidence, Season setup and People &amp; eligibility.</div>') +
          '</section>' : '<div class="card empty"><p>No classification is recorded for this event. Add its source before entering stages and crews.</p>' + btn(function () {
            var id = uniqueId(event.id + '-classification', Object.fromEntries(data.results.map(function (r) { return [r.id, true]; })));
            data.results.push({ id: id, eventId: event.id, title: 'Official RS classification', status: 'unreviewed', stages: [], source: { file: '', url: '' }, notes: [], entries: [] });
            go(eventPath + '/source');
          }, '+ Add classification') + '</div>') + '</article>';
    }).join('') + '</div>';
    return html;
  }
  function viewSeason() {
    var s = season(), st = site(); s.classes = s.classes || []; s.documents = s.documents || []; s.pointsScale = s.pointsScale || { overall: [], cls: [] };
    var msa = s.msa || (s.msa = { label: '', url: '', generated: '', confirmedRounds: [] }); msa.confirmedRounds = msa.confirmedRounds || [];
    var html = pageHead(A.year + ' · settings', A.year + ' season settings', 'Championship rules for this season. Changing the points scale or classes recalculates every round of the season.',
      +st.currentSeason === A.year ? '<span class="badge final">The public site opens on this season</span>' : '<div class="actions">' + btn(function () { st.currentSeason = A.year; render(); }, 'Open the public site on ' + A.year) + '</div>');
    html += aiReviewedSettingsCard(s);
    html += '<div class="card"><h3>Championship</h3><div class="form-grid">' +
      fld('Championship name', input(function (v) { s.championship = v; }, s.championship), '', 'span2') + fld('Short name', input(function (v) { s.shortName = v; }, s.shortName)) +
      fld('Season status', select(function (v) { s.status = v; }, s.status || '', [['planned', 'Planned'], ['in progress', 'In progress'], ['complete', 'Complete']])) +
      fld('Minimum starts to be eligible', input(function (v) { s.minStarts = numOrNull(v) || 0; }, s.minStarts, 'inputmode="numeric"')) +
      fld('Overall points (1st, 2nd, 3rd…)', input(function (v) { s.pointsScale.overall = nums(v); }, s.pointsScale.overall.join(', ')), 'Comma-separated.', 'span2') +
      fld('Class points (1st, 2nd, 3rd…)', input(function (v) { s.pointsScale.cls = nums(v); }, s.pointsScale.cls.join(', ')), 'Comma-separated.', 'span2') +
      fld('Season notes (shown under “Sources & data notes”)', area(function (v) { s.notes = lines(v); }, (s.notes || []).join('\n'), 'rows="3"'), 'One per line.', 'span2') + '</div></div>';
    html += '<div class="card"><h3>Classes</h3>' + listEditor(s.classes, [
      function (c) { return fld('Class', input(function (v) { c.id = E.normClass(v); }, c.id, 'class="w4"')); },
      function (c) { return fld('Description', input(function (v) { c.desc = v; }, c.desc), '', 'span2'); },
      function (c) { return '<div class="fld">' + check(function (v) { if (v) c.classOnly = true; else delete c.classOnly; }, c.classOnly, 'Class points only (no overall points)') + '</div>'; }
    ], '+ Add class', function () { return { id: '', desc: '' }; }) + '</div>';
    html += '<div class="card"><h3>MSA standings</h3><p class="small muted">The official championship points published by MSA. Rounds ticked here show “Points match MSA”; the rest show “Points calculated”.</p><div class="form-grid">' +
      fld('Label', input(function (v) { msa.label = v; }, msa.label)) + fld('Link to the latest MSA points PDF', input(function (v) { msa.url = v; }, msa.url, 'type="url" placeholder="https://"'), '', 'span2') +
      fld('Published', input(function (v) { msa.generated = v; }, msa.generated, 'placeholder="15 September ' + A.year + '"')) + '</div>' +
      '<div class="chk-row">' + (s.rounds || []).map(function (r, i) {
        return check(function (v) { var k = msa.confirmedRounds.indexOf(r.id); if (v && k < 0) msa.confirmedRounds.push(r.id); if (!v && k >= 0) msa.confirmedRounds.splice(k, 1); msa.confirmedRounds.sort(function (a, b) { return roundNo(a) - roundNo(b); }); }, msa.confirmedRounds.indexOf(r.id) >= 0, 'R' + (i + 1));
      }).join('') + '</div></div>';
    html += '<div class="card"><h3>Regulations &amp; documents</h3><p class="small muted">Shown on the Info page: sporting regulations (SSRs), bulletins, the MSA standings and so on. Link to the official copy (for example on motorsport.co.za).</p>' + listEditor(s.documents, [
      function (d) { return fld('Title', input(function (v) { d.title = v; }, d.title), '', 'span2'); },
      function (d) { return fld('Kind', select(function (v) { d.kind = v; }, d.kind || 'SSR', [['SSR', 'SSR'], ['Bulletin', 'Bulletin'], ['Standings', 'Standings'], ['Regulations', 'Regulations'], ['Other', 'Other']])); },
      function (d) { return fld('Date', input(function (v) { d.date = v; }, d.date, 'type="date"')); },
      function (d) { return fld('Link', input(function (v) { d.url = v; }, d.url, 'placeholder="https://"'), '', 'span2'); }
    ], '+ Add document', function () { return { title: '', kind: 'SSR', date: '', url: '' }; }) + '</div>';
    var hasResults = (s.rounds || []).some(function (r) { return r.results; });
    html += '<div class="section"><div class="section-head"><h2>Start the next season</h2></div>' + newSeasonCard() + '</div>';
    if (!hasResults && years().length > 1) html += '<div class="card danger"><h3>Delete the ' + A.year + ' season</h3><p class="small">Only possible while it has no NR results.</p>' + btn(function () {
      var hasRs = !!s.rallyesport;
      var warning = 'Delete the ' + A.year + ' season?' + (hasRs ?
        ' This also removes all RallyeSport events, official classifications/results, source and stage-time evidence, and season-scoped Non-Scoring RS Member decisions.' : '');
      if (!window.confirm(warning)) return;
      dropDoc(seasonPath(A.year)); A.dropPublic.push('season_' + A.year); st.seasons = st.seasons.filter(function (x) { return +x.year !== A.year; });
      if (+st.currentSeason === A.year) st.currentSeason = years()[0];
      A.year = years()[0]; go('#/');
    }, 'Delete season', 'bad') + '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ site & info */
  var NETWORKS = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['x', 'X'], ['website', 'Website']];
  function rallyActivationId() {
    return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function prepareRallyNotice() {
    var st = site(), d = A.docs[SITE], before = d && d.orig ? JSON.parse(d.orig).activeRally : undefined;
    // Restore and undo can reactivate an old notice too; never reuse its old bypass.
    if (st && st.activeRally && st.activeRally.enabled && AI.canonical(before) !== AI.canonical(st.activeRally)) {
      st.activeRally.activationId = rallyActivationId();
    }
  }
  function activeRallyCard(st) {
    var n = st.activeRally || { enabled: false, name: '', url: 'https://nrcsa.co.za/' };
    function edit() {
      if (!st.activeRally) st.activeRally = { enabled: false, name: '', url: 'https://nrcsa.co.za/', activationId: rallyActivationId() };
      return st.activeRally;
    }
    return '<div class="card" id="activeRallySettings"><h3>Rally in progress</h3>' +
      '<p class="small muted">Manual public notice for entries, SSRs and active-event information. Nothing changes live until you review and publish. Admin access and the disclaimer stay available.</p>' +
      check(function (on) { var cfg = edit(); cfg.enabled = on; if (on) cfg.activationId = rallyActivationId(); }, n.enabled,
        'Enable the active-rally notice', 'id="activeRallyEnabled"') +
      '<div class="form-grid">' + fld('Rally name', input(function (v) { edit().name = v.trim(); }, n.name, 'id="activeRallyName" maxlength="120"'),
        'For example: Example Rally', 'span2') +
      fld('Official NRC destination', input(function (v) { edit().url = v.trim(); }, n.url, 'id="activeRallyUrl" type="url"'),
        'HTTPS on nrcsa.co.za or www.nrcsa.co.za only; an official event page is allowed.', 'span3') + '</div>' +
      '<p class="small">Visitors initially see a full-page yellow notice. &ldquo;View past results&rdquo; bypasses it for that browser visit, leaving a yellow reminder on every public page. A changed rally or reactivation shows the full notice again. It is never enabled from calendar dates or results.</p></div>';
  }
  function viewSite() {
    var st = site(); st.info = st.info || {}; st.info.documents = st.info.documents || []; st.social = st.social || []; st.contact = st.contact || {};
    var html = pageHead('Whole site', 'Site &amp; info', 'Text and links on the Info page and around the site. Social links without an address show as “Coming soon”.');
    html += '<div class="card"><h3>Basics</h3><div class="form-grid">' + fld('Site name', input(function (v) { st.siteName = v; }, st.siteName)) +
      fld('Tagline', input(function (v) { st.tagline = v; }, st.tagline), '', 'span2') + fld('Intro on the Info page', area(function (v) { st.info.intro = v.trim(); }, st.info.intro, 'rows="4"'), '', 'span3') + '</div></div>';
    html += activeRallyCard(st);
    var analytics = st.analytics || { enabled: false, measurementId: '' };
    function editAnalytics() {
      if (!st.analytics) st.analytics = { enabled: false, measurementId: '' };
      return st.analytics;
    }
    html += '<div class="card" id="analyticsSettings"><h3>Google Analytics 4</h3>' +
      '<p class="small muted">Optional background analytics on public pages only. Nothing changes live until Review &amp; publish. Visitors can turn it off on the dedicated Privacy &amp; analytics page, linked from Info and the footer. No privacy popup.</p>' +
      check(function (on) { editAnalytics().enabled = on; }, analytics.enabled, 'Enable Google Analytics', 'id="analyticsEnabled"') +
      '<div class="form-grid">' + fld('GA4 Measurement ID', input(function (v) { editAnalytics().measurementId = v.trim(); },
        analytics.measurementId, 'id="analyticsMeasurementId" maxlength="12" autocomplete="off" spellcheck="false" placeholder="G-XXXXXXXXXX"'),
        'G- followed by 10 uppercase letters or digits. Leave empty and disabled until your new web stream is ready.', 'span2') + '</div>' +
      '<p class="small">This ID is stored in the database, not the code, but is public in visitors\' browsers; it is not a password. Turn off all Enhanced Measurement in the GA web stream before enabling here (including browser-history pageviews, search and form interactions). Only manual, generic page categories are sent. No advertising features or admin tracking are added. See <code>docs/runbook.md</code> for setup and verification. Background loading is not evidence of visitor consent or legal compliance.</p></div>';
    html += '<div class="card"><h3>Social media</h3>' + listEditor(st.social, [
      function (x) { return fld('Network', select(function (v) { x.network = v; }, x.network, NETWORKS)); },
      function (x) { return fld('Label', input(function (v) { x.label = v; }, x.label)); },
      function (x) { return fld('Address', input(function (v) { x.url = v.trim(); }, x.url, 'type="url" placeholder="https:// — leave empty for “Coming soon”"'), '', 'span2'); }
    ], '+ Add social link', function () { return { network: 'facebook', label: 'Facebook', url: '' }; }) + '</div>';
    html += '<div class="card"><h3>Useful links</h3>' + listEditor(st.info.documents, [
      function (d) { return fld('Title', input(function (v) { d.title = v; }, d.title), '', 'span2'); },
      function (d) { return fld('Link', input(function (v) { d.url = v.trim(); }, d.url, 'type="url" placeholder="https://"'), '', 'span2'); },
      function (d) { return fld('Note', input(function (v) { d.note = v; }, d.note)); }
    ], '+ Add link', function () { return { title: '', url: '', note: '' }; }) + '</div>';
    html += '<div class="card"><h3>Contact</h3><div class="form-grid">' + fld('Email address', input(function (v) { st.contact.email = v.trim(); }, st.contact.email, 'type="email"'), 'Shown publicly. Leave empty to hide.') +
      fld('Note', area(function (v) { st.contact.note = v.trim(); }, st.contact.note, 'rows="2"'), '', 'span2') + '</div></div>';
    html += adminsCard();
    return html;
  }

  function adminsCard() {
    var html = '<div class="card" id="admins"><h3>Admins</h3><p class="small muted">Google accounts that can sign in to this admin. Changes here take effect immediately (they aren\'t part of a publish).</p>';
    if (A.mode !== 'live' || !A.admins) return html + '<p class="small">The admin list is managed here once you\'re signed in.</p></div>';
    var list = A.admins.list, na = A.newAdmin || (A.newAdmin = { email: '' });
    html += '<table class="data mini"><tbody>' + list.map(function (em) {
      return '<tr><td>' + esc(em) + (A.user && em === A.user.email ? ' <span class="small muted">(you)</span>' : '') + '</td><td class="num">' + (list.length > 1 ? btn(async function () {
        if (!window.confirm('Remove ' + em + ' from the admins?' + (A.user && em === A.user.email ? ' You will lose access yourself.' : ''))) return;
        await saveAdmins(list.filter(function (x) { return x !== em; })); toast(em + ' removed.', 'good'); render();
      }, 'Remove', 'tiny ghost') : '<span class="small muted">last admin</span>') + '</td></tr>';
    }).join('') + '</tbody></table><div class="form-grid">' + fld('Add a Google account', input(function (v) { na.email = v; }, na.email, 'type="email" placeholder="name@gmail.com" id="newAdmin"')) +
      '<div class="fld">' + btn(async function () {
        var em = String(na.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Type the person\'s full Google email address.');
        if (list.indexOf(em) >= 0) throw new Error(em + ' is already an admin.');
        await saveAdmins(list.concat([em])); A.newAdmin = null; toast(em + ' can now sign in.', 'good'); render();
      }, 'Add admin', 'primary', 'id="addAdminBtn"') + '</div></div><p class="small muted">They sign in at this page with that Google account. Ask them to turn on 2-Step Verification for it.</p></div>';
    return html;
  }

  /* ------------------------------------------------------------------ history */
  function viewHistory() {
    var html = pageHead('Every published change', 'History', 'Each publish is recorded with who made it and when. Undo puts the data back the way it was before that change; you review it before publishing.');
    if (A.mode !== 'live') return html + '<div class="card empty">The history is kept in the database. Sign in to see it.</div>';
    if (!A.history) {
      A.history = { loading: true }; var version = sessionVersion;
      loadHistory().then(function (g) { if (version !== sessionVersion || A.mode !== 'live') return; A.history = { groups: g }; if (route().view === 'history') render(); },
        function (e) { if (version !== sessionVersion || A.mode !== 'live') return; A.history = { error: e.message }; if (route().view === 'history') render(); });
    }
    if (A.history.loading) return html + '<div class="card empty">Loading the history…</div>';
    if (A.history.error) return html + '<div class="callout bad"><div>' + esc(A.history.error) + '</div></div>';
    var gs = A.history.groups.slice(0, 40);
    if (!gs.length) return html + '<div class="card empty">Nothing has been published yet.</div>';
    return html + '<div class="table-wrap"><table class="data"><thead><tr><th>When</th><th>Change</th><th>By</th><th>What changed</th><th></th></tr></thead><tbody>' + gs.map(function (g) {
      var first = g.items.some(function (it) { return it.path === SITE && it.kind === 'add'; });
      return '<tr><td class="nowrap">' + esc(when(g.at)) + '</td><td>' + esc(g.message) + '</td><td class="small">' + esc(g.by) + '</td><td class="small">' + esc(g.items.map(function (it) { return label(it.path); }).join(', ')) + '</td><td>' +
        (first ? '<span class="small muted">First load</span>' : btn(function () {
          if (changes().length && !window.confirm('You have unpublished changes. Undoing this change adds to them. Continue?')) return;
          if (!stageUndo(g)) return;
          A.undoMsg = 'Undo: ' + g.message; toast('Undo staged for “' + g.message + '”. Review it, then publish.', 'good'); go('#/publish');
        }, 'Undo', 'tiny')) + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="small muted">Undoing an older change also reverts any later edits to the same items. Check the review screen before publishing. Photos aren\'t kept in the history, so an undo can remove a photo but not bring one back.</p>';
  }

  /* ------------------------------------------------------------------ review & publish */
  function diffLines(a, b) {
    var A1 = a.split('\n'), B1 = b.split('\n'), s = 0;
    while (s < A1.length && s < B1.length && A1[s] === B1[s]) s++;
    var ea = A1.length - 1, eb = B1.length - 1;
    while (ea >= s && eb >= s && A1[ea] === B1[eb]) { ea--; eb--; }
    var a2 = A1.slice(s, ea + 1), b2 = B1.slice(s, eb + 1), n = a2.length, m = b2.length, out = [];
    if (n * m > 4e6) return [{ t: '~', s: n + ' lines replaced by ' + m + ' lines' }];
    var dp = []; for (var i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) dp[i][j] = a2[i] === b2[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    i = 0; j = 0;
    while (i < n && j < m) { if (a2[i] === b2[j]) { out.push({ t: ' ', s: a2[i] }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: '-', s: a2[i++] }); else out.push({ t: '+', s: b2[j++] }); }
    while (i < n) out.push({ t: '-', s: a2[i++] }); while (j < m) out.push({ t: '+', s: b2[j++] });
    var res = A1.slice(Math.max(0, s - 2), s).map(function (x) { return { t: ' ', s: x }; });
    var run = [];
    out.forEach(function (o) { if (o.t === ' ') run.push(o); else { if (run.length > 5) res.push(run[0], run[1], { t: '~', s: '…' }, run[run.length - 2], run[run.length - 1]); else res = res.concat(run); run = []; res.push(o); } });
    res = res.concat(run.length > 5 ? [run[0], run[1], { t: '~', s: '…' }] : run);
    return res.concat(A1.slice(ea + 1, ea + 3).map(function (x) { return { t: ' ', s: x }; }));
  }
  function autoMessage(list) {
    if (A.undoMsg) return A.undoMsg;
    if (list.some(function (c) { return c.path === SITE && c.kind === 'add'; })) return 'Load the results data into the database';
    var parts = [], seen = {};
    list.forEach(function (c) {
      var m, t;
      if ((m = c.path.match(/rounds\/(.+)\.json$/))) t = (c.kind === 'delete' ? 'Remove ' : c.kind === 'add' ? 'Add ' : 'Update ') + c.path.split('/')[2] + ' ' + m[1] + ' results';
      else if (c.path === PEOPLE || /^data\/people\//.test(c.path)) t = 'Update competitors';
      else if (c.path === SITE) t = 'Update site info';
      else if ((m = c.path.match(/seasons\/(\d+)\/season\.json$/))) t = (c.kind === 'add' ? 'Add ' : 'Update ') + m[1] + ' season settings';
      else if (/\/docs\//.test(c.path)) t = 'Update documents';
      if (t && !seen[t]) { seen[t] = 1; parts.push(t); }
    });
    var msg = parts.join('; '); return msg.length > 72 ? parts[0] + ' and ' + (parts.length - 1) + ' more change' + (parts.length > 2 ? 's' : '') : (msg || 'Update results data');
  }
  function viewPublish() {
    var list = changes(), unknown = legacyUnknownNames(), entryUnknown = knownNames('entries');
    var html = pageHead(A.mode === 'live' ? esc(A.user.email) : 'Demo mode', 'Review &amp; publish', A.mode === 'live' ? 'Publishing saves everything below in one step, refreshes the public copy the website reads and records it in the History.' : 'In demo mode publishing only shows what would be saved.');
    if (A.lastCommit) {
      html += '<div class="callout good"><div><b>' + (A.lastCommit.demo ? 'Demo: ' + A.lastCommit.files + ' change' + (A.lastCommit.files === 1 ? '' : 's') + ' would have been saved.' : 'Published ' + A.lastCommit.files + ' change' + (A.lastCommit.files === 1 ? '' : 's') + '.') + '</b> ' +
        (A.lastCommit.demo ? '' : 'The public site shows it now; refresh the page if it\'s already open. <a href="../#/' + A.year + '" target="_blank" rel="noopener">Open the site ↗</a>') + '</div></div>';
    }
    if (!list.length && !unknown.length && !entryUnknown.length) return html + '<div class="card empty"><h2>Nothing to publish</h2><p>Changes you make in the other sections collect here until you publish them.</p></div>';
    var errors = [], warns = 0;
    html += entryIdentityNotice();
    publishIssues().forEach(function (i) { if (i.level === 'error') errors.push(label(i.path) + ': ' + i.msg); if (i.level === 'warn') warns++; });
    years().forEach(function (y) { try { model(y); } catch (e) { errors.push(y + ' season can\'t be calculated: ' + e.message); } });
    html += '<div class="card"><h3>' + list.length + ' change' + (list.length === 1 ? '' : 's') + '</h3><div class="changes">' + list.map(function (c) {
      var kind = { add: 'New', update: 'Changed', 'delete': 'Removed' }[c.kind];
      var body = '';
      if (!c.binary) { var d = diffLines(c.before || '', c.kind === 'delete' ? '' : c.text); body = '<pre class="diff">' + d.slice(0, 500).map(function (l) { return '<span class="' + (l.t === '+' ? 'add' : l.t === '-' ? 'del' : l.t === '~' ? 'gap' : '') + '">' + (l.t === '~' ? '' : l.t + ' ') + esc(l.s) + '</span>'; }).join('\n') + (d.length > 500 ? '\n…' : '') + '</pre>'; }
      else body = '<p class="small muted">' + (c.kind === 'delete' ? 'Photo removed.' : 'Photo uploaded (' + Math.round(c.b64.length * 0.75 / 1024) + ' KB).') + '</p>';
      return '<details class="chg-item"><summary><span class="badge ' + (c.kind === 'delete' ? 'prov' : 'final') + '">' + kind + '</span> <b>' + esc(label(c.path)) + '</b></summary>' + body + '</details>';
    }).join('') + '</div></div>';
    if (unknown.length) html += '<div class="callout"><div><b>Also adding ' + unknown.length + ' new competitor' + (unknown.length === 1 ? '' : 's') + ':</b> ' + unknown.map(function (n) { var like = E.similarNames(n, peopleDoc()); return esc(n) + (like.length ? ' <span class="small">(looks like existing <b>' + esc(like[0]) + '</b>: if it\'s the same person, add this spelling under Competitors → ' + esc(like[0]) + ' → Also printed as)</span>' : ''); }).join('; ') + '.</div></div>';
    if (errors.length) html += '<div class="callout bad"><div><b>Fix these before publishing:</b><ul>' + errors.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div></div>';
    else if (warns) html += '<div class="callout warn"><div>' + warns + ' check' + (warns === 1 ? '' : 's') + ' to review in the results — they don\'t stop publishing.</div></div>';
    var ms = A.pubMsg != null ? A.pubMsg : autoMessage(list);
    html += '<div class="card"><div class="form-grid">' + fld('Describe this change (saved in the history)', input(function (v) { A.pubMsg = v; }, ms, 'id="pubMsg" maxlength="200"'), '', 'span3') + '</div><div class="actions">' +
      btn(async function () {
        if (errors.length) throw new Error('Fix the errors listed above first.');
        var msg = (A.pubMsg != null ? A.pubMsg : ms).trim() || 'Update results data';
        try { A.lastCommit = await publish(msg); }
        catch (e) {
          if (e.conflict) { A.conflict = e.message; render(); return; }
          throw e;
        }
        A.pubMsg = null; A.undoMsg = null; A.conflict = null; toast(A.lastCommit.demo ? 'Demo: nothing was saved.' : 'Published.', 'good'); render();
      }, A.mode === 'live' ? 'Publish to the website' : 'Publish (demo)', 'primary', (errors.length ? 'disabled ' : '') + 'id="pubGo"') +
      btn(function () { if (!window.confirm('Throw away all unpublished changes?')) return; return reload(); }, 'Discard all changes', 'ghost', 'id="discardBtn"') +
      btn(async function () { download('nr-rally-backup-' + new Date().toISOString().slice(0, 10) + '.json', await backupText()); }, 'Download a backup (includes these changes)', 'ghost') + '</div></div>';
    if (A.conflict) html += '<div class="callout bad"><div><b>' + esc(A.conflict) + '</b> Publishing now would overwrite their work. Download a backup (it includes your changes), reload to get the latest version, then make your edits again. ' + btn(function () { if (window.confirm('Reload the latest data and lose your unpublished changes?')) { A.conflict = null; return reload(); } }, 'Reload the latest data', 'tiny', 'id="reloadBtn"') + '</div></div>';
    return html;
  }
  async function reload() {
    A.imp = null; A.open = {}; A.pubMsg = null; A.undoMsg = null;
    var version = sessionVersion, user = A.user;
    if (A.mode === 'live') await liveLoad(version, user); else if (A.mode === 'demo') await demoLoad(version, user); else throw new Error('Sign in again to reload.');
    toast('Reloaded the latest data.', 'good'); if (A.empty) go('#/import'); else render();
  }

  /* ------------------------------------------------------------------ boot */
  (async function boot() {
    render();
    if (!CONFIGURED) return;
    try {
      var au = await auth(); await au.ready();
      observeAuth(au);
      if (au.user()) { ROOT.innerHTML = '<div class="signin"><div class="card signin-card"><p>Signing in…</p></div></div>'; await enter(); }
    } catch (e) { A.mode = null; signInState.err = authError(e); render(); }
  })();
})();
