# BF-21 — deterministic legacy Home request-isolation checks

The owner approved this follow-up on 16 November 2026. The repair is merged and verified in owner-approved [PR502](https://github.com/johnvanesyan-arch/HaiEdu/pull/502) at `60e653c10cc27d10f3a737c882145bade41f57a7`. The exact release evidence is below. No application or hosted behavior is changed.

## Failure and cause

[PR501 CI attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43838470088/attempts/1) passed 700 of 701 browser tests. The legacy Home test expected exactly one initial `get-student-classes` request, but saw two. Its synthetic service waits 60ms, while two independently loaded modules both request class access. If the second module starts after the first response completes, the real access store correctly performs a fresh read: it shares pending work and deliberately does not cache completed permissions.

The new opt-in fixture imports the real Home card, waits for its first class response to finish, then imports the real course shell. It waits for the shell's actual published result because a module's top-level await does not delay the page load event. This completion barrier makes the prior `2 !== 1` assertion fail on demand without a longer sleep or repeated attempts.

## Repair

Both normal and deliberately late module loading are covered. Before the sharing assertion, both real consumers must have rendered their initial access result. The test then holds a refresh response open and checks that exactly one service request is in progress. It does not assume a particular initial request count for independently loaded modules. The explicitly late case must show two completed, sequential request waves, proving fresh authorization after settlement.

The old account's held response contains a class membership. The test allows the new account's fresh request to finish first and checks its rendered card and published enrollment. Only then is the old response released. Both consumers must retain the new account's empty class membership and correct enrollment. Pending-request counts and completion order are checked, and page errors still fail the test.

Only the browser test and its synthetic fixture change. The fixture's two consumers are the request-isolation and request-count browser files; both were exercised. The shared access store, Home modules, Auth behavior, service implementation and compiled application assets are unchanged. This is a test-harness repair, not a product permission-cache change.

## Verification

All **18 native browser tests** in the two affected files pass, including both loading orders and the existing Home/course/join/teacher request-count and isolation cases. The old test fails with the controlled late-module fixture. Two local negative controls replace only the JavaScript served by the isolated fixture: removing pending-read coalescing fails both new cases; retaining a completed result fails the late-module case. These deliberately broken variants are not repository or deployment changes. They confirm that the repaired test still rejects duplicate pending work and inappropriate completed-result reuse.

Typecheck, teacher-bundle parity, web asset/archive integrity, browser QA dependency coverage, public-email scan and whitespace checks pass. All 1,856 code tests pass with no failures, skips or cancellations; exact PR-head and merged-source CI also pass, as recorded below. The [sanitized receipt](../evidence/request-timing-20261116.json) preserves source hashes, local log hashes, counts and the distinction between expected negative-control failures and passing tests. Existing PR500/501 writing/audio and shutdown evidence is retained; this delivery does not rerun those local journeys unless required CI calls them.

## Boundaries

Native Chromium executes original browser modules against synthetic local identities and services. This is not a hosted sign-in, real Supabase acceptance, classroom-capacity check or owner usability decision. No application source, package input, database schema, backend runtime, hosting setting or paid service changes. No production QA workflow is dispatched.

Production QA not run (paused by owner). Affected production QA: none. Owner usability acceptance: not given. Wider BF-21 resource workflows, additional formats, hosted adoption and migration work remain open.

## Release verification

The owner explicitly approved publishing the nine reviewed files and merging after required checks, with confirmation that no other agent was merging or releasing. Approved head `53495a7a2db9e4386c48a89026527d38b5bb5642` and merged commit `60e653c10cc27d10f3a737c882145bade41f57a7` preserve tree `3c225ee694adb5f8305e53914578f5c54be143a9`. All five required jobs pass in [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43854374872) and [merged-source CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43856059163). Both runs contain 1,856 passing code tests, 702 passing browser checks, all 109 expected local journey-group labels and four owned cleanups. Code/browser suites have zero failures, skips or cancellations. Run attempts are preserved in the receipt.

Twelve fresh public static checks at `2026-11-16T11:24:31.253Z` verify merged source, exact asset manifest, representative account-access HTML/JavaScript hashes, MIME, cache rules and enforcing security headers on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`. The unchanged 29-page/127-asset product build retains identity `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a`. Normal Git integration updated the site. Only static files were requested; no page scripts, sign-in, Supabase requests or production QA ran. No manual promotion or hosted setting change occurred.

The specific timing weakness documented in PR501 is repaired; this does not claim that every unrelated browser test is timing-independent or close wider BF-21. Earlier manual production-QA access-precheck failures remain separately recorded in [the Mastery delivery](local-staging-mastery-20261116.md#earlier-production-qa-failures). This task does not investigate or claim to resolve those failures.
