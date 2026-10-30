import{readFile,mkdir,writeFile}from'node:fs/promises';
import{chromium}from'@playwright/test';
import{createHash}from'node:crypto';
import{validateFixture,roles,sides,runIsolation}from'./sprint-14-isolation.mjs';
// B.11 is read-only in production: no learner drafts, marks or templates are manufactured.
const report={scope:'16.5B.11 teacher feedback production read acceptance',revision:process.env.GITHUB_SHA,status:'running',checks:[]},fixture=JSON.parse(process.env.QA_TENANT_FIXTURES_JSON??'{}');
const credentials=Object.fromEntries(sides.flatMap(s=>roles.map(r=>[s+'_'+r,{email:process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_EMAIL`],password:process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_PASSWORD`]}])));
const config=await readFile(new URL('../web/config.js',import.meta.url),'utf8'),url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1],sessions=new Map();
async function releaseMatches(){const r=await fetch('https://www.haiedu.am/release.json?source_probe='+Date.now(),{signal:AbortSignal.timeout(20000)});return r.ok&&(await r.json()).commit===report.revision;}
let browser;function check(label,ok,status){report.checks.push({label,status:ok?'passed':'failed',...(status===undefined?{}:{httpStatus:status})});if(!ok)throw Error(label);}
async function request(actor,path,body={},method='POST'){try{const r=await fetch(url+path,{method,headers:{apikey:key,Authorization:'Bearer '+(sessions.get(actor)?.access_token??key),'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json().catch(()=>null),cache:r.headers.get('cache-control')};}catch{return{status:0,data:null};}}
const reviewFixtures=JSON.parse(await readFile(new URL('../docs/qa/additional-programme-fixtures.json',import.meta.url),'utf8'));
const allowed=(fn,body)=>new Set(['get-teacher-dashboard','get-teacher-workspace','get-my-privacy']).has(fn)||(fn==='manage-written-work'&&body.action==='queue')||(fn==='manage-teacher-feedback'&&['open','snippets'].includes(body.action))||(fn==='manage-student-invitation'&&body.action==='list');
try{
 check('reviewed main only',process.env.GITHUB_REF==='refs/heads/main');check('six designated identities configured',validateFixture(fixture,credentials).length===0&&Boolean(url&&key));
 check('intended production frontend before reads',await releaseMatches());
 report.frontend=[];
 for(const path of ['teacher-task-review.mjs','student-teacher-tasks.mjs','student-teacher-task-client.mjs','teacher-task-send.mjs','teacher-task-draft-workspace.mjs','teacher-task-editor.mjs','teacher-task-form.mjs','teacher-task-source-client.mjs','role-layout.js','teacher-dependencies.bundle.mjs','teacher-dependencies.mjs','teacher-review.mjs','teacher-workflows.html','teacher.css','teacher.html','teacher.js','written-work.css','written-work.mjs']){
  const expected=createHash('sha256').update(await readFile(new URL('../web/'+path,import.meta.url))).digest('hex');
  const r=await fetch('https://www.haiedu.am/'+path+'?source_probe='+Date.now(),{signal:AbortSignal.timeout(20000)}),actual=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
  report.frontend.push({path,expected,actual,status:r.status});check('current frontend bytes: '+path,r.ok&&expected===actual);
 }

 report.isolationBefore=await runIsolation({fixture,credentials,url,key,revision:report.revision});check('read isolation before',report.isolationBefore.status==='passed');
 for(const s of sides)for(const role of roles){const actor=s+'_'+role,r=await request(null,'/auth/v1/token?grant_type=password',credentials[actor]);check(actor+': designated login',r.status===200&&r.data?.user?.id===fixture[s][role+'Id']);sessions.set(actor,{...r.data,expires_at:r.data.expires_at??Math.floor(Date.now()/1000)+r.data.expires_in});}
 browser=await chromium.launch();
 for(const s of sides){const actor=s+'_teacher',other=s==='A'?'B':'A';
  const snippets=await request(actor,'/functions/v1/manage-teacher-feedback',{action:'snippets',context:{},payload:{}});check(s+': private bounded personal list',snippets.status===200&&snippets.data?.version==='teacher-feedback-v1'&&snippets.data.snippets.length<=20&&typeof snippets.data.hasMore==='boolean',snippets.status);check(s+': private response is no-store',snippets.cache==='no-store');
  const archives=await request(actor,'/functions/v1/manage-teacher-feedback',{action:'snippets',context:{},payload:{archived:true}});check(s+': bounded personal archive',archives.status===200&&archives.data.snippets.length<=20);
  const privacy=await request(actor,'/functions/v1/get-my-privacy');check(s+': privacy inventory covers all new personal data',privacy.status===200&&['feedbackDrafts','feedbackSnippets','feedbackReceipts'].every(k=>Number.isInteger(privacy.data?.dataInventory?.[k])));
  const ws=await request(actor,'/functions/v1/get-teacher-workspace',{});check(s+': compatible Today projection',ws.status===200&&ws.data?.version==='teacher-workspace-v1');
  let selected=ws.data.queue[0]??null;
  if(selected){const read=await request(actor,'/functions/v1/manage-teacher-feedback',{action:'open',context:{assignmentId:selected.assignmentId,curriculumReleaseId:selected.curriculumReleaseId,unitId:selected.unitId},payload:{workId:selected.id}});check(s+': current submitted work opens without mutation',read.status===200&&read.data.writtenWork.work.id===selected.id);}
  const denied=await request(actor,'/functions/v1/manage-teacher-feedback',{action:'open',context:{assignmentId:fixture[other].assignmentId,curriculumReleaseId:fixture[other].curriculumReleaseId,unitId:fixture[other].unitId},payload:{workId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}});check(s+': foreign class denied',denied.status===403);
  for(const role of ['student','admin']){const r=await request(s+'_'+role,'/functions/v1/manage-teacher-feedback',{action:'snippets',context:{},payload:{}});check(s+': '+role+' cannot access teacher feedback',r.status===403);}
  for(const role of ['teacher','student'])for(const rpc of ['service_teacher_feedback','service_teacher_feedback_privacy_counts']){const r=await request(s+'_'+role,'/rest/v1/rpc/'+rpc,rpc.endsWith('counts')?{p_user:fixture[s].teacherId}:{p_actor:fixture[s].teacherId,p_auth:fixture[s].teacherId,p_action:'snippets'});check(s+'_'+role+': direct privileged '+rpc+' denied',r.status===403);}
  const bc=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:'https://www.haiedu.am',localStorage:[{name:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,value:JSON.stringify(sessions.get(actor))}]}]}});let blocked=0,errors=0;
  try{await bc.route(url+'/**',route=>{const r=route.request(),u=new URL(r.url());let b={};try{b=r.postDataJSON()??{};}catch{}if(r.method()==='OPTIONS'||(u.pathname.startsWith('/rest/v1/')&&r.method()==='GET')||(u.pathname==='/auth/v1/user'&&r.method()==='GET')||(u.pathname==='/auth/v1/token'&&u.searchParams.get('grant_type')==='refresh_token'&&r.method()==='POST')||(u.pathname.startsWith('/functions/v1/')&&r.method()==='POST'&&allowed(u.pathname.split('/').at(-1),b)))return route.continue();blocked++;return route.abort();});
   const p=await bc.newPage();p.on('pageerror',()=>errors++);await p.goto('https://www.haiedu.am/teacher?view=home'+(selected?'&todayWork='+selected.id:''));await p.locator('[data-today-time]').filter({hasText:'Ստուգված է'}).waitFor({timeout:30000});
   if(selected){await p.locator('[data-feedback-status]').waitFor();check(s+': private/sent boundary visible',await p.locator('[data-writing-review]').innerText().then(t=>t.includes('Սևագիրը տեսնում եք միայն դուք')));}
   const scope=reviewFixtures.contexts.find(c=>c.side===s&&c.teacherId===fixture[s].teacherId);
   check(s+': designated review tuple configured',Boolean(scope?.classId&&scope?.teacherAssignmentId&&scope?.curriculumReleaseId&&scope?.unitId));
   const reviewUrl=new URL('https://www.haiedu.am/teacher');for(const [k,v]of Object.entries({view:'review',class:scope.classId,assignment:scope.teacherAssignmentId,release:scope.curriculumReleaseId,unit:scope.unitId,state:'reviewed'}))reviewUrl.searchParams.set(k,v);
   await p.goto(reviewUrl.href);await p.locator('[data-writing-state="reviewed"][aria-pressed="true"]').waitFor({timeout:30000});
   check(s+': permanent review sidebar selected',await p.locator('.hm-role-nav [aria-current="page"]').innerText()==='Գրավորի ստուգում');
   check(s+': exact review tuple retained',new URL(p.url()).searchParams.get('unit')===scope.unitId&&new URL(p.url()).searchParams.get('assignment')===scope.teacherAssignmentId);
   check(s+': obsolete specimen link absent',await p.locator('.hm-role-foot a[href="./teacher-workspace-preview.html"]').count()===0);
   for(const state of ['submitted','changes_requested','reviewed','all']){await p.locator('[data-writing-state="'+state+'"]').click();await p.locator('[data-writing-state="'+state+'"][aria-pressed="true"]').waitFor();check(s+': real '+state+' queue accessible',new URL(p.url()).searchParams.get('state')===state);}
   await mkdir('qa-results',{recursive:true});await p.screenshot({path:'qa-results/teacher-review-'+s+'.png',fullPage:true});
   check(s+': native read has no write attempt or page error',blocked===0&&errors===0);check(s+': native narrow layout',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }finally{await bc.close();}
 }
 const anon=await request(null,'/functions/v1/manage-teacher-feedback',{action:'snippets'});check('anonymous feedback denied',anon.status===401);
 report.status='passed';
}catch(e){report.status='failed';report.failure=String(e.message).slice(0,200);}finally{
 await browser?.close();for(const[actor]of sessions){const r=await request(actor,'/auth/v1/logout?scope=local');report.checks.push({label:actor+': close only run session',status:[200,204].includes(r.status)?'passed':'failed',httpStatus:r.status});}
 if(sessions.size===6){try{report.isolationAfter=await runIsolation({fixture,credentials,url,key,revision:report.revision});report.checks.push({label:'read isolation after',status:report.isolationAfter.status==='passed'?'passed':'failed'});}catch{report.checks.push({label:'read isolation after',status:'failed'});}}
 try{report.checks.push({label:'intended production frontend after reads',status:await releaseMatches()?'passed':'failed'});}catch{report.checks.push({label:'intended production frontend after reads',status:'failed'});}
 if(report.checks.some(c=>c.status==='failed'))report.status='failed';
 report.finishedAt=new Date().toISOString();await mkdir('qa-results',{recursive:true});await writeFile('qa-results/teacher-feedback.json',JSON.stringify(report,null,2)+'\n');console.log(`Teacher feedback production reads: ${report.status}; ${report.checks.filter(c=>c.status==='passed').length}/${report.checks.length}.`);process.exitCode=report.status==='passed'?0:1;
}
