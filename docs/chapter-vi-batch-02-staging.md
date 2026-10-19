# Chapter VI Batch 2 staging

**Sprint:** 15F.3  
**Status:** inactive draft catalogue committed; ordinary review pending  
**Production verification:** 2026-10-19T17:21:45.844064Z

## What was staged

| Record | Count |
| --- | ---: |
| Draft questions | 90 |
| Practice / Diagnostic / Mastery | 54 / 14 / 22 |
| Options / answer keys | 360 / 90 |
| Families / templates / immutable v1 snapshots | 90 / 90 / 90 |
| Draft misconception definitions / distractor mappings | 56 / 270 |
| Draft Practice guides | 54 |
| Runtime / authoring guide versions | 54 / 54 |
| Actor-null passing technical QA records | 90 |
| Exact textbook image crops used by Practice items | 5 |

All items are `draft`, `needs_review` and `provisional_no_sme_review`. Every item has `learnerVisible=false` and `allocationAllowed=false`. The 36 Diagnostic/Mastery candidates are protected; the 54 Practice candidates have draft guides, while protected candidates have none. S15 and S16 remain Practice-only and non-gating.

## Validation and preservation

The exact deployed `manage-content-quality` v11 evaluator passed **90/90** questions with zero errors and zero warnings in both the rollback catalogue and committed production readback. Evaluator SHA-256: `846b4c23a0c0c3ffe7bb1e89478e445f76736013b36a18ea6c07e95d7ca29db2`.

The exact deployed shared guide validator passed **54/54** guides with zero errors and zero warnings in both catalogues. Validator SHA-256: `e19ecbe9b6113f536617ce538832c460d3f37d79c8c47757c04dd908a119561d`.

The rollback rehearsal restored all 63 governed table fingerprints. The guarded commit then produced only the fourteen planned content-table deltas; the separate QA transaction added exactly 90 `item_qa_runs`. Exact current readback of all ten Batch 1 catalogue projections—70 questions, 280 options, 70 templates and snapshots, 210 mappings, 44 definitions and 44 guides with both guide histories—matches the pre-Batch-2 committed catalogue.

Technical QA rows use a null actor and identify automated exact-source replay. They do not represent human or specialist approval.

## Runtime isolation

Production readback confirms zero Chapter VI pool definitions and zero Batch 2 pool-item links, form-item links, learning-session items, ordinary reviews, learner exposures or chapter-review exposures. The release `physics7_u06_2026_08_14_draft_r6` remains `draft` with `activated_at=null`.

No endpoint, schema, shared core, scoring rule, assessment contract, policy/model binding, activation or learner runtime changed.

## Chapter VI cumulative inventory

After Batch 2, Chapter VI contains **160 draft questions: 98 Practice, 24 Diagnostic and 38 Mastery**, with **98 draft guides and 100 draft misconception definitions**. All 160 remain non-visible, non-allocatable and pending ordinary exact-version review. Batch 3 retains the final **82** planned authoring slots; its content has not been authored or staged by this checkpoint.

The selected-response MVP still makes no performed-work claim for the gas portion of M9. No separate learner or teacher-observed gas-buoyancy procedure is planned.

## Review

Review Batch 2 on the existing authenticated pages, filtered by `PHY7-U06` and S05/S06/S07/S08/S15/S16:

- [Questions](https://www.haiedu.am/content-review.html)
- [Guides](https://www.haiedu.am/content-guides.html)
- [Misconception definitions](https://www.haiedu.am/content-misconceptions.html)

Ordinary exact-version approval remains the next content gate for Batches 1 and 2. Batch 3 authoring may proceed separately under the accepted plan, but no Chapter VI assessment contract, allocation, activation or learner release is authorized by this staging work.
