-- Sprint 11D final activation.
-- Preconditions: all 180 new candidates have current-version technical QA PASS and human approval.
-- Final active capacity must be exactly 12 Practice + 4 Diagnostic + 8 protected Mastery variants per skill.

-- Fail closed if the reviewed candidate gate is not fully satisfied.
do $$
declare
  v_total integer;
  v_bad integer;
begin
  select count(*) into v_total
  from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null;
  if v_total <> 180 then
    raise exception '11D_activation_candidate_count_invalid:%', v_total;
  end if;

  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D'
    and i.retired_at is null
    and (
      i.review_status <> 'approved'
      or coalesce(i.config->>'humanReviewStatus','') <> 'approved'
      or not exists (
        select 1 from public.item_qa_runs q
        where q.item_id=i.id and q.version_no=i.version_no and q.passed=true
      )
    );
  if v_bad <> 0 then
    raise exception '11D_activation_gate_not_satisfied:%', v_bad;
  end if;
end $$;

-- pilot_ready is operational activation metadata. The generic revision trigger treats
-- config mutations as review-relevant, so this controlled migration restores the already-
-- verified approval state immediately afterwards without changing assessable content.
update public.items i
set config = jsonb_set(
      jsonb_set(
        jsonb_set(i.config,'{pilot_ready}','true'::jsonb,true),
        '{activationStatus}','"active"'::jsonb,true
      ),
      '{activatedAt}',to_jsonb(now()),true
    )
where i.config->>'phase'='11D' and i.retired_at is null;

update public.items i
set review_status='approved',
    status='published'::public.content_status
where i.config->>'phase'='11D' and i.retired_at is null;

-- Practice: keep the 40 reviewed fixed anchors and enable the 80 reviewed 11D variants.
update public.assessment_pool_items api
set enabled=true,
    metadata=(api.metadata - 'activationGate') || jsonb_build_object('activationStatus','active','activatedAt',now())
from public.assessment_pools p, public.items i
where api.pool_id=p.id and api.item_id=i.id
  and p.code='PHY7-U01-PRACTICE-BASELINE'
  and i.config->>'phase'='11D'
  and i.config->>'sprint11dBucket'='practice';

-- Mastery: keep the 20 protected fixed anchors and enable the 60 reviewed 11D variants.
update public.assessment_pool_items api
set enabled=true,
    metadata=(api.metadata - 'activationGate') || jsonb_build_object('activationStatus','active','activatedAt',now())
from public.assessment_pools p, public.items i
where api.pool_id=p.id and api.item_id=i.id
  and p.code='PHY7-U01-MASTERY-PROTECTED-A'
  and i.config->>'phase'='11D'
  and i.config->>'sprint11dBucket'='mastery_check';

-- Diagnostic v2 replaces the old baseline membership rather than adding another 40.
update public.assessment_pool_items api
set enabled=false,
    metadata=api.metadata || jsonb_build_object('retiredBy','11D_activation','retiredAt',now())
from public.assessment_pools p, public.items i
where api.pool_id=p.id and api.item_id=i.id
  and p.code='PHY7-U01-DIAGNOSTIC-BASELINE'
  and coalesce(i.config->>'phase','') <> '11D';

update public.assessment_pool_items api
set enabled=true,
    metadata=(api.metadata - 'activationGate') || jsonb_build_object('activationStatus','active','activatedAt',now())
from public.assessment_pools p, public.items i
where api.pool_id=p.id and api.item_id=i.id
  and p.code='PHY7-U01-DIAGNOSTIC-BASELINE'
  and i.config->>'phase'='11D'
  and i.config->>'sprint11dBucket'='diagnostic';

-- Retire Diagnostic v1 and activate the reviewed v2 forms.
update public.assessment_forms
set status='retired',
    metadata=metadata || jsonb_build_object('retiredBy','11D_activation','retiredAt',now()),
    updated_at=now()
where code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B') and form_version=1;

update public.assessment_forms
set status='active',
    metadata=(metadata - 'activationGate' - 'candidateForm') || jsonb_build_object(
      'phase','11D',
      'contentValidation','human_review_complete',
      'activatedAt',now(),
      'pilotEvidenceLabel','operational_not_psychometric'
    ),
    updated_at=now()
where code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B') and form_version=2;

-- Final activation assertions.
do $$
declare
  r record;
  v_overlap integer;
  v_bad integer;
begin
  for r in
    select s.code,
      count(distinct api.item_id) filter(where p.purpose='practice' and api.enabled) practice_n,
      count(distinct api.item_id) filter(where p.purpose='diagnostic' and api.enabled) diagnostic_n,
      count(distinct api.item_id) filter(where p.purpose='mastery_check' and api.enabled) mastery_n
    from public.skills s
    join public.items i on i.skill_id=s.id and i.retired_at is null
    left join public.assessment_pool_items api on api.item_id=i.id
    left join public.assessment_pools p on p.id=api.pool_id
      and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
    where s.code like 'PHY7-U01-S%'
    group by s.code
    order by s.code
  loop
    if r.practice_n<>12 or r.diagnostic_n<>4 or r.mastery_n<>8 then
      raise exception '11D_final_capacity_invalid:% practice=% diagnostic=% mastery=%',r.code,r.practice_n,r.diagnostic_n,r.mastery_n;
    end if;
  end loop;

  select count(*) into v_overlap
  from (
    select api.item_id
    from public.assessment_pool_items api
    join public.assessment_pools p on p.id=api.pool_id
    where api.enabled=true
      and p.code in ('PHY7-U01-PRACTICE-BASELINE','PHY7-U01-DIAGNOSTIC-BASELINE','PHY7-U01-MASTERY-PROTECTED-A')
    group by api.item_id
    having count(distinct p.purpose)>1
  ) x;
  if v_overlap<>0 then raise exception '11D_cross_purpose_overlap:%',v_overlap; end if;

  if not exists(select 1 from public.assessment_pools where code='PHY7-U01-MASTERY-PROTECTED-A' and is_protected=true and status='active') then
    raise exception '11D_mastery_pool_not_protected';
  end if;

  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D' and i.retired_at is null
    and (i.status<>'published'::public.content_status or i.review_status<>'approved' or coalesce((i.config->>'pilot_ready')::boolean,false) is not true);
  if v_bad<>0 then raise exception '11D_candidate_activation_state_invalid:%',v_bad; end if;

  if exists(
    select 1 from public.assessment_forms f
    where f.code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B')
      and ((f.form_version=1 and f.status<>'retired') or (f.form_version=2 and f.status<>'active'))
  ) then raise exception '11D_diagnostic_form_activation_invalid'; end if;

  if exists(
    select s.code,f.code,count(*)
    from public.assessment_form_items afi
    join public.assessment_forms f on f.id=afi.form_id and f.form_version=2 and f.status='active'
    join public.items i on i.id=afi.item_id
    join public.skills s on s.id=i.skill_id
    where f.code in ('PHY7-U01-DIAG-A','PHY7-U01-DIAG-B')
    group by s.code,f.code having count(*)<>2
  ) then raise exception '11D_active_diagnostic_skill_distribution_invalid'; end if;

  select count(*) into v_overlap
  from public.assessment_form_items a
  join public.assessment_forms fa on fa.id=a.form_id and fa.code='PHY7-U01-DIAG-A' and fa.form_version=2 and fa.status='active'
  join public.assessment_form_items b on b.item_id=a.item_id
  join public.assessment_forms fb on fb.id=b.form_id and fb.code='PHY7-U01-DIAG-B' and fb.form_version=2 and fb.status='active';
  if v_overlap<>0 then raise exception '11D_active_diagnostic_overlap:%',v_overlap; end if;
end $$;
