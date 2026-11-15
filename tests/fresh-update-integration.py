"""Real local forward-update refusals, atomicity, preservation and API checks.

The two update examples exist only inside a temporary package. They are not
application releases, production migrations or entries in Supabase's ledger.
"""
import argparse
import base64
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import secrets
import shutil
import sys
import tempfile

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from fresh_update_bridge import load_plan, owned_database, capture, comparison, digest, Refusal, LOCK_ID
from fresh_baseline_stack import request, wait_for

FIRST = '''CREATE TABLE private.bf20_fixture_log (id integer PRIMARY KEY, note text NOT NULL);
ALTER TABLE private.bf20_fixture_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.bf20_fixture_log FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO private.bf20_fixture_log VALUES (1,'first update');'''
SECOND = '''ALTER TABLE public.profiles ADD COLUMN bf20_fixture_note text;
INSERT INTO private.bf20_fixture_log VALUES (2,'second update');'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-dir', type=Path, required=True)
    output = parser.parse_args().evidence_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    proof = {'scope':'Synthetic forward updates on an owned local real-component stack; no hosted adoption, data recovery or production acceptance',
             'productionTouched':False, 'startedAt':datetime.now(timezone.utc).isoformat(), 'checks':[]}

    def check(name):
        proof['checks'].append({'name':name,'passed':True})
        print('PASS '+name, flush=True)

    def refuse(action, reason=None, state=None):
        try:
            action()
        except Refusal as error:
            assert reason == str(error), 'Unexpected safe refusal reason'
        except psycopg.Error as error:
            assert state == error.sqlstate, 'Unexpected SQL refusal'
        else:
            raise AssertionError('Expected refusal was not observed')

    try:
        baseline = load_plan()
        # Exercise synthetic update branches independently of any future real
        # plan entries. CI separately rehearses the committed plan itself.
        baseline = {**baseline, 'updates':[], 'entries':[],
                    'headCatalogueSha256':baseline['manifest']['catalogueSha256']}
        with tempfile.TemporaryDirectory(prefix='haiedu-update-package-') as temporary:
            root = Path(temporary)
            for folder in ('baseline', 'migrations', 'operations', 'updates'):
                shutil.copytree(ROOT / 'supabase' / folder, root / 'supabase' / folder)
            plan_file = root / 'supabase/updates/plan.json'
            base_json = json.loads(plan_file.read_text())
            base_json['updates'] = []
            sql_dir = root / 'supabase/updates/sql'
            sql_dir.mkdir(exist_ok=True)

            def package(specs):
                for path in sql_dir.glob('*.sql'):
                    path.unlink()
                data = copy.deepcopy(base_json)
                previous = baseline['manifest']['catalogueSha256']
                for ordinal, (source, after, needs) in enumerate(specs, start=1):
                    identifier = f'202611150000{ordinal:02d}_synthetic'
                    path = 'supabase/updates/sql/'+identifier+'.sql'
                    (root/path).write_text(source)
                    data['updates'].append({'id':identifier,'file':path,'sha256':digest(source.encode()),
                        'beforeCatalogueSha256':previous,'afterCatalogueSha256':after,
                        'dataPolicy':'preserve-existing-rows','requiredData':needs})
                    previous = after
                plan_file.write_text(json.dumps(data))
                return load_plan(root)

            with owned_database(baseline, output / 'private-diagnostics') as database:
                stack = database.stack
                with database.connect() as owner:
                    def fingerprint():
                        with owner.transaction():
                            return comparison.baseline.digest(capture(owner))

                    def receipts():
                        return owner.execute('SELECT position,update_id,contract_sha256 FROM haiedu_local_updates.applied ORDER BY position').fetchall()

                    assert not database.apply(baseline)['applied'] and not receipts()
                    assert owner.execute("SELECT to_regclass('supabase_migrations.schema_migrations')").fetchone()[0] is None
                    check('fresh receipt records the baseline without inventing historical migration entries')

                    users = []
                    for ordinal in range(2):
                        password = secrets.token_urlsafe(24)
                        email = f'bf20-update-{ordinal}-{secrets.token_hex(4)}@example.invalid'
                        status, user = request(stack['auth'],'POST','/admin/users',
                            {'email':email,'password':password,'email_confirm':True,'role':'authenticated',
                             'user_metadata':{'display_name':'Synthetic update learner'}}, stack['serviceToken'])
                        assert status == 200, 'Synthetic Auth creation failed'
                        status, session = request(stack['auth'],'POST','/token?grant_type=password',
                                                  {'email':email,'password':password},stack['anonToken'])
                        assert status == 200, 'Synthetic Auth sign-in failed'
                        users.append({'id':user['id'],'token':session['access_token']})
                    one, two = users
                    grade = owner.execute("INSERT INTO public.grades(grade_number,label_en) VALUES(7,'Synthetic') RETURNING id").fetchone()[0]
                    for ordinal, user in enumerate(users):
                        subject = owner.execute("INSERT INTO public.subjects(code,name_hy) VALUES(%s,'Synthetic subject') RETURNING id",
                                                ['bf20-fixture-'+str(ordinal)]).fetchone()[0]
                        skill = owner.execute("INSERT INTO public.skills(subject_id,grade_id,code,name_hy) VALUES(%s,%s,%s,'Synthetic skill') RETURNING id",
                                              [subject,grade,'bf20-skill-'+str(ordinal)]).fetchone()[0]
                        owner.execute('INSERT INTO public.student_skill_mastery(student_id,skill_id,alpha_evidence,beta_evidence,evidence_count) VALUES(%s,%s,4,3,3)',
                                      [user['id'],skill])
                    bucket = 'bf20-update-private'
                    status,_ = request(stack['storage'],'POST','/bucket',{'id':bucket,'name':bucket,'public':False},stack['serviceToken'])
                    assert status in (200,201), 'Synthetic Storage bucket failed'
                    data = b'Synthetic update preservation file.\n'
                    status,_ = request(stack['storage'],'POST','/object/'+bucket+'/fixture.txt',data,stack['serviceToken'],'text/plain')
                    assert status in (200,201), 'Synthetic Storage upload failed'
                    check('real Auth accounts, two-subject learning evidence and private Storage fixture exist')

                    def access_checks():
                        owner.execute("NOTIFY pgrst,'reload schema'")
                        wait_for(lambda: request(stack['rest'],'GET','/profiles?select=id,role',token=one['token'])[0] == 200)
                        status, rows = request(stack['rest'],'GET','/profiles?select=id,role',token=one['token'])
                        assert status == 200 and rows == [{'id':one['id'],'role':'student'}]
                        status, rows = request(stack['rest'],'GET','/profiles?select=id&id=eq.'+two['id'],token=one['token'])
                        assert status == 200 and rows == []
                        status, rows = request(stack['rest'],'GET','/profiles?select=id',token=stack['anonToken'])
                        assert status in (401,403) or status == 200 and not rows
                        status, received = request(stack['storage'],'GET','/object/authenticated/'+bucket+'/fixture.txt',token=stack['serviceToken'])
                        assert status == 200 and received == data
                        for path, token in [('/object/authenticated/'+bucket+'/fixture.txt',one['token']),
                                            ('/object/public/'+bucket+'/fixture.txt',None)]:
                            status,_ = request(stack['storage'],'GET',path,token=token)
                            assert status in (400,401,403,404)

                    access_checks()
                    check('own-account access and other-account/private-file denials hold before updates')

                    # Independently execute the synthetic candidates in a rolled-
                    # back transaction to pin expected catalogues for this test.
                    # Production plans must commit reviewed post-state hashes.
                    owner.execute('BEGIN')
                    owner.execute(FIRST)
                    first_hash = comparison.baseline.digest(capture(owner))
                    owner.execute(SECOND)
                    second_hash = comparison.baseline.digest(capture(owner))
                    owner.execute('ROLLBACK')
                    start_hash = fingerprint()
                    assert start_hash == baseline['manifest']['catalogueSha256']
                    specs = [(FIRST, first_hash, []), (SECOND, second_hash, [])]
                    full = package(specs)

                    with owner.transaction():
                        owner.execute('SELECT pg_advisory_xact_lock(%s)',[LOCK_ID])
                        refuse(lambda: database.apply(full), 'another_update_is_running')
                    assert fingerprint() == start_hash and not receipts()
                    check('a competing update lock refuses a second runner without writes')

                    owner.execute("COMMENT ON TABLE public.profiles IS 'unexpected local drift'")
                    refuse(lambda: database.apply(full), 'database_structure_drift')
                    owner.execute('COMMENT ON TABLE public.profiles IS NULL')
                    assert fingerprint() == start_hash and not receipts()
                    check('unexpected schema drift refuses the whole update before execution')

                    need = [{'table':'public.subjects','equals':{'code':'missing-required-record'},'minimumRows':1}]
                    missing = package([(FIRST,first_hash,need)])
                    refuse(lambda: database.apply(missing),'required_data_missing')
                    assert fingerprint() == start_hash and not receipts()
                    check('missing declared data prerequisite refuses the update without replaying history')

                    wrong = package([(FIRST,'0'*64,[])])
                    refuse(lambda: database.apply(wrong),'update_result_mismatch')
                    assert fingerprint() == start_hash and not receipts()
                    check('unexpected resulting structure rolls back SQL and the receipt')

                    lost = package([("DELETE FROM public.student_skill_mastery;",start_hash,[])])
                    refuse(lambda: database.apply(lost),'existing_rows_changed_or_removed')
                    assert owner.execute('SELECT count(*) FROM public.student_skill_mastery').fetchone()[0] == 2
                    assert not receipts()
                    check('attempted learning-evidence deletion is refused and restored by rollback')

                    changed = package([("UPDATE public.profiles SET display_name='changed';",start_hash,[])])
                    refuse(lambda: database.apply(changed),'existing_rows_changed_or_removed')
                    assert owner.execute("SELECT count(*) FROM public.profiles WHERE display_name='changed'").fetchone()[0] == 0
                    check('attempted existing account-data rewrite is refused and rolled back')

                    broken = package([(FIRST,first_hash,[]),
                        ("INSERT INTO private.bf20_fixture_log VALUES(1,'duplicate');",first_hash,[])])
                    refuse(lambda: database.apply(broken),state='23505')
                    assert fingerprint() == start_hash and not receipts()
                    check('SQL failure in a later update rolls back the complete pending batch')

                    initial = package(specs[:1])
                    assert len(database.apply(initial)['applied']) == 1
                    assert len(receipts()) == 1
                    check('first future update and its exact receipt commit together')
                    altered = package([(FIRST+'\n-- changed reviewed bytes',first_hash,[])])
                    refuse(lambda: database.apply(altered),'applied_history_changed')
                    check('changed previously applied update is refused even with the same resulting structure')
                    full = package(specs)
                    result = database.apply(full)
                    assert len(result['applied']) == 1 and result['alreadyApplied'] == 1
                    assert len(receipts()) == 2 and fingerprint() == second_hash
                    assert owner.execute('SELECT count(*) FROM private.bf20_fixture_log').fetchone()[0] == 2
                    check('appending an update resumes from the recorded prefix without repeating earlier work')
                    before_receipts = receipts()
                    assert database.apply(full)['applied'] == [] and receipts() == before_receipts
                    check('repeat execution is a verified no-op')
                    shorter = package(specs[:1])
                    refuse(lambda: database.apply(shorter),'unknown_applied_update')
                    check('an older plan cannot omit an already-applied update')
                    owner.execute("UPDATE haiedu_local_updates.applied SET contract_sha256=repeat('0',64) WHERE position=1")
                    refuse(lambda: database.apply(full),'applied_history_changed')
                    owner.execute('UPDATE haiedu_local_updates.applied SET contract_sha256=%s WHERE position=1',[full['entries'][0]['contractSha256']])
                    check('receipt tampering is detected')
                    owner.execute('GRANT USAGE ON SCHEMA haiedu_local_updates TO authenticated')
                    refuse(lambda: database.apply(full),'control_structure_changed')
                    owner.execute('REVOKE USAGE ON SCHEMA haiedu_local_updates FROM authenticated')
                    check('receipt-schema permission drift is detected')
                    assert owner.execute('SELECT count(*) FROM public.student_skill_mastery WHERE alpha_evidence=4 AND beta_evidence=3 AND evidence_count=3').fetchone()[0] == 2
                    access_checks()
                    for role in ('anon','authenticated','service_role'):
                        with database.connect() as client:
                            client.execute('SET ROLE '+role)
                            refuse(lambda: client.execute('SELECT * FROM haiedu_local_updates.applied'),state='42501')
                    check('learning evidence, real profile isolation and private file bytes/access survive both updates')
                    check('browser and service roles cannot read or edit update receipts')
                    assert owner.execute("SELECT to_regclass('supabase_migrations.schema_migrations')").fetchone()[0] is None
                    proof.update(firstCatalogueSha256=first_hash, finalCatalogueSha256=second_hash,
                                 baselineIdentity=baseline['baselineIdentity'], historicLedgerUntouched=True)
                docker, container, network = stack['docker'], stack['container'], stack['network']
            assert not docker('inspect','--format','{{.Name}}',container,check=False)
            assert not docker('network','inspect','--format','{{.Name}}',network,check=False)
            check('owned containers, temporary database/files and network are removed')
        proof['passed'] = True
    except Exception as error:
        proof.update(passed=False,errorType=type(error).__name__)
        if isinstance(error, Refusal):
            proof['reason'] = str(error)
        if isinstance(error, psycopg.Error):
            proof['sqlState'] = error.sqlstate
        if isinstance(error, AssertionError) and error.args and isinstance(error.args[0],str):
            proof['assertion'] = error.args[0]
        print('FAIL '+type(error).__name__,flush=True)
    finally:
        proof['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (output/'result.json').write_text(json.dumps(proof,indent=2)+'\n')
        print(json.dumps({'passed':proof.get('passed',False),'checks':len(proof['checks']),
                          **{k:proof[k] for k in ('errorType','reason','sqlState','assertion') if k in proof}}),flush=True)
    return 0 if proof.get('passed') else 1


if __name__ == '__main__':
    raise SystemExit(main())
