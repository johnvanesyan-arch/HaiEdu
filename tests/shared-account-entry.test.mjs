import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { roleDestination, studentDestination } from "../web/account-roles.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("known roles have distinct workspaces and unknown roles cannot fall through to student", () => {
  assert.equal(roleDestination("student"), "./index.html");
  assert.equal(roleDestination("school_admin"), "./school-admin");
  assert.equal(roleDestination("teacher"), "./teacher.html");
  assert.equal(roleDestination("content_admin"), "./content.html");
  assert.equal(roleDestination("admin"), "./admin.html");
  assert.equal(roleDestination("owner"), null);
  assert.equal(roleDestination("__proto__"), null);
});

test("join return accepts only fixed destinations and valid eight-character codes", () => {
  assert.equal(studentDestination("?next=join&code=a7k9m2qx"), "./join.html?code=A7K9M2QX");
  assert.equal(studentDestination("?next=join&code=%2Fadmin"), "./join.html");
  assert.equal(studentDestination("?next=https://evil.example&code=A7K9M2QX"), "./index.html");
});

test("staff workspaces no longer collect credentials", async () => {
  for (const name of ["teacher", "admin", "content"]) {
    const html = await read(`web/${name}.html`);
    assert.match(html, /href="\.\/account-access"/);
    assert.doesNotMatch(html, /id="passwordInput"|id="signInBtn"/);
  }
});

test("school teachers use the institutional class creator instead of the legacy path", async () => {
  const html = await read("web/teacher.html");
  const code = await read("web/teacher.js");
  assert.match(html, /id="institutionalTeacherNotice"/);
  assert.match(html, /id="institutionalCreateForm"/);
  assert.match(code, /data\.institutionalTeacher === true/);
  assert.match(code, /"createClassCard"[\s\S]*classList\.toggle\("hidden", institutional\)/);
  assert.match(code, /renderInstitutionalClassCreator\(data, institutional\)/);
  assert.match(code, /institutionalCreateForm"\)\.addEventListener\("submit", createInstitutionalClass\)/);
  assert.match(code, /functions\.invoke\("manage-institutional-teacher-class",[\s\S]*action: "create",[\s\S]*membershipId: option\.teacherMembershipId,[\s\S]*academicYearId: option\.academicYearId,[\s\S]*subjectProgramId: option\.subjectProgramId/);
});
