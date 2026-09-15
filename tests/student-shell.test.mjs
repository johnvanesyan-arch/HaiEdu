import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("student home loads the Sprint 10.5B design system in cascade order", async () => {
  const html = await read("web/index.html");
  const order = ["tokens.css", "base.css", "styles.css", "ux.css", "components.css", "student-shell.css"]
    .map((name) => html.indexOf(name));
  assert.ok(order.every((index) => index >= 0));
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1]);
  assert.match(html, /data-student-page="home"/);
  assert.match(html, /student-shell\.js/);
});

test("mastery check uses shared design primitives and task-aware shell", async () => {
  const html = await read("web/mastery.html");
  assert.match(html, /tokens\.css/);
  assert.match(html, /components\.css/);
  assert.match(html, /student-shell\.css/);
  assert.match(html, /data-student-page="assessment"/);
  assert.match(html, /student-shell\.js/);
});

test("student shell does not own educational truth", async () => {
  const code = await read("web/student-shell.js");
  assert.doesNotMatch(code, /supabase|service_role|answer_key|alpha\s*=|beta\s*=/i);
  assert.match(code, /Presentation\/navigation only/);
  assert.match(code, /practicePanel/);
  assert.match(code, /questionPanel/);
});

test("future primary routes are visible but safely disabled until their implementation phases", async () => {
  const code = await read("web/student-shell.js");
  assert.match(code, /key: "home"[\s\S]*enabled: true/);
  assert.match(code, /key: "physics"[\s\S]*enabled: false/);
  assert.match(code, /key: "assessment"[\s\S]*enabled: false/);
  assert.match(code, /key: "progress"[\s\S]*enabled: false/);
  assert.match(code, /aria-disabled="true"/);
});

test("design tokens include spacing, semantic state, focus and layout primitives", async () => {
  const css = await read("web/tokens.css");
  assert.match(css, /--amp-color-primary:/);
  assert.match(css, /--amp-color-success:/);
  assert.match(css, /--amp-color-danger:/);
  assert.match(css, /--amp-color-focus:/);
  assert.match(css, /--amp-space-4:/);
  assert.match(css, /--amp-nav-width:/);
  assert.match(css, /--amp-control-min:/);
});

test("student shell provides desktop rail, mobile navigation and focused-task suppression", async () => {
  const css = await read("web/student-shell.css");
  assert.match(css, /\.amp-side-nav/);
  assert.match(css, /\.amp-mobile-nav/);
  assert.match(css, /amp-focused-task[\s\S]*\.amp-side-nav/);
  assert.match(css, /@media \(max-width: 820px\)/);
});
