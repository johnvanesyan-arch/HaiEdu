-- Sprint 11D — complete the review-only Chapter I candidate bank.
-- Adds 18 deterministic candidates each for S07/S08/S10, 10 deterministic
-- candidates for S09, and two authored S09 reasoning candidates. Together with
-- the 114 recovered authored candidates, this yields exactly 180 new candidates
-- (18 per skill) plus the 60 fixed anchors = 240 structural variants.
-- New candidates remain non-pilot, review-only, and SME-provisional.

create temporary table tmp_11d_generation_plan(
  skill_code text not null,
  ordinal integer not null,
  template_code text not null,
  seed text not null,
  fingerprint text not null,
  primary key(skill_code,ordinal)
) on commit drop;

-- Select fresh, QA-valid deterministic fingerprints only. Existing 11C proof
-- variants are deliberately left separate rather than silently re-labelled.
with cfg(skill_code,target_count,templates) as (
  values
    ('PHY7-U01-S07',18,array['PHY7-U01-S07-T-LENGTH-TO-M','PHY7-U01-S07-T-TIME-TO-S','PHY7-U01-S07-T-VOLUME-TO-L']::text[]),
    ('PHY7-U01-S08',18,array['PHY7-U01-S08-T-SCALE-DIVISION','PHY7-U01-S08-T-SCALE-READING']::text[]),
    ('PHY7-U01-S09',10,array['PHY7-U01-S09-T-MEASUREMENT-ERROR']::text[]),
    ('PHY7-U01-S10',18,array['PHY7-U01-S10-T-DISPLACEMENT-VOLUME','PHY7-U01-S10-T-SHEET-THICKNESS']::text[])
), previews as (
  select c.skill_code,c.target_count,g.n,
         c.templates[((g.n-1)%array_length(c.templates,1))+1] template_code,
         '11d-final-'||right(c.skill_code,3)||'-'||lpad(g.n::text,4,'0') seed,
         public.service_preview_item_variant(
           c.templates[((g.n-1)%array_length(c.templates,1))+1],
           '11d-final-'||right(c.skill_code,3)||'-'||lpad(g.n::text,4,'0')
         ) preview
  from cfg c cross join generate_series(1,500) g(n)
), valid as (
  select p.*,
         row_number() over(partition by p.skill_code,p.preview->>'semanticFingerprint' order by p.n) fp_rank
  from previews p
  where coalesce((p.preview#>>'{qa,valid}')::boolean,false)=true
), fresh as (
  select v.*
  from valid v
  left join public.items existing
    on existing.variant_fingerprint=v.preview->>'semanticFingerprint'
   and existing.retired_at is null
  where v.fp_rank=1 and existing.id is null
), ranked as (
  select f.*,row_number() over(partition by f.skill_code order by f.n) ordinal
  from fresh f
)
insert into tmp_11d_generation_plan(skill_code,ordinal,template_code,seed,fingerprint)
select skill_code,ordinal,template_code,seed,preview->>'semanticFingerprint'
from ranked
where ordinal<=target_count;

do $$
declare r record;
begin
  for r in
    select x.skill_code,x.target_count,count(p.ordinal) n
    from (values ('PHY7-U01-S07',18),('PHY7-U01-S08',18),('PHY7-U01-S09',10),('PHY7-U01-S10',18)) x(skill_code,target_count)
    left join tmp_11d_generation_plan p on p.skill_code=x.skill_code
    group by x.skill_code,x.target_count
  loop
    if r.n<>r.target_count then
      raise exception '11D_generator_capacity_failed:%:%/%',r.skill_code,r.n,r.target_count;
    end if;
  end loop;
end $$;

-- Unexpected materialisation errors are intentionally not swallowed.
do $$
declare r record; v_result jsonb;
begin
  for r in select * from tmp_11d_generation_plan order by skill_code,ordinal loop
    v_result:=public.service_materialize_item_variant(r.template_code,r.seed);
    if (v_result->>'itemId') is null then
      raise exception '11D_materialization_missing_item:%:%',r.skill_code,r.seed;
    end if;
  end loop;
end $$;

-- Tag generated items into their intended review-only purpose buckets.
with selected as (
  select p.*,i.id item_id
  from tmp_11d_generation_plan p
  join public.item_templates t on t.code=p.template_code
  join public.items i on i.item_template_id=t.id and i.variant_key='seed:'||p.seed
), bucketed as (
  select *,
    case
      when skill_code='PHY7-U01-S09' and ordinal<=7 then 'practice'
      when skill_code='PHY7-U01-S09' then 'diagnostic'
      when ordinal<=8 then 'practice'
      when ordinal<=12 then 'diagnostic'
      else 'mastery_check'
    end bucket,
    case
      when skill_code='PHY7-U01-S09' and ordinal<=7 then ordinal
      when skill_code='PHY7-U01-S09' then ordinal-7
      when ordinal<=8 then ordinal
      when ordinal<=12 then ordinal-8
      else ordinal-12
    end bucket_seq
  from selected
)
update public.items i
set config=jsonb_set(i.config,'{pilot_ready}','false'::jsonb,true)
      || jsonb_build_object(
        'bank','PHY7-U01-11D-CANDIDATE','phase','11D',
        'sprint11dBucket',b.bucket,'sprint11dBucketSeq',b.bucket_seq,
        'technicalQaStatus','pending','humanReviewStatus','pending','smeValidation','pending'
      ),
    validation_state='provisional_no_sme_review',
    review_status='needs_review',status='review'::public.content_status,updated_at=now()
from bucketed b where i.id=b.item_id;

-- Two authored S09 reasoning candidates complete the 8 Practice / 4 Diagnostic
-- capacity because the deterministic measurement-error template has only 10
-- genuinely distinct outputs in its current safe domain.
with t as (
  select s.id skill_id,it.id template_id
  from public.skills s
  join public.item_templates it on it.code='PHY7-U01-S09-T-11D-PARALLEL'
  where s.code='PHY7-U01-S09'
), src(code,bucket,bucket_seq,prompt_hy,answer,difficulty,options) as (
  values
  ('PHY7-U01-S09-11D-P08','practice',8,
   'Ջերմաչափի սանդղակի մեկ բաժանումը 2 °C է։ Կես-բաժանման կանոնով 36 °C ցուցմունքի համար ո՞ր սխալն է ճիշտ նշել։',
   '"B"'::jsonb,3,
   '[{"optionKey":"A","contentHy":"±0.5 °C"},{"optionKey":"B","contentHy":"±1 °C"},{"optionKey":"C","contentHy":"±2 °C"},{"optionKey":"D","contentHy":"±4 °C"}]'::jsonb),
  ('PHY7-U01-S09-11D-D04','diagnostic',4,
   'Չափման արդյունքը գրանցվել է 8.4±0.2 սմ։ Ո՞ր միջակայքն է համապատասխանում այս գրառմանը։',
   '"C"'::jsonb,3,
   '[{"optionKey":"A","contentHy":"8.0–8.8 սմ"},{"optionKey":"B","contentHy":"8.2–8.4 սմ"},{"optionKey":"C","contentHy":"8.2–8.6 սմ"},{"optionKey":"D","contentHy":"8.4–8.6 սմ"}]'::jsonb)
), prepared as (
  select src.*,t.skill_id,t.template_id,
         md5(t.skill_id::text||'|'||lower(regexp_replace(src.prompt_hy,'\s+',' ','g'))||'|'||src.answer::text||'|'||src.options::text) fingerprint
  from src cross join t
)
insert into public.items(
  skill_id,item_type,prompt_hy,prompt_en,stimulus,difficulty,config,status,code,
  difficulty_band,item_family,source_reference,validation_state,review_status,
  item_template_id,variant_key,variant_seed,variant_parameters,variant_fingerprint
)
select skill_id,'single_choice'::public.item_type,prompt_hy,null,'{}'::jsonb,difficulty,
       jsonb_build_object(
         'bank','PHY7-U01-11D-CANDIDATE','phase','11D','pilot_ready',false,
         'sprint11dBucket',bucket,'sprint11dBucketSeq',bucket_seq,
         'technicalQaStatus','pending','humanReviewStatus','pending',
         'reviewBasis','authored_parallel_candidate','smeValidation','pending'
       ),
       'review'::public.content_status,code,'core','reasoning',
       'Grade 7 Physics Chapter I measurement-error parallel candidate; human content review and SME validation pending',
       'provisional_no_sme_review','needs_review',template_id,
       '11d:'||bucket||':'||lpad(bucket_seq::text,2,'0'),null,
       jsonb_build_object('authoredCatalog',true,'bucket',bucket,'sequence',bucket_seq),fingerprint
from prepared;

with src(code,answer) as (
  values ('PHY7-U01-S09-11D-P08','"B"'::jsonb),('PHY7-U01-S09-11D-D04','"C"'::jsonb)
)
insert into public.item_answer_keys(item_id,answer,tolerance,canonical_unit,accepted_units,feedback_code)
select i.id,src.answer,null,null,array[]::text[],'sprint_11d_authored_parallel'
from src join public.items i on i.code=src.code;

with src(code,options) as (
  values
  ('PHY7-U01-S09-11D-P08','[{"optionKey":"A","contentHy":"±0.5 °C"},{"optionKey":"B","contentHy":"±1 °C"},{"optionKey":"C","contentHy":"±2 °C"},{"optionKey":"D","contentHy":"±4 °C"}]'::jsonb),
  ('PHY7-U01-S09-11D-D04','[{"optionKey":"A","contentHy":"8.0–8.8 սմ"},{"optionKey":"B","contentHy":"8.2–8.4 սմ"},{"optionKey":"C","contentHy":"8.2–8.6 սմ"},{"optionKey":"D","contentHy":"8.4–8.6 սմ"}]'::jsonb)
)
insert into public.item_options(item_id,option_key,content_hy,display_order)
select i.id,x.elem->>'optionKey',x.elem->>'contentHy',x.ord::integer
from src join public.items i on i.code=src.code
cross join lateral jsonb_array_elements(src.options) with ordinality x(elem,ord);

-- Recompute authored fingerprints from stored answer and ordered options.
update public.items i
set variant_fingerprint=md5(
      i.skill_id::text||'|'||lower(regexp_replace(i.prompt_hy,'\s+',' ','g'))||'|'||k.answer::text||'|'||
      coalesce((select jsonb_agg(jsonb_build_object('optionKey',o.option_key,'contentHy',o.content_hy) order by o.display_order,o.option_key)::text from public.item_options o where o.item_id=i.id),'[]')
    ),
    review_status='needs_review',status='review'::public.content_status,updated_at=now()
from public.item_answer_keys k
where k.item_id=i.id and i.code in ('PHY7-U01-S09-11D-P08','PHY7-U01-S09-11D-D04');

-- Skill-level misconception mapping for all new candidates.
insert into public.item_misconception_mappings(item_id,misconception_id,response_key,mapping_note)
select i.id,m.id,'*','Sprint 11D candidate skill-level mapping; response-specific refinement remains pending human content review.'
from public.items i
join public.skills s on s.id=i.skill_id
join public.misconceptions m on m.skill_id=s.id and m.status='active'
where i.config->>'phase'='11D' and i.retired_at is null
on conflict (item_id,misconception_id,response_key) do update set mapping_note=excluded.mapping_note;

-- Exact deterministic reproduction QA.
with generated as (
  select i.id,i.version_no,i.prompt_hy,i.variant_parameters,i.variant_fingerprint,i.variant_seed,t.code template_code,k.answer,
         public.service_preview_item_variant(t.code,i.variant_seed) preview
  from public.items i
  join public.item_templates t on t.id=i.item_template_id
  join public.item_answer_keys k on k.item_id=i.id
  where i.config->>'phase'='11D' and i.variant_seed is not null and i.retired_at is null
), checks as (
  select *,coalesce((preview#>>'{qa,valid}')::boolean,false)
         and prompt_hy=preview->>'promptHy'
         and variant_parameters=preview->'parameters'
         and variant_fingerprint=preview->>'semanticFingerprint'
         and answer=preview->'answer' passed
  from generated
)
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select id,version_no,null,passed,
       case when passed then '[]'::jsonb else '["deterministic_reproduction_mismatch"]'::jsonb end,
       '["human_content_review_pending","independent_physics_sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','deterministic_reproduction','templateCode',template_code,'seed',variant_seed,'humanContentReview',false,'humanSmeReview',false)
from checks;

-- Structural QA for the two newly authored S09 candidates.
with authored as (
  select i.id,i.version_no,k.answer,count(o.*) option_count,bool_or(o.option_key=trim(both '"' from k.answer::text)) answer_in_options
  from public.items i join public.item_answer_keys k on k.item_id=i.id left join public.item_options o on o.item_id=i.id
  where i.code in ('PHY7-U01-S09-11D-P08','PHY7-U01-S09-11D-D04')
  group by i.id,i.version_no,k.answer
)
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select id,version_no,null,(answer is not null and option_count=4 and coalesce(answer_in_options,false)),
       case when (answer is not null and option_count=4 and coalesce(answer_in_options,false)) then '[]'::jsonb else '["authored_structural_qa_failed"]'::jsonb end,
       '["human_content_review_pending","independent_physics_sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','authored_structural_qa','humanContentReview',false,'humanSmeReview',false)
from authored;

-- Set technical QA status from the latest 11D QA run. Candidates remain review-only.
with latest as (
  select distinct on (q.item_id) q.item_id,q.passed
  from public.item_qa_runs q join public.items i on i.id=q.item_id
  where i.config->>'phase'='11D' and q.details->>'phase'='11D'
  order by q.item_id,q.created_at desc
)
update public.items i
set config=i.config || jsonb_build_object(
      'technicalQaStatus',case when latest.passed then 'passed' else 'failed' end,
      'humanReviewStatus','pending','pilot_ready',false
    ),
    review_status='needs_review',status='review'::public.content_status,
    validation_state='provisional_no_sme_review',updated_at=now()
from latest where i.id=latest.item_id;

-- Hard candidate-bank assertions.
do $$
declare r record; v_bad integer;
begin
  for r in
    with counts as (
      select s.code skill_code,i.config->>'sprint11dBucket' bucket,count(*) n
      from public.items i join public.skills s on s.id=i.skill_id
      where i.config->>'phase'='11D' and i.retired_at is null
      group by s.code,i.config->>'sprint11dBucket'
    )
    select skill_code,
      coalesce(max(n) filter(where bucket='practice'),0) practice,
      coalesce(max(n) filter(where bucket='diagnostic'),0) diagnostic,
      coalesce(max(n) filter(where bucket='mastery_check'),0) mastery
    from counts group by skill_code order by skill_code
  loop
    if r.practice<>8 or r.diagnostic<>4 or r.mastery<>6 then
      raise exception '11D_candidate_bucket_failed:% P% D% M%',r.skill_code,r.practice,r.diagnostic,r.mastery;
    end if;
  end loop;

  if (select count(*) from public.items where config->>'phase'='11D' and retired_at is null)<>180 then
    raise exception '11D_candidate_total_not_180';
  end if;

  select count(*) into v_bad from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and (coalesce((i.config->>'pilot_ready')::boolean,false)=true
         or i.config->>'technicalQaStatus'<>'passed'
         or i.config->>'humanReviewStatus'<>'pending'
         or i.status<>'review'::public.content_status
         or i.review_status<>'needs_review');
  if v_bad<>0 then raise exception '11D_candidate_review_state_failed:%',v_bad; end if;

  select count(*) into v_bad from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and not exists(select 1 from public.item_misconception_mappings mm where mm.item_id=i.id);
  if v_bad<>0 then raise exception '11D_candidate_misconception_mapping_missing:%',v_bad; end if;

  select count(*) into v_bad from (
    select variant_fingerprint from public.items
    where config->>'phase'='11D' and retired_at is null
    group by variant_fingerprint having count(*)>1
  ) d;
  if v_bad<>0 then raise exception '11D_candidate_duplicate_fingerprint:%',v_bad; end if;

  for r in
    select s.code skill_code,
           count(*) filter(where i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$') fixed_n,
           count(*) filter(where i.config->>'phase'='11D') candidate_n
    from public.skills s
    join public.items i on i.skill_id=s.id and i.retired_at is null
    where s.code like 'PHY7-U01-S%'
      and (i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$' or i.config->>'phase'='11D')
    group by s.code
  loop
    if r.fixed_n<>6 or r.candidate_n<>18 then
      raise exception '11D_structural_24_capacity_failed:% fixed% candidates%',r.skill_code,r.fixed_n,r.candidate_n;
    end if;
  end loop;
end $$;
