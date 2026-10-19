# Chapter VI Batch 3 draft staging

**Sprint 15F.4 · staged 2026-10-19 · ordinary exact-version review pending**

## Result

Batch 3 is committed to the inactive Chapter VI authoring catalogue as **82 draft questions: 48 Practice, 14 Diagnostic and 20 Mastery** across S09–S13, with **48 draft guides and 58 draft misconception definitions**. Fifty-six of the definitions are presently referenced by the batch’s 246 distractor mappings; the S13 full-submergence and performed-work definitions remain explicit catalogue safeguards even though no retained distractor activates them.

The cumulative Chapter VI catalogue is now:

| Record | Count |
| --- | ---: |
| Questions | 242 |
| Practice / Diagnostic / Mastery | 146 / 38 / 58 |
| Guides | 146 |
| Misconception definitions | 158 |
| Options / distractor mappings | 968 / 726 |

All 242 questions remain `draft`, `needs_review`, `provisional_no_sme_review`, non-visible and non-allocatable. The release `physics7_u06_2026_08_14_draft_r6` remains `draft` with `activated_at = null`. Chapter VI still has zero assessment pools, form links, learning-session items, item reviews, student exposures and chapter-review exposures.

## Guarded transaction

The transaction was built from the accepted 82-slot manifest and guarded by the exact count and whole-row fingerprint of all **63 governed public tables**. It also required the inactive release, all 16 review-status U06 skills, and absence of every proposed item, family, template and misconception code.

1. The rollback rehearsal returned an exact transaction-local catalogue and rolled back. All 82 item snapshots, 328 options, 82 keys, 246 distractor mappings, 58 definitions and 48 guides matched the authored specifications.
2. The identical guarded commit produced only the planned content deltas. Its postcondition proved that every pre-existing row remained present byte-for-byte.
3. Exact deployed-source replay then passed **82/82 questions** and **48/48 guides** with zero errors and zero warnings.
4. A separate guarded QA transaction added 82 actor-null technical-QA records under run key `15F4-batch03-20261019`.
5. Final 63-table readback showed that the QA transaction changed only `item_qa_runs`; every other staged table fingerprint remained identical.

| Table | Planned delta |
| --- | ---: |
| `items`, `item_answer_keys`, `item_families`, `item_templates`, `item_versions`, `item_curriculum_scopes`, `item_family_curriculum_reconciliations`, `curriculum_release_item_families` | +82 each |
| `item_options` | +328 |
| `item_misconception_mappings` | +246 |
| `misconceptions` | +58 |
| `item_template_remediation_guides`, `remediation_guide_versions`, `remediation_guide_authoring_versions` | +48 each |
| `item_qa_runs` | +82 in the separate QA transaction |

## Production proof

- Baseline observed: `2026-10-19T18:02:27.215051+00:00`
- Committed catalogue observed: `2026-10-19T18:25:33.445473+00:00`
- Final verification observed: `2026-10-19T18:29:37.977775+00:00`
- Baseline state SHA-256: `d477ff2d877887d815b1e7671d782ecec6bf73382463c3e5a58820df6905d7b5`
- Staged state SHA-256: `82dfe8469b88af9cbe15f2b865c09673b818c90b46205ee4ae64c1a597affee6`
- Final state SHA-256: `cd97765502229c0886d7d091aa5db5018641b5ba2f45e21591258cbf7ef4721c`
- Rollback catalogue SHA-256: `b7105933ccc309ba9f30cc87084fca0063a08a1de49111c09b7104ff943b45fb`
- Production catalogue SHA-256: `66994c89a118b0d310a725e90befa241184f20e50d19c6990577cb5e13b947f6`
- Final verification SHA-256: `79b3f4229dbb410e3dfaf6722db3aa43cb84145486fbb2f07711cb38951836a4`
- Deployed question evaluator SHA-256: `846b4c23a0c0c3ffe7bb1e89478e445f76736013b36a18ea6c07e95d7ca29db2`
- Deployed guide validator SHA-256: `e19ecbe9b6113f536617ce538832c460d3f37d79c8c47757c04dd908a119561d`

## Textbook assets

Four exact source crops support Practice/reference use only:

- `p148-buoyant-force-measurement.png` — `aaec234036c945416a057c992e5dbec6538ff14243f168556a311ccba6a28cc2`
- `p152-liquid-density-comparison.png` — `c48913d62e7d23b0cac40f4f632c20e12928569ddb40158da5fd1e4e9440ae8c`
- `p156-floating-conditions.png` — `67a05e937fcac04676bd687e9d4221e5eca7c65de61992a7e060046abfea3ef1`
- `p159-ship-displacement.png` — `20b64be88b14cfc410c3504c0d4983ecfc01508fec59b2bb6a33bf0356a00228`

No exposed crop is used by a Diagnostic or Mastery candidate.

## Remaining gates

- Complete ordinary authenticated exact-version review of Batch 1–3 questions, guides and definitions.
- Complete independent specialist/content-SME review before qualifying protected candidates.
- Define and explicitly approve any Chapter VI assessment contract, pool/form allocation, scoring rules, policy/model binding, activation and learner release as later work.

Batch 3 staging completes the accepted 242-slot authoring plan. It does **not** publish Chapter VI or authorize learner use.
