-- Sprint 15B.2 - approve the internally reviewed Chapter II skill map for
-- authoring and create the first governed, learner-inactive item family.
--
-- The review found that PHY7-U02-S01 duplicated the already-governed
-- PHY7-U01-S02 body/substance/phenomenon distinction. The duplicate remains
-- archived for traceability, but the Chapter II particulate-structure skill
-- now depends on the existing Chapter I skill. External Physics SME approval,
-- item review, assessment pools, blueprints, pilot and release activation all
-- remain pending.

-- Preserve the discarded candidate as history without allowing it to appear
-- in the current draft release or future authoring selectors.
update public.skills
set status = 'archived'::public.content_status
where code = 'PHY7-U02-S01'
  and status = 'review'::public.content_status;

delete from public.skill_prerequisites sp
using public.skills skill, public.skills prerequisite
where sp.skill_id = skill.id
  and sp.prerequisite_skill_id = prerequisite.id
  and skill.code = 'PHY7-U02-S02'
  and prerequisite.code = 'PHY7-U02-S01';

insert into public.skill_prerequisites (
  skill_id, prerequisite_skill_id, required_mastery
)
select skill.id, prerequisite.id, 0.720::numeric
from public.skills skill
join public.skills prerequisite on prerequisite.code = 'PHY7-U01-S02'
where skill.code = 'PHY7-U02-S02'
on conflict (skill_id, prerequisite_skill_id) do update set
  required_mastery = excluded.required_mastery;

delete from public.skill_outcome_curriculum_mappings mapping
using public.curriculum_reconciliation_runs run, public.skills skill
where mapping.reconciliation_id = run.id
  and mapping.skill_id = skill.id
  and run.reconciliation_key = 'physics7_u02_2026_08_14'
  and skill.code = 'PHY7-U02-S01';

delete from public.skill_curriculum_reconciliations reconciliation
using public.curriculum_reconciliation_runs run, public.skills skill
where reconciliation.reconciliation_id = run.id
  and reconciliation.skill_id = skill.id
  and run.reconciliation_key = 'physics7_u02_2026_08_14'
  and skill.code = 'PHY7-U02-S01';

delete from public.skill_outcomes mapping
using public.skills skill, public.learning_outcomes outcome,
      public.topics topic, public.units unit
where mapping.skill_id = skill.id
  and mapping.learning_outcome_id = outcome.id
  and outcome.topic_id = topic.id
  and topic.unit_id = unit.id
  and skill.code = 'PHY7-U02-S01'
  and unit.code = 'PHY7-U02';

delete from public.curriculum_release_skills snapshot
using public.curriculum_releases release, public.skills skill
where snapshot.curriculum_release_id = release.id
  and snapshot.skill_id = skill.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and skill.code = 'PHY7-U02-S01';

-- A newly authored family needs an explicit reconciliation disposition. This
-- is distinct from changing or retaining a family inherited from a predecessor.
alter table public.item_family_curriculum_reconciliations
  drop constraint if exists item_family_curriculum_reconciliations_disposition_check;

alter table public.item_family_curriculum_reconciliations
  add constraint item_family_curriculum_reconciliations_disposition_check
  check (disposition in (
    'unchanged', 'mapping_updated', 'wording_updated', 'scope_changed',
    'merge_required', 'split_required', 'no_longer_applicable',
    'new_official_outcome_missing', 'new_family'
  ));

insert into public.item_families (
  skill_id, code, name_hy, description, metadata
)
select
  skill.id,
  'PHY7-U02-S02-F01-PARTICULATE-EVIDENCE',
  'Փորձարարական դիտումից նյութի մասնիկային կառուցվածքի եզրակացություն',
  'Տրված փորձարարական դիտումից ընտրել այն բացատրությունը, որը նյութի վարքը կապում է մասնիկների և նրանց միջև եղած ազատ տարածությունների հետ։',
  jsonb_build_object(
    'sprint', '15B.2',
    'authoringStatus', 'draft',
    'learnerVisible', false,
    'construct', 'particulate_structure_from_evidence',
    'internalSkillMapDisposition', 'approved_for_authoring',
    'externalSmeValidation', 'pending',
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 23-26'
  )
from public.skills skill
where skill.code = 'PHY7-U02-S02'
on conflict (code) do nothing;

with context as (
  select run.id as reconciliation_id, family.id as item_family_id,
         outcome.id as learning_outcome_id
  from public.curriculum_reconciliation_runs run
  join public.item_families family
    on family.code = 'PHY7-U02-S02-F01-PARTICULATE-EVIDENCE'
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
       'Ընտանիքը գնահատում է փորձարարական դիտումներից նյութի մասնիկային կառուցվածքի վերաբերյալ հիմնավորված եզրակացություն անելը։'
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
  'PHY7-U02-S02-T01-EVIDENCE',
  'parallel',
  1,
  jsonb_build_object(
    'sprint', '15B.2',
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'skillCode', 'PHY7-U02-S02',
    'variantCount', 4,
    'reviewGate', 'content_and_sme_review_pending',
    'learnerVisible', false
  ),
  'draft'
from public.item_families family
where family.code = 'PHY7-U02-S02-F01-PARTICULATE-EVIDENCE'
on conflict (code) do nothing;

with item_rows(
  code, prompt_hy, difficulty, variant_key, evidence_key, correct_key
) as (
  values
    (
      'PHY7-U02-S02-I01',
      'Ջրով լի բաժակի մեջ մեկ թեյի գդալ աղ են լուծում, բայց ջուրը բաժակից չի թափվում։ Ո՞ր եզրակացությունն է լավագույնս բացատրում դիտումը։',
      2, 'particulate_evidence:01', 'salt_solution', 'B'
    ),
    (
      'PHY7-U02-S02-I02',
      'Մեկ լիտր ջուրը խառնում են մեկ լիտր սպիրտի հետ, սակայն խառնուրդի ծավալը 2 լիտրից փոքր է։ Ո՞ր բացատրությունն է համապատասխանում նյութի մասնիկային կառուցվածքին։',
      3, 'particulate_evidence:02', 'water_alcohol_volume', 'C'
    ),
    (
      'PHY7-U02-S02-I03',
      'Որոշ գազեր բարձր ջերմաստիճանում կարող են անցնել երկաթե պատի միջով։ Ո՞ր եզրակացությանն է աջակցում այս դիտումը։',
      3, 'particulate_evidence:03', 'gas_through_hot_iron', 'A'
    ),
    (
      'PHY7-U02-S02-I04',
      'Պղնձե լարը տաքացնելիս երկարում է, իսկ սառչելիս վերադառնում է սկզբնական երկարությանը։ Ո՞ր մասնիկային բացատրությունն է ճիշտ։',
      3, 'particulate_evidence:04', 'heated_copper_wire', 'C'
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
    'bank', 'PHY7-U02-15B2-DRAFT',
    'sprint', '15B.2',
    'learnerVisible', false,
    'reviewBasis', 'internally_approved_skill_map',
    'humanReviewStatus', 'pending',
    'smeValidation', 'pending',
    'technicalQaStatus', 'pending',
    'shuffleOptions', true,
    'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
    'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 23-26'
  ),
  'draft'::public.content_status,
  row.code,
  'core',
  'reasoning',
  'Գործող Ֆիզիկա 7 ծրագիր՝ Թեմա 2, պարտադիր վերջնարդյունք 1(1); Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 23-26',
  'provisional_no_sme_review',
  'needs_review',
  1,
  template.id,
  row.variant_key,
  null,
  jsonb_build_object(
    'evidenceKey', row.evidence_key,
    'authoredCatalog', true
  ),
  md5(row.code || ':' || row.prompt_hy || ':' || row.correct_key)
from item_rows row
join public.skills skill on skill.code = 'PHY7-U02-S02'
join public.item_templates template on template.code = 'PHY7-U02-S02-T01-EVIDENCE'
on conflict (code) where code is not null do nothing;

with option_rows(item_code, option_key, content_hy, display_order) as (
  values
    ('PHY7-U02-S02-I01', 'A', 'Աղը լուծվելիս ամբողջությամբ անհետանում է և այլևս նյութ չէ։', 1),
    ('PHY7-U02-S02-I01', 'B', 'Ջրի մասնիկների միջև կան ազատ տարածություններ, որոնցում տեղավորվում են աղի մասնիկները։', 2),
    ('PHY7-U02-S02-I01', 'C', 'Լուծվելիս ջրի զանգվածը փոքրանում է։', 3),
    ('PHY7-U02-S02-I01', 'D', 'Աղի մասնիկները վերածվում են ջրի մասնիկների։', 4),
    ('PHY7-U02-S02-I02', 'A', 'Մասնիկների մի մասը ոչնչանում է։', 1),
    ('PHY7-U02-S02-I02', 'B', 'Խառնելիս հեղուկների զանգվածը անհետանում է։', 2),
    ('PHY7-U02-S02-I02', 'C', 'Մի նյութի մասնիկները տեղավորվում են մյուս նյութի մասնիկների միջև եղած ազատ տարածություններում։', 3),
    ('PHY7-U02-S02-I02', 'D', 'Ջուրն ու սպիրտը հոծ են և մասնիկներ չունեն։', 4),
    ('PHY7-U02-S02-I03', 'A', 'Նույնիսկ պինդ նյութի մասնիկների միջև կան ազատ տարածություններ։', 1),
    ('PHY7-U02-S02-I03', 'B', 'Երկաթը բարձր ջերմաստիճանում դադարում է նյութ լինելուց։', 2),
    ('PHY7-U02-S02-I03', 'C', 'Գազը վերածվում է երկաթի։', 3),
    ('PHY7-U02-S02-I03', 'D', 'Պինդ մարմինները կազմված չեն մասնիկներից։', 4),
    ('PHY7-U02-S02-I04', 'A', 'Տաքացնելիս պղնձի յուրաքանչյուր մասնիկ անընդհատ մեծանում է։', 1),
    ('PHY7-U02-S02-I04', 'B', 'Տաքացնելիս նոր պղնձի մասնիկներ են առաջանում։', 2),
    ('PHY7-U02-S02-I04', 'C', 'Տաքացնելիս մասնիկների միջև միջին հեռավորությունը մեծանում է։', 3),
    ('PHY7-U02-S02-I04', 'D', 'Տաքացնելիս պղինձը կորցնում է զանգվածը։', 4)
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
    ('PHY7-U02-S02-I01', 'B'),
    ('PHY7-U02-S02-I02', 'C'),
    ('PHY7-U02-S02-I03', 'A'),
    ('PHY7-U02-S02-I04', 'C')
)
insert into public.item_answer_keys (
  item_id, answer, tolerance, canonical_unit, accepted_units, feedback_code
)
select item.id, to_jsonb(row.correct_key::text), null, null, '{}'::text[],
       'particulate_structure_evidence'
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
join public.units unit on unit.code = 'PHY7-U02'
join public.subject_programs program on program.id = unit.subject_program_id
on conflict (item_id, unit_id) do update set
  subject_program_id = excluded.subject_program_id,
  is_primary = true;

with misconception_rows(code, title_hy, description_hy) as (
  values
    (
      'matter_as_continuous',
      'Նյութը որպես հոծ միջավայր պատկերացնելը',
      'Սովորողը ենթադրում է, որ նյութը հոծ է և մասնիկների միջև ազատ տարածություններ չկան։'
    ),
    (
      'particle_identity_or_count_changes',
      'Մասնիկների անհետացում, առաջացում կամ փոխակերպում ենթադրելը',
      'Սովորողը ծավալի կամ չափի փոփոխությունը բացատրում է մասնիկների անհետացմամբ, առաջացմամբ կամ այլ մասնիկների փոխակերպմամբ։'
    ),
    (
      'particle_size_increases_on_heating',
      'Տաքացնելիս մասնիկների չափի մեծացում ենթադրելը',
      'Սովորողը ջերմային ընդարձակումը վերագրում է մասնիկների չափի, ոչ թե նրանց միջև միջին հեռավորության մեծացմանը։'
    )
)
insert into public.misconceptions (
  skill_id, code, title_hy, description_hy, status
)
select skill.id, row.code, row.title_hy, row.description_hy, 'draft'
from misconception_rows row
join public.skills skill on skill.code = 'PHY7-U02-S02'
on conflict (skill_id, code) do nothing;

with mapping_rows(item_code, response_key, misconception_code, mapping_note) as (
  values
    ('PHY7-U02-S02-I01', 'A', 'particle_identity_or_count_changes', 'Լուծվելը սխալմամբ մեկնաբանվում է որպես նյութի անհետացում։'),
    ('PHY7-U02-S02-I01', 'C', 'particle_identity_or_count_changes', 'Դիտումը սխալմամբ կապվում է նյութի քանակի կորստի հետ։'),
    ('PHY7-U02-S02-I01', 'D', 'particle_identity_or_count_changes', 'Լուծվելը սխալմամբ մեկնաբանվում է որպես մասնիկների փոխակերպում։'),
    ('PHY7-U02-S02-I02', 'A', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ բացատրվում է մասնիկների ոչնչացմամբ։'),
    ('PHY7-U02-S02-I02', 'B', 'particle_identity_or_count_changes', 'Ծավալի փոփոխությունը սխալմամբ կապվում է զանգվածի անհետացման հետ։'),
    ('PHY7-U02-S02-I02', 'D', 'matter_as_continuous', 'Մերժվում է նյութի մասնիկային կառուցվածքը։'),
    ('PHY7-U02-S02-I03', 'B', 'particle_identity_or_count_changes', 'Տաքացումը սխալմամբ մեկնաբանվում է որպես նյութի էության կորուստ։'),
    ('PHY7-U02-S02-I03', 'C', 'particle_identity_or_count_changes', 'Ներթափանցումը սխալմամբ մեկնաբանվում է որպես մասնիկների փոխակերպում։'),
    ('PHY7-U02-S02-I03', 'D', 'matter_as_continuous', 'Մերժվում է պինդ նյութի մասնիկային կառուցվածքը։'),
    ('PHY7-U02-S02-I04', 'A', 'particle_size_increases_on_heating', 'Ընդարձակումը սխալմամբ վերագրվում է մասնիկների չափի մեծացմանը։'),
    ('PHY7-U02-S02-I04', 'B', 'particle_identity_or_count_changes', 'Ընդարձակումը սխալմամբ վերագրվում է նոր մասնիկների առաջացմանը։'),
    ('PHY7-U02-S02-I04', 'D', 'particle_identity_or_count_changes', 'Չափի փոփոխությունը սխալմամբ կապվում է զանգվածի կորստի հետ։')
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

-- Snapshot draft item version 1 after options, answer keys and misconception
-- mappings have been assembled.
insert into public.item_versions (
  item_id, version_no, snapshot, change_summary, created_by
)
select
  item.id,
  1,
  jsonb_build_object(
    'item', to_jsonb(item),
    'options', coalesce((
      select jsonb_agg(to_jsonb(option_row) order by option_row.display_order)
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
  '15B.2 կառավարվող սևագրի ստեղծում',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.skills skill on skill.id = item.skill_id and skill.code = 'PHY7-U02-S02'
on conflict (item_id, version_no) do nothing;

-- The first hint/remediation guide is a draft in both the runtime table and
-- append-only authoring history. Runtime selection continues to require
-- status='published', so this cannot reach learners.
select set_config('app.remediation_actor_role', 'system', true);
select set_config('app.remediation_change_rationale', '15B.2 առաջին սևագրի ստեղծում', true);
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
  'Ինչպե՞ս եզրակացություն անել փորձարարական դիտումից',
  'Նախ առանձնացրու, թե փորձի ընթացքում ինչը պահպանվեց և ինչը փոխվեց։ Այնուհետև ընտրիր այն բացատրությունը, որը չի ենթադրում նյութի կամ զանգվածի անհետացում և դիտումը կապում է մասնիկների ու նրանց միջև եղած տարածությունների հետ։',
  'Հարցրու՝ փորձը ցույց տալի՞ս է, որ նյութն անհետացել է, թե՞ մասնիկները պարզապես այլ կերպ են դասավորվել։',
  'Եթե երկու նյութի ընդհանուր ծավալը սպասվածից փոքր է կամ լուծված նյութը տեղավորվում է հեղուկում, մտածիր մասնիկների միջև եղած ազատ տարածությունների մասին։',
  'Օրինակ՝ ջուրն ու սպիրտը խառնելիս ընդհանուր ծավալը կարող է 2 լիտրից փոքր լինել, որովհետև մի նյութի մասնիկները տեղավորվում են մյուսի մասնիկների միջև եղած ազատ տարածություններում։',
  '{}'::text[],
  'draft',
  jsonb_build_object(
    'sprint', '15B.2',
    'learnerVisible', false,
    'referenceMetadata', jsonb_build_object(
      'programmeOutcomeLocator', '7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)',
      'textbookLocator', 'Ֆիզիկա 7 (2023), Գլուխ II, §7, տպագիր էջեր 23-26',
      'textbookSha256', 'd8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904'
    )
  )
from public.item_templates template
where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
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
    'misconceptionCode', '',
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
  '15B.2 առաջին սևագրի ստեղծում',
  null,
  'system',
  'system',
  null
from public.item_template_remediation_guides guide
join public.item_templates template on template.id = guide.item_template_id
join public.item_families family on family.id = template.item_family_id
where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
  and guide.trigger_error_code is null
  and guide.status = 'draft'
  and not exists (
    select 1
    from public.remediation_guide_authoring_versions authoring
    where authoring.guide_scope = 'template'
      and authoring.guide_source_id = guide.id
  );

-- Snapshot the new family into the still-draft successor release. No item or
-- assessment pool is attached to a runtime blueprint in this slice.
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
  on family.code = 'PHY7-U02-S02-F01-PARTICULATE-EVIDENCE'
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
  status = 'passed',
  evidence = jsonb_build_object(
    'approvedForAuthoringSkills', 8,
    'directOutcomeMappings', 7,
    'derivedSupportingSkills', 1,
    'prerequisiteLinks', 8,
    'archivedDuplicateCandidate', 'PHY7-U02-S01',
    'replacementPrerequisite', 'PHY7-U01-S02',
    'externalSmeValidation', 'pending'
  ),
  notes = 'Ներքին վերանայմամբ ութ հմտությունների քարտեզը հաստատվել է հարցերի սևագիր հեղինակման համար։ Կրկնվող PHY7-U02-S01 թեկնածուն արխիվացվել է, և գործող PHY7-U01-S02 հմտությունը դարձել է միջգլխային նախապայման։ Սա արտաքին ֆիզիկայի մասնագետի հաստատում կամ թողարկման թույլտվություն չէ։',
  checked_at = now(),
  checked_by = null,
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'skills_mapped';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'draftItemFamilies', 1,
    'draftItems', 4,
    'draftRemediationGuides', 1,
    'assessmentPools', 0,
    'assessmentBlueprints', 0
  ),
  notes = 'Առաջին հարցերի ընտանիքը, չորս տարբերակները և օգնության ուղեցույցը սևագիր են։ Գնահատման ավազաններն ու ախտորոշիչ, վարժանք և յուրացման ստուգման ձևանմուշները դեռ չեն ստեղծվել։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'assessment_scope_bound';

update public.curriculum_release_gate_checks gate
set
  evidence = jsonb_build_object(
    'draftFamiliesAwaitingReview', 1,
    'draftItemsAwaitingReview', 4,
    'draftGuidesAwaitingReview', 1
  ),
  notes = '15B.2-ի առաջին ընտանիքը սպասում է բովանդակային, տեխնիկական և արտաքին մասնագիտական ստուգմանը։',
  updated_at = now()
from public.curriculum_releases release
where gate.curriculum_release_id = release.id
  and release.release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'
  and release.status = 'draft'
  and gate.gate_code = 'content_qa_passed';

notify pgrst, 'reload schema';
