# Sprint 12A.4 — Calibration Analysis Pipeline

**Status:** Complete (pipeline only; no parameter decision or tuning)  
**Operative contract:** `contract-2026-09-20-r2`  
**Operative metrics:** `metrics-2026-09-20-r2`

## Boundary

12A.4 provides a read-only evidence pipeline. It does not change the frozen learning model, authorize a pilot participant, decide evidence sufficiency, or start 12A.5/12B.

The pipeline deliberately shows context and excluded evidence. Formal eligibility fails closed. Sprint 11.5 closure classification remains separate from metric-specific calibration eligibility.

## Views

| View | Grain | Purpose |
| --- | --- | --- |
| `calibration_session_eligibility_v` | session | Contract, gate, provenance and per-metric eligibility with explicit reason |
| `calibration_attempt_evidence_v` | attempt/exposure | Reproducible item, skill, response-time, hint and selection evidence |
| `calibration_hint_evidence_v` | remediation event | Exact immutable guide snapshot and rendered-content eligibility |
| `calibration_recommendation_paths_v` | recommendation instance | `issued → shown → clicked → action_started`; only server-confirmed starts count as action |
| `calibration_metric_observations_v` | metric observation | Normalized auditable ledger behind every sample summary |
| `calibration_metric_sample_summary_v` | metric | Learners, learner-skill trajectories, sessions, observations, coverage, time window, censoring and provenance |

All views use invoker security. `anon` and `authenticated` have no access; `service_role` has `SELECT` only.

## Eligibility rules

- QA artifacts are excluded.
- Unclassified sessions remain visible with `classification_pending` and are excluded.
- Formal evidence requires the participation gates plus exact release, blueprint, learning-model and runtime provenance.
- Authorized active/abandoned Practice trajectories remain eligible for the r2 metrics that admit incomplete evidence and are marked right-censored where relevant.
- Diagnostic and Mastery Check metrics retain their completion requirements.
- Formal hint-content analysis requires an immutable guide snapshot and exact rendered content.
- Recommendation conversion requires a server-written `action_started`; a click is not treated as a learning action.
- Threshold sensitivity is exposed as offline analysis only and cannot change production behavior.

## Verification snapshot — 2026-09-20

- Source/view reconciliation: 16/16 sessions, 139/139 attempts and 26/26 remediation events.
- Recommendation reconciliation: 92 issued instances and 92 path rows.
- All 11 r2 metrics appear in the sample summary, including zero-observation metrics.
- Formal metric observations: **0**.
- Browser-role `SELECT`: denied on all six views; `service_role` read access: granted.
- Learning parameters: unchanged.

The nonzero QA/context counts validate pipeline mechanics only. They are not evidence for tuning.

## Reproduction

Start from `calibration_metric_sample_summary_v`, then trace any count to `calibration_metric_observations_v` and onward to the relevant session, attempt/exposure, remediation event or recommendation path view. Eligibility reasons and all operative provenance labels remain on the rows.

Migration: `0055_sprint_12a4_calibration_analysis_views.sql`.
