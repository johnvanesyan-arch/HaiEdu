-- Preserve existing draft misconception mappings when a reviewer edits unrelated item content.
-- New draft misconceptions still cannot be attached through the editor; only an already-attached
-- draft mapping may survive a revision. This also recovers the blank-code payload emitted by
-- pre-fix browser bundles when a mapped misconception was not yet active.

create or replace function public.service_save_item_content_revision(
  p_item_id uuid,
  p_actor_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_item public.items%rowtype;
  v_role text;
  v_template_kind text;
  v_prompt_hy text;
  v_prompt_en text;
  v_stimulus jsonb;
  v_difficulty integer;
  v_family text;
  v_source text;
  v_validation text;
  v_options jsonb;
  v_answer_key jsonb;
  v_answer jsonb;
  v_mappings jsonb;
  v_change_summary text;
  v_next_version integer;
  v_config jsonb;
  v_option_count integer;
  v_distinct_option_count integer;
  v_bad_count integer;
  v_duplicate_mapping_count integer;
  v_fingerprint text;
begin
  select role::text into v_role
  from public.profiles
  where id = p_actor_id;

  if v_role is null or v_role not in ('admin','content_admin') then
    raise exception 'content_admin_required';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
  for update;

  if not found then raise exception 'item_not_found'; end if;
  if v_item.retired_at is not null then raise exception 'retired_item_not_editable'; end if;

  select t.template_kind into v_template_kind
  from public.item_templates t
  where t.id = v_item.item_template_id;

  -- Deterministically generated concrete variants must stay reproducible from template+seed.
  -- Editing their rendered prompt/answer directly would intentionally make generator QA fail.
  if v_item.variant_seed is not null and v_template_kind in ('parameterized','parallel') then
    raise exception 'generated_variant_requires_template_edit';
  end if;

  v_prompt_hy := btrim(coalesce(p_payload->>'promptHy',''));
  v_prompt_en := nullif(btrim(coalesce(p_payload->>'promptEn','')), '');
  v_stimulus := coalesce(p_payload->'stimulus', '{}'::jsonb);
  if v_stimulus = 'null'::jsonb then v_stimulus := '{}'::jsonb; end if;

  begin
    v_difficulty := (p_payload->>'difficulty')::integer;
  exception when others then
    raise exception 'invalid_difficulty';
  end;

  v_family := btrim(coalesce(p_payload->>'itemFamily',''));
  v_source := nullif(btrim(coalesce(p_payload->>'sourceReference','')), '');
  v_validation := btrim(coalesce(p_payload->>'validationState', v_item.validation_state));
  v_options := coalesce(p_payload->'options', '[]'::jsonb);
  v_answer_key := coalesce(p_payload->'answerKey', '{}'::jsonb);
  v_answer := v_answer_key->'answer';
  v_mappings := coalesce(p_payload->'misconceptions', '[]'::jsonb);
  v_change_summary := nullif(btrim(coalesce(p_payload->>'changeSummary','')), '');

  -- Preserve a currently attached draft misconception during ordinary item edits.
  -- Older browser bundles could render a current draft mapping with an empty select
  -- because only active misconceptions were offered as choices. If the response key
  -- identifies exactly one existing mapping, recover its code before validation.
  select coalesce(
    jsonb_agg(
      case
        when btrim(coalesce(m.value->>'code','')) <> '' then m.value
        else jsonb_set(
          m.value,
          '{code}',
          to_jsonb(coalesce((
            select case when count(*) = 1 then max(mc.code) else null end
            from public.item_misconception_mappings existing
            join public.misconceptions mc on mc.id = existing.misconception_id
            where existing.item_id = v_item.id
              and existing.response_key = coalesce(nullif(btrim(m.value->>'responseKey'),''),'*')
              and mc.status <> 'retired'
          ), '')),
          true
        )
      end
      order by m.ordinality
    ),
    '[]'::jsonb
  )
  into v_mappings
  from jsonb_array_elements(v_mappings) with ordinality as m(value, ordinality);

  if v_prompt_hy = '' then raise exception 'empty_prompt'; end if;
  if v_difficulty < 1 or v_difficulty > 5 then raise exception 'invalid_difficulty'; end if;
  if v_family = '' then raise exception 'item_family_required'; end if;
  if v_validation = '' then raise exception 'validation_state_required'; end if;
  if jsonb_typeof(v_options) <> 'array' then raise exception 'options_must_be_array'; end if;
  if jsonb_typeof(v_mappings) <> 'array' then raise exception 'misconceptions_must_be_array'; end if;
  if jsonb_typeof(v_answer_key) <> 'object' or v_answer is null or v_answer = 'null'::jsonb then
    raise exception 'answer_key_required';
  end if;

  if v_item.item_type::text = 'single_choice' then
    v_option_count := jsonb_array_length(v_options);
    if v_option_count < 2 then raise exception 'insufficient_options'; end if;

    select count(distinct btrim(o->>'key')),
           count(*) filter (where btrim(coalesce(o->>'key','')) = '' or btrim(coalesce(o->>'contentHy','')) = '')
      into v_distinct_option_count, v_bad_count
    from jsonb_array_elements(v_options) o;

    if v_distinct_option_count <> v_option_count then raise exception 'duplicate_option_key'; end if;
    if v_bad_count <> 0 then raise exception 'invalid_option'; end if;
    if jsonb_typeof(v_answer) <> 'string' then raise exception 'single_choice_answer_must_be_option_key'; end if;
    if not exists (
      select 1 from jsonb_array_elements(v_options) o
      where btrim(o->>'key') = trim(both '"' from v_answer::text)
    ) then
      raise exception 'answer_not_in_options';
    end if;
  elsif v_item.item_type::text = 'true_false' then
    if jsonb_typeof(v_answer) <> 'boolean' then raise exception 'true_false_answer_not_boolean'; end if;
  elsif v_item.item_type::text in ('numeric','quantity') then
    if jsonb_typeof(v_answer) <> 'number' then raise exception 'numeric_answer_not_number'; end if;
    if v_answer_key->>'tolerance' is null then raise exception 'numeric_tolerance_missing'; end if;
    begin
      if (v_answer_key->>'tolerance')::numeric < 0 then raise exception 'invalid_tolerance'; end if;
    exception when invalid_text_representation then
      raise exception 'invalid_tolerance';
    end;
    if v_item.item_type::text = 'quantity' then
      if nullif(btrim(coalesce(v_answer_key->>'canonicalUnit','')), '') is null then
        raise exception 'quantity_canonical_unit_missing';
      end if;
      if jsonb_typeof(coalesce(v_answer_key->'acceptedUnits','[]'::jsonb)) <> 'array'
         or jsonb_array_length(coalesce(v_answer_key->'acceptedUnits','[]'::jsonb)) = 0 then
        raise exception 'quantity_accepted_units_missing';
      end if;
      if not exists (
        select 1 from jsonb_array_elements_text(v_answer_key->'acceptedUnits') u(value)
        where btrim(u.value) = btrim(v_answer_key->>'canonicalUnit')
      ) then
        raise exception 'canonical_unit_not_in_accepted_units';
      end if;
    end if;
  else
    raise exception 'unsupported_item_type';
  end if;

  -- Every submitted misconception must be active and belong to this item's skill.
  select count(*) into v_bad_count
  from jsonb_array_elements(v_mappings) m
  where btrim(coalesce(m->>'code','')) = ''
     or not exists (
       select 1 from public.misconceptions mc
       where mc.skill_id = v_item.skill_id
         and mc.code = btrim(m->>'code')
         and (
           mc.status = 'active'
           or (
             mc.status = 'draft'
             and exists (
               select 1
               from public.item_misconception_mappings existing
               where existing.item_id = v_item.id
                 and existing.misconception_id = mc.id
             )
           )
         )
     );
  if v_bad_count <> 0 then raise exception 'invalid_misconception_code'; end if;

  select count(*) - count(distinct (btrim(m->>'code') || '|' || btrim(coalesce(m->>'responseKey','*'))))
    into v_duplicate_mapping_count
  from jsonb_array_elements(v_mappings) m;
  if v_duplicate_mapping_count <> 0 then raise exception 'duplicate_misconception_mapping'; end if;

  -- Preserve the pre-edit state under its existing version number if no snapshot exists yet.
  insert into public.item_versions(item_id, version_no, snapshot, change_summary, created_by)
  select v_item.id,
         v_item.version_no,
         jsonb_build_object(
           'item', to_jsonb(v_item),
           'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.display_order,o.option_key) from public.item_options o where o.item_id=v_item.id), '[]'::jsonb),
           'answerKey', (select to_jsonb(k) from public.item_answer_keys k where k.item_id=v_item.id),
           'misconceptions', coalesce((select jsonb_agg(jsonb_build_object('responseKey',m.response_key,'mappingNote',m.mapping_note,'code',mc.code) order by mc.code,m.response_key) from public.item_misconception_mappings m join public.misconceptions mc on mc.id=m.misconception_id where m.item_id=v_item.id), '[]'::jsonb)
         ),
         'Pre-edit snapshot before: ' || coalesce(v_change_summary,'content editor revision'),
         p_actor_id
  where not exists (
    select 1 from public.item_versions iv where iv.item_id=v_item.id and iv.version_no=v_item.version_no
  );

  v_config := v_item.config;
  if v_config ? 'pilot_ready' then v_config := jsonb_set(v_config,'{pilot_ready}','false'::jsonb,true); end if;
  if v_config ? 'humanReviewStatus' then v_config := jsonb_set(v_config,'{humanReviewStatus}','"pending"'::jsonb,true); end if;
  if v_config ? 'technicalQaStatus' then v_config := jsonb_set(v_config,'{technicalQaStatus}','"pending"'::jsonb,true); end if;

  update public.items
  set prompt_hy = v_prompt_hy,
      prompt_en = v_prompt_en,
      stimulus = v_stimulus,
      difficulty = v_difficulty,
      difficulty_band = case when v_difficulty <= 1 then 'foundation' when v_difficulty <= 3 then 'core' else 'challenge' end,
      item_family = v_family,
      source_reference = v_source,
      validation_state = v_validation,
      config = v_config,
      review_status = 'needs_review',
      status = 'review'::public.content_status,
      last_reviewed_at = null,
      last_reviewed_by = null,
      updated_at = now()
  where id = v_item.id;

  delete from public.item_options where item_id = v_item.id;
  if v_item.item_type::text = 'single_choice' then
    insert into public.item_options(item_id, option_key, content_hy, content_en, display_order)
    select v_item.id,
           btrim(o.value->>'key'),
           btrim(o.value->>'contentHy'),
           nullif(btrim(coalesce(o.value->>'contentEn','')), ''),
           o.ordinality::integer
    from jsonb_array_elements(v_options) with ordinality as o(value, ordinality);
  end if;

  insert into public.item_answer_keys(item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code, updated_at)
  values (
    v_item.id,
    v_answer,
    case when v_item.item_type::text in ('numeric','quantity') then (v_answer_key->>'tolerance')::numeric else null end,
    case when v_item.item_type::text = 'quantity' then nullif(btrim(v_answer_key->>'canonicalUnit'),'') else null end,
    case when v_item.item_type::text = 'quantity'
      then array(select btrim(value) from jsonb_array_elements_text(v_answer_key->'acceptedUnits') where btrim(value) <> '')
      else '{}'::text[] end,
    nullif(btrim(coalesce(v_answer_key->>'feedbackCode','')), ''),
    now()
  )
  on conflict (item_id) do update
  set answer=excluded.answer,
      tolerance=excluded.tolerance,
      canonical_unit=excluded.canonical_unit,
      accepted_units=excluded.accepted_units,
      feedback_code=excluded.feedback_code,
      updated_at=excluded.updated_at;

  delete from public.item_misconception_mappings where item_id = v_item.id;
  insert into public.item_misconception_mappings(item_id, misconception_id, response_key, mapping_note)
  select v_item.id,
         mc.id,
         coalesce(nullif(btrim(m.value->>'responseKey'),''),'*'),
         nullif(btrim(coalesce(m.value->>'mappingNote','')), '')
  from jsonb_array_elements(v_mappings) m(value)
  join public.misconceptions mc
    on mc.skill_id=v_item.skill_id
   and mc.code=btrim(m.value->>'code')
   and (
     mc.status='active'
     or (
       mc.status='draft'
       and exists (
         select 1
         from public.item_misconception_mappings existing
         where existing.item_id=v_item.id
           and existing.misconception_id=mc.id
       )
     )
   );

  -- Authored/fixed variants get a fresh semantic fingerprint after edits.
  if coalesce(v_template_kind,'fixed') = 'fixed' then
    select md5(
      v_item.skill_id::text || '|' ||
      lower(regexp_replace(v_prompt_hy, '\s+', ' ', 'g')) || '|' ||
      k.answer::text || '|' ||
      coalesce((
        select jsonb_agg(jsonb_build_object('optionKey',o.option_key,'contentHy',o.content_hy) order by o.display_order,o.option_key)::text
        from public.item_options o where o.item_id=v_item.id
      ), '[]')
    ) into v_fingerprint
    from public.item_answer_keys k
    where k.item_id=v_item.id;

    update public.items set variant_fingerprint=v_fingerprint where id=v_item.id;
  end if;

  v_next_version := v_item.version_no + 1;
  update public.items
  set version_no=v_next_version,
      review_status='needs_review',
      status='review'::public.content_status,
      updated_at=now()
  where id=v_item.id;

  -- Snapshot the new revision under the new version number.
  insert into public.item_versions(item_id, version_no, snapshot, change_summary, created_by)
  select i.id,
         v_next_version,
         jsonb_build_object(
           'item', to_jsonb(i),
           'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.display_order,o.option_key) from public.item_options o where o.item_id=i.id), '[]'::jsonb),
           'answerKey', (select to_jsonb(k) from public.item_answer_keys k where k.item_id=i.id),
           'misconceptions', coalesce((select jsonb_agg(jsonb_build_object('responseKey',m.response_key,'mappingNote',m.mapping_note,'code',mc.code) order by mc.code,m.response_key) from public.item_misconception_mappings m join public.misconceptions mc on mc.id=m.misconception_id where m.item_id=i.id), '[]'::jsonb)
         ),
         coalesce(v_change_summary,'Content editor revision'),
         p_actor_id
  from public.items i
  where i.id=v_item.id;

  return jsonb_build_object(
    'itemId', v_item.id,
    'versionNo', v_next_version,
    'requiresQa', true,
    'requiresReview', true,
    'status', 'review'
  );
end;
$$;


revoke all on function public.service_save_item_content_revision(uuid,uuid,jsonb) from public;
revoke all on function public.service_save_item_content_revision(uuid,uuid,jsonb) from anon;
revoke all on function public.service_save_item_content_revision(uuid,uuid,jsonb) from authenticated;
grant execute on function public.service_save_item_content_revision(uuid,uuid,jsonb) to service_role;
