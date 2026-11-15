import {addLearner} from './resource-assignments-db.mjs';
import {readFileSync} from 'node:fs';
import {authoringFixture,id,context,token} from './teacher-task-authoring-api.mjs';
import {compile} from './learning-acceptance.mjs';
import {createTeacherTaskReviewHandler} from '../../supabase/functions/_shared/teacher-task-review-handler.mjs';
import {createTeacherTaskStudentHandler} from '../../supabase/functions/_shared/teacher-task-student-handler.mjs';
import {createTeacherTaskStudentFilesHandler} from '../../supabase/functions/_shared/teacher-task-student-files-handler.mjs';
export {id,context,token};
export {pdf,docxBytes} from './synthetic-task-documents.mjs';
import {pdf} from './synthetic-task-documents.mjs';
export const textDefinition={schemaVersion:'teacher-task-v1',title:'Class task',instructions:'Read and explain.',source:{kind:'text',text:'Classroom instructions'},response:{kind:'text'},assessment:{kind:'feedback'}};
export async function studentTaskFixture({review=false}={}){
 const f=await authoringFixture({delivery:true});await addLearner(f.db);await f.db.query("update classes set name='Դասարան' where id=$1",[id(321)]);await f.db.query("update subjects set name_hy='Առարկա' where id=(select subject_id from subject_programs where id=(select subject_program_id from institutional_class_enrollments where id=$1))",[id(371)]);await f.db.exec(readFileSync('supabase/migrations/20261030203408_teacher_task_student_work.sql','utf8'));
 if(review)await f.db.exec(readFileSync('supabase/migrations/20261030203409_teacher_task_review.sql','utf8'));
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);const options={createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture'}};
 const handleWork=createTeacherTaskStudentHandler(options),handleFiles=createTeacherTaskStudentFilesHandler(options);
 const request=(action,payload={},actor=10,scope=action==='inbox'?{}:context(0,false))=>handleWork(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor),'Content-Type':'application/json'},body:JSON.stringify({action,context:scope,payload})}));
 const fileRequest=(action,payload={},actor=10,scope=context(0,false),bytes=null)=>{let body={action,context:scope,payload};if(bytes){const form=new FormData();form.set('request',JSON.stringify(body));form.set('file',new Blob([bytes],{type:payload.format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'response.'+payload.format);body=form;}return handleFiles(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)}));};
 const send=async(definition=textDefinition,mode='class',enrollmentIds=[])=>{
  let r=await f.handleDraft(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(20),'Content-Type':'application/json'},body:JSON.stringify({action:'create',context:context(0,true),payload:{requestId:crypto.randomUUID(),definition}})}));if(r.status!==200)throw Error(await r.text());let draft=(await r.json()).draft;
  if(definition.source.kind==='pdf'){
   const body=new FormData();body.set('request',JSON.stringify({action:'upload',context:context(0,true),payload:{draftId:draft.id,requestId:crypto.randomUUID()}}));body.set('file',new Blob([pdf],{type:'application/pdf'}),'task.pdf');r=await f.handleSource(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(20)},body}));if(r.status!==200)throw Error(await r.text());const asset=await r.json();definition={...definition,source:{kind:'pdf',attachmentId:asset.id}};
   const saved=await f.admin.rpc('service_teacher_task_drafts',{p_actor:id(20),p_auth:id(420),p_action:'save',p_context:context(0,true),p_payload:{id:draft.id,expectedRevision:draft.revision,definition}});if(saved.error)throw Error(saved.error.message);draft=saved.data.draft;
  }
  const p=await f.admin.rpc('service_teacher_task_delivery',{p_actor:id(20),p_auth:id(420),p_action:'preview',p_context:context(0,true),p_payload:{id:draft.id}});if(p.error)throw Error(p.error.message);
  const sent=await f.admin.rpc('service_teacher_task_delivery',{p_actor:id(20),p_auth:id(420),p_action:'assign',p_context:context(0,true),p_payload:{id:draft.id,expectedRevision:draft.revision,definition,requestId:crypto.randomUUID(),rosterFingerprint:p.data.rosterFingerprint,mode,enrollmentIds}});if(sent.error)throw Error(sent.error.message);return sent.data.delivery;
 };
 return{...f,handleWork,handleFiles,request,fileRequest,send,handleReview:review?createTeacherTaskReviewHandler(options):null,handleReviewFiles:review?createTeacherTaskReviewHandler(options,{files:true}):null};
}
