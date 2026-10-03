import test from 'node:test';
import assert from 'node:assert/strict';
import {database,ids,payload,revise,snapshot} from './fixtures/phase3-db-harness.mjs';

test('P3-13: retired question revision is rejected without changing content or history',async()=>{
 const db=await database();try{await db.query('update items set retired_at=now(),status=\'archived\' where id=$1',[ids.item]);const original=await snapshot(db);await assert.rejects(()=>revise(db),/retired_item_not_editable/);assert.deepEqual(await snapshot(db),original);}finally{await db.close();}
});

test('M01: unrelated revision preserves attached draft mapping and both snapshots',async()=>{
 const db=await database();try {
 const other=await db.query('select to_jsonb(i) state from items i where id<>$1 order by id',[ids.item]);
 const result=await revise(db);assert.equal(result.rows[0].result.versionNo,5);
 const mappings=await db.query('select mc.code,m.response_key,m.mapping_note from item_misconception_mappings m join misconceptions mc on mc.id=m.misconception_id where m.item_id=$1',[ids.item]);
 assert.deepEqual(mappings.rows,[{code:'QA_ATTACHED_DRAFT',response_key:'B',mapping_note:'Approved isolated fixture'}]);
 const history=await db.query('select version_no,snapshot from item_versions where item_id=$1 order by version_no',[ids.item]);
 assert.deepEqual(history.rows.map(r=>r.version_no),[4,5]);
 assert.equal(history.rows[0].snapshot.misconceptions[0].code,'QA_ATTACHED_DRAFT');
 assert.equal(history.rows[1].snapshot.misconceptions[0].code,'QA_ATTACHED_DRAFT');
 assert.deepEqual((await db.query('select to_jsonb(i) state from items i where id<>$1 order by id',[ids.item])).rows,other.rows);
 }finally{await db.close();}
});

test('M01: legacy blank mapping recovers its unique existing draft code',async()=>{
 const db=await database();try{await revise(db,payload({misconceptions:[{code:'',responseKey:'B',mappingNote:'legacy fixture'}]}));assert.equal((await db.query('select count(*)::int n from item_misconception_mappings where item_id=$1',[ids.item])).rows[0].n,1);}finally{await db.close();}
});

test('M03: invalid and unauthorized revisions are atomic; new draft and cross-subject mappings remain denied',async()=>{
 const db=await database();try{
 const original=await snapshot(db);
 for(const [patch,message] of [[{promptHy:''},'empty_prompt'],[{options:[{key:'A',contentHy:'A'},{key:'A',contentHy:'B'}]},'duplicate_option_key'],[{answerKey:{answer:'Z'}},'answer_not_in_options'],[{misconceptions:[{code:'QA_NEW_DRAFT',responseKey:'B'}]},'invalid_misconception_code'],[{misconceptions:[{code:'QA_OTHER_SUBJECT',responseKey:'B'}]},'invalid_misconception_code']]){
  await assert.rejects(()=>revise(db,payload(patch)),new RegExp(message));assert.deepEqual(await snapshot(db),original);
 }
 await assert.rejects(()=>revise(db,payload(),ids.wrongRole),/content_admin_required/);assert.deepEqual(await snapshot(db),original);
 await db.exec('set role authenticated');await assert.rejects(()=>revise(db),/permission denied/);await db.exec('reset role');
 assert.deepEqual(await snapshot(db),original);
 }finally{await db.close();}
});

test('M02: revision holds release, preserves SME state, and requires current-version QA',async()=>{
 const db=await database();try{
 await revise(db,payload({misconceptions:[],confirmEmptyMisconceptions:true}));
 const item=(await db.query('select status,review_status,validation_state,config,version_no,last_reviewed_at from items where id=$1',[ids.item])).rows[0];
 assert.equal(item.status,'review');assert.equal(item.review_status,'needs_review');assert.equal(item.validation_state,'sme_reviewed');assert.equal(item.config.pilot_ready,false);assert.equal(item.config.learnerVisible,false);assert.equal(item.version_no,5);assert.equal(item.last_reviewed_at,null);
 const denied=(await db.query('select approve_item_if_family_qa_current($1,$2,$3,$4) result',[ids.item,ids.actor,'content','QA fixture'])).rows[0].result;
 assert.equal(denied.approved,false);assert.equal(denied.error,'technical_qa_must_pass_before_approval');
 assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,0);
 }finally{await db.close();}
});

test('M06: stale family QA is denied and fresh evidence permits atomic approval without opening release',async()=>{
 const db=await database();try{
 await db.query('update item_templates set generation_config=$1::jsonb where id=$2',[JSON.stringify({authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidenceBlueprintPolicy:'QA-fixture',requiredEvidencePurposes:['qaA','qaB'],enforceUniqueEvidencePurposes:true}),ids.template]);
 await db.query('update items set config=config||$1::jsonb where id=$2',[JSON.stringify({evidencePurpose:'qaA'}),ids.item]);
 const approve=async()=>(await db.query('select approve_item_if_family_qa_current($1,$2,$3,$4) result',[ids.item,ids.actor,'content','QA fixture'])).rows[0].result;
 const stale=await approve();assert.equal(stale.approved,false);assert.equal(stale.requiresQaRerun,true);
 assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,0);
 const family=await db.query(`select string_agg(id::text||':'||version_no::text||':'||coalesce(config->>'evidencePurpose',''),',' order by id::text collate "C") f from items where item_template_id=$1 and retired_at is null`,[ids.template]);
 const fingerprint=['haiedu-family-state-v1',ids.template,1,'haiedu-evidence-blueprint-v1','QA-fixture','qaA,qaB',1,family.rows[0].f].join('|');
 await db.query('insert into item_qa_runs(item_id,version_no,passed,details,created_at) values($1,4,true,$2::jsonb,now()+interval \'1 second\')',[ids.item,JSON.stringify({evidenceBlueprintVerification:{familyStateFingerprint:fingerprint}})]);
 const fresh=await approve();assert.equal(fresh.approved,true);
 assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,1);
 const item=(await db.query('select validation_state,config from items where id=$1',[ids.item])).rows[0];assert.equal(item.validation_state,'sme_reviewed');assert.equal(item.config.pilot_ready,false);assert.equal(item.config.learnerVisible,false);
 await db.query('update items set version_no=version_no+1 where id=$1',['30000000-0000-4000-8000-000000000002']);
 const changed=await approve();assert.equal(changed.approved,false);assert.equal(changed.requiresQaRerun,true);assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,1);
 }finally{await db.close();}
});

test('M01: omitted mappings preserve metadata and clearing all requires confirmation',async()=>{
 const db=await database();try{
 const original=await snapshot(db);
 await assert.rejects(()=>revise(db,payload({misconceptions:[]})),/explicit_empty_misconception_confirmation_required/);
 assert.deepEqual(await snapshot(db),original);
 const p=payload();delete p.misconceptions;await revise(db,p);
 assert.equal((await db.query('select count(*)::int n from item_misconception_mappings where item_id=$1',[ids.item])).rows[0].n,1);
 await revise(db,payload({misconceptions:[],confirmEmptyMisconceptions:true}));
 assert.equal((await db.query('select count(*)::int n from item_misconception_mappings where item_id=$1',[ids.item])).rows[0].n,0);
 }finally{await db.close();}
});
