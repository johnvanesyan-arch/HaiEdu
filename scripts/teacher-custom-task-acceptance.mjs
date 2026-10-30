import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';

const configuration=JSON.parse(await readFile(new URL('../docs/qa/additional-programme-fixtures.json',import.meta.url),'utf8'));
const same=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>b[k]===v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>JSON.stringify(v,(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

export function matchesCustomTaskSend(body,{draft,scope,enrollmentId}){
 const p=body?.payload;
 return Boolean(draft&&body?.action==='assign'&&same(body.context,scope)
  &&same(Object.fromEntries(Object.keys(body).map(k=>[k,true])),{action:true,context:true,payload:true})
  &&p?.id===draft.id&&p.expectedRevision===draft.revision&&canonical(p.definition)===canonical(draft.definition)
  &&p.mode==='selected'&&p.enrollmentIds?.length===1&&p.enrollmentIds[0]===enrollmentId
  &&uuid(p.requestId)&&/^[a-f0-9]{64}$/.test(p.rosterFingerprint??'')
  &&Object.keys(p).length===7);
}

// Reviewed-main caller supplies ordinary designated QA sessions and the shared
// production mutex. Never submit learner work, publish a mark or erase an account.
export function createCustomTaskAcceptance({fixture,request,browserContext,check,report,prefix}){
 const tuples=new Map(),drafts=new Map(),sendIntents=new Map(),owned=new Map();
 const context=actor=>{
  const f=tuples.get(actor);
  return actor.endsWith('teacher')
   ?{assignmentId:f.teacherAssignmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId}
   :{enrollmentId:f.enrollmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId};
 };
 async function api(actor,endpoint,action,payload={},scope=context(actor),expected=200){
  const r=await request(actor,'/functions/v1/'+endpoint,{action,context:scope,payload});
  check(actor+': custom '+endpoint+'/'+action,r.status===expected,r.status);
  return r.data;
 }
 function readAllowed(actor,fn,body){
  if(!tuples.has(actor)||!same(body.context,context(actor)))return false;
  if(actor.endsWith('teacher')){
   if(fn==='manage-teacher-task-drafts')return body.action==='list'||body.action==='get'&&body.payload?.id===drafts.get(actor)?.id;
   if(fn==='manage-teacher-task-delivery')return body.action==='list'||['preview','get'].includes(body.action)&&body.payload?.id===drafts.get(actor)?.id;
   if(fn==='manage-teacher-task-review')return ['queue','deliveries'].includes(body.action);
   return fn==='manage-teacher-task-sources'&&body.action==='open'&&body.payload?.id===drafts.get(actor)?.definition.source.attachmentId;
  }
  return false;
 }
 async function mutation(actor,fn,body,route){
  const draft=drafts.get(actor);
  if(!actor.endsWith('teacher')||!draft||!same(body.context,context(actor)))return false;
  if(fn==='manage-teacher-task-drafts'&&body.action==='save'&&body.payload?.id===draft.id&&body.payload.expectedRevision===draft.revision&&canonical(body.payload.definition)===canonical(draft.definition)){
   const response=await route.fetch(),data=await response.json().catch(()=>null);
   if(response.ok()&&data?.draft?.id===draft.id)drafts.set(actor,data.draft);
   await route.fulfill({response});return true;
  }
  if(fn!=='manage-teacher-task-delivery'||body.action!=='assign')return false;
  const p=body.payload,f=tuples.get(actor);
  if(!matchesCustomTaskSend(body,{draft,scope:context(actor),enrollmentId:f.enrollmentId}))return false;
  const old=sendIntents.get(actor);
  if(old&&JSON.stringify(old.payload)!==JSON.stringify(p))return false;
  if(!old)sendIntents.set(actor,{actor,payload:structuredClone(p)});
  await route.continue();return true;
 }
 async function cancel(row){
  const payload=row.cancelPayload??={deliveryId:row.id,requestId:randomUUID(),reason:'Cleanup only this run designated custom delivery'};
  await api(row.actor,'manage-teacher-task-review','cancel',payload);
  row.cancelled=true;
 }
 async function verify(){
  check('custom task fixtures are explicitly dedicated',configuration.dedicatedQa===true);
  report.customTaskDelivery=[];
  for(const side of ['A','B']){
   const teacher=side+'_teacher',student=side+'_student',other=(side==='A'?'B':'A')+'_student';
   const f=configuration.contexts.find(c=>c.side===side&&c.teacherId===fixture[side].teacherId&&c.studentId===fixture[side].studentId);
   check(side+': custom task tuple binds designated identities',Boolean(f&&uuid(f.teacherAssignmentId)&&uuid(f.enrollmentId)&&uuid(f.classId)));
   tuples.set(teacher,f);tuples.set(student,f);
   const definition={schemaVersion:'teacher-task-v1',title:prefix+' custom '+side,
    instructions:'Synthetic delivery verification. Do not submit a response.',
    source:{kind:'pdf',attachmentId:null},response:{kind:'link'},assessment:{kind:'feedback'}};
   const creation={requestId:randomUUID(),definition};
   const created=await api(teacher,'manage-teacher-task-drafts','create',creation);
   const draft=created.draft;
   check(side+': created private draft is bound to this run',uuid(draft.id)&&draft.definition.title===definition.title);
   const repeated=await api(teacher,'manage-teacher-task-drafts','create',creation);
   check(side+': exact draft retry retains its identity',repeated.draft.id===draft.id);
   const form=new FormData();
   form.set('request',JSON.stringify({action:'upload',context:context(teacher),payload:{draftId:draft.id,requestId:randomUUID()}}));
   form.set('file',new Blob([pdf],{type:'application/pdf'}),'synthetic-custom-task.pdf');
   const uploaded=await request(teacher,'/functions/v1/manage-teacher-task-sources',form);
   check(side+': protected teacher PDF uploaded through actual Edge',uploaded.status===200&&uuid(uploaded.data?.id),uploaded.status);
   definition.source.attachmentId=uploaded.data.id;
   const saved=await api(teacher,'manage-teacher-task-drafts','save',{id:draft.id,expectedRevision:draft.revision,definition});
   drafts.set(teacher,saved.draft);
   check(side+': PDF source and link response remain independent',saved.draft.definition.source.kind==='pdf'&&saved.draft.definition.response.kind==='link');
   const bc=await browserContext(teacher);
   try{
    const p=await bc.newPage(),errors=[];p.on('pageerror',()=>errors.push('browser exception'));p.setDefaultTimeout(45000);
    const u=new URL('https://www.haiedu.am/teacher');
    for(const [k,v]of Object.entries({view:'assign-writing',class:f.classId,assignment:f.teacherAssignmentId,release:f.curriculumReleaseId,unit:f.unitId}))u.searchParams.set(k,v);
    await p.goto(u.href);await p.locator('[data-wa-custom]').click();
    await p.locator('[data-drafts-open="'+draft.id+'"]').click();await p.locator('[data-editor-prepare]').click();
    await p.locator('[name=customAudience][value=selected]').check();
    await p.locator('[data-send-recipient="'+f.enrollmentId+'"]').check();
    await p.locator('[data-send-confirm]').click();
    await p.locator('[data-send-body] h3').filter({hasText:'Ուղարկումը հաստատված է'}).waitFor();
    check(side+': actual teacher custom send receives acknowledgement',sendIntents.has(teacher)&&errors.length===0);
    await p.screenshot({path:'qa-results/custom-task-teacher-'+side+'.png',fullPage:true});
   }finally{await bc.close();}
   const intent=sendIntents.get(teacher),sent=await api(teacher,'manage-teacher-task-delivery','assign',intent.payload),delivery=sent.delivery;
   owned.set(delivery.id,{actor:teacher,id:delivery.id,cancelled:false});
   check(side+': lost/duplicate send replays one exact selected recipient',sent.replayed===true&&delivery.recipientCount===1&&delivery.recipients[0].enrollmentId===f.enrollmentId);
   const inbox=await api(student,'manage-teacher-task-student-work','inbox',{},{});
   check(side+': custom task reaches the designated student',inbox.assignments.some(a=>a.id===delivery.id));
   const own=await api(student,'manage-teacher-task-student-work','open',{id:delivery.id});
   check(side+': opening a task does not manufacture submitted work',own.work.revision===0&&own.work.submissions.length===0&&own.assignment.definition.response.kind==='link');
   const foreign=configuration.contexts.find(c=>c.side!==side&&c.curriculumReleaseId===f.curriculumReleaseId&&c.unitId===f.unitId);
   check(side+': matching other-school fixture exists',Boolean(foreign));
   await api(other,'manage-teacher-task-student-work','open',{id:delivery.id},{enrollmentId:foreign.enrollmentId,curriculumReleaseId:foreign.curriculumReleaseId,unitId:foreign.unitId},404);
   const sb=await browserContext(student);
   try{
    const p=await sb.newPage();p.setDefaultTimeout(45000);
    await p.goto('https://www.haiedu.am/index.html?view=work');
    const card=p.locator('[data-task-body] article').filter({hasText:definition.title});
    await card.locator('[data-task-open]').click();await p.locator('[data-task-url]').waitFor();
    check(side+': My work opens the PDF task with required link response',new URL(p.url()).searchParams.get('view')==='work'&&await p.locator('[data-task-source]').isVisible());
    const download=p.waitForEvent('download');await p.locator('[data-task-source]').click();const file=await download;
    check(side+': student receives exact protected source bytes',hash(await readFile(await file.path()))===hash(pdf));
    await p.screenshot({path:'qa-results/custom-task-student-'+side+'.png',fullPage:true});
   }finally{await sb.close();}
   const revised=await api(teacher,'manage-teacher-task-drafts','save',{id:draft.id,expectedRevision:drafts.get(teacher).revision,definition:{...definition,title:definition.title+' edited draft'}});
   check(side+': later draft editing leaves assigned source/version unchanged',revised.draft.revision>saved.draft.revision&&(await api(student,'manage-teacher-task-student-work','open',{id:delivery.id})).assignment.definition.title===definition.title);
   const queue=await api(teacher,'manage-teacher-task-review','queue',{state:'pending'});
   check(side+': unsubmitted tasks do not create teacher review work',Array.isArray(queue.entries)&&queue.entries.every(s=>s.deliveryId!==delivery.id));
   for(const actor of [teacher,student]){
    const privacy=await request(actor,'/functions/v1/get-my-privacy',{});
    check(actor+': task privacy inventory is available',privacy.status===200&&Boolean(privacy.data?.dataInventory?.teacherTasks));
   }
   await cancel(owned.get(delivery.id));
   const after=await api(student,'manage-teacher-task-student-work','open',{id:delivery.id});
   check(side+': cancellation preserves the exact read-only delivery',after.assignment.cancelled===true&&after.work.submissions.length===0);
   report.customTaskDelivery.push({side,draftId:draft.id,deliveryId:delivery.id,selectedRecipients:1,sourcePdfVerified:true,productionLearnerWrites:false,productionGrades:false});
  }
 }
 async function cleanup(){
  // Resolve the same recorded send after an unknown reply, never a new nonce.
  for(const intent of sendIntents.values())try{
   const r=await api(intent.actor,'manage-teacher-task-delivery','assign',intent.payload);
   if(!owned.has(r.delivery.id))owned.set(r.delivery.id,{actor:intent.actor,id:r.delivery.id,cancelled:false});
  }catch{report.status='failed';}
  for(const row of owned.values())if(!row.cancelled)try{await cancel(row);}catch{report.status='failed';}
  report.customTaskCleanup=[...owned.values()].map(({id,cancelled})=>({id,cancelled}));
  report.customTaskRetention='Run-owned deliveries cancelled; private teacher drafts, pinned PDF sources and immutable delivery audit retained under the normal retention contract.';
 }
 return{readAllowed,mutation,verify,cleanup};
}
