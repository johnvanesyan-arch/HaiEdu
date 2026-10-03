-- Synthetic, disposable local fixture. Never apply to a remote database.
create schema if not exists private;
create type public.content_status as enum ('draft','review','published','archived');
alter table public.item_templates add column template_kind text not null default 'fixed';
alter table public.item_templates add column template_version integer not null default 1;
alter table public.item_templates add column generation_config jsonb not null default '{}';
create table public.items (
 id uuid primary key, skill_id uuid not null, item_template_id uuid,
 code text not null, item_type text not null, prompt_hy text not null, prompt_en text,
 stimulus jsonb not null default '{}', difficulty integer not null default 2,
 difficulty_band text not null default 'core', item_family text not null default 'application',
 source_reference text, validation_state text not null default 'provisional_no_sme_review',
 config jsonb not null default '{}', review_status text not null default 'needs_review',
 status public.content_status not null default 'draft', version_no integer not null default 1,
 retired_at timestamptz, retired_reason text, replacement_item_id uuid,
 last_reviewed_at timestamptz, last_reviewed_by uuid,
 variant_seed text, variant_fingerprint text, variant_key text, variant_parameters jsonb default '{}', updated_at timestamptz default now()
);
create table public.item_options (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id),
 option_key text not null, content_hy text not null, content_en text, display_order integer not null,
 unique(item_id,option_key)
);
create table public.item_answer_keys (
 item_id uuid primary key references items(id), answer jsonb not null, tolerance numeric,
 canonical_unit text, accepted_units text[] not null default '{}', feedback_code text,
 updated_at timestamptz default now()
);
create table public.misconceptions (
 id uuid primary key, skill_id uuid not null, code text not null, status text not null,
 title_hy text not null default 'QA synthetic misconception', description_hy text,
 unique(skill_id,code)
);
create table public.item_misconception_mappings (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id),
 misconception_id uuid not null references misconceptions(id), response_key text not null,
 mapping_note text, unique(item_id,misconception_id,response_key)
);
create table public.item_versions (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id),
 version_no integer not null, snapshot jsonb not null, change_summary text, created_by uuid,
 unique(item_id,version_no)
);
create table public.item_qa_runs (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id),
 version_no integer not null, passed boolean not null, details jsonb not null default '{}',
 run_by uuid, errors jsonb not null default '[]', warnings jsonb not null default '[]',
 created_at timestamptz not null default now()
);
create table public.item_reviews (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id),
 version_no integer not null, reviewer_id uuid, review_type text, decision text, notes text
);
insert into public.subjects values ('20000000-0000-4000-8000-000000000001','qa_subject_b','Փորձնական առարկա Բ');
insert into public.grades values ('20000000-0000-4000-8000-000000000002',2,'Փորձնական դասարան Բ');
insert into public.skills values ('20000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','QA-B-S01','Փորձնական հմտություն Բ');
insert into public.profiles values ('30000000-0000-4000-8000-000000000010','student','active');
insert into public.items (id,skill_id,item_template_id,code,item_type,prompt_hy,validation_state,config,review_status,status,version_no)
values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000009','QA-P3-Q1','single_choice','Փորձնական հարց Ա','sme_reviewed','{"learnerVisible":false,"pilot_ready":false,"humanReviewStatus":"approved","technicalQaStatus":"passed"}','approved','published',4),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000009','QA-P3-Q2','single_choice','Փորձնական հարց Բ','provisional_no_sme_review','{"learnerVisible":false}','needs_review','draft',1),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000007',null,'QA-P3-Q3','single_choice','Փորձնական այլ առարկա','provisional_no_sme_review','{"learnerVisible":false}','needs_review','draft',1);
insert into public.item_options(item_id,option_key,content_hy,display_order)
select i.id, o.k, o.c, o.n from items i cross join (values ('A','Տարբերակ Ա',1),('B','Տարբերակ Բ',2)) o(k,c,n);
insert into public.item_answer_keys(item_id,answer) select id,'"A"'::jsonb from items;
insert into public.misconceptions(id,skill_id,code,status) values
 ('30000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000007','QA_ATTACHED_DRAFT','draft'),
 ('30000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000007','QA_NEW_DRAFT','draft'),
 ('30000000-0000-4000-8000-000000000023','20000000-0000-4000-8000-000000000007','QA_OTHER_SUBJECT','active');
insert into public.item_misconception_mappings(item_id,misconception_id,response_key,mapping_note)
values ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000021','B','Approved isolated fixture');
insert into public.item_qa_runs(item_id,version_no,passed) values ('30000000-0000-4000-8000-000000000001',4,true);
alter table public.item_families add column code text not null default 'QA-P3-FAMILY';
create table public.assessment_pools(id uuid primary key,code text,purpose text,is_protected boolean,status text);
create table public.assessment_pool_items(item_id uuid,pool_id uuid,enabled boolean,metadata jsonb);
