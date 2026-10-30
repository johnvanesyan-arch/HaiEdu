import {taskDownloadBlob} from './teacher-task-download.mjs';
export function createStudentTeacherTaskClient({client,actorId,isCurrent=()=>true}){
 let alive=true;const uploads=new Map();
 async function identity(){const r=await client.auth.getSession();if(!alive||!isCurrent()||r.data?.session?.user?.id!==(typeof actorId==='function'?actorId():actorId))throw Error('stale');}
 async function invoke(name,body){await identity();const r=await client.functions.invoke(name,{body});await identity();if(r.error||r.data?.error){let code=r.data?.error;try{code||=(await r.error.context?.json())?.error;}catch{}throw Error(code??'unknown');}return r.data;}
 async function work(action,context,payload={}){const r=await invoke('manage-teacher-task-student-work',{action,context,payload});if(r?.version!=='teacher-task-student-work-v1')throw Error('unknown');return r;}
 async function upload(file,{id,context}){
  if(!(file instanceof Blob)||file.size<1||file.size>10*1024*1024)throw Error('task_file_invalid');const format=file.name?.split('.').at(-1)?.toLowerCase();if(!['pdf','docx'].includes(format))throw Error('task_file_invalid');
  await identity();const bytes=await file.arrayBuffer();await identity();const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');const key=JSON.stringify([id,context,sha,format]);let request=uploads.get(key);if(!request){request={action:'upload',context,payload:{id,requestId:crypto.randomUUID(),format}};uploads.set(key,request);}
  const body=new FormData();body.set('request',JSON.stringify(request));body.set('file',new Blob([bytes],{type:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'response.'+format);
  const r=await invoke('manage-teacher-task-student-files',body);if(r?.version!=='teacher-task-student-files-v1'||!r.file?.id)throw Error('unknown');uploads.delete(key);return r.file;
 }
 async function download(action,context,payload){const r=await invoke('manage-teacher-task-student-files',{action,context,payload});return taskDownloadBlob(r);}
 return{work,upload,download,dispose(){alive=false;uploads.clear();}};
}
