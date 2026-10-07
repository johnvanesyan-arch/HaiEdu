-- Full-catalogue guard includes history, templates, misconception definitions and guides.
-- SHARE locks make the comparison and additive authoring one atomic operation.
lock table public.items, public.item_options, public.item_answer_keys, public.item_misconception_mappings, public.item_versions, public.item_templates, public.misconceptions, public.skills, public.skill_outcomes, public.item_template_remediation_guides in share mode;
do $corpus$
begin
  if (md5(jsonb_build_object('items',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.items r),'item_options',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_options r),'item_answer_keys',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_answer_keys r),'item_misconception_mappings',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_misconception_mappings r),'item_versions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_versions r),'item_templates',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_templates r),'misconceptions',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.misconceptions r),'skills',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skills r),'skill_outcomes',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.skill_outcomes r),'item_template_remediation_guides',(select coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'') from public.item_template_remediation_guides r))::text)) is distinct from '46d0f52d162e3dc95214f27530c4a137' then
    raise exception '15B13H_whole_bank_comparison_stale';
  end if;
end $corpus$;

-- Sprint 15B.13H: subject-aware, learner-inactive S07 authoring only.
-- Source: Physics 7 (2023), section 10, printed pp.30-33, figure 32 on p.32; SHA-256
-- d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904.
-- Reuses the subject-neutral evidence-blueprint contract; no schema/runtime change.
do $$
begin
  perform 1 from public.curriculum_releases where release_key='physics7_u01_u02_2026_08_14_candidate_r2' for update;
  if not exists (select 1 from public.skills where code='PHY7-U02-S07' and status='review') then
    raise exception '15B13H_authoring_skill_missing';
  end if;
  if not exists (select 1 from public.curriculum_releases
      where release_key='physics7_u01_u02_2026_08_14_candidate_r2' and status='draft') then
    raise exception '15B13H_candidate_not_draft';
  end if;
  if (select count(*) from public.items i where i.code in ('PHY7-U02-S07-I01','PHY7-U02-S07-I02','PHY7-U02-S07-I03','PHY7-U02-S07-I04')
      and i.status='published' and i.review_status='approved'
      and coalesce((select q.passed and q.errors='[]'::jsonb from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no order by q.created_at desc limit 1), false)) <> 4 then
    raise exception '15B13H_existing_S07_review_incomplete';
  end if;
  if not exists(select 1 from public.item_template_remediation_guides g join public.item_templates t on t.id=g.item_template_id where t.code='PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES' and g.status='published' and g.guide_version=2) then
    raise exception '15B13H_existing_guide_changed';
  end if;
  if exists (select 1 from public.item_templates where code='PHY7-U02-S07-T02-SLOW-DIFFUSION')
     or exists (select 1 from public.items where code in ('PHY7-U02-S07-I05'))
     or exists (select 1 from public.item_families where code='PHY7-U02-S07-F02-SLOW-DIFFUSION') then
    raise exception '15B13H_existing_expansion_requires_review_not_overwrite';
  end if;
end $$;

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S07-F02-SLOW-DIFFUSION',
  'Շատ դանդաղ դիֆուզիայի դիտարկման մեկնաբանումը',
  'Դասագրքի պինդ մարմինների դիֆուզիայի օրինակը կիրառել կարճ դիտարկման արդյունքը գնահատելիս։',
  jsonb_build_object(
    'sprint', '15B.13H',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'slow_diffusion_observation',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'enforceUniqueEvidencePurposes', true,
    'evidenceBlueprint', jsonb_build_array(
      jsonb_build_object('purpose', 'misconception_diagnosis', 'itemCode', 'PHY7-U02-S07-I05')
    ),
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'scopeExclusions', jsonb_build_array('temperature_speed_relation','diffusion_coefficients','diffusion_depth_time_law','linear_extrapolation','melting_point_recall'),
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկար 32'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S07'
  and skill.status = 'review'::public.content_status
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S07-F02-SLOW-DIFFUSION'
  join public.learning_outcomes outcome
    on outcome.source_locator = '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)'
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
       'Ընտանիքը լրացուցիչ 2(1) վերջնարդյունքի շրջանակում ամրապնդում է պինդ մարմիններում դիֆուզիայի շատ դանդաղ ընթացքի ըմբռնումը՝ դասագրքային օրինակի միջոցով։ Ջերմաստիճանի ազդեցությունը և դիֆուզիայի քանակական օրենքները չեն գնահատվում։'
from context
on conflict (reconciliation_id, item_family_id) do nothing;

insert into public.item_templates (
  item_family_id, code, template_kind, template_version,
  generation_config, status
)
select
  family.id,
  'PHY7-U02-S07-T02-SLOW-DIFFUSION',
  'fixed',
  1,
  jsonb_build_object(
    'sprint', '15B.13H',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'misconceptionMappingPolicy', 'all_distractors',
    'answerPositionQaContract', 'family-balanced-v1',
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'evidenceBlueprintPolicy', 'distinct-purpose-v1',
    'requiredEvidencePurposes', jsonb_build_array(
      'misconception_diagnosis'
    ),
    'enforceUniqueEvidencePurposes', true,
    'familySizePolicy', 'outcome_appropriate',
    'familySizeRationaleHy', 'Մեկ գիտակցված վարժանքային տարբերակ է՝ դիտարկման տևողության իմաստը կիրառելու համար։ Հմտության մնացած յոթ պլանային տեղերը մնում են բաց. նույն համեմատության վերաձևակերպումներով բանկը չի լրացվում։',
    'skillCode', 'PHY7-U02-S07',
    'variantCount', 1,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S07-F02-SLOW-DIFFUSION'
on conflict (code) do nothing;

with item_rows(
  code, item_type, prompt_hy, difficulty, variant_key, focus_key,
  evidence_purpose, evidence_rationale_hy
) as (
  values
    ('PHY7-U02-S07-I05', 'single_choice', 'Նկարում պատկերված փորձի ժամանակ լավ հղկված կապարի և ոսկու թիթեղները 20 °C-ում հինգ տարվա ընթացքում փոխադարձաբար ներթափանցել են մոտ 1 մմ։ Սովորողը նույնատիպ թիթեղներին հետևում է մեկ օր և չի նկատում տեսանելի փոփոխություն։ Նա եզրակացնում է. «Պինդ մարմիններում դիֆուզիա տեղի չի ունենում»։ Ո՞ր գնահատականն է հիմնավորված։', 2, 'slow_diffusion_observation:05', 'short_observation_does_not_exclude_slow_diffusion', 'misconception_diagnosis', 'Գիտակցված վարժանքային տարբերակ է. արդեն ուսումնասիրված պինդ մարմինների դիֆուզիայի շատ դանդաղ ընթացքը կապում է կարճ դիտարկումից արված անհիմն եզրակացության հետ։ Նոր անկախ վերջնարդյունք կամ լուծման ուղի չի հաշվարկվում։')
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
    when 'PHY7-U02-S07-I05' then '{"kind": "image", "url": "https://www.haiedu.am/assets/textbook/physics7-2023/figure-32.png", "altHy": "Նկար 32. ձախում կապարի և ոսկու պինդ թիթեղների հստակ սահմանն է, իսկ աջում՝ երկարատև շփումից հետո առաջացած անցումային շերտը՝ 1 մմ նշումով։", "source": {"edition": "Physics 7 (2023)", "printedPage": 32, "figure": 32, "sha256": "7fce786bf07eebbe1d4e9deece9ba9e9047ec993fdb6e828133291432593efc0"}}'::jsonb
    else '{}'::jsonb end,
  row.difficulty,
  jsonb_build_object(
    'bank', 'PHY7-U02-15B13H-DRAFT',
    'intendedBank', 'practice_review',
    'wholeSkillReviewPolicy', 'haiedu-whole-skill-review-v1',
    'wholeSkillReviewEvidence', 'docs/chapter-ii-s07-whole-bank-review.md',
    'wholeSkillReviewDisposition', 'intentional_practice_variant',
    'illustrationDisposition', 'source_textbook_figure',
    'sprint', '15B.13H',
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
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
    'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկար 32'
  ),
  'draft'::public.content_status,
  row.code,
  case
    when row.difficulty <= 1 then 'foundation'
    when row.difficulty <= 3 then 'core'
    else 'challenge'
  end,
  'slow_diffusion_observation',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, լրացուցիչ վերջնարդյունք 2(1); Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկար 32',
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
join public.skills skill on skill.code = 'PHY7-U02-S07'
join public.item_templates template on template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S07-I05', 'A', 'Եզրակացությունը հիմնավորված չէ. պինդ մարմիններում դիֆուզիան շատ դանդաղ է, և մեկ օրվա ընթացքում տեսանելի փոփոխություն չնկատելը դեռ չի ապացուցում դրա բացակայությունը։', 1),
    ('PHY7-U02-S07-I05', 'B', 'Եզրակացությունը ճիշտ է. պինդ մարմինների մասնիկները չեն կարող փոխադարձաբար ներթափանցել։', 2),
    ('PHY7-U02-S07-I05', 'C', 'Եզրակացությունը սխալ է, քանի որ դիֆուզիան սկսվում է միայն հինգ տարին լրանալուց հետո. դրանից առաջ մասնիկները չեն ներթափանցում։', 3),
    ('PHY7-U02-S07-I05', 'D', 'Եզրակացությունը ճիշտ է. թիթեղների միջև դիֆուզիան հնարավոր կլինի միայն դրանք հալեցնելուց հետո։', 4)
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
    ('PHY7-U02-S07-I05', 'A')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'slow_diffusion_observation'
from answer_rows row
join public.items item on item.code = row.item_code
on conflict (item_id) do nothing;

insert into public.item_curriculum_scopes (
  item_id, subject_program_id, unit_id, is_primary
)
select item.id, program.id, unit.id, true
from public.items item
join public.skills skill on skill.id = item.skill_id
  and skill.code = 'PHY7-U02-S07'
join public.item_templates scoped_template on scoped_template.id=item.item_template_id and scoped_template.code='PHY7-U02-S07-T02-SLOW-DIFFUSION'
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do nothing;

with misconception_rows(code,title_hy,description_hy) as (values
    ('diffusion_waits_for_observation_period', 'Դիֆուզիան միայն դիտարկման ժամկետի վերջում սկսվող համարելը', 'Սովորողը երկարատև փորձի վերջում արձանագրված արդյունքը շփոթում է երևույթի սկսվելու պահի հետ և կարծում է, թե մինչ այդ մասնիկների փոխադարձ ներթափանցում չի լինում։'),
    ('solid_diffusion_requires_melting', 'Պինդ մարմինների դիֆուզիան միայն հալվելուց հետո հնարավոր համարելը', 'Սովորողը կարծում է, թե պինդ մարմինների միջև դիֆուզիայի համար դրանք նախ պետք է հալվեն՝ անտեսելով դասագրքի պինդ թիթեղների երկարատև փոխադարձ ներթափանցման օրինակը։'))
insert into public.misconceptions(skill_id,code,title_hy,description_hy,status)
select s.id,r.code,r.title_hy,r.description_hy,'draft'
from misconception_rows r join public.skills s on s.code='PHY7-U02-S07';

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S07-I05', 'B', 'diffusion_absent_in_solids', 'Դասագրքի պինդ թիթեղների փորձը հաստատում է փոխադարձ ներթափանցումը։ Շատ դանդաղ ընթացքը երևույթի բացակայություն չէ։'),
    ('PHY7-U02-S07-I05', 'C', 'diffusion_waits_for_observation_period', 'Հինգ տարին տվյալ դիտարկման տևողությունն է, ոչ դիֆուզիան սկսելու համար պարտադիր սպասման ժամկետ։ Այդ տվյալից ընթացքի ճշգրիտ ժամանակային օրենք չի հետևում։'),
    ('PHY7-U02-S07-I05', 'D', 'solid_diffusion_requires_melting', 'Դասագրքում նկարագրված փոխադարձ ներթափանցումը վերաբերում է պինդ թիթեղներին. հալվելը դրա պարտադիր պայման չէ։')
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
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
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
  '15B.13H հեռանկարային ապացուցողական սխեմայով S07 ընդլայնման առաջին կառավարվող սևագիր ընտանիքի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
on conflict (item_id, version_no) do nothing;

select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.13H S07 ընդլայնման առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս գնահատել շատ դանդաղ դիֆուզիայի դիտարկումը',
  'Տարբերակի՛ր երևույթի բացակայությունը և այն կարճ ժամանակում տեսանելի չլինելը։ Դասագրքում գազերում դիֆուզիան ավելի արագ է, քան հեղուկներում, իսկ պինդ մարմիններում՝ շատ ավելի դանդաղ։ Ուստի դիտարկման տևողությունը պետք է հաշվի առնել արդյունքը գնահատելիս։ Երկարատև փորձի վերջում արձանագրված փոքր փոփոխությունը չի նշանակում, թե երևույթը սկսվել է միայն այդ պահին։ Այն նաև չի նշանակում, թե պինդ մարմինները նախ պետք է հալվեն։ Մեկ տվյալից մի՛ հաշվիր այլ ժամկետների համար ներթափանցման չափը. դրա փոփոխության օրենքը տրված չէ։',
  'Հարցրո՛ւ՝ սովորողը երևույթի բացակայությո՞ւնն է հաստատել, թե՞ պարզապես կարճ ժամանակում փոփոխություն չի նկատել։',
  'Համեմատի՛ր դիտարկման տևողությունը դասագրքում ներկայացված փորձի տևողության հետ։ Մի՛ շփոթիր արդյունքը գրանցելու պահը երևույթի սկսվելու պահի հետ։',
  'Դասագրքի ջրի և պղնձարջասպի լուծույթի փորձում սկզբնական հստակ սահմանը օրերի ընթացքում աստիճանաբար լղոզվում է, իսկ ամբողջ հեղուկը համաչափ բաց կապույտ է դառնում ավելի ուշ։ Փորձի սկզբում կարճ դիտարկման ընթացքում փոփոխություն չնկատելը դեռ բավարար չէ եզրակացնելու, թե հեղուկներում ինքնաբերական խառնում չի լինում։ Դիտարկման տևողությունը պետք է համապատասխանի ուսումնասիրվող երևույթի ընթացքին։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.13H',
    'learnerVisible', false,
    'authoringProfileVersion', 'haiedu-evidence-blueprint-v1',
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §10, տպագիր էջեր 30-33, նկար 32'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
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
  '15B.13H S07 ընդլայնման առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
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
  on family.code = 'PHY7-U02-S07-F02-SLOW-DIFFUSION'
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
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true'
    and template.template_kind = 'fixed'
    and template.status = 'draft'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'evidenceBlueprintPolicy' = 'distinct-purpose-v1'
    and template.generation_config->'requiredEvidencePurposes' =
      '["misconception_diagnosis"]'::jsonb
    and template.generation_config->>'qaContract' = 'authored_fixed_catalogue'
    and template.generation_config->>'misconceptionMappingPolicy' = 'all_distractors'
    and coalesce((template.generation_config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B13H_template_contract_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and item.status = 'draft'::public.content_status
    and item.review_status = 'needs_review'
    and item.version_no = 1
    and item.config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and coalesce((item.config->>'learnerVisible')::boolean, true) = false;
  if v_count <> 1 then
    raise exception '15B13H_draft_item_contract_failed:%', v_count;
  end if;

  select count(distinct item.config->>'evidencePurpose') into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and item.config->>'evidencePurpose' in (
      'misconception_diagnosis'
    );
  if v_count <> 1 then
    raise exception '15B13H_evidence_purpose_coverage_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and item.item_type = 'single_choice'::public.item_type;
  if v_count <> 1 then
    raise exception '15B13H_single_choice_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and item.item_type = 'true_false'::public.item_type;
  if v_count <> 0 then
    raise exception '15B13H_true_false_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_options option_row
  join public.items item on item.id = option_row.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION';
  if v_count <> 4 then
    raise exception '15B13H_option_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_misconception_mappings mapping
  join public.items item on item.id = mapping.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION';
  if v_count <> 3 then
    raise exception '15B13H_mapping_count_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
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
  if v_count <> 1 then
    raise exception '15B13H_fingerprint_contract_failed:%', v_count;
  end if;

  select count(distinct item.variant_fingerprint) into v_count
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION';
  if v_count <> 1 then
    raise exception '15B13H_fingerprint_uniqueness_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and version.version_no = 1;
  if v_count <> 1 then
    raise exception '15B13H_version_snapshot_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.item_template_remediation_guides guide
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and guide.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13H_draft_guide_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.remediation_guide_authoring_versions authoring
  join public.item_template_remediation_guides guide
    on guide.id = authoring.guide_source_id
   and authoring.guide_scope = 'template'
  join public.item_templates template on template.id = guide.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION'
    and authoring.authoring_version = 1
    and authoring.lifecycle_status = 'draft';
  if v_count <> 1 then
    raise exception '15B13H_guide_version_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_pool_items pool_item
  join public.items item on item.id = pool_item.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S07-T02-SLOW-DIFFUSION';
  if v_count <> 0 then
    raise exception '15B13H_pool_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.curriculum_releases release
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
    and release.status = 'draft';
  if v_count <> 1 then
    raise exception '15B13H_release_boundary_failed:%', v_count;
  end if;

  select count(*) into v_count
  from public.assessment_blueprints blueprint
  join public.curriculum_releases release on release.id = blueprint.curriculum_release_id
  where release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2';
  if v_count <> 0 then
    raise exception '15B13H_blueprint_boundary_failed:%', v_count;
  end if;

  if (select count(*) from public.curriculum_release_item_families r
      join public.item_families f on f.id=r.item_family_id
      join public.learning_outcomes o on o.id=r.primary_learning_outcome_id
      where f.code='PHY7-U02-S07-F02-SLOW-DIFFUSION'
      and o.source_locator='7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(1)'
      and r.mapping_type_snapshot='direct') <> 1 then
    raise exception '15B13H_release_outcome_mapping_failed';
  end if;
  if exists (
    select 1 from public.items i join public.item_answer_keys a on a.item_id=i.id
    join public.item_options o on o.item_id=i.id
    where i.code ~ '^PHY7-U02-S07-I05$'
    and o.option_key = a.answer #>> '{}'
    and exists (select 1 from public.item_misconception_mappings m where m.item_id=i.id and m.response_key=o.option_key)
  ) then raise exception '15B13H_correct_answer_mapped_as_error'; end if;
  if (select count(*) from public.item_options o join public.items i on i.id=o.item_id
      join public.item_answer_keys a on a.item_id=i.id
      where i.code ~ '^PHY7-U02-S07-I05$' and o.option_key <> a.answer #>> '{}'
      and (select count(*) from public.item_misconception_mappings m
           where m.item_id=i.id and m.response_key=o.option_key) = 1) <> 3 then
    raise exception '15B13H_distractor_coverage_failed';
  end if;
  if (select count(distinct a.answer) from public.item_answer_keys a join public.items i on i.id=a.item_id
      where i.code ~ '^PHY7-U02-S07-I05$') <> 1 then
    raise exception '15B13H_answer_position_balance_failed';
  end if;
  if (select count(*) from public.item_curriculum_scopes c join public.items i on i.id=c.item_id
      join public.units u on u.id=c.unit_id
      where i.code ~ '^PHY7-U02-S07-I05$' and u.code='PHY7-U02' and c.is_primary) <> 1 then
    raise exception '15B13H_curriculum_scope_failed';
  end if;
end $$;
