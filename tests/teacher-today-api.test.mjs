import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherWorkspaceHandler} from '../supabase/functions/_shared/teacher-workspace-handler.mjs';
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const token='fixture.'+Buffer.from(JSON.stringify({session_id:id(2)})).toString('base64url')+'.signed';
function setup(){const calls=[],state={live:true,finalRole:'teacher',result:{data:{version:'teacher-workspace-v1',pendingCount:0}},valid:true};
 const admin={auth:{getUser:async()=>state.valid?{data:{user:{id:id(1)}}}:{error:{}}},rpc:async(fn,args)=>{calls.push({fn,args});return state.result;},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:state.finalRole,account_status:'active'}})})})})};
 const handler=createTeacherWorkspaceHandler({createAdmin:()=>admin,hasActiveLiveSession:async()=>state.live,env:{url:'https://fixture.invalid',key:'fixture-only'}});
 const run=(body={},credential=token,method='POST')=>handler(new Request('https://fixture.invalid',{method,headers:credential?{Authorization:'Bearer '+credential}: {},...(method==='POST'?{body:JSON.stringify(body)}:{})}));return{calls,state,run};
}
test('workspace Edge derives actor/session, permits metadata only and disables response caching',async()=>{const s=setup(),r=await s.run({workId:id(3),recent:[id(4)]});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(s.calls,[{fn:'service_teacher_workspace',args:{p_actor:id(1),p_auth:id(2),p_work:id(3),p_recent:[id(4)],p_assignment:null,p_cursor:null}}]);});
test('forged identities, mutating actions, malformed cursor and oversized hints fail before SQL',async()=>{for(const body of [{actorId:id(9)},{action:'review'},{cursor:{id:id(3),submittedAt:'yesterday'}},{recent:Array(5).fill(id(4))},{workId:'not-an-id'},null]){const s=setup();assert.equal((await s.run(body)).status,400);assert.equal(s.calls.length,0);}});
test('missing/invalid authentication, inactive live session and a final role change are denied',async()=>{
 for(const change of [s=>s.state.live=false,s=>s.state.valid=false,s=>s.state.finalRole='student']){const s=setup();change(s);assert.ok([401,403].includes((await s.run()).status));}
 const s=setup();assert.equal((await s.run({},null)).status,401);assert.equal((await s.run({},token,'GET')).status,405);
});
test('SQL scope errors are stable while unexpected failures never expose database messages',async()=>{for(const [error,status,code]of [[{message:'workspace_context_unavailable'},403,'workspace_context_unavailable'],[{code:'22P02',message:'internal input'},400,'workspace_request_invalid'],[{message:'private rows and SQL'},503,'workspace_unavailable']]){const s=setup();s.state.result={error};const r=await s.run();assert.equal(r.status,status);assert.deepEqual(await r.json(),{error:code});}});
