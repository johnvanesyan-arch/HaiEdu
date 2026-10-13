-- Owner-authorized Chapter II pilot, 2026-10-13. Exactly one atomic transaction.
-- Fill the reviewed implementation commit and both migration SHA256 placeholders.
-- Prerequisites: reviewed disjoint-release and mastery-form migrations are deployed.
-- Rehearse with the final COMMIT replaced by ROLLBACK; inspect returned evidence.
begin;
set local transaction isolation level read committed;
set local lock_timeout='10s';
set local statement_timeout='60s';

create function pg_temp.release_table_digest(p_table text,p_predicate text default 'true')
returns jsonb language plpgsql as $$
declare result jsonb;
begin
 execute format('select jsonb_build_object(''count'',count(*),''md5'',md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),''''))) from public.%I t where %s',p_table,p_predicate) into result;
 return result;
end $$;

-- Stop if any reviewed content/source row changed since the read-only preflight.
lock table public.items,public.item_options,public.item_answer_keys,public.item_misconception_mappings,public.item_templates,public.item_versions,public.item_families,public.item_reviews,public.item_qa_runs,public.item_curriculum_scopes,public.misconceptions,public.misconception_review_events,public.item_template_remediation_guides,public.skill_remediation_guides,public.remediation_guide_authoring_versions,public.remediation_guide_versions,public.curriculum_source_documents,public.learning_outcomes,public.skills,public.skill_prerequisites,public.skill_outcomes,public.skill_outcome_curriculum_mappings,public.skill_curriculum_reconciliations,public.item_family_curriculum_reconciliations in share mode;
do $$ declare g record; actual jsonb; begin
 for g in select * from jsonb_to_recordset($guards$[{"table_name":"items","row_count":453,"row_digest":"e717db329322c74a94211e78b7886131"},{"table_name":"item_options","row_count":1204,"row_digest":"f9e54697837788d41c001eb93269c4b0"},{"table_name":"item_answer_keys","row_count":453,"row_digest":"d8198ca03d8c75999e8565bc592c6be0"},{"table_name":"item_misconception_mappings","row_count":818,"row_digest":"f99118fa1eca0cfef1a640aacb2d8de1"},{"table_name":"item_templates","row_count":231,"row_digest":"647b78ff68ed1eb7014fc446eaa3f75e"},{"table_name":"item_versions","row_count":330,"row_digest":"cabf7e69740e35f5e0b0e41cb3dea8a1"},{"table_name":"item_families","row_count":231,"row_digest":"4f2db16f7769de7512df6dfb2704553f"},{"table_name":"item_reviews","row_count":724,"row_digest":"aed829f6aa75781f8fbfd1740bee401b"},{"table_name":"item_qa_runs","row_count":731,"row_digest":"e1df99df030eb0cb521dcbd50a8567d0"},{"table_name":"item_curriculum_scopes","row_count":453,"row_digest":"ab9ab72c6195946947057ba492b3e322"},{"table_name":"misconceptions","row_count":273,"row_digest":"f2c7e25d5110a35dc1a08bc7c7cc439a"},{"table_name":"misconception_review_events","row_count":265,"row_digest":"c7e19e49e5e84d03061ec40a6ab29ecb"},{"table_name":"item_template_remediation_guides","row_count":66,"row_digest":"90e5a01acaad8dcb0cf7026a621a7de9"},{"table_name":"skill_remediation_guides","row_count":10,"row_digest":"a66c19dc1e8def9b213cad12942816b3"},{"table_name":"remediation_guide_authoring_versions","row_count":324,"row_digest":"f4b9e00cd4aaa4375fddce9df8c79609"},{"table_name":"remediation_guide_versions","row_count":162,"row_digest":"a86446eede75d5661dd8c29a33696ae7"},{"table_name":"curriculum_source_documents","row_count":3,"row_digest":"8095813289d71bd06c2fe77ff00ea5ee"},{"table_name":"learning_outcomes","row_count":13,"row_digest":"d3717ac3b583ec7820c8ad41070475bb"},{"table_name":"skills","row_count":19,"row_digest":"dc448cfd57bc2b068bf592516515ffc7"},{"table_name":"skill_prerequisites","row_count":17,"row_digest":"a5df0cd920ce1f877ac191735ce23d8d"},{"table_name":"skill_outcomes","row_count":20,"row_digest":"84828add6d68a1847e7804a2e2d05d75"},{"table_name":"skill_outcome_curriculum_mappings","row_count":20,"row_digest":"0edd79aef4796da584077a4deb76d80e"},{"table_name":"skill_curriculum_reconciliations","row_count":18,"row_digest":"b1c2551996a3f69d685c5cf7dd834459"},{"table_name":"item_family_curriculum_reconciliations","row_count":231,"row_digest":"2bf8ab580b4f5e4d3471e3b11bf98ceb"}]$guards$::jsonb) as x(table_name text,row_count integer,row_digest text) loop
   actual:=pg_temp.release_table_digest(g.table_name);
   if actual->>'md5' is distinct from g.row_digest or (actual->>'count')::integer<>g.row_count then raise exception 'reviewed_content_drift:%',g.table_name; end if;
 end loop;
end $$;

create temporary table release_preservation(table_name text primary key,predicate text not null,baseline jsonb not null) on commit drop;
insert into release_preservation select t,'true',pg_temp.release_table_digest(t) from unnest(array['items','item_options','item_answer_keys','item_misconception_mappings','item_templates','item_versions','item_families','item_reviews','item_qa_runs','item_curriculum_scopes','misconceptions','misconception_review_events','item_template_remediation_guides','skill_remediation_guides','remediation_guide_authoring_versions','remediation_guide_versions','curriculum_source_documents','learning_outcomes','skills','skill_prerequisites','skill_outcomes','skill_outcome_curriculum_mappings','skill_curriculum_reconciliations','item_family_curriculum_reconciliations','learning_sessions','learning_session_items','attempts','student_item_exposure_events','student_skill_mastery_by_release','chapter_mastery_states','mastery_check_attempts','chapter_review_requirements','chapter_review_sessions','chapter_review_cycles','chapter_review_item_exposures','recommendation_events','remediation_events']) t;
insert into release_preservation values
 ('curriculum_releases','id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_releases','id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_units','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_units','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_outcomes','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_outcomes','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_skills','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_skills','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_item_families','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_item_families','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_gate_checks','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_gate_checks','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('curriculum_release_reconciliations','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('curriculum_release_reconciliations','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('learning_model_configurations','id<>''413d1e30-8368-5bb3-bd2d-67b0f73243d9''',pg_temp.release_table_digest('learning_model_configurations','id<>''413d1e30-8368-5bb3-bd2d-67b0f73243d9''')),
 ('runtime_builds','id<>''8599d31d-ca85-5380-b883-905126e97921''',pg_temp.release_table_digest('runtime_builds','id<>''8599d31d-ca85-5380-b883-905126e97921''')),
 ('learning_model_runtime_bindings','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('learning_model_runtime_bindings','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('assessment_blueprints','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''',pg_temp.release_table_digest('assessment_blueprints','curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407''')),
 ('assessment_blueprint_items','assessment_blueprint_id in (select id from public.assessment_blueprints where curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'')',pg_temp.release_table_digest('assessment_blueprint_items','assessment_blueprint_id in (select id from public.assessment_blueprints where curriculum_release_id<>''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'')')),
 ('assessment_pools','id not in (''d76d147d-2a85-53f6-9f72-1699d48299a0'',''a96fb505-e64b-5160-bff5-957275f461f1'',''41a896eb-ca34-5c6a-ab62-e36f9b937f65'')',pg_temp.release_table_digest('assessment_pools')),
 ('assessment_pool_items','pool_id not in (''d76d147d-2a85-53f6-9f72-1699d48299a0'',''a96fb505-e64b-5160-bff5-957275f461f1'',''41a896eb-ca34-5c6a-ab62-e36f9b937f65'')',pg_temp.release_table_digest('assessment_pool_items')),
 ('assessment_forms','pool_id not in (''d76d147d-2a85-53f6-9f72-1699d48299a0'',''a96fb505-e64b-5160-bff5-957275f461f1'',''41a896eb-ca34-5c6a-ab62-e36f9b937f65'')',pg_temp.release_table_digest('assessment_forms')),
 ('assessment_form_items','form_id in (select id from public.assessment_forms where pool_id not in (''d76d147d-2a85-53f6-9f72-1699d48299a0'',''a96fb505-e64b-5160-bff5-957275f461f1'',''41a896eb-ca34-5c6a-ab62-e36f9b937f65''))',pg_temp.release_table_digest('assessment_form_items'));

-- Both chapters retain their exact original identities; narrow only the unactivated draft.
select id from public.curriculum_releases where id in ('b83dc4a4-f5c2-486a-82a6-d7489e7e6407','80bbe575-ad49-4a7f-881a-e55726b1eaeb') order by id for update;
do $$ begin
 if not exists(select 1 from public.curriculum_releases where id='80bbe575-ad49-4a7f-881a-e55726b1eaeb' and status='pilot') then raise exception 'chapter_i_pilot_drift'; end if;
 if not exists(select 1 from public.curriculum_releases where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and status='draft' and activated_at is null) then raise exception 'expected_unactivated_chapter_ii'; end if;
 if exists(select 1 from public.assessment_blueprints where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407') then raise exception 'chapter_ii_already_configured'; end if;
end $$;
delete from public.curriculum_release_reconciliations where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and unit_id<>'beae3516-4317-4c8b-bd66-576c6f309308';
delete from public.curriculum_release_units where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and unit_id<>'beae3516-4317-4c8b-bd66-576c6f309308';
update public.curriculum_releases set
 release_key='physics7_u02_2026_08_14_pilot_r2',
 version_label='Ֆիզիկա 7 — Գլուխ II, փորձնական թողարկում 2',
 predecessor_release_id=null,
 source_snapshot=source_snapshot||jsonb_build_object('pilotAuthorization',jsonb_build_object('date','2026-10-13','ownerDirection','You can release Chapter II; we will do the specialist review later','independentSmeReview','deferred','historicalExposure','unknown; owner-authorized provisional use','previousCombinedDraftKey','physics7_u01_u02_2026_08_14_candidate_r2','chapterIPreservedReleaseId','80bbe575-ad49-4a7f-881a-e55726b1eaeb')),
 notes='Owner-authorized provisional Chapter II pilot. The original combined draft was narrowed before activation to preserve Chapter I release, progress and open sessions. Independent Physics SME review and final production exposure disposition remain pending. No empirical equivalence or historical non-exposure claim.'
where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and status='draft';

-- LOCAL DRAFT integration fragment. No BEGIN/COMMIT: root owns the atomic transaction.

-- Requires U02-only draft r2. Does not mark reconciliation/gates passed or activate a release.

-- Source row hashes below bind INSERT SELECT snapshots; table locks prevent drift within the transaction.

lock table public.items,public.item_templates,public.item_families,public.skills,public.learning_outcomes,public.skill_curriculum_reconciliations,public.item_family_curriculum_reconciliations,public.skill_outcome_curriculum_mappings,public.learning_outcome_normative_mappings in share mode;

do $$ begin

if not exists(select 1 from public.curriculum_releases where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and status='draft' and activated_at is null) then raise exception 'expected_unactivated_draft_r2'; end if;

if (select count(*) from public.curriculum_release_units where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>1 or not exists(select 1 from public.curriculum_release_units where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and unit_id='beae3516-4317-4c8b-bd66-576c6f309308') then raise exception 'expected_u02_only'; end if;

if exists(select 1 from public.assessment_blueprints where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407') then raise exception 'unexpected_existing_r2_blueprints'; end if;

if not exists(select 1 from public.learning_model_configurations where id='bf84b5bb-88a4-4f55-986f-0c06ce5b0b3f' and snapshot_fingerprint='6ab5f3e50694f8f4105f87569905c5ac') then raise exception 'baseline_model_drift'; end if;

if not exists(select 1 from public.runtime_builds where id='a4cabbcc-e8d8-436b-9aaa-8d88b02428f6' and snapshot_fingerprint='2bda970bfd0e8defac8c063e9afa989a') then raise exception 'parent_runtime_drift'; end if;

if '__REVIEWED_IMPLEMENTATION_COMMIT__' !~ '^[0-9a-f]{40}$' then raise exception 'reviewed_implementation_commit_required'; end if;

if '__UNIT_GUARD_SQL_SHA256__' !~ '^[0-9a-f]{64}$' then raise exception 'reviewed_sql_digest_required:unitScopedReleaseGuardSqlSha256'; end if;

if '__MASTERY_FORM_SQL_SHA256__' !~ '^[0-9a-f]{64}$' then raise exception 'reviewed_sql_digest_required:masteryWholeFormSelectionSqlSha256'; end if;

if (select count(*)=192 and md5(jsonb_agg(to_jsonb(x))::text)='238f4050e81ba7b752ef02e0a6835369' from (select i.id,i.code,i.version_no,i.skill_id,i.item_template_id,t.template_version,t.item_family_id,i.variant_key,i.variant_fingerprint,i.item_type from public.items i join public.item_templates t on t.id=i.item_template_id where i.code like 'PHY7-U02-%' and i.status='published' order by i.code) x) is distinct from true then raise exception 'source_snapshot_drift:items'; end if;

if (select count(*)=8 and md5(jsonb_agg(to_jsonb(x))::text)='9397b7ae23f3ac0debe0f2cd12a805a5' from (select s.* from public.skills s join public.skill_curriculum_reconciliations m on m.skill_id=s.id where m.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' order by s.id) x) is distinct from true then raise exception 'source_snapshot_drift:skills'; end if;

if (select count(*)=7 and md5(jsonb_agg(to_jsonb(x))::text)='0c9e1e9791b2b57b7c24cc92677059e5' from (select lo.* from public.learning_outcomes lo join public.learning_outcome_normative_mappings m on m.learning_outcome_id=lo.id where m.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' order by lo.id) x) is distinct from true then raise exception 'source_snapshot_drift:outcomes'; end if;

if (select count(*)=153 and md5(jsonb_agg(to_jsonb(x))::text)='3082fe1f4c8fbed0702942272499a8e4' from (select f.* from public.item_families f where exists(select 1 from public.items i join public.item_templates t on t.id=i.item_template_id where t.item_family_id=f.id and i.code like 'PHY7-U02-%' and i.status='published') order by f.id) x) is distinct from true then raise exception 'source_snapshot_drift:families'; end if;

if (select count(*)=8 and md5(jsonb_agg(to_jsonb(x))::text)='9f1505e76e9b5de60e7280a9b3b6d194' from (select * from public.skill_curriculum_reconciliations where reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' order by skill_id) x) is distinct from true then raise exception 'source_snapshot_drift:skillReconciliations'; end if;

if (select count(*)=153 and md5(jsonb_agg(to_jsonb(x))::text)='7ce6bfaf9b7764c82821e601f3d47abc' from (select r.* from public.item_family_curriculum_reconciliations r where reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' and exists(select 1 from public.items i join public.item_templates t on t.id=i.item_template_id where t.item_family_id=r.item_family_id and i.code like 'PHY7-U02-%' and i.status='published') order by item_family_id) x) is distinct from true then raise exception 'source_snapshot_drift:familyReconciliations'; end if;

if (select count(*)=8 and md5(jsonb_agg(to_jsonb(x))::text)='631eebfe8bdf1904b3d32bc943475d87' from (select * from public.skill_outcome_curriculum_mappings where reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' order by skill_id,learning_outcome_id) x) is distinct from true then raise exception 'source_snapshot_drift:skillMappings'; end if;

if (select count(*)=7 and md5(jsonb_agg(to_jsonb(x))::text)='5b5526d53841aa0f04fe704e90a9e2e9' from (select * from public.learning_outcome_normative_mappings where reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' order by learning_outcome_id) x) is distinct from true then raise exception 'source_snapshot_drift:outcomeMappings'; end if;

end $$;

create temporary table release_expected_items on commit drop as select i.id,i.code,i.version_no,i.skill_id,i.item_template_id,t.template_version,t.item_family_id,i.variant_key,i.variant_fingerprint,i.item_type from public.items i join public.item_templates t on t.id=i.item_template_id where i.code like 'PHY7-U02-%' and i.status='published' order by i.code;

delete from public.curriculum_release_item_families where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407';

delete from public.curriculum_release_skills where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407';

delete from public.curriculum_release_outcomes where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407';

insert into public.curriculum_release_outcomes(
curriculum_release_id,learning_outcome_id,source_document_id,official_code_snapshot,statement_hy_snapshot,statement_en_snapshot,source_locator_snapshot,requirement_level_snapshot,source_transcription_notes_snapshot,framework_references_snapshot,subject_standard_references_snapshot,mapping_notes_snapshot,sequence_order_snapshot)
select 'b83dc4a4-f5c2-486a-82a6-d7489e7e6407',lo.id,lo.source_document_id,lo.official_code,lo.statement_hy,lo.statement_en,lo.source_locator,lo.requirement_level,lo.source_transcription_notes,m.framework_references,m.subject_standard_references,m.mapping_notes,lo.sequence_order
from public.learning_outcome_normative_mappings m join public.learning_outcomes lo on lo.id=m.learning_outcome_id where m.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc';

insert into public.curriculum_release_skills(
curriculum_release_id,skill_id,skill_code_snapshot,name_hy_snapshot,name_en_snapshot,description_hy_snapshot,description_en_snapshot,layer_snapshot,sequence_order_snapshot,disposition_snapshot,rationale_snapshot,outcome_mapping_snapshot)
select 'b83dc4a4-f5c2-486a-82a6-d7489e7e6407',s.id,s.code,s.name_hy,s.name_en,s.description_hy,s.description_en,s.layer::text,s.sequence_order,r.disposition,r.rationale,
(select jsonb_agg(jsonb_build_object('learningOutcomeId',m.learning_outcome_id,'mappingType',m.mapping_type,'rationale',m.rationale) order by m.learning_outcome_id) from public.skill_outcome_curriculum_mappings m where m.reconciliation_id=r.reconciliation_id and m.skill_id=s.id)
from public.skill_curriculum_reconciliations r join public.skills s on s.id=r.skill_id where r.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc';

insert into public.curriculum_release_item_families(
curriculum_release_id,item_family_id,skill_id,family_code_snapshot,name_hy_snapshot,description_snapshot,primary_learning_outcome_id,disposition_snapshot,mapping_type_snapshot,rationale_snapshot)
select 'b83dc4a4-f5c2-486a-82a6-d7489e7e6407',f.id,f.skill_id,f.code,f.name_hy,f.description,r.primary_learning_outcome_id,r.disposition,r.mapping_type,r.rationale
from public.item_family_curriculum_reconciliations r join public.item_families f on f.id=r.item_family_id
where r.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc' and exists(select 1 from release_expected_items e where e.item_family_id=f.id);

insert into public.assessment_pools(id,code,unit_code,purpose,name,is_protected,status,metadata) select id,code,unit_code,purpose,name,is_protected,status,metadata from jsonb_populate_recordset(null::public.assessment_pools,$json$[{"id":"d76d147d-2a85-53f6-9f72-1699d48299a0","code":"PHY7-U02-DIAGNOSTIC-PILOT-20261013","unit_code":"PHY7-U02","purpose":"diagnostic","name":"Grade 7 Physics Chapter II — diagnostic pilot","is_protected":true,"status":"draft","metadata":{"curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","ownerReleaseAuthorizedOn":"2026-10-13","independentSmeReview":"deferred","historicalPublicReadability":"not_proven_unexposed"}},{"id":"a96fb505-e64b-5160-bff5-957275f461f1","code":"PHY7-U02-PRACTICE-PILOT-20261013","unit_code":"PHY7-U02","purpose":"practice","name":"Grade 7 Physics Chapter II — practice pilot","is_protected":false,"status":"draft","metadata":{"curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","ownerReleaseAuthorizedOn":"2026-10-13","independentSmeReview":"deferred","historicalPublicReadability":"not_proven_unexposed"}},{"id":"41a896eb-ca34-5c6a-ab62-e36f9b937f65","code":"PHY7-U02-MASTERY-PILOT-20261013","unit_code":"PHY7-U02","purpose":"mastery_check","name":"Grade 7 Physics Chapter II — mastery_check pilot","is_protected":true,"status":"draft","metadata":{"curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","ownerReleaseAuthorizedOn":"2026-10-13","independentSmeReview":"deferred","historicalPublicReadability":"not_proven_unexposed"}}]$json$::jsonb);

insert into public.assessment_pool_items(pool_id,item_id,enabled,metadata)
select p.id,e.id,true,jsonb_build_object('itemVersion',e.version_no,'ownerReleaseAuthorizedOn','2026-10-13')
from release_expected_items e join public.assessment_pools p on p.id=(case substring(e.code from '-([IDM])[0-9]+$')
when 'I' then 'a96fb505-e64b-5160-bff5-957275f461f1'::uuid when 'D' then 'd76d147d-2a85-53f6-9f72-1699d48299a0'::uuid when 'M' then '41a896eb-ca34-5c6a-ab62-e36f9b937f65'::uuid end);

insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale)
select '6215ea83-999a-47ac-91a8-014366881edc',p.id,'mapping_updated',count(*),count(distinct e.skill_id),count(distinct e.item_family_id),count(distinct r.primary_learning_outcome_id),
'Technical scope refresh for owner-authorized Chapter II pilot: exact approved item versions and registered mappings. No independent SME, non-exposure or empirical equivalence claim.'
from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join release_expected_items e on e.id=pi.item_id
join public.item_family_curriculum_reconciliations r on r.item_family_id=e.item_family_id and r.reconciliation_id='6215ea83-999a-47ac-91a8-014366881edc'
where p.id in ('d76d147d-2a85-53f6-9f72-1699d48299a0','a96fb505-e64b-5160-bff5-957275f461f1','41a896eb-ca34-5c6a-ab62-e36f9b937f65') group by p.id;

insert into public.runtime_builds(id,build_key,source_commit,implementation_manifest,notes)
select '8599d31d-ca85-5380-b883-905126e97921','runtime-2026-10-13-u02-pilot-r2','__REVIEWED_IMPLEMENTATION_COMMIT__',implementation_manifest || $json${"chapterIIPilotRelease":{"parentRuntimeBuildId":"a4cabbcc-e8d8-436b-9aaa-8d88b02428f6","parentRuntimeSourceCommit":"303446cb06d1dbcc631065f6fea9094c44657a0a","sourceCommit":"__REVIEWED_IMPLEMENTATION_COMMIT__","scope":"U02-only owner-authorized pilot; U01 binding unchanged","unitScopedReleaseGuardSqlSha256":"__UNIT_GUARD_SQL_SHA256__","masteryWholeFormSelectionSqlSha256":"__MASTERY_FORM_SQL_SHA256__","masteryFormSelection":"haiedu-mastery-form-selection-v1","edgeBundlesChanged":false,"learningNumericParametersChanged":false,"independentSmeReview":"deferred","historicalNonExposureEstablished":false,"empiricalEquivalenceEstablished":false}}$json$::jsonb,'Append-only runtime provenance for Chapter II pilot. Existing Edge bundle versions retained; reviewed unit-scoped release guard and opt-in mastery whole-form SQL identified in manifest. Chapter I runtime binding unchanged.'
from public.runtime_builds where id='a4cabbcc-e8d8-436b-9aaa-8d88b02428f6' and snapshot_fingerprint='2bda970bfd0e8defac8c063e9afa989a';

insert into public.learning_model_configurations(id,model_key,version_label,configuration_kind,predecessor_id,reference_curriculum_release_id,source_commit,configuration,deployment_manifest,notes)
select '413d1e30-8368-5bb3-bd2d-67b0f73243d9',model_key,'chapter-ii-pilot-2026-10-13-r2','baseline',id,'b83dc4a4-f5c2-486a-82a6-d7489e7e6407','__REVIEWED_IMPLEMENTATION_COMMIT__',configuration || $json${"assessmentPolicyContracts":[{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-diagnostic","version":1,"mode":"diagnostic","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":16,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":false,"baselineRequired":false,"questionCountBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":2,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":2,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":2,"678beb6a-4654-40c2-a5b2-53cc97b2551b":2,"b7caca8c-d222-4715-a39f-80883f995471":2,"c1e57a2d-d843-45ea-adf1-891837d12d6c":2,"c2463f0b-9d96-4ae6-a814-0495db8a3872":2,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":2},"maximumCompletedBaselines":1},{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-practice","version":1,"mode":"practice","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":8,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":true,"baselineRequired":true},{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-mastery_check","version":1,"mode":"mastery_check","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":16,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":false,"baselineRequired":true,"questionCountBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":2,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":2,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":2,"678beb6a-4654-40c2-a5b2-53cc97b2551b":2,"b7caca8c-d222-4715-a39f-80883f995471":2,"c1e57a2d-d843-45ea-adf1-891837d12d6c":2,"c2463f0b-9d96-4ae6-a814-0495db8a3872":2,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":2},"minimumPercent":80,"minimumCorrectBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":1,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":1,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":1,"678beb6a-4654-40c2-a5b2-53cc97b2551b":1,"b7caca8c-d222-4715-a39f-80883f995471":1,"c1e57a2d-d843-45ea-adf1-891837d12d6c":1,"c2463f0b-9d96-4ae6-a814-0495db8a3872":1,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":1}},{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-chapter_review","version":1,"mode":"chapter_review","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":12,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":true,"baselineRequired":true}]}$json$::jsonb,$json${"runtimeBuildId":"8599d31d-ca85-5380-b883-905126e97921","parentRuntimeBuildId":"a4cabbcc-e8d8-436b-9aaa-8d88b02428f6","runtimeSourceCommit":"__REVIEWED_IMPLEMENTATION_COMMIT__","scope":"Chapter II owner-authorized pilot; unchanged numerical baseline and explicit governed policy contracts","sourceCommit":"__REVIEWED_IMPLEMENTATION_COMMIT__","functions":{"submit-answer":18,"get-session-item":16,"get-student-classes":8,"get-teacher-student":14,"get-remediation-help":12,"get-student-dashboard":24,"get-teacher-dashboard":19,"submit-mastery-answer":7,"start-learning-session":23,"get-mastery-check-status":11,"record-recommendation-event":3,"get-teacher-academic-context":3,"get-chapter-mastery-lifecycle":3,"get-school-performance-analytics":2}}$json$::jsonb,'Owner-authorized Chapter II pilot baseline clone. Numeric criteria unchanged; exact four governed assessment contracts added. Independent SME review and empirical validation are not asserted.'
from public.learning_model_configurations where id='bf84b5bb-88a4-4f55-986f-0c06ce5b0b3f' and snapshot_fingerprint='6ab5f3e50694f8f4105f87569905c5ac';

insert into public.assessment_blueprints(id,blueprint_key,curriculum_release_id,unit_id,assessment_pool_id,purpose,version_number,status,selection_policy_version,configuration_snapshot,item_set_fingerprint) select id,blueprint_key,curriculum_release_id,unit_id,assessment_pool_id,purpose,version_number,status,selection_policy_version,configuration_snapshot,item_set_fingerprint from jsonb_populate_recordset(null::public.assessment_blueprints,$json$[{"id":"89e9f260-64e2-59f1-bfba-3176e8950aab","blueprint_key":"physics7_u02_20261013_r2_diagnostic","curriculum_release_id":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unit_id":"beae3516-4317-4c8b-bd66-576c6f309308","assessment_pool_id":"d76d147d-2a85-53f6-9f72-1699d48299a0","purpose":"diagnostic","version_number":1,"status":"draft","selection_policy_version":"haiedu-assessment-policy-v1","configuration_snapshot":{"assessmentPolicy":{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-diagnostic","version":1,"mode":"diagnostic","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":16,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":false,"baselineRequired":false,"questionCountBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":2,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":2,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":2,"678beb6a-4654-40c2-a5b2-53cc97b2551b":2,"b7caca8c-d222-4715-a39f-80883f995471":2,"c1e57a2d-d843-45ea-adf1-891837d12d6c":2,"c2463f0b-9d96-4ae6-a814-0495db8a3872":2,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":2},"maximumCompletedBaselines":1},"poolCode":"PHY7-U02-DIAGNOSTIC-PILOT-20261013","enabledItemCount":32,"provenance":"exact_snapshot","independentSmeReview":"deferred","historicalExposureDisposition":"owner_authorized_pilot_with_exposure_limitations"},"item_set_fingerprint":"fd835e67b2f1fe8d63fce029549211d8"},{"id":"ebcf0382-5dd2-5e3f-b706-b01b65867326","blueprint_key":"physics7_u02_20261013_r2_practice","curriculum_release_id":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unit_id":"beae3516-4317-4c8b-bd66-576c6f309308","assessment_pool_id":"a96fb505-e64b-5160-bff5-957275f461f1","purpose":"practice","version_number":1,"status":"draft","selection_policy_version":"haiedu-assessment-policy-v1","configuration_snapshot":{"assessmentPolicy":{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-practice","version":1,"mode":"practice","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":8,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":true,"baselineRequired":true},"poolCode":"PHY7-U02-PRACTICE-PILOT-20261013","enabledItemCount":96,"provenance":"exact_snapshot","independentSmeReview":"deferred","historicalExposureDisposition":"owner_authorized_pilot_with_exposure_limitations"},"item_set_fingerprint":"9cf5924b86b28f969addc6e0310e6cc5"},{"id":"866ca9f2-6611-5918-afa1-8b54119b381a","blueprint_key":"physics7_u02_20261013_r2_mastery_check","curriculum_release_id":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unit_id":"beae3516-4317-4c8b-bd66-576c6f309308","assessment_pool_id":"41a896eb-ca34-5c6a-ab62-e36f9b937f65","purpose":"mastery_check","version_number":1,"status":"draft","selection_policy_version":"haiedu-assessment-policy-v1","configuration_snapshot":{"assessmentPolicy":{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-mastery_check","version":1,"mode":"mastery_check","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":16,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":false,"baselineRequired":true,"questionCountBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":2,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":2,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":2,"678beb6a-4654-40c2-a5b2-53cc97b2551b":2,"b7caca8c-d222-4715-a39f-80883f995471":2,"c1e57a2d-d843-45ea-adf1-891837d12d6c":2,"c2463f0b-9d96-4ae6-a814-0495db8a3872":2,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":2},"minimumPercent":80,"minimumCorrectBySkill":{"bfd0b199-55ab-4933-acfd-7eeb4142fd4c":1,"739d70f3-d0d9-49d5-8ef9-f0cb85a9cf3d":1,"f2aa6c2f-df22-4645-aba0-11946b05a7d0":1,"678beb6a-4654-40c2-a5b2-53cc97b2551b":1,"b7caca8c-d222-4715-a39f-80883f995471":1,"c1e57a2d-d843-45ea-adf1-891837d12d6c":1,"c2463f0b-9d96-4ae6-a814-0495db8a3872":1,"802bce7e-7ede-4138-b2b2-35c4c1b68a32":1}},"poolCode":"PHY7-U02-MASTERY-PILOT-20261013","enabledItemCount":64,"provenance":"exact_snapshot","independentSmeReview":"deferred","historicalExposureDisposition":"owner_authorized_pilot_with_exposure_limitations","masteryFormSelection":{"schemaVersion":"haiedu-mastery-form-selection-v1","formIds":["85c1becc-a30b-5b95-a902-765d35f059bf","e1a13275-05b4-5024-b95b-165ff0abf0fc","234a0f59-c0a9-56b6-87e3-bab1cf4125a9"],"selectionStrategy":"ordered-unseen-whole-form-v1"}},"item_set_fingerprint":"c5756ae6fb84e9ddcbd61d6c5153c832"},{"id":"ce2f88d8-ddac-585a-8346-962c4667471e","blueprint_key":"physics7_u02_20261013_r2_chapter_review","curriculum_release_id":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unit_id":"beae3516-4317-4c8b-bd66-576c6f309308","assessment_pool_id":"a96fb505-e64b-5160-bff5-957275f461f1","purpose":"chapter_review","version_number":1,"status":"draft","selection_policy_version":"haiedu-assessment-policy-v1","configuration_snapshot":{"assessmentPolicy":{"schemaVersion":"haiedu-assessment-policy-v1","policyKey":"physics7-u02-pilot-20261013-chapter_review","version":1,"mode":"chapter_review","subjectProgramId":"258955e9-30e7-43ef-95c5-324a53143270","curriculumReleaseId":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unitId":"beae3516-4317-4c8b-bd66-576c6f309308","plannedQuestionCount":12,"learningModelConfigurationId":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","academicMasteryPolicyId":"514229ff-31e6-406b-a92d-eedda258d4eb","responseTypes":["single_choice","true_false"],"scoringStrategy":"selected-response-v1","hintsAllowed":true,"baselineRequired":true},"poolCode":"PHY7-U02-PRACTICE-PILOT-20261013","enabledItemCount":96,"provenance":"exact_snapshot","independentSmeReview":"deferred","historicalExposureDisposition":"owner_authorized_pilot_with_exposure_limitations","sourceBlueprintId":"ebcf0382-5dd2-5e3f-b706-b01b65867326"},"item_set_fingerprint":"9cf5924b86b28f969addc6e0310e6cc5"}]$json$::jsonb);

insert into public.assessment_blueprint_items(assessment_blueprint_id,item_id,item_code_snapshot,item_version_snapshot,item_template_id,template_version_snapshot,item_family_id,variant_key_snapshot,variant_fingerprint_snapshot)
select b.id,e.id,e.code,e.version_no,e.item_template_id,e.template_version,e.item_family_id,e.variant_key,e.variant_fingerprint
from public.assessment_blueprints b join public.assessment_pool_items pi on pi.pool_id=b.assessment_pool_id and pi.enabled join release_expected_items e on e.id=pi.item_id
where b.curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407';

insert into public.learning_model_runtime_bindings(id,binding_key,curriculum_release_id,unit_code,learning_model_configuration_id,runtime_build_id,status,notes) select id,binding_key,curriculum_release_id,unit_code,learning_model_configuration_id,runtime_build_id,status,notes from jsonb_populate_recordset(null::public.learning_model_runtime_bindings,$json$[{"id":"9f07896a-be65-5c8f-bb2a-cf2d3d511311","binding_key":"physics7_u02_current","curriculum_release_id":"b83dc4a4-f5c2-486a-82a6-d7489e7e6407","unit_code":"PHY7-U02","learning_model_configuration_id":"413d1e30-8368-5bb3-bd2d-67b0f73243d9","runtime_build_id":"8599d31d-ca85-5380-b883-905126e97921","status":"inactive","notes":"Prepared Chapter II governed policy binding; activate only in the final verified pilot transaction. Independent specialist review deferred by owner."}]$json$::jsonb);

select private.validate_governed_learning_model('413d1e30-8368-5bb3-bd2d-67b0f73243d9'::uuid);

-- Now integrate exact-forms.sql, reviewed reconciliation/gate evidence, and the root activation sequence.

-- Exact reviewed two diagnostic and three mastery forms. Sixteen reserves are intentionally absent.

-- Root integrates after configure-draft.sql within the same transaction. No release activation.

insert into public.assessment_forms(id,pool_id,code,name,form_version,status,metadata) select id,pool_id,code,name,form_version,status,metadata from jsonb_populate_recordset(null::public.assessment_forms,$json$[{"id":"ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd","pool_id":"d76d147d-2a85-53f6-9f72-1699d48299a0","code":"PHY7-U02-DIAGNOSTIC-A","name":"Chapter II diagnostic A","form_version":1,"status":"active","metadata":{"allocationManifestSha256":"3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367","independentSmeReview":"deferred","ownerAuthorizedPilot":true,"empiricalEquivalenceEstablished":false}},{"id":"915915cb-bf4a-5c0c-a450-81661230e3f6","pool_id":"d76d147d-2a85-53f6-9f72-1699d48299a0","code":"PHY7-U02-DIAGNOSTIC-B","name":"Chapter II diagnostic B","form_version":1,"status":"active","metadata":{"allocationManifestSha256":"3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367","independentSmeReview":"deferred","ownerAuthorizedPilot":true,"empiricalEquivalenceEstablished":false}},{"id":"85c1becc-a30b-5b95-a902-765d35f059bf","pool_id":"41a896eb-ca34-5c6a-ab62-e36f9b937f65","code":"PHY7-U02-MASTERY_CHECK-A","name":"Chapter II mastery_check A","form_version":1,"status":"active","metadata":{"allocationManifestSha256":"3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367","independentSmeReview":"deferred","ownerAuthorizedPilot":true,"empiricalEquivalenceEstablished":false}},{"id":"e1a13275-05b4-5024-b95b-165ff0abf0fc","pool_id":"41a896eb-ca34-5c6a-ab62-e36f9b937f65","code":"PHY7-U02-MASTERY_CHECK-B","name":"Chapter II mastery_check B","form_version":1,"status":"active","metadata":{"allocationManifestSha256":"3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367","independentSmeReview":"deferred","ownerAuthorizedPilot":true,"empiricalEquivalenceEstablished":false}},{"id":"234a0f59-c0a9-56b6-87e3-bab1cf4125a9","pool_id":"41a896eb-ca34-5c6a-ab62-e36f9b937f65","code":"PHY7-U02-MASTERY_CHECK-C","name":"Chapter II mastery_check C","form_version":1,"status":"active","metadata":{"allocationManifestSha256":"3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367","independentSmeReview":"deferred","ownerAuthorizedPilot":true,"empiricalEquivalenceEstablished":false}}]$json$::jsonb);

insert into public.assessment_form_items(form_id,item_id,slot_order,metadata)
select form_id::uuid,item_id::uuid,slot_order,jsonb_build_object('itemVersion',item_version,'allocationManifestSha256','3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367')
from (values
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','c5837b19-b157-4151-ab13-831ccc5de7d4',1,2),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','d9fe4508-e31c-4dfd-8583-ce231e91a8f9',2,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','bd51a934-4974-4f21-8aa7-5b006d823ee5',3,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','8d3a35dd-2494-41d3-bfd7-5acbb9a994f1',4,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','4b37a934-c647-4755-b8c4-8864f9606767',5,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','ad53fa64-393a-49c0-92fa-86e1be4c6b70',6,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','627ae3b1-c2e2-4ec1-842d-8961975adf48',7,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','06ce31da-00e3-4114-87fa-0479bb414f7a',8,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','96228ed4-483f-491b-bdf6-13a162cb4333',9,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','bbdfbb0f-77e1-4048-ac6b-aa9b73476084',10,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','91f8620a-dee5-44bc-8991-03d2b2303245',11,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','6876a7d7-cf51-48aa-b432-cec84bf0e381',12,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','db1cbeb4-cf73-4322-ab64-4319d74c4048',13,2),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','4b99f68c-80a5-4743-804d-8e0a56393329',14,1),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','16adfe1e-5e77-4a14-8695-68e7accc205b',15,2),
('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','8fcbd81e-de0d-4044-aa14-9ee611edee4e',16,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','50c0b3d5-3f0f-4d7a-8c7b-82d7c6d2d4a1',1,2),
('915915cb-bf4a-5c0c-a450-81661230e3f6','d91052ae-3afe-47e7-b35d-07988119af74',2,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','9a7e7dc5-718a-4b10-86be-4d6e3e8d16f0',3,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','8d9c72c2-e237-4717-bdac-9bd3dcbad4e7',4,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','1465dfc7-b6a5-429d-8730-cdbc810be2a2',5,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','9327fa45-1e55-42ee-9cbb-118a232c6fa0',6,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','4a94c470-9b01-493b-bec0-61ee6dfaa2e1',7,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','c1a9f50b-99f6-4f00-8359-7646d15eb807',8,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','ae1ab070-e7b6-41c0-bb6c-5d1b1cce9719',9,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','2e1b9932-0321-49ec-a85a-2e2502cfae98',10,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','f685e2d9-280e-4c97-8568-f638284d41d2',11,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','29cffd0a-6b3f-48d4-bd92-d9b0423710cb',12,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','91582cd9-6b25-4dac-bc55-51975f85ae43',13,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','c1e22397-3d8a-4ebb-82c4-126cbaadf0b2',14,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','ec7706b8-3a9d-44c9-9226-dd3d293f51fa',15,1),
('915915cb-bf4a-5c0c-a450-81661230e3f6','891c9c3e-82ad-47d0-8b6d-9cc3603b1fd2',16,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','620f717e-013d-4c32-9b02-c40a65a52257',1,2),
('85c1becc-a30b-5b95-a902-765d35f059bf','4ce44597-f032-46ec-a6be-31ecbd815da8',2,2),
('85c1becc-a30b-5b95-a902-765d35f059bf','8d290596-373e-4415-89cb-ffe2b6ef279c',3,2),
('85c1becc-a30b-5b95-a902-765d35f059bf','02f4ec30-4071-46c5-a17d-ee7771345d57',4,2),
('85c1becc-a30b-5b95-a902-765d35f059bf','380d9c71-7ae5-4975-8014-ed5f3a8a742e',5,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','5cdb17f8-9914-4cf2-ae74-bdc1a4f31a1f',6,3),
('85c1becc-a30b-5b95-a902-765d35f059bf','62457731-03e0-4ad7-9087-a6a95f4b1540',7,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','74447d09-605b-4084-aae4-0aa7a1d67e37',8,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','4f91b533-4a85-4bf6-b272-c92c177081f4',9,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','4966dae0-a2e0-4eb0-96c7-34b7ae52f8ae',10,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','4055a223-fcfe-4c61-9115-9c518df6684b',11,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','75ec54f8-f6a8-4227-9d4c-5da2fe9adb35',12,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','c4e81f2d-26db-43a5-bde1-bd956ecf1cf2',13,1),
('85c1becc-a30b-5b95-a902-765d35f059bf','f5abddad-64f2-4749-b57a-133aeb576bc8',14,3),
('85c1becc-a30b-5b95-a902-765d35f059bf','8aef6289-5b01-4305-bf6c-352526b772de',15,3),
('85c1becc-a30b-5b95-a902-765d35f059bf','a5ccbcec-5e9c-4829-8892-dd9a724ce4c3',16,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','d467bdf1-3b30-4410-99fb-9486b972fcde',1,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','0046b51d-d995-43fd-9cf6-4ec52a0c95c1',2,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','5249d8d8-212c-44c6-88f6-f9e2bd15bb04',3,2),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','32dbf2df-a12e-4a73-aed2-2af0ccdf6989',4,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','85376508-614f-45e0-b9d4-868a9be82987',5,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','3181ee3a-c91c-4884-b119-c4e7d2a16c23',6,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','2231924e-e0f8-4be8-a31b-78ac7478a168',7,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','1f4afb98-2bf9-4437-926e-175290b3fe8e',8,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','1205ce18-2b49-4990-9689-7ec0e32304d3',9,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','08a4d700-03c2-49bd-a69f-f8bc1dbdc47d',10,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','6ac832b2-e5e6-4066-97b9-84b94035379e',11,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','e99654f5-cd57-4841-a0ad-c79c9f930a19',12,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','c8af569d-4e11-4d39-b3d2-190f1204efcb',13,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','998491fc-860c-4745-92c9-67c5bdd92e8a',14,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','f5b0e774-4411-46f7-8156-601a71cbf00f',15,1),
('e1a13275-05b4-5024-b95b-165ff0abf0fc','0f38cfc8-97f5-4620-8f3e-fccc997b364d',16,2),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','aa29687c-42bf-4075-825e-75600537b697',1,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','f4353dc0-f721-4719-a2f6-e0d661aec0f0',2,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','9660d5b3-70de-4204-8478-aa90721c9291',3,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','6f0453af-3cc5-4f7d-be66-ec4a484b8a1a',4,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','1994b72a-e2d4-40b5-8ac8-0e886ca77599',5,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','6205907b-80c0-42d7-bb90-e4ff84051368',6,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','e71c7f96-9ef0-440b-97ea-e082f83a9c63',7,2),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','a3474d77-e527-4176-9367-76f1954a3b38',8,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','7d406bf4-2860-42bc-8623-91f4fdb7652e',9,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','ef7837fd-3dff-4b4f-a865-dcebdb36342b',10,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','66c34d3b-2a69-409d-8ff0-0ea05b8d2f41',11,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','e0d5ba19-89cb-4f20-a67e-3b6b3d4704e1',12,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','efcdb40f-553e-4e81-8f0e-e8254ef7bbbb',13,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','34554f4a-5e16-42ab-afe3-406db2ff7494',14,1),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','f64d45bc-25a9-42cf-b65c-288a42cb8174',15,3),
('234a0f59-c0a9-56b6-87e3-bab1cf4125a9','9d0875f7-0ede-40d2-8ecf-bd06dc0d69d5',16,1)) as x(form_id,item_id,slot_order,item_version);

do $$ begin
if (select count(*) from public.assessment_forms where id in ('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','915915cb-bf4a-5c0c-a450-81661230e3f6','85c1becc-a30b-5b95-a902-765d35f059bf','e1a13275-05b4-5024-b95b-165ff0abf0fc','234a0f59-c0a9-56b6-87e3-bab1cf4125a9'))<>5 or (select count(*) from public.assessment_form_items where form_id in ('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd','915915cb-bf4a-5c0c-a450-81661230e3f6','85c1becc-a30b-5b95-a902-765d35f059bf','e1a13275-05b4-5024-b95b-165ff0abf0fc','234a0f59-c0a9-56b6-87e3-bab1cf4125a9'))<>80 then raise exception 'exact_form_inventory_mismatch'; end if;
end $$;

-- Root integrates after configure-draft.sql + exact-forms.sql, before activation.
-- This bounds current U02 pilot eligibility; it does not retrofit generic legacy assignment locking.
-- Keep these locks through final activation + policy binding + commit.
lock table public.assessment_pool_items,public.assessment_blueprint_items,
 public.assessment_forms,public.assessment_form_items,
 public.legacy_learning_blueprint_mappings in share mode;

do $$
begin
 -- All 192 current U02 items must belong only to their one intended purpose pool.
 if exists(
   select 1 from public.assessment_pool_items pi join release_expected_items e on e.id=pi.item_id
   where pi.pool_id is distinct from (case substring(e.code from '-([IDM])[0-9]+$')
     when 'I' then 'a96fb505-e64b-5160-bff5-957275f461f1'::uuid
     when 'D' then 'd76d147d-2a85-53f6-9f72-1699d48299a0'::uuid
     when 'M' then '41a896eb-ca34-5c6a-ab62-e36f9b937f65'::uuid end)
 ) then raise exception 'u02_pilot_alternate_pool_membership'; end if;

 -- Include disabled memberships and every blueprint status, including historical legacy rows.
 if exists(
   select 1 from public.assessment_blueprint_items bi join release_expected_items e on e.id=bi.item_id
   join public.assessment_blueprints b on b.id=bi.assessment_blueprint_id
   where b.curriculum_release_id<>'b83dc4a4-f5c2-486a-82a6-d7489e7e6407'
      or b.unit_id<>'beae3516-4317-4c8b-bd66-576c6f309308'
      or b.id not in ('89e9f260-64e2-59f1-bfba-3176e8950aab',
       'ebcf0382-5dd2-5e3f-b706-b01b65867326','866ca9f2-6611-5918-afa1-8b54119b381a',
       'ce2f88d8-ddac-585a-8346-962c4667471e')
 ) then raise exception 'u02_pilot_alternate_blueprint_membership'; end if;

 if exists(
   select 1 from public.assessment_form_items fi join release_expected_items e on e.id=fi.item_id
   where fi.form_id not in ('ba8c0b60-0631-59a0-bfbd-b72e01cd2fcd',
     '915915cb-bf4a-5c0c-a450-81661230e3f6','85c1becc-a30b-5b95-a902-765d35f059bf',
     'e1a13275-05b4-5024-b95b-165ff0abf0fc','234a0f59-c0a9-56b6-87e3-bab1cf4125a9')
 ) then raise exception 'u02_pilot_alternate_form_membership'; end if;

 if exists(
   select 1 from public.legacy_learning_blueprint_mappings m
   where m.curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'
      or m.unit_id='beae3516-4317-4c8b-bd66-576c6f309308'
      or exists(select 1 from public.assessment_blueprint_items bi
        join release_expected_items e on e.id=bi.item_id where bi.assessment_blueprint_id=m.assessment_blueprint_id)
 ) then raise exception 'u02_pilot_legacy_mapping_present'; end if;
end $$;


-- Complete the internal source/scope reconciliation using the approved unchanged bank.
-- reviewed_by remains NULL: no independent specialist review is invented.
update public.curriculum_reconciliation_runs set status='complete',completed_at=now(),
 notes='Internal pilot reconciliation complete: seven registered programme outcomes, eight mapped skills (including one derived supporting skill), eight curriculum prerequisites, 153 eligible item families and exact approved question/form scope. Owner authorized provisional release on 2026-10-13 with independent specialist review deferred. Source chain carried forward; no fresh official-currentness, SME, historical non-exposure or empirical equivalence claim.'
where id='6215ea83-999a-47ac-91a8-014366881edc' and status='draft';

do $$ begin
 if (select count(*) from release_expected_items)<>192 then raise exception 'chapter_ii_count_drift'; end if;
 if exists(select 1 from release_expected_items e join public.items i on i.id=e.id
  where i.review_status<>'approved' or i.validation_state<>'provisional_no_sme_review'
   or not exists(select 1 from public.item_reviews r where r.item_id=i.id and r.version_no=i.version_no and r.review_type='content' and r.decision='approved' and r.reviewer_id is not null)
   or not exists(select 1 from public.item_qa_runs q where q.item_id=i.id and q.version_no=i.version_no and q.passed and q.errors='[]'::jsonb))
 then raise exception 'chapter_ii_current_approval_or_qa_missing'; end if;
 if not exists(select 1 from public.items where code='PHY7-U02-S07-M05' and status='archived') then raise exception 'archive_drift'; end if;
 if (select count(*) from public.curriculum_release_skills where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>8
 or (select count(*) from public.curriculum_release_outcomes where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>7
 or (select count(*) from public.curriculum_release_item_families where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>153 then raise exception 'chapter_ii_snapshot_scope_invalid'; end if;
end $$;

update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,
 evidence=jsonb_build_object('scope','owner-authorized Chapter II provisional pilot','sourceManifestSha256','b542b6be1460c6673981ca6079edb44f4dfad2933235bd0004c8b00ee2a63275','allocationManifestSha256','3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367','implementationCommit','__REVIEWED_IMPLEMENTATION_COMMIT__','outcomes',7,'skills',8,'eligibleFamilies',153,'approvedQuestions',192,'practiceQuestions',96,'diagnosticQuestions',32,'masteryQuestions',64,'publishedGuides',57,'activeDefinitions',263,'diagnosticForms',2,'masteryForms',3,'questionsPerAssessment',16,'reserveMasteryQuestions',16,'independentSme','pending','historicalExposure','unknown; provisional pilot use authorized','sourceRegistration','carried forward, not newly independently verified','qaWarningDisposition','S02-I01 v2 passing historical QA predates matching content approval; SME warning remains accurately pending'),
 notes='Current internal pilot evidence replaces early draft counts. Ordinary human content review and current-version technical QA verified. Exact forms and immutable policy/model bindings validated in the same activation transaction. Independent SME and final production exposure disposition remain pending; owner-authorized provisional use only.',updated_at=now()
where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and gate_code in ('official_programme_identified','normative_sources_registered','outcomes_reconciled','skills_mapped','assessment_scope_bound','content_qa_passed');

update public.curriculum_release_gate_checks set evidence=evidence||jsonb_build_object('ownerDirectionDate','2026-10-13','decision','review deferred; provisional pilot authorized'),notes='Independent Physics specialist review is deferred by the owner. No SME approval has been given. Production promotion remains blocked.',updated_at=now()
where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and gate_code='external_sme_approved' and status='pending';

update public.assessment_pools set status='active',updated_at=now() where id in ('d76d147d-2a85-53f6-9f72-1699d48299a0','a96fb505-e64b-5160-bff5-957275f461f1','41a896eb-ca34-5c6a-ab62-e36f9b937f65');
update public.assessment_blueprints set status='pilot',published_at=now(),updated_at=now() where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and status='draft';
update public.learning_model_runtime_bindings set status='active',activated_at=now(),updated_at=now() where id='9f07896a-be65-5c8f-bb2a-cf2d3d511311';
update public.curriculum_releases set content_fingerprint=md5(jsonb_build_object(
 'outcomes',pg_temp.release_table_digest('curriculum_release_outcomes','curriculum_release_id=''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'''),
 'skills',pg_temp.release_table_digest('curriculum_release_skills','curriculum_release_id=''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'''),
 'families',pg_temp.release_table_digest('curriculum_release_item_families','curriculum_release_id=''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'''),
 'blueprints',pg_temp.release_table_digest('assessment_blueprints','curriculum_release_id=''b83dc4a4-f5c2-486a-82a6-d7489e7e6407'''),
 'allocationSha256','3855a223c78b13142b9e5d85de35c61c7f52f2600f45ef6fe7ff5d743d46c367')::text),status='pilot'
where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and status='draft';

select public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' order by purpose;
do $$ declare g record; actual jsonb; begin
 for g in select * from release_preservation loop
  actual:=pg_temp.release_table_digest(g.table_name,g.predicate);
  if actual is distinct from g.baseline then raise exception 'preserved_table_changed:%',g.table_name; end if;
 end loop;
 if (select count(*) from public.assessment_policy_bindings where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>4 then raise exception 'four_policy_bindings_required'; end if;
 if (select count(*) from private.mastery_form_selection_bindings fb join public.assessment_policy_bindings pb on pb.id=fb.assessment_policy_binding_id where pb.curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407')<>1 then raise exception 'mastery_form_binding_required'; end if;
 if not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407' and gate_code='external_sme_approved' and status='pending' and checked_by is null) then raise exception 'sme_gate_must_remain_pending'; end if;
 if (select count(*) from private.active_curriculum_release_units where curriculum_release_id in ('80bbe575-ad49-4a7f-881a-e55726b1eaeb','b83dc4a4-f5c2-486a-82a6-d7489e7e6407'))<>2 then raise exception 'both_disjoint_active_chapters_required'; end if;
end $$;

select jsonb_build_object('schemaVersion',1,'observedAt',clock_timestamp(),'status','activated',
 'activatedAt',(select activated_at from public.curriculum_releases where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'),'curriculumReleaseId','b83dc4a4-f5c2-486a-82a6-d7489e7e6407','unitId','beae3516-4317-4c8b-bd66-576c6f309308',
 'release',(select to_jsonb(r) from public.curriculum_releases r where id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'),
 'preservedChapterI',(select jsonb_build_object('id',id,'curriculumReleaseId',id,'unitId','0349ffcd-8fc9-47f2-82d1-3d5cfcb3a096','status',status,'activatedAt',activated_at,'contentFingerprint',content_fingerprint) from public.curriculum_releases where id='80bbe575-ad49-4a7f-881a-e55726b1eaeb'),
 'preservation',(select jsonb_agg(jsonb_build_object('table',table_name,'predicate',predicate,'before',baseline,'after',pg_temp.release_table_digest(table_name,predicate)) order by table_name) from release_preservation),
 'gates',(select jsonb_agg(jsonb_build_object('code',gate_code,'status',status) order by gate_code) from public.curriculum_release_gate_checks where curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'),
 'blueprints',(select jsonb_agg(jsonb_build_object('id',b.id,'purpose',b.purpose,'status',b.status,'itemCount',(select count(*) from public.assessment_blueprint_items i where i.assessment_blueprint_id=b.id),'policyBindingId',p.id,'policyFingerprint',p.snapshot_fingerprint,'skillCount',jsonb_array_length(p.skill_scope_snapshot))) from public.assessment_blueprints b join public.assessment_policy_bindings p on p.assessment_blueprint_id=b.id where b.curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'),
 'forms',(select jsonb_agg(jsonb_build_object('id',f.id,'code',f.code,'status',f.status,'version',f.form_version,'itemCount',(select count(*) from public.assessment_form_items fi where fi.form_id=f.id))) from public.assessment_forms f where pool_id in ('d76d147d-2a85-53f6-9f72-1699d48299a0','41a896eb-ca34-5c6a-ab62-e36f9b937f65')),
 'masteryFormBinding',(select jsonb_build_object('policyBindingId',fb.assessment_policy_binding_id,'fingerprint',fb.snapshot_fingerprint) from private.mastery_form_selection_bindings fb join public.assessment_policy_bindings pb on pb.id=fb.assessment_policy_binding_id where pb.curriculum_release_id='b83dc4a4-f5c2-486a-82a6-d7489e7e6407'),
 'model',(select jsonb_build_object('id',id,'kind',configuration_kind,'fingerprint',snapshot_fingerprint,'numericConfigurationUnchanged',configuration-'assessmentPolicyContracts'=(select configuration from public.learning_model_configurations where id='bf84b5bb-88a4-4f55-986f-0c06ce5b0b3f')) from public.learning_model_configurations where id='413d1e30-8368-5bb3-bd2d-67b0f73243d9'),
 'runtimeBuild',(select jsonb_build_object('id',id,'sourceCommit',source_commit,'fingerprint',snapshot_fingerprint) from public.runtime_builds where id='8599d31d-ca85-5380-b883-905126e97921')
) as activation_evidence;
commit;
