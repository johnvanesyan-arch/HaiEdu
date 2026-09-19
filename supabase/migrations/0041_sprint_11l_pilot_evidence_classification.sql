-- Sprint 11L, slice 1: release-aware evidence classification and pilot-entry gates.
--
-- Historical evidence is retained, but only completed, exact-provenance evidence
-- from the target release may qualify for Sprint 11L cohort-closure metrics.

create table public.pilot_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  target_curriculum_release_id uuid not null
    references public.curriculum_releases(id) on delete restrict,
  class_id uuid references public.classes(id) on delete restrict,
  cohort_label text not null,
  status text not null default 'planning'
    check (status in (
      'planning', 'blocked', 'entry_ready', 'running', 'observing',
      'closed', 'cancelled'
    )),
  privacy_policy_version text not null,
  planned_start_date date,
  planned_end_date date,
  cohort_started_at timestamptz,
  cohort_ended_at timestamptz,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_runs_key_check
    check (run_key = lower(run_key) and run_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint pilot_runs_planned_dates_check
    check (
      planned_end_date is null
      or planned_start_date is null
      or planned_end_date >= planned_start_date
    ),
  constraint pilot_runs_cohort_dates_check
    check (
      cohort_ended_at is null
      or (cohort_started_at is not null and cohort_ended_at >= cohort_started_at)
    )
);

create index pilot_runs_release_idx
  on public.pilot_runs(target_curriculum_release_id);
create index pilot_runs_class_idx
  on public.pilot_runs(class_id) where class_id is not null;
create index pilot_runs_created_by_idx
  on public.pilot_runs(created_by) where created_by is not null;
create index pilot_runs_updated_by_idx
  on public.pilot_runs(updated_by) where updated_by is not null;

create table public.pilot_evidence_classifications (
  pilot_run_id uuid not null references public.pilot_runs(id) on delete cascade,
  learning_session_id uuid not null
    references public.learning_sessions(id) on delete cascade,
  classification text not null
    check (classification in ('compatible', 'partially_compatible', 'incompatible')),
  reason_code text not null
    check (reason_code in (
      'exact_release_completed',
      'exact_release_noncompleted',
      'legacy_context_only',
      'release_mismatch',
      'qa_artifact',
      'participation_not_authorized',
      'outside_cohort',
      'manual_review_required'
    )),
  rationale text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  classified_by uuid references public.profiles(id) on delete set null,
  classified_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pilot_run_id, learning_session_id),
  constraint pilot_evidence_classification_reason_check check (
    (classification = 'compatible' and reason_code = 'exact_release_completed')
    or (
      classification = 'partially_compatible'
      and reason_code in ('legacy_context_only', 'manual_review_required')
    )
    or (
      classification = 'incompatible'
      and reason_code in (
        'exact_release_noncompleted', 'release_mismatch', 'qa_artifact',
        'participation_not_authorized', 'outside_cohort',
        'manual_review_required'
      )
    )
  )
);

create index pilot_evidence_classifications_session_idx
  on public.pilot_evidence_classifications(learning_session_id);
create index pilot_evidence_classifications_classified_by_idx
  on public.pilot_evidence_classifications(classified_by)
  where classified_by is not null;

create table public.pilot_gate_checks (
  pilot_run_id uuid not null references public.pilot_runs(id) on delete cascade,
  gate_code text not null
    check (gate_code in (
      'evidence_baseline_classified',
      'sprint_11f_disposition_complete',
      'sprint_11g_two_subject_qa_passed',
      'sprint_11h_surface_qa_passed',
      'participation_authorized',
      'cohort_enrolled',
      'lifecycle_observed',
      'teacher_usability_evidence_collected',
      'exposure_repetition_reviewed',
      'standards_alignment_reviewed',
      'pilot_report_approved'
    )),
  gate_stage text not null check (gate_stage in ('entry', 'closure')),
  owner_kind text not null check (owner_kind in ('technical', 'human', 'shared')),
  status text not null check (status in ('pending', 'passed', 'failed', 'blocked')),
  evidence jsonb not null default '{}'::jsonb,
  notes text not null,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (pilot_run_id, gate_code),
  constraint pilot_gate_checks_checked_check check (
    (status = 'pending' and checked_at is null)
    or (status <> 'pending' and checked_at is not null)
  )
);

create index pilot_gate_checks_checked_by_idx
  on public.pilot_gate_checks(checked_by) where checked_by is not null;
create index pilot_gate_checks_status_idx
  on public.pilot_gate_checks(pilot_run_id, gate_stage, status);

create or replace function private.enforce_pilot_run_gate_state()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_entry_count integer;
  v_passed_entry_count integer;
  v_gate_count integer;
  v_passed_gate_count integer;
begin
  if new.status in ('entry_ready', 'running', 'observing', 'closed') then
    select
      count(*) filter (where gate_stage = 'entry'),
      count(*) filter (where gate_stage = 'entry' and status = 'passed')
    into v_entry_count, v_passed_entry_count
    from public.pilot_gate_checks
    where pilot_run_id = new.id;

    if v_entry_count <> 6 or v_passed_entry_count <> v_entry_count then
      raise exception
        'pilot_entry_gates_not_passed:run=%:passed=%:required=%',
        new.run_key, v_passed_entry_count, v_entry_count;
    end if;
  end if;

  if new.status = 'closed' then
    select count(*), count(*) filter (where status = 'passed')
    into v_gate_count, v_passed_gate_count
    from public.pilot_gate_checks
    where pilot_run_id = new.id;

    if v_gate_count <> 11 or v_passed_gate_count <> v_gate_count then
      raise exception
        'pilot_closure_gates_not_passed:run=%:passed=%:required=%',
        new.run_key, v_passed_gate_count, v_gate_count;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_pilot_run_gate_state()
from public, anon, authenticated;

create trigger pilot_runs_gate_state_guard
before insert or update of status on public.pilot_runs
for each row execute function private.enforce_pilot_run_gate_state();

insert into public.pilot_runs (
  run_key, target_curriculum_release_id, cohort_label, status,
  privacy_policy_version, notes
)
select
  'sprint_11l_physics7_chapter1_pilot',
  cr.id,
  'Physics 7 Chapter I closed pilot',
  'blocked',
  'pilot-v1',
  'Entry remains blocked until the open Sprint 11F-11H QA dispositions and operational participation authorization are complete.'
from public.curriculum_releases cr
where cr.release_key = 'physics7_u01_2026_08_14_pilot_r1';

with run as (
  select id
  from public.pilot_runs
  where run_key = 'sprint_11l_physics7_chapter1_pilot'
), gates(gate_code, gate_stage, owner_kind, status, evidence, notes) as (
  values
    (
      'evidence_baseline_classified', 'entry', 'technical', 'passed',
      jsonb_build_object(
        'classificationPolicy', '11L-v1',
        'closureRule', 'exact target-release completed sessions only'
      ),
      'All learning sessions present at the 11L baseline are classified. Legacy evidence is context only and cannot close the cohort.'
    ),
    (
      'sprint_11f_disposition_complete', 'entry', 'shared', 'blocked',
      jsonb_build_object(
        'openItems', jsonb_build_array(
          'mastery eligibility disposition',
          'teacher evidence verification',
          'account suspension and session revocation',
          'privacy preference behavior',
          'deletion request workflow'
        )
      ),
      'The remaining 11F dispositions must be completed or explicitly accepted before cohort entry.'
    ),
    (
      'sprint_11g_two_subject_qa_passed', 'entry', 'technical', 'pending',
      jsonb_build_object('requiredPersona', 'two-subject QA learner'),
      'Verify Mathematics opens only its generic placeholder and exposes no Physics evidence.'
    ),
    (
      'sprint_11h_surface_qa_passed', 'entry', 'technical', 'pending',
      jsonb_build_object(
        'openChecks', jsonb_build_array(
          'two-subject Home and Mathematics containment',
          'teacher, admin and content surface spot checks'
        )
      ),
      'Complete the remaining cross-role and two-subject visual containment checks.'
    ),
    (
      'participation_authorized', 'entry', 'human', 'blocked',
      jsonb_build_object(
        'analyticsOptInIsSufficient', false,
        'researchOptInIsSufficient', false
      ),
      'Operational participant or guardian authorization, purpose, scope, withdrawal and deletion handling require an accountable human owner.'
    ),
    (
      'cohort_enrolled', 'entry', 'human', 'blocked',
      '{}'::jsonb,
      'No cohort may be enrolled until participation authorization and scope are approved.'
    ),
    (
      'lifecycle_observed', 'closure', 'shared', 'blocked',
      jsonb_build_object('requiredFlow', 'Diagnostic -> Practice -> Mastery'),
      'Requires exact-release evidence from the authorized controlled cohort.'
    ),
    (
      'teacher_usability_evidence_collected', 'closure', 'human', 'blocked',
      '{}'::jsonb,
      'Teacher and usability observations have not yet been collected for the controlled cohort.'
    ),
    (
      'exposure_repetition_reviewed', 'closure', 'shared', 'blocked',
      '{}'::jsonb,
      'Review requires exact-release cohort exposure data.'
    ),
    (
      'standards_alignment_reviewed', 'closure', 'shared', 'blocked',
      '{}'::jsonb,
      'Review requires exact-release cohort evidence against the reconciled outcome and skill snapshots.'
    ),
    (
      'pilot_report_approved', 'closure', 'human', 'blocked',
      '{}'::jsonb,
      'The Sprint 11 pilot report is not eligible for approval until all preceding closure gates pass.'
    )
)
insert into public.pilot_gate_checks (
  pilot_run_id, gate_code, gate_stage, owner_kind, status,
  evidence, notes, checked_at
)
select run.id, gates.gate_code, gates.gate_stage, gates.owner_kind,
       gates.status, gates.evidence, gates.notes,
       case when gates.status = 'pending' then null else now() end
from run cross join gates;

-- Classify every session present at the baseline against the exact 11K release.
-- The one abandoned QA navigation artifact is incompatible. Other legacy
-- sessions remain useful as qualitative/regression context only.
with run as (
  select pr.id, pr.target_curriculum_release_id
  from public.pilot_runs pr
  where pr.run_key = 'sprint_11l_physics7_chapter1_pilot'
)
insert into public.pilot_evidence_classifications (
  pilot_run_id, learning_session_id, classification, reason_code,
  rationale, evidence_snapshot
)
select
  run.id,
  s.id,
  case
    when s.status = 'abandoned' or s.metadata ? 'qaDisposition'
      then 'incompatible'
    when s.curriculum_release_id = run.target_curriculum_release_id
      and s.provenance_status = 'exact'
      and s.status = 'completed'
      then 'compatible'
    when s.provenance_status = 'legacy_inferred'
      then 'partially_compatible'
    else 'incompatible'
  end,
  case
    when s.status = 'abandoned' or s.metadata ? 'qaDisposition'
      then 'qa_artifact'
    when s.curriculum_release_id = run.target_curriculum_release_id
      and s.provenance_status = 'exact'
      and s.status = 'completed'
      then 'exact_release_completed'
    when s.provenance_status = 'legacy_inferred'
      then 'legacy_context_only'
    when s.curriculum_release_id = run.target_curriculum_release_id
      then 'exact_release_noncompleted'
    else 'release_mismatch'
  end,
  case
    when s.status = 'abandoned' or s.metadata ? 'qaDisposition'
      then 'Abandoned or explicitly dispositioned QA automation evidence is retained for audit but excluded from pilot closure.'
    when s.curriculum_release_id = run.target_curriculum_release_id
      and s.provenance_status = 'exact'
      and s.status = 'completed'
      then 'Completed evidence is bound to the exact target release and may enter closure review, subject to cohort authorization and scope.'
    when s.provenance_status = 'legacy_inferred'
      then 'Historical behavior remains useful for regression and qualitative context, but exact historical blueprint membership is not asserted.'
    else 'The session does not satisfy the exact target-release provenance rule.'
  end,
  jsonb_build_object(
    'mode', s.mode,
    'status', s.status,
    'provenanceStatus', s.provenance_status,
    'curriculumReleaseId', s.curriculum_release_id,
    'assessmentBlueprintId', s.assessment_blueprint_id,
    'startedAt', s.started_at,
    'completedAt', s.completed_at,
    'qaDisposition', s.metadata->>'qaDisposition'
  )
from run
cross join public.learning_sessions s;

create view public.pilot_evidence_detail_v
with (security_invoker = true)
as
select
  pr.id as pilot_run_id,
  pr.run_key,
  target_release.release_key as target_release_key,
  s.id as learning_session_id,
  source_release.release_key as source_release_key,
  s.mode,
  s.status as session_status,
  s.provenance_status,
  pec.classification,
  pec.reason_code,
  pec.rationale,
  (
    pec.classification = 'compatible'
    and s.curriculum_release_id = pr.target_curriculum_release_id
    and s.provenance_status = 'exact'
    and s.status = 'completed'
    and not (s.metadata ? 'qaDisposition')
    and exists (
      select 1
      from public.pilot_gate_checks authorization_gate
      where authorization_gate.pilot_run_id = pr.id
        and authorization_gate.gate_code = 'participation_authorized'
        and authorization_gate.status = 'passed'
    )
    and exists (
      select 1
      from public.pilot_gate_checks cohort_gate
      where cohort_gate.pilot_run_id = pr.id
        and cohort_gate.gate_code = 'cohort_enrolled'
        and cohort_gate.status = 'passed'
    )
  ) as closure_eligible,
  (select count(*) from public.attempts a where a.learning_session_id = s.id) as attempt_count,
  (
    select count(*)
    from public.student_item_exposure_events e
    where e.session_id = s.id
  ) as exposure_count,
  pec.classified_at
from public.pilot_evidence_classifications pec
join public.pilot_runs pr on pr.id = pec.pilot_run_id
join public.learning_sessions s on s.id = pec.learning_session_id
join public.curriculum_releases target_release
  on target_release.id = pr.target_curriculum_release_id
join public.curriculum_releases source_release
  on source_release.id = s.curriculum_release_id;

create view public.pilot_evidence_summary_v
with (security_invoker = true)
as
select
  pilot_run_id,
  run_key,
  target_release_key,
  count(*) as classified_sessions,
  count(*) filter (where classification = 'compatible') as compatible_sessions,
  count(*) filter (where classification = 'partially_compatible')
    as partially_compatible_sessions,
  count(*) filter (where classification = 'incompatible') as incompatible_sessions,
  count(*) filter (where closure_eligible) as closure_eligible_sessions,
  coalesce(sum(attempt_count) filter (where closure_eligible), 0) as eligible_attempts,
  coalesce(sum(exposure_count) filter (where closure_eligible), 0) as eligible_exposures
from public.pilot_evidence_detail_v
group by pilot_run_id, run_key, target_release_key;

create view public.pilot_entry_readiness_v
with (security_invoker = true)
as
select
  pr.id as pilot_run_id,
  pr.run_key,
  pr.status as recorded_status,
  cr.release_key as target_release_key,
  count(*) filter (where pgc.gate_stage = 'entry') as entry_gate_count,
  count(*) filter (
    where pgc.gate_stage = 'entry' and pgc.status = 'passed'
  ) as passed_entry_gate_count,
  count(*) filter (
    where pgc.gate_stage = 'entry' and pgc.status <> 'passed'
  ) as open_entry_gate_count,
  bool_and(pgc.status = 'passed') filter (where pgc.gate_stage = 'entry')
    as entry_ready,
  count(*) filter (where pgc.gate_stage = 'closure') as closure_gate_count,
  count(*) filter (
    where pgc.gate_stage = 'closure' and pgc.status = 'passed'
  ) as passed_closure_gate_count,
  count(*) filter (
    where pgc.gate_stage = 'closure' and pgc.status <> 'passed'
  ) as open_closure_gate_count,
  bool_and(pgc.status = 'passed') as closure_ready
from public.pilot_runs pr
join public.curriculum_releases cr on cr.id = pr.target_curriculum_release_id
join public.pilot_gate_checks pgc on pgc.pilot_run_id = pr.id
group by pr.id, pr.run_key, pr.status, cr.release_key;

alter table public.pilot_runs enable row level security;
alter table public.pilot_evidence_classifications enable row level security;
alter table public.pilot_gate_checks enable row level security;

create policy pilot_runs_read on public.pilot_runs
for select to authenticated
using (
  (select private.current_user_role())
    = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
);
create policy pilot_runs_insert on public.pilot_runs
for insert to authenticated
with check (
  (select private.current_user_role())
    = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
);
create policy pilot_runs_update on public.pilot_runs
for update to authenticated
using (
  (select private.current_user_role())
    = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
)
with check (
  (select private.current_user_role())
    = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
);
create policy pilot_runs_delete on public.pilot_runs
for delete to authenticated
using (
  (select private.current_user_role())
    = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'pilot_evidence_classifications', 'pilot_gate_checks'
  ] loop
    execute format(
      'create policy %I_read on public.%I for select to authenticated using (
         (select private.current_user_role()) = any (
           array[''admin''::public.user_role, ''content_admin''::public.user_role]
         )
       )', v_table, v_table
    );
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (
         (select private.current_user_role()) = any (
           array[''admin''::public.user_role, ''content_admin''::public.user_role]
         )
       )', v_table, v_table
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (
         (select private.current_user_role()) = any (
           array[''admin''::public.user_role, ''content_admin''::public.user_role]
         )
       ) with check (
         (select private.current_user_role()) = any (
           array[''admin''::public.user_role, ''content_admin''::public.user_role]
         )
       )', v_table, v_table
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (
         (select private.current_user_role()) = any (
           array[''admin''::public.user_role, ''content_admin''::public.user_role]
         )
       )', v_table, v_table
    );
  end loop;
end;
$$;

grant select, insert, update, delete on
  public.pilot_runs,
  public.pilot_evidence_classifications,
  public.pilot_gate_checks
to authenticated;

grant select on
  public.pilot_evidence_detail_v,
  public.pilot_evidence_summary_v,
  public.pilot_entry_readiness_v
to authenticated;

-- Fail closed if the baseline is incomplete or if any legacy session could be
-- counted toward final cohort closure.
do $$
declare
  v_run_id uuid;
  v_count integer;
begin
  select id into v_run_id
  from public.pilot_runs
  where run_key = 'sprint_11l_physics7_chapter1_pilot';

  if v_run_id is null then
    raise exception '11L_pilot_run_missing';
  end if;

  select count(*) into v_count
  from public.learning_sessions s
  where not exists (
    select 1
    from public.pilot_evidence_classifications pec
    where pec.pilot_run_id = v_run_id
      and pec.learning_session_id = s.id
  );
  if v_count <> 0 then
    raise exception '11L_unclassified_session_count:%', v_count;
  end if;

  select count(*) into v_count
  from public.pilot_evidence_detail_v
  where pilot_run_id = v_run_id
    and provenance_status = 'legacy_inferred'
    and closure_eligible;
  if v_count <> 0 then
    raise exception '11L_legacy_evidence_eligible:%', v_count;
  end if;

  select count(*) into v_count
  from public.pilot_gate_checks
  where pilot_run_id = v_run_id;
  if v_count <> 11 then
    raise exception '11L_gate_count:%', v_count;
  end if;

  select count(*) into v_count
  from public.pilot_gate_checks
  where pilot_run_id = v_run_id and gate_stage = 'entry';
  if v_count <> 6 then
    raise exception '11L_entry_gate_count:%', v_count;
  end if;
end;
$$;

comment on table public.pilot_runs is
  'Controlled pilot run identity bound to one exact curriculum release.';
comment on table public.pilot_evidence_classifications is
  'Auditable session-level compatibility classification against a pilot target release.';
comment on table public.pilot_gate_checks is
  'Technical and human entry/closure gates for a controlled pilot run.';
comment on view public.pilot_evidence_detail_v is
  'Fail-closed release-aware evidence detail. closure_eligible is derived, never manually asserted.';
comment on view public.pilot_entry_readiness_v is
  'Derived readiness state; recorded run status does not override unresolved gates.';
