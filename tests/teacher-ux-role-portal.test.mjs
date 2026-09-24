import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("public entry shows three roles with a shared sign-in and student registration", () => {
  const shell = read("web/student-shell.js");
  const home = read("web/index.html");
  const publicEntry = home.split('<main class="shell"')[0];
  assert.match(shell, /publicEntry/);
  for (const role of ["Աշակերտ", "Ուսուցիչ", "Դպրոցի ադմին"]) assert.match(publicEntry, new RegExp(role));
  assert.doesNotMatch(publicEntry, /Բովանդակության պատասխանատու|Հարթակի ադմին|Մաստեր ադմին/);
  assert.match(publicEntry, /href="\.\/account-access"/);
  assert.match(publicEntry, /href="\.\/account-access\?view=register"/);
  assert.match(home, /Ստեղծել աշակերտի հաշիվ/);
  assert.doesNotMatch(home, /id="passwordInput"/);
  assert.doesNotMatch(shell, /service_role/i);
});

test("teacher workspace exposes profile, class onboarding, roster search and class controls", () => {
  const html = read("web/teacher.html");
  const js = read("web/teacher.js");
  assert.match(html, /teacherDisplayNameInput/);
  assert.match(html, /copyInviteBtn/);
  assert.match(html, /toggleClassBtn/);
  assert.match(html, /studentSearchInput/);
  assert.match(js, /manage-teacher-profile/);
  assert.match(js, /remove_student/);
  assert.match(js, /action: "archive"|"archive" : "activate"/);
  assert.match(js, /buildInviteUrl/);
});

test("teacher profile function is self-scoped and role protected", () => {
  const source = read("supabase/functions/manage-teacher-profile/index.ts");
  assert.match(source, /hasActiveLiveSession/);
  assert.match(source, /teacher_role_required/);
  assert.match(source, /\.eq\("id", teacherId\)/);
  assert.match(source, /display_name/);
});

test("teacher invite link prefills the join code", () => {
  const join = read("web/join.js");
  assert.match(join, /URLSearchParams/);
  assert.match(join, /get\("code"\)/);
  assert.match(join, /joinCode\.value = inviteCode/);
});
