-- Full-catalogue guard includes history, templates, misconception definitions and guides.
-- SHARE locks make the comparison and additive authoring one atomic operation.
lock table public.items, public.item_options, public.item_answer_keys, public.item_misconception_mappings, public.item_versions, public.item_templates, public.misconceptions, public.skills, public.skill_outcomes, public.item_template_remediation_guides in share mode;
do $corpus$
begin
  if (md5(jsonb_build_object('items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.items r),'item_options',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_options r),'item_answer_keys',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_answer_keys r),'item_misconception_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_misconception_mappings r),'item_versions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_versions r),'item_templates',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_templates r),'misconceptions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.misconceptions r),'skills',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skills r),'skill_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcomes r),'item_template_remediation_guides',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_template_remediation_guides r))::text)) is distinct from '401fe8c7d02567eba575ce499f55b2f0' then
    raise exception '15B13D_whole_bank_comparison_stale';
  end if;
end $corpus$;

-- Sprint 15B.13D: subject-aware, learner-inactive S03 authoring only.
-- Source: Physics 7 (2023), section 8, printed pp.27-28, figures 25-27; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  perform 1 from public.curriculum_releases where release_key='physics7_u01_u02_2026_08_14_candidate_r2' for update;
  if not exists (select 1 from public.skills where code='PHY7-U02-S03' and status='review') then
    raise exception '15B13D_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13D_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S03-I01','PHY7-U02-S03-I02','PHY7-U02-S03-I03','PHY7-U02-S03-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13D_existing_S03_review_incomplete';
  end if;
  if (select count(*) from public.misconceptions m join public.skills s on s.id=m.skill_id
      where s.code='PHY7-U02-S03' and m.status='active' and m.code in
      ('atom_molecule_confusion','atom_identity_changes_in_molecule','molecule_atom_composition_confusion')) <> 3 then
    raise exception '15B13D_approved_misconceptions_missing';
  end if;
  if not exists(select 1 from public.item_template_remediation_guides g join public.item_templates t on t.id=g.item_template_id where t.code='PHY7-U02-S03-T01-CLASSIFY' and g.status='published' and g.guide_version=3) then
    raise exception '15B13D_existing_guide_changed';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S03-T02-ATOMIC-MODELS')
     or exists (select 1 from public.items where code in ('PHY7-U02-S03-I05','PHY7-U02-S03-I06','PHY7-U02-S03-I07','PHY7-U02-S03-I08'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S03-F02-ATOMIC-MODELS') then
    raise exception '15B13D_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S03-F02-ATOMIC-MODELS',
  'Ատոմների մոդելները և մոլեկուլի հատկությունները',
  'Տարբերակել ատոմի տեսակը, առանձին ատոմը, մոլեկուլ կազմող միավորումը և մոլեկուլի քիմիական հատկությունները՝ դասագրքի պատկերներով ու կառուցման համեմատությամբ։',
  jsonb_build_object(
    'sprint', '15B.13D',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'atomic_models_and_properties',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'core_understanding', 'itemCode', 'PHY7-U02-S03-I05'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S03-I06'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S03-I07'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S03-I08')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array(
      'S04_molecular_size_estimation', 'S08_particle_speed', 'chemical_reaction_equations', 'ions_isotopes_and_bonding_theory'
    ),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 27-28, նկարներ 25-27'
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
    on family.code = 'PHY7-U02-S03-F02-ATOMIC-MODELS'
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
       'Ընտանիքը աջակցում է պարտադիր 1(1) վերջնարդյունքին՝ նյութի մասնիկային կառուցվածքի բացատրության համար տարբերակելով ատոմը, տարրը և մոլեկուլը։ Սա չի փոխում հաստատված հմտությունների քարտեզը։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S03-T02-ATOMIC-MODELS',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13D',
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
    'familySizeRationaleHy', 'Չորս հարցերից մեկը պատկերային նպատակային կրկնություն է, իսկ երեքը ավելացնում են հաշվառման մակարդակների, մոլեկուլի հատկությունների և կառուցման համեմատության հիմնավորում։ Տասներկուսի թիրախը լրացնելու համար հավելյալ կրկնություններ չեն ստեղծվում։',
    'skillCode', 'PHY7-U02-S03',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S03-F02-ATOMIC-MODELS'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S03-I05', 'single_choice', 'Նկար 25-ում H, C և O նշաններով առանձնացված են գնդիկների երեք խմբեր։ Ո՞ր նկարագրությունն է ճիշտ կարդում այս ատոմային մոդելը։', 2, 'atomic_models_and_properties:05', 'element_types_in_model', 'core_understanding', 'Սահմանումների նպատակային պատկերային կրկնություն. գնդիկը տարբերակում է մոլեկուլից, իսկ նույն նշանի ատոմները՝ տարբեր նշանների ատոմներից։ Նոր ինքնուրույն կառուցվածքային ծածկույթ չի համարվում։'),
    ('PHY7-U02-S03-I06', 'single_choice', 'Նկար 26-ի աջ կողմում ջրածնի մեկ մոլեկուլի մոդելն է։ Եթե ունենանք այդպիսի երեք մոլեկուլ, ո՞ր հաշվառումն է ճիշտ ներկայացնում մոլեկուլների թիվը, ատոմների ընդհանուր թիվը և ատոմների տեսակների թիվը։', 2, 'atomic_models_and_properties:06', 'molecule_atom_type_count_levels', 'application', 'Մեկ մոլեկուլի կառուցվածքից անցնում է երեք մոլեկուլի հաշվառմանը՝ առանձին հաշվելով մոլեկուլները, բաղադրիչ ատոմները և ատոմների տեսակները։ Մեկ H₂-ի անվանման պարզ կրկնություն չէ։'),
    ('PHY7-U02-S03-I07', 'single_choice', 'Նկար 27-ում ջրի մոլեկուլը կազմվում է ջրածնի և թթվածնի ատոմներից։ Սովորողը պնդում է. «Քանի որ ջրի մոլեկուլի մեջ ջրածնի ատոմ կա, այդ առանձին ատոմն էլ ունի ջրի քիմիական հատկությունները»։ Ո՞ր պատասխանն է ուղղում սխալը։', 3, 'atomic_models_and_properties:07', 'molecular_properties_not_component_atom', 'misconception_diagnosis', 'Մոլեկուլի քիմիական հատկությունները չի վերագրում նրա առանձին բաղադրիչ ատոմին. կիրառվում է էջ 28-ի մոլեկուլի սահմանումը, ոչ միայն H₂O-ի կազմի ճանաչումը։'),
    ('PHY7-U02-S03-I08', 'single_choice', 'Դասագիրքը ատոմները համեմատում է «Լեգո» խաղի կառուցման մասերի հետ. մի քանի տեսակի մասերից կարելի է հավաքել տարբեր կառուցվածքներ։ Ո՞ր միտքն է այս համեմատությունը փոխանցում նյութերի կառուցվածքի մասին։', 3, 'atomic_models_and_properties:08', 'limited_types_many_combinations', 'transfer_reasoning', 'Կառուցման համեմատությունը տեղափոխում է ատոմային մակարդակ՝ տարբեր նյութերի առաջացումը կապելով ատոմների տարբեր համադրությունների, ոչ ամեն նյութի համար նոր տարրի անհրաժեշտության հետ։')
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
    when 'PHY7-U02-S03-I05' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-25.png", "altHy": "Նկար 25. H, C և O նշաններով երեք առանձին խմբերում պատկերված են գնդիկներ։ H-ի գնդիկները մոխրագույն են, C-ինը՝ կապույտ, O-ինը՝ կանաչ։", "source": {"edition": "Physics 7 (2023)", "printedPage": 27, "figure": 25, "sha256": "005c1776e8cc3dfcfe861c91ca968d8977de0787df0e450d58b5d092379e53d6"}}'::jsonb
    when 'PHY7-U02-S03-I06' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-26.png", "altHy": "Նկար 26. ձախում երկու առանձին մոխրագույն գնդիկ է՝ H և H նշումներով ու գումարման նշանով, աջում՝ իրար միացած երկու գնդիկ՝ H₂ նշումով։", "source": {"edition": "Physics 7 (2023)", "printedPage": 28, "figure": 26, "sha256": "8104d02f0e9160a75aea2185841793720ec5e2fbe4b158b9d68c18d630d105d3"}}'::jsonb
    when 'PHY7-U02-S03-I07' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-27.png", "altHy": "Նկար 27. ձախում H, H և O նշումներով առանձին գնդիկներ են, աջում՝ իրար միացած երեք գնդիկ՝ H₂O նշումով։", "source": {"edition": "Physics 7 (2023)", "printedPage": 28, "figure": 27, "sha256": "1ab9b4366eaadbefa379ed14d1f841bd5d3e25463e62a3ef949dc177078871e4"}}'::jsonb
    else '{}'::jsonb end,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B13D-DRAFT',
    'intendedBank', 'practice_review',
    'wholeSkillReviewPolicy', 'haiedu-whole-skill-review-v1',
    'wholeSkillReviewEvidence', 'docs/chapter-ii-s03-whole-bank-review.md',
    'wholeSkillReviewDisposition', case when row.code='PHY7-U02-S03-I05' then 'intentional_practice_variant' else 'new_reasoning_coverage' end,
    'illustrationDisposition', case when row.code='PHY7-U02-S03-I08' then 'verbal_task_no_illustration_needed' else 'source_textbook_figure' end,
    'sprint', '15B.13D',
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
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 27-28, նկարներ 25-27'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'atomic_models_and_properties',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(1); Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 27-28, նկարներ 25-27',
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
join public.skills skill on skill.code = 'PHY7-U02-S03'
join public.item_templates template on template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S03-I05', 'A', 'Յուրաքանչյուր գնդիկ ատոմ է. նույն նշանի խմբում ատոմները նույն տեսակի են, իսկ H, C և O խմբերը ներկայացնում են տարբեր տարրեր։', 1),
    ('PHY7-U02-S03-I05', 'B', 'Յուրաքանչյուր առանձին գնդիկ մոլեկուլ է, իսկ նրա նշանը ցույց է տալիս այդ մոլեկուլի անունը։', 2),
    ('PHY7-U02-S03-I05', 'C', 'H նշանի կողքի բոլոր գնդիկները միասին մեկ մոլեկուլ են, քանի որ նույն խմբում են պատկերված։', 3),
    ('PHY7-U02-S03-I05', 'D', 'Բոլոր երեք խմբերը նույն քիմիական տարրն են ներկայացնում, քանի որ բոլոր գնդիկներն ատոմներ են։', 4),
    ('PHY7-U02-S03-I06', 'A', '3 մոլեկուլ, 3 ատոմ, 1 տեսակի ատոմ։', 1),
    ('PHY7-U02-S03-I06', 'B', '3 մոլեկուլ, 6 ատոմ, 1 տեսակի ատոմ։', 2),
    ('PHY7-U02-S03-I06', 'C', '3 մոլեկուլ, 6 ատոմ, 6 տեսակի ատոմ։', 3),
    ('PHY7-U02-S03-I06', 'D', '6 մոլեկուլ, 3 ատոմ, 1 տեսակի ատոմ։', 4),
    ('PHY7-U02-S03-I07', 'A', 'Պնդումը ճիշտ է. մոլեկուլի յուրաքանչյուր ջրածնի ատոմ առանձին ունի ջրի քիմիական հատկությունները։', 1),
    ('PHY7-U02-S03-I07', 'B', 'Ջրի քիմիական հատկություններն ունի միայն առանձին թթվածնի ատոմը, իսկ ջրածնի ատոմները՝ ոչ։', 2),
    ('PHY7-U02-S03-I07', 'C', 'Ջրի քիմիական հատկություններն ունի ամբողջ ջրի մոլեկուլը. նրա առանձին բաղադրիչ ատոմը ջրի մոլեկուլ չէ։', 3),
    ('PHY7-U02-S03-I07', 'D', 'Միանալիս ջրածնի և թթվածնի ատոմները փոխում են իրենց տեսակը և դառնում «ջրի տարրի» ատոմներ։', 4),
    ('PHY7-U02-S03-I08', 'A', 'Ամեն տարբեր նյութի համար անհրաժեշտ է առանձին նոր տեսակի ատոմ, հետևաբար՝ նոր քիմիական տարր։', 1),
    ('PHY7-U02-S03-I08', 'B', 'Տարբեր կառուցվածք հավաքելիս ատոմները պարտադիր փոխում են իրենց տեսակը և դառնում այլ տարրերի ատոմներ։', 2),
    ('PHY7-U02-S03-I08', 'C', 'Տարբեր տարրերի ատոմները չեն կարող միանալ նույն մոլեկուլի մեջ, ուստի տարբեր համադրություններն անհնար են։', 3),
    ('PHY7-U02-S03-I08', 'D', 'Ատոմների տեսակների տարբեր համադրությունները կարող են կազմել տարբեր նյութեր՝ առանց ամեն նյութի համար նոր քիմիական տարր պահանջելու։', 4)
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
    ('PHY7-U02-S03-I05', 'A'),
    ('PHY7-U02-S03-I06', 'B'),
    ('PHY7-U02-S03-I07', 'C'),
    ('PHY7-U02-S03-I08', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'atomic_models_and_properties'
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
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S03-T02-ATOMIC-MODELS'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code,title_hy,description_hy) as (values
('unjoined_atoms_as_molecule','Չմիացած ատոմների խումբը մոլեկուլ համարելը','Սովորողը երկու կամ ավելի ատոմների ներկայությունը կամ նկարում կողք կողքի պատկերված լինելը բավարար է համարում մեկ մոլեկուլ ճանաչելու համար՝ անտեսելով դրանց միացած լինելը։'),
('different_elements_atoms_identical','Տարբեր տարրերի ատոմները նույն տեսակի համարելը','Սովորողը տարբեր քիմիական տարրերի ատոմները նույն տեսակի է համարում միայն այն պատճառով, որ դրանք բոլորը ատոմներ են։'),
('molecular_properties_assigned_to_atom','Մոլեկուլի քիմիական հատկությունները առանձին ատոմին վերագրելը','Սովորողը նյութի մոլեկուլի քիմիական հատկությունները վերագրում է մոլեկուլի առանձին բաղադրիչ ատոմին՝ այն նույնացնելով ամբողջ մոլեկուլի հետ։'),
('each_substance_requires_new_element','Ամեն նյութի համար նոր քիմիական տարր պահանջելը','Սովորողը կարծում է, որ ամեն տարբեր նյութ անպայման պահանջում է ատոմի նոր տեսակ՝ անտեսելով արդեն հայտնի տեսակների տարբեր համադրություններով նյութերի բազմազանությունը։'),
('particle_count_levels_confusion','Մոլեկուլների, ատոմների և դրանց տեսակների թվերը շփոթելը','Սովորողը շփոթում է մոլեկուլների թիվը, դրանցում առկա ատոմների ընդհանուր թիվը և ատոմների տեսակների թիվը՝ նույն հաշվարկը վերագրելով տարբեր մակարդակների։'))
insert into public.misconceptions(skill_id,code,title_hy,description_hy,status)
select s.id,r.code,r.title_hy,r.description_hy,'draft'
from misconception_rows r join public.skills s on s.code='PHY7-U02-S03';

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S03-I05', 'B', 'atom_molecule_confusion', 'Մեկ առանձին ատոմի պատկերը սխալմամբ կոչվում է մոլեկուլ։'),
    ('PHY7-U02-S03-I05', 'C', 'unjoined_atoms_as_molecule', 'Նկարում մեկ խմբում լինելը շփոթվում է մեկ մոլեկուլի մեջ միացած լինելու հետ։'),
    ('PHY7-U02-S03-I05', 'D', 'different_elements_atoms_identical', 'Տարբեր նշաններով տարրերի ատոմները նույն տեսակի են համարվում միայն ընդհանուր «ատոմ» անվան հիմքով։'),
    ('PHY7-U02-S03-I06', 'A', 'particle_count_levels_confusion', 'Մոլեկուլների թիվը վերագրվում է ատոմներին՝ չհաշվելով յուրաքանչյուր մոլեկուլի երկու ատոմները։'),
    ('PHY7-U02-S03-I06', 'C', 'particle_count_levels_confusion', 'Ատոմների ընդհանուր թիվը սխալմամբ ընդունվում է որպես ատոմների տեսակների թիվ։'),
    ('PHY7-U02-S03-I06', 'D', 'particle_count_levels_confusion', 'Մոլեկուլների և բաղադրիչ ատոմների թվերը փոխատեղվում են։'),
    ('PHY7-U02-S03-I07', 'A', 'molecular_properties_assigned_to_atom', 'Ամբողջ ջրի մոլեկուլի քիմիական հատկությունները վերագրվում են առանձին ջրածնի ատոմին։'),
    ('PHY7-U02-S03-I07', 'B', 'molecular_properties_assigned_to_atom', 'Ամբողջ ջրի մոլեկուլի քիմիական հատկությունները վերագրվում են առանձին թթվածնի ատոմին։'),
    ('PHY7-U02-S03-I07', 'D', 'atom_identity_changes_in_molecule', 'Ջրածնի և թթվածնի ատոմները սխալմամբ փոխարինվում են նոր՝ «ջրի տարրի» ատոմներով։'),
    ('PHY7-U02-S03-I08', 'A', 'each_substance_requires_new_element', 'Նյութերի բազմազանությունը մեկնաբանվում է որպես ամեն նյութի համար նոր ատոմային տեսակ ունենալու անհրաժեշտություն։'),
    ('PHY7-U02-S03-I08', 'B', 'atom_identity_changes_in_molecule', 'Տարբեր համադրությունը սխալմամբ պահանջում է ատոմների տարրային պատկանելության փոփոխություն։'),
    ('PHY7-U02-S03-I08', 'C', 'molecule_atom_composition_confusion', 'Սխալմամբ բացառվում են տարբեր տարրերի ատոմներից կազմված մոլեկուլները։')
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
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
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
  '15B.13D հեռանկարային ապացուցողական սխեմայով S03 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13D S03 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս կարդալ ատոմների և մոլեկուլների մոդելները',
  'Առանձին դիտարկիր ատոմի տեսակը, ատոմների քանակը և նրանց միացած լինելը։ Մի քանի մոլեկուլի համար նախ որոշիր մեկ մոլեկուլի ատոմների թիվը, ապա՝ ընդհանուր թիվը. ատոմների թիվն ավելանալուց տեսակների թիվը պարտադիր չի ավելանում։ Նկարում նույն խմբում գտնվելը դեռ չի նշանակում մոլեկուլ կազմել։ Միացած ատոմները կազմում են ամբողջական մասնիկ, որի քիմիական հատկությունները չի կարելի ինքնաբերաբար վերագրել առանձին բաղադրիչին։ Ատոմների համադրությունների բազմազանությունը տարբերակիր ատոմների տեսակների բազմազանությունից։',
  'Ի՞նչ է ներկայացնում մեկ գնդիկը, ի՞նչ է ցույց տալիս նրա նշանը, և արդյո՞ք գնդիկները միացած են մեկ մասնիկի մեջ։',
  'Համեմատի՛ր մասը և ամբողջը. ատոմի տեսակը, մոլեկուլի կազմը և նյութի հատկությունները նույն հարցը չեն։',
  'Կառուցման խաղում նույն տեսակի մասերը կարելի է միացնել կամուրջ կամ այլ կառուցվածք ստանալու համար։ Մասի տեսակը դրանից չի փոխվում, իսկ մեկ առանձին մասը ամբողջ կամուրջը չէ։ Ատոմների մասին համեմատությունն օգտագործելիս նույնպես պետք է տարբերակել բաղադրիչը և դրանց միավորումից կազմված ամբողջը. սա համեմատություն է, ոչ թե ատոմների բառացի նկարագրություն։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13D',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §8, տպագիր էջեր 27-28, նկարներ 25-27'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
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
  '15B.13D S03 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
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
  on family.code = 'PHY7-U02-S03-F02-ATOMIC-MODELS'
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
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
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
    raise exception '15B13D_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B13D_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and item.config->>'evidencePurpose' in (
      'core_understanding',
      'application',
      'misconception_diagnosis',
      'transfer_reasoning'
    );
  if v_count <> 4 then
    raise exception '15B13D_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 4 then
    raise exception '15B13D_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13D_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS';
  if v_count <> 16 then
    raise exception '15B13D_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS';
  if v_count <> 12 then
    raise exception '15B13D_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
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
    raise exception '15B13D_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS';
  if v_count <> 4 then
    raise exception '15B13D_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B13D_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13D_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13D_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S03-T02-ATOMIC-MODELS';
  if v_count <> 0 then
    raise exception '15B13D_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13D_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13D_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S03-F02-ATOMIC-MODELS'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)'
      and r.mapping_type_snapshot='derived_supporting') <> 1 then
    raise exception '15B13D_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S03-I0[5-8]$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13D_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S03-I0[5-8]$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 12 then
    raise exception '15B13D_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S03-I0[5-8]$') <> 4 then
    raise exception '15B13D_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S03-I0[5-8]$' and u.code='PHY7-U02' and c.is_primary) <> 4 then
    raise exception '15B13D_curriculum_scope_failed';
  end if;
end $$;



