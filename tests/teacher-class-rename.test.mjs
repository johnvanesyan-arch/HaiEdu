import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("teacher classroom details expose inline rename controls for both class paths", () => {
  const html = read("web/teacher.html");
  for (const id of [
    "renameClassBtn",
    "renameClassForm",
    "renameClassNameInput",
    "institutionalRenameClassBtn",
    "institutionalRenameClassForm",
    "institutionalRenameClassNameInput",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /Փոխել անունը/);
  assert.match(html, /minlength="2" maxlength="120"/);
});

test("teacher client renames the selected class without changing its identity", () => {
  const js = read("web/teacher.js");
  assert.match(js, /async function renameSelectedClass/);
  assert.match(js, /body: \{ action: "rename", classId: klass\.id, name \}/);
  assert.match(js, /manage-institutional-teacher-class/);
  assert.match(js, /manage-teacher-class/);
  assert.match(js, /klass\.name = savedName/);
  assert.match(js, /renderClassList\(\)/);
});

test("legacy classroom rename is restricted to the teacher-owned legacy row", () => {
  const source = read("supabase/functions/manage-teacher-class/index.ts");
  const renameBlock = source.match(/if \(body\.action === "rename"\)[\s\S]*?if \(body\.action === "rotate_join_code"\)/)?.[0] ?? "";
  assert.match(renameBlock, /name\.length < 2/);
  assert.match(renameBlock, /name\.length > 120/);
  assert.match(renameBlock, /\.eq\("teacher_id", teacherId\)/);
  assert.match(renameBlock, /\.is\("school_id", null\)/);
  assert.match(renameBlock, /select\("id, name"\)/);
});

test("institutional classroom rename uses the school-scoped service function", () => {
  const source = read("supabase/functions/manage-institutional-teacher-class/index.ts");
  assert.match(source, /body\.action === "rename"/);
  assert.match(source, /service_rename_teacher_class_14b/);
  assert.match(source, /p_actor: actor, p_class: body\.classId, p_name: name/);
});

test("institutional rename service validates ownership and stays service-role only", () => {
  const migration = read("supabase/migrations/20260926224000_teacher_class_rename.sql");
  assert.match(migration, /security definer set search_path=public,pg_temp/);
  assert.match(migration, /where id=p_class and teacher_id=p_actor and school_id is not null/);
  assert.match(migration, /teacher_assignments/);
  assert.match(migration, /institutional_memberships/);
  assert.match(migration, /academic_identity_events/);
  assert.match(migration, /revoke all on function public\.service_rename_teacher_class_14b[\s\S]*from public,anon,authenticated/);
  assert.match(migration, /grant execute on function public\.service_rename_teacher_class_14b[\s\S]*to service_role/);
});
