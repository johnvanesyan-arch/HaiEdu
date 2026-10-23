-- C27B bounded data registration. Defaults to rollback. Commit only the exact rehearsed recipe.
-- Refuses repeat application or scope drift; never updates existing business rows.
begin isolation level read committed;
set local statement_timeout='30s';
set local lock_timeout='5s';
create temporary table u2_before(schema_name text,table_name text,row_count bigint,full_hash text,prior_hash text) on commit drop;
create temporary table u2_after(like u2_before) on commit drop;
do $locks$ declare t record; begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','private') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('lock table %I.%I in share row exclusive mode',t.nspname,t.relname);
 end loop;
end $locks$;
do $guard$ begin
 if not exists(select 1 from public.profiles where id='67b9165f-9186-4746-a5e3-2f97c3cf0dfc' and role::text='admin' and account_status::text='active' and master_admin_protected_at is not null) then raise exception 'u2_owner_context_changed'; end if;
 if exists(select 1 from public.units where code='ENG7-U02' or id='94882724-418a-51c3-b28e-0e094c70e6b9')
 or exists(select 1 from public.curriculum_releases where id='633ef1f7-080b-5500-9be0-9a53dadfcbf4' or release_key='english7_u02_review_r1' or (subject_program_id='a88ac34c-3b29-5c9d-a5c4-95339b71c067' and release_number=2))
 or exists(select 1 from public.learning_audio_versions where sha256='9d5946beb54f37b1e1368e91b889769ea0b9ff6748e25dfb60a059dc0f04a507' or id='641de808-3b15-59e0-b194-fd8e7ff502ed') then raise exception 'u2_registration_already_present_or_scope_drift'; end if;
 if not exists(select 1 from public.curriculum_releases where id='e40991ee-ca0b-5666-a9f2-a3453de8fccb' and status='pilot') then raise exception 'u1_pilot_changed'; end if;
 perform 1 from storage.buckets where id='learning-audio' and not public and file_size_limit=8388608 and allowed_mime_types @> array['audio/mpeg']::text[] for share;
 if not found then raise exception 'u2_private_bucket_contract_changed'; end if;
 perform 1 from storage.objects where id='6f634db1-2a57-4e3d-97b4-80b237498410' and bucket_id='learning-audio' and name='9d5946beb54f37b1e1368e91b889769ea0b9ff6748e25dfb60a059dc0f04a507.mp3'
 and metadata->>'size'='768845' and metadata->>'contentLength'='768845' and metadata->>'mimetype'='audio/mpeg'
 and trim(both '"' from metadata->>'eTag')='6fead80bf482a6163c85e5d46799e825-1' for share;
 if not found then raise exception 'u2_exact_storage_object_missing'; end if;
end $guard$;

do $capture$
declare t record; n bigint; h text; prior_h text; filter text;
begin
 for t in select n.nspname as schema_name,c.relname as table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','private') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text), %L order by md5(to_jsonb(x)::text)),%L)) from %I.%I x','','',t.schema_name,t.table_name) into n,h;
  filter := case t.table_name when 'units' then 'not (id=''94882724-418a-51c3-b28e-0e094c70e6b9''::uuid)' when 'curriculum_releases' then 'not (id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'curriculum_release_units' then 'not (curriculum_release_id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'curriculum_release_gate_checks' then 'not (curriculum_release_id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'learning_audio_versions' then 'not (id=''641de808-3b15-59e0-b194-fd8e7ff502ed''::uuid)' else 'true' end;
  if t.schema_name<>'public' then filter:='true'; end if;
  execute format('select md5(coalesce(string_agg(md5(to_jsonb(x)::text), %L order by md5(to_jsonb(x)::text)),%L)) from %I.%I x where %s','','',t.schema_name,t.table_name,filter) into prior_h;
  insert into u2_before values(t.schema_name,t.table_name,n,h,prior_h);
 end loop;
end $capture$;
insert into public.units(id,subject_program_id,code,title_hy,title_en,sequence_order,status) values ('94882724-418a-51c3-b28e-0e094c70e6b9','a88ac34c-3b29-5c9d-a5c4-95339b71c067','ENG7-U02','Իմ հետաքրքրությունները․ ես սիրում եմ երաժշտություն լսել','My Interests — I Like Listening to Music',2,'draft');
insert into public.curriculum_releases(id,release_key,subject_program_id,release_number,version_label,status,provenance_quality,reconciliation_id,predecessor_release_id,source_snapshot,content_fingerprint,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','english7_u02_review_r1','a88ac34c-3b29-5c9d-a5c4-95339b71c067',2,'English Grade 7 Unit 2 — draft audio review scope','draft','exact',null,null,'{"schemaVersion": "haiedu-draft-audio-scope-v1", "checkpoint": "16.1C.27B", "reviewedSourceCommit": "cd406a356fb2b02f6c0dde76826804e29ac09389", "preparation": "docs/english-7-unit-02-preparation.md", "replacement": "docs/content/english-7-unit-02-music-replacement.json#ENG7-U02-ACT02-REPLACEMENT", "ownerIntegrationReference": "docs/evidence/english-7-unit-02-audio-owner-integration-20261023.json#2bf2554d47fa691c0a71763fa7c19dac51c1a061bd2afc231589f5ee26e292a0", "scope": "Unit 2 draft audio registration only; source activity 2, pp.29–31; optional Practice/Chapter Review candidate.", "wholeBankProposalPending": true, "bankBudgetAccepted": false, "learnerActivationAuthorized": false, "unit1ReleaseUnchanged": true, "supersedesUnit1": false}'::jsonb,'8aa91f1e23c73cffcc754c910c7f4d34d6a7fe469323a50fa8a0cd86da52e7c1','C27B additive draft Unit 2 audio scope. No scored items, assessment policy or learner activation; all seven release gates pending. Independent scope does not supersede the Unit 1 pilot.');
insert into public.curriculum_release_units(curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,title_en_snapshot,sequence_order_snapshot) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','94882724-418a-51c3-b28e-0e094c70e6b9','ENG7-U02','Իմ հետաքրքրությունները․ ես սիրում եմ երաժշտություն լսել','My Interests — I Like Listening to Music',2);
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','official_programme_identified','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','normative_sources_registered','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','outcomes_reconciled','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','skills_mapped','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','assessment_scope_bound','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','content_qa_passed','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.curriculum_release_gate_checks(curriculum_release_id,gate_code,status,evidence,notes) values ('633ef1f7-080b-5500-9be0-9a53dadfcbf4','external_sme_approved','pending','{"checkpoint": "16.1C.27B", "scope": "Draft audio registration only; this row does not certify the gate."}'::jsonb,'Pending Unit 2 reconciliation, whole-bank proposal, authoring and applicable review/release process.');
insert into public.learning_audio_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,bucket_id,object_path,sha256,mime_type,byte_length,duration_ms,source_reference,permission_reference,listening_review_reference,reviewed_by,reviewed_at) values ('641de808-3b15-59e0-b194-fd8e7ff502ed','633ef1f7-080b-5500-9be0-9a53dadfcbf4','94882724-418a-51c3-b28e-0e094c70e6b9','b7143aa4-9075-57b5-a9b8-9f563de967a1','en','One Song, Two Versions','learning-audio','9d5946beb54f37b1e1368e91b889769ea0b9ff6748e25dfb60a059dc0f04a507.mp3','9d5946beb54f37b1e1368e91b889769ea0b9ff6748e25dfb60a059dc0f04a507','audio/mpeg',768845,46994,'docs/content/english-7-unit-02-music-replacement.json#ENG7-U02-ACT02-REPLACEMENT; original fictional Maya–Leo dialogue; exact script sha256 e88870089724b78006f8d079d73840198daea1b575e9b3ed968ea9a908e9c036','docs/evidence/english-7-unit-02-audio-owner-integration-20261023.json#2bf2554d47fa691c0a71763fa7c19dac51c1a061bd2afc231589f5ee26e292a0; owner-supplied original recording authorized for bounded private Unit 2 integration','docs/evidence/english-7-unit-02-audio-owner-integration-20261023.json#2bf2554d47fa691c0a71763fa7c19dac51c1a061bd2afc231589f5ee26e292a0; owner supplied and confirmed upload for private integration; automated full script/illustrative-answer alignment in docs/evidence/english-7-unit-02-replacement-audio-20261023.json; no independent human audition, speaker distinction or pace acceptance claimed','67b9165f-9186-4746-a5e3-2f97c3cf0dfc','2026-10-23T10:32:08.742594+00:00');

do $capture$
declare t record; n bigint; h text; prior_h text; filter text;
begin
 for t in select n.nspname as schema_name,c.relname as table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','private') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text), %L order by md5(to_jsonb(x)::text)),%L)) from %I.%I x','','',t.schema_name,t.table_name) into n,h;
  filter := case t.table_name when 'units' then 'not (id=''94882724-418a-51c3-b28e-0e094c70e6b9''::uuid)' when 'curriculum_releases' then 'not (id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'curriculum_release_units' then 'not (curriculum_release_id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'curriculum_release_gate_checks' then 'not (curriculum_release_id=''633ef1f7-080b-5500-9be0-9a53dadfcbf4''::uuid)' when 'learning_audio_versions' then 'not (id=''641de808-3b15-59e0-b194-fd8e7ff502ed''::uuid)' else 'true' end;
  if t.schema_name<>'public' then filter:='true'; end if;
  execute format('select md5(coalesce(string_agg(md5(to_jsonb(x)::text), %L order by md5(to_jsonb(x)::text)),%L)) from %I.%I x where %s','','',t.schema_name,t.table_name,filter) into prior_h;
  insert into u2_after values(t.schema_name,t.table_name,n,h,prior_h);
 end loop;
end $capture$;
do $preserve$ begin
 if (select count(*) from u2_before)<>117 then raise exception 'u2_schema_scope_changed'; end if;
 if exists(select 1 from u2_before b full join u2_after a using(schema_name,table_name)
  where b.prior_hash is distinct from a.prior_hash or a.row_count-b.row_count <> case
   when b.schema_name='public' and b.table_name='curriculum_release_gate_checks' then 7
   when b.schema_name='public' and b.table_name in ('units','curriculum_releases','curriculum_release_units','learning_audio_versions') then 1 else 0 end)
 then raise exception 'u2_prior_rows_or_addition_counts_changed'; end if;
end $preserve$;
select jsonb_build_object('checkpoint','16.1C.27B','observedAt',clock_timestamp(),
 'trackedScopes',(select count(*) from u2_before),
 'allPriorRowsPreserved',not exists(select 1 from u2_before b join u2_after a using(schema_name,table_name) where b.prior_hash<>a.prior_hash),
 'entirelyUnchangedScopes',(select count(*) from u2_before b join u2_after a using(schema_name,table_name) where b.full_hash=a.full_hash),
 'additions',(select sum(a.row_count-b.row_count) from u2_before b join u2_after a using(schema_name,table_name)),
 'fingerprints',(select jsonb_agg(jsonb_build_object('schema',b.schema_name,'table',b.table_name,'beforeCount',b.row_count,'afterCount',a.row_count,'beforeHash',b.full_hash,'afterHash',a.full_hash,'priorRowsHash',a.prior_hash) order by b.schema_name,b.table_name) from u2_before b join u2_after a using(schema_name,table_name))) as evidence;
rollback;
