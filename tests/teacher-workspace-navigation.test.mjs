import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("teacher workspace uses URL-addressable views instead of dashboard anchors", () => {
  const html = read("web/teacher.html");
  const roleLayout = read("web/role-layout.js");
  const views = [...html.matchAll(/data-teacher-view="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(views, ["home", "profile", "create", "classes", "archive", "class"]);
  assert.match(roleLayout, /\.\/teacher\.html\?view=home/);
  assert.match(roleLayout, /\.\/teacher\.html\?view=profile/);
  assert.match(roleLayout, /\.\/teacher\.html\?view=classes/);
  assert.match(roleLayout, /\.\/teacher\.html\?view=archive/);
  assert.doesNotMatch(roleLayout, /\["Նոր դասարան",/);
  assert.doesNotMatch(roleLayout, /\["Իմ պրոֆիլը", "#|\["Դասարաններ", "#/);
});

test("active and archived classrooms have separate dedicated collections", () => {
  const html = read("web/teacher.html");
  const classesView = html.match(/<section id="teacherClassesView"[\s\S]*?<section id="teacherArchiveView"/)?.[0] ?? "";
  const archiveView = html.match(/<section id="teacherArchiveView"[\s\S]*?<section id="teacherClassDetailView"/)?.[0] ?? "";
  assert.match(classesView, /id="classList"/);
  assert.doesNotMatch(classesView, /id="archivedClassList"/);
  assert.match(archiveView, /id="archivedClassList"/);
  assert.doesNotMatch(archiveView, /id="classList"/);
  assert.doesNotMatch(html, /<details id="archivedClasses"/);
});

test("teacher classroom rendering separates active and archived data", () => {
  const js = read("web/teacher.js");
  assert.match(js, /const activeClasses = classes\.filter\(\(klass\) => klass\.isActive\)/);
  assert.match(js, /const archivedClasses = classes\.filter\(\(klass\) => !klass\.isActive\)/);
  assert.match(js, /activeList\.appendChild\(createClassListButton\(klass\)\)/);
  assert.match(js, /renderArchive\(archivedList/);
  assert.match(js, /url\.searchParams\.set\("source", klass\.isActive \? "classes" : "archive"\)/);
  assert.match(js, /renderTeacherView\("class"\)/);
});

test("new classroom remains an action and returns to its classroom workspace", () => {
  const html = read("web/teacher.html");
  const js = read("web/teacher.js");
  assert.match(html, /href="\?view=create">\+ Նոր դասարան/);
  assert.match(js, /showTeacherClassAfterMutation\(data\.class\.id\)/);
  assert.match(js, /showTeacherClassAfterMutation\(data\.classId\)/);
  assert.match(js, /url\.searchParams\.set\("view", "class"\)/);
});

test("teacher view layout remains responsive", () => {
  const css = read("web/teacher.css");
  assert.match(css, /\.teacher-class-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,280px\),1fr\)\)/);
  assert.match(css, /@media \(max-width:760px\)[\s\S]*\.teacher-class-grid\{grid-template-columns:1fr\}/);
});
