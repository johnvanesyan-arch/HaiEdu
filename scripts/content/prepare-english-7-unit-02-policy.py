"""Offline C33 preparation from retained C29/C31 evidence; never reads approvals or writes production.
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
plan=read(R/'docs/content/english-7-unit-02-bank-proposal.json')
curr=read(R/'docs/content/english-7-unit-02-curriculum-registration.json')
u1=read(R/'docs/content/english-7-unit-01-policy-proposal.json')
items={i['code']:i for i in b['items']};versions={(v['item_id'],v['version_no']):v for v in b['item_versions']}
sets={s['id']:s for s in b['learning_task_set_versions']};audios={s['id']:s for s in b['learning_audio_versions']}
skills={s['skill_code_snapshot']:s['skill_id'] for s in curr['updatedReleaseSkills']}
assert len(items)==len(a['items'])==192 and len(sets)==28 and len(audios)==14
scope={'subjectProgramId':curr['updatedRelease']['subject_program_id'],'curriculumReleaseId':curr['updatedRelease']['id'],'unitId':plan['scope']['unitId']}
core=[x for x in a['items'] if x['purpose']=='practice' and x['deliveryRole']=='core'];optional=[x['code'] for x in a['items'] if x['purpose']=='practice' and x['deliveryRole']!='core']
assert len(core)==47 and len(optional)==25
counts=[{'skill':s['code'],'skillId':skills[s['code']],'corePractice':sum(i['skill']==s['code'] for i in core),'perAssessment':s['perForm'],'minimumFullyCorrect':{2:1,3:2,4:3}[s['perForm']]} for s in plan['skills'] if s['perForm']]
assert [c['corePractice'] for c in counts]==[6,6,8,6,8,4,6,1,2]
forms=[];seen=set();seen_sources=set();seen_audio=set()
for f in plan['forms']:
 qs=sorted([i for i in a['items'] if i['code'].startswith('ENG7-U02-'+f['code']+'-')],key=lambda i:i['code'])
 assert len(qs)==24 and all(i['responseType']=='single_choice' for i in qs)
 assert collections.Counter(i['skill'] for i in qs)=={c['skill']:c['perAssessment'] for c in counts}
 members=[];groups={}
 for q in qs:
  i=items[q['code']];v=versions[(i['id'],i['version_no'])];assert i['id'] not in seen;seen.add(i['id'])
  assert i['skill_id']==skills[q['skill']] and i['item_type']==q['responseType']
  sid=i['stimulus'].get('taskSetVersionId');assert bool(sid)==bool(q['sourceSet'])
  if sid:
   s=sets[sid];assert s['revoked_at'] is None and s['curriculum_release_id']==scope['curriculumReleaseId']
   assert s['unit_id']==scope['unitId'] and len(s['members'])==2
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
 assert len(ordered)==len(set(ordered))==24
 forms.append({'code':f['code'],'purpose':f['purpose'],'qualified':False,'allocated':False,'policyBinding':None,'members':members,'presentationOrder':ordered,'sources':source_rows})
assert len(seen)==120 and len(seen_sources)==20 and len(seen_audio)==10
for s in sets.values():
 if s['id'] not in {x['id'] for f in forms for x in f['sources']}:assert s['source_family_id'] not in seen_sources
private={'checkpoint':'16.1C.33','basis':'Retained C31 immutable source integration snapshot; owner approval report accepted separately; refresh exact binding metadata at qualification, no approval audit.','forms':forms}
save(out/'prepared-forms.json',private)
groups=[{'key':key,'label':label,'skillIds':[skills['ENG7-U02-S'+str(n).zfill(2)] for n in ns]} for key,label,ns in [('vocabulary','Բառապաշար',[1,2]),('grammar','Քերականություն',[5,7,9]),('reading','Ընթերցանություն',[10,11]),('listening','Ունկնդրում',[12,13])]]
automatic=[c['skillId'] for c in counts];modes={}
for mode,old in u1['modes'].items():
 p=json.loads(json.dumps(old));p.update(scope);p.update(policyKey='eng7-u02-provisional-'+mode+'-v1',deliveredSkillIds=automatic,reportingGroups=groups,plannedQuestionCount=24 if mode in ['diagnostic','mastery_check'] else 8 if mode=='practice' else 12)
 if mode in ['diagnostic','mastery_check']:p.update(responseTypes=['single_choice'],responseCapabilities={},questionCountBySkill={c['skillId']:c['perAssessment'] for c in counts})
 if mode=='mastery_check':p.update(minimumCorrectBySkill={c['skillId']:c['minimumFullyCorrect'] for c in counts},scoredSkillIds=automatic,readinessSkillIds=automatic)
 modes[mode]=p
proposal={'schemaVersion':'haiedu-english-unit-policy-proposal-v1','checkpoint':'16.1C.33','version':1,'date':'2026-10-24','sourceCommit':'2a95be70fdccd23b6edbde36c7bd0feca1bcfd0c','status':'proposed_awaiting_explicit_owner_policy_approval','ownerApproval':None,'scope':scope,'counts':counts,'modes':modes,'learningModel':u1['learningModel'],'readiness':dict(u1['readiness'],scope='All nine core automatic Unit 2 skills; per release/student/skill'),'practicePool':{'approvedBank':72,'coreEligible':47,'coreItemCodes':sorted(i['code'] for i in core),'optionalRetained':optional,'optionalDisposition':'Preserve accepted content; exclude these 25 from core Practice/Review and readiness. Separate non-gating delivery remains unimplemented. Do not introduce supporting responses into the core skill model.','sessionLimit':8,'mayFinishEarly':True,'itemReuse':'Unseen-first, then governed repeats; repeated source/item is not independent evidence.'},'review':dict(u1['review'],eligiblePool='The 47 core Practice items; no unused assessment sources'),'lifecycle':u1['lifecycle'],'writing':dict(u1['writing'],scope='S14 and S15 share one accepted W01 sample; pending review is not zero/failure'),'reporting':dict(u1['reporting'],groups=groups,denominators={'vocabulary':6,'grammar':10,'reading':4,'listening':4,'total':24},automaticResultScope='Vocabulary, grammar, reading and listening for this Unit 2 provisional assessment'),'binding':dict(u1['binding'],requiredBeforeBinding=['Explicit owner numerical-policy approval including limited listening evidence and optional-delivery split','Compile immutable Unit 2 configuration; exact current version/source metadata qualification without repeating human content review','Resolve source protection/exposure and specialist dispositions; preserve existing rollout gates','Separate explicit learner-release decision and bounded learner acceptance']),'formChecks':[{'code':f['code'],'items':24,'responseType':'single_choice','minimumReachablePassingPoints':20,'sourceSets':4,'recordings':2,'qualified':False,'allocated':False} for f in forms],'listeningReadiness':{'corePracticeGistItems':1,'corePracticeDetailItems':2,'diagnosticItemsPerSkill':2,'recoveryDistinctCapacityGist':3,'recoveryDistinctCapacityDetails':4,'distinctPracticeAudioSources':1,'limitation':'Core Practice listening shares the Power of Music source. Diagnostic plus Practice supplies the three distinct-item recovery requirement; model route permits governed repeats. No additional recordings/questions or independent-competence claim. Optional sources excluded.'},'qualification':{'preparedForms':5,'basis':'Retained immutable C29/C31/C32 evidence, no fresh approval audit','qualified':False,'difficultyEquivalence':'not_established','sourceProtectionDecision':'pending_exact_scope_and_exposure_disposition','privatePacketSha256':digest(out/'prepared-forms.json'),'canonicalSnapshotHashFormat':'UTF-8 sorted-key compact JSON; local fingerprint, not PostgreSQL jsonb::text hash'},'sourceHashes':{'retainedAuthoring':digest(a_path),'retainedIntegrationSnapshot':digest(b_path),'curriculumRegistration':digest(R/'docs/content/english-7-unit-02-curriculum-registration.json')}}
proposal['readiness']['limitations'].append('Only one core Practice gist and two detail questions; readiness relies on Diagnostic evidence and/or governed repeats, not three novel Practice sources.')
save(R/'docs/content/english-7-unit-02-policy-proposal.json',proposal)
print(json.dumps({'forms':5,'items':120,'separateSourceFamilies':20,'audioVersions':10,'corePractice':47,'optional':25,'productionWrites':0}))
