import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTypedKey,normalizeTypedText} from '../supabase/functions/_shared/typed-fields.mjs';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
import {database,configureTyped,configure,makeReady,finish,blueprintId,definition,key,response,launch,operation,id,dashboard} from './fixtures/typed-fields-db.mjs';

test('typed alternatives are explicit; normalization never invents a grammar correction',async()=>{
 const db=await database();try{
  validateTypedKey(definition,key);
  for(let flags=0;flags<16;flags++){
   const rules={trim:!!(flags&1),collapseWhitespace:!!(flags&2),apostrophes:!!(flags&4),caseMode:flags&8?'ascii-insensitive':'sensitive'};
   for(const input of ['return','train','north','r','n','t','\tReturn\r\n','  two\t\twords  ','\\treturn\\n','\u00a0return\u00a0','Don’t','\t\r\n']){
    const sql=(await db.query('select private.normalize_typed_text($1,$2) normalized',[input,JSON.stringify(rules)])).rows[0].normalized;
    assert.equal(sql,normalizeTypedText(input,rules),JSON.stringify({input,rules}));
   }
  }
  for(const accepted of ['return','r','n','t']){
   const edgeKey=structuredClone(key);edgeKey.fields.colour.accepted=[accepted];
   validateTypedKey(definition,edgeKey);
   await db.query('select private.validate_typed_key($1,$2)',[definition,edgeKey].map(x=>JSON.stringify(x)));
  }
  for(const [input,score] of [[response(' BLUE ','more   slowly'),1],[response('bl ue','most slowly'),0],[response('blue',''),.5],[response('blue','More slowly'),.5]]){
   const result=(await db.query('select private.grade_typed_fields($1,$2,$3) g',[definition,key,input].map(x=>JSON.stringify(x)))).rows[0].g;
   assert.equal(result.score,score);assert.equal(result.correct,score===1);assert.equal(result.components.length,2);
   for(const field of definition.fields)assert.equal(result.normalizedResponse.fields[field.id],normalizeTypedText(input.fields[field.id],key.fields[field.id].normalization));
  }
  for(const bad of [{schemaVersion:definition.schemaVersion,fields:{colour:'blue'}},{...response(),fields:{...response().fields,forged:'x'}},{...response(),fields:{colour:1,manner:''}},{...response(),schemaVersion:'future'}])await assert.rejects(db.query('select private.grade_typed_fields($1,$2,$3)',[definition,key,bad].map(x=>JSON.stringify(x))),/typed_fields_response_invalid/);
  for(const mutate of [k=>k.fields.colour.accepted.push(' BLUE '),k=>k.fields.colour.accepted=[''],k=>k.fields.colour.normalization.spelling=true]){
   const bad=structuredClone(key);mutate(bad);assert.throws(()=>validateTypedKey(definition,bad));await assert.rejects(db.query('select private.validate_typed_key($1,$2)',[definition,bad].map(x=>JSON.stringify(x))),/typed_fields_contract_invalid/);
  }
 }finally{await db.close();}
});

test('fractional mastery uses the declared points threshold and full-answer minima; v2 baselines stay immutable',async()=>{
 const db=await database();try{
  await configure(db,0,'diagnostic');const baseline=await launch(db);await finish(db,baseline.session.id);
  const before=await dashboard(db);assert.equal(before.baseline.assessmentResult.schemaVersion,'haiedu-assessment-result-v2');
  await assert.rejects(db.query("update learning_sessions set metadata='{}' where id=$1",[baseline.session.id]),/(diagnostic_baseline_immutable|governed_session_identity_immutable)/);
  const p=await configureTyped(db,0,'mastery_check');p.minimumPercent=50;p.minimumCorrectBySkill=Object.fromEntries(p.scoredSkillIds.map(s=>[s,0]));
  await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(p)]);
  await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[p.learningModelConfigurationId,JSON.stringify(p)]);
  await makeReady(db,p.readinessSkillIds);const start=await launch(db,0,'mastery_check');let result;
  for(let n=0;n<10;n++){
   const served=await operation(db,start.session.id,'serve');if(served.complete)break;
   result=await operation(db,start.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response:response(),draftRevision:0});
  }
  assert.equal(result.finalResult.passed,true);assert.equal(result.finalResult.score.percent,50);assert.equal(result.finalResult.score.correct,0);assert.equal(result.finalResult.score.earned,.5);
  const history=(await dashboard(db)).history.find(s=>s.id===start.session.id);assert.equal(history.percent,50);assert.equal(history.assessmentResult.passed,true);
  const changed=structuredClone(p);changed.minimumCorrectBySkill[p.scoredSkillIds[0]]=1;
  const report=(await db.query('select private.assessment_result_v3($1,$2) r',[JSON.stringify(changed),JSON.stringify([{skillId:p.scoredSkillIds[0],correct:0,total:1,earned:.5}])])).rows[0].r;
  assert.equal(report.passed,false);
 }finally{await db.close();}
});

test('closed capability versions, existing policies, raw draft access and cross-context access fail safely',async()=>{
 assert.equal(readFileSync('web/typed-fields-contract.mjs','utf8'),readFileSync('supabase/functions/_shared/typed-fields.mjs','utf8'));
 const db=await database();try{
  const p=await configureTyped(db,2);const s=await launch(db,2);const item=await operation(db,s.session.id,'serve');
  const payload={sessionItemId:item.sessionItemId,itemId:item.item.id,response:response(),draftRevision:0};
  await assert.rejects(operation(db,s.session.id,'answer',{...payload,response:{...response(),score:1}}),/typed_fields_response_invalid/);
  const foreign=await launch(db,0);await assert.rejects(operation(db,foreign.session.id,'answer',payload));
  for(const mutate of [p=>p.schemaVersion='haiedu-assessment-policy-v2',p=>p.responseCapabilities.typed_fields='future',p=>p.itemWeight=2,p=>p.scoringStrategy='selected-response-v1']){
   const bad=structuredClone(p);mutate(bad);assert.throws(()=>readAssessmentPolicy({assessmentPolicy:bad},bad));
   await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(2,'diagnostic'),JSON.stringify(bad)]);
   await assert.rejects(db.query('select private.validate_assessment_policy_v1($1)',[blueprintId(2,'diagnostic')]),/assessment_policy_invalid/);
  }
  await operation(db,s.session.id,'draft',payload);
  await db.exec("set role authenticated");await assert.rejects(db.query('select * from learning_response_drafts'),/permission denied/);await db.exec('reset role');
  await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(373)]);
  await assert.rejects(operation(db,s.session.id,'draft',{...payload,draftRevision:1}));
  assert.equal((await db.query('select count(*) n from attempts')).rows[0].n,0);
 }finally{await db.close();}
});

test('governed typed response: private resumable drafts, conflict guard, partial score and deferred reporting',async()=>{
 const db=await database();try{
  const policy=await configureTyped(db);assert.deepEqual(readAssessmentPolicy({assessmentPolicy:policy},policy),policy);
  const start=await launch(db);let served=await operation(db,start.session.id,'serve');
  assert.deepEqual(served.item.responseDefinition,definition);assert.equal(JSON.stringify(served).includes('accepted'),false);
  const payload={sessionItemId:served.sessionItemId,itemId:served.item.id,response:response(),draftRevision:0};
  await assert.rejects(operation(db,start.session.id,'draft',payload,{student:id(11)}));
  const saved=await operation(db,start.session.id,'draft',payload);assert.equal(saved.draftRevision,1);
  await assert.rejects(operation(db,start.session.id,'draft',payload),/typed_fields_draft_conflict/);
  served=await operation(db,start.session.id,'serve');assert.deepEqual(served.responseDraft,response());assert.equal(served.draftRevision,1);
  assert.equal((await db.query('select count(*) n from attempts')).rows[0].n,0);
  let answer=await operation(db,start.session.id,'answer',{...payload,draftRevision:1});
  assert.equal(answer.revealCorrect,false);assert.equal(answer.grading,undefined);assert.equal(answer.session.correct_count,undefined);
  assert.equal((await db.query('select count(*) n from learning_response_drafts')).rows[0].n,0);
  await assert.rejects(operation(db,start.session.id,'answer',{...payload,draftRevision:1}),/session_item_already_answered/);
  const attempt=(await db.query('select * from attempts')).rows[0];assert.equal(Number(attempt.score),.5);assert.equal(attempt.correct,false);assert.deepEqual(attempt.response,response());assert.equal(attempt.normalized_response.components.length,2);
  for(let n=0;n<10;n++){
   served=await operation(db,start.session.id,'serve');if(served.complete)break;
   answer=await operation(db,start.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response:response(),draftRevision:0});
  }
  assert.equal(served.complete,true);const report=served.assessmentResult;
  assert.equal(report.schemaVersion,'haiedu-assessment-result-v3');assert.equal(report.overallScore.percent,50);assert.equal(report.overallScore.correct,0);assert.equal(report.overallScore.earned,report.overallScore.answered/2);
  assert.deepEqual((await dashboard(db)).baseline.assessmentResult,report);
  const rls=(await db.query("select relrowsecurity from pg_class where oid='learning_response_drafts'::regclass")).rows[0];assert.equal(rls.relrowsecurity,true);
 }finally{await db.close();}
});
