import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const school = '223e4567-e89b-42d3-a456-426614174000';
const subject = '323e4567-e89b-42d3-a456-426614174000';
const invited = '423e4567-e89b-42d3-a456-426614174000';

async function invoke(name, body, { active = true, permitted = true, registerError = null, inviteError = null } = {}) {
  let handler;
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: actor } }, error: null }),
      admin: {
        inviteUserByEmail: async (email, options) => {
          calls.push({ method: 'email_invite', email, options });
          return { data: { user: { id: invited } }, error: inviteError };
        },
      },
    },
    rpc: async (method, params) => {
      calls.push({ method, params });
      if (method === 'service_authorize_staff_invite_14b') return { data: permitted, error: null };
      if (method === 'service_register_staff_invite_14b') return { data: registerError ? null : invited, error: registerError };
      if (method === 'service_accept_staff_invite_14b') return { data: { schoolId: school, membershipId: subject }, error: null };
      return { data: true, error: null };
    },
  };
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json(), calls };
}

const schoolInvite = {
  kind: 'school_admin', email: 'school.admin@example.test',
  schoolName: 'School One', schoolCode: 'SCHOOL-ONE',
};
test('only verified platform authority can send a first-school invitation', async () => {
  const denied = await invoke('provision-staff-account', schoolInvite, { permitted: false });
  assert.equal(denied.status, 403);
  assert.equal(denied.calls.some(x => x.method === 'email_invite'), false);
  const good = await invoke('provision-staff-account', schoolInvite);
  assert.equal(good.status, 201);
  assert.equal(good.calls[0].params.p_actor, actor);
  assert.equal(good.calls[1].email, schoolInvite.email);
  assert.equal(good.calls[1].options.redirectTo, 'https://www.haiedu.am/account-access');
  assert.equal(good.calls[2].params.p_recipient, invited);
});

test('teacher invite binds school and subject; registration failure never deletes Auth identity', async () => {
  const payload = { kind: 'teacher', email: 'teacher@example.test', schoolId: school, subjectId: subject };
  const denied = await invoke('provision-staff-account', { ...payload, schoolName: 'Wrong' });
  assert.equal(denied.status, 400);
  assert.equal(denied.calls.length, 0);
  const result = await invoke('provision-staff-account', payload, { registerError: { message: 'deny' } });
  assert.equal(result.status, 403);
  assert.equal(result.calls[2].params.p_school, school);
  assert.equal(result.calls[2].params.p_subject, subject);
  assert.equal(result.calls.some(x => x.method === 'delete_unprivileged_user'), false);
});

test('acceptance derives the recipient from the live session', async () => {
  const result = await invoke('accept-staff-account', { p_recipient: invited });
  assert.equal(result.status, 200);
  assert.equal(result.calls[0].method, 'service_accept_staff_invite_14b');
  assert.equal(result.calls[0].params.p_recipient, actor);
  const inactive = await invoke('accept-staff-account', {}, { active: false });
  assert.equal(inactive.status, 403);
  assert.equal(inactive.calls.length, 0);
});
