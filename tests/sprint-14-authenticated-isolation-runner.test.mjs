import test from 'node:test';
import assert from 'node:assert/strict';
import { runIsolation, validateFixture, sides, roles } from '../scripts/sprint-14-isolation.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function inputs() {
  const fixture = { dedicatedQa: true };
  const credentials = {};
  for (const [i, side] of sides.entries()) {
    fixture[side] = Object.fromEntries(['schoolId','classId','assignmentId','curriculumReleaseId','unitId','adminId','teacherId','studentId'].map((f,j)=>[f,id(i*20+j+1)]));
    for (const role of roles) credentials[`${side}_${role}`] = { email: `${side}_${role}@example.invalid`, password: `PRIVATE-${side}-${role}` };
  }
  return { fixture, credentials, url:'https://qa.example.invalid', key:'public-test-key' };
}
function server(input, alter = () => null) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const u = new URL(url), body = options.body ? JSON.parse(options.body) : {};
    const actor = options.headers.Authorization.replace('Bearer token-', '');
    calls.push({ path:u.pathname, actor, body, query:u.search });
    const override = alter(u, options, body, actor);
    if (override) return new Response(JSON.stringify(override.data), {status:override.status});
    const reply = (data, status=200) => new Response(JSON.stringify(data), {status});
    if (u.pathname === '/auth/v1/token') {
      const label = body.email.split('@')[0], [s,r] = label.split('_');
      return reply({ access_token:`token-${label}`, refresh_token:'PRIVATE-REFRESH', user:{id:input.fixture[s][`${r}Id`]} });
    }
    if (u.pathname === '/auth/v1/logout') return new Response(null, {status:204});
    const [side,role] = actor.split('_'), f = input.fixture[side];
    if (u.pathname.startsWith('/rest/')) return reply([]);
    const fn = u.pathname.split('/').pop();
    const deny = error => reply({error},403);
    if (fn === 'get-school-admin-overview') return reply({actor:{id:f.adminId},schools:[{id:f.schoolId}]});
    if (fn === 'get-school-teachers') {
      if (role !== 'admin') return deny('school_admin_required');
      return body.schoolId === f.schoolId ? reply({teachers:[{id:f.teacherId}]}) : deny('school_unavailable');
    }
    if (fn === 'get-student-classes') return reply({classes:[{id:f.classId}]});
    if (role !== 'teacher') return deny('teacher_role_required');
    const selection = body.selection ?? body;
    if (selection.assignmentId && selection.assignmentId !== f.assignmentId) return deny('academic_context_unavailable');
    if (fn === 'get-teacher-academic-context') return reply({context:{schoolId:f.schoolId,classId:f.classId}});
    if (fn === 'get-teacher-dashboard') return reply({teacher:{id:f.teacherId},classes:[{id:f.classId,schoolId:f.schoolId,students:[{id:f.studentId}]}]});
    if (fn === 'get-teacher-student') {
      if (body.assignmentId && body.classId !== f.classId) return deny('academic_context_unavailable');
      if (body.studentId !== f.studentId) return deny('student_not_in_teacher_class');
      return reply({student:{id:f.studentId},curriculumReleaseId:f.curriculumReleaseId,selectedUnit:{unitId:f.unitId}});
    }
    throw new Error('Unexpected endpoint');
  };
  return { fetchImpl, calls };
}
test('preflight requires two schools, six distinct dedicated identities and credentials', () => {
  const input=inputs(); assert.deepEqual(validateFixture(input.fixture,input.credentials),[]);
  input.fixture.B.schoolId=input.fixture.A.schoolId;
  input.fixture.B.studentId=input.fixture.A.studentId;
  delete input.credentials.B_teacher.password;
  input.fixture.dedicatedQa=false;
  assert.equal(validateFixture(input.fixture,input.credentials).length,4);
});
test('both directions run only after positive controls and all QA sessions close locally', async () => {
  const input=inputs(), mock=server(input);
  const report=await runIsolation({...input,...mock});
  assert.equal(report.status,'passed'); assert.equal(report.checks.length,54);
  assert.equal(report.sprint14GateClosed,false);
  assert.equal(mock.calls.filter(c=>c.path==='/auth/v1/logout'&&c.query==='?scope=local').length,6);
  for(const side of sides) assert.ok(report.checks.some(c=>c.label===`${side}: teacher cannot select other context`));
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE|token-|example.invalid.*@|refresh_token|access_token/);
  assert.ok(mock.calls.every(c=>!/(?:start-learning|submit-|manage-|join-class|provision-)/.test(c.path)));
});
test('401 cannot count as proof of tenant authorization denial', async () => {
  const input=inputs(), mock=server(input,(u,o,b,actor)=>u.pathname.endsWith('get-school-teachers')&&actor==='A_admin'&&b.schoolId===input.fixture.B.schoolId?{status:401,data:{error:'unauthorized'}}:null);
  const report=await runIsolation({...input,...mock});
  assert.equal(report.status,'failed');
  assert.equal(report.checks.find(c=>c.label==='A: admin cannot read other directory').status,'failed');
});
test('cross-school disclosure is a failure even when HTTP succeeds', async () => {
  const input=inputs(), mock=server(input,(u,o,b,actor)=>u.pathname.endsWith('get-teacher-student')&&actor==='A_teacher'&&b.assignmentId===input.fixture.B.assignmentId?{status:200,data:{student:{id:input.fixture.B.studentId},secret:'PRIVATE-LEARNER-DATA'}}:null);
  const report=await runIsolation({...input,...mock});
  assert.equal(report.status,'failed'); assert.doesNotMatch(JSON.stringify(report),/PRIVATE-LEARNER-DATA/);
});
test('invalid positive control stops negative probes and still logs out', async () => {
  const input=inputs(), mock=server(input,u=>u.pathname.endsWith('get-school-admin-overview')?{status:403,data:{error:'account_or_session_inactive'}}:null);
  const report=await runIsolation({...input,...mock});
  assert.equal(report.status,'failed');
  assert.ok(!report.checks.some(c=>c.label.includes('cannot read other directory')));
  assert.equal(mock.calls.filter(c=>c.path==='/auth/v1/logout').length,6);
});
test('wrong credential identity stops immediately and closes the new session', async () => {
  const input=inputs(), mock=server(input,u=>u.pathname==='/auth/v1/token'?{status:200,data:{access_token:'token-A_admin',user:{id:id(999)}}}:null);
  const report=await runIsolation({...input,...mock});
  assert.equal(report.status,'failed'); assert.equal(report.checks.length,2);
  assert.equal(mock.calls.filter(c=>c.path.startsWith('/functions')).length,0);
});
test('network failure and failed cleanup are reported without tokens', async () => {
  const input=inputs(), mock=server(input);
  const fetchImpl=(url,options)=>url.includes('/logout')?Promise.reject(new Error('PRIVATE token-A_admin')):mock.fetchImpl(url,options);
  const report=await runIsolation({...input,fetchImpl});
  assert.equal(report.status,'failed'); assert.doesNotMatch(JSON.stringify(report),/PRIVATE|token-/);
});
