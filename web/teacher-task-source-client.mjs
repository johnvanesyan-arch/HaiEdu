const LIMIT=10*1024*1024;
export function createTeacherTaskSourceClient({client,context,actorId,isCurrent=()=>true}){
 let alive=true;const attempts=new Map();
 const ctx=Object.fromEntries(['assignmentId','curriculumReleaseId','unitId'].map(k=>[k,context[k]]));
 async function identity(){const r=await client.auth.getSession();if(!alive||!isCurrent()||r.data?.session?.user?.id!==actorId)throw Error('task_source_stale');}
 async function invoke(body){await identity();const result=await client.functions.invoke('manage-teacher-task-sources',{body});await identity();if(result.error||result.data?.error){let code=result.data?.error;try{code||=(await result.error.context?.json())?.error;}catch{}throw Error(code??'task_source_unknown');}return result.data;}
 async function upload(file,{draftId}){
  if(!draftId||!(file instanceof Blob)||file.size<1||file.size>LIMIT)throw Error('task_source_file_invalid');
  await identity();const bytes=await file.arrayBuffer();await identity();const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');const key=draftId+':'+sha;
  let request=attempts.get(key);if(!request){request={action:'upload',context:ctx,payload:{draftId,requestId:crypto.randomUUID()}};attempts.set(key,request);}
  const form=new FormData();form.set('request',JSON.stringify(request));form.set('file',new Blob([bytes],{type:'application/pdf'}),'task.pdf');const data=await invoke(form);if(data?.version!=='teacher-task-sources-v1'||typeof data.id!=='string')throw Error('task_source_unknown');attempts.delete(key);return data;
 }
 async function download(id){const result=await invoke({action:'open',context:ctx,payload:{id}});if(!(result instanceof Blob)||result.type!=='application/pdf')throw Error('task_source_file_invalid');return result;}
 return{upload,download,dispose(){alive=false;attempts.clear();}};
}
