# Chapter VI Batch 1 staging

**Sprint:** 15F.2  
**Status:** inactive draft catalogue committed; ordinary review pending  
**Production verification:** 2026-10-19T16:25:48.966029Z

## What was staged

The accepted Chapter VI plan now has an inactive governed foundation and its first draft batch.

| Record | Count |
| --- | ---: |
| Draft questions | 70 |
| Practice / Diagnostic / Mastery | 44 / 10 / 16 |
| Options / answer keys | 280 / 70 |
| Families / templates / immutable v1 snapshots | 70 / 70 / 70 |
| Draft misconception definitions / distractor mappings | 44 / 210 |
| Draft Practice guides | 44 |
| Runtime / authoring guide versions | 44 / 44 |
| Actor-null passing technical QA records | 70 |

All items are `draft`, `needs_review` and `provisional_no_sme_review`. Every item has `learnerVisible=false` and `allocationAllowed=false`. The 26 Diagnostic/Mastery candidates are marked protected; the 44 Practice candidates have guides, while protected candidates have none.

## Foundation

The foundation contains one review-status unit, six topics, 15 exact programme outcomes, 16 review-status skills, 24 skill–outcome mappings and draft release `physics7_u06_2026_08_14_draft_r6`. The source-identification and source-registration gates pass. Outcome reconciliation, skill mapping, assessment scope, content QA gate transition and external SME approval remain pending as formal release gates.

The foundation transaction passed a rollback rehearsal and guarded commit over 63 public tables. The Batch 1 transaction then verified every pre-existing row multiset before commit. Final count deltas are exact across all 63 tables; 48 untouched table fingerprints remain exact.

## Validation

The exact deployed `manage-content-quality` v11 evaluator passed **70/70** questions with zero errors and zero warnings in both the rollback catalogue and committed production readback. Evaluator SHA-256: `846b4c23a0c0c3ffe7bb1e89478e445f76736013b36a18ea6c07e95d7ca29db2`.

The exact deployed shared guide validator passed **44/44** guides with zero errors and zero warnings in both catalogues. Validator SHA-256: `e19ecbe9b6113f536617ce538832c460d3f37d79c8c47757c04dd908a119561d`.

Technical QA rows use a null actor and explicitly identify automated exact-source replay. They do not represent human or specialist approval.

## Runtime isolation

Final production readback confirms zero U06 pool definitions, pool-item links, form-item links, policy bindings, model bindings, learning-session items, ordinary reviews, learner exposures and chapter-review exposures. The release is draft, has no predecessor and has never been activated. No endpoint, schema, shared core, scoring rule or learner runtime changed.

The Chapter VI selected-response MVP still makes no performed-work claim for the gas portion of M9. No separate learner or teacher-observed gas-buoyancy procedure is planned.

## Review

Review Batch 1 on the existing authenticated pages, filtered by `PHY7-U06` and S01/S02/S03/S04/S14:

- [Questions](https://www.haiedu.am/content-review.html)
- [Guides](https://www.haiedu.am/content-guides.html)
- [Misconception definitions](https://www.haiedu.am/content-misconceptions.html)

Ordinary exact-version approval is the next content step. Batch 2 authoring may proceed separately under the accepted plan, but no Chapter VI assessment contract, allocation, activation or learner release is authorized by this staging work.
