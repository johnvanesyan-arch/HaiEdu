import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("course entitlement is derived generically from active class membership subject and grade", async () => {
  const source = await read("supabase/functions/_shared/course-access.ts");
  assert.match(source, /from\("class_memberships"\)/);
  assert.match(source, /eq\("student_id", studentId\)/);
  assert.match(source, /from\("classes"\)/);
  assert.match(source, /eq\("is_active", true\)/);
  assert.match(source, /from\("subjects"\)/);
  assert.match(source, /from\("grades"\)/);
  assert.match(source, /hasCourseAccess/);
  assert.match(source, /subjectCode === subjectCode/);
  assert.match(source, /gradeNumber === gradeNumber/);
  assert.match(source, /hasPhysics7Access/);
});

test("all Physics 7 learning APIs still enforce the subject entitlement boundary", async () => {
  const paths = [
    "supabase/functions/get-student-dashboard/index.ts",
    "supabase/functions/start-learning-session/index.ts",
    "supabase/functions/get-mastery-check-status/index.ts",
    "supabase/functions/get-session-item/index.ts",
    "supabase/functions/submit-answer/index.ts",
    "supabase/functions/submit-mastery-answer/index.ts",
    "supabase/functions/get-remediation-help/index.ts",
  ];

  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /hasPhysics7Access/, `${path} must use the shared Physics 7 entitlement guard`);
    assert.match(source, /course_access_required/, `${path} must reject unaffiliated learners`);
    assert.match(source, /403/, `${path} must use a forbidden response for missing enrollment`);
  }
});

test("student class endpoint exposes metadata needed to build course navigation", async () => {
  const source = await read("supabase/functions/get-student-classes/index.ts");
  assert.match(source, /subjectCode/);
  assert.match(source, /subjectNameHy/);
  assert.match(source, /gradeNumber/);
  assert.match(source, /gradeLabelHy/);
  assert.match(source, /courseKey/);
});

test("student shell resolves navigation from exact authorized contexts", async () => {
  const shell=await read("web/student-shell.js"), courses=await read("web/student-courses.js"), gate=await read("web/course-gate.js");
  assert.match(shell,/student-courses\.js/);assert.match(shell,/course-gate\.js/);
  assert.match(courses,/groupLearningContexts/);assert.match(courses,/contextHref/);
  assert.doesNotMatch(courses,/physics:7|physics-7|mathematics/);
  assert.match(gate,/get-student-classes/);assert.match(gate,/resolveNavigationContext/);assert.match(gate,/request !== version/);
});

test("global Home keeps every enrollment and release distinct", async () => {
  const home=await read("web/multi-subject-home.js");
  assert.match(home,/groupLearningContexts/);assert.match(home,/course\.units/);assert.match(home,/course\.className/);assert.match(home,/course\.schoolName/);
  assert.doesNotMatch(home,/physics:7|mathematics|get-mastery-check-status/);
});

test("generic course shell verifies the exact selection before its dashboard", async () => {
  const page=await read("web/course-page.js");
  assert.match(page,/readLearningSelection/);assert.match(page,/sameContext/);assert.match(page,/get-student-classes/);assert.match(page,/get-student-dashboard/);
  assert.match(page,/registeredExtensionHref/);assert.doesNotMatch(page,/physics:7|physics-7\.html/);
});

test("successful class join is verified through the entitlement endpoint before returning home", async () => {
  const source = await read("web/join.js");
  assert.match(source, /join-class/);
  assert.match(source, /get-student-classes/);
  assert.match(source, /classes\.some/);
  assert.match(source, /window\.location\.replace\("\.\/index\.html\?joined=1"\)/);
});
