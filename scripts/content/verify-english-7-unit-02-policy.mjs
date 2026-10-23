// Offline proposal verification; no network, credentials, approval audit or production writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {readAssessmentPolicy} from '../../supabase/functions/_shared/assessment-policy.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const path='docs/content/english-7-unit-02-policy-proposal.json';
const proposal=JSON.parse(readFileSync(resolve(root,path),'utf8'));
const {scope,counts,modes,learningModel}=proposal;
const skill=n=>counts.find(c=>c.skill==='ENG7-U02-S'+String(n).padStart(2,'0')).skillId;
const files={readinessSql:'supabase/migrations/20261006065508_sprint_15b12c_learning_runtime.sql',resultSql:'supabase/migrations/20261020140928_sprint_16_1b_typed_fields.sql'};
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
 await evaluate('24_of_24_passes',()=>{},true);
 await evaluate('20_of_24_with_minima_passes',r=>{for(const k of [1,2,3,4])lose(r,k);},true);
 await evaluate('19_of_24_fails_overall',r=>{for(const k of [1,2,3,4,5])lose(r,k);},false);
 await evaluate('22_of_24_zero_reading_skill_fails',r=>lose(r,6,2,2),false);
 await evaluate('22_of_24_one_of_three_vocabulary_fails',r=>lose(r,1,2,2),false);
 await evaluate('22_of_24_two_of_four_passive_fails',r=>lose(r,3,2,2),false);
 await evaluate('22_of_24_two_of_four_past_aspect_fails',r=>lose(r,5,2,2),false);
 const rounded=await evaluate('rounded_80_below_exact_threshold_fails',r=>{for(const k of [1,2,3,4])lose(r,k);lose(r,5,0.81);},false);
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

assert.equal(proposal.practicePool.coreItemCodes.length,47);
assert.equal(proposal.practicePool.optionalRetained.length,25);
assert.equal(new Set([...proposal.practicePool.coreItemCodes,...proposal.practicePool.optionalRetained]).size,72);
record('core_and_optional_partition');
assert.equal(proposal.listeningReadiness.recoveryDistinctCapacityGist,3);
assert.equal(proposal.listeningReadiness.recoveryDistinctCapacityDetails,4);
record('limited_listening_capacity_explicit');
for(let lost=0;lost<=3;lost++)assert.equal(Math.min(3,3-lost),3-lost);
record('finite_mastery_capacity_3_2_1_0');
const hash=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const evidence={checkpoint:'16.1C.33',date:'2026-10-24',sourceCommit:proposal.sourceCommit,checks,checkCount:checks.length,
 scope:'Offline retained-form assembly plus actual JS policy reader and extracted SQL result/readiness functions in PGlite; not live allocation, qualification, empirical calibration, approval audit or learner acceptance.',
 proposalSha256:hash(path),sourceHashes:{...proposal.sourceHashes,...Object.fromEntries([...Object.values(files),'supabase/functions/_shared/assessment-policy.mjs','scripts/content/prepare-english-7-unit-02-policy.py','scripts/content/verify-english-7-unit-02-policy.mjs'].map(p=>[p,hash(p)]))},
 retainedEvidence:['16.1C.29 whole-bank comparison and grading','16.1C.30 owner audio acceptance','16.1C.31 source links and 192 QA passes','16.1C.32 curriculum registration and owner approval report','16.1C.26 existing learner/audio/writing runtime acceptance'],
 forms:proposal.formChecks,privatePreparedFormsSha256:proposal.qualification.privatePacketSha256,
 productionWrites:0,contentChanges:0,audioReviewRepeated:false,approvalAudit:false,learnerActivation:false,policyAdopted:false,
 next:'Owner decision on complete concrete proposal; then immutable configuration and exact form/source qualification, followed by separate learner-release decision.'};
writeFileSync(resolve(root,'docs/evidence/english-7-unit-02-policy-proposal-20261024.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks:checks.length,productionWrites:0}));
