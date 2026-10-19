-- Run only after all nine versioned production asset URLs return the expected PNG bytes.
begin;

do $qa$
begin
  if (
    select count(*)
    from public.items i
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
      and i.version_no=2
      and i.status='draft'
      and i.review_status='needs_review'
      and i.validation_state='provisional_no_sme_review'
      and i.config->>'learnerVisible'='false'
      and coalesce((i.config->>'allocationAllowed')::boolean,false)=false
  ) <> 9 then
    raise exception 'chapter_vi_image_correction_qa_source_state_invalid';
  end if;

  if exists (
    select 1
    from public.item_qa_runs q
    join public.items i on i.id=q.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ]) and q.version_no=2
  ) then
    raise exception 'chapter_vi_image_correction_qa_already_recorded';
  end if;

  insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
  select i.id,
         2,
         null,
         true,
         '[]'::jsonb,
         '[]'::jsonb,
         jsonb_build_object(
           'runKey','15F4-image-corrections-20261019',
           'scope','owner-selected textbook image replacements',
           'assetUrl',i.stimulus->>'url',
           'assetSha256',i.stimulus#>>'{source,sha256}',
           'productionAssetVerified',true,
           'promptOptionsAnswerChecked',true,
           's13OverlapRefresh','docs/evidence/chapter-vi-image-corrections-20261019.json',
           'reviewStatusPreserved','needs_review',
           'learnerVisible',false,
           'allocationAllowed',false
         )
  from public.items i
  where i.code = any(array[
    'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
    'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
    'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
  ]);

  if (
    select count(*)
    from public.item_qa_runs q
    join public.items i on i.id=q.item_id
    where i.code = any(array[
      'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
      'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
      'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
    ])
      and q.version_no=2
      and q.passed=true
      and q.details->>'runKey'='15F4-image-corrections-20261019'
  ) <> 9 then
    raise exception 'chapter_vi_image_correction_qa_insert_incomplete';
  end if;
end
$qa$;

select jsonb_build_object(
  'observedAt',clock_timestamp(),
  'runKey','15F4-image-corrections-20261019',
  'passed',count(*) filter(where q.passed),
  'errors',sum(jsonb_array_length(q.errors)),
  'warnings',sum(jsonb_array_length(q.warnings))
) as verification
from public.item_qa_runs q
join public.items i on i.id=q.item_id
where i.code = any(array[
  'PHY7-U06-S02-I01','PHY7-U06-S04-I01','PHY7-U06-S06-I01',
  'PHY7-U06-S07-I01','PHY7-U06-S08-I04','PHY7-U06-S09-I01',
  'PHY7-U06-S11-I01','PHY7-U06-S12-I01','PHY7-U06-S13-I05'
])
  and q.version_no=2
  and q.details->>'runKey'='15F4-image-corrections-20261019';

commit;
