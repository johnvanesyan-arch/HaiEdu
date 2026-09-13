import { createClient } from "npm:@supabase/supabase-js@2";
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
  const studentId = userData.user.id;

  let payload: { itemId?: string; response?: StudentResponse; responseTimeMs?: number; hintUsed?: boolean };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!payload.itemId || !payload.response) return json({ error: "itemId_and_response_required" }, 400);

  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id, skill_id, item_type, difficulty, status")
    .eq("id", payload.itemId)
    .single();

  if (itemError || !item || item.status !== "published") return json({ error: "item_not_found" }, 404);

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
    .from("student_skill_mastery")
    .select("alpha_evidence, beta_evidence, mastery_score, evidence_count, status")
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

  const updated = updateMastery(prior, {
    score: grade.score,
    difficulty: item.difficulty,
    hintUsed: payload.hintUsed ?? false,
  });

  const now = new Date().toISOString();

  const { data: attemptId, error: recordError } = await admin.rpc("record_graded_attempt", {
    p_student_id: studentId,
    p_item_id: item.id,
    p_skill_id: item.skill_id,
    p_response: payload.response,
    p_normalized_response: grade.normalizedResponse ?? null,
    p_score: grade.score,
    p_correct: grade.correct,
    p_error_code: grade.errorCode,
    p_hint_used: payload.hintUsed ?? false,
    p_response_time_ms: payload.responseTimeMs ?? null,
    p_alpha: updated.alpha,
    p_beta: updated.beta,
    p_mastery_score: updated.masteryScore,
    p_evidence_count: updated.evidenceCount,
    p_status: updated.status,
    p_attempted_at: now,
  });

  if (recordError) return json({ error: "attempt_record_failed" }, 500);

  const { data: prereqRows } = await admin
    .from("skill_prerequisites")
    .select("prerequisite_skill_id, required_mastery")
    .eq("skill_id", item.skill_id);

  const unmet: string[] = [];
  for (const prereq of prereqRows ?? []) {
    const { data: prereqMastery } = await admin
      .from("student_skill_mastery")
      .select("mastery_score, status")
      .eq("student_id", studentId)
      .eq("skill_id", prereq.prerequisite_skill_id)
      .maybeSingle();
    const score = prereqMastery ? Number(prereqMastery.mastery_score) : 0;
    if (!prereqMastery || score < Number(prereq.required_mastery)) unmet.push(prereq.prerequisite_skill_id);
  }

  const recommendation = recommendNext({ mastery: updated, unmetPrerequisiteIds: unmet, hasNextSkill: false });

  return json({
    attemptId,
    itemId: item.id,
    skillId: item.skill_id,
    grading: {
      correct: grade.correct,
      score: grade.score,
      errorCode: grade.errorCode,
      feedbackCode: answerRow.feedback_code ?? null,
    },
    mastery: {
      score: updated.masteryScore,
      evidenceCount: updated.evidenceCount,
      status: updated.status,
    },
    recommendation,
  });
});
