import { createClient } from "npm:@supabase/supabase-js@2";

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

function desiredDifficulty(mastery: number): number {
  if (mastery < 0.35) return 1;
  if (mastery < 0.55) return 2;
  if (mastery < 0.72) return 3;
  return 4;
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

  let payload: { skillCode?: string } = {};
  try {
    payload = await req.json();
  } catch {
    // Empty body is valid: use scheduler.
  }

  const { data: skills, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, layer, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);

  const { data: masteryRows } = await admin
    .from("student_skill_mastery")
    .select("skill_id, mastery_score, evidence_count, status")
    .eq("student_id", studentId);

  const mastery = new Map(
    (masteryRows ?? []).map((r) => [r.skill_id, {
      score: Number(r.mastery_score),
      evidenceCount: Number(r.evidence_count),
      status: r.status,
    }])
  );

  let target = payload.skillCode ? skills.find((s) => s.code === payload.skillCode) : null;
  if (payload.skillCode && !target) return json({ error: "skill_not_found" }, 404);

  if (!target) {
    for (const skill of skills) {
      const current = mastery.get(skill.id)?.score ?? 0;
      if (current >= 0.72) continue;

      const { data: prereqs } = await admin
        .from("skill_prerequisites")
        .select("prerequisite_skill_id, required_mastery")
        .eq("skill_id", skill.id);

      const unmet = (prereqs ?? []).find(
        (p) => (mastery.get(p.prerequisite_skill_id)?.score ?? 0) < Number(p.required_mastery)
      );

      target = unmet
        ? (skills.find((s) => s.id === unmet.prerequisite_skill_id) ?? skill)
        : skill;
      break;
    }

    target ??= skills[skills.length - 1];
  }

  const targetMastery = mastery.get(target.id) ?? {
    score: 0,
    evidenceCount: 0,
    status: "insufficient_evidence",
  };

  const { data: recentAttempts } = await admin
    .from("attempts")
    .select("item_id")
    .eq("student_id", studentId)
    .eq("skill_id", target.id)
    .order("attempted_at", { ascending: false })
    .limit(3);
  const recentIds = new Set((recentAttempts ?? []).map((r) => r.item_id));

  const { data: candidateItems, error: itemError } = await admin
    .from("items")
    .select("id, code, item_type, prompt_hy, stimulus, difficulty")
    .eq("skill_id", target.id)
    .eq("status", "published");
  if (itemError || !candidateItems?.length) return json({ error: "no_item_for_skill", skillCode: target.code }, 404);

  const goalDifficulty = desiredDifficulty(targetMastery.score);
  const sorted = [...candidateItems].sort((a, b) => {
    const aRecent = recentIds.has(a.id) ? 1 : 0;
    const bRecent = recentIds.has(b.id) ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;
    const aDistance = Math.abs(Number(a.difficulty) - goalDifficulty);
    const bDistance = Math.abs(Number(b.difficulty) - goalDifficulty);
    if (aDistance !== bDistance) return aDistance - bDistance;
    return String(a.code).localeCompare(String(b.code));
  });
  const item = sorted[0];

  const { data: options } = await admin
    .from("item_options")
    .select("option_key, content_hy, display_order")
    .eq("item_id", item.id)
    .order("display_order", { ascending: true });

  return json({
    skill: {
      id: target.id,
      code: target.code,
      nameHy: target.name_hy,
      layer: target.layer,
    },
    progress: targetMastery,
    scheduler: {
      desiredDifficulty: goalDifficulty,
      recentItemsAvoided: recentIds.size,
    },
    item: {
      id: item.id,
      code: item.code,
      type: item.item_type,
      promptHy: item.prompt_hy,
      stimulus: item.stimulus,
      difficulty: item.difficulty,
      options: options ?? [],
    },
  });
});
