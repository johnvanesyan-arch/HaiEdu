import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/0031_content_curriculum_scopes.sql", "utf8");
const dashboard = readFileSync("supabase/functions/get-content-quality-dashboard/index.ts", "utf8");
const html = readFileSync("web/content.html", "utf8");
const ui = readFileSync("web/content-curriculum.js", "utf8");
const css = readFileSync("web/content-curriculum.css", "utf8");

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test("items have explicit relational curriculum scope", () => {
  has(migration, /create table if not exists public\.item_curriculum_scopes/i, "item curriculum scope table must exist");
  has(migration, /subject_program_id uuid not null references public\.subject_programs/i, "scope must point to a subject program");
  has(migration, /unit_id uuid not null references public\.units/i, "scope must point to a unit");
  has(migration, /curriculum_scope_unit_program_mismatch/, "unit/program mismatch must fail closed");
  has(migration, /curriculum_scope_skill_program_mismatch/, "skill/program mismatch must fail closed");
  has(migration, /item_curriculum_scope_backfill_incomplete/, "migration must reject incomplete existing-bank backfill");
});

test("dashboard exposes multi-grade multi-subject catalogue and item context", () => {
  has(dashboard, /from\("grades"\)/, "dashboard must load grades");
  has(dashboard, /from\("subjects"\)/, "dashboard must load subjects");
  has(dashboard, /from\("subject_programs"\)/, "dashboard must load subject programs");
  has(dashboard, /from\("units"\)/, "dashboard must load units");
  has(dashboard, /from\("item_curriculum_scopes"\)/, "dashboard must resolve explicit item scope");
  has(dashboard, /catalog:/, "dashboard must return a curriculum catalogue");
  has(dashboard, /curriculum: scope/, "each scoped item must expose curriculum context");
});

test("content console has hierarchical curriculum selectors", () => {
  for (const id of ["gradeFilter", "subjectFilter", "programFilter", "unitFilter", "allContentBtn"]) {
    has(html, new RegExp(`id="${id}"`), `${id} must be present`);
  }
  has(html, /content-curriculum\.js/, "curriculum navigation module must be loaded");
  has(html, /content-curriculum\.css/, "curriculum navigation styles must be loaded");
});

test("curriculum navigator scopes questions, skills, stats and item detail", () => {
  has(ui, /function itemInScope\(item\)/, "items must be scoped by selected curriculum context");
  has(ui, /context\.grade\?\.id/, "grade filter must use relational IDs");
  has(ui, /context\.subject\?\.id/, "subject filter must use relational IDs");
  has(ui, /context\.program\?\.id/, "program filter must use relational IDs");
  has(ui, /context\.unit\?\.id/, "unit filter must use relational IDs");
  has(ui, /function renderScopedStats/, "stats must be recalculated for the selected curriculum scope");
  has(ui, /function updateSkillFilter/, "skill choices must be restricted to the selected curriculum scope");
  has(ui, /curriculum-context-card/, "question detail must display explicit curriculum context");
  has(ui, /All grades · All subjects · All programs · All units/, "admin must retain an explicit all-content mode");
});

test("curriculum navigation remains usable across desktop and mobile", () => {
  has(css, /grid-template-columns: minmax\(130px, \.65fr\).*minmax\(260px, 1\.35fr\)/s, "desktop selector hierarchy must have dedicated columns");
  has(css, /@media \(max-width: 760px\)[\s\S]*\.curriculum-filter-grid[\s\S]*grid-template-columns: 1fr/, "selectors must stack on phone widths");
});
