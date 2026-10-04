import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoringDatabase,answer,state,args,id,actor,migrationPath} from './fixtures/answer-scoring-db.mjs';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {initialMasteryState,updateMastery} from '../supabase/functions/_shared/mastery.ts';
import {gradeAnswer} from '../supabase/functions/_shared/grading.ts';
import {recommendNext} from '../supabase/functions/_shared/recommendation.ts';
import {getPracticeDiagnosticBlock} from '../supabase/functions/_shared/practice-diagnostic-gate.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
async function fixture(t,options){const db=await scoringDatabase(options);t.after(()=>db.close());return db;}
async function legacy(db,n,correct){const a=args(n,correct),m=updateMastery(initialMasteryState(),{score:correct?1:0,difficulty:3,hintUsed:false});a.splice(12,0,m.alpha,m.beta,m.masteryScore,m.evidenceCount,m.status);return (await db.query('select record_session_graded_attempt('+a.map((_,i)=>'$'+(i+1)).join(',')+') result',a)).rows[0].result;}

test('two stale precomputed answer snapshots reproduce lost evidence before the fix and accumulate after it',async t=>{
 const db=await fixture(t,{baseline:true});
 await legacy(db,1,true);await legacy(db,2,false);
 assert.equal((await state(db)).evidence_count,1);
 await db.exec('truncate attempts,student_skill_mastery,student_skill_mastery_by_release,fixture_exposures; update learning_session_items set attempt_id=null,answered_at=null; update learning_sessions set answered_count=0,correct_count=0 where status=\'active\';');
 await db.exec(readFileSync(migrationPath,'utf8'));
 await legacy(db,1,true);await legacy(db,2,false);
 const actual=await state(db);assert.equal(actual.evidence_count,2);near(actual.mastery_score,.5);
 const session=(await db.query('select answered_count,correct_count from learning_sessions where id=$1',[id(401)])).rows[0];assert.deepEqual(session,{answered_count:2,correct_count:1});
});
test('all five difficulty levels and hinted successes match the existing TypeScript formula',async t=>{
 const db=await fixture(t);let expected=initialMasteryState();
 for(let n=1;n<=10;n++){
  const difficulty=1+(n-1)%5,hintUsed=n>5,correct=n%3!==0;
  await db.query('update items set difficulty=$1 where id=$2',[difficulty,id(500+n)]);
  await db.query('update learning_session_items set hint_level_used=$1 where id=$2',[hintUsed?2:0,id(600+n)]);
  expected=updateMastery(expected,{score:correct?1:0,difficulty,hintUsed});
  const result=await answer(db,n,correct),actual=await state(db);
  near(actual.alpha_evidence,expected.alpha);near(actual.beta_evidence,expected.beta);near(actual.mastery_score,expected.masteryScore);
  assert.equal(actual.evidence_count,expected.evidenceCount);assert.equal(actual.status,expected.status);
  near(result.masteryAfter.masteryScore,expected.masteryScore);assert.equal(result.hintUsed,hintUsed);
 }
});
test('a repeated assignment contributes exactly once, including after session completion',async t=>{
 const db=await fixture(t);await db.query('update learning_sessions set planned_item_count=1 where id=$1',[id(401)]);
 const first=await answer(db,1),second=await answer(db,1,false);assert.equal(second.replayed,true);assert.equal(second.attemptId,first.attemptId);
 assert.equal((await state(db)).evidence_count,1);
 assert.equal((await db.query('select count(*)::integer n from attempts')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::integer n from fixture_exposures')).rows[0].n,1);
});
test('near-threshold evidence preserves the existing model arithmetic and status',async t=>{
 const db=await fixture(t);let expected=initialMasteryState();
 for(let n=1;n<=10;n++){
  const correct=n<=8;expected=updateMastery(expected,{score:correct?1:0,difficulty:3,hintUsed:false});
  const result=await answer(db,n,correct);
  assert.equal(result.masteryAfter.status,expected.status);
  assert.equal(result.masteryAfter.masteryScore,expected.masteryScore);
 }
 assert.equal((await state(db)).status,expected.status);
});
test('release-bound configurations and evidence remain separate for the same learner and skill',async t=>{
 const db=await fixture(t);await answer(db,1);await answer(db,11);
 const a=await state(db),b=await state(db,202);near(a.alpha_evidence,3.1);near(b.alpha_evidence,3.8);near(b.beta_evidence,1);
 assert.equal(a.evidence_count,1);assert.equal(b.evidence_count,1);
 // Bound sessions retain their frozen configuration when the future runtime binding moves.
 await db.query('update learning_model_runtime_bindings set learning_model_configuration_id=$1 where curriculum_release_id=$2',[id(102),id(201)]);
 await answer(db,2);near((await state(db)).alpha_evidence,4.2);
});
test('failed model resolution rolls back the attempt, assignment, progress and session counters',async t=>{
 const db=await fixture(t);await db.query('update learning_model_configurations set configuration=\'{}\' where id=$1',[id(101)]);
 await assert.rejects(answer(db,1),/unsupported_learning_model_mastery_contract/);
 assert.equal(await state(db),undefined);assert.equal((await db.query('select count(*)::integer n from attempts')).rows[0].n,0);
 assert.equal((await db.query('select answered_count from learning_sessions where id=$1',[id(401)])).rows[0].answered_count,0);
});
test('ownership, assigned item, inactive session and actual chapter diagnostic guards still deny writes',async t=>{
 const db=await fixture(t);await assert.rejects(answer(db,1,true,id(999)),/invalid_or_inactive_session_item/);
 const wrong=args(1);wrong[3]=id(502);await assert.rejects(db.query('select service_record_session_answer_atomic('+wrong.map((_,i)=>'$'+(i+1)).join(',')+')',wrong),/invalid_or_inactive_session_item/);
 await db.query('update learning_sessions set status=\'abandoned\' where id=$1',[id(401)]);await assert.rejects(answer(db,1),/invalid_or_inactive_session_item/);
 await db.query('update learning_sessions set status=\'active\' where id=$1',[id(401)]);
 await db.query('delete from learning_sessions where id=$1',[id(403)]);await assert.rejects(answer(db,1),/chapter_diagnostic_required/);
 assert.equal((await db.query('select count(*)::integer n from attempts')).rows[0].n,0);
});
test('old and new RPCs stay service-only and the private accumulator is not a public API',async t=>{
 const db=await fixture(t);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);try{await assert.rejects(answer(db,1),/permission denied/);await assert.rejects(legacy(db,1,true),/permission denied/);}finally{await db.exec('reset role');}}
 await db.exec('set role service_role');try{assert.equal((await answer(db,1)).masteryAfter.evidenceCount,1);await assert.rejects(db.query('select private.apply_configured_mastery_attempt($1)',[id(999)]),/permission denied/);}finally{await db.exec('reset role');}
});
test('legacy sessionless writes use the same accumulator and retain the diagnostic gate',async t=>{
 const db=await fixture(t);const a=[actor,id(501),id(50),'{}',null,1,true,null,false,null,3.1,2,3.1/5.1,1,'insufficient_evidence','2026-10-04T09:00:00Z'];
 const call=()=>db.query('select record_graded_attempt('+a.map((_,i)=>'$'+(i+1)).join(',')+')',a);
 await call();await call();assert.equal((await state(db)).evidence_count,2);near((await state(db)).alpha_evidence,4.2);
 await db.query('delete from learning_sessions where id=$1',[id(403)]);await assert.rejects(call(),/chapter_diagnostic_required/);
});
test('actual answer handler returns committed progress and telemetry and retains Auth/course guards',async t=>{
 const db=await fixture(t),events=[];
 const bindings={gradeAnswer,recommendNext,getPracticeDiagnosticBlock,hasPhysics7Access:async()=>true,issueRecommendationEvent:async e=>{events.push(e);return 'fixture-event';}};
 const api=await endpoint(db,'submit-answer',bindings);
 const body=n=>({sessionId:id(401),sessionItemId:id(600+n),itemId:id(500+n),response:{value:n===1?5:0}});
 const results=await Promise.all([api.call(body(1)),api.call(body(2))]);assert.ok(results.every(r=>r.status===200));
 const committed=await state(db);near(committed.mastery_score,.5);assert.equal(committed.evidence_count,2);
 assert.deepEqual(results.map(r=>r.body.mastery.evidenceCount).sort(),[1,2]);
 assert.deepEqual(events.map(e=>e.stateSnapshot.masteryAfter.evidenceCount).sort(),[1,2]);
 assert.equal((await api.call(body(1))).status,409);assert.equal(events.length,2);
 assert.equal((await api.call(body(3),{anonymous:true})).status,401);
 api.revoke();assert.equal((await api.call(body(3))).status,403);
 const denied=await endpoint(db,'submit-answer',{...bindings,hasPhysics7Access:async()=>false});assert.equal((await denied.call(body(3))).status,403);
});
