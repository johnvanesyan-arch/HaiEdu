import test from 'node:test';
import assert from 'node:assert/strict';
import {database,ids,revise,payload} from './fixtures/phase3-db-harness.mjs';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {validateTypedKey} from '../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../supabase/functions/_shared/arrangement-responses.mjs';

test('private authoring context survives revisions, rejects wrong roles and holds approval until a matching registered source exists',async()=>{
 const db=await database();
 try{
  const family='40000000-0000-4000-8000-000000000001',set='40000000-0000-4000-8000-000000000002';
  const context={schemaVersion:'haiedu-authoring-review-v1',itemCode:'QA-P3-Q1',version:4,locale:'en',feedback:'Private draft explanation',source:{kind:'reading',familyId:family,text:'Private original passage'}};
  await db.exec('create table learning_task_set_versions(id uuid primary key,source_family_id uuid,stimulus jsonb,revoked_at timestamptz)');
  await db.query("update items set config=config||$2::jsonb,review_status='needs_review',status='draft' where id=$1",[ids.item,JSON.stringify({authoringReview:{schemaVersion:context.schemaVersion,snapshotVersion:4}})]);
  await db.query('insert into item_versions(item_id,version_no,snapshot) values($1,4,$2)',[ids.item,JSON.stringify({authoringReview:context})]);
  const api=await endpoint(db,'manage-content-quality',{validateTypedKey,validateArrangementKey});
  const body={action:'get_item_detail',itemId:ids.item};
  const detail=await api.call(body);
  assert.equal(detail.status,200);assert.equal(detail.body.detail.authoringReview.source.text,context.source.text);
  assert.equal(detail.body.detail.authoringReview.sourceRegistered,false);
  assert.ok(!JSON.stringify(detail.body.detail.item.config).includes(context.source.text));
  assert.equal((await api.call(body,{anonymous:true})).status,401);
  assert.equal((await api.call(body,{actor:ids.wrongRole})).status,403);
  await db.query("update profiles set role='teacher' where id=$1",[ids.wrongRole]);
  assert.equal((await api.call(body,{actor:ids.wrongRole})).status,403);
  // An earlier passing QA row cannot authorize a question whose source is absent.
  const approval=await api.call({action:'approve',itemId:ids.item},{aal:'aal2'});
  assert.equal(approval.status,409);assert.ok(approval.body.errors.includes('authoring_source_registration_pending'));
  assert.equal((await db.query('select count(*)::int n from item_reviews')).rows[0].n,0);
  let qa=await api.call({action:'run_qa',itemId:ids.item},{aal:'aal2'});
  assert.equal(qa.status,200);assert.equal(qa.body.qa.passed,false);
  await db.query('insert into learning_task_set_versions values($1,$1,$2,null)',[set,JSON.stringify({kind:'text'})]);
  await db.query('update items set stimulus=$2 where id=$1',[ids.item,JSON.stringify({kind:'task_set',taskSetVersionId:set})]);
  assert.equal((await api.call(body)).body.detail.authoringReview.sourceRegistered,false,'wrong source family stays held');
  await db.query('update learning_task_set_versions set source_family_id=$2 where id=$1',[set,family]);
  assert.equal((await api.call(body)).body.detail.authoringReview.sourceRegistered,true);
  qa=await api.call({action:'run_qa',itemId:ids.item},{aal:'aal2'});assert.equal(qa.body.qa.passed,true);
  await db.query("update learning_task_set_versions set stimulus='{"+'"kind":"audio"'+"}' where id=$1",[set]);
  assert.equal((await api.call(body)).body.detail.authoringReview.sourceRegistered,false,'wrong modality stays held');
  await db.query("update learning_task_set_versions set stimulus='{"+'"kind":"text"'+"}',revoked_at=now() where id=$1",[set]);
  assert.equal((await api.call(body)).body.detail.authoringReview.sourceRegistered,false,'revoked source stays held');
  await revise(db,payload({promptHy:'Revised current question'}));
  const next=await api.call(body);assert.equal(next.body.detail.item.versionNo,5);assert.equal(next.body.detail.authoringReview.version,4);
  assert.equal(next.body.detail.authoringReview.source.text,context.source.text);
  assert.deepEqual((await db.query('select snapshot from item_versions where item_id=$1 and version_no=4',[ids.item])).rows[0].snapshot,{authoringReview:context});
  await db.query("update items set config=jsonb_set(config,'{authoringReview,snapshotVersion}','3') where id=$1",[ids.item]);
  assert.equal((await api.call(body)).status,500,'missing private attachment fails closed');
  api.revoke();assert.equal((await api.call(body)).status,403);
 }finally{await db.close();}
});
