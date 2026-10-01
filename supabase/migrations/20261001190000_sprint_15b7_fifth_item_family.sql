-- Sprint 15B.7 - the fifth governed, learner-inactive Chapter II
-- item family for PHY7-U02-S06 (diffusion explained through examples).
--
-- This additive authoring migration creates no assessment pool, blueprint,
-- pilot state or learner release. Every item, misconception and remediation
-- guide remains draft until the protected review lifecycle is completed.

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S06-F01-DIFFUSION-EXAMPLES',
  'Դիֆուզիայի ճանաչում և մասնիկային բացատրություն',
  'Դիֆուզիան ճանաչել որպես նյութերի ինքնաբերական խառնման երևույթ և առօրյա, փորձարարական ու բնության օրինակները բացատրել մոլեկուլների անկանոն շարժմամբ ու փոխադարձ ներթափանցմամբ։',
  jsonb_build_object(
    'sprint', '15B.7',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'diffusion_examples',
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S07_state_rate_comparison',
      'S08_temperature_speed_relation',
      'S09_thermometer_operation'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-31'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S06'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S06-F01-DIFFUSION-EXAMPLES'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է դիֆուզիայի երևույթը օրինակներում ճանաչելու և մասնիկների անկանոն շարժմամբ բացատրելու կարողությունը՝ առանց դիֆուզիայի արագությունների կամ ջերմաստիճանային կապի գնահատման։'
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
  'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.7',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'skillCode', 'PHY7-U02-S06',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S06-F01-DIFFUSION-EXAMPLES'
on conflict (code) do nothing;

with item_rows(
  code, prompt_hy, difficulty, variant_key, focus_key
) as (
  values
    (
      'PHY7-U02-S06-I01',
      'Ո՞ր նկարագրությունն է ճիշտ սահմանում դիֆուզիան։',
      1, 'diffusion_examples:01', 'diffusion_definition'
    ),
    (
      'PHY7-U02-S06-I02',
      'Պղնձարջասպի կապույտ լուծույթը զգուշորեն լցրել են ջրի տակ՝ սկզբում պահպանելով հստակ սահմանը։ Մի քանի շաբաթ անց ամբողջ հեղուկը դարձել է համաչափ բաց կապույտ՝ առանց խառնելու։ Ո՞ր բացատրությունն է ճիշտ։',
      2, 'diffusion_examples:02', 'copper_sulfate_water_interpenetration'
    ),
    (
      'PHY7-U02-S06-I03',
      'Բանջարեղենը աղաջրում պահելիս որոշ ժամանակ անց աղը հայտնվում է նաև բանջարեղենի ներսում։ Ինչպե՞ս է սա բացատրվում։',
      2, 'diffusion_examples:03', 'pickling_diffusion'
    ),
    (
      'PHY7-U02-S06-I04',
      'Մարդու թոքերում թթվածինը օդից անցնում է արյան մեջ։ Այս օրինակը դիֆուզիայի մասին ի՞նչ է ցույց տալիս։',
      3, 'diffusion_examples:04', 'oxygen_into_blood'
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
  'single_choice'::public.item_type,
  row.prompt_hy,
  null,
  '{}'::jsonb,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B7-DRAFT',
    'sprint', '15B.7',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'answerPositionQaContract', 'family-balanced-v1',
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-31'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'diffusion_examples',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(4); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-31',
  'provisional_no_sme_review',
  'needs_review',
  1,
  template.id,
  row.variant_key,
  null,
  jsonb_build_object(
    'focusKey', row.focus_key,
    'authoredCatalog', true
  ),
  md5(row.code || ':draft-placeholder')
from item_rows row
join public.skills skill on skill.code = 'PHY7-U02-S06'
join public.item_templates template on template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S06-I01', 'A', 'Նյութերի ինքնաբերական խառնումը, երբ մի նյութի մոլեկուլները ներթափանցում են մյուս նյութի միջմոլեկուլային տարածություններ։', 1),
    ('PHY7-U02-S06-I01', 'B', 'Միայն արտաքին խառնիչով նյութերի մեծ մասերի տեղաշարժը։', 2),
    ('PHY7-U02-S06-I01', 'C', 'Տաքացնելիս նյութի՝ պինդ վիճակից հեղուկ վիճակի անցումը։', 3),
    ('PHY7-U02-S06-I01', 'D', 'Երկու նյութերից նոր նյութ առաջացնող քիմիական փոխազդեցությունը։', 4),
    ('PHY7-U02-S06-I02', 'A', 'Պղնձարջասպի լուծույթը, ջրից թեթև լինելով, ամբողջ շերտով բարձրացել է վերև։', 1),
    ('PHY7-U02-S06-I02', 'B', 'Ջրի և լուծույթի մոլեկուլների անկանոն շարժման պատճառով դրանք փոխադարձաբար ներթափանցել են միմյանց միջմոլեկուլային տարածություններ։', 2),
    ('PHY7-U02-S06-I02', 'C', 'Կապույտ գույնը ժամանակի ընթացքում պարզապես տարածվել է՝ առանց որևէ մոլեկուլի տեղաշարժի։', 3),
    ('PHY7-U02-S06-I02', 'D', 'Ջրի մոլեկուլները կանգ են առել, իսկ լուծույթը մեկ ամբողջական շերտով զբաղեցրել է անոթը։', 4),
    ('PHY7-U02-S06-I03', 'A', 'Աղը ծանրության ուժից ամբողջությամբ ընկնում է միայն անոթի հատակին։', 1),
    ('PHY7-U02-S06-I03', 'B', 'Աղաջուրը բանջարեղենը ներսից հալեցնում է։', 2),
    ('PHY7-U02-S06-I03', 'C', 'Լուծված աղի մասնիկները շարունակական անկանոն շարժման հետևանքով ներթափանցում են բանջարեղենի մեջ։ Սա դիֆուզիա է։', 3),
    ('PHY7-U02-S06-I03', 'D', 'Աղը բանջարեղենի ներսում առաջանում է որպես նոր քիմիական նյութ։', 4),
    ('PHY7-U02-S06-I04', 'A', 'Թթվածինը արյան մեջ է անցնում միայն այն պատճառով, որ սիրտը մեխանիկորեն խառնում է օդն ու արյունը։', 1),
    ('PHY7-U02-S06-I04', 'B', 'Օդի ամբողջ շերտը մեկ զանգվածով մտնում է արյան անոթների մեջ։', 2),
    ('PHY7-U02-S06-I04', 'C', 'Արյան մեջ թթվածինը առաջանում է մեկ այլ նյութի քիմիական քայքայումից։', 3),
    ('PHY7-U02-S06-I04', 'D', 'Թթվածնի մասնիկները իրենց շարժման հետևանքով ներթափանցում են օդից արյան մեջ՝ դիֆուզիայի միջոցով։', 4)
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
    ('PHY7-U02-S06-I01', 'A'),
    ('PHY7-U02-S06-I02', 'B'),
    ('PHY7-U02-S06-I03', 'C'),
    ('PHY7-U02-S06-I04', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'diffusion_examples'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S06'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = true;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'diffusion_requires_external_mixing',
      'Դիֆուզիան միայն արտաքին խառնումով հնարավոր համարելը',
      'Սովորողը կարծում է, թե նյութերը կարող են խառնվել միայն խառնելու, պոմպելու կամ մեկ ամբողջական շերտը տեղաշարժելու միջոցով և անտեսում է մասնիկների ինքնաբերական շարժումը։'
    ),
    (
      'diffusion_is_bulk_layer_motion',
      'Դիֆուզիան նյութի ամբողջական շերտի տեղաշարժ համարելը',
      'Սովորողը դիֆուզիայի մասնիկային փոխադարձ ներթափանցումը փոխարինում է մի նյութի ամբողջ շերտի միակողմանի տեղաշարժով կամ ծանրության ազդեցությամբ։'
    ),
    (
      'diffusion_without_particle_transfer',
      'Դիֆուզիան առանց մասնիկների տեղափոխության պատկերացնելը',
      'Սովորողը տեսանելի գույնի կամ սահմանագծի փոփոխությունը համարում է ինքնուրույն երևույթ և չի կապում այն մասնիկների շարժման ու փոխադարձ ներթափանցման հետ։'
    ),
    (
      'diffusion_is_phase_or_chemical_change',
      'Դիֆուզիան վիճակի կամ քիմիական փոփոխության հետ շփոթելը',
      'Սովորողը դիֆուզիան նույնացնում է հալման, քիմիական ռեակցիայի կամ նոր նյութի առաջացման հետ։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy, 'draft'
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S06'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S06-I01', 'B', 'diffusion_requires_external_mixing', 'Դիֆուզիան սխալմամբ սահմանվում է որպես միայն արտաքին խառնիչով իրականացվող մեծածավալ տեղաշարժ։'),
    ('PHY7-U02-S06-I01', 'C', 'diffusion_is_phase_or_chemical_change', 'Դիֆուզիան սխալմամբ նույնացվում է հալման հետ։'),
    ('PHY7-U02-S06-I01', 'D', 'diffusion_is_phase_or_chemical_change', 'Դիֆուզիան սխալմամբ նույնացվում է նոր նյութ առաջացնող քիմիական փոխազդեցության հետ։'),
    ('PHY7-U02-S06-I02', 'A', 'diffusion_is_bulk_layer_motion', 'Մասնիկների փոխադարձ ներթափանցումը փոխարինվում է լուծույթի ամբողջ շերտի վեր բարձրանալով։'),
    ('PHY7-U02-S06-I02', 'C', 'diffusion_without_particle_transfer', 'Գույնի տարածումը սխալմամբ առանձնացվում է այն առաջացնող մոլեկուլների տեղափոխությունից։'),
    ('PHY7-U02-S06-I02', 'D', 'diffusion_is_bulk_layer_motion', 'Փոխադարձ մասնիկային ներթափանցման փոխարեն ենթադրվում է մեկ շերտի ամբողջական տեղաշարժ։'),
    ('PHY7-U02-S06-I03', 'A', 'diffusion_is_bulk_layer_motion', 'Աղի ներթափանցումը սխալմամբ բացատրվում է միայն ծանրության ուժով դեպի անոթի հատակը շարժմամբ։'),
    ('PHY7-U02-S06-I03', 'B', 'diffusion_is_phase_or_chemical_change', 'Դիֆուզիան սխալմամբ ներկայացվում է որպես բանջարեղենի հալում։'),
    ('PHY7-U02-S06-I03', 'D', 'diffusion_is_phase_or_chemical_change', 'Ներթափանցած աղի մասնիկների փոխարեն ենթադրվում է նոր նյութի առաջացում։'),
    ('PHY7-U02-S06-I04', 'A', 'diffusion_requires_external_mixing', 'Թթվածնի անցումը սխալմամբ կապվում է միայն սրտի մեխանիկական խառնման հետ։'),
    ('PHY7-U02-S06-I04', 'B', 'diffusion_is_bulk_layer_motion', 'Մասնիկների շարժման փոխարեն ենթադրվում է օդի ամբողջ շերտի զանգվածային անցում։'),
    ('PHY7-U02-S06-I04', 'C', 'diffusion_is_phase_or_chemical_change', 'Թթվածնի ներթափանցման փոխարեն ենթադրվում է նրա քիմիական առաջացում արյան մեջ։')
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

-- Compute the semantic fingerprint from the complete assessable content:
-- skill + normalized prompt + answer + ordered answer options.
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
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
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
  '15B.7 հինգերորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.7 հինգերորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս բացատրել դիֆուզիան օրինակով',
  'Նախ որոշիր՝ արդյոք երկու նյութեր ինքնաբերաբար խառնվում են առանց արտաքին խառնման։ Այնուհետև նկարագրիր մասնիկային մեխանիզմը. երկու նյութերի մոլեկուլները շարունակ շարժվում են անկանոն և փոխադարձաբար ներթափանցում են միմյանց միջմոլեկուլային տարածություններ։ Օրինակի տեսանելի արդյունքը կապիր հենց այդ մասնիկային շարժման հետ։ Մի շփոթիր դիֆուզիան նյութի ամբողջական շերտի տեղաշարժի, վիճակի փոփոխության կամ քիմիական ռեակցիայի հետ։',
  'Փնտրիր երկու նշան՝ ինքնաբերական խառնում և մասնիկների փոխադարձ ներթափանցում։',
  'Բացատրության մեջ նշիր ոչ միայն դիտվող արդյունքը, այլ նաև մոլեկուլների անկանոն շարժումը, որը հանգեցնում է այդ արդյունքին։',
  'Օրինակ՝ պղնձարջասպի լուծույթի և ջրի սահմանը ժամանակի ընթացքում լղոզվում է, որովհետև երկու հեղուկների մոլեկուլները անկանոն շարժվում և փոխադարձաբար ներթափանցում են միմյանց միջմոլեկուլային տարածություններ։ Արդյունքում ամբողջ հեղուկը դառնում է համաչափ բաց կապույտ՝ առանց արտաքին խառնելու։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.7',
    'learnerVisible', false,
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-31',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
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
  '15B.7 հինգերորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
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
  on family.code = 'PHY7-U02-S06-F01-DIFFUSION-EXAMPLES'
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
    'chapterIiItemFamilies', 5,
    'fifthFamilyDraftItems', 4,
    'fifthFamilyDraftGuides', 1,
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Գլուխ II-ի հինգերորդ ընտանիքը, չորս հարցերը և օգնության ուղեցույցը սևագիր են ու սովորողին անհասանելի։ Գնահատման ավազան կամ ձևանմուշ չի ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'questionFamiliesWithApprovedItems', 4,
    'draftFamiliesAwaitingReview', 1,
    'approvedItems', 16,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 4,
    'draftMisconceptionsAwaitingReview', 17
  ),
  notes = 'Առաջին չորս ընտանիքների տասնվեց հարցերը հաստատված են։ 15B.4-15B.6-ի օգնության ուղեցույցներն ու տասներեք թյուրիմացությունները դեռ սևագիր են, իսկ 15B.7-ի հինգերորդ ընտանիքի չորս հարցերը, չորս թյուրիմացությունները և օգնության ուղեցույցը սպասում են ստուգման։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'content_qa_passed';

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.item_templates template
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and template.generation_config->>'answerPositionQaContract' = 'family-balanced-v1'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B7_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'answerPositionQaContract' = 'family-balanced-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B7_draft_item_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION';
  if v_count <> 16 then
    raise exception '15B7_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION';
  if v_count <> 12 then
    raise exception '15B7_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from (
    select answer_key.answer #>> '{}' as correct_key, count(*) as key_count
    from public.item_answer_keys answer_key
    join public.items item on item.id = answer_key.item_id
    join public.item_templates template on template.id = item.item_template_id
    where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    group by answer_key.answer #>> '{}'
  ) distribution
  where distribution.correct_key in ('A', 'B', 'C', 'D')
    and distribution.key_count = 1;
  if v_count <> 4 then
    raise exception '15B7_answer_position_balance_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
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
    raise exception '15B7_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION';
  if v_count <> 4 then
    raise exception '15B7_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B7_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B7_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B7_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T01-EXPLAIN-DIFFUSION';
  if v_count <> 0 then
    raise exception '15B7_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B7_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B7_blueprint_boundary_failed:%', v_count;
  end if;
end $$;

notify pgrst, 'reload schema';
