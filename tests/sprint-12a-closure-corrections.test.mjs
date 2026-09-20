import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/0052_sprint_12a_closure_corrections.sql", import.meta.url),
  "utf8",
);
const hint = readFileSync(new URL("../supabase/functions/get-remediation-help/index.ts", import.meta.url), "utf8");
const recorder = readFileSync(new URL("../supabase/functions/record-recommendation-event/index.ts", import.meta.url), "utf8");
const starter = readFileSync(new URL("../supabase/functions/start-learning-session/index.ts", import.meta.url), "utf8");

test("session provenance includes a distinct immutable runtime build", () => {
  assert.match(migration, /create table if not exists public\.runtime_builds/);
  assert.match(migration, /runtime_build_id/);
  assert.match(migration, /before update of unit_code, mode, target_skill_id/);
});

test("service role cannot mutate or truncate append-only evidence", () => {
  assert.match(migration, /revoke update, delete, truncate on table[\s\S]*from service_role/);
});

test("hint state and immutable event are committed through one RPC", () => {
  assert.match(migration, /create or replace function public\.record_remediation_help_atomic/);
  assert.match(migration, /update public\.learning_session_items[\s\S]*insert into public\.remediation_events/);
  assert.match(hint, /admin\.rpc\("record_remediation_help_atomic"/);
  assert.doesNotMatch(hint, /from\("learning_session_items"\)\s*\.update/);
});

test("unclassified sessions remain visible and fail closed", () => {
  assert.match(migration, /left join public\.pilot_evidence_classifications/);
  assert.match(migration, /coalesce\(pec\.classification,'unclassified'\)/);
  assert.match(migration, /'classification_pending'/);
});

test("client interaction is clicked and learning start is server-confirmed", () => {
  assert.match(recorder, /"shown" \| "clicked"/);
  assert.doesNotMatch(recorder, /"followed"/);
  assert.match(starter, /confirmRecommendationActionStarted/);
  assert.match(migration, /'action_started'/);
});
