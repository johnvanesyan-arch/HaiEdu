import test from 'node:test';
import assert from 'node:assert/strict';
import {scoringDatabase, id, actor} from './fixtures/answer-scoring-db.mjs';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {routeGovernedLearning} from '../supabase/functions/_shared/governed-learning-runtime.mjs';
import {gradeAnswer} from '../supabase/functions/_shared/grading.ts';
import {recommendNext} from '../supabase/functions/_shared/recommendation.ts';
import {getPracticeDiagnosticBlock} from '../supabase/functions/_shared/practice-diagnostic-gate.ts';
import {installAnswerRecovery} from './fixtures/answer-recovery-db.mjs';
import {database as governedDatabase,launch,operation,finish,id as gid,scopes} from './fixtures/assessed-audio-db.mjs';
import {ready} from './fixtures/governed-mastery-forms-db.mjs';
import {postgresClient} from './fixtures/learning-acceptance.mjs';

const options=async()=>process.env.PHASE3_POSTGRES_17_CI==='1'?{client:await postgresClient()}:{};
const legacyDatabase=async()=>scoringDatabase(await options());
const currentGovernedDatabase=async()=>governedDatabase(await options());

const legacyBody = n => ({sessionId:id(401),sessionItemId:id(600+n),itemId:id(500+n),response:{value:5},responseTimeMs:1000,hintUsed:false});
const originalResult = value => {const {replayed,...rest}=value;return rest;};
async function legacyFixture(t, extra={}) {
  const db=await legacyDatabase();t.after(()=>db.close());await installAnswerRecovery(db,{legacy:true});
  const api=await endpoint(db,'submit-answer',{
    routeGovernedLearning,gradeAnswer,recommendNext,getPracticeDiagnosticBlock,fixtureAuthSessionId:id(901),
    hasPhysics7Access:async()=>true,...extra,
  });
  return {db,api};
}

test('a lost legacy answer reply can recover its original result without another attempt', async t => {
  const db = await legacyDatabase(); t.after(() => db.close());
  await installAnswerRecovery(db,{legacy:true});
  const events = [];
  const api = await endpoint(db, 'submit-answer', {
    routeGovernedLearning, gradeAnswer, recommendNext, getPracticeDiagnosticBlock,
    fixtureAuthSessionId:id(901),
    hasPhysics7Access: async () => true,
    issueRecommendationEvent: async e => {events.push(e); return 'fixture-event';},
  });
  const body = {sessionId:id(401), sessionItemId:id(601), itemId:id(501), response:{value:5}, responseTimeMs:1000, hintUsed:false};
  const original = await api.call(body);
  assert.equal(original.status, 200);
  // The transport loses original; a later, identical caller retry must recover it.
  const recovered = await api.call(body);
  assert.equal(recovered.status, 200);
  assert.deepEqual({...recovered.body, replayed:undefined}, {...original.body, replayed:undefined});
  assert.equal(recovered.body.replayed, true);
  assert.equal((await db.query('select count(*)::int n from attempts where student_id=$1',[actor])).rows[0].n, 1);
  assert.equal((await db.query('select evidence_count from student_skill_mastery')).rows[0].evidence_count, 1);
  assert.equal(events.length, 0);
  assert.equal((await db.query("select count(*)::int n from recommendation_events where event_type='issued'")).rows[0].n, 1);
});

test('legacy replay keeps the original mastery and recommendation after later answers and key changes',async t=>{
  const {db,api}=await legacyFixture(t);
  const first=await api.call(legacyBody(1));assert.equal(first.status,200);
  assert.equal((await api.call(legacyBody(2))).status,200);
  await db.query("update item_answer_keys set answer='{"+'"value":0'+"}' where item_id=$1",[id(501)]);
  const before=(await db.query('select to_jsonb(r) v,xmin::text version from private.learning_answer_receipts r where session_item_id=$1',[id(601)])).rows[0];
  const again=await api.call(legacyBody(1));assert.equal(again.status,200);
  assert.deepEqual(originalResult(again.body),originalResult(first.body));
  assert.equal(again.body.mastery.evidenceCount,1);
  assert.equal((await db.query('select evidence_count from student_skill_mastery')).rows[0].evidence_count,2);
  assert.deepEqual((await db.query('select to_jsonb(r) v,xmin::text version from private.learning_answer_receipts r where session_item_id=$1',[id(601)])).rows[0],before);
  assert.equal((await db.query('select count(*)::int n from recommendation_events')).rows[0].n,2);
});

test('legacy response construction resumes from frozen core state without invoking the grader',async t=>{
  const {db,api}=await legacyFixture(t,{gradeAnswer:()=>{throw Error('must not regrade');}});
  const args=[actor,id(401),id(601),id(501),id(50),JSON.stringify({value:5}),null,1,true,null,false,1000,'2026-11-04T07:00:00Z'];
  await db.query('select service_record_session_answer_atomic('+args.map((_,i)=>'$'+(i+1)).join(',')+')',args);
  const result=await api.call(legacyBody(1));assert.equal(result.status,200);
  assert.equal(result.body.grading.correct,true);assert.equal(result.body.mastery.evidenceCount,1);
  assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from recommendation_events')).rows[0].n,1);
});

test('legacy final-answer replay, changed payload and revoked Auth session have distinct outcomes',async t=>{
  const {db,api}=await legacyFixture(t);
  await db.query('update learning_sessions set planned_item_count=1 where id=$1',[id(401)]);
  const first=await api.call(legacyBody(1));assert.equal(first.status,200);assert.equal(first.body.session.status,'completed');
  const replay=await api.call(legacyBody(1));assert.equal(replay.status,200);assert.deepEqual(originalResult(replay.body),originalResult(first.body));
  for(const body of [{...legacyBody(1),response:{value:0}},{...legacyBody(1),responseTimeMs:1001}]){
    const conflict=await api.call(body);assert.equal(conflict.status,409);assert.equal(conflict.body.error,'answer_response_conflict');
  }
  await db.query('delete from auth.sessions');
  const denied=await api.call(legacyBody(1));assert.equal(denied.status,403);assert.equal(denied.body.grading,undefined);
  assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,1);
});

test('legacy recovery reuses an issued recommendation from the SQL-before-Edge rollout window',async t=>{
  const {db,api}=await legacyFixture(t,{gradeAnswer:()=>{throw Error('must not regrade');}});
  const args=[actor,id(401),id(601),id(501),id(50),JSON.stringify({value:5}),null,1,true,null,false,1000,'2026-11-04T07:00:00Z'];
  const core=(await db.query('select service_record_session_answer_atomic('+args.map((_,i)=>'$'+(i+1)).join(',')+') v',args)).rows[0].v;
  const instance=id(999),snapshot={action:'review_skill',reasonCode:'frozen_rollout_recommendation'};
  await db.query(`insert into recommendation_events(recommendation_instance_id,student_id,event_type,policy_scope,surface,attempt_id,recommendation_snapshot)
    values($1,$2,'issued','core_after_attempt','submit_answer_api',$3,$4::jsonb)`,[instance,actor,core.attemptId,JSON.stringify(snapshot)]);
  const first=await api.call(legacyBody(1));assert.equal(first.status,200);
  assert.equal(first.body.recommendation.instanceId,instance);assert.equal(first.body.recommendation.reasonCode,snapshot.reasonCode);
  const replay=await api.call(legacyBody(1));assert.equal(replay.status,200);assert.deepEqual(originalResult(replay.body),originalResult(first.body));
  assert.equal((await db.query('select count(*)::int n from recommendation_events')).rows[0].n,1);
});

test('optional legacy telemetry failure does not trap a committed answer or retry issuance on replay',async t=>{
  const {db,api}=await legacyFixture(t);
  await db.exec("create function private.fixture_event_failure() returns trigger language plpgsql as $$begin raise exception 'fixture_event_failure';end$$; create trigger fixture_event_failure before insert on recommendation_events for each row execute function private.fixture_event_failure();");
  const first=await api.call(legacyBody(1));assert.equal(first.status,200);assert.equal(first.body.recommendation.instanceId,null);
  await db.exec('drop trigger fixture_event_failure on recommendation_events');
  const replay=await api.call(legacyBody(1));assert.equal(replay.status,200);assert.deepEqual(originalResult(replay.body),originalResult(first.body));
  assert.equal((await db.query('select count(*)::int n from recommendation_events')).rows[0].n,0);
});

test('unreceipted historical answers are not fabricated or graded again',async t=>{
  const {db,api}=await legacyFixture(t,{gradeAnswer:()=>{throw Error('must not regrade');}});
  await db.query('update learning_session_items set answered_at=now() where id=$1',[id(601)]);
  const result=await api.call(legacyBody(1));assert.equal(result.status,409);
  assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,0);
});

test('governed receipts recover frozen immediate feedback independently in two subjects',async t=>{
  const db=await currentGovernedDatabase();t.after(()=>db.close());await installAnswerRecovery(db);
  for(const idx of [0,2]) {
    const baseline=await launch(db,idx);await finish(db,baseline.session.id);
    const start=await launch(db,idx,'practice',{skill:gid(scopes[idx].skills[0])});
    const item=await operation(db,start.session.id,'serve');
    const body={sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?true:item.item.options[0].option_key},responseTimeMs:1000};
    const first=await operation(db,start.session.id,'answer',body);
    const counts=(await db.query('select (select count(*) from attempts)::int attempts,(select count(*) from recommendation_events)::int events')).rows[0];
    const replay=await operation(db,start.session.id,'answer',body);
    assert.equal(replay.replayed,true);assert.deepEqual(originalResult(replay),originalResult(first));
    assert.deepEqual((await db.query('select (select count(*) from attempts)::int attempts,(select count(*) from recommendation_events)::int events')).rows[0],counts);
    await assert.rejects(operation(db,start.session.id,'answer',{...body,response:{value:'different'}}),/answer_response_conflict/);
    await assert.rejects(operation(db,start.session.id,'answer',{...body,expectedMode:'mastery_check'}),/learning_context_unavailable/);
  }
});

test('completed governed diagnostic replays preserve deferred feedback and the original final result',async t=>{
  const db=await currentGovernedDatabase();t.after(()=>db.close());await installAnswerRecovery(db);
  const start=await launch(db);let last,body;
  for(let n=0;n<start.session.planned_item_count;n++) {
    const item=await operation(db,start.session.id,'serve');
    body={sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?true:item.item.options[0].option_key},responseTimeMs:1000};
    last=await operation(db,start.session.id,'answer',body);
    assert.equal(last.revealCorrect,false);assert.equal(last.grading,undefined);
    if(last.session.status==='active')assert.equal(last.session.correct_count,undefined);
  }
  assert.equal(last.session.status,'completed');
  const replay=await operation(db,start.session.id,'answer',body);assert.deepEqual(originalResult(replay),originalResult(last));
  await db.query('delete from auth.sessions where id=$1',[gid(401)]);
  await assert.rejects(operation(db,start.session.id,'answer',body),/learning_context_unavailable/);
});

test('receipt write failure rolls back governed grading, progress and telemetry in the same transaction',async t=>{
  const db=await currentGovernedDatabase();t.after(()=>db.close());await installAnswerRecovery(db);
  const start=await launch(db),item=await operation(db,start.session.id,'serve');
  await db.exec("create function private.fixture_receipt_failure() returns trigger language plpgsql as $$begin raise exception 'fixture_receipt_failure';end$$; create trigger fixture_receipt_failure before insert on private.learning_answer_receipts for each row execute function private.fixture_receipt_failure();");
  await assert.rejects(operation(db,start.session.id,'answer',{sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?true:item.item.options[0].option_key}}),/fixture_receipt_failure/);
  assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,0);
  assert.equal((await db.query('select answered_count from learning_sessions where id=$1',[start.session.id])).rows[0].answered_count,0);
  assert.equal((await db.query('select count(*)::int n from private.learning_answer_receipts')).rows[0].n,0);
});

test('the final mastery response is replayable without another scored attempt or revealed intermediate answers',async t=>{
  const db=await currentGovernedDatabase();t.after(()=>db.close());await installAnswerRecovery(db);
  const baseline=await launch(db);await finish(db,baseline.session.id);await ready(db);
  const start=await launch(db,0,'mastery_check');let last,body;
  for(let n=0;n<start.session.planned_item_count;n++) {
    const item=await operation(db,start.session.id,'serve');
    body={sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?true:item.item.options[0].option_key},responseTimeMs:1000,expectedMode:'mastery_check'};
    last=await operation(db,start.session.id,'answer',body);
    assert.equal(last.revealCorrect,false);assert.equal(last.grading,undefined);
    if(last.session.status==='active')assert.equal(last.finalResult,null);
  }
  assert.equal(last.session.status,'completed');assert.ok(last.finalResult);
  const counts=(await db.query('select (select count(*) from attempts)::int answers,(select count(*) from mastery_check_attempts)::int checks')).rows[0];
  const replay=await operation(db,start.session.id,'answer',body);assert.deepEqual(originalResult(replay),originalResult(last));
  assert.deepEqual((await db.query('select (select count(*) from attempts)::int answers,(select count(*) from mastery_check_attempts)::int checks')).rows[0],counts);
});

test('receipt storage and renamed implementation functions are private; account deletion cascades new receipts',async t=>{
  const {db,api}=await legacyFixture(t);assert.equal((await api.call(legacyBody(1))).status,200);
  await assert.rejects(db.query("update private.learning_answer_receipts set response='{}'"),/answer_receipt_immutable/);
  for(const role of ['anon','authenticated','service_role']) {
    await db.exec('set role '+role);
    await assert.rejects(db.query('select * from private.learning_answer_receipts'),/permission denied/);
    await assert.rejects(db.query("select private.governed_operation_before_recovery(null,null,null,'status','{}')"),/permission denied/);
    await db.exec('reset role');
  }
  const denied=await endpoint(db,'submit-answer',{routeGovernedLearning,gradeAnswer,recommendNext,getPracticeDiagnosticBlock,
    fixtureAuthSessionId:id(901),hasPhysics7Access:async()=>false});
  assert.equal((await denied.call(legacyBody(1))).status,403);
  await db.query('delete from profiles where id=$1',[actor]);
  assert.equal((await db.query('select count(*)::int n from private.learning_answer_receipts')).rows[0].n,0);
});
