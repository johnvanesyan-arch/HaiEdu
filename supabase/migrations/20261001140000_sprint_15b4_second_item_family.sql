-- Sprint 15B.4 - create the second governed, learner-inactive Chapter II
-- item family for PHY7-U02-S03 (atom, molecule and chemical element).
--
-- This is an additive authoring migration only. It creates no assessment
-- pool, blueprint, pilot state or learner release. Every item, misconception
-- and remediation guide remains draft until the protected review lifecycle is
-- completed.

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S03-F01-ATOM-MOLECULE-ELEMENT',
  'Ատոմի, մոլեկուլի և քիմիական տարրի տարբերակում',
  'Տրված նկարագրությունից կամ պարզ բանաձևից տարբերակել առանձին ատոմը, երկու կամ ավելի ատոմներից կազմված մոլեկուլը և միևնույն տեսակի ատոմներից բաղկացած քիմիական տարրը։',
  jsonb_build_object(
    'sprint', '15B.4',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'atom_molecule_element_classification',
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 26-28'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S03'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S03-F01-ATOM-MOLECULE-ELEMENT'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)'
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
       'new_family', 'derived_supporting',
       'Ընտանիքը գնահատում է ատոմ–մոլեկուլ–քիմիական տարր հիմնարար տարբերակումը, որն աջակցում է նյութի մասնիկային կառուցվածքի ըմբռնմանը։'
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
  'PHY7-U02-S03-T01-CLASSIFY',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.4',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'skillCode', 'PHY7-U02-S03',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S03-F01-ATOM-MOLECULE-ELEMENT'
on conflict (code) do nothing;

with item_rows(
  code, prompt_hy, difficulty, variant_key, focus_key, correct_key
) as (
  values
    (
      'PHY7-U02-S03-I01',
      'H նշանով ներկայացված է ջրածնի մեկ առանձին մասնիկ։ Ո՞ր պնդումն է ճիշտ։',
      1, 'atom_molecule_element:01', 'single_hydrogen_atom', 'A'
    ),
    (
      'PHY7-U02-S03-I02',
      'Ջրածնի երկու ատոմ միացել են և կազմել H₂ մասնիկ։ Ո՞ր նկարագրությունն է ճիշտ։',
      2, 'atom_molecule_element:02', 'same_element_molecule', 'C'
    ),
    (
      'PHY7-U02-S03-I03',
      'Ջրի H₂O մոլեկուլը կազմված է ջրածնի երկու և թթվածնի մեկ ատոմից։ Այս օրինակից ո՞ր եզրակացությունն է ճիշտ։',
      2, 'atom_molecule_element:03', 'different_element_molecule', 'A'
    ),
    (
      'PHY7-U02-S03-I04',
      'Ո՞ր սահմանումն է ճիշտ համապատասխանում «քիմիական տարր» հասկացությանը։',
      2, 'atom_molecule_element:04', 'element_definition', 'A'
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
    'bank', 'PHY7-U02-15B4-DRAFT',
    'sprint', '15B.4',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 26-28'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'concept_classification',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(1), աջակցող հմտություն; Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 26-28',
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
join public.skills skill on skill.code = 'PHY7-U02-S03'
join public.item_templates template on template.code = 'PHY7-U02-S03-T01-CLASSIFY'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S03-I01', 'A', 'Այն ջրածնի ատոմ է։', 1),
    ('PHY7-U02-S03-I01', 'B', 'Այն ջրածնի մոլեկուլ է։', 2),
    ('PHY7-U02-S03-I01', 'C', 'Այն ջրի մոլեկուլ է։', 3),
    ('PHY7-U02-S03-I01', 'D', 'Այն երկու ատոմից կազմված մասնիկ է։', 4),
    ('PHY7-U02-S03-I02', 'A', 'Այն մեկ ջրածնի ատոմ է։', 1),
    ('PHY7-U02-S03-I02', 'B', 'Այն քիմիական տարր է, բայց մոլեկուլ չէ։', 2),
    ('PHY7-U02-S03-I02', 'C', 'Այն մոլեկուլ է՝ կազմված նույն տեսակի երկու ատոմից։', 3),
    ('PHY7-U02-S03-I02', 'D', 'Այն մոլեկուլ է՝ կազմված տարբեր տեսակի ատոմներից։', 4),
    ('PHY7-U02-S03-I03', 'A', 'Մոլեկուլը կարող է կազմված լինել տարբեր տեսակի ատոմներից։', 1),
    ('PHY7-U02-S03-I03', 'B', 'Յուրաքանչյուր մոլեկուլ պետք է կազմված լինի միայն նույն տեսակի ատոմներից։', 2),
    ('PHY7-U02-S03-I03', 'C', 'Երեք ատոմ միանալիս ստացվում է մեկ ատոմ։', 3),
    ('PHY7-U02-S03-I03', 'D', 'Մոլեկուլ կազմելիս ջրածնի և թթվածնի ատոմները դառնում են նույն տարրի ատոմներ։', 4),
    ('PHY7-U02-S03-I04', 'A', 'Միևնույն տեսակի ատոմներից բաղկացած նյութ։', 1),
    ('PHY7-U02-S03-I04', 'B', 'Երկու կամ ավելի ատոմներից կազմված ցանկացած կայուն մասնիկ։', 2),
    ('PHY7-U02-S03-I04', 'C', 'Նյութի քիմիական հատկություններով օժտված ամենափոքր մասնիկ։', 3),
    ('PHY7-U02-S03-I04', 'D', 'Ցանկացած առանձին ատոմ՝ անկախ նրա տեսակից։', 4)
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
    ('PHY7-U02-S03-I01', 'A'),
    ('PHY7-U02-S03-I02', 'C'),
    ('PHY7-U02-S03-I03', 'A'),
    ('PHY7-U02-S03-I04', 'A')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'atom_molecule_element_classification'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S03'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = true;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'atom_molecule_confusion',
      'Ատոմն ու մոլեկուլը նույնացնելը',
      'Սովորողը չի տարբերակում առանձին ատոմը երկու կամ ավելի միացած ատոմներից կազմված մոլեկուլից։'
    ),
    (
      'atom_element_confusion',
      'Ատոմն ու քիմիական տարրը նույնացնելը',
      'Սովորողը առանձին ատոմը նույնացնում է միևնույն տեսակի ատոմներից բաղկացած նյութի՝ քիմիական տարրի հետ։'
    ),
    (
      'element_molecule_confusion',
      'Քիմիական տարրն ու մոլեկուլը նույնացնելը',
      'Սովորողը քիմիական տարրը համարում է երկու կամ ավելի ատոմներից կազմված մասնիկ՝ անտեսելով միևնույն տեսակի ատոմներից բաղկացած նյութ լինելու պայմանը։'
    ),
    (
      'molecule_atom_composition_confusion',
      'Մոլեկուլի ատոմային կազմը սխալ սահմանելը',
      'Սովորողը ենթադրում է, որ մոլեկուլները կարող են կազմված լինել միայն նույն կամ միայն տարբեր տեսակի ատոմներից։'
    ),
    (
      'atom_identity_changes_in_molecule',
      'Մոլեկուլ կազմելիս ատոմների տեսակը փոխված համարելը',
      'Սովորողը ենթադրում է, որ մոլեկուլ կազմելիս ատոմները կորցնում կամ փոխում են իրենց քիմիական տարրի պատկանելությունը։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy, 'draft'
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S03'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S03-I01', 'B', 'atom_molecule_confusion', 'Մեկ ատոմը սխալմամբ անվանվում է մոլեկուլ։'),
    ('PHY7-U02-S03-I01', 'C', 'atom_molecule_confusion', 'Մեկ ատոմը սխալմամբ նույնացվում է այլ նյութի մոլեկուլի հետ։'),
    ('PHY7-U02-S03-I01', 'D', 'atom_molecule_confusion', 'Մեկ ատոմին սխալմամբ վերագրվում է երկու ատոմից կազմված լինելը։'),
    ('PHY7-U02-S03-I02', 'A', 'atom_molecule_confusion', 'Երկու միացած ատոմից կազմված մոլեկուլը սխալմամբ համարվում է մեկ ատոմ։'),
    ('PHY7-U02-S03-I02', 'B', 'element_molecule_confusion', 'Ջրածնի մոլեկուլը սխալմամբ նույնացվում է քիմիական տարր հասկացության հետ։'),
    ('PHY7-U02-S03-I02', 'D', 'molecule_atom_composition_confusion', 'Նույն տեսակի երկու ատոմները սխալմամբ համարվում են տարբեր տեսակի։'),
    ('PHY7-U02-S03-I03', 'B', 'molecule_atom_composition_confusion', 'Մոլեկուլը սխալմամբ սահմանափակվում է միայն նույն տեսակի ատոմներով։'),
    ('PHY7-U02-S03-I03', 'C', 'atom_molecule_confusion', 'Մի քանի ատոմից կազմված մոլեկուլը սխալմամբ համարվում է մեկ ատոմ։'),
    ('PHY7-U02-S03-I03', 'D', 'atom_identity_changes_in_molecule', 'Միանալիս ատոմների տարրային պատկանելությունը սխալմամբ համարվում է փոփոխված։'),
    ('PHY7-U02-S03-I04', 'B', 'element_molecule_confusion', 'Քիմիական տարրի սահմանումը սխալմամբ փոխարինվում է մոլեկուլի սահմանմամբ։'),
    ('PHY7-U02-S03-I04', 'C', 'element_molecule_confusion', 'Քիմիական տարրը սխալմամբ նույնացվում է նյութի հատկությունները պահպանող մոլեկուլի հետ։'),
    ('PHY7-U02-S03-I04', 'D', 'atom_element_confusion', 'Քիմիական տարրը սխալմամբ նույնացվում է ցանկացած առանձին ատոմի հետ։')
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

-- Compute the same semantic fingerprint contract proven by Sprint 15B.2:
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
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
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
  '15B.4 երկրորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.4 երկրորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս տարբերակել ատոմը, մոլեկուլը և քիմիական տարրը',
  'Նախ պարզիր՝ նկարագրված է մեկ առանձին մասնիկ, միացած երկու կամ ավելի ատոմ, թե նյութ՝ կազմված միևնույն տեսակի ատոմներից։ Մեկ առանձին մասնիկը ատոմ է, միացած երկու կամ ավելի ատոմներից կազմված կայուն մասնիկը՝ մոլեկուլ, իսկ միևնույն տեսակի ատոմներից բաղկացած նյութը՝ քիմիական տարր։',
  'Հաշվիր՝ քանի ատոմ է ներկայացված, և որոշիր՝ դրանք միացա՞ծ են մեկ մասնիկի մեջ։',
  'Այնուհետև նայիր ատոմների տեսակներին. մոլեկուլը կարող է կազմված լինել և՛ նույն, և՛ տարբեր տեսակի ատոմներից, իսկ քիմիական տարրը նյութ է՝ կազմված միևնույն տեսակի ատոմներից։',
  'Օրինակ՝ H₂-ը մոլեկուլ է, որովհետև կազմված է միացած երկու ջրածնի ատոմից։ Այն նույն տեսակի ատոմներից է կազմված, բայց «մոլեկուլ» և «քիմիական տարր» հասկացությունները նույնը չեն. առաջինը մասնիկ է, երկրորդը՝ նյութի տեսակ։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.4',
    'learnerVisible', false,
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 26-28',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
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
    'misconceptionCode', '',
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
  '15B.4 երկրորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
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
  on family.code = 'PHY7-U02-S03-F01-ATOM-MOLECULE-ELEMENT'
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
    'chapterIiItemFamilies', 2,
    'secondFamilyDraftItems', 4,
    'secondFamilyDraftGuides', 1,
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Գլուխ II-ի երկրորդ ընտանիքը, չորս հարցերը և օգնության ուղեցույցը սևագիր են ու սովորողին անհասանելի։ Գնահատման ավազան կամ ձևանմուշ չի ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'approvedFamilies', 1,
    'draftFamiliesAwaitingReview', 1,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 1
  ),
  notes = '15B.3-ով առաջին ընտանիքը հաստատված է։ 15B.4-ի երկրորդ ընտանիքը սպասում է հարցերի, թյուրիմացությունների, օգնության ուղեցույցի և արտաքին մասնագիտական ստուգմանը։',
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
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B4_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B4_draft_item_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY';
  if v_count <> 16 then
    raise exception '15B4_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY';
  if v_count <> 12 then
    raise exception '15B4_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
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
    raise exception '15B4_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY';
  if v_count <> 4 then
    raise exception '15B4_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B4_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B4_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T01-CLASSIFY';
  if v_count <> 0 then
    raise exception '15B4_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B4_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B4_blueprint_boundary_failed:%', v_count;
  end if;
end $$;

notify pgrst, 'reload schema';
