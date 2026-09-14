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
  const eraseIndex = code.indexOf('admin.rpc("erase_student_data"');
  const authDeleteIndex = code.indexOf("admin.auth.admin.deleteUser");
  assert.ok(eraseIndex >= 0);
  assert.ok(authDeleteIndex > eraseIndex);
});

test("role router separates admin, content admin and teacher consoles", async () => {
  const code = await read("web/role-router.js");
  assert.match(code, /teacher:\s*"\.\/teacher\.html"/);
  assert.match(code, /content_admin:\s*"\.\/content\.html"/);
  assert.match(code, /admin:\s*"\.\/admin\.html"/);
});

test("browser configuration never includes service role credentials", async () => {
  const config = await read("web/config.js");
  assert.doesNotMatch(config, /service[_-]?role/i);
  assert.match(config, /SUPABASE_PUBLISHABLE_KEY/);
});
