# BF-16 — integration release; server activation remains open

12 November 2026 (Asia/Yerevan). Owner-approved [PR477](https://github.com/johnvanesyan-arch/HaiEdu/pull/477) is merged at `dd1c70e545c1d14fb09e7a9459b5bad4bbf9f017`, roadmap 4.178. Its tree `4cee6562e4211f8ecc16bbed3a2aa1699153010a` is identical to the approved head `3e4617d874df57c1117268e709efbacf1b77eb38`. The merged implementation is complete across all 65 application endpoints and 41 browser SDK consumers; the new backend capability remains uninstalled and enforcement remains off.

Owner usability acceptance: not given. John approved the two Armenian waiting messages; that copy decision does not establish personal acceptance of the finished interface. Paid stolen-password protection remains owner-declined, with no purchase or activation pending.

## Delivered scope

The browser uses one shared response boundary for application refusals, displays the approved wait or general retry message, and preserves entered text, codes and selected recipients. A definite refusal restores editing; an uncertain write retains the existing reconciliation protections. Existing Auth-provider messages, account fences, role/MFA/tenant boundaries, subject-neutral learning behavior and curriculum/content gates remain unchanged in scope.

All 65 server entrypoints have reviewed per-person admission in repository source, including verified-session binding, one atomic reservation of all applicable costs, separately committed accounting, and recipient-weighted invitation attempts. This is source delivery, not a deployment of those Edge bundles. The CLI-generated migration and complete 65-function source/settings manifest are prepared. The deployment pack preserves each current gateway JWT setting and stays off during installation. There is no application allowance keyed to a classroom network address.

See the [implementation checkpoint](abuse-controls-integration-20261112.md) for the full candidate policies, failure contract, source audit, isolated tests and rollback. Its initial preparation status is retained as history; this release record supplies the later merge and hosted verification.

## Verification

All five [exact-head PR checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43279336805) and all five [merged-source checks](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43283083097) pass on attempt 1: 1,839 code tests and 696 native Chromium cases, with zero failures, skips or cancellations. Approved-head and merged trees are byte-identical.

The three public addresses (`haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`) serve the exact merged source and browser build `41b75062950fff7d8f85c8ec495215ed862e1075aed8b166d1d7c26eebcce377`. On each address, the manifest, 29 pages and 127 current immutable assets match reviewed bytes/hashes, MIME types, cache rules and enforcing browser-security headers. Verification brackets the static reads with release identity checks and used 723 requests including redirects. No page script executed, no account signed in and no Supabase request was made. Domain cutover was automatic. The initial identity probe observed the prior source while the merge checks were still running; that observation is retained, without asserting an independently established propagation cause.

The required database job runs the existing 14 counter checks and nine new PostgreSQL 17.6 session/concurrency/rollback checks. The 120 logical-person / 24-connection isolation case is not real Supabase Auth, email-provider or classroom-capacity proof. All 17 new native browser regressions pass; two cases reproduce the previous-source refusal behavior as expected failures. Native tests use synthetic identities and intercepted services.

The earlier broad local browser invocation had 690 passes, five failures and one cancellation because two fixtures omitted a new shared import. Both fixture files were repaired and all nine cases in those files passed; this is retained as grouped local coverage. The later full exact-head CI result is recorded separately and no failed case is waived.

Production QA not run (paused by owner). All 16 automatically triggered acceptance runs skipped; none was manually dispatched. Affected production QA: Mobile Browser QA; Teacher Feedback; Resource Assignments; English Unit 1–3 pilot-read; Chapter II–VI pilot-read; Sprint 14 actions; Sprint 14D analytics; Sprint 15A3 authenticated QA; Teacher Performance; Teacher Loading Rollout. Their shared-dependency triggers, reviewed-main guards, pause and non-cancelling fixture serialization remain in place. A targeted manual check of the affected flows is recommended when John chooses to resume; the existing CAPTCHA/bootstrap compatibility must be resolved first. No designated QA account was signed in manually.

## Remaining production gates

| Work | Concrete prerequisite | Estimated active time |
| --- | --- | --- |
| Install migration and update all 65 functions with enforcement off | Separate approval for this specific production change; fresh live source/schema/settings preflight, preserve gateway settings and exact readback of all manifest files | 30–60 minutes |
| Qualify and activate limits | Approved representative account/classroom checks, agreed policy values, bounded recurring cleanup/monitoring and separate activation approval | 30–60 minutes plus owner scheduling |
| Observe the first real pilot | Owner classroom/email observation and reviewed adjustments if needed | Scheduled with owner |

The counters, session RPC and recurring cleanup are not installed on the live project. Existing server bundles retain their prior behavior. The application mode defaults to off, while an unknown explicit mode fails safely. The service-only bounded cleanup capability is tested; it is not a scheduled retention policy. The prepared rollback first requires enforcement off for every consumer, then removes only BF-16 objects, preserving Auth and business data.

No production SQL, migration, Edge deployment, setting change, sign-in, email, workflow dispatch, manual Vercel promotion or domain assignment was performed in this release. Automatic Git-based frontend deployment is the scope authorized by the merge. Classroom qualification, finished-interface usability, independent reviews, content gates, BF-02 deferral and paused subject expansion retain their scope.

This closing documentation change preserves the verified runtime, browser build/archive, backend/migration source, scripts, tests, dependencies, workflows and hosting configuration. It does not approve the next production step.

[Release evidence](../evidence/abuse-controls-integration-release-20261112.json) · [Prepared all-function manifest](../evidence/abuse-controls-edge-manifest-20261112.json).
