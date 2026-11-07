import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobilePreflight, mobileReadAllowed, mobileReceipt, closeOwnedSessions} from '../scripts/mobile-qa-policy.mjs';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const fields = ['schoolId','classId','assignmentId','curriculumReleaseId','unitId','adminId','teacherId','studentId'];
const fixture = {dedicatedQa: true, ...Object.fromEntries(['A','B'].map((s,i) => [s,Object.fromEntries(fields.map((f,j) => [f,uuid(i*10+j)]))]))};
const credentials = Object.fromEntries(['A','B'].flatMap(side => ['admin','teacher','student'].map(role => [`${side}_${role}`,{email:`${side}_${role}@example.test`,password:'test-only'}])));
const reviewed = {fixture,credentials,ref:'refs/heads/main',revision:'a'.repeat(40)};
const selection = {enrollmentId:uuid(22),curriculumReleaseId:uuid(23),unitId:uuid(24)};
const request = (fn, body, role = 'student') => mobileReadAllowed({pathname:'/functions/v1/'+fn,method:'POST',body,role,contexts:[selection]});

test('mobile preflight rejects unreviewed source, missing credentials and undesignated actors', () => {
  assert.deepEqual(mobilePreflight(reviewed),[]);
  for (const change of [{ref:'refs/pull/1/merge'},{revision:'main'},{credentials:{}},{fixture:{...fixture,dedicatedQa:false}},
    {fixture:{...fixture,B:{...fixture.B,studentId:fixture.A.studentId}}}]) assert.ok(mobilePreflight({...reviewed,...change}).length > 0);
});
test('mobile student guard preserves governed selections and rejects learning/draft/upload paths', () => {
  assert.equal(request('get-student-dashboard',{navigation:true}),true);
  assert.equal(request('get-student-dashboard',selection),true);
  assert.equal(request('get-student-dashboard',{}),false);
  assert.equal(request('get-student-dashboard',{...selection,action:'diagnostic'}),false);
  assert.equal(request('get-student-dashboard',{...selection,unitId:uuid(99)}),false);
  assert.equal(request('get-unit-guides',selection),true);
  assert.equal(request('manage-written-work',{action:'tasks',context:selection,payload:{}}),true);
  for (const action of ['open','save','submit','review','start','upload']) assert.equal(request('manage-written-work',{action,context:selection,payload:{}}),false);
  assert.equal(request('start-learning-session',selection),false);
  assert.equal(mobileReadAllowed({pathname:'/storage/v1/object/source',method:'POST',role:'student'}),false);
});
test('teacher guard permits only queue, existing response inspection and feedback reads', () => {
  for (const action of ['queue','inspect']) assert.equal(request('manage-written-work',{action},'teacher'),true);
  for (const action of ['save','submit','review','return','publish','cancel','create','send']) {
    assert.equal(request('manage-written-work',{action},'teacher'),false);
    assert.equal(request('manage-teacher-feedback',{action},'teacher'),false);
    assert.equal(request('manage-student-invitation',{action},'teacher'),false);
  }
  assert.equal(request('manage-student-invitation',{action:'list'},'teacher'),true);
  assert.equal(request('get-teacher-dashboard',{readMode:'directory'},'student'),false);
  assert.equal(mobileReadAllowed({pathname:'/auth/v1/token',search:'?grant_type=password',method:'POST',role:'teacher'}),false);
  assert.equal(mobileReadAllowed({pathname:'/auth/v1/token',search:'?grant_type=refresh_token',method:'POST',role:'teacher'}),true);
  assert.equal(mobileReadAllowed({pathname:'/rest/v1/profiles',method:'PATCH',role:'teacher'}),false);
});
test('failure receipt excludes credentials, raw errors, auth state, URLs and arbitrary fields', () => {
  const secret = 'Bearer secret-password-private-learner-name';
  const receipt = mobileReceipt({revision:secret,status:'failed',failedStage:secret,failureKind:secret,
    lastBrowser:{side:secret,role:secret,width:secret,blockedRequests:secret,pageErrors:secret,httpErrors:secret,body:secret},error:secret,storageState:secret,
    checks:[{scenario:secret,side:secret,role:secret,width:secret,textScale:secret,passed:false,body:secret}],
    navigationLayout:[{version:secret,side:secret,width:secret,textScale:secret,position:secret,height:secret,reserved:secret,menuWidth:secret,scrollWidth:secret,destinations:secret,observations:secret,settled:secret,firstErrors:[secret],errors:[secret],body:secret}],
    cleanup:[{closed:false,status:secret}],isolation:{before:{status:'failed',checks:[{body:secret}]}}});
  assert.equal(JSON.stringify(receipt).includes(secret),false);
  assert.equal(receipt.status,'failed');
  assert.equal(receipt.isolation[0].checks,1);
});
test('all owned sessions are locally closed, including an identity mismatch; cleanup continues on error', async () => {
  const seen = [];
  const results = await closeOwnedSessions(['expected','unexpected','last'],async s => {
    seen.push(s);if(s === 'unexpected') throw Error('private token');return 204;
  });
  assert.deepEqual(seen,['expected','unexpected','last']);
  assert.deepEqual(results,[{closed:true,status:204},{closed:false,status:null},{closed:true,status:204}]);
});

test('mobile acceptance allows only the exact read-only My work list for students', () => {
  assert.equal(request('get-student-work', {action:'inbox',payload:{state:'current'}}), true);
  assert.equal(request('get-student-work', {action:'inbox',payload:{state:'current'}}, 'teacher'), false);
  for (const body of [{action:'open',payload:{state:'current'}}, {action:'inbox',payload:{state:'current',offset:50}}, {action:'inbox',payload:{state:'current'},context:{}}])
    assert.equal(request('get-student-work', body), false, JSON.stringify(body));
});
