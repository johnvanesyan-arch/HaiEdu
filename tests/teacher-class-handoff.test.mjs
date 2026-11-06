import test from 'node:test';
import assert from 'node:assert/strict';
import {classNavigationHandoff} from '../web/teacher-class-handoff.mjs';
const selection={assignmentId:'assignment',curriculumReleaseId:'release',unitId:'unit'};
const klass={id:'class',assignmentId:'assignment',selectedUnit:selection,unitOptions:[selection],students:['private-roster'],analyticsAvailable:true};
const make=(isCurrent=()=>true)=>classNavigationHandoff({actorId:'teacher',klass,institutionalTeacher:true,isCurrent});
test('exact same-view context hands off selector data once without roster or permissions',()=>{
 const take=make(),query={actorId:'teacher',classId:'class',selection},data=take(query);
 assert.equal(data.classes[0].selectedUnit,selection);assert.equal('students' in data.classes[0],false);assert.equal('analyticsAvailable' in data.classes[0],false);assert.equal(take(query),null);
});
for(const field of ['actorId','classId','assignmentId','curriculumReleaseId','unitId'])test('teacher handoff rejects changed '+field,()=>{
 const query={actorId:'teacher',classId:'class',selection:{...selection}};
 if(field in query)query[field]='other';else query.selection[field]='other';assert.equal(make()(query),null);
});
test('expired session/navigation generation cannot use old selector snapshot',()=>{assert.equal(make(()=>false)({actorId:'teacher',classId:'class',selection}),null);});
