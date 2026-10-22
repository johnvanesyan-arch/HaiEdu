// Offline proposal and arithmetic/readiness check. No network, production SQL,
// content edits, approvals, model binding, form allocation or release activation.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {readAssessmentPolicy} from '../../supabase/functions/_shared/assessment-policy.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const proposalPath=resolve(root,'docs/content/english-7-unit-01-policy-proposal.json');
const evidencePath=resolve(root,'docs/evidence/english-7-unit-01-policy-proposal-20261022.json');
const files={plan:'docs/content/english-7-unit-01-bank-plan.json',
 curriculum:'docs/content/english-7-unit-01-curriculum-registration.json',
 practice:'docs/content/english-7-unit-01-draft.json',
 additions:'docs/content/english-7-unit-01-practice-additions.json',
 assessmentA:'docs/content/english-7-unit-01-assessment-batch-a.json',
 assessmentBCD:'docs/content/english-7-unit-01-assessment-batch-bcd.json',
 preflight:'docs/evidence/english-7-unit-01-form-preflight-20261022.json',
 exposure:'docs/evidence/english-7-unit-01-exposure-decision-20261022.json',
 policyReader:'supabase/functions/_shared/assessment-policy.mjs',
 audioReader:'supabase/functions/_shared/assessed-audio-policy.mjs',
 resultSql:'supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql',
 readinessSql:'supabase/migrations/20261006065508_sprint_15b12c_learning_runtime.sql',
 listeningSql:'supabase/migrations/20261021220954_sprint_16_1c_assessed_listening.sql'};
const plan=read(files.plan),curriculum=read(files.curriculum),preflight=read(files.preflight);
const base=read(files.practice),additions=read(files.additions);
const assessment=[read(files.assessmentA),read(files.assessmentBCD)];
const practice=[...base.items,...additions.items];
const byCode=new Map(curriculum.updatedReleaseSkills.map(s=>[s.skill_code_snapshot,s]));
const skill=id=>byCode.get('ENG7-U01-S'+String(id).padStart(2,'0')).skill_id;
const automatic=Array.from({length:12},(_,i)=>skill(i+1));
const scope={subjectProgramId:curriculum.updatedRelease.subject_program_id,
 curriculumReleaseId:curriculum.updatedRelease.id,unitId:'3ef44139-0053-58e6-ab0d-5901a0213683'};
assert.equal(curriculum.updatedRelease.status,'draft');
assert.equal(byCode.size,14);assert.equal(practice.length,60);
assert.equal(new Set(practice.map(i=>i.code)).size,60);
assert.equal(assessment.flatMap(p=>p.items).length,140);
assert.equal(scope.subjectProgramId,'a88ac34c-3b29-5c9d-a5c4-95339b71c067');
const optionalCodes=['ENG7-U01-P10','ENG7-U01-P11'];
assert.deepEqual(base.activityPath.filter(a=>a.disposition==='optional_extension').flatMap(a=>a.itemCodes??[]).filter(c=>practice.some(i=>i.code===c)).sort(),optionalCodes);
const corePractice=practice.filter(i=>!optionalCodes.includes(i.code));
const questionCountBySkill=Object.fromEntries(plan.skills.map(s=>[byCode.get(s.skill).skill_id,s.perAssessmentForm]));
const counts=plan.skills.map(s=>({skill:s.skill,skillId:byCode.get(s.skill).skill_id,
 practice:practice.filter(i=>i.skill===s.skill).length,corePractice:corePractice.filter(i=>i.skill===s.skill).length,
 perAssessment:s.perAssessmentForm,minimumFullyCorrect:s.perAssessmentForm===3?2:1}));
assert.equal(Object.values(questionCountBySkill).reduce((a,b)=>a+b,0),28);
assert.equal(corePractice.length,58);assert.equal(Math.min(...counts.map(s=>s.corePractice)),3);
const minimumCorrectBySkill=Object.fromEntries(counts.map(s=>[s.skillId,s.minimumFullyCorrect]));
const reportingGroups=[{key:'vocabulary',label:'Բառապաշար',skillIds:[skill(1),skill(2)]},
 {key:'grammar',label:'Քերականություն',skillIds:[3,4,5,6,7,8].map(skill)},
 {key:'reading',label:'Ընթերցանություն',skillIds:[skill(9),skill(10)]},
 {key:'listening',label:'Ունկնդրում',skillIds:[skill(11),skill(12)]}];
const common={version:1,...scope,learningModelConfigurationId:null,academicMasteryPolicyId:null,
 scoringStrategy:'normalized-item-score-v1',itemWeight:1,deliveredSkillIds:automatic,reportingGroups};
const audioPlayback={schemaVersion:'haiedu-assessed-audio-v1',maximumPlays:2,playbackRate:1,
 transcriptAvailable:false,scope:'session-recording',questionVisibility:'whole-recording',interruption:'resume-or-unscored-v1'};
const modes={};
for(const mode of ['diagnostic','practice','mastery_check','chapter_review']){
 const assessed=['diagnostic','mastery_check'].includes(mode);
 const responseTypes=assessed?['single_choice','typed_fields']:['single_choice','typed_fields','matching','ordering'];
 const responseCapabilities={typed_fields:'haiedu-typed-fields-v1',...(!assessed?{matching:'haiedu-matching-v1',ordering:'haiedu-ordering-v1'}:{})};
 modes[mode]={...structuredClone(common),schemaVersion:assessed?'haiedu-assessment-policy-v4':'haiedu-assessment-policy-v3',
 policyKey:'eng7-u01-provisional-'+mode+'-v1',mode,responseTypes,responseCapabilities,
 plannedQuestionCount:assessed?28:mode==='practice'?8:12,hintsAllowed:!assessed,baselineRequired:mode!=='diagnostic',
 ...(assessed?{questionCountBySkill,audioPlayback}:{}),
 ...(mode==='diagnostic'?{maximumCompletedBaselines:1}:{}),
 ...(mode==='mastery_check'?{minimumPercent:80,minimumCorrectBySkill,scoredSkillIds:automatic,readinessSkillIds:automatic}:{})};
}
const learningModel={
 mastery:{priorAlpha:2,priorBeta:2,initialScore:0.5,minimumEvidenceCount:3,needsSupportBelow:0.5,secureAtOrAbove:0.75,
 difficultyWeight:{formula:'1 + 0*difficulty',difficultyMin:1,difficultyMax:5,weightMin:1,weightMax:1},
 hintedPositiveMultiplier:0.65,incorrectEvidenceHintReduction:false},
 recentRecovery:{recentWindow:3,minimumUniqueItems:3,minimumIndependentCorrect:3,hintFreeRequired:true},
 practice:{plannedSessionLength:8,selectionPolicyVersion:'11B-v1',
 selectionPreference:['unseen','spaced_unresolved_error','least_recent_review','explicit_pool_exhaustion_repeat'],
 desiredDifficultyBands:[{difficulty:1,masteryBelow:0.35},{difficulty:2,masteryBelow:0.55},{difficulty:3,masteryBelow:0.75},{difficulty:4,masteryAtOrAbove:0.75}],
 consecutiveWrongAdjustment:{oneWrong:-1,twoOrMoreWrong:-2},exactVariantCooldownRecentDistinctVariants:3},
 hinting:{levels:['orient','strategy','analogous_worked_example'],practiceOnly:true,
 resolverOrder:['error_specific_template','default_template','skill_fallback'],liveAiGeneration:false,
 postErrorHelpAllowed:true,independentConfirmationRequired:true,preAnswerHelpRequiresBlankDraft:true},
 recommendation:{corePolicy:{default:'continue_current_skill',insufficientEvidence:'collect_more_evidence',
 weakWithUnmetPrerequisite:'review_prerequisite',secureWithNextSkill:'advance_skill'}}};
const formChecks=assessment.flatMap(p=>p.forms).sort((a,b)=>a.code.localeCompare(b.code)).map(f=>{
 const items=f.members.map(c=>assessment.flatMap(p=>p.items).find(i=>i.code===c));assert.ok(items.every(Boolean));
 const components=items.map(i=>i.responseType==='typed_fields'?i.definition.fields.length:1);
 assert.ok(components.every(n=>n===1||n===2));assert.equal(items.length,28);
 const prior=preflight.forms.find(p=>p.code===f.code);assert.equal(components.reduce((a,b)=>a+b,0),prior.components);
 for(const row of counts)assert.equal(items.filter(i=>i.skill===row.skill).length,row.perAssessment);
 assert.ok(items.some(i=>i.skill==='ENG7-U01-S02'&&i.responseType==='typed_fields'&&i.definition.fields.length===2));
 // A half-credit S02 response and five whole-item errors in different two-item
 // skills attain 22.5 while preserving every proposed whole-item minimum.
 const minimumReachablePassingPoints=Math.ceil(28*0.8*2)/2;
 return{code:f.code,items:28,components:prior.components,minimumReachablePassingPoints,
 minimumPercent:80,readinessAndPerSkillMinimaStillRequired:true};
});
assert.equal(formChecks.length,5);
const proposal={schemaVersion:'haiedu-english-unit-policy-proposal-v1',checkpoint:'16.1C.21',version:1,date:'2026-10-22',
 sourceCommit:'3c2773c0cbc2c2a5f6efcb849c7571517f063d2c',status:'proposed_awaiting_explicit_owner_policy_approval',
 ownerApproval:null,scope,counts,modes,learningModel,
 readiness:{operator:'OR',scope:'All twelve automatic skills; per release/student/skill',
 modelRoute:'score >= 0.75 and evidenceCount >= 3',
 recoveryRoute:'At least three distinct items encountered in this skill/release; all latest three answers fully correct and hint-free',
 limitations:['The distinct-item count is lifetime within the release, not necessarily distinct items in the recent window.',
 'Shared-source questions are dependent observations; hint-free is not proof of independent competence.',
 'Partial credit contributes to the model route; recovery requires whole-item correctness.',
 'Valid answered evidence retained after an unscored technical exit remains in the skill model.']},
 practicePool:{approvedBank:60,coreEligible:58,optionalRetained:optionalCodes,
 optionalDisposition:'Retain approved versions; exclude from core Practice/Chapter Review allocations until a separate non-gating route is explicitly implemented. Do not delete, remap or silently count extension responses as core evidence.',
 optionalReason:'Existing readiness aggregates by skill. P10/P11 are expressly optional but share S03 with required request/instruction reporting.',
 sessionLimit:8,mayFinishEarly:true,coreItemCodes:corePractice.map(i=>i.code).sort(),
 itemReuse:'Unseen-first then governed repeats after bank exhaustion; no new independent coverage claim'},
 review:{plannedQuestions:12,requiredAfterScoredFailures:[1,2],qualification:'Existing completion-based required review, including required help; no second pass percentage',
 eligiblePool:'The same 58 core Practice items; no unused Diagnostic/Mastery source enters review',optionalAfterPass:true,availableAfterFinalFailure:true},
 lifecycle:{maximumMasteryAttempts:3,reviewRequiredAfterFailedAttempts:[1,2],reviewOptionalAfterPass:true,
 reviewAvailableAfterFinalFailure:true,additionalAttemptAfterFinalFailure:false,
 technicalExit:'Resume first; persistent supported audio failure can end unscored, retain earlier responses/exposures and keep the scored attempt count unchanged',
 technicalReplacement:'Only an unused complete qualified eligible form. No reset, exposed-form reuse, shortening or automatic failure when capacity is exhausted',
 replacementCapacity:{diagnosticForms:2,masteryForms:3,extraMasteryReserveForms:0,
 maximumScoredAttemptsAfterOneMasteryFormLost:2,threeAttemptsGuaranteed:false},
 nonAudioFailures:'Resume saved state; existing assessed-audio cancellation is not a generic automatic invalidation or appeals capability'},
 writing:{automaticReadinessGate:false,automaticPassGate:false,reviewedNotes:1,minimumWords:80,maximumWords:100,
 wordCountConvention:'unicode-whitespace-v1',criteria:4,levels:[0,1,2,3],maximumTotal:12,passThreshold:null,
 result:'Separate criterion feedback and submission/review state; never substitute an automatic result for writing competence',
 scope:'S13 and S14 share one accepted sample; pending review is not zero or failure'},
 reporting:{groups:reportingGroups,denominators:{vocabulary:5,grammar:15,reading:4,listening:4,total:28},
 automaticResultScope:'Vocabulary, grammar, reading and listening for this Unit 1 provisional assessment',
 excludedClaims:['All English outcomes mastered','Speaking assessed','Independent unseen assessment','CEFR certification'],
 passRounding:'Compare unrounded points percentage; rounding is display only',
 timer:null,observedCompletionTimes:null},
 binding:{activationEnabled:false,allocationEnabled:false,productionWrites:0,
 requiredBeforeBinding:['Explicit owner approval of this numerical contract and 58-core/2-optional delivery disposition',
 'Separate immutable English learning model and lifecycle identities; compile exact mode snapshots',
 'Remaining specialist/source-reuse dispositions and exact-version form qualification',
 'Scoped automatic-result labels and exact-release learner acceptance before activation'],
 runtimeCompatibility:'Four policy recipes validate only after synthetic test IDs are bound; null IDs deliberately prevent accidental adoption.'},
 formChecks,
 sourceHashes:Object.fromEntries(Object.values(files).map(p=>[p,hash(readFileSync(resolve(root,p)))]))};

// Use the existing production decision functions in an in-memory SQL engine,
// with invented learner data and no Supabase connection or credentials.
const checks=[];
const record=(name,details={})=>checks.push({name,passed:true,...details});
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const bind=p=>({...structuredClone(p),learningModelConfigurationId:id(1),academicMasteryPolicyId:id(2)});
for(const [mode,p]of Object.entries(modes)){
 assert.throws(()=>readAssessmentPolicy({assessmentPolicy:p},{...scope,mode}));
 const result=readAssessmentPolicy({assessmentPolicy:bind(p)},{...scope,mode});assert.equal(result.mode,mode);
 record('policy_'+mode+'_closed_contract',{unboundRecipeRejected:true});
}
const db=new PGlite();
const extract=(path,name)=>{const sql=readFileSync(resolve(root,path),'utf8');const re=new RegExp('create(?: or replace)? function '+name.replaceAll('.','\\.')+'\\(');const m=re.exec(sql);assert.ok(m,name);const end=sql.indexOf('$$;',m.index);assert.ok(end>m.index);return sql.slice(m.index,end+3);};
try{
 await db.exec('create schema private; create table public.learning_model_configurations(id uuid primary key,configuration jsonb); create table public.student_skill_mastery_by_release(student_id uuid,curriculum_release_id uuid,skill_id uuid,mastery_score numeric,evidence_count integer); create table public.attempts(id uuid,student_id uuid,curriculum_release_id uuid,skill_id uuid,item_id uuid,correct boolean,hint_used boolean,created_at timestamptz);');
 for(const name of ['private.governed_skill_ready','private.validate_governed_learning_model'])await db.exec(extract(files.readinessSql,name));
 await db.exec(extract(files.resultSql,'private.assessment_result_v3'));
 await db.query('insert into public.learning_model_configurations values($1,$2)',[id(1),JSON.stringify(learningModel)]);
 await db.query('select private.validate_governed_learning_model($1)',[id(1)]);record('english_model_shape_supported');
 const policy=bind(modes.mastery_check);
 const allCorrect=()=>counts.map(s=>({skillId:s.skillId,total:s.perAssessment,correct:s.perAssessment,earned:s.perAssessment}));
 const evaluate=async(name,edit,expected)=>{const rows=allCorrect();edit(rows);const result=(await db.query('select private.assessment_result_v3($1,$2) result',[JSON.stringify(policy),JSON.stringify(rows)])).rows[0].result;assert.equal(result.passed,expected,name);record(name,{passedDecision:result.passed,earned:result.score.earned,possible:result.score.possible,displayPercent:result.score.percent});return result;};
 const lose=(rows,k,amount=1,fullyCorrectLoss=1)=>{const r=rows[k-1];r.earned-=amount;r.correct-=fullyCorrectLoss;};
 await evaluate('28_of_28_passes',()=>{},true);
 await evaluate('22_5_of_28_with_every_minimum_passes',r=>{for(const k of [3,4,5,9,10])lose(r,k);lose(r,2,0.5);},true);
 await evaluate('22_of_28_fails_overall',r=>{for(const k of [3,4,5,9,10,11])lose(r,k);},false);
 await evaluate('26_of_28_zero_reading_skill_fails',r=>lose(r,9,2,2),false);
 await evaluate('26_of_28_only_one_of_three_vocabulary_fails',r=>lose(r,1,2,2),false);
 await evaluate('27_of_28_two_half_items_do_not_satisfy_whole_item_minimum',r=>lose(r,2,1,2),false);
 const rounded=await evaluate('rounded_80_does_not_pass_below_exact_cutoff',r=>{for(const k of [3,4,5,9,10])lose(r,k);lose(r,2,0.61);},false);
 assert.equal(rounded.score.percent,80);checks.at(-1).syntheticOffGridBoundary=true;
 const prior=await db.query('select private.assessment_result_v3($1,$2) result',[JSON.stringify(bind(modes.diagnostic)),JSON.stringify(allCorrect())]);assert.ok(!('passed'in prior.rows[0].result));record('diagnostic_has_no_pass_decision');
 const ready=async(name,score,evidence,attempts,expected)=>{
  await db.exec('truncate public.student_skill_mastery_by_release,public.attempts');
  if(score!==null)await db.query('insert into public.student_skill_mastery_by_release values($1,$2,$3,$4,$5)',[id(10),scope.curriculumReleaseId,skill(5),score,evidence]);
  for(let n=0;n<attempts.length;n++){const a=attempts[n];await db.query('insert into public.attempts values($1,$2,$3,$4,$5,$6,$7,$8)',[id(100+n),id(10),a.otherRelease?id(99):scope.curriculumReleaseId,skill(5),id(1000+a.item),a.correct,a.hint??false,new Date(Date.UTC(2026,9,22,0,0,n)).toISOString()]);}
  const result=(await db.query('select private.governed_skill_ready($1,$2,$3,$4) ready',[id(10),scope.curriculumReleaseId,skill(5),id(1)])).rows[0].ready;assert.equal(result,expected,name);record(name,{ready:result});
 };
 const clean=[1,2,3].map(item=>({item,correct:true}));
 await ready('no_evidence_not_ready',null,0,[],false);
 await ready('model_exact_075_and_three_records_ready',0.75,3,[],true);
 await ready('model_two_records_not_ready',0.9,2,[],false);
 await ready('model_below_075_not_ready',0.749,10,[],false);
 await ready('three_item_clean_recovery_ready',0.4,6,clean,true);
 await ready('two_distinct_items_cannot_recover',0.4,6,[clean[0],clean[1],clean[0]],false);
 await ready('hint_in_recent_window_cannot_recover',0.4,6,[clean[0],clean[1],{...clean[2],hint:true}],false);
 await ready('partial_item_is_not_whole_correct_recovery',0.4,6,[clean[0],clean[1],{...clean[2],correct:false}],false);
 await ready('other_release_cannot_supply_third_item',0.4,6,[clean[0],clean[1],{...clean[2],otherRelease:true}],false);
 await ready('prior_distinct_plus_repeated_recent_window_matches_existing_semantics',0.4,6,[{item:2,correct:false},{item:3,correct:false},...clean.map(()=>({item:1,correct:true}))],true);
}finally{await db.close();}
for(const mode of ['diagnostic','mastery_check'])assert.equal(modes[mode].audioPlayback.maximumPlays,2);
assert.ok(!automatic.includes(skill(13))&&!automatic.includes(skill(14)));
record('writing_and_speaking_not_automatic_credit');
record('all_five_form_component_shapes_match_reused_preflight',{forms:5});
record('approved_bank_preserved_with_explicit_optional_scope',{approved:60,proposedCore:58,optional:2});
const capacity=[{technicalFormsLost:0,maxScoredMasteryAttempts:3},{technicalFormsLost:1,maxScoredMasteryAttempts:2},
 {technicalFormsLost:2,maxScoredMasteryAttempts:1},{technicalFormsLost:3,maxScoredMasteryAttempts:0}];
for(const c of capacity)assert.equal(c.maxScoredMasteryAttempts,Math.min(3,3-c.technicalFormsLost));
record('finite_mastery_capacity_arithmetic',{runtimeReplacementEvidenceReused:'16.1C.12',scenarios:capacity});
const text=JSON.stringify(proposal,null,2)+'\n';writeFileSync(proposalPath,text);
writeFileSync(evidencePath,JSON.stringify({schemaVersion:'haiedu-policy-proposal-evidence-v1',checkpoint:'16.1C.21',date:'2026-10-22',
 sourceCommit:proposal.sourceCommit,status:proposal.status,proposalSha256:hash(text),
 generatorSha256:hash(readFileSync(fileURLToPath(import.meta.url))),sourceHashes:proposal.sourceHashes,
 checks,checkCount:checks.length,engine:'PGlite 0.5.8 in-memory; existing SQL function bodies and JS policy reader',
 scope:'Synthetic policy-shape, point arithmetic and readiness boundaries; not full allocator, browser, grading-key, SME or learner acceptance',
 productionWrites:0,contentChanges:0,contentApprovalAudit:false,contentQaRerun:false,
 preservedBank:{practice:60,diagnostic:56,mastery:84},proposedCorePractice:58,optionalRetained:optionalCodes,
 ownerDecisionRequired:'AGENTS.md preserves explicit learning-criteria/release gates. The next-step instruction authorizes preparation, not unreviewed numerical adoption.',
 runtimeAndDeploymentEvidenceReused:{checkpoint:'16.1C.20',sourceCommit:proposal.sourceCommit,ciRun:39830453037,tests:1385,nativeChromium:93},
 mergedSourceCiAndNotion:'Recorded against the final source commit in Notion after delivery checks; no policy or release activation.'},null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,passed:true,forms:5,corePractice:58,optionalRetained:2,proposal:proposalPath,evidence:evidencePath,productionWrites:0}));
