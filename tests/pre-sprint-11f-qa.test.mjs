import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("start-learning-session preserves an active different-mode session", async () => {
  const code = await read("supabase/functions/start-learning-session/index.ts");
  const activeGateStart = code.indexOf("const active = activeSessions?.[0]");
  const skillsStart = code.indexOf("const { data: skills", activeGateStart);
  assert.ok(activeGateStart >= 0 && skillsStart > activeGateStart);

  const gate = code.slice(activeGateStart, skillsStart);
  assert.match(gate, /active_session_conflict/);
  assert.match(gate, /requestedMode:\s*body\.mode/);
  assert.match(gate, /activeSession:\s*active/);
  assert.match(gate, /},\s*409\)/);
  assert.doesNotMatch(gate, /status:\s*"abandoned"/);
  assert.doesNotMatch(gate, /\.update\(/);
});

test("same-mode active session resumes rather than creating a duplicate", async () => {
  const code = await read("supabase/functions/start-learning-session/index.ts");
  assert.match(code, /active\?\.mode === body\.mode[\s\S]*?resumed:\s*true/);
});

test("client task routes retain opposite-mode collision guards", async () => {
  const practice = await read("web/practice.js");
  const diagnostic = await read("web/diagnostic.js");
  const mastery = await read("web/mastery.js");

  assert.match(practice, /session\.mode === "diagnostic"/);
  assert.match(practice, /session\.mode === "mastery_check"/);
  assert.match(diagnostic, /practice\.html/);
  assert.match(diagnostic, /mastery\.html/);
  assert.match(mastery, /active\?\.mode === "mastery_check"/);
});

test("11F checklist continues to require real browser, keyboard and collision QA", async () => {
  const checklist = await read("docs/pilot-browser-qa-checklist.md");
  assert.match(checklist, /Desktop Chromium/);
  assert.match(checklist, /Firefox\/Safari-class/);
  assert.match(checklist, /Keyboard-only/);
  assert.match(checklist, /Armenian overflow/);
  assert.match(checklist, /Session-collision checks/);
});
