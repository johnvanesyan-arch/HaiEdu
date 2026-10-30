import {TASK_FILE_LIMIT} from './teacher-task-definition.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=code=>{throw Error(code);};
export function validTeacherTaskPdf(bytes){if(!(bytes instanceof Uint8Array)||bytes.length<10||bytes.length>TASK_FILE_LIMIT)return false;const decode=v=>new TextDecoder('latin1').decode(v);return /^%PDF-(1\.[0-7]|2\.0)[\s\r\n]/.test(decode(bytes.slice(0,16)))&&/%%EOF\s*$/.test(decode(bytes.slice(-1024)));}
async function bounded(request,max){if(Number(request.headers.get('content-length'))>max)fail('task_source_too_large');const reader=request.body?.getReader();if(!reader)fail('task_source_invalid');let length=0,chunks=[];try{while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>max){await reader.cancel();fail('task_source_too_large');}chunks.push(r.value);}}finally{reader.releaseLock();}const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;}
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function createTeacherTaskSourcesHandler({createAdmin,hasActiveLiveSession,env}){return async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  if(!env.url||!env.key)fail('task_source_storage_unavailable');const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return json({error:'unauthorized'},401);
  const admin=createAdmin(env.url,env.key),user=await admin.auth.getUser(token);if(user.error||!user.data?.user)return json({error:'unauthorized'},401);let claims;try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')));}catch{fail('task_source_forbidden');}
  const actor=user.data.user.id,live=async()=>{if(!uuid(claims.session_id)||!['aal1','aal2'].includes(claims.aal)||!await hasActiveLiveSession(admin,token,actor))fail('task_source_forbidden');};await live();
  const multipart=request.headers.get('content-type')?.startsWith('multipart/form-data;'),raw=await bounded(request,multipart?TASK_FILE_LIMIT+65536:16384);let body,file;
  try{if(multipart){const form=await new Response(raw,{headers:{'Content-Type':request.headers.get('content-type')}}).formData();if([...form.keys()].sort().join(',')!=='file,request')fail('task_source_invalid');body=JSON.parse(form.get('request'));file=form.get('file');}else body=JSON.parse(new TextDecoder().decode(raw));}catch{fail('task_source_invalid');}
  if(!shape(body,['action','context','payload'])||!shape(body.context,['assignmentId','curriculumReleaseId','unitId'])||Object.keys(body.context).length!==3||Object.values(body.context).some(v=>!uuid(v)))fail('task_source_invalid');
  const {action,context,payload}=body;if(!['upload','open'].includes(action)||Boolean(multipart)!==(action==='upload')||!shape(payload,action==='upload'?['draftId','requestId']:['id']))fail('task_source_invalid');
  const rpc=async(action,payload)=>{const r=await admin.rpc('service_teacher_task_sources',{p_actor:actor,p_auth:claims.session_id,p_action:action,p_context:context,p_payload:payload});if(r.error)throw Error(r.error.message);return r.data;};
  let asset;
  if(action==='upload'){
   if(!uuid(payload.draftId)||!uuid(payload.requestId)||!(file instanceof Blob)||file.type!=='application/pdf')fail('task_source_file_invalid');const bytes=new Uint8Array(await file.arrayBuffer());if(!validTeacherTaskPdf(bytes))fail('task_source_file_invalid');const sha256=await hash(bytes);
   asset=await rpc('reserve',{...payload,sha256,bytes:bytes.length});
   if(asset.status!=='ready'){
    const stored=await admin.storage.from('teacher-task-files').upload(asset.path,bytes,{contentType:'application/pdf',upsert:false});
    // A lost upload reply or existing-object conflict is reconciled by exact bytes.
    if(stored.error){const previous=await admin.storage.from('teacher-task-files').download(asset.path);if(previous.error||!previous.data)fail('task_source_storage_unavailable');const old=new Uint8Array(await previous.data.arrayBuffer());if(old.length!==asset.bytes||await hash(old)!==asset.sha256)fail('task_source_file_invalid');}
    await live();asset=await rpc('ready',{id:asset.id});
   }
   const confirmed=await admin.storage.from('teacher-task-files').download(asset.path);if(confirmed.error||!confirmed.data)fail('task_source_storage_unavailable');const confirmedBytes=new Uint8Array(await confirmed.data.arrayBuffer());if(confirmedBytes.length!==asset.bytes||await hash(confirmedBytes)!==asset.sha256)fail('task_source_file_invalid');
   await live();return json({version:'teacher-task-sources-v1',id:asset.id,sha256:asset.sha256,bytes:asset.bytes});
  }
  if(!uuid(payload.id))fail('task_source_invalid');asset=await rpc('open',payload);const stored=await admin.storage.from('teacher-task-files').download(asset.path);if(stored.error||!stored.data)fail('task_source_storage_unavailable');const bytes=new Uint8Array(await stored.data.arrayBuffer());if(bytes.length!==asset.bytes||await hash(bytes)!==asset.sha256||!validTeacherTaskPdf(bytes))fail('task_source_file_invalid');await rpc('open',payload);await live();
  return new Response(bytes,{headers:{...cors,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="haiedu-task-'+asset.id+'.pdf"','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch(e){let code=String(e.message).split('\n')[0];if(['written_context_unavailable','written_read_only','learning_context_unavailable'].includes(code))code='task_source_forbidden';const statuses={task_source_invalid:400,task_source_file_invalid:400,task_source_too_large:413,task_source_forbidden:403,task_source_unavailable:404,task_source_conflict:409,task_source_storage_unavailable:503};return json({error:statuses[code]?code:'service_unavailable'},statuses[code]??503);}
};}
