"""Build BF-21's disposable local staging journey. No hosted target is accepted."""
import argparse
from datetime import datetime, timezone
import json
import hashlib
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from fresh_update_bridge import load_plan, owned_database
from staging_stack import EDGE_IMAGE, FIXTURE_VERSION, seed_roles, service_runtime


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-dir', type=Path, required=True)
    parser.add_argument('--journey', choices=('dashboards', 'assessment-files'), default='dashboards')
    args = parser.parse_args()
    assessment_files = args.journey == 'assessment-files'
    fixture_version = 'two-school-assessment-files-v3' if assessment_files else FIXTURE_VERSION
    output = args.evidence_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    run_id = secrets.token_hex(12)
    proof = {'schemaVersion': 1, 'runId': run_id, 'sourceCommit': source,
             'fixtureVersion': fixture_version, 'journeyKind': args.journey, 'edgeImage': EDGE_IMAGE,
             'productionTouched': False, 'hostedTestTouched': False,
             'startedAt': datetime.now(timezone.utc).isoformat(), 'passed': False}
    proof['workingTreeClean'] = not subprocess.check_output(
        ['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=ROOT, text=True).strip()
    runner_files = ['scripts/run-local-staging.py', 'scripts/local-staging-journey.mjs',
                    'scripts/local-staging-assessment-files.mjs', 'tests/fixtures/staging_assessments.py',
                    'tests/fixtures/synthetic-task-documents.mjs', 'tests/fixtures/governed-runtime-model.json',
                    'scripts/staging-target.mjs', 'scripts/build-staging-functions.mjs', 'scripts/local-staging-dashboard-checks.mjs',
                    'scripts/fresh_update_bridge.py', 'tests/fixtures/staging_stack.py', 'tests/fixtures/staging_curriculum.py',
                    'tests/fixtures/staging-gateway.ts', 'tests/fixtures/staging-services.json', 'tests/fixtures/staging-egress.js',
                    'tests/fixtures/fresh_baseline_stack.py', 'tests/fixtures/bf16_maintenance_postgres.py']
    proof['runnerSources'] = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in runner_files}
    # Generated identities, service keys and data exist only in private temporary
    # files/owned containers. Only the sanitized result survives cleanup.
    try:
        with tempfile.TemporaryDirectory(prefix='haiedu-bf21-') as scratch:
            temporary = Path(scratch)
            bundle = temporary / 'functions'
            subprocess.run(['node', 'scripts/build-staging-functions.mjs', str(bundle)], cwd=ROOT, check=True)
            proof['functionSources'] = json.loads((bundle / 'source-manifest.json').read_text())
            with owned_database(load_plan(), output / 'private-diagnostics', staging_gateway=True) as database:
                proof['componentImages'] = {**database.stack['images'], 'database': database.stack['image']}
                fixture = seed_roles(database, assessment_files=assessment_files)
                print('PASS complete baseline and six fictional accounts in two schools', flush=True)
                with service_runtime(database, bundle, run_id, source, output / 'private-diagnostics') as backend:
                    fixture.update({'runId': run_id, 'sourceCommit': source, 'fixtureVersion': fixture_version,
                                    'backendOrigin': backend, 'anonKey': database.stack['anonToken'],
                                    'screenshotDir': str(output / 'private-diagnostics' / 'screenshots')})
                    private_input = temporary / 'fixture.json'
                    private_input.write_text(json.dumps(fixture))
                    private_input.chmod(0o600)
                    result_file = temporary / 'journey-result.json'
                    subprocess.run(['node', 'scripts/local-staging-journey.mjs', str(private_input), str(result_file)], cwd=ROOT, check=True, timeout=600)
                    proof['journey'] = json.loads(result_file.read_text())
                    with database.connect() as connection:
                        assert connection.execute('SELECT count(*) FROM auth.sessions').fetchone()[0] == 0
                        assert connection.execute('SELECT count(*) FROM private.actor_rate_buckets').fetchone()[0] == 0
                        learning_count = connection.execute('SELECT count(*) FROM public.learning_sessions').fetchone()[0]
                        attempt_count = connection.execute('SELECT count(*) FROM public.attempts').fetchone()[0]
                        assert learning_count == (4 if assessment_files else 0)
                        assert attempt_count == (8 if assessment_files else 0)
                        if assessment_files:
                            assert connection.execute("SELECT count(*) FROM learning_sessions WHERE status<>'completed'").fetchone()[0] == 0
                            assert connection.execute('SELECT count(*) FROM teacher_task_submissions').fetchone()[0] == 2
                            assert connection.execute('SELECT count(*) FROM teacher_task_reviews').fetchone()[0] == 2
                            assert connection.execute("SELECT count(*) FROM storage.objects WHERE bucket_id='teacher-task-files'").fetchone()[0] == 6
                            assert connection.execute('SELECT count(*) FROM attempts WHERE NOT correct').fetchone()[0] == 0
                            for school in fixture['schools']:
                                actors = {a['role']: a['id'] for a in fixture['accounts'] if a['school'] == school['label']}
                                rows = connection.execute('''SELECT mode,answered_count,correct_count FROM learning_sessions
                                  WHERE student_id=%s AND school_id=%s AND institutional_class_enrollment_id=%s
                                  AND curriculum_release_id=%s ORDER BY mode''',
                                  [actors['student'], school['school'], school['enrollment'], school['release']]).fetchall()
                                assert rows == [('diagnostic', 2, 2), ('practice', 2, 2)]
                                assert connection.execute('''SELECT count(*) FROM attempts
                                  WHERE student_id=%s AND curriculum_release_id=%s''',
                                  [actors['student'], school['release']]).fetchone()[0] == 4
                                assert connection.execute('''SELECT count(*) FROM teacher_task_submissions s
                                  JOIN teacher_task_response_files f ON f.id=s.file_id
                                  JOIN teacher_task_reviews r ON r.submission_id=s.id
                                  WHERE s.student_id=%s AND s.enrollment_id=%s AND f.student_id=s.student_id
                                  AND f.enrollment_id=s.enrollment_id AND f.format='docx'
                                  AND r.teacher_id=%s AND r.version=1''',
                                  [actors['student'], school['enrollment'], actors['teacher']]).fetchone()[0] == 1
                            assert connection.execute('''SELECT count(*) FROM storage.objects o
                              WHERE o.bucket_id='teacher-task-files' AND o.name IN (
                                SELECT object_path FROM teacher_task_source_files WHERE status='ready'
                                UNION SELECT object_path FROM teacher_task_response_files WHERE status='ready')''').fetchone()[0] == 6
                            proof['tenantEvidenceBindingsVerified'] = True
                            proof['privateFilesCreated'] = 6
                            proof['taskSubmissionsCreated'] = 2
                            proof['publishedTaskReviews'] = 2

                    proof['allTestSessionsClosed'] = True
                    proof['rateBudgetCountersCreated'] = 0
                    proof['learningSessionsCreated'] = learning_count
                    proof['assessmentAttemptsCreated'] = attempt_count
                docker, network = database.stack['docker'], database.stack['network']
            assert not docker('network', 'inspect', '--format', '{{.Name}}', network, check=False)
            assert not docker('ps', '-aq', '--filter', 'label=haiedu.staging-run=' + run_id)
            assert not docker('ps', '-aq', '--filter', 'name=' + network)
            proof['ownedCleanupVerified'] = True
        proof['passed'] = True
        print('PASS owned containers, network and temporary credentials removed', flush=True)
    finally:
        proof['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (output / 'result.json').write_text(json.dumps(proof, indent=2) + '\n')


if __name__ == '__main__':
    main()
