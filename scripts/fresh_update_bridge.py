"""Reviewed forward updates for a newly owned, disposable local database.

This is not a production deployer or a SQL sandbox. SQL is reviewed executable
code. The only public entry point creates its own component stack; it accepts
neither a connection string nor an existing project/container.
"""
from collections import Counter
from contextlib import contextmanager
from datetime import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys

from pglast import parse_sql
from pglast.visitors import Visitor
import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from fresh_baseline_stack import component_stack

spec = importlib.util.spec_from_file_location('fresh_comparison', ROOT / 'scripts/compare-fresh-baseline.py')
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)
CATALOGUE = (ROOT / 'scripts/sql/fresh-baseline-catalogue.sql').read_text()
CONTROL_CATALOGUE = CATALOGUE.replace("'public','private'", "'haiedu_local_updates'")
LOCK_ID = 202611150020
META = 'haiedu_local_updates'
IDENTIFIER = re.compile(r'[a-z_][a-z0-9_]*\Z')
HASH = re.compile(r'[a-f0-9]{64}\Z')


class Refusal(ValueError):
    """Safe, deliberately non-sensitive reason for refusing an update."""


def require(condition, message):
    if not condition:
        raise Refusal(message)


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else
                          json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate_json_key')
        result[key] = value
    return result


def read_json(path):
    return json.loads(path.read_text(), object_pairs_hook=unique_object)


def checked_file(root, relative):
    require(isinstance(relative, str), 'invalid_file_path')
    path = root / relative
    require(not Path(relative).is_absolute() and '..' not in Path(relative).parts,
            'file_outside_package')
    require(path.is_file() and path.resolve().is_relative_to(root.resolve()), 'missing_or_external_file')
    require(not any(p.is_symlink() for p in (path, *path.parents) if p != root.parent), 'symlink_not_allowed')
    return path.read_bytes()


def validate_sql(source):
    statements = parse_sql(source)
    require(bool(statements), 'empty_update')
    # The runner owns the transaction, connection settings and receipt schema.
    # Administrative/provider operations and unbounded procedural execution need
    # a separately reviewed contract, not an escape from this local bridge.
    allowed = {'CreateStmt', 'AlterTableStmt', 'IndexStmt', 'CommentStmt',
               'CreatePolicyStmt', 'AlterPolicyStmt', 'GrantStmt', 'ViewStmt',
               'CreateFunctionStmt', 'CreateTrigStmt', 'DropStmt',
               'InsertStmt', 'UpdateStmt', 'DeleteStmt', 'RenameStmt'}
    require(all(type(s.stmt).__name__ in allowed for s in statements), 'unsupported_update_statement')
    def scoped_object(target):
        if hasattr(target, 'schemaname'):
            schema = target.schemaname
        else:
            names = target.objname if hasattr(target, 'objname') else target
            require(isinstance(names, tuple) and len(names) >= 2 and hasattr(names[0], 'sval'),
                    'explicit_application_schema_required')
            schema = names[0].sval
        require(schema in ('public', 'private'), 'protected_schema_reference')

    for raw in statements:
        node = raw.stmt
        kind = type(node).__name__
        if kind in ('CreateStmt', 'AlterTableStmt', 'IndexStmt', 'CreateTrigStmt',
                    'InsertStmt', 'UpdateStmt', 'DeleteStmt', 'RenameStmt'):
            scoped_object(node.relation)
        elif kind in ('CreatePolicyStmt', 'AlterPolicyStmt'):
            scoped_object(node.table)
        elif kind == 'ViewStmt':
            scoped_object(node.view)
        elif kind == 'CreateFunctionStmt':
            require(not node.is_procedure, 'unsupported_update_statement')
            scoped_object(node.funcname)
        elif kind == 'CommentStmt':
            scoped_object(node.object)
        elif kind in ('DropStmt', 'GrantStmt'):
            require(bool(node.objects), 'explicit_application_schema_required')
            for target in node.objects:
                scoped_object(target)
        if kind == 'CreateStmt':
            require(node.relation.relpersistence == 'p' and node.partspec is None and node.partbound is None,
                    'unsupported_relation_shape')
        if kind in ('IndexStmt', 'DropStmt'):
            require(not getattr(node, 'concurrent', False), 'nontransactional_update')
    class NestedWrites(Visitor):
        def visit_InsertStmt(self, ancestors, node):
            scoped_object(node.relation)

        def visit_UpdateStmt(self, ancestors, node):
            scoped_object(node.relation)

        def visit_DeleteStmt(self, ancestors, node):
            scoped_object(node.relation)

    NestedWrites()(statements)
    # Procedural function bodies remain reviewed executable code, not a sandbox.
    return source


def load_plan(root=ROOT):
    """Pin all bytes before opening a database. Historical inputs are immutable."""
    root = Path(root).resolve()
    plan = read_json(root / 'supabase/updates/plan.json')
    require(set(plan) == {'formatVersion', 'lineage', 'scope', 'baselineFiles', 'updates'}, 'invalid_plan_fields')
    require(plan['formatVersion'] == 1 and plan['scope'] == 'owned-disposable-local', 'unsupported_plan_scope')
    require(plan['lineage'] == 'haiedu-fresh-20261114-v1', 'unsupported_lineage')
    baseline_files = plan['baselineFiles']
    require(set(baseline_files) == {'supabase/baseline/manifest.json', 'supabase/baseline/schema.sql',
                                  'supabase/baseline/technical-seed.sql',
                                  'supabase/baseline/source-history-crosswalk.json'}, 'invalid_baseline_files')
    contents = {}
    for path, expected in baseline_files.items():
        contents[path] = checked_file(root, path)
        require(HASH.fullmatch(expected) and digest(contents[path]) == expected, 'baseline_file_changed')
    manifest = json.loads(contents['supabase/baseline/manifest.json'], object_pairs_hook=unique_object)
    require(digest(contents['supabase/baseline/schema.sql']) == manifest['schemaSha256'], 'baseline_schema_changed')
    actual_inputs = [{'path': str(p.relative_to(root)), 'sha256': digest(checked_file(root, str(p.relative_to(root))))}
                     for directory in ('migrations', 'operations')
                     for p in sorted((root / 'supabase' / directory).glob('*.sql'))]
    require(actual_inputs == manifest['sourceInputs'], 'historical_source_changed_or_added')
    require(isinstance(plan['updates'], list), 'invalid_update_list')
    previous = manifest['catalogueSha256']
    previous_id = '20261115000000'
    entries = []
    for entry in plan['updates']:
        require(set(entry) == {'id', 'file', 'sha256', 'beforeCatalogueSha256', 'afterCatalogueSha256',
                               'requiredData', 'dataPolicy'}, 'invalid_update_fields')
        identifier = entry['id']
        require(isinstance(identifier, str) and re.fullmatch(r'\d{14}_[a-z][a-z0-9_]*', identifier), 'invalid_update_id')
        datetime.strptime(identifier[:14], '%Y%m%d%H%M%S')
        require(identifier[:14] > previous_id[:14], 'updates_not_strictly_ordered')
        previous_id = identifier
        require(entry['file'] == 'supabase/updates/sql/' + identifier + '.sql', 'invalid_update_file')
        raw = checked_file(root, entry['file'])
        require(HASH.fullmatch(entry['sha256']) and digest(raw) == entry['sha256'], 'update_bytes_changed')
        require(entry['beforeCatalogueSha256'] == previous and HASH.fullmatch(entry['afterCatalogueSha256']),
                'broken_catalogue_chain')
        require(entry['dataPolicy'] == 'preserve-existing-rows', 'unsupported_data_policy')
        require(isinstance(entry['requiredData'], list), 'invalid_data_requirements')
        for need in entry['requiredData']:
            require(set(need) == {'table', 'equals', 'minimumRows'}, 'invalid_data_requirement')
            parts = need['table'].split('.')
            require(len(parts) == 2 and parts[0] in ('public', 'private') and IDENTIFIER.fullmatch(parts[1]),
                    'invalid_requirement_table')
            require(type(need['minimumRows']) is int and need['minimumRows'] > 0, 'invalid_minimum_rows')
            require(isinstance(need['equals'], dict) and bool(need['equals']), 'unbounded_data_requirement')
            for key, value in need['equals'].items():
                require(IDENTIFIER.fullmatch(key) and (value is None or type(value) in (str, bool, int)),
                        'invalid_requirement_value')
        entries.append({**entry, 'source': validate_sql(raw.decode()), 'contractSha256': digest(entry)})
        previous = entry['afterCatalogueSha256']
    files = {str(p.relative_to(root)) for p in (root / 'supabase/updates/sql').glob('*.sql')}
    require(files == {e['file'] for e in entries}, 'unlisted_update_file')
    return {**plan, 'entries': entries, 'manifest': manifest, 'contents': contents,
            'baselineIdentity': digest({'lineage': plan['lineage'], 'files': baseline_files}),
            'headCatalogueSha256': previous}


def capture(connection, query=CATALOGUE):
    connection.execute('SET LOCAL search_path=pg_catalog')
    require(not connection.execute("""SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','private') AND c.relkind NOT IN ('r','v','S','i') LIMIT 1""").fetchone(),
        'unsupported_relation_shape')
    return connection.execute(query).fetchone()[0]


def table_rows(connection, table, columns):
    query = sql.SQL('SELECT to_jsonb(r)::text FROM (SELECT {} FROM {}) r').format(
        sql.SQL(',').join(map(sql.Identifier, columns)), sql.Identifier(*table))
    return Counter(hashlib.sha256(row[0].encode()).hexdigest() for row in connection.execute(query))


def preserved_rows(connection):
    """Hash synthetic rows in memory only; lock out concurrent provider writes."""
    tables = connection.execute("""SELECT n.nspname,c.relname,array_agg(a.attname ORDER BY a.attnum)
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        WHERE n.nspname IN ('public','private','auth','storage') AND c.relkind IN ('r','p')
        GROUP BY n.nspname,c.relname ORDER BY n.nspname,c.relname""").fetchall()
    result = []
    for schema, name, columns in tables:
        table = (schema, name)
        connection.execute(sql.SQL('LOCK TABLE {} IN SHARE MODE').format(sql.Identifier(*table)))
        result.append((table, columns, table_rows(connection, table, columns)))
    return result


def check_preservation(connection, before):
    for table, columns, rows in before:
        require(not (rows - table_rows(connection, table, columns)), 'existing_rows_changed_or_removed')


class _OwnedDatabase:
    def __init__(self, stack, plan):
        self.stack = stack
        self.identity = plan['baselineIdentity']
        self.control_fingerprint = None

    def connect(self):
        stack = self.stack
        require(re.fullmatch(r'haiedu-bf16-maintenance-[a-f0-9]{12}', stack['container']), 'unowned_container')
        require(stack['docker']('inspect', '--format', '{{index .Config.Labels "haiedu.fixture"}}',
                               stack['container']) == 'bf16-maintenance', 'unowned_container')
        params = psycopg.conninfo.conninfo_to_dict(stack['uri'])
        require(params['host'] == '127.0.0.1' and params['user'] == 'postgres' and params['dbname'] == 'postgres',
                'nonlocal_target')
        require(stack['docker']('port', stack['container'], '5432/tcp') == '127.0.0.1:' + params['port'],
                'target_mapping_changed')
        return psycopg.connect(stack['uri'], autocommit=True)

    def apply(self, plan):
        require(plan['baselineIdentity'] == self.identity, 'baseline_identity_changed')
        with self.connect() as connection, connection.transaction():
            connection.execute("SET LOCAL lock_timeout='5s'")
            connection.execute("SET LOCAL statement_timeout='60s'")
            connection.execute("SET LOCAL timezone='UTC'")
            require(connection.execute('SELECT pg_try_advisory_xact_lock(%s)', [LOCK_ID]).fetchone()[0],
                    'another_update_is_running')
            require(comparison.baseline.digest(capture(connection, CONTROL_CATALOGUE)) == self.control_fingerprint,
                    'control_structure_changed')
            state = connection.execute('SELECT lineage,baseline_identity FROM haiedu_local_updates.origin').fetchall()
            require(state == [(plan['lineage'], self.identity)], 'origin_receipt_changed')
            applied = connection.execute('SELECT position,update_id,contract_sha256 FROM haiedu_local_updates.applied ORDER BY position').fetchall()
            require(len(applied) <= len(plan['entries']), 'unknown_applied_update')
            for position, (ordinal, identifier, checksum) in enumerate(applied):
                expected = plan['entries'][position]
                require((ordinal, identifier, checksum) == (position + 1, expected['id'], expected['contractSha256']),
                        'applied_history_changed')
            expected = plan['manifest']['catalogueSha256'] if not applied else plan['entries'][len(applied)-1]['afterCatalogueSha256']
            require(comparison.baseline.digest(capture(connection)) == expected, 'database_structure_drift')
            pending = plan['entries'][len(applied):]
            if not pending:
                return {'applied': [], 'alreadyApplied': len(applied), 'catalogueSha256': expected}
            done = []
            for position, entry in enumerate(pending, start=len(applied)+1):
                before = preserved_rows(connection)
                for need in entry['requiredData']:
                    conditions = sql.SQL(' AND ').join(sql.SQL('{} IS NOT DISTINCT FROM %s').format(sql.Identifier(k))
                                                     for k in need['equals'])
                    query = sql.SQL('SELECT count(*) FROM {} WHERE {}').format(sql.Identifier(*need['table'].split('.')), conditions)
                    require(connection.execute(query, list(need['equals'].values())).fetchone()[0] >= need['minimumRows'],
                            'required_data_missing')
                connection.execute(entry['source'])
                require(comparison.baseline.digest(capture(connection)) == entry['afterCatalogueSha256'],
                        'update_result_mismatch')
                check_preservation(connection, before)
                connection.execute('INSERT INTO haiedu_local_updates.applied VALUES (%s,%s,%s)',
                                   [position, entry['id'], entry['contractSha256']])
                done.append(entry['id'])
            require(comparison.baseline.digest(capture(connection, CONTROL_CATALOGUE)) == self.control_fingerprint,
                    'control_structure_changed')
            require(connection.execute('SELECT lineage,baseline_identity FROM haiedu_local_updates.origin').fetchall()
                    == [(plan['lineage'], self.identity)], 'origin_receipt_changed')
            require(connection.execute('SELECT position,update_id,contract_sha256 FROM haiedu_local_updates.applied ORDER BY position').fetchall()
                    == [(i+1,e['id'],e['contractSha256']) for i,e in enumerate(plan['entries'])], 'applied_history_changed')
            return {'applied': done, 'alreadyApplied': len(applied), 'catalogueSha256': plan['headCatalogueSha256']}


@contextmanager
def owned_database(plan, diagnostics, *, staging_gateway=False):
    """Always owns a brand-new local stack, installs the baseline, and cleans up."""
    with component_stack(Path(diagnostics), staging_gateway=staging_gateway) as stack:
        database = _OwnedDatabase(stack, plan)
        with database.connect() as connection:
            require(connection.execute("SELECT current_setting('server_version_num'),current_user,current_database()").fetchone()
                    == ('170006', 'postgres', 'postgres'), 'unexpected_database_identity')
            connection.execute("SET haiedu.fresh_baseline='local-empty-v1'")
            connection.execute(plan['contents']['supabase/baseline/schema.sql'].decode())
            connection.execute(plan['contents']['supabase/baseline/technical-seed.sql'].decode())
            with connection.transaction():
                require(not comparison.compare_manifest(plan['manifest'], capture(connection)), 'baseline_catalogue_mismatch')
                connection.execute('''CREATE SCHEMA haiedu_local_updates AUTHORIZATION postgres;
                    REVOKE ALL ON SCHEMA haiedu_local_updates FROM PUBLIC,anon,authenticated,service_role;
                    CREATE TABLE haiedu_local_updates.origin (
                        singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
                        lineage text NOT NULL, baseline_identity text NOT NULL);
                    CREATE TABLE haiedu_local_updates.applied (
                        position integer PRIMARY KEY CHECK (position>0),
                        update_id text UNIQUE NOT NULL, contract_sha256 text NOT NULL);
                    ALTER TABLE haiedu_local_updates.origin ENABLE ROW LEVEL SECURITY;
                    ALTER TABLE haiedu_local_updates.applied ENABLE ROW LEVEL SECURITY;
                    REVOKE ALL ON ALL TABLES IN SCHEMA haiedu_local_updates FROM PUBLIC,anon,authenticated,service_role;''')
                connection.execute('INSERT INTO haiedu_local_updates.origin(lineage,baseline_identity) VALUES (%s,%s)',
                                   [plan['lineage'], plan['baselineIdentity']])
                database.control_fingerprint = comparison.baseline.digest(capture(connection, CONTROL_CATALOGUE))
        yield database
