// Exercise the two real legacy start queries against the lifecycle table's actual
// migration DDL. This is an isolated SQL/query-contract test, not a live auth test.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('supabase/functions/start-learning-session/index.ts');
const queries = [...source.matchAll(/admin\s*\.from\("chapter_mastery_states"\)[\s\S]*?\.maybeSingle\(\)/g)].map(match => match[0]);
assert.equal(queries.length, 2, 'exercise both the review and mastery lifecycle reads');
const migration = read('supabase/migrations/0061_sprint_12_5_mastery_lifecycle_foundation.sql');
const tableStart = migration.indexOf('create table public.chapter_mastery_states (');
assert.ok(tableStart >= 0);
const lifecycleDDL = migration.slice(tableStart, migration.indexOf('\n);', tableStart) + 3);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const learner = id(1), otherLearner = id(2), release = id(3), otherRelease = id(4), policy = id(5);
let db;

before(async () => {
  db = new PGlite();
  // Only the foreign-key parent identities are doubles; lifecycle columns,
  // constraints and uniqueness are copied verbatim from the real migration.
  await db.exec(`create table public.profiles(id uuid primary key);
    create table public.curriculum_releases(id uuid primary key);
    create table public.academic_mastery_policy_versions(id uuid primary key);
    ${lifecycleDDL}`);
  await db.query('insert into profiles values ($1),($2)', [learner, otherLearner]);
  await db.query('insert into curriculum_releases values ($1),($2)', [release, otherRelease]);
  await db.query('insert into academic_mastery_policy_versions values ($1)', [policy]);
  for (const [stateId, studentId, releaseId, unitCode, state] of [
    [id(10), learner, release, 'PHY7-U01', 'review_required_attempt_2'],
    [id(11), otherLearner, release, 'PHY7-U01', 'mastery_ready'],
    [id(12), learner, otherRelease, 'PHY7-U01', 'mastery_retry_2_ready'],
    [id(13), learner, release, 'OTHER-U01', 'mastery_retry_3_ready'],
  ]) await db.query(`insert into chapter_mastery_states
    (id,student_id,curriculum_release_id,unit_code,academic_mastery_policy_id,lifecycle_state)
    values ($1,$2,$3,$4,$5,$6)`, [stateId, studentId, releaseId, unitCode, policy, state]);
});
after(async () => db?.close());

const identifier = value => {
  assert.match(value, /^[a-z_]+$/);
  return `"${value}"`;
};
function sqlClient() {
  return { from(table) {
    const predicates = [], values = [];
    let columns = '*';
    const query = {
      select(names) { columns = names.split(',').map(name => identifier(name.trim())).join(','); return query; },
      eq(column, value) { values.push(value); predicates.push(`${identifier(column)}=$${values.length}`); return query; },
      is(column, value) { assert.equal(value, null); predicates.push(`${identifier(column)} is null`); return query; },
      async maybeSingle() {
        try {
          const { rows } = await db.query(`select ${columns} from ${identifier(table)} where ${predicates.join(' and ')}`, values);
          assert.ok(rows.length <= 1, 'the lifecycle read must retain its unique student/release/unit scope');
          return { data: rows[0] ?? null, error: null };
        } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
      },
    };
    return query;
  } };
}

for (const [index, label] of ['chapter review', 'mastery check'].entries()) {
  test(`${label} start reads the actual lifecycle schema and keeps learner/release/unit isolation`, async () => {
    const execute = (studentId, releaseId, unitCode) => vm.runInNewContext(queries[index], {
      admin: sqlClient(), studentId, curriculumContext: { releaseId }, UNIT_CODE: unitCode,
    });
    const matching = await execute(learner, release, 'PHY7-U01');
    assert.equal(matching.error, null, JSON.stringify(matching.error));
    assert.equal(matching.data.lifecycle_state, 'review_required_attempt_2');
    if (index === 0) {
      assert.equal(matching.data.id, id(10));
      assert.equal(matching.data.academic_mastery_policy_id, policy);
    }
    for (const [studentId, releaseId, unitCode, expected] of [
      [otherLearner, release, 'PHY7-U01', 'mastery_ready'],
      [learner, otherRelease, 'PHY7-U01', 'mastery_retry_2_ready'],
      [learner, release, 'OTHER-U01', 'mastery_retry_3_ready'],
      [otherLearner, otherRelease, 'PHY7-U01', null],
    ]) {
      const result = await execute(studentId, releaseId, unitCode);
      assert.equal(result.error, null, JSON.stringify(result.error));
      assert.equal(result.data?.lifecycle_state ?? null, expected);
    }
  });
}
