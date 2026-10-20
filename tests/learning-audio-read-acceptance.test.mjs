import test from 'node:test';
import assert from 'node:assert/strict';
import {learningAudioReadAcceptance} from '../scripts/learning-audio-read-acceptance.mjs';
test('live audio probe is read-only and never accepts an outage or unauthorized bytes as access-control evidence',async()=>{
 for(const allowed of [true,false]){
  const rows=[],calls=[];await learningAudioReadAcceptance({check:(name,ok)=>rows.push({name,ok}),request:async(actor,path,body,method)=>{
   calls.push({actor,path,body,method});
   if(!allowed)return {status:503,data:{error:'unavailable'}};
   return path.startsWith('/rest')?{status:actor===null?401:403,data:{code:'42501'}}:{status:actor===null?401:403,data:{error:actor===null?'unauthorized':'audio_access_denied'}};
  }});
  assert.equal(rows.length,21);assert.ok(rows.every(x=>x.ok===allowed));
  assert.equal(calls.filter(x=>x.method==='GET').length,14);
  assert.ok(calls.filter(x=>x.body).every(x=>x.body.action==='load'&&x.body.sessionId==='00000000-0000-4000-8000-000000000000'));
 }
});
