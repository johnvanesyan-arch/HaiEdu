import {taskUuid as uuid,RESPONSE_DOWNLOAD_MIME} from './teacher-task-response.mjs';
import {taskStudentCors,taskStudentReply,taskStudentError,taskStudentAccess,taskBounded,taskShape} from './teacher-task-student-handler.mjs';
import {readbackTaskFile} from './teacher-task-student-files-handler.mjs';
const fail=code=>{throw Error(code);};
const contextOK=c=>taskShape(c,['assignmentId','curriculumReleaseId','unitId'])&&Object.keys(c).length===3&&Object.values(c).every(uuid);
export function validTaskReview(review){
 return taskShape(review,['decision','feedback','scores','reason'])&&Object.keys(review).length===4&&['reviewed','returned'].includes(review.decision)
 &&typeof review.feedback==='string'&&review.feedback.length<=8000&&typeof review.reason==='string'&&review.reason.length<=1000
 &&taskShape(review.scores,Object.keys(review.scores??{}))&&Object.keys(review.scores).length<=12
 &&Object.entries(review.scores).every(([k,v])=>/^[a-z][a-z0-9_]{0,39}$/.test(k)&&(v===null||Number.isSafeInteger(v)&&v>=0&&v<=100));
}
function reviewError(e){
 let code=String(e?.message??'').split('\n')[0];
 if(['written_context_unavailable','written_read_only','task_work_forbidden'].includes(code))code='task_review_forbidden';
 const status={task_review_forbidden:403,task_review_invalid:400,task_review_unavailable:404,task_review_locked:409,task_review_conflict:409,task_review_reason_required:400}[code];
 return status?taskStudentReply({error:code},status):taskStudentError(e);
}
export function createTeacherTaskReviewHandler(options,{files=false}={}){return async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:taskStudentCors});if(request.method!=='POST')return taskStudentReply({error:'method_not_allowed'},405);
 try{
  const access=await taskStudentAccess(request,options,'service_teacher_task_review');let body;
  try{body=JSON.parse(new TextDecoder().decode(await taskBounded(request,65536)));}catch(e){if(e.message==='task_file_too_large')throw e;fail('task_review_invalid');}
  const keys=files?{file:['submissionId'],source:['submissionId']}:{queue:['offset','state'],deliveries:['offset'],open:['submissionId'],save:['submissionId','expectedRevision','review'],publish:['submissionId','expectedRevision','review','requestId'],cancel:['deliveryId','requestId','reason']};
  if(!taskShape(body,['action','context','payload'])||!Object.hasOwn(keys,body.action)||!contextOK(body.context)||!taskShape(body.payload??{},keys[body.action]))fail('task_review_invalid');
  const {action,context,payload={}}=body;
  if(['queue','deliveries'].includes(action)){
   if(payload.offset!==undefined&&(!Number.isSafeInteger(payload.offset)||payload.offset<0||payload.offset>100000)||payload.state!==undefined&&!['submitted','returned','reviewed','all'].includes(payload.state))fail('task_review_invalid');
  }else if(action==='cancel'){
   if(!uuid(payload.deliveryId)||!uuid(payload.requestId)||typeof payload.reason!=='string'||!payload.reason.trim()||payload.reason.length>1000)fail('task_review_invalid');
  }else{
   if(!uuid(payload.submissionId))fail('task_review_invalid');
   if(['save','publish'].includes(action)&&(!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<0||payload.expectedRevision>2147483646||!validTaskReview(payload.review)||action==='publish'&&!uuid(payload.requestId)))fail('task_review_invalid');
  }
  const result=await access.rpc(action,context,payload);
  if(files){
   const asset=result.file,content=await readbackTaskFile(access.admin,asset);await access.rpc(action,context,payload);await access.live();
   return new Response(content,{headers:{...taskStudentCors,'Content-Type':RESPONSE_DOWNLOAD_MIME[asset.format],'Content-Disposition':'attachment; filename="haiedu-'+(action==='source'?'task':'response')+'.'+asset.format+'"','Content-Security-Policy':"sandbox; default-src 'none'"}});
  }
  await access.live();return taskStudentReply(result);
 }catch(e){return reviewError(e);}
};}
