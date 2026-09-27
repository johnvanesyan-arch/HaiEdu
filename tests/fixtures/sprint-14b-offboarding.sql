-- Minimal relational fixture for the actual production migration; synthetic data only.
create role anon; create role authenticated; create role service_role;
create schema private;
create table profiles(id uuid primary key,role text,account_status text default 'active',display_name text,updated_at timestamptz);
create table institutional_memberships(id uuid primary key default gen_random_uuid(),school_id uuid,person_id uuid,role text,status text default 'active',valid_from timestamptz default now()-interval '1 day',valid_to timestamptz,created_by uuid,ended_by uuid,end_reason text);
create table academic_years(id uuid primary key,school_id uuid,status text default 'active',starts_on date default current_date-1,ends_on date default current_date+365);
create table subjects(id uuid primary key,status text default 'published');
create table subject_programs(id uuid primary key,subject_id uuid,grade_id uuid,status text default 'published');
create table classes(id uuid primary key,school_id uuid,academic_year_id uuid,subject_id uuid,grade_id uuid,is_active boolean default true);
create table teacher_assignments(id uuid primary key default gen_random_uuid(),school_id uuid,academic_year_id uuid,class_id uuid,teacher_membership_id uuid,subject_program_id uuid,status text default 'active',valid_from timestamptz default now()-interval '1 day',valid_to timestamptz,ended_by uuid,end_reason text);
create table teacher_subject_authorizations(id uuid primary key default gen_random_uuid(),school_id uuid,teacher_membership_id uuid,status text default 'active',valid_from timestamptz default now()-interval '1 day',valid_to timestamptz,ended_by uuid);
create table institutional_invitations(id uuid primary key default gen_random_uuid(),school_id uuid,academic_year_id uuid,class_id uuid,teacher_assignment_id uuid,subject_program_id uuid,recipient_user_id uuid,invited_role text,token_digest text unique,issued_by uuid,expires_at timestamptz default now()+interval '1 day',used_at timestamptz,revoked_at timestamptz);
create table institutional_join_codes(id uuid primary key default gen_random_uuid(),school_id uuid,academic_year_id uuid,class_id uuid,teacher_assignment_id uuid,subject_program_id uuid,code_digest text unique,issued_by uuid,expires_at timestamptz default now()+interval '1 day',used_by uuid,used_at timestamptz,revoked_at timestamptz);
create table institutional_class_enrollments(id uuid primary key default gen_random_uuid(),school_id uuid,academic_year_id uuid,class_id uuid,student_membership_id uuid,student_id uuid,invitation_id uuid,teacher_assignment_id uuid,subject_program_id uuid,created_by uuid,status text default 'active',valid_from timestamptz default now(),valid_to timestamptz,ended_by uuid,end_reason text);
create table student_account_acceptances(student_id uuid,invitation_id uuid,acceptance_version text,display_name_at_acceptance text);
create table academic_identity_events(id bigint generated always as identity,table_name text,row_id uuid,operation text,old_value jsonb,new_value jsonb,actor_id uuid);
-- Sentinel evidence is intentionally independent of offboarding.
create table test_learning_evidence(id integer primary key,answer text);
insert into test_learning_evidence values(1,'preserved');
create function private.active_school_admin_14b(p_actor uuid,p_school uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.institutional_memberships m join public.profiles p on p.id=m.person_id where m.school_id=p_school and m.person_id=p_actor and m.role='school_admin' and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now()) and p.role='school_admin' and p.account_status='active');
$$;
-- Short deterministic UUIDs: schools 1/2, admins 11/12, teacher 13, students 14/15.
insert into profiles(id,role) values
('00000000-0000-4000-8000-000000000011','school_admin'),('00000000-0000-4000-8000-000000000012','school_admin'),
('00000000-0000-4000-8000-000000000013','teacher'),('00000000-0000-4000-8000-000000000014','student'),('00000000-0000-4000-8000-000000000015','student');
insert into institutional_memberships(id,school_id,person_id,role) values
('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','school_admin'),
('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','school_admin'),
('00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013','teacher'),
('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000013','teacher');
insert into academic_years(id,school_id) values('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001');
insert into subjects(id) values('00000000-0000-4000-8000-000000000032');
insert into subject_programs(id,subject_id,grade_id) values('00000000-0000-4000-8000-000000000033','00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000034');
insert into classes(id,school_id,academic_year_id,subject_id,grade_id) values('00000000-0000-4000-8000-000000000035','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000034');
insert into teacher_assignments(id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id) values('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000035','00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000033');
insert into teacher_subject_authorizations(school_id,teacher_membership_id) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000023');
insert into institutional_invitations(id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,recipient_user_id,invited_role,token_digest,issued_by)
select '00000000-0000-4000-8000-000000000051',school_id,academic_year_id,class_id,id,subject_program_id,'00000000-0000-4000-8000-000000000014','student',repeat('a',64),'00000000-0000-4000-8000-000000000013' from teacher_assignments;
insert into institutional_join_codes(id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,code_digest,issued_by)
select '00000000-0000-4000-8000-000000000061',school_id,academic_year_id,class_id,id,subject_program_id,repeat('b',64),'00000000-0000-4000-8000-000000000013' from teacher_assignments;
