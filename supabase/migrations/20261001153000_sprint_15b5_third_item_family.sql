-- Sprint 15B.5 - create the third governed, learner-inactive Chapter II
-- item family for PHY7-U02-S04 (molecular scale and small-particle measurement).
--
-- This additive authoring migration creates no assessment pool, blueprint,
-- pilot state or learner release. Every item, misconception and remediation
-- guide remains draft until the protected review lifecycle is completed.

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S04-F01-MOLECULAR-SCALE-MEASUREMENT',
  'Մոլեկուլների չափերի համեմատում և փոքր մասնիկների չափում',
  'Անգստրեմը կապել մետրի հետ, համեմատել մոլեկուլների չափերը տրված տվյալներով և մեկ փոքր մասնիկի չափը որոշել շարքի ընդհանուր երկարությունը մասնիկների թվին բաժանելով։',
  jsonb_build_object(
    'sprint', '15B.5',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'molecular_scale_comparison_and_measurement',
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8-9, տպագիր էջեր 27-29'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S04'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S04-F01-MOLECULAR-SCALE-MEASUREMENT'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է մոլեկուլների չափերի ներկայացումն ու համեմատությունը և փոքր նույնական մասնիկների չափի որոշման պարզ եղանակը։'
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
  'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.5',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'skillCode', 'PHY7-U02-S04',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S04-F01-MOLECULAR-SCALE-MEASUREMENT'
on conflict (code) do nothing;

with item_rows(
  code, prompt_hy, difficulty, variant_key, focus_key, correct_key
) as (
  values
    (
      'PHY7-U02-S04-I01',
      '1 Å (անգստրեմ) ո՞ր մեծությանն է հավասար։',
      1, 'molecular_scale_measurement:01', 'angstrom_to_metre', 'A'
    ),
    (
      'PHY7-U02-S04-I02',
      'Ջրածնի մոլեկուլի տրամագիծը 2,5 Å է, թթվածնինը՝ 2,8 Å, իսկ ջրինը՝ 3,6 Å։ Ո՞ր դասավորությունն է ճիշտ՝ փոքրից մեծ։',
      2, 'molecular_scale_measurement:02', 'molecule_size_order', 'A'
    ),
    (
      'PHY7-U02-S04-I03',
      'Եթե խնձորը մեծացնենք այնքան, որ դառնա Երկրագնդի չափ, ապա նույնքան մեծացված ատոմը մոտավորապես ինչի՞ չափ կլինի։',
      2, 'molecular_scale_measurement:03', 'scale_analogy', 'A'
    ),
    (
      'PHY7-U02-S04-I04',
      'Քանոնի երկայնքով կողք կողքի դասավորված 24 միատեսակ փոքր գնդիկների շարքի երկարությունը 48 մմ է։ Որքա՞ն է մեկ գնդիկի տրամագիծը։',
      2, 'molecular_scale_measurement:04', 'row_average_measurement', 'A'
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
    'bank', 'PHY7-U02-15B5-DRAFT',
    'sprint', '15B.5',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8-9, տպագիր էջեր 27-29'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'scale_comparison_and_measurement',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(2); Ֆիզիկա 7 (2023), Գլուխ II, §8-9, տպագիր էջեր 27-29',
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
join public.skills skill on skill.code = 'PHY7-U02-S04'
join public.item_templates template on template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S04-I01', 'A', '10⁻¹⁰ մ', 1),
    ('PHY7-U02-S04-I01', 'B', '10⁻⁸ մ', 2),
    ('PHY7-U02-S04-I01', 'C', '10⁻⁶ մ', 3),
    ('PHY7-U02-S04-I01', 'D', '10⁻³ մ', 4),
    ('PHY7-U02-S04-I02', 'A', 'ջրածին < թթվածին < ջուր', 1),
    ('PHY7-U02-S04-I02', 'B', 'ջուր < թթվածին < ջրածին', 2),
    ('PHY7-U02-S04-I02', 'C', 'թթվածին < ջրածին < ջուր', 3),
    ('PHY7-U02-S04-I02', 'D', 'ջրածին < ջուր < թթվածին', 4),
    ('PHY7-U02-S04-I03', 'A', 'Խնձորի չափ։', 1),
    ('PHY7-U02-S04-I03', 'B', 'Ավազահատիկի չափ։', 2),
    ('PHY7-U02-S04-I03', 'C', 'Մարդու հասակի չափ։', 3),
    ('PHY7-U02-S04-I03', 'D', 'Երկրագնդի չափ։', 4),
    ('PHY7-U02-S04-I04', 'A', '2 մմ', 1),
    ('PHY7-U02-S04-I04', 'B', '0,5 մմ', 2),
    ('PHY7-U02-S04-I04', 'C', '24 մմ', 3),
    ('PHY7-U02-S04-I04', 'D', '48 մմ', 4)
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
    ('PHY7-U02-S04-I01', 'A'),
    ('PHY7-U02-S04-I02', 'A'),
    ('PHY7-U02-S04-I03', 'A'),
    ('PHY7-U02-S04-I04', 'A')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'molecular_scale_comparison_and_measurement'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S04'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = true;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'angstrom_unit_exponent_confusion',
      'Անգստրեմի միավորի աստիճանը շփոթելը',
      'Սովորողը 1 Å = 10⁻⁸ սմ հավասարությունը շփոթում է մետրով արտահայտության հետ կամ սխալ է փոխարկում այն՝ 1 Å = 10⁻¹⁰ մ։'
    ),
    (
      'molecular_size_order_confusion',
      'Մոլեկուլների չափերի համեմատության ուղղությունը շփոթելը',
      'Սովորողը սխալ է դասավորում նույն միավորով տրված մոլեկուլների տրամագծերը կամ շրջում է «փոքրից մեծ» պահանջը։'
    ),
    (
      'molecular_scale_analogy_confusion',
      'Ատոմի հարաբերական չափի համեմատությունը սխալ մեկնաբանելը',
      'Սովորողը չի պահպանում խնձոր–Երկրագունդ համեմատության նույն մեծացման գործակիցը և սխալ է գնահատում մեծացված ատոմի հարաբերական չափը։'
    ),
    (
      'particle_row_average_confusion',
      'Մեկ փոքր մասնիկի չափը շարքի ընդհանուր չափի հետ շփոթելը',
      'Սովորողը մեկ մասնիկի տրամագիծը գտնելիս շարքի ընդհանուր երկարությունը չի բաժանում մասնիկների թվին կամ բաժանումը կատարում է հակառակ հերթականությամբ։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy, 'draft'
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S04'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S04-I01', 'B', 'angstrom_unit_exponent_confusion', 'Սանտիմետրով 10⁻⁸ արտահայտությունը սխալմամբ ընդունվում է որպես մետրով արժեք։'),
    ('PHY7-U02-S04-I01', 'C', 'angstrom_unit_exponent_confusion', 'Անգստրեմի մետրով աստիճանը սխալ է ընտրվում։'),
    ('PHY7-U02-S04-I01', 'D', 'angstrom_unit_exponent_confusion', 'Անգստրեմը սխալմամբ մոտեցվում է միլիմետրի կարգին։'),
    ('PHY7-U02-S04-I02', 'B', 'molecular_size_order_confusion', 'Թվերը դասավորվում են մեծից փոքր՝ պահանջված ուղղության հակառակ։'),
    ('PHY7-U02-S04-I02', 'C', 'molecular_size_order_confusion', '2,8 Å արժեքը սխալմամբ համարվում է 2,5 Å-ից փոքր։'),
    ('PHY7-U02-S04-I02', 'D', 'molecular_size_order_confusion', '3,6 Å արժեքը սխալմամբ համարվում է 2,8 Å-ից փոքր։'),
    ('PHY7-U02-S04-I03', 'B', 'molecular_scale_analogy_confusion', 'Նույն մեծացման գործակիցը չի կիրառվում ատոմի նկատմամբ։'),
    ('PHY7-U02-S04-I03', 'C', 'molecular_scale_analogy_confusion', 'Մեծացված ատոմի հարաբերական չափը գերագնահատվում է։'),
    ('PHY7-U02-S04-I03', 'D', 'molecular_scale_analogy_confusion', 'Ատոմի չափը սխալմամբ նույնացվում է մեծացված խնձորի չափի հետ։'),
    ('PHY7-U02-S04-I04', 'B', 'particle_row_average_confusion', 'Մասնիկների թիվը բաժանվում է շարքի երկարությանը՝ ճիշտ հարաբերության փոխարեն։'),
    ('PHY7-U02-S04-I04', 'C', 'particle_row_average_confusion', 'Մեկ մասնիկի չափը սխալմամբ ընդունվում է շարքի երկարության կեսը։'),
    ('PHY7-U02-S04-I04', 'D', 'particle_row_average_confusion', 'Մեկ մասնիկի չափը նույնացվում է ամբողջ շարքի երկարության հետ։')
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
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
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
  '15B.5 երրորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.5 երրորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս գնահատել և համեմատել մոլեկուլների չափերը',
  'Նախ բոլոր չափերը գրիր նույն միավորով. 1 Å = 10⁻¹⁰ մ։ Համեմատելիս թվերը դասավորիր հարցում պահանջված ուղղությամբ։ Եթե չափում ես կողք կողքի դասավորված միատեսակ փոքր մասնիկների շարք, մեկ մասնիկի չափը գտնելու համար շարքի ընդհանուր երկարությունը բաժանիր մասնիկների թվին՝ d = L ÷ N։',
  'Ստուգիր՝ բոլոր չափերը նույն միավորո՞վ են տրված, և հարցը պահանջում է փոքրից մե՞ծ, թե՞ մեծից փոքր դասավորություն։',
  'Շարքով չափման դեպքում մի օգտագործիր ամբողջ շարքի երկարությունը որպես մեկ մասնիկի չափ. հաշվիր d = L ÷ N։',
  'Օրինակ՝ եթե 20 միատեսակ գնդիկների շարքի երկարությունը 40 մմ է, ապա մեկ գնդիկի տրամագիծը 40 մմ ÷ 20 = 2 մմ է։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.5',
    'learnerVisible', false,
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(2)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8-9, տպագիր էջեր 27-29',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
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
  '15B.5 երրորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
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
  on family.code = 'PHY7-U02-S04-F01-MOLECULAR-SCALE-MEASUREMENT'
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
    'chapterIiItemFamilies', 3,
    'thirdFamilyDraftItems', 4,
    'thirdFamilyDraftGuides', 1,
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Գլուխ II-ի երրորդ ընտանիքը, չորս հարցերը և օգնության ուղեցույցը սևագիր են ու սովորողին անհասանելի։ Գնահատման ավազան կամ ձևանմուշ չի ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'questionFamiliesWithApprovedItems', 2,
    'draftFamiliesAwaitingReview', 1,
    'approvedItems', 8,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 2,
    'draftMisconceptionsAwaitingReview', 9
  ),
  notes = 'Առաջին երկու ընտանիքների ութ հարցերը հաստատված են։ 15B.4-ի օգնության ուղեցույցն ու հինգ թյուրիմացությունները դեռ սևագիր են, իսկ 15B.5-ի երրորդ ընտանիքի չորս հարցերը, չորս թյուրիմացությունները և օգնության ուղեցույցը սպասում են ստուգման։',
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
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B5_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B5_draft_item_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE';
  if v_count <> 16 then
    raise exception '15B5_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE';
  if v_count <> 12 then
    raise exception '15B5_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
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
    raise exception '15B5_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE';
  if v_count <> 4 then
    raise exception '15B5_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B5_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B5_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE';
  if v_count <> 0 then
    raise exception '15B5_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B5_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B5_blueprint_boundary_failed:%', v_count;
  end if;
end $$;

notify pgrst, 'reload schema';
