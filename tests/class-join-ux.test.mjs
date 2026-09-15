import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("student utility navigation exposes Join Class without changing primary learning nav", async () => {
  const shell = await read("web/student-shell.js");
  assert.match(shell, /href="\.\/join\.html">Միանալ դասարանին/);
  assert.match(shell, /key: "home"[\s\S]*key: "physics"[\s\S]*key: "assessment"[\s\S]*key: "progress"/);
});

test("Home class card distinguishes no-class and joined-class states", async () => {
  const home = await read("web/home-dashboard.js");
  const classes = await read("web/home-class.js");
  assert.match(home, /import\("\.\/home-class\.js"\)/);
  assert.match(classes, /get-student-classes/);
  assert.match(classes, /Միացեք ձեր ուսուցչի դասարանին/);
  assert.match(classes, /Դուք միացված եք ուսուցչի դասարանին/);
  assert.match(classes, /\.\/join\.html/);
  assert.doesNotMatch(classes, /service_role|answer_key|item_answer_keys/i);
});

test("student class membership endpoint returns only authenticated student's active classes", async () => {
  const fn = await read("supabase/functions/get-student-classes/index.ts");
  assert.match(fn, /hasActiveLiveSession/);
  assert.match(fn, /student_role_required/);
  assert.match(fn, /from\("class_memberships"\)/);
  assert.match(fn, /eq\("student_id", studentId\)/);
  assert.match(fn, /from\("classes"\)/);
  assert.match(fn, /eq\("is_active", true\)/);
  assert.match(fn, /return json\(\{ classes: result \}\)/);
});

test("Join Class utility page uses the shared student design system", async () => {
  const html = await read("web/join.html");
  assert.match(html, /tokens\.css/);
  assert.match(html, /components\.css/);
  assert.match(html, /responsive-qa\.css/);
  assert.match(html, /id="joinCode"/);
  assert.match(html, /id="joinBtn"/);
  assert.match(html, /Վերադառնալ գլխավոր/);
});

test("teacher dashboard supports copying and rotating class invitations", async () => {
  const html = await read("web/teacher.html");
  const js = await read("web/teacher.js");
  assert.match(html, /id="copyCodeBtn"/);
  assert.match(html, /id="copyInviteBtn"/);
  assert.match(html, /id="rotateCodeBtn"/);
  assert.match(html, /id="copyCodeStatus"/);
  assert.match(js, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(js, /copyJoinCode/);
  assert.match(js, /copyInviteLink/);
  assert.match(js, /rotate_join_code/);
});
