-- Sprint 11C follow-up: previewing an already-materialised seed should validate
-- against other variants, not reject its own identical concrete item.

create or replace function private.validate_rendered_item_variant(
  p_render jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_errors text[] := array[]::text[];
  v_warnings text[] := array[]::text[];
  v_prompt text := coalesce(p_render ->> 'promptHy', '');
  v_type text := p_render ->> 'itemType';
  v_params jsonb := coalesce(p_render -> 'parameters', '{}'::jsonb);
  v_options jsonb := coalesce(p_render -> 'options', '[]'::jsonb);
  v_fingerprint text := p_render ->> 'semanticFingerprint';
  v_skill_id uuid := (p_render ->> 'skillId')::uuid;
  v_template_id uuid := (p_render ->> 'templateId')::uuid;
  v_seed text := p_render ->> 'seed';
  v_answer jsonb := p_render -> 'answer';
  v_option_count integer;
  v_unique_option_count integer;
  v_existing_same_id uuid;
begin
  select i.id into v_existing_same_id
  from public.items i
  where i.item_template_id = v_template_id
    and i.variant_key = 'seed:' || v_seed
    and i.retired_at is null
  limit 1;

  if btrim(v_prompt) = '' then v_errors := array_append(v_errors, 'empty_prompt'); end if;
  if v_prompt ~* '(\{\{\s*answer\s*\}\}|\$\{\s*answer\s*\}|\[\s*answer\s*\])' then
    v_errors := array_append(v_errors, 'answer_placeholder_leak');
  end if;
  if v_params ?| array['answer','correctAnswer','correct_answer','correctOption','correct_option'] then
    v_errors := array_append(v_errors, 'answer_present_in_public_parameters');
  end if;
  if coalesce((p_render ->> 'difficulty')::integer, 0) not between 1 and 5 then
    v_errors := array_append(v_errors, 'invalid_difficulty');
  end if;
  if v_type not in ('single_choice','true_false','numeric','quantity') then
    v_errors := array_append(v_errors, 'unsupported_item_type');
  end if;
  if v_answer is null then v_errors := array_append(v_errors, 'missing_answer'); end if;

  if v_type in ('numeric','quantity') then
    if jsonb_typeof(v_answer) <> 'number' then v_errors := array_append(v_errors, 'numeric_answer_not_number'); end if;
    if p_render ->> 'tolerance' is null then v_errors := array_append(v_errors, 'numeric_tolerance_missing'); end if;
  end if;

  if v_type = 'quantity' then
    if nullif(p_render ->> 'canonicalUnit','') is null then v_errors := array_append(v_errors, 'quantity_unit_missing'); end if;
    if jsonb_array_length(coalesce(p_render -> 'acceptedUnits','[]'::jsonb)) = 0 then v_errors := array_append(v_errors, 'accepted_units_missing'); end if;
  end if;

  if v_type = 'single_choice' then
    select count(*), count(distinct lower(btrim(x.elem ->> 'contentHy')))
      into v_option_count, v_unique_option_count
    from jsonb_array_elements(v_options) as x(elem);
    if v_option_count < 2 then v_errors := array_append(v_errors, 'insufficient_options'); end if;
    if v_option_count <> v_unique_option_count then v_errors := array_append(v_errors, 'duplicate_options'); end if;
    if not exists (
      select 1 from jsonb_array_elements(v_options) as x(elem)
      where x.elem ->> 'optionKey' = p_render ->> 'answer'
    ) then
      v_errors := array_append(v_errors, 'answer_not_in_options');
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_options) as x(elem)
      where coalesce(x.elem ->> 'contentHy','') ~* '(\(\s*ճիշտ\s*\)|\bcorrect\b)'
    ) then
      v_errors := array_append(v_errors, 'option_answer_marker_leak');
    end if;
  end if;

  if nullif(v_fingerprint,'') is null then
    v_errors := array_append(v_errors, 'missing_semantic_fingerprint');
  elsif exists (
    select 1 from public.items i
    where i.skill_id = v_skill_id
      and i.variant_fingerprint = v_fingerprint
      and i.retired_at is null
      and (v_existing_same_id is null or i.id <> v_existing_same_id)
  ) then
    v_errors := array_append(v_errors, 'duplicate_effective_variant');
  end if;

  if exists (
    select 1 from public.items i
    where i.skill_id = v_skill_id
      and i.prompt_hy = v_prompt
      and i.retired_at is null
      and (v_existing_same_id is null or i.id <> v_existing_same_id)
  ) then
    v_warnings := array_append(v_warnings, 'duplicate_prompt_existing_item');
  end if;

  return jsonb_build_object(
    'valid', cardinality(v_errors) = 0,
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings)
  );
end;
$$;
