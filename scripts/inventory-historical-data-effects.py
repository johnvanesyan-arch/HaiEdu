#!/usr/bin/env python3
"""Non-executing source inventory; never a replay/seed or data-recovery plan.

Only filenames, statement kinds, object names and fingerprints are emitted.
Literal data, procedural bodies and user/learner rows are never included.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

from pglast import parse_sql
from pglast.visitors import Visitor
from fresh_update_bridge import ROOT, digest, load_plan


class DataWrites(Visitor):
    def __init__(self):
        super().__init__()
        self.writes = []

    def record(self, node):
        relation = node.relation
        self.writes.append({'kind': type(node).__name__,
                            'target': (relation.schemaname or '<search_path>')+'.'+relation.relname})

    def visit_InsertStmt(self, ancestors, node):
        self.record(node)

    def visit_UpdateStmt(self, ancestors, node):
        self.record(node)

    def visit_DeleteStmt(self, ancestors, node):
        self.record(node)


def inventory():
    plan = load_plan()
    rows = []
    for source in plan['manifest']['sourceInputs']:
        raw = (ROOT / source['path']).read_bytes()
        statements = parse_sql(raw.decode())
        types = Counter(type(s.stmt).__name__ for s in statements)
        visitor = DataWrites()
        visitor(statements)
        targets = sorted({w['target'] for w in visitor.writes})
        execution = {k: types[k] for k in ('DoStmt','SelectStmt','CallStmt','CopyStmt','MergeStmt') if types[k]}
        structural_data = {k: types[k] for k in ('AlterTableStmt','DropStmt','CreateTableAsStmt','CreateExtensionStmt') if types[k]}
        rows.append({**source, 'statementKinds': dict(sorted(types.items())),
                     'explicitDataWrites': len(visitor.writes), 'dataWriteTargets': targets,
                     'executionRequiringSemanticReview': execution,
                     'structuralOperationsRequiringDataReview': structural_data,
                     'replayDisposition': 'never-replay-after-fresh-baseline'})
    crosswalk = json.loads(plan['contents']['supabase/baseline/source-history-crosswalk.json'])
    return {'formatVersion':1, 'kind':'static-historical-effect-inventory',
            'sourceSnapshot':plan['manifest']['sourceCommit'], 'historicalInputSha256':digest(plan['manifest']['sourceInputs']),
            'files':rows,
            'summary':{'sourceFiles':len(rows), 'sourceMigrations':len(crosswalk['repository']),
                       'archivedOperations':len(rows)-len(crosswalk['repository']),
                       'filesWithExplicitDataWrites':sum(bool(r['explicitDataWrites']) for r in rows),
                       'filesWithExecutionRequiringSemanticReview':sum(bool(r['executionRequiringSemanticReview']) for r in rows),
                       'recordedProductionEntries':len(crosswalk['production'])},
            'boundary':'Static syntax inventory only. Function/procedure bodies, dynamic SQL, trigger side effects, data-dependent DDL and production-only operations need semantic/data-effect review. Absence of a detected write is not proof of no data effect. No historical SQL is executed, no data is copied and no seed/recovery completeness claim is made.',
            'freshDefaults':'Only the four previously reviewed actor-rate policies in technical-seed.sql. Governed content/configuration and user data remain separate.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = inventory()
    path = ROOT / 'supabase/updates/historical-data-inventory.json'
    encoded = json.dumps(result, indent=2)+'\n'
    if args.check:
        if not path.is_file() or path.read_text() != encoded:
            raise SystemExit('Historical inventory is stale; regenerate and review it.')
    else:
        path.write_text(encoded)
    print(json.dumps({'passed':True, **result['summary']}))


if __name__ == '__main__':
    main()
