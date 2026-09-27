import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {chooseInitialDiagnosticForm,firstCompletedDiagnostic,loadInitialDiagnostics} from '../supabase/functions/_shared/initial-diagnostic.ts';
import {buildExactInstitutionalStudentAnalytics} from '../supabase/functions/_shared/institutional-teacher-analytics.ts';

test('initial assignment is stable, independent of form query order, and uses both forms',()=>{
  const forms=[{id:'a',code:'FORM-A'},{id:'b',code:'FORM-B'}];
  const assigned=new Set();
  for(let i=0;i<100;i++){
    const first=chooseInitialDiagnosticForm(forms,`student-${i}`,'CHAPTER-1');
    assert.equal(chooseInitialDiagnosticForm([...forms].reverse(),`student-${i}`,'CHAPTER-1').id,first.id);
    assigned.add(first.id);
  }
  assert.deepEqual([...assigned].sort(),['a','b']);
  assert.equal(chooseInitialDiagnosticForm([],'student','chapter'),null);
});

test('baseline uses the first completed diagnostic, excluding unfinished and other modes',()=>{
  const rows=[
    {id:'new',mode:'diagnostic',status:'completed',completed_at:'2026-09-20'},
    {id:'partial',mode:'diagnostic',status:'active',started_at:'2026-09-01'},
    {id:'old',mode:'diagnostic',status:'completed',completed_at:'2026-09-10'},
    {id:'practice',mode:'practice',status:'completed',completed_at:'2026-09-02'},
  ];
  assert.equal(firstCompletedDiagnostic(rows).id,'old');
  assert.equal(rows[0].id,'new');
  assert.equal(firstCompletedDiagnostic([]),null);
});

test('teacher baseline survives more than 30 newer practice sessions',()=>{
  const base={student_id:'s',status:'completed',answered_count:20,correct_count:6,planned_item_count:20};
  const sessions=[{...base,id:'baseline',mode:'diagnostic',started_at:'2026-01-01',completed_at:'2026-01-01'},
    ...Array.from({length:40},(_,i)=>({...base,id:`p${i}`,mode:'practice',started_at:'2026-09-20',completed_at:'2026-09-20'}))];
  const result=buildExactInstitutionalStudentAnalytics({student:{id:'s'},context:{},skills:[],sessions,attempts:[],reviewSessions:[]});
  assert.equal(result.latestDiagnostic.percent,30);
  assert.equal(result.sessions.length,20);
});

test('separate baseline lookup is restricted to authorized IDs and fails closed',async()=>{
  const calls=[];
  const chain={select(){return this;},in(k,v){calls.push([k,v]);return this;},eq(k,v){calls.push([k,v]);return this;},order(){return this;},then(resolve){resolve({data:[{student_id:'allowed',id:'baseline'}],error:null});}};
  const data=await loadInitialDiagnostics({from:()=>chain},['allowed'],'CHAPTER-1');
  assert.equal(data.get('allowed').id,'baseline');
  assert.deepEqual(calls,[['student_id',['allowed']],['unit_code','CHAPTER-1'],['mode','diagnostic'],['status','completed']]);
  chain.then=resolve=>resolve({error:new Error('unavailable')});
  await assert.rejects(()=>loadInitialDiagnostics({from:()=>chain},['allowed'],'CHAPTER-1'),/unavailable/);
});

function diagnosticUi(dashboard, startResponse={}) {
  const nodes=new Map();
  function node(id){
    if(!nodes.has(id)){
      const classes=new Set(['hidden']);
      nodes.set(id,{textContent:'',innerHTML:'',disabled:false,href:'',classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},addEventListener(){}});
    }
    return nodes.get(id);
  }
  let source=readFileSync(new URL('../web/diagnostic.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);','').replace(/prepare\(\);\s*$/,'');
  const calls=[];
  const context=vm.createContext({document:{getElementById:node},window:{location:{replace(){},assign(){}}},
    supabase:{auth:{getSession:async()=>({data:{session:{}}})},functions:{invoke:async name=>{calls.push(name);return {data:name==='get-student-dashboard'?dashboard:startResponse};}}},
    recordRecommendationTelemetry:async()=>{},performance:{now:()=>0}});
  vm.runInContext(source,context);
  return {context,node,calls};
}

test('completed diagnostic remains viewable during an active practice session',async()=>{
  const ui=diagnosticUi({latestDiagnostic:{correct:6,answered:20,percent:30},skills:[],activeSession:{id:'practice',mode:'practice'}});
  await vm.runInContext('prepare()',ui.context);
  assert.equal(ui.node('resultPanel').classList.contains('hidden'),false);
  assert.match(ui.node('resultText').textContent,/սկզբնական/);
  assert.deepEqual(ui.calls,['get-student-dashboard']);
});

test('incomplete diagnostic offers resume with saved progress',async()=>{
  const ui=diagnosticUi({activeSession:{id:'saved',mode:'diagnostic',answered:7,planned:20}});
  await vm.runInContext('prepare()',ui.context);
  assert.match(ui.node('stateText').textContent,/7\/20/);
  assert.equal(vm.runInContext('currentSession.id',ui.context),'saved');
  assert.equal(ui.node('startBtn').classList.contains('hidden'),false);
});

test('start action refreshes stale state and displays the completed baseline',async()=>{
  const ui=diagnosticUi({latestDiagnostic:{correct:0,answered:20,percent:0},skills:[]});
  await vm.runInContext('startDiagnostic()',ui.context);
  assert.equal(ui.node('resultPanel').classList.contains('hidden'),false);
  assert.deepEqual(ui.calls,['get-student-dashboard']);
  assert.doesNotMatch(readFileSync(new URL('../web/diagnostic.html',import.meta.url),'utf8'),/retakeBtn/);
});
