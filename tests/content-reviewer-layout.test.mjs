import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("content reviewer keeps sign-out only in the shared sidebar", () => {
  const role = read("web/role-layout.css");
  assert.match(role, /data-role-workspace\^="content"[\s\S]*\.content-topbar #signOutBtn[\s\S]*display:\s*none !important/);
  assert.match(role, /data-role-workspace\^="content"[\s\S]*\.guide-topbar #signOutBtn[\s\S]*display:\s*none !important/);
  const layout = read("web/role-layout.js");
  assert.match(layout, /hm-sidebar-signout/);
  assert.match(layout, /existingSignOut\.click\(\)/);
});

test("content reviewer task pages give bordered work cards deliberate padding", () => {
  const workspace = read("web/content-workspace.css");
  assert.match(workspace, /\.content-bank-page \.bank-card > \.section-heading[\s\S]*padding:\s*20px 22px 14px/);
  assert.match(workspace, /\.content-bank-page \.filter-card[\s\S]*padding:\s*18px 20px/);
  assert.match(workspace, /\.evidence-controls[\s\S]*padding:\s*20px 22px/);
  assert.match(workspace, /\.curriculum-program-card[\s\S]*padding:\s*22px/);
  assert.match(workspace, /\.content-work-card\{padding:22px\}/);
  assert.match(workspace, /\.content-item-page \.detail-panel\{[^}]*padding:24px 28px 30px/);
});

test("guide filters, list header and editor all keep internal spacing", () => {
  const guides = read("web/content-guides.css");
  assert.match(guides, /\.guide-filters[\s\S]*padding:\s*18px 20px/);
  assert.match(guides, /\.guide-bank > \.section-heading[\s\S]*padding:\s*20px 22px 14px/);
  assert.match(guides, /\.guide-editor[\s\S]*padding:\s*24px 28px 30px/);
});
