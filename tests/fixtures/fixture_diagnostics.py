"""Allowlisted diagnostics for disposable local fixtures, never raw command logs.

Only this schema may reach CI artifacts. Command arguments, response bodies,
exception messages, container environments and private logs are never exported.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
import errno
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile

COMPONENTS = {'database', 'network', 'mail', 'auth', 'storage', 'rest', 'runtime'}
PHASES = {'image-build', 'network-create', 'container-start', 'port-map',
          'database-ready', 'identity-check', 'provider-bootstrap', 'service-ready',
          'provider-role-check', 'runtime-isolation', 'runtime-ready', 'inspect',
          'container-remove', 'network-remove', 'cleanup-verify'}
REASONS = {'disk-full', 'out-of-memory', 'image-pull-denied', 'image-not-found',
           'image-download-throttled', 'dns-failure', 'connection-refused',
           'docker-unavailable', 'permission-denied', 'command-timeout',
           'command-failed', 'readiness-timeout', 'identity-mismatch',
           'ownership-mismatch', 'object-not-found', 'invalid-inspection',
           'operation-failed', 'interrupted'}
STATES = {'created', 'running', 'paused', 'restarting', 'removing', 'exited', 'dead'}
CLEANUP = {'pending', 'removed', 'absent', 'refused', 'failed'}
PREFIX = 'HAIEDU_FIXTURE_FAILURE '


def _integer(value, low=0, high=2**63-1):
    return type(value) is int and low <= value <= high


def validate_report(report):
    """Reject extra fields and arbitrary strings before publication, fail closed."""
    assert type(report) is dict
    assert set(report) == {'schemaVersion', 'scope', 'runId', 'updatedAt', 'status',
                           'active', 'failure', 'cleanupFailures', 'cleanup',
                           'observations', 'hostTemporaryFreeBytes',
                           'hostTemporaryFreeInodes', 'reportWriteFailed'}
    assert report['schemaVersion'] == 1
    assert report['scope'] == 'owned-local-fixture-startup'
    assert re.fullmatch(r'[a-f0-9]{24}', report['runId'])
    assert re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00', report['updatedAt'])
    assert report['status'] in {'running', 'ready', 'failed', 'complete'}
    assert type(report['reportWriteFailed']) is bool
    for key in ('hostTemporaryFreeBytes', 'hostTemporaryFreeInodes'):
        assert report[key] is None or _integer(report[key])

    def event(value, failure=False):
        assert type(value) is dict
        required = {'component', 'phase', 'reason', 'exitCode', 'osError'} if failure else {'component', 'phase'}
        assert set(value) == required
        assert value['component'] in COMPONENTS and value['phase'] in PHASES
        if failure:
            assert value['reason'] in REASONS
            assert value['exitCode'] is None or _integer(value['exitCode'], -255, 255)
            assert value['osError'] is None or _integer(value['osError'], 0, 4096)

    if report['active'] is not None:
        event(report['active'])
    if report['failure'] is not None:
        event(report['failure'], True)
    assert type(report['cleanupFailures']) is list and len(report['cleanupFailures']) <= 16
    for failure in report['cleanupFailures']:
        event(failure, True)
    assert type(report['cleanup']) is dict and set(report['cleanup']) <= COMPONENTS
    assert all(value in CLEANUP for value in report['cleanup'].values())
    assert type(report['observations']) is dict and set(report['observations']) <= COMPONENTS
    for observation in report['observations'].values():
        assert type(observation) is dict
        assert set(observation) <= {'state', 'exitCode', 'oomKilled', 'httpStatus'}
        if 'state' in observation:
            assert observation['state'] in STATES
        if 'exitCode' in observation:
            assert _integer(observation['exitCode'], -255, 255)
        if 'oomKilled' in observation:
            assert type(observation['oomKilled']) is bool
        if 'httpStatus' in observation:
            assert _integer(observation['httpStatus'], 100, 599)
    return report


class FixtureDiagnosticError(RuntimeError):
    def __init__(self, event):
        assert set(event) == {'component', 'phase', 'reason', 'exitCode', 'osError'}
        assert event['component'] in COMPONENTS and event['phase'] in PHASES
        assert event['reason'] in REASONS
        assert event['exitCode'] is None or _integer(event['exitCode'], -255, 255)
        assert event['osError'] is None or _integer(event['osError'], 0, 4096)
        self.event = event
        # Never pass the underlying exception or command into Exception.args.
        super().__init__('local_fixture_failure: ' + event['component'] + '/' +
                         event['phase'] + ': ' + event['reason'])


def classify_failure(error=None, output=''):
    """Recognize a bounded category; unrecognized text stays private/unknown."""
    if isinstance(error, FixtureDiagnosticError):
        return error.event['reason']
    if isinstance(error, subprocess.TimeoutExpired):
        return 'command-timeout'
    if isinstance(error, (KeyboardInterrupt, SystemExit)):
        return 'interrupted'
    if isinstance(error, OSError):
        known = {errno.ENOSPC: 'disk-full', errno.ENOMEM: 'out-of-memory',
                 errno.EACCES: 'permission-denied', errno.EPERM: 'permission-denied',
                 errno.ECONNREFUSED: 'connection-refused'}
        if error.errno in known:
            return known[error.errno]
    text = output.lower()
    if re.search(r'\bnetwork [^\r\n]+ not found\b', text):
        return 'object-not-found'
    for needles, reason in (
        (('no space left on device', 'disk quota exceeded'), 'disk-full'),
        (('out of memory', 'cannot allocate memory'), 'out-of-memory'),
        (('toomanyrequests', 'too many requests', 'pull rate limit'), 'image-download-throttled'),
        (('pull access denied', 'requested access to the resource is denied'), 'image-pull-denied'),
        (('manifest unknown', 'manifest not found'), 'image-not-found'),
        (('temporary failure in name resolution', 'no such host'), 'dns-failure'),
        (('cannot connect to the docker daemon', 'is the docker daemon running'), 'docker-unavailable'),
        (('no such container', 'no such object', 'no such network'), 'object-not-found'),
        (('connection refused',), 'connection-refused'),
        (('permission denied',), 'permission-denied'),
    ):
        if any(needle in text for needle in needles):
            return reason
    return 'command-failed' if output else 'operation-failed'


class FixtureDiagnostics:
    def __init__(self):
        self.run_id = secrets.token_hex(12)
        self.directory = os.environ.get('HAIEDU_FIXTURE_DIAGNOSTICS_DIR')
        self.report = dict(schemaVersion=1, scope='owned-local-fixture-startup',
                           runId=self.run_id, updatedAt='', status='running', active=None,
                           failure=None, cleanupFailures=[], cleanup={}, observations={},
                           hostTemporaryFreeBytes=None, hostTemporaryFreeInodes=None,
                           reportWriteFailed=False)
        self.refresh_capacity()
        self.write()

    def refresh_capacity(self):
        try:
            stat = os.statvfs(tempfile.gettempdir())
            free_bytes, free_inodes = stat.f_bavail * stat.f_frsize, stat.f_favail
            self.report['hostTemporaryFreeBytes'] = free_bytes if _integer(free_bytes) else None
            self.report['hostTemporaryFreeInodes'] = free_inodes if _integer(free_inodes) else None
        except OSError:
            pass

    def write(self):
        self.report['updatedAt'] = datetime.now(timezone.utc).isoformat(timespec='microseconds')
        if not self.directory:
            return
        temporary = None
        try:
            validate_report(self.report)
            directory = Path(self.directory)
            directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            with tempfile.NamedTemporaryFile(mode='w', dir=directory, prefix='.pending-', delete=False) as stream:
                temporary = Path(stream.name)
                json.dump(self.report, stream, indent=2)
                stream.write('\n')
            temporary.replace(directory / ('startup-' + self.run_id + '.json'))
        except (OSError, ValueError, TypeError, AssertionError):
            # Full disk or diagnostic failure must not hide the original error
            # or prevent cleanup. The final allowlisted console summary remains.
            self.report['reportWriteFailed'] = True
        finally:
            if temporary is not None:
                try:
                    temporary.unlink(missing_ok=True)
                except OSError:
                    pass

    def error(self, reason, *, error=None, exit_code=None, output=''):
        assert reason is None or reason in REASONS
        active = self.report['active'] or {'component': 'database', 'phase': 'inspect'}
        event = {**active, 'reason': reason or classify_failure(error, output),
                 'exitCode': exit_code if _integer(exit_code, -255, 255) else None,
                 'osError': error.errno if isinstance(error, OSError) and _integer(error.errno, 0, 4096) else None}
        return FixtureDiagnosticError(event)

    def capture(self, error, *, cleanup=False):
        event = error.event if isinstance(error, FixtureDiagnosticError) else self.error(None, error=error).event
        if self.report['failure'] is None:
            self.report['failure'] = event
        if cleanup and len(self.report['cleanupFailures']) < 16:
            self.report['cleanupFailures'].append(event)
        self.refresh_capacity()
        self.write()
        return FixtureDiagnosticError(event)

    @contextmanager
    def stage(self, component, phase):
        assert component in COMPONENTS and phase in PHASES
        previous, state = self.report['active'], self.report['status']
        self.report.update(active={'component': component, 'phase': phase}, status='running')
        self.write()
        try:
            yield
        except Exception as error:
            raise self.capture(error) from None
        except (KeyboardInterrupt, SystemExit) as error:
            self.capture(error)
            raise
        finally:
            self.report.update(active=previous, status=state)
            self.write()

    def ready(self):
        self.report['status'] = 'ready'
        self.write()

    def track(self, component):
        self.report['cleanup'][component] = 'pending'
        self.write()

    def http_status(self, component, status):
        if component in COMPONENTS and _integer(status, 100, 599):
            self.report['observations'].setdefault(component, {})['httpStatus'] = status
            self.write()

    def finish(self):
        self.report['status'] = 'failed' if self.report['failure'] else 'complete'
        self.report['active'] = None
        self.write()
        if self.report['failure']:
            print(PREFIX + json.dumps(validate_report(self.report), separators=(',', ':')), flush=True)

    def cleanup(self, docker, component, name, *, network=False):
        """Remove only this run's objects, attempt every cleanup, retain first error."""
        phase = 'network-remove' if network else 'container-remove'
        try:
            with self.stage(component, phase):
                kind = 'network' if network else 'container'
                label = '.Labels' if network else '.Config.Labels'
                template = '{"owner":{{json (index ' + label + ' "haiedu.fixture-run")}}'
                if not network:
                    template += ',"state":{{json .State.Status}},"exitCode":{{json .State.ExitCode}},"oomKilled":{{json .State.OOMKilled}}'
                template += '}'

                def inspect():
                    result = docker(kind, 'inspect', '--format', template, name, check=False, return_result=True)
                    if result.returncode:
                        reason = classify_failure(output=result.stderr + result.stdout)
                        if reason == 'object-not-found':
                            return None
                        raise self.error(reason, exit_code=result.returncode)
                    try:
                        value = json.loads(result.stdout)
                        assert type(value) is dict
                    except (ValueError, AssertionError):
                        raise self.error('invalid-inspection') from None
                    return value

                value = inspect()
                if value is None:
                    self.report['cleanup'][component] = 'absent'
                    return
                if value.get('owner') != self.run_id:
                    raise self.error('ownership-mismatch')
                if not network:
                    safe = {}
                    if value.get('state') in STATES:
                        safe['state'] = value['state']
                    if _integer(value.get('exitCode'), -255, 255):
                        safe['exitCode'] = value['exitCode']
                    if type(value.get('oomKilled')) is bool:
                        safe['oomKilled'] = value['oomKilled']
                    self.report['observations'].setdefault(component, {}).update(safe)
                docker('network', 'rm', name) if network else docker('rm', '-f', name)
                if inspect() is not None:
                    raise self.error('operation-failed')
                self.report['cleanup'][component] = 'removed'
        except Exception as error:
            safe = self.capture(error, cleanup=True)
            self.report['cleanup'][component] = 'refused' if safe.event['reason'] == 'ownership-mismatch' else 'failed'
        finally:
            self.write()
