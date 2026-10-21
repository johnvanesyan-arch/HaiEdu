import {readFileSync} from 'node:fs';
import {database as sharedDatabase,configure,blueprintId,id,scopes,seedAudio,seedTaskSet,launch,operation,finish} from './shared-task-sets-db.mjs';
import {ready,formItems} from './governed-mastery-forms-db.mjs';
export * from './shared-task-sets-db.mjs';
export const assessedAudioMigration='supabase/migrations/20261021213231_sprint_16_1c_assessed_listening.sql';
export const audioPolicy={schemaVersion:'haiedu-assessed-audio-v1',maximumPlays:2,playbackRate:1,transcriptAvailable:false,scope:'session-recording',questionVisibility:'whole-recording',interruption:'resume-or-unscored-v1'};
export async function database(options={}) {
 const db=await sharedDatabase(options);try{await db.exec(readFileSync(assessedAudioMigration,'utf8'));return db;}catch(e){await db.close();throw e;}
}
export async function configureAssessed(db,idx=0,mode='diagnostic',overrides={}) {
 const policy=await configure(db,idx,mode);
 Object.assign(policy,{schemaVersion:'haiedu-assessment-policy-v4',scoringStrategy:'normalized-item-score-v1',responseCapabilities:{},itemWeight:1,audioPlayback:{...audioPolicy,...overrides}});
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(idx,mode),JSON.stringify(policy)]);
 await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[id(scopes[idx].model),JSON.stringify(policy)]);
 return policy;
}
export async function assessedFixture(db,{idx=0,mode='diagnostic',items,durationMs=300,...options}={}) {
 if(mode==='mastery_check'){const baseline=await launch(db,idx);await finish(db,baseline.session.id);await ready(db);items??=formItems[0];}
 const policy=await configureAssessed(db,idx,mode,options),audio=await seedAudio(db,idx,{durationMs});
 const set=await seedTaskSet(db,{idx,mode,items,setId:id(9800+idx),stimulus:audio.stimulus,family:id(9500+idx)});
 const start=await launch(db,idx,mode);const served=await operation(db,start.session.id,'serve');
 return {...audio,policy,set,session:start.session.id,served};
}
export async function assessedOperation(db,f,action,payload={},actor={}) {
 return (await db.query('select service_assessed_audio($1,$2,$3,$4,$5,$6) result',[actor.student??id(10),actor.auth??id(401),action,f.session,f.served.sessionItemId,JSON.stringify(payload)])).rows[0].result;
}
