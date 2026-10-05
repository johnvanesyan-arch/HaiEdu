-- Sprint 15B.10: subject-aware, learner-inactive S09 authoring only.
-- Source: Physics 7 (2023), section 12, printed pp.36-37, figure 34; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  if not exists (select 1 from public.skills where code='PHY7-U02-S09' and status='review') then
    raise exception '15B10_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B10_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code like 'PHY7-U02-S08-I0_'
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors = '[]'::jsonb and q.warnings = '[]'::jsonb
           from public.item_qa_runs q where q.item_id=i.id and q.version_no=i.version_no
           order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B10_previous_family_review_incomplete';
  end if;
  if exists (select 1 from public.item_templates where code like 'PHY7-U02-S09-%')
     or exists (select 1 from public.misconceptions m join public.skills s on s.id=m.skill_id where s.code='PHY7-U02-S09')
     or exists (select 1 from public.items where code like 'PHY7-U02-S09-%')
     or exists (select 1 from public.item_families where code='PHY7-U02-S09-F01-LIQUID-THERMOMETER') then
    raise exception '15B10_existing_content_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S09-F01-LIQUID-THERMOMETER',
  'Հեղուկային ջերմաչափի աշխատանքի սկզբունքը',
  'Հեղուկային ջերմաչափի աշխատանքը բացատրել հեղուկի ջերմային ընդարձակմամբ, կանխատեսել սյան փոփոխությունը սառչելիս և հիմնավորել նեղ խողովակի դերը։',
  jsonb_build_object(
    'sprint', '15B.10',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'liquid_thermometer_operation',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S09-I01'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S09-I02'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S09-I03'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S09-I04')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S08_temperature_particle_motion',
      'temperature_scale_conversion',
      'electronic_and_infrared_thermometers',
      'clinical_thermometer_retention_mechanisms'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37, նկար 34'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S09'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S09-F01-LIQUID-THERMOMETER'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է հեղուկային ջերմաչափի աշխատանքի սկզբունքը՝ հեղուկի ծավալի ջերմաստիճանային փոփոխությունը կապելով մազական խողովակում սյան բարձրության փոփոխության հետ։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.10',
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
    'enforceUniqueEvidencePurposes', true,
    'familySizePolicy', 'outcome_appropriate',
    'familySizeRationaleHy', 'Չորս հարցերը գնահատում են աշխատանքի սկզբունքը, սառչելու դեպքում դրա կիրառումը, ծավալն ու հեղուկի քանակը տարբերակելը և խողովակի լայնության փոփոխությամբ պայմանավորված արդյունքը հիմնավորելը։',
    'skillCode', 'PHY7-U02-S09',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S09-F01-LIQUID-THERMOMETER'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S09-I01', 'single_choice', 'Ո՞ր երևույթն է ընկած հեղուկային ջերմաչափի աշխատանքի հիմքում։', 1, 'liquid_thermometer_operation:01', 'thermal_expansion_principle', 'core_understanding', 'Ճանաչում է հեղուկի ջերմային ընդարձակումը որպես հեղուկային ջերմաչափի աշխատանքի հիմք։'),
    ('PHY7-U02-S09-I02', 'single_choice', 'Սովորական սպիրտային սենյակային ջերմաչափը տաք սենյակից տեղափոխում են ավելի սառը սենյակ։ Ջերմաչափն անվնաս է, և ջերմաստիճանը նրա աշխատանքային տիրույթում է։ Երբ ջերմաչափը սառչի, ինչպե՞ս կփոխվի հեղուկի սյունը և ինչո՞ւ։', 2, 'liquid_thermometer_operation:02', 'cooling_column_prediction', 'application', 'Աշխատանքի սկզբունքը կիրառում է սառչող սենյակային ջերմաչափի սյան շարժումը կանխատեսելու և բացատրելու համար։'),
    ('PHY7-U02-S09-I03', 'single_choice', 'Անվնաս, փակ սպիրտային ջերմաչափը տաքացնում են նրա աշխատանքային տիրույթում։ Սովորողն ասում է. «Սյունը բարձրացավ, ուրեմն ջերմաչափի ներսում նոր հեղուկ առաջացավ»։ Ո՞ր բացատրությունն է ճիշտ։', 2, 'liquid_thermometer_operation:03', 'volume_not_new_liquid', 'misconception_diagnosis', 'Տարբերակում է նույն հեղուկի ծավալի մեծացումը նոր հեղուկի առաջացումից։'),
    ('PHY7-U02-S09-I04', 'single_choice', 'Հեղուկային ջերմաչափի երկու մոդել ունեն նույնպիսի պահեստարաններ։ Մեկի խողովակն ավելի նեղ է, մյուսինը՝ ավելի լայն։ Տաքացնելիս յուրաքանչյուր պահեստարանից խողովակ է անցնում հեղուկի նույն լրացուցիչ ծավալը։ Խողովակներից յուրաքանչյուրի ներքին լայնությունն ամբողջ երկարությամբ նույնն է։ Ո՞ր խողովակում սյան բարձրության փոփոխությունն ավելի մեծ կլինի և ինչո՞ւ։', 3, 'liquid_thermometer_operation:04', 'capillary_width_reasoning', 'transfer_reasoning', 'Նույն տրված ծավալի համար համեմատում է տարբեր լայնությամբ խողովակներում բարձրության փոփոխությունները և հիմնավորում նեղ խողովակի դերը՝ առանց բանաձևի պահանջի։')
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
    'bank', 'PHY7-U02-15B10-DRAFT',
    'sprint', '15B.10',
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
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37, նկար 34'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'liquid_thermometer_operation',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, լրացուցիչ վերջնարդյունք 2(2); Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37, նկար 34',
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
join public.skills skill on skill.code = 'PHY7-U02-S09'
join public.item_templates template on template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S09-I01', 'A', 'Հեղուկը տաքանալիս ընդարձակվում է, և նրա սյունը բարձրանում է մազական խողովակում։', 1),
    ('PHY7-U02-S09-I01', 'B', 'Հեղուկը տաքանալիս սեղմվում է, և փոքրացած ծավալը սյունը մղում է վեր։', 2),
    ('PHY7-U02-S09-I01', 'C', 'Հեղուկը յուրաքանչյուր չափման ժամանակ եռում է, և գոլորշին սյունը մղում է վեր։', 3),
    ('PHY7-U02-S09-I01', 'D', 'Սանդղակի բաժանումները տաքանալիս շարժվում են և հեղուկի սյունը քաշում վեր։', 4),
    ('PHY7-U02-S09-I02', 'A', 'Սյունը կբարձրանա, քանի որ սառչելիս սպիրտի ծավալը մեծանում է։', 1),
    ('PHY7-U02-S09-I02', 'B', 'Սյունը կիջնի, քանի որ սառչելիս սպիրտի ծավալը փոքրանում է։', 2),
    ('PHY7-U02-S09-I02', 'C', 'Սյան բարձրությունը չի փոխվի, քանի որ սպիրտի ծավալը ջերմաստիճանից կախված չէ։', 3),
    ('PHY7-U02-S09-I02', 'D', 'Սյունը կիջնի, քանի որ սառչելիս սպիրտի մի մասը դուրս է գալիս փակ ջերմաչափից։', 4),
    ('PHY7-U02-S09-I03', 'A', 'Տաքանալիս ներսում նոր սպիրտ է առաջանում, և դրա համար սյունը բարձրանում է։', 1),
    ('PHY7-U02-S09-I03', 'B', 'Նոր հեղուկ չի առաջանում. սյունը բարձրանում է, որովհետև սպիրտը տաքանալիս սեղմվում է։', 2),
    ('PHY7-U02-S09-I03', 'C', 'Նոր հեղուկ չի առաջանում. նույն սպիրտը տաքանալիս ավելի մեծ ծավալ է զբաղեցնում։', 3),
    ('PHY7-U02-S09-I03', 'D', 'Սպիրտի ծավալը չի փոխվում. սանդղակի բաժանումներն են հեղուկը քաշում վեր։', 4),
    ('PHY7-U02-S09-I04', 'A', 'Ավելի լայն խողովակում, քանի որ նույն ծավալը լայն խողովակում ավելի մեծ բարձրություն է զբաղեցնում։', 1),
    ('PHY7-U02-S09-I04', 'B', 'Միայն լայն խողովակում սյունը կբարձրանա, քանի որ նեղ խողովակով հեղուկը չի կարող անցնել։', 2),
    ('PHY7-U02-S09-I04', 'C', 'Երկուսում փոփոխությունը նույնը կլինի, քանի որ նույն ծավալի դեպքում խողովակի լայնությունը նշանակություն չունի։', 3),
    ('PHY7-U02-S09-I04', 'D', 'Ավելի նեղ խողովակում, քանի որ նույն ծավալը նեղ խողովակում ավելի մեծ բարձրություն է զբաղեցնում։', 4)
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
    ('PHY7-U02-S09-I01', 'A'),
    ('PHY7-U02-S09-I02', 'B'),
    ('PHY7-U02-S09-I03', 'C'),
    ('PHY7-U02-S09-I04', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'liquid_thermometer_operation'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S09'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code, title_hy, description_hy) as (
  values
    ('thermal_expansion_reversed', 'Հեղուկը տաքանալիս սեղմվում է, իսկ սառչելիս՝ ընդարձակվում', 'Ջերմաչափի աշխատանքային տիրույթում հեղուկի ծավալի ջերմաստիճանային փոփոխության ուղղությունը մեկնաբանվում է հակառակ կերպ։'),
    ('thermometer_requires_boiling', 'Ջերմաչափն աշխատում է հեղուկի եռալու շնորհիվ', 'Հեղուկի սովորական ջերմային ընդարձակումը շփոթվում է եռման և գոլորշու ճնշման ազդեցության հետ։'),
    ('scale_moves_liquid', 'Սանդղակն է շարժում հեղուկի սյունը', 'Սանդղակին վերագրվում է հեղուկը շարժելու դեր, մինչդեռ այն ծառայում է ցուցմունքը կարդալուն։'),
    ('liquid_volume_temperature_independent', 'Հեղուկի ծավալը կախված չէ ջերմաստիճանից', 'Հեղուկի ծավալը համարվում է անփոփոխ՝ անտեսելով ջերմաչափի աշխատանքի հիմքում ընկած ջերմային ընդարձակումը։'),
    ('cooling_causes_liquid_loss', 'Սառչելիս փակ ջերմաչափից հեղուկ է կորչում', 'Սյան իջնելը սխալմամբ բացատրվում է անվնաս փակ ջերմաչափից հեղուկի արտահոսքով, ոչ թե ծավալի փոքրացմամբ։'),
    ('heating_creates_liquid', 'Տաքացնելիս ջերմաչափում նոր հեղուկ է առաջանում', 'Նույն հեղուկի ծավալի մեծացումը շփոթվում է լրացուցիչ հեղուկի առաջացման հետ։'),
    ('wider_tube_gives_larger_rise', 'Լայն խողովակում նույն ծավալը ավելի մեծ բարձրություն է զբաղեցնում', 'Տրված նույն ծավալի դեպքում խողովակի լայնության և սյան բարձրության փոփոխության կապը մեկնաբանվում է հակառակ կերպ։'),
    ('capillary_blocks_liquid', 'Նեղ խողովակը թույլ չի տալիս հեղուկի անցումը', 'Մազական խողովակը սխալմամբ համարվում է հեղուկի անցումն ամբողջությամբ արգելակող մաս։'),
    ('tube_width_irrelevant', 'Խողովակի լայնությունը չի ազդում սյան բարձրության փոփոխության վրա', 'Հավասար ծավալային փոփոխությունից եզրակացվում է հավասար բարձրության փոփոխություն՝ անտեսելով խողովակների տարբեր լայնությունները։')
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy,
       'draft'::public.content_status
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S09'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S09-I01', 'B', 'thermal_expansion_reversed', 'Ջերմաչափի աշխատանքային տիրույթում հեղուկի ծավալի ջերմաստիճանային փոփոխության ուղղությունը մեկնաբանվում է հակառակ կերպ։'),
    ('PHY7-U02-S09-I01', 'C', 'thermometer_requires_boiling', 'Հեղուկի սովորական ջերմային ընդարձակումը շփոթվում է եռման և գոլորշու ճնշման ազդեցության հետ։'),
    ('PHY7-U02-S09-I01', 'D', 'scale_moves_liquid', 'Սանդղակին վերագրվում է հեղուկը շարժելու դեր, մինչդեռ այն ծառայում է ցուցմունքը կարդալուն։'),
    ('PHY7-U02-S09-I02', 'A', 'thermal_expansion_reversed', 'Ջերմաչափի աշխատանքային տիրույթում հեղուկի ծավալի ջերմաստիճանային փոփոխության ուղղությունը մեկնաբանվում է հակառակ կերպ։'),
    ('PHY7-U02-S09-I02', 'C', 'liquid_volume_temperature_independent', 'Հեղուկի ծավալը համարվում է անփոփոխ՝ անտեսելով ջերմաչափի աշխատանքի հիմքում ընկած ջերմային ընդարձակումը։'),
    ('PHY7-U02-S09-I02', 'D', 'cooling_causes_liquid_loss', 'Սյան իջնելը սխալմամբ բացատրվում է անվնաս փակ ջերմաչափից հեղուկի արտահոսքով, ոչ թե ծավալի փոքրացմամբ։'),
    ('PHY7-U02-S09-I03', 'A', 'heating_creates_liquid', 'Նույն հեղուկի ծավալի մեծացումը շփոթվում է լրացուցիչ հեղուկի առաջացման հետ։'),
    ('PHY7-U02-S09-I03', 'B', 'thermal_expansion_reversed', 'Ջերմաչափի աշխատանքային տիրույթում հեղուկի ծավալի ջերմաստիճանային փոփոխության ուղղությունը մեկնաբանվում է հակառակ կերպ։'),
    ('PHY7-U02-S09-I03', 'D', 'scale_moves_liquid', 'Սանդղակին վերագրվում է հեղուկը շարժելու դեր, մինչդեռ այն ծառայում է ցուցմունքը կարդալուն։'),
    ('PHY7-U02-S09-I04', 'A', 'wider_tube_gives_larger_rise', 'Տրված նույն ծավալի դեպքում խողովակի լայնության և սյան բարձրության փոփոխության կապը մեկնաբանվում է հակառակ կերպ։'),
    ('PHY7-U02-S09-I04', 'B', 'capillary_blocks_liquid', 'Մազական խողովակը սխալմամբ համարվում է հեղուկի անցումն ամբողջությամբ արգելակող մաս։'),
    ('PHY7-U02-S09-I04', 'C', 'tube_width_irrelevant', 'Հավասար ծավալային փոփոխությունից եզրակացվում է հավասար բարձրության փոփոխություն՝ անտեսելով խողովակների տարբեր լայնությունները։')
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
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
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
  '15B.10 հեռանկարային ապացուցողական սխեմայով ութերորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.10 ութերորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս է աշխատում հեղուկային ջերմաչափը',
  'Կապը դիտարկիր հերթականությամբ՝ ջերմաստիճանի փոփոխություն, հեղուկի ծավալի փոփոխություն, սյան բարձրության փոփոխություն։ Հեղուկային ջերմաչափի աշխատանքային տիրույթում տաքանալիս հեղուկը ընդարձակվում է, իսկ սառչելիս՝ սեղմվում։ Անվնաս փակ ջերմաչափում նոր հեղուկ չի առաջանում և հեղուկ չի կորչում։ Նեղ մազական խողովակը ծավալի փոքր փոփոխությունը դարձնում է սյան բարձրության նկատելի փոփոխություն։ Սանդղակը թույլ է տալիս կարդալ ցուցմունքը, բայց հեղուկը չի շարժում։',
  'Սկզբում որոշիր՝ հեղուկը տաքանում է, թե սառչում։ Ինչպե՞ս է այդ դեպքում փոխվում նրա զբաղեցրած ծավալը։',
  'Տաքանալիս հեղուկի ծավալը մեծանում է, և սյունը բարձրանում է։ Սառչելիս կատարվում է հակառակը։ Հեղուկի նույն լրացուցիչ ծավալը նեղ խողովակում ավելի մեծ բարձրություն է զբաղեցնում, քան լայնում։',
  'Սենյակային սպիրտային ջերմաչափը զով միջավայրից տեղափոխում են ավելի տաք միջավայր՝ նրա աշխատանքային տիրույթում։ Տաքանալիս սպիրտի ծավալը մեծանում է, և մի մասը պահեստարանից բարձրանում է մազական խողովակով։ Նոր սպիրտ չի առաջանում. նույն հեղուկն ավելի մեծ ծավալ է զբաղեցնում։ Երբ ցուցմունքը կայունանում է, ջերմաստիճանը կարդում են սանդղակով։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.10',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37, նկար 34'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
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
  '15B.10 ութերորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
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
  on family.code = 'PHY7-U02-S09-F01-LIQUID-THERMOMETER'
join public.item_family_curriculum_reconciliations reconciliation
  on reconciliation.reconciliation_id = run.id
 and reconciliation.item_family_id = family.id
where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
on conflict (curriculum_release_id, item_family_id) do nothing;

update public.curriculum_release_gate_checks gate
set evidence = coalesce(gate.evidence, '{}'::jsonb) || jsonb_build_object(
  'sprint15B10', jsonb_build_object('skillCode','PHY7-U02-S09',
    'draftItems',4,'draftGuide',1,'draftMisconceptions',9,
    'learnerVisible',false,'reviewStatus','pending',
    'authoringProfileVersion','haiedu-evidence-blueprint-v1')),
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code in ('assessment_scope_bound','content_qa_passed');

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.item_templates template
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true'
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
    raise exception '15B10_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B10_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B10_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 4 then
    raise exception '15B10_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B10_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER';
  if v_count <> 16 then
    raise exception '15B10_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER';
  if v_count <> 12 then
    raise exception '15B10_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
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
    raise exception '15B10_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER';
  if v_count <> 4 then
    raise exception '15B10_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B10_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B10_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B10_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER';
  if v_count <> 0 then
    raise exception '15B10_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B10_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B10_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S09-F01-LIQUID-THERMOMETER'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B10_release_outcome_mapping_failed';
  end if;
  if (select count(*) from public.misconceptions m join public.skills s on s.id=m.skill_id
      where s.code='PHY7-U02-S09' and m.status='draft') <> 9 then
    raise exception '15B10_misconception_count_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code like 'PHY7-U02-S09-I0_'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B10_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code like 'PHY7-U02-S09-I0_' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 12 then
    raise exception '15B10_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code like 'PHY7-U02-S09-I0_') <> 4 then
    raise exception '15B10_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code like 'PHY7-U02-S09-I0_' and u.code='PHY7-U02' and c.is_primary) <> 4 then
    raise exception '15B10_curriculum_scope_failed';
  end if;
end $$;



