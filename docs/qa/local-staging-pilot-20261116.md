# BF-21 — pilot writing/audio and reliable browser shutdown

The owner requested the remaining pilot writing/audio checks and the test-browser shutdown repair on 16 November 2026. This bounded slice is merged and verified in owner-approved [PR500](https://github.com/johnvanesyan-arch/HaiEdu/pull/500) at `fbd16f6f9dfb04b36833aa7c30fc19500a353327`. The release evidence is below; wider BF-21 remains open.

## Writing

Six real local student, teacher and school-admin accounts across two fictional schools/subjects use the original pages and unchanged service implementations. Teachers assign the approved fictional writing task to the selected enrolled student. An identical delivery retry creates no duplicate assignment.

Students save drafts, reload and recover their text, submit work, read a teacher's return feedback, revise and resubmit. Teachers mark the revision with the fictional rubric; students see 5/6 and their own feedback. Both immutable submission versions remain. An unsubmitted draft stays out of the teacher queue and cannot be opened through the teacher feedback service. Stale draft updates and duplicate submissions are refused. Foreign school/task/work identifiers and incorrect roles are refused. Missing, malformed and revoked identities are checked on assignment, written-work and feedback services.

## Audio

The normal player retrieves generated WAV tones from real private local Storage through the unchanged audio service. The browser checks the exact recording bytes/hash and no-store response. A two-question Diagnostic shares one recording and a two-play allowance. The first play is paused and the page reloaded; the observed native media play event must resume from the server's saved position. Completing a play enables answers. Counts persist across answers and reload; a third load is refused by the service. Both students complete Diagnostic and replayable Practice through the UI, with no simulated media completion or seeded learner progress.

Direct/public Storage downloads, foreign session recordings and learner access to staff preview are refused. The service also rejects missing, malformed and revoked sessions. These short synthetic tones test playback/control behavior, not speech quality, curriculum correctness or classroom bandwidth.

## Browser shutdown repair

PR499's first local PostgreSQL job failed when the browser closed while a route.fetch request was still finishing. The original handler and close sequence reproduces `Request context disposed` with a deliberately held local response.

The common runner now stops forwarding new requests, drains those already in progress, closes the browser, verifies the final network state and only then writes a success receipt. The origin/redirect guard stays installed throughout shutdown. Transport failures and timeouts fail the journey; errors are retained and all owned cleanup steps still run. This applies to all four local journey profiles.

Five native Chromium regressions cover an in-flight response, refusal of new shutdown requests, real transport failure, redirect/foreign destinations, a stuck request, and a late forbidden request after draining. The five tests all pass. None uses a hosted address for actual network access.

## Independent verification

The parent checks two selected-recipient assignments, four immutable written submissions, four published reviews, four completed learning sessions, eight answers, two completed assessed recordings and four private audio objects. Records must retain the correct student, enrollment, teacher assignment, school, release and task/audio binding. There are no rate-budget counters; all test sessions close and all owned containers, networks and temporary credentials are removed.

The [sanitized receipt](../evidence/local-staging-pilot-20261116.json) records 35 pilot groups and retained 28 dashboard, 25 assessment/file and 21 Mastery groups: **109 groups and four owned cleanups**. All **1,856 code tests** pass with no failures, skips or cancellations. The five new native browser regressions, target/transport controls, typecheck, teacher/build integrity and QA dependency audit pass. The retained journeys reuse unchanged behavior; the receipt identifies the sole unused pilot-function assertion difference where applicable. Screenshots of the real local written result at 390px and 1365px were inspected. This is not general responsive or owner usability acceptance.

Three exploratory test-development failures are retained in the private logs: audio snapshot setup order, missing reporting fields in the new V4 test policy, and a test clicking Play rather than the dedicated Pause button. Each was corrected in test infrastructure. The full final pilot run passes without retry or ignored failures.

## Running it

```sh
python scripts/run-local-staging.py --journey pilot-activities --evidence-dir /tmp/haiedu-pilot-evidence
```

Use the existing pinned local dependencies and Docker setup described in [the staging guide](local-staging-20261115.md). The fixed registry now bundles 29 unchanged repository functions. No arbitrary hosted target is accepted. The new fixture is `two-school-pilot-v5`; its synthetic gate/reviewer records do not approve any real content. A seventh, non-login identity supplies required content-review provenance; only the six school accounts sign in. All constraints and triggers remain enabled.

## Boundaries and remaining work

No product/browser implementation, database migration, package pin, hosted test project or production setting changes. Resource-assignment journeys, further response formats and multi-skill boundaries, hosted adoption, migration of 21 credential-bearing QA workflows and synthetic-report exclusion remain outside this slice. Wider BF-21 remains open.

Production QA not run (paused by owner). Affected production QA: none. BF-16 stays off, BF-02 recovery stays deferred, BF-22 stays on hold, and paid stolen-password protection stays declined.

Owner usability acceptance: not given.

## Release verification

The owner explicitly approved publication of all 22 reviewed files and the merge. Approved head `e7cab7051f68dd52c1644aea01d6bd13c1106499` and merged commit `fbd16f6f9dfb04b36833aa7c30fc19500a353327` preserve tree `f47943cf9a19138aa9fc94014bf6d67faff5013f`. All five required jobs pass in [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43834725306) and [merged-source CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43836029957), both on attempt 1. Each run contains 1,856 passing code tests, 701 passing browser checks, all 109 expected local journey-group labels and four owned cleanups. The counted code/browser suites have zero failures, skips or cancellations. The first complete CI runs pass with the repaired shutdown behavior; no retry or weakened check was needed.

Twelve fresh public static checks at `2026-11-16T09:12:02.580Z` confirm the merged commit, exact asset manifest, representative account-access HTML/JavaScript hashes, MIME, cache rules and enforcing security headers on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`. The unchanged 29-page/127-asset product build retains identity `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a`. Normal Git integration updated production; no manual promotion or settings change occurred. These were static requests only, without page-script execution, hosted sign-in or Supabase requests.

The receipt retains the original local source hashes and test-development corrections and adds exact PR/main and hosted-static release evidence. Earlier manual production-QA access-precheck failures remain separately recorded in the [preceding delivery](local-staging-mastery-20261116.md#earlier-production-qa-failures); their cause is unestablished, and this delivery does not rerun or claim to resolve them. Production QA not run (paused by owner). Affected production QA: none. Owner usability acceptance: not given.
