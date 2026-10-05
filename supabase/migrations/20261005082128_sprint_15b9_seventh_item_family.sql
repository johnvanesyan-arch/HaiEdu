-- Sprint 15B.9: subject-aware, learner-inactive S08 authoring only.
-- Source: Physics 7 (2023), printed p.32 and pp.33-35; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  if not exists (select 1 from public.skills where code='PHY7-U02-S08' and status='review') then
    raise exception '15B9_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B9_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code like 'PHY7-U02-S07-I0_'
      and i.status='published' and i.review_status='approved'
      and exists (select 1 from public.item_qa_runs q where q.item_id=i.id
           and q.version_no=i.version_no and q.passed)) <> 4 then
    raise exception '15B9_previous_family_review_incomplete';
  end if;
  if exists (select 1 from public.items where code like 'PHY7-U02-S08-%')
     or exists (select 1 from public.item_families where code='PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION') then
    raise exception '15B9_existing_content_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION',
  'Ջերմաստիճանը և մասնիկների ջերմային շարժումը',
  'Նույն նյութի ջերմաստիճանի փոփոխությունը կապել մասնիկների անկանոն շարժման բնորոշ արագության հետ, կիրառել կապը դիֆուզիայի օրինակում և տարբերակել նույն ու տարբեր նյութերի համեմատությունները։',
  jsonb_build_object(
    'sprint', '15B.9',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'temperature_particle_motion',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S08-I01'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S08-I02'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S08-I03'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S08-I04')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S07_diffusion_rate_comparison_across_states',
      'quantitative_kinetic_theory_and_gas_laws',
      'S09_thermometer_operation'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջ 32; §11, տպագիր էջեր 33-35'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S08'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է մարմնի ջերմաստիճանի կապը մասնիկների անկանոն շարժման բնորոշ արագության հետ։ Դիֆուզիան ծառայում է որպես կիրառման օրինակ, իսկ տարբեր գազերի տվյալները՝ համեմատության սահմանները հիմնավորելու միջոց։'
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
  'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.9',
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
    'familySizeRationaleHy', 'Չորս հարցերը գնահատում են կապի ճանաչումը, կիրառումը, թյուր պատկերացման տարբերակումը և տվյալներից հիմնավոր եզրակացությունը։',
    'skillCode', 'PHY7-U02-S08',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S08-I01', 'single_choice', 'Նույն նյութի ջերմաստիճանը բարձրացնում են՝ առանց նրա ագրեգատային վիճակը փոխելու։ Ինչպե՞ս է փոխվում մասնիկների անկանոն շարժման բնորոշ արագությունը։', 1, 'temperature_particle_motion:01', 'same_substance_heating', 'core_understanding', 'Ստուգում է նույն նյութի ջերմաստիճանի բարձրացման և մասնիկների շարժման բնորոշ արագության աճի կապը։'),
    ('PHY7-U02-S08-I02', 'single_choice', 'Պղնձարջասպի լուծույթի և ջրի դիֆուզիայի փորձը կատարում են երկու նույնական անոթներում։ Մեկում ջերմաստիճանը 20 °C է, մյուսում՝ 40 °C։ Մնացած պայմանները նույնն են, հեղուկներն արտաքինից չեն խառնում։ Ո՞ր կանխատեսումն է ճիշտ։', 2, 'temperature_particle_motion:02', 'diffusion_temperature_application', 'application', 'Կապը կիրառում է ջերմաստիճանով տարբերվող երկու դիֆուզիայի փորձերի արդյունքը կանխատեսելու համար։'),
    ('PHY7-U02-S08-I03', 'single_choice', 'Թթվածնի ջերմաստիճանը 0 °C է։ Մոլեկուլների ջերմային շարժման մասին ո՞ր պնդումն է ճիշտ։', 2, 'temperature_particle_motion:03', 'zero_celsius_motion', 'misconception_diagnosis', 'Բացահայտում է Ցելսիուսի սանդղակի զրոն մասնիկների շարժման դադարի հետ շփոթելը։'),
    ('PHY7-U02-S08-I04', 'single_choice', 'Դասագրքի տվյալներով՝ 0 °C-ում ջրածնի մոլեկուլների ջերմային շարժման բնորոշ արագությունը մոտ 1800 մ/վ է, իսկ թթվածնինը՝ 450 մ/վ։ Սովորողը եզրակացնում է. «Ջրածինն ավելի տաք է, քանի որ նրա մոլեկուլներն ավելի արագ են շարժվում»։ Ո՞ր գնահատականն է հիմնավորված։', 3, 'temperature_particle_motion:04', 'cross_substance_inference', 'transfer_reasoning', 'Ներկայացված տվյալներով գնահատում է ծանոթ կապի անթույլատրելի տարածումը տարբեր նյութերի վրա՝ առանց նոր բանաձևի պահանջի։')
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
    'bank', 'PHY7-U02-15B9-DRAFT',
    'sprint', '15B.9',
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
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջ 32; §11, տպագիր էջեր 33-35'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'temperature_particle_motion',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(5); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջ 32; §11, տպագիր էջեր 33-35',
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
join public.skills skill on skill.code = 'PHY7-U02-S08'
join public.item_templates template on template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S08-I01', 'A', 'Բնորոշ արագությունը մեծանում է։', 1),
    ('PHY7-U02-S08-I01', 'B', 'Բնորոշ արագությունը փոքրանում է։', 2),
    ('PHY7-U02-S08-I01', 'C', 'Բնորոշ արագությունը մնում է անփոփոխ։', 3),
    ('PHY7-U02-S08-I01', 'D', 'Անկանոն շարժումը փոխարինվում է բոլոր մասնիկների՝ նույն ուղղությամբ շարժմամբ։', 4),
    ('PHY7-U02-S08-I02', 'A', '20 °C-ում դիֆուզիան ավելի արագ է, քանի որ մասնիկները ցածր ջերմաստիճանում ավելի արագ են շարժվում։', 1),
    ('PHY7-U02-S08-I02', 'B', '40 °C-ում դիֆուզիան ավելի արագ է, քանի որ մասնիկների ջերմային շարժումն ավելի արագ է։', 2),
    ('PHY7-U02-S08-I02', 'C', 'Երկու անոթներում դիֆուզիան նույն արագությունն ունի, քանի որ ջերմաստիճանը չի ազդում մասնիկների շարժման վրա։', 3),
    ('PHY7-U02-S08-I02', 'D', 'Ոչ մի անոթում դիֆուզիա չի լինի, քանի դեռ հեղուկներն արտաքինից չեն խառնել։', 4),
    ('PHY7-U02-S08-I03', 'A', 'Մոլեկուլները չեն շարժվում, քանի որ ջերմաստիճանը զրո է։', 1),
    ('PHY7-U02-S08-I03', 'B', 'Ջերմային շարժումը կսկսվի միայն այն ժամանակ, երբ ջերմաստիճանը բարձրանա 0 °C-ից։', 2),
    ('PHY7-U02-S08-I03', 'C', '0 °C-ում մոլեկուլները շարունակում են անկանոն ջերմային շարժումը։', 3),
    ('PHY7-U02-S08-I03', 'D', '0 °C-ում բոլոր մոլեկուլները շարժվում են նույն ուղղությամբ։', 4),
    ('PHY7-U02-S08-I04', 'A', 'Եզրակացությունը ճիշտ է. ավելի արագ մոլեկուլներ ունեցող գազը միշտ ավելի տաք է՝ անկախ նյութի տեսակից։', 1),
    ('PHY7-U02-S08-I04', 'B', 'Եզրակացությունը սխալ է. թթվածինն է ավելի տաք, քանի որ նրա մոլեկուլներն ավելի դանդաղ են շարժվում։', 2),
    ('PHY7-U02-S08-I04', 'C', 'Տվյալներից մեկը սխալ է. նույն ջերմաստիճանում բոլոր նյութերի մոլեկուլները պարտադիր նույն բնորոշ արագությունն ունեն։', 3),
    ('PHY7-U02-S08-I04', 'D', 'Եզրակացությունը սխալ է. երկու գազերի ջերմաստիճանը նույնն է, թեև տարբեր նյութերի մոլեկուլների բնորոշ արագությունները տարբեր են։', 4)
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
    ('PHY7-U02-S08-I01', 'A'),
    ('PHY7-U02-S08-I02', 'B'),
    ('PHY7-U02-S08-I03', 'C'),
    ('PHY7-U02-S08-I04', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'temperature_particle_motion'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S08'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = excluded.is_primary;

with misconception_rows(code, title_hy, description_hy) as (
  values
    ('heating_slows_motion', 'Տաքացնելիս մասնիկների շարժումը դանդաղում է', 'Նույն նյութի ջերմաստիճանի բարձրացման և ջերմային շարժման արագության կապը մեկնաբանվում է հակառակ ուղղությամբ։'),
    ('temperature_unrelated_to_motion', 'Ջերմաստիճանը չի ազդում մասնիկների շարժման վրա', 'Նույն նյութի ջերմաստիճանի փոփոխությունը չի կապվում մասնիկների շարժման բնորոշ արագության փոփոխության հետ։'),
    ('thermal_motion_is_directed', 'Ջերմային շարժումը բոլոր մասնիկների նույն ուղղությամբ շարժումն է', 'Մասնիկների անկանոն ջերմային շարժումը շփոթվում է ուղղորդված ընդհանուր շարժման հետ։'),
    ('temperature_effect_on_diffusion_reversed', 'Ցածր ջերմաստիճանում դիֆուզիան ավելի արագ է', 'Ջերմաստիճանի ազդեցությունը մասնիկների շարժման և դիֆուզիայի վրա մեկնաբանվում է հակառակ ուղղությամբ։'),
    ('diffusion_requires_stirring', 'Դիֆուզիայի համար արտաքին խառնում է անհրաժեշտ', 'Մասնիկների անկանոն շարժմամբ պայմանավորված ինքնաբերական խառնումը շփոթվում է արտաքին խառնելու հետ։'),
    ('zero_celsius_stops_motion', '0 °C-ում մասնիկների ջերմային շարժումը դադարում է', 'Ցելսիուսի սանդղակի զրոն սխալմամբ ընդունվում է որպես մոլեկուլների ջերմային շարժման բացակայություն։'),
    ('different_substances_speed_orders_temperature', 'Տարբեր նյութերի ջերմաստիճանները որոշվում են միայն մոլեկուլների արագությամբ', 'Նույն նյութի համար կիրառվող համեմատությունը առանց հիմնավորման տարածվում է տարբեր նյութերի վրա՝ անտեսելով տրված ջերմաստիճանները։'),
    ('equal_temperature_implies_equal_speed', 'Նույն ջերմաստիճանում տարբեր նյութերի մասնիկներն ունեն նույն բնորոշ արագությունը', 'Ջերմաստիճանների հավասարությունը շփոթվում է տարբեր նյութերի մոլեկուլների բնորոշ արագությունների հավասարության հետ։')
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy,
       'draft'::public.content_status
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S08'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S08-I01', 'B', 'heating_slows_motion', 'Նույն նյութի ջերմաստիճանի բարձրացման և ջերմային շարժման արագության կապը մեկնաբանվում է հակառակ ուղղությամբ։'),
    ('PHY7-U02-S08-I01', 'C', 'temperature_unrelated_to_motion', 'Նույն նյութի ջերմաստիճանի փոփոխությունը չի կապվում մասնիկների շարժման բնորոշ արագության փոփոխության հետ։'),
    ('PHY7-U02-S08-I01', 'D', 'thermal_motion_is_directed', 'Մասնիկների անկանոն ջերմային շարժումը շփոթվում է ուղղորդված ընդհանուր շարժման հետ։'),
    ('PHY7-U02-S08-I02', 'A', 'temperature_effect_on_diffusion_reversed', 'Ջերմաստիճանի ազդեցությունը մասնիկների շարժման և դիֆուզիայի վրա մեկնաբանվում է հակառակ ուղղությամբ։'),
    ('PHY7-U02-S08-I02', 'C', 'temperature_unrelated_to_motion', 'Նույն նյութի ջերմաստիճանի փոփոխությունը չի կապվում մասնիկների շարժման բնորոշ արագության փոփոխության հետ։'),
    ('PHY7-U02-S08-I02', 'D', 'diffusion_requires_stirring', 'Մասնիկների անկանոն շարժմամբ պայմանավորված ինքնաբերական խառնումը շփոթվում է արտաքին խառնելու հետ։'),
    ('PHY7-U02-S08-I03', 'A', 'zero_celsius_stops_motion', 'Ցելսիուսի սանդղակի զրոն սխալմամբ ընդունվում է որպես մոլեկուլների ջերմային շարժման բացակայություն։'),
    ('PHY7-U02-S08-I03', 'B', 'zero_celsius_stops_motion', 'Ցելսիուսի սանդղակի զրոն սխալմամբ ընդունվում է որպես մոլեկուլների ջերմային շարժման բացակայություն։'),
    ('PHY7-U02-S08-I03', 'D', 'thermal_motion_is_directed', 'Մասնիկների անկանոն ջերմային շարժումը շփոթվում է ուղղորդված ընդհանուր շարժման հետ։'),
    ('PHY7-U02-S08-I04', 'A', 'different_substances_speed_orders_temperature', 'Նույն նյութի համար կիրառվող համեմատությունը առանց հիմնավորման տարածվում է տարբեր նյութերի վրա՝ անտեսելով տրված ջերմաստիճանները։'),
    ('PHY7-U02-S08-I04', 'B', 'different_substances_speed_orders_temperature', 'Նույն նյութի համար կիրառվող համեմատությունը առանց հիմնավորման տարածվում է տարբեր նյութերի վրա՝ անտեսելով տրված ջերմաստիճանները։'),
    ('PHY7-U02-S08-I04', 'C', 'equal_temperature_implies_equal_speed', 'Ջերմաստիճանների հավասարությունը շփոթվում է տարբեր նյութերի մոլեկուլների բնորոշ արագությունների հավասարության հետ։')
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
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
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
  '15B.9 հեռանկարային ապացուցողական սխեմայով յոթերորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.9 յոթերորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս կապել ջերմաստիճանը մասնիկների շարժման հետ',
  'Նախ պարզիր՝ համեմատվում է նույն նյութը, թե տարբեր նյութեր։ Նույն նյութի ջերմաստիճանը բարձրացնելիս մասնիկների անկանոն շարժման բնորոշ արագությունը մեծանում է։ Սա չի նշանակում, որ ամեն մասնիկ ամեն պահի նույն արագությամբ է շարժվում կամ որ շարժումը դառնում է ուղղորդված։ Կապը կարելի է կիրառել՝ բացատրելու ավելի բարձր ջերմաստիճանում դիֆուզիայի արագացումը։ 0 °C-ը չի նշանակում մասնիկների շարժման դադար։ Տարբեր նյութերի արագությունները համեմատելիս օգտվիր տրված ջերմաստիճաններից և մի՛ եզրակացրու, թե ավելի արագ մոլեկուլներ ունեցող նյութը միշտ ավելի տաք է։',
  'Նույն նյութի համար ջերմաստիճանի բարձրացումը կապիր մասնիկների անկանոն շարժման բնորոշ արագության մեծացման հետ։',
  '0 °C-ում նույնպես կա ջերմային շարժում։ Տարբեր գազերի համար նույն ջերմաստիճանը պարտադիր չի նշանակում մոլեկուլների նույն բնորոշ արագություն։',
  'Դասագրքում թթվածնի մոլեկուլների ջերմային շարժման բնորոշ արագությունը 0 °C-ում մոտ 450 մ/վ է, իսկ 200 °C-ում՝ 585 մ/վ։ Համեմատվում է նույն գազը. ավելի բարձր ջերմաստիճանին համապատասխանում է ավելի մեծ բնորոշ արագություն։ Միայն այս երկու թվերից արագության և ջերմաստիճանի ուղիղ համեմատականության օրենք չի հետևում։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.9',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջ 32; §11, տպագիր էջեր 33-35'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
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
  '15B.9 յոթերորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
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
  on family.code = 'PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION'
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
set evidence = coalesce(gate.evidence, '{}'::jsonb) || jsonb_build_object(
  'sprint15B9', jsonb_build_object('skillCode','PHY7-U02-S08',
    'draftItems',4,'draftGuide',1,'draftMisconceptions',8,
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
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
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
    raise exception '15B9_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B9_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B9_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 4 then
    raise exception '15B9_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B9_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION';
  if v_count <> 16 then
    raise exception '15B9_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION';
  if v_count <> 12 then
    raise exception '15B9_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
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
    raise exception '15B9_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION';
  if v_count <> 4 then
    raise exception '15B9_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B9_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B9_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B9_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION';
  if v_count <> 0 then
    raise exception '15B9_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B9_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B9_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S08-F01-TEMPERATURE-PARTICLE-MOTION'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B9_release_outcome_mapping_failed';
  end if;
  if (select count(*) from public.misconceptions m join public.skills s on s.id=m.skill_id
      where s.code='PHY7-U02-S08' and m.status='draft') <> 8 then
    raise exception '15B9_misconception_count_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code like 'PHY7-U02-S08-I0_'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B9_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code like 'PHY7-U02-S08-I0_' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 12 then
    raise exception '15B9_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code like 'PHY7-U02-S08-I0_') <> 4 then
    raise exception '15B9_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code like 'PHY7-U02-S08-I0_' and u.code='PHY7-U02' and c.is_primary) <> 4 then
    raise exception '15B9_curriculum_scope_failed';
  end if;
end $$;



