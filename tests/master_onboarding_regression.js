const assert = require('assert');
const { syncState, masterKey } = require('../routes/master_onboarding');

const adapter = {
  'Рязанский': { masters: [{ dash: 'Новый мастер', grome_id: 'gm_test101' }] },
};
const created = syncState(adapter, undefined, '2026-08-10T10:00:00.000Z');
assert.equal(masterKey(adapter['Рязанский'].masters[0]), 'gm_test101');
assert.equal(created.masters.gm_test101.documentsStatus, 'pending');
assert.equal(created.masters.gm_test101.uniformStatus, 'none');
assert.equal(created.masters.gm_test101.createdAt, '2026-08-10T10:00:00.000Z');

created.masters.gm_test101.documentsStatus = 'completed';
const renamed = syncState({ 'Рязанский': { masters: [{ dash: 'Новое имя', grome_id: 'gm_test101' }] } }, created, '2026-08-20T10:00:00.000Z');
assert.equal(renamed.masters.gm_test101.createdAt, '2026-08-10T10:00:00.000Z');
assert.equal(renamed.masters.gm_test101.documentsStatus, 'completed');
assert.equal(renamed.masters.gm_test101.masterName, 'Новое имя');

const removed = syncState({}, renamed, '2026-08-21T10:00:00.000Z');
assert.equal(removed.masters.gm_test101.active, false);
console.log('master onboarding regression: ok');
