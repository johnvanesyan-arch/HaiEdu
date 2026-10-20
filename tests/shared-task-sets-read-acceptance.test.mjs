import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedTaskSetsReadAcceptance} from '../scripts/shared-task-sets-read-acceptance.mjs';
test('live task-set probe is read-only and never accepts an outage or unauthorized content as access-control evidence',async()=>{
 for(const allowed of [true,false]){
  const rows=[],calls=[];await sharedTaskSetsReadAcceptance({check:(name,ok)=>rows.push({name,ok}),request:async(actor,path,body,method)=>{
   calls.push({actor,path,body,method});
   if(!allowed)return {status:503,data:{error:'unavailable'}};
   return path.startsWith('/rest')?{status:actor===null?401:403,data:{code:'42501'}}:{status:actor===null?401:403,data:{error:actor===null?'unauthorized':'task_set_access_denied'}};
  }});
  assert.equal(rows.length,21);assert.ok(rows.every(x=>x.ok===allowed));
  assert.equal(calls.filter(x=>x.method==='GET').length,14);
  assert.ok(calls.filter(x=>x.body).every(x=>x.body.action==='catalog'&&x.body.itemId==='00000000-0000-4000-8000-000000000000'));
 }
});
