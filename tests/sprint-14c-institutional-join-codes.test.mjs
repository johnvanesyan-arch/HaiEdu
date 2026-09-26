import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("institutional join-code migration keeps codes exact-scope, expiring, one-use and service-only", async () => {
  const sql = await read("supabase/migrations/20260926211500_restore_institutional_join_codes.sql");
  assert.match(sql, /create table if not exists public\.institutional_join_codes/);
  assert.match(sql, /foreign key \(class_id,school_id,academic_year_id\)/);
  assert.match(sql, /teacher_assignment_id uuid not null/);
  assert.match(sql, /subject_program_id uuid not null/);
  assert.match(sql, /expires_at>created_at/);
  assert.match(sql, /used_at is not null and used_by is not null/);
  assert.match(sql, /alter table public\.institutional_join_codes enable row level security/);
  assert.match(sql, /revoke all on table public\.institutional_join_codes from public,anon,authenticated/);
  assert.match(sql, /grant select,insert,update on table public\.institutional_join_codes to service_role/);
  assert.match(sql, /service_issue_institutional_join_code_14c/);
  assert.match(sql, /service_redeem_institutional_join_code_14c/);
  assert.match(sql, /service_revoke_institutional_join_code_14c/);
  assert.match(sql, /service_issue_institutional_invitation_14b/);
  assert.match(sql, /service_redeem_institutional_invitation_14b/);
});

test("teacher code controls are optional beside the recipient-bound bulk email flow", async () => {
  const html = await read("web/teacher.html");
  const js = await read("web/teacher.js");
  assert.match(html, /id="institutionalStudentInviteForm"/);
  assert.match(html, /id="institutionalCodeOption"/);
  assert.match(html, /Կոդը պարտադիր չէ/);
  assert.match(html, /id="institutionalGenerateJoinCodeBtn"/);
  assert.match(html, /id="institutionalCopyJoinCodeBtn"/);
  assert.match(html, /id="institutionalCopyJoinLinkBtn"/);
  assert.match(html, /id="institutionalJoinCodeList"/);
  assert.match(js, /provision-student-account/);
  assert.match(js, /action: "create_code"/);
  assert.match(js, /action: "revoke_code"/);
  assert.match(js, /latestInstitutionalJoinCode/);
});

test("join-code manager stores only a digest and returns plaintext only at creation", async () => {
  const source = await read("supabase/functions/manage-student-invitation/index.ts");
  assert.match(source, /crypto\.subtle\.digest/);
  assert.match(source, /service_issue_institutional_join_code_14c/);
  assert.match(source, /return json\(\{ codeId, joinCode, expiresAt \}, 201\)/);
  assert.match(source, /select\("id,created_at,expires_at"\)/);
  assert.doesNotMatch(source, /select\("[^"]*code_digest/);
});

test("student redemption attempts institutional one-use codes without removing existing enrollments", async () => {
  const source = await read("supabase/functions/join-class/index.ts");
  assert.match(source, /service_redeem_institutional_join_code_14c/);
  assert.match(source, /institutionalJoin\?\.classId/);
  assert.match(source, /Boolean\(institutionalJoin\.alreadyEnrolled\)/);
  assert.match(source, /from\("class_memberships"\)/);
  assert.doesNotMatch(source, /\.delete\(|\.update\([^)]*institutional_class_enrollments/);
});

test("student interface identifies code joining as an optional separate path", async () => {
  const home = await read("web/home-class.js");
  const shell = await read("web/student-shell.js");
  const join = await read("web/join.html");
  assert.match(home, /Միանալ այլ դասարանի՝ կոդով/);
  assert.match(home, /էլ\. փոստով ուղարկած հրավերը/);
  assert.match(shell, /Միանալ դասարանին՝ կոդով/);
  assert.match(join, /Այս եղանակը լրացուցիչ է/);
});

test("repository keeps the corrected bearer parser for bulk email invitations", async () => {
  const source = await read("supabase/functions/provision-student-account/index.ts");
  assert.match(source, /header\.replace\(\/\^Bearer\\s\+\/i/);
  assert.doesNotMatch(source, /header\.replace\(\/\^Bearer\\\\s\+\/i/);
});
