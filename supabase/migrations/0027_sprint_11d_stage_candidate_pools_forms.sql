-- Sprint 11D — stage the completed 240-variant Chapter I bank without activating
-- any new candidate. Existing learner-facing 11A/11B pools remain unchanged.

-- Stage exactly one disabled purpose membership for every new 11D candidate.
insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,false,jsonb_build_object(
  'phase','11D','candidate',true,
  'intendedPurpose',i.config->>'sprint11dBucket',
  'bucketSeq',(i.config->>'sprint11dBucketSeq')::integer,
  'activationGate','human_content_review_required'
)
from public.items i
join public.assessment_pools p
  on p.code=case i.config->>'sprint11dBucket'
    when 'practice' then 'PHY7-U01-PRACTICE-BASELINE'
    when 'diagnostic' then 'PHY7-U01-DIAGNOSTIC-BASELINE'
    when 'mastery_check' then 'PHY7-U01-MASTERY-PROTECTED-A'
  end
where i.config->>'phase'='11D' and i.retired_at is null
on conflict (pool_id,item_id) do update
set enabled=false,metadata=excluded.metadata;

-- Draft forms are allowed to reference explicitly staged disabled 11D candidate
-- memberships. Active forms still require enabled parent-pool membership.
create or replace function private.validate_assessment_form_item_membership()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_pool_id uuid;
  v_form_status text;
begin
  select pool_id,status into v_pool_id,v_form_status
  from public.assessment_forms where id=new.form_id;
  if v_pool_id is null then raise exception 'assessment_form_not_found'; end if;

  if v_form_status='draft' then
    if not exists(
      select 1 from public.assessment_pool_items api
      where api.pool_id=v_pool_id and api.item_id=new.item_id
        and (api.enabled=true or (api.enabled=false and api.metadata->>'phase'='11D' and coalesce((api.metadata->>'candidate')::boolean,false)=true))
    ) then
      raise exception 'draft_assessment_form_item_not_staged_in_parent_pool';
    end if;
  else
    if not exists(
      select 1 from public.assessment_pool_items api
      where api.pool_id=v_pool_id and api.item_id=new.item_id and api.enabled=true
    ) then
      raise exception 'assessment_form_item_not_in_parent_pool';
    end if;
  end if;
  return new;
end;
$$;

-- Draft Diagnostic v2 forms. They are deliberately not active until human review.
insert into public.assessment_forms(pool_id,code,name,form_version,status,metadata)
select p.id,v.code,v.name,2,'draft',jsonb_build_object(
  'phase','11D','unitCode','PHY7-U01','itemsPerSkill',2,
  'candidateForm',true,'activationGate','human_content_review_required',
  'provisionalParallelism',true
)
from public.assessment_pools p
cross join (values
  ('PHY7-U01-DIAG-A','Grade 7 Physics Chapter I — Diagnostic Form A'),
  ('PHY7-U01-DIAG-B','Grade 7 Physics Chapter I — Diagnostic Form B')
) v(code,name)
where p.code='PHY7-U01-DIAGNOSTIC-BASELINE'
on conflict (pool_id,code,form_version) do update
set name=excluded.name,status='draft',metadata=excluded.metadata,updated_at=now();

delete from public.assessment_form_items afi
using public.assessment_forms f
where afi.form_id=f.id and f.form_version=2
  and f.code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B');

with diag as (
  select i.id item_id,s.code skill_code,(i.config->>'sprint11dBucketSeq')::integer seq
  from public.items i
  join public.skills s on s.id=i.skill_id
  where i.config->>'phase'='11D'
    and i.config->>'sprint11dBucket'='diagnostic'
    and i.retired_at is null
), rows as (
  select 'PHY7-U01-DIAG-A' form_code,item_id,skill_code,seq from diag where seq in (1,2)
  union all
  select 'PHY7-U01-DIAG-B' form_code,item_id,skill_code,seq from diag where seq in (3,4)
), numbered as (
  select form_code,item_id,row_number() over(partition by form_code order by skill_code,seq) slot_order
  from rows
)
insert into public.assessment_form_items(form_id,item_id,slot_order,metadata)
select f.id,n.item_id,n.slot_order,jsonb_build_object('phase','11D','candidate',true,'humanReviewRequired',true)
from numbered n
join public.assessment_forms f on f.code=n.form_code and f.form_version=2 and f.status='draft';

-- Hard staging assertions.
do $$
declare r record; v_bad integer; v_overlap integer;
begin
  -- One disabled intended-purpose membership for each of the 180 new candidates.
  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and (
      select count(*)
      from public.assessment_pool_items api
      join public.assessment_pools p on p.id=api.pool_id
      where api.item_id=i.id
        and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
        and api.enabled=false and api.metadata->>'phase'='11D'
    )<>1;
  if v_bad<>0 then raise exception '11D_candidate_staged_membership_invalid:%',v_bad; end if;

  -- No 11D candidate may be learner-visible yet.
  select count(*) into v_bad
  from public.items i
  join public.assessment_pool_items api on api.item_id=i.id and api.enabled=true
  where i.config->>'phase'='11D' and i.retired_at is null;
  if v_bad<>0 then raise exception '11D_candidate_enabled_too_early:%',v_bad; end if;

  -- Existing production pools remain on the known-safe baseline.
  for r in
    select p.code,count(*) filter(where api.enabled) n
    from public.assessment_pools p
    left join public.assessment_pool_items api on api.pool_id=p.id
    where p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
    group by p.code
  loop
    if (r.code='PHY7-U01-PRACTICE-BASELINE' and r.n<>40)
       or (r.code='PHY7-U01-DIAGNOSTIC-BASELINE' and r.n<>40)
       or (r.code='PHY7-U01-MASTERY-PROTECTED-A' and r.n<>20) then
      raise exception '11D_baseline_pool_changed:%:%',r.code,r.n;
    end if;
  end loop;

  -- Diagnostic v2 candidate forms: 20 each, 2/skill, zero exact overlap.
  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.code='PHY7-U01-DIAG-A' and f.form_version=2 and f.status='draft')<>20 then
    raise exception '11D_draft_diag_A_not_20';
  end if;
  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.code='PHY7-U01-DIAG-B' and f.form_version=2 and f.status='draft')<>20 then
    raise exception '11D_draft_diag_B_not_20';
  end if;

  if exists(
    select s.code,f.code,count(*)
    from public.assessment_form_items afi
    join public.assessment_forms f on f.id=afi.form_id and f.form_version=2 and f.status='draft'
    join public.items i on i.id=afi.item_id
    join public.skills s on s.id=i.skill_id
    where f.code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B')
    group by s.code,f.code having count(*)<>2
  ) then raise exception '11D_draft_diagnostic_skill_distribution_invalid'; end if;

  select count(*) into v_overlap
  from public.assessment_form_items a
  join public.assessment_forms fa on fa.id=a.form_id and fa.code='PHY7-U01-DIAG-A' and fa.form_version=2 and fa.status='draft'
  join public.assessment_form_items b on b.item_id=a.item_id
  join public.assessment_forms fb on fb.id=b.form_id and fb.code='PHY7-U01-DIAG-B' and fb.form_version=2 and fb.status='draft';
  if v_overlap<>0 then raise exception '11D_draft_diagnostic_overlap:%',v_overlap; end if;
end $$;
