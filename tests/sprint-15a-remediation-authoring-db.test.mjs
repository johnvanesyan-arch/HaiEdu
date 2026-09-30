import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const fixture = readFileSync("tests/fixtures/sprint-15a-remediation-authoring.sql", "utf8");
const migration = readFileSync("supabase/migrations/20260930120000_sprint_15a_remediation_authoring_foundation.sql", "utf8");
const roleCastMigration = readFileSync("supabase/migrations/20260930204139_sprint_15a_authoring_role_cast.sql", "utf8");
const actor = "10000000-0000-4000-8000-000000000010";
const guide = "10000000-0000-4000-8000-000000000011";

function content(title = "Նոր վերնագիր") {
  return JSON.stringify({
    skillId: "10000000-0000-4000-8000-000000000007",
    misconceptionCode: "test_misconception",
    titleHy: title,
    strategyHy: "Նոր ռազմավարություն",
    hint1Hy: "Նոր առաջին հուշում",
    hint2Hy: "Նոր երկրորդ հուշում",
    workedExampleHy: "Նոր այլ թվերով օրինակ",
    allowedParameterKeys: [],
    metadata: {},
  });
}

const references = JSON.stringify({ sourceTitle: "Դասագիրք", sourceLocator: "էջ 10" });

async function append(db, expected, status, snapshot, aal = "aal1") {
  return db.query(`select public.service_append_remediation_guide_authoring_version(
    $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10
  ) as result`, ["skill", guide, expected, status, snapshot, references, `Փոփոխություն ${expected}`, actor, "content_admin", aal]);
}

test("15A database workflow preserves runtime until reviewed AAL2 publish", async () => {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(fixture);
  await db.exec(migration);
  await db.exec(roleCastMigration);

  const initial = await db.query("select count(*)::int count from remediation_guide_authoring_versions");
  assert.equal(initial.rows[0].count, 2);

  await append(db, 1, "draft", content());
  let runtime = await db.query("select title_hy, guide_version from skill_remediation_guides where id=$1", [guide]);
  assert.deepEqual(runtime.rows[0], { title_hy: "Գործող վերնագիր", guide_version: 1 });

  await append(db, 2, "review", content());
  await assert.rejects(() => append(db, 3, "published", content("Չստուգված փոփոխություն"), "aal2"), /published_content_must_match_review/);
  await assert.rejects(() => append(db, 3, "published", content(), "aal1"), /mfa_required/);

  await append(db, 3, "published", content(), "aal2");
  runtime = await db.query("select title_hy, guide_version from skill_remediation_guides where id=$1", [guide]);
  assert.deepEqual(runtime.rows[0], { title_hy: "Նոր վերնագիր", guide_version: 2 });

  const latest = await db.query("select lifecycle_status, authoring_version, actor_id, actor_aal, published_runtime_version from remediation_guide_authoring_versions where guide_source_id=$1 order by authoring_version desc limit 1", [guide]);
  assert.deepEqual(latest.rows[0], {
    lifecycle_status: "published",
    authoring_version: 4,
    actor_id: actor,
    actor_aal: "aal2",
    published_runtime_version: 2,
  });

  const runtimeSnapshot = await db.query("select actor_id, actor_role, change_rationale, lifecycle_action from remediation_guide_versions where guide_source_id=$1 and guide_version=2", [guide]);
  assert.equal(runtimeSnapshot.rows.length, 1);
  assert.equal(runtimeSnapshot.rows[0].actor_id, actor);
  assert.equal(runtimeSnapshot.rows[0].actor_role, "content_admin");
  assert.equal(runtimeSnapshot.rows[0].lifecycle_action, "published");

  await assert.rejects(() => db.query("update remediation_guide_authoring_versions set change_rationale='փոփոխված' where guide_source_id=$1", [guide]), /append-only/);
  await db.close();
});
