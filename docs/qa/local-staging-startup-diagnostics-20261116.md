# BF-21 — useful diagnostics for local test startup failures

John requested “Make test failures easier to diagnose” on 16 November 2026. This change reports which disposable local service failed, what startup step it reached, the available failure category and whether its resources were removed. Owner-approved [PR506](https://github.com/johnvanesyan-arch/HaiEdu/pull/506) is merged at `03134220e69a4edcf6452c2768f94828418fe022`; PR and merged-source CI, actual artifact readback and public static release checks pass. Application behavior and hosted configuration are unchanged.

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

## Initial GitHub workflow correction

The first published head `adadc9ef277644b83cb9396b5c70d2da3502b081` was rejected before any CI jobs ran ([run 43890844885](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43890844885)). The new directory settings referenced `runner.temp` in job-level `env`, where GitHub does not allow the runner context. Actionlint reproduced both errors. A setup step now exports the same paths through `GITHUB_ENV` using `RUNNER_TEMP`; actionlint passes afterward. This is a workflow configuration defect, not a failed application test or a recurrence of PR505's unknown startup failure. Local fixture results remain valid because fixture/test source is unchanged; the corrected head must complete all required CI jobs and artifact verification.

## Boundaries

All five required CI jobs remain in the release aggregate. Production QA not run (paused by owner). Affected production QA: none. No product/browser implementation, package pin, schema, hosted service or deployment setting changes. This is local infrastructure qualification, not production acceptance, classroom-capacity certification or proof of the historical failure's cause.

Owner usability acceptance: not given. Wider BF-21 remains open, including further formats/workflows, hosted adoption, migration of 21 credential-bearing QA workflows and synthetic-report exclusion. BF-16 stays off, BF-02 recovery stays deferred, BF-22 stays on hold and paid stolen-password protection stays declined.

## Release verification

The owner explicitly approved publishing all 16 reviewed files and merging, then confirmed no other agent was merging or releasing during this delivery and its documentation record. Reviewed head `28612b883b4920761f3e01766521c8f5665582a3` and merged commit `03134220e69a4edcf6452c2768f94828418fe022` have identical tree `522ac6440404e4f17f58ee740e9d48fddbab8605`. All five required jobs pass on the corrected head in [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43891315754) and [merged-source CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43893573220), each on attempt 1. Both runs contain 1,857 passing code tests, 702 browser checks, all 150 expected local workflow labels, eight independent private-storage checks and five owned journey cleanups. Code/browser suites have zero failures, skips or cancellations. Thirteen diagnostic tests and both actual Docker fault/cleanup controls pass. The earlier invalid-workflow attempt remains separately recorded above.

Both runs upload `fixture-startup-diagnostics-1` with seven-day retention. Their actual ZIP archives were downloaded, checked against GitHub's SHA-256 digest and inspected: each contains exactly two allowlisted JSON reports under `expected-failure-controls/`, with the expected database client timeout and deliberately exited Auth service. All tracked objects are removed; no actual-failure or private files are present. This verifies the real artifact route on successful CI using injected failures. It does not prove an archive will survive runner loss, disk exhaustion or a failed upload. Detailed identities, hashes and reports are retained in the receipt.

Twelve public static checks at `2026-11-16T15:21:15.492Z` verify the merged source, exact unchanged manifest, representative account-access HTML/JavaScript hashes, MIME/cache headers and enforcing security policy on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`. The unchanged build remains `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a` (29 pages, 127 assets). Normal Git integration updated the site; no manual promotion or hosted configuration change occurred. Only static files were requested, without page scripts, sign-in or Supabase calls. Production QA not run (paused by owner); affected suites: none.
