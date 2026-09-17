import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("progress is presented as an evidence view rather than a per-skill practice launcher", async () => {
  const html = await read("web/progress.html");
  const js = await read("web/progress.js");

  assert.match(html, /Առաջընթացը դիտարկման էջ է, ոչ թե վարժանքի էջ/);
  assert.match(html, /Վարժանք սկսելու համար անցեք դասընթաց/);
  assert.doesNotMatch(js, /function skillAction\(/);
  assert.match(js, /Դիտել դասընթացում/);
  assert.match(js, /physics-7\.html#skill-/);
});

test("only the global next-step card routes an active session from Progress", async () => {
  const js = await read("web/progress.js");

  assert.match(js, /function recommendedAction\(/);
  assert.match(js, /activeDestination = activeRoute\(active\)/);
  assert.match(js, /Այս էջի հմտությունների ցանկը միայն ցույց է տալիս ապացույցները/);
  assert.doesNotMatch(js, /progress-skill-action/);
});

test("Physics course explains why another skill is unavailable during an active session", async () => {
  const js = await read("web/physics-7.js");

  assert.match(js, /Ավարտեք ախտորոշիչը/);
  assert.match(js, /Ավարտեք ընթացիկ վարժանքը/);
  assert.match(js, /Ավարտեք ստուգումը/);
  assert.match(js, /active\.label/);
});

test("Progress skill links deep-link to the matching Physics skill row", async () => {
  const progress = await read("web/progress.js");
  const physics = await read("web/physics-7.js");
  const css = await read("web/physics-7.css");

  assert.match(progress, /#skill-\$\{encodeURIComponent\(skill\.code\)\}/);
  assert.match(physics, /row\.id = `skill-\$\{skill\.code\}`/);
  assert.match(physics, /focusRequestedSkill\(\)/);
  assert.match(css, /\.skill-browser-row:target/);
});
