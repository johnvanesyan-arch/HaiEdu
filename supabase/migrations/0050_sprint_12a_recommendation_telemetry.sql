-- Sprint 12A audit correction 3 — append-only learner recommendation telemetry.

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_instance_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('issued','shown','followed')),
  policy_scope text not null check (policy_scope in ('dashboard_orchestration','core_after_attempt')),
  surface text not null,
  action text not null,
  target_skill_id uuid references public.skills(id) on delete set null,
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete restrict,
  assessment_blueprint_id uuid references public.assessment_blueprints(id) on delete restrict,
  learning_model_configuration_id uuid references public.learning_model_configurations(id) on delete restrict,
  model_provenance_status text not null check (model_provenance_status in ('exact','unbound_legacy')),
  learning_session_id uuid references public.learning_sessions(id) on delete set null,
  attempt_id uuid references public.attempts(id) on delete set null,
  state_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(state_snapshot)='object'),
  recommendation_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation_snapshot)='object'),
  created_at timestamptz not null default now(),
  unique (recommendation_instance_id, event_type, surface)
);

comment on table public.recommendation_events is
  'Append-only telemetry of learner recommendations as issued, shown and followed, with curriculum/model provenance and learner-state snapshot.';

alter table public.recommendation_events enable row level security;
revoke all on table public.recommendation_events from anon, authenticated;
grant select, insert on table public.recommendation_events to service_role;

create index if not exists recommendation_events_student_created_idx
  on public.recommendation_events (student_id, created_at desc);

create index if not exists recommendation_events_instance_idx
  on public.recommendation_events (recommendation_instance_id, created_at);

create index if not exists recommendation_events_model_idx
  on public.recommendation_events (learning_model_configuration_id)
  where learning_model_configuration_id is not null;

create index if not exists recommendation_events_release_idx
  on public.recommendation_events (curriculum_release_id, created_at desc);

create index if not exists recommendation_events_session_idx
  on public.recommendation_events (learning_session_id)
  where learning_session_id is not null;

create index if not exists recommendation_events_attempt_idx
  on public.recommendation_events (attempt_id)
  where attempt_id is not null;

create or replace function public.reject_recommendation_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'recommendation_events is append-only';
end;
$$;

drop trigger if exists recommendation_events_immutable
  on public.recommendation_events;

create trigger recommendation_events_immutable
before update or delete on public.recommendation_events
for each row execute function public.reject_recommendation_event_mutation();
