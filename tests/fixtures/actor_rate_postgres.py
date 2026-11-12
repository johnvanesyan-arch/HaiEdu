"""Own disposable PostgreSQL 17.6 only; no caller-supplied URL or credentials."""
from contextlib import contextmanager
import os
import re
import subprocess
import time
import uuid
import psycopg
from psycopg import sql


@contextmanager
def database_uri():
    if os.environ.get('PHASE3_POSTGRES_17_CI') == '1':
        from phase3_postgres import database_uri as ci_database
        with ci_database() as uri:
            yield uri
        return
    # Local test mode creates its OWN labeled container and obtains the dynamic
    # loopback port from Docker. It never accepts a port, DSN or remote hostname.
    env = os.environ.copy()
    for key in ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS',
                'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']:
        env.pop(key, None)
    command = ['docker', '--host=unix:///var/run/docker.sock']
    name = 'haiedu-bf16-fixture-' + uuid.uuid4().hex[:12]
    def docker(*args):
        return subprocess.check_output(command + list(args), env=env, text=True, timeout=45).strip()
    created = False
    try:
        docker('run', '--rm', '-d', '--name', name, '--label', 'haiedu.fixture=bf16-core',
               '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=bf16_fixture',
               '-e', 'POSTGRES_PASSWORD=fixture-only', '-e', 'POSTGRES_DB=bf16_qa_root',
               'postgres:17.6-alpine')
        created = True
        port = docker('port', name, '5432/tcp')
        match = re.fullmatch(r'127\.0\.0\.1:(\d+)', port)
        if not match:
            raise RuntimeError('Disposable loopback mapping required')
        settings = dict(host='127.0.0.1', port=int(match[1]), user='bf16_fixture',
                        password='fixture-only', dbname='bf16_qa_root', connect_timeout=2)
        deadline = time.monotonic() + 30
        while True:
            try:
                connection = psycopg.connect(**settings, autocommit=True)
                break
            except psycopg.OperationalError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('Disposable PostgreSQL did not become ready') from None
                time.sleep(.2)
        with connection as root:
            identity = root.execute("select current_setting('server_version_num'),current_user,current_database()").fetchone()
            if identity != ('170006', 'bf16_fixture', 'bf16_qa_root'):
                raise RuntimeError('Unexpected disposable database identity/version')
            database = 'bf16_qa_' + uuid.uuid4().hex
            root.execute(sql.SQL('create database {}').format(sql.Identifier(database)))
            try:
                yield psycopg.conninfo.make_conninfo(**{**settings, 'dbname': database})
            finally:
                root.execute(sql.SQL('drop database {} with (force)').format(sql.Identifier(database)))
    finally:
        if created:
            docker('rm', '-f', name)
