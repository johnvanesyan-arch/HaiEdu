import {readFileSync} from 'node:fs';
import {database,audioPractice,id} from './learning-audio-db.mjs';
import {compile,sqlAdmin} from './learning-acceptance.mjs';
import {createLearningAudioHandler} from '../../supabase/functions/_shared/learning-audio-handler.mjs';
import {installTaskSets,seedTaskSet,launch,finish,seedAudio,operation,scopes} from './shared-task-sets-db.mjs';
import {createLearningTaskSetHandler} from '../../supabase/functions/_shared/learning-task-set-handler.mjs';
import {assessedAudioMigration,audioProgressMigration,assessedFixture} from './assessed-audio-db.mjs';
export {id};
export const token=(actor=10,session=actor===30?430:actor+391)=>'fixture.'+Buffer.from(JSON.stringify({session_id:id(session)})).toString('base64url')+'.'+actor;
export async function fixture({taskSet=false,reading=false,assessed=false}={}){
 const db=await database();let f;
 if(assessed){await installTaskSets(db);await db.exec(readFileSync(assessedAudioMigration,'utf8'));await db.exec(readFileSync(audioProgressMigration,'utf8'));f=await assessedFixture(db,typeof assessed==='object'?assessed:{});}
 else if(taskSet){
  await installTaskSets(db);const baseline=await launch(db);await finish(db,baseline.session.id);
  const audio=await seedAudio(db),set=await seedTaskSet(db,{mode:'practice',family:id(9500),...(reading?{}:{stimulus:audio.stimulus}),items:[id(713),id(711),id(712)]});
  const start=await launch(db,0,'practice',{skill:id(scopes[0].skills[0])}),served=await operation(db,start.session.id,'serve');
  f={...audio,set,session:start.session.id,served,baseline};
 }else f=await audioPractice(db);
 await db.query('insert into auth.users(id) values($1)',[id(30)]);await db.query('insert into auth.sessions values($1,$2,null)',[id(430),id(30)]);
 const state={public:false,unavailable:false,corrupt:false,downloads:0,afterDownload:null},admin=sqlAdmin(db);
 admin.auth={getUser:async credential=>{const actor=Number(credential.split('.').at(-1));return [10,11,30].includes(actor)&&credential.startsWith('fixture.')?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid synthetic credential'}};}};
 admin.storage={getBucket:async()=>({data:{public:state.public}}),from:()=>({download:async()=>{state.downloads++;if(state.afterDownload)await state.afterDownload();return state.unavailable?{error:{message:'synthetic missing file'}}:{data:new Blob([state.corrupt?Buffer.alloc(f.bytes.length):f.bytes],{type:'audio/wav'})};}})};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const handle=createLearningAudioHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const taskSetHandle=createLearningTaskSetHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const request=(body,actor=10,credential=token(actor))=>handle(new Request('https://fixture.invalid/audio',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {db,...f,state,admin,handle,taskSetHandle,request,body:{action:'load',sessionId:f.session,sessionItemId:f.served.sessionItemId,...(assessed?{playbackPolicy:'assessed-recording-v1'}:{})}};
}
