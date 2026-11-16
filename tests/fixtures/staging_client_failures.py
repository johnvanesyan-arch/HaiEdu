"""Additional fictional roles and a private child handshake for BF22."""
import json
from pathlib import Path
import re
import secrets
import subprocess
import threading
import os
import signal
from fresh_baseline_stack import request


def seed_reporter_roles(database, fixture):
    for role in ('admin', 'content_admin'):
        account = {'school': 'A', 'role': role, 'email': secrets.token_hex(12)+'@example.invalid',
                   'password': secrets.token_urlsafe(30)}
        status, user = request(database.stack['auth'], 'POST', '/admin/users', {
            'email': account['email'], 'password': account['password'], 'email_confirm': True,
            'role': 'authenticated'}, database.stack['serviceToken'])
        assert status == 200, 'synthetic_role_creation_failed'
        account['id'] = user['id']
        with database.connect() as connection, connection.transaction():
            # Initial fictional role assignment, before any sessions or records.
            # No trigger/constraint is disabled and JWT metadata grants no role.
            connection.execute('DELETE FROM public.profiles WHERE id=%s', [user['id']])
            connection.execute('INSERT INTO public.profiles(id,role,display_name) VALUES (%s,%s,%s)',
                               [user['id'], role, 'Synthetic reporter '+role])
        fixture['accounts'].append(account)


def run_reporter_child(database, root, private_input, result_file):
    child = subprocess.Popen(['node', 'scripts/local-staging-journey.mjs', str(private_input), str(result_file)],
                             cwd=root, text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, start_new_session=True)
    registered = False
    def stop_owned_processes():
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    deadline = threading.Timer(600, stop_owned_processes)
    deadline.start()
    try:
        for line in child.stdout:
            if line.startswith('REGISTER_CLIENT_BUILD '):
                build = line.strip().split(' ')[1]
                assert not registered and re.fullmatch(r'[a-f0-9]{64}', build), 'invalid_local_build_registration'
                with database.connect() as connection:
                    connection.execute("INSERT INTO private.client_failure_builds VALUES (%s,clock_timestamp()+interval '1 day')", [build])
                registered = True
                child.stdin.write('registered\n')
                child.stdin.flush()
            else:
                print(line, end='', flush=True)
        assert child.wait(timeout=10) == 0 and registered, 'local_client_journey_failed'
    finally:
        deadline.cancel()
        stop_owned_processes()
        if child.poll() is None:
            child.wait(timeout=10)
        child.stdin.close()
        child.stdout.close()


def verify_reporter(database, backend, summary_key, output):
    # The gateway additionally requires the local public key. It accepts only
    # owned loopback addresses, so this capability cannot leave the test network.
    import urllib.request
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            raise AssertionError('local_summary_redirect_refused')
    assert re.fullmatch(r'http://127\.0\.0\.1:\d+', backend)
    req = urllib.request.Request(backend+'/functions/v1/get-client-failure-summary', method='POST', data=b'{}',
          headers={'apikey': database.stack['anonToken'], 'Authorization': 'Bearer '+summary_key, 'Content-Type': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(req, timeout=10) as response:
        assert response.status == 200
        body = response.read(16385)
        assert len(body) <= 16384, 'local_summary_too_large'
        summary = json.loads(body)
    assert len(summary['candidates']) == 5
    assert {x['category'] for x in summary['candidates']} == {'service_failure','write_unconfirmed','invalid_response','application_exception','audio_playback'}
    assert all(3 <= x['count'] <= 8 for x in summary['candidates'])
    (Path(output)/'client-summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    subprocess.run(['node', 'tests/fixtures/client-failure-notification.mjs',
                    str(Path(output)/'client-summary.json'), str(Path(output)/'notification-preview.json')],
                   cwd=Path(__file__).resolve().parents[2], check=True, timeout=20)
    with database.connect() as connection:
        assert connection.execute('SELECT count(*) FROM private.client_failure_events').fetchone()[0] == 40
        assert connection.execute('SELECT sum(accepted) FROM private.client_failure_hours').fetchone()[0] == 40
        assert connection.execute('SELECT count(*) FROM private.actor_rate_buckets').fetchone()[0] == 0
    return {'clientReports': 40, 'notificationCandidates': 5, 'signedInRoles': 5,
            'realCollectorVerified': True, 'notificationProjectionVerified': True,
            'productionNotificationsSent': False}
