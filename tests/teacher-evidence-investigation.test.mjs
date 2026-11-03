import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { acceptanceFixture, selection, finishThroughAPI, id } from './fixtures/learning-acceptance.mjs';
import { inspectTeacherEvidence } from '../scripts/inspect-teacher-evidence.mjs';
import { loadExactInstitutionalClassAnalytics } from '../supabase/functions/_shared/institutional-teacher-analytics.ts';
import { skillEvidenceState } from '../web/teacher-skill-evidence.mjs';

const context = { schoolId: 'school', academicYearId: 'year', classId: 'class', assignmentId: 'assignment',
  subjectProgramId: 'programme', curriculumReleaseId: 'release', unitId: 'unit', unitCode: 'SYN-U01' };
function fixture() {
  const student = { id: 'student', enrollmentId: 'enrollment' };
  const session = { id: 'session', student_id: student.id, institutional_class_enrollment_id: student.enrollmentId,
    school_id: context.schoolId, academic_year_id: context.academicYearId, class_id: context.classId,
    teacher_assignment_id: context.assignmentId, subject_program_id: context.subjectProgramId,
    curriculum_release_id: context.curriculumReleaseId, governed_unit_id: context.unitId,
    unit_code: context.unitCode, academic_context_status: 'exact', assessment_blueprint_id: 'blueprint',
    mode: 'practice', status: 'completed', learning_model_configuration_id: 'model',
    started_at: '2026-09-27T10:00:00Z', completed_at: '2026-09-27T10:05:00Z' };
  return { context, student, sessions: [session], blueprintRows: [{ id: 'blueprint' }],
    blueprintItems: [{ assessment_blueprint_id: 'blueprint', item_id: 'item', item_version_snapshot: 1 },
      { assessment_blueprint_id: 'blueprint', item_id: 'anchor-item', item_version_snapshot: 1 }],
    versions: [{ item_id: 'item', version_no: 1, snapshot: { item: { skill_id: 'skill', difficulty: 2 } } },
      { item_id: 'anchor-item', version_no: 1, snapshot: { item: { skill_id: 'skill', difficulty: 2 } } }],
    attempts: [{ id: 'attempt', student_id: student.id, learning_session_id: session.id, skill_id: 'skill',
      item_id: 'item', score: 1, correct: true, hint_used: false, created_at: '2026-09-27T10:01:00Z' }] };
}
async function actualTeacherRow(input) {
  const { student } = input;
  const rosterRow = { id: student.enrollmentId, student_id: student.id, student_membership_id: 'membership',
    status: 'active', valid_from: '2026-09-26T20:57:00Z', valid_to: null };
  const data = await loadExactInstitutionalClassAnalytics({}, context, [student], { ...input,
    skillRows: [{ skill_id: 'skill', skill_code_snapshot: 'SYN-U01-S02', name_hy_snapshot: 'Հմտություն', sequence_order_snapshot: 1 }],
    models: [], lifecyclePolicies: [], reviewSessions: [], roster: { enrollments: [rosterRow],
      studentProfiles: [{ id: student.id, role: 'student', account_status: 'active' }],
      studentMemberships: [{ id: 'membership', person_id: student.id, school_id: context.schoolId,
        role: 'student', status: 'active', valid_from: rosterRow.valid_from, valid_to: null }] } });
  return data.students[0].matrix[0];
}

test('offline diagnosis agrees with the actual teacher pipeline for frozen-item failures', async () => {
  for (const [reason, change] of [
    ['blueprint_item_missing', f => { f.sessions[0].assessment_blueprint_id = 'other'; f.blueprintRows.push({ id: 'other' }); }],
    ['frozen_version_missing', f => { f.blueprintItems[0].item_version_snapshot = 2; }],
    ['frozen_skill_mismatch', f => { f.attempts[0].skill_id = 'different-skill'; }],
    ['assessment_incomplete', f => { f.sessions[0].mode = 'diagnostic'; f.sessions[0].status = 'active'; }],
  ]) {
    const f = fixture(); change(f);
    assert.deepEqual(inspectTeacherEvidence(f).skills[0].excludedReasons, { [reason]: 1 });
    const row = await actualTeacherRow(f);
    assert.equal(row.evidenceCount, 0);
    assert.equal(skillEvidenceState(row).kind, 'none');
  }
});

test('two S02 and one S04 post-enrollment practice answers can be lost without a date cutoff', async () => {
  const f = fixture();
  f.blueprintItems[0].item_version_snapshot = 2;
  f.attempts = [0, 1].map(i => ({ ...f.attempts[0], id: 's02-' + i }));
  const s02 = inspectTeacherEvidence(f).skills[0];
  assert.equal(s02.observedAttempts, 2);
  assert.equal(s02.includedAttempts, 0);
  assert.deepEqual(s02.excludedReasons, { frozen_version_missing: 2 });
  assert.equal((await actualTeacherRow(f)).evidenceCount, 0);
  f.attempts.length = 1;
  assert.equal(inspectTeacherEvidence(f).skills[0].observedAttempts, 1);
  assert.equal((await actualTeacherRow(f)).evidenceCount, 0);
  // Synthetic possibility, not a claim about the real learner's versions.
  f.blueprintItems[0].item_version_snapshot = 1;
  assert.equal((await actualTeacherRow(f)).evidenceCount, 1);
});

test('context, enrollment and unit exclusions remain distinct from frozen evidence', () => {
  for (const [reason, change] of [
    ['session_missing', f => { f.sessions = []; }],
    ['enrollment_mismatch', f => { f.sessions[0].institutional_class_enrollment_id = 'other'; }],
    ['academic_context_not_exact', f => { f.sessions[0].academic_context_status = 'unbound_legacy'; }],
    ['academic_tuple_mismatch', f => { f.sessions[0].teacher_assignment_id = 'other'; }],
    ['release_mismatch', f => { f.sessions[0].curriculum_release_id = 'other'; }],
    ['unit_mismatch', f => { f.sessions[0].governed_unit_id = 'other'; }],
    ['blueprint_outside_unit', f => { f.sessions[0].assessment_blueprint_id = 'other'; }],
  ]) {
    const f = fixture(); change(f);
    assert.deepEqual(inspectTeacherEvidence(f).skills[0].excludedReasons, { [reason]: 1 });
  }
});

test('a valid active practice answer counts even with older, unrecorded or different contracts', async () => {
  const f = fixture();
  f.sessions[0].status = 'active'; f.sessions[0].assessment_policy_binding_id = null;
  f.sessions[0].runtime_provenance_status = 'unrecorded';
  assert.equal(inspectTeacherEvidence(f).skills[0].includedAttempts, 1);
  const row = await actualTeacherRow(f);
  assert.equal(row.evidenceCount, 1);
  assert.equal(row.status, 'provenance_unavailable', 'missing model affects estimation, not the evidence count');
  f.sessions[0].governed_unit_id = null;
  assert.equal(inspectTeacherEvidence(f).skills[0].includedAttempts, 1);
});

test('offline CLI accepts stdin, emits counts only and redacts malformed input', () => {
  const f = fixture(); f.attempts.push({ ...f.attempts[0], student_id: 'foreign', id: 'foreign-attempt' });
  const args = ['scripts/inspect-teacher-evidence.mjs'];
  const ok = spawnSync(process.execPath, args, { input: JSON.stringify(f), encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).skills[0].observedAttempts, 1);
  assert.doesNotMatch(ok.stdout, /student|enrollment|session|attempt-|foreign/);
  const failed = spawnSync(process.execPath, args, { input: 'PRIVATE_INVALID_EXPORT', encoding: 'utf8' });
  assert.equal(failed.status, 1); assert.doesNotMatch(failed.stderr + failed.stdout, /PRIVATE_INVALID_EXPORT/);
  assert.throws(() => inspectTeacherEvidence({}), /complete academic context/);
  assert.throws(() => inspectTeacherEvidence({ ...f, versions: null }), /versions array/);
});

test('the prepared read-only export executes on the disposable governed SQL fixture', async t => {
  const f = await acceptanceFixture(); t.after(() => f.close());
  const start = await f.call('start-learning-session', { ...selection(0), mode: 'diagnostic' });
  assert.equal(start.status, 200); await finishThroughAPI(f, start.body.session, true);
  const source = readFileSync('docs/qa/u1-evidence-export.sql', 'utf8')
    .replace('bc3db497%', id(10))
    .replace('6f8002d4-e375-4490-91d1-ac8111c316de', id(321))
    .replace('80bbe575-ad49-4a7f-881a-e55726b1eaeb', id(501))
    .replace('0349ffcd-8fc9-47f2-82d1-3d5cfcb3a096', id(511));
  const result = await f.db.query(source);
  assert.equal(result.rows.length, 1);
  const exported = result.rows[0].evidence_export;
  assert.equal(exported.student.enrollmentId, id(371));
  assert.equal(exported.attempts.length, 3);
  const report = inspectTeacherEvidence(exported);
  assert.equal(report.skills.reduce((sum, row) => sum + row.includedAttempts, 0), 3);
  assert.ok(exported.versions.every(row => Object.keys(row.snapshot.item).sort().join(',') === 'difficulty,skill_id'));
  assert.doesNotMatch(JSON.stringify(exported), /display_name|prompt_hy|answer|email/);
  assert.equal((await f.db.query(source.replace(id(10), id(999)))).rows.length, 0);
});
