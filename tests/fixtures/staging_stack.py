"""BF-21 local-only server runtime and synthetic two-school fixture.

The caller must already own the disposable database. No hosted target, existing
database, credentials or environment-selected URL is accepted by the CLI.
"""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import uuid

from fresh_baseline_stack import request, wait_for
from staging_curriculum import seed_navigation_curriculum

EDGE_IMAGE = 'public.ecr.aws/supabase/edge-runtime:v1.78.1@sha256:362e9177660ae4d3affb6978480cc6161a8ea0764f1c2c7f738348eda1c3fbf2'
FUNCTIONS = tuple(json.loads((Path(__file__).parent / 'staging-services.json').read_text()))
FIXTURE_VERSION = 'two-school-dashboards-v2'


@contextmanager
def service_runtime(database, bundle, run_id, source, diagnostic_dir):
    stack = database.stack
    docker = stack['docker']
    # Ownership is rechecked before fixture work. Each runtime joins only the
    # owned network; the public gateway binds exclusively to loopback.
    with database.connect():
        pass
    names = []
    label = 'haiedu.staging-run=' + run_id
    try:
        container = stack['network'] + '-bf21-gateway'
        names.append(container)
        args = ['run', '-d', '--name', container, '--network', stack['network'],
                '--network-alias', 'api', '--label', label,
                '--mount', f'type=bind,src={bundle},dst=/service,readonly',
                '--cap-drop=ALL', '--security-opt=no-new-privileges',
                '-e', 'NO_PROXY=api,auth,rest,storage', '-e', 'no_proxy=api,auth,rest,storage',
                '-p', '127.0.0.1::8080', '-e', 'BF21_GATEWAY=' + json.dumps({
                    'runId': run_id, 'sourceCommit': source,
                    'anonKey': stack['anonToken'], 'serviceKey': stack['serviceToken']})]
        # A single pinned runtime creates separate workers for the fixed registry.
        # Only its owned network aliases are exempted from an inherited proxy.
        docker(*args, EDGE_IMAGE, 'start', '--main-service', '/service/gateway',
               '--port', '8080', timeout=120)
        settings = json.loads(docker('inspect', container))[0]
        assert set(settings['NetworkSettings']['Networks']) == {stack['network']}
        assert settings['Config']['Labels']['haiedu.staging-run'] == run_id
        try:
            address = docker('port', names[-1], '8080/tcp')
        except RuntimeError:
            diagnostic = docker('logs', '--tail', '25', names[-1], check=False)
            for secret in (stack['anonToken'], stack['serviceToken']):
                diagnostic = diagnostic.replace(secret, '[local-secret]')
            raise RuntimeError('local_runtime_start_failed: ' + diagnostic) from None
        assert re.fullmatch(r'127\.0\.0\.1:[1-9][0-9]{0,4}', address)
        backend = 'http://' + address
        expected = {'kind': 'owned-local', 'runId': run_id, 'sourceCommit': source}
        wait_for(lambda: request(backend, 'GET', '/_local/identity') == (200, expected))
        yield backend
    except Exception:
        env = os.environ.copy()
        for key in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'):
            env.pop(key, None)
        logs = subprocess.run(['docker', '--host=unix:///var/run/docker.sock', 'logs', '--tail', '100', names[-1]],
                              env=env, capture_output=True, text=True, timeout=10)
        diagnostic = logs.stdout + logs.stderr
        for secret in (stack['anonToken'], stack['serviceToken']):
            diagnostic = diagnostic.replace(secret, '[local-secret]')
        diagnostic_dir.mkdir(parents=True, exist_ok=True)
        (diagnostic_dir / 'staging-runtime.log').write_text(diagnostic)
        raise
    finally:
        for name in reversed(names):
            if docker('inspect', '--format', '{{.Name}}', name, check=False):
                assert docker('inspect', '--format', '{{index .Config.Labels "haiedu.staging-run"}}', name) == run_id
                docker('rm', '-f', name)
            assert not docker('inspect', '--format', '{{.Name}}', name, check=False)


def seed_roles(database, *, assessment_files=False, mastery=False):
    """Create only fictional rows, through intact constraints and triggers."""
    stack = database.stack
    accounts = []
    with database.connect() as connection:
        assert connection.execute('SELECT count(*) FROM auth.users').fetchone()[0] == 0
        for school in ('A', 'B'):
            for role in ('student', 'teacher', 'school_admin'):
                account = {'school': school, 'role': role,
                           'email': secrets.token_hex(12) + '@example.invalid',
                           'password': secrets.token_urlsafe(30)}
                status, user = request(stack['auth'], 'POST', '/admin/users', {
                    'email': account['email'], 'password': account['password'],
                    'email_confirm': True, 'role': 'authenticated',
                    'user_metadata': {'role': 'admin', 'display_name': 'Synthetic ' + school + ' ' + role}}, stack['serviceToken'])
                assert status == 200, 'local_auth_creation_failed'
                account['id'] = user['id']
                assert connection.execute('SELECT role::text,account_status FROM profiles WHERE id=%s',
                                          [user['id']]).fetchone() == ('student', 'active')
                accounts.append(account)
        schools = []
        with connection.transaction():
            for number, label in enumerate(('A', 'B')):
                actors = {a['role']: a for a in accounts if a['school'] == label}
                ids = {key: str(uuid.uuid4()) for key in (
                    'school', 'year', 'subject', 'grade', 'framework', 'programme',
                    'class', 'assignment', 'grant', 'invitation', 'enrollment',
                    'studentMember', 'teacherMember', 'adminMember')}
                admin = actors['school_admin']['id']
                connection.execute('INSERT INTO schools(id,name,school_code,created_by) VALUES (%s,%s,%s,%s)',
                                   [ids['school'], 'Synthetic school ' + label, 'BF21-' + label, admin])
                connection.execute("INSERT INTO academic_years(id,school_id,label,starts_on,ends_on,status,created_by) VALUES (%s,%s,'Synthetic year',current_date-30,current_date+365,'active',%s)",
                                   [ids['year'], ids['school'], admin])
                connection.execute("INSERT INTO subjects(id,code,name_hy,status) VALUES (%s,%s,%s,'published')",
                                   [ids['subject'], 'SYN-' + label, 'Synthetic subject ' + label])
                # The existing immutable-account guard requires a live staff
                # invitation for initial activation. Seed that legitimate shape
                # instead of disabling a trigger or granting a metadata role.
                for role in ('school_admin', 'teacher'):
                    invitation = str(uuid.uuid4())
                    connection.execute("INSERT INTO staff_account_provisioning(id,recipient_id,issued_by,kind,school_id,subject_id,school_name,expires_at) VALUES (%s,%s,%s,%s,%s,%s,%s,now()+interval '1 day')",
                                       [invitation, actors[role]['id'], admin, role,
                                        ids['school'] if role == 'teacher' else None,
                                        ids['subject'] if role == 'teacher' else None,
                                        'Synthetic school ' + label if role == 'school_admin' else None])
                    connection.execute('UPDATE profiles SET role=%s WHERE id=%s', [role, actors[role]['id']])
                    connection.execute('UPDATE staff_account_provisioning SET accepted_at=now() WHERE id=%s', [invitation])
                connection.execute('INSERT INTO grades(id,grade_number,label_en) VALUES (%s,%s,%s)',
                                   [ids['grade'], 5 + number, 'Synthetic grade ' + label])
                connection.execute("INSERT INTO curriculum_frameworks(id,country_code,title,version_label,status) VALUES (%s,'ZZ',%s,'bf21-v1','published')", [ids['framework'], 'Synthetic framework ' + label])
                connection.execute("INSERT INTO subject_programs(id,curriculum_framework_id,subject_id,grade_id,version_label,status) VALUES (%s,%s,%s,%s,'bf21-v1','published')",
                                   [ids[k] for k in ('programme', 'framework', 'subject', 'grade')])
                for role, member in (('student', 'studentMember'), ('teacher', 'teacherMember'), ('school_admin', 'adminMember')):
                    connection.execute("INSERT INTO institutional_memberships(id,school_id,person_id,role,valid_from,status,created_by) VALUES (%s,%s,%s,%s,now()-interval '1 day','active',%s)",
                                       [ids[member], ids['school'], actors[role]['id'], role, admin])
                connection.execute("INSERT INTO classes(id,school_id,teacher_id,subject_id,grade_id,name,academic_year_id) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                                   [ids['class'], ids['school'], actors['teacher']['id'], ids['subject'], ids['grade'], 'Synthetic class ' + label, ids['year']])
                connection.execute("INSERT INTO teacher_subject_authorizations(id,school_id,teacher_membership_id,subject_id,status,valid_from,created_by) VALUES (%s,%s,%s,%s,'active',now()-interval '1 day',%s)",
                                   [ids[k] for k in ('grant', 'school', 'teacherMember', 'subject')] + [admin])
                connection.execute("INSERT INTO teacher_assignments(id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,valid_from,status,created_by) VALUES (%s,%s,%s,%s,%s,%s,now(),'active',%s)",
                                   [ids[k] for k in ('assignment', 'school', 'year', 'class', 'teacherMember', 'programme')] + [admin])
                connection.execute("INSERT INTO institutional_invitations(id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,recipient_user_id,invited_role,token_digest,issued_by,expires_at,used_at) VALUES (%s,%s,%s,%s,%s,%s,%s,'student',%s,%s,now()+interval '1 day',now())",
                                   [ids[k] for k in ('invitation', 'school', 'year', 'class', 'assignment', 'programme')] + [actors['student']['id'], hashlib.sha256(secrets.token_bytes(32)).hexdigest(), admin])
                connection.execute("INSERT INTO institutional_class_enrollments(id,school_id,academic_year_id,class_id,student_membership_id,student_id,invitation_id,teacher_assignment_id,subject_program_id,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                                   [ids[k] for k in ('enrollment', 'school', 'year', 'class', 'studentMember')] + [actors['student']['id']] + [ids[k] for k in ('invitation', 'assignment', 'programme')] + [admin])
                school = {'label': label, **ids}
                seed_navigation_curriculum(connection, school, assessment_files=assessment_files, mastery=mastery)
                schools.append(school)
            if assessment_files:
                connection.execute("INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('teacher-task-files','teacher-task-files',false,10485760,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])")
            connection.execute("NOTIFY pgrst,'reload schema'")
    return {'accounts': accounts, 'schools': schools}
