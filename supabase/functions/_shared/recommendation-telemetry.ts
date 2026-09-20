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
