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
        title: raw.title || '', status: raw.status || '', provisional: /provisional/i.test(raw.status || ''),
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
    function person(id, name) { return people[id] || (people[id] = { id: id, name: name, apps: [] }); }
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

    return {
      year: season.year, championship: season.championship, status: season.status || '', minStarts: season.minStarts,
      pointsScale: scale, classes: season.classes || [], events: season.events || [], rounds: rounds,
      standings: { drivers: standings('driver'), codrivers: standings('codriver') },
      people: Object.keys(people).map(function (k) { return people[k]; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }),
      msa: season.msa || null, documents: season.documents || [], notes: season.notes || [],
      calendar: (season.rounds || []).map(function (m, i) {
        return { id: m.id, n: i + 1, eventId: m.eventId, day: m.day || '', date: m.date || '', hasResults: !!roundsById[m.id] };
      })
    };
  }

  /* ---------------------------------------------------------------- validation */
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
    return issues;
  }
  function validateDataset(docs) {
    var out = [], st = docs && docs['data/site.json'], ppl = docs && docs['data/people.json'];
    function add(path, msg) { out.push({ level: 'error', path: path, msg: msg }); }
    if (!st || !Array.isArray(st.seasons) || !st.seasons.length) { add('data/site.json', 'At least one season is required.'); return out; }
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

  var api = { parseTime: parseTime, fmtTime: fmtTime, slug: slug, normName: normName, normClass: normClass, ord: ord, r1: r1, prettyJson: prettyJson,
    peopleIndex: peopleIndex, buildSeason: buildSeason, validateRound: validateRound, parseClassificationText: parseClassificationText, parseSpreadsheet: parseSpreadsheet,
    similarNames: similarNames, sumReport: sumReport, spreadsheetTemplate: spreadsheetTemplate,
    validateSeason: validateSeason, validateDataset: validateDataset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NREngine = api;
})(typeof window !== 'undefined' ? window : this);
