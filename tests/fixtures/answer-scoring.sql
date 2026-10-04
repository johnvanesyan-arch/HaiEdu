-- Reduced synthetic schema: in-memory / disposable CI only, never Supabase.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end; $$;
create schema private;
create type mastery_status as enum ('insufficient_evidence','needs_support','developing','secure');
create table units(id uuid primary key,code text unique);
create table items(id uuid primary key,skill_id uuid,item_type text,difficulty integer,status text);
create table item_answer_keys(item_id uuid primary key,answer jsonb,tolerance numeric,canonical_unit text,accepted_units text[],feedback_code text);
create table item_curriculum_scopes(item_id uuid,unit_id uuid,is_primary boolean);
create table learning_model_configurations(id uuid primary key,configuration jsonb);
create table learning_model_runtime_bindings(curriculum_release_id uuid,unit_code text,learning_model_configuration_id uuid,status text);
create table assessment_blueprints(id uuid primary key,unit_id uuid,purpose text);
create table learning_sessions(id uuid primary key,student_id uuid,unit_code text,mode text,status text,planned_item_count integer,answered_count integer default 0,correct_count integer default 0,updated_at timestamptz,completed_at timestamptz,curriculum_release_id uuid,learning_model_configuration_id uuid,assessment_blueprint_id uuid,metadata jsonb default '{}',provenance_status text default 'exact',model_provenance_status text default 'exact');
create table learning_session_items(id uuid primary key,session_id uuid references learning_sessions(id),item_id uuid,skill_id uuid,ordinal integer,attempt_id uuid,correct boolean,answered_at timestamptz,hint_level_used integer default 0);
create table attempts(id uuid default gen_random_uuid() primary key,student_id uuid,item_id uuid,skill_id uuid,response jsonb,normalized_response jsonb,score numeric,correct boolean,error_code text,hint_used boolean,response_time_ms integer,created_at timestamptz,learning_session_id uuid,learning_session_item_id uuid,curriculum_release_id uuid,assessment_blueprint_id uuid);
create table student_skill_mastery_by_release(curriculum_release_id uuid,student_id uuid,skill_id uuid,alpha_evidence numeric,beta_evidence numeric,mastery_score numeric,evidence_count integer,status mastery_status,last_attempt_at timestamptz,updated_at timestamptz,primary key(curriculum_release_id,student_id,skill_id));
create table student_skill_mastery(student_id uuid,skill_id uuid,alpha_evidence numeric,beta_evidence numeric,mastery_score numeric,evidence_count integer,status mastery_status,last_attempt_at timestamptz,updated_at timestamptz,primary key(student_id,skill_id));
create table skill_prerequisites(skill_id uuid,prerequisite_skill_id uuid,required_mastery numeric);
create table fixture_exposures(session_item_id uuid primary key,attempt_id uuid,hint_used boolean);
-- Only curriculum provenance and exposure storage are fixture adapters.
create function fixture_bind_attempt() returns trigger language plpgsql set search_path=public as $$
begin
 if new.learning_session_id is not null then
  select curriculum_release_id,assessment_blueprint_id into new.curriculum_release_id,new.assessment_blueprint_id from learning_sessions where id=new.learning_session_id;
 else
  select b.curriculum_release_id,p.id into new.curriculum_release_id,new.assessment_blueprint_id from item_curriculum_scopes s join units u on u.id=s.unit_id join learning_model_runtime_bindings b on b.unit_code=u.code and b.status='active' join assessment_blueprints p on p.unit_id=u.id and p.purpose='practice' where s.item_id=new.item_id and s.is_primary;
 end if; return new;
end; $$;
create trigger attempts_bind_provenance before insert on attempts for each row execute function fixture_bind_attempt();
create function service_finalize_item_exposure(uuid,uuid,uuid,uuid,uuid,boolean,boolean,integer,timestamptz) returns void language sql as $$
 insert into public.fixture_exposures values($3,$5,$7);
$$;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
alter table attempts enable row level security;
alter table student_skill_mastery enable row level security;
alter table student_skill_mastery_by_release enable row level security;
insert into units values
 ('60000000-0000-4000-8000-000000000001','QA-A-U01'),
 ('60000000-0000-4000-8000-000000000002','QA-B-U01');
insert into learning_model_configurations values
 ('60000000-0000-4000-8000-000000000101','{"mastery":{"priorAlpha":2,"priorBeta":2,"minimumEvidenceCount":3,"needsSupportBelow":0.45,"secureAtOrAbove":0.72,"difficultyWeight":{"formula":"0.8 + 0.1*difficulty","difficultyMin":1,"difficultyMax":5},"hintedPositiveMultiplier":0.65,"incorrectEvidenceHintReduction":false}}'),
 ('60000000-0000-4000-8000-000000000102','{"mastery":{"priorAlpha":3,"priorBeta":1,"minimumEvidenceCount":2,"needsSupportBelow":0.4,"secureAtOrAbove":0.8,"difficultyWeight":{"formula":"0.2 + 0.2*difficulty","difficultyMin":1,"difficultyMax":4},"hintedPositiveMultiplier":0.5,"incorrectEvidenceHintReduction":false}}');
insert into learning_model_runtime_bindings values
 ('60000000-0000-4000-8000-000000000201','QA-A-U01','60000000-0000-4000-8000-000000000101','active'),
 ('60000000-0000-4000-8000-000000000202','QA-B-U01','60000000-0000-4000-8000-000000000102','active');
insert into assessment_blueprints values
 ('60000000-0000-4000-8000-000000000301','60000000-0000-4000-8000-000000000001','practice'),
 ('60000000-0000-4000-8000-000000000302','60000000-0000-4000-8000-000000000002','practice');
insert into learning_sessions(id,student_id,unit_code,mode,status,planned_item_count,curriculum_release_id,learning_model_configuration_id,assessment_blueprint_id) values
 ('60000000-0000-4000-8000-000000000401','10000000-0000-4000-8000-000000000010','QA-A-U01','practice','active',20,'60000000-0000-4000-8000-000000000201','60000000-0000-4000-8000-000000000101','60000000-0000-4000-8000-000000000301'),
 ('60000000-0000-4000-8000-000000000402','10000000-0000-4000-8000-000000000010','QA-B-U01','practice','active',20,'60000000-0000-4000-8000-000000000202','60000000-0000-4000-8000-000000000102','60000000-0000-4000-8000-000000000302'),
 ('60000000-0000-4000-8000-000000000403','10000000-0000-4000-8000-000000000010','QA-A-U01','diagnostic','completed',0,'60000000-0000-4000-8000-000000000201','60000000-0000-4000-8000-000000000101','60000000-0000-4000-8000-000000000301'),
 ('60000000-0000-4000-8000-000000000404','10000000-0000-4000-8000-000000000010','QA-B-U01','diagnostic','completed',0,'60000000-0000-4000-8000-000000000202','60000000-0000-4000-8000-000000000102','60000000-0000-4000-8000-000000000302');
insert into items select ('60000000-0000-4000-8000-'||lpad((500+n)::text,12,'0'))::uuid,'60000000-0000-4000-8000-000000000050'::uuid,'numeric',3,'published' from generate_series(1,20) n;
insert into item_answer_keys select id,'{"value":5}',0.01,null,null,null from items;
insert into item_curriculum_scopes select id,case when right(id::text,3)::integer<=510 then '60000000-0000-4000-8000-000000000001'::uuid else '60000000-0000-4000-8000-000000000002'::uuid end,true from items;
insert into learning_session_items(id,session_id,item_id,skill_id,ordinal) select ('60000000-0000-4000-8000-'||lpad((600+n)::text,12,'0'))::uuid,case when n<=10 then '60000000-0000-4000-8000-000000000401'::uuid else '60000000-0000-4000-8000-000000000402'::uuid end,('60000000-0000-4000-8000-'||lpad((500+n)::text,12,'0'))::uuid,'60000000-0000-4000-8000-000000000050'::uuid,n from generate_series(1,20) n;
