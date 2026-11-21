# Legacy learning start: lifecycle query repair — 21 November 2026

**Prepared locally, not released.** This is a separate repair based on main `f7f39df79f448f2e9b86d4d3e42be59d5cf3fda4`, independent of the teacher view and the Chapter I I-2 proposal. It does not change scoring, readiness, attempt limits, review rules, registry settings or database structure.

## Problem and bounded repair

The legacy `start-learning-session` route filters `chapter_mastery_states` by `assessment_policy_binding_id`, a column that the table does not have. The review query reports `chapter_review_not_available` (409); the mastery query reports `mastery_lifecycle_unavailable` (500).

Remove that filter from those two lifecycle queries only. Keep the student, curriculum release and unit restrictions, matching the table's unique key in `0061_sprint_12_5_mastery_lifecycle_foundation.sql`. All four valid `assessment_policy_binding_id IS NULL` filters on `learning_sessions` remain. Governed learning continues to return through its existing route before this legacy code.

## Verification

`tests/legacy-start-lifecycle-schema.test.mjs` runs the two actual query expressions from the handler against PGlite using the lifecycle table definition extracted verbatim from its real migration. Only foreign-key parent identity tables are minimal test doubles. It also checks other students, releases and units and the no-match case.

- Before the repair: both regression tests fail with PostgreSQL `42703`, `column "assessment_policy_binding_id" does not exist`.
- After the repair: both pass. The focused lifecycle, review, retry, readiness and access suite passes **30/30**.
- `node scripts/check-browser-qa-triggers.mjs`: passes; no missing dependency paths.
- `git diff --check`: passes.

The focused regressions are isolated query/schema tests. A separate fresh local run now qualifies the actual learner journey on source `bec8536c`, using compiled pages, real Auth, PostgREST and Edge Functions with synthetic accounts and catalogue data:

- A real diagnostic and old-rule first check complete; 16/20 fails.
- A premature retry is refused with `409 / chapter_review_required`.
- The native 12-question required review completes.
- Attempt 2 passes at 18/20, with no questions reused from attempt 1.
- A second learner independently passes a first check at 18/20.
- Database readback confirms 112 actual answers across six completed sessions, unchanged old result rules, zero remaining Auth sessions and removal of owned containers/network.

No historical result was seeded, and no I-2 migration or activation occurred. The local endpoint configuration changes the staging build identity; the candidate source itself is unchanged. [Sanitized local evidence](evidence/legacy-start-lifecycle-repair-20261121.json). Storage/mail journeys, Safari and hosted behavior were not exercised. Full PR CI, merge approval and specific endpoint deployment approval remain pending. Production QA was not run (paused by owner).

## Read-only deployed-source inventory

Supabase `get_edge_function` reports the live `start-learning-session` as **ACTIVE, version 34**, updated **13 November 2026, 10:02:45.303 UTC**. Both invalid filters are present. No production request was sent through the learning route, and no learner data or settings were read or changed.

Before applying this repair, the entrypoint and all **12** bundled shared-source files are byte-for-byte identical to the main base above: rate budget, governed runtime, student context, assessment policy, assessed-audio policy, diagnostic gate, initial diagnostic, auth, course access, recommendation telemetry, curriculum release and assessment integrity. Thus no unrelated repository-source change is required to deploy this candidate. The unchanged `npm:@supabase/supabase-js@2` external dependency's resolved build was not independently inventoried; source equivalence is not an assertion of binary bundle identity.

Candidate entrypoint SHA-256: `f83c472391ceaa9b5d64390c70dd08f70a50d874165bf6a57ce36a1772c91c3a`.

Any later release needs explicit approval for deploying this endpoint, confirmation that the deployed version has not changed, and deployed-source readback after the approved deployment. No other Edge Function source or shared module changes in this repair.

Affected production QA by the existing workflow path map: `mobile-browser-qa`, `resource-assignments-acceptance`, `english-unit1-pilot-read-acceptance`, `english-unit2-pilot-read-acceptance`, `english-unit3-pilot-read-acceptance`. Production workflows remain paused; this record does not authorize running them.
