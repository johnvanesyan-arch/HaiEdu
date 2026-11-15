# Future updates after the fresh database baseline

This is the BF-20 **local qualification bridge**. It defines a separate, versioned
update list for databases created from the reviewed fresh baseline. It does not
adopt or modify an existing local/hosted database and is not a production deployer.
The committed list currently contains **zero application updates**. The two
synthetic examples used by tests are created in a temporary directory and removed.

## Rules

1. Preserve the original 208 source migrations, archived operation, 218 recorded
   production entries, baseline schema, technical defaults and source crosswalk.
   Never replay those files after the snapshot or mark them applied in a new
   Supabase migration ledger. `supabase db push/reset/repair` on the old directory
   is not this workflow.
2. Append each future update to `plan.json` with a unique increasing timestamp ID,
   exact SQL SHA-256, required starting/resulting catalogue hashes, explicit data
   prerequisites and a preservation policy. Both SQL bytes and the entire entry
   become immutable after application. An unlisted file, broken chain, changed
   historical file, unknown applied update or unexpected schema stops the run.
3. Create a new owned local stack and install the pinned baseline and four technical
   policies. Record its **actual baseline origin**, not fictional historical runs.
   The private local receipt schema is separate from Supabase's migration history
   and inaccessible to browser/service roles.
4. Apply only the pending suffix. One transaction and an advisory lock cover the
   whole pending batch, including its receipts. Data prerequisites and resulting
   catalogues are checked before committing. Failure rolls back transactional
   schema/data changes and receipts. A repeat is a checked no-op; an older plan or
   altered applied entry is refused. Competing runners are refused rather than
   queued silently.
5. Preserve every existing row's original column values and multiplicity in
   `public`, `private`, `auth` and `storage`. New columns/rows can be added. Hashes
   stay in memory; row contents never enter the evidence report. Table locks prevent
   background writes from being mistaken for update damage. Post-update real Auth,
   Data API and Storage checks separately verify the tested access boundaries.

This v1 contract supports transactional updates that preserve existing rows.
Intentional data rewrites/deletions, provider settings/schemas, cron jobs, external
effects, procedural blocks, transaction control and adoption of hosted/existing
databases require a separately reviewed extension or deployment plan. PostgreSQL
sequence increments can leave gaps after rollback; this is not a full data/Storage
recovery mechanism. The statement checks catch accidental misuse; reviewed SQL is
trusted code, **not sandboxed untrusted input**. No hosted target is selectable.

## Validate and rehearse

Use the pinned Python requirements and Docker setup from
[`../baseline/README.md`](../baseline/README.md).

```sh
python scripts/rehearse-fresh-updates.py
python scripts/inventory-historical-data-effects.py --check
python tests/fresh-update-unit.py
python tests/fresh-update-integration.py --evidence-dir /tmp/haiedu-update-tests
python scripts/rehearse-fresh-updates.py --rehearse --evidence-dir /tmp/haiedu-update-plan
```

The validation-only command opens no database. Rehearsal creates and removes its
own PostgreSQL 17.6, GoTrue, PostgREST, Storage and mail-catcher components. It accepts
no DSN, project ref, existing container or remote Docker host. Evidence is limited
to safe counts, hashes and refusal reasons; keep `private-diagnostics/` private.
This retains the earlier real-component qualification boundary, not full Supabase
CLI parity, hosted provider equivalence, classroom capacity or production QA.

## Preparing an actual future update

1. Inspect the existing schema and consumers; define the bounded change and its
   data prerequisites. Generate a new SQL filename using the installed Supabase
   CLI's discovered `migration new` command **in an isolated scratch workspace**,
   then place the reviewed file under `supabase/updates/sql/`. Do not append to the
   preserved historical directory. No actual update file is introduced by this PR.
2. Qualify the SQL against the pinned starting state and relevant synthetic data.
   Review the complete resulting catalogue, including privileges, RLS, functions,
   triggers and views, then commit its hash in the appended plan entry. Do not
   automatically accept whatever schema the candidate happens to produce.
3. Add purpose-specific preservation/access tests. Each `requiredData` entry names
   a `public`/`private` table, a nonempty map of column/value matches and a positive
   minimum count. Missing governed configuration is a stop, not permission to copy
   live content or replay old migrations.
4. Pass the required fresh-install, forward-update and existing CI checks. Obtain
   the usual exact-PR merge approval. Hosted release/recovery/coordination checks
   remain separate; this local runner cannot perform that release.

## Historical data effects

`historical-data-inventory.json` is a deterministic, non-executing inventory of all
209 pinned source/operation files. It identifies explicit DML targets, executable
statements and structural operations that may affect data, without literal values
or SQL bodies. 79 files contain explicit data writes and 66 contain executable
statements needing semantic review; those sets overlap. The crosswalk retains all
218 production records. This narrows review; it does not prove the effects of
dynamic SQL, triggers, procedural/function bodies or production-only operations.

Only the four reviewed actor-rate policies remain automatic technical defaults.
Schools, content, learning configuration, approvals, learner work, files and
environment bindings keep their governed provisioning/recovery paths. See the
[data dispositions](../baseline/data-dispositions.md). Full historical data-effect
reconciliation and BF-02 recovery remain open before production automation.

The Supabase docs were consulted for migration-history and seed semantics. Their
normal `db pull` workflow can write the remote ledger, so it is intentionally not
used for this preservation task. The September 2026 PostgreSQL 17.11 upgrade notice
also describes extension/index compatibility work; this delivery retains the
existing isolated 17.6 fixture and makes no provider-upgrade claim or live change.
