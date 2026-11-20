// Versioned pass/readiness criteria for the registered legacy mastery adapter
// (`legacy-physics7-u01-v1`). The criteria objects live in the database registry
// (private.legacy_mastery_rule_versions); this module only validates them and computes
// readiness, the pass decision, reporting groups and review targets from a criteria
// object. It holds no skill codes, thresholds or wording of its own.
//
// Every check saves its rule version, the complete criteria and the registry
// fingerprint when it starts, and is scored by those saved criteria when it
// finishes. A check with no saved criteria is scored by the adapter's default
// version, which the caller loads from the registry.

export const CRITERIA_SCHEMA = 'haiedu-legacy-mastery-criteria-v1';
export const RESULT_SCHEMA = 'haiedu-assessment-result-v2';
const COMPARISONS = new Set(['rounded_overall_percent', 'exact_scored_fraction']);
const TEXT_KEYS = ['rule', 'ready', 'locked'];

export class RuleError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const codeList = value => Array.isArray(value) && value.length > 0
  && value.every(v => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= 80)
  && new Set(value).size === value.length;
const subset = (inner, outer) => inner.every(v => outer.includes(v));
const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 2000;

// Throws RuleError('legacy_mastery_criteria_invalid') unless the object is complete
// and internally consistent. Returns the same object.
export function validateCriteria(c) {
  const fail = () => { throw new RuleError('legacy_mastery_criteria_invalid'); };
  if (!c || typeof c !== 'object' || Array.isArray(c)) fail();
  if (c.schemaVersion !== CRITERIA_SCHEMA) fail();
  if (typeof c.ruleVersion !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(c.ruleVersion)) fail();
  if (typeof c.unitCode !== 'string' || !c.unitCode) fail();
  for (const key of ['deliveredSkillCodes', 'scoredSkillCodes', 'readinessSkillCodes', 'reviewTargetSkillCodes']) {
    if (!codeList(c[key])) fail();
    if (!subset(c[key], c.deliveredSkillCodes)) fail();
  }
  if (!Number.isInteger(c.itemsPerSkill) || c.itemsPerSkill < 1 || c.itemsPerSkill > 10) fail();
  if (!Number.isInteger(c.maximumReviewTargets) || c.maximumReviewTargets < 1) fail();
  if (typeof c.minimumPercent !== 'number' || !(c.minimumPercent > 0 && c.minimumPercent <= 100)) fail();
  if (!COMPARISONS.has(c.percentComparison)) fail();
  // The rounded whole-check comparison is only defined when every delivered skill is scored.
  if (c.percentComparison === 'rounded_overall_percent' && c.scoredSkillCodes.length !== c.deliveredSkillCodes.length) fail();
  if (!Number.isInteger(c.minimumCorrectPerScoredSkill) || c.minimumCorrectPerScoredSkill < 0
    || c.minimumCorrectPerScoredSkill > c.itemsPerSkill) fail();
  if (c.reporting !== null) {
    const r = c.reporting;
    if (!r || r.resultSchemaVersion !== RESULT_SCHEMA || !Array.isArray(r.groups) || !r.groups.length) fail();
    const members = [], keys = new Set();
    for (const g of r.groups) {
      if (!g || typeof g.key !== 'string' || !g.key || keys.has(g.key) || !text(g.label) || g.label.length > 200 || !codeList(g.skillCodes)) fail();
      // A group is either wholly scored or wholly outside the pass decision.
      const scored = g.skillCodes.filter(s => c.scoredSkillCodes.includes(s)).length;
      if (scored !== 0 && scored !== g.skillCodes.length) fail();
      keys.add(g.key); members.push(...g.skillCodes);
    }
    if (members.length !== c.deliveredSkillCodes.length || !subset(c.deliveredSkillCodes, members)) fail();
  }
  if (c.textsHy !== null) {
    if (!c.textsHy || typeof c.textsHy !== 'object' || !TEXT_KEYS.every(k => text(c.textsHy[k]))) fail();
  }
  return c;
}

// Deterministic JSON with sorted keys, used to compare a saved criteria object with
// its registry row independently of key order.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// A registry row as returned by the service read functions.
export function readRuleRow(row) {
  if (!row || typeof row !== 'object' || typeof row.ruleVersion !== 'string'
    || typeof row.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(row.fingerprint)) {
    throw new RuleError('legacy_mastery_rule_unavailable');
  }
  validateCriteria(row.criteria);
  if (row.criteria.ruleVersion !== row.ruleVersion) throw new RuleError('legacy_mastery_rule_unavailable');
  return { ruleVersion: row.ruleVersion, criteria: row.criteria, fingerprint: row.fingerprint };
}

// What a new check stores in its session metadata when it starts.
export function ruleSnapshot(row) {
  const r = readRuleRow(row);
  return { scoringRuleVersion: r.ruleVersion, scoringRuleCriteria: r.criteria, scoringRuleFingerprint: r.fingerprint };
}

// The version a session was (or is) scored by: its saved version, else the default.
export function savedRuleVersion(metadata, defaultVersion) {
  const saved = metadata?.scoringRuleVersion;
  if (saved === undefined || saved === null) return defaultVersion;
  if (typeof saved !== 'string' || !saved) throw new RuleError('legacy_mastery_rule_invalid');
  return saved;
}

// Returns the criteria a session must be scored by. `row` is the registry row for
// savedRuleVersion(metadata, default). A session that saved criteria must carry the
// registry's fingerprint and identical criteria; anything else is refused.
export function criteriaForSession(metadata, row) {
  const r = readRuleRow(row);
  const saved = metadata?.scoringRuleVersion;
  if (saved === undefined || saved === null) {
    if (metadata?.scoringRuleCriteria !== undefined || metadata?.scoringRuleFingerprint !== undefined) {
      throw new RuleError('legacy_mastery_rule_mismatch');
    }
    return r.criteria;
  }
  if (saved !== r.ruleVersion || metadata.scoringRuleFingerprint !== r.fingerprint
    || canonicalJson(metadata.scoringRuleCriteria) !== canonicalJson(r.criteria)) {
    throw new RuleError('legacy_mastery_rule_mismatch');
  }
  return validateCriteria(metadata.scoringRuleCriteria);
}

export function isReadinessSkill(criteria, code) {
  return criteria.readinessSkillCodes.includes(code);
}

// Skills that still block the first attempt under these criteria.
export function incompleteReadinessSkills(criteria, skills, isComplete) {
  return skills.filter(skill => isReadinessSkill(criteria, skill.code) && !isComplete(skill));
}

const percentOf = (correct, answered) => answered ? Math.round((correct / answered) * 100) : 0;

// skillResults: [{skillId, code, correct, total}] for the answered items of the check.
// overall: {correct, answered} from the session counters (the values the database checks).
export function evaluateMastery(criteria, skillResults, overall) {
  validateCriteria(criteria);
  const correct = Number(overall.correct), answered = Number(overall.answered);
  // The database stores and verifies this raw whole-check percentage for legacy checks.
  const rawPercent = percentOf(correct, answered);
  const scored = skillResults.filter(r => criteria.scoredSkillCodes.includes(r.code));
  const scoredCorrect = scored.reduce((n, r) => n + r.correct, 0);
  const scoredAnswered = scored.reduce((n, r) => n + r.total, 0);
  const meetsThreshold = criteria.percentComparison === 'rounded_overall_percent'
    ? rawPercent >= criteria.minimumPercent
    : scoredAnswered > 0 && (100 * scoredCorrect) / scoredAnswered >= criteria.minimumPercent;
  const everyScoredSkill = scored.length > 0 && scored.every(r => r.correct >= criteria.minimumCorrectPerScoredSkill);
  const passed = meetsThreshold && everyScoredSkill;

  const remediationTargets = skillResults
    .filter(r => criteria.reviewTargetSkillCodes.includes(r.code) && r.correct < r.total)
    .sort((a, b) => a.correct - b.correct || a.code.localeCompare(b.code))
    .slice(0, criteria.maximumReviewTargets);
  const failedSkillIds = passed ? [] : remediationTargets.map(r => r.skillId);

  let reporting = null;
  if (criteria.reporting) {
    const byCode = new Map(skillResults.map(r => [r.code, r]));
    const scoredIds = scored.map(r => r.skillId);
    reporting = {
      schemaVersion: RESULT_SCHEMA,
      scoringRuleVersion: criteria.ruleVersion,
      groups: criteria.reporting.groups.map(g => {
        const rows = g.skillCodes.map(code => byCode.get(code)).filter(Boolean);
        const c = rows.reduce((n, r) => n + r.correct, 0), a = rows.reduce((n, r) => n + r.total, 0);
        return {
          key: g.key, label: g.label, skillIds: rows.map(r => r.skillId),
          determinesPass: g.skillCodes.every(code => criteria.scoredSkillCodes.includes(code)),
          correct: c, answered: a, percent: a ? percentOf(c, a) : null,
        };
      }),
      overallScore: { correct, answered, percent: answered ? rawPercent : null },
      readinessSkillIds: skillResults.filter(r => isReadinessSkill(criteria, r.code)).map(r => r.skillId),
      scoredSkillIds: scoredIds,
      passed,
      score: { correct: scoredCorrect, answered: scoredAnswered, percent: percentOf(scoredCorrect, scoredAnswered) },
      passCriteria: {
        minimumPercent: criteria.minimumPercent,
        minimumCorrectBySkill: Object.fromEntries(scoredIds.map(id => [id, criteria.minimumCorrectPerScoredSkill])),
        scoredSkillIds: scoredIds,
      },
    };
  }
  return {
    passed, rawPercent,
    decidingScore: criteria.percentComparison === 'rounded_overall_percent'
      ? { correct, answered, percent: rawPercent }
      : { correct: scoredCorrect, answered: scoredAnswered, percent: percentOf(scoredCorrect, scoredAnswered) },
    failedSkillIds, reporting,
  };
}

// Public description of a rule for student pages. Wording is null when the
// registry row leaves today's page wording in place.
export function publicRule(criteria, { fingerprint } = {}) {
  validateCriteria(criteria);
  return {
    version: criteria.ruleVersion,
    ...(fingerprint ? { fingerprint } : {}),
    questions: criteria.deliveredSkillCodes.length * criteria.itemsPerSkill,
    scoredQuestions: criteria.scoredSkillCodes.length * criteria.itemsPerSkill,
    minimumPercent: criteria.minimumPercent,
    percentComparison: criteria.percentComparison,
    minimumCorrectPerScoredSkill: criteria.minimumCorrectPerScoredSkill,
    readinessSkillCodes: [...criteria.readinessSkillCodes],
    scoredSkillCodes: [...criteria.scoredSkillCodes],
    textsHy: criteria.textsHy ? { ...criteria.textsHy } : null,
  };
}

// Service reads (database registry). Errors become RuleError codes the handlers map
// to 503 (registry unavailable) or 409 (unknown/mismatched saved rule).
export async function loadActiveRule(admin, unitCode) {
  const { data, error } = await admin.rpc('service_legacy_mastery_active_rule', { p_unit_code: unitCode });
  if (error || !data) throw new RuleError('legacy_mastery_rule_unavailable');
  return readRuleRow(data);
}
export async function loadRuleVersion(admin, ruleVersion) {
  const { data, error } = await admin.rpc('service_legacy_mastery_rule_version', { p_rule_version: ruleVersion });
  if (error || !data) {
    throw new RuleError(String(error?.message ?? '').includes('legacy_mastery_rule_unknown') ? 'legacy_mastery_rule_unknown' : 'legacy_mastery_rule_unavailable');
  }
  return readRuleRow(data);
}
// The rule a session is scored by, verified against the registry.
export async function loadSessionCriteria(admin, metadata, defaultVersion) {
  const row = await loadRuleVersion(admin, savedRuleVersion(metadata, defaultVersion));
  return { criteria: criteriaForSession(metadata, row), fingerprint: row.fingerprint };
}
export const ruleErrorStatus = error => error?.code === 'legacy_mastery_rule_unavailable' ? 503 : 409;
