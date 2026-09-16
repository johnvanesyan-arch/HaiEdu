# Pre-Sprint 11F QA — Grade 7 Physics Chapter I

**Date:** 2026-09-16  
**Scope:** pre-pilot technical QA after Sprint 11E and before the closed Sprint 11F cohort. Real student/teacher feedback is intentionally excluded from this gate.

## Verdict

**Automated / database / security pre-pilot gate: PASS after one blocking defect was fixed.**

This is **not** a claim that the deferred authenticated cross-browser/device/keyboard matrix has been executed. The rendered-browser matrix in `docs/pilot-browser-qa-checklist.md` remains an open Sprint 11F activity.

## QA performed

### Repository and deployment baseline

- `main` was reviewed at the current post-11E production state.
- The existing CI suite already covers grading, mastery, practice selection, security/privacy, student shell, teacher UI, Sprint 10.5F responsive/accessibility source invariants, and Sprint 11A–11E regressions.
- The current production code uses JWT-protected Supabase Edge Functions.
- Vercel production deployment status is tracked through the GitHub commit status integration.

### Active question-bank integrity

Live database checks passed:

- 240 active unique Chapter I items.
- 0 active items missing Armenian prompt text.
- 0 active items missing normalized template/variant identity.
- 0 active items missing a primary curriculum scope.
- 0 active items missing an answer key.
- 0 active items with an invalid lifecycle state; active items are published, non-retired and approved.
- 0 cross-purpose item overlaps between Practice, Diagnostic and Mastery.
- 0 unprotected Mastery memberships.
- 0 protected non-Mastery memberships.

Current active capacity remains:

- Practice: 120 items / 12 per skill.
- Diagnostic: 40 items / 4 per skill.
- Protected Mastery: 80 items / 8 per skill.

### Diagnostic-form integrity

Both active reviewed Diagnostic forms passed structural checks:

- `PHY7-U01-DIAG-A` v2: 20 items, 10 skills, exactly 2 items per skill.
- `PHY7-U01-DIAG-B` v2: 20 items, 10 skills, exactly 2 items per skill.
- Exact item overlap between A and B: 0.

### RLS / access-boundary review

Key learner, assessment and exposure tables have RLS enabled. The review confirmed:

- learner exposure history is student-scoped for learner reads;
- assessment-pool membership is restricted to privileged content/admin roles rather than exposed to students;
- ordinary published-item and option reads exclude protected Mastery items;
- Mastery content therefore remains outside ordinary Practice/public read paths;
- service-authoritative endpoints retain JWT and active-live-session checks.

`item_curriculum_scopes` is intentionally RLS-enabled with no client policy, which is deny-by-default and not a data-exposure finding.

### Session-collision QA — blocking defect found and fixed

A server-side defect was found in `start-learning-session`: when a learner already had an active same-unit session in a different mode, the endpoint could mark that active session `abandoned` before starting the requested mode. The browser UI already tried to prevent this path, but the backend remained vulnerable to direct calls, stale UI state and races.

The endpoint now fails closed:

- same-mode request resumes the existing active session;
- different-mode request returns `409 active_session_conflict` and the existing session metadata;
- the existing active session is not mutated or abandoned.

Regression coverage was added in `tests/pre-sprint-11f-qa.test.mjs`, and the updated `start-learning-session` function was deployed as an authenticated Supabase Edge Function.

Live database inspection also found no learner/unit with more than one currently active session.

## Supabase advisor findings

### Security hardening warning — open, non-blocking for this controlled QA gate

Supabase reports **Leaked Password Protection disabled**. This should be enabled before broader external rollout if the project plan permits it. It is an authentication-hardening item rather than a defect in the Chapter I learning engine.

### Performance / policy-lint debt — non-blocking for the small closed pilot

The performance advisor reports multiple unindexed foreign keys, RLS init-plan optimization opportunities, unused indexes and multiple-permissive-policy warnings. No current correctness failure was found from these warnings. They should be addressed selectively from observed query plans/latency rather than by bulk indexing or policy rewrites during the pre-pilot gate.

## What this QA does not claim

The following remain deliberately open and must not be represented as passed based only on source-level tests:

- authenticated rendered smoke testing in Chromium plus Firefox/Safari-class browsers;
- actual tablet and phone viewport/device checks;
- keyboard-only traversal in a real browser;
- 200% text zoom and 320–390 px Armenian overflow inspection in a rendered browser;
- visual regression inspection for SVGs, clipping, sticky/mobile navigation and focus presentation;
- real student usability feedback;
- real teacher workflow/usefulness feedback.

The first five items belong to the deferred Sprint 11F browser/device QA matrix. Student/teacher feedback can remain deferred until the controlled cohort is run.

## Pre-pilot disposition

After the session-collision fix, no blocking defect was found in the automated/source, active-bank integrity, diagnostic-form integrity, RLS/access-boundary or live-data checks performed here.

**Next gate:** execute the authenticated cross-browser/device/keyboard smoke matrix, then run the closed Chapter I pilot. Real student/teacher feedback is not required for this pre-pilot QA report.
