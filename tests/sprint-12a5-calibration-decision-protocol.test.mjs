import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/0058_sprint_12a5_calibration_decision_protocol.sql", import.meta.url),
  "utf8",
);

test("12A.5 protocol captures the complete decision sequence", () => {
  for (const step of [
    "state_hypothesis",
    "identify_eligible_evidence",
    "report_sample_size_distribution_and_limitations",
    "compare_baseline_and_candidate_behavior",
    "record_expected_side_effects",
    "approve_reject_no_change_or_defer",
    "version_configuration_if_approved",
    "preserve_historical_interpretation",
  ]) assert.match(migration, new RegExp(`'${step}'`));
});

test("insufficient evidence has explicit no-change and defer outcomes", () => {
  assert.match(migration, /'no_change','deferred'/);
  assert.match(migration, /noAutomaticApprovalFromCounts', true/);
  assert.match(migration, /false automatically_sufficient/);
});

test("decisions are immutable and unavailable to browser roles", () => {
  assert.match(migration, /revoke all on public\.calibration_change_decisions from public, anon, authenticated/);
  assert.match(migration, /revoke update, delete, truncate on public\.calibration_change_decisions from service_role/);
  assert.match(migration, /calibration_change_decisions_immutable/);
});

test("approval requires a distinct approved successor of the baseline", () => {
  assert.match(migration, /approved_model_configuration_id <> baseline_model_configuration_id/);
  assert.match(migration, /approved_row\.configuration_kind <> 'approved'/);
  assert.match(migration, /approved_row\.predecessor_id is distinct from baseline_row\.id/);
  assert.match(migration, /approved_row\.snapshot_fingerprint = baseline_row\.snapshot_fingerprint/);
});

test("decision evidence is bound to the immutable analysis scope", () => {
  assert.match(migration, /decision baseline must match the analysis scope contract baseline/);
  assert.match(migration, /eligible evidence provenance must match the bound analysis scope/);
  assert.match(migration, /calibration_decision_evidence_snapshot_v/);
  assert.match(migration, /human_metric_specific_review_required/);
});

