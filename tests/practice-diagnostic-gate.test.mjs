import test,{before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {getPracticeDiagnosticBlock} from '../supabase/functions/_shared/practice-diagnostic-gate.ts';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const db=new PGlite();
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const q=async(s,p=[]) => (await db.query(s,p)).rows;
const rejected=async(fn,re=/chapter_diagnostic_required/) => {
 await db.exec('savepoint expect_error');try{await assert.rejects(fn,re);}finally{await db.exec('rollback to savepoint expect_error; release savepoint expect_error');}
};
const session=async(mode,unit='PHY7-U01',student=1,status='active')=>(await q('insert into learning_sessions(student_id,unit_code,mode,status) values($1,$2,$3,$4) returning id',[id(student),unit,mode,status]))[0].id;
const baseline=(unit='PHY7-U01',student=1)=>session('diagnostic',unit,student,'completed');
before(async()=>{
 await db.exec(read('tests/fixtures/initial-diagnostic-database.sql'));
 await db.exec('create table attempts(id uuid default gen_random_uuid(),student_id uuid,learning_session_id uuid,assessment_blueprint_id uuid);');
 // Simulate unfinished practice created before the rule existed, including saved progress.
 await q("insert into learning_sessions(id,student_id,unit_code,mode,answered_count) values($1,$2,'PHY7-U01','practice',3)",[id(90),id(1)]);
 await db.exec(read('supabase/migrations/20260927183816_single_initial_diagnostic.sql'));
 await db.exec(read('supabase/migrations/20260927190434_chapter_diagnostic_practice_gate.sql'));
});
after(()=>db.close());beforeEach(()=>db.exec('begin'));afterEach(()=>db.exec('rollback'));

test('all chapter codes and both practice modes require their own completed diagnostic',async()=>{
 for(const unit of ['PHY7-U01','PHY7-U02','MATH9-U04','HISTORY8-U01']) {
  for(const mode of ['practice','chapter_review']) await rejected(()=>session(mode,unit));
  await baseline(unit);
  for(const mode of ['practice','chapter_review']) assert.ok(await session(mode,unit));
 }
});
test('an unfinished diagnostic and another student or chapter cannot unlock practice',async()=>{
 await session('diagnostic');await baseline('PHY7-U02');await baseline('PHY7-U01',2);
 await rejected(()=>session('practice'));
 await q("update learning_sessions set status='completed',correct_count=0 where student_id=$1 and mode='diagnostic' and unit_code='PHY7-U01'",[id(1)]);
 assert.ok(await session('practice'));
});
test('existing practice is blocked at item, answer, and session writes then resumes without losing progress',async()=>{
 const writeItem=()=>q('insert into learning_session_items(session_id,ordinal) values($1,4)',[id(90)]);
 const answer=()=>q('insert into attempts(student_id,learning_session_id) values($1,$2)',[id(1),id(90)]);
 await rejected(writeItem);await rejected(answer);
 await rejected(()=>q('update learning_sessions set answered_count=4 where id=$1',[id(90)]));
 await baseline();await writeItem();await answer();
 assert.equal((await q('select answered_count from learning_sessions where id=$1',[id(90)]))[0].answered_count,3);
});
test('atomic diagnostic start ignores locked practice, preserves it, and resumes its assigned form',async()=>{
 await q('insert into units values($1,$2)',[id(10),'PHY7-U01']);
 await q("insert into assessment_pools values($1,'DIAG','PHY7-U01','diagnostic','active')",[id(50)]);
 await q("insert into assessment_blueprints values($1,$2,$3,$4,'diagnostic','pilot')",[id(30),id(20),id(10),id(50)]);
 await q("insert into assessment_forms values($1,$2,'A',1,'active')",[id(41),id(50)]);
 const rows=[];
 for(let i=0;i<20;i++) {
  const item={item_id:id(100+i),skill_id:id(500+Math.floor(i/2))};rows.push(item);
  await q("insert into items values($1,$2,'published')",[item.item_id,item.skill_id]);
  await q('insert into assessment_form_items values($1,$2)',[id(41),item.item_id]);
  await q('insert into assessment_blueprint_items values($1,$2)',[id(30),item.item_id]);
 }
 const start=async()=> (await q('select start_initial_diagnostic_atomic($1,$2,$3,$4,$5,$6) result',[id(1),'PHY7-U01',id(20),id(30),id(41),JSON.stringify(rows)]))[0].result;
 const a=await start();assert.equal(a.session.mode,'diagnostic');assert.equal(a.resumed,false);
 assert.equal((await start()).session.id,a.session.id);
 assert.equal((await q('select answered_count from learning_sessions where id=$1',[id(90)]))[0].answered_count,3);
 await q("update learning_sessions set status='completed',answered_count=20,correct_count=0 where id=$1",[a.session.id]);
 await q('update learning_sessions set answered_count=4 where id=$1',[id(90)]);
 assert.equal((await start()).diagnosticCompleted,true);
});
test('sessionless attempts cannot bypass the chapter gate',async()=>{
 await rejected(()=>q('insert into attempts(student_id) values($1)',[id(1)]),/practice_chapter_context_required/);
});
test('new database functions are invoker and not callable by learners',async()=>{
 const rows=await q("select oid::regprocedure::text name,prosecdef,has_function_privilege('authenticated',oid,'execute') allowed from pg_proc where proname like 'guard_practice_diagnostic_%' or proname='has_completed_chapter_diagnostic'");
 assert.equal(rows.length,4);assert.ok(rows.every(r=>!r.prosecdef&&!r.allowed));
});
test('API helper scopes completion exactly and fails closed on unavailable history',async()=>{
 let result={data:null,error:null};const filters=[];
 const chain={select(){return this},eq(k,v){filters.push([k,v]);return this},limit(){return this},async maybeSingle(){return result}};
 const admin={from:()=>chain};
 assert.equal((await getPracticeDiagnosticBlock(admin,'learner','MATH8-U03','practice')).status,403);
 assert.deepEqual(filters,[['student_id','learner'],['unit_code','MATH8-U03'],['mode','diagnostic'],['status','completed']]);
 result={data:{id:'completed-zero-score'}};assert.equal(await getPracticeDiagnosticBlock(admin,'learner','MATH8-U03','chapter_review'),null);
 result={error:new Error('unavailable')};assert.equal((await getPracticeDiagnosticBlock(admin,'learner','MATH8-U03','practice')).status,503);
 assert.equal(await getPracticeDiagnosticBlock(admin,'learner','MATH8-U03','diagnostic'),null);
});
test('direct practice and review links stop before resuming saved practice when diagnostic is incomplete',async()=>{
 const source=read('web/practice.js');const fn=source.slice(source.indexOf('async function startOrResumePractice()'),source.indexOf('async function loadSessionItem()'));
 for(const mode of ['practice','chapter_review']){
  const gates=[];const ctx=vm.createContext({starting:false,dashboard:{activeSession:{id:'saved',mode}},showGate:(...args)=>gates.push(args)});
  vm.runInContext(fn,ctx);await vm.runInContext('startOrResumePractice()',ctx);
  assert.equal(gates[0][2][0].href,'./diagnostic.html');assert.equal(ctx.starting,false);
 }
});
