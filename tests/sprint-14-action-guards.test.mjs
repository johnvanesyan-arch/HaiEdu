import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedBrowserManagement as allowed } from '../scripts/sprint-14-action-guards.mjs';
const resources = { classes:[{id:'new-class'}], memberships:[{id:'new-member',schoolId:'school',originalIds:['original-member']}] };
test('admin dashboard read-only lists are allowed without permitting their writes',()=>{
  for(const fn of ['manage-student-invitation','manage-staff-invitation','manage-school-academic-year']) {
    assert.equal(allowed(fn,{action:'list'},resources),true);
    for(const action of ['resend','issue','create','activate','revoke'])assert.equal(allowed(fn,{action},resources),false);
  }
  assert.equal(allowed('manage-unknown',{action:'list'},resources),false);
});
test('class writes require an explicitly tracked new class ID',()=>{
  for(const action of ['rename','archive','activate']) {
    assert.equal(allowed('manage-institutional-teacher-class',{action,classId:'new-class'},resources),true);
    assert.equal(allowed('manage-institutional-teacher-class',{action,classId:'original-class'},resources),false);
  }
  assert.equal(allowed('manage-institutional-teacher-class',{action:'create'},resources),false);
});
test('offboarding requires a new membership and its exact school',()=>{
  for(const action of ['preview_offboard','offboard']) {
    assert.equal(allowed('manage-school-teacher',{action,membershipId:'new-member',schoolId:'school'},resources),true);
    assert.equal(allowed('manage-school-teacher',{action,membershipId:'new-member',schoolId:'other'},resources),false);
    assert.equal(allowed('manage-school-teacher',{action,membershipId:'original-member',schoolId:'school'},resources),false);
  }
});
test('original or missing memberships cannot be smuggled into the resource ledger',()=>{
  assert.equal(allowed('manage-school-teacher',{action:'offboard',membershipId:'original-member',schoolId:'school'},
    {classes:[],memberships:[{id:'original-member',schoolId:'school',originalIds:['original-member']}]}),false);
  assert.equal(allowed('manage-school-teacher',{action:'offboard',schoolId:'school'},
    {classes:[],memberships:[{schoolId:'school',originalIds:[]}]}),false);
});
