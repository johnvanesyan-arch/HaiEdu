import {readFileSync,readdirSync} from 'node:fs';
import {database as foundationDatabase,id,scopes,blueprintId} from './governed-session-db.mjs';
export {id,scopes,blueprintId};
export const migrationPath='supabase/migrations/'+readdirSync('supabase/migrations').find(n=>n.endsWith('_sprint_15b12c_learning_runtime.sql'));
const source=name=>readFileSync('supabase/migrations/'+name,'utf8');
const table=(file,name)=>{const s=source(file),m=new RegExp('create table (?:if not exists )?public\\.'+name+' \\(').exec(s);if(!m)throw Error(name);return s.slice(m.index,s.indexOf('\n);',m.index)+3);};
const fn=(file,name)=>{const s=source(file),m=new RegExp('create or replace function '+name.replaceAll('.','\\.')+'\\(').exec(s);if(!m)throw Error(name);return s.slice(m.index,s.indexOf('$$;',m.index)+3);};
export function extensionSQL(){return `
create type public.mastery_status as enum ('insufficient_evidence','needs_support','developing','secure');
create type public.item_type as enum ('single_choice','true_false','numeric','quantity');
alter table public.items alter column item_type type public.item_type using item_type::public.item_type;
alter table units add column code text;
alter table curriculum_release_units add unique(curriculum_release_id,unit_code_snapshot);
alter table curriculum_release_skills add column sequence_order_snapshot integer;
alter table skills add column code text,add column name_hy text,add column layer text;
alter table items add column code text,add column difficulty integer default 3,add column prompt_hy text,add column stimulus jsonb,add column item_template_id uuid,add column variant_key text,add column variant_parameters jsonb default '{}';
alter table learning_sessions add column assessment_result text,add column score_percent numeric;
alter table learning_session_items add column attempt_id uuid,add column correct boolean,add column answered_at timestamptz,add column hint_level_used integer default 0;
alter table attempts alter column id set default gen_random_uuid(),add column item_id uuid,add column skill_id uuid,add column response jsonb,add column normalized_response jsonb,add column score numeric,add column correct boolean,add column error_code text,add column hint_used boolean default false,add column response_time_ms integer,add column created_at timestamptz default now(),add column learning_session_item_id uuid,add column curriculum_release_id uuid,add column provenance_status text;
alter table academic_mastery_policy_versions add column maximum_mastery_attempts integer default 3,add column review_required_after_failed_attempts smallint[] default array[1,2]::smallint[],add column review_optional_after_pass boolean default true,add column review_available_after_final_failure boolean default true,add column additional_attempt_after_final_failure boolean default false;
create table public.student_skill_mastery_by_release(curriculum_release_id uuid,student_id uuid,skill_id uuid,alpha_evidence numeric,beta_evidence numeric,mastery_score numeric,evidence_count integer,status mastery_status,last_attempt_at timestamptz,updated_at timestamptz,primary key(curriculum_release_id,student_id,skill_id));
create table public.student_skill_mastery(student_id uuid,skill_id uuid,alpha_evidence numeric,beta_evidence numeric,mastery_score numeric,evidence_count integer,status mastery_status,last_attempt_at timestamptz,updated_at timestamptz,primary key(student_id,skill_id));
create table public.item_families(id uuid primary key,code text);
create table public.item_templates(id uuid primary key,code text,item_family_id uuid);
create table public.item_options(item_id uuid,option_key text,content_hy text,display_order integer,primary key(item_id,option_key));
create table public.item_answer_keys(item_id uuid primary key,answer jsonb,tolerance numeric,canonical_unit text,accepted_units text[],feedback_code text);
create table public.skill_prerequisites(skill_id uuid,prerequisite_skill_id uuid,required_mastery numeric);
create table public.student_item_exposure_events(id uuid primary key default gen_random_uuid(),student_id uuid,item_id uuid,item_family_id uuid,item_template_id uuid,item_code text,family_code text,template_code text,variant_key text,purpose text,session_id uuid,session_item_id uuid unique,served_at timestamptz,answered_at timestamptz,attempt_id uuid,correct boolean,help_used boolean default false,hint_level_used integer default 0,response_time_ms integer,metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now(),curriculum_release_id uuid,assessment_blueprint_id uuid,provenance_status text);
create table public.recommendation_events(id uuid primary key default gen_random_uuid(),recommendation_instance_id uuid,student_id uuid,event_type text,policy_scope text,surface text,action text,target_skill_id uuid,curriculum_release_id uuid,assessment_blueprint_id uuid,learning_model_configuration_id uuid,model_provenance_status text,learning_session_id uuid,attempt_id uuid,state_snapshot jsonb,recommendation_snapshot jsonb);
create table public.item_template_remediation_guides(id uuid primary key,item_template_id uuid,status text,trigger_error_code text,guide_version integer,title_hy text,strategy_hy text,hint_1_hy text,hint_2_hy text,worked_example_hy text,allowed_parameter_keys jsonb);
create table public.skill_remediation_guides(id uuid primary key,skill_id uuid,status text,guide_version integer,misconception_code text,title_hy text,strategy_hy text,hint_1_hy text,hint_2_hy text,worked_example_hy text);
create table public.remediation_events(id uuid primary key default gen_random_uuid(),student_id uuid,session_id uuid,session_item_id uuid,skill_id uuid,item_id uuid,stage text,context text,hint_level integer,guide_scope text,guide_source_id uuid,guide_version integer,item_template_id uuid,error_code text,rendered_title_hy text,rendered_strategy_hy text,rendered_content_hy text,metadata jsonb);
alter table recommendation_events add unique(recommendation_instance_id,event_type,surface);
alter table item_template_remediation_guides add column metadata jsonb default '{}';
`+
 ['chapter_mastery_states','mastery_check_attempts'].map(t=>table('0061_sprint_12_5_mastery_lifecycle_foundation.sql',t)).join('\n')+
 ['chapter_review_requirements','chapter_review_sessions'].map(t=>table('0064_sprint_12_5_chapter_review_gate.sql',t)).join('\n')+
 ['chapter_review_cycles','chapter_review_item_exposures'].map(t=>table('0069_sprint_12_5_review_cycles.sql',t)).join('\n')+
 `alter table chapter_review_sessions add column review_cycle_id uuid references chapter_review_cycles(id),add column review_cycle_number integer,add column review_session_number integer,add column preceding_mastery_attempt_number smallint,add column eligible_pool_size integer;\n`+
 ['private.bind_learning_session_provenance','private.bind_attempt_provenance','private.bind_exposure_provenance'].map(f=>fn('0039_sprint_11k_curriculum_releases_and_evidence_provenance.sql',f)).join('\n')+
 `create trigger learning_sessions_bind_provenance before insert or update on learning_sessions for each row execute function private.bind_learning_session_provenance();
create trigger attempts_bind_provenance before insert or update on attempts for each row execute function private.bind_attempt_provenance();
create trigger exposure_events_bind_provenance before insert or update on student_item_exposure_events for each row execute function private.bind_exposure_provenance();`+
 fn('0076_sprint_12_5_chapter_review_exposure_integration.sql','public.service_record_item_exposure')+
 fn('0013_sprint_11a_item_identity_exposure_pools.sql','public.service_finalize_item_exposure')+
 source('20261004094811_atomic_answer_mastery_evidence.sql')+
 fn('0064_sprint_12_5_chapter_review_gate.sql','public.finalize_mastery_check_atomic')+
 fn('0064_sprint_12_5_chapter_review_gate.sql','public.finalize_chapter_review_atomic')+
 fn('0064_sprint_12_5_chapter_review_gate.sql','public.record_remediation_help_atomic')+
 source('0074_sprint_12_5_integrity_coverage_and_closure.sql').slice(0,source('0074_sprint_12_5_integrity_coverage_and_closure.sql').indexOf('create view'))+
 fn('0069_sprint_12_5_review_cycles.sql','public.complete_chapter_review_cycle_when_covered')+
 `create trigger chapter_review_cycle_completion_trigger after update of status on chapter_review_sessions for each row execute function public.complete_chapter_review_cycle_when_covered();`+
 fn('0108_sprint_14c_student_onboarding_context.sql','public.prevent_learning_session_identity_mutation')+
 `drop trigger if exists learning_sessions_identity_immutable on learning_sessions;create trigger learning_sessions_identity_immutable before update on learning_sessions for each row execute function public.prevent_learning_session_identity_mutation();`+
 source('0049_sprint_12a_remediation_guide_provenance.sql').slice(0,source('0049_sprint_12a_remediation_guide_provenance.sql').indexOf('-- Backfill'))+
 `alter table remediation_events add column guide_snapshot_id uuid references remediation_guide_versions(id);`+
 fn('0049_sprint_12a_remediation_guide_provenance.sql','public.resolve_remediation_event_guide_snapshot')+
 `create trigger remediation_events_resolve_guide_snapshot before insert on remediation_events for each row execute function public.resolve_remediation_event_guide_snapshot();`+
 fn('0013_sprint_11a_item_identity_exposure_pools.sql','public.service_record_item_help')+
 fn('0013_sprint_11a_item_identity_exposure_pools.sql','private.sync_remediation_event_exposure')+
 `create trigger trg_remediation_event_exposure after insert on remediation_events for each row execute function private.sync_remediation_event_exposure();`+
 source('0081_global_mcq_option_presentation_integrity.sql').slice(0,source('0081_global_mcq_option_presentation_integrity.sql').indexOf('-- Learning-model'));
}
export async function seedRuntime(db){
 const model=JSON.parse(readFileSync('tests/fixtures/governed-runtime-model.json','utf8'));
 for(const m of [611,612])await db.query('update learning_model_configurations set configuration=configuration||$2 where id=$1',[id(m),JSON.stringify(model)]);
 for(const s of scopes){await db.query('update units set code=$2 where id=$1',[id(s.unit),s.code]);for(const k of s.skills)await db.query("update skills set code=$2,name_hy=$2,layer='core' where id=$1",[id(k),'SYN-'+k]);}
 await db.exec("update curriculum_release_skills set sequence_order_snapshot=right(skill_id::text,3)::integer");
 await db.query("insert into item_families values($1,'SYN-F')",[id(901)]);await db.query("insert into item_templates values($1,'SYN-T',$2)",[id(902),id(901)]);
 await db.query("update items set code='SYN-'||id::text,item_template_id=$1,variant_key=id::text,prompt_hy='Synthetic selected response'",[id(902)]);
 await db.exec("insert into item_answer_keys(item_id,answer) select id,case when item_type='true_false' then '{\"value\":true}'::jsonb else '{\"value\":\"A\"}'::jsonb end from items;insert into item_options select id,'A','Correct',1 from items where item_type='single_choice';insert into item_options select id,'B','Wrong',2 from items where item_type='single_choice';");
 await db.exec("update private.assessment_presentation_configuration set enabled=true where config_key='mcq_option_order'");
}
export async function database(){const db=await foundationDatabase();try{
 await db.exec(extensionSQL());
 await seedRuntime(db);
 await db.exec(readFileSync(migrationPath,'utf8'));
 return db;
 }catch(e){await db.close();throw e;}}
async function isolatedCall(db,sql,params){if(!db.fixtureTransaction)return db.query(sql,params);await db.exec('savepoint fixture_rpc');try{return await db.query(sql,params);}catch(e){await db.exec('rollback to fixture_rpc');throw e;}finally{await db.exec('release savepoint fixture_rpc');}}
export async function launch(db,idx=0,mode='diagnostic',extra={}){return(await isolatedCall(db,'select service_launch_governed_learning($1,$2,$3,$4,$5,$6,$7) result',[id(10),extra.auth??id(401),extra.enrollment??id(scopes[idx].enrollment),blueprintId(idx,mode),extra.skill??null,extra.recommendation??null,extra.readOnly??false])).rows[0].result;}
export async function operation(db,session,action,payload={},extra={}){return(await isolatedCall(db,'select service_governed_learning_operation($1,$2,$3,$4,$5) result',[extra.student??id(10),extra.auth??id(401),session,action,JSON.stringify(payload)])).rows[0].result;}
export async function finish(db,session,correct=true){let result;for(let n=0;n<100;n++){const item=await operation(db,session,'serve');if(item.complete)return result;const key=await db.query('select item_type from items where id=$1',[item.item.id]);const order=await db.query('select canonical_option_order from private.learning_session_item_option_orders where session_item_id=$1',[item.sessionItemId]);const value=key.rows[0].item_type==='true_false'?correct:String.fromCharCode(65+order.rows[0].canonical_option_order.indexOf(correct?'A':'B'));result=await operation(db,session,'answer',{sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value}});}throw Error('Unbounded fixture flow');}
