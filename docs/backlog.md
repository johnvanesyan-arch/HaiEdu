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
- [x] Obtain/map current official Grade 7 Physics programme
- [x] Identify current approved textbook used in pilot class
- [x] Select first unit
- [x] Map official outcomes
- [x] Decompose 5–10 micro-skills
- [ ] Validate prerequisites with Physics SME
- [x] Draft 20–40 deterministic items
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
**Status: ✅ Complete.** Selection is now cross-session exposure-aware. Practice follows unseen variant → spaced unresolved error → least-recent review → explicit pool-exhaustion fallback. Diagnostic rotates two explicit non-overlapping 20-item baseline forms. Mastery uses the protected pool with unseen-first/least-exposed selection and alternate-retest logic after failure/remediation. Detailed implementation: `docs/sprint-11b-repetition-selection-policy.md`.

- [x] Practice: prefer unseen concrete variants first, then unresolved errors after spacing, then least-recently-seen review.
- [x] Practice: no exact rendered variant repeats inside a session unless the pool is genuinely exhausted and remediation explicitly requires it.
- [x] Practice: introduce an exact-variant cooldown across sessions rather than resetting repetition control whenever a new session starts.
- [x] Diagnostic: stop serving the same deterministic 20-question form on every attempt; rotate parallel forms / least-exposed diagnostic variants.
- [x] Diagnostic: record form/variant exposure and avoid exact-item reuse on an immediate retake when alternatives exist.
- [x] Mastery Check: strongly prefer items/variants the learner has never seen; otherwise choose least recently exposed protected variants.
- [x] Mastery Check: after a failed attempt and required remediation, use an alternate assessment form with minimal overlap with the previous attempt.
- [x] Add explicit pool-exhaustion behavior so the system degrades predictably rather than silently over-serving familiar items.

**Current bank-capacity boundary:** the two Diagnostic forms are structurally non-overlapping but their pedagogical parallelism is still provisional pending Sprint 11D review. The protected Mastery pool currently has exactly 2 items per skill while a full Mastery Check also needs 2 per skill, so a retest can be forced to overlap with the previous form. That overlap is now explicit and auditable (`poolExhausted` / `exactRepeatFallbackUsed`) rather than silent; Sprint 11D must expand the protected pool before overlap becomes exceptional.

### 11C — Parameterised and parallel item variants
**Status: ✅ Complete.** Deterministic seed-based generation is live for safe numerical constructs and explicit parallel-context reasoning tasks. Exact prompt/parameter/answer/fingerprint reproduction is QA-checked, generated candidates enter review state only, and content-admin preview/materialisation remains behind the existing role gate. Detailed implementation: `docs/sprint-11c-parameterized-parallel-variants.md`.

- [x] Add deterministic parameterised templates where educationally safe (for example unit conversions, measurement readings and displacement calculations).
- [x] Store the generated parameters/seed or rendered-variant identity so the exact question shown to the learner is auditable and reproducible.
- [x] Keep answer generation deterministic and server-side; do not rely on live generative AI for routine numerical item creation or grading.
- [x] Build parallel-context variants for reasoning/transfer skills where simple number substitution would not test transfer.
- [x] Ensure variants preserve the same construct and intended difficulty rather than merely changing wording; generated content remains provisional until Sprint 11D human review.
- [x] Add QA rules for invalid/malformed generation, duplicate effective variants and accidental answer leakage.

**11C proof-set note:** 10 active generation templates are live (8 parameterised + 2 parallel). Twenty concrete proof variants across S04, S05 and S07–S10 are materialised in `review` / `needs_review` state, reproduce exactly from template + seed, have distinct semantic fingerprints, and have zero assessment-pool memberships. They do not count toward the 11D production-bank target until reviewed and approved.

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

### 11F — Closed Grade 7 Physics Chapter I pilot
**Status: 🟡 In progress.** Technical preflight and the rendered browser-production gate are complete. 11F.2 used real rendered production browser runs with authenticated student and teacher profiles. Four authenticated repetitions — tablet/phone viewport, keyboard-only focus traversal, 200% zoom, and Firefox/Safari-class browser — were not executable with the available automation controls and were explicitly accepted by the product owner on 2026-09-16 as QA limitations rather than PASS results. The next gate is the disposable-account end-to-end production workflow smoke. Detailed execution plan: `docs/sprint-11f-closed-pilot.md`.

- [x] Complete automated/source, live-database, active-bank, diagnostic-form, security/RLS and session-collision preflight QA; fix blocking defects discovered by that gate.
- [x] Execute/disposition the deferred authenticated browser/device QA matrix from `docs/pilot-browser-qa-checklist.md`; rendered student/teacher desktop checks passed and the four remaining authenticated tool-coverage gaps have explicit product-owner acceptance.
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
- [x] Practice no longer depends on six fixed questions per skill and can normally complete a bounded session without forced exact repetition.
- [x] Diagnostic uses parallel/rotating reviewed forms instead of the same fixed form on every attempt.
- [x] Mastery Check uses protected unseen-first / least-exposed selection and alternate retest logic, backed by 8 protected variants per skill.
- [x] Parameterised items are deterministic, reproducible and auditable where used.
- [x] Unit 1 content has completed the agreed technical/human QA gate; provisional SME status remains explicit until actual SME review.
- [x] Deferred authenticated browser/device QA has been executed where supported; the four remaining authenticated browser-control limitations have explicit accepted disposition and are not represented as passing tests.
- [ ] A closed Chapter I pilot has run end-to-end.
- [ ] Pilot data has been reviewed for repetition/memorisation risk, usability, content defects and learning-engine behavior.
- [ ] Critical defects are resolved or explicitly accepted before expanding to Chapter II / another subject slice.

**Non-goal for Sprint 11:** psychometric validation of mastery cut scores. Current thresholds remain provisional engineering defaults until sufficient empirical evidence exists.
