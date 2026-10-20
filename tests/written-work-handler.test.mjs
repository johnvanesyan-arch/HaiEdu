import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,id,context,token} from './fixtures/written-work-api.mjs';
test('writing Edge validates identities and request shape, uses live sessions and returns private no-store responses',async()=>{
 const f=await fixture();try{
  const task={action:'tasks',context:context()};
  const ok=await f.request(task);assert.equal(ok.status,200);assert.equal(ok.headers.get('Cache-Control'),'no-store');assert.equal((await ok.json()).tasks.length,1);
  assert.equal((await f.handle(new Request('https://fixture.invalid',{method:'GET'}))).status,405);
  assert.equal((await f.handle(new Request('https://fixture.invalid',{method:'POST',body:'{}'}))).status,401);
  for(const body of [{...task,actorId:id(20)},{...task,context:{...context(),studentId:id(10)}},{...task,context:{...context(),assignmentId:id(351)}},{...task,action:'publish'}, {...task,payload:[]}])assert.equal((await f.request(body)).status,400);
  assert.equal((await f.request(task,11)).status,403);
  assert.equal((await f.request(task,10,token(10,402))).status,403);
  const submitted=await f.request({action:'submit',context:context(),payload:{taskId:id(1000),text:'Synthetic response.',expectedRevision:0}});assert.equal(submitted.status,200);
  assert.equal((await f.request({action:'submit',context:context(),payload:{taskId:id(1000),text:'Synthetic response.',expectedRevision:0}})).status,409);
  const queue=await f.request({action:'queue',context:context(0,true)},20);assert.equal(queue.status,200);assert.equal((await queue.json()).queue.length,1);
  await f.db.exec(`update profiles set account_status='inactive' where id='${id(20)}'`);assert.equal((await f.request({action:'queue',context:context(0,true)},20)).status,403);
 }finally{await f.db.close();}
});
