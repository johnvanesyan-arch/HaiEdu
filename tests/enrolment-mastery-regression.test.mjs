import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const read = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const accessSource = stripTypeScriptTypes(await read('supabase/functions/_shared/course-access.ts')).replaceAll('export ', '');
const authSource = stripTypeScriptTypes(await read('supabase/functions/_shared/auth.ts')).replaceAll('export ', '');
const enrollment = { student_id: 'student-a', class_id: 'class-a', status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_to: null };
function database(overrides = {}, failedTable = null) {
  const tables = {
    institutional_class_enrollments: [{ ...enrollment }], class_memberships: [],
    classes: [{ id: 'class-a', name: '7A', is_active: true, subject_id: 'physics', grade_id: '7' }],
    subjects: [{ id: 'physics', code: 'physics', name_hy: 'Ֆիզիկա' }],
    grades: [{ id: '7', grade_number: 7, label_hy: '7' }],
    skills: [{ id: 'skill', code: 'PHY7-U01-S01', sequence_order: 1 }],
    ...overrides,
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'student-a' } }, error: null }) },
    rpc: async () => ({ data: true, error: null }),
    from(table) {
      let rows = [...(tables[table] ?? [])]; let single = false;
      const query = {
        select() { return this; },
        eq(k, v) { rows = rows.filter(r => r[k] === v); return this; },
        in(k, vs) { rows = rows.filter(r => vs.includes(r[k])); return this; },
        lte(k, v) { rows = rows.filter(r => r[k] <= v); return this; },
        or(expression) { const now = expression.split('valid_to.gt.')[1]; rows = rows.filter(r => r.valid_to == null || r.valid_to > now); return this; },
        order() { return this; }, like() { return this; },
        limit(n) { rows = rows.slice(0, n); return this; },
        single() { single = true; return this; },
        then(resolve) { return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: table === failedTable ? { message: 'unavailable' } : null }).then(resolve); },
      };
      return query;
    },
  };
}
function helper() { return vm.runInNewContext(`${accessSource}; ({ hasCourseAccess, getStudentCourseEntitlements })`); }

test('institutional-only enrolment grants its subject and grade without legacy records', async () => {
  assert.equal(await helper().hasCourseAccess(database(), 'student-a', 'physics', 7), true);
  assert.equal(await helper().hasCourseAccess(database(), 'student-a', 'physics', 8), false);
  assert.equal(await helper().hasCourseAccess(database(), 'student-a', 'mathematics', 7), false);
  assert.equal(await helper().hasCourseAccess(database(), 'student-b', 'physics', 7), false);
});
for (const [label, patch] of [
  ['ended', { status: 'ended' }], ['expired', { valid_to: '2020-01-01T00:00:00Z' }],
  ['future', { valid_from: '2999-01-01T00:00:00Z' }],
]) test(`${label} enrolment does not grant access`, async () => {
  assert.equal(await helper().hasCourseAccess(database({ institutional_class_enrollments: [{ ...enrollment, ...patch }] }), 'student-a', 'physics', 7), false);
});
test('no enrolment and archived class remain denied', async () => {
  assert.equal(await helper().hasCourseAccess(database({ institutional_class_enrollments: [] }), 'student-a', 'physics', 7), false);
  assert.equal(await helper().hasCourseAccess(database({ classes: [{ id: 'class-a', is_active: false }] }), 'student-a', 'physics', 7), false);
});
test('legacy enrolment still works and duplicate membership is deduplicated', async () => {
  const legacy = [{ student_id: 'student-a', class_id: 'class-a', joined_at: '2025-01-01' }];
  assert.equal(await helper().hasCourseAccess(database({ institutional_class_enrollments: [], class_memberships: legacy }), 'student-a', 'physics', 7), true);
  const rows = await helper().getStudentCourseEntitlements(database({ class_memberships: legacy }), 'student-a');
  assert.equal(rows.length, 1); assert.equal(rows[0].joinedAt, enrollment.valid_from);
});
test('enrolment lookup failure fails closed', async () => {
  await assert.rejects(helper().hasCourseAccess(database({}, 'institutional_class_enrollments'), 'student-a', 'physics', 7), /unavailable/);
});

async function endpoint(name, db) {
  let handler;
  const source = (await read(`supabase/functions/${name}/index.ts`)).replace(/^import .*;\n/gm, '');
  vm.runInNewContext(`${accessSource}\n${authSource}\n${stripTypeScriptTypes(source)}`, {
    createClient: () => db, resolveActiveCurriculumRelease: async () => 'release',
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    Response, atob, console,
  });
  const token = `x.${Buffer.from(JSON.stringify({ session_id: 'session' })).toString('base64url')}.x`;
  return handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' }));
}
for (const name of ['get-mastery-check-status', 'submit-mastery-answer']) {
  test(`${name}: institutional enrolment passes access; unaffiliated and revoked sessions are denied`, async () => {
    const allowed = await endpoint(name, database());
    assert.equal(allowed.status, name === 'get-mastery-check-status' ? 200 : 400);
    const data = await allowed.json();
    if (name === 'get-mastery-check-status') assert.equal(data.eligible, false, 'enrolment alone must not unlock mastery');
    else assert.equal(data.error, 'missing_required_fields');
    const denied = await endpoint(name, database({ institutional_class_enrollments: [] }));
    assert.equal(denied.status, 403); assert.equal((await denied.json()).error, 'course_access_required');
    const db = database(); db.rpc = async () => ({ data: false, error: null });
    const revoked = await endpoint(name, db);
    assert.equal(revoked.status, 403); assert.equal((await revoked.json()).error, 'account_or_session_inactive');
  });
}

function dom() {
  const nodes = new Map();
  return { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} } });
    return nodes.get(id);
  }, querySelector() { return null; } };
}
test('assessment outage preserves completed diagnostic and shows unknown mastery history; recovery renders readiness', async () => {
  const document = dom();
  const source = (await read('web/assessment.js')).replace(/^import .*;\n/gm, '').replace(/initialize\(\);\s*$/, '');
  const context = vm.createContext({ document, createClient: () => ({}), SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' });
  vm.runInContext(source, context);
  vm.runInContext('renderDiagnostic({latestDiagnostic: {correct:16, answered:20, percent:80}}, null); renderMastery(null);', context);
  assert.match(document.getElementById('diagnosticSummary').textContent, /16\/20 \(80%\)/);
  assert.equal(document.getElementById('masteryStatus').textContent, 'Կարգավիճակը հասանելի չէ');
  assert.equal(document.getElementById('latestMasteryScore').textContent, '—');
  assert.doesNotMatch(document.getElementById('masteryMeta').textContent, /Դեռ փորձ չկա/);
  assert.equal(document.getElementById('masteryAction').href, './assessment.html');
  vm.runInContext('renderMastery({eligible:true});', context);
  assert.equal(document.getElementById('masteryStatus').textContent, 'Պատրաստ է');
});
test('progress outage does not assert mastery is locked', async () => {
  const document = dom();
  const source = (await read('web/progress.js')).replace(/^import .*;\n/gm, '').split('$("refreshProgressBtn")')[0];
  const context = vm.createContext({ document, createClient: () => ({}), SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' });
  vm.runInContext(source + '; renderSummary();', context);
  assert.equal(document.getElementById('masterySummary').textContent, 'Կարգավիճակը հասանելի չէ');
});
test('course outage shows unknown status even when all practice skills are complete', async () => {
  const document = dom();
  const source = (await read('web/physics-7.js')).replace(/^import .*;\n/gm, '');
  const context = vm.createContext({ document, createClient: () => ({}), SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' });
  vm.runInContext(source.slice(0, source.indexOf('function renderActiveSession()')) + '; dashboard = {progress:{completedSkills:10,totalSkills:10,percent:100}}; renderSummary();', context);
  assert.equal(document.getElementById('subjectAssessment').textContent, 'Կարգավիճակը հասանելի չէ');
  assert.equal(document.getElementById('chapterStateBadge').textContent, 'Կարգավիճակը հասանելի չէ');
});
test('global course card preserves diagnostic score while exposing unavailable mastery', async () => {
  const document = dom();
  const source = (await read('web/multi-subject-home.js')).replace(/^import .*;\n/gm, '').split('window.addEventListener')[0];
  const context = vm.createContext({ document, createClient: () => ({}), SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' });
  vm.runInContext(source, context);
  const result = vm.runInContext('assessmentText({latestDiagnostic:{percent:80}},null)', context);
  assert.match(result, /80%/); assert.match(result, /հասանելի չէ/);
  assert.doesNotMatch(vm.runInContext('assessmentText(null,null)', context), /դեռ չի ավարտվել/);
});
