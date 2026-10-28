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
      y.label academic_year,s.name school_name,sub.name_hy subject_name,gr.grade_number,sub.code subject_code,
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
      ''::text,sub.name_hy,gr.grade_number,sub.code,c.is_active
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
      'academicYear',d.academic_year,'schoolName',d.school_name,'subjectName',d.subject_name,'subjectCode',d.subject_code,'gradeNumber',d.grade_number,
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

-- Read-only, subject-neutral teacher workspace. No learning/content writes.
-- Auth tables are not readable by service_role, so the narrowly granted private
-- reader owns session validation. The public wrapper remains SECURITY INVOKER.
create index if not exists written_work_pending_context_idx on public.written_work
 (school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id,id)
 where state='submitted';

create function private.service_teacher_workspace(p_actor uuid,p_auth uuid,p_assignment uuid default null,
 p_cursor jsonb default null,p_work uuid default null,p_recent jsonb default '[]')
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare result jsonb; cursor_time timestamptz; cursor_id uuid;
begin
 if p_actor is null or p_auth is null or jsonb_typeof(p_recent) is distinct from 'array'
 or jsonb_array_length(p_recent)>4 or exists(select 1 from jsonb_array_elements(p_recent) v where jsonb_typeof(v)<>'string')
 or (p_cursor is not null and (jsonb_typeof(p_cursor)<>'object' or not p_cursor ? 'submittedAt' or not p_cursor ? 'id'
 or (select count(*) from jsonb_object_keys(p_cursor))<>2)) then
  raise exception 'workspace_request_invalid' using errcode='22023';end if;
 perform v#>>'{}' from jsonb_array_elements(p_recent) v where (v#>>'{}')::uuid is not null;
 if p_cursor is not null then
  cursor_time:=(p_cursor->>'submittedAt')::timestamptz;cursor_id:=(p_cursor->>'id')::uuid;
  if cursor_time is null or cursor_id is null then raise exception 'workspace_request_invalid' using errcode='22023';end if;
 end if;
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  join auth.sessions ss on ss.user_id=p.id and ss.id=p_auth
  where p.id=p_actor and p.role='teacher' and p.account_status='active' and u.deleted_at is null
  and (u.banned_until is null or u.banned_until<=now()) and (ss.not_after is null or ss.not_after>now()))
 then raise exception 'workspace_context_unavailable' using errcode='42501';end if;

 with assignments as materialized (
  select a.id assignment_id,c.id class_id,a.school_id,a.academic_year_id,a.subject_program_id,
   c.name class_name,y.label academic_year,s.name school_name,sub.code subject_code,sub.name_hy subject_name,gr.grade_number
  from public.teacher_assignments a
  join public.institutional_memberships m on m.id=a.teacher_membership_id and m.person_id=p_actor
   and m.school_id=a.school_id and m.role='teacher' and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
  join public.classes c on c.id=a.class_id and c.school_id=a.school_id and c.academic_year_id=a.academic_year_id and c.is_active
  join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id and y.status='active' and current_date between y.starts_on and y.ends_on
  join public.schools s on s.id=a.school_id
  join public.subject_programs sp on sp.id=a.subject_program_id and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
   and sp.status='published' and (sp.effective_from is null or sp.effective_from<=current_date) and (sp.effective_to is null or sp.effective_to>=current_date)
  join public.subjects sub on sub.id=sp.subject_id and sub.status='published'
  join public.grades gr on gr.id=sp.grade_id
  where a.status='active' and a.valid_from<=now() and (a.valid_to is null or a.valid_to>now())
   and a.valid_from::date<=y.ends_on and (a.valid_to is null or a.valid_to::date>=y.starts_on)
   and (select count(*) from public.teacher_subject_authorizations g where g.teacher_membership_id=m.id and g.school_id=m.school_id
    and g.subject_id=sp.subject_id and g.status='active')=1
   and exists(select 1 from public.teacher_subject_authorizations g where g.teacher_membership_id=m.id and g.school_id=m.school_id
    and g.subject_id=sp.subject_id and g.status='active' and g.valid_from<=now() and (g.valid_to is null or g.valid_to>now()))
 ), works as materialized (
  select w.id,w.state,w.revision,su.submitted_at,a.*,
   w.curriculum_release_id,w.unit_id,ru.title_hy_snapshot unit_title,t.definition->>'title' task_title,
   coalesce(nullif(btrim(p.display_name),''),'Աշակերտ') student_name
  from assignments a join public.written_work w on w.class_id=a.class_id and w.school_id=a.school_id
   and w.academic_year_id=a.academic_year_id and w.subject_program_id=a.subject_program_id
  join public.curriculum_releases r on r.id=w.curriculum_release_id and r.subject_program_id=a.subject_program_id
   and r.status in ('pilot','production') and (r.effective_from is null or r.effective_from<=current_date) and (r.effective_to is null or r.effective_to>=current_date)
  join public.units u on u.id=w.unit_id and u.subject_program_id=a.subject_program_id
  join public.curriculum_release_units ru on ru.curriculum_release_id=r.id and ru.unit_id=u.id
  join public.written_task_versions t on t.id=w.task_version_id and t.curriculum_release_id=r.id and t.unit_id=u.id and t.subject_program_id=a.subject_program_id
  join public.written_submissions su on su.id=w.current_submission_id and su.work_id=w.id
  join public.profiles p on p.id=w.student_id
  where w.state in ('submitted','reviewed','changes_requested')
 ), entries as materialized (
  select distinct on(id) id,state,submitted_at,assignment_id,class_id,jsonb_build_object('id',id,'state',state,'revision',revision,
   'submittedAt',submitted_at,'studentName',student_name,'taskTitle',task_title,'classId',class_id,'className',class_name,
   'schoolName',school_name,'academicYear',academic_year,'subjectName',subject_name,'subjectCode',subject_code,'gradeNumber',grade_number,
   'assignmentId',assignment_id,'curriculumReleaseId',curriculum_release_id,'unitId',unit_id,'unitTitle',unit_title) entry from works
   where p_assignment is null or assignment_id=p_assignment order by id,assignment_id
 ), page as materialized (
  select * from entries where state='submitted' and (p_cursor is null or (submitted_at,id)>(cursor_time,cursor_id))
   order by submitted_at,id limit 13
 ), cards as (
  select a.class_id,a.assignment_id,a.class_name,jsonb_build_object('id',a.class_id,'assignmentId',a.assignment_id,
   'name',a.class_name,'isActive',true,'schoolName',a.school_name,'academicYear',a.academic_year,'subjectName',a.subject_name,
   'subjectCode',a.subject_code,'gradeNumber',a.grade_number,'recent',p_recent ? a.class_id::text,
   'pendingCount',(select count(*) from works w where w.assignment_id=a.assignment_id and w.state='submitted')) card
  from assignments a
  union all
  select c.id,null,c.name,jsonb_build_object('id',c.id,'assignmentId',null,'name',c.name,'isActive',true,'academicYear',c.academic_year,
   'subjectName',s.name_hy,'subjectCode',s.code,'gradeNumber',g.grade_number,'recent',p_recent ? c.id::text,'pendingCount',null)
  from public.classes c left join public.subjects s on s.id=c.subject_id left join public.grades g on g.id=c.grade_id
  where c.teacher_id=p_actor and c.school_id is null and c.is_active
   and not exists(select 1 from public.institutional_memberships m where m.person_id=p_actor and m.role='teacher')
 ), card_page as (
  select * from cards order by coalesce((select ordinal from jsonb_array_elements_text(p_recent) with ordinality x(v,ordinal) where v=class_id::text),100),class_name,class_id,assignment_id limit 6
 )
 select jsonb_build_object('version','teacher-workspace-v1','snapshotAt',now(),
  'authorizedFilter',p_assignment is null or exists(select 1 from assignments where assignment_id=p_assignment),
  'authorizedWork',p_work is null or exists(select 1 from entries where id=p_work),
  'coverage',case when exists(select 1 from cards where assignment_id is null) then 'schoolless_unavailable' else 'active_writable_school_contexts' end,
  'pendingCount',case when exists(select 1 from cards where assignment_id is null) then null else (select count(*) from entries where state='submitted') end,
  'assignmentId',p_assignment,'filterClass',(select jsonb_build_object('className',class_name,'subjectName',subject_name,'schoolName',school_name) from assignments where assignment_id=p_assignment),'queue',coalesce((select jsonb_agg(entry order by submitted_at,id) from (select * from page order by submitted_at,id limit 12) q),'[]'),
  'hasMore',(select count(*)>12 from page),
  'nextCursor',(select jsonb_build_object('submittedAt',submitted_at,'id',id) from page order by submitted_at,id offset 11 limit 1),
  'selectedWork',(select entry from entries where id=p_work),
  'cards',coalesce((select jsonb_agg(card order by coalesce((select ordinal from jsonb_array_elements_text(p_recent) with ordinality x(v,ordinal) where v=class_id::text),100),class_name,class_id,assignment_id) from card_page),'[]'),
  'classCount',(select count(*) from cards),'cardsPartial',(select count(*)>6 from cards)) into result;
 if result->'authorizedFilter' <> 'true' or result->'authorizedWork' <> 'true' then
  raise exception 'workspace_context_unavailable' using errcode='42501';end if;
 return result - 'authorizedFilter' - 'authorizedWork';
end; $$;
revoke all on function private.service_teacher_workspace(uuid,uuid,uuid,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.service_teacher_workspace(uuid,uuid,uuid,jsonb,uuid,jsonb) to service_role;
create function public.service_teacher_workspace(p_actor uuid,p_auth uuid,p_assignment uuid default null,
 p_cursor jsonb default null,p_work uuid default null,p_recent jsonb default '[]') returns jsonb
 language sql stable security invoker set search_path='' as $$
 select private.service_teacher_workspace(p_actor,p_auth,p_assignment,p_cursor,p_work,p_recent);
$$;
revoke all on function public.service_teacher_workspace(uuid,uuid,uuid,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_teacher_workspace(uuid,uuid,uuid,jsonb,uuid,jsonb) to service_role;
