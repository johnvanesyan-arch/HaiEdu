import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {acceptanceFixture,href,id} from '../fixtures/learning-acceptance.mjs';

let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();});

async function fixture(t) {
 const f=await acceptanceFixture();t.after(()=>f.close());
 // This component harness omits the global shell/UX controller. Disable its
 // cross-document transition opt-in as well; application errors stay asserted.
 const html=(await readFile('web/course.html','utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</head>','<style>@view-transition { navigation: none; }</style></head>').replace('</body>','<script type="module" src="./course-page.js"></script></body>');
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://isolated.invalid');
   if(url.pathname.startsWith('/functions/v1/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const response=await f.request(url.pathname.split('/').at(-1),JSON.parse(Buffer.concat(chunks).toString()||'{}'),req.headers.authorization?.replace(/^Bearer /,''));
    res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());return;
   }
   if(url.pathname==='/course.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
   if(!/^\/[a-zA-Z0-9_./-]+\.(?:js|mjs|css|svg|png|ico)$/.test(url.pathname)||url.pathname.includes('..')){res.writeHead(404);res.end();return;}
   const data=await readFile('web'+url.pathname);res.writeHead(200,{'Content-Type':/\.(?:mjs|js)$/.test(url.pathname)?'text/javascript':url.pathname.endsWith('.css')?'text/css':'image/svg+xml'});res.end(data);
  }catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(error.message)}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const origin='http://127.0.0.1:'+server.address().port;
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({token,student})=>{
  window.__listeners=[];window.__client={auth:{getSession:async()=>({data:{session:{user:{id:student}}}}),onAuthStateChange:fn=>window.__listeners.push(fn)},functions:{invoke:async(name,{body})=>{
   const response=await fetch('/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
   const data=await response.json();return {data:response.ok?data:null,error:response.ok?null:data};
  }}};
 },{token:f.defaultToken,student:id(10)});
 await page.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'}));
 await page.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="http://isolated.invalid";export const SUPABASE_PUBLISHABLE_KEY="fixture";'}));
 return {f,page,errors,origin};
}

test('native course, actual Edge handlers and real SQL complete independent baselines in four contexts',async t=>{
 const {f,page,origin,errors}=await fixture(t);
 for(let idx=0;idx<4;idx++){
  await page.goto(origin+href(idx));await page.waitForSelector('#courseContent article');
  assert.match(await page.locator('#courseTitle').innerText(),idx<2?/Առարկա Ա/:/Առարկա Բ/);
  const cards=page.locator('#courseContent article');assert.match(await cards.nth(0).innerText(),new RegExp(`${idx===3?5:3} հարց`));
  assert.equal(await cards.nth(1).locator('a').count(),0);
  await cards.nth(0).locator('a').click();
  for(let n=0;n<(idx===3?5:3);n++){
   await page.waitForFunction(position=>document.querySelector('#learningPlayer h2')?.textContent.startsWith('Հարց '+position+'/'),n+1);
   await page.locator('#learningPlayer input[name=answer]').first().check();
   await page.locator('#learningPlayer button[type=submit]').click();
   await page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'}).click();
  }
  await page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'}).click();
  await page.waitForSelector('#courseContent article');
  assert.equal(new URL(page.url()).searchParams.has('action'),false);
  assert.equal(await page.locator('#courseContent article').nth(0).locator('a').count(),0);
  assert.equal(await page.locator('#courseContent article').nth(1).locator('a').count(),1);
 }
 const sessions=(await f.db.query("select * from learning_sessions where mode='diagnostic'")).rows;
 assert.equal(sessions.length,4);assert.ok(sessions.every(s=>s.status==='completed'));assert.equal(new Set(sessions.map(s=>s.governed_unit_id)).size,4);
 assert.equal(f.calls.filter(c=>c.name==='start-learning-session').length,4);assert.deepEqual(errors,[]);assert.deepEqual(f.logs,[]);
});

test('native switching and revoked SQL authorization cannot expose another chapter or create practice evidence',async t=>{
 const {f,page,origin,errors}=await fixture(t);
 for(const idx of [0,1,2,3]){
  await page.goto(origin+href(idx));await page.waitForSelector('#courseContent article');
  assert.match(await page.locator('#courseTitle').innerText(),idx%2?/Գլուխ Բ/:/Գլուխ Ա/);
  assert.match(await page.locator('#courseContent article').nth(1).innerText(),/Նախ ավարտեք այս գլխի ախտորոշիչը/);
 }
 await f.db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(373)]);
 await page.goto(origin+href(3,'practice'));
 await page.waitForFunction(()=>document.getElementById('courseContent').textContent.includes('Ընտրված դասընթացն այս պահին հասանելի չէ'));
 assert.equal((await f.db.query('select count(*) n from learning_sessions')).rows[0].n,0);
 assert.doesNotMatch(await page.locator('#courseContent').innerText(),/5 հարց/);
 await page.evaluate(()=>window.__listeners.forEach(fn=>fn('SIGNED_OUT',null)));
 assert.equal(await page.locator('#courseContent').innerText(),'');assert.deepEqual(errors,[]);
});
