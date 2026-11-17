(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.NRClassificationPDF = factory(root.NREngine);
}(typeof window === 'object' ? window : this, function (engine) {
  'use strict';
  var libraries = [
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.4/jspdf.umd.min.js', 'sha384-5D+9rOA7QhIVVlbglgjfeZ3vcuDz3a+TTrJbV3qiZqHpkTOTowdlTqQXF8E8pw/j'],
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.2/jspdf.plugin.autotable.min.js', 'sha384-voAWf+DQNBx+Eya8tGEw2DHSo8aPM0bTyJhi+ZbLLfV6HzrvPV/UqIvc3+ULj7bS']
  ];
  function prepare(display, source, mode) {
    if (!display || !display.published || !source || !Array.isArray(source.entries) || !source.entries.length)
      throw new Error('No published classification is available to export.');
    var stages = display.stages || [], cars = Object.create(null), matched = Object.create(null);
    source.entries.forEach(function (entry) {
      var car = String(entry.car);
      if (cars[car]) throw new Error('Duplicate car numbers prevent a reliable export.');
      cars[car] = entry;
    });
    var calculated = mode === 'rs' && source.timingCalculation !== undefined;
    if (calculated && (!engine || engine.rallyeSportClassOrder(source).status !== 'ready'))
      throw new Error('Published raw timing is invalid; the classification cannot be exported.');
    var rows = display.rows.map(function (row) {
      var entry = cars[String(row.car)];
      if (!entry || entry.times != null && !Array.isArray(entry.times)) throw new Error('Published stage timing is invalid for car ' + row.car + '.');
      if (matched[String(row.car)] || (entry.times || []).length > stages.length ||
          entry.stagePos && (!Array.isArray(entry.stagePos) || entry.stagePos.length > stages.length))
        throw new Error('Published classification rows or stage timing are ambiguous for car ' + row.car + '.');
      matched[String(row.car)] = true;
      return {
        pos: row.status === 'classified' ? String(row.pos == null ? '—' : row.pos) : row.status,
        car: row.car, crew: row.driver.name + ' / ' + row.codriver.name,
        licences: [row.driver.name, row.codriver.name].filter(function (name) { return name && name !== '—'; })
          .map(function () { return 'No MSA Number'; }).join(' / '),
        cls: row.cls || '—', classPos: row.classPos == null ? '—' : String(row.classPos),
        vehicle: row.vehicle || '—', stagesCompleted: row.stages != null ? String(row.stages) :
          calculated ? String(entry.times.filter(function (time) { return time != null && time !== ''; }).length) : '—',
        stages: stages.map(function (_, i) {
          var time = (entry.times || [])[i], rank = (entry.stagePos || [])[i];
          return (time == null || time === '' ? '—' : String(time)) + (rank == null || rank === '' ? '' : '\n' + String(rank));
        }),
        penalty: mode === 'nr' ? entry.pen || '—' : entry.penalty || '—',
        total: entry.total || '—',
        gap: row.gap, previous: row.previousGap, status: row.status
      };
    });
    if (rows.length !== source.entries.length) throw new Error('Published classification rows do not match the displayed result.');
    return {
      title: display.name, date: display.date || 'Date unavailable',
      state: display.state === 'Final classification' ? 'Final classification' :
        display.state === 'Provisional classification' ? 'Provisional classification' : display.state,
      notes: (display.notes || []).filter(function (note) { return /technical checks/i.test(note); }),
      stages: stages, rows: rows,
      classified: rows.filter(function (row) { return row.status === 'classified'; }).length,
      unclassified: rows.filter(function (row) { return row.status !== 'classified'; }).length,
      mode: mode
    };
  }
  function loadScript(url, integrity) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url; script.integrity = integrity; script.crossOrigin = 'anonymous';
      script.onload = resolve; script.onerror = function () { reject(new Error('PDF library failed to load or failed its integrity check.')); };
      document.head.appendChild(script);
    });
  }
  var loaded;
  async function loadLibraries() {
    if (!loaded) loaded = (async function () {
      for (var i = 0; i < libraries.length; i++) await loadScript(libraries[i][0], libraries[i][1]);
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF libraries are unavailable.');
    }()).catch(function (error) { loaded = null; throw error; });
    return loaded;
  }
  async function imageData(url) {
    var response = await fetch(url);
    if (!response.ok) throw new Error('Classification logo could not be loaded.');
    var blob = await response.blob();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Classification logo could not be read.')); };
      reader.readAsDataURL(blob);
    });
  }
  function build(data, jsPDF, logo, now) {
    if (/[^\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/.test(JSON.stringify(data)))
      throw new Error('This PDF font cannot represent a character in the published classification. No PDF was downloaded.');
    var doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
    doc.setFont('helvetica', 'normal');
    var width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
    var navy = [29, 55, 94], red = [219, 40, 50], margin = 14;
    var date = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var timestamp = date.getUTCDate() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear() + ' ' +
      ('0' + date.getUTCHours()).slice(-2) + ':' + ('0' + date.getUTCMinutes()).slice(-2) + ' SAST';
    function header() {
      doc.setTextColor.apply(doc, navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      var titleLines = doc.splitTextToSize(data.title, width - 190), size = 15;
      while (titleLines.length > 2 && size > 7) {
        doc.setFontSize(--size); titleLines = doc.splitTextToSize(data.title, width - 190);
      }
      if (titleLines.length > 2) throw new Error('The event title is too long to fit the PDF header.');
      doc.text(titleLines, margin, 23);
      doc.setFontSize(10); doc.text(data.state, margin, 49);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 110, 125); doc.setFontSize(8);
      doc.text('Club Championship  ·  ' + data.date, margin, 62);
      var image = doc.getImageProperties(logo), boxW = data.mode === 'rs' ? 100 : 75, boxH = 43;
      var scale = Math.min(boxW / image.width, boxH / image.height);
      doc.addImage(logo, image.fileType, width - margin - image.width * scale, 12, image.width * scale, image.height * scale);
      doc.setDrawColor.apply(doc, red); doc.setLineWidth(1.3); doc.line(margin, 71, width - margin, 71);
    }
    var columns = [
      { header: 'Pos', dataKey: 'pos' }, { header: 'Car', dataKey: 'car' },
      { header: 'DRIVER / CO-DRIVER', dataKey: 'crew' }, { header: 'CL', dataKey: 'cls' },
      { header: 'CAR model', dataKey: 'vehicle' },
      { header: 'Stg', dataKey: 'stagesCompleted' }
    ];
    data.stages.forEach(function (stage, i) { columns.push({ header: stage, dataKey: 'stage' + i }); });
    columns.push({ header: 'PEN', dataKey: 'penalty' }, { header: 'TOTAL', dataKey: 'total' },
      { header: 'Diff 1st', dataKey: 'gap' }, { header: 'Diff prev', dataKey: 'previous' });
    var body = data.rows.map(function (row) {
      var item = Object.assign({}, row, { crew: row.crew + (row.licences ? '\n' + row.licences : '') });
      row.stages.forEach(function (stage, i) { item['stage' + i] = stage; });
      return item;
    });
    if (typeof doc.autoTable !== 'function') throw new Error('PDF table library is unavailable.');
    var columnStyles = { crew: { cellWidth: 140, fontStyle: 'bold' }, vehicle: { cellWidth: 60 } };
    data.stages.forEach(function (_, i) { columnStyles['stage' + i] = { cellWidth: 48 }; });
    doc.autoTable({
      columns: columns, body: body, startY: 78,
      margin: { left: margin, right: margin, top: 78, bottom: 56 },
      styles: { font: 'helvetica', fontSize: 6.2, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: navy, textColor: 255, fontStyle: 'bold', fontSize: 6 },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      columnStyles: columnStyles, rowPageBreak: 'avoid',
      horizontalPageBreak: true, horizontalPageBreakRepeat: ['pos', 'car', 'crew', 'cls'],
      didParseCell: function (cell) {
        if (cell.section !== 'body') return;
        if (cell.column.dataKey === 'total') cell.cell.styles.fontStyle = 'bold';
        var penalty = String(cell.row.raw.penalty);
        if (cell.column.dataKey === 'penalty' && /^[+-]?\d+(?::\d+){0,2}(?:\.\d+)?$/.test(penalty) && /[1-9]/.test(penalty))
          cell.cell.styles.textColor = red;
      },
      willDrawCell: function (cell) {
        if (cell.section !== 'body') return;
        var key = String(cell.column.dataKey);
        if (key === 'crew' || /^stage\d+$/.test(key)) cell.cell.text = [];
        if (key === 'cls') {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.2);
          if (doc.getTextWidth(String(cell.row.raw.cls)) + 8 <= cell.cell.width - 4) cell.cell.text = [];
        }
      },
      didDrawCell: function (cell) {
        if (cell.section !== 'body') return;
        var key = String(cell.column.dataKey), raw = cell.row.raw, x = cell.cell.x + 2;
        if (key === 'crew' || /^stage\d+$/.test(key)) {
          var parts = key === 'crew' ? [String(raw.crew).split('\n')[0], raw.licences || ''] :
            String(raw[key] || '').split('\n');
          doc.setFont('helvetica', key === 'crew' ? 'bold' : 'normal'); doc.setFontSize(6.2);
          var first = doc.splitTextToSize(parts[0], cell.cell.width - 4);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.2);
          var second = parts[1] ? doc.splitTextToSize(parts[1], cell.cell.width - 4) : [];
          var y = cell.cell.y + Math.max(2, (cell.cell.height - first.length * 7.1 - second.length * 6) / 2) + 6;
          doc.setTextColor(30, 40, 55); doc.setFont('helvetica', key === 'crew' ? 'bold' : 'normal'); doc.setFontSize(6.2);
          first.forEach(function (line) { doc.text(line, x, y); y += 7.1; });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.2);
          second.forEach(function (line) { doc.text(line, x, y); y += 6; });
        } else if (key === 'cls' && cell.cell.text.length === 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.2);
          var label = String(raw.cls), pillWidth = doc.getTextWidth(label) + 8;
          doc.setFillColor(232, 238, 246); doc.setTextColor.apply(doc, navy);
          doc.roundedRect(x, cell.cell.y + (cell.cell.height - 11) / 2, pillWidth, 11, 3, 3, 'F');
          doc.text(label, x + 4, cell.cell.y + cell.cell.height / 2 + 2);
        }
      },
      didDrawPage: header
    });
    var y = doc.lastAutoTable.finalY + 15;
    doc.setTextColor(30, 40, 55); doc.setFontSize(8);
    data.notes.forEach(function (note) {
      doc.splitTextToSize(note, width - 2 * margin).forEach(function (line) {
        if (y > height - 70) { doc.addPage(); header(); doc.setTextColor(30, 40, 55); doc.setFontSize(8); y = 90; }
        doc.text(line, margin, y); y += 10;
      });
    });
    if (y > height - 70) { doc.addPage(); header(); y = 90; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Original signed by Officials', margin, y + 4);
    var count = doc.internal.getNumberOfPages();
    for (var page = 1; page <= count; page++) {
      doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 110, 125);
      doc.text('Club Championship · Generated ' + timestamp, margin, height - 20);
      doc.text(data.classified + ' classified · ' + data.unclassified + ' not classified', width / 2, height - 20, { align: 'center' });
      doc.text('Page ' + page + ' of ' + count, width - margin, height - 20, { align: 'right' });
    }
    return doc;
  }
  function renderIsolated(data, logo) {
    return new Promise(function (resolve, reject) {
      var frame = document.createElement('iframe'), timer;
      frame.hidden = true;
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.src = 'classification-pdf-frame.html';
      function finish(error, bytes) {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        frame.remove();
        if (error) reject(error); else resolve(bytes);
      }
      function receive(event) {
        if (event.source !== frame.contentWindow || !event.data || event.data.type !== 'classification-pdf-result') return;
        if (event.data.error) finish(new Error(event.data.error));
        else if (event.data.bytes instanceof ArrayBuffer) finish(null, event.data.bytes);
        else finish(new Error('The PDF renderer returned invalid data.'));
      }
      window.addEventListener('message', receive);
      frame.onload = function () { frame.contentWindow.postMessage({ type: 'classification-pdf-render', data: data, logo: logo }, '*'); };
      frame.onerror = function () { finish(new Error('The isolated PDF renderer could not be loaded.')); };
      timer = setTimeout(function () { finish(new Error('The isolated PDF renderer did not respond.')); }, 30000);
      document.body.appendChild(frame);
    });
  }
  if (typeof window === 'object' && window.parent !== window) {
    window.addEventListener('message', async function (event) {
      if (event.source !== window.parent || !event.data || event.data.type !== 'classification-pdf-render') return;
      try {
        await loadLibraries();
        var pdf = build(event.data.data, window.jspdf.jsPDF, event.data.logo, new Date());
        var bytes = pdf.output('arraybuffer');
        window.parent.postMessage({ type: 'classification-pdf-result', bytes: bytes }, '*', [bytes]);
      } catch (error) {
        window.parent.postMessage({ type: 'classification-pdf-result', error: error.message }, '*');
      }
    });
  }
  async function download(display, source, mode, checkAuthorization) {
    var data = prepare(display, source, mode);
    if (typeof checkAuthorization !== 'function') throw new Error('Admin authorization is unavailable.');
    await checkAuthorization();
    var logo = await imageData(mode === 'rs' ? '../assets/rallyesport-logo.png' : '../assets/official-logo.jpg');
    var bytes = await renderIsolated(data, logo);
    await checkAuthorization();
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    var link = document.createElement('a');
    link.href = url; link.download = 'classification-' + String(display.id).replace(/[^a-zA-Z0-9_-]/g, '-') + '.pdf';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  return { prepare: prepare, build: build, download: download };
}));
