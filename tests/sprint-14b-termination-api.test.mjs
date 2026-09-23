import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const target = '223e4567-e89b-42d3-a456-426614174000';

async function invoke(body, { active = true, accountStatus = 'active', result = true } = {}) {
  let handler;
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { account_status: accountStatus }, error: null,
    }) }) }) }),
    rpc: async (method, params) => { calls.push({ method, params }); return { data: result, error: null }; },
  };
  const source = readFileSync('supabase/functions/manage-institutional-membership/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, data: await response.json(), calls };
}

test('class enrollment termination derives actor from verified session', async () => {
  const r = await invoke({ action: 'end_enrollment', enrollmentId: target, reason: 'transfer', actorId: target });
  assert.equal(r.status, 200);
  assert.equal(r.calls[0].method, 'service_end_institutional_enrollment_14b');
  assert.equal(r.calls[0].params.p_actor, actor);
  assert.equal(r.calls[0].params.p_enrollment, target);
});

test('membership termination denies missing authorization and invalid inputs', async () => {
  const r = await invoke({ action: 'end_membership', membershipId: target, reason: 'year_end' }, { result: false });
  assert.equal(r.status, 403);
  assert.equal(r.calls[0].params.p_membership, target);
  assert.equal((await invoke({ action: 'end_membership', membershipId: target, reason: 'other' })).status, 400);
  assert.equal((await invoke({ action: 'end_membership', membershipId: 'bad', reason: 'transfer' })).status, 400);
  assert.equal((await invoke({ action: 'end_membership', membershipId: target, reason: 'transfer' }, { active: false })).status, 403);
  assert.equal((await invoke({ action: 'end_membership', membershipId: target, reason: 'transfer' }, { accountStatus: 'disabled' })).status, 403);
});
