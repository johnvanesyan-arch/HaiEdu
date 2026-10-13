# Chapter II assessment batch 19

**Sprint:** 15B.13AP · **Date:** 2026-10-13 Asia/Yerevan · **State:** authoring, staging, technical QA and human content/definition review complete; SME/exposure and release gates open.

**Review closure — 2026-10-13 06:22 UTC (10:22 Asia/Yerevan):** all 19 questions are human content-approved at their unchanged staged v1, with passing current-version QA and unchanged immutable snapshots. All 24 definitions are active and match their approved snapshots. Across both batches, all 37 questions and 47 definitions are approved. Chapter II now has 192 approved non-archived questions, 263 active definitions and 57 published guides, with no pending content. [Review closure evidence](evidence/sprint-15b13-batches-19-20-review-complete-20261013.json). The staging observations below preserve the earlier checkpoint; SME/exposure, allocation and release remain open. This closure used read-only production queries.

**Protection follow-up:** subsequent PR review found that the old direct-read policy exposed unallocated approved question prompts. The [shared RLS repair](direct-question-read-protection-20261013.md) now blocks direct learner reads. Content/versions and approvals are preserved, but an exposure-risk disposition is required before protected assessment use; unchanged wording alone does not prove historical non-exposure.

John directed completion of all 37 remaining slots in two batches while retaining the 192-question plan. At staging, this manifest contained **19 questions**, **7 Diagnostic + 12 Mastery**, with **24 new draft misconception definitions** and no new learner guides. Candidate qualification is provisional author judgment under the bounded protected-parallel protocol; it adds zero independent reasoning coverage.

The shared [comparison record](evidence/sprint-15b13-assessment-batches-19-20-comparison-20261013.json) binds both manifests, all 666 new pairs (171 within Batch 19, 153 within Batch 20, 342 across batches), source and full version/guide inventories. Frozen corpus: 416 current questions, 290 immutable versions, 76 current guides and 474 guide-history records. All 156 Chapter II current records including the owner archive, all relevant historical differences, all 138 distinct guide texts, and related Chapter I S04–S10 current banks were reviewed. Other current Chapter I S01–S03 records remain in the raw corpus without a claim of fresh full reading. Two candidate slots were substantially reworked before staging; no old omitted record was restored.

| Candidate | Item | Purpose | Abstract demand |
| --- | --- | --- | --- |
| B19-C01 | PHY7-U02-S02-D03 | diagnostic | Audit competing particle representations against compression constraints |
| B19-C02 | PHY7-U02-S02-M06 | mastery_check | Identify the complete physical system before comparing occupied volumes |
| B19-C03 | PHY7-U02-S02-M07 | mastery_check | Reconcile fixed end positions with thermal extension of a curved object |
| B19-C04 | PHY7-U02-S03-D03 | diagnostic | Decode competing representation legends against molecular composition |
| B19-C05 | PHY7-U02-S03-M06 | mastery_check | Repair two molecular representations under a constrained exchange rule |
| B19-C06 | PHY7-U02-S03-M07 | mastery_check | Test whether aggregate elemental inventory uniquely identifies molecular grouping |
| B19-C07 | PHY7-U02-S04-D03 | diagnostic | Compare actual sizes using differently magnified records |
| B19-C08 | PHY7-U02-S04-M06 | mastery_check | Select the transferred material quantity for a film-size estimate |
| B19-C09 | PHY7-U02-S04-M07 | mastery_check | Isolate a changing subgroup in two mixed-row measurements |
| B19-C10 | PHY7-U02-S05-D03 | diagnostic | Assess a deterministic extrapolation from a short direction record |
| B19-C11 | PHY7-U02-S05-M06 | mastery_check | Evaluate a speed ranking from unequal-duration path records |
| B19-C12 | PHY7-U02-S06-D03 | diagnostic | Select direct observational evidence of reciprocal interpenetration |
| B19-C13 | PHY7-U02-S06-M06 | mastery_check | Evaluate an intervention across parallel permitted diffusion routes |
| B19-C14 | PHY7-U02-S07-D03 | diagnostic | Assess a temperature inference from accumulated penetration |
| B19-C15 | PHY7-U02-S07-M06 | mastery_check | Complete a plan supporting two controlled comparisons |
| B19-C16 | PHY7-U02-S07-M07 | mastery_check | Distinguish a controlled condition from a time-to-target outcome |
| B19-C17 | PHY7-U02-S08-D03 | diagnostic | Apply temperature dependence across a thermal cycle |
| B19-C18 | PHY7-U02-S08-M06 | mastery_check | Reconcile temperature representations before interpreting thermal motion |
| B19-C19 | PHY7-U02-S09-M08 | mastery_check | Assess a claimed temperature ordering with bounded measurement errors |

## Historical pre-staging evidence and verification

Private artifact `libfile_1e0059eb26488191a82091635ed84eea` / `HaiEdu-Assessment-Batch-19-Comparison.zip`, SHA-256 `5a2b942aab90074b8300e5108ecb385db983857e20b9fa645ef03a4e967eb47d`. Fresh materialization matched the complete ZIP and all 110 member hashes; CRC passed. Full prompts, keys, solutions, distractor mappings, nearest current records and pair judgments are private. The shared public record binds exact per-candidate specification/profile hashes.

Final rollback rehearsal: **19/19 passed**, zero errors/warnings, exact specification/options/key/mapping/immutable-snapshot agreement. All 38 complete-table guards were unchanged after rollback. QA used the exact freshly retrieved deployed `manage-content-quality` v11 evaluator, byte-identical to repository source, through a read-only catalogue adapter. This is not authenticated live Edge/browser acceptance. Rehearsal IDs are temporary.

At this checkpoint the release was draft, inactive and unallocated. Content/definition approval, independent SME/exposure qualification, disjoint form allocation, empirical evidence and release were open. Existing 155 approvals, the S07-M05 archive, 57 published guides and 216 active definitions were preserved. The other batch is [Batch 20](chapter-ii-assessment-batch-20.md). The [status register](project-status.md) governs actual counts.

## Historical committed staging verification

At staging, Batch 19 had **19 saved v1 drafts and 24 draft definitions**, with **19/19 passing current-version/family QA records**. Independent post-commit reads exactly match prompts, all options, keys, immutable snapshots, definitions and 111 total mappings across both batches. The evaluator replay result and persisted details match; no human review was manufactured. [Production verification](evidence/sprint-15b13-assessment-batches-19-20-production-20261013.json).

The two transactions preserved all prior rows and made only the declared additive catalogue changes, followed by 37 automated QA inserts. All other 38-table guard fingerprints are unchanged. Batch 20 used a fresh baseline extended only by the already compared Batch 19 records; all cross-batch judgments were committed beforehand at `cbb8a3bccc560f63281bee3e6ba2c2925d2bd61d`.

Stage-time inventory: **192 non-archived questions = 155 approved + 37 pending**, plus one archived historical S07-M05 record. Purpose totals are 96 Practice, 32 Diagnostic and 64 Mastery. There are 216 active and 47 draft definitions, 57 published guides, zero Chapter II pool/form memberships and an inactive draft release. At staging, the nominal drafting gap was zero and the approved-content gap was 37; protected eligibility remained unestablished. The subsequent review closure above supersedes that pending-review count.

Restricted production evidence: `libfile_94ee999fe26c8191a593af9de4217f58` / `HaiEdu-Assessment-Batches-19-20-Production-Verification.zip`, SHA-256 `6f6febb654339fb12cd42252e5008f42e1ff7010882411874dc5c394a01d199b`. No frontend, API, schema or learning-runtime change was made. CI and merged-source/Notion synchronization are documented in the final handoff; at that staging checkpoint human content/definition review remained open; it is now closed as recorded above. SME/exposure and release remain open.
