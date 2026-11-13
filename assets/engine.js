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
  function parseRallyeSportTime(t) {
    if (t == null) return null;
    var s = String(t).trim();
    if (!s || s === '"":""' || s === '.' || s === '-' || s === '—') return null;
    var m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (!m) return NaN;
    return (m[1] ? +m[1] * 3600 : 0) + +m[2] * 60 + +m[3];
  }
  function roundRallyeSportTime(value, precision) {
    var scale = Math.pow(10, precision);
    return Math.round(value * scale) / scale;
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
  // Synchronous SHA-256 (FIPS 180-4); the engine is shared by browsers and Node.
  function sha256(text) {
    var bytes = [], i, j;
    for (i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (text.charCodeAt(++i) - 0xdc00);
      } else if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd;
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | c >>> 6, 0x80 | c & 63);
      else if (c < 0x10000) bytes.push(0xe0 | c >>> 12, 0x80 | c >>> 6 & 63, 0x80 | c & 63);
      else bytes.push(0xf0 | c >>> 18, 0x80 | c >>> 12 & 63, 0x80 | c >>> 6 & 63, 0x80 | c & 63);
    }
    var bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var high = Math.floor(bitLength / 0x100000000), low = bitLength >>> 0;
    for (i = 3; i >= 0; i--) bytes.push(high >>> (i * 8) & 255);
    for (i = 3; i >= 0; i--) bytes.push(low >>> (i * 8) & 255);
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotr(x, n) { return x >>> n | x << (32 - n); }
    for (var offset = 0; offset < bytes.length; offset += 64) {
      var w = new Array(64);
      for (i = 0; i < 16; i++) {
        j = offset + i * 4;
        w[i] = (bytes[j] << 24 | bytes[j + 1] << 16 | bytes[j + 2] << 8 | bytes[j + 3]) >>> 0;
      }
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = h[0], b = h[1], d = h[3], e = h[4], f = h[5], g = h[6], x = h[7], cc = h[2];
      for (i = 0; i < 64; i++) {
        var t1 = (x + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + k[i] + w[i]) >>> 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & cc ^ b & cc)) >>> 0;
        x = g; g = f; f = e; e = (d + t1) >>> 0; d = cc; cc = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a,b,cc,d,e,f,g,x].forEach(function (value, n) { h[n] = (h[n] + value) >>> 0; });
    }
    return h.map(function (value) { return ('00000000' + value.toString(16)).slice(-8); }).join('');
  }
  function rallyeSportClassOrderDigest(result) {
    if (!result || typeof result !== 'object' || !result.source || typeof result.source !== 'object' ||
      Array.isArray(result.source) || !Array.isArray(result.entries)) return null;
    function scalar(v) {
      if (v === null) return ['null'];
      if (typeof v === 'string') return ['string', v];
      if (typeof v === 'number' && isFinite(v)) return ['number', v];
      throw new Error('Unsupported source value');
    }
    function field(obj, key, listItem) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) return ['missing'];
      var v = obj[key];
      if (v === null) return ['null'];
      if (listItem) {
        if (!Array.isArray(v)) throw new Error('Invalid source list');
        return ['list', v.map(listItem)];
      }
      return scalar(v);
    }
    try {
      var canonical = ['rs-class-order-v1',
        ['id', 'eventId', 'title', 'status', 'nrRoundId'].map(function (key) { return field(result, key); }),
        ['file', 'url', 'description'].map(function (key) { return field(result.source, key); }),
        field(result, 'notes', scalar),
        field(result, 'stages', function (stage) {
          if (!stage || typeof stage !== 'object' || Array.isArray(stage)) throw new Error('Invalid stage');
          return ['id', 'label', 'nrStage'].map(function (key) { return field(stage, key); });
        }),
        result.entries.map(function (entry) {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid row');
          return [
            ['car', 'driver', 'codriver', 'class', 'vehicle', 'status', 'pos', 'classPos', 'penalty', 'total'].map(function (key) { return field(entry, key); }),
            ['times', 'stagePos', 'notes'].map(function (key) { return field(entry, key, scalar); })
          ];
        })];
      return 'sha256:' + sha256(JSON.stringify(canonical));
    } catch (e) { return null; }
  }
  function currentFinalityDigest(result, mode) {
    if (!result || ['id', 'title', 'status'].some(function (key) {
      return typeof result[key] !== 'string' || !result[key].trim();
    }) || !result.source || typeof result.source !== 'object' || Array.isArray(result.source) ||
      !['file', 'url', 'description'].some(function (key) {
        return typeof result.source[key] === 'string' && !!result.source[key].trim();
      }) || !Array.isArray(result.entries) || !result.entries.length) return null;
    if (mode === 'rs') return rallyeSportClassOrderDigest(result);
    if (mode !== 'nr') return null;
    function canonical(value) {
      if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
        typeof value === 'number' && isFinite(value)) return value;
      if (Array.isArray(value)) return value.map(canonical);
      if (value && typeof value === 'object') {
        var out = Object.create(null);
        Object.keys(value).sort().forEach(function (key) { out[key] = canonical(value[key]); });
        return out;
      }
      throw new Error('Unsupported classification value');
    }
    try {
      var snapshot = ['nr-current-finality-v1'];
      ['id', 'title', 'status', 'source', 'notes', 'stages', 'entries', 'extraStarts'].forEach(function (key) {
        snapshot.push(Object.prototype.hasOwnProperty.call(result, key) ? [key, canonical(result[key])] : [key]);
      });
      return 'sha256:' + sha256(JSON.stringify(snapshot));
    } catch (e) { return null; }
  }
  function currentFinalityAccepted(result, mode, requireEvidence) {
    var review = result && result.currentFinalityReview;
    if (!review || typeof review !== 'object' || Array.isArray(review) ||
      Object.keys(review).some(function (key) { return ['version', 'confirmedFinal', 'digest', 'evidence'].indexOf(key) < 0; }) ||
      review.version !== 1 || review.confirmedFinal !== true || typeof review.digest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/.test(review.digest) ||
      (requireEvidence || Object.prototype.hasOwnProperty.call(review, 'evidence')) &&
        (typeof review.evidence !== 'string' || !review.evidence.trim() || review.evidence.length > 1000 || /[\u0000-\u001f\u007f]/.test(review.evidence))) return false;
    var digest = currentFinalityDigest(result, mode);
    return !!digest && review.digest === digest;
  }
  function rallyeSportClassOrder(result) {
    function unavailable(reason) { return { status: 'unavailable', reason: reason, entries: [] }; }
    var review = result && result.classOrderReview, digest = rallyeSportClassOrderDigest(result);
    if (!review || typeof review !== 'object' || Array.isArray(review) ||
      Object.keys(review).some(function (key) { return ['version', 'reviewed', 'digest', 'evidence'].indexOf(key) < 0; }) ||
      review.version !== 1 || review.reviewed !== true || typeof review.digest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/.test(review.digest) ||
      (Object.prototype.hasOwnProperty.call(review, 'evidence') && (typeof review.evidence !== 'string' || !review.evidence.trim()))) {
      return unavailable('No valid class-order review.');
    }
    if (!digest || review.digest !== digest) return unavailable('Class-order review is stale or source is malformed.');
    if (['id', 'eventId', 'title', 'status'].some(function (key) { return typeof result[key] !== 'string' || !result[key].trim(); }) ||
      ['file', 'url', 'description'].some(function (key) { return result.source[key] != null && typeof result.source[key] !== 'string'; }) ||
      !['file', 'url', 'description'].some(function (key) { return typeof result.source[key] === 'string' && !!result.source[key].trim(); })) {
      return unavailable('Source identity or printed status is missing.');
    }
    if (!result.entries.length) return unavailable('Classification has no rows.');
    var cars = Object.create(null), positions = Object.create(null), classes = Object.create(null), output = [];
    for (var i = 0; i < result.entries.length; i++) {
      var row = result.entries[i], cls = normClass(row['class']);
      if (typeof row.car !== 'string' || !row.car.trim() || cars[row.car] ||
        typeof row.driver !== 'string' || !row.driver.trim() ||
        (row.codriver != null && typeof row.codriver !== 'string') ||
        typeof row['class'] !== 'string' || ['RS2', 'RS4'].indexOf(cls) < 0) return unavailable('Unknown class or invalid crew row.');
      cars[row.car] = true;
      if (['classified', 'DNF', 'DNS'].indexOf(row.status) < 0) return unavailable('Unresolved source status.');
      if (row.status !== 'classified') {
        if (row.pos != null || row.classPos != null) return unavailable('Non-classified row has a position.');
        output.push({ car: row.car, classPos: null, kind: null });
        continue;
      }
      if (!Number.isInteger(row.pos) || row.pos < 1 || positions[row.pos] ||
        (row.classPos != null && (!Number.isInteger(row.classPos) || row.classPos < 1))) {
        return unavailable('Missing, duplicate or invalid position.');
      }
      positions[row.pos] = true;
      classes[cls] = classes[cls] || [];
      classes[cls].push({ row: row, index: i });
      output.push(null);
    }
    var classNames = Object.keys(classes);
    if (!classNames.length) return unavailable('Classification has no classified rows.');
    for (var p = 1; p <= Object.keys(positions).length; p++) {
      if (!positions[p]) return unavailable('Missing overall classification position.');
    }
    for (var k = 0; k < classNames.length; k++) {
      var sorted = classes[classNames[k]].sort(function (a, b) { return a.row.pos - b.row.pos; });
      for (var n = 0; n < sorted.length; n++) {
        var item = sorted[n], rank = n + 1;
        if (item.row.classPos != null && item.row.classPos !== rank) return unavailable('Printed class position contradicts source order.');
        output[item.index] = { car: item.row.car, classPos: rank, kind: item.row.classPos == null ? 'calculated' : 'printed' };
      }
    }
    return { status: 'ready', reason: '', entries: output };
  }
  function rallyeSportScoringClass(result, entry) {
    if (rallyeSportLaunchRS0(entry)) return 'RS0';
    var printedClass = normClass(entry && entry['class']);
    var mapping = result && result.classMappings || {};
    return normClass(mapping[printedClass] || printedClass);
  }
  function rallyeSportEntryPolicy(data) {
    return !!(data && data.eligibilityPolicy && data.eligibilityPolicy.code === 'entry-based-2026-v1');
  }
  function validRallyeSportEntryPolicy(policy, season) {
    return !!policy && typeof policy === 'object' && !Array.isArray(policy) &&
      Object.keys(policy).every(function (key) { return ['code', 'reviewed', 'evidence'].indexOf(key) >= 0; }) &&
      policy.code === 'entry-based-2026-v1' && policy.reviewed === true &&
      typeof policy.evidence === 'string' && !!policy.evidence.trim() &&
      (!season || season.year === 2026);
  }
  function rallyeSportLaunchRS0(entry) {
    return !!(entry && (entry.launchNonScoringReview || entry.publicLaunchNonScoring === true));
  }
  function rallyeSportEntryPerson(idx, entry, role) {
    var review = entry && (entry.identityReview || entry.publicIdentity);
    var personId = review && (role === 'driver' ? review.driverId : review.codriverId);
    if (personId && idx.byId[personId]) {
      var person = idx.byId[personId];
      return { id: person.id, name: person.name, known: true };
    }
    return idx.resolve(role === 'driver' ? entry && entry.driver : entry && entry.codriver);
  }
  var RS_MEMBERSHIP_STATUSES = ['eligible', 'non-member', 'missing-license', 'missing-membership-reference',
    'profile-incomplete', 'unverified'];
  var RS_MEMBERSHIP_MESSAGES = {
    'eligible': '',
    'non-member': 'RS0 Non-Scoring SSR 6.1 — this crew role is confirmed as a non-member and does not score championship points or awards.',
    'missing-license': 'RS0 Non-Scoring SSR 6.1 — licence evidence is missing; membership status is not asserted.',
    'missing-membership-reference': 'RS0 Non-Scoring SSR 6.1 — membership reference evidence is missing; membership status is not asserted.',
    'profile-incomplete': 'RS0 Non-Scoring SSR 6.1 — the membership profile is not complete; membership status is not asserted.',
    'unverified': 'RS0 Non-Scoring SSR 6.1 — membership eligibility is unverified and pending review.',
    'manual-exclusion': 'RS0 Non-Scoring SSR 6.1 — this person has a separate manual RS scoring exclusion; membership status is unchanged.',
    'invitational': 'RS0 Invitational — this entry is excluded from championship points, while its official result remains visible.',
    'test': 'RS0 Invitational — TEST entries are retained in results but do not score championship points.'
  };
  function validRallyeSportMembershipReview(review, idx) {
    if (!review || typeof review !== 'object' || Array.isArray(review) ||
      Object.keys(review).some(function (key) { return ['sourceDate', 'reviewed', 'evidence', 'people'].indexOf(key) < 0; }) ||
      review.sourceDate !== '2026-11-09' || review.reviewed !== true ||
      typeof review.evidence !== 'string' || !review.evidence.trim() ||
      !review.people || typeof review.people !== 'object' || Array.isArray(review.people)) return false;
    return Object.keys(review.people).every(function (personId) {
      var decision = review.people[personId];
      return !!idx.byId[personId] && decision && typeof decision === 'object' && !Array.isArray(decision) &&
        Object.keys(decision).every(function (key) { return ['status', 'basis', 'evidence'].indexOf(key) >= 0; }) &&
        RS_MEMBERSHIP_STATUSES.indexOf(decision.status) >= 0 &&
        ['membership-sheet', 'user-confirmed'].indexOf(decision.basis) >= 0 &&
        (decision.basis !== 'user-confirmed' || typeof decision.evidence === 'string' && !!decision.evidence.trim()) &&
        (decision.basis === 'user-confirmed' || decision.evidence === undefined);
    });
  }
  function rallyeSportFinalityAccepted(result) {
    return !!(result && result.finalityReview && result.finalityReview.acceptedForScoring === true &&
      typeof result.finalityReview.evidence === 'string' && result.finalityReview.evidence.trim());
  }
  function sourceStatusStarted(entry) {
    return !!entry && (entry.status === 'classified' || entry.status === 'DNF');
  }
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
          driverKnown: !!drv.known, codriverKnown: !!co.known,
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
        currentFinalityConfirmed: currentFinalityAccepted(raw, 'nr', !opts.publicProjection),
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
        var row = Object.assign({}, e, { driver: d.name, codriver: c.name, driverId: d.id, codriverId: c.id,
          driverKnown: !!d.known, codriverKnown: !!c.known });
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
      rallyesport: buildRallyeSport(season.rallyesport, opts.people, season, opts.publicProjection === true),
      calendar: (season.rounds || []).map(function (m, i) {
        return { id: m.id, n: i + 1, eventId: m.eventId, day: m.day || '', date: m.date || '', hasResults: !!roundsById[m.id] };
      })
    };
  }

  /* ---------------------------------------------------------- RallyeSport layer */
  function buildRallyeSport(raw, people, season, publicProjection) {
    var idx = peopleIndex(people), data = raw || { events: [], results: [] };
    var scoring;
    if (!raw) {
      scoring = calculateRallyeSportScoring(data, season, people);
    } else if (publicProjection && data.scoring !== undefined) {
      scoring = compatiblePublishedRallyeSportScoring(data, data.scoring, season) ? data.scoring : {
        status: 'invalid', reason: 'Published RS scoring is malformed or incompatible with its source results or participation basis; review and republish.',
        results: [], standings: null, provisionalStandings: null
      };
    } else if (publicProjection) {
      scoring = {
        status: 'invalid', reason: 'Published RS scoring is missing; review and republish the season projection.',
        results: [], standings: null, provisionalStandings: null
      };
    } else {
      scoring = calculateRallyeSportScoring(data, season, people);
    }
    var model = {
      events: (data.events || []).map(function (event) { return Object.assign({}, event); }),
      results: (data.results || []).map(function (result) {
        return Object.assign({}, result, {
          currentFinalityConfirmed: currentFinalityAccepted(result, 'rs', !publicProjection),
          classOrder: rallyeSportClassOrder(result),
          stages: (result.stages || []).map(function (stage) { return Object.assign({}, stage); }),
          entries: (result.entries || []).map(function (entry) {
            var driver = rallyeSportEntryPerson(idx, entry, 'driver'), codriver = rallyeSportEntryPerson(idx, entry, 'codriver');
            return Object.assign({}, entry, {
              driver: entry.driver || driver.name, codriver: entry.codriver || codriver.name,
              driverId: driver.id, codriverId: codriver.id,
              driverKnown: !!driver.known, codriverKnown: !!codriver.known,
              times: (entry.times || []).slice(), stagePos: (entry.stagePos || []).slice()
            });
          })
        });
      }),
      scoring: scoring
    };
    if (rallyeSportEntryPolicy(data)) model.eligibilityPolicy = { code: data.eligibilityPolicy.code };
    return model;
  }
  function compatiblePublishedRallyeSportScoring(data, scoring, season) {
    if (!scoring || typeof scoring !== 'object' ||
      ['ready', 'blocked', 'incomplete', 'unconfigured', 'invalid'].indexOf(scoring.status) < 0 ||
       typeof scoring.reason !== 'string' || !Array.isArray(scoring.results)) return false;
    if (scoring.participationBasis !== undefined &&
      ['stage-evidence-v1', 'source-status-v1'].indexOf(scoring.participationBasis) < 0) return false;
    if (Object.prototype.hasOwnProperty.call(scoring, 'starterMinimum') && (!scoring.starterMinimum ||
      typeof scoring.starterMinimum !== 'object' || Array.isArray(scoring.starterMinimum) ||
      Object.keys(scoring.starterMinimum).some(function (key) { return ['minimum', 'basis'].indexOf(key) < 0; }) ||
      !Number.isInteger(scoring.starterMinimum.minimum) ||
      [6, 15].indexOf(scoring.starterMinimum.minimum) < 0 ||
      ['ssr-v1', 'user-reported-review'].indexOf(scoring.starterMinimum.basis) < 0 ||
      scoring.starterMinimum.minimum === 6 && scoring.starterMinimum.basis !== 'user-reported-review' ||
      scoring.starterMinimum.minimum === 15 && scoring.starterMinimum.basis !== 'ssr-v1')) return false;
    var entryPolicy = rallyeSportEntryPolicy(data);
    if (data.eligibilityPolicy !== undefined && !entryPolicy) return false;
    if (entryPolicy && (scoring.eligibilityPolicyApplied !== 'entry-based-2026-v1' ||
      scoring.membershipReviewApplied !== undefined || season.year !== 2026)) return false;
    if (!entryPolicy && scoring.eligibilityPolicyApplied !== undefined) return false;
    var membershipRulesApply = !entryPolicy && season && season.year === 2026 && data.ruleset &&
      data.ruleset.code === 'clubman-sprint-2026-v1';
    if (membershipRulesApply && (!scoring.membershipReviewApplied ||
      scoring.membershipReviewApplied.sourceDate !== '2026-11-09' ||
      scoring.membershipReviewApplied.basis !== 'reviewed-membership-decisions' ||
      Object.keys(scoring.membershipReviewApplied).some(function (key) { return ['sourceDate', 'basis'].indexOf(key) < 0; }))) return false;
    var events = data.events || [], results = data.results || [], seenEvents = Object.create(null), seenResults = Object.create(null);
    if (entryPolicy && (events.some(function (event) {
      return typeof event.countsForChampionship !== 'boolean' || event.countsForChampionship === false && event.roundNumber != null;
    }) || results.some(function (result) {
      var event = events.filter(function (event) { return event.id === result.eventId; })[0];
      return (result.entries || []).some(function (entry) {
        return entry.publicLaunchNonScoring === true && (!event || event.countsForChampionship !== false || event.roundNumber != null ||
          entry.status !== 'TEST' && normClass(entry['class']) !== 'TEST') ||
          (entry.status === 'TEST' || normClass(entry['class']) === 'TEST') && entry.publicLaunchNonScoring !== true;
      });
    }))) return false;
    for (var i = 0; i < scoring.results.length; i++) {
      var row = scoring.results[i];
      if (!row || typeof row.eventId !== 'string' || seenEvents[row.eventId] ||
        events.every(function (event) { return event.id !== row.eventId; }) ||
        entryPolicy && events.some(function (event) { return event.id === row.eventId && event.countsForChampionship !== true; }) ||
        ['ready', 'blocked'].indexOf(row.status) < 0 || !Array.isArray(row.entries) ||
        row.finalityBasis != null && ['source-final', 'user-confirmed'].indexOf(row.finalityBasis) < 0) return false;
      seenEvents[row.eventId] = true;
      if (row.resultId) {
        var source = results.filter(function (result) { return result.id === row.resultId && result.eventId === row.eventId; })[0];
        if (!source || seenResults[row.resultId]) return false;
        seenResults[row.resultId] = true;
        if (row.status === 'ready') {
          var cars = (source.entries || []).map(function (entry) { return String(entry.car); });
          if (row.entries.length !== cars.length || row.entries.some(function (entry) {
            return !entry || cars.indexOf(String(entry.car)) < 0 ||
              [entry.driverPoints, entry.codriverPoints].some(function (points) {
                return points != null && (typeof points !== 'number' || !Number.isFinite(points) || points < 0);
              }) || (membershipRulesApply || entryPolicy) && (!validRallyeSportEligibility(entry.driverEligibility, entryPolicy) ||
                (entry.codriverEligibility !== null && !validRallyeSportEligibility(entry.codriverEligibility, entryPolicy)));
          }) || new Set(row.entries.map(function (entry) { return String(entry.car); })).size !== cars.length) return false;
          if (scoring.participationBasis === 'source-status-v1' && row.entries.some(function (score) {
            var entry = source.entries.filter(function (entry) { return String(entry.car) === String(score.car); })[0];
            return ['driver', 'codriver'].some(function (role) {
              var eligibility = score[role + 'Eligibility'], points = score[role + 'Points'];
              return entry.status === 'DNS' && points != null ||
                entry.status === 'DNF' && entry[role] && eligibility && eligibility.status === 'eligible' && points !== 0;
            });
          })) return false;
        } else if (row.entries.length) return false;
      } else if (row.entries.length) return false;
    }
    if (scoring.status === 'ready' && !scoring.standings ||
      scoring.standings != null && !validRallyeSportStandings(scoring.standings)) return false;
    if (scoring.provisionalStandings != null && !validRallyeSportStandings(scoring.provisionalStandings)) return false;
    if (entryPolicy && [scoring.standings, scoring.provisionalStandings].some(function (tables) {
      return tables && (tables.classDrivers.RS0.length || tables.classCodrivers.RS0.length ||
        tables.overallDrivers.concat(tables.overallCodrivers).some(function (row) { return row.rank === null || row.eligibilityStatus !== 'eligible'; }));
    })) return false;
    if (scoring.excludedEvents != null && (!Array.isArray(scoring.excludedEvents) ||
      scoring.excludedEvents.some(function (event) { return !event || typeof event.eventId !== 'string' || typeof event.reason !== 'string'; }))) return false;
    return true;
  }
  function validRallyeSportStandings(standings) {
    if (!standings || typeof standings !== 'object' || !standings.classDrivers || !standings.classCodrivers) return false;
    function validRows(rows) {
      return Array.isArray(rows) && rows.every(function (row) {
        return row && typeof row.id === 'string' && typeof row.name === 'string' &&
          Number.isFinite(row.points) && row.points >= 0 &&
          (Number.isInteger(row.rank) && row.rank > 0 ||
            row.rank === null && row.scoringClass === 'RS0' && row.points === 0 &&
            RS_MEMBERSHIP_STATUSES.concat(['manual-exclusion', 'invitational', 'test']).indexOf(row.eligibilityStatus) >= 0 &&
            typeof row.eligibilityReason === 'string');
      });
    }
    return validRows(standings.overallDrivers) && validRows(standings.overallCodrivers) &&
      ['RS0', 'RS2', 'RS4'].every(function (cls) {
      return ['classDrivers', 'classCodrivers'].every(function (group) {
        return validRows(standings[group][cls]);
      });
    });
  }
  function validRallyeSportEligibility(value, entryPolicy) {
    if (entryPolicy) return !!value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).every(function (key) { return ['status', 'scoringClass', 'scoringPosition', 'reason'].indexOf(key) >= 0; }) &&
      value.status === 'eligible' && ['RS2', 'RS4'].indexOf(value.scoringClass) >= 0 &&
      (value.scoringPosition === null || Number.isInteger(value.scoringPosition) && value.scoringPosition > 0) &&
      value.reason === '';
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).every(function (key) {
        return ['status', 'membershipStatus', 'scoringClass', 'scoringPosition', 'reason'].indexOf(key) >= 0;
      }) &&
      ['eligible', 'non-member', 'missing-license', 'missing-membership-reference', 'profile-incomplete',
        'unverified', 'manual-exclusion', 'invitational', 'test'].indexOf(value.status) >= 0 &&
      RS_MEMBERSHIP_STATUSES.indexOf(value.membershipStatus) >= 0 &&
      ['RS0', 'RS2', 'RS4', 'UNCONFIGURED'].indexOf(value.scoringClass) >= 0 &&
      (value.scoringPosition === null || Number.isInteger(value.scoringPosition) && value.scoringPosition > 0) &&
      typeof value.reason === 'string';
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
    var entryPolicy = rallyeSportEntryPolicy(data);
    if (Object.prototype.hasOwnProperty.call(data, 'eligibilityPolicy') &&
      !validRallyeSportEntryPolicy(data.eligibilityPolicy, season)) {
      return { status: 'invalid', reason: 'The RS entry-based eligibility policy is unsupported, unreviewed or lacks evidence.',
        results: [], standings: null, provisionalStandings: null };
    }
    var hasStarterMinimumReview = Object.prototype.hasOwnProperty.call(data, 'starterMinimumReview');
    var starterMinimum = hasStarterMinimumReview ? data.starterMinimumReview &&
      typeof data.starterMinimumReview === 'object' && !Array.isArray(data.starterMinimumReview) &&
      data.starterMinimumReview.minimum === 6 && data.starterMinimumReview.reviewed === true &&
      typeof data.starterMinimumReview.evidence === 'string' &&
      !!data.starterMinimumReview.evidence.trim() &&
      Object.keys(data.starterMinimumReview).every(function (key) { return ['minimum', 'reviewed', 'evidence'].indexOf(key) >= 0; }) ?
        { minimum: 6, basis: 'user-reported-review' } : null :
      { minimum: 15, basis: 'ssr-v1' };
    if (!starterMinimum) {
      var invalidReason = 'The 2026 RS starter-minimum review is malformed, unreviewed or lacks evidence; event scoring is withheld rather than falling back to the SSR baseline.';
      return { status: 'invalid', reason: invalidReason, results: events.filter(function (event) {
        return event.countsForChampionship === true;
      }).map(function (event) {
        return { eventId: event.id, resultId: '', status: 'blocked', reason: invalidReason, entries: [] };
      }), standings: null, provisionalStandings: null };
    }
    if (!entryPolicy && !validRallyeSportMembershipReview(data.membershipReview, idx)) {
      var membershipError = 'A reviewed 2026 membership eligibility map is required. Unmatched or unverified people are not assumed eligible.';
      return { status: 'invalid', reason: membershipError, starterMinimum: starterMinimum, results: events.filter(function (event) {
        return event.countsForChampionship === true;
      }).map(function (event) {
        return { eventId: event.id, resultId: '', status: 'blocked', reason: membershipError, entries: [] };
      }), standings: null, provisionalStandings: null };
    }
    var counted = events.filter(function (event) { return event.countsForChampionship === true; });
    var doubleEvents = counted.filter(function (event) { return event.doublePoints === true; });
    (data.nonScoringPeople || []).forEach(function (id) { nonScoring[id] = true; });
    function membershipStatus(person) {
      var decision = person && person.id && data.membershipReview.people[person.id];
      return decision ? decision.status : 'unverified';
    }
    function eligibility(entry, role, person, result) {
      if (entryPolicy) return { status: 'eligible', scoringClass: rallyeSportScoringClass(result, entry),
        scoringPosition: null, reason: '' };
      var memberStatus = membershipStatus(person), status = memberStatus;
      if (entry.status === 'TEST') status = 'test';
      else if (entry.invited === true) status = 'invitational';
      else if (person && person.id && nonScoring[person.id]) status = 'manual-exclusion';
      var scoringClass = status === 'eligible' ? rallyeSportScoringClass(result, entry) : 'RS0';
      if (status === 'eligible' && ['RS2', 'RS4'].indexOf(scoringClass) < 0) scoringClass = 'UNCONFIGURED';
      return { status: status, membershipStatus: memberStatus, scoringClass: scoringClass,
        scoringPosition: null, reason: RS_MEMBERSHIP_MESSAGES[status] || '' };
    }
    results.forEach(function (result) { resultByEvent[result.eventId] = result; });
    events.forEach(function (event) {
      var result = resultByEvent[event.id];
      if (event.countsForChampionship !== true) return;
      if (!result) { scoreRows.push({ eventId: event.id, resultId: '', status: 'blocked', reason: 'No complete official classification is recorded for this confirmed championship event.', entries: [] }); return; }
      var sourceHasPendingChecks = (result.notes || []).some(function (note) {
        return /results are final pending post[- ]event technical checks/i.test(note);
      });
      var sourceFinal = /^\s*final(?:\s+official)?\s+(?:classification|results)(?:\s+\d+\/\d+)?\s*$/i.test(result.status || '') &&
        !sourceHasPendingChecks;
      var userFinalityAccepted = rallyeSportFinalityAccepted(result);
      var row = { eventId: event.id, resultId: result.id, status: 'ready', reason: '', entries: [],
        finalityBasis: userFinalityAccepted ? 'user-confirmed' : sourceFinal ? 'source-final' : '' };
      function hasStartEvidence(entry) {
        return !!(entry.startEvidence && entry.startEvidence.trim()) ||
          (entry.times || []).some(function (value) { return value != null && value !== ''; }) ||
          (entry.stagePos || []).some(function (value) { return value != null && value !== ''; });
      }
      function starterProblem() {
        var knownStarters = (result.entries || []).filter(function (entry) {
          return sourceStatusStarted(entry) || entry.status === 'TEST' && hasStartEvidence(entry);
        }).length;
        if (event.starterCount != null && (!Number.isInteger(event.starterCount) || event.starterCount < 0 ||
          !event.starterCountEvidence || event.starterCount < knownStarters)) return 'The reviewed event starter count is invalid, unsupported or conflicts with source-backed starter evidence.';
        if (event.starterCount != null && event.starterCount < starterMinimum.minimum)
          return 'The reviewed event starter count is below ' + starterMinimum.minimum + '; the event does not meet the configured 2026 RS starter threshold.';
        if (event.starterCount == null && knownStarters < starterMinimum.minimum)
          return 'Fewer than ' + starterMinimum.minimum + ' source-backed starters, including TEST and invitational entries, are recorded; the event does not meet the configured 2026 RS starter threshold.';
        return '';
      }
      if (event.rulesetConfirmed !== true || !event.rulesetEvidence) row = blocked('This specific event has not been confirmed as governed by the selected SSRs.');
      else if (event.doublePoints !== true && event.doublePoints !== false) row = blocked('Whether this event is a bulletin-announced double-points round is not recorded.');
      else if (event.doublePoints && !event.doublePointsEvidence) row = blocked('A double-points event needs its official bulletin evidence.');
      else if (event.doublePoints && (dateOrdinal(event.startDate) == null || dateOrdinal(event.doublePointsBulletinDate) == null)) row = blocked('Double points need valid event start and bulletin issue dates to check SSR 7.2 notice.');
      else if (event.doublePoints && dateOrdinal(event.startDate) - dateOrdinal(event.doublePointsBulletinDate) < 14) row = blocked('SSR 7.2 requires the double-points bulletin at least 14 days before the event.');
      else if (event.countsForChampionship === true && event.doublePoints && counted.length !== 5) row = blocked('SSR 7.2 specifies a double-points round only for a five-round championship; other round counts need clarification.');
      else if (event.countsForChampionship === true && event.doublePoints && doubleEvents.length !== 1) row = blocked('SSR 7.2 requires exactly one double-points round in a five-round championship.');
      else if (!sourceFinal && !userFinalityAccepted) row = blocked(/provisional/i.test(result.status || '') ?
        'The source classification is provisional; event points are not calculated.' : 'The source classification finality is unclear; event points are not calculated.');
      else if ((result.entries || []).some(function (entry) {
        return (entryPolicy ? ['classified', 'DNF', 'DNS'] : ['classified', 'DNF', 'DNS', 'TEST']).indexOf(entry.status) < 0 ||
          entryPolicy && (rallyeSportLaunchRS0(entry) || normClass(entry['class']) === 'TEST');
      })) row = blocked(entryPolicy ? 'A source status or TEST category has no configured championship semantics; retain the official row and obtain an explicit classification decision.' :
        'A source status has no configured championship semantics; retain the official row and wait for an RS ruling.');
      else if ((result.entries || []).some(function (entry) { return (entryPolicy || entry.status === 'classified') && ['RS2', 'RS4'].indexOf(rallyeSportScoringClass(result, entry)) < 0; })) row = blocked('An RS category has no configured scoring semantics or explicit event-specific scoring-class mapping.');
      else if ((result.entries || []).some(function (entry) { return entry.status === 'classified' &&
        (!Number.isInteger(entry.pos) || entry.pos < 1 || entry.total == null || entry.total === ''); })) row = blocked('A classified RS row is missing its official position or total.');
      else if ((result.entries || []).some(function (entry, i) { return (result.entries || []).slice(0, i).some(function (other) { return String(other.car) === String(entry.car); }); })) row = blocked('Duplicate car numbers need RS source review before points can be assigned.');
      else if (starterProblem()) row = blocked(starterProblem());
      else if (!entryPolicy && (result.entries || []).some(function (entry) { return entry.status === 'classified' && typeof entry.invited !== 'boolean'; })) row = blocked('Invitational/non-invitational status is not confirmed for every classified crew.');
      if (row.status === 'blocked') { row.eventId = event.id; row.resultId = result.id; row.entries = []; scoreRows.push(row); return; }
      var scoringRoles = {
        driver: (result.entries || []).filter(function (entry) { return entry.status === 'classified' &&
          eligibility(entry, 'driver', rallyeSportEntryPerson(idx, entry, 'driver'), result).status === 'eligible'; }),
        codriver: (result.entries || []).filter(function (entry) { return entry.status === 'classified' && entry.codriver &&
          eligibility(entry, 'codriver', rallyeSportEntryPerson(idx, entry, 'codriver'), result).status === 'eligible'; })
      };
      var classifiedEntries = (result.entries || []).filter(function (entry) { return entry.status === 'classified'; });
      var classEntries = Object.create(null), orderByCar = Object.create(null), orderIssue = '';
      classifiedEntries.forEach(function (entry) {
        var cls = rallyeSportScoringClass(result, entry);
        (classEntries[cls] || (classEntries[cls] = [])).push(entry);
      });
      Object.keys(classEntries).forEach(function (cls) {
        var entriesInClass = classEntries[cls], useClassPositions = entriesInClass.every(function (entry) {
          return Number.isInteger(entry.classPos) && entry.classPos > 0;
        });
        var ordered = entriesInClass.slice().sort(function (a, b) {
          return useClassPositions ? a.classPos - b.classPos : a.pos - b.pos;
        });
        for (var i = 0; i < ordered.length; i++) {
          orderByCar[String(ordered[i].car)] = useClassPositions ? ordered[i].classPos : ordered[i].pos;
          if (i && (useClassPositions ? ordered[i].classPos === ordered[i - 1].classPos :
            ordered[i].pos === ordered[i - 1].pos)) {
            orderIssue = 'A tied scoring position remains unresolved; the app does not recompute the SSR 7.5 tie-break.';
          }
          if (i && useClassPositions && ordered[i].pos < ordered[i - 1].pos) {
            orderIssue = 'Printed overall and class positions conflict; points are withheld for source review.';
          }
        }
      });
      if (orderIssue) {
        scoreRows.push({ eventId: event.id, resultId: result.id, status: 'blocked',
          reason: orderIssue, entries: [] });
        return;
      }
      var pointsByCar = Object.create(null), positionsByCar = Object.create(null);
      Object.keys(scoringRoles).forEach(function (role) {
        var classRanks = Object.create(null);
        scoringRoles[role].slice().sort(function (a, b) {
          var cls = rallyeSportScoringClass(result, a), otherClass = rallyeSportScoringClass(result, b);
          return cls === otherClass ? orderByCar[String(a.car)] - orderByCar[String(b.car)] : cls < otherClass ? -1 : 1;
        }).forEach(function (entry) {
          var cls = rallyeSportScoringClass(result, entry), rank = classRanks[cls] || 0;
          classRanks[cls] = rank + 1;
          var points = rank < pointScale.length ? pointScale[rank] : 1;
          if (event.doublePoints) points *= 2;
          if (!pointsByCar[String(entry.car)]) pointsByCar[String(entry.car)] = { driver: null, codriver: null };
          if (!positionsByCar[String(entry.car)]) positionsByCar[String(entry.car)] = { driver: null, codriver: null };
          pointsByCar[String(entry.car)][role] = points;
          positionsByCar[String(entry.car)][role] = rank + 1;
        });
      });
      row.entries = (result.entries || []).map(function (entry) {
        var points = pointsByCar[String(entry.car)] || {};
        var driver = rallyeSportEntryPerson(idx, entry, 'driver');
        var codriver = rallyeSportEntryPerson(idx, entry, 'codriver');
        var driverEligibility = eligibility(entry, 'driver', driver, result);
        var codriverEligibility = entry.codriver ? eligibility(entry, 'codriver', codriver, result) : null;
        var positions = positionsByCar[String(entry.car)] || {};
        driverEligibility.scoringPosition = positions.driver || null;
        if (codriverEligibility) codriverEligibility.scoringPosition = positions.codriver || null;
        var hasPointsResult = entry.status !== 'DNS';
        return { car: String(entry.car),
          driverPoints: driverEligibility.status !== 'eligible' ? hasPointsResult ? 0 : null :
            entry.status === 'DNF' && ['RS2', 'RS4'].indexOf(driverEligibility.scoringClass) >= 0 ? 0 :
              entry.status === 'DNF' ? null : points.driver == null ? null : points.driver,
          codriverPoints: !entry.codriver ? null : codriverEligibility.status !== 'eligible' ? hasPointsResult ? 0 : null :
            entry.status === 'DNF' && ['RS2', 'RS4'].indexOf(codriverEligibility.scoringClass) >= 0 ? 0 :
              entry.status === 'DNF' ? null : points.codriver == null ? null : points.codriver,
          driverEligibility: driverEligibility, codriverEligibility: codriverEligibility };
      });
      scoreRows.push(row);
    });
    var readyRows = scoreRows.filter(function (row) { return row.status === 'ready'; });
    function buildStandings(rows) {
      var tables = { overallDrivers: Object.create(null), overallCodrivers: Object.create(null),
        classDrivers: { RS0: Object.create(null), RS2: Object.create(null), RS4: Object.create(null) },
        classCodrivers: { RS0: Object.create(null), RS2: Object.create(null), RS4: Object.create(null) } };
      function add(table, id, name, points, eligibilityInfo) {
        if (!id) return;
        if (!table[id]) table[id] = { id: id, name: name, points: 0,
          eligibilityStatus: eligibilityInfo.status, eligibilityReason: eligibilityInfo.reason };
        else if (eligibilityInfo.status === 'eligible') {
          table[id].eligibilityStatus = 'eligible';
          table[id].eligibilityReason = '';
        }
        table[id].points += points;
      }
      rows.forEach(function (row) {
        var result = results.filter(function (item) { return item.id === row.resultId; })[0];
        if (!result) return;
        (row.entries || []).forEach(function (score) {
          var entry = result.entries.filter(function (item) { return String(item.car) === score.car; })[0];
          if (!entry) return;
          var driver = rallyeSportEntryPerson(idx, entry, 'driver'), codriver = rallyeSportEntryPerson(idx, entry, 'codriver');
          [['driver', driver, score.driverEligibility, score.driverPoints, tables.overallDrivers, tables.classDrivers],
            ['codriver', codriver, score.codriverEligibility, score.codriverPoints, tables.overallCodrivers, tables.classCodrivers]]
            .forEach(function (role) {
              if (!role[1].id || !role[2]) return;
              if (role[2].status === 'eligible' && role[3] != null) {
                add(role[4], role[1].id, role[1].name, role[3], role[2]);
                add(role[5][role[2].scoringClass], role[1].id, role[1].name, role[3], role[2]);
              } else if (role[2].status !== 'eligible' && entry.status !== 'DNS') {
                add(role[4], role[1].id, role[1].name, 0, role[2]);
                add(role[5].RS0, role[1].id, role[1].name, 0, role[2]);
              }
            });
        });
      });
      function table(value, suppressEligible) {
        var rows = Object.keys(value).map(function (id) { return value[id]; });
        var eligible = rows.filter(function (row) { return row.eligibilityStatus === 'eligible'; });
        var excluded = rows.filter(function (row) {
          return row.eligibilityStatus !== 'eligible' &&
            !(suppressEligible && suppressEligible[row.id] && suppressEligible[row.id].eligibilityStatus === 'eligible');
        });
        eligible.sort(function (a, b) { return b.points - a.points || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
        eligible.forEach(function (row) {
          row.rank = 1 + eligible.filter(function (other) { return other.points > row.points; }).length;
        });
        excluded.sort(function (a, b) { return a.name.localeCompare(b.name); });
        excluded.forEach(function (row) { row.rank = null; row.scoringClass = 'RS0'; });
        return eligible.concat(excluded);
      }
      return {
        overallDrivers: table(tables.overallDrivers), overallCodrivers: table(tables.overallCodrivers),
        classDrivers: { RS0: table(tables.classDrivers.RS0, tables.overallDrivers), RS2: table(tables.classDrivers.RS2), RS4: table(tables.classDrivers.RS4) },
        classCodrivers: { RS0: table(tables.classCodrivers.RS0, tables.overallCodrivers), RS2: table(tables.classCodrivers.RS2), RS4: table(tables.classCodrivers.RS4) }
      };
    }
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
      standings = buildStandings(readyRows);
      status = 'ready';
      reason = 'Points use the reviewed 2026 Clubman’s Sprint SSR scale; equal championship totals share a rank because season tie-breaks are unresolved.';
    }
    var provisionalStandings = status === 'ready' || !readyRows.length ? null : buildStandings(readyRows);
    var scoring = { status: status, reason: reason, starterMinimum: starterMinimum, participationBasis: 'source-status-v1',
      results: scoreRows, standings: standings,
      provisionalStandings: provisionalStandings,
      includedProvisionalEvents: provisionalStandings ? readyRows.map(function (row) { return row.eventId; }) : [],
      excludedProvisionalEvents: provisionalStandings ? scoreRows.filter(function (row) { return row.status !== 'ready'; }).map(function (row) {
        return { eventId: row.eventId, reason: row.reason };
      }) : [] };
    if (entryPolicy) scoring.eligibilityPolicyApplied = 'entry-based-2026-v1';
    else scoring.membershipReviewApplied = { sourceDate: '2026-11-09', basis: 'reviewed-membership-decisions' };
    return scoring;
  }
  function projectRallyeSport(data, season, people) {
    if (!data) return data;
    var projected = JSON.parse(JSON.stringify(data));
    projected.scoring = calculateRallyeSportScoring(data, season, people);
    delete projected.nonScoringPeople;
    delete projected.starterMinimumReview;
    delete projected.membershipReview;
    if (projected.eligibilityPolicy) projected.eligibilityPolicy = { code: projected.eligibilityPolicy.code };
    projected.events = (projected.events || []).map(function (event) {
      if (!rallyeSportEntryPolicy(data)) delete event.countsForChampionship;
      delete event.championshipEvidence; delete event.doublePoints; delete event.doublePointsEvidence;
      delete event.doublePointsBulletinDate;
      delete event.rulesetConfirmed; delete event.rulesetEvidence;
      delete event.starterCount; delete event.starterCountEvidence;
      return event;
    });
    projected.results = (projected.results || []).map(function (result) {
      delete result.finalityReview;
      if (Object.prototype.hasOwnProperty.call(result, 'currentFinalityReview')) {
        if (currentFinalityAccepted(result, 'rs', true)) result.currentFinalityReview = {
          version: 1, confirmedFinal: true, digest: result.currentFinalityReview.digest
        };
        else delete result.currentFinalityReview;
      }
      if (result.classOrderReview) result.classOrderReview = {
        version: result.classOrderReview.version, reviewed: result.classOrderReview.reviewed, digest: result.classOrderReview.digest
      };
      result.entries = (result.entries || []).map(function (entry) {
        var review = entry.identityReview;
        if (review && (review.driverId || review.codriverId)) {
          entry.publicIdentity = {};
          if (review.driverId) entry.publicIdentity.driverId = review.driverId;
          if (review.codriverId) entry.publicIdentity.codriverId = review.codriverId;
        }
        delete entry.invited;
        delete entry.startEvidence;
        delete entry.identityReview;
        if (entry.launchNonScoringReview) entry.publicLaunchNonScoring = true;
        delete entry.launchNonScoringReview;
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
      var cumulative = [], total = 0, complete = true, timePrecision = 1;
      (entry.times || []).concat([entry.total]).forEach(function (value) {
        var decimals = String(value == null ? '' : value).match(/\.(\d+)/);
        if (decimals) timePrecision = Math.max(timePrecision, decimals[1].length);
      });
      (entry.times || []).forEach(function (value) {
        var sec = parseRallyeSportTime(value);
        if (sec == null || isNaN(sec)) complete = false;
        if (complete) { total = roundRallyeSportTime(total + sec, timePrecision); cumulative.push(total); } else cumulative.push(null);
      });
      var officialTotal = parseRallyeSportTime(entry.total);
      return { entry: entry, cumulative: cumulative,
        total: officialTotal == null ? null : roundRallyeSportTime(officialTotal, timePrecision), timePrecision: timePrecision };
    });
    var graphPrecision = data.reduce(function (max, row) {
      var decimals = String(row.entry.total == null ? '' : row.entry.total).match(/\.(\d+)/);
      return Math.max(max, row.timePrecision, decimals ? decimals[1].length : 1);
    }, 1);
    data.forEach(function (row) { row.timePrecision = graphPrecision; });
    var valuesByEntry = data.map(function (row) {
      var metric = [];
      for (var k = 0; k < stages.length; k++) {
        var value = row.cumulative[k], pool = data.filter(function (other) { return other.cumulative[k] != null; });
        var classPool = pool.filter(function (other) {
          return rallyeSportScoringClass(result, other.entry) === rallyeSportScoringClass(result, row.entry);
        });
        var best = pool.length ? Math.min.apply(null, pool.map(function (other) { return other.cumulative[k]; })) : null;
        var classBest = classPool.length ? Math.min.apply(null, classPool.map(function (other) { return other.cumulative[k]; })) : null;
        var stageTime = parseRallyeSportTime((row.entry.times || [])[k]);
        var stagePool = data.map(function (other) { return parseRallyeSportTime((other.entry.times || [])[k]); }).filter(function (time) { return time != null && !isNaN(time); });
        var stageBest = stagePool.length ? Math.min.apply(null, stagePool) : null;
        var classRank = 1 + classPool.filter(function (other) { return other.cumulative[k] < value - 1e-9; }).length;
        var stageValue = (row.entry.stagePos || [])[k];
        metric.push(metricId === 'loss' ? (stageTime == null || isNaN(stageTime) || stageBest == null ? null : roundRallyeSportTime(stageTime - stageBest, graphPrecision)) :
          metricId === 'spos' ? (stageValue == null || stageValue === '' ? null : +stageValue) :
          value == null ? null : metricId === 'pos' ? 1 + pool.filter(function (other) { return other.cumulative[k] < value - 1e-9; }).length :
          metricId === 'cpos' ? classRank : metricId === 'gap' ? roundRallyeSportTime(value - best, graphPrecision) :
          metricId === 'cgap' ? roundRallyeSportTime(value - classBest, graphPrecision) : null);
      }
      if (final) {
        var isClassified = row.entry.status === 'classified', classified = data.filter(function (other) {
          return other.entry.status === 'classified' && other.total != null && !isNaN(other.total);
        });
        var sameClass = classified.filter(function (other) {
          return rallyeSportScoringClass(result, other.entry) === rallyeSportScoringClass(result, row.entry);
        });
        var finalValue = row.total;
        var finalBest = classified.length ? Math.min.apply(null, classified.map(function (other) { return other.total; })) : null;
        var classBest = sameClass.length ? Math.min.apply(null, sameClass.map(function (other) { return other.total; })) : null;
        if (!isClassified) metric.push(null);
        else if (metricId === 'pos') metric.push(row.entry.pos == null ? null : +row.entry.pos);
        else if (metricId === 'cpos') metric.push(row.entry.classPos == null ? null : +row.entry.classPos);
        else if (metricId === 'gap') metric.push(finalValue == null || isNaN(finalValue) || finalBest == null ? null : roundRallyeSportTime(finalValue - finalBest, graphPrecision));
        else if (metricId === 'cgap') metric.push(finalValue == null || isNaN(finalValue) || classBest == null ? null : roundRallyeSportTime(finalValue - classBest, graphPrecision));
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
        cumulative: row.cumulative.concat([row.entry.status === 'classified' ? row.total : null]),
        end: row.entry.status === 'classified' ? null : row.entry.status,
        entry: row.entry, timePrecision: row.timePrecision
      };
    });
    return valuesByEntry;
  }
  function copyReviewedRallyeSportTimes(result, nrRound, people) {
    if (!result || !result.nrRoundId || !nrRound || result.nrRoundId !== nrRound.id) throw new Error('The RS result must be explicitly linked to this NR round.');
    var idx = peopleIndex(people), stages = result.stages || [], nrStages = nrRound.stages || [];
    if (!stages.some(function (stage) { return stage.nrStage; })) throw new Error('Map at least one RS stage to its exact NR stage before copying times.');
    var report = { copied: [], conflicts: [], missing: [], unmatched: [], skippedDns: [] };
    var entries = (result.entries || []).map(function (entry) {
      if (!Array.isArray(entry.times) || entry.times.length !== stages.length ||
        entry.timeEvidence && (!Array.isArray(entry.timeEvidence) || entry.timeEvidence.length !== stages.length)) {
        throw new Error('RS stage times and provenance must align with the explicit RS stage list before copying.');
      }
      var driver = rallyeSportEntryPerson(idx, entry, 'driver'), codriver = rallyeSportEntryPerson(idx, entry, 'codriver');
      if (!driver.known || entry.codriver && !codriver.known) {
        report.unmatched.push({ car: String(entry.car), reason: 'RS crew identity is unresolved.' });
        return Object.assign({}, entry, { times: entry.times.slice(), timeEvidence: (entry.timeEvidence || []).slice() });
      }
      var matches = (nrRound.entries || []).filter(function (candidate) {
        var nrDriver = idx.resolve(candidate.driver), nrCodriver = idx.resolve(candidate.codriver);
        return String(candidate.car) === String(entry.car) && nrDriver.known && nrDriver.id === driver.id &&
          (entry.codriver ? nrCodriver.known && nrCodriver.id === codriver.id : !candidate.codriver);
      });
      if (matches.length !== 1) {
        report.unmatched.push({ car: String(entry.car), reason: matches.length ? 'More than one NR row matches the car and crew.' : 'No NR row matches the car and reviewed crew identities.' });
        return Object.assign({}, entry, { times: entry.times.slice(), timeEvidence: (entry.timeEvidence || []).slice() });
      }
      var source = matches[0], times = entry.times.slice(), evidence = (entry.timeEvidence || []).slice();
      if (source.status === 'DNS') {
        report.skippedDns.push({ car: String(entry.car), reason: 'The NR row is marked DNS; its times were not copied.' });
        return Object.assign({}, entry, { times: times, timeEvidence: evidence });
      }
      stages.forEach(function (stage, i) {
        if (!stage.nrStage) return;
        var sourceIndex = nrStages.indexOf(stage.nrStage);
        if (sourceIndex < 0) throw new Error('Mapped RS stage ' + stage.nrStage + ' is not present in the linked NR round.');
        if (!source.times || source.times[sourceIndex] == null || source.times[sourceIndex] === '') {
          report.missing.push({ car: String(entry.car), stage: stage.label, nrStage: stage.nrStage });
          return;
        }
        var nrTime = source.times[sourceIndex];
        if (times[i] != null && times[i] !== '') {
          if (times[i] === nrTime) report.copied.push({ car: String(entry.car), stage: stage.label, value: times[i], unchanged: true });
          else report.conflicts.push({ car: String(entry.car), stage: stage.label, rsValue: times[i], nrValue: nrTime });
          return;
        }
        times[i] = nrTime;
        evidence[i] = { kind: 'reviewed-nr-copy', nrRoundId: result.nrRoundId, nrCar: String(source.car), nrStage: stage.nrStage, value: nrTime };
        report.copied.push({ car: String(entry.car), stage: stage.label, value: nrTime, unchanged: false });
      });
      return Object.assign({}, entry, { times: times, timeEvidence: evidence });
    });
    return { entries: entries, report: report };
  }
  function validateRallyeSport(data, season, rounds, people) {
    if (data === undefined) return [];
    var issues = [], knownEvents = Object.create(null), knownRoundNumbers = Object.create(null), knownResults = Object.create(null), resultEvents = Object.create(null), nrEvents = Object.create(null), nrRounds = Object.create(null);
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
    if (!object(data, 'data', ['ruleset', 'events', 'results', 'nonScoringPeople', 'starterMinimumReview', 'membershipReview', 'eligibilityPolicy'])) return issues;
    if (!Array.isArray(data.events) || !Array.isArray(data.results)) { error('events and results must be lists.'); return issues; }
    var entryPolicy = rallyeSportEntryPolicy(data);
    if (Object.prototype.hasOwnProperty.call(data, 'eligibilityPolicy')) {
      if (!validRallyeSportEntryPolicy(data.eligibilityPolicy, season)) error('entry-based eligibility policy must be explicitly reviewed with evidence and supported only for 2026.');
      if (data.eligibilityPolicy) text(data.eligibilityPolicy.evidence, 'entry-based policy evidence', true, 1000);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'starterMinimumReview')) {
      if (season && season.year !== 2026) error('starter minimum review is supported only for the 2026 RallyeSport season.');
      if (object(data.starterMinimumReview, 'starter minimum review', ['minimum', 'reviewed', 'evidence'])) {
        if (data.starterMinimumReview.minimum !== 6) error('starter minimum review must explicitly set the confirmed 2026 value of six.');
        if (data.starterMinimumReview.reviewed !== true) error('starter minimum review must be explicitly reviewed and confirmed.');
        text(data.starterMinimumReview.evidence, 'starter minimum review evidence', true, 1000);
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, 'membershipReview')) {
      var membershipReview = data.membershipReview, memberProfiles = Object.create(null), membershipPeople = Object.create(null);
      ((people && people.people) || []).forEach(function (person) { memberProfiles[person.id] = true; });
      if (season && season.year !== 2026) error('membership review is supported only for the 2026 RallyeSport season.');
      if (object(membershipReview, 'membership review', ['sourceDate', 'reviewed', 'evidence', 'people'])) {
        if (membershipReview.sourceDate !== '2026-11-09') error('membership review must identify the reviewed 2026-11-09 roster date.');
        if (!entryPolicy && membershipReview.reviewed !== true) error('membership review must be explicitly reviewed.');
        if (entryPolicy && typeof membershipReview.reviewed !== 'boolean') error('inactive membership review state must be a boolean; entry-based policy does not verify it.');
        text(membershipReview.evidence, 'membership review provenance', !entryPolicy || membershipReview.reviewed === true, 1000);
        if (!membershipReview.people || typeof membershipReview.people !== 'object' || Array.isArray(membershipReview.people)) {
          error('membership review people must be an object keyed by stable profile ID.');
        } else Object.keys(membershipReview.people).forEach(function (personId) {
          var decision = membershipReview.people[personId], label = 'membership decision for ' + personId;
          if (!memberProfiles[personId]) error(label + ' refers to an unknown profile.');
          if (!object(decision, label, ['status', 'basis', 'evidence'])) return;
          if (RS_MEMBERSHIP_STATUSES.indexOf(decision.status) < 0) error(label + ' has an unsupported eligibility status.');
          if (['membership-sheet', 'user-confirmed'].indexOf(decision.basis) < 0) error(label + ' must identify the membership-sheet or user-confirmed basis.');
          if (decision.basis === 'user-confirmed') text(decision.evidence, label + ' private override provenance', true, 1000);
          else if (decision.evidence !== undefined) error(label + ' must not include per-person evidence unless it is a user-confirmed override.');
          if (membershipPeople[personId]) error(label + ' is duplicated.');
          membershipPeople[personId] = true;
        });
      }
    }
    if (season && season.year === 2026 && data.ruleset &&
      data.ruleset.code === 'clubman-sprint-2026-v1' &&
      !entryPolicy && !Object.prototype.hasOwnProperty.call(data, 'membershipReview')) {
      error('a reviewed 2026 membership eligibility map is required before RS scoring can be published.');
    }
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
      if (!object(event, label, ['id', 'name', 'dates', 'startDate', 'nrEventId', 'roundNumber', 'rulesetConfirmed', 'rulesetEvidence', 'countsForChampionship', 'championshipEvidence', 'doublePoints', 'doublePointsEvidence', 'doublePointsBulletinDate', 'starterCount', 'starterCountEvidence'])) return;
      id(event.id, label); text(event.name, label + ' name', true, 200); text(event.dates == null ? '' : event.dates, label + ' dates', false);
      if (event.roundNumber != null && (!Number.isInteger(event.roundNumber) || event.roundNumber < 1)) error(label + ' RS round number must be a positive integer or empty.');
      if (event.roundNumber != null) {
        if (knownRoundNumbers[event.roundNumber]) error(label + ' duplicates RS round number ' + event.roundNumber + '.');
        knownRoundNumbers[event.roundNumber] = true;
      }
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
      if (entryPolicy && typeof event.countsForChampionship !== 'boolean') error(label + ' needs explicit championship or non-scoring status under the entry-based policy.');
      if (entryPolicy && event.countsForChampionship === false && event.roundNumber != null) error(label + ' is non-scoring and must not have a championship round number.');
      text(event.championshipEvidence == null ? '' : event.championshipEvidence, label + ' championship evidence', false, 1000);
      if (event.countsForChampionship === true && !event.championshipEvidence) error(label + ' needs explicit evidence that it is a championship event.');
      if (event.doublePoints != null && typeof event.doublePoints !== 'boolean') error(label + ' double-points status must be true, false or unset.');
      text(event.doublePointsEvidence == null ? '' : event.doublePointsEvidence, label + ' double-points evidence', false, 1000);
      if (event.doublePoints === true && !event.doublePointsEvidence) error(label + ' double points require the official bulletin evidence.');
      if (event.doublePointsBulletinDate != null && dateOrdinal(event.doublePointsBulletinDate) == null) error(label + ' doublePointsBulletinDate must be a real ISO calendar date.');
      if (event.doublePoints === true && (dateOrdinal(event.startDate) == null || dateOrdinal(event.doublePointsBulletinDate) == null)) error(label + ' double points need event start and bulletin issue dates to verify the 14-day notice.');
      else if (event.doublePoints === true && dateOrdinal(event.startDate) - dateOrdinal(event.doublePointsBulletinDate) < 14) error(label + ' double-points bulletin must be issued at least 14 days before the event.');
      if (event.starterCount != null && (!Number.isInteger(event.starterCount) || event.starterCount < 0)) error(label + ' reviewed starter count must be a non-negative integer.');
      text(event.starterCountEvidence == null ? '' : event.starterCountEvidence, label + ' starter-count evidence', false, 1000);
      if ((event.starterCount == null) !== !(event.starterCountEvidence || '').trim()) error(label + ' reviewed starter count and its evidence must be supplied together.');
    });
    (data.results || []).forEach(function (result, i) {
      var label = 'result ' + (i + 1);
      if (!object(result, label, ['id', 'eventId', 'title', 'status', 'nrRoundId', 'stages', 'source', 'notes', 'entries', 'classMappings', 'classMappingEvidence', 'finalityReview', 'currentFinalityReview', 'classOrderReview'])) return;
      id(result.id, label); id(result.eventId, label + ' eventId');
      if (knownResults[result.id]) error(label + ' duplicates result ID ' + result.id + '.');
      knownResults[result.id] = true;
      if (resultEvents[result.eventId]) error(label + ' duplicates the event classification; keep one complete official source per RS event.');
      resultEvents[result.eventId] = true;
      var event = data.events.filter(function (item) { return item.id === result.eventId; })[0];
      if (!event) error(label + ' refers to an unknown RallyeSport event.');
      text(result.title, label + ' title', true);
      text(result.status, label + ' printed status', true);
      if (result.finalityReview != null && object(result.finalityReview, label + ' finality review', ['acceptedForScoring', 'evidence'])) {
        if (result.finalityReview.acceptedForScoring !== true) error(label + ' finality review must explicitly accept the source for scoring.');
        text(result.finalityReview.evidence, label + ' finality review evidence', true, 1000);
      }
      if (Object.prototype.hasOwnProperty.call(result, 'currentFinalityReview') && !currentFinalityAccepted(result, 'rs', true))
        error(label + ' current-finality review is invalid or stale.');
      if (result.nrRoundId != null && result.nrRoundId !== '') {
        if (!nrRounds[result.nrRoundId]) error(label + ' links to an unknown NR round.');
        else if (event && event.nrEventId && event.nrEventId !== nrRounds[result.nrRoundId].eventId) error(label + ' NR round does not belong to its explicitly linked NR event.');
      }
      if (!object(result.source, label + ' source', ['file', 'url', 'description'])) return;
      text(result.source.file == null ? '' : result.source.file, label + ' source file', false);
      text(result.source.description == null ? '' : result.source.description, label + ' source description', false, 1000);
      if (result.source.url) {
        text(result.source.url, label + ' source URL', true, 2000);
        try {
          var sourceUrl = new URL(result.source.url);
          if (sourceUrl.protocol !== 'https:' || sourceUrl.username || sourceUrl.password) error(label + ' source URL must be HTTPS without credentials.');
        } catch (e) { error(label + ' source URL is invalid.'); }
      } else if (!(result.source.file || '').trim() && !(result.source.description || '').trim()) {
        error(label + ' needs an HTTPS source URL or a source file/title or description.');
      }
      text(result.classMappingEvidence == null ? '' : result.classMappingEvidence, label + ' scoring-class mapping evidence', false, 1000);
      if (result.classMappings != null) {
        if (!object(result.classMappings, label + ' class mappings', Object.keys(result.classMappings || {}))) return;
        var mappingKeys = Object.keys(result.classMappings), normalizedMappings = Object.create(null);
        mappingKeys.forEach(function (category) {
          var normalizedCategory = normClass(category), target = normClass(result.classMappings[category]);
          if (!category || normalizedCategory !== category) error(label + ' mapping keys must be normalized printed categories.');
          if (normalizedMappings[normalizedCategory]) error(label + ' has duplicate normalized class mappings for ' + normalizedCategory + '.');
          normalizedMappings[normalizedCategory] = true;
          if (['RS2', 'RS4'].indexOf(target) < 0) error(label + ' maps ' + category + ' to an unsupported scoring class.');
          if (['RS2', 'RS4', 'TEST'].indexOf(normalizedCategory) >= 0 && target !== normalizedCategory) error(label + ' cannot remap a configured RS class or TEST category.');
          if (Array.isArray(result.entries) && !result.entries.some(function (entry) { return normClass(entry['class']) === normalizedCategory; })) {
            error(label + ' has an unused scoring-class mapping for ' + category + '.');
          }
        });
        if (mappingKeys.length && !result.classMappingEvidence) error(label + ' scoring-class mappings need explicit evidence.');
        if (!mappingKeys.length && result.classMappingEvidence) error(label + ' scoring-class mapping evidence has no mapping.');
      } else if (result.classMappingEvidence) error(label + ' scoring-class mapping evidence has no mapping.');
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
      if (Object.prototype.hasOwnProperty.call(result, 'classOrderReview')) {
        if (object(result.classOrderReview, label + ' class-order review', ['version', 'reviewed', 'digest', 'evidence'])) {
          text(result.classOrderReview.evidence, label + ' class-order review evidence', true, 1000);
          var classOrder = rallyeSportClassOrder(result);
          if (classOrder.status !== 'ready') error(label + ' class-order review is invalid or stale: ' + classOrder.reason);
        }
      }
      var cars = Object.create(null), idx = peopleIndex(people);
      result.entries.forEach(function (entry, n) {
        var row = label + ' row ' + (n + 1);
        if (!object(entry, row, ['car', 'driver', 'codriver', 'class', 'vehicle', 'status', 'pos', 'classPos', 'times', 'stagePos', 'penalty', 'total', 'timeEvidence', 'notes', 'invited', 'startEvidence', 'identityReview', 'launchNonScoringReview'])) return;
        text(entry.car, row + ' car', true, 40);
        if (cars[entry.car]) error(row + ' duplicates car ' + entry.car + '.');
        cars[entry.car] = true;
        text(entry.driver, row + ' driver', true); text(entry.codriver == null ? '' : entry.codriver, row + ' co-driver', false);
        if (entry.vehicle !== undefined) text(entry.vehicle, row + ' source vehicle', false, 200);
        text(entry.startEvidence == null ? '' : entry.startEvidence, row + ' start evidence', false, 1000);
        var driver = idx.resolve(entry.driver), codriver = idx.resolve(entry.codriver);
        if (entry.identityReview != null) {
          if (object(entry.identityReview, row + ' identity review', ['driverId', 'codriverId', 'evidence'])) {
            if (entry.identityReview.driverId != null) {
              id(entry.identityReview.driverId, row + ' reviewed driver');
              if (!idx.byId[entry.identityReview.driverId]) error(row + ' reviewed driver refers to an unknown profile.');
            }
            if (entry.identityReview.codriverId != null) {
              id(entry.identityReview.codriverId, row + ' reviewed co-driver');
              if (!idx.byId[entry.identityReview.codriverId]) error(row + ' reviewed co-driver refers to an unknown profile.');
            }
            text(entry.identityReview.evidence, row + ' identity review evidence', true, 1000);
            if (entry.identityReview.driverId && entry.identityReview.driverId === entry.identityReview.codriverId) error(row + ' reviewed driver and co-driver must be distinct profiles.');
            driver = idx.byId[entry.identityReview.driverId] ? { id: entry.identityReview.driverId } : driver;
            codriver = idx.byId[entry.identityReview.codriverId] ? { id: entry.identityReview.codriverId } : codriver;
          }
        }
        if (driver.id && codriver.id && driver.id === codriver.id) error(row + ' assigns the same person to both crew seats.');
        text(entry['class'], row + ' printed RS category', true, 80);
        text(entry.status, row + ' printed status', true, 80);
        var launchException = false;
        if (entry.launchNonScoringReview !== undefined) {
          if (object(entry.launchNonScoringReview, row + ' launch-only RS0 review', ['evidence'])) {
            text(entry.launchNonScoringReview.evidence, row + ' launch-only RS0 evidence', true, 1000);
            launchException = entryPolicy && event && event.countsForChampionship === false && event.roundNumber == null &&
              (entry.status === 'TEST' || normClass(entry['class']) === 'TEST') &&
              typeof entry.launchNonScoringReview.evidence === 'string' && !!entry.launchNonScoringReview.evidence.trim();
          }
          if (!launchException) error(row + ' launch-only RS0 review requires entry-based policy, a non-scoring unnumbered event and retained printed TEST evidence. It is not a season/person exclusion.');
        }
        if ((entryPolicy ? ['classified', 'DNF', 'DNS'] : ['classified', 'DNF', 'DNS', 'TEST']).indexOf(entry.status) < 0 &&
          !(launchException && entry.status === 'TEST')) error(row + ' status is unsupported; use classified, DNF or DNS. TEST is retained only as explicitly reviewed launch source evidence under the entry-based policy.');
        if (entryPolicy && normClass(entry['class']) === 'TEST' && !launchException) error(row + ' TEST is not a supported entry-based class; no automatic mapping is permitted.');
        if (entryPolicy && !launchException && ['RS2', 'RS4'].indexOf(rallyeSportScoringClass(result, entry)) < 0) error(row + ' needs RS2/RS4 or an evidence-backed classification-scoped mapping; RS0 is launch-only.');
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
      if (event && event.starterCount != null && Array.isArray(result.entries) && event.starterCount > result.entries.length) {
        error(label + ' reviewed starter count exceeds the recorded classification rows.');
      }
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
    if (Object.prototype.hasOwnProperty.call(raw, 'currentFinalityReview') && !currentFinalityAccepted(raw, 'nr', true))
      add('error', 'Current-finality review is invalid or stale.');
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
    rallyeSportContractVersion: 2, rallyeSportClassOrderContractVersion: 1, buildRallyeSport: buildRallyeSport, calculateRallyeSportScoring: calculateRallyeSportScoring,
    sha256Text: sha256, rallyeSportClassOrderDigest: rallyeSportClassOrderDigest, rallyeSportClassOrder: rallyeSportClassOrder,
    currentFinalityDigest: currentFinalityDigest, currentFinalityAccepted: currentFinalityAccepted,
    sourceStatusStarted: sourceStatusStarted,
    rallyeSportEntryPolicy: rallyeSportEntryPolicy, rallyeSportLaunchRS0: rallyeSportLaunchRS0,
    projectRallyeSport: projectRallyeSport, buildRallyeSportGraph: buildRallyeSportGraph, parseRallyeSportTime: parseRallyeSportTime, copyReviewedRallyeSportTimes: copyReviewedRallyeSportTimes,
    validateRallyeSport: validateRallyeSport,
    rallyNoticeContractVersion: 1, validateActiveRally: validateActiveRally, nrcDestination: nrcDestination,
    entryContractVersion: 2, parseTime: parseTime, fmtTime: fmtTime, slug: slug, normName: normName, normClass: normClass, ord: ord, r1: r1, prettyJson: prettyJson,
    peopleIndex: peopleIndex, buildSeason: buildSeason, validateRound: validateRound, parseClassificationText: parseClassificationText, parseSpreadsheet: parseSpreadsheet,
    similarNames: similarNames, sumReport: sumReport, spreadsheetTemplate: spreadsheetTemplate,
    validateSeason: validateSeason, validateDataset: validateDataset, validateEntryLists: validateEntryLists, entryEvidenceLoss: entryEvidenceLoss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NREngine = api;
})(typeof window !== 'undefined' ? window : this);
