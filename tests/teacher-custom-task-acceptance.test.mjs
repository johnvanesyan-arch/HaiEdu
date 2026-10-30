import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCustomTaskSend} from '../scripts/teacher-custom-task-acceptance.mjs';

test('production custom-send guard permits only the exact owned task and one designated recipient',()=>{
 const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const draft={id:id(1),revision:2,definition:{schemaVersion:'teacher-task-v1',title:'Run-owned task',source:{kind:'pdf',attachmentId:id(4)},response:{kind:'link'},assessment:{kind:'feedback'},instructions:'Synthetic fixture'}};
 const scope={assignmentId:id(5),curriculumReleaseId:id(6),unitId:id(7)},expected={draft,scope,enrollmentId:id(8)};
 const body={action:'assign',context:scope,payload:{id:draft.id,expectedRevision:2,definition:structuredClone(draft.definition),requestId:id(9),rosterFingerprint:'a'.repeat(64),mode:'selected',enrollmentIds:[id(8)]}};
 assert.equal(matchesCustomTaskSend(body,expected),true);
 for(const patch of [
  {action:'cancel'},{context:{...scope,assignmentId:id(50)}},{context:{...scope,unexpected:true}},
  {payload:{...body.payload,id:id(50)}},{payload:{...body.payload,expectedRevision:3}},
  {payload:{...body.payload,definition:{...draft.definition,title:'Other task'}}},
  {payload:{...body.payload,mode:'class'}},{payload:{...body.payload,enrollmentIds:[id(8),id(10)]}},
  {payload:{...body.payload,enrollmentIds:[id(10)]}},{payload:{...body.payload,force:true}},
  {payload:{...body.payload,requestId:'invalid'}},{payload:{...body.payload,rosterFingerprint:''}},{force:true}
 ])assert.equal(matchesCustomTaskSend({...body,...patch},expected),false,JSON.stringify(patch));
});
