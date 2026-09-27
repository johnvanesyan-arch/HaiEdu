# Chapter diagnostic prerequisite for Practice

Requested September 27, 2026. Every learner must complete the initial diagnostic for a chapter before using its Practice or Chapter Review. Completion unlocks access at any score, including zero. An unfinished diagnostic, another learner's diagnostic, or completion in another chapter does not unlock access. There is no teacher, class, school, subject, or grade exemption.

The database rule uses learner ID and the full chapter code (which includes subject and grade), matching the existing single-initial-diagnostic policy across releases and academic years. Physics 7 is currently the only released learning engine; other course catalog entries remain unavailable until their own authorized content is released. Future chapters cannot insert practice sessions without their own diagnostic baseline.

## Enforcement and continuity

- Shared API check runs before Practice/Review start or resume, question delivery, answer processing, and hints. History lookup failures deny access.
- Database triggers independently guard session creation/progression, session-item writes, and answer inserts. Legacy sessionless attempts require exact blueprint chapter context and its completed diagnostic.
- Existing unfinished Practice/Review remains saved. It is suppressed from actionable dashboard state until diagnostic completion. Diagnostic creation ignores only these locked practice modes, retaining conflicts with other assessments. The diagnostic's existing atomic assignment and resume behavior remain intact.
- Student topic actions, Home routing, and direct Practice/Review links lead to the diagnostic prerequisite. Existing completed diagnostic results and teacher analytics remain unchanged.
- No historical answers, sessions, scores, exposure histories, or baseline results are deleted or backfilled. Students who practised before this rule still have that history; their later diagnostic cannot be described as a pristine pre-practice baseline.
- A chapter without an available diagnostic stays locked. Content release must include a usable diagnostic.

## Verification

Database execution tests cover multiple subject/grade/chapter codes, zero-score completion, student isolation, incomplete diagnostics, preserved unfinished practice, atomic diagnostic creation/resume beside locked practice, sessionless bypass prevention, and service-only invoker permissions. Request-handler tests invoke all four guarded endpoints for Practice and Chapter Review and verify rejection before content/answer processing, plus fail-closed history errors. UI tests verify direct entry cannot resume saved practice before completion. Existing single-diagnostic tests remain passing.

## Production release — September 27, 2026

PR #46 merged as fb1b0948b43a0e1c254832e51400d3b0c550c765. Implementation source commit: 34e8fde14ec3948fa70aa277120f45ce9d110583. Final CI run 911 (36343496579) passed all 481 tests, typecheck, and browser JavaScript syntax checks. Vercel production deployment EDVqEZDVQup4udaxDrex8rkjcySz succeeded.

Applied both chapter_diagnostic_practice_gate and chapter_diagnostic_practice_gate_runtime migrations. Active functions: start-learning-session v22, get-session-item v15, submit-answer v16, get-remediation-help v11, get-student-dashboard v21. All retain verify_jwt=true. Runtime binding is runtime-2026-09-27-diagnostic-practice-gate-v1.

Live read-only checks confirm all three database triggers are installed, new functions are invoker/service-only, an existing completed diagnostic unlocks its chapter, unrelated chapter access remains locked, and the existing three learning-session records remain present. All five unauthenticated HTTP probes returned 401. The production Practice, Physics 7, and Home-router scripts contain the prerequisite UI.

Post-deployment advisors reported no database warning from these functions/triggers. They reported service-only tables with RLS but no policies (INFO) and disabled leaked-password protection (Auth WARN; separate from this change). The pre-deployment advisor call timed out, so no before/after comparison is claimed.

Full signed-in new-learner end-to-end verification remains pending. Automated API handlers use simulated authenticated requests; SQL behavior tests execute real PostgreSQL via PGlite. No production learner history was fabricated for QA.
