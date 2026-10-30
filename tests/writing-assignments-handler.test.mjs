import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,context,token,id} from './fixtures/writing-assignments-api.mjs';
import {prepared} from './fixtures/writing-assignments-db.mjs';
test('writing assignment Edge rejects forged owners/shapes, bounds requests and uses live sessions',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const catalog={action:'catalog',context:context(0,true),payload:{}};
 const ok=await f.request(catalog);assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal((await ok.json()).tasks[0].id,id(1000));
 assert.equal((await f.handle(new Request('https://fixture.invalid',{method:'GET'}))).status,405);
 assert.equal((await f.handle(new Request('https://fixture.invalid',{method:'POST',body:'{}'}))).status,401);
 for(const body of [{...catalog,actorId:id(20)},{...catalog,context:{...catalog.context,studentId:id(10)}},{...catalog,payload:[]},{...catalog,payload:{offset:1.2}},{...catalog,action:'create'},{action:'assign',context:catalog.context,payload:{taskId:id(1000)}}])assert.equal((await f.request(body)).status,400);
 assert.equal((await f.request(catalog,10)).status,403);assert.equal((await f.request(catalog,20,token(10))).status,403);
 const response=await f.request({action:'assign',context:catalog.context,payload:await prepared(f.db)});assert.equal(response.status,200);
 const s=await f.request({action:'inbox',context:{},payload:{}},10);assert.equal((await s.json()).assignments.length,1);
 await f.db.query("update profiles set account_status='inactive' where id=$1",[id(20)]);assert.equal((await f.request(catalog)).status,403);
 assert.equal((await f.db.query("select has_table_privilege('authenticated','writing_assignments','select') allowed")).rows[0].allowed,false);
 assert.equal((await f.db.query("select has_function_privilege('authenticated','service_writing_assignments(uuid,uuid,text,jsonb,jsonb)','execute') allowed")).rows[0].allowed,false);
});
