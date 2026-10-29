# Teacher loading performance

## Current checkpoint — B.12.2

**2026-10-29 — B.12.2 teacher loading performance delivered.** Batched exact reads, verified-identity reuse, local SDK/font delivery and one-use role-gated startup overlap retain live/final authorization. All 150 final guarded observations complete on the recorded desktop/4G profile: useful Home p95 **2.47 s cold /1.75 s reload**, class opening **1.33 s**, loaded navigation **42 ms**; the unchanged 3 s /2 s /200 ms budgets pass. Original polling clocks, precise-before calibration, failed-target iterations and all samples remain in [the report](teacher-performance.md). All five required PR/main CI jobs pass (**1,561 unit/integration; 260 native checks**). Current frontend, all 22 teacher Edge file instances and six SQL bodies/grants match source; fixture sizes, existing evidence and run-owned cleanup are verified. [Measurement evidence](evidence/teacher-performance-final-20261029.json). **Next: B.12.3 cross-role/recipient journeys and final owner usability acceptance.** Full B.12, all 45 mappings, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, English C47 hold and full four-subject gates remain.

| Scenario | Precise-before p95 | Final p95 | Fixed budget |
| --- | --- | --- | --- |
| Useful cold Home | 2.71 s | 2.47 s | ≤3 s |
| Useful Home reload | 2.70 s | 1.75 s | ≤3 s |
| Selected class | See retained polling report | 1.33 s | ≤2 s |
| Loaded Classes navigation | See retained polling report | 42 ms | ≤200 ms |

The precise-before report is the preceding startup-overlap runtime `93e766d2ac1e3ddd71622694a644a711ef88f2d2` ([run40802546459](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40802546459)); the same observer, original polling clock, two teachers and profile are retained in [the final comparison](evidence/teacher-performance-final-20261029.json). Earlier pre-observer reports are historical polling measurements, not precise Home readiness. No sample or server/network tail was removed. Reload does not guarantee an HTTP cache hit; a fresh context does not prove a cold Edge/database process. These are controlled fixture measurements, not population or mobile guarantees.

Fixture A retains 3 active/33 archived classes and B 2/30. Existing sessions/attempts and writing counts/timestamps remain unchanged, with full-row evidence hashes before/after. A opens an existing reviewed response; B has none. Native actual-SQL fixtures cover nonzero pending review, but no production submission or grade was created. Both benchmark sessions are closed. Compatibility reuses source-verified unchanged contracts, with any fresh run recorded separately.

The original polling clock also passes: Home p95 2.95 s cold /2.23 s reload. All 40 Home observations now make exactly two application requests; the preceding runtime made redundant startup reads in 21 observations. No measurement was removed. The first main native attempt failed at Chromium screenshot capture on an unchanged content-review page; the same-commit full native retry passes all 260 checks and the required aggregate is green. [Retry receipt](evidence/teacher-performance-native-retry-20261029.json).

Implementation lineage: PR343 batching, PR345 identity/projection and canonical bundles, PR346 transaction composition/local SDK, PR347 dual-clock calibration, PR348 shared font/UX startup, PR349 overlapping role-gated Home reads, and PR350 completed-bootstrap idempotence. Required gates, exact frontend/Edge/SQL parity, intermediate failures and settings-attestation limits are in [release evidence](evidence/teacher-performance-release-20261029.json) and the adjacent dated receipts. Closure documentation does not change runtime behavior or learner content.

## Historical B.7 and implementation record

2026-10-27 · bounded loading repair deployed and measured · next: B.8 resource assignments.

The teacher page now loads a bounded class directory first, then the selected class's roster and analytics on demand. Invitations and writing review load when opened, archive search is paged, and sidebar navigation stays in the page. The paired production run completed **140 measurements before and 140 after**, across the same two designated teachers. Cold Home p95 changed **14.74 s → 4.61 s**; Classes navigation **9.79 s → 0.04 s**. This is a measured improvement of the current teacher browser, not completion of the wider staff redesign or a universal latency guarantee.

## Paired production measurements

Each row pools twenty samples per phase: ten per teacher. Values are nearest-rank p50/p95, not averages of the two teachers' percentiles. The [baseline](evidence/teacher-performance-baseline-20261027.json) and [after report](evidence/teacher-performance-after-20261027.json) retain individual samples and per-teacher summaries; the [comparison](evidence/teacher-performance-comparison-20261027.json) also includes response bytes.

| Journey | Before p50 / p95 | After p50 / p95 | Median API requests before → after |
| --- | --- | --- | --- |
| cold-home | 9.52 / 14.74 s | 3.56 / 4.61 s | 3 → 2 |
| warm-home | 8.84 / 11.35 s | 3.31 / 3.81 s | 3 → 2 |
| classes | 8.77 / 9.79 s | 0.03 / 0.04 s | 3 → 0 |
| archive | 8.75 / 12.79 s | 1.85 / 1.85 s | 3 → 1 |
| selected-class | 0.04 / 0.06 s | 5.87 / 7.88 s | 1 → 1 |
| unit-switch | 7.89 / 11.42 s | 6.84 / 8.86 s | 2 → 1 |
| review | 1.37 / 1.87 s | 1.36 / 1.36 s | 1 → 1 |

Home's p95 is 68.7% lower, and its median application payload falls from 16,515 to 2,253 bytes. Loaded Classes navigation makes no API request. Archive p95 falls by 85.5%; unit-switch p95 falls by 22.4%. Review is broadly unchanged at the median.

There is an explicit trade-off: the old 0.04 s class click followed the expensive eager loading on Home/Classes. The new click loads authorized detail and takes median 5.87 s / p95 7.88 s. This is not an improvement of the class-click milestone, and the separate percentiles must not be added to invent an end-to-end journey result. Home and class-detail targets remain unmet. The measured selected-class handler has median 4,162 ms in its data phase and 5,127 ms total; unit switching has 5,545 ms data / 6,422 ms total. Source inspection confirms class context, roster/evidence/analytics and final authorization reads remain in that path. The timings locate the residual delay in the server-side detail flow but do not attribute every millisecond to one query.

**PERF-02 remains open:** profile and batch the exact selected-class/unit evidence reads, preserving final session/grant/context checks, before closing B.12 performance acceptance. B.10's scoped queue/projection work must use this receipt and avoid new per-class fan-out. The present B.7 delivery closes bounded discovery/navigation and the paired measurement, with this residual class-detail latency recorded explicitly; it does not declare all performance work finished.

The original targets were p95 useful Home ≤3 s, selected-class opening ≤2 s and already-loaded navigation ≤200 ms. They remain visible below; the workflow's passed status means every guarded journey completed, not that all timing targets passed. No target has been silently relaxed.

| Target | Measured after p95 | Outcome |
| --- | --- | --- |
| Fresh-context Home ≤3 s | 4.61 s | Not met |
| Same-context Home reload ≤3 s | 3.81 s | Not met |
| Selected-class detail ≤2 s | 7.88 s | Not met |
| Loaded Classes navigation ≤200 ms | 0.04 s | Met |

The profile is Chromium at 1365×950 on an unthrottled shared Ubuntu runner, with CDP 4G emulation (150 ms latency, 1.6 Mbps down, 750 Kbps up). A fresh browser context clears its HTTP state; it does not prove a cold Edge/database process. Both phases retain A: 3 active/29 archived classes and B: 2 active/26 archived classes. Synthetic coverage tests larger archives separately. API counts/bytes cover observed REST/Edge application calls, excluding static assets and authentication traffic. No tokens or learner response bodies are recorded. The read-only harness allows only designated fixture identities and read endpoints, checks reciprocal foreign-class denial and ends only its own sessions. Staff mutations run afterward, preserving fixture sizes between measurements.

## Server and database evidence

Before rollout, 148 successful dashboard POSTs in the preceding 24 hours had Edge execution median 7,610 ms, p95 10,918 ms and maximum 14,394 ms; 36 denied calls were separate (p95 1,891 ms). These historical Edge timings are not the paired browser baseline.

Ten actual `EXPLAIN ANALYZE` calls to the new directory RPC, alternating the two teachers, took 31.846–89.022 ms (median about 32.1 ms). The first invocation is retained; no cold-server guarantee is inferred. [SQL timing, exact body and execution grants](evidence/teacher-performance-sql-20261027.json). Browser timing, Edge `Server-Timing` and SQL time have different boundaries: handler/data timing includes service network work. Comparing the 32 ms SQL result directly to the old 7.61 s whole-handler result would be misleading.

## Delivered implementation and regression coverage

- Home/class discovery requests at most 24 authorized metadata rows. The database supplies exact active/archive/matching counts and literal whole-archive search; directory responses contain no roster, learner evidence or question snapshots. Student/support totals stay explicitly unknown until the applicable class is opened; one class is never presented as an all-class total.
- Class detail selects its exact class/assignment and complete release/unit context. Initial assignment queries and downstream reads are scoped to that class; independent reads run together. Current/historical institutional access and the existing schoolless-owner adapter remain separate. Existing default/full API callers retain their contract and eager-read cost.
- Loaded navigation stays in the page. Concurrent identical reads are deduplicated by actor, dashboard version and request; metadata is page-session-only. Detail is reauthorized on each request. Old class, unit, archive and account responses are ignored; leaving Archive cancels pending search. No persistent learner-data cache is added.
- Initial directory, class and archive errors have retry actions; a failed unit change retains the requested unit. Invitation history and writing review are lazy. Learning/scoring, audio allowances, writing submissions and feedback rules are unchanged.

Nine database tests execute the actual SQL and helper, covering 24-row bounds, disjoint pages, literal search, archived/closed/ended contexts, expired/revoked memberships and grants, foreign schools, duplicate grants, teacher role, service-only grants and legacy isolation. The actual helper loads one selected class despite 104 archived classes. Seven new native-browser tests cover 1/1,000 synthetic archives, bounded discovery requests, paging/search, lazy invitations, late responses, unit retry, account switch and initial-load retry. These fixtures are not production load tests. The complete required gate passes **1,474 unit/integration and 195 native Chromium checks**, plus PostgreSQL/concurrency and aggregate release jobs. All nine existing browser-QA dependency graphs pass.

## Production acceptance and source parity

[PR320](https://github.com/johnvanesyan-arch/HaiEdu/pull/320), reviewed head `99e1b1f4bbf0b4a4736af8a3885e98a2a6b11118`, merged as `b41220423561b444269d78df24cd93e3b2c92662`. [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40561321205) and [main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40565437039) pass all five required jobs. Exact production revision and both changed frontend assets match. The only importing Edge consumer, `get-teacher-dashboard`, is deployed at version 22 with JWT verification enabled; all eight deployed files match the reviewed bundle. The additive service-only directory RPC body and grants match, with SQL migration applied as `20261027190048`. [Deployment receipts](evidence/teacher-performance-release-20261027.json).

The baseline ran on `7124984b27e91af1210ad3c9e36edfecb0f859bb`; its two teacher frontend files and all eight Edge version-21 files matched original runtime source `935e8f2`. [Baseline run](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40560639878). The first attempt produced no complete samples because Playwright's assertion timeout remained five seconds; [PR321](https://github.com/johnvanesyan-arch/HaiEdu/pull/321) corrected it to 45 seconds before collection. Both phases use the same corrected harness and profile.

[PR322](https://github.com/johnvanesyan-arch/HaiEdu/pull/322) adds only a combined main-only acceptance workflow after standalone runs were superseded in the shared QA queue. Its PR/main CI pass all five required jobs; production `d507a495d291936ca926ce893304a9a061dd043f` has unchanged runtime assets. [Combined acceptance 40567034922](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40567034922) passes the 140 after-measurements, then **147/147 staff checks** including class lifecycle/archive restoration, current/historical access and two-school isolation before/after. Only that run's disposable classes/memberships and sessions are cleaned up. [Staff receipt](evidence/teacher-performance-staff-20261027.json).

Fresh English Unit3 compatibility passes **154/154** on the implementation source ([run](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40565437041), [receipt](evidence/teacher-performance-english-20261027.json)). The fresh Physics run passed 323 of 324 checks, then its final revision guard saw the workflow-only PR322 deployment; it is recorded as **superseded, not a full pass** ([run](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40565437120)). Earlier unchanged learner-content evidence is retained in [student subpage acceptance](evidence/student-subpages-release-20261027.json); current teacher/full-response compatibility and isolation are covered by the completed current-source runs.

The independently verified [20 October production Deployment Check configuration](evidence/vercel-deployment-check-verification-20261020.json) is reused. Current connector scope returns 403 for that team's settings, so no fresh settings re-attestation is claimed. No configuration was changed; required CI, Vercel success, exact production revision/assets and signed-in acceptance are recorded independently.

## Historical B.7 sequence

**Next: 16.5B.8**, explicit class/student resource assignments and learner My work delivery. B.9–B.12 continue the shared Forest staff design, Today/class cards, feedback and usability acceptance; they must preserve B.7's bounded reads and record any changed timing. Residual target gaps above remain visible for those measurements and the owning hardening work, without weakening authorization. All 45 capabilities remain; English stays paused after C47. Full four-subject 16.4/16.5C still gates Sprint17. This delivery does not claim whole-redesign or subject completion.


## B.12.2 implementation and paired measurement

B.12.2 retains the existing desktop/4G budgets: useful cold and warm Home p95 ≤3 seconds, selected class p95 ≤2 seconds, and loaded navigation p95 ≤200 ms. Final usability acceptance is B.12.3. PR342 first establishes the current baseline against the unchanged runtime, waits for both directory and Today, and measures opening a nonempty existing response without creating, grading or changing work. Before/after use the same guarded journeys and two designated teacher fixtures; response fixture state and explicit budget outcomes are reported separately from journey success.

The implementation batches institutional class metadata and exact unit evidence in service-only SECURITY INVOKER functions. It retains the same frozen-version, provenance, scoring and history calculations. Metadata and learner eligibility are read again after evidence; final checks retain current role, live session, membership, subject grant, exact context and expiry. No authorization or learner evidence is cached across requests. Archive growth does not fan out class-detail reads. Existing full and schoolless adapters retain their contracts. Today relies on its transaction's initial actor/session check and the shared final actor RPC, reducing serial database calls.

Affected runtime consumers are `get-teacher-dashboard`, `get-teacher-student` (shared analytics helper) and `get-teacher-workspace`. The student, school-admin and master-admin interfaces, assessment scoring and content banks are unchanged. Browser role checks still precede any teacher data request. Required release gates, deployed source parity and paired production results must be recorded before this slice is closed; this implementation note is not a performance acceptance claim.


### Startup and identity follow-up — historical implementation note

The teacher entry preloads its existing module and one reproducible dependency bundle. Canonical Today, feedback, subject artwork, configuration and role helpers remain the source; `npm run build:teacher` regenerates the committed bundle, CI checks byte parity, and production QA dependency traversal follows the canonical entry, builder and lockfile. The release build regenerates it before stamping the frontend revision. No extra learner functionality is introduced.

Directory/class and Today reads use the SDK's verified JWT claims (ES256 project signing key; Auth-server fallback for legacy symmetric keys), checking issuer, audience, expiry, subject and session. The stateless per-isolate client caches only public JWKS. The live database actor/session and current authorization checks still execute on every request, including the final read after calculations. Full/default dashboard callers retain their original Auth lookup. Successful data responses remain `no-store`; the ten-minute CORS preflight lifetime caches policy only. Numeric `Server-Timing` adds the identity phase without identifiers.

The evidence RPC transfers only the frozen item fields used by unchanged teacher analytics: skill, difficulty, code and Armenian prompt. Question answers, options and unrelated snapshot fields no longer cross the database-to-Edge boundary. The separately versioned replacement preserves exact evidence selection, service-only execution, invoker security and existing grants. The original batched migration filename is aligned to its already-applied database version; it must not be applied twice.

Actual SDK/WebCrypto tests reject altered, unsigned, expired, future, foreign-issuer/audience and malformed identities, verify public-key reuse across distinct actors and verify legacy Auth fallback. Existing SQL/native regressions continue to cover current/final authorization, account/context changes, archives and nonempty writing review. The performance targets above remain unchanged; functional CI success alone does not close PERF-02.


### Transaction follow-up — historical implementation note

The second run completed 150 guarded observations but still missed Home and class p95 budgets. Its class-opening median improved to about 1.33 seconds; cold Home includes server/network tails above ten seconds. These results remain intermediate evidence, not acceptance.

The next follow-up composes bounded directory and Today reads into one optional directory response and fetches selected-class metadata plus exact selected-unit evidence in one initial transaction. Edge still performs the final live actor/context/roster read after calculations. The database uses the existing governed unit ordering, preserves stable ties, and Edge independently requires the returned tuple to equal its canonical choice. No other unit evidence is transferred. A Today failure is an explicit unknown/denied state alongside the authorized directory. Older servers retain the existing separate Today request through a feature-detected fallback.

The teacher bundle includes the same `@supabase/supabase-js` 2.118.0 version observed at its existing `esm.sh/@supabase/supabase-js@2` URL. This moves the teacher entry’s SDK into the local bundle. Later resource inspection found the shared UX module still fetched a duplicate remote SDK; the startup follow-up below removes that remaining eager dependency. The private workspace reader retains its existing pinned SDK. Public-key verification and all final authorization gates remain. These implementation notes do not claim the timing budgets are met.


### Home readiness instrumentation — historical calibration note

The transaction follow-up completes 150 current-source observations and meets class-detail p95 (1.84 s ≤2 s) and loaded navigation (42 ms ≤200 ms). Polling-completion Home p95 remains 3.83 s cold /3.68 s warm. Home application requests have already fallen from three to two; their durations leave a substantial interval outside server response time. Brotli delivery is confirmed for the local SDK bundle and teacher entry. No missing-target result is discarded.

The measurement follow-up records an event-based timestamp **alongside** the unchanged polling timer. A read-only benchmark observer waits for the same complete visible dashboard, enabled Today refresh and checked snapshot, then confirms the state on an animation frame. It captures the whole action interval, not metadata-only timing. Native regressions cover incomplete/hidden states, repeated setup, a state reversed before the frame, and observer settlement. Static-resource/navigation timings contain paths and numbers only. The 3-second Home budget, fixture/network profile, permissions, source guards and cleanup remain unchanged. Historical reports have no exact DOM timestamp: no like-for-like historical exact-readiness percentage may be inferred. Calibration must establish the actual remaining application delay before acceptance.


### Shared startup follow-up — historical implementation note

Exact DOM calibration on unchanged runtime reports Home p95 3.71 s cold /3.76 s reload; class and navigation remain within their fixed targets. It is the precise-before baseline for this follow-up. The old polling clock and every intermediate result remain recorded. Reload means the same context; observed routing can still cause assets to transfer, so it is not represented as a guaranteed cache hit.

The shared UX module now reuses the page’s client after load/idle instead of eagerly importing a duplicate remote SDK. A bounded 4.5-second fallback still starts health checks if resources never finish; terminal-session cleanup and authoritative server authorization are unchanged. Native tests cover reuse, fallback, duplicate scheduling and delayed load; existing session tests retain stale-token and transient-failure protections.

Every shared Forest page preloads a 64,600-byte, content-hashed normal-width WOFF2 copy, replacing a 139,378-byte Brotli TTF transfer in the measured teacher trace. Full glyph/weight coverage and existing typography are preserved; the upstream TTF/license remain as fallback/provenance. The deterministic recipe, complete glyph checks, native text metrics and CI provenance/preload check cover all affected roles. QA dependency traversal includes font binaries. No data, permission or curriculum contract changes. Read-only resource diagnostics additionally include the known SDK host, with host/path/numeric timings only. Timing predicates, budgets and fixture guards are unchanged.

### Overlap the initial reads with SDK delivery — historical implementation note

The font/SDK follow-up completes all 150 observations, but exact Home p95 remains 3.50 s cold /3.57 s reload; class opening is 1.33 s and loaded navigation 32 ms. All samples, including server tails, remain evidence. No `esm.sh` SDK resource remains in those Home traces. The remaining waterfall starts the role read and directory/Today call only after the 75 KB compressed SDK bundle finishes.

A tiny head entry now starts the same RLS-protected own-profile read during the SDK download. Only an active teacher profile can start the existing Home directory/Today request; every backend identity, live-session and final authorization check is unchanged. Rendering still waits for the normal SDK session. A startup result is single-use, navigation-local and valid for at most eight seconds; actor, access token, current stored session, URL and complete request must match. Refresh, logout, account/context change, failure or expiry discards it and leaves the normal SDK flow available. It never authorizes a later read, write or click, and it never loads a class or learner analytics speculatively.

Recent-class and Today request construction come from one shared canonical module. Both startup bundles are reproducible and checked in CI; dependency routing includes the new head entry and its canonical sources. Browser regressions hold the full SDK download while verifying the role-first reads, exact single consumption, repeat initialization, account changes and ordinary fallback. The upstream bundled dependency notices are included beside the SDK bundle. Fixed timing budgets and both measurement clocks remain unchanged.

### Settled bootstrap guard — verified delivery

The overlapping-startup run meets every fixed target, including the original polling clock (Home p95 2.99 s cold /2.77 s reload). Its trace also exposes four-request startup sequences in 21 of the 40 Home observations: a fast INITIAL_SESSION bootstrap can finish before the page's separate getSession call returns. The previous in-flight-only guard then starts Home again. A completed, visible Home for the same actor now settles bootstrap as well. Explicit Refresh still performs fresh reads; account changes and hidden/error states retain their existing load/retry behavior. A native regression delays the startup session promise until the INITIAL_SESSION flow has rendered Today, then checks that completing that promise makes no second profile/dashboard request. This is a startup idempotence fix, not a reusable authorization cache.


## B.12.3 unchanged-budget recheck — 2026-10-29

The cross-role usability delivery rechecks the unchanged desktop/4G profile on runtime `708682d6267c62cb23410ecc8fa746d69be1e2dc`: [run 40842668480](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40842668480), [all 150 observations](evidence/cross-role-usability-performance-20261029.json). Visible Home p95 is **2,289.80 ms cold /1,721.90 ms reload**, selected class **1,329.88 ms**, loaded navigation **41.78 ms**. All unchanged 3,000/2,000/200 ms limits pass. Original polling clocks remain **2,603.40/2,222.66 ms**; all forty Home observations make exactly two application reads. The 113 checks and both local session closures pass. This is a recheck, not a claimed new optimization; prior baselines/calibration and measurement limits remain. No learner attempt, submission, grade or pending work was created. Final owner usability acceptance remains in [B.12.3](cross-role-usability-acceptance.md).
