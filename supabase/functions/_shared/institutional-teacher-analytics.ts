import type { AuthorizedTeacherAcademicContext } from "./academic-context.ts";
import { initialMasteryState, updateMastery } from "./mastery.ts";

const MASTERY_THRESHOLD = 0.72;

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

function buildReviewSummary(studentSessions: any[], studentAttempts: any[], reviewRows: any[]) {
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
  else if (latestMastery?.assessment_result === "failed" && masterySessions.length >= 3) lifecycleState = "mastery_failed_final";
  else if (latestMastery?.assessment_result === "failed") lifecycleState = qualifyingAfterLatestMastery
    ? `mastery_retry_${Math.min(masterySessions.length + 1, 3)}_ready`
    : `review_required_attempt_${Math.min(masterySessions.length + 1, 3)}`;

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
    maximumAttempts: 3,
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
    .filter((row) => row.student_id === student.id)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
  const sessionIds = new Set(studentSessions.map((row) => row.id));
  const studentAttempts = attempts
    .filter((row) => row.student_id === student.id && sessionIds.has(row.learning_session_id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const attemptsBySkill = new Map<string, any[]>();
  for (const attempt of studentAttempts) {
    const rows = attemptsBySkill.get(attempt.skill_id) ?? [];
    rows.push(attempt);
    attemptsBySkill.set(attempt.skill_id, rows);
  }
  const matrix = skills.map((skill) => {
    const rows = attemptsBySkill.get(skill.id) ?? [];
    let state = initialMasteryState();
    for (const attempt of rows) state = updateMastery(state, {
      score: Number(attempt.score), difficulty: Number(attempt.items?.difficulty ?? 1),
      hintUsed: Boolean(attempt.hint_used),
    });
    const score = rows.length ? state.masteryScore : null;
    const band = score === null ? "not_assessed"
      : score >= MASTERY_THRESHOLD ? "secure" : score < 0.45 ? "needs_support" : "developing";
    return {
      skillId: skill.id, code: skill.code, nameHy: skill.nameHy, layer: skill.layer,
      score, percent: score === null ? null : Math.round(score * 100),
      evidenceCount: rows.length, status: rows.length ? state.status : "not_assessed", band,
      lastAttemptAt: rows.at(-1)?.created_at ?? null,
    };
  });
  const weak = matrix.filter((row) => row.band !== "secure").sort((a, b) => {
    const rank = (value: string) => value === "needs_support" ? 0 : value === "not_assessed" ? 1 : 2;
    return rank(a.band) - rank(b.band) || (a.percent ?? -1) - (b.percent ?? -1) || a.code.localeCompare(b.code);
  });
  const activeSession = studentSessions.find((row) => row.status === "active") ?? null;
  const latestDiagnostic = studentSessions.find((row) => row.mode === "diagnostic" && row.status === "completed") ?? null;
  const masterySessions = studentSessions.filter((row) => row.mode === "mastery_check" && row.status === "completed");
  const latestMastery = masterySessions[0] ?? null;
  const passedMastery = masterySessions.find((row) => row.assessment_result === "passed") ?? null;
  const review = buildReviewSummary(studentSessions, studentAttempts, reviewSessions);
  const attemptsDescending = [...studentAttempts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const recentAttempts = attemptsDescending.slice(0, 20);
  const recentCorrect = recentAttempts.filter((row) => row.correct === true).length;

  let intervention = { action: "monitor", skillId: null as string | null, code: null as string | null, messageHy: "Շարունակել վերահսկել առաջընթացը։" };
  if (activeSession) intervention = { action: "finish_active_session", skillId: null, code: null, messageHy: "Աշակերտն ունի չավարտված սեսիա. նախ ավարտել ընթացիկ աշխատանքը։" };
  else if (["review_required_attempt_2", "review_required_attempt_3"].includes(review?.lifecycleState)) intervention = { action: "required_chapter_review", skillId: null, code: null, messageHy: "Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։" };
  else if (["mastery_retry_2_ready", "mastery_retry_3_ready"].includes(review?.lifecycleState)) intervention = { action: "mastery_check_retry", skillId: null, code: null, messageHy: "Պահանջվող կրկնությունն ավարտված է. յուրացման ստուգման հաջորդ փորձը հասանելի է։" };
  else if (review?.lifecycleState === "mastery_failed_final") intervention = { action: "review_chapter", skillId: null, code: null, messageHy: "Յուրացման երեք փորձերն ավարտված են. շարունակել Գլխի կրկնությունը։" };
  else if (review?.lifecycleState === "mastery_passed" || passedMastery) intervention = { action: "unit_complete", skillId: null, code: null, messageHy: "Գլուխն ավարտված է․ յուրացման ստուգումն անցած է։" };
  else if (!studentAttempts.length) intervention = { action: "take_diagnostic", skillId: null, code: null, messageHy: "Առաջին քայլ՝ անցնել ընտրված գլխի ախտորոշիչը։" };
  else if (weak.length) intervention = { action: "practice_skill", skillId: weak[0].skillId, code: weak[0].code, messageHy: `Առաջարկվող միջամտություն՝ աշխատել ${weak[0].code} հմտության վրա։` };
  else intervention = { action: "mastery_check", skillId: null, code: null, messageHy: "Հմտությունները կայուն են․ աշակերտը պատրաստ է յուրացման ստուգմանը։" };

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
    recentAccuracy: recentAttempts.length ? Math.round((recentCorrect / recentAttempts.length) * 100) : null,
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
    activeSession,
    chapterReview: review,
    weakSkills: weak.slice(0, 3).map((row) => ({ skillId: row.skillId, code: row.code, nameHy: row.nameHy, percent: row.percent, band: row.band })),
    intervention,
    recommendation: intervention,
    matrix,
    skills: matrix.map((row) => ({ id: row.skillId, code: row.code, nameHy: row.nameHy, layer: row.layer, percent: row.percent, evidenceCount: row.evidenceCount, status: row.status, band: row.band, lastAttemptAt: row.lastAttemptAt })),
    modeSummary: sessionsByMode,
    recentAttempts: recentAttempts.map((row) => ({
      id: row.id, skillId: row.skill_id, itemCode: row.items?.code ?? null,
      promptHy: row.items?.prompt_hy ?? null, correct: row.correct, score: Number(row.score),
      hintUsed: Boolean(row.hint_used), responseTimeMs: row.response_time_ms,
      errorCode: row.error_code, createdAt: row.created_at,
    })),
    sessions: studentSessions.slice(0, 20).map((row) => ({
      id: row.id, mode: row.mode, status: row.status, answered: Number(row.answered_count),
      planned: Number(row.planned_item_count), correct: Number(row.correct_count),
      assessmentResult: row.assessment_result,
      scorePercent: row.score_percent === null ? null : Number(row.score_percent),
      startedAt: row.started_at, completedAt: row.completed_at,
    })),
    academicContext: context,
  };
}

export async function loadExactInstitutionalClassAnalytics(
  admin: any,
  context: AuthorizedTeacherAcademicContext,
  students: any[],
) {
  const enrollmentIds = students.map((student) => student.enrollmentId);
  const studentIds = students.map((student) => student.id);
  const skillRows = requireRows(await admin.from("curriculum_release_skills")
    .select("skill_id,skill_code_snapshot,name_hy_snapshot,layer_snapshot,sequence_order_snapshot")
    .eq("curriculum_release_id", context.curriculumReleaseId)
    .order("sequence_order_snapshot", { ascending: true }));
  const skills = skillRows.map((row) => ({
    id: row.skill_id, code: row.skill_code_snapshot, nameHy: row.name_hy_snapshot,
    layer: row.layer_snapshot, sequenceOrder: Number(row.sequence_order_snapshot),
  }));
  if (!studentIds.length) return { skills, students: [] };

  const sessions = await paged((from, to) => admin.from("learning_sessions")
    .select("id,student_id,unit_code,mode,status,target_skill_id,planned_item_count,answered_count,correct_count,assessment_result,score_percent,mastery_attempt_number,started_at,completed_at,institutional_class_enrollment_id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,curriculum_release_id,academic_context_status")
    .eq("academic_context_status", "exact")
    .eq("school_id", context.schoolId).eq("academic_year_id", context.academicYearId)
    .eq("class_id", context.classId).eq("teacher_assignment_id", context.assignmentId)
    .eq("subject_program_id", context.subjectProgramId)
    .eq("curriculum_release_id", context.curriculumReleaseId).eq("unit_code", context.unitCode)
    .in("institutional_class_enrollment_id", enrollmentIds).in("student_id", studentIds)
    .order("started_at", { ascending: false }).range(from, to));
  const sessionIds = sessions.map((row) => row.id);
  const attempts: any[] = [];
  const reviewSessions: any[] = [];
  for (const ids of chunks(sessionIds)) {
    attempts.push(...await paged((from, to) => admin.from("attempts")
      .select("id,student_id,learning_session_id,item_id,skill_id,score,correct,hint_used,response_time_ms,error_code,created_at,items(code,prompt_hy,difficulty)")
      .in("learning_session_id", ids).order("created_at", { ascending: true }).range(from, to)));
    reviewSessions.push(...await paged((from, to) => admin.from("chapter_review_sessions")
      .select("id,learning_session_id,review_context,qualifying,status,review_cycle_number,review_session_number,target_question_count,eligible_pool_size,completed_at,created_at")
      .in("learning_session_id", ids).order("created_at", { ascending: true }).range(from, to)));
  }
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const enrichedAttempts = attempts.map((attempt) => ({
    ...attempt,
    sessionMode: sessionById.get(attempt.learning_session_id)?.mode ?? null,
    skillCode: skillById.get(attempt.skill_id)?.code ?? "",
    skillNameHy: skillById.get(attempt.skill_id)?.nameHy ?? "",
  }));
  return {
    skills,
    students: students.map((student) => buildExactInstitutionalStudentAnalytics({
      student, context, skills, sessions, attempts: enrichedAttempts, reviewSessions,
    })),
  };
}
