import * as rateFeedbackBindings from '../web/rate-budget-feedback.mjs';
import * as rateBudgetBindings from '../supabase/functions/_shared/rate-budget.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const candidate = '223e4567-e89b-42d3-a456-426614174000';
const session = '323e4567-e89b-42d3-a456-426614174000';
const authSource = stripTypeScriptTypes(readFileSync('supabase/functions/_shared/auth.ts', 'utf8'));
const { hasActiveLiveSession } = await import(`data:text/javascript;base64,${Buffer.from(authSource).toString('base64')}`);
const jwt = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

// Exercise the actual handler and live-session/parser helper. Auth, profiles
// and RPC replies are isolated stubs; these are not provider sign-in tests.
async function invoke(body, options = {}) {
  const { role = 'admin', active = true, status = 'active', rpcError = null,
    authError = null, sessionError = null, profileError = null } = options;
  let handler;
  const calls = [], sessionCalls = [], budgetCalls = [], authTokens = [];
  let bodyReads = 0, profileReads = 0;
  const aal = Object.hasOwn(options, 'aal') ? options.aal : 'aal2';
  const token = options.token ?? jwt(options.claims ?? { sub: actor, session_id: session, aal });
  const client = {
    auth: { getUser: async value => {
      authTokens.push(value);
      return { data: { user: authError || options.missingUser ? null : { id: actor } }, error: authError };
    } },
    from: table => {
      assert.equal(table, 'profiles');
      return { select: () => ({ eq: (column, value) => {
        assert.equal(column, 'id'); assert.equal(value, actor);
        return { maybeSingle: async () => {
          profileReads++;
          return { data: { role, account_status: status }, error: profileError };
        } };
      } }) };
    },
    rpc: async (method, params) => {
      if (method === 'service_validate_active_session') {
        sessionCalls.push({ method, params });
        return { data: active, error: sessionError };
      }
      if (method === 'service_reserve_session_rate_budgets') {
        budgetCalls.push({ method, params });
        return { data: options.budget ?? { allowed: true, retryAfterSeconds: 0 }, error: options.budgetError ?? null };
      }
      calls.push({ method, params });
      return { data: method.includes('lookup') ? candidate : { schoolId: 'school', membershipId: 'membership' }, error: rpcError };
    },
  };
  const source = readFileSync('supabase/functions/bootstrap-school/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), Object.assign({...rateBudgetBindings,
    createClient: () => client, hasActiveLiveSession,
    enforceRateBudget: rateBudgetBindings.createRateBudgetGate(() => options.rateMode ?? 'off'),
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, console, atob,
  },rateFeedbackBindings));
  const method = options.method ?? 'POST';
  const request = new Request('https://test.invalid', {
    method, headers: options.noAuthorization ? {} : { Authorization: `Bearer ${token}` },
    body: method === 'POST' ? options.rawBody ?? JSON.stringify(body) : undefined,
  });
  const readJson = request.json.bind(request);
  request.json = async () => { bodyReads++; return readJson(); };
  const res = await handler(request);
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data, calls, sessionCalls, budgetCalls, authTokens, bodyReads, profileReads,
    retryAfter: res.headers.get('retry-after') };
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
  assert.equal(r.sessionCalls[0].params.p_user_id, actor);
  assert.equal(r.sessionCalls[0].params.p_session_id, session);
  assert.equal(r.bodyReads, 1);
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

test('school bootstrap requires verified AAL2 before reading the body or resolving a recipient', async () => {
  for (const aal of ['aal1', undefined, null, 'aal3', true, { aal: 'aal2' }]) {
    const r = await invoke({ name: 'School One', firstAdminEmail: 'admin@example.test' }, { aal });
    assert.equal(r.status, 403);
    assert.equal(r.data.error, 'mfa_required');
    assert.equal(r.bodyReads, 0);
    assert.equal(r.calls.length, 0);
    assert.equal(r.profileReads, 1);
    assert.equal(r.sessionCalls.length, 1);
  }
});

test('request fields and claimed identity cannot upgrade an AAL1 session', async () => {
  const r = await invoke({ ...request, aal: 'aal2', mfaVerified: true, actorId: candidate, role: 'admin' }, {
    aal: 'aal1',
  });
  assert.equal(r.status, 403);
  assert.equal(r.data.error, 'mfa_required');
  assert.equal(r.bodyReads, 0);
  assert.equal(r.calls.length, 0);
});

test('a fresh verified AAL2 token can proceed after the MFA-required response', async () => {
  const first = await invoke(request, { aal: 'aal1' });
  assert.equal(first.status, 403);
  assert.equal(first.calls.length, 0);
  const verified = await invoke(request, { aal: 'aal2' });
  assert.equal(verified.status, 201);
  assert.equal(verified.calls.length, 1);
  assert.equal(verified.calls[0].params.p_actor, actor);
});

test('AAL2 does not grant non-admins or inactive accounts school-creation authority', async () => {
  for (const options of [
    { role: 'student' }, { role: 'teacher' }, { role: 'school_admin' }, { role: 'content_admin' },
    { status: 'suspended' }, { status: 'archived' }, { status: 'deletion_pending' },
    { profileError: { message: 'profile unavailable' } },
  ]) {
    const r = await invoke(request, { ...options, aal: 'aal2' });
    assert.equal(r.status, 403);
    assert.equal(r.data.error, 'school_bootstrap_unavailable');
    assert.equal(r.bodyReads, 0);
    assert.equal(r.calls.length, 0);
  }
});

test('revoked, missing and unreadable live sessions stay denied with AAL2', async () => {
  for (const options of [
    { active: false }, { sessionError: { message: 'session unavailable' } },
    { claims: { sub: actor, aal: 'aal2' } }, { token: 'malformed' },
  ]) {
    const r = await invoke(request, options);
    assert.equal(r.status, 403);
    assert.equal(r.data.error, 'account_or_session_inactive');
    assert.equal(r.profileReads, 0);
    assert.equal(r.bodyReads, 0);
    assert.equal(r.calls.length, 0);
  }
});

test('Auth rejection, missing identity and missing authorization stop all business access', async () => {
  for (const options of [
    { authError: { message: 'invalid or expired token' } }, { missingUser: true }, { noAuthorization: true },
  ]) {
    const r = await invoke(request, options);
    assert.equal(r.status, 401);
    assert.equal(r.profileReads, 0);
    assert.equal(r.sessionCalls.length, 0);
    assert.equal(r.bodyReads, 0);
    assert.equal(r.calls.length, 0);
  }
});

test('the existing per-person admission contract remains in force when enabled', async () => {
  const accepted = await invoke(request, { rateMode: 'enforce-v1' });
  assert.equal(accepted.status, 201);
  assert.equal(accepted.budgetCalls.length, 1);
  assert.equal(accepted.budgetCalls[0].params.p_session, session);
  assert.equal(accepted.calls.length, 1);
  for (const [options, status] of [
    [{ budget: { allowed: false, retryAfterSeconds: 12 } }, 429],
    [{ budgetError: { message: 'budget unavailable' } }, 503],
  ]) {
    const denied = await invoke(request, { ...options, rateMode: 'enforce-v1' });
    assert.equal(denied.status, status);
    assert.equal(denied.bodyReads, 0);
    assert.equal(denied.calls.length, 0);
    if (status === 429) assert.equal(denied.retryAfter, '12');
  }
});

test('preflight and method rejection need no privileged session or body', async () => {
  for (const [method, status] of [['OPTIONS', 200], ['GET', 405]]) {
    const r = await invoke(request, { method, noAuthorization: true });
    assert.equal(r.status, status);
    assert.equal(r.authTokens.length, 0);
    assert.equal(r.bodyReads, 0);
    assert.equal(r.calls.length, 0);
  }
});
