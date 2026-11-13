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

ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / 'tests/fixtures/bf16-maintenance-postgres.Dockerfile'


@contextmanager
def cron_database():
    env = os.environ.copy()
    for key in ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS',
                'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']:
        env.pop(key, None)
    docker_command = ['docker', '--host=unix:///var/run/docker.sock']
    suffix = secrets.token_hex(6)
    name = 'haiedu-bf16-maintenance-' + suffix
    password = secrets.token_urlsafe(24)
    digest = hashlib.sha256(DOCKERFILE.read_bytes()).hexdigest()
    image = 'haiedu-bf16-cron-fixture:' + digest[:16]

    def docker(*args, timeout=45, check=True):
        result = subprocess.run(docker_command + list(args), env=env,
                                text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            raise RuntimeError((result.stderr + result.stdout).replace(password, '[fixture-secret]')[-3000:])
        return result.stdout.strip()

    created = False
    network_created = False
    try:
        if not docker('image', 'ls', '-q', image):
            docker('build', '--quiet', '--secret',
                   'id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt',
                   '-f', str(DOCKERFILE), '-t', image, str(DOCKERFILE.parent), timeout=180)
        docker('network', 'create', '--label', 'haiedu.fixture=bf16-maintenance', name)
        network_created = True
        docker('run', '-d', '--name', name, '--network', name, '--network-alias', 'db',
               '--label', 'haiedu.fixture=bf16-maintenance',
               '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=postgres',
               '-e', 'POSTGRES_PASSWORD=' + password, '-e', 'POSTGRES_DB=postgres',
               '--tmpfs', '/var/lib/postgresql/data', image)
        created = True
        match = re.fullmatch(r'127\.0\.0\.1:(\d+)', docker('port', name, '5432/tcp'))
        if not match:
            raise RuntimeError('Owned loopback-only mapping required')
        settings = dict(host='127.0.0.1', port=int(match[1]), user='postgres',
                        password=password, dbname='postgres', connect_timeout=2)
        deadline = time.monotonic() + 30
        while True:
            try:
                connection = psycopg.connect(**settings, autocommit=True)
                break
            except psycopg.OperationalError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('Owned PostgreSQL fixture did not become ready') from None
                time.sleep(.2)
        with connection as owner:
            identity = owner.execute("select current_setting('server_version_num'),current_user,current_database()").fetchone()
            if identity != ('170006', 'postgres', 'postgres'):
                raise RuntimeError('Unexpected fixture identity/version')
        yield dict(uri=psycopg.conninfo.make_conninfo(**settings), docker=docker,
                   network=name, container=name, password=password, image=image)
    finally:
        if created:
            docker('rm', '-f', name, check=False)
        if network_created:
            docker('network', 'rm', name, check=False)
