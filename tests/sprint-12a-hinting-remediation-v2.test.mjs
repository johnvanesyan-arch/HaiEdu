import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Hinting v2 migration defines template guides, safe parameters, and telemetry", async () => {
  const sql = await read("supabase/migrations/0042_sprint_12a_hinting_remediation_v2.sql");

  assert.match(sql, /create table if not exists public\.item_template_remediation_guides/);
  assert.match(sql, /allowed_parameter_keys text\[\]/);
  assert.match(sql, /alter table public\.item_template_remediation_guides enable row level security/);
  assert.match(sql, /add column if not exists context text/);
  assert.match(sql, /add column if not exists guide_scope text/);
  assert.match(sql, /add column if not exists item_template_id uuid references public\.item_templates/);

  for (const code of [
    "PHY7-U01-S07-T-LENGTH-TO-M",
    "PHY7-U01-S07-T-TIME-TO-S",
    "PHY7-U01-S07-T-VOLUME-TO-L",
    "PHY7-U01-S08-T-SCALE-DIVISION",
    "PHY7-U01-S08-T-SCALE-READING",
    "PHY7-U01-S09-T-MEASUREMENT-ERROR",
    "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
    "PHY7-U01-S10-T-SHEET-THICKNESS",
  ]) {
    assert.match(sql, new RegExp(code));
  }
});

test("remediation resolver prefers template guides and preserves skill fallback", async () => {
  const source = await read("supabase/functions/get-remediation-help/index.ts");

  assert.match(source, /from\("item_template_remediation_guides"\)/);
  assert.match(source, /g\.trigger_error_code === errorCode/);
  assert.match(source, /g\.trigger_error_code === null/);
  assert.match(source, /from\("skill_remediation_guides"\)/);
  assert.match(source, /guideScope = "skill"/);
});

test("template hint interpolation is allow-list only and does not evaluate expressions", async () => {
  const source = await read("supabase/functions/get-remediation-help/index.ts");

  assert.match(source, /const allowed = new Set\(allowedKeys\)/);
  assert.match(source, /if \(!allowed\.has\(key\)\) return match/);
  assert.match(source, /typeof raw === "string" \|\| typeof raw === "number" \|\| typeof raw === "boolean"/);
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /new Function\s*\(/);
});

test("remediation telemetry records context, guide scope, template, and error code", async () => {
  const source = await read("supabase/functions/get-remediation-help/index.ts");

  assert.match(source, /context: postAnswer \? "post_error" : "pre_answer"/);
  assert.match(source, /hint_level: nextLevel/);
  assert.match(source, /guide_scope: guideScope/);
  assert.match(source, /item_template_id: item\.item_template_id/);
  assert.match(source, /error_code: errorCode/);
});

test("Practice UI exposes the three progressive scaffold labels", async () => {
  const js = await read("web/remediation.js");
  const html = await read("web/practice.html");

  assert.match(html, />Հուշում<\/button>/);
  assert.match(js, /"Հաջորդ հուշումը"/);
  assert.match(js, /"Տեսնել նման օրինակ"/);
  assert.match(html, /ուղղություն → ռազմավարություն → նման օրինակ/);
});
