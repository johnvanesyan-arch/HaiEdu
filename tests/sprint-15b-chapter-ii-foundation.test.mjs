import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const multiUnit = read("supabase/migrations/20261001001000_sprint_15b_multi_unit_release_governance.sql");
const chapter = read("supabase/migrations/20261001002000_sprint_15b1_physics7_chapter_ii_foundation.sql");
const advisorIndex = read("supabase/migrations/20261001003000_sprint_15b_release_reconciliation_index.sql");

test("Chapter II is introduced as a non-learner-facing review candidate", () => {
  assert.match(chapter, /'PHY7-U02'/);
  assert.match(chapter, /'review'::public\.content_status/);
  assert.match(chapter, /'physics7_u01_u02_2026_08_14_candidate_r2'/);
  assert.match(chapter, /'draft', 'exact'/);
  assert.doesNotMatch(chapter, /insert into public\.items\b/i);
  assert.doesNotMatch(chapter, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(chapter, /insert into public\.assessment_blueprints\b/i);
});

test("Chapter II stores all seven current official outcomes with normalized punctuation", () => {
  const statements = [
    "օրինակներով հիմնավորել նյութի մասնիկային կառուցվածքը (Հ29, Հ30)",
    "ներկայացնել մոլեկուլների չափերը՝ համեմատելով այլ մարմինների չափերի հետ (Հ4, Հ9, Հ28)",
    "նկարագրել ատոմների, մոլեկուլների շարժման առանձնահատկությունները նյութում (Հ8, Հ9)",
    "օրինակներով լուսաբանել դիֆուզիայի երևույթը (Հ9)",
    "բացատրել, թե ինչով է պայմանավորված մարմնի ջերմաստիճանը (Հ9, Հ29)",
    "բնութագրել դիֆուզիայի արագությունը գազերում, հեղուկներում և պինդ մարմիններում, բերել օրինակներ",
    "բացատրել ջերմաչափի աշխատանքի սկզբունքը",
  ];
  for (const statement of statements) assert.ok(chapter.includes(statement), statement);
  assert.match(chapter, /programme_attachment_sha256', '966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478'/);
});

test("candidate skills and prerequisites are explicit and remain review-gated", () => {
  for (let index = 1; index <= 9; index += 1) {
    assert.match(chapter, new RegExp(`PHY7-U02-S${String(index).padStart(2, "0")}`));
  }
  assert.match(chapter, /insert into public\.skill_prerequisites/);
  assert.match(chapter, /'skills_mapped', 'pending'/);
  assert.match(chapter, /'assessment_scope_bound', 'pending'/);
  assert.match(chapter, /'content_qa_passed', 'pending'/);
  assert.match(chapter, /'external_sme_approved', 'pending'/);
});

test("multi-unit releases require one completed reconciliation and three blueprints per unit", () => {
  assert.match(multiUnit, /curriculum_release_reconciliations/);
  assert.match(multiUnit, /r\.status = 'complete'/);
  assert.match(multiUnit, /cross join \(values \('practice'\), \('diagnostic'\), \('mastery_check'\)\)/i);
  assert.match(multiUnit, /1 <> \(/);
  assert.match(multiUnit, /guard_release_snapshot_immutability/);
  assert.match(advisorIndex, /\(reconciliation_id, unit_id\)/);
});

test("migration resolves production records by stable natural keys, not generated UUID literals", () => {
  assert.doesNotMatch(chapter, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  assert.match(chapter, /s\.code = 'physics'/);
  assert.match(chapter, /g\.grade_number = 7/);
});
