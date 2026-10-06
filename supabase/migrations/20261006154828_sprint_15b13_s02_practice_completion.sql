-- Sprint 15B.13B: subject-aware, learner-inactive S02 authoring only.
-- Source: Physics 7 (2023), section 7, printed pp.24-26, figures 22-23, p.26 question 11; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  if not exists (select 1 from public.skills where code='PHY7-U02-S02' and status='review') then
    raise exception '15B13B_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13B_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code ~ '^PHY7-U02-S02-I0[1-8]$'
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 8 then
    raise exception '15B13B_existing_S02_review_incomplete';
  end if;
  if not exists (select 1 from public.item_template_remediation_guides g
      join public.item_templates t on t.id=g.item_template_id
      where t.code='PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS' and g.status='published'
        and exists (select 1 from public.remediation_guide_authoring_versions a
          where a.guide_scope='template' and a.guide_source_id=g.id and a.lifecycle_status='published'
            and a.published_runtime_version=g.guide_version)) then
    raise exception '15B13B_predecessor_guide_not_published';
  end if;
  if (select count(*) from public.misconceptions m join public.skills s on s.id=m.skill_id
      where s.code='PHY7-U02-S02' and m.status='active' and m.code in
      ('matter_as_continuous','particle_identity_or_count_changes','particle_size_increases_on_heating')) <> 3 then
    raise exception '15B13B_approved_misconceptions_missing';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS')
     or exists (select 1 from public.items where code in ('PHY7-U02-S02-I09','PHY7-U02-S02-I10','PHY7-U02-S02-I11','PHY7-U02-S02-I12'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS') then
    raise exception '15B13B_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS',
  'Մասնիկային մոդել. հիմնավորումներ և սահմաններ',
  'Համադրել մակրոսկոպական դիտումները մասնիկային մոդելի հետ՝ տարբերակելով տեսանելիությունը, ծավալը և համակարգում նյութի քանակը։',
  jsonb_build_object(
    'sprint', '15B.13B',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'particle_model_limits',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S02-I09'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S02-I10'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S02-I11'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S02-I12')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S03_atomic_composition', 'S04_molecular_size_estimation', 'S08_particle_speed', 'quantitative_gas_laws'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-23, էջ 26-ի հարց 11'
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
    on family.code = 'PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS'
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
       'Ընտանիքը գնահատում է մասնիկային կառուցվածքի հիմնավորումը՝ համեմատելով դիտումները, ստուգելով պնդումների սահմանները և տարբերակելով ծավալի փոփոխությունը նյութի դուրս գալուց։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13B',
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
    'familySizeRationaleHy', 'Չորս հարցերը տարբերակում են անզեն աչքով տեսանելիությունը և կառուցվածքը, համադրում տաքացումն ու սեղմումը, ստուգում հեղուկի սեղմելիությունից արված եզրակացությունը և համեմատում փակ ու բաց համակարգերում գազի ծավալի փոփոխությունները։',
    'skillCode', 'PHY7-U02-S02',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S02-I09', 'single_choice', 'Պղնձե լարն անզեն աչքով հոծ է թվում. առանձին մասնիկներ և դրանց միջև տարածություններ չենք տեսնում։ Ինչո՞ւ այս դիտումը չի հերքում նյութի մասնիկային կառուցվածքը։', 2, 'particle_model_limits:09', 'visibility_and_structure', 'core_understanding', 'Բացատրում է, թե ինչու անզեն աչքով հոծ երևալը չի հերքում չափազանց փոքր մասնիկների և դրանց միջև տարածությունների գոյությունը։'),
    ('PHY7-U02-S02-I10', 'single_choice', 'Նկարում պատկերված պղնձե լարը տաքացնելիս երկարում է։ Մեկ այլ փորձով փակ ներարկիչի օդը սեղմում են՝ առանց օդի արտահոսքի։ Ո՞ր զույգ բացատրությունն է համապատասխանում երկու փորձերին՝ պարզ մասնիկային մոդելի շրջանակում։', 3, 'particle_model_limits:10', 'heating_compression_comparison', 'application', 'Նույն մոդելը կիրառում է երկու հակադիր ծավալային փոփոխությունների նկատմամբ՝ առանց մասնիկների ստեղծում, անհետացում կամ չափի մեծացում ենթադրելու։'),
    ('PHY7-U02-S02-I11', 'single_choice', 'Նկարի ա մասում հեղուկը բեռի ազդեցությամբ գրեթե չի սեղմվում։ Սովորողը եզրակացնում է. «Ուրեմն հեղուկի մասնիկների միջև տարածություններ չկան»։ Ո՞ր պատասխանն է ճիշտ գնահատում այդ եզրակացությունը։', 3, 'particle_model_limits:11', 'incompressibility_inference', 'misconception_diagnosis', 'Բացահայտում է հեղուկի փոքր սեղմելիությունը մասնիկների միջև տարածությունների բացակայության հետ նույնացնելու սխալը՝ համադրելով տարբեր փորձերի վկայությունները։'),
    ('PHY7-U02-S02-I12', 'single_choice', 'Երկու ներարկիչներում սկզբում նույն քանակի օդ կա։ Առաջինի ծայրը փակ է. մխոցը ներս են սեղմում՝ առանց օդի արտահոսքի։ Երկրորդի ծայրը բաց է. մխոցը ներս հրելիս օդի մի մասը դուրս է գալիս։ Երկուսում էլ օդի զբաղեցրած ծավալը փոքրանում է։ Ի՞նչ տարբերություն պետք է արտացոլի մասնիկային մոդելը։', 3, 'particle_model_limits:12', 'closed_open_system_comparison', 'transfer_reasoning', 'Տարբերակում է նույն մակրոսկոպական արդյունքի երկու պատճառ՝ փակ համակարգի սեղմումը և բաց համակարգից նյութի դուրս գալը։')
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
    when 'PHY7-U02-S02-I10' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-23.png", "altHy": "Նկար 23. երկու հենարանի միջև ամրացված պղնձե լար և դրա տակ գտնվող այրիչ։", "source": {"edition": "Physics 7 (2023)", "printedPage": 25, "figure": 23, "sha256": "538d24ea12db1075815db91bdb6a2fb14f6c2ad6b8a5ba086eb754516aa228d8"}}'::jsonb
    when 'PHY7-U02-S02-I11' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-22.png", "altHy": "Նկար 22. ա՝ հեղուկով, բ՝ գազով գլաններ՝ առանց բեռի և բեռի ազդեցության տակ։", "source": {"edition": "Physics 7 (2023)", "printedPage": 24, "figure": 22, "sha256": "6b52815c60f5d3324d6c5c44c9896511d7a3e7adc1827edf1e5981c1adf9860b"}}'::jsonb
    else '{}'::jsonb end,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B13B-DRAFT',
    'intendedBank', 'practice_review',
    'illustrationDisposition', case when row.code in ('PHY7-U02-S02-I09','PHY7-U02-S02-I12') then 'verbal_task_no_illustration_needed' else 'source_textbook_figure' end,
    'sprint', '15B.13B',
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
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-23, էջ 26-ի հարց 11'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'particle_model_limits',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(1); Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-23, էջ 26-ի հարց 11',
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
join public.item_templates template on template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S02-I09', 'A', 'Պղինձը հոծ նյութ է. մասնիկներից կազմված են միայն գազերը։', 1),
    ('PHY7-U02-S02-I09', 'B', 'Մասնիկներն ու դրանց միջև տարածություններն այնքան փոքր են, որ անզեն աչքով չեն զանազանվում։', 2),
    ('PHY7-U02-S02-I09', 'C', 'Պղնձի մասնիկները հանգստի վիճակում միաձուլվում են մեկ ամբողջական մասնիկի։', 3),
    ('PHY7-U02-S02-I09', 'D', 'Պղնձի մասնիկներն առաջանում են միայն տաքացնելիս, իսկ մինչև տաքացնելը դրանք չկան։', 4),
    ('PHY7-U02-S02-I10', 'A', 'Լարում նոր մասնիկներ են առաջանում, իսկ ներարկիչի օդի որոշ մասնիկներ անհետանում են։', 1),
    ('PHY7-U02-S02-I10', 'B', 'Լարի առանձին մասնիկները մեծանում են, իսկ օդի մասնիկների միջև հեռավորությունները փոքրանում են։', 2),
    ('PHY7-U02-S02-I10', 'C', 'Երկու նյութերն էլ հոծ են. մեկը մեծանում է, մյուսը՝ փոքրանում՝ առանց մասնիկների միջև տարածությունների։', 3),
    ('PHY7-U02-S02-I10', 'D', 'Լարում մասնիկների միջև միջին հեռավորությունները մեծանում են, իսկ օդում՝ փոքրանում. երկու դեպքում էլ մասնիկների քանակը պահպանվում է։', 4),
    ('PHY7-U02-S02-I11', 'A', 'Գրեթե չսեղմվելը չի նշանակում տարածությունների բացակայություն. հեղուկի մասնիկների միջև տարածությունների մասին վկայում են նաև լուծման և խառնման փորձերը։', 1),
    ('PHY7-U02-S02-I11', 'B', 'Եզրակացությունը ճիշտ է. հեղուկները հոծ են, իսկ մասնիկների միջև տարածություններ կան միայն գազերում։', 2),
    ('PHY7-U02-S02-I11', 'C', 'Հեղուկի մասնիկները սեղմելիս միաձուլվում են մեկ մասնիկի, ուստի նրա ծավալը գրեթե չի փոխվում։', 3),
    ('PHY7-U02-S02-I11', 'D', 'Աղը ջրում լուծելիս նրա մասնիկներն անհետանում են, ուստի լուծման փորձը նույնպես հաստատում է հեղուկի հոծ լինելը։', 4),
    ('PHY7-U02-S02-I12', 'A', 'Երկու ներարկիչում էլ մասնիկների քանակը նվազում է, քանի որ օդի զբաղեցրած ծավալը փոքրանում է։', 1),
    ('PHY7-U02-S02-I12', 'B', 'Փակ ներարկիչում օդի մասնիկները վերածվում են այլ նյութի մասնիկների, իսկ բաց ներարկիչից դրանց մի մասը դուրս է գալիս։', 2),
    ('PHY7-U02-S02-I12', 'C', 'Փակ ներարկիչում մասնիկների քանակը պահպանվում է, իսկ բաց ներարկիչում՝ նվազում, քանի որ դրանց մի մասը դուրս է գալիս։', 3),
    ('PHY7-U02-S02-I12', 'D', 'Երկու ներարկիչում էլ օդը հոծ նյութ է, ուստի ծավալի փոփոխությունը մասնիկներով բացատրել պետք չէ։', 4)
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
    ('PHY7-U02-S02-I09', 'B'),
    ('PHY7-U02-S02-I10', 'D'),
    ('PHY7-U02-S02-I11', 'A'),
    ('PHY7-U02-S02-I12', 'C')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'particle_model_limits'
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
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S02-I09', 'A', 'matter_as_continuous', 'Սխալ պնդումը ժխտում է մասնիկային կառուցվածքը կամ մասնիկների միջև տարածությունների գոյությունը։'),
    ('PHY7-U02-S02-I09', 'C', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I09', 'D', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I10', 'A', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I10', 'B', 'particle_size_increases_on_heating', 'Լարի ջերմային ընդարձակումը սխալմամբ վերագրվում է առանձին մասնիկների չափերի մեծանալուն։'),
    ('PHY7-U02-S02-I10', 'C', 'matter_as_continuous', 'Սխալ պնդումը ժխտում է մասնիկային կառուցվածքը կամ մասնիկների միջև տարածությունների գոյությունը։'),
    ('PHY7-U02-S02-I11', 'B', 'matter_as_continuous', 'Սխալ պնդումը ժխտում է մասնիկային կառուցվածքը կամ մասնիկների միջև տարածությունների գոյությունը։'),
    ('PHY7-U02-S02-I11', 'C', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I11', 'D', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I12', 'A', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I12', 'B', 'particle_identity_or_count_changes', 'Պնդումը ենթադրում է չհիմնավորված առաջացում, անհետացում, միաձուլում կամ փոխակերպում. իրական արտահոսքը պետք է տարբերակել փակ համակարգի սեղմումից։'),
    ('PHY7-U02-S02-I12', 'D', 'matter_as_continuous', 'Սխալ պնդումը ժխտում է մասնիկային կառուցվածքը կամ մասնիկների միջև տարածությունների գոյությունը։')
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
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
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
  '15B.13B հեռանկարային ապացուցողական սխեմայով S02 ընդլայնման երկրորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13B S02 ընդլայնման երկրորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս ստուգել մասնիկային բացատրությունը',
  'Տարբերակի՛ր դիտված փաստը և դրա բացատրությունը։ Անզեն աչքով չտեսնելը չի նշանակում մասնիկների բացակայություն։ Տաքացման, սեղմման և նյութի դուրս գալու դեպքում նախ ստուգի՛ր՝ ինչն է փոխվել համակարգում։ Մեկ փորձից մի՛ եզրակացրու ավելին, քան այն ցույց է տալիս. նույն մոդելը պետք է համատեղելի լինի նաև մյուս դիտումների հետ։',
  'Ի՞նչ է անմիջապես դիտվել, և ո՞րն է դրանից արված եզրակացությունը։ Կարդա՛ նաև փորձի պայմանները։',
  'Համեմատի՛ր նկարագրությունները. նյութի մասնիկները պարզապես չեն երևո՞ւմ, նյութի զբաղեցրած ծավա՞լն է փոխվել, թե՞ նյութի մի մասը դուրս է եկել համակարգից։',
  'Մասնիկային մոդելը պատկերելու համար տուփի մեջ ութ գնդիկ դասավորենք սկզբում իրարից հեռու, ապա՝ ավելի մոտ։ Գնդիկների զբաղեցրած տարածքը կփոխվի, բայց դրանց թիվը կմնա ութ։ Եթե երկու գնդիկ հանենք տուփից, ներսում կմնա վեցը։ Սա պարզ մոդելային համեմատություն է. գնդիկները իրական նյութի մանրագույն մասնիկները չեն։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13B',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 24-26, նկարներ 22-23, էջ 26-ի հարց 11'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
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
  '15B.13B S02 ընդլայնման երկրորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
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
  on family.code = 'PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS'
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
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
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
    raise exception '15B13B_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B13B_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B13B_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 4 then
    raise exception '15B13B_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13B_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS';
  if v_count <> 16 then
    raise exception '15B13B_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS';
  if v_count <> 12 then
    raise exception '15B13B_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
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
    raise exception '15B13B_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS';
  if v_count <> 4 then
    raise exception '15B13B_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B13B_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13B_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13B_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS';
  if v_count <> 0 then
    raise exception '15B13B_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13B_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13B_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13B_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S02-I(09|1[0-2])$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13B_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S02-I(09|1[0-2])$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 12 then
    raise exception '15B13B_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S02-I(09|1[0-2])$') <> 4 then
    raise exception '15B13B_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S02-I(09|1[0-2])$' and u.code='PHY7-U02' and c.is_primary) <> 4 then
    raise exception '15B13B_curriculum_scope_failed';
  end if;
end $$;



