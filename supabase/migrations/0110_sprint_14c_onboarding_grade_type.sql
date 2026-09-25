-- Match the onboarding RPC's declared integer contract. grades.grade_number is
-- stored as smallint, so RETURN QUERY must cast it explicitly.

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
         coalesce(s.name_hy,s.name_en,s.code),g.grade_number::integer
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

revoke all on function public.service_list_student_onboarding_classes_14c(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.service_list_student_onboarding_classes_14c(uuid,uuid)
  to service_role;
