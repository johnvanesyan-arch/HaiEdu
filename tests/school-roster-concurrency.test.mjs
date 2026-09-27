import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('web/school-admin.js','utf8');
function harness(){
  const pending=[],rows=[],messages=[];
  const elements={rosterSchool:{value:'A'},teacherRoster:{replaceChildren:()=>{rows.length=0;}},refreshTeachersBtn:{disabled:false}};
  const state={teachers:new Map()};
  const context=vm.createContext({$:id=>elements[id],dashboardState:state,message:(_id,text)=>messages.push(text),
    setButtonBusy:(button,busy)=>{button.disabled=busy;},renderOverview:()=>{},
    appendRosterGroup:(_list,_heading,teachers)=>rows.push(...teachers.map(t=>t.person_id)),
    supabase:{functions:{invoke:()=>new Promise(resolve=>pending.push(resolve))}},
  });
  vm.runInContext('let teacherRosterLoadVersion=0;\n'+source.slice(source.indexOf('async function loadTeacherRoster()'),source.indexOf('async function loadTeacherSubjects(')),context);
  const resolve=(i,id)=>pending[i]({data:{teachers:[{person_id:id,membership_status:'active'}]}});
  return{context,rows,elements,state,resolve};
}
test('overlapping same-school loads render only the latest roster once',async()=>{
  const h=harness(),first=h.context.loadTeacherRoster(),second=h.context.loadTeacherRoster();
  h.resolve(1,'latest');await second;h.resolve(0,'stale');await first;
  assert.deepEqual(h.rows,['latest']);assert.equal(h.state.teachers.get('A')[0].person_id,'latest');
});
test('an older response cannot clear the latest request busy state',async()=>{
  const h=harness(),first=h.context.loadTeacherRoster(),second=h.context.loadTeacherRoster();
  h.resolve(0,'stale');await first;
  assert.equal(h.elements.refreshTeachersBtn.disabled,true);assert.deepEqual(h.rows,[]);
  h.resolve(1,'latest');await second;assert.equal(h.elements.refreshTeachersBtn.disabled,false);
});
test('A to B to A switching cannot restore an old A response',async()=>{
  const h=harness(),first=h.context.loadTeacherRoster();
  h.elements.rosterSchool.value='B';const second=h.context.loadTeacherRoster();
  h.elements.rosterSchool.value='A';const third=h.context.loadTeacherRoster();
  h.resolve(2,'latest-A');await third;h.resolve(0,'old-A');await first;h.resolve(1,'old-B');await second;
  assert.deepEqual(h.rows,['latest-A']);
});
