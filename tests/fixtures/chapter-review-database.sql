-- Isolated Postgres fixture: production column contracts needed by Review migrations.
-- No production learner records or credentials are used.
create role anon;
create role authenticated;
create role service_role bypassrls;
create table public.curriculum_releases(id uuid primary key);
create table public.units(id uuid primary key,code text);
create table public.skills(id uuid primary key,code text,name_hy text);
create table public.item_families(id uuid primary key,code text);
create table public.item_templates(id uuid primary key,code text,item_family_id uuid);
create table public.items(id uuid primary key,code text,version_no integer,skill_id uuid,status text,item_template_id uuid,variant_key text);
create table public.assessment_blueprints(id uuid primary key,curriculum_release_id uuid,unit_id uuid,purpose text,status text);
create table public.assessment_blueprint_items(assessment_blueprint_id uuid,item_id uuid,primary key(assessment_blueprint_id,item_id));
create table public.academic_mastery_policy_versions(id uuid primary key,target_review_question_count integer,maximum_mastery_attempts integer);
create table public.chapter_mastery_states(id uuid primary key,student_id uuid,curriculum_release_id uuid,unit_code text,academic_mastery_policy_id uuid,lifecycle_state text,attempts_used smallint,passed_on_attempt smallint,updated_at timestamptz);
create table public.learning_sessions(id uuid primary key default gen_random_uuid(),student_id uuid,curriculum_release_id uuid,assessment_blueprint_id uuid,unit_code text,mode text,planned_item_count integer,metadata jsonb,academic_mastery_policy_id uuid,status text default 'active',answered_count integer default 0,completed_at timestamptz);
create table public.learning_session_items(id uuid primary key default gen_random_uuid(),session_id uuid,ordinal integer,skill_id uuid,item_id uuid,selection_reason text,attempt_id uuid,answered_at timestamptz,correct boolean,hint_level_used integer default 0,unique(session_id,ordinal));
create table public.attempts(id uuid primary key default gen_random_uuid(),student_id uuid,item_id uuid,learning_session_id uuid,learning_session_item_id uuid,created_at timestamptz default now(),correct boolean,hint_used boolean default false,response_time_ms integer);
create table public.chapter_review_requirements(id uuid primary key,chapter_mastery_state_id uuid,status text,required_after_attempt integer,qualifying_review_session_id uuid,satisfied_at timestamptz);
create table public.chapter_review_sessions(id uuid primary key default gen_random_uuid(),learning_session_id uuid,chapter_mastery_state_id uuid,review_requirement_id uuid,academic_mastery_policy_id uuid,review_context text,target_question_count integer,status text default 'active',qualifying boolean default false,completed_at timestamptz);
create unique index chapter_review_sessions_one_active_idx on public.chapter_review_sessions(chapter_mastery_state_id) where status='active';
-- Retired overload exists in production; migration 0069 revokes its service grant.
create function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb)
returns jsonb language sql as 'select null::jsonb';
