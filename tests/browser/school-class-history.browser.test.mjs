import {wordBreaks} from '../fixtures/word-boundaries.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
// Actual staff documents/controllers, isolated Auth and endpoint DTOs. This is
// browser usability evidence, not privileged hosted authorization acceptance.
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
async function fixture(t,file,{width=1280,large=false}={}){
 const role=file==='admin'?'admin':'school_admin';
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({role,large})=>{
  const classes=[{id:'archived-a',name:'Պահպանված դասարան Ա',isActive:false,subjectProgramIds:['a']},{id:'current-b',name:'Ընթացիկ դասարան Բ',isActive:true,subjectProgramIds:['b']},{id:'current-a',name:'Ընթացիկ դասարան Ա',isActive:true,subjectProgramIds:['a']}];
  const school={id:'school-a',name:'Փորձնական դպրոց',schoolCode:'SYNTHETIC'};
  window.__calls=[];window.__held=[];
  const analytics=body=>({scope:{...body,academicYearId:'year-a'},options:{academicYears:[{id:'year-a',label:'2026–2027'}],programmes:[{id:'a',label:'Առարկա Ա'},{id:'b',label:'Առարկա Բ'}],classes,releases:[],units:[]},analytics:{enrollment:{students:2,contexts:2},participation:{students:1,rate:50},evidence:{completedSessions:0},chapterReview:{completedSessions:0}}});
  window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'actor'}}}}),getUser:async()=>({data:{user:{id:'actor'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},from:table=>({select(){return this;},eq(){return this;},order:async()=>({data:[{...school,school_code:school.schoolCode}]}),maybeSingle:async()=>({data:{role,account_status:'active'}})}),functions:{invoke:async(name,{body})=>{
   window.__calls.push({name,body});
   if(name==='get-school-performance-analytics'){
    if(window.__holdAnalytics)await new Promise(resolve=>window.__held.push(resolve));
    return{data:analytics(body)};
   }
   if(name==='get-school-teachers')return{data:{teachers:[{membership_id:'teacher-a',display_name:'Փորձնական ուսուցիչ',email:'synthetic@example.test',membership_status:'active',account_status:'active',subjects:[],classes}]}};
   if(name==='get-school-admin-overview')return{data:{schools:[{...school,teachers:[{membershipId:'teacher-a',displayName:'Փորձնական ուսուցիչ',subjects:[],classes:classes.map(c=>({...c,academicYear:'2026–2027',students:[]}))}]}]}};
   if(name==='manage-school-academic-year')return{data:{years:[]}};
   if(name==='get-school-subject-options')return{data:{subjects:[]}};
   if(name==='manage-staff-invitation')return{data:{invitations:[]}};
   if(name==='get-admin-dashboard'){
    const actor={id:'actor',role:'admin'};
    if(body.view==='school_detail')return{data:{actor,school,admins:[],teachers:[{id:'teacher-a',displayName:'Փորձնական ուսուցիչ',accountStatus:'active',membershipStatus:'active',subjects:[],classes:classes.map(c=>({...c,active:c.isActive,academicYear:'2026–2027',studentCount:0}))}]}};
    if(body.view==='schools')return{data:{actor,schools:[school],total:1,page:1}};
    return{data:{actor,summary:{},attention:[],recentAudit:[]}};
   }
   throw Error('Unexpected isolated endpoint '+name);
  }}};
  if(large)document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='32px');
 },{role,large});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__haieduSupabaseClient;'});
  if(u.origin!=='https://class-history.test')return route.abort();
  try{return route.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:u.pathname.endsWith('.html')?'text/html':/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});}catch{return route.fulfill({status:404,body:''});}
 });
 const params=file==='school-teacher'?'?school=school-a&membership=teacher-a':file==='admin'?'#schoolsSection':'';
 await page.goto(`https://class-history.test/${file}.html${params}`);
 return{page,errors};
}
async function screenshot(page,name){if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/'+name+'.png',fullPage:true});}}
for(const width of [390,1280])test(`School Admin uses scoped active classes and folded named history at ${width}px/200%`,async t=>{
 const {page:p,errors}=await fixture(t,'school-admin',{width,large:true});
 await expect(p.locator('#analyticsClassFilter option')).toHaveCount(3);
 await p.locator('#analyticsProgrammeFilter').selectOption('a');await expect(p.locator('#analyticsClassFilter option')).toHaveCount(2);
 await p.locator('#analyticsArchivedClasses').check();await expect(p.locator('#analyticsClassFilter option')).toHaveCount(3);
 await p.locator('#analyticsClassFilter').selectOption('archived-a');await expect.poll(()=>p.locator('#analyticsClassFilter').inputValue()).toBe('archived-a');
 await p.locator('#analyticsArchivedClasses').uncheck();await expect(p.locator('#analyticsClassFilter option')).toHaveCount(2);assert.equal(await p.locator('#analyticsClassFilter').inputValue(),'');
 await screenshot(p,'school-analytics-classes-'+width);
 assert.deepEqual(await wordBreaks(p,'.analytics-filters label,.analytics-metric>span'),[]);
 const layout=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('main *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1&&!e.closest('.hm-role-nav')).slice(0,8).map(e=>({tag:e.tagName,className:e.className,text:e.textContent.slice(0,100),right:e.getBoundingClientRect().right}))}));assert.ok(layout.scrollWidth<=layout.width+1,JSON.stringify(layout));
 await p.locator('.hm-role-nav a[href="#teachersPanel"]').click();
 const history=p.locator('.roster-classes details');await expect(history).toHaveCount(1);await expect(history).toHaveJSProperty('open',false);
 await expect(p.locator('.roster-classes>ul')).toContainText('Ընթացիկ դասարան Ա');await history.locator('summary').press('Enter');await expect(history).toHaveAttribute('open','');await expect(history.locator('li').filter({hasText:'Պահպանված դասարան Ա'})).toBeVisible();
 await screenshot(p,'school-class-history-'+width);
 const rosterLayout=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('.roster-card *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,className:e.className,text:e.textContent.slice(0,100),right:e.getBoundingClientRect().right}))}));assert.ok(rosterLayout.scrollWidth<=rosterLayout.width+1,JSON.stringify(rosterLayout));
 await p.locator('.roster-teacher-link').click();await expect(p.locator('#teacherClasses details.class-history')).toHaveCount(1);
 assert.equal(await p.locator('#teacherClasses details.class-history').getAttribute('open'),null);
 await expect(p.locator('#teacherClasses')).not.toContainText('Անվանում չունեցող');
 await p.locator('#teacherClasses details.class-history>summary').click();await expect(p.locator('#teacherClasses details.class-history')).toContainText('Պահպանված դասարան Ա');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await screenshot(p,'school-teacher-history-'+width);assert.deepEqual(await wordBreaks(p,'.teacher-classes-heading h3,.teacher-class-title strong'),[]);assert.deepEqual(errors,[]);
});
for(const width of [390,1280])test(`Master Admin filters exact programmes and retains history at ${width}px/200%`,async t=>{
 const {page:p,errors}=await fixture(t,'admin',{width,large:true});await p.locator('[data-open-school]').click();
 const teacher=p.locator('#schoolDetail details.person-card');await teacher.locator(':scope>summary').click();
 const history=teacher.locator('details.class-history');await expect(history).toHaveJSProperty('open',false);await expect(history).toContainText('Պահպանված դասարան Ա');
 assert.ok(['none','normal'].includes(await history.locator('summary').evaluate(e=>getComputedStyle(e,'::after').content)),'nested history must not inherit the open parent card’s Close action');
 await history.locator('summary').press('Enter');await expect(history).toHaveAttribute('open','');await expect(teacher).toHaveAttribute('open','');await history.locator('summary').press('Enter');await expect(history).toHaveJSProperty('open',false);
 const form=p.locator('#schoolDetail form').filter({has:p.locator('[name=subjectProgramId]')});
 await expect(form.locator('[name=classId] option')).toHaveCount(3);await form.locator('[name=subjectProgramId]').selectOption('a');await expect(form.locator('[name=classId] option')).toHaveCount(2);
 await form.locator('[name=includeArchived]').check();await expect(form.locator('[name=classId] option')).toHaveCount(3);await form.locator('[name=classId]').selectOption('archived-a');
 await expect.poll(()=>form.locator('[name=classId]').inputValue()).toBe('archived-a');await form.locator('[name=includeArchived]').uncheck();await expect(form.locator('[name=classId] option')).toHaveCount(2);
 await screenshot(p,'master-class-history-'+width);
 assert.deepEqual(await wordBreaks(p,'.class-assignment strong,.class-assignment button,.person-card>summary .person-name,.person-card>summary .admin-actions button'),[]);
 const layout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('#schoolDetail *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right})),clipped:[...document.querySelectorAll('.school-analytics-filters button,.class-archive-toggle')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)}));assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));assert.deepEqual(layout.clipped,[]);
 await p.evaluate(()=>window.__holdAnalytics=true);await form.locator('[name=subjectProgramId]').selectOption('b');await p.waitForFunction(()=>window.__held.length===1);
 await p.locator('[data-open-school]').click();await p.waitForFunction(()=>window.__held.length===2);
 await p.evaluate(()=>{window.__holdAnalytics=false;window.__held.shift()();window.__held.shift()();});
 await expect(p.locator('#schoolDetail [name=subjectProgramId]')).toHaveValue('');assert.deepEqual(errors,[]);
});
