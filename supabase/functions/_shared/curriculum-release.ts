import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type CurriculumMode = "diagnostic" | "practice" | "mastery_check" | "chapter_review";

export type CurriculumBlueprintContext = {
  releaseId: string;
  blueprintId: string;
  itemIds: string[];
};

export async function resolveActiveCurriculumRelease(
  admin: SupabaseClient,
  unitCode: string,
): Promise<string> {
  const { data, error } = await admin.rpc("resolve_active_curriculum_release", {
    p_unit_code: unitCode,
  });
  if (error || !data) {
    throw new Error(error?.message ?? `No active curriculum release for ${unitCode}`);
  }
  // This shorthand belongs to the registered legacy adapter. New core callers
  // select programme/release/unit explicitly through governed-learning-runtime.
  const { data: mappings, error: mappingError } = await admin
    .from("legacy_learning_blueprint_mappings")
    .select("unit_id")
    .eq("curriculum_release_id", String(data))
    .eq("unit_code_snapshot", unitCode);
  if (mappingError || !mappings?.length || new Set(mappings.map(row => row.unit_id)).size !== 1) {
    throw new Error("legacy_context_selection_required");
  }
  return String(data);
}

export async function getBlueprintItemIds(
  admin: SupabaseClient,
  blueprintId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("assessment_blueprint_items")
    .select("item_id")
    .eq("assessment_blueprint_id", blueprintId)
    .order("item_code_snapshot", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.item_id));
}

export async function resolveCurriculumBlueprint(
  admin: SupabaseClient,
  unitCode: string,
  mode: CurriculumMode,
): Promise<CurriculumBlueprintContext> {
  const releaseId = await resolveActiveCurriculumRelease(admin, unitCode);
  const { data: mappings, error: mappingError } = await admin
    .from("legacy_learning_blueprint_mappings")
    .select("assessment_blueprint_id, unit_id")
    .eq("curriculum_release_id", releaseId)
    .eq("unit_code_snapshot", unitCode);
  if (mappingError || !mappings?.length) throw new Error("legacy_context_selection_required");
  const { data: blueprint, error } = await admin
    .from("assessment_blueprints")
    .select("id")
    .eq("curriculum_release_id", releaseId)
    .eq("unit_id", mappings[0].unit_id)
    .in("id", mappings.map(row => row.assessment_blueprint_id))
    .eq("purpose", mode)
    .in("status", ["pilot", "production"])
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !blueprint) {
    throw new Error(error?.message ?? `No published ${mode} blueprint for ${unitCode}`);
  }
  const itemIds = await getBlueprintItemIds(admin, String(blueprint.id));
  if (!itemIds.length) throw new Error(`Published ${mode} blueprint has no item membership snapshot`);
  return { releaseId, blueprintId: String(blueprint.id), itemIds };
}
