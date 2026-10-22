import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('activation compiler requires the exact bounded owner decision and preserves rollback as default',()=>{
  const output=execFileSync('python3',['-c',String.raw`
import importlib.util,json,inspect
from pathlib import Path
s=importlib.util.spec_from_file_location('activation',Path('scripts/releases/activate-english-7-unit-01.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=json.loads(Path('docs/evidence/english-7-unit-01-owner-activation-20261023.json').read_text());m.validate_owner(a)
for key,value in [('action','activate_production'),('scope',{}),('decisionManifestSha256','0'*64),('configurationSha256','0'*64),('specialistReview','approved'),('learnerSourceUseConfirmed',False),('publicDownloadsAuthorized',True),('recordingProviderVoiceUseBasis',''),('textbookAdaptationUseBasis',''),('unseenAssessmentClaim',True)]:
 b={**a,key:value}
 try:m.validate_owner(b)
 except ValueError:pass
 else:raise AssertionError(key)
assert inspect.signature(m.build).parameters['commit'].default is False
for schema,table in [('auth','users'),('public','items; drop table items')]:
 try:m.fp(schema,table)
 except ValueError:pass
 else:raise AssertionError('unsafe identifier')
print('13 guards passed')
`],{encoding:'utf8'});
  assert.match(output,/13 guards passed/);
});
