-- Sprint 11D — re-audit the 60 fixed anchors and normalize the recovered
-- authored catalogue. This migration is deliberately review-safe: it does not
-- make any new Sprint 11D variant learner-visible.

-- 1. Re-audit the 60 existing fixed anchors without changing answer semantics.
update public.items i
set item_family = case
  when s.code='PHY7-U01-S01' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code='PHY7-U01-S01' then 'application'
  when s.code='PHY7-U01-S02' and right(i.code,3) in ('I01','I02','I05') then 'knowledge'
  when s.code='PHY7-U01-S02' then 'application'
  when s.code='PHY7-U01-S03' then 'knowledge'
  when s.code='PHY7-U01-S04' and right(i.code,3)='I02' then 'knowledge'
  when s.code='PHY7-U01-S04' and right(i.code,3)='I05' then 'reasoning'
  when s.code='PHY7-U01-S04' then 'application'
  when s.code='PHY7-U01-S05' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code='PHY7-U01-S05' then 'reasoning'
  when s.code='PHY7-U01-S06' and right(i.code,3) in ('I01','I02','I03','I04') then 'knowledge'
  when s.code='PHY7-U01-S06' then 'application'
  when s.code='PHY7-U01-S07' then 'application'
  when s.code='PHY7-U01-S08' and right(i.code,3)='I03' then 'knowledge'
  when s.code='PHY7-U01-S08' then 'application'
  when s.code='PHY7-U01-S09' and right(i.code,3) in ('I02','I04','I05','I06') then 'reasoning'
  when s.code='PHY7-U01-S09' then 'application'
  when s.code='PHY7-U01-S10' and right(i.code,3)='I02' then 'reasoning'
  when s.code='PHY7-U01-S10' then 'transfer'
  else i.item_family
end,
config = i.config || jsonb_build_object(
  'sprint11dFixedAudit',true,
  'sprint11dFixedAuditBasis','structured_internal_reaudit',
  'sprint11dIntendedPurpose',case when right(i.code,3) in ('I01','I02','I03','I04') then 'practice' else 'mastery_check' end,
  'smeValidation','pending'
),
validation_state='provisional_no_sme_review',
updated_at=now()
from public.skills s
where i.skill_id=s.id
  and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select i.id,i.version_no,null,true,'[]'::jsonb,'["independent_physics_sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','fixed_anchor_reaudit','answerSemanticsChanged',false,'humanSmeReview',false)
from public.items i
where i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
select i.id,i.version_no,null,'content','approved',
       'Sprint 11D structured internal re-audit of existing fixed anchor metadata only; answer semantics unchanged. This is not independent Physics SME validation.'
from public.items i
where i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

update public.items
set review_status='approved',
    status='published'::public.content_status,
    validation_state='provisional_no_sme_review',
    last_reviewed_at=now(),
    updated_at=now()
where code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

-- Skill-level misconception mapping for all fixed anchors.
insert into public.item_misconception_mappings(item_id,misconception_id,response_key,mapping_note)
select i.id,m.id,'*','Sprint 11D skill-level misconception mapping; response-specific refinement remains pending.'
from public.items i
join public.skills s on s.id=i.skill_id
join public.misconceptions m on m.skill_id=s.id and m.status='active'
where i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$'
on conflict (item_id,misconception_id,response_key) do update
set mapping_note=excluded.mapping_note;

-- 2. Normalize the recovered authored catalogue. These remain review-only.
update public.items i
set variant_seed=null,
    variant_parameters=jsonb_build_object(
      'authoredCatalog',true,
      'bucket',i.config->>'sprint11dBucket',
      'sequence',nullif(i.config->>'sprint11dBucketSeq','')::integer
    ),
    config=jsonb_set(i.config,'{pilot_ready}','false'::jsonb,true)
      || jsonb_build_object(
        'bank','PHY7-U01-11D-CANDIDATE',
        'phase','11D',
        'technicalQaStatus','pending',
        'humanReviewStatus','pending',
        'smeValidation','pending',
        'authoredParallel',true
      ),
    validation_state='provisional_no_sme_review',
    review_status='needs_review',
    status='review'::public.content_status,
    updated_at=now()
from public.item_templates t
where i.item_template_id=t.id
  and i.config->>'phase'='11D'
  and t.generation_config->>'generationMode'='authored_parallel_catalog'
  and i.retired_at is null;

-- Skill-level misconception mapping for recovered authored candidates.
insert into public.item_misconception_mappings(item_id,misconception_id,response_key,mapping_note)
select i.id,m.id,'*','Sprint 11D candidate skill-level mapping; response-specific refinement remains pending human content review.'
from public.items i
join public.skills s on s.id=i.skill_id
join public.misconceptions m on m.skill_id=s.id and m.status='active'
where i.config->>'phase'='11D' and i.retired_at is null
on conflict (item_id,misconception_id,response_key) do update
set mapping_note=excluded.mapping_note;

-- Structural QA for authored candidates. This is not human content approval.
with authored as (
  select i.id,i.version_no,i.item_type,i.item_family,k.answer,k.tolerance,
         count(o.*) option_count,
         bool_or(o.option_key=trim(both '"' from k.answer::text)) answer_in_options
  from public.items i
  join public.item_answer_keys k on k.item_id=i.id
  left join public.item_options o on o.item_id=i.id
  where i.config->>'phase'='11D'
    and i.variant_seed is null
    and i.retired_at is null
  group by i.id,i.version_no,i.item_type,i.item_family,k.answer,k.tolerance
), checks as (
  select *,
    item_family<>'unspecified'
    and answer is not null
    and (item_type<>'single_choice'::public.item_type or (option_count>0 and coalesce(answer_in_options,false)))
    and (item_type not in ('numeric'::public.item_type,'quantity'::public.item_type) or tolerance is not null) as passed
  from authored
)
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select id,version_no,null,passed,
       case when passed then '[]'::jsonb else '["authored_structural_qa_failed"]'::jsonb end,
       '["human_content_review_pending","independent_physics_sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','authored_structural_qa','humanContentReview',false,'humanSmeReview',false)
from checks;

with latest as (
  select distinct on (q.item_id) q.item_id,q.passed
  from public.item_qa_runs q
  join public.items i on i.id=q.item_id
  where i.config->>'phase'='11D' and q.details->>'phase'='11D'
  order by q.item_id,q.created_at desc
)
update public.items i
set config=i.config || jsonb_build_object(
      'technicalQaStatus',case when latest.passed then 'passed' else 'failed' end,
      'humanReviewStatus','pending',
      'pilot_ready',false
    ),
    review_status='needs_review',
    status='review'::public.content_status,
    validation_state='provisional_no_sme_review',
    updated_at=now()
from latest
where i.id=latest.item_id;

-- 3. Activation guard: no Sprint 11D candidate can be enabled before both
-- technical QA and a real human content review are recorded.
create or replace function private.validate_sprint_11d_candidate_activation()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_item record;
  v_pool record;
begin
  if new.enabled is not true then return new; end if;

  select i.status,i.review_status,i.retired_at,i.config into v_item
  from public.items i where i.id=new.item_id;

  if v_item.config->>'phase' is distinct from '11D' then return new; end if;

  select p.code,p.purpose,p.is_protected into v_pool
  from public.assessment_pools p where p.id=new.pool_id;

  if v_pool.code not in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A') then
    raise exception '11D_candidate_wrong_pool';
  end if;
  if v_item.config->>'sprint11dBucket' is distinct from v_pool.purpose then
    raise exception '11D_candidate_purpose_mismatch';
  end if;
  if coalesce((v_item.config->>'pilot_ready')::boolean,false) is not true
     or v_item.config->>'technicalQaStatus' is distinct from 'passed'
     or v_item.config->>'humanReviewStatus' is distinct from 'approved'
     or v_item.status<>'published'::public.content_status
     or v_item.review_status<>'approved'
     or v_item.retired_at is not null then
    raise exception '11D_candidate_activation_gate_not_satisfied';
  end if;
  if v_pool.purpose='mastery_check' and v_pool.is_protected is not true then
    raise exception '11D_mastery_candidate_requires_protected_pool';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_sprint_11d_candidate_activation on public.assessment_pool_items;
create trigger trg_validate_sprint_11d_candidate_activation
before insert or update on public.assessment_pool_items
for each row execute function private.validate_sprint_11d_candidate_activation();

-- 4. Hard assertions for the fixed-bank audit and recovered candidate safety.
do $$
declare r record; v_bad integer;
begin
  for r in
    select s.code skill_code,
           count(*) n,
           count(*) filter(where i.item_family='unspecified') unspecified,
           count(*) filter(where i.status<>'published'::public.content_status or i.review_status<>'approved') not_ready
    from public.skills s
    join public.items i on i.skill_id=s.id
    where s.code like 'PHY7-U01-S%'
      and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$'
    group by s.code
  loop
    if r.n<>6 or r.unspecified<>0 or r.not_ready<>0 then
      raise exception '11D_fixed_anchor_audit_failed:% n% unspecified% not_ready%',r.skill_code,r.n,r.unspecified,r.not_ready;
    end if;
  end loop;

  if (select count(*) from public.items where code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$')<>60 then
    raise exception '11D_fixed_anchor_total_not_60';
  end if;

  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and (coalesce((i.config->>'pilot_ready')::boolean,false)=true
         or i.config->>'humanReviewStatus'<>'pending'
         or i.status<>'review'::public.content_status
         or i.review_status<>'needs_review');
  if v_bad<>0 then raise exception '11D_recovered_candidate_state_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and not exists(select 1 from public.item_misconception_mappings mm where mm.item_id=i.id);
  if v_bad<>0 then raise exception '11D_recovered_candidate_mapping_missing:%',v_bad; end if;
end $$;
