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
  const studentCard = publicEntry.match(/<article><span>01<\/span>[\s\S]*?<\/article>/)?.[0] ?? "";
  assert.match(studentCard, /href="\.\/account-access">Մուտք գործել<\/a>/);
  assert.ok(studentCard.indexOf('href="./account-access"') < studentCard.indexOf('href="./account-access?view=register"'), "returning student sign-in should be shown before registration");
  assert.match(home, /Նոր աշակերտի հաշիվ ստեղծել/);
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


test("teacher roster wraps six Armenian data blocks without collapsing words", () => {
  const css = read("web/teacher.css");
  assert.match(css, /\.roster-row\{display:flex;flex-wrap:wrap;/);
  assert.match(css, /\.roster-row>div\{[^}]*flex:1 1 150px[^}]*overflow-wrap:break-word;word-break:normal/);
  assert.match(css, /\.roster-row>\.intervention-cell\{flex:2 1 260px/);
  assert.match(css, /\.roster-row>\.roster-actions\{flex:0 0 auto;min-width:max-content/);
  assert.match(css, /\.roster-actions \.small-button\{white-space:nowrap;overflow-wrap:normal/);
  assert.doesNotMatch(css, /\.roster-row\{[^}]*grid-template-columns/);
});
