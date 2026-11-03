# U1 snapshot recovery and publication integrity

3 November 2026. Prepared in PR397 after the read-only finding and the recorded-versus-counted correction. **Not applied to production.** The QA brief leaves merge, database changes and deployment with the owner after review.

## Coverage and cause

The SELECT-only [inventory](../../scripts/sql/item-snapshot-inventory.sql) covers all nine pilot/production releases and their active blueprints. Eight have complete snapshot coverage. Physics Unit 1 has 360 references to 240 distinct item/version pairs; 251 references point to 174 absent snapshots. The selected learner's 49 affected answers use 45 of those missing versions. The [sanitized receipt](../evidence/item-snapshot-coverage-20261103.json) records all nine releases; it contains no learner identities or answers.

The initial snapshot backfill in migration0009 preceded the legacy bank expansion in0015/0017/0026. Those creation paths did not guarantee snapshots, and blueprint publication in0039 had no mandatory snapshot check. The later editor preserves both revision versions but cannot retroactively establish an absent original snapshot. A version number or fingerprint alone is insufficient evidence: the fingerprint does not cover difficulty.

## Source proof and bounded repair

[The offline replay](../../scripts/recovery/build-unit1-snapshot-manifest.mjs) executes the committed original generator/template definitions and authored catalogues from0015,0017,0024 and0026 inside disposable PGlite. It compares the complete supported assessment contract: item ID/code/version, skill, response type, both prompts, stimulus, difficulty, ordered options, answer, tolerance and units. All110 fixed and64 deterministic candidates match. Every frozen reference matches its original template/version and fingerprint. Numeric answer/tolerance hashing normalizes insignificant decimal scale; `3.000` and `3` retain the same numeric meaning.

The [manifest](../evidence/unit1-snapshot-recovery-manifest-20261103.json) pins all174 IDs, original template/seed inputs, assessment hashes and SHA256 hashes of the four historical source files. It contains no question text or learner data. A fresh SELECT-only production preflight verifies174/174 candidates with zero snapshots already present. This proves content equivalence to the committed original sources; it does not prove that no unrecorded historical mutation ever occurred.

The new migration `20261103061948_item_snapshot_integrity.sql` locks the affected catalogue/reference tables, verifies every candidate and frozen reference again, then inserts only missing `item_versions` rows. Any content/reference drift, conflicting existing snapshot or unlisted active gap aborts the transaction. Reapplication preserves matching existing snapshots. It never rewrites question content, attempts, scores, sessions, mastery caches, QA, reviews, approvals or curriculum gates.

Recovered rows mark their source proof explicitly. Operational metadata, configuration and misconception mappings are captured at recovery time and labelled as current metadata, not historical approval evidence. `created_at` remains the actual recovery time. Source reconstruction supplies the assessable content; current-row copying alone is never sufficient.

## Shared prevention contract

The guards are subject-neutral and apply to all releases and bank writers:

- At transaction commit, newly published content receives a complete item/options/key/misconception snapshot. Publication without an answer or with inconsistent frozen content rolls back.
- Blueprint activation, late active-blueprint membership and release activation require valid referenced snapshots. Draft blueprint editing remains available.
- Existing exposed gaps cannot be silently backfilled by toggling publication. They require a separately reviewed source-proven recovery.
- New ledger entries must identify their actual item/version. Existing snapshot rows are immutable; the editor creates a new version for corrections.
- Helpers use caller privileges and an empty search path. Only service_role receives execution grants; no browser/API, RLS or authorization expansion is introduced.

Writers must complete content/options/keys and commit the publication snapshot before activating a blueprint; the deferred guard intentionally refuses to infer historical provenance from an already-active reference. Existing editor revisions already insert their new snapshot atomically before review/publication. Metadata-only QA/review updates remain possible. The unused legacy `snapshot_revision` Edge action previously attempted an old-version payload under a new version number; the identity guard now rejects its first insert before its separate item update can occur. Callers must use the existing `save_content_revision` action. No browser caller uses the legacy action. Existing content/release preparation scripts insert complete versioned snapshots and retain their own review gates.

This repair does not reconcile the separately reported production/repository migration-history drift (S2). The repair is deliberately bound to its exact release manifest; another environment without that scope fails closed and requires an explicit deployment plan, not a blind migration push.

## Verification

Five executable SQL tests exercise atomic publication and rollback, numeric normalization, activation and late membership, two independent release scopes, attempted historical gaps, same-version edits, snapshot identity/immutability, function privileges and the complete174-version repair. The full recovery rehearsal rebuilds every original candidate independently, rejects content and reference drift with zero inserts, applies twice without duplicates and preserves a recorded attempt byte-for-byte. The same tests are an explicit step in the required PostgreSQL17 CI job; they also run in the normal PGlite suite. They are transactional tests, not a claimed concurrent-production rehearsal.

The existing U1 UI checkpoint `90e3dbc93f1d65a45351d85b74eff01c8e788827` passed all five CI gates ([run41585169910](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41585169910)):1,669 unit/integration and400 native browser checks. That result predates this migration. PR397 records the current-source full CI result; current CI, owner review and the controlled production steps below remain required before release.

## Owner-controlled application and readback

1. Review PR397, its exact passing head, the new migration and manifest. Retain a pre-change database recovery point using the existing operations process. Reconcile the S2 deployment baseline before recording this migration; do not push unrelated pending migrations.
2. Rerun the SELECT-only inventory. Generate the bounded SELECT-only preflight with `node scripts/recovery/print-item-snapshot-preflight.mjs`; require174 candidates and174 verified, or individually review any already-recovered rows. Stop on drift. Record aggregate table fingerprints for content, existing versions, approvals and learning/history tables before the write.
3. Apply only the reviewed migration through the normal controlled migration mechanism, in one transaction. Record its version/checksum. Do not run the replay CLI or export learner answers against production; replay is offline only.
4. Rerun the inventory: Physics Unit1 must have zero missing versions/references, and the other eight releases must retain their original coverage. Verify174 inserted rows, their assessment hashes/source metadata and unchanged prior version/content/approval/learning fingerprints. The SQL guards and service-only privileges must match the reviewed file.
5. Deploy and read back both affected U1 analytics consumers, `get-teacher-dashboard` and `get-teacher-student`, with their complete shared bundles. Verify frontend/bundle source before a narrowly scoped read-only teacher check. Without recovery, S02/S04 show4/3 recorded and zero counted with the unavailable label. After successful recovery, their existing4/3 answers become countable; the selected learner's totals should resolve from60 recorded/11 countable to60/60. Preserve the original contracts and saved scores/readiness; newly available teacher estimates may now appear. Do not manufacture learner submissions for acceptance.

If the transaction fails, PostgreSQL rolls it back. Once committed, retain the recovered immutable versions and source receipt; do not delete evidence to roll back the UI. Any guard compatibility defect needs a separately reviewed follow-up migration, and any incorrect content needs a new reviewed version. Live owner usability/B.12.3/B.12 and subject-expansion decisions remain separate.
