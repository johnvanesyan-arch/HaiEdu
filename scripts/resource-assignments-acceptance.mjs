import {createWritingDeliveryAcceptance} from './writing-assignment-delivery-acceptance.mjs';
import {createUsabilityReads} from './b123-usability-reads.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createHash,randomUUID} from 'node:crypto';
import {validateFixture,roles,sides,runIsolation} from './sprint-14-isolation.mjs';
import {waitForRelease} from './wait-for-production-release.mjs';
// Reviewed main only. Ordinary designated QA sessions; no service key or user impersonation.
// Only this run's newly created supplementary resources can be revised/withdrawn.
const fixture=JSON.parse(process.env.QA_TENANT_FIXTURES_JSON??'{}');
const credentials=Object.fromEntries(sides.flatMap(s=>roles.map(r=>[`${s}_${r}`,{email:process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_EMAIL`],password:process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_PASSWORD`]}])));
const config=await readFile(new URL('../web/config.js',import.meta.url),'utf8');
const url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
const report={scope:'16.5B.12.3 cross-role usability and recipient delivery verification',revision:process.env.GITHUB_SHA,startedAt:new Date().toISOString(),status:'running',checks:[],resources:[],fourSubjectGateClosed:false};
let browser;
const assigned=[],assignmentIntents=[];
const sessions=new Map(),created=[],intents=[],originals=new Set(),selectors=new Map();
const prefix=`B123-QA-${process.env.GITHUB_RUN_ID}-${randomUUID()}`;let stage='preflight';
const check=(label,ok,status)=>{report.checks.push({label,status:ok?'passed':'failed',...(status===undefined?{}:{httpStatus:status})});if(!ok)throw Error(label);};
async function request(actor,path,body){try{const r=await fetch(url+path,{method:'POST',redirect:'error',headers:{apikey:key,Authorization:'Bearer '+(sessions.get(actor)?.access_token??key),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body??{}),signal:AbortSignal.timeout(25000)});return{status:r.status,headers:r.headers,data:r.headers.get('content-type')?.startsWith('application/pdf')?new Uint8Array(await r.arrayBuffer()):await r.json().catch(()=>null)};}catch{return{status:0,data:null};}}
async function resource(actor,action,payload={},context=selectors.get(actor),predicate=r=>r.status===200,label=actor+': '+action){const r=await request(actor,'/functions/v1/manage-supplementary-resources',{action,context,payload});check(label,predicate(r),r.status);return r.data;}
async function assignment(actor,action,payload={},context=selectors.get(actor),predicate=r=>r.status===200,label=actor+': assignment '+action){const r=await request(actor,'/functions/v1/manage-resource-assignments',{action,context,payload});check(label,predicate(r),r.status);return r.data;}
const writingDelivery=createWritingDeliveryAcceptance({fixture,request,browserContext,check,report});
const usability=createUsabilityReads({fixture,roles,sides,request,browserContext,check,report});
async function browserContext(actor,materialId=null,creation=null){
 const owned=new Set(materialId?[materialId]:[]);let createStarted=false;
 const site='https://www.haiedu.am',session=sessions.get(actor);session.expires_at??=Math.floor(Date.now()/1000)+Number(session.expires_in);
 const bc=await browser.newContext({viewport:{width:actor.endsWith('student')?360:1280,height:960},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:site,localStorage:[{name:'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',value:JSON.stringify(session)}]}]}});
 await bc.route('**/functions/v1/**',async route=>{
  const req=route.request(),fn=new URL(req.url()).pathname.split('/').pop();let body={},file=null;try{if(req.headers()['content-type']?.startsWith('multipart/')){const form=await new Request('https://fixture.invalid',{method:'POST',headers:req.headers(),body:req.postDataBuffer()}).formData();body=JSON.parse(form.get('request'));file=form.get('file');}else body=req.postDataJSON()??{};}catch{}
  if(req.method()==='OPTIONS')return route.continue();
  const read=writingDelivery.readAllowed(actor,fn,body)||usability.allowed(actor,fn,body)||['get-student-classes','get-student-dashboard','get-teacher-dashboard','get-teacher-workspace','get-teacher-academic-context'].includes(fn)
   ||(fn==='manage-teacher-feedback'&&['open','snippets'].includes(body.action))
   ||(fn==='manage-supplementary-resources'&&['contexts','list','get'].includes(body.action))
   ||(fn==='manage-writing-assignments'&&['catalog','preview','list','inbox','get','open'].includes(body.action))
   ||(fn==='manage-resource-assignments'&&['catalog','preview','list','inbox','get','open'].includes(body.action));
  if(read)return route.continue();
  const exactContext=Object.entries(selectors.get(actor)).every(([k,v])=>body.context?.[k]===v)&&Object.keys(body.context??{}).length===3;
  if(creation&&actor.endsWith('teacher')&&exactContext&&fn==='manage-supplementary-resources'){
   const d=body.payload?.definition;
   const create=body.action==='create'&&!createStarted&&d?.title===creation.title&&d.format==='pdf'&&d.sourceReference===creation.sourceReference&&d.rightsConfirmed===true&&d.assessmentSafe===true;
   const follow=owned.has(body.payload?.id)&&['upload','qa','publish'].includes(body.action);
   const validFile=body.action!=='upload'||(file instanceof Blob&&file.size===pdf.length&&createHash('sha256').update(new Uint8Array(await file.arrayBuffer())).digest('hex')===createHash('sha256').update(pdf).digest('hex'));
   if((create||follow)&&validFile){
    if(create)createStarted=true;
    const response=await route.fetch();const data=await response.json().catch(()=>null),m=data?.material;
    if(create&&response.ok()&&m){
     check('browser-created resource is owned by this run',!originals.has(m.resourceId)&&m.definition.title===creation.title);
     owned.add(m.id);created.push({actor,resourceId:m.resourceId,id:m.id,withdrawn:false});report.resources.push({resourceId:m.resourceId});
     check(actor+': browser-created draft is hidden',(await all(actor.replace('_teacher','_student'))).every(x=>x.resourceId!==m.resourceId));
    }
    return route.fulfill({response});
   }
  }
  if(fn==='manage-resource-assignments'&&body.action==='assign'&&actor.endsWith('teacher')&&owned.has(body.payload?.materialId)&&body.payload.mode==='class'&&body.payload.enrollmentIds?.length===0&&Object.entries(selectors.get(actor)).every(([k,v])=>body.context?.[k]===v)&&Object.keys(body.context??{}).length===3){
   assignmentIntents.push({actor,payload:body.payload});return route.continue();
  }
  if(await writingDelivery.mutation(actor,fn,body,route))return;
  report.checks.push({label:'unexpected browser mutation blocked',status:'failed'});return route.abort();
 });
 return bc;
}
async function teacherCreateAndSend(actor,d){
 const bc=await browserContext(actor,null,d);try{
  const page=await bc.newPage();page.setDefaultTimeout(45000);const c=selectors.get(actor),params=new URLSearchParams({view:'class',class:fixture[actor[0]].classId,assignment:c.assignmentId,release:c.curriculumReleaseId,unit:c.unitId});
  const teacherUrl='https://www.haiedu.am/teacher.html?'+params;
  await page.goto(teacherUrl,{waitUntil:'domcontentloaded'});
  await page.locator('#teacherResourcesLink').waitFor();
  const libraryUrl=new URL(await page.locator('#teacherResourcesLink').getAttribute('href'),page.url()),assignUrl=new URL(await page.locator('#teacherAssignResourceLink').getAttribute('href'),page.url());
  check(actor+': separate library and assignment entry points retain exact context',[libraryUrl,assignUrl].every(u=>u.searchParams.get('assignment')===c.assignmentId&&u.searchParams.get('release')===c.curriculumReleaseId&&u.searchParams.get('unit')===c.unitId)&&!libraryUrl.searchParams.has('intent')&&assignUrl.searchParams.get('intent')==='assign'&&await page.locator('#teacherWrittenWorkCard #teacherResourcesLink').count()===0);
  if(actor==='A_teacher'){await mkdir('qa-results/resource-form',{recursive:true});await page.locator('#teacherWorkflowEntries').screenshot({path:'qa-results/resource-form/teacher-workflow-entrypoints.png'});}
  await page.locator('#teacherResourcesLink').click();
  await page.locator('[data-resource-new]').click();
  check(actor+': PDF attachment is visible before creating a draft',await page.locator('[data-resource-file]').isVisible()&&await page.locator('[name=format]').inputValue()==='pdf');
  await page.locator('[data-resource-file]').setInputFiles({name:'synthetic-qa.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
  await page.waitForFunction(()=>document.querySelector('[data-resource-file-status]')?.textContent.includes('պատրաստ'));
  check(actor+': filename fills editable title',await page.locator('[name=title]').inputValue()==='synthetic qa');
  await page.locator('[name=title]').fill(d.title);await page.locator('[name=sourceReference]').fill(d.sourceReference);
  await page.locator('[name=rightsConfirmed]').check();await page.locator('[name=assessmentSafe]').check();
  if(actor==='A_teacher'){await mkdir('qa-results/resource-form',{recursive:true});await page.screenshot({path:'qa-results/resource-form/teacher-pdf-first.png',fullPage:true});}
  await page.locator('[data-resource-publish-library]').click();await page.waitForFunction(()=>document.querySelector('[data-resource-compose-status]')?.textContent.includes('Առաջադրանք չի ուղարկվել'));
  check(actor+': optional library publication has no recipient composer',await page.locator('[data-assignment-send]').count()===0);
  const own=created.find(x=>x.actor===actor);check(actor+': browser creation has a recorded receipt',Boolean(own));
  const saved=await resource(actor,'get',{id:own.id}),m=saved.material;
  check(actor+': browser upload QA and publication succeeded',m.status==='published'&&m.qa?.passed&&m.fileBytes===pdf.length);
  const events=saved.events.map(e=>e.event);check(actor+': create attach QA publish audit is complete',['created','file_attached','qa','published'].every(x=>events.includes(x)));
  check(actor+': optional publication is visible in library',(await all(actor.replace('_teacher','_student'))).some(x=>x.id===m.id));
  await page.locator('[data-resource-student-preview]:visible').click();await page.locator('.learner-preview-dialog[open]').waitFor();check(actor+': published material preview has inert learner action',await page.locator('.learner-preview-dialog [data-preview-only]').isDisabled()&&await page.locator('.learner-preview-dialog [data-resource-open],.learner-preview-dialog [data-resource-edit]').count()===0);await page.keyboard.press('Escape');
  const beforeInbox=(await assignment(actor.replace('_teacher','_student'),'inbox',{},{})).assignments;
  check(actor+': optional publication does not create a My-work task',beforeInbox.every(a=>a.material.id!==m.id));
  await page.goto(teacherUrl,{waitUntil:'domcontentloaded'});await page.locator('#teacherAssignResourceLink').click();
  await page.locator('[data-resource-assign="'+m.id+'"]').click();await page.locator('[data-assignment-send]').waitFor();
  check(actor+': assignment entry point retains its distinct purpose',new URL(page.url()).searchParams.get('intent')==='assign');
  await page.locator('[data-assignment-instructions]').fill(prefix+' · Synthetic class delivery');
  await page.locator('[data-assignment-student-preview]>summary').click();check(actor+': assignment preview uses current instructions and no learner action',await page.locator('[data-assignment-student-card] .assignment-instructions').innerText()===prefix+' · Synthetic class delivery'&&await page.locator('[data-assignment-student-card] [data-preview-only]').isDisabled()&&await page.locator('[data-assignment-student-card] [data-assignment-open]').count()===0);check(actor+': preview does not send a task',(await assignment(actor.replace('_teacher','_student'),'inbox',{},{})).assignments.every(a=>a.material.id!==m.id));
  await page.locator('[data-assignment-send]').click();await page.locator('.assignment-receipt-id').waitFor();
  const id=(await page.locator('.assignment-receipt-id').innerText()).trim();
  const a=(await assignment(actor,'get',{id})).assignment;assigned.push({actor,id,revision:a.revision,canceled:false});
  check(actor+': browser class assignment has durable receipt',a.material.id===m.id&&a.recipientCount>0&&a.recipientMode==='class');
  return {material:m,assignment:a};
 }finally{await bc.close();}
}
async function learnerWork(actor,ids){
 const bc=await browserContext(actor);try{
  const page=await bc.newPage();page.setDefaultTimeout(45000);
  await page.goto('https://www.haiedu.am/index.html?view=work',{waitUntil:'domcontentloaded'});
  for(const id of ids)await page.locator('[data-assignment-open="'+id+'"]').waitFor();
  check(actor+': actual My work receives both class and selected tasks',new URL(page.url()).searchParams.get('view')==='work');
  const download=page.waitForEvent('download');await page.locator('[data-assignment-open="'+ids[0]+'"]').click();const file=await download;check(actor+': browser downloads the exact assigned PDF',file.suggestedFilename().startsWith('haiedu-assignment-')&&createHash('sha256').update(await readFile(await file.path())).digest('hex')===createHash('sha256').update(pdf).digest('hex'));
 }finally{await bc.close();}
}
async function all(actor){const rows=[];for(let offset=0;offset<100000;){const r=await resource(actor,'list',{offset});rows.push(...r.materials);if(!r.hasMore)break;check('list pagination advances',r.materials.length>0);offset+=r.materials.length;}return rows;}
const version=m=>({id:m.id,fingerprint:m.fingerprint});
const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
try{
 check('reviewed main and complete dedicated fixtures',process.env.GITHUB_REF==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(report.revision??'')&&validateFixture(fixture,credentials).length===0&&Boolean(url&&key));
 await waitForRelease({expectedCommit:report.revision});
 report.frontend=[];
 for(const path of ['writing-assignments.mjs','writing-assignments.css','resource-learner-view.mjs','resource-file-input.mjs','resource-assignments.mjs','resource-assignments.css','supplementary-resources.css','supplementary-resources.mjs','multi-subject-home.js','index.html','resource-library.html','privacy.js','student-courses.js','role-layout.js','teacher.html','teacher.js','teacher.css','materials.html','course-page.js','teacher-workflows.html','teacher-workflows.css','ux.css','teacher-dependencies.bundle.mjs','teacher-startup.bundle.mjs','teacher-review.mjs','written-work.mjs','written-work.css','privacy.html','ux.js','student-surfaces.css','school-admin.html','school-teacher.html']){
  const expected=await readFile(new URL('../web/'+path,import.meta.url)),response=await fetch('https://www.haiedu.am/'+path+'?source_probe='+report.revision,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  const actual=Buffer.from(await response.arrayBuffer()),digest=b=>createHash('sha256').update(b).digest('hex');
  check('production source parity: '+path,response.ok&&new URL(response.url).origin==='https://www.haiedu.am'&&digest(actual)===digest(expected));
  report.frontend.push({path,sha256:digest(actual)});
 }
 browser=await chromium.launch({headless:true});
 report.isolationBefore=await runIsolation({fixture,credentials,url,key,revision:report.revision});check('existing tenant isolation before new resources',report.isolationBefore.status==='passed');
 for(const side of sides)for(const role of roles){const actor=side+'_'+role,r=await request(null,'/auth/v1/token?grant_type=password',credentials[actor]);check(actor+': fixture login',r.status===200&&r.data?.user?.id===fixture[side][role+'Id'],r.status);sessions.set(actor,r.data);
  if(role==='admin')continue; // Account-only acceptance; no resource or roster mutation.
  const navigation=await resource(actor,'contexts',{},{});const expected=fixture[side],c=navigation.contexts.find(c=>c.curriculumReleaseId===expected.curriculumReleaseId&&c.unitId===expected.unitId&&(role==='teacher'?c.assignmentId===expected.assignmentId:c.classId===expected.classId));check(actor+': exact current fixture context',Boolean(c));selectors.set(actor,{curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId,...(role==='teacher'?{assignmentId:c.assignmentId}:{enrollmentId:c.enrollmentId})});
  for(const m of await all(actor))originals.add(m.resourceId);
 }
 stage='teacher publication';
 for(const side of sides){const actor=side+'_teacher',student=side+'_student',other=(side==='A'?'B':'A')+'_student';const d={title:prefix+'-'+side,description:'Synthetic QA fixture only. Optional resource delivery verification.',goal:'Verify optional resource delivery',topic:'Synthetic QA',purpose:'reading',format:'pdf',locale:'en',sourceReference:'Original synthetic QA fixture generated by this reviewed workflow',rightsConfirmed:true,assessmentSafe:true,recommended:true,estimatedMinutes:1};
  intents.push({actor,title:d.title});const flow=await teacherCreateAndSend(actor,d);let m=flow.material;const classAssignment=flow.assignment;
  check(side+': own learner sees teacher resource',(await all(student)).some(x=>x.id===m.id&&x.provider==='teacher'));
  check(side+': other school list excludes resource',(await all(other)).every(x=>x.resourceId!==m.resourceId));
  await resource(other,'open',{id:m.id},selectors.get(other),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': other-school direct open denied');
  const delivered=await request(student,'/functions/v1/manage-supplementary-resources',{action:'open',context:selectors.get(student),payload:{id:m.id}});
  check(side+': authorized PDF bytes and attachment headers',delivered.status===200&&delivered.data instanceof Uint8Array&&createHash('sha256').update(delivered.data).digest('hex')===createHash('sha256').update(pdf).digest('hex')&&delivered.headers.get('cache-control')==='no-store'&&delivered.headers.get('content-disposition')?.startsWith('attachment'),delivered.status);
  stage=side+': class and selected delivery';
  const preview=await assignment(actor,'preview',{materialId:m.id});
  check(side+': designated learner is in current eligible roster',preview.roster.some(r=>r.enrollmentId===selectors.get(student).enrollmentId));
  const payload={materialId:m.id,fingerprint:m.fingerprint,rosterFingerprint:preview.rosterFingerprint,requestId:randomUUID(),mode:'selected',enrollmentIds:[selectors.get(student).enrollmentId],instructions:prefix+' · Synthetic selected delivery'};
  assignmentIntents.push({actor,payload});const selected=(await assignment(actor,'assign',payload)).assignment;assigned.push({actor,id:selected.id,revision:selected.revision,canceled:false});
  const replay=await assignment(actor,'assign',payload);check(side+': request retry returns the same receipt',replay.replayed&&replay.assignment.id===selected.id);
  const inbox=await assignment(student,'inbox',{},{});check(side+': My work API contains both exact assignments', [classAssignment.id,selected.id].every(id=>inbox.assignments.some(a=>a.id===id)));
  await assignment(other,'open',{id:selected.id},selectors.get(other),r=>r.status===404,side+': foreign learner cannot open selected assignment');
  await learnerWork(student,[classAssignment.id,selected.id]);
  for(const account of [actor,student]){
   const privacy=await request(account,'/functions/v1/get-my-privacy',{});
   check(account+': role-specific assignment inventory',privacy.status===200&&Number(privacy.data?.dataInventory?.[account===actor?'materialAssignmentsSent':'materialAssignmentsReceived'])>=2);
  }
  await assignment(actor,'cancel',{id:classAssignment.id,revision:1,reason:'Synthetic cancellation verification'});assigned.find(x=>x.id===classAssignment.id).canceled=true;
  await assignment(student,'open',{id:classAssignment.id},selectors.get(student),r=>r.status===404,side+': canceled class assignment cannot open');
  const nd={...m.definition,format:'link',url:'https://example.org/'};const old=m;m=(await resource(actor,'revise',{...version(m),definition:nd,reason:'Synthetic version replacement verification'})).material;
  check(side+': prior publication survives new draft',(await all(student)).some(x=>x.id===old.id));await resource(actor,'qa',version(m));m=(await resource(actor,'publish',version(m))).material;
  await resource(student,'open',{id:old.id},selectors.get(student),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': superseded download denied');
  const pinned=await request(student,'/functions/v1/manage-resource-assignments',{action:'open',context:selectors.get(student),payload:{id:selected.id}});check(side+': assigned PDF remains pinned after replacement',pinned.status===200&&pinned.data instanceof Uint8Array&&createHash('sha256').update(pinned.data).digest('hex')===createHash('sha256').update(pdf).digest('hex'));
  const external=await resource(student,'open',{id:m.id});check(side+': revised external destination verified',external.url===nd.url);
  await resource(actor,'withdraw',{...version(m),reason:'End synthetic acceptance; withdraw only this run resource'});created.find(x=>x.resourceId===m.resourceId).withdrawn=true;
  await resource(student,'open',{id:m.id},selectors.get(student),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': withdrawn delivery denied');
  await assignment(student,'open',{id:selected.id},selectors.get(student),r=>r.status===404,side+': withdrawn logical resource revokes assigned version');
  check(side+': withdrawn material absent',(await all(student)).every(x=>x.resourceId!==m.resourceId));
 }
 stage='writing assignment delivery';await writingDelivery.verify();
 stage='cross-role reading';await usability.verify();
 stage='postflight';report.isolationAfter=await runIsolation({fixture,credentials,url,key,revision:report.revision});check('existing tenant isolation preserved',report.isolationAfter.status==='passed');report.status='passed';
}catch{report.status='failed';report.failedStage=stage;}
finally{
 await browser?.close();
 await writingDelivery.cleanup();
 // Recover only exact unique run titles if an upload/create response was ambiguous.
 for(const intent of intents)try{for(const m of await all(intent.actor))if(m.definition.title===intent.title&&!originals.has(m.resourceId)&&!created.some(x=>x.resourceId===m.resourceId))created.push({actor:intent.actor,resourceId:m.resourceId,id:m.id,withdrawn:false});}catch{report.status='failed';}
 // Resolve only recorded run-owned request identities before cleanup, including lost responses.
 for(const intent of assignmentIntents)try{
  const a=(await assignment(intent.actor,'assign',intent.payload)).assignment;
  if(!assigned.some(x=>x.id===a.id))assigned.push({actor:intent.actor,id:a.id,revision:a.revision,canceled:a.status==='canceled'});
 }catch{report.status='failed';}
 for(const entry of assigned.filter(x=>!x.canceled))try{
  await assignment(entry.actor,'cancel',{id:entry.id,revision:entry.revision,reason:'Cleanup only this run synthetic assignment'});entry.canceled=true;
 }catch{report.status='failed';}
 report.assignmentCleanup=assigned.map(({id,canceled})=>({id,canceled}));
 for(const entry of created.filter(e=>!e.withdrawn))try{check('cleanup ownership is this run only',!originals.has(entry.resourceId));const m=(await all(entry.actor)).find(m=>m.resourceId===entry.resourceId);if(m&&m.status!=='withdrawn')await resource(entry.actor,'withdraw',{...version(m),reason:'Cleanup this run synthetic acceptance resource'});entry.withdrawn=true;}catch{report.status='failed';}
 report.sessionCleanup=[];
 for(const [actor]of sessions){const r=await request(actor,'/auth/v1/logout?scope=local',{}),closed=r.status===204||r.status===200;report.sessionCleanup.push({actor,httpStatus:r.status,closed});if(!closed)report.status='failed';}
 report.cleanup=created.map(({resourceId,withdrawn})=>({resourceId,withdrawn}));report.completedAt=new Date().toISOString();await mkdir('qa-results',{recursive:true});await writeFile('qa-results/resource-assignments.json',JSON.stringify(report,null,2),{mode:0o600});console.log(`Resource assignment acceptance: ${report.status}; ${report.checks.filter(x=>x.status==='passed').length}/${report.checks.length} checks.`);console.log('RESOURCE_ASSIGNMENT_EVIDENCE='+JSON.stringify(report));if(report.status!=='passed')process.exitCode=1;
}
