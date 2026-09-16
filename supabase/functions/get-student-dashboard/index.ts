import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIT_CODE = "PHY7-U01";
const MASTERY_THRESHOLD = 0.72;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AttemptRow = { skill_id: string; item_id: string; correct: boolean; created_at: string };
type Band = "strong" | "developing" | "needs_support" | "not_assessed";

function band(correct: number, total: number): Band {
  if (total <= 0) return "not_assessed";
  const ratio = correct / total;
  if (ratio >= 0.999) return "strong";
  if (ratio >= 0.5) return "developing";
  return "needs_support";
}

function completionState(
  mastery: { score: number; evidenceCount: number; status: string } | undefined,
  attempts: AttemptRow[],
  skillId: string,
) {
  if (mastery && mastery.evidenceCount >= 3 && mastery.score >= MASTERY_THRESHOLD) {
    return { complete: true, source: "mastery" };
  }
  const rows = attempts.filter((a) => a.skill_id === skillId);
  const unique = new Set(rows.map((a) => a.item_id)).size;
  const recent = rows.slice(0, 5);
  const recovered = unique >= 4 && recent.length >= 5 && recent.filter((a) => a.correct).length >= 4;
  return { complete: recovered, source: recovered ? "recent_recovery" : null };
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
    return json({
      error: "course_access_required",
      courseKey: "physics:7",
      messageHy: "Ֆիզիկա 7-ը հասանելի կդառնա համապատասխան դասարանին միանալուց հետո։",
    }, 403);
  }

  const { data: skills, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, layer, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);

  const skillIds = skills.map((s) => s.id);

  const [
    { data: masteryRows },
    { data: attemptRows },
    { data: activeRows },
    { data: diagnosticRows },
    { data: prerequisiteRows },
  ] = await Promise.all([
    admin.from("student_skill_mastery").select("skill_id, mastery_score, evidence_count, status").eq("student_id", studentId).in("skill_id", skillIds),
    admin.from("attempts").select("skill_id, item_id, correct, created_at").eq("student_id", studentId).in("skill_id", skillIds).order("created_at", { ascending: false }).limit(500),
    admin.from("learning_sessions").select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, started_at").eq("student_id", studentId).eq("unit_code", UNIT_CODE).eq("status", "active").order("started_at", { ascending: false }).limit(1),
    admin.from("learning_sessions").select("id, mode, status, planned_item_count, answered_count, correct_count, completed_at, started_at").eq("student_id", studentId).eq("unit_code", UNIT_CODE).eq("mode", "diagnostic").eq("status", "completed").order("completed_at", { ascending: false }).limit(1),
    admin.from("skill_prerequisites").select("skill_id, prerequisite_skill_id").in("skill_id", skillIds),
  ]);

  const attempts = (attemptRows ?? []) as AttemptRow[];
  const masteryMap = new Map((masteryRows ?? []).map((r) => [
    r.skill_id,
    { score: Number(r.mastery_score), evidenceCount: Number(r.evidence_count), status: String(r.status) },
  ]));

  const prerequisiteMap = new Map<string, string[]>();
  for (const row of prerequisiteRows ?? []) {
    const values = prerequisiteMap.get(row.skill_id) ?? [];
    values.push(row.prerequisite_skill_id);
    prerequisiteMap.set(row.skill_id, values);
  }

  const latestDiagnostic = diagnosticRows?.[0] ?? null;
  const diagnosticBySkill = new Map<string, { correct: number; total: number }>();

  if (latestDiagnostic) {
    const { data: diagnosticItems } = await admin
      .from("learning_session_items")
      .select("skill_id, correct, answered_at")
      .eq("session_id", latestDiagnostic.id)
      .not("answered_at", "is", null);

    for (const row of diagnosticItems ?? []) {
      const current = diagnosticBySkill.get(row.skill_id) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (row.correct === true) current.correct += 1;
      diagnosticBySkill.set(row.skill_id, current);
    }
  }

  const skillMap = skills.map((skill) => {
    const mastery = masteryMap.get(skill.id);
    const diagnostic = diagnosticBySkill.get(skill.id) ?? { correct: 0, total: 0 };
    const completion = completionState(mastery, attempts, skill.id);
    return {
      id: skill.id,
      code: skill.code,
      nameHy: skill.name_hy,
      layer: skill.layer,
      sequenceOrder: Number(skill.sequence_order),
      prerequisiteIds: prerequisiteMap.get(skill.id) ?? [],
      diagnostic: {
        correct: diagnostic.correct,
        total: diagnostic.total,
        percent: diagnostic.total ? Math.round((diagnostic.correct / diagnostic.total) * 100) : null,
        band: band(diagnostic.correct, diagnostic.total),
      },
      mastery: mastery
        ? { score: mastery.score, percent: Math.round(mastery.score * 100), evidenceCount: mastery.evidenceCount, status: mastery.status }
        : null,
      complete: completion.complete,
      completionSource: completion.source,
    };
  });

  const byId = new Map(skillMap.map((s) => [s.id, s]));
  const unfinished = skillMap.filter((s) => !s.complete);
  const baseRecommendation = latestDiagnostic
    ? unfinished.find((s) => s.diagnostic.band === "needs_support")
      ?? unfinished.find((s) => s.diagnostic.band === "developing")
      ?? unfinished[0]
      ?? null
    : unfinished[0] ?? null;

  const resolvePrerequisite = (skill: (typeof skillMap)[number], visited = new Set<string>()): (typeof skillMap)[number] => {
    if (visited.has(skill.id)) return skill;
    visited.add(skill.id);
    const prerequisites = skill.prerequisiteIds
      .map((id) => byId.get(id))
      .filter((value): value is (typeof skillMap)[number] => Boolean(value))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const unmet = prerequisites.find((p) => !p.complete && p.diagnostic.band !== "strong");
    return unmet ? resolvePrerequisite(unmet, visited) : skill;
  };

  const recommended = baseRecommendation ? resolvePrerequisite(baseRecommendation) : null;
  const active = activeRows?.[0] ?? null;
  const activeTarget = active?.target_skill_id ? skillMap.find((s) => s.id === active.target_skill_id) : null;
  const completedSkills = skillMap.filter((s) => s.complete).length;

  let recommendedAction: "resume_session" | "take_diagnostic" | "practice_skill" | "unit_complete";
  if (active) recommendedAction = "resume_session";
  else if (!latestDiagnostic) recommendedAction = "take_diagnostic";
  else if (recommended) recommendedAction = "practice_skill";
  else recommendedAction = "unit_complete";

  return json({
    unitCode: UNIT_CODE,
    courseKey: "physics:7",
    activeSession: active ? {
      id: active.id,
      mode: active.mode,
      status: active.status,
      answered: Number(active.answered_count),
      planned: Number(active.planned_item_count),
      correct: Number(active.correct_count),
      targetSkill: activeTarget ? { id: activeTarget.id, code: activeTarget.code, nameHy: activeTarget.nameHy } : null,
    } : null,
    latestDiagnostic: latestDiagnostic ? {
      id: latestDiagnostic.id,
      answered: Number(latestDiagnostic.answered_count),
      planned: Number(latestDiagnostic.planned_item_count),
      correct: Number(latestDiagnostic.correct_count),
      percent: latestDiagnostic.answered_count
        ? Math.round((Number(latestDiagnostic.correct_count) / Number(latestDiagnostic.answered_count)) * 100)
        : 0,
      completedAt: latestDiagnostic.completed_at,
    } : null,
    progress: {
      completedSkills,
      totalSkills: skillMap.length,
      percent: skillMap.length ? Math.round((completedSkills / skillMap.length) * 100) : 0,
    },
    skills: skillMap,
    recommendation: {
      action: recommendedAction,
      skill: recommended ? { id: recommended.id, code: recommended.code, nameHy: recommended.nameHy, band: recommended.diagnostic.band } : null,
      reasonHy: recommendedAction === "resume_session"
        ? "Դուք ունեք չավարտված սեսիա։ Շարունակեք այնտեղից, որտեղ կանգ եք առել։"
        : recommendedAction === "take_diagnostic"
          ? "Սկսեք ախտորոշիչից, որպեսզի համակարգը կազմի հմտությունների քարտեզ։"
          : recommendedAction === "practice_skill"
            ? `Խորհուրդ է տրվում սկսել ${recommended?.code} հմտությունից՝ հաշվի առնելով ախտորոշիչ արդյունքը և նախապայմանները։`
            : "Այս բաժնի ընթացիկ հմտությունները ամրապնդված են։",
    },
  });
});
