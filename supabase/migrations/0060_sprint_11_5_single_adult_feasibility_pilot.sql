-- Sprint 11.5 — prospective one-adult feasibility pilot.
-- Historical reviewer/QA sessions remain excluded. Only sessions started after
-- the immutable participant evidence boundary can enter formal calibration.

create table public.pilot_participants (
  id uuid primary key default gen_random_uuid(),
  pilot_run_id uuid not null references public.pilot_runs(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  adult_confirmed boolean not null check (adult_confirmed),
  authorization_basis text not null check (btrim(authorization_basis) <> ''),
  participation_purpose text not null check (btrim(participation_purpose) <> ''),
  authorized_scope jsonb not null check (jsonb_typeof(authorized_scope) = 'object'),
  operational_owner_id uuid not null references public.profiles(id) on delete restrict,
  supervising_teacher_id uuid not null references public.profiles(id) on delete restrict,
  authorization_policy_version text not null,
  authorized_at timestamptz not null,
  evidence_start_at timestamptz not null,
  planned_end_date date,
  created_at timestamptz not null default now(),
  unique (pilot_run_id, student_id),
  check (evidence_start_at >= authorized_at)
);

comment on table public.pilot_participants is
  'Immutable prospective participant enrollment. It never retroactively authorizes earlier sessions.';

create table public.pilot_participant_events (
  id uuid primary key default gen_random_uuid(),
  pilot_participant_id uuid not null references public.pilot_participants(id) on delete restrict,
  event_type text not null check (event_type in (
    'authorized','enrolled','suspended','resumed','withdrawn','completed'
  )),
  effective_at timestamptz not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (btrim(reason) <> ''),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  recorded_at timestamptz not null default now(),
  unique (pilot_participant_id, event_type, effective_at)
);

comment on table public.pilot_participant_events is
  'Append-only participant lifecycle audit. Withdrawal or suspension ends evidence eligibility prospectively.';

create index pilot_participants_student_idx on public.pilot_participants(student_id);
create index pilot_participants_owner_idx on public.pilot_participants(operational_owner_id);
create index pilot_participants_teacher_idx on public.pilot_participants(supervising_teacher_id);
create index pilot_participant_events_participant_time_idx
  on public.pilot_participant_events(pilot_participant_id, effective_at);
create index pilot_participant_events_recorded_by_idx
  on public.pilot_participant_events(recorded_by);

alter table public.pilot_participants enable row level security;
alter table public.pilot_participant_events enable row level security;
revoke all on public.pilot_participants, public.pilot_participant_events
  from public, anon, authenticated;
revoke update, delete, truncate on public.pilot_participants, public.pilot_participant_events
  from service_role;
grant select, insert on public.pilot_participants, public.pilot_participant_events
  to service_role;

create or replace function public.reject_pilot_participant_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

revoke all on function public.reject_pilot_participant_history_mutation()
  from public, anon, authenticated;

create trigger pilot_participants_immutable
before update or delete on public.pilot_participants
for each row execute function public.reject_pilot_participant_history_mutation();

create trigger pilot_participant_events_immutable
before update or delete on public.pilot_participant_events
for each row execute function public.reject_pilot_participant_history_mutation();

create or replace function private.pilot_participant_session_is_eligible(
  p_pilot_run_id uuid,
  p_student_id uuid,
  p_started_at timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.pilot_participants pp
    where pp.pilot_run_id = p_pilot_run_id
      and pp.student_id = p_student_id
      and p_started_at >= pp.evidence_start_at
      and (pp.planned_end_date is null or p_started_at < pp.planned_end_date + 1)
      and not exists (
        select 1
        from public.pilot_participant_events ppe
        where ppe.pilot_participant_id = pp.id
          and ppe.event_type in ('withdrawn','suspended')
          and ppe.effective_at <= p_started_at
          and not exists (
            select 1
            from public.pilot_participant_events later
            where later.pilot_participant_id = pp.id
              and later.event_type = 'resumed'
              and later.effective_at > ppe.effective_at
              and later.effective_at <= p_started_at
          )
      )
  );
$$;

revoke all on function private.pilot_participant_session_is_eligible(uuid,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function private.pilot_participant_session_is_eligible(uuid,uuid,timestamptz)
  to service_role;

create or replace function private.validate_pilot_evidence_participant()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_started_at timestamptz;
begin
  if new.reason_code in ('exact_release_completed','exact_release_noncompleted') then
    select student_id, started_at into v_student_id, v_started_at
    from public.learning_sessions
    where id = new.learning_session_id;

    if not private.pilot_participant_session_is_eligible(
      new.pilot_run_id, v_student_id, v_started_at
    ) then
      raise exception 'pilot_session_outside_authorized_participant_window';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_pilot_evidence_participant()
  from public, anon, authenticated;

create trigger pilot_evidence_participant_guard
before insert or update on public.pilot_evidence_classifications
for each row execute function private.validate_pilot_evidence_participant();

create or replace function private.classify_prospective_pilot_session()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.pilot_runs%rowtype;
begin
  select * into v_run
  from public.pilot_runs
  where run_key = 'sprint_11l_physics7_chapter1_pilot';

  if v_run.id is null
     or new.curriculum_release_id <> v_run.target_curriculum_release_id
     or not private.pilot_participant_session_is_eligible(
       v_run.id, new.student_id, new.started_at
     ) then
    return new;
  end if;

  insert into public.pilot_evidence_classifications (
    pilot_run_id, learning_session_id, classification, reason_code,
    rationale, evidence_snapshot
  ) values (
    v_run.id,
    new.id,
    case when new.status = 'completed' then 'compatible' else 'incompatible' end,
    case when new.status = 'completed'
      then 'exact_release_completed' else 'exact_release_noncompleted' end,
    case when new.status = 'completed'
      then 'Prospective authorized adult feasibility-pilot session completed on the exact target release.'
      else 'Prospective authorized adult feasibility-pilot trajectory remains incomplete and is retained for metric-specific eligibility.' end,
    jsonb_build_object(
      'prospective', true,
      'mode', new.mode,
      'status', new.status,
      'provenanceStatus', new.provenance_status,
      'modelProvenanceStatus', new.model_provenance_status,
      'runtimeProvenanceStatus', new.runtime_provenance_status,
      'curriculumReleaseId', new.curriculum_release_id,
      'assessmentBlueprintId', new.assessment_blueprint_id,
      'startedAt', new.started_at,
      'completedAt', new.completed_at
    )
  )
  on conflict (pilot_run_id, learning_session_id) do update set
    classification = excluded.classification,
    reason_code = excluded.reason_code,
    rationale = excluded.rationale,
    evidence_snapshot = excluded.evidence_snapshot,
    classified_at = now(),
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.classify_prospective_pilot_session()
  from public, anon, authenticated;

create trigger learning_sessions_prospective_pilot_classification
after insert or update of status, completed_at on public.learning_sessions
for each row execute function private.classify_prospective_pilot_session();

do $$
declare
  v_run_id uuid;
  v_student_id uuid;
  v_owner_id uuid;
  v_teacher_id uuid;
  v_participant_id uuid;
  v_candidate_count integer;
  v_now timestamptz := now();
begin
  select id into v_run_id
  from public.pilot_runs
  where run_key = 'sprint_11l_physics7_chapter1_pilot';

  select count(distinct p.id) into v_candidate_count
  from public.profiles p
  join public.learning_sessions ls on ls.student_id = p.id
  where p.role = 'student'
    and not (ls.metadata ? 'qaDisposition')
    and not coalesce((ls.metadata->>'qa_artifact')::boolean,false);

  if v_candidate_count <> 1 then
    raise exception 'single_adult_feasibility_pilot_candidate_count:%', v_candidate_count;
  end if;

  select distinct p.id into v_student_id
  from public.profiles p
  join public.learning_sessions ls on ls.student_id = p.id
  where p.role = 'student'
    and not (ls.metadata ? 'qaDisposition')
    and not coalesce((ls.metadata->>'qa_artifact')::boolean,false);

  select id into v_owner_id
  from public.profiles
  where role = 'admin' and display_name = 'John Vanesyan';

  select id into v_teacher_id
  from public.profiles
  where role = 'teacher'
  order by created_at
  limit 1;

  if v_run_id is null or v_student_id is null or v_owner_id is null or v_teacher_id is null then
    raise exception 'single_adult_feasibility_pilot_identity_resolution_failed';
  end if;

  insert into public.pilot_participants (
    pilot_run_id, student_id, adult_confirmed, authorization_basis,
    participation_purpose, authorized_scope, operational_owner_id,
    supervising_teacher_id, authorization_policy_version, authorized_at,
    evidence_start_at, planned_end_date
  ) values (
    v_run_id, v_student_id, true,
    'Participant is an adult and prospective normal-learner participation was explicitly confirmed by the operational owner on 2026-09-21.',
    'Single-participant feasibility pilot for workflow, telemetry, learner-skill trajectory and hypothesis generation; not sufficient alone for parameter tuning.',
    jsonb_build_object(
      'releaseKey','physics7_u01_2026_08_14_pilot_r1',
      'unitCode','PHY7-U01',
      'lifecycle',jsonb_build_array('diagnostic','practice','mastery_check'),
      'prospectiveOnly',true,
      'historicalReviewerSessionsExcluded',true,
      'withdrawal','Participant may stop at any time; a withdrawal event ends future evidence eligibility.',
      'suspension','Operational owner may suspend participation; suspended sessions are excluded.',
      'deletion','Existing account-deletion workflow remains available; deletion handling must preserve only legally/operationally permitted audit data.',
      'calibrationBoundary','One learner may support feasibility and hypotheses, not parameter change approval.'
    ),
    v_owner_id, v_teacher_id, 'adult-feasibility-pilot-v1',
    v_now, v_now, current_date + 14
  ) returning id into v_participant_id;

  insert into public.pilot_participant_events (
    pilot_participant_id, event_type, effective_at, recorded_by, reason, metadata
  ) values
    (v_participant_id, 'authorized', v_now, v_owner_id,
     'Adult prospective participation authorized by the operational owner.',
     jsonb_build_object('guardianAuthorizationRequired',false)),
    (v_participant_id, 'enrolled', v_now, v_owner_id,
     'Enrolled in the exact-release one-participant feasibility cohort.',
     jsonb_build_object('priorSessionsEligible',false));

  update public.pilot_gate_checks
  set status = 'passed',
      evidence = jsonb_build_object(
        'policyVersion','adult-feasibility-pilot-v1',
        'operationalOwnerId',v_owner_id,
        'adultParticipant',true,
        'prospectiveOnly',true,
        'withdrawalDefined',true,
        'suspensionDefined',true,
        'deletionWorkflowDefined',true,
        'parameterTuningAuthorized',false
      ),
      notes = 'Adult prospective participation, purpose, scope and withdrawal/suspension/deletion handling approved. This gate does not authorize parameter tuning.',
      checked_by = v_owner_id,
      checked_at = v_now,
      updated_at = v_now
  where pilot_run_id = v_run_id and gate_code = 'participation_authorized';

  update public.pilot_gate_checks
  set status = 'passed',
      evidence = jsonb_build_object(
        'participantCount',1,
        'pilotParticipantId',v_participant_id,
        'evidenceStartAt',v_now,
        'plannedEndDate',current_date + 14,
        'supervisingTeacherId',v_teacher_id,
        'historicalSessionsEligible',false
      ),
      notes = 'One authorized adult enrolled prospectively for a feasibility pilot. Historical reviewer/QA sessions remain excluded.',
      checked_by = v_owner_id,
      checked_at = v_now,
      updated_at = v_now
  where pilot_run_id = v_run_id and gate_code = 'cohort_enrolled';

  update public.pilot_runs
  set status = 'running',
      cohort_label = 'Physics 7 Chapter I — one-adult feasibility pilot',
      planned_start_date = current_date,
      planned_end_date = current_date + 14,
      cohort_started_at = v_now,
      notes = 'Prospective one-adult feasibility pilot. Prior reviewer activity is QA/context only. One learner cannot authorize parameter tuning.',
      updated_by = v_owner_id,
      updated_at = v_now
  where id = v_run_id;
end;
$$;

create view public.pilot_participant_status_v
with (security_invoker = true) as
select pp.id pilot_participant_id, pp.pilot_run_id, pr.run_key, pp.student_id,
  pp.adult_confirmed, pp.authorization_policy_version, pp.evidence_start_at,
  pp.planned_end_date, pp.operational_owner_id, pp.supervising_teacher_id,
  case
    when exists (
      select 1 from public.pilot_participant_events e
      where e.pilot_participant_id=pp.id and e.event_type='withdrawn'
    ) then 'withdrawn'
    when exists (
      select 1 from public.pilot_participant_events e
      where e.pilot_participant_id=pp.id and e.event_type='suspended'
        and not exists (
          select 1 from public.pilot_participant_events r
          where r.pilot_participant_id=pp.id and r.event_type='resumed'
            and r.effective_at>e.effective_at
        )
    ) then 'suspended'
    else 'active'
  end participant_status,
  (select count(*) from public.learning_sessions ls
    where ls.student_id=pp.student_id and ls.started_at>=pp.evidence_start_at)
    prospective_session_count
from public.pilot_participants pp
join public.pilot_runs pr on pr.id=pp.pilot_run_id;

revoke all on public.pilot_participant_status_v from public, anon, authenticated;
grant select on public.pilot_participant_status_v to service_role;
