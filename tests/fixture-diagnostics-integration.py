"""Deliberate local startup failures with real owned Docker cleanup.

These are fault-injection controls, not provider failures or hosted tests.
Only allowlisted summaries from passing controls are retained for CI artifacts.
"""
import argparse
from contextlib import redirect_stdout
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import traceback
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
import bf16_maintenance_postgres as postgres
import fresh_baseline_stack as provider
from fixture_diagnostics import FixtureDiagnosticError, PREFIX, validate_report

REAL_RUN = subprocess.run
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
CREDENTIAL_ENV = {'POSTGRES_PASSWORD', 'GOTRUE_JWT_SECRET', 'GOTRUE_DB_DATABASE_URL',
                  'PGRST_DB_URI', 'PGRST_JWT_SECRET', 'AUTH_JWT_SECRET', 'DATABASE_URL',
                  'DATABASE_POOL_URL', 'ANON_KEY', 'SERVICE_KEY'}


def owned_objects(owner, network=False):
    command = ['network', 'ls', '-q'] if network else ['ps', '-aq']
    result = REAL_RUN(DOCKER + command + ['--filter', 'label=haiedu.fixture-run=' + owner],
                      check=True, capture_output=True, text=True, timeout=20)
    return result.stdout.split()


def emergency_cleanup(owners):
    # A broken fixture must fail this test, but must not leave its owned control
    # objects behind. The no-leftovers assertion happens before this fallback.
    for owner in owners:
        for network in (False, True):
            for identifier in owned_objects(owner, network):
                kind = 'network' if network else 'container'
                label = '.Labels' if network else '.Config.Labels'
                command = DOCKER + [kind, 'inspect', '--format', '{{index ' + label + ' "haiedu.fixture-run"}}', identifier]
                found = REAL_RUN(command, check=True, capture_output=True, text=True, timeout=20).stdout.strip()
                assert found == owner, 'Control cleanup ownership mismatch'
                remove = ['network', 'rm', identifier] if network else ['rm', '-f', identifier]
                REAL_RUN(DOCKER + remove, check=True, capture_output=True, text=True, timeout=20)


def exercise(kind, output):
    owners, sensitive = set(), []
    injected = False
    auth_container = None
    image = 'haiedu-bf16-cron-fixture:' + hashlib.sha256(postgres.DOCKERFILE.read_bytes()).hexdigest()[:16]

    def run(command, **kwargs):
        nonlocal injected, auth_container
        if command[:2] == DOCKER:
            owners.update(value.split('=', 1)[1] for value in command if value.startswith('haiedu.fixture-run='))
            for position, value in enumerate(command[:-1]):
                if value == '-e':
                    key, _, secret = command[position + 1].partition('=')
                    # A setting such as PASSWORD_MIN_LENGTH=6 is configuration,
                    # not a generated credential. Check the actual secret fields.
                    if key in CREDENTIAL_ENV:
                        sensitive.append(secret)
            if not injected and kind == 'late-client-timeout' and command[2:3] == ['run']:
                injected = True
                result = REAL_RUN(command, **kwargs)
                assert result.returncode == 0, 'Control container did not start'
                raise subprocess.TimeoutExpired(command, 45, output='private-control-output')
            if not injected and kind == 'exited-auth-service' and 'auth' in command and command[2:3] == ['run']:
                injected = True
                auth_container = command[command.index('--name') + 1]
                position = command.index(provider.IMAGES['auth'])
                # Keep the same owned name, network, labels and secret-bearing
                # environment. Hold exit until the parent has obtained the port;
                # a short fixed sleep would race Docker on slower CI runners.
                command = command[:position] + ['--entrypoint', '/bin/sh', image, '-c',
                           'while [ ! -f /tmp/haiedu-exit-control ]; do sleep 0.1; done; exit 23']
            if auth_container is not None and command[2:3] == ['port'] and auth_container in command:
                mapped = REAL_RUN(command, **kwargs)
                assert mapped.returncode == 0, 'Control port mapping failed'
                REAL_RUN(DOCKER + ['exec', auth_container, '/bin/sh', '-c', ': > /tmp/haiedu-exit-control'],
                         check=True, capture_output=True, text=True, timeout=20)
                exited = REAL_RUN(DOCKER + ['wait', auth_container], check=True,
                                  capture_output=True, text=True, timeout=20)
                assert exited.stdout.strip() == '23', 'Control service did not exit as requested'
                return mapped
        return REAL_RUN(command, **kwargs)

    try:
        with tempfile.TemporaryDirectory(prefix='haiedu-diagnostic-control-') as tmp:
            root = Path(tmp)
            stream, error_text = io.StringIO(), ''
            caught = None
            real_wait = provider.wait_for

            def short_wait(check, timeout=45, *, diagnostics=None):
                return real_wait(check, timeout=2, diagnostics=diagnostics)

            with patch.dict(os.environ, {'HAIEDU_FIXTURE_DIAGNOSTICS_DIR': str(root / 'reports')}), \
                    patch.object(subprocess, 'run', side_effect=run), \
                    patch.object(provider, 'wait_for', side_effect=short_wait), redirect_stdout(stream):
                try:
                    context = postgres.cron_database() if kind == 'late-client-timeout' else provider.component_stack(root / 'private')
                    with context:
                        raise AssertionError('An intentionally failed fixture became usable')
                except Exception as error:
                    caught = error
                    error_text = ''.join(traceback.format_exception(error))
            lines = [line[len(PREFIX):] for line in stream.getvalue().splitlines() if line.startswith(PREFIX)]
            assert len(lines) == 1, 'Missing or duplicated final diagnostic summary'
            report = validate_report(json.loads(lines[0]))
            if not injected or not isinstance(caught, FixtureDiagnosticError):
                print('Unexpected startup control result: ' + json.dumps(report), flush=True)
            assert injected and isinstance(caught, FixtureDiagnosticError), 'Expected structured startup failure was not observed'
            saved = json.loads(next((root / 'reports').glob('startup-*.json')).read_text())
            assert saved == report, 'Artifact and console summaries disagree'
            public = stream.getvalue() + error_text + json.dumps(saved)
            assert all(secret not in public for secret in sensitive if secret), 'Generated credential appeared in public output'
            assert 'private-control-output' not in public, 'Private command output appeared in public output'
            expected = ('database', 'container-start', 'command-timeout') if kind == 'late-client-timeout' else ('auth', 'service-ready', 'readiness-timeout')
            if tuple(report['failure'][key] for key in ('component', 'phase', 'reason')) != expected:
                print('Unexpected startup control result: ' + json.dumps(report), flush=True)
            assert tuple(report['failure'][key] for key in ('component', 'phase', 'reason')) == expected, 'Wrong startup failure context'
            assert report['status'] == 'failed', 'Failed startup was reported as complete'
            assert all(value in ('removed', 'absent') for value in report['cleanup'].values()), 'Fixture cleanup was not complete'
            if kind == 'exited-auth-service':
                assert report['observations']['auth']['state'] == 'exited', 'Exited service state was lost'
                assert report['observations']['auth']['exitCode'] == 23, 'Service exit code was lost'
                assert set(report['cleanup']) == {'network', 'database', 'mail', 'auth'}
            for owner in owners:
                assert not owned_objects(owner) and not owned_objects(owner, True), 'The fixture left owned objects behind'
            output.mkdir(parents=True, exist_ok=True)
            (output / ('startup-' + report['runId'] + '.json')).write_text(json.dumps(report, indent=2) + '\n')
            print('PASS expected startup control: ' + kind + '; safe report and real owned cleanup verified', flush=True)
    finally:
        emergency_cleanup(owners)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reports-dir', type=Path, required=True)
    args = parser.parse_args()
    for kind in ('late-client-timeout', 'exited-auth-service'):
        exercise(kind, args.reports_dir)
    print(json.dumps({'passed': True, 'expectedFailureControls': 2, 'productionTouched': False,
                      'boundary': 'Injected failures of disposable local fixtures; not a diagnosis of the historical CI failure'}))


if __name__ == '__main__':
    main()
