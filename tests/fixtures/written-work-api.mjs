import {readFileSync} from 'node:fs';
import {database,id,context} from './written-work-db.mjs';
import {compile,sqlAdmin} from './learning-acceptance.mjs';
import {createWrittenWorkHandler} from '../../supabase/functions/_shared/written-work-handler.mjs';
export {id,context};
export const token=(actor=10,session=actor===20?420:actor===21?421:actor+391)=>'fixture.'+Buffer.from(JSON.stringify({session_id:id(session)})).toString('base64url')+'.'+actor;
export async function fixture(options={}){
 const db=await database(options);await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));
 const admin=sqlAdmin(db);admin.auth={getUser:async value=>{const actor=Number(value.split('.').at(-1));return [10,11,20,21,30].includes(actor)&&value.startsWith('fixture.')?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid fixture credential'}};}};
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const handle=createWrittenWorkHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const request=(body,actor=10,credential=token(actor))=>handle(new Request('https://fixture.invalid/written-work',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 return{db,admin,handle,request,hasActiveLiveSession};
}
