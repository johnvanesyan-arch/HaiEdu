# BF-22 — audit of failures during real use

Date: 17 November 2026, Asia/Yerevan. Source reviewed: [493f4c1310d82247f46c05b30a456c1264704fa3](https://github.com/johnvanesyan-arch/HaiEdu/tree/493f4c1310d82247f46c05b30a456c1264704fa3). This is the focused audit John approved after activating the public-site/main-CI alerts. The recommendations below are proposed work, not an implemented collector or a claim that a new live defect was reproduced.

## Recommendation

Build a small, shared error reporter and an authenticated, separately limited collector, then qualify the complete route to the existing GitHub notifications in the owned local staging environment. Cover student, teacher, school-administrator, master-administrator and content-management consumers of shared code. Keep the reporting path optional and separate from the actions people are performing.

The most valuable signals are unexpected service failures, requests that cannot complete, invalid service responses, application exceptions, and writes that remain unconfirmed after their existing recovery procedure. A lost reply must not be described as lost student work. Reports must never retry the underlying save, submit, invitation or administrative action.

No additional paid provider is proposed for this first version. Existing Supabase/GitHub quotas still apply; measure the bounded collector in staging before choosing live limits. Broader BF-22 coverage, including an independent monitor and failures before authenticated reporting can start, remains separate.

## What the audit established

| Finding | Evidence and consequence |
| --- | --- |
| Browser Edge calls have a common boundary. | Forty-one authored modules directly import invokeRateAware; six import the learner recovery helper. Only web/rate-budget-feedback.mjs calls the SDK's functions.invoke directly in this source scan. This is a useful shared observation point, not proof that every browser network request passes through it. |
| The compiled page graph confirms wide coverage. | Traversing the committed build graph finds the shared boundary in 26 of 29 pages. The three other pages are admin-security.html, a teacher-workflows redirect, and the synthetic teacher-workspace preview. The receipt lists all pages and the inventory method. |
| A general crash listener misses handled failures. | web/ux.js:419 logs unhandled promise rejections locally and shows a message. It has no central exporter. The UX module appears in only 24 of the 29 built pages. Student saves, feedback, assignments and administrator errors commonly have their own catch handlers, so they never reach this listener. |
| Some important failures happen above the transport helper. | A successful HTTP reply can still have an invalid version or malformed audio payload. Audio-element playback errors also occur after a successful download. These need explicit semantic hooks, without copying response bodies. |
| The teacher's early load has a separate path. | web/teacher-home-startup.mjs uses fetchImpl for a profile read and get-teacher-dashboard before the SDK is ready. Failed or cancelled speculative reads fall back to the normal path. Observe the final user-visible failure, not a harmless prefetch cancellation or successful fallback. |
| Auth and database client operations need a separate inventory. | Forty-nine authored modules contain Auth or Storage client references. The master-administrator MFA page does not use the shared Edge boundary. This count is an inventory clue, not a claim that all 49 modules implement distinct network operations. |
| There is already a useful build identifier. | scripts/build-web-assets.mjs:135 inserts a haiedu-build meta tag into every built HTML page. Use that page's build identifier. Fetching today's release.json after an error could wrongly attribute an old open page to a newer release. |
| Existing diagnostics provide a privacy pattern, not a ready collector. | scripts/qa-request-diagnostics.mjs allows fixed categories and bounded values, excludes messages/stacks/bodies, and optionally reads a validated provider request ID. It is a Node QA helper, not browser telemetry. Recommendation telemetry records learning recommendations and must not be repurposed for errors. |
| There is no installed general error reporter in the reviewed sources. | The package/browser/Edge/workflow scan found no configured Sentry, Bugsnag, Rollbar, PostHog, Datadog, UptimeRobot or Better Stack error integration. This does not establish the absence of externally configured account services. |

Source anchors: [shared invocation](../../web/rate-budget-feedback.mjs), [answer recovery](../../web/answer-response-recovery.mjs), [written work](../../web/written-work.mjs), [teacher feedback](../../web/teacher-feedback.mjs), [teacher early load](../../web/teacher-home-startup.mjs), [audio](../../web/learning-audio.mjs), [assessed audio](../../web/assessed-audio.mjs), [build identity](../../scripts/build-web-assets.mjs), [QA diagnostics](../../scripts/qa-request-diagnostics.mjs).

## Suggested coverage for the first implementation

| Area | Failures worth reporting | Important distinction |
| --- | --- | --- |
| Student dashboard and learning sessions | Unexpected dashboard/session failures, invalid item responses, repeated request timeouts. | A locked or unavailable course and an expected permission refusal are not automatically incidents. |
| Answer and draft submission | Unexpected server/transport failures and a write that remains unconfirmed after existing recovery. | Keep the original immutable answer and request identity; a timeout does not prove whether the database committed. |
| Written work, feedback and assignments | Failed draft saves; unresolved submission, publication or assignment confirmation; invalid response contracts. | Preserve existing revision conflicts, retained drafts, receipt lookup and explicit retry controls. Never include text, scores, recipient lists or request payloads. |
| Audio and private files | Unexpected authenticated delivery failures, invalid payload type/version, owned audio playback errors. | Reaching a permitted play limit, navigating away or cancelling a request must not become an outage. Never include audio bytes, transcripts, filenames, storage paths or download URLs. |
| School and master administration | Unexpected dashboard and management-service errors. | Normal MFA requirements, role restrictions, validation and admission refusals remain expected outcomes. No administrative action is repeated for diagnostics. |
| Content-management roles | The same transport/response classifications for shared consumers. | Keep subject, curriculum and approval-policy decisions outside the reporting mechanism. |
| Application exceptions | Fixed exception categories for HaiEdu-owned modules after reporter/session initialization. | Ignore extension/third-party failures and arbitrary script locations. Do not upload the exception message, reason or stack. |

Do not select failures solely by HTTP status. Known validation, access, revision-conflict and rate-limit responses should be excluded from incident alerts. Unexpected repeated refusals can be retained as a separate low-priority candidate, because status alone does not establish whether authorization behaved correctly. The collector's own errors and requests are always excluded from capture.

## Proposed report contract

Create a new versioned, allowlisted schema. The reporter should receive a fixed operation descriptor and normalized outcome, not an arbitrary Error object plus request options.

Permitted browser fields are a schema version, a known build identifier, a fixed page category, a fixed operation category, a fixed failure category, an allowed HTTP status when known, a bounded duration, and an ephemeral random event identifier for deduplication. For an owned module exception, a registered asset identifier and bounded line/column may be useful. The collector supplies receipt time and derives any role context from verified identity.

Examples of operation categories are dashboard_load, answer_submit, draft_save, writing_submit, feedback_publish, assignment_send, audio_load and admin_action. Categories must come from a reviewed route/action catalog. A raw body.action string is not trusted simply because it is short.

Never collect passwords, access/refresh tokens, email addresses, names, student answers, feedback, grades, uploaded files, DOM snapshots, console output, raw error text/stacks, request/response bodies, arbitrary headers, full URLs, query strings, fragments, school/class/user identifiers or business request identifiers. The ephemeral telemetry event identifier is separate from an answer's idempotency key.

Validation must occur both before sending and on the server. Reject unknown fields and values. A hash-shaped string is not sufficient validation: a build or asset identifier must belong to the registered released-build catalog. Keep any optional provider request ID private; a browser can invent one, and it must not be treated as proof of a server failure.

Browser availability of provider request IDs is unverified. Existing CORS declarations do not establish that sb-request-id is readable by the browser. The initial slice should not add trace headers to every endpoint or promise backend correlation; adding headers/exposure later requires a reviewed CORS and deployed-consumer audit.

## Proposed collection, privacy and operational behavior

1. **Reporter:** install once, use the page's existing build meta tag, and send asynchronously after classifying the outcome. Preserve the original returned data/error object, response stream, timing semantics and user-facing recovery behavior. Reporter exceptions must not affect the action being observed.
2. **Session lifecycle:** use a small in-memory queue and the current authenticated session. Discard pending reports on account change, sign-out, stale context or disposal. Do not persist tokens or a report outbox in browser storage, use anonymous beacon fallbacks, or replay an offline backlog later.
3. **Collector:** use a dedicated Edge route with the user-JWT platform check retained, verified user identity and an active-session check. Treat authenticated client reports as untrusted observations, not authoritative evidence that a server write failed. Reject unauthenticated, revoked, disabled-account and malformed requests before storing diagnostic data. Do not accept client-selected actor or tenant identity.
4. **Independent admission:** impose collector-specific per-actor, per-fingerprint and global caps, a strict byte limit and a short deadline. Do not use a shared school IP as the normal classroom budget. BF-16's live switch stays off; reusing its currently disabled gate would not protect the collector. Existing budget primitives can inform the implementation, but logging limits must be independently enforced.
5. **Storage:** prefer private aggregate buckets over raw event history. Do not expose diagnostic tables through the learner Data API. Propose seven-day aggregate retention and at most 24 hours for any private correlation samples/admission linkage, subject to the reviewed schema. Any retained per-person linkage must participate in account erasure. Existing provider logs and public GitHub issue history have separate retention policies.
6. **Publication:** a trusted process projects private counts into a tiny fixed summary for the existing GitHub issue publisher. Use a narrowly scoped summary-read capability; do not put a broad service-role credential into a browser or add a broad production credential to GitHub as a shortcut. Publish no event identifiers, account information, raw reports or arbitrary links. The existing strict public-site report format should remain separate from the new client-report summary format.
7. **Health of reporting:** dropping a report at its cap or deadline is preferable to delaying lessons or generating a reporting loop. Expose a bounded collector/drop summary to the operator. The existing public-site monitor remains independent; a collector outage cannot reliably report itself through the same collector.

The proposed numerical limits are starting points to qualify, not production settings: an event at most 1 KiB; at most 20 queued events in memory; per-actor at most 5 accepted reports/hour; a global pilot ceiling around 500/hour for the stated 100+ student scenario. A separate coarse pre-auth flood bound and an explicit overflow counter are needed. Confirm behavior, storage growth and provider overhead with the simulated classroom before selecting final values. No quota or zero-cost claim is made from payload size alone.

## Alert policy to review before activation

Start with private observation of fixed candidates and use injected incidents to review the resulting summaries. For notifications, propose one open issue per broad category rather than one per student, page load or report. Repeated reports should not generate repeated comments or notifications.

A candidate starting threshold is three related reports in a ten-minute bucket from at least two authenticated actors, with a separate repeated-single-actor rule for an administrator who may be the only person performing that action. These thresholds are tentative: they trade faster notification against false alarms and must be tested with classroom bursts and malicious signed-in clients. Browser reports remain labelled as reports requiring investigation even after aggregation.

Reuse the current hourly GitHub cadence initially unless faster notification is explicitly chosen. A ten-minute aggregation bucket does not imply delivery within ten minutes. GitHub scheduling is best effort. Do not automatically close a client-error incident merely because reports stop; people may have stopped trying. Require verified successful recovery evidence for the same operation/version or explicit operator resolution.

Illustrative public alert:

> HaiEdu: repeated reports of an unconfirmed writing submission
>
> Operation: writing_submit. Category: write_unconfirmed. Build: a registered HaiEdu build.
> Several reports reached the reviewed threshold. Investigation is needed; this does not establish lost work.
> The report contains no student names or submitted text.

## Explicit coverage limits

- Failures before the reporter or authentication initializes, including a completely blocked SDK or browser, cannot reliably reach an authenticated collector. Do not open an unauthenticated endpoint merely to hide this limitation.
- Offline users and blocked/failed collector requests may be unobservable. Error counts are a lower bound, not a percentage of all activity.
- The static redirect and synthetic preview are not ordinary signed-in application flows. The real school-admin, school-teacher and MFA pages need explicit bootstrap/coverage review; merely adding a handler to ux.js would leave gaps.
- Raw Auth errors, third-party CAPTCHA problems and permission-denial analysis need their own reviewed classification. They must not upload entered credentials or weaken MFA/CAPTCHA to make monitoring work.
- Public-site health, client reports and the existing main-CI check still do not prove classroom capacity, complete privileged workflows or independent monitoring availability.

These are scope decisions for the next implementation review, not silent waivers of the platform-wide consistency rule.

## Isolated verification plan

Use the existing owned local services and guarded Chromium journeys. Keep the network guard in scripts/local-staging-browser-network.mjs installed through teardown; no production URL, sign-in, email or QA workflow is needed.

- Inject a genuine owned-page exception, a rejected promise, handled 503, malformed successful response, connection loss, delayed response and invalid audio payload/playback error. Check the expected fixed report and original visible behavior separately.
- Exercise student, teacher, school-admin, master-admin and content-role consumers. Include the teacher's early-load fallback and pages that do not load ux.js.
- Verify that a successful recovery is not reported as lost work; duplicate clicks and explicit retries produce the same original business requests and no duplicate telemetry episode. Keep existing answer snapshots, revision checks and write receipts unchanged.
- Put distinct synthetic canaries in passwords, tokens, URLs, answer text, feedback, grades, uploaded filenames, headers, error properties and stacks. Assert their absence from browser requests, database rows, operator artifacts, logs and public summaries. Reject extra fields and malicious getter/serialization values.
- Test account changes, logout, revoked sessions, disabled accounts, role/tenant forgery and late responses against real local Auth/database checks. Verify private-table denial and narrow exporter permissions.
- Simulate at least 100 actors behind one shared network address, atomic concurrent admission, duplicate events, flood caps, bounded queues and expiry. Show that normal learning actions remain unaffected when the collector is slow, offline or refusing reports.
- Verify alert grouping, repeated-failure silence, operator/verified recovery, stale-build handling and refusal of unregistered build/asset values. Retain source-equivalent existing observer fault controls.
- Validate browser shutdown with reports in flight: bounded cleanup, no leaked listeners/timers, no late external requests, and no swallowed real journey failures.

The audit itself changes no runtime code. No new browser or database test pass is claimed. Existing source-equivalent main CI 43940149444 passed all five jobs, including 1,875 code tests and 702 browser checks. Future shared-boundary changes affect the twelve suites found by the current dependency map, plus any acceptance scripts that need a collector stub or new network allowance; the full sixteen paused-workflow routing audit must remain intact. Future implementation must rebuild assets/bundles, add meaningful regressions, pass the required CI, and keep production QA paused unless separately requested.

## Delivery stages and estimates

| Stage | Concrete result | Estimated active work |
| --- | --- | --- |
| Reporter and reviewed event catalog | Shared classification, build identity, lifecycle controls and semantic hooks without changed action behavior. | 2–4 hours |
| Private collector and retention | Auth/session checks, isolated admission, private aggregate storage, expiry and a narrow exporter. | 3–5 hours |
| GitHub summary integration | Reviewed payload, bounded grouping, threshold and recovery behavior using the existing destination. | 1–2 hours |
| End-to-end isolated qualification | Role journeys, privacy canaries, classroom bursts and reporter-failure/shutdown cases. | 2–4 hours |
| Reviewed release and readback | Exact checks, approved backend/configuration rollout, all affected deployed consumers verified and final record. | 1–2 hours, plus human/provider waiting |

Plan roughly one to two working days for this bounded first implementation, with the estimate refined after the event catalog and collector contract are agreed. The next useful build is the complete isolated path through to a safe GitHub summary. Live migrations, function deployment, secrets/settings and activation require a concrete reviewed rollout; none has been attempted by this audit.

## Provider documentation and hourly-monitor follow-up

Current Supabase guidance was consulted through the Supabase skill, changelog and documentation. Its [authorization-header guide](https://supabase.com/docs/guides/functions/auth-headers) distinguishes user JWTs from API keys and recommends retaining the platform JWT check for signed-in clients. [Logging guidance](https://supabase.com/docs/guides/functions/logging) describes invocation metadata and explicitly says request/response bodies are not retained automatically. Custom console logging can still expose sensitive content, so this is not permission to export raw console logs. [Log drains](https://supabase.com/docs/guides/platform/log-drains) require a paid plan and export the wider log stream; they are not the proposed starting route. The recent correlated-log improvement is useful for operator investigation but does not supply the missing browser capture or reviewed GitHub alert contract.

The November CLI breaking change affects future CLI use, not this source audit; no CLI, SDK or project upgrade was performed. The TLS-cipher deprecation does not establish an observed HaiEdu incident.

As of 17 November 2026 at 00:08 Asia/Yerevan, GitHub reports the Production failure observer workflow as active (workflow ID 420417915), but no scheduled observer execution is listed yet. Effective activation, the owner-confirmed delivery test and the automatic CI-completion execution are verified by runs 43937012240, 43937111485 and 43941671562. The first hourly scheduled execution remains an observation follow-up; absence so far is not diagnosed as a scheduler defect and no schedule setting was changed.

Production QA not run (paused by owner). Affected production QA for this documentation-only audit: none. BF-16 remains off and paid stolen-password protection remains declined. Owner usability acceptance: not applicable to this source/design audit. See the [machine-readable audit receipt](../evidence/client-failure-alerts-audit-20261117.json).
