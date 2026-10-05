create schema if not exists auth;
-- Roles are cluster-wide; separate disposable databases share the CI server.
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;

create type public.user_role as enum (
  'student',
  'teacher',
  'admin',
  'content_admin',
  'school_admin'
);

create table public.profiles (
  id uuid primary key,
  role public.user_role not null,
  account_status text not null
);

create table public.subjects (
  id uuid primary key,
  code text not null,
  name_hy text not null
);

create table public.grades (
  id uuid primary key,
  grade_number smallint not null,
  label_hy text
);

create table public.subject_programs (
  id uuid primary key,
  version_label text not null
);

create table public.units (
  id uuid primary key,
  subject_program_id uuid not null,
  code text,
  title_hy text not null
);

create table public.topics (
  id uuid primary key,
  unit_id uuid not null
);

create table public.learning_outcomes (
  id uuid primary key,
  topic_id uuid not null
);

create table public.skills (
  id uuid primary key,
  subject_id uuid not null,
  grade_id uuid not null,
  code text not null,
  name_hy text not null
);

create table public.skill_outcomes (
  skill_id uuid not null,
  learning_outcome_id uuid not null
);

create table public.item_families (
  id uuid primary key,
  skill_id uuid not null
);

create table public.item_templates (
  id uuid primary key,
  item_family_id uuid not null,
  code text not null
);

create table public.skill_remediation_guides (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null,
  misconception_code text not null,
  title_hy text not null,
  strategy_hy text not null,
  hint_1_hy text not null,
  hint_2_hy text not null,
  worked_example_hy text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  guide_version integer not null default 1,
  unique (skill_id, misconception_code)
);

create table public.item_template_remediation_guides (
  id uuid primary key default gen_random_uuid(),
  item_template_id uuid not null,
  trigger_error_code text,
  guide_version integer not null default 1,
  title_hy text not null,
  strategy_hy text not null,
  hint_1_hy text not null,
  hint_2_hy text not null,
  worked_example_hy text not null,
  allowed_parameter_keys text[] not null default '{}',
  status text not null default 'published',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index item_template_remediation_guides_one_published_uq
  on public.item_template_remediation_guides
  (item_template_id, coalesce(trigger_error_code,'__default__'))
  where status = 'published';

create table public.remediation_guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_scope text not null,
  guide_source_id uuid not null,
  guide_version integer not null,
  content_snapshot jsonb not null,
  content_fingerprint text,
  created_at timestamptz not null default now(),
  unique (guide_scope, guide_source_id, guide_version)
);

create or replace function public.version_skill_remediation_guide()
returns trigger language plpgsql as $$ begin return new; end $$;
create or replace function public.version_template_remediation_guide()
returns trigger language plpgsql as $$ begin return new; end $$;
create or replace function public.snapshot_skill_remediation_guide()
returns trigger language plpgsql as $$ begin return new; end $$;
create or replace function public.snapshot_template_remediation_guide()
returns trigger language plpgsql as $$ begin return new; end $$;

create trigger skill_remediation_guides_auto_version
before update on public.skill_remediation_guides
for each row execute function public.version_skill_remediation_guide();
create trigger item_template_remediation_guides_auto_version
before update on public.item_template_remediation_guides
for each row execute function public.version_template_remediation_guide();
create trigger skill_remediation_guides_snapshot
after insert or update on public.skill_remediation_guides
for each row execute function public.snapshot_skill_remediation_guide();
create trigger item_template_remediation_guides_snapshot
after insert or update on public.item_template_remediation_guides
for each row execute function public.snapshot_template_remediation_guide();

insert into public.subjects values ('10000000-0000-4000-8000-000000000001','physics','Ֆիզիկա');
insert into public.grades values ('10000000-0000-4000-8000-000000000002',7,'7-րդ դասարան');
insert into public.subject_programs values ('10000000-0000-4000-8000-000000000003','2026');
insert into public.units values ('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','PHY7-U01','Գլուխ I');
insert into public.topics values ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000004');
insert into public.learning_outcomes values ('10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000005');
insert into public.skills values ('10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','PHY7-U01-S01','Փորձնական հմտություն');
insert into public.skill_outcomes values ('10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000006');
insert into public.item_families values ('10000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000007');
insert into public.item_templates values ('10000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000008','PHY7-U01-S01-T-TEST');
insert into public.profiles values ('10000000-0000-4000-8000-000000000010','content_admin','active');

insert into public.skill_remediation_guides (
  id, skill_id, misconception_code, title_hy, strategy_hy,
  hint_1_hy, hint_2_hy, worked_example_hy, status
) values (
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000007',
  'test_misconception','Գործող վերնագիր','Գործող ռազմավարություն',
  'Գործող առաջին հուշում','Գործող երկրորդ հուշում','Գործող օրինակ','published'
);

insert into public.item_template_remediation_guides (
  id, item_template_id, trigger_error_code, title_hy, strategy_hy,
  hint_1_hy, hint_2_hy, worked_example_hy, allowed_parameter_keys,
  status, metadata
) values (
  '10000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000009',null,
  'Ձևանմուշի վերնագիր','Ձևանմուշի ռազմավարություն',
  'Առաջին {{sourceValue}} հուշում','Երկրորդ հուշում','Այլ թվերով օրինակ',
  array['sourceValue'],'published','{}'
);
