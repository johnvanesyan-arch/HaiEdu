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
    args = parser.parse_args()
    output = args.evidence_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    run_id = secrets.token_hex(12)
    proof = {'schemaVersion': 1, 'runId': run_id, 'sourceCommit': source,
             'fixtureVersion': FIXTURE_VERSION, 'edgeImage': EDGE_IMAGE,
             'productionTouched': False, 'hostedTestTouched': False,
             'startedAt': datetime.now(timezone.utc).isoformat(), 'passed': False}
    proof['workingTreeClean'] = not subprocess.check_output(
        ['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=ROOT, text=True).strip()
    runner_files = ['scripts/run-local-staging.py', 'scripts/local-staging-journey.mjs',
                    'scripts/staging-target.mjs', 'scripts/build-staging-functions.mjs',
                    'scripts/fresh_update_bridge.py', 'tests/fixtures/staging_stack.py',
                    'tests/fixtures/staging-gateway.ts', 'tests/fixtures/staging-egress.js',
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
                fixture = seed_roles(database)
                print('PASS complete baseline and six fictional accounts in two schools', flush=True)
                with service_runtime(database, bundle, run_id, source) as backend:
                    fixture.update({'runId': run_id, 'sourceCommit': source, 'fixtureVersion': FIXTURE_VERSION,
                                    'backendOrigin': backend, 'anonKey': database.stack['anonToken']})
                    private_input = temporary / 'fixture.json'
                    private_input.write_text(json.dumps(fixture))
                    private_input.chmod(0o600)
                    result_file = temporary / 'journey-result.json'
                    subprocess.run(['node', 'scripts/local-staging-journey.mjs', str(private_input), str(result_file)], cwd=ROOT, check=True, timeout=240)
                    proof['journey'] = json.loads(result_file.read_text())
                    with database.connect() as connection:
                        assert connection.execute('SELECT count(*) FROM auth.sessions').fetchone()[0] == 0
                        assert connection.execute('SELECT count(*) FROM private.actor_rate_buckets').fetchone()[0] == 0
                    proof['allTestSessionsClosed'] = True
                    proof['rateBudgetCountersCreated'] = 0
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
