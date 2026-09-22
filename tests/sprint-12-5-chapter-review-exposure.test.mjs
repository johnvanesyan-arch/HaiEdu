import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/0076_sprint_12_5_chapter_review_exposure_integration.sql");
const getSessionItem = read("supabase/functions/get-session-item/index.ts");
const submitAnswer = read("supabase/functions/submit-answer/index.ts");
const help = read("supabase/functions/get-remediation-help/index.ts");

test("shared item exposure purpose accepts Chapter Review", () => {
  assert.match(
    migration,
    /purpose in \('practice','diagnostic','mastery_check','chapter_review'\)/,
  );
  assert.match(
    migration,
    /ls\.mode in \('practice','diagnostic','mastery_check','chapter_review'\)/,
  );
});

test("Chapter Review serving uses the shared exposure recorder", () => {
  assert.match(getSessionItem, /recordSessionItemExposure/);
  assert.match(getSessionItem, /session\.mode === "chapter_review"/);
});

test("Chapter Review answer and help paths flow through exposure finalization", () => {
  assert.match(submitAnswer, /record_session_graded_attempt/);
  assert.match(submitAnswer, /session\.mode === "chapter_review"/);
  assert.match(help, /\["practice", "chapter_review"\]/);
  assert.match(help, /record_remediation_help_atomic/);
});

test("exposure recorder remains service-role only", () => {
  assert.match(
    migration,
    /revoke all on function public\.service_record_item_exposure\([\s\S]*from public,anon,authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.service_record_item_exposure\([\s\S]*to service_role/,
  );
});
