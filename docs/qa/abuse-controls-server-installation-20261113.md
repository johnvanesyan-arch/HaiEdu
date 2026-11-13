# BF-16 — server installation verified; new limits remain off

13 November 2026 (Asia/Yerevan). John authorized step1: install the prepared database changes and update all65 application server functions with the new limits off. The database migration and all65 bundle updates are installed and verified against reviewed source `8a55009d0e2ac26c5762f657fe263eeeb7ab3a11`. This is a completed installation, not activation or representative classroom qualification.

Owner usability acceptance: not given. John approved the existing Armenian waiting messages earlier. Paid stolen-password protection remains owner-declined, with no purchase or decision pending.

## Database installation and preservation

The exact reviewed SQL is applied as production ledger `20261113084322_bf16_actor_rate_budgets`. Its repository file is `supabase/migrations/20261112172643_bf16_actor_rate_budgets.sql`, SHA-256 `79d89140ac601ba9a5d0c4384545177f9ea3e7f428e9b1f21b2a0f589f816ec4`. The source and applied ledger versions are explicitly cross-referenced; do not reapply the source migration to make their timestamps match. All216 earlier ledger entries are preserved and the ledger now contains217 entries. Existing source/history reconciliation remains separate BF-20 work.

Two private tables, four candidate policy rows and six service-only functions are installed. All six function bodies read back exactly against source. Both tables have row-level security and deny direct table reads to anonymous, signed-in browser and service roles. The narrowly granted functions are unavailable to anonymous and signed-in browser roles; their public wrappers use SECURITY INVOKER, private implementations use the reviewed definer boundary, and all use the fixed pg_catalog search path. Every one of the173 pre-existing table-catalogue, owner, permission and security entries is preserved; only two new private tables are added. This is catalogue/privilege verification, not a new hash of every business row.

A rollback-scoped live SQL check passes invalid/missing actor and session rejection, cleanup bounds, empty cleanup and capability-grant assertions. It uses no valid person/session and allocates no counter. The request-counter table is empty after deployment. No recurring cleanup schedule or monitoring mechanism was installed. Security-advisor results are unchanged: one existing informational row-security notice and the owner-declined paid leaked-password warning.

## All65 consumers deployed and read back

The [complete deployment/readback manifest](../evidence/abuse-controls-server-bundles-20261113.json) records every consumer, version, artifact digest, gateway setting and emitted file hash. All65 functions are ACTIVE. All337 emitted local file occurrences read back byte for byte against the reviewed package, including the same new admission helper in every function. The upload pack contains338 local file occurrences: the compiler intentionally omits only submit-answer's type-only `_shared/types.ts` dependency. Its explicit type import remains in the reviewed entrypoint; no runtime dependency is omitted and no other missing/extra file is waived.

All63 existing true gateway JWT settings and the two existing custom-verification exceptions (`get-teacher-student` and `manage-supplementary-resources`) are preserved. Role/MFA/tenant/session checks, deletion-pending cancellation, classroom scopes, learning/grading rules and content-release gates retain their reviewed scope. Existing server import URLs are preserved; no SDK migration is claimed. The previously audited older helper copy in get-student-dashboard is aligned to reviewed source; its sole used export was already byte-identical, and no unrelated learning change is claimed.

Fresh pre-install version/artifact/JWT metadata matched the complete prior65-bundle/272-file source audit. Those unchanged original bundles remain privately retained for rollback; their previous source comparison is reused under exact artifact equivalence. After the owner's off-setting save, all65 version numbers advanced while every original artifact and gateway setting stayed the same; this metadata-only observation is retained without asserting an independently verified provider cause. Each source update then received fresh deployed-file readback.

Automatic approval review initially rejected three file-service updates and asked for more-specific production permission. The rejected targets remained on their prior versions; their refusal records are retained. John then explicitly approved the frozen remaining14 named targets and necessary state-checked retries. All14 subsequently deployed and read back successfully. No rejection was bypassed through a different tool, payload or indirect update, and no rejected attempt is represented as a successful deployment.

## Off setting and bounded live checks

John confirms saving `HAIEDU_RATE_BUDGETS_MODE=off` directly in Supabase Function Secrets. The connection cannot independently read or manage that provider setting, so the setting is owner-confirmed rather than administratively read back. Every deployed helper has the exact reviewed off-mode behavior. Counter rows are observed as zero during and after the rollout; this supports the installed-inactive scope but is not independent configuration attestation or real-traffic load qualification.

All65 public endpoints pass a final unsigned check:65 OPTIONS requests return200 with the reviewed cross-origin header, and65 no-Authorization empty POST requests return401. These130 requests use no API key, valid token, account, sign-in or recipient. They confirm the observed public request guards, not fresh signed-in role/functionality acceptance, real email delivery or classroom capacity. The first-function pilot's two earlier unsigned checks remain separately retained.

The reviewed source's isolated evidence is reused explicitly:1,839 code tests,696 native Chromium cases,14 core counter checks and9 additional PostgreSQL17.6 session/concurrency checks passed in required CI. The120-logical-person/up-to24-database-connection case is not real Supabase Auth/network/classroom throughput proof. This installation adds no browser or backend-source change beyond that already-reviewed source. The documentation-only PR still requires all five checks on its own exact head before merge.

Production QA not run (paused by owner). No workflow was dispatched and no designated fixture account was signed in manually. Affected production QA for the backend rollout: Mobile Browser QA; Teacher Feedback; Resource Assignments; English Unit1–3 pilot-read; Chapter II–VI pilot-read; Sprint14 actions; Sprint14D analytics; Sprint15A3 authenticated QA; Teacher Performance; Teacher Loading Rollout (all16 recorded suites). Their dependency routing, pause, reviewed-main and shared fixture-serialization guards are unchanged. A targeted manual run remains the owner's decision when compatible account bootstrap and acceptance scope are reviewed. The closing documentation change itself affects no production QA suite.

## Remaining gates

| Work | Boundary | Estimated active time |
| --- | --- | --- |
| Review and merge the installation record | Five exact-head checks and fresh no-other-merger/releaser confirmation; standing documentation release-record approval applies | 15–30 minutes excluding CI/owner waits |
| Qualify representative account/classroom use | Separately approved test route/accounts; preserve the designated-fixture/manual-sign-in restrictions and production QA pause | Part of the next30–60-minute qualification/activation estimate, plus scheduling |
| Arrange bounded recurring cleanup and monitoring | Explicit reviewed mechanism and scope before activation; the tested bounded RPC alone is not scheduled retention | Included in the next qualification stage |
| Accept candidate policy values and activate | Separate explicit owner approval after reviewed results; no activation is authorized by this installation | After qualification |
| Observe the first real classroom/email pilot | Owner scheduling and feedback; adjust only through reviewed changes | Scheduled with owner |

The prepared rollback first requires the mode off for all consumers, then restores reviewed original bundles and removes only BF-16 capabilities/state as separately warranted; Auth and business records are preserved. No rollback was required or executed during installation. The live database checks above are temporary test transactions rolled back after verification, not a rollback of the installation.

No real-account sign-in, email, curriculum release, billing change, hosting promotion or domain assignment was performed. Independent review, owner usability, BF-02 deferral, subject expansion and content gates retain their separate scope. This record changes documentation/evidence only; all runtime/build/archive/backend/migration/test/script/dependency/workflow/hosting bytes are preserved.

[Machine-readable installation evidence](../evidence/abuse-controls-server-installation-20261113.json) · [Reviewed integration contract](abuse-controls-integration-20261112.md) · [Earlier frontend release](abuse-controls-integration-release-20261112.md).
