import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Offline investigation only. Input is an owner-supplied, narrowly scoped export;
// no client, credentials, network request or database connection is created.
// Keep the predicates aligned with loadExactInstitutionalClassAnalytics and
// buildExactInstitutionalStudentAnalytics. Counts never substitute for mastery.
export function inspectTeacherEvidence(input) {
  const { context, student } = input ?? {};
  if (!context || !student?.id || !student?.enrollmentId ||
      !['schoolId', 'academicYearId', 'classId', 'assignmentId', 'subjectProgramId',
        'curriculumReleaseId', 'unitId', 'unitCode'].every(key => typeof context[key] === 'string' && context[key])) {
    throw new Error('Expected one complete academic context and student enrollment');
  }
  for (const key of ['sessions', 'attempts', 'blueprintRows', 'blueprintItems', 'versions']) {
    if (!Array.isArray(input[key])) throw new Error(`Expected ${key} array`);
  }
  const sessions = new Map(input.sessions.map(row => [row.id, row]));
  const blueprints = new Set(input.blueprintRows.map(row => row.id));
  const members = new Map(input.blueprintItems.map(row => [
    `${row.assessment_blueprint_id}:${row.item_id}`, row.item_version_snapshot,
  ]));
  const versions = new Map(input.versions.map(row => [`${row.item_id}:${row.version_no}`, row.snapshot?.item]));
  const groups = new Map();
  for (const attempt of input.attempts) {
    // Ignore another learner even if the supplied file contains extra rows.
    if (attempt.student_id !== student.id) continue;
    const session = sessions.get(attempt.learning_session_id);
    let reason = null;
    if (!session) reason = 'session_missing';
    else if (session.student_id !== student.id || session.institutional_class_enrollment_id !== student.enrollmentId) reason = 'enrollment_mismatch';
    else if (session.academic_context_status !== 'exact') reason = 'academic_context_not_exact';
    else if ([['school_id', 'schoolId'], ['academic_year_id', 'academicYearId'], ['class_id', 'classId'],
      ['teacher_assignment_id', 'assignmentId'], ['subject_program_id', 'subjectProgramId']]
      .some(([column, key]) => session[column] !== context[key])) reason = 'academic_tuple_mismatch';
    else if (session.curriculum_release_id !== context.curriculumReleaseId) reason = 'release_mismatch';
    else if (session.unit_code !== context.unitCode || !(session.governed_unit_id === context.unitId ||
      (session.governed_unit_id == null && blueprints.has(session.assessment_blueprint_id)))) reason = 'unit_mismatch';
    else {
      const version = members.get(`${session.assessment_blueprint_id}:${attempt.item_id}`);
      const frozen = versions.get(`${attempt.item_id}:${version}`);
      if (!blueprints.has(session.assessment_blueprint_id)) reason = 'blueprint_outside_unit';
      else if (version == null) reason = 'blueprint_item_missing';
      else if (!frozen) reason = 'frozen_version_missing';
      else if (frozen.skill_id !== attempt.skill_id) reason = 'frozen_skill_mismatch';
      else if (['diagnostic', 'mastery_check'].includes(session.mode) && session.status !== 'completed') reason = 'assessment_incomplete';
    }
    const row = groups.get(attempt.skill_id) ?? { skillId: attempt.skill_id, observedAttempts: 0, includedAttempts: 0, excludedReasons: {} };
    row.observedAttempts++;
    if (reason) row.excludedReasons[reason] = (row.excludedReasons[reason] ?? 0) + 1;
    else row.includedAttempts++;
    groups.set(attempt.skill_id, row);
  }
  // Do not emit learner/session/attempt identifiers, names, answers or prompts.
  return { schemaVersion: 'teacher-evidence-investigation-v1', productionCauseConfirmed: false,
    skills: [...groups.values()].sort((a, b) => String(a.skillId).localeCompare(String(b.skillId))) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('Expected zero or one input path');
    let source = '';
    if (process.argv[2]) source = await readFile(process.argv[2], 'utf8');
    else {
      process.stdin.setEncoding('utf8');
      for await (const chunk of process.stdin) source += chunk;
    }
    console.log(JSON.stringify(inspectTeacherEvidence(JSON.parse(source)), null, 2));
  } catch {
    // Never echo untrusted JSON, file paths or raw errors from an owner export.
    console.error('Evidence inspection failed: supply valid JSON with the documented context and arrays.');
    process.exitCode = 1;
  }
}
