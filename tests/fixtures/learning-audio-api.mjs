import {readFileSync} from 'node:fs';
import {database,audioPractice,id} from './learning-audio-db.mjs';
import {compile,sqlAdmin} from './learning-acceptance.mjs';
import {createLearningAudioHandler} from '../../supabase/functions/_shared/learning-audio-handler.mjs';
export {id};
export const token=(actor=10,session=actor===30?430:actor+391)=>'fixture.'+Buffer.from(JSON.stringify({session_id:id(session)})).toString('base64url')+'.'+actor;
export async function fixture(){
 const db=await database(),f=await audioPractice(db);
 await db.query('insert into auth.users(id) values($1)',[id(30)]);await db.query('insert into auth.sessions values($1,$2,null)',[id(430),id(30)]);
 const state={public:false,unavailable:false,corrupt:false,downloads:0,afterDownload:null},admin=sqlAdmin(db);
 admin.auth={getUser:async credential=>{const actor=Number(credential.split('.').at(-1));return [10,11,30].includes(actor)&&credential.startsWith('fixture.')?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid synthetic credential'}};}};
 admin.storage={getBucket:async()=>({data:{public:state.public}}),from:()=>({download:async()=>{state.downloads++;if(state.afterDownload)await state.afterDownload();return state.unavailable?{error:{message:'synthetic missing file'}}:{data:new Blob([state.corrupt?Buffer.alloc(f.bytes.length):f.bytes],{type:'audio/wav'})};}})};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const handle=createLearningAudioHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const request=(body,actor=10,credential=token(actor))=>handle(new Request('https://fixture.invalid/audio',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {db,...f,state,admin,handle,request,body:{action:'load',sessionId:f.session,sessionItemId:f.served.sessionItemId}};
}
