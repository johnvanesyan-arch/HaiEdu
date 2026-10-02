-- Forward-only correction for Sprint 15B.8.
-- The family metadata already declared purpose uniqueness, but protected QA
-- reads the template generation_config. Copy the flag to that authoritative
-- location without changing items, approvals or learner delivery.

update public.item_templates
set generation_config = jsonb_set(
      generation_config,
      '{enforceUniqueEvidencePurposes}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
where code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
  and generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
  and generation_config->>'enforceUniqueEvidencePurposes' is distinct from 'true';

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.item_templates template
  where template.code = 'PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES'
    and template.generation_config->>'authoringProfileVersion' = 'haiedu-evidence-blueprint-v1'
    and template.generation_config->>'enforceUniqueEvidencePurposes' = 'true';

  if v_count <> 1 then
    raise exception '15B8_unique_evidence_template_flag_failed:%', v_count;
  end if;
end $$;

notify pgrst, 'reload schema';
