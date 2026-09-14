import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTERY_THRESHOLD = 0.72;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function desiredDifficulty(mastery: number) {
  if (mastery < 0.35) return 1;
  if (mastery < 0.55) return 2;
  if (mastery < MASTERY_THRESHOLD) return 3;
  return 4;
}

async function completeSession(admin: any, session: any, reason: string) {
  const now = new Date().toISOString();
  await admin.from("learning_sessions").update({ status: "completed", completed_at: now, updated_at: now, metadata: { ...(session.metadata ?? {}), completionReason: reason } }).eq("id", session.id);
  return {
    complete: true,
    session: { ...session, status: "completed" },
    summary: {
      answered: Number(session.answered_count),
      correct: Number(session.correct_count),
      planned: Number(session.planned_item_count),
      percent: session.answered_count ? Math.round((Number(session.correct_count) / Number(session.answered_count)) * 100) : 0,
      reason,
    },
  };
}

async function itemPayload(admin: any, session: any, sessionItem: any) {
  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id, code, item_type, prompt_hy, stimulus, difficulty, skill_id")
    .eq("id", sessionItem.item_id)
    .single();
  if (itemError || !item) return null;

  const { data: skill } = await admin
    .from("skills")
    .select("id, code, name_hy, layer")
    .eq("id", item.skill_id)
    .single();

  const { data: options } = await admin
    .from("item_options")
    .select("option_key, content_hy, display_order")
    .eq("item_id", item.id)
    .order("display_order", { ascending: true });

  return {
    complete: false,
    session: {
      id: session.id,
      mode: session.mode,
      status: session.status,
      position: sessionItem.ordinal,
      total: session.planned_item_count,
      answered: session.answered_count,
      correct: session.correct_count,
      feedbackMode: session.mode === "diagnostic" ? "deferred" : "immediate",
    },
    sessionItemId: sessionItem.id,
    skill: skill ? { id: skill.id, code: skill.code, nameHy: skill.name_hy, layer: skill.layer } : null,
    item: {
      id: item.id,
      code: item.code,
      type: item.item_type,
      promptHy: item.prompt_hy,
      stimulus: item.stimulus,
      difficulty: item.difficulty,
      options: options ?? [],
    },
  };
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

  let body: { sessionId?: string } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body.sessionId) return json({ error: "sessionId_required" }, 400);

  const { data: session, error: sessionError } = await admin
    .from("learning_sessions")
    .select("id, student_id, unit_code, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, metadata")
    .eq("id", body.sessionId)
    .eq("student_id", studentId)
    .single();
  if (sessionError || !session) return json({ error: "session_not_found" }, 404);

  if (session.status !== "active") {
    return json({
      complete: true,
      session,
      summary: {
        answered: Number(session.answered_count),
        correct: Number(session.correct_count),
        planned: Number(session.planned_item_count),
        percent: session.answered_count ? Math.round((Number(session.correct_count) / Number(session.answered_count)) * 100) : 0,
        reason: session.metadata?.completionReason ?? "completed",
      },
    });
  }

  const { data: pendingRows } = await admin
    .from("learning_session_items")
    .select("id, ordinal, skill_id, item_id, answered_at, correct")
    .eq("session_id", session.id)
    .is("answered_at", null)
    .order("ordinal", { ascending: true })
    .limit(1);
  if (pendingRows?.length) {
    const payload = await itemPayload(admin, session, pendingRows[0]);
    return payload ? json(payload) : json({ error: "session_item_not_found" }, 500);
  }

  if (Number(session.answered_count) >= Number(session.planned_item_count)) {
    return json(await completeSession(admin, session, "item_limit_reached"));
  }

  if (session.mode === "diagnostic") {
    const { data: nextRows } = await admin
      .from("learning_session_items")
      .select("id, ordinal, skill_id, item_id, answered_at, correct")
      .eq("session_id", session.id)
      .is("answered_at", null)
      .order("ordinal", { ascending: true })
      .limit(1);
    if (!nextRows?.length) return json(await completeSession(admin, session, "diagnostic_complete"));
    const payload = await itemPayload(admin, session, nextRows[0]);
    return payload ? json(payload) : json({ error: "session_item_not_found" }, 500);
  }

  if (!session.target_skill_id) return json({ error: "practice_target_missing" }, 500);

  const { data: masteryRow } = await admin
    .from("student_skill_mastery")
    .select("mastery_score, evidence_count, status")
    .eq("student_id", studentId)
    .eq("skill_id", session.target_skill_id)
    .maybeSingle();
  const masteryScore = masteryRow ? Number(masteryRow.mastery_score) : 0;
  const evidenceCount = masteryRow ? Number(masteryRow.evidence_count) : 0;

  const { data: sessionRows } = await admin
    .from("learning_session_items")
    .select("id, ordinal, item_id, correct, answered_at")
    .eq("session_id", session.id)
    .order("ordinal", { ascending: false });
  const answeredRows = (sessionRows ?? []).filter((r) => r.answered_at);
  const recentFive = answeredRows.slice(0, 5);
  const uniqueSeen = new Set(answeredRows.map((r) => r.item_id)).size;
  const recovered = uniqueSeen >= 4 && recentFive.length >= 5 && recentFive.filter((r) => r.correct).length >= 4;
  const mastered = evidenceCount >= 3 && masteryScore >= MASTERY_THRESHOLD;

  if (mastered || recovered) {
    return json(await completeSession(admin, session, mastered ? "mastery_reached" : "recent_recovery"));
  }

  const { data: candidates, error: itemError } = await admin
    .from("items")
    .select("id, code, item_type, prompt_hy, stimulus, difficulty, skill_id")
    .eq("skill_id", session.target_skill_id)
    .eq("status", "published");
  if (itemError || !candidates?.length) return json({ error: "no_item_for_skill" }, 404);

  const servedCounts = new Map<string, number>();
  const latestByItem = new Map<string, any>();
  for (const row of answeredRows) {
    servedCounts.set(row.item_id, (servedCounts.get(row.item_id) ?? 0) + 1);
    if (!latestByItem.has(row.item_id)) latestByItem.set(row.item_id, row);
  }
  const unseen = candidates.filter((item) => !latestByItem.has(item.id));
  const recentIds = new Set(answeredRows.slice(0, 2).map((r) => r.item_id));
  const unresolved = candidates.filter((item) => latestByItem.get(item.id)?.correct === false);

  let pool = unseen;
  let selectionMode = "new_item";
  if (!pool.length) {
    const nonRecentUnresolved = unresolved.filter((item) => !recentIds.has(item.id));
    pool = nonRecentUnresolved.length ? nonRecentUnresolved : unresolved;
    selectionMode = "remediation";
  }
  if (!pool.length) {
    const nonRecent = candidates.filter((item) => !recentIds.has(item.id));
    pool = nonRecent.length ? nonRecent : candidates;
    selectionMode = "review";
  }

  const goalDifficulty = desiredDifficulty(masteryScore);
  pool.sort((a, b) => {
    const aCount = servedCounts.get(a.id) ?? 0;
    const bCount = servedCounts.get(b.id) ?? 0;
    if (aCount !== bCount) return aCount - bCount;
    const distance = Math.abs(Number(a.difficulty) - goalDifficulty) - Math.abs(Number(b.difficulty) - goalDifficulty);
    if (distance !== 0) return distance;
    return String(a.code).localeCompare(String(b.code));
  });
  const selected = pool[0];
  const maxOrdinal = (sessionRows ?? []).reduce((max, row) => Math.max(max, Number(row.ordinal)), 0);

  const { data: created, error: createError } = await admin
    .from("learning_session_items")
    .insert({ session_id: session.id, ordinal: maxOrdinal + 1, skill_id: session.target_skill_id, item_id: selected.id })
    .select("id, ordinal, skill_id, item_id, answered_at, correct")
    .single();
  if (createError || !created) return json({ error: "practice_item_create_failed" }, 500);

  const payload = await itemPayload(admin, session, created);
  if (!payload) return json({ error: "session_item_not_found" }, 500);
  return json({ ...payload, scheduler: { selectionMode, desiredDifficulty: goalDifficulty, unseenItemsRemaining: unseen.length } });
});
