/* Read-only public display facts. No DOM, provider access or sporting calculations. */
(function (root) {
  'use strict';
  var E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.NREngine;

  /**
   * Home rows use stable identity/role, published rank, points, classes, starts and
   * round contributions. A numeric zero is known; null is unavailable, never zero.
   * Adapters own sporting interpretation; components own wording and markup.
   * @typedef {{id:string,name:string,rank:number|null,points:number|null,
   * classes:string[],starts:number|null,qualifier:string,ineligible:boolean,
   * href:string,bars:Array<{label:string,points:number|null,status:string}>}} HomeRow
   * @typedef {{available:boolean,provisional:boolean,basis:string,reason:string,scope:string}} HomeScoring
   * @typedef {{rounds:number|null,listedRounds:number|null,events:number|null,
   * drivers:number|null,stages:number|null}} HomeCounts
   * @typedef {{id:string,basis:string,href:string,rows:HomeRow[]}} HomeClass
   * @typedef {{year:number,competition:{id:string,name:string},description:string,
   * hasResults:boolean,scoring:HomeScoring,counts:HomeCounts,drivers:HomeRow[],
   * codrivers:HomeRow[],classes:HomeClass[],latestHref:string|null,
   * ineligibleNote:string,
   * links:{standings:string,codriverStandings:string,calendar:string,info:string,
   * crews:string,guide:string}}} HomeDisplay
   */
  function href(year, competition, path, query) {
    var params = Object.assign({}, query, { competition: competition });
    return '#/' + year + path + '?' + Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
  }
  function hasStartEvidence(entry) {
    return !!(entry && typeof entry.startEvidence === 'string' && entry.startEvidence.trim()) ||
      (entry && entry.times || []).some(function (value) { return value != null && value !== ''; }) ||
      (entry && entry.stagePos || []).some(function (value) { return value != null && value !== ''; });
  }
  function rsAppearances(model, id, includeUnresolved) {
    var all = [], rs = model.rallyesport;
    rs.results.forEach(function (result) {
      var score = (rs.scoring.results || []).filter(function (row) { return row.resultId === result.id; })[0];
      result.entries.forEach(function (entry) {
        ['driver', 'codriver'].forEach(function (role) {
          if (!entry[role] || !entry[role + 'Known'] && !includeUnresolved || id && entry[role + 'Id'] !== id) return;
          var scoreEntry = score && score.status === 'ready' && (score.entries || []).filter(function (row) { return row.car === String(entry.car); })[0];
          all.push({
            id: entry[role + 'Known'] ? entry[role + 'Id'] : '',
            key: entry[role + 'Known'] ? entry[role + 'Id'] : result.id + ':' + entry.car + ':' + role,
            name: entry[role], role: role, entry: entry, result: result,
            championshipRound: rs.events.some(function (event) { return event.id === result.eventId && event.countsForChampionship !== false; }),
            eligibility: scoreEntry && scoreEntry[role + 'Eligibility'] || (E.rallyeSportLaunchRS0(entry) ?
              { status: 'launch-only', scoringClass: 'RS0', reason: 'Launch-only user classification; no championship points or rank.' } : null),
            points: scoreEntry && scoreEntry[role + 'Points']
          });
        });
      });
    });
    return all;
  }
  function rsRoundsStarted(model, id, role) {
    var started = Object.create(null), uncertain = Object.create(null);
    rsAppearances(model, id, true).forEach(function (appearance) {
      if (!appearance.championshipRound || appearance.role !== role) return;
      var resultId = appearance.result.id, entry = appearance.entry;
      if (entry.status === 'classified' || entry.status === 'DNF' && hasStartEvidence(entry)) started[resultId] = true;
      else if (entry.status === 'DNF') uncertain[resultId] = true;
    });
    return Object.keys(uncertain).some(function (id) { return !started[id]; }) ? null : Object.keys(started).length;
  }
  function rsPersonRoundPoints(model, id, role, cls) {
    var points = Object.create(null);
    rsAppearances(model, id).filter(function (appearance) {
      return appearance.championshipRound && appearance.role === role && (!cls || appearance.eligibility && appearance.eligibility.scoringClass === cls);
    }).forEach(function (appearance) {
      if (typeof appearance.points !== 'number') return;
      var key = appearance.result.id, value = points[key];
      var scoringClass = !appearance.eligibility ? 'Class unavailable' :
        appearance.eligibility.status === 'eligible' ? appearance.eligibility.scoringClass || 'Class unavailable' : 'RS0';
      var classes = value ? value.classes : Object.create(null);
      if (scoringClass) classes[scoringClass] = (classes[scoringClass] || 0) + appearance.points;
      points[key] = { pts: (value ? value.pts : 0) + appearance.points, o: 0,
        c: (value ? value.pts : 0) + appearance.points, status: appearance.entry.status, classes: classes };
    });
    return points;
  }
  function base(model, key, name, tagline) {
    return {
      year: model.year, competition: { id: key, name: name }, description: tagline || '',
      hasResults: false, scoring: { available: false, provisional: false, basis: '', reason: '', scope: '' },
      counts: { rounds: null, listedRounds: null, events: null, drivers: null, stages: null },
      drivers: [], codrivers: [], classes: [], latestHref: null,
      links: { standings: href(model.year, key, '/standings'), codriverStandings: href(model.year, key, '/standings/codrivers'),
        calendar: href(model.year, key, '/rounds'),
        info: href(model.year, key, '/info'), crews: href(model.year, key, '/crews'), guide: '#/getting-started' }
    };
  }
  function nrHome(model, site) {
    var home = base(model, 'nr', model.championship, site && site.tagline);
    home.hasResults = model.rounds.length > 0;
    var pending = model.rounds.filter(function (round) { return !round.confirmed; });
    home.scoring = {
      available: home.hasResults, provisional: pending.length > 0,
      basis: 'Overall + class points.',
      reason: pending.length ? 'Awaiting championship confirmation: ' + pending.map(function (round) { return 'R' + round.n; }).join(', ') + '.' : '',
      scope: 'Starts include recorded championship credits. Entries and DNS do not create starts.'
    };
    function row(raw, rank) {
      return { id: raw.id, name: raw.name, rank: rank == null ? raw.rank : rank,
        points: raw.total, classes: raw.cls ? [raw.cls] : [], starts: raw.starts,
        qualifier: raw.eligible ? 'Eligible' : 'Minimum starts not met',
        ineligible: raw.eligible === false,
        href: href(model.year, 'nr', '/person/' + encodeURIComponent(raw.id)),
        bars: model.rounds.map(function (round) {
          var value = raw.rounds[round.id];
          return { label: 'R' + round.n, points: value ? value.pts : null,
            status: value ? value.status : 'No recorded start' };
        }) };
    }
    function eligibilityNote(rows) {
      return rows.some(function (value) { return value.ineligible; }) ?
        '* Minimum starts not met.' : '';
    }
    home.drivers = model.standings.drivers.map(function (raw) { return row(raw); });
    home.codrivers = model.standings.codrivers.map(function (raw) { return row(raw); });
    home.classes = model.classes.filter(function (cls) {
      return !cls.classOnly || model.standings.drivers.some(function (raw) { return raw.cls === cls.id; });
    }).map(function (cls) {
      return { id: cls.id, basis: 'Overall standings filtered by class.',
        href: href(model.year, 'nr', '/standings', { 'class': cls.id }),
        rows: model.standings.drivers.filter(function (raw) { return raw.cls === cls.id; })
          .map(function (raw, i) { return row(raw, i + 1); }) };
    });
    home.ineligibleNote = eligibilityNote(home.drivers.slice(0, 5).concat(home.drivers.filter(function (row) {
      return row.rank === 1;
    }), home.codrivers.slice(0, 5), home.codrivers.filter(function (row) { return row.rank === 1; }),
      home.classes.reduce(function (rows, cls) { return rows.concat(cls.rows.slice(0, 3)); }, [])));
    home.counts = { rounds: model.rounds.length, listedRounds: model.calendar.length,
      events: model.events.length, drivers: home.hasResults ? home.drivers.length : null,
      stages: home.hasResults ? model.rounds.reduce(function (sum, round) { return sum + round.stages.length; }, 0) : null };
    if (home.hasResults) home.latestHref = href(model.year, 'nr', '/round/' + encodeURIComponent(model.rounds[model.rounds.length - 1].id));
    return home;
  }
  function rsHome(model, site) {
    var home = base(model, 'rs', 'RallyeSport', site && site.tagline);
    var rs = model.rallyesport, scoring = rs.scoring;
    var tables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
    var counted = rs.events.filter(function (event) { return event.countsForChampionship !== false; });
    var results = counted.map(function (event) {
      return rs.results.filter(function (result) { return result.eventId === event.id; })[0];
    }).filter(Boolean);
    home.hasResults = rs.results.length > 0;
    home.scoring = {
      available: !!tables, provisional: !!tables && scoring.status !== 'ready',
      basis: 'Class points also form the overall total; no separate overall award.',
      reason: scoring.reason || '',
      scope: 'Starts require championship-round evidence. Event and stage counts include non-scoring events; championship figures exclude them.'
    };
    function rows(key) { return tables && tables[key] || []; }
    function row(raw, role) {
      var classes = ['RS2', 'RS4'].filter(function (cls) {
        var classTable = tables && tables[role === 'driver' ? 'classDrivers' : 'classCodrivers'];
        return classTable && (classTable[cls] || []).some(function (value) { return value.id === raw.id && value.rank != null; });
      });
      var hasRound = rsAppearances(model, raw.id, true).some(function (appearance) {
        return appearance.championshipRound && appearance.role === role;
      });
      var points = rsPersonRoundPoints(model, raw.id, role);
      return { id: raw.id, name: raw.name, rank: raw.rank, points: raw.points, classes: classes,
        starts: hasRound ? rsRoundsStarted(model, raw.id, role) : null,
        qualifier: raw.eligibilityStatus === 'eligible' ? 'Eligible' : 'Scoring status unavailable',
        ineligible: raw.eligibilityStatus != null && raw.eligibilityStatus !== 'eligible',
        href: href(model.year, 'rs', '/person/' + encodeURIComponent(raw.id)),
        bars: results.map(function (result) {
          var event = counted.filter(function (event) { return event.id === result.eventId; })[0], value = points[result.id];
          return { label: event.roundNumber == null ? 'Round unavailable' : 'R' + event.roundNumber,
            points: value ? value.pts : null, status: value ? value.status : 'No scored result' };
        }) };
    }
    home.drivers = rows('overallDrivers').filter(function (raw) { return raw.rank != null; }).map(function (raw) { return row(raw, 'driver'); });
    home.codrivers = rows('overallCodrivers').filter(function (raw) { return raw.rank != null; }).map(function (raw) { return row(raw, 'codriver'); });
    home.classes = ['RS2', 'RS4'].map(function (cls) {
      return { id: cls, basis: 'Class standings.', href: href(model.year, 'rs', '/standings', { 'class': cls }),
        rows: (tables && tables.classDrivers[cls] || []).filter(function (raw) { return raw.rank != null; })
          .map(function (raw) { return row(raw, 'driver'); }) };
    });
    var visibleRows = home.drivers.slice(0, 5).concat(home.drivers.filter(function (row) { return row.rank === 1; }),
      home.codrivers.slice(0, 5), home.codrivers.filter(function (row) { return row.rank === 1; }),
      home.classes.reduce(function (all, cls) { return all.concat(cls.rows.slice(0, 3)); }, []));
    home.ineligibleNote = visibleRows.some(function (value) { return value.ineligible; }) ?
      '* RS0 · Non-Scoring; this does not establish non-membership.' : '';
    home.counts = { rounds: results.length, listedRounds: counted.length, events: rs.events.length,
      drivers: tables ? home.drivers.length : null,
      stages: home.hasResults ? rs.results.reduce(function (sum, result) { return sum + result.stages.length; }, 0) : null };
    var latest = rs.events.slice().reverse().map(function (event) {
      return rs.results.filter(function (result) { return result.eventId === event.id; })[0];
    }).filter(Boolean)[0];
    if (latest) home.latestHref = href(model.year, 'rs', '/rallyesport/' + encodeURIComponent(latest.id) + '/graph');
    return home;
  }
  /** @returns {HomeDisplay} */
  function home(model, competition, site) {
    if (competition === 'nr') return nrHome(model, site);
    if (competition === 'rs') return rsHome(model, site);
    throw new Error('Unsupported public display competition: ' + competition);
  }
  /**
   * Event links carry their source owner, never an implied classification identity.
   * @typedef {{url:string,label:string}} EventLink
   * @typedef {{driver:string,codriver:string}|null} Winner
   * @typedef {{id:string,label:string,event:string,date:string,dateIso:string,day:string,
   * scope:string,href:string|null,classificationHref:string|null,source:EventLink[],
   * published:boolean,state:string,stages:number|null,classified:number|null,
   * entryNote:string,winner:Winner,classWinners:Object<string,Winner>}} RoundDisplay
   * @typedef {{id:string,name:string,badge:string,date:string,dateSource:string,sortDate:string,
   * venue:string,surface:string,scope:string,entryNote:string,links:EventLink[],
   * related:Array<{label:string,links:EventLink[]}>,rounds:RoundDisplay[]}} EventDisplay
   * @typedef {{year:number,classes:string[],events:EventDisplay[]}} CalendarDisplay
   */
  function dateIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    var date = new Date(value + 'T12:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === value ? value : '';
  }
  function dateTextIso(value) {
    if (dateIso(value)) return value;
    var match = /^\s*(\d{1,2})(?:\s*(?:\/|–|-)\s*(\d{1,2}))?\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(String(value || ''));
    var months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
      may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
      oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    if (!match) return '';
    var month = months[match[3].toLowerCase()];
    if (!month) return '';
    var prefix = match[4] + '-' + String(month).padStart(2, '0') + '-';
    if (match[2] && (Number(match[2]) < Number(match[1]) || !dateIso(prefix + match[2].padStart(2, '0')))) return '';
    return dateIso(prefix + match[1].padStart(2, '0'));
  }
  function displayDate(value) {
    var text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && !dateIso(text) ? '' : text;
  }
  function eventLinks(event, list) {
    var links = event.links || {};
    var values = [['results', 'Official results'], ['entryList', 'Entry list'], ['srs', 'Supplementary regs'],
      ['noticeboard', 'Noticeboard'], ['spectatorGuide', 'Spectator guide']].filter(function (item) {
      return !!links[item[0]];
    }).map(function (item) { return { url: links[item[0]], label: item[1] }; });
    if (list && list.source && list.source.url && String(list.source.url).trim() !== String(links.entryList || '').trim())
      values.push({ url: list.source.url, label: 'Entry source' });
    return values;
  }
  function nrEventDate(model, event) {
    var dates = model.calendar.filter(function (row) { return row.eventId === event.id; })
      .map(function (row) { return dateIso(row.date); }).filter(Boolean).sort();
    var iso = dateIso(event.startDate) || dates[0] || dateTextIso(event.dates);
    return { text: displayDate(event.dates) || dateIso(event.startDate) || dates.join(' / '), iso: iso || '', source: 'event' };
  }
  function rsEventDate(model, event) {
    if (event.dates || dateIso(event.startDate))
      return { text: displayDate(event.dates) || dateIso(event.startDate), iso: dateIso(event.startDate) || dateTextIso(event.dates), source: 'event' };
    var linked = model.events.filter(function (row) { return row.id === event.nrEventId; })[0];
    if (linked) {
      var date = nrEventDate(model, linked);
      return { text: date.text, iso: date.iso, source: 'Related NR event dates' };
    }
    return { text: '', iso: '', source: 'event' };
  }
  function classification(result, mode, score) {
    if (!result) return 'Not published';
    if (mode === 'rs' && (result.notes || []).some(function (note) {
      return /results are final pending post[- ]event technical checks/i.test(note);
    })) return 'Pending technical checks';
    if (mode === 'rs' && score && score.status === 'ready') return 'Final classification';
    if (result.provisional || /provisional/i.test(result.status || '')) return 'Provisional classification';
    var finalHeading = mode === 'nr' ? /^\s*final\s+(?:official\s+)?classification(?:\s+\d+\/\d+)?\s*$/i :
      /^\s*final(?:\s+official)?\s+(?:classification|results)(?:\s+\d+\/\d+)?\s*$/i;
    if (!result.finalityUnclear && finalHeading.test(result.status || ''))
      return 'Final classification';
    return 'Finality unclear';
  }
  function sourceWinner(result, mode, cls) {
    var entries = result.entries.filter(function (entry) {
      var effective = mode === 'nr' ? entry.cls : E.rallyeSportLaunchRS0(entry) ? 'RS0' :
        (result.classMappings || {})[E.normClass(entry['class'])] || entry['class'];
      return entry.status === 'classified' && Number.isInteger(entry.pos) && entry.pos > 0 && (!cls || effective === cls);
    });
    var useClassPos = !!cls && entries.length && entries.every(function (entry) {
      return Number.isInteger(entry.classPos) && entry.classPos > 0;
    });
    function position(entry) { return useClassPos ? entry.classPos : entry.pos; }
    entries.sort(function (a, b) { return position(a) - position(b); });
    if (!entries.length || !cls && position(entries[0]) !== 1 ||
      entries.length > 1 && position(entries[0]) === position(entries[1])) return null;
    if (!(cls && mode === 'nr' ? entries[0].champDriver : entries[0].driver)) return null;
    return { driver: cls && mode === 'nr' ? entries[0].champDriver : entries[0].driver,
      codriver: cls && mode === 'nr' ? entries[0].champCodriver : entries[0].codriver };
  }
  function roundDisplay(model, mode, event, meta, result, classes, entryNote) {
    var score = mode === 'rs' && (model.rallyesport.scoring.results || []).filter(function (row) {
      return result && row.resultId === result.id;
    })[0];
    var state = classification(result, mode, score), final = state === 'Final classification';
    var path = mode === 'nr' ? '/round/' + encodeURIComponent(meta.id) :
      result ? '/rallyesport/' + encodeURIComponent(result.id) : '';
    var row = { id: meta.id, label: meta.label, event: event.name, date: meta.date || '',
      dateIso: dateIso(meta.date) || dateTextIso(meta.date), day: meta.day || '',
      scope: event.countsForChampionship === false ? 'Non-scoring event · not a championship round' : 'Championship round',
      href: path ? href(model.year, mode, path + (mode === 'rs' ? '/graph' : '')) : null,
      classificationHref: result ? href(model.year, mode, path + '/classification') : null,
      source: result && result.source && result.source.url ? [{ url: result.source.url, label: 'Source' }] : [],
      published: !!result, state: state, stages: result ? result.stages.length : null,
      classified: result ? result.entries.filter(function (entry) { return entry.status === 'classified'; }).length : null,
      entryNote: entryNote || '', winner: final ? sourceWinner(result, mode, '') : null, classWinners: {} };
    classes.forEach(function (cls) { row.classWinners[cls] = final ? sourceWinner(result, mode, cls) : null; });
    return row;
  }
  function nrCalendar(model) {
    var classes = model.classes.map(function (cls) { return cls.id; });
    return { year: model.year, classes: classes, events: model.events.map(function (event) {
      var list = model.entryLists.filter(function (row) { return row.eventId === event.id; })[0];
      var date = nrEventDate(model, event);
      return { id: event.id, name: event.name, badge: 'NR', date: date.text, dateSource: date.source,
        sortDate: date.iso, venue: event.venue || '', surface: event.surface || '', scope: 'Championship event',
        entryNote: list && (list.eventEntries || list.complete) ? list.eventEntries + ' documented event ' +
          (list.eventEntries === 1 ? 'entry' : 'entries') +
          (list.complete ? '' : ' (partial)') : '',
        links: eventLinks(event, list), related: [],
        rounds: model.calendar.filter(function (row) { return row.eventId === event.id; }).map(function (meta) {
          var result = model.rounds.filter(function (row) { return row.id === meta.id; })[0], note = '';
          if (list) {
            var count = list.entries.filter(function (entry) { return entry.roundIds.indexOf(meta.id) >= 0; }).length;
            var unknown = list.entries.some(function (entry) { return !entry.roundIds.length; });
            var complete = list.complete && list.roundIds.indexOf(meta.id) >= 0 && !unknown;
            note = count || complete ? count + ' documented round ' + (count === 1 ? 'entry' : 'entries') +
              (complete ? '' : ' (partial day coverage)') : 'round entry coverage ' + (unknown ? 'unknown' : 'incomplete');
            if (unknown && count) note += '; other entries have unknown day scope';
          }
          return roundDisplay(model, 'nr', event, { id: meta.id, label: 'R' + meta.n,
            date: dateIso(meta.date), day: meta.day }, result, classes, note);
        }) };
    }) };
  }
  function rsCalendar(model) {
    var classes = ['RS2', 'RS4'];
    return { year: model.year, classes: classes, events: model.rallyesport.events.map(function (event) {
      var linked = model.events.filter(function (row) { return row.id === event.nrEventId; })[0];
      var list = linked && model.entryLists.filter(function (row) { return row.eventId === linked.id; })[0];
      var date = rsEventDate(model, event);
      var relatedLinks = linked ? eventLinks(linked, list) : [];
      var result = model.rallyesport.results.filter(function (row) { return row.eventId === event.id; })[0];
      return { id: event.id, name: event.name, badge: 'RS', date: date.text, dateSource: date.source,
        sortDate: date.iso, venue: event.venue || '', surface: event.surface || '',
        scope: event.countsForChampionship === false ? 'Non-scoring event · not a championship round' : 'Championship event',
        entryNote: '', links: eventLinks(event),
        related: relatedLinks.length ? [{ label: 'Related NR event links', links: relatedLinks }] : [],
        rounds: [roundDisplay(model, 'rs', event, { id: event.id,
          label: event.countsForChampionship === false ? 'Launch event' : event.roundNumber == null ? 'Round unavailable' : 'R' + event.roundNumber,
          date: date.source === 'event' ? date.text : '' }, result, classes, '')] };
    }) };
  }
  /** @returns {CalendarDisplay} */
  function calendar(model, mode) {
    var display;
    if (mode === 'nr') display = nrCalendar(model);
    else if (mode === 'rs') display = rsCalendar(model);
    else if (mode === 'all') {
      display = nrCalendar(model);
      var parents = display.events.slice();
      var rs = rsCalendar(model);
      display.classes = display.classes.concat(rs.classes);
      rs.events.forEach(function (event) {
        var source = model.rallyesport.events.filter(function (row) { return row.id === event.id; })[0];
        var parent = parents.filter(function (row) { return row.id === source.nrEventId; })[0];
        if (!parent) display.events.push(event);
        else {
          parent.badge = 'NR + RS';
          event.rounds.forEach(function (row) { row.label = 'RS ' + row.label; });
          parent.rounds = parent.rounds.concat(event.rounds);
          if (event.links.length) parent.related.push({ label: 'Related RS event links', links: event.links });
        }
      });
    } else throw new Error('Unsupported calendar competition: ' + mode);
    display.events = display.events.map(function (event, index) { return { event: event, index: index }; })
      .sort(function (a, b) {
        var first = a.event.sortDate, second = b.event.sortDate;
        if (first && second && first !== second) return first < second ? -1 : 1;
        if (!!first !== !!second) return first ? -1 : 1;
        return a.index - b.index;
      }).map(function (row) { return row.event; });
    return display;
  }
  /**
   * Standings extend HomeRow without changing sporting order or published totals.
   * Columns contain source-owned round links; cells distinguish missing from zero.
   * Filtered NR positions are ordinals within the filtered overall order, not
   * independent class awards. RS positions always come from the published table.
   * @typedef {{points:number|null,status:string,detail:string,description:string}} PointsDisplay
   * @typedef {{label:string,selected:boolean,href:string}} StandingsControl
   * @typedef {HomeRow & {overallRank:number|null,classPoints:number|null,
   * ineligible:boolean,cells:PointsDisplay[]}} StandingsRow
   * @typedef {{year:number,title:string,role:string,selectedClass:string,showBreak:boolean,
   * hasResults:boolean,emptyState:'no-results'|'unavailable'|'no-starts'|'no-points',
   * scoring:HomeScoring,classes:Array<{id:string,description:string}>,
   * columns:Array<{id:string,label:string,name:string,description:string,href:string,note:string}>,
   * rows:StandingsRow[],notes:Array<{text:string,links:Array<{label:string,url:string}>}>,
   * links:{calendar:string,crews:string},
   * controls:{roles:StandingsControl[],classes:StandingsControl[],points:StandingsControl[]}}} StandingsDisplay
   */
  function rsStarterMinimumNote(scoring, year) {
    if (year !== 2026 || !scoring.starterMinimum) return '';
    return scoring.starterMinimum.basis === 'user-reported-review' ?
      '2026 RS event minimum: 6 source-backed starters; DNS does not count. This is a user-reported review. Published SSR V1 states 15; no written amendment is recorded.' :
      '2026 RS event minimum: 15 starters as printed in SSR V1.';
  }
  function standingsHref(model, mode, role, cls, split) {
    var query = {};
    if (cls) query['class'] = cls;
    if (split) query.pts = 'split';
    return href(model.year, mode, '/standings' + (role === 'codriver' ? '/codrivers' : ''), query);
  }
  /** @returns {StandingsDisplay} */
  function standings(model, mode, role, query) {
    if (role !== 'driver' && role !== 'codriver') throw new Error('Unsupported standings role: ' + role);
    var overview = home(model, mode), q = query || {}, display = {
      year: model.year, title: role === 'driver' ? 'Drivers' : 'Co-drivers', role: role,
      selectedClass: '', showBreak: q.pts === 'split', hasResults: overview.hasResults,
      emptyState: !overview.hasResults ? 'no-results' : !overview.scoring.available ? 'unavailable' : 'no-points',
      scoring: Object.assign({}, overview.scoring), classes: [], columns: [], rows: [], notes: [],
      links: Object.assign({}, overview.links), controls: { roles: [], classes: [], points: [] }
    };
    var homeRows = role === 'driver' ? overview.drivers : overview.codrivers;
    function note(text, links) { if (text) display.notes.push({ text: text, links: links || [] }); }
    function cell(value, missing, detail, description) {
      return { points: value ? value.pts : null, status: value ? value.status : missing,
        detail: value ? detail : '', description: value ? description : missing };
    }
    if (mode === 'nr') {
      if (display.scoring.provisional) display.scoring.reason +=
        ' Points are calculated here from the official classifications, not yet confirmed by MSA.';
      var used = {};
      model.rounds.forEach(function (round) { round.entries.forEach(function (entry) { used[entry.cls] = true; }); });
      display.classes = model.classes.filter(function (cls) { return !cls.classOnly || used[cls.id]; })
        .map(function (cls) { return { id: cls.id, description: cls.desc || '' }; });
      display.selectedClass = display.classes.some(function (cls) { return cls.id === q['class']; }) ? q['class'] : '';
      display.columns = model.rounds.map(function (round) {
        var event = model.events.filter(function (event) { return event.id === round.eventId; })[0];
        return { id: round.id, label: 'R' + round.n, name: event ? event.short || event.name : round.name || round.id,
          description: (event ? event.name : round.eventId || round.id) + (round.day ? ' · ' + round.day : ''),
          href: href(model.year, mode, '/round/' + encodeURIComponent(round.id)),
          note: round.confirmed ? '' : 'Calculated on this site from the official classification; not yet in the MSA standings.' };
      });
      var rawRows = role === 'driver' ? model.standings.drivers : model.standings.codrivers;
      if (overview.hasResults && !rawRows.length) display.emptyState = 'no-starts';
      display.rows = rawRows.filter(function (raw) { return !display.selectedClass || raw.cls === display.selectedClass; })
        .map(function (raw, index) {
          var row = Object.assign({}, homeRows.filter(function (row) { return row.id === raw.id; })[0]);
          row.rank = display.selectedClass ? index + 1 : raw.rank;
          row.overallRank = raw.rank;
          row.ineligible = !raw.eligible;
          row.classPoints = 0;
          row.cells = model.rounds.map(function (round) {
            var value = raw.rounds[round.id];
            if (value) row.classPoints += value.c;
            return cell(value, 'No recorded championship start', value && (value.status === 'DNF' ? 'DNF' : value.o + '+' + value.c),
              value && (value.status === 'DNF' ? 'DNF (started, 0 points)' +
                (value.msaOnly ? ' — start recorded by MSA; car not on the sheet' : '') :
                value.pos + ' overall (' + value.o + ') + ' + value.classPos + ' in ' + value.cls + ' (' + value.c + ') · car ' + value.car));
          });
          return row;
        });
      if (overview.hasResults) note('Overall + class points · Minimum ' + model.minStarts + ' starts for eligibility.');
      if (display.selectedClass) note('This view filters the overall table. Pos follows that order; Overall pos retains the overall rank. Class pts sums the recorded class awards, not an independent class championship.');
      note('Fewer than ' + model.minStarts + ' starts: listed after eligible crews. Ties: most 1st places, then 2nd places, continuing through all recorded finishes, then name.');
      var confirmation = nrConfirmation(model);
      if (confirmation) note(confirmation,
        (model.msa.url ? [{ label: model.msa.label || 'MSA standings', url: model.msa.url }] : [])
          .concat([{ label: 'Data notes', url: href(model.year, mode, '/about') }]));
    } else {
      var rs = model.rallyesport, scoring = rs.scoring, entryPolicy = E.rallyeSportEntryPolicy(rs);
      var tables = scoring.status === 'ready' ? scoring.standings : scoring.provisionalStandings;
      display.classes = (entryPolicy ? ['RS2', 'RS4'] : ['RS2', 'RS4', 'RS0'])
        .map(function (cls) { return { id: cls, description: '' }; });
      display.selectedClass = display.classes.some(function (cls) { return cls.id === q['class']; }) ? q['class'] : '';
      var overall = tables && tables[role === 'driver' ? 'overallDrivers' : 'overallCodrivers'] || [];
      var classTables = tables && tables[role === 'driver' ? 'classDrivers' : 'classCodrivers'] || {};
      var selected = display.selectedClass ? classTables[display.selectedClass] || [] : overall;
      display.columns = rs.events.filter(function (event) { return event.countsForChampionship !== false; })
        .map(function (event) {
          var result = rs.results.filter(function (result) { return result.eventId === event.id; })[0];
          if (!result) return null;
          var score = (scoring.results || []).filter(function (score) { return score.resultId === result.id; })[0];
          return { id: result.id, label: event.roundNumber == null ? event.name : 'R' + event.roundNumber,
            name: event.name, description: event.name,
            href: href(model.year, mode, '/rallyesport/' + encodeURIComponent(result.id) + '/classification'),
            note: score && score.status === 'ready' ? '' : 'Points unavailable; excluded from cumulative totals.' };
        }).filter(Boolean);
      display.rows = selected.map(function (raw) {
        var known = homeRows.filter(function (row) { return row.id === raw.id; })[0];
        var appearances = known ? [] : rsAppearances(model, raw.id, true);
        var byRound = rsPersonRoundPoints(model, raw.id, role, display.selectedClass);
        var overallRow = overall.filter(function (row) { return row.id === raw.id; })[0];
        var row = Object.assign({}, known || {
          id: raw.id, name: raw.name, classes: [], bars: [],
          starts: appearances.some(function (item) { return item.championshipRound && item.role === role; }) ?
            rsRoundsStarted(model, raw.id, role) : null,
          href: href(model.year, mode, '/person/' + encodeURIComponent(raw.id))
        });
        row.rank = raw.rank; row.points = raw.points;
        row.classes = raw.rank == null ? ['RS0'] : ['RS2', 'RS4'].filter(function (cls) {
          return (!display.selectedClass || display.selectedClass === cls) &&
            (classTables[cls] || []).some(function (person) { return person.id === raw.id && person.rank != null; });
        });
        row.qualifier = raw.rank == null ? 'RS0 Non-Scoring SSR 6.1' : 'Eligible';
        row.ineligible = raw.rank == null;
        row.overallRank = overallRow ? overallRow.rank : null;
        row.classPoints = raw.points;
        row.cells = display.columns.map(function (column) {
          var value = byRound[column.id];
          var detail = value ? (value.status === 'DNF' ? 'DNF · ' : '') +
            Object.keys(value.classes).map(function (cls) { return cls + ' ' + value.classes[cls]; }).join(' · ') : '';
          return cell(value, 'Unavailable / no scored result', detail, value && value.status + ' · ' + detail);
        });
        return row;
      });
      note('Overall totals reuse class points; no separate overall points are added. Each round shows its scoring class in the points breakdown. Equal totals share a rank; championship tie-breaks remain unresolved.');
      if (display.selectedClass) note('This view uses independent published class ranks and class totals. Overall pos retains the published overall rank.');
      if (entryPolicy) note('User-confirmed entry-based eligibility applies to drivers and co-drivers. Membership, licence and invitation do not exclude championship entrants. DNS and DNF start-evidence rules remain. This is not a printed SSR amendment. Non-scoring events remain in event history, not championship totals or round counts.');
      else note('RS0 Non-Scoring SSR 6.1 · No championship points or rank; not a declaration of non-membership.');
      note(rsStarterMinimumNote(scoring, model.year));
      if (scoring.provisionalStandings && scoring.status !== 'ready') note('Provisional cumulative points: ready events only; blocked events are excluded, not scored as zero.');
      (scoring.excludedProvisionalEvents || []).forEach(function (excluded) {
        var event = rs.events.filter(function (event) { return event.id === excluded.eventId; })[0];
        note('Not scored: ' + (event ? event.name : excluded.eventId) + ' — ' + excluded.reason);
      });
    }
    var selectedClass = display.classes.filter(function (cls) { return cls.id === display.selectedClass; })[0];
    if (selectedClass) note(selectedClass.description);
    if (display.rows.some(function (row) { return row.ineligible; }))
      display.ineligibleNote = mode === 'nr' ? '* Minimum starts not met.' :
        '* RS0 Non-Scoring SSR 6.1: no championship rank or points; this does not establish non-membership.';
    ['driver', 'codriver'].forEach(function (other) {
      display.controls.roles.push({ label: other === 'driver' ? 'Drivers' : 'Co-drivers', selected: role === other,
        href: standingsHref(model, mode, other, display.selectedClass, display.showBreak) });
    });
    [{ id: '' }].concat(display.classes).forEach(function (cls) {
      display.controls.classes.push({ label: cls.id || 'All classes', selected: display.selectedClass === cls.id,
        href: standingsHref(model, mode, role, cls.id, display.showBreak) });
    });
    [false, true].forEach(function (split) {
      display.controls.points.push({ label: split ? 'Points breakdown' : 'Points', selected: display.showBreak === split,
        href: standingsHref(model, mode, role, display.selectedClass, split) });
    });
    return display;
  }
  var RESULT_METRICS = [
    { id: 'pos', label: 'Position', kind: 'rank', final: true, help: 'Position within this competition after each stage (stage times only). “Final” is the official classification, including penalties, not a certification of source finality.' },
    { id: 'gap', label: 'Gap to leader', kind: 'time', final: true, help: 'Cumulative time behind this competition’s leader after each stage. “Final” uses official totals, including penalties.' },
    { id: 'cpos', label: 'Class position', kind: 'rank', final: true, help: 'Position within each crew’s classification class after each stage. “Final” is the official class order.' },
    { id: 'cgap', label: 'Class gap', kind: 'time', final: true, help: 'Cumulative time behind the leader of the same classification class after each stage.' },
    { id: 'loss', label: 'Time lost', kind: 'time', final: false, help: 'Time lost to the fastest time in this competition on each stage (official stage times).' },
    { id: 'spos', label: 'Stage result', kind: 'rank', final: false, help: 'Official stage position printed on the classification; missing positions are not inferred from times.' }
  ];
  function orderedResultEntries(entries) {
    return entries.filter(function (entry) { return entry.status === 'classified'; })
      .sort(function (a, b) { return a.pos - b.pos; }).concat(
        entries.filter(function (entry) { return entry.status !== 'classified'; }).sort(function (a, b) {
          if (a.status !== b.status) return a.status === 'DNF' ? -1 : 1;
          return (b.stagesCompleted || 0) - (a.stagesCompleted || 0);
        }));
  }
  function resultClass(result, entry) {
    return E.rallyeSportLaunchRS0(entry) ? 'RS0' : (result.classMappings || {})[E.normClass(entry['class'])] || entry['class'];
  }
  function launchEligibility(entry) {
    return E.rallyeSportLaunchRS0(entry) ?
      { status: 'launch-only', scoringClass: 'RS0', reason: 'Launch-only user classification; no championship points or rank.' } : null;
  }
  /**
   * Normalized graph data, not a synthetic NR round. Progressions retain the engine's
   * own source axes/positions. Precision is explicit for both competitions.
   * @typedef {{car:string,driver:string,codriver:string,driverId:string,codriverId:string,
   * driverHref:string|null,codriverHref:string|null,status:string,pos:number|null,
   * classPos:number|null,cls:string,printedClass:string,vehicle:string,
   * times:Array<number|null>,stagePos:Array<number|null>,total:number|null,pen:number|null,
   * totalText:string,penaltyText:string,seriesKey:string,scoringNote:string}} ResultGraphEntry
   * @typedef {{cum:Array<number|null>,pos:Array<number|null>,cpos:Array<number|null>,
   * gap:Array<number|null>,cgap:Array<number|null>,delta:Array<number|null>}} ResultProgression
   * @typedef {{id:string,name:string,timePrecision:number,stages:string[],labels:string[],
   * entries:ResultGraphEntry[],progression:Object<string,ResultProgression>,
   * classes:string[],metrics:Array<{id:string,label:string,kind:string,final:boolean,help:string}>}} ResultGraph
   */
  function resultGraph(model, mode, id) {
    if (mode !== 'nr' && mode !== 'rs') throw new Error('Unsupported result competition: ' + mode);
    var raw = (mode === 'nr' ? model.rounds : model.rallyesport.results).filter(function (row) { return row.id === id; })[0];
    if (!raw) return null;
    var events = mode === 'nr' ? model.events : model.rallyesport.events;
    var event = events.filter(function (event) { return event.id === raw.eventId; })[0] || { name: raw.eventId };
    var graph = { id: raw.id, name: event.name, timePrecision: 1, stages: [], labels: [],
      entries: [], progression: {}, classes: [], metrics: RESULT_METRICS };
    if (mode === 'nr') {
      graph.stages = raw.stages.slice(); graph.labels = raw.labels.slice(); graph.progression = raw.progression;
      graph.entries = raw.entries.map(function (entry) {
        return Object.assign({}, entry, { seriesKey: entry.car, printedClass: entry.printedClass,
          driverHref: entry.driverId ? href(model.year, mode, '/person/' + encodeURIComponent(entry.driverId)) : null,
          codriverHref: entry.codriverId ? href(model.year, mode, '/person/' + encodeURIComponent(entry.codriverId)) : null,
          totalText: entry.total == null ? '—' : E.fmtTime(entry.total, true),
          penaltyText: entry.pen == null ? '—' : E.fmtTime(entry.pen), scoringNote: '' });
      });
    } else {
      var score = (model.rallyesport.scoring.results || []).filter(function (row) { return row.resultId === id; })[0], byCar = {};
      (score && score.entries || []).forEach(function (row) { byCar[row.car] = row; });
      graph.stages = raw.stages.map(function (stage) { return stage.label || stage.id; });
      graph.labels = graph.stages.concat(['Final']);
      graph.entries = raw.entries.map(function (entry) {
        var points = byCar[String(entry.car)] || {}, driver = points.driverEligibility || launchEligibility(entry);
        var codriver = points.codriverEligibility || (entry.codriver ? launchEligibility(entry) : null);
        var classPosition = rsClassPosition(raw, entry);
        return { car: String(entry.car), status: entry.status, pos: entry.pos, classPos: classPosition.value,
          classPosCalculated: classPosition.calculated,
          driver: entry.driver, codriver: entry.codriver, driverId: entry.driverId, codriverId: entry.codriverId,
          vehicle: entry.vehicle, cls: resultClass(raw, entry), printedClass: entry['class'],
          seriesKey: 'RS:' + raw.id + ':' + entry.car,
          driverHref: entry.driverKnown ? href(model.year, mode, '/person/' + encodeURIComponent(entry.driverId)) : null,
          codriverHref: entry.codriverKnown ? href(model.year, mode, '/person/' + encodeURIComponent(entry.codriverId)) : null,
          driverEligibility: driver ? { status: driver.status, scoringClass: driver.scoringClass } : null,
          codriverEligibility: codriver ? { status: codriver.status, scoringClass: codriver.scoringClass } : null,
          scoringNote: [['Driver', driver], ['Co-driver', codriver]].filter(function (row) { return row[1] && row[1].status !== 'eligible'; })
            .map(function (row) { return row[0] + ' championship scoring: RS0 · Non-Scoring*'; }).join('; '),
          times: raw.stages.map(function (stage, i) { return E.parseRallyeSportTime((entry.times || [])[i]); }),
          stagePos: raw.stages.map(function (stage, i) { return (entry.stagePos || [])[i] == null ? null : entry.stagePos[i]; }),
          totalText: entry.total || '—', penaltyText: entry.penalty || '—',
          total: E.parseRallyeSportTime(entry.total), pen: E.parseRallyeSportTime(entry.penalty) };
      });
      var source = Object.assign({}, raw, { stages: raw.stages.map(function (stage) {
        return Object.assign({}, stage, { nrStage: stage.id });
      }) });
      RESULT_METRICS.forEach(function (metric) {
        E.buildRallyeSportGraph(source, raw.stages.map(function (stage) { return stage.id; }), metric.id).forEach(function (series) {
          var car = String(series.entry.car);
          if (!graph.progression[car]) graph.progression[car] = { cum: series.cumulative };
          graph.progression[car][metric.id === 'loss' ? 'delta' : metric.id] = series.values;
          graph.timePrecision = Math.max(graph.timePrecision, series.timePrecision);
        });
      });
    }
    graph.classes = mode === 'nr' ? model.classes.map(function (cls) { return cls.id; }).filter(function (cls) {
      return graph.entries.some(function (entry) { return entry.cls === cls; });
    }) : Array.from(new Set(graph.entries.map(function (entry) { return entry.cls; })));
    return graph;
  }
  function resultTime(seconds, precision, hours) {
    if (seconds == null || !Number.isFinite(seconds)) return '—';
    if (precision === 1) return E.fmtTime(seconds, hours);
    var negative = seconds < 0, value = Math.abs(seconds), h = Math.floor(value / 3600);
    value -= h * 3600;
    var m = Math.floor(value / 60), s = Number((value - m * 60).toFixed(precision));
    if (s >= 60) { m++; s = 0; }
    if (m >= 60) { h++; m = 0; }
    return (negative ? '−' : '') + (hours || h ? h + ':' + String(m).padStart(2, '0') + ':' : m + ':') +
      s.toFixed(precision).padStart(precision + 3, '0');
  }
  function resultPerson(entry, role) {
    return { name: entry[role] || '—', href: entry[role + 'Href'] || null };
  }
  function rsClassPosition(result, entry) {
    var review = result.classOrder, row = review && review.status === 'ready' &&
      review.entries.filter(function (candidate) { return candidate.car === entry.car; })[0];
    return { value: row ? row.classPos : entry.classPos, calculated: !!row && row.kind === 'calculated' };
  }
  /**
   * ResultDisplay owns only public source/award/navigation facts; all HTML belongs
   * to shared components. Empty dates/times/awards stay explicitly unavailable.
   * @typedef {{name:string,href:string|null}} ResultPerson
   * @typedef {{role:string,points:number|null,detail:string,detailHelp:string}} ResultRolePoints
   * @typedef {{car:string,pos:number|null,status:string,driver:ResultPerson,codriver:ResultPerson,
   * cls:string,printedClass:string,classNote:string,classPos:number|null,vehicle:string,
   * stages:number|null,penalty:string,total:string,gap:string,previousGap:string,
   * credit:string,notes:string[],points:ResultRolePoints[]}} ResultRow
   * @typedef {{label:string,href:string,selected:boolean}} ResultNavigation
   * @typedef {{year:number,id:string,tab:string,name:string,published:boolean,scope:string,
   * date:string,dateSource:string,dateIso:string,day:string,venue:string,surface:string,
   * stages:string[],state:string,roundCount:number,sourceTitle:string,sourceStatus:string,
   * pointsLabel:string,pointsStatus:string,scoringBasis:string,scoringReason:string,
   * graph:ResultGraph|null,rows:ResultRow[],qualification:string,notes:string[],
   * navigation:ResultNavigation[],previous:string|null,next:string|null,
   * sourceLinks:EventLink[],eventLinks:EventLink[],related:Array<{label:string,links:EventLink[]}>,
   * tabs:Array<{id:string,label:string,href:string,selected:boolean}>}} ResultDisplay
   */
  function result(model, mode, id, tab, query) {
    if (mode !== 'nr' && mode !== 'rs') throw new Error('Unsupported result competition: ' + mode);
    var q = query || {}, active = ['graph', 'classification', 'stages'].indexOf(tab) >= 0 ? tab : 'graph';
    var graph = resultGraph(model, mode, id);
    var raw = (mode === 'nr' ? model.rounds : model.rallyesport.results).filter(function (row) { return row.id === id; })[0];
    var meta = mode === 'nr' ? model.calendar.filter(function (row) { return row.id === id; })[0] : null;
    if (!raw && !meta) return null;
    var eventId = raw ? raw.eventId : meta.eventId;
    var event = (mode === 'nr' ? model.events : model.rallyesport.events).filter(function (row) { return row.id === eventId; })[0] ||
      { id: eventId, name: eventId, links: {} };
    var dates = mode === 'nr' ? { text: dateIso((raw || meta).date), source: 'event' } : rsEventDate(model, event);
    var score = mode === 'rs' && (model.rallyesport.scoring.results || []).filter(function (row) { return row.resultId === id; })[0];
    var ready = mode === 'nr' ? !!raw : !!score && score.status === 'ready' && event.countsForChampionship !== false;
    var path = mode === 'nr' ? '/round/' : '/rallyesport/';
    function url(resultId, view, keep) {
      var params = {};
      if (keep && q.cars != null) params.cars = q.cars;
      if (keep && q.m != null) params.m = q.m;
      return href(model.year, mode, path + encodeURIComponent(resultId) + '/' + view, params).replace(/%2C/gi, ',');
    }
    var sourceRows = mode === 'nr' ? model.rounds : model.rallyesport.results.slice().sort(function (a, b) {
      return model.rallyesport.events.findIndex(function (event) { return event.id === a.eventId; }) -
        model.rallyesport.events.findIndex(function (event) { return event.id === b.eventId; });
    });
    var index = sourceRows.findIndex(function (row) { return row.id === id; });
    var calendarEvent = calendar(model, mode).events.filter(function (row) { return row.id === eventId; })[0];
    var display = { year: model.year, id: id, tab: active, name: event.name, published: !!raw,
      scope: event.countsForChampionship === false ? 'Non-scoring event' : mode === 'nr' ? 'Round ' + (raw || meta).n :
        event.roundNumber == null ? 'Championship round' : 'Round ' + event.roundNumber,
      date: dates.text, dateSource: dates.source, dateIso: mode === 'nr' ? dateIso((raw || meta).date) : dates.iso,
      day: mode === 'nr' ? (raw || meta).day || '' : '', venue: event.venue || '', surface: event.surface || '',
      stages: graph ? graph.stages.slice() : [], state: classification(raw, mode, null),
      roundCount: mode === 'nr' ? model.calendar.length : model.rallyesport.events.filter(function (event) { return event.countsForChampionship !== false; }).length,
      pointsStatus: event.countsForChampionship === false ? 'not-scoring' :
        mode === 'nr' && raw && raw.confirmed ? 'confirmed' : ready ? 'calculated' : 'unavailable',
      sourceTitle: raw && raw.title || '', sourceStatus: raw && raw.status || '',
      pointsLabel: event.countsForChampionship === false ? 'Non-scoring event' : mode === 'nr' ?
        raw ? raw.confirmed ? 'Points match MSA' : 'Points calculated' : 'Points unavailable' : ready ? 'Points available' : 'Points unavailable',
      scoringBasis: event.countsForChampionship === false ?
        'Non-scoring event: retained for event statistics, results and graphs; excluded from championship totals and round counts.' :
        mode === 'nr' ? 'Points: overall + class, assigned to the credited driver and co-driver.' :
        'Class points only; driver and co-driver scoring positions and eligibility are independent.',
      scoringReason: event.countsForChampionship === false ? '' : mode === 'rs' ?
        score && score.reason || model.rallyesport.scoring.reason || 'No championship scoring review is published for this event.' :
        raw && !raw.confirmed ? 'Points calculated on this site; not yet confirmed by MSA.' : '',
      graph: graph, rows: [], awards: [], notes: [], participation: null, qualification: '',
      eventLinks: calendarEvent ? calendarEvent.links : [], related: calendarEvent ? calendarEvent.related : [],
      sourceLinks: [], navigation: sourceRows.map(function (row) {
        var parent = (mode === 'nr' ? model.events : model.rallyesport.events).filter(function (event) { return event.id === row.eventId; })[0];
        return { label: mode === 'nr' ? 'R' + row.n + ' ' + (parent ? parent.short || parent.name : row.eventId) :
          parent ? parent.name : row.title || row.id, href: url(row.id, active, false), selected: row.id === id };
      }), previous: index > 0 ? url(sourceRows[index - 1].id, active, false) : null,
      next: index >= 0 && index < sourceRows.length - 1 ? url(sourceRows[index + 1].id, active, false) : null,
      links: { rounds: href(model.year, mode, '/rounds'), crews: href(model.year, mode, '/crews'), info: href(model.year, mode, '/info') },
      tabs: ['graph', 'classification', 'stages'].map(function (view) {
        return { id: view, label: view === 'graph' ? 'Stage graph' : view === 'classification' ? 'Classification' : 'Stage times',
          href: url(id, view, true), selected: view === active };
      }) };
    if (!raw) return display;
    var source = raw.source || {};
    if (source.url || mode === 'nr' && event.links && event.links.results)
      display.sourceLinks.push({ label: 'Official source classification', url: source.url || event.links.results });
    if (source.pdf) display.sourceLinks.push({ label: 'Copy of the PDF', url: source.pdf });
    display.notes = (raw.notes || []).slice();
    if (source.file) display.notes.unshift('Source: ' + source.file);
    if (event.countsForChampionship === false) display.notes.push('Non-scoring event: retained for event statistics, results and graphs; excluded from championship totals and round counts.');
    if (mode === 'rs') {
      var mapped = Array.from(new Set(Object.keys(raw.classMappings || {}).map(function (key) { return raw.classMappings[key]; })));
      if (mapped.length) display.notes.push('Displayed classes: ' + mapped.join(', ') + '. Event-specific source class mapping applied; printed categories remain in the official source.');
      if (raw.entries.some(E.rallyeSportLaunchRS0)) display.notes.push('Launch-only effective classification: RS0 for the explicitly reviewed crew, both roles. Printed TEST category/status remains source evidence, not a supported championship class or status. No timing or source row was removed.');
      display.notes.push('Source records, finish order and timing are preserved. Missing times stay missing; final positions are not inferred from stage sums.');
      display.notes.push('Printed class positions are source facts, not championship class-role ranks. The separate scoring order shows role-specific positions.');
      var minimum = rsStarterMinimumNote(model.rallyesport.scoring, model.year);
      if (minimum) display.notes.push(minimum);
      if (!E.rallyeSportEntryPolicy(model.rallyesport)) display.notes.push('RS0 Non-Scoring SSR 6.1 · No championship points or rank; not a declaration of non-membership.');
    }
    var byCar = {};
    (score && score.entries || []).forEach(function (row) { byCar[row.car] = row; });
    var entries = mode === 'nr' ? orderedResultEntries(graph.entries) : graph.entries;
    var first = entries.filter(function (entry) { return entry.status === 'classified' && entry.pos === 1 && entry.total != null; })[0], previous = null;
    display.rows = entries.map(function (entry) {
      var original = raw.entries.filter(function (row) { return String(row.car) === entry.car; })[0], points = byCar[entry.car] || {};
      var row = { car: entry.car, pos: entry.pos, status: entry.status, driver: resultPerson(entry, 'driver'),
        codriver: resultPerson(entry, 'codriver'), cls: entry.cls, printedClass: entry.printedClass,
        classNote: (mode === 'nr' || entry.classPosCalculated) && entry.printedClass !== entry.cls ? 'sheet: ' + entry.printedClass : '',
        classPos: entry.classPos, classPosCalculated: !!entry.classPosCalculated,
        classPosClass: entry.classPosCalculated && E.normClass(entry.printedClass) !== E.normClass(entry.cls) ? entry.printedClass : '',
        vehicle: entry.vehicle || '', stages: entry.stagesCompleted == null ? null : entry.stagesCompleted,
        penalty: mode === 'nr' ? entry.pen == null ? '—' : E.fmtTime(entry.pen) : original.penalty || '—',
        total: mode === 'nr' ? entry.status === 'classified' ? entry.total == null ? '—' : E.fmtTime(entry.total, true) : entry.status : original.total || '—',
        gap: '—', previousGap: '—', credit: '', notes: (entry.notes || []).slice(), points: [] };
      if (entry.status === 'classified' && entry.total != null) {
        if (first && entry !== first) row.gap = '+' + resultTime(Number((entry.total - first.total).toFixed(graph.timePrecision)), graph.timePrecision);
        if (previous && previous.total != null) row.previousGap = '+' + resultTime(Number((entry.total - previous.total).toFixed(graph.timePrecision)), graph.timePrecision);
      }
      if (entry.status === 'classified') previous = entry;
      if (mode === 'nr' && (entry.champDriver !== entry.driver || entry.champCodriver !== entry.codriver || entry.noCreditCodriver))
        row.credit = 'Points credited to ' + entry.champDriver + (entry.noCreditCodriver ? ' (no co-driver start counted)' : ' / ' + entry.champCodriver);
      ['driver', 'codriver'].forEach(function (role) {
        var info = mode === 'rs' ? points[role + 'Eligibility'] || (entry[role] ? launchEligibility(original) : null) : null;
        var credited = mode === 'nr' ? entry[role === 'driver' ? 'champDriver' : 'champCodriver'] &&
          !(role === 'codriver' && entry.noCreditCodriver) : entry[role];
        var amount = !ready || !credited ? null :
          mode === 'nr' ? entry.points ? entry.points.total : null : points[role + 'Points'] == null ? null : points[role + 'Points'];
        var detail = mode === 'nr' ? !credited ? 'No championship credit' : entry.points ? entry.points.overall + '+' + entry.points.cls :
          entry.status === 'DNS' ? 'DNS · no championship award' : '' :
          info ? info.status === 'eligible' ? info.scoringClass : 'RS0 · Non-Scoring' : 'Scoring status unavailable';
        var detailHelp = info && info.status !== 'eligible' ?
          'Non-scoring role; no championship points or rank. This label does not establish non-membership.' : '';
        row.points.push({ role: role, points: amount, detail: detail, detailHelp: detailHelp });
        if (detailHelp) display.qualification = 'RS0 · Non-Scoring* — ' +
          (E.rallyeSportEntryPolicy(model.rallyesport) ? 'No championship points or rank; source classification and timing are unchanged.' :
            'RS0 Non-Scoring SSR 6.1. No championship points or rank; not a declaration of non-membership.');
        if (credited && entry.status !== 'DNS' && (mode === 'nr' && entry.points ||
          mode === 'rs' && ready && info)) {
          display.awards.push({ name: mode === 'nr' ? entry[role === 'driver' ? 'champDriver' : 'champCodriver'] : entry[role],
            href: mode === 'nr' ? href(model.year, mode, '/person/' + encodeURIComponent(entry[role === 'driver' ? 'champDriverId' : 'champCodriverId'])) :
              entry[role + 'Href'], role: role, car: entry.car,
            officialPosition: entry.pos,
            rank: mode === 'nr' ? entry.status === 'classified' ? entry.classPos : null : info.status === 'eligible' ? info.scoringPosition : null,
            status: mode === 'nr' ? 'eligible' : info.status,
            cls: mode === 'nr' ? entry.cls : info.scoringClass, detail: detail, points: amount });
        }
      });
      if (mode === 'rs') display.awards.sort(function (a, b) {
        var aRanked = a.status === 'eligible' && a.rank != null, bRanked = b.status === 'eligible' && b.rank != null;
        if (aRanked !== bRanked) return aRanked ? -1 : 1;
        if (aRanked && a.cls !== b.cls) return a.cls < b.cls ? -1 : 1;
        if (aRanked && a.rank !== b.rank) return a.rank - b.rank;
        if ((a.status === 'eligible') !== (b.status === 'eligible')) return a.status === 'eligible' ? -1 : 1;
        return a.name.localeCompare(b.name) || a.role.localeCompare(b.role);
      });
      return row;
    });
    if (mode === 'nr') {
      display.notes.push('Class positions and points use the scored class. Printed class differences and credited identities are shown separately.');
      (raw.extraStarts || []).forEach(function (entry) { if (entry.note) display.notes.push('Also recorded: ' + entry.note); });
      display.rows.forEach(function (row) { row.notes.forEach(function (note) { display.notes.push('Car ' + row.car + ': ' + note); }); });
      if (raw.entryParticipation) display.participation = {
        complete: raw.entryParticipation.complete, source: raw.entryParticipation.source,
        entries: raw.entryParticipation.entries.map(function (entry) {
          return { car: entry.car, driver: entry.driver, codriver: entry.codriver, cls: entry['class'],
            recordedStart: entry.recordedStart, recordedDNS: entry.recordedDNS, status: entry.status,
            driverHref: href(model.year, mode, '/person/' + encodeURIComponent(entry.driverId)),
            codriverHref: href(model.year, mode, '/person/' + encodeURIComponent(entry.codriverId)) };
        })
      };
    }
    return display;
  }
  function scoringText(info) {
    return !info ? 'Scoring status unavailable' : info.status === 'eligible' ?
      info.scoringClass : 'RS0 · Non-Scoring*';
  }
  function nrConfirmation(model) {
    var confirmed = model.rounds.filter(function (round) { return round.confirmed; }).map(function (round) { return 'R' + round.n; });
    return confirmed.length && model.msa ? confirmed.join(', ') + ' points checked against ' +
      (model.msa.label || 'MSA standings') + (model.msa.generated ? ' (' + model.msa.generated + ')' : '') +
      '. Where the official sheet and MSA points disagree on a class or crew member, MSA standings are followed.' : '';
  }
  function roleName(role) { return role === 'driver' ? 'Driver' : 'Co-driver'; }
  var ROLE_NOTE = 'Championship scoring only; this does not establish non-membership. Source classification and timing remain unchanged.';
  /**
   * Directory/profile facts are role records, not interchangeable entry/start counts.
   * Null is unavailable. Unresolved RS source names have no invented profile URL.
   * @typedef {{id:string,name:string,href:string|null,roles:string[],classes:string[],
   * status:string,driver:Object|null,codriver:Object|null,starts:Array<number|null>,
   * startsCount:number|null,events:number,championshipEvents:number,entered:number|null,cars:string[],
   * apps:Object[],entries:Object[]}} DirectoryRow
   */
  function directoryStarts(model, mode, id) {
    if (!id) return null;
    var started = Object.create(null), uncertain = Object.create(null);
    if (mode === 'nr') {
      var person = (model.people || []).filter(function (row) { return row.id === id; })[0];
      (person && person.apps || []).forEach(function (app) {
        if (app.status === 'classified' || app.status === 'DNF') started[app.r] = true;
        else if (app.status !== 'DNS') uncertain[app.r] = true;
      });
    } else {
      rsAppearances(model, id, true).forEach(function (appearance) {
        if (!appearance.championshipRound) return;
        var resultId = appearance.result.id, entry = appearance.entry;
        if (entry.status === 'classified' || entry.status === 'DNF' && hasStartEvidence(entry))
          started[resultId] = true;
        else if (entry.status !== 'DNS') uncertain[resultId] = true;
      });
    }
    if (Object.keys(uncertain).some(function (roundId) { return !started[roundId]; })) return null;
    var count = Object.keys(started).length;
    return count || null;
  }
  function directory(model, mode, profiles) {
    if (mode !== 'nr' && mode !== 'rs') throw new Error('Unsupported directory competition: ' + mode);
    var people = {}, sourceIneligible = Object.create(null), tables = mode === 'nr' ? model.standings :
      model.rallyesport.scoring.status === 'ready' ? model.rallyesport.scoring.standings : model.rallyesport.scoring.provisionalStandings;
    function person(key, id, name) {
      return people[key] || (people[key] = { id: id, name: profiles && profiles[id] ? profiles[id].name : name,
        href: id ? href(model.year, mode, '/person/' + encodeURIComponent(id)) : null,
        roles: [], classes: [], status: '', driver: null, codriver: null, starts: [null, null],
        events: 0, championshipEvents: 0, entered: null, cars: [], apps: [], entries: [] });
    }
    if (mode === 'nr') model.people.forEach(function (raw) {
      var row = person(raw.id, raw.id, raw.name);
      row.entries = raw.entries.map(function (entry) {
        var parent = model.events.filter(function (event) { return event.id === entry.eventId; })[0];
        return { event: parent ? parent.short || parent.name : entry.eventId, eventId: entry.eventId,
          rounds: entry.roundIds.slice(), car: entry.car, cls: entry.cls, partner: entry.partner, role: entry.role,
          status: entry.status, recordedStart: entry.recordedStart,
          source: entry.source && entry.source.url || '' };
      });
      raw.apps.forEach(function (app) {
        var round = model.rounds.filter(function (round) { return round.id === app.r; })[0];
        if (!round) return;
        var event = model.events.filter(function (event) { return event.id === round.eventId; })[0];
        var entry = round.entries.filter(function (entry) { return entry.car === app.car; })[0];
        var partnerId = entry && (entry.driver === app.partner ? entry.driverId :
          entry.codriver === app.partner ? entry.codriverId : null);
        row.apps.push({ eventId: round.eventId, event: event ? event.short || event.name : round.eventId,
          round: 'R' + round.n, roundId: round.id, day: round.day, order: model.rounds.indexOf(round), championship: true, car: app.car,
          role: (app.role || app.credited) === 'co-driver' ? 'codriver' : 'driver',
          creditedRole: app.credited ? app.credited === 'co-driver' ? 'codriver' : 'driver' : null,
          partner: app.partner, partnerHref: partnerId ? href(model.year, mode, '/person/' + encodeURIComponent(partnerId)) : null,
          vehicle: app.vehicle || '', cls: app.cls, classPos: app.classPos,
          status: app.status, pos: app.pos, points: app.pts, credited: !!app.credited,
          scoring: app.credited ? 'Credited championship role' : 'Printed role; championship credit assigned elsewhere',
          note: app.msaOnly ? 'Start recorded in the MSA standings; car absent from this classification.' :
            !app.credited ? 'Printed on the sheet; championship credit assigned elsewhere.' :
            app.role && app.role !== app.credited ? 'Printed ' + roleName(app.role) +
              '; championship credit: ' + roleName(app.credited) + '.' : '',
          href: href(model.year, mode, '/round/' + encodeURIComponent(round.id)),
          graphHref: app.msaOnly ? null : href(model.year, mode, '/round/' + encodeURIComponent(round.id) + '/graph', { cars: app.car }),
          stagePos: entry ? entry.stagePos.slice() : [] });
      });
    });
    if (mode === 'rs') rsAppearances(model, null, true).forEach(function (app) {
      var row = person(app.key, app.id, app.name), entry = app.entry, result = app.result;
      var classPosition = rsClassPosition(result, entry), displayClass = resultClass(result, entry);
      if (app.championshipRound && app.eligibility && app.eligibility.status !== 'eligible')
        sourceIneligible[app.key] = true;
      var event = model.rallyesport.events.filter(function (event) { return event.id === result.eventId; })[0];
      row.apps.push({ eventId: result.eventId, event: event ? event.name : result.eventId,
        round: app.championshipRound ? event && event.roundNumber != null ? 'R' + event.roundNumber : 'Championship round' : 'Non-scoring event',
        day: '', order: model.rallyesport.events.indexOf(event), championship: app.championshipRound, role: app.role, car: String(entry.car),
        partner: entry[app.role === 'driver' ? 'codriver' : 'driver'],
        partnerHref: entry[(app.role === 'driver' ? 'codriver' : 'driver') + 'Known'] ?
          href(model.year, mode, '/person/' + encodeURIComponent(entry[(app.role === 'driver' ? 'codriver' : 'driver') + 'Id'])) : null,
        vehicle: entry.vehicle || '',
        cls: displayClass, classPos: classPosition.value, classPosCalculated: classPosition.calculated,
        classPosClass: classPosition.calculated && E.normClass(entry['class']) !== E.normClass(displayClass) ? entry['class'] : '',
        status: entry.status, pos: entry.pos,
        points: app.championshipRound && typeof app.points === 'number' ? app.points : null, credited: false,
        scoring: !app.championshipRound && !app.eligibility ? 'Non-scoring event' : scoringText(app.eligibility),
        note: app.eligibility && app.eligibility.status !== 'eligible' ? ROLE_NOTE : '',
        href: href(model.year, mode, '/rallyesport/' + encodeURIComponent(result.id)),
        graphHref: href(model.year, mode, '/rallyesport/' + encodeURIComponent(result.id) + '/graph', { cars: entry.car }),
        stagePos: (entry.stagePos || []).slice() });
      if (app.eligibility && app.eligibility.status === 'eligible' && app.eligibility.scoringClass &&
        row.classes.indexOf(app.eligibility.scoringClass) < 0) row.classes.push(app.eligibility.scoringClass);
    });
    var rows = Object.keys(people).map(function (key) {
      var row = people[key], apps = row.apps;
      apps.sort(function (a, b) { return a.order - b.order; });
      row.roles = ['driver', 'codriver'].filter(function (role) {
        return apps.some(function (app) { return app.role === role || app.creditedRole === role; }) ||
          row.entries.some(function (entry) { return (entry.role === 'co-driver' ? 'codriver' : entry.role) === role; });
      });
      row.classes = Array.from(new Set(row.classes.concat(apps.map(function (app) { return app.cls; }),
        row.entries.map(function (entry) { return entry.cls; })).filter(Boolean))).sort();
      row.cars = Array.from(new Set(apps.concat(row.entries).map(function (app) { return String(app.car); })));
      row.events = new Set(apps.map(function (app) { return app.eventId; })).size;
      row.championshipEvents = new Set(apps.filter(function (app) { return app.championship; }).map(function (app) { return app.roundId || app.eventId; })).size;
      row.entered = mode === 'nr' && model.entryLists.length ? new Set(row.entries.map(function (entry) { return entry.eventId; })).size : null;
      ['driver', 'codriver'].forEach(function (role, i) {
        var source = tables && tables[mode === 'nr' ? role === 'driver' ? 'drivers' : 'codrivers' :
          role === 'driver' ? 'overallDrivers' : 'overallCodrivers'] || [];
        var standing = source.filter(function (value) { return value.id === row.id; })[0];
        row[role] = standing ? { rank: standing.rank, points: mode === 'nr' ? standing.total : standing.points,
          ineligible: mode === 'nr' ? !standing.eligible : standing.rank == null,
          qualifier: mode === 'nr' ? standing.eligible ? 'Eligible' : 'Minimum starts not met' :
            model.rallyesport.scoring.status === 'ready' ? 'Published class points' : 'Provisional' } : null;
        row.starts[i] = mode === 'nr' ? standing ? standing.starts : 0 : row.id ? rsRoundsStarted(model, row.id, role) : null;
      });
      row.startsCount = directoryStarts(model, mode, row.id);
      row.hasIneligible = !!(row.driver && row.driver.ineligible || row.codriver && row.codriver.ineligible ||
        sourceIneligible[key]);
      row.status = apps.some(function (app) { return app.scoring.indexOf('Non-Scoring') >= 0; }) ? 'RS0 · Non-Scoring' : '';
      return row;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { year: model.year, rows: rows,
      mode: mode,
      ineligibleNote: rows.some(function (row) { return row.hasIneligible; }) ?
        mode === 'nr' ? '* At least one driver or co-driver role is below the minimum starts.' :
          '* RS0 Non-Scoring SSR 6.1: no championship rank or points; this does not establish non-membership.' : '',
      basis: mode === 'nr' ?
        'Starts count distinct recorded championship rounds once across credited roles; entries and DNS do not count.' :
        'Starts count distinct source-evidenced championship rounds once across roles; launch and DNS do not count, and uncertain DNF evidence remains unavailable.',
      note: mode === 'rs' ? (E.rallyeSportEntryPolicy(model.rallyesport) ? '' : 'RS0 Non-Scoring SSR 6.1 · ') +
        ROLE_NOTE : 'Entries, printed roles and credited starts are independent; missing entry coverage is not zero.' };
  }
  function profile(models, mode, id, publicProfile) {
    var seasons = models.map(function (model) {
      var row = directory(model, mode).rows.filter(function (row) { return row.id === id; })[0];
      if (!row) return null;
      var charts = ['driver', 'codriver'].filter(function (role) {
        return row.apps.some(function (app) { return app.role === role || app.creditedRole === role; });
      }).map(function (role) {
        var standing = model.standings[role === 'driver' ? 'drivers' : 'codrivers'].filter(function (row) { return row.id === id; })[0];
        var rounds = mode === 'nr' ? model.rounds : model.rallyesport.events.filter(function (event) {
          return event.countsForChampionship !== false;
        }).map(function (event) {
          var result = model.rallyesport.results.filter(function (result) { return result.eventId === event.id; })[0];
          return result ? { id: result.id, eventId: event.id, n: event.roundNumber == null ? '?' : event.roundNumber } : null;
        }).filter(Boolean);
        return { role: role, standing: row[role], classOnly: mode === 'rs',
          model: { rounds: rounds, events: mode === 'nr' ? model.events : model.rallyesport.events, pointsScale: model.pointsScale },
          row: { rounds: mode === 'nr' ? standing ? standing.rounds : {} : rsPersonRoundPoints(model, id, role) } };
      });
      return { year: model.year, row: row, charts: charts, href: href(model.year, mode, '/standings') };
    }).filter(Boolean);
    if (!publicProfile && !seasons.length) return null;
    var all = [], starts = 0, unknownStarts = false;
    seasons.forEach(function (season) {
      all = all.concat(season.row.apps);
      season.row.starts.forEach(function (value) { if (value == null) unknownStarts = true; else starts += value; });
    });
    var scored = mode === 'nr' ? all.filter(function (app) { return app.credited && app.status !== 'DNS'; }) : all;
    var finishes = scored.filter(function (app) { return app.status === 'classified'; });
    var positions = finishes.map(function (app) { return app.pos; }).filter(function (pos) { return pos != null; });
    var stagePositions = scored.reduce(function (out, app) { return out.concat(app.stagePos); }, []);
    var roles = Array.from(new Set(seasons.reduce(function (out, season) { return out.concat(season.row.roles); }, [])));
    return { name: publicProfile ? publicProfile.name : seasons[0].row.name, roles: roles, seasons: seasons,
      stats: [
        ['Starts', unknownStarts ? null : starts], ['Event appearances', all.length],
        ['Championship appearances', all.filter(function (app) { return app.championship; }).length],
        ['Finishes', finishes.length], ['Best result', positions.length ? E.ord(Math.min.apply(null, positions)) : null],
        ['Recorded 1st places', positions.length === finishes.length ? positions.filter(function (pos) { return pos === 1; }).length : null],
        ['Podiums', positions.length === finishes.length ? positions.filter(function (pos) { return pos <= 3; }).length : null],
        ['Recorded stage wins', stagePositions.some(function (pos) { return pos != null; }) ?
          stagePositions.filter(function (pos) { return pos === 1; }).length : scored.length ? null : 0]],
      basis: (mode === 'nr' ? 'Finish and win statistics use credited championship roles.' :
        'Finish and win statistics use published source roles, including non-scoring events.') +
        ' Appearances count role/car records, not unique starts. Starts are evidenced championship role-round starts. Entries and DNS do not create starts.',
      note: mode === 'rs' ? (models.some(function (model) { return !E.rallyeSportEntryPolicy(model.rallyesport); }) ?
        'RS0 Non-Scoring SSR 6.1 · ' : '') + ROLE_NOTE :
        'Printed and credited roles can differ; recorded starts and results use their own evidence.' };
  }
  function information(model, mode, site, metadata) {
    var rules = metadata && metadata.ruleset, shared = site && site.info || {};
    return { year: model.year, name: mode === 'nr' ? model.championship : 'RallyeSport',
      documents: mode === 'nr' ? (model.documents || []).map(function (doc) { return Object.assign({}, doc); }) :
        rules && rules.sourceUrl ? [{ title: rules.title, url: rules.sourceUrl, date: rules.issueDate,
          kind: 'Regulations', note: (rules.version ? 'Edition ' + rules.version + '. ' : '') +
            'Published source edition; applicability and reviewed scoring qualifications remain separate.' }] : [],
      calendar: calendar(model, mode), links: { about: href(model.year, mode, '/about'), crews: href(model.year, mode, '/crews'),
        info: href(model.year, mode, '/info'), rounds: href(model.year, mode, '/rounds') },
      intro: shared.intro || '', sharedDocuments: (shared.documents || []).map(function (doc) { return Object.assign({}, doc); }) };
  }
  function sources(model, mode) {
    var display = information(model, mode), facts = standings(model, mode, 'driver', {}), rows = mode === 'nr' ? model.rounds : model.rallyesport.results;
    display.results = rows.map(function (raw) { return result(model, mode, raw.id, 'classification'); });
    display.sections = [];
    if (rows.length) {
      var points = { title: 'Points', paragraphs: [facts.scoring.basis, facts.scoring.reason, facts.scoring.scope], links: [] };
      if (mode === 'nr') {
        points.paragraphs.push('Minimum ' + model.minStarts + ' starts for eligibility. Awards follow credited identities; class-only entrants have no overall award.');
        points.paragraphs.push('Overall: ' + model.pointsScale.overall.map(function (value, i) { return E.ord(i + 1) + ' ' + value; }).join(' · '));
        points.paragraphs.push('Class: ' + model.pointsScale.cls.map(function (value, i) { return E.ord(i + 1) + ' ' + value; }).join(' · '));
        points.paragraphs.push(nrConfirmation(model));
        if (model.msa && model.msa.url) points.links.push({ label: model.msa.label || 'MSA standings', url: model.msa.url });
      } else {
        points.paragraphs.push(rsStarterMinimumNote(model.rallyesport.scoring, model.year));
        points.paragraphs.push(E.rallyeSportEntryPolicy(model.rallyesport) ?
          'User-confirmed entry-based eligibility applies to both roles; membership, licence and invitation do not exclude championship entrants. This is not a printed SSR amendment.' : ROLE_NOTE);
        points.paragraphs.push('Provisional cumulative points include ready events only; blocked events are excluded, not scored as zero.');
      }
      display.sections.push(points, { title: 'Stage graphs', paragraphs: [
        'Graphs use this competition’s own stage axes and source times. Missing observations stay missing; published stage positions are not inferred.',
        'Final is the classification endpoint, including penalties, not certification of source finality. Source qualifications and championship awards remain separate.'
      ], links: [] });
    }
    display.entries = mode === 'nr' ? model.entryLists.map(function (list) {
      var event = model.events.filter(function (event) { return event.id === list.eventId; })[0];
      return { label: (event ? event.name : list.eventId) + (list.complete ? ' (complete list)' : ' (partial coverage)'), url: list.source.url };
    }) : [];
    display.notes = mode === 'nr' ? (model.notes || []).slice() : [];
    display.classes = mode === 'nr' ? model.classes.map(function (cls) { return { id: cls.id,
      text: (cls.desc || '') + (cls.classOnly ? ' (class points only)' : '') }; }) :
      Array.from(new Set(display.results.reduce(function (out, result) {
        return out.concat(result.rows.map(function (row) { return row.cls; }));
      }, []))).map(function (cls) { return { id: cls, text: 'Source classification class; championship role awards are separate.' }; });
    return display;
  }
  var api = { home: home, nrHome: nrHome, rsHome: rsHome, standings: standings,
    directory: directory, profile: profile, information: information, sources: sources,
    result: result, resultGraph: resultGraph, resultTime: resultTime, resultMetrics: RESULT_METRICS,
    orderedResultEntries: orderedResultEntries,
    rsStarterMinimumNote: rsStarterMinimumNote, calendar: calendar, eventLinks: eventLinks,
    rsEventDate: rsEventDate, hasStartEvidence: hasStartEvidence,
    rsAppearances: rsAppearances, rsRoundsStarted: rsRoundsStarted, rsPersonRoundPoints: rsPersonRoundPoints };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NRPublicModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
