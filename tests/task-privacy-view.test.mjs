import test from 'node:test';
import assert from 'node:assert/strict';
import {taskPrivacyRows,erasurePresentation} from '../web/task-privacy-view.mjs';
test('own task inventory renders only named positive integer aggregates',()=>{
 assert.deepEqual(taskPrivacyRows(null),[]);
 const rows=taskPrivacyRows({drafts:3,copies:1,received:0,submissions:-1,responseFiles:'2',privateFeedback:Infinity,sources:NaN,deliveries:2**54,object_path:'private',text:'Answer',studentName:'Other learner'});
 assert.deepEqual(rows,[['Իմ կազմած առաջադրանքների սևագրեր',3],['Սևագրերի պատճեններ',1]]);
});
test('execution marker ends cancellation while preserving accurate pending/completed presentation',()=>{
 for(const status of ['pending','processing']){const r=erasurePresentation({status});assert.equal(r.canCancel,true);assert.equal(r.canReject,true);}
 const started=erasurePresentation({status:'processing',execution_started_at:'2026-10-30T12:00:00Z'});
 assert.equal(started.canCancel,false);assert.equal(started.canReject,false);assert.equal(started.action,'Շարունակել ջնջումը');
 for(const request of [null,{status:'cancelled'},{status:'completed',execution_started_at:'2026-10-30T12:00:00Z'}])assert.equal(erasurePresentation(request).open,false);
});
