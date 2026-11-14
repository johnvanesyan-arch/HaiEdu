"""Complete fresh schema, real local provider behavior, and SQL concurrency.

No DSN or project argument is accepted. Every resource is owned and disposable.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import secrets
import sys
import time
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / 'tests/fixtures'))
from fresh_baseline_stack import component_stack, request, wait_for

spec = importlib.util.spec_from_file_location('comparison', ROOT / 'scripts/compare-fresh-baseline.py')
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--evidence-dir',type=Path,required=True)
    args = p.parse_args()
    output = args.evidence_dir.resolve()
    output.mkdir(parents=True,exist_ok=True)
    checks = []
    proof = {'scope':'Fresh application schema on owned PostgreSQL17.6 + real GoTrue/PostgREST/Storage components; not the complete CLI bundle, hosted QA, classroom capacity or data/Storage recovery',
             'checks':checks,'productionTouched':False,'startedAt':datetime.now(timezone.utc).isoformat()}
    schema = (ROOT / 'supabase/baseline/schema.sql').read_text()
    manifest = json.loads((ROOT / 'supabase/baseline/manifest.json').read_text())
    query = (ROOT / 'scripts/sql/fresh-baseline-catalogue.sql').read_text()
    assert hashlib.sha256(schema.encode()).hexdigest() == manifest['schemaSha256']
    inputs = [{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
              for directory in ('migrations','operations')
              for p in sorted((ROOT / 'supabase' / directory).glob('*.sql'))]
    assert inputs == manifest['sourceInputs'], 'Database source changed: review/advance the fresh baseline and future-update plan'

    def check(name):
        checks.append({'name':name,'passed':True})
        print('PASS '+name,flush=True)

    def capture(c):
        c.execute('BEGIN READ ONLY')
        c.execute('SET LOCAL search_path=pg_catalog')
        result = c.execute(query).fetchone()[0]
        c.execute('COMMIT')
        return result

    def rejects(c,statement,code,message=None,params=None):
        try:
            c.execute(statement,params)
        except psycopg.Error as error:
            c.execute('ROLLBACK')
            assert error.sqlstate == code, (code,error.sqlstate)
            if message:
                assert message in str(error), message
        else:
            raise AssertionError('Expected refusal was not observed')

    try:
        with component_stack(output / 'private-diagnostics') as stack:
            proof['images'] = {**stack['images'],'database':stack['image']}
            with psycopg.connect(stack['uri'],autocommit=True) as owner:
                check('real provider services start with empty application schemas')
                rejects(owner,(ROOT / 'supabase/migrations/0002_public_read_policies.sql').read_text(),'42P01','public.subjects')
                check('original first migration reproduces missing starting-table failure')
                rejects(owner,schema,'P0001','fresh_baseline_explicit_local_mode_required')
                check('baseline refuses installation without explicit local mode')
                owner.execute("SET haiedu.fresh_baseline='local-empty-v1'")
                owner.execute(schema)
                actual = capture(owner)
                differences = comparison.compare_manifest(manifest,actual)
                (output / 'catalogue-comparison.json').write_text(json.dumps({'differences':differences,'counts':{k:len(v) for k,v in actual.items()},'fingerprint':comparison.baseline.digest(actual)},indent=2)+'\n')
                assert not differences, 'Rebuilt catalogue differs; inspect private receipt'
                check('complete schema and effective permissions match reviewed catalogue')
                rejects(owner,schema,'P0001','fresh_baseline_requires_empty_application_schemas')
                assert comparison.baseline.digest(capture(owner)) == manifest['catalogueSha256']
                check('second installation is refused without changing the existing schema')
                owner.execute((ROOT / 'supabase/baseline/technical-seed.sql').read_text())
                assert owner.execute('SELECT count(*) FROM private.actor_rate_policies').fetchone()[0] == 4
                assert owner.execute('SELECT count(*) FROM auth.users').fetchone()[0] == 0
                assert owner.execute('SELECT count(*) FROM storage.objects').fetchone()[0] == 0
                assert owner.execute("SELECT count(*) FROM cron.job WHERE jobname LIKE 'haiedu%'").fetchone()[0] == 0
                check('only four technical policies seeded; no users, files or scheduled activation')
                users = []
                for i in range(2):
                    password = secrets.token_urlsafe(22)
                    email = f'bf20-{i}-{secrets.token_hex(4)}@example.invalid'
                    status,user = request(stack['auth'],'POST','/admin/users',{'email':email,'password':password,'email_confirm':True,'role':'authenticated','user_metadata':{'role':'admin','display_name':'Synthetic BF20'}},stack['serviceToken'])
                    assert status == 200, 'Local Auth creation failed'
                    assert owner.execute('SELECT role::text,account_status FROM public.profiles WHERE id=%s',[user['id']]).fetchone() == ('student','active')
                    status,session = request(stack['auth'],'POST','/token?grant_type=password',{'email':email,'password':password},stack['anonToken'])
                    assert status == 200, 'Local Auth password sign-in failed'
                    claims = json.loads(base64.urlsafe_b64decode(session['access_token'].split('.')[1]+'=='))
                    (output / 'private-diagnostics/token-role.json').write_text(json.dumps({'role':claims.get('role'),'aud':claims.get('aud')})+'\n')
                    assert claims['role'] == 'authenticated' and (claims['aud'] == 'authenticated' or claims['aud'] == ['authenticated']), 'Local Auth must issue the actual authenticated role'
                    sid = claims['session_id']
                    assert owner.execute('SELECT user_id::text FROM auth.sessions WHERE id=%s',[sid]).fetchone()[0] == user['id']
                    users.append({'id':user['id'],'session':sid,'token':session['access_token']})
                check('real Auth creates profiles and ignores user-editable admin claims')
                check('real sign-ins create valid provider sessions')
                one,two = users
                owner.execute("NOTIFY pgrst,'reload schema'")
                def profile_ready():
                    status,value = request(stack['rest'],'GET','/profiles?select=id,role',token=one['token'])
                    if status != 200:
                        (output / 'private-diagnostics/profile-request.json').write_text(json.dumps({'status':status,'error':value},indent=2)+'\n')
                    return status == 200
                wait_for(profile_ready)
                status,rows = request(stack['rest'],'GET','/profiles?select=id,role',token=one['token'])
                assert status == 200 and rows == [{'id':one['id'],'role':'student'}]
                status,rows = request(stack['rest'],'GET','/profiles?select=id&id=eq.'+two['id'],token=one['token'])
                assert status == 200 and rows == []
                check('real Data API allows own profile and hides another account')
                status,rows = request(stack['rest'],'GET','/profiles?select=id&id=eq.'+one['id'],token=stack['anonToken'])
                assert status in (401,403) or status == 200 and rows == []
                check('anonymous caller cannot read the synthetic profile')
                payload = {'p_actor':one['id'],'p_session':one['session'],'p_costs':{'app':1}}
                status,_ = request(stack['rest'],'POST','/rpc/service_reserve_session_rate_budgets',payload,one['token'])
                assert status in (401,403,404)
                assert owner.execute('SELECT count(*) FROM private.actor_rate_buckets').fetchone()[0] == 0
                check('browser role cannot invoke the privileged budget capability')
                status,result = request(stack['rest'],'POST','/rpc/service_reserve_session_rate_budgets',payload,stack['serviceToken'])
                assert status == 200 and result['allowed'] is True
                check('service role can invoke the same capability with a real session')

                def reserve(user,costs):
                    with psycopg.connect(stack['uri'],autocommit=True) as c:
                        c.execute("SET statement_timeout='15s'")
                        c.execute('SET ROLE service_role')
                        return c.execute('SELECT public.service_reserve_session_rate_budgets(%s,%s,%s)',[user['id'],user['session'],Jsonb(costs)]).fetchone()[0]

                started = time.monotonic()
                with ThreadPoolExecutor(max_workers=24) as pool:
                    results = list(pool.map(lambda _:reserve(one,{'app':1,'code_redemption':1}),range(40)))
                assert time.monotonic()-started < 30
                assert sum(r['allowed'] for r in results) == 10
                assert all(1 <= r['retryAfterSeconds'] <= 60 for r in results if not r['allowed'])
                check('forty concurrent real-session SQL callers admit exactly ten code attempts')
                snapshot = lambda: owner.execute("SELECT coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('version',xmin::text) ORDER BY actor_id,policy_key),'[]') FROM private.actor_rate_buckets b").fetchone()[0]
                before = snapshot()
                with ThreadPoolExecutor(max_workers=12) as pool:
                    refused = list(pool.map(lambda _:reserve(one,{'app':1,'code_redemption':1}),range(12)))
                assert not any(r['allowed'] for r in refused) and snapshot() == before
                assert reserve(two,{'app':1,'code_redemption':1})['allowed']
                check('concurrent refusals are atomic and another account remains independent')
                owner.execute("UPDATE auth.sessions SET not_after=clock_timestamp()-interval '1 second' WHERE id=%s",[two['session']])
                with psycopg.connect(stack['uri'],autocommit=True) as client:
                    client.execute('SET ROLE service_role')
                    rejects(client,'SELECT public.service_reserve_session_rate_budgets(%s,%s,%s)','42501',params=[two['id'],two['session'],Jsonb({'app':1})])
                check('expired real provider session is refused by the session-bound service')
                bucket = 'bf20-private'
                status,_ = request(stack['storage'],'POST','/bucket',{'id':bucket,'name':bucket,'public':False},stack['serviceToken'])
                assert status in (200,201), 'Local Storage bucket creation failed: HTTP '+str(status)
                data = b'Synthetic BF20 private object; no learner data.\n'
                status,_ = request(stack['storage'],'POST','/object/'+bucket+'/fixture.txt',data,stack['serviceToken'],'text/plain')
                assert status in (200,201), 'Local Storage upload failed: HTTP '+str(status)
                status,received = request(stack['storage'],'GET','/object/authenticated/'+bucket+'/fixture.txt',token=stack['serviceToken'])
                assert status == 200 and received == data, 'Local Storage private read failed: HTTP '+str(status)
                check('real Storage writes and reads a private synthetic object for the service')
                for path,token in [('/object/authenticated/'+bucket+'/fixture.txt',one['token']),('/object/public/'+bucket+'/fixture.txt',None)]:
                    status,_ = request(stack['storage'],'GET',path,token=token)
                    assert status in (400,401,403,404)
                check('private Storage object is unavailable to the student and public caller')
                assert comparison.baseline.digest(capture(owner)) == manifest['catalogueSha256']
                check('provider behavior and concurrency checks preserve the application schema')
                proof['catalogueSha256'] = manifest['catalogueSha256']
                proof['schemaSha256'] = manifest['schemaSha256']
        proof['cleanup'] = 'Owned component containers, PostgreSQL tmpfs, file tmpfs and network removed'
        proof['passed'] = True
    except Exception as error:
        proof['passed'] = False
        proof['errorType'] = type(error).__name__
        if isinstance(error,psycopg.Error):
            proof['sqlState'] = error.sqlstate
        if isinstance(error,AssertionError) and error.args and isinstance(error.args[0],str):
            proof['assertion'] = error.args[0]
        # Do not print exception repr/traceback: Docker timeout exceptions can
        # contain the generated service keys in their command arguments.
        print('FAIL '+type(error).__name__+' after '+str(len(checks))+' completed checks',flush=True)
    finally:
        proof['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (output / 'result.json').write_text(json.dumps(proof,indent=2)+'\n')
        print(json.dumps({'passed':proof.get('passed',False),'checks':len(checks),
                          **{k:proof[k] for k in ('errorType','assertion','sqlState') if k in proof}}),flush=True)
    return 0 if proof.get('passed') else 1


if __name__ == '__main__':
    raise SystemExit(main())
