import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

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
  try {
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
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }

    const actorId = userData.user.id;
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();
    if (!profile || !["admin", "content_admin"].includes(String(profile.role))) {
      return json({ error: "content_admin_required" }, 403);
    }

    let body: { itemId?: string } = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const itemId = String(body.itemId ?? "").trim();
    if (!itemId) return json({ error: "item_id_required" }, 400);

    const { data: item, error: itemError } = await admin
      .from("items")
      .select("id, code, version_no, review_status, status, retired_at")
      .eq("id", itemId)
      .maybeSingle();
    if (itemError || !item) return json({ error: "item_not_found" }, 404);

    const { data: reviewRows, error: reviewError } = await admin
      .from("item_reviews")
      .select("id, version_no, reviewer_id, review_type, decision, notes, created_at")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (reviewError) return json({ error: "review_history_failed", detail: reviewError.message }, 500);

    const reviewerIds = [...new Set((reviewRows ?? []).map((row: any) => row.reviewer_id).filter(Boolean))];
    const reviewerMap = new Map<string, { displayName: string | null; role: string | null }>();
    if (reviewerIds.length) {
      const { data: reviewers } = await admin
        .from("profiles")
        .select("id, display_name, role")
        .in("id", reviewerIds);
      for (const reviewer of reviewers ?? []) {
        reviewerMap.set(String(reviewer.id), {
          displayName: reviewer.display_name ?? null,
          role: reviewer.role ? String(reviewer.role) : null,
        });
      }
    }

    const reviews = (reviewRows ?? []).map((row: any) => {
      const reviewer = row.reviewer_id ? reviewerMap.get(String(row.reviewer_id)) : null;
      return {
        id: row.id,
        versionNo: Number(row.version_no),
        reviewType: row.review_type,
        decision: row.decision,
        notes: row.notes,
        createdAt: row.created_at,
        reviewer: row.reviewer_id ? {
          id: row.reviewer_id,
          displayName: reviewer?.displayName ?? null,
          role: reviewer?.role ?? null,
        } : null,
      };
    });

    const currentVersionChangeRequest = reviews.find((row: any) =>
      row.decision === "changes_requested" && row.versionNo === Number(item.version_no)
    ) ?? null;
    const latestChangeRequest = reviews.find((row: any) => row.decision === "changes_requested") ?? null;

    return json({
      item: {
        id: item.id,
        code: item.code,
        versionNo: Number(item.version_no),
        reviewStatus: item.review_status,
        lifecycleStatus: item.status,
        retiredAt: item.retired_at,
      },
      currentVersionChangeRequest,
      latestChangeRequest,
      reviews,
    });
  } catch (err) {
    console.error("get-content-review-history", err);
    return json({
      error: "content_review_history_failed",
      detail: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
