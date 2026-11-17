# BF-22 — signed-in reporting activation

Prepared 17 November 2026 (Asia/Yerevan), against main `f395d1067fe7a75c920c88e58cb30ee57c34701c`. The owner approved proceeding with renewal, the saved-key connection test, activation and one labelled test notification. Backend configuration and delivery verification below are complete. This candidate enables the browser default; build registration, the reminder, exact-head CI and the reviewed merge remain before the browser release. It does not close wider BF-22 coverage.

## Verified live connection and delivery

The owner saved `HAIEDU_CLIENT_FAILURE_REPORTS_MODE=observe`. [Main-branch inspect run 44062770075](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44062770075) successfully fetched and validated the private summary using GitHub's saved capability; both notification jobs skipped. A separate unsigned request received 401 with the fixed unavailable response and no-store header. The secret was never read by the operator or copied into evidence.

Both deployed functions are ACTIVE at version 4. All seven returned files (six unique) match repository bytes; their bundle hashes remain identical to the installed implementation. Collector JWT verification is on; the summary route uses its dedicated capability with gateway JWT verification off. Fresh read-only checks found zero rows in all four reporting tables and one active retention schedule.

A separate, temporary branch tested notification delivery. [Run 44063798870](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44063798870) first read the real private summary, then used a separately permissioned job to create [test issue #516](https://github.com/johnvanesyan-arch/HaiEdu/issues/516). The message was explicitly labelled TEST, used one fictional three-report example rendered by the production formatter, and was sent with the existing GitHub transport helper. It did not insert reports into production or cause a classroom operation to fail. The owner confirmed receipt in GitHub notifications. The issue is closed and the temporary branch/worktree removed; its exact source and run remain recorded. An initial dispatch supplied the wrong reviewed-head input and skipped before either job ran; the corrected exact-head dispatch passed. This was an input mistake caught by the guard, not a product failure or an extra notification.

The owner then saved `BF22_CLIENT_FAILURE_ALERTS=true`. [Normal main-branch notify run 44065658809](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44065658809) completed all four existing/new observation and publication jobs successfully. There were no private candidates to publish. This verifies effective enabled job behavior; direct administrative setting readback is unavailable.

These checks establish the live key match, fixed-summary access, normal job execution and owner receipt of a labelled synthetic notification. They do **not** establish a fresh signed-in production browser-to-collector journey. Capture, five-role session/tenant handling, privacy, limits and retention have separate real local-service evidence from the implementation and required CI. No designated QA student was used by hand and no production QA workflow was dispatched.

## Browser candidate and consumers

`web/client-failure-config.mjs` enables the shared default. The raw browser SDK is rebuilt, along with the immutable browser archive. The enabled build is `fe0717a1640bd5887e94171e225c2d60b4368f346f610f3bf48ffcd4e76951c9`: 29 pages and 128 current assets, with 53 new asset names and 75 unchanged. Prior immutable assets remain available.

This is shared, subject-neutral infrastructure. The SDK reaches student, teacher, school-administrator, master-administrator and content-management clients; existing fixed-category coverage covers 64 of 65 inventoried service routes, excluding recommendation analytics to avoid loops. Business responses, submission/recovery behavior, reporting privacy/limits and the backend implementation are unchanged. No user-facing wording or layout is changed.

The added native regression uses the shipped default without an activation override. It fails on the earlier off configuration and passes on this candidate, preserving one business call and sending one bounded controlled report to an isolated local collector. Two existing reviewer browser tests now accept the same optional `WRITING_QA_CHROMIUM` executable override used by other suites; their assertions and CI default browser remain unchanged.

## Checks and release gates

The final full local code run passes all **1,889 tests**. All **26 relevant native browser cases** pass: 24 from the initial batch and two after the local browser-launch repair. The SDK, teacher bundles, immutable archive and browser-QA dependency checks pass. The initial full run found the not-yet-rebuilt SDK (1,888 pass, one failure); after rebuilding it, the focused three SDK controls and full 1,889-case rerun pass. The first browser batch lacked the default cached executable for two fixtures. A cached-browser launch attempt then stalled and its owned test processes were stopped; both fixtures pass with the standard optional executable override. Dependency installation initially lacked a writable npm cache; using a task-owned cache resolved it without changing package pins.

Before merging, require the five exact-head CI jobs, a quiet/current main branch, the owner's concrete PR approval and current merge coordination. The reviewed [registration SQL](../evidence/client-failure-activation-20261117.sql) registers only this enabled build for 30 days; execute it through the authorized connection and read back its exact identity/expiry before release. No broad database credential is placed in GitHub. [Machine-readable preparation evidence](../evidence/client-failure-activation-20261117.json).

After merge, verify the full current primary-domain build and bounded source/manifest/file/header checks across all three public addresses, then the merged-source CI and normal observer. A READY deployment alone is not acceptance. Report delayed domain updates accurately and do not manually promote without approval.

## Renewal and rollback

The owner accepted a reminder 21 days after registration, with renewal performed during a maintenance session. Create the reminder from the actual registration time before release and record its ID/date with the registration receipt. This reminder asks for a maintenance review; it does not write to production. The operator checks the current public build and exact expiry, prepares the bounded renewal, and obtains the required production-write approval. After each renewal or replacement build, reset the reminder so the next review is 21 days after the latest registration; do not assume an old reminder renews anything automatically.

If reports must stop, set backend mode to `off` and the new GitHub flag to `false`; the existing public-site layer has its own separate flag. Retain cleanup while private rows remain. A frontend rollback to the earlier disabled build does not require registering it. BF-16 limits remain off and paid stolen-password protection remains declined.

Production QA not run (paused by owner). Affected production QA: mobile browser; teacher feedback; resource assignments; teacher loading/performance; authenticated role access; Sprint 14 actions and analytics; English Units 1–3 read acceptance; Physics Chapters II–VI read acceptance. Shared triggers remain intact. A separately authorized targeted signed-in role/submit/audio check can assess live capture; this delivery does not dispatch those workflows or claim their results.

Owner usability acceptance: not applicable; no visible design changes. Pre-auth/offline gaps, raw Auth/CAPTCHA/Storage coverage, independent monitoring and fresh signed-in production capture remain open.
