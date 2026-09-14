# Sprint 7 — Teacher Dashboard v1

## Objective
Give teachers useful visibility into Grade 7 Physics Chapter I learning without exposing protected answer keys or students outside their classes.

## Implemented

- Teacher-only dashboard at `web/teacher.html`
- Teacher role verification in every teacher Edge Function
- Teacher-owned classes
- Per-class 8-character join code
- Student join endpoint and standalone `web/join.html`
- Student roster
- 10-skill class mastery matrix
- Recent-activity / recent-accuracy summary
- Weak-skill prioritization
- Deterministic recommended intervention
- Individual student drawer with:
  - skill mastery status
  - latest diagnostic
  - latest mastery check
  - current/previous sessions
  - recent attempts
  - help-use indicator
- Class creation and join-code rotation
- Student removal endpoint
- Teacher RLS access to bounded-session evidence for own students
- Automated tests for mastery-band classification and intervention priority

## Intervention priority v1

1. Passed mastery check → unit complete
2. Active session → finish active session
3. No attempts → take diagnostic
4. Weak/unassessed skill → practice highest-priority skill
5. All skills secure → mastery check

Weak-skill ordering is provisional:

`needs_support → not_assessed → developing → secure`

Within a band, lower mastery percentage is prioritized.

## Privacy / authorization

Teacher aggregate and student-detail endpoints use the service role only after verifying the authenticated caller is a teacher/admin and owns a class containing the requested student. Correct answer keys are never returned.

## Current limitation

There is no self-service teacher-role elevation. New accounts are students by default. A teacher account must be explicitly provisioned/promoted by an administrator. This is intentional; otherwise any learner could grant themselves teacher access.

## Live QA gate

A real teacher account and at least one class membership are required to complete browser QA.

Test sequence:

1. Provision a separate teacher account.
2. Open `/teacher.html` and sign in.
3. Create a Grade 7 Physics class.
4. Confirm an 8-character join code appears.
5. Sign in with a student account and open `/join.html`.
6. Join using the code.
7. Refresh the teacher dashboard and verify the student appears.
8. Confirm the 10-skill matrix reflects the student's existing Chapter I history.
9. Open the student profile drawer and verify recent attempts, mastery, weak skills and recommendation.
10. Confirm a teacher cannot fetch a student who is not in one of their classes.
