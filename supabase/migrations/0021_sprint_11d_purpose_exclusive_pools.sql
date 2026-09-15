-- Sprint 11D — rebuild Grade 7 Physics Chapter I assessment pools around the
-- reviewed 24-variant-per-skill bank produced by 0017 + 0020.
-- Target per skill: 12 Practice + 4 Diagnostic + 8 protected Mastery = 24.

-- Record the final 11D capacity contract on the pools themselves.
update public.assessment_pools
set metadata=metadata || case purpose
  when 'practice' then jsonb_build_object('phase','11D','targetPerSkill',12,'purposeExclusive',true,'reviewGate','approved_internal_sme_pending')
  when 'diagnostic' then jsonb_build_object('phase','11D','targetPerSkill',4,'purposeExclusive',true,'forms',2,'itemsPerSkillPerForm',2,'reviewGate','approved_internal_sme_pending')
  when 'mastery_check' then jsonb_build_object('phase','11D','targetPerSkill',8,'purposeExclusive',true,'protected',true,'reviewGate','approved_internal_sme_pending')
end,
updated_at=now()
where code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A');

-- Clear only Chapter I memberships in the three active baseline pools.
delete from public.assessment_pool_items api
using public.assessment_pools p,public.items i,public.skills s
where api.pool_id=p.id and api.item_id=i.id and i.skill_id=s.id
  and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
  and s.code like 'PHY7-U01-S%';

-- Four original fixed anchors per skill stay in Practice only.
insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object('phase','11D','role','practice_anchor','source','original_60_reaudit')
from public.assessment_pools p
join public.items i on i.code ~ '^PHY7-U01-S[0-9]{2}-I0[1-4]$'
join public.skills s on s.id=i.skill_id
where p.code='PHY7-U01-PRACTICE-BASELINE'
  and s.code like 'PHY7-U01-S%'
  and i.status='published'::public.content_status and i.review_status='approved' and i.retired_at is null
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

-- Two original fixed anchors per skill stay protected in Mastery only.
insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object('phase','11D','role','mastery_anchor','source','original_60_reaudit','protected',true)
from public.assessment_pools p
join public.items i on i.code ~ '^PHY7-U01-S[0-9]{2}-I0[5-6]$'
join public.skills s on s.id=i.skill_id
where p.code='PHY7-U01-MASTERY-PROTECTED-A'
  and s.code like 'PHY7-U01-S%'
  and i.status='published'::public.content_status and i.review_status='approved' and i.retired_at is null
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

-- 18 new variants per skill are deliberately purpose-tagged as 8 Practice, 4 Diagnostic, 6 Mastery.
insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object(
  'phase','11D','role',i.config->>'sprint11dBucket',
  'bucketSeq',(i.config->>'sprint11dBucketSeq')::integer,
  'generated',i.variant_seed is not null,
  'protected',(i.config->>'sprint11dBucket')='mastery_check'
)
from public.items i
join public.skills s on s.id=i.skill_id
join public.assessment_pools p on p.code=case i.config->>'sprint11dBucket'
  when 'practice' then 'PHY7-U01-PRACTICE-BASELINE'
  when 'diagnostic' then 'PHY7-U01-DIAGNOSTIC-BASELINE'
  when 'mastery_check' then 'PHY7-U01-MASTERY-PROTECTED-A'
end
where s.code like 'PHY7-U01-S%'
  and i.config->>'phase'='11D'
  and i.config ? 'sprint11dBucket'
  and i.status='published'::public.content_status
  and i.review_status='approved'
  and i.retired_at is null
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

-- Preserve Diagnostic v1 as historical evidence; only v2 remains active.
update public.assessment_forms f
set status='retired',updated_at=now()
from public.assessment_pools p
where f.pool_id=p.id and p.code='PHY7-U01-DIAGNOSTIC-BASELINE' and f.status='active';

insert into public.assessment_forms(pool_id,code,name,form_version,status,metadata)
select p.id,v.code,v.name,2,'active',jsonb_build_object(
  'phase','11D','unitCode','PHY7-U01','itemsPerSkill',2,
  'purposeExclusiveDiagnosticPool',true,
  'provisionalParallelism',true,
  'contentValidation','structured_internal_review_complete_sme_pending'
)
from public.assessment_pools p
cross join (values
  ('PHY7-U01-DIAG-A','Grade 7 Physics Chapter I — Diagnostic Form A'),
  ('PHY7-U01-DIAG-B','Grade 7 Physics Chapter I — Diagnostic Form B')
) v(code,name)
where p.code='PHY7-U01-DIAGNOSTIC-BASELINE'
on conflict (pool_id,code,form_version) do update
set name=excluded.name,status='active',metadata=excluded.metadata,updated_at=now();

delete from public.assessment_form_items afi
using public.assessment_forms f,public.assessment_pools p
where afi.form_id=f.id and f.pool_id=p.id
  and p.code='PHY7-U01-DIAGNOSTIC-BASELINE' and f.form_version=2;

with diag as (
  select api.item_id,i.skill_id,s.code skill_code,
         row_number() over(
           partition by i.skill_id
           order by (i.config->>'sprint11dBucketSeq')::integer,i.code
         ) rn
  from public.assessment_pool_items api
  join public.assessment_pools p on p.id=api.pool_id
  join public.items i on i.id=api.item_id
  join public.skills s on s.id=i.skill_id
  where p.code='PHY7-U01-DIAGNOSTIC-BASELINE'
    and api.enabled=true
    and i.status='published'::public.content_status
    and i.review_status='approved'
    and i.retired_at is null
), form_rows as (
  select 'PHY7-U01-DIAG-A'::text form_code,item_id,skill_code,rn from diag where rn in (1,2)
  union all
  select 'PHY7-U01-DIAG-B'::text form_code,item_id,skill_code,rn from diag where rn in (3,4)
), numbered as (
  select form_code,item_id,row_number() over(partition by form_code order by skill_code,rn) slot_order
  from form_rows
)
insert into public.assessment_form_items(form_id,item_id,slot_order,metadata)
select f.id,n.item_id,n.slot_order,jsonb_build_object('phase','11D','source','purpose_exclusive_diagnostic_v2')
from numbered n
join public.assessment_forms f on f.code=n.form_code and f.form_version=2 and f.status='active';

-- ---------------------------------------------------------------------------
-- Database guard: a Chapter I item cannot be enabled in more than one purpose
-- pool, and only reviewed/published/pilot-ready items can enter those pools.
-- ---------------------------------------------------------------------------
create or replace function private.validate_phy7_u01_pool_eligibility()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_pool record;
  v_item record;
begin
  select code,purpose,is_protected into v_pool from public.assessment_pools where id=new.pool_id;
  if v_pool.code not in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A') then
    return new;
  end if;
  if new.enabled is not true then return new; end if;

  select status,review_status,retired_at,item_family,config into v_item
  from public.items where id=new.item_id;
  if v_item.status<>'published'::public.content_status
     or v_item.review_status<>'approved'
     or v_item.retired_at is not null
     or v_item.item_family='unspecified'
     or coalesce((v_item.config->>'pilot_ready')::boolean,false) is not true then
    raise exception 'chapter1_pool_item_not_eligible';
  end if;

  if v_pool.purpose='mastery_check' and v_pool.is_protected is not true then
    raise exception 'chapter1_mastery_pool_must_be_protected';
  end if;

  if exists(
    select 1
    from public.assessment_pool_items other
    join public.assessment_pools op on op.id=other.pool_id
    where other.item_id=new.item_id and other.enabled=true and other.pool_id<>new.pool_id
      and op.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
  ) then
    raise exception 'chapter1_item_already_enabled_in_other_purpose_pool';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_phy7_u01_pool_eligibility on public.assessment_pool_items;
create trigger trg_validate_phy7_u01_pool_eligibility
before insert or update on public.assessment_pool_items
for each row execute function private.validate_phy7_u01_pool_eligibility();

-- ---------------------------------------------------------------------------
-- Hard acceptance checks.
-- ---------------------------------------------------------------------------
do $$
declare r record; v_overlap integer; v_form_overlap integer; v_bad integer;
begin
  for r in
    with counts as (
      select s.code skill_code,p.purpose,count(*) n
      from public.skills s
      join public.items i on i.skill_id=s.id
      join public.assessment_pool_items api on api.item_id=i.id and api.enabled=true
      join public.assessment_pools p on p.id=api.pool_id
      where s.code like 'PHY7-U01-S%'
        and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
        and i.status='published'::public.content_status and i.review_status='approved' and i.retired_at is null
      group by s.code,p.purpose
    )
    select skill_code,
      coalesce(max(n) filter(where purpose='practice'),0) practice,
      coalesce(max(n) filter(where purpose='diagnostic'),0) diagnostic,
      coalesce(max(n) filter(where purpose='mastery_check'),0) mastery
    from counts group by skill_code order by skill_code
  loop
    if r.practice<>12 or r.diagnostic<>4 or r.mastery<>8 then
      raise exception '11D_pool_target_failed:% P% D% M%',r.skill_code,r.practice,r.diagnostic,r.mastery;
    end if;
  end loop;

  select count(*) into v_overlap from (
    select api.item_id
    from public.assessment_pool_items api
    join public.assessment_pools p on p.id=api.pool_id
    where p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
      and api.enabled=true
    group by api.item_id having count(*)>1
  ) x;
  if v_overlap<>0 then raise exception '11D_cross_pool_overlap:%',v_overlap; end if;

  select count(*) into v_bad
  from public.assessment_pool_items api
  join public.assessment_pools p on p.id=api.pool_id
  join public.items i on i.id=api.item_id
  where p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
    and api.enabled=true
    and (i.item_family='unspecified' or i.review_status<>'approved' or i.status<>'published'::public.content_status
         or i.retired_at is not null or coalesce((i.config->>'pilot_ready')::boolean,false) is not true);
  if v_bad<>0 then raise exception '11D_ineligible_pool_members:%',v_bad; end if;

  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.form_version=2 and f.status='active' and f.code='PHY7-U01-DIAG-A')<>20 then raise exception '11D_diag_A_not_20'; end if;
  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.form_version=2 and f.status='active' and f.code='PHY7-U01-DIAG-B')<>20 then raise exception '11D_diag_B_not_20'; end if;

  if exists(
    select s.code,f.code,count(*)
    from public.assessment_form_items afi
    join public.assessment_forms f on f.id=afi.form_id and f.form_version=2 and f.status='active'
    join public.items i on i.id=afi.item_id
    join public.skills s on s.id=i.skill_id
    where f.code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B')
    group by s.code,f.code having count(*)<>2
  ) then raise exception '11D_diagnostic_skill_distribution_invalid'; end if;

  select count(*) into v_form_overlap
  from public.assessment_form_items a
  join public.assessment_forms fa on fa.id=a.form_id and fa.code='PHY7-U01-DIAG-A' and fa.form_version=2 and fa.status='active'
  join public.assessment_form_items b on b.item_id=a.item_id
  join public.assessment_forms fb on fb.id=b.form_id and fb.code='PHY7-U01-DIAG-B' and fb.form_version=2 and fb.status='active';
  if v_form_overlap<>0 then raise exception '11D_diagnostic_form_overlap:%',v_form_overlap; end if;
end $$;
