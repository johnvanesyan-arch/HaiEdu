-- Published subject choices are returned only to an active school admin.
create function public.service_list_school_admin_subjects_14b(
 p_actor uuid,p_school uuid
) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_options jsonb;
begin
  if not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_subjects_unavailable' using errcode='P0001'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'nameHy',name_hy,'code',code) order by code),'[]'::jsonb)
    into v_options from public.subjects where status::text='published';
  return v_options;
end $$;
revoke all on function public.service_list_school_admin_subjects_14b(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.service_list_school_admin_subjects_14b(uuid,uuid) to service_role;
