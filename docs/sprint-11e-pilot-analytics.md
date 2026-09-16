# Sprint 11E — Pilot analytics and item-quality evidence

**Status: ✅ Complete.**

Sprint 11E turns the existing exposure/attempt telemetry into an admin-facing operational evidence layer for the closed Grade 7 Physics Chapter I pilot. These metrics are explicitly **pilot operational evidence, not validated psychometrics**.

## Scope implemented

- Per concrete item/variant exposure count and distinct learner count.
- Answered/correct/incorrect counts and operational correctness rate.
- Average and median response time where recorded.
- Help/hint use and help-use rate.
- Purpose-specific exposure counts for Practice, Diagnostic and Mastery Check.
- Exact-repeat count/rate using the concrete item identity seen repeatedly by the same learner.
- Unanswered exposures plus abandoned-session and completed-session unanswered signals.
- First-time vs repeated correctness rates for a basic memorisation-risk signal.
- Item retirement/replacement identity remains visible while historical attempts/exposures remain attached to the original item.

## Operational flags

The content-admin evidence view can flag:

- `high_exposure`
- `unexpectedly_easy`
- `unexpectedly_hard`
- `frequently_missed`
- `high_help_use`
- `high_exact_repeat`
- `possible_memorisation_signal`
- `unanswered_signal`

Thresholds are engineering defaults for pilot triage. They are not item-calibration cut scores and must not be presented as psychometric validation.

## Assessment-integrity report

The integrity summary includes:

- distinct learners represented in exposure evidence;
- total exposures;
- exact-repeat count/rate;
- explicit `pool_exhausted_exact_repeat` fallback count;
- protected Mastery-pool exposure count;
- protected-pool leakage count, which should remain zero;
- unanswered exposure count;
- active pool capacities;
- Diagnostic form usage by form/version.

## Access control

`get-pilot-item-analytics` requires:

- a valid JWT;
- an active live session;
- `admin` or `content_admin` role.

The underlying `service_get_pilot_item_analytics` RPC is executable only by the service role.

## 11D activation completed before 11E

The reviewed Chapter I bank was activated in migration `0032_sprint_11d_activate_reviewed_bank.sql` only after all 180 new candidates had current-version technical QA PASS and human approval.

Final active per-skill capacity is exactly:

- 12 Practice variants;
- 4 Diagnostic variants;
- 8 protected Mastery variants.

Across 10 skills, the active pools contain 120 Practice, 40 Diagnostic and 80 protected Mastery items. Diagnostic A/B v1 were retired and reviewed v2 forms were activated with 20 items each and zero exact overlap.

## Exit state

Sprint 11E is complete when the analytics RPC, protected admin endpoint, content-admin UI, integrity report and regression coverage are live. The next development stage is Sprint 11F: deferred authenticated browser/device QA plus the closed Grade 7 Physics Chapter I pilot.
