# Project status register

**Updated:** 2026-10-12 (Asia/Yerevan) · **Documentation reconciliation:** complete · **Roadmap:** 3.49

This is the authoritative record of **current delivery status and unresolved gates**. The [roadmap](sprint-roadmap.md) defines scope and sequence; the [backlog](backlog.md) contains implementation checklists; dated sprint reports and evidence files preserve what was known at each checkpoint. README and Notion are secondary summaries. A Notion copy is current only after its merged source-commit stamp and content have been verified; prepared edits are not a completed sync. Historical “pending” statements are not current blockers when a later evidenced disposition is recorded here.

Completion describes the stated scope only. Technical completion, owner-approved sequencing closure, content approval, pilot authorization and production release are separate decisions. No documentation update changes runtime authorization or a stored release gate.

## Delivery status

| Stage | Current disposition | Evidence and remaining boundary |
| --- | --- | --- |
| 0–10.5 | Complete for their technical delivery scope | Foundation, curriculum slice, learner/teacher/content/admin workflows and redesign delivered. Later [Sprint 11 technical handoff](sprint-11-technical-handoff-report.md) verifies the integrated result. External SME review and a formal school cohort were not completed by these stages. The 10.5 browser deferral was dispositioned in 11F. |
| 11 | Complete — technical handoff | [Handoff report](sprint-11-technical-handoff-report.md), [11F](sprint-11f-closed-pilot.md), [11K](sprint-11k-curriculum-versioning-provenance-release-gates.md). Recorded browser limitations were accepted as limitations, not passing tests. Human feasibility execution belongs to 11.5. |
| 11.5 | Closed — one-adult feasibility run | [Closure report](sprint-11-5-pilot-closure-report.md): eight prospective sessions; historical Diagnostic excluded. This is not a formal school cohort or psychometric validation. |
| 12 | Complete — readiness work and deferred/no-change calibration disposition | [Calibration record](sprint-12-learning-model-calibration.md), [decision protocol](sprint-12a5-calibration-decision-protocol.md). Insufficient evidence for tuning; no successor parameters approved. |
| 12.5 | Complete — 12.5A–Z | [Final closure](sprint-12-5-closure-report.md#final-closure--2026-09-23): lifecycle branches, persisted MCQ presentation, desktop and 390/430 px authenticated learner/teacher checks. [Mobile browser QA #2](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35866315244) passed on `0c56fa8ba0bc79d88af85cf2583ceeeb2fb206d2`. |
| 13 | Closed for sequencing by owner; production release gate open | Owner directed Sprint 14 to proceed, as recorded in the [roadmap stage ledger](sprint-roadmap.md). Chapter I remains `pilot`; external Physics SME approval remains pending. Sequencing closure does not confer standards-verified production status. |
| 14 | In progress — one live acceptance dependency remains | [Read isolation](sprint-14-authenticated-isolation.md): 54/54; [action acceptance](sprint-14-authenticated-actions.md): 141/141; [14D analytics](sprint-14d-school-performance-analytics.md): 10/10. Live switching between two authorized learning contexts remains blocked until a second release is authorized. |
| 15A | Complete — content/hint authoring foundation | [Implementation and acceptance](sprint-15a-content-hint-authoring.md). This does not approve every subsequently authored question or guide. |
| 15B / 15 | In progress — Chapter II authoring; Chapters III–VI not yet modeled | [Option B decision](chapter-ii-option-b-and-s02-expansion.md), [completed coverage audit](chapter-ii-coverage-feasibility-audit.md), dated inventory below. Chapter II is draft, inactive and unallocated. |
| 15B.12 | A–D deployed; E isolated acceptance complete; live E open | [Acceptance boundary](sprint-15b12e-acceptance.md) and [API contract](api-contract.md). Governed runtime/navigation/analytics and deployed parity are verified; live learner switching shares Sprint 14's second-release dependency. |
| 16, 16.1–16.4 | Planned | Physics course integration, three other subject slices, then four-subject integration; scope in the [roadmap](sprint-roadmap.md). |
| 16.5 | Planned — required before 17 | Student dashboard design/usability acceptance remains separate from the completed 10.5 redesign. |
| 17 | Planned — formal school MVP pilot | Requires 16.4 integration and 16.5 design/usability acceptance. The one-adult feasibility run does not close it. |
| 18 | Planned — production hardening and centralized localization | Natural Armenian is already a release policy; the centralized localization architecture is still planned. |
| 18.5 | Approved design; implementation, migration and acceptance pending | [Rollover policy](academic-year-rollover-localization-policy.md), final decisions dated 2026-10-05. The summary reconciliation is complete; the feature is not deployed by this documentation change. |
| 19–26, including 24.5 | Planned | Scope and order remain in the [roadmap](sprint-roadmap.md). No beta, national-scale readiness or later workflow closure is inferred from earlier technical work. |

## Reviewer approval repair — 2026-10-11

The owner reported that **Հաստատել** remained unavailable after QA. Live records confirm four passing runs for S02-M02, including two on saved v2; no approval request or review was recorded in the incident window. The shared dashboard issued whole-bank UUID filters around 15 KB, retried its related reads four times, and ignored their errors. The correction bounds requests, paginates complete results and fails visibly instead of treating unavailable QA as missing. The editor preserves refresh errors after QA/save/approval. [Incident, regression and deployment evidence](reviewer-approval-repair-20261011.md). The server correction is deployed as dashboard v7 with exact bundle readback and JWT verification enabled. Signed-in production observation confirmed the same saved v2 changed from “QA not run” / disabled approval to “QA passed” / enabled approval after one refresh, without rerunning QA or approving the item. Final CI #1347 passed all five jobs, including 1,247 Node and 65 native Chromium tests. Production served merged commit `7036dd00e9136053d9cc8f2766fa923895498f20`; both changed frontend files matched that source byte for byte, and main-branch CI passed all five jobs. No question was approved by the repair; the owner's subsequent reviews are verified below.

## Chapter II inventory

Read-only production verification: **2026-10-12 15:36:37 UTC** (19:36 Asia/Yerevan). All **152 current question versions have matching human content approvals**, all **210 definitions are active**, and all **57 guides are published**. Batch 17's four questions are approved at staged v1 with passing current-version QA; its five definitions match their human-approved snapshots. No content is pending. [Review closure evidence](evidence/sprint-15b13-batch-17-review-complete-20261012.json). This verification created no production write, approval or duplicate QA.

| Purpose | Authored | Published / content-approved | Draft / needs review | Target | Unauthored |
| --- | ---: | ---: | ---: | ---: | ---: |
| Practice / Review | 96 | 96 | 0 | 96 | 0 |
| Diagnostic | 18 | 18 | 0 | 32 | 14 |
| Protected Mastery | 38 | 38 | 0 | 64 | 26 |
| Total | 152 | 152 | 0 | 192 | 40 |

All four completed bounded manifests are content-approved. The unchanged 192 target leaves **40: 14 Diagnostic and 26 Mastery**. Approved Mastery reserves are S02/S03/S04: five each; S05/S06/S07/S08: four each; S09: seven. Counts do not certify protected eligibility or disjoint retake reserves. The 96 Practice questions include declared rehearsal variants, not 96 independent reasoning paths.

**Next four-candidate batch authorized by “Proceed” — 2026-10-12 19:34:33 Asia/Yerevan.** Following the agreed batch size and smallest-reserve priority, Codex selected one Mastery candidate each for S05, S06, S07 and S08. John directed continuation; these skill names are the operational selection, not a quoted owner list. [Batch 18 manifest](chapter-ii-bank-plan-checkpoint.md#fifth-authorized-manifest--batch-18). Qualification remains subject to the full source/comparison/protection criteria. No Batch 18 drafts are staged at this authorization checkpoint, and no general future-batch exception is created.

The candidate release remains draft, inactive and unallocated, with zero assessment-pool or form memberships. Human review for new drafts, external SME/exposure review, empirical equivalence, allocation and release remain separate gates.

Selected Option B delivers **16 Diagnostic and 16 Mastery questions**, two per each of eight skills. Mastery requires **13/16 and at least one correct per skill**. All eight skills participate in initial readiness. The 192-question bank target is not a per-student session length or proof that sufficient distinct, source-supported questions exist. Numeric readiness/model parameters, ordinary governed bindings and release approval remain separate.

## Open gates and follow-ups

| Gate | Current state and required next evidence |
| --- | --- |
| Chapter I production release | External Physics SME review/sign-off remains outstanding. Preserve provisional validation and pilot provenance; perform the applicable current-source, security/privacy, deployment and release-day checks before promotion. Internal owner review does not substitute for external SME review. |
| Calibration | Deferred/no change under `physics7-u01-feasibility-2026-09-21-deferred`. New eligible evidence and an authorized decision are required before parameter changes. |
| Sprint 14 / 15B.12E live switching | Needs a second independently authorized curriculum release and authenticated multi-context acceptance. Do not activate Chapter II merely to close a test dependency. |
| Chapter II completion and release | Batch 14–17 human content review is complete. Assess the next authorized four-candidate Batch 18 across S05/S06/S07/S08 and stage only qualifying drafts. Complete subsequent human review, defensible reserves, exposure/separation, allocation, policy/model binding, SME, pilot and release gates. Reserve alternatives remain unadopted. |
| Recorded editorial work | S09-I06 embedded distractor/guide overlap, S09-M01 duplicated `ևև` / `։։`, and S09-I08 guide `բանաձը` → `բանաձևը` remain for the versioned correction/review workflow. Preserve prior approvals and evidence. S02-M01 retention was decided by the owner and is not an open omit/revise decision. See [batch 08 follow-ups](chapter-ii-assessment-batch-08.md). The current reviewer-edited S08-M02 v2 also contains two consecutive formulations of distractor A; record a versioned correction/review without overwriting its approval ([batch 11](chapter-ii-assessment-batch-11.md)). |
| Formal school pilot | Sprint 17 remains planned after 16.4 and 16.5; earlier feasibility and isolated QA do not satisfy this gate. |
| Rollover | Design approved, documentation aligned, implementation/migration/concurrency/two-school/browser acceptance still pending in 18.5. |

## Rollover disposition

The [detailed policy](academic-year-rollover-localization-policy.md) governs implementation. The Headmaster authorizes subjects, approves student progression and activates the year; teachers create subject classrooms **after activation**, using fixed subject/grade/uppercase Latin A–E selectors. Setup years are not open to teacher creation. Missing target subject classrooms can leave delivery pending and do not themselves block activation. The system records assignments and enrolls only eligible, approved placements when all delivery dependencies are valid. Competing ordinary same-subject classroom claims go to the Headmaster conflict page. Accounts persist; the year switch fences outgoing academic writes and preserves read-only history. No routine Headmaster allocation of teachers to grades/classes is introduced.

The former roadmap/Notion “rollover-summary reconciliation outstanding” task is **closed by this documentation reconciliation on 2026-10-10**. Historical entries retain their dated context. This does not close Sprint 18.5 implementation or authorize unreviewed legacy mappings.

## Maintenance rule

Update this register first when delivery status, a gate or a current inventory changes. Record the observation date and primary evidence; distinguish implementation, acceptance, owner disposition and release eligibility. In the same change, align affected roadmap/backlog/README/API summaries. Sync Notion to the merged source commit, preserving native child pages and dated evidence. Mark older checkpoints historical and point to the new disposition instead of rewriting past measurements. If evidence is missing or conflicting, record the uncertainty here rather than choosing whichever summary is newer.
