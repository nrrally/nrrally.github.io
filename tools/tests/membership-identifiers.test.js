const assert = require('node:assert/strict');
const { test } = require('node:test');
const M = require('../../assets/membership-identifiers.js');
const people = { people: [
  { id: 'a', name: 'Alex Sample', aliases: [], bio: '', photo: '', links: {} },
  { id: 'b', name: 'Bea Sample', aliases: [], bio: '', photo: '', links: {} }
] };
const numbers = { ...M.emptyNumbers(), people: { a: { msaNumber: '00123', rsNumbers: ['00456'] } } };

test('private number validation rejects malformed, duplicate and orphaned values without echoing them', () => {
  assert.deepEqual(M.validateNumbersDoc(numbers, people), []);
  for (const bad of [
    { ...numbers, extra: true },
    { ...numbers, people: { missing: numbers.people.a } },
    { ...numbers, people: { a: { msaNumber: 123 } } },
    { ...numbers, people: { a: { msaNumber: [] } } },
    { ...numbers, people: { a: { rsNumbers: '00456' } } },
    { ...numbers, people: { a: { rsNumbers: ['00456', '00456'] } } },
    { ...numbers, people: { a: numbers.people.a, b: numbers.people.a } }
  ]) {
    const issues = M.validateNumbersDoc(bad, people);
    assert.ok(issues.length);
    assert.doesNotMatch(issues.join(' '), /00123|00456/);
  }
});
test('restore and merge retain private numbers or stop on conflicting values', () => {
  assert.deepEqual(M.preservePrivateFields(numbers, null), numbers);
  assert.deepEqual(M.preservePrivateFields(numbers, M.emptyNumbers()), numbers);
  const conflict = { ...numbers, people: { a: { msaNumber: '00999' } } };
  assert.throws(() => M.preservePrivateFields(numbers, conflict), /conflicts with saved private/);
  assert.deepEqual(M.mergeProfileIdentifiers(numbers, 'b', 'a').people, { b: numbers.people.a });
  assert.throws(() => M.mergeProfileIdentifiers({ ...numbers,
    people: { ...numbers.people, b: { msaNumber: '00999' } } }, 'b', 'a'), /conflicting private/);
});
test('History undo requires the exact current after-image before restoring its before-image', () => {
  assert.equal(M.undoPrivateFields(numbers, null, numbers, people), null);
  assert.deepEqual(M.undoPrivateFields(null, numbers, null, people), numbers);
  assert.throws(() => M.undoPrivateFields(M.emptyNumbers(), null, numbers, people), /changed since this History/);
  assert.throws(() => M.undoPrivateFields(numbers, { ...numbers, people: { missing: numbers.people.a } },
    numbers, people), /History before-image is invalid/);
});
test('public projection excludes private numbers and PDF joins require verified stable profiles', () => {
  const projected = M.publicPeople(people);
  assert.deepEqual(M.publicPeople({ people: people.people.map(person => ({ ...person,
    msaNumber: '00123', rsNumbers: ['00456'] })) }), projected);
  const rows = [{ driver: { id: 'a', name: 'Printed alias' }, codriver: { id: 'b', name: 'Bea Sample' } }];
  assert.deepEqual(M.exportRows(rows, numbers, people, projected), [{ driver: numbers.people.a, codriver: {} }]);
  const mixed = M.exportRows([
    { driver: { name: 'Alex Sample' }, codriver: { id: 'a', name: 'Alex Sample' } },
    { driver: { id: 'a', name: 'Ambiguous name', ambiguous: true }, codriver: { id: 'a', name: 'Unknown', known: false } }
  ], numbers, people, projected);
  assert.deepEqual(mixed, [
    { driver: { unresolved: true }, codriver: numbers.people.a },
    { driver: { unresolved: true }, codriver: { unresolved: true } }
  ]);
  assert.throws(() => M.exportRows(rows, { ...numbers, people: { missing: numbers.people.a } }, people, projected), /missing competitor/);
  assert.throws(() => M.exportRows(rows, numbers, people, { people: [] }), /do not match/);
  const leaked = { people: projected.people.map(person => ({ ...person, msaNumber: '00123' })) };
  assert.equal(M.projectionMatches(people, leaked), false);
  assert.throws(() => M.exportRows(rows, numbers, people, leaked), /do not match/);
});
