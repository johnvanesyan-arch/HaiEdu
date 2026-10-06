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
  assert.match(html, /home-class\.js/);
});

test("Home retains its legacy Physics renderer as a hidden compatibility layer while multi-subject Home owns presentation", async () => {
  const html = await read("web/index.html");
  const shell = await read("web/student-courses.js");
  const multi = await read("web/multi-subject-home.js");
  const next = html.indexOf("home-next-card");
  const summary = html.indexOf("dashboard-summary home-summary");
  assert.ok(next >= 0 && summary > next);
  assert.match(html, /id="resumeLearningBtn"/);
  assert.match(html, /href="\.\/physics-7\.html"/);
  assert.match(html, /id="homeAssessmentTitle"/);
  assert.match(shell, /multi-subject-home\.js/);
  assert.match(multi, /amp-multisubject-ready/);
  assert.match(multi, /ԻՄ ԱՌԱՐԿԱՆԵՐԸ/);
});

test("mastery check uses shared design primitives and task-aware shell", async () => {
  const html = await read("web/mastery.html");
  assert.match(html, /tokens\.css/);
  assert.match(html, /components\.css/);
  assert.match(html, /assessment-task\.css/);
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

test("student navigation is entitlement-driven while Physics routes remain subject-scoped", async () => {
  const shell = await read("web/student-shell.js");
  const courses = await read("web/student-courses.js");
  assert.match(shell, /key: "home"[\s\S]*enabled: true/);
  assert.match(shell, /student-courses\.js/);
  assert.match(courses, /contextHref/);
  assert.match(courses, /Իմ առարկաները/);
  assert.doesNotMatch(courses, /physics-7\.html/);
  assert.match(courses, /assessment/);
  assert.match(courses, /progress/);
  assert.match(courses, /selected\.enrollmentId === course\.enrollmentId/);
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
  assert.match(code, /session\.mode === "mastery_check"/);
  assert.match(code, /mastery\.html/);
});

test("Sprint 10.5E assessment hub separates diagnostic and mastery purposes", async () => {
  const html = await read("web/assessment.html");
  const code = await read("web/assessment.js");
  assert.match(html, /data-student-page="assessment"/);
  assert.match(html, /ԳԼՈՒԽ I · ՈՒՍՈՒՑՄԱՆ ՈՒՂՂՈՐԴՈՒՄ/);
  assert.match(html, /ԳԼՈՒԽ I · ՅՈՒՐԱՑՄԱՆ ՀԱՍՏԱՏՈՒՄ/);
  assert.match(html, /href="\.\/diagnostic\.html"/);
  assert.match(html, /href="\.\/mastery\.html"/);
  assert.match(code, /get-student-dashboard/);
  assert.match(code, /get-mastery-check-status/);
  assert.match(code, /active\.mode === "diagnostic"/);
  assert.match(code, /active\.mode === "mastery_check"/);
  assert.doesNotMatch(code, /service_role|item_answer_keys|answer_key/i);
});

test("dedicated diagnostic is Chapter I scoped, help-free and defers correctness", async () => {
  const html = await read("web/diagnostic.html");
  const code = await read("web/diagnostic.js");
  assert.match(html, /ԳԼՈՒԽ I/);
  assert.match(html, /20 հարց/);
  assert.doesNotMatch(html, /helpBtn|helpControls|remediation\.js/);
  assert.match(code, /mode:\s*"diagnostic"/);
  assert.match(code, /submit-answer/);
  assert.match(code, /Պատասխանն ընդունվեց/);
  assert.doesNotMatch(code, /grading\?\.correct|grading\.correct/);
  assert.match(code, /resultSkills/);
  assert.match(code, /recommendation\?\.action === "practice_skill"/);
  assert.doesNotMatch(code, /service_role|item_answer_keys|answer_key/i);
});

test("diagnostic protects active practice/mastery sessions and can resume itself", async () => {
  const code = await read("web/diagnostic.js");
  assert.match(code, /data\.activeSession\?\.mode === "diagnostic"/);
  assert.match(code, /data\.activeSession/);
  assert.match(code, /practice\.html/);
  assert.match(code, /mastery\.html/);
});

test("redesigned mastery check exposes locked, ready, active and result states without help", async () => {
  const html = await read("web/mastery.html");
  const code = await read("web/mastery.js");
  assert.match(html, /id="masteryStateBadge"/);
  assert.match(html, /Փորձնական անցողիկ կանոն/);
  assert.doesNotMatch(html, /helpBtn|helpControls|remediation\.js/);
  assert.match(code, /retryBlocked/);
  assert.match(code, /!s\.eligible/);
  assert.match(code, /active\?\.mode === "mastery_check"/);
  assert.match(code, /submit-mastery-answer/);
  assert.match(code, /result\.passed/);
  assert.match(code, /practice\.html\?skill=/);
  assert.doesNotMatch(code, /service_role|item_answer_keys|answer_key/i);
});

test("Home routes assessment summary to hub and dedicated diagnostic adapter", async () => {
  const home = await read("web/home-dashboard.js");
  const diagnosticRouter = await read("web/home-assessment-router.js");
  assert.match(home, /\.\/assessment\.html/);
  assert.match(home, /home-assessment-router\.js/);
  assert.match(diagnosticRouter, /window\.location\.href = "\.\/diagnostic\.html"/);
  assert.match(diagnosticRouter, /activeSession\?\.mode === "diagnostic"/);
});
