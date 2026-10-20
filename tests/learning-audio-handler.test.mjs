import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,id,token} from './fixtures/learning-audio-api.mjs';
test('audio Edge returns verified private bytes and scoped staff previews, with no student storage URLs',async()=>{
 const f=await fixture();try{
  const response=await f.request(f.body);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'audio/wav');assert.match(response.headers.get('Cache-Control'),/no-store/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),f.bytes);
  assert.ok((await f.db.query('select fetched_at from learning_audio_deliveries')).rows[0].fetched_at);
  assert.equal((await f.request({action:'preview',itemId:f.served.item.id})).status,403);
  assert.equal((await f.request({action:'preview',itemId:f.served.item.id},30)).status,200);
  const catalogue=await f.request({action:'catalog',itemId:f.served.item.id},30);assert.equal(catalogue.status,200);assert.deepEqual((await catalogue.json()).versions,[{id:f.audioId,title:'Synthetic tone',locale:'en',durationMs:300}]);
  for(const body of [{...f.body,actorId:id(30)},{...f.body,action:'fetched'},{...f.body,url:'https://foreign.invalid'},{...f.body,audioVersionId:f.audioId},{...f.body,sessionItemId:'bad'},{action:'transcript',itemId:f.served.item.id}])assert.equal((await f.request(body)).status,400);
  assert.equal((await f.request(f.body,11)).status,403);assert.equal((await f.request(f.body,10,token(10,402))).status,403);
 }finally{await f.db.close();}
});
test('audio Edge rejects public buckets, altered/missing bytes and access revoked while storage is loading',async()=>{
 const f=await fixture();try{
  f.state.public=true;assert.equal((await f.request(f.body)).status,503);assert.equal(f.state.downloads,0);
  f.state.public=false;f.state.corrupt=true;assert.equal((await f.request(f.body)).status,503);
  f.state.corrupt=false;f.state.unavailable=true;assert.equal((await f.request(f.body)).status,503);
  f.state.unavailable=false;f.state.afterDownload=()=>f.db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
  assert.equal((await f.request(f.body)).status,403);
  const delivery=(await f.db.query('select * from learning_audio_deliveries')).rows[0];assert.equal(delivery.fetched_at,null);assert.equal(delivery.completed_at,null);
 }finally{await f.db.close();}
});
