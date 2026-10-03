import test from 'node:test';
import assert from 'node:assert/strict';
import {database,ids} from './fixtures/phase3-db-harness.mjs';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
const refs={textbookLocator:'QA synthetic source',textbookSha256:'a'.repeat(64),programmeOutcomeLocator:'QA outcome',customProvenance:{fixture:true}};
const content={skillId:ids.skill,itemTemplateId:null,misconceptionCode:'qa_p3_candidate',triggerErrorCode:null,titleHy:'Փորձնական նոր ուղեցույց',strategyHy:'Դիտարկիր տվյալների կապը։',hint1Hy:'Առանձնացրու կարևոր տվյալները։',hint2Hy:'Համեմատիր տարբեր իրավիճակները։',workedExampleHy:'Դիտարկիր փորձնական այլ իրավիճակ։',allowedParameterKeys:[],metadata:{qaFixture:true}};
async function create(e){const r=await e.call({action:'create',guideScope:'skill',skillId:ids.skill,content,referenceMetadata:refs,changeRationale:'Isolated QA candidate'});assert.equal(r.status,201,JSON.stringify(r));return r.body.result.guideSourceId;}
const workflow=(guideSourceId,version,action,extra={})=>({guideScope:'skill',guideSourceId,expectedAuthoringVersion:version,action,...extra});

test('M04: unchanged guide review retains canonical provenance; changed content must be saved first',async()=>{const db=await database();try{const e=await endpoint(db),id=await create(e);
 const changed=await e.call(workflow(id,1,'submit_review',{content:{...content,titleHy:'Չպահպանված նոր վերնագիր'}}));assert.equal(changed.status,409);assert.equal(changed.body.error,'unsaved_changes_must_be_saved');
 const reviewed=await e.call(workflow(id,1,'submit_review'));assert.equal(reviewed.status,200,JSON.stringify(reviewed));
 const rows=(await db.query('select lifecycle_status,reference_metadata,content_snapshot from remediation_guide_authoring_versions where guide_source_id=$1 order by authoring_version',[id])).rows;
 assert.deepEqual(rows.map(r=>r.lifecycle_status),['draft','review']);assert.deepEqual(rows[1].reference_metadata,refs);assert.equal(rows[1].content_snapshot.titleHy,content.titleHy);
 assert.equal((await db.query('select status from skill_remediation_guides where id=$1',[id])).rows[0].status,'draft');
 }finally{await db.close();}});

test('M05: actual lifecycle guards reject AAL1, preserve runtime on reopen, and enforce archive fallback',async()=>{const db=await database();try{const e=await endpoint(db),id=await create(e);
 assert.equal((await e.call(workflow(id,1,'submit_review'))).status,200);
 const denied=await e.call(workflow(id,2,'publish'));assert.equal(denied.status,403);assert.equal(denied.body.error,'mfa_required');
 const published=await e.call(workflow(id,2,'publish'),{aal:'aal2'});assert.equal(published.status,200,JSON.stringify(published));
 const before=(await db.query('select title_hy,status,guide_version,metadata from skill_remediation_guides where id=$1',[id])).rows[0];assert.equal(before.status,'published');
 const archiveDenied=await e.call(workflow(id,3,'archive',{changeRationale:'QA archive'}));assert.equal(archiveDenied.body.error,'mfa_required');
 const reopened=await e.call(workflow(id,3,'save_draft',{content:{...content,titleHy:'Փորձնական նոր սևագիր'},changeRationale:'QA reopen'}));assert.equal(reopened.status,200,JSON.stringify(reopened));
 assert.deepEqual((await db.query('select title_hy,status,guide_version,metadata from skill_remediation_guides where id=$1',[id])).rows[0],before);
 assert.equal((await e.call(workflow(id,4,'submit_review'))).status,200);assert.equal((await e.call(workflow(id,5,'publish'),{aal:'aal2'})).status,200);
 await db.query("update item_template_remediation_guides set status='archived'");
 const missing=await e.call(workflow(id,6,'archive',{changeRationale:'QA archive'}),{aal:'aal2'});assert.equal(missing.status,409);assert.equal(missing.body.error,'skill_fallback_still_required');
 await db.query("update item_template_remediation_guides set status='published'");
 const archived=await e.call(workflow(id,6,'archive',{changeRationale:'QA archive'}),{aal:'aal2'});assert.equal(archived.status,200,JSON.stringify(archived));
 assert.equal((await db.query('select status from skill_remediation_guides where id=$1',[id])).rows[0].status,'archived');
 await assert.rejects(()=>db.query('delete from remediation_guide_authoring_versions where guide_source_id=$1',[id]),/append-only/);
 }finally{await db.close();}});

test('M06: concurrent guide writes commit one version and reject the stale writer',async()=>{const db=await database();try{const e=await endpoint(db),id=await create(e);
 const [a,b]=await Promise.all([e.call(workflow(id,1,'save_draft',{changeRationale:'QA writer A'})),e.call(workflow(id,1,'save_draft',{changeRationale:'QA writer B'}))]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);assert.match(JSON.stringify([a.body,b.body]),/stale_authoring_version/);
 const versions=(await db.query('select authoring_version from remediation_guide_authoring_versions where guide_source_id=$1 order by authoring_version',[id])).rows;assert.deepEqual(versions.map(v=>v.authoring_version),[1,2]);
 }finally{await db.close();}});

test('M03: guide validation and authorization failures do not append history',async()=>{const db=await database();try{const e=await endpoint(db),id=await create(e);
 for(const opts of [{anonymous:true},{actor:ids.wrongRole}])assert.ok([401,403].includes((await e.call(workflow(id,1,'submit_review'),opts)).status));
 const short=await e.call(workflow(id,1,'save_draft',{changeRationale:'x'}));assert.equal(short.status,400);
 const changed=await e.call(workflow(id,1,'submit_review',{content:{...content,hint1Hy:'ճիշտ պատասխանը A է'}}));assert.equal(changed.status,409);
 e.revoke();assert.equal((await e.call(workflow(id,1,'submit_review'))).status,403);
 assert.equal((await db.query('select count(*)::int n from remediation_guide_authoring_versions where guide_source_id=$1',[id])).rows[0].n,1);
 }finally{await db.close();}});
