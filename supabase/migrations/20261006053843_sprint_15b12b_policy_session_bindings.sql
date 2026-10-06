-- 15B.12B: prospective policy/session foundation. No policy or release is activated.
-- Existing sessions and the single lifetime baseline rule are preserved.
create table public.assessment_policy_bindings (
  id uuid primary key default gen_random_uuid(),
  assessment_blueprint_id uuid not null unique references public.assessment_blueprints(id),
  curriculum_release_id uuid not null references public.curriculum_releases(id),
  unit_id uuid not null references public.units(id),
  subject_program_id uuid not null references public.subject_programs(id),
  learning_model_configuration_id uuid not null references public.learning_model_configurations(id),
  academic_mastery_policy_id uuid not null references public.academic_mastery_policy_versions(id),
  policy_snapshot jsonb not null,
  skill_scope_snapshot jsonb not null,
  snapshot_fingerprint text generated always as (md5(policy_snapshot::text||'|'||skill_scope_snapshot::text)) stored,
  created_at timestamptz not null default now()
);
alter table public.assessment_policy_bindings enable row level security;
revoke all on public.assessment_policy_bindings from public, anon, authenticated, service_role;
grant select on public.assessment_policy_bindings to service_role;
create policy assessment_policy_bindings_service_read on public.assessment_policy_bindings
  for select to service_role using (true);
create index assessment_policy_bindings_release_unit_idx
  on public.assessment_policy_bindings(curriculum_release_id,unit_id);
create index assessment_policy_bindings_unit_idx on public.assessment_policy_bindings(unit_id);
create index assessment_policy_bindings_programme_idx on public.assessment_policy_bindings(subject_program_id);
create index assessment_policy_bindings_model_idx on public.assessment_policy_bindings(learning_model_configuration_id);
create index assessment_policy_bindings_lifecycle_idx on public.assessment_policy_bindings(academic_mastery_policy_id);

create function private.reject_assessment_policy_binding_mutation()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'assessment_policy_binding_immutable'; end;
$$;
create trigger assessment_policy_bindings_immutable before update or delete
  on public.assessment_policy_bindings for each row
  execute function private.reject_assessment_policy_binding_mutation();

-- The v1 selected-response extension is explicit; this is not a core format default.
create function private.validate_assessment_policy_v1(p_blueprint_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  b public.assessment_blueprints%rowtype; r public.curriculum_releases%rowtype;
  pool public.assessment_pools%rowtype; model public.learning_model_configurations%rowtype;
  lifecycle public.academic_mastery_policy_versions%rowtype;
  policy jsonb; entry record; form record; total numeric; n integer; code text;
begin
  select * into b from public.assessment_blueprints where id=p_blueprint_id for share;
  if not found or b.status not in ('pilot','production') then
    raise exception 'assessment_policy_unavailable'; end if;
  select * into r from public.curriculum_releases where id=b.curriculum_release_id for share;
  if not found or r.status<>b.status then raise exception 'assessment_policy_unavailable'; end if;
  select unit_code_snapshot into code from public.curriculum_release_units
    where curriculum_release_id=r.id and unit_id=b.unit_id for share;
  if not found then raise exception 'assessment_policy_invalid'; end if;
  policy:=b.configuration_snapshot->'assessmentPolicy';
  if jsonb_typeof(policy) is distinct from 'object' then raise exception 'assessment_policy_unconfigured'; end if;
  if policy->>'schemaVersion' is distinct from 'haiedu-assessment-policy-v1'
    or b.purpose not in ('diagnostic','practice','mastery_check','chapter_review')
    or coalesce(length(trim(policy->>'policyKey')),0)=0
    or jsonb_typeof(policy->'policyKey') is distinct from 'string'
    or jsonb_typeof(policy->'version') is distinct from 'number'
    or coalesce(policy->>'version','') !~ '^[1-9][0-9]*$'
    or (policy->>'version')::numeric>9007199254740991
    or policy->>'mode' is distinct from b.purpose
    or policy->>'subjectProgramId' is distinct from r.subject_program_id::text
    or policy->>'curriculumReleaseId' is distinct from r.id::text
    or policy->>'unitId' is distinct from b.unit_id::text
    or jsonb_typeof(policy->'plannedQuestionCount') is distinct from 'number'
    or coalesce(policy->>'plannedQuestionCount','') !~ '^[1-9][0-9]*$'
    or (policy->>'plannedQuestionCount')::numeric>100
    or policy->>'scoringStrategy' is distinct from 'selected-response-v1'
    or jsonb_typeof(policy->'hintsAllowed') is distinct from 'boolean'
    or jsonb_typeof(policy->'baselineRequired') is distinct from 'boolean'
    or jsonb_typeof(policy->'responseTypes') is distinct from 'array'
  then raise exception 'assessment_policy_invalid'; end if;
  n:=(policy->>'plannedQuestionCount')::integer;
  if jsonb_array_length(policy->'responseTypes')=0 or exists (
    select 1 from jsonb_array_elements(policy->'responseTypes') x
    where x not in ('"single_choice"'::jsonb,'"true_false"'::jsonb))
    or (select count(distinct x) from jsonb_array_elements(policy->'responseTypes') x)
      <>jsonb_array_length(policy->'responseTypes')
    or exists (select 1 from jsonb_object_keys(policy) k where k not in
      ('schemaVersion','policyKey','version','mode','subjectProgramId','curriculumReleaseId','unitId',
       'plannedQuestionCount','learningModelConfigurationId','academicMasteryPolicyId','responseTypes',
       'scoringStrategy','hintsAllowed','baselineRequired','questionCountBySkill',
       'maximumCompletedBaselines','minimumPercent','minimumCorrectBySkill'))
  then raise exception 'assessment_policy_invalid'; end if;
  if b.purpose in ('diagnostic','mastery_check') then
    if policy->'hintsAllowed'<>'false'::jsonb or jsonb_typeof(policy->'questionCountBySkill') is distinct from 'object'
      or policy->'questionCountBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    total:=0;
    for entry in select * from jsonb_each(policy->'questionCountBySkill') loop
      if entry.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^[1-9][0-9]*$'
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.items i on i.skill_id=rs.skill_id
          join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=entry.key::uuid)
      then raise exception 'assessment_policy_skill_scope_invalid'; end if;
      total:=total+entry.value::text::numeric;
    end loop;
    if total<>n then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'questionCountBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if b.purpose='diagnostic' then
    if policy->'maximumCompletedBaselines' is distinct from '1'::jsonb
      or policy->'baselineRequired'<>'false'::jsonb then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'maximumCompletedBaselines' then raise exception 'assessment_policy_invalid'; end if;
  -- Retain the accepted diagnostic-before-practice/review product rule.
  if b.purpose in ('practice','chapter_review') and policy->'baselineRequired'<>'true'::jsonb then
    raise exception 'chapter_diagnostic_policy_required'; end if;
  if b.purpose='mastery_check' then
    if jsonb_typeof(policy->'minimumPercent') is distinct from 'number'
      or (policy->>'minimumPercent')::numeric<=0 or (policy->>'minimumPercent')::numeric>100
      or jsonb_typeof(policy->'minimumCorrectBySkill') is distinct from 'object'
      or policy->'minimumCorrectBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    for entry in select * from jsonb_each(policy->'minimumCorrectBySkill') loop
      if jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^(0|[1-9][0-9]*)$'
        or not (policy->'questionCountBySkill' ? entry.key)
        or entry.value::text::numeric>(policy->'questionCountBySkill'->>entry.key)::numeric
      then raise exception 'assessment_policy_invalid'; end if;
    end loop;
  elsif policy ? 'minimumPercent' or policy ? 'minimumCorrectBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if coalesce(policy->>'learningModelConfigurationId','') !~ '^[0-9a-f-]{36}$'
    or coalesce(policy->>'academicMasteryPolicyId','') !~ '^[0-9a-f-]{36}$' then raise exception 'assessment_policy_invalid'; end if;
  select * into model from public.learning_model_configurations
    where id=(policy->>'learningModelConfigurationId')::uuid for share;
  if not found or model.configuration_kind not in ('baseline','approved')
    or model.reference_curriculum_release_id is distinct from r.id
    or jsonb_typeof(model.configuration->'assessmentPolicyContracts') is distinct from 'array'
    or not (model.configuration->'assessmentPolicyContracts' @> jsonb_build_array(policy))
  then raise exception 'assessment_policy_model_incompatible'; end if;
  select * into lifecycle from public.academic_mastery_policy_versions
    where id=(policy->>'academicMasteryPolicyId')::uuid for share;
  if not found or lifecycle.status<>'active' or lifecycle.effective_from>clock_timestamp()
    or (b.purpose='chapter_review' and lifecycle.target_review_question_count<>n)
  then raise exception 'assessment_policy_lifecycle_incompatible'; end if;
  select * into pool from public.assessment_pools where id=b.assessment_pool_id for update;
  if not found or pool.status<>'active' or pool.unit_code<>code
    or pool.purpose<>(case when b.purpose='chapter_review' then 'practice' else b.purpose end)
  then raise exception 'assessment_policy_pool_invalid'; end if;
  perform 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    where bi.assessment_blueprint_id=b.id order by i.id for share of bi,i;
  perform 1 from public.curriculum_release_skills rs join public.items i on i.skill_id=rs.skill_id
    join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
    join public.item_curriculum_scopes sc on sc.item_id=i.id
    where rs.curriculum_release_id=r.id order by rs.skill_id,i.id,sc.id for share of rs,sc;
  perform 1 from public.assessment_pool_items where pool_id=pool.id order by item_id for share;
  if not exists (select 1 from public.assessment_blueprint_items where assessment_blueprint_id=b.id)
    or exists (select 1 from public.assessment_blueprint_items bi
      join public.items i on i.id=bi.item_id
      where bi.assessment_blueprint_id=b.id and
       (i.status<>'published' or i.version_no<>bi.item_version_snapshot
        or not (policy->'responseTypes' ? i.item_type::text)
        or not exists (select 1 from public.assessment_pool_items pi
          where pi.pool_id=pool.id and pi.item_id=i.id and pi.enabled)
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=i.skill_id)))
  then raise exception 'assessment_policy_item_scope_invalid'; end if;
  if (select count(*) from public.assessment_blueprint_items where assessment_blueprint_id=b.id)<n then
    raise exception 'assessment_policy_coverage_insufficient'; end if;
  if b.purpose in ('diagnostic','mastery_check') then
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
        where bi.assessment_blueprint_id=b.id and i.skill_id=entry.key::uuid)<entry.value::integer then
        raise exception 'assessment_policy_coverage_insufficient'; end if;
    end loop;
  end if;
  if b.purpose='diagnostic' and not exists (select 1 from public.assessment_forms f
    where f.pool_id=pool.id and f.status='active') then raise exception 'assessment_policy_forms_unavailable'; end if;
  if b.purpose='diagnostic' then
    for form in select f.id from public.assessment_forms f where f.pool_id=pool.id and f.status='active' order by f.id for update loop
      perform 1 from public.assessment_form_items where form_id=form.id order by item_id for share;
      if (select count(*) from public.assessment_form_items where form_id=form.id)<>n
        or exists (select 1 from public.assessment_form_items fi where fi.form_id=form.id
          and not exists (select 1 from public.assessment_blueprint_items bi where bi.assessment_blueprint_id=b.id and bi.item_id=fi.item_id))
      then raise exception 'assessment_policy_form_coverage_invalid'; end if;
      for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
        if (select count(*) from public.assessment_form_items fi join public.items i on i.id=fi.item_id
          where fi.form_id=form.id and i.skill_id=entry.key::uuid)<>entry.value::integer then
          raise exception 'assessment_policy_form_coverage_invalid'; end if;
      end loop;
      if exists (select 1 from public.assessment_form_items fi join public.items i on i.id=fi.item_id
        where fi.form_id=form.id and not (policy->'questionCountBySkill' ? i.skill_id::text)) then
        raise exception 'assessment_policy_form_coverage_invalid'; end if;
    end loop;
  end if;
  return policy;
end;
$$;

create function public.service_bind_assessment_policy(p_blueprint_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare policy jsonb; result uuid; skill_scope jsonb; existing public.assessment_policy_bindings%rowtype;
begin
  policy:=private.validate_assessment_policy_v1(p_blueprint_id);
  select jsonb_agg(distinct i.skill_id order by i.skill_id) into skill_scope
    from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    where bi.assessment_blueprint_id=p_blueprint_id;
  insert into public.assessment_policy_bindings(assessment_blueprint_id,curriculum_release_id,unit_id,
    subject_program_id,learning_model_configuration_id,academic_mastery_policy_id,policy_snapshot,skill_scope_snapshot)
  values(p_blueprint_id,(policy->>'curriculumReleaseId')::uuid,(policy->>'unitId')::uuid,
    (policy->>'subjectProgramId')::uuid,(policy->>'learningModelConfigurationId')::uuid,
    (policy->>'academicMasteryPolicyId')::uuid,policy,skill_scope)
  on conflict (assessment_blueprint_id) do nothing returning id into result;
  if result is null then
    select * into existing from public.assessment_policy_bindings where assessment_blueprint_id=p_blueprint_id;
    if existing.policy_snapshot is distinct from policy or existing.skill_scope_snapshot is distinct from skill_scope then
      raise exception 'assessment_policy_snapshot_conflict'; end if;
    result:=existing.id;
  end if;
  return result;
end;
$$;
revoke all on function public.service_bind_assessment_policy(uuid) from public, anon, authenticated;
grant execute on function public.service_bind_assessment_policy(uuid) to service_role;

-- Locks remain held through the calling transaction's insert/commit. Never expose
-- this private helper as a separate preflight authorization RPC.
create function private.lock_student_learning_context(p_student uuid,p_auth_session uuid,
  p_enrollment uuid,p_release uuid,p_unit uuid)
returns public.institutional_class_enrollments language plpgsql set search_path='' set timezone='UTC' as $$
declare e public.institutional_class_enrollments%rowtype; ctx record; v_now timestamptz;
  teacher_member uuid; teacher_person uuid;
begin
  select * into e from public.institutional_class_enrollments
    where id=p_enrollment and student_id=p_student;
  if not found then raise exception 'learning_context_unavailable'; end if;
  select tm.id,tm.person_id into teacher_member,teacher_person from public.teacher_assignments a
    join public.institutional_memberships tm on tm.id=a.teacher_membership_id
    where a.id=e.teacher_assignment_id;
  if not found then raise exception 'learning_context_unavailable'; end if;
  -- Match existing profile/membership termination order. Shared offboarding locks
  -- let students start concurrently while the existing teacher cutover is exclusive.
  perform 1 from public.profiles where id in (p_student,teacher_person) order by id for share;
  perform pg_advisory_xact_lock_shared(hashtextextended('teacher-offboarding:'||teacher_member::text,0));
  perform 1 from public.institutional_memberships where id in (e.student_membership_id,teacher_member) order by id for share;
  select * into e from public.institutional_class_enrollments
    where id=p_enrollment and student_id=p_student for share;
  if not found then raise exception 'learning_context_unavailable'; end if;
  -- Use a single exact join, not a convenient enrollment for the same programme.
  select e.id, sm.status sm_status,sm.valid_from sm_from,sm.valid_to sm_to,
    a.status a_status,a.valid_from a_from,a.valid_to a_to,
    tm.status tm_status,tm.valid_from tm_from,tm.valid_to tm_to,
    ta.status ta_status,ta.valid_from ta_from,ta.valid_to ta_to,
    c.is_active, y.status y_status,y.starts_on,y.ends_on,
    sp.status sp_status,sp.effective_from sp_from,sp.effective_to sp_to,
    r.status r_status,r.effective_from r_from,r.effective_to r_to,
    s.status s_status, p.account_status p_status,t.account_status t_status,
    au.deleted_at,au.banned_until,aus.not_after
  into ctx from public.institutional_memberships sm
  join public.teacher_assignments a on a.id=e.teacher_assignment_id
    and a.school_id=e.school_id and a.academic_year_id=e.academic_year_id
    and a.class_id=e.class_id and a.subject_program_id=e.subject_program_id
  join public.institutional_memberships tm on tm.id=a.teacher_membership_id
    and tm.school_id=e.school_id and tm.role='teacher'
  join public.classes c on c.id=e.class_id and c.school_id=e.school_id and c.academic_year_id=e.academic_year_id
  join public.academic_years y on y.id=e.academic_year_id and y.school_id=e.school_id
  join public.subject_programs sp on sp.id=e.subject_program_id and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
  join public.subjects s on s.id=sp.subject_id
  join public.units u on u.id=p_unit and u.subject_program_id=sp.id
  join public.curriculum_releases r on r.id=p_release and r.subject_program_id=sp.id
  join public.curriculum_release_units ru on ru.curriculum_release_id=r.id and ru.unit_id=u.id
  join public.teacher_subject_authorizations ta on ta.school_id=e.school_id
    and ta.teacher_membership_id=tm.id and ta.subject_id=sp.subject_id and ta.status='active'
  join public.profiles p on p.id=e.student_id and p.role='student'
  join public.profiles t on t.id=tm.person_id and t.role='teacher'
  join auth.users au on au.id=p.id
  join auth.sessions aus on aus.user_id=p.id and aus.id=p_auth_session
  where sm.id=e.student_membership_id and sm.person_id=e.student_id
    and sm.school_id=e.school_id and sm.role='student'
  for share of sm,a,tm,c,y,sp,s,u,r,ru,ta,p,t,au,aus;
  if not found then raise exception 'learning_context_unavailable'; end if;
  -- Reject ambiguous authorizations rather than selecting an arbitrary match.
  if (select count(*) from public.teacher_subject_authorizations ta join public.teacher_assignments a
    on a.id=e.teacher_assignment_id where ta.school_id=e.school_id
    and ta.teacher_membership_id=a.teacher_membership_id and ta.subject_id=(select subject_id from public.subject_programs where id=e.subject_program_id)
    and ta.status='active')<>1 then raise exception 'learning_context_unavailable'; end if;
  -- Re-read time after any waits; transaction-start now() can be stale.
  v_now:=clock_timestamp();
  if e.status<>'active' or e.valid_from>v_now or (e.valid_to is not null and e.valid_to<=v_now)
    or ctx.sm_status<>'active' or ctx.sm_from>v_now or (ctx.sm_to is not null and ctx.sm_to<=v_now)
    or ctx.a_status<>'active' or ctx.a_from>v_now or (ctx.a_to is not null and ctx.a_to<=v_now)
    or ctx.tm_status<>'active' or ctx.tm_from>v_now or (ctx.tm_to is not null and ctx.tm_to<=v_now)
    or ctx.ta_status<>'active' or ctx.ta_from>v_now or (ctx.ta_to is not null and ctx.ta_to<=v_now)
    or not ctx.is_active or ctx.y_status<>'active' or v_now::date not between ctx.starts_on and ctx.ends_on
    or ctx.sp_status<>'published' or (ctx.sp_from is not null and ctx.sp_from>v_now::date) or (ctx.sp_to is not null and ctx.sp_to<v_now::date)
    or ctx.r_status not in ('pilot','production') or (ctx.r_from is not null and ctx.r_from>v_now::date) or (ctx.r_to is not null and ctx.r_to<v_now::date)
    or ctx.s_status<>'published' or ctx.p_status<>'active' or ctx.t_status<>'active'
    or ctx.deleted_at is not null or (ctx.banned_until is not null and ctx.banned_until>v_now)
    or (ctx.not_after is not null and ctx.not_after<=v_now)
  then raise exception 'learning_context_unavailable'; end if;
  return e;
end;
$$;

alter table public.learning_sessions
  add column assessment_policy_binding_id uuid references public.assessment_policy_bindings(id),
  add column governed_unit_id uuid references public.units(id),
  add column source_auth_session_id uuid;
create index learning_sessions_policy_binding_idx on public.learning_sessions(assessment_policy_binding_id)
  where assessment_policy_binding_id is not null;
create index learning_sessions_governed_unit_idx on public.learning_sessions(governed_unit_id)
  where governed_unit_id is not null;
create index learning_sessions_scoped_resume_idx on public.learning_sessions
  (student_id,institutional_class_enrollment_id,curriculum_release_id,unit_code,status,started_at);

-- Keep the legacy constraint for legacy rows. Governed chapters use immutable
-- programme/unit identities, so two subjects may reuse a display chapter code.
-- Lifetime means across releases and years, not one new baseline per release.
drop index public.learning_sessions_one_completed_diagnostic_idx;
drop index public.learning_sessions_one_active_diagnostic_idx;
create unique index learning_sessions_one_completed_diagnostic_idx
  on public.learning_sessions(student_id,unit_code)
  where mode='diagnostic' and status='completed' and assessment_policy_binding_id is null;
create unique index learning_sessions_one_active_diagnostic_idx
  on public.learning_sessions(student_id,unit_code)
  where mode='diagnostic' and status='active' and assessment_policy_binding_id is null;
create unique index learning_sessions_governed_completed_diagnostic_idx
  on public.learning_sessions(student_id,subject_program_id,governed_unit_id)
  where mode='diagnostic' and status='completed' and assessment_policy_binding_id is not null;
create unique index learning_sessions_governed_active_diagnostic_idx
  on public.learning_sessions(student_id,subject_program_id,governed_unit_id)
  where mode='diagnostic' and status='active' and assessment_policy_binding_id is not null;

create or replace function public.guard_initial_diagnostic()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and old.mode='diagnostic' then
    if (new.student_id,new.unit_code,new.mode) is distinct from
       (old.student_id,old.unit_code,old.mode) then raise exception 'diagnostic_identity_immutable'; end if;
    if old.status='completed' and
       (new.status,new.answered_count,new.correct_count,new.completed_at,new.metadata) is distinct from
       (old.status,old.answered_count,old.correct_count,old.completed_at,old.metadata)
    then raise exception 'diagnostic_baseline_immutable'; end if;
  end if;
  if new.mode='diagnostic' and new.status in ('active','completed') then
    if new.assessment_policy_binding_id is null then
      perform pg_advisory_xact_lock(hashtextextended('initial-diagnostic:'||new.student_id::text||':'||new.unit_code,0));
      if exists (select 1 from public.learning_sessions s where s.student_id=new.student_id
        and s.unit_code=new.unit_code and s.assessment_policy_binding_id is null
        and s.mode='diagnostic' and s.status='completed' and s.id<>new.id)
      then raise exception 'diagnostic_already_completed'; end if;
    else
      perform pg_advisory_xact_lock(hashtextextended('governed-diagnostic:'||new.student_id::text||':'||new.subject_program_id::text||':'||new.governed_unit_id::text,0));
      if exists (select 1 from public.learning_sessions s where s.student_id=new.student_id
        and s.subject_program_id=new.subject_program_id and s.governed_unit_id=new.governed_unit_id
        and s.assessment_policy_binding_id is not null and s.mode='diagnostic'
        and s.status='completed' and s.id<>new.id)
      then raise exception 'diagnostic_already_completed'; end if;
    end if;
  end if;
  return new;
end;
$$;

create function private.guard_governed_learning_session()
returns trigger language plpgsql set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; e public.institutional_class_enrollments%rowtype;
  policy jsonb; runtime public.learning_model_runtime_bindings%rowtype; code text;
begin
  if tg_op='UPDATE' then
    if (new.assessment_policy_binding_id,new.governed_unit_id,new.source_auth_session_id)
      is distinct from (old.assessment_policy_binding_id,old.governed_unit_id,old.source_auth_session_id)
      or (old.assessment_policy_binding_id is not null and
        (new.student_id,new.planned_item_count,new.metadata->'assessmentPolicyFingerprint',new.metadata->'assessmentFormId')
          is distinct from (old.student_id,old.planned_item_count,old.metadata->'assessmentPolicyFingerprint',old.metadata->'assessmentFormId'))
    then raise exception 'governed_session_identity_immutable'; end if;
    return new;
  end if;
  if new.assessment_policy_binding_id is null then
    if new.governed_unit_id is not null or new.source_auth_session_id is not null then raise exception 'governed_session_context_incomplete'; end if;
    return new;
  end if;
  select * into b from public.assessment_policy_bindings where id=new.assessment_policy_binding_id;
  if not found then raise exception 'assessment_policy_unavailable'; end if;
  policy:=private.validate_assessment_policy_v1(b.assessment_blueprint_id);
  if policy<>b.policy_snapshot or b.skill_scope_snapshot is distinct from
      (select jsonb_agg(distinct i.skill_id order by i.skill_id) from public.assessment_blueprint_items bi
       join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=b.assessment_blueprint_id)
    or new.curriculum_release_id is distinct from b.curriculum_release_id
    or new.assessment_blueprint_id is distinct from b.assessment_blueprint_id
    or new.governed_unit_id is distinct from b.unit_id
    or new.mode is distinct from policy->>'mode'
    or new.planned_item_count<>(policy->>'plannedQuestionCount')::integer
    or new.school_id is not null or new.academic_year_id is not null or new.class_id is not null
    or new.teacher_assignment_id is not null or new.subject_program_id is not null or new.academic_context_status is not null
  then raise exception 'governed_session_context_invalid'; end if;
  e:=private.lock_student_learning_context(new.student_id,new.source_auth_session_id,
    new.institutional_class_enrollment_id,b.curriculum_release_id,b.unit_id);
  select unit_code_snapshot into code from public.curriculum_release_units where curriculum_release_id=b.curriculum_release_id and unit_id=b.unit_id;
  if new.unit_code is distinct from code then raise exception 'governed_session_context_invalid'; end if;
  if new.target_skill_id is not null and not (b.skill_scope_snapshot ? new.target_skill_id::text) then
    raise exception 'assessment_policy_skill_scope_invalid'; end if;
  select * into runtime from public.learning_model_runtime_bindings
    where curriculum_release_id=b.curriculum_release_id and unit_code=code and status='active' for share;
  if not found or runtime.learning_model_configuration_id<>b.learning_model_configuration_id then
    raise exception 'assessment_policy_runtime_incompatible'; end if;
  if not exists (select 1 from public.runtime_builds where id=runtime.runtime_build_id) then
    raise exception 'assessment_policy_runtime_incompatible'; end if;
  new.learning_model_configuration_id:=b.learning_model_configuration_id;
  new.model_provenance_status:='exact'; new.runtime_build_id:=runtime.runtime_build_id;new.runtime_provenance_status:='exact';
  new.academic_mastery_policy_id:=b.academic_mastery_policy_id;
  new.school_id:=e.school_id;new.academic_year_id:=e.academic_year_id;new.class_id:=e.class_id;
  new.teacher_assignment_id:=e.teacher_assignment_id;new.subject_program_id:=e.subject_program_id;new.academic_context_status:='exact';
  if policy->'baselineRequired'='true'::jsonb and private.scoped_chapter_baseline(new.student_id,b.curriculum_release_id,b.unit_id) is null then
    raise exception 'chapter_diagnostic_required'; end if;
  new.metadata:=new.metadata || jsonb_build_object('assessmentPolicyFingerprint',b.snapshot_fingerprint);
  return new;
end;
$$;
create trigger learning_sessions_00_governed_context before insert or update on public.learning_sessions
  for each row execute function private.guard_governed_learning_session();

-- Never derive governed history from a mutable blueprint catalogue row. Legacy
-- history requires an explicit 12C compatibility mapping before new consumption.
create function private.scoped_chapter_baseline(p_student uuid,p_release uuid,p_unit uuid)
returns uuid language sql stable set search_path='' as $$
  select s.id from public.learning_sessions s
  where s.student_id=p_student and s.curriculum_release_id=p_release and s.governed_unit_id=p_unit
    and s.assessment_policy_binding_id is not null and s.mode='diagnostic' and s.status='completed'
  order by s.completed_at,s.id limit 1;
$$;

create function public.service_start_governed_session_atomic(p_student_id uuid,p_auth_session_id uuid,
  p_enrollment_id uuid,p_policy_binding_id uuid,p_form_id uuid,p_target_skill_id uuid,p_item_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; e public.institutional_class_enrollments%rowtype;
  s public.learning_sessions%rowtype; code text; v_mode text; baseline uuid; policy jsonb; entry record;
begin
  select * into b from public.assessment_policy_bindings where id=p_policy_binding_id;
  if not found then raise exception 'assessment_policy_unavailable'; end if;
  v_mode:=b.policy_snapshot->>'mode';
  -- Mastery/review attempt/cycle allocation is migrated with its consumers in 12C.
  if v_mode not in ('diagnostic','practice') then raise exception 'governed_mode_runtime_pending'; end if;
  select unit_code_snapshot into code from public.curriculum_release_units where curriculum_release_id=b.curriculum_release_id and unit_id=b.unit_id;
  -- Coordinate legacy starts during migration, then lock lifetime governed identity.
  perform pg_advisory_xact_lock(hashtextextended('initial-diagnostic:'||p_student_id::text||':'||code,0));
  perform pg_advisory_xact_lock(hashtextextended('governed-diagnostic:'||p_student_id::text||':'||b.subject_program_id::text||':'||b.unit_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('governed-session:'||p_student_id::text||':'||p_enrollment_id::text||':'||b.curriculum_release_id::text||':'||b.unit_id::text,0));
  e:=private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,b.curriculum_release_id,b.unit_id);
  -- Resume is not a policy rewrite: retain the original binding even if a new
  -- blueprint is now selected. Only current authorization is revalidated here.
  select * into s from public.learning_sessions where student_id=p_student_id
    and institutional_class_enrollment_id=p_enrollment_id and curriculum_release_id=b.curriculum_release_id
    and ((assessment_policy_binding_id is not null and governed_unit_id=b.unit_id)
      or (assessment_policy_binding_id is null and unit_code=code)) and status='active'
    and (v_mode<>'diagnostic' or learning_sessions.mode not in ('practice','chapter_review'))
    order by started_at,id limit 1 for update;
  if found then return jsonb_build_object('session',to_jsonb(s),'resumed',true,'modeConflict',s.mode<>v_mode,
    'legacySession',s.assessment_policy_binding_id is null); end if;
  baseline:=private.scoped_chapter_baseline(p_student_id,b.curriculum_release_id,b.unit_id);
  if v_mode='diagnostic' then
    if baseline is not null then return jsonb_build_object('diagnosticCompleted',true,'baselineSessionId',baseline); end if;
    if exists (select 1 from public.learning_sessions prior where prior.student_id=p_student_id
      and prior.mode='diagnostic' and prior.status in ('active','completed')
      and ((prior.assessment_policy_binding_id is not null and prior.subject_program_id=b.subject_program_id and prior.governed_unit_id=b.unit_id)
        or (prior.assessment_policy_binding_id is null and prior.unit_code=code and (
          prior.curriculum_release_id is null or exists (
            select 1 from public.curriculum_releases r where r.id=prior.curriculum_release_id and r.subject_program_id=b.subject_program_id))))) then
      raise exception 'diagnostic_baseline_requires_governed_mapping'; end if;
  elsif baseline is null then raise exception 'chapter_diagnostic_required'; end if;
  policy:=private.validate_assessment_policy_v1(b.assessment_blueprint_id);
  if p_item_ids is null or cardinality(p_item_ids)<>(policy->>'plannedQuestionCount')::integer
    or (select count(distinct i) from unnest(p_item_ids) i)<>cardinality(p_item_ids)
    or array_position(p_item_ids,null) is not null then raise exception 'governed_session_items_invalid'; end if;
  -- Lock selected memberships/content before validating, preventing concurrent
  -- retirement or pool removal from winning between the check and the insert.
  perform 1 from public.items where id=any(p_item_ids) order by id for share;
  perform 1 from public.assessment_pool_items where pool_id=(select assessment_pool_id from public.assessment_blueprints where id=b.assessment_blueprint_id)
    and item_id=any(p_item_ids) order by item_id for share;
  if exists (select 1 from unnest(p_item_ids) picked(id) where not exists (
    select 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    join public.assessment_pool_items pi on pi.item_id=i.id
    join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id and bp.assessment_pool_id=pi.pool_id
    where bp.id=b.assessment_blueprint_id and i.id=picked.id and i.status='published' and pi.enabled
      and i.version_no=bi.item_version_snapshot and (p_target_skill_id is null or i.skill_id=p_target_skill_id)))
  then raise exception 'governed_session_items_invalid'; end if;
  if v_mode='diagnostic' then
    if p_target_skill_id is not null then raise exception 'governed_session_items_invalid'; end if;
    perform 1 from public.assessment_forms where id=p_form_id for share;
    perform 1 from public.assessment_form_items where form_id=p_form_id order by item_id for share;
    if not exists (select 1 from public.assessment_forms f join public.assessment_blueprints bp on bp.assessment_pool_id=f.pool_id
      where f.id=p_form_id and f.status='active' and bp.id=b.assessment_blueprint_id)
      or (select count(*) from public.assessment_form_items where form_id=p_form_id)<>cardinality(p_item_ids)
      or exists (select 1 from public.assessment_form_items where form_id=p_form_id and not (item_id=any(p_item_ids)))
    then raise exception 'governed_diagnostic_form_invalid'; end if;
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.items where id=any(p_item_ids) and skill_id=entry.key::uuid)<>entry.value::integer then
        raise exception 'governed_diagnostic_coverage_invalid'; end if;
    end loop;
    if exists (select 1 from public.items where id=any(p_item_ids) and not (policy->'questionCountBySkill' ? skill_id::text)) then
      raise exception 'governed_diagnostic_coverage_invalid'; end if;
  elsif p_form_id is not null then raise exception 'governed_session_items_invalid'; end if;
  insert into public.learning_sessions(student_id,unit_code,mode,planned_item_count,curriculum_release_id,
    assessment_blueprint_id,institutional_class_enrollment_id,assessment_policy_binding_id,governed_unit_id,
    source_auth_session_id,target_skill_id,metadata)
  values(p_student_id,code,v_mode,cardinality(p_item_ids),b.curriculum_release_id,b.assessment_blueprint_id,
    p_enrollment_id,b.id,b.unit_id,p_auth_session_id,p_target_skill_id,jsonb_build_object('assessmentFormId',p_form_id)) returning * into s;
  insert into public.learning_session_items(session_id,ordinal,item_id,skill_id,selection_reason)
    select s.id,x.ordinal::integer,i.id,i.skill_id,'governed-policy-assignment-v1'
    from unnest(p_item_ids) with ordinality x(id,ordinal) join public.items i on i.id=x.id;
  return jsonb_build_object('session',to_jsonb(s),'resumed',false);
end;
$$;
revoke all on function public.service_start_governed_session_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid[])
  from public, anon, authenticated;
grant execute on function public.service_start_governed_session_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid[]) to service_role;

-- Private helpers are callable only by the database-owned service transactions.
revoke all on function private.reject_assessment_policy_binding_mutation(),private.validate_assessment_policy_v1(uuid),
  private.lock_student_learning_context(uuid,uuid,uuid,uuid,uuid),private.guard_governed_learning_session(),
  private.scoped_chapter_baseline(uuid,uuid,uuid) from public, anon, authenticated, service_role;

-- Preserve the legacy branch verbatim; the new trigger stamps governed sessions.
CREATE OR REPLACE FUNCTION public.stamp_learning_session_academic_context_14c()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_ids uuid[]; v_active_context_count integer; v_context record;
begin
  if new.assessment_policy_binding_id is not null then return new; end if;
  if new.academic_context_status is not null
     or new.institutional_class_enrollment_id is not null or new.school_id is not null
     or new.academic_year_id is not null or new.class_id is not null
     or new.teacher_assignment_id is not null or new.subject_program_id is not null then
    raise exception 'academic context is server-derived' using errcode='P0001';
  end if;
  select array_agg(e.id order by e.valid_from desc,e.id)
           filter (where r.id is not null),
         count(*)
    into v_ids,v_active_context_count
  from public.institutional_class_enrollments e
  join public.classes c on c.id=e.class_id and c.school_id=e.school_id
    and c.academic_year_id=e.academic_year_id
  join public.academic_years y on y.id=e.academic_year_id and y.school_id=e.school_id
  join public.teacher_assignments a on a.id=e.teacher_assignment_id
    and a.school_id=e.school_id and a.class_id=e.class_id
    and a.academic_year_id=e.academic_year_id and a.subject_program_id=e.subject_program_id
  left join public.curriculum_releases r on r.id=new.curriculum_release_id
    and r.subject_program_id=e.subject_program_id
  where e.student_id=new.student_id and e.status='active' and e.valid_from<=now()
    and (e.valid_to is null or e.valid_to>now())
    and c.is_active and y.status='active'
    and current_date between y.starts_on and y.ends_on
    and a.status='active' and a.valid_from<=now()
    and (a.valid_to is null or a.valid_to>now());
  if coalesce(cardinality(v_ids),0)>1 then
    raise exception 'ambiguous student academic context' using errcode='P0001';
  end if;
  if coalesce(cardinality(v_ids),0)=1 then
    select * into v_context from public.institutional_class_enrollments where id=v_ids[1];
    new.institutional_class_enrollment_id:=v_context.id;
    new.school_id:=v_context.school_id;
    new.academic_year_id:=v_context.academic_year_id;
    new.class_id:=v_context.class_id;
    new.teacher_assignment_id:=v_context.teacher_assignment_id;
    new.subject_program_id:=v_context.subject_program_id;
    new.academic_context_status:='exact';
  elsif v_active_context_count>0 then
    raise exception 'institutional academic context unavailable' using errcode='P0001';
  else
    new.academic_context_status:='unbound_noninstitutional';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.stamp_learning_session_model_configuration()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  active_model_id uuid;
  active_runtime_id uuid;
  configured_release_id uuid;
begin
  if new.assessment_policy_binding_id is not null then return new; end if;
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
$function$

;
