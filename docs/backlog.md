# Product backlog

**Status source:** [Project status register](project-status.md), reconciled 2026-10-19. This file is a scoped implementation checklist, not a second current sprint ledger. Completed technical work is checked below; genuine external/release gates remain open. Later stages and current inventories are in the register; the [roadmap](sprint-roadmap.md) defines their sequence.

## Sprint 0 — Technical foundation
- [x] Repository scaffold
- [x] Initial domain model
- [x] Supabase SQL schema
- [x] Protected answer-key architecture
- [x] Deterministic grading engine
- [x] Mastery engine v0.1
- [x] Recommendation engine v0.1
- [x] Automated tests for core engine
- [x] GitHub repository created
- [x] Supabase project created
- [x] Core schema applied to Supabase
- [x] RLS baseline applied
- [x] Grade/Physics structural seed applied
- [x] `submit-answer` Edge Function deployed
- [x] Run security/performance advisor review (subsequent 11K/preflight evidence; review completion does not imply zero findings)
- [x] Create first authenticated test student
- [x] Insert the first internally reviewed/pilot-eligible Grade 7 Physics skill/item (external SME validation remains open)
- [x] Run live answer -> attempt -> mastery integration test

## Sprint 1 — Grade 7 Physics curriculum slice
- [x] Obtain/map current official Grade 7 Physics programme
- [x] Identify current approved textbook used in pilot class
- [x] Select first unit
- [x] Map official outcomes
- [x] Decompose 5–10 micro-skills
- [ ] Obtain external Physics SME validation of prerequisites (production gate; see register)
- [x] Draft 20–40 deterministic items
- [x] Complete internal content-owner QA (11D)
- [ ] Teacher validation under the external Physics SME/content review gate; internal owner review does not close this requirement

## Sprint 2 — First live learning loop
- [x] Student authentication UI
- [x] Item delivery endpoint/UI
- [x] Answer submission UI
- [x] Attempt history
- [x] Mastery display
- [x] Teacher class matrix
- [x] Reallocate the human pilot to Sprint 11.5 and close its one-adult feasibility scope; formal school-cohort execution remains planned in Sprint 17

Technical completion evidence for the early checklist: [Sprint 11 handoff](sprint-11-technical-handoff-report.md), [11F production workflow](sprint-11f-closed-pilot.md), [11K provenance/advisor hardening](sprint-11k-curriculum-versioning-provenance-release-gates.md) and [11.5 feasibility closure](sprint-11-5-pilot-closure-report.md).

## Sprint 10.5 — Student Experience & Front-End Redesign
**Placement:** after Sprint 10 and before Sprint 11.

**Status: ✅ Complete.** Sprint 10.5F is formally closed. Code implementation, automated QA, CI and production deployment are complete. By product-owner decision, the live authenticated cross-browser/device matrix is deferred to Sprint 11F and is not a blocker for starting Sprint 11. This is an accepted QA deferral, not a claim that the live matrix has already been executed.

**Reference direction:** IXL-inspired information architecture and interaction model, while preserving an original Armenian-platform visual identity and avoiding a pixel/brand clone.

- [x] Create a unified authenticated application shell and navigation.
- [x] Make the student dashboard the post-login landing page.
- [x] Surface active session, recommended next skill, assessment status and chapter progress on Home.
- [x] Build a Physics 7 chapter/topic/skill browser.
- [x] Redesign practice around a focused question card and integrated three-stage remediation.
- [x] Redesign diagnostic as a distinct assessment flow with deferred feedback.
- [x] Redesign Mastery Check locked/ready/active/result states.
- [x] Add a student-friendly Progress page distinguishing diagnostic, practice mastery and verified completion.
- [x] Introduce reusable design tokens/components rather than page-specific styling.
- [x] Complete source-level Armenian-first responsive hardening for desktop, tablet and mobile.
- [x] Complete source-level accessibility hardening: keyboard semantics, focus, contrast, labels and touch targets.
- [x] Preserve existing deterministic grading, mastery, recommendation, session and security semantics.
- [x] Preserve the Sprint 5 practice/remediation freeze regression fix.
- [x] Pass repository CI and production deployment checks.
- [x] Disposition live authenticated browser/device QA: deferred to Sprint 11F by product-owner decision.

Detailed scope: `docs/sprint-10-5-front-end-redesign.md` and `docs/sprint-10-5F-progress-responsive-a11y-qa.md`.

## Sprint 11 — Assessment Integrity, Standards Integrity & Technical Handoff Readiness

**Purpose:** move Grade 7 Physics Chapter I from a technically working prototype to a pilot-ready mastery system whose results are not easily inflated by memorising a small fixed question bank.

**Entry gate:** Sprint 10.5F is formally closed. Sprint 11 may begin. The deferred authenticated cross-browser/device smoke matrix remains required in Sprint 11F before the closed pilot is treated as fully completed. Sprint 11 does not change the deterministic grading/mastery principle; it strengthens the evidence on which mastery decisions are based.

### 11A — Item-bank architecture and exposure model
**Status: ✅ Complete.** Normalized item identity, explicit assessment pools, protected Mastery content, learner-level exposure provenance, help/hint instrumentation, RLS isolation, regression coverage, and live database/Edge Function deployment are in place. Detailed implementation: `docs/sprint-11a-item-identity-exposure-model.md`.

- [x] Introduce explicit item-family / variant identity so the system can distinguish a skill, an item family, a template, and a concrete rendered variant.
- [x] Add assessment-use eligibility metadata for `practice`, `diagnostic`, and `mastery_check`.
- [x] Protect mastery-check content from ordinary practice exposure.
- [x] Add student-level cross-session exposure tracking, including at minimum: item/template/variant seen, times seen, last seen, purpose, correctness, and help/hint use where applicable.
- [x] Preserve attempt history and existing item versioning/retirement semantics.
- [x] Add regression tests proving exposure data cannot leak another student's history.

**Historical 11A bank note — superseded by 11D:** the current 60 fixed items are conservatively backfilled as singleton family/template identities until Sprint 11D content review. For each Chapter I skill, the current baseline split is 4 Practice/Diagnostic-eligible items and 2 protected Mastery-only items. This establishes the integrity boundary now but does **not** solve repetition pressure; Sprint 11B defines exposure-aware selection/cooldowns and Sprint 11C/11D expands the effective variant bank.

### 11B — Repetition and selection policy
**Status: ✅ Complete.** Selection is now cross-session exposure-aware. Practice follows unseen variant → spaced unresolved error → least-recent review → explicit pool-exhaustion fallback. Diagnostic rotates two explicit non-overlapping 20-item baseline forms. Mastery uses the protected pool with unseen-first/least-exposed selection and alternate-retest logic after failure/remediation. Detailed implementation: `docs/sprint-11b-repetition-selection-policy.md`.

- [x] Practice: prefer unseen concrete variants first, then unresolved errors after spacing, then least-recently-seen review.
- [x] Practice: no exact rendered variant repeats inside a session unless the pool is genuinely exhausted and remediation explicitly requires it.
- [x] Practice: introduce an exact-variant cooldown across sessions rather than resetting repetition control whenever a new session starts.
- [x] Diagnostic: stop serving the same deterministic 20-question form on every attempt; rotate parallel forms / least-exposed diagnostic variants.
- [x] Diagnostic: record form/variant exposure and avoid exact-item reuse on an immediate retake when alternatives exist.
- [x] Mastery Check: strongly prefer items/variants the learner has never seen; otherwise choose least recently exposed protected variants.
- [x] Mastery Check: after a failed attempt and required remediation, use an alternate assessment form with minimal overlap with the previous attempt.
- [x] Add explicit pool-exhaustion behavior so the system degrades predictably rather than silently over-serving familiar items.

**Historical 11B capacity boundary — superseded by 11D:** the two Diagnostic forms are structurally non-overlapping but their pedagogical parallelism is still provisional pending Sprint 11D review. The protected Mastery pool currently has exactly 2 items per skill while a full Mastery Check also needs 2 per skill, so a retest can be forced to overlap with the previous form. That overlap is now explicit and auditable (`poolExhausted` / `exactRepeatFallbackUsed`) rather than silent; Sprint 11D must expand the protected pool before overlap becomes exceptional.

### 11C — Parameterised and parallel item variants
**Status: ✅ Complete.** Deterministic seed-based generation is live for safe numerical constructs and explicit parallel-context reasoning tasks. Exact prompt/parameter/answer/fingerprint reproduction is QA-checked, generated candidates enter review state only, and content-admin preview/materialisation remains behind the existing role gate. Detailed implementation: `docs/sprint-11c-parameterized-parallel-variants.md`.

- [x] Add deterministic parameterised templates where educationally safe (for example unit conversions, measurement readings and displacement calculations).
- [x] Store the generated parameters/seed or rendered-variant identity so the exact question shown to the learner is auditable and reproducible.
- [x] Keep answer generation deterministic and server-side; do not rely on live generative AI for routine numerical item creation or grading.
- [x] Build parallel-context variants for reasoning/transfer skills where simple number substitution would not test transfer.
- [x] Ensure variants preserve the same construct and intended difficulty rather than merely changing wording; generated content remains provisional until Sprint 11D human review.
- [x] Add QA rules for invalid/malformed generation, duplicate effective variants and accidental answer leakage.

**Historical 11C proof-set note — superseded by 11D:** 10 active generation templates were live (8 parameterised + 2 parallel). Twenty concrete proof variants across S04, S05 and S07–S10 were materialised in `review` / `needs_review` state, reproduced exactly from template + seed, had distinct semantic fingerprints, and had zero assessment-pool memberships. At this checkpoint they did not count toward the 11D production-bank target until reviewed and approved.

### 11D — Grade 7 Physics Unit 1 bank expansion and content QA

**Status: ✅ Complete.** All 180 new Chapter I candidates completed current-version technical QA and human content review, then passed the controlled activation gate. Production now contains exactly 24 pilot-eligible unique variants per skill / 240 across Chapter I. Active pool capacity is 12 Practice + 4 Diagnostic + 8 protected Mastery variants per skill: 120 / 40 / 80 across the chapter. Diagnostic A/B v1 are retired; reviewed v2 forms are active with 20 items each, 2 items per skill, and zero exact overlap. `provisional_no_sme_review` remains explicit until actual Physics SME validation. Detailed implementation: `docs/sprint-11d-item-bank-expansion-content-qa.md` and migration `0032_sprint_11d_activate_reviewed_bank.sql`.

**Numeric bank target:** Chapter I contains **at least 24 effective, unique concrete variants per skill — 240 across the 10 skills**. The per-skill active capacity is **12 Practice variants + 4 Diagnostic variants (two 2-item forms) + 8 protected Mastery variants**. More than 24 variants per skill remains allowed where future construct coverage requires it; 24 is the acceptance floor, not a hard maximum.

- [x] Re-audit all 60 existing Unit 1 items against the 10 micro-skills, intended layer, misconception and difficulty.
- [x] Remove remaining `unspecified` item-family metadata where a defensible family can be assigned.
- [x] Expand each skill to at least 24 **pilot-eligible** effective unique variants using reviewed fixed items, parameterised variants and parallel scenarios.
- [x] Ensure each skill has at least 12 Practice-eligible effective variants so an 8-item practice session can normally complete without forced exact repetition and still preserve cooldown headroom.
- [x] Create at least two usable diagnostic forms for Chapter I with 2 distinct items per skill per form; the per-skill Diagnostic capacity floor is 4 reviewed variants.
- [x] Create at least 8 protected Mastery variants per skill, sufficient for multiple unseen-first / low-overlap attempts.
- [x] Keep factual/knowledge items proportionate so reasoning and transfer are not crowded out by recognition questions; human content review is complete for the activated bank.
- [x] Retain the current `provisional_no_sme_review` warning until Physics SME validation actually occurs; do not label provisional content as teacher-validated.
- [x] Run technical QA and human content review before any new item/variant becomes pilot eligible or counts toward the 24-per-skill target.

### 11E — Pilot analytics and item-quality evidence
**Status: ✅ Complete.** Item/variant operational evidence, integrity monitoring, content-admin visibility, repeat/memorisation signals, abandonment indicators, and provenance-aware historical evidence are live. Metrics are explicitly labelled as pilot operational evidence rather than validated psychometrics. Detailed implementation: `docs/sprint-11e-pilot-analytics.md`.

- [x] Capture per-item/variant operational statistics needed for later review: exposure count, correctness rate, response time where available, hint/help use, purpose, and omission/abandonment where meaningful.
- [x] Add content-admin visibility for high-exposure, unexpectedly easy/hard, frequently missed, or suspicious items.
- [x] Do not treat small-pilot statistics as validated psychometrics; label them as pilot evidence only.
- [x] Support item revision/retirement/replacement without losing historical attempt provenance.
- [x] Add a basic assessment-integrity report showing exact-repeat rates and protected-pool usage.

### 11F — Closed Grade 7 Physics Chapter I technical handoff readiness
**Status: ✅ Complete for Sprint 11 technical handoff.** Technical preflight and the rendered browser-production gate are complete. 11F.2 used real rendered production browser runs with authenticated student and teacher profiles. Four authenticated repetitions — tablet/phone viewport, keyboard-only focus traversal, 200% zoom, and Firefox/Safari-class browser — were not executable with the available automation controls and were explicitly accepted by the product owner on 2026-09-16 as QA limitations rather than PASS results. The finite production-workflow closure punch-list was subsequently completed or explicitly dispositioned in the [Sprint 11 handoff report](sprint-11-technical-handoff-report.md). Human cohort execution and real-user feedback are deferred to Sprint 11.5. Detailed execution plan: `docs/sprint-11f-closed-pilot.md`.

- [x] Complete automated/source, live-database, active-bank, diagnostic-form, security/RLS and session-collision preflight QA; fix blocking defects discovered by that gate.
- [x] Execute/disposition the deferred authenticated browser/device QA matrix from `docs/pilot-browser-qa-checklist.md`; rendered student/teacher desktop checks passed and the four remaining authenticated tool-coverage gaps have explicit product-owner acceptance.
- [x] Complete or explicitly disposition the finite production-workflow residuals: teacher evidence verification, legitimate Mastery-path disposition, suspension/session revocation, privacy-preference behavior, and safe deletion-request workflow.
- [x] Complete 11G Mathematics placeholder/isolation QA and 11H two-subject/staff-surface containment QA.
- [x] Produce a Sprint 11 **technical handoff report** recording implemented capability, accepted limitations, unresolved non-handoff blockers, and safe tester handoff conditions.
- [x] Preserve the 11L pilot governance gates in a fail-closed state; do not represent technical handoff readiness as a completed human pilot.

**Deferred to Sprint 11.5:** participant/guardian authorization where applicable, real tester/cohort enrollment, observed learner behavior, teacher/student feedback, repetition/exposure review from authorized real-user evidence, item-level pilot review, and the formal pilot/test report used for Sprint 12 calibration.

### 11K — Curriculum Versioning, Provenance & Release Gates
**Status: ✅ Complete.** Detailed implementation: `docs/sprint-11k-curriculum-versioning-provenance-release-gates.md`.

- [x] Add immutable curriculum-release identity and source/reconciliation fingerprints.
- [x] Freeze unit, outcome, skill and item-family mappings per release.
- [x] Freeze assessment blueprints and exact item/version membership.
- [x] Bind sessions, attempts, exposure events and mastery to a release.
- [x] Preserve pre-11K evidence as explicit legacy provenance.
- [x] Scope learning-engine reads and item selection to the current release/blueprint.
- [x] Expose provenance, gates and blueprints to content admins.
- [x] Enforce pilot and production activation gates.
- [x] Apply RLS, governance write boundaries and advisor hardening.
- [ ] Record external Physics SME approval before production promotion.

### Sprint 11 exit criteria — technical handoff readiness
Sprint 11 is complete only when all of the following are true:

- [x] Cross-session exposure tracking is live and covered by tests.
- [x] Practice no longer depends on six fixed questions per skill and can normally complete a bounded session without forced exact repetition.
- [x] Diagnostic uses parallel/rotating reviewed forms instead of the same fixed form on every attempt.
- [x] Mastery Check uses protected unseen-first / least-exposed selection and alternate retest logic, backed by 8 protected variants per skill.
- [x] Parameterised items are deterministic, reproducible and auditable where used.
- [x] Unit 1 content has completed the agreed technical/human QA gate; provisional SME status remains explicit until actual SME review.
- [x] Deferred authenticated browser/device QA has been executed where supported; the four remaining authenticated browser-control limitations have explicit accepted disposition and are not represented as passing tests.
- [x] 11F production-workflow residuals are PASS or explicitly dispositioned.
- [x] 11G final Mathematics placeholder/isolation QA is PASS or explicitly dispositioned.
- [x] 11H remaining two-subject/staff-surface containment QA is PASS or explicitly dispositioned.
- [x] 11L evidence classification and fail-closed pilot controls remain intact and no false claim is made that a human pilot has run.
- [x] Critical technical, privacy, security, curriculum or scope defects are resolved or explicitly accepted for handoff.
- [x] A Sprint 11 technical handoff report records safe tester conditions and accepted limitations.

**Sprint 11 status:** ✅ Complete for technical handoff readiness. Consolidated evidence: `docs/sprint-11-technical-handoff-report.md`.

**Non-goal for Sprint 11:** completion of the human pilot or psychometric validation of mastery cut scores. Current thresholds remain provisional engineering defaults until sufficient authorized empirical evidence exists.

### Sprint 11.5 — Controlled External Tester Pilot
**Status: ✅ Closed 2026-09-21 — one-adult feasibility confirmed; calibration tuning deferred; no parameter change.**

- [x] Name the operational participation-authorization owner.
- [x] Approve participant/guardian information and authorization workflow where applicable.
- [x] Define tester/cohort scope, dates, teacher scope, identity minimization, withdrawal, suspension and deletion handling.
- [x] Enroll only authorized testers/participants on the exact target release.
- [x] Observe the Diagnostic → Practice → Mastery lifecycle.
- [x] Collect teacher/usability evidence.
- [x] Review repetition/exposure behavior and item/content defects.
- [x] Review standards-alignment observations and operational defects.
- [x] Produce the formal pilot/test report.
- [x] Decide whether the evidence is sufficient for Sprint 12 calibration.

One adult tester produced eight eligible prospective sessions: seven Practice sessions and one passed Mastery Check. The pre-authorization Diagnostic remains excluded, so the full lifecycle is accepted only with that explicit limitation. The pilot report was approved, all five closure gates passed, and the immutable calibration disposition is `deferred`. See `docs/sprint-11-5-pilot-closure-report.md`.


## Sprint 12 — Learning-Model Calibration
**Status: ✅ Complete — 12A readiness complete; 12B reviewed and closed with a deferred/no-change disposition.**

### 12A — Calibration Readiness
- [x] Inventory deployed mastery, recovery, diagnostic, recommendation, practice and Mastery Check constants.
- [x] Confirm current exact-release QA activity is not formal calibration evidence.
- [x] Identify first cross-surface consistency defect: dashboard recent recovery currently ignores hint use while session/mastery eligibility requires independent correct answers.
- [x] Fix the hint-aware recent-recovery inconsistency and add regression coverage.
- [x] Implement Hinting & Remediation v2 foundation: template-aware progressive scaffolding, safe parameter interpolation, skill fallback, enriched telemetry, and task-specific coverage for 8 parameterized templates / 80 published variants.
- [x] Freeze/name the post-fix baseline model configuration as immutable `haiedu_core_learning_model` / `baseline-2026-09-20-r1`.
- [x] Define and audit the immutable formal calibration evidence contract; operative version is `contract-2026-09-20-r2` with metric-specific eligibility and exact model provenance.
- [x] Define and audit immutable calibration metrics; operative version is `metrics-2026-09-20-r2`, with learner-cluster-aware reporting, right-censoring, expanded hint analysis and no universal sample-size threshold.
- [x] Close the recommendation-event telemetry gap prospectively; add exact session model provenance and immutable remediation-guide provenance.
- [x] Build and closure-audit provenance-aware read-only calibration analysis views/queries (12A.4), including immutable pilot binding, full r2 entry-state enforcement, actual 4/5 recovery events and analysis-ready metric outputs.
- [x] Define and enforce the parameter-change decision/versioning protocol (12A.5): immutable protocol/decision records, learner-aware evidence snapshot, explicit approve/reject/no-change/defer outcomes, and validated approved-successor model versioning.

### 12B — Empirical Calibration
- [x] Review formal Sprint 11.5 evidence sufficiency.
- [x] Determine that one learner, no prospective Diagnostic and inherited learner state are insufficient for tuning.
- [x] Record immutable `deferred` decision `physics7-u01-feasibility-2026-09-21-deferred`.
- [x] Confirm no candidate/approved model configuration and no parameter change.
- [x] Preserve the frozen baseline and historical interpretation.

Informal external question/content review may continue without a deadline, but that reviewer activity is QA/context only and must not be used to fit or justify model parameters.

Detailed plan: `docs/sprint-12-learning-model-calibration.md`.

Methodology audit corrections: `docs/sprint-12a-methodology-audit-corrections.md`.

12A.5 decision protocol: `docs/sprint-12a5-calibration-decision-protocol.md`.


## Sprint 12.5 — Universal Chapter Review & Mastery-Retry Lifecycle
**Status: ✅ Complete — 12.5A–Z, closed 2026-09-23.** Lifecycle branches and authenticated desktop/mobile QA passed; see the [final closure evidence](sprint-12-5-closure-report.md#final-closure--2026-09-23). Sprint 13 is closed for sequencing; its external SME production gate remains open in the [status register](project-status.md).

- [x] 12.5A: create immutable platform-level Chapter Mastery & Review policy versions.
- [x] 12.5B: implement the server-authoritative chapter mastery state machine.
- [x] 12.5C–D: add first-class Chapter Review sessions, requirements and qualifying retry gates.
- [x] 12.5E–F: add Review cycles, rotational selection and full selection provenance.
- [x] 12.5G–I: enforce pass/final-failure behavior and prohibit Attempt 4.
- [x] 12.5J–K: implement natural Armenian learner states and Review experience.
- [x] 12.5L–M: add teacher Review analytics and expose Review-specific attention inputs without inventing ungoverned thresholds.
- [x] 12.5N–O: isolate Review evidence and integrate lifecycle-aware recommendations.
- [x] 12.5P–Q: enforce transactional attempt integrity and protected assessment exposure.
- [x] 12.5R–S: integrate Hinting v2 and Review coverage analytics.
- [x] 12.5T–W: complete normalized schema, RLS, historical migration and reporting invariants.
- [x] 12.5X–Y: API/race/security/CI/deployment checks, required-Review/retry/final-failure lifecycle branches, authenticated desktop and learner/teacher mobile checks at 390/430 px passed. Mobile browser QA #2 on `0c56fa8` supplies the final mobile evidence.
- [x] 12.5Z: persist session-item MCQ presentation, resolve displayed keys server-side and preserve historical evidence; final closure records assessment-integrity acceptance.

Detailed specification: `docs/sprint-12-5-universal-chapter-review-mastery-retry.md`.

## Chapter VI preparation and execution — 15F.1–15F.5, 2026-10-19 Asia/Yerevan

- [x] Verify the approved *Ֆիզիկա 7* Chapter VI scope (§§40–55, printed pp.118–163) and current programme Theme 6 source identity.
- [x] Map 11 mandatory and four additional outcomes to 16 proposed skills without importing later-grade fluid mechanics.
- [x] Prepare a provisional 242-slot ceiling (146 Practice/38 Diagnostic/58 Mastery) and three large batches of 70/90/82.
- [x] Prepare 33 candidate briefs with separate Armenian/physics/hint boundaries.
- [x] Record five separately governed practical activities and the owner’s knowledge-only gas-buoyancy scope decision; no separate learner or teacher-observed procedure is planned.
- [x] Extract and visually inspect nine exact textbook crops for teaching-exposed Practice/reference use only.
- [x] Add and visually inspect the exact p.123 manometer and p.147 piston-pump crops required by Batch 2 Practice items; keep all eleven source crops out of protected assessment use.
- [x] Verify source hashes, outcome coverage, totals, batch partition, asset hashes and zero-write production catalogue; pass 19/19 planning checks.
- [x] Record owner acceptance of the 16-skill map, 242-slot ceiling, 70/90/82 split, S13/S14–S16 Practice-only non-gating roles and five practical records.
- [x] Create the inactive governed U06 foundation with six topics, 15 outcomes, 16 skills, 24 mappings and a never-activated draft release; verify rollback and guarded commit across 63 public tables.
- [x] Freeze the complete related bank, assess all 70 Batch 1 candidates and complete the within-batch comparison; rework four close drafts before staging.
- [x] Stage 70 draft questions (44 Practice/10 Diagnostic/16 Mastery), 44 guides and 44 definitions; pass exact deployed-source QA at 70/70 and 44/44 with zero errors or warnings.
- [x] Freeze the post-Batch-1 complete bank, assess all 90 Batch 2 candidates and all 4,005 within-batch pairs, and resolve close/ambiguous drafts before staging.
- [x] Stage 90 Batch 2 drafts (54 Practice/14 Diagnostic/22 Mastery), 54 guides and 56 definitions; pass exact deployed-source QA at 90/90 and 54/54 with zero errors or warnings.
- [x] Rehearse rollback across all 63 governed tables, commit only the fourteen planned content-table deltas plus 90 technical-QA rows, and verify all ten Batch 1 catalogue projections unchanged.
- [x] Freeze the post-Batch-2 complete bank, assess all 82 Batch 3 candidates and all 3,321 within-batch pairs, and rewrite the two substantive near-duplicates before staging.
- [x] Stage 82 Batch 3 drafts (48 Practice/14 Diagnostic/20 Mastery), 48 guides and 58 definitions; pass exact deployed-source QA at 82/82 and 48/48 with zero errors or warnings.
- [x] Rehearse rollback across all 63 governed tables, commit only the planned content deltas plus 82 technical-QA rows, and verify that all pre-existing rows are preserved.
- [x] Verify ordinary approval for 233 current question versions; preserve the nine owner-selected image-corrected v2 questions as a separate exact-version review queue.
- [x] Rehearse and commit the guarded nine-item v2 correction while preserving options, keys, explanations, hints, misconception mappings and all v1 snapshots.
- [x] Add the nine replacement images at versioned `-v2.png` paths and refresh the substantive comparison for clarified `PHY7-U06-S13-I05`.
- [ ] Verify all nine deployed production assets byte-for-byte, record the nine v2 technical-QA rows, and complete exact-version review for those nine questions.
- [ ] Publish/review the 146 guides and approve/review the 158 misconception definitions.
- [ ] Propose and approve any later Chapter VI assessment contract, qualification, allocation, activation and learner release under separate evidence and authorization; do not infer them from the planning budget.

[Chapter VI map](chapter-vi-preparation.md) · [Image corrections](chapter-vi-image-corrections.md) · [Batch 1 comparison](chapter-vi-batch-01-comparison.md) · [Batch 1 staging](chapter-vi-batch-01-staging.md) · [Batch 2 comparison](chapter-vi-batch-02-comparison.md) · [Batch 2 staging](chapter-vi-batch-02-staging.md) · [Batch 3 comparison](chapter-vi-batch-03-comparison.md) · [Batch 3 staging](chapter-vi-batch-03-staging.md) · [Foundation evidence](evidence/chapter-vi-foundation-20261019.json) · [Correction evidence](evidence/chapter-vi-image-corrections-20261019.json).

## Chapter V authoring, review closure and contract — 15E.1–15E.6, 2026-10-19 Asia/Yerevan

- [x] Verify Chapter V textbook §§32–39, current programme Theme 5 and unchanged source hashes.
- [x] Map four mandatory/two additional outcomes to ten proposed skills; preserve all component claims.
- [x] Prepare the 152-slot provisional budget (88/24/40), three large batches (54/54/44) and 20 unassessed briefs.
- [x] Draft two separate laboratory-performance rubrics and natural Armenian hint/physics boundaries.
- [x] Extract and visually verify five exact source images with provenance and alt text.
- [x] Verify read-only catalogue, source crosswalk, totals, asset hashes and document alignment; save planning evidence.
- [x] Record John’s plan acceptance; create the governed inactive foundation (10 skills/six outcomes).
- [x] Freeze the exact full current/history/guide corpus and assess all 54 Batch 1 proposals, including 1,431 within-batch pairs.
- [x] Stage 37 defensible questions, 32 guides and 35 definitions; pass exact-source technical QA and preserve earlier records.
- [x] Act on John’s 2026-10-19 request to keep the themes and change the tasks of exactly 17 held proposals; record the new bounded Chapter V rework manifest under unchanged parallel criteria.
- [x] Rework and stage all 17 (7 Diagnostic/10 Mastery), with 19 new draft definitions, refreshed full-bank comparison, exact-source QA 17/17 and preserved prior records. One first-rework draft was replaced again after a Chapter III collision. No new independent reasoning or qualified capacity claimed.
- [x] Assess 54 Batch 2 proposals against the complete frozen current/history/guide corpus; rework three and hold five repeated proposals. Stage49 questions,28 guides,29 definitions; pass49/49 question and 28/28 guide technical checks.
- [x] Verify existing authenticated ordinary approvals: 152 unchanged current-v1 questions, 88 published guides and 108 active definitions; exact approval/QA/snapshot bindings. No approval was fabricated or written by the audit.
- [x] Act on John’s 2026-10-19 continuation: substantively rework all five held Batch 2 themes (S05-D02; S06-D02/D03/M04/M05), compare and stage them at first database v1. The 152-slot plan is retained.
- [x] Author all 44 Batch 3 slots plus the five bounded reworks in one delivery: 49 questions, 28 guides and 25 definitions; all technical checks pass. Chapter V planned authoring is complete at 152 questions.
- [x] Complete authorized authoring and current-version technical QA for all retained batches.
- [x] Prepare four Chapter V policy contracts and five conditional forms: D12/P8/M12/R12, 10/12 plus eight required-skill minima, three Mastery attempts; 60 disjoint approved versions and four retained Mastery items.
- [x] Pass four JS validations, four live read-only SQL scope checks and five scoring cases; verify all 59 tracked table fingerprints unchanged.
- [x] Reconcile stale Chapter V current checkpoints in status/roadmap and align API/README/preparation summaries; preserve historical staging evidence.
- [x] Owner adopts the exact Chapter V contract and knowledge-only provisional pilot, deferring specialist/exposure review and performed laboratory assessment (2026-10-19).
- [x] 15E.6: guarded rollback restores all 59 table fingerprints; activate the authorized pilot and verify 458 exact configuration rows, 61 preservation scopes and unchanged earlier chapters.
- [x] 15E.6: verify authenticated production access/reporting/chapter switching on reviewed main (191/191; isolation 54/54) and save evidence; all 59 tables unchanged.
- [x] Align closure documentation and retain the production acceptance and separate database-preservation evidence.
- [x] Sync Notion to the merged 15E.6 closure source and save the verified readback receipt; all 11 native child pages are preserved. [Sync receipt](evidence/chapter-v-notion-sync-20261019.json).
- [ ] Complete separately governed LAB-LEVER/LAB-INCLINE performed-evidence workflow and independent qualification before any claim of full practical/standards-verified completion.

[15E.5 assessment/practical proposal](chapter-v-assessment-contract-proposal.md).

[Chapter V map](chapter-v-preparation.md) · [Initial Batch 1](chapter-v-batch-01-comparison.md) · [17-proposal rework](chapter-v-batch-01-rework-17.md) · [Batch 2](chapter-v-batch-02-comparison.md) · [Batch 3](chapter-v-batch-03-comparison.md) · [Planning QA](evidence/chapter-v-preparation-qa-20261018.json). Notion synchronization is verified against the merged source separately; the completed preparation tasks do not certify that sync.

## Chapter IV knowledge-only pilot — 15D.6, 2026-10-18

- [x] Record owner approval of the exact contract, five revisions and knowledge-only pilot with specialist review deferred.
- [x] Refresh whole-bank comparison; stage exactly five v2 revisions; preserve earlier versions and approvals.
- [x] Pass saved-content deployed-v11 QA 5/5 and record five ordinary approvals through the authenticated reviewer UI.
- [x] Bind all 83 form members to exact current versions/approvals/QA; exclude 15 held Mastery questions.
- [x] Pass production rollback and activate four contracts, three pools and five forms; verify all 677 inserted configuration rows and 61 preservation scopes.
- [x] Complete reviewed-main production access, reporting and four-chapter switching: 155/155; two-school isolation 54/54.
- [x] Save production acceptance and preservation evidence and align repository closure.
- [ ] Independent specialist/exposure review, performed-experiment workflow and promotion beyond provisional pilot remain deferred.

[Release evidence](chapter-iv-pilot-release.md).

Notion synchronization follows the documentation merge and requires readback of the exact source-commit stamp. Record that receipt with the release evidence; the checked production-verification tasks above do not certify synchronization.

## Historical Chapter IV assessment proposal — 15D.5, 2026-10-18

- [x] Audit all 98 protected candidates against actual primary outcome claims and retained source/comparison evidence.
- [x] Prepare 19-question Diagnostic / 15-question Mastery policy recipes, five conditional forms, and five exact offline revision proposals.
- [x] Account for all protected candidates: 83 conditional form slots and 15 held Mastery items, with no deletion or automatic substitution.
- [x] Validate four policy shapes and five scoring cases using current JS/read-only SQL; preserve all 13 reviewed content/audit tables.
- [x] Obtain the owner's chapter-specific decisions; approved and implemented under 15D.6.
- [x] Complete comparison, v2 QA and ordinary delegated approvals under 15D.6.
- [x] Complete bounded provisional disposition, exact bindings, rollback and authorized activation under 15D.6; independent qualification/exposure review remains deferred.
- [x] Verify production access, reporting and chapter switching under 15D.6 and save the evidence.

[Concrete proposal and trade-offs](chapter-iv-assessment-contract-proposal.md). Historical proposal checkpoint; all five v2 revisions are now saved and approved under 15D.6.

## Chapter IV review closure and next contract — 15D.4R2 / 15D.5, 2026-10-18

- [x] Verify all three batches: 236 approved current-v1 questions with passing QA, 138 published guides and 150 active definitions.
- [x] Verify staged question/guide/definition wording and immutable history are unchanged; preserve prior author comparisons.
- [x] Confirm zero U04 pool/form item allocations and the inactive draft release.
- [x] Prepare the concrete 15D.5 contract proposal above; owner adoption and implementation are recorded under 15D.6.
- [x] Obtain the bounded knowledge-only pilot decision; performed M3/M8 evidence remains unassessed.
- [ ] Complete exact-version qualification/protection/exposure and disjoint allocation, configuration/rollback, release authorization and production acceptance.

[Verified closure](chapter-iv-review-closure.md). No ordinary content review remains; the following earlier checkpoint retains its dated action provenance.

## Historical Chapter IV Batch 1 approval checkpoint — 15D.4R, 2026-10-18 Asia/Yerevan

- [x] Verify unchanged checked content and signed-in reviewer access.
- [x] Approve the 64 remaining question versions through the UI; all 84 Batch 1 questions are now approved with current passing QA.
- [x] Mark all 49 remaining guides reviewed; preserve the one previously published guide.
- [x] Verify 64 new review events, 49 authoring events, unchanged learner content and all 59 preservation scopes.
- [x] Remaining 49 guide publications and 65 definition approvals subsequently completed by the owner and verified under 15D.4R2. The earlier automatic approval-review rejection remains historical; no bypass was attempted.
- [x] Batches 2/3: remaining 152 questions, 88 guides and 85 definitions subsequently approved/published; verified under 15D.4R2.

[Checkpoint](chapter-iv-batch-01-approval.md). Chapter IV remains inactive; final contracts and qualification/release are separate.

## Chapter IV three-batch delivery — 15D.4, 2026-10-18 Asia/Yerevan

- [x] Record the accepted 236-question scope, three batches and owner delegation.
- [x] Create the inactive U04 foundation: one unit, six topics, 13 outcomes, 14 skills and a draft release.
- [x] Complete batch 1: 84 questions, 50 guides and 65 definitions.
- [x] Complete batch 2: 86 questions, 50 guides and 46 definitions.
- [x] Complete batch 3: 66 questions, 38 guides and 39 definitions; 66/66 and 38/38 technical checks pass.
- [x] Compare batch 3 against 791 current questions / 671 immutable versions and complete guide histories; all 28 corpus fingerprints match and 2,145 pairs retain dependencies.
- [x] Verify all pre-existing rows in 59 tracked tables remain unchanged, including 23 review audit rows representing 20 approved questions and one published guide.
- [x] Complete ordinary review across all three batches; the historical 15D.4/15D.4R pending counts are superseded by 15D.4R2.
- [ ] Finalize the chapter-specific assessment/practical contracts and qualification/release under their own authorization.

[Current batch and evidence](chapter-iv-batch-03-staging.md). The 236-slot authoring manifest is fulfilled; draft creation is distinct from approval or learner release. Required CI/merge and exact-source Notion sync close the documentation cycle.

## Chapter IV preparation — 15D.1, 2026-10-17

- [x] Verify the current programme appendix, textbook hash and chapter boundaries; map all 11 mandatory and two additional outcomes.
- [x] Prepare 14 skills, the proposed 236-question budget and 28 candidate briefs for one large feasibility batch.
- [x] Separate actual M3/M8 practical evidence from question interpretation; draft density, Hooke and friction task/rubric outlines.
- [x] Inspect and extract five source figures; record four textbook corrections/exclusions and natural-Armenian/hint rules.
- [x] Save source, read-only catalogue and preparation QA evidence; align repository summaries. Merge/CI and verified Notion synchronization close this documentation cycle.
- [x] Owner accepted the 236-slot plan and delegated ordinary approvals on 2026-10-17; inactive foundation created under 15D.2.
- [x] Supersede the single 28-brief handoff with the explicitly authorized 84/86/66 cadence. Assess and stage the S01–S05 scope in batch 1; the remaining 18 planning briefs belong to batches 2/3.
- [ ] Approve the chapter-specific assessment contract and the practical-evidence scope/workflow; do not import earlier chapter exceptions.
- [ ] Complete ordinary content review, independent source/protection qualification, governed allocation, activation and authenticated release acceptance as separately authorized.

[Preparation](chapter-iv-preparation.md) · [Candidate queue](chapter-iv-candidate-briefs.md). No questions or database foundation staged by 15D.1.

## Chapter III revision review closure — 15C.24R, 2026-10-17 Asia/Yerevan

- [x] Verify both current v2 question approvals and all five active definitions against immutable review evidence.
- [x] Confirm unchanged learner content and existing passing QA; all 168 questions approved, 80 guides published and 344 definitions active.
- [x] Refresh exact approval bindings for the same five conditional forms and 88-candidate specialist ledger; no independent decisions filled.
- [ ] Obtain named independent source/physics/Armenian and exposure/dependence dispositions before independently qualifying forms and production promotion; owner-authorized provisional allocation is recorded under 15C.26.

[Read-only review closure](chapter-iii-revision-review-20261017.md).

## Chapter III provisional activation — 15C.26, 2026-10-17

- [x] Record the owner's separate provisional-pilot activation approval with specialist review deferred.
- [x] Rehearse and commit the identical original transaction; verify 61 preservation scopes, all 510 configuration rows and unchanged I/II history.
- [x] Enable full dependency triggers for the prepared authenticated production runner.
- [x] Complete authenticated three-chapter acceptance (123/123; isolation 54/54) and save evidence; merge/required-CI and source-commit-verified Notion synchronization close this delivery cycle.
- [ ] Complete independent specialist/exposure qualification before production promotion.

[Release closure and verified production evidence](chapter-iii-pilot-release.md).

## Chapter III technical release preparation — 15C.25, 2026-10-17

- [x] Record the owner's Chapter III handoff/review deferral; preserve unfilled independent review decisions and the separate release boundary.
- [x] Verify the 168 approved current questions and prepare five exact forms, eight reserves, three pools, four v2 policy contracts and chapter-scoped model/runtime binding.
- [x] Run full production-schema rollback: 61 preservation scopes passed; all 59 public table fingerprints restored; Chapters I/II and learner history preserved.
- [x] Prepare/test three-chapter production read acceptance with main/fixture/activation guards; save restricted evidence.
- [x] Record separate Chapter III provisional-pilot activation authorization; refresh preflight, rehearse/commit and verify actual activation under 15C.26.
- [x] Expand activation workflow dependency triggers and run authenticated three-chapter production acceptance under 15C.26.
- [ ] Complete deferred independent specialist/exposure review and qualification before production promotion.

[Release preparation and evidence](chapter-iii-release-preparation.md). No new content, hints, schema or shared runtime. The preparation rollback was followed by the separately authorized 15C.26 activation commit. Older independent-qualification tasks remain open for production promotion; the owner authorized provisional allocation with that review deferred.

## Chapter III targeted trajectory corrections — 15C.24, 2026-10-17 Asia/Yerevan

- [x] Record the owner's bounded two-question revision authorization; freeze source/corpus and preserve old approvals.
- [x] Complete source, Armenian, whole-skill/current/history/guide and related-bank comparison; discard the overlapping first Diagnostic approach.
- [x] Save two v2 question drafts and five precise definition drafts; rollback preservation, exact readback and deployed-v11 QA 2/2 pass.
- [x] Rebind the unchanged five conditional form memberships and eight reserves; all five now represent M1–M5 using the pending v2 drafts.
- [x] Review S03-D05 v2, S03-M10 v2 and S03 definitions M58–M62 on the site; exact approvals verified under 15C.24R.
- [ ] Complete independent SME/exposure qualification before production promotion; provisional allocation/release is separately owner-authorized under 15C.26.

[Revision and verification evidence](chapter-iii-trajectory-revisions-20261017.md).

## Chapter III qualification preparation — 15C.23, 2026-10-17 Asia/Yerevan

- [x] Freeze 168 current approval/QA/snapshot bindings and 88 prior protected comparison bindings.
- [x] Prepare five disjoint offline 16-question forms and eight per-skill Mastery reserves; preserve the approved distribution and scoring groups.
- [x] Record two M4 trajectory-classification coverage gaps, conditional form dependencies and a bounded two-question revision brief.
- [x] Save restricted evidence, verify all 39 table fingerprints unchanged and prepare the independent review handoff.
- [x] Obtain the owner's bounded correction decision and save compared/technically verified v2 corrections under 15C.24; ordinary review is tracked above.
- [ ] Obtain independent specialist and exposure decisions before independently qualifying exact-version forms and production promotion; provisional allocation is owner-authorized under 15C.26.
- [x] Complete separately authorized Chapter III provisional release and production acceptance under 15C.26.

[Preflight and conditional forms](chapter-iii-assessment-qualification.md). No content or runtime changes were made.

## Chapter III ordinary review closure — 15C.22R, 2026-10-17 Asia/Yerevan

- [x] Match the 101 authorized drafts against saved authoring manifests and preserve their wording.
- [x] Save 101 delegated approvals through the existing reviewer UI and verify matching audit snapshots.
- [x] Verify all 168 pre-existing current-version question approvals and passing QA; confirm 80 guides published and 339 definitions active.
- [x] Preserve all 37 non-target table fingerprints and earlier approval history.
- [ ] Complete independent qualification, exact-version disjoint forms and separate Chapter III release gates.

[Approval and preservation evidence](chapter-iii-definition-approval-20261017.md).

## Chapter III final Mastery batch 19 — 15C.22, 2026-10-16 UTC

- [x] Verify unchanged live baseline and resolve all 24 remaining Mastery slots from the approved contract.
- [x] Complete textbook/programme, natural Armenian, whole-bank and all 276 candidate-pair checks in one delivery.
- [x] Stage 24 drafts and 58 definitions; exact saved-content QA 24/24, rollback and 39 preservation scopes pass.
- [x] Complete the planned 168-question authoring inventory: 80 Practice, 32 Diagnostic and 56 Mastery.
- [x] Verify all 168 current question approvals and QA; complete the owner-authorized delegated approval of 101 definitions through the MFA-protected site. Ordinary review is closed under [15C.22R](chapter-iii-definition-approval-20261017.md).
- [ ] Complete independent source/protection/SME qualification and exact-version disjoint-form preparation; record any qualified-capacity shortfall separately.
- [ ] Complete separate Chapter III release gates; it remains inactive and unallocated.

[Batch 19 evidence and combined review](chapter-iii-batch-19-staging.md).

## Chapter III batches 17–18 — 15C.20–15C.21, 2026-10-16

- [x] Verify the unchanged baseline: 128 questions, 120 approved, eight pending; 80 published guides; 238 active and thirteen draft definitions.
- [x] Prepare eight Diagnostic and eight Mastery candidates under the owner's two-batch instruction.
- [x] Check textbook physics, natural Armenian, existing/historical/protected content and exposed guides; compare all 120 candidate pairs.
- [x] Stage sixteen drafts and thirty definitions; exact saved-content QA 16/16, rollback and all 39 preservation scopes pass.
- [x] Review Batches 16–18 content; verified under 15C.22R above.
- [x] Remaining 24 Mastery slots delivered in the owner-authorized combined Batch 19 / 15C.22. Qualification and release remain separate.

[Batches 17–18 evidence and review](chapter-iii-batches-17-18-staging.md).

## Chapter III Diagnostic batch 16 — 15C.19, 2026-10-16

- [x] Verify Batches 13–15 ordinary review: 120 approved questions, 238 active definitions, 80 published guides; content unchanged.
- [x] Select eight Diagnostic slots: S01-D03, S02-D02, S03-D04, S04-D04, S05-D02, S06-D03, S07-D04 and S08-D02.
- [x] Complete textbook/Armenian/physics and applicable current/history/guide/protected comparisons, including all 28 new pairs.
- [x] Stage eight drafts and 13 definitions; saved-content QA 8/8, exact readback, rollback and 39 preservation scopes pass.
- [x] Review Batch 16’s eight questions and thirteen definitions; verified under 15C.22R above.
- [x] Next two bounded batches delivered as 15C.20–15C.21 / Batches 17–18. The ordinary review closure and remaining qualification gates are recorded above.

[Review closure](chapter-iii-batches-13-15-review.md) · [Batch 16 evidence](chapter-iii-batch-16-staging.md).

## Chapter III Mastery batch 15 — 15C.18, 2026-10-16

- [x] Select the owner-authorized eight-slot manifest: S01-M03, S03-M03/M04, S04-M03/M04, S06-M03 and S07-M03/M04.
- [x] Compare applicable current/history/protected content and exposed guides, including all 28 new pairs; separately check textbook physics and natural Armenian.
- [x] Stage eight drafts and 11 definitions; exact saved-content QA 8/8, rollback and 39 preservation scopes pass. No learner hints or guides added.
- [x] Preserve all 112 prior questions, 96 approvals, 80 published guides, pending Batches 13–14 reviews, learner evidence, Chapter I/II pilots and inactive/unallocated Chapter III.
- [x] Review the combined queue: 24 questions and 32 definitions across Batches 13–15. Verified under [15C.18R](chapter-iii-batches-13-15-review.md).
- [x] Next bounded batch delivered as 15C.19 / Batch 16. Current queue and remaining budget are recorded above.

[Batch 15 evidence and review](chapter-iii-batch-15-staging.md).

## Chapter III Mastery batch 14 — 15C.17, 2026-10-16

- [x] Select the owner-authorized eight-slot Mastery manifest: one M02 per S01–S08.
- [x] Compare all applicable current/history/protected content and exposed guides, including all 28 new pairs; separately check textbook physics and natural Armenian.
- [x] Stage eight drafts and 12 definitions; exact saved-content QA 8/8, rollback and 39 preservation scopes pass. No learner hints or guides added.
- [x] Preserve all 104 prior questions, 96 approvals, 80 published guides, pending Batch 13 reviews, learner evidence, Chapter I/II pilots and inactive/unallocated Chapter III.
- [x] Review the combined queue: 16 questions and 21 definitions across Batches 13–14. Verified under [15C.18R](chapter-iii-batches-13-15-review.md).
- [x] Next bounded batch delivered as 15C.18 / Batch 15. Its current combined queue and numerical gaps are recorded above; Batches 13–14 ordinary review is now closed under 15C.18R.

[Batch 14 evidence and review](chapter-iii-batch-14-staging.md).

## Chapter III Diagnostic batch 13 — 15C.16, 2026-10-16

- [x] Select and record the bounded eight-slot Diagnostic manifest authorized by the next-sprint direction.
- [x] Compare all applicable current/history/protected content and exposed guides, including all 28 new pairs; separately check textbook physics and natural Armenian.
- [x] Stage eight drafts and nine definitions; exact saved-content QA 8/8, rollback and 39 preservation scopes pass. No new learner hints or guides.
- [x] Preserve all 96 prior approvals, all 80 published guides, learner evidence, Chapter I/II pilots and inactive/unallocated Chapter III.
- [x] Review eight current v1 questions and nine draft definitions on the site. Verified under [15C.18R](chapter-iii-batches-13-15-review.md).
- [x] Next bounded batch delivered as 15C.17 / Batch 14. Its current combined queue and numerical gaps are recorded above; Batch 13 ordinary review is now closed under 15C.18R.

[Batch 13 evidence and review](chapter-iii-batch-13-staging.md).

## Chapter III review closure and assessment proposal — 15C.13R–15C.14, 2026-10-15

- [x] Verify all 96 current-version human approvals and QA, all 80 guide publications/snapshots and 206 approved definition snapshots.
- [x] Rebind unchanged S01-D01 v2 to its prior semantic comparison; preserve both immutable versions.
- [x] Prepare the sixteen-question assessment proposal, ten-question mandatory score, four-skill readiness scope, capacity table and shared-runtime implementation/acceptance requirements.
- [x] Obtain the owner decision on proposed counts, readiness and pass/reporting scope — John approved 2026-10-15.
- [x] Implement the accepted versioned subject-neutral contract and local scoring/readiness/retry/reporting regressions.
- [x] Merge implementation, pass CI, deploy and read back nine SQL functions and all 14 affected Edge bundles; record verified runtime provenance.
- [x] Complete 15C.15 CI, deployment/parity and authenticated production preservation checks; align merged documentation and sync Notion to the merged source commit. [Release evidence](evidence/assessment-policy-v2-release-20261015.json).
- [x] The next bounded manifest was selected and delivered as 15C.16 / Batch 13. Further authoring and qualification follow the current section above.

[Review closure](chapter-iii-batches-06-12-review.md) · [Concrete proposal](chapter-iii-assessment-contract-proposal.md).

## Chapter III Diagnostic/Mastery candidate batches — 15C.12–15C.13, 2026-10-15

- [x] Record the owner's bounded selection: eight Diagnostic and eight Mastery candidates; no assessment contract or release waiver inferred.
- [x] Compare the entire applicable bank/history/guides and all 120 candidate pairs; separately check textbook physics and natural Armenian.
- [x] Stage both eight-question batches with 29 definitions and no new learner guides/hints; exact readback, QA 16/16 and 39 preservation scopes per batch pass.
- [x] Preserve 80 practice questions, all existing approvals, all guides, Chapter I/II pilots and inactive/unallocated Chapter III state.
- [x] Ordinary content review verified complete under 15C.13R; all current versions are approved/published.
- [x] Assessment counts, reporting groups, readiness and pass rules approved under 15C.14 and implemented under 15C.15. Independent SME/exposure and disjoint-form qualification remain open.
- [x] Next bounded scope delivered as 15C.16 / Batch 13. That checkpoint was superseded by Batch 13 and then Batch 14; see the current inventory and remaining budget above.

[Batches 11–12 staging](chapter-iii-batches-11-12-staging.md).

## Chapter III ninth and tenth practice batches — 15C.10–15C.11, 2026-10-15

- [x] Verify one additional current-version human approval and preserve the remaining queue; 37 unchanged scopes and the exact approval-only change in two scopes recorded.
- [x] Compare sixteen candidates against the whole applicable current/history bank and all 120 pairs; verify textbook support, 32 hints and 16 distinct worked examples.
- [x] Repair shared authored-catalogue metadata validation; run 31 regressions and CI; deploy the single importing consumer and verify all three bundle files.
- [x] Rehearse and stage both eight-question batches separately; exact saved-content/guide checks and 39 preservation scopes pass for each.
- [x] Complete 80/80 planned practice slots: 16 new questions, 16 guides and 40 definitions.
- [x] Ordinary content review verified complete under 15C.13R; all current versions are approved/published.
- [x] Assessment/readiness contract agreed under 15C.14 and implemented under 15C.15; SME/exposure/release gates remain open.

[Batches 09–10 staging](chapter-iii-batches-09-10-staging.md).

## Chapter III eighth practice batch — 15C.9, 2026-10-15

- [x] Verify all 39 prior handoff fingerprints; retain pending Batches 06/07 without inferring approval.
- [x] Compare eight candidates across seven skills and all 28 pairs against related/current/history banks; expand comparison to the whole U02-S02 bank.
- [x] Check all 16 hints and 8 examples for natural Armenian, source fidelity and useful help.
- [x] Rehearse rollback; stage 8 questions / 8 guides / 20 definitions; verify exact readback, QA/guide checks 8/8 and all 39 preservation scopes.
- [x] Ordinary content review verified complete under 15C.13R; all current versions are approved/published.
- [x] Remaining 16 practice slots drafted under 15C.10–15C.11. The assessment/readiness contract and specialist/release gates remain open.

[Batch 08 staging](chapter-iii-batch-08-staging.md).

## Chapter III seventh practice batch — 15C.8, 2026-10-15

- [x] Verify all 39 prior handoff fingerprints; retain the pending Batch 06 queue without inferring approval.
- [x] Compare eight candidates across S01–S08, related/current/history banks and all 28 pairs; include the whole U01-S10 measurement-method bank.
- [x] Check all 16 hints and 8 worked examples for natural Armenian, source fidelity and useful help.
- [x] Rehearse rollback; stage 8 questions / 8 guides / 14 definitions; verify exact readback, QA/guide checks 8/8 and all 39 preservation scopes.
- [x] Ordinary content review verified complete under 15C.13R; all current versions are approved/published.
- [x] Authoring continued under 15C.9 above; remaining practice authoring is complete under 15C.10–15C.11. Assessment/readiness contract and specialist/release gates remain open.

[Batch 07 staging](chapter-iii-batch-07-staging.md).

## Chapter III sixth practice batch — 15C.7, 2026-10-15

- [x] Verify 40 approved questions, 40 published guides and 87 active definitions; compare the edited S04 example and source-check the S03 grammar flag.
- [x] Compare eight candidates across eight skills, related current/history banks, guide exposure and all 28 pairs.
- [x] Review all 16 hints and 8 worked examples for natural Armenian, useful help and source fidelity.
- [x] Rehearse rollback; stage 8 questions / 8 guides / 16 definitions; verify exact readback, QA/guide checks 8/8 and all 39 preservation scopes.
- [x] Ordinary content review verified complete under 15C.13R; all current versions are approved/published.
- [x] Authoring continued under 15C.8 and 15C.9 above; remaining practice authoring is complete under 15C.10–15C.11. Assessment/readiness contract and specialist/release gates remain open.

[Batch 06 staging](chapter-iii-batch-06-staging.md).

## Chapter III fifth practice batch — 15C.6, 2026-10-15

- [x] Verify 32 prior questions, 32 guides and 69 definitions; compare four edited guides and reconcile historical disposition labels.
- [x] Compare eight candidates across eight skills, related banks/history and all 28 pairs; retain intentional practice variants only.
- [x] Review all 16 hints separately for natural Armenian, progressive help and answer leakage.
- [x] Publish and verify the exact textbook ruler image; rehearse rollback and stage 8 questions / 8 guides / 18 definitions.
- [x] Verify exact saved content, QA/guide checks 8/8 and all 39 preservation scopes.
- [x] Human site review verified under 15C.6R: all 40 questions/guides and 87 definitions approved/published/active; revised S04 example checked.
- [x] Authoring continued under 15C.7 above; 32 practice slots remain. Assessment/readiness contract and specialist/release gates remain open.

[Batch 05 staging](chapter-iii-batch-05-staging.md). [Current disposition reconciliation](chapter-iii-disposition-reconciliation.md).

## Chapter III fourth practice batch — 15C.5, 2026-10-14

- [x] Verify all 24 prior questions, 24 guides and 52 definitions; refresh five guide comparisons and close S04-I01 publication.
- [x] Refresh full applicable corpus and exposure aggregates; compare eight candidates across all eight skills and all 28 pairs.
- [x] Commit comparison/specifications, rehearse rollback, stage eight questions/eight guides/seventeen definitions and independently verify exact readback.
- [x] Verify 8/8 question QA, 8/8 guide structural checks and all 39 preservation scopes.
- [x] Human site review of eight questions, eight guides and seventeen definitions verified under 15C.5R; four guide edits compared.
- [x] Continue authoring via 15C.6 above; 40 practice slots remain after Batch 05. Assessment/readiness contract and specialist/release gates remain open.

[Batch 04 staging](chapter-iii-batch-04-staging.md).

## Chapter III third practice batch — 15C.4, 2026-10-14

- [x] Save the exact chat-approved S04-I01 worked-example correction as authoring v5; preserve runtime v2 and history.
- [x] Refresh the full applicable corpus; compare eight candidates across seven skills and all 28 pairs.
- [x] Commit comparison/specifications, rehearse rollback, stage eight questions/eight guides/nineteen definitions and independently verify readback.
- [x] Verify 8/8 question QA, 8/8 guide structural checks and all 39 preservation scopes.
- [x] Human site review of eight new questions, eight new guides and nineteen definitions; exact current-version approval verified under 15C.4R.
- [x] Authenticated publication of S04-I01 exact correction verified: authoring v7 / runtime v3. Earlier sign-out is superseded.
- [x] All 80 practice questions reviewed under 15C.13R; contract approved/implemented under 15C.14–15C.15. Specialist/release gates remain open.

[Batch 03 and guide correction](chapter-iii-batch-03-staging.md).

## Chapter III second practice batch — 15C.3, 2026-10-13

- [x] Refresh the full applicable corpus and compare eight candidates, related guides and all 28 pairs.
- [x] Check textbook facts, natural Armenian, solutions, distractors and no-image rationale.
- [x] Rehearse/rollback, commit and independently read back eight questions, eight guides and fourteen definitions; question QA and guide validation pass 8/8.
- [x] Preserve all existing rows across 39 guarded scopes and keep Chapter III inactive and unallocated.
- [x] Human site review of both batches: 16 questions, 16 guides and 33 definitions; verified current approvals and publication snapshots on 2026-10-14.
- [x] Compare all eight edited guides and preserve the unchanged 16 question versions and 33 definitions.
- [x] John approved the exact S04-I01 clarification in chat; save it as authoring v5 under 15C.4. Authenticated site publication is verified under 15C.4R above.
- [x] Chapter III assessment/readiness contract approved and implemented under 15C.14–15C.15.
- [ ] Qualify protected capacity and complete independent specialist/exposure and release gates.

[Verified staging](chapter-iii-batch-02-staging.md).

## Chapter III governed first batch — 15C.2, 2026-10-13

- [x] Record owner acceptance of the plan/budget and exact eight offline v1 questions.
- [x] Refresh and compare all current/history/guide/related-mapping/protection evidence; retain eight for practice.
- [x] Prepare the draft foundation and eight questions, eight guides and 19 definitions; rollback and exact-source QA pass.
- [x] Merge/apply the Chapter III foundation; commit/read back the guarded practice package, record QA 8/8, verify three production image hashes, and reconcile the connector-assigned migration version.
- [x] Complete authenticated content workflow and review the newly authored guides/definitions on site; verified under 15C.3R.
- [x] Readiness/pass contract approved and implemented under 15C.14–15C.15.
- [ ] Establish qualified protected capacity; specialist/release gates remain open.

[Staging](chapter-iii-batch-01-staging.md). Chapter II subsequently activated through the owner-authorized browser route; authenticated production acceptance passed 91/91. [Activation evidence](evidence/chapter-ii-pilot-activation-20261013.json).

## Chapter III preparation — 15C.1, 2026-10-13 (historical checkpoint)

- [x] Verify the supplied textbook edition and current official programme appendix; map the five mandatory and one additional Theme 3 outcomes.
- [x] Propose eight skills, textbook/source boundaries, prerequisites and a chapter-specific 168-question planning budget.
- [x] Prepare eight offline practice drafts, explanations, hints and distractor rationales; extract three source illustrations with provenance and mobile readability treatment.
- [x] Record the preliminary frozen-corpus screen, 28 within-batch comparisons and explicit qualification limits.
- [x] Owner accepted the preparation plan and planning budget; final counts/weights and supporting/additional-skill assessment treatment remain separately open under 15C.3.
- [x] Refresh the full applicable current/history/guide/protected corpus for practice staging under 15C.2, then again under 15C.3; protected assessment qualification remains open.
- [x] Create the governed Chapter III draft foundation and stage the first two practice batches through 15C.2/15C.3.
- [x] Human content review of the first two staged batches, verified under 15C.3R.
- [ ] Prepared guide clarification, specialist review and eventual assessment/release qualification.

[Preparation](chapter-iii-preparation.md). This checklist records offline preparation only; no Supabase or learner changes occurred. Chapter II was paused during preparation; the later owner-authorized browser deployment and pilot activation supersede that historical pause.

## Chapter II final two batches — 2026-10-13

- [x] Author the owner-requested 37 remaining slots in two batches of 19 and 18; retain the 192 target and existing assessment contract.
- [x] Compare all current/applicable historical content, guides and 666 new pairs; revise overlapping candidates before staging.
- [x] Save private evidence, commit sanitized comparison, stage 37 drafts plus 47 definitions, and verify exact readback/current-family technical QA.
- [x] Human content review of all 37 questions and 47 definitions, verified against current versions and approved snapshots on 2026-10-13.
- [x] Close the shared direct-question read gap; deploy and verify staff/service access, anonymous/student denial and unchanged content/evidence tables.
- [x] Stage the recorded three question revisions and three guide drafts, preserve prior approvals/history and verify deployed technical QA.
- [x] Human review of the three v3 question revisions and publication of the three guide corrections at authoring v7 / runtime v3, verified against unchanged reviewed content.
- [x] 15B.14A: prepare the current-version inventory, independent Physics reviewer packet and historical exposure hold.
- [x] Owner authorization for provisional Chapter II pilot with specialist review deferred.
- [x] 15B.14B implementation: prepare exact protected forms and independent chapter release configuration; merge PR #206, pass all five final CI jobs and deploy the frontend.
- [x] 15B.14B production deployment: apply both exact reviewed migrations, record matching history, pass the rollback rehearsal and commit governed allocation/bindings. [Verified activation](evidence/chapter-ii-pilot-activation-20261013.json).
- [x] 15B.14C: pilot activation and authenticated Chapter I/II desktop/mobile navigation, isolation and preserved-history acceptance passed 91/91. [Production acceptance](evidence/chapter-ii-pilot-read-acceptance-20261013.json).
- [ ] Independent SME/protection review and final exposure disposition before production promotion.

The bank has 192 approved non-archived questions, 263 active definitions and 57 published guides, with no pending content. Each of eight skills has 12/4/8 Practice/Diagnostic/Mastery candidates. [Qualification preparation](chapter-ii-assessment-qualification.md) and the pilot implementation are complete for their recorded scope. Chapter II is active as the authorized provisional pilot; authenticated production acceptance passed 91/91. Independent SME/production exposure decisions remain open. [Historical deployment blocker](evidence/chapter-ii-pilot-deployment-blocker-20261013.json) · [Authoritative status](project-status.md).


