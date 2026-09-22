import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../supabase/functions/get-mastery-check-status/index.ts", import.meta.url),
  "utf8",
);
const startSource = readFileSync(
  new URL("../supabase/functions/start-learning-session/index.ts", import.meta.url),
  "utf8",
);

test("Sprint 12.5 retry readiness is governed by lifecycle after qualifying Review", () => {
  assert.match(source, /const retryReady = lifecycleState === "mastery_retry_2_ready" \|\| lifecycleState === "mastery_retry_3_ready";/);
  assert.match(source, /const initialGateState = lifecycleState === null \|\| lifecycleState === "mastery_ready";/);
  assert.match(
    source,
    /\(retryReady \|\| \(initialGateState && incompleteSkills\.length === 0\)\)/,
  );
  assert.doesNotMatch(
    source,
    /eligibleState[^;]+incompleteSkills\.length === 0/s,
  );
});

test("required Chapter Review still blocks retries until it qualifies", () => {
  assert.match(source, /let retryBlocked = reviewRequired;/);
  assert.match(source, /review_required_attempt_2/);
  assert.match(source, /review_required_attempt_3/);
});

test("current skill readiness remains an Attempt 1 gate only", () => {
  assert.match(source, /let requiredSkills = initialGateState \? \[\.\.\.incompleteSkills\] : \[\];/);
  assert.match(source, /lifecycleState === null && !incompleteSkills\.length && latest\?\.assessment_result === "failed"/);
});

test("retry-ready UX message outranks initial skill-readiness messaging", () => {
  const retryIndex = source.indexOf(': retryReady\n                ? "Պահանջվող Գլխի կրկնությունն ավարտված է։ Կարող եք կրկին անցնել յուրացման ստուգումը։"');
  const incompleteIndex = source.indexOf(': incompleteSkills.length\n                    ? "Mastery check-ը կբացվի, երբ բոլոր հմտությունները ամրապնդվեն։"');
  assert.ok(retryIndex >= 0, "retry-ready message missing");
  assert.ok(incompleteIndex >= 0, "initial readiness message missing");
  assert.ok(retryIndex < incompleteIndex, "retry-ready message must take precedence over initial skill readiness");
});


test("start-learning-session also treats qualified retry lifecycle as authoritative", () => {
  assert.match(startSource, /const retryReady = lifecycleState === "mastery_retry_2_ready" \|\| lifecycleState === "mastery_retry_3_ready";/);
  assert.match(startSource, /if \(!retryReady && incompleteSkills\.length\)/);
  assert.match(startSource, /reason: "chapter_review_required"/);
  assert.match(startSource, /reason: "mastery_failed_final"/);
});

test("start-learning-session keeps Attempt 1 skill gate while allowing governed retries", () => {
  const gateIndex = startSource.indexOf('if (!retryReady && incompleteSkills.length)');
  const rpcIndex = startSource.indexOf('start_mastery_check_atomic');
  assert.ok(gateIndex >= 0, "conditional skill gate missing");
  assert.ok(rpcIndex > gateIndex, "atomic lifecycle start must remain authoritative after the preflight gate");
});
