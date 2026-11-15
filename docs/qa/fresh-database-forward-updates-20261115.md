# BF-20 — Future updates after the fresh database baseline

**Local bridge delivery merged and verified on 15 November 2026 (Asia/Yerevan).**
Owner-approved [PR488](https://github.com/johnvanesyan-arch/HaiEdu/pull/488) merged at
`1d65c1f9c476c9c3f9b89511b1d045090219b6dc`, preserving approved tree `6d2c934921d7267c34db37616942b1633392e68f`.
All five [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43697886510)
and [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43698935120)
pass on attempt 1: 1,847 code tests, 696 browser checks, 15 new plan controls,
20 new integration checks, the existing eight baseline controls/18 baseline
integration checks and the committed-plan rehearsal. These counted suites have
zero failures, skipped tests or cancellations.

The three public domains serve the merged source. Twelve fresh static identity,
manifest, representative HTML/JavaScript hash, MIME, cache and enforcing-security-header
checks pass. Existing full-build evidence is reused because all application/build
inputs are unchanged. Only static files were fetched; no page scripts, sign-in or
Supabase request was used. Normal Git integration updated the site; no manual
promotion or hosting-setting change occurred. The [safe receipt](../evidence/fresh-database-forward-updates-20261115.json)
records the local and merged release proof. This is a local update qualification,
not hosted adoption, data/Storage recovery or full BF-20 closure.

## Problem and resulting behavior

The fresh baseline can reconstruct the current application structure, but the old
migration directory contains already represented structure, versioned content,
data rewrites and environment-specific operations. Replaying it after the snapshot
would repeat historical work; marking all its files applied would invent history.

The new [forward-update plan](../../supabase/updates/README.md) pins the baseline,
technical seed, source crosswalk and all 209 historical source/operation inputs.
Future SQL lives in a separate explicitly ordered list. The committed list is
empty: this delivery adds the mechanism, not an application schema update.

The runner always creates its own disposable local database. It cannot select an
existing or hosted target. It records the actual baseline origin in a private
local schema, checks the applied prefix and current application catalogue, then
applies only pending entries. An advisory lock serializes execution. One transaction
covers the pending batch and its receipts. Missing data prerequisites, changed
files/history, drift, unexpected resulting structure or loss/change of existing
row values abort the batch. A repeated completed run is a checked no-op.

## Qualification

- Fifteen plan/refusal tests pass, including historical edits/additions, changed
  baseline/seed/SQL, duplicate keys/IDs, broken chains, external paths/symlinks,
  unsupported scope, transaction/admin/procedural statements, quoted and nested
  provider writes, untracked relation shapes and unsafe prerequisites.
- Twenty real-component checks pass on owned PostgreSQL 17.6, GoTrue, PostgREST,
  Storage and a local mail catcher. Two synthetic updates exist only in a temporary
  package. The test independently derives their expected catalogues in a rolled-back
  transaction; future real plans must commit separately reviewed resulting hashes.
- Real Auth sign-ins, two synthetic subject/skill/evidence contexts and a private
  file are created before updating. Own-profile access, other-profile denial and
  private-file bytes/access are checked before and after. Existing row values in
  application/Auth/Storage tables are hashed only in memory and preserved.
- A competing update lock, schema drift, missing data, wrong post-state, learning
  evidence deletion and account-data rewriting all refuse safely. A later SQL
  failure rolls back the complete batch. Appending a second update resumes at the
  recorded prefix; repeat, changed-history, shortened-plan and receipt/permission
  tampering cases are checked. Browser and service roles cannot access receipts.
- The current empty committed plan also rehearses successfully, including its
  repeat run. No Supabase migration ledger is fabricated. Owned containers,
  temporary database/files and networks are removed.
- The required PostgreSQL CI job includes the plan controls, deterministic historical
  inventory, synthetic update integration and actual committed-plan rehearsal. All
  existing jobs remain in `Platform release checks`.

The initial plan-test helper wrote an intentionally new fixture file before reading
the preceding plan; the unlisted-file guard correctly refused it. The helper order
was corrected and all controls pass. That fixture failure is retained as historical
test evidence, not a production defect. The complete earlier baseline qualification
(18 integration checks/eight comparison controls) remains unchanged and runs in CI.

## Historical effects and limits

The deterministic [inventory](../../supabase/updates/historical-data-inventory.json)
covers 208 source migrations and one archived operation. Seventy-nine files have
explicit data writes; 66 have executable statements requiring semantic review.
Those groups overlap. Only object names, statement kinds and fingerprints are
included, never literal data, procedural bodies or user records. The 218 production
records retain their existing crosswalk without ledger changes.

This inventory does not establish every historical data effect or identify every
required governed seed. Function/trigger/procedural behavior, dynamic SQL,
data-dependent DDL and production-only operations remain review work. Only the four
previously reviewed actor-rate policies remain automatic defaults. Content,
learning configuration, approvals, users, files and runtime bindings are not copied.

The v1 bridge preserves existing rows and supports a bounded set of transactional
application statements. Intentional data rewrites/deletions, provider/cron changes,
hosted adoption and external effects require a separately reviewed contract.
Reviewed SQL is trusted code; the guards are not a SQL sandbox. PostgreSQL sequence
increments may leave gaps after rollback. File bytes are checked through actual
Storage for the synthetic object, not recovered from a backup.

The Supabase migration/seed docs and relevant changelog were consulted. Normal
`db pull` can write remote history and was not used. The PostgreSQL 17.11 extension
upgrade notice is separate from this preserved isolated 17.6 fixture; no provider
upgrade, full CLI distribution parity or hosted configuration equivalence is claimed.

## Delivery boundary

Shared subject-neutral development/release tooling only. Existing migration files,
baseline SQL/manifest/seed/crosswalk, browser code/builds, packages, Edge Functions
and runtime settings remain unchanged. No production SQL, schema, deployment,
settings, sign-in, email or production QA action was performed. Existing hosted
test-project data is untouched. No paid service is required.

Affected production QA: **none**. Production QA not run (paused by owner).
BF-16 limits remain off; paid stolen-password protection remains declined.

This qualifies the local future-update mechanism. Full historical data-effect
reconciliation, separately deferred BF-02 database-plus-Storage recovery and any
hosted adoption/release qualification remain open. Automatic backend deployment
stays disabled. See the [controlled deployment plan](../backend-deployment-plan.md).
