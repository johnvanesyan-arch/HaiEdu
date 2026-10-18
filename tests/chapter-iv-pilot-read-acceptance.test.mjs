import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chapterII, chapterIUnitId } from '../scripts/chapter-ii-pilot-read-acceptance.mjs';
import { chapterIV, validateActivation, chapterIVContract, runReadChecks } from '../scripts/chapter-iv-pilot-read-acceptance.mjs';
import { chapterIII } from '../scripts/chapter-iii-pilot-read-acceptance.mjs';
const previousRecipe = JSON.parse(await readFile('docs/evidence/chapter-iii-assessment-v2-configuration-20261015.json', 'utf8'));
const recipe = JSON.parse(await readFile('docs/evidence/chapter-iv-assessment-v2-configuration-20261018.json', 'utf8'));
const contracts = Object.fromEntries(recipe.contracts.map(p => [p.mode, p]));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function inputs() {
  const fixture = { dedicatedQa: true }, credentials = {};
  const activation = { schemaVersion: 1, status: 'activated', activatedAt: '2026-10-18T12:00:00Z', ...chapterIV, assessmentPolicyVersion: 'haiedu-assessment-policy-v2', ownerAuthorization: { action: 'activate_provisional_pilot' }, preservedChapterII: chapterII, preservedChapterIII: chapterIII, practicalPerformance: 'unassessed',
    preservedChapterI: { curriculumReleaseId: '80bbe575-ad49-4a7f-881a-e55726b1eaeb', unitId: chapterIUnitId } };
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
    contexts[side] = [input.activation.preservedChapterI, chapterII, chapterIII, chapterIV].map((release, index) => ({
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
  for (const side of ['A', 'B']) {
    const old = dashboards[side][2];
    old.skills = previousRecipe.commonPolicy.deliveredSkillIds.map(id => ({ id, requiredForReadiness: previousRecipe.modes.mastery_check.readinessSkillIds.includes(id), ready: false }));
    old.modes = Object.fromEntries(Object.entries(previousRecipe.modes).map(([mode, spec]) => [mode, { ...structuredClone(previousRecipe.commonPolicy), ...structuredClone(spec), status: 'configured', questions: spec.plannedQuestionCount }]));
    const d = dashboards[side][3], expected = contracts.mastery_check;
    d.skills = contracts.diagnostic.deliveredSkillIds.map(id => ({ id, requiredForReadiness: expected.readinessSkillIds.includes(id), ready: false }));
    d.modes = Object.fromEntries(Object.entries(contracts).map(([mode, spec]) => [mode, { ...structuredClone(spec), status: 'configured', questions: spec.plannedQuestionCount }]));
    // Preserved Chapter II may already have a completed baseline.
    dashboards[side][1].baseline = { id: id(801), curriculumReleaseId: chapterII.curriculumReleaseId };
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


test('Chapter IV credentials remain blocked for preparation, wrong activation, PR refs or wrong preserved chapters', () => {
  const input = inputs(); assert.deepEqual(validateActivation(input), []);
  for (const change of [x => x.activation.status = 'prepared', x => x.ref = 'refs/pull/1/merge',
    x => x.activation.curriculumReleaseId = chapterII.curriculumReleaseId, x => delete x.activation.ownerAuthorization,
    x => x.activation.preservedChapterII.unitId = chapterIV.unitId, x => x.fixture.dedicatedQa = false,
    x => x.activation.assessmentPolicyVersion = 'haiedu-assessment-policy-v1', x => delete x.activation.preservedChapterIII, x => x.activation.practicalPerformance = 'assessed']) {
    const x = structuredClone(input); change(x); assert.ok(validateActivation(x).length);
  }
});
test('v2 acceptance rejects wrong denominator, nonmandatory readiness, wrong group membership and count drift', () => {
  const m = mock(inputs()), d = m.dashboards.A[3], c = m.contexts.A[3]; assert.equal(chapterIVContract(d, c), true);
  for (const change of [x => x.modes.mastery_check.scoredSkillIds = contracts.diagnostic.deliveredSkillIds,
    x => x.modes.mastery_check.readinessSkillIds.push(contracts.diagnostic.deliveredSkillIds[2]),
    x => x.skills[2].requiredForReadiness = true, x => x.modes.mastery_check.minimumPercent = 75,
    x => x.modes.diagnostic.questionCountBySkill[contracts.diagnostic.deliveredSkillIds[0]] = 3,
    x => x.modes.practice.hintsAllowed = false, x => x.modes.mastery_check.reportingGroups[0].skillIds.pop(),
    x => x.modes.mastery_check.minimumCorrectBySkill[contracts.diagnostic.deliveredSkillIds[2]] = 1,
    x => x.modes.mastery_check.deliveredSkillIds = contracts.diagnostic.deliveredSkillIds, x => x.modes.mastery_check.reportingGroups.push({key:'practical'}), x => x.answerKey = 'SECRET']) {
    const changed = structuredClone(d); change(changed); assert.equal(chapterIVContract(changed, c), false);
  }
});
test('four chapter contexts, cross-school and all twelve mixed release/unit pairs are checked without learning writes', async () => {
  const input = inputs(), m = mock(input), r = await runReadChecks({ ...input, ...m }); await r.verifyPreserved();
  assert.equal(r.contexts.A.length, 4); assert.equal(r.contexts.B.length, 4);
  assert.equal(m.checks.filter(x => x.label.includes('mixed chapter/release')).length, 24);
  for (const actor of ['A_teacher', 'B_teacher']) {
    const probes = m.calls.filter(x => x.actor === actor && x.endpoint.startsWith('/rest/v1/'));
    assert.deepEqual(probes.map(x => x.endpoint), ['/rest/v1/item_options?select=item_id&limit=1']);
  }
  assert.ok(m.checks.every(x => x.passed));
  assert.ok(m.calls.every(x => /get-student-(?:dashboard|classes)|rest\/v1\/(?:items|item_options|item_answer_keys)\?select=/.test(x.endpoint)));
  m.dashboards.A[1].history.push({ curriculumReleaseId: chapterII.curriculumReleaseId, correct: 1 });
  await assert.rejects(r.verifyPreserved(), /unchanged/);
});
test('fail closed on missing third chapter, mixed scope authorization or leaked protected data', async () => {
  for (const alter of [
    ({ endpoint, contexts }) => endpoint.endsWith('get-student-classes') ? { status: 200, data: { contexts: contexts.A.slice(0, 2) } } : null,
    ({ actor, endpoint, body, dashboards }) => actor === 'A_student' && endpoint.endsWith('get-student-dashboard') && body.unitId === chapterIV.unitId && body.curriculumReleaseId === chapterII.curriculumReleaseId ? { status: 200, data: dashboards.A[3] } : null,
    ({ endpoint }) => endpoint.startsWith('/rest/v1/items?') ? { status: 200, data: [{ id: id(70) }] } : null,
    ...['A_teacher', 'B_teacher'].map(teacher =>
      ({ actor, endpoint }) => actor === teacher && endpoint.startsWith('/rest/v1/item_options?') ? { status: 200, data: [{ item_id: id(70) }] } : null),
  ]) { const input = inputs(); await assert.rejects(runReadChecks({ ...input, ...mock(input, alter) })); }
});
test('pre-existing Chapter IV diagnostic is preserved and changed progress fails', async () => {
  const input = inputs(), m = mock(input);
  m.dashboards.A[3].activeSession = { id: id(810), policyBindingId: id(811), mode: 'diagnostic', targetSkillId: null, planned: 19, answered: 3 };
  const r = await runReadChecks({ ...input, ...m }); await r.verifyPreserved();
  m.dashboards.A[3].activeSession.answered++; await assert.rejects(r.verifyPreserved(), /unchanged/);
});
test('activated workflow stays main-only, guarded and covers its runner and frontend dependencies', async () => {
  const workflow = await readFile('.github/workflows/chapter-iv-pilot-read-acceptance.yml', 'utf8');
  assert.doesNotMatch(workflow, /pull_request/);
  const paths = workflow.match(/    paths:([\s\S]*?)\npermissions:/)[1];
  assert.match(paths, /chapter-iv-pilot-activation-20261018.json/);
  for (const path of ['scripts/chapter-iv-pilot-read-acceptance.mjs', 'web/course.html', 'web/index.html', '.github/workflows/chapter-iv-pilot-read-acceptance.yml']) assert.ok(paths.includes(path));
  assert.ok(workflow.indexOf('test -f docs/evidence/chapter-iv-pilot-activation') < workflow.indexOf('actions/setup-node'));
  assert.match(workflow, /group: sprint-14-isolation-qa/);
});

test('all-scored Mastery omits unscored-question guidance while mixed-scope contracts retain it', async () => {
  const { assessmentRules } = await import('../web/assessment-reporting.mjs');
  const current = assessmentRules(contracts.mastery_check);
  assert.match(current, /գնահատվող 15 հարցից առնվազն 12-ին/);
  assert.doesNotMatch(current, /Մյուս հարցերի արդյունքները/);
  assert.match(current, /փորձերի կատարումը չի գնահատվում/);
  assert.match(assessmentRules({ ...previousRecipe.commonPolicy, ...previousRecipe.modes.mastery_check }), /Մյուս հարցերի արդյունքները/);
});
