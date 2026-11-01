import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionClassHistory,classHistoryMarkup,analyticsClassOptions,analyticsClassOptionsMarkup} from '../web/class-history.mjs';
const classes=[
 {id:'old-a',name:'7A',isActive:false,subjectProgramIds:['a']},
 {id:'current-b',name:'7A',isActive:true,subjectProgramIds:['b']},
 {id:'current-a',name:'7A',isActive:true,subjectProgramIds:['a']},
];
test('history retains exact class identities and names, folded after current classes',()=>{
 const before=structuredClone(classes),parts=partitionClassHistory(classes);
 assert.deepEqual(parts.current.map(c=>c.id),['current-b','current-a']);
 assert.deepEqual(parts.archived.map(c=>c.id),['old-a']);
 const html=classHistoryMarkup(classes,c=>`<p>${c.id}</p>`);
 assert.ok(html.indexOf('current-a')<html.indexOf('<details'));
 assert.match(html,/<details class="class-history"><summary>Արխիվացված դասարաններ · 1<\/summary><p>old-a/);
 assert.doesNotMatch(html,/<details[^>]*\bopen\b/);
 assert.deepEqual(classes,before);
 assert.match(classHistoryMarkup([{id:'historical',active:false}],c=>c.id,{isActive:c=>c.active}),/Արխիվացված դասարաններ · 1/);
});
test('both admin pickers filter by exact programme, keep archive opt-in and retain an authorized historical selection',()=>{
 const ids=options=>analyticsClassOptions(classes,options).map(c=>c.id);
 assert.deepEqual(ids({programmeId:'a'}),['current-a']);
 assert.deepEqual(ids({programmeId:'b',includeArchived:true}),['current-b']);
 assert.deepEqual(ids({programmeId:'a',includeArchived:true}),['old-a','current-a']);
 assert.deepEqual(ids({programmeId:'a',selectedId:'old-a'}),['old-a','current-a']);
 assert.deepEqual(ids({programmeId:'b',selectedId:'old-a'}),['current-b']);
 const html=analyticsClassOptionsMarkup([{id:'<id>',name:'<script>',isActive:false}]);
 assert.match(html,/&lt;id&gt;/);assert.match(html,/&lt;script&gt; · Արխիվացված/);assert.doesNotMatch(html,/<script>/);
});
