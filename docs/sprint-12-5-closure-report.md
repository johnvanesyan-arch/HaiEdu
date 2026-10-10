# Sprint 12.5 Closure Report

**Disposition:** ✅ Complete — 12.5A–Z, closed 2026-09-23. [Current delivery and release gates](project-status.md).

The September 22 sections below are historical checkpoints. Their pending gates were subsequently closed by the [final closure evidence](#final-closure--2026-09-23); the original observations are retained for chronology.

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

## Historical open closure gate — 2026-09-22

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


## Authenticated desktop browser QA — 2026-09-22

The production learner and teacher flows were exercised at a 1363 × 936 browser viewport.

Passed:
- optional post-pass Chapter Review opens and serves a real question;
- atomic Hinting v2 records and renders successive help stages;
- mastery remains confirmed while an optional Review is active;
- learner and teacher pages have no page-level horizontal overflow;
- teacher summary, history, coverage, assistance and skill-evidence views render the active Review correctly;
- the deployed learner Review now hides internal skill/item identifiers and uses natural Armenian help copy;
- `get-remediation-help` v9 and the production frontend correction are live; focused Sprint 12.5 tests pass 29/29 and Vercel reports success.

Two gates remain open and are not waived:
- authenticated mobile-width learner and teacher rendering, because the available browser cannot emulate a mobile viewport;
- rendered required-Review/retry-unlock and final-failure states, because the available learner is already in the passed/optional-Review branch and no disposable seeded lifecycle account is available.

Browser-extension metadata errors were excluded as harness noise. The application emits repeated Supabase `Multiple GoTrueClient instances` warnings; these did not break the tested workflows but remain a front-end cleanup item. Sprint 13 remains on hold.


## Final closure — 2026-09-23

The [detailed specification](sprint-12-5-universal-chapter-review-mastery-retry.md) records the subsequent required-Review/retry-unlock and terminal-failure closure, including satisfied Review requirements, no Attempt 4 and voluntary Review after final failure. The 12.5Z correction adds persisted MCQ presentation and server-side position resolution without rewriting historical attempts.

Authenticated **[Mobile browser QA #2](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35866315244)** passed on `0c56fa8ba0bc79d88af85cf2583ceeeb2fb206d2` on 2026-09-23. The learner/teacher projects cover **390 px and 430 px** in [Playwright configuration](../playwright.config.js); job `107198700361` (`mobile-production-smoke`) passed. [CI #691](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/35866225521) also passed for that commit. The existing Sprint 12.5 Notion closure and roadmap record A–Z complete, including assessment-integrity browser acceptance.

This closes the former Sprint 12.5 browser gate. It does not approve external Physics SME review or promote the Chapter I pilot release. The historical GitHub run was re-read on 2026-10-10 during documentation reconciliation, not rerun or relabeled as fresh current-production QA. [Captured audit evidence](evidence/documentation-status-audit-20261010.json).
