# BF-22 — reports of failures during signed-in use

Date: 17 November 2026, Asia/Yerevan. This implements the bounded first version proposed in the [source audit](client-failure-alerts-audit-20261117.md). It is prepared for review, not activated in production. The existing public-site/main-CI observer remains separate.

## Behavior and scope

The shared browser SDK installs one reporter per client, with shared page listeners. All 65 existing rate-aware service routes are inventoried; 64 receive a fixed operation category and recommendation analytics is deliberately excluded to prevent reporting loops. Successful fallbacks and expected HTTP 4xx replies are not incidents. The three submission paths keep their existing recovery procedures: reporting does not replay a save, send or submission, and an unconfirmed reply is not described as lost work.

Explicit hooks cover invalid writing/feedback versions, malformed audio and native audio playback errors. Owned application exceptions/rejected promises are reduced to one category. Extension errors are ignored. The shared implementation covers student, teacher, school-administrator, master-administrator and content-management clients; it introduces no subject-specific data or rules. The early teacher prefetch remains speculative: its normal final service fallback is observed, rather than counting a recovered prefetch as a failure.

`web/client-failure-config.mjs` is false in the proposed release. The backend defaults to off, and the additional GitHub jobs require their own flag. Merging this change alone does not turn on collection or notifications.

## Data and limits

The request permits exactly eight fields: schema version, registered build hash, fixed page category, fixed operation category, fixed failure category, numeric status, bounded duration and random event ID. It rejects extra fields. No response body, message, stack, URL, account name, answer, grade, feedback, filename or password is serialized. The normal authentication token is used only for the authenticated request; it is not stored as diagnostic content.

| Control | Implemented behavior |
| --- | --- |
| Browser | Memory only; queue at most 20, five sends per hour per current session, repeated category/operation/status suppressed for one minute. Logout, account change and page teardown discard pending observations. No retry. |
| Deadline | Reporting has a 1.5-second browser deadline. The collector has a 2.5-second deadline and cancels stalled request bodies. Business requests do not await it. |
| Collector | Body at most 1 KiB; live Auth user and session required; registered, unexpired build; fixed contract. Independently limited, regardless of BF-16's off setting. |
| Flood bounds | Per-worker coarse pre-auth limit of 200 requests/minute and 16 concurrent requests. Atomic database limits of five accepted reports/actor/hour and 500/project/hour. Busy diagnostic locks refuse reports instead of waiting on classroom work. This is not a distributed pre-auth firewall or a load-capacity guarantee. |
| Storage | Four private tables with RLS and no direct anon/authenticated/service-role table grants. Only service-only wrapper functions can record/read summaries. Per-person admission linkage is deleted with the profile. |
| Retention | Separate reviewed cron activation runs every 15 minutes; linkage is eligible for deletion at 23h45m and aggregate/hour buckets at 6d23h45m. These targets depend on the scheduler functioning. Only this job's completed scheduler history is pruned after seven days. |
| Export | Dedicated 64-hex-character read capability; fixed category/operation/count candidates only. It cannot select a person, table, query or time range. GitHub does not receive the service-role credential. |
| Alerts | At least three related reports in one ten-minute bucket, from at least two actors or three administrator reports. Hourly best-effort polling looks back 70 minutes. One open issue per broad category; repeats are silent. Silence never closes an issue. A recently closed issue suppresses reopening for two hours. |

Browser reports are untrusted symptoms, including reports submitted by a malicious signed-in account. They warrant investigation, not an automatic diagnosis. Public GitHub issue history has GitHub's separate retention; only fixed labels and aggregate counts enter it. Private `client_failure_hours` counters expose accepted/dropped database admissions to an authorized operator; browser/network/coarse-worker drops are not a complete measurable denominator.

## Verification

The owned local environment uses real Auth, Edge Runtime, PostgREST and PostgreSQL, with eight fictional accounts spanning five roles and two schools. Each account produces five controlled failure classes, for 40 accepted reports. All eight revoked sessions are refused. The exporter returns five sanitized candidates. The real publisher projects this actual collector output into an in-memory GitHub adapter: five notices, zero repeated notices, no automatic closure and **no real GitHub requests**. All synthetic sessions, containers, networks and temporary credentials are removed. No learning record or BF-16 counter is created.

A separate real-database test simulates 100 actors with eight concurrent callers, fills and verifies the atomic 500-report ceiling, and checks private grants, unknown builds, extra fields, revocation, suspended accounts, profile erasure and actual scheduled retention. This is database concurrency evidence, not 100 simultaneous browsers or production classroom capacity. Any busy-lock refusal is recorded; test-only sequential calls fill remaining capacity, whereas the production reporter never retries.

Native Chromium controls exercise unchanged business-result/body identity, one business call, real owned exceptions/rejections, extension exclusion, account switching, pagehide/back-forward restoration and bounded shutdown with a slow collector. Contract tests cover malicious extra fields/getters, disabled reporting, deadlines, narrow summary access, grouped publication and fixed-destination polling. Existing submission/editor/browser regressions remain required.

Local totals: **1,889 code tests, 104 relevant native browser checks, 32 focused alert controls and 15 forward-update controls pass**. The [evidence receipt](../evidence/client-failure-alerts-20261117.json) records source hashes and the limits of the checks. Exact-head CI is still required. The exploratory combined run first stopped at local runtime startup (cause unestablished); subsequent harness failures identified a missing fixture-version allowlist and incorrect build-manifest field, both repaired before the passing run. The broad test run also exposed stripped-import VM fixtures; they now load the real helper without weakening assertions. No production defect is inferred from those test-harness failures. Supabase's hosted security advisor was not run; actual local grant, RLS and access assertions are the security evidence here.

## Reviewable rollout, not yet executed

1. Approve and merge the exact tested PR with the required coordination and CI checks. Keep all three new switches off.
2. Approve the exact production schema, retention and two-function deployment separately. The forward SQL file is `supabase/updates/sql/20261116201934_bf22_client_failure_reports.sql`; historical migrations and the fresh baseline remain immutable. `supabase/updates/plan.json` qualifies an owned fresh installation, **not** a blanket production migration. Compare the live schema and dependencies before applying its reviewed equivalent to production.
3. Install the reviewed private schema and retention job, then read back definitions, grants, scheduler configuration and preservation evidence. Deploy `record-client-failure` with JWT verification on and `get-client-failure-summary` with JWT verification off plus its mandatory dedicated capability. Read back both deployed bundles. The new shared collector/summary helpers are consumed only by these two new routes; existing `auth.ts` is unchanged.
4. Create the summary capability privately, set it in Supabase and in GitHub's `BF22_CLIENT_FAILURE_SUMMARY_KEY`; never put it in source, issues, logs or chat. Set backend `HAIEDU_CLIENT_FAILURE_REPORTS_MODE=observe` only after the schema and retention job are verified.
5. Prepare and approve the frontend activation commit. Register that exact build using the reviewed SQL emitted by `node scripts/client-failure-build-registration.mjs`, then release with reporting enabled. This version requires registration for **every** frontend build and renewal before 30 days; an unregistered/expired build is refused. Establish this release/renewal responsibility before activation, or keep the feature off.
6. First collect in inspect mode with the `client_reports` input selected; the default public-only inspection stays independent. After reviewing candidates, enable GitHub variable `BF22_CLIENT_FAILURE_ALERTS=true` and verify a clearly labelled synthetic notification through an approved test route. Reuse the owner's confirmed GitHub delivery preference; do not ask him to run console code. This new layer's hosted delivery is still unverified.
7. Roll back collection by setting the backend mode off; disable new notification jobs with their separate GitHub flag. Retain the cleanup job while stored rows remain. No business data rollback or BF-16 activation is involved.

No paid provider is proposed. Existing platform quotas still apply; this work does not authorize a purchase or promise zero incremental usage. BF-16 remains off; paid stolen-password protection remains declined.

## Remaining limits

Failures before SDK/Auth initialization, offline users, blocked reporting, raw Auth/CAPTCHA/Storage errors, and intentional 4xx refusals are not fully observed. The MFA page can report an owned page exception only once its SDK session is available; this is not a full MFA-flow monitor. The redirect and synthetic preview are not ordinary signed-in workflows. Successful static checks and client silence do not prove that reporting is available. GitHub may delay scheduled jobs beyond the 70-minute window; such gaps can miss candidates. Independent monitoring and broader BF-22 coverage remain open. These limits are part of the activation review; this record does not claim platform-wide monitoring completeness.

Production QA not run (paused by owner). Affected production QA: mobile browser; teacher feedback; resource assignments; teacher loading/performance; authenticated role access; Sprint 14 actions and analytics; English Units 1–3 read acceptance; Physics Chapters II–VI read acceptance. Shared dependency triggers are retained. After a release, recommend only an owner-authorized targeted role/submit/audio acceptance; do not automatically dispatch production workflows.

Owner usability acceptance: not applicable; no visible wording or layout changes are proposed.
