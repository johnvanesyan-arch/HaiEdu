-- Reduced synthetic schema. Local/CI only; NEVER apply to a hosted backend.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create schema private;
create table profiles(id uuid primary key, role text);
insert into profiles values ('10000000-0000-4000-8000-000000000010','content_admin'),('30000000-0000-4000-8000-000000000010','student');
create table units(id integer primary key, code text unique, program_id text);
insert into units values (1,'QA-A-U01','QA-PROGRAM-A'),(2,'QA-B-U01','QA-PROGRAM-B'),(3,'QA-C-U01','QA-PROGRAM-C'),(4,'QA-D-U01','QA-PROGRAM-D');
create table skills(id uuid primary key, code text, name_hy text);
insert into skills values ('50000000-0000-4000-8000-000000000100','QA-SKILL','Փորձնական հմտություն');
create table items(id uuid primary key, code text, skill_id uuid, version_no integer, status text, review_status text, retired_at timestamptz, replacement_item_id uuid, variant_key text);
insert into items
select ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,code,'50000000-0000-4000-8000-000000000100',1,'active','needs_review',null,null,'qa-'||n
from (values (1,'QA-EASY'),(2,'QA-HARD'),(3,'QA-MEMORY'),(4,'QA-UNANSWERED'),(5,'QA-BOUNDARY'),(6,'QA-B-CLEAN')) as fixture(n,code);
create table item_curriculum_scopes(item_id uuid,unit_id integer,is_primary boolean);
insert into item_curriculum_scopes select id,case when code='QA-B-CLEAN' then 2 else 1 end,true from items;
create table learning_sessions(id integer primary key,unit_code text,status text,mode text,metadata jsonb);
insert into learning_sessions values
 (1,'QA-A-U01','completed','practice','{}'),(2,'QA-A-U01','abandoned','diagnostic','{"formCode":"QA-FORM-A","formVersion":2}'),
 (3,'QA-A-U01','completed','diagnostic','{"formCode":"QA-FORM-A","formVersion":2}'),(4,'QA-B-U01','completed','diagnostic','{"formCode":"QA-FORM-B","formVersion":1}');
create table learning_session_items(id integer primary key,session_id integer,item_id uuid,selection_reason text);
insert into learning_session_items values (1,1,'50000000-0000-4000-8000-000000000001','pool_exhausted_exact_repeat'),(2,2,'50000000-0000-4000-8000-000000000002','pool_exhausted_exact_repeat'),(3,3,'50000000-0000-4000-8000-000000000003','new_item'),(4,4,'50000000-0000-4000-8000-000000000006','pool_exhausted_exact_repeat');
create table student_item_exposure_events(id integer primary key,student_id integer,item_id uuid,session_id integer,purpose text,served_at timestamptz,answered_at timestamptz,correct boolean,help_used boolean,hint_level_used integer,response_time_ms integer);
insert into student_item_exposure_events
select n,n,'50000000-0000-4000-8000-000000000001',1,'practice','2026-01-01'::timestamptz+n*interval '1 minute','2026-01-01'::timestamptz+n*interval '1 minute'+interval '10 seconds',true,false,0,n*1000 from generate_series(1,10) n;
insert into student_item_exposure_events
select 10+n,n,'50000000-0000-4000-8000-000000000002',1,case when n=5 then 'mastery_check' else 'practice' end,'2026-01-02'::timestamptz+n*interval '1 minute','2026-01-02'::timestamptz+n*interval '1 minute'+interval '10 seconds',false,true,1,1000 from generate_series(1,5) n;
insert into student_item_exposure_events
select 15+n,((n-1)%3)+1,'50000000-0000-4000-8000-000000000003',1,'practice','2026-01-03'::timestamptz+n*interval '1 minute','2026-01-03'::timestamptz+n*interval '1 minute'+interval '10 seconds',n>3,false,0,case when n=6 then null else n*100 end from generate_series(1,6) n;
insert into student_item_exposure_events
select 21+n,n,'50000000-0000-4000-8000-000000000004',n+1,'diagnostic','2026-01-04'::timestamptz+n*interval '1 minute',null,null,false,0,null from generate_series(1,2) n;
insert into student_item_exposure_events
select 23+n,n,'50000000-0000-4000-8000-000000000005',1,'practice','2026-01-05'::timestamptz+n*interval '1 minute','2026-01-05'::timestamptz+n*interval '1 minute'+interval '10 seconds',true,true,1,1000 from generate_series(1,4) n;
insert into student_item_exposure_events values (28,77,'50000000-0000-4000-8000-000000000006',4,'diagnostic','2026-01-06','2026-01-06 00:00:10',true,false,0,1000);
create table assessment_pools(id integer primary key,code text,purpose text,is_protected boolean,unit_code text,status text);
insert into assessment_pools values (1,'QA-PRACTICE','practice',false,'QA-A-U01','active'),(2,'QA-DIAGNOSTIC','diagnostic',false,'QA-A-U01','active'),(3,'QA-PROTECTED','mastery_check',true,'QA-A-U01','active'),(4,'QA-RETIRED','practice',false,'QA-A-U01','retired'),(5,'QA-B-POOL','diagnostic',false,'QA-B-U01','active');
create table assessment_pool_items(pool_id integer,item_id uuid,enabled boolean);
insert into assessment_pool_items values (1,'50000000-0000-4000-8000-000000000001',true),(1,'50000000-0000-4000-8000-000000000003',true),(2,'50000000-0000-4000-8000-000000000004',true),(3,'50000000-0000-4000-8000-000000000002',true),(3,'50000000-0000-4000-8000-000000000001',false),(4,'50000000-0000-4000-8000-000000000005',true),(5,'50000000-0000-4000-8000-000000000006',true);
