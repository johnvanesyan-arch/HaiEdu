# Single initial diagnostic — policy v1

Decision: 2026-09-27. Supersedes the diagnostic retake/rotation behavior documented in Sprint 11B. Mastery and Review policies are unchanged.

## Learner contract

- One completed diagnostic per student and chapter (`student_id`, globally unique `unit_code`). A release change or new academic year does not reset the baseline.
- Physics 7 Chapter I retains both existing forms, with 20 distinct questions and two questions per skill in each. All 40 diagnostic items remain reserved for diagnosis; the Practice/Review pool remains 120.
- Choose the initial form with a deterministic hash of policy version, student ID and chapter code over forms sorted by code/ID. This distributes learners across the available forms; it does not guarantee exact 50/50 allocation in each classroom.
- Form identity, version, question order and saved answers persist with the session. An unfinished diagnostic resumes unchanged. No question mixing between forms.
- Completion counts regardless of score. This is a baseline, not a pass/fail or chapter-completion assessment.
- Retake controls are removed. Stale start requests return the existing baseline instead of opening another session.
- A completed result remains viewable even while another learning session is active.
- No new prerequisite lock on Practice is introduced. The diagnostic date is retained; a result obtained after Practice must not be described as a clean pre-practice measure.

## Integrity and history

The service-only, security-invoker `start_initial_diagnostic_atomic` RPC validates the complete form against the released blueprint and inserts the session and all items in one transaction. Advisory locking serializes diagnostic starts; unique indexes independently enforce one active and one completed diagnostic per learner/chapter. A trigger blocks completed-baseline rewriting and further diagnostic creation.

The migration performs no answer, session or assessment-bank rewrites. It deliberately fails if historical duplicate active/completed diagnostics exist, rather than silently deleting records. The pre-release production audit found one completed diagnostic and no active diagnostics. Account deletion continues to follow existing governed deletion procedures; no reset control is added.

The compatibility API field `latestDiagnostic` now means the first completed diagnostic. Student readout is independent of recent-activity limits. Legacy teacher queries fetch the authorized learners' baseline separately; institutional teacher analytics still restrict evidence to the exact authorized school/year/class/assignment/release context. Historical evidence is never moved across tenant boundaries to populate a missing card.

Both forms remain provisionally parallel: matching skill counts do not establish equal difficulty. Form identity remains in session metadata for future analysis.

## Verification and release

Focused tests exercise both forms, stable assignment, saved progress, first-baseline selection, zero-score completion, duplicate prevention, scope isolation, complete-form validation, transaction rollback, service-only RPC permissions, and UI result/resume states. Existing selection and institutional authorization regressions also run.

Release order: database migration; updated start/student-dashboard/teacher-dashboard/teacher-student functions with their shared dependencies; runtime provenance binding; production frontend. Do not remove database protections when rolling back a frontend. Retain already-completed baselines and use a forward fix for policy changes.

This release is separate from PR #43's pending Chapter Review selection revision and does not close Sprint 14's outstanding authenticated or school-wide analytics gates.

## Deployment verification — 2026-09-27

Backend functions: start-learning-session v21, get-student-dashboard v20, get-teacher-dashboard v15, get-teacher-student v10. Runtime binding: runtime-2026-09-27-initial-diagnostic-v1, implementation source ba043ad63fd6f1e28cafe014df12d62d7ff648c6. Database checks confirm both unique indexes, service-only RPC execution and completed-baseline responses. Live inventory confirms 20 questions and two questions for each of ten skills in both forms.

The isolated SQL/UI regression tests cover new-session creation and resume. A live rollback-only new-session probe could not run because no enrolled Physics 7 learner was eligible without an existing session or diagnostic; it persisted no changes. Authenticated learner end-to-end verification remains a separate QA item.
