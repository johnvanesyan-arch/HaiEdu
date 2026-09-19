# Sprint 11L — Re-baselined Chapter I Pilot Closure

Status: in progress. This document covers the first 11L slice: evidence compatibility and pilot-entry control.

## Confirmed baseline (2026-09-19)

- Target release: `physics7_u01_2026_08_14_pilot_r1` (`exact`, `pilot`).
- Target-release evidence: 0 sessions, 0 attempts, 0 exposure events, 0 mastery rows.
- Legacy evidence: 11 sessions, 94 attempts, 56 exposure events, 10 mastery rows.
- All legacy evidence is bound to `physics7_u01_legacy_pre_11k` and marked `legacy_inferred`.
- One abandoned diagnostic is explicitly dispositioned as an automation-navigation artifact.
- Four accounts have privacy preferences; one opted into analytics and research. Those preferences are not operational participant or guardian authorization.

## Compatibility policy

| Classification | Rule | Sprint 11L use |
| --- | --- | --- |
| Compatible | Completed session with exact provenance, bound to the target release and immutable blueprint, with no QA disposition. | Eligible for closure review, subject to authorized cohort scope. |
| Partially compatible | Legacy-inferred evidence that remains useful for regression or qualitative context, while exact historical blueprint membership is not asserted. | Context only; excluded from cohort closure metrics. |
| Incompatible | Abandoned/QA artifact, release mismatch, unauthorized evidence, outside-cohort evidence, or another failed scope rule. | Retained for audit; excluded from closure. |

Closure eligibility is derived in `pilot_evidence_detail_v`. It is not a writable flag, and remains false until both participation authorization and cohort enrollment gates pass.

## Data model

- `pilot_runs`: one controlled pilot identity bound to one target curriculum release.
- `pilot_evidence_classifications`: one classification per pilot run and learning session.
- `pilot_gate_checks`: six entry gates and five closure gates, each with technical, human, or shared ownership.
- `pilot_evidence_detail_v`: per-session classification plus derived closure eligibility and evidence counts.
- `pilot_evidence_summary_v`: compatible/partial/incompatible totals and eligible evidence totals.
- `pilot_entry_readiness_v`: derived entry and closure readiness. A recorded status cannot make unresolved gates disappear.

The `pilot_runs_gate_state_guard` trigger rejects transitions to `entry_ready`, `running`, `observing`, or `closed` while required gates remain open. Closure additionally requires all 11 gates to pass.

All three tables use RLS. Only `admin` and `content_admin` roles can read or mutate pilot-governance records. Views use `security_invoker` so they retain the underlying RLS boundary.

## Initial gate state

| Gate | Stage | Owner | State |
| --- | --- | --- | --- |
| Evidence baseline classified | Entry | Technical | Passed |
| Sprint 11F disposition complete | Entry | Shared | Blocked |
| Sprint 11G two-subject QA passed | Entry | Technical | Pending |
| Sprint 11H surface QA passed | Entry | Technical | Pending |
| Participation authorized | Entry | Human | Blocked |
| Cohort enrolled | Entry | Human | Blocked |
| Diagnostic → Practice → Mastery lifecycle observed | Closure | Shared | Blocked |
| Teacher/usability evidence collected | Closure | Human | Blocked |
| Exposure/repetition reviewed | Closure | Shared | Blocked |
| Standards alignment reviewed | Closure | Shared | Blocked |
| Pilot report approved | Closure | Human | Blocked |

## Operational sequence

1. Complete or explicitly disposition the remaining 11F checks.
2. Run 11G and 11H with a two-subject learner and the required teacher/admin/content personas.
3. Name the operational participation-authorization owner and approve participant/guardian information, scope, withdrawal, suspension, and deletion handling.
4. Assign the approved class and cohort to the pilot run.
5. Record only exact target-release cohort evidence as compatible.
6. Observe the full learner lifecycle and collect teacher/usability evidence.
7. Review exposure/repetition and standards-alignment findings.
8. Approve the Sprint 11 pilot report only after all closure gates pass.

## Deliberate non-claims

- The controlled cohort has not run.
- Existing legacy evidence does not validate the exact 11K curriculum release.
- Analytics or research opt-in is not treated as participant or guardian authorization.
- External Physics SME approval remains a separate production-release gate; it is not silently treated as complete here.
