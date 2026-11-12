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
  function calendarStatus(iso) {
    if (!calendarDate(iso)) return 'Date to be confirmed';
    // South African calendar days are UTC+02:00, independent of the visitor's timezone.
    var today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return iso < today ? 'Awaiting results' : iso === today ? 'Scheduled today' : 'Upcoming';
  }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:|mailto:)/i.test(u) || /^[\w./-]+$/.test(u) ? u : ''; }
  function ext(u, text, cls) { u = safeUrl(u); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>' : ''; }
  function rallyeSportStarterMinimumNote(scoring, year) {
    return window.NRPublicModel.rsStarterMinimumNote(scoring || {}, year);
  }
  var PALETTE = ['#ff5a1f', '#3e7ff0', '#2f9e66', '#e5484d', '#a855f7', '#e39b12', '#06b6d4', '#ec4899', '#84cc16', '#8b5e3c', '#64748b', '#14b8a6', '#c2410c', '#1d4ed8', '#15803d', '#be123c', '#7e22ce', '#a16207', '#0e7490', '#9d174d'];

  /* ------------------------------------------------------------------ data loading (the database only) */
  var FB = window.NR_FIREBASE || {};
  var DBURL = FB.projectId ? 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FB.projectId) + '/databases/(default)/documents' : '';
  var ST = { site: null, people: null, profiles: {}, models: {}, displayMetadata: {}, pending: {}, photos: {}, error: null };
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
      var rules = b.season.rallyesport && b.season.rallyesport.ruleset;
      ST.displayMetadata[year] = { ruleset: rules ? { title: rules.title, sourceUrl: rules.sourceUrl,
        issueDate: rules.issueDate, version: rules.version } : null };
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
    window.NRDisplay.welcome(sh('/info'), true);
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
    var NAV = [['', 'Home', sh('')], ['standings', 'Standings', sh('/standings')], ['rounds', 'Rounds & graphs', sh('/rounds')], ['crews', 'Crews', sh('/crews')], ['getting-started', 'Getting started', sh('/getting-started')], ['info', 'Info', sh('/info')]];
    var links = NAV.map(function (n) {
      var on = n[0] === active || (n[0] === 'rounds' && active === 'round') || (n[0] === 'crews' && active === 'person') || (n[0] === 'info' && active === 'about');
      return '<a href="' + n[2] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
    var years = seasonList();
    var sel = years.length > 1 ? '<label class="season-sel"><span class="sr-only">Season</span><select id="seasonSel">' + years.map(function (y) {
      return '<option value="' + y + '"' + (y === YEAR ? ' selected' : '') + '>' + y + ' season</option>';
    }).join('') + '</select></label>' : YEAR ? '<span class="season-pill" title="Season">' + esc(YEAR) + '</span>' : '';
    return '<header class="site-header public-header"><div class="checker" aria-hidden="true"></div><div class="header-inner">' +
      '<a class="brand" href="#/" aria-label="' + esc(S.siteName) + ' home">' + logoImg() +
      '<span class="brand-text"><strong>' + esc(S.siteName) + '</strong><span>' + (guide ? 'Getting started' : esc(YEAR) + (competition === 'rs' ? ' RallyeSport' : ' Championship')) + '</span></span></a>' +
      '<button class="nav-toggle" id="navigationToggle" type="button" aria-label="Main menu" aria-controls="publicNav" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path class="nav-bars" d="M4 6h16M4 12h16M4 18h16"/>' +
      '<path class="nav-cross" d="m6 6 12 12M6 18 18 6"/></svg><span>MENU</span></button>' +
      '<nav class="nav public-nav" id="publicNav" aria-label="Main">' + links + '</nav>' + sel +
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
  var mounts = [], navigationFocusPending = false, navigationLastFocus = null;
  function setNavigation(open, restoreFocus) {
    var button = document.getElementById('navigationToggle'), nav = document.getElementById('publicNav');
    if (!button || !nav) return;
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (restoreFocus) button.focus({ preventScroll: true });
  }
  function mountNavigation() {
    var button = document.getElementById('navigationToggle'), nav = document.getElementById('publicNav');
    button.addEventListener('click', function () { setNavigation(button.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link || button.getAttribute('aria-expanded') !== 'true') return;
      navigationFocusPending = link.getAttribute('href') !== location.hash;
      setNavigation(false, true);
    });
  }
  function render() {
    window.NRDisplay.closeWelcome();
    var h = parseHash(); var parts = h.parts;
    rememberCompetition(routeCompetition(h));
    var canonical = competitionHref(location.hash || '#/', competition);
    if (canonical !== location.hash) history.replaceState(null, '', canonical);
    var page = parts[0] || '';
    if (page === 'getting-started') {
      var guideYears = seasonList(), guideYear = h.year || YEAR || (ST.site && +ST.site.currentSeason);
      if (guideYears.length && guideYears.indexOf(guideYear) < 0) guideYear = +ST.site.currentSeason;
      YEAR = guideYear || null; SP = YEAR ? '/' + YEAR : '';
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
      if (target === 'getting-started' && YEAR) href = href.replace(/^#\/(?:\d{4}\/)?getting-started/, '#/' + YEAR + '/getting-started');
      link.setAttribute('href', competitionHref(href, target === 'rallyesport' ? 'rs' : target === 'round' ? 'nr' : competition));
    });
    document.title = (view.title ? view.title + ' — ' : '') + (ST.site ? ST.site.siteName : 'Northern Regions Rally') + (page === 'getting-started' ? '' : ' ' + YEAR);
    window.NRDisplay.mount(switchCompetition);
    mountNavigation();
    var ss = document.getElementById('seasonSel');
    if (ss) ss.addEventListener('change', function () {
      var keep = { standings: 1, rounds: 1, crews: 1, about: 1, info: 1, 'getting-started': 1 };
      location.hash = '#/' + ss.value + (keep[page] ? '/' + page + ((page === 'standings' || page === 'getting-started') && parts[1] ? '/' + parts[1] : '') : '') +
        qstr({ competition: competition });
    });
    mounts.forEach(function (fn) { fn(); });
    if (page === 'getting-started' && document.querySelector('.public-nav').getClientRects().length) {
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
    if (navigationFocusPending) {
      navigationFocusPending = false;
      var heading = document.querySelector('main h1, main h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
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
    return homeView(competition);
  }
  function homeView(mode) {
    var model = window.NRPublicModel.home(D, mode, ST.site);
    return window.NRPublicComponents.home(model, eventCards(mode));
  }
  function viewRsHome() {
    return homeView('rs');
  }
  function eventLinks(ev, list) {
    return window.NRPublicComponents.sourceLinks(window.NRPublicModel.eventLinks(ev, list));
  }
  function rallyeSportEvents() {
    return D.rallyesport && D.rallyesport.events || [];
  }
  function eventCards(mode) {
    return window.NRPublicComponents.calendar(window.NRPublicModel.calendar(D, mode || 'all'), Date.now());
  }

  /* ---------- standings */
  function viewStandings(role, q) {
    return window.NRPublicComponents.standings(window.NRPublicModel.standings(D, 'nr', role, q));
  }

  /* ---------- rounds list */
  function rsEligibilityNote() {
    if (E.rallyeSportEntryPolicy(D.rallyesport)) return '<p class="small muted rs-eligibility-note">* RS0 is a launch-only user classification, not a championship membership or licence restriction.</p>';
    return '<p class="small muted rs-eligibility-note">* RS0 Non-Scoring SSR 6.1 · No championship points or rank; not a declaration of non-membership.</p>';
  }
  function rsScoringNotice() {
    var scoring = D.rallyesport.scoring;
    var hasTables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    return '<p class="small muted">' + (scoring.status === 'ready' ? 'RS championship points.' :
      hasTables ? 'Provisional RS points · scored rounds only.' : 'RS points unavailable. ' + esc(scoring.reason || '')) + '</p>' +
      '<details class="notes rs-scoring-notes"><summary>Scoring notes</summary><div><p>' + esc(scoring.reason || '') + '</p>' +
      (E.rallyeSportEntryPolicy(D.rallyesport) ? '<p>User-confirmed entry-based eligibility applies to drivers and co-drivers. Membership, licence and invitation do not exclude championship entrants. Official classified/DNF status establishes a start; DNS excludes. This is not a printed SSR amendment. Non-scoring events remain in event history, not championship totals or round counts.</p>' : '') +
      (rallyeSportStarterMinimumNote(scoring, D.year) ? '<p class="small">' + esc(rallyeSportStarterMinimumNote(scoring, D.year)) + '</p>' : '') +
      (scoring.provisionalStandings && scoring.status !== 'ready' ? '<p>Provisional cumulative points: ready events only; blocked events are excluded, not scored as zero.</p>' : '') +
      ((scoring.excludedProvisionalEvents || []).length ? '<p class="small">Not scored: ' +
        scoring.excludedProvisionalEvents.map(function (row) {
          var event = rallyeSportEvents().filter(function (event) { return event.id === row.eventId; })[0];
          return esc(event ? event.name : row.eventId) + ' — ' + esc(row.reason);
        }).join('; ') + '</p>' : '') + '</div></details>';
  }
  function viewRsStandings(role, q) {
    return window.NRPublicComponents.standings(window.NRPublicModel.standings(D, 'rs', role, q));
  }
  function viewRsGraph(id, q, tab) {
    return viewResult('rs', id, tab || 'graph', q);
  }
  function rsGraphModel(result, event) {
    return window.NRPublicModel.resultGraph(D, 'rs', result.id);
  }
  function rsStandingsTable(title, selectedClass, role) {
    var display = window.NRPublicModel.standings(D, 'rs', role, { 'class': selectedClass });
    return '<div class="section"><div class="section-head"><h2>' + esc(title) + '</h2></div>' +
      window.NRPublicComponents.standingsTable(display) + '</div>';
  }
  function viewRallyeSport(resultId, q) {
    var rs = D.rallyesport || { events: [], results: [], scoring: { status: 'unconfigured', reason: 'RS rules are not configured.', results: [], standings: null } };
    var scoring = rs.scoring || { status: 'unconfigured', reason: 'RS rules are not configured.', results: [], standings: null };
    if (resultId) {
      return viewResult('rs', resultId, 'classification', q);
    }
    var htmlList = '<div class="page-head"><div><p class="eyebrow">' + YEAR + ' · RallyeSport</p><h1>RallyeSport tables</h1></div></div>' +
      rsScoringNotice();
    var standings = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    if (standings) {
      var labelPrefix = scoring.status === 'ready' ? '' : 'Provisional · ';
      htmlList += rsStandingsTable(labelPrefix + 'Overall drivers', '', 'driver') +
        rsStandingsTable(labelPrefix + 'Overall co-drivers', '', 'codriver');
      ['RS2', 'RS4'].forEach(function (cls) {
        htmlList += rsStandingsTable(labelPrefix + cls + ' drivers', cls, 'driver') +
          rsStandingsTable(labelPrefix + cls + ' co-drivers', cls, 'codriver');
      });
      if (!E.rallyeSportEntryPolicy(D.rallyesport)) htmlList += rsEligibilityNote();
    } else htmlList += '<div class="card empty"><b>Championship totals are not available.</b><p>' + esc(scoring.reason || 'Scoring rules are unconfigured.') + ' Event classifications remain available below.</p></div>';
    htmlList += '<div class="section"><div class="section-head"><h2>Event classifications</h2></div>' +
      window.NRPublicComponents.calendar(window.NRPublicModel.calendar(D, 'rs'), Date.now()) + '</div>';
    return { title: YEAR + ' RallyeSport tables', html: htmlList };
  }
  function viewRounds(q) {
    return window.NRPublicComponents.rounds(window.NRPublicModel.calendar(D, competition), Date.now());
  }

  /* ---------- round */
  var METRICS = window.NRPublicModel.resultMetrics;
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
    return viewResult('nr', id, tab, q);
  }
  function viewResult(mode, id, tab, query) {
    var q = query || {}, display = window.NRPublicModel.result(D, mode, id, tab, q);
    if (!display) return notFound();
    var html = '', graph = display.graph;
    if (display.published) {
      if (display.tab === 'classification') html = window.NRPublicComponents.resultClassification(display);
      else {
        if (!graph.entries.some(function (entry) { return entry.times.some(function (time) { return time != null; }); }))
          html += '<div class="callout warn"><div><b>No stage timing is published for this result.</b><p>Stage-time graphs and comparisons are unavailable. Any published official final positions and totals remain available; missing times are not inferred.</p></div></div>';
        if (q.m === 'spos' && !graph.entries.some(function (entry) { return entry.stagePos.some(function (pos) { return pos != null; }); }))
          html += '<div class="callout warn"><div>No official stage positions are published for this result. This metric is unavailable; ranks are not inferred from times.</div></div>';
        html += display.tab === 'stages' ? roundStageTimes(graph) : roundGraph(graph, q);
      }
    }
    return window.NRPublicComponents.resultShell(display, html, Date.now());
  }

  function selectedCars(r, q) {
    var cars;
    if (q.cars != null) cars = q.cars.split(',').filter(function (c) { return entryByCar(r, c); });
    else cars = classifiedSorted(r).slice(0, 5).map(function (e) { return e.car; });
    var seen = {}; return cars.filter(function (c) { if (seen[c]) return false; seen[c] = 1; return true; }).slice(0, PALETTE.length);
  }
  function colorFor(cars, car) { var i = cars.indexOf(car); return i >= 0 ? PALETTE[i % PALETTE.length] : null; }

  function roundGraph(r, q) {
    var metrics = r.metrics;
    var metric = metrics.filter(function (item) { return item.id === q.m; })[0] || metrics[0];
    var cars = selectedCars(r, q);
    var labels = metric.final ? r.labels : r.stages;
    var series = cars.map(function (car) {
      var e = entryByCar(r, car); var vals = seriesValues(r, car, metric).slice(0, labels.length);
      var end = e.status !== 'classified' ? e.status : null;
      var eligibilityNote = e.scoringNote;
      return { key: e.seriesKey,
        label: '#' + car + ' ' + surname(e.driver) + (eligibilityNote ? ' · ' + eligibilityNote : ''), color: colorFor(cars, car),
        values: vals, end: end, entry: e, entryEligibility: eligibilityNote,
        timePrecision: r.timePrecision };
    });
    var chartHtml = series.length ? lineChart({ labels: labels, series: series, kind: metric.kind, finalCol: metric.final, title: metric.label + ' — ' + r.name, metric: metric }) :
      '<div class="empty">Choose one or more cars to draw the graph.</div>';
    var html = window.NRPublicComponents.graphPanel(r, cars, metric, PALETTE, series, chartHtml,
      cars.length === 2 ? headToHead(r, cars[0], cars[1]) : '', cars.length ? selectedStageTable(r, cars) : '');
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
      var label = cfg.finalCol && i === cfg.labels.length - 1 ? 'Final (official, incl. penalties)' : 'After ' + cfg.labels[i];
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
    var round = function (value) { return Number(value.toFixed(r.timePrecision)); };
    var threshold = 0.5 / Math.pow(10, r.timePrecision);
    var diffText = function (value) { return fmtGraphTime(Math.abs(value), r.timePrecision); };
    var timeText = function (value) { return value == null ? '—' : fmtGraphTime(value, r.timePrecision); };
    var stageDiff = r.stages.map(function (s, k) { var ta = A.times[k], tb = B.times[k]; return ta == null || tb == null ? null : round(tb - ta); });
    var pa = r.progression[a], pb = r.progression[b];
    var cum = r.labels.map(function (l, k) { var x = pa.cum[k], z = pb.cum[k]; return x == null || z == null ? null : round(z - x); });
    var aWins = 0, bWins = 0; stageDiff.forEach(function (d) { if (d == null) return; if (d > threshold) aWins++; else if (d < -threshold) bWins++; });
    var finalTxt = 'Official classification — ' + esc(surname(A.driver)) + ': ' + (A.status === 'classified' && A.pos != null ? 'P' + A.pos : esc(A.status)) +
        ', ' + esc(surname(B.driver)) + ': ' + (B.status === 'classified' && B.pos != null ? 'P' + B.pos : esc(B.status)) + '. ' +
        (A.status === 'classified' && B.status === 'classified' && A.total != null && B.total != null ?
          'Official total difference: <b>' + diffText(round(B.total - A.total)) + '</b> (including penalties).' : 'Official total gap unavailable.');
    var cA = PALETTE[0], cB = PALETTE[1];
    return '<div class="card h2h"><div class="chart-title"><h3>Head-to-head</h3><p>Bars show who was quicker on each stage.</p></div>' +
      '<div class="h2h-head"><div class="h2h-side"><b style="color:' + cA + '">#' + esc(A.car) + ' ' + esc(A.driver) + '</b><span>' + esc(A.codriver) + ' · ' + esc(A.vehicle) + '</span></div><div class="h2h-vs">VS</div>' +
      '<div class="h2h-side b"><b style="color:' + cB + '">#' + esc(B.car) + ' ' + esc(B.driver) + '</b><span>' + esc(B.codriver) + ' · ' + esc(B.vehicle) + '</span></div></div>' +
      '<div class="h2h-sum"><b style="color:' + cA + '">' + esc(surname(A.driver)) + '</b> was quicker on ' + aWins + ' stage' + (aWins === 1 ? '' : 's') + ', <b style="color:' + cB + '">' + esc(surname(B.driver)) + '</b> on ' + bWins + '.<br>' + finalTxt + '</div>' +
      barChart({ labels: r.stages, values: stageDiff, c1: cA, c2: cB, aName: surname(A.driver), bName: surname(B.driver), title: 'Stage-by-stage difference', precision: r.timePrecision }) +
      '<div class="table-wrap" style="margin-top:10px;box-shadow:none"><table class="data"><thead><tr><th>Stage</th><th class="num">#' + esc(A.car) + '</th><th class="num">#' + esc(B.car) + '</th><th class="num">Quicker on stage</th><th class="num">Running gap</th></tr></thead><tbody>' +
      r.labels.map(function (l, k) {
        var isFinal = k === r.stages.length;
        var ta = isFinal ? A.total : A.times[k], tb = isFinal ? B.total : B.times[k];
        var d = isFinal ? null : stageDiff[k], c = cum[k];
        function who(v, lead) { if (v == null) return '—'; if (Math.abs(v) < threshold) return 'level'; var nm = v > 0 ? surname(A.driver) : surname(B.driver); return '<span style="color:' + (v > 0 ? cA : cB) + ';font-weight:700">' + esc(nm) + '</span> ' + (lead ? 'ahead by ' : 'by ') + diffText(v); }
        return '<tr><td><b>' + esc(isFinal ? 'Final (incl. pen.)' : l) + '</b></td><td class="num mono">' +
          (isFinal ? esc(A.totalText) : timeText(ta)) + '</td><td class="num mono">' +
          (isFinal ? esc(B.totalText) : timeText(tb)) + '</td><td class="num">' + (isFinal ? '' : who(d, false)) +
          '</td><td class="num">' + who(c, true) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function selectedStageTable(r, cars) {
    return window.NRPublicComponents.stageTable(r, cars, PALETTE);
  }

  function roundStageTimes(r) {
    return window.NRPublicComponents.stageTable(r);
  }

  /* ---------- crews */
  function directoryView(mode) {
    var display = window.NRPublicModel.directory(D, mode, ST.profiles);
    if (display.rows.length) mounts.push(mountCrewSearch);
    return window.NRPublicComponents.directory(display);
  }
  function personView(mode, id) {
    var prof = ST.profiles[id], models = seasonList().map(function (year) { return ST.models[year]; }).filter(Boolean);
    var display = window.NRPublicModel.profile(models, mode, id, prof);
    if (!display) return notFound();
    var role = display.roles.length === 2 ? 'Driver & co-driver' : display.roles.length ?
      display.roles[0] === 'driver' ? 'Driver' : 'Co-driver' : 'Competitor';
    var head = profileHeader(prof, display.name, role, display.seasons.map(function (season) { return season.year; }));
    var charts = display.seasons.map(function (season) {
      return season.charts.map(function (chart) {
        return responsive(function (width) { return pointsSvg(chart.model, chart.row, width, chart.classOnly); }) +
          '<div class="legend-row">' + (chart.classOnly ?
            '<span>Championship points · – unavailable / no scored result</span>' :
            '<span>Overall points</span><span>Class points</span>') + '</div>';
      });
    });
    return window.NRPublicComponents.profile(display, head, charts);
  }
  function sourcesView(mode) {
    return window.NRPublicComponents.sources(window.NRPublicModel.sources(D, mode));
  }
  function viewCrews() { return directoryView('nr'); }

  /* ---------- person (all seasons) */
  function rsAppearances(model, id, includeUnresolved) {
    return window.NRPublicModel.rsAppearances(model, id, includeUnresolved);
  }
  function rsRoundsStarted(model, id, role) {
    return window.NRPublicModel.rsRoundsStarted(model, id, role);
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
  function viewRsCrews() { return directoryView('rs'); }
  function viewRsPerson(id) { return personView('rs', id); }
  function viewPerson(id) { return personView('nr', id); }
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
  function rsPersonRoundPoints(model, id, role, cls) {
    return window.NRPublicModel.rsPersonRoundPoints(model, id, role, cls);
  }
  function pointsSvg(model, row, W, classOnly) {
    var rounds = model.rounds, evs = {}; model.events.forEach(function (e) { evs[e.id] = e; });
    var H = 240, m = { l: 36, r: 10, t: 18, b: 42 }, iw = W - m.l - m.r, ih = H - m.t - m.b, n = Math.max(1, rounds.length);
    var top = classOnly ? Math.max(20, Math.ceil(Math.max.apply(null, [0].concat(Object.keys(row.rounds).map(function (id) {
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
      if (!classOnly) s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yo + '" width="' + bw + '" height="' + (y0 - yo) + '" rx="3" fill="var(--ink-2)"><title>Overall: ' + v.o + '</title></rect>';
      s += '<rect x="' + (x(i) - bw / 2) + '" y="' + yt + '" width="' + bw + '" height="' + (yo - yt) + '" rx="3" fill="var(--accent)"><title>' +
        (classOnly ? 'Championship: ' : 'Class: ') + v.c + '</title></rect>';
      s += '<text x="' + x(i) + '" y="' + (yt - 6) + '" text-anchor="middle" style="font-size:13px;font-weight:800;fill:var(--ink)">' + v.pts + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- about the data (per season) */
  function viewRsSources() { return sourcesView('rs'); }
  function viewAbout() { return sourcesView('nr'); }

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
  function siteChannels() {
    var site = ST.site || {}, contact = site.contact || {};
    return '<div class="grid social-grid">' + (site.social || []).map(function (row) {
      var url = safeUrl(row.url), inner = '<span class="soc-badge ' + esc(row.network) + '">' + socialIcon(row.network) +
        '</span><span class="soc-text"><b>' + esc(row.label || socialLabel(row.network)) + '</b><span>' +
        esc(url ? row.handle || url : 'Coming soon') + '</span></span>';
      return url ? '<a class="card social-card" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>' :
        '<div class="card social-card off" aria-disabled="true">' + inner + '</div>';
    }).join('') + '</div><div class="card"><h3>Contact</h3><p>' + esc(contact.note || '') + '</p>' +
      (contact.email ? '<a class="btn" href="mailto:' + esc(contact.email) + '">' + socialIcon('email') +
        esc(contact.email) + '</a>' : '') + '</div>';
  }
  function viewInfo() {
    return window.NRPublicComponents.information(window.NRPublicModel.information(D, competition, ST.site,
      (ST.displayMetadata || {})[YEAR]), siteChannels());
  }

  /* ------------------------------------------------------------------ boot */
  document.addEventListener('keydown', function (event) {
    var button = document.getElementById('navigationToggle');
    if (event.key === 'Escape' && button && button.getAttribute('aria-expanded') === 'true') {
      event.preventDefault(); setNavigation(false, true);
    }
  });
  function closeOutsideNavigation(event) {
    var button = document.getElementById('navigationToggle'), nav = document.getElementById('publicNav');
    if (button && nav && !button.contains(event.target) && !nav.contains(event.target)) setNavigation(false);
  }
  document.addEventListener('click', closeOutsideNavigation);
  document.addEventListener('focusin', function (event) {
    navigationLastFocus = event.target;
    closeOutsideNavigation(event);
  });
  var compactNavigation = window.matchMedia('(max-width: 1200px)');
  compactNavigation.addEventListener('change', function () {
    var button = document.getElementById('navigationToggle'), nav = document.getElementById('publicNav');
    if (!button || !nav) return;
    // CSS can hide and blur the focused control before this callback runs.
    var focus = document.activeElement === document.body ? navigationLastFocus : document.activeElement;
    var inside = focus && nav.contains(focus), onButton = focus === button;
    setNavigation(false);
    if (compactNavigation.matches && inside) button.focus();
    else if (!compactNavigation.matches && onButton) (nav.querySelector('.active') || nav.querySelector('a')).focus();
  });
  window.addEventListener('hashchange', render);
  render();
  loadSiteAndPeople().then(function (res) {
    ST.site = res[0]; ST.people = res[1];
    ST.peopleIndex = E.peopleIndex(ST.people);
    ((ST.people && ST.people.people) || []).forEach(function (p) { ST.profiles[p.id] = p; });
    render();
  }).catch(showLoadError);
})();
