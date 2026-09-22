# Sprint 12.5 Closure Report

**Disposition:** Conditional — implementation complete through 12.5W; 12.5X–Y remains open for authenticated browser-matrix QA.

## Passed evidence

- Universal immutable policy and three-attempt lifecycle are deployed.
- Required Review gates Attempts 2 and 3; Attempt 4 is rejected by schema and lifecycle state.
- Database-level retry-link and identity guards are active.
- Chapter Review is a separate session/evidence stream with deterministic cycles, exposure provenance and atomic Hinting v2.
- Review and Mastery item-purpose eligibility is explicit; live overlap is zero.
- Required and optional Reviews remain analytically distinct.
- Teacher reporting includes attempts, Review counts/history, skill evidence, current/lifetime coverage, exact repeats and pool exhaustion.
- Historical ambiguity remains `legacy_attempt_history`; no attempt history is fabricated.
- Browser roles cannot read the new reporting views directly.
- Focused tests, full CI, deployment, production-asset and unauthenticated API probes pass.

## Live invariant snapshot — 2026-09-22

| Invariant | Result |
| --- | ---: |
| Attempt 4 rows | 0 |
| Invalid historical attempt rows | 0 |
| Review/Mastery item overlap | 0 |
| Review coverage rows | 1 |
| Exact Review repeats | 0 |
| Pool-exhaustion events | 0 |

## Open closure gate

Run authenticated learner and teacher workflows at desktop and mobile widths:

1. required Review after failure;
2. Review completion and retry unlock;
3. optional Review after pass or final failure;
4. learner coverage copy and absence of Attempt 4;
5. teacher Review summary/history/skill/coverage rendering;
6. keyboard, overflow, console and network-error checks.

The current environment had no executable browser and no tester credentials. Static source checks and production asset verification are not substitutes for this walkthrough. Sprint 13 remains blocked until the matrix is recorded as passed.


## QA defect correction — 2026-09-22

Authenticated voluntary Chapter Review QA exposed a blocking integration defect: the legacy shared item-exposure pipeline still limited `student_item_exposure_events.purpose` and `service_record_item_exposure` to `practice`, `diagnostic` and `mastery_check`, so the first Review question failed while being recorded as served.

Corrected by migrations `0076_sprint_12_5_chapter_review_exposure_integration.sql` and `0077_sprint_12_5_chapter_review_exposure_runtime.sql`. `chapter_review` is now supported by served-item exposure, answer exposure finalization and help exposure. Focused regression coverage was added. Rollback-only production probes against the active Chapter Review session verified serve → finalize/help exposure and the full graded-attempt transaction without persisting QA evidence.

Runtime provenance: `runtime-2026-09-22-r11`. No learning parameter, Review selection rule, mastery threshold or three-attempt lifecycle rule changed.

The authenticated browser matrix remains the closure gate; this defect must be rechecked in the learner browser before Sprint 12.5 is declared complete.
