"""Build a bounded Chapter IV release transaction from restricted, verified inputs.

Default output ends in ROLLBACK. This program never connects to a database.
Keep source/plan/SQL outputs restricted: they contain protected form membership.
"""
import argparse, collections, copy, hashlib, json, re, uuid
from pathlib import Path

RELEASE='18eb78e8-79f7-5307-bef2-38c4baa1d809'
UNIT='5ebe46f5-5542-5a1e-bfbd-14e4e5b784ca'
RECON='89815172-0a05-50ba-a828-449833494c8c'
# Complete owner-approved contract list, including labels, flags, scope and counts.
# Deliberately independent of mutable input files; a new contract needs a new decision.
APPROVED_CONTRACTS_SHA256='2d15c5d107b56b7489f93d854d51b65d9e1a479b7b9083a17238686147a44224'
BASE='bf84b5bb-88a4-4f55-986f-0c06ce5b0b3f'
RUNTIME='269cb4ff-ad87-48fc-8c05-563b803d1d2b'
PRESERVED=['80bbe575-ad49-4a7f-881a-e55726b1eaeb','b83dc4a4-f5c2-486a-82a6-d7489e7e6407','b626705a-a355-5937-b20b-38550dc5b0fe']
def uid(key): return str(uuid.uuid5(uuid.NAMESPACE_URL,'https://www.haiedu.am/releases/physics7_u04_20261018/'+key))
def js(x): return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def literal(s): return "'"+s.replace("'","''")+"'"
def jsonsql(x): return literal(js(x))+'::jsonb'
def insert(table,rows):
 cols=','.join(rows[0]);return f'insert into public.{table}({cols}) select {cols} from jsonb_populate_recordset(null::public.{table},{jsonsql(rows)});'
def require(value,message):
 if not value: raise ValueError(message)

def build(source,plan,recipe,state,source_commit,authorization=None):
 require(hashlib.sha256(json.dumps(recipe.get('contracts'),ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==APPROVED_CONTRACTS_SHA256,'Exact owner-approved contracts required')
 require(re.fullmatch('[0-9a-f]{40}',source_commit),'Exact reviewed source commit required')
 require(recipe['scope']['curriculumReleaseId']==RELEASE and recipe['scope']['unitId']==UNIT,'Wrong recipe scope')
 require(next(r for r in source['releases'] if r['id']==RELEASE)['status']=='draft','Release must still be draft')
 require(not source['blueprints'] and not source['poolCounts'],'Already allocated')
 require(all(next(r for r in source['releases'] if r['id']==x)['status']=='pilot' for x in PRESERVED),'Existing pilots drifted')
 if authorization is not None:
  require(authorization.get('curriculumReleaseId')==RELEASE and authorization.get('action')=='activate_provisional_pilot','Exact pilot activation decision required')
  require(authorization.get('owner')=='John' and authorization.get('ownerDirection') and authorization.get('at'),'Recorded owner instruction and date required')
  require(authorization.get('specialistReview')=='deferred' and authorization.get('practicalPerformance')=='unassessed','Bounded specialist/exposure disposition required')
 items=source['items'];byid={i['id']:i for i in items};contracts_by_mode={p['mode']:p for p in recipe['contracts']};skills=contracts_by_mode['diagnostic']['deliveredSkillIds']
 require(len(items)==len(byid)==236,'Expected 236 unique questions')
 require(collections.Counter(i['code'].split('-')[-1][0] for i in items)=={'I':138,'D':38,'M':60},'Question budget changed')
 require(all(i['status']=='published' and i['review_status']=='approved' and i['approval_id'] and i['passed'] and not i['errors'] and not i['warnings'] for i in items),'Current approval or QA missing')
 require(len(plan['forms'])==5 and len(plan['heldItems'])==15,'Expected five forms and fifteen held items')
 seen=set();forms=[];formitems=[]
 for f in plan['forms']:
  members=f['members'];key=f['planId'];mode='diagnostic' if key.startswith('D-') else 'mastery_check'
  require(key in ['D-A','D-B','M-A','M-B','M-C'],'Unexpected form')
  require(len(members)==(19 if mode=='diagnostic' else 15) and not f['missingMandatoryKnowledgeOutcomes'] and not f['pendingRevisionCodes'] and not f['performedOutcomesAssessed'],'Incomplete or overstated knowledge-only form')
  require(dict(collections.Counter(byid[m['itemId']]['skill_id'] for m in members))==contracts_by_mode[mode]['questionCountBySkill'],'Wrong skill distribution')
  fid=uid('form-'+key);pid=uid('pool-'+mode)
  forms.append(dict(id=fid,pool_id=pid,code='PHY7-U04-'+key+'-20261018',name='Chapter IV '+key,form_version=1,status='active',metadata={'planId':key,'ordinaryReview':'complete','independentSmeReview':'deferred','qualification':'provisional_only','historicalExposure':'not_established'}))
  for slot,m in enumerate(members,1):
   i=byid[m['itemId']]
   require(i['id'] not in seen and i['version_no']==m['versionNo'] and i['approval_id']==m['approvalId'] and i['qa_id']==m['qaId'] and i['variant_fingerprint']==m['variantFingerprint'],'Form version/approval/QA drift or duplicate')
   require(i['code'].split('-')[-1].startswith('D' if mode=='diagnostic' else 'M'),'Wrong protected purpose')
   seen.add(i['id']);formitems.append(dict(form_id=fid,item_id=i['id'],slot_order=slot,metadata={'itemVersion':i['version_no'],'approvalId':i['approval_id'],'snapshotSha256':m['snapshotSha256']}))
 require(len(seen)==83 and {f['metadata']['planId'] for f in forms}=={'D-A','D-B','M-A','M-B','M-C'},'Forms must be disjoint')
 require(len({r['itemId'] for r in plan['heldItems']})==15 and not seen.intersection(r['itemId'] for r in plan['heldItems']),'Held item reused')
 for r in plan['heldItems']:
  i=byid[r['itemId']]
  require(i['version_no']==r['versionNo'] and i['approval_id']==r['approvalId'] and i['qa_id']==r['qaId'] and i['variant_fingerprint']==r['variantFingerprint'],'Held item binding drift')
 require({i['id'] for i in items if i['code'].split('-')[-1].startswith(('D','M'))}==seen|{r['itemId'] for r in plan['heldItems']},'Protected inventory not fully accounted for')
 baseline=next(m for m in source['models'] if m['id']==BASE);runtime=next(r for r in source['runtimes'] if r['id']==RUNTIME)
 require(runtime['source_commit']=='cced20d97879d9a616aaf42981e4637c365f614f' and runtime['snapshot_fingerprint']=='1c2bb13e5c35c9038e011273537bfe33','Reviewed runtime drifted')
 require(len(state['tables'])==59 and len({r['table_name'] for r in state['tables']})==59,'Complete preservation inventory required')
 require(all(p['schemaVersion']=='haiedu-assessment-policy-v2' for p in recipe['contracts']),'Approved v2 policies required')
 require({m:p['plannedQuestionCount'] for m,p in contracts_by_mode.items()}=={'diagnostic':19,'practice':8,'mastery_check':15,'chapter_review':12},'Approved mode counts changed')
 mastery=contracts_by_mode['mastery_check'];required=[skills[n] for n in [0,1,3,4,5,6,7,9,10,12]]
 require(mastery['minimumPercent']==80 and mastery['deliveredSkillIds']==required and mastery['scoredSkillIds']==required and mastery['readinessSkillIds']==required and mastery['minimumCorrectBySkill']=={s:1 for s in required},'Approved scoring/readiness contract changed')
 require(len(mastery['reportingGroups'])==1 and mastery['reportingGroups'][0]['key']=='knowledge' and mastery['reportingGroups'][0]['skillIds']==required,'Knowledge-only Mastery reporting required')
 policy=source['policies'][0];require(policy['maximum_mastery_attempts']==3 and policy['target_review_question_count']==12,'Lifecycle drift')
 modelid='232fe3fd-ddac-503c-9a55-99a4e866a7f4';contracts=copy.deepcopy(recipe['contracts'])
 for p in contracts:
  require(p['learningModelConfigurationId']==modelid and p['academicMasteryPolicyId']==policy['id'],'Exact model/lifecycle binding required')
  p['policyKey']=p['policyKey'].replace('-proposed-','-pilot-')
 configuration=copy.deepcopy(baseline['configuration']);configuration['assessmentPolicyContracts']=contracts
 require({k:v for k,v in configuration.items() if k!='assessmentPolicyContracts'}==baseline['configuration'],'Numeric model changed')
 model=dict(id=modelid,model_key=baseline['model_key'],version_label='chapter-iv-pilot-2026-10-18-r4',configuration_kind='baseline',predecessor_id=BASE,reference_curriculum_release_id=RELEASE,source_commit=source_commit,configuration=configuration,deployment_manifest={'runtimeBuildId':RUNTIME,'runtimeSourceCommit':runtime['source_commit'],'releaseConfigurationCommit':source_commit,'scope':'Chapter IV only; Chapter I/II/III bindings unchanged','runtimeImplementationChanged':False,'specialistReview':'deferred'},notes='Chapter-scoped approved v2 assessment contracts; unchanged numerical learning model. Independent specialist review deferred; no independent qualification or empirical equivalence claimed.')
 pools=[];poolitems=[];blueprints=[];bpitems=[]
 for p in contracts:
  mode=p['mode'];pm='practice' if mode=='chapter_review' else mode;letter={'practice':'I','diagnostic':'D','mastery_check':'M'}[pm]
  selected=[i for i in items if i['code'].split('-')[-1].startswith(letter) and (pm!='mastery_check' or i['id'] in seen)];poolid=uid('pool-'+pm)
  if mode!='chapter_review':
   pools.append(dict(id=poolid,code='PHY7-U04-'+pm.upper()+'-PILOT-20261018',unit_code='PHY7-U04',purpose=pm,name='Chapter IV '+pm,is_protected=pm!='practice',status='draft',metadata={'curriculumReleaseId':RELEASE,'independentSmeReview':'deferred','historicalExposure':'not_established','activationAuthorization':authorization or 'rehearsal_only_no_live_activation_authorized'}))
   poolitems.extend(dict(pool_id=poolid,item_id=i['id'],enabled=True,metadata={'itemVersion':i['version_no']}) for i in selected)
  snapshot={'assessmentPolicy':p,'enabledItemCount':len(selected),'provenance':'exact_snapshot','independentSmeReview':'deferred','historicalExposureDisposition':'pending_final_review'}
  if mode=='mastery_check':snapshot['masteryFormSelection']={'schemaVersion':'haiedu-mastery-form-selection-v1','formIds':[uid('form-'+k) for k in ['M-A','M-B','M-C']],'selectionStrategy':'ordered-unseen-whole-form-v1'}
  if mode=='chapter_review':snapshot['sourceBlueprintId']=uid('blueprint-practice')
  bid=uid('blueprint-'+mode);fp=hashlib.md5(','.join(i['id']+':'+str(i['version_no'])+':'+(i['variant_fingerprint'] or '') for i in sorted(selected,key=lambda i:i['id'])).encode()).hexdigest()
  blueprints.append(dict(id=bid,blueprint_key='physics7_u04_20261018_r4_'+mode,curriculum_release_id=RELEASE,unit_id=UNIT,assessment_pool_id=poolid,purpose=mode,version_number=1,status='draft',selection_policy_version='haiedu-assessment-policy-v2',configuration_snapshot=snapshot,item_set_fingerprint=fp))
  bpitems.extend(dict(assessment_blueprint_id=bid,item_id=i['id'],item_code_snapshot=i['code'],item_version_snapshot=i['version_no'],item_template_id=i['item_template_id'],template_version_snapshot=i['template_version'],item_family_id=i['item_family_id'],variant_key_snapshot=i['variant_key'],variant_fingerprint_snapshot=i['variant_fingerprint']) for i in selected)
 binding=dict(id=uid('runtime-binding'),binding_key='physics7_u04_current',curriculum_release_id=RELEASE,unit_code='PHY7-U04',learning_model_configuration_id=modelid,runtime_build_id=RUNTIME,status='inactive',notes='Chapter IV only. Existing v2 runtime reused; specialist review deferred.')
 tables={'assessment_pools':pools,'assessment_pool_items':poolitems,'learning_model_configurations':[model],'assessment_blueprints':blueprints,'assessment_blueprint_items':bpitems,'assessment_forms':forms,'assessment_form_items':formitems,'learning_model_runtime_bindings':[binding]}
 result={'schemaVersion':1,'releaseId':RELEASE,'unitId':UNIT,'sourceCommit':source_commit,'status':'prepared_not_activated','practicalPerformance':'unassessed','contracts':contracts,'tables':tables,'heldItems':plan['heldItems'],'formPlanSha256':hashlib.sha256(js(plan).encode()).hexdigest(),'specialistReview':'deferred','qualifiedForms':0,'liveActivationAuthorized':authorization is not None}
 sql=['-- Restricted exact configuration. Generated by prepare-chapter-iv-pilot.py; never execute unreviewed inputs.','begin;','set local lock_timeout=\'5s\';','set local statement_timeout=\'60s\';',
 "create function pg_temp.fingerprint(p_schema text,p_table text,p_predicate text default 'true') returns jsonb language plpgsql as $$ declare x jsonb;begin execute format('select jsonb_build_object(''row_count'',count(*),''fingerprint'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),''''))) from %I.%I r where %s',p_schema,p_table,p_predicate) into x;return x;end $$;",
 'create temporary table preservation(scope text primary key,table_schema text,table_name text,predicate text,baseline jsonb) on commit drop;']
 content=['items','item_options','item_answer_keys','item_misconception_mappings','item_versions','item_reviews','item_qa_runs','item_templates','item_families','misconceptions','curriculum_release_outcomes','curriculum_release_skills','curriculum_release_item_families']
 sql.append('lock table '+','.join('public.'+x for x in content)+' in share mode;')
 sql.append(f"select id from public.curriculum_releases where id in ({','.join(literal(x) for x in PRESERVED+[RELEASE])}) order by id for update;")
 for row in state['tables']:
  name=row['table_name'];require(re.fullmatch('[a-z_]+',name),'Unsafe table name')
  sql.append(f"do $$ begin if pg_temp.fingerprint('public','{name}') is distinct from {jsonsql({k:row[k] for k in ['row_count','fingerprint']})} then raise exception 'preflight_drift:{name}';end if;end $$;")
 for row in state['tables']:
  name=row['table_name'];predicate='true'
  if name=='curriculum_releases':predicate=f"id<>'{RELEASE}'"
  elif name=='curriculum_release_gate_checks':predicate=f"curriculum_release_id<>'{RELEASE}'"
  elif name=='curriculum_reconciliation_runs':predicate=f"id<>'{RECON}'"
  elif name in tables:
   new=tables[name]
   key='id' if 'id' in new[0] else 'pool_id' if 'pool_id' in new[0] else 'form_id' if 'form_id' in new[0] else 'assessment_blueprint_id'
   predicate=key+' not in ('+','.join(literal(x) for x in sorted({r[key] for r in new}))+')'
  elif name in ['assessment_policy_bindings']:predicate=f"curriculum_release_id<>'{RELEASE}'"
  elif name=='assessment_pool_curriculum_reconciliations':predicate=f"reconciliation_id<>'{RECON}'"
  sql.append(f"insert into preservation values({literal(name)},'public',{literal(name)},{literal(predicate)},pg_temp.fingerprint('public',{literal(name)},{literal(predicate)}));")
 for name,predicate in [('active_curriculum_release_units',f"curriculum_release_id<>'{RELEASE}'"),('mastery_form_selection_bindings',f"assessment_policy_binding_id not in (select id from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')")]:
  sql.append(f"insert into preservation values('private.{name}','private','{name}',{literal(predicate)},pg_temp.fingerprint('private','{name}',{literal(predicate)}));")
 sql.append(f"do $$ begin if not exists(select 1 from public.curriculum_releases where id='{RELEASE}' and status='draft' and activated_at is null) or exists(select 1 from public.assessment_blueprints where curriculum_release_id='{RELEASE}') then raise exception 'expected_unconfigured_draft';end if;end $$;")
 approved=[{k:i[k] for k in ['id','version_no','approval_id','qa_id']} for i in items]
 sql.append(f"do $$ begin if (select count(*) from jsonb_to_recordset({jsonsql(approved)}) x(id uuid,version_no integer,approval_id uuid,qa_id uuid) join public.items i on i.id=x.id and i.version_no=x.version_no join public.item_reviews r on r.id=x.approval_id and r.item_id=x.id and r.version_no=x.version_no join public.item_qa_runs q on q.id=x.qa_id and q.item_id=x.id and q.version_no=x.version_no where i.status='published' and i.review_status='approved' and r.review_type='content' and r.decision='approved' and r.reviewer_id is not null and q.passed and q.errors='[]'::jsonb and q.warnings='[]'::jsonb)<>236 then raise exception 'exact_approval_or_qa_missing';end if;end $$;")
 sql.extend(insert(table,rows) for table,rows in tables.items())
 sql.append(f"select private.validate_governed_learning_model('{modelid}');")
 sql.append(f"insert into public.assessment_pool_curriculum_reconciliations(reconciliation_id,assessment_pool_id,disposition,enabled_item_count,covered_skill_count,covered_item_family_count,covered_learning_outcome_count,rationale) select '{RECON}',p.id,'mapping_updated',count(*),count(distinct i.skill_id),count(distinct t.item_family_id),count(distinct r.primary_learning_outcome_id),'Technical exact-version pilot scope; independent specialist and exposure review deferred.' from public.assessment_pools p join public.assessment_pool_items pi on pi.pool_id=p.id join public.items i on i.id=pi.item_id join public.item_templates t on t.id=i.item_template_id join public.item_family_curriculum_reconciliations r on r.item_family_id=t.item_family_id and r.reconciliation_id='{RECON}' where p.id in ({','.join(literal(p['id']) for p in pools)}) group by p.id;")
 evidence={'scope':'Chapter IV knowledge-only technical provisional configuration','sourceCommit':source_commit,'formPlanSha256':result['formPlanSha256'],'questions':236,'guides':138,'outcomes':13,'skills':14,'families':236,'practicalPerformance':'unassessed','specialistReview':'deferred','independentQualification':False,'exposureDisposition':'pending','activationAuthorization':authorization or 'rehearsal_only_no_live_activation_authorized'}
 sql.append(f"update public.curriculum_reconciliation_runs set status='complete',completed_at=now(),source_snapshot=source_snapshot||jsonb_build_object('readinessContract','haiedu-assessment-policy-v2','technicalReleasePreparation',{jsonsql(evidence)}),notes='Internal technical reconciliation only; no independent specialist, historical non-exposure or empirical equivalence claim.' where id='{RECON}' and status='draft';")
 sql.append(f"update public.curriculum_release_gate_checks set status='passed',checked_at=now(),checked_by=null,evidence={jsonsql(evidence)},notes='Verified technical source/scope, exact approvals and passing QA; independent review is deferred.',updated_at=now() where curriculum_release_id='{RELEASE}' and gate_code in ('outcomes_reconciled','skills_mapped','assessment_scope_bound','content_qa_passed') and status='pending';")
 sql.append(f"update public.curriculum_release_gate_checks set evidence={jsonsql(evidence)},notes='Independent specialist review deferred by owner on 2026-10-18. Production promotion remains gated; no specialist approval recorded.',updated_at=now() where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending';")
 sql.append(f"update public.assessment_pools set status='active',updated_at=now() where id in ({','.join(literal(p['id']) for p in pools)});")
 sql.append(f"update public.assessment_blueprints set status='pilot',published_at=now(),updated_at=now() where curriculum_release_id='{RELEASE}';")
 sql.append(f"update public.learning_model_runtime_bindings set status='active',activated_at=now(),updated_at=now() where id='{binding['id']}';")
 sql.append(f"update public.curriculum_releases set release_key='physics7_u04_2026_08_14_pilot_r4',version_label='Ֆիզիկա 7 — Գլուխ IV, փորձնական թողարկում 4',source_snapshot=source_snapshot||jsonb_build_object('technicalReleasePreparation',{jsonsql(evidence)}),content_fingerprint='{hashlib.md5(js(result).encode()).hexdigest()}',notes='Provisional Chapter IV pilot configuration. Specialist and final exposure review deferred; Chapter I/II/III preserved.',status='pilot' where id='{RELEASE}' and status='draft';")
 sql.append(f"select public.service_bind_assessment_policy(id) from public.assessment_blueprints where curriculum_release_id='{RELEASE}' order by purpose;")
 sql.append("do $$ declare p record;begin for p in select * from preservation loop if p.baseline is distinct from pg_temp.fingerprint(p.table_schema,p.table_name,p.predicate) then raise exception 'preservation_failed:%',p.scope;end if;end loop;end $$;")
 sql.append(f"do $$ begin if (select count(*) from public.assessment_policy_bindings where curriculum_release_id='{RELEASE}')<>4 then raise exception 'four_policy_bindings_required';end if;if (select count(*) from private.active_curriculum_release_units where curriculum_release_id in ({','.join(literal(x) for x in PRESERVED+[RELEASE])}))<>4 then raise exception 'four_disjoint_chapters_required';end if;if not exists(select 1 from public.curriculum_release_gate_checks where curriculum_release_id='{RELEASE}' and gate_code='external_sme_approved' and status='pending' and checked_by is null) then raise exception 'specialist_gate_must_stay_pending';end if;end $$;")
 for table,rows in tables.items():
  key='id' if 'id' in rows[0] else 'pool_id' if 'pool_id' in rows[0] else 'form_id' if 'form_id' in rows[0] else 'assessment_blueprint_id'
  predicate=key+' in ('+','.join(literal(x) for x in sorted({r[key] for r in rows}))+')'
  sql.append(f"do $$ begin if (select count(*) from public.{table} where {predicate})<>{len(rows)} then raise exception 'configuration_count_mismatch:{table}';end if;end $$;")
 sql.append(f"do $$ begin if (select reviewed_by from public.curriculum_reconciliation_runs where id='{RECON}') is not null then raise exception 'independent_reviewer_must_not_be_fabricated';end if;end $$;")
 sql.append(f"select jsonb_build_object('status','transaction_verified','observedAt',clock_timestamp(),'curriculumReleaseId','{RELEASE}','unitId','{UNIT}','policies',(select jsonb_agg(jsonb_build_object('mode',b.purpose,'policy',p.policy_snapshot,'skillScope',p.skill_scope_snapshot)) from public.assessment_policy_bindings p join public.assessment_blueprints b on b.id=p.assessment_blueprint_id where p.curriculum_release_id='{RELEASE}'),'preservedScopes',(select count(*) from preservation),'forms',(select count(*) from public.assessment_forms where pool_id in (select id from public.assessment_pools where metadata->>'curriculumReleaseId'='{RELEASE}')),'formItems',(select count(*) from public.assessment_form_items fi join public.assessment_forms f on f.id=fi.form_id join public.assessment_pools p on p.id=f.pool_id where p.metadata->>'curriculumReleaseId'='{RELEASE}'),'blueprintItems',(select count(*) from public.assessment_blueprint_items bi join public.assessment_blueprints b on b.id=bi.assessment_blueprint_id where b.curriculum_release_id='{RELEASE}'),'specialistGate','pending','runtimeReused','{RUNTIME}','numericModelUnchanged',(select configuration-'assessmentPolicyContracts'=(select configuration from public.learning_model_configurations where id='{BASE}') from public.learning_model_configurations where id='{modelid}')) as data;")
 sql.append('commit;' if authorization is not None else 'rollback;')
 return result,'\n'.join(sql)+'\n'

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--forms',type=Path,required=True);p.add_argument('--recipe',type=Path,required=True);p.add_argument('--state',type=Path,required=True);p.add_argument('--source-commit',required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--activation-authorization',type=Path)
 a=p.parse_args();read=lambda p:json.loads(p.read_text());authorization=read(a.activation_authorization) if a.activation_authorization else None
 config,sql=build(read(a.source),read(a.forms),read(a.recipe),read(a.state),a.source_commit,authorization);a.output.mkdir(parents=True,exist_ok=True)
 (a.output/'configuration.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n');(a.output/('activate.sql' if authorization else 'rehearse.sql')).write_text(sql)
 print(json.dumps({'mode':'commit' if authorization else 'rollback','tables':len(config['tables']),'forms':len(config['tables']['assessment_forms']),'formItems':len(config['tables']['assessment_form_items']),'blueprintItems':len(config['tables']['assessment_blueprint_items'])}))
if __name__=='__main__':main()
