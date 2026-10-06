import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { aggregateSchoolPerformanceAnalytics } from '../supabase/functions/_shared/school-performance-analytics.ts';

const actor = 'actor-a';
const schoolA = 'school-a';
const schoolB = 'school-b';
const yearA = 'year-a';
const classA = 'class-a';
const programmeA = 'programme-a';

class Query {
  constructor(table, rows, actorProfile) {
    this.table = table;
    this.rows = rows;
    this.actorProfile = actorProfile;
    this.filters = [];
    this.from = 0;
    this.to = Number.MAX_SAFE_INTEGER;
  }
  select() { return this; }
  order() { return this; }
  eq(column, value) { this.filters.push({ type: 'eq', column, value }); return this; }
  in(column, values) { this.filters.push({ type: 'in', column, values }); return this; }
  range(from, to) { this.from = from; this.to = to; return this; }
  result() {
    let data = [...(this.rows[this.table] ?? [])];
    for (const filter of this.filters) {
      data = data.filter((row) => filter.type === 'eq'
        ? row[filter.column] === filter.value
        : filter.values.includes(row[filter.column]));
    }
    return { data: data.slice(this.from, this.to + 1), error: null };
  }
  maybeSingle() {
    if (this.table === 'profiles') return Promise.resolve({ data: this.actorProfile, error: null });
    const result = this.result();
    return Promise.resolve({ data: result.data[0] ?? null, error: result.error });
  }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

function endpointFixture(role = 'school_admin') {
  const current = { status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_to: null };
  return {
    actorProfile: { role, account_status: 'active' },
    profiles: [],
    schools: [{ id: schoolA }, { id: schoolB }],
    institutional_memberships: [{ school_id: schoolA, person_id: actor, role: 'school_admin', ...current }],
    academic_years: [{ id: yearA, school_id: schoolA, label: '2026–2027', status: 'active', starts_on: '2026-09-01', ends_on: '2027-06-30' }],
    teacher_assignments: [{ id: 'assignment-a', school_id: schoolA, academic_year_id: yearA, class_id: classA, subject_program_id: programmeA, ...current }],
    classes: [{ id: classA, school_id: schoolA, academic_year_id: yearA, name: '7Ա', subject_id: 'subject-a', grade_id: 'grade-a', is_active: true }],
    institutional_class_enrollments: [{ id: 'enrollment-a', school_id: schoolA, academic_year_id: yearA, class_id: classA,
      teacher_assignment_id: 'assignment-a', subject_program_id: programmeA, student_id: 'student-a', ...current }],
    subject_programs: [{ id: programmeA, subject_id: 'subject-a', grade_id: 'grade-a', version_label: '2026' }],
    subjects: [{ id: 'subject-a', code: 'SUB', name_hy: 'Առարկա', name_en: 'Subject' }],
    grades: [{ id: 'grade-a', grade_number: 7, label_hy: '7-րդ դասարան', label_en: 'Grade 7' }],
    learning_sessions: [session({ id: 'diagnostic-a', mode: 'diagnostic', school_id: schoolA, academic_year_id: yearA,
      class_id: classA, teacher_assignment_id:'assignment-a', subject_program_id: programmeA, answered_count: 4, correct_count: 3 })],
    chapter_review_sessions: [],
  };
}

async function invokeEndpoint({ schoolId = schoolA, role = 'school_admin', aal = 'aal1' } = {}) {
  let handler;
  const rows = endpointFixture(role);
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
    from: (table) => new Query(table, rows, rows.actorProfile),
  };
  const source = readFileSync('supabase/functions/get-school-performance-analytics/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => admin,
    hasActiveLiveSession: async () => true,
    aggregateSchoolPerformanceAnalytics,
    Deno: { env: { get: () => 'configured' }, serve: (fn) => { handler = fn; } },
    Response, Request, Date, Set, Map, atob, console,
  });
  const payload = Buffer.from(JSON.stringify({ aal })).toString('base64url');
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: `Bearer x.${payload}.y`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId }),
  }));
  return { status: response.status, body: await response.json() };
}

const enrollments = [
  { id: 'enrollment-a', student_id: 'student-a' },
  { id: 'enrollment-b', student_id: 'student-b' },
];

const session = (values = {}) => ({
  id: 'session-a', institutional_class_enrollment_id: 'enrollment-a', student_id: 'student-a',
  assessment_blueprint_id:'bp-a',learning_model_configuration_id:'model-a',curriculum_release_id: 'release-a', unit_code: 'UNIT-A', mode: 'practice', status: 'completed',
  answered_count: 1, correct_count: 1, assessment_result: null, academic_context_status: 'exact',
  started_at: '2026-09-30T10:00:00Z', completed_at: '2026-09-30T10:05:00Z', ...values,
});

test('school participation and diagnostic coverage use distinct active enrollment contexts', () => {
  const analytics = aggregateSchoolPerformanceAnalytics({
    enrollments: [...enrollments, enrollments[0]],
    sessions: [
      session({ id: 'diagnostic-a', mode: 'diagnostic', answered_count: 4, correct_count: 3 }),
      session({ id: 'practice-a' }),
      session({ id: 'diagnostic-a', mode: 'diagnostic', answered_count: 4, correct_count: 3 }),
      session({ id: 'legacy', academic_context_status: 'unbound_legacy' }),
      session({ id: 'foreign', institutional_class_enrollment_id: 'enrollment-foreign', student_id: 'student-foreign' }),
    ],
    reviewSessions: [],
  });

  assert.deepEqual(analytics.enrollment, { students: 2, contexts: 2 });
  assert.deepEqual(analytics.participation, { students: 1, rate: 50 });
  assert.equal(analytics.diagnostic.completedContexts, 1);
  assert.equal(analytics.diagnostic.completionRate, 50);
  assert.equal(analytics.diagnostic.averageAccuracy, 75);
  assert.equal(analytics.evidence.exactSessions, 2);
});

test('mastery pass rate is context-based and chapter review rows stay tied to exact sessions', () => {
  const sessions = [
    session({ id: 'mastery-failed', mode: 'mastery_check', assessment_result: 'failed' }),
    session({ id: 'mastery-passed', mode: 'mastery_check', assessment_result: 'passed', completed_at: '2026-09-30T11:00:00Z' }),
    session({ id: 'mastery-b', institutional_class_enrollment_id: 'enrollment-b', student_id: 'student-b',
      mode: 'mastery_check', assessment_result: 'failed', completed_at: '2026-09-30T12:00:00Z' }),
    session({ id: 'review-a', mode: 'chapter_review', completed_at: '2026-09-30T13:00:00Z' }),
  ];
  const analytics = aggregateSchoolPerformanceAnalytics({
    enrollments,
    sessions,
    reviewSessions: [
      { id: 'review-row-a', learning_session_id: 'review-a', status: 'completed', qualifying: true },
      { id: 'review-row-a', learning_session_id: 'review-a', status: 'completed', qualifying: true },
      { id: 'foreign-review', learning_session_id: 'foreign-session', status: 'completed', qualifying: true },
    ],
  });

  assert.deepEqual(analytics.mastery, { attemptedContexts: 2, passedContexts: 1, passRate: 50 });
  assert.deepEqual(analytics.chapterReview, { completedSessions: 1, qualifyingSessions: 1, students: 1 });
  assert.equal(analytics.evidence.lastActivityAt, '2026-09-30T13:00:00Z');
});

test('empty denominators remain unavailable instead of fabricating percentages', () => {
  const analytics = aggregateSchoolPerformanceAnalytics({ enrollments: [], sessions: [], reviewSessions: [] });
  assert.equal(analytics.participation.rate, null);
  assert.equal(analytics.diagnostic.completionRate, null);
  assert.equal(analytics.diagnostic.averageAccuracy, null);
  assert.equal(analytics.mastery.passRate, null);
});

test('server contract validates role, school and exact academic context before aggregation', () => {
  const source = readFileSync('supabase/functions/get-school-performance-analytics/index.ts', 'utf8');
  assert.match(source, /hasActiveLiveSession\(admin, token, actorId\)/);
  assert.match(source, /\["admin", "school_admin"\]/);
  assert.match(source, /analytics_scope_unavailable/);
  assert.match(source, /\.eq\("school_id", schoolId\)\.eq\("academic_year_id", selectedYear\.id\)/);
  assert.match(source, /\.eq\("academic_context_status", "exact"\)/);
  assert.match(source, /\.in\("institutional_class_enrollment_id", ids\)/);
  assert.match(source, /requestedProgrammeId/);
  assert.match(source, /requestedClassId/);
  assert.doesNotMatch(source, /PHY7|Ֆիզիկա/);
});

test('school admin endpoint returns only the authorized school aggregate', async () => {
  const result = await invokeEndpoint();
  assert.equal(result.status, 200);
  assert.equal(result.body.scope.schoolId, schoolA);
  assert.equal(result.body.analytics.enrollment.students, 1);
  assert.equal(result.body.analytics.diagnostic.completionRate, 100);
  assert.equal(result.body.options.programmes[0].label, 'Առարկա · 7-րդ դասարան');
});

test('school admin cannot select another school and platform admin requires AAL2', async () => {
  const foreign = await invokeEndpoint({ schoolId: schoolB });
  assert.equal(foreign.status, 403);
  assert.equal(foreign.body.error, 'analytics_scope_unavailable');

  const weakAdmin = await invokeEndpoint({ role: 'admin', aal: 'aal1' });
  assert.equal(weakAdmin.status, 403);
  assert.equal(weakAdmin.body.error, 'mfa_required');
});
