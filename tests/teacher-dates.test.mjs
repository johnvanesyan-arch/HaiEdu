import test from 'node:test';
import assert from 'node:assert/strict';
import { teacherDate, teacherDateTime } from '../web/teacher-dates.mjs';

test('teacher dates have fixed numeric order and local calendar/time fields', () => {
  const local = new Date(2026, 0, 2, 3, 4, 59);
  assert.equal(teacherDate(local), '02.01.2026');
  assert.equal(teacherDateTime(local), '02.01.2026 03:04');
  assert.equal(teacherDateTime(local.toISOString()), '02.01.2026 03:04');
  assert.equal(teacherDateTime(local.getTime()), '02.01.2026 03:04');
});

test('missing or invalid teacher timestamps stay neutral', () => {
  for (const value of [undefined, null, '', ' ', 'not-a-date', '2026-99-99', NaN, Infinity, true, false, {}, new Date(NaN)]) {
    assert.equal(teacherDate(value), null);
    assert.equal(teacherDateTime(value), null);
  }
});
