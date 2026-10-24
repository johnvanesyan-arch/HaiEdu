import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Unit 2 activation requires exact bounded owner/hash/scope records and defaults to rollback',()=>{
  const output=execFileSync('python3',['-c',String.raw`
import importlib.util,json,inspect,tempfile
from pathlib import Path
s=importlib.util.spec_from_file_location('activation',Path('scripts/releases/activate-english-7-unit-02.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=json.loads(Path('docs/evidence/english-7-unit-02-owner-activation-20261024.json').read_text());m.validate_owner(a)
changes=[('action','activate_production'),('owner','someone else'),('scope',{}),('preparedSourceCommit','a'*40),('decisionManifestSha256','0'*64),('configurationSha256','0'*64),('protectedConfigurationSha256','0'*64),('readContractSha256','0'*64),('specialistReview','approved'),('independentSmeApproved',True),('publicDownloadsAuthorized',True),('sourceUseBasis','unverified'),('sourceUseScope','all_users'),('unseenAssessmentClaim',True),('ownerDirection',''),('recordedAt',''),('recordedAt','invalid'),('recordedAt','2026-10-24')]
for key,value in changes:
 b={**a,key:value}
 try:m.validate_owner(b)
 except ValueError:pass
 else:raise AssertionError(key)
assert inspect.signature(m.build).parameters['commit'].default is False
for schema,table in [('auth','users'),('public','items; drop table items')]:
 try:m.fp(schema,table)
 except ValueError:pass
 else:raise AssertionError('unsafe identifier')
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'changed.json';p.write_text('{}')
 try:m.load_configuration(p,{})
 except ValueError as e:assert 'Exact protected C34' in str(e)
 else:raise AssertionError('modified private configuration accepted')
print('22 rejection/default guards passed')
`],{encoding:'utf8'});
  assert.match(output,/22 rejection\/default guards passed/);
});
