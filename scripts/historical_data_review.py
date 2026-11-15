"""Validate pinned historical-review coverage without SQL or network access.

This checks the integrity of a recorded semantic review. It does not perform
that review, replay migrations, or establish current production data contents.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re

ROOT = Path(__file__).resolve().parents[1]
REVIEW = 'supabase/updates/historical-data-review.json'
REQUIREMENTS = 'supabase/updates/fresh-data-requirements.json'
PINNED_INPUTS = {
    'supabase/baseline/manifest.json',
    'supabase/baseline/schema.sql',
    'supabase/baseline/technical-seed.sql',
    'supabase/baseline/source-history-crosswalk.json',
    'supabase/updates/historical-data-inventory.json',
}
CLASSES = {
    'structure', 'no-op', 'governed-content', 'learning-policy',
    'runtime-binding', 'existing-data-backfill', 'pilot-authorization',
    'presentation-activation', 'private-bucket', 'technical-rate-defaults',
    'scheduled-maintenance', 'dynamic-structure',
}
BASES = {
    'normalized-sql-token-match', 'reviewed-recorded-variant',
    'reviewed-archived-recorded-operation', 'reviewed-recorded-only-or-alias',
}


class ReviewError(ValueError):
    """Safe diagnostic code; never include raw SQL or historical values."""


def require(condition, code):
    if not condition:
        raise ReviewError(code)


def file_bytes(root, name):
    require(isinstance(name, str), 'invalid_reference')
    relative = PurePosixPath(name)
    require(not relative.is_absolute() and '..' not in relative.parts
            and relative.parts and relative.parts[0] in {'supabase', 'docs'},
            'invalid_reference')
    path = root / name
    require(not any(parent.is_symlink() for parent in [path, *path.parents]
                    if parent != root.parent), 'symlink_reference')
    require(path.is_file() and path.resolve().is_relative_to(root.resolve()),
            'missing_reference')
    return path.read_bytes()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def validate(root=ROOT, review=None, requirements=None):
    root = Path(root)
    review = json.loads(file_bytes(root, REVIEW)) if review is None else review
    requirements = (json.loads(file_bytes(root, REQUIREMENTS))
                    if requirements is None else requirements)
    require(review.get('schemaVersion') == 1
            and review.get('kind') == 'historical-data-rebuild-dispositions',
            'unknown_review_format')
    require(review.get('reviewStatus') == 'complete-for-pinned-rebuild-dispositions',
            'review_incomplete')
    require(bool(re.fullmatch('[a-f0-9]{40}', review.get('reviewedSourceCommit', ''))),
            'invalid_source_commit')
    require(set(review.get('inputPins', {})) == PINNED_INPUTS, 'input_pin_coverage')
    for path, expected in review['inputPins'].items():
        require(digest(file_bytes(root, path)) == expected, 'reviewed_input_changed')
    manifest = json.loads(file_bytes(root, 'supabase/baseline/manifest.json'))
    crosswalk = json.loads(file_bytes(root, 'supabase/baseline/source-history-crosswalk.json'))
    require(set(review.get('classes', {})) == CLASSES, 'review_class_coverage')
    for entry in review['classes'].values():
        require(bool(entry.get('disposition')) and bool(entry.get('reason')),
                'missing_disposition')

    actual_paths = [str(p.relative_to(root))
                    for directory in ('migrations', 'operations')
                    for p in sorted((root / 'supabase' / directory).glob('*.sql'))]
    expected_paths = [r['path'] for r in manifest['sourceInputs']]
    require(actual_paths == expected_paths, 'historical_source_coverage')
    sources = review.get('sources', [])
    require([s.get('path') for s in sources] == expected_paths, 'source_review_coverage')
    for source, expected in zip(sources, manifest['sourceInputs']):
        require(source.get('sha256') == expected['sha256']
                == digest(file_bytes(root, source['path'])), 'historical_source_changed')
    production = review.get('production', [])
    require([p.get('version') for p in production]
            == [p['version'] for p in crosswalk['production']], 'recorded_review_coverage')
    source_set = set(expected_paths)
    for entry, expected in zip(production, crosswalk['production']):
        require(all(entry.get(k) == v for k, v in expected.items()),
                'recorded_fingerprint_changed')
        require(entry.get('basis') in BASES, 'unknown_recorded_basis')
        refs = entry.get('sourcePaths')
        require(isinstance(refs, list) and len(refs) == len(set(refs))
                and set(refs) <= source_set, 'recorded_source_reference')
        require(bool(refs) or entry['basis'] == 'reviewed-recorded-only-or-alias',
                'recorded_source_reference')
    for entry in [*sources, *production]:
        tags = entry.get('reviewClasses')
        require(isinstance(tags, list) and bool(tags)
                and len(tags) == len(set(tags)) and set(tags) <= CLASSES,
                'unclassified_effect')
        require(isinstance(entry.get('reviewNote'), str)
                and len(entry['reviewNote'].strip()) >= 30, 'missing_review_note')
        require(entry.get('historicalReplayAllowed') is False, 'historical_replay_forbidden')

    require(review.get('requirementsFile') == REQUIREMENTS, 'requirements_reference')
    require(requirements.get('schemaVersion') == 1
            and requirements.get('kind') == 'fresh-feature-data-requirements'
            and requirements.get('automaticChanges') is False, 'invalid_requirements_contract')
    needs = requirements.get('requirements', [])
    required_ids = {
        'actor-rate-defaults', 'mcq-option-order', 'supplementary-materials',
        'teacher-task-files', 'governed-programmes-and-content',
        'target-runtime-bindings', 'accounts-schools-and-learning-history',
        'counter-maintenance', 'provider-settings-and-content-files',
    }
    require(len(needs) == len(required_ids)
            and {n.get('id') for n in needs} == required_ids, 'requirement_coverage')
    for need in needs:
        require(all(need.get(k) for k in ('kind', 'stateAfterBaseline', 'beforeUse', 'sourcePaths')),
                'missing_requirement_detail')
        for path in need['sourcePaths']:
            file_bytes(root, path)
        if need['kind'] == 'empty-private-storage-bucket':
            config = need.get('configuration', {})
            require(config.get('id') == config.get('name') == need['id']
                    and config.get('public') is False
                    and type(config.get('fileSizeLimit')) is int
                    and config['fileSizeLimit'] > 0
                    and isinstance(config.get('allowedMimeTypes'), list)
                    and bool(config['allowedMimeTypes']), 'invalid_private_bucket_contract')
    counts = Counter(p['basis'] for p in production)
    summary = {
        'sourceFiles': len(sources), 'recordedProductionEntries': len(production),
        'normalizedSourceRecordMatches': counts['normalized-sql-token-match'],
        'reviewedRecordedVariants': (counts['reviewed-recorded-variant']
                                    + counts['reviewed-archived-recorded-operation']),
        'recordedOnlyOrAliasEntries': counts['reviewed-recorded-only-or-alias'],
        'unclassifiedSources': 0, 'unclassifiedRecordedEntries': 0,
        'historicalReplayOperationsApproved': 0,
    }
    require(review.get('summary') == summary, 'review_summary_mismatch')
    return {'passed': True, **summary, 'featureRequirements': len(needs)}
