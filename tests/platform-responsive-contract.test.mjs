import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared Armenian copy wraps at word boundaries while technical tokens stay breakable", async () => {
  const base = await read("web/base.css");
  const ux = await read("web/ux.css");
  const components = await read("web/components.css");
  const responsive = await read("web/responsive-qa.css");
  const roleLayout = await read("web/role-layout.css");

  for (const [name, css] of Object.entries({ base, components, responsive })) {
    assert.match(css, /overflow-wrap:\s*break-word/, `${name} must use safe word-boundary wrapping`);
    assert.doesNotMatch(css, /overflow-wrap:\s*anywhere/, `${name} must not split ordinary UI copy anywhere`);
  }

  assert.match(ux, /data-technical-token[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(roleLayout, /Only technical tokens[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(roleLayout, /Final cross-workspace text contract[\s\S]*overflow-wrap:\s*break-word/);
});

test("shared action groups size from their labels and wrap before controls collapse", async () => {
  const ux = await read("web/ux.css");

  assert.match(ux, /\.workflow-actions[\s\S]*\.teacher-header-actions[\s\S]*flex-wrap:\s*wrap/);
  assert.match(ux, />\s*:is\(button,\s*a\.button-link,\s*a\.ghost\)[\s\S]*inline-size:\s*fit-content/);
  assert.match(ux, /max-inline-size:\s*100%/);
});

test("role dashboards respond to usable container width after sidebars", async () => {
  const css = await read("web/role-layout.css");

  assert.match(css, /container-name:\s*hm-workspace/);
  assert.match(css, /container-name:\s*hm-student-workspace/);
  assert.match(css, /@container hm-workspace \(max-width:\s*70rem\)/);
  assert.match(css, /\.teacher-onboarding-steps[\s\S]*\.matrix-summary-grid[\s\S]*\.overview-stats[\s\S]*\.admin-stats[\s\S]*\.quality-stats/);
  assert.match(css, /@container hm-student-workspace[\s\S]*\.dashboard-summary[\s\S]*\.mode-grid[\s\S]*\.skill-map/);
});

test("every role workspace loads the final cross-platform layout contract", async () => {
  for (const path of [
    "web/index.html",
    "web/teacher.html",
    "web/school-admin.html",
    "web/admin.html",
    "web/content.html",
  ]) {
    const html = await read(path);
    assert.match(html, /ux\.css/, `${path} must load shared UX rules`);
    assert.match(html, /role-layout\.css/, `${path} must load the final role layout rules`);
  }
});
