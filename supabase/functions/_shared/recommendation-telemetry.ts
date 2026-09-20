type IssueRecommendationArgs = {
  admin: any;
  studentId: string;
  policyScope: "dashboard_orchestration" | "core_after_attempt";
  surface: string;
  action: string;
  targetSkillId?: string | null;
  curriculumReleaseId: string;
  assessmentBlueprintId?: string | null;
  learningModelConfigurationId?: string | null;
  modelProvenanceStatus: "exact" | "unbound_legacy";
  learningSessionId?: string | null;
  attemptId?: string | null;
  stateSnapshot?: Record<string, unknown>;
  recommendationSnapshot?: Record<string, unknown>;
};

export async function issueRecommendationEvent(args: IssueRecommendationArgs): Promise<string | null> {
  const recommendationInstanceId = crypto.randomUUID();
  const { error } = await args.admin.from("recommendation_events").insert({
    recommendation_instance_id: recommendationInstanceId,
    student_id: args.studentId,
    event_type: "issued",
    policy_scope: args.policyScope,
    surface: args.surface,
    action: args.action,
    target_skill_id: args.targetSkillId ?? null,
    curriculum_release_id: args.curriculumReleaseId,
    assessment_blueprint_id: args.assessmentBlueprintId ?? null,
    learning_model_configuration_id: args.learningModelConfigurationId ?? null,
    model_provenance_status: args.modelProvenanceStatus,
    learning_session_id: args.learningSessionId ?? null,
    attempt_id: args.attemptId ?? null,
    state_snapshot: args.stateSnapshot ?? {},
    recommendation_snapshot: args.recommendationSnapshot ?? {},
  });

  if (error) {
    console.error("recommendation telemetry issuance failed", error);
    return null;
  }
  return recommendationInstanceId;
}


type ConfirmRecommendationActionArgs = {
  admin: any;
  studentId: string;
  recommendationInstanceId?: string | null;
  learningSessionId: string;
  mode: "diagnostic" | "practice" | "mastery_check";
  targetSkillId?: string | null;
};

export async function confirmRecommendationActionStarted(
  args: ConfirmRecommendationActionArgs,
): Promise<boolean> {
  if (!args.recommendationInstanceId) return false;

  const { data: issued, error: issuedError } = await args.admin
    .from("recommendation_events")
    .select(
      "recommendation_instance_id, student_id, policy_scope, action, target_skill_id, curriculum_release_id, assessment_blueprint_id, learning_model_configuration_id, model_provenance_status, attempt_id, state_snapshot, recommendation_snapshot",
    )
    .eq("recommendation_instance_id", args.recommendationInstanceId)
    .eq("student_id", args.studentId)
    .eq("event_type", "issued")
    .limit(1)
    .maybeSingle();

  if (issuedError || !issued) return false;
  const actionMatches =
    (issued.action === "practice_skill" &&
      args.mode === "practice" &&
      (!issued.target_skill_id || issued.target_skill_id === args.targetSkillId)) ||
    issued.action === "resume_session";
  if (!actionMatches) return false;

  const { error } = await args.admin.from("recommendation_events").insert({
    recommendation_instance_id: issued.recommendation_instance_id,
    student_id: args.studentId,
    event_type: "action_started",
    policy_scope: issued.policy_scope,
    surface: "start_learning_session",
    action: issued.action,
    target_skill_id: issued.target_skill_id,
    curriculum_release_id: issued.curriculum_release_id,
    assessment_blueprint_id: issued.assessment_blueprint_id,
    learning_model_configuration_id: issued.learning_model_configuration_id,
    model_provenance_status: issued.model_provenance_status,
    learning_session_id: args.learningSessionId,
    attempt_id: issued.attempt_id,
    state_snapshot: issued.state_snapshot ?? {},
    recommendation_snapshot: issued.recommendation_snapshot ?? {},
  });
  if (error && error.code !== "23505") {
    console.error("recommendation action confirmation failed", error);
    return false;
  }
  return true;
}

