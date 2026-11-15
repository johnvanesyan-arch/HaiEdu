#!/usr/bin/env python3
"""Validate the reviewed plan; optionally rehearse in a new disposable local stack.

No existing database, hosted target, credentials or remote Docker endpoint can
be selected. The legacy Supabase migration ledger is never copied or repaired.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

from fresh_update_bridge import load_plan, owned_database, Refusal


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rehearse', action='store_true')
    parser.add_argument('--evidence-dir', type=Path)
    args = parser.parse_args()
    if args.rehearse and not args.evidence_dir:
        parser.error('--rehearse requires --evidence-dir')
    proof = {'scope': 'owned-disposable-local', 'productionTouched': False,
             'observedAt': datetime.now(timezone.utc).isoformat()}
    try:
        plan = load_plan()
        proof.update(lineage=plan['lineage'], plannedUpdates=len(plan['entries']),
                     baselineIdentity=plan['baselineIdentity'])
        if args.rehearse:
            args.evidence_dir.mkdir(parents=True, exist_ok=True)
            with owned_database(plan, args.evidence_dir / 'private-diagnostics') as database:
                proof['firstRun'] = database.apply(plan)
                proof['repeatRun'] = database.apply(plan)
                if proof['repeatRun']['applied']:
                    raise Refusal('repeated_update')
            proof['cleanup'] = 'Owned local component stack removed'
        proof['passed'] = True
    except Exception as error:
        proof.update(passed=False, errorType=type(error).__name__)
        if isinstance(error, Refusal):
            proof['reason'] = str(error)
        # Provider/SQL exceptions can contain generated credentials or row data.
        # Do not print them, their tracebacks, or raw subprocess arguments.
    if args.evidence_dir:
        args.evidence_dir.mkdir(parents=True, exist_ok=True)
        (args.evidence_dir / 'result.json').write_text(json.dumps(proof, indent=2)+'\n')
    print(json.dumps(proof))
    return 0 if proof['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
