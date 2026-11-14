#!/usr/bin/env python3
"""Generate a fresh-only schema package from the reviewed read-only catalogue.

No connection string, network access, data export, or deployment operation.
Existing migration files and the production ledger are never edited.
"""
import argparse
import hashlib
import json
from pathlib import Path
import pglast


def ident(value):
    return '"' + value.replace('"', '""') + '"'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def qualified(row):
    return ident(row['schema']) + '.' + ident(row['name'])


def role(value):
    return 'PUBLIC' if value == 'PUBLIC' else ident(value)


def canonical_view(sql):
    """Ignore deparser-only labels on constant casts in unused UNION branches.

    PostgreSQL re-deparses some right UNION arms as NULL::uuid AS uuid or
    'literal'::text AS text. Output names come from the left arm. Only these
    default labels in a simple arm without grouping/ordering are normalized.
    Every expression, literal, operator, scope, and left-arm label is retained.
    """
    offsets = {'location', 'arg_location', 'payload_location', 'stmt_location', 'stmt_len'}
    def walk(node, right_union=False):
        if isinstance(node, (tuple,list)):
            return [walk(v) for v in node]
        if not isinstance(node, dict):
            return node
        node = {k:v for k,v in node.items() if k not in offsets}
        if node.get('@') == 'SelectStmt':
            if node.get('op',{}).get('name') == 'SETOP_UNION':
                return {k:walk(v,k=='rarg') for k,v in node.items()}
            if right_union and not any(node.get(k) for k in ('sortClause','groupClause','havingClause','distinctClause','windowClause','limitOffset','limitCount','lockingClause')):
                for target in node.get('targetList') or ():
                    value = target.get('val') or {}
                    names = value.get('typeName',{}).get('names') or ()
                    if (value.get('@')=='TypeCast' and value.get('arg',{}).get('@')=='A_Const'
                        and len(names)==1 and names[0].get('sval') in ('text','uuid')
                        and target.get('name')==names[0].get('sval')):
                        target['name']=None
        return {k:walk(v) for k,v in node.items()}
    statements = pglast.parse_sql(sql)
    assert len(statements)==1 and type(statements[0].stmt).__name__=='SelectStmt'
    return walk(statements[0]())


def canonical(value, field=None):
    """OID-independent ordering, retaining definitions and all security fields."""
    if field == 'viewDefinition' and value is not None:
        return canonical_view(value)
    if isinstance(value, dict):
        return {k: canonical(v, k) for k, v in sorted(value.items())}
    if isinstance(value, list):
        # Column order and enum-label order are significant. Sort only record
        # collections; callers retain string arrays such as labels/options.
        values = [canonical(v) for v in value]
        if field == 'columns':
            return values
        if field in ('viewDependencies', 'options', 'roles'):
            return sorted(values)
        return sorted(values, key=lambda v: json.dumps(v, sort_keys=True)) if values and isinstance(values[0], dict) else values
    return value


def digest(value):
    return hashlib.sha256(json.dumps(canonical(value), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def object_key(group, row):
    if group == 'defaultPrivileges':
        return '/'.join([row['owner'], row['schema'] or '', row['type']])
    if group == 'triggers':
        return '.'.join([row['schema'], row['table'], row['name']])
    if group == 'functions':
        return f"{row['schema']}.{row['name']}({row['arguments']})"
    return '.'.join(filter(None, [row.get('schema'), row['name']]))


def generate(catalogue):
    assert set(catalogue) == {'schemas', 'enums', 'relations', 'functions', 'triggers', 'defaultPrivileges'}
    roles = ['PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres', 'pg_database_owner']
    relations = catalogue['relations']
    tables = [r for r in relations if r['kind'] == 'r']
    views = [r for r in relations if r['kind'] == 'v']
    sequences = [r for r in relations if r['kind'] == 'S']
    assert len(tables) == 148 and len(views) == 29 and len(sequences) == 2
    assert len(catalogue['functions']) == 346 and len(catalogue['triggers']) == 150
    assert all(r['owner'] == 'postgres' for r in relations + catalogue['functions'] + catalogue['enums'])
    assert all(s['sequence']['dependencyType'] == 'i' for s in sequences)
    assert all(i['valid'] and i['ready'] for r in tables for i in r['indexes'] or [])
    for collection in ('schemas', 'enums', 'relations', 'functions', 'defaultPrivileges'):
        for row in catalogue[collection]:
            assert all(a['grantee'] in roles for a in row['acl'] or []), 'Review unexpected privilege role'
    sql = [
        '-- BF-20 current-schema baseline. FRESH EMPTY LOCAL DATABASES ONLY.',
        '-- No application rows, Auth accounts, Storage objects, cron jobs,',
        '-- production bindings or historic migration-ledger entries are copied.',
        '-- Historical supabase/migrations files remain unchanged; do not replay',
        '-- them over this snapshot. Future migration integration is a separate gate.',
        'BEGIN;',
        "SET LOCAL search_path = pg_catalog;",
        "SET LOCAL lock_timeout = '5s';",
        "SET LOCAL statement_timeout = '120s';",
        "DO $baseline$ BEGIN\n"
        "  IF current_setting('haiedu.fresh_baseline', true) IS DISTINCT FROM 'local-empty-v1' THEN\n"
        "    RAISE EXCEPTION 'fresh_baseline_explicit_local_mode_required';\n"
        "  END IF;\n"
        "  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace\n"
        "      WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','v','m','S','f'))\n"
        "     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace\n"
        "      WHERE n.nspname IN ('public','private'))\n"
        "     OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace\n"
        "      WHERE n.nspname IN ('public','private') AND t.typtype IN ('e','d')) THEN\n"
        "    RAISE EXCEPTION 'fresh_baseline_requires_empty_application_schemas';\n"
        "  END IF;\n"
        "  IF to_regclass('auth.users') IS NULL OR to_regclass('auth.sessions') IS NULL\n"
        "     OR to_regclass('storage.objects') IS NULL THEN\n"
        "    RAISE EXCEPTION 'fresh_baseline_requires_initialized_supabase_services';\n"
        "  END IF;\n"
        "END $baseline$;",
        'SET LOCAL check_function_bodies = false;',
        'CREATE SCHEMA IF NOT EXISTS extensions;',
        'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;',
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;',
        'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;',
        'CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;',
    ]

    def add(statement):
        sql.append(statement.rstrip().rstrip(';') + ';')

    def grants(kind, target, acl, prefix=''):
        add(f'{prefix}REVOKE ALL ON {kind} {target} FROM ' + ', '.join(role(r) for r in roles))
        for a in acl or []:
            assert a['privilege'] in {'USAGE','CREATE','SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN','EXECUTE'}
            add(f"{prefix}GRANT {a['privilege']} ON {kind} {target} TO {role(a['grantee'])}" + (' WITH GRANT OPTION' if a['grantable'] else ''))

    for row in catalogue['schemas']:
        add(f'CREATE SCHEMA IF NOT EXISTS {ident(row["name"])} AUTHORIZATION {ident(row["owner"])}')
        add(f'ALTER SCHEMA {ident(row["name"])} OWNER TO {ident(row["owner"])}')
    for row in catalogue['enums']:
        add(f'CREATE TYPE {qualified(row)} AS ENUM (' + ', '.join(literal(v) for v in row['labels']) + ')')
        add(f'ALTER TYPE {qualified(row)} OWNER TO postgres')

    for row in tables:
        cols = []
        for column in row['columns']:
            s = f'{ident(column["name"])} {column["type"]}'
            if column['collation']:
                s += ' COLLATE ' + column['collation']
            if column['identity']:
                seq = next(r for r in sequences if r['sequence']['ownedBy'] == f"{row['schema']}.{row['name']}.{column['name']}")
                options = seq['sequence']
                s += ' GENERATED ' + ('ALWAYS' if column['identity'] == 'a' else 'BY DEFAULT') + ' AS IDENTITY ('
                s += f'SEQUENCE NAME {qualified(seq)} START WITH {options["start"]} INCREMENT BY {options["increment"]} MINVALUE {options["min"]} MAXVALUE {options["max"]} CACHE {options["cache"]} '
                s += ('CYCLE' if options['cycle'] else 'NO CYCLE') + ')'
            if column['generated']:
                assert column['generated'] == 's'
                s += f' GENERATED ALWAYS AS ({column["default"]}) STORED'
            if column['notNull']:
                s += ' NOT NULL'
            cols.append('  ' + s)
        assert row['persistence'] in ('p','u')
        add('CREATE ' + ('UNLOGGED ' if row['persistence'] == 'u' else '') + f'TABLE {qualified(row)} (\n' + ',\n'.join(cols) + '\n)')
        add(f'ALTER TABLE {qualified(row)} OWNER TO postgres')

    # Quoted SQL/PLpgSQL bodies can refer forward to later views and functions.
    # Installing them never executes the stored body or changes application data.
    for row in catalogue['functions']:
        add(row['definition'])
        add(f'ALTER FUNCTION {qualified(row)}({row["arguments"]}) OWNER TO postgres')
    for row in tables:
        for col in row['columns']:
            target = f'ALTER TABLE {qualified(row)} ALTER COLUMN {ident(col["name"])}'
            if col['default'] and not col['generated'] and not col['identity']:
                add(f'{target} SET DEFAULT {col["default"]}')
            if col['statistics'] not in (-1, None):
                add(f'{target} SET STATISTICS {int(col["statistics"])}')
            add(f'{target} SET STORAGE ' + {'p':'PLAIN','e':'EXTERNAL','m':'MAIN','x':'EXTENDED'}[col['storage']])
            if col['compression']:
                add(f'{target} SET COMPRESSION ' + {'p':'pglz','l':'lz4'}[col['compression']])
            assert not col['options'], 'Review column-specific options before generating'
        if row['options']:
            add(f'ALTER TABLE {qualified(row)} SET (' + ', '.join(ident(k) + '=' + literal(v) for k,v in (o.split('=',1) for o in row['options'])) + ')')
    # Constraints and standalone unique indexes must precede foreign keys.
    # A referenced uniqueness guarantee need not be a UNIQUE constraint.
    for foreign in (False,):
        for row in tables:
            for constraint in row['constraints'] or []:
                if constraint['type'] == 't':
                    # pg_constraint also records constraint triggers. Their
                    # CREATE CONSTRAINT TRIGGER below creates this entry.
                    continue
                if (constraint['type'] == 'f') == foreign:
                    add(f'ALTER TABLE {qualified(row)} ADD CONSTRAINT {ident(constraint["name"])} {constraint["definition"]}')
    for row in tables:
        for index in row['indexes'] or []:
            if not index['constraint']:
                add(index['definition'])
            if index['clustered']:
                add(f'ALTER TABLE {qualified(row)} CLUSTER ON {ident(index["name"])}')
            if index['comment'] is not None:
                add(f'COMMENT ON INDEX {ident(row["schema"])}.{ident(index["name"])} IS {literal(index["comment"])}')
        replica = {'d':'DEFAULT','n':'NOTHING','f':'FULL'}.get(row['replicaIdentity'])
        if replica is None:
            assert row['replicaIdentity'] == 'i'
            replica = 'USING INDEX ' + ident(next(i['name'] for i in row['indexes'] if i['replicaIdentity']))
        add(f'ALTER TABLE {qualified(row)} REPLICA IDENTITY {replica}')

    for row in tables:
        for constraint in row['constraints'] or []:
            if constraint['type'] == 'f':
                add(f'ALTER TABLE {qualified(row)} ADD CONSTRAINT {ident(constraint["name"])} {constraint["definition"]}')

    pending = {f"{r['schema']}.{r['name']}": r for r in views}
    while pending:
        ready = [k for k,r in pending.items() if not set(r['viewDependencies'] or []) & pending.keys()]
        assert ready, 'Unresolved/cyclic view dependency'
        for key in sorted(ready):
            row = pending.pop(key)
            opts = ' WITH (' + ', '.join(row['options']) + ')' if row['options'] else ''
            add(f'CREATE VIEW {qualified(row)} (' + ', '.join(ident(c['name']) for c in row['columns']) + ')' + opts + ' AS\n' + row['viewDefinition'])
            add(f'ALTER VIEW {qualified(row)} OWNER TO postgres')
    for row in catalogue['triggers']:
        add(row['definition'])
        mode = {'O':'ENABLE','D':'DISABLE','R':'ENABLE REPLICA','A':'ENABLE ALWAYS'}[row['enabled']]
        add(f'ALTER TABLE {ident(row["schema"])}.{ident(row["table"])} {mode} TRIGGER {ident(row["name"])}')
        if row['comment'] is not None:
            add(f'COMMENT ON TRIGGER {ident(row["name"])} ON {ident(row["schema"])}.{ident(row["table"])} IS {literal(row["comment"])}')
    for row in tables:
        for p in row['policies'] or []:
            command = {'*':'ALL','r':'SELECT','a':'INSERT','w':'UPDATE','d':'DELETE'}[p['command']]
            s = f'CREATE POLICY {ident(p["name"])} ON {qualified(row)} AS ' + ('PERMISSIVE' if p['permissive'] else 'RESTRICTIVE')
            s += f' FOR {command} TO ' + ', '.join(role(r) for r in p['roles'])
            if p['using'] is not None:
                s += f' USING ({p["using"]})'
            if p['check'] is not None:
                s += f' WITH CHECK ({p["check"]})'
            add(s)
        add(f'ALTER TABLE {qualified(row)} ' + ('ENABLE' if row['rls'] else 'DISABLE') + ' ROW LEVEL SECURITY')
        add(f'ALTER TABLE {qualified(row)} ' + ('FORCE' if row['forceRls'] else 'NO FORCE') + ' ROW LEVEL SECURITY')
    for row in catalogue['schemas']:
        grants('SCHEMA', ident(row['name']), row['acl'])
    for row in catalogue['enums']:
        grants('TYPE', qualified(row), row['acl'])
    for row in relations:
        kind = 'SEQUENCE' if row['kind'] == 'S' else 'TABLE'
        grants(kind, qualified(row), row['acl'])
        if row['comment'] is not None:
            add(f'COMMENT ON {"VIEW" if row["kind"] == "v" else kind} {qualified(row)} IS {literal(row["comment"])}')
        for col in row['columns'] or []:
            for a in col['acl'] or []:
                assert a['grantee'] in roles
                add(f'GRANT {a["privilege"]} ({ident(col["name"])}) ON TABLE {qualified(row)} TO {role(a["grantee"])}' + (' WITH GRANT OPTION' if a['grantable'] else ''))
            if col['comment'] is not None:
                add(f'COMMENT ON COLUMN {qualified(row)}.{ident(col["name"])} IS {literal(col["comment"])}')
    for row in catalogue['functions']:
        target = f'{qualified(row)}({row["arguments"]})'
        grants('FUNCTION', target, row['acl'])
        if row['comment'] is not None:
            add(f'COMMENT ON FUNCTION {target} IS {literal(row["comment"])}')
    for row in catalogue['defaultPrivileges']:
        assert row['schema'] == 'public' and row['owner'] in ('postgres','supabase_admin')
        kind = {'S':'SEQUENCES','r':'TABLES','f':'FUNCTIONS'}[row['type']]
        prefix = f'ALTER DEFAULT PRIVILEGES FOR ROLE {ident(row["owner"])} IN SCHEMA {ident(row["schema"])} '
        grants(kind, '', row['acl'], prefix)
    add('SET LOCAL check_function_bodies = true')
    add('COMMIT')
    return '\n\n'.join(sql) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalogue', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    catalogue = json.loads(args.catalogue.read_text())
    root = Path(__file__).resolve().parents[1]
    sql = generate(catalogue)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'schema.sql').write_text(sql)
    manifest = {
        'schemaVersion': 1, 'kind': 'fresh-only-schema',
        'normalization': 'PostgreSQL17 view AST; source offsets and unused right-UNION default constant-cast labels only',
        'parser': pglast.__version__,
        'sourceCommit': '70a466cd1bcb19e4558a741331d23d5f3e87916a',
        'catalogueSha256': digest(catalogue),
        'schemaSha256': hashlib.sha256(sql.encode()).hexdigest(),
        'objects': {k: len(v) for k,v in catalogue.items()},
        'fingerprints': {k: sorted([dict(key=object_key(k,r), sha256=digest(r)) for r in v], key=lambda r:r['key']) for k,v in catalogue.items()},
        'dataCopied': False, 'historicLedgerCopied': False,
        'cronJobsInstalled': False, 'productionApplicable': False,
        'sourceInputs': [{'path':str(p.relative_to(root)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
                         for directory in ('migrations','operations')
                         for p in sorted((root / 'supabase' / directory).glob('*.sql'))],
    }
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'generated': True, 'bytes': len(sql.encode()), 'objects': manifest['objects']}))


if __name__ == '__main__':
    main()
