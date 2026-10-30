import {validateTeacherTaskDefinition} from './teacher-task-definition.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=code=>{throw Error(code);};
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
async function bodyJSON(request){
 if(Number(request.headers.get('content-length'))>100000)fail('task_draft_invalid');
 const reader=request.body?.getReader();if(!reader)fail('task_draft_invalid');
 const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>100000){await reader.cancel();fail('task_draft_invalid');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('task_draft_invalid');}
}
export function createTeacherTaskDraftsHandler({createAdmin,hasActiveLiveSession,env}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  try{
   if(!env.url||!env.key)return reply({error:'service_unavailable'},503);
   const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return reply({error:'unauthorized'},401);
   const admin=createAdmin(env.url,env.key),{data:auth,error}=await admin.auth.getUser(token);
   if(error||!auth?.user)return reply({error:'unauthorized'},401);
   let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{fail('assignment_forbidden');}
   if(!UUID.test(claims.session_id)||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,auth.user.id))fail('assignment_forbidden');
   const live=async()=>{if(!await hasActiveLiveSession(admin,token,auth.user.id))fail('assignment_forbidden');};
   const body=await bodyJSON(request),keys={create:['requestId','definition'],copy:['id','expectedRevision','requestId'],save:['id','expectedRevision','definition'],get:['id'],list:['offset']};
   if(!shape(body,['action','context','payload'])||!Object.hasOwn(keys,body.action)||!shape(body.context,['assignmentId','curriculumReleaseId','unitId'])||Object.keys(body.context).length!==3||!shape(body.payload??{},keys[body.action]))fail('task_draft_invalid');
   const {action,context,payload={}}=body;
   if(Object.values(context).some(v=>typeof v!=='string'||!UUID.test(v)))fail('task_draft_invalid');
   if(['create','copy'].includes(action)&&!UUID.test(payload.requestId))fail('task_draft_invalid');
   if(['get','save','copy'].includes(action)&&!UUID.test(payload.id))fail('task_draft_invalid');
   if(['save','copy'].includes(action)&&(!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<(action==='copy'?1:0)||payload.expectedRevision>2147483646))fail('task_draft_invalid');
   if(['create','save'].includes(action)&&!validateTeacherTaskDefinition(payload.definition,{draft:true}).valid)fail('task_draft_invalid');
   if(payload.offset!==undefined&&(!Number.isSafeInteger(payload.offset)||payload.offset<0||payload.offset>100000))fail('task_draft_invalid');
   const rpc=async()=>{const {data,error}=await admin.rpc('service_teacher_task_drafts',{p_actor:auth.user.id,p_auth:claims.session_id,p_action:action,p_context:context,p_payload:payload});if(error)throw Error(error.message);return data;};
   const data=await rpc();
   await live();return reply(data);
  }catch(error){
   let code=String(error?.message??'').split('\n')[0].trim();
   if(['resource_forbidden','learning_context_unavailable','written_context_unavailable','written_read_only'].includes(code))code='assignment_forbidden';
   const statuses={task_draft_invalid:400,task_draft_conflict:409,task_draft_unavailable:404,assignment_already_assigned:409,assignment_forbidden:403,assignment_unavailable:404,assignment_conflict:409,assignment_preview_stale:409,assignment_recipients_invalid:400,assignment_recipient_limit:400,task_draft_invalid:400,assignment_reason_required:400,assignment_storage_unavailable:503,assignment_file_invalid:503};
   return reply({error:statuses[code]?code:'service_unavailable'},statuses[code]??503);
  }
 };
}
