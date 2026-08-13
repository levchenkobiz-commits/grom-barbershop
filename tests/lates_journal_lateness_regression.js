const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {}, console, document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../public/js/lates.js'), 'utf8'), context);

assert.strictEqual(context.journalLatenessMinutes({ schedTime: '09:00', time: '09:03' }), 3);
assert.strictEqual(context.journalLatenessMinutes({ notes: 'Опоздание на 17 мин' }), 17);
assert.strictEqual(context.journalLatenessMinutes({ violation: 'Мастер опоздал' }), null, 'the journal must not invent minutes without evidence');
assert.strictEqual(context.journalLatenessMinutes({ schedTime: '10:00', time: '09:55' }), 0);
console.log('lates journal lateness regression: ok');
