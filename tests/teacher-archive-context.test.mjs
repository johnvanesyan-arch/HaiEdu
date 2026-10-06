import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('web/teacher.js', 'utf8');
const section = (start,end) => source.slice(source.indexOf(start),source.indexOf(end));
function harness({active=true,success=true,sourceView='classes'}={}) {
  const klass={id:'class-qa',isActive:active,assignmentId:'assignment-qa',selectedUnit:{curriculumReleaseId:'release-qa',unitId:'unit-qa'}};
  const elements=new Map(), snapshots=[];
  const window={location:new URL(`https://example.invalid/teacher?view=class&class=class-qa&source=${sourceView}&assignment=assignment-qa&release=release-qa&unit=unit-qa`),confirm:()=>true};
  window.history={replaceState:(_a,_b,next)=>{window.location=new URL(next,window.location);},pushState:(_a,_b,next)=>{window.location=new URL(next,window.location);}};
  const context=vm.createContext({URL,URLSearchParams,window,TEACHER_VIEWS:new Set(['home','profile','classes','archive','create','class']),
    dashboard:{institutionalTeacher:true},selectedClass:()=>klass,
    $:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);},setMessage:()=>{},
    supabase:{functions:{invoke:async()=>success?{data:{updated:true}}:{error:new Error('denied')}}},
    loadDashboard:async()=>snapshots.push(new URL(window.location)),
  });
  vm.runInContext(section('function navigationSelection()', 'function teacherViewUrl(')
    +section('function syncNavigation(', 'function showTeacherClassAfterMutation(')
    +section('async function toggleInstitutionalClassStatus()', 'async function removeStudent('),context);
  return {context,klass,window,snapshots};
}
test('archive retains the original selection for authorized read-only history',async()=>{
  const h=harness(); await h.context.toggleInstitutionalClassStatus();
  assert.equal(h.klass.isActive,false);assert.equal(h.snapshots.length,1);
  const p=h.snapshots[0].searchParams;
  assert.equal(p.get('class'),'class-qa');assert.equal(p.get('source'),'archive');
  assert.equal(p.get('assignment'),'assignment-qa');
  assert.equal(p.get('release'),'release-qa');assert.equal(p.get('unit'),'unit-qa');
});
test('reactivation restores exact selected context after successful mutation',async()=>{
  const h=harness({active:false,sourceView:'archive'});await h.context.toggleInstitutionalClassStatus();
  assert.equal(h.klass.isActive,true);assert.equal(h.snapshots[0].searchParams.get('assignment'),'assignment-qa');
  assert.equal(h.snapshots[0].searchParams.get('source'),'classes');
});
test('failed archive preserves current state and does not reload',async()=>{
  const h=harness({success:false});await h.context.toggleInstitutionalClassStatus();
  assert.equal(h.klass.isActive,true);assert.equal(h.snapshots.length,0);
  assert.equal(h.window.location.searchParams.get('assignment'),'assignment-qa');
});
test('active and historical deep links preserve exact selectors for server authorization',()=>{
  const archived=harness({active:false,sourceView:'archive'});
  assert.equal(archived.context.navigationSelection().selection.assignmentId,'assignment-qa');
  archived.context.syncNavigation(archived.klass);
  assert.equal(archived.window.location.searchParams.get('assignment'),'assignment-qa');
  assert.equal(archived.window.location.searchParams.get('source'),'archive');
  const active=harness();assert.equal(active.context.navigationSelection().selection.assignmentId,'assignment-qa');
});
