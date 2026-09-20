+import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new learning sessions are stamped with immutable model provenance", async () => {
  const sql = await read("supabase/migrations/0048_sprint_12a_session_model_provenance.sql");

  assert.match(sql, /learning_model_runtime_bindings/);
  assert.match(sql, /learning_model_configuration_id uuid/);
  assert.match(sql, /model_provenance_status/);
  assert.match(sql, /stamp_learning_session_model_configuration/);
  assert.match(sql, /before insert on public\.learning_sessions/);
  assert.match(sql, /learning session model provenance is immutable after insert/);
  assert.match(sql, /No historical session is backfilled/);
});

test("remediation guide content is versioned and exact rendered text can be preserved", async () => {
  const sql = await read("supabase/migrations/0049_sprint_12a_remediation_guide_provenance.sql");
  const fn = await read("supabase/functions/get-remediation-help/index.ts");

  assert.match(sql, /create table if not exists public\.remediation_guide_versions/);
  assert.match(sql, /remediation_guide_versions is append-only/);
  assert.match(sql, /skill_remediation_guides_auto_version/);
  assert.match(sql, /item_template_remediation_guides_auto_version/);
  assert.match(sql, /guide_snapshot_id uuid references public\.remediation_guide_versions/);
  assert.match(sql, /rendered_content_hy text/);

  assert.match(fn, /guide_version, misconception_code/);
  assert.match(fn, /rendered_title_hy: renderedTitleHy/);
  assert.match(fn, /rendered_strategy_hy: renderedStrategyHy/);
  assert.match(fn, /rendered_content_hy: contentHy/);
});

test("recommendation telemetry is append-only and provenance-aware", async () => {
  const sql = await read("supabase/migrations/0050_sprint_12a_recommendation_telemetry.sql");
  const closureSql = await read("supabase/migrations/0052_sprint_12a_closure_corrections.sql");
  const dashboard = await read("supabase/functions/get-student-dashboard/index.ts");
  const submit = await read("supabase/functions/submit-answer/index.ts");
  const recorder = await read("supabase/functions/record-recommendation-event/index.ts");

  assert.match(sql, /event_type text not null check \(event_type in \('issued','shown','followed'\)\)/);
  assert.match(closureSql, /event_type in \('issued','shown','clicked','action_started'\)/);
  assert.match(sql, /policy_scope text not null check \(policy_scope in \('dashboard_orchestration','core_after_attempt'\)\)/);
  assert.match(sql, /learning_model_configuration_id/);
  assert.match(sql, /recommendation_events is append-only/);

  assert.match(dashboard, /policyScope: "dashboard_orchestration"/);
  assert.match(dashboard, /modelConfigurationId: learningModel\.id/);
  assert.match(submit, /policyScope: "core_after_attempt"/);
  assert.match(submit, /modelProvenanceStatus/);
  assert.match(recorder, /eventType\?: "shown" \| "clicked"/);
  assert.match(recorder, /\.eq\("student_id", studentId\)/);
});

test("current learner surfaces record shown/clicked recommendations", async () => {
  const paths = [
    "web/physics-7.js",
    "web/practice.js",
    "web/diagnostic.js",
    "web/progress.js",
    "web/multi-subject-home.js",
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /recommendation-telemetry\.js/, `${path} must import recommendation telemetry`);
    assert.match(source, /recordRecommendationTelemetry/, `${path} must record recommendation telemetry`);
  }
});

test("audited evidence contract r2 requires exact model provenance and metric-specific eligibility", async () => {
  const sql = await read("supabase/migrations/0051_sprint_12a_audited_calibration_r2.sql");

  assert.match(sql, /'contract-2026-09-20-r2'/);
  assert.match(sql, /'supersedes', 'contract-2026-09-20-r1'/);
  assert.match(sql, /'sessionModelProvenanceStatusRequired', 'exact'/);
  assert.match(sql, /'sessionModelConfigurationMustMatchReferenceModel', true/);
  assert.match(sql, /'metricEligibility'/);
  assert.match(sql, /'rightCensorNonSecureTrajectories', true/);
  assert.match(sql, /'doNotDropNonCompleters', true/);
  assert.match(sql, /'eligibilityIsMetricSpecificNotSessionStatusGlobal', true/);
  assert.match(sql, /'noUniversalLearnerOrObservationThreshold', true/);
});

test("audited metric set r2 respects clustering and removes universal sample/interval rules", async () => {
  const sql = await read("supabase/migrations/0051_sprint_12a_audited_calibration_r2.sql");

  assert.match(sql, /'metrics-2026-09-20-r2'/);
  assert.match(sql, /'noUniversalCandidateChangeFloor', true/);
  assert.match(sql, /'rawAttemptsAreNotIndependentLearners', true/);
  assert.match(sql, /'primaryAggregationShouldRespectLearnerClustering', true/);
  assert.match(sql, /'universalWilsonIntervalRequired', false/);
  assert.match(sql, /'noSingleNumericThresholdAuthorizesTuning', true/);
  assert.match(sql, /'measurability', 'measurable_for_new_evidence_after_telemetry_activation'/);
  assert.match(sql, /'historicalPreTelemetryInferenceAllowed', false/);
  assert.match(sql, /'hint_level_1_2_3'/);
  assert.match(sql, /'pre_answer_vs_post_error'/);
  assert.match(sql, /'template_vs_skill_guide'/);
  assert.match(sql, /'responseTimeInterpretation', 'operational_signal_only_not_direct_cognitive_difficulty'/);
});
