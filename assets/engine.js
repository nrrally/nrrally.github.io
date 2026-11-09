/* NR Rally — shared data engine (public site, admin and Node tools).
   Turns the JSON "database" (site, people, season, rounds) into a computed season model:
   points, class positions, stage-by-stage progression, standings and crew histories. */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------------- basics */
  function parseTime(t) {
    if (t == null) return null;
    var s = String(t).trim();
    if (!s || s === '"":""' || s === '.' || s === '-' || s === '—') return null;
    var m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (!m) return NaN;
    var h = m[1] ? +m[1] : 0, mi = +m[2], se = +m[3];
    return Math.round((h * 3600 + mi * 60 + se) * 10) / 10;
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  function fmtTime(sec, forceH) {
    if (sec == null || isNaN(sec)) return '';
    var neg = sec < 0, s = Math.round(Math.abs(sec) * 10) / 10;
    var h = Math.floor(s / 3600); s = r1(s - h * 3600);
    var m = Math.floor(s / 60); s = r1(s - m * 60);
    var ss = s.toFixed(1); if (s < 10) ss = '0' + ss;
    var body = (h || forceH) ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
    return (neg ? '-' : '') + body;
  }
  function slug(n) {
    return String(n || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function normName(n) { return String(n || '').replace(/[_\s]+/g, ' ').trim(); }
  function keyName(n) { return normName(n).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function normClass(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
  function dateOrdinal(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    var time = Date.parse(value + 'T00:00:00Z');
    return isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value ? null : Math.floor(time / 86400000);
  }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  /* JSON that stays readable in GitHub diffs: arrays of plain values on one line. */
  function prettyJson(v, ind) {
    ind = ind || '';
    var nx = ind + ' ';
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      if (v.every(function (x) { return x === null || typeof x !== 'object'; })) return '[' + v.map(function (x) { return JSON.stringify(x); }).join(', ') + ']';
      return '[\n' + v.map(function (x) { return nx + prettyJson(x, nx); }).join(',\n') + '\n' + ind + ']';
    }
    if (v && typeof v === 'object') {
      var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; });
      if (!keys.length) return '{}';
      return '{\n' + keys.map(function (k) { return nx + JSON.stringify(k) + ': ' + prettyJson(v[k], nx); }).join(',\n') + '\n' + ind + '}';
    }
    return JSON.stringify(v);
  }

  /* ---------------------------------------------------------------- people */
  function peopleIndex(peopleDoc) {
    var byKey = {}, byId = {};
    ((peopleDoc && peopleDoc.people) || []).forEach(function (p) {
      byId[p.id] = p;
      byKey[keyName(p.name)] = p;
      (p.aliases || []).forEach(function (a) { byKey[keyName(a)] = p; });
    });
    return {
      byId: byId,
      resolve: function (name) {
        var n = normName(name); if (!n) return { id: '', name: '' };
        var p = byKey[keyName(n)];
        return p ? { id: p.id, name: p.name, known: true } : { id: slug(n), name: n, known: false };
      }
    };
  }

  /* ---------------------------------------------------------------- season model */
  function buildSeason(opts) {
    var season = opts.season, roundsById = opts.rounds || {}, pidx = peopleIndex(opts.people);
    var scale = season.pointsScale || { overall: [], cls: [] };
    var classOnly = {};
    (season.classes || []).forEach(function (c) { if (c.classOnly) classOnly[c.id] = true; });
    var classMap = (season.classMap && season.classMap.drivers) || {};
    var coClassMap = (season.classMap && season.classMap.codrivers) || {};
    var confirmed = {}; ((season.msa && season.msa.confirmedRounds) || []).forEach(function (id) { confirmed[id] = true; });
    var rounds = [];
    (season.rounds || []).forEach(function (meta, idx) {
      var raw = roundsById[meta.id];
      if (!raw) return;
      rounds.push(computeRound(meta, raw, idx + 1));
    });

    function computeRound(meta, raw, n) {
      var S = raw.stages || [];
      var ents = (raw.entries || []).map(function (r) {
        var drv = pidx.resolve(r.driver), co = pidx.resolve(r.codriver);
        var credit = r.credit || {};
        var cdrv = credit.driver ? pidx.resolve(credit.driver) : drv;
        var cco = credit.codriver ? pidx.resolve(credit.codriver) : co;
        var pcl = normClass(r['class']);
        var cls = r.scoredClass ? normClass(r.scoredClass) : (classMap[cdrv.id] || pcl);
        var notes = [];
        if (credit.why) notes.push(credit.why);
        if (cls !== pcl) notes.push('Printed class ' + pcl + '; scored as ' + cls + (r.scoredClass ? '.' : ' to match the class used in the championship standings.'));
        (r.notes || []).forEach(function (x) { notes.push(x); });
        var times = (r.times || []).slice(0, S.length).map(parseTime);
        while (times.length < S.length) times.push(null);
        var sp = (r.stagePos || []).slice(0, S.length).map(function (x) { return x == null || x === '' ? null : +x; });
        while (sp.length < S.length) sp.push(null);
        var status = r.status || 'classified';
        return {
          car: String(r.car), status: status, pos: status === 'classified' ? +r.pos : null,
          driver: drv.name, codriver: co.name, driverId: drv.id, codriverId: co.id,
          champDriver: cdrv.name, champCodriver: cco.name, champDriverId: cdrv.id, champCodriverId: cco.id,
          noCreditCodriver: !!credit.noCodriver, printedClass: pcl, cls: cls, vehicle: r.vehicle || '',
          stagesCompleted: r.stages == null || r.stages === '' ? null : +r.stages, times: times, stagePos: sp,
          pen: parseTime(r.pen), total: parseTime(r.total), notes: notes
        };
      });
      // points
      var cl = ents.filter(function (e) { return e.status === 'classified'; }).sort(function (a, b) { return a.pos - b.pos; });
      var ovrRank = 0, classRank = {};
      cl.forEach(function (e) {
        var ovr = 0;
        if (!classOnly[e.cls]) { ovrRank++; ovr = ovrRank <= scale.overall.length ? scale.overall[ovrRank - 1] : 0; }
        classRank[e.cls] = (classRank[e.cls] || 0) + 1;
        e.classPos = classRank[e.cls];
        var cp = e.classPos <= scale.cls.length ? scale.cls[e.classPos - 1] : 0;
        e.points = { overall: ovr, cls: cp, total: ovr + cp };
      });
      ents.forEach(function (e) {
        if (e.status === 'DNF') { e.points = { overall: 0, cls: 0, total: 0 }; e.classPos = null; }
        if (e.status === 'DNS') { e.points = null; e.classPos = null; }
      });
      // progression
      var labels = S.concat(['Final']);
      var prog = {};
      ents.forEach(function (e) {
        var c = 0, ok = true, cum = [];
        e.times.forEach(function (t) { if (t == null || isNaN(t)) ok = false; if (ok) { c = r1(c + t); cum.push(c); } else cum.push(null); });
        cum.push(e.status === 'classified' && e.total != null && !isNaN(e.total) ? e.total : null);
        prog[e.car] = { cum: cum, pos: [], cpos: [], gap: [], cgap: [], delta: [] };
      });
      for (var k = 0; k < labels.length; k++) {
        var last = k === labels.length - 1;
        var pool = last ? cl.filter(function (e) { return e.total != null && !isNaN(e.total); }).map(function (e) { return [e.total, e]; })
          : ents.filter(function (e) { return prog[e.car].cum[k] != null; }).map(function (e) { return [prog[e.car].cum[k], e]; });
        var lead = null, clead = {};
        pool.forEach(function (p) { if (lead == null || p[0] < lead) lead = p[0]; if (clead[p[1].cls] == null || p[0] < clead[p[1].cls]) clead[p[1].cls] = p[0]; });
        ents.forEach(function (e) {
          var v = prog[e.car].cum[k];
          if (last && e.status !== 'classified') v = null;
          var P = prog[e.car];
          if (v == null) { P.pos.push(null); P.cpos.push(null); P.gap.push(null); P.cgap.push(null); return; }
          if (last) { P.pos.push(e.pos); P.cpos.push(e.classPos); }
          else {
            P.pos.push(1 + pool.filter(function (p) { return p[0] < v - 1e-9; }).length);
            P.cpos.push(1 + pool.filter(function (p) { return p[1].cls === e.cls && p[0] < v - 1e-9; }).length);
          }
          P.gap.push(r1(v - lead)); P.cgap.push(r1(v - clead[e.cls]));
        });
      }
      for (var s = 0; s < S.length; s++) {
        var best = null;
        ents.forEach(function (e) { var t = e.times[s]; if (t != null && !isNaN(t) && (best == null || t < best)) best = t; });
        ents.forEach(function (e) { var t = e.times[s]; prog[e.car].delta.push(t == null || isNaN(t) || best == null ? null : r1(t - best)); });
      }
      var extra = (raw.extraStarts || []).map(function (x) {
        var d = pidx.resolve(x.driver), c = pidx.resolve(x.codriver);
        return { car: String(x.car), driver: d.name, codriver: c.name, driverId: d.id, codriverId: c.id, cls: normClass(x['class']), note: x.note || '' };
      });
      return {
        id: meta.id, n: n, eventId: meta.eventId, day: meta.day || '', date: meta.date || '',
        title: raw.title || '', status: raw.status || '', provisional: /provisional/i.test(raw.status || ''), finalityUnclear: !!raw.finalityUnclear,
        notes: raw.notes || [], source: raw.source || {}, stages: S, labels: labels, entries: ents, progression: prog,
        extraStarts: extra, confirmed: !!confirmed[meta.id]
      };
    }

    function standings(role) {
      var table = {};
      function row(id, name) { return table[id] || (table[id] = { id: id, name: name, rounds: {}, classes: {} }); }
      rounds.forEach(function (rd) {
        rd.entries.forEach(function (e) {
          if (e.status === 'DNS') return;
          if (role === 'codriver' && e.noCreditCodriver) return;
          var id = role === 'driver' ? e.champDriverId : e.champCodriverId, name = role === 'driver' ? e.champDriver : e.champCodriver;
          if (!id) return;
          var r = row(id, name);
          r.rounds[rd.id] = { car: e.car, status: e.status, pos: e.pos, classPos: e.classPos, cls: e.cls, o: e.points.overall, c: e.points.cls, pts: e.points.total };
          r.classes[e.cls] = 1;
        });
        rd.extraStarts.forEach(function (x) {
          var id = role === 'driver' ? x.driverId : x.codriverId, name = role === 'driver' ? x.driver : x.codriver;
          if (!id) return;
          var r = row(id, name);
          r.rounds[rd.id] = { car: x.car, status: 'DNF', pos: null, classPos: null, cls: x.cls, o: 0, c: 0, pts: 0, msaOnly: true };
          r.classes[x.cls] = 1;
        });
      });
      var map = role === 'driver' ? classMap : coClassMap;
      var out = Object.keys(table).map(function (k) {
        var r = table[k];
        r.total = 0; Object.keys(r.rounds).forEach(function (id) { r.total += r.rounds[id].pts; });
        r.starts = Object.keys(r.rounds).length;
        r.eligible = r.starts >= (season.minStarts || 0);
        var lastId = null; rounds.forEach(function (rd) { if (r.rounds[rd.id]) lastId = rd.id; });
        r.cls = map[r.id] || (lastId ? r.rounds[lastId].cls : '');
        r.classes = Object.keys(r.classes).sort();
        r.finishes = Object.keys(r.rounds).map(function (id) { return r.rounds[id].pos; }).filter(function (p) { return p; }).sort(function (a, b) { return a - b; });
        return r;
      });
      out.sort(function (a, b) {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        if (b.total !== a.total) return b.total - a.total;
        var positions = Array.from(new Set(a.finishes.concat(b.finishes))).sort(function (x, y) { return x - y; });
        for (var i = 0; i < positions.length; i++) {
          var ca = a.finishes.filter(function (p) { return p === positions[i]; }).length, cb = b.finishes.filter(function (p) { return p === positions[i]; }).length;
          if (ca !== cb) return cb - ca;
        }
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });
      out.forEach(function (r, i) { r.rank = i + 1; });
      return out;
    }

    var people = {};
    function person(id, name) { return people[id] || (people[id] = { id: id, name: name, apps: [], entries: [] }); }
    rounds.forEach(function (rd) {
      rd.entries.forEach(function (e) {
        var seen = {};
        [['driver', e.driverId, e.driver, e.codriver], ['co-driver', e.codriverId, e.codriver, e.driver]].forEach(function (c) {
          if (!c[1]) return;
          var credited = null;
          if (e.champDriverId === c[1]) credited = 'driver';
          else if (e.champCodriverId === c[1] && !e.noCreditCodriver) credited = 'co-driver';
          seen[c[1]] = 1;
          person(c[1], c[2]).apps.push({ r: rd.id, car: e.car, role: c[0], credited: credited, partner: c[3], cls: e.cls, vehicle: e.vehicle, status: e.status,
            pos: e.pos, classPos: e.classPos, pts: credited && e.points ? e.points.total : null });
        });
        [[e.champDriverId, e.champDriver, 'driver', e.codriver], [e.champCodriverId, e.champCodriver, 'co-driver', e.driver]].forEach(function (c) {
          if (!c[0] || seen[c[0]]) return;
          if (c[2] === 'co-driver' && e.noCreditCodriver) return;
          person(c[0], c[1]).apps.push({ r: rd.id, car: e.car, role: null, credited: c[2], partner: c[3], cls: e.cls, vehicle: e.vehicle, status: e.status,
            pos: e.pos, classPos: e.classPos, pts: e.points ? e.points.total : null });
        });
      });
      rd.extraStarts.forEach(function (x) {
        [[x.driverId, x.driver, 'driver', x.codriver], [x.codriverId, x.codriver, 'co-driver', x.driver]].forEach(function (c) {
          if (!c[0]) return;
          person(c[0], c[1]).apps.push({ r: rd.id, car: x.car, role: null, credited: c[2], partner: c[3], cls: x.cls, vehicle: null, status: 'DNF', pos: null, classPos: null, pts: 0, msaOnly: true });
        });
      });
    });

    var entryLists = (season.entryLists || []).map(function (list) {
      return Object.assign({}, list, { entries: list.entries.map(function (e) {
        var d = pidx.resolve(e.driver), c = pidx.resolve(e.codriver);
        var candidates = rounds.filter(function (r) { return r.eventId === list.eventId && (!e.roundIds.length || e.roundIds.indexOf(r.id) >= 0); });
        function started(id) {
          return !!id && candidates.some(function (r) {
            return r.entries.some(function (x) { return x.status !== 'DNS' && (x.driverId === id || x.codriverId === id ||
              x.champDriverId === id || !x.noCreditCodriver && x.champCodriverId === id); }) ||
              r.extraStarts.some(function (x) { return x.driverId === id || x.codriverId === id; });
          });
        }
        var row = Object.assign({}, e, { driver: d.name, codriver: c.name, driverId: d.id, codriverId: c.id });
        row.recordedStart = candidates.some(function (r) { return entryCrewRecorded(row, r); });
        [[d, 'driver', c.name], [c, 'co-driver', d.name]].forEach(function (x) {
          if (!x[0].id) return;
          person(x[0].id, x[0].name).entries.push({ eventId: list.eventId, roundIds: e.roundIds, car: e.car, role: x[1],
            partner: x[2], cls: e['class'], vehicle: e.vehicle, status: e.status, recordedStart: started(x[0].id),
            source: list.source, locator: e.locator });
        });
        return row;
      }) });
    });
    entryLists.forEach(function (l) {
      l.eventEntries = new Set(l.entries.map(function (e) { return [e.driverId, e.codriverId].filter(Boolean).sort().join('/'); })).size;
    });
    rounds.forEach(function (r) {
      var list = entryLists.filter(function (l) { return l.eventId === r.eventId; })[0];
      r.entryParticipation = list ? { complete: list.complete && list.roundIds.indexOf(r.id) >= 0 &&
        list.entries.every(function (e) { return e.roundIds.length; }), source: list.source,
        entries: list.entries.filter(function (e) { return e.roundIds.indexOf(r.id) >= 0; }).map(function (e) {
          return Object.assign({}, e, { recordedStart: entryCrewRecorded(e, r), recordedDNS: entryCrewRecorded(e, r, 'DNS') });
        }) } : null;
    });

    return {
      year: season.year, championship: season.championship, status: season.status || '', minStarts: season.minStarts,
      pointsScale: scale, classes: season.classes || [], events: season.events || [], rounds: rounds,
      standings: { drivers: standings('driver'), codrivers: standings('codriver') },
      people: Object.keys(people).map(function (k) { return people[k]; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }),
      msa: season.msa || null, documents: season.documents || [], notes: season.notes || [],
      entryLists: entryLists,
      rallyesport: buildRallyeSport(season.rallyesport, opts.people, season),
      calendar: (season.rounds || []).map(function (m, i) {
        return { id: m.id, n: i + 1, eventId: m.eventId, day: m.day || '', date: m.date || '', hasResults: !!roundsById[m.id] };
      })
    };
  }

  /* ---------------------------------------------------------- RallyeSport layer */
  function buildRallyeSport(raw, people, season) {
    var idx = peopleIndex(people), data = raw || { events: [], results: [] };
    return {
      events: (data.events || []).map(function (event) { return Object.assign({}, event); }),
      results: (data.results || []).map(function (result) {
        return Object.assign({}, result, {
          stages: (result.stages || []).map(function (stage) { return Object.assign({}, stage); }),
          entries: (result.entries || []).map(function (entry) {
            var driver = idx.resolve(entry.driver), codriver = idx.resolve(entry.codriver);
            return Object.assign({}, entry, {
              driver: driver.name, codriver: codriver.name,
              driverId: driver.id, codriverId: codriver.id,
              driverKnown: !!driver.known, codriverKnown: !!codriver.known,
              times: (entry.times || []).slice(), stagePos: (entry.stagePos || []).slice()
            });
          })
        });
      }),
      scoring: calculateRallyeSportScoring(data, season, people)
    };
  }
  function calculateRallyeSportScoring(data, season, people) {
    var events = data && data.events || [], results = data && data.results || [], idx = peopleIndex(people);
    var resultByEvent = Object.create(null), scoreRows = [], pointScale = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2], nonScoring = Object.create(null);
    function blocked(reason) { return { status: 'blocked', reason: reason, entries: [] }; }
    if (!data || !data.ruleset || data.ruleset.code !== 'clubman-sprint-2026-v1' || data.ruleset.year !== 2026) {
      return { status: 'unconfigured', reason: 'The 2026 MSA RallyeSport Clubman’s Sprint SSR V1 ruleset is not selected.', results: [], standings: null };
    }
    if (season && season.year !== 2026) {
      return { status: 'unconfigured', reason: 'The reviewed SSRs apply to the 2026 calendar year only.', results: [], standings: null };
    }
    var counted = events.filter(function (event) { return event.countsForChampionship === true; });
    var doubleEvents = counted.filter(function (event) { return event.doublePoints === true; });
    (data.nonScoringPeople || []).forEach(function (id) { nonScoring[id] = true; });
    results.forEach(function (result) { resultByEvent[result.eventId] = result; });
    events.forEach(function (event) {
      var result = resultByEvent[event.id];
      if (event.countsForChampionship !== true) return;
      if (!result) { scoreRows.push({ eventId: event.id, resultId: '', status: 'blocked', reason: 'No complete official classification is recorded for this confirmed championship event.', entries: [] }); return; }
      var row = { eventId: event.id, resultId: result.id, status: 'ready', reason: '', entries: [] };
      if (event.rulesetConfirmed !== true || !event.rulesetEvidence) row = blocked('This specific event has not been confirmed as governed by the selected SSRs.');
      else if (event.doublePoints !== true && event.doublePoints !== false) row = blocked('Whether this event is a bulletin-announced double-points round is not recorded.');
      else if (event.doublePoints && !event.doublePointsEvidence) row = blocked('A double-points event needs its official bulletin evidence.');
      else if (event.doublePoints && (dateOrdinal(event.startDate) == null || dateOrdinal(event.doublePointsBulletinDate) == null)) row = blocked('Double points need valid event start and bulletin issue dates to check SSR 7.2 notice.');
      else if (event.doublePoints && dateOrdinal(event.startDate) - dateOrdinal(event.doublePointsBulletinDate) < 14) row = blocked('SSR 7.2 requires the double-points bulletin at least 14 days before the event.');
      else if (event.countsForChampionship === true && event.doublePoints && counted.length !== 5) row = blocked('SSR 7.2 specifies a double-points round only for a five-round championship; other round counts need clarification.');
      else if (event.countsForChampionship === true && event.doublePoints && doubleEvents.length !== 1) row = blocked('SSR 7.2 requires exactly one double-points round in a five-round championship.');
      else if (!/^\s*final(?:\s+official)?\s+(?:classification|results)(?:\s+\d+\/\d+)?\s*$/i.test(result.status || '')) row = blocked(/provisional/i.test(result.status || '') ?
        'The source classification is provisional; event points are not calculated.' : 'The source classification finality is unclear; event points are not calculated.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'DNF'; })) row = blocked('The 2026 SSR finisher clause is blank; DNF points are not inferred.');
      else if ((result.entries || []).some(function (entry) { return entry.status !== 'classified' && entry.status !== 'DNS'; })) row = blocked('A non-classified RS status, including TEST, has no scoring semantics; retain the official row and wait for an RS ruling.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'classified' && ['RS2', 'RS4'].indexOf(normClass(entry['class'])) < 0; })) row = blocked('An RS category has no configured scoring semantics.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'classified' &&
        (!Number.isInteger(entry.pos) || entry.pos < 1 || entry.total == null || entry.total === ''); })) row = blocked('A classified RS row is missing its official position or total.');
      else if ((result.entries || []).some(function (entry, i) { return (result.entries || []).slice(0, i).some(function (other) { return String(other.car) === String(entry.car); }); })) row = blocked('Duplicate car numbers need RS source review before points can be assigned.');
      else if ((result.entries || []).filter(function (entry) { return entry.status !== 'DNS'; }).length < 15) row = blocked('Fewer than 15 cars are recorded as starters; SSR 7.3 says this event does not count toward the championship.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'classified' && typeof entry.invited !== 'boolean'; })) row = blocked('Invitational/non-invitational status is not confirmed for every classified crew.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'classified' &&
        (!idx.resolve(entry.driver).known || entry.codriver && !idx.resolve(entry.codriver).known); })) row = blocked('Scoring needs reviewed shared person profiles; names are not merged by car number.');
      if (row.status === 'blocked') { row.eventId = event.id; row.resultId = result.id; row.entries = []; scoreRows.push(row); return; }
      var scoringRoles = {
        driver: (result.entries || []).filter(function (entry) { return entry.status === 'classified' && !entry.invited && !nonScoring[idx.resolve(entry.driver).id]; }),
        codriver: (result.entries || []).filter(function (entry) { return entry.status === 'classified' && entry.codriver && !entry.invited && !nonScoring[idx.resolve(entry.codriver).id]; })
      };
      function classOrder(entry) { return entry.classPos == null ? entry.pos : entry.classPos; }
      var classifiedEntries = (result.entries || []).filter(function (entry) { return entry.status === 'classified'; });
      var tied = classifiedEntries.some(function (entry, i) {
        return classifiedEntries.slice(0, i).some(function (previous) {
          return normClass(previous['class']) === normClass(entry['class']) && classOrder(previous) === classOrder(entry);
        });
      });
      if (tied) {
        scoreRows.push({ eventId: event.id, resultId: result.id, status: 'blocked',
          reason: 'A tied scoring position remains unresolved; the app does not recompute the SSR 7.5 tie-break.', entries: [] });
        return;
      }
      var pointsByCar = Object.create(null);
      Object.keys(scoringRoles).forEach(function (role) {
        var classRanks = Object.create(null);
        scoringRoles[role].slice().sort(function (a, b) { return classOrder(a) - classOrder(b); }).forEach(function (entry) {
          var cls = normClass(entry['class']), rank = classRanks[cls] || 0;
          classRanks[cls] = rank + 1;
          var points = rank < pointScale.length ? pointScale[rank] : 1;
          if (event.doublePoints) points *= 2;
          if (!pointsByCar[String(entry.car)]) pointsByCar[String(entry.car)] = { driver: null, codriver: null };
          pointsByCar[String(entry.car)][role] = points;
        });
      });
      row.entries = (result.entries || []).map(function (entry) {
        var points = pointsByCar[String(entry.car)] || {};
        return { car: String(entry.car), driverPoints: points.driver == null ? null : points.driver,
          codriverPoints: points.codriver == null ? null : points.codriver };
      });
      scoreRows.push(row);
    });
    var readyRows = scoreRows.filter(function (row) { return row.status === 'ready'; });
    var allReady = counted.length > 0 && readyRows.length === counted.length;
    var roundRule = counted.length >= 6 && counted.length <= 8 && doubleEvents.length === 0 ||
      counted.length === 5 && doubleEvents.length === 1;
    var standings = null, status = 'incomplete', reason = '';
    if (!counted.length) reason = 'No events are confirmed as counting toward the championship.';
    else if (!allReady) { status = 'blocked'; reason = 'One or more confirmed championship events cannot be scored from the available evidence.'; }
    else if (counted.length > 8) { status = 'blocked'; reason = 'The SSR maximum of eight championship rounds is exceeded.'; }
    else if (counted.length >= 6 && doubleEvents.length) { status = 'blocked'; reason = 'SSR 7.2 only specifies double points for a five-round championship; other round counts need clarification.'; }
    else if (!roundRule) reason = counted.length === 5 ? 'Five rounds require exactly one bulletin-confirmed double-points event.' :
      'The SSR requires six to eight rounds, or five rounds with one bulletin-confirmed double-points event.';
    else {
      var tables = { overallDrivers: Object.create(null), overallCodrivers: Object.create(null),
        classDrivers: { RS2: Object.create(null), RS4: Object.create(null) },
        classCodrivers: { RS2: Object.create(null), RS4: Object.create(null) } };
      function add(table, id, name, points) {
        if (!id) return;
        if (!table[id]) table[id] = { id: id, name: name, points: 0 };
        table[id].points += points;
      }
      readyRows.forEach(function (row) {
        var result = results.filter(function (item) { return item.id === row.resultId; })[0];
        var event = events.filter(function (item) { return item.id === row.eventId; })[0];
        (row.entries || []).forEach(function (score) {
          var entry = result.entries.filter(function (item) { return String(item.car) === score.car; })[0];
          if (!entry) return;
          var driver = idx.resolve(entry.driver), codriver = idx.resolve(entry.codriver), cls = normClass(entry['class']);
          if (score.driverPoints != null) {
            add(tables.overallDrivers, driver.id, driver.name, score.driverPoints);
            add(tables.classDrivers[cls], driver.id, driver.name, score.driverPoints);
          }
          if (score.codriverPoints != null && codriver.id) {
            add(tables.overallCodrivers, codriver.id, codriver.name, score.codriverPoints);
            add(tables.classCodrivers[cls], codriver.id, codriver.name, score.codriverPoints);
          }
        });
      });
      function table(value) {
        var rows = Object.keys(value).map(function (id) { return value[id]; });
        rows.sort(function (a, b) { return b.points - a.points || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
        rows.forEach(function (row) { row.rank = 1 + rows.filter(function (other) { return other.points > row.points; }).length; });
        return rows;
      }
      standings = {
        overallDrivers: table(tables.overallDrivers), overallCodrivers: table(tables.overallCodrivers),
        classDrivers: { RS2: table(tables.classDrivers.RS2), RS4: table(tables.classDrivers.RS4) },
        classCodrivers: { RS2: table(tables.classCodrivers.RS2), RS4: table(tables.classCodrivers.RS4) }
      };
      status = 'ready';
      reason = 'Points use the reviewed 2026 Clubman’s Sprint SSR scale; equal championship totals share a rank because season tie-breaks are unresolved.';
    }
    return { status: status, reason: reason, results: scoreRows, standings: standings };
  }
  function projectRallyeSport(data, season, people) {
    if (!data) return data;
    var projected = JSON.parse(JSON.stringify(data));
    projected.scoring = calculateRallyeSportScoring(data, season, people);
    delete projected.nonScoringPeople;
    projected.events = (projected.events || []).map(function (event) {
      delete event.countsForChampionship; delete event.championshipEvidence; delete event.doublePoints; delete event.doublePointsEvidence;
      delete event.doublePointsBulletinDate;
      delete event.rulesetConfirmed; delete event.rulesetEvidence;
      return event;
    });
    projected.results = (projected.results || []).map(function (result) {
      result.entries = (result.entries || []).map(function (entry) {
        delete entry.invited;
        return entry;
      });
      return result;
    });
    return projected;
  }
  function buildRallyeSportGraph(result, nrStages, metricId) {
    var stages = result.stages || [], entries = result.entries || [], labels = nrStages.slice(), final = ['pos', 'cpos', 'gap', 'cgap'].indexOf(metricId) >= 0;
    if (final) labels.push('Final');
    var data = entries.map(function (entry) {
      var cumulative = [], total = 0, complete = true;
      (entry.times || []).forEach(function (value) {
        var sec = parseTime(value);
        if (sec == null || isNaN(sec)) complete = false;
        if (complete) { total = r1(total + sec); cumulative.push(total); } else cumulative.push(null);
      });
      return { entry: entry, cumulative: cumulative, total: parseTime(entry.total) };
    });
    var valuesByEntry = data.map(function (row) {
      var metric = [];
      for (var k = 0; k < stages.length; k++) {
        var value = row.cumulative[k], pool = data.filter(function (other) { return other.cumulative[k] != null; });
        var classPool = pool.filter(function (other) { return other.entry['class'] === row.entry['class']; });
        var best = pool.length ? Math.min.apply(null, pool.map(function (other) { return other.cumulative[k]; })) : null;
        var classBest = classPool.length ? Math.min.apply(null, classPool.map(function (other) { return other.cumulative[k]; })) : null;
        var stageTime = parseTime((row.entry.times || [])[k]);
        var stagePool = data.map(function (other) { return parseTime((other.entry.times || [])[k]); }).filter(function (time) { return time != null && !isNaN(time); });
        var stageBest = stagePool.length ? Math.min.apply(null, stagePool) : null;
        var classRank = 1 + classPool.filter(function (other) { return other.cumulative[k] < value - 1e-9; }).length;
        var stageValue = (row.entry.stagePos || [])[k];
        metric.push(value == null ? null : metricId === 'pos' ? 1 + pool.filter(function (other) { return other.cumulative[k] < value - 1e-9; }).length :
          metricId === 'cpos' ? classRank : metricId === 'gap' ? r1(value - best) :
          metricId === 'cgap' ? r1(value - classBest) : metricId === 'loss' ? (stageTime == null || isNaN(stageTime) || stageBest == null ? null : r1(stageTime - stageBest)) :
          metricId === 'spos' ? (stageValue == null || stageValue === '' ? null : +stageValue) : null);
      }
      if (final) {
        var isClassified = row.entry.status === 'classified', classified = data.filter(function (other) {
          return other.entry.status === 'classified' && other.total != null && !isNaN(other.total);
        });
        var sameClass = classified.filter(function (other) { return other.entry['class'] === row.entry['class']; });
        var finalValue = row.total;
        var finalBest = classified.length ? Math.min.apply(null, classified.map(function (other) { return other.total; })) : null;
        var classBest = sameClass.length ? Math.min.apply(null, sameClass.map(function (other) { return other.total; })) : null;
        if (!isClassified) metric.push(null);
        else if (metricId === 'pos') metric.push(row.entry.pos == null ? null : +row.entry.pos);
        else if (metricId === 'cpos') metric.push(row.entry.classPos == null ? null : +row.entry.classPos);
        else if (metricId === 'gap') metric.push(finalValue == null || isNaN(finalValue) || finalBest == null ? null : r1(finalValue - finalBest));
        else if (metricId === 'cgap') metric.push(finalValue == null || isNaN(finalValue) || classBest == null ? null : r1(finalValue - classBest));
      }
      var aligned = nrStages.map(function () { return null; });
      stages.forEach(function (stage, i) {
        if (!stage.nrStage) return;
        var target = nrStages.indexOf(stage.nrStage);
        if (target >= 0) aligned[target] = metric[i];
      });
      if (final) aligned.push(metric[metric.length - 1]);
      return {
        key: 'RS:' + result.id + ':' + row.entry.car,
        label: 'RS #' + row.entry.car + ' ' + row.entry.driver + ' · ' + row.entry['class'],
        color: null, dash: true, values: aligned,
        end: row.entry.status === 'classified' ? null : row.entry.status,
        entry: row.entry
      };
    });
    return valuesByEntry;
  }
  function copyReviewedRallyeSportTimes(result, nrRound, people) {
    if (!result || !result.nrRoundId || !nrRound || result.nrRoundId !== nrRound.id) throw new Error('The RS result must be explicitly linked to this NR round.');
    var idx = peopleIndex(people), stages = result.stages || [], nrStages = nrRound.stages || [];
    if (!stages.some(function (stage) { return stage.nrStage; })) throw new Error('Map at least one RS stage to its exact NR stage before copying times.');
    var entries = (result.entries || []).map(function (entry) {
      if (!Array.isArray(entry.times) || entry.times.length !== stages.length ||
        entry.timeEvidence && (!Array.isArray(entry.timeEvidence) || entry.timeEvidence.length !== stages.length)) {
        throw new Error('RS stage times and provenance must align with the explicit RS stage list before copying.');
      }
      var driver = idx.resolve(entry.driver), codriver = idx.resolve(entry.codriver);
      if (!driver.known || entry.codriver && !codriver.known) throw new Error('Resolve the RS driver and co-driver profiles before copying shared times.');
      var matches = (nrRound.entries || []).filter(function (candidate) {
        var nrDriver = idx.resolve(candidate.driver), nrCodriver = idx.resolve(candidate.codriver);
        return String(candidate.car) === String(entry.car) && nrDriver.known && nrDriver.id === driver.id &&
          (entry.codriver ? nrCodriver.known && nrCodriver.id === codriver.id : !candidate.codriver);
      });
      if (matches.length !== 1) throw new Error('RS car ' + entry.car + ' does not have exactly one NR row with the same car and reviewed crew identities.');
      var source = matches[0], times = (entry.times || []).slice(), evidence = (entry.timeEvidence || []).slice();
      if (source.status === 'DNS') throw new Error('NR car ' + entry.car + ' is marked DNS; no NR observation is copied.');
      stages.forEach(function (stage, i) {
        if (!stage.nrStage) return;
        var sourceIndex = nrStages.indexOf(stage.nrStage);
        if (sourceIndex < 0 || !source.times || source.times[sourceIndex] == null || source.times[sourceIndex] === '') {
          throw new Error('NR car ' + entry.car + ' has no recorded time for mapped stage ' + stage.nrStage + '. Nothing was copied.');
        }
        times[i] = source.times[sourceIndex];
        evidence[i] = { kind: 'reviewed-nr-copy', nrRoundId: result.nrRoundId, nrCar: String(source.car), nrStage: stage.nrStage, value: times[i] };
      });
      return Object.assign({}, entry, { times: times, timeEvidence: evidence });
    });
    return Object.assign({}, result, { entries: entries });
  }
  function validateRallyeSport(data, season, rounds, people) {
    if (data === undefined) return [];
    var issues = [], knownEvents = Object.create(null), knownResults = Object.create(null), resultEvents = Object.create(null), nrEvents = Object.create(null), nrRounds = Object.create(null);
    function error(message) { issues.push({ level: 'error', msg: 'RallyeSport: ' + message }); }
    function object(value, label, keys) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) { error(label + ' must be an object.'); return false; }
      Object.keys(value).forEach(function (key) { if (keys.indexOf(key) < 0) error(label + ' has an unsupported field "' + key + '".'); });
      return true;
    }
    function text(value, label, required, max) {
      if (typeof value !== 'string' || value.length > (max || 200) || /[\u0000-\u001f\u007f]/.test(value) || required && !value.trim()) error(label + (required ? ' is required.' : ' must be text.'));
    }
    function id(value, label) {
      if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) || /^(?:__proto__|prototype|constructor)$/.test(value)) error(label + ' has an invalid ID.');
    }
    function time(value, label, required) {
      if ((value == null || value === '') && !required) return;
      if (typeof value !== 'string' || value.length > 32 || parseTime(value) == null || isNaN(parseTime(value))) error(label + ' must be a printed rally time or empty.');
    }
    if (!object(data, 'data', ['ruleset', 'events', 'results', 'nonScoringPeople'])) return issues;
    if (!Array.isArray(data.events) || !Array.isArray(data.results)) { error('events and results must be lists.'); return issues; }
    if (data.nonScoringPeople != null) {
      if (!Array.isArray(data.nonScoringPeople)) error('nonScoringPeople must be a list of stable person IDs.');
      else {
        var nonScoring = Object.create(null), peopleById = Object.create(null);
        ((people && people.people) || []).forEach(function (person) { peopleById[person.id] = true; });
        data.nonScoringPeople.forEach(function (personId) {
          id(personId, 'non-scoring member');
          if (nonScoring[personId]) error('nonScoringPeople contains duplicate ID ' + personId + '.');
          if (!peopleById[personId]) error('nonScoringPeople refers to an unknown profile ' + personId + '.');
          nonScoring[personId] = true;
        });
      }
    }
    if (data.ruleset !== undefined) {
      if (object(data.ruleset, 'ruleset', ['code', 'year', 'title', 'version', 'issueDate', 'sourceUrl'])) {
        if (data.ruleset.code !== 'clubman-sprint-2026-v1' || data.ruleset.year !== 2026 || data.ruleset.title !== '2026 MSA RallyeSport Association Club Standing Supplementary Regulations — Rallysprint' ||
          data.ruleset.version !== 1 || data.ruleset.issueDate !== '2026-07-09') error('only the explicitly reviewed 2026 Clubman’s Sprint SSR V1 profile is supported by this foundation.');
        text(data.ruleset.sourceUrl, 'ruleset source URL', true, 2000);
        try {
          var rulesUrl = new URL(data.ruleset.sourceUrl);
          if (rulesUrl.protocol !== 'https:' || rulesUrl.username || rulesUrl.password) error('ruleset source URL must be HTTPS without credentials.');
        } catch (e) { error('ruleset source URL is invalid.'); }
      }
    }
    (season.events || []).forEach(function (event) { nrEvents[event.id] = true; });
    (season.rounds || []).forEach(function (round) { nrRounds[round.id] = round; });
    data.events.forEach(function (event, i) {
      var label = 'event ' + (i + 1);
      if (!object(event, label, ['id', 'name', 'dates', 'startDate', 'nrEventId', 'rulesetConfirmed', 'rulesetEvidence', 'countsForChampionship', 'championshipEvidence', 'doublePoints', 'doublePointsEvidence', 'doublePointsBulletinDate'])) return;
      id(event.id, label); text(event.name, label + ' name', true, 200); text(event.dates == null ? '' : event.dates, label + ' dates', false);
      if (event.startDate != null && dateOrdinal(event.startDate) == null) error(label + ' startDate must be a real ISO calendar date.');
      if (knownEvents[event.id]) error(label + ' duplicates event ID ' + event.id + '.');
      knownEvents[event.id] = true;
      if (event.nrEventId != null && event.nrEventId !== '') {
        if (!nrEvents[event.nrEventId]) error(label + ' links to an unknown NR event.');
      }
      if (event.rulesetConfirmed != null && typeof event.rulesetConfirmed !== 'boolean') error(label + ' SSR applicability must be true, false or unset.');
      text(event.rulesetEvidence == null ? '' : event.rulesetEvidence, label + ' SSR applicability evidence', false, 1000);
      if (event.rulesetConfirmed === true && !event.rulesetEvidence) error(label + ' SSR applicability confirmation needs its event-specific evidence.');
      if (event.countsForChampionship != null && typeof event.countsForChampionship !== 'boolean') error(label + ' championship status must be true, false or unset.');
      text(event.championshipEvidence == null ? '' : event.championshipEvidence, label + ' championship evidence', false, 1000);
      if (event.countsForChampionship === true && !event.championshipEvidence) error(label + ' needs explicit evidence that it is a championship event.');
      if (event.doublePoints != null && typeof event.doublePoints !== 'boolean') error(label + ' double-points status must be true, false or unset.');
      text(event.doublePointsEvidence == null ? '' : event.doublePointsEvidence, label + ' double-points evidence', false, 1000);
      if (event.doublePoints === true && !event.doublePointsEvidence) error(label + ' double points require the official bulletin evidence.');
      if (event.doublePointsBulletinDate != null && dateOrdinal(event.doublePointsBulletinDate) == null) error(label + ' doublePointsBulletinDate must be a real ISO calendar date.');
      if (event.doublePoints === true && (dateOrdinal(event.startDate) == null || dateOrdinal(event.doublePointsBulletinDate) == null)) error(label + ' double points need event start and bulletin issue dates to verify the 14-day notice.');
      else if (event.doublePoints === true && dateOrdinal(event.startDate) - dateOrdinal(event.doublePointsBulletinDate) < 14) error(label + ' double-points bulletin must be issued at least 14 days before the event.');
    });
    (data.results || []).forEach(function (result, i) {
      var label = 'result ' + (i + 1);
      if (!object(result, label, ['id', 'eventId', 'title', 'status', 'nrRoundId', 'stages', 'source', 'notes', 'entries'])) return;
      id(result.id, label); id(result.eventId, label + ' eventId');
      if (knownResults[result.id]) error(label + ' duplicates result ID ' + result.id + '.');
      knownResults[result.id] = true;
      if (resultEvents[result.eventId]) error(label + ' duplicates the event classification; keep one complete official source per RS event.');
      resultEvents[result.eventId] = true;
      var event = data.events.filter(function (item) { return item.id === result.eventId; })[0];
      if (!event) error(label + ' refers to an unknown RallyeSport event.');
      text(result.title, label + ' title', true);
      text(result.status, label + ' printed status', true);
      if (result.nrRoundId != null && result.nrRoundId !== '') {
        if (!nrRounds[result.nrRoundId]) error(label + ' links to an unknown NR round.');
        else if (event && event.nrEventId && event.nrEventId !== nrRounds[result.nrRoundId].eventId) error(label + ' NR round does not belong to its explicitly linked NR event.');
      }
      if (!object(result.source, label + ' source', ['file', 'url'])) return;
      text(result.source.file == null ? '' : result.source.file, label + ' source file', false);
      text(result.source.url, label + ' source URL', true, 2000);
      try {
        var sourceUrl = new URL(result.source.url);
        if (sourceUrl.protocol !== 'https:' || sourceUrl.username || sourceUrl.password) error(label + ' source URL must be HTTPS without credentials.');
      } catch (e) { error(label + ' source URL is invalid.'); }
      if (!Array.isArray(result.notes) || result.notes.some(function (note) { return typeof note !== 'string' || note.length > 1000; })) error(label + ' notes must be a list of text.');
      if (!Array.isArray(result.stages) || !result.stages.length) { error(label + ' needs its explicit stage list.'); return; }
        var stageIds = Object.create(null), mappedStages = Object.create(null);
      result.stages.forEach(function (stage, k) {
        var stageLabel = label + ' stage ' + (k + 1);
        if (!object(stage, stageLabel, ['id', 'label', 'nrStage'])) return;
        id(stage.id, stageLabel); text(stage.label, stageLabel + ' label', true, 40);
        if (stageIds[stage.id]) error(stageLabel + ' duplicates stage ID ' + stage.id + '.');
        stageIds[stage.id] = true;
        if (stage.nrStage != null && stage.nrStage !== '') {
          text(stage.nrStage, stageLabel + ' NR stage', true, 40);
          if (!result.nrRoundId) error(stageLabel + ' maps to an NR stage without an explicit NR round link.');
          if (mappedStages[stage.nrStage]) error(label + ' maps more than one RS stage to NR stage ' + stage.nrStage + '.');
          mappedStages[stage.nrStage] = true;
          var nrRaw = rounds && rounds[result.nrRoundId];
          if (nrRaw && (nrRaw.stages || []).indexOf(stage.nrStage) < 0) error(stageLabel + ' maps to a stage not present in the linked NR classification.');
        }
      });
      if (!Array.isArray(result.entries)) { error(label + ' entries must be a list.'); return; }
      var cars = Object.create(null), idx = peopleIndex(people);
      result.entries.forEach(function (entry, n) {
        var row = label + ' row ' + (n + 1);
        if (!object(entry, row, ['car', 'driver', 'codriver', 'class', 'status', 'pos', 'classPos', 'times', 'stagePos', 'penalty', 'total', 'timeEvidence', 'notes', 'invited'])) return;
        text(entry.car, row + ' car', true, 40);
        if (cars[entry.car]) error(row + ' duplicates car ' + entry.car + '.');
        cars[entry.car] = true;
        text(entry.driver, row + ' driver', true); text(entry.codriver == null ? '' : entry.codriver, row + ' co-driver', false);
        var driver = idx.resolve(entry.driver), codriver = idx.resolve(entry.codriver);
        if (driver.id && codriver.id && driver.id === codriver.id) error(row + ' assigns the same person to both crew seats.');
        if (['RS2', 'RS4'].indexOf(normClass(entry['class'])) < 0) error(row + ' has an unconfigured RS category. Hold publication until RallyeSport confirms the category and its semantics; do not omit the row.');
        text(entry.status, row + ' printed status', true, 80);
        if (['classified', 'DNF', 'DNS', 'TEST'].indexOf(entry.status) < 0) error(row + ' status must be classified, DNF, DNS or TEST; preserve unsupported source statuses only after adding explicit support.');
        if (entry.status === 'classified') {
          if (!Number.isInteger(entry.pos) || entry.pos < 1) error(row + ' needs its official positive classification position.');
          if (entry.total == null || entry.total === '') error(row + ' needs its official classification total.');
        } else if (entry.pos != null && (!Number.isInteger(entry.pos) || entry.pos < 1)) error(row + ' position must be a positive integer or empty.');
        if (entry.classPos != null && (!Number.isInteger(entry.classPos) || entry.classPos < 1)) error(row + ' official class position must be a positive integer or empty.');
        time(entry.total, row + ' total', entry.status === 'classified'); time(entry.penalty, row + ' penalty', false);
        if (!Array.isArray(entry.times) || entry.times.length !== result.stages.length) error(row + ' needs one stage-time value (or null) for every listed RS stage.');
        else entry.times.forEach(function (value, k) { time(value, row + ' ' + result.stages[k].label, false); });
        if (entry.stagePos != null && (!Array.isArray(entry.stagePos) || entry.stagePos.length !== result.stages.length ||
          entry.stagePos.some(function (value) { return value != null && (!Number.isInteger(value) || value < 1); }))) error(row + ' stage positions must be positive printed positions or null, one per stage.');
        if (entry.notes != null && (!Array.isArray(entry.notes) || entry.notes.some(function (note) { return typeof note !== 'string' || note.length > 1000; }))) error(row + ' notes must be a list of text.');
        if (entry.invited != null && typeof entry.invited !== 'boolean') error(row + ' invitation status must be true, false or unset.');
        if (entry.timeEvidence != null) {
          if (!Array.isArray(entry.timeEvidence) || entry.timeEvidence.length !== result.stages.length) error(row + ' time evidence must align with its stage list.');
          else entry.timeEvidence.forEach(function (evidence, k) {
            if (evidence == null) return;
            if (!object(evidence, row + ' time evidence ' + (k + 1), ['kind', 'nrRoundId', 'nrCar', 'nrStage', 'value'])) return;
            if (evidence.kind !== 'reviewed-nr-copy' || !evidence.nrRoundId || !evidence.nrCar || !evidence.nrStage ||
              typeof evidence.value !== 'string' || evidence.value !== entry.times[k] || evidence.nrRoundId !== result.nrRoundId ||
              evidence.nrStage !== result.stages[k].nrStage) error(row + ' has inconsistent reviewed-copy provenance; its copied time must remain an independent snapshot.');
          });
        }
      });
    });
    return issues;
  }

  /* ---------------------------------------------------------------- validation */
  function entryEvidenceLoss(before, after, beforePeople, afterPeople) {
    var oldIndex = peopleIndex(beforePeople), newIndex = peopleIndex(afterPeople);
    function identity(idx, name) {
      var p = idx.resolve(name);
      return p.known ? ['profile', p.id] : ['unresolved', keyName(name)];
    }
    function rowKey(e, idx) {
      return JSON.stringify([identity(idx, e.driver), identity(idx, e.codriver), e.car, e['class'],
        e.vehicle, e.status, e.statusEvidence, e.participationEvidence, e.locator]);
    }
    function retains(ids, nextIds) {
      return (ids || []).every(function (id) { return (nextIds || []).indexOf(id) >= 0; });
    }
    return ((before && before.entryLists) || []).some(function (l) {
      var next = ((after && after.entryLists) || []).filter(function (x) { return x.eventId === l.eventId; })[0];
      if (!next || l.complete && !next.complete || !retains(l.roundIds, next.roundIds)) return true;
      if (['file', 'url', 'date', 'locator'].some(function (k) { return (l.source || {})[k] !== (next.source || {})[k]; })) return true;
      return (l.entries || []).some(function (e) {
        var key = rowKey(e, oldIndex), matches = (next.entries || []).filter(function (x) { return rowKey(x, newIndex) === key; });
        return !matches.length || !retains(e.roundIds, matches.reduce(function (ids, x) { return ids.concat(x.roundIds || []); }, []));
      });
    });
  }
  function entryCrewRecorded(e, r, status) {
    var crew = [e.driverId, e.codriverId].filter(Boolean).sort().join('/');
    function same(d, c) { return [d, c].filter(Boolean).sort().join('/') === crew; }
    return r.entries.some(function (x) { return (status ? x.status === status : x.status !== 'DNS') &&
      (same(x.driverId, x.codriverId) || same(x.champDriverId, x.noCreditCodriver ? '' : x.champCodriverId)); }) ||
      !status && r.extraStarts.some(function (x) { return same(x.driverId, x.codriverId); });
  }
  function validateEntryLists(season, peopleDoc) {
    var errors = [], lists = season.entryLists, idx = peopleIndex(peopleDoc),
      events = Object.create(null), rounds = Object.create(null), seen = Object.create(null);
    if (lists === undefined) return errors;
    function error(msg) { errors.push({ level: 'error', msg: 'Entry evidence: ' + msg }); }
    function fields(value, allowed, label) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) { error(label + ': expected object.'); return false; }
      Object.keys(value).forEach(function (k) { if (allowed.indexOf(k) < 0) error(label + ': unknown field ' + k); });
      return true;
    }
    function text(value, label, required) {
      if (typeof value !== 'string' || value.length > 16000 || required && !value.trim()) error(label + ': invalid text.');
    }
    function scope(ids, eventId, label) {
      if (!Array.isArray(ids) || ids.length > 10000) { error(label + ': expected round IDs.'); return; }
      if (new Set(ids).size !== ids.length) error(label + ': duplicate round scope.');
      ids.forEach(function (id) { if (!rounds[id] || rounds[id] !== eventId) error(label + ': round outside event: ' + id); });
    }
    (season.events || []).forEach(function (e) { events[e.id] = true; });
    (season.rounds || []).forEach(function (r) { rounds[r.id] = r.eventId; });
    if (!Array.isArray(lists) || lists.length > 10000) { error('expected an array of lists.'); return errors; }
    lists.forEach(function (l) {
      if (!fields(l, ['eventId', 'roundIds', 'complete', 'source', 'entries'], 'list')) return;
      if (!events[l.eventId] || seen[l.eventId]) error('unknown/duplicate event ' + l.eventId);
      seen[l.eventId] = true;
      if (typeof l.complete !== 'boolean') error('complete must be explicit.');
      scope(l.roundIds, l.eventId, 'coverage');
      if (fields(l.source, ['file', 'url', 'date', 'locator'], 'source')) {
        ['file', 'url', 'date', 'locator'].forEach(function (k) { text(l.source[k], 'source.' + k, true); });
        try {
          var u = new URL(l.source.url);
          if (!/^https?:$/.test(u.protocol) || u.username || u.password) error('source requires a public http(s) URL.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(l.source.date) || new Date(l.source.date + 'T12:00:00Z').toISOString().slice(0, 10) !== l.source.date) error('invalid source date.');
        } catch (e) { error('invalid source URL/date.'); }
      }
      if (!Array.isArray(l.entries) || l.entries.length > 10000) { error('expected crew rows.'); return; }
      var keys = Object.create(null), members = Object.create(null);
      l.entries.forEach(function (e) {
        if (!fields(e, ['car', 'driver', 'codriver', 'class', 'vehicle', 'roundIds', 'status', 'statusEvidence', 'participationEvidence', 'locator'], 'crew')) return;
        ['car', 'driver', 'codriver', 'class', 'vehicle', 'statusEvidence', 'participationEvidence', 'locator'].forEach(function (k) {
          text(e[k], 'crew.' + k, ['driver', 'class', 'participationEvidence', 'locator'].indexOf(k) >= 0);
        });
        if (!/^\d{1,8}$/.test(e.car)) error('numeric car required.');
        if (!/^(entered|DNS|withdrawn)$/.test(e.status)) error('status must be entered, DNS or withdrawn.');
        if (e.status !== 'entered' && !e.statusEvidence) error('DNS/withdrawal requires explicit official status evidence.');
        scope(e.roundIds, l.eventId, 'crew scope');
        if (!Array.isArray(e.roundIds)) return;
        if (e.roundIds.some(function (id) { return !Array.isArray(l.roundIds) || l.roundIds.indexOf(id) < 0; })) error('crew scope is outside source coverage.');
        var d = idx.resolve(e.driver), c = idx.resolve(e.codriver), key = d.id + '/' + c.id;
        if (!d.known || c.id && !c.known) error('crew names must resolve to stable profiles before publication.');
        if (d.id === c.id) error('same person occupies both crew seats.');
        var scopes = e.roundIds.length ? e.roundIds : ['event-only'];
        scopes.forEach(function (id) {
          var k = id + '/' + key;
          if (keys[k]) error('duplicate resolved crew in ' + id);
          keys[k] = true;
          [d.id, c.id].filter(Boolean).forEach(function (person) {
            var m = id + '/' + person;
            if (members[m]) error('duplicate resolved person in ' + id);
            members[m] = true;
          });
        });
      });
    });
    return errors;
  }
  function validateRound(raw, opts) {
    opts = opts || {};
    var issues = [], S = raw.stages || [];
    function add(level, msg, row) { issues.push({ level: level, msg: msg, row: row }); }
    if (!S.length) add('error', 'No stages listed for this round.');
    var cars = {}, positions = {};
    (raw.entries || []).forEach(function (r, i) {
      var label = 'Row ' + (i + 1) + (r.car ? ' (car ' + r.car + ')' : '');
      if (!r.car) add('error', label + ': car number is missing.', i);
      else if (cars[r.car]) add('error', label + ': car ' + r.car + ' appears twice.', i);
      cars[r.car] = 1;
      if (!normName(r.driver)) add('error', label + ': driver name is missing.', i);
      if (!normName(r.codriver)) add('warn', label + ': co-driver name is missing.', i);
      if (!normClass(r['class'])) add('error', label + ': class is missing.', i);
      var st = r.status || 'classified';
      var times = (r.times || []).map(parseTime);
      times.forEach(function (t, k) { if (t != null && isNaN(t)) add('error', label + ': ' + (S[k] || 'stage ' + (k + 1)) + ' time "' + r.times[k] + '" is not a time (use m:ss.s).', i); });
      if (r.pen != null && r.pen !== '' && isNaN(parseTime(r.pen))) add('error', label + ': penalty "' + r.pen + '" is not a time.', i);
      if (st === 'classified') {
        if (!r.pos) add('error', label + ': classified but has no position.', i);
        else if (!Number.isInteger(r.pos) || r.pos < 1) add('error', label + ': classified position must be a positive integer.', i);
        else if (positions[r.pos]) add('error', label + ': position ' + r.pos + ' is used twice.', i);
        positions[r.pos] = 1;
        var tot = parseTime(r.total);
        if (tot == null || isNaN(tot)) add('error', label + ': classified but the total is missing or not a time.', i);
        else if (!r.skipSumCheck) {
          var missing = times.slice(0, S.length).some(function (t) { return t == null || isNaN(t); });
          if (missing || times.length < S.length) add('warn', label + ': some stage times are empty, so the total can\'t be checked.', i);
          else {
            var sum = r1(times.slice(0, S.length).reduce(function (a, b) { return a + b; }, 0) + (parseTime(r.pen) || 0));
            if (Math.abs(sum - tot) > 0.05) add('error', label + ': stage times + penalty = ' + fmtTime(sum, true) + ', but the total says ' + fmtTime(tot, true) + '. Check the times (or tick "matches the sheet" if the sheet itself differs).', i);
          }
        }
      } else if (st !== 'DNF' && st !== 'DNS') add('error', label + ': status must be classified, DNF or DNS.', i);
      var n = times.filter(function (t) { return t != null && !isNaN(t); }).length;
      if (r.stages != null && r.stages !== '' && +r.stages !== n) add('warn', label + ': "stages completed" is ' + r.stages + ' but ' + n + ' stage times are filled in.', i);
    });
    var cl = (raw.entries || []).filter(function (r) { return (r.status || 'classified') === 'classified'; }).sort(function (a, b) { return a.pos - b.pos; });
    for (var i = 1; i < cl.length; i++) {
      var a = parseTime(cl[i - 1].total), b = parseTime(cl[i].total);
      if (a != null && b != null && !isNaN(a) && !isNaN(b) && b < a - 0.05) add('warn', 'Position ' + cl[i].pos + ' (car ' + cl[i].car + ') has a faster total than position ' + cl[i - 1].pos + '.');
      if (+cl[i].pos !== +cl[i - 1].pos + 1) add('warn', 'Positions jump from ' + cl[i - 1].pos + ' to ' + cl[i].pos + '.');
    }
    if (cl.length && +cl[0].pos !== 1) add('warn', 'The first classified position is ' + cl[0].pos + ', not 1.');
    if (opts.people) {
      var pidx = peopleIndex(opts.people), unknown = {};
      (raw.entries || []).forEach(function (r) {
        [r.driver, r.codriver, r.credit && r.credit.driver, r.credit && r.credit.codriver].forEach(function (nm) {
          if (!normName(nm)) return; var p = pidx.resolve(nm); if (!p.known) unknown[p.name] = 1;
        });
      });
      Object.keys(unknown).forEach(function (n) {
        var like = similarNames(n, opts.people);
        if (like.length) add('warn', 'New name "' + n + '" looks like existing competitor ' + like.map(function (x) { return '"' + x + '"'; }).join(' or ') +
          '. If it\'s the same person, add "' + n + '" under Competitors → ' + like[0] + ' → Also printed as before publishing; otherwise a second profile will be created.');
        else add('info', 'New competitor: ' + n + ' (will be added to the competitor list when you publish).');
      });
    }
    return issues;
  }

  function validateSeason(season, rounds, people) {
    var issues = [];
    function error(msg) { issues.push({ level: 'error', msg: msg }); }
    if (!season || typeof season !== 'object') return [{ level: 'error', msg: 'Season is missing.' }];
    if (!Number.isInteger(season.year) || season.year < 1990 || season.year > 2100) error('Season year must be an integer from 1990 to 2100.');
    if (!Number.isInteger(season.minStarts) || season.minStarts < 0) error('Minimum starts must be a non-negative integer.');
    ['overall', 'cls'].forEach(function (k) {
      var scale = season.pointsScale && season.pointsScale[k];
      if (!Array.isArray(scale) || scale.some(function (n) { return typeof n !== 'number' || !Number.isFinite(n) || n < 0; })) error(k + ' points must be a list of finite, non-negative numbers.');
    });
    function ids(arr, kind) {
      var seen = Object.create(null);
      if (!Array.isArray(arr)) { error(kind + ' must be a list.'); return seen; }
      arr.forEach(function (x) {
        if (!x || typeof x.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(x.id) || /^(?:__proto__|prototype|constructor)$/.test(x.id)) { error('Invalid ' + kind + ' id.'); return; }
        if (seen[x.id]) error('Duplicate ' + kind + ' id: ' + x.id);
        seen[x.id] = true;
      });
      return seen;
    }
    var classes = ids(season.classes, 'class'), events = ids(season.events, 'event');
    ids(season.rounds, 'round');
    (season.rounds || []).forEach(function (meta) {
      if (!meta) return;
      if (!events[meta.eventId]) error(meta.id + ': unknown event ' + meta.eventId);
      var raw = rounds && rounds[meta.id];
      if (meta.results && !raw) error(meta.id + ': marked as having results but results are missing.');
      if (!raw) return;
      if (raw.id !== meta.id) error(meta.id + ': result id does not match calendar.');
      var idx = peopleIndex(people), map = (season.classMap && season.classMap.drivers) || {};
      (raw.entries || []).forEach(function (entry) {
        var credited = idx.resolve((entry.credit && entry.credit.driver) || entry.driver);
        var cls = normClass(entry.scoredClass || map[credited.id] || entry['class']);
        if (!classes[cls]) error(meta.id + ' car ' + entry.car + ': unknown scored class ' + cls);
      });
      (raw.extraStarts || []).forEach(function (x) { if (!classes[normClass(x['class'])]) error(meta.id + ': unknown extra-start class ' + x['class']); });
    });
    ['drivers', 'codrivers'].forEach(function (role) {
      var map = (season.classMap && season.classMap[role]) || {}, idx = peopleIndex(people);
      Object.keys(map).forEach(function (id) {
        if (!idx.byId[id]) error(role + ' class map refers to unknown competitor ' + id);
        if (!classes[map[id]]) error(role + ' class map refers to unknown class ' + map[id]);
      });
    });
    return issues.concat(validateEntryLists(season, people), validateRallyeSport(season.rallyesport, season, rounds, people));
  }
  function nrcDestination(value) {
    if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return '';
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && /^(www\.)?nrcsa\.co\.za$/.test(url.hostname) &&
        !url.username && !url.password && !url.port ? url.href : '';
    } catch (e) { return ''; }
  }
  function validateActiveRally(notice) {
    if (notice === undefined) return [];
    if (!notice || typeof notice !== 'object' || Array.isArray(notice)) return ['Active rally must be a settings object.'];
    var errors = [];
    Object.keys(notice).forEach(function (k) {
      if (['enabled', 'name', 'url', 'activationId'].indexOf(k) < 0) errors.push('Active rally has an unknown field: ' + k + '.');
    });
    if (typeof notice.enabled !== 'boolean') errors.push('Active rally enabled must be true or false.');
    if (typeof notice.name !== 'string' || notice.name.length > 120 || /[\u0000-\u001f\u007f]/.test(notice.name) ||
      (notice.enabled && !notice.name.trim())) errors.push('Active rally needs a name of at most 120 characters.');
    if (typeof notice.url !== 'string' || !nrcDestination(notice.url)) errors.push('Active rally destination must be an HTTPS address on nrcsa.co.za or www.nrcsa.co.za, without credentials or a custom port.');
    if (typeof notice.activationId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(notice.activationId)) errors.push('Active rally needs a valid activation ID.');
    return errors;
  }

  function validateAnalytics(settings) {
    if (settings === undefined) return [];
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return ['Analytics must be a settings object.'];
    var errors = [];
    if (Object.keys(settings).some(function (k) { return ['enabled', 'measurementId'].indexOf(k) < 0; })) errors.push('Analytics has an unknown field.');
    if (typeof settings.enabled !== 'boolean') errors.push('Analytics enabled must be true or false.');
    if (typeof settings.measurementId !== 'string' ||
      !(settings.measurementId === '' && !settings.enabled || settings.measurementId.length === 12 && /^G-[A-Z0-9]{10}$/.test(settings.measurementId))) {
      errors.push('Analytics needs a GA4 Measurement ID: G- followed by exactly 10 uppercase letters or digits (or empty when disabled).');
    }
    return errors;
  }

  function validateDataset(docs) {
    var out = [], st = docs && docs['data/site.json'], ppl = docs && docs['data/people.json'];
    function add(path, msg) { out.push({ level: 'error', path: path, msg: msg }); }
    if (!st || !Array.isArray(st.seasons) || !st.seasons.length) { add('data/site.json', 'At least one season is required.'); return out; }
    validateActiveRally(st.activeRally).forEach(function (msg) { add('data/site.json', msg); });
    validateAnalytics(st.analytics).forEach(function (msg) { add('data/site.json', msg); });
    if (!ppl || !Array.isArray(ppl.people)) { add('data/people.json', 'Competitor list is missing.'); return out; }
    var peopleIds = Object.create(null), keys = Object.create(null);
    ppl.people.forEach(function (p) {
      if (!p.id || !p.name || peopleIds[p.id]) add('data/people.json', 'Missing or duplicate competitor id/name: ' + (p.id || ''));
      peopleIds[p.id] = true;
      [p.name].concat(p.aliases || []).forEach(function (n) {
        var k = keyName(n);
        if (keys[k] && keys[k] !== p.id) add('data/people.json', 'Ambiguous name or alias: ' + n);
        keys[k] = p.id;
      });
    });
    var years = Object.create(null);
    st.seasons.forEach(function (meta) {
      var y = meta.year, path = 'data/seasons/' + y + '/season.json', se = docs[path], rounds = {};
      if (years[y]) add('data/site.json', 'Duplicate season ' + y);
      years[y] = true;
      if (!se) { add(path, 'Season is missing.'); return; }
      if (se.year !== y) add(path, 'Year does not match site calendar.');
      (se.rounds || []).forEach(function (r) {
        var rp = 'data/seasons/' + y + '/rounds/' + r.id + '.json', raw = docs[rp];
        if (raw) {
          rounds[r.id] = raw;
          if (!r.results) out.push({ level: 'warn', path: rp, msg: 'Results exist but are not enabled in the calendar.' });
          try { validateRound(raw, {}).forEach(function (i) { out.push({ level: i.level, path: rp, msg: i.msg }); }); }
          catch (e) { add(rp, 'Invalid result structure: ' + e.message); }
        }
      });
      try { validateSeason(se, rounds, ppl).forEach(function (i) { out.push({ level: i.level, path: path, msg: i.msg }); }); }
      catch (e) { add(path, 'Invalid season structure: ' + e.message); }
    });
    if (!years[st.currentSeason]) add('data/site.json', 'Default season is not listed.');
    return out;
  }

  /* ---------------------------------------------------------------- import: text copied from an official PDF */
  var TIME_RE = /^\d{1,2}:\d{2}\.\d$/, HTIME_RE = /^\d+:\d{2}:\d{2}\.\d$/, INT_RE = /^\d{1,3}$/;
  var UNKNOWN_LAYOUT = 'This text doesn\'t match the official results layouts this importer knows (the nrcsa.co.za results system and RallyScoring, as used in 2026). ' +
    'Nothing was imported. Use the spreadsheet template instead, or type the results into the table. A developer can add the new layout (see docs/data-entry-guide.md).';
  var PARTICLES = { de: 1, du: 1, van: 1, von: 1, der: 1, le: 1, la: 1, janse: 1, jansen: 1, du_: 1, den: 1, ter: 1 };
  function parseClassificationText(text, opts) {
    opts = opts || {};
    var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    var res = { title: '', status: '', stages: [], entries: [], warnings: [], format: '' };
    var headIdx = -1;
    for (var i = 0; i < lines.length; i++) if (/\bPEN\b/.test(lines[i]) && /\bTOTAL\b/i.test(lines[i]) || /^Pos\b/.test(lines[i])) { headIdx = i; break; }
    if (headIdx < 0) { res.error = UNKNOWN_LAYOUT; return res; }
    var top = lines.slice(0, headIdx);
    res.title = top[0] || '';
    var st = top.filter(function (l) { return /classification/i.test(l); })[0] || '';
    res.status = st; if (top[2] && !/classification/i.test(top[2])) res.title = res.title + ' — ' + top[2];
    // stage names from the header block (until the first result row)
    var bodyStart = headIdx;
    var header = '';
    for (var j = headIdx; j < lines.length; j++) { if (/^(\d{1,3}|DNF|DNS|DSQ|NC)\s+\d{1,4}\s/.test(lines[j])) { bodyStart = j; break; } header += ' ' + lines[j]; }
    var ss = header.match(/SS\s?\d+/g) || [];
    var seen = {}; ss.forEach(function (x) { var n = x.replace(/\s/g, ''); if (!seen[n]) { seen[n] = 1; res.stages.push(n); } });
    var body = lines.slice(bodyStart);
    var stop = body.findIndex(function (l) { return /^(NHY|Results are|Original|Originals|NOTES|Missed stage|Generated|© )/i.test(l); });
    if (stop >= 0) body = body.slice(0, stop);
    var tokens = body.join(' \n ').split(' ').filter(Boolean);
    var known = opts.people ? peopleIndex(opts.people) : null;
    // split into car blocks: [pos|DNF] [car] …
    var blocks = [], cur = null, partial = [];
    for (var t = 0; t < tokens.length; t++) {
      var tk = tokens[t];
      var startsRow = (INT_RE.test(tk) || /^(DNF|DNS|DSQ|NC)$/.test(tk)) && tokens[t + 1] && /^\d{1,4}$/.test(tokens[t + 1]) && tokens[t - 1] === '\n' &&
        (tokens[t + 2] && /[A-Za-z]/.test(tokens[t + 2]));
      if (t === 0 && (INT_RE.test(tk) || /^(DNF|DNS)$/.test(tk))) startsRow = true;
      if (startsRow) { cur = []; blocks.push(cur); }
      if (cur && tk !== '\n') cur.push(tk);
    }
    // Only the two official layouts used in 2026 are accepted; anything else is refused rather than guessed.
    var crewHead = /DRIVER\s*\/\s*CO-DRIVER/i.test(header);
    var rallyScoring = crewHead && /\bENTRANT\b/.test(header) && /\bCompl\b/.test(header);
    var resultsSystem = crewHead && /\bStg\b/.test(header) && /\bPEN\b/.test(header) && /\bTOTAL\b/.test(header) && /Diff 1st/i.test(header);
    if (!rallyScoring && !resultsSystem) { res.error = UNKNOWN_LAYOUT; return res; }
    res.format = rallyScoring ? 'RallyScoring' : 'Results system';
    blocks.forEach(function (b) {
      var e = parseBlock(b);
      if (e) res.entries.push(e);
    });
    function cleanClass(toks, i) { // returns [class, nextIndex]
      if (/^NR\d$/i.test(toks[i])) return [toks[i].toUpperCase(), i + 1];
      if (/^NR$/i.test(toks[i]) && /^\d$/.test(toks[i + 1])) return ['NR' + toks[i + 1], i + 2];
      return [null, i];
    }
    function splitEntrantDriver(names) {
      // RallyScoring rows print ENTRANT then DRIVER before the slash. Prefer a known competitor name at the end.
      if (known) for (var k = Math.min(5, names.length); k >= 2; k--) { var cand = names.slice(names.length - k).join(' '); if (known.resolve(cand).known) return { entrant: names.slice(0, names.length - k).join(' '), driver: cand }; }
      var h = names.length / 2;
      if (names.length % 2 === 0 && names.slice(0, h).join(' ').toLowerCase() === names.slice(h).join(' ').toLowerCase()) return { entrant: names.slice(0, h).join(' '), driver: names.slice(h).join(' ') };
      var n = 2; while (names.length - n - 1 >= 1 && PARTICLES[names[names.length - n].toLowerCase()]) n++;
      if (names.length - n >= 1 && PARTICLES[names[names.length - n].toLowerCase()]) n++;
      if (names.length - n < 1) return { entrant: '', driver: names.join(' ') };
      // a lone initial-style first name (e.g. "HJ") stays with the driver
      return { entrant: names.slice(0, names.length - n).join(' '), driver: names.slice(names.length - n).join(' ') };
    }
    function parseBlock(b) {
      var i = 0, status = 'classified', pos = null;
      if (/^(DNF|DNS|DSQ|NC)$/.test(b[0])) { status = b[0] === 'DNS' ? 'DNS' : 'DNF'; } else pos = +b[0];
      var car = b[1]; i = 2;
      var slash = b.indexOf('/', i); if (slash < 0) { res.warnings.push('Car ' + car + ': couldn\'t find "driver / co-driver".'); return null; }
      var drvTok = b.slice(i, slash), entrant = '', driver;
      if (rallyScoring) { var sp = splitEntrantDriver(drvTok); entrant = sp.entrant; driver = sp.driver; } else driver = drvTok.join(' ');
      i = slash + 1;
      var coTok = [];
      while (i < b.length) {
        var c = cleanClass(b, i); if (c[0]) break;
        if (!rallyScoring && (/^(\d{3,}|O\/E\S*|C:|MSA)$/.test(b[i]) || /^O\/E/.test(b[i]))) break; // licence numbers start
        coTok.push(b[i]); i++;
      }
      // skip licence block (new format): "10647 / O/E2026…"
      while (i < b.length && !cleanClass(b, i)[0]) i++;
      var cc = cleanClass(b, i); var cls = cc[0]; i = cc[1];
      var veh = [];
      while (i < b.length && !(INT_RE.test(b[i]) && (TIME_RE.test(b[i + 1] || '') || HTIME_RE.test(b[i + 1] || '') || /^(DNF|DNS|"":"")$/.test(b[i + 1] || '') || i + 1 >= b.length || INT_RE.test(b[i + 1] || '')))) { veh.push(b[i]); i++; }
      var stg = i < b.length ? +b[i] : null; i++;
      var times = [], sps = [];
      while (i < b.length && TIME_RE.test(b[i])) {
        times.push(b[i]);
        if (INT_RE.test(b[i + 1] || '') && !(rallyScoring && i + 2 >= b.length)) { sps.push(+b[i + 1]); i += 2; } else { sps.push(null); i += 1; }
      }
      var rest = b.slice(i).filter(function (x) { return x !== '"":""'; });
      var h = rest.filter(function (x) { return HTIME_RE.test(x); });
      var hasDots = rest.indexOf('.') >= 0;
      var pen = null, total = null;
      if (status === 'classified') {
        if (hasDots) { total = h[h.length - 1] || null; pen = h.length >= 2 ? h[h.length - 2] : null; }
        else if (h.length >= 4) { pen = h[0]; total = h[1]; }
        else if (h.length >= 1) { total = h[0]; }
      } else if (h.length) pen = h[0];
      if (rest.indexOf('DNS') >= 0 && status !== 'classified') status = rest.indexOf('DNF') >= 0 ? status : 'DNS';
      var e = { status: status, pos: pos, car: car, driver: normName(driver), codriver: normName(coTok.join(' ')), 'class': cls || '', vehicle: veh.join(' ').replace(/…$/, ''), stages: stg,
        times: times, stagePos: sps, pen: pen, total: total };
      if (entrant) e.entrant = entrant;
      while (e.times.length < res.stages.length) { e.times.push(null); e.stagePos.push(null); }
      if (status !== 'classified' && stg != null && stg > 0 && stg < res.stages.length) partial.push(car);
      return e;
    }
    if (partial.length) res.warnings.push('Car' + (partial.length > 1 ? 's ' : ' ') + partial.join(', ') + ' retired part-way. Copied text can\'t show a skipped stage, so check their times sit under the right stages.');
    return res;
  }

  /* ---------------------------------------------------------------- name similarity (catches a person printed two ways) */
  var SUFFIX = { jnr: 1, snr: 1, jr: 1, sr: 1, junior: 1, senior: 1 };
  function nameParts(n) { return keyName(n).replace(/[^a-z ]/g, ' ').split(' ').filter(function (t) { return t && !SUFFIX[t]; }); }
  function editDistance(a, b) {
    var d = [], i, j; for (i = 0; i <= a.length; i++) d[i] = [i]; for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function similarNames(name, peopleDoc) {
    var p = nameParts(name); if (!p.length) return [];
    var out = [];
    ((peopleDoc && peopleDoc.people) || []).forEach(function (person) {
      var hit = [person.name].concat(person.aliases || []).some(function (n) {
        var q = nameParts(n); if (!q.length) return false;
        var sameSurname = p[p.length - 1] === q[q.length - 1] || (p[p.length - 1].length > 4 && editDistance(p[p.length - 1], q[q.length - 1]) <= 1);
        var firstFits = p[0][0] === q[0][0];
        return (sameSurname && firstFits) || editDistance(p.join(' '), q.join(' ')) <= 2;
      });
      if (hit && out.indexOf(person.name) < 0) out.push(person.name);
    });
    return out.slice(0, 3);
  }

  /* ---------------------------------------------------------------- the "adds up" check, summarised for an import preview */
  function sumReport(raw) {
    var S = raw.stages || [], out = { classified: 0, matched: 0, mismatched: [], unchecked: [] };
    (raw.entries || []).forEach(function (r) {
      if ((r.status || 'classified') !== 'classified') return;
      out.classified++;
      var times = (r.times || []).slice(0, S.length).map(parseTime), tot = parseTime(r.total);
      if (times.length < S.length || times.some(function (t) { return t == null || isNaN(t); }) || tot == null || isNaN(tot)) { out.unchecked.push(String(r.car)); return; }
      var sum = r1(times.reduce(function (a, b) { return a + b; }, 0) + (parseTime(r.pen) || 0));
      if (Math.abs(sum - tot) <= 0.05 || r.skipSumCheck) out.matched++; else out.mismatched.push(String(r.car));
    });
    return out;
  }

  /* ---------------------------------------------------------------- spreadsheet template */
  function spreadsheetTemplate(stages) {
    var head = ['Pos', 'Car', 'Driver', 'Co-driver', 'Class', 'Vehicle', 'Stages'];
    (stages && stages.length ? stages : ['SS1', 'SS2', 'SS3', 'SS4', 'SS5', 'SS6']).forEach(function (s) { head.push(s, s + ' Pos'); });
    return head.concat(['Pen', 'Total', 'Status']).join(',') + '\r\n';
  }

  /* ---------------------------------------------------------------- import: spreadsheet paste (TSV/CSV with a header row) */
  function parseSpreadsheet(text) {
    var rows = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    if (rows.length < 2) return { error: 'Paste a header row and at least one result row.' };
    var sep = rows[0].indexOf('\t') >= 0 ? '\t' : (rows[0].indexOf(';') >= 0 ? ';' : ',');
    var cells = rows.map(function (r) { return r.split(sep).map(function (c) { return c.trim().replace(/^"|"$/g, ''); }); });
    var head = cells[0].map(function (h) { return h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); });
    var col = {}, stages = [], stageCols = [], posCols = {}, ignored = [];
    head.forEach(function (h, i) {
      var m;
      if (!h) return;
      if (/^(pos|position)$/.test(h)) col.pos = i;
      else if (/^(car|no|car no|number|nr)$/.test(h)) col.car = i;
      else if (/^(driver)$/.test(h)) col.driver = i;
      else if (/^(codriver|co driver|navigator)$/.test(h)) col.codriver = i;
      else if (/^(class|cl|cls)$/.test(h)) col.cls = i;
      else if (/^(vehicle|car model|make|model)$/.test(h)) col.vehicle = i;
      else if (/^(stg|stages|stage compl|stages completed)$/.test(h)) col.stages = i;
      else if (/^(pen|penalty|penalties)$/.test(h)) col.pen = i;
      else if (/^(total|total time)$/.test(h)) col.total = i;
      else if (/^(status|result)$/.test(h)) col.status = i;
      else if ((m = h.match(/^ss ?(\d+) ?(pos|p|position)$/)) || (m = h.match(/^(?:pos|p) ?ss ?(\d+)$/))) posCols['SS' + m[1]] = i;
      else if ((m = h.match(/^ss ?(\d+)$/))) { stages.push('SS' + m[1]); stageCols.push(i); }
      else ignored.push(cells[0][i]);
    });
    var missing = [];
    if (col.car == null) missing.push('Car'); if (col.driver == null) missing.push('Driver'); if (col.cls == null) missing.push('Class');
    if (col.total == null) missing.push('Total'); if (col.pos == null && col.status == null) missing.push('Pos (or Status)'); if (!stages.length) missing.push('SS1, SS2… (stage times)');
    if (missing.length) return { error: 'The header row is missing ' + missing.join(', ') + '. Start from the template (Download a template), which has every column.' };
    var entries = cells.slice(1).map(function (c) {
      var posRaw = col.pos != null ? c[col.pos] : '';
      var status = col.status != null && c[col.status] ? c[col.status].toUpperCase() : (/^(DNF|DNS)$/i.test(posRaw) ? posRaw.toUpperCase() : 'classified');
      if (status !== 'DNF' && status !== 'DNS') status = 'classified';
      return { status: status, pos: status === 'classified' && posRaw ? +posRaw : null, car: c[col.car] || '', driver: c[col.driver] || '', codriver: col.codriver != null ? c[col.codriver] || '' : '',
        'class': col.cls != null ? normClass(c[col.cls]) : '', vehicle: col.vehicle != null ? c[col.vehicle] || '' : '', stages: col.stages != null && c[col.stages] !== '' ? +c[col.stages] : null,
        times: stageCols.map(function (i) { return c[i] || null; }), stagePos: stages.map(function (s) { var i = posCols[s]; return i != null && c[i] ? +c[i] : null; }),
        pen: col.pen != null && c[col.pen] ? c[col.pen] : null, total: col.total != null && c[col.total] && !/^(DNF|DNS)$/i.test(c[col.total]) ? c[col.total] : null };
    });
    var warnings = ignored.length ? ['Ignored column' + (ignored.length > 1 ? 's' : '') + ' the importer doesn\'t know: ' + ignored.join(', ') + '.'] : [];
    var bad = entries.filter(function (e) { return !e.car; }).length;
    if (bad) warnings.push(bad + ' row' + (bad > 1 ? 's have' : ' has') + ' no car number; check for blank or extra rows.');
    return { stages: stages, entries: entries, warnings: warnings, format: 'Spreadsheet' };
  }

  var api = { analyticsContractVersion: 1, validateAnalytics: validateAnalytics,
    rallyeSportContractVersion: 1, buildRallyeSport: buildRallyeSport, calculateRallyeSportScoring: calculateRallyeSportScoring,
    projectRallyeSport: projectRallyeSport, buildRallyeSportGraph: buildRallyeSportGraph, copyReviewedRallyeSportTimes: copyReviewedRallyeSportTimes,
    validateRallyeSport: validateRallyeSport,
    rallyNoticeContractVersion: 1, validateActiveRally: validateActiveRally, nrcDestination: nrcDestination,
    entryContractVersion: 2, parseTime: parseTime, fmtTime: fmtTime, slug: slug, normName: normName, normClass: normClass, ord: ord, r1: r1, prettyJson: prettyJson,
    peopleIndex: peopleIndex, buildSeason: buildSeason, validateRound: validateRound, parseClassificationText: parseClassificationText, parseSpreadsheet: parseSpreadsheet,
    similarNames: similarNames, sumReport: sumReport, spreadsheetTemplate: spreadsheetTemplate,
    validateSeason: validateSeason, validateDataset: validateDataset, validateEntryLists: validateEntryLists, entryEvidenceLoss: entryEvidenceLoss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NREngine = api;
})(typeof window !== 'undefined' ? window : this);
