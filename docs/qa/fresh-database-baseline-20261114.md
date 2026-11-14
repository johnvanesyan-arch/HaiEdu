# BF-20 — Reproducible fresh application database

**Candidate, not a production migration.** The owner authorized reconstruction and isolated testing after the read-only audit. The full application structure now rebuilds from empty state and matches the captured catalogue. All 18 real-component integration checks, eight comparison controls and 1,847 existing code tests pass locally. Exact-head CI and PR-specific approval remain pending.

## Problem and resulting behavior

The repository's first historical update (`0002_public_read_policies.sql`) assumes `public.subjects` already exists. The initial schema, functions and some other setup records exist only in the production ledger. A clean install therefore fails before it can create a working application schema.

The fresh-only package in [`supabase/baseline`](../../supabase/baseline/README.md) reconstructs the reviewed current structure in one atomic installation. It is separate from the 208 historical migration files and the original 218 production records. It does not rename, replay, repair, mark applied, overwrite or fabricate those records.

The package contains 148 tables, 29 views, 346 functions, 150 triggers, five enums and two identity sequences. It preserves effective table/column/function/type/schema privileges, default grants, row-security policies, constraints/indexes, generated columns, view security options, function properties and the application-owned Auth profile trigger. The constructor handles standalone unique indexes before foreign keys and creates constraint triggers through their actual trigger definitions.

## Source and history evidence

- Reviewed source: `70a466cd1bcb19e4558a741331d23d5f3e87916a`, merged roadmap 4.186.
- 208 source files versus 218 recorded updates; all 214 entries from the earlier audit retain version/name/SQL hashes. Four later updates cover answer/hint recovery and the two BF-16 changes.
- 193 name matches: 159 byte-exact scripts and 34 byte differences. Conservative statement-tree comparison accounts for 186 matched scripts; seven installation/source differences remain explicitly classified in the initial audit.
- All 346 live function bodies are accounted for: 330 source-byte matches, 11 source differences limited to whitespace/comments, five original installation functions absent from historical migration sources. The fresh package includes those five definitions. Two source-matching functions have no direct definition in the recorded scripts; their installed definitions are preserved without inventing ledger provenance.
- The [crosswalk](../../supabase/baseline/source-history-crosswalk.json) is read-only evidence. Historic data effects, source aliases, no-op placeholders and production-only runtime operations retain their distinct dispositions.

## Verification and boundaries

A real empty PostgreSQL 17.6 database reproduces the old missing-table failure. The guarded baseline then installs successfully and its application catalogue matches the capture, including permissions. A second installation is refused before changing the existing structure.

The comparison retains column/enum order, permissions and function definitions. PostgreSQL adds unused default labels to right-hand UNION arms in one rebuilt view. A narrow PostgreSQL 17 syntax-tree normalization handles only that representation difference and parser offsets. Negative controls retain left output names, literals, filters, ordering and access-control changes; they reject substantive changes.

The full Supabase CLI PostgreSQL distribution exceeded the workspace's Docker storage capacity while downloading. Its retries were stopped. Verification uses the lean PostgreSQL 17.6 image with real pg_cron, GoTrue 2.197.0, PostgREST 16.5, Storage 1.90.1 and a local mail catcher. Auth/Storage tables are created by the actual services' migrations. All ports are loopback-only and all credentials/accounts/files are synthetic. This is a real component integration test, not the full CLI bundle or proof of hosted provider configuration equivalence. It does not exercise Realtime, Edge Function deployment, Studio or Vault.

The local fixture explicitly assigns the normal `authenticated` API role when creating accounts through GoTrue's admin API. Its initial omitted role caused a fixture-only refusal and was corrected. Docker startup timeout cleanup was also hardened to track containers before creation completes and to avoid exposing generated keys through exception command arguments. Storage now installs its actual provider roles/grants; the standalone installer's development-only `postgres` membership is revoked from `authenticator` before starting the Data API. These were test-environment repairs, not production fixes.

The [safe verification receipt](../evidence/fresh-database-baseline-20261114.json) records 18/18 integration checks, 8/8 comparison controls and 1,847/1,847 code tests (zero failures/skips/cancellations). Real Auth sign-ins create provider sessions; Data API checks preserve own/other-account isolation and privileged RPC boundaries. Forty concurrent real-session SQL callers admit exactly ten code attempts, refusals preserve counters atomically, a second account remains independent and an expired session is denied. Actual Storage file upload/read succeeds for the service and fails for the student/public caller. Temporary containers, database/file storage and network were removed and absence verified. Private SQL captures, user tokens and service logs remain outside the repository.

## Data and deployment safety

Only four non-user rate-policy rows are installed by the separate technical seed, matching the reviewed BF-16 source and read-only live values. No real user, school, membership, curriculum, learning-model configuration, release, approval, runtime binding, learner work, uploaded file, secret or scheduler activation is copied. See [data dispositions](../../supabase/baseline/data-dispositions.md).

The guarded installer requires explicit local mode and empty application schemas, and checks for initialized provider tables. The runner owns a new local Docker target and accepts no remote DSN, project ref or hosted credential. It removes its temporary containers, database/file storage and network. Qualification checks use generated accounts, a private file and concurrent SQL connections; they do not run production QA or claim classroom/Gmail capacity.

The required PostgreSQL CI job includes the new comparison controls and full fresh-baseline integration. All existing jobs remain in `Platform release checks`. The source manifest pins all 208 migration files plus the archived operation so future database-source changes cannot silently leave this test on an obsolete snapshot.

Affected production QA: **none**. No browser, shared Edge or live API implementation changes. No migration, production SQL write, function deployment, hosting/settings change, manual promotion, live sign-in or email was performed. Production QA not run (paused by owner). BF-16 limits remain off; paid stolen-password protection remains declined.

## Remaining BF-20 gates

This delivers the current-structure reconstruction slice. Full historical **data-effect** reconciliation, a reviewed bridge for future updates after the fresh baseline, exact-head release checks/merge approval and the separately deferred BF-02 database-plus-Storage recovery remain open. Automatic backend deployment stays disabled. A prepared schema is not a populated school, a recovery of learner work or a grant of curriculum/owner acceptance.

The [controlled backend deployment plan](../backend-deployment-plan.md) retains source/target preflight, serialization, explicit approval, complete shared-Edge consumer coverage, per-function gateway flags and deployed readback for any later authorized release.
