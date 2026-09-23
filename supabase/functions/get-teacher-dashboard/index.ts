import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { resolveActiveCurriculumRelease } from "../_shared/curriculum-release.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UNIT_CODE = "PHY7-U01";
const MASTERY_THRESHOLD = 0.72;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function fallbackName(id: string) {
  return `Ուսանող ${id.slice(0, 6).toUpperCase()}`;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
    const teacherId = userData.user.id;

    const { data: teacherProfile } = await admin.from("profiles").select("id, role, display_name").eq("id", teacherId).maybeSingle();
    if (!teacherProfile || teacherProfile.role !== "teacher") {
      return json({ error: "teacher_role_required" }, 403);
    }

    const { data: classes, error: classesError } = await admin
      .from("classes")
      .select("id, name, academic_year, join_code, is_active, subject_id, grade_id, created_at")
      .eq("teacher_id", teacherId)
      .is("school_id", null)
      .order("created_at", { ascending: true });
    if (classesError) return json({ error: "classes_query_failed" }, 500);

    const { data: skills, error: skillsError } = await admin
      .from("skills")
      .select("id, code, name_hy, sequence_order")
      .like("code", "PHY7-U01-S%")
      .order("sequence_order", { ascending: true });
    if (skillsError) return json({ error: "skills_query_failed" }, 500);
    const skillRows = skills ?? [];
    const skillIds = skillRows.map((s) => s.id);
    let curriculumReleaseId: string;
    try {
      curriculumReleaseId = await resolveActiveCurriculumRelease(admin, UNIT_CODE);
    } catch {
      return json({ error: "curriculum_release_unavailable" }, 503);
    }

    const classIds = (classes ?? []).map((c) => c.id);
    const { data: memberships } = classIds.length
      ? await admin.from("class_memberships").select("class_id, student_id, joined_at").in("class_id", classIds)
      : { data: [] as any[] };
    const memberRows = memberships ?? [];
    const studentIds = [...new Set(memberRows.map((m) => m.student_id))];

    const [profilesResult, masteryResult, attemptsResult, sessionsResult, reviewSummaryResult, reviewSkillsResult, reviewCoverageResult] = await Promise.all([
      studentIds.length
        ? admin.from("profiles").select("id, display_name, created_at").in("id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length && skillIds.length
        ? admin.from("student_skill_mastery").select("student_id, skill_id, mastery_score, evidence_count, status, last_attempt_at").in("student_id", studentIds).in("skill_id", skillIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? admin.from("attempts").select("student_id, skill_id, item_id, correct, hint_used, created_at").in("student_id", studentIds).order("created_at", { ascending: false }).limit(2000)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? admin.from("learning_sessions").select("id, student_id, mode, status, target_skill_id, answered_count, planned_item_count, correct_count, assessment_result, score_percent, started_at, completed_at").in("student_id", studentIds).eq("unit_code", UNIT_CODE).order("started_at", { ascending: false }).limit(1000)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? admin.from("chapter_review_summary_v").select("*").eq("curriculum_release_id", curriculumReleaseId).eq("unit_code", UNIT_CODE).in("student_id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? admin.from("chapter_review_skill_attention_inputs_v").select("*").eq("curriculum_release_id", curriculumReleaseId).eq("unit_code", UNIT_CODE).in("student_id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? admin.from("chapter_review_coverage_v").select("*").eq("curriculum_release_id", curriculumReleaseId).eq("unit_code", UNIT_CODE).in("student_id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    if ((reviewSummaryResult as any).error || (reviewSkillsResult as any).error || (reviewCoverageResult as any).error) {
      return json({ error: "chapter_review_analytics_unavailable" }, 503);
    }

    const profileMap = new Map((profilesResult.data ?? []).map((p: any) => [p.id, p]));
    const masteryRows = masteryResult.data ?? [];
    const attemptRows = attemptsResult.data ?? [];
    const sessionRows = sessionsResult.data ?? [];
    const reviewSummaryByStudent = new Map((reviewSummaryResult.data ?? []).map((row: any) => [row.student_id, row]));
    const reviewCoverageByStudent = new Map((reviewCoverageResult.data ?? []).map((row: any) => [row.student_id, row]));
    const reviewSkillsByStudent = new Map<string, any[]>();
    for (const row of reviewSkillsResult.data ?? []) {
      const rows = reviewSkillsByStudent.get(row.student_id) ?? [];
      rows.push(row);
      reviewSkillsByStudent.set(row.student_id, rows);
    }

    const studentSummaries = studentIds.map((studentId) => {
      const profile: any = profileMap.get(studentId);
      const studentMastery = masteryRows.filter((m: any) => m.student_id === studentId);
      const masteryMap = new Map(studentMastery.map((m: any) => [m.skill_id, m]));
      const studentAttempts = attemptRows.filter((a: any) => a.student_id === studentId);
      const studentSessions = sessionRows.filter((s: any) => s.student_id === studentId);
      const recentAttempts = studentAttempts.slice(0, 20);
      const recentCorrect = recentAttempts.filter((a: any) => a.correct === true).length;
      const activeSession = studentSessions.find((s: any) => s.status === "active") ?? null;
      const passedMastery = studentSessions.find((s: any) => s.mode === "mastery_check" && s.status === "completed" && s.assessment_result === "passed") ?? null;
      const latestDiagnostic = studentSessions.find((s: any) => s.mode === "diagnostic" && s.status === "completed") ?? null;
      const review: any = reviewSummaryByStudent.get(studentId) ?? null;
      const coverage: any = reviewCoverageByStudent.get(studentId) ?? null;
      const reviewSkills = (reviewSkillsByStudent.get(studentId) ?? []).sort((a, b) => a.skill_code.localeCompare(b.skill_code));

      const matrix = skillRows.map((skill) => {
        const row: any = masteryMap.get(skill.id);
        const score = row ? Number(row.mastery_score) : null;
        let band = "not_assessed";
        if (score !== null) band = score >= MASTERY_THRESHOLD ? "secure" : score < 0.45 ? "needs_support" : "developing";
        return {
          skillId: skill.id,
          code: skill.code,
          nameHy: skill.name_hy,
          score,
          percent: score === null ? null : Math.round(score * 100),
          evidenceCount: row ? Number(row.evidence_count) : 0,
          status: row?.status ?? "not_assessed",
          band,
          lastAttemptAt: row?.last_attempt_at ?? null,
        };
      });

      const weak = matrix
        .filter((m) => m.band === "needs_support" || m.band === "developing" || m.band === "not_assessed")
        .sort((a, b) => {
          const rank = (v: string) => v === "needs_support" ? 0 : v === "not_assessed" ? 1 : 2;
          return rank(a.band) - rank(b.band) || (a.percent ?? -1) - (b.percent ?? -1) || a.code.localeCompare(b.code);
        });

      let intervention = { action: "monitor", skillId: null as string | null, code: null as string | null, messageHy: "Շարունակել վերահսկել առաջընթացը։" };
      if (activeSession) {
        const target = skillRows.find((s) => s.id === activeSession.target_skill_id);
        intervention = { action: "finish_active_session", skillId: target?.id ?? null, code: target?.code ?? null, messageHy: "Աշակերտն ունի չավարտված սեսիա. նախ ավարտել ընթացիկ աշխատանքը։" };
      } else if (review?.lifecycle_state === "review_required_attempt_2" || review?.lifecycle_state === "review_required_attempt_3") {
        intervention = { action: "required_chapter_review", skillId: null, code: null, messageHy: "Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։" };
      } else if (review?.lifecycle_state === "mastery_retry_2_ready" || review?.lifecycle_state === "mastery_retry_3_ready") {
        intervention = { action: "mastery_check_retry", skillId: null, code: null, messageHy: "Պահանջվող կրկնությունն ավարտված է. յուրացման ստուգման հաջորդ փորձը հասանելի է։" };
      } else if (review?.lifecycle_state === "mastery_failed_final") {
        intervention = { action: "review_chapter", skillId: null, code: null, messageHy: "Յուրացման երեք փորձերն ավարտված են. շարունակել Գլխի կրկնությունը։" };
      } else if (review?.lifecycle_state === "mastery_passed" || passedMastery) {
        intervention = { action: "unit_complete", skillId: null, code: null, messageHy: "Բաժին I-ը ավարտված է. mastery check-ը անցած է։" };
      } else if (!studentAttempts.length) {
        intervention = { action: "take_diagnostic", skillId: null, code: null, messageHy: "Առաջին քայլ՝ անցնել Chapter I ախտորոշիչը։" };
      } else if (weak.length) {
        const first = weak[0];
        intervention = { action: "practice_skill", skillId: first.skillId, code: first.code, messageHy: `Առաջարկվող միջամտություն՝ աշխատել ${first.code} հմտության վրա։` };
      } else {
        intervention = { action: "mastery_check", skillId: null, code: null, messageHy: "Հմտությունները կայուն են. պատրաստել Chapter I mastery check-ը։" };
      }

      return {
        id: studentId,
        displayName: profile?.display_name?.trim() || fallbackName(studentId),
        latestActivityAt: studentAttempts[0]?.created_at ?? null,
        attempts: studentAttempts.length,
        recentAccuracy: recentAttempts.length ? Math.round((recentCorrect / recentAttempts.length) * 100) : null,
        latestDiagnostic: latestDiagnostic ? {
          correct: Number(latestDiagnostic.correct_count),
          answered: Number(latestDiagnostic.answered_count),
          percent: latestDiagnostic.answered_count ? Math.round(Number(latestDiagnostic.correct_count) / Number(latestDiagnostic.answered_count) * 100) : 0,
        } : null,
        masteryCheck: passedMastery ? { passed: true, percent: Number(passedMastery.score_percent ?? 0) } : null,
        chapterReview: review ? {
          masteryStatus: review.lifecycle_state === "mastery_passed" ? "confirmed" : review.lifecycle_state === "mastery_failed_final" ? "not_demonstrated" : "in_progress",
          lifecycleState: review.lifecycle_state,
          attemptsUsed: Number(review.attempts_used),
          maximumAttempts: Number(review.maximum_mastery_attempts),
          passedOnAttempt: review.passed_on_attempt == null ? null : Number(review.passed_on_attempt),
          requiredReviewsCompleted: Number(review.required_reviews_completed),
          optionalReviewsCompleted: Number(review.optional_reviews_completed),
          totalReviewsCompleted: Number(review.total_reviews_completed),
          lastReviewAt: review.last_review_at,
          currentCycle: review.current_review_cycle == null ? null : Number(review.current_review_cycle),
          currentCycleUniqueSeen: review.current_cycle_unique_seen == null ? null : Number(review.current_cycle_unique_seen),
          currentCycleEligiblePoolSize: review.current_cycle_eligible_pool_size == null ? null : Number(review.current_cycle_eligible_pool_size),
          currentCycleCoveragePercent: coverage?.current_cycle_coverage_percent == null ? null : Number(coverage.current_cycle_coverage_percent),
          lifetimeUniqueItemsSeen: Number(coverage?.lifetime_unique_items_seen ?? 0),
          totalItemExposures: Number(coverage?.total_item_exposures ?? 0),
          exactRepeatCount: Number(coverage?.exact_repeat_count ?? 0),
          poolExhaustionEventCount: Number(coverage?.pool_exhaustion_event_count ?? 0),
          independentAccuracyPercent: review.review_independent_accuracy_percent == null ? null : Number(review.review_independent_accuracy_percent),
          hintAssistedResponses: Number(review.hint_assisted_responses),
          attentionPolicyStatus: "thresholds_not_governed",
          skills: reviewSkills.map((row) => ({
            skillId: row.skill_id, code: row.skill_code, nameHy: row.skill_name_hy,
            reviewObservations: Number(row.review_observations),
            independentObservations: Number(row.independent_observations),
            independentCorrect: Number(row.independent_correct),
            hintAssistedResponses: Number(row.hint_assisted_responses),
            repeatErrors: Number(row.repeat_errors),
            recentIndependentObservations: Number(row.recent_independent_observations),
            recentIndependentCorrect: Number(row.recent_independent_correct),
            failedLatestMastery: Boolean(row.failed_latest_mastery),
            lastSeenAt: row.last_seen_at,
            attentionState: row.attention_state,
          })),
        } : null,
        weakSkills: weak.slice(0, 3).map((w) => ({ skillId: w.skillId, code: w.code, nameHy: w.nameHy, percent: w.percent, band: w.band })),
        intervention,
        matrix,
      };
    });

    const studentsById = new Map(studentSummaries.map((s) => [s.id, s]));
    const classPayload = (classes ?? []).map((klass) => {
      const ids = memberRows.filter((m: any) => m.class_id === klass.id).map((m: any) => m.student_id);
      const students = ids.map((id: string) => studentsById.get(id)).filter(Boolean);
      const needingSupport = students.filter((s: any) => s.weakSkills.some((w: any) => w.band === "needs_support")).length;
      const activeStudents = students.filter((s: any) => s.latestActivityAt).length;
      return {
        id: klass.id,
        name: klass.name,
        academicYear: klass.academic_year,
        joinCode: klass.join_code,
        isActive: klass.is_active,
        studentCount: students.length,
        activeStudents,
        needingSupport,
        students,
      };
    });

    return json({
      teacher: { id: teacherId, displayName: teacherProfile.display_name?.trim() || "Ուսուցիչ" },
      unitCode: UNIT_CODE,
      curriculumReleaseId,
      skills: skillRows.map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
      classes: classPayload,
      totals: {
        classes: classPayload.length,
        students: studentSummaries.length,
        studentsNeedingSupport: studentSummaries.filter((s) => s.weakSkills.some((w) => w.band === "needs_support")).length,
      },
    });
  } catch (err) {
    console.error("get-teacher-dashboard", err);
    return json({ error: "teacher_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
