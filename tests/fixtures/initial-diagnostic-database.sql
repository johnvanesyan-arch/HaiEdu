create role anon;
create role authenticated;
create role service_role bypassrls;
create table public.learning_sessions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, unit_code text not null,
 mode text not null, status text not null default 'active',
 curriculum_release_id uuid, assessment_blueprint_id uuid, planned_item_count integer,
 answered_count integer not null default 0, correct_count integer not null default 0,
 started_at timestamptz default now(), completed_at timestamptz, metadata jsonb default '{}'
);
alter table public.learning_sessions enable row level security;
create table public.learning_session_items (
 id uuid primary key default gen_random_uuid(), session_id uuid references learning_sessions(id),
 ordinal integer check (ordinal > 0), skill_id uuid, item_id uuid, selection_reason text,
 answered_at timestamptz, correct boolean,
 unique(session_id, ordinal), unique(session_id,item_id)
);
create table public.units (id uuid primary key, code text);
create table public.assessment_pools (id uuid primary key, code text, unit_code text, purpose text, status text);
create table public.assessment_forms (id uuid primary key, pool_id uuid references assessment_pools(id), code text, form_version integer, status text);
create table public.assessment_form_items (form_id uuid, item_id uuid, primary key(form_id,item_id));
create table public.assessment_blueprints (id uuid primary key, curriculum_release_id uuid, unit_id uuid, assessment_pool_id uuid, purpose text, status text);
create table public.assessment_blueprint_items (assessment_blueprint_id uuid, item_id uuid, primary key(assessment_blueprint_id,item_id));
create table public.items (id uuid primary key, skill_id uuid, status text);
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select on public.learning_sessions to anon, authenticated;
