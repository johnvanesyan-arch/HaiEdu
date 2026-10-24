import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture,id,token} from '../fixtures/learning-audio-api.mjs';
import {routeGovernedLearning} from '../../supabase/functions/_shared/governed-learning-runtime.mjs';
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});
after(async()=>{await browser?.close();});
async function setup(t,options={}){
 const f=await fixture(options);t.after(()=>f.db.close());
 const context={enrollmentId:id(371),curriculumReleaseId:id(501),unitId:id(511)};
 const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><main id="root"></main><script type="importmap">{"imports":{"tslib":"/sdk/tslib.mjs"}}</script><script type="module">
 import {mountLearningPlayer} from '/learning-player.mjs';
 import {FunctionsClient} from '/sdk/index.js';
 window.current=true;window.created=[];window.revoked=[];
 const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const u=create(blob);window.created.push(u);return u;};URL.revokeObjectURL=u=>{window.revoked.push(u);revoke(u);};
 const supabase={functions:new FunctionsClient(location.origin+'/functions',{headers:{Authorization:'Bearer ${token()}'}})};
 window.mount=()=>mountLearningPlayer({root:document.getElementById('root'),supabase,context:${JSON.stringify(context)},mode:'${options.assessed?'diagnostic':'practice'}',${options.assessed?'':`targetSkillId:'${id(521)}',`}isCurrent:()=>window.current,onComplete:()=>{}});window.dispose=window.mount();
 </script>`;
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://fixture.invalid');
   if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
   if(url.pathname==='/sdk/tslib.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile('node_modules/tslib/tslib.es6.mjs'));return;}
   if(/^\/sdk\/[a-zA-Z]+(?:\.js)?$/.test(url.pathname)){
    const file=url.pathname.slice(5).replace(/\.js$/,'')+'.js';
    res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile('node_modules/@supabase/functions-js/dist/module/'+file));return;
   }
   if(url.pathname.startsWith('/functions/')){
    const chunks=[];for await(const c of req)chunks.push(c);
    const request=new Request('https://fixture.invalid'+url.pathname,{method:'POST',headers:{Authorization:req.headers.authorization,'Content-Type':'application/json'},body:Buffer.concat(chunks)});
    const name=url.pathname.split('/').at(-1);
    let result;
    if(name==='get-learning-audio'){
     // Exercise captured media time against variable request arrival, using
     // the real browser player, Edge handler and SQL ledger.
     const body=JSON.parse(Buffer.concat(chunks));
     (f.audioActions??=[]).push(body.action);
     if(options.stateDelayMs&&body.action==='state'&&!f.stateDelayed){f.stateDelayed=true;await new Promise(resolve=>setTimeout(resolve,options.stateDelayMs));}
     if(body.action==='progress')await f.state.beforeProgress?.();
     if(options.progressJitter&&body.action==='progress'&&!f.progressDelayed){f.progressDelayed=true;await new Promise(resolve=>setTimeout(resolve,options.progressDelayMs??900));}
     result=await f.handle(request);
     (f.audioResults??=[]).push({action:body.action,status:result.status});
    }
    else{const routed=await routeGovernedLearning({admin:f.admin,studentId:id(10),token:token(),request,operation:{'start-learning-session':'start','get-mastery-check-status':'status','get-session-item':'item','submit-answer':'answer'}[name]});result=new Response(JSON.stringify(routed.body),{status:routed.status,headers:{'Content-Type':'application/json'}});}
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
   }
   if(!/^\/[a-z0-9-]+\.mjs$/.test(url.pathname)){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile('web'+url.pathname));
  }catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const bc=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>bc.close());
 const page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector(options.reading?'[data-task-set]':'.learning-audio');
 return {f,page,errors};
}

test('native private audio: failed load, actual WAV playback, normal speed, server completion and scoring',async t=>{
 const {f,page,errors}=await setup(t),count=Number((await f.db.query('select count(*) n from attempts')).rows[0].n);
 await expect(page.locator('button[type=submit]')).toBeDisabled();
 f.state.unavailable=true;await page.locator('.learning-audio button').click();await expect(page.locator('.learning-audio [role=status]')).toContainText('Կրկին բեռնեք');
 await expect(page.locator('button[type=submit]')).toBeDisabled();assert.equal(Number((await f.db.query('select count(*) n from attempts')).rows[0].n),count);
 f.state.unavailable=false;await page.locator('.learning-audio button').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
 await page.locator('audio').evaluate(async audio=>{audio.playbackRate=2;await audio.play();});
 await expect(page.locator('button[type=submit]')).toBeEnabled();assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1365,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('input[name=answer]').first().check();await page.locator('button[type=submit]').click();await expect(page.locator('[data-feedback]')).toContainText('Հաջորդը');
 assert.equal(Number((await f.db.query('select count(*) n from attempts')).rows[0].n),count+1);
 assert.deepEqual(await page.evaluate(()=>window.revoked),await page.evaluate(()=>window.created));assert.deepEqual(errors,[]);
});

test('shared reading set renders safe localized text, resumes in order and retains each question skill',async t=>{
 const {f,page,errors}=await setup(t,{taskSet:true,reading:true});
 await expect(page.locator('[data-task-set]')).toContainText('1/3');await expect(page.locator('#governedStimulus [lang=en]')).toContainText('<em>Plain text stays plain.</em>');
 assert.equal(await page.locator('#governedStimulus em').count(),0);
 for(const width of [390,1365]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.locator('input[name=answer]').first().check();await page.locator('button[type=submit]').click();
 await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();await expect(page.locator('[data-task-set]')).toContainText('2/3');
 await page.reload();await expect(page.locator('[data-task-set]')).toContainText('2/3');
 const assignments=(await f.db.query('select item_id,skill_id from learning_session_items where session_id=$1 order by ordinal',[f.session])).rows;
 assert.deepEqual(assignments.map(x=>x.item_id),f.set.items);assert.deepEqual(assignments.map(x=>x.skill_id),f.set.members.map(x=>x.skillId));assert.deepEqual(errors,[]);
});

test('shared listening set retains its source while each new question enforces verified playback',async t=>{
 const {f,page,errors}=await setup(t,{taskSet:true});
 await page.locator('.learning-audio button').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('audio').evaluate(a=>a.play());
 await expect(page.locator('button[type=submit]')).toBeEnabled();await page.locator('input[name=answer]').first().check();await page.locator('button[type=submit]').click();await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();
 await expect(page.locator('[data-task-set]')).toContainText('2/3');await expect(page.locator('button[type=submit]')).toBeDisabled();
 assert.equal((await f.db.query('select normalized_response from attempts where learning_session_id=$1',[f.session])).rows[0].normalized_response.taskSetEvidence.taskSetVersionId,f.set.setId);
 assert.deepEqual(await page.evaluate(()=>window.revoked),await page.evaluate(()=>window.created));assert.deepEqual(errors,[]);
});
test('native audio cleanup rejects late downloads and stops old playback on context disposal',async t=>{
 const {f,page,errors}=await setup(t);let release,started;
 const waiting=new Promise(r=>{started=r;});f.state.afterDownload=async()=>{started();await new Promise(r=>{release=r;});};
 await page.locator('.learning-audio button').click();await waiting;
 await page.evaluate(()=>{window.current=false;window.dispose();});release();
 await expect(page.locator('audio')).toHaveCount(0);
 await page.waitForLoadState('networkidle');assert.deepEqual(await page.evaluate(()=>window.created),[]);assert.deepEqual(errors,[]);
 assert.equal((await f.db.query('select completed_at from learning_audio_deliveries')).rows[0].completed_at,null);
});

test('assessed native player shows all questions, shares two plays across answers and persists them on refresh',async t=>{
 const {f,page,errors}=await setup(t,{assessed:true});
 await expect(page.locator('[data-audio-questions] > li')).toHaveCount(3);
 await expect(page.locator('button[type=submit]')).toBeDisabled();
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
 assert.equal(await page.locator('audio').evaluate(a=>a.controls),false);
 await page.locator('[data-audio-play]').dblclick();await expect(page.locator('[data-audio-count]')).toContainText('1/2');
 await expect(page.locator('button[type=submit]')).toBeEnabled();
 await page.locator('input[name=answer]').first().check();await page.locator('button[type=submit]').click();await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();
 await expect(page.locator('[data-audio-count]')).toContainText('1/2');await expect(page.locator('button[type=submit]')).toBeEnabled();
 await page.reload();await expect(page.locator('[data-audio-count]')).toContainText('1/2');
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();
 await expect(page.locator('[data-audio-count]')).toContainText('2/2');await expect(page.locator('[data-audio-play]')).toBeDisabled();
 await page.reload();await expect(page.locator('[data-audio-count]')).toContainText('2/2');await expect(page.locator('[data-audio-play]')).toBeDisabled();
 for(const width of [390,1365]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.equal((await f.db.query('select completed_plays from learning_assessed_audio')).rows[0].completed_plays,2);assert.deepEqual(errors,[]);
});

test('assessed native interruption resumes its checkpoint, prevents seeking/rate changes and has an unscored failure exit',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:3000}});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();
 await expect.poll(async()=>Number((await f.db.query('select position_ms from learning_assessed_audio')).rows[0]?.position_ms??0)).toBeGreaterThan(500);
 await page.locator('audio').evaluate(a=>{a.playbackRate=2;a.currentTime=0;});
 assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1);
 await page.getByRole('button',{name:'Դադարեցնել',exact:true}).click();
 const before=(await f.db.query('select play_id,position_ms,completed_plays from learning_assessed_audio')).rows[0];assert.ok(before.position_ms>=500);assert.equal(before.completed_plays,0);
 await page.reload();await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();
 // The click starts an asynchronous begin RPC; wait for the actual resumed position.
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(before.position_ms/1000);
 await expect(page.locator('[data-audio-count]')).toContainText('1/2');
 await page.reload();f.state.unavailable=true;await page.locator('[data-audio-play]').click();
 await expect(page.getByRole('button',{name:'Ավարտել՝ առանց գնահատման',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ավարտել՝ առանց գնահատման',exact:true}).click();
 await expect(page.locator('#root')).toContainText('Գնահատվող փորձ չի օգտագործվել');
 assert.equal((await f.db.query('select status from learning_sessions where id=$1',[f.session])).rows[0].status,'abandoned');
 assert.equal(Number((await f.db.query('select count(*) n from attempts where learning_session_id=$1',[f.session])).rows[0].n),0);assert.deepEqual(errors,[]);
});

test('assessed native real-time playback survives unequal checkpoint arrival delays',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:5000},progressJitter:true});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
 await page.locator('[data-audio-play]').click();
 await expect(page.locator('[data-audio-count]')).toContainText('1/2',{timeout:12000});
 const row=(await f.db.query('select completed_plays,failed_at,playback_anchor_at from learning_assessed_audio')).rows[0];
 assert.equal(row.completed_plays,1);assert.equal(row.failed_at,null);assert.equal(row.playback_anchor_at,null);assert.equal(f.progressDelayed,true);assert.deepEqual(errors,[]);
});

test('assessed player disposal discards a late blob without recording a play',async t=>{
 const {f,page,errors}=await setup(t,{assessed:true});let release,started;
 const waiting=new Promise(r=>{started=r;});f.state.afterDownload=async()=>{started();await new Promise(r=>{release=r;});};
 await page.locator('[data-audio-play]').click();await waiting;await page.evaluate(()=>{window.current=false;window.dispose();});release();
 await page.waitForLoadState('networkidle');assert.deepEqual(await page.evaluate(()=>window.created),[]);
 assert.equal((await f.db.query('select completed_plays from learning_assessed_audio')).rows[0].completed_plays,0);assert.deepEqual(errors,[]);
});

test('assessed playback accepts a successful 3.4-second checkpoint without a false interruption',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:6000},progressJitter:true,progressDelayMs:3400});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').dblclick();
 await expect(page.locator('[data-audio-count]')).toContainText('1/2',{timeout:15000});
 const row=(await f.db.query('select completed_plays,failed_at from learning_assessed_audio')).rows[0];
 assert.equal(row.completed_plays,1);assert.equal(row.failed_at,null);assert.equal(f.progressDelayed,true);
 assert.equal(f.audioActions.filter(x=>x==='begin').length,1);assert.equal(f.audioActions.filter(x=>x==='complete').length,1);assert.equal(f.audioActions.includes('failed'),false);assert.deepEqual(errors,[]);
});

test('pause during a delayed checkpoint stays paused and preserves the same uncharged play',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:6000},progressJitter:true,progressDelayMs:3400});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();
 await expect.poll(()=>f.progressDelayed).toBe(true);await page.getByRole('button',{name:'Դադարեցնել',exact:true}).click();
 await expect(page.locator('.assessed-audio [role=status]')).toContainText('Լսելը դադարեցված է',{timeout:10000});
 const row=(await f.db.query('select completed_plays,position_ms,play_id,lease_until,failed_at from learning_assessed_audio')).rows[0];
 assert.equal(row.completed_plays,0);assert.ok(row.position_ms>0);assert.ok(row.play_id);assert.equal(row.lease_until,null);assert.equal(row.failed_at,null);
 assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);assert.equal(f.audioActions.filter(x=>x==='pause').length,1);assert.equal(f.audioActions.includes('failed'),false);assert.deepEqual(errors,[]);
});

test('an expired server checkpoint resumes the same uncharged play through the normal control',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:10000},progressJitter:true,progressDelayMs:5500});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();
 await expect(page.getByRole('button',{name:'Ավարտել՝ առանց գնահատման',exact:true})).toBeVisible({timeout:15000});
 const row=(await f.db.query('select completed_plays,play_id,failed_at from learning_assessed_audio')).rows[0];
 assert.equal(row.completed_plays,0);assert.ok(row.play_id);assert.ok(row.failed_at);assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);
 assert.equal(f.audioActions.filter(x=>x==='failed').length,1);assert.equal(f.audioActions.includes('complete'),false);assert.deepEqual(errors,[]);
 assert.ok(f.audioResults.some(x=>x.action==='progress'&&x.status===409));
 await page.locator('[data-audio-play]').click();await expect(page.locator('[data-audio-count]')).toContainText('1/2',{timeout:15000});
 const resumed=(await f.db.query('select completed_plays,last_completed_play_id,failed_at from learning_assessed_audio')).rows[0];
 assert.equal(resumed.completed_plays,1);assert.equal(resumed.last_completed_play_id,row.play_id);assert.equal(resumed.failed_at,null);
 assert.equal(f.audioActions.filter(x=>x==='begin').length,2);assert.equal(f.audioActions.includes('cancel'),false);
});

test('a late assessed checkpoint cannot update a replacement player or add handlers',async t=>{
 const {f,page,errors}=await setup(t,{assessed:{durationMs:6000}});let release,started;
 const waiting=new Promise(resolve=>{started=resolve;});f.state.beforeProgress=async()=>{started();await new Promise(resolve=>{release=resolve;});};
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await page.locator('[data-audio-play]').click();await waiting;
 await page.evaluate(()=>{window.dispose();window.dispose=window.mount();});await expect(page.locator('.assessed-audio')).toHaveCount(1);release();
 await page.waitForLoadState('networkidle');await expect(page.locator('[data-audio-count]')).toContainText('0/2');await expect(page.locator('audio')).not.toHaveAttribute('src');
 assert.equal(f.audioActions.filter(x=>x==='begin').length,1);assert.equal(f.audioActions.filter(x=>x==='progress').length,1);assert.equal(f.audioActions.includes('failed'),false);
 assert.deepEqual(await page.evaluate(()=>window.revoked),await page.evaluate(()=>window.created));assert.deepEqual(errors,[]);
});

test('assessed player can load and play after a successful five-second initial state request',async t=>{
 const {f,page,errors}=await setup(t,{assessed:true,stateDelayMs:5000});
 await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/,{timeout:10000});
 await expect(page.locator('[data-audio-play]')).toBeEnabled();await page.locator('[data-audio-play]').click();
 await expect(page.locator('[data-audio-count]')).toContainText('1/2');
 assert.equal(f.stateDelayed,true);assert.equal(f.audioActions.includes('failed'),false);
 assert.equal(f.audioActions.filter(x=>x==='begin').length,1);assert.equal((await f.db.query('select completed_plays from learning_assessed_audio')).rows[0].completed_plays,1);assert.deepEqual(errors,[]);
});
