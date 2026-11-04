import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {scoringDatabase,id,actor} from '../fixtures/answer-scoring-db.mjs';
import {installAnswerRecovery} from '../fixtures/answer-recovery-db.mjs';
import {endpoint} from '../fixtures/phase3-endpoint-harness.mjs';
import {routeGovernedLearning} from '../../supabase/functions/_shared/governed-learning-runtime.mjs';
import {gradeAnswer} from '../../supabase/functions/_shared/grading.ts';
import {recommendNext} from '../../supabase/functions/_shared/recommendation.ts';
import {getPracticeDiagnosticBlock} from '../../supabase/functions/_shared/practice-diagnostic-gate.ts';

// Native DOM/event loop + pinned FunctionsClient + actual handlers and receipt SQL.
// Startup/Auth/course entitlement are explicit synthetic inputs; no production data.
let browser,sdk;
before(async()=>{
  browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});
  sdk=(await build({stdin:{contents:"export {FunctionsClient} from '@supabase/functions-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',write:false})).outputFiles[0].text;
});
after(async()=>{await browser?.close();});
function fn(source,name){
  const start=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(source);assert.ok(start,name);
  const rest=source.slice(start.index),end=/\n(?:async )?function \w+\(/.exec(rest);return end?rest.slice(0,end.index):rest;
}
for(const [file,handler,mode] of [['app.js','submitAnswer','practice'],['practice.js','submitAnswer','practice'],['diagnostic.js','submit','diagnostic'],['mastery.js','submit','mastery_check']]){
  test(`native ${file} retries the identical committed answer and restores its feedback`,async t=>{
    const db=await scoringDatabase();t.after(()=>db.close());await installAnswerRecovery(db,{legacy:true});
    await db.query('update learning_sessions set mode=$1,planned_item_count=$2 where id=$3',[mode,mode==='mastery_check'?2:1,id(401)]);
    const bindings={routeGovernedLearning,gradeAnswer,recommendNext,getPracticeDiagnosticBlock,fixtureAuthSessionId:id(901),hasPhysics7Access:async()=>true};
    const answer=await endpoint(db,'submit-answer',bindings);
    const mastery=await endpoint(db,'submit-mastery-answer',{...bindings,fetch:async(_url,options)=>{
      const result=await answer.call(JSON.parse(options.body));return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json'}});
    }});
    const source=await readFile('web/'+file,'utf8'),calls=[];
    const module=`import {FunctionsClient} from '/sdk.mjs';
      import {createAnswerRequest,showAnswerRecovery,clearAnswerRecovery} from '/answer-response-recovery.mjs';
      const supabase={functions:new FunctionsClient(location.origin+'/functions/v1'),auth:{getSession:async()=>({data:{session:{user:{id:${JSON.stringify(actor)}}}}})}};
      const $=id=>document.getElementById(id),answerForm=$('answerForm'),submitBtn=$('submitBtn'),nextBtn=$('nextBtn'),feedback=$('feedback');
      let currentSession={id:${JSON.stringify(id(401))}},current={sessionItemId:${JSON.stringify(id(601))},item:{id:${JSON.stringify(id(501))},type:'numeric'},session:{position:1,total:2,mode:${JSON.stringify(mode)}}};
      let answerSubmission=null,questionStartedAt=performance.now(),startedAt=questionStartedAt;
      function updateMastery(){} async function recordRecommendationTelemetry(){} async function status(){throw Error('Unexpected final-status read');} function renderFinalResult(){} function showGate(){throw Error('Unexpected gate');}
      ${['collectResponse',...(file==='practice.js'?['escapeHtml','lockAnswerControls','handleDiagnosticGateError']:[]),handler].map(name=>fn(source,name)).join('\n')}
      answerForm.addEventListener('submit',${handler});`;
    const html=`<!doctype html><html lang="hy"><meta charset="utf-8"><style>.hidden{display:none}</style><main>
      <form id="answerForm"><div id="answerArea"><label>Պատասխան<input id="numericAnswer" value="5" required></label></div><button id="submitBtn" type="submit">Ստուգել պատասխանը</button></form>
      <div id="feedback" role="status"></div><button id="nextBtn" ${['diagnostic','mastery_check'].includes(mode)?'class="hidden"':'disabled'}>Հաջորդ հարց</button>
      <div id="progressBar"></div><div id="sessionProgressBar"></div><p id="nextExplanation"></p></main><script type="module" src="/fixture.mjs"></script></html>`;
    const server=createServer(async(req,res)=>{
      try{
        const path=new URL(req.url,'http://isolated.invalid').pathname;
        if(path.startsWith('/functions/v1/')){
          const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());calls.push(body);
          const result=await(path.endsWith('submit-mastery-answer')?mastery:answer).call(body);
          res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));return;
        }
        const text=path==='/sdk.mjs'?sdk:path==='/fixture.mjs'?module:path==='/answer-response-recovery.mjs'?await readFile('web/answer-response-recovery.mjs','utf8'):html;
        res.writeHead(200,{'Content-Type':path.endsWith('.mjs')?'text/javascript':'text/html'});res.end(text);
      }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
    const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    let lost=false;await page.route('**/functions/v1/**',async route=>{const response=await route.fetch();if(!lost&&response.status()===200){lost=true;await route.abort('failed');}else await route.fulfill({response});});
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#submitBtn').click();
    await expect(page.locator('#feedback')).toContainText('գրանցումը դեռ հաստատված չէ');
    assert.equal(await page.locator('#numericAnswer').isDisabled(),true);
    await expect(page.locator('#submitBtn')).toHaveText('Կրկին փորձել');
    await page.locator('#submitBtn').click();
    await expect(page.locator('#nextBtn')).toBeEnabled();
    await expect(page.locator('#feedback')).not.toContainText('Edge Function');
    assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
    assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,1);
    assert.equal((await db.query('select evidence_count from student_skill_mastery')).rows[0].evidence_count,1);
    assert.deepEqual(errors,[]);
  });
}
