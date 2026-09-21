import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";
import { resolveActiveCurriculumRelease } from "../_shared/curriculum-release.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UNIT_CODE = "PHY7-U01";
const MASTERY_THRESHOLD = 0.72;

type AttemptRow = { skill_id: string; item_id: string; correct: boolean; hint_used: boolean; created_at: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function skillComplete(mastery: { score: number; evidenceCount: number } | undefined, attempts: AttemptRow[], skillId: string) {
  if (mastery && mastery.evidenceCount >= 3 && mastery.score >= MASTERY_THRESHOLD) return true;
  const rows = attempts.filter((a) => a.skill_id === skillId);
  const unique = new Set(rows.map((a) => a.item_id)).size;
  const recent = rows.slice(0, 5);
  return unique >= 4 && recent.length >= 5 && recent.filter((a) => a.correct && !a.hint_used).length >= 4;
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
    const studentId = userData.user.id;

    if (!(await hasPhysics7Access(admin, studentId))) {
      return json({
        error: "course_access_required",
        courseKey: "physics:7",
        messageHy: "Յուրացման ստուգումը հասանելի կդառնա Ֆիզիկա 7 դասարանին միանալուց հետո։",
      }, 403);
    }

    const { data: skills, error: skillsError } = await admin
      .from("skills")
      .select("id, code, name_hy, sequence_order")
      .like("code", "PHY7-U01-S%")
      .order("sequence_order", { ascending: true });
    if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);
    const skillIds = skills.map((s) => s.id);

    let curriculumReleaseId: string;
    try {
      curriculumReleaseId = await resolveActiveCurriculumRelease(admin, UNIT_CODE);
    } catch (err) {
      console.error("curriculum release unavailable", err);
      return json({ error: "curriculum_release_unavailable" }, 503);
    }

    const [{ data: masteryRows }, { data: attemptRows }, { data: activeRows }, { data: checkRows }, { data: lifecycleRows }] = await Promise.all([
      admin.from("student_skill_mastery_by_release").select("skill_id, mastery_score, evidence_count").eq("curriculum_release_id", curriculumReleaseId).eq("student_id", studentId).in("skill_id", skillIds),
      admin.from("attempts").select("skill_id, item_id, correct, hint_used, created_at").eq("curriculum_release_id", curriculumReleaseId).eq("student_id", studentId).in("skill_id", skillIds).order("created_at", { ascending: false }).limit(1000),
      admin.from("learning_sessions").select("id, mode, status, planned_item_count, answered_count, correct_count, started_at").eq("student_id", studentId).eq("unit_code", UNIT_CODE).eq("status", "active").order("started_at", { ascending: false }).limit(1),
      admin.from("learning_sessions").select("id, assessment_result, score_percent, completed_at, metadata, answered_count, correct_count, planned_item_count, mastery_attempt_number").eq("curriculum_release_id", curriculumReleaseId).eq("student_id", studentId).eq("unit_code", UNIT_CODE).eq("mode", "mastery_check").eq("status", "completed").order("completed_at", { ascending: false }).limit(1),
      admin.from("chapter_mastery_states").select("id, lifecycle_state, attempts_used, passed_on_attempt, academic_mastery_policy_id, history_provenance").eq("curriculum_release_id", curriculumReleaseId).eq("student_id", studentId).eq("unit_code", UNIT_CODE).limit(1),
    ]);

    const mastery = new Map((masteryRows ?? []).map((r) => [r.skill_id, { score: Number(r.mastery_score), evidenceCount: Number(r.evidence_count) }]));
    const attempts = (attemptRows ?? []) as AttemptRow[];
    const incompleteSkills = skills.filter((s) => !skillComplete(mastery.get(s.id), attempts, s.id));
    const latest = checkRows?.[0] ?? null;
    const active = activeRows?.[0] ?? null;

    let requiredSkills = [...incompleteSkills];
    let retryBlocked = false;
    if (!incompleteSkills.length && latest?.assessment_result === "failed") {
      const failedSkillIds = Array.isArray(latest.metadata?.failedSkillIds) ? latest.metadata.failedSkillIds as string[] : [];
      if (failedSkillIds.length) {
        const { data: remediation } = await admin
          .from("learning_sessions")
          .select("target_skill_id, completed_at")
          .eq("curriculum_release_id", curriculumReleaseId)
          .eq("student_id", studentId)
          .eq("unit_code", UNIT_CODE)
          .eq("mode", "practice")
          .eq("status", "completed")
          .gt("completed_at", latest.completed_at);
        const remediated = new Set((remediation ?? []).map((r) => r.target_skill_id).filter(Boolean));
        const missing = failedSkillIds.filter((id) => !remediated.has(id));
        requiredSkills = skills.filter((s) => missing.includes(s.id));
        retryBlocked = missing.length > 0;
      }
    }

    const lifecycle = lifecycleRows?.[0] ?? null;
    const lifecycleState = lifecycle?.lifecycle_state ?? null;
    const reviewRequired = lifecycleState === "review_required_attempt_2" || lifecycleState === "review_required_attempt_3";
    const finalFailure = lifecycleState === "mastery_failed_final";
    if (reviewRequired) retryBlocked = true;
    const unitComplete = lifecycleState === "mastery_passed" || latest?.assessment_result === "passed";
    const eligibleState = lifecycleState === null
      || lifecycleState === "mastery_ready"
      || lifecycleState === "mastery_retry_2_ready"
      || lifecycleState === "mastery_retry_3_ready";
    const eligible = eligibleState && !unitComplete && !finalFailure && !active && incompleteSkills.length === 0 && !retryBlocked;
    const latestSkillResults = Array.isArray(latest?.metadata?.skillResults) ? latest.metadata.skillResults : [];
    let reviewRequirement = null;
    if (reviewRequired && lifecycle?.id) {
      const { data: requirementRows } = await admin
        .from("chapter_review_requirements")
        .select("id, required_after_attempt, status, required_at")
        .eq("chapter_mastery_state_id", lifecycle.id)
        .eq("status", "required")
        .limit(1);
      reviewRequirement = requirementRows?.[0] ?? null;
    }

    return json({
      unitCode: UNIT_CODE,
      curriculumReleaseId,
      courseKey: "physics:7",
      passCriteria: { overallPercent: 80, minCorrectPerSkill: 1, questions: 20, hints: false },
      unitComplete,
      eligible,
      retryBlocked,
      reviewRequired,
      reviewRequirement,
      reviewAvailable: unitComplete || finalFailure || reviewRequired,
      finalFailure,
      lifecycle: lifecycle ? {
        state: lifecycleState,
        attemptsUsed: Number(lifecycle.attempts_used),
        attemptsRemaining: Math.max(0, 3 - Number(lifecycle.attempts_used)),
        passedOnAttempt: lifecycle.passed_on_attempt === null ? null : Number(lifecycle.passed_on_attempt),
        policyId: lifecycle.academic_mastery_policy_id,
        historyProvenance: lifecycle.history_provenance,
      } : null,
      activeSession: active,
      requiredSkills: requiredSkills.map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
      latestCheck: latest ? {
        id: latest.id,
        result: latest.assessment_result,
        percent: latest.score_percent === null ? null : Number(latest.score_percent),
        correct: Number(latest.correct_count),
        answered: Number(latest.answered_count),
        planned: Number(latest.planned_item_count),
        completedAt: latest.completed_at,
        attemptNumber: Number(latest.mastery_attempt_number ?? latest.metadata?.attemptNumber ?? 1),
        skillResults: latestSkillResults,
      } : null,
      messageHy: unitComplete
        ? "Բաժինը ավարտված է․ mastery check-ը հաջողությամբ անցել եք։"
        : active?.mode === "mastery_check"
          ? "Ունեք չավարտված mastery check։"
          : incompleteSkills.length
            ? "Mastery check-ը կբացվի, երբ բոլոր հմտությունները ամրապնդվեն։"
            : finalFailure
              ? "Յուրացման ստուգման բոլոր երեք փորձերն ավարտված են։ Գլխի կրկնությունը մնում է հասանելի։"
              : reviewRequired
                ? "Յուրացման ստուգումը կրկնելուց առաջ պետք է ավարտեք Գլխի կրկնությունը։"
                : retryBlocked
                  ? "Կրկնակի փորձից առաջ ավարտեք պահանջվող Գլխի կրկնությունը։"
                  : "Պատրաստ եք mastery check-ին։",
    });
  } catch (err) {
    console.error("get-mastery-check-status", err);
    return json({ error: "mastery_status_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
