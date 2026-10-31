import test from 'node:test';
import assert from 'node:assert/strict';
import {retainUsabilityReadFailure} from '../scripts/b123-usability-reads.mjs';

test('read-failure evidence retains safe phase/geometry while excluding private text, credentials and query values',async()=>{
 const captured=[],report={},error=Object.assign(Error('PRIVATE_RESPONSE; fake@example.invalid; Bearer secret-token'),{name:'TimeoutError'});
 const counts={'.amp-subject-card':2,'.written-list':0,'#studentCustomTasks[aria-busy="true"]':1};
 const page={url:()=> 'https://www.haiedu.am/index.html?view=work&tab=writing&access_token=secret-token',locator:selector=>({selector,count:async()=>counts[selector]??0}),screenshot:async options=>captured.push(options)};
 await retainUsabilityReadFailure(report,page,'A','student','wait-writing-list',error);
 assert.deepEqual(report.writingReadFailure.page,{path:'/index.html',view:'work',tab:'writing'});
 assert.equal(report.writingReadFailure.kind,'timeout');assert.equal(report.writingReadFailure.phase,'wait-writing-list');
 assert.deepEqual(report.writingReadFailure.visibleState,{subjectCards:2,writingLists:0,customReadBusy:1});
 assert.match(captured[0].path,/^qa-results\/resource-form\/usability-failure-A-student\.png$/);assert.equal(captured[0].fullPage,false);assert.ok(captured[0].mask.some(m=>m.selector==='.written-work'));
 assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RESPONSE|fake@example|secret-token|access_token/);
 page.url=()=> 'https://www.haiedu.am/secret-token?view=PRIVATE_RESPONSE&tab=secret-token';page.screenshot=async()=>{throw Error('PRIVATE_RESPONSE');};
 await retainUsabilityReadFailure(report,page,'A','student','wait-writing-list',error);
 assert.deepEqual(report.writingReadFailure.page,{path:'other',view:null,tab:null});assert.equal(report.writingReadFailure.diagnosticsIncomplete,true);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RESPONSE|secret-token/);
});
