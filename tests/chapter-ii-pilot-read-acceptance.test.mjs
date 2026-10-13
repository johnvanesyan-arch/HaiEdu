import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chapterII, chapterIUnitId, validateActivation, allowedBrowserRequest, containsProtectedContent, chapterIIContract, runReadChecks } from '../scripts/chapter-ii-pilot-read-acceptance.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function inputs() {
  const fixture = { dedicatedQa: true }, credentials = {};
  const activation = { schemaVersion: 1, status: 'activated', activatedAt: '2026-10-13T12:00:00Z', ...chapterII,
    preservedChapterI: { curriculumReleaseId: id(999), unitId: chapterIUnitId } };
  for (const [index, side] of ['A', 'B'].entries()) {
    fixture[side] = Object.fromEntries(['schoolId', 'classId', 'assignmentId', 'adminId', 'teacherId', 'studentId'].map((k, n) => [k, id(index * 20 + n + 1)]));
    Object.assign(fixture[side], activation.preservedChapterI);
    for (const role of ['admin', 'teacher', 'student']) credentials[`${side}_${role}`] = { email: `${side}_${role}@example.invalid`, password: 'PRIVATE-PASSWORD' };
  }
  return { fixture, credentials, activation, revision: 'a'.repeat(40), ref: 'refs/heads/main' };
}
function mock(input, alter = () => null) {
  const checks = [], calls = [], contexts = {}, dashboards = {};
  for (const [n, side] of ['A', 'B'].entries()) {
    contexts[side] = [input.activation.preservedChapterI, chapterII].map((release, index) => ({
      ...release, enrollmentId: id(n + 200), subjectProgramId: id(600), schoolId: input.fixture[side].schoolId,
      classId: input.fixture[side].classId, unitTitleHy: `Գլուխ ${index + 1}`, unitSequence: index + 1,
    }));
    dashboards[side] = contexts[side].map((context, index) => ({
      dashboardVersion: 'authorized-learning-dashboard-v1', readOnly: true, context,
      baseline: index ? null : { id: id(800), correct: 15, answered: 20, curriculumReleaseId: context.curriculumReleaseId },
      activeSession: null, lifecycle: null, history: index ? [] : [{ id: id(800), curriculumReleaseId: context.curriculumReleaseId, correct: 15 }],
      maximumAttempts: 3, practiceAccess: { unlocked: index === 0, reason: index ? 'chapter_diagnostic_required' : null },
      skills: Array.from({ length: index ? 8 : 10 }, (_, k) => ({ id: id(k + 9000), code: `S${k + 1}`, ready: false, mastery: null })),
      modes: Object.fromEntries([['diagnostic', 16], ['practice', 8], ['mastery_check', 16], ['chapter_review', 12]].map(([mode, questions]) => [mode, {
        status: index ? 'configured' : 'registered_legacy', questions, hintsAllowed: ['practice', 'chapter_review'].includes(mode),
        ...(mode === 'mastery_check' ? { minimumPercent: 80, minimumCorrectBySkill: Object.fromEntries(Array.from({ length: 8 }, (_, k) => [id(k + 9000), 1])) } : {}),
      }])),
    }));
  }
  const request = async (actor, endpoint, body, method = 'POST') => {
    calls.push({ actor, endpoint, body, method });
    const overridden = alter({ actor, endpoint, body, method, contexts, dashboards });
    if (overridden) return overridden;
    if (endpoint.startsWith('/rest/v1/')) return { status: 200, data: [] };
    const [side, role] = actor?.split('_') ?? [];
    if (!actor) return { status: 401, data: { error: 'unauthorized' } };
    if (endpoint.endsWith('/get-student-classes')) return { status: 200, data: { contexts: contexts[side] } };
    assert.equal(endpoint, '/functions/v1/get-student-dashboard');
    const index = contexts[side].findIndex(c => ['enrollmentId', 'unitId', 'curriculumReleaseId'].every(k => c[k] === body[k]));
    return role === 'student' && index >= 0 ? { status: 200, data: structuredClone(dashboards[side][index]) } : { status: 403, data: { error: 'learning_context_unavailable' } };
  };
  const check = (label, passed, httpStatus) => { checks.push({ label, passed, httpStatus }); assert.ok(passed, label); };
  return { request, check, calls, checks, contexts, dashboards };
}

test('live credentials require main, exact build, verified bounded activation, and designated preserved fixtures', () => {
  const input = inputs();
  assert.deepEqual(validateActivation(input), []);
  for (const mutation of [
    x => { x.ref = 'refs/pull/1/merge'; }, x => { x.revision = 'main'; },
    x => { x.activation.status = 'prepared'; }, x => { x.activation.curriculumReleaseId = id(1); },
    x => { x.activation.preservedChapterI.curriculumReleaseId = chapterII.curriculumReleaseId; },
    x => { x.fixture.dedicatedQa = false; }, x => { x.fixture.B.unitId = chapterII.unitId; },
  ]) { const changed = structuredClone(input); mutation(changed); assert.ok(validateActivation(changed).length > 0); }
});

test('browser safety allows only exact reads and token refresh, denying learning writes and legacy side-effect dashboard', () => {
  const selection = { enrollmentId: id(200), ...chapterII };
  for (const request of [
    { pathname: '/functions/v1/get-student-classes', method: 'POST', body: {} },
    { pathname: '/functions/v1/get-student-dashboard', method: 'POST', body: selection },
    { pathname: '/functions/v1/get-student-dashboard', method: 'POST', body: { navigation: true } },
    { pathname: '/auth/v1/token', search: '?grant_type=refresh_token', method: 'POST' },
    { pathname: '/rest/v1/profiles', method: 'GET' },
  ]) assert.equal(allowedBrowserRequest(request), true);
  for (const request of [
    ...['start-learning-session', 'get-session-item', 'submit-answer', 'manage-school-teacher'].map(fn => ({ pathname: `/functions/v1/${fn}`, method: 'POST', body: {} })),
    { pathname: '/functions/v1/get-student-dashboard', method: 'POST', body: {} },
    { pathname: '/functions/v1/get-student-dashboard', method: 'POST', body: { ...selection, mode: 'diagnostic' } },
    { pathname: '/rest/v1/profiles', method: 'PATCH' },
    { pathname: '/rest/v1/items', method: 'GET' },
    { pathname: '/auth/v1/logout', method: 'POST' },
    { pathname: '/auth/v1/token', search: '?grant_type=password', method: 'POST' },
  ]) assert.equal(allowedBrowserRequest(request), false);
});

test('contract requires all eight exact skill minima, count configuration, and protected content absence', () => {
  const m = mock(inputs()), d = m.dashboards.A[1], context = m.contexts.A[1];
  assert.equal(chapterIIContract(d, context), true);
  for (const mutate of [x => x.modes.mastery_check.minimumPercent = 75, x => x.modes.diagnostic.questions = 12,
    x => x.skills.pop(), x => x.modes.mastery_check.minimumCorrectBySkill[id(9000)] = 0,
    x => x.modes.practice.hintsAllowed = false, x => x.maximumAttempts = 4,
    x => x.context.curriculumReleaseId = id(700), x => x.modes.mastery_check.answerKey = 'PRIVATE-KEY',
  ]) { const changed = structuredClone(d); mutate(changed); assert.equal(chapterIIContract(changed, context), false); }
  for (const key of ['promptHy', 'prompt_hy', 'answer', 'answer_key', 'correctAnswer', 'options', 'item_id', 'stimulus_url']) assert.equal(containsProtectedContent({ nested: { [key]: 'PRIVATE' } }), true);
  assert.equal(containsProtectedContent({ baseline: { correct: 13 }, minimumCorrectBySkill: { [id(9000)]: 1 } }), false);
});

test('read acceptance verifies two contexts per school and state preservation with no learning mutation', async () => {
  const input = inputs(), m = mock(input);
  const result = await runReadChecks({ ...input, ...m });
  await result.verifyPreserved();
  assert.equal(m.checks.length, 54);
  assert.ok(m.checks.every(c => c.passed));
  assert.equal(m.calls.filter(c => c.method === 'GET').length, 15);
  assert.ok(m.calls.every(c => /\/(?:get-student-dashboard|get-student-classes)$|^\/rest\/v1\/(?:items|item_options|item_answer_keys)\?select=(?:id|item_id)&limit=1$/.test(c.endpoint)));
});

test('positive controls cannot pass via denial and new baseline/history contamination fails', async () => {
  for (const alter of [
    ({ endpoint }) => endpoint.endsWith('get-student-classes') ? { status: 403, data: { error: 'learning_context_unavailable' } } : null,
    ({ endpoint, body, dashboards }) => endpoint.endsWith('get-student-dashboard') && body?.unitId === chapterII.unitId ? { status: 200, data: { ...dashboards.A[1], baseline: { id: id(500), curriculumReleaseId: chapterII.curriculumReleaseId } } } : null,
  ]) { const input = inputs(); await assert.rejects(runReadChecks({ ...input, ...mock(input, alter) })); }
});

test('foreign context, protected row and 401 substituted for authorization denial are failures', async () => {
  for (const alter of [
    ({ actor, endpoint, body, contexts, dashboards }) => actor === 'A_student' && endpoint.endsWith('get-student-dashboard') && body.enrollmentId === contexts.B[1].enrollmentId ? { status: 200, data: dashboards.B[1] } : null,
    ({ endpoint }) => endpoint.startsWith('/rest/v1/items?') ? { status: 200, data: [{ id: id(20) }] } : null,
    ({ actor, endpoint }) => actor === 'A_admin' && endpoint.endsWith('get-student-dashboard') ? { status: 401, data: { error: 'unauthorized' } } : null,
  ]) { const input = inputs(); await assert.rejects(runReadChecks({ ...input, ...mock(input, alter) })); }
});

test('snapshot detects any changed Chapter I history after native switching', async () => {
  const input = inputs(), m = mock(input);
  const result = await runReadChecks({ ...input, ...m });
  m.dashboards.A[0].history[0].correct = 19;
  await assert.rejects(result.verifyPreserved(), /Chapter I baseline, sessions, history and learning state unchanged/);
});

test('credential workflow is main-only and triggered only by verified activation evidence', async () => {
  const workflow = await readFile('.github/workflows/chapter-ii-pilot-read-acceptance.yml', 'utf8');
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /run: test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.doesNotMatch(workflow, /pull_request|schedule:/);
  assert.match(workflow, /group: sprint-14-isolation-qa\n  cancel-in-progress: false/);
  assert.deepEqual([...workflow.matchAll(/^      - (docs\/[^\n]+)$/gm)].map(m => m[1]), ['docs/evidence/chapter-ii-pilot-activation-20261013.json']);
  assert.ok(workflow.indexOf('node scripts/wait-for-production-release.mjs') < workflow.indexOf('node scripts/chapter-ii-pilot-read-acceptance.mjs'));
  assert.doesNotMatch(workflow, /SERVICE_ROLE|playwright\/\.auth|trace|screenshot|video/);
});
