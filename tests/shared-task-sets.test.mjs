import test from 'node:test';
import assert from 'node:assert/strict';
import {database,seedTaskSet,seedAudio,audioOperation,launch,operation,finish,id,scopes,blueprintId} from './fixtures/shared-task-sets-db.mjs';
import {ready,formIds,formItems} from './fixtures/governed-mastery-forms-db.mjs';

test('shared reading source stays ordered, private and version-bound, with each member scored on its own skill',async()=>{
 const db=await database();try{
  const set=await seedTaskSet(db,{items:[id(703),id(701),id(702)]});
  const start=await launch(db),session=start.session.id;
  const rows=(await db.query('select item_id,skill_id,source_family_id_snapshot,task_set_member_ordinal from learning_session_items where session_id=$1 order by ordinal',[session])).rows;
  assert.deepEqual(rows.map(x=>x.item_id),set.items);assert.deepEqual(rows.map(x=>x.skill_id),set.members.map(x=>x.skillId));
  assert.deepEqual(rows.map(x=>x.task_set_member_ordinal),[1,2,3]);assert.ok(rows.every(x=>x.source_family_id_snapshot===set.family));
  const first=await operation(db,session,'serve');assert.equal(first.item.stimulus.content,set.stimulus.content);assert.equal(first.item.taskSet.position,1);assert.equal(first.item.taskSet.total,3);
  assert.doesNotMatch(JSON.stringify(first),/permission_reference|review_reference|members|answerKey/);
  assert.equal((await operation(db,session,'serve')).sessionItemId,first.sessionItemId);
  assert.equal(Number((await db.query('select count(*) n from learning_source_family_exposures')).rows[0].n),1);
  await seedTaskSet(db,{setId:id(9802),family:id(9902),items:set.items});
  await assert.rejects(operation(db,session,'serve'),/shared_source_assignment_changed/);
  await db.query('update items set stimulus=$2 where id=any($1)',[set.items,JSON.stringify(set.reference)]);
  await finish(db,session);
  const answers=(await db.query('select normalized_response,score from attempts where learning_session_id=$1',[session])).rows;
  assert.equal(answers.length,3);assert.ok(answers.every(x=>x.normalized_response.taskSetEvidence.sourceFamilyId===set.family));assert.ok(answers.every(x=>Number(x.score)===1));
  assert.equal(Number((await db.query('select count(*) n from learning_source_family_exposures')).rows[0].n),3);
  await assert.rejects(db.query("update learning_task_set_versions set title='changed' where id=$1",[set.setId]),/task_set_version_immutable/);
  await assert.rejects(db.query('update learning_session_items set source_family_id_snapshot=null where session_id=$1',[session]),/source_assignment_immutable/);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);for(const table of ['learning_task_set_versions','learning_source_family_exposures'])await assert.rejects(db.query('select * from '+table),/permission denied/);await db.exec('reset role');}
 }finally{await db.close();}
});

test('Practice delivers a whole cross-skill set and audio keeps completion and assessment restrictions',async()=>{
 const db=await database();try{
  const baseline=await launch(db);await finish(db,baseline.session.id);
  const audio=await seedAudio(db),set=await seedTaskSet(db,{mode:'practice',family:id(9500),stimulus:audio.stimulus,items:[id(713),id(711),id(712)]});
  const start=await launch(db,0,'practice',{skill:id(scopes[0].skills[0])}),served=await operation(db,start.session.id,'serve');
  assert.equal(served.item.id,set.items[0]);assert.equal(served.item.stimulus.kind,'audio');assert.equal(served.item.taskSet.position,1);
  assert.equal((await db.query('select count(*) n from learning_session_items where session_id=$1',[start.session.id])).rows[0].n,3);
  await assert.rejects(operation(db,start.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response:{value:'A'}}),/audio_playback_incomplete/);
  await audioOperation(db,start.session.id,served.sessionItemId,'load');await audioOperation(db,start.session.id,served.sessionItemId,'fetched');await audioOperation(db,start.session.id,served.sessionItemId,'started');
  await db.query("update learning_audio_deliveries set started_at=now()-interval '1 second'");await audioOperation(db,start.session.id,served.sessionItemId,'completed');
  await operation(db,start.session.id,'answer',{sessionItemId:served.sessionItemId,itemId:served.item.id,response:{value:'A'}});
  const next=await operation(db,start.session.id,'serve');assert.equal(next.item.id,set.items[1]);assert.equal(next.item.taskSet.position,2);assert.equal(next.item.stimulus.completed,false);
  const evidence=(await db.query('select normalized_response from attempts where learning_session_item_id=$1',[served.sessionItemId])).rows[0].normalized_response;
  assert.equal(evidence.taskSetEvidence.taskSetVersionId,set.setId);assert.equal(evidence.audioEvidence.sourceFamilyId,set.family);
  const other=await seedTaskSet(db,{setId:id(9801),family:set.family,stimulus:audio.stimulus});
  await assert.rejects(db.query('select private.validate_assessment_policy_v1($1)',[blueprintId(0)]),/audio_mode_unavailable/);
  await assert.rejects(db.query("insert into attempts(student_id,item_id,skill_id,response,normalized_response,score,correct) values($1,$2,$3,'{}','{}',1,true)",[id(10),other.items[0],other.members[0].skillId]),/audio_playback_incomplete/);
 }finally{await db.close();}
});

test('source exposure crosses modality, question IDs and curriculum releases; partial sets and stale members fail closed',async()=>{
 const db=await database();try{
  const set=await seedTaskSet(db);const start=await launch(db);await operation(db,start.session.id,'serve');
  await seedTaskSet(db,{idx:2,setId:id(9801),family:set.family});
  const before=Number((await db.query('select count(*) n from learning_sessions')).rows[0].n);
  await assert.rejects(launch(db,2),/source_family_forms_exhausted/);assert.equal(Number((await db.query('select count(*) n from learning_sessions')).rows[0].n),before);
  await assert.rejects(db.query('select private.order_task_set_items($1,$2)',[[set.items[0]],'fixture']),/task_set_partial_selection/);
  await assert.rejects(db.query('update items set version_no=2 where id=$1',[set.items[0]]),/task_set_member_scope_invalid/);
  await assert.rejects(db.query('update items set stimulus=$2 where id=$1',[id(811),JSON.stringify(set.reference)]),/task_set_member_scope_invalid/);
  await db.query("update learning_task_set_versions set revoked_at=now(),revocation_reason='Synthetic withdrawal' where id=$1",[set.setId]);
  await assert.rejects(operation(db,start.session.id,'serve'),/task_set_unavailable/);
 }finally{await db.close();}
});

test('whole Mastery forms skip a source family already practiced under different question IDs',async()=>{
 const db=await database();try{
  const baseline=await launch(db);await finish(db,baseline.session.id);
  const audio=await seedAudio(db),practice=await seedTaskSet(db,{mode:'practice',stimulus:audio.stimulus,family:id(9500)}),start=await launch(db,0,'practice',{skill:id(521)});
  for(let n=0;n<3;n++){
   const item=await operation(db,start.session.id,'serve');
   for(const action of ['load','fetched','started'])await audioOperation(db,start.session.id,item.sessionItemId,action);
   await db.query("update learning_audio_deliveries set started_at=now()-interval '1 second' where session_item_id=$1",[item.sessionItemId]);
   await audioOperation(db,start.session.id,item.sessionItemId,'completed');
   await operation(db,start.session.id,'answer',{sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?true:'A'}});
  }
  for(let n=0;n<3;n++)await seedTaskSet(db,{mode:'mastery_check',setId:id(9810+n),family:n===0?practice.family:id(9910+n),items:formItems[n]});
  await ready(db);const mastery=await launch(db,0,'mastery_check');
  const session=(await db.query('select metadata from learning_sessions where id=$1',[mastery.session.id])).rows[0];assert.equal(session.metadata.assessmentFormId,formIds[1]);
  const served=await operation(db,mastery.session.id,'serve');assert.equal(served.item.taskSet.id,id(9811));
  await assert.rejects(operation(db,mastery.session.id,'serve',{}, {student:id(11),auth:id(402)}));
  await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
  await assert.rejects(operation(db,mastery.session.id,'serve'));
 }finally{await db.close();}
});

test('whole-set packing never drops members and existing standalone sessions retain their behavior',async()=>{
 const db=await database();try{
  const baseline=await launch(db);await finish(db,baseline.session.id);
  const practice=await launch(db,0,'practice',{skill:id(521)});await finish(db,practice.session.id);await ready(db);
  const mastery=await launch(db,0,'mastery_check');await finish(db,mastery.session.id,false);
  const set=await seedTaskSet(db,{mode:'chapter_review',items:[id(733),id(731),id(732)]});
  const review=await launch(db,0,'chapter_review');assert.equal((await operation(db,review.session.id,'serve')).item.id,set.items[0]);await finish(db,review.session.id);
  await assert.rejects(db.query('select private.pack_task_set_items($1,2)',[set.items]),/task_set_capacity_unavailable/);
  assert.deepEqual((await db.query('select private.pack_task_set_items($1,3) ids',[set.items])).rows[0].ids,set.items);
  const smaller=await seedTaskSet(db,{mode:'practice',setId:id(9804),family:id(9904),items:[id(711),id(712)]});
  const other=await seedTaskSet(db,{setId:id(9805),family:id(9905),items:[id(701),id(702)]});
  assert.deepEqual((await db.query('select private.pack_task_set_items($1,4) ids',[[...set.items,...smaller.items,...other.items]])).rows[0].ids,[...smaller.items,...other.items]);
 }finally{await db.close();}
});
