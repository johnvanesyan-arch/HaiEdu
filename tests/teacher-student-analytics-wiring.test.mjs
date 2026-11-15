// Teacher analytics and the student page read the same evidence (wiring audit, 15 November 2026).
// The real student endpoints and the real teacher analytics reader run on one in-memory PostgreSQL schema with
// synthetic records. Isolated: not a deployed or production check.
import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceFixture, selection, id, finishThroughAPI, analyticsReaders} from './fixtures/learning-acceptance.mjs';

test('the teacher sees the same diagnostic result, sessions and evidence that the student page shows', async t => {
  const f = await acceptanceFixture(); t.after(() => f.close());
  const {loadExactInstitutionalClassAnalytics} = analyticsReaders();
  const index = 0, scope = selection(index);
  const navigation = await f.call('get-student-classes');
  const found = navigation.body.contexts.find(c => c.unitId === scope.unitId), context = {...found, assignmentId: found.teacherAssignmentId};
  const student = async () => (await f.call('get-student-dashboard', scope)).body;
  const teacher = async () => (await loadExactInstitutionalClassAnalytics(f.admin, context, [{id: id(10), enrollmentId: found.enrollmentId, displayName: 'Synthetic learner'}])).students[0];
  // The teacher reader runs in its own context, so lists are compared as text rather than by array identity.
  const sessions = rows => Array.from(rows, s => `${s.mode}:${s.status}:${s.correct}/${s.answered}`).join(' | ');
  const list = rows => Array.from(rows).join(' | ');

  await t.test('before any work both sides are empty and the teacher is told the diagnostic comes first', async () => {
    const s = await student(), v = await teacher();
    assert.equal(s.baseline, null); assert.equal(v.latestDiagnostic, null);
    assert.ok(s.skills.every(skill => skill.mastery === null));
    assert.ok(v.matrix.every(row => row.status === 'not_assessed' && row.evidenceCount === 0));
    assert.equal(list(v.matrix.map(row => row.skillId)), list(s.skills.map(skill => skill.id)), 'the same skills in the same order');
    assert.equal(v.intervention.action, 'take_diagnostic'); assert.equal(s.practiceAccess.unlocked, false);
  });

  let diagnostic;
  await t.test('while an assessment is open neither side reveals running correctness', async () => {
    diagnostic = (await f.call('start-learning-session', {...scope, mode: 'diagnostic'})).body.session;
    const s = await student(), v = await teacher();
    assert.ok(s.skills.every(skill => skill.mastery === null && skill.ready === null));
    assert.equal(v.activeSession.id, diagnostic.id); assert.equal(v.activeSession.mode, 'diagnostic');
    assert.equal(v.sessions.find(row => row.id === diagnostic.id).correct, null); assert.equal(v.latestDiagnostic, null);
  });

  await t.test('after the diagnostic the result, the session and each skill’s evidence match exactly', async () => {
    await finishThroughAPI(f, diagnostic, false);
    const s = await student(), v = await teacher();
    assert.equal(s.baseline.id, diagnostic.id);
    assert.deepEqual({answered: v.latestDiagnostic.answered, correct: v.latestDiagnostic.correct}, {answered: s.baseline.answered, correct: s.baseline.correct});
    assert.equal(sessions(v.sessions), sessions(s.history));
    for (const skill of s.skills) {
      const row = v.matrix.find(r => r.skillId === skill.id);
      // One purpose so far, so the teacher's class-scoped estimate and the student's own state are the same numbers.
      assert.equal(row.evidenceCount, skill.mastery.evidenceCount, skill.code);
      assert.equal(row.percent, skill.mastery.percent, skill.code);
      assert.equal(row.status, skill.mastery.status, skill.code);
      assert.equal(row.estimates.length, 1);
    }
    assert.equal(s.practiceAccess.unlocked, true); assert.equal(v.activeSession, null);
  });

  await t.test('after practice both sides hold the same answers; the teacher keeps the two purposes separate', async () => {
    const practice = (await f.call('start-learning-session', {...scope, mode: 'practice'})).body.session;
    await finishThroughAPI(f, practice, false);
    const s = await student(), v = await teacher();
    assert.equal(sessions(v.sessions), sessions(s.history));
    assert.equal(v.observedAttempts, s.history.reduce((n, row) => n + row.answered, 0), 'every answer the student gave is in the teacher’s evidence');
    for (const skill of s.skills) {
      const row = v.matrix.find(r => r.skillId === skill.id);
      assert.equal(row.evidenceCount, skill.mastery.evidenceCount, skill.code + ': the same number of answers');
      assert.equal(row.estimates.reduce((n, e) => n + e.evidenceCount, 0), skill.mastery.evidenceCount);
      // The student's state is one learner-wide figure; the teacher's is per purpose and scoped to this class.
      assert.equal(skill.mastery.scope, 'learner_release_skill'); assert.equal(row.scope, 'class_contract_evidence');
    }
    const practised = v.matrix.filter(row => row.estimates.length > 1);
    assert.ok(practised.length > 0);
    assert.ok(practised.every(row => row.status === 'mixed_contracts' && row.percent === null), 'no single combined figure is shown to the teacher');
    assert.equal(list(practised[0].estimates.map(e => e.contract.mode).sort()), 'diagnostic | practice');
  });

  await t.test('another class’s teacher context receives none of this student’s evidence', async () => {
    const other = navigation.body.contexts.find(c => c.subjectProgramId !== found.subjectProgramId);
    const read = (await loadExactInstitutionalClassAnalytics(f.admin, {...other, assignmentId: other.teacherAssignmentId}, [{id: id(10), enrollmentId: other.enrollmentId, displayName: 'Synthetic learner'}])).students[0];
    assert.equal(read.observedAttempts, 0); assert.equal(read.sessions.length, 0); assert.equal(read.latestDiagnostic, null);
  });
});
