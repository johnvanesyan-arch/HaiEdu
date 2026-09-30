export type SchoolAnalyticsEnrollment = {
  id: string;
  student_id: string;
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
  const enrollmentIds = new Set(enrollments.map((row) => row.id));
  const enrolledStudentIds = new Set(enrollments.map((row) => row.student_id));
  const sessions = uniqueById(args.sessions ?? []).filter((row) =>
    row.academic_context_status === "exact"
    && Boolean(row.institutional_class_enrollment_id)
    && enrollmentIds.has(String(row.institutional_class_enrollment_id))
    && enrolledStudentIds.has(row.student_id));
  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const completed = sessions.filter((row) => row.status === "completed");
  const participatingStudents = new Set(sessions.map((row) => row.student_id));

  const completedDiagnostics = completed.filter((row) => row.mode === "diagnostic");
  const diagnosedEnrollmentIds = new Set(completedDiagnostics
    .map((row) => row.institutional_class_enrollment_id)
    .filter((value): value is string => Boolean(value)));
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
      averageAccuracy: percent(diagnosticCorrect, diagnosticAnswered),
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
    evidence: {
      exactSessions: sessions.length,
      completedSessions: completed.length,
      lastActivityAt: latestIso(sessions.map((row) => row.completed_at || row.started_at)),
    },
  };
}
