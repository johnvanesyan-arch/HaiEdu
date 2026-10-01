-- Sprint 15B.6 - create the fourth governed, learner-inactive Chapter II
-- item family for PHY7-U02-S05 (continuous, chaotic particle motion).
--
-- This additive authoring migration creates no assessment pool, blueprint,
-- pilot state or learner release. Every item, misconception and remediation
-- guide remains draft until the protected review lifecycle is completed.

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S05-F01-CONTINUOUS-CHAOTIC-MOTION',
  'Մասնիկների անընդհատ և անկանոն շարժում',
  'Նկարագրել նյութի ատոմների և մոլեկուլների անընդհատ, անկանոն շարժումը, բախումներից առաջացող ուղղության փոփոխությունները և մասնիկի ակնթարթային արագության ու նրա ընդհանուր տեղաշարժի տարբերությունը։',
  jsonb_build_object(
    'sprint', '15B.6',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'continuous_chaotic_particle_motion',
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, Խնդիր 3՝ էջ 40'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S05'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S05-F01-CONTINUOUS-CHAOTIC-MOTION'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է նյութում ատոմների և մոլեկուլների անընդհատ ու անկանոն շարժման առանձնահատկությունների նկարագրումը։'
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
  'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.6',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'skillCode', 'PHY7-U02-S05',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S05-F01-CONTINUOUS-CHAOTIC-MOTION'
on conflict (code) do nothing;

with item_rows(
  code, prompt_hy, difficulty, variant_key, focus_key
) as (
  values
    (
      'PHY7-U02-S05-I01',
      'Նյութի ատոմների և մոլեկուլների շարժումը ո՞ր պնդումն է ճիշտ նկարագրում։',
      1, 'continuous_chaotic_particle_motion:01', 'continuous_random_motion'
    ),
    (
      'PHY7-U02-S05-I02',
      'Օծանելիքի մոլեկուլը սրվակից դուրս գալուց հետո ինչո՞ւ է անընդհատ փոխում իր շարժման ուղղությունը։',
      2, 'continuous_chaotic_particle_motion:02', 'collision_direction_change'
    ),
    (
      'PHY7-U02-S05-I03',
      'Գազի մոլեկուլը A կետից B կետ շարժվելիս բազմիցս բախվում է այլ մոլեկուլների։ Ո՞ր նկարագրությունն է համապատասխանում նրա ճանապարհին։',
      2, 'continuous_chaotic_particle_motion:03', 'broken_collision_path'
    ),
    (
      'PHY7-U02-S05-I04',
      'Օդում մոլեկուլները կարող են շարժվել վայրկյանում մի քանի հարյուր մետր արագությամբ։ Այդ դեպքում մոտակայքում թափված բենզինի հոտն ինչո՞ւ անմիջապես չենք զգում։',
      3, 'continuous_chaotic_particle_motion:04', 'speed_vs_net_travel'
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
    'bank', 'PHY7-U02-15B6-DRAFT',
    'sprint', '15B.6',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'answerPositionQaContract', 'family-balanced-v1',
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, Խնդիր 3՝ էջ 40'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'continuous_chaotic_particle_motion',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(3); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, Խնդիր 3՝ էջ 40',
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
join public.skills skill on skill.code = 'PHY7-U02-S05'
join public.item_templates template on template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S05-I01', 'A', 'Դրանք անընդհատ շարժվում են ամենատարբեր ուղղություններով, ուստի շարժումն անկանոն է։', 1),
    ('PHY7-U02-S05-I01', 'B', 'Դրանք շարժվում են միայն այն ժամանակ, երբ նյութն ամբողջությամբ տեղաշարժում են։', 2),
    ('PHY7-U02-S05-I01', 'C', 'Դրանք բոլորը շարժվում են նույն ուղղությամբ և ուղիղ գծերով։', 3),
    ('PHY7-U02-S05-I01', 'D', 'Դրանք սովորական պայմաններում անշարժ են և միայն տաքացնելիս են սկսում շարժվել։', 4),
    ('PHY7-U02-S05-I02', 'A', 'Բախումից հետո այն կանգ է առնում և այլևս չի շարժվում։', 1),
    ('PHY7-U02-S05-I02', 'B', 'Այն անկանոն բախվում է օդի մոլեկուլներին, և յուրաքանչյուր բախում կարող է փոխել շարժման ուղղությունը։', 2),
    ('PHY7-U02-S05-I02', 'C', 'Սենյակի օդը այն միշտ մղում է միայն մեկ հաստատուն ուղղությամբ։', 3),
    ('PHY7-U02-S05-I02', 'D', 'Այն ընտրում է սենյակի մյուս կողմ հասնելու ամենակարճ ուղին։', 4),
    ('PHY7-U02-S05-I03', 'A', 'A-ից B տանող մեկ ուղիղ հատված՝ առանց ուղղության փոփոխության։', 1),
    ('PHY7-U02-S05-I03', 'B', 'Մոլեկուլը մնում է A կետում, մինչև ամբողջ գազը շարժվի դեպի B։', 2),
    ('PHY7-U02-S05-I03', 'C', 'Տարբեր ուղղություններով բազմաթիվ կարճ հատվածներից կազմված բեկյալ ճանապարհ։', 3),
    ('PHY7-U02-S05-I03', 'D', 'Միևնույն շրջանագծով կրկնվող փակ ճանապարհ։', 4),
    ('PHY7-U02-S05-I04', 'A', 'Բենզինի մոլեկուլները սկզբում անշարժ են և միայն մի քանի րոպե անց են սկսում շարժվել։', 1),
    ('PHY7-U02-S05-I04', 'B', 'Մոլեկուլի ակնթարթային արագությունն ամբողջությամբ նույնն է A-ից B հասնելու արագությանը, իսկ ուշացումն առաջանում է միայն մարդու հոտառությունից։', 2),
    ('PHY7-U02-S05-I04', 'C', 'Բենզինի բոլոր մոլեկուլները սկզբում շարժվում են միայն ուղղահայաց վեր, ապա շրջվում են դեպի մարդը։', 3),
    ('PHY7-U02-S05-I04', 'D', 'Օդի մոլեկուլների հետ բազմաթիվ բախումների պատճառով դրանց ուղղությունը շարունակ փոխվում է, և ուղիղ կարճ ճանապարհը դառնում է երկար բեկյալ ճանապարհ։', 4)
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
    ('PHY7-U02-S05-I01', 'A'),
    ('PHY7-U02-S05-I02', 'B'),
    ('PHY7-U02-S05-I03', 'C'),
    ('PHY7-U02-S05-I04', 'D')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'continuous_chaotic_particle_motion'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S05'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = true;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'particle_motion_requires_external_activation',
      'Մասնիկների շարժումն արտաքին գործողությամբ սկսված համարելը',
      'Սովորողը կարծում է, թե նյութի մասնիկներն անշարժ են և շարժվում են միայն ամբողջ մարմինը տեղաշարժելուց, տաքացնելուց կամ որոշ ժամանակ սպասելուց հետո։'
    ),
    (
      'molecular_motion_ordered_or_predetermined',
      'Մասնիկների շարժումը կարգավորված կամ նպատակաուղղված համարելը',
      'Սովորողը մասնիկների անկանոն շարժումը փոխարինում է նույն ուղղությամբ, նախապես որոշված, շրջանաձև կամ նպատակակետ ընտրող շարժմամբ։'
    ),
    (
      'collision_stops_molecular_motion',
      'Բախումը մասնիկի շարժման ավարտ համարելը',
      'Սովորողը կարծում է, թե այլ մոլեկուլի հետ բախվելուց հետո մասնիկը վերջնականապես կանգ է առնում՝ ուղղությունը փոխելու և շարժումը շարունակելու փոխարեն։'
    ),
    (
      'instantaneous_speed_equals_net_travel_speed',
      'Ակնթարթային արագությունը ընդհանուր տեղաշարժի արագության հետ նույնացնելը',
      'Սովորողը հաշվի չի առնում բազմաթիվ բախումներով երկար բեկյալ ճանապարհը և մասնիկի մեծ ակնթարթային արագությունը նույնացնում է երկու կետերի միջև արագ առաջխաղացման հետ։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy, 'draft'
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S05'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S05-I01', 'B', 'particle_motion_requires_external_activation', 'Մասնիկների շարժումը սխալմամբ կապվում է միայն ամբողջ նյութի արտաքին տեղաշարժի հետ։'),
    ('PHY7-U02-S05-I01', 'C', 'molecular_motion_ordered_or_predetermined', 'Անկանոն բազմուղղություն շարժումը փոխարինվում է բոլոր մասնիկների միաուղղություն ուղիղ շարժմամբ։'),
    ('PHY7-U02-S05-I01', 'D', 'particle_motion_requires_external_activation', 'Մասնիկները սխալմամբ համարվում են անշարժ մինչև տաքացնելը։'),
    ('PHY7-U02-S05-I02', 'A', 'collision_stops_molecular_motion', 'Բախումը սխալմամբ համարվում է մասնիկի շարժման վերջնական դադար։'),
    ('PHY7-U02-S05-I02', 'C', 'molecular_motion_ordered_or_predetermined', 'Օդի ազդեցությունը սխալմամբ ներկայացվում է որպես հաստատուն միաուղղություն մղում։'),
    ('PHY7-U02-S05-I02', 'D', 'molecular_motion_ordered_or_predetermined', 'Մոլեկուլին վերագրվում է նպատակակետի և ամենակարճ ճանապարհի ընտրություն։'),
    ('PHY7-U02-S05-I03', 'A', 'molecular_motion_ordered_or_predetermined', 'Բախումներով պայմանավորված ուղղության փոփոխությունները անտեսվում են, և ընտրվում է ուղիղ ճանապարհ։'),
    ('PHY7-U02-S05-I03', 'B', 'particle_motion_requires_external_activation', 'Առանձին մոլեկուլի շարժումը սխալմամբ պայմանավորվում է ամբողջ գազի միասնական տեղաշարժով։'),
    ('PHY7-U02-S05-I03', 'D', 'molecular_motion_ordered_or_predetermined', 'Քաոսային ուղին սխալմամբ փոխարինվում է պարբերաբար կրկնվող փակ ուղով։'),
    ('PHY7-U02-S05-I04', 'A', 'particle_motion_requires_external_activation', 'Բենզինի մոլեկուլները սխալմամբ համարվում են սկզբում անշարժ։'),
    ('PHY7-U02-S05-I04', 'B', 'instantaneous_speed_equals_net_travel_speed', 'Ակնթարթային արագությունը նույնացվում է A-ից B ընդհանուր առաջխաղացման արագության հետ։'),
    ('PHY7-U02-S05-I04', 'C', 'molecular_motion_ordered_or_predetermined', 'Բոլոր մոլեկուլներին վերագրվում է նույն նախապես որոշված ուղղությունների հաջորդականությունը։')
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
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
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
  '15B.6 չորրորդ կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.6 չորրորդ սևագրի ստեղծում', true);
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
  'Ինչպե՞ս նկարագրել մասնիկների անկանոն շարժումը',
  'Նախ հիշիր, որ նյութի ատոմներն ու մոլեկուլներն անընդհատ շարժվում են։ Բախումները տեղի են ունենում անկանոն և կարող են փոխել յուրաքանչյուր մասնիկի շարժման ուղղությունը։ Ուստի երկար ժամանակամիջոցում մասնիկի ճանապարհը սովորաբար բեկյալ է, ոչ թե մեկ ուղիղ գիծ։ Մի նույնացրու մասնիկի մեծ ակնթարթային արագությունը երկու հեռավոր կետերի միջև նրա ընդհանուր առաջխաղացման արագության հետ։',
  'Ստուգիր երկու հատկանիշ՝ շարժումը չի դադարում, իսկ ուղղությունները բազմազան ու անկանոն են։',
  'Եթե մասնիկը բազմիցս բախվում է այլ մասնիկների, հետևիր ոչ թե միայն նրա արագությանը, այլ նաև յուրաքանչյուր բախումից հետո ուղղության փոփոխությանը։',
  'Օրինակ՝ բենզինի գոլորշու մոլեկուլը կարող է մեծ արագություն ունենալ, բայց օդի մոլեկուլների հետ բազմակի բախումներից նրա A-ից B ուղին դառնում է երկար բեկյալ ճանապարհ, ուստի հոտը անմիջապես չի հասնում մեզ։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.6',
    'learnerVisible', false,
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(3)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, Խնդիր 3՝ էջ 40',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
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
  '15B.6 չորրորդ սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
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
  on family.code = 'PHY7-U02-S05-F01-CONTINUOUS-CHAOTIC-MOTION'
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
    'chapterIiItemFamilies', 4,
    'fourthFamilyDraftItems', 4,
    'fourthFamilyDraftGuides', 1,
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Գլուխ II-ի չորրորդ ընտանիքը, չորս հարցերը և օգնության ուղեցույցը սևագիր են ու սովորողին անհասանելի։ Գնահատման ավազան կամ ձևանմուշ չի ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'questionFamiliesWithApprovedItems', 3,
    'draftFamiliesAwaitingReview', 1,
    'approvedItems', 12,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 3,
    'draftMisconceptionsAwaitingReview', 13
  ),
  notes = 'Առաջին երեք ընտանիքների տասներկու հարցերը հաստատված են։ 15B.4-ի և 15B.5-ի օգնության ուղեցույցներն ու ինը թյուրիմացությունները դեռ սևագիր են, իսկ 15B.6-ի չորրորդ ընտանիքի չորս հարցերը, չորս թյուրիմացությունները և օգնության ուղեցույցը սպասում են ստուգման։',
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
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and template.generation_config->>'answerPositionQaContract' = 'family-balanced-v1'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B6_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'answerPositionQaContract' = 'family-balanced-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 4 then
    raise exception '15B6_draft_item_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION';
  if v_count <> 16 then
    raise exception '15B6_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION';
  if v_count <> 12 then
    raise exception '15B6_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from (
    select answer_key.answer #>> '{}' as correct_key, count(*) as key_count
    from public.item_answer_keys answer_key
    join public.items item on item.id = answer_key.item_id
    join public.item_templates template on template.id = item.item_template_id
    where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    group by answer_key.answer #>> '{}'
  ) distribution
  where distribution.correct_key in ('A', 'B', 'C', 'D')
    and distribution.key_count = 1;
  if v_count <> 4 then
    raise exception '15B6_answer_position_balance_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
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
    raise exception '15B6_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION';
  if v_count <> 4 then
    raise exception '15B6_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    and version.version_no = 1;
  if v_count <> 4 then
    raise exception '15B6_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B6_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B6_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION';
  if v_count <> 0 then
    raise exception '15B6_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B6_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B6_blueprint_boundary_failed:%', v_count;
  end if;
end $$;

notify pgrst, 'reload schema';
