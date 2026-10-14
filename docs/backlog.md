# Product backlog

**Status source:** [Project status register](project-status.md), reconciled 2026-10-10. This file is a scoped implementation checklist, not a second current sprint ledger. Completed technical work is checked below; genuine external/release gates remain open. Later stages and current inventories are in the register; the [roadmap](sprint-roadmap.md) defines their sequence.

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

## Chapter III fourth practice batch — 15C.5, 2026-10-14

- [x] Verify all 24 prior questions, 24 guides and 52 definitions; refresh five guide comparisons and close S04-I01 publication.
- [x] Refresh full applicable corpus and exposure aggregates; compare eight candidates across all eight skills and all 28 pairs.
- [x] Commit comparison/specifications, rehearse rollback, stage eight questions/eight guides/seventeen definitions and independently verify exact readback.
- [x] Verify 8/8 question QA, 8/8 guide structural checks and all 39 preservation scopes.
- [ ] Human site review of eight new questions, eight guides and seventeen definitions.
- [ ] Continue remaining 48 practice slots and prepare the explicit assessment/readiness contract; retain specialist/release gates.

[Batch 04 staging](chapter-iii-batch-04-staging.md).

## Chapter III third practice batch — 15C.4, 2026-10-14

- [x] Save the exact chat-approved S04-I01 worked-example correction as authoring v5; preserve runtime v2 and history.
- [x] Refresh the full applicable corpus; compare eight candidates across seven skills and all 28 pairs.
- [x] Commit comparison/specifications, rehearse rollback, stage eight questions/eight guides/nineteen definitions and independently verify readback.
- [x] Verify 8/8 question QA, 8/8 guide structural checks and all 39 preservation scopes.
- [x] Human site review of eight new questions, eight new guides and nineteen definitions; exact current-version approval verified under 15C.4R.
- [x] Authenticated publication of S04-I01 exact correction verified: authoring v7 / runtime v3. Earlier sign-out is superseded.
- [ ] Continue remaining practice and prepare the explicit assessment/readiness contract; preserve specialist/release gates.

[Batch 03 and guide correction](chapter-iii-batch-03-staging.md).

## Chapter III second practice batch — 15C.3, 2026-10-13

- [x] Refresh the full applicable corpus and compare eight candidates, related guides and all 28 pairs.
- [x] Check textbook facts, natural Armenian, solutions, distractors and no-image rationale.
- [x] Rehearse/rollback, commit and independently read back eight questions, eight guides and fourteen definitions; question QA and guide validation pass 8/8.
- [x] Preserve all existing rows across 39 guarded scopes and keep Chapter III inactive and unallocated.
- [x] Human site review of both batches: 16 questions, 16 guides and 33 definitions; verified current approvals and publication snapshots on 2026-10-14.
- [x] Compare all eight edited guides and preserve the unchanged 16 question versions and 33 definitions.
- [x] John approved the exact S04-I01 clarification in chat; save it as authoring v5 under 15C.4. Authenticated site publication is verified under 15C.4R above.
- [ ] Chapter III assessment/readiness contract, protected capacity, specialist and release decisions.

[Verified staging](chapter-iii-batch-02-staging.md).

## Chapter III governed first batch — 15C.2, 2026-10-13

- [x] Record owner acceptance of the plan/budget and exact eight offline v1 questions.
- [x] Refresh and compare all current/history/guide/related-mapping/protection evidence; retain eight for practice.
- [x] Prepare the draft foundation and eight questions, eight guides and 19 definitions; rollback and exact-source QA pass.
- [x] Merge/apply the Chapter III foundation; commit/read back the guarded practice package, record QA 8/8, verify three production image hashes, and reconcile the connector-assigned migration version.
- [x] Complete authenticated content workflow and review the newly authored guides/definitions on site; verified under 15C.3R.
- [ ] Specify Chapter III readiness/pass contract and establish protected capacity; specialist/release gates remain open.

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
