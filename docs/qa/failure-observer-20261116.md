# BF-22 — useful failure alerts: public website and main CI

John selected BF-22 on 16 November 2026 and chose GitHub notifications using his existing account. This first delivery prepares an hourly public-site check and event-driven observation of the latest main CI run. Activation is disabled by default. Publication, required PR checks, merge approval and activation are recorded separately below; local qualification is not a deployed notification claim.

## Inventory and scope

The repository has no existing monitor-named workflow or installed Sentry, Bugsnag, Rollbar, PostHog, Datadog, UptimeRobot or Better Stack integration. The `web/ux.js` unhandled-rejection listener announces a local error and writes to the browser console; it does not deliver a central alert. Recommendation telemetry measures learning recommendations, not operational failures. Existing QA request diagnostics retain allowlisted failure kinds and request IDs but have no exporter. No incident issue was found in the repository search. External monitoring and the owner's personal GitHub notification preferences remain unverified.

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

The final full local code suite passes **1,875 tests**, including these eighteen controls, with no failures, skips or cancellations. Typechecking, workflow syntax validation, production-QA dependency coverage and the public-text email scan pass. The final static observation at `2026-11-16T16:26:50.820Z` finds all three addresses healthy at release `5aa0ceee5023285304b6c95b73aa893a85eb84f0`. Required hosted CI, merge, notification activation and actual delivery verification remain pending; these local results do not replace them.

An initial public-file attempt did not use this workspace's configured proxy and could not connect; this is not recorded as a site outage. After using the configured proxy, the smoke check found that the draft observer expected obsolete form identifiers. The observer and fixtures were corrected to `loginForm`/`loginEmail`; the tests now serve the actual repository page. Final public-file observations and required checks are recorded in the [receipt](../evidence/failure-observer-20261116.json). These static reads execute no page scripts, sign-in or Supabase requests.

## Review, activation and remaining BF-22 scope

1. Review the implementation and public alert payload, complete required CI on the exact PR head, and obtain the merge/coordination decision required by `AGENTS.md`.
2. After merge, run **Production failure observer → Run workflow → inspect**. Confirm an artifact with three healthy public-site samples and the current eligible CI result. This manual check is read-only and separate from production QA.
3. With explicit approval for the GitHub setting change, set repository variable `BF22_FAILURE_ALERTS=true`. Confirm the first scheduled or main-CI observation and the owner's Issues notification preference. Setting it to `false` stops future automated observations and notifications; already open incidents remain for review. Deactivation cannot retract a notification already sent.
4. If actual notification delivery must be demonstrated, agree a clearly labelled one-time delivery test before sending it. Local fault injection proves the lifecycle, not delivery to the owner's device.

Broader BF-22 remains open: privacy-preserving capture of allowlisted client error kinds with release/trace identifiers, an authenticated and abuse-limited collection path, retention/deletion controls, and review of any existing external coverage. There is no unrestricted public logging endpoint. Main CI and public-site health do not verify signed-in lessons, production database operations, complete privileged actions or classroom capacity. Capturing those failures needs its own reviewed implementation; this initial layer must not be used to claim full BF-22 closure.

BF-16 live limits remain off; paid stolen-password protection remains declined. Owner usability acceptance: not applicable to this infrastructure-only change.
