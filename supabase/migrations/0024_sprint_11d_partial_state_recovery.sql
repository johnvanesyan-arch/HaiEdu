-- Sprint 11D — recover production from the partially applied 0017 catalogue.
-- This migration deliberately restores a safe review-only state. It does NOT
-- make the 11D catalogue pilot-eligible and does NOT rebuild assessment pools.

-- 1. Nothing created by the partial 11D catalogue may be treated as pilot-ready
-- until the remaining content/technical review is completed.
update public.items
set config = jsonb_set(config, '{pilot_ready}', 'false'::jsonb, true)
             || jsonb_build_object(
                  'sprint11dRecovery', true,
                  'sprint11dRecoveryReason', 'partial_0017_production_recovery',
                  'smeValidation', 'pending'
                ),
    validation_state = 'provisional_no_sme_review',
    review_status = 'needs_review',
    status = 'review'::public.content_status,
    updated_at = now()
where config->>'phase' = '11D'
  and retired_at is null;

-- Defensive isolation: preserve any accidental membership for audit, but disable it.
update public.assessment_pool_items api
set enabled = false,
    metadata = api.metadata || jsonb_build_object(
      'disabledBy', 'sprint_11d_partial_state_recovery',
      'disabledReason', '11D item still pending review'
    )
from public.items i
where api.item_id = i.id
  and i.config->>'phase' = '11D'
  and api.enabled = true;

-- 2. Correct the S01 catalogue to the five phenomenon classes currently supported
-- by the Chapter I architecture. The original 0017 catalogue incorrectly introduced
-- a sixth Sound category in the protected candidates.
with revised(code,prompt_hy,answer,difficulty) as (
  values
    ('PHY7-U01-S01-11D-M04','Տաք թեյը սեղանի վրա աստիճանաբար սառչում է։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"B"'::jsonb,2),
    ('PHY7-U01-S01-11D-M05','Շփումից լիցքավորված սանրը մոտեցնում են թղթի մանր կտորներին, և դրանք ձգվում են դեպի սանրը։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"C"'::jsonb,3),
    ('PHY7-U01-S01-11D-M06','Արևի լույսից անթափանց մարմնի հետևում ստվեր է առաջանում։ Սա ո՞ր տեսակի ֆիզիկական երևույթ է։','"E"'::jsonb,3)
)
update public.items i
set prompt_hy = r.prompt_hy,
    difficulty = r.difficulty,
    difficulty_band = case when r.difficulty <= 1 then 'foundation' when r.difficulty <= 3 then 'core' else 'challenge' end,
    config = i.config || jsonb_build_object('sourceScopeCorrection','11D_chapter1_supported_phenomenon_classes'),
    updated_at = now()
from revised r
where i.code = r.code;

with revised(code,answer) as (
  values
    ('PHY7-U01-S01-11D-M04','"B"'::jsonb),
    ('PHY7-U01-S01-11D-M05','"C"'::jsonb),
    ('PHY7-U01-S01-11D-M06','"E"'::jsonb)
)
update public.item_answer_keys k
set answer = r.answer,
    updated_at = now()
from public.items i
join revised r on r.code = i.code
where k.item_id = i.id;

-- Remove the unsupported Sound option from every S01 11D candidate.
delete from public.item_options o
using public.items i
where o.item_id = i.id
  and i.code like 'PHY7-U01-S01-11D-%'
  and o.option_key = 'F';

-- Recompute S01 semantic fingerprints after prompt/answer/option correction.
update public.items i
set variant_fingerprint = md5(
      i.skill_id::text || '|' ||
      lower(regexp_replace(i.prompt_hy, '\s+', ' ', 'g')) || '|' ||
      k.answer::text || '|' ||
      coalesce((
        select jsonb_agg(
          jsonb_build_object('optionKey',o.option_key,'contentHy',o.content_hy)
          order by o.display_order,o.option_key
        )::text
        from public.item_options o
        where o.item_id = i.id
      ), '[]')
    ),
    updated_at = now()
from public.item_answer_keys k
where k.item_id = i.id
  and i.code like 'PHY7-U01-S01-11D-%';

-- 3. Authored parallel catalogues are fixed reviewed candidates, not deterministic
-- generators. Prevent future generator QA from trying to re-render them.
update public.item_templates
set template_kind = 'fixed',
    generation_config = generation_config || jsonb_build_object(
      'generationMode','authored_parallel_catalog',
      'deterministicRerender',false,
      'reviewGate','pending_final_11d_review'
    ),
    updated_at = now()
where code in (
  'PHY7-U01-S01-T-11D-PARALLEL',
  'PHY7-U01-S02-T-11D-PARALLEL',
  'PHY7-U01-S03-T-11D-PARALLEL',
  'PHY7-U01-S04-T-11D-PARALLEL',
  'PHY7-U01-S05-T-11D-PARALLEL',
  'PHY7-U01-S06-T-11D-PARALLEL',
  'PHY7-U01-S09-T-11D-PARALLEL'
);

-- 4. Preserve the original review history, but explicitly supersede the premature
-- internal approvals with a changes-requested recovery event.
insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
select i.id,i.version_no,null,'content','changes_requested',
       'Sprint 11D production recovery: partial 0017 catalogue remains review-only. Final human content review and SME validation are still pending.'
from public.items i
where i.config->>'phase'='11D'
  and i.retired_at is null;

-- 5. Hard safety assertions. Fail the migration if the production recovery is incomplete.
do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.items i
  where i.config->>'phase'='11D'
    and i.retired_at is null
    and (
      coalesce((i.config->>'pilot_ready')::boolean,false) is true
      or i.status <> 'review'::public.content_status
      or i.review_status <> 'needs_review'
    );
  if v_bad <> 0 then raise exception '11D_recovery_review_state_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i
  join public.assessment_pool_items api on api.item_id=i.id and api.enabled=true
  where i.config->>'phase'='11D' and i.retired_at is null;
  if v_bad <> 0 then raise exception '11D_recovery_pool_isolation_failed:%',v_bad; end if;

  select count(*) into v_bad
  from public.item_options o
  join public.items i on i.id=o.item_id
  where i.code like 'PHY7-U01-S01-11D-%' and o.option_key='F';
  if v_bad <> 0 then raise exception '11D_recovery_sound_option_still_present:%',v_bad; end if;

  select count(*) into v_bad
  from public.items i
  where i.code in ('PHY7-U01-S01-11D-M04','PHY7-U01-S01-11D-M05','PHY7-U01-S01-11D-M06')
    and i.prompt_hy ilike '%ձայն%';
  if v_bad <> 0 then raise exception '11D_recovery_sound_prompt_still_present:%',v_bad; end if;

  select count(*) into v_bad
  from public.item_templates
  where code in (
    'PHY7-U01-S01-T-11D-PARALLEL','PHY7-U01-S02-T-11D-PARALLEL','PHY7-U01-S03-T-11D-PARALLEL',
    'PHY7-U01-S04-T-11D-PARALLEL','PHY7-U01-S05-T-11D-PARALLEL','PHY7-U01-S06-T-11D-PARALLEL',
    'PHY7-U01-S09-T-11D-PARALLEL'
  )
  and (template_kind <> 'fixed' or generation_config->>'generationMode' <> 'authored_parallel_catalog');
  if v_bad <> 0 then raise exception '11D_recovery_template_semantics_failed:%',v_bad; end if;
end $$;
