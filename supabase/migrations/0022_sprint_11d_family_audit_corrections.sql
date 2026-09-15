-- Sprint 11D — fine-grained corrections from the original 60-item audit.
-- Preserve the stronger family labels already present in the v0.2 source bank.

with corrections(code,item_family) as (
  values
    ('PHY7-U01-S02-I05','knowledge'),
    ('PHY7-U01-S04-I05','reasoning'),
    ('PHY7-U01-S10-I05','transfer')
)
update public.items i
set item_family=c.item_family,
    config=i.config || jsonb_build_object('sprint11dFamilyAuditCorrection',true),
    updated_at=now()
from corrections c
where i.code=c.code and i.item_family is distinct from c.item_family;

-- The assessable-content trigger above correctly puts changed items back into review.
-- Record review evidence and republish only after the correction is complete.
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details)
select i.id,i.version_no,null,true,'[]'::jsonb,'["sme_review_pending"]'::jsonb,
       jsonb_build_object('phase','11D','scope','item_family_audit_correction','humanSmeReview',false)
from public.items i
where i.code in ('PHY7-U01-S02-I05','PHY7-U01-S04-I05','PHY7-U01-S10-I05');

insert into public.item_reviews(item_id,version_no,reviewer_id,review_type,decision,notes)
select i.id,i.version_no,null,'content','approved',
       'Sprint 11D internal family-classification audit correction; independent Physics SME validation remains pending.'
from public.items i
where i.code in ('PHY7-U01-S02-I05','PHY7-U01-S04-I05','PHY7-U01-S10-I05');

update public.items
set review_status='approved',status='published'::public.content_status,
    validation_state='provisional_no_sme_review',last_reviewed_at=now(),updated_at=now()
where code in ('PHY7-U01-S02-I05','PHY7-U01-S04-I05','PHY7-U01-S10-I05');

do $$
begin
  if (select item_family from public.items where code='PHY7-U01-S02-I05')<>'knowledge' then raise exception '11D_family_audit_S02_I05_failed'; end if;
  if (select item_family from public.items where code='PHY7-U01-S04-I05')<>'reasoning' then raise exception '11D_family_audit_S04_I05_failed'; end if;
  if (select item_family from public.items where code='PHY7-U01-S10-I05')<>'transfer' then raise exception '11D_family_audit_S10_I05_failed'; end if;
end $$;
