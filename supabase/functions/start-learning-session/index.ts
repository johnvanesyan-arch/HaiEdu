import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIT_CODE = "PHY7-U01";
const DIAGNOSTIC_ITEMS_PER_SKILL = 2;
const PRACTICE_SESSION_LENGTH = 8;
const MASTERY_THRESHOLD = 0.72;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AttemptRow = { skill_id: string; item_id: string; correct: boolean; created_at: string };

function isComplete(mastery: { score: number; evidenceCount: number } | undefined, attempts: AttemptRow[], skillId: string) {
  if (mastery && mastery.evidenceCount >= 3 && mastery.score >= MASTERY_THRESHOLD) return true;
  const rows = attempts.filter((a) => a.skill_id === skillId);
  const unique = new Set(rows.map((a) => a.item_id)).size;
  const recent = rows.slice(0, 5);
  return unique >= 4 && recent.length >= 5 && recent.filter((a) => a.correct).length >= 4;
}

function shuffle<T>(values: T[]): T[] {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  const studentId = userData.user.id;

  let body: { mode?: "diagnostic" | "practice" } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (body.mode !== "diagnostic" && body.mode !== "practice") return json({ error: "invalid_mode" }, 400);

  const { data: activeSessions } = await admin
    .from("learning_sessions")
    .select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count")
    .eq("student_id", studentId)
    .eq("unit_code", UNIT_CODE)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const active = activeSessions?.[0];
  if (active?.mode === body.mode) {
    return json({ session: active, resumed: true });
  }
  if (active) {
    await admin.from("learning_sessions").update({ status: "abandoned", completed_at: new Date().toISOString() }).eq("id", active.id);
  }

  const { data: skills, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);

  if (body.mode === "diagnostic") {
    const skillIds = skills.map((s) => s.id);
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
      if (pool.length < DIAGNOSTIC_ITEMS_PER_SKILL) {
        return json({ error: "insufficient_diagnostic_items", skillCode: skill.code }, 409);
      }
      const first = pool[0];
      const second = pool[Math.min(pool.length - 1, Math.max(1, Math.floor(pool.length / 2)))];
      selected.push({ item_id: first.id, skill_id: skill.id }, { item_id: second.id, skill_id: skill.id });
    }

    const ordered = shuffle(selected);
    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .insert({
        student_id: studentId,
        unit_code: UNIT_CODE,
        mode: "diagnostic",
        planned_item_count: ordered.length,
        metadata: { itemsPerSkill: DIAGNOSTIC_ITEMS_PER_SKILL, noRepeats: true },
      })
      .select("id, mode, status, planned_item_count, answered_count, correct_count")
      .single();
    if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

    const rows = ordered.map((row, index) => ({
      session_id: session.id,
      ordinal: index + 1,
      skill_id: row.skill_id,
      item_id: row.item_id,
    }));
    const { error: itemInsertError } = await admin.from("learning_session_items").insert(rows);
    if (itemInsertError) {
      await admin.from("learning_sessions").delete().eq("id", session.id);
      return json({ error: "session_items_create_failed" }, 500);
    }

    return json({ session, resumed: false });
  }

  const skillIds = skills.map((s) => s.id);
  const { data: masteryRows } = await admin
    .from("student_skill_mastery")
    .select("skill_id, mastery_score, evidence_count")
    .eq("student_id", studentId)
    .in("skill_id", skillIds);
  const mastery = new Map((masteryRows ?? []).map((r) => [r.skill_id, { score: Number(r.mastery_score), evidenceCount: Number(r.evidence_count) }]));

  const { data: attemptRows } = await admin
    .from("attempts")
    .select("skill_id, item_id, correct, created_at")
    .eq("student_id", studentId)
    .in("skill_id", skillIds)
    .order("created_at", { ascending: false })
    .limit(500);
  const attempts = (attemptRows ?? []) as AttemptRow[];

  const target = skills.find((skill) => !isComplete(mastery.get(skill.id), attempts, skill.id));
  if (!target) {
    return json({ unitComplete: true, unitCode: UNIT_CODE, messageHy: "Այս բաժնի բոլոր հմտություններն արդեն ավարտված են։" });
  }

  const { data: session, error: sessionError } = await admin
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      unit_code: UNIT_CODE,
      mode: "practice",
      target_skill_id: target.id,
      planned_item_count: PRACTICE_SESSION_LENGTH,
      metadata: { targetSkillCode: target.code, bounded: true },
    })
    .select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count")
    .single();
  if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

  return json({
    session,
    resumed: false,
    targetSkill: { id: target.id, code: target.code, nameHy: target.name_hy },
  });
});
