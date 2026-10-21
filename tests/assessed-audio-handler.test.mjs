import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,id,token} from './fixtures/learning-audio-api.mjs';
test('assessed Edge transfer verifies private bytes, rejects internal actions and retains allowance after a failed download',async()=>{
 const f=await fixture({assessed:true});try{
  for(const action of ['fetched','unavailable','completed','started'])assert.equal((await f.request({...f.body,action})).status,400);
  assert.equal((await f.request({...f.body,action:'begin',clientId:randomUUID(),playId:randomUUID(),positionMs:-1})).status,400);
  assert.equal((await f.request(f.body,11)).status,403);
  f.state.corrupt=true;assert.equal((await f.request(f.body)).status,503);
  let state=await (await f.request({...f.body,action:'state'})).json();assert.equal(state.completedPlays,0);assert.equal(state.canEndUnscored,true);
  f.state.corrupt=false;const response=await f.request(f.body);assert.equal(response.status,200);assert.equal(response.headers.get('X-HaiEdu-Audio-Type'),'audio/wav');assert.deepEqual(Buffer.from(await response.arrayBuffer()),f.bytes);
  state=await (await f.request({...f.body,action:'state'})).json();assert.equal(state.completedPlays,0);assert.doesNotMatch(JSON.stringify(state),/objectPath|bucketId|sha256/);
  f.state.afterDownload=()=>f.db.query('delete from auth.sessions where id=$1',[id(401)]);
  assert.equal((await f.request(f.body)).status,403);
 }finally{await f.db.close();}
});
