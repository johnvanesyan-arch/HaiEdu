-- A bounded directory projection; no learner evidence or frozen question bank.
-- Service-only, SECURITY INVOKER. The Edge handler supplies the authenticated
-- actor after live-session validation and rechecks the session before return.
create or replace function public.service_teacher_class_directory(
  p_actor uuid, p_archive boolean default false, p_offset integer default 0,
  p_search text default ''
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_actor is null or p_offset is null or p_offset < 0 or p_offset > 100000
     or p_archive is null or p_search is null or length(p_search) > 120 then
    raise exception 'invalid_directory_request' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=p_actor and role='teacher' and account_status='active') then
    raise exception 'teacher_role_required' using errcode='42501';
  end if;
  with members as materialized (
    select m.* from public.institutional_memberships m
    where m.person_id=p_actor and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
  ), allowed as materialized (
    select m.id membership_id,m.school_id,p.id programme_id,p.subject_id,p.grade_id
    from members m join public.subject_programs p on p.status='published'
    where (select count(*) from public.teacher_subject_authorizations g
      where g.teacher_membership_id=m.id and g.school_id=m.school_id and g.subject_id=p.subject_id
      and g.status='active' and g.valid_from<=now() and (g.valid_to is null or g.valid_to>now()))=1
  ), directory as materialized (
    select a.id assignment_id,c.id,c.name,a.school_id,a.academic_year_id,a.subject_program_id,
      y.label academic_year,s.name school_name,sub.name_hy subject_name,gr.grade_number,
      (c.is_active and a.status='active' and (a.valid_to is null or a.valid_to>now())
        and y.status='active' and (now() at time zone 'UTC')::date between y.starts_on and y.ends_on) is_active
    from allowed al join public.teacher_assignments a on a.teacher_membership_id=al.membership_id
      and a.school_id=al.school_id and a.subject_program_id=al.programme_id
    join public.classes c on c.id=a.class_id and c.school_id=a.school_id
      and c.academic_year_id=a.academic_year_id and c.subject_id=al.subject_id and c.grade_id=al.grade_id
    join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id
    join public.schools s on s.id=a.school_id
    join public.subjects sub on sub.id=al.subject_id
    join public.grades gr on gr.id=al.grade_id
    where a.valid_from<=now() and (a.status='ended' or (a.status='active' and (a.valid_to is null or a.valid_to>now())))
      and y.status in ('active','closed','archived') and a.valid_from::date<=y.ends_on
      and (a.valid_to is null or a.valid_to::date>=y.starts_on)
    union all
    select null::uuid,c.id,c.name,null::uuid,null::uuid,null::uuid,c.academic_year,
      ''::text,sub.name_hy,gr.grade_number,c.is_active
    from public.classes c left join public.subjects sub on sub.id=c.subject_id left join public.grades gr on gr.id=c.grade_id
    where c.teacher_id=p_actor and c.school_id is null
      and not exists(select 1 from public.institutional_memberships m where m.person_id=p_actor and m.role='teacher')
  ), matching as materialized (
    select * from directory where is_active=not p_archive
      and (p_search='' or position(lower(p_search) in lower(concat_ws(' ',name,academic_year,school_name,subject_name)))>0)
  ), page as (
    select * from matching order by name,id,assignment_id limit 24 offset p_offset
  )
  select jsonb_build_object(
    'classes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'name',d.name,'assignmentId',d.assignment_id,'isActive',d.is_active,
      'schoolId',d.school_id,'academicYearId',d.academic_year_id,'subjectProgramId',d.subject_program_id,
      'academicYear',d.academic_year,'schoolName',d.school_name,'subjectName',d.subject_name,'gradeNumber',d.grade_number,
      'studentCount',null,'analyticsAvailable',false,'detailLoaded',false
    ) order by d.name,d.id,d.assignment_id) from page d),'[]'::jsonb),
    'directory',jsonb_build_object('archive',p_archive,'offset',p_offset,'pageSize',24,'search',p_search,
      'matching',(select count(*) from matching),'hasMore',(select count(*) from matching)>p_offset+24,
      'activeCount',(select count(*) from directory where is_active),'archiveCount',(select count(*) from directory where not is_active)),
    'institutionalOptions',coalesce((select jsonb_agg(jsonb_build_object(
      'schoolId',al.school_id,'schoolName',s.name,'teacherMembershipId',al.membership_id,
      'academicYearId',y.id,'academicYearLabel',y.label,'subjectProgramId',al.programme_id,
      'subjectName',sub.name_hy,'gradeNumber',gr.grade_number) order by s.name,sub.name_hy,gr.grade_number)
      from allowed al join public.schools s on s.id=al.school_id
      join public.academic_years y on y.school_id=al.school_id and y.status='active'
        and (now() at time zone 'UTC')::date between y.starts_on and y.ends_on
      join public.subjects sub on sub.id=al.subject_id and sub.status='published'
      join public.grades gr on gr.id=al.grade_id),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.service_teacher_class_directory(uuid,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.service_teacher_class_directory(uuid,boolean,integer,text) to service_role;
comment on function public.service_teacher_class_directory(uuid,boolean,integer,text) is
  'Service-only teacher directory: actor-scoped authorization, 24 metadata rows per page, no learner evidence.';
