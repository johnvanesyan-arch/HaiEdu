// Chapter I decision I-2, option A — isolated test list §6A (plan revision 3, 20 November 2026).
// Runs the real legacy Edge handlers (get-mastery-check-status, start-learning-session,
// submit-mastery-answer, get-student-dashboard) and the real lifecycle SQL against an
// in-memory, reduced fixture (see tests/fixtures/legacy-chapter-i-db.mjs for its doubles).
// The rule switch is the isolated service activation; nothing touches production.
import test from 'node:test';
import assert from 'node:assert/strict';
import { activate } from './fixtures/legacy-mastery-rules-db.mjs';
import { legacyDatabase, handlers, setReadiness, answerCheck, completeRequiredReview, STUDENT, SKILLS, S07 } from './fixtures/legacy-chapter-i-db.mjs';

const READY_NINE = SKILLS.map(s => s !== S07);
const I2_LOCKED = 'Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։';
const I2_READY = 'Ստուգմանը մասնակցելու համար անհրաժեշտ հմտություններն ամրապնդված են։';
// Nine scored skills at 15/18 and S07 at 0/2 (raw 15/20 = 75%); and a failing 14/18 with S07 at 0/2.
const PASS_15 = [2, 2, 2, 2, 1, 2, 0, 1, 1, 2];
const FAIL_14 = [2, 2, 2, 1, 1, 2, 0, 1, 1, 2];
const as = { actor: STUDENT };

async function fixture(t) {
  const db = await legacyDatabase(); t.after(() => db.close());
  return { db, h: await handlers(db) };
}
const session = async (db, id) => (await db.query('select * from learning_sessions where id=$1', [id])).rows[0];
const state = async db => (await db.query('select * from chapter_mastery_states where student_id=$1', [STUDENT])).rows[0];

test('ready on nine skills, weak on S07: locked under today\'s rule, available after the switch (status, start, dashboard)', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, READY_NINE);

  const before = (await h.status.call({}, as)).body;
  assert.equal(before.eligible, false);
  assert.deepEqual(before.requiredSkills.map(s => s.code), [S07.code]);
  assert.equal(before.rule.version, 'phy7-u01-v1');
  assert.equal(before.rule.textsHy, null, 'today\'s wording stays in the pages');
  assert.equal(before.messageHy, 'Mastery check-ը կբացվի, երբ բոլոր հմտությունները ամրապնդվեն։', 'today\'s message unchanged');
  const refused = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(refused.body.reason, 'skills_not_ready');
  const dashBefore = (await h.dashboard.call({}, as)).body;
  assert.deepEqual([dashBefore.progress.requiredCompleted, dashBefore.progress.requiredTotal], [9, 10]);
  assert.ok(dashBefore.skills.every(s => s.requiredForReadiness === true));

  await activate(db, 'phy7-u01-i2-v1');

  const after = (await h.status.call({}, as)).body;
  assert.equal(after.eligible, true);
  assert.deepEqual(after.requiredSkills, []);
  assert.equal(after.rule.version, 'phy7-u01-i2-v1');
  assert.deepEqual([after.rule.questions, after.rule.scoredQuestions], [20, 18]);
  assert.equal(after.rule.textsHy.ready, I2_READY);
  assert.equal(after.messageHy, I2_READY);
  // Existing fields are unchanged.
  assert.deepEqual(after.passCriteria, { overallPercent: 80, minCorrectPerSkill: 1, questions: 20, hints: false });

  const dash = (await h.dashboard.call({}, as)).body;
  assert.deepEqual([dash.progress.completedSkills, dash.progress.totalSkills], [9, 10], 'existing counts unchanged');
  assert.deepEqual([dash.progress.requiredCompleted, dash.progress.requiredTotal], [9, 9]);
  assert.deepEqual(dash.skills.filter(s => !s.requiredForReadiness).map(s => s.code), [S07.code]);
  assert.equal(dash.masteryRule.version, 'phy7-u01-i2-v1');
  // The S07 practice suggestion stays as it is (decided 20 November).
  assert.equal(dash.recommendation.action, 'practice_skill');
  assert.equal(dash.recommendation.skill.code, S07.code);

  // A not-ready scored skill still locks the check under I-2, with John's locked text.
  await setReadiness(db, SKILLS.map((s, k) => k !== 2 && s !== S07));
  const locked = (await h.status.call({}, as)).body;
  assert.equal(locked.eligible, false);
  assert.deepEqual(locked.requiredSkills.map(s => s.code), [SKILLS[2].code]);
  assert.equal(locked.messageHy, I2_LOCKED);
  const lockedStart = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(lockedStart.body.messageHy, I2_LOCKED);
  assert.deepEqual(lockedStart.body.requiredSkills.map(s => s.code), [SKILLS[2].code]);
});

test('an I-2 check saves its rule, passes on 15/18 with S07 at 0/2, and the database keeps the raw 15/20 = 75%', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, READY_NINE);
  await activate(db, 'phy7-u01-i2-v1');
  const started = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(started.status, 200);
  const meta = started.body.session.metadata;
  assert.equal(meta.scoringRuleVersion, 'phy7-u01-i2-v1');
  assert.match(meta.scoringRuleFingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(meta.scoringRuleCriteria.scoredSkillCodes, SKILLS.filter(s => s !== S07).map(s => s.code));
  const items = (await db.query('select skill_id from learning_session_items where session_id=$1', [started.body.session.id])).rows;
  assert.equal(items.length, 20, 'same 20 questions, S07 still delivered');
  assert.equal(items.filter(r => r.skill_id === S07.id).length, 2);

  const last = await answerCheck(h, db, started.body.session.id, PASS_15);
  const result = last.body.finalResult;
  assert.equal(result.passed, true);
  assert.deepEqual(result.score, { correct: 15, answered: 20, percent: 75 }, 'raw score unchanged in the existing field');
  assert.equal(result.scoringRuleVersion, 'phy7-u01-i2-v1');
  assert.deepEqual(result.assessmentResult.score, { correct: 15, answered: 18, percent: 83 });
  assert.deepEqual(result.assessmentResult.groups.map(g => [g.label, g.correct, g.answered]),
    [['Պարտադիր և օժանդակ հմտություններ', 15, 18], ['Լրացուցիչ վերջնարդյունք', 0, 2]]);
  const saved = await session(db, started.body.session.id);
  assert.equal(saved.assessment_result, 'passed');
  assert.equal(Number(saved.score_percent), 75, 'finalize_mastery_check_atomic accepted the raw percentage');
  assert.deepEqual(saved.metadata.assessmentResultReporting.score, { correct: 15, answered: 18, percent: 83 });
  assert.equal((await state(db)).lifecycle_state, 'mastery_passed');
  // Status and the personal-account fields read the saved record.
  const status = (await h.status.call({}, as)).body;
  assert.equal(status.latestCheck.scoringRuleVersion, 'phy7-u01-i2-v1');
  assert.deepEqual(status.latestCheck.assessmentResult.score, { correct: 15, answered: 18, percent: 83 });
});

test('a failed I-2 attempt requires review: the retry is blocked even with nine skills ready, review unlocks it, retry uses unseen questions', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, READY_NINE);
  await activate(db, 'phy7-u01-i2-v1');
  const first = await h.start.call({ mode: 'mastery_check' }, as);
  const failed = (await answerCheck(h, db, first.body.session.id, FAIL_14)).body.finalResult;
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.assessmentResult.score, { correct: 14, answered: 18, percent: 78 });
  // Targeted review never names S07 although it is the weakest skill (0/2).
  assert.equal(failed.failedSkills.some(s => s.code === S07.code), false);
  assert.deepEqual((await session(db, first.body.session.id)).metadata.failedSkillIds, failed.failedSkills.map(s => s.skillId));
  assert.equal((await state(db)).lifecycle_state, 'review_required_attempt_2');

  const blocked = (await h.status.call({}, as)).body;
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.retryBlocked, true);
  assert.equal(blocked.reviewRequired, true);
  assert.ok(blocked.reviewRequirement);
  const refused = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.reason, 'chapter_review_required');
  const dash = (await h.dashboard.call({}, as)).body;
  assert.equal(dash.recommendation.action, 'required_chapter_review');

  const review = await completeRequiredReview(db);
  assert.equal(review.lifecycleState, 'mastery_retry_2_ready');
  const open = (await h.status.call({}, as)).body;
  assert.equal(open.eligible, true);
  assert.equal(open.retryBlocked, false);
  const retry = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.attemptNumber, 2, 'attempt number carries across');
  assert.equal(retry.body.session.metadata.formType, 'alternate_retest');
  const firstItems = new Set((await db.query('select item_id from learning_session_items where session_id=$1', [first.body.session.id])).rows.map(r => r.item_id));
  const retryItems = (await db.query('select item_id from learning_session_items where session_id=$1', [retry.body.session.id])).rows.map(r => r.item_id);
  assert.equal(retryItems.filter(i => firstItems.has(i)).length, 0, 'retry uses questions not in the failed form');
  const passed = (await answerCheck(h, db, retry.body.session.id, PASS_15)).body.finalResult;
  assert.equal(passed.passed, true);
  assert.equal((await state(db)).passed_on_attempt, 2);
});

test('the review requirement also blocks the retry when a scored skill has since dropped (lifecycle is authoritative)', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, READY_NINE);
  await activate(db, 'phy7-u01-i2-v1');
  const first = await h.start.call({ mode: 'mastery_check' }, as);
  await answerCheck(h, db, first.body.session.id, FAIL_14);
  await completeRequiredReview(db);
  await setReadiness(db, SKILLS.map((s, k) => k !== 0 && s !== S07));
  // Retry readiness comes from the qualifying review, as today.
  assert.equal((await h.status.call({}, as)).body.eligible, true);
});

test('a check open at activation finishes under today\'s rule; one open at rollback finishes under I-2; new checks follow the switch', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, SKILLS.map(() => true));
  // Open under today's rule, switch to I-2, finish: scored as today (S07 0/2 fails; no result record).
  const open = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(open.body.session.metadata.scoringRuleVersion, 'phy7-u01-v1');
  await activate(db, 'phy7-u01-i2-v1');
  const resumed = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(resumed.body.resumed, true);
  assert.equal(resumed.body.session.id, open.body.session.id);
  const statusOpen = (await h.status.call({}, as)).body;
  assert.equal(statusOpen.rule.version, 'phy7-u01-v1', 'an open check reports the rule it saved');
  const v1 = (await answerCheck(h, db, open.body.session.id, PASS_15)).body.finalResult;
  assert.equal(v1.passed, false);
  assert.equal(v1.scoringRuleVersion, 'phy7-u01-v1');
  assert.equal(v1.assessmentResult, null);
  assert.ok(v1.failedSkills.some(s => s.code === S07.code), 'today\'s rule may target S07');
  assert.equal((await session(db, open.body.session.id)).metadata.assessmentResultReporting, undefined);
  await completeRequiredReview(db);

  // Attempt 2 starts under I-2; roll back while it is open; it still finishes under I-2.
  const second = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(second.body.attemptNumber, 2);
  assert.equal(second.body.session.metadata.scoringRuleVersion, 'phy7-u01-i2-v1');
  await activate(db, 'phy7-u01-v1', 'PHY7-U01', 'isolated rollback');
  assert.equal((await h.status.call({}, as)).body.rule.version, 'phy7-u01-i2-v1');
  const i2 = (await answerCheck(h, db, second.body.session.id, FAIL_14)).body.finalResult;
  assert.equal(i2.scoringRuleVersion, 'phy7-u01-i2-v1');
  assert.equal(i2.passed, false);
  assert.deepEqual(i2.assessmentResult.score, { correct: 14, answered: 18, percent: 78 });
  await completeRequiredReview(db);

  // After rollback the next (final) check gets today's rule; completed results are not recomputed.
  const third = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(third.body.attemptNumber, 3);
  assert.equal(third.body.session.metadata.scoringRuleVersion, 'phy7-u01-v1');
  const before = (await db.query("select id,assessment_result,score_percent,metadata from learning_sessions where mode='mastery_check' and status='completed' order by started_at")).rows;
  await answerCheck(h, db, third.body.session.id, FAIL_14);
  const afterRows = (await db.query("select id,assessment_result,score_percent,metadata from learning_sessions where mode='mastery_check' and status='completed' order by started_at")).rows;
  assert.deepEqual(afterRows.slice(0, 2), before, 'earlier results unchanged');
  const final = await state(db);
  assert.deepEqual([final.lifecycle_state, final.attempts_used], ['mastery_failed_final', 3]);
  // The three-attempt limit holds across versions.
  await activate(db, 'phy7-u01-i2-v1');
  const fourth = await h.start.call({ mode: 'mastery_check' }, as);
  assert.equal(fourth.status, 409);
  assert.equal(fourth.body.reason, 'mastery_failed_final');
});

test('a tampered or unknown saved rule is refused at finish; nothing is finalized', async t => {
  for (const tamper of [
    m => ({ ...m, scoringRuleFingerprint: '0'.repeat(64) }),
    m => ({ ...m, scoringRuleCriteria: { ...m.scoringRuleCriteria, minimumPercent: 50 } }),
    m => ({ ...m, scoringRuleVersion: 'phy7-u01-i9-v1' }),
  ]) {
    const { db, h } = await fixture(t);
    await setReadiness(db, READY_NINE);
    await activate(db, 'phy7-u01-i2-v1');
    const started = await h.start.call({ mode: 'mastery_check' }, as);
    await db.query('update learning_sessions set metadata=$2 where id=$1', [started.body.session.id, JSON.stringify(tamper(started.body.session.metadata))]);
    const last = await answerCheck(h, db, started.body.session.id, PASS_15);
    assert.equal(last.status, 409);
    assert.match(last.body.error, /^legacy_mastery_rule_(mismatch|unknown)$/);
    assert.equal((await session(db, started.body.session.id)).assessment_result, null);
    assert.equal((await state(db)).attempts_used, 0);
  }
});

test('checks without saved criteria (started before the registry) are scored by today\'s rule', async t => {
  const { db, h } = await fixture(t);
  await setReadiness(db, SKILLS.map(() => true));
  const started = await h.start.call({ mode: 'mastery_check' }, as);
  const { scoringRuleVersion, scoringRuleCriteria, scoringRuleFingerprint, ...older } = started.body.session.metadata;
  await db.query('update learning_sessions set metadata=$2 where id=$1', [started.body.session.id, JSON.stringify(older)]);
  await activate(db, 'phy7-u01-i2-v1');
  const result = (await answerCheck(h, db, started.body.session.id, [2, 2, 2, 2, 2, 2, 2, 1, 1, 0])).body.finalResult;
  assert.equal(result.scoringRuleVersion, 'phy7-u01-v1');
  assert.equal(result.passed, false, 'S10 at 0/2 fails under today\'s rule');
  assert.equal((await session(db, started.body.session.id)).metadata.scoringRuleVersion, undefined, 'no version is invented for an older check');
});
