-- Owner-requested replacement of PHY7-U06-S06-I01 with textbook figure 92.
-- Apply only after the new public asset passes its SHA-256 and dimension check.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $replace$
declare
  before_item jsonb;
  after_item jsonb;
  old_snapshot jsonb;
  related_before text;
  history_before text;
  target uuid := '110ab8c8-9639-4522-81d4-4b463dd951b9';
begin
  select to_jsonb(i) into before_item from public.items i where i.id=target for update;
  if before_item is null or md5(before_item::text)<>'92b2cc646d30caddc2b0c49b0f79e938' then
    raise exception 's06_v3_current_version_changed';
  end if;
  if (select md5(string_agg(i.code||':'||md5(to_jsonb(i)::text),'|' order by i.code)) from public.items i where i.skill_id='2ad925a1-fabe-5d5d-b165-a120f867a9e4')<>'f4821e7e695190eea076ea6e6381d9ef' then
    raise exception 's06_comparison_corpus_changed';
  end if;
  if not exists(select 1 from public.curriculum_releases where id='44e5e99a-43bc-5937-8793-b2c614e38700' and status='draft' and activated_at is null) then
    raise exception 's06_release_boundary_changed';
  end if;
  if exists(select 1 from public.item_versions where item_id=target and version_no>=3)
    or exists(select 1 from public.item_reviews where item_id=target and version_no=2) then
    raise exception 's06_version_or_review_changed';
  end if;
  select snapshot into old_snapshot from public.item_versions where item_id=target and version_no=2;
  if md5(old_snapshot::text)<>'7cb9a361f70352f19de1330a42cf06cf' then
    raise exception 's06_v2_snapshot_changed';
  end if;
  if old_snapshot->'answerKey' is distinct from (select to_jsonb(k) from public.item_answer_keys k where item_id=target)
    or old_snapshot->'options' is distinct from (select jsonb_agg(to_jsonb(o) order by display_order,option_key) from public.item_options o where item_id=target)
    or old_snapshot->'misconceptions' is distinct from (select jsonb_agg(jsonb_build_object('responseKey',m.response_key,'mappingNote',m.mapping_note,'code',c.code) order by c.code,m.response_key) from public.item_misconception_mappings m join public.misconceptions c on c.id=m.misconception_id where m.item_id=target) then
    raise exception 's06_supporting_content_changed';
  end if;
  select md5(string_agg(i.code||':'||md5(to_jsonb(i)::text),'|' order by i.code)) into related_before from public.items i where i.code like 'PHY7-U06-%' and i.id<>target;
  select md5(string_agg(v.version_no||':'||md5(v.snapshot::text),'|' order by v.version_no)) into history_before from public.item_versions v where v.item_id=target;
  update public.items
  set stimulus=jsonb_set(jsonb_set(jsonb_set(stimulus,
        '{url}',to_jsonb('https://www.haiedu.am/assets/textbook/physics7-2023/p131-communicating-vessels-v3.png'::text),false),
        '{altHy}',to_jsonb('Նկ. 92․ տարբեր ձևի և լայնության ճյուղերով հաղորդակից անոթների երեք զույգ։ Յուրաքանչյուր զույգում ջրի ազատ մակերևույթները նույն հորիզոնական մակարդակի վրա են։'::text),false),
        '{source,sha256}',to_jsonb('26f41a879ab9302ad8303e5efb1527e9866d77528081e40f8ab972f66d57d43d'::text),false),
      version_no=3, updated_at=now()
  where id=target;
  select to_jsonb(i) into after_item from public.items i where id=target;
  if before_item-array['stimulus','version_no','updated_at'] is distinct from after_item-array['stimulus','version_no','updated_at'] then
    raise exception 's06_unexpected_item_change';
  end if;
  insert into public.item_versions(item_id,version_no,snapshot,change_summary,created_by)
  values(target,3,jsonb_set(old_snapshot,'{item}',after_item,false),
    'Owner supplied figure 92 alone, replacing the combined figures 91/92 image. Image URL, image hash and accessible description updated; prompt, options, answer C, explanation, hints and mappings preserved. Fresh exact-version review remains pending.',null);
  if history_before is distinct from (select md5(string_agg(v.version_no||':'||md5(v.snapshot::text),'|' order by v.version_no)) from public.item_versions v where v.item_id=target and version_no<3)
    or related_before is distinct from (select md5(string_agg(i.code||':'||md5(to_jsonb(i)::text),'|' order by i.code)) from public.items i where i.code like 'PHY7-U06-%' and i.id<>target) then
    raise exception 's06_preservation_failed';
  end if;
end $replace$;
insert into public.item_qa_runs(item_id,version_no,run_by,passed,errors,warnings,details) values ('110ab8c8-9639-4522-81d4-4b463dd951b9',3,null,true,'[]'::jsonb,'[]'::jsonb,'{"optionCount":4,"misconceptionMappings":3,"misconceptionMappingPolicy":"all_distractors","missingMisconceptionResponseKeys":[],"duplicateCodes":[],"expectedDifficultyBand":"foundation","generatedVerification":null,"answerPositionDistribution":{"scope":"item_template","templateCode":"PHY7-U06-S06-I01-F01-T01","familyItemCount":1,"optionKeys":["A","B","C","D"],"counts":{"A":0,"B":0,"C":1,"D":0},"missingPositions":["A","B","D"],"maximumPositionCount":1,"maximumPositionShare":1,"unrecognizedAnswers":[],"policyVersion":"family-balanced-v1","severity":"warning","imbalanced":false},"evidenceBlueprintVerification":{"policyVersion":"haiedu-evidence-blueprint-v1","evidenceBlueprintPolicy":"distinct-purpose-v1","itemEvidencePurpose":"application","requiredEvidencePurposes":["application"],"enforceUniqueEvidencePurposes":true,"purposeCounts":{"application":1},"missingRequiredPurposes":[],"duplicatePurposes":[],"missingPurposeItemCodes":[],"invalidPurposeItemCodes":[],"familyStateFingerprint":"haiedu-family-state-v1|bf66cfac-70a4-423e-9ce5-001f62445a37|1|haiedu-evidence-blueprint-v1|distinct-purpose-v1|application|1|110ab8c8-9639-4522-81d4-4b463dd951b9:3:application"},"scope":"Figure 92 replacement; question, choices, key, hints and mappings preserved","runKey":"15F5-s06-image-v3-20261020","actorType":"automated_system_technical_qa","verificationMethod":"Exact deployed v11 evaluator replay against transaction/readback catalogue with a read-only in-memory query adapter; not authenticated live Edge invocation","evaluatorSourceSha256":"846b4c23a0c0c3ffe7bb1e89478e445f76736013b36a18ea6c07e95d7ca29db2","assetUrl":"https://www.haiedu.am/assets/textbook/physics7-2023/p131-communicating-vessels-v3.png","assetSha256":"26f41a879ab9302ad8303e5efb1527e9866d77528081e40f8ab972f66d57d43d","assetDimensions":[1028,1024],"assetBytes":1619301,"productionAssetVerified":true,"productionAssetVerifiedAt":"2026-10-20T07:26:16.612Z"}'::jsonb);
select jsonb_build_object(
'observedAt',clock_timestamp(),
'item',(select to_jsonb(i) from public.items i where code='PHY7-U06-S06-I01'),
'versionSnapshotMatches',(select v.snapshot->'item'=to_jsonb(i) from public.items i join public.item_versions v on v.item_id=i.id and v.version_no=i.version_no where i.code='PHY7-U06-S06-I01'),
'answer',(select k.answer from public.items i join public.item_answer_keys k on k.item_id=i.id where i.code='PHY7-U06-S06-I01')
) as verification;
commit;
