"""Compile a guarded English pilot transaction. Default ROLLBACK; no network.

Reuses the immutable C22 recipe. A bounded, hash-matched owner decision is
required even for rehearsal; --commit only changes the final transaction verb.
No schema, source bytes, content, approval or learner evidence is modified.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('english_configuration', Path(__file__).with_name('prepare-english-7-unit-01-configuration.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
RELEASE, PROGRAM, UNIT = base.RELEASE, base.PROGRAM, base.UNIT
SUBJECT = 'c230d771-0bea-5076-a570-e440f9e05c09'
CONFIG = ROOT / 'docs/content/english-7-unit-01-release-configuration.json'
DECISION = ROOT / 'docs/content/english-7-unit-01-release-decision.json'
SOURCE = 'c4545ba47fd865f47d70f65dd366b21f59e35056'
require, lit, jsql = base.require, base.lit, base.jsql

def validate_owner(owner):
    require(owner.get('owner') == 'John' and owner.get('action') == 'activate_provisional_pilot', 'Bounded owner activation required')
    require(owner.get('scope') == dict(subjectProgramId=PROGRAM, curriculumReleaseId=RELEASE, unitId=UNIT), 'Exact release scope required')
    require(owner.get('decisionManifestSha256') == base.sha(DECISION) and owner.get('configurationSha256') == base.sha(CONFIG), 'Exact decision/configuration hashes required')
    require(owner.get('specialistReview') == 'deferred' and owner.get('independentSmeApproved') is False and owner.get('unseenAssessmentClaim') is False, 'Provisional limits required')
    require(owner.get('learnerSourceUseConfirmed') is True and owner.get('sourceUseScope') == 'authenticated_enrolled_unit1_learners' and owner.get('publicDownloadsAuthorized') is False, 'Bounded learner source-use required')
    require(all(isinstance(owner.get(k), str) and owner[k].strip() for k in ['ownerDirection','recordedAt','recordingProviderVoiceUseBasis','textbookAdaptationUseBasis']), 'Actual owner statement and basis required')

def fp(schema, table, predicate='true'):
    require(schema in ('public','private') and base.re.fullmatch('[a-z_]+',table), 'Unsafe identifier')
    return f"(select jsonb_build_object('rows',count(*),'md5',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),''))) from {schema}.{table} r where {predicate})"

def build(inventory, preflight, baseline, owner, commit=False):
    validate_owner(owner)
    prepared, _ = base.build(inventory, preflight, baseline)
    require(prepared == json.loads(CONFIG.read_text()), 'C22 configuration changed')
    tables = copy.deepcopy(prepared['tables'])
    disposition = {'qualification':'owner_authorized_provisional_pilot','independentSmeApproved':False,'independentSmeReview':'deferred','learnerActivationAuthorized':True,'ownerDecisionSha256':base.sha(ROOT/'docs/evidence/english-7-unit-01-owner-activation-20261023.json')}
    for t in ('assessment_pools','assessment_forms'):
        for r in tables[t]: r['metadata'].update(disposition)
    for r in tables['assessment_blueprints']: r['configuration_snapshot'].update(disposition)
    model = tables['learning_model_configurations'][0]
    model['deployment_manifest'].update(disposition)
    model['deployment_manifest']['activationAuthorization'] = owner
    model['notes'] = 'Owner-approved English-specific model; provisional pilot with independent specialist review deferred; no empirical calibration claim.'
    tables['learning_model_runtime_bindings'][0]['notes'] = 'Explicit English model and existing approved immutable lifecycle; global lifecycle pointer unchanged.'
    source_use = {'checkpoint':'16.1C.25','preparedSourceCommit':SOURCE,'configurationSha256':base.sha(CONFIG),'decisionManifestSha256':base.sha(DECISION),'ownerAuthorization':owner,'specialistGate':'pending','independentSmeApproved':False,'unseenAssessmentClaim':False}
    sql = ['-- Owner-authorized bounded Unit 1 pilot. Generated; do not hand-edit.', 'begin;', "set local lock_timeout='5s';", "set local statement_timeout='120s';",
        'do $activation$ declare saved jsonb:=\'[]\'::jsonb; state jsonb; saved_row jsonb; actual jsonb; begin',
        'lock table public.items,public.item_versions,public.item_templates,public.item_curriculum_scopes,public.curriculum_release_skills,public.curriculum_release_item_families,public.learning_task_set_versions,public.learning_audio_versions in share mode;',
        f"perform id from public.curriculum_releases where id='{RELEASE}' for update;"]
    for b in baseline:
        s,t=b['schema'],b['table']; p='true'
        if s=='public' and t in tables:
            rows=tables[t]; key=next(k for k in ['id','pool_id','form_id','assessment_blueprint_id'] if k in rows[0])
            p=key+' not in ('+','.join(lit(v) for v in sorted({r[key] for r in rows}))+')'
        elif s=='public' and t=='curriculum_releases': p=f"id<>'{RELEASE}'"
        elif s=='public' and t=='subject_programs': p=f"id<>'{PROGRAM}'"
        elif s=='public' and t=='subjects': p=f"id<>'{SUBJECT}'"
        elif t in ['curriculum_release_gate_checks','assessment_policy_bindings','active_curriculum_release_units']: p=f"curriculum_release_id<>'{RELEASE}'"
        elif t=='assessment_pool_curriculum_reconciliations': p=f"reconciliation_id<>'{base.RECON}'"
        elif s=='private' and t=='mastery_form_selection_bindings': p=f"assessment_policy_binding_id not in(select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')"
        elif s=='private' and t=='mastery_form_serialization_fences':
            ids={i['id'] for i in prepared['expectedItems']}|{f['id'] for f in tables['assessment_forms']}|{p['id'] for p in tables['assessment_pools']}
            p='entity_id not in ('+','.join(lit(v) for v in sorted(ids))+')'
        sql += [f"if {fp(s,t)} is distinct from {jsql(b['state'])} then raise exception 'preflight_drift:{s}.{t}'; end if;",
            f"saved:=saved||jsonb_build_array(jsonb_build_object('schema','{s}','table','{t}','predicate',{lit(p)},'state',{fp(s,t,p)}));"]
    sql += [f"if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null and reconciliation_id='{base.RECON}') or exists(select 1 from public.assessment_blueprints where curriculum_release_id='{RELEASE}') then raise exception 'unconfigured_draft_required'; end if;"]
    frozen=[{k:i[k] for k in ['id','version','versionId','snapshotSha256']} for i in prepared['expectedItems']]
    sql += [f'''if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,version integer,"versionId" uuid,"snapshotSha256" text) join public.items i on i.id=x.id and i.version_no=x.version join public.item_versions v on v.id=x."versionId" and v.item_id=i.id and v.version_no=i.version_no where encode(extensions.digest(v.snapshot::text,'sha256'),'hex')=x."snapshotSha256")<>200 then raise exception 'immutable_item_drift';end if;''']
    decision=json.loads(DECISION.read_text())
    for key,table in [('audio','learning_audio_versions'),('taskSets','learning_task_set_versions')]:
        entries=decision['sourceInventory'][key]
        frozen=[{'id':x['id'],'hash':x['rowSha256']} for x in entries]
        sql += [f"if (select count(*) from jsonb_to_recordset({jsql(frozen)}) x(id uuid,hash text) join public.{table} s on s.id=x.id where s.revoked_at is null and encode(extensions.digest(to_jsonb(s)::text,'sha256'),'hex')=x.hash)<>{len(entries)} then raise exception 'accepted_source_drift:{table}';end if;"]
    sql += [base.insert(t,rows) for t,rows in tables.items()]
    sql += [f"perform private.validate_governed_learning_model('{model['id']}');"]
    pools=','.join(lit(p['id']) for p in tables['assessment_pools'])
    sql += [f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{base.RECON}',p.id,'scope_changed',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'C25 owner-authorized provisional 58/56/84 allocation; C19/C20/C22 evidence reused; independent specialist review deferred.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{base.RECON}' where p.id in ({pools}) group by p.id;",
        f"update public.assessment_forms set status='active' where pool_id in ({pools});",
        f"update public.assessment_pools set status='active' where id in ({pools});",
        f"update public.assessment_blueprints set status='pilot',published_at=now() where curriculum_release_id='{RELEASE}';",
        f"update public.subjects set status='published' where id='{SUBJECT}' and status='review';",
        f"update public.subject_programs set status='published',version_label='English Grade 7 — Unit 1 provisional pilot' where id='{PROGRAM}' and status='review';",
        f"update public.curriculum_releases set version_label='English Grade 7 Unit 1 — provisional pilot',source_snapshot=source_snapshot||jsonb_build_object('reviewCatalogueScope',source_snapshot->'scope','scope','Owner-authorized enrolled-learner Unit 1 provisional pilot','learnerRelease',{jsql(source_use)}),notes=notes||' C25 supersedes the inactive scope: owner-created audio and free textbook-adaptation use confirmed; exact C22 configuration activated as provisional pilot; independent specialist review deferred.' where id='{RELEASE}';"]
    gates={'official_programme_identified':'C20 two registered governing sources; official Topic 1 identified','normative_sources_registered':'C20 source chain and programme bindings','outcomes_reconciled':'C20 ten outcomes, complete technical reconciliation','skills_mapped':'C20 fourteen skills, seventeen outcome links, 200 family traces','assessment_scope_bound':'C19 exact forms; C22 approved numerical contract; C25 normal policy binders','content_qa_passed':'C18 accepted 200 current questions and ten materials; unchanged saved approval/QA evidence reused'}
    for code,basis in gates.items():
        evidence={**source_use,'basis':basis,'automatedTechnicalCheck':True,'newHumanReview':False}
        sql += [f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence={jsql(evidence)},notes={lit(basis+'; owner-authorized provisional scope only.')} where curriculum_release_id='{RELEASE}' and gate_code='{code}';"]
    sql += [f"update public.curriculum_releases set status='pilot' where id='{RELEASE}';",
        f"update public.learning_model_runtime_bindings set status='active' where id='{tables['learning_model_runtime_bindings'][0]['id']}';",
        f"perform public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;"]
    # Compare every inserted value, allowing only the explicit activation statuses.
    for t,rows in tables.items():
        final=copy.deepcopy(rows)
        for r in final:
            if t in ('assessment_forms','assessment_pools','learning_model_runtime_bindings'): r['status']='active'
            if t=='assessment_blueprints': r['status']='pilot'
        key=next(k for k in ['id','pool_id','form_id','assessment_blueprint_id'] if k in rows[0])
        sql += [f"if (select count(*) from jsonb_array_elements({jsql(final)}) e where exists(select 1 from public.{t} t where to_jsonb(t) @> e))<>{len(rows)} then raise exception 'configuration_readback:{t}';end if;"]
    sql += [f"if not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) or (select reviewed_by from public.curriculum_reconciliation_runs where id='{base.RECON}') is not null then raise exception 'specialist_gate_must_stay_pending';end if;",
        "for saved_row in select value from jsonb_array_elements(saved) loop execute format('select jsonb_build_object(''rows'',count(*),''md5'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),''''))) from %I.%I r where %s',saved_row->>'schema',saved_row->>'table',saved_row->>'predicate') into actual; if actual is distinct from saved_row->'state' then raise exception 'preservation_failed:%.%',saved_row->>'schema',saved_row->>'table';end if;end loop;",
        f"perform set_config('haiedu.activation_result',jsonb_build_object('status','verified_before_transaction_end','commitRequested',{str(commit).lower()},'observedAt',clock_timestamp(),'preservedScopes',jsonb_array_length(saved),'preservation',saved,'configurationRows',609,'specialistGate','pending','release',(select to_jsonb(r) from public.curriculum_releases r where id='{RELEASE}'),'policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',pb.policy_snapshot) order by b.purpose) from public.assessment_policy_bindings pb join public.assessment_blueprints b on b.id=pb.assessment_blueprint_id where pb.curriculum_release_id='{RELEASE}'))::text,true);",
        'end $activation$;', "select current_setting('haiedu.activation_result')::jsonb data;", 'commit;' if commit else 'rollback;']
    return tables, '\n'.join(sql)+'\n'

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ('inventory','preflight','baseline','owner','output'): p.add_argument('--'+arg,type=Path,required=True)
    p.add_argument('--commit',action='store_true')
    a=p.parse_args(); read=lambda p:json.loads(p.read_text())
    tables,sql=build(read(a.inventory),read(a.preflight),read(a.baseline),read(a.owner),a.commit)
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/'activated-tables.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2)+'\n')
    (a.output/('activate.sql' if a.commit else 'rehearse.sql')).write_text(sql)
    print(json.dumps({'mode':'commit' if a.commit else 'rollback','rows':sum(map(len,tables.values())),'sqlBytes':len(sql.encode())}))

if __name__=='__main__': main()
