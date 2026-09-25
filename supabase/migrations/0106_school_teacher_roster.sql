-- Read-only school staff roster for the authenticated school admin console.
-- Email lives in Supabase Auth; only the server-side service role may call this RPC.
create or replace function public.service_list_school_teachers_14b(
  p_actor uuid, p_school uuid
) returns table(
  person_id uuid, membership_id uuid, display_name text, email text,
  account_status text, membership_status text, subjects jsonb, classes jsonb
) language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if p_actor is null or p_school is null
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_teachers_unavailable' using errcode='P0001';
  end if;

  return query
  with selected_memberships as (
    select distinct on (m.person_id) m.*
    from public.institutional_memberships m
    where m.school_id=p_school and m.role='teacher'
    order by m.person_id,
      (m.status='active' and m.valid_from<=now()
       and (m.valid_to is null or m.valid_to>now())) desc,
      m.created_at desc
  )
  select m.person_id, m.id, p.display_name, u.email::text,
    p.account_status,
    case when m.status='active' and m.valid_from<=now()
       and (m.valid_to is null or m.valid_to>now())
      then 'active' else 'ended' end,
    coalesce(grants.subjects, '[]'::jsonb),
    coalesce(assigned.classes, '[]'::jsonb)
  from selected_memberships m
  left join public.profiles p on p.id=m.person_id
  left join auth.users u on u.id=m.person_id
  left join lateral (
    select jsonb_agg(jsonb_build_object('nameHy',s.name_hy)
      order by s.name_hy) as subjects
    from public.teacher_subject_authorizations g
    join public.subjects s on s.id=g.subject_id
    where g.teacher_membership_id=m.id and g.school_id=m.school_id
      and g.status='active' and g.valid_from<=now()
      and (g.valid_to is null or g.valid_to>now())
  ) grants on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'name',c.name,'subjectName',s.name_hy,
      'gradeNumber',g.grade_number,'isActive',c.is_active)
      order by c.created_at desc) as classes
    from public.teacher_assignments a
    join public.classes c on c.id=a.class_id and c.school_id=m.school_id
      and c.teacher_id=m.person_id
    join public.subjects s on s.id=c.subject_id
    join public.grades g on g.id=c.grade_id
    where a.teacher_membership_id=m.id and a.school_id=m.school_id
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
  ) assigned on true
  order by (m.status='active' and m.valid_from<=now()
    and (m.valid_to is null or m.valid_to>now())) desc, u.email;
end $$;

revoke all on function public.service_list_school_teachers_14b(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.service_list_school_teachers_14b(uuid,uuid)
  to service_role;
