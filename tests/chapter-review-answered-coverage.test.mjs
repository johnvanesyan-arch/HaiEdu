import test, { before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const db = new PGlite();
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const start = async (ids, cycle = 1, session = 1, pool = 4) => {
  const items = ids.map((n, i) => ({ ordinal: i + 1, item_id: uuid(n), skill_id: uuid(n <= 2 ? 101 : 102), selection_reason: "test", pool_exhausted: true }));
  const rows = await query("select public.start_chapter_review_atomic($1,$2,$3,'TEST-U01',$4,$5,$6,$7,$8) as result", [uuid(200), uuid(300), uuid(400), JSON.stringify({coverageBasis:"answered_once"}), JSON.stringify(items), pool, cycle, session]);
  return rows[0].result;
};
const answer = async (sessionId, n, correct = false, student = uuid(200)) => {
  const [item] = await query("select * from learning_session_items where session_id=$1 and item_id=$2", [sessionId, uuid(n)]);
  const [a] = await query("insert into attempts(student_id,item_id,learning_session_id,learning_session_item_id,correct) values($1,$2,$3,$4,$5) returning id", [student, uuid(n), sessionId, item.id, correct]);
  await query("update learning_session_items set answered_at=now(),attempt_id=$1,correct=$2 where id=$3", [a.id, correct, item.id]);
  await query("update learning_sessions set answered_count=answered_count+1 where id=$1", [sessionId]);
};
const abandon = async (sessionId) => {
  await query("update learning_sessions set status='abandoned' where id=$1", [sessionId]);
  await query("update chapter_review_sessions set status='abandoned' where learning_session_id=$1", [sessionId]);
};
const finish = async (sessionId) => {
  await query("update learning_sessions set status='completed',completed_at=now() where id=$1", [sessionId]);
  await query("update chapter_review_sessions set status='completed',completed_at=now() where learning_session_id=$1", [sessionId]);
};
const covered = async () => Number((await query("select count(*) as n from chapter_review_answered_items_v"))[0].n);

before(async () => {
  await db.exec(read("tests/fixtures/chapter-review-database.sql"));
  await db.exec(read("supabase/migrations/0069_sprint_12_5_review_cycles.sql"));
  const coverage = read("supabase/migrations/0074_sprint_12_5_integrity_coverage_and_closure.sql");
  await db.exec(coverage.slice(coverage.indexOf("create view public.chapter_review_coverage_v"), coverage.indexOf("create view public.chapter_mastery_history_provenance_v")));
  const summary = read("supabase/migrations/0072_sprint_12_5_review_analytics_and_evidence.sql");
  await db.exec(summary.slice(summary.indexOf("create view public.chapter_review_summary_v"), summary.indexOf("create view public.chapter_review_skill_attention_inputs_v")));
  await db.exec(read("supabase/migrations/20260927094337_chapter_review_answered_coverage.sql"));
});
after(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("begin");
  await query("insert into curriculum_releases values($1)", [uuid(300)]);
  await query("insert into units values($1,'TEST-U01')", [uuid(301)]);
  await query("insert into skills values($1,'S1','S1'),($2,'S2','S2')", [uuid(101), uuid(102)]);
  await query("insert into academic_mastery_policy_versions values($1,2,3)", [uuid(500)]);
  await query("insert into chapter_mastery_states values($1,$2,$3,'TEST-U01',$4,'mastery_passed',1,1,now())", [uuid(600), uuid(200), uuid(300), uuid(500)]);
  await query("insert into assessment_blueprints values($1,$2,$3,'chapter_review','pilot')", [uuid(400), uuid(300), uuid(301)]);
  for (let n = 1; n <= 4; n++) {
    await query("insert into items(id,code,version_no,skill_id,status) values($1,$2,1,$3,'published')", [uuid(n), `Q${n}`, uuid(n <= 2 ? 101 : 102)]);
    await query("insert into assessment_blueprint_items values($1,$2)", [uuid(400),uuid(n)]);
  }
});
afterEach(async () => { await db.exec("rollback"); });

test("assigning questions gives zero coverage; resuming preserves the session and its items", async () => {
  const first = await start([1,2]);
  assert.equal(await covered(), 0);
  const resumed = await start([3,4]);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.sessionId, first.sessionId);
  assert.deepEqual((await query("select item_id from learning_session_items order by ordinal")).map(x=>x.item_id), [uuid(1),uuid(2)]);
});

test("a wrong answer counts; an unanswered reservation from an abandoned session remains eligible", async () => {
  const first = await start([1,2]);
  await answer(first.sessionId,1,false);
  await abandon(first.sessionId);
  assert.equal(await covered(), 1);
  assert.deepEqual((await query("select answered_item_ids from chapter_review_answered_totals_v"))[0].answered_item_ids,[uuid(1)]);
  const second = await start([2,3],1,2);
  const [exposure] = await query("select exact_repeat,answered_in_current_cycle,pool_exhausted from chapter_review_item_exposures where chapter_review_session_id=$1 and item_id=$2", [second.reviewSessionId,uuid(2)]);
  assert.deepEqual(exposure, {exact_repeat:true,answered_in_current_cycle:false,pool_exhausted:false});
  const [coverage] = await query("select current_cycle_unique_items_seen,current_cycle_coverage_percent from chapter_review_coverage_v");
  assert.equal(coverage.current_cycle_unique_items_seen,1);
  assert.equal(Number(coverage.current_cycle_coverage_percent),25);
  assert.equal((await query("select current_cycle_unique_seen from chapter_review_summary_v"))[0].current_cycle_unique_seen,1);
});

test("full allocation does not close a cycle; the last unanswered question precedes repeat fill", async () => {
  const a = await start([1,2]); await answer(a.sessionId,1); await abandon(a.sessionId);
  const b = await start([3,4],1,2); await answer(b.sessionId,3); await answer(b.sessionId,4); await finish(b.sessionId);
  assert.equal(await covered(),3);
  assert.equal((await query("select status from chapter_review_cycles"))[0].status,'active');
  const c = await start([2,1],1,3);
  assert.equal(c.reviewCycleNumber,1);
  await answer(c.sessionId,2,false); await answer(c.sessionId,1,true); await finish(c.sessionId);
  assert.equal(await covered(),4);
  assert.equal((await query("select status from chapter_review_cycles"))[0].status,'completed');
  const d = await start([1,3],2,1);
  assert.equal(d.reviewCycleNumber,2);
  assert.equal((await query("select count(*)::integer as n from chapter_review_item_exposures where chapter_review_session_id=$1 and answered_in_current_cycle",[d.reviewSessionId]))[0].n,0);
});

test("the database rejects premature repeats even when caller marks the pool exhausted", async () => {
  const a=await start([1,2]); await answer(a.sessionId,1); await abandon(a.sessionId);
  await assert.rejects(start([1,3],1,2), /review_repeat_before_answered_coverage/);
});

test("the database rejects a repeat placed before the last unanswered question", async () => {
  const a=await start([1,2]); await answer(a.sessionId,1); await answer(a.sessionId,2); await finish(a.sessionId);
  const b=await start([3,4],1,2); await answer(b.sessionId,3); await abandon(b.sessionId);
  await assert.rejects(start([1,4],1,3), /review_repeat_before_answered_coverage/);
});

test("a timestamp alone or an attempt belonging to another student gives no coverage", async () => {
  const a=await start([1,2]);
  await query("update learning_session_items set answered_at=now() where session_id=$1 and item_id=$2", [a.sessionId,uuid(1)]);
  await answer(a.sessionId,2,true,uuid(999));
  assert.equal(await covered(),0);
});

test("a changed pool cannot falsely complete the old cycle", async () => {
  const a=await start([1,2]); await abandon(a.sessionId);
  await query("update items set status='retired' where id=$1",[uuid(4)]);
  await assert.rejects(start([1,2],1,2,3), /review_pool_changed/);
});

test("stale session numbering is rejected after an abandoned review", async () => {
  const a=await start([1,2]); await abandon(a.sessionId);
  await assert.rejects(start([3,4],1,1), /stale_review_selection_context/);
});

test("answered coverage does not permit a shorter required review", async () => {
  await query("update chapter_mastery_states set lifecycle_state='review_required_attempt_2',passed_on_attempt=null where id=$1",[uuid(600)]);
  await query("insert into chapter_review_requirements(id,chapter_mastery_state_id,status,required_after_attempt) values($1,$2,'required',1)",[uuid(700),uuid(600)]);
  await assert.rejects(start([1]), /invalid_review_item_count/);
});

test("answered coverage remains service-only and uses invoker security", async () => {
  const [access]=await query("select has_table_privilege('anon','chapter_review_answered_items_v','select') as anon,has_table_privilege('authenticated','chapter_review_answered_items_v','select') as authenticated,has_table_privilege('service_role','chapter_review_answered_items_v','select') as service");
  assert.deepEqual(access,{anon:false,authenticated:false,service:true});
  const [view]=await query("select reloptions from pg_class where oid='chapter_review_answered_items_v'::regclass");
  assert.ok(view.reloptions.includes('security_invoker=true'));
});
