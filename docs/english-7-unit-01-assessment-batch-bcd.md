# English 7 Unit 1 — DB / MB / MC delivery

**Sprint 16.1C.13 · 2026-10-22 · authoring and inactive reviewer onboarding complete.** The accepted bank is now fully authored and staged: **60 Practice / 56 Diagnostic / 84 Mastery = 200 questions**. The new batch contains 28 Diagnostic B, 28 Mastery B and 28 Mastery C questions. English remains draft/inactive.

## Where to review

Open the [reviewer page](https://www.haiedu.am/content-review.html), select English Grade 7 / Unit 1 and search `ENG7-U01-DB`, `ENG7-U01-MB` or `ENG7-U01-MC`. All 84 new drafts have private explanations, keys, comparison notes and, where applicable, the full passage or script in question detail. The [readback evidence](evidence/english-7-unit-01-bcd-review-onboarding-20261022.json) contains a direct link for every question.

| Bank | Staged | Approved | Current QA passed | New review queue | Source held |
| --- | ---: | ---: | ---: | ---: | ---: |
| Practice | 60 | 60 | 60 | 0 | 0 |
| Diagnostic | 56 | 28 | 48 | 28 | 8 |
| Mastery | 84 | 28 | 68 | 56 | 16 |
| **Total** | **200** | **116** | **176** | **84** | **24** |

The 24 holds are expected: **12 reading questions need six newly accepted and registered passages; 12 listening questions need six new recordings and their accepted source registration**. Their only blocking QA code is `authoring_source_registration_pending`. The private preview supplies their complete draft sources now. A script is not a playable audio asset. The existing seven reading sets, eight recordings and all 116 prior approvals/QA passes are unchanged.

The misconception-mapping warning remains non-blocking under the existing authored-catalogue review policy. No inaccurate misconception was attached to silence it. New human approvals have not been manufactured; the accepted bank manifest explicitly does not delegate final question approval.

## Sources and recordings

The [source review and six recording scripts](english-7-unit-01-bcd-source-review.md) contains all exact text, numbered speaker turns and safe ASCII filenames. Each recording serves two questions in one protected form. The primary factual profiles cover LOOM Weaving, SHABEEG and the Teryan Cultural Center; their claims are paraphrased and source-checked. The other passages and scripts are authored fiction within Unit 1 topics.

Each form retains the accepted distribution: 20 language, four reading and four listening questions, with four shared sources. Every form has 31 response components but **28 questions**, each with maximum one item point. This does not adopt final English scoring weights, readiness, retry rules or empirical form equivalence. The approved C12 runtime already provides two plays per recording per assessment, normal speed, shared question visibility and persistent interruption handling; no further playback-count decision is required. Speaking stays classroom-assessed.

## Verification and preservation

- Whole-bank review used all 116 current questions, 151 immutable versions, nine draft guides, writing/practice/model material, all existing source sets and equivalent-skill/outcome mappings. The full corpus was re-read unchanged immediately before staging. [Comparison and rework matrix](english-7-unit-01-bcd-whole-bank-review.md).
- Ten questions were revised before first production v1 to address repeated scenarios, missing context or legitimate answer alternatives. No old question, key, approval or historical revision was overwritten.
- Offline validation passed **164 actual SQL grading cases**, 402 stable-choice-order checks, all 84 exact accepted slot bindings, 12 source memberships and grouped presentation orders. Correct/alternative answers, partial credit, blanks and malformed responses were checked. Earlier unchanged 169/57/95-case content evidence was hash-verified and reused. [Validation](evidence/english-7-unit-01-assessment-batch-bcd-validation-20261022.json).
- The actual deployed-source `evaluateQa` implementation was run with materialized rows and the existing English item corpus: **60 passed, 24 source-held**, with no other blocking errors. Automated QA records use `run_by=null`; this is not an authenticated human review or an approval.
- A guarded rollback rehearsal preceded commit. The transaction inserted exactly **789 rows** across eight authoring tables. Exact readback verifies all imported fields, all 84 immutable snapshots, keys and private review contexts. Every prior row in 71 guarded tables is preserved; 63 tables are wholly unchanged, including policy bindings, source assets and learner state. [Transaction](data/english-7-unit-01-bcd-review-onboarding-20261022.sql) · [Production evidence](evidence/english-7-unit-01-bcd-review-onboarding-20261022.json).

This slice changes governed English content, not shared core behavior. No frontend, Edge bundle, schema, runtime policy implementation or learner allocation changed. The private repository stores the protected packet; Vercel serves only `web/`, so the authoring documents are not shipped as public assets. C12's exact runtime deployment evidence, 87 native Chromium cases and 324-check authenticated production acceptance are reused for unchanged code. Required CI and the persistent Vercel release check remain in force for the batched merged revision. No fresh owner browser session, new-recording playback or assessed-English learner acceptance is claimed.

## Next capability slice

Review the 60 QA-ready new questions and the six exact reading passages. After source acceptance, register the passages and refresh the 12 linked question versions/QA. Produce the six recordings from the supplied scripts; then verify bytes, rights, speaker alignment, full listening quality, private delivery and the 12 listening links before ordinary question approval. Guides/writing onboarding can proceed as a later bounded slice while recording work is pending. Final scoring/workload, formal curriculum reconciliation, SME/exposure/form qualification and authenticated learner release acceptance remain separate gates.

The immutable authoring packet retains its original pre-import draft fields as provenance. The current status register, accepted manifest's current inventory and production onboarding evidence describe the staged state. Notion synchronization must use the exact merged source and preserve native child pages; prepared local edits do not constitute sync.
