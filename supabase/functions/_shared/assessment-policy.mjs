// Prospective immutable blueprint contract. Missing policy has no core default.
export const ASSESSMENT_POLICY_SCHEMA = 'haiedu-assessment-policy-v1';
export class AssessmentPolicyInvalid extends Error {
  constructor() { super('assessment_policy_invalid'); }
}
const modes = new Set(['diagnostic', 'practice', 'mastery_check', 'chapter_review']);
const responseTypes = new Set(['single_choice', 'true_false']);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
function assert(ok) { if (!ok) throw new AssessmentPolicyInvalid(); }
function countMap(value, allowZero = false) {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  const rows = Object.entries(value);
  assert(rows.length > 0 && rows.every(([id, count]) => uuid(id) && Number.isSafeInteger(count) && count >= (allowZero ? 0 : 1)));
  return rows;
}
export function readAssessmentPolicy(snapshot, scope) {
  const value = snapshot?.assessmentPolicy;
  if (value === undefined) return null;
  assert(value && typeof value === 'object' && !Array.isArray(value));
  assert(value.schemaVersion === ASSESSMENT_POLICY_SCHEMA && typeof value.policyKey === 'string' && value.policyKey.trim().length > 0 && positive(value.version));
  assert(modes.has(value.mode) && value.mode === scope.mode &&
    uuid(value.subjectProgramId) && value.subjectProgramId === scope.subjectProgramId &&
    uuid(value.curriculumReleaseId) && value.curriculumReleaseId === scope.curriculumReleaseId &&
    uuid(value.unitId) && value.unitId === scope.unitId);
  assert(positive(value.plannedQuestionCount) && uuid(value.learningModelConfigurationId) && uuid(value.academicMasteryPolicyId));
  assert(Array.isArray(value.responseTypes) && value.responseTypes.length > 0 && new Set(value.responseTypes).size === value.responseTypes.length && value.responseTypes.every(type => responseTypes.has(type)));
  assert(value.scoringStrategy === 'selected-response-v1' && typeof value.hintsAllowed === 'boolean' && typeof value.baselineRequired === 'boolean');
  if (['diagnostic', 'mastery_check'].includes(value.mode)) {
    assert(value.hintsAllowed === false);
    const rows = countMap(value.questionCountBySkill);
    assert(rows.reduce((sum, [, count]) => sum + count, 0) === value.plannedQuestionCount);
  } else {
    assert(value.questionCountBySkill === undefined);
  }
  if (value.mode === 'diagnostic') assert(value.maximumCompletedBaselines === 1 && value.baselineRequired === false);
  else assert(value.maximumCompletedBaselines === undefined);
  if (value.mode === 'mastery_check') {
    assert(typeof value.minimumPercent === 'number' && Number.isFinite(value.minimumPercent) && value.minimumPercent > 0 && value.minimumPercent <= 100);
    for (const [id, count] of countMap(value.minimumCorrectBySkill, true)) assert(value.questionCountBySkill[id] !== undefined && count <= value.questionCountBySkill[id]);
  } else {
    assert(value.minimumPercent === undefined && value.minimumCorrectBySkill === undefined);
  }
  const allowed = new Set(['schemaVersion','policyKey','version','mode','subjectProgramId','curriculumReleaseId','unitId','plannedQuestionCount','learningModelConfigurationId','academicMasteryPolicyId','responseTypes','scoringStrategy','hintsAllowed','baselineRequired','questionCountBySkill','maximumCompletedBaselines','minimumPercent','minimumCorrectBySkill']);
  assert(Object.keys(value).every(key => allowed.has(key)));
  return structuredClone(value);
}
