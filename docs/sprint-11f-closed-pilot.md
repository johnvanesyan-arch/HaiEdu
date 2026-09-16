# Sprint 11F — Closed Grade 7 Physics Chapter I Pilot

**Status: 🟡 In progress.**  
**Opened:** 2026-09-16  
**Scope:** final production/browser smoke, controlled pilot execution, operational evidence review, and Sprint 11 closure. Real student/teacher feedback is intentionally not required for the initial technical preflight phase.

## Objective

Run Grade 7 Physics Chapter I as a controlled production pilot without weakening the assessment-integrity, security, privacy, deterministic-grading, or evidence-provenance guarantees completed in Sprint 11A–11E.

Sprint 11F is primarily an operational validation sprint. It must distinguish three kinds of evidence:

1. **Technical preflight evidence** — source/CI/database/security checks that can be verified without a real cohort.
2. **Rendered production evidence** — authenticated browser/device/keyboard smoke testing in the deployed application.
3. **Human pilot evidence** — observed student/teacher use and feedback from a controlled cohort.

Passing one category must not be represented as passing the others.

## 11F.1 — Technical preflight

**Status: ✅ Complete.**

The pre-pilot QA report in `docs/pre-sprint-11f-qa.md` established the current technical baseline after Sprint 11E.

Verified at the opening of 11F:

- repository CI passes after the pre-pilot regression fix;
- the current production deployment is successful;
- Chapter I has 240 active pilot-eligible variants across 10 skills;
- active pool capacity is 120 Practice / 40 Diagnostic / 80 protected Mastery variants;
- the two active Diagnostic v2 forms contain 20 items each, exactly 2 items per skill, with zero exact overlap;
- no active Chapter I item is missing Armenian prompt text, answer-key provenance, curriculum scope, or normalized variant identity;
- Practice, Diagnostic, and Mastery pools have no cross-purpose item overlap;
- protected Mastery content remains outside ordinary learner-facing item read paths;
- no learner/unit currently has more than one active learning session;
- `start-learning-session` now preserves an active different-mode session and returns `409 active_session_conflict` rather than silently abandoning it.

Live pilot-readiness snapshot on 2026-09-16:

- 1 admin profile;
- 1 content-admin profile;
- 1 teacher profile;
- 2 student profiles;
- 4 active accounts and 1 suspended account;
- 2 active classes;
- 1 current class membership;
- 0 duplicate active learner/unit session groups.

These are readiness/test-state counts, not a claim that a real pilot cohort has been recruited.

## 11F.2 — Authenticated browser/device production smoke

**Status: ⏳ Pending.**

Execute `docs/pilot-browser-qa-checklist.md` against production using authenticated pilot/test accounts.

Required coverage:

- Desktop Chromium;
- Firefox or Safari-class browser;
- tablet-width layout;
- phone-width layout;
- keyboard-only navigation;
- 200% text zoom and long-Armenian overflow checks;
- Practice, Diagnostic, Mastery, Progress and Teacher surfaces;
- real rendered SVG/stimulus inspection;
- session-collision regression in the browser.

This phase must be executed in a real rendered browser environment. Source inspection or CI does not substitute for it.

## 11F.3 — Final production workflow smoke

**Status: ⏳ Pending.**

Before introducing a real cohort, execute one controlled end-to-end workflow covering:

- student authentication/onboarding;
- teacher class creation and invite/join code;
- student class joining;
- Diagnostic start/resume/completion;
- adaptive Practice and remediation;
- Mastery Check eligibility/start/resume/completion;
- Progress state after learning evidence changes;
- teacher dashboard/student detail visibility;
- account suspension/session-revocation behavior;
- privacy preferences and deletion-request surface.

The smoke account must be disposable test/pilot data. Do not use production student learning evidence merely to exercise the flow.

## 11F.4 — Pilot privacy and participation gate

**Status: ⏳ Pending real cohort.**

Technical role/privacy controls are already present, but real participant authorization is an operational requirement and is not equivalent to `research_use_opt_in` or `product_analytics_opt_in`.

Before a real minor/student cohort is enrolled:

- define who is responsible for participant/guardian authorization where required;
- document the pilot purpose and what data will be collected;
- keep the cohort intentionally small and controlled;
- avoid collecting unnecessary identity data;
- verify each teacher sees only their authorized class/student scope;
- verify suspended/deletion-pending accounts cannot continue normal learning access.

This sprint is not a legal-compliance certification.

## 11F.5 — Closed cohort run

**Status: ⏳ Deferred until the technical/browser gates pass.**

When the cohort is run, collect operational evidence without changing the learning engine mid-pilot unless a blocking defect requires intervention.

Observe:

- whether students can determine the next action without developer guidance;
- whether bounded Practice completes normally;
- whether Diagnostic and Mastery remain distinct in learner behavior;
- whether exact-repeat rates stay low enough that improvement is not primarily explained by memorising concrete variants;
- whether protected Mastery exposure behaves as designed;
- whether any item family is unexpectedly easy, hard, slow, frequently missed, or frequently abandoned;
- whether teachers can interpret the skill matrix and intervention signals correctly.

Human feedback may be collected later in this phase. It is deliberately not part of the initial technical QA gate.

## 11F.6 — Evidence review and Sprint 11 closure

Sprint 11 may close only after:

- the authenticated browser/device/keyboard matrix passes or each remaining issue has an explicit accepted workaround;
- the final production workflow smoke passes;
- a controlled Chapter I cohort has completed the pilot;
- repeat/exposure and item-level operational evidence have been reviewed;
- critical defects are resolved or explicitly accepted;
- a pilot report records defects, content findings, learning-engine findings, usability observations, and the disposition for Sprint 12 calibration.

## Current residuals

### Supabase Auth hardening

Supabase currently reports **Leaked Password Protection disabled**. Treat this as an open security-hardening item before broader external rollout. It does not invalidate the current Chapter I engine evidence, but it should not be silently ignored when 11F is closed.

### Database performance/policy lint

Supabase performance lint still reports optimization opportunities such as unindexed foreign keys, RLS init-plan improvements, unused indexes, and multiple permissive policies. These are not currently classified as correctness failures for the small controlled pilot. Address them selectively from observed query plans/latency rather than by broad speculative changes during 11F.

## Immediate next action

Run **11F.2 — authenticated browser/device production smoke**. After that passes, run the disposable-account end-to-end workflow smoke in 11F.3. Only then introduce the real controlled cohort.
