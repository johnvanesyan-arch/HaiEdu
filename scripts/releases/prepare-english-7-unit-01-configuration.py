"""Compile the owner-approved English Unit 1 configuration; SQL always rolls back.

No network, credentials, learner records, prompts, keys or approval decisions are
read by this compiler. Inputs are narrow identity/hash inventory and the saved C19
form preflight. Production binding remains a separate authorized release action.
"""
import argparse
import collections
import copy
import hashlib
import json
import re
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = 'e40991ee-ca0b-5666-a9f2-a3453de8fccb'
UNIT = '3ef44139-0053-58e6-ab0d-5901a0213683'
PROGRAM = 'a88ac34c-3b29-5c9d-a5c4-95339b71c067'
RECON = '7f550cb9-79a9-5ca6-b55f-e04f66043825'
SOURCE = 'c19e3fcf4999040eb29e564978d6833da44ad09d'
LIFECYCLE = '514229ff-31e6-406b-a92d-eedda258d4eb'

def require(value, message):
    if not value:
        raise ValueError(message)

def uid(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://www.haiedu.am/releases/english7_u01_20261022/' + key))

def js(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def lit(value):
    return "'" + value.replace("'", "''") + "'"

def jsql(value):
    return lit(js(value)) + '::jsonb'

def insert(table, rows):
    columns = ','.join(rows[0])
    return f'insert into public.{table}({columns}) select {columns} from jsonb_populate_recordset(null::public.{table},{jsql(rows)});'

def build(inventory, preflight, baseline):
    proposal_path = ROOT / 'docs/content/english-7-unit-01-policy-proposal.json'
    proposal = json.loads(proposal_path.read_text())
    acceptance = json.loads((ROOT / 'docs/evidence/english-7-unit-01-policy-acceptance-20261022.json').read_text())
    require(acceptance['approved'] is True and acceptance['sourceCommit'] == SOURCE
            and acceptance['proposalSha256'] == sha(proposal_path), 'Exact owner-approved proposal required')
    require(acceptance['learnerActivationAuthorized'] is False, 'Preparation has no activation authority')
    require(proposal['scope'] == {'subjectProgramId': PROGRAM, 'curriculumReleaseId': RELEASE, 'unitId': UNIT}, 'Wrong scope')
    current = inventory['current']
    require(current['release']['id'] == RELEASE and current['release']['status'] == 'draft'
            and current['release']['activated_at'] is None and not current['blueprints'] and not current['pools'], 'Expected unconfigured draft')
    life = next(p for p in current['policies'] if p['id'] == LIFECYCLE)
    expected_life = dict(status='active', maximum_mastery_attempts=3, review_required_after_failed_attempts=[1, 2],
                         review_optional_after_pass=True, review_available_after_final_failure=True,
                         additional_attempt_after_final_failure=False, target_review_question_count=12)
    require(all(life[k] == v for k, v in expected_life.items()), 'Approved lifecycle mismatch')
    items = inventory['items']['items']
    byid = {i['id']: i for i in items}
    bycode = {i['code']: i for i in items}
    require(len(items) == len(byid) == len(bycode) == 200, 'Exact 200-item bank required')
    require(preflight['release']['id'] == RELEASE and len(preflight['forms']) == 5, 'Wrong preflight')
    for path, digest in preflight['sourceHashes'].items():
        require(sha(ROOT / path) == digest, 'Changed C19 authoring source: ' + path)
    modelid, runtimeid = uid('model-v1'), uid('runtime-v1')
    policies = []
    for mode, recipe in proposal['modes'].items():
        p = copy.deepcopy(recipe)
        p.update(learningModelConfigurationId=modelid, academicMasteryPolicyId=LIFECYCLE)
        policies.append(p)
    core = [bycode[c] for c in proposal['practicePool']['coreItemCodes']]
    require(len(core) == 58 and not set(proposal['practicePool']['optionalRetained']) & {i['code'] for i in core}, 'Optional scope drift')
    forms, formitems, seen = [], [], set()
    require({f['code'] for f in preflight['forms']} == {'DA', 'DB', 'MA', 'MB', 'MC'}, 'Five exact forms required')
    for f in preflight['forms']:
        mode = 'mastery_check' if f['purpose'] == 'mastery' else f['purpose']
        fid = uid('form-' + f['code'])
        require(len(f['members']) == 28 and len(set(f['presentationOrder'])) == 28, 'Incomplete form')
        require(collections.Counter(m['skillId'] for m in f['members']) == proposal['modes'][mode]['questionCountBySkill'], 'Skill counts changed')
        member_by_code = {m['code']: m for m in f['members']}
        forms.append(dict(id=fid, pool_id=uid('pool-' + mode), code='ENG7-U01-' + f['code'] + '-20261022',
                          name='English 7 Unit 1 ' + f['code'], form_version=1, status='draft',
                          metadata={'sourcePreflight': '16.1C.19', 'qualification': 'pending', 'independentSmeApproved': False,
                                    'exposureDisposition': 'owner_accepted_existing_public_bank', 'empiricalEquivalenceEstablished': False}))
        for slot, code in enumerate(f['presentationOrder'], 1):
            m = member_by_code[code]
            i = byid[m['itemId']]
            require(i['id'] not in seen and i['code'] == code and all(i[k] == m[k] for k in ['version', 'versionId', 'snapshotSha256', 'skillId']), 'C19 immutable binding drift')
            seen.add(i['id'])
            formitems.append(dict(form_id=fid, item_id=i['id'], slot_order=slot,
                                  metadata={'itemVersion': i['version'], 'versionId': i['versionId'], 'snapshotSha256': i['snapshotSha256']}))
    require(len(seen) == 140 and not seen & {i['id'] for i in core}, 'Cross-purpose overlap')
    # Reuse exact deployed capability evidence; do not pretend an older Physics
    # runtime manifest describes the English audio/typed/arrangement contracts.
    audio_path = 'docs/evidence/assessed-listening-release-20261022.json'
    audio = json.loads((ROOT / audio_path).read_text())
    runtime_files = {}
    for bundle in audio['verification']['runtimeBundles']:
        # Privacy inventory was subsequently extended and verified under C17.
        # It is not a scoring/session consumer; preserve that later deployment.
        if bundle['name'] == 'get-my-privacy':
            continue
        require(bundle['sourceMatched'], 'Unverified C12 bundle')
        for path, digest in bundle['files'].items():
            require(sha(ROOT / 'supabase/functions' / path) == digest, 'Runtime source drift: ' + path)
            runtime_files['supabase/functions/' + path] = digest
    migration = audio['implementation']['migration']
    require(sha(ROOT / migration['repositoryPath']) == migration['sha256'], 'C12 SQL source drift')
    runtime_files[migration['repositoryPath']] = migration['sha256']
    runtime = dict(id=runtimeid, build_key='english7-u01-v3-v4-20261022', source_commit=SOURCE,
                   implementation_manifest={'schemaVersion': 'haiedu-english-runtime-evidence-v1', 'sourceFiles': runtime_files,
                                            'reusedEvidence': {audio_path: sha(ROOT / audio_path)},
                                            'newDeployment': False, 'scope': 'Existing deployed normalized scoring, arrangements, task sets and assessed audio'},
                   notes='English-specific provenance snapshot of already deployed shared capabilities; no runtime deployment or learner acceptance asserted.')
    config = copy.deepcopy(proposal['learningModel'])
    config['assessmentPolicyContracts'] = policies
    model = dict(id=modelid, model_key='haiedu_english7_unit1_learning_model', version_label='owner-approved-2026-10-22-v1',
                 configuration_kind='approved', predecessor_id=None, reference_curriculum_release_id=RELEASE,
                 source_commit=SOURCE, configuration=config,
                 deployment_manifest={'runtimeBuildId': runtimeid, 'policyAcceptance': acceptance,
                                      'independentSmeApproved': False, 'empiricallyCalibrated': False, 'learnerActivationAuthorized': False},
                 notes='Owner-approved C21 English model; not a Physics baseline clone. Preparation only; no independent calibration/qualification claim.')
    pools, poolitems, blueprints, bpitems = [], [], [], []
    for p in policies:
        mode = p['mode']
        poolmode = 'practice' if mode == 'chapter_review' else mode
        pid, bid = uid('pool-' + poolmode), uid('blueprint-' + mode)
        selected = core if poolmode == 'practice' else [byid[fi['item_id']] for fi in formitems
                    if fi['form_id'] in {f['id'] for f in forms if f['pool_id'] == pid}]
        selected.sort(key=lambda i: i['id'])
        if mode != 'chapter_review':
            pools.append(dict(id=pid, code='ENG7-U01-' + mode.upper() + '-20261022', unit_code='ENG7-U01', purpose=mode,
                              name='English 7 Unit 1 ' + mode, is_protected=mode != 'practice', status='draft',
                              metadata={'curriculumReleaseId': RELEASE, 'ownerPolicyApproved': True, 'learnerActivationAuthorized': False,
                                        'qualification': 'pending', 'publicExposureDisposition': 'owner_accepted_existing_bank'}))
            poolitems.extend(dict(pool_id=pid, item_id=i['id'], enabled=True, metadata={'itemVersion': i['version']}) for i in selected)
        snapshot = {'assessmentPolicy': p, 'enabledItemCount': len(selected), 'provenance': 'exact_snapshot', 'qualification': 'pending'}
        if mode == 'mastery_check':
            snapshot['masteryFormSelection'] = {'schemaVersion': 'haiedu-mastery-form-selection-v1',
                'selectionStrategy': 'ordered-unseen-whole-form-v1', 'formIds': [uid('form-' + k) for k in ['MA', 'MB', 'MC']]}
        if mode == 'chapter_review':
            snapshot['sourceBlueprintId'] = uid('blueprint-practice')
        fp = hashlib.md5(','.join(i['id'] + ':' + str(i['version']) + ':' + (i['variantFingerprint'] or '') for i in selected).encode()).hexdigest()
        blueprints.append(dict(id=bid, blueprint_key='english7_u01_20261022_' + mode, curriculum_release_id=RELEASE,
                              unit_id=UNIT, assessment_pool_id=pid, purpose=mode, version_number=1, status='draft',
                              selection_policy_version=p['schemaVersion'], configuration_snapshot=snapshot, item_set_fingerprint=fp))
        bpitems.extend(dict(assessment_blueprint_id=bid, item_id=i['id'], item_code_snapshot=i['code'], item_version_snapshot=i['version'],
                            item_template_id=i['templateId'], template_version_snapshot=i['templateVersion'], item_family_id=i['familyId'],
                            variant_key_snapshot=i['variantKey'], variant_fingerprint_snapshot=i['variantFingerprint']) for i in selected)
    binding = dict(id=uid('runtime-binding'), binding_key='english7_u01_current', curriculum_release_id=RELEASE, unit_code='ENG7-U01',
                   learning_model_configuration_id=modelid, runtime_build_id=runtimeid, status='inactive',
                   notes='Prepared only. Explicit English model and existing immutable lifecycle; no global lifecycle pointer change.')
    tables = {'assessment_pools': pools, 'assessment_pool_items': poolitems, 'runtime_builds': [runtime],
              'learning_model_configurations': [model], 'assessment_blueprints': blueprints, 'assessment_blueprint_items': bpitems,
              'assessment_forms': forms, 'assessment_form_items': formitems, 'learning_model_runtime_bindings': [binding]}
    result = {'schemaVersion': 'haiedu-english-release-configuration-v1', 'checkpoint': '16.1C.22', 'sourceCommit': SOURCE,
              'scope': proposal['scope'], 'status': 'prepared_not_registered_or_activated', 'ownerAcceptance': acceptance,
              'policies': policies, 'reusedLifecycle': life, 'optionalRetained': proposal['practicePool']['optionalRetained'],
              'expectedItems': items, 'tables': tables, 'formPreflightSha256': hashlib.sha256(js(preflight).encode()).hexdigest(),
              'runtimeEvidenceReused': True, 'learnerActivationAuthorized': False, 'independentSmeApproved': False}
    require(len(baseline) >= 117 and len({(r['schema'], r['table']) for r in baseline}) == len(baseline), 'Complete preservation inventory required')
    sql = ['-- PREPARATION ONLY. Always ROLLBACK; no commit option is provided.', 'begin;', "set local lock_timeout='5s';", "set local statement_timeout='90s';",
        "create function pg_temp.fp(s text,t text,p text default 'true') returns jsonb language plpgsql as $$ declare x jsonb;begin execute format('select jsonb_build_object(''rows'',count(*),''md5'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),''''))) from %I.%I r where %s',s,t,p) into x;return x;end $$;",
        'create temporary table preserved(s text,t text,p text,b jsonb) on commit drop;',
        'lock table public.items,public.item_versions,public.item_templates,public.item_curriculum_scopes,public.curriculum_release_skills,public.curriculum_release_item_families,public.learning_task_set_versions,public.learning_audio_versions in share mode;',
        f"select id from public.curriculum_releases where id='{RELEASE}' for update;"]
    for row in baseline:
        s, t = row['schema'], row['table']
        require(s in ['public', 'private'] and re.fullmatch('[a-z_]+', t), 'Unsafe inventory identifier')
        predicate = 'true'
        if s == 'public' and t in tables:
            rows = tables[t]
            key = next(k for k in ['id', 'pool_id', 'form_id', 'assessment_blueprint_id'] if k in rows[0])
            predicate = key + ' not in (' + ','.join(lit(v) for v in sorted({r[key] for r in rows})) + ')'
        elif s == 'public' and t == 'curriculum_releases':
            predicate = f"id<>'{RELEASE}'"
        elif t in ['curriculum_release_gate_checks', 'assessment_policy_bindings', 'active_curriculum_release_units']:
            predicate = f"curriculum_release_id<>'{RELEASE}'"
        elif t == 'assessment_pool_curriculum_reconciliations':
            predicate = f"reconciliation_id<>'{RECON}'"
        elif s == 'private' and t == 'mastery_form_selection_bindings':
            predicate = f"assessment_policy_binding_id not in(select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')"
        elif s == 'private' and t == 'mastery_form_serialization_fences':
            newids = {i['id'] for i in items} | {f['id'] for f in forms} | {p['id'] for p in pools}
            predicate = 'entity_id not in (' + ','.join(lit(v) for v in sorted(newids)) + ')'
        sql.append(f"do $$ begin if pg_temp.fp('{s}','{t}') is distinct from {jsql(row['state'])} then raise exception 'preflight_drift:{s}.{t}';end if;end $$;")
        sql.append(f"insert into preserved values('{s}','{t}',{lit(predicate)},pg_temp.fp('{s}','{t}',{lit(predicate)}));")
    sql.append(f"do $$ begin if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null and reconciliation_id='{RECON}') or exists(select 1 from public.assessment_blueprints where curriculum_release_id='{RELEASE}') then raise exception 'unconfigured_draft_required';end if;end $$;")
    # Compare identities and saved immutable content hashes, without re-reviewing
    # content or creating/refreshing QA or approval records.
    frozen = [{k: i[k] for k in ['id', 'version', 'versionId', 'snapshotSha256']} for i in items]
    sql.append(f"do $$ begin if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,version integer,\"versionId\" uuid,\"snapshotSha256\" text) join public.items i on i.id=x.id and i.version_no=x.version join public.item_versions v on v.id=x.\"versionId\" and v.item_id=i.id and v.version_no=i.version_no where encode(extensions.digest(v.snapshot::text,'sha256'),'hex')=x.\"snapshotSha256\")<>200 then raise exception 'immutable_item_drift';end if;end $$;")
    sql.extend(insert(t, rows) for t, rows in tables.items())
    sql.append(f"select private.validate_governed_learning_model('{modelid}');")
    sql.append(f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{RECON}',p.id,'scope_changed',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'Owner-approved C21 core 58/56/84 technical scope; qualification pending; rollback rehearsal only.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{RECON}' where p.id in ({','.join(lit(p['id']) for p in pools)}) group by p.id;")
    sql.append(f"update public.assessment_forms set status='active' where pool_id in ({','.join(lit(p['id']) for p in pools)});")
    sql.append(f"update public.assessment_pools set status='active' where id in ({','.join(lit(p['id']) for p in pools)});")
    sql.append(f"update public.assessment_blueprints set status='pilot',published_at=now() where curriculum_release_id='{RELEASE}';")
    sql.append(f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence=jsonb_build_object('checkpoint','16.1C.22','rehearsalOnly',true,'reusedEvidence','C18/C19/C20/C21'),notes='Technical validator rehearsal only; rolled back. No new content approval or specialist claim.' where curriculum_release_id='{RELEASE}' and gate_code<>'external_sme_approved';")
    sql.append(f"update public.curriculum_releases set status='pilot' where id='{RELEASE}';")
    sql.append(f"update public.learning_model_runtime_bindings set status='active' where id='{binding['id']}';")
    sql.append(f"select public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;")
    sql.append("do $$ declare r record;begin for r in select * from preserved loop if pg_temp.fp(r.s,r.t,r.p) is distinct from r.b then raise exception 'preservation_failed:%.%',r.s,r.t;end if;end loop;end $$;")
    sql.append(f"do $$ begin if not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) then raise exception 'specialist_gate_must_stay_pending';end if;if (select reviewed_by from public.curriculum_reconciliation_runs where id='{RECON}') is not null then raise exception 'reviewer_must_stay_null';end if;end $$;")
    sql.append(f"select jsonb_build_object('status','rehearsed_pending_rollback','observedAt',clock_timestamp(),'preservedScopes',(select count(*) from preserved),'policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',pb.policy_snapshot,'skillScope',pb.skill_scope_snapshot) order by b.purpose) from public.assessment_policy_bindings pb join public.assessment_blueprints b on b.id=pb.assessment_blueprint_id where pb.curriculum_release_id='{RELEASE}'),'masteryBinding',(select fb.selection_snapshot from private.mastery_form_selection_bindings fb join public.assessment_policy_bindings pb on pb.id=fb.assessment_policy_binding_id where pb.curriculum_release_id='{RELEASE}'),'specialistGate','pending','globalLifecyclePointerUnchanged',true) data;")
    sql.append('rollback;')
    return result, '\n'.join(sql) + '\n'

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--inventory', type=Path, required=True)
    p.add_argument('--preflight', type=Path, required=True)
    p.add_argument('--baseline', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    read = lambda path: json.loads(path.read_text())
    config, sql = build(read(a.inventory), read(a.preflight), read(a.baseline))
    a.output.mkdir(parents=True, exist_ok=True)
    (a.output / 'configuration.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    (a.output / 'rehearse.sql').write_text(sql)
    print(json.dumps({'mode': 'rollback_only', 'rows': sum(len(v) for v in config['tables'].values()),
                      'poolItems': len(config['tables']['assessment_pool_items']), 'formItems': len(config['tables']['assessment_form_items'])}))

if __name__ == '__main__':
    main()
