# BF-21 — Mastery and Chapter Review in owned local staging

The owner authorized this bounded next step on 16 November 2026, following the [assessment/private-file slice](local-staging-assessment-files-20261115.md). It adds native selected-response Mastery and Chapter Review journeys to the disposable local environment. **Merged and verified on 16 November 2026.** Owner-approved [PR498](https://github.com/johnvanesyan-arch/HaiEdu/pull/498) merged at `f7814f508852c78af30e88405590c1613bae0d0b`, preserving approved tree `ab5d61412a31731eeece67a87d451a4665638719`. All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43817353089) and [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43819005812) pass. This completes the bounded local Mastery/Chapter Review slice; wider BF-21 remains open. No hosted service acceptance is claimed.

## Scope

Six fictional accounts span two schools, subjects and grades. The runner uses real local Auth, PostgREST, the full reviewed application database and 25 bundled repository Edge Functions. The original sign-in, course and learning-player pages perform the learning actions. No learner session, answer, readiness score or review completion is seeded, and no API response or page document is fabricated.

The separate fixture is `two-school-mastery-v4`. Its small synthetic question sets bind the existing versioned scoring, readiness and three-attempt lifecycle. These are explicit test records, not real curriculum, content approval or a new platform default. All constraints and triggers remain enabled. Each subject has four disjoint protected Mastery forms: the spare fourth form makes the attempt-limit check independent of running out of questions. Diagnostic, Practice and Chapter Review use separate items.

| Fictional student | Mastery results | Required review | Terminal behaviour |
| --- | --- | --- | --- |
| School A | 50% fails the configured 80% overall threshold; second attempt scores 100% and passes | Complete Chapter Review before attempt 2 | Optional review remains available; Mastery stays closed despite unused forms |
| School B | Three attempts score 0% and fail | Complete Chapter Review before attempts 2 and 3 | Fourth attempt is refused despite an unused fourth form; optional review remains available |

Both students first complete Diagnostic and Practice through the native player. The checks cover the missing-baseline gate, initial readiness, and refusal of Chapter Review before it is available. Partly completed required review keeps the lifecycle locked; asking to start Mastery resumes that unfinished review rather than creating another attempt. Completed review unlocks the appropriate retry.

Each Mastery session is started repeatedly, including simultaneous start requests, and must keep the same session identity. Reload after the first submitted answer resumes at question 2 with the same item and option presentation. An identical answer retry returns the same attempt identity; changing an already submitted answer is refused. Correctness remains hidden until completion, hints are unavailable through both the page and service, and the displayed score matches the recorded result.

Both students retain their own completed Mastery history. Exact foreign-school contexts, session and item identifiers are refused. Teachers and school administrators cannot use student-only Mastery operations for either school. Missing, malformed and revoked sessions are tested against start, status, lifecycle, item, both answer endpoints and remediation help. Legitimate teacher/admin reporting is outside this bounded learner-service denial check.

## Independent database evidence

After the browser finishes, the parent independently checks 14 completed learning sessions, 28 distinct answer attempts, five Mastery attempts and five Chapter Review sessions. Three review requirements must be satisfied by the correct completed review and attached to the correct retry. The final states must be passed on attempt 2 and failed after attempt 3. Exactly 21 answers are correct; the partially correct first attempt must fail at 50%.

Every session and answer must retain its student, enrollment, school, release, unit, skill, policy, model and runtime binding. Each Mastery attempt must use the expected whole protected form with no repeated items across attempts. Unused forms must have no assignments or exposure events. No file, task submission or rate-budget counter is created; all Auth sessions are closed. The runner removes only its own containers, network, generated credentials and temporary builds.

## Run locally

Use the [stage-1 prerequisites](local-staging-20261115.md#run-locally), then:

```sh
python scripts/run-local-staging.py --journey mastery --evidence-dir /tmp/haiedu-mastery-evidence
```

The runner accepts no hosted target, existing project, DSN or supplied account. Ownership/source/build checks and restrictions to the two exact owned origins are retained. The fixed local service registry adds `get-remediation-help` to test the protected-assessment hint denial. Application function bodies, SDK pins and provider-image digests remain unchanged. This is an adapter for reviewed repository code, not proof of identical behaviour on every hosted runtime or an operating-system sandbox for arbitrary code.

The existing required PostgreSQL CI job now runs this journey alongside both retained local journeys. All five required CI jobs remain in the release aggregate. Private screenshots and troubleshooting logs stay outside Git; only the sanitized receipt is suitable for publication.

## Verification and boundaries

The [sanitized receipt](../evidence/local-staging-mastery-20261116.json) records **21 passing Mastery check groups**, all **28 dashboard groups** and all **25 assessment/file groups**: **74 groups total**, with three owned cleanups. All **1,856 code tests** pass with zero failures, skips or cancellations. Five target/runtime controls, one setup-redirect control, type checking, core/teacher parity, browser asset/archive validation and the production QA dependency audit pass. The product build retains 29 pages and 127 assets. Two representative desktop views were inspected; this is not responsive or usability acceptance.

An earlier run of the final fixture stopped on a local static-asset `route.fetch` connection reset. One unchanged-source rerun after the other local jobs finished passed all assertions, independent database checks and cleanup. No assertion or transport restriction was weakened. The receipt retains that limitation and distinguishes this local result from exact PR-head and merged-source CI. Local results identify the base commit plus all runner input hashes; they do not claim a clean committed source at execution time.

This slice exercises two-question, one-skill, selected-response policies through the governed course player. It does not certify every response format, multiple-skill scoring boundary, legacy subject adapter, assessed audio, writing/resource workflow, timing/race scenario, classroom capacity or usability. Reload coverage preserves submitted answers and the next unanswered item; it does not claim persistence of an unsubmitted radio selection. The tiny synthetic bank is test infrastructure, not educational calibration or whole-bank approval.

The prior dashboard and assessment/file fixtures retain their separate scopes. Other workflows, separately approved hosted adoption, migration of the 21 credential-bearing QA workflows and exclusion of synthetic data from hosted reports remain open. Production and `haiedu-bf16-test` are unchanged. BF-16 live limits stay off; BF-02 recovery stays deferred; BF-22 stays on hold; paid stolen-password protection remains declined.

Production QA not run (paused by owner). Affected production QA: none. No application, browser, schema, package or production QA implementation changes. Owner usability acceptance: not given.

## Release verification

Exact PR-head and merged-source CI both pass with 1,856 code tests and 696 browser checks, with zero failures, skips or cancellations in those counted suites. Both runs contain all 21 Mastery, 28 retained dashboard and 25 retained assessment/file group labels, with three verified owned cleanups and the retained database qualifications. The approved head is `f16ba02a7f5443900d7d6baaedb030aa5bdd72ce`; the merge preserves its tree.

All three public addresses serve `f7814f508852c78af30e88405590c1613bae0d0b`. Twelve fresh checks verify release identity, exact asset manifest, representative account-access HTML/JavaScript hashes, MIME, cache rules and enforcing security headers. Product, schema, browser and package source is unchanged; the 29-page/127-asset build retains identity `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a`. This is representative hosted static verification, not fresh hosted browser/service acceptance. Only static files were fetched; no page scripts, sign-in, Supabase requests or production QA ran in this delivery. Normal Git integration updated the site; no manual promotion or hosting-setting change occurred.

### Earlier production-QA failures

Read-only review identified 13 failed manual production-QA runs from earlier on 16 November on base `2ab53c73e27925816ff1fafc5166e6da2867dbfb`. Twelve downloaded reports show HTTP 400 at the initial designated administrator sign-in; the mobile report stops at its initial isolation precheck without the underlying provider response. Examples: [Chapter II](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43805340831), [analytics](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43805373528) and [mobile](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43805364751). Their reports do not establish why sign-in was rejected or demonstrate a classroom-flow defect. They predate this PR and are not passing production evidence. The owner was informed before approving this merge; the earlier instruction to disregard Production QA is retained and these failures remain separately recorded. No rerun, credential use or hosted setting change was performed to investigate them.

The release receipt preserves the original local working-tree evidence and adds approved-head/tree identity, exact PR/main checks and public static observations. No hosted test-project reset, backend deployment, production data change or paid action occurred.
