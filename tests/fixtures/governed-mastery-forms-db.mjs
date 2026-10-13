import {readFileSync} from 'node:fs';
import {database as runtimeDatabase,id,scopes,blueprintId,launch,finish,operation} from './governed-runtime-db.mjs';
export {id,scopes,blueprintId,launch,finish,operation};
export const migrationPath='supabase/migrations/20261013101825_governed_mastery_form_selection.sql';
export const schemaSQL="alter table public.assessment_pools add column is_protected boolean not null default false; update public.assessment_pools set is_protected=true where purpose='mastery_check'; alter table public.assessment_forms add column form_version integer not null default 1; alter table public.curriculum_releases add column release_number integer not null default 1;";
export const formIds=[1960,1961,1962].map(id);
export const formItems=[[721,722,723],[971,972,973],[981,982,983]].map(xs=>xs.map(id));
export const reserves=[991,992,993].map(id);
export const selection={schemaVersion:'haiedu-mastery-form-selection-v1',formIds,selectionStrategy:'ordered-unseen-whole-form-v1'};
export async function seedForms(db){
 for(const numbers of [[971,972,973],[981,982,983],[991,992,993]])for(let j=0;j<3;j++){
  const item=id(numbers[j]),original=id(721+j);
  await db.query(`insert into items(id,skill_id,item_type,status,version_no,code,item_template_id,variant_key,prompt_hy)
    select $1,skill_id,item_type,status,version_no,$2,item_template_id,$2,prompt_hy from items where id=$3`,[item,'SYN-FORM-'+numbers[j],original]);
  await db.query('insert into assessment_pool_items values($1,$2,true)',[id(720),item]);
  await db.query('insert into assessment_blueprint_items values($1,$2,1)',[blueprintId(0,'mastery_check'),item]);
  await db.query('insert into item_curriculum_scopes(item_id,subject_program_id,unit_id,is_primary) values($1,$2,$3,true)',[item,id(201),id(511)]);
  await db.query('insert into item_answer_keys(item_id,answer) select $1,answer from item_answer_keys where item_id=$2',[item,original]);
  await db.query('insert into item_options select $1,option_key,content_hy,display_order from item_options where item_id=$2',[item,original]);
 }
 for(let f=0;f<formIds.length;f++){
  await db.query("insert into assessment_forms(id,pool_id,status) values($1,$2,'active')",[formIds[f],id(720)]);
  for(const item of formItems[f])await db.query('insert into assessment_form_items values($1,$2)',[formIds[f],item]);
 }
 await db.query("update assessment_blueprints set configuration_snapshot=configuration_snapshot||jsonb_build_object('masteryFormSelection',$2::jsonb) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(selection)]);
}
export async function database(){const db=await runtimeDatabase();try{
 await db.exec(schemaSQL);await db.exec(readFileSync(migrationPath,'utf8'));await seedForms(db);return db;
}catch(e){await db.close();throw e;}}
export async function ready(db){for(const skill of scopes[0].skills)await db.query("insert into student_skill_mastery_by_release values($1,$2,$3,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set alpha_evidence=9,beta_evidence=1,mastery_score=.9,evidence_count=10",[id(501),id(10),id(skill)]);}
export async function baseline(db){const r=await launch(db);await finish(db,r.session.id);await ready(db);}
export async function bind(db){return(await db.query('select service_bind_assessment_policy($1) id',[blueprintId(0,'mastery_check')])).rows[0].id;}
export async function exposure(db,item,release=id(502),purpose='practice'){
 // Historical cross-context exposure: the provenance trigger resolves the actual other-release session.
 const session=(await db.query("select id from learning_sessions where student_id=$1 and curriculum_release_id=$2 order by id limit 1",[id(10),release])).rows[0];
 if(!session){const d=await launch(db,2);await finish(db,d.session.id);}
 return db.query('insert into student_item_exposure_events(student_id,item_id,purpose,session_id) select $1,$2,$3,id from learning_sessions where student_id=$1 and curriculum_release_id=$4 order by id limit 1',[id(10),item,purpose,release]);
}
