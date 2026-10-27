import {readFile} from 'node:fs/promises';
export async function fixture(browser,t,{archives=60}={}){
 const context=await browser.newContext({viewport:{width:1280,height:950}});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({archives})=>{
  const unit=n=>({assignmentId:'assignment-a',curriculumReleaseId:'release-a',unitId:'unit-'+n,unitCode:'SYN-'+n,unitTitleHy:'Բաժին '+n,unitSequence:n,releaseNumber:1});
  const rows=[{id:'a',name:'Ա Դասարան',isActive:true},{id:'b',name:'Բ Դասարան',isActive:true},...Array.from({length:archives},(_,i)=>({id:'history-'+i,name:'Արխիվ '+String(i).padStart(3,'0'),isActive:false}))].map(c=>({...c,assignmentId:'assignment-'+c.id,schoolId:'school-a',academicYear:'2026–2027',subjectName:'Առարկա',schoolName:'Դպրոց',gradeNumber:7,studentCount:null,analyticsAvailable:false}));
  const state=window.__teacherFixture={calls:[],holds:[],fail:[],resolvers:{},listeners:[],actor:'teacher-a',release(key){this.holds=this.holds.filter(k=>k!==key);for(const fn of this.resolvers[key]??[])fn();delete this.resolvers[key];}};
  const session=()=>({user:{id:state.actor,email:'fixture@example.invalid'},access_token:'synthetic'});
  const client=window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:session()}}),getUser:async()=>({data:{user:session().user}}),onAuthStateChange(fn){state.listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};},signOut:async()=>{}},from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{role:'teacher',account_status:'active'}})};return q;},functions:{async invoke(fn,{body}){
    state.calls.push({fn,body,actor:state.actor});const actor=state.actor,key=fn==='get-teacher-dashboard'?(body.readMode==='class'?'class:'+body.classId:'directory:'+Boolean(body.archive)):fn;
    if(state.holds.includes(key))await new Promise(resolve=>(state.resolvers[key]??=[]).push(resolve));
    if(state.fail.includes(key))return {error:new Error('Synthetic read unavailable')};
    if(fn==='get-teacher-dashboard'){
      const result={teacher:{id:actor,displayName:'Ուսուցիչ'},institutionalTeacher:true,institutionalOptions:[],totals:{students:null,studentsNeedingSupport:null}};
      if(body.readMode==='directory'){const all=rows.filter(c=>c.isActive===!body.archive&&(!body.search||c.name.includes(body.search))),offset=body.offset??0;return {data:{...result,classes:all.slice(offset,offset+24),directory:{archive:!!body.archive,offset,matching:all.length,hasMore:offset+24<all.length,activeCount:2,archiveCount:archives}}};}
      const c=rows.find(c=>c.id===body.classId);return {data:{...result,classes:c?[{...c,studentCount:0,students:[],skills:[],analyticsAvailable:true,unitOptions:[unit(1),unit(2)],selectedUnit:body.selection?unit(Number(body.selection.unitId.split('-').at(-1))):unit(1)}]:[]}};
    }
    if(fn==='manage-student-invitation')return {data:{invitations:[],joinCodes:[]}};
    if(fn==='manage-written-work'&&body.action==='queue')return {data:{queue:[],readOnly:false}};
    throw Error('Unexpected synthetic request: '+fn);
  }}};
 },{archives});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__haieduSupabaseClient;'});if(u.origin!=='https://teacher.test')return route.abort();const name=u.pathname==='/teacher'?'/teacher.html':u.pathname;try{const body=await readFile(new URL('../../web'+name,import.meta.url));return route.fulfill({body,contentType:name.endsWith('.html')?'text/html':/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}});
 await page.goto('https://teacher.test/teacher.html?view=home');await page.locator('#dashboardPanel:not(.hidden)').waitFor();return {page,errors};
}
