import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExactInstitutionalStudentAnalytics } from '../supabase/functions/_shared/institutional-teacher-analytics.ts';

const context = {
  assignmentId: 'assignment-a', classId: 'class-a', schoolId: 'school-a',
  academicYearId: 'year-a', subjectProgramId: 'program-a',
  curriculumReleaseId: 'release-a', unitId: 'unit-a', unitCode: 'PHY7-U01',
  unitSequence: 1, unitTitleHy: 'Գլուխ I', subjectCode: 'physics',
  subjectNameHy: 'Ֆիզիկա', gradeNumber: 7, gradeLabelHy: '7-րդ դասարան',
};
const skills = [
  { id: 'skill-a', code: 'PHY7-U01-S01', nameHy: 'Հմտություն 1', layer: 'core' },
  { id: 'skill-b', code: 'PHY7-U01-S02', nameHy: 'Հմտություն 2', layer: 'core' },
];

test('class analytics replay only the exact attempts supplied for the authorized context', () => {
  const sessions = [
    { id: 'session-a', student_id: 'student-a', mode: 'practice', status: 'completed',
      answered_count: 1, correct_count: 1, planned_item_count: 1,
      score_percent: null, assessment_result: null,
      started_at: '2026-09-26T10:00:00Z', completed_at: '2026-09-26T10:05:00Z' },
  ];
  const attempts = [
    { id: 'attempt-a', student_id: 'student-a', learning_session_id: 'session-a',
      item_id: 'item-a', skill_id: 'skill-a', score: 1, correct: true, hint_used: false,
      created_at: '2026-09-26T10:01:00Z', items: { code: 'I-1', prompt_hy: 'Հարց', difficulty: 2 },
      skillCode: 'PHY7-U01-S01', skillNameHy: 'Հմտություն 1' },
  ];
  const result = buildExactInstitutionalStudentAnalytics({
    student: { id: 'student-a', displayName: 'Անի', enrollmentId: 'enrollment-a' },
    context, skills, sessions, attempts, reviewSessions: [],
  });
  assert.equal(result.matrix[0].evidenceCount, 1);
  assert.equal(result.matrix[0].percent, 60);
  assert.equal(result.matrix[1].percent, null);
  assert.equal(result.recentAccuracy, 100);
  assert.equal(result.modeSummary.practice.completed, 1);
});

test('review and mastery summaries use only exact-context session IDs', () => {
  const sessions = [
    { id: 'mastery-a', student_id: 'student-a', mode: 'mastery_check', status: 'completed',
      answered_count: 5, correct_count: 3, planned_item_count: 5, score_percent: 60,
      assessment_result: 'failed', started_at: '2026-09-26T08:00:00Z', completed_at: '2026-09-26T08:10:00Z' },
    { id: 'review-a', student_id: 'student-a', mode: 'chapter_review', status: 'completed',
      answered_count: 2, correct_count: 2, planned_item_count: 2, score_percent: null,
      assessment_result: null, started_at: '2026-09-26T09:00:00Z', completed_at: '2026-09-26T09:10:00Z' },
  ];
  const attempts = [
    { id: 'attempt-r1', student_id: 'student-a', learning_session_id: 'review-a',
      item_id: 'item-a', skill_id: 'skill-a', score: 1, correct: true, hint_used: false,
      created_at: '2026-09-26T09:01:00Z', items: { difficulty: 2 },
      skillCode: 'PHY7-U01-S01', skillNameHy: 'Հմտություն 1' },
    { id: 'attempt-r2', student_id: 'student-a', learning_session_id: 'review-a',
      item_id: 'item-b', skill_id: 'skill-b', score: 1, correct: true, hint_used: false,
      created_at: '2026-09-26T09:02:00Z', items: { difficulty: 2 },
      skillCode: 'PHY7-U01-S02', skillNameHy: 'Հմտություն 2' },
  ];
  const reviewSessions = [{ id: 'review-row-a', learning_session_id: 'review-a',
    review_context: 'required_after_failed_mastery', qualifying: true, status: 'completed',
    review_cycle_number: 1, review_session_number: 1, target_question_count: 2,
    eligible_pool_size: 8, completed_at: '2026-09-26T09:10:00Z', created_at: '2026-09-26T09:00:00Z' }];
  const result = buildExactInstitutionalStudentAnalytics({
    student: { id: 'student-a', displayName: 'Անի', enrollmentId: 'enrollment-a' },
    context, skills, sessions, attempts, reviewSessions,
  });
  assert.equal(result.chapterReview.lifecycleState, 'mastery_retry_2_ready');
  assert.equal(result.chapterReview.requiredReviewsCompleted, 1);
  assert.equal(result.chapterReview.currentCycleUniqueSeen, 2);
  assert.equal(result.chapterReview.currentCycleCoveragePercent, 25);
});

test('server and client contracts fail closed on exact assignment and release context', () => {
  const dashboard = readFileSync('supabase/functions/get-teacher-dashboard/index.ts', 'utf8');
  const student = readFileSync('supabase/functions/get-teacher-student/index.ts', 'utf8');
  const resolver = readFileSync('supabase/functions/_shared/academic-context.ts', 'utf8');
  const analytics = readFileSync('supabase/functions/_shared/institutional-teacher-analytics.ts', 'utf8');
  const teacherJs = readFileSync('web/teacher.js', 'utf8');

  assert.match(dashboard, /resolveAuthorizedTeacherAcademicContext\(admin, teacherId, selection\)/);
  assert.match(dashboard, /academic_context_unavailable/);
  assert.match(student, /context\.classId !== body\.classId/);
  assert.match(student, /\.eq\("teacher_assignment_id", context\.assignmentId\)/);
  assert.match(resolver, /curriculum_release_units/);
  assert.match(resolver, /unitCode: releaseUnitRow\.unit_code_snapshot/);
  assert.match(resolver, /unitTitleHy: releaseUnitRow\.title_hy_snapshot/);
  for (const field of ['school_id', 'academic_year_id', 'class_id', 'teacher_assignment_id',
    'subject_program_id', 'curriculum_release_id', 'unit_code']) {
    assert.match(analytics, new RegExp(`\\.eq\\("${field}"`));
  }
  assert.match(analytics, /\.eq\("academic_context_status", "exact"\)/);
  assert.doesNotMatch(analytics, /unbound_legacy|student_skill_mastery/);
  assert.doesNotMatch(analytics, /PHY7-U01|skill_code_snapshot.*like/);
  assert.match(teacherJs, /assignmentId: klass\?\.assignmentId/);
  assert.match(teacherJs, /unitId: klass\?\.selectedUnit\?\.unitId/);
});

test('institutional UI reuses the sanctioned roster, matrix and drawer without legacy removal controls', () => {
  const html = readFileSync('web/teacher.html', 'utf8');
  const js = readFileSync('web/teacher.js', 'utf8');
  assert.match(html, /id="rosterAnalyticsCard"/);
  assert.match(html, /id="matrixAnalyticsCard"/);
  assert.match(html, /id="studentDrawer"/);
  assert.match(html, /Առաջընթացի վերլուծությունը հասանելի է ստորև/);
  assert.doesNotMatch(html, /Առաջընթացի վերլուծությունը դեռ չի գործարկվել/);
  assert.match(html, /id="teacherUnitFilter"/);
  assert.match(js, /\$\("classView"\)\.classList\.remove\("hidden"\)/);
  assert.match(js, /dashboard\?\.institutionalTeacher \? "" : `<button class="ghost small-button roster-remove"/);
  assert.match(js, /modeSummary\.practice/);
  assert.match(js, /modeSummary\.chapter_review/);
  assert.match(js, /window\.history\[push \? "pushState" : "replaceState"\]/);
  assert.match(js, /window\.addEventListener\("popstate", \(\) => loadDashboard\(\)\)/);
});
