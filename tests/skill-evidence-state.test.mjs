import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home skill cards distinguish recent recovery from mastery completion", async () => {
  const code = await read("web/app.js");
  assert.match(code, /completionSource === "recent_recovery"/);
  assert.match(code, /Վերջին փորձերում կայուն/);
  assert.match(code, /completionSource === "mastery"/);
  assert.match(code, /Ախտորոշիչ՝/);
  assert.match(code, /Յուրացում՝/);
});

test("Physics browser exposes recent recovery as a separate learner-facing state", async () => {
  const code = await read("web/physics-7.js");
  assert.match(code, /recovered: "Վերջին փորձերում կայուն"/);
  assert.match(code, /completionSource === "recent_recovery"\) return "recovered"/);
  assert.match(code, /completionSource === "mastery"\) return "secure"/);
});

test("Progress page does not collapse recent recovery into secure mastery", async () => {
  const code = await read("web/progress.js");
  const recoveryIndex = code.indexOf('completionSource === "recent_recovery"');
  const genericCompleteIndex = code.indexOf('if (skill.complete) return "secure"');
  assert.ok(recoveryIndex >= 0, "recent recovery state must be handled explicitly");
  assert.ok(genericCompleteIndex > recoveryIndex, "generic complete fallback must come after recent recovery handling");
  assert.match(code, /recovered: "Վերջին փորձերում կայուն"/);
});
