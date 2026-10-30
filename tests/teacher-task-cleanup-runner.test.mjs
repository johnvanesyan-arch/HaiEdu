import test from 'node:test';import assert from 'node:assert/strict';
import {cleanupRequest,validateCleanupSession} from '../scripts/teacher-task-file-cleanup.mjs';
const now=Date.parse('2026-10-30T12:00:00Z'),before='2026-10-28T12:00:00Z',requestId='71000000-0000-4000-8000-000000000901';
test('cleanup runner defaults to read-only preview; execution requires exact reviewed fingerprint, nonce and confirmation',()=>{
 assert.deepEqual(cleanupRequest(['--before',before],now),{action:'preview_task_file_cleanup',before:new Date(before).toISOString()});
 const args=['--before',before,'--execute','--fingerprint','a'.repeat(64),'--request-id',requestId,'--confirm','REMOVE_UNREFERENCED_TASK_FILES'];
 assert.equal(cleanupRequest(args,now).action,'execute_task_file_cleanup');assert.throws(()=>cleanupRequest(args.slice(0,-2),now),/confirmation/);
 assert.throws(()=>cleanupRequest(['--before','2026-10-30T00:00:00Z'],now),/one day/);assert.throws(()=>cleanupRequest(['--before',before,'--before',before],now),/repeated/);
 assert.deepEqual(cleanupRequest(['--cleanup-id',requestId,'--confirm','REMOVE_UNREFERENCED_TASK_FILES'],now),{action:'resume_task_file_cleanup',cleanupId:requestId});
 assert.throws(()=>cleanupRequest(['--cleanup-id',requestId,'--execute','--confirm','REMOVE_UNREFERENCED_TASK_FILES'],now),/Resume/);
});
test('cleanup runner refuses service credentials, absent MFA and expired sessions before network access',()=>{
 const claims={role:'authenticated',aal:'aal2',sub:requestId,session_id:requestId,exp:now/1000+3600},token=c=>'fixture.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
 assert.doesNotThrow(()=>validateCleanupSession(token(claims),now));
 for(const changes of [{role:'service_role'},{aal:'aal1'},{exp:now/1000-1},{session_id:null}])assert.throws(()=>validateCleanupSession(token({...claims,...changes}),now));
 assert.throws(()=>validateCleanupSession('sb_secret_example',now));
});
