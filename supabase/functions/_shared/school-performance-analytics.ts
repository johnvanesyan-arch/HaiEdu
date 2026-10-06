import { evidenceContract, evidenceContractKey } from "./analytics-evidence.mjs";
export type SchoolAnalyticsEnrollment = {
  id: string;
  student_id: string;
  school_id?: string; academic_year_id?: string; class_id?: string; teacher_assignment_id?: string; subject_program_id?: string;
};

export type SchoolAnalyticsSession = {
  id: string;
  institutional_class_enrollment_id: string | null;
  student_id: string;
  curriculum_release_id: string | null;
  unit_code: string | null;
  mode: string;
  status: string;
  answered_count: number | null;
  correct_count: number | null;
  assessment_result: string | null;
  academic_context_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  governed_unit_id?: string; assessment_blueprint_id?: string; assessment_policy_binding_id?: string; learning_model_configuration_id?: string; academic_mastery_policy_id?: string; runtime_build_id?: string; provenance_status?: string; model_provenance_status?: string; runtime_provenance_status?: string;
  school_id?: string; academic_year_id?: string; class_id?: string; teacher_assignment_id?: string; subject_program_id?: string;
};

export type SchoolAnalyticsReviewSession = {
  id: string;
  learning_session_id: string;
  status: string;
  qualifying: boolean | null;
};

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

function latestIso(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (!value || Number.isNaN(Date.parse(value))) continue;
    if (!latest || Date.parse(value) > Date.parse(latest)) latest = value;
  }
  return latest;
}

function masteryContextKey(session: SchoolAnalyticsSession): string | null {
  if (!session.institutional_class_enrollment_id || !session.curriculum_release_id || !session.unit_code) return null;
  return [session.institutional_class_enrollment_id, session.curriculum_release_id, session.unit_code].join(":");
}

export function aggregateSchoolPerformanceAnalytics(args: {
  enrollments: SchoolAnalyticsEnrollment[];
  sessions: SchoolAnalyticsSession[];
  reviewSessions: SchoolAnalyticsReviewSession[];
}) {
  const enrollments = uniqueById(args.enrollments ?? []);
  const enrollmentById = new Map(enrollments.map((row) => [row.id,row]));
  const enrolledStudentIds = new Set(enrollments.map((row) => row.student_id));
  const sessions = uniqueById(args.sessions ?? []).filter((row) =>
    row.academic_context_status === "exact"
    && Boolean(row.institutional_class_enrollment_id)
    && enrollmentById.get(String(row.institutional_class_enrollment_id))?.student_id === row.student_id
    && ["school_id","academic_year_id","class_id","teacher_assignment_id","subject_program_id"].every(key => {
      const enrollment = enrollmentById.get(String(row.institutional_class_enrollment_id)) as any;
      return enrollment?.[key] == null || enrollment[key] === (row as any)[key];
    }));
  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const completed = sessions.filter((row) => row.status === "completed");
  const participatingStudents = new Set(sessions.map((row) => row.student_id));

  const completedDiagnostics = completed.filter((row) => row.mode === "diagnostic");
  const diagnosedEnrollmentIds = new Set(completedDiagnostics
    .map((row) => row.institutional_class_enrollment_id)
    .filter((value): value is string => Boolean(value)));
  const contractGroups = new Map<string, any>();
  for (const session of completed) {
    const key = evidenceContractKey(session);
    const group = contractGroups.get(key) ?? { contract: evidenceContract(session), mode: session.mode, sessions: 0, answered: 0, correct: 0, masteryPassed: 0 };
    group.sessions++; group.answered += Number(session.answered_count ?? 0); group.correct += Number(session.correct_count ?? 0);
    if (session.assessment_result === "passed") group.masteryPassed++;
    contractGroups.set(key,group);
  }
  const comparableDiagnostics = new Set(completedDiagnostics.map(row => evidenceContractKey(row))).size === 1
    && completedDiagnostics.every(row => row.assessment_blueprint_id && row.learning_model_configuration_id);
  const diagnosticAnswered = completedDiagnostics.reduce((sum, row) => sum + Number(row.answered_count ?? 0), 0);
  const diagnosticCorrect = completedDiagnostics.reduce((sum, row) => sum + Number(row.correct_count ?? 0), 0);

  const completedMastery = completed.filter((row) => row.mode === "mastery_check");
  const attemptedMasteryContexts = new Set<string>();
  const passedMasteryContexts = new Set<string>();
  for (const session of completedMastery) {
    const key = masteryContextKey(session);
    if (!key) continue;
    attemptedMasteryContexts.add(key);
    if (session.assessment_result === "passed") passedMasteryContexts.add(key);
  }

  const reviews = uniqueById(args.reviewSessions ?? []).filter((row) =>
    row.status === "completed" && sessionById.get(row.learning_session_id)?.mode === "chapter_review");
  const reviewStudentIds = new Set(reviews
    .map((row) => sessionById.get(row.learning_session_id)?.student_id)
    .filter((value): value is string => Boolean(value)));
  const qualifyingReviews = reviews.filter((row) => row.qualifying === true);

  return {
    enrollment: {
      students: enrolledStudentIds.size,
      contexts: enrollments.length,
    },
    participation: {
      students: participatingStudents.size,
      rate: percent(participatingStudents.size, enrolledStudentIds.size),
    },
    diagnostic: {
      completedContexts: diagnosedEnrollmentIds.size,
      eligibleContexts: enrollments.length,
      completionRate: percent(diagnosedEnrollmentIds.size, enrollments.length),
      averageAccuracy: comparableDiagnostics ? percent(diagnosticCorrect, diagnosticAnswered) : null,
      comparability: comparableDiagnostics ? "same_original_contract" : "separate_original_contracts",
      answeredQuestions: diagnosticAnswered,
    },
    mastery: {
      attemptedContexts: attemptedMasteryContexts.size,
      passedContexts: passedMasteryContexts.size,
      passRate: percent(passedMasteryContexts.size, attemptedMasteryContexts.size),
    },
    chapterReview: {
      completedSessions: reviews.length,
      qualifyingSessions: qualifyingReviews.length,
      students: reviewStudentIds.size,
    },
    evidenceGroups: [...contractGroups.values()].map(group => ({...group, accuracy: group.contract.blueprintId && group.contract.modelId ? percent(group.correct,group.answered) : null})),
    comparability: "separate_original_contracts",
    evidence: {
      exactSessions: sessions.length,
      completedSessions: completed.length,
      lastActivityAt: latestIso(sessions.map((row) => row.completed_at || row.started_at)),
    },
  };
}
