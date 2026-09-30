-- Sprint 15A.3 — fix enum-to-text role verification in the service-only authoring procedure.
-- The production profiles.role column is public.user_role; compare it to the asserted text role explicitly.

CREATE OR REPLACE FUNCTION public.service_append_remediation_guide_authoring_version(p_guide_scope text, p_guide_source_id uuid, p_expected_authoring_version integer, p_lifecycle_status text, p_content_snapshot jsonb, p_reference_metadata jsonb, p_change_rationale text, p_actor_id uuid, p_actor_role text, p_actor_aal text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_profile record;
  v_latest public.remediation_guide_authoring_versions%rowtype;
  v_next integer;
  v_new_id uuid;
  v_runtime_version integer;
  v_allowed_keys text[] := '{}'::text[];
  v_metadata jsonb;
begin
  if p_guide_scope not in ('skill','template') then
    raise exception 'invalid_guide_scope';
  end if;
  if p_lifecycle_status not in ('draft','review','published','archived') then
    raise exception 'invalid_lifecycle_status';
  end if;
  if jsonb_typeof(p_content_snapshot) is distinct from 'object' then
    raise exception 'invalid_content_snapshot';
  end if;
  if jsonb_typeof(coalesce(p_reference_metadata, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'invalid_reference_metadata';
  end if;
  if length(btrim(coalesce(p_change_rationale,''))) < 3 then
    raise exception 'change_rationale_required';
  end if;

  select role, account_status into v_profile
  from public.profiles
  where id = p_actor_id;

  if not found or v_profile.account_status <> 'active'
     or v_profile.role not in ('content_admin','admin')
     or v_profile.role::text <> p_actor_role then
    raise exception 'content_authoring_role_required';
  end if;

  if p_lifecycle_status in ('published','archived') and p_actor_aal <> 'aal2' then
    raise exception 'mfa_required';
  end if;

  if p_guide_scope = 'skill' then
    perform 1 from public.skill_remediation_guides
    where id = p_guide_source_id for update;
  else
    perform 1 from public.item_template_remediation_guides
    where id = p_guide_source_id for update;
  end if;
  if not found then raise exception 'guide_not_found'; end if;

  select * into v_latest
  from public.remediation_guide_authoring_versions
  where guide_scope = p_guide_scope and guide_source_id = p_guide_source_id
  order by authoring_version desc
  limit 1;

  if not found then raise exception 'authoring_history_missing'; end if;
  if v_latest.authoring_version <> p_expected_authoring_version then
    raise exception 'stale_authoring_version';
  end if;
  if p_lifecycle_status = 'review' and v_latest.lifecycle_status <> 'draft' then
    raise exception 'draft_required_before_review';
  end if;
  if p_lifecycle_status = 'published' and v_latest.lifecycle_status <> 'review' then
    raise exception 'review_required_before_publish';
  end if;
  if p_lifecycle_status = 'published'
     and (p_content_snapshot is distinct from v_latest.content_snapshot
       or coalesce(p_reference_metadata,'{}'::jsonb) is distinct from v_latest.reference_metadata) then
    raise exception 'published_content_must_match_review';
  end if;
  if p_lifecycle_status = 'archived' and v_latest.lifecycle_status <> 'published' then
    raise exception 'published_guide_required_before_archive';
  end if;

  v_next := v_latest.authoring_version + 1;
  v_metadata := coalesce(p_content_snapshot->'metadata','{}'::jsonb)
    || jsonb_build_object('referenceMetadata', coalesce(p_reference_metadata,'{}'::jsonb));

  perform set_config('app.remediation_actor_id', p_actor_id::text, true);
  perform set_config('app.remediation_actor_role', p_actor_role, true);
  perform set_config('app.remediation_change_rationale', btrim(p_change_rationale), true);
  perform set_config('app.remediation_lifecycle_action', p_lifecycle_status, true);

  if p_lifecycle_status = 'published' then
    if p_guide_scope = 'skill' then
      update public.skill_remediation_guides set
        misconception_code = btrim(coalesce(p_content_snapshot->>'misconceptionCode','')),
        title_hy = btrim(coalesce(p_content_snapshot->>'titleHy','')),
        strategy_hy = btrim(coalesce(p_content_snapshot->>'strategyHy','')),
        hint_1_hy = btrim(coalesce(p_content_snapshot->>'hint1Hy','')),
        hint_2_hy = btrim(coalesce(p_content_snapshot->>'hint2Hy','')),
        worked_example_hy = btrim(coalesce(p_content_snapshot->>'workedExampleHy','')),
        metadata = v_metadata,
        status = 'published'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    else
      select coalesce(array_agg(value), '{}'::text[]) into v_allowed_keys
      from jsonb_array_elements_text(coalesce(p_content_snapshot->'allowedParameterKeys','[]'::jsonb));

      update public.item_template_remediation_guides set
        trigger_error_code = nullif(btrim(coalesce(p_content_snapshot->>'triggerErrorCode','')), ''),
        title_hy = btrim(coalesce(p_content_snapshot->>'titleHy','')),
        strategy_hy = btrim(coalesce(p_content_snapshot->>'strategyHy','')),
        hint_1_hy = btrim(coalesce(p_content_snapshot->>'hint1Hy','')),
        hint_2_hy = btrim(coalesce(p_content_snapshot->>'hint2Hy','')),
        worked_example_hy = btrim(coalesce(p_content_snapshot->>'workedExampleHy','')),
        allowed_parameter_keys = v_allowed_keys,
        metadata = v_metadata,
        status = 'published'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    end if;
  elsif p_lifecycle_status = 'archived' then
    -- Archive uses the last reviewed/published content; it cannot smuggle a content edit.
    p_content_snapshot := v_latest.content_snapshot;
    p_reference_metadata := v_latest.reference_metadata;
    if p_guide_scope = 'skill' then
      update public.skill_remediation_guides set status = 'archived'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    else
      update public.item_template_remediation_guides set status = 'archived'
      where id = p_guide_source_id
      returning guide_version into v_runtime_version;
    end if;
  end if;

  insert into public.remediation_guide_authoring_versions (
    guide_scope, guide_source_id, authoring_version, lifecycle_status,
    content_snapshot, reference_metadata, change_rationale,
    actor_id, actor_role, actor_aal, parent_version_id,
    published_runtime_version
  ) values (
    p_guide_scope, p_guide_source_id, v_next, p_lifecycle_status,
    p_content_snapshot, coalesce(p_reference_metadata,'{}'::jsonb), btrim(p_change_rationale),
    p_actor_id, p_actor_role, p_actor_aal, v_latest.id,
    case when p_lifecycle_status in ('published','archived') then v_runtime_version else null end
  ) returning id into v_new_id;

  return jsonb_build_object(
    'id', v_new_id,
    'guideScope', p_guide_scope,
    'guideSourceId', p_guide_source_id,
    'authoringVersion', v_next,
    'lifecycleStatus', p_lifecycle_status,
    'runtimeVersion', v_runtime_version
  );
end;
$function$;

notify pgrst, 'reload schema';

