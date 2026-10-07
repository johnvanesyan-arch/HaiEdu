-- Whole-bank comparison guard: current/history, official mappings, assessment memberships and purpose/protection headers.
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.items, public.item_options, public.item_answer_keys, public.item_misconception_mappings, public.item_versions, public.item_templates, public.misconceptions, public.skills, public.skill_outcomes, public.item_template_remediation_guides, public.skill_outcome_curriculum_mappings, public.learning_outcomes, public.assessment_pool_items, public.assessment_form_items, public.assessment_pools, public.assessment_forms in share mode;
do $corpus$
begin
  if (md5(jsonb_build_object('items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.items r),'item_options',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_options r),'item_answer_keys',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_answer_keys r),'item_misconception_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_misconception_mappings r),'item_versions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_versions r),'item_templates',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_templates r),'misconceptions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.misconceptions r),'skills',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skills r),'skill_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcomes r),'item_template_remediation_guides',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_template_remediation_guides r),'skill_outcome_curriculum_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcome_curriculum_mappings r),'learning_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.learning_outcomes r),'assessment_pool_items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_pool_items r),'assessment_form_items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_form_items r),'assessment_pools',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_pools r),'assessment_forms',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.assessment_forms r))::text)) is distinct from '6876b02512208d053e017603303fbdac' then
    raise exception '15B13J_whole_bank_comparison_stale';
  end if;
end $corpus$;

-- Sprint 15B.13J: subject-aware, learner-inactive S09 authoring only.
-- Source: Physics 7 (2023), section 12, printed pp.36-37; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  perform 1 from public.curriculum_releases where release_key='physics7_u01_u02_2026_08_14_candidate_r2' for update;
  if not exists (select 1 from public.skills where code='PHY7-U02-S09' and status='review') then
    raise exception '15B13J_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13J_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S09-I01','PHY7-U02-S09-I02','PHY7-U02-S09-I03','PHY7-U02-S09-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13J_existing_S09_review_incomplete';
  end if;
  if not exists(select 1 from public.item_template_remediation_guides g join public.item_templates t on t.id=g.item_template_id where t.code='PHY7-U02-S09-T01-EXPLAIN-LIQUID-THERMOMETER' and g.status='published' and g.guide_version=2) then
    raise exception '15B13J_existing_guide_changed';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT')
     or exists (select 1 from public.items where code in ('PHY7-U02-S09-I05','PHY7-U02-S09-I06'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT') then
    raise exception '15B13J_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT',
  'Ջերմաչափի աշխատանքային սահմանները և սանդղակի դերը',
  'Բացատրել հեղուկի վիճակի և աշխատանքային տիրույթի դերը և տարբերակել հեղուկի ընդարձակումը ջերմաստիճանի թվային արժեքը կարդալուց։',
  jsonb_build_object(
    'sprint', '15B.13J',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'thermometer_limits_and_readout',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S09-I05'),
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S09-I06')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array('celsius_fahrenheit_conversion','kelvin_scale','expansion_coefficients','electronic_thermometers','heat_conduction_explanation','practical_mercury_handling'),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37'
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
    on family.code = 'PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT'
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
       'Ընտանիքը լրացուցիչ 2(2) վերջնարդյունքի շրջանակում բացատրում է հեղուկային ջերմաչափի աշխատանքային տիրույթի և սանդղակի դերը։ Ջերմաստիճանի սանդղակների փոխարկում և ընդարձակման գործակիցների հաշվարկ չի պահանջվում։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13J',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'requiredEvidencePurposes', jsonb_build_array(
      'application',
      'misconception_diagnosis'
    ),
    'enforceUniqueEvidencePurposes', true,
    'familySizePolicy', 'outcome_appropriate',
    'familySizeRationaleHy', 'Առաջին հարցը ավելացնում է աշխատանքային տիրույթի և հեղուկ վիճակի կապի ստուգում։ Երկրորդը գիտակցված վարժանքային տարբերակ է՝ ընդարձակումը թվային ցուցմունքից տարբերակելու համար։ Մնացած վեց պլանային տեղերը չեն լրացվում կրկնվող հարցերով։',
    'skillCode', 'PHY7-U02-S09',
    'variantCount', 2,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S09-I05', 'single_choice', 'Դիտարկենք երկու անվնաս, փակ հեղուկային ջերմաչափ։ Այս խնդրում սնդիկայինի աշխատանքային տիրույթը −38 °C-ից 260 °C է, իսկ սպիրտայինինը՝ −112 °C-ից 78 °C՝ ըստ դասագրքում տրված տվյալների։ Ստորին սահմանից ցածր ջերմաչափի հեղուկը պնդանում է։ Ո՞ր ջերմաչափն է պիտանի −50 °C ջերմաստիճանը չափելու համար և ինչո՞ւ։', 2, 'thermometer_limits_and_readout:05', 'working_range_and_liquid_state', 'application', 'Տրված աշխատանքային տիրույթները կապում է ջերմաչափի հեղուկի վիճակի և հեղուկի ջերմային ընդարձակման վրա հիմնված աշխատանքի հնարավորության հետ։ Թվերը տրված են խնդրում. անգիր հիշել չի պահանջվում։'),
    ('PHY7-U02-S09-I06', 'single_choice', 'Անվնաս, փակ սպիրտային ջերմաչափի սանդղակի բոլոր գծիկներն ու թվերը ջնջվել են, բայց ապակե անոթն ու խողովակը չեն վնասվել։ Ջերմաչափը տաքացնում են իր աշխատանքային տիրույթի սահմաններում։ Սանդղակի մասին այլ տվյալ չկա։ Ո՞ր պնդումն է ճիշտ։', 2, 'thermometer_limits_and_readout:06', 'physical_response_without_calibrated_readout', 'misconception_diagnosis', 'Գիտակցված վարժանքային տարբերակ է. հեղուկի ընդարձակումը տարբերակում է ջերմաստիճանի թվային արժեքը սանդղակից կարդալուց։ Ամրապնդում է գործող S09 նյութում և I գլխի սանդղակի առաջադրանքներում արդեն ուսուցանվող տարբերությունը՝ առանց նոր անկախ վերջնարդյունք հաշվարկելու։')
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
    'bank', 'PHY7-U02-15B13J-DRAFT',
    'intendedBank', 'practice_review',
    'wholeSkillReviewPolicy', 'haiedu-whole-skill-review-v1',
    'wholeSkillReviewEvidence', 'docs/chapter-ii-s09-whole-bank-review.md',
    'wholeSkillReviewDisposition', case when row.code='PHY7-U02-S09-I05' then 'new_reasoning_coverage' else 'intentional_practice_variant' end,
    'illustrationDisposition', 'verbal_task_no_illustration_needed',
    'sprint', '15B.13J',
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
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'thermometer_limits_and_readout',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, լրացուցիչ վերջնարդյունք 2(2); Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37',
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
join public.item_templates template on template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S09-I05', 'A', 'Երկուսն էլ. սնդիկային ջերմաչափը շարունակում է նույն կերպ աշխատել նաև սնդիկի պնդանալուց հետո։', 1),
    ('PHY7-U02-S09-I05', 'B', 'Միայն սպիրտայինը. −50 °C-ը նրա աշխատանքային տիրույթում է, իսկ սնդիկայինի տիրույթից ցածր է, որտեղ սնդիկն արդեն պնդացած է։', 2),
    ('PHY7-U02-S09-I05', 'C', 'Ոչ մեկը. բոլոր ջերմաչափերի հեղուկները պնդանում են 0 °C-ում՝ անկախ հեղուկի տեսակից։', 3),
    ('PHY7-U02-S09-I05', 'D', 'Ոչ մեկը. սնդիկը պնդացած է, իսկ սպիրտը սառչելիս դուրս է հոսում անվնաս, փակ ջերմաչափից։', 4),
    ('PHY7-U02-S09-I06', 'A', 'Սպիրտը կընդարձակվի, և սյունը կբարձրանա, բայց առանց հայտնի սանդղակի սյան բարձրությունից հնարավոր չէ որոշել ջերմաստիճանի թվային արժեքը °C-ով։', 1),
    ('PHY7-U02-S09-I06', 'B', 'Սպիրտը չի ընդարձակվի, և սյունը չի բարձրանա, քանի որ հեղուկը շարժվում է սանդղակի գծիկների ազդեցությամբ։', 2),
    ('PHY7-U02-S09-I06', 'C', 'Սյունը կբարձրանա. նրա բարձրությունը միլիմետրերով չափելով՝ նույն թիվը կարելի է ընդունել որպես ջերմաստիճան °C-ով։', 3),
    ('PHY7-U02-S09-I06', 'D', 'Սյունը կբարձրանա. խողովակի տեսանելի ստորին ծայրին 0 °C, իսկ վերին ծայրին 100 °C նշանակելով՝ կարելի է ճիշտ կարդալ ջերմաստիճանը։', 4)
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
    ('PHY7-U02-S09-I05', 'B'),
    ('PHY7-U02-S09-I06', 'A')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'thermometer_limits_and_readout'
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
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code,title_hy,description_hy) as (values
    ('solidified_thermometer_liquid_still_works', 'Պնդացած հեղուկով ջերմաչափը նույն կերպ աշխատող համարելը', 'Սովորողը չի կապում հեղուկային ջերմաչափի աշխատանքը նրա նյութի հեղուկ վիճակի հետ և կարծում է, թե աշխատանքային ստորին սահմանից ցածր պնդացած նյութով ջերմաչափը շարունակում է նույն սկզբունքով ճիշտ չափել։'),
    ('all_thermometer_liquids_freeze_at_zero', 'Բոլոր ջերմաչափային հեղուկներին 0 °C պնդացման ջերմաստիճան վերագրելը', 'Սովորողը ջրի պնդացման ջերմաստիճանը տարածում է բոլոր հեղուկների վրա՝ անտեսելով հեղուկի տեսակը և խնդրում տրված աշխատանքային տիրույթը։'),
    ('column_height_gives_temperature_without_calibration', 'Սյան բարձրությունը առանց հայտնի սանդղակի ջերմաստիճանի վերածելը', 'Սովորողը միլիմետրերով չափված սյան բարձրությունը անմիջապես համարում է Ցելսիուսի աստիճանների թիվ կամ կամայական ծայրակետերին 0 °C և 100 °C վերագրելով փորձում է ստանալ ճիշտ ջերմաստիճան։ Նա անտեսում է բարձրությունն ու ջերմաստիճանը կապող հայտնի սանդղակի անհրաժեշտությունը։'))
insert into public.misconceptions(skill_id,code,title_hy,description_hy,status)
select s.id,r.code,r.title_hy,r.description_hy,'draft'
from misconception_rows r join public.skills s on s.code='PHY7-U02-S09';

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S09-I05', 'A', 'solidified_thermometer_liquid_still_works', 'Հեղուկային ջերմաչափի աշխատանքի համար նյութը պետք է մնա հեղուկ. պնդանալուց հետո այն չի կարող նույն կերպ աշխատել տրված աշխատանքային տիրույթից դուրս։'),
    ('PHY7-U02-S09-I05', 'C', 'all_thermometer_liquids_freeze_at_zero', '0 °C-ը բոլոր հեղուկների պնդացման ջերմաստիճանը չէ։ Համեմատի՛ր −50 °C-ը հենց խնդրում տրված սպիրտային և սնդիկային ջերմաչափերի տիրույթների հետ։'),
    ('PHY7-U02-S09-I05', 'D', 'cooling_causes_liquid_loss', 'Անվնաս, փակ ջերմաչափից սպիրտը սառչելու պատճառով դուրս չի հոսում։ −50 °C-ը տրված սպիրտային ջերմաչափի աշխատանքային տիրույթում է։'),
    ('PHY7-U02-S09-I06', 'B', 'scale_moves_liquid', 'Սպիրտը ընդարձակվում է տաքանալուց, ոչ սանդղակի գծիկների ազդեցությամբ։ Գծիկների ջնջվելը չի վերացնում հեղուկի ջերմային ընդարձակումը։'),
    ('PHY7-U02-S09-I06', 'C', 'column_height_gives_temperature_without_calibration', 'Միլիմետրը երկարության միավոր է։ Սյան բարձրության թիվը ջերմաստիճանի թիվ դարձնելու համար պետք է հայտնի լինի համապատասխան սանդղակը։'),
    ('PHY7-U02-S09-I06', 'D', 'column_height_gives_temperature_without_calibration', 'Խողովակի կամայական ծայրերը պարտադիր չեն համապատասխանում 0 °C և 100 °C ջերմաստիճաններին։ Ցելսիուսի հենակետերը որոշվում են համապատասխան ֆիզիկական պայմաններով, ոչ տեսանելի ծայրերը ընտրելով։')
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
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
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
  '15B.13J հեռանկարային ապացուցողական սխեմայով S09 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13J S09 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ե՞րբ է հեղուկային ջերմաչափը աշխատում, և ինչի՞ համար է սանդղակը',
  'Նախ ստուգի՛ր՝ ջերմաստիճանը տվյալ ջերմաչափի աշխատանքային տիրույթո՞ւմ է։ Հեղուկը պետք է մնա հեղուկ վիճակում. պնդացած նյութով ջերմաչափը չի կարող նույն կերպ չափել։ Այնուհետև հետևի՛ր կապին՝ ջերմաստիճանի բարձրացում → հեղուկի ընդարձակում → նեղ խողովակում սյան բարձրացում։ Անվնաս, փակ ջերմաչափում հեղուկի քանակը դրանից չի ավելանում կամ պակասում։ Սանդղակը հեղուկը չի շարժում. այն սյան դիրքը կապում է ջերմաստիճանի թվային արժեքի հետ։ Առանց հայտնի սանդղակի բարձրությունը միլիմետրերով չափելը դեռ չի տալիս ջերմաստիճանը °C-ով։ Ցելսիուսի 0 և 100 հենակետերը կապված են սառույցի հալման և ջրի եռման հետ դասագրքում նշված պայմաններում, ոչ խողովակի կամայական ծայրերի։',
  'Տրված ջերմաստիճանը որքա՞ն է համեմատած յուրաքանչյուր ջերմաչափի ստորին և վերին աշխատանքային սահմանների հետ։ Այդ պայմաններում նրա նյութը մնո՞ւմ է հեղուկ։',
  'Տարբերակի՛ր երկու հարց. ի՞նչն է բարձրացնում հեղուկի սյունը, և ի՞նչն է թույլ տալիս դրա դիրքից կարդալ ջերմաստիճանի թիվը։',
  'Օրինակ՝ խնդրում −38 °C-ից 260 °C և −112 °C-ից 78 °C աշխատանքային տիրույթներով տրված երկու ջերմաչափերն էլ պիտանի են 20 °C-ի համար, քանի որ 20-ը երկու տիրույթում էլ է։ Եթե սպիրտայինի սանդղակի նշումները ջնջվեն, և այն տաքանա իր տիրույթի սահմաններում, հեղուկը դարձյալ կընդարձակվի, բայց սյան դիրքը °C-ով թվի վերածելու համար հայտնի սանդղակ է անհրաժեշտ։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13J',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §12, տպագիր էջեր 36-37'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
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
  '15B.13J S09 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
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
  on family.code = 'PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT'
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
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'evidenceBlueprintPolicy' = 'distinct-purpose-v1'
    and template.generation_config->'requiredEvidencePurposes' =
      '["application","misconception_diagnosis"]'::jsonb
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B13J_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 2 then
    raise exception '15B13J_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and item.config->>'evidencePurpose' in (
      'application',
      'misconception_diagnosis'
    );
  if v_count <> 2 then
    raise exception '15B13J_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 2 then
    raise exception '15B13J_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13J_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT';
  if v_count <> 8 then
    raise exception '15B13J_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT';
  if v_count <> 6 then
    raise exception '15B13J_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
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
    raise exception '15B13J_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT';
  if v_count <> 2 then
    raise exception '15B13J_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and version.version_no = 1;
  if v_count <> 2 then
    raise exception '15B13J_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13J_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13J_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S09-T02-THERMOMETER-LIMITS-AND-READOUT';
  if v_count <> 0 then
    raise exception '15B13J_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13J_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13J_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S09-F02-THERMOMETER-LIMITS-AND-READOUT'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13J_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S09-I0[5-6]$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13J_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S09-I0[5-6]$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 6 then
    raise exception '15B13J_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S09-I0[5-6]$') <> 2 then
    raise exception '15B13J_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S09-I0[5-6]$' and u.code='PHY7-U02' and c.is_primary) <> 2 then
    raise exception '15B13J_curriculum_scope_failed';
  end if;
end $$;
