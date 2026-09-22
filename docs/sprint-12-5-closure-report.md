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
