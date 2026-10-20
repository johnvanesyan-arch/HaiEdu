// Prospective immutable blueprint contract. Missing policy has no core default.
export const ASSESSMENT_POLICY_SCHEMA = 'haiedu-assessment-policy-v1';
export const ASSESSMENT_POLICY_SCHEMA_V2 = 'haiedu-assessment-policy-v2';
export const ASSESSMENT_POLICY_SCHEMA_V3 = 'haiedu-assessment-policy-v3';
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
function skillSet(value, scope) {
  assert(Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(id => uuid(id) && (!scope || scope.includes(id))));
  return value;
}
function readV2Scope(value) {
  const delivered = skillSet(value.deliveredSkillIds);
  if (value.questionCountBySkill) assert(Object.keys(value.questionCountBySkill).length === delivered.length && delivered.every(id => Object.hasOwn(value.questionCountBySkill, id)));
  assert(Array.isArray(value.reportingGroups) && value.reportingGroups.length > 0);
  const members = [], keys = new Set();
  for (const group of value.reportingGroups) {
    assert(group && typeof group === 'object' && Object.keys(group).length === 3 && Object.keys(group).every(key => ['key','label','skillIds'].includes(key)));
    assert(typeof group.key === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(group.key) && !keys.has(group.key));
    assert(typeof group.label === 'string' && group.label.trim().length > 0 && group.label.length <= 200);
    keys.add(group.key); members.push(...skillSet(group.skillIds, delivered));
  }
  assert(members.length === delivered.length && new Set(members).size === delivered.length);
  if (value.mode === 'mastery_check') {
    const scored = skillSet(value.scoredSkillIds, delivered);
    skillSet(value.readinessSkillIds, delivered);
    assert(Object.keys(value.minimumCorrectBySkill).every(id => scored.includes(id)));
    assert(value.reportingGroups.every(group => group.skillIds.every(id => scored.includes(id)) || group.skillIds.every(id => !scored.includes(id))));
  } else assert(value.scoredSkillIds === undefined && value.readinessSkillIds === undefined);
}
export function readAssessmentPolicy(snapshot, scope) {
  const value = snapshot?.assessmentPolicy;
  if (value === undefined) return null;
  assert(value && typeof value === 'object' && !Array.isArray(value));
  const v3 = value.schemaVersion === ASSESSMENT_POLICY_SCHEMA_V3;
  const v2 = v3 || value.schemaVersion === ASSESSMENT_POLICY_SCHEMA_V2;
  assert((v2 || value.schemaVersion === ASSESSMENT_POLICY_SCHEMA) && typeof value.policyKey === 'string' && value.policyKey.trim().length > 0 && positive(value.version));
  assert(modes.has(value.mode) && value.mode === scope.mode &&
    uuid(value.subjectProgramId) && value.subjectProgramId === scope.subjectProgramId &&
    uuid(value.curriculumReleaseId) && value.curriculumReleaseId === scope.curriculumReleaseId &&
    uuid(value.unitId) && value.unitId === scope.unitId);
  assert(positive(value.plannedQuestionCount) && uuid(value.learningModelConfigurationId) && uuid(value.academicMasteryPolicyId));
  assert(Array.isArray(value.responseTypes) && value.responseTypes.length > 0 && new Set(value.responseTypes).size === value.responseTypes.length && value.responseTypes.every(type => responseTypes.has(type) || (v3 && type === 'typed_fields')));
  assert(value.scoringStrategy === (v3 ? 'normalized-item-score-v1' : 'selected-response-v1') && typeof value.hintsAllowed === 'boolean' && typeof value.baselineRequired === 'boolean');
  if (v3) {
    assert(value.itemWeight === 1 && value.responseCapabilities && typeof value.responseCapabilities === 'object' && !Array.isArray(value.responseCapabilities));
    assert(value.responseTypes.includes('typed_fields')
      ? Object.keys(value.responseCapabilities).length === 1 && value.responseCapabilities.typed_fields === 'haiedu-typed-fields-v1'
      : Object.keys(value.responseCapabilities).length === 0);
  }
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
  if (v2) {
    for (const key of ['deliveredSkillIds','scoredSkillIds','readinessSkillIds','reportingGroups']) allowed.add(key);
    readV2Scope(value);
  }
  if (v3) for (const key of ['responseCapabilities','itemWeight']) allowed.add(key);
  assert(Object.keys(value).every(key => allowed.has(key)));
  return structuredClone(value);
}
