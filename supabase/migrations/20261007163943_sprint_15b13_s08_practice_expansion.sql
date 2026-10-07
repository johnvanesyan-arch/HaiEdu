-- Whole-bank comparison guard, including official outcomes and assessment-purpose memberships.
-- A bounded transaction locks the source catalogue before checking freshness.
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.items, public.item_options, public.item_answer_keys, public.item_misconception_mappings, public.item_versions, public.item_templates, public.misconceptions, public.skills, public.skill_outcomes, public.item_template_remediation_guides, public.skill_outcome_curriculum_mappings, public.learning_outcomes, public.assessment_pool_items, public.assessment_form_items in share mode;
do $corpus$
begin
  if (md5(jsonb_build_object('items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.items r),'item_options',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_options r),'item_answer_keys',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_answer_keys r),'item_misconception_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_misconception_mappings r),'item_versions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_versions r),'item_templates',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_templates r),'misconceptions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.misconceptions r),'skills',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skills r),'skill_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcomes r),'item_template_remediation_guides',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_template_remediation_guides r),'skill_outcome_curriculum_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcome_curriculum_mappings r),'learning_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.learning_outcomes r),'assessment_pool_items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_pool_items r),'assessment_form_items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_form_items r))::text)) is distinct from '3e84f404e9a6b75a1ac790e79d1fad8f' then
    raise exception '15B13I_whole_bank_comparison_stale';
  end if;
end $corpus$;

-- Sprint 15B.13I: subject-aware, learner-inactive S08 authoring only.
-- Source: Physics 7 (2023), section 11, printed pp.34-35; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  perform 1 from public.curriculum_releases where release_key='physics7_u01_u02_2026_08_14_candidate_r2' for update;
  if not exists (select 1 from public.skills where code='PHY7-U02-S08' and status='review') then
    raise exception '15B13I_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13I_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S08-I01','PHY7-U02-S08-I02','PHY7-U02-S08-I03','PHY7-U02-S08-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13I_existing_S08_review_incomplete';
  end if;
  if not exists(select 1 from public.item_template_remediation_guides g join public.item_templates t on t.id=g.item_template_id where t.code='PHY7-U02-S08-T01-RELATE-TEMPERATURE-MOTION' and g.status='published' and g.guide_version=2) then
    raise exception '15B13I_existing_guide_changed';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION')
     or exists (select 1 from public.items where code in ('PHY7-U02-S08-I05','PHY7-U02-S08-I06'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION') then
    raise exception '15B13I_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION',
  'Բնորոշ ջերմային արագության մեկնաբանումը և կիրառումը',
  'Տարբերակել բնորոշ և առանձին մոլեկուլի արագությունները և ջերմաստիճան–շարժում կապը կիրառել գոլորշիացման նկատմամբ։',
  jsonb_build_object(
    'sprint', '15B.13I',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'thermal_speed_interpretation',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S08-I05'),
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S08-I06')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array('speed_temperature_formula','kinetic_energy_formula','probability_distribution_calculations','thermometer_operation','evaporation_rate_law','cross_substance_speed_ranking'),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §11, տպագիր էջեր 34-35'
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
    on family.code = 'PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION'
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
       'Ընտանիքը պարտադիր 1(5) վերջնարդյունքի շրջանակում տարբերակում է բնորոշ և առանձին մոլեկուլի արագությունները և ջերմաստիճան–շարժում կապը կիրառում գոլորշիացման նկատմամբ։ Արագության բանաձևեր և հավանականության հաշվարկներ չեն պահանջվում։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13I',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'requiredEvidencePurposes', jsonb_build_array(
      'misconception_diagnosis',
      'application'
    ),
    'enforceUniqueEvidencePurposes', true,
    'familySizePolicy', 'outcome_appropriate',
    'familySizeRationaleHy', 'Առաջին հարցը տարբերակում է բնորոշ և առանձին մոլեկուլի արագությունները։ Երկրորդը գիտակցված վարժանքային տարբերակ է՝ ջերմաստիճան–շարժում կապը գոլորշիացման նկատմամբ կիրառելու համար։ Մնացած վեց պլանային տեղերը չեն լրացվում կրկնվող հարցերով։',
    'skillCode', 'PHY7-U02-S08',
    'variantCount', 2,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S08-I05', 'single_choice', 'Դասագրքում նշվում է, որ 200 °C-ում թթվածնի մոլեկուլների ջերմային շարժման բնորոշ արագությունը մոտ 585 մ/վ է։ Սովորողն ասում է. «Ուրեմն այդ ջերմաստիճանում թթվածնի յուրաքանչյուր մոլեկուլ ամեն պահի շարժվում է ճիշտ 585 մ/վ արագությամբ»։ Ո՞ր գնահատականն է հիմնավորված։', 2, 'thermal_speed_interpretation:05', 'characteristic_not_each_molecule_speed', 'misconception_diagnosis', 'Տարբերակում է գազի մոլեկուլների շարժման բնորոշ արագությունը յուրաքանչյուր առանձին մոլեկուլի արագությունից։ Նույն գազի մոլեկուլների արագությունների տարբերությունը չի նույնացվում տարբեր նյութերի համեմատության հետ։'),
    ('PHY7-U02-S08-I06', 'single_choice', 'Երկու միանման բաց անոթներում ջրի քանակը և բաց մակերեսը նույնն են։ Մեկում ջրի ջերմաստիճանը պահում են 20 °C, մյուսում՝ 35 °C։ Շրջակա օդի մյուս պայմանները նույնն են։ Դասագրքի մասնիկային բացատրությամբ ո՞ր պնդումն է ճիշտ նկարագրում ջրի գոլորշիացումը այս պայմաններում։', 2, 'thermal_speed_interpretation:06', 'evaporation_temperature_application', 'application', 'Գիտակցված վարժանքային տարբերակ է. ջերմաստիճան–մասնիկների շարժում կապը կիրառում է դասագրքում նկարագրված գոլորշիացման նկատմամբ։ Դիֆուզիայի առաջադրանքի համեմատ նոր անկախ վերջնարդյունք կամ ամբողջովին նոր լուծման ուղի չի հաշվարկվում։')
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
    'bank', 'PHY7-U02-15B13I-DRAFT',
    'intendedBank', 'practice_review',
    'wholeSkillReviewPolicy', 'haiedu-whole-skill-review-v1',
    'wholeSkillReviewEvidence', 'docs/chapter-ii-s08-whole-bank-review.md',
    'wholeSkillReviewDisposition', case when row.code='PHY7-U02-S08-I05' then 'new_reasoning_coverage' else 'intentional_practice_variant' end,
    'illustrationDisposition', 'verbal_task_no_illustration_needed',
    'sprint', '15B.13I',
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
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §11, տպագիր էջեր 34-35'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'thermal_speed_interpretation',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(5); Ֆիզիկա 7 (2023), Գլուխ II, §11, տպագիր էջեր 34-35',
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
join public.item_templates template on template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S08-I05', 'A', 'Պնդումը ճիշտ է. նույն ջերմաստիճանում տվյալ գազի բոլոր մոլեկուլները պարտադիր նույն արագությունն ունեն։', 1),
    ('PHY7-U02-S08-I05', 'B', 'Պնդումը սխալ է. 585 մ/վ-ը ցույց է տալիս գազով անոթի՝ որպես ամբողջություն շարժման արագությունը։', 2),
    ('PHY7-U02-S08-I05', 'C', 'Պնդումը սխալ է. բնորոշ արագությունը բոլոր մոլեկուլների նույն արագությունը չէ. գազում կան նաև ավելի արագ և ավելի դանդաղ շարժվող մոլեկուլներ։', 3),
    ('PHY7-U02-S08-I05', 'D', 'Պնդումը սխալ է. եթե մոլեկուլների արագությունները տարբեր են, գազն ընդհանրապես չի կարող ունենալ որոշակի ջերմաստիճան։', 4),
    ('PHY7-U02-S08-I06', 'A', '20 °C-ում ջուրն ավելի արագ է գոլորշիանում, քանի որ ցածր ջերմաստիճանում նրա մոլեկուլների ջերմային շարժման բնորոշ արագությունն ավելի մեծ է։', 1),
    ('PHY7-U02-S08-I06', 'B', 'Երկու անոթներում գոլորշիացումը նույն արագությամբ է ընթանում, քանի որ նույն նյութի մոլեկուլների շարժման բնորոշ արագությունը ջերմաստիճանից կախված չէ։', 2),
    ('PHY7-U02-S08-I06', 'C', 'Ոչ մի անոթում ջուրը չի գոլորշիանա, քանի դեռ չի եռում։', 3),
    ('PHY7-U02-S08-I06', 'D', '35 °C-ում ջուրն ավելի արագ է գոլորշիանում, քանի որ նրա մոլեկուլների ջերմային շարժման բնորոշ արագությունն ավելի մեծ է։', 4)
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
    ('PHY7-U02-S08-I05', 'C'),
    ('PHY7-U02-S08-I06', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'thermal_speed_interpretation'
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
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code,title_hy,description_hy) as (values
    ('same_gas_temperature_requires_equal_speeds', 'Նույն գազի որոշակի ջերմաստիճանը բոլոր մոլեկուլների հավասար արագությամբ պայմանավորելը', 'Սովորողը կարծում է, թե որոշակի ջերմաստիճան ունեցող գազի բոլոր մոլեկուլները պարտադիր նույն արագությունն ունեն, կամ թե դրանց տարբեր արագությունների դեպքում գազը չի կարող ունենալ որոշակի ջերմաստիճան։ Բնորոշ արագությունը չի նշանակում յուրաքանչյուր մոլեկուլի միևնույն արագություն։'),
    ('thermal_speed_is_bulk_motion', 'Ջերմային շարժման արագությունը մարմնի ամբողջական տեղաշարժի արագության հետ շփոթելը', 'Սովորողը մոլեկուլների անկանոն ջերմային շարժման բնորոշ արագությունը վերագրում է գազով անոթի կամ ամբողջ մարմնի ուղղորդված տեղաշարժին։'),
    ('evaporation_requires_boiling', 'Գոլորշիացումը միայն եռալիս հնարավոր համարելը', 'Սովորողը կարծում է, թե հեղուկի մոլեկուլները կարող են անցնել օդ միայն եռման ժամանակ՝ անտեսելով սովորական ջերմաստիճաններում ջրի գոլորշիացման դասագրքային օրինակը։'))
insert into public.misconceptions(skill_id,code,title_hy,description_hy,status)
select s.id,r.code,r.title_hy,r.description_hy,'draft'
from misconception_rows r join public.skills s on s.code='PHY7-U02-S08';

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S08-I05', 'A', 'same_gas_temperature_requires_equal_speeds', 'Բնորոշ արագությունը բոլոր մոլեկուլների նույն արագությունը չէ։ Դասագիրքը նույն գազում նկարագրում է տարբեր արագություններով մոլեկուլներ։'),
    ('PHY7-U02-S08-I05', 'B', 'thermal_speed_is_bulk_motion', 'Տրված արագությունը վերաբերում է մոլեկուլների ջերմային շարժմանը, ոչ անոթի՝ որպես ամբողջություն տեղաշարժին։'),
    ('PHY7-U02-S08-I05', 'D', 'same_gas_temperature_requires_equal_speeds', 'Մոլեկուլների տարբեր արագությունները չեն բացառում գազի որոշակի ջերմաստիճանը։ Ջերմաստիճանի համար չի պահանջվում բոլոր մոլեկուլների հավասար արագություն։'),
    ('PHY7-U02-S08-I06', 'A', 'heating_slows_motion', 'Նույն նյութի ավելի բարձր ջերմաստիճանին համապատասխանում է ջերմային շարժման ավելի մեծ բնորոշ արագություն. պատասխանում կապը շրջված է։'),
    ('PHY7-U02-S08-I06', 'B', 'temperature_unrelated_to_motion', 'Նյութի նույն լինելը չի վերացնում ջերմաստիճանի ազդեցությունը նրա մոլեկուլների շարժման բնորոշ արագության վրա։'),
    ('PHY7-U02-S08-I06', 'C', 'evaporation_requires_boiling', 'Դասագրքի ջրափոսերի չորացման օրինակը ցույց է տալիս, որ ջուրը գոլորշիանում է նաև առանց եռալու։')
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
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
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
  '15B.13I հեռանկարային ապացուցողական սխեմայով S08 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13I S08 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս մեկնաբանել մասնիկների բնորոշ արագությունը',
  'Նախ տարբերակի՛ր ամբողջ մարմնի տեղաշարժը և նրա մասնիկների անկանոն ջերմային շարժումը։ Գազի մոլեկուլների համար նշվող բնորոշ արագությունը բոլոր մոլեկուլների՝ ամեն պահի նույն արագությունը չէ. կան ավելի արագ և ավելի դանդաղ շարժվող մոլեկուլներ։ Այնուհետև պարզի՛ր՝ համեմատվում է արդյոք նույն նյութը նույն վիճակում։ Նույն նյութի ջերմաստիճանը բարձրացնելիս ջերմային շարժման բնորոշ արագությունը մեծանում է։ Դասագիրքն այդ կապով բացատրում է թե՛ դիֆուզիայի, թե՛ ջրի գոլորշիացման արագացումը։ Գոլորշիացումը մի՛ նույնացրու եռման հետ։ Նշված կապից արագության ճշգրիտ թիվ կամ ուղիղ համեմատականություն մի՛ եզրակացրու։',
  'Ո՞ւմ շարժման մասին է խոսքը՝ անոթի՞, թե՞ նրա մոլեկուլների։ «Բնորոշ» բառը նշանակո՞ւմ է, որ բոլոր մոլեկուլների արագությունները պարտադիր նույնն են։',
  'Նույն նյութի երկու վիճակ համեմատելիս կապի՛ր ավելի բարձր ջերմաստիճանը մասնիկների ավելի արագ ջերմային շարժման հետ։ Ստուգի՛ր նաև՝ արդյոք մյուս պայմանները նույնն են։',
  'Օրինակ՝ նույն նյութերով և մյուս հավասար պայմաններով կատարվող դիֆուզիայի երկու փորձերից ավելի տաք միջավայրում խառնումն ավելի արագ է ընթանում։ Դա կապվում է մասնիկների ավելի արագ անկանոն շարժման հետ, ոչ անոթի ամբողջական տեղաշարժի։ Միաժամանակ բնորոշ արագության մեծացումը չի նշանակում, թե բոլոր մոլեկուլները դարձել են հավասար արագությամբ շարժվող մասնիկներ։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13I',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §11, տպագիր էջեր 34-35'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
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
  '15B.13I S08 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
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
  on family.code = 'PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION'
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
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'evidenceBlueprintPolicy' = 'distinct-purpose-v1'
    and template.generation_config->'requiredEvidencePurposes' =
      '["misconception_diagnosis","application"]'::jsonb
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B13I_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 2 then
    raise exception '15B13I_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and item.config->>'evidencePurpose' in (
      'misconception_diagnosis',
      'application'
    );
  if v_count <> 2 then
    raise exception '15B13I_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 2 then
    raise exception '15B13I_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13I_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION';
  if v_count <> 8 then
    raise exception '15B13I_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION';
  if v_count <> 6 then
    raise exception '15B13I_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
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
  if v_count <> 2 then
    raise exception '15B13I_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION';
  if v_count <> 2 then
    raise exception '15B13I_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and version.version_no = 1;
  if v_count <> 2 then
    raise exception '15B13I_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13I_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13I_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S08-T02-THERMAL-SPEED-INTERPRETATION';
  if v_count <> 0 then
    raise exception '15B13I_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13I_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13I_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S08-F02-THERMAL-SPEED-INTERPRETATION'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(5)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13I_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S08-I0[5-6]$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13I_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S08-I0[5-6]$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 6 then
    raise exception '15B13I_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S08-I0[5-6]$') <> 2 then
    raise exception '15B13I_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S08-I0[5-6]$' and u.code='PHY7-U02' and c.is_primary) <> 2 then
    raise exception '15B13I_curriculum_scope_failed';
  end if;
end $$;
