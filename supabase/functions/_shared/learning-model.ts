export async function resolveRuntimeLearningModel(
  admin: any,
  curriculumReleaseId: string,
  unitCode: string,
): Promise<{ id: string; provenanceStatus: "exact" }> {
  const { data, error } = await admin
    .from("learning_model_runtime_bindings")
    .select("learning_model_configuration_id")
    .eq("curriculum_release_id", curriculumReleaseId)
    .eq("unit_code", unitCode)
    .eq("status", "active")
    .single();

  if (error || !data?.learning_model_configuration_id) {
    throw new Error("learning_model_runtime_binding_missing");
  }

  return {
    id: String(data.learning_model_configuration_id),
    provenanceStatus: "exact",
  };
}
