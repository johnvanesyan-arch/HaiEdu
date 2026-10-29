import {taskUuid as uuid,RESPONSE_FILE_LIMIT,RESPONSE_MIME} from './teacher-task-response.mjs';
import {validateTaskDocument} from './teacher-task-documents.mjs';
import {taskStudentCors,taskStudentReply,taskStudentError,taskStudentAccess,taskBounded,taskShape,validStudentContext} from './teacher-task-student-handler.mjs';
const fail=code=>{throw Error(code);};
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function readback(admin,file){const r=await admin.storage.from('teacher-task-files').download(file.path);if(r.error||!r.data)fail('task_file_storage_unavailable');const bytes=new Uint8Array(await r.data.arrayBuffer());if(bytes.length!==file.bytes||await hash(bytes)!==file.sha256)fail('task_file_invalid');await validateTaskDocument(bytes,file.format);return bytes;}
export function createTeacherTaskStudentFilesHandler(options){return async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:taskStudentCors});if(request.method!=='POST')return taskStudentReply({error:'method_not_allowed'},405);
 try{
  const access=await taskStudentAccess(request,options),multipart=request.headers.get('content-type')?.startsWith('multipart/form-data;');const bytes=await taskBounded(request,multipart?RESPONSE_FILE_LIMIT+65536:16384);let body,file;
  try{if(multipart){const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')}}).formData();if([...form.keys()].sort().join(',')!=='file,request')fail('task_work_invalid');body=JSON.parse(form.get('request'));file=form.get('file');}else body=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('task_work_invalid');}
  const keys={upload:['id','requestId','format'],open:['id','fileId'],source:['id']};if(!taskShape(body,['action','context','payload'])||!Object.hasOwn(keys,body.action)||!validStudentContext(body.context)||!taskShape(body.payload,keys[body.action])||!uuid(body.payload.id)||Boolean(multipart)!==(body.action==='upload'))fail('task_work_invalid');const {action,context,payload}=body;
  if(action==='upload'){
   if(!uuid(payload.requestId)||!Object.hasOwn(RESPONSE_MIME,payload.format)||!(file instanceof Blob)||file.type!==RESPONSE_MIME[payload.format])fail('task_file_invalid');const data=new Uint8Array(await file.arrayBuffer());await validateTaskDocument(data,payload.format);const sha256=await hash(data);
   let result=await access.rpc('reserve_file',context,{...payload,bytes:data.length,sha256});let asset=result.file;
   if(asset.status!=='ready'){const stored=await access.admin.storage.from('teacher-task-files').upload(asset.path,data,{contentType:RESPONSE_MIME[asset.format],upsert:false});if(stored.error)await readback(access.admin,asset);await access.live();result=await access.rpc('ready_file',context,{id:payload.id,fileId:asset.id});asset=result.file;}
   await readback(access.admin,asset);await access.rpc('open_file',context,{id:payload.id,fileId:asset.id});await access.live();return taskStudentReply({version:'teacher-task-student-files-v1',file:{id:asset.id,format:asset.format,bytes:asset.bytes,sha256:asset.sha256}});
  }
  if(action==='open'&&!uuid(payload.fileId))fail('task_work_invalid');const rpcAction=action==='source'?'source':'open_file';const result=await access.rpc(rpcAction,context,payload),asset=result.file;const content=await readback(access.admin,asset);await access.rpc(rpcAction,context,payload);await access.live();
  return new Response(content,{headers:{...taskStudentCors,'Content-Type':RESPONSE_MIME[asset.format],'Content-Disposition':'attachment; filename="haiedu-'+(action==='source'?'task':'response')+'.'+asset.format+'"','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch(e){return taskStudentError(e);}
};}
