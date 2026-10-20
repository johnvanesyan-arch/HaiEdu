"""Answer-free synthetic cases exercise Chapter VI activation safeguards."""
import hashlib,copy,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('release',Path('scripts/releases/prepare-chapter-vi-pilot.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
recipe=json.loads(Path('docs/evidence/chapter-vi-assessment-v2-configuration-20261020.json').read_text());policies={p['mode']:p for p in recipe['contracts']}
def inputs():
 skills=policies['practice']['deliveredSkillIds'];items=[];forms=[];held=[]
 def item(k,letter,n):
  code=f'PHY7-U06-S{k+1:02}-{letter}{n:02}';i=dict(id=m.uid(code),code=code,version_no=1,approval_id=m.uid(code+'approval'),qa_id=m.uid(code+'qa'),variant_fingerprint='a'*32,skill_id=skills[k],item_template_id=m.uid(code+'template'),template_version=1,item_family_id=m.uid(code+'family'),variant_key=code,status='published',review_status='approved',passed=True,errors=[],warnings=[],snapshot_sha256='c'*64);items.append(i)
  return dict(itemId=i['id'],versionNo=1,approvalId=i['approval_id'],qaId=i['qa_id'],variantFingerprint=i['variant_fingerprint'],snapshotSha256='b'*64,sourceSnapshotSha256='c'*64)
 for n in range(146):item(n%16,'I',n+1)
 for mode,letter,keys in [('diagnostic','D',['D-A','D-B']),('mastery_check','M',['M-A','M-B','M-C'])]:
  counts=policies[mode]['questionCountBySkill']
  for f,key in enumerate(keys):forms.append(dict(planId=key,members=[item(k,letter,f*counts[s]+n+1) for k,s in enumerate(skills) if s in counts for n in range(counts[s])],missingMandatoryKnowledgeOutcomes=[],pendingRevisionCodes=[],performedOutcomesAssessed=[]))
 for n in range(7):held.append(item(n%12,'M',99+n))
 source=dict(releases=[{'id':m.RELEASE,'status':'draft'}]+[{'id':x,'status':'pilot'} for x in m.PRESERVED],blueprints=[],poolCounts={},items=items,models=[dict(id=m.BASE,configuration={'mastery':{'threshold':.72}},model_key='test')],runtimes=[dict(id=m.RUNTIME,source_commit='cced20d97879d9a616aaf42981e4637c365f614f',snapshot_fingerprint='1c2bb13e5c35c9038e011273537bfe33')],policies=[dict(id=policies['mastery_check']['academicMasteryPolicyId'],maximum_mastery_attempts=3,target_review_question_count=12)])
 state={'tables':[dict(table_name='synthetic_'+chr(97+n//26)+chr(97+n%26),row_count=0,fingerprint='d'*32) for n in range(59)]}
 allocation={f['planId']:[next(i['code'] for i in items if i['id']==x['itemId']) for x in f['members']] for f in forms}
 m.APPROVED_FORM_ALLOCATION_SHA256=hashlib.sha256(json.dumps(allocation,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 return [source,{'forms':forms,'heldItems':held},copy.deepcopy(recipe),state,'e'*40]
class Tests(unittest.TestCase):
 def test_exact_shape_and_held_exclusion(self):
  a=inputs();d,s=m.build(*a);self.assertTrue(s.endswith('rollback;\n'));self.assertFalse(d['liveActivationAuthorized']);self.assertEqual(d['qualifiedForms'],0)
  self.assertEqual({k:len(v) for k,v in d['tables'].items()},{'assessment_pools':3,'assessment_pool_items':235,'learning_model_configurations':1,'assessment_blueprints':4,'assessment_blueprint_items':381,'assessment_forms':5,'assessment_form_items':89,'learning_model_runtime_bindings':1})
  self.assertFalse({r['itemId'] for r in a[1]['heldItems']} & {r['item_id'] for r in d['tables']['assessment_pool_items']});self.assertIn("status='pending' and checked_by is null",s);self.assertNotIn('create function',s);self.assertNotIn('create temporary table',s);self.assertIn('six_disjoint_chapters_required',s)
 def test_rejects_unapproved_drift_and_overstated_performance(self):
  changes=[lambda a:a[0]['items'][0].update(passed=False),lambda a:a[1]['forms'][0]['members'][0].update(versionNo=2),lambda a:a[1]['forms'][0]['members'][0].update(sourceSnapshotSha256='wrong'),lambda a:a[1]['forms'][0]['members'].reverse(),lambda a:a[1]['heldItems'][0].update(approvalId='wrong'),lambda a:a[0]['releases'][0].update(status='pilot'),lambda a:a[3]['tables'].pop(),lambda a:a[0]['runtimes'][0].update(snapshot_fingerprint='wrong'),lambda a:a[2]['contracts'][2].update(minimumPercent=75),lambda a:a[2]['contracts'][2]['readinessSkillIds'].append(a[2]['contracts'][0]['deliveredSkillIds'][2]),lambda a:a[1]['forms'][0]['performedOutcomesAssessed'].append('M3'),lambda a:a[2]['contracts'][2]['reportingGroups'].append({'key':'practical'})]
  for change in changes:
   with self.subTest(change=change):
    a=inputs();change(a)
    with self.assertRaises(ValueError):m.build(*a)
 def test_pins_every_contract_field_including_learner_labels(self):
  for mode in range(4):
   for mutate in [lambda p:p['reportingGroups'][0].update(label='Unapproved label'),lambda p:p.update(hintsAllowed=not p['hintsAllowed']),lambda p:p.update(policyKey='unapproved'),lambda p:p.update(subjectProgramId=m.uid('wrong-program')),lambda p:p.update(extraUndeclaredField=True)]:
    with self.subTest(mode=mode,mutation=mutate):
     a=inputs();mutate(a[2]['contracts'][mode])
     with self.assertRaisesRegex(ValueError,'Exact release contracts'):m.build(*a)
 def test_no_reuse(self):
  a=inputs();a[1]['forms'][1]['members'][0]=a[1]['forms'][0]['members'][0]
  with self.assertRaises(ValueError):m.build(*a)
  a=inputs();a[1]['heldItems'][0]=a[1]['forms'][0]['members'][0]
  with self.assertRaises(ValueError):m.build(*a)
 def test_explicit_bounded_activation(self):
  for auth in [{},{'action':'activate_provisional_pilot'}]:
   with self.assertRaises(ValueError):m.build(*inputs(),authorization=auth)
  auth=dict(curriculumReleaseId=m.RELEASE,action='activate_provisional_pilot',owner='John',ownerDirection='Synthetic test only',at='2026-10-20',specialistReview='deferred',practicalPerformance='unassessed')
  d,s=m.build(*inputs(),authorization=auth);self.assertTrue(s.endswith('commit;\n'));self.assertTrue(d['liveActivationAuthorized'])
if __name__=='__main__':unittest.main()
