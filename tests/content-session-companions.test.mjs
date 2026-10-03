import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {moduleSource,node,deferred} from './fixtures/content-session-harness.mjs';

test('P3-27: late curriculum read cannot restore catalog after sign-out',async()=>{
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};let listener,session=null;const request=deferred();
 const api=await vm.runInNewContext(`(async()=>{${moduleSource('web/content-curriculum.js')};return{refreshData,snapshot:()=>data};})()`,{$:get,document:{body:{dataset:{contentMode:'bank'}}},window:{addEventListener(){}},contentSupabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:f=>{listener=f;}}},loadContentDashboard:()=>request.promise,setTimeout,clearTimeout});
 session={user:{id:'QA-user'}};const loading=api.refreshData();await new Promise(r=>setImmediate(r));listener('SIGNED_OUT',null);request.resolve({catalog:{subjects:[{id:'QA-private'}]}});await loading;assert.equal(api.snapshot(),null);
});

test('P3-27: late companion analytics catalog cannot start another protected read after sign-out',async()=>{
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};let listener;const calls=[];
 const client={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:f=>{listener=f;}},functions:{invoke(name,{body}){const request=deferred();calls.push({name,body,...request});return request.promise;}}};
 const api=await vm.runInNewContext(`(async()=>{${moduleSource('web/content-pilot-analytics.js')};return{loadAnalytics,snapshot:()=>({analytics,catalog})};})()`,{createClient:()=>client,SUPABASE_URL:'http://isolated.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-only',document:{getElementById:get,querySelector:()=>null},setTimeout,Response});
 const pending=api.loadAnalytics({forceCatalog:true});listener('SIGNED_OUT',null);calls[0].resolve({data:{catalog:{units:[{id:'QA-private'}]}},error:null});await pending;assert.equal(calls.length,1);assert.equal(api.snapshot().catalog,null);assert.equal(api.snapshot().analytics,null);await api.loadAnalytics({forceCatalog:true});assert.equal(calls.length,1);
});

test('P3-27: late review history cannot inject protected markup after sign-out',async()=>{
 let listener,injections=0;const request=deferred(),panel=node();panel.querySelector=()=>({});const client={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:f=>{listener=f;}},functions:{invoke:()=>request.promise}};
 const api=await vm.runInNewContext(`(async()=>{${moduleSource('web/content-review-workflow.js')};injectReviewUi=()=>{trackInjection();};return{enhanceSelectedItem};})()`,{window:{__haieduSupabaseClient:client},document:{body:{dataset:{contentItemId:'QA-item'}},getElementById:id=>id==='detailPanel'?panel:null,querySelector:()=>({dataset:{id:'QA-item'}})},setTimeout,clearTimeout,Response,trackInjection:()=>{injections+=1;}});
 const pending=api.enhanceSelectedItem();listener('SIGNED_OUT',null);request.resolve({data:{reviews:[{notes:'QA private history'}]},error:null});await pending;assert.equal(injections,0);
});
