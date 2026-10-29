import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(path,'utf8');

// Exercise the shipped check, including a delayed error after token refresh.
async function check({error=null,throws=false,sessionThrows=false,nextSession,anonymous=false}={}) {
 const session={user:{id:'teacher-test'},access_token:'synthetic-access-token'};
 const calls={signOut:[],removed:[],redirects:[],messages:[],stored:[]};let reads=0;
 const client={auth:{
  getSession:async()=>{if(sessionThrows)throw new Error('offline');return {data:{session:anonymous?null:reads++===0?session:nextSession===undefined?session:nextSession}};},
  getUser:async()=>{if(throws)throw new Error('network interrupted');return {data:{user:error?null:session.user},error};},
  signOut:async opts=>{calls.signOut.push({...opts});},
 }};
 const source=read('web/ux.js').replace(/^import .*;\n/gm,'').split('\nfunction showTerminalAuthMessage()')[0];
 const ctx=vm.createContext({window:{__haieduSupabaseClient:client},location:{pathname:'/teacher',replace:u=>calls.redirects.push(u),reload:()=>calls.redirects.push('reload')},createClient:()=>client,SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',localStorage:{removeItem:k=>calls.removed.push(k)},sessionStorage:{setItem:(k,v)=>calls.stored.push([k,v])},URL});
 vm.runInContext(source,ctx);ctx.report=(...args)=>calls.messages.push(args);vm.runInContext('announce = report;',ctx);
 calls.result=await vm.runInContext('handleTerminalAuthFailure()',ctx);return calls;
}
test('teacher header returns directly to its home view',()=>{
 const header=read('web/teacher.html').split('<div class="teacher-header-actions">')[1].split('</div>')[0];
 assert.match(header,/href="\.\/teacher\.html\?view=home">Ուսուցչի գլխավոր էջ/);
 assert.doesNotMatch(header,/href="\.\/index\.html"/);
 assert.match(header,/id="signOutBtn"/);
});
test('staff branding targets the correct workspace home',()=>{
 const source=read('web/role-layout.js').split('\nfunction syncTeacherSections()')[0];
 for(const [page,expected] of Object.entries({teacher:'./teacher.html?view=home',school:'./school-admin.html',schoolTeacher:'./school-admin.html',platform:'./admin.html',platformSchools:'./admin.html',platformSecurity:'./admin.html',content:'./content.html'})){
  const ctx=vm.createContext({document:{body:{dataset:{roleWorkspace:page}},getElementById:()=>null}});vm.runInContext(source,ctx);
  assert.equal(vm.runInContext('currentConfig().links[0][1]',ctx),expected);
 }
 assert.match(read('web/role-layout.js'),/brand\.href = config\.links\[0\]\[1\]/);
});
test('valid and anonymous visits never trigger sign-out',async()=>{
 for(const opts of [{},{anonymous:true}]){const r=await check(opts);assert.equal(r.result,false);assert.deepEqual(r.signOut,[]);assert.deepEqual(r.redirects,[]);}
});
for(const error of [{name:'AuthRetryableFetchError',status:0},{code:'request_timeout',status:504},{code:'over_request_rate_limit',status:429},{code:'unexpected_failure',status:500},{code:'conflict',status:409},{status:401,message:'unknown proxy response'}])
 test(`temporary/unknown Auth error preserves login: ${error.code||error.name||error.status}`,async()=>{
  const r=await check({error});assert.equal(r.result,false);assert.deepEqual(r.signOut,[]);assert.deepEqual(r.removed,[]);assert.deepEqual(r.redirects,[]);assert.equal(r.messages.length,1);
 });
test('thrown network failures preserve login',async()=>{
 for(const opts of [{throws:true},{sessionThrows:true}]){const r=await check(opts);assert.equal(r.result,false);assert.equal(r.signOut.length,0);assert.equal(r.redirects.length,0);}
});
for(const code of ['user_not_found','user_banned','session_not_found','session_expired','refresh_token_not_found','refresh_token_already_used','bad_jwt'])
 test(`confirmed terminal Auth error still clears local session: ${code}`,async()=>{
  const r=await check({error:{code}});assert.equal(r.result,true);assert.deepEqual(r.signOut,[{scope:'local'}]);assert.deepEqual(r.redirects,['./index.html']);assert.equal(r.stored.length,1);
  assert.match(r.stored[0][1],code==='user_not_found'?/Հաշիվը այլևս հասանելի չէ/:/աշխատաշրջանն այլևս վավեր չէ/);
 });
test('a stale Auth response cannot clear a newer session',async()=>{
 for(const nextSession of [{user:{id:'teacher-test'},access_token:'refreshed-token'},{user:{id:'another-account'},access_token:'synthetic-access-token'},null]){
  const r=await check({error:{code:'session_not_found'},nextSession});assert.equal(r.result,false);assert.deepEqual(r.signOut,[]);assert.deepEqual(r.redirects,[]);
 }
});
