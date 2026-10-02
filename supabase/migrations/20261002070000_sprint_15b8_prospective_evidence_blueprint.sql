-- Sprint 15B.8 - prospective evidence-blueprint governance and the sixth
-- learner-inactive Chapter II item family for PHY7-U02-S07.
--
-- The governance rule is deliberately prospective. Templates created before
-- the 2026-10-02 adoption checkpoint remain valid and do not need re-review.
-- New templates must declare a subject-neutral evidence blueprint, and items
-- attached to those templates must declare one distinct evidence purpose.
-- This migration creates no assessment pool, blueprint, pilot state or learner
-- release.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.item_templates'::regclass
      and conname = 'item_templates_prospective_evidence_blueprint_check'
  ) then
    alter table public.item_templates
      add constraint item_templates_prospective_evidence_blueprint_check
      check (
        created_at < '2026-10-02 07:00:00+00'::timestamptz
        or (
          generation_config @> '{"authoringProfileVersion":"haiedu-evidence-blueprint-v1","evidenceBlueprintPolicy":"distinct-purpose-v1"}'::jsonb
          and jsonb_typeof(coalesce(generation_config->'requiredEvidencePurposes', 'null'::jsonb)) = 'array'
          and case
            when jsonb_typeof(coalesce(generation_config->'requiredEvidencePurposes', 'null'::jsonb)) = 'array'
              then jsonb_array_length(generation_config->'requiredEvidencePurposes') between 1 and 4
            else false
          end
          and coalesce(
            generation_config->'requiredEvidencePurposes' <@
              '["core_understanding","application","misconception_diagnosis","transfer_reasoning"]'::jsonb,
            false
          )
        )
      );
  end if;
end $$;

create or replace function public.enforce_prospective_item_evidence_purpose()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_template_config jsonb;
  v_evidence_purpose text;
begin
  if new.item_template_id is null then
    return new;
  end if;

  select template.generation_config
  into v_template_config
  from public.item_templates template
  where template.id = new.item_template_id;

  if coalesce(v_template_config->>'authoringProfileVersion', '') <> 'haiedu-evidence-blueprint-v1' then
    return new;
  end if;

  if coalesce(new.config->>'authoringProfileVersion', '') <> 'haiedu-evidence-blueprint-v1' then
    raise exception 'prospective_authoring_profile_missing:%', coalesce(new.code, new.id::text)
      using errcode = '23514';
  end if;

  v_evidence_purpose := coalesce(new.config->>'evidencePurpose', '');
  if v_evidence_purpose not in (
    'core_understanding',
    'application',
    'misconception_diagnosis',
    'transfer_reasoning'
  ) then
    raise exception 'prospective_evidence_purpose_invalid:%:%', coalesce(new.code, new.id::text), v_evidence_purpose
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_prospective_item_evidence_purpose() from public;
revoke all on function public.enforce_prospective_item_evidence_purpose() from anon;
revoke all on function public.enforce_prospective_item_evidence_purpose() from authenticated;

drop trigger if exists enforce_prospective_item_evidence_purpose on public.items;
create trigger enforce_prospective_item_evidence_purpose
before insert or update of item_template_id, config on public.items
for each row execute function public.enforce_prospective_item_evidence_purpose();

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S07-F01-DIFFUSION-RATE-COMPARISON',
  'Դիֆուզիայի արագության համեմատում տարբեր ագրեգատային վիճակներում',
  'Համեմատել դիֆուզիայի արագությունը գազերում, հեղուկներում և պինդ մարմիններում, ճանաչել պինդ մարմիններում դանդաղ դիֆուզիայի փաստը և համեմատությունը բացատրել մասնիկների դասավորությամբ։',
  jsonb_build_object(
    'sprint', '15B.8',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'diffusion_rate_comparison_across_states',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S07-I01'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S07-I02'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S07-I03'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S07-I04')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S06_diffusion_definition_and_examples',
      'S08_temperature_speed_relation',
      'S09_thermometer_operation'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-32'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S07'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S07-F01-DIFFUSION-RATE-COMPARISON'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)'
  join public.curriculum_source_documents document
    on document.id = outcome.source_document_id
   and document.source_key = 'am_physics_grade7_programme_40n_36n'
  where run.reconciliation_key = 'physics7_u02_2026_08_14'
)
insert into public.item_family_curriculum_reconciliations (
  reconciliation_id, item_family_id, primary_learning_outcome_id,
  disposition, mapping_type, rationale
)
select reconciliation_id, item_family_id, learning_outcome_id,
       'new_family', 'direct',
       'Ընտանիքը ուղղակիորեն գնահատում է գազերում, հեղուկներում և պինդ մարմիններում դիֆուզիայի արագությունների համեմատումը՝ առանց ջերմաստիճանի ազդեցության գնահատման։'
from context
on conflict (reconciliation_id, item_family_id) do update set
  primary_learning_outcome_id = excluded.primary_learning_outcome_id,
  disposition = excluded.disposition,
  mapping_type = excluded.mapping_type,
  rationale = excluded.rationale,
  reviewed_at = now();

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.8',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'requiredEvidencePurposes', jsonb_build_array(
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    ),
    'familySizePolicy', 'outcome_appropriate',
    'skillCode', 'PHY7-U02-S07',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S07-F01-DIFFUSION-RATE-COMPARISON'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    (
      'PHY7-U02-S07-I01', 'single_choice',
      'Նույն ջերմաստիճանում գազերում, հեղուկներում և պինդ մարմիններում դիֆուզիայի արագությունների ո՞ր հաջորդականությունն է ճիշտ՝ ամենաարագից ամենադանդաղը։',
      1, 'diffusion_rate_comparison:01', 'state_rate_order',
      'core_understanding',
      'Ստուգում է երեք ագրեգատային վիճակներում դիֆուզիայի արագությունների հիմնական հաջորդականության իմացությունը։'
    ),
    (
      'PHY7-U02-S07-I02', 'single_choice',
      'Սենյակում օծանելիքի հոտը տարածվում է կարճ ժամանակում, պղնձարջասպի լուծույթն ու ջուրը միախառնվում են օրերի ընթացքում, իսկ կապարի և ոսկու թիթեղները 20 °C-ում 5 տարում փոխադարձաբար ներթափանցում են ընդամենը 1 մմ։ Ո՞ր եզրակացությունն է համապատասխանում այս դիտարկումներին։',
      2, 'diffusion_rate_comparison:02', 'observational_application',
      'application',
      'Պահանջում է դասագրքային երեք դիտարկումներից եզրակացնել դիֆուզիայի արագությունների հարաբերական կարգը։'
    ),
    (
      'PHY7-U02-S07-I03', 'true_false',
      'Դիֆուզիա տեղի է ունենում միայն գազերում և հեղուկներում, իսկ պինդ մարմիններում՝ ոչ։',
      2, 'diffusion_rate_comparison:03', 'solid_diffusion_misconception',
      'misconception_diagnosis',
      'Ուղղակիորեն բացահայտում է պինդ մարմիններում դիֆուզիայի բացակայության թյուր պատկերացումը։'
    ),
    (
      'PHY7-U02-S07-I04', 'single_choice',
      'Ինչո՞ւ է, ըստ դասագրքի, դիֆուզիան գազերում ավելի արագ ընթանում, քան հեղուկներում։',
      3, 'diffusion_rate_comparison:04', 'particle_spacing_reasoning',
      'transfer_reasoning',
      'Պահանջում է արագությունների համեմատությունը կապել մասնիկների միջև հեռավորությունների և փոխադարձ ներթափանցման հետ։'
    )
)
insert into public.items (
  skill_id, item_type, prompt_hy, prompt_en, stimulus, difficulty,
  config, status, code, difficulty_band, item_family, source_reference,
  validation_state, review_status, version_no, item_template_id,
  variant_key, variant_seed, variant_parameters, variant_fingerprint
)
select
  skill.id,
  row.item_type::public.item_type,
  row.prompt_hy,
  null,
  '{}'::jsonb,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B8-DRAFT',
    'sprint', '15B.8',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'answerPositionQaContract', 'family-balanced-v1',
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidencePurpose', row.evidence_purpose,
    'evidencePurposeRationaleHy', row.evidence_rationale_hy,
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-32'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'diffusion_rate_comparison_across_states',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, լրացուցիչ վերջնարդյունք 2(1); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-32',
  'provisional_no_sme_review',
  'needs_review',
  1,
  template.id,
  row.variant_key,
  null,
  jsonb_build_object(
    'focusKey', row.focus_key,
    'evidencePurpose', row.evidence_purpose,
    'authoredCatalog', true
  ),
  md5(row.code || ':draft-placeholder')
from item_rows row
join public.skills skill on skill.code = 'PHY7-U02-S07'
join public.item_templates template on template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S07-I01', 'A', 'Գազերում, ապա հեղուկներում, ապա պինդ մարմիններում։', 1),
    ('PHY7-U02-S07-I01', 'B', 'Պինդ մարմիններում, ապա հեղուկներում, ապա գազերում։', 2),
    ('PHY7-U02-S07-I01', 'C', 'Հեղուկներում, ապա գազերում, ապա պինդ մարմիններում։', 3),
    ('PHY7-U02-S07-I01', 'D', 'Բոլոր երեք վիճակներում դիֆուզիան նույն արագությամբ է ընթանում։', 4),
    ('PHY7-U02-S07-I02', 'A', 'Դիֆուզիայի արագությունը որոշվում է միայն նյութի գույնով։', 1),
    ('PHY7-U02-S07-I02', 'B', 'Դիֆուզիան գազերում ամենաարագն է, հեղուկներում՝ ավելի դանդաղ, իսկ պինդ մարմիններում՝ ամենադանդաղը։', 2),
    ('PHY7-U02-S07-I02', 'C', 'Դիֆուզիան պինդ մարմիններում ավելի արագ է, քան գազերում և հեղուկներում։', 3),
    ('PHY7-U02-S07-I02', 'D', 'Դիֆուզիան տեղի է ունենում միայն այն դեպքում, երբ նյութերը արտաքին ուժով խառնում են։', 4),
    ('PHY7-U02-S07-I04', 'A', 'Որովհետև գազի մոլեկուլները հեղուկի մոլեկուլներից միշտ ավելի մեծ են։', 1),
    ('PHY7-U02-S07-I04', 'B', 'Որովհետև հեղուկներում մոլեկուլների միջև ընդհանրապես տարածություններ չկան։', 2),
    ('PHY7-U02-S07-I04', 'C', 'Որովհետև գազերում մոլեկուլների միջև հեռավորություններն ավելի մեծ են, և փոխադարձ ներթափանցումն ավելի արագ է։', 3),
    ('PHY7-U02-S07-I04', 'D', 'Որովհետև գազերում դիֆուզիան առաջանում է միայն ծանրության ուժի ազդեցությամբ։', 4)
)
insert into public.item_options (
  item_id, option_key, content_hy, content_en, display_order
)
select item.id, row.option_key, row.content_hy, null, row.display_order
from option_rows row
join public.items item on item.code = row.item_code
on conflict (item_id, option_key) do nothing;

with answer_rows(item_code, correct_key) as (
  values
    ('PHY7-U02-S07-I01', 'A'),
    ('PHY7-U02-S07-I02', 'B'),
    ('PHY7-U02-S07-I04', 'C')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'diffusion_rate_comparison'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(false), null, null, '{}'::text[],
       'solid_diffusion_exists'
from public.items item
where item.code = 'PHY7-U02-S07-I03'
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S07'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = excluded.is_primary;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'diffusion_rate_same_in_all_states',
      'Դիֆուզիայի արագությունը բոլոր վիճակներում նույնն է',
      'Սովորողը չի տարբերակում մասնիկների դասավորության և շարժման ազատության ազդեցությունը դիֆուզիայի արագության վրա։'
    ),
    (
      'diffusion_rate_fastest_in_solids',
      'Դիֆուզիան ամենաարագն է պինդ մարմիններում',
      'Սովորողը մասնիկների մոտ դասավորված լինելը սխալմամբ մեկնաբանում է որպես ավելի արագ փոխադարձ ներթափանցում։'
    ),
    (
      'diffusion_rate_fastest_in_liquids',
      'Դիֆուզիան հեղուկներում ավելի արագ է, քան գազերում',
      'Սովորողը հեղուկի հոսելու հատկությունը սխալմամբ նույնացնում է դիֆուզիայի առավել մեծ արագության հետ։'
    ),
    (
      'diffusion_absent_in_solids',
      'Պինդ մարմիններում դիֆուզիա տեղի չի ունենում',
      'Սովորողը շատ դանդաղ ընթացքը սխալմամբ նույնացնում է երևույթի լրիվ բացակայության հետ։'
    ),
    (
      'diffusion_rate_requires_external_mixing',
      'Դիֆուզիան պահանջում է արտաքին խառնում',
      'Սովորողը դիֆուզիայի ինքնաբերական ընթացքը փոխարինում է արտաքին ուժով նյութերի խառնմամբ։'
    ),
    (
      'diffusion_rate_explained_by_unrelated_factor',
      'Դիֆուզիայի արագությունը բացատրվում է անկապ գործոնով',
      'Սովորողը մասնիկների միջև հեռավորության փոխարեն արագությունը կապում է նյութի գույնի, մոլեկուլի ենթադրյալ չափի կամ ծանրության ուժի հետ։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy,
       'draft'::public.content_status
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S07'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S07-I01', 'B', 'diffusion_rate_fastest_in_solids', 'Ամենաարագ ընթացքը սխալմամբ վերագրվում է պինդ մարմիններին։'),
    ('PHY7-U02-S07-I01', 'C', 'diffusion_rate_fastest_in_liquids', 'Հեղուկների հոսունությունը սխալմամբ վերագրվում է դիֆուզիայի առավել մեծ արագությանը։'),
    ('PHY7-U02-S07-I01', 'D', 'diffusion_rate_same_in_all_states', 'Երեք վիճակներում դիֆուզիայի արագությունների տարբերությունը չի ճանաչվում։'),
    ('PHY7-U02-S07-I02', 'A', 'diffusion_rate_explained_by_unrelated_factor', 'Ժամանակային տարբերությունը սխալմամբ կապվում է նյութի գույնի հետ։'),
    ('PHY7-U02-S07-I02', 'C', 'diffusion_rate_fastest_in_solids', 'Կապար–ոսկի փորձի շատ դանդաղ ընթացքը մեկնաբանվում է հակառակ ուղղությամբ։'),
    ('PHY7-U02-S07-I02', 'D', 'diffusion_rate_requires_external_mixing', 'Դիտված ինքնաբերական խառնումը սխալմամբ պայմանավորվում է արտաքին ուժով։'),
    ('PHY7-U02-S07-I03', 'true', 'diffusion_absent_in_solids', 'Պինդ մարմիններում շատ դանդաղ դիֆուզիան սխալմամբ համարվում է բացակա։'),
    ('PHY7-U02-S07-I04', 'A', 'diffusion_rate_explained_by_unrelated_factor', 'Գազերում արագ ընթացքը սխալմամբ կապվում է մոլեկուլների ենթադրյալ մեծ չափի հետ։'),
    ('PHY7-U02-S07-I04', 'B', 'diffusion_rate_explained_by_unrelated_factor', 'Հեղուկներում միջմոլեկուլային տարածությունների գոյությունը սխալմամբ ժխտվում է։'),
    ('PHY7-U02-S07-I04', 'D', 'diffusion_rate_explained_by_unrelated_factor', 'Դիֆուզիայի արագությունը սխալմամբ բացատրվում է միայն ծանրության ուժով։')
)
insert into public.item_misconception_mappings (
  item_id, misconception_id, response_key, mapping_note
)
select item.id, misconception.id, row.response_key, row.mapping_note
from mapping_rows row
join public.items item on item.code = row.item_code
join public.skills skill on skill.id = item.skill_id
join public.misconceptions misconception
  on misconception.skill_id = skill.id and misconception.code = row.misconception_code
on conflict (item_id, misconception_id, response_key) do nothing;

with corrected as (
  select
    item.id,
    md5(
      item.skill_id::text || '|' ||
      lower(regexp_replace(item.prompt_hy, '\s+', ' ', 'g')) || '|' ||
      answer_key.answer::text || '|' ||
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'optionKey', option_row.option_key,
            'contentHy', option_row.content_hy
          )
          order by option_row.display_order, option_row.option_key
        )::text
        from public.item_options option_row
        where option_row.item_id = item.id
      ), '[]')
    ) as semantic_fingerprint
  from public.items item
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
)
update public.items item
set variant_fingerprint = corrected.semantic_fingerprint,
    updated_at = now()
from corrected
where item.id = corrected.id
  and item.variant_fingerprint is distinct from corrected.semantic_fingerprint;

insert into public.item_versions (
  item_id, version_no, snapshot, change_summary, created_by
)
select
  item.id,
  1,
  jsonb_build_object(
    'item', to_jsonb(item),
    'options', coalesce((
      select jsonb_agg(to_jsonb(option_row) order by option_row.display_order, option_row.option_key)
      from public.item_options option_row
      where option_row.item_id = item.id
    ), '[]'::jsonb),
    'answerKey', to_jsonb(answer_key),
    'misconceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', misconception.code,
        'responseKey', mapping.response_key,
        'mappingNote', mapping.mapping_note
      ) order by mapping.response_key, misconception.code)
      from public.item_misconception_mappings mapping
      join public.misconceptions misconception on misconception.id = mapping.misconception_id
      where mapping.item_id = item.id
    ), '[]'::jsonb)
  ),
  '15B.8 հեռանկարային ապացուցողական սխեմայով վեցերորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.8 վեցերորդ սևագրի ստեղծում', true);
select set_config('app.remediation_lifecycle_action', 'draft_created', true);

insert into public.item_template_remediation_guides (
  item_template_id, trigger_error_code, guide_version, title_hy,
  strategy_hy, hint_1_hy, hint_2_hy, worked_example_hy,
  allowed_parameter_keys, status, metadata
)
select
  template.id,
  null,
  1,
  'Ինչպե՞ս համեմատել դիֆուզիայի արագությունը նյութի տարբեր վիճակներում',
  'Նույն ջերմաստիճանում համեմատելիս հիշիր ընդհանուր հաջորդականությունը՝ գազերում դիֆուզիան ամենաարագն է, հեղուկներում՝ ավելի դանդաղ, իսկ պինդ մարմիններում՝ ամենադանդաղը։ Պինդ մարմիններում դիֆուզիան չի բացակայում. այն պարզապես շատ դանդաղ է ընթանում։ Դասագրքում գազերի և հեղուկների տարբերությունը կապվում է գազերում մոլեկուլների միջև ավելի մեծ հեռավորությունների և ավելի արագ փոխադարձ ներթափանցման հետ։',
  'Սկսիր այս համեմատությունից՝ գազեր → հեղուկներ → պինդ մարմիններ՝ ամենաարագից ամենադանդաղը։',
  'Շատ դանդաղ ընթացքը մի՛ նույնացրու բացակայության հետ. կապարն ու ոսկին 20 °C-ում 5 տարում փոխադարձաբար ներթափանցել են 1 մմ։',
  'Օրինակ՝ օծանելիքի հոտը գազային միջավայրում արագ տարածվում է, հեղուկների ինքնաբերական միախառնումը պահանջում է օրեր, իսկ կապարի և ոսկու պինդ թիթեղների միջև դիֆուզիան տարիների ընթացքում հասնում է ընդամենը փոքր հեռավորության։ Ուստի նույն պայմաններում ընդհանուր կարգն է՝ գազեր, հեղուկներ, պինդ մարմիններ։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.8',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-32',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
  and not exists (
    select 1
    from public.item_template_remediation_guides guide
    where guide.item_template_id = template.id
      and guide.trigger_error_code is null
  );

insert into public.remediation_guide_authoring_versions (
  guide_scope, guide_source_id, authoring_version, lifecycle_status,
  content_snapshot, reference_metadata, change_rationale,
  actor_id, actor_role, actor_aal, published_runtime_version
)
select
  'template',
  guide.id,
  1,
  'draft',
  jsonb_build_object(
    'skillId', family.skill_id,
    'itemTemplateId', guide.item_template_id,
    'triggerErrorCode', null,
    'titleHy', guide.title_hy,
    'strategyHy', guide.strategy_hy,
    'hint1Hy', guide.hint_1_hy,
    'hint2Hy', guide.hint_2_hy,
    'workedExampleHy', guide.worked_example_hy,
    'allowedParameterKeys', to_jsonb(guide.allowed_parameter_keys),
    'metadata', guide.metadata
  ),
  coalesce(guide.metadata->'referenceMetadata', '{}'::jsonb),
  '15B.8 վեցերորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
  and guide.trigger_error_code is null
  and guide.status = 'draft'
  and not exists (
    select 1
    from public.remediation_guide_authoring_versions authoring
    where authoring.guide_scope = 'template'
      and authoring.guide_source_id = guide.id
  );

insert into public.curriculum_release_item_families (
  curriculum_release_id, item_family_id, skill_id, family_code_snapshot,
  name_hy_snapshot, description_snapshot, primary_learning_outcome_id,
  disposition_snapshot, mapping_type_snapshot, rationale_snapshot
)
select
  release.id,
  family.id,
  family.skill_id,
  family.code,
  family.name_hy,
  family.description,
  reconciliation.primary_learning_outcome_id,
  reconciliation.disposition,
  reconciliation.mapping_type,
  reconciliation.rationale
from public.curriculum_releases release
join public.curriculum_reconciliation_runs run
  on run.reconciliation_key = 'physics7_u02_2026_08_14'
join public.item_families family
  on family.code = 'PHY7-U02-S07-F01-DIFFUSION-RATE-COMPARISON'
join public.item_family_curriculum_reconciliations reconciliation
  on reconciliation.reconciliation_id = run.id
 and reconciliation.item_family_id = family.id
where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
on conflict (curriculum_release_id, item_family_id) do update set
  skill_id = excluded.skill_id,
  family_code_snapshot = excluded.family_code_snapshot,
  name_hy_snapshot = excluded.name_hy_snapshot,
  description_snapshot = excluded.description_snapshot,
  primary_learning_outcome_id = excluded.primary_learning_outcome_id,
  disposition_snapshot = excluded.disposition_snapshot,
  mapping_type_snapshot = excluded.mapping_type_snapshot,
  rationale_snapshot = excluded.rationale_snapshot;

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'chapterIiItemFamilies', 6,
    'sixthFamilyDraftItems', 4,
    'sixthFamilyDraftGuides', 1,
    'prospectiveAuthoringProfile', 'haiedu-evidence-blueprint-v1',
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Գլուխ II-ի վեցերորդ ընտանիքը հեռանկարային ապացուցողական սխեմայով ստեղծվել է սևագիր և սովորողին անհասանելի։ Գնահատման ավազան կամ ձևանմուշ չի ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'questionFamiliesWithApprovedItems', 5,
    'draftFamiliesAwaitingReview', 1,
    'approvedItems', 20,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 2,
    'draftMisconceptionsAwaitingReview', 23,
    'prospectiveAuthoringProfile', 'haiedu-evidence-blueprint-v1'
  ),
  notes = 'Առաջին հինգ ընտանիքների քսան հարցերը հաստատված են։ 15B.8-ի վեցերորդ ընտանիքի չորս հարցերը, վեց թյուրիմացությունները և օգնության ուղեցույցը սպասում են ստուգման։ 15B.7-ի օգնության ուղեցույցը և նախկին չհաստատված թյուրիմացությունները նույնպես մնում են սևագիր։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'content_qa_passed';

do $$
declare
  v_count integer;
  v_blocked boolean := false;
begin
  select count(*) into v_count
  from pg_constraint
  where conrelid = 'public.item_templates'::regclass
    and conname = 'item_templates_prospective_evidence_blueprint_check';
  if v_count <> 1 then
    raise exception '15B8_prospective_template_constraint_failed:%', v_count;
  end if;

  select count(*) into v_count
  from pg_trigger
  where tgrelid = 'public.items'::regclass
    and tgname = 'enforce_prospective_item_evidence_purpose'
    and not tgisinternal;
  if v_count <> 1 then
    raise exception '15B8_prospective_item_trigger_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_templates template
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'evidenceBlueprintPolicy' = 'distinct-purpose-v1'
    and template.generation_config->'requiredEvidencePurposes' =
      '["core_understanding","application","misconception_diagnosis","transfer_reasoning"]'::jsonb
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B8_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B8_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B8_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 3 then
    raise exception '15B8_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 1 then
    raise exception '15B8_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES';
  if v_count <> 12 then
    raise exception '15B8_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES';
  if v_count <> 10 then
    raise exception '15B8_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and item.variant_fingerprint = md5(
      item.skill_id::text || '|' ||
      lower(regexp_replace(item.prompt_hy, '\s+', ' ', 'g')) || '|' ||
      answer_key.answer::text || '|' ||
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'optionKey', option_check.option_key,
            'contentHy', option_check.content_hy
          )
          order by option_check.display_order, option_check.option_key
        )::text
        from public.item_options option_check
        where option_check.item_id = item.id
      ), '[]')
    );
  if v_count <> 4 then
    raise exception '15B8_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES';
  if v_count <> 4 then
    raise exception '15B8_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B8_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B8_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B8_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES';
  if v_count <> 0 then
    raise exception '15B8_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B8_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B8_blueprint_boundary_failed:%', v_count;
  end if;

  begin
    update public.items
    set config = config - 'evidencePurpose'
    where code = 'PHY7-U02-S07-I01';
  exception
    when check_violation then
      v_blocked := true;
  end;

  if not v_blocked then
    raise exception '15B8_prospective_item_rejection_probe_failed';
  end if;
end $$;

notify pgrst, 'reload schema';
