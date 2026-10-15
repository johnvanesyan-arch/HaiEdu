import {postgresClient} from './learning-acceptance.mjs';
import {readFileSync} from 'node:fs';
import {database as dashboardDatabase,dashboard} from './learning-dashboard-db.mjs';
import {schemaSQL,seedForms} from './governed-mastery-forms-db.mjs';
import {id,scopes,blueprintId,launch,finish,operation} from './governed-runtime-db.mjs';
export {id,scopes,blueprintId,launch,finish,operation,dashboard};
export const migrationPath='supabase/migrations/20261015160934_sprint_15c15_assessment_policy_v2.sql';
export async function database(options={}) {
 const db=await dashboardDatabase({...options,...(process.env.PHASE3_POSTGRES_17_CI==='1'?{client:await postgresClient()}:{})});
 try { await installV2(db);return db; }catch(e){await db.close();throw e;}
}
export async function installV2(db) {
 await db.exec(schemaSQL.replace(' alter table public.curriculum_releases add column release_number integer not null default 1;',''));
 await db.exec(readFileSync('supabase/migrations/20261013101825_governed_mastery_form_selection.sql','utf8'));
 await seedForms(db);await db.exec(readFileSync(migrationPath,'utf8'));
}
export async function configure(db,idx=0,mode='mastery_check') {
 const bp=blueprintId(idx,mode);
 const policy=(await db.query("select configuration_snapshot->'assessmentPolicy' p from assessment_blueprints where id=$1",[bp])).rows[0].p;
 const [a,b]=scopes[idx].skills.map(id);
 Object.assign(policy,{schemaVersion:'haiedu-assessment-policy-v2',deliveredSkillIds:[a,b],reportingGroups:[{key:'core',label:'Core evidence',skillIds:[a]},{key:'extension',label:'Extension evidence',skillIds:[b]}]});
 if(mode==='mastery_check')Object.assign(policy,{scoredSkillIds:[a],readinessSkillIds:[a]});
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[bp,JSON.stringify(policy)]);
 await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[id(scopes[idx].model),JSON.stringify(policy)]);
 return policy;
}

// Answer-free synthetic bank with the approved distribution. No production questions.
export async function chapterShape(db) {
 const skills=[521,522,1001,1002,1003,1004,1005,1006].map(id),counts=[2,1,3,3,1,2,3,1];
 for(let n=2;n<skills.length;n++) {
  await db.query('insert into skills(id,code) values($1,$2)',[skills[n],`SYN-${n+1}`]);
  await db.query('insert into curriculum_release_skills(curriculum_release_id,skill_id,skill_code_snapshot,name_hy_snapshot,sequence_order_snapshot,layer_snapshot) values($1,$2,$3,$3,$4,1)',[id(501),skills[n],`SYN-${n+1}`,n+1]);
 }
 await db.query('delete from assessment_form_items where form_id=any($1)',[[1960,1961,1962].map(id)]);
 await db.query('delete from assessment_blueprint_items where assessment_blueprint_id=$1',[blueprintId(0,'mastery_check')]);
 for(let f=0;f<3;f++)for(let k=0;k<skills.length;k++)for(let n=0;n<counts[k];n++) {
  const item=id(2000+f*100+k*10+n),code=`SYN-V2-${f}-${k}-${n}`;
  await db.query("insert into items(id,skill_id,item_type,status,version_no,code,item_template_id,variant_key,prompt_hy) select $1,$2,'single_choice','published',1,$3,item_template_id,$3,'Synthetic item' from items where id=$4",[item,skills[k],code,id(721)]);
  await db.query('insert into assessment_pool_items values($1,$2,true)',[id(720),item]);
  await db.query('insert into assessment_blueprint_items values($1,$2,1)',[blueprintId(0,'mastery_check'),item]);
  await db.query('insert into item_curriculum_scopes(item_id,subject_program_id,unit_id,is_primary) values($1,$2,$3,true)',[item,id(201),id(511)]);
  await db.query('insert into item_answer_keys(item_id,answer) select $1,answer from item_answer_keys where item_id=$2',[item,id(721)]);
  await db.query('insert into item_options select $1,option_key,content_hy,display_order from item_options where item_id=$2',[item,id(721)]);
  await db.query('insert into assessment_form_items values($1,$2)',[id(1960+f),item]);
 }
 const policy=await configure(db);
 Object.assign(policy,{plannedQuestionCount:16,deliveredSkillIds:skills,questionCountBySkill:Object.fromEntries(skills.map((s,n)=>[s,counts[n]])),scoredSkillIds:[0,2,3,5].map(n=>skills[n]),readinessSkillIds:[0,2,3,5].map(n=>skills[n]),minimumCorrectBySkill:Object.fromEntries([0,2,3,5].map(n=>[skills[n],1])),reportingGroups:[{key:'mandatory',label:'Պարտադիր վերջնարդյունքներ',skillIds:[0,2,3,5].map(n=>skills[n])},{key:'supporting',label:'Օժանդակ հմտություններ',skillIds:[1,4].map(n=>skills[n])},{key:'additional',label:'Լրացուցիչ վերջնարդյունքներ',skillIds:[6,7].map(n=>skills[n])}]});
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(policy)]);
 await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1",[id(611),JSON.stringify(policy)]);
 return {skills,policy};
}
export async function makeReady(db,skills,idx=0) {
 for(const skill of skills)await db.query("insert into student_skill_mastery_by_release values($1,$2,$3,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set mastery_score=.9,evidence_count=10",[id(scopes[idx].release),id(10),skill]);
}
export async function finishBySkill(db,session,quotas) {
 let result;
 for(let n=0;n<100;n++) {
  const served=await operation(db,session,'serve');if(served.complete)return result;
  const li=(await db.query('select skill_id,item_id from learning_session_items where id=$1',[served.sessionItemId])).rows[0];
  const correct=(quotas[li.skill_id] ?? 0)>0;if(correct)quotas[li.skill_id]--;
  const key=(await db.query('select answer from item_answer_keys where item_id=$1',[li.item_id])).rows[0].answer.value;
  let value;
  if(served.item.type==='true_false')value=correct?String(key):String(key!=='true'&&key!==true);
  else { const order=(await db.query('select canonical_option_order from private.learning_session_item_option_orders where session_item_id=$1',[served.sessionItemId])).rows[0].canonical_option_order;
   const index=order.findIndex(x=>String(x).toLowerCase()===String(key).toLowerCase());value=String.fromCharCode(65+(correct?index:(index+1)%order.length)); }
  result=await operation(db,session,'answer',{sessionItemId:served.sessionItemId,itemId:li.item_id,response:{value},responseTimeMs:100});
 }
 throw new Error('bounded completion exceeded');
}
