import { ownStudentClasses } from './qa-programme-fixtures.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const roles = ['admin', 'teacher', 'student'];
export const sides = ['A', 'B'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = ['schoolId', 'classId', 'assignmentId', 'curriculumReleaseId', 'unitId', 'adminId', 'teacherId', 'studentId'];
const actorLabel = (side, role) => `${side}_${role}`;
export function validateFixture(fixture, credentials) {
  const problems = [];
  if (fixture?.dedicatedQa !== true) problems.push('dedicatedQa must be true for explicitly designated QA accounts');
  for (const side of sides) {
    for (const field of fields) if (!uuid.test(fixture?.[side]?.[field] ?? '')) problems.push(`${side}.${field} must be a UUID`);
    for (const role of roles) {
      const cred = credentials?.[actorLabel(side, role)];
      if (!cred?.email || !cred?.password) problems.push(`Missing QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL/PASSWORD`);
    }
  }
  for (const field of ['schoolId', 'classId', 'assignmentId']) {
    if (fixture?.A?.[field] && fixture.A[field] === fixture?.B?.[field]) problems.push(`A and B need distinct ${field}`);
  }
  const ids = sides.flatMap(side => roles.map(role => fixture?.[side]?.[`${role}Id`])).filter(Boolean);
  if (new Set(ids).size !== ids.length) problems.push('All six QA actor IDs must be distinct');
  const emails = Object.values(credentials ?? {}).map(c => c?.email?.trim().toLowerCase()).filter(Boolean);
  if (new Set(emails).size !== emails.length) problems.push('All six QA credential identities must be distinct');
  return problems;
}

export async function runIsolation({ fixture, credentials, url, key, fetchImpl = fetch, revision = 'unknown' }) {
  const problems = validateFixture(fixture, credentials);
  if (problems.length) throw new Error(problems.join('\n'));
  const origin = new URL(url);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('A plain HTTPS Supabase origin is required');
  const report = { scope: 'Sprint 14 authenticated read isolation', revision, target: origin.origin,
    startedAt: new Date().toISOString(), status: 'running', sprint14GateClosed: false, checks: [] };
  const sessions = new Map();
  async function request(endpoint, token, body = {}, method = 'POST') {
    try {
      const response = await fetchImpl(`${origin.origin}${endpoint}`, { method, redirect: 'error',
        headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json' },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
      let data = null;
      try { data = await response.json(); } catch { /* empty logout response or invalid response */ }
      return { status: response.status, data };
    } catch { return { status: 0, data: null }; }
  }
  function record(label, result, passed) {
    // Never include request/response bodies, credentials, tokens, names or learner data.
    report.checks.push({ label, status: passed ? 'passed' : 'failed', httpStatus: result.status });
    return passed;
  }
  async function call(label, actor, fn, body, predicate) {
    const result = await request(`/functions/v1/${fn}`, sessions.get(actor)?.token, body);
    let passed = false;
    try {
      const other = fixture[actor.startsWith('A_') ? 'B' : 'A'];
      // Own-school directories legitimately retain ended guest-teacher audit rows.
      // Mask only the known guest's person ID on a bounded ended row; never mask
      // foreign schools/classes/assignments or any active guest membership.
      const ownDirectory = fn === 'get-school-teachers' && body.schoolId === fixture[actor.startsWith('A_') ? 'A' : 'B'].schoolId;
      const scanned = ownDirectory && Array.isArray(result.data?.teachers) ? { ...result.data,
        teachers: result.data.teachers.map(t => t.person_id === other.teacherId
          && uuid.test(t.membership_id ?? '') && t.membership_status === 'ended'
          && Array.isArray(t.subjects) && t.subjects.length === 0
          && Array.isArray(t.classes) && t.classes.length === 0
          ? { ...t, person_id: 'ended-own-school-guest' } : t),
      } : result.data;
      const bodyText = JSON.stringify(scanned);
      const foreignIdentity = ['schoolId', 'classId', 'assignmentId', 'adminId', 'teacherId', 'studentId']
        .some(field => bodyText?.includes(other[field]));
      passed = predicate(result) && !foreignIdentity;
    } catch { /* malformed payloads fail the check */ }
    record(label, result, passed);
    return result;
  }
  const ok = result => result.status === 200;
  const denied = code => result => result.status === 403 && result.data?.error === code && Object.keys(result.data).length === 1;
  const selection = f => ({ assignmentId: f.assignmentId, curriculumReleaseId: f.curriculumReleaseId, unitId: f.unitId });
  try {
    for (const side of sides) for (const role of roles) {
      const actor = actorLabel(side, role);
      const login = await request('/auth/v1/token?grant_type=password', null, credentials[actor]);
      if (login.status === 200 && login.data?.access_token) sessions.set(actor, { token: login.data.access_token });
      if (!record(`${actor}: authenticated expected QA identity`, login,
        login.status === 200 && Boolean(login.data?.access_token) && login.data?.user?.id === fixture[side][`${role}Id`])) return report;
    }
    // Positive controls run before denial probes: an unauthenticated/inactive fixture cannot pass by denying everything.
    for (const side of sides) {
      const f = fixture[side], admin = actorLabel(side, 'admin'), teacher = actorLabel(side, 'teacher'), student = actorLabel(side, 'student');
      await call(`${side}: admin own school`, admin, 'get-school-admin-overview', {}, r => ok(r) && r.data?.actor?.id === f.adminId && r.data?.schools?.length === 1 && r.data.schools[0].id === f.schoolId);
      await call(`${side}: admin own teacher directory`, admin, 'get-school-teachers', { schoolId: f.schoolId }, r => ok(r) && Array.isArray(r.data?.teachers) && r.data.teachers.length > 0);
      await call(`${side}: teacher own context`, teacher, 'get-teacher-academic-context', selection(f), r => ok(r) && r.data?.context?.schoolId === f.schoolId && r.data.context.classId === f.classId);
      await call(`${side}: teacher own class evidence`, teacher, 'get-teacher-dashboard', { selection: selection(f) }, r => ok(r) && r.data?.teacher?.id === f.teacherId && r.data?.classes?.some(c => c.id === f.classId && c.students?.some(s => s.id === f.studentId)) && r.data.classes.every(c => c.schoolId === f.schoolId));
      await call(`${side}: teacher own learner detail`, teacher, 'get-teacher-student', { ...selection(f), classId: f.classId, studentId: f.studentId }, r => ok(r) && r.data?.student?.id === f.studentId && r.data?.curriculumReleaseId === f.curriculumReleaseId && r.data?.selectedUnit?.unitId === f.unitId);
      await call(`${side}: student own enrolment`, student, 'get-student-classes', {}, r => ok(r) && ownStudentClasses(r.data, f));
    }
    if (report.checks.some(c => c.status === 'failed')) return report;
    for (const side of sides) {
      const f = fixture[side], other = fixture[side === 'A' ? 'B' : 'A'];
      const admin = actorLabel(side, 'admin'), teacher = actorLabel(side, 'teacher'), student = actorLabel(side, 'student');
      await call(`${side}: admin cannot read other directory`, admin, 'get-school-teachers', { schoolId: other.schoolId }, denied('school_unavailable'));
      await call(`${side}: admin cannot select other overview`, admin, 'get-school-admin-overview', { schoolId: other.schoolId }, r => ok(r) && r.data?.schools?.length === 1 && r.data.schools[0].id === f.schoolId);
      await call(`${side}: teacher cannot select other context`, teacher, 'get-teacher-academic-context', selection(other), denied('academic_context_unavailable'));
      await call(`${side}: teacher cannot select other dashboard`, teacher, 'get-teacher-dashboard', { selection: selection(other) }, denied('academic_context_unavailable'));
      await call(`${side}: teacher cannot read other learner context`, teacher, 'get-teacher-student', { ...selection(other), classId: other.classId, studentId: other.studentId }, denied('academic_context_unavailable'));
      await call(`${side}: other learner cannot be substituted into own class`, teacher, 'get-teacher-student', { ...selection(f), classId: f.classId, studentId: other.studentId }, denied('student_not_in_teacher_class'));
      await call(`${side}: other class cannot be substituted into own assignment`, teacher, 'get-teacher-student', { ...selection(f), classId: other.classId, studentId: f.studentId }, denied('academic_context_unavailable'));
      await call(`${side}: omitted context cannot expose other learner through legacy path`, teacher, 'get-teacher-student', { classId: other.classId, studentId: other.studentId }, denied('student_not_in_teacher_class'));
      await call(`${side}: student supplied identity cannot change enrolment reads`, student, 'get-student-classes', { studentId: other.studentId, schoolId: other.schoolId, classId: other.classId }, r => ok(r) && ownStudentClasses(r.data, f));
      await call(`${side}: student cannot use teacher evidence API`, student, 'get-teacher-student', { ...selection(other), classId: other.classId, studentId: other.studentId }, denied('teacher_role_required'));
      await call(`${side}: student cannot use school directory API`, student, 'get-school-teachers', { schoolId: other.schoolId }, denied('school_admin_required'));
      await call(`${side}: teacher cannot use school directory API`, teacher, 'get-school-teachers', { schoolId: other.schoolId }, denied('school_admin_required'));
      for (const role of roles) {
        const result = await request(`/rest/v1/institutional_class_enrollments?select=id&school_id=eq.${other.schoolId}`, sessions.get(actorLabel(side, role)).token, null, 'GET');
        record(`${side}_${role}: direct other-school enrolment read denied or empty`, result,
          (result.status === 403 && result.data?.code === '42501') || (result.status === 200 && Array.isArray(result.data) && result.data.length === 0));
      }
    }
  } finally {
    for (const [actor, session] of sessions) {
      const result = await request('/auth/v1/logout?scope=local', session.token);
      record(`${actor}: close only this QA session`, result, result.status === 204 || result.status === 200);
    }
    report.status = report.checks.some(c => c.status === 'failed') ? 'failed' : 'passed';
    report.finishedAt = new Date().toISOString();
  }
  return report;
}

async function main() {
  const reportPath = path.resolve(process.env.QA_ISOLATION_REPORT ?? 'qa-results/sprint-14-isolation.json');
  const credentials = Object.fromEntries(sides.flatMap(side => roles.map(role => [actorLabel(side, role), {
    email: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL`], password: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_PASSWORD`],
  }])));
  let fixture;
  try { fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}'); } catch { throw new Error('QA_TENANT_FIXTURES_JSON must be valid JSON'); }
  const problems = validateFixture(fixture, credentials);
  if (problems.length) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify({ status: 'blocked', sprint14GateClosed: false, problems }, null, 2), { mode: 0o600 });
    console.error('Authenticated isolation QA blocked:\n' + problems.join('\n'));
    process.exitCode = 2; return;
  }
  // Only the committed public client configuration is used; no service-role key or impersonation path.
  const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
  const url = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
  const key = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  if (!url || !key) throw new Error('Committed public Supabase configuration missing');
  const report = await runIsolation({ fixture, credentials, url, key, revision: process.env.GITHUB_SHA ?? 'local' });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`Authenticated read-isolation checks: ${report.status}; ${report.checks.filter(c => c.status === 'passed').length}/${report.checks.length} passed.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Isolation runner failed before producing complete evidence. No gate is closed.'); process.exitCode = 1; });
}
