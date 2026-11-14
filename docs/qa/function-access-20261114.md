# BF-18 — hosted access verification, 14 November 2026

BF-18 is **closed on owner-approved test-project extrapolation**. All 56 focused hosted checks passed in `haiedu-bf16-test`. Production source/settings were audited and preserved. No production signed-in run was performed, and the owner explicitly accepted this test-project route as the closure basis; a production signed-in run is therefore not a remaining BF-18 gate.

## Decision and scope

The owner's instruction was: “Let's do the test in haiedu-bf16-test, and call it a day. We can extrapolate the results over the actual project.” Reviewed repository source is `375e16bbfb9c4e06830afa76cbef56f7325d654e`. This is a subject-neutral authorization check, using synthetic accounts and two synthetic school/class contexts. It changes no curriculum, production function, gateway flag, production setting or browser page.

The initial read-only inventory found 65 ACTIVE production functions: 63 with gateway JWT checks enabled and two existing exceptions whose handlers perform identity/session/context checks. No blanket flag change is justified. The complete per-function inventory, source hashes and redacted hosted results are in [the evidence record](../evidence/function-access-20261114.json).

## Actual hosted results

The run finished at 16:22:31 UTC on 14 November 2026 with **56/56 checks passing and 60 core HTTP requests**, plus bounded ordinary Auth refresh requests. This was actual hosted Auth, database, function and private-storage behavior, not simulated responses.

| Coverage | Result |
| --- | --- |
| Four designated synthetic actors' Auth identities | Passed |
| Intended material contexts and each teacher's own student | Passed |
| Other-school/foreign-class substitutions and student-as-teacher calls | Refused |
| Two PDFs: hidden draft, upload, QA, publication, intended delivery and private headers | Passed |
| Foreign selected-context PDF delivery and delivery after withdrawal | Refused |
| Genuine expired signed tokens, paired with valid refreshed tokens for the same actors/sessions | Expired tokens refused; current tokens accepted |
| Four local-session sign-outs followed by old-token use | Sessions ended; access refused |

The expiry checks reused genuinely expired tokens retained from the previous synthetic test run. Normal refresh established the same actor/session with current ES256 tokens. No token was forged, no time was simulated for the hosted checks, and no production timeout or bot protection was changed. These were direct service requests; no browser/CAPTCHA usability claim is made.

Separately, the initial audit passed 60 isolated source/SQL tests and six actual production requests with missing, malformed or unsigned synthetic credentials, all refused with 401. Another 24 local runner guard tests passed. These three evidence classes are distinct from the 56 hosted checks.

## Exact source and known configuration difference

| Function | Production version | Test version | Gateway JWT flag | Exact artifact SHA-256 |
| --- | --- | --- | --- | --- |
| `manage-supplementary-resources` | 3 | 1 | false in both | `a774c6b57b345f289c29228f4b89053bf49b841cd9ded11cc8dcba1ac993675d` |
| `get-teacher-student` | 22 | 1 | false in both | `46cd392df2d6ef326a1e1661c81e9a7b806746f41608981f663dd3f5e684a5e6` |

All 13 deployed file occurrences matched production before and after the run. The final readback at 16:23:09 UTC confirmed both production runtimes unchanged. Seven relevant SQL routine bodies also match production exactly. The other 64 unchanged production artifacts retain the prior readback evidence; 334 file occurrences were compared with current repository source during the initial audit. This does not claim a fresh signed-in run against every function.

Six audited SQL permission sets match production. The pre-existing test helper `private.lock_student_learning_context` has broader EXECUTE grants than production; its body is exact, and anonymous/authenticated roles have no USAGE on the private schema. Production grants are stricter. That shared test helper was left unchanged after automatic review rejected a proposed permission edit. This is a recorded difference, not full database/configuration parity. The observed endpoint results support the owner-accepted extrapolation within this focused scope.

## Test setup, cleanup and preservation

The existing test project lacked the materials schema and a teacher-projection column. A locally replayed, bounded setup added nine required routines, two RLS-protected material tables and their indexes/trigger, a private PDF bucket and a nullable `profiles.display_name` column. Existing profile values were not changed. The two exact production service bundles were deployed only to the test project.

All 14 existing Auth users and 47 prior learner answers are preserved. One selected student's additional enrollment was temporarily ended to provide an unambiguous school-isolation fixture, then restored exactly to active with no end date. The final readback confirms restoration. No learning answer was written.

Both run-created materials are withdrawn; zero are published. Four selected synthetic sessions were signed out, reducing sessions from 14 to 10; the other sessions were not targeted. The temporary refreshed-token file was deleted. Immutable material history and **two private PDF objects totaling 284 bytes remain**. They were not deleted and are not accessible through published-material delivery. The required test schema and deployed functions remain available for future checks.

Automatic review rejected the first broader setup before execution because it included an unrelated profile update; the narrowed setup was subsequently accepted and applied. It also rejected a shared-helper permission change; that change was omitted, while the permitted fixture enrollment change was performed and restored. No rejected SQL transaction was applied.

## Closure and limits

This record closes BF-18 on the owner's explicit acceptance of hosted test-project evidence combined with production source/settings readback. It does not claim production signed-in verification, full production database/configuration equivalence, browser usability or classroom throughput. A future gateway-flag change still requires its own compatibility evidence and specific production-change approval.

BF-16 production limits remain off. Paid stolen-password protection remains declined. BF-02 recovery work remains deferred. No new project, paid plan, email, production sign-in or production write was used.

Production QA not run (paused by owner). Affected production QA: none. This is an evidence/documentation change; repository merge and Notion source synchronization are tracked separately from the completed hosted test.
