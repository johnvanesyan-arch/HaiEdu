import test from 'node:test';
import assert from 'node:assert/strict';
import { studentWorkReadAllowed as allowed } from '../scripts/student-work-qa-read.mjs';

test('production acceptance lets only the exact My work read through', () => {
  // The bodies the page sends (web/student-work-list.mjs).
  assert.equal(allowed('A_student', 'get-student-work', { action: 'inbox', payload: { state: 'current' } }), true);
  assert.equal(allowed('B_student', 'get-student-work', { action: 'inbox', payload: { state: 'history' } }), true);
  assert.equal(allowed('A_student', 'get-student-work', { action: 'inbox', payload: {} }), true);
  // Everything else stays blocked as an unexpected browser request.
  for (const [actor, fn, body] of [
    ['A_teacher', 'get-student-work', { action: 'inbox', payload: { state: 'current' } }],
    ['A_student', 'get-student-work', { action: 'open', payload: { state: 'current' } }],
    ['A_student', 'get-student-work', { action: 'inbox', payload: { state: 'all' } }],
    ['A_student', 'get-student-work', { action: 'inbox', payload: { state: 'current', offset: 50 } }],
    ['A_student', 'get-student-work', { action: 'inbox', payload: { state: 'current' }, context: {} }],
    ['A_student', 'get-student-work', { action: 'inbox' }],
    ['A_student', 'get-student-work', { action: 'inbox', payload: [] }],
    ['A_student', 'get-student-work', null],
    ['A_student', 'manage-written-work', { action: 'inbox', payload: { state: 'current' } }],
  ]) assert.equal(allowed(actor, fn, body), false, JSON.stringify([actor, fn, body]));
});
