import {installV2,chapterShape,makeReady,launch,finish} from '../fixtures/assessment-v2-db.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {verifyChapterIIVisibleState} from '../../scripts/chapter-ii-pilot-read-acceptance.mjs';
import {acceptanceFixture,href,id} from '../fixtures/learning-acceptance.mjs';
import {installTyped,configureTyped} from '../fixtures/typed-fields-db.mjs';

let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});
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
 const baseline=await launch(f.db);
 await page.goto(origin+href(0));await page.waitForSelector('.course-active-session');
 const query=new URL(page.url()).searchParams;
 const selected={enrollmentId:query.get('enrollment'),curriculumReleaseId:query.get('release'),unitId:query.get('unit')};
 const saved=(await f.db.query('select answered_count,planned_item_count from learning_sessions where id=$1',[baseline.session.id])).rows[0];
 const active={answered:saved.answered_count,planned:saved.planned_item_count};
 await verifyChapterIIVisibleState({page,expect,activeSession:active,context:selected});
 // Wrong counts or routing must fail the same browser assertion used in production.
 await assert.rejects(verifyChapterIIVisibleState({page,expect:expect.configure({timeout:100}),activeSession:{...active,planned:8},context:selected}));
 await assert.rejects(verifyChapterIIVisibleState({page,expect,activeSession:active,context:{...selected,unitId:id(9999)}}));
 assert.equal(f.calls.filter(c=>c.name==='get-session-item'||c.name==='start-learning-session').length,0);
 await finish(f.db,baseline.session.id);await makeReady(f.db,policy.readinessSkillIds);
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

test('typed fields save and resume through real Edge/SQL, submit once, and report partial points on mobile',async t=>{
 const {f,page,origin,errors}=await fixture(t);
 await installV2(f.db);await installTyped(f.db);await configureTyped(f.db);
 await page.setViewportSize({width:390,height:844});await page.goto(origin+href(0,'diagnostic'));
 const colour=page.locator('[data-typed-field="colour"]'),manner=page.locator('[data-typed-field="manner"]');
 await colour.fill(' BLUE ');await manner.fill('most slowly');
 await page.waitForFunction(()=>document.querySelector('[data-draft-status]')?.textContent==='Սևագիրը պահպանված է։');
 assert.equal((await f.db.query('select count(*) n from attempts')).rows[0].n,0);
 await page.reload();await colour.waitFor();assert.equal(await colour.inputValue(),' BLUE ');assert.equal(await manner.inputValue(),'most slowly');
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.locator('#learningPlayer').screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/typed-fields-resumed-mobile.png'});}
 // Enter twice during the pending request cannot create two attempts.
 await page.evaluate(()=>{const form=document.querySelector('#learningPlayer form');form.requestSubmit();form.requestSubmit();});
 await page.getByRole('button',{name:'Հաջորդը',exact:true}).waitFor();
 assert.equal((await f.db.query('select count(*) n from attempts')).rows[0].n,1);
 assert.doesNotMatch(await page.locator('[data-feedback]').innerText(),/միավոր|1\/2/);
 await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();
 for(let n=1;n<3;n++){
  await colour.fill('blue');await manner.fill('');
  await page.getByRole('button',{name:'Ուղարկել պատասխանը',exact:true}).click();
  await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();
 }
 await page.getByRole('button',{name:'Թարմացնել արդյունքները',exact:true}).waitFor();
 assert.match(await page.locator('#learningPlayer').innerText(),/միավոր.*50%/);
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR)await page.locator('#learningPlayer').screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/typed-fields-points-mobile.png'});
 await page.getByRole('button',{name:'Թարմացնել արդյունքները',exact:true}).click();
 await page.waitForSelector('#courseHistoryTitle');assert.match(await page.locator('#courseContent').innerText(),/միավոր.*50%/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.equal((await f.db.query('select count(*) n from learning_response_drafts')).rows[0].n,0);
 assert.deepEqual(errors,[]);assert.deepEqual(f.logs,[]);
});

test('failed typed draft save keeps text and a retry submits the same text once',async t=>{
 const {f,page,origin,errors}=await fixture(t);await installV2(f.db);await installTyped(f.db);await configureTyped(f.db);
 let failNext=true;await page.route('**/functions/v1/submit-answer',async route=>{
  if(failNext&&route.request().postDataJSON().saveDraft){failNext=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'temporary_failure'})});}else await route.continue();
 });
 await page.goto(origin+href(0,'diagnostic'));await page.locator('[data-typed-field="colour"]').fill('blue');await page.locator('[data-typed-field="manner"]').fill('more slowly');
 await page.waitForFunction(()=>document.querySelector('[data-draft-status]')?.textContent.startsWith('Սևագիրը չի պահպանվել'));
 assert.equal(await page.locator('[data-typed-field="manner"]').inputValue(),'more slowly');assert.equal((await f.db.query('select count(*) n from attempts')).rows[0].n,0);
 await page.getByRole('button',{name:'Ուղարկել պատասխանը',exact:true}).click();await page.getByRole('button',{name:'Հաջորդը',exact:true}).waitFor();
 const rows=(await f.db.query('select response,score from attempts')).rows;assert.equal(rows.length,1);assert.equal(rows[0].response.fields.manner,'more slowly');assert.equal(Number(rows[0].score),1);assert.deepEqual(errors,[]);
});

test('typed content controls preserve explicit alternatives and render escaped learner labels',async t=>{
 const {page,origin,errors}=await fixture(t);
 await page.goto(origin+'/course.html');
 const value=await page.evaluate(async()=>{
  const {typedEditorMarkup,bindTypedEditor,collectTypedEditor}=await import('./typed-fields-editor.mjs');
  const {typedFieldsMarkup}=await import('./typed-fields-ui.mjs');
  const detail={item:{config:{responseDefinition:{schemaVersion:'haiedu-typed-fields-v1',layout:'short_answer',locale:'en',fields:[{id:'word',label:'<img src=x onerror=alert(1)>',maxLength:50}]}}},answerKey:{answer:{schemaVersion:'haiedu-typed-fields-v1',fields:{word:{accepted:['do not',"don't"],normalization:{trim:true,collapseWhitespace:false,apostrophes:true,caseMode:'sensitive'}}}}}};
  const root=document.createElement('section');document.body.appendChild(root);root.innerHTML=typedEditorMarkup(detail);bindTypedEditor(root);
  const saved=collectTypedEditor(root),preview=document.createElement('section');preview.innerHTML=typedFieldsMarkup(saved.definition,null,true);root.appendChild(preview);
  const escaped=preview.querySelector('img')===null&&preview.textContent.includes('<img');
  root.querySelector('[data-add-typed]').click();const added=root.querySelectorAll('[data-typed-editor-row]').length;
  root.querySelectorAll('[data-remove-typed]')[1].click();
  return {saved,escaped,added,rows:root.querySelectorAll('[data-typed-editor-row]').length};
 });
 assert.deepEqual(value.saved.key.fields.word.accepted,['do not',"don't"]);assert.equal(value.escaped,true);assert.equal(value.added,2);assert.equal(value.rows,1);assert.deepEqual(errors,[]);
});
