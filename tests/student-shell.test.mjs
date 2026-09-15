import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("student home loads the shared design system in cascade order", async () => {
  const html = await read("web/index.html");
  const order = ["tokens.css", "base.css", "styles.css", "ux.css", "components.css", "student-shell.css", "home.css"]
    .map((name) => html.indexOf(name));
  assert.ok(order.every((index) => index >= 0));
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1]);
  assert.match(html, /data-student-page="home"/);
  assert.match(html, /student-shell\.js/);
  assert.match(html, /home-dashboard\.js/);
});

test("Home prioritizes the backend next action before secondary dashboard summaries", async () => {
  const html = await read("web/index.html");
  const next = html.indexOf("home-next-card");
  const summary = html.indexOf("dashboard-summary home-summary");
  assert.ok(next >= 0 && summary > next);
  assert.match(html, /id="resumeLearningBtn"/);
  assert.match(html, /href="\.\/physics-7\.html"/);
  assert.match(html, /id="homeAssessmentTitle"/);
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

test("Physics 7 route is enabled while later primary routes stay safely disabled", async () => {
  const code = await read("web/student-shell.js");
  assert.match(code, /key: "home"[\s\S]*enabled: true/);
  assert.match(code, /key: "physics"[\s\S]*enabled: true/);
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

test("Physics 7 browser exposes chapter-topic-skill hierarchy without privileged data", async () => {
  const html = await read("web/physics-7.html");
  const code = await read("web/physics-7.js");
  assert.match(html, /data-student-page="physics"/);
  assert.match(html, /id="topicList"/);
  assert.match(html, /Գլուխ II/);
  assert.match(html, /Գլուխ VI/);
  assert.match(code, /PHY7-U01-T01/);
  assert.match(code, /PHY7-U01-S01/);
  assert.match(code, /PHY7-U01-S10/);
  assert.match(code, /get-student-dashboard/);
  assert.match(code, /get-mastery-check-status/);
  assert.match(code, /practice\.html\?skill=/);
  assert.doesNotMatch(code, /service_role|answer_key|item_answer_keys/i);
});

test("Physics browser keeps diagnostic, practice mastery and verified completion conceptually distinct", async () => {
  const code = await read("web/physics-7.js");
  assert.match(code, /diagnosticText/);
  assert.match(code, /Յուրացման միավոր/);
  assert.match(code, /unitComplete/);
  assert.match(code, /verified/);
  assert.match(code, /secure/);
  assert.match(code, /needs_support/);
});

test("Sprint 10.5D practice page is a focused authenticated task surface", async () => {
  const html = await read("web/practice.html");
  assert.match(html, /data-focused-task="true"/);
  assert.match(html, /id="practicePanel"/);
  assert.match(html, /id="completionPanel"/);
  assert.match(html, /id="helpControls"/);
  assert.match(html, /id="masteryCard"/);
  assert.match(html, /practice\.js/);
  assert.match(html, /remediation\.js/);
  assert.match(html, /session-watchdog\.js/);
  assert.match(html, /student-shell\.js/);
});

test("dedicated practice preserves server-owned adaptive, grading and remediation contracts", async () => {
  const code = await read("web/practice.js");
  assert.match(code, /start-learning-session/);
  assert.match(code, /get-session-item/);
  assert.match(code, /submit-answer/);
  assert.match(code, /mode:\s*"practice"/);
  assert.match(code, /selectionMode/);
  assert.match(code, /usedHelp/);
  assert.match(code, /mastery_reached/);
  assert.match(code, /independent_recovery/);
  assert.match(code, /item_limit_reached/);
  assert.doesNotMatch(code, /service_role|answer_key|item_answer_keys/i);
});

test("Home and Physics routes hand practice off to the dedicated page", async () => {
  const home = await read("web/home-dashboard.js");
  const router = await read("web/home-practice-router.js");
  const physics = await read("web/physics-7.js");
  assert.match(home, /window\.location\.href = "\.\/practice\.html"/);
  assert.match(home, /home-practice-router\.js/);
  assert.match(router, /practice\.html\?skill=/);
  assert.match(router, /active\?\.mode === "practice"/);
  assert.match(physics, /href="\.\/practice\.html"/);
  assert.match(physics, /window\.location\.href = `\.\/practice\.html\?skill=/);
});

test("practice does not silently replace active diagnostic or mastery check", async () => {
  const code = await read("web/practice.js");
  assert.match(code, /session\.mode === "diagnostic"/);
  assert.match(code, /index\.html\?resume=1/);
  assert.match(code, /session\.mode === "mastery_check"/);
  assert.match(code, /mastery\.html/);
});
