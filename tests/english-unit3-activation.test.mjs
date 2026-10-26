import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Unit 3 activation rejects changed owner authority, scope and immutable packet hashes', () => {
  const output = execFileSync('python3', ['-c', String.raw`
import importlib.util,inspect,tempfile,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('activation',Path('scripts/releases/activate-english-7-unit-03.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=m.read(m.OWNER);m.validate_owner(a)
changes=[('action','activate_production'),('owner','another owner'),('scope',{}),('preparedSourceCommit','a'*40),('decisionManifestSha256','0'*64),('configurationSha256','0'*64),('protectedConfigurationSha256','0'*64),('readContractSha256','0'*64),('fixturePlanSha256','0'*64),('specialistReview','approved'),('independentSmeApproved',True),('publicDownloadsAuthorized',True),('sourceUseBasis','unverified'),('sourceUseScope','all_users'),('unseenAssessmentClaim',True),('ownerDirection',''),('recordedAt',''),('recordedAt','invalid'),('recordedAt','2026-10-26')]
for key,value in changes:
 b={**a,key:value}
 try:m.validate_owner(b)
 except ValueError:pass
 else:raise AssertionError(key)
assert inspect.signature(m.build).parameters['commit'].default is False
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'changed.json';p.write_text('{}')
 try:m.load_configuration(p,{},{})
 except ValueError as e:assert 'Exact protected C45' in str(e)
 else:raise AssertionError('changed private configuration accepted')
print('21 owner/hash/default guards passed')
`], { encoding: 'utf8' });
  assert.match(output, /21 owner\/hash\/default guards passed/);
});

test('Unit 3 publication preflight rejects unavailable or mismatched materials and writing', () => {
  const output = execFileSync('python3', ['-c', String.raw`
import importlib.util,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('activation',Path('scripts/releases/activate-english-7-unit-03.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
manifest=m.read(m.MATERIALS);contract=m.read(m.READ)
materials=[dict(id=x['id'],key=x['key'],kind=x['kind'],version=x['version'],fingerprint=x['fingerprint'],status='approved',definitionHash='a'*64,sequenceOrder=n) for n,x in enumerate(manifest['materialVersions'],1)]
task={**contract['writingTask'],'status':'approved','definitionHash':'a'*64,'reviewEvidence':{'fingerprint':next(x['fingerprint'] for x in materials if x['kind']=='writing')}}
observed={'materials':materials,'writingTasks':[task]};m.validate_publication(observed)
bad=[]
for key,value in [('status','draft'),('version',2),('fingerprint','b'*64),('sequenceOrder',99),('definitionHash','invalid')]:
 x=copy.deepcopy(observed);x['materials'][0][key]=value;bad.append(x)
x=copy.deepcopy(observed);x['materials'].pop();bad.append(x)
x=copy.deepcopy(observed);x['writingTasks']=[];bad.append(x)
for key,value in [('status','draft'),('definitionHash','b'*64),('title','Another task'),('baselineRequired',True),('reviewEvidence',{'fingerprint':'b'*64})]:
 x=copy.deepcopy(observed);x['writingTasks'][0][key]=value;bad.append(x)
for x in bad:
 try:m.validate_publication(x)
 except (ValueError,KeyError):pass
 else:raise AssertionError('changed material/writing accepted')
print('12 publication guards passed')
`], { encoding: 'utf8' });
  assert.match(output, /12 publication guards passed/);
});

test('Unit 3 inactive import and atomic activation require draft state and a complete staged guard', () => {
  const output = execFileSync('python3', ['-c', String.raw`
import importlib.util,inspect,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('activation',Path('scripts/releases/activate-english-7-unit-03.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
names=['assessment_pools','assessment_pool_items','runtime_builds','learning_model_configurations','assessment_blueprints','assessment_blueprint_items','assessment_forms','assessment_form_items','learning_model_runtime_bindings']
rows={n:[{'id':'00000000-0000-4000-8000-000000000001'}] for n in names}
for n in ['assessment_pools','assessment_forms','assessment_blueprints']:rows[n][0]['status']='draft'
rows['learning_model_runtime_bindings'][0]['status']='inactive'
assert all(q.endswith('rollback;\n') for q in m.stage_batches(rows))
for n in ['assessment_pools','assessment_forms','assessment_blueprints','learning_model_runtime_bindings']:
 changed=copy.deepcopy(rows);changed[n][0]['status']='active'
 try:m.stage_batches(changed)
 except ValueError:pass
 else:raise AssertionError(n)
try:m.stage_batches({'items':[{'id':'not_configuration'}]})
except ValueError:pass
else:raise AssertionError('content mutation accepted')
assert inspect.signature(m.compact_activation_sql).parameters['commit'].default is False
for guard in [{},{'tableCount':116,'sha256':'a'*64},{'tableCount':117,'sha256':'bad'}]:
 try:m.compact_activation_sql({},m.read(m.OWNER),[{}]*117,{},guard)
 except ValueError:pass
 else:raise AssertionError('incomplete staged guard accepted')
print('10 staged execution guards passed')
`], { encoding: 'utf8' });
  assert.match(output, /10 staged execution guards passed/);
});
