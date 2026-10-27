import {readFileSync,readdirSync} from 'node:fs';
import {database,id,context} from './supplementary-resources-db.mjs';
import {compile,sqlAdmin} from './learning-acceptance.mjs';
import {createSupplementaryResourcesHandler} from '../../supabase/functions/_shared/supplementary-resources-handler.mjs';
import {createResourceAssignmentsHandler} from '../../supabase/functions/_shared/resource-assignments-handler.mjs';
export {id,context};
export const token=(actor=20,aal='aal1')=>'fixture.'+Buffer.from(JSON.stringify({session_id:id(actor===30?430:actor===20?420:actor===21?421:actor===12?9212:401),aal})).toString('base64url')+'.'+actor;
export async function fixture(){
 const db=await database();await db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(x=>x.endsWith('_sprint_16_5b_resource_assignments.sql')),'utf8'));await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));
 const admin=sqlAdmin(db),objects=new Map();let onDownload=async()=>{},onUpload=async()=>{};
 admin.auth={getUser:async value=>{const actor=Number(value.split('.').at(-1));return[10,12,20,21,30].includes(actor)&&value.startsWith('fixture.')?{data:{user:{id:id(actor)}}}:{error:{message:'Invalid fixture credential'}};}};
 admin.storage={from:bucket=>{if(bucket!=='supplementary-materials')throw Error('Unexpected bucket');return{
  upload:async(path,bytes,options)=>{if(options.upsert||objects.has(path))return{error:{message:'Conflict'}};objects.set(path,new Blob([bytes],{type:'application/pdf'}));await onUpload();return{data:{path}};},
  download:async path=>{await onDownload();return objects.has(path)?{data:objects.get(path)}:{error:{message:'Missing fixture object'}};},
  remove:async paths=>{paths.forEach(p=>objects.delete(p));return{data:[]};}
 };}};
 const{hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 const handle=createSupplementaryResourcesHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const handleAssignments=createResourceAssignmentsHandler({createAdmin:()=>admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const request=(body,actor=20,aal='aal1')=>handle(new Request('https://fixture.invalid/materials',{method:'POST',headers:{Authorization:'Bearer '+token(actor,aal),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)}));
 return{db,admin,objects,handle,handleAssignments,request,setDownloadHook(fn){onDownload=fn;},setUploadHook(fn){onUpload=fn;}};
}
