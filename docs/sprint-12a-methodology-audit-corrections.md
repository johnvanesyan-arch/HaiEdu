# Sprint 12A — Methodology Audit Corrections

**Status:** ✅ Complete  
**Executed:** 2026-09-20  
**Scope:** Correct methodological/provenance weaknesses identified in the 12A.1–12A.3 audit before starting 12A.4.

## Boundary

This slice did **not** change any learning/calibration parameter.

Unchanged runtime parameters include:

- secure threshold: 0.72;
- hinted-positive multiplier: 0.65;
- recent recovery: 4/5 recent independent correct with existing uniqueness rule;
- Practice planned length: 8;
- Mastery Check overall pass threshold: 80%;
- Mastery Check per-skill minimum: 1 correct.

This slice also did **not** begin the 12A.4 analysis pipeline.

## 1. Exact learning-model provenance on sessions

Migration: `0048_sprint_12a_session_model_provenance.sql`.

Implemented:

- `public.learning_model_runtime_bindings`;
- active runtime binding for Physics 7 Chapter I to `baseline-2026-09-20-r1`;
- `learning_sessions.learning_model_configuration_id`;
- `learning_sessions.model_provenance_status`;
- fail-closed BEFORE INSERT stamping of the active immutable model configuration;
- immutable model provenance after session creation.

Historical sessions were **not** guessed/backfilled. There were zero sessions created after the baseline freeze, so all 14 prior sessions remain explicitly `unbound_legacy`.

Rollback verification proved a new session on the current release is stamped:

- `model_provenance_status = exact`;
- model = `baseline-2026-09-20-r1`.

## 2. Immutable remediation-guide provenance

Migration: `0049_sprint_12a_remediation_guide_provenance.sql`.

Implemented:

- versioning for skill remediation guides;
- append-only `public.remediation_guide_versions`;
- automatic new version on material guide-content change;
- immutable guide-content snapshots;
- `remediation_events.guide_snapshot_id`;
- exact rendered title/strategy/content fields for future help events;
- fail-closed resolution of guide source + version to immutable snapshot.

Current live snapshot inventory:

- 10 skill-guide snapshots;
- 9 template-guide snapshots;
- all existing remediation events resolve to a guide snapshot.

Older events predate exact rendered-text capture and therefore retain guide-version provenance but not reconstructed rendered text. Future events capture the exact Armenian text shown.

`get-remediation-help` is deployed as Edge Function **v6**.

Rollback verification proved a material guide edit increments the guide version and creates a corresponding immutable snapshot.

## 3. Recommendation-event telemetry

Migration: `0050_sprint_12a_recommendation_telemetry.sql`.

Implemented append-only `public.recommendation_events` with:

- recommendation instance identity;
- issued / shown / followed event types;
- separate `dashboard_orchestration` and `core_after_attempt` policy scopes;
- learner, surface, action and target skill;
- curriculum release and assessment blueprint;
- learning-model configuration + provenance status;
- session/attempt references where applicable;
- learner-state snapshot;
- recommendation snapshot.

Backend:

- `get-student-dashboard` v17 issues dashboard-orchestration recommendations;
- `submit-answer` v11 issues core-after-attempt recommendations;
- `record-recommendation-event` v1 records authenticated shown/followed interactions.

Learner surfaces instrumented:

- Home;
- Progress;
- Physics course;
- Practice auto-targeting;
- Practice feedback;
- Diagnostic results.

Teacher intervention recommendations are intentionally outside learner-calibration recommendation telemetry.

Historical recommendations before telemetry activation are **not retrospectively reconstructed**.

## 4. Audited calibration evidence contract r2

Migration: `0051_sprint_12a_audited_calibration_r2.sql`.

Operative contract:

`haiedu_formal_calibration_evidence / contract-2026-09-20-r2`

Fingerprint:

`158dddfe255ccf0a333eafd2f1d97558`

Predecessor:

`contract-2026-09-20-r1`

r1 is retained unchanged as an immutable historical draft.

Key r2 corrections:

- exact learning-model provenance is required;
- model configuration must match the reference frozen model;
- evidence eligibility is **metric-specific**, not controlled by one global completed-session rule;
- authorized incomplete/abandoned trajectories may contribute where the metric makes that evidence relevant;
- time-to-secure/threshold trajectories retain non-secure learners as right-censored observations rather than dropping them;
- Diagnostic and Mastery Check metrics retain their relevant completion requirements;
- recommendation metrics require prospective recommendation-event telemetry;
- QA/reviewer/automation/outside-cohort/legacy/release-mismatch/unbound-model evidence remains excluded;
- no universal learner/observation count determines calibration sufficiency.

Human authorization/cohort gates remain Sprint 11.5 responsibilities.

## 5. Audited calibration metric set r2

Operative metric set:

`haiedu_learning_model_calibration_metrics / metrics-2026-09-20-r2`

Fingerprint:

`7a12d19d62fbfc95c52b7f7952aaa235`

Predecessor:

`metrics-2026-09-20-r1`

Key r2 corrections:

- removes the universal 10-learners + 30-observations rule;
- raw attempts are not treated as independent learners;
- reporting must expose learners, learner-skill trajectories, sessions, observations, skill coverage and distribution across learners;
- analysis should respect learner clustering;
- no universal Wilson-interval rule;
- interval method must match the analysis unit and clustering;
- no single numeric threshold authorizes tuning;
- incomplete non-secure trajectories remain visible/censored where appropriate;
- response time is an operational signal, not a direct cognitive-difficulty measurement;
- recommendation-path accuracy becomes prospectively measurable for evidence created after telemetry activation;
- pre-telemetry recommendation history cannot be inferred.

### Expanded Hinting v2 analysis

Formal hint analysis can now stratify by:

- Hint 1 / Hint 2 / worked example;
- pre-answer vs post-error;
- template guide vs skill fallback;
- task-specific vs fallback guide;
- exact guide version.

Outputs can include later independent success/recovery instead of only assisted-vs-independent correctness.

## Verification

- audit correction regression suite: PASS;
- GitHub CI: PASS on implementation commits;
- new-session model-stamping rollback probe: PASS;
- guide version/snapshot rollback probe: PASS;
- recommendation-event mutation block: PASS;
- new audit-slice foreign keys have covering indexes;
- Supabase security advisor reports only the intentional server-only RLS/no-policy INFO pattern for new governance tables plus the pre-existing leaked-password-protection warning.

## Current position

12A.1–12A.3 remain complete, now with audited r2 methodology/provenance.

**Next bounded slice: 12A.4 — provenance-aware read-only calibration analysis pipeline.**

12A.4 has not been started by this audit-correction work.
