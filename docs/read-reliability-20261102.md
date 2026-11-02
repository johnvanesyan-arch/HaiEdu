# Read reliability repair — 2 November 2026

Asia/Yerevan. Owner-authorized follow-up to comprehensive QA. Baseline main `2cc79ad299cedc7664483b71533e475d439a2d57`. Implementation prepared; production verification pending.

## Findings and bounded changes

The original get-teacher-dashboard503 (provider request `01a19d5c-07a3-7f01-b7b6-fd270c5a8e9f`, execution `30d396fb-b16b-4849-853e-8f6cfcef03a1`, version25) coincides with PostgreSQL57014 at17:43:50.021UTC. The database context identifies service_teacher_dashboard_initial → service_teacher_dashboard_evidence and its evidence CTE/JSON projection. The authenticator statement timeout is8s. The original browser failure at B:5:unit-switch lacks exact request correlation; original CPU contention and historical plan are unretained. Do not claim those as diagnosed.

The projection builds repeated frozen snapshots before DISTINCT. A semi-join deduplicates item/version keys before JSON construction. All frozen fields, exact evidence predicates, roster scope, initial and final live authorization, SECURITY INVOKER and service-only execution remain. Current read-only EXPLAIN diagnostics (two interleaved pairs) are in the receipt; they are small-sample SQL measurements, not historical browser comparisons or a guarantee that timeouts cannot recur. No timeout or performance budget is increased.

The four historical401s cannot be attributed to a specific SDK/provider cause. A confirmed code defect collapses verification exceptions and provider failures into401. Shared signature verification now distinguishes invalid credentials from unavailable verification, returning503 for the latter with safe categories. The same pinned SDK verifies ES256/JWKS and legacy symmetric credentials. Issuer, audience, expiry, nbf, user and session bounds remain mandatory. Public signing keys alone may be cached; every request still checks live Auth users/sessions and current role/tenant/context. This removes redundant Auth /user round trips from these identity-only reads; write endpoints retain their existing verification strategy.

## Consumer and release audit

| Changed dependency | Affected consumers | Required verification |
| --- | --- | --- |
| Shared read identity | get-student-classes, get-teacher-academic-context, get-teacher-student, get-teacher-dashboard, get-teacher-workspace | Deploy/read back all five complete application bundles, pinned SDK2.118.0, verify JWT gateway setting retained |
| Dashboard RPC helper | get-teacher-dashboard | Allowlisted RPC name and SQLSTATE diagnostics; no raw database errors or learner data in logs |
| Evidence SQL function | Batched teacher selected-class/unit analytics | Reviewed migration, exact definition readback, unchanged invoker/grant contract, legacy projection comparison |
| Performance runner | Both designated schools, unchanged ten iterations/scenarios/deadlines/budgets | Safe failed-observation metadata including endpoint path, status and provider request ID; retain earlier samples and cleanup |
| Student/teacher browser consumers | Existing callers of these APIs | Native regressions and fresh guarded Physics/English/delivery reads; ordinary signed-in chapter navigation recheck |

## Validation and closure

Real SDK crypto tests cover valid/concurrent actors, forged signatures/payloads, wrong issuer/audience/time/session bounds, symmetric verification, JWKS503/429 and network failure. Actual Edge bodies distinguish401/503/403 before data access. Disposable SQL compares selected class/unit output to existing analytics and rechecks revocation/roster/tenant/version boundaries. Full unit/integration, native browser and all-five release checks are required before merge/deploy. Production acceptance retains reviewed-main, exact-frontend, designated identities, serialized concurrency and run-owned cleanup.

Pending: final CI, merged source identity, migration and five complete Edge deployments/readbacks, canonical release, fresh performance and guarded read/delivery reports, aligned closure documentation and source-verified Notion sync. Budget misses remain separate from journey completion. No learner assessment, answer, grade, credential, factor, permission or content change is authorized by this repair.

Roadmap remains16.5B.12.3; B.12 and owner usability acceptance stay open. Subject work is paused after EnglishC47. QA-EVIDENCE-01 and all nine independent SEC-AAL/URL-P1/MASTER-P2 gate rows remain separate. [Machine-readable receipt](evidence/read-reliability-20261102.json).
