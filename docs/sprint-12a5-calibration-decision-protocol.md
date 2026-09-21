# Sprint 12A.5 — Calibration Decision and Versioning Protocol

**Status:** Complete  
**Protocol:** `haiedu_learning_model_change_decision / protocol-2026-09-21-r1`  
**Scope:** Governance only. No learning-model parameter changed.

## Purpose

12A.5 defines the only valid path from formal calibration evidence to a changed learning-model configuration. It prevents exploratory analysis, QA activity, or raw observation counts from silently becoming a production parameter change.

## Required decision sequence

Every calibration disposition must:

1. state a falsifiable hypothesis;
2. bind the exact immutable analysis scope and eligible r2 evidence;
3. report learner, learner-skill, session and observation counts, distribution across learners, provenance and limitations;
4. compare the frozen baseline with candidate behavior on the same eligible evidence;
5. record expected side effects;
6. record one explicit disposition: `approved_change`, `rejected_change`, `no_change`, or `deferred`;
7. for an approved change, reference a new immutable `approved` configuration descended from the reviewed baseline;
8. preserve the original model and runtime provenance of historical sessions.

There is no automatic numeric sufficiency gate. Sufficiency remains metric-specific and requires human review. If evidence is insufficient, the correct result is `no_change` or `deferred`.

## Database enforcement

Migration `0058_sprint_12a5_calibration_decision_protocol.sql` adds:

- `calibration_decision_protocols`: immutable versioned protocol definitions;
- `calibration_change_decisions`: immutable final decision records;
- `calibration_decision_evidence_snapshot_v`: service-role-only per-metric formal-evidence coverage for the pinned 12A.4 scope;
- insert-time validation that decision provenance matches the bound analysis scope;
- insert-time validation that an approved configuration is distinct, has kind `approved`, shares the model/release identity, and directly descends from the reviewed baseline.

Migration `0059_sprint_12a5_protocol_indexes.sql` indexes protocol lineage after the database advisor review.

Browser roles have no read or write privileges. `service_role` may select/insert but cannot update, delete, or truncate the governance tables. Views use invoker security.

## Approval is not deployment

An approved configuration is a frozen model record, not an activation signal. Runtime activation remains a separate, explicit build/binding operation. Existing sessions are never backfilled to the new model or runtime. A rollback is represented as a new forward decision/configuration rather than rewriting history.

## Current disposition boundary

The evidence snapshot exposes all 11 r2 metrics, but all currently have zero formal observations because the pinned pilot is blocked. 12A.5 therefore records no empirical change decision and creates no candidate or approved model version. Sprint 12B remains evidence-gated.

## Verification

- protocol fingerprint: `6bb93101cd6b3063ee33cc23d5e8a99f`;
- 11/11 r2 metric rows visible in the decision snapshot;
- 11/11 currently report zero formal observations;
- `automatically_sufficient = false` for every metric;
- no calibration decision records exist at 12A.5 closure;
- no learning-model configuration or parameter changed;
- regression coverage: `tests/sprint-12a5-calibration-decision-protocol.test.mjs`.

