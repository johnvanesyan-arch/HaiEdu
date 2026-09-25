import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("privacy preferences default to opt-out", async () => {
  const sql = await read("supabase/migrations/0011_security_privacy_administration.sql");
  assert.match(sql, /product_analytics_opt_in boolean not null default false/i);
  assert.match(sql, /research_use_opt_in boolean not null default false/i);
});

test("student erasure RPC is not executable by authenticated clients", async () => {
  const sql = await read("supabase/migrations/0011_security_privacy_administration.sql");
  assert.match(sql, /revoke all on function public\.erase_student_data\(uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.erase_student_data\(uuid\) to service_role/i);
  assert.match(sql, /student_only_erasure/i);
});

test("audit log is admin read only under RLS", async () => {
  const sql = await read("supabase/migrations/0011_security_privacy_administration.sql");
  assert.match(sql, /alter table public\.security_audit_log enable row level security/i);
  assert.match(sql, /create policy security_audit_admin_read on public\.security_audit_log\s+for select to authenticated[\s\S]*?current_user_role\(\) = 'admin'/i);
  assert.doesNotMatch(sql, /create policy\s+\S+\s+on public\.security_audit_log\s+for insert to authenticated/i);
  assert.doesNotMatch(sql, /create policy\s+\S+\s+on public\.security_audit_log\s+for update to authenticated/i);
  assert.doesNotMatch(sql, /create policy\s+\S+\s+on public\.security_audit_log\s+for delete to authenticated/i);
});

test("admin account management protects self and last active admin", async () => {
  const code = await read("supabase/functions/manage-admin-account/index.ts");
  assert.match(code, /cannot_change_own_role/);
  assert.match(code, /cannot_change_own_status/);
  assert.match(code, /last_active_admin_protected/);
  assert.match(code, /staff_offboarding_required/);
});

test("student deletion removes auth account only after learning-data erasure", async () => {
  const code = await read("supabase/functions/manage-admin-account/index.ts");
  const executeBlock = code.slice(code.indexOf('if (action === "execute_deletion")'));
  const eraseIndex = executeBlock.indexOf('admin.rpc("erase_student_data"');
  const authDeleteIndex = executeBlock.indexOf("admin.auth.admin.deleteUser");
  assert.ok(eraseIndex >= 0);
  assert.ok(authDeleteIndex > eraseIndex);
});

test("archived roles stay blocked and visible on demand", async () => {
  const sql = await read("supabase/migrations/0104_admin_account_archiving.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  const ui = await read("web/admin.js");
  assert.match(sql, /'suspended', 'archived', 'deletion_pending'/);
  assert.match(endpoint, /suspend_before_archiving/);
  assert.match(endpoint, /unarchive.*"suspended"/s);
  assert.match(endpoint, /cannot_change_own_status/);
  assert.match(ui, /accountStatus === "archived"/);
  assert.match(ui, /archiveSection/);
});

test("permanent deletion checks academic links and keeps student review separate", async () => {
  const sql = await read("supabase/migrations/0104_admin_account_archiving.sql");
  const endpoint = await read("supabase/functions/manage-admin-account/index.ts");
  assert.match(sql, /c\.confdeltype in \('a', 'r', 'c'\)/);
  assert.match(sql, /guard_archived_staff_deletion/);
  assert.match(sql, /revoke all on function public\.service_account_deletion_blockers\(uuid\) from public, anon, authenticated/);
  assert.match(endpoint, /archive_before_deletion/);
  assert.match(endpoint, /service_account_deletion_blockers/);
  assert.match(endpoint, /status: "pending", resolution_code: "admin_archived_account"/);
  assert.match(endpoint, /if \(action === "execute_deletion"\)/);
});

test("two-stage deletion keeps approval reversible and requires explicit execution", async () => {
  const adminCode = await read("supabase/functions/manage-admin-account/index.ts");
  const privacyCode = await read("supabase/functions/manage-my-privacy/index.ts");
  const adminUi = await read("web/admin.js");

  const approveStart = adminCode.indexOf('if (action === "approve_deletion")');
  const executeStart = adminCode.indexOf('if (action === "execute_deletion")');
  assert.ok(approveStart >= 0 && executeStart > approveStart);
  const approveBlock = adminCode.slice(approveStart, executeStart);
  assert.doesNotMatch(approveBlock, /erase_student_data|deleteUser/);
  assert.match(approveBlock, /status:\s*"processing"/);
  assert.match(adminCode.slice(executeStart), /erase_student_data/);
  assert.match(adminCode.slice(executeStart), /deleteUser/);

  assert.match(privacyCode, /\.in\("status", \["pending", "processing"\]\)/);
  assert.match(privacyCode, /account_status:\s*"active"/);
  assert.match(adminUi, /data-delete-execute/);
  assert.match(adminUi, /մուտքագրեք DELETE/i);
});

test("role router separates admin, content admin and teacher consoles", async () => {
  const code = await read("web/role-router.js");
  const roles = await read("web/account-roles.js");
  assert.match(code, /roleDestination\(role\)/);
  assert.match(roles, /teacher:\s*"\.\/teacher\.html"/);
  assert.match(roles, /school_admin:\s*"\.\/school-admin"/);
  assert.match(roles, /content_admin:\s*"\.\/content\.html"/);
  assert.match(roles, /admin:\s*"\.\/admin\.html"/);
});

test("browser configuration never includes service role credentials", async () => {
  const config = await read("web/config.js");
  assert.doesNotMatch(config, /service[_-]?role/i);
  assert.match(config, /SUPABASE_PUBLISHABLE_KEY/);
});

test("student frontend has explicit post-deletion session recovery", async () => {
  const ux = await read("web/ux.js");
  assert.match(ux, /handleTerminalAuthFailure/);
  assert.match(ux, /scope:\s*"local"/);
  assert.match(ux, /Հաշիվը այլևս հասանելի չէ/);
});
