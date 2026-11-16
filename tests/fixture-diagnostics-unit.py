"""Failure contracts: useful public context, no raw secrets, honest cleanup."""
from contextlib import redirect_stdout, nullcontext
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import traceback
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
import bf16_maintenance_postgres as fixture
import staging_stack
from fixture_diagnostics import FixtureDiagnostics, FixtureDiagnosticError, PREFIX, classify_failure, validate_report
spec = importlib.util.spec_from_file_location('collector', ROOT / 'scripts/collect-fixture-startup-diagnostics.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

CANARY = 'private-fixture-canary-do-not-publish'
PRIVATE = CANARY + '\nAuthorization: Bearer private-jwt-canary\npostgresql://user:private-dsn-canary@host/db\nfixture-canary@example.invalid\n::error::injected'


class FakeDocker:
    """Model externally observable daemon outcomes, including late client failure."""
    def __init__(self, *, timeout=False, cleanup_error=False, foreign=False, output=PRIVATE):
        self.timeout, self.cleanup_error, self.foreign, self.output = timeout, cleanup_error, foreign, output
        self.objects, self.calls, self.secrets = {}, [], []

    def run(self, command, **kwargs):
        args = command[2:]
        self.calls.append(args)
        result = lambda code=0, out='', err='': subprocess.CompletedProcess(command, code, out, err)
        if args[:3] == ['image', 'ls', '-q']:
            return result(out='cached-image')
        if args[:2] == ['network', 'create']:
            owner = next((x.split('=', 1)[1] for x in args if x.startswith('haiedu.fixture-run=')), 'legacy-fixture-owner')
            self.objects[args[-1]] = {'owner': owner}
            return result(out='network-id')
        if args[0] == 'run':
            name = args[args.index('--name') + 1]
            owner = next((x.split('=', 1)[1] for x in args if x.startswith('haiedu.fixture-run=')), 'legacy-fixture-owner')
            self.secrets += [x.split('=', 1)[1] for x in args if x.startswith('POSTGRES_PASSWORD=')]
            self.objects[name + ':container'] = {'owner': 'unrelated-owner' if self.foreign else owner,
                                                'state': 'running', 'exitCode': 0, 'oomKilled': False}
            if self.timeout:
                raise subprocess.TimeoutExpired(command, 45, output=self.output)
            return result(125, err=self.output)
        if len(args) > 1 and args[1] == 'inspect':
            key = args[-1] + (':container' if args[0] == 'container' else '')
            return result(out=json.dumps(self.objects[key])) if key in self.objects else result(1, err='No such object')
        if args[0] == 'rm':
            if self.cleanup_error:
                return result(1, err='permission denied ' + PRIVATE)
            del self.objects[args[-1] + ':container']
            return result()
        if args[:2] == ['network', 'rm']:
            if self.cleanup_error or args[-1] + ':container' in self.objects:
                return result(1, err='network has active endpoints ' + PRIVATE)
            del self.objects[args[-1]]
            return result()
        raise AssertionError('Unexpected fake Docker operation')


class IsolatedDiagnosticEnvironment(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(os.environ, {'HAIEDU_FIXTURE_DIAGNOSTICS_DIR': ''})
        environment.start()
        self.addCleanup(environment.stop)


class DiagnosticsTests(IsolatedDiagnosticEnvironment):
    def run_failure(self, fake, directory, *, write_failure=False):
        stream = io.StringIO()
        with patch.dict(os.environ, {'HAIEDU_FIXTURE_DIAGNOSTICS_DIR': str(directory)}), \
                patch.object(fixture.subprocess, 'run', side_effect=fake.run), redirect_stdout(stream):
            if write_failure:
                with patch.object(Path, 'mkdir', side_effect=OSError(28, PRIVATE)):
                    try:
                        with fixture.cron_database():
                            self.fail('The failed startup must not yield a usable database')
                    except FixtureDiagnosticError as error:
                        formatted = ''.join(traceback.format_exception(error))
            else:
                try:
                    with fixture.cron_database():
                        self.fail('The failed startup must not yield a usable database')
                except FixtureDiagnosticError as error:
                    formatted = ''.join(traceback.format_exception(error))
        public = stream.getvalue() + formatted
        self.assertTrue(all(value not in public for value in [CANARY, 'private-jwt-canary', 'private-dsn-canary',
                                                              'fixture-canary@example.invalid', '::error::injected', *fake.secrets]),
                        'Public diagnostics exposed a private canary or generated credential')
        rows = [line[len(PREFIX):] for line in stream.getvalue().splitlines() if line.startswith(PREFIX)]
        self.assertEqual(len(rows), 1, 'Exactly one final public summary is required')
        report = validate_report(json.loads(rows[0]))
        if not write_failure:
            saved = json.loads(next(directory.glob('startup-*.json')).read_text())
            self.assertEqual(saved, report)
        return report

    def test_late_client_timeout_keeps_component_and_cleans_created_container(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = FakeDocker(timeout=True)
            report = self.run_failure(fake, Path(tmp))
            self.assertEqual(report['failure']['component'], 'database')
            self.assertEqual(report['failure']['phase'], 'container-start')
            self.assertEqual(report['failure']['reason'], 'command-timeout')
            self.assertEqual(report['cleanup'], {'network': 'removed', 'database': 'removed'})
            self.assertFalse(fake.objects)

    def test_known_disk_error_retains_numeric_exit_code_without_raw_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = self.run_failure(FakeDocker(output='no space left on device ' + PRIVATE), Path(tmp))
            self.assertEqual(report['failure']['reason'], 'disk-full')
            self.assertEqual(report['failure']['exitCode'], 125)

    def test_unknown_reason_stays_unknown_and_still_identifies_startup_step(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = self.run_failure(FakeDocker(), Path(tmp))
            self.assertEqual(report['failure']['reason'], 'command-failed')
            self.assertEqual(report['failure']['phase'], 'container-start')

    def test_cleanup_failure_does_not_replace_first_failure_or_skip_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = FakeDocker(cleanup_error=True, output='no space left on device ' + PRIVATE)
            report = self.run_failure(fake, Path(tmp))
            self.assertEqual(report['failure']['reason'], 'disk-full')
            self.assertEqual(report['cleanup'], {'network': 'failed', 'database': 'failed'})
            self.assertEqual(len(report['cleanupFailures']), 2)
            self.assertTrue(any(args[:2] == ['network', 'rm'] for args in fake.calls))

    def test_unrelated_owner_is_never_removed(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = FakeDocker(foreign=True)
            report = self.run_failure(fake, Path(tmp))
            self.assertEqual(report['cleanup']['database'], 'refused')
            self.assertFalse(any(args[0] == 'rm' for args in fake.calls))

    def test_report_write_failure_preserves_console_error_and_cleanup(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = FakeDocker(timeout=True)
            report = self.run_failure(fake, Path(tmp) / 'unwritable', write_failure=True)
            self.assertTrue(report['reportWriteFailed'])
            self.assertEqual(report['failure']['reason'], 'command-timeout')
            self.assertFalse(fake.objects)

    def test_capacity_is_host_metadata_not_a_claim_about_container_free_space(self):
        report = FixtureDiagnostics().report
        self.assertIn('hostTemporaryFreeBytes', report)
        self.assertNotIn('containerFreeBytes', report)

    def test_categories_are_bounded_and_never_return_input_text(self):
        cases = {'pull access denied': 'image-pull-denied', 'manifest unknown': 'image-not-found',
                 'toomanyrequests': 'image-download-throttled', 'no such host': 'dns-failure',
                 'cannot connect to the Docker daemon': 'docker-unavailable',
                 'cannot allocate memory': 'out-of-memory', 'connection refused': 'connection-refused'}
        for raw, expected in cases.items():
            with self.subTest(expected=expected):
                self.assertEqual(classify_failure(output=raw + PRIVATE), expected)

    def test_unavailable_daemon_during_cleanup_is_not_reported_as_absence(self):
        diag = FixtureDiagnostics()
        diag.track('runtime')
        calls = []

        def docker(*args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess([], 1, '', 'Cannot connect to the Docker daemon ' + PRIVATE)

        diag.cleanup(docker, 'runtime', 'owned-fixture')
        self.assertEqual(diag.report['cleanup']['runtime'], 'failed')
        self.assertEqual(diag.report['failure']['reason'], 'docker-unavailable')
        self.assertFalse(any(args[0] == 'rm' for args in calls))

    def test_runtime_private_log_failure_cannot_replace_startup_error(self):
        diag, stream = FixtureDiagnostics(), io.StringIO()

        def docker(*args, **kwargs):
            if args[0] == 'run':
                raise diag.error('disk-full', exit_code=125)
            if kwargs.get('return_result'):
                return subprocess.CompletedProcess([], 1, '', 'No such object')
            raise AssertionError('Unexpected runtime control command')

        database = SimpleNamespace(connect=lambda: nullcontext(), stack={
            'docker': docker, 'diagnostics': diag, 'network': 'owned-fixture',
            'anonToken': 'private-anon-canary', 'serviceToken': 'private-service-canary'})
        with tempfile.TemporaryDirectory() as tmp, redirect_stdout(stream), \
                patch.object(staging_stack.subprocess, 'run', side_effect=OSError(28, PRIVATE)):
            try:
                with staging_stack.service_runtime(database, Path(tmp), 'run', 'source', Path(tmp)):
                    self.fail('Failed runtime became usable')
            except FixtureDiagnosticError as error:
                formatted = ''.join(traceback.format_exception(error))
            diag.finish()
        self.assertEqual(diag.report['failure']['component'], 'runtime')
        self.assertEqual(diag.report['failure']['phase'], 'container-start')
        self.assertEqual(diag.report['failure']['reason'], 'disk-full')
        self.assertEqual(diag.report['cleanup']['runtime'], 'absent')
        self.assertTrue(all(value not in stream.getvalue() + formatted for value in
                            [CANARY, 'private-anon-canary', 'private-service-canary']))

    def test_unknown_capacity_cannot_break_failure_reporting(self):
        with patch('fixture_diagnostics.os.statvfs', return_value=SimpleNamespace(f_bavail=-1, f_frsize=4096, f_favail=-1)):
            diag = FixtureDiagnostics()
        validate_report(diag.report)
        self.assertIsNone(diag.report['hostTemporaryFreeBytes'])
        self.assertIsNone(diag.report['hostTemporaryFreeInodes'])


class CollectorTests(IsolatedDiagnosticEnvironment):
    def test_only_validated_failed_or_in_progress_reports_are_copied(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, output = root / 'source', root / 'public'
            with patch.dict(os.environ, {'HAIEDU_FIXTURE_DIAGNOSTICS_DIR': str(source)}):
                diag = FixtureDiagnostics()
                diag.track('auth')
                with diag.stage('auth', 'container-start'):
                    (source / 'auth.private.log').write_text(PRIVATE)
                    (source / 'private-diagnostics').mkdir()
                    (source / 'private-diagnostics' / 'token.json').write_text(PRIVATE)
                    self.assertEqual(collector.collect(source, output), 1)
                    copied = list(output.iterdir())
                    self.assertEqual(len(copied), 1)
                    report = validate_report(json.loads(copied[0].read_text()))
                    self.assertEqual(report['active'], {'component': 'auth', 'phase': 'container-start'})
                    self.assertIsNone(report['failure'])
                    self.assertEqual(report['cleanup']['auth'], 'pending')
                    self.assertNotIn(CANARY, copied[0].read_text())
                diag.finish()
                self.assertEqual(collector.collect(source, root / 'completed'), 0)

    def test_extra_fields_unknown_strings_and_symlinks_fail_before_any_copy(self):
        for mutation in ('extra-field', 'unknown-reason', 'symlink', 'malformed'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                source, output = root / 'source', root / 'public'
                with patch.dict(os.environ, {'HAIEDU_FIXTURE_DIAGNOSTICS_DIR': str(source)}):
                    diag = FixtureDiagnostics()
                    path = next(source.glob('startup-*.json'))
                    report = json.loads(path.read_text())
                    if mutation == 'extra-field':
                        report['rawCommand'] = PRIVATE
                    elif mutation == 'unknown-reason':
                        report['failure'] = {'component': 'auth', 'phase': 'container-start',
                                             'reason': PRIVATE, 'exitCode': 1, 'osError': None}
                    elif mutation == 'symlink':
                        private = root / 'private'; private.write_text(PRIVATE)
                        path.unlink(); path.symlink_to(private)
                    if mutation not in ('symlink', 'malformed'):
                        path.write_text(json.dumps(report))
                    elif mutation == 'malformed':
                        path.write_text(PRIVATE)
                    with self.assertRaises((ValueError, TypeError, AssertionError)):
                        collector.collect(source, output)
                    self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
