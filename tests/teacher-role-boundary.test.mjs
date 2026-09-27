import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { roleDestination } from '../web/account-roles.js';
import { loadInitialDiagnostics } from '../supabase/functions/_shared/initial-diagnostic.ts';

const functions = ['get-teacher-dashboard', 'get-teacher-student', 'manage-teacher-class', 'manage-teacher-profile'];
async function callEndpoint(name, role, active = true, authenticated = true, institutional = false) {
  let handler;
  const tables = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
    from(table) {
      tables.push(table);
      const data = table === 'profiles' ? (role === null ? null : { id: 'test-user', role, display_name: 'Test' })
        : table === 'institutional_memberships' && institutional ? [{ id: 'school-membership' }] : [];
      const query = new Proxy({}, { get: (_, key) => key === 'then'
        ? (resolve) => resolve({ data, error: null })
        : () => query });
      return query;
    },
  };
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client, hasActiveLiveSession: async () => active,
    loadInitialDiagnostics,
    resolveActiveCurriculumRelease: async () => 'release-test',
    getInstitutionalTeacherDashboard: async () => ({
      institutionalTeacher: true, institutionalOptions: [], classes: [],
      totals: { classes: 0, students: 0, studentsNeedingSupport: 0 },
    }),
    Deno: { env: { get: () => 'test' }, serve: (fn) => { handler = fn; } },
    Response, console, crypto,
  });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: authenticated ? { Authorization: 'Bearer test' } : {}, body: '{}',
  }));
  return { status: response.status, body: await response.json(), tables };
}

test('school teachers cannot create legacy schoolless join codes or read legacy class evidence', async () => {
  const management = await callEndpoint('manage-teacher-class', 'teacher', true, true, true);
  assert.equal(management.status, 403);
  assert.equal(management.body.error, 'institutional_class_flow_required');
  assert.deepEqual(management.tables, ['profiles', 'institutional_memberships']);

  const dashboard = await callEndpoint('get-teacher-dashboard', 'teacher', true, true, true);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.institutionalTeacher, true);
  assert.deepEqual(dashboard.body.classes, []);
  assert.deepEqual(dashboard.tables, ['profiles', 'institutional_memberships']);
});

for (const name of functions) {
  for (const role of ['admin', 'student', 'content_admin', null]) {
    test(`${name} rejects ${role} before accessing teacher data`, async () => {
      const result = await callEndpoint(name, role);
      assert.equal(result.status, 403);
      assert.equal(result.body.error, 'teacher_role_required');
      assert.deepEqual(result.tables, ['profiles']);
    });
  }
  test(`${name} accepts a teacher through its role gate`, async () => {
    const result = await callEndpoint(name, 'teacher');
    assert.equal(result.status, name === 'get-teacher-dashboard' ? 200 : 400);
    assert.notEqual(result.body.error, 'teacher_role_required');
  });
  test(`${name} rejects inactive sessions and unauthenticated requests`, async () => {
    const inactive = await callEndpoint(name, 'teacher', false);
    assert.equal(inactive.status, 403);
    assert.deepEqual(inactive.tables, []);
    const anonymous = await callEndpoint(name, 'teacher', true, false);
    assert.equal(anonymous.status, 401);
    assert.deepEqual(anonymous.tables, []);
  });
}

async function openTeacherPage(profile, profileError = null) {
  let calls = 0;
  const redirects = [];
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: '', style: {}, classList: {
      values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); },
    } });
    return elements.get(id);
  };
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: profileError }) }) }) }),
    functions: { invoke: async () => { calls++; return { error: new Error('stop before rendering') }; } },
  };
  let source = readFileSync('web/teacher.js', 'utf8').replace(/^import .*;\n/gm, '');
  source = source.slice(0, source.indexOf('$("signOutBtn").addEventListener'));
  const context = vm.createContext({ createClient: () => client, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
    roleDestination, document: { getElementById: getElement }, window: { location: { replace: (url) => redirects.push(url) } }, console });
  vm.runInContext(source, context);
  await vm.runInContext('loadDashboard()', context);
  return { calls, redirects, hidden: getElement('dashboardPanel').classList.values.has('hidden') };
}

for (const [role, destination] of Object.entries({ admin: './admin.html', content_admin: './content.html', student: './index.html', school_admin: './school-admin' })) {
  test(`teacher page routes ${role} without fetching teacher data`, async () => {
    const result = await openTeacherPage({ role, account_status: 'active' });
    assert.deepEqual(result.redirects, [destination]);
    assert.equal(result.calls, 0);
    assert.equal(result.hidden, true);
  });
}
test('teacher page fails closed on missing, unknown, inactive or unreadable profiles', async () => {
  for (const [profile, error] of [[null, null], [{role: 'unknown', account_status: 'active'}, null], [{role: 'teacher', account_status: 'suspended'}, null], [null, new Error('offline')]]) {
    const result = await openTeacherPage(profile, error);
    assert.equal(result.calls, 0);
    assert.equal(result.hidden, true);
  }
});
test('active teachers reach the dashboard endpoint', async () => {
  const result = await openTeacherPage({ role: 'teacher', account_status: 'active' });
  assert.equal(result.calls, 1);
  assert.deepEqual(result.redirects, []);
});
