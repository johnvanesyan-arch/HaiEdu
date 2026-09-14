import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIT_CODE = "PHY7-U01";
const DIAGNOSTIC_ITEMS_PER_SKILL = 2;
const MASTERY_ITEMS_PER_SKILL = 2;
const PRACTICE_SESSION_LENGTH = 8;
const MASTERY_THRESHOLD = 0.72;
const MASTERY_PASS_PERCENT = 80;
const MASTERY_MIN_CORRECT_PER_SKILL = 1;

type Mode = "diagnostic" | "practice" | "mastery_check";
type AttemptRow = { skill_id: string; item_id: string; correct: boolean; hint_used: boolean; created_at: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isComplete(
  mastery: { score: number; evidenceCount: number } | undefined,
  attempts: AttemptRow[],
  skillId: string,
) {
  if (mastery && mastery.evidenceCount >= 3 && mastery.score >= MASTERY_THRESHOLD) return true;
  const rows = attempts.filter((a) => a.skill_id === skillId);
  const unique = new Set(rows.map((a) => a.item_id)).size;
  const recent = rows.slice(0, 5);
  const independentCorrect = recent.filter((a) => a.correct && !a.hint_used).length;
  return unique >= 4 && recent.length >= 5 && independentCorrect >= 4;
}

function shuffle<T>(values: T[]): T[] {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function chooseLeastRecent(
  pool: Array<{ id: string; code: string; difficulty: number }>,
  attempts: AttemptRow[],
  count: number,
) {
  const latestSeen = new Map<string, number>();
  for (const attempt of attempts) {
    if (!latestSeen.has(attempt.item_id)) latestSeen.set(attempt.item_id, new Date(attempt.created_at).getTime());
  }
  return [...pool]
    .sort((a, b) => {
      const aSeen = latestSeen.get(a.id);
      const bSeen = latestSeen.get(b.id);
      if (aSeen === undefined && bSeen !== undefined) return -1;
      if (aSeen !== undefined && bSeen === undefined) return 1;
      if (aSeen !== bSeen) return Number(aSeen ?? 0) - Number(bSeen ?? 0);
      const diff = Math.abs(Number(a.difficulty) - 3) - Math.abs(Number(b.difficulty) - 3);
      return diff || String(a.code).localeCompare(String(b.code));
    })
    .slice(0, count);
}

Deno.serve(async (req) => {
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

  let body: { mode?: Mode; targetSkillId?: string | null } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body.mode || !["diagnostic", "practice", "mastery_check"].includes(body.mode)) {
    return json({ error: "invalid_mode" }, 400);
  }

  const { data: activeSessions } = await admin
    .from("learning_sessions")
    .select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count")
    .eq("student_id", studentId)
    .eq("unit_code", UNIT_CODE)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const active = activeSessions?.[0];
  if (active?.mode === body.mode) return json({ session: active, resumed: true });
  if (active) {
    await admin.from("learning_sessions").update({ status: "abandoned", completed_at: new Date().toISOString() }).eq("id", active.id);
  }

  const { data: skills, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);
  const skillIds = skills.map((s) => s.id);

  const { data: masteryRows } = await admin
    .from("student_skill_mastery")
    .select("skill_id, mastery_score, evidence_count")
    .eq("student_id", studentId)
    .in("skill_id", skillIds);
  const mastery = new Map((masteryRows ?? []).map((r) => [r.skill_id, {
    score: Number(r.mastery_score), evidenceCount: Number(r.evidence_count),
  }]));

  const { data: attemptRows } = await admin
    .from("attempts")
    .select("skill_id, item_id, correct, hint_used, created_at")
    .eq("student_id", studentId)
    .in("skill_id", skillIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  const attempts = (attemptRows ?? []) as AttemptRow[];

  if (body.mode === "diagnostic") {
    const { data: items, error: itemsError } = await admin
      .from("items")
      .select("id, code, skill_id, difficulty")
      .in("skill_id", skillIds)
      .eq("status", "published");
    if (itemsError) return json({ error: "items_query_failed" }, 500);

    const selected: Array<{ item_id: string; skill_id: string }> = [];
    for (const skill of skills) {
      const pool = (items ?? [])
        .filter((item) => item.skill_id === skill.id)
        .sort((a, b) => Number(a.difficulty) - Number(b.difficulty) || String(a.code).localeCompare(String(b.code)));
      if (pool.length < DIAGNOSTIC_ITEMS_PER_SKILL) return json({ error: "insufficient_diagnostic_items", skillCode: skill.code }, 409);
      const first = pool[0];
      const second = pool[Math.min(pool.length - 1, Math.max(1, Math.floor(pool.length / 2)))];
      selected.push({ item_id: first.id, skill_id: skill.id }, { item_id: second.id, skill_id: skill.id });
    }

    const ordered = shuffle(selected);
    const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
      student_id: studentId,
      unit_code: UNIT_CODE,
      mode: "diagnostic",
      planned_item_count: ordered.length,
      metadata: { itemsPerSkill: DIAGNOSTIC_ITEMS_PER_SKILL, noRepeats: true },
    }).select("id, mode, status, planned_item_count, answered_count, correct_count").single();
    if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

    const rows = ordered.map((row, index) => ({ session_id: session.id, ordinal: index + 1, skill_id: row.skill_id, item_id: row.item_id }));
    const { error: itemInsertError } = await admin.from("learning_session_items").insert(rows);
    if (itemInsertError) {
      await admin.from("learning_sessions").delete().eq("id", session.id);
      return json({ error: "session_items_create_failed" }, 500);
    }
    return json({ session, resumed: false });
  }

  if (body.mode === "mastery_check") {
    const { data: priorChecks, error: priorError } = await admin
      .from("learning_sessions")
      .select("id, assessment_result, completed_at, metadata")
      .eq("student_id", studentId)
      .eq("unit_code", UNIT_CODE)
      .eq("mode", "mastery_check")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });
    if (priorError) return json({ error: "mastery_history_failed" }, 500);

    const latestCheck = priorChecks?.[0] ?? null;
    if (latestCheck?.assessment_result === "passed") {
      return json({ unitComplete: true, unitCode: UNIT_CODE, messageHy: "Բաժնի mastery check-ը արդեն հաջողությամբ անցել եք։" });
    }

    const incompleteSkills = skills.filter((skill) => !isComplete(mastery.get(skill.id), attempts, skill.id));
    if (incompleteSkills.length) {
      return json({
        masteryEligible: false,
        reason: "skills_not_ready",
        requiredSkills: incompleteSkills.map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
        messageHy: "Mastery check-ից առաջ ավարտեք դեռ չամրապնդված հմտությունների վարժանքը։",
      });
    }

    if (latestCheck?.assessment_result === "failed") {
      const failedSkillIds = Array.isArray(latestCheck.metadata?.failedSkillIds) ? latestCheck.metadata.failedSkillIds as string[] : [];
      if (failedSkillIds.length) {
        const { data: remediationSessions } = await admin
          .from("learning_sessions")
          .select("target_skill_id, completed_at")
          .eq("student_id", studentId)
          .eq("unit_code", UNIT_CODE)
          .eq("mode", "practice")
          .eq("status", "completed")
          .gt("completed_at", latestCheck.completed_at);
        const remediated = new Set((remediationSessions ?? []).map((s) => s.target_skill_id).filter(Boolean));
        const missing = failedSkillIds.filter((id) => !remediated.has(id));
        if (missing.length) {
          return json({
            masteryEligible: false,
            reason: "remediation_required",
            requiredSkills: skills.filter((s) => missing.includes(s.id)).map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
            messageHy: "Կրկնակի mastery check-ից առաջ ավարտեք առաջարկվող remediation վարժանքները։",
          });
        }
      }
    }

    const { data: items, error: itemsError } = await admin
      .from("items")
      .select("id, code, skill_id, difficulty")
      .in("skill_id", skillIds)
      .eq("status", "published");
    if (itemsError) return json({ error: "items_query_failed" }, 500);

    const selected: Array<{ item_id: string; skill_id: string }> = [];
    for (const skill of skills) {
      const pool = (items ?? []).filter((item) => item.skill_id === skill.id);
      if (pool.length < MASTERY_ITEMS_PER_SKILL) return json({ error: "insufficient_mastery_items", skillCode: skill.code }, 409);
      const chosen = chooseLeastRecent(pool, attempts.filter((a) => a.skill_id === skill.id), MASTERY_ITEMS_PER_SKILL);
      for (const item of chosen) selected.push({ item_id: item.id, skill_id: skill.id });
    }

    const ordered = shuffle(selected);
    const attemptNumber = (priorChecks?.length ?? 0) + 1;
    const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
      student_id: studentId,
      unit_code: UNIT_CODE,
      mode: "mastery_check",
      planned_item_count: ordered.length,
      metadata: {
        itemsPerSkill: MASTERY_ITEMS_PER_SKILL,
        noRepeats: true,
        noHints: true,
        passPercent: MASTERY_PASS_PERCENT,
        minCorrectPerSkill: MASTERY_MIN_CORRECT_PER_SKILL,
        attemptNumber,
      },
    }).select("id, mode, status, planned_item_count, answered_count, correct_count, metadata").single();
    if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

    const rows = ordered.map((row, index) => ({ session_id: session.id, ordinal: index + 1, skill_id: row.skill_id, item_id: row.item_id }));
    const { error: itemInsertError } = await admin.from("learning_session_items").insert(rows);
    if (itemInsertError) {
      await admin.from("learning_sessions").delete().eq("id", session.id);
      return json({ error: "session_items_create_failed" }, 500);
    }
    return json({ session, resumed: false, masteryEligible: true });
  }

  let target = null as (typeof skills)[number] | null;
  if (body.targetSkillId) {
    target = skills.find((skill) => skill.id === body.targetSkillId) ?? null;
    if (!target) return json({ error: "invalid_target_skill" }, 400);
  } else {
    target = skills.find((skill) => !isComplete(mastery.get(skill.id), attempts, skill.id)) ?? null;
  }

  if (!target) return json({ unitReadyForMasteryCheck: true, unitCode: UNIT_CODE, messageHy: "Բոլոր հմտությունները պատրաստ են mastery check-ի համար։" });

  const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
    student_id: studentId,
    unit_code: UNIT_CODE,
    mode: "practice",
    target_skill_id: target.id,
    planned_item_count: PRACTICE_SESSION_LENGTH,
    metadata: { targetSkillCode: target.code, bounded: true, recommendedTarget: Boolean(body.targetSkillId) },
  }).select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count").single();
  if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

  return json({ session, resumed: false, targetSkill: { id: target.id, code: target.code, nameHy: target.name_hy } });
});