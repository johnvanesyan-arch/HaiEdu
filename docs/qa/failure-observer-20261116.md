# BF-22 — useful failure alerts: public website and main CI

## Activation and delivery verified

On 16 November 2026 (Asia/Yerevan), John explicitly approved activation and the one-time notification test, then confirmed that `BF22_FAILURE_ALERTS=true` and repository **Watch → Custom → Issues** were saved. The [enabled main observer](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43937012240), attempt 1, passed both `observe` and `notify`. The collected report at `2026-11-16T19:13:18.615Z` found all three public addresses and latest main CI healthy at `0ec47e91c0b8cac52552e4c2cec713c752af6b5a`. The publisher reported both incident categories unchanged; no real incident was opened, edited or closed.

This proves effective activation through the workflow and script guards, which require the variable to equal `true`. Administrative variable readback is still unavailable through the connection. The hourly schedule and main-CI completion trigger are enabled. The first scheduled event after activation has not yet been observed; GitHub scheduling remains best effort. These checks read static public pages and GitHub CI metadata, without signing in or calling Supabase.

A minimal manual-only workflow on temporary branch `codex/bf22-notification-delivery-20261116`, at commit `b28e97c772a771cd4c81bd49bce4a14636645dd1`, created one clearly labelled test issue using the GitHub Actions bot. It has an exact repository/branch/event guard, requires the activation variable, grants only issue-write permission, performs no checkout or production requests, and avoids duplicate test issues. The [delivery test](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43937111485) passed. John confirmed receiving [test issue #510](https://github.com/johnvanesyan-arch/HaiEdu/issues/510) in GitHub notifications. The issue was then closed and the temporary branch deleted. No actual outage or managed production incident was fabricated; personal email or mobile push delivery is not claimed.

The main observer source is unchanged from the verified release. The prior eighteen fault controls and required CI remain source-equivalent evidence; this delivery adds actual enabled execution and owner-confirmed notification receipt. [Activation receipt](../evidence/failure-observer-activation-20261116.json).

Activation and GitHub notification delivery for this first layer are complete. Broader BF-22 client-error capture, authenticated/abuse-limited collection, privacy/retention controls and independent coverage remain open. Production QA not run (paused by owner); affected suites: none. BF-16 stays off and paid stolen-password protection stays declined. To deactivate this observer, set `BF22_FAILURE_ALERTS=false`; existing incidents remain and already sent notifications cannot be recalled.

## Initial implementation and release history

The following sections retain the initial disabled-state qualification and release history; the activation status above supersedes their pending-activation statements.

John selected BF-22 on 16 November 2026 and chose GitHub notifications using his existing account. Owner-approved [PR508](https://github.com/johnvanesyan-arch/HaiEdu/pull/508) is merged at `2d6f14f7bac6d85df44e27cf334275f252911c7f`. PR/main CI, public static release checks and actual GitHub read-only observer runs pass. This first delivery provides an hourly public-site check and event-driven observation of the latest main CI, with incident publication still disabled. Activation and personal notification delivery remain open.

## Inventory and scope

At the start of BF-22, the repository had no existing monitor-named workflow or installed Sentry, Bugsnag, Rollbar, PostHog, Datadog, UptimeRobot or Better Stack integration. The `web/ux.js` unhandled-rejection listener announces a local error and writes to the browser console; it does not deliver a central alert. Recommendation telemetry measures learning recommendations, not operational failures. Existing QA request diagnostics retain allowlisted failure kinds and request IDs but have no exporter. No incident issue was found in the repository search. External monitoring and the owner's personal GitHub notification preferences remain unverified.

The Vercel connector reports that Observability Plus is not enabled; this is a feature-availability result, not an outage. No paid product, hosted configuration, Supabase call, sign-in, schema, browser application behavior or existing QA workflow is changed. This subject-neutral infrastructure applies to all three current public addresses: `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`. Main CI remains the existing full five-job release gate. Production QA not run (paused by owner). Affected production QA: none.

## What the observer does

- Once an hour, at minute 17, it reads `/release.json` and `/account-access` on each of the three fixed addresses. Healthy checks make six logical file reads; ordinary redirects add HTTP requests. The page is small static HTML, not an executed browser or a sign-in. The check validates the release-record format and the actual sign-in form identifiers. It does not compare a deploying release with the newest main commit, avoiding false alarms during normal alias propagation.
- A failed address gets one confirmation after three seconds. Each request has an eight-second deadline, bounded body size and at most two redirects within the three reviewed origins, with the same fixed path and no query, fragment or credentials. There is no unbounded retry or database polling. A recovered confirmation is healthy. An outage affecting multiple addresses opens one public-website incident; recovery closes it only when all three addresses pass.
- On completion of **CI**, it reads the latest main/push CI run from GitHub, rather than trusting the triggering event's conclusion. Only the current main commit can produce a signal. PRs, forks, old commits, pending runs, cancellations, skips and neutral results cannot open or resolve an incident. A successful latest run resolves a main-CI incident; failure, timeout, startup failure or required action opens one. CI events do not fetch public pages. Other workflows, including paused production acceptance, are not centralized by this slice.
- Repeated failures make no issue edits or comments. There is one open incident per category: public website and main CI. A healthy observation closes the owned issue; a subsequent distinct outage can open a new episode. Manually closing an unresolved incident does not suppress the next observation. Do not edit the bot's marker or title: ambiguous managed issues stop publication for review.

This is one observation location, using GitHub-hosted runners. An observer-specific routing problem can still look like an outage. Hourly scheduling is best effort and can be delayed or disabled by GitHub; this is not an immediate or guaranteed paging service. If GitHub, the observer, its token permissions or issue writes fail, the workflow fails with a fixed diagnostic category. No independent watchdog is delivered here. Existing native Actions notifications are a possible fallback only if the owner has enabled them.

## Notification and security contract

The workflow is inactive unless repository variable `BF22_FAILURE_ALERTS` equals exactly `true`. Manual `inspect` mode is permitted while disabled, reads public files and CI, and cannot publish issues. A manual `notify` request still requires the variable. The collector has only `contents: read` and `actions: read`; only the separate notification job receives `issues: write`. Checkout and Node/artifact actions are pinned. Both jobs check out the observer's default-branch commit, never the triggering PR/run head; no triggering artifacts, package installation, production secrets or user code are executed. The fixed repository and main-branch guards also run inside the script.

The entire observer is serialized with `cancel-in-progress: false`; no acceptance workflow's concurrency group is changed. The publisher validates the complete report again, checks its own run/commit identity and rejects reports older than ten minutes. It rereads current CI before applying a transition. Only GitHub Actions bot issues with the exact managed marker and title are writable. Issue pagination is bounded; ambiguous duplicates stop mutations. A mutation is never automatically retried after an uncertain response; the next observation rereads open issues first.

Reports and issue bodies contain only fixed categories, fixed public-service names, HTTP status numbers, commit identifiers, timestamps and constructed links using validated GitHub run IDs. Raw exception messages, stacks, response bodies, request URLs, headers, credentials, personal addresses and learner text are excluded. GitHub authorization is used only for its API, never public-site reads. No logging endpoint, database table or browser telemetry collector is introduced.

Validated JSON artifacts are retained for **seven days**. Actions job logs use the repository's existing retention setting; this change does not shorten those logs. Public incident issues remain in repository history, including after recovery. They contain no learner information. This is a public operational record, not a private support channel.

Example first alert, with illustrative identifiers:

> **HaiEdu public website check failed**
>
> Investigation needed. The public file returned an unsuccessful HTTP status: 503.
> The other public addresses, observed release and observer-run link are included.
> Repeated observations stay in this issue. A healthy observation closes it.

The existing account receives these through GitHub's own notification settings. To receive new issue alerts, use the repository's **Watch → Custom → Issues** option, or an existing equivalent watch setting. Whether GitHub also emails or pushes them depends on personal account preferences. No subscription setting has been changed and personal delivery has not been verified.

## Qualification

Eighteen focused controls exercise a real owned HTTP server for a three-address outage, repeat deduplication, recovery, a transient failure, main-CI failure/recovery, uncertain write response, partial recovery, recurrence and an actually stalled response body. Additional controls cover stale/PR/fork/skipped/cancelled events, current-main changes, redirects, size limits, schema/privacy refusal, ambiguous/human issues, disabled/inspect/foreign-run gates and workflow permission boundaries. The local GitHub substitute receives actual HTTP create/close requests; no real issue or alert is sent by these tests. Canary learner text and synthetic credentials are absent from the published test payloads.

The final full local code suite passes **1,875 tests**, including these eighteen controls, with no failures, skips or cancellations. Typechecking, workflow syntax validation, production-QA dependency coverage and the public-text email scan pass. The final static observation at `2026-11-16T16:26:50.820Z` finds all three addresses healthy at release `5aa0ceee5023285304b6c95b73aa893a85eb84f0`. Hosted CI and merge are now verified below. Notification activation and actual delivery verification remain pending; local tests do not prove delivery.

An initial public-file attempt did not use this workspace's configured proxy and could not connect; this is not recorded as a site outage. After using the configured proxy, the smoke check found that the draft observer expected obsolete form identifiers. The observer and fixtures were corrected to `loginForm`/`loginEmail`; the tests now serve the actual repository page. Final public-file observations and required checks are recorded in the [receipt](../evidence/failure-observer-20261116.json). These static reads execute no page scripts, sign-in or Supabase requests.

## Review, activation and remaining BF-22 scope

1. Review the implementation and public alert payload, complete required CI on the exact PR head, and obtain the merge/coordination decision required by `AGENTS.md`.
2. After merge, run **Production failure observer → Run workflow → inspect**. Confirm an artifact with three healthy public-site samples and the current eligible CI result. This manual check is read-only and separate from production QA.
3. With explicit approval for the GitHub setting change, set repository variable `BF22_FAILURE_ALERTS=true`. Confirm the first scheduled or main-CI observation and the owner's Issues notification preference. Setting it to `false` stops future automated observations and notifications; already open incidents remain for review. Deactivation cannot retract a notification already sent.
4. If actual notification delivery must be demonstrated, agree a clearly labelled one-time delivery test before sending it. Local fault injection proves the lifecycle, not delivery to the owner's device.

Broader BF-22 remains open: privacy-preserving capture of allowlisted client error kinds with release/trace identifiers, an authenticated and abuse-limited collection path, retention/deletion controls, and review of any existing external coverage. There is no unrestricted public logging endpoint. Main CI and public-site health do not verify signed-in lessons, production database operations, complete privileged actions or classroom capacity. Capturing those failures needs its own reviewed implementation; this initial layer must not be used to claim full BF-22 closure.

BF-16 live limits remain off; paid stolen-password protection remains declined. Owner usability acceptance: not applicable to this infrastructure-only change.


## Verified implementation release

The owner approved publication of all twelve reviewed files, then approved merging PR508 and finishing its release record while confirming no other agent was merging or releasing. Reviewed head `ff8eebca49ff750a26f162c613a1a2d89251530a` and merged source `2d6f14f7bac6d85df44e27cf334275f252911c7f` have identical tree `730753d303385403742ac6c9db4c2348bb3a0f7d`. All five required jobs pass in [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43915481506) and [merged-source CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43921302829), each on attempt 1. Both runs contain 1,875 passing code tests and 702 passing browser checks, with no failures, skips or cancellations. All eighteen observer controls pass in the published source. No required job or production-QA trigger was weakened.

The first actual [read-only inspection](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43921504687) passed while main CI and normal deployment were still finishing. It correctly reported three healthy public addresses at the previous release and omitted the still-pending CI result. It did not mistake release propagation for an outage. The final [read-only inspection](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43923346656) passed at `2026-11-16T17:55:18.983Z`: all three addresses and latest main CI were healthy at the merged source. Both notification jobs were skipped. No incident was created, edited or closed by these inspections.

Both actual `failure-observation-1` archives were downloaded and SHA-256 checked against GitHub's digests. Each contains exactly one small `report.json`, validated by the implementation's strict report schema. The final report contains exactly four healthy samples with the expected observer commit, workflow run and current main CI run. Both artifacts have seven-day expiry. The [receipt](../evidence/failure-observer-20261116.json) preserves their digests and bounded verification details without download links or credentials.

The automatic [CI-completion observer](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43923259337) skipped both `observe` and `notify`. This verifies the effective disabled state. Repository-variable readback through the current integration returned HTTP 403; no setting was changed and administrative readback is not claimed. Issues are enabled in the public repository. Personal watch preferences, real notification delivery and activation remain unverified.

Twelve public static checks at `2026-11-16T17:55:01.536Z` confirm the merged source, exact manifest, representative HTML/JavaScript hashes and reviewed MIME/cache/security headers on all three public addresses. The unchanged build remains `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a` (29 pages, 127 assets). Initial release-identity probes saw the prior release during normal rollout; final verification passes. Normal Git integration updated the site without a manual promotion or hosted configuration change. Only public static files were read; page scripts, sign-in and Supabase requests were not run. Production QA not run (paused by owner); affected suites: none.
