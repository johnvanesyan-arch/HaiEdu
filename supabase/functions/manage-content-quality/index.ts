import {validateArrangementKey} from '../_shared/arrangement-responses.mjs';
import { validateTypedKey } from '../_shared/typed-fields.mjs';
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

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

const PROSPECTIVE_AUTHORING_PROFILE = "haiedu-evidence-blueprint-v1";
const ALLOWED_EVIDENCE_PURPOSES = new Set([
  "core_understanding",
  "application",
  "misconception_diagnosis",
  "transfer_reasoning",
]);

function buildFamilyStateFingerprint(template: any, siblingItems: any[]) {
  const requiredEvidencePurposes = Array.isArray(template?.generation_config?.requiredEvidencePurposes)
    ? template.generation_config.requiredEvidencePurposes.map((value: unknown) => String(value))
    : [];
  const familyMembers = siblingItems
    .map((sibling: any) => ({
      id: String(sibling.id),
      versionNo: Number(sibling.version_no),
      evidencePurpose: String(sibling.config?.evidencePurpose ?? ""),
    }))
    .sort((a: any, b: any) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    .map((sibling: any) => `${sibling.id}:${sibling.versionNo}:${sibling.evidencePurpose}`)
    .join(",");

  return [
    "haiedu-family-state-v1",
    String(template?.id ?? ""),
    String(Number(template?.template_version ?? 0)),
    String(template?.generation_config?.authoringProfileVersion ?? ""),
    String(template?.generation_config?.evidenceBlueprintPolicy ?? ""),
    requiredEvidencePurposes.join(","),
    template?.generation_config?.enforceUniqueEvidencePurposes === true ? "1" : "0",
    familyMembers,
  ].join("|");
}

async function loadItem(admin: any, itemId: string) {
  const { data: item, error } = await admin
    .from("items")
    .select("id, code, skill_id, item_type, prompt_hy, prompt_en, stimulus, difficulty, difficulty_band, item_family, source_reference, validation_state, review_status, version_no, status, retired_at, retired_reason, replacement_item_id, config, updated_at, item_template_id, variant_key, variant_seed, variant_parameters, variant_fingerprint")
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

// Authoring attachments live in reviewer-only version history, never in learner
// stimuli or item config. The config contains only the immutable version pointer.
async function loadAuthoringReview(admin: any, item: any) {
  const reference = item.config?.authoringReview;
  if (reference === undefined) return null;
  if (reference?.schemaVersion !== "haiedu-authoring-review-v1" ||
      !Number.isInteger(reference.snapshotVersion) || reference.snapshotVersion < 1 ||
      reference.snapshotVersion > Number(item.version_no)) throw new Error("authoring_review_unavailable");
  const { data, error } = await admin.from("item_versions").select("snapshot")
    .eq("item_id", item.id).eq("version_no", reference.snapshotVersion).maybeSingle();
  const context = data?.snapshot?.authoringReview;
  if (error || context?.schemaVersion !== reference.schemaVersion || context.itemCode !== item.code ||
      context.version !== reference.snapshotVersion) throw new Error("authoring_review_unavailable");
  return context;
}

async function authoringSourceRegistered(admin: any, item: any, context: any) {
  if (!context?.source) return true;
  if (item.stimulus?.kind !== "task_set") return false;
  const { data, error } = await admin.from("learning_task_set_versions")
    .select("source_family_id,stimulus,revoked_at").eq("id", item.stimulus.taskSetVersionId).maybeSingle();
  return !error && Boolean(data) && !data.revoked_at &&
    data.source_family_id === context.source.familyId &&
    data.stimulus?.kind === (context.source.kind === "listening" ? "audio" : "text");
}

async function loadEditorDetail(admin: any, item: any) {
  const [snapshot, templateResult, misconceptionResult, poolResult, authoringReview] = await Promise.all([
    buildSnapshot(admin, item),
    admin.from("item_templates").select("id, code, template_kind, template_version, generation_config, item_families(code, skill_id)").eq("id", item.item_template_id).maybeSingle(),
    admin.from("misconceptions").select("id, code, title_hy, description_hy, status").eq("skill_id", item.skill_id).eq("status", "active").order("code", { ascending: true }),
    admin.from("assessment_pool_items").select("enabled, metadata, assessment_pools(code, purpose, is_protected, status)").eq("item_id", item.id),
    loadAuthoringReview(admin, item),
  ]);

  const template = templateResult.data ?? null;
  const generatedLocked = Boolean(item.variant_seed) && ["parameterized", "parallel"].includes(String(template?.template_kind ?? ""));
  const misconceptions = (snapshot.misconceptions ?? []).map((row: any) => ({
    code: row.misconceptions?.code ?? null,
    titleHy: row.misconceptions?.title_hy ?? null,
    responseKey: row.response_key ?? "*",
    mappingNote: row.mapping_note ?? null,
  }));
  const pools = (poolResult.data ?? []).map((row: any) => ({
    code: row.assessment_pools?.code ?? null,
    purpose: row.assessment_pools?.purpose ?? null,
    protected: Boolean(row.assessment_pools?.is_protected),
    poolStatus: row.assessment_pools?.status ?? null,
    enabled: Boolean(row.enabled),
    metadata: row.metadata ?? {},
  }));

  return {
    item: {
      id: item.id,
      code: item.code,
      type: item.item_type,
      promptHy: item.prompt_hy,
      promptEn: item.prompt_en,
      stimulus: item.stimulus ?? {},
      difficulty: Number(item.difficulty),
      difficultyBand: item.difficulty_band,
      itemFamily: item.item_family,
      sourceReference: item.source_reference,
      validationState: item.validation_state,
      reviewStatus: item.review_status,
      versionNo: Number(item.version_no),
      lifecycleStatus: item.status,
      retiredAt: item.retired_at,
      config: item.config ?? {},
      variantKey: item.variant_key,
      variantSeed: item.variant_seed,
      variantParameters: item.variant_parameters ?? {},
      variantFingerprint: item.variant_fingerprint,
    },
    options: (snapshot.options ?? []).map((o: any) => ({ key: o.option_key, contentHy: o.content_hy, contentEn: o.content_en, displayOrder: o.display_order })),
    answerKey: snapshot.answerKey ? {
      answer: snapshot.answerKey.answer,
      tolerance: snapshot.answerKey.tolerance,
      canonicalUnit: snapshot.answerKey.canonical_unit,
      acceptedUnits: snapshot.answerKey.accepted_units ?? [],
      feedbackCode: snapshot.answerKey.feedback_code,
    } : null,
    authoringReview: authoringReview ? { ...authoringReview, sourceRegistered: await authoringSourceRegistered(admin, item, authoringReview) } : null,
    misconceptions,
    availableMisconceptions: misconceptionResult.data ?? [],
    pools,
    template: template ? {
      id: template.id,
      code: template.code,
      kind: template.template_kind,
      version: template.template_version,
      generationConfig: template.generation_config ?? {},
      familyCode: template.item_families?.code ?? null,
    } : null,
    editing: {
      contentEditable: !generatedLocked && !item.retired_at,
      reason: item.retired_at ? "retired_item_not_editable" : generatedLocked ? "generated_variant_requires_template_edit" : null,
      itemCodeImmutable: true,
      skillImmutable: true,
      itemTypeImmutable: true,
    },
  };
}

async function evaluateQa(admin: any, item: any) {
  const [{ data: options }, { data: key }, { data: mappings }, { data: duplicates }, { data: template }, authoringReview] = await Promise.all([
    admin.from("item_options").select("option_key, content_hy, display_order").eq("item_id", item.id).order("display_order", { ascending: true }),
    admin.from("item_answer_keys").select("answer, tolerance, canonical_unit, accepted_units, feedback_code").eq("item_id", item.id).maybeSingle(),
    admin.from("item_misconception_mappings").select("misconception_id, response_key").eq("item_id", item.id),
    admin.from("items").select("id, code").eq("skill_id", item.skill_id).eq("prompt_hy", item.prompt_hy).neq("id", item.id).is("retired_at", null),
    item.item_template_id
      ? admin.from("item_templates").select("id, code, template_kind, template_version, generation_config").eq("id", item.item_template_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadAuthoringReview(admin, item),
  ]);

  const errors: string[] = [];
  const warnings: string[] = [];
  let generatedVerification: Record<string, unknown> | null = null;
  let answerPositionDistribution: Record<string, unknown> | null = null;
  let evidenceBlueprintVerification: Record<string, unknown> | null = null;

  if (!item.code) errors.push("missing_item_code");
  if (!String(item.prompt_hy ?? "").trim()) errors.push("empty_prompt");
  if (!(Number(item.difficulty) >= 1 && Number(item.difficulty) <= 5)) errors.push("invalid_difficulty");
  if (item.difficulty_band !== expectedDifficultyBand(Number(item.difficulty))) errors.push("difficulty_band_mismatch");
  if (!key) errors.push("missing_answer_key");

  // Draft source text is useful for review, but is not a registered stimulus.
  // Approval re-runs this check; a stale passing QA record cannot clear the hold.
  if (!(await authoringSourceRegistered(admin, item, authoringReview))) errors.push("authoring_source_registration_pending");

  const authoringProfileVersion = String(template?.generation_config?.authoringProfileVersion ?? "");
  if (authoringProfileVersion === PROSPECTIVE_AUTHORING_PROFILE) {
    const evidencePurpose = String(item.config?.evidencePurpose ?? "");
    const requiredEvidencePurposes = Array.isArray(template?.generation_config?.requiredEvidencePurposes)
      ? [...new Set(template.generation_config.requiredEvidencePurposes.map((value: unknown) => String(value)))]
      : [];

    if (!evidencePurpose) errors.push("evidence_purpose_missing");
    else if (!ALLOWED_EVIDENCE_PURPOSES.has(evidencePurpose)) errors.push("evidence_purpose_invalid");

    if (!requiredEvidencePurposes.length || requiredEvidencePurposes.some((purpose) => !ALLOWED_EVIDENCE_PURPOSES.has(purpose))) {
      errors.push("family_evidence_blueprint_invalid");
    }

    const { data: siblingEvidenceItems, error: siblingEvidenceError } = await admin
      .from("items")
      .select("id, code, version_no, config")
      .eq("item_template_id", item.item_template_id)
      .is("retired_at", null);

    if (siblingEvidenceError) {
      errors.push("family_evidence_blueprint_check_failed");
    } else {
      const purposeCounts: Record<string, number> = {};
      const missingPurposeItemCodes: string[] = [];
      const invalidPurposeItemCodes: string[] = [];

      for (const sibling of siblingEvidenceItems ?? []) {
        const siblingPurpose = String(sibling.config?.evidencePurpose ?? "");
        if (!siblingPurpose) {
          missingPurposeItemCodes.push(String(sibling.code ?? sibling.id));
          continue;
        }
        if (!ALLOWED_EVIDENCE_PURPOSES.has(siblingPurpose)) {
          invalidPurposeItemCodes.push(String(sibling.code ?? sibling.id));
          continue;
        }
        purposeCounts[siblingPurpose] = (purposeCounts[siblingPurpose] ?? 0) + 1;
      }

      const missingRequiredPurposes = requiredEvidencePurposes.filter((purpose) => !purposeCounts[purpose]);
      const duplicatePurposes = Object.entries(purposeCounts)
        .filter(([, count]) => count > 1)
        .map(([purpose]) => purpose);
      const familyStateFingerprint = buildFamilyStateFingerprint(template, siblingEvidenceItems ?? []);

      if (missingPurposeItemCodes.length) errors.push("family_evidence_purpose_missing");
      if (invalidPurposeItemCodes.length) errors.push("family_evidence_purpose_invalid");
      if (missingRequiredPurposes.length) errors.push("family_evidence_blueprint_incomplete");
      const enforceUniqueEvidencePurposes = template?.generation_config?.enforceUniqueEvidencePurposes === true;
      if (enforceUniqueEvidencePurposes && duplicatePurposes.length) errors.push("family_evidence_purpose_duplicate");

      evidenceBlueprintVerification = {
        policyVersion: PROSPECTIVE_AUTHORING_PROFILE,
        evidenceBlueprintPolicy: template?.generation_config?.evidenceBlueprintPolicy ?? null,
        itemEvidencePurpose: evidencePurpose || null,
        requiredEvidencePurposes,
        enforceUniqueEvidencePurposes,
        purposeCounts,
        missingRequiredPurposes,
        duplicatePurposes,
        missingPurposeItemCodes,
        invalidPurposeItemCodes,
        familyStateFingerprint,
      };
    }
  }

  if (key) {
    if (item.item_type === "single_choice") {
      if ((options ?? []).length < 2) errors.push("insufficient_options");
      const optionKeys = new Set((options ?? []).map((o: any) => o.option_key));
      if (typeof key.answer !== "string" || !optionKeys.has(key.answer)) errors.push("answer_not_in_options");

      const shuffleOptions = item.config?.shuffleOptions !== false;
      const optionOrderRationale = String(item.config?.optionOrderRationale ?? "").trim();
      if (!shuffleOptions && !optionOrderRationale) {
        errors.push("shuffle_disabled_without_option_order_rationale");
      }
    } else if (["matching","ordering"].includes(item.item_type)) {
      try { validateArrangementKey(item.item_type,item.config?.responseDefinition,key.answer); }
      catch { errors.push("arrangement_contract_invalid"); }
      if ((options ?? []).length) errors.push("arrangement_contract_invalid");
    } else if (item.item_type === "typed_fields") {
      try { validateTypedKey(item.config?.responseDefinition, key.answer); }
      catch { errors.push("typed_fields_contract_invalid"); }
      if ((options ?? []).length) errors.push("typed_fields_contract_invalid");
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

  if (item.item_type === "single_choice" && item.item_template_id) {
    const { data: siblingItems, error: siblingItemsError } = await admin
      .from("items")
      .select("id, code")
      .eq("item_template_id", item.item_template_id)
      .eq("item_type", "single_choice")
      .is("retired_at", null);

    if (siblingItemsError) {
      errors.push("answer_position_distribution_check_failed");
    } else {
      const siblingIds = (siblingItems ?? []).map((sibling: any) => String(sibling.id));
      const { data: siblingAnswerKeys, error: siblingAnswerKeysError } = siblingIds.length
        ? await admin.from("item_answer_keys").select("item_id, answer").in("item_id", siblingIds)
        : { data: [], error: null };

      if (siblingAnswerKeysError || (siblingAnswerKeys ?? []).length !== siblingIds.length) {
        errors.push("answer_position_distribution_check_failed");
      } else {
        const optionKeys = [...new Set((options ?? []).map((option: any) => String(option.option_key)))];
        const counts = Object.fromEntries(optionKeys.map((optionKey) => [optionKey, 0])) as Record<string, number>;
        const unrecognizedAnswers: string[] = [];
        for (const siblingKey of siblingAnswerKeys ?? []) {
          const answer = typeof siblingKey.answer === "string" ? siblingKey.answer : String(siblingKey.answer ?? "");
          if (!(answer in counts)) unrecognizedAnswers.push(answer);
          else counts[answer] += 1;
        }

        const familyItemCount = siblingIds.length;
        const missingPositions = optionKeys.filter((optionKey) => counts[optionKey] === 0);
        const maximumPositionCount = Math.max(0, ...Object.values(counts));
        const maximumPositionShare = familyItemCount ? maximumPositionCount / familyItemCount : 0;
        const fullRotationExpected = familyItemCount >= optionKeys.length && optionKeys.length >= 2;
        const imbalanced = unrecognizedAnswers.length > 0 || (
          familyItemCount >= 4 && (
            (fullRotationExpected && missingPositions.length > 0) ||
            maximumPositionShare > 0.5
          )
        );

        if (imbalanced) warnings.push("answer_position_distribution_imbalanced");
        answerPositionDistribution = {
          scope: "item_template",
          templateCode: template?.code ?? null,
          familyItemCount,
          optionKeys,
          counts,
          missingPositions,
          maximumPositionCount,
          maximumPositionShare,
          unrecognizedAnswers,
          policyVersion: "family-balanced-v1",
          severity: "warning",
          imbalanced,
        };
      }
    }
  }

  if (template && ["parameterized", "parallel"].includes(String(template.template_kind))) {
    if (!item.variant_seed) {
      errors.push("generated_variant_seed_missing");
    } else {
      const { data: preview, error: previewError } = await admin.rpc("service_preview_item_variant", {
        p_template_code: template.code,
        p_seed: item.variant_seed,
      });
      if (previewError || !preview) {
        errors.push("generated_variant_preview_failed");
      } else {
        const promptMatches = preview.promptHy === item.prompt_hy;
        const parametersMatch = sameJson(preview.parameters, item.variant_parameters);
        const fingerprintMatches = preview.semanticFingerprint === item.variant_fingerprint;
        const answerMatches = key ? sameJson(preview.answer, key.answer) : false;
        const generatorQaValid = preview.qa?.valid === true;

        if (!promptMatches) errors.push("generated_prompt_not_reproducible");
        if (!parametersMatch) errors.push("generated_parameters_not_reproducible");
        if (!fingerprintMatches) errors.push("generated_fingerprint_not_reproducible");
        if (key && !answerMatches) errors.push("generated_answer_not_reproducible");
        if (!generatorQaValid) errors.push("generated_variant_generator_qa_failed");

        generatedVerification = {
          templateCode: template.code,
          templateKind: template.template_kind,
          templateVersion: template.template_version,
          seed: item.variant_seed,
          promptMatches,
          parametersMatch,
          fingerprintMatches,
          answerMatches,
          generatorQaValid,
        };
      }
    }
  }

  const misconceptionMappingPolicy = String(template?.generation_config?.misconceptionMappingPolicy ?? "");
  const mappedResponseKeys = new Set((mappings ?? []).map((mapping: any) => String(mapping.response_key ?? "*")));
  const correctResponseKey = typeof key?.answer === "string" ? key.answer : null;
  const missingMisconceptionResponseKeys = misconceptionMappingPolicy === "all_distractors" && item.item_type === "single_choice"
    ? (options ?? [])
      .map((option: any) => String(option.option_key))
      .filter((optionKey: string) => optionKey !== correctResponseKey)
      .filter((optionKey: string) => !mappedResponseKeys.has(optionKey) && !mappedResponseKeys.has("*"))
    : [];

  if (!item.source_reference) warnings.push("source_reference_missing");
  if (!item.item_family || item.item_family === "unspecified") warnings.push("item_family_unspecified");
  if (missingMisconceptionResponseKeys.length) errors.push("misconception_mapping_incomplete");
  else if (!(mappings ?? []).length) warnings.push("misconception_mapping_missing");
  if ((duplicates ?? []).length) warnings.push("duplicate_prompt_in_skill");

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      optionCount: (options ?? []).length,
      misconceptionMappings: (mappings ?? []).length,
      misconceptionMappingPolicy: misconceptionMappingPolicy || null,
      missingMisconceptionResponseKeys,
      duplicateCodes: (duplicates ?? []).map((d: any) => d.code),
      expectedDifficultyBand: expectedDifficultyBand(Number(item.difficulty)),
      generatedVerification,
      answerPositionDistribution,
      evidenceBlueprintVerification,
      scope: "technical_structure_metadata_generated_variant_answer_position_and_evidence_blueprint_quality",
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

    if (action === "preview_generated_variant" || action === "materialize_generated_variant") {
      const templateCode = String(body.templateCode ?? "").trim();
      const seed = String(body.seed ?? "").trim();
      if (!templateCode) return json({ error: "template_code_required" }, 400);
      if (!seed) return json({ error: "variant_seed_required" }, 400);

      const rpc = action === "preview_generated_variant" ? "service_preview_item_variant" : "service_materialize_item_variant";
      const { data, error } = await admin.rpc(rpc, { p_template_code: templateCode, p_seed: seed });
      if (error) return json({ error: action === "preview_generated_variant" ? "variant_preview_failed" : "variant_materialization_failed", detail: error.message }, 409);
      return json({ variant: data });
    }

    const itemId = String(body.itemId ?? "");
    if (!itemId) return json({ error: "item_id_required" }, 400);
    let item = await loadItem(admin, itemId);

    if (action === "get_item_detail") {
      return json({ detail: await loadEditorDetail(admin, item) });
    }

    if (action === "save_content_revision") {
      const incomingPayload = body.payload && typeof body.payload === "object" ? body.payload : null;
      if (!incomingPayload) return json({ error: "revision_payload_required" }, 400);
      const payload = { ...incomingPayload };
      delete payload.validationState;
      const { data, error } = await admin.rpc("service_save_item_content_revision", {
        p_item_id: item.id,
        p_actor_id: actorId,
        p_payload: payload,
      });
      if (error) return json({ error: "content_revision_failed", detail: error.message }, 409);
      return json({ revision: data });
    }

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
      if (body.validationState !== undefined) {
        return json({
          error: "sme_validation_managed_separately",
          detail: "Մասնագիտական (SME) վավերացման կարգավիճակը Content Reviewer-ի մետատվյալների գործողությամբ չի փոխվում։",
        }, 409);
      }
      const patch: Record<string, unknown> = {};
      if (body.difficulty !== undefined) {
        const difficulty = Number(body.difficulty);
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) return json({ error: "invalid_difficulty" }, 400);
        patch.difficulty = difficulty;
        patch.difficulty_band = expectedDifficultyBand(difficulty);
      }
      if (body.itemFamily !== undefined) patch.item_family = String(body.itemFamily).trim() || "unspecified";
      if (body.sourceReference !== undefined) patch.source_reference = String(body.sourceReference).trim() || null;
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
      const liveApprovalQa = await evaluateQa(admin, item);
      if (!liveApprovalQa.passed) {
        return json({
          error: "technical_qa_must_pass_before_approval",
          detail: "family_state_changed_since_qa",
          requiresQaRerun: true,
          errors: liveApprovalQa.errors,
          warnings: liveApprovalQa.warnings,
          details: liveApprovalQa.details,
        }, 409);
      }
      const { data: approval, error: approvalError } = await admin.rpc("approve_item_if_family_qa_current", {
        p_item_id: item.id,
        p_actor_id: actorId,
        p_review_type: body.reviewType ?? "content",
        p_notes: body.notes ?? null,
      });
      if (approvalError) return json({ error: "item_approval_failed", detail: approvalError.message }, 500);
      if (!approval?.approved) {
        return json({
          error: approval?.error ?? "technical_qa_must_pass_before_approval",
          detail: approval?.detail ?? "family_state_changed_since_qa",
          requiresQaRerun: Boolean(approval?.requiresQaRerun),
          errors: liveApprovalQa.errors,
          warnings: liveApprovalQa.warnings,
          details: liveApprovalQa.details,
        }, 409);
      }
      return json(approval);
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
