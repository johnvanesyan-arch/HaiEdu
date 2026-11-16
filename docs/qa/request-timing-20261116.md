# BF-21 — deterministic legacy Home request-isolation checks

The owner approved this follow-up on 16 November 2026. The repair is locally verified in the affected native browser tests; all 1,856 code tests also pass. Exact-head CI and merge remain pending. No application or hosted behavior is changed.

## Failure and cause

[PR501 CI attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43838470088/attempts/1) passed 700 of 701 browser tests. The legacy Home test expected exactly one initial `get-student-classes` request, but saw two. Its synthetic service waits 60ms, while two independently loaded modules both request class access. If the second module starts after the first response completes, the real access store correctly performs a fresh read: it shares pending work and deliberately does not cache completed permissions.

The new opt-in fixture imports the real Home card, waits for its first class response to finish, then imports the real course shell. It waits for the shell's actual published result because a module's top-level await does not delay the page load event. This completion barrier makes the prior `2 !== 1` assertion fail on demand without a longer sleep or repeated attempts.

## Repair

Both normal and deliberately late module loading are covered. Before the sharing assertion, both real consumers must have rendered their initial access result. The test then holds a refresh response open and checks that exactly one service request is in progress. It does not assume a particular initial request count for independently loaded modules. The explicitly late case must show two completed, sequential request waves, proving fresh authorization after settlement.

The old account's held response contains a class membership. The test allows the new account's fresh request to finish first and checks its rendered card and published enrollment. Only then is the old response released. Both consumers must retain the new account's empty class membership and correct enrollment. Pending-request counts and completion order are checked, and page errors still fail the test.

Only the browser test and its synthetic fixture change. The fixture's two consumers are the request-isolation and request-count browser files; both were exercised. The shared access store, Home modules, Auth behavior, service implementation and compiled application assets are unchanged. This is a test-harness repair, not a product permission-cache change.

## Verification

All **18 native browser tests** in the two affected files pass, including both loading orders and the existing Home/course/join/teacher request-count and isolation cases. The old test fails with the controlled late-module fixture. Two local negative controls replace only the JavaScript served by the isolated fixture: removing pending-read coalescing fails both new cases; retaining a completed result fails the late-module case. These deliberately broken variants are not repository or deployment changes. They confirm that the repaired test still rejects duplicate pending work and inappropriate completed-result reuse.

Typecheck, teacher-bundle parity, web asset/archive integrity, browser QA dependency coverage, public-email scan and whitespace checks pass. All 1,856 code tests pass with no failures, skips or cancellations; exact-head CI and merge remain pending. The [sanitized receipt](../evidence/request-timing-20261116.json) preserves source hashes, local log hashes, counts and the distinction between expected negative-control failures and passing tests. Existing PR500/501 writing/audio and shutdown evidence is retained; this delivery does not rerun those local journeys unless required CI calls them.

## Boundaries

Native Chromium executes original browser modules against synthetic local identities and services. This is not a hosted sign-in, real Supabase acceptance, classroom-capacity check or owner usability decision. No application source, package input, database schema, backend runtime, hosting setting or paid service changes. No production QA workflow is dispatched.

Production QA not run (paused by owner). Affected production QA: none. Owner usability acceptance: not given. Wider BF-21 resource workflows, additional formats, hosted adoption and migration work remain open.
