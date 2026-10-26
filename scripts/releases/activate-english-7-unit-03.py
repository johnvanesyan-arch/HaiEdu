"""Compile the exact owner-authorized Unit 3 provisional pilot; default ROLLBACK.

This subject-aware operator consumes retained private configuration and narrow
metadata reads. It creates no content, approvals, identities or learner evidence.
All normal database validators and immutable-release triggers remain enabled.
"""
import argparse
import copy
from datetime import datetime
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('unit3_configuration', Path(__file__).with_name('prepare-english-7-unit-03-configuration.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
RELEASE, PROGRAM, UNIT = base.RELEASE, base.PROGRAM, base.UNIT
SOURCE = 'fa5dc8108f9a357a20b74e0a19b3865b8192e625'
CONFIG = ROOT / 'docs/content/english-7-unit-03-configuration-summary.json'
DECISION = ROOT / 'docs/content/english-7-unit-03-release-decision.json'
READ = ROOT / 'docs/content/english-7-unit-03-read-contract.json'
FIXTURES = ROOT / 'docs/qa/english-unit3-fixture-plan.json'
MATERIALS = ROOT / 'docs/content/english-7-unit-03-material-acceptance-proposal.json'
OWNER = ROOT / 'docs/evidence/english-7-unit-03-owner-activation-20261026.json'
require, lit, jsql = base.require, base.lit, base.jsql
read = lambda p: json.loads(Path(p).read_text())


def validate_owner(owner):
    require(owner.get('owner') == 'John' and owner.get('action') == 'activate_provisional_pilot', 'Bounded owner activation required')
    require(owner.get('scope') == dict(subjectProgramId=PROGRAM, curriculumReleaseId=RELEASE, unitId=UNIT), 'Exact Unit 3 scope required')
    require(owner.get('preparedSourceCommit') == SOURCE, 'Exact prepared source required')
    for key, path in [('configurationSha256', CONFIG), ('decisionManifestSha256', DECISION), ('readContractSha256', READ), ('fixturePlanSha256', FIXTURES)]:
        require(owner.get(key) == base.sha(path), 'Exact owner decision hash required: ' + key)
    require(owner.get('protectedConfigurationSha256') == read(CONFIG)['protectedConfigurationSha256'], 'Exact private configuration hash required')
    require(owner.get('specialistReview') == 'deferred' and owner.get('independentSmeApproved') is False
            and owner.get('unseenAssessmentClaim') is False, 'Provisional review limits required')
    require(owner.get('sourceUseBasis') == 'existing_owner_course_instructions'
            and owner.get('sourceUseScope') == 'authenticated_enrolled_unit3_learners'
            and owner.get('publicDownloadsAuthorized') is False, 'Bounded protected source use required')
    require(all(isinstance(owner.get(k), str) and owner[k].strip() for k in ['ownerDirection', 'recordedAt']), 'Actual dated owner direction required')
    require(datetime.fromisoformat(owner['recordedAt'].replace('Z', '+00:00')).tzinfo is not None, 'Timezone required')


def validate_publication(observed):
    expected = {m['id']: m for m in read(MATERIALS)['materialVersions']}
    actual = {m['id']: m for m in observed['materials']}
    require(len(actual) == len(observed['materials']) == 9 and actual.keys() == expected.keys(), 'Exact nine published materials required')
    for mid, m in actual.items():
        e = expected[mid]
        require(m['status'] == 'approved' and all(m[k] == e[k] for k in ['version', 'kind', 'fingerprint']), 'Accepted publication drift')
        require(m['key'] == e['key'] and base.re.fullmatch('[a-f0-9]{64}', m['definitionHash']), 'Exact material identity required')
    guides = [dict(id=m['id'], version=m['version'], sequenceOrder=m['sequenceOrder']) for m in observed['materials'] if m['kind'] == 'guide']
    require(guides == read(READ)['guides']['identities'], 'Accepted guide order drift')
    tasks = observed['writingTasks']
    expected_task = read(READ)['writingTask']
    require(len(tasks) == 1 and all(tasks[0][k] == v for k, v in expected_task.items()), 'Exact writing projection required')
    task = tasks[0]
    require(task['status'] == 'approved' and task['definitionHash'] == actual[task['id']]['definitionHash']
            and task['reviewEvidence']['fingerprint'] == actual[task['id']]['fingerprint'], 'Published writing hash required')


def load_configuration(config_path, inventory, observed):
    summary, decision = read(CONFIG), read(DECISION)
    require(base.sha(config_path) == summary['protectedConfigurationSha256'] == decision['configuration']['protectedConfigurationSha256'], 'Exact protected C45 configuration required')
    prepared = read(config_path)
    require(prepared['scope'] == decision['scope'] and prepared['policies'] == summary['policies'], 'Accepted configuration drift')
    require(prepared['expectedItems'] == inventory['items']['items'], 'Immutable question/version metadata drift')
    current = inventory['current']
    require(current['release']['status'] == 'draft' and current['release']['activated_at'] is None
            and current['release']['reconciliation_id'] == base.RECON
            and not current['blueprints'] and not current['pools'] and not current['runtimeBindings'], 'Unconfigured draft required')
    require(prepared['reusedLifecycle'] in current['policies'], 'Accepted lifecycle drift')
    sources = decision['sourceInventory']['initiallyAllocatedTaskSets'] + decision['sourceInventory']['optionalTaskSetsOutsideInitialAllocation']
    by_id = {s['id']: s for s in sources}
    require(len(by_id) == len(inventory['sources']) == 27, 'Exact task sets required')
    for s in inventory['sources']:
        e = by_id.get(s['id'])
        require(e and s['revokedAt'] is None and all(s[k] == e[k] for k in ['sourceFamilyId', 'kind', 'audioVersionId', 'stimulusHash']), 'Accepted source drift')
        members = [dict(itemId=i['id'], skillId=i['skillId'], version=i['version']) for i in prepared['expectedItems'] if i['stimulus'].get('taskSetVersionId') == s['id']]
        require(sorted(s['members'], key=lambda x: x['itemId']) == sorted(members, key=lambda x: x['itemId']) and len(members) == e['memberCount'], 'Source membership drift')
    expected_audio = {a['id']: a for a in decision['sourceInventory']['audio']}
    require(len(expected_audio) == len(inventory['audio']) == len(observed['audio']) == 16, 'Exact recordings required')
    for a in inventory['audio']:
        e = expected_audio.get(a['id'])
        require(e and a['revokedAt'] is None and all(a[k] == e[k] for k in ['sha256', 'sourceFamilyId']), 'Accepted audio drift')
    require(observed['bucket'] == {'id': 'learning-audio', 'public': False}, 'Private audio bucket required')
    for a in observed['audio']:
        e = expected_audio.get(a['id'])
        require(e and a['revokedAt'] is None and a['objectPresent'] and a['bucketId'] == 'learning-audio'
                and all(a[k] == e[k] for k in ['sha256', 'sourceFamilyId', 'byteLength'])
                and int(a['storedBytes']) == a['byteLength'], 'Exact protected audio object required')
    require(len(observed['directMediaAccess']) == 2 and all(not x['anonSelect'] and not x['authenticatedSelect'] for x in observed['directMediaAccess']), 'Protected source table access required')
    require(observed['itemExposureCount'] == observed['sourceExposureCount'] == 0, 'Unexpected pre-activation exposure')
    require(len(observed['gates']) == 7 and all(x['status'] == 'pending' for x in observed['gates']), 'Expected pending release gates')
    validate_publication(observed)
    for name, digest in prepared['tables']['runtime_builds'][0]['implementation_manifest']['sourceFiles'].items():
        require(base.sha(ROOT / name) == digest, 'Reused runtime source drift')
    return prepared


def preservation_scopes(baseline, tables, prepared):
    require(len(baseline) >= 117 and len({(x['schema'], x['table']) for x in baseline}) == len(baseline), 'Complete preservation inventory required')
    scopes = []
    for row in baseline:
        s, t = row['schema'], row['table']
        require(s in ('public', 'private') and base.re.fullmatch('[a-z_]+', t), 'Unsafe preservation identifier')
        p = 'true'
        if s == 'public' and t in tables:
            rows = tables[t]
            key = next(k for k in ['id', 'pool_id', 'form_id', 'assessment_blueprint_id'] if k in rows[0])
            p = key + ' not in (' + ','.join(lit(v) for v in sorted({r[key] for r in rows})) + ')'
        elif s == 'public' and t == 'curriculum_releases':
            p = f"id<>'{RELEASE}'"
        elif t in ['curriculum_release_gate_checks', 'assessment_policy_bindings', 'active_curriculum_release_units']:
            p = f"curriculum_release_id<>'{RELEASE}'"
        elif t == 'assessment_pool_curriculum_reconciliations':
            p = f"reconciliation_id<>'{base.RECON}'"
        elif s == 'private' and t == 'mastery_form_selection_bindings':
            p = f"assessment_policy_binding_id not in(select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')"
        elif s == 'private' and t == 'mastery_form_serialization_fences':
            ids = {i['id'] for i in prepared['expectedItems']} | {f['id'] for f in tables['assessment_forms']} | {r['id'] for r in tables['assessment_pools']}
            p = 'entity_id not in (' + ','.join(lit(v) for v in sorted(ids)) + ')'
        scopes.append(dict(schema=s, table=t, predicate=p))
    return scopes


def build(config_path, inventory, observed, baseline, owner, commit=False):
    validate_owner(owner)
    require(owner == read(OWNER), 'Exact recorded owner direction required')
    prepared = load_configuration(config_path, inventory, observed)
    tables = copy.deepcopy(prepared['tables'])
    disposition = {'qualification': 'owner_authorized_provisional_pilot', 'independentSmeApproved': False,
                   'independentSmeReview': 'deferred', 'learnerActivationAuthorized': True,
                   'ownerDecisionSha256': base.sha(OWNER), 'exposureDisposition': 'protected_owner_authorized_provisional_pilot',
                   'empiricalEquivalenceEstablished': False}
    for t in ['assessment_pools', 'assessment_forms']:
        for r in tables[t]:
            r['metadata'].update(disposition)
    for r in tables['assessment_blueprints']:
        r['configuration_snapshot'].update(disposition)
    model = tables['learning_model_configurations'][0]
    model['deployment_manifest'].update(disposition, activationAuthorization=owner)
    model['notes'] = 'Owner-approved English Unit 3 model; provisional pilot with independent specialist review deferred; no empirical calibration claim.'
    tables['learning_model_runtime_bindings'][0]['notes'] = 'Explicit English model and existing immutable lifecycle; global lifecycle pointer unchanged.'
    source_use = {'checkpoint': '16.1C.47', 'preparedSourceCommit': SOURCE,
                  'configurationSha256': base.sha(CONFIG), 'protectedConfigurationSha256': base.sha(config_path),
                  'decisionManifestSha256': base.sha(DECISION), 'ownerAuthorization': owner,
                  'specialistGate': 'pending', 'independentSmeApproved': False, 'unseenAssessmentClaim': False}
    # The retained recipe is validated here; database execution uses bounded
    # inactive imports followed by compact_activation_sql with a verified guard.
    # Large direct-transaction transport was rejected by the connector.
    preservation_scopes(baseline, tables, prepared)
    return tables


def stage_batches(tables, commit=False):
    """Small idempotent draft-only imports; exact values checked before COMMIT."""
    require(set(tables) == {'assessment_pools', 'assessment_pool_items', 'runtime_builds', 'learning_model_configurations',
                           'assessment_blueprints', 'assessment_blueprint_items', 'assessment_forms', 'assessment_form_items',
                           'learning_model_runtime_bindings'}, 'Exact configuration tables required')
    result = []
    for table, rows in tables.items():
        if table in ['assessment_pools', 'assessment_forms', 'assessment_blueprints']:
            require(all(r.get('status') == 'draft' for r in rows), 'Draft-only configuration import required')
        if table == 'learning_model_runtime_bindings':
            require(all(r.get('status') == 'inactive' for r in rows), 'Inactive runtime import required')
        chunks, chunk = [], []
        for row in rows:
            if chunk and len(jsql(chunk + [row])) > 18000:
                chunks.append(chunk)
                chunk = []
            chunk.append(row)
        if chunk:
            chunks.append(chunk)
        for chunk in chunks:
            columns = ','.join(chunk[0])
            sql = ['begin;', "set local lock_timeout='5s';", "set local statement_timeout='60s';",
                   f"do $stage$ declare expected jsonb:={jsql(chunk)};begin",
                   f"perform id from public.curriculum_releases where id='{RELEASE}' for update;",
                   f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null) then raise exception 'inactive_unit3_required';end if;",
                   f"insert into public.{table}({columns}) select {columns} from jsonb_populate_recordset(null::public.{table},expected) on conflict do nothing;",
                   f"if (select count(*) from jsonb_array_elements(expected) e where exists(select 1 from public.{table} t where to_jsonb(t) @> e))<>{len(chunk)} then raise exception 'stage_mismatch:{table}';end if;",
                   'end $stage$;', f"select '{table}' staged_table,{len(chunk)} exact_rows,true inactive_release;",
                   'commit;' if commit else 'rollback;']
            result.append('\n'.join(sql) + '\n')
    return result


def compact_activation_sql(tables, owner, baseline, observation, database_guard, commit=False):
    """Atomic activation of independently verified inactive rows.

    The guard covers every row in all public/private tables, including current
    versions, sources, accepted materials and the exact staged configuration.
    Storage privacy and all sixteen object identities/sizes are checked again.
    """
    validate_owner(owner)
    require(owner == read(OWNER), 'Exact recorded owner direction required')
    require(database_guard.get('tableCount') == len(baseline) >= 117
            and base.re.fullmatch('[a-f0-9]{64}', database_guard.get('sha256', '')), 'Complete verified staged digest required')
    validate_publication(observation)
    prepared_items = [{'id': x['item_id']} for x in tables['assessment_pool_items']]
    scopes = preservation_scopes(baseline, tables, {'expectedItems': prepared_items})
    model = tables['learning_model_configurations'][0]['id']
    binding = tables['learning_model_runtime_bindings'][0]['id']
    pools = ','.join(lit(x['id']) for x in tables['assessment_pools'])
    source_use = {'checkpoint': '16.1C.47', 'preparedSourceCommit': SOURCE,
                  'configurationSha256': base.sha(CONFIG), 'protectedConfigurationSha256': owner['protectedConfigurationSha256'],
                  'decisionManifestSha256': base.sha(DECISION), 'ownerAuthorization': owner,
                  'specialistGate': 'pending', 'independentSmeApproved': False, 'unseenAssessmentClaim': False}
    aggregate = "select jsonb_build_object('rows',count(*),'md5',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),''))) from %I.%I r"
    # Keep identifiers scoped but avoid repeating all 160 IDs in the transport.
    for x in scopes:
        if x['schema'] == 'private' and x['table'] == 'mastery_form_serialization_fences':
            x['predicate'] = f"entity_id not in(select id from public.items where code like 'ENG7-U03-%' union select id from public.assessment_pools where id in ({pools}) union select id from public.assessment_forms where pool_id in ({pools}))"
    predicates = {x['schema'] + '.' + x['table']: x['predicate'] for x in scopes if x['predicate'] != 'true'}
    sql = ['begin;', "set local lock_timeout='5s';", "set local statement_timeout='120s';",
           f"do $activation$ declare source_use jsonb:={jsql(source_use)};inventory jsonb:='[]';saved jsonb:='[]';actual jsonb;x jsonb;c47_table record;c47_predicate text;begin",
           "for c47_table in select schemaname,tablename from pg_tables where schemaname in('public','private') order by schemaname,tablename loop execute format('lock table %I.%I in share row exclusive mode',c47_table.schemaname,c47_table.tablename);end loop;",
           f"perform id from public.curriculum_releases where id='{RELEASE}' for update;",
           "perform id from storage.buckets where id='learning-audio' for share;",
           "if not exists(select 1 from storage.buckets where id='learning-audio' and public=false) then raise exception 'private_audio_bucket_required';end if;",
           f"perform o.id from storage.objects o join public.learning_audio_versions a on a.bucket_id=o.bucket_id and a.object_path=o.name where a.curriculum_release_id='{RELEASE}' for share of o;",
           f"if (select count(*) from public.learning_audio_versions a join storage.objects o on o.bucket_id=a.bucket_id and o.name=a.object_path where a.curriculum_release_id='{RELEASE}' and a.unit_id='{UNIT}' and a.revoked_at is null and a.bucket_id='learning-audio' and (o.metadata->>'size')::bigint=a.byte_length)<>16 then raise exception 'all_protected_audio_objects_required';end if;",
           "if has_table_privilege('anon','public.learning_audio_versions','SELECT') or has_table_privilege('authenticated','public.learning_audio_versions','SELECT') or has_table_privilege('anon','public.learning_task_set_versions','SELECT') or has_table_privilege('authenticated','public.learning_task_set_versions','SELECT') then raise exception 'protected_source_table_access_required';end if;",
           "for c47_table in select schemaname,tablename from pg_tables where schemaname in('public','private') order by schemaname,tablename loop",
           f"c47_predicate:=coalesce({jsql(predicates)}->>(c47_table.schemaname||'.'||c47_table.tablename),'true');",
           "x:=jsonb_build_object('schema',c47_table.schemaname,'table',c47_table.tablename,'predicate',c47_predicate);",
           f"execute format({lit(aggregate)},x->>'schema',x->>'table') into actual;",
           "inventory:=inventory||jsonb_build_array(jsonb_build_object('schema',x->>'schema','table',x->>'table','state',actual));",
           f"execute format({lit(aggregate + ' where %s')},x->>'schema',x->>'table',x->>'predicate') into actual;",
           "saved:=saved||jsonb_build_array(x||jsonb_build_object('state',actual));end loop;",
           f"if (select count(*) from pg_tables where schemaname in('public','private'))<>{len(scopes)} or jsonb_array_length(inventory)<>{len(scopes)} or encode(extensions.digest(inventory::text,'sha256'),'hex')<>'{database_guard['sha256']}' then raise exception 'staged_database_drift';end if;",
           f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null and reconciliation_id='{base.RECON}') or (select count(*) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' and status='draft')<>4 then raise exception 'verified_staged_draft_required';end if;",
           f"perform private.validate_governed_learning_model('{model}');",
           f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{base.RECON}',p.id,'scope_changed',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'C47 owner-authorized protected provisional 52/40/60 allocation; C39-C46 evidence reused; specialist review deferred.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{base.RECON}' where p.id in ({pools}) group by p.id;",
           f"update public.assessment_forms set status='active' where pool_id in ({pools});",
           f"update public.assessment_pools set status='active' where id in ({pools});",
           f"update public.assessment_blueprints set status='pilot',published_at=now() where curriculum_release_id='{RELEASE}';",
           f"update public.curriculum_releases set version_label='English Grade 7 Unit 3 — provisional pilot',source_snapshot=source_snapshot||jsonb_build_object('reviewCatalogueScope',source_snapshot->'scope','scope','Owner-authorized existing English learners Unit 3 provisional pilot','learnerActivationAuthorized',true,'wholeBankProposalPending',false,'learnerRelease',source_use),notes=notes||' C47: exact C45 configuration activated under accepted C46 protected packet; independent specialist review deferred. Units 1/2 and learner history preserved.' where id='{RELEASE}';"]
    gates = {'official_programme_identified': 'C44 current official Topic 3 source chain', 'normative_sources_registered': 'C44 governing sources and programme bindings',
             'outcomes_reconciled': 'C44 twelve programme outcomes plus separate written-interaction standard target',
             'skills_mapped': 'C44 thirteen skills, seventeen outcome links and 160 family traces',
             'assessment_scope_bound': 'C44/C45 accepted policies, five exact forms and C47 normal binding validators',
             'content_qa_passed': 'C39/C41/C42 saved QA, C43 exact bank approvals, C45 nine publications and W01 projection reused; no repeated human review'}
    for code, basis in gates.items():
        sql.append(f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence=source_use||jsonb_build_object('basis',{lit(basis)},'automatedTechnicalCheck',true,'newHumanReview',false),notes={lit(basis+'; provisional scope only.')} where curriculum_release_id='{RELEASE}' and gate_code='{code}';")
    sql.extend([f"update public.curriculum_releases set status='pilot' where id='{RELEASE}';",
                f"update public.learning_model_runtime_bindings set status='active' where id='{binding}';",
                f"perform public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;",
                f"if (select count(*) from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')<>4 or (select count(*) from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and status='passed')<>6 or not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) or (select reviewed_by from public.curriculum_reconciliation_runs where id='{base.RECON}') is not null then raise exception 'exact_policies_and_pending_specialist_required';end if;",
                'for x in select value from jsonb_array_elements(saved) loop',
                f"execute format({lit(aggregate + ' where %s')},x->>'schema',x->>'table',x->>'predicate') into actual;",
                "if actual is distinct from x->'state' then raise exception 'preservation_failed:%.%',x->>'schema',x->>'table';end if;end loop;",
                f"perform set_config('haiedu.c47_activation',jsonb_build_object('status','verified_before_transaction_end','commitRequested',{str(commit).lower()},'observedAt',clock_timestamp(),'preservedScopes',{len(scopes)},'configurationRows',471,'transactionBaseline',inventory,'preservation',saved,'specialistGate','pending','release',(select to_jsonb(r) from public.curriculum_releases r where id='{RELEASE}'),'policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',pb.policy_snapshot,'skillScope',pb.skill_scope_snapshot) order by b.purpose) from public.assessment_policy_bindings pb join public.assessment_blueprints b on b.id=pb.assessment_blueprint_id where pb.curriculum_release_id='{RELEASE}'),'masteryBinding',(select fb.selection_snapshot from private.mastery_form_selection_bindings fb join public.assessment_policy_bindings pb on pb.id=fb.assessment_policy_binding_id where pb.curriculum_release_id='{RELEASE}'))::text,true);",
                'end $activation$;', "select current_setting('haiedu.c47_activation')::jsonb result;", 'commit;' if commit else 'rollback;'])
    return '\n'.join(sql) + '\n'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for key in ['configuration', 'inventory', 'observation', 'baseline', 'owner', 'output']:
        p.add_argument('--' + key, type=Path, required=True)
    p.add_argument('--commit', action='store_true')
    modes = p.add_mutually_exclusive_group()
    modes.add_argument('--stage', action='store_true', help='Generate small inactive imports')
    modes.add_argument('--staged', action='store_true', help='Activate independently verified inactive imports')
    p.add_argument('--database-guard', type=Path)
    p.add_argument('--verify-only', action='store_true')
    a = p.parse_args()
    require(not a.output.resolve().is_relative_to(ROOT), 'Detailed output must remain outside public repository')
    tables = build(a.configuration, read(a.inventory), read(a.observation), read(a.baseline), read(a.owner), a.commit)
    a.output.mkdir(parents=True, exist_ok=True)
    if a.stage:
        batches = stage_batches(tables, a.commit)
        for n, batch in enumerate(batches):
            (a.output / f'stage-{n:02}.sql').write_text(batch)
        print(json.dumps({'mode': 'inactive_import', 'commitRequested': a.commit, 'batches': len(batches)}))
        return
    if a.verify_only:
        print(json.dumps({'mode': 'validated_recipe', 'configurationRows': sum(len(v) for v in tables.values())}))
        return
    require(a.staged, 'Select --stage, --staged or --verify-only; no implicit production mode')
    if a.staged:
        require(a.database_guard is not None, 'Verified staged database guard required')
        sql = compact_activation_sql(tables, read(a.owner), read(a.baseline), read(a.observation), read(a.database_guard), a.commit)
    (a.output / ('activate.sql' if a.commit else 'rehearse.sql')).write_text(sql)
    (a.output / 'expected-tables.json').write_text(json.dumps(tables, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'mode': 'commit' if a.commit else 'rollback', 'configurationRows': sum(len(v) for v in tables.values()), 'sqlBytes': len(sql.encode())}))


if __name__ == '__main__':
    main()
