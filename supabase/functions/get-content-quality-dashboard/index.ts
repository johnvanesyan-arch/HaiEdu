import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const actorId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("role, display_name").eq("id", actorId).maybeSingle();
    if (!profile || !["admin", "content_admin"].includes(String(profile.role))) return json({ error: "content_admin_required" }, 403);

    const { data: items, error: itemError } = await admin
      .from("items")
      .select("id, code, skill_id, item_type, prompt_hy, difficulty, difficulty_band, item_family, source_reference, validation_state, review_status, version_no, status, retired_at, retired_reason, replacement_item_id, updated_at, skills(code, name_hy)")
      .order("code", { ascending: true });
    if (itemError) return json({ error: "items_query_failed", detail: itemError.message }, 500);

    const itemIds = (items ?? []).map((i: any) => i.id);
    const [qaResult, reviewResult, mappingResult, versionResult] = await Promise.all([
      itemIds.length ? admin.from("item_qa_runs").select("item_id, version_no, passed, errors, warnings, created_at").in("item_id", itemIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_reviews").select("item_id, version_no, review_type, decision, notes, created_at").in("item_id", itemIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_misconception_mappings").select("item_id, response_key, misconceptions(code, title_hy)").in("item_id", itemIds) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_versions").select("item_id, version_no, change_summary, created_at").in("item_id", itemIds).order("version_no", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ]);

    const latestBy = (rows: any[], key: string) => {
      const map = new Map<string, any>();
      for (const row of rows) if (!map.has(row[key])) map.set(row[key], row);
      return map;
    };
    const latestQa = latestBy(qaResult.data ?? [], "item_id");
    const latestReview = latestBy(reviewResult.data ?? [], "item_id");
    const latestVersion = latestBy(versionResult.data ?? [], "item_id");
    const misconceptions = new Map<string, any[]>();
    for (const row of mappingResult.data ?? []) {
      const list = misconceptions.get(row.item_id) ?? [];
      list.push({ responseKey: row.response_key, code: row.misconceptions?.code ?? null, titleHy: row.misconceptions?.title_hy ?? null });
      misconceptions.set(row.item_id, list);
    }

    const rows = (items ?? []).map((item: any) => {
      const qa = latestQa.get(item.id) ?? null;
      const review = latestReview.get(item.id) ?? null;
      const version = latestVersion.get(item.id) ?? null;
      return {
        id: item.id,
        code: item.code,
        skill: { id: item.skill_id, code: item.skills?.code ?? null, nameHy: item.skills?.name_hy ?? null },
        type: item.item_type,
        promptHy: item.prompt_hy,
        difficulty: Number(item.difficulty),
        difficultyBand: item.difficulty_band,
        itemFamily: item.item_family,
        sourceReference: item.source_reference,
        validationState: item.validation_state,
        reviewStatus: item.review_status,
        versionNo: Number(item.version_no),
        lifecycleStatus: item.status,
        retiredAt: item.retired_at,
        retiredReason: item.retired_reason,
        replacementItemId: item.replacement_item_id,
        updatedAt: item.updated_at,
        misconceptions: misconceptions.get(item.id) ?? [],
        latestQa: qa ? { passed: qa.passed, errors: qa.errors ?? [], warnings: qa.warnings ?? [], versionNo: qa.version_no, createdAt: qa.created_at } : null,
        latestReview: review ? { decision: review.decision, type: review.review_type, notes: review.notes, versionNo: review.version_no, createdAt: review.created_at } : null,
        latestSnapshot: version ? { versionNo: version.version_no, changeSummary: version.change_summary, createdAt: version.created_at } : null,
      };
    });

    const active = rows.filter((r: any) => !r.retiredAt);
    return json({
      actor: { id: actorId, role: profile.role, displayName: profile.display_name || "Content admin" },
      stats: {
        totalItems: rows.length,
        published: active.filter((r: any) => r.lifecycleStatus === "published").length,
        reviewQueue: active.filter((r: any) => ["needs_review", "in_review", "changes_requested", "unreviewed"].includes(r.reviewStatus)).length,
        approved: active.filter((r: any) => r.reviewStatus === "approved").length,
        qaFailed: active.filter((r: any) => r.latestQa && !r.latestQa.passed).length,
        qaMissing: active.filter((r: any) => !r.latestQa).length,
        retired: rows.filter((r: any) => Boolean(r.retiredAt)).length,
        provisionalSme: active.filter((r: any) => r.validationState === "provisional_no_sme_review").length,
      },
      items: rows,
    });
  } catch (err) {
    console.error("get-content-quality-dashboard", err);
    return json({ error: "content_quality_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
