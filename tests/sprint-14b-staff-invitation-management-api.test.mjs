import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const invitation = '223e4567-e89b-42d3-a456-426614174000';
const recipient = '323e4567-e89b-42d3-a456-426614174000';

async function invoke(body, { active = true, revoked = true,
  claim = [{ recipient_id: recipient, recipient_email: 'invitee@example.test' }],
  inviteError = null, invitedId = recipient, actorRole = 'school_admin', aal = 'aal2' } = {}) {
  let handler;
  const calls = [];
  const token = `x.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.x`;
  const admin = {
    auth: {
      getUser: async () => ({ data: { user: { id: actor } }, error: null }),
      admin: { inviteUserByEmail: async (email, options) => {
        calls.push({ method: 'email_invite', email, options });
        return { data: { user: { id: invitedId } }, error: inviteError };
      } },
    },
    rpc: async (method, params) => {
      calls.push({ method, params });
      return { data: method === 'service_list_staff_invites_14b' ? []
        : method === 'service_claim_staff_invite_resend_14b' ? claim : revoked, error: null };
    },
    from: table => {
      assert.equal(table, 'profiles');
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: { role: actorRole, account_status: 'active' }, error: null,
        }),
      };
      return query;
    },
  };
  const source = readFileSync('supabase/functions/manage-staff-invitation/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => admin, hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console, atob,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
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
  const weakMaster = await invoke({ action: 'list' }, { actorRole: 'admin', aal: 'aal1' });
  assert.equal(weakMaster.status, 403);
  assert.equal(weakMaster.body.error, 'mfa_required');
  assert.equal(weakMaster.calls.length, 0);
});


test('resend uses the verified actor and ledger recipient, not a client email', async () => {
  const result = await invoke({ action: 'resend', invitationId: invitation,
    recipient_email: 'attacker@example.test', p_actor: recipient });
  assert.equal(result.status, 200);
  assert.equal(result.body.resendRequested, true);
  assert.equal(result.calls[0].method, 'service_claim_staff_invite_resend_14b');
  assert.equal(result.calls[0].params.p_actor, actor);
  assert.equal(result.calls[0].params.p_invitation, invitation);
  assert.equal(result.calls[1].email, 'invitee@example.test');
  assert.equal(result.calls[1].options.redirectTo, 'https://www.haiedu.am/account-access');
});

test('resend denies invalid, unauthorized and failed deliveries without claiming success', async () => {
  const malformed = await invoke({ action: 'resend', invitationId: 'bad' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.calls.length, 0);
  const inactive = await invoke({ action: 'resend', invitationId: invitation }, { active: false });
  assert.equal(inactive.status, 403);
  assert.equal(inactive.calls.length, 0);
  const denied = await invoke({ action: 'resend', invitationId: invitation }, { claim: [] });
  assert.equal(denied.status, 409);
  assert.equal(denied.calls.some(x => x.method === 'email_invite'), false);
  const error = await invoke({ action: 'resend', invitationId: invitation },
    { inviteError: { code: 'email_exists', status: 422 } });
  assert.equal(error.status, 503);
  assert.equal(error.body.resendRequested, undefined);
  const quota = await invoke({ action: 'resend', invitationId: invitation },
    { inviteError: { code: 'over_email_send_rate_limit', status: 429 } });
  assert.equal(quota.status, 429);
  assert.equal(quota.body.error, 'email_rate_limited');
  assert.equal(quota.body.resendRequested, undefined);
  const mismatch = await invoke({ action: 'resend', invitationId: invitation },
    { invitedId: actor });
  assert.equal(mismatch.status, 503);
});
