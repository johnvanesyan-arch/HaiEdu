import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";
import { resolveActiveCurriculumRelease } from "../_shared/curriculum-release.ts";
import { resolveRuntimeLearningModel } from "../_shared/learning-model.ts";
import { issueRecommendationEvent } from "../_shared/recommendation-telemetry.ts";
import { gradeAnswer } from "../_shared/grading.ts";
import { initialMasteryState, updateMastery } from "../_shared/mastery.ts";
import { recommendNext } from "../_shared/recommendation.ts";
import type { AnswerKey, ItemType, MasteryState, StudentResponse } from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
  const studentId = userData.user.id;

  if (!(await hasPhysics7Access(admin, studentId))) {
    return json({ error: "course_access_required", courseKey: "physics:7" }, 403);
  }

  let payload: {
    itemId?: string;
    sessionId?: string;
    sessionItemId?: string;
    response?: StudentResponse;
    responseTimeMs?: number;
    hintUsed?: boolean;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!payload.itemId || !payload.response) {
    return json({ error: "itemId_and_response_required" }, 400);
  }

  let session: any = null;
  let sessionItem: any = null;
  if (payload.sessionId || payload.sessionItemId) {
    if (!payload.sessionId || !payload.sessionItemId) {
      return json({ error: "sessionId_and_sessionItemId_required" }, 400);
    }
    const { data: sessionData, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, mode, status, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, learning_model_configuration_id, model_provenance_status")
      .eq("id", payload.sessionId)
      .eq("student_id", studentId)
      .single();
    if (sessionError || !sessionData || sessionData.status !== "active") {
      return json({ error: "session_not_active" }, 409);
    }

    const { data: sessionItemData, error: sessionItemError } = await admin
      .from("learning_session_items")
      .select("id, item_id, answered_at, hint_level_used")
      .eq("id", payload.sessionItemId)
      .eq("session_id", payload.sessionId)
      .single();
    if (sessionItemError || !sessionItemData || sessionItemData.item_id !== payload.itemId) {
      return json({ error: "session_item_mismatch" }, 409);
    }
    if (sessionItemData.answered_at) {
      return json({ error: "session_item_already_answered" }, 409);
    }
    session = sessionData;
    sessionItem = sessionItemData;
  }

  let curriculumReleaseId: string;
  try {
    curriculumReleaseId = session?.curriculum_release_id
      ? String(session.curriculum_release_id)
      : await resolveActiveCurriculumRelease(admin, "PHY7-U01");
  } catch (err) {
    console.error("curriculum release unavailable", err);
    return json({ error: "curriculum_release_unavailable" }, 503);
  }

  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id, skill_id, item_type, difficulty, status")
    .eq("id", payload.itemId)
    .single();
  if (itemError || !item || item.status !== "published") {
    return json({ error: "item_not_found" }, 404);
  }

  const { data: answerRow, error: answerError } = await admin
    .from("item_answer_keys")
    .select("answer, tolerance, canonical_unit, accepted_units, feedback_code")
    .eq("item_id", item.id)
    .single();
  if (answerError || !answerRow) return json({ error: "answer_key_missing" }, 500);

  const storedAnswer = answerRow.answer as { value?: unknown } | unknown;
  const answerValue = typeof storedAnswer === "object" && storedAnswer !== null && "value" in storedAnswer
    ? (storedAnswer as { value?: unknown }).value
    : storedAnswer;
  const key: AnswerKey = {
    type: item.item_type as ItemType,
    answer: answerValue,
    tolerance: answerRow.tolerance ?? undefined,
    canonicalUnit: answerRow.canonical_unit ?? undefined,
    acceptedUnits: answerRow.accepted_units ?? undefined,
  };

  let grade;
  try {
    grade = gradeAnswer(key, payload.response);
  } catch (err) {
    console.error("grade_error", err);
    return json({ error: "grading_failed" }, 500);
  }

  const { data: priorRow } = await admin
    .from("student_skill_mastery_by_release")
    .select("alpha_evidence, beta_evidence, mastery_score, evidence_count, status")
    .eq("curriculum_release_id", curriculumReleaseId)
    .eq("student_id", studentId)
    .eq("skill_id", item.skill_id)
    .maybeSingle();
  const prior: MasteryState = priorRow
    ? {
        alpha: Number(priorRow.alpha_evidence),
        beta: Number(priorRow.beta_evidence),
        masteryScore: Number(priorRow.mastery_score),
        evidenceCount: priorRow.evidence_count,
        status: priorRow.status,
      }
    : initialMasteryState();

  const serverHintUsed = sessionItem
    ? Number(sessionItem.hint_level_used ?? 0) > 0
    : Boolean(payload.hintUsed);

  const updated = updateMastery(prior, {
    score: grade.score,
    difficulty: item.difficulty,
    hintUsed: serverHintUsed,
  });
  const now = new Date().toISOString();

  let attemptId: string | null = null;
  if (session) {
    const { data, error } = await admin.rpc("record_session_graded_attempt", {
      p_student_id: studentId,
      p_session_id: payload.sessionId,
      p_session_item_id: payload.sessionItemId,
      p_item_id: item.id,
      p_skill_id: item.skill_id,
      p_response: payload.response,
      p_normalized_response: grade.normalizedResponse ?? null,
      p_score: grade.score,
      p_correct: grade.correct,
      p_error_code: grade.errorCode,
      p_hint_used: serverHintUsed,
      p_response_time_ms: payload.responseTimeMs ?? null,
      p_alpha: updated.alpha,
      p_beta: updated.beta,
      p_mastery_score: updated.masteryScore,
      p_evidence_count: updated.evidenceCount,
      p_status: updated.status,
      p_attempted_at: now,
    });
    if (error) {
      console.error("session attempt record failed", error);
      return json({ error: "attempt_record_failed" }, 500);
    }
    attemptId = data;
  } else {
    const { data, error } = await admin.rpc("record_graded_attempt", {
      p_student_id: studentId,
      p_item_id: item.id,
      p_skill_id: item.skill_id,
      p_response: payload.response,
      p_normalized_response: grade.normalizedResponse ?? null,
      p_score: grade.score,
      p_correct: grade.correct,
      p_error_code: grade.errorCode,
      p_hint_used: serverHintUsed,
      p_response_time_ms: payload.responseTimeMs ?? null,
      p_alpha: updated.alpha,
      p_beta: updated.beta,
      p_mastery_score: updated.masteryScore,
      p_evidence_count: updated.evidenceCount,
      p_status: updated.status,
      p_attempted_at: now,
    });
    if (error) return json({ error: "attempt_record_failed" }, 500);
    attemptId = data;
  }

  if (session?.mode === "diagnostic") {
    const { data: refreshed } = await admin
      .from("learning_sessions")
      .select("status, planned_item_count, answered_count, correct_count")
      .eq("id", session.id)
      .single();
    return json({
      accepted: true,
      revealCorrect: false,
      attemptId,
      curriculumReleaseId,
      assessmentBlueprintId: session.assessment_blueprint_id,
      provenanceStatus: session.provenance_status,
      session: refreshed,
    });
  }

  const { data: prereqRows } = await admin
    .from("skill_prerequisites")
    .select("prerequisite_skill_id, required_mastery")
    .eq("skill_id", item.skill_id);
  const unmet: string[] = [];
  for (const prereq of prereqRows ?? []) {
    const { data: prereqMastery } = await admin
      .from("student_skill_mastery_by_release")
      .select("mastery_score")
      .eq("curriculum_release_id", curriculumReleaseId)
      .eq("student_id", studentId)
      .eq("skill_id", prereq.prerequisite_skill_id)
      .maybeSingle();
    const score = prereqMastery ? Number(prereqMastery.mastery_score) : 0;
    if (!prereqMastery || score < Number(prereq.required_mastery)) {
      unmet.push(prereq.prerequisite_skill_id);
    }
  }
  const recommendation = recommendNext({
    mastery: updated,
    unmetPrerequisiteIds: unmet,
    hasNextSkill: false,
  });

  let recommendationModelConfigurationId: string | null = session?.learning_model_configuration_id
    ? String(session.learning_model_configuration_id)
    : null;
  let recommendationModelProvenanceStatus: "exact" | "unbound_legacy" =
    session?.model_provenance_status === "exact" ? "exact" : "unbound_legacy";

  if (!session) {
    try {
      const runtimeModel = await resolveRuntimeLearningModel(admin, curriculumReleaseId, "PHY7-U01");
      recommendationModelConfigurationId = runtimeModel.id;
      recommendationModelProvenanceStatus = runtimeModel.provenanceStatus;
    } catch (err) {
      console.error("learning-model binding unavailable for recommendation telemetry", err);
    }
  }

  const recommendationInstanceId = await issueRecommendationEvent({
    admin,
    studentId,
    policyScope: "core_after_attempt",
    surface: "submit_answer_api",
    action: recommendation.action,
    targetSkillId: recommendation.targetSkillId ?? null,
    curriculumReleaseId,
    assessmentBlueprintId: session?.assessment_blueprint_id ?? null,
    learningModelConfigurationId: recommendationModelConfigurationId,
    modelProvenanceStatus: recommendationModelProvenanceStatus,
    learningSessionId: session?.id ?? null,
    attemptId,
    stateSnapshot: {
      skillId: item.skill_id,
      masteryBefore: {
        score: prior.masteryScore,
        evidenceCount: prior.evidenceCount,
        status: prior.status,
      },
      masteryAfter: {
        score: updated.masteryScore,
        evidenceCount: updated.evidenceCount,
        status: updated.status,
      },
      unmetPrerequisiteIds: unmet,
      answerCorrect: grade.correct,
      hintUsed: serverHintUsed,
    },
    recommendationSnapshot: {
      ...recommendation,
    },
  });

  const response: Record<string, unknown> = {
    attemptId,
    curriculumReleaseId,
    assessmentBlueprintId: session?.assessment_blueprint_id ?? null,
    provenanceStatus: session?.provenance_status ?? "exact",
    itemId: item.id,
    skillId: item.skill_id,
    grading: {
      correct: grade.correct,
      score: grade.score,
      errorCode: grade.errorCode,
      feedbackCode: answerRow.feedback_code ?? null,
      usedHelp: serverHintUsed,
    },
    mastery: {
      score: updated.masteryScore,
      evidenceCount: updated.evidenceCount,
      status: updated.status,
    },
    recommendation: {
      ...recommendation,
      instanceId: recommendationInstanceId,
      policyScope: "core_after_attempt",
      modelConfigurationId: recommendationModelConfigurationId,
      modelProvenanceStatus: recommendationModelProvenanceStatus,
    },
    remediation: session?.mode === "practice" || session?.mode === "chapter_review"
      ? {
          helpWasUsed: serverHintUsed,
          independentCheckNeeded: grade.correct && serverHintUsed,
          helpAvailableAfterMistake: !grade.correct,
          messageHy: !grade.correct
            ? "Սխալը գրանցվեց։ Օգտագործեք օգնությունը կամ անցեք հաջորդ՝ հարմարեցված հարցին։"
            : serverHintUsed
              ? "Պատասխանը ճիշտ է օգնությամբ։ Հմտությունը հետագայում կստուգվի նաև առանց օգնության։"
              : "Պատասխանը ճիշտ է ինքնուրույն։",
        }
      : null,
  };

  if (session) {
    const { data: refreshed, error: refreshError } = await admin
      .from("learning_sessions")
      .select("status, planned_item_count, answered_count, correct_count")
      .eq("id", session.id)
      .single();
    if (refreshError || !refreshed) return json({ error: "session_refresh_failed" }, 500);
    response.session = refreshed;

    if (session.mode === "chapter_review" && refreshed.status === "completed") {
      const { data: reviewLifecycle, error: reviewLifecycleError } = await admin.rpc("finalize_chapter_review_atomic", {
        p_student_id: studentId,
        p_session_id: session.id,
      });
      if (reviewLifecycleError) {
        console.error("chapter review finalization failed", reviewLifecycleError);
        return json({ error: "chapter_review_finalize_failed" }, 500);
      }
      response.chapterReview = reviewLifecycle;
      const { data: reviewCoverage, error: reviewCoverageError } = await admin
        .from("chapter_review_coverage_v")
        .select("current_cycle_number,current_cycle_unique_items_seen,current_cycle_eligible_pool_size,current_cycle_coverage_percent,lifetime_unique_items_seen,exact_repeat_count,pool_exhaustion_event_count")
        .eq("student_id", studentId)
        .eq("curriculum_release_id", curriculumReleaseId)
        .eq("unit_code", "PHY7-U01")
        .maybeSingle();
      if (reviewCoverageError) {
        console.error("chapter review coverage unavailable", reviewCoverageError);
        return json({ error: "chapter_review_coverage_unavailable" }, 500);
      }
      response.reviewCoverage = reviewCoverage;
    }
  }

  return json(response);
});
