# Sprint 6 — Mastery Checks

## Objective
Verify that Chapter I learning persists after practice through a separate independent assessment.

## Mastery-check design

- Mode: `mastery_check`
- Length: 20 questions
- Coverage: 2 questions from each of the 10 Chapter I micro-skills
- Help/hints: disabled
- Immediate correctness feedback: disabled
- Duplicate questions inside one check: prohibited
- Item selection: prefer items least recently seen by the learner, so recent practice items are avoided where the bank allows

## Provisional pass rule

A learner passes only when both conditions hold:

1. overall result is **80% or higher**; and
2. every micro-skill has at least **1 correct answer out of 2**.

These thresholds are engineering defaults for the prototype, not validated psychometric cut scores. Sprint 12 will calibrate them against pilot data.

## Retry rule

A failed check records up to three priority remediation skills. A new mastery check is blocked until the learner completes a bounded practice session for every required remediation skill after the failed check.

This prevents `fail -> immediate retest -> fail` loops and requires additional learning evidence between attempts.

## Unit-completion rule

Chapter I is not considered fully complete merely because the underlying practice mastery scores are secure. Final unit completion requires a **passed mastery check**.

## Backend

- `learning_sessions.mode` now supports `mastery_check`.
- `learning_sessions.assessment_result` stores `passed` / `failed`.
- `learning_sessions.score_percent` stores the final percentage.
- `start-learning-session` creates or resumes eligible mastery checks and enforces retry rules.
- `submit-mastery-answer` suppresses correctness during the assessment and evaluates pass/fail after the final response.
- `get-mastery-check-status` exposes eligibility, latest result, required remediation and unit-completion state.

## Frontend

- `web/mastery.html` / `web/mastery.js` provide a separate assessment surface.
- The main dashboard receives a Mastery Check card through `web/mastery-dashboard.js`.
- If remediation is required after a failed check, the dashboard can start the first required targeted practice session and then return to the existing adaptive practice flow.

## QA requirements

1. Mastery Check remains locked while Chapter I skills are incomplete.
2. Once all skills are ready, a 20-question check can start.
3. No exact question repeats inside the check.
4. Recent items are avoided when alternatives exist.
5. No help control appears.
6. No correct/incorrect feedback appears before the final item.
7. 80%+ with at least 1/2 per skill passes.
8. A result above 80% with a 0/2 skill still fails.
9. A failed check blocks immediate retry.
10. Required remediation practice unlocks the retry.
11. Passing changes Chapter I to unit-complete.
