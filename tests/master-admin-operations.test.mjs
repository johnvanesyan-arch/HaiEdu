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

test("role changes are limited to existing platform identities", async () => {
  const migration = await read("supabase/migrations/20260925133000_lock_profile_account_types.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  const ui = await read("web/admin.js");
  assert.match(endpoint, /new Set\(\["content_admin", "admin"\]\)/);
  assert.match(endpoint, /!\["content_admin", "admin"\]\.includes\(String\(target\.role\)\)/);
  assert.match(endpoint, /account_type_immutable/);
  assert.match(ui, /!\["content_admin", "admin"\]\.includes\(user\.role\)/);
  assert.doesNotMatch(ui, /user\.role === "student"/);
  assert.match(migration, /v_old_role in \('content_admin', 'admin'\)/);
  assert.match(migration, /v_new_role in \('teacher', 'school_admin'\)/);
  assert.match(migration, /staff_account_provisioning invitation/);
  assert.match(migration, /raise exception 'account_type_immutable'/);
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

test("role surfaces share one browser auth client", async () => {
  for (const path of ["web/admin.js", "web/admin-security.js", "web/school-admin.js", "web/ux.js"]) {
    const code = await read(path);
    assert.match(code, /window\.__haieduSupabaseClient \|\|= createClient/);
  }
});
