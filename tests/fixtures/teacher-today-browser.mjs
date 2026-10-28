import {readFile,readdir} from 'node:fs/promises';
import {fixture as writingFixture,token,id,context} from './written-work-api.mjs';
import {createTeacherWorkspaceHandler} from '../../supabase/functions/_shared/teacher-workspace-handler.mjs';
export {id};
export async function todayFixture(browser,t,{count=2,initialURL='?view=home'}={}){
 const f=await writingFixture();t.after(()=>f.db.close());
 await f.db.exec(`alter table classes add column if not exists teacher_id uuid,add column if not exists academic_year text;update subjects set code=case when id='${id(101)}' then 'english' else 'physics' end,name_hy=case when id='${id(101)}' then 'Անգլերեն' else 'Ֆիզիկա' end;update classes set name=case when id='${id(321)}' then '7Ա' else '7Բ' end;`);
 await f.db.exec(await readFile('supabase/migrations/20261028180038_teacher_today_workspace.sql','utf8'));
 await f.db.exec(await readFile('supabase/migrations/0012_live_session_gate.sql','utf8'));
 const batch=(await readdir('supabase/migrations')).find(p=>p.endsWith('_teacher_dashboard_batched_reads.sql'));await f.db.exec(await readFile('supabase/migrations/'+batch,'utf8'));
 for(let i=0;i<count;i++){
  const ctx=context(i%2);const task=id(6000+i);
  await f.db.query(`insert into written_task_versions(id,task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence)
   select $1,$2,1,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence from written_task_versions where id=$3`,[task,'today-'+i,id(1000+i%2)]);
  const opened=await(await f.request({action:'open',context:ctx,payload:{taskId:task}})).json();
  const submitted=await f.request({action:'submit',context:ctx,payload:{taskId:task,expectedRevision:opened.work?.revision??0,text:Array(80).fill('synthetic').join(' ')}});
  if(!submitted.ok)throw Error('Synthetic submission failed');
 }
 const handle=createTeacherWorkspaceHandler({createAdmin:()=>f.admin,hasActiveLiveSession:f.hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const bc=await browser.newContext({viewport:{width:1280,height:960},serviceWorkers:'block'});t.after(()=>bc.close());const page=await bc.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await bc.addInitScript(()=>{
  const s=window.__today={actor:20,calls:[],fail:[],lose:[],holds:[],resolvers:[],listeners:[],release(){this.holds=[];this.resolvers.splice(0).forEach(fn=>fn());},switchActor(actor){this.actor=actor;this.listeners.slice().forEach(fn=>fn(actor?'SIGNED_IN':'SIGNED_OUT',actor?{user:{id:'71000000-0000-4000-8000-'+String(actor).padStart(12,'0')}}:null));}};
  const session=()=>({user:{id:'71000000-0000-4000-8000-'+String(s.actor).padStart(12,'0'),email:'synthetic@example.invalid'}});
  window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:s.actor?session():null}}),getUser:async()=>({data:{user:s.actor?session().user:null}}),onAuthStateChange(fn){s.listeners.push(fn);return{data:{subscription:{unsubscribe(){s.listeners=s.listeners.filter(x=>x!==fn);}}}};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'teacher',account_status:'active'}})})})}),functions:{async invoke(fn,{body}){
   const actor=s.actor;s.calls.push({fn,body,actor});if(s.fail.includes(fn))return{data:{error:'workspace_unavailable'},error:{}};
   const r=await fetch('/fixture-rpc',{method:'POST',body:JSON.stringify({fn,body,actor})}),data=await r.json();
   if((s.holds.includes(fn)||s.holds.includes(fn+':'+body.action))&&actor===20)await new Promise(resolve=>s.resolvers.push(resolve));if(s.lose.includes(fn+':'+body.action)){s.lose=s.lose.filter(k=>k!==fn+':'+body.action);return{data:null,error:{}};}return r.ok?{data}:{data,error:{}};
  }}};
 });
 await bc.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__haieduSupabaseClient;'});
  if(u.origin!=='https://today.test')return route.abort();
  if(u.pathname==='/fixture-rpc'){
   const {fn,body,actor}=route.request().postDataJSON();let data,status=200;
   if(fn==='get-teacher-workspace'){const r=await handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor)},body:JSON.stringify(body)}));status=r.status;data=await r.json();}
   else if(fn==='manage-teacher-feedback'){const r=await f.feedbackRequest(body,actor);status=r.status;data=await r.json();}
   else if(fn==='manage-written-work'){const r=await f.request(body,actor);status=r.status;data=await r.json();}
   else if(fn==='get-teacher-dashboard'){
    data=(await f.db.query('select service_teacher_class_directory($1,$2,$3,$4) result',[id(actor),body.archive??false,body.offset??0,body.search??''])).rows[0].result;
    Object.assign(data,{progressive:true,institutionalTeacher:true,teacher:{id:id(actor),displayName:'Փորձնական ուսուցիչ'},totals:{students:null,studentsNeedingSupport:null}});
    if(body.readMode==='class')data.classes=data.classes.filter(c=>c.id===body.classId).map(c=>({...c,analyticsAvailable:false,unitOptions:[{curriculumReleaseId:id(501),unitId:id(511),unitSequence:1,unitTitleHy:'Փորձնական բաժին',releaseNumber:1}],selectedUnit:{curriculumReleaseId:id(501),unitId:id(511),unitTitleHy:'Փորձնական բաժին'}}));
   }else if(fn==='manage-student-invitation')data={invitations:[],joinCodes:[]};else throw Error('Unexpected fixture API '+fn);
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  }
  try{const n=u.pathname.endsWith('/teacher')?'/teacher.html':u.pathname,body=await readFile(new URL('../../web'+n,import.meta.url));return route.fulfill({body,contentType:n.endsWith('.html')?'text/html':/\.m?js$/.test(n)?'text/javascript':n.endsWith('.css')?'text/css':n.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://today.test/teacher.html'+initialURL);await page.locator('#dashboardPanel:not(.hidden)').waitFor();await page.locator('[data-today-time]').filter({hasText:'Ստուգված է'}).waitFor();
 return{page,errors,db:f.db,studentRequest:f.request};
}
