import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("authenticated staff pages render a stable loading shell before protected data resolves", () => {
  const layout = read("web/role-layout.js");
  const css = read("web/role-layout.css");
  assert.match(layout, /ensureWorkspaceLoading/);
  assert.match(layout, /hm-role-sidebar-loading/);
  assert.match(layout, /hm-workspace-loading/);
  assert.match(layout, /prefetchWorkspaceLinks/);
  assert.match(css, /\.hm-workspace-loading/);
  assert.match(css, /hm-loading-shimmer/);
});

test("content reviewer reuses a short-lived dashboard cache across dedicated pages", () => {
  const shared = read("web/content-workspace.js");
  const editor = read("web/content.js");
  assert.match(shared, /CONTENT_DASHBOARD_CACHE_TTL_MS = 20_000/);
  assert.match(shared, /sessionStorage\.setItem/);
  assert.match(shared, /dashboardLoads/);
  assert.match(shared, /loadContentDashboard/);
  assert.match(editor, /loadContentDashboard/);
  assert.match(editor, /clearContentDashboardCache/);
});

test("auth lifecycle avoids dashboard reloads on token refresh", () => {
  const teacher = read("web/teacher.js");
  const admin = read("web/admin.js");
  const security = read("web/admin-security.js");
  assert.match(teacher, /TOKEN_REFRESHED[\s\S]*dashboardPanel/);
  assert.match(admin, /TOKEN_REFRESHED[\s\S]*console/);
  assert.match(security, /TOKEN_REFRESHED[\s\S]*securityConsole/);
});

test("global auth health check is deferred off the critical rendering path", () => {
  const ux = read("web/ux.js");
  assert.match(ux, /scheduleAuthHealthCheck/);
  assert.match(ux, /requestIdleCallback/);
  assert.doesNotMatch(ux, /showTerminalAuthMessage\(\);\nvoid handleTerminalAuthFailure\(\);/);
});

test("school admin starts independent initial reads in parallel and avoids a remote getUser bootstrap", () => {
  const school = read("web/school-admin.js");
  assert.match(school, /auth\.getSession\(\)/);
  assert.doesNotMatch(school, /const \{ data: auth \} = await supabase\.auth\.getUser\(\)/);
  assert.match(school, /Promise\.all\(\[[\s\S]*loadYears\(\)[\s\S]*loadTeacherSubjects[\s\S]*loadTeacherRoster\(\)[\s\S]*loadSchoolAnalytics/);
});

// Cross-document navigation is exercised by the full-shell Chromium regression
// in browser/student-workspace.browser.test.mjs, including page errors and writes.

test("student routing and dashboard bootstraps coalesce duplicate auth work", () => {
  const router = read("web/role-router.js");
  const app = read("web/app.js");
  assert.match(router, /routePromise/);
  assert.match(router, /TOKEN_REFRESHED.*INITIAL_SESSION/);
  assert.match(app, /dashboardLoadPromise/);
  assert.match(app, /showDashboard\(\{ force = false \} = \{\}\)/);
  assert.match(app, /TOKEN_REFRESHED.*INITIAL_SESSION/);
});


test("Content Reviewer curriculum filters reuse the shared dashboard loader without null observers", () => {
  const curriculum = read("web/content-curriculum.js");
  assert.match(curriculum, /contentSupabase, loadContentDashboard/);
  assert.doesNotMatch(curriculum, /createClient\(/);
  assert.doesNotMatch(curriculum, /get-content-quality-dashboard/);
  assert.match(curriculum, /const detailPanel = \$\("detailPanel"\);[\s\S]*if \(detailPanel\) new MutationObserver/);
  assert.doesNotMatch(curriculum, /scheduleRefresh/);
  assert.match(curriculum, /haiedu:content-dashboard/);
});
