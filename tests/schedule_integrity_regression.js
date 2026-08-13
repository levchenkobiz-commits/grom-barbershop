const assert = require('assert');
const { applySchedulePatch, destructiveDelta, shiftCount, parseShiftRange, findShiftOverlaps, conflictsForPatch, overlapError } = require('../routes/schedule_integrity');

const current = [
  { date: '2026-08-10', location: 'Сокол', masters: [{ name: 'А' }, { name: 'Б' }] },
  { date: '2026-08-10', location: 'Рязанский', masters: [{ name: 'В' }] },
  { date: '2026-08-11', location: 'Сокол', masters: [{ name: 'А' }] },
];

const changed = applySchedulePatch(current, [
  { date: '2026-08-10', location: 'Сокол', masters: [{ name: 'А' }] },
]);
assert.equal(changed.length, 3, 'unaffected date/location rows must remain');
assert.equal(shiftCount(changed), 3, 'only the explicitly changed row may change');
assert(changed.some(row => row.date === '2026-08-10' && row.location === 'Рязанский'));
assert(changed.some(row => row.date === '2026-08-11' && row.location === 'Сокол'));

const cleared = applySchedulePatch(current, [
  { date: '2026-08-10', location: 'Сокол', masters: [] },
]);
assert.equal(cleared.length, 2, 'an explicit empty patch clears one key only');
assert.deepEqual(destructiveDelta(current, cleared, [{ date: '2026-08-10', location: 'Сокол' }]), {
  before: 2, after: 0, removed: 2, affectedKeys: 1,
});

const noOp = applySchedulePatch(current, []);
assert.deepEqual(noOp, current, 'empty patch must not erase the schedule');

assert.deepEqual(parseShiftRange({ text: 'С 09:30 до 18:00' }), { start: 570, end: 1080 });
assert.deepEqual(parseShiftRange({ startTime: '10:00' }), { start: 600, end: 1320 });

const impossible = [
  { date: '2026-08-12', location: 'Сокол', masters: [{ name: 'Азамат', text: 'С 09 до 16' }] },
  { date: '2026-08-12', location: 'Рязанский', masters: [{ name: 'Азамат', text: 'С 15 до 22' }] },
];
const conflicts = findShiftOverlaps(impossible);
assert.equal(conflicts.length, 1, 'overlap across two salon cells must be blocked');
assert.equal(overlapError(conflicts).code, 'SHIFT_OVERLAP');
assert.equal(conflictsForPatch(conflicts, [impossible[1]]).length, 1, 'a conflicting edited cell is rejected');
assert.equal(conflictsForPatch(conflicts, [{ date: '2026-08-13', location: 'Сокол' }]).length, 0, 'unrelated edits are not blocked by historical rows');

const validSplit = [
  { date: '2026-08-12', location: 'Сокол', masters: [{ name: 'Азамат', text: 'С 09 до 14' }] },
  { date: '2026-08-12', location: 'Рязанский', masters: [{ name: 'Азамат', text: 'С 14 до 22' }] },
];
assert.equal(findShiftOverlaps(validSplit).length, 0, 'touching shifts must remain valid');

const unknownTime = [{ date: '2026-08-12', location: 'Сокол', masters: [{ name: 'Азамат', text: 'раб' }] }];
assert.equal(findShiftOverlaps(unknownTime).length, 0, 'legacy entries without a time range must not be falsely rejected');

const placeholders = [
  { date: '2026-08-12', location: 'Сокол', masters: [{ name: 'Подмена', text: 'С 09 до 22' }] },
  { date: '2026-08-12', location: 'Рязанский', masters: [{ name: 'Подмена', text: 'С 10 до 22' }] },
];
assert.equal(findShiftOverlaps(placeholders).length, 0, 'generic replacement placeholders do not pretend to be one person');
console.log('schedule integrity regression: ok');
