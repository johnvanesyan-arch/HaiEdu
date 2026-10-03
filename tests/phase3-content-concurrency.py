"""Phase 3 PostgreSQL races with independent connections and synthetic data.

No URL, credential, or environment connection string is accepted. pgserver creates
an ephemeral PostgreSQL cluster with Unix sockets only. Auth/MFA inputs remain
fixtures: this suite verifies database controls, not live Supabase authentication.
Dependencies match the existing isolated concurrency CI job.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
import time
import pgserver
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
ITEM = '30000000-0000-4000-8000-000000000001'
SIBLING = '30000000-0000-4000-8000-000000000002'
ACTOR = '10000000-0000-4000-8000-000000000010'
TEMPLATE = '10000000-0000-4000-8000-000000000009'
GUIDES = {'skill': '10000000-0000-4000-8000-000000000011', 'template': '10000000-0000-4000-8000-000000000012'}
APPROVE = "select approve_item_if_family_qa_current(%s,%s,'content','Isolated QA race')"
APPEND = "select service_append_remediation_guide_authoring_version(%s,%s,%s,%s,%s,%s,'Isolated QA race',%s,'content_admin',%s)"
REVISE = 'select service_save_item_content_revision(%s,%s,%s)'


def initialize(c):
    for path in [
        'tests/fixtures/sprint-15a-remediation-authoring.sql',
        'tests/fixtures/phase3-questions.sql',
        'supabase/migrations/20260930120000_sprint_15a_remediation_authoring_foundation.sql',
        'supabase/migrations/20260930204139_sprint_15a_authoring_role_cast.sql',
        'supabase/migrations/20261001000000_sprint_15b_governed_guide_creation.sql',
        'supabase/migrations/20261001070000_content_revision_preserve_draft_misconceptions.sql',
        'supabase/migrations/20261002080000_sprint_15b8_atomic_family_approval.sql',
    ]:
        c.execute((ROOT / path).read_text())
    latest = (ROOT / 'supabase/migrations/20261001071000_sprint_15b3_mapping_integrity_gate.sql').read_text()
    # Function only. The historical migration's curriculum DML is excluded.
    c.execute(latest[latest.index('create or replace function public.service_save_item_content_revision'):latest.index('-- Templates can opt')])


def race(uri, first, second):
    with psycopg.connect(uri) as a, psycopg.connect(uri) as b, psycopg.connect(uri, autocommit=True) as observer:
        a.execute("set statement_timeout='8s'")
        b.execute("set statement_timeout='8s'")
        first_result = first(a)
        def later():
            try:
                result = second(b)
                b.commit()
                return result
            except psycopg.Error as error:
                b.rollback()
                return str(error)
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(later)
            deadline, blocked = time.monotonic() + 5, False
            while time.monotonic() < deadline and not pending.done():
                state = observer.execute('select wait_event_type,wait_event from pg_stat_activity where pid=%s', (b.info.backend_pid,)).fetchone()
                if state and state[0] == 'Lock':
                    blocked = True
                    break
                time.sleep(.02)
            # Always release the first transaction before reporting a failure.
            a.commit()
            second_result = pending.result(timeout=10)
            assert blocked, 'second independent connection did not wait for the database lock'
            return first_result, second_result


def prepare_family(c):
    c.execute('update item_templates set template_version=1,generation_config=%s where id=%s', (Jsonb({
        'authoringProfileVersion': 'haiedu-evidence-blueprint-v1',
        'evidenceBlueprintPolicy': 'QA-fixture',
        'requiredEvidencePurposes': ['core_understanding', 'application'],
        'enforceUniqueEvidencePurposes': True,
    }), TEMPLATE))
    for item, version, purpose in [(ITEM, 4, 'core_understanding'), (SIBLING, 1, 'application')]:
        c.execute("update items set version_no=%s,review_status='needs_review',config=config||%s where id=%s", (version, Jsonb({'evidencePurpose': purpose}), item))
    members = c.execute("select string_agg(id::text||':'||version_no::text||':'||coalesce(config->>'evidencePurpose',''),',' order by id::text collate \"C\") from items where item_template_id=%s and retired_at is null", (TEMPLATE,)).fetchone()[0]
    fingerprint = '|'.join(['haiedu-family-state-v1', TEMPLATE, '1', 'haiedu-evidence-blueprint-v1', 'QA-fixture', 'core_understanding,application', '1', members])
    c.execute('delete from item_qa_runs')
    c.execute('delete from item_reviews')
    c.execute('insert into item_qa_runs(item_id,version_no,passed,details) values(%s,4,true,%s)', (ITEM, Jsonb({'evidenceBlueprintVerification': {'familyStateFingerprint': fingerprint}})))


def run(uri):
    with psycopg.connect(uri, autocommit=True) as c:
        initialize(c)
        print('PostgreSQL:', c.execute('select version()').fetchone()[0], flush=True)
        for scope, guide in GUIDES.items():
            version, content, refs = c.execute('select authoring_version,content_snapshot,reference_metadata from remediation_guide_authoring_versions where guide_scope=%s and guide_source_id=%s order by authoring_version desc limit 1', (scope, guide)).fetchone()
            table = 'skill_remediation_guides' if scope == 'skill' else 'item_template_remediation_guides'
            before = c.execute(f'select to_jsonb(t) from {table} t where id=%s', (guide,)).fetchone()[0]
            append = lambda conn: conn.execute(APPEND, (scope, guide, version, 'draft', Jsonb(content), Jsonb(refs), ACTOR, 'aal1')).fetchone()[0]
            first, second = race(uri, append, append)
            assert first['authoringVersion'] == version + 1 and 'stale_authoring_version' in str(second), (first, second)
            versions = c.execute('select authoring_version from remediation_guide_authoring_versions where guide_scope=%s and guide_source_id=%s order by authoring_version', (scope, guide)).fetchall()
            assert [row[0] for row in versions] == [version, version + 1]
            assert c.execute(f'select to_jsonb(t) from {table} t where id=%s', (guide,)).fetchone()[0] == before
            print('PASS two independent', scope, 'guide writers: one append, one stale rejection, runtime unchanged', flush=True)

        for name, mutation in [
            ('sibling revision', lambda conn: conn.execute('update items set version_no=version_no+1 where id=%s', (SIBLING,))),
            ('template revision', lambda conn: conn.execute('update item_templates set template_version=template_version+1 where id=%s', (TEMPLATE,))),
        ]:
            prepare_family(c)
            _, result = race(uri, mutation, lambda conn: conn.execute(APPROVE, (ITEM, ACTOR)).fetchone()[0])
            assert result['approved'] is False and result['requiresQaRerun'] is True, result
            assert c.execute('select count(*) from item_reviews').fetchone()[0] == 0
            print('PASS', name, 'first: blocked approval rechecks fingerprint and appends no review', flush=True)

        prepare_family(c)
        approved, _ = race(uri, lambda conn: conn.execute(APPROVE, (ITEM, ACTOR)).fetchone()[0], lambda conn: conn.execute('update items set version_no=version_no+1 where id=%s', (SIBLING,)))
        assert approved['approved'] is True
        assert c.execute('select count(*) from item_reviews').fetchone()[0] == 1
        stale = c.execute(APPROVE, (ITEM, ACTOR)).fetchone()[0]
        assert stale['approved'] is False and stale['requiresQaRerun'] is True
        assert c.execute('select count(*) from item_reviews').fetchone()[0] == 1
        print('PASS approval first: sibling waits, subsequent approval requires fresh QA', flush=True)

        payload = {'promptHy': 'Փորձնական մրցակցող փոփոխություն', 'difficulty': 2, 'itemFamily': 'application', 'options': [{'key': 'A', 'contentHy': 'Տարբերակ Ա'}, {'key': 'B', 'contentHy': 'Տարբերակ Բ'}], 'answerKey': {'answer': 'A'}, 'misconceptions': [{'code': 'QA_ATTACHED_DRAFT', 'responseKey': 'B', 'mappingNote': 'Approved isolated fixture'}], 'changeSummary': 'Isolated concurrent revision'}
        revision = lambda conn: conn.execute(REVISE, (ITEM, ACTOR, Jsonb(payload))).fetchone()[0]
        first, second = race(uri, revision, revision)
        assert [first['versionNo'], second['versionNo']] == [5, 6], (first, second)
        assert [r[0] for r in c.execute('select version_no from item_versions where item_id=%s order by version_no', (ITEM,))] == [4, 5, 6]
        item = c.execute('select validation_state,config from items where id=%s', (ITEM,)).fetchone()
        assert item[0] == 'sme_reviewed' and item[1]['learnerVisible'] is False and item[1]['pilot_ready'] is False
        print('PASS competing question revisions serialize with complete history, preserved SME and closed release', flush=True)

        c.execute('set role authenticated')
        try:
            try:
                c.execute(REVISE, (ITEM, ACTOR, Jsonb(payload)))
                raise AssertionError('authenticated role unexpectedly executed a service-only mutation')
            except psycopg.errors.InsufficientPrivilege:
                pass
        finally:
            c.execute('reset role')
        assert c.execute('select version_no from items where id=%s', (ITEM,)).fetchone()[0] == 6
        print('PASS service-only mutation ACL remains enforced on real PostgreSQL', flush=True)


if __name__ == '__main__':
    with TemporaryDirectory(prefix='haiedu-phase3-pg-') as tmp:
        server = pgserver.get_server(Path(tmp) / 'db', cleanup_mode='stop')
        uri = server.get_uri()
        try:
            assert '?host=' in uri and 'postgresql://postgres:@/' in uri, 'only disposable Unix-socket PostgreSQL is permitted'
            run(uri)
        finally:
            server.cleanup()
