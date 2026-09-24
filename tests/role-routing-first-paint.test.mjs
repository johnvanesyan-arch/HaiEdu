import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const router = read("web/role-router.js");
const destinations = read("web/account-roles.js");
const shellCss = read("web/student-shell.css");

test("role-routed student pages start hidden until role resolution", () => {
  for (const path of [
    "web/index.html",
    "web/physics-7.html",
    "web/practice.html",
    "web/mastery.html",
    "web/diagnostic.html",
    "web/assessment.html",
  ]) {
    const html = read(path);
    assert.match(html, /data-student-page="[^"]+"[^>]*data-role-routing="pending"/);
    assert.match(html, /src="\.\/role-router\.js"/);
  }

  assert.match(
    shellCss,
    /body\[data-student-page\]\[data-role-routing="pending"\][\s\S]*visibility:\s*hidden/,
  );
});

test("staff redirects happen before the student route is revealed", () => {
  assert.match(router, /markRoleRoutingPending\(\)/);
  assert.match(destinations, /teacher:\s*"\.\/teacher\.html"/);
  assert.match(destinations, /school_admin:\s*"\.\/school-admin"/);
  assert.match(destinations, /content_admin:\s*"\.\/content\.html"/);
  assert.match(destinations, /admin:\s*"\.\/admin\.html"/);

  const staffBranch = router.slice(router.indexOf('if (role !== "student")'));
  assert.match(staffBranch, /window\.location\.replace\(destination\)/);
  assert.match(staffBranch, /return \{ redirected: true, role \}/);

  const redirectIndex = staffBranch.indexOf("window.location.replace(destination)");
  const revealIndex = staffBranch.indexOf("revealStudentRoute()");
  assert.ok(redirectIndex >= 0);
  assert.ok(revealIndex > redirectIndex, "student shell must not be revealed before a staff redirect");
});

test("unresolved profiles never reveal a student's workspace", () => {
  assert.match(router, /if \(error \|\| !data \|\| !roleDestination\(data\.role\)\)[\s\S]*blockStudentRoute\(\)/);
  assert.match(shellCss, /data-role-routing="blocked"[\s\S]*#modePanel/);
});

test("anonymous and student-compatible routes become visible after role resolution", () => {
  assert.match(router, /if \(!session\?\.user\)[\s\S]*revealStudentRoute\(\)/);
  assert.match(router, /export const roleRoutingReady/);
  assert.match(router, /revealStudentRoute\(\);\n  return \{ redirected: false, role \};/);
});
