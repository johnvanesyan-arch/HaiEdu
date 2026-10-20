import test from 'node:test';
import assert from 'node:assert/strict';
import {database,audioPractice,audioOperation,seedAudio,operation,id,blueprintId} from './fixtures/learning-audio-db.mjs';

test('protected audio binds immutable reviewed media, denies raw access and assessment adoption',async()=>{
 const db=await database();try{
  const audio=await seedAudio(db);
  await db.query('update items set stimulus=$2 where id=$1',[id(701),JSON.stringify(audio.stimulus)]);
  await assert.rejects(db.query('select private.validate_assessment_policy_v1($1)',[blueprintId(0)]),/audio_mode_unavailable/);
  for(const patch of [{...audio.stimulus,url:'https://invalid.example/track.mp3'},{...audio.stimulus,transcript:'answer'}, {...audio.stimulus,schemaVersion:'future'}])await assert.rejects(db.query('update items set stimulus=$2 where id=$1',[id(701),JSON.stringify(patch)]),/audio_reference_invalid/);
  await assert.rejects(db.query('update items set stimulus=$2 where id=$1',[id(801),JSON.stringify(audio.stimulus)]),/audio_scope_invalid/);
  await assert.rejects(db.query("update learning_audio_versions set title='changed' where id=$1",[audio.audioId]),/audio_version_immutable/);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const table of ['learning_audio_versions','learning_audio_deliveries'])await assert.rejects(db.query('select * from '+table),/permission denied/);
   await assert.rejects(audioOperation(db,null,null,'catalog',{itemId:id(701)}),/permission denied/);await db.exec('reset role');
  }
  await db.query("update learning_audio_versions set revoked_at=now(),revocation_reason='Synthetic revocation' where id=$1",[audio.audioId]);
  await assert.rejects(db.query('select private.validate_audio_reference($1,$2)',[JSON.stringify(audio.stimulus),id(701)]),/audio_unavailable/);
  await assert.rejects(db.query('update learning_audio_versions set revoked_at=null,revocation_reason=null where id=$1',[audio.audioId]),/audio_version_immutable/);
 }finally{await db.close();}
});

test('audio failure cannot create an answer; completion, resume and exact source evidence survive retry',async()=>{
 const db=await database();try{
  const f=await audioPractice(db),served=f.served,answer={sessionItemId:served.sessionItemId,itemId:served.item.id,response:{value:'A'}};
  assert.equal(served.item.stimulus.audioVersionId,f.audioId);assert.equal(served.item.stimulus.transcriptAvailable,false);
  assert.doesNotMatch(JSON.stringify(served),/bucketId|objectPath|permission_reference|sha256/);
  const before=(await db.query('select count(*) n from attempts')).rows[0].n;
  await assert.rejects(operation(db,f.session,'answer',answer),/audio_playback_incomplete/);
  await assert.rejects(db.query("insert into attempts(student_id,item_id,skill_id,response,normalized_response,score,correct) values($1,$2,$3,'{}','{}',1,true)",[id(10),served.item.id,served.skill.id]),/audio_playback_incomplete/);
  const media=await audioOperation(db,f.session,served.sessionItemId,'load');assert.equal(media.sha256,f.sha);
  await assert.rejects(audioOperation(db,f.session,served.sessionItemId,'completed'),/audio_playback_incomplete/);
  await audioOperation(db,f.session,served.sessionItemId,'fetched');await audioOperation(db,f.session,served.sessionItemId,'started');
  await audioOperation(db,f.session,served.sessionItemId,'failed');
  await assert.rejects(operation(db,f.session,'answer',answer),/audio_playback_incomplete/);
  assert.equal((await db.query('select count(*) n from attempts')).rows[0].n,before);
  await audioOperation(db,f.session,served.sessionItemId,'fetched');await audioOperation(db,f.session,served.sessionItemId,'started');
  // Advance only the synthetic clock evidence; browser coverage plays real WAV.
  await db.query("update learning_audio_deliveries set started_at=now()-interval '1 second' where session_item_id=$1",[served.sessionItemId]);
  await audioOperation(db,f.session,served.sessionItemId,'completed');await audioOperation(db,f.session,served.sessionItemId,'completed');
  assert.equal((await operation(db,f.session,'serve')).item.stimulus.completed,true);
  await operation(db,f.session,'answer',answer);
  await assert.rejects(operation(db,f.session,'answer',answer),/session_item_already_answered/);
  const evidence=(await db.query('select normalized_response from attempts where learning_session_item_id=$1',[served.sessionItemId])).rows[0].normalized_response.audioEvidence;
  assert.equal(evidence.audioVersionId,f.audioId);assert.equal(evidence.sourceFamilyId,id(9500));assert.equal(evidence.transcriptUsed,false);
  assert.equal((await db.query('select count(*) n from attempts')).rows[0].n,Number(before)+1);
 }finally{await db.close();}
});

test('audio requests preserve current learner, school, subject, item, account and release boundaries',async()=>{
 const db=await database();try{
  const f=await audioPractice(db),li=f.served.sessionItemId;
  await assert.rejects(audioOperation(db,f.session,li,'load',{student:id(11),auth:id(402)}));
  await assert.rejects(audioOperation(db,f.session,li,'load',{auth:id(402)}));
  await assert.rejects(audioOperation(db,f.session,li,'load',{itemId:f.served.item.id}),/audio_request_invalid/);
  await assert.rejects(audioOperation(db,null,null,'preview',{itemId:f.served.item.id}),/audio_access_denied/);
  await assert.rejects(audioOperation(db,null,null,'catalog',{itemId:f.served.item.id}),/audio_access_denied/);
  await db.query("update assessment_pool_items set enabled=false where item_id=$1",[f.served.item.id]);
  await assert.rejects(audioOperation(db,f.session,li,'load'),/audio_access_denied/);
  await db.query("update assessment_pool_items set enabled=true where item_id=$1",[f.served.item.id]);
  await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
  await assert.rejects(audioOperation(db,f.session,li,'load'));
  assert.equal((await db.query('select count(*) n from learning_audio_deliveries')).rows[0].n,0);
 }finally{await db.close();}
});
