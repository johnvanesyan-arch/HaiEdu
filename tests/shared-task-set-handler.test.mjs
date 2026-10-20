import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,token,id} from './fixtures/learning-audio-api.mjs';
test('task-set catalog and saved preview require a live content reviewer and never expose keys or other members',async()=>{
 const f=await fixture({taskSet:true,reading:true});try{
  const request=(body,actor=30)=>f.taskSetHandle(new Request('https://fixture.invalid/task-set',{method:'POST',headers:{Authorization:'Bearer '+token(actor)},body:JSON.stringify(body)}));
  const catalog=await request({action:'catalog',itemId:f.served.item.id});assert.equal(catalog.status,200);assert.equal((await catalog.json()).versions[0].id,f.set.setId);
  const preview=await request({action:'preview',itemId:f.served.item.id});assert.equal(preview.status,200);assert.match(preview.headers.get('Cache-Control'),/no-store/);
  const body=await preview.json();assert.equal(body.stimulus.content,f.set.stimulus.content);assert.equal(body.taskSet.position,1);assert.doesNotMatch(JSON.stringify(body),/members|answer|permission_reference/);
  for(const actor of [10,11])assert.equal((await request({action:'catalog',itemId:f.served.item.id},actor)).status,403);
  assert.deepEqual((await(await request({action:'catalog',itemId:id(801)})).json()).versions,[]);
  assert.equal((await request({action:'catalog',itemId:f.served.item.id,studentId:id(10)})).status,400);
  assert.equal((await request({action:'load',itemId:f.served.item.id})).status,400);
  const rpc=f.admin.rpc;f.admin.rpc=async(...args)=>{const result=await rpc(...args);await f.db.query('delete from auth.sessions where id=$1',[id(430)]);return result;};
  assert.equal((await request({action:'preview',itemId:f.served.item.id})).status,403);
 }finally{await f.db.close();}
});
