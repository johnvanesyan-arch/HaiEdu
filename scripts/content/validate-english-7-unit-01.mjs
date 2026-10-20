// Offline draft checks only. Never connects to a production service or publishes content.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {validateTypedDefinition,validateTypedKey,normalizeTypedText} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementDefinition,validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';

const path='docs/content/english-7-unit-01-draft.json';
const raw=readFileSync(path,'utf8'),packet=JSON.parse(raw),hash=x=>createHash('sha256').update(x).digest('hex');
const ids=new Set(packet.items.map(x=>x.code)),skillIds=new Set(packet.skills.map(x=>x.code));
const counts={items:packet.items.length,typedFields:0,acceptedAlternatives:0,rejectedAlternatives:0,sqlGradeCases:0,matchingMappings:0,orderingTasks:0,choiceItems:0,sourceSets:packet.sourceSets.length};
assert.equal(ids.size,packet.items.length);assert.equal(skillIds.size,14);
assert.deepEqual(packet.activityPath.map(x=>x.activity),Array.from({length:30},(_,i)=>i+1));
assert.equal(packet.importPlan.enabled,false);assert.equal(packet.permissions.learnerPublishAllowed,false);
assert.equal(packet.bankPlan.protectedDiagnosticCapacity,0);assert.equal(packet.bankPlan.protectedMasteryCapacity,0);
const db=new PGlite();await db.waitReady;
const inputs={};
function source(file){const text=readFileSync(file,'utf8');inputs[file]=hash(text);return text;}
function definition(text,name){const re=new RegExp('create (?:or replace )?function '+name.replaceAll('.','\\.')+'\\([\\s\\S]*?\\n\\$\\$;');const m=text.match(re);assert.ok(m,`Missing ${name}`);return m[0];}
try{
 await db.exec('create schema private');
 const typed=source('supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql');
 for(const name of ['normalize_typed_text','validate_typed_definition','validate_typed_key','validate_typed_response','grade_typed_fields'])await db.exec(definition(typed,'private.'+name));
 const arrangement=source('supabase/migrations/20261020153856_sprint_16_1b_matching_ordering.sql');
 for(const name of ['validate_arrangement_definition','validate_arrangement_response','validate_arrangement_key','grade_arrangement_response'])await db.exec(definition(arrangement,'private.'+name));
 for(const item of packet.items){
  assert.equal(item.status,'draft_not_staged');assert.equal(item.purpose,'practice');assert.equal(item.locale,'en');assert.ok(skillIds.has(item.skill));
  assert.ok(item.source.pages.length&&item.source.programme.length&&item.hint&&item.feedback);
  assert.equal(item.review.approvedBy,null);assert.equal(item.review.humanContent,'pending');
  assert.ok(['new_reasoning_coverage','intentional_practice_variant'].includes(item.comparison.disposition));
  for(const n of item.comparison.nearest)assert.ok(ids.has(n),`${item.code}: unknown nearest ${n}`);
  assert.ok(packet.activityPath.find(a=>a.activity===item.activity).itemCodes.includes(item.code));
  const d=item.definition,k=item.key;
  if(item.responseType==='single_choice'){
   counts.choiceItems++;assert.equal(new Set(item.options.map(x=>x.id)).size,item.options.length);
   assert.equal(item.options.filter(x=>x.id===k.optionId).length,1);
   assert.ok(item.options.every(x=>x.text.trim()&&x.feedback.trim()));
  }else if(item.responseType==='typed_fields'){
   validateTypedDefinition(d);validateTypedKey(d,k);
   const sql=async response=>{counts.sqlGradeCases++;return (await db.query('select private.grade_typed_fields($1,$2,$3) r',[d,k,response])).rows[0].r;};
   const complete={schemaVersion:d.schemaVersion,fields:Object.fromEntries(d.fields.map(f=>[f.id,k.fields[f.id].accepted[0]]))};
   assert.equal((await sql(complete)).score,1,item.code);
   for(const field of d.fields){
    counts.typedFields++;const key=k.fields[field.id],review=item.fieldReview[field.id];assert.ok(review.feedback&&review.reject.length);
    for(const accepted of key.accepted){
     counts.acceptedAlternatives++;
     const input=`  ${accepted.toUpperCase().replaceAll(' ','  ')}  `;
     assert.equal(normalizeTypedText(input,key.normalization),normalizeTypedText(accepted,key.normalization));
     const response=structuredClone(complete);response.fields[field.id]=input;
     assert.equal((await sql(response)).score,1,`${item.code}/${field.id}/${input}`);
    }
    for(const rejected of ['',...review.reject]){
     counts.rejectedAlternatives++;
     assert.ok(!key.accepted.some(x=>normalizeTypedText(x,key.normalization)===normalizeTypedText(rejected,key.normalization)),`${item.code}: rejected key collision`);
     const response=structuredClone(complete);response.fields[field.id]=rejected;
     const result=await sql(response);assert.equal(result.correctComponents,d.fields.length-1);assert.equal(result.requiredComponents,d.fields.length);
     assert.ok(Math.abs(result.score-(d.fields.length-1)/d.fields.length)<1e-12);
    }
   }
  }else{
   validateArrangementDefinition(item.responseType,d);validateArrangementKey(item.responseType,d,k);
   const sql=async response=>{counts.sqlGradeCases++;return(await db.query('select private.grade_arrangement_response($1,$2,$3,$4) r',[item.responseType,d,k,response])).rows[0].r;};
   if(item.responseType==='matching'){
    counts.matchingMappings+=d.sources.length;assert.equal((await sql(k)).score,1,item.code);
    const incomplete=structuredClone(k);incomplete.pairs[d.sources[0].id]='';const result=await sql(incomplete);
    assert.equal(result.correctComponents,d.sources.length-1);assert.ok(Math.abs(result.score-(d.sources.length-1)/d.sources.length)<1e-12);
   }else{
    counts.orderingTasks++;assert.equal((await sql({schemaVersion:d.schemaVersion,sequence:k.acceptedSequences[0]})).score,1);
    assert.equal((await sql({schemaVersion:d.schemaVersion,sequence:[...k.acceptedSequences[0]].reverse()})).score,0);
   }
  }
 }
 const allBound=[];
 for(const set of packet.sourceSets){
  assert.ok(set.members.length>=2&&set.members.length<=20);assert.equal(new Set(set.members).size,set.members.length);
  assert.equal(set.approval,null);assert.equal(set.status,'draft_not_registered');assert.equal(set.exposure,'familiar_source_not_protected');
  for(const code of set.members){assert.ok(ids.has(code));assert.equal(packet.items.find(x=>x.code===code).sourceSet,set.id);allBound.push(code);}
  if(set.kind==='passage')assert.ok(set.text.trim());
  else{assert.equal(set.audioAssetVersionId,null);assert.equal(set.speakerMappingVerified,false);assert.equal(set.transcriptLearnerDelivery,false);}
 }
 assert.equal(new Set(allBound).size,allBound.length);
 assert.equal(new Set(packet.sourceSets.filter(x=>x.kind==='audio_pending').map(x=>x.sourceFamilyProposedId)).size,1);
 const writingSource=source('supabase/migrations/20261020112724_sprint_16_1b_written_work.sql');
 await db.exec(`create table profiles(id uuid,role text,account_status text);
 create table curriculum_releases(id uuid,subject_program_id uuid);
 create table units(id uuid,subject_program_id uuid);
 create table written_task_versions(id int primary key,status text,reviewed_by uuid,review_evidence jsonb,definition jsonb,curriculum_release_id uuid,subject_program_id uuid,unit_id uuid);
 insert into curriculum_releases values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
 insert into units values ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002');`);
 await db.exec(definition(writingSource,'private.validate_written_task'));
 await db.exec('create trigger validate before insert or update on written_task_versions for each row execute function private.validate_written_task()');
 await db.query("insert into written_task_versions values(1,'draft',null,'{}',$1,'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003')",[packet.writing.definition]);
 await assert.rejects(db.exec("update written_task_versions set status='approved'"),/written_task_review_required/);
 assert.equal(packet.writing.definition.assistance.spellcheck,false);
 assert.deepEqual(packet.writing.definition.outcomes,['ENG7-U01-S13','ENG7-U01-S14']);
 const modelWords=packet.writing.model.text.trim().split(/\s+/u).length;assert.ok(modelWords>=80&&modelWords<=100);
 const coverage=packet.skills.map(skill=>({skill:skill.code,items:packet.items.filter(x=>x.skill===skill.code).map(x=>x.code),writing:packet.writing.definition.outcomes.includes(skill.code)?[packet.writing.code]:[]}));
 assert.ok(coverage.every(x=>x.items.length+x.writing.length>0));
 const result={schemaVersion:'haiedu-english-unit-draft-validation-v1',packetSha256:hash(raw),counts,modelWords,coverage,dispositions:Object.fromEntries(['new_reasoning_coverage','intentional_practice_variant'].map(d=>[d,packet.items.filter(x=>x.comparison.disposition===d).length])),sourceInputSha256:inputs,checks:{activityOrder:true,uniqueStableIds:true,currentJsDefinitionsAndKeys:true,isolatedCurrentSqlGrading:true,explicitZeroVersusBlank:true,britishAmericanAlternatives:true,sourceMembership:true,sharedAudioFamily:true,writingDefinitionAndApprovalGuard:true,unapprovedImportDisabled:true},limits:['Automated content/contract checks, not human language/SME approval.','No production writes, asset uploads, source registration, API changes or policy adoption.','No browser audio audition or English production end-to-end acceptance.','No unseen Diagnostic or Mastery capacity; no final pass rule.']};
 const json=JSON.stringify(result,null,2)+'\n';
 if(process.argv.includes('--write-evidence'))writeFileSync('docs/evidence/english-7-unit-01-draft-validation-20261020.json',json);
 else assert.deepEqual(JSON.parse(readFileSync('docs/evidence/english-7-unit-01-draft-validation-20261020.json','utf8')),result,'Evidence is stale; inspect changes before regenerating.');
 console.log(JSON.stringify({status:'passed',packetSha256:result.packetSha256,counts,modelWords,dispositions:result.dispositions}));
}finally{await db.close();}
