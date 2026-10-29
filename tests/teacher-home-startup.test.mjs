import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherHomeStartup} from '../web/teacher-home-startup.mjs';
const a='71000000-0000-4000-8000-000000000020',b='71000000-0000-4000-8000-000000000021';
const tick=()=>new Promise(setImmediate);
function setup(t,{role='teacher',status='active',session:initial,search='?view=home',fetcher}={}){
 const current=initial===undefined?{user:{id:a},access_token:'synthetic-a',expires_at:4000}:initial;
 const storage=new Map([['sb-project-auth-token',JSON.stringify(current)]]),tab=new Map([['haiedu:teacher-recent:v1:'+a,JSON.stringify([b])]]),calls=[],timers=new Set();
 storage.getItem=storage.get.bind(storage);tab.getItem=tab.get.bind(tab);
 const location={pathname:'/teacher.html',search};let deadline;
 const startup=createTeacherHomeStartup({url:'https://project.supabase.co',key:'synthetic-public',storage,tabStorage:tab,location,now:()=>1000,
  setTimer:fn=>{deadline=fn;timers.add(fn);return fn;},clearTimer:fn=>timers.delete(fn),
  fetchImpl:async(url,options)=>{calls.push({url:new URL(url),options});return fetcher?fetcher(url,options):new Response(JSON.stringify(new URL(url).pathname.includes('/rest/')?[{role,account_status:status}]:{teacher:{id:a},workspace:{version:'teacher-workspace-v1'}}));}});
 t.after(()=>startup?.cancel());
 return{startup,current,storage,tab,calls,location,timers,deadline:()=>deadline?.(),change:s=>storage.set('sb-project-auth-token',JSON.stringify(s))};
}
test('startup overlaps the SDK, keeps the role gate first, preserves exact context and is consumed once',async t=>{
 const f=setup(t,{search:'?view=home&queueAssignment='+b+'&todayWork='+a});await tick();
 assert.equal(f.calls.length,2);assert.equal(f.calls[0].url.pathname,'/rest/v1/profiles');assert.equal(f.calls[1].url.pathname,'/functions/v1/get-teacher-dashboard');
 assert.equal(f.calls[0].url.searchParams.get('select'),'role,account_status');assert.equal(f.calls[0].url.searchParams.get('id'),'eq.'+a);
 const expected={readMode:'directory',archive:false,workspace:{recent:[b],assignmentId:b,workId:a}};
 assert.deepEqual(JSON.parse(f.calls[1].options.body),expected);
 for(const c of f.calls){assert.equal(c.options.cache,'no-store');assert.equal(c.options.headers.Authorization,'Bearer synthetic-a');}
 const claimed=f.startup.claim(f.current);assert.equal((await claimed.profile).data.role,'teacher');assert.equal((await claimed.dashboard(expected)).data.teacher.id,a);
 assert.equal(f.startup.claim(f.current),null);assert.equal(f.timers.size,0);assert.equal(f.calls[0].options.signal.aborted,true);assert.equal(f.calls.length,2);
});
test('other roles and inactive teachers never start a teacher-data request',async t=>{
 for(const options of [{role:'student'},{role:'admin'},{role:'school_admin'},{role:'unknown'},{status:'suspended'}]){
  const f=setup(t,options);await tick();assert.equal(f.calls.length,1);assert.equal((await f.startup.claim(f.current).profile).data.role,options.role??'teacher');
 }
});
test('missing, malformed, near-expiry or invalid-actor sessions do not prefetch',async t=>{
 for(const session of [null,{}, {user:{id:a},access_token:'synthetic-a',expires_at:30},{user:{id:'forged'},access_token:'synthetic-a',expires_at:4000},{user:{id:a},access_token:'',expires_at:4000}]){
  const f=setup(t,{session});assert.equal(f.startup,null);await tick();assert.equal(f.calls.length,0);
 }
});
test('class, archive and other non-Home entry points keep the existing flow',async t=>{
 for(const search of ['?view=class','?class='+a,'?view=archive','?view=classes','?view=profile']){const f=setup(t,{search});assert.equal(f.startup,null);await tick();assert.equal(f.calls.length,0);}
});
test('a different SDK actor or refreshed token cannot claim an earlier read',async t=>{
 for(const session of [{user:{id:b},access_token:'synthetic-a'},{user:{id:a},access_token:'refreshed'},null]){const f=setup(t);assert.equal(f.startup.claim(session),null);await tick();assert.ok(f.calls.every(c=>!c.url.pathname.includes('/functions/')));}
});
test('storage/account changes while the profile is pending prevent the subsequent data read',async t=>{
 let release;const f=setup(t,{fetcher:()=>new Promise(resolve=>release=()=>resolve(new Response(JSON.stringify([{role:'teacher',account_status:'active'}]))))});await tick();
 f.change({user:{id:b},access_token:'new',expires_at:4000});release();await tick();assert.equal(f.calls.length,1);assert.equal(f.startup.claim(f.current),null);
});
test('a pending old dashboard cannot escape after account or token changes',async t=>{
 for(const session of [{user:{id:b},access_token:'new',expires_at:4000},{user:{id:a},access_token:'refreshed',expires_at:4000},null]){
  let release;const f=setup(t,{fetcher:url=>new URL(url).pathname.includes('/rest/')?new Response(JSON.stringify([{role:'teacher',account_status:'active'}])):new Promise(resolve=>release=()=>resolve(new Response(JSON.stringify({teacher:{id:a}}))))});
  await tick();const claimed=f.startup.claim(f.current);await claimed.profile;const result=claimed.dashboard({readMode:'directory',archive:false,workspace:{recent:[b]}});f.change(session);release();assert.equal(await result,null);
 }
});
test('changed URL or requested recent/work context cannot consume an earlier response',async t=>{
 const f=setup(t);await tick();const claim=f.startup.claim(f.current);assert.equal(await claim.dashboard({readMode:'directory',archive:false,workspace:{recent:[]}}),null);
 const g=setup(t);await tick();g.location.search='?view=home&todayWork='+b;assert.equal(g.startup.claim(g.current),null);
});
test('failed or ambiguous profiles fall back without authorizing a teacher data request',async t=>{
 for(const fetcher of [()=>new Response('[]'),()=>new Response('[{"role":"teacher","account_status":"active"},{"role":"teacher","account_status":"active"}]'),()=>new Response('unavailable',{status:503}),()=>new Response('{}',{status:401}),()=>{throw Error('synthetic offline');}]){
  const f=setup(t,{fetcher});await tick();assert.equal(await f.startup.claim(f.current).profile,null);assert.equal(f.calls.length,1);
 }
});
test('failed/foreign dashboard responses are never reused and the deadline aborts pending work',async t=>{
 for(const value of [new Response('{}',{status:403}),new Response('{}',{status:503}),new Response(JSON.stringify({teacher:{id:b}}))]){
  const f=setup(t,{fetcher:url=>new URL(url).pathname.includes('/rest/')?new Response('[{"role":"teacher","account_status":"active"}]'):value});await tick();assert.equal(await f.startup.claim(f.current).dashboard({readMode:'directory',archive:false,workspace:{recent:[b]}}),null);
 }
 const f=setup(t);await tick();f.deadline();assert.equal(f.startup.claim(f.current),null);assert.equal(f.timers.size,0);assert.ok(f.calls.every(c=>c.options.signal.aborted));
});
