"""Disposable fixture databases only; never accepts a URL or remote credentials."""
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import uuid
import psycopg
from psycopg import sql


@contextmanager
def database_uri():
    if os.environ.get('PHASE3_POSTGRES_17_CI') == '1':
        if os.environ.get('GITHUB_ACTIONS') != 'true':
            raise RuntimeError('The PostgreSQL 17 service is permitted only in disposable GitHub CI')
        # Fixed loopback service, test credentials and root DB. No DSN input.
        settings = dict(host='127.0.0.1', port=5432, user='phase3_fixture',
                        password='fixture-only', dbname='phase3_qa_root', connect_timeout=5)
        name = 'phase3_qa_' + uuid.uuid4().hex
        with psycopg.connect(**settings, autocommit=True) as root:
            version, user, db = root.execute('select current_setting(\'server_version_num\'),current_user,current_database()').fetchone()
            if (version, user, db) != ('170006', 'phase3_fixture', 'phase3_qa_root'):
                raise RuntimeError('Unexpected PostgreSQL service identity or version')
            root.execute(sql.SQL('create database {}').format(sql.Identifier(name)))
            try:
                yield psycopg.conninfo.make_conninfo(**{**settings, 'dbname': name})
            finally:
                root.execute(sql.SQL('drop database {} with (force)').format(sql.Identifier(name)))
    else:
        import pgserver
        with TemporaryDirectory(prefix='haiedu-phase3-pg-') as tmp:
            server = pgserver.get_server(Path(tmp) / 'db', cleanup_mode='stop')
            try:
                uri = server.get_uri()
                assert '?host=' in uri and 'postgresql://postgres:@/' in uri, 'Disposable Unix socket required'
                yield uri
            finally:
                server.cleanup()
