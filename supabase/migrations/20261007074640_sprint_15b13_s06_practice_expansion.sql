-- Full-catalogue guard includes history, templates, misconception definitions and guides.
-- SHARE locks make the comparison and additive authoring one atomic operation.
lock table public.items, public.item_options, public.item_answer_keys, public.item_misconception_mappings, public.item_versions, public.item_templates, public.misconceptions, public.skills, public.skill_outcomes, public.item_template_remediation_guides in share mode;
do $corpus$
begin
  if (md5(jsonb_build_object('items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.items r),'item_options',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_options r),'item_answer_keys',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_answer_keys r),'item_misconception_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_misconception_mappings r),'item_versions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_versions r),'item_templates',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_templates r),'misconceptions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.misconceptions r),'skills',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skills r),'skill_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcomes r),'item_template_remediation_guides',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_template_remediation_guides r))::text)) is distinct from 'df450b33af4edd97a30eed0e721b602b' then
    raise exception '15B13G_whole_bank_comparison_stale';
  end if;
end $corpus$;

-- Sprint 15B.13G: subject-aware, learner-inactive S06 authoring only.
-- Source: Physics 7 (2023), section 10, printed pp.30-33, figure 30; figure 31 source context; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  perform 1 from public.curriculum_releases where release_key='physics7_u01_u02_2026_08_14_candidate_r2' for update;
  if not exists (select 1 from public.skills where code='PHY7-U02-S06' and status='review') then
    raise exception '15B13G_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13G_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S06-I01','PHY7-U02-S06-I02','PHY7-U02-S06-I03','PHY7-U02-S06-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13G_existing_S06_review_incomplete';
  end if;
  if not exists(select 1 from public.item_template_remediation_guides g join public.item_templates t on t.id=g.item_template_id where t.code='PHY7-U02-S06-T01-EXPLAIN-DIFFUSION' and g.status='published' and g.guide_version=3) then
    raise exception '15B13G_existing_guide_changed';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S06-T02-DIFFUSION-EVIDENCE')
     or exists (select 1 from public.items where code in ('PHY7-U02-S06-I05','PHY7-U02-S06-I06'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S06-F02-DIFFUSION-EVIDENCE') then
    raise exception '15B13G_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S06-F02-DIFFUSION-EVIDENCE',
  'Դիֆուզիայի փորձարարական ապացույցը և մասնիկների անցման պայմանը',
  'Ընտրել ինքնաբերական խառնումը ցուցադրող փորձի եղանակը և հստակ տրված միջնորմի պայմանով գնահատել մասնիկների անցման հնարավորությունը։',
  jsonb_build_object(
    'sprint', '15B.13G',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'diffusion_evidence_and_transfer_conditions',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'application', 'itemCode', 'PHY7-U02-S06-I05'),
      jsonb_build_object('purpose', 'transfer_reasoning', 'itemCode', 'PHY7-U02-S06-I06')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array('diffusion_rate_ranking','temperature_speed_relation','osmosis','membrane_transport_physiology','diffusion_coefficients','chemical_dissociation'),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկարներ 30-31'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S06'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S06-F02-DIFFUSION-EVIDENCE'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)'
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
       'Ընտանիքը ուղղակիորեն գնահատում է պարտադիր 1(4) վերջնարդյունքը՝ օրինակներում դիֆուզիայի ինքնաբերական բնույթը և մասնիկների անցման անհրաժեշտ պայմանը բացատրելով։ Դիֆուզիայի արագությունը և ջերմաստիճանային կապը չեն գնահատվում։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13G',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'requiredEvidencePurposes', jsonb_build_array(
      'application',
      'transfer_reasoning'
    ),
    'enforceUniqueEvidencePurposes', true,
    'familySizePolicy', 'outcome_appropriate',
    'familySizeRationaleHy', 'Երկու հարցերից առաջինը գիտակցված վարժանքային տարբերակ է, երկրորդը պահանջում է դիֆուզիայի պայմանը կիրառել հստակ տրված միջնորմի դեպքում։ Մնացած վեց տեղերը չեն լրացվում կրկնվող օրինակներով։',
    'skillCode', 'PHY7-U02-S06',
    'variantCount', 2,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S06-F02-DIFFUSION-EVIDENCE'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S06-I05', 'single_choice', 'Սկզբում պղնձարջասպի լուծույթի և ջրի միջև հստակ սահման կա՝ ինչպես նկար 30-ի «բ» փուլում։ Առաջին սովորողն առաջարկում է անոթն անմիջապես թափահարել։ Երկրորդն առաջարկում է չթափահարել և ժամանակի ընթացքում հետևել սահմանի փոփոխությանը։ Ո՞ր եղանակով կարելի է ցույց տալ նյութերի ինքնաբերական խառնումը և ինչո՞ւ։', 2, 'diffusion_evidence_and_transfer_conditions:05', 'spontaneous_vs_forced_mixing_evidence', 'application', 'Գիտակցված վարժանքային տարբերակ է. նույն դասագրքային փորձի համար ընտրում է ինքնաբերական խառնումը ցուցադրող եղանակը՝ բացատրելով արտաքին խառնելու ազդեցությունը։ Նոր անկախ վերջնարդյունք չի հաշվարկվում։'),
    ('PHY7-U02-S06-I06', 'single_choice', 'Փակ անոթի երկու բաժիններում ջուր և պղնձարջասպի լուծույթ են։ Դրանք ամբողջությամբ բաժանված են միջնորմով, որն այս պայմաններում չի թողնում երկու նյութերից որևէ մեկի մասնիկների անցումը։ Բաժինների միջև այլ ճանապարհ չկա։ Առանց միջնորմը հանելու՝ կարո՞ղ է դիֆուզիայով ամբողջ անոթում համաչափ խառնուրդ առաջանալ։', 3, 'diffusion_evidence_and_transfer_conditions:06', 'impermeable_partition_transfer_condition', 'transfer_reasoning', 'Հստակ տրված անթափանց միջնորմի պայմանը կապում է դիֆուզիայի համար անհրաժեշտ մասնիկների անցման հետ՝ ներսում շարժումը տարբերակելով բաժինների միջև խառնումից։')
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
    when 'PHY7-U02-S06-I05' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-30.png", "altHy": "Նկար 30. սկզբում ջուրն ու կապույտ լուծույթը բաժանված են հստակ սահմանով՝ բ փուլում, ապա սահմանը աստիճանաբար լղոզվում է, և վերջում հեղուկը համաչափ բաց կապույտ է՝ ե փուլում։", "source": {"edition": "Physics 7 (2023)", "printedPage": 31, "figure": 30, "sha256": "03736b74f3c81a7a696a13f6cdcde7e77ff9d3644acd559e486cdb37fd3d7f53"}}'::jsonb
    else '{}'::jsonb end,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B13G-DRAFT',
    'intendedBank', 'practice_review',
    'wholeSkillReviewPolicy', 'haiedu-whole-skill-review-v1',
    'wholeSkillReviewEvidence', 'docs/chapter-ii-s06-whole-bank-review.md',
    'wholeSkillReviewDisposition', case when row.code='PHY7-U02-S06-I05' then 'intentional_practice_variant' else 'new_reasoning_coverage' end,
    'illustrationDisposition', case when row.code='PHY7-U02-S06-I06' then 'verbal_task_no_illustration_needed' else 'source_textbook_figure' end,
    'sprint', '15B.13G',
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
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկարներ 30-31'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'diffusion_evidence_and_transfer_conditions',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(4); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկարներ 30-31',
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
join public.skills skill on skill.code = 'PHY7-U02-S06'
join public.item_templates template on template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S06-I05', 'A', 'Երկրորդ եղանակով. սահմանի աստիճանական լղոզումը կարելի է դիտել առանց նյութերն արտաքինից խառնելու։', 1),
    ('PHY7-U02-S06-I05', 'B', 'Առաջին եղանակով. միայն թափահարելուց ստացված համաչափ գույնն արդեն բավարար ապացույց է, որ խառնումն ինքնաբերական էր։', 2),
    ('PHY7-U02-S06-I05', 'C', 'Առաջին եղանակով. առանց թափահարելու մասնիկները չեն շարժվի և չեն կարող խառնվել։', 3),
    ('PHY7-U02-S06-I05', 'D', 'Երկրորդ եղանակով. դիֆուզիայի ժամանակ կապույտ լուծույթի ամբողջ շերտը պարզապես բարձրանում է վերև՝ առանց մասնիկների փոխադարձ ներթափանցման։', 4),
    ('PHY7-U02-S06-I06', 'A', 'Այո. կապույտ գույնը կարող է անցնել միջնորմի միջով, նույնիսկ եթե նյութի մասնիկները չեն անցնում։', 1),
    ('PHY7-U02-S06-I06', 'B', 'Ոչ. միջնորմը թույլ չի տալիս մասնիկների անցումը բաժինների միջև, թեև մասնիկները յուրաքանչյուր բաժնում շարունակում են շարժվել։', 2),
    ('PHY7-U02-S06-I06', 'C', 'Այո. բավական երկար սպասելու դեպքում դիֆուզիան միշտ անցնում է ցանկացած միջնորմով՝ անկախ տրված պայմաններից։', 3),
    ('PHY7-U02-S06-I06', 'D', 'Ոչ. միջնորմի առկայությունը կանգնեցնում է բոլոր մասնիկների շարժումը երկու բաժինների ներսում։', 4)
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
    ('PHY7-U02-S06-I05', 'A'),
    ('PHY7-U02-S06-I06', 'B')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'diffusion_evidence_and_transfer_conditions'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S06'
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code,title_hy,description_hy) as (values
    ('forced_mixing_proves_spontaneous_diffusion', 'Արտաքին խառնումը ինքնաբերական խառնման բավարար ապացույց համարելը', 'Սովորողը միայն թափահարելուց կամ խառնելուց ստացված համաչափ տեսքը բավարար ապացույց է համարում, որ դիտված խառնումը ինքնաբերական էր՝ առանց արտաքին խառնելու ազդեցությունը տարբերակելու։'),
    ('diffusion_ignores_impermeable_boundary', 'Դիֆուզիան ցանկացած միջնորմով պարտադիր անցնող համարելը', 'Սովորողը դիֆուզիան հնարավոր է համարում նույնիսկ այն միջնորմով, որի համար խնդրի պայմանը բացահայտորեն արգելում է մասնիկների անցումը, և կարծում է, թե երկար սպասելը վերացնում է այդ սահմանափակումը։'),
    ('partition_stops_internal_particle_motion', 'Միջնորմը մասնիկների ներքին շարժումը դադարեցնող համարելը', 'Սովորողը բաժինների միջև մասնիկների անցման արգելքը նույնացնում է յուրաքանչյուր բաժնի ներսում մասնիկների ամբողջ շարժման դադարի հետ։'))
insert into public.misconceptions(skill_id,code,title_hy,description_hy,status)
select s.id,r.code,r.title_hy,r.description_hy,'draft'
from misconception_rows r join public.skills s on s.code='PHY7-U02-S06';

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S06-I05', 'B', 'forced_mixing_proves_spontaneous_diffusion', 'Արտաքին խառնելուց ստացված համաչափ տեսքը միայնակ չի ապացուցում ինքնաբերական խառնումը։ Սա չի նշանակում, որ խառնվող նյութերում դիֆուզիան անհնար է։'),
    ('PHY7-U02-S06-I05', 'C', 'diffusion_requires_external_mixing', 'Նյութերի մասնիկների շարժումն ու դիֆուզիան արտաքին թափահարելու կարիք չունեն։'),
    ('PHY7-U02-S06-I05', 'D', 'diffusion_is_bulk_layer_motion', 'Դիֆուզիան մասնիկների փոխադարձ ներթափանցումն է, ոչ ամբողջ շերտի պարզ տեղափոխությունը։'),
    ('PHY7-U02-S06-I06', 'A', 'diffusion_without_particle_transfer', 'Այս փորձում գույնի տարածումը նյութի մասնիկների անցումից անկախ մեխանիզմ չի համարվում։ Միջնորմն այդ անցումը բացառում է։'),
    ('PHY7-U02-S06-I06', 'C', 'diffusion_ignores_impermeable_boundary', 'Պայմանում հստակ արգելված մասնիկների անցումը երկար սպասելով թույլատրելի չի դառնում։ Իրական միջնորմների հատկությունների մասին ընդհանրացում չի պահանջվում։'),
    ('PHY7-U02-S06-I06', 'D', 'partition_stops_internal_particle_motion', 'Միջնորմը բաժինների միջև անցումն է արգելում, ոչ յուրաքանչյուր բաժնի ներսում մասնիկների անընդհատ շարժումը։')
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
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
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
  '15B.13G հեռանկարային ապացուցողական սխեմայով S06 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13G S06 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս տարբերակել դիֆուզիայի ապացույցն ու պայմանները',
  'Նախ պարզի՛ր՝ դիտվող խառնումն արտաքին գործողությա՞ն արդյունք է, թե՞ այն դիտվում է նաև առանց արտաքին խառնելու։ Միայն համաչափ գույնը բավարար չէ խառնման պատճառը որոշելու համար։ Այնուհետև ստուգի՛ր՝ նյութերի մասնիկները կարո՞ղ են անցնել մի տիրույթից մյուսը։ Եթե խնդրի պայմանը բացառում է այդ անցումը և այլ ճանապարհ չկա, բաժինների միջև դիֆուզիայով խառնում չի ստացվի, թեև մասնիկների շարժումը յուրաքանչյուր բաժնում շարունակվում է։ Թափահարելու ժամանակ դիֆուզիան պարտադիր չի վերանում. պարզապես միայն այդ փորձով ինքնաբերական խառնումը չենք առանձնացնում։',
  'Տարբերակի՛ր դիտված արդյունքը և այն առաջացրած գործողությունը։ Տեսանելի համաչափությունը դեռ չի բացատրում՝ ինչպե՞ս ստացվեց խառնուրդը։',
  'Ստուգի՛ր մասնիկների անցման հնարավորությունը։ Մի՛ շփոթիր բաժինների միջև անցման արգելքը յուրաքանչյուր բաժնի ներսում շարժման բացակայության հետ։',
  'Օրինակ՝ սենյակում բացված օծանելիքի սրվակի բույրը որոշ ժամանակ անց զգացվում է նաև հեռու։ Բացատրությունն այն չէ, որ հեղուկն ամբողջությամբ տեղափոխվել է սենյակի մյուս կողմ. օծանելիքի մասնիկները դուրս են գալիս սրվակից և իրենց անկանոն շարժման շնորհիվ տարածվում օդում։ Փնտրում ենք մասնիկների անցումն ու շարժումը, ոչ միայն բույրի կամ գույնի փոփոխությունը։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13G',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկարներ 30-31'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
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
  '15B.13G S06 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
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
  on family.code = 'PHY7-U02-S06-F02-DIFFUSION-EVIDENCE'
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
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'evidenceBlueprintPolicy' = 'distinct-purpose-v1'
    and template.generation_config->'requiredEvidencePurposes' =
      '["application","transfer_reasoning"]'::jsonb
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B13G_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 2 then
    raise exception '15B13G_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and item.config->>'evidencePurpose' in (
      'application',
      'transfer_reasoning'
    );
  if v_count <> 2 then
    raise exception '15B13G_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 2 then
    raise exception '15B13G_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13G_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE';
  if v_count <> 8 then
    raise exception '15B13G_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE';
  if v_count <> 6 then
    raise exception '15B13G_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
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
    raise exception '15B13G_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE';
  if v_count <> 2 then
    raise exception '15B13G_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and version.version_no = 1;
  if v_count <> 2 then
    raise exception '15B13G_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13G_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13G_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S06-T02-DIFFUSION-EVIDENCE';
  if v_count <> 0 then
    raise exception '15B13G_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13G_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13G_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S06-F02-DIFFUSION-EVIDENCE'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(4)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13G_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S06-I0[5-6]$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13G_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S06-I0[5-6]$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 6 then
    raise exception '15B13G_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S06-I0[5-6]$') <> 2 then
    raise exception '15B13G_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S06-I0[5-6]$' and u.code='PHY7-U02' and c.is_primary) <> 2 then
    raise exception '15B13G_curriculum_scope_failed';
  end if;
end $$;
