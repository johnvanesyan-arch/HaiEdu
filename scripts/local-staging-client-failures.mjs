// Real local Auth + Edge + PostgreSQL collector, with controlled page failures.
// No GitHub mutation occurs: the final publisher uses a recording test adapter.
import assert from 'node:assert/strict';
import {dashboardReady} from './local-staging-dashboard-checks.mjs';
import {validateClientFailure} from '../web/client-failure-contract.mjs';

export async function runClientFailureJourney({page,fixture,target,manifest,check}){
 const driver=target.frontendOrigin+manifest.entries['client-failure-test.mjs'];
 const received=[];const payloads=[];
 page.on('request',request=>{if(request.url()===target.backendOrigin+'/functions/v1/record-client-failure')payloads.push(request.postDataJSON());});
 page.on('response',response=>{if(response.url()===target.backendOrigin+'/functions/v1/record-client-failure')received.push(response.status());});
 for(const account of fixture.accounts){
  await page.goto(target.frontendOrigin+'/account-access');
  await page.locator('#loginEmail').fill(account.email);await page.locator('#loginPassword').fill(account.password);
  await page.locator('#loginForm button[type="submit"]').click();
  const destination={student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin',admin:'/admin.html',content_admin:'/content.html'}[account.role];
  await page.waitForURL(target.frontendOrigin+destination,{timeout:20000});
  if(['student','teacher','school_admin'].includes(account.role))await dashboardReady(page,account,fixture.schools.find(s=>s.label===account.school),fixture.schools.find(s=>s.label!==account.school));
  await page.waitForFunction(()=>Boolean(window.__haieduSupabaseClient));
  await page.evaluate(async driver=>{window.bf22=await import(driver);},driver);
  const start=received.length;
  const route={student:'get-student-dashboard',teacher:'get-teacher-workspace',school_admin:'get-school-admin-overview',admin:'get-admin-dashboard',content_admin:'get-content-quality-dashboard'}[account.role];
  const pattern=target.backendOrigin+'/functions/v1/'+route;
  await page.route(pattern,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'private-answer-canary'})}));
  const transportResponse=page.waitForResponse(r=>r.url().endsWith('/functions/v1/record-client-failure')&&r.status()===204);
  await page.evaluate(async route=>{
   const client=window.__haieduSupabaseClient;
   const original=await window.bf22.invoke(client,route,{body:{answer:'private-answer-canary',email:'private@example.invalid'}});
   if(!original.error)throw Error('expected_injected_failure');
   await window.bf22.invoke(client,route,{body:{}});
  },route);
  await transportResponse;
  await page.unroute(pattern);
  assert.equal(received.length-start,1,'related transport failures deduplicated');
  const answerPattern=target.backendOrigin+'/functions/v1/submit-answer';let writes=0;
  await page.route(answerPattern,r=>{writes++;return r.fulfill({status:503,contentType:'application/json',body:'{"error":"private-answer-canary"}'});});
  const answerResponse=page.waitForResponse(r=>r.url().endsWith('/functions/v1/record-client-failure')&&r.status()===204);
  await page.evaluate(async()=>{
   const request=window.bf22.answer(window.__haieduSupabaseClient,'submit-answer',{body:{answer:'private-answer-canary',requestId:crypto.randomUUID()}});
   const result=await request.send();if(!result.error?.unknown||!request.uncertain)throw Error('uncertain_write_changed');
  });await answerResponse;assert.equal(writes,1);await page.unroute(answerPattern);
  const audioResponse=page.waitForResponse(r=>r.url().endsWith('/functions/v1/record-client-failure')&&r.status()===204);
  await page.evaluate(()=>window.bf22.invalidAudio(window.__haieduSupabaseClient));await audioResponse;
  const exceptionResponse=page.waitForResponse(r=>r.url().endsWith('/functions/v1/record-client-failure')&&r.status()===204);
  await page.evaluate(()=>window.bf22.failOwned());await exceptionResponse;
  const playbackResponse=page.waitForResponse(r=>r.url().endsWith('/functions/v1/record-client-failure')&&r.status()===204);
  await page.evaluate(()=>window.bf22.failAudio());await playbackResponse;
  assert.equal(received.length-start,5);assert.ok(payloads.slice(-5).every(validateClientFailure));
  assert.doesNotMatch(JSON.stringify(payloads),/canary|private@|access_token|password|requestId/);
  const retained=await page.evaluate(async()=>{const client=window.__haieduSupabaseClient;const value=(await client.auth.getSession()).data.session.access_token;await client.auth.signOut({scope:'local'});return value;});
  // Synthetic fixture token remains private in this test process, never evidence.
  const rejection=await page.context().request.post(target.backendOrigin+'/functions/v1/record-client-failure',{headers:{apikey:fixture.anonKey,authorization:'Bearer '+retained},data:{...payloads.at(-1),eventId:crypto.randomUUID()}});
  assert.equal(rejection.status(),401);
  check('real local collector: '+account.role+' '+account.school+' five fixed failure kinds and revoked session refused');
 }
 assert.equal(received.filter(status=>status===204).length,fixture.accounts.length*5);
 return {roles:[...new Set(fixture.accounts.map(a=>a.role))],reports:payloads.length,accepted:received.filter(s=>s===204).length,privacyCanariesAbsent:true};
}

export const clientFailureDriver=`
import {invokeRateAware} from './rate-budget-feedback.mjs';
import {createAnswerRequest} from './answer-response-recovery.mjs';
import {beginClientFailure} from './client-failure-reporter.mjs';
import {decodeLearningAudio,mountLearningAudio} from './learning-audio.mjs';
export {invokeRateAware as invoke,createAnswerRequest as answer};
export function invalidAudio(client){try{decodeLearningAudio({},new Response('{}'),'load',beginClientFailure(client,'audio_load'));}catch{}}
export function failOwned(){setTimeout(()=>{throw Error('private-password-canary');},0);}
export function failAudio(){const root=document.createElement('div');document.body.append(root);const dispose=mountLearningAudio({root,stimulus:{title:'Synthetic audio'},context:{itemId:'synthetic'},invoke:async()=>new Blob(['not audio'],{type:'audio/wav'})});root.querySelector('button').click();setTimeout(()=>{dispose();root.remove();},3000);}
`;
