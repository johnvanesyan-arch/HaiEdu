# Sprint 12 — Learning-Model Calibration

**Status:** 🟡 12A calibration readiness in progress; 12B empirical calibration blocked pending suitable Sprint 11.5 learner evidence.  
**Opened:** 2026-09-20

## Purpose

Sprint 12 determines whether HaiEdu's current mastery, recovery, difficulty, recommendation, diagnostic-band and Mastery Check rules behave plausibly with real learner evidence.

The current rules are engineering defaults. Sprint 12 must not tune them from QA artifacts, content-review activity, or tiny non-representative samples.

## Parallel-review boundary

An informal external adult reviewer may continue reviewing questions through the student-facing platform with no deadline.

That activity is useful for:

- content defects;
- wording/translation problems;
- confusing UX;
- broken question rendering;
- obviously wrong answers or units;
- navigation/workflow defects.

It is **not calibration evidence** because the reviewer is intentionally inspecting the question bank rather than participating as a normal learner.

Any such sessions remain QA/context evidence unless they later satisfy a separately defined formal pilot evidence contract.

## Sprint structure

### 12A — Calibration Readiness

**Can run now, in parallel with the asynchronous Sprint 11.5 review stream.**

Goal: make the learning model measurable, internally consistent and versionable before any parameter is changed.

#### 12A.1 — Current-model inventory and consistency audit

- [x] Inventory the currently deployed learning-model constants.
- [x] Confirm exact-release QA evidence exists but formal-pilot eligible evidence remains zero.
- [x] Identify duplicated model rules and cross-surface inconsistencies.
- [x] Fix the first blocking consistency defect before calibration analysis: dashboard recent recovery now requires independent (hint-free) correct answers, matching session/mastery eligibility.
- [ ] Freeze the resulting baseline as a named model configuration/version.

#### 12A.1b — Hinting & Remediation v2

- [x] Add versioned item-template remediation guides with skill-level fallback.
- [x] Standardize progressive Practice scaffolding: orient → strategy → analogous worked example.
- [x] Add safe raw-parameter interpolation with no derived-answer evaluation.
- [x] Add post-error routing from structured grader error codes where informative.
- [x] Expand remediation telemetry with context, hint level, guide scope/version, template identity and error code.
- [x] Deploy task-specific guides for all 8 current parameterized Chapter I templates, covering 80 published variants.
- [x] Preserve Diagnostic and Mastery Check as hint-free.
- [x] Preserve mastery thresholds and the 0.65 assisted-positive evidence multiplier.

Detailed implementation: `docs/sprint-12a-hinting-remediation-v2.md`.

#### 12A.2 — Calibration evidence contract

Define which evidence may enter calibration analyses.

Required dimensions:

- exact curriculum release;
- exact assessment blueprint where applicable;
- formal authorized cohort/tester scope;
- normal learner behavior rather than deliberate content-review behavior;
- attempt purpose (diagnostic/practice/mastery);
- hint/help use;
- item/variant exposure history;
- session completion/disposition;
- item/content QA state;
- learner/sample inclusion/exclusion reason.

QA, outside-cohort, abandoned/automation-artifact and deliberate reviewer sessions must be excluded from empirical parameter fitting.

#### 12A.3 — Calibration metrics

Specify release-aware metrics for:

- time/evidence needed to reach secure status;
- practice burden per skill;
- recovery frequency and stability;
- hint-assisted versus independent performance;
- diagnostic band versus later independent performance;
- Mastery Check pass/fail behavior;
- Mastery Check skill-level failure patterns;
- recommendation path accuracy;
- item difficulty and response-time behavior;
- exact-repeat/pool-exhaustion influence;
- threshold sensitivity.

#### 12A.4 — Analysis pipeline

Build read-only, provenance-aware analysis views or queries that:

- separate QA/context from formal calibration evidence;
- preserve curriculum release and blueprint identity;
- do not rewrite learner evidence;
- can reproduce every aggregate from underlying attempts/sessions/exposures;
- make sample size visible alongside every metric.

#### 12A.5 — Calibration decision protocol

Before changing a parameter:

1. state the hypothesis;
2. identify eligible evidence;
3. show sample size and limitations;
4. compare current behavior with candidate behavior;
5. record expected side effects;
6. approve or reject the change;
7. version the configuration if changed;
8. preserve historical interpretation.

If evidence is insufficient, the correct Sprint 12 result is **no-change / defer**, not forced tuning.

### 12B — Empirical Calibration

**Blocked until Sprint 11.5 produces sufficient formal learner evidence.**

Potential parameters include:

- mastery prior;
- mastery status thresholds;
- minimum evidence count;
- difficulty weighting;
- hint penalty;
- adaptive target-difficulty boundaries;
- recent-recovery rule;
- practice session length / early-completion rule;
- diagnostic bands;
- Mastery Check overall pass threshold;
- Mastery Check per-skill minimum;
- recommendation priority rules.

12B must never infer calibration from the informal external content-review stream.

## Current deployed model baseline — 2026-09-20

### Bayesian-style mastery state

Source: `supabase/functions/_shared/mastery.ts`.

- prior: alpha = **2**, beta = **2**;
- initial mastery score = **0.50**;
- evidence count < **3** → `insufficient_evidence`;
- score < **0.45** → `needs_support`;
- score < **0.72** → `developing`;
- score >= **0.72** → `secure`;
- evidence difficulty weight = `0.8 + 0.1 × difficulty`, giving **0.9–1.3** for difficulty 1–5;
- positive hinted evidence multiplier = **0.65**;
- incorrect evidence is not reduced by the hint factor.

### Practice scheduler

Sources: `get-session-item`, `start-learning-session`, `assessment-integrity.ts`.

- practice session planned length = **8**;
- desired difficulty:
  - mastery < 0.35 → difficulty 1;
  - mastery < 0.55 → difficulty 2;
  - mastery < 0.72 → difficulty 3;
  - mastery >= 0.72 → difficulty 4;
- one consecutive wrong answer lowers desired difficulty by 1;
- two or more consecutive wrong answers lower it by 2;
- exact-variant cooldown = **3** recent distinct variants;
- selection preference: unseen → spaced unresolved error → least-recent review → explicit pool-exhaustion repeat.

### Practice completion

A skill can complete through either:

1. mastery state:
   - evidence count >= **3**;
   - mastery score >= **0.72**;

or

2. recent independent recovery:
   - at least **4** unique items;
   - at least **5** recent answered items;
   - at least **4/5** recent answers correct **without hints**.

### Diagnostic interpretation

Current dashboard banding for two-item-per-skill diagnostic evidence:

- 2/2 = `strong`;
- 1/2 = `developing`;
- 0/2 = `needs_support`;
- no evidence = `not_assessed`.

These bands are simple engineering heuristics and are calibration targets, not validated proficiency classifications.

### Mastery Check

Sources: `start-learning-session`, `submit-mastery-answer`.

- **2 items per skill**;
- overall pass threshold = **80%**;
- minimum per skill = at least **1 correct item**;
- protected unseen-first / least-exposed selection;
- failed-check retest requires remediation for identified failed skills;
- prior passed Mastery Check makes the unit complete.

### Recommendation behavior

There are currently two related recommendation layers:

- `recommendation.ts` chooses among prerequisite review, more evidence, advance skill, and continue current skill from mastery state + prerequisites;
- the student dashboard prioritizes unfinished skills using diagnostic band + prerequisite resolution and active-session state.

Sprint 12A must document whether these are intentionally different scopes or need a shared policy abstraction before calibration.

## Current evidence snapshot — not calibration evidence

Exact current release currently contains QA activity:

- 3 exact-release sessions: 1 completed Diagnostic, 1 completed Practice, 1 active Practice;
- 30 attempts;
- 3 hinted attempts;
- 19 correct attempts;
- 17 independent correct attempts;
- 10 release-scoped mastery rows.

Formal pilot/calibration eligibility remains:

- **0 compatible formal-pilot sessions**;
- **0 closure-eligible sessions**;
- **0 eligible attempts**;
- **0 eligible exposure events**.

These QA counts may be used to validate the analysis pipeline mechanically, but not to tune model parameters.

## First consistency defect — fixed in 12A.1

The deployed learning logic is inconsistent about hinted answers in the recent-recovery path:

- `get-session-item` requires **4/5 independent correct** answers, explicitly excluding hinted answers;
- `start-learning-session` uses the same independent-correct rule;
- `get-student-dashboard` currently computes recent recovery as **4/5 correct** without loading/checking `hint_used`.

Result: the dashboard can mark a skill complete while the session eligibility logic still treats it as incomplete.

**Resolution — 2026-09-20:** `get-student-dashboard` now loads `hint_used` and counts only `correct && !hint_used` answers in the recent-recovery rule. A dedicated regression test locks the dashboard, practice-completion and Mastery-eligibility paths to the same hint-aware contract.

GitHub fix: `c8f5dc82bccbd5fefc49d34a772778f46c48199f`  
Regression test: `e44f6e97bd6dda9042a4f9c29eb7c224722e376f`  
Supabase: `get-student-dashboard` deployed as version **16**.

This was a consistency fix only; the **4/5** recovery threshold itself was not changed.

## Hinting evidence boundary — fixed 2026-09-20

A second 12A consistency/UX issue was identified in Practice:

- previously, the Help button remained available after a learner had already entered or selected an answer but before submission;
- opening Help at that point set `hint_level_used > 0`;
- a subsequently correct submission was therefore treated as assisted positive evidence and received the current 0.65 positive-evidence multiplier.

That created an avoidable accidental-penalty path.

**Resolution:**

- pre-submit Help is available only while the answer is still blank;
- once the learner types a value or selects an option, pre-submit Help is hidden/disabled;
- clearing the draft answer makes Help available again;
- after an incorrect submitted answer, `Բացատրել սխալը` remains available as before;
- the existing assisted-evidence weighting is unchanged;
- regression tests cover text/numeric and choice-input state changes.

This preserves a clean evidence boundary: **entered answer → independent submission**, while **Help first → assisted submission**.

GitHub implementation: `76ff5b6dc8430c83c345f63d2c27d4e7f69b98a3`  
UX copy: `9b08490794f29ad6417740fb8d67d6eb52a8ccdf`  
Regression test: `a9961993361d1fb84a104b2c9cef4f4842dd199b`

## Sprint 12 gating rule

- 12A may proceed now.
- 12B cannot start parameter tuning until formal evidence sufficiency is explicitly approved.
- Sprint 12 cannot be declared complete merely because the analysis framework exists.
- If formal evidence remains insufficient, Sprint 12 may close only with an explicit no-change/defer disposition after the evidence review.
