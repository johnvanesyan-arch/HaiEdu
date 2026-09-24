import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const candidate = '223e4567-e89b-42d3-a456-426614174000';
async function invoke(body, { role = 'admin', active = true, status = 'active', rpcError = null } = {}) {
  let handler;
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { role, account_status: status }, error: null,
    }) }) }) }),
    rpc: async (method, params) => {
      calls.push({ method, params });
      return { data: method.includes('lookup') ? candidate : { schoolId: 'school', membershipId: 'membership' }, error: rpcError };
    },
  };
  const source = readFileSync('supabase/functions/bootstrap-school/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const res = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: res.status, data: await res.json(), calls };
}
const request = { name: 'School One', firstAdminId: candidate };

test('platform admin bootstraps with verified actor and no client supplied authority', async () => {
  const r = await invoke({ ...request, actorId: candidate });
  assert.equal(r.status, 201);
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].method, 'service_bootstrap_school_14b');
  assert.equal(r.calls[0].params.p_actor, actor);
  assert.equal(r.calls[0].params.p_first_admin, candidate);
  assert.equal(r.calls[0].params.p_code, null);
});

test('existing-account email resolves only after actor authorization', async () => {
  const r = await invoke({ name: 'School One', firstAdminEmail: 'admin@example.test' });
  assert.equal(r.status, 201);
  assert.equal(r.calls[0].method, 'service_lookup_invitee_by_email_14b');
  assert.equal(r.calls[1].params.p_first_admin, candidate);
  const denied = await invoke({ name: 'School One', firstAdminEmail: 'admin@example.test' }, { role: 'school_admin' });
  assert.equal(denied.status, 403);
  assert.equal(denied.calls.length, 0);
});

test('inactive and malformed requests are denied without database mutation', async () => {
  for (const [body, options, expected] of [
    [request, { active: false }, 403],
    [request, { status: 'suspended' }, 403],
    [{ ...request, schoolCode: 'SCH-ONE' }, {}, 400],
    [{ ...request, firstAdminId: 'bad' }, {}, 400],
    [{ ...request, firstAdminEmail: 'admin@example.test' }, {}, 400],
    [request, { rpcError: { message: 'denied' } }, 403],
  ]) {
    const r = await invoke(body, options);
    assert.equal(r.status, expected);
    if (expected !== 403 || !options.rpcError) assert.equal(r.calls.length, 0);
  }
});
