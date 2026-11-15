"""Qualify identified setup dependencies in an owned disposable local stack.

Does not install a hosted target, replay historical SQL, restore data, activate
live features, or claim complete school/Edge/provider acceptance.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import secrets
import sys
from uuid import uuid4

import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from fresh_update_bridge import load_plan, owned_database, capture, comparison
from fresh_baseline_stack import request
from historical_data_review import validate, REQUIREMENTS


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-dir', type=Path, required=True)
    output = parser.parse_args().evidence_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    proof = {
        'scope': 'Owned local PostgreSQL17.6/Auth/Storage component checks of fresh data prerequisites; synthetic configuration and data only. No hosted activation, real classroom, Edge proxy, recovery or production QA claim.',
        'productionTouched': False, 'checks': [],
        'startedAt': datetime.now(timezone.utc).isoformat(),
    }

    def check(name):
        proof['checks'].append({'name': name, 'passed': True})
        print('PASS ' + name, flush=True)

    def refuses_sql(connection, query, params=None, state='42501', message=None):
        try:
            with connection.transaction():
                connection.execute(query, params)
        except psycopg.Error as error:
            assert error.sqlstate == state, 'Unexpected SQL refusal state'
            if message:
                assert message in str(error), 'Unexpected SQL refusal reason'
        else:
            raise AssertionError('Expected SQL refusal was not observed')

    try:
        proof['reviewCoverage'] = validate()
        plan = load_plan()
        requirements = json.loads((ROOT / REQUIREMENTS).read_text())['requirements']
        buckets = [r['configuration'] for r in requirements
                   if r['kind'] == 'empty-private-storage-bucket']
        # Independent expectations from the two reviewed historical definitions.
        assert [(b['id'], b['fileSizeLimit'], b['allowedMimeTypes']) for b in buckets] == [
            ('supplementary-materials', 5242880, ['application/pdf']),
            ('teacher-task-files', 10485760,
             ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
        ], 'Bucket contract differs from reviewed source definitions'
        check('all historical sources and recorded operations have pinned dispositions')
        with owned_database(plan, output / 'private-diagnostics') as database:
            stack = database.stack
            with database.connect() as owner:
                assert owner.execute('SELECT count(*) FROM private.actor_rate_policies').fetchone()[0] == 4
                for table in ('public.subjects', 'public.grades', 'public.profiles',
                              'public.learning_model_configurations', 'public.runtime_builds',
                              'public.curriculum_releases', 'public.academic_mastery_policy_versions',
                              'private.assessment_presentation_configuration', 'auth.users',
                              'storage.buckets', 'storage.objects'):
                    assert owner.execute('SELECT count(*) FROM ' + table).fetchone()[0] == 0
                assert owner.execute("SELECT count(*) FROM cron.job WHERE jobname LIKE 'haiedu%'").fetchone()[0] == 0
                check('fresh baseline has only four technical policies and no governed data or activation')

                grade = owner.execute("INSERT INTO public.grades(grade_number,label_en) VALUES(7,'Synthetic') RETURNING id").fetchone()[0]
                items = []
                for index in range(2):
                    subject = owner.execute("INSERT INTO public.subjects(code,name_hy) VALUES(%s,'Synthetic') RETURNING id",
                                            [f'BF20-DATA-{index}']).fetchone()[0]
                    skill = owner.execute("INSERT INTO public.skills(subject_id,grade_id,code,name_hy) VALUES(%s,%s,%s,'Synthetic') RETURNING id",
                                          [subject, grade, f'BF20-DATA-{index}-S']).fetchone()[0]
                    family = owner.execute("INSERT INTO public.item_families(skill_id,code,name_hy) VALUES(%s,%s,'Synthetic') RETURNING id",
                                           [skill, f'BF20-DATA-{index}-F']).fetchone()[0]
                    template = owner.execute("""INSERT INTO public.item_templates(item_family_id,code,template_kind,generation_config)
                        VALUES(%s,%s,'fixed',%s) RETURNING id""",
                        [family, f'BF20-DATA-{index}-T', Jsonb({
                            'authoringProfileVersion': 'haiedu-evidence-blueprint-v1',
                            'evidenceBlueprintPolicy': 'distinct-purpose-v1',
                            'requiredEvidencePurposes': ['core_understanding'],
                        })]).fetchone()[0]
                    item = owner.execute("""INSERT INTO public.items(skill_id,item_template_id,item_type,prompt_hy,difficulty,code,variant_key,config,difficulty_band,item_family)
                        VALUES(%s,%s,'single_choice','Synthetic setup probe',1,%s,'synthetic',%s,'core','synthetic') RETURNING id""",
                        [skill, template, f'BF20-DATA-{index}-I', Jsonb({
                            'authoringProfileVersion': 'haiedu-evidence-blueprint-v1',
                            'evidencePurpose': 'core_understanding',
                        })]).fetchone()[0]
                    for position, key in enumerate(('A', 'B', 'C', 'D'), 1):
                        owner.execute("INSERT INTO public.item_options(item_id,option_key,content_hy,display_order) VALUES(%s,%s,'Synthetic option',%s)",
                                      [item, key, position])
                    items.append(item)
                student = uuid4()

                def order(item):
                    return owner.execute('SELECT * FROM private.generate_mcq_option_order(%s,%s)',
                                         [student, item]).fetchone()

                assert all(order(i) == (['A', 'B', 'C', 'D'], 'mcq-option-order-staged-v0') for i in items)
                check('missing MCQ configuration produces staged canonical order in two synthetic subjects')
                owner.execute("""INSERT INTO private.assessment_presentation_configuration(config_key,enabled,algorithm_version)
                    VALUES('mcq_option_order',false,'mcq-option-order-v1')""")
                assert all(order(i) == (['A', 'B', 'C', 'D'], 'mcq-option-order-staged-v0') for i in items)
                check('an explicitly disabled MCQ switch remains staged')
                owner.execute("UPDATE private.assessment_presentation_configuration SET enabled=true WHERE config_key='mcq_option_order'")
                for item in items:
                    result, version = order(item)
                    assert sorted(result) == ['A', 'B', 'C', 'D'] and version == 'mcq-option-order-v1'
                check('synthetic local activation selects the reviewed algorithm and preserves option identities')
                owner.execute('UPDATE public.items SET config=config || %s WHERE id=%s',
                              [Jsonb({'shuffleOptions': False, 'optionOrderRationale': 'Synthetic ordered-scale fixture'}), items[0]])
                assert order(items[0]) == (['A', 'B', 'C', 'D'], 'mcq-option-order-fixed-v1')
                owner.execute('UPDATE public.items SET config=config || %s WHERE id=%s',
                              [Jsonb({'shuffleOptions': False}), items[1]])
                refuses_sql(owner, 'SELECT * FROM private.generate_mcq_option_order(%s,%s)',
                            [student, items[1]], 'P0001', 'shuffle_disabled_without_option_order_rationale')
                check('fixed-order exceptions require a rationale and preserve their canonical order')
                with database.connect() as client:
                    client.execute('SET ROLE service_role')
                    refuses_sql(client, "UPDATE private.assessment_presentation_configuration SET enabled=false")
                    client.execute('RESET ROLE')
                    client.execute('SET ROLE authenticated')
                    refuses_sql(client, 'SELECT * FROM private.assessment_presentation_configuration')
                check('service callers cannot toggle the switch and browser roles cannot read it')

                password = secrets.token_urlsafe(24)
                email = f'bf20-data-{secrets.token_hex(6)}@example.invalid'
                status, _ = request(stack['auth'], 'POST', '/admin/users',
                                    {'email': email, 'password': password, 'email_confirm': True},
                                    stack['serviceToken'])
                assert status == 200, 'Synthetic local account creation failed'
                status, session = request(stack['auth'], 'POST', '/token?grant_type=password',
                                          {'email': email, 'password': password}, stack['anonToken'])
                assert status == 200 and session.get('access_token'), 'Synthetic local sign-in failed'
                check('real local Auth supplies an ordinary authenticated caller for storage denials')

                for bucket in buckets:
                    name = bucket['id']
                    path = '/object/' + name + '/setup-probe.pdf'
                    pdf = b'%PDF-1.4\n% Synthetic BF20 setup probe; no learner data.\n%%EOF\n'
                    status, _ = request(stack['storage'], 'POST', path, pdf,
                                        stack['serviceToken'], 'application/pdf')
                    assert status in (400, 404), 'Missing fixed bucket unexpectedly accepted an upload'
                    check(name + ': missing bucket prevents the expected upload')
                    # The raw Storage HTTP API uses snake_case. The SDK's
                    # camelCase options are not accepted as those wire fields.
                    payload = {'id': name, 'name': name, 'public': False,
                               'file_size_limit': bucket['fileSizeLimit'],
                               'allowed_mime_types': bucket['allowedMimeTypes']}
                    status, _ = request(stack['storage'], 'POST', '/bucket', payload, stack['serviceToken'])
                    assert status in (200, 201), 'Empty private bucket provisioning failed'
                    row = owner.execute('SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id=%s',
                                        [name]).fetchone()
                    proof.setdefault('storageReadback', {})[name] = {
                        'public': row[0], 'fileSizeLimit': row[1], 'allowedMimeTypes': row[2],
                    }
                    assert row == (False, bucket['fileSizeLimit'], bucket['allowedMimeTypes']), 'Storage database configuration differs from requested contract'
                    assert owner.execute('SELECT count(*) FROM storage.objects WHERE bucket_id=%s', [name]).fetchone()[0] == 0
                    status, details = request(stack['storage'], 'GET', '/bucket/' + name, token=stack['serviceToken'])
                    assert status == 200 and details['public'] is False
                    assert details['file_size_limit'] == bucket['fileSizeLimit']
                    assert details['allowed_mime_types'] == bucket['allowedMimeTypes']
                    check(name + ': provider and database readback match the empty private size/MIME contract')
                    status, _ = request(stack['storage'], 'POST', path, pdf,
                                        stack['serviceToken'], 'application/pdf')
                    assert status in (200, 201), 'Allowed synthetic PDF upload failed'
                    status, received = request(stack['storage'], 'GET', '/object/authenticated/' + name + '/setup-probe.pdf',
                                               token=stack['serviceToken'])
                    assert status == 200 and received == pdf, 'Service-mediated PDF readback failed'
                    for endpoint, token in [('/object/public/' + name + '/setup-probe.pdf', None),
                                            ('/object/authenticated/' + name + '/setup-probe.pdf', stack['anonToken']),
                                            ('/object/authenticated/' + name + '/setup-probe.pdf', session['access_token'])]:
                        status, _ = request(stack['storage'], 'GET', endpoint, token=token)
                        assert status in (400, 401, 403, 404), 'Direct private-file read was unexpectedly allowed'
                    check(name + ': service reads exact file bytes while public and browser callers are denied')
                    status, _ = request(stack['storage'], 'POST', '/object/' + name + '/rejected.txt', b'Synthetic',
                                        stack['serviceToken'], 'text/plain')
                    assert status in (400, 415, 422), 'Wrong MIME type was not refused'
                    oversized = b'%PDF-1.4\n' + b'0' * bucket['fileSizeLimit']
                    status, _ = request(stack['storage'], 'POST', '/object/' + name + '/oversized.pdf', oversized,
                                        stack['serviceToken'], 'application/pdf')
                    assert status in (400, 413), 'Over-limit file was not refused'
                    assert owner.execute('SELECT count(*) FROM storage.objects WHERE bucket_id=%s', [name]).fetchone()[0] == 1
                    check(name + ': wrong MIME and oversized files are refused without storing objects')

                with owner.transaction():
                    assert comparison.baseline.digest(capture(owner)) == plan['manifest']['catalogueSha256']
                assert owner.execute("SELECT count(*) FROM cron.job WHERE jobname LIKE 'haiedu%'").fetchone()[0] == 0
                assert owner.execute('SELECT count(*) FROM private.actor_rate_buckets').fetchone()[0] == 0
                check('qualification preserves the application schema and leaves scheduling and rate counters inactive')
        proof['cleanup'] = 'Owned local component stack, synthetic records and file bytes removed'
        proof['passed'] = True
    except Exception as error:
        proof['passed'] = False
        proof['errorType'] = type(error).__name__
        if isinstance(error, psycopg.Error):
            proof['sqlState'] = error.sqlstate
            # Generated fixture details remain private, never published/logged.
            (output / 'private-diagnostics').mkdir(exist_ok=True)
            (output / 'private-diagnostics/sql-failure.json').write_text(json.dumps({
                'message': error.diag.message_primary, 'constraint': error.diag.constraint_name,
            }) + '\n')
        if isinstance(error, AssertionError) and error.args and isinstance(error.args[0], str):
            proof['assertion'] = error.args[0]
        print('FAIL ' + type(error).__name__, flush=True)
    finally:
        proof['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (output / 'result.json').write_text(json.dumps(proof, indent=2) + '\n')
        print(json.dumps({'passed': proof.get('passed', False), 'checks': len(proof['checks']),
                          **{k: proof[k] for k in ('errorType', 'sqlState', 'assertion') if k in proof}}), flush=True)
    return 0 if proof.get('passed') else 1


if __name__ == '__main__':
    raise SystemExit(main())
