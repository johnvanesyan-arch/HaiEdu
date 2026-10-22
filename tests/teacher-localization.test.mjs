import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const teacherUi = read("web/teacher.js");
const teacherDashboard = read("supabase/functions/get-teacher-dashboard/index.ts");
const teacherStudent = read("supabase/functions/get-teacher-student/index.ts");

test("teacher Review and Mastery labels are fully learner-facing Armenian", () => {
  assert.match(teacherUi, /Գլխի կրկնության «ուշադրության» շեմերը/);
  assert.match(teacherUi, /Գլխի կրկնության հմտությունների տվյալներ/);
  assert.match(teacherUi, /Սխալ՝ վերջին յուրացման ստուգման ժամանակ/);
  assert.match(teacherUi, /Վերջին պատասխանների ընդհանուր ճշգրտություն/);
  assert.match(teacherUi, /Ֆիզիկա 7 · Գլուխ I/);
  assert.match(teacherUi, /Բնության ուսումնասիրության ֆիզիկական մեթոդները/);
  assert.match(teacherUi, /<h3>Յուրացման ստուգում և կրկնություն<\/h3>/);
  assert.match(teacherUi, /Գլուխ I-ի կրկնություն/);
  assert.doesNotMatch(teacherUi, /<h3>Գլխի յուրացում և կրկնություն<\/h3>/);
  assert.doesNotMatch(teacherUi, />Review-ի/);
  assert.doesNotMatch(teacherUi, />Վերջին Mastery-ում սխալ/);
  assert.doesNotMatch(teacherUi, /Բավարար Review տվյալ/);
});

test("teacher-facing recommendations do not leak Chapter or mastery check English", () => {
  const copy = teacherDashboard + teacherStudent;
  assert.match(copy, /Բաժին I-ի յուրացման ստուգ/);
  assert.doesNotMatch(copy, /Chapter I/);
  assert.doesNotMatch(copy, /mastery check-ը/);
});

test("raw mastery assessment result is localized before rendering", () => {
  assert.match(teacherUi, /result === "passed" \? "Անցած է"/);
  assert.match(teacherUi, /result === "failed" \? "Չի անցել"/);
});
