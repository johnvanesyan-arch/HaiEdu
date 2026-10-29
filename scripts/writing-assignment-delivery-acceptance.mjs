import {readFile} from 'node:fs/promises';
const configuration=JSON.parse(await readFile(new URL('../docs/qa/additional-programme-fixtures.json',import.meta.url),'utf8'));
const same=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>b[k]===v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// Only delivery metadata may be created. Every mutation has a designated tuple,
// one exact selected learner, a source pinned by catalogue and a run-owned nonce.
export function createWritingDeliveryAcceptance({fixture,request,browserContext,check,report}){
 const tuples=new Map(),sources=new Map(),intents=new Map(),owned=new Map();
 const context=(actor)=>{const f=tuples.get(actor);return actor.endsWith('teacher')?{assignmentId:f.teacherAssignmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId}:{enrollmentId:f.enrollmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId};};
 async function api(actor,action,payload={},scope=context(actor),expected=200){const r=await request(actor,'/functions/v1/manage-writing-assignments',{action,context:scope,payload});check(actor+': writing '+action,r.status===expected,r.status);return r.data;}
 function readAllowed(actor,fn,body){return fn==='manage-written-work'&&actor.endsWith('student')&&tuples.has(actor)&&body.action==='open'&&same(body.context,context(actor))&&body.payload?.taskId===sources.get(actor.replace('_student','_teacher'))?.id;}
 async function mutation(actor,fn,body,route){
  if(fn!=='manage-writing-assignments'||body.action!=='assign'||!actor.endsWith('teacher')||!tuples.has(actor)||!same(body.context,context(actor)))return false;
  const f=tuples.get(actor),task=sources.get(actor),p=body.payload;
  if(!task||p?.taskId!==task.id||p.fingerprint!==task.fingerprint||p.mode!=='selected'||p.enrollmentIds?.length!==1||p.enrollmentIds[0]!==f.enrollmentId||p.instructions!==''||!uuid(p.requestId)||!/^[a-f0-9]{64}$/.test(p.rosterFingerprint??''))return false;
  const old=intents.get(actor);if(old&&JSON.stringify(old.payload)!==JSON.stringify(p))return false;
  if(!old)intents.set(actor,{actor,payload:structuredClone(p)});await route.continue();return true;
 }
 async function verify(){
  check('writing delivery fixtures are designated',configuration.dedicatedQa===true);
  report.writingDelivery=[];
  for(const side of ['A','B']){
   const teacher=side+'_teacher',student=side+'_student',other=(side==='A'?'B':'A')+'_student';
   const f=configuration.contexts.find(c=>c.side===side&&c.teacherId===fixture[side].teacherId&&c.studentId===fixture[side].studentId);
   check(side+': writing delivery tuple binds designated identities',Boolean(f&&uuid(f.teacherAssignmentId)&&uuid(f.enrollmentId)&&uuid(f.classId)));
   tuples.set(teacher,f);tuples.set(student,f);
   const catalogue=await api(teacher,'catalog');const task=catalogue.tasks[0];check(side+': approved task exists for writing delivery',Boolean(task?.available&&uuid(task.id)&&task.fingerprint));sources.set(teacher,task);
   const oldTasks=await request(student,'/functions/v1/manage-written-work',{action:'tasks',context:context(student),payload:{}});check(side+': writing state snapshot read',oldTasks.status===200&&Array.isArray(oldTasks.data?.tasks));
   const bc=await browserContext(teacher);try{
    const p=await bc.newPage(),errors=[];p.on('pageerror',()=>errors.push('browser exception'));
    const u=new URL('https://www.haiedu.am/teacher');for(const [k,v]of Object.entries({view:'assign-writing',class:f.classId,assignment:f.teacherAssignmentId,release:f.curriculumReleaseId,unit:f.unitId}))u.searchParams.set(k,v);
    await p.goto(u.href);await p.locator('[data-wa-task="'+task.id+'"]').waitFor({timeout:30000});check(side+': dedicated teacher assignment page visible',(await p.locator('#teacherPageTitle').innerText())==='Հանձնարարել գրավոր աշխատանք');
    await p.locator('[data-wa-task="'+task.id+'"]').click();await p.locator('.wa-rubric summary').click();check(side+': published prompt/rubric preview visible',(await p.locator('[data-wa-body]').innerText()).includes(task.definition.title));
    await p.locator('[data-wa-recipients]').click();await p.locator('[name=writingAudience][value=selected]').check();await p.locator('[data-wa-recipient="'+f.enrollmentId+'"]').check();check(side+': one designated recipient selected',(await p.locator('[data-wa-summary]').innerText()).includes('1'));
    await p.locator('[data-wa-send]').click();await p.waitForFunction(()=>document.querySelector('[data-wa-step]')?.textContent.includes('Հաստատում'),undefined,{timeout:30000});
    check(side+': send acknowledged by real teacher form',Boolean(intents.get(teacher))&&errors.length===0);if(side==='A')await p.screenshot({path:'qa-results/writing-assignment-teacher.png',fullPage:true});
   }finally{await bc.close();}
   const intent=intents.get(teacher),receipt=await api(teacher,'assign',intent.payload);check(side+': acknowledged replay creates no second delivery',receipt.replayed===true&&receipt.assignment.task.id===task.id&&receipt.assignment.recipientCount===1);owned.set(receipt.assignment.id,{actor:teacher,id:receipt.assignment.id,revision:receipt.assignment.revision,canceled:false});
   const inbox=await api(student,'inbox',{},{});check(side+': assigned writing appears in own inbox',inbox.assignments.some(a=>a.id===receipt.assignment.id&&a.task.id===task.id));
   const studentBc=await browserContext(student);try{const p=await studentBc.newPage(),errors=[];p.on('pageerror',()=>errors.push('browser exception'));await p.goto('https://www.haiedu.am/index.html?view=work');await p.locator('[data-wa-open="'+receipt.assignment.id+'"]').waitFor({timeout:30000});await p.locator('[data-wa-open="'+receipt.assignment.id+'"]').click();await p.locator('.written-work h3').filter({hasText:task.definition.title}).first().waitFor({timeout:30000});const u=new URL(p.url());check(side+': learner opens exact pinned task',u.searchParams.get('tab')==='writing'&&u.searchParams.get('writingTask')===task.id&&u.searchParams.get('enrollment')===f.enrollmentId&&u.searchParams.get('release')===f.curriculumReleaseId&&u.searchParams.get('unit')===f.unitId&&errors.length===0);if(side==='A')await p.screenshot({path:'qa-results/writing-assignment-student.png',fullPage:true});}finally{await studentBc.close();}
   const foreign=configuration.contexts.find(c=>c.side!==side&&c.curriculumReleaseId===f.curriculumReleaseId&&c.unitId===f.unitId);check(side+': foreign writing tuple exists',Boolean(foreign));
   await api(other,'open',{id:receipt.assignment.id},{enrollmentId:foreign.enrollmentId,curriculumReleaseId:foreign.curriculumReleaseId,unitId:foreign.unitId},404);
   const inspected=await api(teacher,'get',{id:receipt.assignment.id});check(side+': exact recipient receipt',inspected.recipients.length===1&&inspected.recipients[0].enrollmentId===f.enrollmentId);
   for(const actor of [teacher,student]){const privacy=await request(actor,'/functions/v1/get-my-privacy',{});check(actor+': writing delivery inventory visible',privacy.status===200&&Number(privacy.data?.dataInventory?.[actor===teacher?'writingAssignmentsSent':'writingAssignmentsReceived'])>=1);}
   await api(teacher,'cancel',{id:receipt.assignment.id,revision:1,reason:'Cleanup this run designated writing delivery'});owned.get(receipt.assignment.id).canceled=true;
   await api(student,'open',{id:receipt.assignment.id},context(student),404);check(side+': canceled delivery leaves current inbox',(await api(student,'inbox',{},{})).assignments.every(a=>a.id!==receipt.assignment.id));
   const after=await request(student,'/functions/v1/manage-written-work',{action:'tasks',context:context(student),payload:{}});check(side+': existing writing states and work IDs unchanged',after.status===200&&JSON.stringify(after.data.tasks)===JSON.stringify(oldTasks.data.tasks));
   report.writingDelivery.push({side,taskId:task.id,assignmentId:receipt.assignment.id,recipientCount:1,existingWritingUnchanged:true,productionLearnerMutations:false});
  }
 }
 async function cleanup(){for(const intent of intents.values())try{const r=await api(intent.actor,'assign',intent.payload);if(!owned.has(r.assignment.id))owned.set(r.assignment.id,{actor:intent.actor,id:r.assignment.id,revision:r.assignment.revision,canceled:r.assignment.status==='canceled'});}catch{report.status='failed';}for(const row of owned.values())if(!row.canceled)try{await api(row.actor,'cancel',{id:row.id,revision:row.revision,reason:'Cleanup this run designated writing delivery'});row.canceled=true;}catch{report.status='failed';}report.writingDeliveryCleanup=[...owned.values()].map(({id,canceled})=>({id,canceled}));}
 return{verify,cleanup,readAllowed,mutation};
}
