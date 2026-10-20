import test from 'node:test';
import assert from 'node:assert/strict';
import {writingReadAllowed} from '../scripts/written-work-read-acceptance.mjs';
test('production writing acceptance guard cannot save, submit, mark or mutate invitations',()=>{
 for(const action of ['save','submit','review','open','inspect'])assert.equal(writingReadAllowed({pathname:'/functions/v1/manage-written-work',method:'POST',body:{action}}),false);
 for(const action of ['tasks','queue'])assert.equal(writingReadAllowed({pathname:'/functions/v1/manage-written-work',method:'POST',body:{action}}),true);
 for(const action of ['create','revoke','rotate_join_code'])assert.equal(writingReadAllowed({pathname:'/functions/v1/manage-student-invitation',method:'POST',body:{action}}),false);
 assert.equal(writingReadAllowed({pathname:'/functions/v1/submit-answer',method:'POST',body:{}}),false);
 assert.equal(writingReadAllowed({pathname:'/rest/v1/written_work',method:'PATCH',body:{}}),false);
});
