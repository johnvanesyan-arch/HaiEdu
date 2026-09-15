-- Sprint 11C: deterministic parameterised and parallel item variants
-- Adds server-side, seed-reproducible generation for selected Chapter I constructs.
-- Generated candidates are materialised in review state and are NOT assessment-pool
-- eligible until Sprint 11D technical QA + human content review approves them.

alter table public.items
  add column if not exists variant_fingerprint text;

create unique index if not exists uq_items_active_variant_fingerprint
  on public.items(variant_fingerprint)
  where variant_fingerprint is not null and retired_at is null;

create or replace function private.seed_index(
  p_seed text,
  p_salt text,
  p_size integer
) returns integer
language plpgsql
immutable
strict
as $$
declare
  v_hash bigint;
begin
  if p_size < 1 then
    raise exception 'seed_index_invalid_size';
  end if;
  v_hash := (('x' || substr(md5(p_seed || ':' || p_salt), 1, 8))::bit(32)::bigint);
  return ((v_hash % p_size) + 1)::integer;
end;
$$;

-- Canonical v1 renderer. Future generator behaviour changes must use a new
-- generator identifier/version rather than changing the meaning of old seeds.
create or replace function private.render_item_variant(
  p_template_code text,
  p_seed text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_template public.item_templates%rowtype;
  v_family public.item_families%rowtype;
  v_generator text;
  v_difficulty integer;
  v_prompt text;
  v_item_type text;
  v_answer jsonb;
  v_tolerance numeric;
  v_canonical_unit text;
  v_accepted_units jsonb := '[]'::jsonb;
  v_options jsonb := '[]'::jsonb;
  v_parameters jsonb := '{}'::jsonb;
  v_fingerprint text;
  v_i1 integer;
  v_i2 integer;
  v_i3 integer;
  v_num1 numeric;
  v_num2 numeric;
  v_num3 numeric;
  v_text1 text;
  v_text2 text;
  v_correct text;
begin
  if nullif(btrim(p_seed), '') is null then
    raise exception 'variant_seed_required';
  end if;

  select * into v_template
  from public.item_templates
  where code = p_template_code
    and status = 'active';
  if not found then
    raise exception 'active_template_not_found';
  end if;

  select * into v_family
  from public.item_families
  where id = v_template.item_family_id;
  if not found then
    raise exception 'item_family_not_found';
  end if;

  v_generator := v_template.generation_config ->> 'generator';
  v_difficulty := coalesce((v_template.generation_config ->> 'difficulty')::integer, 2);
  if v_difficulty < 1 or v_difficulty > 5 then
    raise exception 'generator_invalid_difficulty';
  end if;

  if v_generator = 's07_length_to_m_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'unit', 3);
    v_i2 := private.seed_index(p_seed, 'value', 6);

    if v_i1 = 1 then
      v_text1 := 'կմ';
      v_num1 := case v_i2 when 1 then 1.2 when 2 then 2 when 3 then 3.5 when 4 then 4 when 5 then 7.5 else 12 end;
      v_num2 := v_num1 * 1000;
    elsif v_i1 = 2 then
      v_text1 := 'սմ';
      v_num1 := case v_i2 when 1 then 15 when 2 then 35 when 3 then 80 when 4 then 125 when 5 then 250 else 420 end;
      v_num2 := v_num1 / 100;
    else
      v_text1 := 'մմ';
      v_num1 := case v_i2 when 1 then 250 when 2 then 750 when 3 then 1200 when 4 then 2500 when 5 then 4500 else 8200 end;
      v_num2 := v_num1 / 1000;
    end if;

    v_prompt := v_num1::text || ' ' || v_text1 || '-ը արտահայտեք մետրերով: Գրեք միայն թիվը:';
    v_answer := to_jsonb(v_num2);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('sourceValue', v_num1, 'sourceUnit', v_text1, 'targetUnit', 'մ');

  elsif v_generator = 's07_time_to_s_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'unit', 2);
    v_i2 := private.seed_index(p_seed, 'value', 6);

    if v_i1 = 1 then
      v_text1 := 'րոպե';
      v_num1 := case v_i2 when 1 then 2 when 2 then 3 when 3 then 4.5 when 4 then 7 when 5 then 12 else 15 end;
      v_num2 := v_num1 * 60;
    else
      v_text1 := 'ժամ';
      v_num1 := case v_i2 when 1 then 0.5 when 2 then 1 when 3 then 1.5 when 4 then 2 when 5 then 2.5 else 3 end;
      v_num2 := v_num1 * 3600;
    end if;

    v_prompt := v_num1::text || ' ' || v_text1 || '-ը արտահայտեք վայրկյաններով: Գրեք միայն թիվը:';
    v_answer := to_jsonb(v_num2);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('sourceValue', v_num1, 'sourceUnit', v_text1, 'targetUnit', 'վ');

  elsif v_generator = 's07_volume_to_l_v1' then
    v_item_type := 'quantity';
    v_i1 := private.seed_index(p_seed, 'value', 6);
    v_num1 := case v_i1 when 1 then 250 when 2 then 500 when 3 then 1250 when 4 then 1800 when 5 then 2500 else 3750 end;
    v_num2 := v_num1 / 1000;
    v_prompt := v_num1::text || ' մլ-ը արտահայտեք լիտրերով: Մուտքագրեք թվային արժեքը և միավորը:';
    v_answer := to_jsonb(v_num2);
    v_tolerance := 0.000001;
    v_canonical_unit := 'L';
    v_accepted_units := jsonb_build_array('L', 'l', 'լ');
    v_parameters := jsonb_build_object('sourceValue', v_num1, 'sourceUnit', 'մլ', 'targetUnit', 'L');

  elsif v_generator = 's08_scale_division_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'lower', 6);
    v_i2 := private.seed_index(p_seed, 'divisions', 3);
    v_i3 := private.seed_index(p_seed, 'step', 4);
    v_num1 := case v_i1 when 1 then 0 when 2 then 10 when 3 then 20 when 4 then 50 when 5 then 100 else 200 end;
    v_num2 := case v_i2 when 1 then 5 when 2 then 10 else 20 end;
    v_num3 := case v_i3 when 1 then 0.5 when 2 then 1 when 3 then 2 else 5 end;
    v_prompt := 'Սանդղակի ' || v_num1::text || ' և ' || (v_num1 + v_num2 * v_num3)::text || ' նշումների միջև կա ' || v_num2::text || ' հավասար բաժանում: Որքա՞ն է մեկ բաժանման արժեքը: Գրեք միայն թիվը:';
    v_answer := to_jsonb(v_num3);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('lowerMark', v_num1, 'upperMark', v_num1 + v_num2 * v_num3, 'divisionCount', v_num2);

  elsif v_generator = 's08_scale_reading_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'base', 5);
    v_i2 := private.seed_index(p_seed, 'step', 4);
    v_i3 := private.seed_index(p_seed, 'tick', 8);
    v_num1 := case v_i1 when 1 then 0 when 2 then 10 when 3 then 20 when 4 then 50 else 100 end;
    v_num2 := case v_i2 when 1 then 0.5 when 2 then 1 when 3 then 2 else 5 end;
    v_num3 := v_i3 + 1;
    v_prompt := 'Սանդղակի հիմքային նշումը ' || v_num1::text || ' է, մեկ բաժանումը՝ ' || v_num2::text || ' միավոր, և ցուցիչը գտնվում է հիմքից ' || v_num3::text || ' բաժանում վեր: Ի՞նչ արժեք է ցույց տալիս սարքը:';
    v_answer := to_jsonb(v_num1 + v_num2 * v_num3);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('baseMark', v_num1, 'divisionValue', v_num2, 'ticksAboveBase', v_num3);

  elsif v_generator = 's09_measurement_error_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'division', 6);
    v_i2 := private.seed_index(p_seed, 'device', 2);
    v_num1 := case v_i1 when 1 then 0.2 when 2 then 0.4 when 3 then 0.5 when 4 then 1 when 5 then 2 else 5 end;
    if v_i2 = 1 then
      v_text1 := 'քանոնի';
      v_text2 := 'սմ';
    else
      v_text1 := 'ջերմաչափի';
      v_text2 := '°C';
    end if;
    v_prompt := 'Չափիչ ' || v_text1 || ' մեկ բաժանման արժեքը ' || v_num1::text || ' ' || v_text2 || ' է: Ըստ ընդունված կանոնի՝ որքա՞ն է չափման սխալը ' || v_text2 || '-ով: Գրեք միայն թիվը:';
    v_answer := to_jsonb(v_num1 / 2);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('device', v_text1, 'divisionValue', v_num1, 'unit', v_text2, 'rule', 'half_division');

  elsif v_generator = 's10_displacement_volume_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'initial', 5);
    v_i2 := private.seed_index(p_seed, 'volume', 5);
    v_num1 := case v_i1 when 1 then 20 when 2 then 35 when 3 then 40 when 4 then 50 else 60 end;
    v_num2 := case v_i2 when 1 then 7 when 2 then 12 when 3 then 15 when 4 then 18 else 24 end;
    v_num3 := v_num1 + v_num2;
    v_prompt := 'Չափագլանում սկզբում կա ' || v_num1::text || ' սմ³ ջուր: Մարմինը լրիվ խորասուզելուց հետո ցուցմունքը դառնում է ' || v_num3::text || ' սմ³: Որքա՞ն է մարմնի ծավալը սմ³-ով: Գրեք միայն թիվը:';
    v_answer := to_jsonb(v_num2);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('initialVolumeCm3', v_num1, 'finalVolumeCm3', v_num3);

  elsif v_generator = 's10_sheet_thickness_v1' then
    v_item_type := 'numeric';
    v_i1 := private.seed_index(p_seed, 'count', 5);
    v_i2 := private.seed_index(p_seed, 'thickness', 4);
    v_num1 := case v_i1 when 1 then 20 when 2 then 25 when 3 then 40 when 4 then 50 else 80 end;
    v_num2 := case v_i2 when 1 then 0.1 when 2 then 0.2 when 3 then 0.25 else 0.5 end;
    v_num3 := v_num1 * v_num2;
    v_prompt := v_num1::text || ' նույնական թերթերի ընդհանուր հաստությունը ' || v_num3::text || ' մմ է: Որքա՞ն է մեկ թերթի հաստությունը մմ-ով:';
    v_answer := to_jsonb(v_num2);
    v_tolerance := 0.000001;
    v_parameters := jsonb_build_object('sheetCount', v_num1, 'totalThicknessMm', v_num3);

  elsif v_generator = 's04_observation_experiment_parallel_v1' then
    v_item_type := 'single_choice';
    v_i1 := private.seed_index(p_seed, 'scenario', 6);
    v_options := jsonb_build_array(
      jsonb_build_object('optionKey','A','contentHy','Դիտում'),
      jsonb_build_object('optionKey','B','contentHy','Փորձ')
    );

    if v_i1 = 1 then
      v_text1 := 'Աշակերտը երեք երեկո անընդմեջ գրանցում է Լուսնի տեսանելի ձևը՝ առանց պայմանները փոխելու:';
      v_correct := 'A';
    elsif v_i1 = 2 then
      v_text1 := 'Աշակերտը փոխում է ճոճանակի թելի երկարությունը և յուրաքանչյուր դեպքում չափում տատանման ժամանակը:';
      v_correct := 'B';
    elsif v_i1 = 3 then
      v_text1 := 'Աշակերտը լուսամուտի մոտ ամեն ժամ գրանցում է ստվերի երկարությունը՝ առանց պայմանները փոխելու:';
      v_correct := 'A';
    elsif v_i1 = 4 then
      v_text1 := 'Աշակերտը նույն քանակի ջուրը տաքացնում է երկու տարբեր հզորության ջեռուցիչներով և համեմատում տաքացման ժամանակը:';
      v_correct := 'B';
    elsif v_i1 = 5 then
      v_text1 := 'Աստղագետը մի քանի գիշեր շարունակ գրանցում է մոլորակի դիրքը՝ չփոխելով դիտման պայմանները:';
      v_correct := 'A';
    else
      v_text1 := 'Աշակերտը տարբեր մակերևույթների վրա նույն խաղալիք մեքենան բաց է թողնում նույն թեքությունից և համեմատում անցած ճանապարհը:';
      v_correct := 'B';
    end if;

    v_prompt := v_text1 || ' Սա հիմնականում ո՞ր մեթոդն է:';
    v_answer := to_jsonb(v_correct);
    v_parameters := jsonb_build_object('scenarioId', v_i1, 'construct', 'observation_vs_experiment');

  elsif v_generator = 's05_hypothesis_test_parallel_v1' then
    v_item_type := 'single_choice';
    v_i1 := private.seed_index(p_seed, 'scenario', 4);

    if v_i1 = 1 then
      v_prompt := 'Աշակերտը ենթադրում է, որ շաքարը տաք ջրում ավելի արագ է լուծվում: Ո՞ր փորձն է ամենահարմարն այս վարկածը ստուգելու համար:';
      v_options := jsonb_build_array(
        jsonb_build_object('optionKey','A','contentHy','Օգտագործել տարբեր քանակի շաքար և տարբեր քանակի ջուր'),
        jsonb_build_object('optionKey','B','contentHy','Վերցնել նույն քանակի ջուր և շաքար, փոխել միայն ջրի ջերմաստիճանը և համեմատել լուծման ժամանակը'),
        jsonb_build_object('optionKey','C','contentHy','Մի բաժակ ջուր դիտել առանց որևէ չափման'),
        jsonb_build_object('optionKey','D','contentHy','Հարցնել ընկերներին՝ ինչ են կարծում')
      );
      v_correct := 'B';
    elsif v_i1 = 2 then
      v_prompt := 'Աշակերտը ենթադրում է, որ ճոճանակի թելի երկարությունը ազդում է տատանման ժամանակի վրա: Ո՞ր գործողությունն է լավագույնս ստուգում վարկածը:';
      v_options := jsonb_build_array(
        jsonb_build_object('optionKey','A','contentHy','Միայն մեկ անգամ չափել մեկ ճոճանակի ժամանակը'),
        jsonb_build_object('optionKey','B','contentHy','Միաժամանակ փոխել թելի երկարությունը և ծանրոցի զանգվածը'),
        jsonb_build_object('optionKey','C','contentHy','Դիտել ուրիշի փորձի տեսանյութը և չկատարել չափումներ'),
        jsonb_build_object('optionKey','D','contentHy','Փոխել միայն թելի երկարությունը, մյուս պայմանները պահել նույնը և չափել տատանման ժամանակը')
      );
      v_correct := 'D';
    elsif v_i1 = 3 then
      v_prompt := 'Աշակերտը ենթադրում է, որ մուգ մակերևույթը նույն լամպի տակ ավելի արագ է տաքանում, քան բաց մակերևույթը: Ո՞ր փորձն է առավել ճիշտ:';
      v_options := jsonb_build_array(
        jsonb_build_object('optionKey','A','contentHy','Օգտագործել նույն նյութից երկու մակերևույթ, փոխել միայն գույնը, պահել լամպի հեռավորությունը նույնը և չափել ջերմաստիճանը'),
        jsonb_build_object('optionKey','B','contentHy','Օգտագործել տարբեր նյութեր, տարբեր լամպեր և տարբեր հեռավորություններ'),
        jsonb_build_object('optionKey','C','contentHy','Միայն նկարագրել մակերևույթների գույները'),
        jsonb_build_object('optionKey','D','contentHy','Մեկ մակերևույթը դնել արևի տակ, մյուսը՝ սենյակում')
      );
      v_correct := 'A';
    else
      v_prompt := 'Աշակերտը ենթադրում է, որ մագնիսը ձգում է միայն երկաթ պարունակող առարկաները: Ո՞ր գործողությունն է ամենահարմարն այս վարկածը ստուգելու համար:';
      v_options := jsonb_build_array(
        jsonb_build_object('optionKey','A','contentHy','Փորձարկել միայն մեկ երկաթե մեխ'),
        jsonb_build_object('optionKey','B','contentHy','Մագնիսը պահել սեղանին և ոչինչ չչափել'),
        jsonb_build_object('optionKey','C','contentHy','Փորձարկել հայտնի կազմով մի քանի երկաթ պարունակող և չպարունակող առարկաներ նույն պայմաններում և գրանցել արդյունքները'),
        jsonb_build_object('optionKey','D','contentHy','Միաժամանակ փոխել մագնիսը, հեռավորությունը և առարկաների նյութը՝ առանց գրանցման')
      );
      v_correct := 'C';
    end if;

    v_answer := to_jsonb(v_correct);
    v_parameters := jsonb_build_object('scenarioId', v_i1, 'construct', 'hypothesis_test_design');

  else
    raise exception 'unsupported_variant_generator:%', coalesce(v_generator, '<null>');
  end if;

  if v_prompt is null or v_answer is null or v_item_type is null then
    raise exception 'generator_incomplete_render';
  end if;

  -- Fingerprint is based on effective assessable content, not seed identity. This
  -- catches two different seeds/templates that accidentally render the same item.
  v_fingerprint := md5(
    v_family.skill_id::text || '|' ||
    regexp_replace(lower(v_prompt), '\s+', ' ', 'g') || '|' ||
    v_answer::text || '|' ||
    coalesce(v_options::text, '[]')
  );

  return jsonb_build_object(
    'templateId', v_template.id,
    'templateCode', v_template.code,
    'templateKind', v_template.template_kind,
    'templateVersion', v_template.template_version,
    'familyId', v_family.id,
    'familyCode', v_family.code,
    'skillId', v_family.skill_id,
    'generator', v_generator,
    'seed', p_seed,
    'itemType', v_item_type,
    'difficulty', v_difficulty,
    'promptHy', v_prompt,
    'parameters', v_parameters,
    'answer', v_answer,
    'tolerance', v_tolerance,
    'canonicalUnit', v_canonical_unit,
    'acceptedUnits', v_accepted_units,
    'options', v_options,
    'semanticFingerprint', v_fingerprint
  );
end;
$$;

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
  v_answer jsonb := p_render -> 'answer';
  v_option_count integer;
  v_unique_option_count integer;
begin
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
  ) then
    v_errors := array_append(v_errors, 'duplicate_effective_variant');
  end if;

  if exists (
    select 1 from public.items i
    where i.skill_id = v_skill_id
      and i.prompt_hy = v_prompt
      and i.retired_at is null
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

-- Service-role-only preview for auditable reproducibility tests and content-admin tooling.
create or replace function public.service_preview_item_variant(
  p_template_code text,
  p_seed text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_render jsonb;
  v_qa jsonb;
begin
  v_render := private.render_item_variant(p_template_code, p_seed);
  v_qa := private.validate_rendered_item_variant(v_render);
  return v_render || jsonb_build_object('qa', v_qa);
end;
$$;

-- Idempotently materialise one concrete variant. Generated items deliberately enter
-- review state and are not added to Practice/Diagnostic/Mastery pools here.
create or replace function public.service_materialize_item_variant(
  p_template_code text,
  p_seed text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, private
as $$
declare
  v_render jsonb;
  v_qa jsonb;
  v_template public.item_templates%rowtype;
  v_family public.item_families%rowtype;
  v_item_id uuid;
  v_code text;
  v_variant_key text;
  v_difficulty integer;
  v_item_family text;
  v_source_reference text;
  v_accepted_units text[] := array[]::text[];
begin
  select * into v_template from public.item_templates where code = p_template_code and status = 'active';
  if not found then raise exception 'active_template_not_found'; end if;
  select * into v_family from public.item_families where id = v_template.item_family_id;
  if not found then raise exception 'item_family_not_found'; end if;

  v_variant_key := 'seed:' || p_seed;
  select id into v_item_id
  from public.items
  where item_template_id = v_template.id
    and variant_key = v_variant_key;
  if found then
    return jsonb_build_object('itemId', v_item_id, 'created', false, 'templateCode', p_template_code, 'seed', p_seed);
  end if;

  v_render := private.render_item_variant(p_template_code, p_seed);
  v_qa := private.validate_rendered_item_variant(v_render);
  if coalesce((v_qa ->> 'valid')::boolean, false) is not true then
    raise exception 'generated_variant_qa_failed:%', v_qa::text;
  end if;

  v_code := p_template_code || '-V-' || upper(substr(md5(p_seed), 1, 10));
  v_difficulty := (v_render ->> 'difficulty')::integer;
  v_item_family := coalesce(v_template.generation_config ->> 'itemFamily', 'application');
  v_source_reference := coalesce(v_template.generation_config ->> 'sourceReference', 'Generated Chapter I variant; provisional pending Sprint 11D review');

  insert into public.items(
    skill_id, item_type, prompt_hy, prompt_en, stimulus, difficulty, config, status,
    code, difficulty_band, item_family, source_reference, validation_state,
    review_status, item_template_id, variant_key, variant_seed, variant_parameters,
    variant_fingerprint
  ) values (
    v_family.skill_id,
    (v_render ->> 'itemType')::item_type,
    v_render ->> 'promptHy',
    null,
    '{}'::jsonb,
    v_difficulty,
    jsonb_build_object(
      'bank','PHY7-U01-11C-GENERATED',
      'pilot_ready',false,
      'generation','deterministic_server_side',
      'generator',v_render ->> 'generator',
      'generatorVersion',v_render ->> 'templateVersion',
      'semanticFingerprint',v_render ->> 'semanticFingerprint',
      'validation_state','provisional_no_sme_review'
    ),
    'review'::content_status,
    v_code,
    case when v_difficulty <= 1 then 'foundation' when v_difficulty <= 3 then 'core' else 'challenge' end,
    v_item_family,
    v_source_reference,
    'provisional_no_sme_review',
    'needs_review',
    v_template.id,
    v_variant_key,
    p_seed,
    v_render -> 'parameters',
    v_render ->> 'semanticFingerprint'
  ) returning id into v_item_id;

  if jsonb_typeof(coalesce(v_render -> 'acceptedUnits','[]'::jsonb)) = 'array' then
    select coalesce(array_agg(x.value), array[]::text[])
      into v_accepted_units
    from jsonb_array_elements_text(coalesce(v_render -> 'acceptedUnits','[]'::jsonb)) as x(value);
  end if;

  insert into public.item_answer_keys(item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code)
  values (
    v_item_id,
    v_render -> 'answer',
    nullif(v_render ->> 'tolerance','')::numeric,
    nullif(v_render ->> 'canonicalUnit',''),
    v_accepted_units,
    'generated_variant'
  );

  insert into public.item_options(item_id, option_key, content_hy, display_order)
  select
    v_item_id,
    x.elem ->> 'optionKey',
    x.elem ->> 'contentHy',
    x.ord::integer
  from jsonb_array_elements(coalesce(v_render -> 'options','[]'::jsonb)) with ordinality as x(elem, ord);

  return jsonb_build_object(
    'itemId', v_item_id,
    'created', true,
    'status', 'review',
    'templateCode', p_template_code,
    'variantKey', v_variant_key,
    'seed', p_seed,
    'semanticFingerprint', v_render ->> 'semanticFingerprint',
    'qa', v_qa
  );
end;
$$;

revoke all on function public.service_preview_item_variant(text,text) from public, anon, authenticated;
revoke all on function public.service_materialize_item_variant(text,text) from public, anon, authenticated;
grant execute on function public.service_preview_item_variant(text,text) to service_role;
grant execute on function public.service_materialize_item_variant(text,text) to service_role;

-- ---------------------------------------------------------------------------
-- Chapter I generator families/templates. These are deliberately narrow,
-- construct-specific generators. They do not attempt to auto-generate every skill.
-- ---------------------------------------------------------------------------

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S07-F-LENGTH-CONVERSION', 'Երկարության միավորների փոխարկում', 'Deterministic parameterised length-to-metre conversion family.', jsonb_build_object('phase','11C','construct','unit_conversion')
from public.skills where code='PHY7-U01-S07'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S07-F-TIME-CONVERSION', 'Ժամանակի միավորների փոխարկում', 'Deterministic parameterised time-to-second conversion family.', jsonb_build_object('phase','11C','construct','unit_conversion')
from public.skills where code='PHY7-U01-S07'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S07-F-VOLUME-CONVERSION', 'Ծավալի միավորների փոխարկում', 'Deterministic parameterised millilitre-to-litre conversion family.', jsonb_build_object('phase','11C','construct','unit_conversion')
from public.skills where code='PHY7-U01-S07'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S08-F-SCALE-DIVISION', 'Սանդղակի բաժանման արժեք', 'Deterministic parameterised scale-division family.', jsonb_build_object('phase','11C','construct','scale_division')
from public.skills where code='PHY7-U01-S08'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S08-F-SCALE-READING', 'Սանդղակի ցուցմունքի ընթերցում', 'Deterministic parameterised scale-reading family.', jsonb_build_object('phase','11C','construct','scale_reading')
from public.skills where code='PHY7-U01-S08'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S09-F-MEASUREMENT-ERROR', 'Չափման սխալի գնահատում', 'Deterministic parameterised half-division measurement-error family.', jsonb_build_object('phase','11C','construct','measurement_error')
from public.skills where code='PHY7-U01-S09'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S10-F-DISPLACEMENT-VOLUME', 'Ծավալը ջրի տեղահանմամբ', 'Deterministic parameterised displacement-volume family.', jsonb_build_object('phase','11C','construct','displacement_volume')
from public.skills where code='PHY7-U01-S10'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S10-F-SHEET-THICKNESS', 'Մեկ թերթի հաստության անուղղակի չափում', 'Deterministic parameterised indirect-measurement family.', jsonb_build_object('phase','11C','construct','indirect_measurement')
from public.skills where code='PHY7-U01-S10'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S04-F-OBSERVATION-EXPERIMENT-PARALLEL', 'Դիտում և փորձ — զուգահեռ համատեքստեր', 'Parallel-context family varying scenario rather than numbers.', jsonb_build_object('phase','11C','construct','observation_vs_experiment')
from public.skills where code='PHY7-U01-S04'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_families(skill_id, code, name_hy, description, metadata)
select id, 'PHY7-U01-S05-F-HYPOTHESIS-TEST-PARALLEL', 'Վարկածի ստուգում — զուգահեռ համատեքստեր', 'Parallel reasoning contexts for selecting a controlled hypothesis test.', jsonb_build_object('phase','11C','construct','hypothesis_test_design')
from public.skills where code='PHY7-U01-S05'
on conflict(code) do update set name_hy=excluded.name_hy, description=excluded.description, metadata=public.item_families.metadata || excluded.metadata, updated_at=now();

insert into public.item_templates(item_family_id, code, template_kind, template_version, generation_config, status)
select f.id, v.code, v.kind, 1, v.config, 'active'
from public.item_families f
join (values
  ('PHY7-U01-S07-F-LENGTH-CONVERSION','PHY7-U01-S07-T-LENGTH-TO-M','parameterized',jsonb_build_object('generator','s07_length_to_m_v1','difficulty',2,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — deterministic unit-conversion variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S07-F-TIME-CONVERSION','PHY7-U01-S07-T-TIME-TO-S','parameterized',jsonb_build_object('generator','s07_time_to_s_v1','difficulty',2,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — deterministic unit-conversion variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S07-F-VOLUME-CONVERSION','PHY7-U01-S07-T-VOLUME-TO-L','parameterized',jsonb_build_object('generator','s07_volume_to_l_v1','difficulty',3,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — deterministic unit-conversion variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S08-F-SCALE-DIVISION','PHY7-U01-S08-T-SCALE-DIVISION','parameterized',jsonb_build_object('generator','s08_scale_division_v1','difficulty',2,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — deterministic scale variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S08-F-SCALE-READING','PHY7-U01-S08-T-SCALE-READING','parameterized',jsonb_build_object('generator','s08_scale_reading_v1','difficulty',3,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — deterministic scale variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S09-F-MEASUREMENT-ERROR','PHY7-U01-S09-T-MEASUREMENT-ERROR','parameterized',jsonb_build_object('generator','s09_measurement_error_v1','difficulty',2,'itemFamily','reasoning','sourceReference','Grade 7 Physics Chapter I — deterministic measurement-error variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S10-F-DISPLACEMENT-VOLUME','PHY7-U01-S10-T-DISPLACEMENT-VOLUME','parameterized',jsonb_build_object('generator','s10_displacement_volume_v1','difficulty',2,'itemFamily','transfer','sourceReference','Grade 7 Physics Chapter I — deterministic displacement variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S10-F-SHEET-THICKNESS','PHY7-U01-S10-T-SHEET-THICKNESS','parameterized',jsonb_build_object('generator','s10_sheet_thickness_v1','difficulty',3,'itemFamily','transfer','sourceReference','Grade 7 Physics Chapter I — deterministic indirect-measurement variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S04-F-OBSERVATION-EXPERIMENT-PARALLEL','PHY7-U01-S04-T-OBS-EXP-PARALLEL','parallel',jsonb_build_object('generator','s04_observation_experiment_parallel_v1','difficulty',2,'itemFamily','application','sourceReference','Grade 7 Physics Chapter I — parallel-context method-classification variant; provisional pending Sprint 11D review')),
  ('PHY7-U01-S05-F-HYPOTHESIS-TEST-PARALLEL','PHY7-U01-S05-T-HYPOTHESIS-TEST-PARALLEL','parallel',jsonb_build_object('generator','s05_hypothesis_test_parallel_v1','difficulty',3,'itemFamily','reasoning','sourceReference','Grade 7 Physics Chapter I — parallel-context scientific-method variant; provisional pending Sprint 11D review'))
) as v(family_code, code, kind, config)
  on f.code = v.family_code
on conflict(code) do update
set item_family_id=excluded.item_family_id,
    template_kind=excluded.template_kind,
    template_version=excluded.template_version,
    generation_config=excluded.generation_config,
    status=excluded.status,
    updated_at=now();

-- Materialise a small proof set. These rows remain in review state and are not
-- added to any assessment pool. Sprint 11D decides whether they are approved,
-- revised, retired, and how many additional seeds are materialised per skill.
select public.service_materialize_item_variant('PHY7-U01-S07-T-LENGTH-TO-M','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S07-T-LENGTH-TO-M','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S07-T-TIME-TO-S','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S07-T-TIME-TO-S','11c-c');
select public.service_materialize_item_variant('PHY7-U01-S07-T-VOLUME-TO-L','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S07-T-VOLUME-TO-L','11c-c');
select public.service_materialize_item_variant('PHY7-U01-S08-T-SCALE-DIVISION','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S08-T-SCALE-DIVISION','11c-c');
select public.service_materialize_item_variant('PHY7-U01-S08-T-SCALE-READING','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S08-T-SCALE-READING','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S09-T-MEASUREMENT-ERROR','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S09-T-MEASUREMENT-ERROR','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S10-T-DISPLACEMENT-VOLUME','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S10-T-DISPLACEMENT-VOLUME','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S10-T-SHEET-THICKNESS','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S10-T-SHEET-THICKNESS','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S04-T-OBS-EXP-PARALLEL','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S04-T-OBS-EXP-PARALLEL','11c-b');
select public.service_materialize_item_variant('PHY7-U01-S05-T-HYPOTHESIS-TEST-PARALLEL','11c-a');
select public.service_materialize_item_variant('PHY7-U01-S05-T-HYPOTHESIS-TEST-PARALLEL','11c-b');
