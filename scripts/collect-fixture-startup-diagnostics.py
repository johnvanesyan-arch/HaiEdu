"""Copy only validated fixture summaries to a separate public artifact directory."""
import argparse
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tests/fixtures'))
from fixture_diagnostics import validate_report


def collect(source, output):
    reports = []
    if source.exists():
        if source.is_symlink() or not source.is_dir():
            raise ValueError('invalid diagnostic source')
        for path in sorted(source.iterdir()):
            if not re.fullmatch(r'startup-[a-f0-9]{24}\.json', path.name):
                continue
            if path.is_symlink() or not path.is_file() or path.stat().st_size > 65536:
                raise ValueError('invalid diagnostic file')
            report = validate_report(json.loads(path.read_text()))
            if path.name != 'startup-' + report['runId'] + '.json':
                raise ValueError('diagnostic identity mismatch')
            # An interrupted process may leave only its last in-progress step.
            # Do not label that snapshot as a verified cause or completed cleanup.
            if report['failure'] is not None or report['active'] is not None:
                reports.append((path.name, report))
            if len(reports) > 100:
                raise ValueError('too many diagnostic files')
    # Validate every input before creating any publishable output. Never copy a
    # raw diagnostics directory or an old/stale artifact directory.
    output.mkdir(parents=True, exist_ok=False)
    for name, report in reports:
        (output / name).write_text(json.dumps(report, indent=2) + '\n')
    return len(reports)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        count = collect(args.source, args.output)
    except (OSError, ValueError, TypeError, KeyError, AssertionError):
        print('Invalid local fixture diagnostic; no artifact upload permitted.', file=sys.stderr)
        return 1
    print(json.dumps({'validatedFixtureReports': count, 'privateLogsIncluded': False}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
