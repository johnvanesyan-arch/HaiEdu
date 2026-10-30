import {validTaskResponse,taskUuid as uuid} from './teacher-task-response.mjs';
export const taskStudentCors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const taskStudentReply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...taskStudentCors,'Content-Type':'application/json'}});
export const taskShape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
export function taskStudentError(e){let code=String(e?.message??'').split('\n')[0];if(['learning_context_unavailable','resource_forbidden','written_read_only'].includes(code))code='task_work_forbidden';const status={unauthorized:401,task_work_forbidden:403,task_work_unavailable:404,task_work_invalid:400,task_work_format:400,task_work_locked:409,task_work_conflict:409,task_file_unavailable:404,task_file_invalid:400,task_file_too_large:413,task_file_storage_unavailable:503}[code];return taskStudentReply({error:status?code:'service_unavailable'},status??503);}
const fail=code=>{throw Error(code);};
export async function taskBounded(request,max){if(Number(request.headers.get('content-length'))>max)fail('task_file_too_large');const reader=request.body?.getReader();if(!reader)fail('task_work_invalid');let size=0,chunks=[];try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail('task_file_too_large');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;}
export async function taskStudentAccess(request,{createAdmin,hasActiveLiveSession,env},rpcName='service_teacher_task_student_work'){
 if(!env.url||!env.key)fail('service_unavailable');const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)fail('unauthorized');const admin=createAdmin(env.url,env.key),auth=await admin.auth.getUser(token);if(auth.error||!auth.data?.user)fail('unauthorized');
 let claims;try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')));}catch{fail('unauthorized');}
 const actor=auth.data.user.id,live=async()=>{if(!uuid(claims.session_id)||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,actor))fail('task_work_forbidden');};await live();
 const rpc=async(action,context,payload)=>{const {data,error}=await admin.rpc(rpcName,{p_actor:actor,p_auth:claims.session_id,p_action:action,p_context:context,p_payload:payload});if(error)throw Error(error.message);return data;};return{admin,live,rpc};
}
export function validStudentContext(c,inbox=false){return taskShape(c,inbox?[]:['enrollmentId','curriculumReleaseId','unitId'])&&Object.keys(c).length===(inbox?0:3)&&Object.values(c).every(uuid);}
export function createTeacherTaskStudentHandler(options){return async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:taskStudentCors});if(request.method!=='POST')return taskStudentReply({error:'method_not_allowed'},405);
 try{
  const access=await taskStudentAccess(request,options);let body;try{body=JSON.parse(new TextDecoder().decode(await taskBounded(request,131072)));}catch(e){if(e.message==='task_file_too_large')throw e;fail('task_work_invalid');}
  const keys={inbox:['offset'],open:['id'],save:['id','expectedRevision','content'],submit:['id','expectedRevision','content','requestId']};
  if(!taskShape(body,['action','context','payload'])||!Object.hasOwn(keys,body.action)||!validStudentContext(body.context,body.action==='inbox')||!taskShape(body.payload??{},keys[body.action]))fail('task_work_invalid');const {action,context,payload={}}=body;
  if(action!=='inbox'&&!uuid(payload.id)||payload.offset!==undefined&&(!Number.isSafeInteger(payload.offset)||payload.offset<0||payload.offset>100000))fail('task_work_invalid');
  if(['save','submit'].includes(action)&&(!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<0||payload.expectedRevision>2147483646||!validTaskResponse(payload.content,{draft:action==='save'})||action==='submit'&&!uuid(payload.requestId)))fail('task_work_invalid');
  const result=await access.rpc(action,context,payload);await access.live();return taskStudentReply(result);
 }catch(e){return taskStudentError(e);}
};}
