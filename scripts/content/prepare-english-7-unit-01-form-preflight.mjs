// Read-only English content-extension preflight. This is not an approval,
// semantic re-review, allocator, policy adoption or release operation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {resolve,relative,dirname,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [bindingsPath,exposurePath,privateDirectory,summaryPath]=process.argv.slice(2);
assert.ok(bindingsPath&&exposurePath&&privateDirectory&&summaryPath,
 'Supply bindings JSON, anonymous-exposure JSON, private output directory and sanitized summary path.');
mkdirSync(privateDirectory,{recursive:true});
const destination=realpathSync(privateDirectory),local=relative(realpathSync(root),destination);
assert.ok(local==='..'||local.startsWith('..'+sep)||isAbsolute(local),'Detailed packet must stay outside the public repository.');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const sourceFiles=['docs/content/english-7-unit-01-bank-plan.json',
 'docs/content/english-7-unit-01-assessment-batch-a.json',
 'docs/content/english-7-unit-01-assessment-batch-bcd.json'];
const [plan,...packets]=sourceFiles.map(p=>read(resolve(root,p)));
const bindings=read(bindingsPath),exposure=read(exposurePath);
const {inventory,sources,repository}=bindings;
const items=new Map(inventory.items.map(i=>[i.code,i]));
const skills=new Map(sources.skills.map(s=>[s.code,s]));
const sets=new Map(sources.taskSets.map(s=>[s.id,s]));
const audio=new Map(sources.audioVersions.map(s=>[s.id,s]));
const authored=new Map(packets.flatMap(p=>p.items).map(i=>[i.code,i]));
const authoredSources=new Map(packets.flatMap(p=>p.sourceSets).map(s=>[s.id,s]));
const candidates=packets.flatMap(p=>p.forms).sort((a,b)=>a.code.localeCompare(b.code));
assert.equal(items.size,200);assert.equal(authored.size,140);assert.equal(candidates.length,5);
assert.equal(skills.size,14);assert.equal(sets.size,27);assert.equal(audio.size,14);
assert.equal(inventory.release.id,'e40991ee-ca0b-5666-a9f2-a3453de8fccb');
assert.equal(inventory.release.status,'draft','This preparation is scoped to the inactive review release.');
for(const n of ['blueprints','bindings','forms','learningSessions'])assert.equal(inventory[n],0,n+' already exists; refresh scope.');
assert.equal(sources.poolMemberships,0);assert.equal(sources.sourceExposureRows,0);
const seenItems=new Set(),seenFamilies=new Set(),selectedSets=new Set(),selectedAudio=new Set();
const expectedDemands=plan.skills.flatMap(s=>s.demands.map(d=>d.id)).sort();
assert.equal(expectedDemands.length,28);
const forms=candidates.map(form=>{
 const expected=plan.forms.find(f=>f.code===form.code);assert.ok(expected);assert.equal(expected.purpose,form.purpose);
 assert.equal(form.members.length,28);assert.equal(new Set(form.members).size,28);
 assert.deepEqual([...form.proposedPresentationOrder].sort(),[...form.members].sort());
 const members=form.members.map(code=>{
  assert.ok(!seenItems.has(code),'Repeated candidate '+code);seenItems.add(code);
  const a=authored.get(code),v=items.get(code);assert.ok(a&&v,code);
  assert.equal(a.form,form.code);assert.equal(v.type,a.responseType);assert.equal(v.skillId,skills.get(a.skill)?.id);
  assert.ok(v.versionId&&Number.isInteger(v.version)&&v.version>0&&/^[a-f0-9]{64}$/.test(v.snapshotSha256));
  const setId=v.stimulus?.taskSetVersionId;
  if(a.sourceSet){
   assert.equal(v.stimulus.schemaVersion,'haiedu-task-set-v1');const s=sets.get(setId);assert.ok(s&&!s.revoked);
   assert.equal(s.releaseId,inventory.release.id);assert.equal(s.unitId,'3ef44139-0053-58e6-ab0d-5901a0213683');
   assert.equal(s.sourceFamilyId,authoredSources.get(a.sourceSet)?.sourceFamilyProposedId);
   const attached=s.members.filter(m=>m.itemId===v.id);assert.equal(attached.length,1);
   assert.equal(attached[0].version,v.version);assert.equal(attached[0].skillId,v.skillId);
  }else assert.ok(!setId,'Unexpected source on standalone candidate '+code);
  const componentCount=a.responseType==='typed_fields'?a.definition.fields.length:1;
  return{code,itemId:v.id,version:v.version,versionId:v.versionId,snapshotSha256:v.snapshotSha256,
   skill:a.skill,skillId:v.skillId,demand:a.demandId,responseType:a.responseType,componentCount,
   itemWeightProposal:1,sourceSetId:setId??null,sourceDraftId:a.sourceSet??null,
   sourcePages:a.source.pages,programmeLocators:a.source.programme,
   priorComparison:{disposition:a.comparison.disposition,nearestPractice:a.comparison.nearestPractice??[],
    nearestAssessment:[...new Set([...(a.comparison.nearestExistingAssessment??[]),...(a.comparison.nearestBatch??[])])]},
   reviewerDecision:null};
 });
 assert.deepEqual(members.map(m=>m.demand).sort(),expectedDemands);
 const perSkill=Object.fromEntries(plan.skills.map(s=>[s.skill,members.filter(m=>m.skill===s.skill).length]));
 for(const s of plan.skills)assert.equal(perSkill[s.skill],s.perAssessmentForm);
 const setIds=[...new Set(members.map(m=>m.sourceSetId).filter(Boolean))];assert.equal(setIds.length,4);
 const formSets=setIds.map(id=>{
  const s=sets.get(id);assert.ok(!seenFamilies.has(s.sourceFamilyId),'Source family reused across forms');
  seenFamilies.add(s.sourceFamilyId);selectedSets.add(id);
  const group=members.filter(m=>m.sourceSetId===id);assert.equal(group.length,2);assert.equal(s.members.length,2);
  assert.deepEqual(s.members.map(m=>m.itemId).sort(),group.map(m=>m.itemId).sort());
  const positions=group.map(m=>form.proposedPresentationOrder.indexOf(m.code)).sort((a,b)=>a-b);
  assert.equal(positions[1],positions[0]+1,'Shared-source presentation is split');
  let recording=null;
  if(s.kind==='audio'){
   const a=audio.get(s.audioVersionId);assert.ok(a&&!a.revoked,'Missing or revoked recording');
   assert.equal(a.releaseId,s.releaseId);assert.equal(a.unitId,s.unitId);assert.equal(a.sourceFamilyId,s.sourceFamilyId);
   assert.ok(a.durationMs>0&&a.bytes>0&&/^[a-f0-9]{64}$/.test(a.sha256));
   assert.ok(!selectedAudio.has(a.id),'Recording reused across forms');selectedAudio.add(a.id);
   recording={id:a.id,sha256:a.sha256,durationMs:a.durationMs,byteLength:a.bytes};
  }else assert.equal(s.kind,'text');
  return{id,sourceFamilyId:s.sourceFamilyId,kind:s.kind,stimulusSha256:s.stimulusSha256,
   members:group.map(m=>m.code),sourceReference:s.sourceReference,permissionReference:s.permissionReference,
   recording,independentProtectionDecision:null};
 });
 assert.equal(formSets.filter(s=>s.kind==='text').length,2);assert.equal(formSets.filter(s=>s.kind==='audio').length,2);
 return{code:form.code,purpose:form.purpose,qualified:false,allocated:false,policyBinding:null,
  itemCount:28,componentCount:members.reduce((n,m)=>n+m.componentCount,0),
  responseTypes:Object.fromEntries([...new Set(members.map(m=>m.responseType))].map(t=>[t,members.filter(m=>m.responseType===t).length])),
  perSkill,programmeLocators:[...new Set(members.flatMap(m=>m.programmeLocators))].sort(),
  presentationOrder:form.proposedPresentationOrder,members,sourceSets:formSets,
  twoPlayAudioSeconds:formSets.reduce((n,s)=>n+(s.recording?.durationMs??0),0)*2/1000,
  observedCompletionMinutes:null,difficultyEquivalence:'not_established',reviewer:null,decision:null};
});
assert.equal(seenItems.size,140);assert.equal(seenFamilies.size,20);assert.equal(selectedAudio.size,10);
for(const s of sources.taskSets.filter(s=>!selectedSets.has(s.id)))assert.ok(!seenFamilies.has(s.sourceFamilyId),'Practice shares a protected candidate family');
const publicExposure=repository.visibility==='public'&&repository.private===false&&exposure.length===2&&exposure.every(e=>e.status===200&&e.exactSourceMatch&&e.authenticationSent===false);
assert.ok(publicExposure,'This dated exposure record requires the observed anonymous source proof.');
for(const e of exposure)assert.equal(hash(readFileSync(resolve(root,e.path))),e.sha256,'Exposure source digest changed');
const formalOutcomeMappings=sources.skills.reduce((n,s)=>n+s.outcomeMappings.length,0);
const constraints={contentAcceptance:'Owner acceptance retained; no approval or content-QA re-audit',
 writing:'Accepted separately; S13/S14 share one reviewed note, not automatic mastery credit',speaking:'classroom-assessed',
 itemScoring:'28 equal-weight items proposed; component counts are not the score denominator',
 playback:'Owner-approved two plays per recording; existing v4 capability; no English binding',
 reserves:'Two Diagnostic alternatives and three Mastery candidates leave no extra complete Mastery reserve',
 sourceDependence:'Each reading/listening pair shares one source; different IDs do not establish independent reasoning',
 publicExposure:'All 140 candidate prompts/keys and 20 source texts/scripts anonymously retrievable; third-party retrieval unknown',
 authority:'Owner acceptance and this structural preflight do not confer independent SME/protection review or learner release'};
const gates=['explicit public-source exposure disposition','independent English/source/form qualification',
 'formal curriculum reconciliation and outcome bindings','explicit scoring/readiness/attempt policy',
 'source/voice reuse for intended learner scope','authorized exact-release learner acceptance'];
const packet={schemaVersion:'haiedu-private-form-preflight-v1',checkpoint:'16.1C.19',date:'2026-10-22',
 sourceCommit:repository.sourceCommit,observedAt:inventory.observedAt,sourceObservedAt:sources.observedAt,
 sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(readFileSync(resolve(root,p)))])),
 liveBindingsSha256:hash(readFileSync(bindingsPath)),release:inventory.release,forms,constraints,
 approvalAuditPerformed:false,contentQaRepeated:false,formalOutcomeMappings,independentlyQualifiedForms:0,
 productionWrites:0,allocationEnabled:false,policyActivationEnabled:false,releaseEnabled:false,gates,
 ownerDecision:{status:'awaiting_explicit_disposition',recommended:'Retain the accepted bank for a bounded provisional MVP with disclosed exposure limits; keep future protected content private; retain independent qualification and other release gates.',
 alternatives:['Require protected replacements before assessed use; approve a separate bounded authoring scope first.'],
 authority:'AGENTS.md and haiedu-protected-parallel-pilot-v1 require an explicit exposure/SME disposition before allocation; the English authoring acceptance is not a waiver.'}};
const packetPath=resolve(destination,'English_7_Unit_1_Form_Qualification.json');
writeFileSync(packetPath,JSON.stringify(packet,null,2)+'\n');
const summary={schemaVersion:'haiedu-form-preflight-summary-v1',checkpoint:'16.1C.19',date:'2026-10-22',
 state:'structural_preparation_complete_qualification_held',sourceCommit:repository.sourceCommit,
 ownerReviewReused:true,approvalAuditPerformed:false,contentQaRepeated:false,
 forms:forms.map(f=>({code:f.code,purpose:f.purpose,items:f.itemCount,components:f.componentCount,
  responseTypes:f.responseTypes,languageItems:20,readingItems:4,listeningItems:4,
  readingSources:2,audioSources:2,twoPlayAudioSeconds:f.twoPlayAudioSeconds,qualified:false,allocated:false})),
 counts:{practice:60,diagnostic:56,mastery:84,distinctAssessmentItems:140,sourceFamilies:20,
  registeredReadingSources:10,registeredRecordings:10,formalOutcomeMappings,qualifiedForms:0},
 structuralChecks:{exactCurrentVersionBindings:140,completeDemandCoverage:true,perSkillBlueprint:true,
  noRepeatedItems:true,sourceFamiliesSeparatedAcrossFormsAndPractice:true,sharedSourcesContiguous:true,
  currentSourceMembers:40,recordingVersionBindings:10,sourceIndependenceOrDifficultyEquivalenceClaimed:false},
 exposure:{repositoryPublic:true,anonymousSourceResponses:exposure.map(e=>({status:e.status,sha256:e.sha256,bytes:e.bytes,observedAt:e.observedAt})),
  affectedCandidateItems:140,affectedSourceTextsOrScripts:20,actualThirdPartyRetrieval:'unknown',
  privateStoragePlaybackChanged:false,sourceExposureRows:sources.sourceExposureRows,
  caution:'Zero platform exposures cannot establish non-exposure through public GitHub.'},
 governance:{releaseStatus:inventory.release.status,blueprints:inventory.blueprints,policyBindings:inventory.bindings,
  forms:inventory.forms,poolMemberships:sources.poolMemberships,learningSessions:inventory.learningSessions},
 privatePacket:{fileName:'English_7_Unit_1_Form_Qualification.json',sha256:hash(readFileSync(packetPath)),storedOutsidePublicRepository:true},
 reusedEvidence:['english-7-unit-01-assessment-batch-a-validation-20261021.json',
  'english-7-unit-01-assessment-batch-bcd-validation-20261022.json','english-7-unit-01-bcd-whole-bank-review-20261022.json',
  'english-7-unit-01-bcd-audio-registration-20261022.json','english-7-unit-01-materials-20261022.json',
  'english-7-unit-01-guide-delivery-20261022.json'],productionWrites:0,runtimeChanged:false,gates};
writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({forms:summary.forms,counts:summary.counts,productionWrites:0,qualified:false}));
