import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("recent recovery remains hint-aware across dashboard and session gates", async () => {
  const dashboard = await read("supabase/functions/get-student-dashboard/index.ts");
  const sessionItem = await read("supabase/functions/get-session-item/index.ts");
  const startSession = await read("supabase/functions/start-learning-session/index.ts");

  assert.match(
    dashboard,
    /select\("skill_id, item_id, correct, hint_used, created_at"\)/,
    "dashboard must load hint_used for recovery decisions",
  );
  assert.match(
    dashboard,
    /recent\.filter\(\(a\) => a\.correct && !a\.hint_used\)\.length >= 4/,
    "dashboard recovery must count only independent correct answers",
  );
  assert.match(
    startSession,
    /recent\.filter\(\(a\) => a\.correct && !a\.hint_used\)\.length/,
    "mastery eligibility must remain hint-aware",
  );
  assert.match(
    sessionItem,
    /row\.correct === true && Number\(row\.hint_level_used \?\? 0\) === 0/,
    "practice early completion must remain hint-aware",
  );
});
