import test from 'node:test';
import assert from 'node:assert/strict';
import {workBucket,workStateAttribute,workToolbarMarkup} from '../web/student-work-hub.mjs';
test('My work maps every source state to one status and never hides unknown states',()=>{
 for(const [state,bucket] of [['not_started','todo'],['draft','todo'],['returned','returned'],['reviewed','returned'],['submitted','submitted']])assert.equal(workBucket('task',state),bucket);
 for(const [state,bucket] of [['not_started','todo'],['draft','todo'],['changes_requested','returned'],['reviewed','returned'],['submitted','submitted'],[undefined,'todo']])assert.equal(workBucket('writing',state),bucket);
 assert.equal(workBucket('material'),'todo','Material assignments record no completion');
 assert.equal(workBucket('task','future_state'),null);assert.equal(workStateAttribute('task','future_state'),'');
 assert.equal(workBucket('unknown_source','draft'),null);
 assert.equal(workStateAttribute('writing','submitted'),' data-work-state="submitted"');
});
test('the toolbar offers three statuses, one refresh and starts on to-do',()=>{
 const html=workToolbarMarkup();
 assert.equal((html.match(/data-work-filter=/g)||[]).length,3);assert.equal((html.match(/data-work-refresh/g)||[]).length,1);
 assert.match(html,/data-work-filter="todo" aria-pressed="true"/);assert.match(html,/role="group"/);
});
