#!/usr/bin/env python3
"""Compare a rebuilt app catalogue with the reviewed baseline manifest."""
import argparse
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('baseline', Path(__file__).with_name('build-fresh-baseline.py'))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


object_key = baseline.object_key


def compare_manifest(manifest, actual):
    differences = []
    for group in sorted(set(manifest['fingerprints']) | set(actual)):
        left = {r['key']:r['sha256'] for r in manifest['fingerprints'].get(group,[])}
        right = {object_key(group,r):baseline.digest(r) for r in actual.get(group,[])}
        assert len(left) == len(manifest['fingerprints'].get(group,[])), 'Duplicate expected key'
        assert len(right) == len(actual.get(group,[])), 'Duplicate actual key'
        for key in sorted(left.keys() | right.keys()):
            if left.get(key) != right.get(key):
                differences.append({'group':group,'object':key,'kind':'extra' if key not in left else 'missing' if key not in right else 'different'})
    return differences


def compare(expected, actual):
    differences = []
    for group in sorted(set(expected) | set(actual)):
        left = {object_key(group, r): r for r in expected.get(group, [])}
        right = {object_key(group, r): r for r in actual.get(group, [])}
        assert len(left) == len(expected.get(group, [])), 'Duplicate expected key'
        assert len(right) == len(actual.get(group, [])), 'Duplicate actual key'
        for key in sorted(left.keys() | right.keys()):
            if key not in left or key not in right:
                differences.append({'group': group, 'object': key, 'kind': 'extra' if key not in left else 'missing'})
            elif baseline.digest(left[key]) != baseline.digest(right[key]):
                fields = [k for k in left[key].keys() | right[key].keys()
                          if baseline.canonical(left[key].get(k), k) != baseline.canonical(right[key].get(k), k)]
                differences.append({'group': group, 'object': key, 'kind': 'different', 'fields': sorted(fields)})
    return differences


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('expected', type=Path)
    p.add_argument('actual', type=Path)
    p.add_argument('--output', type=Path)
    args = p.parse_args()
    expected = json.loads(args.expected.read_text())
    actual = json.loads(args.actual.read_text())
    is_manifest = 'fingerprints' in expected
    differences = compare_manifest(expected,actual) if is_manifest else compare(expected, actual)
    result = {'passed': not differences, 'differences': differences,
              'expectedCatalogueSha256': expected['catalogueSha256'] if is_manifest else baseline.digest(expected),
              'actualCatalogueSha256': baseline.digest(actual),
              'expectedCounts': expected['objects'] if is_manifest else {k: len(v) for k,v in expected.items()},
              'actualCounts': {k: len(v) for k,v in actual.items()}}
    if args.output:
        args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    raise SystemExit(1 if differences else 0)


if __name__ == '__main__':
    main()
