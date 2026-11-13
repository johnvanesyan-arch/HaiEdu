# BF-16 — cleanup installed and scheduled execution verified; limits remain off

13 November 2026 (UTC). John approved [PR480](https://github.com/johnvanesyan-arch/HaiEdu/pull/480), the specific production cleanup migration and confirmation that no other agent was merging or releasing. PR480 is merged at `00c27f6ebc5beae00997dfb49d4fc1f4672b2ed9` with the approved tree `2d8bedbff02deecd26ccfd76b539f2bb9554136f` preserved. The application request limits remain **off**. This release completes the approved controlled-test and cleanup-installation stage; policy acceptance, activation and the first real classroom pilot remain separate.

Owner usability acceptance: not given. Paid stolen-password protection remains declined. Production QA not run (paused by owner).

## Verified release

All five required jobs pass on both the approved PR head and the merged commit: **1,839 code tests and 696 native browser tests**, with no failures, skips or cancellations. Ten actual PostgreSQL 17.6/pg_cron maintenance checks run inside the required PostgreSQL job. [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43430868181) · [Merged CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43433194509).

All three public addresses (`haiedu.am`, `www.haiedu.am`, `armenian-mastery-platform.vercel.app`) serve the merged release identity and exact browser manifest: 29 pages and 127 assets, build `41b75062950fff7d8f85c8ec495215ed862e1075aed8b166d1d7c26eebcce377`. Twelve fresh static checks cover the release marker, manifest, account-access HTML and one built JavaScript asset, including their reviewed hashes, cache rules and security headers on each address. The prior full-build proof is reused because the app/build source and manifest are unchanged. The normal automatic domain switch completed; no manual promotion or hosting setting change was made. These checks fetch static files only and do not sign in or call Supabase.

## Production cleanup and preservation

The exact [reviewed migration](../../supabase/migrations/20261113112707_bf16_counter_maintenance.sql), SHA-256 `080252d84f6085d456827f86c31273f807ffb41f3afa37db32f69a046c9b96d0`, is installed as production ledger `20261113133313_bf16_counter_maintenance`. Supabase recorded the actual application timestamp; the source filename and ledger versions are explicitly cross-referenced. Do not reapply the file to make their timestamps match. All **217 earlier entries** are preserved; the ledger contains 218 entries.

One owner/database-scoped private job, `haiedu-bf16-counter-maintenance`, runs every **15 minutes**. It removes at most 500 expired, fully refilled request-counter rows and at most 500 completed history rows older than seven days from only this job. It skips locked rows and duplicate cleaners, preserves unpaid allowance debt and other jobs, and uses a five-second statement timeout and one-second lock timeout. Production runs PostgreSQL 17.6 with pg_cron 1.6.4.

The function body and scheduled command read back byte for byte against reviewed source. The function uses SECURITY INVOKER and the fixed `pg_catalog` search path. The private health view uses invoker permissions and selects only the current owner's job in the current database. Anonymous, authenticated-browser and service API roles cannot execute the maintenance function or read the monitor.

All **148 existing public/private ordinary or partitioned table catalogue entries** retain their owner, ACL and row-security settings. All four policy rows and their values are unchanged. This verifies catalogue/privilege and policy preservation; it does not claim a new hash of every business row. The request-counter table remains empty. Existing security-advisor notices are unchanged: one informational row-security/no-policy notice and the owner-declined paid leaked-password warning. [Row-security notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) · [Password-protection notice](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The first observed real automatic scheduled success completed at **2026-11-13T13:45:00.632331+00:00**. The monitor reports `ok`, no recent failures and no expired backlog. This is fresh production scheduler/execution evidence with an empty counter table. Actual deletion of seeded expired counters and debt/lock/Auth/history preservation were exercised only in the separate synthetic test fixtures; no synthetic counter or account was added to production.

## Controlled classroom evidence and remaining gates

The [qualification record](abuse-controls-qualification-20261113.md) retains the approved separate free project's evidence: 12 concurrent test students, 15 chapter scopes across two synthetic subjects, 47 submitted answers and 152/152 successful hosted requests; 12 allowance/wait/isolation assertions; and four fresh browser feedback cases. Its explicit test-only enforcement/route adapters and non-business probe remain disclosed. It is not real 100-person/school-network capacity, Gmail delivery, successful real class joining or owner usability acceptance.

No production Auth sign-in, email, Edge deployment, activation, production QA dispatch or live limit-setting change occurred. Production writes were limited to the approved maintenance installation and its recurring cleanup work. The off setting is owner-confirmed; the connection cannot independently read Function Secrets. Existing learning, scoring, tenant, content-release and 65-function runtime rules are unchanged.

Affected production QA: **none** for this maintenance/test/documentation release. The previous limiter integration retains all 16 routed suites; production QA not run (paused by owner).

The [database health query](../../supabase/proposals/bf16_counter_maintenance_observe.sql), [bounded aggregate HTTP query](../../supabase/proposals/bf16_counter_http_health.clickhouse.sql) and [owner-scoped pause command](../../supabase/proposals/bf16_counter_maintenance_pause.sql) are available to operators. Push alerts are not configured. Cleanup continues while application enforcement is off.

Next: review the candidate policy values, obtain separate explicit activation approval, then observe the owner-scheduled first real classroom pilot. Real 100-person/school-network/Gmail capacity and owner usability remain open. EAT: policy walkthrough 10–20 minutes; activation/observation timing depends on the approved pilot and is not automatic. Paid stolen-password protection remains declined.

[Machine-readable release evidence](../evidence/abuse-controls-maintenance-release-20261113.json).
