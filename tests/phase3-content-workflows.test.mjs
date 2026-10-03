import test from 'node:test';
import assert from 'node:assert/strict';
import { database, ids, payload, snapshot } from './fixtures/phase3-db-harness.mjs';
import { endpoint } from './fixtures/phase3-endpoint-harness.mjs';
const call = (e, action, extra = {}, opts) => e.call({ action, itemId: ids.item, ...extra }, opts);

test('M01: actual editor save/reopen preserves draft mappings and rejects SME spoofing', async () => {
 const db = await database(); try {
  const e = await endpoint(db, 'manage-content-quality');
  const before = await call(e, 'get_item_detail'); assert.equal(before.status, 200, JSON.stringify(before));
  assert.equal(before.body.detail.misconceptions[0].code, 'QA_ATTACHED_DRAFT');
  assert.equal(before.body.detail.availableMisconceptions.some(m => m.code === 'QA_ATTACHED_DRAFT'), false);
  const saved = await call(e, 'save_content_revision', { payload: payload({ validationState: 'provisional_no_sme_review' }) });
  assert.equal(saved.status, 200, JSON.stringify(saved)); assert.equal(saved.body.revision.versionNo, 5);
  const after = await call(e, 'get_item_detail'); assert.equal(after.status, 200, JSON.stringify(after));
  assert.deepEqual(after.body.detail.misconceptions, before.body.detail.misconceptions);
  assert.equal(after.body.detail.item.validationState, 'sme_reviewed');
 } finally { await db.close(); }
});

test('M02: actual revision, current QA, and approval preserve SME and closed release controls', async () => {
 const db = await database(); try {
  const e = await endpoint(db, 'manage-content-quality');
  assert.equal((await call(e, 'save_content_revision', { payload: payload() })).status, 200);
  assert.equal((await call(e, 'approve')).status, 409);
  const qa = await call(e, 'run_qa'); assert.equal(qa.status, 200, JSON.stringify(qa)); assert.equal(qa.body.qa.passed, true);
  assert.deepEqual(qa.body.qa.errors, []);
  const approved = await call(e, 'approve'); assert.equal(approved.status, 200, JSON.stringify(approved)); assert.equal(approved.body.versionNo, 5);
  const item = (await db.query('select validation_state,config,review_status from items where id=$1', [ids.item])).rows[0];
  assert.equal(item.validation_state, 'sme_reviewed'); assert.equal(item.review_status, 'approved');
  assert.equal(item.config.learnerVisible, false); assert.equal(item.config.pilot_ready, false);
  assert.equal((await db.query('select count(*)::int n from item_reviews where version_no=5')).rows[0].n, 1);
 } finally { await db.close(); }
});

test('M03: actual invalid saves, unauthorized callers, and inactive sessions cannot change content', async () => {
 const db = await database(); try {
  const e = await endpoint(db, 'manage-content-quality'), original = await snapshot(db);
  for (const p of [payload({promptHy:''}), payload({answerKey:{answer:'Z'}}), payload({options:[{key:'A',contentHy:'A'},{key:'A',contentHy:'B'}]})]) {
   assert.equal((await call(e, 'save_content_revision', {payload:p})).status,409); assert.deepEqual(await snapshot(db), original);
  }
  for (const opts of [{anonymous:true},{actor:ids.wrongRole}]) {
   assert.ok([401,403].includes((await call(e,'save_content_revision',{payload:payload()},opts)).status)); assert.deepEqual(await snapshot(db),original);
  }
  e.revoke(); assert.equal((await call(e,'run_qa')).status,403); assert.deepEqual(await snapshot(db),original);
 } finally { await db.close(); }
});

test('M03: actual QA reports duplicate warnings, records invalid answers, and denies approval', async () => {
 const db=await database(); try {
  const e=await endpoint(db,'manage-content-quality');
  await db.query('update items set prompt_hy=(select prompt_hy from items where id=$1) where id=$2',[ids.item,'30000000-0000-4000-8000-000000000002']);
  const duplicate=await call(e,'run_qa'); assert.equal(duplicate.status,200,JSON.stringify(duplicate));
  assert.equal(duplicate.body.qa.passed,true); assert.ok(duplicate.body.qa.warnings.includes('duplicate_prompt_in_skill'));
  await db.query('update item_answer_keys set answer=$1::jsonb where item_id=$2',[JSON.stringify('Z'),ids.item]);
  const invalid=await call(e,'run_qa'); assert.equal(invalid.status,200,JSON.stringify(invalid)); assert.equal(invalid.body.qa.passed,false);
  assert.ok(invalid.body.qa.errors.includes('answer_not_in_options')); assert.equal((await call(e,'approve')).status,409);
  assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,0);
 } finally { await db.close(); }
});

test('M06: actual family QA fingerprint rejects stale evidence and permits approval after rerun', async () => {
 const db=await database(); try {
  const e=await endpoint(db,'manage-content-quality');
  await db.query('update item_templates set generation_config=$1::jsonb where id=$2',[JSON.stringify({authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidenceBlueprintPolicy:'QA-fixture',requiredEvidencePurposes:['core_understanding','application'],enforceUniqueEvidencePurposes:true}),ids.template]);
  for(const [id,purpose] of [[ids.item,'core_understanding'],['30000000-0000-4000-8000-000000000002','application']]) await db.query('update items set config=config||$1::jsonb where id=$2',[JSON.stringify({evidencePurpose:purpose}),id]);
  const qa=await call(e,'run_qa'); assert.equal(qa.status,200,JSON.stringify(qa)); assert.equal(qa.body.qa.passed,true);
  assert.match(qa.body.qa.details.evidenceBlueprintVerification.familyStateFingerprint,/haiedu-family-state-v1/);
  await db.query('update items set version_no=version_no+1 where id=$1',['30000000-0000-4000-8000-000000000002']);
  const stale=await call(e,'approve'); assert.equal(stale.status,409,JSON.stringify(stale)); assert.equal(stale.body.requiresQaRerun,true);
  assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,0);
  assert.equal((await call(e,'run_qa')).body.qa.passed,true);
  assert.equal((await call(e,'approve')).status,200);
  assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,1);
 } finally { await db.close(); }
});
