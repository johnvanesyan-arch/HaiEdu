// Offline inactive import builder. Protected input packets must stay outside public Git.
// Usage: node scripts/content/prepare-english-7-unit-02-review.mjs PRIVATE_DIRECTORY
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
assert.ok(process.argv[2],'Supply the restricted authoring directory');
const root=resolve(process.argv[2]), read=n=>JSON.parse(readFileSync(root+'/'+n));
const p=read('unit2-authoring.json'),materials=read('unit2-materials.json').materials,comparison=read('candidate-comparison.json');
const sha=x=>createHash('sha256').update(x).digest('hex');
function id(label){const h=sha('haiedu-review-onboarding-v1:'+label);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
assert.equal(p.items.length,192);assert.equal(new Set(p.items.map(i=>i.code)).size,192);assert.equal(comparison.records.length,192);assert.equal(comparison.withinBatchPairCount,18336);
assert.equal(p.sourceSets.length,28);assert.equal(materials.length,9);
const identities={subject:'c230d771-0bea-5076-a570-e440f9e05c09',programme:'a88ac34c-3b29-5c9d-a5c4-95339b71c067',unit:'94882724-418a-51c3-b28e-0e094c70e6b9',release:'633ef1f7-080b-5500-9be0-9a53dadfcbf4'};
assert.equal(p.scope.unitId,identities.unit);assert.equal(p.scope.draftReleaseId,identities.release);
const packetPath='restricted:haiedu-english7-unit2-review-20261023.zip',packetHash=sha(readFileSync(root+'/unit2-authoring.json'));
const items=p.items.map(i=>({...i,packetPath})),sourceMap=new Map(p.sourceSets.map(s=>[s.id,s]));
for(const i of items){assert.ok(i.code.startsWith('ENG7-U02-'));assert.equal(i.comparison.wholeBankReview,'complete_automated_author_review_candidate_only');assert.equal(i.comparison.independentNewReasoningClaimed,false);}
const hy=['Երաժշտական բառապաշար','Լսելու և ձայնի մասին արտահայտություններ','Ստացական հղումներ','Տեղի, շարժման և ժամանակի նախդիրներ','Պարզ ներկայի և անցյալի կրավորական կառույցներ','Ածականի և մակբայի նույն ձևերը','Ածական և նախդիր կապակցություններ','Ներկա վաղակատար և ավարտված անցյալ','Անցյալ պարզ և շարունակական ժամանակներ','Ընթերցանության հիմնական միտքն ու նպատակը','Ընթերցանության մանրամասներն ու կապերը','Լսանյութի հիմնական միտքը','Լսանյութի մանրամասներն ու խոսողների տեսակետները','Երաժշտական ոճի և ստեղծագործության գրավոր ներկայացում','Երաժշտության մասին տեսակետին հիմնավորված գրավոր արձագանք'];
const skills=[...p.skills,{code:'ENG7-U02-S14',label:'Informational description of a musical style and work',outcomeLocator:'T2.L4',role:'teacher-reviewed-writing'},{code:'ENG7-U02-S15',label:'Reasoned written response to a view about music',outcomeLocator:'T2.L5; standard ՕԼ7-Հ-Փ․3',role:'teacher-reviewed-writing'}].map((s,n)=>({id:id(s.code),subject_id:identities.subject,grade_id:'7c8e33b7-0927-4820-83ca-59d88603ccc7',code:s.code,name_hy:hy[n],name_en:s.label,description_en:`Unit 2 draft reviewer target; ${s.role}; programme planning locator ${s.outcomeLocator}. Formal reconciliation, human review and allocation remain pending.`,layer:n===0?'knowledge':'application',sequence_order:n+1,status:'review'}));
const rows={skills,curriculum_release_skills:skills.map(s=>({curriculum_release_id:identities.release,skill_id:s.id,skill_code_snapshot:s.code,name_hy_snapshot:s.name_hy,name_en_snapshot:s.name_en,description_en_snapshot:s.description_en,layer_snapshot:s.layer,sequence_order_snapshot:s.sequence_order,disposition_snapshot:'review_pending',rationale_snapshot:'Accepted authoring scope only; no qualification or numerical policy adoption.',outcome_mapping_snapshot:[]})),item_families:[],item_templates:[],items:[],item_options:[],item_answer_keys:[],item_curriculum_scopes:[],unit_material_versions:[]};
const snapshots=[];
for(const original of items){
 const {packetPath,...i}=original;
 const familyId=id(i.code+':family'),templateId=id(i.code+':template'),itemId=id(i.code),skillId=id(i.skill);
 const source=i.sourceSet?sourceMap.get(i.sourceSet):null;
 assert.ok(!i.sourceSet||source,i.code);
 const reference=`${i.source.book}; ${i.source.anchor}; programme ${i.source.programme.join(', ')}; ${packetPath}#${i.code}`;
 const metadata={checkpoint:'16.1C.29',sourcePacket:packetPath,sourcePacketSha256:packetHash,originalDraftVersion:i.version,deliveryRole:i.deliveryRole,originalDraftSha256:sha(JSON.stringify(i)),intendedBank:i.purpose,learnerVisible:false,allocationAllowed:false,contentLocale:i.locale,comparisonDisposition:i.comparison.disposition,independentCoverageClaimed:false,sourceFamilyProposedId:source?.sourceFamilyProposedId??null,authorProvenance:'Codex automated author and inactive draft import; human review pending'};
 const profile={authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidenceBlueprintPolicy:'distinct-purpose-v1',requiredEvidencePurposes:['application'],enforceUniqueEvidencePurposes:true,variantCount:1,generationMode:'authored_fixed_catalogue',qaContract:'authored_fixed_catalogue',misconceptionMappingPolicy:'review_notes_only',...metadata};
 rows.item_families.push({id:familyId,skill_id:skillId,code:i.code+'-F01',name_hy:i.code+' · ստուգման նախագիծ',description:'One fixed authoring record; family identity does not establish new reasoning or source independence.',metadata});
 rows.item_templates.push({id:templateId,item_family_id:familyId,code:i.code+'-T01',template_kind:'fixed',template_version:1,generation_config:profile,status:'draft'});
 const config={...metadata,authoringProfileVersion:'haiedu-evidence-blueprint-v1',evidencePurpose:'application',sprint11dBucket:i.purpose==='mastery'?'mastery_check':i.purpose,shuffleOptions:true,authoringReview:{schemaVersion:'haiedu-authoring-review-v1',snapshotVersion:1},...(i.definition?{responseDefinition:i.definition}:{})};
 const row={id:itemId,skill_id:skillId,item_type:i.responseType,prompt_hy:i.prompt,prompt_en:i.prompt,stimulus:{},difficulty:2,difficulty_band:'core',item_family:'application',source_reference:reference,validation_state:'provisional_no_sme_review',review_status:'needs_review',version_no:1,status:'draft',code:i.code,config,item_template_id:templateId,variant_key:'fixed_v1'};
 rows.items.push(row);
 const options=(i.options||[]).map((o,n)=>({id:id(i.code+':option:'+o.id),item_id:itemId,option_key:o.id,content_hy:o.text,content_en:o.text,display_order:n+1}));rows.item_options.push(...options);
 const key={item_id:itemId,answer:i.responseType==='single_choice'?i.key.optionId:i.key,tolerance:null,canonical_unit:null,accepted_units:[]};rows.item_answer_keys.push(key);
 rows.item_curriculum_scopes.push({id:id(i.code+':scope'),item_id:itemId,subject_program_id:identities.programme,unit_id:identities.unit,is_primary:true});
 const context={schemaVersion:'haiedu-authoring-review-v1',itemCode:i.code,version:1,locale:i.locale,sourcePacket:packetPath,sourceReference:reference,hint:i.hint||i.reviewHint||null,feedback:i.feedback,optionFeedback:(i.options||[]).map(o=>({key:o.id,text:o.feedback})),fieldFeedback:Object.entries(i.fieldReview||{}).map(([id,v])=>({id,text:v.feedback||'',rejectedExamples:v.reject||[]})),comparison:i.comparison,source:source?{id:source.id,kind:source.kind==='passage'?'reading':'listening',format:source.scriptEvidence?'summary':source.kind==='passage'?'passage':'script',familyId:source.sourceFamilyProposedId,title:source.title,locale:source.locale,text:source.text||(source.script?source.script.map(s=>`${s.speaker}: ${s.spoken}`).join('\n\n'):source.scriptEvidence),sourceReferences:[...source.sourceReferences,source.anchor,source.reviewNote],reviewStatus:'pending',registrationStatus:'unregistered',audioAvailable:Boolean(source.audioAssetVersionId)}:null};
 assert.ok(!context.source||context.source.text?.length>20,i.code+' source');
 // The actual insertion constructs the item/options/key snapshot from saved rows;
 // authoringReview is the only extra private attachment, copied without edits.
 snapshots.push({itemId,itemCode:i.code,context});
}
rows.unit_material_versions=materials.map(m=>({id:m.id,subject_program_id:identities.programme,curriculum_release_id:identities.release,unit_id:identities.unit,material_key:m.materialKey,kind:m.kind,version_no:m.versionNo,sequence_order:m.sequenceOrder,definition:m.definition,review_package:m.reviewPackage,fingerprint:'',status:'draft',created_by:null}));
const counts={items:items.length,practice:items.filter(i=>i.purpose==='practice').length,diagnostic:items.filter(i=>i.purpose==='diagnostic').length,mastery:items.filter(i=>i.purpose==='mastery').length,sourceHeld:snapshots.filter(s=>s.context.source).length,readingHeld:snapshots.filter(s=>s.context.source?.kind==='reading').length,audioHeld:snapshots.filter(s=>s.context.source?.kind==='listening').length,options:rows.item_options.length,skills:skills.length,materials:materials.length};
assert.deepEqual([counts.practice,counts.diagnostic,counts.mastery,counts.sourceHeld,counts.readingHeld,counts.audioHeld],[72,48,72,60,30,30]);
const result={schemaVersion:'haiedu-review-import-v1',checkpoint:'16.1C.29',baselineCommit:p.sourceCommit,identities,sourceFiles:Object.fromEntries(['unit2-authoring.json','unit2-materials.json','candidate-comparison.json'].map(n=>[n,sha(readFileSync(root+'/'+n))])),counts,rows,snapshots};
writeFileSync(root+'/import-manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(counts));
