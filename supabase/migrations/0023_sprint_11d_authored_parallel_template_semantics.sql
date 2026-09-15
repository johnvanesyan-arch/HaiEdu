-- Sprint 11D — authored parallel scenarios are concrete reviewed variants, not
-- deterministic generators. Mark their shared templates as `fixed` catalogue
-- templates so future content-admin QA does not incorrectly try to re-render them
-- through the Sprint 11C generator RPC.

update public.item_templates
set template_kind='fixed',
    generation_config=generation_config || jsonb_build_object(
      'generationMode','authored_parallel_catalog',
      'deterministicRerender',false,
      'reviewGate','structured_internal_review_sme_pending'
    ),
    updated_at=now()
where code in (
  'PHY7-U01-S01-T-11D-PARALLEL',
  'PHY7-U01-S02-T-11D-PARALLEL',
  'PHY7-U01-S03-T-11D-PARALLEL',
  'PHY7-U01-S04-T-11D-PARALLEL',
  'PHY7-U01-S05-T-11D-PARALLEL',
  'PHY7-U01-S06-T-11D-PARALLEL',
  'PHY7-U01-S09-T-11D-PARALLEL'
);

do $$
declare v_bad integer;
begin
  select count(*) into v_bad
  from public.item_templates
  where code in (
    'PHY7-U01-S01-T-11D-PARALLEL','PHY7-U01-S02-T-11D-PARALLEL','PHY7-U01-S03-T-11D-PARALLEL',
    'PHY7-U01-S04-T-11D-PARALLEL','PHY7-U01-S05-T-11D-PARALLEL','PHY7-U01-S06-T-11D-PARALLEL',
    'PHY7-U01-S09-T-11D-PARALLEL'
  ) and (template_kind<>'fixed' or generation_config->>'generationMode'<>'authored_parallel_catalog');
  if v_bad<>0 then raise exception '11D_authored_catalog_template_semantics_failed:%',v_bad; end if;
end $$;
