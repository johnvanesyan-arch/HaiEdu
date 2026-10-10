# Project status register

**Updated:** 2026-10-10 · **Documentation reconciliation:** complete · **Roadmap:** 3.35

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
| 15B / 15 | In progress — Chapter II authoring; Chapters III–VI not yet modeled | [Option B decision](chapter-ii-option-b-and-s02-expansion.md), [latest batch checkpoint](chapter-ii-assessment-batch-09.md), dated inventory below. Chapter II is draft, inactive and unallocated. |
| 15B.12 | A–D deployed; E isolated acceptance complete; live E open | [Acceptance boundary](sprint-15b12e-acceptance.md) and [API contract](api-contract.md). Governed runtime/navigation/analytics and deployed parity are verified; live learner switching shares Sprint 14's second-release dependency. |
| 16, 16.1–16.4 | Planned | Physics course integration, three other subject slices, then four-subject integration; scope in the [roadmap](sprint-roadmap.md). |
| 16.5 | Planned — required before 17 | Student dashboard design/usability acceptance remains separate from the completed 10.5 redesign. |
| 17 | Planned — formal school MVP pilot | Requires 16.4 integration and 16.5 design/usability acceptance. The one-adult feasibility run does not close it. |
| 18 | Planned — production hardening and centralized localization | Natural Armenian is already a release policy; the centralized localization architecture is still planned. |
| 18.5 | Approved design; implementation, migration and acceptance pending | [Rollover policy](academic-year-rollover-localization-policy.md), final decisions dated 2026-10-05. The summary reconciliation is complete; the feature is not deployed by this documentation change. |
| 19–26, including 24.5 | Planned | Scope and order remain in the [roadmap](sprint-roadmap.md). No beta, national-scale readiness or later workflow closure is inferred from earlier technical work. |

## Chapter II inventory

Read-only production observation: **2026-10-10 10:13:16 UTC**. This replaces current-summary counts, not dated batch snapshots. Approval totals can change as the reviewer continues work. [Captured batch 09 evidence](evidence/sprint-15b13-assessment-batch-09-20261010.json). The owner has deferred unfinished human review and authorized this next draft batch for combined later review. No approval is inferred from that continuation.

| Purpose | Authored | Published / content-approved | Draft / needs review | Target | Unauthored |
| --- | ---: | ---: | ---: | ---: | ---: |
| Practice / Review | 87 | 73 | 14 | 96 | 9 |
| Diagnostic | 3 | 3 | 0 | 32 | 29 |
| Protected Mastery | 15 | 13 | 2 | 64 | 49 |
| Total | 105 | 89 | 16 | 192 | 87 |

There are **122 active and 28 draft misconception definitions**, **32 published and 16 draft guides**, and **zero assessment-pool or form memberships** for Chapter II. The candidate release `physics7_u01_u02_2026_08_14_candidate_r2` is `draft` with no activation timestamp. Publication is content approval, not learner delivery eligibility.

Selected Option B delivers **16 Diagnostic and 16 Mastery questions**, two per each of eight skills. Mastery requires **13/16 and at least one correct per skill**. All eight skills participate in initial readiness. The 192-question bank target is not a per-student session length or proof that sufficient distinct, source-supported questions exist. Numeric readiness/model parameters, ordinary governed bindings and release approval remain separate.

## Open gates and follow-ups

| Gate | Current state and required next evidence |
| --- | --- |
| Chapter I production release | External Physics SME review/sign-off remains outstanding. Preserve provisional validation and pilot provenance; perform the applicable current-source, security/privacy, deployment and release-day checks before promotion. Internal owner review does not substitute for external SME review. |
| Calibration | Deferred/no change under `physics7-u01-feasibility-2026-09-21-deferred`. New eligible evidence and an authorized decision are required before parameter changes. |
| Sprint 14 / 15B.12E live switching | Needs a second independently authorized curriculum release and authenticated multi-context acceptance. Do not activate Chapter II merely to close a test dependency. |
| Chapter II completion and release | Finish source-supported authoring and human review, whole-bank comparisons, protected separation, illustration/source checks, assessment allocation and policy/model binding; satisfy SME, pilot and release gates. No numeric target waives these requirements. |
| Recorded S09 editorial work | S09-I06 embedded distractor/guide overlap, S09-M01 duplicated `ևև` / `։։`, and S09-I08 guide `բանաձը` → `բանաձևը` remain for the versioned correction/review workflow. Preserve prior approvals and evidence. S02-M01 retention was decided by the owner and is not an open omit/revise decision. See [batch 08 follow-ups](chapter-ii-assessment-batch-08.md). |
| Formal school pilot | Sprint 17 remains planned after 16.4 and 16.5; earlier feasibility and isolated QA do not satisfy this gate. |
| Rollover | Design approved, documentation aligned, implementation/migration/concurrency/two-school/browser acceptance still pending in 18.5. |

## Rollover disposition

The [detailed policy](academic-year-rollover-localization-policy.md) governs implementation. The Headmaster authorizes subjects, approves student progression and activates the year; teachers create subject classrooms **after activation**, using fixed subject/grade/uppercase Latin A–E selectors. Setup years are not open to teacher creation. Missing target subject classrooms can leave delivery pending and do not themselves block activation. The system records assignments and enrolls only eligible, approved placements when all delivery dependencies are valid. Competing ordinary same-subject classroom claims go to the Headmaster conflict page. Accounts persist; the year switch fences outgoing academic writes and preserves read-only history. No routine Headmaster allocation of teachers to grades/classes is introduced.

The former roadmap/Notion “rollover-summary reconciliation outstanding” task is **closed by this documentation reconciliation on 2026-10-10**. Historical entries retain their dated context. This does not close Sprint 18.5 implementation or authorize unreviewed legacy mappings.

## Maintenance rule

Update this register first when delivery status, a gate or a current inventory changes. Record the observation date and primary evidence; distinguish implementation, acceptance, owner disposition and release eligibility. In the same change, align affected roadmap/backlog/README/API summaries. Sync Notion to the merged source commit, preserving native child pages and dated evidence. Mark older checkpoints historical and point to the new disposition instead of rewriting past measurements. If evidence is missing or conflicting, record the uncertainty here rather than choosing whichever summary is newer.
