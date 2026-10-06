import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
export const id=n=>`71000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(n=>n.endsWith('_sprint_15b12b_policy_session_bindings.sql'));
export const predecessorSQL=()=>{
 const context=readFileSync('supabase/migrations/0108_sprint_14c_student_onboarding_context.sql','utf8');
 const legacy=context.slice(context.indexOf('create or replace function public.stamp_learning_session_academic_context_14c()'),context.indexOf('comment on column public.learning_sessions.academic_context_status'));
 const model=readFileSync('supabase/migrations/0052_sprint_12a_closure_corrections.sql','utf8');
 const fn=model.slice(model.indexOf('create or replace function public.stamp_learning_session_model_configuration()'),model.indexOf('create or replace function public.prevent_learning_session_identity_mutation()'));
 return readFileSync('tests/fixtures/governed-session.sql','utf8')+'\n'+legacy+'\n'+fn+
  '\ncreate trigger learning_sessions_stamp_model_configuration before insert on public.learning_sessions for each row execute function public.stamp_learning_session_model_configuration();';
};
export const legacyGuardsSQL=()=>{
 const diagnostic=readFileSync('supabase/migrations/20260927183816_single_initial_diagnostic.sql','utf8');
 const practice=readFileSync('supabase/migrations/20260927190434_chapter_diagnostic_practice_gate.sql','utf8');
 return diagnostic.slice(0,diagnostic.indexOf('-- Header and all form items'))+'\n'+practice.slice(0,practice.indexOf('-- A locked pre-diagnostic'));
};
export function policy(scope,mode='diagnostic') {
 const p={schemaVersion:'haiedu-assessment-policy-v1',policyKey:`fixture-${scope.unit}-${mode}`,version:1,mode,
  subjectProgramId:id(scope.programme),curriculumReleaseId:id(scope.release),unitId:id(scope.unit),plannedQuestionCount:3,
  learningModelConfigurationId:id(scope.model),academicMasteryPolicyId:id(601),responseTypes:['single_choice','true_false'],
  scoringStrategy:'selected-response-v1',hintsAllowed:!['diagnostic','mastery_check'].includes(mode),baselineRequired:mode!=='diagnostic'};
 if(['diagnostic','mastery_check'].includes(mode))p.questionCountBySkill={[id(scope.skills[0])]:1,[id(scope.skills[1])]:2};
 if(mode==='diagnostic')p.maximumCompletedBaselines=1;
 if(mode==='mastery_check'){p.minimumPercent=80;p.minimumCorrectBySkill={[id(scope.skills[0])]:1};}
 return p;
}
export const scopes=[
 {programme:201,release:501,unit:511,model:611,skills:[521,522],enrollment:371,code:'SYN-A-CH1'},
 {programme:201,release:501,unit:512,model:611,skills:[523,524],enrollment:371,code:'SYN-A-CH2'},
 {programme:202,release:502,unit:513,model:612,skills:[525,526],enrollment:373,code:'SYN-B-CH1'},
];
export const slot=(scopeIndex,mode)=>700+scopeIndex*100+({diagnostic:0,practice:10,mastery_check:20,chapter_review:30}[mode]);
export const itemIds=(scopeIndex,mode='diagnostic')=>[id(slot(scopeIndex,mode)+1),id(slot(scopeIndex,mode)+2),id(slot(scopeIndex,mode)+3)];
export const blueprintId=(scopeIndex,mode='diagnostic')=>id(slot(scopeIndex,mode)+40);
export const formId=scopeIndex=>id(slot(scopeIndex,'diagnostic')+60);
export async function seed(db,curriculumScopes=scopes){
 const exec=(sql,params=[])=>db.query(sql,params);
 for(const [n,role] of [[10,'student'],[11,'student'],[20,'teacher'],[21,'teacher']])await exec('insert into profiles values($1,$2,\'active\')',[id(n),role]);
 for(const n of [10,11]){await exec('insert into auth.users(id) values($1)',[id(n)]);await exec('insert into auth.sessions values($1,$2,null)',[id(n+391),id(n)]);}
 for(const i of [0,1]){
  await exec("insert into subjects values($1,'published')",[id(101+i)]);
  await exec("insert into subject_programs values($1,$2,$3,'published',null,null)",[id(201+i),id(101+i),id(7)]);
  await exec("insert into academic_years values($1,$2,'active','2020-01-01','2099-12-31')",[id(311+i),id(301+i)]);
  await exec('insert into classes values($1,$2,$3,$4,$5,true)',[id(321+i),id(301+i),id(311+i),id(101+i),id(7)]);
  await exec("insert into institutional_memberships values($1,$2,$3,'student','active','2020-01-01',null)",[id(331+i),id(301+i),id(10+i)]);
  await exec("insert into institutional_memberships values($1,$2,$3,'teacher','active','2020-01-01',null)",[id(341+i),id(301+i),id(20+i)]);
  await exec("insert into teacher_assignments values($1,$2,$3,$4,$5,$6,'active','2020-01-01',null)",[id(351+i),id(301+i),id(311+i),id(321+i),id(341+i),id(201+i)]);
  await exec("insert into teacher_subject_authorizations values($1,$2,$3,$4,'active','2020-01-01',null)",[id(361+i),id(301+i),id(341+i),id(101+i)]);
  await exec("insert into institutional_class_enrollments values($1,$2,$3,$4,$5,$6,$7,$8,'active','2020-01-01',null)",[id(371+i),id(10+i),id(301+i),id(311+i),id(321+i),id(331+i),id(351+i),id(201+i)]);
  await exec("insert into curriculum_releases values($1,$2,'pilot',null,null)",[id(501+i),id(201+i)]);
 }
 await exec("insert into institutional_memberships values($1,$2,$3,'student','active','2020-01-01',null)",[id(333),id(302),id(10)]);
 await exec("insert into institutional_class_enrollments values($1,$2,$3,$4,$5,$6,$7,$8,'active','2020-01-01',null)",[id(373),id(10),id(302),id(312),id(322),id(333),id(352),id(202)]);
 await exec("insert into academic_mastery_policy_versions values($1,'active','2020-01-01',3)",[id(601)]);
 await exec('insert into runtime_builds values($1)',[id(621)]);
 for(const m of [611,612])await exec("insert into learning_model_configurations values($1,'approved',$2,$3)",[id(m),id(m===611?501:502),JSON.stringify({assessmentPolicyContracts:curriculumScopes.filter(s=>s.model===m).flatMap(s=>['diagnostic','practice','mastery_check','chapter_review'].map(mode=>policy(s,mode)))})]);
 for(let idx=0;idx<curriculumScopes.length;idx++){
  const s=curriculumScopes[idx];await exec('insert into units values($1,$2)',[id(s.unit),id(s.programme)]);
  await exec('insert into curriculum_release_units values($1,$2,$3)',[id(s.release),id(s.unit),s.code]);
  for(const k of s.skills){await exec('insert into skills values($1)',[id(k)]);await exec('insert into curriculum_release_skills values($1,$2)',[id(s.release),id(k)]);}
  await exec("insert into learning_model_runtime_bindings values($1,$2,$3,$4,'active',$5)",[id(631+idx),id(s.release),s.code,id(s.model),id(621)]);
  for(const mode of ['diagnostic','practice','mastery_check','chapter_review']){
   const n=slot(idx,mode);await exec("insert into assessment_pools values($1,$2,$3,'active')",[id(n),s.code,mode==='chapter_review'?'practice':mode]);
   await exec("insert into assessment_blueprints values($1,$2,$3,$4,$5,'pilot',$6)",[blueprintId(idx,mode),id(s.release),id(s.unit),id(n),mode,JSON.stringify({assessmentPolicy:policy(s,mode)})]);
   for(let j=1;j<=3;j++){
    await exec("insert into items values($1,$2,$3,'published',1)",[id(n+j),id(s.skills[j===1?0:1]),j===2?'true_false':'single_choice']);
    await exec('insert into assessment_pool_items values($1,$2,true)',[id(n),id(n+j)]);
    await exec('insert into assessment_blueprint_items values($1,$2,1)',[blueprintId(idx,mode),id(n+j)]);
    await exec('insert into item_curriculum_scopes(item_id,subject_program_id,unit_id,is_primary) values($1,$2,$3,true)',[id(n+j),id(s.programme),id(s.unit)]);
   }
   if(mode==='diagnostic'){await exec("insert into assessment_forms values($1,$2,'active')",[formId(idx),id(n)]);for(const i of itemIds(idx))await exec('insert into assessment_form_items values($1,$2)',[formId(idx),i]);}
  }
 }
}
export async function database({migrated=true,client=null,curriculumScopes=scopes}={}){const db=client??new PGlite();try{await db.exec(predecessorSQL());await db.exec(legacyGuardsSQL());if(migrated)await db.exec(readFileSync(migrationPath,'utf8'));await seed(db,curriculumScopes);return db;}catch(e){await db.close();throw e;}}
export async function bind(db,idx=0,mode='diagnostic'){return(await db.query('select service_bind_assessment_policy($1) id',[blueprintId(idx,mode)])).rows[0].id;}
export async function start(db,idx=0,mode='diagnostic',overrides={}){const s=scopes[idx],binding=overrides.binding??await bind(db,idx,mode);return(await db.query('select service_start_governed_session_atomic($1,$2,$3,$4,$5,$6,$7) result',[overrides.student??id(10),overrides.auth??id(401),overrides.enrollment??id(s.enrollment),binding,overrides.form===undefined?(mode==='diagnostic'?formId(idx):null):overrides.form,overrides.skill??null,overrides.items??itemIds(idx,mode)])).rows[0].result;}
