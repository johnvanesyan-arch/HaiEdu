import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,assessedFixture,assessedOperation,operation,launch,id,scopes,configureAssessed,blueprintId} from './fixtures/assessed-audio-db.mjs';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
const payload=(playId=randomUUID(),clientId=randomUUID(),positionMs=0)=>({playId,clientId,positionMs});
async function play(db,f){
 await assessedOperation(db,f,'load');await assessedOperation(db,f,'fetched');const p=payload();await assessedOperation(db,f,'begin',p);
 await db.query("update learning_assessed_audio set playback_anchor_at=clock_timestamp()-interval '1 second',last_event_at=clock_timestamp()-interval '1 second' where session_id=$1",[f.session]);
 return {p:{...p,positionMs:300},state:await assessedOperation(db,f,'complete',{...p,positionMs:300})};
}
test('two plays belong to the shared recording, survive questions/resume and retain deferred per-question scoring',async()=>{
 const db=await database();try{
  const f=await assessedFixture(db),stimulus=f.served.item.stimulus;
  assert.equal(stimulus.questions.length,3);assert.equal(stimulus.playback.maximumPlays,2);
  assert.doesNotMatch(JSON.stringify(stimulus),/answerKey|objectPath|transcript":|sha256|is_correct/);
  assert.equal(Number((await db.query('select count(*) n from student_item_exposure_events where session_id=$1',[f.session])).rows[0].n),3);
  await assert.rejects(operation(db,f.session,'answer',{sessionItemId:f.served.sessionItemId,itemId:f.served.item.id,response:{value:'A'}}),/audio_playback_incomplete/);
  const first=await play(db,f);assert.equal(first.state.completedPlays,1);
  assert.equal((await assessedOperation(db,f,'complete',first.p)).completedPlays,1);
  assert.equal((await assessedOperation(db,f,'begin',{...first.p,positionMs:0})).completedPlays,1);
  const answer=await operation(db,f.session,'answer',{sessionItemId:f.served.sessionItemId,itemId:f.served.item.id,response:{value:'A'}});assert.equal(answer.revealCorrect,false);
  const next=await operation(db,f.session,'serve');f.served=next;
  assert.equal(next.item.stimulus.playback.completedPlays,1);assert.equal(next.item.stimulus.playback.completed,true);
  assert.equal((await launch(db)).session.id,f.session);
  assert.equal((await play(db,f)).state.completedPlays,2);
  await assert.rejects(assessedOperation(db,f,'load'),/audio_play_limit_reached/);
  await assert.rejects(assessedOperation(db,f,'begin',payload()),/audio_play_limit_reached/);
  const evidence=(await db.query('select normalized_response from attempts where learning_session_id=$1',[f.session])).rows[0].normalized_response.audioEvidence;
  assert.equal(evidence.schemaVersion,'haiedu-audio-evidence-v2');assert.equal(evidence.completedPlays,1);assert.equal(evidence.playbackPolicy.maximumPlays,2);
 }finally{await db.close();}
});
test('failed transfer costs no play; progress, leases and repeated completions cannot reset or exceed allowance',async()=>{
 const db=await database();try{
  const f=await assessedFixture(db),p=payload();await assessedOperation(db,f,'load');await assessedOperation(db,f,'unavailable');
  assert.equal((await assessedOperation(db,f,'state')).completedPlays,0);
  await assert.rejects(assessedOperation(db,f,'begin',p),/audio_not_loaded/);
  await assessedOperation(db,f,'fetched');await assessedOperation(db,f,'begin',p);
  await assert.rejects(assessedOperation(db,f,'begin',{...p,clientId:randomUUID()}),/audio_playback_busy/);
  await assessedOperation(db,f,'pause',{...p,positionMs:100});
  await assert.rejects(assessedOperation(db,f,'begin',p),/audio_playback_conflict/);
  const resumed={...p,clientId:randomUUID(),positionMs:100};await assessedOperation(db,f,'begin',resumed);
  await assert.rejects(assessedOperation(db,f,'progress',{...resumed,positionMs:0}),/audio_progress_invalid/);
  await assert.rejects(assessedOperation(db,f,'complete',{...p,positionMs:300}),/audio_playback_conflict/);
  await db.query("update learning_assessed_audio set playback_anchor_at=clock_timestamp()-interval '1 second',last_event_at=clock_timestamp()-interval '1 second'");
  const results=await Promise.all([assessedOperation(db,f,'complete',{...resumed,positionMs:300}),assessedOperation(db,f,'complete',{...resumed,positionMs:300})]);
  assert.ok(results.every(x=>x.completedPlays===1));
  await assessedOperation(db,f,'failed');assert.equal((await assessedOperation(db,f,'state')).completedPlays,1);
  assert.equal(Number((await db.query('select count(*) n from attempts where learning_session_id=$1',[f.session])).rows[0].n),0);
 }finally{await db.close();}
});
test('technical cancellation retains exposure/history and does not charge a Mastery attempt or reuse an exposed form',async()=>{
 const db=await database();try{
  const f=await assessedFixture(db,{mode:'mastery_check'});
  await assert.rejects(assessedOperation(db,f,'cancel'),/audio_interruption_required/);
  await assessedOperation(db,f,'failed');
  const result=await assessedOperation(db,f,'cancel');assert.equal(result.endedUnscored,true);
  assert.equal((await assessedOperation(db,f,'cancel')).endedUnscored,true);
  const before=(await db.query('select status,attempt_number from mastery_check_attempts where learning_session_id=$1',[f.session])).rows[0];assert.equal(before.status,'abandoned');
  assert.equal(Number((await db.query('select attempts_used from chapter_mastery_states')).rows[0].attempts_used),0);
  const replacement=await launch(db,0,'mastery_check');assert.notEqual(replacement.session.id,f.session);
  const after=(await db.query('select attempt_number from mastery_check_attempts where learning_session_id=$1',[replacement.session.id])).rows[0];assert.equal(after.attempt_number,before.attempt_number);
  const selected=(await db.query('select item_id from learning_session_items where session_id=$1',[replacement.session.id])).rows.map(x=>x.item_id);assert.ok(selected.every(x=>!f.set.items.includes(x)));
  assert.equal(Number((await db.query('select count(*) n from learning_source_family_exposures where source_family_id=$1',[f.set.family])).rows[0].n),3);
 }finally{await db.close();}
});
test('source withdrawal still permits an unscored exit without undoing revocation',async()=>{
 const db=await database();try{const f=await assessedFixture(db);await db.query("update learning_audio_versions set revoked_at=now(),revocation_reason='Synthetic withdrawal' where id=$1",[f.audioId]);await assert.rejects(assessedOperation(db,f,'load'),/audio_unavailable/);await assessedOperation(db,f,'failed');assert.equal((await assessedOperation(db,f,'cancel')).endedUnscored,true);}finally{await db.close();}
});

test('variable request delay cannot reject normal playback; resume grants no paused-time or forward-seek credit',async()=>{
 const db=await database();try{
  const f=await assessedFixture(db,{durationMs:10000}),p=payload();
  await assessedOperation(db,f,'load');await assessedOperation(db,f,'fetched');await assessedOperation(db,f,'begin',p);
  // A 750ms checkpoint took longer in transit than the following 1500ms
  // checkpoint. Only 300ms separated their server arrivals, but neither
  // captured playback position exceeded actual time since begin.
  await db.query("update learning_assessed_audio set position_ms=750,playback_anchor_at=clock_timestamp()-interval '1.8 seconds',last_event_at=clock_timestamp()-interval '0.3 seconds',lease_until=clock_timestamp()+interval '5 seconds' where session_id=$1",[f.session]);
  assert.equal((await assessedOperation(db,f,'progress',{...p,positionMs:1500})).resumePositionMs,1500);
  await assert.rejects(assessedOperation(db,f,'progress',{...p,positionMs:8000}),/audio_progress_invalid/);
  await assert.rejects(assessedOperation(db,f,'progress',{...p,positionMs:1000}),/audio_progress_invalid/);
  await assessedOperation(db,f,'pause',{...p,positionMs:1500});
  await db.query("update learning_assessed_audio set playback_anchor_at=clock_timestamp()-interval '1 hour' where session_id=$1",[f.session]);
  const resume={...p,clientId:randomUUID(),positionMs:1500};await assessedOperation(db,f,'begin',resume);
  await assert.rejects(assessedOperation(db,f,'progress',{...resume,positionMs:8000}),/audio_progress_invalid/);
  assert.equal((await assessedOperation(db,f,'state')).completedPlays,0);
  const anchor=(await db.query('select playback_anchor_position_ms from learning_assessed_audio where session_id=$1',[f.session])).rows[0];assert.equal(anchor.playback_anchor_position_ms,1500);
  await db.query("update learning_assessed_audio set lease_until=clock_timestamp()-interval '1 second' where session_id=$1",[f.session]);
  await assert.rejects(assessedOperation(db,f,'progress',{...resume,positionMs:1500}),/audio_playback_conflict/);
 }finally{await db.close();}
});

test('closed v4 policy, multiple subjects, live ownership and service-only ledger remain enforced',async()=>{
 const db=await database();try{
  for(const idx of [0,2]){
   const f=await assessedFixture(db,{idx,maximumPlays:idx===0?2:3});
   const p=f.policy,scope={mode:p.mode,subjectProgramId:p.subjectProgramId,curriculumReleaseId:p.curriculumReleaseId,unitId:p.unitId};
   assert.equal(readAssessmentPolicy({assessmentPolicy:p},scope).audioPlayback.maximumPlays,idx===0?2:3);
   for(const change of [{maximumPlays:0},{maximumPlays:11},{maximumPlays:2.5},{playbackRate:2},{transcriptAvailable:true},{extra:true}]){
    const bad={...p,audioPlayback:{...p.audioPlayback,...change}};
    assert.throws(()=>readAssessmentPolicy({assessmentPolicy:bad},scope),/assessment_policy_invalid/);
    await assert.rejects(db.query('select private.validate_assessed_audio_policy($1)',[JSON.stringify(bad)]),/audio_policy_invalid/);
   }
   await assert.rejects(assessedOperation(db,f,'state',{}, {student:id(11),auth:id(402)}));
   assert.equal((await play(db,f)).state.completedPlays,1);
  }
  const f=await configureAssessed(db,1);assert.ok(f);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from learning_assessed_audio'),/permission denied/);await assert.rejects(db.query('select service_assessed_audio(null,null,null,null,null)'),/permission denied/);await db.exec('reset role');}
  await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
  const session=(await db.query('select id from learning_sessions where curriculum_release_id=$1 limit 1',[id(scopes[0].release)])).rows[0];
  await assert.rejects(operation(db,session.id,'serve'),/learning_context_unavailable/);
 }finally{await db.close();}
});
