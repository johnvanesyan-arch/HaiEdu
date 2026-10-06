// Registered linear-beta evidence adapter, matching the runtime contract.
// Estimates are scoped to the supplied class evidence, never learner-wide readiness.
export function evidenceContract(session) {
  return {
    mode: session.mode ?? null,
    releaseId: session.curriculum_release_id ?? null,
    unitId: session.governed_unit_id ?? null,
    blueprintId: session.assessment_blueprint_id ?? null,
    policyBindingId: session.assessment_policy_binding_id ?? null,
    modelId: session.learning_model_configuration_id ?? null,
    academicPolicyId: session.academic_mastery_policy_id ?? null,
    runtimeBuildId: session.runtime_build_id ?? null,
    provenanceStatus: session.provenance_status ?? 'unrecorded',
    modelProvenanceStatus: session.model_provenance_status ?? 'unrecorded',
    runtimeProvenanceStatus: session.runtime_provenance_status ?? 'unrecorded',
  };
}
export const evidenceContractKey = session => JSON.stringify(evidenceContract(session));
export function estimateScopedEvidence(rows, model) {
  const m = model?.configuration?.mastery;
  const numbers = ['priorAlpha','priorBeta','minimumEvidenceCount','needsSupportBelow','secureAtOrAbove','hintedPositiveMultiplier'];
  const formula = /^([0-9]+[.]?[0-9]*) [+] ([0-9]+[.]?[0-9]*)[*]difficulty$/.exec(m?.difficultyWeight?.formula ?? '');
  if (!m || !formula || numbers.some(k => typeof m[k] !== 'number' || !Number.isFinite(m[k])) ||
      m.priorAlpha <= 0 || m.priorBeta <= 0 || m.minimumEvidenceCount < 1 ||
      m.needsSupportBelow < 0 || m.secureAtOrAbove > 1 || m.needsSupportBelow >= m.secureAtOrAbove ||
      m.hintedPositiveMultiplier <= 0 || m.hintedPositiveMultiplier > 1 || m.incorrectEvidenceHintReduction !== false ||
      !Number.isFinite(m.difficultyWeight.difficultyMin) || !Number.isFinite(m.difficultyWeight.difficultyMax) ||
      m.difficultyWeight.difficultyMin < 1 || m.difficultyWeight.difficultyMin > m.difficultyWeight.difficultyMax ||
      Number(formula[1]) + Number(formula[2]) <= 0 || rows.some(r => !Number.isFinite(r.frozenItem?.difficulty) || !Number.isFinite(Number(r.score)))) {
    return { score:null, percent:null, status:'provenance_unavailable', band:'not_assessed', scope:'class_contract_evidence', modelId:model?.id ?? null };
  }
  let alpha=m.priorAlpha,beta=m.priorBeta;
  for (const row of rows) {
    const difficulty = Math.max(m.difficultyWeight.difficultyMin, Math.min(m.difficultyWeight.difficultyMax,row.frozenItem.difficulty));
    const weight = Number(formula[1]) + Number(formula[2])*difficulty;
    const score = Math.max(0,Math.min(1,Number(row.score)));
    alpha += score*weight*(row.hint_used && score>0 ? m.hintedPositiveMultiplier : 1);
    beta += (1-score)*weight;
  }
  const score=alpha/(alpha+beta);
  const status=rows.length < m.minimumEvidenceCount ? 'insufficient_evidence' : score<m.needsSupportBelow ? 'needs_support' : score<m.secureAtOrAbove ? 'developing' : 'secure';
  return {score,percent:Math.round(score*100),status,band:status==='insufficient_evidence'?'not_assessed':status,scope:'class_contract_evidence',modelId:model.id};
}
