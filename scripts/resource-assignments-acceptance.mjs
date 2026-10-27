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
const report={scope:'16.5B.8 material assignments and My work delivery',revision:process.env.GITHUB_SHA,startedAt:new Date().toISOString(),status:'running',checks:[],resources:[],fourSubjectGateClosed:false};
let browser;
const assigned=[],assignmentIntents=[];
const sessions=new Map(),created=[],intents=[],originals=new Set(),selectors=new Map();
const prefix=`B8-QA-${process.env.GITHUB_RUN_ID}-${randomUUID()}`;let stage='preflight';
const check=(label,ok,status)=>{report.checks.push({label,status:ok?'passed':'failed',...(status===undefined?{}:{httpStatus:status})});if(!ok)throw Error(label);};
async function request(actor,path,body){try{const r=await fetch(url+path,{method:'POST',redirect:'error',headers:{apikey:key,Authorization:'Bearer '+(sessions.get(actor)?.access_token??key),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body??{}),signal:AbortSignal.timeout(25000)});return{status:r.status,headers:r.headers,data:r.headers.get('content-type')?.startsWith('application/pdf')?new Uint8Array(await r.arrayBuffer()):await r.json().catch(()=>null)};}catch{return{status:0,data:null};}}
async function resource(actor,action,payload={},context=selectors.get(actor),predicate=r=>r.status===200,label=actor+': '+action){const r=await request(actor,'/functions/v1/manage-supplementary-resources',{action,context,payload});check(label,predicate(r),r.status);return r.data;}
async function assignment(actor,action,payload={},context=selectors.get(actor),predicate=r=>r.status===200,label=actor+': assignment '+action){const r=await request(actor,'/functions/v1/manage-resource-assignments',{action,context,payload});check(label,predicate(r),r.status);return r.data;}
async function browserContext(actor,materialId=null){
 const site='https://www.haiedu.am',session=sessions.get(actor);session.expires_at??=Math.floor(Date.now()/1000)+Number(session.expires_in);
 const bc=await browser.newContext({viewport:{width:actor.endsWith('student')?360:1280,height:960},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:site,localStorage:[{name:'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',value:JSON.stringify(session)}]}]}});
 await bc.route('**/functions/v1/**',route=>{
  const req=route.request(),fn=new URL(req.url()).pathname.split('/').pop();let body={};try{body=req.postDataJSON()??{};}catch{}
  if(req.method()==='OPTIONS')return route.continue();
  const read=['get-profile','get-student-classes','get-student-dashboard'].includes(fn)
   ||(fn==='manage-supplementary-resources'&&['contexts','list','get'].includes(body.action))
   ||(fn==='manage-resource-assignments'&&['catalog','preview','list','inbox','get','open'].includes(body.action));
  if(read)return route.continue();
  if(fn==='manage-resource-assignments'&&body.action==='assign'&&actor.endsWith('teacher')&&body.payload?.materialId===materialId&&body.payload.mode==='class'&&body.payload.enrollmentIds?.length===0&&Object.entries(selectors.get(actor)).every(([k,v])=>body.context?.[k]===v)&&Object.keys(body.context??{}).length===3){
   assignmentIntents.push({actor,payload:body.payload});return route.continue();
  }
  report.checks.push({label:'unexpected browser mutation blocked',status:'failed'});return route.abort();
 });
 return bc;
}
async function teacherSend(actor,m){
 const bc=await browserContext(actor,m.id);try{
  const page=await bc.newPage();page.setDefaultTimeout(45000);const c=selectors.get(actor),params=new URLSearchParams({assignment:c.assignmentId,release:c.curriculumReleaseId,unit:c.unitId});
  await page.goto('https://www.haiedu.am/resource-library.html?'+params,{waitUntil:'domcontentloaded'});
  await page.locator('[data-resource-assign="'+m.id+'"]').first().click();
  await page.locator('[data-assignment-instructions]').fill(prefix+' · Synthetic class delivery');
  await page.locator('[data-assignment-send]').click();await page.locator('.assignment-receipt-id').waitFor();
  const id=(await page.locator('.assignment-receipt-id').innerText()).trim();
  const a=(await assignment(actor,'get',{id})).assignment;assigned.push({actor,id,revision:a.revision,canceled:false});
  check(actor+': browser class assignment has durable receipt',a.material.id===m.id&&a.recipientCount>0&&a.recipientMode==='class');
  return a;
 }finally{await bc.close();}
}
async function learnerWork(actor,ids){
 const bc=await browserContext(actor);try{
  const page=await bc.newPage();page.setDefaultTimeout(45000);
  await page.goto('https://www.haiedu.am/index.html?view=work',{waitUntil:'domcontentloaded'});
  for(const id of ids)await page.locator('[data-assignment-open="'+id+'"]').waitFor();
  check(actor+': actual My work receives both class and selected tasks',new URL(page.url()).searchParams.get('view')==='work');
  const download=page.waitForEvent('download');await page.locator('[data-assignment-open="'+ids[0]+'"]').click();const file=await download;check(actor+': browser downloads the assigned PDF',file.suggestedFilename().startsWith('haiedu-assignment-'));
 }finally{await bc.close();}
}
async function all(actor){const rows=[];for(let offset=0;offset<100000;){const r=await resource(actor,'list',{offset});rows.push(...r.materials);if(!r.hasMore)break;check('list pagination advances',r.materials.length>0);offset+=r.materials.length;}return rows;}
const version=m=>({id:m.id,fingerprint:m.fingerprint});
const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
try{
 check('reviewed main and complete dedicated fixtures',process.env.GITHUB_REF==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(report.revision??'')&&validateFixture(fixture,credentials).length===0&&Boolean(url&&key));
 await waitForRelease({expectedCommit:report.revision});
 browser=await chromium.launch({headless:true});
 report.isolationBefore=await runIsolation({fixture,credentials,url,key,revision:report.revision});check('existing tenant isolation before new resources',report.isolationBefore.status==='passed');
 for(const side of sides)for(const role of ['teacher','student']){const actor=side+'_'+role,r=await request(null,'/auth/v1/token?grant_type=password',credentials[actor]);check(actor+': fixture login',r.status===200&&r.data?.user?.id===fixture[side][role+'Id'],r.status);sessions.set(actor,r.data);
  const navigation=await resource(actor,'contexts',{},{});const expected=fixture[side],c=navigation.contexts.find(c=>c.curriculumReleaseId===expected.curriculumReleaseId&&c.unitId===expected.unitId&&(role==='teacher'?c.assignmentId===expected.assignmentId:c.classId===expected.classId));check(actor+': exact current fixture context',Boolean(c));selectors.set(actor,{curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId,...(role==='teacher'?{assignmentId:c.assignmentId}:{enrollmentId:c.enrollmentId})});
  for(const m of await all(actor))originals.add(m.resourceId);
 }
 stage='teacher publication';
 for(const side of sides){const actor=side+'_teacher',student=side+'_student',other=(side==='A'?'B':'A')+'_student';const d={title:prefix+'-'+side,description:'Synthetic QA fixture only. Optional resource delivery verification.',goal:'Verify optional resource delivery',topic:'Synthetic QA',purpose:'reading',format:'pdf',locale:'en',sourceReference:'Original synthetic QA fixture generated by this reviewed workflow',rightsConfirmed:true,assessmentSafe:true,recommended:true,estimatedMinutes:1};
  intents.push({actor,title:d.title});let m=(await resource(actor,'create',{definition:d})).material;check('new logical resource is not an existing resource',!originals.has(m.resourceId));created.push({actor,resourceId:m.resourceId,id:m.id,withdrawn:false});report.resources.push({resourceId:m.resourceId});
  check(side+': draft is hidden',(await all(student)).every(x=>x.resourceId!==m.resourceId));
  const form=new FormData();form.append('request',JSON.stringify({action:'upload',context:selectors.get(actor),payload:version(m)}));form.append('file',new Blob([pdf],{type:'application/pdf'}),'synthetic-qa.pdf');const up=await request(actor,'/functions/v1/manage-supplementary-resources',form);check(side+': private PDF upload',up.status===200,up.status);m=up.data.material;
  m=(await resource(actor,'qa',version(m))).material;check(side+': exact-file QA passes',m.qa?.passed===true);m=(await resource(actor,'publish',version(m))).material;
  check(side+': own learner sees teacher resource',(await all(student)).some(x=>x.id===m.id&&x.provider==='teacher'&&x.definition.recommended===true));
  check(side+': other school list excludes resource',(await all(other)).every(x=>x.resourceId!==m.resourceId));
  await resource(other,'open',{id:m.id},selectors.get(other),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': other-school direct open denied');
  const delivered=await request(student,'/functions/v1/manage-supplementary-resources',{action:'open',context:selectors.get(student),payload:{id:m.id}});
  check(side+': authorized PDF bytes and attachment headers',delivered.status===200&&delivered.data instanceof Uint8Array&&createHash('sha256').update(delivered.data).digest('hex')===createHash('sha256').update(pdf).digest('hex')&&delivered.headers.get('cache-control')==='no-store'&&delivered.headers.get('content-disposition')?.startsWith('attachment'),delivered.status);
  stage=side+': class and selected delivery';
  const classAssignment=await teacherSend(actor,m);
  const preview=await assignment(actor,'preview',{materialId:m.id});
  check(side+': designated learner is in current eligible roster',preview.roster.some(r=>r.enrollmentId===selectors.get(student).enrollmentId));
  const payload={materialId:m.id,fingerprint:m.fingerprint,rosterFingerprint:preview.rosterFingerprint,requestId:randomUUID(),mode:'selected',enrollmentIds:[selectors.get(student).enrollmentId],instructions:prefix+' · Synthetic selected delivery'};
  assignmentIntents.push({actor,payload});const selected=(await assignment(actor,'assign',payload)).assignment;assigned.push({actor,id:selected.id,revision:selected.revision,canceled:false});
  const replay=await assignment(actor,'assign',payload);check(side+': request retry returns the same receipt',replay.replayed&&replay.assignment.id===selected.id);
  const inbox=await assignment(student,'inbox',{},{});check(side+': My work API contains both exact assignments', [classAssignment.id,selected.id].every(id=>inbox.assignments.some(a=>a.id===id)));
  await assignment(other,'open',{id:selected.id},selectors.get(other),r=>r.status===404,side+': foreign learner cannot open selected assignment');
  await learnerWork(student,[classAssignment.id,selected.id]);
  await assignment(actor,'cancel',{id:classAssignment.id,revision:1,reason:'Synthetic cancellation verification'});assigned.find(x=>x.id===classAssignment.id).canceled=true;
  await assignment(student,'open',{id:classAssignment.id},selectors.get(student),r=>r.status===404,side+': canceled class assignment cannot open');
  const nd={...d,format:'link',url:'https://example.org/'};const old=m;m=(await resource(actor,'revise',{...version(m),definition:nd,reason:'Synthetic version replacement verification'})).material;
  check(side+': prior publication survives new draft',(await all(student)).some(x=>x.id===old.id));await resource(actor,'qa',version(m));m=(await resource(actor,'publish',version(m))).material;
  await resource(student,'open',{id:old.id},selectors.get(student),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': superseded download denied');
  const pinned=await request(student,'/functions/v1/manage-resource-assignments',{action:'open',context:selectors.get(student),payload:{id:selected.id}});check(side+': assigned PDF remains pinned after replacement',pinned.status===200&&pinned.data instanceof Uint8Array&&createHash('sha256').update(pinned.data).digest('hex')===createHash('sha256').update(pdf).digest('hex'));
  const external=await resource(student,'open',{id:m.id});check(side+': revised external destination verified',external.url===nd.url);
  await resource(actor,'withdraw',{...version(m),reason:'End synthetic acceptance; withdraw only this run resource'});created.find(x=>x.resourceId===m.resourceId).withdrawn=true;
  await resource(student,'open',{id:m.id},selectors.get(student),r=>r.status===404&&r.data?.error==='resource_unavailable',side+': withdrawn delivery denied');
  await assignment(student,'open',{id:selected.id},selectors.get(student),r=>r.status===404,side+': withdrawn logical resource revokes assigned version');
  check(side+': withdrawn material absent',(await all(student)).every(x=>x.resourceId!==m.resourceId));
 }
 stage='postflight';report.isolationAfter=await runIsolation({fixture,credentials,url,key,revision:report.revision});check('existing tenant isolation preserved',report.isolationAfter.status==='passed');report.status='passed';
}catch{report.status='failed';report.failedStage=stage;}
finally{
 await browser?.close();
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
 for(const [actor]of sessions)await request(actor,'/auth/v1/logout?scope=local',{});
 report.cleanup=created.map(({resourceId,withdrawn})=>({resourceId,withdrawn}));report.completedAt=new Date().toISOString();await mkdir('qa-results',{recursive:true});await writeFile('qa-results/resource-assignments.json',JSON.stringify(report,null,2),{mode:0o600});console.log(`Resource assignment acceptance: ${report.status}; ${report.checks.filter(x=>x.status==='passed').length}/${report.checks.length} checks.`);if(report.status!=='passed')process.exitCode=1;
}
