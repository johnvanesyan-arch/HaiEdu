// Chapter I decision I-2, option A: the legacy mastery rule registry, its append-only
// activation log, and today's Home/Course dashboard (service_student_learning_dashboard).
// Real repository migrations in in-memory PGlite; synthetic fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registryDatabase, registryMigration, one, activeRule, activate, ruleRow } from './fixtures/legacy-mastery-rules-db.mjs';
import { database as fullDatabase, dashboard, id } from './fixtures/assessed-audio-db.mjs';

const dashboardMigration = 'supabase/migrations/20261120120100_legacy_mastery_rule_dashboard.sql';

test('registry: two seeded versions, only today\'s rule active, fingerprints computed by the database', async t => {
  const db = await registryDatabase(); t.after(() => db.close());
  const rows = (await db.query('select rule_version,unit_code,fingerprint,encode(sha256(convert_to(criteria::text,\'UTF8\')),\'hex\') expected from private.legacy_mastery_rule_versions order by rule_version')).rows;
  assert.deepEqual(rows.map(r => r.rule_version), ['phy7-u01-i2-v1', 'phy7-u01-v1']);
  for (const r of rows) assert.equal(r.fingerprint, r.expected);
  assert.equal((await one(db, 'select count(*)::int n from private.legacy_mastery_rule_activations')).n, 1);
  assert.equal((await activeRule(db)).ruleVersion, 'phy7-u01-v1');
  // A supplied fingerprint is replaced by the computed one.
  await db.query("insert into private.legacy_mastery_rule_versions(rule_version,unit_code,description,criteria,fingerprint) select 'syn-copy-v1','PHY7-U01','copy',jsonb_set(criteria,'{ruleVersion}','\"syn-copy-v1\"'),'forged' from private.legacy_mastery_rule_versions where rule_version='phy7-u01-v1'");
  assert.match((await ruleRow(db, 'syn-copy-v1')).fingerprint, /^[0-9a-f]{64}$/);
});

test('registry rows are immutable and the activation log is append-only', async t => {
  const db = await registryDatabase(); t.after(() => db.close());
  for (const sql of [
    "update private.legacy_mastery_rule_versions set description='x'",
    "update private.legacy_mastery_rule_versions set criteria=jsonb_set(criteria,'{minimumPercent}','70')",
    "delete from private.legacy_mastery_rule_versions",
    'truncate private.legacy_mastery_rule_versions cascade',
    "update private.legacy_mastery_rule_activations set rule_version='phy7-u01-i2-v1'",
    'delete from private.legacy_mastery_rule_activations',
    'truncate private.legacy_mastery_rule_activations',
  ]) await assert.rejects(db.query(sql), /legacy_mastery_rule_records_immutable/, sql);
  // A row whose criteria name another version or unit is refused.
  await assert.rejects(db.query("insert into private.legacy_mastery_rule_versions(rule_version,unit_code,description,criteria) select 'syn-x-v1','PHY7-U01','x',criteria from private.legacy_mastery_rule_versions where rule_version='phy7-u01-v1'"), /check constraint/);
});

test('activation and rollback each append one audited row; no-op, unknown and cross-unit switches are refused', async t => {
  const db = await registryDatabase(); t.after(() => db.close());
  const on = await activate(db, 'phy7-u01-i2-v1', 'PHY7-U01', 'I-2 isolated activation');
  assert.deepEqual([on.ruleVersion, on.previousRuleVersion], ['phy7-u01-i2-v1', 'phy7-u01-v1']);
  assert.equal((await activeRule(db)).ruleVersion, 'phy7-u01-i2-v1');
  await assert.rejects(activate(db, 'phy7-u01-i2-v1'), /legacy_mastery_rule_already_active/);
  await assert.rejects(activate(db, 'phy7-u01-i9-v1'), /legacy_mastery_rule_unknown/);
  await assert.rejects(activate(db, 'phy7-u01-v1', 'PHY7-U02'), /legacy_mastery_rule_unit_mismatch/);
  const back = await activate(db, 'phy7-u01-v1', 'PHY7-U01', 'isolated rollback');
  assert.deepEqual([back.ruleVersion, back.previousRuleVersion], ['phy7-u01-v1', 'phy7-u01-i2-v1']);
  assert.equal((await activeRule(db)).ruleVersion, 'phy7-u01-v1');
  const log = (await db.query('select rule_version,activated_by,reason from private.legacy_mastery_rule_activations order by activation_sequence')).rows;
  assert.deepEqual(log.map(r => r.rule_version), ['phy7-u01-v1', 'phy7-u01-i2-v1', 'phy7-u01-v1']);
  assert.ok(log.every(r => r.activated_by && r.reason));
});

test('client roles cannot read or switch rules; only the service role can', async t => {
  const db = await registryDatabase(); t.after(() => db.close());
  for (const role of ['anon', 'authenticated']) {
    for (const fn of ['service_legacy_mastery_active_rule(text)', 'service_legacy_mastery_rule_version(text)', 'service_activate_legacy_mastery_rule(text,text,text,text)'])
      assert.equal((await one(db, "select has_function_privilege($1,$2,'execute') ok", [role, fn])).ok, false, `${role} ${fn}`);
    for (const table of ['private.legacy_mastery_rule_versions', 'private.legacy_mastery_rule_activations'])
      assert.equal((await one(db, "select has_table_privilege($1,$2,'select') ok", [role, table])).ok, false, `${role} ${table}`);
  }
  assert.equal((await one(db, "select has_function_privilege('service_role','service_activate_legacy_mastery_rule(text,text,text,text)','execute') ok")).ok, true);
  assert.equal((await one(db, "select has_table_privilege('service_role','private.legacy_mastery_rule_versions','select') ok")).ok, false);
  assert.match(readFileSync(registryMigration, 'utf8'), /Applying this migration to production needs John's explicit approval/);
});

test('today\'s Home/Course dashboard: the active legacy rule decides required skills and per-skill minima', async t => {
  const db = await fullDatabase(); t.after(() => db.close());
  await db.exec(readFileSync(registryMigration, 'utf8'));
  await db.exec(readFileSync(dashboardMigration, 'utf8'));
  // Register unit SYN-A-CH1 (skills SYN-521, SYN-522) as a legacy extension, as the existing dashboard test does.
  await db.query("update assessment_blueprints set configuration_snapshot=jsonb_build_object('targetQuestions',7) where curriculum_release_id=$1 and unit_id=$2", [id(501), id(511)]);
  await db.query('update learning_model_configurations set configuration=configuration||$2 where id=$1', [id(611), JSON.stringify({ diagnostic: { itemsPerSkill: 2 }, masteryCheck: { itemsPerSkill: 2, overallPassPercent: 80, minimumCorrectPerSkill: 1 }, practice: { plannedSessionLength: 8 } })]);
  await db.query("insert into legacy_learning_blueprint_mappings(assessment_blueprint_id,curriculum_release_id,subject_program_id,unit_id,unit_code_snapshot,source_configuration_fingerprint,extension_key) select id,curriculum_release_id,$1,unit_id,'SYN-A-CH1','fixture','legacy-physics7-u01-v1' from assessment_blueprints where curriculum_release_id=$2 and unit_id=$3", [id(201), id(501), id(511)]);
  const [a, b] = [id(521), id(522)];

  const before = await dashboard(db);
  assert.equal(before.modes.mastery_check.status, 'registered_legacy');
  assert.deepEqual(before.skills.map(s => s.requiredForReadiness), [true, true], 'no registry row: unchanged');
  assert.deepEqual(Object.keys(before.modes.mastery_check.minimumCorrectBySkill).sort(), [a, b].sort());
  assert.equal(before.modes.mastery_check.scoringRuleVersion, undefined);

  // Synthetic two-skill rules for this unit: all skills (today's shape) and SYN-522 reported separately (I-2 shape).
  const v1 = (await ruleRow(db, 'phy7-u01-v1')).criteria, i2 = (await ruleRow(db, 'phy7-u01-i2-v1')).criteria;
  const codes = ['SYN-521', 'SYN-522'];
  const all = { ...v1, ruleVersion: 'syn-a-v1', unitCode: 'SYN-A-CH1', deliveredSkillCodes: codes, scoredSkillCodes: codes, readinessSkillCodes: codes, reviewTargetSkillCodes: codes };
  const split = { ...i2, ruleVersion: 'syn-a-i2-v1', unitCode: 'SYN-A-CH1', deliveredSkillCodes: codes, scoredSkillCodes: [codes[0]], readinessSkillCodes: [codes[0]], reviewTargetSkillCodes: [codes[0]],
    reporting: { ...i2.reporting, groups: [{ ...i2.reporting.groups[0], skillCodes: [codes[0]] }, { ...i2.reporting.groups[1], skillCodes: [codes[1]] }] } };
  for (const c of [all, split]) await db.query("insert into private.legacy_mastery_rule_versions(rule_version,unit_code,description,criteria) values($1,'SYN-A-CH1','synthetic',$2)", [c.ruleVersion, JSON.stringify(c)]);
  await activate(db, 'syn-a-v1', 'SYN-A-CH1');
  const today = await dashboard(db);
  assert.deepEqual(today.skills.map(s => s.requiredForReadiness), [true, true]);
  assert.equal(today.modes.mastery_check.scoringRuleVersion, 'syn-a-v1');
  assert.deepEqual(Object.keys(today.modes.mastery_check.minimumCorrectBySkill).sort(), [a, b].sort());

  await activate(db, 'syn-a-i2-v1', 'SYN-A-CH1');
  const after = await dashboard(db);
  assert.deepEqual(after.skills.map(s => [s.id, s.requiredForReadiness]), [[a, true], [b, false]]);
  assert.equal(after.modes.mastery_check.scoringRuleVersion, 'syn-a-i2-v1');
  assert.deepEqual(after.modes.mastery_check.readinessSkillIds, [a]);
  assert.deepEqual(after.modes.mastery_check.minimumCorrectBySkill, { [a]: 1 });
  assert.equal(after.modes.mastery_check.minimumPercent, 80);
  assert.equal(after.modes.mastery_check.questions, 4, 'delivered questions unchanged');

  await activate(db, 'syn-a-v1', 'SYN-A-CH1', 'rollback');
  assert.deepEqual((await dashboard(db)).skills.map(s => s.requiredForReadiness), [true, true], 'rollback restores readiness on every skill');
});
