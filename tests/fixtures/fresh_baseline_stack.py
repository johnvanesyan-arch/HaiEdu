"""Owned local PostgreSQL17 + real GoTrue, PostgREST and Storage services.

Never accepts a DSN, project ref, hosted credentials, or remote Docker host.
This is a component stack, not the full Supabase CLI container distribution.
"""
from contextlib import contextmanager
from pathlib import Path
import base64
import hashlib
import hmac
import json
import re
import secrets
import subprocess
import time
import urllib.error
import urllib.request
import psycopg
from psycopg import sql
from bf16_maintenance_postgres import cron_database

ROOT = Path(__file__).resolve().parents[2]
IMAGES = {
    'auth': 'supabase/gotrue:v2.197.0@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b',
    'rest': 'public.ecr.aws/supabase/postgrest:v16.5@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc',
    'storage': 'public.ecr.aws/supabase/storage-api:v1.90.1@sha256:b2a04ca607b6cfdeafc47f5fa8cc22fc386d40cc25e7f11bbfda65954f3ae949',
    'mail': 'axllent/mailpit:v1.27.7@sha256:cae83a33cd9b9598e4acb210be673dda7e741d5271ed4045310ab456950a136a',
}


def request(base, method, path, body=None, token=None, content_type='application/json'):
    if not re.fullmatch(r'http://127\.0\.0\.1:\d+', base):
        raise ValueError('Only an owned loopback HTTP endpoint is allowed')
    headers = {'Content-Type': content_type, 'X-Supabase-Api-Version': '2024-01-01'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = body if isinstance(body, bytes) else json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    # This exemption is only for verified loopback. No external proxy/network
    # policy is changed or bypassed.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        result = opener.open(req, timeout=15)
    except urllib.error.HTTPError as error:
        result = error
    with result:
        raw = result.read()
        try:
            value = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            value = raw
        return result.status, value


def wait_for(check, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            if check():
                return
        except (OSError, psycopg.Error):
            pass
        time.sleep(.25)
    raise RuntimeError('Owned local service did not become ready')


@contextmanager
def component_stack(diagnostics):
    diagnostics.mkdir(parents=True, exist_ok=True)
    with cron_database() as db:
        docker = db['docker']
        names = []
        secret = secrets.token_urlsafe(40)
        auth_password = secrets.token_urlsafe(24)
        rest_password = secrets.token_urlsafe(24)
        uri = 'postgresql://postgres:' + db['password'] + '@db:5432/postgres'
        label = 'haiedu.fixture=bf20-baseline'

        def token(role):
            encode = lambda v: base64.urlsafe_b64encode(json.dumps(v, separators=(',', ':')).encode()).rstrip(b'=').decode()
            message = encode({'alg':'HS256','typ':'JWT'}) + '.' + encode({'role':role,'iss':'supabase','aud':'authenticated','iat':int(time.time()),'exp':int(time.time())+3600})
            return message + '.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()

        def start(kind, options, port=None, extra=()):
            name = db['network'] + '-bf20-' + kind
            args = ['run','-d','--name',name,'--network',db['network'],'--network-alias',kind,'--label',label]
            if port:
                args += ['-p',f'127.0.0.1::{port}']
            for k,v in options.items():
                args += ['-e',k+'='+str(v)]
            args += list(extra) + [IMAGES[kind]]
            # Track before starting: a slow Docker client can time out after
            # the daemon has created the container. Never leave it unowned.
            names.append(name)
            try:
                docker(*args,timeout=120)
            except subprocess.TimeoutExpired:
                raise RuntimeError('Owned local '+kind+' container startup timed out') from None
            if port:
                address = docker('port',name,str(port)).splitlines()[0]
                assert re.fullmatch(r'127\.0\.0\.1:\d+',address)
                return name, 'http://' + address
            return name, None

        try:
            # The underlying fixture proves ownership, PG17.6 identity and
            # loopback mapping before exposing its generated connection URI.
            with psycopg.connect(db['uri'], autocommit=True) as owner:
                owner.execute((ROOT / 'tests/fixtures/fresh-baseline-provider.sql').read_text())
                owner.execute(sql.SQL('ALTER ROLE supabase_auth_admin PASSWORD {}').format(sql.Literal(auth_password)))
                owner.execute(sql.SQL('ALTER ROLE authenticator PASSWORD {}').format(sql.Literal(rest_password)))
            start('mail', {'MP_MAX_MESSAGES':'30'})
            auth_options = {
                'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999',
                'API_EXTERNAL_URL':'http://auth:9999','GOTRUE_SITE_URL':'http://localhost:3000',
                'GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_NAMESPACE':'auth',
                # Provider migrations run as the owner in this isolated
                # component fixture. Browser/API role tests use authenticator.
                'GOTRUE_DB_DATABASE_URL':uri+'?sslmode=disable&search_path=auth,public',
                'GOTRUE_JWT_SECRET':secret,'GOTRUE_JWT_ADMIN_ROLES':'service_role',
                'GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_DEFAULT_GROUP':'authenticated',
                'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_DISABLE_SIGNUP':'false',
                'GOTRUE_MAILER_AUTOCONFIRM':'false','GOTRUE_PASSWORD_MIN_LENGTH':'6',
                'GOTRUE_SMTP_HOST':'mail','GOTRUE_SMTP_PORT':'1025',
                'GOTRUE_SMTP_ADMIN_EMAIL':'fixture@example.invalid','GOTRUE_SMTP_SENDER_NAME':'Local fixture',
                'GOTRUE_RATE_LIMIT_EMAIL_SENT':'100','GOTRUE_SECURITY_CAPTCHA_ENABLED':'false',
            }
            _, auth = start('auth',auth_options,9999)
            wait_for(lambda: request(auth,'GET','/health')[0] == 200)
            _, storage = start('storage', {
                'SERVER_PORT':'5000','AUTH_JWT_SECRET':secret,'AUTH_JWT_ALGORITHM':'HS256',
                'DATABASE_URL':uri,'DATABASE_POOL_URL':uri,'DB_INSTALL_ROLES':'true',
                'STORAGE_BACKEND':'file','FILE_STORAGE_BACKEND_PATH':'/var/lib/storage',
                'TENANT_ID':'bf20-local','REGION':'local','GLOBAL_S3_BUCKET':'stub',
                'ANON_KEY':token('anon'),'SERVICE_KEY':token('service_role'),
                'ENABLE_IMAGE_TRANSFORMATION':'false','IMAGE_TRANSFORMATION_ENABLED':'false',
            },5000,('--tmpfs','/var/lib/storage'))
            wait_for(lambda: request(storage,'GET','/status')[0] == 200)
            # Use the provider's actual schema grants. Its standalone setup
            # also grants postgres to authenticator; remove that development
            # convenience before exposing the Data API to fixture users.
            with psycopg.connect(db['uri'], autocommit=True) as owner:
                owner.execute('REVOKE postgres FROM authenticator')
                assert not owner.execute("SELECT pg_has_role('authenticator','postgres','MEMBER')").fetchone()[0]
            _, rest = start('rest', {
                'PGRST_DB_URI':'postgresql://authenticator:'+rest_password+'@db:5432/postgres',
                'PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon',
                'PGRST_DB_EXTRA_SEARCH_PATH':'public,extensions','PGRST_JWT_SECRET':secret,
                'PGRST_SERVER_PORT':'3000',
            },3000)
            wait_for(lambda: request(rest,'GET','/')[0] == 200)
            yield {**db,'auth':auth,'storage':storage,'rest':rest,'serviceToken':token('service_role'),
                   'anonToken':token('anon'),'images':IMAGES}
        finally:
            for name in names:
                if not docker('inspect','--format','{{.Name}}',name,check=False):
                    continue
                try:
                    result = subprocess.run(['docker','--host=unix:///var/run/docker.sock','logs','--tail','60',name],
                                            capture_output=True, text=True, timeout=15)
                except (OSError, subprocess.TimeoutExpired):
                    # Diagnostics are optional; their failure must not skip
                    # removal of the owned containers below.
                    continue
                raw = result.stdout + result.stderr
                for value in (secret,db['password'],auth_password,rest_password):
                    raw = raw.replace(value,'[local-secret]')
                raw = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}','[synthetic-email]',raw)
                (diagnostics / (name.rsplit('-bf20-',1)[-1] + '.private.log')).write_text(raw)
            for name in reversed(names):
                if not docker('inspect','--format','{{.Name}}',name,check=False):
                    continue
                assert docker('inspect','--format','{{index .Config.Labels "haiedu.fixture"}}',name) == 'bf20-baseline'
                docker('rm','-f',name)
