/* Shared public presentation, independent of competition rules and providers. */
(function (root) {
  'use strict';
  var P = typeof module !== 'undefined' && module.exports ? require('./public-model.js') : root.NRPublicModel;
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function link(href, text, cls) {
    return '<a href="' + esc(href) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>';
  }
  function person(row) { return link(row.href, esc(row.name)); }
  function classes(row) {
    return row.classes.length ? row.classes.map(function (cls) {
      return '<span class="cls ' + esc(cls) + '">' + esc(cls) + '</span>';
    }).join(' ') : '<span class="small muted">Class unavailable</span>';
  }
  function starts(row) {
    return row.starts == null ? 'Rounds started unavailable' : row.starts + ' round' + (row.starts === 1 ? '' : 's') + ' started';
  }
  function value(number) { return number == null ? '—' : esc(number); }
  function homePerson(row) {
    return '<a href="' + esc(row.href) + '"' +
      (row.ineligible ? ' aria-describedby="home-eligibility-note"' : '') + '>' + esc(row.name) + '</a>' +
      (row.ineligible ? '<span class="eligibility-mark" aria-hidden="true">*</span>' : '');
  }
  function miniBars(row) {
    var max = Math.max.apply(null, [1].concat(row.bars.map(function (bar) { return bar.points == null ? 0 : bar.points; })));
    return '<div class="minibars" aria-label="Points per round">' + row.bars.map(function (bar) {
      var title = bar.label + ': ' + (bar.points == null ? 'unavailable · ' + bar.status : bar.points + ' pts · ' + bar.status);
      return '<div class="mb" title="' + esc(title) + '" aria-label="' + esc(title) + '"><i aria-hidden="true" style="height:' +
        Math.max(3, (bar.points == null ? 0 : bar.points) / max * 56) + 'px' + (bar.points == null ? ';opacity:.25' : '') +
        '"></i><span>' + value(bar.points) + '</span><em>' + esc(bar.label) + '</em></div>';
    }).join('') + '</div>';
  }
  function leaderRow(row) {
    return '<div class="leader"><span aria-label="Pos ' + value(row.rank) + '" class="pos' +
      (row.rank != null && row.rank <= 3 ? ' p' + row.rank : '') + '">' + value(row.rank) +
      '</span><div class="who">' + homePerson(row) + '<div>' + classes(row) + ' · ' + starts(row) +
      '</div></div><div class="pts">' +
      value(row.points) + '<small>pts</small></div></div>';
  }
  function leaderCard(title, rows, href, basis, limit, classCard) {
    return '<div class="card' + (classCard ? ' tight' : '') + '"><div class="leader-card-head">' +
      (classCard ? '<span class="cls ' + esc(title) + '">' + esc(title) + '</span>' : '<h3>' + esc(title) + '</h3>') +
      '<div>' + link(href, 'Table →', 'small') + '</div></div>' +
      (classCard ? '<p class="small muted home-class-basis">' + esc(basis || 'Points basis unavailable.') + '</p>' : '') +
      (rows.length ? rows.slice(0, limit).map(leaderRow).join('') : '<p class="small muted">No points available for this table.</p>') + '</div>';
  }
  function champCard(home) {
    var leaders = home.drivers.filter(function (row) { return row.rank === 1; });
    var codrivers = home.codrivers.filter(function (row) { return row.rank === 1; });
    var html = '<div class="card champ"><p class="eyebrow">Driver leader' + (leaders.length > 1 ? 's' : '') +
      (home.scoring.provisional ? ' · provisional' : '') + '</p>';
    if (leaders.length) {
      html += '<h3>' + leaders.map(homePerson).join(', ') + '</h3><p>' + value(leaders[0].points) + ' points · ' +
        leaders.map(function (row) {
          return (leaders.length > 1 ? esc(row.name) + ': ' : '') + classes(row) + ' · ' + starts(row);
        }).join('; ');
      var next = home.drivers[1], margin = next && leaders[0].points != null && next.points != null ? leaders[0].points - next.points : null;
      html += ' · ' + (leaders.length > 1 ? 'Joint lead' : margin != null && margin >= 0 ?
        margin + ' clear of ' + esc(next.name.split(' ').slice(1).join(' ') || next.name) : 'Lead unavailable') + '</p>' +
        (leaders.length === 1 ? miniBars(leaders[0]) : '');
    } else html += '<p>Driver leader unavailable.</p>';
    html += '<p class="small home-codriver">Co-driver leader' + (codrivers.length > 1 ? 's' : '') + ': ' +
      (codrivers.length ? codrivers.map(function (row) {
        return '<b>' + homePerson(row) + '</b> · ' + value(row.points) + ' pts · ' + classes(row) + ' · ' + starts(row);
      }).join('; ') : 'unavailable.') + '</p>';
    return html + '</div>';
  }
  function home(model, calendarHtml) {
    var counts = model.counts, hasResults = model.hasResults;
    var status = !model.scoring.available ? 'Points unavailable' : model.scoring.provisional ? 'Provisional points' : 'Championship points';
    function stat(number, label) { return '<div class="hero-stat"><b>' + value(number) + '</b><span>' + label + '</span></div>'; }
    var html = '<section class="hero"><p class="hero-kicker">' + model.year + ' · Season overview</p><p class="eyebrow">' +
      esc(model.competition.name) + '</p><h1>' + (hasResults ? 'Every stage, time and point of ' + model.year + '.' : 'The ' + model.year + ' season.') + '</h1>' +
      '<p>' + esc(model.description || 'Classifications, championship standings and stage graphs.') + '</p><div class="hero-stats">' +
      stat(counts.rounds == null ? null : counts.rounds + (counts.listedRounds > counts.rounds ? ' / ' + counts.listedRounds : ''), 'Rounds with results') +
      stat(counts.events, 'Events') + stat(counts.drivers, 'Drivers scored') + stat(counts.stages, 'Recorded special stages') +
      '</div><div class="hero-actions">' +
      link(model.latestHref || model.links.calendar, model.latestHref ? 'Open the latest stage graph' : 'See the calendar', 'btn primary') +
      link(model.latestHref ? model.links.standings : model.links.info, model.latestHref ? 'Championship standings' : 'Regulations &amp; info', 'btn ghost-dark') +
      link(model.links.guide, 'Getting started in NR Rally', 'btn ghost-dark') + '</div></section>';
    html += '<div class="section home-status"><p class="small muted home-note" role="status"><b>' + status + '.</b> ' +
      esc(model.scoring.basis) + ' ' + link(model.links.standings, 'Standings &amp; scoring notes →') + '</p>' +
      '<details class="notes home-scoring-notes"><summary>Scoring notes</summary><div><p>' + esc(model.scoring.reason || status + '.') +
      '</p><p>' + esc(model.scoring.scope) + '</p></div></details></div>';
    if (!hasResults) {
      html += '<div class="section"><div class="card empty"><h2>No results yet</h2><p>Standings and graphs appear after ' +
        model.year + ' classifications are added. Calendar details may still be incomplete.</p><p>' +
        link(model.links.crews, 'See documented crews') + '. An entry is not a start or a scored result.</p></div></div>';
    } else {
      if (model.scoring.available && !model.drivers.length && !model.codrivers.length)
        html += '<div class="section"><div class="card empty"><h2>No scored starts yet</h2><p>Entries and DNS do not create championship starts.</p></div></div>';
      html += '<div class="section"><div class="section-head home-competition-head"><h2>Championship leaders</h2><div class="section-head-actions">' +
        link(model.links.standings, 'Full standings →', 'go') + '</div></div><div class="grid grid-3">' + champCard(model) +
        leaderCard('Drivers', model.drivers, model.links.standings, '', 5) +
        leaderCard('Co-drivers', model.codrivers, model.links.codriverStandings, '', 5) + '</div></div>' +
        '<div class="section"><div class="section-head home-competition-head"><h2>Class leaders · drivers</h2></div><div class="grid home-classes">' +
        model.classes.map(function (cls) { return leaderCard(cls.id, cls.rows, cls.href, cls.basis, 3, true); }).join('') + '</div>' +
        (model.ineligibleNote ? '<p class="small muted home-eligibility-footnote" id="home-eligibility-note">' +
          esc(model.ineligibleNote) + '</p>' : '') + '</div>';
    }
    html += '<div class="section"><div class="section-head rounds-section-head"><h2>The ' + model.year + (hasResults ? ' rounds' : ' calendar') +
      '</h2>' + link(model.links.calendar, 'Full calendar →', 'go') + '</div>' + calendarHtml + '</div>';
    return { title: 'Home', html: html };
  }
  function sourceLinks(links) {
    var items = links.filter(function (item) {
      return /^(https?:|mailto:)/i.test(String(item.url || '').trim()) || /^[\w./-]+$/.test(String(item.url || '').trim());
    }).map(function (item) {
      return '<a href="' + esc(String(item.url).trim()) + '" target="_blank" rel="noopener">' + esc(item.label) + ' ↗</a>';
    });
    return items.length ? '<div class="ev-links">' + items.join('') + '</div>' : '';
  }
  function eventLinkGroups(event) {
    return '<div class="event-own-links"><span class="small muted">Event links</span>' +
      (sourceLinks(event.links) || '<p class="small muted">No event links published.</p>') + '</div>' +
      event.related.map(function (group) {
        var links = sourceLinks(group.links);
        return links ? '<div class="event-related-links"><span class="small muted">' + esc(group.label) + '</span>' + links + '</div>' : '';
      }).join('');
  }
  function scheduledStatus(iso, now) {
    if (!iso) return 'Date to be confirmed';
    var today = new Date(now + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return iso < today ? 'Awaiting results' : iso === today ? 'Scheduled today' : 'Upcoming';
  }
  function winnerText(winner) {
    return winner ? '<b>' + esc(winner.driver) + '</b>' + (winner.codriver ? ' / ' + esc(winner.codriver) : '') :
      '<span class="muted">—</span>';
  }
  function dateLabel(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    var parsed = new Date(date + 'T12:00:00Z');
    return !isNaN(parsed) && parsed.toISOString().slice(0, 10) === date ? parsed.toLocaleDateString('en-ZA',
      { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : date;
  }
  function roundRow(row, now) {
    var tag = row.href ? 'a' : 'div';
    var status = scheduledStatus(row.dateIso, now);
    return '<' + tag + ' class="event-round' + (row.published ? '' : ' upcoming') + '"' +
      (row.href ? ' href="' + esc(row.href) + '"' : '') + '><span class="rnd">' + esc(row.label) +
      '</span><span class="w"><span class="event-round-title">' +
      (row.published ? winnerText(row.winner) : '<b>' + esc(dateLabel(row.date) || 'Date to be confirmed') + '</b>') + '</span>' +
      '<span>' + esc([row.day, row.published ? row.stages + ' stage' + (row.stages === 1 ? '' : 's') : 'results not published yet',
        row.published ? row.classified + ' classified' : '', row.published ? row.state : ''].filter(Boolean).join(' · ')) +
      '</span><span class="small muted">' + esc(row.scope) + '</span>' +
      '<span class="small muted">' + esc(row.entryNote || 'Round entries unavailable') + '</span></span>' +
      (row.published ? '<span class="go">Graph →</span>' :
        status === 'Date to be confirmed' ? '' : '<span class="go muted">' + esc(status) + '</span>') + '</' + tag + '>';
  }
  function eventCard(event, now) {
    return '<div class="card event-card" data-competition="' + esc(event.badge.toLowerCase()) +
      '"><div class="event-top"><div class="event-topline"><h3>' + esc(event.name) +
      '</h3><span class="competition-badge">' + esc(event.badge) + '</span></div><div class="meta"><span>' +
      esc(dateLabel(event.date) || 'Date to be confirmed') + (event.date && event.dateSource !== 'event' ? ' · ' + esc(event.dateSource) : '') +
      '</span><span>' + esc(event.venue || 'Venue unavailable') + '</span><span>' + esc(event.surface || 'Surface unavailable') +
      '</span></div><p class="small event-scope">' + esc(event.scope) + '</p><div class="small muted event-entries">' +
      esc(event.entryNote || 'Event entries unavailable') + '</div>' + eventLinkGroups(event) +
      '</div><div class="event-rounds">' + (event.rounds.length ? event.rounds.map(function (row) { return roundRow(row, now); }).join('') :
        '<div class="event-round upcoming"><span class="w"><span>No rounds added yet</span></span></div>') + '</div></div>';
  }
  function calendar(display, now) {
    if (now == null) now = Date.now();
    return display.events.length ? '<div class="grid events-grid">' + display.events.map(function (event) {
      return eventCard(event, now);
    }).join('') + '</div>' : '<div class="card empty">No events have been added to the ' + display.year + ' calendar yet.</div>';
  }
  function winners(display) {
    var rows = [];
    display.events.forEach(function (event) { rows = rows.concat(event.rounds); });
    if (!rows.length) return '';
    return '<div class="section"><div class="section-head"><h2>Round winners</h2></div><div class="table-wrap">' +
      '<table class="data round-winners"><caption class="sr-only">Source classification winners; not championship points</caption>' +
      '<thead><tr><th>Round / event</th><th>Event</th><th>Date</th><th class="num">Stages</th><th>Winner</th>' +
      display.classes.map(function (cls) { return '<th>' + esc(cls) + '</th>'; }).join('') + '<th>Classification</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><td>' + (row.href ? link(row.href, '<b>' + esc(row.label) + '</b>') : esc(row.label)) +
          '<div class="small muted">' + esc(row.scope) + '</div></td><td>' + esc(row.event) +
          (row.day ? ' · ' + esc(row.day) : '') + '</td><td>' + esc(dateLabel(row.date) || 'Date to be confirmed') +
          '</td><td class="num">' + value(row.stages) + '</td><td>' + winnerText(row.winner) + '</td>' +
          display.classes.map(function (cls) { return '<td>' + winnerText(row.classWinners[cls]) + '</td>'; }).join('') +
          '<td><span class="badge ' + (row.state === 'Final classification' ? 'final' : 'prov') +
          '" aria-label="' + esc(row.state) + '">' + esc(row.state.replace(/ classification$/, '')) + '</span>' +
          (row.classificationHref ? '<div>' + link(row.classificationHref, 'Classification →') + '</div>' : '') +
          sourceLinks(row.source) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  function rounds(display, now) {
    return { title: 'Rounds', html: '<div class="page-head"><div><p class="eyebrow">' + display.year +
      ' season</p><h1>Rounds &amp; stage graphs</h1><p>Choose a round for graphs, classifications and stage times.</p></div></div>' +
      calendar(display, now) + winners(display) };
  }
  function infoEvents(display, now) {
    return '<div class="section"><div class="section-head"><h2>' + display.year + ' events</h2></div>' + calendar(display, now) + '</div>';
  }
  function standingsTable(display) {
    if (!display.rows.length) return '<div class="card empty">' +
      (display.emptyState === 'no-results' ? 'No ' + display.year + ' results yet.' : display.emptyState === 'unavailable' ?
        'Championship totals are not available.' : display.emptyState === 'no-starts' ?
        'No recorded championship starts yet for ' + display.year + ' in this table. Entries and DNS do not create starts.' :
        'No points have been established for this table.') +
      ' Calendar entries alone do not score points. ' + link(display.links.calendar, 'See the calendar') +
      ' or ' + link(display.links.crews, 'documented crews') + '.</div>';
    var seenIneligible = false;
    return '<div class="table-wrap standings-scroll" role="region" aria-label="' + esc(display.title) +
      ' standings table" tabindex="0"><table class="data standings-table"><caption class="sr-only">' +
      esc(display.title) + (display.selectedClass ? ' · ' + esc(display.selectedClass) : '') +
      ' standings. ' + esc(display.scoring.basis) + '</caption><thead><tr>' +
      '<th scope="col" class="center sticky s-pos">Pos</th><th scope="col" class="sticky s-name">Competitor</th>' +
      '<th scope="col" class="num total m-only">Total</th><th scope="col">Class</th>' +
      (display.selectedClass ? '<th scope="col" class="num">Overall pos</th>' : '') +
      display.columns.map(function (column) {
        return '<th scope="col" class="num" title="' + esc(column.description) + '">' + link(column.href, esc(column.label)) +
          (column.note ? '<span class="note-mark" aria-label="' + esc(column.note) + '" title="' + esc(column.note) + '">†</span>' : '') +
          '<br><span class="standing-round-name muted">' + esc(column.name) + '</span></th>';
      }).join('') + (display.selectedClass ? '<th scope="col" class="num">Class pts</th>' : '') +
      '<th scope="col" class="num total d-only">Total</th><th scope="col" class="num">Rounds started</th></tr></thead><tbody>' +
      display.rows.map(function (row) {
        var rowClass = row.ineligible && !seenIneligible ? 'sep' : '';
        if (row.ineligible) seenIneligible = true;
        return '<tr class="' + rowClass + '" data-person="' + esc(row.id) + '"><td class="center sticky s-pos">' +
          value(row.rank) + '</td><th scope="row" class="sticky s-name"' +
          (row.ineligible ? ' aria-describedby="standings-eligibility-note"' : '') + '>' + person(row) +
          (row.ineligible ? '<span class="eligibility-mark" aria-hidden="true">*</span>' : '') + '</th>' +
          '<td class="num total m-only">' + value(row.points) + '</td><td class="standing-classes">' + classes(row) + '</td>' +
          (display.selectedClass ? '<td class="num">' + value(row.overallRank) + '</td>' : '') +
          row.cells.map(function (cell) {
            return '<td class="num' + (cell.points == null ? ' muted' : '') + '" data-points="' +
              (cell.points == null ? '' : esc(cell.points)) + '" title="' + esc(cell.description) +
              '" aria-label="' + esc((cell.points == null ? 'Points unavailable' : cell.points + ' points') + ' · ' + cell.description) +
              '">' + (display.showBreak && cell.points != null ? '<span class="ptcell' + (cell.points ? '' : ' zero') +
              '"><b>' + value(cell.points) + '</b><small>' + esc(cell.detail) + '</small></span>' :
              cell.points === 0 && cell.status === 'DNF' ? '<span class="dnf-cell">DNF</span>' : value(cell.points)) + '</td>';
          }).join('') + (display.selectedClass ? '<td class="num">' + value(row.classPoints) + '</td>' : '') +
          '<td class="num total d-only">' + value(row.points) + '</td><td class="num" title="' + esc(starts(row)) + '">' +
          value(row.starts) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (display.ineligibleNote ?
        '<p class="small muted standings-eligibility-footnote" id="standings-eligibility-note">' +
        esc(display.ineligibleNote) + '</p>' : '');
  }
  function standings(display) {
    function controls(items, label) {
      return '<nav class="seg" aria-label="' + label + '">' + items.map(function (item) {
        return '<a href="' + esc(item.href) + '" class="' + (item.selected ? 'on' : '') + '"' +
          (item.selected ? ' aria-current="page"' : '') + '>' + esc(item.label) + '</a>';
      }).join('') + '</nav>';
    }
    var status = !display.scoring.available ? 'Points unavailable' : display.scoring.provisional ? 'Provisional points' : 'Championship points';
    return { title: display.title + ' standings', html:
      '<div class="page-head"><div><p class="eyebrow">' + display.year + ' standings</p><h1>' + esc(display.title) +
      '</h1><p>Published championship points and recorded round starts.</p></div>' +
      controls(display.controls.roles, 'Standings role') + '</div><div class="filters">' +
      controls(display.controls.classes, 'Standings class') + controls(display.controls.points, 'Points display') +
      '</div><div class="standings-status"><p class="small muted" role="status"><b>' + status + '.</b> ' +
      esc(display.scoring.basis) + '</p><p class="small muted standings-qualification">' +
      esc(display.scoring.reason || 'No additional qualification recorded.') +
      '</p><details class="notes standings-notes"><summary>Scoring notes</summary><div><p>' +
      esc(display.scoring.reason || status + '.') + '</p><p>' + esc(display.scoring.scope) + '</p>' +
      '<p>Rounds started counts recorded championship starts for this role across classes. — means unavailable or no recorded contribution, never an assumed zero. A recorded DNF scores 0 only where established by the scoring data. Round cells describe their source status. † marks a round qualification.</p>' +
      display.notes.map(function (note) {
        return '<p>' + esc(note.text) + (note.links.length ? ' ' + note.links.map(function (item) {
          return /^#\//.test(item.url) ? link(item.url, esc(item.label)) : sourceLinks([item]);
        }).join(' ') : '') + '</p>';
      }).join('') + '</div></details></div>' + standingsTable(display) };
  }
  function resultPerson(row) { return row.href ? person(row) : esc(row.name); }
  function resultPosition(position, status) {
    var stopped = status !== 'classified';
    return '<span class="pos' + (stopped || position == null ? ' dnf' : position <= 3 ? ' p' + position : '') + '">' +
      (stopped ? esc(status) : value(position)) + '</span>';
  }
  function resultPoints(points) {
    var driver = points.filter(function (item) { return item.role === 'driver'; })[0];
    var codriver = points.filter(function (item) { return item.role === 'codriver'; })[0];
    if (driver && codriver && typeof driver.points === 'number' && driver.points === codriver.points &&
      !driver.detailHelp && !codriver.detailHelp)
      return '<span class="result-points-equal" aria-label="Driver and co-driver each scored ' +
        esc(driver.points) + ' championship points"><b aria-hidden="true">' + value(driver.points) + '</b></span>';
    return points.map(function (item) {
      return '<span aria-label="' + (item.role === 'driver' ? 'Driver' : 'Co-driver') + ' points">' +
        (item.role === 'driver' ? 'D' : 'C') + ' <b>' + value(item.points) + '</b></span>';
    }).join('');
  }
  function resultNotes(display) {
    var html = '<details class="notes result-source-notes rs-source-notes"><summary>Source &amp; scoring notes</summary><div><p><b>' +
      esc(display.sourceTitle) + '</b> · ' + esc(display.sourceStatus) + '</p>' + sourceLinks(display.sourceLinks) +
      '<p>' + esc(display.scoringBasis) + '</p><p>' + esc(display.scoringReason) + '</p><ul>' +
      display.notes.map(function (note) { return '<li>' + esc(note) + '</li>'; }).join('') +
      '</ul><p>Live timing is not used. “Final” on a graph is the classification endpoint, not certification that a source is final.</p></div></details>';
    if (display.participation) {
      var part = display.participation, unstarted = part.entries.filter(function (entry) {
        return !entry.recordedStart && !entry.recordedDNS && entry.status !== 'DNS';
      }), dns = part.entries.filter(function (entry) { return entry.recordedDNS || entry.status === 'DNS'; }).length;
      html += '<details class="small muted result-entry-notes"><summary>Entry list: ' + part.entries.length +
        ' documented round entries' + (part.complete ? '' : ' (coverage incomplete or day scope unknown)') +
        (unstarted.length ? ' · ' + unstarted.length + ' crews not recorded as started' : '') +
        (dns ? ' · ' + dns + ' official DNS' : '') + '</summary><div>' +
        sourceLinks(part.source && part.source.url ? [{ label: 'Official entry source', url: part.source.url }] : []) +
        ' Entry is separate from starts and points. ' + part.entries.map(function (entry) {
          return '#' + esc(entry.car) + ' ' + resultPerson({ name: entry.driver, href: entry.driverHref }) + ' / ' +
            resultPerson({ name: entry.codriver, href: entry.codriverHref }) + ' (' + esc(entry.cls) + ')' +
            (entry.recordedDNS ? ' — official classification DNS' : entry.status !== 'entered' ?
              ' — ' + esc(entry.status === 'DNS' ? 'official DNS' : 'withdrawn') :
              entry.recordedStart ? '' : ' — entry only; crew not recorded as started');
        }).join('; ') + '</div></details>';
    }
    return html;
  }
  function resultClassification(display) {
    return '<div class="table-wrap result-classification rs-classification" role="region" aria-label="Classification table" tabindex="0">' +
      '<table class="data compact"><caption class="sr-only">Source classification and independently credited championship points</caption><thead><tr>' +
      ['Pos', 'No.', 'Crew', 'Class', 'Car', 'Stages', 'Penalty', 'Official total', 'Diff 1st', 'Diff prev', 'Class pos', 'Championship pts']
        .map(function (label, i) { return '<th scope="col"' + ([2, 3, 4].indexOf(i) < 0 ? ' class="num"' : '') + '>' + label + '</th>'; }).join('') +
      '</tr></thead><tbody>' + display.rows.map(function (row) {
        function role(person, key) {
          var points = row.points.filter(function (points) { return points.role === key; })[0];
          return '<div class="result-crew-role rs-crew-role" aria-label="' + (key === 'driver' ? 'Driver' : 'Co-driver') + '"><span>' +
            resultPerson(person) + '</span><span class="small result-role-status rs-role-status">' +
            esc(points.detail || 'Scoring status unavailable') + (points.detailHelp ?
              '<span class="note-mark" title="' + esc(points.detailHelp) + '">*</span>' : '') + '</span></div>';
        }
        return '<tr data-car="' + esc(row.car) + '"><td class="num result-pos rs-result-pos">' + resultPosition(row.pos, row.status) +
          '</td><td class="num result-car rs-result-car"><span class="carno-lg">' + esc(row.car) + '</span></td>' +
          '<td class="result-crew rs-result-crew"><div class="crew">' + role(row.driver, 'driver') + role(row.codriver, 'codriver') +
          (row.credit ? '<span class="co">' + esc(row.credit) + '</span>' : '') +
          '<span class="small muted">Official finish: <span class="result-finish rs-result-finish">' + esc(row.status) +
          '</span></span></div></td><td class="result-class rs-result-class" data-label="Class">' + classes({ classes: row.cls ? [row.cls] : [] }) +
          (row.classNote ? '<span class="small muted result-printed-class">' + esc(row.classNote) + '</span>' : '') +
          '</td><td class="result-vehicle" data-label="Car">' + esc(row.vehicle || '—') + '</td>' +
          '<td class="num result-stagecount" data-label="Stages">' + value(row.stages) + '</td>' +
          '<td class="num mono result-penalty" data-label="Penalty">' + esc(row.penalty) + '</td>' +
          '<td class="num mono result-total rs-result-total" data-label="Official total"><b>' + esc(row.total) + '</b></td>' +
          '<td class="num mono result-gap" data-label="Diff 1st">' + esc(row.gap) + '</td>' +
          '<td class="num mono result-previous" data-label="Diff prev">' + esc(row.previousGap) + '</td>' +
          '<td class="num result-classpos" data-label="Class pos">' + value(row.classPos) + '</td>' +
          '<td class="num result-points rs-result-points" data-label="Championship pts">' + resultPoints(row.points) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small muted">' + esc(display.scoringBasis) +
      ' Official finish is separate from each person’s championship scoring. Missing times, stage counts and awards remain unavailable.</p>' +
      (display.awards.length ? '<details class="notes result-scoring-order rs-scoring-order"><summary>Championship scoring order</summary>' +
      '<p class="small muted">' + esc(display.scoringBasis) + '</p><div class="table-wrap"><table class="data"><thead><tr>' +
      ['Official position', 'Class scoring position', 'Competitor', 'Role', 'Car', 'Championship scoring', 'Championship points'].map(function (label) {
        return '<th scope="col">' + label + '</th>';
      }).join('') + '</tr></thead><tbody>' + display.awards.map(function (row) {
        return '<tr><td class="num">' + value(row.officialPosition) + '</td><td class="num">' + value(row.rank) + '</td><td>' + resultPerson(row) + '</td><td>' +
          (row.role === 'driver' ? 'Driver' : 'Co-driver') + '</td><td>' + esc(row.car) + '</td><td>' + esc(row.detail) +
          '</td><td class="num"><b>' + value(row.points) + '</b></td></tr>';
      }).join('') + '</tbody></table></div></details>' : '');
  }
  function resultShell(display, content, now) {
    if (now == null) now = Date.now();
    var html = '<nav class="round-switch" aria-label="Rounds">' + display.navigation.map(function (item) {
      return '<a href="' + esc(item.href) + '" class="' + (item.selected ? 'on' : '') + '"' +
        (item.selected ? ' aria-current="page"' : '') + '>' + esc(item.label) + '</a>';
    }).join('') + '</nav><div class="page-head result-head"><div><p class="eyebrow">' + display.year + ' · ' +
      esc(display.scope) + (display.day ? ' · ' + esc(display.day) : '') + '</p><h1>' + esc(display.name) + '</h1><div class="round-meta">' +
      (display.date ? '<span>' + esc(dateLabel(display.date)) + (display.dateSource !== 'event' ? ' · ' + esc(display.dateSource) : '') + '</span>' :
        display.published ? '<span>Date to be confirmed</span>' : '') +
      '<span>' + esc(display.venue || 'Venue unavailable') + '</span><span>' + esc(display.surface || 'Surface unavailable') + '</span>' +
      '<span>' + display.roundCount + ' listed championship rounds</span>' +
      '<span>' + (display.published ? display.stages.length + ' stage' + (display.stages.length === 1 ? '' : 's') +
        (display.stages.length ? ' (' + esc(display.stages[0]) + (display.stages.length > 1 ? '–' + esc(display.stages[display.stages.length - 1]) : '') + ')' : '') :
        'Stages unavailable') + '</span>' +
      '<span class="badge ' + (display.state === 'Final classification' ? 'final' : 'prov') + '">' + esc(display.state) + '</span>' +
      '<span class="badge ' + (display.pointsStatus === 'confirmed' ? 'final' : display.pointsStatus === 'calculated' ? 'calc' :
        display.pointsStatus === 'unavailable' ? 'prov' : '') + '">' +
      esc(display.pointsLabel) + '</span></div>' +
      (display.published ? '<p class="small muted result-scoring-status">' + esc(display.scoringBasis) + '</p>' : '') +
      '</div><div class="hero-actions">' +
      (display.previous ? link(display.previous, '← Previous', 'btn') : '') + (display.next ? link(display.next, 'Next →', 'btn') : '') +
      link(display.links.rounds, 'All events', 'btn') + '</div></div>';
    if (!display.published) {
      return { title: display.name, html: html + '<div class="card empty"><h2>' + scheduledStatus(display.dateIso, now) +
        '</h2><p>Results not published yet. Graphs and classifications appear when added. Scheduled dates do not confirm the rally ran or is live.</p>' +
        sourceLinks(display.eventLinks) + '<p>' + link(display.links.crews, 'Documented crews') + ' · ' +
        link(display.links.info, 'Season documents') + '</p></div>' };
    }
    if (display.eventLinks.length) html += '<div class="result-event-links"><span class="small muted">Event links</span>' + sourceLinks(display.eventLinks) + '</div>';
    display.related.forEach(function (related) {
      html += '<div class="result-related-links"><span class="small muted">' + esc(related.label) + '</span>' + sourceLinks(related.links) + '</div>';
    });
    html += '<nav class="tabs" aria-label="Result views">' + display.tabs.map(function (item) {
      return '<a href="' + esc(item.href) + '" class="' + (item.selected ? 'on' : '') + '"' +
        (item.selected ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
    }).join('') + '</nav>';
    html += content + (display.qualification ? '<p class="small muted result-qualification rs-eligibility-note">' +
      esc(display.qualification) + '</p>' : '') + resultNotes(display);
    return { title: display.name + ' — ' + display.tabs.filter(function (item) { return item.selected; })[0].label, html: html };
  }
  function graphControls(graph, cars, metric, palette) {
    var entries = P.orderedResultEntries(graph.entries);
    return { picker: '<div class="card picker" aria-label="Choose cars"><h3>Cars to plot</h3><div class="quick">' +
      [['top5', 'Top 5'], ['all', 'All'], ['none', 'Clear']].concat(graph.classes.map(function (cls) { return [cls, cls]; }))
        .map(function (row) { return '<button type="button" data-quick="' + esc(row[0]) + '">' + esc(row[1]) + '</button>'; }).join('') +
      '</div><div class="car-list">' + entries.map(function (entry) {
        var index = cars.indexOf(entry.car);
        return '<button type="button" class="car-btn" data-car="' + esc(entry.car) + '" aria-pressed="' + (index >= 0) +
          '" style="--c:' + (index >= 0 ? palette[index % palette.length] : 'var(--accent)') + '"><span class="dot"></span><span class="no">' +
          esc(entry.car) + '</span><span class="nm"><b>' + esc(entry.driver) + '</b><span>' + esc(entry.codriver) + ' · ' + esc(entry.cls) +
          '</span></span><span class="res">' + esc(entry.status === 'classified' ? entry.pos == null ? '—' : 'P' + entry.pos : entry.status) +
          '</span></button>';
      }).join('') + '</div><p class="small muted" style="margin:10px 2px 0">Pick two cars for a head-to-head.</p></div>',
      metrics: '<div class="metric-bar"><div class="seg" role="group" aria-label="Measure">' + graph.metrics.map(function (item) {
        return '<button type="button" data-metric="' + item.id + '" class="' + (item.id === metric.id ? 'on' : '') +
          '" aria-pressed="' + (item.id === metric.id) + '">' + esc(item.label) + '</button>';
      }).join('') + '</div></div>' };
  }
  function graphLegend(series) {
    return series.length ? '<div class="legend">' + series.map(function (item) {
      return '<button type="button" data-hl="' + esc(item.key) + '"><i style="background:' + item.color + '"></i>#' +
        esc(item.entry.car) + ' ' + esc(item.entry.driver) + ' · ' + esc(item.entry.cls) +
        (item.entryEligibility ? ' · ' + esc(item.entryEligibility) : '') +
        (item.end ? ' <span class="muted">(' + esc(item.end) + ')</span>' : '') + '</button>';
    }).join('') + '</div>' : '';
  }
  function graphPanel(graph, cars, metric, palette, series, content, comparison, selected) {
    var controls = graphControls(graph, cars, metric, palette);
    return '<div class="graph-layout">' + controls.picker + '<div>' + controls.metrics +
      '<div class="card chart-card"><div class="chart-title"><h3>' + esc(metric.label) + '</h3><p>' + esc(metric.help) +
      '</p></div>' + graphLegend(series) + content + '</div>' + comparison + selected + '</div></div>';
  }
  function stageTable(graph, cars, palette) {
    var selected = !!cars, entries = selected ? cars.map(function (car) {
      return graph.entries.filter(function (entry) { return entry.car === car; })[0];
    }) : P.orderedResultEntries(graph.entries).filter(function (entry) { return entry.times.some(function (time) { return time != null; }); });
    var labels = selected ? graph.labels : graph.stages;
    var best = graph.stages.map(function (stage, i) {
      var times = graph.entries.map(function (entry) { return entry.times[i]; }).filter(function (time) { return time != null; });
      return times.length ? Math.min.apply(null, times) : null;
    });
    if (!entries.length) return '<div class="card empty">No stage times are available.</div>';
    return (selected ? '<div class="section"><div class="section-head"><h2>Stage by stage</h2></div>' : '') +
      '<div class="table-wrap result-stage-table" role="region" aria-label="Stage times table" tabindex="0"><table class="data"><thead><tr>' +
      '<th scope="col" class="sticky">Car / crew</th>' + labels.map(function (label) { return '<th scope="col" class="num">' + esc(label) + '</th>'; }).join('') +
      (!selected ? '<th scope="col" class="num">Penalty</th><th scope="col" class="num">Official total</th>' : '') +
      '</tr></thead><tbody>' + entries.map(function (entry, index) {
        return '<tr><th scope="row" class="sticky"><span class="carno-lg">' + esc(entry.car) + '</span> ' +
          '<b' + (selected ? ' style="color:' + palette[index % palette.length] + '"' : '') + '>' + esc(entry.driver) +
          '</b><span class="small muted result-stage-crew">' + esc(entry.codriver) + ' · ' + esc(entry.cls) + '</span></th>' +
          labels.map(function (label, i) {
            if (selected && i === graph.stages.length) return '<td class="num"><span class="stime"><b class="mono">' +
              (entry.status === 'classified' ? esc(entry.totalText) : esc(entry.status)) + '</b><small>' +
              (entry.status === 'classified' && entry.pos != null ? 'P' + entry.pos : '—') +
              ' · penalty ' + esc(entry.penaltyText) + '</small></span></td>';
            var time = entry.times[i], fastest = time != null && best[i] != null && Math.abs(time - best[i]) < 0.5 / Math.pow(10, graph.timePrecision);
            return '<td class="num' + (fastest ? ' fastest' : '') + '"><span class="stime"><b class="mono">' +
              esc(P.resultTime(time, graph.timePrecision)) + '</b><small>' + (entry.stagePos[i] == null ? '—' : 'P' + entry.stagePos[i]) +
              (selected && graph.progression[entry.car].pos[i] != null ? ' · <b>P' + graph.progression[entry.car].pos[i] + '</b>' : '') +
              '</small></span></td>';
          }).join('') + (!selected ? '<td class="num mono">' + esc(entry.penaltyText) + '</td><td class="num mono"><b>' +
            (entry.status === 'classified' ? esc(entry.totalText) : esc(entry.status)) + '</b></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div><p class="small muted">Highlighted: fastest time in this competition on the stage. ' +
      'Small figures are the official stage positions printed on the sheet.' +
      (selected ? ' The second position is the running competition position from stage times. Final: official total and position, including penalties.' : '') +
      '</p>' + (selected ? '</div>' : '');
  }
  function directory(display) {
    var labels = ['Competitor', 'Role', 'Class / status', 'Standings', 'Starts',
      'Events / championship rounds', 'Car(s)'];
    function standing(row, role) {
      return row ? '<span class="crew-standing-role"><span class="crew-standing-role-label">' + role +
        '</span> ' + (row.rank == null ? 'No rank' : 'P' + value(row.rank)) + ' · ' + value(row.points) + ' pts</span>' : '';
    }
    var hasIneligible = display.rows.some(function (row) { return row.hasIneligible; });
    return { title: 'Crews', html: '<div class="page-head"><div><p class="eyebrow">' + display.rows.length +
      ' competitors in ' + display.year + '</p><h1>Crews</h1><p>Drivers and co-drivers documented in classifications and entry evidence.</p></div></div>' +
      '<p class="small muted">' + esc(display.basis) + '</p>' + (display.rows.length ?
      '<div class="filters"><label class="sr-only" for="crewSearch">Search crews</label><input id="crewSearch" class="search" type="search" placeholder="Search by name or car number…" autocomplete="off"></div>' +
      '<div class="table-wrap directory-table rs-crews-table" role="region" aria-label="Crews table" tabindex="0"><table class="data" id="crewTable"><thead><tr>' +
      labels.map(function (label) { return '<th scope="col">' + label + '</th>'; }).join('') + '</tr></thead><tbody>' +
      display.rows.map(function (row) {
        var standings = [standing(row.driver, 'Driver'), standing(row.codriver, 'Co-driver')].filter(Boolean).join('') ||
          '<span class="small muted">No championship standing</span>';
        var identity = resultPerson(row) + (row.hasIneligible ?
          '<span class="eligibility-mark" aria-hidden="true">*</span>' : '');
        var cells = [
          identity + (!row.id ? '<div class="small muted">Source name; profile unresolved</div>' : ''),
          row.roles.length ? row.roles.map(function (role) { return role === 'driver' ? 'Driver' : 'Co-driver'; }).join(' &amp; ') : 'Listed',
          classes(row) + '<div class="small muted">' + esc(row.status) + '</div>',
          standings, value(row.startsCount),
          row.events + ' event' + (row.events === 1 ? '' : 's') + ' · ' + row.championshipEvents + ' championship round' +
            (row.championshipEvents === 1 ? '' : 's'), esc(row.cars.join(', '))];
        var names = ['identity', 'role', 'class', 'standings', 'starts', 'stats', 'cars'];
        return '<tr data-s="' + esc((row.name + ' ' + row.cars.join(' ')).toLowerCase()) + '">' +
          cells.map(function (cell, i) { return '<td class="directory-' + names[i] + ' rs-crew-' + names[i] +
            '" data-label="' + esc(labels[i]) + '"' +
            (i === 0 && row.hasIneligible ? ' aria-describedby="crew-eligibility-note"' : '') + '>' + cell + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">No crews are documented for ' + display.year +
      '. Earlier participation is not a new-season entry; historical profiles remain available from archived seasons.</div>') +
      (hasIneligible && display.ineligibleNote ? '<p class="small muted crew-eligibility-footnote" id="crew-eligibility-note">' +
        esc(display.ineligibleNote) + '</p>' : '') +
      (display.note ? '<p class="small muted">' + esc(display.note) + '</p>' : '') };
  }
  function profile(display, header, charts) {
    var html = header + '<div class="kpis">' + display.stats.map(function (stat) {
      return '<div class="kpi"><b>' + value(stat[1]) + '</b><span>' + esc(stat[0]) + '</span></div>';
    }).join('') + '</div><p class="small muted">' + esc(display.basis) + '</p>';
    display.seasons.forEach(function (season, index) {
      var row = season.row;
      html += '<div class="section season-block"><div class="section-head"><h2>' + season.year + ' season</h2>' +
        link(season.href, season.year + ' standings →', 'go') + '</div><div class="round-meta">' + classes(row) + '</div>';
      season.charts.forEach(function (chart, chartIndex) {
        var label = chart.role === 'driver' ? 'Driver' : 'Co-driver', standing = chart.standing;
        html += '<div class="round-meta"><span>' + label + ' standings: <b>' +
          (standing ? standing.rank == null ? 'Non-Scoring' : 'P' + standing.rank : 'Unavailable') + '</b>' +
          (standing ? ' · ' + value(standing.points) + ' pts · ' + esc(standing.qualifier) : '') + '</span></div>' +
          '<div class="card chart-card profile-points rs-profile-points"><h3>' + label + ' points by round</h3>' +
          charts[index][chartIndex] + '</div>';
      });
      if (!row.apps.length) html += '<p class="small muted">No classification appearances recorded for this season. Entries are not confirmed starts.</p>';
      if (row.entries.length) html += '<details class="notes"><summary>' + value(row.entered) +
        ' events entered</summary><div>' + row.entries.map(function (entry) {
          return '<div>' + esc(entry.event + ' · ' + (entry.rounds.length ? entry.rounds.join(', ') : 'event only; day scope unknown') +
            ' · #' + entry.car + ' · ' + entry.partner + ' · printed entry class ' + entry.cls + ' · ' +
            (entry.status === 'DNS' ? 'official DNS' : entry.status === 'withdrawn' ? 'withdrawn' :
              entry.recordedStart ? 'start recorded separately' : 'entry only; not recorded as started in this scope')) +
            sourceLinks(entry.source ? [{ label: 'Source', url: entry.source }] : []) + '</div>';
        }).join('') + '</div></details>';
      html += (row.apps.length ? '<div class="table-wrap profile-history" role="region" aria-label="Participation history" tabindex="0"><table class="data"><thead><tr>' +
        ['Round / event', 'Event', 'No.', 'Role', 'With', 'Vehicle', 'Class', 'Championship scoring',
          'Official position / finish', 'Class pos', 'Points', 'Graph'].map(function (label) {
          return '<th scope="col">' + label + '</th>';
        }).join('') + '</tr></thead><tbody>' + row.apps.map(function (app) {
          return '<tr><td>' + link(app.href, esc(app.round)) + '</td><td>' + esc(app.event) +
            (app.day ? ' · ' + esc(app.day) : '') + '</td><td><span class="carno-lg">' + esc(app.car) +
            '</span></td><td>' + (app.role === 'driver' ? 'Driver' : 'Co-driver') + (app.note ?
              '<span class="note-mark" title="' + esc(app.note) + '">*</span>' : '') +
            '</td><td>' + resultPerson({ name: app.partner || '—', href: app.partnerHref }) + '</td><td>' + esc(app.vehicle || 'Not recorded') +
            '</td><td>' + classes({ classes: app.cls ? [app.cls] : [] }) + '</td><td>' + esc(app.scoring) +
            '</td><td>' + value(app.pos) + ' · ' + esc(app.status) + '</td><td>' + value(app.classPos) + '</td><td>' +
            (app.championship ? value(app.points) : 'Non-scoring event') + '</td><td>' +
            (app.graphHref ? link(app.graphHref, 'Graph →', 'go') : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '') + '</div>';
    });
    if (!display.seasons.length) html += '<div class="card empty">No published history for this competitor.</div>';
    if (display.note) html += '<p class="small muted">' + esc(display.note) + '</p>';
    return { title: display.name, html: html };
  }
  function documents(rows) {
    return rows.length ? '<div class="doc-list">' + rows.map(function (doc) {
      return '<div class="card doc"><span class="doc-kind">' + esc(doc.kind || 'Document') +
        '</span><span class="doc-main"><b>' + esc(doc.title) + '</b><span>' +
        esc([doc.date ? 'Dated ' + dateLabel(doc.date) : '', doc.note].filter(Boolean).join(' · ')) +
        '</span></span>' + sourceLinks([{ label: 'Open ↗', url: doc.url }]) + '</div>';
    }).join('') + '</div>' : '';
  }
  function information(display, channels) {
    return { title: 'Info', html: '<div class="page-head"><div><p class="eyebrow">' + display.year +
      ' information</p><h1>About the championship</h1><p>' + esc(display.name) + '</p></div></div>' +
      '<p class="guide-entry">New to Northern Regions? <a href="#/getting-started">Start with the spectator, crew and season guide</a>.</p>' +
      '<div class="section"><h2>' + display.year + ' regulations &amp; documents</h2><p class="small muted">' +
      esc(display.name) + ' documents only; related event links retain their source ownership.</p>' +
      (documents(display.documents) || '<div class="card empty">No documents have been added for ' + display.year + ' yet.</div>') + '</div>' +
      infoEvents(display.calendar) + '<div class="section"><h2>Shared site information · Northern Regions context</h2><p>' +
      esc(display.intro) + '</p><p class="small muted">Site channels and contacts below are shared Northern Regions site references, not this competition’s regulations or independently verified representatives.</p>' +
      channels + documents(display.sharedDocuments) + '<p>How results are handled: ' + link(display.links.about, 'sources &amp; data notes') +
      ' · <a href="disclaimer.html">Independence &amp; disclaimer</a> · <a href="privacy.html">Privacy &amp; analytics choices</a>.</p></div>' };
  }
  function sources(display) {
    var html = '<div class="page-head"><div><p class="eyebrow">' + display.year +
      ' sources</p><h1>Sources &amp; data notes</h1><p>Official classifications take precedence. Provisional, unclear and technically qualified sources remain labelled. Live timing is never used.</p></div></div>' +
      '<div class="card"><h2>Calendar &amp; regulations</h2><p>' + link(display.links.info, 'Documents and official event links') +
      ' · ' + link(display.links.rounds, 'Calendar') + '</p></div>';
    if (display.results.length) html += '<div class="table-wrap sources-table" role="region" aria-label="Sources table" tabindex="0"><table class="data"><thead><tr>' +
      ['Round / event', 'Event', 'Official document', 'Status', 'Results page'].map(function (label) {
        return '<th scope="col">' + label + '</th>';
      }).join('') + '</tr></thead><tbody>' + display.results.map(function (result) {
        return '<tr><td>' + link(result.tabs[1].href, esc(result.scope)) + '</td><td>' + esc(result.name) +
          '</td><td>' + esc(result.sourceTitle) + '</td><td><span class="badge ' +
          (result.state === 'Final classification' ? 'final' : 'prov') + '">' + esc(result.state) + '</span><br>' +
          esc(result.sourceStatus) + '</td><td>' + sourceLinks(result.sourceLinks) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      display.results.map(function (result) { return '<section class="section"><h2>' + esc(result.name) + '</h2>' +
        resultNotes(result) + '</section>'; }).join('');
    else html += '<div class="card empty">No classifications have been published here for ' + display.year + '.</div>';
    if (display.entries.length) html += '<div class="card"><h2>Entry evidence</h2><p>Entries are separate from starts, results and points. Missing coverage is not zero participation.</p>' +
      sourceLinks(display.entries) + link(display.links.crews, 'Documented crews') + '</div>';
    html += '<div class="prose">' + display.sections.map(function (section) {
      return '<h2>' + esc(section.title) + '</h2>' + section.paragraphs.filter(Boolean).map(function (text) {
        return '<p>' + esc(text) + '</p>';
      }).join('') + sourceLinks(section.links);
    }).join('') + '<h2>Classes</h2><ul>' + display.classes.map(function (cls) {
      return '<li>' + classes({ classes: [cls.id] }) + ' ' + esc(cls.text) + '</li>';
    }).join('') + '</ul>' + (display.notes.length ? '<h2>Data notes</h2><ul>' + display.notes.map(function (note) {
      return '<li>' + esc(note) + '</li>';
    }).join('') + '</ul>' : '') + '</div>';
    return { title: 'Sources & data notes', html: html };
  }
  var api = { home: home, champCard: champCard, standings: standings, standingsTable: standingsTable,
    directory: directory, profile: profile, information: information, sources: sources,
    resultShell: resultShell, resultClassification: resultClassification, resultNotes: resultNotes,
    graphControls: graphControls, graphPanel: graphPanel, stageTable: stageTable,
    sourceLinks: sourceLinks, calendar: calendar,
    eventCard: eventCard, roundRow: roundRow, winners: winners, rounds: rounds, infoEvents: infoEvents };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NRPublicComponents = api;
})(typeof window !== 'undefined' ? window : globalThis);
