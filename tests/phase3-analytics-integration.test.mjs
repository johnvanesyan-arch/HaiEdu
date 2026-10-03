import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { analyticsDatabase, analytics, itemId } from './fixtures/phase3-analytics-db.mjs';
import { endpoint } from './fixtures/phase3-endpoint-harness.mjs';
import { ids } from './fixtures/phase3-db-harness.mjs';

async function fixture(t) { const db = await analyticsDatabase(); t.after(() => db.close()); return db; }
const item = (a, n) => a.items.find(i => i.itemId === itemId(n));

test('analytics SQL calculates all eight operational flags and exact aggregate counts', async t => {
  const db = await fixture(t), a = await analytics(db);
  assert.equal(a.evidenceLabel, 'pilot_operational_evidence_not_validated_psychometrics');
  assert.deepEqual(a.integrity, { distinctStudents: 10, exposureCount: 27, exactRepeatCount: 3, exactRepeatRate: .1111, exactRepeatFallbackCount: 2, sessionItemCount: 3, protectedPoolExposureCount: 5, protectedPoolLeakCount: 4, unansweredExposureCount: 2, flaggedItemCount: 4 });
  const expected = [
    [1, ['high_exposure', 'unexpectedly_easy']],
    [2, ['unexpectedly_hard', 'frequently_missed', 'high_help_use']],
    [3, ['high_exact_repeat', 'possible_memorisation_signal']],
    [4, ['unanswered_signal']], [5, []],
  ];
  for (const [n, flags] of expected) assert.deepEqual(item(a,n).flags, flags);
  assert.equal(item(a,1).averageResponseTimeMs, 5500); assert.equal(item(a,1).medianResponseTimeMs, 5500);
  assert.equal(item(a,3).averageResponseTimeMs, 300); assert.equal(item(a,3).medianResponseTimeMs, 300);
  assert.equal(item(a,3).firstTimeCorrectnessRate, 0); assert.equal(item(a,3).repeatCorrectnessRate, 1);
  assert.equal(item(a,4).correctnessRate, null); assert.equal(item(a,4).helpUseRate, null);
  assert.equal(item(a,4).abandonedUnansweredCount, 1); assert.equal(item(a,4).completedUnansweredCount, 1);
  assert.deepEqual(a.diagnosticFormUsage, [{formCode:'QA-FORM-A',formVersion:2,sessionCount:2}]);
  assert.deepEqual(a.pools.map(p=>[p.poolCode,p.enabledItemCount]).sort(), [['QA-DIAGNOSTIC',1],['QA-PRACTICE',2],['QA-PROTECTED',1]]);
});

test('analytics scopes four programmes independently, including genuine empty results', async t => {
  const db = await fixture(t);
  const a = await analytics(db), b = await analytics(db,'QA-B-U01');
  assert.equal(a.items.length,5); assert.equal(b.items.length,1); assert.equal(b.items[0].itemId,itemId(6));
  assert.equal(b.integrity.exposureCount,1); assert.equal(b.integrity.flaggedItemCount,0);
  assert.deepEqual(b.diagnosticFormUsage,[{formCode:'QA-FORM-B',formVersion:1,sessionCount:1}]);
  for (const code of ['QA-C-U01','QA-D-U01']) {
    const empty=await analytics(db,code); assert.equal(empty.unitCode,code);
    assert.deepEqual(empty.items,[]); assert.deepEqual(empty.pools,[]); assert.deepEqual(empty.diagnosticFormUsage,[]);
    for (const value of Object.values(empty.integrity)) assert.equal(value,0);
  }
});

test('unanswered help does not inflate the answered help rate or difficulty flags', async t => {
  const db=await fixture(t);
  await db.query('update student_item_exposure_events set help_used=(id=24),hint_level_used=case when id=24 then 1 else 0 end where item_id=$1',[itemId(5)]);
  await db.exec(`insert into student_item_exposure_events values
    (29,5,'${itemId(5)}',1,'practice','2026-02-01','2026-02-01 00:00:10',false,false,0,1000),
    (30,6,'${itemId(5)}',2,'practice','2026-02-02',null,null,true,1,null),
    (31,7,'${itemId(5)}',2,'practice','2026-02-03',null,null,true,1,null),
    (32,8,'${itemId(5)}',2,'practice','2026-02-04',null,null,true,1,null)`);
  const result=item(await analytics(db),5);
  assert.equal(result.answeredCount,5); assert.equal(result.helpUsedCount,4);
  assert.equal(result.helpUseRate,.2); assert.equal(result.flags.includes('high_help_use'),false);
  await db.query('update student_item_exposure_events set help_used=true where item_id=$1',[itemId(5)]);
  const all=item(await analytics(db),5);
  assert.equal(all.helpUsedCount,8); assert.equal(all.helpUseRate,1);
});

test('difficulty thresholds use their documented minimum sample and inclusive boundaries', async t => {
  const db=await fixture(t);
  assert.deepEqual(item(await analytics(db),5).flags,[]); // Four answers: no difficulty/help flag.
  await db.query('delete from student_item_exposure_events where item_id=$1',[itemId(5)]);
  await db.exec(`insert into student_item_exposure_events select 100+n,n,'${itemId(5)}',1,'practice','2026-03-01'::timestamptz+n*interval '1 minute','2026-03-02',n<=19,false,0,1000 from generate_series(1,20) n`);
  assert.equal(item(await analytics(db),5).correctnessRate,.95);
  assert.ok(item(await analytics(db),5).flags.includes('unexpectedly_easy'));
  await db.query('update student_item_exposure_events set correct=(student_id<=18) where item_id=$1',[itemId(5)]);
  assert.equal(item(await analytics(db),5).flags.includes('unexpectedly_easy'),false);
  await db.query('update student_item_exposure_events set correct=(student_id<=7) where item_id=$1',[itemId(5)]);
  assert.equal(item(await analytics(db),5).correctnessRate,.35); assert.ok(item(await analytics(db),5).flags.includes('unexpectedly_hard'));
  await db.query('update student_item_exposure_events set correct=(student_id<=8) where item_id=$1',[itemId(5)]);
  assert.equal(item(await analytics(db),5).flags.includes('unexpectedly_hard'),false);
});

test('retirement preserves analytics history and replacement provenance', async t => {
  const db=await fixture(t), before=await analytics(db);
  await db.query("update items set retired_at='2026-04-01',status='retired',replacement_item_id=$1 where id=$2",[itemId(1),itemId(2)]);
  const after=await analytics(db); assert.deepEqual(after.integrity,before.integrity);
  assert.equal(item(after,2).lifecycleStatus,'retired'); assert.equal(item(after,2).replacementItemId,itemId(1));
  assert.equal(item(after,2).exposureCount,5); assert.deepEqual(item(after,2).flags,item(before,2).flags);
});

test('actual analytics handler returns real SQL results and rejects invalid/missing scope', async t => {
  const db=await fixture(t), api=await endpoint(db,'get-pilot-item-analytics');
  const result=await api.call({unitCode:'QA-A-U01'}); assert.equal(result.status,200);
  assert.equal(result.body.analytics.integrity.flaggedItemCount,4);
  for (const body of [{},{unitCode:null},{unitCode:''},{unitCode:'bad scope'}, {unitCode:['QA-A-U01']}, null]) {
    const invalid=await api.call(body); assert.equal(invalid.status,400); assert.equal(invalid.body.error,'invalid_unit_code');
  }
});

test('actual analytics handler retains anonymous, role and live-session guards', async t => {
  const db=await fixture(t), api=await endpoint(db,'get-pilot-item-analytics');
  assert.equal((await api.call({unitCode:'QA-A-U01'},{anonymous:true})).status,401);
  const wrong=await api.call({unitCode:'QA-A-U01'},{actor:ids.wrongRole}); assert.equal(wrong.status,403); assert.equal(wrong.body.error,'content_admin_required');
  api.revoke(); const ended=await api.call({unitCode:'QA-A-U01'}); assert.equal(ended.status,403); assert.equal(ended.body.error,'account_or_session_inactive');
});

test('analytics SQL remains service-only and absent scope cannot select a privileged subject', async t => {
  const db=await fixture(t);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(analytics(db),/permission denied/); } finally { await db.exec('reset role'); }
  }
  await db.exec('set role service_role');
  try { assert.equal((await analytics(db)).integrity.flaggedItemCount,4); assert.equal((await db.query('select service_get_pilot_item_analytics() result')).rows[0].result,null); }
  finally { await db.exec('reset role'); }
});

test('actual Evidence page consumes real handler/SQL flags, links and empty-programme responses', async t => {
  const db=await fixture(t), api=await endpoint(db,'get-pilot-item-analytics');
  const nodes=Object.fromEntries(['evidenceUnit','evidenceMessage','evidenceMetrics','evidenceFlagList','refreshEvidenceBtn'].map(id=>[id,{value:'',textContent:'',innerHTML:'',addEventListener(){}}]));
  const source=readFileSync('web/content-evidence-page.js','utf8').replace(/^import .*;\n/gm,'');
  const code=await vm.runInNewContext(`(async()=>{${source};return {loadEvidence,render};})()`,{
    $:id=>nodes[id],esc:v=>String(v),mountContentWorkspace:async()=>{},contentSupabase:{auth:{onAuthStateChange(){}}},
    invokeContent:async(name,body)=>{assert.equal(name,'get-pilot-item-analytics');const r=await api.call(body);if(r.status!==200)throw Error(r.body.error);return r.body;},
  });
  await code.render({catalog:{programs:['A','B','C','D'].map(x=>({id:`QA-PROGRAM-${x}`,gradeLabelHy:'Փորձնական դասարան',subjectNameHy:`QA ${x}`})),units:['A','B','C','D'].map(x=>({code:`QA-${x}-U01`,programId:`QA-PROGRAM-${x}`,titleHy:`QA ${x}`}))}});
  for (const x of ['A','B','C','D']) assert.ok(nodes.evidenceUnit.innerHTML.includes(`QA-${x}-U01`));
  nodes.evidenceUnit.value='QA-A-U01'; await code.loadEvidence();
  assert.equal((nodes.evidenceFlagList.innerHTML.match(/class="evidence-flag-row"/g)||[]).length,4);
  for (const n of [1,2,3,4]) assert.ok(nodes.evidenceFlagList.innerHTML.includes(`content-item.html?id=${itemId(n)}&from=evidence`));
  assert.ok(!nodes.evidenceFlagList.innerHTML.includes(itemId(5)));
  for (const x of ['B','C','D']) {
    nodes.evidenceUnit.value=`QA-${x}-U01`;await code.loadEvidence();
    assert.equal(nodes.evidenceMessage.textContent,'');assert.match(nodes.evidenceFlagList.innerHTML,/Գործառնական ազդակ չկա/);
    assert.ok(!nodes.evidenceFlagList.innerHTML.includes('content-item.html'));
    assert.match(nodes.evidenceMetrics.innerHTML,/<strong>0<\/strong>/);
  }
});
