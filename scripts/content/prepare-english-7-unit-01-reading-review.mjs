// Reproducible private review packet and disabled registration manifest.
// No network, production writes, human review attribution or release activation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const sha=x=>createHash('sha256').update(x).digest('hex');
const uuid=x=>{const h=sha('haiedu-reading-registration-v1:'+x);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const paths=['docs/content/english-7-unit-01-draft.json','docs/content/english-7-unit-01-practice-additions.json','docs/content/english-7-unit-01-assessment-batch-a.json'];
const packets=paths.map(p=>JSON.parse(readFileSync(p,'utf8')));
const itemMap=new Map(packets.flatMap(p=>p.items.map(i=>[i.code,i])));
const sources=packets.flatMap((p,n)=>p.sourceSets.filter(s=>s.kind==='passage').map(s=>({...s,packet:paths[n]})));
const temp=mkdtempSync(join(tmpdir(),'haiedu-reading-review-'));
let imported;
try{const file=join(temp,'import.json');execFileSync(process.execPath,['scripts/content/prepare-english-7-unit-01-review.mjs',file]);imported=JSON.parse(readFileSync(file,'utf8'));}finally{rmSync(temp,{recursive:true,force:true});}
const rowMap=new Map(imported.rows.items.map(i=>[i.code,i]));
const audits={
 'READ-HISTORY':{origin:'Condensed textbook adaptation',anchor:'English 7, p.16, activity 18',check:'The three periods and the manufacturing/availability relationship agree with the supplied textbook. Questions ask only about the supplied text.',rights:'Textbook adaptation; no publisher permission document is supplied. Record the actual permitted-use basis before registration.',exposure:'Familiar Practice source. R01/R02/R03 share one passage; they are not three independent reading samples.'},
 'READ-STYLE':{origin:'Textbook-based explanation with an original example',anchor:'English 7, pp.17–18, activity 19',check:'Retains the trend/personal-choice distinction and classic/retro/casual meanings. Removes universal and gender-based claims; Ani is an authored example.',rights:'Adapted explanation plus original example; document the reuse basis before registration.',exposure:'Familiar Practice source. G03 and P03/P04 already teach these labels; R06 is intentional reinforcement, not new reasoning coverage.'},
 'READ-DESIGNERS':{origin:'Two original summaries of attributed sources',anchor:'English 7, p.20, activities 21–22; https://fdc.am/designers/4',check:'The textbook supports the Chanel description; the current FDC profile supports the Armenian cultural connection. No photo, quotation or promotional ranking is reused.',rights:'Original attributed summaries; this records provenance, not an external publication licence. Source-review acceptance and reuse-basis confirmation remain pending.',exposure:'Familiar Practice source. The three questions share the same two cards; comparison and detail evidence are dependent.'},
 'ENG7-U01-DA-READ-A':{origin:'Original fictional school-magazine scenario',anchor:'English 7, pp.17–18, activity 19; Unit 1 topic',check:'Both answers follow from the passage. The fixed garment is the waistcoat. Buying new or expensive clothes is explicitly unnecessary.',rights:'Original platform-authored fiction; record acceptance of this exact version as the source-review/reuse record.',exposure:'Protected candidate. Compare with MA-READ-A: both retain one garment. The magazine comparison and costume-change procedure differ, but independent exposure qualification remains pending.'},
 'ENG7-U01-DA-READ-B':{origin:'Original factual summary of an attributed profile',anchor:'English 7, pp.16/20, activities 18/21; https://fdc.am/designers/3',check:'FDC supports the childhood artwork/interest, Florence study, 2011 graduation and 2013 studio chronology. No celebrity knowledge is required.',rights:'Original attributed summary; no website text, photograph or external licence is imported. Confirm the recorded reuse basis at source review.',exposure:'Protected candidate. Chronology procedure repeats taught Practice; the particular childhood influence and sequence require this profile. It is not an independent new skill.'},
 'ENG7-U01-MA-READ-A':{origin:'Original fictional school-play scenario',anchor:'English 7, pp.17–18, activity 19; Unit 1 topic',check:'The stated problem is a quick change between characters. The jacket remains; the second character gains the belt after the collar is removed.',rights:'Original platform-authored fiction; record acceptance of this exact version as the source-review/reuse record.',exposure:'Protected candidate. Its garment-reuse theme resembles DA-READ-A; retain the recorded comparison and require exposure qualification before form use.'},
 'ENG7-U01-MA-READ-B':{origin:'Original factual summary of an attributed profile',anchor:'English 7, pp.16/20, activities 18/21; https://www.fdc.am/designers/34',check:'FDC supports the 2007/2016 order, simple/elegant clothing with noticeable details, and intended self-expression. Brand names avoid the profile’s inconsistent surname spelling.',rights:'Original attributed summary; no photograph, quoted passage or endorsement is imported. Confirm the recorded reuse basis at source review.',exposure:'Protected candidate. Both questions depend on one profile. Shared date-order procedure does not establish independent reasoning or equivalent difficulty.'}
};
const taskSets=sources.map(s=>({
 sourceCode:s.id,sourcePacket:s.packet,textSha256:sha(s.text),wordCount:s.text.trim().split(/\s+/u).length,
 sourceReview:{status:'pending',reviewedBy:null,reviewedAt:null,reviewReference:null,permissionReference:null,...audits[s.id]},
 proposedRow:{id:uuid(s.id+':v1'),curriculum_release_id:imported.identities.release,unit_id:imported.identities.unit,source_family_id:s.sourceFamilyProposedId,locale:s.locale,title:s.title,
  stimulus:{kind:'text',schemaVersion:'haiedu-text-v1',locale:s.locale,content:s.text},
  members:s.members.map(code=>{const i=rowMap.get(code);assert.ok(i);return{itemId:i.id,version:i.version_no+1,skillId:i.skill_id};}),
  source_reference:audits[s.id].anchor,permission_reference:null,review_reference:null,reviewed_by:null,reviewed_at:null}
}));
// Descriptive editorial titles must not answer a learner's main-idea question.
for(const [code,title] of [['READ-HISTORY','Reading source P-A'],['READ-STYLE','Reading source P-B'],['READ-DESIGNERS','Reading source P-C']]) taskSets.find(s=>s.sourceCode===code).proposedRow.title=title;
const revisions=sources.flatMap(s=>s.members.map(code=>{
 const item=itemMap.get(code),row=rowMap.get(code),set=taskSets.find(t=>t.sourceCode===s.id);
 return{code,itemId:row.id,sourceCode:s.id,expectedCurrentVersion:row.version_no,expectedNextVersion:row.version_no+1,expectedCurrentItem:row,originalDraftSha256:sha(JSON.stringify(item)),
 payload:{promptHy:row.prompt_hy,promptEn:row.prompt_en,difficulty:row.difficulty,itemFamily:row.item_family,sourceReference:row.source_reference,
  stimulus:{kind:'task_set',schemaVersion:'haiedu-task-set-v1',taskSetVersionId:set.proposedRow.id},
  options:imported.rows.item_options.filter(o=>o.item_id===row.id).map(o=>({key:o.option_key,contentHy:o.content_hy,contentEn:o.content_en,displayOrder:o.display_order})),
  answerKey:(()=>{const k=imported.rows.item_answer_keys.find(k=>k.item_id===row.id);return{answer:k.answer,tolerance:k.tolerance,canonicalUnit:k.canonical_unit,acceptedUnits:k.accepted_units,feedbackCode:k.feedback_code??null};})(),
  misconceptions:[],...(item.definition?{responseDefinition:item.definition}:{}),changeSummary:`Attach reviewed reading source ${s.id}; preserve question wording, key and source-family identity.`}};
}));
assert.equal(taskSets.length,7);assert.equal(revisions.length,17);assert.equal(new Set(revisions.map(r=>r.itemId)).size,17);
const manifest={schemaVersion:'haiedu-reading-registration-plan-v1',checkpoint:'16.1C.7',baselineCommit:'07cd8edcc8a5291644cccbd1d4e1baeaf11afcda',status:'prepared_for_source_review',productionExecutionAllowed:false,
 requiredBeforeProduction:['Genuine exact-version source review by an active administrator/content reviewer','Documented reuse basis; resolve textbook-adaptation permission where required','Fresh full-bank and current-version readback','Guarded transaction through existing atomic editor; rollback/readback evidence'],
 sourceFiles:imported.sourceFiles,identities:imported.identities,taskSets,revisions,
 preserved:{questionWording:true,answerKeys:true,proposedSourceFamilyIds:true,sourceText:true,questionOrder:true,learnerReleaseInactive:true,humanQuestionApprovalPending:true},
 limits:['No human reviewer identity or approval is inferred from implementation authorization.','No licence, permission, independent SME approval or protected-form qualification is fabricated.','The manifest is not executable SQL and contains deliberately null review/permission fields.','No misconception mappings, audio, pool/form allocations or learner release are created.']};
writeFileSync('docs/content/english-7-unit-01-reading-registration-plan.json',JSON.stringify(manifest,null,2)+'\n');

const lines=['# English 7 Unit 1 — seven reading passages for source review','',
 '**16.1C.7 · 21 October 2026 · Source review pending.** This is the exact existing seven-passage batch and its 17 dependent questions. No wording or answer has changed. Registration and learner release have not occurred.','',
 '[Open the consolidated Notion review page](https://app.notion.com/p/400355a472bf814ea73dcadd00447778).','',
 'Review the passage first, then its questions. Source acceptance confirms the exact text and source grouping; it does not approve the questions, certify independent assessment forms, or release English to learners. Record a correction by passage code if needed.','',
 'The existing source-registration contract requires a real administrator/content-reviewer record and a documented reuse basis. These fields remain empty in the prepared manifest. The supplied textbook alone is not a publisher permission record. The two original fictional passages have no external passage to license; the attributed summaries and textbook adaptations have their provenance and outstanding reuse decision stated below.','',
 '| Passage | Purpose | Questions | Open on HaiEdu |','| --- | --- | ---: | --- |'];
for(const s of sources){const row=rowMap.get(s.members[0]);lines.push(`| ${s.id} — ${s.title} | ${itemMap.get(s.members[0]).purpose} | ${s.members.length} | [First question — Preview](https://www.haiedu.am/content-item.html?id=${row.id}&from=review) |`);}
lines.push('','The same source text is already available in the **Նախադիտում (Preview)** tab of each linked question, under the private reviewer materials. The site currently has a selector for registered sources; it has no separate passage-approval button. The consolidated packet makes this source review explicit.','',
 '## Review findings','',
 'All seven sources support their current keys. The textbook reference PDF matches the previously verified SHA-256; pp.16–18 and 20 were freshly text-checked and visually inspected. Current FDC evidence corroborates the three profile summaries. Direct retrieval of two profiles timed out; indexed primary-source text and the unchanged prior source audit were used for those profiles, with the limitation recorded in the delivery evidence.','',
 'Use neutral learner-facing source labels P-A/P-B/P-C for the three Practice sets. Their descriptive editorial titles stay in this review packet; showing a title such as “Clothing through time” during a main-idea question would supply a clue. The passage wording and keys remain unchanged.','',
 'The live bank still contains 116 unchanged v1 questions and 116 immutable versions, with no question reviews. A fresh exact comparison matches questions, options, keys, families, templates, curriculum scopes and private source notes. Existing whole-bank and grading evidence therefore remains applicable. Source-family separation remains an editorial proposal requiring review, especially the two garment-reuse stories.','',
 '### What happens after source acceptance','',
 '1. Resolve and record the genuine review and reuse references for each accepted passage.','2. Register its immutable text set and intended next question versions.','3. Attach all its questions through the existing atomic editor, preserving v1 history and creating new versions that still need ordinary question approval.','4. Re-run structural QA and verify registered-source preview, membership/order and exposure protection.','5. Save production evidence, merge current documentation and verify the Notion source stamp.','',
 'The 17 reading-source QA holds remain until these steps are completed. The 18 listening holds and the misconception-mapping warnings are separate.','');
for(const s of sources){
 const audit=audits[s.id],set=taskSets.find(t=>t.sourceCode===s.id);
 lines.push(`## ${s.id} — ${s.title}`,'',`**Purpose:** ${itemMap.get(s.members[0]).purpose} · **Words:** ${set.wordCount} · **Source version:** 1`,'',`**Learner label:** ${set.proposedRow.title}`,'',`**Source:** ${audit.anchor}`,'',`**Origin:** ${audit.origin}`,'',`**Verification:** ${audit.check}`,'',`**Reuse record:** ${audit.rights}`,'',`**Exposure:** ${audit.exposure}`,'','### Passage','',s.text,'','### Linked questions and keys','');
 for(const code of s.members){const i=itemMap.get(code),row=rowMap.get(code);lines.push(`#### ${code}`,'',`[Open question](https://www.haiedu.am/content-item.html?id=${row.id}&from=review)`,'',i.prompt,'');
  if(i.options){for(const o of i.options)lines.push(`- **${o.id.toUpperCase()}.** ${o.text}`);lines.push('',`**Correct answer:** ${i.key.optionId.toUpperCase()}.`,'');}
  else if(i.responseType==='ordering'){for(const seg of i.definition.segments)lines.push(`- ${seg.label}`);const labels=new Map(i.definition.segments.map(x=>[x.id,x.label]));lines.push('',`**Correct order:** ${i.key.acceptedSequences[0].map(x=>labels.get(x)).join(' → ')}`,'');}
  else if(i.responseType==='matching'){const labels=new Map(i.definition.targets.map(x=>[x.id,x.label]));for(const x of i.definition.sources)lines.push(`- ${x.label} → **${labels.get(i.key.pairs[x.id])}**`);lines.push('');}
 }
 lines.push('**Source review:** Pending. Record acceptance or requested changes for this passage; question approval follows separately.','');
}
lines.push('## Technical preparation','',
 '[Disabled registration manifest](content/english-7-unit-01-reading-registration-plan.json) · [Delivery evidence](evidence/english-7-unit-01-reading-review-20261021.json) · [Source-registration contract](shared-task-sets-capability.md).','',
 'The prepared payloads cover seven immutable sets and 17 atomic question revisions. Each set retains its declared source-family UUID and member order. All proposed review/permission fields are null; production execution is disabled. Any change during human review requires regenerating the manifest and revisiting the affected comparison before registration.','');
writeFileSync('docs/english-7-unit-01-reading-source-review.md',lines.join('\n'));
console.log(JSON.stringify({sources:taskSets.length,questions:revisions.length,productionExecutionAllowed:false,sourceHashes:Object.fromEntries(taskSets.map(s=>[s.sourceCode,s.textSha256]))}));
