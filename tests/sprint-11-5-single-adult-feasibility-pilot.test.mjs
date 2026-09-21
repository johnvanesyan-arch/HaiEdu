import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/0060_sprint_11_5_single_adult_feasibility_pilot.sql", import.meta.url),
  "utf8",
);

test("pilot enrollment is prospective and historical sessions stay excluded", () => {
  assert.match(migration, /evidence_start_at timestamptz not null/);
  assert.match(migration, /p_started_at >= pp\.evidence_start_at/);
  assert.match(migration, /historicalReviewerSessionsExcluded',true/);
  assert.match(migration, /priorSessionsEligible',false/);
});

test("one learner is explicitly not parameter-tuning authority", () => {
  assert.match(migration, /not sufficient alone for parameter tuning/);
  assert.match(migration, /'parameterTuningAuthorized',false/);
  assert.match(migration, /One learner cannot authorize parameter tuning/);
});

test("compatible classifications require authorized participant membership", () => {
  assert.match(migration, /pilot_evidence_participant_guard/);
  assert.match(migration, /pilot_session_outside_authorized_participant_window/);
  assert.match(migration, /private\.pilot_participant_session_is_eligible/);
});

test("future exact-release sessions are classified automatically", () => {
  assert.match(migration, /learning_sessions_prospective_pilot_classification/);
  assert.match(migration, /on conflict \(pilot_run_id, learning_session_id\) do update/);
  assert.match(migration, /exact_release_noncompleted/);
});

test("participant governance is append-only and browser-inaccessible", () => {
  assert.match(migration, /pilot_participants_immutable/);
  assert.match(migration, /pilot_participant_events_immutable/);
  assert.match(migration, /revoke all on public\.pilot_participants, public\.pilot_participant_events/);
  assert.match(migration, /revoke update, delete, truncate/);
});

