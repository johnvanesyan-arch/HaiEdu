import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function expectedDifficultyBand(difficulty: number) {
  if (difficulty <= 1) return "foundation";
  if (difficulty <= 3) return "core";
  return "challenge";
}

async function loadItem(admin: any, itemId: string) {
  const { data: item, error } = await admin
    .from("items")
    .select("id, code, skill_id, item_type, prompt_hy, prompt_en, stimulus, difficulty, difficulty_band, item_family, source_reference, validation_state, review_status, version_no, status, retired_at, retired_reason, replacement_item_id, config, updated_at")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("item_not_found");
  return item;
}

async function buildSnapshot(admin: any, item: any) {
  const [{ data: options }, { data: answerKey }, { data: mappings }] = await Promise.all([
    admin.from("item_options").select("option_key, content_hy, content_en, display_order").eq("item_id", item.id).order("display_order", { ascending: true }),
    admin.from("item_answer_keys").select("answer, tolerance, canonical_unit, accepted_units, feedback_code, updated_at").eq("item_id", item.id).maybeSingle(),
    admin.from("item_misconception_mappings").select("response_key, mapping_note, misconceptions(code, title_hy)").eq("item_id", item.id),
  ]);
  return { item, options: options ?? [], answerKey: answerKey ?? null, misconceptions: mappings ?? [] };
}

async function evaluateQa(admin: any, item: any) {
  const [{ data: options }, { data: key }, { data: mappings }, { data: duplicates }] = await Promise.all([
    admin.from("item_options").select("option_key, content_hy, display_order").eq("item_id", item.id).order("display_order", { ascending: true }),
    admin.from("item_answer_keys").select("answer, tolerance, canonical_unit, accepted_units, feedback_code").eq("item_id", item.id).maybeSingle(),
    admin.from("item_misconception_mappings").select("misconception_id, response_key").eq("item_id", item.id),
    admin.from("items").select("id, code").eq("skill_id", item.skill_id).eq("prompt_hy", item.prompt_hy).neq("id", item.id).is("retired_at", null),
  ]);

  const errors: string[] = [];
  const warnings: string[] = [];
  if (!item.code) errors.push("missing_item_code");
  if (!String(item.prompt_hy ?? "").trim()) errors.push("empty_prompt");
  if (!(Number(item.difficulty) >= 1 && Number(item.difficulty) <= 5)) errors.push("invalid_difficulty");
  if (item.difficulty_band !== expectedDifficultyBand(Number(item.difficulty))) errors.push("difficulty_band_mismatch");
  if (!key) errors.push("missing_answer_key");

  if (key) {
    if (item.item_type === "single_choice") {
      if ((options ?? []).length < 2) errors.push("insufficient_options");
      const optionKeys = new Set((options ?? []).map((o: any) => o.option_key));
      if (typeof key.answer !== "string" || !optionKeys.has(key.answer)) errors.push("answer_not_in_options");
    } else if (item.item_type === "true_false") {
      if (typeof key.answer !== "boolean") errors.push("true_false_answer_not_boolean");
    } else if (item.item_type === "numeric") {
      if (typeof key.answer !== "number") errors.push("numeric_answer_not_number");
      if (key.tolerance === null || key.tolerance === undefined) errors.push("numeric_tolerance_missing");
    } else if (item.item_type === "quantity") {
      if (typeof key.answer !== "number") errors.push("numeric_answer_not_number");
      if (key.tolerance === null || key.tolerance === undefined) errors.push("numeric_tolerance_missing");
      if (!key.canonical_unit || !Array.isArray(key.accepted_units) || !key.accepted_units.length) errors.push("quantity_unit_metadata_missing");
      if (key.canonical_unit && Array.isArray(key.accepted_units) && !key.accepted_units.includes(key.canonical_unit)) warnings.push("canonical_unit_not_in_accepted_units");
    } else {
      errors.push("unsupported_item_type");
    }
  }

  if (!item.source_reference) warnings.push("source_reference_missing");
  if (!item.item_family || item.item_family === "unspecified") warnings.push("item_family_unspecified");
  if (item.review_status !== "approved") warnings.push("content_review_not_approved");
  if (item.validation_state === "provisional_no_sme_review") warnings.push("sme_review_pending");
  if (!(mappings ?? []).length) warnings.push("misconception_mapping_missing");
  if ((duplicates ?? []).length) warnings.push("duplicate_prompt_in_skill");

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      optionCount: (options ?? []).length,
      misconceptionMappings: (mappings ?? []).length,
      duplicateCodes: (duplicates ?? []).map((d: any) => d.code),
      expectedDifficultyBand: expectedDifficultyBand(Number(item.difficulty)),
      scope: "technical_structure_and_metadata",
    },
  };
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

    const { data: profile } = await admin.from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (!profile || !["admin", "content_admin"].includes(String(profile.role))) return json({ error: "content_admin_required" }, 403);

    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const action = String(body.action ?? "");
    const itemId = String(body.itemId ?? "");
    if (!itemId) return json({ error: "item_id_required" }, 400);

    let item = await loadItem(admin, itemId);

    if (action === "run_qa") {
      const result = await evaluateQa(admin, item);
      const { data: qa, error } = await admin.from("item_qa_runs").insert({
        item_id: item.id,
        version_no: Number(item.version_no),
        run_by: actorId,
        passed: result.passed,
        errors: result.errors,
        warnings: result.warnings,
        details: result.details,
      }).select("id, passed, errors, warnings, details, created_at").single();
      if (error) return json({ error: "qa_record_failed", detail: error.message }, 500);
      return json({ qa });
    }

    if (action === "update_metadata") {
      const patch: Record<string, unknown> = {};
      if (body.difficulty !== undefined) {
        const difficulty = Number(body.difficulty);
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) return json({ error: "invalid_difficulty" }, 400);
        patch.difficulty = difficulty;
        patch.difficulty_band = expectedDifficultyBand(difficulty);
      }
      if (body.itemFamily !== undefined) patch.item_family = String(body.itemFamily).trim() || "unspecified";
      if (body.sourceReference !== undefined) patch.source_reference = String(body.sourceReference).trim() || null;
      if (body.validationState !== undefined) patch.validation_state = String(body.validationState).trim() || "provisional_no_sme_review";
      if (Object.keys(patch).length) {
        const { error } = await admin.from("items").update(patch).eq("id", item.id);
        if (error) return json({ error: "metadata_update_failed", detail: error.message }, 500);
      }

      if (Array.isArray(body.misconceptionCodes)) {
        const codes = [...new Set(body.misconceptionCodes.map((x: unknown) => String(x).trim()).filter(Boolean))];
        const { data: possible } = codes.length
          ? await admin.from("misconceptions").select("id, code").eq("skill_id", item.skill_id).in("code", codes).eq("status", "active")
          : { data: [] as any[] };
        if ((possible ?? []).length !== codes.length) return json({ error: "invalid_misconception_code" }, 400);
        await admin.from("item_misconception_mappings").delete().eq("item_id", item.id);
        if ((possible ?? []).length) {
          const { error } = await admin.from("item_misconception_mappings").insert((possible ?? []).map((m: any) => ({
            item_id: item.id,
            misconception_id: m.id,
            response_key: "*",
            mapping_note: "Mapped through Sprint 8 content workflow",
          })));
          if (error) return json({ error: "misconception_mapping_failed", detail: error.message }, 500);
        }
      }
      item = await loadItem(admin, item.id);
      return json({ item });
    }

    if (action === "snapshot_revision") {
      const nextVersion = Number(item.version_no) + 1;
      const snapshot = await buildSnapshot(admin, item);
      const { error: versionError } = await admin.from("item_versions").insert({
        item_id: item.id,
        version_no: nextVersion,
        snapshot,
        change_summary: String(body.changeSummary ?? "Content revision").trim(),
        created_by: actorId,
      });
      if (versionError) return json({ error: "version_snapshot_failed", detail: versionError.message }, 500);
      const { error: itemError } = await admin.from("items").update({ version_no: nextVersion, review_status: "needs_review", status: "review" }).eq("id", item.id);
      if (itemError) return json({ error: "version_increment_failed", detail: itemError.message }, 500);
      return json({ itemId: item.id, versionNo: nextVersion });
    }

    if (action === "submit_review") {
      const { data: qa } = await admin.from("item_qa_runs").select("passed, version_no, created_at").eq("item_id", item.id).eq("version_no", item.version_no).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!qa?.passed) return json({ error: "technical_qa_must_pass_before_review" }, 409);
      const { error: reviewError } = await admin.from("item_reviews").insert({
        item_id: item.id,
        version_no: item.version_no,
        reviewer_id: actorId,
        review_type: body.reviewType ?? "content",
        decision: "submitted",
        notes: body.notes ?? null,
      });
      if (reviewError) return json({ error: "review_submit_failed", detail: reviewError.message }, 500);
      await admin.from("items").update({ review_status: "in_review", status: "review" }).eq("id", item.id);
      return json({ submitted: true, versionNo: item.version_no });
    }

    if (action === "approve") {
      const { data: qa } = await admin.from("item_qa_runs").select("passed, version_no, created_at").eq("item_id", item.id).eq("version_no", item.version_no).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!qa?.passed) return json({ error: "technical_qa_must_pass_before_approval" }, 409);
      const now = new Date().toISOString();
      const { error: reviewError } = await admin.from("item_reviews").insert({
        item_id: item.id,
        version_no: item.version_no,
        reviewer_id: actorId,
        review_type: body.reviewType ?? "content",
        decision: "approved",
        notes: body.notes ?? null,
      });
      if (reviewError) return json({ error: "review_approval_failed", detail: reviewError.message }, 500);
      const { error: itemError } = await admin.from("items").update({
        review_status: "approved",
        last_reviewed_at: now,
        last_reviewed_by: actorId,
        status: item.retired_at ? "archived" : "published",
      }).eq("id", item.id);
      if (itemError) return json({ error: "item_approval_update_failed", detail: itemError.message }, 500);
      return json({ approved: true, versionNo: item.version_no });
    }

    if (action === "request_changes") {
      const { error: reviewError } = await admin.from("item_reviews").insert({
        item_id: item.id,
        version_no: item.version_no,
        reviewer_id: actorId,
        review_type: body.reviewType ?? "content",
        decision: "changes_requested",
        notes: body.notes ?? null,
      });
      if (reviewError) return json({ error: "changes_request_failed", detail: reviewError.message }, 500);
      await admin.from("items").update({ review_status: "changes_requested", status: "review" }).eq("id", item.id);
      return json({ changesRequested: true });
    }

    if (action === "retire") {
      const reason = String(body.reason ?? "").trim();
      if (!reason) return json({ error: "retirement_reason_required" }, 400);
      const replacementItemId: string | null = body.replacementItemId ? String(body.replacementItemId) : null;
      if (replacementItemId) {
        if (replacementItemId === item.id) return json({ error: "replacement_cannot_be_same_item" }, 400);
        const replacement = await loadItem(admin, replacementItemId);
        if (replacement.skill_id !== item.skill_id) return json({ error: "replacement_skill_mismatch" }, 409);
        if (replacement.retired_at || replacement.status !== "published") return json({ error: "replacement_not_active_published" }, 409);
        const { data: qa } = await admin.from("item_qa_runs").select("passed").eq("item_id", replacement.id).eq("version_no", replacement.version_no).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!qa?.passed) return json({ error: "replacement_qa_not_passed" }, 409);
      }
      const { error } = await admin.from("items").update({
        retired_at: new Date().toISOString(),
        retired_reason: reason,
        replacement_item_id: replacementItemId,
        status: "archived",
      }).eq("id", item.id);
      if (error) return json({ error: "item_retirement_failed", detail: error.message }, 500);
      return json({ retired: true, replacementItemId });
    }

    if (action === "restore") {
      const { error } = await admin.from("items").update({
        retired_at: null,
        retired_reason: null,
        replacement_item_id: null,
        status: "review",
        review_status: "needs_review",
      }).eq("id", item.id);
      if (error) return json({ error: "item_restore_failed", detail: error.message }, 500);
      return json({ restored: true, requiresReview: true });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("manage-content-quality", err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message === "item_not_found" ? "item_not_found" : "content_quality_action_failed", detail: message }, message === "item_not_found" ? 404 : 500);
  }
});
