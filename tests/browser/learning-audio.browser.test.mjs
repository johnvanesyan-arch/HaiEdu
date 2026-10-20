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
async function setup(t){
 const f=await fixture();t.after(()=>f.db.close());
 const context={enrollmentId:id(371),curriculumReleaseId:id(501),unitId:id(511)};
 const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><main id="root"></main><script type="importmap">{"imports":{"tslib":"/sdk/tslib.mjs"}}</script><script type="module">
 import {mountLearningPlayer} from '/learning-player.mjs';
 import {FunctionsClient} from '/sdk/index.js';
 window.current=true;window.created=[];window.revoked=[];
 const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const u=create(blob);window.created.push(u);return u;};URL.revokeObjectURL=u=>{window.revoked.push(u);revoke(u);};
 const supabase={functions:new FunctionsClient(location.origin+'/functions',{headers:{Authorization:'Bearer ${token()}'}})};
 window.dispose=mountLearningPlayer({root:document.getElementById('root'),supabase,context:${JSON.stringify(context)},mode:'practice',targetSkillId:'${id(521)}',isCurrent:()=>window.current,onComplete:()=>{}});
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
    if(name==='get-learning-audio')result=await f.handle(request);
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
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.learning-audio');
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
test('native audio cleanup rejects late downloads and stops old playback on context disposal',async t=>{
 const {f,page,errors}=await setup(t);let release,started;
 const waiting=new Promise(r=>{started=r;});f.state.afterDownload=async()=>{started();await new Promise(r=>{release=r;});};
 await page.locator('.learning-audio button').click();await waiting;
 await page.evaluate(()=>{window.current=false;window.dispose();});release();
 await expect(page.locator('audio')).toHaveCount(0);
 await page.waitForLoadState('networkidle');assert.deepEqual(await page.evaluate(()=>window.created),[]);assert.deepEqual(errors,[]);
 assert.equal((await f.db.query('select completed_at from learning_audio_deliveries')).rows[0].completed_at,null);
});
