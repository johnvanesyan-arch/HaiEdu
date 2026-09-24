import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const invitation = '223e4567-e89b-42d3-a456-426614174000';

async function invoke(body, { active = true, revoked = true } = {}) {
  let handler;
  const calls = [];
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) },
    rpc: async (method, params) => {
      calls.push({ method, params });
      return { data: method === 'service_list_staff_invites_14b' ? [] : revoked, error: null };
    },
  };
  const source = readFileSync('supabase/functions/manage-staff-invitation/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => admin, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json(), calls };
}

test('list and revoke derive the actor from the verified session', async () => {
  const listed = await invoke({ action: 'list', p_actor: invitation });
  assert.equal(listed.status, 200);
  assert.equal(listed.calls[0].params.p_actor, actor);
  const revoked = await invoke({ action: 'revoke', invitationId: invitation, p_actor: invitation });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.calls[0].params.p_actor, actor);
  assert.equal(revoked.calls[0].params.p_invitation, invitation);
});

test('inactive session and invalid invitation cannot reach privileged RPC', async () => {
  const inactive = await invoke({ action: 'list' }, { active: false });
  assert.equal(inactive.status, 403);
  assert.equal(inactive.calls.length, 0);
  const invalid = await invoke({ action: 'revoke', invitationId: 'bad' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.calls.length, 0);
  const denied = await invoke({ action: 'revoke', invitationId: invitation }, { revoked: false });
  assert.equal(denied.status, 403);
});
