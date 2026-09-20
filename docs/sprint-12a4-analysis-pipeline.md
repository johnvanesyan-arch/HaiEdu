# Sprint 12A.4 — Calibration Analysis Pipeline

**Status:** Complete after closure-audit correction (pipeline only; no parameter decision or tuning)  
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
| `calibration_mastery_replay_v` / `calibration_mastery_trajectory_v` | attempt / learner-skill | Frozen-model replay, first secure event and right-censoring |
| `calibration_practice_burden_v` | learner-skill | Sessions, attempts, independent/hinted attempts, response-time burden and censoring |
| `calibration_recent_recovery_events_v` | learner-skill recovery event | First transition into the actual 4/5 independent rule plus next independent follow-up |
| `calibration_hint_followup_v` | remediation event | Next independent attempt after help |
| `calibration_item_analysis_v` | item/template | Learner-aware correctness, median response time and hint rate |
| `calibration_repeat_influence_v` | learner-session | Repeat/pool-exhaustion rates and comparative correctness |

All views use invoker security. `anon` and `authenticated` have no access; `service_role` has `SELECT` only.

## Eligibility rules

- QA artifacts are excluded.
- Unclassified sessions remain visible with `classification_pending` and are excluded.
- Formal evidence requires the complete pilot entry gate, an allowed pilot status (`running`, `observing`, or `closed`), the named participation gates, and exact release, blueprint, learning-model and runtime provenance.
- Authorized active/abandoned Practice trajectories remain eligible for the r2 metrics that admit incomplete evidence and are marked right-censored where relevant.
- Diagnostic and Mastery Check metrics retain their completion requirements.
- Formal hint-content analysis requires an immutable guide snapshot and exact rendered content.
- Recommendation conversion requires a server-written `action_started`; a click is not treated as a learning action.
- Threshold sensitivity is exposed as offline analysis only and cannot change production behavior.

## Closure-audit correction — 2026-09-20

The first 12A.4 implementation did not fully enforce the r2 pilot-state boundary, selected the latest matching pilot dynamically, modelled recent recovery too loosely, and left several metric rows as observation placeholders. Migration `0056_sprint_12a4_audit_corrections.sql` corrects those defects.

The operative contract/metric/pilot tuple is now frozen in immutable `calibration_analysis_scopes`. Unclassified state is exposed independently through `classification_pending` and a complete `exclusion_reasons` array. Metric keys now exactly match the immutable r2 registry.

## Verification snapshot — 2026-09-20

- Source/view reconciliation at verification time: 17/17 sessions, 142/142 attempts and 29/29 remediation events.
- All 11 r2 metrics appear in the sample summary, including zero-observation metrics.
- Formal metric observations: **0**.
- Browser-role `SELECT`: denied on all 13 analysis views; `service_role` read access: granted.
- Learning parameters: unchanged.

The nonzero QA/context counts validate pipeline mechanics only. They are not evidence for tuning.

## Reproduction

Start from `calibration_metric_sample_summary_v`, then trace any count to `calibration_metric_observations_v` and onward to the relevant session, attempt/exposure, remediation event or recommendation path view. Eligibility reasons and all operative provenance labels remain on the rows.

Migrations: `0055_sprint_12a4_calibration_analysis_views.sql` and audit correction `0056_sprint_12a4_audit_corrections.sql`.
