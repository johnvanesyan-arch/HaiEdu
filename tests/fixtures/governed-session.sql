-- Synthetic identities only. Minimal predecessor schema, no remote DB credentials.
create schema private;
create schema auth;
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end$$;
grant usage on schema public to service_role,anon,authenticated;
create table public.profiles(id uuid primary key,role text,account_status text);
create table auth.users(id uuid primary key,deleted_at timestamptz,banned_until timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table public.subjects(id uuid primary key,status text);
create table public.subject_programs(id uuid primary key,subject_id uuid,grade_id uuid,status text,effective_from date,effective_to date);
create table public.units(id uuid primary key,subject_program_id uuid);
create table public.skills(id uuid primary key);
create table public.item_curriculum_scopes(id uuid primary key default gen_random_uuid(),item_id uuid,subject_program_id uuid,unit_id uuid,is_primary boolean);
create table public.curriculum_releases(id uuid primary key,subject_program_id uuid,status text,effective_from date,effective_to date);
create table public.curriculum_release_units(curriculum_release_id uuid,unit_id uuid,unit_code_snapshot text,primary key(curriculum_release_id,unit_id));
create table public.curriculum_release_skills(curriculum_release_id uuid,skill_id uuid,primary key(curriculum_release_id,skill_id));
create table public.institutional_memberships(id uuid primary key,school_id uuid,person_id uuid,role text,status text,valid_from timestamptz,valid_to timestamptz);
create table public.academic_years(id uuid primary key,school_id uuid,status text,starts_on date,ends_on date);
create table public.classes(id uuid primary key,school_id uuid,academic_year_id uuid,subject_id uuid,grade_id uuid,is_active boolean);
create table public.teacher_assignments(id uuid primary key,school_id uuid,academic_year_id uuid,class_id uuid,teacher_membership_id uuid,subject_program_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
create table public.teacher_subject_authorizations(id uuid primary key,school_id uuid,teacher_membership_id uuid,subject_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
create table public.institutional_class_enrollments(id uuid primary key,student_id uuid,school_id uuid,academic_year_id uuid,class_id uuid,student_membership_id uuid,teacher_assignment_id uuid,subject_program_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
create table public.assessment_pools(id uuid primary key,unit_code text,purpose text,status text);
create table public.items(id uuid primary key,skill_id uuid,item_type text,status text,version_no integer);
create table public.assessment_pool_items(pool_id uuid,item_id uuid,enabled boolean,primary key(pool_id,item_id));
create table public.assessment_blueprints(id uuid primary key,curriculum_release_id uuid,unit_id uuid,assessment_pool_id uuid,purpose text,status text,configuration_snapshot jsonb);
create table public.assessment_blueprint_items(assessment_blueprint_id uuid,item_id uuid,item_version_snapshot integer,primary key(assessment_blueprint_id,item_id));
create table public.assessment_forms(id uuid primary key,pool_id uuid,status text);
create table public.assessment_form_items(form_id uuid,item_id uuid,primary key(form_id,item_id));
create table public.learning_model_configurations(id uuid primary key,configuration_kind text,reference_curriculum_release_id uuid,configuration jsonb);
create table public.academic_mastery_policy_versions(id uuid primary key,status text,effective_from timestamptz,target_review_question_count integer);
create table public.runtime_builds(id uuid primary key);
create table public.learning_model_runtime_bindings(id uuid primary key,curriculum_release_id uuid,unit_code text,learning_model_configuration_id uuid,status text,runtime_build_id uuid);
create unique index fixture_active_runtime on public.learning_model_runtime_bindings(curriculum_release_id,unit_code) where status='active';
create table public.learning_sessions(
 id uuid primary key default gen_random_uuid(),student_id uuid,unit_code text,mode text,status text default 'active',
 target_skill_id uuid,planned_item_count integer check(planned_item_count between 1 and 100),
 answered_count integer default 0,correct_count integer default 0,metadata jsonb not null default '{}',
 started_at timestamptz default now(),completed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now(),
 curriculum_release_id uuid,assessment_blueprint_id uuid,provenance_status text,
 learning_model_configuration_id uuid,model_provenance_status text,runtime_build_id uuid,runtime_provenance_status text,
 academic_mastery_policy_id uuid,mastery_attempt_number smallint,institutional_class_enrollment_id uuid,
 school_id uuid,academic_year_id uuid,class_id uuid,teacher_assignment_id uuid,subject_program_id uuid,academic_context_status text
);
create table public.learning_session_items(id uuid primary key default gen_random_uuid(),session_id uuid references public.learning_sessions(id),ordinal integer,item_id uuid,skill_id uuid,selection_reason text,unique(session_id,ordinal));
create table public.attempts(id uuid primary key,learning_session_id uuid,student_id uuid,assessment_blueprint_id uuid);
-- Load the preserved real diagnostic guards and identity triggers in the harness.
