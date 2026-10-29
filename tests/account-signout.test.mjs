import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {isTerminalAuthError} from '../web/account-signout.mjs';

// Real pinned Auth SDK with an isolated HTTP transport, not production Auth.
for(const status of [401,500])test(`pinned SDK logout HTTP ${status}: reconcile local removal separately from remote error`,async()=>{
 const calls=[];const actor='92000000-0000-4000-8000-000000000001';
 const jwt=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:actor,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),Buffer.from('synthetic').toString('base64url')].join('.');
 const client=createClient('https://auth-fixture.invalid','synthetic-public',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(url,init)=>{
  calls.push({path:new URL(url).pathname,method:init.method});
  if(new URL(url).pathname.endsWith('/user'))return new Response(JSON.stringify({id:actor,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid'}),{status:200});
  assert.match(new URL(url).pathname,/\/logout$/);assert.equal(new URL(url).searchParams.get('scope'),'global');
  return new Response(JSON.stringify({code:status===401?'bad_jwt':'unexpected_failure',msg:'Synthetic failure'}),{status,headers:{'Content-Type':'application/json'}});
 }}});
 const events=[];const {data:{subscription}}=client.auth.onAuthStateChange(event=>events.push(event));
 assert.equal((await client.auth.setSession({access_token:jwt,refresh_token:'synthetic-refresh'})).error,null);
 assert.ok((await client.auth.getSession()).data.session);
 const result=await client.auth.signOut({scope:'global'});
 assert.equal(Boolean(result.error),status===500);assert.equal((await client.auth.getSession()).data.session,null);
 assert.equal(calls.filter(c=>c.path.endsWith('/logout')).length,1);assert.ok(events.includes('SIGNED_OUT'));subscription.unsubscribe();
});
test('transient identity errors do not qualify for terminal-session cleanup',()=>{
 for(const error of [{code:'unexpected_failure',status:500},{code:'over_request_rate_limit',status:429},{name:'AuthRetryableFetchError'},new Error('offline')])assert.equal(isTerminalAuthError(error),false);
 for(const code of ['session_expired','session_not_found','user_banned','bad_jwt'])assert.equal(isTerminalAuthError({code}),true);
});
test('all interactive logout consumers use the shared outcome controller; only guarded terminal cleanup stays direct',()=>{
 const consumers=['privacy.js','teacher.js','physics-7.js','school-admin.js','school-teacher.js','admin.js','admin-security.js','content.js','content-guides.js','content-materials.js','content-misconceptions.js','content-workspace.js','role-router.js','student-signout.mjs'];
 for(const name of consumers){const s=readFileSync('web/'+name,'utf8');assert.match(s,/signOutAccount\(/,name);assert.doesNotMatch(s,/\.auth\.signOut\(/,name);}
 for(const name of ['practice.js','progress.js','physics-7.js']){const s=readFileSync('web/'+name,'utf8');assert.match(s,/isTerminalAuthError\(userError\)/);assert.match(s,/expectedSession: sessionData.session/);}
 assert.doesNotMatch(readFileSync('web/ux.js','utf8'),/localStorage.removeItem/);
});

test('all three legacy learner startup checks retain sessions on transient identity failure',async()=>{
 const vm=await import('node:vm'),ts=(await import('typescript')).default;
 for(const name of ['practice.js','progress.js','physics-7.js']){
  const s=readFileSync('web/'+name,'utf8'),ast=ts.createSourceFile(name,s,ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='initialize').getText(ast);
  let signouts=0,retries=0,reads=0;
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'},access_token:'synthetic'}}}),getUser:async()=>({data:{user:null},error:{code:'unexpected_failure',status:503}})}};
  const ctx=vm.createContext({supabase:client,isChapterReview:false,readPracticeBootstrap:()=>null,isTerminalAuthError,signOutAccount:()=>signouts++,showSessionReadFailure:()=>retries++,retryInitialize(){},loadProgress:()=>reads++,loadSubject:()=>reads++,window:{location:{replace(){throw Error('Unexpected redirect');}}}});
  await vm.runInContext(fn+';initialize()',ctx);assert.equal(signouts,0,name);assert.equal(reads,0,name);assert.equal(retries,1,name);
 }
});
