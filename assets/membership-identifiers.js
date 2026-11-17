(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NRMembershipIdentifiers = factory();
}(typeof window === 'object' ? window : this, function () {
  'use strict';
  var FORMAT = 'nr-private-membership-numbers';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function isNumber(value) { return typeof value === 'string' && /^\d{1,32}$/.test(value); }
  function isEmpty(value) { return value == null || value === '' || Array.isArray(value) && !value.length; }
  function same(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = canonical(value[key]); });
    return out;
  }
  function unknownKeys(value, allowed) {
    return Object.keys(value).some(function (key) { return allowed.indexOf(key) < 0; });
  }
  function emptyNumbers() { return { format: FORMAT, version: 1, people: {} }; }
  function hasValues(record) { return record && (!isEmpty(record.msaNumber) || !isEmpty(record.rsNumbers)); }
  function sameField(field, a, b) {
    return field === 'rsNumbers' && Array.isArray(a) && Array.isArray(b) ?
      same(a.slice().sort(), b.slice().sort()) : same(a, b);
  }
  function validateNumbersDoc(doc, peopleDoc) {
    if (doc == null) return [];
    if (doc.format !== FORMAT || doc.version !== 1 || unknownKeys(doc, ['format', 'version', 'people']) ||
      !doc.people || typeof doc.people !== 'object' || Array.isArray(doc.people))
      return ['Private competitor-number data has an unsupported format.'];
    var issues = [], ids = new Set((peopleDoc.people || []).map(function (person) { return person.id; }));
    var owners = { msaNumber: new Set(), rsNumbers: new Set() };
    Object.keys(doc.people).forEach(function (id) {
      var record = doc.people[id];
      if (!ids.has(id)) issues.push('Private numbers reference a missing competitor profile.');
      if (!record || typeof record !== 'object' || Array.isArray(record) ||
        unknownKeys(record, ['msaNumber', 'rsNumbers'])) {
        issues.push('Private competitor-number data is malformed.'); return;
      }
      if (record.msaNumber != null && record.msaNumber !== '' && !isNumber(record.msaNumber))
        issues.push('A competitor MSA number must be stored as digits in a string.');
      if (record.rsNumbers != null && (!Array.isArray(record.rsNumbers) ||
        record.rsNumbers.some(function (value) { return !isNumber(value); })))
        issues.push('A competitor RS number list is malformed.');
      ['msaNumber', 'rsNumbers'].forEach(function (field) {
        var values = field === 'msaNumber' ? [record.msaNumber] : Array.isArray(record.rsNumbers) ? record.rsNumbers : [];
        values.filter(isNumber).forEach(function (value) {
          if (owners[field].has(value)) issues.push('An ' + (field === 'msaNumber' ? 'MSA' : 'RS') + ' number is assigned more than once.');
          owners[field].add(value);
        });
      });
    });
    return issues;
  }
  function preservePrivateFields(current, incoming) {
    if (!current || !current.people) return incoming;
    if (incoming == null) return clone(current);
    if (incoming.format !== FORMAT || incoming.version !== 1 || !incoming.people ||
      typeof incoming.people !== 'object' || Array.isArray(incoming.people))
      throw new Error('This restore has malformed private competitor-number data.');
    var next = clone(incoming);
    Object.keys(current.people).forEach(function (id) {
      if (!hasValues(current.people[id])) return;
      var record = next.people[id] || (next.people[id] = {});
      ['msaNumber', 'rsNumbers'].forEach(function (field) {
        var oldValue = current.people[id][field];
        if (isEmpty(oldValue)) return;
        if (isEmpty(record[field])) record[field] = clone(oldValue);
        else if (!sameField(field, oldValue, record[field]))
          throw new Error('This restore conflicts with saved private competitor numbers. Resolve the conflict first.');
      });
    });
    return next;
  }
  function undoPrivateFields(current, before, after, peopleDoc) {
    if (!same(current || null, after || null))
      throw new Error('Private competitor numbers changed since this History entry; refresh and resolve the changes before undoing it.');
    var issues = validateNumbersDoc(before, peopleDoc);
    if (issues.length) throw new Error('The private competitor-number History before-image is invalid: ' + issues[0]);
    return before == null ? null : clone(before);
  }
  function mergeProfileIdentifiers(doc, targetId, sourceId) {
    var next = clone(doc || emptyNumbers()), source = next.people[sourceId], target = next.people[targetId] || {};
    if (!source) return next;
    ['msaNumber', 'rsNumbers'].forEach(function (field) {
      if (isEmpty(source[field])) return;
      if (isEmpty(target[field])) target[field] = clone(source[field]);
      else if (!sameField(field, source[field], target[field]))
        throw new Error('These profiles have conflicting private competitor numbers. Resolve them before merging.');
    });
    if (hasValues(target)) next.people[targetId] = target;
    delete next.people[sourceId];
    return next;
  }
  function publicPeople(doc) {
    return { people: (doc.people || []).map(function (person) {
      return { id: person.id, name: person.name, aliases: person.aliases || [], bio: person.bio || '',
        photo: person.photo || '', links: person.links || {} };
    }) };
  }
  function projectionMatches(privateDoc, publicDoc) {
    if (!publicDoc || !Array.isArray(publicDoc.people)) return false;
    var byId = Object.create(null);
    publicDoc.people.forEach(function (person) {
      if (person && typeof person.id === 'string' && !byId[person.id]) byId[person.id] = person;
    });
    var expected = publicPeople(privateDoc).people;
    return expected.length === publicDoc.people.length &&
      expected.every(function (person) { return same(person, byId[person.id]); });
  }
  function exportRows(rows, numbers, privateDoc, publicDoc) {
    if (!projectionMatches(privateDoc, publicDoc))
      throw new Error('Published competitor identities do not match the protected admin records. Private-number export is unavailable.');
    var issues = validateNumbersDoc(numbers, privateDoc);
    if (issues.length) throw new Error(issues[0]);
    var ids = new Set();
    privateDoc.people.forEach(function (person) {
      if (ids.has(person.id)) throw new Error('Duplicate competitor profile IDs prevent a private-number export.');
      ids.add(person.id);
    });
    return rows.map(function (row) {
      function record(role) {
        var person = row[role];
        if (!person || person.name === '—') return {};
        if (!person.id || !ids.has(person.id) || person.known === false || person.ambiguous)
          return { unresolved: true };
        return numbers && numbers.people[person.id] || {};
      }
      return { driver: record('driver'), codriver: record('codriver') };
    });
  }
  return { version: 1, numbersFormat: FORMAT, emptyNumbers: emptyNumbers, validateNumbersDoc: validateNumbersDoc,
    preservePrivateFields: preservePrivateFields, undoPrivateFields: undoPrivateFields,
    mergeProfileIdentifiers: mergeProfileIdentifiers, publicPeople: publicPeople,
    projectionMatches: projectionMatches, exportRows: exportRows };
}));
