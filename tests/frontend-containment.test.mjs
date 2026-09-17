import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared controls wrap Armenian labels inside their visual bounds", async () => {
  const ux = await read("web/ux.css");
  const components = await read("web/components.css");

  assert.match(ux, /\.button-link[\s\S]*max-width:\s*100%/);
  assert.match(ux, /\.button-link[\s\S]*white-space:\s*normal/);
  assert.match(ux, /button[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(components, /a\.button-link[\s\S]*padding:\s*var\(--amp-space-3\)\s+var\(--amp-space-4\)/);
  assert.match(components, /button,[\s\S]*max-width:\s*100%/);
});

test("shared cards and layout children cannot force horizontal overflow", async () => {
  const ux = await read("web/ux.css");
  const responsive = await read("web/responsive-qa.css");

  assert.match(ux, /\.card,[\s\S]*min-width:\s*0/);
  assert.match(ux, /\.card\s*>\s*\*[\s\S]*max-width:\s*100%/);
  assert.match(ux, /\.topbar,[\s\S]*flex-wrap:\s*wrap/);
  assert.match(responsive, /overflow-wrap:\s*anywhere/);
});

test("multi-subject Home cards have internal spacing and bounded actions", async () => {
  const css = await read("web/multi-subject.css");

  assert.match(css, /\.amp-global-next[\s\S]*padding:\s*var\(--amp-space-5\)/);
  assert.match(css, /\.amp-subject-card[\s\S]*padding:\s*var\(--amp-space-5\)/);
  assert.match(css, /\.amp-subject-card\s*>\s*\*[\s\S]*min-width:\s*0/);
  assert.match(css, /\.amp-subject-card \.button-link[\s\S]*max-width:\s*100%/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.amp-subject-card \.button-link[\s\S]*width:\s*100%/);
});

test("assessment and mastery cards preserve internal spacing and text containment", async () => {
  const assessment = await read("web/assessment.css");
  const task = await read("web/assessment-task.css");

  assert.match(assessment, /\.assessment-history[\s\S]*padding:\s*var\(--amp-space-6\)/);
  assert.match(assessment, /\.assessment-history \.stat\s*>\s*\*[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(assessment, /\.assessment-card-top\s*>\s*\*[\s\S]*min-width:\s*0/);
  assert.match(task, /#stateCard,[\s\S]*padding:\s*var\(--amp-space-6\)/);
  assert.match(task, /#stateCard\s*>\s*\*[\s\S]*max-width:\s*100%/);
  assert.match(task, /\.assessment-rule[\s\S]*overflow-wrap:\s*anywhere/);
});

test("major student, teacher, content, admin and privacy surfaces load the shared UX layer", async () => {
  const paths = [
    "web/index.html",
    "web/teacher.html",
    "web/content.html",
    "web/admin.html",
    "web/privacy.html",
  ];

  for (const path of paths) {
    const html = await read(path);
    assert.match(html, /ux\.css/, `${path} must load the shared containment layer`);
  }
});
