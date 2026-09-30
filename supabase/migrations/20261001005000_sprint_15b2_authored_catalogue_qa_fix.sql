-- Sprint 15B.2 post-review correction.
--
-- The first Chapter II family is a hand-authored catalogue of parallel items,
-- not a deterministic generator. Classify its template as fixed so technical
-- QA does not require variant seeds, and derive each semantic fingerprint from
-- the complete assessable content (skill, normalized prompt, answer and
-- ordered options). All records remain draft and learner-inactive.

update public.item_templates
set
  template_kind = 'fixed',
  generation_config = generation_config || jsonb_build_object(
    'generationMode', 'authored_parallel_catalog',
    'deterministicRerender', false,
    'qaContract', 'authored_fixed_catalogue',
    'classificationCorrection', '15B.2 post-review'
  ),
  updated_at = now()
where code = 'PHY7-U02-S02-T01-EVIDENCE'
  and status = 'draft';

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
  where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
)
update public.items item
set
  variant_fingerprint = corrected.semantic_fingerprint,
  version_no = greatest(item.version_no, 2),
  config = item.config || jsonb_build_object(
    'fingerprintContract', 'skill_prompt_answer_ordered_options_v1',
    'templateQaContract', 'authored_fixed_catalogue'
  ),
  updated_at = now()
from corrected
where item.id = corrected.id
  and (
    item.variant_fingerprint is distinct from corrected.semantic_fingerprint
    or item.version_no < 2
    or item.config->>'fingerprintContract' is distinct from 'skill_prompt_answer_ordered_options_v1'
    or item.config->>'templateQaContract' is distinct from 'authored_fixed_catalogue'
  );

insert into public.item_versions (
  item_id, version_no, snapshot, change_summary, created_by
)
select
  item.id,
  2,
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
  '15B.2 հետվերանայման ուղղում՝ fixed հեղինակային կատալոգ և բովանդակային մատնահետք',
  null
from public.items item
join public.item_answer_keys answer_key on answer_key.item_id = item.id
join public.item_templates template on template.id = item.item_template_id
where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
  and item.version_no = 2
on conflict (item_id, version_no) do nothing;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.item_templates template
  where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
    and (
      template.template_kind <> 'fixed'
      or template.generation_config->>'generationMode' <> 'authored_parallel_catalog'
      or template.generation_config->>'deterministicRerender' <> 'false'
      or template.generation_config->>'qaContract' <> 'authored_fixed_catalogue'
    );
  if v_bad <> 0 then
    raise exception '15B2_authored_catalogue_template_contract_failed:%', v_bad;
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
    from public.items item
    join public.item_answer_keys answer_key on answer_key.item_id = item.id
    join public.item_templates template on template.id = item.item_template_id
    where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
  )
  select count(*) into v_bad
  from expected
  join public.items item on item.id = expected.id
  where item.variant_fingerprint is distinct from expected.semantic_fingerprint
     or item.version_no <> 2
     or item.status <> 'draft'::public.content_status
     or item.review_status <> 'needs_review'
     or coalesce((item.config->>'learnerVisible')::boolean, true) <> false;
  if v_bad <> 0 then
    raise exception '15B2_authored_catalogue_item_contract_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from public.items item
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T01-EVIDENCE';
  if v_bad <> 4 then
    raise exception '15B2_authored_catalogue_item_count_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from (
    select item.variant_fingerprint
    from public.items item
    join public.item_templates template on template.id = item.item_template_id
    where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
    group by item.variant_fingerprint
  ) distinct_fingerprints;
  if v_bad <> 4 then
    raise exception '15B2_authored_catalogue_fingerprint_uniqueness_failed:%', v_bad;
  end if;

  select count(*) into v_bad
  from public.item_versions version
  join public.items item on item.id = version.item_id
  join public.item_templates template on template.id = item.item_template_id
  where template.code = 'PHY7-U02-S02-T01-EVIDENCE'
    and version.version_no = 2;
  if v_bad <> 4 then
    raise exception '15B2_authored_catalogue_version2_failed:%', v_bad;
  end if;
end $$;
