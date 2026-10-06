import { firstCompletedDiagnostic } from "./initial-diagnostic.ts";
import type { AuthorizedTeacherAcademicContext } from "./academic-context.ts";
import { evidenceContract, evidenceContractKey, estimateScopedEvidence } from "./analytics-evidence.mjs";

function requireRows(result: any): any[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

function chunks<T>(values: T[], size = 100): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

async function paged(factory: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = requireRows(await factory(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function fallbackName(id: string): string {
  return `Ուսանող ${id.slice(0, 6).toUpperCase()}`;
}

function latest<T>(rows: T[], getDate: (row: T) => unknown): T | null {
  return rows.reduce<T | null>((current, row) => {
    if (!current) return row;
    return Date.parse(String(getDate(row) ?? 0)) > Date.parse(String(getDate(current) ?? 0)) ? row : current;
  }, null);
}

function buildReviewSummary(studentSessions: any[], studentAttempts: any[], reviewRows: any[], maximumAttempts: number | null) {
  const reviewSessions = studentSessions.filter((row) => row.mode === "chapter_review");
  const reviewSessionIds = new Set(reviewSessions.map((row) => row.id));
  const completedRows = reviewRows.filter((row) => reviewSessionIds.has(row.learning_session_id) && row.status === "completed");
  const reviewAttempts = studentAttempts.filter((row) => reviewSessionIds.has(row.learning_session_id));
  const masterySessions = studentSessions
    .filter((row) => row.mode === "mastery_check" && row.status === "completed")
    .sort((a, b) => Date.parse(a.completed_at ?? a.started_at) - Date.parse(b.completed_at ?? b.started_at));
  const latestMastery = masterySessions.at(-1) ?? null;
  const latestMasteryAttempts = latestMastery
    ? studentAttempts.filter((row) => row.learning_session_id === latestMastery.id)
    : [];

  if (!completedRows.length && !masterySessions.length) return null;
  const qualifying = completedRows.filter((row) => row.qualifying === true);
  const latestMasteryTime = latestMastery ? Date.parse(latestMastery.completed_at ?? latestMastery.started_at) : 0;
  const qualifyingAfterLatestMastery = qualifying.some((row) =>
    Date.parse(row.completed_at ?? row.created_at) > latestMasteryTime);
  let lifecycleState = "evidence_in_progress";
  if (latestMastery?.assessment_result === "passed") lifecycleState = "mastery_passed";
  else if (latestMastery?.assessment_result === "failed" && maximumAttempts !== null && masterySessions.length >= maximumAttempts) lifecycleState = "mastery_failed_final";
  else if (latestMastery?.assessment_result === "failed" && maximumAttempts === null) lifecycleState = "lifecycle_unavailable";
  else if (latestMastery?.assessment_result === "failed") lifecycleState = qualifyingAfterLatestMastery
    ? `mastery_retry_${masterySessions.length + 1}_ready`
    : `review_required_attempt_${masterySessions.length + 1}`;

  const itemCounts = new Map<string, number>();
  for (const attempt of reviewAttempts) itemCounts.set(attempt.item_id, (itemCounts.get(attempt.item_id) ?? 0) + 1);
  const cycleNumbers = completedRows.map((row) => Number(row.review_cycle_number)).filter(Number.isFinite);
  const currentCycle = cycleNumbers.length ? Math.max(...cycleNumbers) : null;
  const currentCycleSessionIds = new Set(completedRows
    .filter((row) => currentCycle !== null && Number(row.review_cycle_number) === currentCycle)
    .map((row) => row.learning_session_id));
  const currentCycleAttempts = reviewAttempts.filter((row) => currentCycleSessionIds.has(row.learning_session_id));
  const currentCycleUniqueSeen = new Set(currentCycleAttempts.map((row) => row.item_id)).size;
  const currentCycleEligiblePoolSize = completedRows
    .filter((row) => currentCycle !== null && Number(row.review_cycle_number) === currentCycle)
    .reduce((max, row) => Math.max(max, Number(row.eligible_pool_size ?? 0)), 0) || null;

  const skills = new Map<string, any>();
  for (const attempt of reviewAttempts) {
    const row = skills.get(attempt.skill_id) ?? {
      skillId: attempt.skill_id, code: attempt.skillCode, nameHy: attempt.skillNameHy,
      reviewObservations: 0, independentObservations: 0, independentCorrect: 0,
      hintAssistedResponses: 0, repeatErrors: 0, recentIndependentObservations: 0,
      recentIndependentCorrect: 0, failedLatestMastery: false, lastSeenAt: null,
      attentionState: "observed_only",
    };
    row.reviewObservations += 1;
    if (attempt.hint_used) row.hintAssistedResponses += 1;
    else {
      row.independentObservations += 1;
      if (attempt.correct) row.independentCorrect += 1;
    }
    row.lastSeenAt = !row.lastSeenAt || Date.parse(attempt.created_at) > Date.parse(row.lastSeenAt)
      ? attempt.created_at : row.lastSeenAt;
    skills.set(attempt.skill_id, row);
  }
  const reviewAttemptsDescending = [...reviewAttempts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const row of skills.values()) {
    const recent = reviewAttemptsDescending.filter((attempt) => attempt.skill_id === row.skillId && !attempt.hint_used).slice(0, 5);
    row.recentIndependentObservations = recent.length;
    row.recentIndependentCorrect = recent.filter((attempt) => attempt.correct).length;
    const incorrectByItem = new Map<string, number>();
    for (const attempt of reviewAttempts.filter((attempt) => attempt.skill_id === row.skillId && !attempt.correct)) {
      incorrectByItem.set(attempt.item_id, (incorrectByItem.get(attempt.item_id) ?? 0) + 1);
    }
    row.repeatErrors = [...incorrectByItem.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    row.failedLatestMastery = latestMasteryAttempts.some((attempt) => attempt.skill_id === row.skillId && !attempt.correct);
  }

  const independent = reviewAttempts.filter((attempt) => !attempt.hint_used);
  const independentCorrect = independent.filter((attempt) => attempt.correct).length;
  return {
    masteryStatus: lifecycleState === "mastery_passed" ? "confirmed"
      : lifecycleState === "mastery_failed_final" ? "not_demonstrated" : "in_progress",
    lifecycleState,
    attemptsUsed: masterySessions.length,
    maximumAttempts,
    passedOnAttempt: latestMastery?.assessment_result === "passed" ? masterySessions.length : null,
    requiredReviewsCompleted: qualifying.length,
    optionalReviewsCompleted: completedRows.length - qualifying.length,
    totalReviewsCompleted: completedRows.length,
    lastReviewAt: latest(completedRows, (row) => row.completed_at ?? row.created_at)?.completed_at ?? null,
    currentCycle,
    currentCycleUniqueSeen,
    currentCycleEligiblePoolSize,
    currentCycleCoveragePercent: currentCycleEligiblePoolSize
      ? Math.round((currentCycleUniqueSeen / currentCycleEligiblePoolSize) * 10000) / 100 : null,
    lifetimeUniqueItemsSeen: itemCounts.size,
    totalItemExposures: reviewAttempts.length,
    exactRepeatCount: [...itemCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
    poolExhaustionEventCount: null,
    independentAccuracyPercent: independent.length
      ? Math.round((independentCorrect / independent.length) * 10000) / 100 : null,
    hintAssistedResponses: reviewAttempts.filter((attempt) => attempt.hint_used).length,
    attentionPolicyStatus: "thresholds_not_governed",
    history: completedRows.map((row) => ({
      id: row.id, context: row.review_context, qualifying: Boolean(row.qualifying), status: row.status,
      cycleNumber: row.review_cycle_number == null ? null : Number(row.review_cycle_number),
      sessionNumber: row.review_session_number == null ? null : Number(row.review_session_number),
      targetQuestions: Number(row.target_question_count), completedAt: row.completed_at, createdAt: row.created_at,
    })),
    skills: [...skills.values()].sort((a, b) => String(a.code).localeCompare(String(b.code))),
  };
}

export function buildExactInstitutionalStudentAnalytics(args: {
  student: any;
  context: AuthorizedTeacherAcademicContext;
  skills: any[];
  sessions: any[];
  attempts: any[];
  reviewSessions: any[];
}) {
  const { student, context, skills, sessions, attempts, reviewSessions } = args;
  const studentSessions = sessions
    .filter((row) => row.student_id === student.id && row.institutional_class_enrollment_id === student.enrollmentId)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
  const sessionIds = new Set(studentSessions.map((row) => row.id));
  const studentAttempts = attempts
    .filter((row) => row.student_id === student.id && sessionIds.has(row.learning_session_id) && (studentSessions.find(s => s.id === row.learning_session_id)?.status === "completed" || !["diagnostic", "mastery_check"].includes(studentSessions.find(s => s.id === row.learning_session_id)?.mode)))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const attemptsBySkill = new Map<string, any[]>();
  for (const attempt of studentAttempts) {
    const rows = attemptsBySkill.get(attempt.skill_id) ?? [];
    rows.push(attempt);
    attemptsBySkill.set(attempt.skill_id, rows);
  }
  const matrix = skills.map((skill) => {
    const rows = attemptsBySkill.get(skill.id) ?? [];
    const contracts = new Map<string, any[]>();
    for (const attempt of rows) {
      const key = evidenceContractKey(attempt.originalSession ?? {});
      contracts.set(key, [...(contracts.get(key) ?? []), attempt]);
    }
    const estimates = [...contracts.values()].map(group => ({
      ...estimateScopedEvidence(group, group[0].originalModel),
      evidenceCount: group.length, contract: evidenceContract(group[0].originalSession ?? {}),
    }));
    const single = estimates.length === 1 ? estimates[0] : null;
    const score = single?.score ?? null;
    const band = single?.band ?? 'not_assessed';
    return {
      skillId: skill.id, code: skill.code, nameHy: skill.nameHy, layer: skill.layer,
      score, percent: score === null ? null : Math.round(score * 100),
      evidenceCount: rows.length, status: single?.status ?? (rows.length ? "mixed_contracts" : "not_assessed"), band, estimates, scope: "class_contract_evidence",
      lastAttemptAt: rows.at(-1)?.created_at ?? null,
    };
  });
  const weak = matrix.filter((row) => row.band !== "secure").sort((a, b) => {
    const rank = (value: string) => value === "needs_support" ? 0 : value === "not_assessed" ? 1 : 2;
    return rank(a.band) - rank(b.band) || (a.percent ?? -1) - (b.percent ?? -1) || a.code.localeCompare(b.code);
  });
  const activeSession = studentSessions.find((row) => row.status === "active") ?? null;
  const latestDiagnostic = firstCompletedDiagnostic(studentSessions);
  const masterySessions = studentSessions.filter((row) => row.mode === "mastery_check" && row.status === "completed");
  const latestMastery = masterySessions[0] ?? null;
  const passedMastery = masterySessions.find((row) => row.assessment_result === "passed") ?? null;
  const policyIds = new Set(studentSessions.filter(row => row.mode === "mastery_check" && row.status === "completed").map(row => row.academic_mastery_policy_id));
  const maxima = studentSessions.filter(row => policyIds.has(row.academic_mastery_policy_id)).map(row => row.originalLifecyclePolicy?.maximum_mastery_attempts);
  const maximumAttempts = policyIds.size === 1 && maxima.length && maxima.every(value => Number.isInteger(value) && value === maxima[0]) ? maxima[0] : null;
  const review = buildReviewSummary(studentSessions, studentAttempts, reviewSessions, maximumAttempts);
  const attemptsDescending = [...studentAttempts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const recentAttempts = attemptsDescending.slice(0, 20);
  const recentCorrect = recentAttempts.filter((row) => row.correct === true).length;

  const knownWeak = weak.find(row => ["needs_support","developing"].includes(row.band));
  let intervention = { action: "monitor", skillId: null as string | null, code: null as string | null, messageHy: "Շարունակել վերահսկել առաջընթացը։" };
  if (activeSession) intervention = { action: "finish_active_session", skillId: null, code: null, messageHy: "Աշակերտն ունի չավարտված սեսիա. նախ ավարտել ընթացիկ աշխատանքը։" };
  else if (["review_required_attempt_2", "review_required_attempt_3"].includes(review?.lifecycleState)) intervention = { action: "required_chapter_review", skillId: null, code: null, messageHy: "Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։" };
  else if (["mastery_retry_2_ready", "mastery_retry_3_ready"].includes(review?.lifecycleState)) intervention = { action: "mastery_check_retry", skillId: null, code: null, messageHy: "Պահանջվող կրկնությունն ավարտված է. յուրացման ստուգման հաջորդ փորձը հասանելի է։" };
  else if (review?.lifecycleState === "mastery_failed_final") intervention = { action: "review_chapter", skillId: null, code: null, messageHy: "Յուրացման թույլատրված փորձերն ավարտված են. շարունակել Գլխի կրկնությունը։" };
  else if (review?.lifecycleState === "mastery_passed" || passedMastery) intervention = { action: "unit_complete", skillId: null, code: null, messageHy: "Գլուխն ավարտված է․ յուրացման ստուգումն անցած է։" };
  else if (!latestDiagnostic) intervention = { action: "take_diagnostic", skillId: null, code: null, messageHy: "Առաջին քայլ՝ անցնել ընտրված գլխի ախտորոշիչը։" };
  else if (knownWeak) intervention = { action: "practice_skill", skillId: knownWeak.skillId, code: knownWeak.code, messageHy: `Առաջարկվող միջամտություն՝ աշխատել ${knownWeak.code} հմտության վրա։` };
  else intervention = { action: "monitor", skillId: null, code: null, messageHy: "Համեմատեք ընտրված գլխի արդյունքները և ուսումնական ապացույցները։ Յուրացման ստուգման հասանելիությունը որոշվում է ուսումնական կանոններով։" };

  const sessionsByMode = Object.fromEntries(["diagnostic", "practice", "chapter_review", "mastery_check"].map((mode) => {
    const rows = studentSessions.filter((row) => row.mode === mode);
    const completed = rows.filter((row) => row.status === "completed");
    return [mode, { total: rows.length, completed: completed.length, latestAt: rows[0]?.completed_at ?? rows[0]?.started_at ?? null }];
  }));
  return {
    id: student.id, displayName: student.displayName?.trim() || fallbackName(student.id),
    institutionalClassEnrollmentId: student.enrollmentId,
    latestActivityAt: attemptsDescending[0]?.created_at ?? studentSessions[0]?.started_at ?? null,
    attempts: studentAttempts.length,
    recentAccuracy: new Set(recentAttempts.map(row => evidenceContractKey(row.originalSession ?? {}))).size === 1 && recentAttempts.length ? Math.round((recentCorrect / recentAttempts.length) * 100) : null,
    latestDiagnostic: latestDiagnostic ? {
      correct: Number(latestDiagnostic.correct_count), answered: Number(latestDiagnostic.answered_count),
      percent: Number(latestDiagnostic.answered_count)
        ? Math.round(Number(latestDiagnostic.correct_count) / Number(latestDiagnostic.answered_count) * 100) : 0,
      completedAt: latestDiagnostic.completed_at,
    } : null,
    masteryCheck: passedMastery ? { passed: true, percent: Number(passedMastery.score_percent ?? 0) } : null,
    latestMasteryCheck: latestMastery ? {
      result: latestMastery.assessment_result,
      percent: latestMastery.score_percent === null ? null : Number(latestMastery.score_percent),
      completedAt: latestMastery.completed_at,
    } : null,
    activeSession: activeSession ? { id:activeSession.id, mode:activeSession.mode, planned_item_count:activeSession.planned_item_count, answered_count:activeSession.answered_count, contract:evidenceContract(activeSession) } : null,
    chapterReview: review,
    weakSkills: weak.slice(0, 3).map((row) => ({ skillId: row.skillId, code: row.code, nameHy: row.nameHy, percent: row.percent, band: row.band })),
    intervention,
    recommendation: intervention,
    matrix,
    skills: matrix.map((row) => ({ id: row.skillId, code: row.code, nameHy: row.nameHy, layer: row.layer, percent: row.percent, evidenceCount: row.evidenceCount, status: row.status, band: row.band, lastAttemptAt: row.lastAttemptAt })),
    modeSummary: sessionsByMode,
    recentAttempts: recentAttempts.map((row) => ({
      id: row.id, skillId: row.skill_id, itemCode: row.frozenItem?.code ?? null,
      promptHy: row.frozenItem?.prompt_hy ?? null, contract: evidenceContract(row.originalSession ?? {}), correct: row.correct, score: Number(row.score),
      hintUsed: Boolean(row.hint_used), responseTimeMs: row.response_time_ms,
      errorCode: row.error_code, createdAt: row.created_at,
    })),
    sessions: studentSessions.slice(0, 20).map((row) => ({
      id: row.id, mode: row.mode, status: row.status, answered: Number(row.answered_count),
      planned: Number(row.planned_item_count), correct: row.status === "active" && ["diagnostic","mastery_check"].includes(row.mode) ? null : Number(row.correct_count), contract: evidenceContract(row),
      assessmentResult: row.assessment_result,
      scorePercent: row.status === "active" && ["diagnostic","mastery_check"].includes(row.mode) ? null : row.score_percent == null ? null : Number(row.score_percent),
      startedAt: row.started_at, completedAt: row.completed_at,
    })),
    academicContext: context,
    comparability: { status: "separate_original_contracts", estimateScope: "class_contract_evidence" },
  };
}

export async function loadExactInstitutionalClassAnalytics(
  admin: any,
  context: AuthorizedTeacherAcademicContext,
  students: any[],
) {
  const enrollmentIds = students.map((student) => student.enrollmentId);
  const studentIds = students.map((student) => student.id);
  // No enrollment means no attributable evidence. Avoid reloading the same
  // frozen question bank for every empty current or historical classroom.
  if (!studentIds.length) return { skills: [], students: [] };
  const blueprintRows = requireRows(await admin.from("assessment_blueprints").select("id").eq("curriculum_release_id", context.curriculumReleaseId).eq("unit_id", context.unitId));
  const blueprintItems: any[] = [], versions: any[] = [];
  for (const ids of chunks(blueprintRows.map(row => row.id))) blueprintItems.push(...await paged((from,to) => admin.from("assessment_blueprint_items").select("assessment_blueprint_id,item_id,item_version_snapshot").in("assessment_blueprint_id",ids).range(from,to)));
  for (const ids of chunks([...new Set(blueprintItems.map(row => row.item_id))])) versions.push(...await paged((from,to) => admin.from("item_versions").select("item_id,version_no,snapshot").in("item_id",ids).range(from,to)));
  const itemVersions = new Map(versions.map(row => [row.item_id+":"+row.version_no,row.snapshot?.item]));
  const frozenItems = new Map(blueprintItems.map(row => [row.assessment_blueprint_id+":"+row.item_id,itemVersions.get(row.item_id+":"+row.item_version_snapshot)]));
  const unitSkillIds = new Set([...frozenItems.values()].map(item => item?.skill_id).filter(Boolean));
  const skillRows = requireRows(await admin.from("curriculum_release_skills")
    .select("skill_id,skill_code_snapshot,name_hy_snapshot,layer_snapshot,sequence_order_snapshot")
    .eq("curriculum_release_id", context.curriculumReleaseId)
    .order("sequence_order_snapshot", { ascending: true }));
  const skills = skillRows.filter(row => unitSkillIds.has(row.skill_id)).map((row) => ({
    id: row.skill_id, code: row.skill_code_snapshot, nameHy: row.name_hy_snapshot,
    layer: row.layer_snapshot, sequenceOrder: Number(row.sequence_order_snapshot),
  }));
  if (!studentIds.length) return { skills, students: [] };

  const sessions = (await paged((from, to) => admin.from("learning_sessions")
    .select("id,student_id,unit_code,mode,status,target_skill_id,planned_item_count,answered_count,correct_count,assessment_result,score_percent,mastery_attempt_number,started_at,completed_at,institutional_class_enrollment_id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,curriculum_release_id,academic_context_status,governed_unit_id,assessment_blueprint_id,assessment_policy_binding_id,learning_model_configuration_id,academic_mastery_policy_id,runtime_build_id,provenance_status,model_provenance_status,runtime_provenance_status")
    .eq("academic_context_status", "exact")
    .eq("school_id", context.schoolId).eq("academic_year_id", context.academicYearId)
    .eq("class_id", context.classId).eq("teacher_assignment_id", context.assignmentId)
    .eq("subject_program_id", context.subjectProgramId)
    .eq("curriculum_release_id", context.curriculumReleaseId).eq("unit_code", context.unitCode)
    .in("institutional_class_enrollment_id", enrollmentIds).in("student_id", studentIds)
    .order("started_at", { ascending: false }).range(from, to))).filter(row => row.governed_unit_id === context.unitId || (row.governed_unit_id == null && blueprintRows.some(bp=>bp.id===row.assessment_blueprint_id)));
  const sessionIds = sessions.map((row) => row.id);
  const attempts: any[] = [];
  const reviewSessions: any[] = [];
  for (const ids of chunks(sessionIds)) {
    attempts.push(...await paged((from, to) => admin.from("attempts")
      .select("id,student_id,learning_session_id,item_id,skill_id,score,correct,hint_used,response_time_ms,error_code,created_at")
      .in("learning_session_id", ids).order("created_at", { ascending: true }).range(from, to)));
    reviewSessions.push(...await paged((from, to) => admin.from("chapter_review_sessions")
      .select("id,learning_session_id,review_context,qualifying,status,review_cycle_number,review_session_number,target_question_count,eligible_pool_size,completed_at,created_at")
      .in("learning_session_id", ids).order("created_at", { ascending: true }).range(from, to)));
  }
  const models: any[] = [], lifecyclePolicies: any[] = [];
  for (const ids of chunks([...new Set(sessions.map(row=>row.learning_model_configuration_id).filter(Boolean))])) models.push(...requireRows(await admin.from("learning_model_configurations").select("id,configuration").in("id",ids)));
  for (const ids of chunks([...new Set(sessions.map(row=>row.academic_mastery_policy_id).filter(Boolean))])) lifecyclePolicies.push(...requireRows(await admin.from("academic_mastery_policy_versions").select("id,maximum_mastery_attempts").in("id",ids)));
  const modelById = new Map(models.map(row=>[row.id,row]));
  const policyById = new Map(lifecyclePolicies.map(row=>[row.id,row]));
  for (const session of sessions) session.originalLifecyclePolicy = policyById.get(session.academic_mastery_policy_id);
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const enrichedAttempts = attempts.map((attempt) => ({
    ...attempt,
    originalSession: sessionById.get(attempt.learning_session_id),
    originalModel: modelById.get(sessionById.get(attempt.learning_session_id)?.learning_model_configuration_id),
    frozenItem: frozenItems.get(sessionById.get(attempt.learning_session_id)?.assessment_blueprint_id+":"+attempt.item_id),
    sessionMode: sessionById.get(attempt.learning_session_id)?.mode ?? null,
    skillCode: skillById.get(attempt.skill_id)?.code ?? "",
    skillNameHy: skillById.get(attempt.skill_id)?.nameHy ?? "",
  }));
  const finalEnrollments:any[]=[], finalProfiles:any[]=[], finalMemberships:any[]=[];
  for(const ids of chunks(enrollmentIds)) finalEnrollments.push(...requireRows(await admin.from("institutional_class_enrollments").select("id,student_id,student_membership_id,status,valid_from,valid_to").in("id",ids).eq("school_id",context.schoolId).eq("academic_year_id",context.academicYearId).eq("class_id",context.classId).eq("teacher_assignment_id",context.assignmentId).eq("subject_program_id",context.subjectProgramId)));
  for(const ids of chunks(studentIds)) finalProfiles.push(...requireRows(await admin.from("profiles").select("id,role,account_status").in("id",ids)));
  for(const ids of chunks(finalEnrollments.map(row=>row.student_membership_id))) finalMemberships.push(...requireRows(await admin.from("institutional_memberships").select("id,person_id,school_id,role,status,valid_from,valid_to").in("id",ids)));
  const validAt=(row:any) => row && ["active",...(context.readOnlyHistory?["ended"]:[])].includes(row.status) && Date.parse(row.valid_from)<=Date.now() && (context.readOnlyHistory || !row.valid_to || Date.parse(row.valid_to)>Date.now());
  const authorizedStudents=students.filter(student=>{
    const e=finalEnrollments.find(row=>row.id===student.enrollmentId&&row.student_id===student.id);
    const p=finalProfiles.find(row=>row.id===student.id);
    const m=finalMemberships.find(row=>row.id===e?.student_membership_id&&row.person_id===student.id&&row.school_id===context.schoolId&&row.role==="student");
    return validAt(e)&&validAt(m)&&p?.role==="student"&&p.account_status==="active";
  });
  return {
    skills,
    students: authorizedStudents.map((student) => buildExactInstitutionalStudentAnalytics({
      student, context, skills, sessions, attempts: enrichedAttempts.filter(row => row.frozenItem?.skill_id === row.skill_id), reviewSessions,
    })),
  };
}
