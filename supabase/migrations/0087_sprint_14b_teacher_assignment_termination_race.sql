-- Serialize a new active teacher assignment with termination of its parent membership.
create or replace function public.validate_teacher_assignment_14a() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare m record; c record; p record;
begin
  select role,status,valid_from,valid_to into m from public.institutional_memberships
    where id=new.teacher_membership_id and school_id=new.school_id for share;
  select subject_id,grade_id into c from public.classes
    where id=new.class_id and school_id=new.school_id and academic_year_id=new.academic_year_id;
  select subject_id,grade_id into p from public.subject_programs where id=new.subject_program_id;
  if m.role is distinct from 'teacher' or c.subject_id is distinct from p.subject_id
     or c.grade_id is distinct from p.grade_id or c.subject_id is null then
    raise exception 'assignment_identity_mismatch' using errcode='23514';
  end if;
  if new.status='active' and (m.status is distinct from 'active'
     or m.valid_from>now() or (m.valid_to is not null and m.valid_to<=now())
     or new.valid_from<m.valid_from
     or (m.valid_to is not null and (new.valid_to is null or new.valid_to>m.valid_to))) then
    raise exception 'assignment_outside_teacher_membership' using errcode='23514';
  end if;
  return new;
end $$;
