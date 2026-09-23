import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthorizedTeacherAcademicContext, AcademicContextDenied } from '../supabase/functions/_shared/academic-context.ts';

const now = new Date('2026-09-23T12:00:00Z');
const rows = {
  teacher_assignments: { id: 'a', school_id: 'school-a', academic_year_id: 'year-a', class_id: 'class-a', teacher_membership_id: 'member-a', subject_program_id: 'program-a', status: 'active', valid_from: '2026-09-01T00:00:00Z', valid_to: null },
  institutional_memberships: { id: 'member-a', school_id: 'school-a', person_id: 'teacher-a', role: 'teacher', status: 'active', valid_from: '2026-09-01T00:00:00Z', valid_to: null },
  classes: { id: 'class-a', school_id: 'school-a', academic_year_id: 'year-a', subject_id: 'subject-a', grade_id: 'grade-7', is_active: true },
  academic_years: { id: 'year-a', school_id: 'school-a', status: 'active', starts_on: '2026-09-01', ends_on: '2027-08-31' },
  subject_programs: { id: 'program-a', subject_id: 'subject-a', grade_id: 'grade-7' },
  curriculum_releases: { id: 'release-a', subject_program_id: 'program-a', status: 'pilot' },
  units: { id: 'unit-2', subject_program_id: 'program-a', code: 'PHY7-U02', sequence_order: 2, title_hy: 'Գլուխ II' },
  subjects: { id: 'subject-a', code: 'physics', name_hy: 'Ֆիզիկա' },
  grades: { id: 'grade-7', grade_number: 7, label_hy: '7-րդ դասարան' },
};
const selection = { assignmentId: 'a', curriculumReleaseId: 'release-a', unitId: 'unit-2' };
function mock(overrides = {}) {
  const data = Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { ...value, ...overrides[key] }]));
  return { from(table) {
    return { select() { return { eq(_, id) { return { async maybeSingle() {
      return { data: data[table]?.id === id ? data[table] : null, error: null };
    } }; } }; } };
  } };
}
const resolve = (changes = {}, teacher = 'teacher-a', choice = selection) =>
  resolveAuthorizedTeacherAcademicContext(mock(changes), teacher, choice, now);

test('returns a server-authorized context for the selected second unit', async () => {
  const context = await resolve();
  assert.equal(context.schoolId, 'school-a');
  assert.equal(context.classId, 'class-a');
  assert.equal(context.unitCode, 'PHY7-U02');
  assert.equal(context.unitSequence, 2);
});

for (const [name, changes, teacher, choice] of [
  ['another teacher', {}, 'teacher-b', selection],
  ['cross-school class', { classes: { school_id: 'school-b' } }, 'teacher-a', selection],
  ['cross-school membership', { institutional_memberships: { school_id: 'school-b' } }, 'teacher-a', selection],
  ['ended membership', { institutional_memberships: { valid_to: '2026-09-22T00:00:00Z' } }, 'teacher-a', selection],
  ['expired assignment', { teacher_assignments: { valid_to: '2026-09-22T00:00:00Z' } }, 'teacher-a', selection],
  ['legacy class without school', { classes: { school_id: null } }, 'teacher-a', selection],
  ['wrong programme release', { curriculum_releases: { subject_program_id: 'program-b' } }, 'teacher-a', selection],
  ['legacy release', { curriculum_releases: { status: 'legacy' } }, 'teacher-a', selection],
  ['wrong programme unit', { units: { subject_program_id: 'program-b' } }, 'teacher-a', selection],
  ['forged assignment URL', {}, 'teacher-a', { ...selection, assignmentId: 'other' }],
  ['forged unit URL', {}, 'teacher-a', { ...selection, unitId: 'other' }],
]) {
  test(`denies ${name}`, async () => {
    await assert.rejects(resolve(changes, teacher, choice), AcademicContextDenied);
  });
}
