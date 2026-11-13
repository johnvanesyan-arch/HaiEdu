# BF-16 — controlled hosted qualification and maintenance candidate

**Release follow-up, 13 November 2026:** PR480 is merged and the approved production cleanup is installed with actual scheduled success verified. The application limits remain off. [Verified release](abuse-controls-maintenance-release-20261113.md). This note preserves the original qualification scope and pre-release findings.

13 November2026 (Asia/Yerevan). Prepared from merged source `f023330bfd6040d28ccefaab846940b1fb8c8e1f` after the owner authorized the controlled check and housekeeping preparation. **The live limits remain off.** The new maintenance migration is a reviewable candidate, not installed on production. The owner approved the existing HaiEdu organization for a separate test project only if free; Supabase quoted **$0/month**, and `haiedu-bf16-test` (`pgtfeiwznqdeahrkoioy`) was created in `eu-central-1`. No plan upgrade or paid stolen-password protection was purchased.

Owner usability acceptance: not given. Production QA not run (paused by owner). No designated production fixture account was used, no production acceptance workflow was dispatched, and no real email was sent.

## Fresh hosted checks

The separate project contains only synthetic data derived from the repository's two-subject/two-grade/two-school learning acceptance fixture. It does not contain copied production records. Fourteen confirmed synthetic accounts obtained real Supabase Auth sessions:12 students and2 teachers. The test project uses PostgreSQL17.11/pg_cron1.6.4; production remains PostgreSQL17.6. The cleanup is also tested separately on actual PostgreSQL17.6 with pg_cron1.6.7 source (extension version1.6).

Nine reviewed learning endpoint bodies and their dependencies were deployed to this project. Their entrypoints have one explicit test-only adapter: the reviewed gate is forced to enforce only when the server URL matches this test project; a different target fails closed. Production source/settings were not changed. A tenth test-only admission probe verifies the caller and actual active session, imports the same reviewed gate, and performs no protected business or email work. All ten deployed functions are ACTIVE with JWT checks enabled. All99 emitted file occurrences match their intended source; submit-answer's sole type-only dependency is intentionally omitted by the compiler. The shared admission helper is unchanged.

| Check | Fresh result | Boundary |
| --- | --- | --- |
| Actual hosted student learning |12 simultaneous student flows;15 completed chapter scopes across two synthetic subjects;47 submitted answers;152/152 requests returned200; observed client p95=2,761ms | Real Auth → SDK → reviewed Edge business bodies → SQL; synthetic curriculum/accounts and explicit test-mode adapter |
| Repeated code attempts |40 simultaneous authenticated requests admitted10 and refused30 | Test probe exercises the real counter; it does not redeem actual invitation codes |
| Account isolation |A second student retained its allowance and loaded actual classroom navigation while the first was refused | One test client; not a physical school-network capacity test |
| Waiting/retry |Refusals expose matching positive Retry-After/header/body values and no-store; the same account is admitted after the real server-directed wait | No fake clock or automatic write retry |
| Weighted invitation allowance |Five batches of20 synthetic recipient attempts admitted; the next recipient attempt refused; the teacher's ordinary budget still admitted requests | No invitation handler/email delivery is exercised by the probe |
| Browser feedback |Four fresh Chromium cases at375/1280px and100%/200% text display the real hosted wait, retain the code, leave the button editable and make one request only; no uncaught errors or overflow | Reviewed join DOM/JS and real SDK/Auth; test-only route adapter sends the form to the non-business probe, so this is feedback integration, not successful real class joining |

The hosted learning driver and the12 hosted admission assertions pass. Earlier browser fixture attempts failed because of asynchronous initialization, the workspace proxy/certificate-store setup and an SDK getter that discarded a test routing override. Those failed attempts are retained privately. The final four-case invocation passes; no application failure or skipped case was waived. The browser uses the inherited proxy and its already-configured certificate store with scoped filesystem write access; TLS verification stays enabled and no new root certificate is installed.

This is a controlled small-group qualification. It is not production QA, owner usability acceptance, real-school Wi-Fi evidence,100-person simultaneous sign-in/load qualification or real Gmail delivery. Existing provider sign-in/email limits and the limited Gmail pilot remain separate. Previously verified unchanged broader code/browser evidence is reused explicitly; this PR still needs all five required exact-head checks.

## Bounded housekeeping candidate

CLI3.1.0 generated [20261113112707_bf16_counter_maintenance.sql](../../supabase/migrations/20261113112707_bf16_counter_maintenance.sql). When separately approved and applied, it will:

- Install pg_cron if absent and create exactly one owner/database-scoped named job, `haiedu-bf16-counter-maintenance`, every15 minutes. It refuses to overwrite an existing job for that owner/name, across databases. Another owner may use the same name without confusing cleanup, health or pause.
- Use the existing private primitive to remove at most500 idle, fully refilled counter rows per run. It skips locked rows and preserves unrefilled debt, active counters, users and learning records.
- Prune at most500 completed history rows belonging only to this job, keeping seven days. Other jobs/history are preserved.
- Skip duplicate cleaner invocations instead of queuing, and bound the job connection to a5-second statement timeout and1-second lock timeout. The function's deletion/history work is atomic.
- Add an owner-only private health view. The function and view use SECURITY INVOKER / the reviewed pg_catalog search path and are unavailable to anonymous, authenticated and service API callers. No new public RPC or HTTP endpoint is introduced.

Ten checks on an owned PostgreSQL17.6/real-pg_cron fixture pass: narrow permissions,500-row limits, active-lock/debt/expiry preservation, other-job and Auth preservation, another owner using the same name, duplicate invocation skipping, rollback on history failure, actual scheduled execution, visible scheduled failures/pause, the actual one-second lock timeout, and refusal to overwrite an existing job. They run inside the existing required PostgreSQL CI job and remain covered by the aggregate release gate.

The first real background-worker test caught that explicit BEGIN/COMMIT inside a cron command fails on that execution path. The proposed command was corrected to let the scheduler own its transaction; the final ten checks pass. This caught a candidate issue before any live installation. A separate negative control confirms that the earlier unscoped owner lookup fails the new same-name/different-owner case; the final candidate passes all ten checks and preserves that other job/history.

The candidate object state is also installed **only in the separate test project**, initially through the candidate and then an owner-filter fixture follow-up. The final complete migration is installed from scratch by the PostgreSQL17.6 test. Its function body, command, schedule and permission boundaries read back as intended. A temporary5-second test schedule removed three seeded expired/refilled counters, while all14 Auth users and47 submitted answers remained. The original15-minute schedule was restored; the health view reports `ok`, no failures and no expired backlog. No recurring production cleanup has been installed.

## Monitoring and pause

[Database health query](../../supabase/proposals/bf16_counter_maintenance_observe.sql) reports job presence/activity, last successful run, recent failures, eligible expired backlog and counter storage. It flags no first success,45-minute overdue cleanup and a backlog older than one hour. [HTTP health query](../../supabase/proposals/bf16_counter_http_health.clickhouse.sql) uses the existing unified log stream to aggregate function route/status counts and p95 execution time. Its fields and bounded query were verified in the test project; its sample includes setup/probe traffic and is not a complete request transcript. Neither query returns identities, request headers, codes, tokens, IPs, email addresses or learner responses.

These are operator checks, not configured push alerts. During the first owner-scheduled live pilot, review unexpected429/503 responses, waiting-time reports and latency. Do not introduce per-refusal database audit writes. [The pause command](../../supabase/proposals/bf16_counter_maintenance_pause.sql) disables only this named cleaner; it does not drop pg_cron, other jobs, counters or learning records. Application rollback remains the separately controlled off setting.

## Live boundary and next release steps

A fresh read-only production check still finds four policy rows, zero counter rows, no pg_cron extension and no new maintenance function. The existing off setting is owner-confirmed and cannot be independently read through this connection. The65 production function deployments are unchanged by this work. No production SQL write, Auth change, Edge deployment, email, hosting promotion, domain assignment or setting change was made.

Affected production QA: **none** for this maintenance/test/documentation change. The prior limiter integration retains its recorded16 affected suites; they remain paused and were not dispatched. Browser pages, builds, existing Edge/migration source, learning rules and content-release gates are unchanged.

1. Publish/review this candidate and pass all five exact-head checks.
2. Obtain explicit approval for its PR and the specific production cleanup migration, plus fresh no-other-merger/releaser confirmation before merging. Applying this candidate enables housekeeping only; the application limits stay off.
3. Read back the production job/source/privileges and observe an actual successful scheduled run. Check merged-commit CI and canonical source identities.
4. Review candidate policy values and obtain separate explicit approval before enabling the application limits. Observe the first real classroom pilot with the agreed operator checks. Paid stolen-password protection remains declined.

EAT: merge/installation verification15–30 active minutes plus CI, coordination and up to15 minutes for the first scheduled run. Activation and the real pilot remain separate owner decisions.

[Machine-readable evidence](../evidence/abuse-controls-qualification-20261113.json) · [Existing live installation](abuse-controls-server-installation-20261113.md).
