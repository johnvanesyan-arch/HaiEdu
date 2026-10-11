# Chapter II assessment batch 11

**Date:** 2026-10-11 · **Slice:** 15B.13AA · **State:** comparison and rollback rehearsal complete; committed staging pending.

This is a versioned Physics 7 Chapter II content extension under the existing subject-neutral authoring contract. The owner completed the accumulated review and authorized larger batches. The readback at 18:42:57 UTC confirms **111 published/content-approved questions, 54 published guides and 158 active misconception definitions**, with no pending Chapter II content. All 22 previously pending questions have persisted review records. Current human edits, immutable revisions and published guide changes are part of the new comparison corpus; old approvals are preserved.

## Batch decision

Sixteen candidates were assessed across S02–S09. Eleven qualify for draft staging: **five protected Mastery, three protected Diagnostic, and three intentional Practice variants**. Five candidates are omitted before staging: four repeat complete existing tasks or add a familiar preliminary step to one; one imports an untaught statistical procedure. No existing question is removed or reclassified.

| Skill | Practice | Diagnostic | Mastery | New guides |
| --- | ---: | ---: | ---: | ---: |
| S02 | 0 | 0 | 1 | 0 |
| S03 | 0 | 1 | 1 | 0 |
| S04 | 0 | 0 | 1 | 0 |
| S05 | 0 | 0 | 1 | 0 |
| S06 | 0 | 1 | 0 | 0 |
| S07 | 3 | 0 | 0 | 3 |
| S08 | 0 | 0 | 1 | 0 |
| S09 | 0 | 1 | 0 | 0 |
| Total | 3 | 3 | 5 | 3 |

Eight new misconception definitions accompany the drafts; accurate existing active definitions are reused for the other distractors. The eight protected drafts add judged reasoning demands within taught concepts, subject to human and SME review. They have no learner guides. The three S07 questions rehearse already-taught distinctions and are explicitly **practice variants**, not new independent reasoning coverage. Their three guides do not work protected solution chains.

All eleven prompts are complete verbal tasks. No question references an absent image. Source fidelity was checked against *Ֆիզիկա 7*, Է. Մելիքյան and Գ. Մաիլյան, 2023, Chapter II §§7–12, printed pp.24–37. Authored model interventions and mathematical premises are stated explicitly. No new chemical procedure, pressure law, quantitative thermal-speed law, statistical uncertainty model or diffusion rate law is asserted.

## Comparison and evidence

The [sanitized inventory](evidence/sprint-15b13-assessment-batch-11-inventory-20261011.json) binds the complete **371 current items and 241 immutable versions**, current/historical guides, curriculum/outcome mappings and protected banks across releases to a fresh 28-table corpus. Thirty-eight full-table hashes bracket the reads and guard staging. The comparison covers all 120 candidate pairs, scenarios, required inferences, solutions and distractors. Current reviewer edits were reread; earlier semantic judgments are carried only for unchanged content, with explicit prior-evidence references. Exact-text QA is not the semantic review.

Exact retained and omitted profiles, nearest-match reasoning, source locators, frozen corpus, candidate specifications, comparison pairs and rollback evidence are held in the private owner archive. Protected prompts and worked solutions are deliberately absent from this public report. Authorized reviewers can obtain the evidence through the owner.

- Archive: `HaiEdu-Assessment-Batch-11-Comparison.zip`, version 0, identity `libfile_88b620d01e948191b05f2aaf18c8dd4a`.
- Archive SHA-256: `625c519ef681af449663993cf87ea3dce771decac80722d07a7001b74dce6216`.
- Textbook SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`.
- Candidate/spec/profile hash contracts and private file bindings are recorded in the sanitized inventory.

The archive was saved before committed staging. This comparison must be reachable from the repository before the guarded production transaction. A stale corpus, source or candidate invalidates the affected comparison.

## Verification scope

The rollback rehearsal inserted the planned eleven v1 drafts, three guide drafts and eight definition drafts, then rolled back. All 38 table counts and hashes returned to the baseline. Exact deployed `manage-content-quality` v11 evaluation passed **11/11 with zero errors and warnings** against the transaction catalogue. The deployed `manage-remediation-guides` v10 shared validator passed **3/3 guides with zero errors and warnings**. These are local replays of exact deployed helpers with a read-only query adapter, not authenticated live Edge or browser tests.

The quality source SHA-256 is `b93d0311e73bd1b2f62d3c88abf98526c268c258b10926be3ffd823c0de82154`; the guide helper SHA-256 is `aad5dc785f66863b30cf0d2abedd53cfc7d9006c93c2c07e463215f6122e1142`. Both were freshly read from deployment and saved without altering their returned bytes. Arithmetic answers and explicit source/model assumptions were checked independently of structural QA.

## Remaining boundary

If committed unchanged, this batch would bring Chapter II to **122 authored questions: 96 Practice, 6 Diagnostic and 20 Mastery**. Eleven would await human content review. The planning shortfall would be 70 questions: 26 Diagnostic and 44 Mastery. This does not establish that every remaining slot can be filled with defensible distinct content; expansion must stop for an owner bank-plan decision if source-supported coverage runs out. The practice count includes declared variants and is not a claim of 96 independent solution paths.

Human question/guide/definition approval, external SME validation, assessment allocation, policy/model binding, pilot and release gates remain separate. Chapter II stays draft, inactive and unallocated. Option B remains 16 Diagnostic and 16 Mastery questions, with Mastery requiring 13/16 and at least one correct per skill. No runtime, schema, API, auth or model/scoring behavior is changed.

The reviewer-edited S08-M02 v2 includes two consecutive formulations of distractor A. Record this alongside the existing S09 editorial follow-ups for a versioned correction/review; do not silently overwrite its approval. See the authoritative [project status register](project-status.md) for current disposition after staging.
