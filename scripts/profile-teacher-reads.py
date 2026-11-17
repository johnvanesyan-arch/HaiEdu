"""Profile teacher reads in an owned disposable PostgreSQL fixture.

No hosted target, DSN or supplied account is accepted. Timings are observations,
not a CI speed gate or classroom-capacity acceptance. Raw plans stay private.
"""
import argparse
from pathlib import Path
import base64
import hashlib
import json
import math
import statistics
import sys
import uuid
import subprocess
import tempfile
import secrets
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence-dir',type=Path,required=True,help='New private output directory; existing directories are refused')
parser.add_argument('--catalogue',type=Path,help='Optional read-only pg_policies/selected pg_indexes snapshot for parity comparison; never a connection')
args=parser.parse_args()
OUT=args.evidence_dir.resolve()
OUT.mkdir(mode=0o700,parents=True,exist_ok=False)
sys.path[:0] = [str(ROOT / 'scripts'), str(ROOT / 'tests/fixtures')]
from fresh_update_bridge import load_plan, owned_database
from staging_stack import seed_roles, service_runtime
from fresh_baseline_stack import request
from psycopg import sql
from psycopg.types.json import Jsonb

proof = {'schemaVersion': 1, 'startedAt': datetime.now(timezone.utc).isoformat(),
         'sourceCommit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
         'scope': 'Local real PostgreSQL SQL timings; not browser, network or classroom-capacity acceptance',
         'productionTouched': False, 'passed': False, 'samples': [], 'scenarios': []}
proof['profilerSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
proof['liveCatalogueParity']=None

def percentile(values, fraction):
    return sorted(values)[max(0, math.ceil(len(values) * fraction) - 1)]

def login(database, account):
    status, body = request(database.stack['auth'], 'POST', '/token?grant_type=password',
                           {'email': account['email'], 'password': account['password']})
    assert status == 200, 'Local sign-in failed'
    payload = body['access_token'].split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    account['session'] = claims['session_id']

def measure(connection, label, role, query, args=(), claims=None, repeats=21):
    times = []
    buffers = []
    plans = []
    with connection.transaction():
        connection.execute(sql.SQL('SET LOCAL ROLE {}').format(sql.Identifier(role)))
        connection.execute("SET LOCAL statement_timeout='20s'")
        if claims:
            connection.execute("SELECT set_config('request.jwt.claims',%s,true)", [json.dumps(claims)])
        # Keep the first observation, including uncached plan compilation.
        for sample in range(repeats):
            plan = connection.execute('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + query, args).fetchone()[0][0]
            times.append(plan['Execution Time'])
            buffers.append(plan['Plan'].get('Shared Hit Blocks', 0))
            if sample in (0, repeats-1):
                plans.append(plan)
    result = {'label': label, 'role': role, 'count': repeats, 'executionMs': times,
              'firstMs': times[0], 'p50Ms': statistics.median(times),
              'p95Ms': percentile(times, .95), 'sharedHitBlocks': buffers,
              'plans': plans}
    proof['samples'].append(result)
    print(json.dumps({k: result[k] for k in ['label','role','count','firstMs','p50Ms','p95Ms']}), flush=True)

def run_scenario(database, fixture, name):
    with database.connect() as c:
        c.execute('ANALYZE')
        counts = {table: c.execute(sql.SQL('SELECT count(*) FROM public.{}').format(sql.Identifier(table))).fetchone()[0]
                  for table in ['profiles','classes','teacher_assignments','institutional_class_enrollments','learning_sessions','attempts']}
        proof['scenarios'].append({'name': name, 'counts': counts})
        print(json.dumps({'scenario': name, 'counts': counts}), flush=True)
        for school in fixture['schools']:
            teacher = next(a for a in fixture['accounts'] if a['school'] == school['label'] and a['role'] == 'teacher')
            actor, session = teacher['id'], teacher['session']
            prefix = name + ':' + school['label'] + ':'
            calls = [
                ('home', 'SELECT public.service_teacher_dashboard_home(%s,%s,%s)', [actor,session,Jsonb({})]),
                ('archive', 'SELECT public.service_teacher_dashboard_directory(%s,%s,true,0,\'\')', [actor,session]),
                ('class-initial', 'SELECT public.service_teacher_dashboard_initial(%s,%s,%s,%s,%s,%s)', [actor,session,school['class'],school['assignment'],school['release'],school['unit']]),
                ('class-final', 'SELECT public.service_teacher_dashboard_rows(%s,%s,%s,%s)', [actor,session,school['class'],school['assignment']]),
            ]
            for label, query, args in calls:
                measure(c, prefix + label, 'service_role', query, args)
            measure(c, prefix + 'own-profile', 'authenticated', 'SELECT role,account_status FROM public.profiles WHERE id=%s', [actor], {'sub':actor,'role':'authenticated'})

def seed_native_history(database, fixture):
    with tempfile.TemporaryDirectory(prefix='haiedu-bf23-native-') as scratch:
        temporary=Path(scratch)
        bundle=temporary/'functions'
        subprocess.run(['node','scripts/build-staging-functions.mjs',str(bundle)],cwd=ROOT,check=True)
        run_id=secrets.token_hex(12)
        with service_runtime(database,bundle,run_id,proof['sourceCommit'],OUT/'native-diagnostics') as backend:
            fixture.update(runId=run_id,sourceCommit=proof['sourceCommit'],fixtureVersion='two-school-assessment-files-v3',backendOrigin=backend,anonKey=database.stack['anonToken'],screenshotDir=str(OUT/'native-diagnostics/screenshots'))
            private_input=temporary/'fixture.json'
            private_input.write_text(json.dumps(fixture)); private_input.chmod(0o600)
            result=temporary/'journey-result.json'
            subprocess.run(['node','scripts/local-staging-journey.mjs',str(private_input),str(result)],cwd=ROOT,check=True,timeout=600)
            proof['nativeJourney']=json.loads(result.read_text())
            assert proof['nativeJourney']['passed'] and proof['nativeJourney']['browserShutdownVerified']
        with database.connect() as c:
            assert c.execute('SELECT count(*) FROM learning_sessions').fetchone()[0]==4
            assert c.execute('SELECT count(*) FROM attempts').fetchone()[0]==8
        print('PASS native seed: four completed sessions and eight answers',flush=True)

def expand_history(database, fixture, practice_count=20):
    """Synthetic volume, copied from native templates with all guards intact.

    This is SQL fixture construction, not 60 browser sign-ins or capacity proof.
    """
    with database.connect() as c, c.transaction():
        for school in fixture['schools']:
            original=next(a['id'] for a in fixture['accounts'] if a['school']==school['label'] and a['role']=='student')
            templates={mode: c.execute('SELECT id FROM learning_sessions WHERE student_id=%s AND mode=%s',[original,mode]).fetchone()[0] for mode in ('diagnostic','practice')}
            students=c.execute('SELECT student_id,id FROM institutional_class_enrollments WHERE class_id=%s',[school['class']]).fetchall()
            for student,enrollment in students:
                auth_session=uuid.uuid4()
                c.execute("INSERT INTO auth.sessions(id,user_id,aal) VALUES (%s,%s,'aal1')",[auth_session,student])
                for mode,count in [('diagnostic',0 if str(student)==original else 1),('practice',practice_count-1 if str(student)==original else practice_count)]:
                    for ordinal in range(count):
                        session=uuid.uuid4()
                        overrides={'id':str(session),'student_id':str(student),'institutional_class_enrollment_id':str(enrollment),'source_auth_session_id':str(auth_session),**{k:None for k in ('school_id','academic_year_id','class_id','teacher_assignment_id','subject_program_id','academic_context_status')}}
                        c.execute('INSERT INTO learning_sessions SELECT (jsonb_populate_record(NULL::learning_sessions,to_jsonb(s)||%s)).* FROM learning_sessions s WHERE id=%s',[Jsonb(overrides),templates[mode]])
                        for source_item,source_attempt in c.execute('SELECT id,attempt_id FROM learning_session_items WHERE session_id=%s ORDER BY ordinal',[templates[mode]]).fetchall():
                            item,attempt=uuid.uuid4(),uuid.uuid4()
                            c.execute('INSERT INTO learning_session_items SELECT (jsonb_populate_record(NULL::learning_session_items,to_jsonb(i)||%s)).* FROM learning_session_items i WHERE id=%s',[Jsonb({'id':str(item),'session_id':str(session),'attempt_id':None}),source_item])
                            c.execute('INSERT INTO attempts SELECT (jsonb_populate_record(NULL::attempts,to_jsonb(a)||%s)).* FROM attempts a WHERE id=%s',[Jsonb({'id':str(attempt),'student_id':str(student),'learning_session_id':str(session),'learning_session_item_id':str(item)}),source_attempt])
                            c.execute('UPDATE learning_session_items SET attempt_id=%s WHERE id=%s',[attempt,item])
        assert c.execute('SELECT count(*) FROM learning_sessions').fetchone()[0]==60*(practice_count+1)
        assert c.execute('SELECT count(*) FROM attempts').fetchone()[0]==120*(practice_count+1)
    print('PASS synthetic history with all constraints and triggers intact',flush=True)

def verify_scopes(database,fixture):
    with database.connect() as c:
        for school in fixture['schools']:
            teacher=next(a for a in fixture['accounts'] if a['school']==school['label'] and a['role']=='teacher')
            args=[teacher['id'],teacher['session'],school['assignment'],school['release'],school['unit']]
            with c.transaction():
                c.execute('SET LOCAL ROLE service_role')
                evidence=c.execute('SELECT service_teacher_dashboard_evidence(%s,%s,%s,%s,%s)',args).fetchone()[0]
            assert len(evidence['sessions'])==630 and len(evidence['attempts'])==1260
            assert all(s['school_id']==school['school'] and s['class_id']==school['class'] for s in evidence['sessions'])
            assert len({s['student_id'] for s in evidence['sessions']})==30
            owned_sessions={s['id'] for s in evidence['sessions']}
            owned_students={s['student_id'] for s in evidence['sessions']}
            assert all(a['learning_session_id'] in owned_sessions and a['student_id'] in owned_students for a in evidence['attempts'])
            proof.setdefault('evidencePayloadBytes',{})[school['label']]=len(json.dumps(evidence,separators=(',',':')).encode())
            assert len(evidence['versions'])==6
            assert all(set(v['snapshot']['item'])=={'skill_id','difficulty','code','prompt_hy'} for v in evidence['versions'])
            other=next(s for s in fixture['schools'] if s is not school)
            try:
                with c.transaction():
                    c.execute('SET LOCAL ROLE service_role')
                    c.execute('SELECT service_teacher_dashboard_evidence(%s,%s,%s,%s,%s)',[teacher['id'],teacher['session'],other['assignment'],other['release'],other['unit']])
            except Exception as error:
                assert getattr(error,'sqlstate',None)=='42501'
            else: raise AssertionError('foreign school was accepted')
            student=next(a for a in fixture['accounts'] if a['school']==school['label'] and a['role']=='student')
            with c.transaction():
                c.execute('SET LOCAL ROLE authenticated')
                c.execute("SELECT set_config('request.jwt.claims',%s,true)",[json.dumps({'sub':student['id'],'role':'authenticated'})])
                for table in ['items','item_answer_keys']:
                    assert c.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(table))).fetchone()[0]==0
                assert not c.execute("SELECT has_function_privilege('authenticated','public.service_teacher_dashboard_evidence(uuid,uuid,uuid,uuid,uuid)','EXECUTE')").fetchone()[0]
    proof['exactTenantScopeAndStudentDenials']=True

def expand(database, fixture):
    with database.connect() as c, c.transaction():
        for school in fixture['schools']:
            actors = {a['role']:a['id'] for a in fixture['accounts'] if a['school'] == school['label']}
            for number in range(29):
                ids = {key:str(uuid.uuid4()) for key in ['student','member','invitation','enrollment']}
                c.execute('INSERT INTO auth.users(id) VALUES (%s)', [ids['student']])
                c.execute("INSERT INTO institutional_memberships(id,school_id,person_id,role,valid_from,status,created_by) VALUES (%s,%s,%s,'student',now()-interval '1 day','active',%s)", [ids['member'],school['school'],ids['student'],actors['school_admin']])
                c.execute("INSERT INTO institutional_invitations(id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,recipient_user_id,invited_role,token_digest,issued_by,expires_at,used_at) VALUES (%s,%s,%s,%s,%s,%s,%s,'student',%s,%s,now()+interval '1 day',now())", [ids['invitation'],school['school'],school['year'],school['class'],school['assignment'],school['programme'],ids['student'],hashlib.sha256(uuid.uuid4().bytes).hexdigest(),actors['teacher']])
                c.execute("INSERT INTO institutional_class_enrollments(id,school_id,academic_year_id,class_id,student_membership_id,student_id,invitation_id,teacher_assignment_id,subject_program_id,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", [ids['enrollment'],school['school'],school['year'],school['class'],ids['member'],ids['student'],ids['invitation'],school['assignment'],school['programme'],actors['school_admin']])
            c.execute("CREATE TEMP TABLE bf23_archive_ids ON COMMIT DROP AS SELECT gen_random_uuid() class_id,gen_random_uuid() assignment_id,n FROM generate_series(1,500) n")
            c.execute("INSERT INTO public.classes SELECT (jsonb_populate_record(NULL::public.classes,to_jsonb(c)||jsonb_build_object('id',a.class_id,'name','Synthetic archive '||a.n,'is_active',false))).* FROM public.classes c CROSS JOIN bf23_archive_ids a WHERE c.id=%s", [school['class']])
            c.execute("INSERT INTO public.teacher_assignments SELECT (jsonb_populate_record(NULL::public.teacher_assignments,to_jsonb(t)||jsonb_build_object('id',a.assignment_id,'class_id',a.class_id))).* FROM public.teacher_assignments t CROSS JOIN bf23_archive_ids a WHERE t.id=%s", [school['assignment']])
            c.execute('DROP TABLE bf23_archive_ids')

try:
    with owned_database(load_plan(), OUT / 'explore-private-diagnostics',staging_gateway=True) as database:
        proof['forwardUpdates'] = database.apply(load_plan())
        fixture = seed_roles(database, assessment_files=True)
        seed_native_history(database,fixture)
        for account in fixture['accounts']:
            login(database, account)
        with database.connect() as c:
            if args.catalogue:
                hosted=json.loads(args.catalogue.read_text())[0]['metadata']
                local_policies=c.execute("SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname) FROM pg_policies p WHERE schemaname IN ('public','private')").fetchone()[0]
                assert local_policies==hosted['policies'], 'Production/local policy mismatch'
                local_indexes=c.execute("SELECT jsonb_agg(to_jsonb(i) ORDER BY schemaname,tablename,indexname) FROM pg_indexes i WHERE schemaname IN ('public','private') AND tablename IN ('classes','teacher_assignments','institutional_class_enrollments','learning_sessions','attempts','profiles','learning_session_items','teacher_task_privacy_scopes','active_curriculum_release_units')").fetchone()[0]
                assert local_indexes==hosted['indexes'], 'Production/local index mismatch'
                proof['liveCatalogueParity']={'policies':len(local_policies),'selectedIndexes':len(local_indexes)}
            rows = c.execute("SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND (p.proname LIKE 'service_teacher_dashboard_%' OR p.proname IN ('service_teacher_class_directory','service_teacher_workspace','current_user_active','current_user_role','is_teacher_of_student','is_class_teacher','is_class_member')) ORDER BY 1,2,3").fetchall()
            proof['functionDefinitions'] = [{'schema':r[0],'name':r[1],'arguments':r[2],'md5':r[3]} for r in rows]
        run_scenario(database, fixture, 'small')
        expand(database, fixture)
        run_scenario(database, fixture, '30-per-class-500-archives')
        expand_history(database,fixture)
        verify_scopes(database,fixture)
        run_scenario(database,fixture,'30-per-class-500-archives-21-sessions-each')
        with database.connect() as c:
            teacher = next(a for a in fixture['accounts'] if a['school']=='A' and a['role']=='teacher')
            try:
                c.execute("LOAD 'auto_explain'")
                c.execute("SET auto_explain.log_min_duration=0; SET auto_explain.log_nested_statements=on; SET auto_explain.log_analyze=on; SET auto_explain.log_buffers=on; SET auto_explain.log_format='json'; SET auto_explain.log_timing=off")
                with c.transaction():
                    c.execute('SET LOCAL ROLE service_role')
                    c.execute('SELECT public.service_teacher_dashboard_home(%s,%s,%s)', [teacher['id'],teacher['session'],Jsonb({})]).fetchone()
                    school=fixture['schools'][0]
                    c.execute('SELECT public.service_teacher_dashboard_initial(%s,%s,%s,%s,%s,%s)',[teacher['id'],teacher['session'],school['class'],school['assignment'],school['release'],school['unit']]).fetchone()
                proof['nestedExplainCaptured'] = True
            except Exception as error:
                proof['nestedExplainCaptured'] = False
                proof['nestedExplainErrorType'] = type(error).__name__
            c.execute('DELETE FROM auth.sessions')
        logs = database.stack['docker']('logs', database.stack['container'], return_result=True)
        (OUT / 'explore-nested-plans.private.log').write_text(logs.stdout + logs.stderr)
        network = database.stack['network']
        docker = database.stack['docker']
    assert not docker('network','inspect','--format','{{.Name}}',network,check=False)
    proof['ownedCleanupVerified'] = True
    proof['passed'] = True
except Exception as error:
    proof['errorType'] = type(error).__name__
    proof['error'] = str(error)[:1200]
    raise
finally:
    proof['finishedAt'] = datetime.now(timezone.utc).isoformat()
    (OUT / 'explore-result.json').write_text(json.dumps(proof,indent=2)+'\n')
