"""Plan refusal controls. Fixtures are synthetic SQL, not release migrations."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from fresh_update_bridge import load_plan, digest, Refusal, validate_sql


class PlanControls(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='bf20-plan-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for folder in ('baseline', 'migrations', 'operations', 'updates'):
            shutil.copytree(ROOT / 'supabase' / folder, self.root / 'supabase' / folder)
        self.path = self.root / 'supabase/updates/plan.json'
        self.plan = json.loads(self.path.read_text())
        self.plan['updates'] = []
        for path in (self.root / 'supabase/updates/sql').glob('*.sql'):
            path.unlink()
        self.save()

    def save(self):
        self.path.write_text(json.dumps(self.plan))

    def entry(self, stamp='20261115000001', before=None):
        before = before or load_plan(self.root)['manifest']['catalogueSha256']
        identifier = stamp + '_synthetic'
        source = 'COMMENT ON TABLE public.profiles IS \'synthetic fixture\';'
        path = 'supabase/updates/sql/' + identifier + '.sql'
        (self.root / path).parent.mkdir(exist_ok=True)
        (self.root / path).write_text(source)
        entry = {'id': identifier, 'file': path, 'sha256': digest(source.encode()),
                 'beforeCatalogueSha256': before,
                 'afterCatalogueSha256': 'a'*64, 'dataPolicy': 'preserve-existing-rows', 'requiredData': []}
        self.plan['updates'].append(entry)
        self.save()
        return entry

    def refused(self, reason):
        with self.assertRaisesRegex(Refusal, '^'+reason+'$'):
            load_plan(self.root)

    def test_current_empty_plan_validates_all_historical_inputs(self):
        self.assertEqual(load_plan(self.root)['entries'], [])

    def test_current_repository_plan_validates(self):
        self.assertEqual(load_plan()['scope'], 'owned-disposable-local')

    def test_historical_edit_and_addition_refused(self):
        path = self.root / 'supabase/migrations/0002_public_read_policies.sql'
        original = path.read_bytes()
        path.write_bytes(original+b'\n-- changed\n')
        self.refused('historical_source_changed_or_added')
        path.write_bytes(original)
        (path.parent / 'unlisted.sql').write_text('select 1;')
        self.refused('historical_source_changed_or_added')

    def test_baseline_or_seed_changed_refused(self):
        (self.root / 'supabase/baseline/technical-seed.sql').write_text('SELECT 1;')
        self.refused('baseline_file_changed')

    def test_unlisted_and_tampered_sql_refused(self):
        entry = self.entry()
        (self.root / entry['file']).write_text('COMMENT ON TABLE public.profiles IS \'changed\';')
        self.refused('update_bytes_changed')

    def test_unlisted_update_refused(self):
        directory = self.root / 'supabase/updates/sql'
        directory.mkdir(exist_ok=True)
        (directory / 'unlisted.sql').write_text('select 1;')
        self.refused('unlisted_update_file')

    def test_order_and_duplicate_ids_refused(self):
        first = self.entry()
        second = self.entry('20261115000002', first['afterCatalogueSha256'])
        self.assertEqual(len(load_plan(self.root)['entries']), 2)
        self.plan['updates'] = [second, first]
        self.save()
        self.refused('broken_catalogue_chain')
        self.plan['updates'] = [first, copy.deepcopy(first)]
        self.save()
        self.refused('updates_not_strictly_ordered')

    def test_catalogue_chain_refused(self):
        self.entry()['beforeCatalogueSha256'] = '0'*64
        self.save()
        self.refused('broken_catalogue_chain')

    def test_external_path_and_symlink_refused(self):
        entry = self.entry()
        original = entry['file']
        entry['file'] = '../external.sql'
        self.save()
        self.refused('invalid_update_file')
        entry['file'] = original
        path = self.root / original
        path.unlink()
        path.symlink_to(ROOT / 'supabase/baseline/schema.sql')
        self.save()
        self.refused('missing_or_external_file')

    def test_unsupported_scope_and_data_rewrite_refused(self):
        self.plan['scope'] = 'production'
        self.save()
        self.refused('unsupported_plan_scope')
        self.plan['scope'] = 'owned-disposable-local'
        self.save()
        self.entry()['dataPolicy'] = 'allow-delete'
        self.save()
        self.refused('unsupported_data_policy')

    def test_duplicate_json_keys_refused(self):
        self.path.write_text('{"formatVersion":1,"formatVersion":2}')
        self.refused('duplicate_json_key')

    def test_transaction_admin_and_procedural_sql_refused(self):
        for source in ('COMMIT;', 'BEGIN; SELECT 1; COMMIT;', 'COPY public.profiles TO PROGRAM \'true\';',
                       'DO $$ BEGIN RAISE NOTICE \'test\'; END $$;', 'SET ROLE postgres;',
                       'ALTER SYSTEM SET log_statement=\'all\';', 'VACUUM;', 'SELECT pg_sleep(1);'):
            with self.subTest(source=source), self.assertRaises(Refusal):
                validate_sql(source)

    def test_provider_and_receipt_sql_refused(self):
        for table in ('auth.users', 'storage.objects', 'supabase_migrations.schema_migrations', 'haiedu_local_updates.applied'):
            with self.subTest(table=table), self.assertRaisesRegex(Refusal, 'protected_schema_reference'):
                validate_sql('DELETE FROM '+table+';')

    def test_quoted_provider_and_untracked_objects_refused(self):
        for source in ('DELETE FROM "auth"."users";', 'CREATE TABLE unqualified(id int);',
                       'WITH removed AS (DELETE FROM auth.users RETURNING id) INSERT INTO public.profiles(id) SELECT id FROM removed;',
                       'CREATE TEMP TABLE public.fixture(id int);',
                       'CREATE TABLE public.fixture(id int) PARTITION BY RANGE(id);',
                       'CREATE INDEX CONCURRENTLY fixture ON public.profiles(display_name);',
                       'CREATE FUNCTION pg_catalog.fixture() RETURNS int LANGUAGE sql AS \'SELECT 1\';'):
            with self.subTest(source=source), self.assertRaises(Refusal):
                validate_sql(source)

    def test_required_data_is_bounded_and_identifier_safe(self):
        entry = self.entry()
        entry['requiredData'] = [{'table':'public.profiles','equals':{},'minimumRows':1}]
        self.save()
        self.refused('unbounded_data_requirement')
        entry['requiredData'][0]['equals'] = {'role;drop table x':'student'}
        self.save()
        self.refused('invalid_requirement_value')


if __name__ == '__main__':
    unittest.main()
