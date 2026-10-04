# Reliability safeguards: stage 1

Date: 2026-10-04. Reviewed base: `18911dfda142767eae4bbc34ab40ebd2ffa0b48d`.

This implements the first agreed reliability slice after the dashboard observer freeze: release checks, shared-change QA routing, and reproduced observer/listener/lifecycle defects. It preserves the observer correction from PR #109, the same-user guide draft correction from PR #108, and the atomic answer-evidence correction from PR #110. It is not a claim that every platform workflow has complete acceptance coverage.

## Release controls

The CI workflow has a stable aggregate named **Platform release checks**. It runs even when a prerequisite fails and accepts only successful results from all four prerequisite jobs:

- `test`: existing core parity, favicon, Node tests and typechecking; new dependency-trigger validation and syntax checking of every browser JavaScript file.
- `role-layout-browser`: isolated native Chromium regressions under `tests/browser/*.test.mjs`, including the existing school/platform layout regressions and new content event lifecycle regressions.
- `institutional-concurrency`: existing isolated offboarding and content races.
- `phase3-postgres-17`: existing PostgreSQL 17.6 content/analytics checks and PR #110's independent-connection answer scoring test.

The release-safety tests compare the aggregate with the actual CI job inventory so an added prerequisite cannot silently be omitted. Missing, failed, skipped or cancelled results do not count as a successful release check. Dependency installation uses the committed lockfile.

### Persistent production gate: activation still required

The CI aggregate is executable and reviewable in the repository. **It does not itself prevent Vercel from assigning production domains.** The persistent GitHub-backed Deployment Check must also be configured for the project and verified before release blocking can be described as enforced.

In the HaiEdu Vercel project's Build and Deployment settings, add the GitHub check **Platform release checks** for the production target, blocking deployment alias assignment. Keep the normal automatic production-domain assignment behaviour so successful candidates can proceed. Verify that a candidate remains off the production domains while the check is pending or failing, and receives them only after success.

The connected Vercel tools available during this change could read/update an existing project check by ID but could not list or create persistent project checks. A deployment-specific check is not an equivalent replacement. No unsupported API field was used and no automatic promotion setting was disabled to work around this capability limit.

Official behaviour: [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).

## Production acceptance identifies the frontend it tests

The Vercel build writes `web/release.json` from the exact Git commit in `VERCEL_GIT_COMMIT_SHA`; `GITHUB_SHA` is the fallback for non-Vercel CI builds. Missing or malformed identity fails the build. The artifact exposes only a schema version and commit, is not committed to the source tree, and is served with `Cache-Control: no-store`.

The two existing authenticated action/analytics workflows wait for that metadata to match their `GITHUB_SHA` before starting their runners. Each request and the whole wait are bounded; errors, redirects, stale metadata and an older frontend cannot be mistaken for the intended release. The total job budgets retain their original QA allowance plus the ten-minute release wait.

The wait establishes the frontend revision at the start of QA. It does not lock production against a subsequent deployment, attest independently deployed Supabase Edge Function bundles, or turn these post-deployment checks into pre-release authenticated acceptance. The existing shared-function deployment/readback policy remains necessary.

## Shared dependency routing

`scripts/check-browser-qa-triggers.mjs` derives dependencies from the actual pages and QA runners, follows static local JavaScript/TypeScript imports and re-exports, literal dynamic imports, HTML script/stylesheet links, CSS imports, literal runner API targets, and those APIs' local backend imports. Bare relative HTML/CSS paths are included. Missing local files and missing workflow trigger coverage fail CI.

At this revision it verifies 51 action dependency paths and 23 analytics dependency paths. The workflows retain main-only execution, designated QA identities, shared non-cancelling concurrency, disposable-record restrictions, cleanup and redacted evidence. Production credentials were not added to the isolated PR checks.

Computed imports, computed URLs, remote CDN packages and new acceptance entrypoints still need explicit consumer review. The weekly/manual mobile schedule and manual two-school isolation workflow are unchanged; the action runner continues to invoke its existing isolation checks around guarded actions. The existing Sprint 15 negative-authorization PR workflow is outside this slice.

## Reproduced browser defects

| Defect | Correction | Regression evidence |
|---|---|---|
| Answer edits could re-enable Submit during an outstanding request and issue another request for the same item. | All four answer owners coalesce the pending request; shared UX respects that state. Old completions cannot update a different item/session. | Initial eight reproductions failed; expanded submission suite covers all four owners, errors, retries, stale completions and unchanged endpoint/payloads. |
| A late hint or error could appear on another question; a rejected hint request could leave the control busy. | Invalidate stale help, recheck the displayed context, and release pending state in `finally`. Retain one pending help request across context changes because the existing API has no item identifier. | Five of the initial seven reproductions failed; eleven help lifecycle cases pass. |
| Rewiring item editor rows accumulated handlers on existing controls. | Use stable handler references so native listener registration remains singular. | Option edit, option removal and misconception removal reproduce duplicate work before the fix; VM and native Chromium regressions exercise the correction. |
| Review initialization kept polling, and late session work could restart protected reads after sign-out. | Initialize from bounded DOM observation and invalidate scheduled/late work across session changes. | VM regressions cover cancellation/restart; native Chromium cases check settling, continued click responsiveness and no reads after logout. |
| An old guide catalogue response could reopen a previous guide or erase newer editing/navigation state. | Track catalogue request order and selection/draft changes before reselecting. | Eight navigation/order cases include preservation of PR #108's same-user draft behaviour. |
| A different signed-in user could retain the previous content workspace's state or receive late results. | Invalidate shared cache/request ownership and reset the affected editor, curriculum, review and evidence state on identity changes. | Dedicated workspace/editor/companion cases cover different users, same-user preservation, sign-out and stale successes/errors. |

The answer duplicate reproducer demonstrates duplicate client requests, not duplicate server grading. Server atomicity, attempt rules, scoring, remediation penalties, curriculum releases and authorization policies are unchanged.

## Affected consumers

The new answer state is owned by `index.html`/`app.js`, `practice.html`, `diagnostic.html` and `mastery.html`. Remediation is consumed by `index.html` and `practice.html`.

Shared `ux.js` has 20 HTML consumers: `admin`, `admin-security`, `assessment`, `content`, `content-bank`, `content-curriculum`, `content-evidence`, `content-guides`, `content-item`, `content-review`, `course`, `diagnostic`, `index`, `join`, `mastery`, `physics-7`, `practice`, `privacy`, `progress` and `teacher`. Only the four answer owners set the new pending marker. The global UX MutationObserver filter is unchanged.

Shared content workspace consumers are the content home, curriculum map, review queue and evidence pages, plus the item/bank editor and its curriculum companion. The home and curriculum-map renders replace their data-derived output synchronously while the shared gate is closed; the stateful consumers additionally clear retained identity state. The item editor and shared workspace use the same cached Supabase client; its shared session invalidation listener is registered before dependent page listeners.

The inspected legacy `class-join.js`, `mastery-dashboard.js` and `content-pilot-analytics.js` have no current HTML/module consumers in the reviewed web tree. They were left unchanged. No new self-sustaining observer feedback loop was found in the audited active companions; this is a bounded source review, not a proof that no other performance defect exists.

## Verification and remaining work

Focused Node suites execute actual controllers/functions with deferred network responses and bounded DOM doubles. They do not authenticate to production or establish backend correctness. Native Chromium tests use real module code, browser event scheduling and offline service doubles; they are also separate from live authenticated acceptance. Full CI and deployment evidence are recorded on the associated pull request.

Follow-up stages remain necessary for broader all-role authenticated journeys, runtime error monitoring, dependency delivery/caching resilience and a practiced recovery path. The separate watchdog/next-question request ordering risk and guide assurance/enrollment stale-result handling were recorded for bounded follow-up instead of extending this change into an unreviewed session rewrite.

The first-stage code can be verified independently. Persistent Vercel release blocking remains incomplete until the project setting and a withheld-candidate check are recorded.
