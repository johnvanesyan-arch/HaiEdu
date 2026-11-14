# Fresh database baseline — BF-20 candidate

This package reconstructs HaiEdu's **current application structure** on an empty local Supabase installation. It is separate from `supabase/migrations/`, whose applied files and production history remain unchanged.

Status: candidate; release approval remains separate. Do not use this package on a hosted project. It is not a backup, a data restore, a production upgrade, or proof that BF-20 is closed. Current verification is recorded in [the delivery report](../../docs/qa/fresh-database-baseline-20261114.md).

## Scope

- 148 application tables, 29 views, 346 functions, 150 triggers, five enums and two identity sequences.
- Table/column/function/schema/type privileges, default grants, row-security policies, constraints, indexes, function attributes, generated columns and application comments.
- The application-owned trigger on `auth.users`; Auth and Storage schemas themselves must be supplied by real local Supabase services.
- No user rows, files, curriculum releases, approvals, learner work, production runtime bindings, secrets or production ledger rows are copied.
- The maintenance function and health view are present. No scheduled job is activated. Real-classroom limits, paid features and production QA retain their existing owner decisions.

`schema.sql` is created from a read-only catalogue pinned to source `70a466cd1bcb19e4558a741331d23d5f3e87916a`. The captured structure was reconciled with source/recorded function bodies in the initial BF-20 audit. `manifest.json` contains deterministic fingerprints; the full private operational export is not a required runtime input. [The crosswalk](source-history-crosswalk.json) preserves the source/history distinction without copying executed SQL bodies or changing the ledger.

## Run the complete disposable rebuild

Requirements: Docker with a local Unix socket, Python 3.12, approximately 3 GB for the pinned component images plus Docker's storage overhead, and network access to download their public images. No cloud account or credential is needed. The runner does not use an existing hosted or local database.

```sh
python -m venv /tmp/haiedu-baseline-venv
/tmp/haiedu-baseline-venv/bin/pip install -r tests/requirements-fresh-baseline.txt
/tmp/haiedu-baseline-venv/bin/python tests/fresh-baseline-unit.py
/tmp/haiedu-baseline-venv/bin/python tests/fresh-baseline-integration.py --evidence-dir /tmp/haiedu-baseline-evidence
```

The integration runner creates a private Docker network, PostgreSQL 17.6 with pg_cron, and real GoTrue, PostgREST, Storage and mail-catcher components. Only loopback ports are published. It installs the schema and technical seed, verifies the catalogue and runs synthetic access/concurrency checks, then removes its containers, temporary database/files and network. This reconstructs and tests the full application schema; it does not launch the full Supabase CLI distribution, Realtime, Edge Functions, Studio or Vault.

The full CLI bundle could not be downloaded in the audit workspace because its expanded PostgreSQL image exceeded available Docker storage. The component test uses the existing lean PostgreSQL image with actual provider migrations. Auth/Storage migration ownership and provider administrative settings are not claimed identical to hosted production.

`result.json` and `catalogue-comparison.json` are safe test receipts. Keep the `private-diagnostics/` directory private; it is not a publication artifact. Test signing secrets, passwords, users, buckets and messages are generated locally and never point to production.

## Installation boundary

Use a disposable local Supabase stack with PostgreSQL 17, Auth and Storage initialized. The installer must prove that it owns the local container before connecting. It must never accept a remote DSN or a linked hosted project. Local messages use the test mail catcher only.

The SQL requires an explicit transaction setting, `haiedu.fresh_baseline=local-empty-v1`, and rejects any existing application tables, views, sequences, enum/domain types or functions. This is an additional guard; it does not replace local target ownership verification. Installation is atomic.

Do **not** run the historical migration directory after this baseline. Those scripts include already represented changes, superseded content drafts and environment-specific operations. Do not insert their versions into the fresh project's migration ledger, rename their files, or mark them applied as a shortcut. A reviewed future-update bridge remains a separate BF-20 task.

## Reproducibility and maintenance

The read-only query in `scripts/sql/fresh-baseline-catalogue.sql` captures structure and ACLs under `search_path=pg_catalog`. It never reads application rows or provider filesystem files. Sequence bounds are strings to preserve 64-bit values across JSON tools.

`scripts/build-fresh-baseline.py` generates the package from the private reviewed export and fails on unsupported shapes. `scripts/compare-fresh-baseline.py` accepts either that export or the committed manifest as its expected input. Column order and enum order remain significant; grants and unordered object collections compare independent of provider-assigned role OIDs.

PostgreSQL's view deparser adds default `AS text`/`AS uuid` labels to constant casts in right-hand UNION arms of one view after reconstruction. The comparator uses PostgreSQL 17 syntax trees and ignores only these unused labels in simple, unordered/ungrouped arms, plus parser source offsets. Left-arm output names, literals, operators, filters, column order and security properties remain significant. Negative controls verify that actual query or access-control changes fail the comparison. Function definitions remain byte-exact.

The current baseline does not silently include curricular or administrative data. Required non-user technical seeds and synthetic acceptance fixtures are described in [data dispositions](data-dispositions.md). Empty structure alone is not a ready school or a recovery of student work.

BF-02's database-plus-Storage recovery exercise remains deferred and is still required before production automation. This local package does not authorize a paid project, live migration, deployment, configuration change, merge or release.
