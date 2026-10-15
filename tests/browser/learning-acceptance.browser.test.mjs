import {installV2,chapterShape,makeReady,launch,finish} from '../fixtures/assessment-v2-db.mjs';
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
 // Keep the real production styles; the full-shell suite separately covers
 // cross-document navigation. Include the stylesheet normally inserted by the
 // omitted student shell. Application errors remain asserted in both.
 const html=(await readFile('web/course.html','utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</head>','<link rel="stylesheet" href="./responsive-qa.css"></head>').replace('</body>','<script type="module" src="./course-page.js"></script></body>');
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


test('v2 native player and history show the 10/2/4 scales and preserve mandatory-only readiness',async t=>{
 const {f,page,origin,errors}=await fixture(t);
 await installV2(f.db);const {skills,policy}=await chapterShape(f.db);
 const baseline=await launch(f.db);await finish(f.db,baseline.session.id);await makeReady(f.db,policy.readinessSkillIds);
 await page.goto(origin+href(0));await page.waitForSelector('#courseContent article');
 const mastery=page.locator('#courseContent article').nth(2);
 assert.match(await mastery.innerText(),/գնահատվող 10 հարցից առնվազն 8/);
 await mastery.locator('a').click();
 const remaining=Object.fromEntries(skills.map((s,n)=>[s,[2,0,2,2,0,2,0,0][n]]));
 for(let n=0;n<16;n++){
  await page.waitForFunction(position=>document.querySelector('#learningPlayer h2')?.textContent.startsWith('Հարց '+position+'/'),n+1);
  const li=(await f.db.query("select li.id,li.skill_id,o.canonical_option_order from learning_session_items li join learning_sessions s on s.id=li.session_id join private.learning_session_item_option_orders o on o.session_item_id=li.id where s.mode='mastery_check' and s.status='active' and li.answered_at is null order by li.ordinal limit 1")).rows[0];
  const correct=remaining[li.skill_id]>0;if(correct)remaining[li.skill_id]--;
  const value=String.fromCharCode(65+li.canonical_option_order.indexOf(correct?'A':'B'));
  await page.locator(`#learningPlayer input[value="${value}"]`).check();await page.locator('#learningPlayer button[type=submit]').click();
  assert.doesNotMatch(await page.locator('#learningPlayer').innerText(),/8\/10|0\/2|0\/4/);
  await page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'}).click();
 }
 await page.waitForSelector('#learningPlayer button');
 await page.waitForFunction(()=>document.querySelector('#learningPlayer').textContent.includes('Ստուգարքն անցած է'));
 const result=await page.locator('#learningPlayer').innerText();assert.match(result,/8\/10/);assert.match(result,/Օժանդակ հմտություններ՝ 0\/2/);assert.match(result,/Լրացուցիչ վերջնարդյունքներ՝ 0\/4/);
 await page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'}).click();await page.waitForSelector('#courseHistoryTitle');
 assert.match(await page.locator('#courseContent').innerText(),/Պարտադիր վերջնարդյունքներ՝ 8\/10/);
 await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(errors,[]);assert.deepEqual(f.logs,[]);
});
