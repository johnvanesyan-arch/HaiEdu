"""Own, disposable PostgreSQL17.6/real-pg_cron fixture; never accepts a DSN."""
from contextlib import contextmanager
from pathlib import Path
import hashlib
import os
import re
import secrets
import subprocess
import time
import psycopg
from fixture_diagnostics import FixtureDiagnostics, FixtureDiagnosticError, classify_failure

ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / 'tests/fixtures/bf16-maintenance-postgres.Dockerfile'


@contextmanager
def cron_database():
    diagnostics = FixtureDiagnostics()
    env = os.environ.copy()
    for key in ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS',
                'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']:
        env.pop(key, None)
    docker_command = ['docker', '--host=unix:///var/run/docker.sock']
    suffix = diagnostics.run_id[:12]
    name = 'haiedu-bf16-maintenance-' + suffix
    password = secrets.token_urlsafe(24)
    digest = hashlib.sha256(DOCKERFILE.read_bytes()).hexdigest()
    image = 'haiedu-bf16-cron-fixture:' + digest[:16]

    def docker(*args, timeout=45, check=True, return_result=False):
        try:
            result = subprocess.run(docker_command + list(args), env=env,
                                    text=True, capture_output=True, timeout=timeout)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise diagnostics.error(None, error=error) from None
        if check and result.returncode:
            raise diagnostics.error(classify_failure(output=result.stderr + result.stdout),
                                    exit_code=result.returncode) from None
        return result if return_result else result.stdout.strip()

    failure = None
    try:
        with diagnostics.stage('database', 'image-build'):
            if not docker('image', 'ls', '-q', image):
                docker('build', '--quiet', '--secret',
                       'id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt',
                       '-f', str(DOCKERFILE), '-t', image, str(DOCKERFILE.parent), timeout=180)
        with diagnostics.stage('network', 'network-create'):
            diagnostics.track('network')
            docker('network', 'create', '--label', 'haiedu.fixture=bf16-maintenance',
                   '--label', 'haiedu.fixture-run=' + diagnostics.run_id, name)
        with diagnostics.stage('database', 'container-start'):
            # Track before the command: the daemon may create the container
            # even if the client subsequently times out.
            diagnostics.track('database')
            docker('run', '-d', '--name', name, '--network', name, '--network-alias', 'db',
                   '--label', 'haiedu.fixture=bf16-maintenance',
                   '--label', 'haiedu.fixture-run=' + diagnostics.run_id,
                   '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=postgres',
                   '-e', 'POSTGRES_PASSWORD=' + password, '-e', 'POSTGRES_DB=postgres',
                   '--tmpfs', '/var/lib/postgresql/data', image)
        with diagnostics.stage('database', 'port-map'):
            match = re.fullmatch(r'127\.0\.0\.1:(\d+)', docker('port', name, '5432/tcp'))
            if not match:
                raise diagnostics.error('identity-mismatch')
        settings = dict(host='127.0.0.1', port=int(match[1]), user='postgres',
                        password=password, dbname='postgres', connect_timeout=2)
        with diagnostics.stage('database', 'database-ready'):
            deadline = time.monotonic() + 30
            while True:
                try:
                    connection = psycopg.connect(**settings, autocommit=True)
                    break
                except psycopg.OperationalError:
                    if time.monotonic() >= deadline:
                        raise diagnostics.error('readiness-timeout') from None
                    time.sleep(.2)
        with diagnostics.stage('database', 'identity-check'), connection as owner:
            identity = owner.execute("select current_setting('server_version_num'),current_user,current_database()").fetchone()
            if identity != ('170006', 'postgres', 'postgres'):
                raise diagnostics.error('identity-mismatch')
        diagnostics.ready()
        yield dict(uri=psycopg.conninfo.make_conninfo(**settings), docker=docker,
                   network=name, container=name, password=password, image=image,
                   diagnostics=diagnostics)
    except BaseException as error:
        failure = error
        if isinstance(error, FixtureDiagnosticError):
            diagnostics.capture(error)
        raise
    finally:
        if 'database' in diagnostics.report['cleanup']:
            diagnostics.cleanup(docker, 'database', name)
        if 'network' in diagnostics.report['cleanup']:
            diagnostics.cleanup(docker, 'network', name, network=True)
        diagnostics.finish()
        if failure is None and diagnostics.report['failure'] is not None:
            raise FixtureDiagnosticError(diagnostics.report['failure']) from None
