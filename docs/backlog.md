# Product backlog

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
- [ ] Run security/performance advisor review
- [ ] Create first authenticated test student
- [ ] Insert first validated Grade 7 Physics skill/item
- [ ] Run live answer -> attempt -> mastery integration test

## Sprint 1 — Grade 7 Physics curriculum slice
- [ ] Obtain/map current official Grade 7 Physics programme
- [ ] Identify current approved textbook used in pilot class
- [ ] Select first unit
- [ ] Map official outcomes
- [ ] Decompose 5–10 micro-skills
- [ ] Validate prerequisites with Physics SME
- [ ] Draft 20–40 deterministic items
- [ ] Teacher QA

## Sprint 2 — First live learning loop
- [ ] Student authentication UI
- [ ] Item delivery endpoint/UI
- [ ] Answer submission UI
- [ ] Attempt history
- [ ] Mastery display
- [ ] Teacher class matrix
- [ ] Small closed pilot

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

## Sprint 11 — Assessment Integrity, Item-Bank Expansion & Closed Physics Pilot

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

**Transitional bank note:** the current 60 fixed items are conservatively backfilled as singleton family/template identities until Sprint 11D content review. For each Chapter I skill, the current baseline split is 4 Practice/Diagnostic-eligible items and 2 protected Mastery-only items. This establishes the integrity boundary now but does **not** solve repetition pressure; Sprint 11B defines exposure-aware selection/cooldowns and Sprint 11C/11D expands the effective variant bank.

### 11B — Repetition and selection policy
- [ ] Practice: prefer unseen concrete variants first, then unresolved errors after spacing, then least-recently-seen review.
- [ ] Practice: no exact rendered variant repeats inside a session unless the pool is genuinely exhausted and remediation explicitly requires it.
- [ ] Practice: introduce an exact-variant cooldown across sessions rather than resetting repetition control whenever a new session starts.
- [ ] Diagnostic: stop serving the same deterministic 20-question form on every attempt; rotate parallel forms / least-exposed diagnostic variants.
- [ ] Diagnostic: record form/variant exposure and avoid exact-item reuse on an immediate retake when alternatives exist.
- [ ] Mastery Check: strongly prefer items/variants the learner has never seen; otherwise choose least recently exposed protected variants.
- [ ] Mastery Check: after a failed attempt and required remediation, use an alternate assessment form with minimal overlap with the previous attempt.
- [ ] Add explicit pool-exhaustion behavior so the system degrades predictably rather than silently over-serving familiar items.

### 11C — Parameterised and parallel item variants
- [ ] Add deterministic parameterised templates where educationally safe (for example unit conversions, measurement readings and displacement calculations).
- [ ] Store the generated parameters/seed or rendered-variant identity so the exact question shown to the learner is auditable and reproducible.
- [ ] Keep answer generation deterministic and server-side; do not rely on live generative AI for routine numerical item creation or grading.
- [ ] Build parallel-context variants for reasoning/transfer skills where simple number substitution would not test transfer.
- [ ] Ensure variants preserve the same construct and intended difficulty rather than merely changing wording.
- [ ] Add QA rules for invalid parameter combinations, duplicate effective variants and accidental answer leakage.

### 11D — Grade 7 Physics Unit 1 bank expansion and content QA
- [ ] Re-audit all 60 existing Unit 1 items against the 10 micro-skills, intended layer, misconception and difficulty.
- [ ] Remove remaining `unspecified` item-family metadata where a defensible family can be assigned.
- [ ] Expand each skill beyond the current six fixed items using a combination of reviewed fixed items, parameterised variants and parallel scenarios.
- [ ] Ensure each skill has enough effective practice exposure to complete an 8-item practice session without forced exact repetition.
- [ ] Create at least two usable diagnostic forms for Chapter I (2 items per skill per form) with controlled parallelism.
- [ ] Create a protected mastery-check pool sufficient for alternate attempts and unseen-first selection.
- [ ] Keep factual/knowledge items proportionate so reasoning and transfer are not crowded out by recognition questions.
- [ ] Retain the current `provisional_no_sme_review` warning until Physics SME validation actually occurs; do not label provisional content as teacher-validated.
- [ ] Run technical QA and human content review before any new item/variant is pilot eligible.

### 11E — Pilot analytics and item-quality evidence
- [ ] Capture per-item/variant operational statistics needed for later review: exposure count, correctness rate, response time where available, hint/help use, purpose, and omission/abandonment where meaningful.
- [ ] Add content-admin visibility for high-exposure, unexpectedly easy/hard, frequently missed, or suspicious items.
- [ ] Do not treat small-pilot statistics as validated psychometrics; label them as pilot evidence only.
- [ ] Support item revision/retirement/replacement without losing historical attempt provenance.
- [ ] Add a basic assessment-integrity report showing exact-repeat rates and protected-pool usage.

### 11F — Closed Grade 7 Physics Chapter I pilot
- [ ] Execute the deferred authenticated browser/device QA matrix from `docs/pilot-browser-qa-checklist.md` or document accepted defects/workarounds.
- [ ] Final production smoke test: student onboarding, teacher class creation/invite, class joining, diagnostic, adaptive practice, remediation, mastery check, progress, and teacher dashboard.
- [ ] Use a small controlled student cohort before broader rollout.
- [ ] Verify privacy/consent/role boundaries for the pilot cohort and teachers.
- [ ] Observe whether students understand what to do without developer intervention.
- [ ] Collect teacher feedback on usefulness of the skill matrix, recommendations and intervention signals.
- [ ] Collect student feedback on clarity, repetition, difficulty, hints and perceived fairness.
- [ ] Review repeat/exposure logs to confirm that improved scores are not primarily explained by exact-item memorisation.
- [ ] Review item-level pilot evidence and flag questions for revision, retirement or expansion.
- [ ] Produce a Sprint 11 pilot report with defects, content findings, learning-engine findings and go/no-go recommendations for the next unit.

### Sprint 11 exit criteria
Sprint 11 is complete only when all of the following are true:

- [x] Cross-session exposure tracking is live and covered by tests.
- [ ] Practice no longer depends on six fixed questions per skill and can normally complete a bounded session without forced exact repetition.
- [ ] Diagnostic uses parallel/rotating forms instead of the same fixed form on every attempt.
- [ ] Mastery Check uses protected unseen-first / least-exposed selection and alternate retest forms.
- [ ] Parameterised items are deterministic, reproducible and auditable where used.
- [ ] Unit 1 content has completed the agreed technical/human QA gate; provisional SME status remains explicit until actual SME review.
- [ ] Deferred authenticated browser/device QA has been completed or remaining defects have an explicit accepted workaround before the pilot is closed.
- [ ] A closed Chapter I pilot has run end-to-end.
- [ ] Pilot data has been reviewed for repetition/memorisation risk, usability, content defects and learning-engine behavior.
- [ ] Critical defects are resolved or explicitly accepted before expanding to Chapter II / another subject slice.

**Non-goal for Sprint 11:** psychometric validation of mastery cut scores. Current thresholds remain provisional engineering defaults until sufficient empirical evidence exists.
