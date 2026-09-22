-- Sprint 12.5 Chapter Review exposure integration correction.
-- Make the shared served/answered/help exposure pipeline accept the new chapter_review mode.

alter table public.student_item_exposure_events
  drop constraint if exists student_item_exposure_events_purpose_check;

alter table public.student_item_exposure_events
  add constraint student_item_exposure_events_purpose_check
  check (purpose in ('practice','diagnostic','mastery_check','chapter_review'));

create or replace function public.service_record_item_exposure(
  p_student_id uuid,
  p_session_id uuid,
  p_session_item_id uuid,
  p_item_id uuid,
  p_served_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_event_id uuid;
  v_purpose text;
  v_item_code text;
  v_variant_key text;
  v_template_id uuid;
  v_template_code text;
  v_family_id uuid;
  v_family_code text;
begin
  select
    ls.mode,
    i.code,
    i.variant_key,
    t.id,
    t.code,
    f.id,
    f.code
  into
    v_purpose,
    v_item_code,
    v_variant_key,
    v_template_id,
    v_template_code,
    v_family_id,
    v_family_code
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id = lsi.session_id
  join public.items i on i.id = lsi.item_id
  join public.item_templates t on t.id = i.item_template_id
  join public.item_families f on f.id = t.item_family_id
  where lsi.id = p_session_item_id
    and lsi.session_id = p_session_id
    and lsi.item_id = p_item_id
    and ls.student_id = p_student_id
    and ls.mode in ('practice','diagnostic','mastery_check','chapter_review');

  if not found then
    raise exception 'invalid_exposure_context';
  end if;

  insert into public.student_item_exposure_events(
    student_id, item_id, item_family_id, item_template_id,
    item_code, family_code, template_code, variant_key,
    purpose, session_id, session_item_id, served_at
  ) values (
    p_student_id, p_item_id, v_family_id, v_template_id,
    coalesce(v_item_code, p_item_id::text), v_family_code, v_template_code, v_variant_key,
    v_purpose, p_session_id, p_session_item_id, p_served_at
  )
  on conflict (session_item_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.student_item_exposure_events
    where session_item_id = p_session_item_id;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.service_record_item_exposure(uuid,uuid,uuid,uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.service_record_item_exposure(uuid,uuid,uuid,uuid,timestamptz)
  to service_role;

comment on function public.service_record_item_exposure(uuid,uuid,uuid,uuid,timestamptz) is
  'Records served-item exposure for practice, diagnostic, mastery_check and chapter_review sessions; service-role only.';
