// Validate the bounded Practice delta against current local contracts. No production calls.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { validateTypedDefinition, validateTypedKey, normalizeTypedText } from '../../supabase/functions/_shared/typed-fields.mjs';

const packetPath='docs/content/english-7-unit-01-practice-additions.json';
const evidencePath='docs/evidence/english-7-unit-01-practice-validation-20261021.json';
const raw=readFileSync(packetPath,'utf8'), packet=JSON.parse(raw), hash=s=>createHash('sha256').update(s).digest('hex');
const baseRaw=readFileSync(packet.basePacket,'utf8'),base=JSON.parse(baseRaw);
assert.equal(hash(baseRaw),packet.basePacketSha256);
assert.equal(hash(baseRaw),'d519f2597248d75a64025e9f870cf0cedcfe7b085bf10c1f395794e222d1e1f4');
const plan=JSON.parse(readFileSync('docs/content/english-7-unit-01-bank-plan.json','utf8'));
const acceptance=JSON.parse(readFileSync(packet.ownerAcceptance,'utf8'));
assert.equal(acceptance.authorization.bankPlanAccepted,true);
assert.equal(acceptance.authorization.boundedProtectedParallelManifestAccepted,true);
assert.equal(acceptance.authorization.humanContentApprovalDelegated,false);
assert.equal(packet.permissions.importEnabled,false);
const originalIds=new Set(base.items.map(i=>i.code)), ids=new Set(packet.items.map(i=>i.code));
assert.equal(base.items.length,45);assert.equal(packet.items.length,15);assert.equal(ids.size,15);
assert.ok([...ids].every(id=>!originalIds.has(id)));
assert.deepEqual([...ids].sort(),plan.practiceAdditions.map(x=>x.plannedItemCode).sort());
const allIds=new Set([...originalIds,...ids]),skills=new Set(base.skills.map(s=>s.code));
const counts={items:15,textItems:0,audioHeldItems:0,typedItems:0,typedFields:0,choiceItems:0,choiceOptions:0,sqlGradeCases:0,acceptedNormalizations:0,rejectedOrBlankFields:0,allBlankCases:0,malformedResponseRejections:0};
const inputs={};
const sqlPath='supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql';
const sqlText=readFileSync(sqlPath,'utf8');inputs[sqlPath]=hash(sqlText);
const jsPath='supabase/functions/_shared/typed-fields.mjs';inputs[jsPath]=hash(readFileSync(jsPath,'utf8'));
const db=new PGlite();await db.waitReady;
try{
 await db.exec('create schema private');
 for(const name of ['normalize_typed_text','validate_typed_definition','validate_typed_key','validate_typed_response','grade_typed_fields']){
  const m=sqlText.match(new RegExp('create (?:or replace )?function private\\.'+name+'\\([\\s\\S]*?\\n\\$\\$;'));assert.ok(m,name);await db.exec(m[0]);
 }
 for(const item of packet.items){
  assert.equal(item.status,'draft_not_staged');assert.equal(item.purpose,'practice');assert.equal(item.locale,'en');assert.ok(skills.has(item.skill));
  const spec=plan.practiceAdditions.find(s=>s.plannedItemCode===item.code);assert.equal(item.skill,spec.skill);assert.ok(spec.bookActivities.includes(item.activity));
  assert.equal(item.review.approvedBy,null);assert.equal(item.review.humanContent,'pending');
  assert.equal(item.comparison.disposition,'intentional_practice_variant');assert.equal(item.comparison.independentNewReasoningClaimed,false);
  assert.ok(item.source.pages.length&&item.source.programme.length&&item.hint&&item.feedback&&item.comparison.rationale);
  assert.ok(item.comparison.nearest.every(id=>allIds.has(id)));
  assert.ok(packet.activityAdditions.find(a=>a.activity===item.activity).itemCodes.includes(item.code));
  if(item.sourceSet){counts.audioHeldItems++;assert.ok(item.audioHold);}else counts.textItems++;
  if(item.responseType==='single_choice'){
   counts.choiceItems++;counts.choiceOptions+=item.options.length;
   assert.equal(new Set(item.options.map(o=>o.id)).size,item.options.length);
   assert.equal(item.options.filter(o=>o.id===item.key.optionId).length,1);
   assert.ok(item.options.every(o=>o.text.trim()&&o.feedback.trim()));
   continue;
  }
  assert.equal(item.responseType,'typed_fields');counts.typedItems++;
  const d=item.definition,k=item.key;validateTypedDefinition(d);validateTypedKey(d,k);
  const grade=async response=>{counts.sqlGradeCases++;return(await db.query('select private.grade_typed_fields($1,$2,$3) result',[d,k,response])).rows[0].result;};
  const full={schemaVersion:d.schemaVersion,fields:Object.fromEntries(d.fields.map(f=>[f.id,k.fields[f.id].accepted[0]]))};
  assert.equal((await grade(full)).score,1,item.code);
  for(const field of d.fields){
   counts.typedFields++;const key=k.fields[field.id],review=item.fieldReview[field.id];assert.ok(review.reject.length&&review.feedback);
   for(const accepted of key.accepted){
    const input=`  ${accepted.toUpperCase()}  `;counts.acceptedNormalizations++;
    assert.equal(normalizeTypedText(input,key.normalization),normalizeTypedText(accepted,key.normalization));
    const response=structuredClone(full);response.fields[field.id]=input;assert.equal((await grade(response)).score,1);
   }
   for(const rejected of ['',...review.reject]){
    counts.rejectedOrBlankFields++;
    assert.ok(!key.accepted.some(v=>normalizeTypedText(v,key.normalization)===normalizeTypedText(rejected,key.normalization)));
    const response=structuredClone(full);response.fields[field.id]=rejected;const result=await grade(response);
    assert.equal(result.correctComponents,d.fields.length-1);assert.equal(result.requiredComponents,d.fields.length);
    assert.ok(Math.abs(result.score-(d.fields.length-1)/d.fields.length)<1e-12);
   }
  }
  counts.allBlankCases++;
  assert.equal((await grade({schemaVersion:d.schemaVersion,fields:Object.fromEntries(d.fields.map(f=>[f.id,'']))})).score,0);
  const malformed=structuredClone(full);malformed.fields.unexpected='forged';counts.malformedResponseRejections++;
  await assert.rejects(grade(malformed),/typed_fields_response_invalid/);
 }
 assert.equal(counts.textItems,11);assert.equal(counts.audioHeldItems,4);
 assert.equal(packet.sourceSets.length,1);const set=packet.sourceSets[0];
 assert.equal(set.kind,'audio_pending');assert.equal(set.audioAssetVersionId,null);assert.equal(set.approval,null);assert.equal(set.permissionReference,null);
 assert.equal(set.speakerMappingVerified,false);assert.equal(set.transcriptLearnerDelivery,false);assert.equal(set.exposure,'familiar_source_not_protected');
 assert.deepEqual(set.members,['ENG7-U01-L07','ENG7-U01-L08','ENG7-U01-L09','ENG7-U01-L10']);
 assert.ok(set.members.every(id=>packet.items.find(i=>i.code===id)?.sourceSet===set.id));
 assert.ok(!base.sourceSets.some(s=>s.sourceFamilyProposedId===set.sourceFamilyProposedId));
 assert.deepEqual(set.script.map(t=>t.speaker),['narrator','speaker_1','speaker_2','speaker_3']);
 assert.ok(set.script[1].spoken.includes('Speaker One.')&&set.script[2].spoken.includes('Speaker Two.')&&set.script[3].spoken.includes('Speaker Three.'));
 const order=packet.activityAdditions.map(a=>a.activity);assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 const cumulative=plan.skills.map(s=>({skill:s.skill,practice:[...base.items,...packet.items].filter(i=>i.skill===s.skill).length,target:s.proposedPractice}));
 assert.ok(cumulative.every(s=>s.practice===s.target));assert.equal(cumulative.reduce((n,s)=>n+s.practice,0),60);
 const result={schemaVersion:'haiedu-english-practice-additions-validation-v1',checkpoint:'16.1C.4',packetSha256:hash(raw),basePacketSha256:hash(baseRaw),acceptanceSha256:hash(readFileSync(packet.ownerAcceptance,'utf8')),counts,cumulative,sourceInputSha256:inputs,reusedBaseEvidence:{path:'docs/evidence/english-7-unit-01-draft-validation-20261020.json',sha256:hash(readFileSync('docs/evidence/english-7-unit-01-draft-validation-20261020.json','utf8')),sqlCases:169,rerun:false},checks:{exactAccepted15Slots:true,base45Unchanged:true,bookActivityOrder:true,currentJsTypedContracts:true,currentSqlGrading:true,partialCreditAndBlank:true,malformedRejected:true,sourceMembership:true,speakerNumbers:true,conditionalAudioKeys:true,approvedCapacityStillZero:true},limits:['Author validation is not human language/SME approval or empirical calibration.','Audio keys are conditional on the unrecorded script; there is no audio audition or playable asset.','No production staging, source registration, policy activation or learner release.']};
 const output=JSON.stringify(result,null,2)+'\n';
 if(process.argv.includes('--write-evidence'))writeFileSync(evidencePath,output);
 else assert.deepEqual(JSON.parse(readFileSync(evidencePath,'utf8')),result,'Evidence stale; review before regeneration.');
 console.log(JSON.stringify({status:'passed',packetSha256:result.packetSha256,counts}));
}finally{await db.close();}
