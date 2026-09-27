# Enrolment consistency correction — 2026-09-28

## Cause and deployed correction

School-enrolled students could load their diagnostic result through the updated dashboard but received `course_access_required` from mastery status and submission. Those two deployed bundles still contained the legacy-only course-access helper despite current repository source supporting institutional enrolments.

Rebundled unchanged repository entrypoints with the current shared dependencies from main `f6a5e3505c60ea14d8393d0e92ba57ccf4ad0a41`:

| Function | Previous version | Corrected version |
| --- | --- | --- |
| get-mastery-check-status | 9 | 10 |
| submit-mastery-answer | 5 | 6 |

Both deployments are ACTIVE with JWT verification enabled. Deployed entrypoints and every dependency were read back and match the pinned repository source exactly. Unauthenticated POSTs return 401. Read-only production verification found one active, date-valid Physics 7 enrolment linked to an active class. No learner records, scores, diagnostic attempts, or learning criteria changed.

## Platform-wide audit

All ten direct consumers of `_shared/course-access.ts` were inspected in repository and deployed source. No transitive consumers were found.

| Consumer | Version after correction | Course-access helper |
| --- | --- | --- |
| get-student-classes | 7 | Current |
| join-class | 6 | Current |
| get-student-dashboard | 21 | Current |
| start-learning-session | 22 | Current |
| get-session-item | 15 | Current |
| submit-answer | 16 | Current |
| get-remediation-help | 11 | Current |
| get-chapter-mastery-lifecycle | 2 | Current |
| get-mastery-check-status | 10 | Corrected |
| submit-mastery-answer | 6 | Corrected |

Other bundle differences in this consumer set were only a trailing blank line in two auth helpers and a TypeScript-only `chapter_review` union member in two curriculum helpers; their runtime behavior is identical. No runtime scope exception is needed. Teacher and administrative authorization remains role-specific and is not replaced with student course access.

All eight browser consumers of mastery status were reviewed: assessment, progress, physics-7, multi-subject-home, mastery-dashboard, home-dashboard, mastery, and practice. Assessment, Progress and the course page now show unavailable status instead of inferred locked/readiness states when status is missing. Assessment does not invent empty mastery history; its retry link reloads status. Home course cards preserve diagnostic results while disclosing unavailable mastery. The legacy mastery card clears stale route hints and offers a status recheck. Home dashboard and mastery already report request errors; practice already reports unavailable status and relies on authoritative server action gates.

## Verification and limits

Thirteen new executable regression tests cover institutional-only access, legacy compatibility, duplicate membership, student/subject/grade boundaries, ended/expired/future enrolments, archived classes, lookup failures, both mastery handlers, revoked sessions, and unavailable/recovered UI states while preserving a completed 16/20 diagnostic.

These are isolated tests with simulated database/auth responses, plus deployed-source and read-only production checks. They do not constitute a signed-in student end-to-end test. Existing Sprint 14 authenticated QA gates remain open. Full CI and production frontend deployment evidence is recorded in the PR and Sprint 14 checkpoint.

## Standing policy

System changes apply across every affected platform surface. Proposed exceptions must be explained to John for a decision. This policy is recorded in root AGENTS.md and docs/deployment-workflow.md, including the requirement to audit and verify every affected deployed shared dependency.
