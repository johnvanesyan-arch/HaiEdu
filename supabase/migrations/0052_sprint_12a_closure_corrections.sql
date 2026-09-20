-- Sprint 12A closure corrections.
-- Separates learning-model configuration from runtime implementation provenance,
-- freezes complete learning-session identity, closes append-only privilege gaps,
-- makes hint state/event recording atomic, exposes unclassified evidence fail-closed,
-- and distinguishes recommendation clicks from confirmed learning starts.

create table if not exists public.runtime_builds (
  id uuid primary key default gen_random_uuid(),
  build_key text not null unique,
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  implementation_manifest jsonb not null check (jsonb_typeof(implementation_manifest)='object'),
  notes text not null default '',
  frozen_at timestamptz not null default now(),
  snapshot_fingerprint text generated always as (
    md5(source_commit || '|' || implementation_manifest::text)
  ) stored
);

comment on table public.runtime_builds is
  'Append-only runtime implementation bundles, separate from learning-model configuration.';

alter table public.runtime_builds enable row level security;
revoke all on table public.runtime_builds from anon, authenticated;
grant select, insert on table public.runtime_builds to service_role;
revoke update, delete, truncate on table public.runtime_builds from service_role;

create or replace function public.reject_runtime_build_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'runtime_builds is append-only; insert a new build instead';
end;
$$;

drop trigger if exists runtime_builds_immutable on public.runtime_builds;
create trigger runtime_builds_immutable
before update or delete on public.runtime_builds
for each row execute function public.reject_runtime_build_mutation();

insert into public.runtime_builds(build_key, source_commit, implementation_manifest, notes)
values (
  'runtime-2026-09-20-r2',
  'ff0fd1aed9f5dff0bce7fdf4ef19ff04703b6483',
  jsonb_build_object(
    'functions', jsonb_build_object(
      'submit-answer', 11,
      'start-learning-session', 12,
      'get-session-item', 11,
      'get-student-dashboard', 17,
      'submit-mastery-answer', 4,
      'get-mastery-check-status', 6,
      'get-remediation-help', 6,
      'record-recommendation-event', 1
    ),
    'learningParametersChanged', false
  ),
  'Runtime bundle observed by the Sprint 12A closure audit; learning parameters remain baseline r1.'
)
on conflict (build_key) do nothing;

alter table public.learning_model_runtime_bindings
  add column if not exists runtime_build_id uuid references public.runtime_builds(id);

update public.learning_model_runtime_bindings b
set runtime_build_id = rb.id
from public.runtime_builds rb
where b.status='active'
  and b.runtime_build_id is null
  and rb.build_key='runtime-2026-09-20-r2';

alter table public.learning_model_runtime_bindings
  alter column runtime_build_id set not null;

alter table public.learning_sessions
  add column if not exists runtime_build_id uuid references public.runtime_builds(id),
  add column if not exists runtime_provenance_status text not null default 'unbound_legacy'
    check (runtime_provenance_status in ('exact','unbound_legacy'));

create index if not exists learning_sessions_runtime_build_idx
  on public.learning_sessions(runtime_build_id) where runtime_build_id is not null;

-- Exact-model sessions created under the single audited active binding can be tied
-- to the runtime bundle that the audit directly observed. Older sessions stay unbound.
update public.learning_sessions s
set runtime_build_id=b.runtime_build_id,
    runtime_provenance_status='exact'
from public.learning_model_runtime_bindings b
where s.model_provenance_status='exact'
  and s.learning_model_configuration_id=b.learning_model_configuration_id
  and s.curriculum_release_id=b.curriculum_release_id
  and s.unit_code=b.unit_code
  and b.status='active'
  and s.runtime_build_id is null;

create or replace function public.stamp_learning_session_model_configuration()
returns trigger language plpgsql set search_path=public as $$
declare
  active_model_id uuid;
  active_runtime_id uuid;
  configured_release_id uuid;
begin
  select b.learning_model_configuration_id, b.runtime_build_id
    into active_model_id, active_runtime_id
  from public.learning_model_runtime_bindings b
  where b.curriculum_release_id=new.curriculum_release_id
    and b.unit_code=new.unit_code and b.status='active'
  limit 1;

  if active_model_id is null or active_runtime_id is null then
    raise exception 'No complete active model/runtime binding for release % / unit %',
      new.curriculum_release_id, new.unit_code;
  end if;
  if new.learning_model_configuration_id is not null
     and new.learning_model_configuration_id<>active_model_id then
    raise exception 'Session model configuration does not match active runtime binding';
  end if;
  if new.runtime_build_id is not null and new.runtime_build_id<>active_runtime_id then
    raise exception 'Session runtime build does not match active runtime binding';
  end if;

  select reference_curriculum_release_id into configured_release_id
  from public.learning_model_configurations where id=active_model_id;
  if configured_release_id is not null and configured_release_id<>new.curriculum_release_id then
    raise exception 'Active learning-model configuration is not bound to the session curriculum release';
  end if;

  new.learning_model_configuration_id:=active_model_id;
  new.model_provenance_status:='exact';
  new.runtime_build_id:=active_runtime_id;
  new.runtime_provenance_status:='exact';
  return new;
end;
$$;

create or replace function public.prevent_learning_session_identity_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  if row(new.unit_code,new.mode,new.target_skill_id,new.curriculum_release_id,
         new.assessment_blueprint_id,new.provenance_status,
         new.learning_model_configuration_id,new.model_provenance_status,
         new.runtime_build_id,new.runtime_provenance_status)
     is distinct from
     row(old.unit_code,old.mode,old.target_skill_id,old.curriculum_release_id,
         old.assessment_blueprint_id,old.provenance_status,
         old.learning_model_configuration_id,old.model_provenance_status,
         old.runtime_build_id,old.runtime_provenance_status) then
    raise exception 'learning session identity and provenance are immutable after insert';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_sessions_model_provenance_immutable on public.learning_sessions;
drop trigger if exists learning_sessions_identity_immutable on public.learning_sessions;
create trigger learning_sessions_identity_immutable
before update of unit_code, mode, target_skill_id, curriculum_release_id,
  assessment_blueprint_id, provenance_status, learning_model_configuration_id,
  model_provenance_status, runtime_build_id, runtime_provenance_status
on public.learning_sessions
for each row execute function public.prevent_learning_session_identity_mutation();

revoke update, delete, truncate on table
  public.learning_model_configurations,
  public.calibration_evidence_contracts,
  public.calibration_metric_sets,
  public.remediation_guide_versions,
  public.recommendation_events
from service_role;

create or replace function public.record_remediation_help_atomic(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_skill_id uuid,
  p_item_id uuid,
  p_stage text,
  p_context text,
  p_hint_level integer,
  p_guide_scope text,
  p_guide_source_id uuid,
  p_guide_version integer,
  p_item_template_id uuid,
  p_error_code text,
  p_rendered_title_hy text,
  p_rendered_strategy_hy text,
  p_rendered_content_hy text,
  p_metadata jsonb
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  event_id uuid;
  changed integer;
begin
  if p_hint_level not between 1 and 3 then
    raise exception 'invalid hint level';
  end if;

  update public.learning_session_items li
  set hint_level_used=p_hint_level
  from public.learning_sessions ls
  where li.id=p_session_item_id
    and li.session_id=p_session_id
    and li.skill_id=p_skill_id
    and li.item_id=p_item_id
    and ls.id=li.session_id
    and ls.student_id=p_student_id
    and ls.mode='practice'
    and ls.status='active'
    and coalesce(li.hint_level_used,0)=p_hint_level-1;
  get diagnostics changed=row_count;
  if changed<>1 then
    raise exception 'stale or invalid remediation state';
  end if;

  insert into public.remediation_events(
    student_id,session_id,session_item_id,skill_id,item_id,stage,context,
    hint_level,guide_scope,guide_source_id,guide_version,item_template_id,
    error_code,rendered_title_hy,rendered_strategy_hy,rendered_content_hy,metadata
  ) values (
    p_student_id,p_session_id,p_session_item_id,p_skill_id,p_item_id,p_stage,p_context,
    p_hint_level,p_guide_scope,p_guide_source_id,p_guide_version,p_item_template_id,
    p_error_code,p_rendered_title_hy,p_rendered_strategy_hy,p_rendered_content_hy,
    coalesce(p_metadata,'{}'::jsonb)
  ) returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.record_remediation_help_atomic(uuid,uuid,uuid,uuid,uuid,text,text,integer,text,uuid,integer,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_remediation_help_atomic(uuid,uuid,uuid,uuid,uuid,text,text,integer,text,uuid,integer,uuid,text,text,text,text,jsonb) to service_role;

create or replace view public.pilot_evidence_detail_v
with (security_invoker=true) as
select
  pr.id as pilot_run_id,
  pr.run_key,
  target_release.release_key as target_release_key,
  s.id as learning_session_id,
  source_release.release_key as source_release_key,
  s.mode,
  s.status as session_status,
  s.provenance_status,
  coalesce(pec.classification,'unclassified') as classification,
  coalesce(pec.reason_code,'classification_pending') as reason_code,
  coalesce(pec.rationale,'Session is visible but excluded until pilot evidence classification is recorded.') as rationale,
  coalesce(pec.classification='compatible'
    and s.curriculum_release_id=pr.target_curriculum_release_id
    and s.provenance_status='exact'
    and s.status='completed'
    and not (s.metadata ? 'qaDisposition')
    and exists(select 1 from public.pilot_gate_checks g where g.pilot_run_id=pr.id and g.gate_code='participation_authorized' and g.status='passed')
    and exists(select 1 from public.pilot_gate_checks g where g.pilot_run_id=pr.id and g.gate_code='cohort_enrolled' and g.status='passed'), false) as closure_eligible,
  (select count(*) from public.attempts a where a.learning_session_id=s.id) as attempt_count,
  (select count(*) from public.student_item_exposure_events e where e.session_id=s.id) as exposure_count,
  pec.classified_at,
  false as calibration_eligible,
  case when pec.learning_session_id is null then 'classification_pending' else 'metric_specific_rule_required' end as calibration_reason
from public.pilot_runs pr
join public.curriculum_releases target_release on target_release.id=pr.target_curriculum_release_id
join public.learning_sessions s on s.curriculum_release_id=pr.target_curriculum_release_id
join public.curriculum_releases source_release on source_release.id=s.curriculum_release_id
left join public.pilot_evidence_classifications pec
  on pec.pilot_run_id=pr.id and pec.learning_session_id=s.id;

revoke all on public.pilot_evidence_detail_v from anon, authenticated;
grant select on public.pilot_evidence_detail_v to service_role;

alter table public.recommendation_events drop constraint if exists recommendation_events_event_type_check;
alter table public.recommendation_events add constraint recommendation_events_event_type_check
  check (event_type in ('issued','shown','clicked','action_started'));

comment on table public.recommendation_events is
  'Append-only recommendation telemetry: issued/shown/clicked are interaction events; action_started is server-confirmed by the learning workflow.';
