import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import {
  plainObject,
  renderRawTemplate,
  strings,
  validateGuideContent,
} from "../_shared/remediation-authoring-validation.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GuideScope = "skill" | "template";
type LifecycleStatus = "draft" | "review" | "published" | "archived";
type PlainObject = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jwtPayload(token: string): PlainObject {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return plainObject(JSON.parse(atob(padded)));
  } catch {
    return {};
  }
}

function guideContent(value: unknown): PlainObject {
  const source = plainObject(value);
  return {
    skillId: source.skillId ?? null,
    itemTemplateId: source.itemTemplateId ?? null,
    misconceptionCode: String(source.misconceptionCode ?? "").trim(),
    triggerErrorCode: String(source.triggerErrorCode ?? "").trim() || null,
    titleHy: String(source.titleHy ?? "").trim(),
    strategyHy: String(source.strategyHy ?? "").trim(),
    hint1Hy: String(source.hint1Hy ?? "").trim(),
    hint2Hy: String(source.hint2Hy ?? "").trim(),
    workedExampleHy: String(source.workedExampleHy ?? "").trim(),
    allowedParameterKeys: strings(source.allowedParameterKeys),
    metadata: plainObject(source.metadata),
  };
}

function normalizeGuide(row: PlainObject) {
  return {
    guideScope: row.guide_scope,
    guideSourceId: row.guide_source_id,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectNameHy: row.subject_name_hy,
    gradeId: row.grade_id,
    gradeNumber: row.grade_number,
    gradeLabelHy: row.grade_label_hy,
    programmes: row.programmes ?? [],
    units: row.units ?? [],
    skillId: row.skill_id,
    skillCode: row.skill_code,
    skillNameHy: row.skill_name_hy,
    itemTemplateId: row.item_template_id,
    itemTemplateCode: row.item_template_code,
    specializationCode: row.specialization_code,
    runtimeVersion: row.runtime_version,
    runtimeStatus: row.runtime_status,
    runtimeContent: row.runtime_content,
    authoringVersion: row.authoring_version,
    lifecycleStatus: row.lifecycle_status,
    content: row.authoring_content,
    referenceMetadata: row.reference_metadata,
    changeRationale: row.change_rationale,
    actorRole: row.actor_role,
    actorAal: row.actor_aal,
    updatedAt: row.authoring_updated_at,
  };
}

async function loadGuide(admin: any, scope: GuideScope, sourceId: string) {
  const { data, error } = await admin
    .from("remediation_guide_authoring_catalog_v")
    .select("*")
    .eq("guide_scope", scope)
    .eq("guide_source_id", sourceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("guide_not_found");
  return data as PlainObject;
}

async function loadVariants(admin: any, guide: PlainObject) {
  const pageSize = 500;
  const rows: PlainObject[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = admin
      .from("items")
      .select("id, code, prompt_hy, variant_key, variant_parameters, difficulty_band, item_type, item_template_id, skill_id")
      .eq("status", "published")
      .order("code", { ascending: true })
      .range(offset, offset + pageSize - 1);
    query = guide.guide_scope === "template"
      ? query.eq("item_template_id", guide.item_template_id)
      : query.eq("skill_id", guide.skill_id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return rows;
}

async function loadFallbackState(admin: any, guide: PlainObject) {
  if (guide.guide_scope === "skill") {
    const { data: itemRows } = await admin
      .from("items")
      .select("item_template_id")
      .eq("skill_id", guide.skill_id)
      .eq("status", "published");
    const templateIds = [...new Set((itemRows ?? []).map((row: any) => row.item_template_id).filter(Boolean))];
    if (!templateIds.length) return { available: false, reason: "published_items_missing" };
    const { data: defaults } = await admin
      .from("item_template_remediation_guides")
      .select("item_template_id")
      .in("item_template_id", templateIds)
      .is("trigger_error_code", null)
      .eq("status", "published");
    const covered = new Set((defaults ?? []).map((row: any) => row.item_template_id));
    return {
      available: templateIds.every((id) => covered.has(id)),
      reason: templateIds.every((id) => covered.has(id)) ? "template_defaults_cover_all_items" : "skill_fallback_still_required",
    };
  }

  const { data: fallback } = await admin
    .from("skill_remediation_guides")
    .select("id")
    .eq("skill_id", guide.skill_id)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  return { available: Boolean(fallback), reason: fallback ? "skill_fallback_available" : "skill_fallback_missing" };
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
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) {
    return json({ error: "account_or_session_inactive" }, 403);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, account_status")
    .eq("id", userData.user.id)
    .maybeSingle();
  const role = String(profile?.role ?? "");
  if (!profile || profile.account_status !== "active" || !["content_admin", "admin"].includes(role)) {
    return json({ error: "content_authoring_role_required" }, 403);
  }

  let body: PlainObject;
  try {
    body = plainObject(await req.json());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const action = String(body.action ?? "list");
  const aal = String(jwtPayload(token).aal ?? "aal1");

  try {
    if (action === "list") {
      const { data, error } = await admin
        .from("remediation_guide_authoring_catalog_v")
        .select("*")
        .order("subject_code", { ascending: true })
        .order("grade_number", { ascending: true })
        .order("skill_code", { ascending: true })
        .order("guide_scope", { ascending: true })
        .order("item_template_code", { ascending: true, nullsFirst: true });
      if (error) return json({ error: "guide_catalog_failed", detail: error.message }, 500);
      return json({ guides: (data ?? []).map((row: PlainObject) => normalizeGuide(row)), actor: { role, aal } });
    }

    const scope = String(body.guideScope ?? "") as GuideScope;
    const sourceId = String(body.guideSourceId ?? "");
    if (!(["skill", "template"] as string[]).includes(scope) || !sourceId) {
      return json({ error: "guide_identity_required" }, 400);
    }
    const guide = await loadGuide(admin, scope, sourceId);

    if (action === "get") {
      const [{ data: history, error: historyError }, variants, fallback] = await Promise.all([
        admin.from("remediation_guide_authoring_versions")
          .select("id, authoring_version, lifecycle_status, content_snapshot, reference_metadata, change_rationale, actor_role, actor_aal, published_runtime_version, created_at")
          .eq("guide_scope", scope)
          .eq("guide_source_id", sourceId)
          .order("authoring_version", { ascending: false })
          .limit(30),
        loadVariants(admin, guide),
        loadFallbackState(admin, guide),
      ]);
      if (historyError) return json({ error: "guide_history_failed", detail: historyError.message }, 500);
      return json({ guide: normalizeGuide(guide), history: history ?? [], variants, fallback, actor: { role, aal } });
    }

    const content = guideContent(body.content ?? guide.authoring_content);
    const referenceMetadata = plainObject(body.referenceMetadata ?? guide.reference_metadata);
    const variants = await loadVariants(admin, guide);
    const requestedVariantId = String(body.variantId ?? "");
    const variant = (variants as PlainObject[]).find((row) => row.id === requestedVariantId)
      ?? (variants[0] as PlainObject | undefined)
      ?? null;
    const validation = validateGuideContent(scope, content, referenceMetadata, variant);

    if (action === "preview") {
      const params = plainObject(variant?.variant_parameters);
      const allowed = scope === "template" ? strings(content.allowedParameterKeys) : [];
      const render = (field: string) => renderRawTemplate(String(content[field] ?? ""), allowed, params);
      return json({
        preview: {
          variantId: variant?.id ?? null,
          itemCode: variant?.code ?? null,
          itemPromptHy: variant?.prompt_hy ?? null,
          variantKey: variant?.variant_key ?? null,
          rawParameters: params,
          titleHy: render("titleHy"),
          strategyHy: render("strategyHy"),
          hint1Hy: render("hint1Hy"),
          hint2Hy: render("hint2Hy"),
          workedExampleHy: render("workedExampleHy"),
        },
        validation,
      });
    }

    const statusByAction: Record<string, LifecycleStatus> = {
      save_draft: "draft",
      submit_review: "review",
      publish: "published",
      archive: "archived",
    };
    const nextStatus = statusByAction[action];
    if (!nextStatus) return json({ error: "invalid_action" }, 400);
    if (["submit_review", "publish"].includes(action) && validation.errors.length) {
      return json({ error: "guide_validation_failed", validation }, 409);
    }
    if (["publish", "archive"].includes(action) && aal !== "aal2") {
      return json({ error: "mfa_required" }, 403);
    }
    if (action === "archive") {
      const fallback = await loadFallbackState(admin, guide);
      if (!fallback.available) return json({ error: fallback.reason, fallback }, 409);
    }

    const rationale = String(body.changeRationale ?? "").trim();
    const expectedVersion = Number(body.expectedAuthoringVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return json({ error: "expected_authoring_version_required" }, 400);
    }
    if (rationale.length < 3) return json({ error: "change_rationale_required" }, 400);

    const { data, error } = await admin.rpc("service_append_remediation_guide_authoring_version", {
      p_guide_scope: scope,
      p_guide_source_id: sourceId,
      p_expected_authoring_version: expectedVersion,
      p_lifecycle_status: nextStatus,
      p_content_snapshot: content,
      p_reference_metadata: referenceMetadata,
      p_change_rationale: rationale,
      p_actor_id: userData.user.id,
      p_actor_role: role,
      p_actor_aal: aal,
    });
    if (error) return json({ error: "guide_workflow_failed", detail: error.message }, 409);
    return json({ result: data, validation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "guide_not_found" ? 404 : 500;
    return json({ error: message === "guide_not_found" ? message : "guide_authoring_failed", detail: message }, status);
  }
});
