# English 7 Unit 1 — DB / MB / MC delivery

**Sprint 16.1C.15 — six new recordings supplied and technically verified; private upload/registration pending.** All six DB/MB/MC MP3s decode without errors, fit the existing 8 MiB limit and match the complete authored scripts under documented ASR normalization. All twelve question/key mappings are verified. An upload ZIP contains unchanged bytes under the hash filenames required by the existing audio schema, and a disabled six-audio/six-set/twelve-revision plan is prepared. Production still has 200 staged questions, 176 in-app approvals, 188 QA passes and twelve listening-source holds; all 71 table fingerprints match C14. The files are not yet in private Storage, and no new registration, QA clearance, audition, authenticated playback or learner release is claimed. [Audio handoff](english-7-unit-01-bcd-audio-preparation.md) · [Evidence](evidence/english-7-unit-01-bcd-audio-preparation-20261022.json).

**Historical Sprint 16.1C.14 — six accepted reading sources registered; all 12 linked questions pass QA at v2.** John accepted the exact passages and questions. The existing atomic editor attached the sources without changing wording, keys, source families or order. Independent readback verifies 12/12 QA passes and catalog/preview matches; 235 old immutable versions and all 176 current in-app approvals are preserved. The bank remains 60 Practice / 56 Diagnostic / 84 Mastery: 200 staged, 176 approved in-app, 188 QA passed and 12 listening-source holds. The 12 reading questions are owner-accepted in chat and ready for the authenticated reviewer Approve action; no in-app approval is fabricated. Thirteen reading sets and eight working audio sets are registered. English stays draft/inactive. [Reading delivery](english-7-unit-01-bcd-reading-registration.md) · [Acceptance](evidence/english-7-unit-01-bcd-reading-acceptance-20261022.json) · [Evidence](evidence/english-7-unit-01-bcd-reading-registration-20261022.json).

**Historical Sprint 16.1C.13 · 2026-10-22 · authoring and inactive reviewer onboarding complete.** The accepted bank is now fully authored and staged: **60 Practice / 56 Diagnostic / 84 Mastery = 200 questions**. The new batch contains 28 Diagnostic B, 28 Mastery B and 28 Mastery C questions. English remains draft/inactive.

## Where to review

Open the [reviewer page](https://www.haiedu.am/content-review.html), select English Grade 7 / Unit 1 and search `ENG7-U01-DB`, `ENG7-U01-MB` or `ENG7-U01-MC`. All 84 new drafts have private explanations, keys, comparison notes and, where applicable, the full passage or script in question detail. The [readback evidence](evidence/english-7-unit-01-bcd-review-onboarding-20261022.json) contains a direct link for every question.

| Bank | Staged | In-app approved | Current QA passed | Review queue | Source held |
| --- | ---: | ---: | ---: | ---: | ---: |
| Practice | 60 | 60 | 60 | 0 | 0 |
| Diagnostic | 56 | 48 | 52 | 8 | 4 |
| Mastery | 84 | 68 | 76 | 16 | 8 |
| **Total** | **200** | **176** | **188** | **24** | **12** |

Only **twelve listening questions remain source-held**, pending six new recordings and source registration. All twelve reading questions now pass v2 QA with six accepted registered passages. Their owner acceptance is recorded in chat; final ordinary approval must still use the authenticated reviewer action. Sixty other new questions now have verified in-app approval, preserving the earlier 116 approvals. No question wording or answer changed.

The misconception-mapping warning remains non-blocking. No inaccurate mapping or authenticated approval record was fabricated. [Reading registration and exact preservation](english-7-unit-01-bcd-reading-registration.md).

## Sources and recordings

The [source review and six recording scripts](english-7-unit-01-bcd-source-review.md) contains all exact text, numbered speaker turns and safe ASCII filenames. Each recording serves two questions in one protected form. The primary factual profiles cover LOOM Weaving, SHABEEG and the Teryan Cultural Center; their claims are paraphrased and source-checked. The other passages and scripts are authored fiction within Unit 1 topics.

Each form retains the accepted distribution: 20 language, four reading and four listening questions, with four shared sources. Every form has 31 response components but **28 questions**, each with maximum one item point. This does not adopt final English scoring weights, readiness, retry rules or empirical form equivalence. The approved C12 runtime already provides two plays per recording per assessment, normal speed, shared question visibility and persistent interruption handling; no further playback-count decision is required. Speaking stays classroom-assessed.

## Historical C13 authoring verification and preservation

- Whole-bank review used all 116 current questions, 151 immutable versions, nine draft guides, writing/practice/model material, all existing source sets and equivalent-skill/outcome mappings. The full corpus was re-read unchanged immediately before staging. [Comparison and rework matrix](english-7-unit-01-bcd-whole-bank-review.md).
- Ten questions were revised before first production v1 to address repeated scenarios, missing context or legitimate answer alternatives. No old question, key, approval or historical revision was overwritten.
- Offline validation passed **164 actual SQL grading cases**, 402 stable-choice-order checks, all 84 exact accepted slot bindings, 12 source memberships and grouped presentation orders. Correct/alternative answers, partial credit, blanks and malformed responses were checked. Earlier unchanged 169/57/95-case content evidence was hash-verified and reused. [Validation](evidence/english-7-unit-01-assessment-batch-bcd-validation-20261022.json).
- The actual deployed-source `evaluateQa` implementation was run with materialized rows and the existing English item corpus: **60 passed, 24 source-held**, with no other blocking errors. Automated QA records use `run_by=null`; this is not an authenticated human review or an approval.
- A guarded rollback rehearsal preceded commit. The transaction inserted exactly **789 rows** across eight authoring tables. Exact readback verifies all imported fields, all 84 immutable snapshots, keys and private review contexts. Every prior row in 71 guarded tables is preserved; 63 tables are wholly unchanged, including policy bindings, source assets and learner state. [Transaction](data/english-7-unit-01-bcd-review-onboarding-20261022.sql) · [Production evidence](evidence/english-7-unit-01-bcd-review-onboarding-20261022.json).

This slice changes governed English content, not shared core behavior. No frontend, Edge bundle, schema, runtime policy implementation or learner allocation changed. The private repository stores the protected packet; Vercel serves only `web/`, so the authoring documents are not shipped as public assets. C12's exact runtime deployment evidence, 87 native Chromium cases and 324-check authenticated production acceptance are reused for unchanged code. Required CI and the persistent Vercel release check remain in force for the batched merged revision. No fresh owner browser session, new-recording playback or assessed-English learner acceptance is claimed.

## Next capability slice

Complete the authenticated Approve action for the twelve owner-accepted reading questions. Produce the six recordings from the supplied scripts, then verify bytes, reuse permissions, speaker alignment, full listening quality, private delivery and the twelve listening links before ordinary approval. Guides/writing onboarding can proceed as the next bounded slice while recording work is pending. Final scoring/workload, formal curriculum reconciliation, SME/exposure/form qualification and authenticated learner release acceptance remain separate gates.

The immutable authoring packet retains its original pre-import draft fields as provenance. The current status register, accepted manifest's current inventory and production onboarding evidence describe the staged state. Notion synchronization must use the exact merged source and preserve native child pages; prepared local edits do not constitute sync.
