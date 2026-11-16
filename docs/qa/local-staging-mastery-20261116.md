# BF-21 — Mastery and Chapter Review in owned local staging

The owner authorized this bounded next step on 16 November 2026, following the [assessment/private-file slice](local-staging-assessment-files-20261115.md). It adds native selected-response Mastery and Chapter Review journeys to the disposable local environment. **Locally qualified; merge pending.** Exact PR-head CI is a separate gate recorded in the pull request. No merge or hosted acceptance is claimed. Wider BF-21 remains open.

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
