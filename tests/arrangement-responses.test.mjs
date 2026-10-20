import {assessmentRules} from '../web/assessment-reporting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateArrangementDefinition,validateArrangementKey,validateArrangementResponse} from '../supabase/functions/_shared/arrangement-responses.mjs';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
import {database,configureArrangement,configure,finish,makeReady,launch,operation,dashboard,id,blueprintId,matchingDefinition as md,matchingKey as mk,matchingResponse as mr,orderingDefinition as od,orderingKey as ok,orderingResponse as or} from './fixtures/arrangement-db.mjs';
const args=(...xs)=>xs.map(x=>typeof x==='string'?x:JSON.stringify(x));
const call=async(db,name,...xs)=>(await db.query(`select private.${name}(${xs.map((_,i)=>'$'+(i+1)).join(',')}) result`,args(...xs))).rows[0].result;

test('matching and ordering contracts agree in JS and SQL; unknown keys, repeated IDs and invalid cardinality fail closed',async()=>{
 assert.equal(readFileSync('web/arrangement-contract.mjs','utf8'),readFileSync('supabase/functions/_shared/arrangement-responses.mjs','utf8'));
 const db=await database();try{
  for(const [type,def,key,response] of [['matching',md,mk,mr()],['ordering',od,ok,or()]]){
   validateArrangementKey(type,def,key);validateArrangementResponse(type,def,response);
   await call(db,'validate_arrangement_key',type,def,key);await call(db,'validate_arrangement_response',type,def,response);
   for(const change of [d=>d.schemaVersion='future',d=>d.locale='',d=>d.extra=true,d=>d[type==='matching'?'sources':'segments'][1].id=d[type==='matching'?'sources':'segments'][0].id,d=>d[type==='matching'?'sources':'segments'][0].label='\t\r\n',d=>d[type==='matching'?'sources':'segments'][0].answer='secret']){
    const bad=structuredClone(def);change(bad);assert.throws(()=>validateArrangementDefinition(type,bad),/arrangement_contract_invalid/);await assert.rejects(call(db,'validate_arrangement_definition',type,bad),/arrangement_contract_invalid/);
   }
   for(const bad of [{...response,schemaVersion:'future'},{...response,score:1},type==='matching'?mr('warm','warm'):or(['a','a','c']),type==='matching'?mr('forged','cool'):or(['a','b','forged']),type==='matching'?{schemaVersion:md.schemaVersion,pairs:{red:'warm'}}:or(['a','b'])]){
    assert.throws(()=>validateArrangementResponse(type,def,bad),/arrangement_response_invalid/);await assert.rejects(call(db,'validate_arrangement_response',type,def,bad),/arrangement_response_invalid/);
   }
  }
  const categories={...md,cardinality:'many_to_one'},key={...mk,pairs:{red:'warm',blue:'warm'}};
  validateArrangementKey('matching',categories,key);await call(db,'validate_arrangement_key','matching',categories,key);
  assert.equal((await call(db,'grade_arrangement_response','matching',categories,key,mr('warm','warm'))).score,1);
  const badKey=structuredClone(ok);badKey.acceptedSequences.push(['a','b','c']);assert.throws(()=>validateArrangementKey('ordering',od,badKey));await assert.rejects(call(db,'validate_arrangement_key','ordering',od,badKey),/arrangement_contract_invalid/);
 }finally{await db.close();}
});

test('pair credit is normalized to one item; ordering accepts only a reviewed complete sequence',async()=>{
 const db=await database();try{
  for(const [response,score] of [[mr('warm','cool'),1],[mr(),.5],[mr('',''),0],[mr('cool','warm'),0]]){
   const grade=await call(db,'grade_arrangement_response','matching',md,mk,response);assert.equal(grade.score,score);assert.equal(grade.correct,score===1);assert.equal(grade.requiredComponents,2);assert.equal(grade.correctComponents,score*2);assert.equal(grade.normalizedResponse.components.length,2);
  }
  const key={...ok,acceptedSequences:[['a','b','c'],['c','b','a']]};
  for(const [sequence,score] of [[['a','b','c'],1],[['c','b','a'],1],[['a','c','b'],0],[['a','','c'],0],[['','',''],0]]){
   const grade=await call(db,'grade_arrangement_response','ordering',od,key,or(sequence));assert.equal(grade.score,score);assert.equal(grade.requiredComponents,1);assert.equal(grade.correct,score===1);
  }
  const orders=new Set();for(let n=0;n<12;n++){const presented=await call(db,'present_arrangement_definition','ordering',od,String(n));orders.add(JSON.stringify(presented.segments));assert.deepEqual(presented,await call(db,'present_arrangement_definition','ordering',od,String(n)));assert.equal(JSON.stringify(presented).includes('accepted'),false);}
  assert.ok(orders.size>1,'key-independent presentation varies across session items');
 }finally{await db.close();}
});

test('both capabilities resume privately, reject stale drafts, preserve presentation and report one item per answer across contexts',async()=>{
 const db=await database();try{
  for(const [idx,type,response] of [[0,'matching',mr()],[2,'ordering',or(['a','b','c'])]]){
   const policy=await configureArrangement(db,idx,'diagnostic',type);assert.deepEqual(readAssessmentPolicy({assessmentPolicy:policy},policy),policy);
   const start=await launch(db,idx);let served=await operation(db,start.session.id,'serve');const presented=served.item.responseDefinition;
   assert.equal(served.item.responsePresentationVersion,'haiedu-stable-arrangement-v1');assert.equal(JSON.stringify(served).includes('acceptedSequences'),false);assert.equal(JSON.stringify(served).includes('"pairs"'),false);
   const payload={sessionItemId:served.sessionItemId,itemId:served.item.id,response,draftRevision:0};
   await assert.rejects(operation(db,start.session.id,'draft',payload,{student:id(11)}));
   assert.equal((await operation(db,start.session.id,'draft',payload)).draftRevision,1);
   await assert.rejects(operation(db,start.session.id,'draft',payload),/response_draft_conflict/);
   served=await operation(db,start.session.id,'serve');assert.deepEqual(served.responseDraft,response);assert.deepEqual(served.item.responseDefinition,presented);
   const result=await operation(db,start.session.id,'answer',{...payload,draftRevision:1});assert.equal(result.revealCorrect,false);assert.equal(result.grading,undefined);
   await assert.rejects(operation(db,start.session.id,'answer',{...payload,draftRevision:1}),/session_item_already_answered/);
   const attempt=(await db.query('select score,normalized_response from attempts where item_id=$1',[served.item.id])).rows[0];assert.equal(Number(attempt.score),type==='matching'?.5:1);assert.equal(attempt.normalized_response.presentationVersion,'haiedu-stable-arrangement-v1');assert.deepEqual(attempt.normalized_response.presentedIds,presented[type==='matching'?'targets':'segments'].map(x=>x.id));
   while(true){served=await operation(db,start.session.id,'serve');if(served.complete)break;await operation(db,start.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response,draftRevision:0});}
   const report=served.assessmentResult;assert.equal(report.schemaVersion,'haiedu-assessment-result-v3');assert.equal(report.overallScore.percent,type==='matching'?50:100);assert.equal(report.overallScore.earned,report.overallScore.answered*(type==='matching'?.5:1));
  }
  assert.equal((await db.query('select count(*) n from learning_response_drafts')).rows[0].n,0);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from learning_response_drafts'),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});

test('capability activation is explicit; v1/v2 and wrong keys cannot launch new formats',async()=>{
 const db=await database();try{
  const policy=await configureArrangement(db);const blueprint=blueprintId(0,'diagnostic');
  for(const change of [p=>p.schemaVersion='haiedu-assessment-policy-v2',p=>p.responseCapabilities.matching='future',p=>p.responseCapabilities.ordering='haiedu-ordering-v1',p=>delete p.responseCapabilities.matching]){
   const bad=structuredClone(policy);change(bad);assert.throws(()=>readAssessmentPolicy({assessmentPolicy:bad},bad));await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprint,JSON.stringify(bad)]);await assert.rejects(call(db,'validate_assessment_policy_v1',blueprint),/assessment_policy_invalid/);
  }
  await configureArrangement(db);await db.query("update item_answer_keys set answer=$1 where item_id in(select item_id from assessment_blueprint_items where assessment_blueprint_id=$2)",[JSON.stringify(ok),blueprint]);await assert.rejects(launch(db),/arrangement_contract_invalid/);
 }finally{await db.close();}
});

test('matching mastery applies the governed points threshold and complete-item minima without changing an existing baseline',async()=>{
 const db=await database();try{
  await configure(db,0,'diagnostic');const baseline=await launch(db);await finish(db,baseline.session.id);const original=(await dashboard(db)).baseline;
  const policy=await configureArrangement(db,0,'mastery_check');assert.match(assessmentRules(policy),/ճիշտ լրացված մասերի բաժնի/);assert.match(assessmentRules({...policy,responseTypes:['ordering']}),/միայն ամբողջությամբ ճիշտ հերթականության/);assert.doesNotMatch(assessmentRules({...policy,responseTypes:['ordering']}),/ճիշտ լրացված մասերի բաժնի/);policy.minimumPercent=50;policy.minimumCorrectBySkill=Object.fromEntries(policy.scoredSkillIds.map(x=>[x,0]));
  await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(policy)]);
  await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[policy.learningModelConfigurationId,JSON.stringify(policy)]);
  await makeReady(db,policy.readinessSkillIds);const session=await launch(db,0,'mastery_check');let result;
  for(let n=0;n<10;n++){const served=await operation(db,session.session.id,'serve');if(served.complete)break;result=await operation(db,session.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response:mr(),draftRevision:0});}
  assert.equal(result.finalResult.passed,true);assert.equal(result.finalResult.score.percent,50);assert.equal(result.finalResult.score.correct,0);assert.deepEqual((await dashboard(db)).baseline,original);
  policy.minimumCorrectBySkill[policy.scoredSkillIds[0]]=1;
  assert.equal((await call(db,'assessment_result_v3',policy,[{skillId:policy.scoredSkillIds[0],correct:0,total:1,earned:.5}])).passed,false);
 }finally{await db.close();}
});
