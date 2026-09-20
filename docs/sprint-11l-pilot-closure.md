# Sprint 11L — Re-baselined Chapter I Handoff & Pilot Controls

Status: in progress. This document covers evidence compatibility, technical handoff controls, and the fail-closed pilot governance that is carried into Sprint 11.5.

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

### Sprint 11 — technical handoff

1. Complete or explicitly disposition the remaining 11F checks.
2. Run 11G and 11H with the two-subject learner and the required teacher/admin/content personas.
3. Confirm the exact-release evidence baseline and pilot governance remain fail-closed.
4. Produce the Sprint 11 technical handoff report.

Sprint 11 may then close as **technically handoff-ready** even though the `pilot_runs` record remains blocked. Closing Sprint 11 does not override, bypass, or mark any human pilot gate as passed.

### Sprint 11.5 — controlled external tester pilot

5. Name the operational participation-authorization owner and approve participant/guardian information, scope, withdrawal, suspension, and deletion handling where applicable.
6. Assign the approved class/tester cohort to the pilot run.
7. Record only exact target-release authorized cohort evidence as compatible.
8. Observe the full learner lifecycle and collect teacher/usability evidence.
9. Review exposure/repetition and standards-alignment findings.
10. Approve the formal pilot/test report only after all pilot closure gates pass.

## Phase 2 execution packet — 11F–11H closure punch-list

This is a closure punch-list, not a redesign phase. Do not introduce new architecture unless a test exposes a genuine blocking defect.

### 11F — finish or disposition the remaining production-workflow checks

1. **Teacher evidence verification**
   - Verify the authorized teacher can see the completed Diagnostic/current skill evidence generated by the QA learner.
   - Confirm the rendered values are consistent with the retained learner evidence and do not expose unrelated learner/class data.

2. **Mastery lifecycle disposition**
   - Preserve the already-verified legitimate Mastery-ineligible state.
   - Do **not** manipulate learner evidence or force eligibility merely to start a Mastery Check.
   - If legitimate eligibility is still unavailable, formally disposition Mastery start/resume/completion to the authorized exact-release 11L cohort, where the full Diagnostic → Practice → Mastery lifecycle is already a closure gate.
   - If legitimate eligibility exists naturally, execute the normal start/resume/completion path without bypassing gates.

3. **Suspension and session revocation**
   - Verify a suspended learner cannot continue normal learning access.
   - Verify active-session behavior is fail-closed after suspension/revocation.
   - Use an existing disposable/QA account where possible; do not create destructive state on retained learner history unnecessarily.

4. **Privacy preference behavior**
   - Verify the authenticated privacy-preference workflow persists correctly and remains scoped to the authenticated user.
   - Preserve the distinction that analytics/research preferences are **not** pilot participant/guardian authorization.

5. **Deletion-request workflow**
   - Execute the non-destructive request/cancel or equivalent reversible workflow on a disposable QA account where available.
   - Do not delete the retained QA learner merely to satisfy the test.
   - If no safe disposable account/path exists, record an explicit accepted disposition rather than performing an irreversible destructive action.

6. **11F technical readiness disposition**
   - Mark 11F complete only when each residual above has either PASS evidence or an explicit accepted disposition.
   - Produce/update the technical pilot-readiness evidence accordingly.

### 11G — final two-subject route QA

Using the prepared two-subject QA learner:

- open Mathematics 7 through the normal learner shell;
- verify it opens only the generic entitled-course placeholder;
- verify no Physics Diagnostic, Practice, Mastery, Progress, recommendation, item, session or learner-evidence data appears in the Mathematics workspace;
- preserve the Mathematics fixture as QA architecture data only.

This is the only remaining 11G acceptance criterion.

### 11H — remaining visual-containment QA

Run rendered spot checks for the already-defined pending surfaces only:

- two-subject learner Home;
- Mathematics placeholder workspace;
- teacher surface;
- admin surface;
- content-admin surface.

Check for blocking containment defects: overflow, clipping, overlap, broken Armenian wrapping, malformed card/button spacing, or subject-scope leakage. Reuse the established desktop rendered-QA baseline; do not reopen the already-dispositioned browser/device matrix unless a newly observed defect specifically requires it.

### Phase 2 completion rule

After all three gates have PASS evidence or explicit accepted dispositions:

- update the Sprint 11F/11G/11H implementation records;
- update the technical gate states in the 11L pilot records where appropriate;
- synchronize the GitHub roadmap and Notion mirror;
- produce the Sprint 11 technical handoff report;
- do **not** advance the pilot to `entry_ready` unless the human participation-authorization and cohort-enrollment gates also pass.

If 11F, 11G and 11H all close successfully, the pilot record is expected to show **4/6 entry gates passed**: evidence baseline + 11F + 11G + 11H. That is sufficient for **Sprint 11 technical handoff closure**, but not for pilot entry. The remaining two entry gates—human participation authorization and cohort enrollment—are Sprint 11.5 work.

## Sprint boundary decision — 2026-09-20

Human participation authorization and real tester/cohort execution are explicitly deferred from Sprint 11 to **Sprint 11.5 — Controlled External Tester Pilot**.

This changes the **project sprint closure criterion**, not the pilot governance model. The database pilot gates remain fail-closed exactly as implemented. Sprint 11 can close when the product is technically handoff-ready while the pilot itself remains `blocked` until human gates pass.

Informal QA/usability testing after technical handoff may help find defects, but it must not be counted as formal pilot or Sprint 12 calibration evidence unless it satisfies the Sprint 11.5 authorization/cohort requirements.

## Deliberate non-claims

- The controlled cohort has not run.
- Existing legacy evidence does not validate the exact 11K curriculum release.
- Analytics or research opt-in is not treated as participant or guardian authorization.
- External Physics SME approval remains a separate production-release gate; it is not silently treated as complete here.
