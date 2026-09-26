import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

async function invoke(name, body, tables) {
  let handler;
  const reads = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) },
    async rpc(name) {
      if (name === 'service_redeem_institutional_join_code_14c') {
        return { data: null, error: null };
      }
      throw new Error(`unexpected RPC: ${name}`);
    },
    from(table) {
      reads.push(table);
      const query = new Proxy({}, { get(_, key) {
        if (key === 'then') return (done) => done({ data: tables[table] ?? null, error: null });
        return () => query;
      } });
      return query;
    },
  };
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => true,
    getStudentCourseEntitlements: async () => { throw new Error('unexpected entitlement read'); },
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, reads };
}

test('legacy join code cannot enroll into a scoped class', async () => {
  const result = await invoke('join-class', { joinCode: 'ABCDEFGH' }, {
    profiles: { role: 'student' }, classes: { id: 'class-b', school_id: 'school-b', is_active: true },
  });
  assert.equal(result.status, 404);
  assert.deepEqual(result.reads, ['profiles', 'classes']);
});

test('legacy class manager cannot mutate a scoped class owned by the same teacher', async () => {
  const result = await invoke('manage-teacher-class', { action: 'archive', classId: 'class-b' }, {
    profiles: { role: 'teacher' }, classes: { id: 'class-b', teacher_id: 'user-a', school_id: 'school-b', is_active: true },
  });
  assert.equal(result.status, 403);
  assert.deepEqual(result.reads, ['profiles', 'institutional_memberships', 'classes']);
});

test('legacy teacher detail denies a scoped class before reading learner evidence', async () => {
  const result = await invoke('get-teacher-student', { studentId: 'student-b', classId: 'class-b' }, {
    profiles: { role: 'teacher' }, class_memberships: [{ class_id: 'class-b', classes: {
      id: 'class-b', teacher_id: 'user-a', school_id: 'school-b',
    } }],
  });
  assert.equal(result.status, 403);
  assert.deepEqual(result.reads, ['profiles', 'class_memberships']);
});
