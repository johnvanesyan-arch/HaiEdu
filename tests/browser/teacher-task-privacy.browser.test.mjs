import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
import {chromium,expect} from '@playwright/test';
import {privacyFixture,privacyToken,id,context,pdf,textDefinition} from '../fixtures/teacher-task-privacy-api.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const origin='https://task-privacy.test';
async function heldReady(slot){const deadline=Date.now()+10000;while(!slot.release&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));assert.equal(typeof slot.release,'function','Expected committed held Edge reply');}
// Real admin deletion functions/bindings and HTML/styles; unrelated admin
// MFA/router initialization is deliberately outside this isolated component.
async function adminModule(){
 const source=await readFile('web/admin.js','utf8'),ast=ts.createSourceFile('admin.js',source,ts.ScriptTarget.Latest,true);
 const names=['esc','fmtDate','displayUser','setMessage','friendlyError','invoke','cacheUsers','renderDeletionRequests','loadDeletions','executeDeletion'];
 const functions=names.map(name=>{const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(n,name);return n.getText(ast);}).join('\n');
 return `import{erasurePresentation}from'/task-privacy-view.mjs';
 const supabase=window.__client,$=id=>document.getElementById(id),accountCache=new Map(),pendingDeletionIds=new Set();let actor=null;
 const approveDeletion=()=>{throw Error('Not in this execution fixture');},rejectDeletion=approveDeletion;
 ${functions}
 document.querySelector('#console').classList.remove('hidden');for(const e of document.querySelectorAll('.admin-view'))e.hidden=e.id!=='deletionsSection';
 await loadDeletions();window.__ready=true;`;
}
async function surface(t,{mode='privacy',actor=10,width=390,large=false}={}){
 const f=await privacyFixture();t.after(()=>f.db.close());const delivery=await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:['pdf']}},'selected',[id(371)]);
 await f.fileRequest('upload',{id:delivery.id,requestId:crypto.randomUUID(),format:'pdf'},10,context(0,false),pdf);
 const requestId=await f.processing();
 const bc=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});t.after(()=>bc.close());
 const p=await bc.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(10000);let held=null,drop=false;
 await p.addInitScript(({actor,credential,large})=>{
  let session={user:{id:actor},access_token:credential};const listeners=[];window.__calls=[];window.__confirms=0;window.__settled=0;
  window.confirm=()=>{window.__confirms++;return true;};window.prompt=()=> 'DELETE';
  window.__client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:{...session?.user,email:'synthetic@example.invalid'}}}),onAuthStateChange:fn=>{listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}};}},functions:{invoke:async(name,{body})=>{
   window.__calls.push({name,body});const r=await fetch('/fixture/'+name,{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await r.json();if(name==='manage-admin-account')window.__settled++;return r.ok?{data}:{data,error:{message:data.error,context:r}};
  }}};window.__switch=()=>{session={user:{id:'another-account'}};for(const fn of listeners)fn('SIGNED_IN',session);document.querySelector('#consoleMessage').textContent='Other account';document.querySelector('#deletionRows').innerHTML='<tr><td>Other account</td></tr>';};
  if(large)document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='32px');
 },{actor:id(mode==='admin'?40:actor),credential:privacyToken(mode==='admin'?40:actor),large});
 await bc.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.origin!==origin)return route.abort();
  if(u.pathname.startsWith('/fixture/')){
   const name=u.pathname.split('/').at(-1),body=req.postDataJSON();let response;
   if(name==='manage-admin-account')response=await f.adminRequest(body);
   else if(name==='manage-my-privacy')response=await f.mineRequest(body,actor);
   else if(name==='get-admin-dashboard'){
    const rows=(await f.db.query('select * from account_deletion_requests order by requested_at')).rows;
    response=Response.json({actor:{id:id(40)},users:[{id:id(10),displayName:'Փորձնական աշակերտ'}],deletionRequests:rows});
   }else if(name==='get-my-privacy'){
    const counts=await f.admin.rpc('service_teacher_task_privacy_counts',{p_user_id:id(actor)}),profile=(await f.db.query('select * from profiles where id=$1',[id(actor)])).rows[0];
    response=Response.json({account:{role:profile.role,status:profile.account_status,displayName:'Փորձնական հաշիվ',email:'synthetic@example.invalid'},preferences:{},dataInventory:{teacherTasks:counts.data},latestDeletionRequest:(await f.db.query('select * from account_deletion_requests where user_id=$1 order by requested_at desc limit 1',[id(actor)])).rows[0]});
   }else throw Error('Unexpected fixture function '+name);
   if(name==='manage-admin-account'&&held){const slot=held;held=null;await new Promise(resolve=>slot.release=resolve);}
   if(name==='manage-admin-account'&&drop){drop=false;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"task_privacy_unavailable"}'});}
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(u.pathname==='/harness'){
   let html=(await readFile('web/'+(mode==='admin'?'admin':'privacy')+'.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
   html=html.replace('</body>','<script type="module" src="/'+(mode==='admin'?'admin-fixture.mjs':'privacy.js')+'"></script></body>');return route.fulfill({contentType:'text/html',body:html});
  }
  if(u.pathname==='/admin-fixture.mjs')return route.fulfill({contentType:'text/javascript',body:await adminModule()});
  if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid",SUPABASE_PUBLISHABLE_KEY="fixture";'});
  try{return route.fulfill({body:await readFile('web'+u.pathname),contentType:/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.woff2')?'font/woff2':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await p.goto(origin+'/harness');if(mode==='admin')await p.waitForFunction(()=>window.__ready);else await expect(p.locator('#content')).toBeVisible();
 return{...f,p,errors,requestId,hold(){const slot={release:null};held=slot;return slot;},drop(){drop=true;}};
}
test('real shared account controller shows own teacher task counts without learner work',async t=>{
 const f=await surface(t,{actor:20});await expect(f.p.locator('#inventory')).toContainText('Իմ կազմած և ուղարկած առաջադրանքներ');await expect(f.p.locator('#inventory')).toContainText('Կցված PDF ֆայլեր');await expect(f.p.locator('#inventory')).not.toContainText('Իմ պատասխանի ֆայլեր');assert.deepEqual(f.errors,[]);
});
test('real student account controller permits cancellation before execution and removes it once final execution starts',async t=>{
 const f=await surface(t),p=f.p;await expect(p.locator('#inventory')).toContainText('Իմ պատասխանի ֆայլեր');await expect(p.locator('#cancelDeletionBtn')).toBeVisible();
 await p.locator('#cancelDeletionBtn').click();await expect(p.locator('#requestDeletionBtn')).toBeVisible();assert.equal((await f.db.query('select status from account_deletion_requests where id=$1',[f.requestId])).rows[0].status,'cancelled');
 const requestId=await f.processing();assert.equal((await f.privacy('prepare',{requestId})).error,null);await p.reload();await expect(p.locator('#deletionState')).toContainText('այլևս չեք կարող չեղարկել');await expect(p.locator('#cancelDeletionBtn')).toBeHidden();await expect(p.locator('#requestDeletionBtn')).toBeHidden();await expect(p.locator('#saveNameBtn')).toBeDisabled();assert.deepEqual(f.errors,[]);
});
test('actual admin deletion binding serializes clicks, reports upload drain, then resumes the same completed receipt',async t=>{
 const f=await surface(t,{mode:'admin'}),p=f.p,held=f.hold();
 await p.evaluate(()=>{document.querySelector('[data-delete-execute]').click();document.querySelector('[data-delete-execute]').click();});await expect(p.locator('[data-delete-execute]')).toBeDisabled();
 await heldReady(held);held.release();await expect(p.locator('#consoleMessage')).toContainText('վերբեռնումների ավարտին');await expect(p.locator('[data-delete-execute]')).toHaveText('Շարունակել ջնջումը');await expect(p.locator('[data-delete-reject]')).toHaveCount(0);assert.equal(await p.evaluate(()=>window.__calls.filter(c=>c.name==='manage-admin-account').length),1);
 await f.drainElapsed();await p.locator('[data-delete-execute]').focus();await p.keyboard.press('Enter');await expect(p.locator('#consoleMessage')).toContainText('վերջնականապես ջնջվել է');assert.equal(await p.evaluate(()=>window.__confirms),1);assert.equal((await f.db.query("select count(*)::int n from security_audit_log where action='admin.student_account_erased'")).rows[0].n,1);assert.deepEqual(f.errors,[]);
});
test('unknown deletion reply refreshes the execution marker and late response cannot paint another admin account',async t=>{
 const f=await surface(t,{mode:'admin'}),p=f.p;f.drop();await p.locator('[data-delete-execute]').click();await expect(p.locator('[data-delete-execute]')).toHaveText('Շարունակել ջնջումը');await expect(p.locator('[data-delete-reject]')).toHaveCount(0);
 await f.drainElapsed();const held=f.hold();await p.locator('[data-delete-execute]').click();await heldReady(held);await p.evaluate(()=>window.__switch());held.release();await p.waitForFunction(()=>window.__settled===2);await expect(p.locator('#consoleMessage')).toHaveText('Other account');await expect(p.locator('#deletionRows')).toHaveText('Other account');assert.deepEqual(f.errors,[]);
});
async function layout(p,selector){
 await p.evaluate(()=>document.fonts.ready);const g=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(g.scroll<=g.width+1,JSON.stringify(g));
 const split=await p.locator(selector).evaluateAll(elements=>{const words=[];for(const e of elements)for(const n of e.childNodes){if(n.nodeType!==Node.TEXT_NODE)continue;for(const m of n.textContent.matchAll(/\p{L}+/gu)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);if(new Set([...r.getClientRects()].filter(r=>r.width).map(r=>Math.round(r.top))).size>1)words.push(m[0]);}}return words;});assert.deepEqual(split,[]);
}
for(const width of [390,768,1280])test(`privacy and admin execution states retain controls at ${width}px and 200% text`,async t=>{
 for(const mode of ['privacy','admin']){
  const f=await surface(t,{mode,width,large:true}),p=f.p;
  if(mode==='privacy'){await f.privacy('prepare',{requestId:f.requestId});await p.reload();await expect(p.locator('#deletionState')).toContainText('այլևս չեք կարող չեղարկել');}
  else{await p.locator('[data-delete-execute]').click();await expect(p.locator('#consoleMessage')).toContainText('վերբեռնումների ավարտին');await expect(p.locator('[data-delete-execute]')).toBeEnabled();}
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+`/task-${mode}-${width}-200.png`,fullPage:true});}
  await layout(p,mode==='privacy'?'#inventory dt,#deletionState':'[data-delete-execute],#consoleMessage');assert.deepEqual(f.errors,[]);
 }
});
