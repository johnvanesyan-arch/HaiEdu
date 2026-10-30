const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pathPattern=new RegExp('^(?:'+uuid+'/'+uuid+'\\.pdf|responses/'+uuid+'/'+uuid+'\\.(?:pdf|docx))$');
export async function taskPrivacyRpc(admin,actorId,sessionId,action,payload){
 const {data,error}=await admin.rpc('service_teacher_task_privacy',{p_actor:actorId,p_auth:sessionId,p_action:action,p_payload:payload});
 if(error)throw Error(String(error.message).split('\n')[0]);
 if(data?.version!=='teacher-task-privacy-v1')throw Error('task_privacy_unavailable');return data;
}
// One bounded, retryable batch. Only server-derived queue paths can be removed.
// List readback reconciles lost remove replies without downloading retained files.
export async function removeTeacherTaskFiles({admin,actorId,sessionId,selector,assertLive}){
 await assertLive();const data=await taskPrivacyRpc(admin,actorId,sessionId,'files',selector);
 const files=data.files;if(!Array.isArray(files)||files.length>100||files.some(f=>!pathPattern.test(f.path)))throw Error('task_privacy_storage_unavailable');
 if(files.length){
  await assertLive();const store=admin.storage.from('teacher-task-files');
  try{await store.remove(files.map(f=>f.path));}catch{/* Readback decides whether removal completed. */}
  let next=0;const confirmed=[];
  const results=await Promise.allSettled(Array.from({length:Math.min(4,files.length)},async()=>{
   while(next<files.length){const f=files[next++],slash=f.path.lastIndexOf('/'),name=f.path.slice(slash+1);
    const r=await store.list(f.path.slice(0,slash),{search:name,limit:2});
    if(r.error||!Array.isArray(r.data)||r.data.some(x=>x.name===name))throw Error('task_privacy_storage_unavailable');
    confirmed.push(f.id);
   }
  }));
  await assertLive();
  if(confirmed.length)await taskPrivacyRpc(admin,actorId,sessionId,'ack',{...selector,ids:confirmed});
  if(results.some(r=>r.status==='rejected'))throw Error('task_privacy_storage_unavailable');
 }
 return taskPrivacyRpc(admin,actorId,sessionId,'status',selector);
}
export const taskAuthUserMissing=error=>error?.code==='user_not_found'||Number(error?.status)===404;
