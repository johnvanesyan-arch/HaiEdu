# Deferred background QA — 3 November 2026

All eleven requested suites have complete passing executions on production source `58f4075ca9050ddffcb35d13a1bf94606a483ec8`. Ten pass on their first attempt; institutional actions passes a complete second attempt after one no-response failure. That first attempt remains failed. The exact transport cause is unconfirmed and remains under QA-TRANSPORT-01.

The latest successful executions pass **1,849/1,849 main checks and 702/702 nested isolation controls**. All **62 main and 78 isolation QA-session closures** are acknowledged with the existing accepted HTTP200/204 results. Main-check counts include runner guards and cleanup assertions; isolation controls are separate assertion rows, not additional learner journeys.

## Exact runs

| Suite | Run / attempt | Main checks | Isolation controls | Result |
|---|---|---:|---:|---|
| Chapter III pilot read acceptance | [41620877816](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41620877816) / 1 | 123/123 | 54/54 | Passed |
| Chapter IV pilot read acceptance | [41620929251](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41620929251) / 1 | 155/155 | 54/54 | Passed |
| Chapter V pilot read acceptance | [41620941350](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41620941350) / 1 | 191/191 | 54/54 | Passed |
| Chapter VI pilot read acceptance | [41620953836](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41620953836) / 1 | 324/324 | 54/54 | Passed |
| English Unit 1 pilot read acceptance | [41621035876](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621035876) / 1 | 130/130 | 54/54 | Passed |
| English Unit 2 pilot read acceptance | [41621048664](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621048664) / 1 | 142/142 | 54/54 | Passed |
| English Unit 3 pilot read acceptance | [41621061401](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621061401) / 1 | 154/154 | 54/54 | Passed |
| Resource assignment production acceptance | [41621102404](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621102404) / 1 | 327/327 | 108/108 | Passed |
| Sprint 14 authenticated action QA | [41621118035](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621118035) / 2 | 206/206 | 108/108 | Passed |
| Sprint 14D authenticated analytics QA | [41621292648](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621292648) / 1 | 10/10 | 0/0 | Passed |
| Teacher feedback production acceptance | [41621433147](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41621433147) / 1 | 87/87 | 108/108 | Passed |

[Execution index and receipt hashes](../evidence/background-qa-20261103/execution-index.json). Each suite's allowlisted receipt is linked from the index; original artifact IDs and report/ZIP hashes preserve its provenance.

## Preserved failure and bounded retry

Actions run41621118035 attempt1 passes181/182 main checks, then reports `A_teacher: authorized dashboard` with HTTP0 after creating a run-owned empty class under a temporary second-school membership. Its unchanged fetch deadline is25,000ms. This helper reports HTTP0 only when it has no HTTP response; response JSON parsing separately preserves the actual status. The evidence cannot identify timeout, network or redirect failure, and does not support an Auth repair.

The failed attempt archives all four created classes, ends both created memberships and closes its six main QA sessions. All54 preflight and54 postflight isolation controls pass, including their own session cleanup. No authenticated run is cancelled and no previous result is relabelled. [Preserved attempt1](../evidence/background-qa-20261103/run-41621118035-attempt-1.json).

One complete retry on the same source passes206/206 plus54+54 controls with the same25-second limit, original assertions and no in-request retries. Its own four classes/two memberships and authentication sessions are cleaned up. It exercises the previously unfinished remainder rather than treating181/182 as complete acceptance.

The bounded provider-log window15:26:30–15:33:40 Asia/Yerevan contains33 recorded invocations of dashboardv27:29 HTTP200 and4 expected HTTP403 responses, with maximum server execution17,415ms. None of these records is correlated to the exact failed client request. They do not prove its cause or rule out a client/network failure. No server5xx appears in this available cohort. [Sanitized diagnosis and limitation](../evidence/background-qa-20261103/actions-no-response-observation.json). QA-TRANSPORT-01 stays open.

## Source, scope and cleanup

The nineteen designated-fixture workflows retain one shared lock, `cancel-in-progress: false` and `queue: max`. All eleven restored runs are retained; one runs at a time. Production remains on58f4075 through every authenticated execution and its sole retry. The public release marker is independently rechecked after all executions. Application code matches functional main09d621b; no application, Auth, schema, timeout or acceptance change is introduced by this evidence closure.

The seven chapter/English suites use real Chromium pages and designated accounts to read already activated programmes without learner submissions. Institutional action QA additionally exercises its existing bounded, disposable class/membership/invitation operations. Resource QA exercises existing run-owned delivery, writing and custom-task scenarios. Analytics and teacher feedback retain their read-only scope.

Resource QA verifies49 public assets against source and passes327 checks plus54+54 controls. It withdraws two own materials, cancels four resource assignments, two writing deliveries and two custom tasks, and closes six main sessions. Institutional actions archives its four own classes and ends its two own memberships on both attempts. Teacher feedback verifies24 public assets and passes87 checks plus54+54. Analytics passes10 checks and closes its two administrator sessions. These are scoped owned-record cleanup acknowledgements; existing learner history/content approvals and learning criteria are preserved.

Receipts retain allowlisted test labels/outcomes/HTTP codes, source markers, public asset hashes, cleanup aggregates and source-artifact hashes. Credentials, account identities, response bodies, raw request diagnostics and recordings are excluded. Artifact fields differ by harness; a nullable `frontendCommit` is not invented where the harness instead records source/asset checks. Successful source-guard log lines and the final fixed marker provide the corresponding provenance.

## Remaining work

QA-TRANSPORT-01 needs a separately bounded diagnostic follow-up for the Actions dashboard read: capture sanitized fetch error kind, actual25,000ms caller budget, elapsed time, W3C trace and provider request ID without raw errors, payloads or credentials. Preserve the original body, one attempt and deadline; correlate the same request before assigning a root cause. Earlier20-second read-runner diagnostics remain a different, preserved contract.

Owner usability/B.12.3/B.12, subject expansion after EnglishC47, full S2 historical migration/fresh-install reconciliation and independent content/SME/security/URL/Master gates remain open. These technical checks do not confer personal owner acceptance or physical-device/assistive-technology certification. The [U1/C1/C2 rollout and original preservation evidence](u1-rollout-20261103.md) remain valid. Final documentation CI, canonical-source verification and merged-source Notion synchronization follow this execution record.
