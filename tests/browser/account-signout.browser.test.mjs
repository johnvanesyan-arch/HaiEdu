import {accountWordReadability} from '../fixtures/navigation-readability.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {chromium,expect} from '@playwright/test';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const origin='https://account-recovery.test';
const consumers=['privacy.js','teacher.js','physics-7.js','school-admin.js','school-teacher.js','admin.js','admin-security.js','content.js','content-guides.js','content-materials.js','content-misconceptions.js','content-workspace.js','role-router.js'];
async function binding(file){
 const source=await readFile('web/'+file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),found=[];
 function walk(n){
  if(ts.isExpressionStatement(n)){
   const text=n.getText(ast);
   if(/(?:signOutBtn|blockedSignOutBtn)/.test(text)&&/addEventListener\(["']click["']|\.onclick\s*=/.test(text)&&(/signOutAccount/.test(text)||file==='teacher.js'&&/"click", signOut/.test(text)))found.push(text);
  }
  ts.forEachChild(n,walk);
 }
 walk(ast);assert.equal(found.length,1,file+' must expose exactly one reviewed logout binding');
 const fn=file==='teacher.js'?ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='signOut').getText(ast)+'\n':'';
 return fn+found[0];
}
async function fixture(t,{file=null,mode='returnedActive',readsFail=0,held=false,redirect=false,realPrivacy=false,role='teacher',privacyFailure=false}={}){
 const bc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});t.after(()=>bc.close());
 await bc.addInitScript(({mode,readsFail,held,role,privacyFailure})=>{
  const listeners=new Set(),session=()=>({user:{id:'actor-A'},access_token:'synthetic-old'});
  const s=window.__logout={session:session(),mode,readsFail,held,attempted:false,calls:[],canLeave:true,release:null,confirmations:0,role,privacyFailure,
   emit(event){for(const fn of [...listeners])fn(event,this.session);},switchActor(){this.session={user:{id:'actor-B'},access_token:'synthetic-new'};this.emit('SIGNED_IN');}};
  window.confirm=()=>{s.confirmations++;return s.canLeave;};
  window.__client={auth:{getSession:async()=>{if(s.attempted&&s.readsFail-->0)throw Error('Synthetic unreadable session');return{data:{session:s.session},error:null};},getUser:async()=>({data:{user:{...s.session?.user,email:'synthetic@example.invalid'}}}),updateUser:async()=>new Promise(resolve=>s.resolveEmail=resolve),onAuthStateChange:fn=>{listeners.add(fn);return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},signOut:async({scope}={})=>{
   s.calls.push({scope});s.attempted=true;
   if(s.mode.endsWith('Cleared')||s.mode==='success'){s.session=null;s.emit('SIGNED_OUT');}
   if(s.held)await new Promise(resolve=>s.release=resolve);
   if(s.mode.startsWith('thrown'))throw Error('Synthetic request rejected');
   return{error:s.mode==='success'?null:{message:'Synthetic remote failure'}};
  }},functions:{invoke:async(name)=>{if(name==='manage-my-privacy')return new Promise(resolve=>s.resolvePrivacy=resolve);if(name!=='get-my-privacy')throw Error('Unexpected fixture function');if(s.privacyFailure)return{data:null,error:{message:'Synthetic unavailable profile'}};return{data:{account:{role:s.role,status:'active',displayName:s.session?.user.id==='actor-B'?'Other synthetic name':'Synthetic name',email:'synthetic@example.invalid'},preferences:{product_analytics_opt_in:false,research_use_opt_in:false},dataInventory:{}},error:null};}}};
 },{mode,readsFail,held,role,privacyFailure});
 const code=file?await binding(file):`document.getElementById('signOutBtn').addEventListener('click',()=>{window.__result=signOutAccount(supabase,{${redirect?"redirect:'./account-access',":''}canLeave:()=>window.__logout.canLeave});});`;
 const setup=`import {signOutAccount,showSignOutNotice} from './account-signout.mjs';
 const supabase=window.__client,client=supabase,contentSupabase=supabase,$=id=>document.getElementById(id);
 const state={account:{displayName:'Synthetic name'},preferences:{product_analytics_opt_in:false,research_use_opt_in:false}};
 const workflowBusy=false,workflowsInFlight=new Map(),sessionCheck=0,busy=false,editorDirty=false,currentUserId='actor-A',userId='actor-A';
 const allowTeacherLeave=()=>window.__logout.canLeave,canLeave=allowTeacherLeave,discardOkay=allowTeacherLeave,closeMfa=async()=>{},cleanupFactors=async()=>{},clearContentDashboardCache=()=>{};
 ${code}
 document.querySelector('#signOutBtn')?.classList.remove('hidden');
 window.__ready=true;`;
 const accountHead=(await readFile('web/privacy.html','utf8')).split('<head>')[1].split('</head>')[0];
 const generic=`<!doctype html><html lang="hy"><head>${accountHead}</head><body data-forest-surface data-student-utility="account"><main class="shell privacy-shell"><h1>Հաշիվ</h1><button id="${file==='role-router.js'?'blockedSignOutBtn':'signOutBtn'}">Դուրս գալ</button><input id="displayNameInput" value="Synthetic name"><input id="newEmailInput"><input type="checkbox" id="analyticsOptIn"><input type="checkbox" id="researchOptIn"><input id="privateDraft" value="Unsaved synthetic work"></main><script type="module">${setup}</script></body></html>`;

 await bc.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.hostname==='esm.sh')return r.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.origin!==origin)return r.abort();
  if(u.pathname==='/fixture'){
   let html=generic;if(realPrivacy){html=(await readFile('web/privacy.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script type="module" src="./privacy.js"></script></body>');}
   return r.fulfill({contentType:'text/html',body:html});
  }
  if(['/account-access','/account-access.html','/index.html'].includes(u.pathname))return r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="hy"><head>'+accountHead+'</head><body data-forest-surface data-student-utility="account"><main class="shell"><h1>Մուտք գործել</h1></main><script type="module">import {showSignOutNotice} from "./account-signout.mjs";showSignOutNotice();</script></body></html>'});
  if(u.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://synthetic.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic-public";'});
  try{return r.fulfill({body:await readFile('web'+u.pathname),contentType:/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}
 });
 const p=await bc.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/fixture');
 if(realPrivacy){if(privacyFailure)await expect(p.getByRole('button',{name:'Կրկին ստուգել մուտքը'})).toBeVisible();else await expect(p.locator('#content')).toBeVisible();}else await p.waitForFunction(()=>window.__ready);
 return{p,errors,button:p.locator(file==='role-router.js'?'#blockedSignOutBtn':'#signOutBtn')};
}
for(const file of consumers)test(`${file} actual logout binding: returned error with retained session has no false redirect and permits explicit retry`,async t=>{
 const {p,errors,button}=await fixture(t,{file});await button.click();await expect(p.locator('#accountSignOutMessage')).toContainText('Չհաջողվեց դուրս գալ');
 assert.equal(new URL(p.url()).pathname,'/fixture');await expect(button).toBeEnabled();assert.equal(await p.locator('#privateDraft').inputValue(),'Unsaved synthetic work');
 await p.evaluate(()=>window.__logout.mode='success');await button.click();
 if(['content.js','content-guides.js','content-misconceptions.js'].includes(file)){await expect(button).toBeEnabled();assert.equal(await p.evaluate(()=>window.__logout.session),null);assert.equal(new URL(p.url()).pathname,'/fixture');}
 else await p.waitForURL(/\/(account-access(?:\.html)?|index\.html)$/);
 assert.deepEqual(errors,[]);
});
for(const role of ['student','teacher','school_admin','content_admin','admin'])test(`real shared account controller (${role}): local clearing with remote failure reaches login with accurate notice`,async t=>{
 const {p,errors,button}=await fixture(t,{realPrivacy:true,role,mode:'returnedCleared'});await button.click();await p.waitForURL('**/index.html');
 await expect(p.locator('#accountSignOutMessage')).toContainText('Մյուս սարքերից դուրս գալը չհաստատվեց');assert.deepEqual(errors,[]);
});
test('unknown logout outcome offers read-only recovery, serializes both entry points and reflows at 200% text',async t=>{
 const {p,errors,button}=await fixture(t,{mode:'returnedCleared',readsFail:2});
 await p.evaluate(()=>{const button=document.querySelector('#signOutBtn').cloneNode(true);button.removeAttribute('id');button.dataset.studentSignout='';button.onclick=()=>document.querySelector('#signOutBtn').click();document.querySelector('main').append(button);});
 await p.evaluate(()=>{document.querySelector('#signOutBtn').click();document.querySelector('[data-student-signout]').click();});
 const check=p.locator('[data-signout-check]');await expect(check).toBeFocused();await expect(button).toBeDisabled();await check.click();await expect(check).toBeFocused();
 await p.addStyleTag({content:'html{font-size:200%!important}'});assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'32px');
 const colors=await p.locator('#accountSignOutMessage').evaluate(e=>{const b=e.querySelector('button'),c=getComputedStyle(e),s=getComputedStyle(b);return{background:c.backgroundColor,color:c.color,border:c.borderTopWidth,padding:c.paddingLeft,button:s.backgroundColor,buttonText:s.color,charset:document.characterSet,heading:document.querySelector('h1').textContent};});
 assert.deepEqual(colors,{background:'rgb(255, 255, 255)',color:'rgb(35, 57, 47)',border:'2px',padding:'32px',button:'rgb(40, 91, 69)',buttonText:'rgb(255, 255, 255)',charset:'UTF-8',heading:'Հաշիվ'});

 await expect(check).toHaveText('Ստուգել');await expect(check).toHaveAccessibleName('Ստուգել դուրս գալու կարգավիճակը՝ առանց կրկին դուրս գալու');
 const geometry=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))}));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/account-recovery-unknown-mobile-200.png',fullPage:true});await writeFile(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/account-recovery-geometry.json',JSON.stringify(geometry));}
 assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));await check.click();await expect(button).toBeEnabled();
 assert.equal(await p.evaluate(()=>window.__logout.calls.length),1);assert.deepEqual(await p.evaluate(()=>window.__logout.calls[0]),{scope:'global'});
 await expect(p.locator('#accountSignOutMessage')).toContainText('Այս դիտարկիչից դուրս եք եկել');
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/account-recovery-mobile-200.png',fullPage:true});}
 assert.deepEqual(errors,[]);
});
for(const mode of ['thrownActive','thrownCleared'])test(`${mode}: rejected logout is reconciled using local state`,async t=>{
 const {p,errors,button}=await fixture(t,{mode});await button.click();await expect(p.locator('#accountSignOutMessage')).toContainText(mode.endsWith('Cleared')?'Այս դիտարկիչից դուրս եք եկել':'Չհաջողվեց դուրս գալ');
 assert.equal(await p.evaluate(()=>window.__logout.calls.length),1);await expect(button).toBeEnabled();assert.deepEqual(errors,[]);
});
test('a new account during pending logout prevents old completion, warning and redirect',async t=>{
 const {p,errors,button}=await fixture(t,{mode:'returnedCleared',held:true,redirect:true});await button.click();await p.waitForFunction(()=>window.__logout.release);
 await p.evaluate(()=>{window.__logout.switchActor();window.__logout.release();});await expect(button).toBeEnabled();assert.equal(new URL(p.url()).pathname,'/fixture');assert.equal(await p.locator('#accountSignOutMessage').count(),0);assert.equal(await p.evaluate(()=>window.__logout.session.user.id),'actor-B');assert.deepEqual(errors,[]);
});
test('canceled account-form discard preserves edits and sends no logout request',async t=>{
 const {p,errors,button}=await fixture(t,{realPrivacy:true});await p.locator('#displayNameInput').fill('Unsaved synthetic account name');await p.evaluate(()=>window.__logout.canLeave=false);await button.click();
 assert.equal(await p.evaluate(()=>window.__logout.calls.length),0);await expect(p.locator('#displayNameInput')).toHaveValue('Unsaved synthetic account name');await expect(button).toBeEnabled();assert.deepEqual(errors,[]);
});
test('a stale terminal-session snapshot cannot sign out a newly active account',async t=>{
 const {p,errors}=await fixture(t,{mode:'success'});
 await p.evaluate(async()=>{window.__logout.switchActor();const {signOutAccount}=await import('./account-signout.mjs');window.__staleResult=await signOutAccount(window.__client,{expectedSession:{user:{id:'actor-A'},access_token:'synthetic-old'},scope:'local',redirect:'./index.html'});});
 assert.equal(await p.evaluate(()=>window.__staleResult),false);assert.equal(await p.evaluate(()=>window.__logout.calls.length),0);assert.equal(new URL(p.url()).pathname,'/fixture');assert.deepEqual(errors,[]);
});
test('temporary identity-check failure exposes an explicit keyboard-accessible retry without logout',async t=>{
 const {p,errors}=await fixture(t);await p.evaluate(async()=>{const {showSessionReadFailure}=await import('./account-signout.mjs');showSessionReadFailure(()=>window.__authRetries=(window.__authRetries||0)+1);});
 const button=p.getByRole('button',{name:'Կրկին ստուգել մուտքը'});await expect(button).toBeFocused();await button.press('Enter');assert.equal(await p.evaluate(()=>window.__authRetries),1);assert.equal(await p.evaluate(()=>window.__logout.calls.length),0);assert.deepEqual(errors,[]);
});

test('late account profile save cannot alter a newer account or resurrect old input/messages',async t=>{
 const {p,errors,button}=await fixture(t,{realPrivacy:true});await p.locator('#displayNameInput').fill('Old account unsaved name');await p.locator('#newEmailInput').fill('old@example.invalid');await p.locator('#saveNameBtn').click();await p.waitForFunction(()=>window.__logout.resolvePrivacy);
 await p.evaluate(()=>window.__logout.switchActor());await expect(p.locator('#displayNameInput')).toHaveValue('Other synthetic name');await expect(p.locator('#newEmailInput')).toHaveValue('');
 await p.evaluate(()=>window.__logout.resolvePrivacy({data:{profile:{display_name:'Old returned name'}},error:null}));
 await expect(p.locator('#nameMessage')).toHaveText('');await button.click();await expect(p.locator('#accountSignOutMessage')).toContainText('Չհաջողվեց դուրս գալ');
 assert.equal(await p.evaluate(()=>window.__logout.confirmations),0);await expect(p.locator('#displayNameInput')).toHaveValue('Other synthetic name');assert.deepEqual(errors,[]);
});
test('late email-change acknowledgement cannot erase a new account email field',async t=>{
 const {p,errors}=await fixture(t,{realPrivacy:true});await p.locator('#newEmailInput').fill('old@example.invalid');await p.locator('#changeEmailBtn').click();await p.waitForFunction(()=>window.__logout.resolveEmail);
 await p.evaluate(()=>window.__logout.switchActor());await expect(p.locator('#displayNameInput')).toHaveValue('Other synthetic name');await p.locator('#newEmailInput').fill('new@example.invalid');
 await p.evaluate(()=>window.__logout.resolveEmail({data:{user:{id:'actor-A'}},error:null}));
 await expect(p.locator('#newEmailInput')).toHaveValue('new@example.invalid');await expect(p.locator('#emailChangeMessage')).toHaveText('');await expect(p.locator('#changeEmailBtn')).toBeEnabled();assert.deepEqual(errors,[]);
});

for(const nextId of ['actor-B','actor-A'])test(`unknown logout followed by a newer ${nextId} login releases old controls without redirect`,async t=>{
 const {p,errors,button}=await fixture(t,{mode:'returnedCleared',readsFail:1});await button.click();await expect(p.locator('[data-signout-check]')).toBeVisible();await expect(button).toBeDisabled();
 await p.evaluate(nextId=>{window.__logout.session={user:{id:nextId},access_token:'synthetic-new'};window.__logout.emit('SIGNED_IN');},nextId);
 await expect(button).toBeEnabled();await expect(p.locator('#accountSignOutMessage')).toHaveCount(0);assert.equal(new URL(p.url()).pathname,'/fixture');
 await p.evaluate(()=>{window.__logout.mode='success';window.__logout.readsFail=0;});await button.click();assert.equal(await p.evaluate(async()=>await window.__result),true);assert.equal(await p.evaluate(()=>window.__logout.calls.length),2);assert.deepEqual(errors,[]);
});

test('failed shared account read has an explicit retry and never signs out a valid account',async t=>{
 const {p,errors}=await fixture(t,{realPrivacy:true,privacyFailure:true});await expect(p.locator('#content')).toBeHidden();assert.equal(await p.evaluate(()=>window.__logout.calls.length),0);
 await p.evaluate(()=>window.__logout.privacyFailure=false);await p.getByRole('button',{name:'Կրկին ստուգել մուտքը'}).click();await expect(p.locator('#content')).toBeVisible();await expect(p.locator('#accountSignOutMessage')).toHaveCount(0);assert.equal(await p.evaluate(()=>window.__logout.calls.length),0);assert.deepEqual(errors,[]);
});

for(const mode of ['returnedCleared','returnedActive'])test(`real shared account ${mode}: unknown logout notice retains Forest contrast outside private panels`,async t=>{
 const {p,errors,button}=await fixture(t,{realPrivacy:true,mode,readsFail:2});await button.click();await expect(p.locator('[data-signout-check]')).toBeFocused();
 const colors=await p.locator('#accountSignOutMessage').evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,button:getComputedStyle(e.querySelector('button')).backgroundColor}));
 assert.deepEqual(colors,{background:'rgb(255, 255, 255)',color:'rgb(35, 57, 47)',button:'rgb(40, 91, 69)'});
 if(mode==='returnedCleared')await expect(p.locator('#content')).toBeHidden();else await expect(p.locator('#content')).toBeVisible();
 assert.equal(await p.evaluate(()=>window.__logout.calls.length),1);assert.deepEqual(errors,[]);
});


for(const role of ['student','teacher','school_admin','admin','content_admin'])test(`real ${role} account retains visible keyboard logout at compact and enlarged sizes`,async t=>{
 const {p,errors,button}=await fixture(t,{realPrivacy:true,role,mode:'success'});
 await p.evaluate(()=>document.fonts.ready);
 const href=await p.locator('#accountHomeLink').getAttribute('href');
 for(const width of [1280,768,360,320])for(const scale of [100,200]){
  await p.setViewportSize({width,height:960});await p.evaluate(s=>document.documentElement.style.fontSize=s+'%',scale);
  await expect(button).toBeVisible();await button.focus();await expect(button).toBeFocused();
  const b=await button.evaluate(e=>({height:e.getBoundingClientRect().height,right:e.getBoundingClientRect().right,width:innerWidth}));assert.ok(b.height>=44&&b.right<=b.width+1);
  assert.equal(await p.locator('#accountHomeLink').getAttribute('href'),href,'the original role return destination stays intact');
  const geometry=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('main *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right}))}));
  if(geometry.scroll>geometry.width+1&&process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/navigation-account-failure-${role}-${width}-${scale}.png`});}
  assert.ok(geometry.scroll<=geometry.width+1,`${role}/${width}/${scale}: ${JSON.stringify(geometry)}`);
  assert.deepEqual(await p.evaluate(accountWordReadability),[],`${role}/${width}/${scale}: natural words`);
 }
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR&&role==='student'){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/navigation-student-account-320-200.png'});}
 await button.press('Enter');await expect(p.locator('h1')).toContainText('Մուտք գործել');assert.deepEqual(errors,[]);
});
