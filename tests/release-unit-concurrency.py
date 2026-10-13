"""Release coexistence races on disposable PostgreSQL; no production credentials."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import subprocess
import sys
import time
import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from phase3_postgres import database_uri

def ident(n): return f'72000000-0000-4000-8000-{n:012}'
setup = json.loads(subprocess.run(['node', 'tests/fixtures/release-unit-scope.mjs'], cwd=ROOT, check=True, capture_output=True, text=True).stdout)

def activate(c, n):
    c.execute("update curriculum_releases set status='pilot' where id=%s", [ident(n)])
    return n

def race(uri, first, second, rollback=False, isolation='read committed'):
    with psycopg.connect(uri) as a, psycopg.connect(uri) as b, psycopg.connect(uri, autocommit=True) as watch:
        for c in (a, b): c.execute("set statement_timeout='12s'")
        b.execute('set transaction isolation level ' + isolation)
        # Establish a snapshot before the winner changes anything, including in RR.
        b.execute('select count(*) from private.active_curriculum_release_units')
        first(a)
        def later():
            try:
                result = second(b); b.commit(); return {'result': result}
            except psycopg.Error as error:
                b.rollback(); return {'error': str(error), 'code': error.sqlstate}
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(later); deadline = time.monotonic() + 6; blocked = False
            while time.monotonic() < deadline and not pending.done():
                row = watch.execute('select wait_event_type from pg_stat_activity where pid=%s', [b.info.backend_pid]).fetchone()
                if row and row[0] == 'Lock': blocked = True; break
                time.sleep(.02)
            if rollback: a.rollback()
            else: a.commit()
            result = pending.result(timeout=15)
            assert blocked, 'Expected the independent contender to wait on a real lock'
            return result

with database_uri() as uri:
    with psycopg.connect(uri, autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0], flush=True)
        c.execute(setup['schema']); c.execute(setup['seed'])
        with c.transaction(): c.execute(setup['migration'])
        original = c.execute('select to_jsonb(r) from curriculum_releases r where id=%s', [ident(10)]).fetchone()[0]
        for isolation in ['read committed']:
            result = race(uri, lambda a: activate(a, 14), lambda b: activate(b, 15), isolation=isolation)
            assert result.get('code') in ('23505', '40001'), result
            assert c.execute('select count(*) from private.active_curriculum_release_units where unit_id=%s', [ident(103)]).fetchone()[0] == 1
            c.execute("update curriculum_releases set status='retired' where id=%s", [ident(14)])
            print('PASS: overlapping activation has one winner under ' + isolation, flush=True)
        result = race(uri, lambda a: activate(a, 14), lambda b: activate(b, 15), rollback=True)
        assert result == {'result': 15}, result
        c.execute("update curriculum_releases set status='retired' where id=%s", [ident(15)])
        print('PASS: rolled-back activation releases the claim and preserves the contender', flush=True)
        with psycopg.connect(uri) as a, psycopg.connect(uri) as b:
            activate(a, 14)
            with ThreadPoolExecutor(max_workers=1) as pool:
                assert pool.submit(lambda: activate(b, 11)).result(timeout=5) == 11
            a.commit(); b.commit()
        print('PASS: disjoint units of one programme can activate concurrently', flush=True)
        result = race(uri, lambda a: a.execute("update curriculum_releases set status='retired' where id=%s", [ident(14)]), lambda b: activate(b, 15))
        assert result == {'result': 15}, result
        print('PASS: a successor cannot claim a unit until its prior release retires', flush=True)
        c.execute("update curriculum_releases set status='retired' where id=%s", [ident(15)])
        result = race(uri, lambda a: activate(a, 14), lambda b: b.execute('delete from curriculum_release_units where curriculum_release_id=%s', [ident(14)]).rowcount)
        assert 'snapshot_is_immutable' in result.get('error', ''), result
        print('PASS: snapshot deletion waits for activation and then fails closed', flush=True)
        # A snapshot added to a still-draft release must be seen by activation.
        result = race(uri,
            lambda a: a.execute('insert into curriculum_release_units values(%s,%s,%s)', [ident(12), ident(104), 'SYN-4']),
            lambda b: activate(b, 12))
        assert 'reconciliation_count_invalid' in result.get('error', ''), result
        print('PASS: a committed draft scope edit prevents stale-scope activation', flush=True)
        # Retiring a release rolls its claim deletion back together with status.
        result = race(uri, lambda a: a.execute("update curriculum_releases set status='retired' where id=%s", [ident(14)]), lambda b: activate(b, 15), rollback=True)
        assert result.get('code') == '23505', result
        print('PASS: rolled-back retirement cannot leave an unclaimed active unit', flush=True)
        assert c.execute('select to_jsonb(r) from curriculum_releases r where id=%s', [ident(10)]).fetchone()[0] == original
        assert c.execute('select curriculum_release_id from private.active_curriculum_release_units where unit_id=%s', [ident(101)]).fetchone()[0] == ident(10)
        print('PASS: the unchanged first chapter retains its original active release', flush=True)
        for isolation in ['repeatable read', 'serializable']:
            with psycopg.connect(uri) as stale:
                stale.execute('set transaction isolation level ' + isolation)
                stale.execute('select count(*) from curriculum_release_units')
                try: activate(stale, 15)
                except psycopg.Error as error:
                    assert 'governance_requires_read_committed' in str(error), error
                else: raise AssertionError('Unsupported governance isolation silently continued')
            print('PASS: ' + isolation + ' governance mutation fails explicitly', flush=True)
        # Reverse direction: an older unit snapshot must not hide a later link.
        c.execute('insert into units values(%s,%s,%s)', [ident(105),ident(1),'SYN-5'])
        with psycopg.connect(uri) as stale:
            stale.execute('set transaction isolation level repeatable read')
            stale.execute('select count(*) from curriculum_release_units')
            c.execute('insert into curriculum_release_units values(%s,%s,%s)', [ident(12),ident(105),'SYN-5'])
            try: stale.execute('update units set subject_program_id=%s where id=%s', [ident(2),ident(105)])
            except psycopg.Error as error:
                assert 'governance_requires_read_committed' in str(error), error
            else: raise AssertionError('A stale catalogue snapshot moved a newly linked unit')
        print('PASS: stale-snapshot programme move cannot evade a newly attached release scope', flush=True)
