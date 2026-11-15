"""Negative controls for incomplete or stale historical review evidence."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from historical_data_review import validate, ReviewError, REVIEW, REQUIREMENTS


class ReviewCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review = json.loads((ROOT / REVIEW).read_text())
        cls.requirements = json.loads((ROOT / REQUIREMENTS).read_text())

    def refuses(self, document, reason, requirements=None):
        with self.assertRaisesRegex(ReviewError, '^' + reason + '$'):
            validate(ROOT, document, requirements or self.requirements)

    def test_complete_pinned_review(self):
        result = validate()
        self.assertEqual((result['sourceFiles'], result['recordedProductionEntries']), (209, 218))

    def test_missing_or_duplicate_source_disposition(self):
        for replacement in (self.review['sources'][:-1],
                            [self.review['sources'][0], *self.review['sources'][:-1]]):
            changed = copy.deepcopy(self.review)
            changed['sources'] = replacement
            self.refuses(changed, 'source_review_coverage')

    def test_missing_or_duplicate_recorded_disposition(self):
        for replacement in (self.review['production'][:-1],
                            [self.review['production'][0], *self.review['production'][:-1]]):
            changed = copy.deepcopy(self.review)
            changed['production'] = replacement
            self.refuses(changed, 'recorded_review_coverage')

    def test_recorded_sql_hash_cannot_be_substituted(self):
        changed = copy.deepcopy(self.review)
        changed['production'][0]['statement_sha256'] = '0' * 64
        self.refuses(changed, 'recorded_fingerprint_changed')

    def test_unresolved_or_unclassified_review_cannot_pass(self):
        changed = copy.deepcopy(self.review)
        changed['reviewStatus'] = 'pending'
        self.refuses(changed, 'review_incomplete')
        changed = copy.deepcopy(self.review)
        changed['sources'][0]['reviewClasses'] = []
        self.refuses(changed, 'unclassified_effect')

    def test_review_never_authorizes_historical_replay(self):
        changed = copy.deepcopy(self.review)
        changed['production'][0]['historicalReplayAllowed'] = True
        self.refuses(changed, 'historical_replay_forbidden')

    def test_unknown_recorded_source_reference(self):
        changed = copy.deepcopy(self.review)
        changed['production'][0]['sourcePaths'] = ['supabase/migrations/missing.sql']
        self.refuses(changed, 'recorded_source_reference')

    def test_requirements_cannot_drop_activation_or_make_buckets_public(self):
        changed = copy.deepcopy(self.requirements)
        changed['requirements'] = [r for r in changed['requirements'] if r['id'] != 'mcq-option-order']
        self.refuses(self.review, 'requirement_coverage', changed)
        changed = copy.deepcopy(self.requirements)
        next(r for r in changed['requirements'] if r['id'] == 'teacher-task-files')['configuration']['public'] = True
        self.refuses(self.review, 'invalid_private_bucket_contract', changed)

    def test_changed_or_added_historical_sql_needs_fresh_review(self):
        with tempfile.TemporaryDirectory(prefix='haiedu-history-review-') as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / 'supabase', root / 'supabase',
                            ignore=shutil.ignore_patterns('functions', '.temp'))
            name = self.review['sources'][0]['path']
            with (root / name).open('a') as file:
                file.write('\nSELECT 1;\n')
            with self.assertRaisesRegex(ReviewError, '^historical_source_changed$'):
                validate(root, self.review, self.requirements)
            shutil.copyfile(ROOT / name, root / name)
            (root / 'supabase/migrations/99999999999999_unreviewed.sql').write_text('SELECT 1;')
            with self.assertRaisesRegex(ReviewError, '^historical_source_coverage$'):
                validate(root, self.review, self.requirements)


if __name__ == '__main__':
    unittest.main()
