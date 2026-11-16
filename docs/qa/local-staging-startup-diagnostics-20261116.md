# BF-21 — useful diagnostics for local test startup failures

John requested “Make test failures easier to diagnose” on 16 November 2026. This change reports which disposable local service failed, what startup step it reached, the available failure category and whether its resources were removed. Local qualification is complete; exact-head CI and merge approval are pending. Application behavior and hosted configuration are unchanged.

## Problem and change

PR505's first PostgreSQL job stopped before its first fresh-baseline assertion. Its sanitized output retained only `RuntimeError`, leaving no useful startup artifact. One unchanged-head retry passed. The original cause remains unconfirmed; this delivery cannot recover discarded logs or prove that disk space, a provider image or the runner caused that historical failure.

All consumers now share an allowlisted diagnostic record covering the database, network, mail, Auth, Storage, Data API and local function runtime. It records the active phase before starting an operation, preserves the first failure, and records cleanup failures separately. Available observations include service state, numeric exit code, out-of-memory flag and HTTP status. Recognized error categories include full disk, memory exhaustion, image download problems, unavailable Docker, timeout and connection failure. Unknown causes remain unknown rather than being guessed.

The database/network fixture now tracks ownership before requesting creation. If Docker creates an object but its client times out, cleanup still finds the object by its unique run label. Removal checks that label and verifies absence afterward. Unrelated objects are refused. Optional private-log collection cannot replace the startup failure or prevent cleanup; cleanup failure alone still fails the fixture. No automatic retry or longer production timeout is introduced.

## Finding a report

Open the failed GitHub **CI** run. In **Artifacts**, download `fixture-startup-diagnostics-<attempt>`. Reports are retained for **seven days**:

- `failures/` contains actual startup failures or the last recorded active step of an interrupted operation.
- `expected-failure-controls/` contains the two deliberately induced failures that test the reporter. Their presence on a successful run is expected, not evidence of a product outage.

The first error is in `failure`; `cleanup` and `cleanupFailures` describe removal. A failed process also prints one `HAIEDU_FIXTURE_FAILURE` JSON summary in its job log. For example, `auth / service-ready / readiness-timeout`, paired with `state: exited` and `exitCode: 23`, shows that the service stopped before becoming ready. It does not reveal why an unrecognized service error occurred.

Only fixed fields, fixed category strings, bounded numbers, a timestamp and an opaque run identifier may be published. Command arguments, exception messages, credentials, database connection strings, emails, response bodies, container environments and raw logs are excluded. A separate collector validates every candidate before creating a fresh artifact directory; malformed reports, additional fields and symlinks prevent upload. The upload action is pinned and receives only validated JSON files, never a private diagnostics directory.

Locally, set `HAIEDU_FIXTURE_DIAGNOSTICS_DIR` to a private output directory before running the existing test commands. Without it, failures still print the safe summary. If writing the report fails, cleanup and the original failure remain; a usable runner can still print the summary. A killed runner, failed checkout or failed artifact upload may leave no downloadable report. An in-progress snapshot is the last observed phase, not proof of cause or completed cleanup. Reported free bytes/inodes describe the host temporary filesystem, not the container's writable layer.

## Consumer audit and verification

This is subject-neutral test infrastructure. `cron_database` covers rate-counter maintenance and the shared provider stack. The provider stack covers fresh-baseline tests and `fresh_update_bridge.owned_database`, including forward-update tests, historical-data-requirement tests, the update rehearsal and all five local staging journeys. `service_runtime` covers all five journeys: dashboards, assessment/files, Mastery, writing/audio and material assignments. The runner's source-hash manifest includes the new reporter. Existing provider versions, generated identity, loopback-only access and isolated network checks remain intact.

Thirteen focused controls verify failure context, secret exclusion, late timeout cleanup, ownership refusal, cleanup error preservation, daemon errors, private-log failures, report-write failures, unavailable capacity and collector refusal. Two further controls use real Docker objects: a client timeout after database creation, and an Auth substitute deliberately exiting with code 23 after its port is mapped. Both report the expected failure and verify actual owned-object removal. Generated credentials and private-output canaries do not appear in their captured public output. An old-source simulated timeout control confirms the regression: the previous fixture emits no structured report and leaves two simulated objects behind. It makes no real Docker changes.

Normal local qualification passes ten real scheduler checks, eighteen fresh-baseline/provider checks, twenty-eight dashboard groups, forty-one material-assignment groups, eight independent private-storage checks and both journey cleanups. Four normal fixture reports finish without a startup failure and with all tracked objects removed. The setup-redirect control, production-QA dependency coverage, teacher-bundle parity and web asset/archive integrity also pass. Other unchanged journeys and the complete required release suite are exercised by CI; this record does not claim a new local run of every journey.

Two exploratory control failures were test-harness issues: a credential detector incorrectly treated a password-length setting as a secret, and immediate service exit raced port mapping. The detector now checks actual credential fields; an explicit exit barrier replaces the race. The final controls pass without weakening the expected failure or cleanup assertions. Evidence hashes and sanitized reports are preserved in the [receipt](../evidence/local-staging-startup-diagnostics-20261116.json).

## Boundaries

All five required CI jobs remain in the release aggregate. Production QA not run (paused by owner). Affected production QA: none. No product/browser implementation, package pin, schema, hosted service or deployment setting changes. This is local infrastructure qualification, not production acceptance, classroom-capacity certification or proof of the historical failure's cause.

Owner usability acceptance: not given. Wider BF-21 remains open, including further formats/workflows, hosted adoption, migration of 21 credential-bearing QA workflows and synthetic-report exclusion. BF-16 stays off, BF-02 recovery stays deferred, BF-22 stays on hold and paid stolen-password protection stays declined.
