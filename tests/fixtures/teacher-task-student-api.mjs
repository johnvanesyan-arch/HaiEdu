import {addLearner} from './resource-assignments-db.mjs';
import {readFileSync} from 'node:fs';
import {deflateRawSync} from 'node:zlib';
import {authoringFixture,id,context,token} from './teacher-task-authoring-api.mjs';
import {compile} from './learning-acceptance.mjs';
import {createTeacherTaskReviewHandler} from '../../supabase/functions/_shared/teacher-task-review-handler.mjs';
import {createTeacherTaskStudentHandler} from '../../supabase/functions/_shared/teacher-task-student-handler.mjs';
import {createTeacherTaskStudentFilesHandler} from '../../supabase/functions/_shared/teacher-task-student-files-handler.mjs';
export {id,context,token};
export const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
export const textDefinition={schemaVersion:'teacher-task-v1',title:'Class task',instructions:'Read and explain.',source:{kind:'text',text:'Classroom instructions'},response:{kind:'text'},assessment:{kind:'feedback'}};
export function docxBytes(extra={}){
 const entries={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>','word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>A classroom answer.</w:t></w:r></w:p></w:body></w:document>',...extra};
 const chunks=[],central=[];let offset=0;
 for(const [name,value]of Object.entries(entries)){const n=Buffer.from(name),b=Buffer.from(value),data=deflateRawSync(b);let crc=0xffffffff;for(const v of b){crc^=v;for(let k=0;k<8;k++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}crc=(crc^0xffffffff)>>>0;
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt16LE(8,8);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(b.length,22);l.writeUInt16LE(n.length,26);chunks.push(l,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=l.length+n.length+data.length;
 }
 const c=Buffer.concat(central),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50);e.writeUInt16LE(Object.keys(entries).length,8);e.writeUInt16LE(Object.keys(entries).length,10);e.writeUInt32LE(c.length,12);e.writeUInt32LE(offset,16);return new Uint8Array(Buffer.concat([...chunks,c,e]));
}
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
