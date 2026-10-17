"""Answer-free synthetic inputs exercise the offline release boundary."""
import copy, importlib.util, json, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('release',Path('scripts/releases/prepare-chapter-iii-pilot.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
recipe=json.loads(Path('docs/evidence/chapter-iii-assessment-v2-configuration-20261015.json').read_text())
def inputs():
 skills=recipe['commonPolicy']['deliveredSkillIds']; counts=[2,1,3,3,1,2,3,1]
 items=[];forms=[];reserves=[]
 def item(k,letter,n):
  code=f'PHY7-U03-S{k+1:02}-{letter}{n:02}';i=dict(id=m.uid(code),code=code,version_no=1,approval_id=m.uid(code+'approval'),qa_id=m.uid(code+'qa'),variant_fingerprint='a'*32,skill_id=skills[k],item_template_id=m.uid(code+'template'),template_version=1,item_family_id=m.uid(code+'family'),variant_key=code,status='published',review_status='approved',passed=True,errors=[],warnings=[])
  items.append(i)
  return dict(itemId=i['id'],versionNo=1,approvalId=i['approval_id'],qaId=i['qa_id'],variantFingerprint=i['variant_fingerprint'],snapshotSha256='b'*64,learnerContentSha256='c'*64,group='mandatory' if k in [0,2,3,5] else 'supporting' if k in [1,4] else 'additional')
 for k in range(8):
  for n in range(10):item(k,'I',n+1)
 for letter,keys in [('D',['D-A','D-B']),('M',['M-A','M-B','M-C'])]:
  for f,key in enumerate(keys):
   forms.append(dict(planId=key,members=[item(k,letter,f*counts[k]+n+1) for k in range(8) for n in range(counts[k])],mandatoryOutcomesMissing=[],pendingOrdinaryReviewCodes=[]))
 for k in range(8):reserves.append(item(k,'M',99))
 source=dict(releases=[{'id':m.RELEASE,'status':'draft'}]+[{'id':x,'status':'pilot'} for x in m.PRESERVED],blueprints=[],poolCounts={},items=items,models=[dict(id=m.BASE,configuration={'mastery':{'threshold':.72}},model_key='test')],runtimes=[dict(id=m.RUNTIME,source_commit='cced20d97879d9a616aaf42981e4637c365f614f',snapshot_fingerprint='1c2bb13e5c35c9038e011273537bfe33')],policies=[dict(id=m.uid('policy'),maximum_mastery_attempts=3,target_review_question_count=12)])
 state={'tables':[dict(table_name='synthetic_'+chr(97+n//26)+chr(97+n%26),row_count=0,fingerprint='d'*32) for n in range(59)]}
 return [source,{'forms':forms,'reserves':reserves},copy.deepcopy(recipe),state,'e'*40]
class ReleaseTests(unittest.TestCase):
 def test_defaults_rollback_and_exact_shape(self):
  data,sql=m.build(*inputs());self.assertTrue(sql.endswith('rollback;\n'));self.assertNotIn('\ncommit;',sql)
  self.assertFalse(data['liveActivationAuthorized']);self.assertEqual(data['qualifiedForms'],0)
  self.assertEqual({k:len(v) for k,v in data['tables'].items()},{'assessment_pools':3,'assessment_pool_items':168,'learning_model_configurations':1,'assessment_blueprints':4,'assessment_blueprint_items':248,'assessment_forms':5,'assessment_form_items':80,'learning_model_runtime_bindings':1})
  self.assertIn("status='pending' and checked_by is null",sql)
 def test_refuses_stale_or_unapproved_inputs(self):
  changes=[lambda a:a[0]['items'][0].update(passed=False),lambda a:a[1]['forms'][0]['members'][0].update(versionNo=2),lambda a:a[1]['reserves'][0].update(approvalId='wrong'),lambda a:a[0]['releases'][0].update(status='pilot'),lambda a:a[3]['tables'].pop(),lambda a:a[0]['runtimes'][0].update(snapshot_fingerprint='wrong'),lambda a:a[2]['modes']['mastery_check'].update(minimumPercent=75),lambda a:a[2]['modes']['mastery_check']['readinessSkillIds'].append(a[2]['commonPolicy']['deliveredSkillIds'][1])]
  for change in changes:
   with self.subTest(change=change):
    args=inputs();change(args)
    with self.assertRaises(ValueError):m.build(*args)
 def test_no_duplicate_or_reserve_reuse(self):
  a=inputs();a[1]['forms'][1]['members'][0]=a[1]['forms'][0]['members'][0]
  with self.assertRaises(ValueError):m.build(*a)
  a=inputs();a[1]['reserves'][0]=a[1]['forms'][0]['members'][0]
  with self.assertRaises(ValueError):m.build(*a)
 def test_commit_requires_explicit_bounded_decision(self):
  for auth in [{},{'action':'activate_provisional_pilot'},{'curriculumReleaseId':m.RELEASE,'action':'activate_provisional_pilot','owner':'John','ownerDirection':'Synthetic test only','at':'2026-10-17','specialistReview':'deferred'}]:
   with self.assertRaises(ValueError):m.build(*inputs(),authorization=auth)
  auth=dict(curriculumReleaseId=m.RELEASE,action='activate_provisional_pilot',owner='John',ownerDirection='Synthetic test only',at='2026-10-17',specialistReview='deferred',exposureLimitationsAcknowledged=True)
  data,sql=m.build(*inputs(),authorization=auth);self.assertTrue(sql.endswith('commit;\n'));self.assertTrue(data['liveActivationAuthorized'])
if __name__=='__main__':unittest.main()
