// Chapter I decision I-2, option A: the shared legacy mastery rules module, checked
// against the exact criteria seeded by the registry migration (PGlite, in memory).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCriteria, criteriaForSession, evaluateMastery, incompleteReadinessSkills, publicRule,
  ruleSnapshot, savedRuleVersion, loadActiveRule, loadRuleVersion, loadSessionCriteria, RuleError,
} from '../supabase/functions/_shared/legacy-mastery-rules.mjs';
import { assessmentResultMarkup } from '../web/assessment-reporting.mjs';
import { registryDatabase, ruleRow, CODES, skillResults, totals } from './fixtures/legacy-mastery-rules-db.mjs';

const db = await registryDatabase();
test.after(() => db.close());
const V1 = await ruleRow(db, 'phy7-u01-v1');
const I2 = await ruleRow(db, 'phy7-u01-i2-v1');
const S07 = 'PHY7-U01-S07';
const admin = { rpc: async (name, args) => {
  try { return { data: (await db.query(`select ${name}(${Object.keys(args).map((_, i) => '$' + (i + 1)).join(',')}) r`, Object.values(args))).rows[0].r, error: null }; }
  catch (error) { return { data: null, error: { message: error.message } }; }
} };

// Today's submit-mastery-answer logic, copied from the source before this change.
function today(rows, overall) {
  const percent = overall.answered ? Math.round((overall.correct / overall.answered) * 100) : 0;
  const passed = percent >= 80 && rows.length > 0 && rows.every(r => r.correct >= 1);
  const targets = rows.filter(r => r.correct < r.total).sort((a, b) => a.correct - b.correct || a.code.localeCompare(b.code)).slice(0, 3);
  return { passed, percent, failedSkillIds: passed ? [] : targets.map(r => r.skillId) };
}

test('registry rows are valid; I-2 carries John\'s wording and labels, v1 keeps today\'s pages', () => {
  validateCriteria(V1.criteria); validateCriteria(I2.criteria);
  assert.equal(V1.criteria.reporting, null);
  assert.equal(V1.criteria.textsHy, null);
  assert.deepEqual(I2.criteria.reporting.groups.map(g => g.label), ['Պարտադիր և օժանդակ հմտություններ', 'Լրացուցիչ վերջնարդյունք']);
  assert.equal(I2.criteria.textsHy.ready, 'Ստուգմանը մասնակցելու համար անհրաժեշտ հմտություններն ամրապնդված են։');
  assert.equal(I2.criteria.textsHy.locked, 'Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։');
  assert.equal(I2.criteria.textsHy.rule, 'Ստուգումն անցնելու համար պետք է ճիշտ պատասխանել պարտադիր և օժանդակ հմտություններին վերաբերող 18 հարցից առնվազն 15-ին։ Ինը հմտություններից յուրաքանչյուրի երկու հարցից առնվազն մեկին պետք է ճիշտ պատասխանել։ Չափման միավորների փոխարկման երկու հարցերին նույնպես պետք է պատասխանել։ Դրանց արդյունքը ներկայացվում է առանձին և չի ազդում ստուգումն անցնելու վրա։');
  assert.deepEqual(I2.criteria.deliveredSkillCodes, CODES);
  for (const key of ['scoredSkillCodes', 'readinessSkillCodes', 'reviewTargetSkillCodes']) {
    assert.deepEqual(I2.criteria[key], CODES.filter(c => c !== S07), key);
    assert.deepEqual(V1.criteria[key], CODES, key);
  }
  const rule = publicRule(I2.criteria, I2);
  assert.deepEqual([rule.questions, rule.scoredQuestions, rule.minimumPercent], [20, 18, 80]);
});

test('phy7-u01-v1 decides exactly as today\'s code for every per-skill result of a 20-question check', () => {
  let checked = 0;
  for (let n = 0; n < 3 ** 10; n++) {
    const counts = Array.from({ length: 10 }, (_, k) => Math.floor(n / 3 ** k) % 3);
    const rows = skillResults(counts), overall = totals(rows);
    const expected = today(rows, overall), actual = evaluateMastery(V1.criteria, rows, overall);
    assert.equal(actual.passed, expected.passed);
    assert.equal(actual.rawPercent, expected.percent);
    assert.deepEqual(actual.failedSkillIds, expected.failedSkillIds);
    assert.equal(actual.reporting, null);
    checked++;
  }
  assert.equal(checked, 59049);
});

test('I-2 pass rule: 15/18 decides, S07 can neither fail nor rescue a pass', () => {
  // 15/18 on the nine skills, S07 0/2: passes; raw score 15/20 = 75% is what the database stores.
  const pass = skillResults([2, 2, 2, 2, 1, 2, 0, 1, 1, 2]);
  const a = evaluateMastery(I2.criteria, pass, totals(pass));
  assert.equal(a.passed, true);
  assert.equal(a.rawPercent, 75);
  assert.deepEqual(a.decidingScore, { correct: 15, answered: 18, percent: 83 });
  assert.equal(evaluateMastery(V1.criteria, pass, totals(pass)).passed, false, 'today S07 at 0/2 fails this student');
  // 14/18 with S07 2/2: 16/20 = 80% overall would pass today; I-2 fails it.
  const rescue = skillResults([2, 2, 2, 1, 1, 2, 2, 1, 1, 2]);
  assert.equal(evaluateMastery(V1.criteria, rescue, totals(rescue)).passed, true);
  const b = evaluateMastery(I2.criteria, rescue, totals(rescue));
  assert.equal(b.passed, false);
  assert.deepEqual(b.decidingScore, { correct: 14, answered: 18, percent: 78 });
  // A scored skill at 0/2 fails even at 16/18.
  const zero = skillResults([2, 2, 2, 2, 2, 2, 1, 0, 2, 2]);
  const c = evaluateMastery(I2.criteria, zero, totals(zero));
  assert.equal(c.decidingScore.correct, 16);
  assert.equal(c.passed, false);
});

test('I-2 result record: deciding score 15/18, S07 reported separately in the shared display', () => {
  const rows = skillResults([2, 2, 2, 2, 1, 2, 0, 1, 1, 2]);
  const { reporting } = evaluateMastery(I2.criteria, rows, totals(rows));
  assert.equal(reporting.schemaVersion, 'haiedu-assessment-result-v2');
  assert.equal(reporting.scoringRuleVersion, 'phy7-u01-i2-v1');
  assert.deepEqual(reporting.score, { correct: 15, answered: 18, percent: 83 });
  assert.deepEqual(reporting.overallScore, { correct: 15, answered: 20, percent: 75 });
  assert.deepEqual(reporting.groups.map(g => [g.key, g.correct, g.answered, g.percent, g.determinesPass]),
    [['required', 15, 18, 83, true], ['additional', 0, 2, 0, false]]);
  assert.equal(reporting.scoredSkillIds.includes('skill-7'), false);
  assert.equal(Object.hasOwn(reporting.passCriteria.minimumCorrectBySkill, 'skill-7'), false);
  const html = assessmentResultMarkup(reporting, { includeScope: false });
  assert.match(html, /Ստուգարքն անցած է · 15\/18 · 83%/);
  assert.match(html, /Պարտադիր և օժանդակ հմտություններ՝ 15\/18 · 83% · հաշվի է առնվում ստուգարքը հանձնելիս/);
  assert.match(html, /Լրացուցիչ վերջնարդյունք՝ 0\/2 · 0%<\/p>/);
  assert.doesNotMatch(html, /15\/20|75%/);
});

test('targeted review after a failed I-2 attempt never names S07; today\'s rule still can', () => {
  const rows = skillResults([2, 1, 2, 1, 1, 2, 0, 1, 2, 2]); // S07 is the weakest skill
  const i2 = evaluateMastery(I2.criteria, rows, totals(rows));
  assert.equal(i2.passed, false);
  assert.deepEqual(i2.failedSkillIds, ['skill-2', 'skill-4', 'skill-5']);
  const v1 = evaluateMastery(V1.criteria, rows, totals(rows));
  assert.equal(v1.failedSkillIds[0], 'skill-7');
});

test('readiness: I-2 opens the check on the nine skills; today\'s rule needs all ten', () => {
  const skills = CODES.map((code, n) => ({ id: `skill-${n + 1}`, code }));
  const complete = s => s.code !== S07;
  assert.deepEqual(incompleteReadinessSkills(I2.criteria, skills, complete), []);
  assert.deepEqual(incompleteReadinessSkills(V1.criteria, skills, complete).map(s => s.code), [S07]);
  assert.deepEqual(incompleteReadinessSkills(I2.criteria, skills, s => s.code !== 'PHY7-U01-S03').map(s => s.code), ['PHY7-U01-S03']);
});

test('saved criteria: unsaved checks use the default; tampered or unknown versions are refused', async () => {
  assert.equal(savedRuleVersion({}, 'phy7-u01-v1'), 'phy7-u01-v1');
  assert.deepEqual(criteriaForSession({ poolCode: 'x' }, V1), V1.criteria);
  const saved = ruleSnapshot(I2);
  assert.deepEqual(Object.keys(saved), ['scoringRuleVersion', 'scoringRuleCriteria', 'scoringRuleFingerprint']);
  assert.deepEqual(criteriaForSession(saved, I2), I2.criteria);
  // Key order does not matter; content does.
  const reordered = { ...saved, scoringRuleCriteria: Object.fromEntries(Object.entries(saved.scoringRuleCriteria).reverse()) };
  assert.deepEqual(criteriaForSession(reordered, I2), reordered.scoringRuleCriteria);
  const mismatch = e => e instanceof RuleError && e.code === 'legacy_mastery_rule_mismatch';
  assert.throws(() => criteriaForSession({ ...saved, scoringRuleFingerprint: '0'.repeat(64) }, I2), mismatch);
  assert.throws(() => criteriaForSession({ ...saved, scoringRuleCriteria: { ...saved.scoringRuleCriteria, minimumPercent: 70 } }, I2), mismatch);
  assert.throws(() => criteriaForSession(saved, V1), mismatch, 'saved I-2 criteria never score as v1');
  assert.throws(() => criteriaForSession({ scoringRuleCriteria: I2.criteria }, V1), mismatch, 'criteria without a version are refused');
  // Through the service reads.
  assert.equal((await loadActiveRule(admin, 'PHY7-U01')).ruleVersion, 'phy7-u01-v1');
  assert.equal((await loadSessionCriteria(admin, saved, 'phy7-u01-v1')).criteria.ruleVersion, 'phy7-u01-i2-v1');
  await assert.rejects(loadRuleVersion(admin, 'phy7-u01-i9'), e => e.code === 'legacy_mastery_rule_unknown');
  await assert.rejects(loadSessionCriteria(admin, { ...saved, scoringRuleVersion: 'phy7-u01-i9' }, 'phy7-u01-v1'), e => e.code === 'legacy_mastery_rule_unknown');
  await assert.rejects(loadActiveRule(admin, 'NO-SUCH-UNIT'), e => e.code === 'legacy_mastery_rule_unavailable');
});

test('criteria validation refuses incomplete or contradictory rules', () => {
  const bad = patch => assert.throws(() => validateCriteria({ ...structuredClone(I2.criteria), ...patch }), e => e.code === 'legacy_mastery_criteria_invalid');
  bad({ schemaVersion: 'other' });
  bad({ scoredSkillCodes: [...I2.criteria.scoredSkillCodes, 'PHY7-U02-S01'] });
  bad({ percentComparison: 'rounded_overall_percent' }); // rounded whole-check needs every skill scored
  bad({ minimumCorrectPerScoredSkill: 3 });
  bad({ reporting: { ...I2.criteria.reporting, groups: [{ key: 'all', label: 'All', skillCodes: CODES }] } }); // mixes scored and unscored
  bad({ reporting: { ...I2.criteria.reporting, groups: I2.criteria.reporting.groups.slice(0, 1) } }); // S07 unreported
  bad({ textsHy: { rule: 'x', ready: 'y' } });
  bad({ readinessSkillCodes: [] });
});
