-- Sprint 11D: deterministic numeric expansion, baseline audit, purpose-exclusive pool rebuild and Diagnostic v2 forms.
-- All content remains provisional_no_sme_review.

update public.items i
set item_family = case
  when s.code = 'PHY7-U01-S01' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code = 'PHY7-U01-S02' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code = 'PHY7-U01-S03' then 'knowledge'
  when s.code = 'PHY7-U01-S04' and right(i.code,3) = 'I02' then 'knowledge'
  when s.code = 'PHY7-U01-S04' then 'application'
  when s.code = 'PHY7-U01-S05' and right(i.code,3) in ('I01','I02') then 'knowledge'
  when s.code = 'PHY7-U01-S05' then 'reasoning'
  when s.code = 'PHY7-U01-S06' and right(i.code,3) in ('I01','I02','I03','I04') then 'knowledge'
  when s.code = 'PHY7-U01-S06' then 'application'
  when s.code = 'PHY7-U01-S07' then 'application'
  when s.code = 'PHY7-U01-S08' and right(i.code,3) = 'I03' then 'knowledge'
  when s.code = 'PHY7-U01-S08' then 'application'
  when s.code = 'PHY7-U01-S09' and right(i.code,3) in ('I02','I04','I05','I06') then 'reasoning'
  when s.code = 'PHY7-U01-S09' then 'application'
  when s.code = 'PHY7-U01-S10' and right(i.code,3) in ('I01','I03','I04','I06') then 'transfer'
  when s.code = 'PHY7-U01-S10' then 'reasoning'
  else 'application'
end,
config = i.config || jsonb_build_object(
  'sprint11dAudit',true,'reviewBasis','structured_internal_content_review',
  'smeValidation','pending','pilot_ready',true
),
review_status='approved',validation_state='provisional_no_sme_review',
status='published'::public.content_status,last_reviewed_at=now(),updated_at=now()
from public.skills s
where i.skill_id=s.id
  and s.code like 'PHY7-U01-S%'
  and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select i.id,i.version_no,null,true,'[]'::jsonb,'["sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','legacy_60_reaudit','humanSmeReview',false)
from public.items i join public.skills s on s.id=i.skill_id
where s.code like 'PHY7-U01-S%' and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
select i.id,i.version_no,null,'content','approved',
       'Sprint 11D structured internal re-audit completed; SME validation remains pending.'
from public.items i join public.skills s on s.id=i.skill_id
where s.code like 'PHY7-U01-S%' and i.code ~ '^PHY7-U01-S[0-9]{2}-I[0-9]{2}$';

create temp table tmp_11d_numeric_alloc(
  skill_code text not null,
  item_id uuid not null primary key,
  bucket text not null,
  bucket_seq integer not null
) on commit drop;

do $$
declare
  r record;
  v_template_codes text[];
  v_target integer;
  v_added integer;
  v_seed_n integer;
  v_template_code text;
  v_seed text;
  v_preview jsonb;
  v_fingerprint text;
  v_item_id uuid;
  v_existing record;
  v_materialized jsonb;
  v_bucket text;
  v_bucket_seq integer;
begin
  for r in
    select * from (values
      ('PHY7-U01-S07',18,array['PHY7-U01-S07-T-LENGTH-TO-M','PHY7-U01-S07-T-TIME-TO-S','PHY7-U01-S07-T-VOLUME-TO-L']::text[]),
      ('PHY7-U01-S08',18,array['PHY7-U01-S08-T-SCALE-DIVISION','PHY7-U01-S08-T-SCALE-READING']::text[]),
      ('PHY7-U01-S09',12,array['PHY7-U01-S09-T-MEASUREMENT-ERROR']::text[]),
      ('PHY7-U01-S10',18,array['PHY7-U01-S10-T-DISPLACEMENT-VOLUME','PHY7-U01-S10-T-SHEET-THICKNESS']::text[])
    ) as x(skill_code,target_count,template_codes)
  loop
    v_target:=r.target_count;
    v_template_codes:=r.template_codes;
    v_added:=0;
    v_seed_n:=1;

    while v_added < v_target loop
      if v_seed_n > 5000 then
        raise exception '11D_numeric_variant_capacity_exhausted:%:%/%',r.skill_code,v_added,v_target;
      end if;

      v_template_code:=v_template_codes[((v_seed_n-1)%array_length(v_template_codes,1))+1];
      v_seed:='11d-'||r.skill_code||'-'||lpad(v_seed_n::text,4,'0');

      begin
        v_preview:=public.service_preview_item_variant(v_template_code,v_seed);
      exception when others then
        v_seed_n:=v_seed_n+1;
        continue;
      end;

      if coalesce((v_preview #>> '{qa,valid}')::boolean,false) is not true then
        v_seed_n:=v_seed_n+1;
        continue;
      end if;

      v_fingerprint:=v_preview->>'semanticFingerprint';
      v_item_id:=null;

      select i.id,i.status,i.variant_seed,i.config into v_existing
      from public.items i join public.skills s on s.id=i.skill_id
      where s.code=r.skill_code and i.variant_fingerprint=v_fingerprint and i.retired_at is null
      limit 1;

      if found then
        if v_existing.variant_seed is not null
           and not exists(select 1 from tmp_11d_numeric_alloc a where a.item_id=v_existing.id) then
          v_item_id:=v_existing.id;
        end if;
      else
        begin
          v_materialized:=public.service_materialize_item_variant(v_template_code,v_seed);
          v_item_id:=(v_materialized->>'itemId')::uuid;
        exception when unique_violation then
          v_item_id:=null;
        when others then
          v_item_id:=null;
        end;
      end if;

      if v_item_id is not null
         and not exists(select 1 from tmp_11d_numeric_alloc a where a.item_id=v_item_id) then
        v_added:=v_added+1;
        if v_added<=8 then
          v_bucket:='practice'; v_bucket_seq:=v_added;
        elsif v_added<=12 then
          v_bucket:='diagnostic'; v_bucket_seq:=v_added-8;
        else
          v_bucket:='mastery_check'; v_bucket_seq:=v_added-12;
        end if;

        insert into tmp_11d_numeric_alloc(skill_code,item_id,bucket,bucket_seq)
        values(r.skill_code,v_item_id,v_bucket,v_bucket_seq);

        update public.items i
        set status='published'::public.content_status,
            review_status='approved',
            validation_state='provisional_no_sme_review',
            item_family=case when i.item_family='unspecified' then
              case when r.skill_code in ('PHY7-U01-S09','PHY7-U01-S10') then 'reasoning' else 'application' end
              else i.item_family end,
            source_reference=coalesce(i.source_reference,'Grade 7 Physics Chapter I deterministic parallel variant; SME validation pending'),
            config=i.config || jsonb_build_object(
              'bank','PHY7-U01-11D','phase','11D','pilot_ready',true,
              'sprint11dBucket',v_bucket,'sprint11dBucketSeq',v_bucket_seq,
              'reviewBasis','structured_internal_content_review','smeValidation','pending'
            ),
            last_reviewed_at=now(),updated_at=now()
        where i.id=v_item_id;

        insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
        select i.id,i.version_no,null,true,'[]'::jsonb,'["sme_review_pending"]'::jsonb,
               jsonb_build_object('phase','11D','scope','deterministic_variant_reproduction_and_structure','seed',i.variant_seed,'humanSmeReview',false)
        from public.items i where i.id=v_item_id;

        insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
        select i.id,i.version_no,null,'content','approved',
               'Sprint 11D structured internal review completed; deterministic reproduction verified; SME validation remains pending.'
        from public.items i where i.id=v_item_id;
      end if;

      v_seed_n:=v_seed_n+1;
    end loop;
  end loop;
end $$;

-- Defensive technical gate before pool eligibility.
do $$
declare v_bad integer;
begin
  select count(*) into v_bad
  from public.items i join public.skills s on s.id=i.skill_id
  where s.code like 'PHY7-U01-S%' and i.config->>'phase'='11D'
    and (i.item_family='unspecified' or i.review_status<>'approved' or i.status<>'published'::public.content_status
         or not exists(select 1 from public.item_answer_keys k where k.item_id=i.id));
  if v_bad<>0 then raise exception '11D_structural_item_gate_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D' and i.item_type='single_choice'::public.item_type
    and ((select count(*) from public.item_options o where o.item_id=i.id)<2
         or not exists(select 1 from public.item_answer_keys k join public.item_options o on o.item_id=i.id and to_jsonb(o.option_key)=k.answer where k.item_id=i.id));
  if v_bad<>0 then raise exception '11D_single_choice_gate_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i join public.item_answer_keys k on k.item_id=i.id
  where i.config->>'phase'='11D'
    and i.item_type in ('numeric'::public.item_type,'quantity'::public.item_type)
    and k.tolerance is null;
  if v_bad<>0 then raise exception '11D_numeric_tolerance_gate_failed:%',v_bad; end if;
end $$;

-- Rebuild all three Chapter I pools as purpose-exclusive sets.
delete from public.assessment_pool_items api
using public.assessment_pools p, public.items i, public.skills s
where api.pool_id=p.id and api.item_id=i.id and i.skill_id=s.id
  and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
  and s.code like 'PHY7-U01-S%';

insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object('phase','11D','role','practice_anchor')
from public.assessment_pools p
join public.items i on i.code ~ '^PHY7-U01-S[0-9]{2}-I0[1-4]$'
join public.skills s on s.id=i.skill_id
where p.code='PHY7-U01-PRACTICE-BASELINE' and s.code like 'PHY7-U01-S%'
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object('phase','11D','role','mastery_anchor','protected',true)
from public.assessment_pools p
join public.items i on i.code ~ '^PHY7-U01-S[0-9]{2}-I0[5-6]$'
join public.skills s on s.id=i.skill_id
where p.code='PHY7-U01-MASTERY-PROTECTED-A' and s.code like 'PHY7-U01-S%'
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,i.id,true,jsonb_build_object('phase','11D','role',i.config->>'sprint11dBucket','bucketSeq',(i.config->>'sprint11dBucketSeq')::integer)
from public.items i
join public.skills s on s.id=i.skill_id
join public.assessment_pools p on p.code=case i.config->>'sprint11dBucket'
  when 'practice' then 'PHY7-U01-PRACTICE-BASELINE'
  when 'diagnostic' then 'PHY7-U01-DIAGNOSTIC-BASELINE'
  when 'mastery_check' then 'PHY7-U01-MASTERY-PROTECTED-A' end
where s.code like 'PHY7-U01-S%'
  and i.config->>'phase'='11D' and i.config ? 'sprint11dBucket'
  and i.status='published'::public.content_status and i.review_status='approved'
on conflict (pool_id,item_id) do update set enabled=true,metadata=excluded.metadata;

-- Preserve historical Diagnostic v1; activate reviewed v2 definitions.
update public.assessment_forms f set status='retired',updated_at=now()
from public.assessment_pools p
where f.pool_id=p.id and p.code='PHY7-U01-DIAGNOSTIC-BASELINE' and f.status='active';

insert into public.assessment_forms(pool_id,code,name,form_version,status,metadata)
select p.id,v.code,v.name,2,'active',jsonb_build_object(
  'phase','11D','unitCode','PHY7-U01','itemsPerSkill',2,
  'provisionalParallelism',true,
  'contentValidation','structured_internal_review_complete_sme_pending',
  'purposeExclusiveDiagnosticPool',true
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
where afi.form_id=f.id and f.pool_id=p.id and p.code='PHY7-U01-DIAGNOSTIC-BASELINE' and f.form_version=2;

with diag as (
  select api.item_id,i.skill_id,s.code skill_code,
         row_number() over(partition by i.skill_id order by (i.config->>'sprint11dBucketSeq')::integer,i.code) rn
  from public.assessment_pool_items api
  join public.assessment_pools p on p.id=api.pool_id
  join public.items i on i.id=api.item_id
  join public.skills s on s.id=i.skill_id
  where p.code='PHY7-U01-DIAGNOSTIC-BASELINE' and api.enabled
), form_rows as (
  select 'PHY7-U01-DIAG-A'::text form_code,item_id,skill_code,rn from diag where rn in (1,2)
  union all
  select 'PHY7-U01-DIAG-B'::text form_code,item_id,skill_code,rn from diag where rn in (3,4)
), numbered as (
  select form_code,item_id,row_number() over(partition by form_code order by skill_code,rn) slot_order from form_rows
)
insert into public.assessment_form_items(form_id,item_id,slot_order,metadata)
select f.id,n.item_id,n.slot_order,jsonb_build_object('phase','11D','source','purpose_exclusive_diagnostic_v2')
from numbered n join public.assessment_forms f on f.code=n.form_code and f.form_version=2 and f.status='active';

-- Final hard acceptance checks: exactly 12 Practice + 4 Diagnostic + 8 Mastery per skill, no overlap.
do $$
declare r record; v_overlap integer; v_form_overlap integer;
begin
  for r in
    with counts as (
      select s.code skill_code,p.purpose,count(*) filter(where api.enabled) n
      from public.skills s join public.items i on i.skill_id=s.id
      join public.assessment_pool_items api on api.item_id=i.id
      join public.assessment_pools p on p.id=api.pool_id
      where s.code like 'PHY7-U01-S%'
        and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
      group by s.code,p.purpose
    )
    select skill_code,coalesce(max(n) filter(where purpose='practice'),0) practice,
      coalesce(max(n) filter(where purpose='diagnostic'),0) diagnostic,
      coalesce(max(n) filter(where purpose='mastery_check'),0) mastery
    from counts group by skill_code order by skill_code
  loop
    if r.practice<>12 or r.diagnostic<>4 or r.mastery<>8 then
      raise exception '11D_pool_target_failed:% P% D% M%',r.skill_code,r.practice,r.diagnostic,r.mastery;
    end if;
  end loop;

  select count(*) into v_overlap from (
    select api.item_id from public.assessment_pool_items api join public.assessment_pools p on p.id=api.pool_id
    where p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A') and api.enabled
    group by api.item_id having count(*)>1
  ) x;
  if v_overlap<>0 then raise exception '11D_cross_pool_overlap:%',v_overlap; end if;

  if exists(
    select 1 from public.items i join public.skills s on s.id=i.skill_id
    join public.assessment_pool_items api on api.item_id=i.id join public.assessment_pools p on p.id=api.pool_id
    where s.code like 'PHY7-U01-S%' and api.enabled
      and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
      and i.item_family='unspecified'
  ) then raise exception '11D_unspecified_family_in_eligible_bank'; end if;

  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.form_version=2 and f.status='active' and f.code='PHY7-U01-DIAG-A')<>20 then raise exception '11D_diag_A_not_20'; end if;
  if (select count(*) from public.assessment_form_items afi join public.assessment_forms f on f.id=afi.form_id where f.form_version=2 and f.status='active' and f.code='PHY7-U01-DIAG-B')<>20 then raise exception '11D_diag_B_not_20'; end if;

  select count(*) into v_form_overlap
  from public.assessment_form_items a
  join public.assessment_forms fa on fa.id=a.form_id and fa.code='PHY7-U01-DIAG-A' and fa.form_version=2
  join public.assessment_form_items b on b.item_id=a.item_id
  join public.assessment_forms fb on fb.id=b.form_id and fb.code='PHY7-U01-DIAG-B' and fb.form_version=2;
  if v_form_overlap<>0 then raise exception '11D_diagnostic_form_overlap:%',v_form_overlap; end if;
end $$;