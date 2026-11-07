/* Northern Regions Rally — public site (no dependencies).
   The code holds no results. Everything shown comes from the published copy in the database (the public/
   documents in Cloud Firestore, read through its REST API without signing in). Standings, points and stage
   progressions are computed in the browser with assets/engine.js. */
(function () {
  'use strict';
  var E = window.NREngine;
  var app = document.getElementById('app');

  /* ------------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var r1 = E.r1, fmtTime = E.fmtTime, ord = E.ord, slug = E.slug;
  function fmtShort(sec) { // axis labels
    if (sec < 60) return Math.round(sec) + 's';
    var m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    if (m >= 60) { var h = Math.floor(m / 60); m = m - h * 60; return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDiff(sec) { sec = Math.abs(sec); return sec < 60 ? sec.toFixed(1) + 's' : fmtTime(sec); }
  function surname(n) { var p = String(n).split(' '); return p.length > 1 ? p.slice(1).join(' ') : n; }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00'); if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:|mailto:)/i.test(u) || /^[\w./-]+$/.test(u) ? u : ''; }
  function ext(u, text, cls) { u = safeUrl(u); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>' : ''; }
  function plink(name) { return name ? '<a href="#/person/' + esc(encodeURIComponent(ST.peopleIndex ? ST.peopleIndex.resolve(name).id : slug(name))) + '">' + esc(name) + '</a>' : '<span class="muted">—</span>'; }
  function clsTag(c) { return c ? '<span class="cls ' + esc(c) + '">' + esc(c) + '</span>' : ''; }
  function classificationState(r) {
    if (r.provisional) return 'provisional';
    // Legacy PDF imports can retain a trailing page count in the printed heading.
    return !r.finalityUnclear && /^\s*final\s+(?:official\s+)?classification(?:\s+\d+\/\d+)?\s*$/i.test(r.status || '') ? 'final' : 'unclear';
  }
  function classificationBadge(r, detail) {
    var state = classificationState(r);
    var label = state === 'final' ? (detail ? 'Final classification' : 'Final') :
      state === 'provisional' ? (detail ? 'Provisional sheet' : 'Provisional') :
      (detail ? 'Classification finality unclear' : 'Finality unclear');
    return '<span class="badge ' + (state === 'final' ? 'final' : 'prov') + '">' + label + '</span>';
  }
  function posBadge(p, status) {
    if (status === 'DNF' || status === 'DNS') return '<span class="pos dnf">' + status + '</span>';
    if (p == null) return '<span class="pos dnf">—</span>';
    return '<span class="pos' + (p <= 3 ? ' p' + p : '') + '">' + p + '</span>';
  }
  function starts(n) { return n + ' start' + (n === 1 ? '' : 's'); }
  function roundList(ids) { return ids.length <= 2 ? ids.join(' and ') : ids.slice(0, -1).join(', ') + ' and ' + ids[ids.length - 1]; }
  var PALETTE = ['#ff5a1f', '#3e7ff0', '#2f9e66', '#e5484d', '#a855f7', '#e39b12', '#06b6d4', '#ec4899', '#84cc16', '#8b5e3c', '#64748b', '#14b8a6', '#c2410c', '#1d4ed8', '#15803d', '#be123c', '#7e22ce', '#a16207', '#0e7490', '#9d174d'];

  /* ------------------------------------------------------------------ data loading (the database only) */
  var FB = window.NR_FIREBASE || {};
  var DBURL = FB.projectId ? 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FB.projectId) + '/databases/(default)/documents' : '';
  var ST = { site: null, people: null, profiles: {}, models: {}, pending: {}, photos: {}, error: null };
  function loadError(kind, msg) { var e = new Error(msg); e.kind = kind; return e; }
  function getPublic(id) {   // one published document; null if it doesn't exist
    if (id === 'site' && window.NRRallyNotice) return window.NRRallyNotice.sitePromise;
    return fetch(DBURL + '/public/' + encodeURIComponent(id), { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw loadError('down', 'The results database returned ' + r.status + '.');
      return r.json();
    }, function () { throw loadError('down', 'The results database couldn\'t be reached.'); })
      .then(function (d) { return d && d.fields && d.fields.json ? JSON.parse(d.fields.json.stringValue) : null; });
  }
  function loadSiteAndPeople() {
    if (!DBURL) return Promise.reject(loadError('setup', 'This site isn\'t connected to its results database yet (assets/firebase-config.js is empty).'));
    return Promise.all([getPublic('site'), getPublic('people')]).then(function (r) {
      if (!r[0]) throw loadError('empty', 'Nothing has been published yet.');
      return [r[0], r[1] || { people: [] }];
    });
  }
  function loadPhoto(id) {   // profile photos published in the database (photo: "db:<id>")
    if (ST.photos[id] !== undefined) return Promise.resolve(ST.photos[id]);
    return fetch(DBURL + '/photos/' + encodeURIComponent(id), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { ST.photos[id] = d && d.fields && d.fields.b64 ? d.fields.b64.stringValue : null; return ST.photos[id]; }, function () { return null; });
  }
  function seasonList() { return ((ST.site && ST.site.seasons) || []).map(function (s) { return +s.year; }).sort(function (a, b) { return b - a; }); }
  function loadSeason(year) {
    if (ST.models[year]) return Promise.resolve(ST.models[year]);
    if (ST.pending[year]) return ST.pending[year];
    ST.pending[year] = getPublic('season_' + year).then(function (b) {
      if (!b) throw loadError('empty', 'The ' + year + ' season hasn\'t been published yet.');
      var model = E.buildSeason({ season: b.season, rounds: b.rounds || {}, people: ST.people });
      model.entryLists = model.entryLists || [];
      model.people.forEach(function (p) { p.entries = p.entries || []; });
      model.year = +year; model.raw = b.season;
      ST.models[year] = model;
      return model;
    });
    ST.pending[year].catch(function () { delete ST.pending[year]; });
    return ST.pending[year];
  }

  /* ------------------------------------------------------------------ current season context */
  var D = null, YEAR = null, SP = '';
  var roundsById = {}, eventsById = {}, standingIdx = { driver: {}, codriver: {} }, ROUND_IDS = [], CLASSES = [], CLASS_DESC = {}, lastRound = null;
  function useSeason(model) {
    D = model; YEAR = model.year; SP = '/' + YEAR;
    roundsById = {}; eventsById = {}; standingIdx = { driver: {}, codriver: {} };
    D.rounds.forEach(function (r) { roundsById[r.id] = r; });
    D.events.forEach(function (e) { eventsById[e.id] = e; });
    D.standings.drivers.forEach(function (r) { standingIdx.driver[r.id] = r; });
    D.standings.codrivers.forEach(function (r) { standingIdx.codriver[r.id] = r; });
    ROUND_IDS = D.rounds.map(function (r) { return r.id; });
    CLASS_DESC = {}; D.classes.forEach(function (c) { CLASS_DESC[c.id] = c.desc || ''; });
    var used = {}; D.rounds.forEach(function (r) { r.entries.forEach(function (e) { used[e.cls] = 1; }); });
    CLASSES = D.classes.filter(function (c) { return !c.classOnly || used[c.id]; }).map(function (c) { return c.id; });
    lastRound = D.rounds[D.rounds.length - 1] || null;
  }
  function eventOf(r) { return eventsById[r.eventId] || { id: r.eventId, name: r.eventId || 'Event', short: r.eventId || 'Event', dates: '', venue: '', surface: '', links: {} }; }
  function roundName(r) { return 'Round ' + r.n + ' · ' + eventOf(r).short; }
  function winnerOf(r) { for (var i = 0; i < r.entries.length; i++) if (r.entries[i].pos === 1) return r.entries[i]; return null; }
  function entryByCar(r, car) { for (var i = 0; i < r.entries.length; i++) if (r.entries[i].car === car) return r.entries[i]; return null; }
  function classifiedSorted(r) { return r.entries.filter(function (e) { return e.status === 'classified'; }).sort(function (a, b) { return a.pos - b.pos; }); }
  function orderedEntries(r) {
    var c = classifiedSorted(r);
    var rest = r.entries.filter(function (e) { return e.status !== 'classified'; }).sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'DNF' ? -1 : 1;
      return (b.stagesCompleted || 0) - (a.stagesCompleted || 0);
    });
    return c.concat(rest);
  }
  function unconfirmed() { return D.rounds.filter(function (r) { return !r.confirmed; }).map(function (r) { return 'R' + r.n; }); }
  function msaLink() { return D.msa && D.msa.url ? ext(D.msa.url, esc(D.msa.label || 'MSA standings')) : ''; }

  /* ------------------------------------------------------------------ routing */
  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var qi = h.indexOf('?'); var path = qi >= 0 ? h.slice(0, qi) : h; var qs = qi >= 0 ? h.slice(qi + 1) : '';
    var q = {};
    qs.split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); try { q[decodeURIComponent(i >= 0 ? kv.slice(0, i) : kv)] = decodeURIComponent(i >= 0 ? kv.slice(i + 1) : ''); } catch (e) { /* ignore bad query */ } });
    var parts = path.split('/').filter(Boolean), year = null;
    if (parts[0] && /^\d{4}$/.test(parts[0])) year = +parts.shift();
    return { parts: parts, q: q, path: path || '/', year: year };
  }
  function qstr(q) {
    var keys = Object.keys(q || {}).filter(function (k) { return q[k] != null && q[k] !== ''; });
    return keys.length ? '?' + keys.map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]).replace(/%2C/g, ','); }).join('&') : '';
  }
  function buildHash(path, q) { return '#' + SP + path + qstr(q); } // season-relative path, e.g. '/round/R4/graph'
  function sh(path) { return '#' + SP + (path || ''); }
  var lastPath = null;
  function setQuery(patch) {
    var cur = parseHash(); var q = {}; var k;
    for (k in cur.q) q[k] = cur.q[k];
    for (k in patch) q[k] = patch[k];
    var h = '#' + cur.path + qstr(q);
    var replaced = false;
    try { history.replaceState(null, '', h); replaced = true; } catch (err) { replaced = false; }
    if (replaced) render(); else location.hash = h;
  }

  /* ------------------------------------------------------------------ shell */
  var theme = null;
  try { theme = localStorage.getItem('nr-theme'); if (theme) document.documentElement.setAttribute('data-theme', theme); } catch (e) { theme = null; }
  function header(active) {
    var NAV = [['', 'Home', sh('')], ['standings', 'Standings', sh('/standings')], ['rounds', 'Rounds & graphs', sh('/rounds')], ['crews', 'Crews', sh('/crews')], ['info', 'Info', '#/info']];
    var links = NAV.map(function (n) {
      var on = n[0] === active || (n[0] === 'rounds' && active === 'round') || (n[0] === 'crews' && active === 'person') || (n[0] === 'info' && active === 'about');
      return '<a href="' + n[2] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
    var years = seasonList();
    var sel = years.length > 1 ? '<label class="season-sel"><span class="sr-only">Season</span><select id="seasonSel">' + years.map(function (y) {
      return '<option value="' + y + '"' + (y === YEAR ? ' selected' : '') + '>' + y + ' season</option>';
    }).join('') + '</select></label>' : '<span class="season-pill" title="Season">' + esc(YEAR) + '</span>';
    return '<header class="site-header"><div class="checker" aria-hidden="true"></div><div class="header-inner">' +
      '<a class="brand" href="#/" aria-label="' + esc(ST.site.siteName) + ' home">' + logoSvg() +
      '<span class="brand-text"><strong>' + esc(ST.site.siteName) + '</strong><span>' + esc(YEAR) + ' Championship</span></span></a>' +
      '<nav class="nav" aria-label="Main">' + links + '</nav>' + sel +
      '<button class="theme-btn" type="button" id="themeBtn" aria-label="Switch light or dark theme">' + themeIcon() + '</button>' +
      '</div></header>';
  }
  function logoSvg() {
    return '<img class="brand-mark" src="assets/brand.svg" alt="" width="40" height="40">';
  }
  function themeIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>'; }
  function footer() {
    var social = (ST.site.social || []).filter(function (s) { return safeUrl(s.url); });
    return '<footer class="footer"><div class="footer-inner"><span>' + esc(D.championship) + ' · Independently compiled, source-derived information.</span>' +
      '<span class="footer-links">' + social.map(function (s) { return ext(s.url, socialIcon(s.network) + '<span class="sr-only">' + esc(s.label) + '</span>', 'soc-mini'); }).join('') +
      '<a href="#/info">Info &amp; regulations</a><a href="' + sh('/about') + '">Sources &amp; data notes</a><a href="disclaimer.html">Independence &amp; disclaimer</a><a href="privacy.html">Privacy &amp; analytics</a></span></div></footer>';
  }

  /* ------------------------------------------------------------------ render */
  var mounts = [];
  function render() {
    var h = parseHash(); var parts = h.parts;
    if (!ST.site) return;
    var page = parts[0] || '';
    var year = h.year || YEAR || +ST.site.currentSeason;
    if (seasonList().indexOf(year) < 0) year = +ST.site.currentSeason;
    var need = page === 'person' ? seasonList() : [year];
    var missing = need.filter(function (y) { return !ST.models[y]; });
    if (missing.length) {
      if (!D) app.innerHTML = '<div class="loading" role="status"><div class="checker" aria-hidden="true"></div><p>Loading results…</p></div>';
      Promise.all(missing.map(loadSeason)).then(render, showLoadError);
      return;
    }
    useSeason(ST.models[year]);
    var view;
    mounts = []; charts = {}; chartSeq = 0;
    try {
      switch (page) {
        case '': view = viewHome(); break;
        case 'standings': view = viewStandings(parts[1] === 'codrivers' ? 'codriver' : 'driver', h.q); break;
        case 'rounds': view = viewRounds(); break;
        case 'round': view = viewRound(parts[1], parts[2] || 'graph', h.q); break;
        case 'crews': view = viewCrews(); break;
        case 'person': view = viewPerson(parts[1] ? decodeURIComponent(parts[1]) : ''); break;
        case 'about': view = viewAbout(); break;
        case 'info': view = viewInfo(); break;
        default: view = notFound();
      }
    } catch (err) {
      view = { title: 'Error', html: '<div class="card empty">Something went wrong showing this page.<br><span class="small mono">' + esc(err && err.message) + '</span></div>' };
      if (window.console) console.error(err);
    }
    var pathKey = h.path;
    var keepScroll = lastPath === pathKey ? window.scrollY : 0;
    app.innerHTML = header(page) + '<main id="main">' + view.html + '</main>' + footer();
    document.title = (view.title ? view.title + ' — ' : '') + ST.site.siteName + ' ' + YEAR;
    var tb = document.getElementById('themeBtn'); if (tb) tb.addEventListener('click', toggleTheme);
    var ss = document.getElementById('seasonSel');
    if (ss) ss.addEventListener('change', function () {
      var keep = { standings: 1, rounds: 1, crews: 1, about: 1 };
      location.hash = '#/' + ss.value + (keep[page] ? '/' + page + (page === 'standings' && parts[1] ? '/' + parts[1] : '') : '');
    });
    mounts.forEach(function (fn) { fn(); });
    window.scrollTo(0, keepScroll);
    lastPath = pathKey;
    if (window.NRAnalytics) window.NRAnalytics.page(h.parts, YEAR);
  }
  function showLoadError(err) {
    var kind = err && err.kind, title = kind === 'empty' ? 'Results coming soon' : kind === 'setup' ? 'Site not connected yet' : 'Results are temporarily unavailable';
    var help = kind === 'empty' ? 'No results have been published yet. Please check back later.' : kind === 'setup' ? 'The site administrator still needs to connect the results database.' : 'Please check your connection and try again in a few minutes.';
    app.innerHTML = '<main id="main"><div class="card empty"><h2>' + title + '</h2><p>' + help + '</p><p class="small muted">' + esc(err && err.message) + '</p></div></main>';
  }
  function toggleTheme() {
    var dark = theme ? theme === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    theme = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('nr-theme', theme); } catch (e) { /* storage unavailable */ }
  }
  function notFound() { return { title: 'Not found', html: '<div class="card empty"><h2>Page not found</h2><p><a href="' + sh('') + '">Back to the home page</a></p></div>' }; }

  /* ---------- home */
  function viewHome() {
    var d = D.standings.drivers, c = D.standings.codrivers;
    var html = '';
    var stages = D.rounds.reduce(function (a, r) { return a + r.stages.length; }, 0);
    var upcoming = D.calendar.filter(function (r) { return !r.hasResults; });
    html += '<section class="hero"><p class="hero-kicker">Gauteng · Limpopo · Mpumalanga · Free State · North West</p><p class="eyebrow">' + esc(D.championship) + '</p>' +
      '<h1>' + (D.rounds.length ? 'Every NR stage, time and point of ' + YEAR + '.' : 'The ' + YEAR + ' season.') + '</h1>' +
      '<p>' + esc(ST.site.tagline || '') + ' Independently compiled from classification documents.</p>' +
      '<div class="hero-stats">' + stat(D.rounds.length + (upcoming.length ? ' / ' + D.calendar.length : ''), 'Rounds run') + stat(D.events.length, 'Events') +
      stat(d.length, 'Drivers scored') + stat(stages, 'Special stages') + '</div>' +
      '<div class="hero-actions">' + (lastRound ? '<a class="btn primary" href="' + sh('/round/' + lastRound.id) + '">Open the latest stage graph</a><a class="btn ghost-dark" href="' + sh('/standings') + '">Championship standings</a>' :
        '<a class="btn primary" href="' + sh('/rounds') + '">See the calendar</a><a class="btn ghost-dark" href="#/info">Regulations &amp; info</a>') + '</div></section>';
    if (D.entryLists.length) html += '<p class="small muted">' + D.entryLists.reduce(function (n, l) { return n + l.eventEntries; }, 0) +
      ' documented event crew entries across ' + D.entryLists.length + ' / ' + D.events.length +
      ' events with entry evidence (event entries counted once, not once per day). Entry coverage may be partial; entry does not prove a start.</p>';
    if (!D.rounds.length) {
      html += '<div class="section"><div class="card empty"><h2>No results yet</h2><p>Standings and stage graphs appear here once the first ' + YEAR + ' round has an official classification.</p></div></div>';
      html += '<div class="section"><div class="section-head"><h2>The ' + YEAR + ' calendar</h2></div>' + eventCards() + '</div>';
      return { title: 'Home', html: html };
    }
    if (!d.length) return { title: 'Home', html: html + '<div class="section"><div class="card empty"><h2>No scored starts yet</h2><p>Documented entries remain in crew profiles; entries and DNS do not create championship starts.</p></div>' + eventCards() + '</div>' };
    var prov = unconfirmed();
    if (prov.length) {
      html += '<div class="callout warn" style="margin-top:16px"><div><b>Points for ' + roundList(prov) + ' are calculated on this site.</b> They apply the NR points scale to the official classifications' +
        (D.msa && D.msa.url ? '; ' + msaLink() + (D.msa.generated ? ' (' + esc(D.msa.generated) + ')' : '') + ' cover' + (D.msa.confirmedRounds && D.msa.confirmedRounds.length === 1 ? 's ' : ' ') + roundList(D.msa.confirmedRounds || []) : '') +
        '. Treat them as provisional until MSA publishes.</div></div>';
    }
    var champD = d[0], champC = c[0];
    html += '<div class="section"><div class="section-head"><h2>Championship leaders</h2><a class="go" href="' + sh('/standings') + '">Full standings →</a></div><div class="grid grid-3">';
    var lead = d[1] ? champD.total - d[1].total : 0;
    html += '<div class="card champ"><p class="eyebrow">Driver leader' + (prov.length ? ' · provisional' : '') + '</p><h3>' + plink(champD.name) + '</h3><p>' + champD.total + ' points · ' + esc(champD.cls) + ' · ' + starts(champD.starts) + (d[1] ? ' · ' + lead + ' clear of ' + esc(surname(d[1].name)) : '') + '</p>' +
      miniBars(champD) + (champC ? '<p class="small" style="margin-top:12px">Co-driver leader: <b>' + plink(champC.name) + '</b> · ' + champC.total + ' pts</p>' : '') + '</div>';
    html += leaderCard('Drivers', d.slice(0, 5), 'driver') + leaderCard('Co-drivers', c.slice(0, 5), 'codriver') + '</div></div>';
    html += '<div class="section"><div class="section-head"><h2>Class leaders · drivers</h2></div><div class="grid grid-4">';
    CLASSES.forEach(function (cl) {
      var rows = d.filter(function (r) { return r.cls === cl; }).slice(0, 3);
      if (!rows.length) return;
      html += '<div class="card tight"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' + clsTag(cl) + '<a class="small" href="' + buildHash('/standings', { 'class': cl }) + '">Table →</a></div>' +
        rows.map(function (r, i) { return '<div class="leader"><span class="pos' + (i < 3 ? ' p' + (i + 1) : '') + '">' + (i + 1) + '</span><div class="who">' + plink(r.name) + '<div>' + starts(r.starts) + '</div></div><div class="pts">' + r.total + '<small>pts</small></div></div>'; }).join('') + '</div>';
    });
    html += '</div></div>';
    html += '<div class="section"><div class="section-head"><h2>The ' + YEAR + ' rounds</h2><a class="go" href="' + sh('/rounds') + '">All rounds →</a></div>' + eventCards() + '</div>';
    return { title: 'Home', html: html };
  }
  function miniBars(row) {
    var max = Math.max(1, (D.pointsScale.overall[0] || 0) + (D.pointsScale.cls[0] || 0));
    return '<div class="minibars" aria-label="Points per round">' + D.rounds.map(function (r) {
      var v = row.rounds[r.id]; var pts = v ? v.pts : 0;
      return '<div class="mb" title="R' + r.n + ': ' + (v ? (v.status === 'DNF' ? 'DNF' : pts + ' pts') : 'did not start') + '"><i style="height:' + Math.max(3, pts / max * 56) + 'px' + (v ? '' : ';opacity:.25') + '"></i><span>' + (v ? (v.status === 'DNF' ? '—' : pts) : '') + '</span><em>R' + r.n + '</em></div>';
    }).join('') + '</div>';
  }
  function stat(v, l) { return '<div class="hero-stat"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function leaderCard(title, rows, role) {
    return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><h3>' + title + '</h3><a class="small" href="' + sh('/standings' + (role === 'codriver' ? '/codrivers' : '')) + '">Table →</a></div>' +
      rows.map(function (r) {
        return '<div class="leader"><span class="pos' + (r.rank <= 3 ? ' p' + r.rank : '') + '">' + r.rank + '</span><div class="who">' + plink(r.name) + '<div>' + clsTag(r.cls) + ' ' + starts(r.starts) + '</div></div><div class="pts">' + r.total + '<small>pts</small></div></div>';
      }).join('') + '</div>';
  }
  function eventLinks(ev) {
    var L = ev.links || {};
    var items = [['results', 'Official results'], ['entryList', 'Entry list'], ['srs', 'Supplementary regs'], ['noticeboard', 'Noticeboard'], ['spectatorGuide', 'Spectator guide']]
      .map(function (k) { return ext(L[k[0]], esc(k[1]) + ' ↗'); }).filter(Boolean);
    return items.length ? '<div class="ev-links">' + items.join('') + '</div>' : '';
  }
  function eventCards() {
    if (!D.events.length) return '<div class="card empty">No events have been added to the ' + YEAR + ' calendar yet.</div>';
    return '<div class="grid events-grid">' + D.events.map(function (ev) {
      var list = D.entryLists.filter(function (l) { return l.eventId === ev.id; })[0];
      function upcomingEntries(id) {
        if (!list) return '';
        var count = list.entries.filter(function (e) { return e.roundIds.indexOf(id) >= 0; }).length;
        var unknown = list.entries.some(function (e) { return !e.roundIds.length; });
        var complete = list.complete && list.roundIds.indexOf(id) >= 0 && !unknown;
        var note = count || complete ? count + ' documented round ' + (count === 1 ? 'entry' : 'entries') +
          (complete ? '' : ' (partial day coverage)') : 'round entry coverage ' + (unknown ? 'unknown' : 'incomplete');
        if (unknown && count) note += '; other entries have unknown day scope';
        return '<span class="small muted">' + note + '</span>';
      }
      var rows = D.calendar.filter(function (c) { return c.eventId === ev.id; }).map(function (c) {
        var r = roundsById[c.id];
        if (!r) return '<div class="event-round upcoming"><span class="rnd">R' + c.n + '</span><span class="w"><b>' + (c.date ? fmtDate(c.date) : 'Date to be confirmed') + '</b><span>' + esc(c.day) + ' · results not published yet</span>' + upcomingEntries(c.id) + '</span><span class="go muted">Upcoming</span></div>';
        var w = winnerOf(r);
        return '<a class="event-round" href="' + sh('/round/' + r.id) + '"><span class="rnd">R' + r.n + '</span><span class="w">' + (w ? '<b>' + esc(w.driver) + '</b> / ' + esc(w.codriver) : '—') +
          '<span>' + esc(r.day) + ' · ' + r.stages.length + ' stages · ' + classifiedSorted(r).length + ' classified' + (classificationState(r) === 'provisional' ? ' · provisional sheet' : classificationState(r) === 'unclear' ? ' · finality unclear' : '') + '</span></span><span class="go">Graph →</span></a>';
      }).join('');
      var entryNote = list ? '<p class="small muted">' + list.eventEntries + ' documented event entries' +
        (list.complete ? '' : ' (partial coverage)') + '; day scope only where evidenced. ' + ext(list.source.url, 'Entry source') + '</p>' : '';
      return '<div class="card event-card"><div class="event-top"><h3>' + esc(ev.name) + '</h3><div class="meta">' + [ev.dates, ev.venue, ev.surface].filter(Boolean).map(esc).join(' · ') + '</div>' + eventLinks(ev) + entryNote + '</div><div class="event-rounds">' + (rows || '<div class="event-round upcoming"><span class="w"><span>No rounds added yet</span></span></div>') + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- standings */
  function viewStandings(role, q) {
    var rows = role === 'driver' ? D.standings.drivers : D.standings.codrivers;
    var cls = CLASSES.indexOf(q['class']) >= 0 ? q['class'] : '';
    var shown = cls ? rows.filter(function (r) { return r.cls === cls; }) : rows;
    var showBreak = q.pts === 'split';
    var base = '/standings' + (role === 'codriver' ? '/codrivers' : '');
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' standings</p><h1>' + (role === 'driver' ? 'Drivers' : 'Co-drivers') + (cls ? ' · ' + cls : '') + '</h1>' +
      '<p>Overall position points plus class points, added together per round. Crews must start at least ' + D.minStarts + ' rounds to be eligible.</p></div>' +
      '<div class="seg" role="tablist"><a href="' + buildHash('/standings', { 'class': cls }) + '" class="' + (role === 'driver' ? 'on' : '') + '">Drivers</a><a href="' + buildHash('/standings/codrivers', { 'class': cls }) + '" class="' + (role === 'codriver' ? 'on' : '') + '">Co-drivers</a></div></div>';
    if (!D.rounds.length) return { title: 'Standings', html: html + '<div class="card empty">No ' + YEAR + ' results yet.</div>' };
    html += '<div class="filters"><div class="seg">' + [''].concat(CLASSES).map(function (c) {
      return '<a href="' + buildHash(base, { 'class': c, pts: q.pts }) + '" class="' + (c === cls ? 'on' : '') + '">' + (c || 'All classes') + '</a>';
    }).join('') + '</div><div class="seg"><a href="' + buildHash(base, { 'class': cls }) + '" class="' + (showBreak ? '' : 'on') + '">Points</a><a href="' + buildHash(base, { 'class': cls, pts: 'split' }) + '" class="' + (showBreak ? 'on' : '') + '">Overall + class split</a></div></div>';
    if (cls) html += '<p class="small muted" style="margin:-4px 0 12px">' + esc(CLASS_DESC[cls]) + ' This view filters the overall table and adds a class-points column.</p>';
    var head = '<tr><th class="num sticky s-pos">' + (cls ? 'Cls' : 'Pos') + '</th><th class="sticky s-name">' + (role === 'driver' ? 'Driver' : 'Co-driver') + '</th><th class="num m-only">Total</th>' + (cls ? '<th class="num">Overall</th>' : '<th>Class</th>') +
      D.rounds.map(function (r) {
        return '<th class="num" title="' + esc(eventOf(r).name + ' · ' + r.day) + '"><a href="' + sh('/round/' + r.id) + '">R' + r.n + '</a>' + (r.confirmed ? '' : '<span class="note-mark" title="Calculated on this site from the official classification; not yet in the MSA standings">†</span>') + '<br><span class="muted" style="font-size:10px;letter-spacing:0">' + esc(eventOf(r).short) + '</span></th>';
      }).join('') + (cls ? '<th class="num">Class pts</th>' : '') + '<th class="num d-only">Total</th><th class="num">Starts</th></tr>';
    var body = '', seenInel = false, ci = 0;
    shown.forEach(function (r) {
      ci++;
      var sepCls = (!r.eligible && !seenInel) ? ' sep' : ''; if (!r.eligible) seenInel = true;
      var classPts = 0;
      var cells = D.rounds.map(function (rd) {
        var v = r.rounds[rd.id];
        if (!v) return '<td class="num muted" title="Did not start">–</td>';
        classPts += v.c;
        var tip = v.status === 'DNF' ? 'DNF (started, 0 points)' + (v.msaOnly ? ' — start recorded by MSA; car not on the sheet' : '') :
          ord(v.pos) + ' overall (' + v.o + ') + ' + ord(v.classPos) + ' in ' + v.cls + ' (' + v.c + ') · car ' + v.car;
        var inner = showBreak ? '<span class="ptcell' + (v.pts ? '' : ' zero') + '"><b>' + v.pts + '</b><small>' + (v.status === 'DNF' ? 'DNF' : v.o + '+' + v.c) + '</small></span>'
          : (v.status === 'DNF' ? '<span class="dnf-cell">DNF</span>' : '<span class="ptcell"><b>' + v.pts + '</b></span>');
        return '<td class="num" title="' + esc(tip) + '">' + inner + '</td>';
      }).join('');
      body += '<tr class="' + (r.eligible ? '' : 'inel') + sepCls + '"><td class="num sticky s-pos">' + (cls ? ci : r.rank) + '</td><td class="nowrap sticky s-name">' + plink(r.name) + (r.eligible ? '' : '<span class="note-mark" title="Fewer than ' + D.minStarts + ' starts — not eligible for the championship">*</span>') + '</td><td class="num total m-only">' + r.total + '</td>' +
        (cls ? '<td class="num">' + r.rank + '</td>' : '<td>' + clsTag(r.cls) + '</td>') + cells + (cls ? '<td class="num">' + classPts + '</td>' : '') +
        '<td class="num total d-only">' + r.total + '</td><td class="num">' + r.starts + '</td></tr>';
    });
    html += '<div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    var prov = unconfirmed();
    html += '<div class="legend-row"><span><b>*</b> fewer than ' + D.minStarts + ' starts — listed after eligible crews</span>' + (prov.length ? '<span><b>†</b> calculated here from the official classification, not yet confirmed by MSA</span>' : '') + '<span>– did not start · DNF scores 0</span><span>Ties: most 1st places, then 2nd places…</span></div>';
    var conf = D.rounds.filter(function (r) { return r.confirmed; }).map(function (r) { return 'R' + r.n; });
    if (conf.length && D.msa) html += '<div class="notes">' + roundList(conf) + ' points have been checked against the ' + msaLink() + (D.msa.generated ? ' (' + esc(D.msa.generated) + ')' : '') + '. Where the official sheet and the MSA points disagree on a class or a crew member, the MSA standings are followed — see <a href="' + sh('/about') + '">data notes</a>.</div>';
    return { title: (role === 'driver' ? 'Driver' : 'Co-driver') + ' standings', html: html };
  }

  /* ---------- rounds list */
  function viewRounds() {
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' season</p><h1>Rounds &amp; stage graphs</h1><p>Each day of a two-day event is a separate Northern Regions round with its own classification. Pick a round to see the stage-by-stage graph, the official classification and every stage time.</p></div></div>';
    html += eventCards();
    if (D.rounds.length) {
      html += '<div class="section"><div class="section-head"><h2>Round winners</h2></div><div class="table-wrap"><table class="data"><thead><tr><th>Round</th><th>Event</th><th>Date</th><th class="num">Stages</th><th>Winner</th>' + CLASSES.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th>Sheet</th></tr></thead><tbody>' +
        D.rounds.map(function (r) {
          var w = winnerOf(r);
          var cw = CLASSES.map(function (c) { var e = classifiedSorted(r).filter(function (x) { return x.cls === c; })[0]; return '<td class="nowrap">' + (e ? esc(surname(e.champDriver)) : '<span class="muted">—</span>') + '</td>'; }).join('');
          return '<tr><td><a href="' + sh('/round/' + r.id) + '"><b>R' + r.n + '</b></a></td><td class="nowrap">' + esc(eventOf(r).short) + ' · ' + esc(r.day.split(' (')[0]) + '</td><td class="nowrap">' + fmtDate(r.date) + '</td><td class="num">' + r.stages.length + '</td><td class="nowrap">' + (w ? '<b>' + esc(w.driver) + '</b>' : '—') + '</td>' + cw +
            '<td>' + classificationBadge(r) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    return { title: 'Rounds', html: html };
  }

  /* ---------- round */
  var METRICS = [
    { id: 'pos', label: 'NR position', kind: 'rank', final: true, help: 'Position among Northern Regions crews after each stage (stage times only). “Final” is the official classification, including penalties.' },
    { id: 'gap', label: 'Gap to leader', kind: 'time', final: true, help: 'Cumulative time behind the NR leader after each stage. “Final” uses official totals, including penalties.' },
    { id: 'cpos', label: 'Class position', kind: 'rank', final: true, help: 'Position within each crew\'s class after each stage. “Final” is the official class order.' },
    { id: 'cgap', label: 'Class gap', kind: 'time', final: true, help: 'Cumulative time behind the leader of the same class after each stage.' },
    { id: 'loss', label: 'Time lost', kind: 'time', final: false, help: 'Time lost to the fastest NR time on each stage (official stage times).' },
    { id: 'spos', label: 'Stage result', kind: 'rank', final: false, help: 'Official stage position printed on the classification.' }
  ];
  function metricById(id) { for (var i = 0; i < METRICS.length; i++) if (METRICS[i].id === id) return METRICS[i]; return METRICS[0]; }
  function seriesValues(r, car, metric) {
    var p = r.progression[car], e = entryByCar(r, car);
    if (!p || !e) return [];
    switch (metric.id) {
      case 'pos': return p.pos;
      case 'cpos': return p.cpos;
      case 'gap': return p.gap;
      case 'cgap': return p.cgap;
      case 'loss': return p.delta;
      case 'spos': return e.stagePos;
    }
    return [];
  }

  function viewRound(id, tab, q) {
    var r = roundsById[id];
    if (!r) {
      var c = D.calendar.filter(function (x) { return x.id === id; })[0];
      if (!c) return notFound();
      var ev0 = eventsById[c.eventId] || { name: 'Round ' + c.n, links: {} };
      return { title: 'R' + c.n, html: '<div class="page-head"><div><p class="eyebrow">Round ' + c.n + ' · ' + esc(c.day) + '</p><h1>' + esc(ev0.name) + '</h1><div class="round-meta"><span>' + (c.date ? fmtDate(c.date) : 'Date to be confirmed') + '</span></div></div></div>' +
        '<div class="card empty"><h2>Results not published yet</h2><p>The stage graph and classification appear here once the official classification for this round has been added.</p>' + eventLinks(ev0) + '</div>' };
    }
    var ev = eventOf(r);
    var idx = ROUND_IDS.indexOf(id);
    var html = '<div class="round-switch" aria-label="Rounds">' + D.rounds.map(function (x) {
      return '<a href="' + sh('/round/' + x.id + '/' + tab) + '" class="' + (x.id === id ? 'on' : '') + '" title="' + esc(eventOf(x).name + ' · ' + x.day) + '">R' + x.n + ' ' + esc(eventOf(x).short) + '</a>';
    }).join('') + '</div>';
    html += '<div class="page-head"><div><p class="eyebrow">Round ' + r.n + ' of ' + D.calendar.length + ' · ' + esc(r.day) + '</p><h1>' + esc(ev.name) + '</h1>' +
      '<div class="round-meta">' + [fmtDate(r.date), esc(ev.venue), esc(ev.surface)].filter(Boolean).map(function (x) { return '<span>' + x + '</span>'; }).join('<span class="sep">/</span>') + '<span class="sep">/</span><span>' + r.stages.length + ' stages (' + esc(r.stages[0]) + '–' + esc(r.stages[r.stages.length - 1]) + ')</span>' +
      classificationBadge(r, true) +
      (r.confirmed ? '<span class="badge final" title="Points match the MSA standings">Points match MSA</span>' : '<span class="badge calc" title="Points calculated on this site">Points calculated</span>') + '</div></div>' +
      '<div style="display:flex;gap:8px">' + (idx > 0 ? '<a class="btn" href="' + sh('/round/' + ROUND_IDS[idx - 1] + '/' + tab) + '">← R' + roundsById[ROUND_IDS[idx - 1]].n + '</a>' : '') + (idx < ROUND_IDS.length - 1 ? '<a class="btn" href="' + sh('/round/' + ROUND_IDS[idx + 1] + '/' + tab) + '">R' + roundsById[ROUND_IDS[idx + 1]].n + ' →</a>' : '') + '</div></div>';
    var tabs = [['graph', 'Stage graph'], ['classification', 'Classification'], ['stages', 'Stage times']];
    html += '<nav class="tabs" aria-label="Round views">' + tabs.map(function (t) {
      var qs = t[0] === 'graph' ? { cars: q.cars, m: q.m } : {};
      return '<a href="' + buildHash('/round/' + id + '/' + t[0], qs) + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</a>';
    }).join('') + '</nav>';
    if (tab === 'classification') html += roundClassification(r);
    else if (tab === 'stages') html += roundStageTimes(r);
    else html += roundGraph(r, q);
    html += roundNotes(r);
    return { title: 'R' + r.n + ' ' + ev.short + ' — ' + (tab === 'graph' ? 'stage graph' : tab), html: html };
  }

  function selectedCars(r, q) {
    var cars;
    if (q.cars != null) cars = q.cars.split(',').filter(function (c) { return entryByCar(r, c); });
    else cars = classifiedSorted(r).slice(0, 5).map(function (e) { return e.car; });
    var seen = {}; return cars.filter(function (c) { if (seen[c]) return false; seen[c] = 1; return true; }).slice(0, PALETTE.length);
  }
  function colorFor(cars, car) { var i = cars.indexOf(car); return i >= 0 ? PALETTE[i % PALETTE.length] : null; }

  function roundGraph(r, q) {
    var metric = metricById(q.m || 'pos');
    var cars = selectedCars(r, q);
    var ents = orderedEntries(r);
    var picker = '<div class="card picker" aria-label="Choose cars"><h3>Cars to plot</h3><div class="quick">' +
      '<button type="button" data-quick="top5">Top 5</button><button type="button" data-quick="all">All</button><button type="button" data-quick="none">Clear</button>' +
      CLASSES.filter(function (c) { return r.entries.some(function (e) { return e.cls === c; }); }).map(function (c) { return '<button type="button" data-quick="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') +
      '</div><div class="car-list">' + ents.map(function (e) {
        var on = cars.indexOf(e.car) >= 0; var c = colorFor(cars, e.car) || 'var(--accent)';
        var res = e.status === 'classified' ? 'P' + e.pos : e.status;
        return '<button type="button" class="car-btn" data-car="' + esc(e.car) + '" aria-pressed="' + on + '" style="--c:' + c + '"><span class="dot"></span><span class="no">' + esc(e.car) + '</span>' +
          '<span class="nm"><b>' + esc(e.driver) + '</b><span>' + esc(e.codriver) + ' · ' + esc(e.cls) + '</span></span><span class="res">' + res + '</span></button>';
      }).join('') + '</div><p class="small muted" style="margin:10px 2px 0">Pick two cars for a head-to-head.</p></div>';
    var mbar = '<div class="metric-bar"><div class="seg" role="tablist" aria-label="Measure">' + METRICS.map(function (m) {
      return '<button type="button" data-metric="' + m.id + '" class="' + (m.id === metric.id ? 'on' : '') + '" aria-pressed="' + (m.id === metric.id) + '">' + m.label + '</button>';
    }).join('') + '</div></div>';
    var labels = metric.final ? r.labels : r.stages;
    var series = cars.map(function (car) {
      var e = entryByCar(r, car); var vals = seriesValues(r, car, metric).slice(0, labels.length);
      var end = e.status !== 'classified' ? e.status : null;
      return { key: car, label: '#' + car + ' ' + surname(e.driver), color: colorFor(cars, car), values: vals, end: end, entry: e };
    });
    var chartHtml = cars.length ? lineChart({ labels: labels, series: series, kind: metric.kind, finalCol: metric.final, title: metric.label + ' — ' + roundName(r), metric: metric }) :
      '<div class="empty">Choose one or more cars to draw the graph.</div>';
    var legend = cars.length ? '<div class="legend">' + series.map(function (s) {
      return '<button type="button" data-hl="' + esc(s.key) + '"><i style="background:' + s.color + '"></i>#' + esc(s.key) + ' ' + esc(s.entry.driver) + (s.end ? ' <span class="muted">(' + s.end + ')</span>' : '') + '</button>';
    }).join('') + '</div>' : '';
    var html = '<div class="graph-layout">' + picker + '<div>' + mbar + '<div class="card chart-card"><div class="chart-title"><h3>' + esc(metric.label) + '</h3><p>' + esc(metric.help) + '</p></div>' + legend + chartHtml + '</div>';
    if (cars.length === 2) html += headToHead(r, cars[0], cars[1]);
    if (cars.length) html += selectedStageTable(r, cars);
    html += '</div></div>';
    mounts.push(function () { mountGraphControls(r, cars); });
    return html;
  }

  function mountGraphControls(r, cars) {
    Array.prototype.forEach.call(app.querySelectorAll('.car-btn'), function (b) {
      b.addEventListener('click', function () {
        var car = b.getAttribute('data-car'); var next = cars.slice(); var i = next.indexOf(car);
        if (i >= 0) next.splice(i, 1); else { if (next.length >= PALETTE.length) next.shift(); next.push(car); }
        setQuery({ cars: next.join(',') || ',' });
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-quick]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-quick'); var list;
        var withTimes = function (e) { return e.times.some(function (t) { return t != null; }); };
        if (k === 'top5') list = classifiedSorted(r).slice(0, 5);
        else if (k === 'all') list = orderedEntries(r).filter(withTimes).slice(0, PALETTE.length);
        else if (k === 'none') list = [];
        else list = orderedEntries(r).filter(function (e) { return e.cls === k && withTimes(e); }).slice(0, PALETTE.length);
        setQuery({ cars: list.map(function (e) { return e.car; }).join(',') || ',' });
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-metric]'), function (b) {
      b.addEventListener('click', function () { setQuery({ m: b.getAttribute('data-metric') }); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-hl]'), function (b) {
      b.addEventListener('mouseenter', function () { highlight(b.getAttribute('data-hl')); });
      b.addEventListener('mouseleave', function () { highlight(null); });
      b.addEventListener('focus', function () { highlight(b.getAttribute('data-hl')); });
      b.addEventListener('blur', function () { highlight(null); });
    });
  }
  function highlight(key) {
    Array.prototype.forEach.call(app.querySelectorAll('.chart .series'), function (g) {
      g.classList.toggle('dim', !!key && g.getAttribute('data-key') !== key);
    });
  }

  /* ---------- charts */
  var charts = {};
  var chartSeq = 0;
  function responsive(drawFn, extraHtml, onMount) {
    var id = 'c' + (++chartSeq);
    charts[id] = { draw: drawFn, onMount: onMount };
    mounts.push(function () { fitChart(id); });
    return '<div class="chart" id="chart-' + id + '"><div class="svgwrap">' + drawFn(960) + '</div>' + (extraHtml || '') + '</div>';
  }
  function fitChart(id) {
    var el = document.getElementById('chart-' + id); var ch = charts[id]; if (!el || !ch) return;
    var w = Math.round(el.clientWidth);
    if (w > 0 && w !== ch.w) { ch.w = w; el.querySelector('.svgwrap').innerHTML = ch.draw(Math.max(300, w)); }
    if (ch.onMount) ch.onMount(el, ch);
  }
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { Object.keys(charts).forEach(fitChart); }, 120);
  });
  function niceStep(span, maxTicks) {
    var steps = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= maxTicks) return steps[i];
    return steps[steps.length - 1];
  }
  function lineChart(cfg) {
    var vals = []; cfg.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) vals.push(v); }); });
    if (!vals.length) return '<div class="empty">No times for the selected cars in this view.</div>';
    var geo = {};
    function draw(W) {
      var small = W < 620;
      var H = Math.round(Math.max(280, Math.min(440, W * (small ? 0.78 : 0.46))));
      var m = { l: small ? 44 : 58, r: small ? 24 : 30, t: 16, b: 40 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b, n = cfg.labels.length;
      var x = function (i) { return m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); };
      var y, ticks = [], fmt;
      if (cfg.kind === 'rank') {
        var hi = Math.max(3, Math.max.apply(null, vals));
        y = function (v) { return m.t + ((v - 1) / (hi - 1)) * ih; };
        var st = hi <= (small ? 8 : 12) ? 1 : hi <= 24 ? 2 : 5;
        for (var t = 1; t <= hi; t += st) ticks.push(t);
        if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
        fmt = function (v) { return 'P' + v; };
      } else {
        var mx = Math.max.apply(null, vals); if (mx <= 0) mx = 10;
        var step = niceStep(mx, small ? 4 : 6); var top = Math.ceil(mx / step) * step;
        y = function (v) { return m.t + (v / top) * ih; };
        for (var tt = 0; tt <= top + 1e-6; tt += step) ticks.push(tt);
        fmt = function (v) { return v === 0 ? '0' : '+' + fmtShort(v); };
      }
      geo.x = x; geo.W = W;
      var rad = small ? 3.5 : 4.5;
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(cfg.title) + '">';
      if (cfg.finalCol && n > 1) { var fx = x(n - 1), half = (iw / (n - 1)) / 2; s += '<rect class="final-band" x="' + (fx - half * 0.9) + '" y="' + m.t + '" width="' + (half * 0.9 + m.r - 4) + '" height="' + ih + '" rx="6"/>'; }
      s += '<g class="grid">' + ticks.map(function (t) { return '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"' + (t === 0 && cfg.kind !== 'rank' ? ' class="zero"' : '') + '/>'; }).join('') + '</g>';
      s += '<g class="axis">' + ticks.map(function (t) { return '<text x="' + (m.l - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + fmt(t) + '</text>'; }).join('');
      var every = small && n > 8 ? 2 : 1;
      s += cfg.labels.map(function (l, i) { if (i % every && i !== n - 1) return ''; return '<text class="lbl" x="' + x(i) + '" y="' + (H - m.b + 22) + '" text-anchor="middle">' + esc(l) + '</text>'; }).join('') + '</g>';
      cfg.series.forEach(function (se) {
        var segs = [], cur = [];
        se.values.forEach(function (v, i) { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(v)]); });
        if (cur.length) segs.push(cur);
        s += '<g class="series" data-key="' + esc(se.key) + '">';
        segs.forEach(function (seg) { s += '<path d="' + seg.map(function (p, j) { return (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('') + '" stroke="' + se.color + '"/>'; });
        se.values.forEach(function (v, i) { if (v != null) s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + rad + '" fill="' + se.color + '"/>'; });
        var last = -1; se.values.forEach(function (v, i) { if (v != null) last = i; });
        if (last >= 0 && se.end && last < n - 1) {
          var lx = x(last), ly = y(se.values[last]);
          s += '<path d="M' + (lx - 6) + ' ' + (ly - 6) + 'L' + (lx + 6) + ' ' + (ly + 6) + 'M' + (lx + 6) + ' ' + (ly - 6) + 'L' + (lx - 6) + ' ' + (ly + 6) + '" stroke="' + se.color + '" stroke-width="3"/>';
          s += '<text x="' + (lx + 9) + '" y="' + (ly - 8) + '" fill="' + se.color + '">' + esc(se.end) + '</text>';
        }
        s += '</g>';
      });
      s += '<line class="cursor" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" visibility="hidden"/>';
      var colW = n > 1 ? iw / (n - 1) : iw;
      for (var i = 0; i < n; i++) s += '<rect class="hit" data-i="' + i + '" x="' + (x(i) - colW / 2) + '" y="' + m.t + '" width="' + colW + '" height="' + (ih + 30) + '"/>';
      return s + '</svg>';
    }
    return responsive(draw, '<div class="tip" hidden></div>', function (el) { bindLineHover(el, cfg, geo); });
  }
  function bindLineHover(el, cfg, geo) {
    var svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cursor = el.querySelector('.cursor');
    if (!svg || !tip || !cursor) return;
    var metric = cfg.metric;
    function show(i) {
      var rows = cfg.series.map(function (se) { return { se: se, v: se.values[i] }; }).filter(function (o) { return o.v != null; });
      rows.sort(function (a, b) { return a.v - b.v; });
      var label = cfg.labels[i] === 'Final' ? 'Final (official, incl. penalties)' : 'After ' + cfg.labels[i];
      if (metric.id === 'loss' || metric.id === 'spos') label = cfg.labels[i];
      tip.innerHTML = '<h4>' + esc(label) + '</h4>' + (rows.length ? rows.map(function (o) {
        var val = metric.kind === 'rank' ? 'P' + o.v : (o.v < 0.05 ? (metric.id === 'loss' ? 'fastest' : 'leader') : '+' + fmtTime(o.v));
        return '<div class="row"><i style="background:' + o.se.color + '"></i><span>' + esc(o.se.label) + '</span><b>' + val + '</b></div>';
      }).join('') : '<div class="muted">No times</div>');
      var rect = svg.getBoundingClientRect(), scale = rect.width / geo.W, px = geo.x(i) * scale;
      cursor.setAttribute('x1', geo.x(i)); cursor.setAttribute('x2', geo.x(i)); cursor.setAttribute('visibility', 'visible');
      tip.hidden = false;
      var tw = tip.offsetWidth, left = px + 14; if (left + tw > rect.width) left = px - tw - 14; if (left < 0) left = Math.max(0, (rect.width - tw) / 2);
      tip.style.left = left + 'px'; tip.style.top = '8px';
    }
    function hide() { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); }
    Array.prototype.forEach.call(el.querySelectorAll('.hit'), function (h) {
      var i = +h.getAttribute('data-i');
      h.addEventListener('mouseenter', function () { show(i); });
      h.addEventListener('click', function () { show(i); });
    });
    el.onmouseleave = hide;
  }
  function barChart(cfg) {
    var html = responsive(function (W) { return barSvg(cfg, W).svg; });
    return html + barSvg(cfg, 960).note;
  }
  function barSvg(cfg, W) {
    var small = W < 620;
    var H = small ? 240 : 280, m = { l: small ? 44 : 58, r: 14, t: 26, b: 40 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, n = cfg.labels.length;
    var vals = cfg.values.filter(function (v) { return v != null; });
    if (!vals.length) return { svg: '<div class="empty">No common stage times.</div>', note: '' };
    var abs = vals.map(Math.abs).filter(function (v) { return v > 0.05; }).sort(function (a, b) { return a - b; });
    var mx = Math.max(1, abs.length ? abs[abs.length - 1] : 1);
    var med = abs.length ? abs[Math.floor(abs.length / 2)] : 1;
    var cap = Math.max(10, med * 4);
    var capped = mx > cap * 1.5;
    var lim = capped ? cap : mx;
    var step = niceStep(lim, 3); var top = Math.ceil(lim / step) * step;
    var y = function (v) { var c = Math.max(-top, Math.min(top, v)); return m.t + ih / 2 - (c / top) * (ih / 2); };
    var bw = Math.min(46, iw / n * 0.6);
    var x = function (i) { return m.l + (i + 0.5) * (iw / n); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(cfg.title) + '" style="--c1:' + cfg.c1 + ';--c2:' + cfg.c2 + '">';
    var ticks = []; for (var t = -top; t <= top + 1e-6; t += step) ticks.push(t);
    s += '<g class="grid">' + ticks.map(function (t) { return '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"' + (t === 0 ? ' class="zero"' : '') + '/>'; }).join('') + '</g>';
    s += '<g class="axis">' + ticks.map(function (t) { return '<text x="' + (m.l - 10) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + (t === 0 ? '0' : fmtShort(Math.abs(t))) + '</text>'; }).join('') +
      cfg.labels.map(function (l, i) { return '<text class="lbl" x="' + x(i) + '" y="' + (H - m.b + 22) + '" text-anchor="middle">' + esc(l) + '</text>'; }).join('') + '</g>';
    cfg.values.forEach(function (v, i) {
      if (v == null || Math.abs(v) < 0.05) return;
      var y0 = y(0), y1 = y(v), over = Math.abs(v) > top;
      var top_ = Math.min(y0, y1), h = Math.abs(y1 - y0);
      s += '<rect class="' + (v > 0 ? 'bar-pos' : 'bar-neg') + '" x="' + (x(i) - bw / 2) + '" y="' + top_ + '" width="' + bw + '" height="' + h + '" rx="4"><title>' + esc(cfg.labels[i] + ': ' + (v > 0 ? cfg.aName : cfg.bName) + ' quicker by ' + fmtDiff(v)) + '</title></rect>';
      if (over) { var zy = v > 0 ? top_ + 10 : top_ + h - 10; s += '<path d="M' + (x(i) - bw / 2) + ' ' + zy + 'l' + bw / 4 + ' -5l' + bw / 4 + ' 10l' + bw / 4 + ' -10l' + bw / 4 + ' 5" stroke="var(--surface)" stroke-width="3" fill="none"/>'; }
      var ly = v > 0 ? top_ - 6 : top_ + h + 14;
      s += '<text x="' + x(i) + '" y="' + ly + '" text-anchor="middle" style="font-size:' + (small ? 10 : 11.5) + 'px;font-weight:800;fill:' + (v > 0 ? cfg.c1 : cfg.c2) + '">' + fmtDiff(v) + '</text>';
    });
    s += '</svg>';
    return { svg: s, note: capped ? '<p class="small muted" style="margin:2px 6px 0">Bars over ' + fmtShort(top) + ' are cut short (zig-zag); the label shows the full difference.</p>' : '' };
  }

  function headToHead(r, a, b) {
    var A = entryByCar(r, a), B = entryByCar(r, b);
    var stageDiff = r.stages.map(function (s, k) { var ta = A.times[k], tb = B.times[k]; return ta == null || tb == null ? null : r1(tb - ta); });
    var pa = r.progression[a], pb = r.progression[b];
    var cum = r.labels.map(function (l, k) { var x = pa.cum[k], z = pb.cum[k]; return x == null || z == null ? null : r1(z - x); });
    var aWins = 0, bWins = 0; stageDiff.forEach(function (d) { if (d == null) return; if (d > 0.05) aWins++; else if (d < -0.05) bWins++; });
    var finalTxt;
    if (A.status === 'classified' && B.status === 'classified') {
      var diff = r1(B.total - A.total);
      finalTxt = (diff > 0 ? esc(surname(A.driver)) : esc(surname(B.driver))) + ' finished ahead by <b>' + fmtDiff(diff) + '</b> (official totals, incl. penalties).';
    } else finalTxt = 'Not both classified — ' + esc(surname(A.driver)) + ': ' + (A.status === 'classified' ? 'P' + A.pos : A.status) + ', ' + esc(surname(B.driver)) + ': ' + (B.status === 'classified' ? 'P' + B.pos : B.status) + '.';
    var cA = PALETTE[0], cB = PALETTE[1];
    return '<div class="card h2h"><div class="chart-title"><h3>Head-to-head</h3><p>Bars show who was quicker on each stage.</p></div>' +
      '<div class="h2h-head"><div class="h2h-side"><b style="color:' + cA + '">#' + esc(A.car) + ' ' + esc(A.driver) + '</b><span>' + esc(A.codriver) + ' · ' + esc(A.vehicle) + '</span></div><div class="h2h-vs">VS</div>' +
      '<div class="h2h-side b"><b style="color:' + cB + '">#' + esc(B.car) + ' ' + esc(B.driver) + '</b><span>' + esc(B.codriver) + ' · ' + esc(B.vehicle) + '</span></div></div>' +
      '<div class="h2h-sum"><b style="color:' + cA + '">' + esc(surname(A.driver)) + '</b> was quicker on ' + aWins + ' stage' + (aWins === 1 ? '' : 's') + ', <b style="color:' + cB + '">' + esc(surname(B.driver)) + '</b> on ' + bWins + '.<br>' + finalTxt + '</div>' +
      barChart({ labels: r.stages, values: stageDiff, c1: cA, c2: cB, aName: surname(A.driver), bName: surname(B.driver), title: 'Stage-by-stage difference' }) +
      '<div class="table-wrap" style="margin-top:10px;box-shadow:none"><table class="data"><thead><tr><th>Stage</th><th class="num">#' + esc(A.car) + '</th><th class="num">#' + esc(B.car) + '</th><th class="num">Quicker on stage</th><th class="num">Running gap</th></tr></thead><tbody>' +
      r.labels.map(function (l, k) {
        var isFinal = l === 'Final';
        var ta = isFinal ? A.total : A.times[k], tb = isFinal ? B.total : B.times[k];
        var d = isFinal ? null : stageDiff[k], c = cum[k];
        function who(v, lead) { if (v == null) return '—'; if (Math.abs(v) < 0.05) return 'level'; var nm = v > 0 ? surname(A.driver) : surname(B.driver); return '<span style="color:' + (v > 0 ? cA : cB) + ';font-weight:700">' + esc(nm) + '</span> ' + (lead ? 'ahead by ' : 'by ') + fmtDiff(v); }
        return '<tr><td><b>' + esc(isFinal ? 'Final (incl. pen.)' : l) + '</b></td><td class="num mono">' + (isFinal ? fmtTime(ta, true) : fmtTime(ta)) + '</td><td class="num mono">' + (isFinal ? fmtTime(tb, true) : fmtTime(tb)) + '</td><td class="num">' + (isFinal ? '' : who(d, false)) + '</td><td class="num">' + who(c, true) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function selectedStageTable(r, cars) {
    var head = '<tr><th class="sticky">Car</th>' + r.labels.map(function (l) { return '<th class="num">' + esc(l) + '</th>'; }).join('') + '</tr>';
    var body = cars.map(function (car) {
      var e = entryByCar(r, car), p = r.progression[car], c = colorFor(cars, car);
      return '<tr><td class="sticky nowrap"><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + c + ';margin-inline-end:6px"></span><b>#' + esc(car) + '</b> ' + esc(surname(e.driver)) + '</td>' +
        r.labels.map(function (l, k) {
          if (l === 'Final') return '<td class="num">' + (e.status === 'classified' ? '<span class="stime"><b class="mono">' + fmtTime(e.total, true) + '</b><small class="nowrap"><b>P' + e.pos + '</b>' + (e.pen ? ' · pen ' + fmtDiff(e.pen) : '') + '</small></span>' : '<span class="muted">' + e.status + '</span>') + '</td>';
          var t = e.times[k]; if (t == null) return '<td class="num muted">—</td>';
          return '<td class="num"><span class="stime' + (e.stagePos[k] === 1 ? ' fast' : '') + '"><b class="mono">' + fmtTime(t) + '</b><small class="nowrap">' + (e.stagePos[k] != null ? ord(e.stagePos[k]) : '—') + (p.pos[k] != null ? ' · <b>P' + p.pos[k] + '</b>' : '') + '</small></span></td>';
        }).join('') + '</tr>';
    }).join('');
    return '<div class="section"><div class="section-head"><h2>Stage by stage</h2></div><div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="small muted">Each cell: stage time, then the official stage result (e.g. 4th) and the NR position after that stage (e.g. <b>P2</b>, from stage times). Final: official total and position, including penalties.</p></div>';
  }

  function roundClassification(r) {
    var ents = orderedEntries(r);
    var first = classifiedSorted(r)[0];
    var head = '<tr><th class="num">Pos</th><th class="num">No.</th><th>Crew</th><th>Class</th><th>Car</th><th class="num">Stages</th><th class="num">Penalty</th><th class="num">Total</th><th class="num">Diff 1st</th><th class="num">Diff prev</th><th class="num">Class pos</th><th class="num">Points</th></tr>';
    var prev = null;
    var body = ents.map(function (e) {
      var notes = e.notes && e.notes.length ? '<span class="note-mark" title="' + esc(e.notes.join(' ')) + '">✱</span>' : '';
      var clsCell = clsTag(e.cls) + (e.printedClass !== e.cls ? '<br><span class="small muted" title="Class printed on the official sheet">sheet: ' + esc(e.printedClass) + '</span>' : '');
      var d1 = e.status === 'classified' && first ? (e.pos === 1 ? '—' : '+' + fmtTime(r1(e.total - first.total))) : '';
      var dp = e.status === 'classified' && prev ? '+' + fmtTime(r1(e.total - prev.total)) : (e.status === 'classified' ? '—' : '');
      if (e.status === 'classified') prev = e;
      var pts = e.points ? '<span class="ptcell' + (e.points.total ? '' : ' zero') + '"><b>' + e.points.total + '</b>' + (e.status === 'classified' ? '<small>' + e.points.overall + '+' + e.points.cls + '</small>' : '') + '</span>' : '<span class="muted">–</span>';
      var credited = '';
      if (e.champDriver !== e.driver || e.champCodriver !== e.codriver || e.noCreditCodriver) credited = '<span class="co">Points credited to ' + esc(e.champDriver) + (e.noCreditCodriver ? ' (no co-driver start counted)' : ' / ' + esc(e.champCodriver)) + '</span>';
      return '<tr><td class="num">' + posBadge(e.pos, e.status === 'classified' ? null : e.status) + '</td><td class="num"><span class="carno-lg">' + esc(e.car) + '</span></td>' +
        '<td><div class="crew"><span>' + plink(e.driver) + notes + '</span><span class="co">' + plink(e.codriver) + '</span>' + credited + '</div></td><td class="nowrap">' + clsCell + '</td><td class="veh">' + esc(e.vehicle) + '</td>' +
        '<td class="num">' + (e.stagesCompleted != null ? e.stagesCompleted : '—') + '</td><td class="num mono">' + (e.pen ? fmtTime(e.pen) : '') + '</td><td class="num mono"><b>' + (e.status === 'classified' ? fmtTime(e.total, true) : e.status) + '</b></td>' +
        '<td class="num mono">' + d1 + '</td><td class="num mono">' + dp + '</td><td class="num">' + (e.classPos ? e.classPos : '') + '</td><td class="num">' + pts + '</td></tr>';
    }).join('');
    var extra = (r.extraStarts || []).map(function (x) { return '<li>' + esc(x.note) + '</li>'; }).join('');
    var participation = r.entryParticipation, entryNote = '';
    if (participation) {
      var unstarted = participation.entries.filter(function (e) { return !e.recordedStart && !e.recordedDNS && e.status !== 'DNS'; });
      var dnsCount = participation.entries.filter(function (e) { return e.recordedDNS || e.status === 'DNS'; }).length;
      entryNote = '<details class="small muted"><summary>Entry list: ' + participation.entries.length + ' documented round entries' +
        (participation.complete ? '' : ' (coverage incomplete or day scope unknown)') +
        (unstarted.length ? ' · ' + unstarted.length + ' crews not recorded as started' : '') +
        (dnsCount ? ' · ' + dnsCount + ' official DNS' : '') + '</summary><p>' +
        ext(participation.source.url, 'Official entry source') + '. Entry is separate from starts and points. ' +
        participation.entries.map(function (e) { return '#' + esc(e.car) + ' ' + plink(e.driver) + ' / ' + plink(e.codriver) +
          ' (' + esc(e['class']) + ')' + (e.recordedDNS ? ' — official classification DNS' :
            e.status !== 'entered' ? ' — ' + esc(e.status === 'DNS' ? 'official DNS' : 'withdrawn') :
            e.recordedStart ? '' : ' — entry only; crew not recorded as started'); }).join('; ') + '</p></details>';
    }
    return '<div class="table-wrap"><table class="data compact"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="small muted">Times, penalties, positions and stages as printed on the official sheet. Class positions and points use the class each crew is scored in (see notes). Points: overall + class.</p>' +
      (extra ? '<div class="notes"><b>Also recorded</b><ul>' + extra + '</ul></div>' : '') + entryNote;
  }

  function roundStageTimes(r) {
    var ents = orderedEntries(r).filter(function (e) { return e.times.some(function (t) { return t != null; }); });
    var best = r.stages.map(function (s, k) { var ts = ents.map(function (e) { return e.times[k]; }).filter(function (t) { return t != null; }); return ts.length ? Math.min.apply(null, ts) : null; });
    var head = '<tr><th class="sticky">Car / crew</th>' + r.stages.map(function (s) { return '<th class="num">' + esc(s) + '</th>'; }).join('') + '<th class="num">Penalty</th><th class="num">Total</th></tr>';
    var body = ents.map(function (e) {
      return '<tr><td class="sticky nowrap"><span class="carno-lg">' + esc(e.car) + '</span> <b>' + esc(surname(e.driver)) + '</b> <span class="small muted">' + esc(e.cls) + '</span></td>' +
        e.times.map(function (t, k) {
          if (t == null) return '<td class="num muted">—</td>';
          var fast = best[k] != null && Math.abs(t - best[k]) < 0.05;
          return '<td class="num' + (fast ? ' fastest' : '') + '"><span class="stime"><b class="mono">' + fmtTime(t) + '</b><small>' + (e.stagePos[k] != null ? 'P' + e.stagePos[k] : '') + '</small></span></td>';
        }).join('') + '<td class="num mono">' + (e.pen ? fmtTime(e.pen) : '') + '</td><td class="num mono"><b>' + (e.status === 'classified' ? fmtTime(e.total, true) : e.status) + '</b></td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><p class="small muted">Highlighted: fastest NR time on the stage. Small figures are the official stage positions printed on the sheet.</p>';
  }

  function roundNotes(r) {
    var ev = eventOf(r), src = r.source || {};
    var items = (r.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; });
    var per = []; r.entries.forEach(function (e) { (e.notes || []).forEach(function (n) { per.push('<li><b>Car ' + esc(e.car) + ':</b> ' + esc(n) + '</li>'); }); });
    var page = src.url || (ev.links && ev.links.results);
    var pdf = src.pdf ? ext(src.pdf, 'the official PDF') : '';
    return '<div class="notes"><b>Source:</b> ' + esc(r.title) + (r.status ? ' — <i>' + esc(r.status) + '</i>' : '') + '. ' +
      (page ? 'From the event\'s results page (' + ext(page, esc(page.replace(/^https?:\/\//, ''))) + ')' : 'From the official classification') + (src.file ? ', file ' + esc(src.file) : '') + (pdf ? '; ' + pdf + ' is kept with this site' : '') + '. Live timing is not used.' +
      ((items.length || per.length) ? '<ul>' + items.join('') + per.join('') + '</ul>' : '') + '</div>';
  }

  /* ---------- crews */
  function viewCrews() {
    var html = '<div class="page-head"><div><p class="eyebrow">' + D.people.length + ' competitors in ' + YEAR + '</p><h1>Crews</h1><p>Drivers and co-drivers documented in official ' + YEAR + ' Northern Regions classifications or entry lists. Entry does not prove a start. Open a name for their profile across all seasons.</p></div></div>';
    if (!D.people.length) return { title: 'Crews', html: html + '<div class="card empty">No ' + YEAR + ' results yet.</div>' };
    html += '<div class="filters"><label class="sr-only" for="crewSearch">Search crews</label><input id="crewSearch" class="search" type="search" placeholder="Search by name or car number…" autocomplete="off"></div>';
    var rows = D.people.map(function (p) {
      var sd = standingIdx.driver[p.id], sc = standingIdx.codriver[p.id];
      var cars = {}; p.apps.concat(p.entries).forEach(function (a) { cars[a.car] = 1; });
      var cls = (sd || sc || {}).cls || (p.apps[0] && p.apps[0].cls) || (p.entries[0] && p.entries[0].cls);
      var role = sd && sc ? 'Driver & co-driver' : sd ? 'Driver' : sc ? 'Co-driver' : 'Listed';
      var starts = (sd ? sd.starts : 0) + (sc ? sc.starts : 0);
      var search = (p.name + ' ' + Object.keys(cars).join(' ')).toLowerCase();
      return '<tr data-s="' + esc(search) + '"><td>' + plink(p.name) + '</td><td>' + role + '</td><td>' + clsTag(cls) + '</td><td class="num">' + (sd ? 'P' + sd.rank + ' · ' + sd.total : '<span class="muted">—</span>') + '</td><td class="num">' + (sc ? 'P' + sc.rank + ' · ' + sc.total : '<span class="muted">—</span>') + '</td><td class="num">' + starts + '</td>' +
        (D.entryLists.length ? '<td class="num">' + new Set(p.entries.map(function (e) { return e.eventId; })).size + '</td>' : '') + '<td class="mono small">' + esc(Object.keys(cars).join(', ')) + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data" id="crewTable"><thead><tr><th>Name</th><th>Role</th><th>Class</th><th class="num">Driver standings</th><th class="num">Co-driver standings</th><th class="num">Starts</th>' +
      (D.entryLists.length ? '<th class="num">Events entered (documented)</th>' : '') + '<th>Car(s)</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    mounts.push(function () {
      var inp = document.getElementById('crewSearch');
      inp.addEventListener('input', function () {
        var v = inp.value.trim().toLowerCase();
        Array.prototype.forEach.call(document.querySelectorAll('#crewTable tbody tr'), function (tr) { tr.hidden = v && tr.getAttribute('data-s').indexOf(v) < 0; });
      });
    });
    return { title: 'Crews', html: html };
  }

  /* ---------- person (all seasons) */
  function viewPerson(id) {
    var prof = ST.profiles[id] || null;
    var seasons = seasonList().map(function (y) {
      var m = ST.models[y]; if (!m) return null;
      var p = null; m.people.forEach(function (x) { if (x.id === id) p = x; });
      return p ? { year: y, model: m, person: p } : null;
    }).filter(Boolean);
    if (!seasons.length && !prof) return notFound();
    var name = prof ? prof.name : seasons[0].person.name;
    var all = [];
    seasons.forEach(function (s) {
      var rb = {}; s.model.rounds.forEach(function (r) { rb[r.id] = r; });
      s.person.apps.forEach(function (a) { all.push({ a: a, r: rb[a.r] }); });
    });
    var credited = all.filter(function (x) { return x.a.credited && x.a.status !== 'DNS'; });
    var finishes = credited.filter(function (x) { return x.a.status === 'classified'; });
    var best = finishes.length ? Math.min.apply(null, finishes.map(function (x) { return x.a.pos; })) : null;
    var wins = finishes.filter(function (x) { return x.a.pos === 1; }).length;
    var podiums = finishes.filter(function (x) { return x.a.pos <= 3; }).length;
    var stageWins = 0; credited.forEach(function (x) { if (!x.r) return; var e = entryByCar(x.r, x.a.car); if (e) e.stagePos.forEach(function (sp) { if (sp === 1) stageWins++; }); });
    var roles = {}; seasons.forEach(function (s) { if (s.model.standings.drivers.some(function (r) { return r.id === id; })) roles.d = 1; if (s.model.standings.codrivers.some(function (r) { return r.id === id; })) roles.c = 1; });
    var roleTxt = roles.d && roles.c ? 'Driver & co-driver' : roles.d ? 'Driver' : roles.c ? 'Co-driver' : 'Competitor';
    var initials = '<div class="avatar ph" aria-hidden="true" id="pPhotoPh">' + esc(name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')) + '</div>', photo = initials;
    if (prof && /^db:/.test(prof.photo || '')) {
      var pid = prof.photo.slice(3);
      if (ST.photos[pid]) photo = '<img class="avatar" src="data:image/jpeg;base64,' + ST.photos[pid] + '" alt="' + esc(name) + '">';
      else mounts.push(function () {
        loadPhoto(pid).then(function (b64) {
          var ph = document.getElementById('pPhotoPh'); if (!b64 || !ph) return;
          var img = document.createElement('img'); img.className = 'avatar'; img.alt = name; img.src = 'data:image/jpeg;base64,' + b64; ph.replaceWith(img);
        });
      });
    } else if (prof && safeUrl(prof.photo)) photo = '<img class="avatar" src="' + esc(prof.photo) + '" alt="' + esc(name) + '">';
    var links = prof && prof.links ? Object.keys(prof.links).map(function (k) { return ext(prof.links[k], socialIcon(k) + '<span>' + esc(socialLabel(k)) + '</span>', 'chip-link'); }).filter(Boolean).join('') : '';
    var html = '<div class="profile-head">' + photo + '<div><p class="eyebrow">' + roleTxt + (seasons.length ? ' · ' + seasons.map(function (s) { return s.year; }).join(', ') : '') + '</p><h1>' + esc(name) + '</h1>' +
      (prof && prof.bio ? '<p class="bio">' + esc(prof.bio) + '</p>' : '') + (links ? '<div class="chip-links">' + links + '</div>' : '') + '</div></div>';
    html += '<div class="kpis">' + kpi(credited.length, 'Starts') + kpi(finishes.length, 'Finishes') + kpi(best ? ord(best) : '—', 'Best result') + kpi(wins, 'Round wins') + kpi(podiums, 'Podiums') + kpi(stageWins, 'Stage wins') + '</div>';
    seasons.forEach(function (s) {
      var save = D; useSeason(s.model);
      var sd = standingIdx.driver[id], sc = standingIdx.codriver[id];
      var cls = (sd || sc || {}).cls || (s.person.apps[0] && s.person.apps[0].cls);
      html += '<div class="section season-block"><div class="section-head"><h2>' + s.year + ' season</h2><a class="go" href="' + sh('/standings' + (sd ? '' : '/codrivers')) + '">' + s.year + ' standings →</a></div>' +
        '<div class="round-meta" style="margin-bottom:12px">' + clsTag(cls) + (sd ? '<span>Driver standings: <b>P' + sd.rank + '</b> · ' + sd.total + ' pts' + (sd.eligible ? '' : ' <span class="muted">(fewer than ' + D.minStarts + ' starts)</span>') + '</span>' : '') + (sc ? '<span>Co-driver standings: <b>P' + sc.rank + '</b> · ' + sc.total + ' pts' + (sc.eligible ? '' : ' <span class="muted">(fewer than ' + D.minStarts + ' starts)</span>') + '</span>' : '') + '</div>';
      if (s.person.entries.length) html += '<details class="small muted"><summary>' +
        new Set(s.person.entries.map(function (e) { return e.eventId; })).size +
        ' events entered (documented; counted once per event)</summary><p>' + s.person.entries.map(function (e) {
          var event = eventsById[e.eventId] || {};
          return esc(event.short || e.eventId) + ' · ' + (e.roundIds.length ? esc(e.roundIds.join(', ')) : 'event only; day scope unknown') +
            ' · #' + esc(e.car) + ' · ' + plink(e.partner) + ' · printed entry class ' + esc(e.cls) +
            ' · ' + (e.status === 'DNS' ? 'official DNS' : e.status === 'withdrawn' ? 'withdrawn' :
              e.recordedStart ? 'start recorded separately' : 'entry only; not recorded as started in this scope') +
            ' · ' + ext(e.source.url, 'source');
        }).join('<br>') + '</p></details>';
      var row = sd || sc;
      if (row) html += '<div class="card chart-card">' + pointsBars(row) + '</div>';
      var apps = s.person.apps.slice().sort(function (a, b) { return ROUND_IDS.indexOf(a.r) - ROUND_IDS.indexOf(b.r); });
      html += '<div class="table-wrap" style="margin-top:14px"><table class="data"><thead><tr><th>Round</th><th>Event</th><th class="num">Car</th><th>Role</th><th>With</th><th>Car</th><th class="num">Result</th><th class="num">Class</th><th class="num">Points</th><th></th></tr></thead><tbody>' +
        apps.map(function (a) {
          var r = roundsById[a.r]; if (!r) return '';
          var rt = a.credited ? (a.credited === 'driver' ? 'Driver' : 'Co-driver') : (a.role === 'co-driver' ? 'Co-driver' : 'Driver');
          var note = '';
          if (a.msaOnly) note = '<span class="note-mark" title="Start recorded in the MSA standings; the car is not on the official sheet for this round.">✱</span>';
          else if (!a.credited) note = '<span class="note-mark" title="Printed on the sheet, but the MSA standings credit this result to someone else.">✱</span>';
          else if (a.role && a.credited && a.role !== a.credited) note = '<span class="note-mark" title="Printed the other way round on the sheet; MSA standings credit this role.">✱</span>';
          var res = a.status === 'classified' ? posBadge(a.pos) : posBadge(null, a.status);
          return '<tr><td><a href="' + sh('/round/' + r.id) + '"><b>R' + r.n + '</b></a></td><td class="nowrap">' + esc(eventOf(r).short) + ' · ' + esc(r.day.split(' (')[0]) + '</td><td class="num"><span class="carno-lg">' + esc(a.car) + '</span></td><td>' + rt + note + '</td><td class="nowrap">' + plink(a.partner) + '</td><td class="nowrap">' + esc(a.vehicle || '—') + '</td>' +
            '<td class="num">' + res + '</td><td class="num">' + (a.classPos ? ord(a.classPos) + ' ' + clsTag(a.cls) : clsTag(a.cls)) + '</td><td class="num"><b>' + (a.pts != null ? a.pts : '–') + '</b></td>' +
            '<td>' + (a.msaOnly ? '' : '<a class="go" href="' + buildHash('/round/' + r.id + '/graph', { cars: a.car }) + '">Graph →</a>') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      useSeason(save);
    });
    if (!seasons.length) html += '<div class="card empty">No official results recorded yet.</div>';
    return { title: name, html: html };
  }
  function kpi(v, l) { return '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function pointsBars(row) {
    var model = D;
    return responsive(function (W) { return pointsSvg(model, row, W); }) + '<div class="legend-row"><span><i style="display:inline-block;width:12px;height:12px;background:var(--ink-2);border-radius:3px;vertical-align:-2px"></i> overall points</span><span><i style="display:inline-block;width:12px;height:12px;background:var(--accent);border-radius:3px;vertical-align:-2px"></i> class points</span></div>';
  }
  function pointsSvg(model, row, W) {
    var rounds = model.rounds, evs = {}; model.events.forEach(function (e) { evs[e.id] = e; });
    var H = 240, m = { l: 36, r: 10, t: 18, b: 42 }, iw = W - m.l - m.r, ih = H - m.t - m.b, n = Math.max(1, rounds.length);
    var top = Math.max(10, Math.ceil(((model.pointsScale.overall[0] || 0) + (model.pointsScale.cls[0] || 0)) / 10) * 10);
    var x = function (i) { return m.l + (i + 0.5) * (iw / n); }, y = function (v) { return m.t + ih - (v / top) * ih; }, bw = Math.min(64, iw / n * 0.62);
    var ticks = []; for (var t = 0; t <= top; t += 10) ticks.push(t);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Points by round">';
    s += '<g class="grid">' + ticks.map(function (t) { return '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"' + (t === 0 ? ' class="zero"' : '') + '/>'; }).join('') + '</g>';
    s += '<g class="axis">' + ticks.map(function (t) { return '<text x="' + (m.l - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>'; }).join('') +
      rounds.map(function (r, i) { var ev = evs[r.eventId] || {}; return '<text class="lbl" x="' + x(i) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">R' + r.n + '</text>' + (W >= 620 ? '<text x="' + x(i) + '" y="' + (H - m.b + 34) + '" text-anchor="middle" style="font-size:11px">' + esc(ev.short || '') + '</text>' : ''); }).join('') + '</g>';
    rounds.forEach(function (r, i) {
      var v = row.rounds[r.id];
      if (!v) { s += '<text x="' + x(i) + '" y="' + (y(0) - 8) + '" text-anchor="middle" fill="var(--muted)" style="font-size:12px">–</text>'; return; }
      if (v.status === 'DNF') { s += '<text x="' + x(i) + '" y="' + (y(0) - 8) + '" text-anchor="middle" fill="var(--muted)" style="font-size:12px;font-weight:700">DNF</text>'; return; }
      var y0 = y(0), yo = y(v.o), yt = y(v.pts);
      s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yo + '" width="' + bw + '" height="' + (y0 - yo) + '" rx="3" fill="var(--ink-2)"><title>Overall: ' + v.o + '</title></rect>';
      s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yt + '" width="' + bw + '" height="' + (yo - yt) + '" rx="3" fill="var(--accent)"><title>Class: ' + v.c + '</title></rect>';
      s += '<text x="' + x(i) + '" y="' + (yt - 6) + '" text-anchor="middle" style="font-size:13px;font-weight:800;fill:var(--ink)">' + v.pts + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- about the data (per season) */
  function viewAbout() {
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · how this site works</p><h1>Sources &amp; data notes</h1><p>Independently transcribed from official classification documents, normally final. Provisional or unclear sources are labelled; live timing is never used. <a href="disclaimer.html">Independence &amp; full disclaimer</a>.</p></div></div>';
    if (D.rounds.length) {
      html += '<div class="prose"><h2>Sources</h2></div><div class="table-wrap"><table class="data"><thead><tr><th>Round</th><th>Event</th><th>Official document</th><th>Status</th><th>Results page</th></tr></thead><tbody>' +
        D.rounds.map(function (r) {
          var ev = eventOf(r), src = r.source || {}, page = src.url || (ev.links && ev.links.results);
          return '<tr><td><b>R' + r.n + '</b></td><td class="nowrap">' + esc(ev.short) + ' · ' + esc(r.day.split(' (')[0]) + '</td><td>' + esc(r.title) + (src.file ? '<br><span class="small muted">' + esc(src.file) + '</span>' : '') + (src.pdf ? '<br>' + ext(src.pdf, 'Copy of the PDF') : '') + '</td><td>' + classificationBadge(r) + (r.status ? '<br><span class="small muted">' + esc(r.status) + '</span>' : '') + '</td><td>' + (page ? ext(page, esc(page.replace(/^https?:\/\//, '').split('/')[0])) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    var sc = D.pointsScale;
    html += '<div class="prose">' +
      '<h2>Points</h2><p>Per round, a crew scores overall points for its Northern Regions finishing position plus class points for its position in class. Driver and co-driver tables are kept separately; both crew members score the same points. A DNF scores 0 but counts as a start. Crews must start at least ' + D.minStarts + ' rounds to be eligible.</p>' +
      '<dl class="kv"><dt>Overall</dt><dd>' + sc.overall.map(function (p, i) { return ord(i + 1) + ' ' + p; }).join(' · ') + '</dd><dt>Class</dt><dd>' + sc.cls.slice(0, 10).map(function (p, i) { return ord(i + 1) + ' ' + p; }).join(' · ') + (sc.cls.length > 10 ? ' …' : '') + '</dd></dl>';
    var conf = D.rounds.filter(function (r) { return r.confirmed; }).map(function (r) { return 'R' + r.n; });
    var prov = unconfirmed();
    if (conf.length && D.msa) html += '<p>' + roundList(conf) + ' points reproduce the ' + msaLink() + (D.msa.generated ? ' (' + esc(D.msa.generated) + ')' : '') + ' exactly.' + (prov.length ? ' Points for ' + roundList(prov) + ' are calculated here with the same scale and are provisional until MSA publishes updated standings.' : '') + '</p>';
    else if (D.rounds.length) html += '<p>Points are calculated here from the official classifications with the scale above.</p>';
    html += '<h2>Stage graphs</h2><p>Positions and gaps after each stage are worked out from the source stage times. Penalties are only printed as a total, so they are applied at the <b>Final</b> point, the classification endpoint. This label does not establish that the source is final; check its status above. Crews who retire drop off the graph after their last completed stage. Stage positions are the figures printed on the sheet.</p>' +
      '<h2>Classes</h2><ul>' + D.classes.map(function (c) { return '<li>' + clsTag(c.id) + ' ' + esc(c.desc || '') + (c.classOnly ? ' <span class="muted">(class points only)</span>' : '') + '</li>'; }).join('') + '</ul>';
    var notes = (D.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; });
    D.rounds.forEach(function (r) {
      r.entries.forEach(function (e) { (e.notes || []).forEach(function (n) { notes.push('<li><b>R' + r.n + ' ' + esc(eventOf(r).short) + ', car ' + esc(e.car) + ':</b> ' + esc(n) + '</li>'); }); });
      (r.extraStarts || []).forEach(function (x) { if (x.note) notes.push('<li><b>R' + r.n + ' ' + esc(eventOf(r).short) + ':</b> ' + esc(x.note) + '</li>'); });
      if (r.provisional) notes.push('<li><b>R' + r.n + ' ' + esc(eventOf(r).short) + ':</b> the sheet is headed “' + esc(r.status) + '”.</li>');
      else if (classificationState(r) === 'unclear') notes.push('<li><b>R' + r.n + ' ' + esc(eventOf(r).short) + ':</b> classification finality is unclear; do not treat the source as confirmed final results.</li>');
    });
    if (notes.length) html += '<h2>Data notes</h2><ul>' + notes.join('') + '</ul>';
    html += '</div>';
    return { title: 'Sources & data notes', html: html };
  }

  /* ---------- info */
  var SOCIAL = {
    facebook: ['Facebook', '<path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z"/>'],
    instagram: ['Instagram', '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.3"/>'],
    whatsapp: ['WhatsApp', '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.3-.2-2.4.7.7-2.3-.2-.3A7 7 0 0 1 12 5Zm-2.6 3.3c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 2.2.8 2.6.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.2-.8-.7-1.2-1.5-1.4-1.7-.1-.3 0-.4.1-.5l.4-.5.3-.5v-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4Z"/>'],
    youtube: ['YouTube', '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"/>'],
    tiktok: ['TikTok', '<path d="M16.5 3c.3 2.2 1.7 3.8 4 4v3.1c-1.5 0-2.8-.4-4-1.2v6.3a5.8 5.8 0 1 1-5.8-5.8l.8.1v3.2a2.6 2.6 0 1 0 1.9 2.5V3h3.1Z"/>'],
    x: ['X', '<path d="M4 3h4.7l4 5.6L17.3 3H20l-6 7 6.6 11h-4.7l-4.3-6-5 6H4l6.3-7.6L4 3Z"/>'],
    website: ['Website', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9S14.5 18.4 12 21c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/>'],
    email: ['Email', '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2"/>']
  };
  function socialIcon(k) { var s = SOCIAL[k] || SOCIAL.website; return '<svg class="soc-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + s[1] + '</svg>'; }
  function socialLabel(k) { return (SOCIAL[k] || [k.charAt(0).toUpperCase() + k.slice(1)])[0]; }
  function viewInfo() {
    var S = ST.site, info = S.info || {};
    var html = '<div class="page-head"><div><p class="eyebrow">Information</p><h1>About the championship</h1>' + (info.intro ? '<p>' + esc(info.intro) + '</p>' : '') + '</div></div>';
    var social = S.social || [];
    if (social.length) {
      html += '<div class="section"><div class="section-head"><h2>Follow the championship</h2></div><div class="grid social-grid">' + social.map(function (s) {
        var u = safeUrl(s.url);
        var inner = '<span class="soc-badge ' + esc(s.network) + '">' + socialIcon(s.network) + '</span><span class="soc-text"><b>' + esc(s.label || socialLabel(s.network)) + '</b><span>' + (u ? esc(s.handle || u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) : 'Coming soon') + '</span></span>';
        return u ? '<a class="card social-card" href="' + esc(u) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="card social-card off" aria-disabled="true">' + inner + '</div>';
      }).join('') + '</div></div>';
    }
    var docs = D.documents || [];
    html += '<div class="section"><div class="section-head"><h2>' + YEAR + ' regulations &amp; documents</h2></div>';
    html += docs.length ? '<div class="doc-list">' + docs.map(function (d) {
      return '<a class="card doc" href="' + esc(safeUrl(d.url)) + '" target="_blank" rel="noopener"><span class="doc-kind">' + esc(d.kind || 'Document') + '</span><span class="doc-main"><b>' + esc(d.title) + '</b><span>' + (d.date ? 'Dated ' + fmtDate(d.date) : '') + (d.note ? (d.date ? ' · ' : '') + esc(d.note) : '') + '</span></span><span class="go">Open ↗</span></a>';
    }).join('') + '</div>' : '<div class="card empty">No documents have been added for ' + YEAR + ' yet.</div>';
    html += '</div>';
    if (D.events.length) {
      html += '<div class="section"><div class="section-head"><h2>' + YEAR + ' events</h2><a class="go" href="' + sh('/rounds') + '">Rounds &amp; results →</a></div><div class="table-wrap"><table class="data"><thead><tr><th>Event</th><th>Dates</th><th>Venue</th><th>Surface</th><th>Rounds</th><th>Links</th></tr></thead><tbody>' +
        D.events.map(function (ev) {
          var rs = D.calendar.filter(function (c) { return c.eventId === ev.id; }).map(function (c) { return c.hasResults ? '<a href="' + sh('/round/' + c.id) + '">R' + c.n + '</a>' : 'R' + c.n; }).join(', ');
          return '<tr><td><b>' + esc(ev.name) + '</b></td><td class="nowrap">' + esc(ev.dates) + '</td><td>' + esc(ev.venue) + '</td><td>' + esc(ev.surface) + '</td><td class="nowrap">' + (rs || '—') + '</td><td>' + (eventLinks(ev) || '<span class="muted">—</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    if ((info.documents || []).length) {
      html += '<div class="section"><div class="section-head"><h2>Useful links</h2></div><div class="doc-list">' + info.documents.map(function (d) {
        return '<a class="card doc" href="' + esc(safeUrl(d.url)) + '" target="_blank" rel="noopener"><span class="doc-kind">Link</span><span class="doc-main"><b>' + esc(d.title) + '</b><span>' + esc(d.note || '') + '</span></span><span class="go">Open ↗</span></a>';
      }).join('') + '</div></div>';
    }
    var ct = S.contact || {};
    html += '<div class="section"><div class="section-head"><h2>Contact</h2></div><div class="card"><p style="margin:0">' + esc(ct.note || '') + '</p>' + (ct.email ? '<p style="margin:10px 0 0"><a class="btn" href="mailto:' + esc(ct.email) + '">' + socialIcon('email') + esc(ct.email) + '</a></p>' : '') +
      '<p class="small muted" style="margin:12px 0 0">How results are handled: <a href="' + sh('/about') + '">sources &amp; data notes</a> and <a href="disclaimer.html">independence &amp; disclaimer</a>. <a href="privacy.html">Privacy &amp; analytics choices</a>.</p></div></div>';
    return { title: 'Info', html: html };
  }

  /* ------------------------------------------------------------------ boot */
  window.addEventListener('hashchange', render);
  loadSiteAndPeople().then(function (res) {
    ST.site = res[0]; ST.people = res[1];
    ST.peopleIndex = E.peopleIndex(ST.people);
    ((ST.people && ST.people.people) || []).forEach(function (p) { ST.profiles[p.id] = p; });
    render();
  }).catch(showLoadError);
})();
