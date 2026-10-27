import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const studentPages = [
  "web/index.html",
  "web/physics-7.html",
  "web/assessment.html",
  "web/practice.html",
  "web/diagnostic.html",
  "web/mastery.html",
  "web/progress.html",
];

test("Sprint 10.5F student routes remain available inside the entitlement-driven subject workspace", async () => {
  const shell = await read("web/student-shell.js");
  const courses = await read("web/student-courses.js");
  assert.match(shell, /key: "home"[\s\S]*enabled: true/);
  assert.match(shell, /student-courses\.js/);
  assert.doesNotMatch(courses, /physics-7\.html/);
  const page = await read("web/course-page.js");
  assert.match(page, /assessment/);
  assert.match(page, /progress/);
  assert.match(courses, /resolveNavigationContext/);
  assert.match(courses, /studentHomeHref/);
  assert.match(shell, /responsive-qa\.css/);
});

test("Progress page separates diagnostic, practice mastery and verified completion", async () => {
  const html = await read("web/progress.html");
  const js = await read("web/progress.js");
  assert.match(html, /data-student-page="progress"/);
  assert.match(html, /id="diagnosticSummary"/);
  assert.match(html, /id="masterySummary"/);
  assert.match(html, /Յուրացման միավորը գնահատական չէ/);
  assert.match(html, /id="progressSkillList"/);
  assert.match(js, /latestDiagnostic/);
  assert.match(js, /masteryStatus\?\.unitComplete/);
  assert.match(js, /Վարժանքի գրանցված պատասխաններ/);
  assert.match(js, /Յուրացման միավոր/);
  assert.doesNotMatch(js, /service_role|answer_key|item_answer_keys|\balpha\b|\bbeta\b/i);
});

test("Progress recommendation remains server and session state driven", async () => {
  const js = await read("web/progress.js");
  assert.match(js, /get-student-dashboard/);
  assert.match(js, /get-mastery-check-status/);
  assert.match(js, /dashboard\?\.recommendation/);
  assert.match(js, /masteryStatus\?\.retryBlocked/);
  assert.match(js, /masteryStatus\?\.eligible/);
  assert.match(js, /activeRoute/);
});

test("student pages provide viewport metadata and a main landmark", async () => {
  for (const page of studentPages) {
    const html = await read(page);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0"/);
    assert.match(html, /<main[^>]+id="mainContent"/);
    assert.match(html, /student-shell\.js/);
  }
});

test("focused learning and assessment pages keep browsing navigation suppressed", async () => {
  const practice = await read("web/practice.html");
  const diagnostic = await read("web/diagnostic.html");
  const mastery = await read("web/mastery.html");
  assert.match(practice, /data-focused-task="true"/);
  assert.match(practice, /id="practicePanel"/);
  assert.match(diagnostic, /id="questionPanel"/);
  assert.match(mastery, /id="questionPanel"/);

  const shell = await read("web/student-shell.js");
  const css = await read("web/student-shell.css");
  assert.match(shell, /focusedByPage/);
  assert.match(shell, /practicePanel/);
  assert.match(shell, /questionPanel/);
  assert.match(css, /amp-focused-task[\s\S]*\.amp-side-nav/);
  assert.match(css, /amp-focused-task[\s\S]*\.amp-mobile-nav/);
});

test("shared accessibility layer retains focus, reduced motion, forced colors and practical controls", async () => {
  const base = await read("web/base.css");
  const ux = await read("web/ux.css");
  const components = await read("web/components.css");
  const responsive = await read("web/responsive-qa.css");
  assert.match(base, /:focus-visible/);
  assert.match(base, /prefers-reduced-motion/);
  assert.match(ux, /\.skip-link/);
  assert.match(ux, /min-height:\s*44px/);
  assert.match(components, /forced-colors:\s*active/);
  assert.match(responsive, /env\(safe-area-inset-bottom/);
  assert.match(responsive, /overflow-wrap:\s*break-word/);
  assert.match(responsive, /@media \(max-width: 560px\)/);
  assert.match(responsive, /@media \(max-width: 820px\)/);
});

test("Progress responsive layout collapses safely for tablet and narrow phones", async () => {
  const css = await read("web/progress.css");
  assert.match(css, /grid-template-columns:\s*repeat\(3/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("dedicated assessment routes are wired while older compatibility fallbacks remain guarded", async () => {
  const homeRouter = await read("web/home-assessment-router.js");
  const diagnostic = await read("web/diagnostic.js");
  const progress = await read("web/progress.js");
  const practice = await read("web/practice.js");
  assert.match(homeRouter, /diagnostic\.html/);
  assert.match(diagnostic, /routeForActive/);
  assert.match(diagnostic, /practice\.html/);
  assert.match(diagnostic, /mastery\.html/);
  assert.match(progress, /session\.mode === "diagnostic"[\s\S]*diagnostic\.html/);
  assert.match(practice, /session\.mode === "diagnostic"/);
  assert.match(practice, /session\.mode === "mastery_check"/);
});
