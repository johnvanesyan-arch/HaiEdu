"""Offline C44 preparation from retained C39/C41/C42/C43 evidence; never reads approvals or writes production.
Usage: python SCRIPT private-authoring.json retained-source-snapshot.json private-output-directory
Detailed form identities must stay outside the public repository. No unseen/qualification claim.
"""
import collections,hashlib,json,pathlib,sys
R=pathlib.Path(__file__).resolve().parents[2]
def read(p):return json.loads(pathlib.Path(p).read_text())
def digest(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
a_path,b_path,out=map(pathlib.Path,sys.argv[1:]);out.mkdir(parents=True,exist_ok=True)
assert not out.resolve().is_relative_to(R),'Protected bindings must stay outside public repo'
a,b=read(a_path),read(b_path)
plan=read(R/'docs/content/english-7-unit-03-bank-proposal.json')
curr=read(R/'docs/content/english-7-unit-03-curriculum-registration.json')
u1=read(R/'docs/content/english-7-unit-01-policy-proposal.json')
items={i['code']:i for i in b['items']};versions={(v['item_id'],v['version_no']):v for v in b['item_versions']}
sets={s['id']:s for s in b['learning_task_set_versions']};audios={s['id']:s for s in b['learning_audio_versions']}
skills={s['skill_code_snapshot']:s['skill_id'] for s in curr['updatedReleaseSkills']}
assert len(items)==len(a['items'])==160 and len(sets)==27 and len(audios)==16
scope={'subjectProgramId':curr['updatedRelease']['subject_program_id'],'curriculumReleaseId':curr['updatedRelease']['id'],'unitId':curr['insertRows']['topics'][0]['unit_id']}
core=[x for x in a['items'] if x['purpose']=='practice' and x['deliveryRole']=='core'];optional=[x['code'] for x in a['items'] if x['purpose']=='practice' and x['deliveryRole']!='core']
assert len(core)==52 and len(optional)==8
counts=[{'skill':s['code'],'skillId':skills[s['code']],'corePractice':sum(i['skill']==s['code'] for i in core),'perAssessment':s['perForm'],'minimumFullyCorrect':{1:0,2:1,3:2,4:3}[s['perForm']]} for s in plan['skills'] if s['perForm']]
assert [c['corePractice'] for c in counts]==[8,4,8,6,6,4,8,3,5]
forms=[];seen=set();seen_sources=set();seen_audio=set()
for f in plan['forms']:
 qs=sorted([i for i in a['items'] if i['code'].startswith('ENG7-U03-'+f['code']+'-')],key=lambda i:i['code'])
 assert len(qs)==20 and all(i['responseType']=='single_choice' for i in qs)
 assert collections.Counter(i['skill'] for i in qs)=={c['skill']:c['perAssessment'] for c in counts}
 members=[];groups={}
 for q in qs:
  i=items[q['code']];v=versions[(i['id'],i['version_no'])];assert i['id'] not in seen;seen.add(i['id'])
  assert i['skill_id']==skills[q['skill']] and i['item_type']==q['responseType']
  sid=i['stimulus'].get('taskSetVersionId');assert bool(sid)==bool(q['sourceSet'])
  if sid:
   s=sets[sid];assert s['revoked_at'] is None and s['curriculum_release_id']==scope['curriculumReleaseId']
   assert s['unit_id']==scope['unitId'] and len(s['members'])==(3 if s['stimulus']['kind']=='text' else 2)
   assert {'itemId':i['id'],'version':i['version_no'],'skillId':i['skill_id']} in s['members']
   source=next(z for z in a['sourceSets'] if z['id']==q['sourceSet'])
   assert source['sourceFamilyProposedId']==s['source_family_id']
   groups.setdefault(sid,[]).append(q['code'])
  members.append({'code':q['code'],'itemId':i['id'],'version':i['version_no'],'versionId':v['id'],'skillId':i['skill_id'],'taskSetVersionId':sid,'snapshotSha256':hashlib.sha256(json.dumps(v['snapshot'],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()})
 assert len(groups)==4
 ordered=[q['code'] for q in qs if not q['sourceSet']];source_rows=[]
 for sid,codes in sorted(groups.items(),key=lambda x:min(x[1])):
  s=sets[sid];assert s['source_family_id'] not in seen_sources;seen_sources.add(s['source_family_id']);ordered+=codes
  audio=None
  if s['stimulus']['kind']=='audio':
   audio=audios[s['stimulus']['audioVersionId']];assert audio['revoked_at'] is None
   assert audio['source_family_id']==s['source_family_id'] and audio['curriculum_release_id']==scope['curriculumReleaseId'] and audio['unit_id']==scope['unitId']
   assert audio['id'] not in seen_audio;seen_audio.add(audio['id'])
  source_rows.append({'id':sid,'sourceFamilyId':s['source_family_id'],'kind':s['stimulus']['kind'],'members':codes,'audioVersionId':audio['id'] if audio else None,'audioSha256':audio['sha256'] if audio else None})
 assert sum(s['kind']=='audio' for s in source_rows)==2
 assert len(ordered)==len(set(ordered))==20
 forms.append({'code':f['code'],'purpose':f['purpose'],'qualified':False,'allocated':False,'policyBinding':None,'members':members,'presentationOrder':ordered,'sources':source_rows})
assert len(seen)==100 and len(seen_sources)==20 and len(seen_audio)==10
for s in sets.values():
 if s['id'] not in {x['id'] for f in forms for x in f['sources']}:assert s['source_family_id'] not in seen_sources
private={'checkpoint':'16.1C.44','basis':'Retained C43 immutable approved bank and C41/C42 source snapshots; refresh exact version/source metadata at qualification, no repeat human content/audio review.','forms':forms}
save(out/'prepared-forms.json',private)
groups=[{'key':key,'label':label,'skillIds':[skills['ENG7-U03-S'+str(n).zfill(2)] for n in ns]} for key,label,ns in [('vocabulary','Բառապաշար',[1,2]),('grammar','Քերականություն',[3,4,5]),('reading','Ընթերցանություն',[6,7]),('listening','Ունկնդրում',[8,9])]]
automatic=[c['skillId'] for c in counts];modes={}
for mode,old in u1['modes'].items():
 p=json.loads(json.dumps(old));p.update(scope);p.update(policyKey='eng7-u03-provisional-'+mode+'-v1',deliveredSkillIds=automatic,reportingGroups=groups,plannedQuestionCount=20 if mode in ['diagnostic','mastery_check'] else 8 if mode=='practice' else 12)
 if mode in ['diagnostic','mastery_check']:p.update(responseTypes=['single_choice'],responseCapabilities={},questionCountBySkill={c['skillId']:c['perAssessment'] for c in counts})
 if mode=='mastery_check':p.update(minimumCorrectBySkill={c['skillId']:c['minimumFullyCorrect'] for c in counts},scoredSkillIds=automatic,readinessSkillIds=automatic)
 modes[mode]=p
proposal={'schemaVersion':'haiedu-english-unit-policy-proposal-v1','checkpoint':'16.1C.44','version':1,'date':'2026-10-26','sourceCommit':'6bc295ccb90772fd529615154d02a54298c98ec9','status':'proposed_awaiting_explicit_owner_policy_approval','ownerApproval':None,'scope':scope,'counts':counts,'modes':modes,'learningModel':u1['learningModel'],'readiness':dict(u1['readiness'],scope='All nine core automatic Unit 3 skills; per release/student/skill'),'practicePool':{'approvedBank':60,'coreEligible':52,'coreItemCodes':sorted(i['code'] for i in core),'optionalRetained':optional,'optionalDisposition':'Preserve accepted content; exclude these eight from core Practice/Review and readiness. Separate non-gating delivery remains unimplemented. Do not introduce supporting responses into the core skill model.','sessionLimit':8,'mayFinishEarly':True,'itemReuse':'Unseen-first, then governed repeats; repeated source/item is not independent evidence.'},'review':dict(u1['review'],eligiblePool='The 52 core Practice items; no unused assessment sources'),'lifecycle':u1['lifecycle'],'writing':dict(u1['writing'],scope='S12 and S13 share one W01 sample awaiting separate material acceptance; pending review is not zero/failure'),'reporting':dict(u1['reporting'],groups=groups,denominators={'vocabulary':3,'grammar':7,'reading':6,'listening':4,'total':20},automaticResultScope='Vocabulary, grammar, reading and listening for this Unit 3 provisional assessment'),'binding':dict(u1['binding'],requiredBeforeBinding=['Explicit owner acceptance of this numerical policy, the S02 single-item limitation and 52-core/8-optional delivery split','Compile immutable Unit 3 configuration; exact current version/source metadata qualification without repeating human content review','Resolve source protection/exposure and specialist dispositions; preserve existing rollout gates','Separate explicit learner-release decision and bounded learner acceptance']),'formChecks':[{'code':f['code'],'items':20,'responseType':'single_choice','minimumReachablePassingPoints':16,'sourceSets':4,'recordings':2,'qualified':False,'allocated':False} for f in forms],'listeningReadiness':{'corePracticeGistItems':3,'corePracticeDetailItems':5,'diagnosticItemsPerSkill':2,'recoveryDistinctCapacityGist':5,'recoveryDistinctCapacityDetails':7,'distinctPracticeAudioSources':3,'limitation':'Core Practice listening uses the publisher interview and two original natural-wonder recordings. Three gist and five detail items exist; Diagnostic adds two per skill. Shared-source answers and governed repeats remain dependent evidence. Three optional enrichment recordings are excluded from readiness.'},'qualification':{'preparedForms':5,'basis':'Retained immutable C39/C41/C42/C43 evidence and C44 curriculum mapping; no fresh human review','qualified':False,'difficultyEquivalence':'not_established','sourceProtectionDecision':'pending_exact_scope_and_exposure_disposition','privatePacketSha256':digest(out/'prepared-forms.json'),'canonicalSnapshotHashFormat':'UTF-8 sorted-key compact JSON; local fingerprint, not PostgreSQL jsonb::text hash'},'sourceHashes':{'retainedAuthoring':digest(a_path),'retainedIntegrationSnapshot':digest(b_path),'curriculumRegistration':digest(R/'docs/content/english-7-unit-03-curriculum-registration.json')}}
proposal['readiness']['limitations']=[x for x in proposal['readiness']['limitations'] if not x.startswith('Only one core Practice')]
proposal['readiness']['limitations'].append('Three core Practice gist and five detail items use three recordings. Shared-source questions and governed repeats are not independent listening observations.')
proposal['singleItemSkill']={'skill':'ENG7-U03-S02','assessmentItems':1,'includedInTotal':True,'readinessRequired':True,'minimumFullyCorrect':0,'interpretation':'The single natural-feature vocabulary item contributes to the overall score but has no stand-alone pass veto. Four Practice items support readiness; one assessed response is not a reliable separate diagnosis.'}
proposal['materialsAcceptance']='Separate decision pending for eight guides and W01, exact v1 fingerprints in the material handoff.'
save(R/'docs/content/english-7-unit-03-policy-proposal.json',proposal)
print(json.dumps({'forms':5,'items':100,'separateSourceFamilies':20,'audioVersions':10,'corePractice':52,'optional':8,'productionWrites':0}))
