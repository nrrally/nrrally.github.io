/* Northern Regions Rally — public site (no dependencies).
   The code holds no results. Results come from the published copy in the database (the public/
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
  function fmtShort(sec, precision) { // axis labels
    if (precision > 1) {
      if (sec < 60) return sec.toFixed(precision) + 's';
      var minutes = Math.floor(sec / 60), seconds = (sec - minutes * 60).toFixed(precision);
      if (Number(seconds) >= 60) { minutes++; seconds = (0).toFixed(precision); }
      if (minutes >= 60) {
        var hours = Math.floor(minutes / 60); minutes -= hours * 60;
        return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
      }
      return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
    }
    if (sec < 60) return Math.round(sec) + 's';
    var m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    if (m >= 60) { var h = Math.floor(m / 60); m = m - h * 60; return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDiff(sec) { sec = Math.abs(sec); return sec < 60 ? sec.toFixed(1) + 's' : fmtTime(sec); }
  function fmtGraphTime(sec, precision) {
    if (precision == null) return fmtTime(sec);
    var neg = sec < 0, value = Math.abs(sec), hours = Math.floor(value / 3600);
    value -= hours * 3600;
    var minutes = Math.floor(value / 60);
    value -= minutes * 60;
    var seconds = value.toFixed(precision);
    if (Number(seconds) < 10) seconds = '0' + seconds;
    var text = hours ? hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + seconds :
      minutes ? minutes + ':' + seconds : Number(value).toFixed(precision) + 's';
    return (neg ? '-' : '') + text;
  }
  function surname(n) { var p = String(n).split(' '); return p.length > 1 ? p.slice(1).join(' ') : n; }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = calendarDate(iso);
    if (!d) return 'Date to be confirmed';
    return d.toLocaleDateString('en-ZA', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function calendarDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
    var d = new Date(iso + 'T12:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === iso ? d : null;
  }
  function calendarDateText(value) {
    if (calendarDate(value)) return value;
    var match = /^\s*(\d{1,2})(?:\s*(?:\/|–|-)\s*\d{1,2})?\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(String(value || ''));
    if (!match) return '';
    var months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
      may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
      oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    var month = months[match[2].toLowerCase()];
    if (!month) return '';
    var date = match[3] + '-' + String(month).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
    return calendarDate(date) ? date : '';
  }
  function fmtDocumentDate(value) {
    return calendarDate(value) ? fmtDate(value) : esc(value);
  }
  function calendarStatus(iso) {
    if (!calendarDate(iso)) return 'Date to be confirmed';
    // South African calendar days are UTC+02:00, independent of the visitor's timezone.
    var today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return iso < today ? 'Awaiting results' : iso === today ? 'Scheduled today' : 'Upcoming';
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
  function rallyeSportQualificationNote(result) {
    return (result && result.notes || []).filter(function (note) {
      return /results are final pending post[- ]event technical checks/i.test(note);
    })[0] || '';
  }
  function rallyeSportScoreForResult(result) {
    var scoring = D.rallyesport && D.rallyesport.scoring;
    return scoring && (scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0] || null;
  }
  function rallyeSportStarterMinimumNote(scoring, year) {
    if (year !== 2026) return '';
    var review = scoring && scoring.starterMinimum;
    if (!review) return '';
    return review.basis === 'user-reported-review' ?
      '2026 RS event minimum: 6 source-backed starters, including TEST and invitational entries; DNS does not count. This is a user-reported review. Published SSR V1 states 15; no written amendment is recorded.' :
      '2026 RS event minimum: 15 starters as printed in SSR V1.';
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
      var model = E.buildSeason({ season: b.season, rounds: b.rounds || {}, people: ST.people, publicProjection: true });
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
  function buildHash(path, q) { return '#' + SP + path + qstr(Object.assign({}, q, { competition: competition })); }
  function sh(path) { return buildHash(path || '', {}); }
  var competition = window.NRDisplay.competition(), welcomePending = false;
  function routeCompetition(h) {
    if (h.parts[0] === 'rallyesport') return 'rs';
    if (h.parts[0] === 'round') return 'nr';
    if (h.q.competition === 'nr' || h.q.competition === 'rs') return h.q.competition;
    if (h.q.leaders === 'rs' || h.q.classes === 'rs' || h.q.results === 'rs') return 'rs';
    return competition;
  }
  function rememberCompetition(mode) {
    competition = mode;
    window.NRDisplay.setCompetition(mode);
  }
  function competitionHref(href, mode) {
    var hash = href.replace(/^#/, ''), split = hash.indexOf('?');
    var path = split < 0 ? hash : hash.slice(0, split), params = new URLSearchParams(split < 0 ? '' : hash.slice(split + 1));
    params.delete('leaders'); params.delete('classes'); params.delete('results');
    params.set('competition', mode);
    return '#' + path + '?' + params.toString().replace(/%2C/gi, ',');
  }
  function switchCompetition() {
    var h = parseHash(), next = competition === 'nr' ? 'rs' : 'nr', path = h.path;
    welcomePending = next === 'rs';
    if (h.parts[0] === 'round') {
      var matches = D.rallyesport.results.filter(function (result) { return result.nrRoundId === h.parts[1]; });
      path = SP + (matches.length === 1 ? '/rallyesport/' + encodeURIComponent(matches[0].id) +
        '/' + (h.parts[2] === 'classification' ? 'classification' : h.parts[2] === 'stages' ? 'stages' : 'graph') : '/rounds');
    } else if (h.parts[0] === 'rallyesport') {
      var result = D.rallyesport.results.filter(function (row) { return row.id === h.parts[1]; })[0];
      path = SP + (result && roundsById[result.nrRoundId] ? '/round/' + result.nrRoundId +
        '/' + (h.parts[2] === 'classification' ? 'classification' : h.parts[2] === 'stages' ? 'stages' : 'graph') : '/rounds');
    }
    // Competition-specific car selections, classes and metrics are not transferable.
    rememberCompetition(next);
    location.hash = '#' + path + qstr({ competition: next });
  }
  function showCompetitionWelcome() {
    if (!welcomePending) return;
    welcomePending = false;
    window.NRDisplay.welcome(sh('/info'));
  }
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
  function header(active) {
    var S = ST.site || { siteName: 'Northern Regions Rally' }, guide = active === 'getting-started';
    var NAV = [['', 'Home', sh('')], ['standings', 'Standings', sh('/standings')], ['rounds', 'Rounds & graphs', sh('/rounds')], ['crews', 'Crews', sh('/crews')], ['getting-started', 'Getting started', '#/getting-started'], ['info', 'Info', sh('/info')]];
    var links = NAV.map(function (n) {
      var on = n[0] === active || (n[0] === 'rounds' && active === 'round') || (n[0] === 'crews' && active === 'person') || (n[0] === 'info' && active === 'about');
      return '<a href="' + n[2] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
    var years = seasonList();
    var sel = guide ? '' : years.length > 1 ? '<label class="season-sel"><span class="sr-only">Season</span><select id="seasonSel">' + years.map(function (y) {
      return '<option value="' + y + '"' + (y === YEAR ? ' selected' : '') + '>' + y + ' season</option>';
    }).join('') + '</select></label>' : '<span class="season-pill" title="Season">' + esc(YEAR) + '</span>';
    return '<header class="site-header"><div class="checker" aria-hidden="true"></div><div class="header-inner">' +
      '<a class="brand" href="#/" aria-label="' + esc(S.siteName) + ' home">' + logoImg() +
      '<span class="brand-text"><strong>' + esc(S.siteName) + '</strong><span>' + (guide ? 'Getting started' : esc(YEAR) + (competition === 'rs' ? ' RallyeSport' : ' Championship')) + '</span></span></a>' +
      '<nav class="nav" aria-label="Main">' + links + '</nav>' + sel +
      window.NRDisplay.controls() +
      '</div></header>';
  }
  function logoImg() {
    return '<img class="brand-mark" src="assets/official-logo.jpg" alt="" width="270" height="143">';
  }
  function footer() {
    var social = ((ST.site && ST.site.social) || []).filter(function (s) { return safeUrl(s.url); });
    return '<footer class="footer"><div class="footer-inner"><span>' + esc(competition === 'rs' ? 'RallyeSport' : D ? D.championship : 'Northern Regions Rally') + ' · Independently compiled, source-derived information.</span>' +
      '<span class="footer-links">' + social.map(function (s) { return ext(s.url, socialIcon(s.network) + '<span class="sr-only">' + esc(s.label) + '</span>', 'soc-mini'); }).join('') +
      '<a href="' + sh('/info') + '">Info &amp; regulations</a><a href="' + sh('/rallyesport') + '">RallyeSport</a><a href="' + sh('/about') + '">Sources &amp; data notes</a><a href="disclaimer.html">Independence &amp; disclaimer</a><a href="privacy.html">Privacy &amp; analytics</a></span></div></footer>';
  }

  /* ------------------------------------------------------------------ render */
  var mounts = [];
  function render() {
    window.NRDisplay.closeWelcome();
    var h = parseHash(); var parts = h.parts;
    rememberCompetition(routeCompetition(h));
    var canonical = competitionHref(location.hash || '#/', competition);
    if (canonical !== location.hash) history.replaceState(null, '', canonical);
    var page = parts[0] || '';
    if (page === 'getting-started') {
      mounts = []; charts = {}; chartSeq = 0;
      renderView(window.NRGettingStarted.view(), page, h);
      return;
    }
    if (!ST.site) {
      if (ST.error) showLoadError(ST.error);
      return;
    }
    var year = h.year || YEAR || +ST.site.currentSeason;
    if (seasonList().indexOf(year) < 0) year = +ST.site.currentSeason;
    var need = page === 'person' ? seasonList() : [year];
    var missing = need.filter(function (y) { return !ST.models[y]; });
    if (missing.length) {
      app.innerHTML = '<div class="loading" role="status" aria-live="polite"><div class="checker" aria-hidden="true"></div><p>Loading results…</p></div>';
      Promise.all(missing.map(loadSeason)).then(render, showLoadError);
      return;
    }
    useSeason(ST.models[year]);
    var view;
    mounts = []; charts = {}; chartSeq = 0;
    try {
      switch (page) {
        case '': view = viewHome(h.q); break;
        case 'standings': view = competition === 'rs' ? viewRsStandings(parts[1] === 'codrivers' ? 'codriver' : 'driver', h.q) :
          viewStandings(parts[1] === 'codrivers' ? 'codriver' : 'driver', h.q); break;
        case 'rounds': view = viewRounds(h.q); break;
        case 'round': view = viewRound(parts[1], parts[2] || 'graph', h.q); break;
        case 'rallyesport': view = !parts[1] ? viewRallyeSport('') :
          parts[2] === 'classification' ? viewRallyeSport(parts[1], h.q) : viewRsGraph(parts[1], h.q, parts[2] === 'stages' ? 'stages' : 'graph'); break;
        case 'crews': view = competition === 'rs' ? viewRsCrews() : viewCrews(); break;
        case 'person': view = (competition === 'rs' ? viewRsPerson : viewPerson)(parts[1] ? decodeURIComponent(parts[1]) : ''); break;
        case 'about': view = competition === 'rs' ? viewRsSources() : viewAbout(); break;
        case 'info': view = viewInfo(); break;
        default: view = notFound();
      }
    } catch (err) {
      view = { title: 'Error', html: '<div class="card empty">Something went wrong showing this page.<br><span class="small mono">' + esc(err && err.message) + '</span></div>' };
      if (window.console) console.error(err);
    }
    renderView(view, page, h);
  }
  function renderView(view, page, h) {
    var parts = h.parts, pathKey = h.path;
    var keepScroll = lastPath === pathKey ? window.scrollY : 0;
    app.innerHTML = header(page) + '<main id="main">' + view.html + '</main>' + footer();
    Array.prototype.forEach.call(app.querySelectorAll('a[href^="#"]'), function (link) {
      var href = link.getAttribute('href');
      if (href.indexOf('#/') !== 0) return;
      var target = href.replace(/^#\/(?:\d{4}\/)?/, '').split(/[/?]/)[0];
      link.setAttribute('href', competitionHref(href, target === 'rallyesport' ? 'rs' : target === 'round' ? 'nr' : competition));
    });
    document.title = (view.title ? view.title + ' — ' : '') + (ST.site ? ST.site.siteName : 'Northern Regions Rally') + (page === 'getting-started' ? '' : ' ' + YEAR);
    window.NRDisplay.mount(switchCompetition);
    var ss = document.getElementById('seasonSel');
    if (ss) ss.addEventListener('change', function () {
      var keep = { standings: 1, rounds: 1, crews: 1, about: 1, info: 1 };
      location.hash = '#/' + ss.value + (keep[page] ? '/' + page + (page === 'standings' && parts[1] ? '/' + parts[1] : '') : '') +
        qstr({ competition: competition });
    });
    mounts.forEach(function (fn) { fn(); });
    if (page === 'getting-started') {
      document.querySelector('.nav a.active').scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    window.scrollTo(0, keepScroll);
    if (page === 'getting-started' && parts[1]) {
      var target = document.getElementById('guide-' + parts[1]);
      if (target && target.closest('.getting-started')) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      }
    }
    lastPath = pathKey;
    showCompetitionWelcome();
    if (window.NRAnalytics) window.NRAnalytics.page(h.parts, YEAR);
  }
  function showLoadError(err) {
    ST.error = err;
    if (parseHash().parts[0] === 'getting-started') { render(); return; }
    var kind = err && err.kind, title = kind === 'empty' ? 'Results coming soon' : kind === 'setup' ? 'Site not connected yet' : 'Results are temporarily unavailable';
    var help = kind === 'empty' ? 'No results have been published yet. Please check back later.' : kind === 'setup' ? 'The site administrator still needs to connect the results database.' : 'Please check your connection and try again in a few minutes.';
    app.innerHTML = '<main id="main"><div class="card empty"><h2>' + title + '</h2><p>' + help + '</p><p class="small muted">' + esc(err && err.message) + '</p><p><a href="#/getting-started">Getting started in NR Rally</a></p></div></main>';
  }
  function notFound() { return { title: 'Not found', html: '<div class="card empty"><h2>Page not found</h2><p><a href="' + sh('') + '">Back to the home page</a></p></div>' }; }

  /* ---------- home */
  function viewHome(q) {
    if (competition === 'rs') return viewRsHome();
    q = q || {};
    var d = D.standings.drivers, c = D.standings.codrivers;
    var html = '';
    var stages = D.rounds.reduce(function (a, r) { return a + r.stages.length; }, 0);
    var upcoming = D.calendar.filter(function (r) { return !r.hasResults; });
    html += '<section class="hero"><p class="hero-kicker">Gauteng · Limpopo · Mpumalanga · Free State · North West</p><p class="eyebrow">' + esc(D.championship) + '</p>' +
      '<h1>' + (D.rounds.length ? 'Every NR stage, time and point of ' + YEAR + '.' : 'The ' + YEAR + ' season.') + '</h1>' +
      (D.rounds.length && ST.site.tagline ? '<p>' + esc(ST.site.tagline) + '</p>' : '') +
      '<div class="hero-stats">' + (D.rounds.length ?
        stat(D.rounds.length + (upcoming.length ? ' / ' + D.calendar.length : ''), 'Rounds with results') + stat(D.events.length, 'Events') +
        stat(d.length, 'Drivers scored') + stat(stages, 'Recorded special stages') :
        (D.events.length ? stat(D.events.length, 'Events listed') : '') + (D.calendar.length ? stat(D.calendar.length, 'Rounds listed') : '')) + '</div>' +
      '<div class="hero-actions">' + (lastRound ? '<a class="btn primary" href="' + sh('/round/' + lastRound.id) + '">Open the latest stage graph</a><a class="btn ghost-dark" href="' + sh('/standings') + '">Championship standings</a>' :
        '<a class="btn primary" href="' + sh('/rounds') + '">See the calendar</a><a class="btn ghost-dark" href="' + sh('/info') + '">Regulations &amp; info</a>') +
        '<a class="btn ghost-dark" href="#/getting-started">Getting started in NR Rally</a></div></section>';
    if (!D.rounds.length) {
      html += '<div class="section"><div class="card empty"><h2>No results yet</h2><p>Standings and graphs appear after ' + YEAR + ' classifications are added. Calendar details may still be incomplete.</p>' +
        (D.people.length ? '<p><a href="' + sh('/crews') + '">See documented entry-list crews</a>. An entry is not a start or a scored result.</p>' : '') + '</div></div>';
      html += '<div class="section"><div class="section-head rounds-section-head"><h2>The ' + YEAR + ' calendar</h2>' +
        '<a class="go" href="' + sh('/rounds') + '">Full calendar →</a></div>' + eventCards('nr') + '</div>';
      return { title: 'Home', html: html };
    }
    if (!d.length) return { title: 'Home', html: html + '<div class="section"><div class="card empty"><h2>No scored starts yet</h2><p>Documented entries remain in crew profiles; entries and DNS do not create championship starts.</p></div></div>' +
      '<div class="section"><div class="section-head rounds-section-head"><h2>The ' + YEAR + ' rounds</h2>' +
      '<a class="go" href="' + sh('/rounds') + '">Full calendar →</a></div>' + eventCards('nr') + '</div>' };
    var prov = unconfirmed();
    var champD = d[0], champC = c[0];
    var rsTables = homeRallyeSportStandings();
    html +=         '<div class="section"><div class="section-head home-competition-head"><h2>Championship leaders</h2><div class="section-head-actions">' +
    '<a class="go" href="' + sh('/standings') + '">Full standings →</a></div></div><div class="grid grid-3">';
    var lead = d[1] ? champD.total - d[1].total : 0;
    html +=
      '<div class="card champ"><p class="eyebrow">Driver leader' + (prov.length ? ' · provisional' : '') + '</p><h3>' + plink(champD.name) + '</h3><p>' + champD.total + ' points · ' + esc(champD.cls) + ' · ' + starts(champD.starts) + (d[1] ? ' · ' + lead + ' clear of ' + esc(surname(d[1].name)) : '') + '</p>' +
      miniBars(champD) + (champC ? '<p class="small" style="margin-top:12px">Co-driver leader: <b>' + plink(champC.name) + '</b> · ' + champC.total + ' pts</p>' : '') + '</div>';
    html += leaderCard('Drivers', d.slice(0, 5), 'driver', 'nr', q, rsTables) +
      leaderCard('Co-drivers', c.slice(0, 5), 'codriver', 'nr', q, rsTables) + '</div>';
    html += '</div>';
    html += '<div class="section"><div class="section-head home-competition-head"><h2>Class leaders · drivers</h2></div><div class="grid grid-4">';
    CLASSES.forEach(function (cl) {
      var rows = d.filter(function (r) { return r.cls === cl; }).slice(0, 3);
      if (!rows.length) return;
      html += '<div class="card tight"><div class="leader-card-head">' + clsTag(cl) + '<a class="small" href="' + buildHash('/standings', { 'class': cl }) + '">Table →</a></div>' +
        rows.map(function (r, i) { return '<div class="leader"><span class="pos' + (i < 3 ? ' p' + (i + 1) : '') + '">' + (i + 1) + '</span><div class="who">' + plink(r.name) + '<div>' + starts(r.starts) + '</div></div><div class="pts">' + r.total + '<small>pts</small></div></div>'; }).join('') + '</div>';
    });
    html += '</div></div>';
    html += '<div class="section"><div class="section-head rounds-section-head"><h2>The ' + YEAR + ' rounds</h2>' +
      '<a class="go" href="' + sh('/rounds') + '">Full calendar →</a></div>' + eventCards('nr') + '</div>';
    return { title: 'Home', html: html };
  }
  function homeRallyeSportStandings() {
    var scoring = D.rallyesport && D.rallyesport.scoring || {};
    var tables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    var provisional = scoring.status !== 'ready';
    function rows(path) {
      var value = tables;
      path.split('.').forEach(function (key) { value = value && value[key]; });
      return Array.isArray(value) ? value : [];
    }
    var note = '';
    if (tables && provisional) {
      note = 'Provisional RS points. <a href="' + sh('/standings') + '">Standings &amp; scoring notes</a>.';
    } else if (tables) note = 'RS championship points. <a href="' + sh('/standings') + '">Full standings</a>.';
    else note = 'RS points unavailable. <a href="' + sh('/standings') + '">Scoring notes</a>.';
    return { rows: rows, note: note, provisional: provisional, available: !!tables };
  }
  function homeRallyeSportChampCard(tables) {
    function leaderLine(role, path) {
      var rows = tables.rows(path).filter(function (row) { return row.rank != null; });
      var leaders = rows.length ? rows.filter(function (row) { return row.rank === rows[0].rank; }) : [];
      var title = (tables.provisional ? 'Provisional ' : '') + 'RS ' + role + ' leader' + (leaders.length === 1 ? '' : 's');
      if (!leaders.length) return '<p><b>' + title + '</b> unavailable.</p>';
      return '<p><b>' + title + ':</b> ' + leaders.map(function (row) { return rsProfileLink(row.id, row.name); }).join(', ') +
        ' · ' + leaders[0].points + ' pts</p>';
    }
    var leaders = tables.rows('overallDrivers').filter(function (row) { return row.rank === 1; });
    return '<div class="card champ"><p class="eyebrow">RallyeSport leaders</p>' +
      leaderLine('driver', 'overallDrivers') + (leaders.length === 1 ? rsMiniBars(leaders[0], 'driver') : '') +
      leaderLine('co-driver', 'overallCodrivers') + '</div>';
  }
  function rsMiniBars(row, role) {
    var points = rsPersonRoundPoints(D, row.id, role);
    var max = Math.max.apply(null, [1].concat(Object.keys(points).map(function (id) { return points[id].pts; })));
    return '<div class="minibars" aria-label="Points per round">' + D.rallyesport.events.map(function (event) {
      var result = rallyeSportResultForEvent(event.id);
      if (!result) return '';
      var value = points[result.id], label = event.roundNumber == null ? '?' : event.roundNumber;
      return '<div class="mb" title="' + esc(event.name) + ': ' + (value ? value.pts + ' pts' : 'unavailable / no scored result') + '"><i style="height:' +
        Math.max(3, (value ? value.pts : 0) / max * 56) + 'px' + (value ? '' : ';opacity:.25') + '"></i><span>' +
        (value ? value.pts : '–') + '</span><em>R' + label + '</em></div>';
    }).join('') + '</div>';
  }
  function viewRsHome() {
    var tables = homeRallyeSportStandings(), rs = D.rallyesport;
    var latest = rs.events.slice().reverse().map(function (event) { return rallyeSportResultForEvent(event.id); }).filter(Boolean)[0];
    var stages = rs.results.reduce(function (sum, result) { return sum + result.stages.length; }, 0);
    var html = '<section class="hero"><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>RallyeSport results &amp; points.</h1>' +
      '<div class="hero-stats">' + stat(rs.results.length + (rs.events.length > rs.results.length ? ' / ' + rs.events.length : ''), 'Rounds with results') +
      stat(rs.events.length, 'Events') + stat(tables.available ? tables.rows('overallDrivers').filter(function (row) { return row.rank != null; }).length : '—', 'Drivers scored') +
      stat(stages, 'Recorded special stages') + '</div><div class="hero-actions">' +
      '<a class="btn primary" href="' + (latest ? sh('/rallyesport/' + encodeURIComponent(latest.id) + '/graph') : sh('/rounds')) + '">' +
      (latest ? 'Open the latest stage graph' : 'See the calendar') + '</a><a class="btn ghost-dark" href="' +
      sh('/standings') + '">RS championship standings</a><a class="btn ghost-dark" href="#/getting-started">Getting started in NR Rally</a></div></section>';
    if (!rallyeSportEvents().length) html += '<div class="section card empty">No RS data is published for ' + YEAR + '. NR results are available using the competition switch.</div>';
    html += '<div class="section"><div class="section-head"><h2>Championship leaders</h2><a class="go" href="' +
      sh('/standings') + '">Full RS tables →</a></div><div class="grid grid-3">' + homeRallyeSportChampCard(tables) +
      leaderCard('RS drivers', tables.rows('overallDrivers').filter(function (row) { return row.rank != null; }), 'driver', 'rs', {}, tables) +
      leaderCard('RS co-drivers', tables.rows('overallCodrivers').filter(function (row) { return row.rank != null; }), 'codriver', 'rs', {}, tables) + '</div>';
    if (tables.note) html += '<p class="small muted home-rs-note">' + tables.note + '</p>';
    html += '</div><div class="section"><div class="section-head"><h2>RS class leaders · drivers</h2></div><div class="grid grid-2 home-rs-classes">';
    ['RS2', 'RS4'].forEach(function (cls) {
      var rows = tables.rows('classDrivers.' + cls).slice(0, 3);
      html += '<div class="card tight"><div class="leader-card-head">' + clsTag(cls) +
        '<a class="small" href="' + sh('/rallyesport') + '">RS tables →</a></div>' +
        (rows.length ? rows.map(function (r, i) {
          return '<div class="leader"><span class="pos' + (r.rank != null && i < 3 ? ' p' + (i + 1) : '') + '">' + (r.rank == null ? '—' : r.rank) +
            '</span><div class="who">' + rsProfileLink(r.id, r.name) + rsEligibilityMarker({ status: r.eligibilityStatus, reason: r.eligibilityReason }) + '</div>' +
            '<div class="pts">' + r.points + '<small>pts</small></div></div>';
        }).join('') : '<p class="small muted">No RS points available for this class.</p>') + '</div>';
    });
    return { title: 'RallyeSport', html: html + '</div></div><div class="section"><div class="section-head"><h2>RS rounds &amp; results</h2>' +
      '<a class="go" href="' + sh('/rounds') + '">Full RS calendar &amp; results →</a></div>' + eventCards('rs') + '</div>' };
  }
  function miniBars(row) {
    var max = Math.max(1, (D.pointsScale.overall[0] || 0) + (D.pointsScale.cls[0] || 0));
    return '<div class="minibars" aria-label="Points per round">' + D.rounds.map(function (r) {
      var v = row.rounds[r.id]; var pts = v ? v.pts : 0;
      return '<div class="mb" title="R' + r.n + ': ' + (v ? (v.status === 'DNF' ? 'DNF' : pts + ' pts') : 'did not start') + '"><i style="height:' + Math.max(3, pts / max * 56) + 'px' + (v ? '' : ';opacity:.25') + '"></i><span>' + (v ? (v.status === 'DNF' ? '—' : pts) : '') + '</span><em>R' + r.n + '</em></div>';
    }).join('') + '</div>';
  }
  function stat(v, l) { return '<div class="hero-stat"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function leaderCard(title, rows, role, mode, q, rsTables) {
    var isRs = mode === 'rs';
    if (isRs) rows = rows.slice(0, 5);
    var tableHref = isRs ? sh('/rallyesport') : sh('/standings' + (role === 'codriver' ? '/codrivers' : ''));
    var body = isRs ? (rows.length ? rows.map(function (r) {
      return '<div class="leader"><span class="pos' + (r.rank <= 3 ? ' p' + r.rank : '') + '">' + r.rank +
        '</span><div class="who">' + rsProfileLink(r.id, r.name) + '</div>' +
        '<div class="pts">' + r.points + '<small>pts</small></div></div>';
    }).join('') : '<p class="small muted">' + (rsTables.available ? 'No RS points recorded for this table.' : esc(rsTables.note.replace(/<[^>]*>/g, ''))) + '</p>') :
      rows.map(function (r) {
        return '<div class="leader"><span class="pos' + (r.rank <= 3 ? ' p' + r.rank : '') + '">' + r.rank + '</span><div class="who">' + plink(r.name) + '<div>' + clsTag(r.cls) + ' ' + starts(r.starts) + '</div></div><div class="pts">' + r.total + '<small>pts</small></div></div>';
      }).join('');
    return '<div class="card"><div class="leader-card-head"><h3>' + title + '</h3><div><a class="small" href="' + tableHref + '">' +
      (isRs ? 'RS tables →' : 'Table →') + '</a></div></div>' + body + '</div>';
  }
  function eventLinks(ev, list) {
    var L = ev.links || {};
    var items = [['results', 'Official results'], ['entryList', 'Entry list'], ['srs', 'Supplementary regs'], ['noticeboard', 'Noticeboard'], ['spectatorGuide', 'Spectator guide']]
      .map(function (k) { return ext(L[k[0]], esc(k[1]) + ' ↗'); }).filter(Boolean);
    if (list && safeUrl(list.source.url) && safeUrl(list.source.url) !== safeUrl(L.entryList)) items.push(ext(list.source.url, 'Entry source ↗'));
    return items.length ? '<div class="ev-links">' + items.join('') + '</div>' : '';
  }
  function rallyeSportEvents() {
    return D.rallyesport && D.rallyesport.events || [];
  }
  function rallyeSportResultForEvent(eventId) {
    return (D.rallyesport && D.rallyesport.results || []).filter(function (result) { return result.eventId === eventId; })[0] || null;
  }
  function rallyeSportResultCard(event) {
    var result = rallyeSportResultForEvent(event.id);
    var round = event.roundNumber == null ? 'RS' : 'RS R' + event.roundNumber;
    var displayDates = rallyeSportDisplayDates(event);
    return result ? '<a class="event-round" href="' + sh('/rallyesport/' + encodeURIComponent(result.id) + '/graph') + '"><span class="rnd">' + round +
      '</span><span class="w"><b>' + esc(result.title || 'Official RS classification') + '</b><span>' + esc(result.status || 'Classification status unclear') +
      ' · ' + (result.entries || []).length + ' source rows</span></span><span class="go">Graph →</span></a>' :
      '<div class="event-round upcoming"><span class="rnd">' + round + '</span><span class="w"><b>' + (displayDates ? esc(displayDates) : 'Date to be confirmed') +
      '</b><span>RS results not published</span></span><span class="go muted">Upcoming</span></div>';
  }
  function rallyeSportDisplayDates(event) {
    if (event && event.dates) return event.dates;
    if (!event || !event.nrEventId) return '';
    var linked = D.events.filter(function (nrEvent) { return nrEvent.id === event.nrEventId; })[0];
    return linked && linked.dates || '';
  }
  function rallyeSportEventCard(event) {
    var badge = event.nrEventId ? 'NR + RS' : 'RS';
    return '<div class="card event-card rs-event-card"><div class="event-top"><div class="event-topline"><h3>' + esc(event.name) +
      '</h3><span class="competition-badge">' + badge + '</span></div><div class="meta">' + esc(rallyeSportDisplayDates(event) || 'Date to be confirmed') +
      (event.venue ? ' · ' + esc(event.venue) : '') + '</div></div><div class="event-rounds">' + rallyeSportResultCard(event) + '</div></div>';
  }
  function eventCalendarDate(event, isRallyeSport) {
    if (event && calendarDate(event.startDate)) return event.startDate;
    if (!isRallyeSport) {
      var dates = D.calendar.filter(function (row) { return row.eventId === event.id; })
        .map(function (row) { return calendarDate(row.date) ? row.date : ''; }).filter(Boolean).sort();
      if (dates.length) return dates[0];
    }
    return calendarDateText(event && event.dates);
  }
  function eventCards(mode) {
    mode = mode || 'all';
    var rsEvents = rallyeSportEvents();
    if (mode === 'rs') {
      if (!rsEvents.length) return '<div class="card empty">No RS events are listed for ' + YEAR + '.</div>';
      return '<div class="grid events-grid">' + rsEvents.slice().sort(function (a, b) {
        if (a.roundNumber == null || b.roundNumber == null) return a.roundNumber == null && b.roundNumber == null ? 0 : a.roundNumber == null ? 1 : -1;
        return a.roundNumber - b.roundNumber;
      }).map(rallyeSportEventCard).join('') + '</div>';
    }
    if (!D.events.length && (mode !== 'all' || !rsEvents.length)) return '<div class="card empty">No events have been added to the ' + YEAR + ' calendar yet.</div>';
    var nrCards = D.events.map(function (ev, eventIndex) {
      var list = D.entryLists.filter(function (l) { return l.eventId === ev.id; })[0];
      var linkedRsEvents = rsEvents.filter(function (event) { return event.nrEventId === ev.id; });
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
        if (!r) return '<a class="event-round upcoming" href="' + sh('/round/' + c.id) + '"><span class="rnd">R' + c.n + '</span><span class="w"><b>' + (c.date ? fmtDate(c.date) : 'Date to be confirmed') + '</b><span>' + (c.day ? esc(c.day) + ' · ' : '') + 'results not published yet</span>' + upcomingEntries(c.id) + '</span>' +
          (calendarDate(c.date) ? '<span class="go muted">' + calendarStatus(c.date) + '</span>' : '') + '</a>';
        var w = winnerOf(r);
        return '<a class="event-round" href="' + sh('/round/' + r.id) + '"><span class="rnd">R' + r.n + '</span><span class="w">' + (w ? '<b>' + esc(w.driver) + '</b> / ' + esc(w.codriver) : '—') +
          '<span>' + esc(r.day) + ' · ' + r.stages.length + ' stages · ' + classifiedSorted(r).length + ' classified' + (classificationState(r) === 'provisional' ? ' · provisional sheet' : classificationState(r) === 'unclear' ? ' · finality unclear' : '') + '</span></span><span class="go">Graph →</span></a>';
      }).join('');
      if (mode === 'all') rows += linkedRsEvents.map(rallyeSportResultCard).join('');
      var entryNote = list && (list.eventEntries || list.complete) ? list.eventEntries + ' NR Entries' +
        (list.complete ? '' : ' (partial)') : '';
      var badge = 'NR';
      return { date: eventCalendarDate(ev, false), order: eventIndex, html: '<div class="card event-card"><div class="event-top"><div class="event-topline"><h3>' + esc(ev.name) + '</h3><span class="competition-badge">' + badge +
        '</span></div><div class="meta">' + [ev.dates || 'Date to be confirmed', ev.venue, ev.surface].filter(Boolean).map(esc).join(' · ') + '</div>' +
        (entryNote ? '<div class="small muted">' + entryNote + '</div>' : '') + eventLinks(ev, list) + '</div><div class="event-rounds">' +
        (rows || '<div class="event-round upcoming"><span class="w"><span>No rounds added yet</span></span></div>') + '</div></div>' };
    });
    if (mode === 'all') nrCards = nrCards.concat(rsEvents.filter(function (event) {
      return !D.events.some(function (nrEvent) { return event.nrEventId === nrEvent.id; });
    }).map(function (event, i) {
      return { date: eventCalendarDate(event, true), order: D.events.length + i, html: rallyeSportEventCard(event) };
    })).sort(function (a, b) {
      if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.order - b.order;
    });
    if (!nrCards.length) return '<div class="card empty">No events have been added to the ' + YEAR + ' calendar yet.</div>';
    return '<div class="grid events-grid">' + nrCards.map(function (card) { return card.html; }).join('') + '</div>';
  }

  /* ---------- standings */
  function viewStandings(role, q) {
    var rows = role === 'driver' ? D.standings.drivers : D.standings.codrivers;
    var cls = CLASSES.indexOf(q['class']) >= 0 ? q['class'] : '';
    var shown = cls ? rows.filter(function (r) { return r.cls === cls; }) : rows;
    var showBreak = q.pts === 'split';
    var base = '/standings' + (role === 'codriver' ? '/codrivers' : '');
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' standings</p><h1>' + (role === 'driver' ? 'Drivers' : 'Co-drivers') + (cls ? ' · ' + cls : '') + '</h1>' +
      '<p>' + (D.rounds.length ? 'Overall + class points · Minimum ' + D.minStarts + ' starts for eligibility.' : 'Standings appear after recorded championship starts; entries alone do not score points.') + '</p></div>' +
      '<div class="seg" role="tablist"><a href="' + buildHash('/standings', { 'class': cls }) + '" class="' + (role === 'driver' ? 'on' : '') + '">Drivers</a><a href="' + buildHash('/standings/codrivers', { 'class': cls }) + '" class="' + (role === 'codriver' ? 'on' : '') + '">Co-drivers</a></div></div>';
    if (!D.rounds.length) return { title: 'Standings', html: html + '<div class="card empty">No ' + YEAR + ' results yet. <a href="' + sh('/rounds') + '">See the calendar</a>' +
      (D.people.length ? ' or <a href="' + sh('/crews') + '">documented entry-list crews</a>' : '') + '.</div>' };
    if (!rows.length) return { title: 'Standings', html: html + '<div class="card empty">No recorded ' + (role === 'driver' ? 'driver' : 'co-driver') +
      ' championship starts yet for ' + YEAR + '. Entries and DNS do not create starts. <a href="' + sh('/rounds') + '">See published classifications</a> or <a href="' + sh('/crews') + '">documented crews</a>.</div>' };
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
  function rsProfileLink(id, name) {
    return id ? '<a href="' + sh('/person/' + encodeURIComponent(id)) + '">' + esc(name) + '</a>' : esc(name || '—');
  }
  function rsEntryLink(entry, role) {
    return rsProfileLink(entry[role + 'Known'] ? entry[role + 'Id'] : '', entry[role]);
  }
  function rsEligibilityMarker(info) {
    return info && info.status !== 'eligible' ?
      '<span class="note-mark" title="RS0 Non-Scoring SSR 6.1 — championship scoring only; this does not establish non-membership.">RS0 · Non-Scoring*</span>' : '';
  }
  function rsChampionshipStatus(info) {
    return !info ? '<span class="muted">Scoring status unavailable</span>' : info.status === 'eligible' ?
      esc(info.scoringClass) : rsEligibilityMarker(info);
  }
  function rsResultScoringNote() {
    return '<p class="small muted">Official finish is separate from each person’s championship scoring.</p>';
  }
  function rsEligibilityNote() {
    return '<p class="small muted rs-eligibility-note">* RS0 Non-Scoring SSR 6.1 · No championship points or rank; not a declaration of non-membership.</p>';
  }
  function rsDisplayClass(result, entry) {
    var mapped = (result.classMappings || {})[E.normClass(entry['class'])];
    return mapped || entry['class'];
  }
  function rsScoringNotice() {
    var scoring = D.rallyesport.scoring;
    var hasTables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    return '<p class="small muted">' + (scoring.status === 'ready' ? 'RS championship points.' :
      hasTables ? 'Provisional RS points · scored rounds only.' : 'RS points unavailable. ' + esc(scoring.reason || '')) + '</p>' +
      '<details class="notes rs-scoring-notes"><summary>Scoring notes</summary><div><p>' + esc(scoring.reason || '') + '</p>' +
      (rallyeSportStarterMinimumNote(scoring, D.year) ? '<p class="small">' + esc(rallyeSportStarterMinimumNote(scoring, D.year)) + '</p>' : '') +
      (scoring.provisionalStandings && scoring.status !== 'ready' ? '<p>Provisional cumulative points: ready events only; blocked events are excluded, not scored as zero.</p>' : '') +
      ((scoring.excludedProvisionalEvents || []).length ? '<p class="small">Not scored: ' +
        scoring.excludedProvisionalEvents.map(function (row) {
          var event = rallyeSportEvents().filter(function (event) { return event.id === row.eventId; })[0];
          return esc(event ? event.name : row.eventId) + ' — ' + esc(row.reason);
        }).join('; ') + '</p>' : '') + '</div></details>';
  }
  function viewRsStandings(role, q) {
    var tables = homeRallyeSportStandings(), base = '/standings' + (role === 'codriver' ? '/codrivers' : '');
    var cls = ['RS0', 'RS2', 'RS4'].indexOf(q['class']) >= 0 ? q['class'] : '';
    var showBreak = q.pts === 'split';
    var path = cls ? (role === 'driver' ? 'classDrivers.' : 'classCodrivers.') + cls :
      role === 'driver' ? 'overallDrivers' : 'overallCodrivers';
    var title = 'RS ' + (role === 'driver' ? 'drivers' : 'co-drivers');
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport standings</p><h1>' + title + '</h1></div>' +
      '<div class="seg"><a href="' + buildHash('/standings', { 'class': cls, pts: q.pts }) + '" class="' + (role === 'driver' ? 'on' : '') +
      '">Drivers</a><a href="' + buildHash('/standings/codrivers', { 'class': cls, pts: q.pts }) + '" class="' + (role === 'codriver' ? 'on' : '') + '">Co-drivers</a></div></div>';
    html += rsScoringNotice() + '<div class="filters"><div class="seg">' + ['', 'RS2', 'RS4', 'RS0'].map(function (value) {
      return '<a href="' + buildHash(base, { 'class': value, pts: q.pts }) + '" class="' + (value === cls ? 'on' : '') + '">' + (value || 'Overall') + '</a>';
    }).join('') + '</div><div class="seg"><a href="' + buildHash(base, { 'class': cls }) + '" class="' + (showBreak ? '' : 'on') +
      '">Points</a><a href="' + buildHash(base, { 'class': cls, pts: 'split' }) + '" class="' + (showBreak ? 'on' : '') +
      '">Overall + class split</a></div></div>' +
      (showBreak ? '<p class="small muted">RS overall totals reuse class points; no separate overall points are added. Each round shows its scoring class.</p>' : '') +
      rsStandingsTable((tables.provisional ? 'Provisional · ' : '') + (cls || 'Overall'), tables.rows(path),
      { RS2: tables.rows((role === 'driver' ? 'classDrivers.' : 'classCodrivers.') + 'RS2'),
        RS4: tables.rows((role === 'driver' ? 'classDrivers.' : 'classCodrivers.') + 'RS4') }, cls, role, showBreak);
    html += rsEligibilityNote();
    if (!rallyeSportEvents().length) html += '<p>No RS data is published for ' + YEAR + '.</p>';
    return { title: title, html: html };
  }
  function rsResultTabs(id, active, q) {
    var path = '/rallyesport/' + encodeURIComponent(id);
    return '<nav class="tabs" aria-label="RS result views">' +
      [['graph', 'Stage graph'], ['classification', 'Classification'], ['stages', 'Stage times']].map(function (tab) {
        return '<a class="' + (active === tab[0] ? 'on' : '') + '" href="' +
          buildHash(path + '/' + tab[0], { cars: q && q.cars, m: q && q.m }) + '">' + tab[1] + '</a>';
      }).join('') + '</nav>';
  }
  function rsResultHeader(result, event, tab, q) {
    var events = rallyeSportEvents(), results = D.rallyesport.results.slice().sort(function (a, b) {
      return events.findIndex(function (item) { return item.id === a.eventId; }) -
        events.findIndex(function (item) { return item.id === b.eventId; });
    }), index = results.indexOf(result);
    function link(row, label) { return '<a class="btn" href="' + sh('/rallyesport/' + encodeURIComponent(row.id) + '/' + tab) + '">' + label + '</a>'; }
    return '<div class="round-switch" aria-label="RS rounds">' + results.map(function (row) {
      var sourceEvent = rallyeSportEvents().filter(function (item) { return item.id === row.eventId; })[0];
      return '<a class="' + (row.id === result.id ? 'on' : '') + '" href="' + sh('/rallyesport/' + encodeURIComponent(row.id) + '/' + tab) + '">' +
        esc(sourceEvent ? sourceEvent.name : row.title || row.id) + '</a>';
    }).join('') + '</div><div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>' + esc(event.name) +
      '</h1><div class="round-meta">' +
      (rallyeSportDisplayDates(event) ? '<span>' + esc(rallyeSportDisplayDates(event)) + '</span>' : '') +
      '<span>' + result.stages.length + ' stage' + (result.stages.length === 1 ? '' : 's') + '</span><span class="badge">' + esc(result.status) + '</span>' +
      (rallyeSportQualificationNote(result) ? '<span class="badge prov" title="Subject to post-event technical checks; clearance unverified.">Technical checks pending</span>' : '') +
      '</div></div><div class="hero-actions">' +
      (index > 0 ? link(results[index - 1], '← Previous') : '') + (index < results.length - 1 ? link(results[index + 1], 'Next →') : '') +
      '<a class="btn" href="' + sh('/rounds') + '">All RS rounds</a></div></div>' + rsResultTabs(result.id, tab, q);
  }
  function viewRsGraph(id, q, tab) {
    tab = tab || 'graph';
    var result = D.rallyesport.results.filter(function (row) { return row.id === id; })[0];
    if (!result) return notFound();
    var event = rallyeSportEvents().filter(function (row) { return row.id === result.eventId; })[0] || { name: result.eventId };
    var html = rsResultHeader(result, event, tab, q), model = rsGraphModel(result, event);
    var hasTiming = model.entries.some(function (entry) { return entry.times.some(function (time) { return time != null; }); });
    if (!hasTiming) html += '<div class="callout warn"><div><b>No RS stage timing is published for this result.</b><p>Stage-time graphs and comparisons are unavailable. Any published official final positions and totals remain available; missing times are not inferred.</p></div></div>';
    if (q.m === 'spos' && !model.entries.some(function (entry) { return entry.stagePos.some(function (pos) { return pos != null; }); }))
      html += '<div class="callout warn"><div>No official RS stage positions are published for this result. This metric is unavailable; ranks are not inferred from times.</div></div>';
    html += tab === 'stages' ? roundStageTimes(model) : roundGraph(model, q);
    if (model.entries.some(function (entry) {
      return entry.driverEligibility && entry.driverEligibility.status !== 'eligible' ||
        entry.codriverEligibility && entry.codriverEligibility.status !== 'eligible';
    })) html += rsEligibilityNote();
    return { title: event.name + ' — RS ' + (tab === 'stages' ? 'stage times' : 'graph'), html: html };
  }
  function rsGraphModel(result, event) {
    var score = rallyeSportScoreForResult(result), scoreByCar = Object.create(null);
    (score && score.entries || []).forEach(function (row) { scoreByCar[row.car] = row; });
    var r = { rs: true, id: result.id, name: event.name, timePrecision: 1, progression: {},
      stages: result.stages.map(function (stage) { return stage.label || stage.id; }),
      entries: result.entries.map(function (entry) {
        var points = scoreByCar[String(entry.car)] || {};
        return Object.assign({}, entry, { car: String(entry.car),
          cls: rsDisplayClass(result, entry),
          driverEligibility: points.driverEligibility || null,
          codriverEligibility: points.codriverEligibility || null,
          times: result.stages.map(function (stage, i) { return E.parseRallyeSportTime((entry.times || [])[i]); }),
          total: E.parseRallyeSportTime(entry.total), pen: E.parseRallyeSportTime(entry.penalty) });
      }) };
    r.labels = r.stages.concat(['Final']);
    // Adapt the pure RS progressions to the shared display contract, never to NR axes or scoring.
    var graphResult = Object.assign({}, result, { stages: result.stages.map(function (stage) {
      return Object.assign({}, stage, { nrStage: stage.id });
    }) });
    METRICS.forEach(function (metric) {
      E.buildRallyeSportGraph(graphResult, result.stages.map(function (stage) { return stage.id; }), metric.id).forEach(function (series) {
        var car = String(series.entry.car);
        if (!r.progression[car]) r.progression[car] = { cum: series.cumulative };
        r.progression[car][metric.id === 'loss' ? 'delta' : metric.id] = series.values;
        r.timePrecision = Math.max(r.timePrecision, series.timePrecision);
      });
    });
    return r;
  }
  function rsStandingsTable(title, rows, classTables, selectedClass, role, showBreak) {
    var results = role ? D.rallyesport.events.map(function (event) {
      var result = rallyeSportResultForEvent(event.id);
      return result ? { event: event, result: result } : null;
    }).filter(Boolean) : [];
    function championshipClasses(row) {
      var classes = ['RS2', 'RS4'].filter(function (cls) {
        return (!selectedClass || selectedClass === cls) && classTables && (classTables[cls] || []).some(function (person) {
          return person.id === row.id && person.rank != null;
        });
      });
      return classes.length ? classes.join(' + ') : 'Scoring class unavailable';
    }
    return '<div class="section"><div class="section-head"><h2>' + esc(title) + '</h2></div>' +
      (rows && rows.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Rank</th><th>Competitor</th><th>Championship scoring</th>' +
        results.map(function (item) { return '<th class="num"><a href="' + sh('/rallyesport/' + encodeURIComponent(item.result.id) + '/classification') +
          '" title="' + esc(item.event.name) + '">' + (item.event.roundNumber == null ? esc(item.event.name) : 'R' + item.event.roundNumber) + '</a></th>'; }).join('') +
        '<th class="num">Points</th></tr></thead><tbody>' +
        rows.map(function (row) {
          var byRound = rsPersonRoundPoints(D, row.id, role, selectedClass);
          return '<tr><td class="num">' + (row.rank == null ? '—' : row.rank) + '</td><td>' +
          rsProfileLink(row.id, row.name) + '</td><td>' +
          (row.rank == null ? rsEligibilityMarker({ status: row.eligibilityStatus, reason: row.eligibilityReason }) :
            esc(championshipClasses(row))) + '</td>' + results.map(function (item) {
              var value = byRound[item.result.id];
              return '<td class="num" title="' + esc(value ? value.status : 'Unavailable / no scored result') + '">' +
                (value ? (showBreak ? '<span class="ptcell' + (value.pts ? '' : ' zero') + '"><b>' + value.pts +
                  '</b><small>' + esc(Object.keys(value.classes).map(function (cls) { return cls + ' ' + value.classes[cls]; }).join(' · ')) +
                  '</small></span>' : value.pts) : '—') + '</td>';
            }).join('') + '<td class="num"><b>' + row.points + '</b></td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="card empty">No points have been established for this table.</div>') + '</div>';
  }
  function rsEventScoringTable(result, score) {
    if (!score || score.status !== 'ready') return '';
    var scoreByCar = Object.create(null);
    (score.entries || []).forEach(function (row) { scoreByCar[row.car] = row; });
    var rows = [];
    (result.entries || []).forEach(function (entry) {
      var carScore = scoreByCar[String(entry.car)] || {};
      ['driver', 'codriver'].forEach(function (role) {
        if (!entry[role] || entry.status === 'DNS') return;
        var info = carScore[role + 'Eligibility'];
        if (!info) return;
        rows.push({ entry: entry, role: role, info: info, points: carScore[role + 'Points'] });
      });
    });
    rows.sort(function (a, b) {
      var aRanked = a.info.status === 'eligible' && a.info.scoringPosition != null;
      var bRanked = b.info.status === 'eligible' && b.info.scoringPosition != null;
      if (aRanked !== bRanked) return aRanked ? -1 : 1;
      if (aRanked && (a.info.scoringClass !== b.info.scoringClass)) return a.info.scoringClass < b.info.scoringClass ? -1 : 1;
      if (aRanked && a.info.scoringPosition !== b.info.scoringPosition) return a.info.scoringPosition - b.info.scoringPosition;
      if (a.info.status === 'eligible' && b.info.status !== 'eligible') return -1;
      if (b.info.status === 'eligible' && a.info.status !== 'eligible') return 1;
      return a.entry[ a.role ].localeCompare(b.entry[ b.role ]) || a.role.localeCompare(b.role);
    });
    return '<details class="notes rs-scoring-order"><summary>RS championship scoring order</summary>' +
      '<p class="small muted">Driver and co-driver ranks are independent.</p>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Scoring position</th><th>Competitor</th><th>Role</th><th>Car</th><th>Championship scoring</th><th class="num">Championship points</th></tr></thead><tbody>' +
      rows.map(function (row) {
        var isEligible = row.info.status === 'eligible';
        var position = isEligible && row.info.scoringPosition != null ? row.info.scoringPosition : '—';
        return '<tr class="' + (isEligible ? '' : 'rs0-row') + '"><td class="num">' + position + '</td><td>' +
          rsEntryLink(row.entry, row.role) + '</td><td>' +
          (row.role === 'driver' ? 'Driver' : 'Co-driver') + '</td><td>' + esc(row.entry.car) + '</td><td>' +
          rsChampionshipStatus(row.info) + '</td><td class="num"><b>' + (row.points == null ? '—' : row.points) + '</b></td></tr>';
      }).join('') + '</tbody></table></div></details>';
  }
  function rsSourceNotes(result, score, scoring) {
    var mappedClasses = Array.from(new Set(Object.keys(result.classMappings || {}).map(function (category) {
      return result.classMappings[category];
    })));
    var source = result.source || {}, minimum = rallyeSportStarterMinimumNote(scoring, D.year);
    return '<details class="notes rs-source-notes"><summary>Source &amp; scoring notes</summary><div><p><b>' +
      esc(result.title) + '</b> · ' + esc(result.status) + '</p>' +
      (source.url && safeUrl(source.url) ? '<p>' + ext(source.url, 'Official source classification ↗') + '</p>' : '') +
      (source.file ? '<p>Source: ' + esc(source.file) + '</p>' : '') +
      (mappedClasses.length ? '<p>Displayed RS classes: ' + mappedClasses.map(esc).join(', ') +
        '. Event-specific source class mapping applied; printed categories remain in the official source.</p>' : '') +
      ((result.notes || []).length ? '<ul>' + result.notes.map(function (note) { return '<li>' + esc(note) + '</li>'; }).join('') + '</ul>' : '') +
      '<p>Source records, finish order and timing are preserved. Missing times stay missing; final positions are not inferred from stage sums.</p>' +
      (score && score.reason ? '<p>' + esc(score.reason) + '</p>' : '') +
      (minimum ? '<p>' + esc(minimum) + '</p>' : '') + '</div></details>';
  }
  function viewRallyeSport(resultId, q) {
    var rs = D.rallyesport || { events: [], results: [], scoring: { status: 'unconfigured', reason: 'RS rules are not configured.', results: [], standings: null } };
    var scoring = rs.scoring || { status: 'unconfigured', reason: 'RS rules are not configured.', results: [], standings: null };
    if (resultId) {
      var result = rs.results.filter(function (item) { return item.id === resultId; })[0];
      if (!result) return notFound();
      var event = rs.events.filter(function (item) { return item.id === result.eventId; })[0] || { name: result.eventId, dates: '' };
      var score = (scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0];
      var scoreByCar = Object.create(null);
      (score && score.entries || []).forEach(function (row) { scoreByCar[row.car] = row; });
      var columns = ['<th class="num" scope="col" title="Official position">Pos</th>', '<th class="num" scope="col">No.</th>',
        '<th scope="col">Crew / championship scoring</th>', '<th scope="col">RS class</th>',
        '<th scope="col">Official finish</th>', '<th class="num" scope="col">Official total</th>'];
      var ready = score && score.status === 'ready';
      if (ready) columns.push('<th class="num" scope="col">Championship pts</th>');
      var rows = (result.entries || []).map(function (entry) {
        var points = scoreByCar[String(entry.car)] || {};
        function person(role, label) {
          var info = points[role + 'Eligibility'];
          return '<div class="rs-crew-role" aria-label="' + label + '"><span>' + rsEntryLink(entry, role) + '</span>' +
            (info ? '<span class="small rs-role-status">' + rsChampionshipStatus(info) + '</span>' : '') + '</div>';
        }
        var cells = ['<td class="num rs-result-pos">' + (entry.status === 'TEST' ? '<span class="pos dnf">TEST</span>' : posBadge(entry.pos, entry.status)) + '</td>',
          '<td class="num rs-result-car"><span class="carno-lg">' + esc(entry.car) + '</span></td>',
          '<td class="rs-result-crew"><div class="crew">' + person('driver', 'Driver') + person('codriver', 'Co-driver') +
            (entry.vehicle ? '<span class="small muted">' + esc(entry.vehicle) + '</span>' : '') + '</div></td>',
          '<td class="rs-result-class" data-label="RS class">' + clsTag(rsDisplayClass(result, entry)) +
            '<span class="small muted rs-class-position">Class pos: ' + esc(entry.classPos == null ? '—' : entry.classPos) + '</span></td>',
          '<td class="rs-result-finish" data-label="Official finish">' + esc(entry.status) + '</td>',
          '<td class="num mono rs-result-total" data-label="Official total"><b>' + (entry.total ? esc(entry.total) : '—') + '</b>' +
            '<span class="small muted rs-penalty">Penalty: ' + (entry.penalty ? esc(entry.penalty) : '—') + '</span></td>'];
        if (ready) cells.push('<td class="num rs-result-points" data-label="Championship pts">' +
          '<span aria-label="Driver points" title="Driver championship points">D <b>' + (points.driverPoints == null ? '—' : points.driverPoints) + '</b></span>' +
          '<span aria-label="Co-driver points" title="Co-driver championship points">C <b>' + (points.codriverPoints == null ? '—' : points.codriverPoints) + '</b></span></td>');
        return '<tr data-car="' + esc(entry.car) + '">' + cells.join('') + '</tr>';
      }).join('');
      var html = rsResultHeader(result, event, 'classification', q);
      if (!ready) html += '<p class="small muted">RS event points unavailable. ' +
        esc(score && score.reason || 'No championship scoring review is published for this event.') + '</p>';
      html += '<div class="table-wrap rs-classification"><table class="data compact"><caption class="sr-only">Official RS classification with individual championship scoring</caption><thead><tr>' +
        columns.join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + rsResultScoringNote();
      if ((score && score.entries || []).some(function (entry) {
        return entry.driverEligibility && entry.driverEligibility.status !== 'eligible' ||
          entry.codriverEligibility && entry.codriverEligibility.status !== 'eligible';
      })) html += rsEligibilityNote();
      html += rsSourceNotes(result, score, scoring) + rsEventScoringTable(result, score);
      return { title: event.name + ' — RallyeSport classification', html: html };
    }
    var htmlList = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>RallyeSport tables</h1></div></div>' +
      rsScoringNotice();
    var standings = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    if (standings) {
      var labelPrefix = scoring.status === 'ready' ? '' : 'Provisional · ';
      htmlList += rsStandingsTable(labelPrefix + 'Overall drivers', standings.overallDrivers, standings.classDrivers, '', 'driver') +
        rsStandingsTable(labelPrefix + 'Overall co-drivers', standings.overallCodrivers, standings.classCodrivers, '', 'codriver');
      ['RS2', 'RS4'].forEach(function (cls) {
        htmlList += rsStandingsTable(labelPrefix + cls + ' drivers', standings.classDrivers[cls], standings.classDrivers, cls, 'driver') +
          rsStandingsTable(labelPrefix + cls + ' co-drivers', standings.classCodrivers[cls], standings.classCodrivers, cls, 'codriver');
      });
      htmlList += rsEligibilityNote();
    } else htmlList += '<div class="card empty"><b>Championship totals are not available.</b><p>' + esc(scoring.reason || 'Scoring rules are unconfigured.') + ' Event classifications remain available below.</p></div>';
    htmlList += '<div class="section"><div class="section-head"><h2>RS event classifications</h2></div>';
    htmlList += rs.events.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Event</th><th>Dates</th><th>Results</th></tr></thead><tbody>' +
      rs.events.map(function (event) {
        var result = rs.results.filter(function (row) { return row.eventId === event.id; })[0];
        return '<tr><td><b>' + esc(event.name) + '</b></td><td>' + esc(event.dates || '—') + '</td><td>' +
          (result ? '<a href="' + sh('/rallyesport/' + encodeURIComponent(result.id) + '/graph') + '">Graph → ' + esc(result.title) + ' (' + esc(result.status) + ')</a>' +
           (rallyeSportQualificationNote(result) ? '<div class="small muted">Points subject to post-event checks; clearance not verified.</div>' : '') :
            '<span class="muted">No classification published</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty"><p>No RallyeSport events or results are published for ' + YEAR + '.</p><p>RS can run independently of the NR calendar. Championship rules are intentionally not copied from NR.</p></div>';
    htmlList += '</div>';
    return { title: YEAR + ' RallyeSport tables', html: htmlList };
  }
  function viewRounds(q) {
    if (competition === 'rs') return { title: 'RS rounds', html: '<div class="page-head"><div><p class="eyebrow">' +
      YEAR + ' · RallyeSport</p><h1>RS rounds &amp; stage graphs</h1><p>Separate RS event classifications and stage axes. Missing times stay missing.</p></div></div>' + eventCards('rs') };
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' season</p><h1>Rounds &amp; stage graphs</h1><p>Choose a round for graphs, classifications and stage times.</p></div></div>';
    html += eventCards('nr');
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
      return { title: 'R' + c.n, html: '<div class="page-head"><div><p class="eyebrow">Round ' + c.n + (c.day ? ' · ' + esc(c.day) : '') + '</p><h1>' + esc(ev0.name) + '</h1>' +
        (calendarDate(c.date) ? '<div class="round-meta"><span>' + fmtDate(c.date) + '</span></div>' : '') + '</div></div>' +
        '<div class="card empty"><h2>' + calendarStatus(c.date) + '</h2><p>Results not published yet. Graphs and classifications appear when added. Scheduled dates do not confirm the rally ran or is live.</p>' +
        eventLinks(ev0, D.entryLists.filter(function (l) { return l.eventId === c.eventId; })[0]) +
        '<p><a href="' + sh('/crews') + '">Documented crews</a> · <a href="' + sh('/info') + '">Season documents</a></p></div>' };
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
    var metrics = METRICS.map(function (item) {
      if (!r.rs) return item;
      return Object.assign({}, item, { label: item.label.replace(/\bNR\b/g, 'RS'),
        help: item.help.replace(/Northern Regions crews/g, 'RS crews').replace(/\bNR\b/g, 'RS') });
    });
    var metric = metrics.filter(function (item) { return item.id === q.m; })[0] || metrics[0];
    var cars = selectedCars(r, q);
    var ents = orderedEntries(r);
    var classes = r.rs ? Array.from(new Set(r.entries.map(function (entry) { return entry.cls; }))) : CLASSES;
    var picker = '<div class="card picker" aria-label="Choose cars"><h3>Cars to plot</h3><div class="quick">' +
      '<button type="button" data-quick="top5">Top 5</button><button type="button" data-quick="all">All</button><button type="button" data-quick="none">Clear</button>' +
      classes.filter(function (c) { return r.entries.some(function (e) { return e.cls === c; }); }).map(function (c) { return '<button type="button" data-quick="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') +
      '</div><div class="car-list">' + ents.map(function (e) {
        var on = cars.indexOf(e.car) >= 0; var c = colorFor(cars, e.car) || 'var(--accent)';
        var res = e.status === 'classified' ? 'P' + e.pos : e.status;
        return '<button type="button" class="car-btn" data-car="' + esc(e.car) + '" aria-pressed="' + on + '" style="--c:' + c + '"><span class="dot"></span><span class="no">' + esc(e.car) + '</span>' +
          '<span class="nm"><b>' + esc(e.driver) + '</b><span>' + esc(e.codriver) + ' · ' + esc(e.cls) + '</span></span><span class="res">' + res + '</span></button>';
      }).join('') + '</div><p class="small muted" style="margin:10px 2px 0">Pick two cars for a head-to-head.</p></div>';
    var mbar = '<div class="metric-bar"><div class="seg" role="tablist" aria-label="Measure">' + metrics.map(function (m) {
      return '<button type="button" data-metric="' + m.id + '" class="' + (m.id === metric.id ? 'on' : '') + '" aria-pressed="' + (m.id === metric.id) + '">' + m.label + '</button>';
    }).join('') + '</div></div>';
    var labels = metric.final ? r.labels : r.stages;
    var series = cars.map(function (car) {
      var e = entryByCar(r, car); var vals = seriesValues(r, car, metric).slice(0, labels.length);
      var end = e.status !== 'classified' ? e.status : null;
      var eligibilityNote = r.rs ? ['driver', 'codriver'].map(function (role) {
        var eligibility = e[role + 'Eligibility'];
        return eligibility && eligibility.status !== 'eligible' ?
          (role === 'driver' ? 'Driver' : 'Co-driver') + ' championship scoring: RS0 · Non-Scoring*' : '';
      }).filter(Boolean).join('; ') : '';
      return { key: r.rs ? 'RS:' + r.id + ':' + car : car,
        label: '#' + car + ' ' + surname(e.driver) + (eligibilityNote ? ' · ' + eligibilityNote : ''), color: colorFor(cars, car),
        values: vals, end: end, entry: e, entryEligibility: eligibilityNote,
        timePrecision: r.rs ? r.timePrecision : undefined };
    });
    var chartHtml = series.length ? lineChart({ labels: labels, series: series, kind: metric.kind, finalCol: metric.final, title: metric.label + ' — ' + (r.rs ? r.name : roundName(r)), metric: metric }) :
      '<div class="empty">Choose one or more cars to draw the graph.</div>';
    var legend = series.length ? '<div class="legend">' + series.map(function (s) {
      var displayClass = r.rs ? s.entry.cls : s.entry['class'];
      return '<button type="button" data-hl="' + esc(s.key) + '"><i' + (s.key.indexOf('RS:') === 0 ? ' class="rs-legend"' : '') + ' style="' + (s.key.indexOf('RS:') === 0 ? 'border-top:2px dashed ' + s.color + ';background:none;height:0' : 'background:' + s.color) + '"></i>' + (s.key.indexOf('RS:') === 0 ? '<b>RS</b> ' : '#') + esc(s.entry.car || s.key) + ' ' + esc(s.entry.driver) + (displayClass ? ' · ' + esc(displayClass) : '') + (s.entryEligibility ? ' · ' + esc(s.entryEligibility) : '') + (s.end ? ' <span class="muted">(' + esc(s.end) + ')</span>' : '') + '</button>';
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
  function niceStep(span, maxTicks, precision) {
    var steps = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200];
    if (precision > 1) {
      var fractional = [];
      for (var exp = -precision; exp < 0; exp++) [1, 2, 5].forEach(function (base) {
        fractional.push(base * Math.pow(10, exp));
      });
      steps = fractional.concat(steps);
    }
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
        var timePrecision = cfg.metric && ['gap', 'cgap', 'loss'].indexOf(cfg.metric.id) >= 0 ?
          cfg.series.reduce(function (max, series) { return Math.max(max, series.timePrecision || 1); }, 1) : 1;
        var step = niceStep(mx, small ? 4 : 6, timePrecision); var top = Math.ceil(mx / step) * step;
        y = function (v) { return m.t + (v / top) * ih; };
        for (var tt = 0; tt <= top + 1e-6; tt += step) ticks.push(tt);
        fmt = function (v) { return v === 0 ? '0' : '+' + fmtShort(v, timePrecision); };
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
        var val = metric.kind === 'rank' ? 'P' + o.v : (Math.abs(o.v) < 1e-9 ? (metric.id === 'loss' ? 'fastest' : 'leader') :
          '+' + fmtGraphTime(o.v, o.se.timePrecision));
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
    var threshold = cfg.precision == null ? 0.05 : 0.5 / Math.pow(10, cfg.precision);
    var diffText = cfg.precision == null ? fmtDiff : function (value) { return fmtGraphTime(Math.abs(value), cfg.precision); };
    var small = W < 620;
    var H = small ? 240 : 280, m = { l: small ? 44 : 58, r: 14, t: 26, b: 40 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, n = cfg.labels.length;
    var vals = cfg.values.filter(function (v) { return v != null; });
    if (!vals.length) return { svg: '<div class="empty">No common stage times.</div>', note: '' };
    var abs = vals.map(Math.abs).filter(function (v) { return v > threshold; }).sort(function (a, b) { return a - b; });
    var mx = Math.max(1, abs.length ? abs[abs.length - 1] : 1);
    var med = abs.length ? abs[Math.floor(abs.length / 2)] : 1;
    var cap = Math.max(10, med * 4);
    var capped = mx > cap * 1.5;
    var lim = capped ? cap : mx;
    var step = niceStep(lim, 3, cfg.precision); var top = Math.ceil(lim / step) * step;
    var y = function (v) { var c = Math.max(-top, Math.min(top, v)); return m.t + ih / 2 - (c / top) * (ih / 2); };
    var bw = Math.min(46, iw / n * 0.6);
    var x = function (i) { return m.l + (i + 0.5) * (iw / n); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(cfg.title) + '" style="--c1:' + cfg.c1 + ';--c2:' + cfg.c2 + '">';
    var ticks = []; for (var t = -top; t <= top + 1e-6; t += step) ticks.push(t);
    s += '<g class="grid">' + ticks.map(function (t) { return '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"' + (t === 0 ? ' class="zero"' : '') + '/>'; }).join('') + '</g>';
    s += '<g class="axis">' + ticks.map(function (t) { return '<text x="' + (m.l - 10) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + (t === 0 ? '0' : fmtShort(Math.abs(t))) + '</text>'; }).join('') +
      cfg.labels.map(function (l, i) { return '<text class="lbl" x="' + x(i) + '" y="' + (H - m.b + 22) + '" text-anchor="middle">' + esc(l) + '</text>'; }).join('') + '</g>';
    cfg.values.forEach(function (v, i) {
      if (v == null || Math.abs(v) < threshold) return;
      var y0 = y(0), y1 = y(v), over = Math.abs(v) > top;
      var top_ = Math.min(y0, y1), h = Math.abs(y1 - y0);
      s += '<rect class="' + (v > 0 ? 'bar-pos' : 'bar-neg') + '" x="' + (x(i) - bw / 2) + '" y="' + top_ + '" width="' + bw + '" height="' + h + '" rx="4"><title>' + esc(cfg.labels[i] + ': ' + (v > 0 ? cfg.aName : cfg.bName) + ' quicker by ' + diffText(v)) + '</title></rect>';
      if (over) { var zy = v > 0 ? top_ + 10 : top_ + h - 10; s += '<path d="M' + (x(i) - bw / 2) + ' ' + zy + 'l' + bw / 4 + ' -5l' + bw / 4 + ' 10l' + bw / 4 + ' -10l' + bw / 4 + ' 5" stroke="var(--surface)" stroke-width="3" fill="none"/>'; }
      var ly = v > 0 ? top_ - 6 : top_ + h + 14;
      s += '<text x="' + x(i) + '" y="' + ly + '" text-anchor="middle" style="font-size:' + (small ? 10 : 11.5) + 'px;font-weight:800;fill:' + (v > 0 ? cfg.c1 : cfg.c2) + '">' + diffText(v) + '</text>';
    });
    s += '</svg>';
    return { svg: s, note: capped ? '<p class="small muted" style="margin:2px 6px 0">Bars over ' + fmtShort(top) + ' are cut short (zig-zag); the label shows the full difference.</p>' : '' };
  }

  function headToHead(r, a, b) {
    var A = entryByCar(r, a), B = entryByCar(r, b);
    var round = r.rs ? function (value) { return Number(value.toFixed(r.timePrecision)); } : r1;
    var threshold = r.rs ? 0.5 / Math.pow(10, r.timePrecision) : 0.05;
    var diffText = r.rs ? function (value) { return fmtGraphTime(Math.abs(value), r.timePrecision); } : fmtDiff;
    var timeText = r.rs ? function (value) { return value == null ? '—' : fmtGraphTime(value, r.timePrecision); } : fmtTime;
    var stageDiff = r.stages.map(function (s, k) { var ta = A.times[k], tb = B.times[k]; return ta == null || tb == null ? null : round(tb - ta); });
    var pa = r.progression[a], pb = r.progression[b];
    var cum = r.labels.map(function (l, k) { var x = pa.cum[k], z = pb.cum[k]; return x == null || z == null ? null : round(z - x); });
    var aWins = 0, bWins = 0; stageDiff.forEach(function (d) { if (d == null) return; if (d > threshold) aWins++; else if (d < -threshold) bWins++; });
    var finalTxt;
    if (r.rs) {
      finalTxt = 'Official RS classification — ' + esc(surname(A.driver)) + ': ' + (A.status === 'classified' && A.pos != null ? 'P' + A.pos : esc(A.status)) +
        ', ' + esc(surname(B.driver)) + ': ' + (B.status === 'classified' && B.pos != null ? 'P' + B.pos : esc(B.status)) + '. ' +
        (A.status === 'classified' && B.status === 'classified' && A.total != null && B.total != null ?
          'Official total difference: <b>' + diffText(round(B.total - A.total)) + '</b> (including penalties).' : 'Official total gap unavailable.');
    } else if (A.status === 'classified' && B.status === 'classified') {
      var diff = r1(B.total - A.total);
      finalTxt = (diff > 0 ? esc(surname(A.driver)) : esc(surname(B.driver))) + ' finished ahead by <b>' + fmtDiff(diff) + '</b> (official totals, incl. penalties).';
    } else finalTxt = 'Not both classified — ' + esc(surname(A.driver)) + ': ' + (A.status === 'classified' ? 'P' + A.pos : A.status) + ', ' + esc(surname(B.driver)) + ': ' + (B.status === 'classified' ? 'P' + B.pos : B.status) + '.';
    var cA = PALETTE[0], cB = PALETTE[1];
    return '<div class="card h2h"><div class="chart-title"><h3>Head-to-head</h3><p>Bars show who was quicker on each stage.</p></div>' +
      '<div class="h2h-head"><div class="h2h-side"><b style="color:' + cA + '">#' + esc(A.car) + ' ' + esc(A.driver) + '</b><span>' + esc(A.codriver) + ' · ' + esc(A.vehicle) + '</span></div><div class="h2h-vs">VS</div>' +
      '<div class="h2h-side b"><b style="color:' + cB + '">#' + esc(B.car) + ' ' + esc(B.driver) + '</b><span>' + esc(B.codriver) + ' · ' + esc(B.vehicle) + '</span></div></div>' +
      '<div class="h2h-sum"><b style="color:' + cA + '">' + esc(surname(A.driver)) + '</b> was quicker on ' + aWins + ' stage' + (aWins === 1 ? '' : 's') + ', <b style="color:' + cB + '">' + esc(surname(B.driver)) + '</b> on ' + bWins + '.<br>' + finalTxt + '</div>' +
      barChart({ labels: r.stages, values: stageDiff, c1: cA, c2: cB, aName: surname(A.driver), bName: surname(B.driver), title: 'Stage-by-stage difference', precision: r.rs ? r.timePrecision : undefined }) +
      '<div class="table-wrap" style="margin-top:10px;box-shadow:none"><table class="data"><thead><tr><th>Stage</th><th class="num">#' + esc(A.car) + '</th><th class="num">#' + esc(B.car) + '</th><th class="num">Quicker on stage</th><th class="num">Running gap</th></tr></thead><tbody>' +
      r.labels.map(function (l, k) {
        var isFinal = l === 'Final';
        var ta = isFinal ? A.total : A.times[k], tb = isFinal ? B.total : B.times[k];
        var d = isFinal ? null : stageDiff[k], c = cum[k];
        function who(v, lead) { if (v == null) return '—'; if (Math.abs(v) < threshold) return 'level'; var nm = v > 0 ? surname(A.driver) : surname(B.driver); return '<span style="color:' + (v > 0 ? cA : cB) + ';font-weight:700">' + esc(nm) + '</span> ' + (lead ? 'ahead by ' : 'by ') + diffText(v); }
        return '<tr><td><b>' + esc(isFinal ? 'Final (incl. pen.)' : l) + '</b></td><td class="num mono">' + timeText(ta, isFinal) + '</td><td class="num mono">' + timeText(tb, isFinal) + '</td><td class="num">' + (isFinal ? '' : who(d, false)) + '</td><td class="num">' + who(c, true) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function selectedStageTable(r, cars) {
    var timeText = r.rs ? function (value) { return value == null ? '—' : fmtGraphTime(value, r.timePrecision); } : fmtTime;
    var head = '<tr><th class="sticky">Car</th>' + r.labels.map(function (l) { return '<th class="num">' + esc(l) + '</th>'; }).join('') + '</tr>';
    var body = cars.map(function (car) {
      var e = entryByCar(r, car), p = r.progression[car], c = colorFor(cars, car);
      return '<tr><td class="sticky nowrap"><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + c + ';margin-inline-end:6px"></span><b>#' + esc(car) + '</b> ' + esc(surname(e.driver)) + '</td>' +
        r.labels.map(function (l, k) {
          if (l === 'Final') return '<td class="num">' + (e.status === 'classified' ? '<span class="stime"><b class="mono">' + timeText(e.total, true) + '</b><small class="nowrap"><b>' + (r.rs && e.pos == null ? '—' : 'P' + e.pos) + '</b>' + (e.pen ? ' · pen ' + (r.rs ? timeText(e.pen) : fmtDiff(e.pen)) : '') + '</small></span>' : '<span class="muted">' + esc(e.status) + '</span>') + '</td>';
          var t = e.times[k]; if (t == null && !r.rs) return '<td class="num muted">—</td>';
          return '<td class="num"><span class="stime' + (e.stagePos[k] === 1 ? ' fast' : '') + '"><b class="mono">' + timeText(t) + '</b><small class="nowrap">' + (e.stagePos[k] != null ? ord(e.stagePos[k]) : '—') + (p.pos[k] != null ? ' · <b>P' + p.pos[k] + '</b>' : '') + '</small></span></td>';
        }).join('') + '</tr>';
    }).join('');
    return '<div class="section"><div class="section-head"><h2>Stage by stage</h2></div><div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="small muted">Each cell: stage time, then the official stage result (e.g. 4th) and the ' + (r.rs ? 'RS' : 'NR') + ' position after that stage (e.g. <b>P2</b>, from stage times). Final: official total and position, including penalties.</p></div>';
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
    var timeText = r.rs ? function (value) { return value == null ? '—' : fmtGraphTime(value, r.timePrecision); } : fmtTime;
    var ents = orderedEntries(r).filter(function (e) { return e.times.some(function (t) { return t != null; }); });
    var best = r.stages.map(function (s, k) { var ts = ents.map(function (e) { return e.times[k]; }).filter(function (t) { return t != null; }); return ts.length ? Math.min.apply(null, ts) : null; });
    var head = '<tr><th class="sticky">Car / crew</th>' + r.stages.map(function (s) { return '<th class="num">' + esc(s) + '</th>'; }).join('') + '<th class="num">Penalty</th><th class="num">Total</th></tr>';
    var body = ents.map(function (e) {
      return '<tr><td class="sticky nowrap"><span class="carno-lg">' + esc(e.car) + '</span> <b>' + esc(surname(e.driver)) + '</b> <span class="small muted">' + esc(e.cls) + '</span></td>' +
        e.times.map(function (t, k) {
          if (t == null) return '<td class="num muted">—</td>';
          var fast = best[k] != null && Math.abs(t - best[k]) < (r.rs ? 0.5 / Math.pow(10, r.timePrecision) : 0.05);
          return '<td class="num' + (fast ? ' fastest' : '') + '"><span class="stime"><b class="mono">' + timeText(t) + '</b><small>' + (e.stagePos[k] != null ? 'P' + e.stagePos[k] : '') + '</small></span></td>';
        }).join('') + '<td class="num mono">' + (e.pen ? timeText(e.pen) : '') + '</td><td class="num mono"><b>' + (e.status === 'classified' ? timeText(e.total, true) : esc(e.status)) + '</b></td></tr>';
    }).join('');
    return (r.rs && !ents.length ? '<div class="card empty">No RS stage times are available.</div>' : '<div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>') +
      '<p class="small muted">Highlighted: fastest ' + (r.rs ? 'RS' : 'NR') + ' time on the stage. Small figures are the official stage positions printed on the sheet.</p>';
  }

  function roundNotes(r) {
    var ev = eventOf(r), src = r.source || {};
    var items = (r.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; });
    var per = []; r.entries.forEach(function (e) { (e.notes || []).forEach(function (n) { per.push('<li><b>Car ' + esc(e.car) + ':</b> ' + esc(n) + '</li>'); }); });
    var page = src.url || (ev.links && ev.links.results);
    var pdf = src.pdf ? ext(src.pdf, 'the official PDF') : '';
    return '<details class="notes"><summary>Source &amp; notes</summary><div><b>Source:</b> ' + esc(r.title) + (r.status ? ' — <i>' + esc(r.status) + '</i>' : '') + '. ' +
      (page ? 'From the event\'s results page (' + ext(page, esc(page.replace(/^https?:\/\//, ''))) + ')' : 'From the official classification') + (src.file ? ', file ' + esc(src.file) : '') + (pdf ? '; ' + pdf + ' is kept with this site' : '') + '. Live timing is not used.' +
      ((items.length || per.length) ? '<ul>' + items.join('') + per.join('') + '</ul>' : '') + '</div></details>';
  }

  /* ---------- crews */
  function viewCrews() {
    var html = '<div class="page-head"><div><p class="eyebrow">' + D.people.length + ' competitors in ' + YEAR + '</p><h1>Crews</h1><p>Drivers and co-drivers in ' + YEAR + ' Northern Regions classifications and entry lists.</p></div></div>';
    if (!D.people.length) return { title: 'Crews', html: html + '<div class="card empty">No crews are documented in ' + YEAR + ' entry lists or classifications yet. Earlier participation is not a new-season entry; historical profiles remain available from archived seasons.</div>' };
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
    mounts.push(mountCrewSearch);
    return { title: 'Crews', html: html };
  }

  /* ---------- person (all seasons) */
  function rsAppearances(model, id, includeUnresolved) {
    var all = [];
    model.rallyesport.results.forEach(function (result) {
      var scoring = model.rallyesport.scoring || {};
      var score = (scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0];
      result.entries.forEach(function (entry) {
        ['driver', 'codriver'].forEach(function (role) {
          if (entry[role] && (entry[role + 'Known'] || includeUnresolved) && (!id || entry[role + 'Id'] === id)) {
            var scoreEntry = score && (score.entries || []).filter(function (row) { return row.car === String(entry.car); })[0];
            all.push({
              id: entry[role + 'Known'] ? entry[role + 'Id'] : '',
              key: entry[role + 'Known'] ? entry[role + 'Id'] : result.id + ':' + entry.car + ':' + role,
              name: entry[role], role: role, entry: entry, result: result,
              eligibility: scoreEntry && scoreEntry[role + 'Eligibility'] || null,
              points: scoreEntry && scoreEntry[role + 'Points']
            });
          }
        });
      });
    });
    return all;
  }
  function mountCrewSearch() {
    var inp = document.getElementById('crewSearch');
    inp.addEventListener('input', function () {
      var value = inp.value.trim().toLowerCase();
      Array.prototype.forEach.call(document.querySelectorAll('#crewTable tbody tr'), function (row) {
        row.hidden = !!value && row.getAttribute('data-s').indexOf(value) < 0;
      });
    });
  }
  function viewRsCrews() {
    var people = {};
    rsAppearances(D, null, true).forEach(function (appearance) {
      if (!people[appearance.key]) people[appearance.key] = {
        id: appearance.id, name: (ST.profiles[appearance.id] || {}).name || appearance.name, roles: {}, cars: {}, classes: {}, scoringClasses: {}, appearances: 0,
        eligibility: appearance.eligibility
      };
      if (appearance.eligibility && appearance.eligibility.status === 'eligible') people[appearance.key].eligibility = appearance.eligibility;
      else if (!people[appearance.key].eligibility && appearance.eligibility) people[appearance.key].eligibility = appearance.eligibility;
      people[appearance.key].roles[appearance.role] = true;
      people[appearance.key].cars[appearance.entry.car] = true;
      people[appearance.key].classes[rsDisplayClass(appearance.result, appearance.entry)] = true;
      people[appearance.key].appearances++;
      if (appearance.eligibility && appearance.eligibility.status === 'eligible') people[appearance.key].scoringClasses[appearance.eligibility.scoringClass] = true;
    });
    var rows = Object.keys(people).map(function (id) { return people[id]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>RS crews</h1></div></div>';
    if (!rows.length) return { title: 'RS crews', html: html + '<div class="card empty">No RS crews are documented for ' + YEAR + '. Published source rows remain available in <a href="' + sh('/rounds') + '">RS results</a>.</div>' };
    html += '<div class="filters"><label class="sr-only" for="crewSearch">Search RS crews</label><input id="crewSearch" class="search" type="search" placeholder="Search by name or car number…"></div>' +
      '<div class="table-wrap"><table class="data" id="crewTable"><thead><tr><th>Name</th><th>RS role</th><th>RS class</th><th>Driver standings</th><th>Co-driver standings</th><th>Appearances</th><th>Car(s)</th><th>Championship status</th></tr></thead><tbody>' +
      rows.map(function (row) {
        var cars = Object.keys(row.cars).join(', ');
        var scoring = D.rallyesport.scoring, tables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
        function standing(role) {
          var person = tables && tables[role].filter(function (person) { return person.id === row.id; })[0];
          return person ? (person.rank == null ? '—' : 'P' + person.rank) + ' · ' + person.points : '—';
        }
        return '<tr data-s="' + esc((row.name + ' ' + cars).toLowerCase()) + '"><td>' + rsProfileLink(row.id, row.name) +
          (row.id ? '' : '<br><span class="small muted">Source name; profile unresolved</span>') + '</td><td>' +
          (row.roles.driver && row.roles.codriver ? 'Driver &amp; co-driver' : row.roles.driver ? 'Driver' : 'Co-driver') + '</td><td>' +
          Object.keys(row.classes).map(clsTag).join(' ') + '</td><td>' + standing('overallDrivers') + '</td><td>' + standing('overallCodrivers') +
          '</td><td class="num">' + row.appearances + '</td><td>' + esc(cars) +
          '</td><td>' + (Object.keys(row.scoringClasses).length ? esc(Object.keys(row.scoringClasses).sort().join(' + ')) : rsChampionshipStatus(row.eligibility)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (rows.some(function (row) { return row.eligibility && row.eligibility.status !== 'eligible'; })) html += rsEligibilityNote();
    mounts.push(mountCrewSearch);
    return { title: 'RS crews', html: html };
  }
  function viewRsPerson(id) {
    var prof = ST.profiles[id], seasons = seasonList().map(function (year) {
      var model = ST.models[year];
      return { year: year, model: model, apps: model ? rsAppearances(model, id) : [] };
    }).filter(function (season) { return season.apps.length; });
    if (!prof && !seasons.length) return notFound();
    var name = prof ? prof.name : seasons[0].apps[0].name, all = [];
    seasons.forEach(function (season) { all = all.concat(season.apps); });
    var finishes = all.filter(function (appearance) { return appearance.entry.status === 'classified'; });
    var positions = finishes.map(function (appearance) { return appearance.entry.pos; }).filter(function (pos) { return pos != null; });
    var best = positions.length ? Math.min.apply(null, positions) : null;
    var roles = {};
    all.forEach(function (appearance) { roles[appearance.role] = true; });
    var role = roles.driver && roles.codriver ? 'Driver & co-driver' : roles.driver ? 'Driver' : roles.codriver ? 'Co-driver' : 'Competitor';
    var html = profileHeader(prof, name, role, seasons.map(function (season) { return season.year; }));
    if (!all.length) return { title: name + ' — RS', html: html + '<div class="card empty">No published RS history for this competitor.</div>' };
    var hasStagePositions = all.some(function (appearance) {
      return (appearance.entry.stagePos || []).some(function (position) { return position != null; });
    });
    var stageWins = all.reduce(function (sum, appearance) {
      return sum + (appearance.entry.stagePos || []).filter(function (position) { return position === 1; }).length;
    }, 0);
    html += '<div class="kpis">' + kpi(all.length, 'Appearances') + kpi(finishes.length, 'Finishes') +
      kpi(best == null ? '—' : ord(best), 'Best official result') +
      kpi(positions.length === finishes.length ? positions.filter(function (pos) { return pos === 1; }).length : '—', 'Event wins') +
      kpi(positions.length === finishes.length ? positions.filter(function (pos) { return pos <= 3; }).length : '—', 'Podiums') +
      kpi(hasStagePositions ? stageWins : '—', 'Recorded stage wins') + '</div>';
    seasons.forEach(function (season) {
      var scoring = season.model.rallyesport.scoring;
      var tables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
      html += '<div class="section season-block"><div class="section-head"><h2>' + season.year + ' season</h2>' +
        '<a class="go" href="#/' + season.year + '/standings?competition=rs">' + season.year + ' standings →</a></div>';
      ['driver', 'codriver'].forEach(function (role) {
        var apps = season.apps.filter(function (appearance) { return appearance.role === role; });
        if (!apps.length) return;
        var standing = tables && (role === 'driver' ? tables.overallDrivers : tables.overallCodrivers).filter(function (row) { return row.id === id; })[0];
        html += '<div class="round-meta"><span>' + (role === 'driver' ? 'Driver' : 'Co-driver') + ' standings: <b>' +
          (standing ? standing.rank == null ? 'Non-Scoring' : 'P' + standing.rank : 'Unavailable') + '</b>' +
          (standing ? ' · ' + standing.points + ' pts' : '') + (tables && scoring.status !== 'ready' ? ' · provisional' : '') + '</span></div>';
        html += '<div class="card chart-card rs-profile-points"><h3>' + (role === 'driver' ? 'Driver' : 'Co-driver') + ' points by round</h3>' +
          rsPointsBars(season.model, id, role) + '</div>';
      });
      html += '<div class="table-wrap" style="margin-top:14px"><table class="data"><thead><tr>' +
        '<th>RS event</th><th>No.</th><th>Role</th><th>With</th><th>Vehicle</th><th>RS class</th><th>Championship scoring</th><th>Official position / finish</th><th>RS event points</th><th>Graph</th></tr></thead><tbody>' +
        season.apps.slice().sort(function (a, b) {
          var events = season.model.rallyesport.events;
          return events.findIndex(function (event) { return event.id === a.result.eventId; }) -
            events.findIndex(function (event) { return event.id === b.result.eventId; });
        }).map(function (appearance) {
          var entry = appearance.entry, result = appearance.result, partner = appearance.role === 'driver' ? 'codriver' : 'driver';
          var event = season.model.rallyesport.events.filter(function (row) { return row.id === result.eventId; })[0];
          var score = (scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0];
          var info = appearance.eligibility;
          var value = appearance.points;
          var href = '#/' + season.year + '/rallyesport/' + encodeURIComponent(result.id);
          return '<tr><td><a href="' + competitionHref(href, 'rs') + '">' + esc(event ? event.name : result.eventId) + '</a></td><td><span class="carno-lg">' + esc(entry.car) + '</span></td><td>' +
            (appearance.role === 'driver' ? 'Driver' : 'Co-driver') + '</td><td>' + rsEntryLink(entry, partner) + '</td><td>' + esc(entry.vehicle || 'Not recorded') + '</td><td>' + clsTag(rsDisplayClass(result, entry)) +
            '</td><td>' + rsChampionshipStatus(info) + '</td><td>' +
            esc(entry.pos == null ? '—' : entry.pos) + ' · ' + esc(entry.status) + '</td><td>' +
            (value == null ? '<span class="muted" title="' + esc(score && score.reason || 'No published RS event points') + '">Unavailable</span>' : value) +
            '</td><td><a href="' + competitionHref(href + '/graph?cars=' + encodeURIComponent(entry.car), 'rs') + '">Graph →</a></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    });
    if (all.some(function (appearance) {
        return appearance.eligibility && appearance.eligibility.status !== 'eligible';
    })) html += rsEligibilityNote();
    return { title: name + ' — RS', html: html };
  }
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
    var html = profileHeader(prof, name, roleTxt, seasons.map(function (s) { return s.year; }));
    html += '<div class="kpis">' + kpi(credited.length, 'Starts') + kpi(finishes.length, 'Finishes') + kpi(best ? ord(best) : '—', 'Best result') + kpi(wins, 'Round wins') + kpi(podiums, 'Podiums') + kpi(stageWins, 'Stage wins') + '</div>';
    seasons.forEach(function (s) {
      var save = D; useSeason(s.model);
      var sd = standingIdx.driver[id], sc = standingIdx.codriver[id];
      var cls = (sd || sc || {}).cls || (s.person.apps[0] && s.person.apps[0].cls);
      html += '<div class="section season-block"><div class="section-head"><h2>' + s.year + ' season</h2><a class="go" href="' + sh('/standings' + (sd ? '' : '/codrivers')) + '">' + s.year + ' standings →</a></div>' +
        '<div class="round-meta" style="margin-bottom:12px">' + clsTag(cls) + (sd ? '<span>Driver standings: <b>P' + sd.rank + '</b> · ' + sd.total + ' pts' + (sd.eligible ? '' : ' <span class="muted">(fewer than ' + D.minStarts + ' starts)</span>') + '</span>' : '') + (sc ? '<span>Co-driver standings: <b>P' + sc.rank + '</b> · ' + sc.total + ' pts' + (sc.eligible ? '' : ' <span class="muted">(fewer than ' + D.minStarts + ' starts)</span>') + '</span>' : '') + '</div>';
      if (s.person.entries.length) html += '<details class="small muted"><summary>' +
        new Set(s.person.entries.map(function (e) { return e.eventId; })).size +
        ' events entered</summary><p>' + s.person.entries.map(function (e) {
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
      html += apps.length ? '<div class="table-wrap" style="margin-top:14px"><table class="data"><thead><tr><th>Round</th><th>Event</th><th class="num">Car</th><th>Role</th><th>With</th><th>Car</th><th class="num">Result</th><th class="num">Class</th><th class="num">Points</th><th></th></tr></thead><tbody>' +
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
        }).join('') + '</tbody></table></div></div>' : '<p class="small muted">No classification appearances recorded for this season. Entries are not confirmed starts.</p></div>';
      useSeason(save);
    });
    if (!seasons.length) html += '<div class="card empty">No official results recorded yet.</div>';
    return { title: name, html: html };
  }
  function profileHeader(prof, name, roleTxt, years) {
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
    return '<div class="profile-head">' + photo + '<div><p class="eyebrow">' + roleTxt + (years.length ? ' · ' + years.join(', ') : '') + '</p><h1>' + esc(name) + '</h1>' +
      (prof && prof.bio ? '<p class="bio">' + esc(prof.bio) + '</p>' : '') + (links ? '<div class="chip-links">' + links + '</div>' : '') + '</div></div>';
  }
  function kpi(v, l) { return '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function rsPersonRoundPoints(model, id, role, cls) {
    var points = Object.create(null);
    rsAppearances(model, id).filter(function (appearance) {
      return appearance.role === role && (!cls || appearance.eligibility && appearance.eligibility.scoringClass === cls);
    }).forEach(function (appearance) {
      if (typeof appearance.points !== 'number') return;
      var key = appearance.result.id, value = points[key];
      var scoringClass = !appearance.eligibility ? 'Class unavailable' :
        appearance.eligibility.status === 'eligible' ? appearance.eligibility.scoringClass || 'Class unavailable' : 'RS0';
      var classes = value ? value.classes : Object.create(null);
      if (scoringClass) classes[scoringClass] = (classes[scoringClass] || 0) + appearance.points;
      points[key] = { pts: (value ? value.pts : 0) + appearance.points,
        o: 0, c: (value ? value.pts : 0) + appearance.points, status: appearance.entry.status, classes: classes };
    });
    return points;
  }
  function rsPointsBars(model, id, role) {
    var rounds = model.rallyesport.events.map(function (event) {
      var result = model.rallyesport.results.filter(function (row) { return row.eventId === event.id; })[0];
      return result ? { id: result.id, eventId: event.id, n: event.roundNumber == null ? '?' : event.roundNumber } : null;
    }).filter(Boolean);
    var row = { rounds: rsPersonRoundPoints(model, id, role) };
    var chart = { rounds: rounds, events: model.rallyesport.events };
    return responsive(function (width) { return pointsSvg(chart, row, width, true); }) +
      '<div class="legend-row"><span>Championship points · – unavailable / no scored result</span></div>';
  }
  function pointsBars(row) {
    var model = D;
    return responsive(function (W) { return pointsSvg(model, row, W); }) + '<div class="legend-row"><span><i style="display:inline-block;width:12px;height:12px;background:var(--ink-2);border-radius:3px;vertical-align:-2px"></i> overall points</span><span><i style="display:inline-block;width:12px;height:12px;background:var(--accent);border-radius:3px;vertical-align:-2px"></i> class points</span></div>';
  }
  function pointsSvg(model, row, W, rs) {
    var rounds = model.rounds, evs = {}; model.events.forEach(function (e) { evs[e.id] = e; });
    var H = 240, m = { l: 36, r: 10, t: 18, b: 42 }, iw = W - m.l - m.r, ih = H - m.t - m.b, n = Math.max(1, rounds.length);
    var top = rs ? Math.max(20, Math.ceil(Math.max.apply(null, [0].concat(Object.keys(row.rounds).map(function (id) {
      return row.rounds[id].pts;
    }))) / 10) * 10) :
      Math.max(10, Math.ceil(((model.pointsScale.overall[0] || 0) + (model.pointsScale.cls[0] || 0)) / 10) * 10);
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
      if (!rs) s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yo + '" width="' + bw + '" height="' + (y0 - yo) + '" rx="3" fill="var(--ink-2)"><title>Overall: ' + v.o + '</title></rect>';
      s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yt + '" width="' + bw + '" height="' + (yo - yt) + '" rx="3" fill="var(--accent)"><title>' +
        (rs ? 'Championship: ' : 'Class: ') + v.c + '</title></rect>';
      s += '<text x="' + x(i) + '" y="' + (yt - 6) + '" text-anchor="middle" style="font-size:13px;font-weight:800;fill:var(--ink)">' + v.pts + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- about the data (per season) */
  function viewRsSources() {
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>RS sources &amp; data notes</h1>' +
      '<p>Official RS classifications take precedence. Graphs compare RS stage times; they do not determine final classifications or championship eligibility.</p></div></div>' + rsScoringNotice();
    if (!D.rallyesport.results.length) html += '<div class="card empty">No RS classifications are published for ' + YEAR + '.</div>';
    D.rallyesport.results.forEach(function (result) {
      html += '<section class="section card"><h2><a href="' + sh('/rallyesport/' + encodeURIComponent(result.id)) + '">' +
        esc(result.title || result.id) + '</a></h2><p>' + esc(result.status) + '</p><p>' +
        (result.source && safeUrl(result.source.url) ? ext(result.source.url, 'Official RS source') :
          esc(result.source && (result.source.file || result.source.description) || 'Source reference unavailable')) + '</p>' +
        (result.notes || []).map(function (note) { return '<p>' + esc(note) + '</p>'; }).join('') + '</section>';
    });
    return { title: 'RS sources', html: html };
  }
  function viewAbout() {
    if (!D.rounds.length) {
      var empty = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' sources</p><h1>Sources &amp; data notes</h1><p>No classifications have been published here for ' + YEAR + '. No standings, points comparisons or stage graphs are available yet. Live timing is never used.</p></div></div>' +
        '<div class="card"><h2>Calendar &amp; regulations</h2><p><a href="' + sh('/info') + '">Open ' + YEAR + ' documents and official event links</a> · <a href="' + sh('/rounds') + '">Calendar</a>. Only supplied details are listed; dates do not establish an actual start.</p></div>';
      if (D.entryLists.length) empty += '<div class="card"><h2>Entry evidence</h2><p>Entries are separate from starts, results and points. Missing coverage is not zero participation.</p><ul>' + D.entryLists.map(function (l) {
        return '<li>' + esc((eventsById[l.eventId] || {}).name || l.eventId) + ': ' + ext(l.source.url, 'Official entry source') +
          (l.complete ? ' (complete list)' : ' (partial coverage)') + '</li>';
      }).join('') + '</ul><a href="' + sh('/crews') + '">Documented crews</a></div>';
      if (D.notes.length) empty += '<div class="prose"><h2>Season notes</h2><ul>' + D.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
      return { title: 'Sources & data notes', html: empty };
    }
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
    var html = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' information</p><h1>About the championship</h1>' + (info.intro ? '<p>' + esc(info.intro) + '</p>' : '') + '</div></div>';
    html += '<p class="guide-entry">New to Northern Regions? <a href="#/getting-started">Start with the spectator, crew and season guide</a>.</p>';
    html += '<p class="guide-entry">RallyeSport has independent event results and standings: <a href="' + sh('/rallyesport') + '">view the ' + YEAR + ' RallyeSport tables</a>. RallyeSport data does not contribute to Northern Regions results or statistics.</p>';
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
      return '<a class="card doc" href="' + esc(safeUrl(d.url)) + '" target="_blank" rel="noopener"><span class="doc-kind">' + esc(d.kind || 'Document') + '</span><span class="doc-main"><b>' + esc(d.title) + '</b><span>' + (d.date ? 'Dated ' + fmtDocumentDate(d.date) : '') + (d.note ? (d.date ? ' · ' : '') + esc(d.note) : '') + '</span></span><span class="go">Open ↗</span></a>';
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
      html += '<div class="section"><div class="section-head"><h2>Shared useful links</h2></div><div class="doc-list">' + info.documents.map(function (d) {
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
  render();
  loadSiteAndPeople().then(function (res) {
    ST.site = res[0]; ST.people = res[1];
    ST.peopleIndex = E.peopleIndex(ST.people);
    ((ST.people && ST.people.people) || []).forEach(function (p) { ST.profiles[p.id] = p; });
    render();
  }).catch(showLoadError);
})();
