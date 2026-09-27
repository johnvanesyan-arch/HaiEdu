"""Isolated PostgreSQL integration races; never connects to production.
Run: PYTHONPATH=/tmp/s14-db-tools python tests/sprint-14b-offboarding-concurrency.py
Dependencies: pgserver==0.1.4 psycopg[binary]==3.2.6 (temporary QA environment).
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from tempfile import TemporaryDirectory
import time
import pgserver
import psycopg

ROOT=Path(__file__).resolve().parents[1]
uid=lambda n:f'00000000-0000-4000-8000-{n:012}'
fixture=(ROOT/'tests/fixtures/sprint-14b-offboarding.sql').read_text()
migration=(ROOT/'supabase/migrations/20260927193107_sprint_14b_teacher_offboarding_closure.sql').read_text()
call="select service_offboard_school_teacher_14b(%s,%s,%s,%s,'administrative',%s)"

def race(uri, first, second, expected):
    with psycopg.connect(uri) as a, psycopg.connect(uri) as b, psycopg.connect(uri,autocommit=True) as observer:
        a.execute("set statement_timeout='8s'"); b.execute("set statement_timeout='8s'")
        first(a)
        def later():
            try:
                result=second(b);b.commit();return result
            except psycopg.Error as error:
                b.rollback();return str(error)
        with ThreadPoolExecutor(max_workers=1) as pool:
            future=pool.submit(later)
            deadline=time.monotonic()+5
            blocked=False
            while time.monotonic()<deadline and not future.done():
                row=observer.execute("select wait_event from pg_stat_activity where pid=%s",(b.info.backend_pid,)).fetchone()
                if row and row[0]=='advisory':blocked=True;break
                time.sleep(.02)
            assert blocked,'second transaction did not wait on shared advisory lock'
            a.commit()
            result=future.result(timeout=10)
            assert expected in str(result),result

with TemporaryDirectory(prefix='s14-pg-') as tmp:
    server=pgserver.get_server(Path(tmp)/'db',cleanup_mode='stop')
    uri=server.get_uri()
    try:
        with psycopg.connect(uri,autocommit=True) as c:
            c.execute(fixture);c.execute(migration)
        for mode in ['profile-membership','membership-profile','membership-membership']:
            with psycopg.connect(uri,autocommit=True) as c:
                c.execute("update profiles set account_status='active'")
                c.execute("update institutional_memberships set status='active'")
                c.execute("delete from institutional_memberships where id=%s",(uid(25),))
                c.execute("insert into institutional_memberships(id,school_id,person_id,role) values(%s,%s,%s,'school_admin')",(uid(25),uid(1),uid(12)))
            first=lambda c:c.execute("update profiles set account_status='suspended' where id=%s",(uid(11),))
            second=lambda c:c.execute("update institutional_memberships set status='ended' where id=%s",(uid(25),))
            if mode.startswith('membership'):
                first=lambda c:c.execute("update institutional_memberships set status='ended' where id=%s",(uid(21),))
            if mode.endswith('profile'):
                second=lambda c:c.execute("update profiles set account_status='suspended' where id=%s",(uid(12),))
            race(uri,first,second,'last_active_school_admin_protected')
            print('PASS',mode)
        with psycopg.connect(uri,autocommit=True) as c:
            c.execute("update profiles set account_status='active'");c.execute("update institutional_memberships set status='active'")
        def offboard(c):
            revision=c.execute(call,(uid(11),uid(1),uid(23),'preview',None)).fetchone()[0]['revision']
            c.execute(call,(uid(11),uid(1),uid(23),'offboard',revision))
        def reset():
            with psycopg.connect(uri,autocommit=True) as c:
                c.execute("update institutional_memberships set status='active',valid_to=null")
                c.execute("update teacher_assignments set status='active',valid_to=null")
                c.execute("update teacher_subject_authorizations set status='active',valid_to=null")
                c.execute("update institutional_invitations set revoked_at=null")
                c.execute("update institutional_join_codes set revoked_at=null")
        races=[
          ('invitation issue',lambda c:c.execute("select service_issue_institutional_invitation_14b(%s,%s,%s,'student',%s,%s,repeat('c',64),now()+interval '1 day')",(uid(13),uid(15),uid(1),uid(35),uid(41))),'invitation_not_authorized'),
          ('code issue',lambda c:c.execute("select service_issue_institutional_join_code_14c(%s,%s,%s,%s,repeat('d',64),now()+interval '1 day')",(uid(13),uid(1),uid(35),uid(41))),'institutional_join_code_not_authorized'),
          ('invitation redeem',lambda c:c.execute("select service_redeem_institutional_invitation_14b(%s,repeat('a',64))",(uid(14),)),'invitation_unavailable'),
          ('invitation accept',lambda c:c.execute("select service_accept_student_invitation_14c(%s,repeat('a',64),'Test Student','student-school-access-v1')",(uid(14),)),'invitation_unavailable'),
          ('code redeem',lambda c:c.execute("select service_redeem_institutional_join_code_14c(%s,repeat('b',64))",(uid(14),)),'institutional_join_code_unavailable'),
        ]
        for name,fn,error in races:
            reset();race(uri,offboard,fn,error);print('PASS offboard vs',name)
        reset()
        def redeem(c): c.execute("select service_redeem_institutional_invitation_14b(%s,repeat('a',64))",(uid(14),))
        def end_after(c):offboard(c);return 'ended'
        race(uri,redeem,end_after,'ended')
        with psycopg.connect(uri) as c:
            assert c.execute("select count(*) from institutional_class_enrollments where status='active'").fetchone()[0]==1
            assert c.execute("select used_at is not null and revoked_at is null from institutional_invitations where token_digest=repeat('a',64)").fetchone()[0]
        print('PASS redemption first preserves accepted enrollment')
    finally:server.cleanup()
