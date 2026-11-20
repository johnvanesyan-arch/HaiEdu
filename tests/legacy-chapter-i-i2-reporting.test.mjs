// Chapter I decision I-2, option A — reporting findings carried forward (§2a, plan revision 3).
// School admin grouping runs the real aggregation; the personal-account endpoints and the
// teacher panel are checked at source level (their handlers are not run here).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aggregateSchoolPerformanceAnalytics } from '../supabase/functions/_shared/school-performance-analytics.ts';
import { evaluateMastery } from '../supabase/functions/_shared/legacy-mastery-rules.mjs';
import { registryDatabase, ruleRow, skillResults, totals } from './fixtures/legacy-mastery-rules-db.mjs';

const db = await registryDatabase();
test.after(() => db.close());
const I2 = (await ruleRow(db, 'phy7-u01-i2-v1')).criteria;

const enrollment = { id: 'enr-1', student_id: 'stu-1', school_id: 'school-a', academic_year_id: 'year-a', class_id: 'class-a', subject_program_id: 'prog-a' };
const base = { institutional_class_enrollment_id: 'enr-1', student_id: 'stu-1', curriculum_release_id: 'rel-1', unit_code: 'PHY7-U01', mode: 'mastery_check',
  status: 'completed', academic_context_status: 'exact', started_at: '2026-11-20T08:00:00Z', school_id: 'school-a', academic_year_id: 'year-a', class_id: 'class-a',
  subject_program_id: 'prog-a', assessment_blueprint_id: 'bp-1', learning_model_configuration_id: 'model-1', academic_mastery_policy_id: 'policy-1' };

test('school admin: today\'s results and I-2 results never share an evidence group', () => {
  const rows = skillResults([2, 2, 2, 2, 1, 2, 0, 1, 1, 2]);
  const { reporting } = evaluateMastery(I2, rows, totals(rows));
  const sessions = [
    { ...base, id: 's-old', answered_count: 20, correct_count: 17, assessment_result: 'passed', completed_at: '2026-11-20T09:00:00Z', metadata: {} },
    { ...base, id: 's-v1', answered_count: 20, correct_count: 15, assessment_result: 'failed', completed_at: '2026-11-20T10:00:00Z', metadata: { scoringRuleVersion: 'phy7-u01-v1' } },
    { ...base, id: 's-i2', answered_count: 20, correct_count: 15, assessment_result: 'passed', completed_at: '2026-11-20T11:00:00Z', metadata: { scoringRuleVersion: 'phy7-u01-i2-v1', assessmentResultReporting: reporting } },
  ];
  const groups = aggregateSchoolPerformanceAnalytics({ enrollments: [enrollment], sessions, reviewSessions: [] }).evidenceGroups;
  assert.equal(groups.length, 2);
  const today = groups.find(g => g.ruleVersion === null), i2 = groups.find(g => g.ruleVersion === 'phy7-u01-i2-v1');
  assert.deepEqual([today.sessions, today.masteryPassed, today.passScore], [2, 1, null], 'records before and after the registry under today\'s rule stay together');
  assert.deepEqual([i2.sessions, i2.masteryPassed], [1, 1]);
  assert.deepEqual(i2.passScore, { correct: 15, answered: 18 });
  assert.deepEqual(i2.reportingGroups.map(g => [g.label, g.correct, g.answered, g.determinesPass]),
    [['Պարտադիր և օժանդակ հմտություններ', 15, 18, true], ['Լրացուցիչ վերջնարդյունք', 0, 2, false]]);
});

test('school admin: governed policy results keep their existing grouping', () => {
  const governed = { schemaVersion: 'haiedu-assessment-result-v2', groups: [{ key: 'm', label: 'M', skillIds: ['a'], determinesPass: true, correct: 4, answered: 5 }], score: { correct: 4, answered: 5, percent: 80 } };
  const sessions = ['g1', 'g2'].map((id, n) => ({ ...base, id, assessment_policy_binding_id: 'binding-1', answered_count: 5, correct_count: 4, assessment_result: 'passed', completed_at: `2026-11-20T0${n + 1}:00:00Z`, metadata: { assessmentResultReporting: governed } }));
  const groups = aggregateSchoolPerformanceAnalytics({ enrollments: [enrollment], sessions, reviewSessions: [] }).evidenceGroups;
  assert.equal(groups.length, 1);
  assert.equal(groups[0].ruleVersion, null);
  assert.equal(groups[0].sessions, 2);
});

test('personal-account endpoints return the saved result record and rule version; layout code unchanged', () => {
  const student = readFileSync('supabase/functions/get-teacher-student/index.ts', 'utf8');
  const dashboard = readFileSync('supabase/functions/get-teacher-dashboard/index.ts', 'utf8');
  const teacher = readFileSync('web/teacher.js', 'utf8');
  assert.match(student, /assessmentResult: latestMastery\.metadata\?\.assessmentResultReporting \?\? null/);
  assert.match(student, /scoringRuleVersion: latestMastery\.metadata\?\.scoringRuleVersion \?\? null/);
  assert.match(student, /reporting: s\.status === "completed" \? s\.metadata\?\.assessmentResultReporting \?\? null : null/);
  assert.match(student, /activeSession: active \? \(\(\{ metadata: _metadata, \.\.\.rest \}: any\) => rest\)\(active\) : null/, 'no metadata leaks through the active session');
  assert.match(dashboard, /masteryCheck: passedMastery \? \{ passed: true, percent: Number\(passedMastery\.score_percent \?\? 0\), assessmentResult: passedMastery\.metadata\?\.assessmentResultReporting \?\? null/);
  // The existing personal-account panel already renders a saved record through the shared display.
  assert.match(teacher, /data\.latestMasteryCheck\?\.assessmentResult \? assessmentResultMarkup\(data\.latestMasteryCheck\.assessmentResult,\{includeScope:false\}\)/);
  assert.match(teacher, /assessmentResultMarkup\(session\.reporting,\{includeScope:false\}\) \|\|/);
});
