import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const actor='00000000-0000-4000-8000-000000000011';
const target='00000000-0000-4000-8000-000000000013';
const school='00000000-0000-4000-8000-000000000001';
const revision='a'.repeat(32);
async function invoke(endpoint,body,opts={}){
 let handler;const calls=[];const adminEndpoint=endpoint==='manage-admin-account';
 const actorProfile={role:adminEndpoint?'admin':'school_admin',account_status:'active',...opts.actor};
 const targetProfile={role:'school_admin',account_status:'active',...opts.target};
 const client={auth:{getUser:async()=>({data:{user:opts.auth===false?null:{id:actor}}}),admin:{updateUserById:async(id,change)=>{calls.push({type:'auth',id,change});return {error:opts.authChangeError?{message:'auth unavailable'}:null};}}},
 from(table){let key,mutation;const q={select(){return q;},eq(k,v){if(k==='id')key=v;return q;},update(value){mutation=value;return q;},insert(value){calls.push({type:'audit',value});return Promise.resolve({error:null});},async maybeSingle(){if(mutation){calls.push({type:'profile',mutation});return {data:opts.dbError?null:{id:key,...mutation},error:opts.dbError?{message:opts.dbError}:null};}return {data:key===actor?actorProfile:targetProfile};},async single(){return q.maybeSingle();},then(resolve){return Promise.resolve({count:2,error:null}).then(resolve);}};return q;},
 async rpc(name,params){calls.push({type:'rpc',name,params});return {data:name.includes('blockers')?[]:opts.rpcData??{revision,ended:true},error:opts.rpcError?{message:opts.rpcError}:null};}};
 const source=readFileSync(`supabase/functions/${endpoint}/index.ts`,'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>client,hasActiveLiveSession:async()=>opts.live!==false,Deno:{env:{get:()=> 'configured'},serve:fn=>{handler=fn;}},Response,atob,console:{error(){}}});
 const token=`x.${Buffer.from(JSON.stringify({aal:opts.aal??'aal2'})).toString('base64url')}.x`;
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:opts.header===false?{}:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
 return {status:response.status,data:await response.json(),calls};
}
const offboard={action:'offboard',schoolId:school,membershipId:target,revision};
test('offboarding authenticates, derives actor and validates confirmation',async()=>{
 const r=await invoke('manage-school-teacher',{...offboard,actorId:target});assert.equal(r.status,200);assert.equal(r.calls[0].params.p_actor,actor);assert.equal(r.calls[0].params.p_expected_revision,revision);
 for(const opts of [{header:false},{auth:false},{live:false},{actor:{role:'teacher'}},{actor:{account_status:'suspended'}}]){
  const denied=await invoke('manage-school-teacher',offboard,opts);assert.ok([401,403].includes(denied.status));assert.equal(denied.calls.length,0);
 }
 for(const body of [{...offboard,revision:null},{...offboard,revision:'bad'},{...offboard,schoolId:'bad'},{...offboard,reason:'bad'}]){
  const r=await invoke('manage-school-teacher',body);assert.equal(r.status,400);assert.equal(r.calls.length,0);
 }
});
test('offboarding preview and errors preserve actionable API contracts',async()=>{
 const r=await invoke('manage-school-teacher',{...offboard,action:'preview_offboard',revision:undefined});assert.equal(r.status,200);assert.equal(r.calls[0].params.p_action,'preview');
 for(const [rpcError,status] of [['teacher_offboarding_preview_changed',409],['school_teacher_unavailable',403],['unexpected',503]]) assert.equal((await invoke('manage-school-teacher',offboard,{rpcError})).status,status);
 assert.equal((await invoke('manage-institutional-membership',{action:'end_membership',membershipId:target,reason:'transfer'},{rpcError:'last_active_school_admin_protected'})).status,409);
});
test('database rejection of final administrator never bans Auth',async()=>{
 for(const dbError of ['last_active_school_admin_protected','last_active_admin_protected']){
  const r=await invoke('manage-admin-account',{action:'suspend',targetUserId:target},{dbError});assert.equal(r.status,409);assert.equal(r.data.error,dbError);assert.equal(r.calls.filter(c=>c.type==='auth').length,0);
 }
});
test('suspension approves profile first; Auth failure is explicit and retryable',async()=>{
 for(const authChangeError of [false,true]){
  const r=await invoke('manage-admin-account',{action:'suspend',targetUserId:target},{authChangeError});assert.deepEqual(r.calls.filter(c=>['profile','auth'].includes(c.type)).map(c=>c.type),['profile','auth']);assert.equal(r.status,authChangeError?503:200);
  if(authChangeError){assert.equal(r.data.profileSuspended,true);assert.equal(r.data.retryable,true);assert.equal(r.calls.at(-1).value.outcome,'failed');}
 }
 const retry=await invoke('manage-admin-account',{action:'suspend',targetUserId:target},{target:{account_status:'suspended'}});assert.equal(retry.status,200);assert.equal(retry.calls.filter(c=>c.type==='auth').length,1);
});
test('activation unbans before granting profile access; master admin MFA still enforced',async()=>{
 const r=await invoke('manage-admin-account',{action:'activate',targetUserId:target},{target:{account_status:'suspended'}});assert.equal(r.status,200);assert.deepEqual(r.calls.filter(c=>['profile','auth'].includes(c.type)).map(c=>c.type),['auth','profile']);
 const failed=await invoke('manage-admin-account',{action:'activate',targetUserId:target},{target:{account_status:'suspended'},authChangeError:true});assert.equal(failed.status,500);assert.equal(failed.calls.filter(c=>c.type==='profile').length,0);
 for(const opts of [{aal:'aal1'},{actor:{role:'school_admin'}},{live:false}]){const r=await invoke('manage-admin-account',{action:'suspend',targetUserId:target},opts);assert.equal(r.status,403);assert.equal(r.calls.length,0);}
});
async function ui({confirm=true,changed=false,error=null}={}){
 const source=readFileSync('web/school-admin.js','utf8').split('async function offboardTeacher')[1].split('\nfunction teacherCard')[0];
 const calls=[],busy=[],messages=[];let current=school,refresh=0,confirmations=0;
 const ctx={supabase:{functions:{invoke:async(_name,{body})=>{calls.push(body);if(body.action==='preview_offboard'){if(changed)current='other';return {data:{offboarding:{revision,activeAssignments:2,activeSubjectGrants:1,unusedInvitations:3,unusedJoinCodes:4}}};}return error?{error:{context:new Response(JSON.stringify({error}))}}:{data:{offboarding:{ended:true}}};}}},setButtonBusy:(_b,v)=>busy.push(v),$ :()=>({value:current}),window:{confirm:()=>{confirmations++;return confirm;}},message:(...args)=>messages.push(args),loadTeacherRoster:async()=>{refresh++;}};
 vm.runInNewContext('async function offboardTeacher'+source+';this.run=offboardTeacher;',ctx);await ctx.run({membership_id:target,display_name:'Test Teacher'},school,{});
 return {calls,busy,messages,refresh,confirmations};
}
test('dashboard cancellation or context change cannot offboard',async()=>{
 for(const opts of [{confirm:false},{changed:true}]){const r=await ui(opts);assert.equal(r.calls.length,1);assert.equal(r.refresh,0);assert.equal(r.busy.at(-1),false);}
});
test('dashboard sends confirmed revision and treats stale preview as failure',async()=>{
 const r=await ui();assert.equal(r.calls.length,2);assert.equal(r.calls[1].revision,revision);assert.equal(r.refresh,1);assert.equal(r.confirmations,1);
 const stale=await ui({error:'teacher_offboarding_preview_changed'});assert.equal(stale.refresh,0);assert.equal(stale.messages.at(-1)[2],true);assert.equal(stale.busy.at(-1),false);
});
