-- Sprint 12A audit correction 1 — exact learning-model provenance for new sessions.

create table if not exists public.learning_model_runtime_bindings (
  id uuid primary key default gen_random_uuid(),
  binding_key text not null unique,
  curriculum_release_id uuid not null references public.curriculum_releases(id),
  unit_code text not null,
  learning_model_configuration_id uuid not null references public.learning_model_configurations(id),
  status text not null default 'active' check (status in ('active','inactive')),
  notes text not null default '',
  activated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_model_runtime_bindings is
  'Server-side pointer from an active curriculum/unit runtime to the immutable learning-model configuration that must stamp new sessions.';

alter table public.learning_model_runtime_bindings enable row level security;
revoke all on table public.learning_model_runtime_bindings from anon, authenticated;
grant select, insert, update on table public.learning_model_runtime_bindings to service_role;

create unique index if not exists learning_model_runtime_bindings_active_scope_uq
  on public.learning_model_runtime_bindings (curriculum_release_id, unit_code)
  where status='active';

create index if not exists learning_model_runtime_bindings_model_idx
  on public.learning_model_runtime_bindings (learning_model_configuration_id);

alter table public.learning_sessions
  add column if not exists learning_model_configuration_id uuid
    references public.learning_model_configurations(id),
  add column if not exists model_provenance_status text
    not null default 'unbound_legacy'
    check (model_provenance_status in ('exact','unbound_legacy'));

create index if not exists learning_sessions_model_configuration_idx
  on public.learning_sessions (learning_model_configuration_id)
  where learning_model_configuration_id is not null;

insert into public.learning_model_runtime_bindings (
  binding_key,
  curriculum_release_id,
  unit_code,
  learning_model_configuration_id,
  status,
  notes
)
select
  'physics7_u01_current',
  cr.id,
  'PHY7-U01',
  lmc.id,
  'active',
  'Sprint 12A audited runtime binding for the frozen post-fix baseline.'
from public.curriculum_releases cr
join public.learning_model_configurations lmc
  on lmc.model_key='haiedu_core_learning_model'
 and lmc.version_label='baseline-2026-09-20-r1'
where cr.release_key='physics7_u01_2026_08_14_pilot_r1'
  and not exists (
    select 1 from public.learning_model_runtime_bindings b
    where b.binding_key='physics7_u01_current'
  );

create or replace function public.stamp_learning_session_model_configuration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_model_id uuid;
  configured_release_id uuid;
begin
  select b.learning_model_configuration_id
    into active_model_id
  from public.learning_model_runtime_bindings b
  where b.curriculum_release_id = new.curriculum_release_id
    and b.unit_code = new.unit_code
    and b.status = 'active'
  limit 1;

  if active_model_id is null then
    raise exception
      'No active learning-model runtime binding for release % / unit %',
      new.curriculum_release_id, new.unit_code;
  end if;

  if new.learning_model_configuration_id is not null
     and new.learning_model_configuration_id <> active_model_id then
    raise exception
      'Session model configuration does not match active runtime binding';
  end if;

  select lmc.reference_curriculum_release_id
    into configured_release_id
  from public.learning_model_configurations lmc
  where lmc.id = active_model_id;

  if configured_release_id is not null
     and configured_release_id <> new.curriculum_release_id then
    raise exception
      'Active learning-model configuration is not bound to the session curriculum release';
  end if;

  new.learning_model_configuration_id := active_model_id;
  new.model_provenance_status := 'exact';
  return new;
end;
$$;

drop trigger if exists learning_sessions_stamp_model_configuration
  on public.learning_sessions;

create trigger learning_sessions_stamp_model_configuration
before insert on public.learning_sessions
for each row execute function public.stamp_learning_session_model_configuration();

create or replace function public.prevent_learning_session_model_rebinding()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.learning_model_configuration_id is distinct from old.learning_model_configuration_id
     or new.model_provenance_status is distinct from old.model_provenance_status then
    raise exception 'learning session model provenance is immutable after insert';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_sessions_model_provenance_immutable
  on public.learning_sessions;

create trigger learning_sessions_model_provenance_immutable
before update of learning_model_configuration_id, model_provenance_status
on public.learning_sessions
for each row execute function public.prevent_learning_session_model_rebinding();

-- No historical session is backfilled: there were zero sessions created after the
-- baseline freeze, so older evidence remains explicitly unbound rather than inferred.
