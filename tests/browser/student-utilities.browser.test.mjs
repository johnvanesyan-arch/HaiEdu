import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
async function fixture(t,{route='privacy.html',role='student',width=360}={}){
 const context=await browser.newContext({viewport:{width,height:1000}});t.after(()=>context.close());const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({role,register})=>{
  let session=register?null:{user:{id:'synthetic-student'}};const listeners=[];window.__calls=[];
  window.__signout=()=>{session=null;listeners.forEach(fn=>fn('SIGNED_OUT',null));};
  window.__client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),onAuthStateChange:fn=>listeners.push(fn)},functions:{invoke:async(name,{body})=>{
   window.__calls.push({name,body});if(name==='get-my-privacy')return {data:{account:{role,status:'active',email:'learner@example.invalid',displayName:'Փորձնական աշակերտ'},preferences:{},dataInventory:{learningSessions:4}}};
   throw Error('Unexpected mutation '+name);
  }}};
 },{role,register:route.includes('account-access')});
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.origin==='https://esm.sh')return r.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic";'});
  if(u.origin!=='https://utilities.test')return r.abort();
  try{const body=await readFile(new URL('../../web'+u.pathname,import.meta.url));return r.fulfill({body,contentType:/\.html$/.test(u.pathname)?'text/html':/\.(mjs|js)$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});}catch{return r.fulfill({status:404,body:''});}
 });
 await page.goto('https://utilities.test/'+route);
 await page.locator(route.includes('privacy')?'#content:not(.hidden)':route.includes('account-access')?(route.includes('register')?'#registerPanel:not(.hidden)':route.includes('reset')?'#resetPanel:not(.hidden)':'#loginPanel:not(.hidden)'):'#joinCode').waitFor();await page.evaluate(()=>document.fonts.ready);
 return {page,errors};
}
for(const route of ['privacy.html','join.html','account-access.html?view=register','account-access.html','account-access.html?view=reset'])for(const width of [320,768,1280])test(`student utility ${route} is Forest and usable at ${width}px`,async t=>{
 const {page,errors}=await fixture(t,{route,width});
 const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,canvas:getComputedStyle(document.body).backgroundColor,clipped:[...document.querySelectorAll('button,.button-link')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)}));
 assert.ok(m.scroll<=m.width+1,JSON.stringify(m));assert.deepEqual(m.clipped,[]);assert.equal(m.canvas,'rgb(245, 246, 239)');
 if(route.includes('privacy')){assert.equal(await page.locator('#signOutBtn').isVisible(),true);await page.getByRole('link',{name:'Մուտքի տվյալներ',exact:true}).click();assert.equal(new URL(page.url()).hash,'#accountSecurityTitle');}
 assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name!=='get-my-privacy')),false);assert.deepEqual(errors,[]);
});
test('shared account keeps staff presentation and removes learner theme on signout',async t=>{
 const staff=await fixture(t,{role:'teacher'});assert.equal(await staff.page.locator('body[data-haiedu-student]').count(),0);assert.equal(await staff.page.locator('.student-account-sections').isVisible(),false);
 const learner=await fixture(t);await learner.page.evaluate(()=>window.__signout());assert.equal(await learner.page.locator('body[data-haiedu-student]').count(),0);assert.equal(await learner.page.locator('#content').isVisible(),false);
 assert.deepEqual([...staff.errors,...learner.errors],[]);
});
