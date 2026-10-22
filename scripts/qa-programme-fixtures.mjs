import { readFile } from 'node:fs/promises';

// Test-account scope only. This file grants no product authorization. Each extra
// programme must have a committed, independently verified enrollment identity.
export const additionalFixtures = JSON.parse(await readFile(new URL('../docs/qa/additional-programme-fixtures.json', import.meta.url), 'utf8'));
export function additionalContexts(fixture, manifest = additionalFixtures) {
  if (manifest?.dedicatedQa !== true || manifest.schemaVersion !== 'haiedu-designated-programme-fixtures-v1'
      || !Array.isArray(manifest.contexts)) throw Error('Invalid designated programme manifest');
  return manifest.contexts.filter(c => ['schoolId','studentId','teacherId','adminId'].every(k => c[k] === fixture[k])
    && c.baseClassId === fixture.classId && c.baseAssignmentId === fixture.assignmentId);
}

export function ownNavigation(contexts, fixture, manifest = additionalFixtures) {
  if (!Array.isArray(contexts) || contexts.length === 0) return false;
  const extra = additionalContexts(fixture, manifest);
  return contexts.every(c => c.schoolId === fixture.schoolId && (c.classId === fixture.classId
    || extra.some(e => ['classId','teacherAssignmentId','enrollmentId','subjectProgramId','curriculumReleaseId','unitId'].every(k => c[k] === e[k]))));
}

export function ownStudentClasses(data, fixture, manifest = additionalFixtures) {
  const ids = [fixture.classId, ...additionalContexts(fixture, manifest).map(c => c.classId)];
  return Array.isArray(data?.classes) && data.classes.length === ids.length
    && new Set(data.classes.map(c => c.id)).size === ids.length && data.classes.every(c => ids.includes(c.id));
}
