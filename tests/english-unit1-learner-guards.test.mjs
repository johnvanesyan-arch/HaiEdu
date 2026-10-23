import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {browserAllowed,designated,selection,syntheticResponse,validResume} from './live/english-unit1-learner-acceptance.mjs';
import {english,writingTaskId} from '../scripts/english-unit1-pilot-read-acceptance.mjs';
const a=designated[0],b=designated[1];
const current={id:'11111111-1111-4111-8111-111111111111',mode:'diagnostic',sessionItemId:'22222222-2222-4222-8222-222222222222',itemId:'33333333-3333-4333-8333-333333333333'};
const ledger={sessions:[current],workId:'44444444-4444-4444-8444-444444444444'};
const allowed=(fn,body,actor='A_student')=>browserAllowed({actor,pathname:'/functions/v1/'+fn,method:'POST',body,ledger,current});
test('write guard rejects foreign scope, stale items, unowned sessions and broader actions',()=>{
 assert.equal(allowed('start-learning-session',{...selection(a),mode:'diagnostic'}),true);
 assert.equal(allowed('start-learning-session',{...selection(b),mode:'diagnostic'}),false);
 assert.equal(allowed('start-learning-session',{...selection(a),mode:'mastery_check'}),false);
 const body={sessionId:current.id,sessionItemId:current.sessionItemId,itemId:current.itemId,response:{value:'A'}};
 assert.equal(allowed('submit-answer',body),true);
 for(const field of ['sessionId','sessionItemId','itemId'])assert.equal(allowed('submit-answer',{...body,[field]:ledger.workId}),false);
 assert.equal(allowed('submit-mastery-answer',body),false);
 assert.equal(allowed('submit-answer',body,'B_student'),false);
 assert.equal(allowed('manage-written-work',{action:'submit',context:selection(a),payload:{taskId:writingTaskId}}),true);
 assert.equal(allowed('manage-written-work',{action:'submit',context:selection(b),payload:{taskId:writingTaskId}}),false);
 assert.equal(allowed('manage-written-work',{action:'review',context:{assignmentId:a.teacherAssignmentId,curriculumReleaseId:a.curriculumReleaseId,unitId:a.unitId},payload:{workId:ledger.workId}},'A_teacher'),true);
 assert.equal(allowed('manage-student-invitation',{action:'create_code'},'A_teacher'),false);
 assert.equal(allowed('manage-institutional-teacher-class',{action:'archive'},'A_teacher'),false);
 assert.equal(allowed('get-learning-audio',{sessionId:current.id,sessionItemId:current.sessionItemId,action:'cancel'}),false);
});
test('answer mapper follows shuffled displayed text and fails closed on ambiguous keys',()=>{
 const source={responseType:'single_choice',key:{optionId:'a'},options:[{id:'a',text:'accepted'},{id:'b',text:'other'}]};
 assert.deepEqual(syntheticResponse({type:'single_choice',options:[{option_key:'D',content_hy:'accepted'},{option_key:'A',content_hy:'other'}]},source),{value:'D'});
 assert.throws(()=>syntheticResponse({type:'single_choice',options:[{option_key:'A',content_hy:'other'}]},source));
 assert.throws(()=>syntheticResponse({type:'single_choice',options:[{option_key:'A',content_hy:'accepted'},{option_key:'B',content_hy:'accepted'}]},source));
 assert.throws(()=>syntheticResponse({id:'not-accepted',type:'single_choice',options:[]}));
});
test('all accepted packet responses can be projected without inventing a key',async()=>{
 let count=0;
 for(const name of ['draft','practice-additions','assessment-batch-a','assessment-batch-bcd']){
  const packet=JSON.parse(await readFile(`docs/content/english-7-unit-01-${name}.json`,'utf8'));
  for(const item of packet.items){const response=syntheticResponse({type:item.responseType,options:item.options?.map((o,i)=>({option_key:String(i),content_hy:o.text}))},item);assert.ok(response);count++;}
 }
 assert.equal(count,200);
});
test('continuation accepts only bounded incomplete evidence for the designated learner',()=>{
 const report={schemaVersion:'haiedu-english-unit1-learner-qa-v1',workflowRunId:'123',scope:english,studentId:a.studentId,status:'failed',sessions:[current],workId:null};
 assert.equal(validResume(report,'123'),true);
 assert.equal(validResume(report,'124'),false);
 assert.equal(validResume({...report,status:'passed'},'123'),false);
 assert.equal(validResume({...report,studentId:b.studentId},'123'),false);
 assert.equal(validResume({...report,sessions:[current,{...current,id:ledger.workId}]},'123'),false);
 assert.equal(validResume({...report,sessions:[current,current]},'123'),false);
});
test('production write runner remains manual, main-only, serialized and resumable',async()=>{
 const workflow=await readFile('.github/workflows/english-unit1-learner-acceptance.yml','utf8');
 assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/^  (push|pull_request):/m);
 assert.match(workflow,/test "\$GITHUB_REF" = refs\/heads\/main/);
 assert.match(workflow,/group: sprint-14-isolation-qa\n  cancel-in-progress: false/);
 assert.match(workflow,/node scripts\/wait-for-production-release.mjs/);
 assert.match(workflow,/actions\/download-artifact@v4/);assert.match(workflow,/if: always\(\)/);
 assert.doesNotMatch(workflow,/SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});
