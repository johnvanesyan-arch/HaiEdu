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
  curriculum_releases: { id: 'release-a', subject_program_id: 'program-a', status: 'pilot', effective_from: '2026-09-01', effective_to: null },
  units: { id: 'unit-2', subject_program_id: 'program-a', code: 'DRAFT-CODE', sequence_order: 99, title_hy: 'Խմբագրական տարբերակ', status: 'review' },
  curriculum_release_units: { curriculum_release_id: 'release-a', unit_id: 'unit-2', unit_code_snapshot: 'PHY7-U02', title_hy_snapshot: 'Գլուխ II', sequence_order_snapshot: 2 },
  subjects: { id: 'subject-a', code: 'physics', name_hy: 'Ֆիզիկա' },
  grades: { id: 'grade-7', grade_number: 7, label_hy: '7-րդ դասարան' },
};
const selection = { assignmentId: 'a', curriculumReleaseId: 'release-a', unitId: 'unit-2' };
function mock(overrides = {}) {
  const data = Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { ...value, ...overrides[key] }]));
  return { from(table) {
    return { select() {
      const filters = [];
      const query = {
        eq(column, value) { filters.push([column, value]); return query; },
        async maybeSingle() {
          const candidate = data[table];
          return {
            data: candidate && filters.every(([column, value]) => candidate[column] === value) ? candidate : null,
            error: null,
          };
        },
      };
      return query;
    } };
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
  assert.equal(context.unitTitleHy, 'Գլուխ II');
});

test('uses the immutable release-unit snapshot while the mutable unit remains in editorial review', async () => {
  const context = await resolve({ units: { status: 'review', code: 'CHANGED', sequence_order: 42 } });
  assert.equal(context.unitCode, 'PHY7-U02');
  assert.equal(context.unitSequence, 2);
  assert.equal(context.unitTitleHy, 'Գլուխ II');
});

test('same programme in a second school is visible only to its assigned teacher', async () => {
  const schoolB = {
    teacher_assignments: { school_id: 'school-b', class_id: 'class-b', academic_year_id: 'year-b', teacher_membership_id: 'member-b' },
    institutional_memberships: { id: 'member-b', school_id: 'school-b', person_id: 'teacher-b' },
    classes: { id: 'class-b', school_id: 'school-b', academic_year_id: 'year-b' },
    academic_years: { id: 'year-b', school_id: 'school-b' },
  };
  assert.equal((await resolve(schoolB, 'teacher-b')).schoolId, 'school-b');
  await assert.rejects(resolve(schoolB, 'teacher-a'), AcademicContextDenied);
});

test('another subject and grade can use the same authorized context contract', async () => {
  const subjectB = {
    teacher_assignments: { subject_program_id: 'program-b' },
    classes: { subject_id: 'subject-b', grade_id: 'grade-8' },
    subject_programs: { id: 'program-b', subject_id: 'subject-b', grade_id: 'grade-8' },
    curriculum_releases: { subject_program_id: 'program-b' },
    units: { subject_program_id: 'program-b' },
    curriculum_release_units: { unit_code_snapshot: 'SUB8-U02' },
    subjects: { id: 'subject-b', code: 'subject-b' },
    grades: { id: 'grade-8', grade_number: 8 },
  };
  const context = await resolve(subjectB);
  assert.equal(context.subjectCode, 'subject-b');
  assert.equal(context.gradeNumber, 8);
  assert.equal(context.unitCode, 'SUB8-U02');
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
  ['unit missing from release snapshot', { curriculum_release_units: { unit_id: 'unit-1' } }, 'teacher-a', selection],
  ['release snapshot without a code', { curriculum_release_units: { unit_code_snapshot: '' } }, 'teacher-a', selection],
  ['release snapshot without a title', { curriculum_release_units: { title_hy_snapshot: '' } }, 'teacher-a', selection],
  ['forged assignment URL', {}, 'teacher-a', { ...selection, assignmentId: 'other' }],
  ['forged unit URL', {}, 'teacher-a', { ...selection, unitId: 'other' }],
]) {
  test(`denies ${name}`, async () => {
    await assert.rejects(resolve(changes, teacher, choice), AcademicContextDenied);
  });
}
