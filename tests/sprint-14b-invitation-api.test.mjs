import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const school = '223e4567-e89b-42d3-a456-426614174000';
const recipient = '323e4567-e89b-42d3-a456-426614174000';
const classId = '423e4567-e89b-42d3-a456-426614174000';
const assignment = '523e4567-e89b-42d3-a456-426614174000';

async function invoke(name, body, { active = true, accountStatus = 'active', rpcResult = null, schoolMember = true } = {}) {
  let handler;
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
    from(table) {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { account_status: accountStatus }, error: null,
      }) }) }) };
      assert.equal(table, 'institutional_memberships');
      const query = new Proxy({}, { get(_, key) {
        if (key === 'then') return done => done({ data: schoolMember ? [{
          role: 'teacher', valid_from: '2026-01-01T00:00:00Z', valid_to: null,
        }] : [], error: null });
        return () => query;
      } });
      return query;
    },
    async rpc(method, parameters) {
      calls.push({ method, parameters });
      return rpcResult ?? { data: method.includes('lookup_invitee') ? recipient
        : method.includes('issue') ? 'invitation-id'
        : method.includes('revoke') ? true : {
          schoolId: school, membershipId: 'membership-id', classEnrollmentId: 'enrollment-id',
        }, error: null };
    },
  };
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console, crypto, TextEncoder, Date, Uint8Array,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json(), calls };
}

test('issue returns one token and passes only its digest to the database', async () => {
  const result = await invoke('manage-institutional-invitation', {
    action: 'issue', schoolId: school, recipientUserId: recipient,
    role: 'student', classId, assignmentId: assignment, expiresInHours: 2,
  });
  assert.equal(result.status, 201);
  assert.match(result.body.token, /^[0-9a-f]{64}$/);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].parameters.p_actor, actor);
  assert.equal(result.calls[0].parameters.p_school, school);
  assert.equal(result.calls[0].parameters.p_token_digest,
    createHash('sha256').update(result.body.token).digest('hex'));
  assert.ok(!JSON.stringify(result.calls).includes(result.body.token));
});

test('invalid request, inactive actor and failed authorization never return a token', async () => {
  for (const [body, options, expected] of [
    [{ action: 'issue', schoolId: 'wrong', recipientUserId: recipient, role: 'student' }, {}, 400],
    [{ action: 'issue', schoolId: school, recipientUserId: recipient, role: 'student', expiresInHours: 169 }, {}, 400],
    [{ action: 'issue', schoolId: school, recipientUserId: recipient, role: 'student' }, { active: false }, 403],
    [{ action: 'issue', schoolId: school, recipientUserId: recipient, role: 'student' }, { schoolMember: false }, 403],
    [{ action: 'issue', schoolId: school, recipientUserId: recipient, role: 'student' },
      { rpcResult: { data: null, error: { message: 'deny' } } }, 403],
  ]) {
    const result = await invoke('manage-institutional-invitation', body, options);
    assert.equal(result.status, expected);
    assert.equal(result.body.token, undefined);
  }
});

test('existing-user email resolves inside the service boundary before issue', async () => {
  const result = await invoke('manage-institutional-invitation', {
    action: 'issue', schoolId: school, recipientEmail: 'student@example.test', role: 'student',
  });
  assert.equal(result.status, 201);
  assert.equal(result.calls[0].method, 'service_lookup_invitee_by_email_14b');
  assert.equal(result.calls[1].parameters.p_recipient, recipient);
  assert.equal(result.body.recipientEmail, undefined);
});

test('revocation uses the authenticated actor and returns a generic denial', async () => {
  const result = await invoke('manage-institutional-invitation', {
    action: 'revoke', invitationId: assignment,
  }, { rpcResult: { data: false, error: null } });
  assert.equal(result.status, 403);
  assert.equal(result.calls[0].parameters.p_actor, actor);
});

test('redeem hashes the token and denies a missing or rejected invitation', async () => {
  const token = 'a'.repeat(64);
  const result = await invoke('redeem-institutional-invitation', { token });
  assert.equal(result.status, 200);
  assert.equal(result.calls[0].parameters.p_recipient, actor);
  assert.equal(result.calls[0].parameters.p_token_digest,
    createHash('sha256').update(token).digest('hex'));
  const denied = await invoke('redeem-institutional-invitation', { token }, {
    rpcResult: { data: null, error: { message: 'wrong recipient' } },
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(Object.keys(denied.body), ['error']);
  assert.equal((await invoke('redeem-institutional-invitation', { token: 'short' })).status, 400);
});
