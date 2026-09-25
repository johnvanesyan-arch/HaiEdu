import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("master admin home is an operational overview with separate school and archive views", async () => {
  const html = await read("web/admin.html");
  const code = await read("web/admin.js");
  assert.match(html, /id="overviewSection"/);
  assert.match(html, /id="schoolsSection"/);
  assert.match(html, /id="archiveSection"/);
  assert.match(html, /id="deletionsSection"/);
  assert.match(code, /view:\s*"school_detail"/);
  assert.match(code, /view:\s*"class_students"/);
  assert.doesNotMatch(code, /delete_archived_staff/);
});

test("school hierarchy keeps admins and teachers as sibling branches", async () => {
  const code = await read("web/admin.js");
  assert.match(code, /Դպրոցի ադմիններ/);
  assert.match(code, /Ուսուցիչներ և դասարաններ/);
  assert.match(code, /Ուսուցիչները չեն պատկանում որևէ մեկ ադմինի հաշվին/);
  assert.match(code, /data-load-roster/);
});

test("admin data endpoints require a live AAL2 session", async () => {
  for (const path of [
    "supabase/functions/get-admin-dashboard/index.ts",
    "supabase/functions/manage-admin-account/index.ts",
  ]) {
    const code = await read(path);
    const auth = code.indexOf("admin.auth.getUser(token)");
    const live = code.indexOf("hasActiveLiveSession(admin, token");
    const mfa = code.indexOf('jwtPayload(token).aal !== "aal2"');
    assert.ok(auth >= 0 && live > auth && mfa > live, `${path} must authenticate, validate the live session, then require AAL2`);
  }
});

test("master-admin invitations require AAL2 while school-admin invitations remain role-scoped", async () => {
  for (const path of [
    "supabase/functions/provision-staff-account/index.ts",
    "supabase/functions/manage-staff-invitation/index.ts",
  ]) {
    const code = await read(path);
    assert.match(code, /actorProfile\.role === "admin" && jwtPayload\(token\)\.aal !== "aal2"/);
    assert.match(code, /account_or_session_inactive/);
    assert.match(code, /mfa_required/);
  }
});

test("school counts use enrollments instead of inventing student staff memberships", async () => {
  const code = await read("supabase/functions/get-admin-dashboard/index.ts");
  assert.match(code, /institutional_class_enrollments/);
  assert.match(code, /studentSets/);
  assert.doesNotMatch(code, /from\("institutional_memberships"\)\.select\("id",[^\n]*\.eq\("role", "student"\)/);
});

test("MFA setup supports a backup factor and protects the last factor", async () => {
  const html = await read("web/admin-security.html");
  const code = await read("web/admin-security.js");
  assert.match(html, /Ավելացնել պահուստային գործոն/);
  assert.match(html, /Supabase Auth-ը վերականգնման կոդեր չի տրամադրում/);
  assert.match(code, /mfa\.enroll/);
  assert.match(code, /mfa\.challengeAndVerify/);
  assert.match(code, /if \(factors\.length <= 1/);
});

test("master identities remain deletion-protected after role transfer", async () => {
  const migration = await read("supabase/migrations/20260925121942_protect_master_admin_identity.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  assert.match(migration, /master_admin_protected_at timestamptz/);
  assert.match(migration, /if old\.master_admin_protected_at is not null then\s+raise exception 'master_admin_deletion_forbidden'/s);
  assert.match(migration, /last_active_admin_protected/);
  assert.match(endpoint, /target\.master_admin_protected_at/);
});

test("generic role changes cannot manufacture institutional staff identities", async () => {
  const migration = await read("supabase/migrations/20260925121942_protect_master_admin_identity.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  const ui = await read("web/admin.js");
  assert.match(endpoint, /new Set\(\["content_admin", "admin"\]\)/);
  assert.match(endpoint, /institutional_role_change_forbidden/);
  assert.match(endpoint, /service_platform_role_change_allowed_14c/);
  assert.match(migration, /not exists\(select 1 from public\.institutional_memberships where person_id=p_user\)/);
  assert.doesNotMatch(ui, /const options = \["student", "teacher", "content_admin", "admin"\]/);
});

test("a school cannot lose its last active administrator", async () => {
  const migration = await read("supabase/migrations/20260925121942_protect_master_admin_identity.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  assert.match(migration, /service_school_admin_suspension_blockers_14c/);
  assert.match(migration, /alternative\.person_id<>p_user/);
  assert.match(endpoint, /last_active_school_admin_protected/);
  assert.match(endpoint, /service_school_admin_suspension_blockers_14c/);
});

test("platform navigation separates school invitation, management and archive", async () => {
  const layout = await read("web/role-layout.js");
  assert.match(layout, /Դպրոցի հրավեր/);
  assert.match(layout, /Դպրոցների կառավարում/);
  assert.match(layout, /Արխիվ/);
  assert.match(layout, /Անվտանգություն/);
});
