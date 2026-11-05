import test from 'node:test';
import assert from 'node:assert/strict';
import {studentWorkReadAllowed} from '../scripts/student-work-read-guard.mjs';
const request={actor:'A_student',method:'POST',fn:'get-student-work',body:{action:'inbox',payload:{state:'current'}}};
test('production guard admits both exact combined-work inbox reads for the designated learner',()=>{
 for(const actor of ['A_student','B_student'])for(const state of ['current','history'])assert.equal(studentWorkReadAllowed({...request,actor,body:{action:'inbox',payload:{state}}}),true);
});
test('combined-work guard does not admit writes, staff, forged context or widened payload',()=>{
 const bodies=[null,[],{}, {action:'assign',payload:{state:'current'}},{action:'inbox',context:{studentId:'other'},payload:{state:'current'}},{action:'inbox',payload:{state:'all'}},{action:'inbox',payload:{state:'current',studentId:'other'}},{action:'inbox',payload:[]}];
 for(const body of bodies)assert.equal(Boolean(studentWorkReadAllowed({...request,body})),false);
 for(const patch of [{method:'GET'},{method:'DELETE'},{fn:'manage-written-work'},{actor:'A_teacher'},{actor:'B_admin'}])assert.equal(studentWorkReadAllowed({...request,...patch}),false);
});
