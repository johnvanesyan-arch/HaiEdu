import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { numericAnswerInput } from "../web/answer-response-recovery.mjs";

const read = (path) => fs.readFileSync(path, "utf8");

const studentPages = ["web/index.html", "web/mastery.html", "web/join.html"];

test("student pages declare Armenian language, viewport and shared UX layer", () => {
  for (const file of studentPages) {
    const html = read(file);
    assert.match(html, /<html lang="hy">/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /\.\/ux\.css/);
    assert.match(html, /\.\/ux\.js/);
  }
});

test("student numeric inputs use neutral placeholders with no answer examples", () => {
  const markup = numericAnswerInput("Պատասխան");
  assert.match(markup, /placeholder="Մուտքագրեք թիվը"/);
  assert.match(markup, /aria-describedby="numericAnswerFormat"/);
  assert.doesNotMatch(markup, /Օրինակ|placeholder="Օր\./);
  for (const name of ["app", "practice", "diagnostic", "mastery"]) {
    const source = read("web/" + name + ".js");
    assert.match(source, /numericAnswerInput\("Պատասխան"\)/);
    assert.match(source, /numericAnswerInput\("Թվային արժեք"\)/);
  }
});

test("shared UX layer includes focus visibility, reduced motion and responsive breakpoints", () => {
  const css = read("web/ux.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 1024px/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /max-width: 480px/);
  assert.match(css, /min-height: 44px/);
});

test("shared UX layer leaves numeric syntax to the server and validates class codes", () => {
  const js = read("web/ux.js");
  assert.match(js, /const numericOk = Boolean\(numeric.value.trim\(\)\)/);
  assert.match(js, /\[A-Z0-9\]\{8\}/);
  assert.match(js, /aria-invalid/);
  assert.match(js, /radiogroup/);
});

test("student item-delivery endpoint never selects protected answer keys", () => {
  const source = read("supabase/functions/get-session-item/index.ts");
  assert.doesNotMatch(source, /from\(["']item_answer_keys["']\)/);
  assert.doesNotMatch(source, /canonical_unit|accepted_units/);
});

test("mastery answers never reveal correctness before final result", () => {
  const source = read("supabase/functions/submit-mastery-answer/index.ts");
  assert.match(source, /revealCorrect:\s*false/);
  assert.doesNotMatch(source, /upstreamData\.grading/);
});

test("diagnostic UI explicitly defers correctness feedback", () => {
  const app = read("web/app.js");
  assert.match(app, /Ճիշտ\/սխալ արդյունքը կերևա ախտորոշիչի ավարտից հետո/);
});
