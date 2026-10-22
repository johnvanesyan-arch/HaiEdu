// Build the inactive reviewer import from the remaining accepted DB/MB/MC packet.
// This script does not connect to any service or assign human approvals.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const paths=['docs/content/english-7-unit-01-assessment-batch-bcd.json'];
const packets=paths.map(p=>JSON.parse(readFileSync(p,'utf8')));
const sha=b=>createHash('sha256').update(b).digest('hex');
// Deterministic scoped identities, not claims of independent source coverage.
function id(label){const h=sha('haiedu-review-onboarding-v1:'+label);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
const identities={subject:id('english'),programme:id('english-grade7-2026-review'),unit:id('ENG7-U01'),release:id('english7_u01_review_r1')};
const sourceMap=new Map(packets.flatMap(p=>p.sourceSets.map(s=>[s.id,s])));
const items=packets.flatMap((p,n)=>p.items.map(item=>({...item,packetPath:paths[n]})));
assert.equal(items.length,84);assert.equal(new Set(items.map(i=>i.code)).size,84);
const rows={item_families:[],item_templates:[],items:[],item_options:[],item_answer_keys:[],item_curriculum_scopes:[]};
const snapshots=[];
for(const original of items){
 const {packetPath,...i}=original;
 const familyId=id(i.code+':family'),templateId=id(i.code+':template'),itemId=id(i.code),skillId=id(i.skill);
 const source=i.sourceSet?sourceMap.get(i.sourceSet):null;
 assert.ok(!i.sourceSet||source,i.code);
 const reference=`${i.source.book}; pp. ${(i.source.pages||i.pages).join(', ')}; activities ${(i.source.activities||[i.activity]).join(', ')}; programme ${i.source.programme.join(', ')}; ${packetPath}#${i.code}`;
 const metadata={checkpoint:'16.1C.13',sourcePacket:packetPath,sourcePacketSha256:sha(readFileSync(packetPath)),originalDraftVersion:i.version,originalDraftSha256:sha(JSON.stringify(i)),intendedBank:i.purpose,learnerVisible:false,allocationAllowed:false,contentLocale:i.locale,comparisonDisposition:i.comparison.disposition,independentCoverageClaimed:false,sourceFamilyProposedId:source?.sourceFamilyProposedId??null,authorProvenance:'Codex automated author and inactive draft import; human review pending'};
 const profile={authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidenceBlueprintPolicy:'distinct-purpose-v1',requiredEvidencePurposes:['application'],enforceUniqueEvidencePurposes:true,variantCount:1,generationMode:'authored_fixed_catalogue',qaContract:'authored_fixed_catalogue',misconceptionMappingPolicy:'review_notes_only',...metadata};
 rows.item_families.push({id:familyId,skill_id:skillId,code:i.code+'-F01',name_hy:i.code+' · ստուգման նախագիծ',description:'One fixed authoring record; family identity does not establish new reasoning or source independence.',metadata});
 rows.item_templates.push({id:templateId,item_family_id:familyId,code:i.code+'-T01',template_kind:'fixed',template_version:1,generation_config:profile,status:'draft'});
 const config={...metadata,authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidencePurpose:'application',sprint11dBucket:i.purpose==='mastery'?'mastery_check':i.purpose,shuffleOptions:true,authoringReview:{schemaVersion:'haiedu-authoring-review-v1',snapshotVersion:1},...(i.definition?{responseDefinition:i.definition}:{})};
 const row={id:itemId,skill_id:skillId,item_type:i.responseType,prompt_hy:i.prompt,prompt_en:i.prompt,stimulus:{},difficulty:2,difficulty_band:'core',item_family:'application',source_reference:reference,validation_state:'provisional_no_sme_review',review_status:'needs_review',version_no:1,status:'draft',code:i.code,config,item_template_id:templateId,variant_key:'fixed_v1'};
 rows.items.push(row);
 const options=(i.options||[]).map((o,n)=>({id:id(i.code+':option:'+o.id),item_id:itemId,option_key:o.id,content_hy:o.text,content_en:o.text,display_order:n+1}));rows.item_options.push(...options);
 const key={item_id:itemId,answer:i.responseType==='single_choice'?i.key.optionId:i.key,tolerance:null,canonical_unit:null,accepted_units:[]};rows.item_answer_keys.push(key);
 rows.item_curriculum_scopes.push({id:id(i.code+':scope'),item_id:itemId,subject_program_id:identities.programme,unit_id:identities.unit,is_primary:true});
 const context={schemaVersion:'haiedu-authoring-review-v1',itemCode:i.code,version:1,locale:i.locale,sourcePacket:packetPath,sourceReference:reference,hint:i.hint||i.reviewHint||null,feedback:i.feedback,optionFeedback:(i.options||[]).map(o=>({key:o.id,text:o.feedback})),fieldFeedback:Object.entries(i.fieldReview||{}).map(([id,v])=>({id,text:v.feedback||'',rejectedExamples:v.reject||[]})),comparison:i.comparison,source:source?{id:source.id,kind:source.kind==='passage'?'reading':'listening',format:source.scriptEvidence?'summary':source.kind==='passage'?'passage':'script',familyId:source.sourceFamilyProposedId,title:source.title,locale:source.locale,text:source.text||(source.script?source.script.map(s=>`${s.speaker}: ${s.spoken}`).join('\n\n'):source.scriptEvidence),sourceReferences:[source.sourceUrl,source.externalSource,source.sourceReference].filter(Boolean),reviewStatus:'pending',registrationStatus:'unregistered',audioAvailable:false}:null};
 assert.ok(!context.source||context.source.text?.length>20,i.code+' source');
 // The actual insertion constructs the item/options/key snapshot from saved rows;
 // authoringReview is the only extra private attachment, copied without edits.
 snapshots.push({itemId,itemCode:i.code,context});
}
const result={schemaVersion:'haiedu-review-import-v1',checkpoint:'16.1C.13',baselineCommit:'1d7ad5a7faf44f9001581ade255e7f1bf48b4b90',identities,sourceFiles:Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))])),counts:{items:items.length,practice:0,diagnostic:28,mastery:56,sourceHeld:24,audioHeld:12,readingHeld:12,options:rows.item_options.length},rows,snapshots};
assert.equal(snapshots.filter(s=>s.context.source).length,24);
const output=process.argv[2];assert.ok(output,'Supply a private output JSON path');writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));
