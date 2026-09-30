-- Sprint 15B foundation: create the first draft of a remediation guide through
-- the same protected, append-only workflow used for later edits and publication.
-- Learner runtime resolution continues to read published guides only.

create or replace function public.service_create_remediation_guide_draft(
  p_guide_scope text,
  p_skill_id uuid,
  p_item_template_id uuid,
  p_specialization_code text,
  p_content_snapshot jsonb,
  p_reference_metadata jsonb,
  p_change_rationale text,
  p_actor_id uuid,
  p_actor_role text,
  p_actor_aal text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_profile record;
  v_guide_source_id uuid;
  v_authoring_id uuid;
  v_skill_id uuid;
  v_specialization_code text;
  v_allowed_keys text[] := '{}'::text[];
  v_content jsonb;
  v_metadata jsonb;
begin
  if p_guide_scope not in ('skill', 'template') then
    raise exception 'invalid_guide_scope';
  end if;
  if jsonb_typeof(p_content_snapshot) is distinct from 'object' then
    raise exception 'invalid_content_snapshot';
  end if;
  if jsonb_typeof(coalesce(p_reference_metadata, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'invalid_reference_metadata';
  end if;
  if length(btrim(coalesce(p_change_rationale, ''))) < 3 then
    raise exception 'change_rationale_required';
  end if;
  if p_actor_aal not in ('aal1', 'aal2') then
    raise exception 'invalid_actor_aal';
  end if;

  select role, account_status into v_profile
  from public.profiles
  where id = p_actor_id;

  if not found or v_profile.account_status <> 'active'
     or v_profile.role not in ('content_admin', 'admin')
     or v_profile.role::text <> p_actor_role then
    raise exception 'content_authoring_role_required';
  end if;

  v_specialization_code := nullif(btrim(coalesce(p_specialization_code, '')), '');
  if v_specialization_code is not null and (
    length(v_specialization_code) > 120
    or v_specialization_code !~ '^[a-z0-9][a-z0-9_.-]*$'
  ) then
    raise exception 'invalid_specialization_code';
  end if;

  if p_guide_scope = 'skill' then
    if p_skill_id is null or p_item_template_id is not null then
      raise exception 'skill_guide_target_invalid';
    end if;
    if v_specialization_code is null then
      raise exception 'misconception_code_required';
    end if;

    perform 1 from public.skills where id = p_skill_id;
    if not found then raise exception 'skill_not_found'; end if;

    if exists (
      select 1 from public.skill_remediation_guides
      where skill_id = p_skill_id and misconception_code = v_specialization_code
    ) then
      raise exception 'guide_already_exists';
    end if;

    v_skill_id := p_skill_id;
    v_content := p_content_snapshot || jsonb_build_object(
      'skillId', p_skill_id,
      'itemTemplateId', null,
      'misconceptionCode', v_specialization_code,
      'triggerErrorCode', null,
      'allowedParameterKeys', '[]'::jsonb
    );
  else
    if p_item_template_id is null or p_skill_id is not null then
      raise exception 'template_guide_target_invalid';
    end if;

    select f.skill_id into v_skill_id
    from public.item_templates it
    join public.item_families f on f.id = it.item_family_id
    where it.id = p_item_template_id;
    if not found then raise exception 'item_template_not_found'; end if;

    if exists (
      select 1 from public.item_template_remediation_guides
      where item_template_id = p_item_template_id
        and coalesce(trigger_error_code, '__default__') = coalesce(v_specialization_code, '__default__')
    ) then
      raise exception 'guide_already_exists';
    end if;

    if jsonb_typeof(coalesce(p_content_snapshot->'allowedParameterKeys', '[]'::jsonb)) is distinct from 'array' then
      raise exception 'invalid_allowed_parameter_keys';
    end if;
    select coalesce(array_agg(value), '{}'::text[]) into v_allowed_keys
    from jsonb_array_elements_text(coalesce(p_content_snapshot->'allowedParameterKeys', '[]'::jsonb));

    v_content := p_content_snapshot || jsonb_build_object(
      'skillId', v_skill_id,
      'itemTemplateId', p_item_template_id,
      'misconceptionCode', '',
      'triggerErrorCode', v_specialization_code,
      'allowedParameterKeys', to_jsonb(v_allowed_keys)
    );
  end if;

  v_metadata := coalesce(v_content->'metadata', '{}'::jsonb)
    || jsonb_build_object('referenceMetadata', coalesce(p_reference_metadata, '{}'::jsonb));

  perform set_config('app.remediation_actor_id', p_actor_id::text, true);
  perform set_config('app.remediation_actor_role', p_actor_role, true);
  perform set_config('app.remediation_change_rationale', btrim(p_change_rationale), true);
  perform set_config('app.remediation_lifecycle_action', 'draft_created', true);

  if p_guide_scope = 'skill' then
    insert into public.skill_remediation_guides (
      skill_id, misconception_code, title_hy, strategy_hy,
      hint_1_hy, hint_2_hy, worked_example_hy, status, metadata
    ) values (
      p_skill_id,
      v_specialization_code,
      btrim(coalesce(v_content->>'titleHy', '')),
      btrim(coalesce(v_content->>'strategyHy', '')),
      btrim(coalesce(v_content->>'hint1Hy', '')),
      btrim(coalesce(v_content->>'hint2Hy', '')),
      btrim(coalesce(v_content->>'workedExampleHy', '')),
      'draft',
      v_metadata
    ) returning id into v_guide_source_id;
  else
    insert into public.item_template_remediation_guides (
      item_template_id, trigger_error_code, title_hy, strategy_hy,
      hint_1_hy, hint_2_hy, worked_example_hy, allowed_parameter_keys,
      status, metadata
    ) values (
      p_item_template_id,
      v_specialization_code,
      btrim(coalesce(v_content->>'titleHy', '')),
      btrim(coalesce(v_content->>'strategyHy', '')),
      btrim(coalesce(v_content->>'hint1Hy', '')),
      btrim(coalesce(v_content->>'hint2Hy', '')),
      btrim(coalesce(v_content->>'workedExampleHy', '')),
      v_allowed_keys,
      'draft',
      v_metadata
    ) returning id into v_guide_source_id;
  end if;

  insert into public.remediation_guide_authoring_versions (
    guide_scope, guide_source_id, authoring_version, lifecycle_status,
    content_snapshot, reference_metadata, change_rationale,
    actor_id, actor_role, actor_aal, published_runtime_version
  ) values (
    p_guide_scope, v_guide_source_id, 1, 'draft',
    v_content, coalesce(p_reference_metadata, '{}'::jsonb), btrim(p_change_rationale),
    p_actor_id, p_actor_role, p_actor_aal, null
  ) returning id into v_authoring_id;

  return jsonb_build_object(
    'id', v_authoring_id,
    'guideScope', p_guide_scope,
    'guideSourceId', v_guide_source_id,
    'authoringVersion', 1,
    'lifecycleStatus', 'draft',
    'runtimeVersion', 1
  );
end;
$$;

revoke all on function public.service_create_remediation_guide_draft(
  text, uuid, uuid, text, jsonb, jsonb, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.service_create_remediation_guide_draft(
  text, uuid, uuid, text, jsonb, jsonb, text, uuid, text, text
) to service_role;

notify pgrst, 'reload schema';
