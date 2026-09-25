import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const school = '223e4567-e89b-42d3-a456-426614174000';
const classId = '323e4567-e89b-42d3-a456-426614174000';
const recipient = '423e4567-e89b-42d3-a456-426614174000';

async function invokeProvision({ existing = recipient, allowed = true, deliveryError = null } = {}) {
  let handler;
  const calls = [];
  const service = {
    auth: {
      getUser: async () => ({ data: { user: { id: actor } }, error: null }),
      admin: {
        inviteUserByEmail: async (email, options) => {
          calls.push({ method: 'inviteUserByEmail', email, options });
          return { data: { user: { id: recipient } }, error: null };
        },
        deleteUser: async (id) => { calls.push({ method: 'deleteUser', id }); return { error: null }; },
      },
    },
    from(table) {
      assert.equal(table, 'profiles');
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { role: 'school_admin', account_status: 'active' }, error: null,
      }) }) }) };
    },
    async rpc(method, parameters) {
      calls.push({ method, parameters });
      if (method === 'service_authorize_student_invite_14c') return { data: allowed, error: null };
      if (method === 'service_lookup_invitee_by_email_14b') return { data: existing, error: null };
      if (method === 'service_issue_institutional_invitation_14b') return { data: 'invite-id', error: null };
      if (method === 'service_revoke_institutional_invitation_14b') return { data: true, error: null };
      throw new Error(`unexpected rpc ${method}`);
    },
  };
  const delivery = { auth: { signInWithOtp: async (payload) => {
    calls.push({ method: 'signInWithOtp', payload });
    return { error: deliveryError };
  } } };
  const source = readFileSync('supabase/functions/provision-student-account/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: (_url, key) => key === 'anon' ? delivery : service,
    hasActiveLiveSession: async () => true,
    Deno: { env: { get: (name) => name === 'SUPABASE_ANON_KEY' ? 'anon' : 'service' }, serve: fn => { handler = fn; } },
    Response, Request, URL, console, crypto, TextEncoder, Date, Uint8Array,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' },
    body: JSON.stringify({ schoolId: school, classId, email: 'student@example.test' }),
  }));
  return { status: response.status, body: await response.json(), calls };
}

test('existing student receives a magic enrollment link without exposing its one-time token', async () => {
  const result = await invokeProvision();
  assert.equal(result.status, 201);
  assert.equal(result.body.accountState, 'existing');
  assert.equal(result.body.token, undefined);
  const issue = result.calls.find((call) => call.method === 'service_issue_institutional_invitation_14b');
  const delivery = result.calls.find((call) => call.method === 'signInWithOtp');
  assert.equal(issue.parameters.p_school, school);
  assert.equal(issue.parameters.p_class, classId);
  assert.equal(issue.parameters.p_recipient, recipient);
  assert.equal(delivery.payload.options.shouldCreateUser, false);
  const redirect = new URL(delivery.payload.options.emailRedirectTo);
  const plaintext = redirect.searchParams.get('student_invitation');
  assert.match(plaintext, /^[0-9a-f]{64}$/);
  assert.equal(issue.parameters.p_token_digest, createHash('sha256').update(plaintext).digest('hex'));
  assert.ok(!JSON.stringify(result.body).includes(plaintext));
});

test('new student receives an Auth invite and remains a student until private acceptance', async () => {
  const result = await invokeProvision({ existing: null });
  assert.equal(result.status, 201);
  assert.equal(result.body.accountState, 'new');
  const authInvite = result.calls.find((call) => call.method === 'inviteUserByEmail');
  assert.ok(authInvite);
  assert.match(new URL(authInvite.options.redirectTo).searchParams.get('student_invitation'), /^[0-9a-f]{64}$/);
  const issue = result.calls.find((call) => call.method === 'service_issue_institutional_invitation_14b');
  assert.equal(issue.parameters.p_role, 'student');
});

test('cross-school or unassigned class denial happens before account or email mutation', async () => {
  const result = await invokeProvision({ allowed: false });
  assert.equal(result.status, 403);
  assert.equal(result.body.error, 'student_invitation_unavailable');
  assert.equal(result.calls.some((call) => ['inviteUserByEmail', 'signInWithOtp',
    'service_issue_institutional_invitation_14b'].includes(call.method)), false);
});

test('failed existing-account delivery revokes the issued invitation', async () => {
  const result = await invokeProvision({ deliveryError: { status: 503 } });
  assert.equal(result.status, 503);
  assert.ok(result.calls.some((call) => call.method === 'service_revoke_institutional_invitation_14b'));
});

async function invokeCompletion(body) {
  let handler;
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: recipient } }, error: null }) },
    async rpc(method, parameters) {
      calls.push({ method, parameters });
      return { data: { classEnrollmentId: 'enrollment-id' }, error: null };
    },
  };
  const source = readFileSync('supabase/functions/complete-student-invitation/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => true,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, Request, console, crypto, TextEncoder, Uint8Array,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json(), calls };
}

test('student acceptance hashes the token and uses the atomic database contract', async () => {
  const token = 'a'.repeat(64);
  const result = await invokeCompletion({
    token, displayName: '  Անի   Սարգսյան  ', acceptanceVersion: 'student-school-access-v1',
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.completed, true);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].method, 'service_accept_student_invitation_14c');
  assert.equal(result.calls[0].parameters.p_recipient, recipient);
  assert.equal(result.calls[0].parameters.p_display_name, 'Անի Սարգսյան');
  assert.equal(result.calls[0].parameters.p_token_digest,
    createHash('sha256').update(token).digest('hex'));
});

test('front-end collects only email from admin and private identity fields from student', () => {
  const adminHtml = readFileSync('web/school-admin.html', 'utf8');
  const accessHtml = readFileSync('web/account-access.html', 'utf8');
  const accessJs = readFileSync('web/account-access.js', 'utf8');
  assert.match(adminHtml, /id="studentEmail"/);
  assert.doesNotMatch(adminHtml, /id="studentDisplayName"/);
  assert.match(accessHtml, /id="studentDisplayName"/);
  assert.match(accessHtml, /id="studentPassword"/);
  assert.match(accessHtml, /id="studentConsent"/);
  assert.match(accessJs, /complete-student-invitation/);
});

test('institutional teacher response is roster-only and class-scoped', () => {
  const helper = readFileSync('supabase/functions/_shared/institutional-teacher-dashboard.ts', 'utf8');
  const html = readFileSync('web/teacher.html', 'utf8');
  const js = readFileSync('web/teacher.js', 'utf8');
  assert.match(helper, /e\.school_id === assignment\.school_id/);
  assert.match(helper, /e\.subject_program_id === assignment\.subject_program_id/);
  assert.match(helper, /displayName/);
  assert.match(html, /id="institutionalRoster"/);
  assert.match(js, /renderInstitutionalRoster/);
  assert.match(html, /Առաջընթացի վերլուծությունը դեռ չի գործարկվել/);
});

test('migration keeps old evidence unbound and stamps only new unambiguous sessions', () => {
  const sql = readFileSync('supabase/migrations/0108_sprint_14c_student_onboarding_context.sql', 'utf8');
  assert.match(sql, /update public\.learning_sessions set academic_context_status='unbound_legacy'/);
  assert.doesNotMatch(sql, /update public\.learning_sessions[\s\S]{0,240}set[\s\S]{0,180}school_id=/i);
  assert.match(sql, /before insert on public\.learning_sessions/);
  assert.match(sql, /coalesce\(cardinality\(v_ids\),0\)>1/);
  assert.match(sql, /ambiguous student academic context/);
  assert.match(sql, /institutional academic context unavailable/);
  assert.match(sql, /v_active_context_count>0/);
  assert.match(sql, /new\.academic_context_status:='exact'/);
  assert.match(sql, /learning session identity and provenance are immutable after insert/);
  assert.match(sql, /private\.active_school_admin_14b\(p_actor,p_school\)/);
});
