# Read reliability repair — 2 November 2026

Asia/Yerevan. Owner-authorized follow-up to comprehensive QA. Functional source: [PR392](https://github.com/johnvanesyan-arch/HaiEdu/pull/392), main `8490a9dfa6913ef609a7eeb41d4631708333c03a`, tree `459552d7a832ec598f2d57a7ac8c53627b14d534`. The repair is deployed, source-verified and accepted by the bounded live suites below. Final owner usability acceptance remains open.

## Findings and repair

The original get-teacher-dashboard503 (provider request `01a19d5c-07a3-7f01-b7b6-fd270c5a8e9f`, execution `30d396fb-b16b-4849-853e-8f6cfcef03a1`, version25) coincides with PostgreSQL57014 at17:43:50.021UTC. The database context identifies service_teacher_dashboard_initial → service_teacher_dashboard_evidence and its evidence CTE/JSON projection. The authenticator statement timeout is8s. The original browser failure at B:5:unit-switch lacks exact request correlation; original resource contention and historical execution plan are unretained.

The projection constructed repeated frozen question snapshots before DISTINCT. The repair uses a semi-join on the uniquely constrained item/version keys before JSON construction. Read-only comparison across all six dedicated English school/unit combinations confirms the complete remaining payload and order-normalized version arrays are equal. Disposable two-subject SQL/Edge regressions also compare the actual dashboard with canonical legacy analytics. All frozen fields, roster and exact evidence predicates, service-only execution, SECURITY INVOKER, current context and initial/final batched authorization remain. No timeout, retry count or performance budget is increased.

The exact cause of the historical401s is unproven. A confirmed code defect collapsed verifier exceptions/provider failures into401. The reported student navigation and teacher identity-only read paths now use pinned SDK signature verification with project issuer, authenticated audience, expiry, nbf and bounded user/session claims. Invalid credentials remain401; unavailable verification returns503 with a safe category. Existing live Auth user/session, profile, role, tenant and academic-context gates remain. Public signing keys alone may be cached. Legacy symmetric tokens retain SDK Auth-server verification. Other APIs retain their existing verification strategy; this is not a claim that every platform auth endpoint was rewritten.

The new performance runner records a failed observation without waiting for pending responses and retains all earlier completed samples. It retains only an endpoint path, HTTP status, timing, bounded provider request ID, request-failure flag and a fixed milestone label. RPC diagnostics retain only the internal RPC name and SQLSTATE/category. No raw errors, request/response bodies, credentials or learner identifiers are added to these diagnostics.

## Deployment and consumer audit

| Dependency / consumer | Verified deployment |
| --- | --- |
| Shared identity + batched helper: get-teacher-dashboard | v26 ·11 application files exact |
| Shared identity: get-teacher-student | v18 ·8 application files exact; its existing gateway verify_jwt=false setting is preserved and handler signature/live authorization remains mandatory |
| Shared identity: get-teacher-academic-context | v4 ·4 application files exact |
| Shared identity: get-student-classes | v13 ·8 application files exact |
| Shared identity/workspace handler: get-teacher-workspace | v5 ·4 application files exact |

All35 importing application-file instances match the intended repository bytes. The SDK import is pinned to2.118.0 in all five entries. This readback covers returned application source, not external vendor bundle bytes. The prior comprehensive64-runtime audit is historical; unchanged consumers retain source-equivalent evidence.

Repository migration: `20261102182941_teacher_evidence_version_deduplication.sql`; database migration record: `20261102184555`, name teacher_evidence_version_deduplication. Exact function-body MD5 changes from `3232820c247af5185b56340d542f3ded` to `2cd962c5550786b5d5f3820fe5513401`. anon/authenticated execution remains denied; service_role remains allowed; the function remains invoker.

All five PR/main gates pass ([PR CI41502247010](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41502247010), [main CI41503617982](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41503617982)):1,654 unit/integration checks,397 native Chromium checks, PostgreSQL17 and institutional concurrency, zero failures/skips/cancellations. Core parity, teacher bundle parity, typecheck and all eleven browser dependency graphs pass.

Fresh read-only Vercel inspection independently confirms Platform release checks / GitHub / Production / Blocking with Save disabled. The new build was Staged with promotion blocked while main CI ran; canonical release stayed at2cc79ad. After the aggregate passed, canonical release became8490a9d. No settings write, bypass or failure injection was performed. Four representative served entry/dependency files match exact source; production runners independently check their complete manifests.

## Fresh production acceptance

All rows use reviewed main8490a9d, the existing exact-frontend/designated-fixture guards, unchanged deadlines and run-owned cleanup. Shared concurrency allows one active and one pending run; automatic canceled queue members are not passes.

| Suite | Run | Result |
| --- | --- | --- |
| Authenticated teacher/School Admin actions, Today and tenant isolation | [41503617903](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41503617903) |206/206 +54 preflight +54 postflight; four owned empty classes archived, two owned guest memberships ended, all six main sessions closedHTTP204 |
| English Units1–3 and preserved programme reads | [41503618095](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41503618095) |154/154 +54 isolation; zero native errors/attempted mutations; all six main sessions closedHTTP204 |
| Physics I–VI policy, navigation, guide, task-set, protected-audio and written-work reads | [41507031079](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41507031079) |324/324 +54 isolation; zero native errors/attempted mutations; all six main sessions closedHTTP204 |
| Teacher performance | [41505847419](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41505847419) |150/150 observations (A80/B70); all budgets met; zero measured HTTP errors; both owned sessions closed |
| Full assignment delivery / PDF / custom-task integration | [41507609230](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41507609230) |327/327 +54 preflight +54 postflight;49 served files verified; all six main sessions closedHTTP204; owned deliveries canceled/resources withdrawn; normal drafts/PDF/audit retention preserved |

The exact signed-in student account also freshly loads Physics with six chapter links and English with three units; course discovery and English opening succeed on the released source. ChapterVI retains its Diagnostic prerequisite. No assessment or answer was started in this account. This bounded check is separate from owner usability acceptance.

| Performance metric | Fresh p95 | Unchanged budget |
| --- | ---: | ---: |
| Visible cold Home/Today |2,502.5ms |3,000ms |
| Visible warm Home/Today |1,806.3ms |3,000ms |
| Selected class (existing polling metric) |1,332.3ms |2,000ms |
| Loaded Classes navigation |44.0ms |200ms |

The profile remains Chromium1365×950, ten iterations per school, unthrottled shared-runner CPU and CDP4G150ms /1.6Mbps down /750Kbps up. All twenty unit switches complete, including schoolB's sixth iteration. Existing reviewed-response opening is exercised for schoolA; schoolB has no corresponding fixture and is not counted as exercised. Do not infer a controlled causal speedup from the earlier partial120-sample run, different resource conditions, current SQL EXPLAIN samples or added run-owned archive rows.

The complete redacted150-observation report is committed as [read-reliability-performance-20261102.json](evidence/read-reliability-performance-20261102.json), SHA256 `ed01853ff5d28b4dcef40f814e30e8c3b3a746aec5be55d19a049f0d66fc9408`. The passing run is [visually verified](evidence/read-reliability-performance-20261102.jpg). The original failed run41492523110 and all120 partial samples remain preserved separately.

## Scope, continuity and roadmap

A user-reported ChatGPT “Connection interrupted. Waiting for the complete answer” banner recurred during this work. Direct checks confirmed the canonical source, saved code/reports and ongoing CI job state were retained. Chat transport logs are unavailable here; no exact chat-stream cause or ChatGPT repair is claimed. This is separate from HaiEdu's historical HTTP0,401 and503 observations. Completed external actions were verified before continuing; no completed deployment or production workflow was repeated because of the banner.

QA-PERF-01 now has a complete passing current performance run, including every unchanged target. UX-STUDENT-ACCESS-01 has verified read-auth hardening and passing current cross-subject/tenant acceptance; its historical provider cause remains unconfirmed. Original failed evidence stays failed. Fresh specialist/content validation, complete learner attempts/audio playback, new privileged/MFA/device certification and owner usability acceptance are not inferred.

Current roadmap remains16.5B.12.3 stabilization; B.12 and owner usability remain open. Subject expansion stays paused after EnglishC47. Remaining mobile evidence QA-EVIDENCE-01, historical transport follow-up and all nine independent SEC-AAL/URL-P1/MASTER-P2 gate rows remain separate. All45 capability mappings, approved content/learning rules and future four-subject acceptance remain. [Machine-readable evidence](evidence/read-reliability-20261102.json).
