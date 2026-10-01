-- Sprint 15B answer-position integrity.
--
-- Canonical answer keys are private and learner-facing options are shuffled
-- server-side. Canonical key balance is nevertheless maintained as an
-- authoring-quality invariant so reviewer views, exports and any explicitly
-- fixed-order content do not teach a positional pattern.
--
-- The seven affected Chapter II items have no pool membership or learner
-- exposure. Their option meaning is unchanged: only canonical option keys are
-- exchanged, misconception response keys follow the moved distractors, and a
-- new governed item version is opened for technical QA and re-approval.

create temporary table sprint_15b_answer_position_rebalance (
  item_code text primary key,
  expected_old_key text not null,
  target_new_key text not null,
  check (expected_old_key <> target_new_key)
) on commit drop;

insert into sprint_15b_answer_position_rebalance (
  item_code, expected_old_key, target_new_key
) values
  ('PHY7-U02-S02-I04', 'C', 'D'),
  ('PHY7-U02-S03-I02', 'C', 'B'),
  ('PHY7-U02-S03-I03', 'A', 'C'),
  ('PHY7-U02-S03-I04', 'A', 'D'),
  ('PHY7-U02-S04-I02', 'A', 'B'),
  ('PHY7-U02-S04-I03', 'A', 'C'),
  ('PHY7-U02-S04-I04', 'A', 'D');

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance;
  if v_bad <> 7 then
    raise exception '15B_answer_position_plan_count_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance plan
  left join public.items item on item.code = plan.item_code
  left join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where item.id is null
     or item.item_type::text <> 'single_choice'
     or item.status::text <> 'published'
     or item.review_status <> 'approved'
     or answer_key.answer #>> '{}' is distinct from plan.expected_old_key;
  if v_bad <> 0 then
    raise exception '15B_answer_position_precondition_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  where (select count(*) from public.item_options option_row where option_row.item_id = item.id) <> 4
     or not exists (
       select 1 from public.item_options option_row
       where option_row.item_id = item.id
         and option_row.option_key = plan.expected_old_key
     )
     or not exists (
       select 1 from public.item_options option_row
       where option_row.item_id = item.id
         and option_row.option_key = plan.target_new_key
     );
  if v_bad <> 0 then
    raise exception '15B_answer_position_option_precondition_failed:%', v_bad;
  end if;

  -- A published correct key must not carry a distractor misconception, while
  -- the target key must carry at least one mapping that can move with it.
  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  where exists (
      select 1 from public.item_misconception_mappings mapping
      where mapping.item_id = item.id
        and mapping.response_key = plan.expected_old_key
    )
     or not exists (
      select 1 from public.item_misconception_mappings mapping
      where mapping.item_id = item.id
        and mapping.response_key = plan.target_new_key
    );
  if v_bad <> 0 then
    raise exception '15B_answer_position_mapping_precondition_failed:%', v_bad;
  end if;

  -- Re-keying is authorized only before learner delivery begins.
  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  where exists (
      select 1 from public.assessment_pool_items pool_item
      where pool_item.item_id = item.id and pool_item.enabled
    )
     or exists (
      select 1 from public.learning_session_items session_item
      where session_item.item_id = item.id
    );
  if v_bad <> 0 then
    raise exception '15B_answer_position_learner_exposure_blocked:%', v_bad;
  end if;
end $$;

-- Preserve every currently approved state before changing canonical keys.
insert into public.item_versions (
  item_id, version_no, snapshot, change_summary, created_by
)
select
  item.id,
  item.version_no,
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
  '15B answer-position rebalance: approved pre-change snapshot',
  null
from sprint_15b_answer_position_rebalance plan
join public.items item on item.code = plan.item_code
join public.item_answer_keys answer_key on answer_key.item_id = item.id
on conflict (item_id, version_no) do nothing;

-- Move the items out of published state before changing answer/mapping rows.
update public.items item
set
  status = 'review'::public.content_status,
  review_status = 'needs_review',
  last_reviewed_at = null,
  last_reviewed_by = null,
  config = jsonb_set(
    jsonb_set(
      coalesce(item.config, '{}'::jsonb),
      '{humanReviewStatus}',
      '"pending"'::jsonb,
      true
    ),
    '{technicalQaStatus}',
    '"pending"'::jsonb,
    true
  ) || jsonb_build_object(
    'answerPositionQaContract', 'family-balanced-v1',
    'answerPositionRevision', '15B-answer-position-integrity'
  ),
  updated_at = now()
from sprint_15b_answer_position_rebalance plan
where item.code = plan.item_code;

-- Swap only the content assigned to the old and new canonical keys. Display
-- order and the meaning of every option remain unchanged as a set.
with swaps as (
  select
    item.id as item_id,
    plan.expected_old_key,
    plan.target_new_key,
    old_option.content_hy as old_content_hy,
    old_option.content_en as old_content_en,
    new_option.content_hy as new_content_hy,
    new_option.content_en as new_content_en
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  join public.item_options old_option
    on old_option.item_id = item.id
   and old_option.option_key = plan.expected_old_key
  join public.item_options new_option
    on new_option.item_id = item.id
   and new_option.option_key = plan.target_new_key
)
update public.item_options option_row
set
  content_hy = case
    when option_row.option_key = swaps.expected_old_key then swaps.new_content_hy
    else swaps.old_content_hy
  end,
  content_en = case
    when option_row.option_key = swaps.expected_old_key then swaps.new_content_en
    else swaps.old_content_en
  end
from swaps
where option_row.item_id = swaps.item_id
  and option_row.option_key in (swaps.expected_old_key, swaps.target_new_key);

-- The target key's former distractor moved to the old correct key.
update public.item_misconception_mappings mapping
set response_key = plan.expected_old_key
from sprint_15b_answer_position_rebalance plan
join public.items item on item.code = plan.item_code
where mapping.item_id = item.id
  and mapping.response_key = plan.target_new_key;

update public.item_answer_keys answer_key
set
  answer = to_jsonb(plan.target_new_key),
  updated_at = now()
from sprint_15b_answer_position_rebalance plan
join public.items item on item.code = plan.item_code
where answer_key.item_id = item.id;

-- Open the next governed version and recompute the complete semantic
-- fingerprint from skill, prompt, answer and ordered options.
with fingerprints as (
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
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
)
update public.items item
set
  version_no = item.version_no + 1,
  variant_fingerprint = fingerprints.semantic_fingerprint,
  updated_at = now()
from fingerprints
where item.id = fingerprints.id;

insert into public.item_versions (
  item_id, version_no, snapshot, change_summary, created_by
)
select
  item.id,
  item.version_no,
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
  '15B ճիշտ պատասխանների դիրքերի հավասարակշռում՝ առանց հարցի իմաստը փոխելու',
  null
from sprint_15b_answer_position_rebalance plan
join public.items item on item.code = plan.item_code
join public.item_answer_keys answer_key on answer_key.item_id = item.id;

update public.item_templates template
set
  generation_config = coalesce(template.generation_config, '{}'::jsonb) || jsonb_build_object(
    'answerPositionQaContract', 'family-balanced-v1',
    'answerPositionQaSeverity', 'warning'
  ),
  updated_at = now()
where template.code in (
  'PHY7-U02-S02-T01-EVIDENCE',
  'PHY7-U02-S03-T01-CLASSIFY',
  'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
);

do $$
declare
  v_bad integer;
begin
  -- Each four-item family now uses A, B, C and D exactly once.
  with family_distribution as (
    select
      template.code,
      count(*) as item_count,
      count(*) filter (where answer_key.answer #>> '{}' = 'A') as answer_a,
      count(*) filter (where answer_key.answer #>> '{}' = 'B') as answer_b,
      count(*) filter (where answer_key.answer #>> '{}' = 'C') as answer_c,
      count(*) filter (where answer_key.answer #>> '{}' = 'D') as answer_d
    from public.item_templates template
    join public.items item on item.item_template_id = template.id
    join public.item_answer_keys answer_key on answer_key.item_id = item.id
    where template.code in (
      'PHY7-U02-S02-T01-EVIDENCE',
      'PHY7-U02-S03-T01-CLASSIFY',
      'PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE'
    )
      and item.retired_at is null
    group by template.code
  )
  select count(*) into v_bad
  from family_distribution
  where item_count <> 4
     or answer_a <> 1
     or answer_b <> 1
     or answer_c <> 1
     or answer_d <> 1;
  if v_bad <> 0 then
    raise exception '15B_answer_position_family_balance_failed:%', v_bad;
  end if;

  -- The complete 12-item Chapter II bank is therefore 3/3/3/3.
  with chapter_distribution as (
    select answer_key.answer #>> '{}' as answer_key, count(*) as item_count
    from public.items item
    join public.item_answer_keys answer_key on answer_key.item_id = item.id
    join public.item_curriculum_scopes scope
      on scope.item_id = item.id and scope.is_primary
    join public.units unit on unit.id = scope.unit_id
    where unit.code = 'PHY7-U02'
      and item.retired_at is null
    group by answer_key.answer #>> '{}'
  )
  select count(*) into v_bad
  from (values ('A'),('B'),('C'),('D')) expected(answer_key)
  left join chapter_distribution actual using (answer_key)
  where coalesce(actual.item_count, 0) <> 3;
  if v_bad <> 0 then
    raise exception '15B_answer_position_chapter_balance_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from sprint_15b_answer_position_rebalance plan
  join public.items item on item.code = plan.item_code
  join public.item_answer_keys answer_key on answer_key.item_id = item.id
  where answer_key.answer #>> '{}' is distinct from plan.target_new_key
     or item.status::text <> 'review'
     or item.review_status <> 'needs_review'
     or item.config->>'answerPositionQaContract' <> 'family-balanced-v1'
     or not exists (
       select 1 from public.item_versions version
       where version.item_id = item.id
         and version.version_no = item.version_no
     );
  if v_bad <> 0 then
    raise exception '15B_answer_position_revision_contract_failed:%', v_bad;
  end if;

  with expected as (
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
    from sprint_15b_answer_position_rebalance plan
    join public.items item on item.code = plan.item_code
    join public.item_answer_keys answer_key on answer_key.item_id = item.id
  )
  select count(*) into v_bad
  from expected
  join public.items item on item.id = expected.id
  where item.variant_fingerprint is distinct from expected.semantic_fingerprint;
  if v_bad <> 0 then
    raise exception '15B_answer_position_fingerprint_failed:%', v_bad;
  end if;

  -- Runtime policy is platform-wide: every active MCQ shuffles unless a fixed
  -- order is explicit and justified. No unjustified exception may exist.
  select count(*) into v_bad
  from public.items item
  where item.item_type::text = 'single_choice'
    and item.retired_at is null
    and coalesce((item.config->>'shuffleOptions')::boolean, true) = false
    and nullif(btrim(coalesce(item.config->>'optionOrderRationale', '')), '') is null;
  if v_bad <> 0 then
    raise exception '15B_unjustified_fixed_option_order_failed:%', v_bad;
  end if;
end $$;
