import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const id = '123e4567-e89b-42d3-a456-426614174000';
const payload = { assignmentId: id, curriculumReleaseId: id, unitId: id };
const source = readFileSync('supabase/functions/get-teacher-academic-context/index.ts', 'utf8')
  .replace(/^import .*;\n/gm, '');

async function call({ role = 'teacher', active = true, body = payload, resolver = async () => ({ schoolId: 'school-a' }) } = {}) {
  let handler;
  let resolved = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id } }, error: null }) },
    from(table) {
      assert.equal(table, 'profiles');
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { role, account_status: 'active' }, error: null,
      }) }) }) };
    },
  };
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client,
    hasActiveLiveSession: async () => active,
    AcademicContextDenied: class AcademicContextDenied extends Error {},
    resolveAuthorizedTeacherAcademicContext: async (...args) => {
      resolved = true; return resolver(...args);
    },
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json(), resolved };
}

test('teacher request resolves selection using the authenticated identity', async () => {
  const response = await call({ resolver: async (_, teacherId, choice) => {
    assert.equal(teacherId, id);
    assert.equal(choice.assignmentId, id);
    return { schoolId: 'school-a' };
  } });
  assert.equal(response.status, 200);
  assert.equal(response.body.context.schoolId, 'school-a');
});

test('student and inactive teacher are denied before context resolution', async () => {
  for (const request of [{ role: 'student' }, { active: false }]) {
    const response = await call(request);
    assert.equal(response.status, 403);
    assert.equal(response.resolved, false);
  }
});

test('malformed or missing academic identifiers are rejected', async () => {
  for (const body of [{ ...payload, unitId: 'PHY7-U01' }, { assignmentId: id }]) {
    const response = await call({ body });
    assert.equal(response.status, 400);
    assert.equal(response.resolved, false);
  }
});
