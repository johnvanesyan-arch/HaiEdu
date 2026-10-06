-- Sprint 15B.13: subject-aware, learner-inactive S02 authoring only.
-- Source: Physics 7 (2023), section 7, printed pp.24-26, figures 22-24; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  if not exists (select 1 from public.skills where code='PHY7-U02-S02' and status='review') then
    raise exception '15B13_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S02-I01','PHY7-U02-S02-I02','PHY7-U02-S02-I03','PHY7-U02-S02-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13_existing_S02_review_incomplete';
  end if;
  if (select count(*) from public.misconceptions m join public.skills s on s.id=m.skill_id
      where s.code='PHY7-U02-S02' and m.status='active' and m.code in
      ('matter_as_continuous','particle_identity_or_count_changes','particle_size_increases_on_heating')) <> 3 then
    raise exception '15B13_approved_misconceptions_missing';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS')
     or exists (select 1 from public.items where code in ('PHY7-U02-S02-I05','PHY7-U02-S02-I06','PHY7-U02-S02-I07','PHY7-U02-S02-I08'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS') then
    raise exception '15B13_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS',
  'Դիտումից դեպի մասնիկային բացատրություն',
  'Սեղմման և ջերմային ընդարձակման դիտումները կապել մասնիկների միջև տարածությունների փոփոխության հետ՝ տարբերակելով դիտված արդյունքը մասնիկային մոդելի բացատրությունից։',
  jsonb_build_object(
    'sprint', '15B.13',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'particle_structure_observations',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S02-I05'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S02-I06'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S02-I07'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S02-I08')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S03_atomic_composition', 'S04_molecular_size_estimation', 'S08_particle_speed', 'quantitative_gas_laws'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-24'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S02'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS'
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
       'new_family', 'direct',
       'Ընտանիքը ուղղակիորեն գնահատում է նյութի մասնիկային կառուցվածքը փորձերի դիտումներով հիմնավորելը՝ առանձնացնելով մակրոսկոպական չափումը և մասնիկային մոդելի բացատրությունը։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13',
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
    'familySizeRationaleHy', 'Չորս հարցերն ունեն տարբեր ապացուցողական նպատակներ՝ սեղմման բացատրություն, ջերմային ընդարձակման դիտման կիրառում, դիտման և մասնիկների չափի մասին պնդման տարբերակում ու փակ համակարգի դարձելի սեղմման հիմնավորում։',
    'skillCode', 'PHY7-U02-S02',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S02-I05', 'single_choice', 'Նկարի ա մասում հեղուկի ծավալը բեռի ազդեցությամբ գրեթե չի փոխվում, իսկ բ մասում գազի ծավալը փոքրանում է։ Համեմատությունը ո՞ր մասնիկային բացատրությանն է համապատասխանում։', 2, 'particle_structure_observations:05', 'gas_liquid_compression', 'core_understanding', 'Համեմատում է հեղուկի և գազի սեղմման դիտումները և կապում գազի ավելի մեծ սեղմելիությունը մասնիկների միջև տարածությունների հետ։'),
    ('PHY7-U02-S02-I06', 'single_choice', 'Նկարում տաքացնելուց հետո ջրի մակարդակը և փակ գազով անոթի մխոցի դիրքը բարձրացել են։ Ո՞ր բացատրությունն է համապատասխանում ջրի և գազի ծավալների մեծացմանը՝ մասնիկային մոդելի շրջանակում։', 2, 'particle_structure_observations:06', 'heated_volume_observation', 'application', 'Մասնիկային բացատրությունը կիրառում է երկու տարբեր նյութական համակարգերի ջերմային ընդարձակման դիտումներին՝ չեզրակացնելով համընդհանուր ընդարձակման արագություն։'),
    ('PHY7-U02-S02-I07', 'single_choice', 'Տաքացնելիս հենարանների միջև ամրացված պղնձե լարն ավելի է կախվում, իսկ սառչելիս վերադառնում է սկզբնական տեսքին։ Սովորողն ասում է. «Այս նկարը ցույց է տալիս, որ պղնձի յուրաքանչյուր մասնիկը մեծացել է»։ Ո՞ր պատասխանն է հիմնավորված։', 3, 'particle_structure_observations:07', 'observation_model_distinction', 'misconception_diagnosis', 'Տարբերակում է լարի մակրոսկոպական երկարության դիտումը անհատական մասնիկների չափի մասին չհիմնավորված պնդումից։'),
    ('PHY7-U02-S02-I08', 'single_choice', 'Օդով ներարկիչի ծայրը փակել են։ Մխոցը ներս են սեղմում, ապա թույլ տալիս, որ այն վերադառնա սկզբնական դիրքին։ Օդ չի ավելացվում և չի կորչում, իսկ ջերմաստիճանը չի փոխվում։ Ինչպե՞ս է մասնիկային մոդելը բացատրում օդի ծավալի փոքրացումը և հետո վերականգնումը։', 3, 'particle_structure_observations:08', 'sealed_syringe_reversible_compression', 'transfer_reasoning', 'Բացատրությունը տեղափոխում է փակ ներարկիչի երկու հաջորդական վիճակների վրա՝ պահպանելով օդի մասնիկների քանակն ու ինքնությունը։')
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
  case row.code
    when 'PHY7-U02-S02-I05' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-22.png", "altHy": "Նկար 22. ա՝ հեղուկով, բ՝ գազով գլաններ՝ առանց բեռի և բեռի ազդեցության տակ։", "source": {"edition": "Physics 7 (2023)", "printedPage": 24, "figure": 22, "sha256": "6b52815c60f5d3324d6c5c44c9896511d7a3e7adc1827edf1e5981c1adf9860b"}}'::jsonb
    when 'PHY7-U02-S02-I06' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-24.png", "altHy": "Նկար 24. ջրով անոթների և փակ գազով անոթների զույգեր՝ մինչև տաքացնելը և տաքացնելու ընթացքում։ Պահպանված են ջրի, գազի և մխոցի նշումները։", "source": {"edition": "Physics 7 (2023)", "printedPage": 25, "figure": 24, "sha256": "915b9c67b2e20aad3412a34385c5b3b3644873f705824df5c96e26875f89ac94"}}'::jsonb
    when 'PHY7-U02-S02-I07' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-23.png", "altHy": "Նկար 23. երկու հենարանի միջև ամրացված լար և դրա տակ գտնվող այրիչ։", "source": {"edition": "Physics 7 (2023)", "printedPage": 25, "figure": 23, "sha256": "538d24ea12db1075815db91bdb6a2fb14f6c2ad6b8a5ba086eb754516aa228d8"}}'::jsonb
    else '{}'::jsonb end,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B13-DRAFT',
    'intendedBank', 'practice_review',
    'illustrationDisposition', case when row.code='PHY7-U02-S02-I08' then 'verbal_task_no_illustration_needed' else 'source_textbook_figure' end,
    'sprint', '15B.13',
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
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-24'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'particle_structure_observations',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(1); Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-24',
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
join public.skills skill on skill.code = 'PHY7-U02-S02'
join public.item_templates template on template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S02-I05', 'A', 'Գազի մասնիկների միջև տարածություններն ավելի մեծ են, և սեղմելիս դրանք կարող են փոքրանալ։', 1),
    ('PHY7-U02-S02-I05', 'B', 'Գազը հոծ է՝ առանց մասնիկների միջև տարածությունների, իսկ բեռը հոծ նյութն է փոքրացնում։', 2),
    ('PHY7-U02-S02-I05', 'C', 'Սեղմելիս գազի մի շարք մասնիկներ անհետանում են, և այդ պատճառով ծավալը փոքրանում է։', 3),
    ('PHY7-U02-S02-I05', 'D', 'Բեռը գազի մասնիկները վերածում է հեղուկի մասնիկների, ուստի ծավալը փոքրանում է։', 4),
    ('PHY7-U02-S02-I06', 'A', 'Տաքացնելիս ջրի և գազի առանձին մասնիկների չափերը մեծանում են։', 1),
    ('PHY7-U02-S02-I06', 'B', 'Տաքացնելիս մասնիկների միջև միջին հեռավորությունները մեծանում են, և նույն նյութն ավելի մեծ ծավալ է զբաղեցնում։', 2),
    ('PHY7-U02-S02-I06', 'C', 'Տաքացնելիս երկու անոթներում էլ նոր մասնիկներ են առաջանում։', 3),
    ('PHY7-U02-S02-I06', 'D', 'Ջուրը և գազը հոծ միջավայրեր են՝ առանց մասնիկների միջև տարածությունների, և հենց հոծ նյութն է մեծանում։', 4),
    ('PHY7-U02-S02-I07', 'A', 'Այո՛, լարի երկարության մեծացումը ուղղակի չափում է առանձին մասնիկների չափերի մեծացումը։', 1),
    ('PHY7-U02-S02-I07', 'B', 'Լարը երկարել է, քանի որ տաքացնելիս նրա ներսում նոր պղնձի մասնիկներ են առաջացել։', 2),
    ('PHY7-U02-S02-I07', 'C', 'Նկարում դիտվում է լարի ձևի փոփոխությունը, ոչ թե առանձին մասնիկների չափը։ Մասնիկային մոդելում երկարացումը կապվում է միջին հեռավորությունների մեծացման հետ։', 3),
    ('PHY7-U02-S02-I07', 'D', 'Լարը հոծ է՝ առանց մասնիկների միջև տարածությունների, ուստի երկարացումը հնարավոր է միայն հոծ նյութի մեծացմամբ։', 4),
    ('PHY7-U02-S02-I08', 'A', 'Սեղմելիս օդի մասնիկները անհետանում են, իսկ ծավալը վերականգնելիս նորից առաջանում։', 1),
    ('PHY7-U02-S02-I08', 'B', 'Օդը հոծ է՝ առանց մասնիկների միջև տարածությունների, և հոծ նյութը փոքրանում ու հետո մեծանում է։', 2),
    ('PHY7-U02-S02-I08', 'C', 'Սեղմելիս օդի մասնիկները դառնում են հեղուկի մասնիկներ, իսկ հետո նորից վերածվում օդի մասնիկների։', 3),
    ('PHY7-U02-S02-I08', 'D', 'Սեղմելիս մասնիկների միջև միջին հեռավորությունները փոքրանում են, իսկ սկզբնական ծավալը վերականգնելիս՝ մեծանում։ Մասնիկների քանակն ու ինքնությունը պահպանվում են։', 4)
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
    ('PHY7-U02-S02-I05', 'A'),
    ('PHY7-U02-S02-I06', 'B'),
    ('PHY7-U02-S02-I07', 'C'),
    ('PHY7-U02-S02-I08', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'particle_structure_observations'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S02'
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S02-I05', 'B', 'matter_as_continuous', 'Նյութը ներկայացվում է որպես հոծ միջավայր՝ բացառելով մասնիկների միջև տարածությունները։'),
    ('PHY7-U02-S02-I05', 'C', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։'),
    ('PHY7-U02-S02-I05', 'D', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։'),
    ('PHY7-U02-S02-I06', 'A', 'particle_size_increases_on_heating', 'Տաքանալիս չափի փոփոխությունը սխալմամբ վերագրվում է առանձին մասնիկների մեծանալուն։'),
    ('PHY7-U02-S02-I06', 'C', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։'),
    ('PHY7-U02-S02-I06', 'D', 'matter_as_continuous', 'Նյութը ներկայացվում է որպես հոծ միջավայր՝ բացառելով մասնիկների միջև տարածությունները։'),
    ('PHY7-U02-S02-I07', 'A', 'particle_size_increases_on_heating', 'Տաքանալիս չափի փոփոխությունը սխալմամբ վերագրվում է առանձին մասնիկների մեծանալուն։'),
    ('PHY7-U02-S02-I07', 'B', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։'),
    ('PHY7-U02-S02-I07', 'D', 'matter_as_continuous', 'Նյութը ներկայացվում է որպես հոծ միջավայր՝ բացառելով մասնիկների միջև տարածությունները։'),
    ('PHY7-U02-S02-I08', 'A', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։'),
    ('PHY7-U02-S02-I08', 'B', 'matter_as_continuous', 'Նյութը ներկայացվում է որպես հոծ միջավայր՝ բացառելով մասնիկների միջև տարածությունները։'),
    ('PHY7-U02-S02-I08', 'C', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է մասնիկների քանակի կամ ինքնության փոփոխության հետ։')
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
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
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
  '15B.13 հեռանկարային ապացուցողական սխեմայով S02 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13 S02 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս կապել դիտումը մասնիկային մոդելի հետ',
  'Սկզբում նկարագրիր՝ ինչ է չափվել կամ դիտվել՝ ծավալ, մխոցի դիրք, լարի երկարություն։ Ապա բացատրությունը կառուցիր մասնիկների միջև միջին հեռավորությունների փոփոխությամբ։ Փակ համակարգում, երբ նյութ չի ավելացվում կամ կորչում և քիմիական փոփոխություն չկա, մասնիկների քանակն ու ինքնությունը պահպանվում են։ Ջերմային ընդարձակման պարզ մոդելում առանձին մասնիկների չափերի մեծացում չենք ենթադրում։ Մակրոսկոպական նկարն ինքնին առանձին մասնիկի չափում չէ։',
  'Ի՞նչն է փոխվել փորձի ընթացքում, և արդյո՞ք նյութ է մտել կամ դուրս եկել համակարգից։',
  'Տարբերակիր նյութի զբաղեցրած ծավալը մասնիկների քանակից ու չափերից։ Մասնիկների միջև տարածությունների փոփոխությունը կարող է փոխել նույն նյութի ծավալը։',
  'Փակ պլաստիկ շշի օդը սեղմում են՝ առանց օդի արտահոսքի։ Պարզ մասնիկային մոդելում օդի մասնիկների քանակն ու ինքնությունը պահպանվում են, իսկ նրանց միջև միջին հեռավորությունները փոքրանում են։ Սա ծավալի փոփոխության բացատրություն է, ոչ թե մասնիկների անհետացման դիտում։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-24'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
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
  '15B.13 S02 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
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
  on family.code = 'PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS'
join public.item_family_curriculum_reconciliations reconciliation
  on reconciliation.reconciliation_id = run.id
 and reconciliation.item_family_id = family.id
where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
on conflict (curriculum_release_id, item_family_id) do nothing;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.item_templates template
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
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
    raise exception '15B13_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B13_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B13_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 4 then
    raise exception '15B13_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS';
  if v_count <> 16 then
    raise exception '15B13_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS';
  if v_count <> 12 then
    raise exception '15B13_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
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
    raise exception '15B13_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS';
  if v_count <> 4 then
    raise exception '15B13_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B13_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS';
  if v_count <> 0 then
    raise exception '15B13_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S02-F02-PARTICLE-OBSERVATIONS'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S02-I0[5-8]$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S02-I0[5-8]$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 12 then
    raise exception '15B13_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S02-I0[5-8]$') <> 4 then
    raise exception '15B13_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S02-I0[5-8]$' and u.code='PHY7-U02' and c.is_primary) <> 4 then
    raise exception '15B13_curriculum_scope_failed';
  end if;
end $$;



