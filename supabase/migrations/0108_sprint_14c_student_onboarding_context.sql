-- Sprint 14C: school-admin student onboarding, immutable enrollment identity,
-- and fail-closed academic context for new learning sessions. Historical
-- learning evidence is deliberately marked unbound and is never reassigned.

alter table public.institutional_invitations
  add column subject_program_id uuid references public.subject_programs(id) on delete restrict;

alter table public.institutional_class_enrollments
  add column teacher_assignment_id uuid references public.teacher_assignments(id) on delete restrict,
  add column subject_program_id uuid references public.subject_programs(id) on delete restrict;

-- Preserve any pre-14C invitation/enrollment rows while making their exact
-- class programme explicit. The production system had no class enrollments at
-- this boundary, but the migration is deterministic if a pending invite exists.
update public.institutional_invitations i
set teacher_assignment_id = coalesce(i.teacher_assignment_id, (
      select a.id from public.teacher_assignments a
      where a.school_id=i.school_id and a.academic_year_id=i.academic_year_id
        and a.class_id=i.class_id
      order by (a.status='active') desc, a.valid_from desc, a.id
      limit 1
    ))
where i.class_id is not null;

update public.institutional_invitations i
set subject_program_id = a.subject_program_id
from public.teacher_assignments a
where i.class_id is not null and a.id=i.teacher_assignment_id;

update public.institutional_class_enrollments e
set teacher_assignment_id=i.teacher_assignment_id,
    subject_program_id=i.subject_program_id
from public.institutional_invitations i
where i.id=e.invitation_id;

alter table public.institutional_invitations
  add constraint institutional_invitation_programme_scope_14c check (
    (class_id is null and teacher_assignment_id is null and subject_program_id is null)
    or
    (class_id is not null and teacher_assignment_id is not null and subject_program_id is not null)
  );

alter table public.institutional_class_enrollments
  alter column teacher_assignment_id set not null,
  alter column subject_program_id set not null,
  add constraint institutional_enrollment_exact_identity_14c unique
    (id,student_id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id);

create index institutional_enrollment_programme_student_14c_idx
  on public.institutional_class_enrollments
    (student_id,subject_program_id,status,valid_from desc);
create index institutional_invitation_programme_14c_idx
  on public.institutional_invitations(subject_program_id)
  where subject_program_id is not null;

create table public.student_account_acceptances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  invitation_id uuid not null unique references public.institutional_invitations(id) on delete restrict,
  acceptance_version text not null check (acceptance_version='student-school-access-v1'),
  display_name_at_acceptance text not null
    check (length(btrim(display_name_at_acceptance)) between 2 and 80),
  accepted_at timestamptz not null default now()
);

alter table public.student_account_acceptances enable row level security;
revoke all on public.student_account_acceptances from public,anon,authenticated,service_role;
grant select,insert on public.student_account_acceptances to service_role;
revoke update,delete,truncate on public.student_account_acceptances from service_role;

create function public.reject_student_account_acceptance_mutation_14c()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'student account acceptances are immutable';
end;
$$;
create trigger student_account_acceptances_immutable_14c
before update or delete on public.student_account_acceptances
for each row execute function public.reject_student_account_acceptance_mutation_14c();
revoke all on function public.reject_student_account_acceptance_mutation_14c()
  from public,anon,authenticated;

create or replace function public.service_authorize_student_invite_14c(
  p_actor uuid,p_school uuid,p_class uuid
) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select private.active_school_admin_14b(p_actor,p_school)
    and exists(
      select 1
      from public.classes c
      join public.academic_years y
        on y.id=c.academic_year_id and y.school_id=c.school_id
      join public.teacher_assignments a
        on a.class_id=c.id and a.school_id=c.school_id
       and a.academic_year_id=c.academic_year_id
      join public.subject_programs sp on sp.id=a.subject_program_id
      join public.institutional_memberships tm
        on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
      where c.id=p_class and c.school_id=p_school and c.is_active
        and y.status='active' and current_date between y.starts_on and y.ends_on
        and a.status='active' and a.valid_from<=now()
        and (a.valid_to is null or a.valid_to>now())
        and tm.role='teacher' and tm.status='active' and tm.valid_from<=now()
        and (tm.valid_to is null or tm.valid_to>now())
        and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
        and sp.status::text='published'
    );
$$;

create or replace function public.service_list_student_onboarding_classes_14c(
  p_actor uuid,p_school uuid
) returns table(
  class_id uuid,class_name text,academic_year_id uuid,academic_year_label text,
  teacher_assignment_id uuid,subject_program_id uuid,subject_name text,grade_number integer
) language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'student_onboarding_unavailable' using errcode='P0001';
  end if;
  return query
  select c.id,c.name,y.id,y.label,a.id,sp.id,
         coalesce(s.name_hy,s.name_en,s.code),g.grade_number
  from public.classes c
  join public.academic_years y
    on y.id=c.academic_year_id and y.school_id=c.school_id
  join public.teacher_assignments a
    on a.class_id=c.id and a.school_id=c.school_id
   and a.academic_year_id=c.academic_year_id
  join public.subject_programs sp on sp.id=a.subject_program_id
  join public.subjects s on s.id=sp.subject_id
  join public.grades g on g.id=sp.grade_id
  join public.institutional_memberships tm
    on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
  where c.school_id=p_school and c.is_active
    and y.status='active' and current_date between y.starts_on and y.ends_on
    and a.status='active' and a.valid_from<=now()
    and (a.valid_to is null or a.valid_to>now())
    and tm.role='teacher' and tm.status='active' and tm.valid_from<=now()
    and (tm.valid_to is null or tm.valid_to>now())
    and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
    and sp.status::text='published' and s.status::text='published'
  order by g.grade_number,s.name_hy,c.name,a.valid_from desc;
end;
$$;

create or replace function public.service_issue_institutional_invitation_14b(
  p_actor uuid, p_recipient uuid, p_school uuid, p_role text,
  p_class uuid, p_assignment uuid, p_token_digest text, p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_class record; v_recipient record; v_year uuid;
  v_assignment_id uuid; v_assignment_membership_id uuid; v_subject_program_id uuid;
  v_admin boolean; v_teacher boolean; v_id uuid;
begin
  if p_actor is null or p_recipient is null or p_school is null or
     p_token_digest !~ '^[0-9a-f]{64}$' or p_role not in ('student','teacher') or
     p_expires_at<=now() or p_expires_at>now()+interval '7 days' then
    raise exception 'invitation_invalid' using errcode='P0001';
  end if;
  select role,account_status into v_recipient from public.profiles where id=p_recipient;
  if not found or v_recipient.role::text is distinct from p_role
     or v_recipient.account_status is distinct from 'active'
     or not exists(select 1 from public.profiles where id=p_actor and account_status='active') then
    raise exception 'invitation_invalid' using errcode='P0001';
  end if;
  select exists(select 1 from public.institutional_memberships m
    where m.person_id=p_actor and m.school_id=p_school and m.role='school_admin'
      and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())) into v_admin;

  if p_class is not null then
    if p_role<>'student' then raise exception 'invitation_invalid' using errcode='P0001'; end if;
    select c.id,c.academic_year_id,c.subject_id,c.grade_id into v_class
    from public.classes c join public.academic_years y
      on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.id=p_class and c.school_id=p_school and c.is_active
      and y.status='active' and current_date between y.starts_on and y.ends_on;
    if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
    v_year:=v_class.academic_year_id;
    select a.id,a.teacher_membership_id,a.subject_program_id
      into v_assignment_id,v_assignment_membership_id,v_subject_program_id
    from public.teacher_assignments a
    join public.subject_programs sp on sp.id=a.subject_program_id
    join public.institutional_memberships tm
      on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
    where a.school_id=p_school and a.academic_year_id=v_year and a.class_id=p_class
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and tm.role='teacher' and tm.status='active' and tm.valid_from<=now()
      and (tm.valid_to is null or tm.valid_to>now())
      and sp.subject_id=v_class.subject_id and sp.grade_id=v_class.grade_id
      and sp.status::text='published'
    order by a.valid_from desc,a.id limit 1;
    if not found or (p_assignment is not null and p_assignment<>v_assignment_id) then
      raise exception 'invitation_invalid' using errcode='P0001';
    end if;
    select exists(select 1 from public.institutional_memberships m
      where m.id=v_assignment_membership_id and m.person_id=p_actor
        and m.school_id=p_school and m.role='teacher' and m.status='active'
        and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) into v_teacher;
  elsif p_assignment is not null then
    raise exception 'invitation_invalid' using errcode='P0001';
  else
    v_teacher:=false;
  end if;
  if not v_admin and not v_teacher then
    raise exception 'invitation_not_authorized' using errcode='P0001';
  end if;
  insert into public.institutional_invitations
    (school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,
     recipient_user_id,invited_role,token_digest,issued_by,expires_at)
  values(p_school,v_year,p_class,v_assignment_id,v_subject_program_id,
     p_recipient,p_role,p_token_digest,p_actor,p_expires_at)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.service_redeem_institutional_invitation_14b(
  p_recipient uuid,p_token_digest text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_inv record; v_member uuid; v_enrollment uuid;
  v_issuer_admin boolean; v_issuer_teacher boolean;
begin
  select * into v_inv from public.institutional_invitations
   where token_digest=p_token_digest for update;
  if not found or v_inv.recipient_user_id<>p_recipient
     or v_inv.expires_at<=now() or v_inv.used_at is not null or v_inv.revoked_at is not null
     or not exists(select 1 from public.profiles where id=p_recipient
       and account_status='active' and role::text=v_inv.invited_role) then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  select exists(select 1 from public.institutional_memberships m
    where m.person_id=v_inv.issued_by and m.school_id=v_inv.school_id
      and m.role='school_admin' and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())) into v_issuer_admin;
  select exists(select 1 from public.teacher_assignments a
    join public.institutional_memberships m
      on m.id=a.teacher_membership_id and m.school_id=a.school_id
    where a.id=v_inv.teacher_assignment_id and a.school_id=v_inv.school_id
      and a.class_id=v_inv.class_id and a.academic_year_id=v_inv.academic_year_id
      and a.subject_program_id=v_inv.subject_program_id
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and m.person_id=v_inv.issued_by and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) into v_issuer_teacher;
  if (not v_issuer_admin and not v_issuer_teacher)
     or not exists(select 1 from public.profiles where id=v_inv.issued_by and account_status='active') then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  if v_inv.class_id is not null and not exists(
    select 1 from public.classes c
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    join public.teacher_assignments a on a.id=v_inv.teacher_assignment_id
      and a.school_id=c.school_id and a.class_id=c.id
      and a.academic_year_id=c.academic_year_id
    join public.subject_programs sp on sp.id=v_inv.subject_program_id
      and sp.id=a.subject_program_id
    where c.id=v_inv.class_id and c.school_id=v_inv.school_id and c.is_active
      and y.id=v_inv.academic_year_id and y.status='active'
      and current_date between y.starts_on and y.ends_on
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
  ) then raise exception 'invitation_unavailable' using errcode='P0001'; end if;
  select id into v_member from public.institutional_memberships
    where school_id=v_inv.school_id and person_id=p_recipient and role=v_inv.invited_role
      and status='active' and valid_from<=now() and (valid_to is null or valid_to>now())
    order by valid_from desc limit 1;
  if v_member is null then
    insert into public.institutional_memberships
      (school_id,person_id,role,valid_from,status,created_by)
    values(v_inv.school_id,p_recipient,v_inv.invited_role,now(),'active',v_inv.issued_by)
    returning id into v_member;
  end if;
  if v_inv.class_id is not null then
    if exists(select 1 from public.institutional_class_enrollments
      where class_id=v_inv.class_id and student_id=p_recipient and status='active') then
      raise exception 'already_enrolled' using errcode='P0001';
    end if;
    insert into public.institutional_class_enrollments
      (school_id,academic_year_id,class_id,student_membership_id,student_id,
       invitation_id,teacher_assignment_id,subject_program_id,created_by)
    values(v_inv.school_id,v_inv.academic_year_id,v_inv.class_id,v_member,p_recipient,
       v_inv.id,v_inv.teacher_assignment_id,v_inv.subject_program_id,v_inv.issued_by)
    returning id into v_enrollment;
  end if;
  update public.institutional_invitations set used_at=now() where id=v_inv.id;
  return jsonb_build_object('schoolId',v_inv.school_id,'membershipId',v_member,
    'classEnrollmentId',v_enrollment,'subjectProgramId',v_inv.subject_program_id);
end;
$$;

create or replace function public.service_accept_student_invitation_14c(
  p_recipient uuid,p_token_digest text,p_display_name text,p_acceptance_version text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_name text:=regexp_replace(btrim(coalesce(p_display_name,'')),'\s+',' ','g');
  v_invitation uuid; v_result jsonb;
begin
  if p_recipient is null or p_token_digest !~ '^[0-9a-f]{64}$'
     or length(v_name) not between 2 and 80
     or p_acceptance_version<>'student-school-access-v1' then
    raise exception 'student_invitation_unavailable' using errcode='P0001';
  end if;
  select id into v_invitation from public.institutional_invitations
    where token_digest=p_token_digest and recipient_user_id=p_recipient
      and invited_role='student' for update;
  if v_invitation is null then
    raise exception 'student_invitation_unavailable' using errcode='P0001';
  end if;
  v_result:=public.service_redeem_institutional_invitation_14b(p_recipient,p_token_digest);
  update public.profiles set display_name=v_name,updated_at=now()
    where id=p_recipient and role='student' and account_status='active';
  if not found then raise exception 'student_invitation_unavailable' using errcode='P0001'; end if;
  insert into public.student_account_acceptances
    (student_id,invitation_id,acceptance_version,display_name_at_acceptance)
  values(p_recipient,v_invitation,p_acceptance_version,v_name);
  return v_result||jsonb_build_object('displayName',v_name);
end;
$$;

revoke all on function public.service_authorize_student_invite_14c(uuid,uuid,uuid),
  public.service_list_student_onboarding_classes_14c(uuid,uuid),
  public.service_accept_student_invitation_14c(uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.service_authorize_student_invite_14c(uuid,uuid,uuid),
  public.service_list_student_onboarding_classes_14c(uuid,uuid),
  public.service_accept_student_invitation_14c(uuid,text,text,text)
  to service_role;

alter table public.learning_sessions
  add column institutional_class_enrollment_id uuid,
  add column school_id uuid references public.schools(id) on delete restrict,
  add column academic_year_id uuid,
  add column class_id uuid,
  add column teacher_assignment_id uuid references public.teacher_assignments(id) on delete restrict,
  add column subject_program_id uuid references public.subject_programs(id) on delete restrict,
  add column academic_context_status text;

update public.learning_sessions set academic_context_status='unbound_legacy';

alter table public.learning_sessions
  alter column academic_context_status set not null,
  add constraint learning_session_academic_context_status_14c check (
    (academic_context_status='exact' and institutional_class_enrollment_id is not null
      and school_id is not null and academic_year_id is not null and class_id is not null
      and teacher_assignment_id is not null and subject_program_id is not null)
    or
    (academic_context_status in ('unbound_legacy','unbound_noninstitutional')
      and institutional_class_enrollment_id is null and school_id is null
      and academic_year_id is null and class_id is null
      and teacher_assignment_id is null and subject_program_id is null)
  ),
  add constraint learning_session_year_school_14c foreign key (academic_year_id,school_id)
    references public.academic_years(id,school_id) on delete restrict,
  add constraint learning_session_class_scope_14c foreign key (class_id,school_id,academic_year_id)
    references public.classes(id,school_id,academic_year_id) on delete restrict,
  add constraint learning_session_enrollment_identity_14c foreign key
    (institutional_class_enrollment_id,student_id,school_id,academic_year_id,class_id,
     teacher_assignment_id,subject_program_id)
    references public.institutional_class_enrollments
      (id,student_id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id)
    on delete restrict;

create index learning_sessions_school_class_started_14c_idx
  on public.learning_sessions(school_id,class_id,started_at desc)
  where academic_context_status='exact';
create index learning_sessions_enrollment_14c_idx
  on public.learning_sessions(institutional_class_enrollment_id)
  where institutional_class_enrollment_id is not null;

create or replace function public.stamp_learning_session_academic_context_14c()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_ids uuid[]; v_active_context_count integer; v_context record;
begin
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
$$;

create trigger learning_sessions_academic_context_14c
before insert on public.learning_sessions
for each row execute function public.stamp_learning_session_academic_context_14c();
revoke all on function public.stamp_learning_session_academic_context_14c()
  from public,anon,authenticated;

create or replace function public.prevent_learning_session_identity_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.unit_code,new.mode,new.target_skill_id,new.curriculum_release_id,
         new.assessment_blueprint_id,new.provenance_status,
         new.learning_model_configuration_id,new.model_provenance_status,
         new.runtime_build_id,new.runtime_provenance_status,
         new.academic_mastery_policy_id,new.mastery_attempt_number,
         new.institutional_class_enrollment_id,new.school_id,new.academic_year_id,
         new.class_id,new.teacher_assignment_id,new.subject_program_id,new.academic_context_status)
     is distinct from
     row(old.unit_code,old.mode,old.target_skill_id,old.curriculum_release_id,
         old.assessment_blueprint_id,old.provenance_status,
         old.learning_model_configuration_id,old.model_provenance_status,
         old.runtime_build_id,old.runtime_provenance_status,
         old.academic_mastery_policy_id,old.mastery_attempt_number,
         old.institutional_class_enrollment_id,old.school_id,old.academic_year_id,
         old.class_id,old.teacher_assignment_id,old.subject_program_id,old.academic_context_status) then
    raise exception 'learning session identity and provenance are immutable after insert';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_sessions_identity_immutable on public.learning_sessions;
create trigger learning_sessions_identity_immutable
before update of unit_code,mode,target_skill_id,curriculum_release_id,
  assessment_blueprint_id,provenance_status,learning_model_configuration_id,
  model_provenance_status,runtime_build_id,runtime_provenance_status,
  academic_mastery_policy_id,mastery_attempt_number,
  institutional_class_enrollment_id,school_id,academic_year_id,class_id,
  teacher_assignment_id,subject_program_id,academic_context_status
on public.learning_sessions
for each row execute function public.prevent_learning_session_identity_mutation();

comment on column public.learning_sessions.academic_context_status is
  'Exact for server-derived institutional evidence; historical rows remain unbound_legacy and are never inferred.';
