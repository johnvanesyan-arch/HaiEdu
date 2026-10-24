"""Compile a guarded English pilot transaction. Default ROLLBACK; no network.

Reuses the immutable C34 recipe. A bounded, hash-matched owner decision is
required even for rehearsal; --commit only changes the final transaction verb.
No schema, source bytes, content, approval or learner evidence is modified.
"""
import argparse
import copy
from datetime import datetime
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('english_configuration', Path(__file__).with_name('prepare-english-7-unit-02-configuration.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
RELEASE, PROGRAM, UNIT = base.RELEASE, base.PROGRAM, base.UNIT
CONFIG = ROOT / 'docs/content/english-7-unit-02-configuration-summary.json'
READ_CONTRACT = ROOT / 'docs/content/english-7-unit-02-read-contract.json'
DECISION = ROOT / 'docs/content/english-7-unit-02-release-decision.json'
SOURCE = '9f5cfd1a3cf47988e0d7de751aa680dbd3eb1826'
require, lit, jsql = base.require, base.lit, base.jsql

def validate_owner(owner):
    require(owner.get('owner') == 'John' and owner.get('action') == 'activate_provisional_pilot', 'Bounded owner activation required')
    require(owner.get('scope') == dict(subjectProgramId=PROGRAM, curriculumReleaseId=RELEASE, unitId=UNIT), 'Exact release scope required')
    summary = json.loads(CONFIG.read_text())
    require(owner.get('preparedSourceCommit') == SOURCE and owner.get('decisionManifestSha256') == base.sha(DECISION)
            and owner.get('configurationSha256') == base.sha(CONFIG)
            and owner.get('protectedConfigurationSha256') == summary['protectedConfigurationSha256']
            and owner.get('readContractSha256') == base.sha(READ_CONTRACT), 'Exact decision/configuration/read-contract hashes required')
    require(owner.get('specialistReview') == 'deferred' and owner.get('independentSmeApproved') is False and owner.get('unseenAssessmentClaim') is False, 'Provisional limits required')
    require(owner.get('sourceUseBasis') == 'existing_owner_course_instructions' and owner.get('sourceUseScope') == 'authenticated_enrolled_unit2_learners'
            and owner.get('publicDownloadsAuthorized') is False, 'Bounded learner source-use required')
    require(all(isinstance(owner.get(k), str) and owner[k].strip() for k in ['ownerDirection','recordedAt']), 'Actual owner statement required')
    require(datetime.fromisoformat(owner['recordedAt'].replace('Z', '+00:00')).tzinfo is not None, 'Dated owner authorization required')

def load_configuration(config_path, inventory):
    summary, decision = json.loads(CONFIG.read_text()), json.loads(DECISION.read_text())
    require(base.sha(config_path) == summary['protectedConfigurationSha256'] == decision['configuration']['protectedConfigurationSha256'], 'Exact protected C34 configuration required')
    prepared = json.loads(config_path.read_text())
    require(prepared['scope'] == decision['scope'] and prepared['policies'] == summary['policies'], 'Configuration scope/policy mismatch')
    require(prepared['expectedItems'] == inventory['items']['items'], 'Immutable item metadata drift')
    require(inventory['current']['release']['status'] == 'draft' and inventory['current']['release']['activated_at'] is None
            and not inventory['current']['blueprints'] and not inventory['current']['pools'] and not inventory['current']['runtimeBindings'], 'Expected unconfigured draft')
    require(prepared['reusedLifecycle'] in inventory['current']['policies'], 'Explicit lifecycle changed')
    sources = decision['sourceInventory']['initiallyAllocatedTaskSets'] + decision['sourceInventory']['optionalTaskSetsOutsideInitialAllocation']
    source_by_id = {x['id']: x for x in sources}
    require(len(inventory['sources']) == len(source_by_id) == 28, 'Exact source inventory required')
    for source in inventory['sources']:
        expected = source_by_id.get(source['id'])
        require(expected and source['revokedAt'] is None and all(source[k] == expected[k] for k in ['sourceFamilyId','kind','audioVersionId','stimulusHash']), 'Accepted source drift')
        members = [dict(itemId=i['id'],skillId=i['skillId'],version=i['version']) for i in prepared['expectedItems'] if i['stimulus'].get('taskSetVersionId') == source['id']]
        require(sorted(source['members'],key=lambda x:x['itemId']) == sorted(members,key=lambda x:x['itemId']) and len(members) == expected['memberCount'], 'Exact source membership drift')
    require(inventory['audio'] == [{k:v for k,v in a.items() if k != 'initiallyAllocated'} for a in decision['sourceInventory']['audio']], 'Accepted recording drift')
    for name, sha256 in prepared['tables']['runtime_builds'][0]['implementation_manifest']['sourceFiles'].items():
        require(base.sha(ROOT/name) == sha256, 'Reused runtime source drift')
    return prepared

def fp(schema, table, predicate='true'):
    require(schema in ('public','private') and base.re.fullmatch('[a-z_]+',table), 'Unsafe identifier')
    return f"(select jsonb_build_object('rows',count(*),'md5',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),''))) from {schema}.{table} r where {predicate})"

def material_publication_guard():
    """Technical availability is distinct from the owner's content acceptance.

    Fail before activation when the exact materials are still draft/retired or
    the normal reviewer flow has not created the matching writing projection.
    This reads no reviewer identity and neither approves nor republishes content.
    """
    materials = json.loads(DECISION.read_text())['technicalObservation']['materials']
    require(len(materials) == 9 and sum(x['kind'] == 'guide' for x in materials) == 8
            and sum(x['kind'] == 'writing' for x in materials) == 1, 'Exact material manifest required')
    frozen = [{k:x[k] for k in ['id','key','kind','fingerprint','version']} for x in materials]
    return f"""if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,"key" text,kind text,fingerprint text,version integer)
      join public.unit_material_versions m on m.id=x.id
      where m.fingerprint=x.fingerprint and m.version_no=x.version and m.material_key=x."key" and m.kind=x.kind
      and m.subject_program_id='{PROGRAM}' and m.curriculum_release_id='{RELEASE}' and m.unit_id='{UNIT}' and m.status='approved')<>9
      then raise exception 'accepted_material_publication_required';end if;
    if not exists(select 1 from public.unit_material_versions m join public.written_task_versions w on w.id=m.id
      where m.id='{next(x['id'] for x in materials if x['kind']=='writing')}' and m.kind='writing' and m.status='approved'
      and w.status='approved' and w.task_key=m.material_key and w.version_no=m.version_no
      and w.subject_program_id=m.subject_program_id and w.curriculum_release_id=m.curriculum_release_id and w.unit_id=m.unit_id
      and w.definition=m.definition and w.review_evidence->>'fingerprint'=m.fingerprint)
      then raise exception 'accepted_writing_projection_required';end if;"""

def build(config_path, inventory, baseline, owner, commit=False, staged=False, database_guard=None):
    validate_owner(owner)
    prepared = load_configuration(config_path, inventory)
    require(len(baseline) == 117 and len({(x['schema'],x['table']) for x in baseline}) == 117, 'Complete preservation inventory required')
    tables = copy.deepcopy(prepared['tables'])
    disposition = {'qualification':'owner_authorized_provisional_pilot','independentSmeApproved':False,'independentSmeReview':'deferred','learnerActivationAuthorized':True,'ownerDecisionSha256':base.sha(ROOT/'docs/evidence/english-7-unit-02-owner-activation-20261024.json'),'exposureDisposition':'protected_owner_authorized_provisional_pilot','empiricalEquivalenceEstablished':False}
    for t in ('assessment_pools','assessment_forms'):
        for r in tables[t]: r['metadata'].update(disposition)
    for r in tables['assessment_blueprints']: r['configuration_snapshot'].update(disposition)
    model = tables['learning_model_configurations'][0]
    model['deployment_manifest'].update(disposition)
    model['deployment_manifest']['activationAuthorization'] = owner
    model['notes'] = 'Owner-approved English-specific model; provisional pilot with independent specialist review deferred; no empirical calibration claim.'
    tables['learning_model_runtime_bindings'][0]['notes'] = 'Explicit English model and existing approved immutable lifecycle; global lifecycle pointer unchanged.'
    source_use = {'checkpoint':'16.1C.36','preparedSourceCommit':SOURCE,'configurationSha256':base.sha(CONFIG),'protectedConfigurationSha256':base.sha(config_path),'decisionManifestSha256':base.sha(DECISION),'ownerAuthorization':owner,'specialistGate':'pending','independentSmeApproved':False,'unseenAssessmentClaim':False}
    if staged:
        return tables, compact_activation_sql(tables, source_use, database_guard, commit)
    sql = ['-- Owner-authorized bounded Unit 2 pilot. Generated; do not hand-edit.', 'begin;', "set local lock_timeout='5s';", "set local statement_timeout='120s';",
        f"do $activation$ declare prepared_tables jsonb:={jsql(tables)}; source_use jsonb:={jsql(source_use)}; saved jsonb:='[]'::jsonb; state jsonb; saved_row jsonb; actual jsonb; begin",
        'lock table public.items,public.item_versions,public.item_templates,public.item_curriculum_scopes,public.curriculum_release_skills,public.curriculum_release_item_families,public.learning_task_set_versions,public.learning_audio_versions,public.unit_material_versions,public.written_task_versions,public.academic_mastery_policy_versions in share mode;',
        f"perform id from public.curriculum_releases where id='{RELEASE}' for update;"]
    scopes = []
    for b in baseline:
        s,t=b['schema'],b['table']; p='true'
        if s=='public' and t in tables:
            rows=tables[t]; key=next(k for k in ['id','pool_id','form_id','assessment_blueprint_id'] if k in rows[0])
            p=key+' not in ('+','.join(lit(v) for v in sorted({r[key] for r in rows}))+')'
        elif s=='public' and t=='curriculum_releases': p=f"id<>'{RELEASE}'"
        elif t in ['curriculum_release_gate_checks','assessment_policy_bindings','active_curriculum_release_units']: p=f"curriculum_release_id<>'{RELEASE}'"
        elif t=='assessment_pool_curriculum_reconciliations': p=f"reconciliation_id<>'{base.RECON}'"
        elif s=='private' and t=='mastery_form_selection_bindings': p=f"assessment_policy_binding_id not in(select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')"
        elif s=='private' and t=='mastery_form_serialization_fences':
            ids={i['id'] for i in prepared['expectedItems']}|{f['id'] for f in tables['assessment_forms']}|{p['id'] for p in tables['assessment_pools']}
            p='entity_id not in ('+','.join(lit(v) for v in sorted(ids))+')'
        fp(s,t)  # Validate identifiers before incorporating the guarded inventory.
        scopes.append(dict(schema=s,table=t,predicate=p,state=b['state']))
    sql += [f"for saved_row in select value from jsonb_array_elements({jsql(scopes)}) loop",
        "execute format('select jsonb_build_object(''rows'',count(*),''md5'',md5(coalesce(string_agg(md5(to_jsonb(r)::text), order by md5(to_jsonb(r)::text)),))) from %I.%I r',saved_row->>'schema',saved_row->>'table') into actual;",
        "if actual is distinct from saved_row->'state' then raise exception 'preflight_drift:%.%',saved_row->>'schema',saved_row->>'table';end if;",
        "execute format('select jsonb_build_object(''rows'',count(*),''md5'',md5(coalesce(string_agg(md5(to_jsonb(r)::text), order by md5(to_jsonb(r)::text)),))) from %I.%I r where %s',saved_row->>'schema',saved_row->>'table',saved_row->>'predicate') into actual;",
        "saved:=saved||jsonb_build_array(saved_row||jsonb_build_object('state',actual));end loop;"]
    sql += [f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null and reconciliation_id='{base.RECON}') or exists(select 1 from public.assessment_blueprints where curriculum_release_id='{RELEASE}') then raise exception 'unconfigured_draft_required'; end if;"]
    frozen=[{k:i[k] for k in ['id','version','versionId','snapshotSha256']} for i in prepared['expectedItems']]
    sql += [f'''if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,version integer,"versionId" uuid,"snapshotSha256" text) join public.items i on i.id=x.id and i.version_no=x.version join public.item_versions v on v.id=x."versionId" and v.item_id=i.id and v.version_no=i.version_no where encode(extensions.digest(v.snapshot::text,'sha256'),'hex')=x."snapshotSha256")<>192 then raise exception 'immutable_item_drift';end if;''']
    decision=json.loads(DECISION.read_text())
    audio = inventory['audio']
    sql += [f"if not exists(select 1 from storage.buckets where id='learning-audio' and public=false) then raise exception 'private_audio_bucket_required';end if;"]
    frozen = [{'id':x['id'],'hash':x['sha256'],'family':x['sourceFamilyId']} for x in audio]
    sql += [f"if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,hash text,family uuid) join public.learning_audio_versions a on a.id=x.id join storage.objects o on o.bucket_id=a.bucket_id and o.name=a.object_path where a.revoked_at is null and a.sha256=x.hash and a.source_family_id=x.family and a.curriculum_release_id='{RELEASE}' and a.unit_id='{UNIT}' and a.bucket_id='learning-audio')<>14 then raise exception 'accepted_audio_drift';end if;"]
    sources = [{'id':x['id'],'hash':x['stimulusHash'],'family':x['sourceFamilyId'],'members':x['members']} for x in inventory['sources']]
    sql += [f"if (select count(*) from jsonb_to_recordset({jsql(sources)}) x(id uuid,hash text,family uuid,members jsonb) join public.learning_task_set_versions s on s.id=x.id where s.revoked_at is null and s.source_family_id=x.family and s.members=x.members and s.curriculum_release_id='{RELEASE}' and s.unit_id='{UNIT}' and encode(extensions.digest(s.stimulus::text,'sha256'),'hex')=x.hash)<>28 then raise exception 'accepted_task_set_drift';end if;"]
    sql += [material_publication_guard()]
    sql += [f"if not exists(select 1 from public.academic_mastery_policy_versions p where to_jsonb(p)={jsql(prepared['reusedLifecycle'])}) then raise exception 'accepted_lifecycle_drift';end if;"]
    for t, rows in tables.items():
        columns = ','.join(rows[0])
        sql.append(f"insert into public.{t}({columns}) select {columns} from jsonb_populate_recordset(null::public.{t},prepared_tables->'{t}');")
    sql += [f"perform private.validate_governed_learning_model('{model['id']}');"]
    pools=','.join(lit(p['id']) for p in tables['assessment_pools'])
    sql += [f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{base.RECON}',p.id,'scope_changed',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'C36 owner-authorized provisional 47/48/72 allocation; C29-C35 evidence reused; independent specialist review deferred.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{base.RECON}' where p.id in ({pools}) group by p.id;",
        f"update public.assessment_forms set status='active' where pool_id in ({pools});",
        f"update public.assessment_pools set status='active' where id in ({pools});",
        f"update public.assessment_blueprints set status='pilot',published_at=now() where curriculum_release_id='{RELEASE}';",
        f"update public.curriculum_releases set version_label='English Grade 7 Unit 2 — provisional pilot',source_snapshot=source_snapshot||jsonb_build_object('reviewCatalogueScope',source_snapshot->'scope','scope','Owner-authorized enrolled-learner Unit 2 provisional pilot','learnerActivationAuthorized',true,'wholeBankProposalPending',false,'learnerRelease',source_use),notes=notes||' C36: exact C34 configuration activated under the accepted C35 protected provisional-pilot packet. Independent specialist review deferred; existing owner source-use basis retained; Unit 1 and programme records unchanged.' where id='{RELEASE}';"]
    gates={'official_programme_identified':'C32 registered English source chain and official Topic 2 identified','normative_sources_registered':'C32 reused governing-source registrations and programme bindings','outcomes_reconciled':'C32 ten Topic 2 outcomes reconciled','skills_mapped':'C32 fifteen skills, nineteen outcome links and 192 family traces','assessment_scope_bound':'C33 five exact forms; C34 accepted numerical contract/rehearsal; C36 normal policy binders','content_qa_passed':'C29/C30/C31 saved technical QA evidence and C32 owner report of completed 192-question/nine-material approvals reused without a new review'}
    for code,basis in gates.items():
        sql += [f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence=source_use||jsonb_build_object('basis',{lit(basis)},'automatedTechnicalCheck',true,'newHumanReview',false),notes={lit(basis+'; owner-authorized provisional scope only.')} where curriculum_release_id='{RELEASE}' and gate_code='{code}';"]
    sql += [f"update public.curriculum_releases set status='pilot' where id='{RELEASE}';",
        f"update public.learning_model_runtime_bindings set status='active' where id='{tables['learning_model_runtime_bindings'][0]['id']}';",
        f"perform public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;"]
    # One private configuration literal supplies both insertion and exact readback.
    # Only the approved status transitions are applied to expected row values.
    for t,rows in tables.items():
        final = "e"
        if t in ('assessment_forms','assessment_pools','learning_model_runtime_bindings'):
            final = "e||'{\"status\":\"active\"}'::jsonb"
        elif t == 'assessment_blueprints':
            final = "e||'{\"status\":\"pilot\"}'::jsonb"
        sql += [f"if (select count(*) from jsonb_array_elements(prepared_tables->'{t}') e where exists(select 1 from public.{t} t where to_jsonb(t) @> ({final})))<>{len(rows)} then raise exception 'configuration_readback:{t}';end if;"]
    sql += [f"if not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) or (select reviewed_by from public.curriculum_reconciliation_runs where id='{base.RECON}') is not null then raise exception 'specialist_gate_must_stay_pending';end if;",
        "for saved_row in select value from jsonb_array_elements(saved) loop execute format('select jsonb_build_object(''rows'',count(*),''md5'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),''''))) from %I.%I r where %s',saved_row->>'schema',saved_row->>'table',saved_row->>'predicate') into actual; if actual is distinct from saved_row->'state' then raise exception 'preservation_failed:%.%',saved_row->>'schema',saved_row->>'table';end if;end loop;",
        f"perform set_config('haiedu.activation_result',jsonb_build_object('status','verified_before_transaction_end','commitRequested',{str(commit).lower()},'observedAt',clock_timestamp(),'preservedScopes',jsonb_array_length(saved),'preservation',saved,'configurationRows',516,'specialistGate','pending','release',(select to_jsonb(r) from public.curriculum_releases r where id='{RELEASE}'),'policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',pb.policy_snapshot) order by b.purpose) from public.assessment_policy_bindings pb join public.assessment_blueprints b on b.id=pb.assessment_blueprint_id where pb.curriculum_release_id='{RELEASE}'))::text,true);",
        'end $activation$;', "select current_setting('haiedu.activation_result')::jsonb data;", 'commit;' if commit else 'rollback;']
    return tables, '\n'.join(sql)+'\n'

def compact_activation_sql(tables, source_use, guard, commit=False):
    """Pin the independently verified staged database by one full-state digest.

    The digest covers every row in all 117 public/private tables, not merely
    counts or intended release rows. Storage protection is checked separately.
    The same full-state read is compared after rehearsal rollback. Scoped
    before/after fingerprints retain every unrelated row during activation.
    """
    require(isinstance(guard,dict) and guard.get('tableCount') == 117 and base.re.fullmatch('[a-f0-9]{64}',guard.get('sha256','')), 'Complete staged database digest required')
    model=tables['learning_model_configurations'][0]['id'];runtime=tables['runtime_builds'][0]['id'];binding=tables['learning_model_runtime_bindings'][0]['id']
    pool_ids=','.join(lit(x['id']) for x in tables['assessment_pools'])
    predicates={
      ('public','assessment_pools'):f"id not in ({pool_ids})",
      ('public','assessment_pool_items'):f"pool_id not in ({pool_ids})",
      ('public','assessment_forms'):f"pool_id not in ({pool_ids})",
      ('public','assessment_form_items'):f"form_id not in(select id from public.assessment_forms where pool_id in ({pool_ids}))",
      ('public','runtime_builds'):f"id<>'{runtime}'",
      ('public','learning_model_configurations'):f"id<>'{model}'",
      ('public','assessment_blueprints'):f"curriculum_release_id<>'{RELEASE}'",
      ('public','assessment_blueprint_items'):f"assessment_blueprint_id not in(select id from public.assessment_blueprints where curriculum_release_id='{RELEASE}')",
      ('public','learning_model_runtime_bindings'):f"curriculum_release_id<>'{RELEASE}'",
      ('public','curriculum_releases'):f"id<>'{RELEASE}'",
      ('public','curriculum_release_gate_checks'):f"curriculum_release_id<>'{RELEASE}'",
      ('public','assessment_policy_bindings'):f"curriculum_release_id<>'{RELEASE}'",
      ('private','active_curriculum_release_units'):f"curriculum_release_id<>'{RELEASE}'",
      ('public','assessment_pool_curriculum_reconciliations'):f"reconciliation_id<>'{base.RECON}'",
      ('private','mastery_form_selection_bindings'):f"assessment_policy_binding_id not in(select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')",
      ('private','mastery_form_serialization_fences'):f"entity_id not in(select id from public.items where code like 'ENG7-U02-%' union select id from public.assessment_pools where id in ({pool_ids}) union select id from public.assessment_forms where pool_id in ({pool_ids}))",
    }
    # This inventory shape exactly matches the independently collected guard.
    aggregate="select jsonb_build_object('row_count',count(*),'fingerprint',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),''))) from %I.%I r"
    sql=['begin;',"set local lock_timeout='5s';","set local statement_timeout='120s';",
         f"do $activation$ declare source_use jsonb:={jsql(source_use)};inventory jsonb:='[]';saved jsonb:='[]';actual jsonb;x jsonb;guard_table record;guard_predicate text;begin",
         'lock table public.items,public.item_versions,public.item_templates,public.item_curriculum_scopes,public.curriculum_release_skills,public.curriculum_release_item_families,public.learning_task_set_versions,public.learning_audio_versions,public.unit_material_versions,public.written_task_versions,public.academic_mastery_policy_versions in share mode;',
         f"perform id from public.curriculum_releases where id='{RELEASE}' for update;",
         "perform id from storage.buckets where id='learning-audio' for share;",
         "if not exists(select 1 from storage.buckets where id='learning-audio' and public=false) then raise exception 'private_audio_bucket_required';end if;",
         f"if (select count(*) from public.learning_audio_versions a join storage.objects o on o.bucket_id=a.bucket_id and o.name=a.object_path where a.curriculum_release_id='{RELEASE}' and a.unit_id='{UNIT}' and a.revoked_at is null and a.bucket_id='learning-audio')<>14 then raise exception 'audio_objects_required';end if;",
         "for guard_table in select schemaname,tablename from pg_tables where schemaname in('public','private') order by schemaname,tablename loop",
         f"execute format({lit(aggregate)},guard_table.schemaname,guard_table.tablename) into actual;",
         "inventory:=inventory||jsonb_build_array(actual||jsonb_build_object('schema_name',guard_table.schemaname,'table_name',guard_table.tablename));guard_predicate:='true';"]
    for (schema,table),predicate in predicates.items():
        sql.append(f"if guard_table.schemaname='{schema}' and guard_table.tablename='{table}' then guard_predicate:={lit(predicate)};end if;")
    sql += [f"if guard_predicate<>'true' then execute format({lit(aggregate+' where %s')},guard_table.schemaname,guard_table.tablename,guard_predicate) into actual;end if;",
            "saved:=saved||jsonb_build_array(jsonb_build_object('schema',guard_table.schemaname,'table',guard_table.tablename,'predicate',guard_predicate,'state',actual));end loop;",
            f"if jsonb_array_length(inventory)<>117 or encode(extensions.digest(inventory::text,'sha256'),'hex')<>'{guard['sha256']}' then raise exception 'staged_database_drift';end if;",
            f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null and reconciliation_id='{base.RECON}') or (select count(*) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' and status='draft')<>4 then raise exception 'verified_staged_draft_required';end if;",
            material_publication_guard(),
            f"perform private.validate_governed_learning_model('{model}');",
            f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{base.RECON}',p.id,'scope_changed',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'C36 owner-authorized protected provisional 47/48/72 allocation; C29-C35 evidence reused; specialist review deferred.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{base.RECON}' where p.id in ({pool_ids}) group by p.id;",
            f"update public.assessment_forms set status='active' where pool_id in ({pool_ids});",
            f"update public.assessment_pools set status='active' where id in ({pool_ids});",
            f"update public.assessment_blueprints set status='pilot',published_at=now() where curriculum_release_id='{RELEASE}';",
            f"update public.curriculum_releases set version_label='English Grade 7 Unit 2 — provisional pilot',source_snapshot=source_snapshot||jsonb_build_object('reviewCatalogueScope',source_snapshot->'scope','scope','Owner-authorized enrolled-learner Unit 2 provisional pilot','learnerActivationAuthorized',true,'wholeBankProposalPending',false,'learnerRelease',source_use),notes=notes||' C36: exact C34 configuration activated under the accepted C35 protected pilot packet; specialist review deferred, Unit 1 and programme records preserved.' where id='{RELEASE}';"]
    gates={'official_programme_identified':'C32 official Topic 2 source chain','normative_sources_registered':'C32 governing sources and programme bindings','outcomes_reconciled':'C32 ten Topic 2 outcomes','skills_mapped':'C32 fifteen skills, nineteen outcome links, 192 family traces','assessment_scope_bound':'C33/C34 accepted exact policy/forms; C36 normal binders','content_qa_passed':'C29-C31 saved QA and C32 owner report of completed question/material approvals reused without new review'}
    for code,basis in gates.items():
        sql.append(f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence=source_use||jsonb_build_object('basis',{lit(basis)},'automatedTechnicalCheck',true,'newHumanReview',false),notes={lit(basis+'; owner-authorized provisional scope only.')} where curriculum_release_id='{RELEASE}' and gate_code='{code}';")
    sql += [f"update public.curriculum_releases set status='pilot' where id='{RELEASE}';",
            f"update public.learning_model_runtime_bindings set status='active' where id='{binding}';",
            f"perform public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;",
            f"if (select count(*) from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')<>4 or not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) or (select reviewed_by from public.curriculum_reconciliation_runs where id='{base.RECON}') is not null then raise exception 'exact_policies_and_pending_specialist_required';end if;",
            "for x in select value from jsonb_array_elements(saved) loop",
            f"execute format({lit(aggregate+' where %s')},x->>'schema',x->>'table',x->>'predicate') into actual;",
            "if actual is distinct from x->'state' then raise exception 'preservation_failed:%.%',x->>'schema',x->>'table';end if;end loop;",
            f"perform set_config('haiedu.activation_result',jsonb_build_object('status','verified_before_transaction_end','commitRequested',{str(commit).lower()},'observedAt',clock_timestamp(),'preservedScopes',117,'preservation',saved,'configurationRows',516,'specialistGate','pending','release',(select to_jsonb(r) from public.curriculum_releases r where id='{RELEASE}'),'policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',pb.policy_snapshot) order by b.purpose) from public.assessment_policy_bindings pb join public.assessment_blueprints b on b.id=pb.assessment_blueprint_id where pb.curriculum_release_id='{RELEASE}'))::text,true);",
            'end $activation$;',"select current_setting('haiedu.activation_result')::jsonb data;",'commit;' if commit else 'rollback;']
    return '\n'.join(sql)+'\n'

def stage_batches(tables, commit=False):
    """Small idempotent draft-only imports; exact values checked before COMMIT."""
    result=[]
    for table,rows in tables.items():
        chunks=[];chunk=[]
        for row in rows:
            if chunk and len(jsql(chunk+[row]))>18000: chunks.append(chunk);chunk=[]
            chunk.append(row)
        if chunk: chunks.append(chunk)
        for chunk in chunks:
            columns=','.join(chunk[0])
            sql=['begin;',"set local lock_timeout='5s';","set local statement_timeout='60s';",
                 f"do $stage$ declare expected jsonb:={jsql(chunk)};begin",
                 f"perform id from public.curriculum_releases where id='{RELEASE}' for update;",
                 f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null) then raise exception 'inactive_unit2_required';end if;",
                 f"insert into public.{table}({columns}) select {columns} from jsonb_populate_recordset(null::public.{table},expected) on conflict do nothing;",
                 f"if (select count(*) from jsonb_array_elements(expected) e where exists(select 1 from public.{table} t where to_jsonb(t) @> e))<>{len(chunk)} then raise exception 'stage_mismatch:{table}';end if;",
                 'end $stage$;',f"select '{table}' staged_table,{len(chunk)} exact_rows, true inactive_release;",'commit;' if commit else 'rollback;']
            result.append('\n'.join(sql)+'\n')
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ('configuration','inventory','baseline','owner','output'): p.add_argument('--'+arg,type=Path,required=True)
    p.add_argument('--commit',action='store_true')
    p.add_argument('--database-guard',type=Path)
    modes=p.add_mutually_exclusive_group()
    modes.add_argument('--staged',action='store_true',help='Activate an independently verified inactive import')
    modes.add_argument('--stage-batches',action='store_true',help='Prepare small inactive import transactions')
    a=p.parse_args(); read=lambda p:json.loads(p.read_text())
    require(not a.output.resolve().is_relative_to(ROOT), 'Detailed output must remain outside the public repository')
    tables,sql=build(a.configuration,read(a.inventory),read(a.baseline),read(a.owner),a.commit,a.staged,read(a.database_guard) if a.database_guard else None)
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/'activated-tables.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2)+'\n')
    if a.stage_batches:
        for index,statement in enumerate(stage_batches(tables,a.commit)):
            (a.output/f'stage-{index:02}.sql').write_text(statement)
    else:
        (a.output/('activate.sql' if a.commit else 'rehearse.sql')).write_text(sql)
    print(json.dumps({'mode':'commit' if a.commit else 'rollback','rows':sum(map(len,tables.values())),'sqlBytes':len(sql.encode())}))

if __name__=='__main__': main()
