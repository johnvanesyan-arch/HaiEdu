# BF-23 — remaining database and teacher-read audit

The 17 November 2026 audit found **no confirmed slowdown requiring a production change in the measured teacher-read paths**. This is a bounded audit result, not a claim that every database workload is fast. Owner-approved [PR519](https://github.com/johnvanesyan-arch/HaiEdu/pull/519) merged at `40a912668ba4045ecd571c83e377aa64031a751d` and its release is verified. The [sanitized receipt](../evidence/teacher-read-audit-20261117.json) records exact observations and source identity.

## Scope and evidence

Production access was read-only: database advisors, schema/permission/index metadata, accumulated statement statistics and aggregate logs. No learner records, answers, credentials or raw request logs were retrieved. No production query was run with `EXPLAIN ANALYZE`, no production load was generated, and no production schema, data, function, setting or hosting configuration changed.

The local profiler installs the complete reviewed database baseline and forward updates into its own PostgreSQL 17.6 environment. All 18 selected live function definitions match. All 154 public/private row-security policies and 69 indexes on the selected tables match the production metadata snapshot. This establishes those specific database definitions, not complete hosted-runtime, hardware or network equivalence.

The existing native assessment/file journey first creates four completed exercise sessions and eight answers through real local Auth, PostgREST, Storage, repository server functions and Chromium. Its 25 groups include school/role/session separation, hidden answer keys, submitted-answer replay and private file access. The profiler then constructs explicitly fictional volume from those templates with all database constraints and triggers intact:

| Scenario | Active classes | Archived classes | Enrolled students | Completed sessions | Answers |
|---|---:|---:|---:|---:|---:|
| Small native seed | 2 | 0 | 2 | 4 | 8 |
| Larger roster/archive | 2 | 1,000 | 60 | 4 | 8 |
| Larger exercise history | 2 | 1,000 | 60 | 1,260 | 2,520 |

There are two schools, two subjects and different grades. Each larger class has 30 students; the final scenario gives each student one Diagnostic and twenty Practice sessions. The volume is SQL fixture construction, **not 60 concurrent browser sessions**. Synthetic curriculum/policy approvals apply only to the disposable fixture and confer no real educational approval.

Each scenario measures Home, archived-class directory, selected-class initial evidence, final class authorization/roster read and the browser's own-profile lookup. Each operation has 21 sequential `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` observations per school, including the first observation: 630 measurements total. Database execution excludes network transfer, JSON decoding, server analytics and browser rendering. First-use planning and cached-plan differences are retained; the schools are sequential and do not constitute independent hardware trials. Small-sample p95 values are descriptive, not an SLA or a statistical capacity estimate. There is no new latency gate.

## What the plans showed

The populated selected-class read used the existing `learning_sessions_scoped_resume_idx` for 21 sessions per roster member and `idx_attempts_learning_session` for the corresponding answers. The directory used class primary-key lookups and retains its 24-entry page limit. The own-profile query used `profiles_pkey`. Nested plans showed no reason to add the advisor's missing foreign-key indexes to these measured reads. The receipt records the actual timing ranges, buffers, payload sizes and plan summaries.

For the populated-history scenario, the two schools' median/p95 database execution times were:

| Read | School A median / p95 | School B median / p95 |
|---|---:|---:|
| Home | 2.662 / 72.223 ms | 2.521 / 3.045 ms |
| Archive directory | 2.601 / 3.541 ms | 2.662 / 3.540 ms |
| Initial class evidence | 68.025 / 100.911 ms | 67.487 / 82.531 ms |
| Final class check | 2.151 / 2.847 ms | 2.162 / 3.184 ms |
| Own profile | 0.206 / 0.249 ms | 0.201 / 0.245 ms |

The slowest initial-class observation was 187.117 ms. The raw evidence object was 1,444,231 bytes per class in compact JSON, before HTTP compression and server-side processing. That is a reason to include report transfer and analytics in BF-24; these database timings alone do not establish the complete page's speed. School A runs first on the connection and includes more first-use planning, so the Home difference is not evidence of a school-specific defect.

The evidence checks independently require exactly 630 sessions, 1,260 answers and 30 students per school, with matching class/school/session ownership. Foreign-school evidence requests are rejected. Students cannot directly read the item or answer-key tables or execute the service-only teacher evidence function. All six frozen item-version projections retain only the four fields consumed by teacher analytics. The existing fourteen teacher batching/authorization regressions also pass, including session/role/membership/grant revocation, final-read roster changes and canonical release/unit selection. No authorization truth condition or query implementation changed.

## Advisor triage

| Finding | Count | Disposition |
|---|---:|---|
| Foreign keys without a covering index | 45 informational findings | Retained as advisory inventory. The measured session/answer/class reads use suitable existing indexes. Other foreign-key directions, administrative deletion/update paths and unmeasured workloads need evidence before indexing. |
| Repeated authentication expressions in row-security policies | 16 warnings | The teacher RPCs use the service role plus explicit authorization checks, so these browser-role policies are not their execution path. The measured browser lookup selects one profile by primary key. A blanket rewrite has no demonstrated benefit here. |
| Multiple permissive policies | 14 warnings | Mostly content-admin plus read access. Separate read/write policy intent is not a defect by itself; no consolidation or authorization change is justified by this audit. |
| Unused indexes | 139 informational findings | No index is removed. Available traffic is too limited to establish that an index is unnecessary. |
| Table without a primary key | 1 informational finding | `private.teacher_task_privacy_scopes` is an internal transaction/backend-scoped helper. It is outside the measured teacher reads; no schema change is inferred from this advisory alone. |

All original warnings remain visible; this audit does not claim to clear them. The receipt includes the 45 foreign-key names and their workload triage. Security/health advisors were also read: no health findings; the previously declined paid leaked-password feature stays declined. Intentionally inaccessible tables are not opened to remove warnings.

## Limits and next decision

The previous teacher-page acceptance remains the [29 October B12.2 record](../teacher-performance.md): 150 guarded observations under its stated controlled desktop conditions. It is reused historical evidence, not freshly repeated live acceptance. Production statement statistics span releases since 13 September and cannot establish a current regression. The sampled 24-hour server-log window contained no teacher-dashboard calls, so it supplies no fresh teacher latency baseline.

This audit covers the current institutional Home/directory/selected-class database paths and the shared exact-own-profile read. It does not qualify every administrative service, the legacy full/default teacher contract, long-term multi-year history, large question banks, every response format, network payload cost or concurrent classroom use. S7's existing read-mode filter remains intact; the legacy full mode is a contract decision, not an automatically broken filter. A wider latency guarantee remains open.

**Decision:** retain the current database implementation. There is no proposed production migration or index/policy repair. The next separate qualification is BF-24: measure the complete application with 30, then 120 concurrent fictional students in an isolated environment. Include teachers opening populated reports while students work, and inspect response size and service/browser time. A confirmed slow operation should trigger a focused before/after repair with authorization and race regressions, not a blanket advisor cleanup. BF-24 has not been run by this audit.

## Reproduce safely

Use the existing [owned local stack prerequisites](local-staging-20261115.md#run-locally), install the locked Node dependencies and `tests/requirements-fresh-baseline.txt`, and point Playwright at its installed matching browser:

```sh
python scripts/profile-teacher-reads.py --evidence-dir /tmp/haiedu-teacher-read-audit
```

The output directory must be new. The profiler accepts no hosted project, DSN, supplied account or remote target. An optional `--catalogue` points only to a local JSON metadata snapshot; without it, live policy/index parity is explicitly unverified. The snapshot is the SQL-tool array containing `metadata.policies` (ordered `pg_policies` rows) and `metadata.indexes` (ordered `pg_indexes` rows for the nine tables named in the script). It contains schema metadata only. Function hashes are recorded for separate comparison.

Raw plans, database logs and screenshots are private diagnostic artifacts. Publish only a reviewed sanitized receipt. Cleanup closes local sessions and removes only the run's containers, network and temporary credentials. The successful run verifies cleanup. Earlier local preparation failures—missing Node dependencies and an unset path to an already-installed browser—are retained in private diagnostics and are not product failures. No provider upgrade, protection bypass or production retry was used.

Production QA not run (paused by owner). Affected production QA: none. Browser, server, schema, migration, package and production QA implementation are unchanged. The new profiler is an optional local diagnostic tool and does not alter required CI jobs. Owner usability acceptance: not given; no user-facing design changed.

## Release verification

Owner-approved [PR519](https://github.com/johnvanesyan-arch/HaiEdu/pull/519) merged at `40a912668ba4045ecd571c83e377aa64031a751d`, preserving approved tree `52e66204abee94bf775ac9d499f9923db7470477`. All five required [PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44082684159) and [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44085429699) pass, as do the three security analyses. Hosted test counts are not inferred from job status; the separately recorded local measurements and regression counts remain unchanged.

Twelve fresh static checks verify the merged source, exact build manifest, account-access page, one built JavaScript file, MIME types and reviewed cache/security headers on all three public addresses. The bare domain redirects to the canonical www address. The build remains the exact PR517 build; its full 29-page/128-asset verification is reused for unchanged files. Hosting waited for required checks, then updated through the normal Git integration. No manual promotion, account sign-in, page script execution or Supabase request was used for these checks. An initial direct Node connection failed; honoring the environment's configured proxy restored ordinary static access, without bypassing a network restriction.

This release adds the optional local profiler and audit record. Product, browser, server, database, settings, packages and production QA implementation remain unchanged. Production QA not run (paused by owner); affected suites: none. The bounded database audit is complete; the advisory inventory and wider workload limitations remain explicit. BF-24 has not started.
