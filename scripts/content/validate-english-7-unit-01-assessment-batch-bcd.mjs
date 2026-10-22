// Offline validation of the exact accepted DB/MB/MC content batch. No production calls.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {validateTypedDefinition,validateTypedKey,normalizeTypedText} from '../../supabase/functions/_shared/typed-fields.mjs';
const packetPath='docs/content/english-7-unit-01-assessment-batch-bcd.json';
const evidencePath='docs/evidence/english-7-unit-01-assessment-batch-bcd-validation-20261022.json';
const raw=readFileSync(packetPath,'utf8'),p=JSON.parse(raw);
const hash=s=>createHash('sha256').update(s).digest('hex');
const plan=JSON.parse(readFileSync('docs/content/english-7-unit-01-bank-plan.json','utf8'));
const acceptance=JSON.parse(readFileSync(p.ownerAcceptance,'utf8'));
for(const [path,expected]of Object.entries(p.preservedInputs))assert.equal(hash(readFileSync(path)),expected,path);
assert.equal(acceptance.authorization.boundedProtectedParallelManifestAccepted,true);
assert.equal(acceptance.authorization.humanContentApprovalDelegated,false);
const baseline=JSON.parse(readFileSync('docs/content/english-7-unit-01-draft.json','utf8'));
const practice=JSON.parse(readFileSync('docs/content/english-7-unit-01-practice-additions.json','utf8'));
const earlier=JSON.parse(readFileSync('docs/content/english-7-unit-01-assessment-batch-a.json','utf8'));
const before=[...baseline.items,...practice.items,...earlier.items];
const ids=new Set(p.items.map(i=>i.code));
assert.equal(p.items.length,84);assert.equal(ids.size,84);assert.equal(p.sourceSets.length,12);
assert.ok(before.every(i=>!ids.has(i.code)));
const counts={items:84,choiceItems:0,choiceOptions:0,choiceOrderKeyChecks:0,typedItems:0,typedFields:0,sqlGradeCases:0,acceptedNormalizations:0,rejectedOrBlankFields:0,allBlankCases:0,malformedResponseRejections:0,textItems:0,audioHeldItems:0,sourceSets:12};
const sourceInputs={};
const sqlPath='supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql',sql=readFileSync(sqlPath,'utf8');
const jsPath='supabase/functions/_shared/typed-fields.mjs';
for(const path of [sqlPath,jsPath])sourceInputs[path]=hash(readFileSync(path));
const db=new PGlite();await db.waitReady;
function permutations(a){if(a.length<2)return[a];return a.flatMap((x,n)=>permutations(a.filter((_,i)=>i!==n)).map(rest=>[x,...rest]));}
try{
 await db.exec('create schema private');
 for(const name of ['normalize_typed_text','validate_typed_definition','validate_typed_key','validate_typed_response','grade_typed_fields']){
  const match=sql.match(new RegExp('create (?:or replace )?function private\\.'+name+'\\([\\s\\S]*?\\n\\$\\$;'));
  assert.ok(match,name);await db.exec(match[0]);
 }
 for(const i of p.items){
  const form=plan.forms.find(f=>f.code===i.form),slot=form.slots.find(s=>s.slotId===i.manifestSlot);
  assert.ok(slot);assert.equal(i.skill,slot.skill);assert.equal(i.demandId,slot.demandId);assert.equal(i.purpose,form.purpose);
  assert.equal(slot.itemCode,i.code);assert.equal(slot.itemVersion,1);assert.equal(slot.approvedBy,null);
  assert.equal(i.status,'draft_not_staged');assert.equal(i.review.approvedBy,null);
  assert.equal(i.review.humanContent,'pending');assert.equal(i.review.exposureQualification,'pending');
  assert.equal(i.delivery.enabled,false);assert.equal(i.delivery.allocationCreated,false);
  assert.equal(i.delivery.reviewHintsLearnerVisible,false);assert.equal(i.delivery.answerFeedbackLearnerVisible,false);
  assert.equal(i.comparison.disposition,'protected_parallel_assessment_variant');assert.equal(i.comparison.independentNewReasoningClaimed,false);
  assert.ok(i.comparison.nearestPractice.every(c=>before.some(b=>b.code===c&&b.purpose==='practice')));
  assert.ok(i.comparison.nearestExistingAssessment.every(c=>earlier.items.some(b=>b.code===c)));
  assert.ok(i.comparison.nearestBatch.every(c=>ids.has(c)&&c!==i.code));
  assert.ok(i.comparison.newStimulusInterpretation.length>70&&i.comparison.completeSolution&&i.comparison.guideRelationship);
  assert.ok(i.source.pages.length&&i.source.activities.length&&i.source.programme.length);
  if(slot.modality==='audio'){counts.audioHeldItems++;assert.ok(i.audioHold);}else counts.textItems++;
  if(i.sourceSet){
   const source=p.sourceSets.find(s=>s.id===i.sourceSet);
   assert.ok(source&&source.members.includes(i.code));assert.equal(source.reservedForm,i.form);
   assert.equal(i.plannedSourceSet,slot.sourceSetPlaceholder);
   assert.ok(i.sourceEvidenceSentenceIds.length);
   assert.ok(i.sourceEvidenceSentenceIds.every(id=>source.sentences.some(s=>s.id===id)));
  }else assert.equal(slot.sourceSetPlaceholder,null);
  if(i.responseType==='single_choice'){
   counts.choiceItems++;counts.choiceOptions+=i.options.length;
   assert.equal(i.options.length,3);assert.equal(new Set(i.options.map(o=>o.id)).size,3);
   assert.equal(new Set(i.options.map(o=>o.text)).size,3);
   const correct=i.options.find(o=>o.id===i.key.optionId);assert.ok(correct);
   assert.ok(i.options.every(o=>o.text.trim()&&o.feedback.trim()));
   for(const order of permutations(i.options)){
    counts.choiceOrderKeyChecks++;
    assert.equal(order.find(o=>o.id===i.key.optionId)?.text,correct.text);
   }
   continue;
  }
  assert.equal(i.responseType,'typed_fields');counts.typedItems++;
  const d=i.definition,k=i.key;validateTypedDefinition(d);validateTypedKey(d,k);
  const full={schemaVersion:d.schemaVersion,fields:Object.fromEntries(d.fields.map(f=>[f.id,k.fields[f.id].accepted[0]]))};
  const grade=async response=>{counts.sqlGradeCases++;return(await db.query('select private.grade_typed_fields($1,$2,$3) result',[d,k,response])).rows[0].result;};
  assert.equal((await grade(full)).score,1,i.code);
  for(const f of d.fields){
   counts.typedFields++;const key=k.fields[f.id],review=i.fieldReview[f.id];assert.ok(review.reject.length);
   for(const v of key.accepted){
    counts.acceptedNormalizations++;const response=structuredClone(full);response.fields[f.id]='  '+v.toUpperCase()+'  ';
    assert.equal((await grade(response)).score,1);
   }
   for(const v of ['',...review.reject]){
    counts.rejectedOrBlankFields++;
    assert.ok(!key.accepted.some(a=>normalizeTypedText(a,key.normalization)===normalizeTypedText(v,key.normalization)));
    const response=structuredClone(full);response.fields[f.id]=v;const result=await grade(response);
    assert.equal(result.correctComponents,d.fields.length-1);assert.equal(result.requiredComponents,d.fields.length);
    assert.ok(Math.abs(result.score-(d.fields.length-1)/d.fields.length)<1e-12);
   }
  }
  counts.allBlankCases++;assert.equal((await grade({schemaVersion:d.schemaVersion,fields:Object.fromEntries(d.fields.map(f=>[f.id,'']))})).score,0);
  counts.malformedResponseRejections++;const malformed=structuredClone(full);malformed.fields.unexpected='forged';
  await assert.rejects(grade(malformed),/typed_fields_response_invalid/);
 }
 assert.equal(counts.textItems,72);assert.equal(counts.audioHeldItems,12);
 const familyIds=new Set(p.sourceSets.map(s=>s.sourceFamilyProposedId));assert.equal(familyIds.size,12);
 assert.ok([...baseline.sourceSets,...practice.sourceSets,...earlier.sourceSets].every(s=>!familyIds.has(s.sourceFamilyProposedId)));
 const sources=[];
 for(const s of p.sourceSets){
  assert.equal(s.status,'draft_not_registered');assert.equal(s.members.length,2);
  assert.equal(s.approval,null);assert.equal(s.permissionReference,null);assert.equal(s.distinctnessQualified,false);assert.equal(s.sourceVersionRegistered,false);
  assert.deepEqual(s.members,plan.forms.find(f=>f.code===s.reservedForm).sourceSets.find(t=>t.plannedCode===s.plannedCode).memberSlots.map(x=>x.replace('-PLAN-','-')));
  assert.ok(s.members.every(c=>p.items.find(i=>i.code===c)?.sourceSet===s.id));
  assert.deepEqual(s.permittedPurposeProposal,[s.reservedForm==='DB'?'diagnostic':'mastery']);
  assert.equal(s.exposure,'protected_candidate_unregistered');
  if(s.kind==='audio_pending'){
   assert.equal(s.audioAssetVersionId,null);assert.equal(s.auditionCompleted,false);assert.equal(s.speakerMappingVerified,false);assert.equal(s.transcriptLearnerDelivery,false);
   assert.equal(s.text,null);assert.deepEqual(s.script.map(t=>t.spoken),s.sentences.map(t=>t.text));
   if(s.id.endsWith('AUDIO-B')){
    assert.deepEqual(s.script.map(t=>t.speaker),['narrator','speaker_1','speaker_2','speaker_3']);
    for(const [j,word]of ['One','Two','Three'].entries())assert.ok(s.script[j+1].spoken.startsWith('Speaker '+word+'.'));
   }else assert.equal(s.script.length,1);
  }else assert.equal(s.text,s.sentences.map(x=>x.text).join('\n\n'));
  const content=s.kind==='passage'?s.text:s.script.map(x=>x.spoken).join(' ');
  sources.push({id:s.id,kind:s.kind,members:s.members,wordCount:content.split(/\s+/u).filter(Boolean).length,contentSha256:hash(content)});
 }
 assert.equal(new Set(sources.map(s=>s.contentSha256)).size,12);
 const formCounts=p.forms.map(f=>{
  const members=p.items.filter(i=>i.form===f.code),slots=plan.forms.find(x=>x.code===f.code).slots;
  assert.deepEqual(members.map(i=>i.manifestSlot),slots.map(s=>s.slotId));
  assert.deepEqual([...f.proposedPresentationOrder].sort(),[...f.members].sort());
  for(const s of p.sourceSets.filter(s=>s.reservedForm===f.code)){const pos=s.members.map(c=>f.proposedPresentationOrder.indexOf(c)).sort((a,b)=>a-b);assert.equal(pos[1]-pos[0],1);}
  for(const sk of plan.skills)assert.equal(members.filter(i=>i.skill===sk.skill).length,sk.perAssessmentForm);
  assert.equal(f.qualified,false);assert.equal(f.allocationCreated,false);assert.equal(f.policyVersion,null);
  return {form:f.code,items:members.length,text:members.filter(i=>!i.audioHold).length,audioHeld:members.filter(i=>i.audioHold).length,maximumItemPoints:28,sourceSets:4,responseComponents:members.reduce((n,i)=>n+(i.definition?.fields.length||1),0)};
 });
 assert.ok(formCounts.every(f=>f.items===28&&f.text===24&&f.audioHeld===4));
 const result={schemaVersion:'haiedu-english-assessment-batch-validation-v1',checkpoint:'16.1C.13',packetSha256:hash(raw),acceptanceSha256:hash(readFileSync(p.ownerAcceptance)),counts,forms:formCounts,sources,sourceInputSha256:sourceInputs,
 reusedEvidence:[{path:'docs/evidence/english-7-unit-01-draft-validation-20261020.json',sqlGradeCases:169,rerun:false},{path:'docs/evidence/english-7-unit-01-practice-validation-20261021.json',sqlGradeCases:57,rerun:false}],
 checks:{accepted84Slots:true,existing116Unchanged:true,typedJsAndSqlContracts:true,partialCreditAndBlanks:true,malformedExtraIdsRejected:true,choiceStableIdOrderInvariant:true,sourceMembershipAndGrouping:true,conditionalAudioKeys:true,numberedSpeakers:true,protectedPurposeSeparation:true,zeroApprovedOrQualifiedCapacity:true},
 limits:['Choice permutation checks are content/key checks, not a rerun of runtime choice grading or browser shuffling.','Source/semantic judgments are automated-author judgments awaiting human and SME/exposure review, not automatic semantic-test results.','Listening is checked against unrecorded scripts only; no audition, rights, playback or form qualification is claimed.','No production writes, registration, allocation or learner release.']};
 result.reusedEvidence.push({path:'docs/evidence/english-7-unit-01-assessment-batch-a-validation-20261021.json',sqlGradeCases:95,rerun:false});
 const output=JSON.stringify(result,null,2)+'\n';
 if(process.argv.includes('--write-evidence'))writeFileSync(evidencePath,output);
 else assert.deepEqual(JSON.parse(readFileSync(evidencePath,'utf8')),result,'Stale evidence: review content before regeneration.');
 console.log(JSON.stringify({status:'passed',counts,forms:formCounts}));
}finally{await db.close();}

