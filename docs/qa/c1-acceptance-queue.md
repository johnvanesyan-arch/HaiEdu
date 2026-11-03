# C1 — preserve the shared acceptance queue

Prepared 3 November 2026 against `2ebb84f8b5d03a0afc23e86ec3a53399de7bf8c2`. Repository-only change; no production workflow was dispatched, merged or deployed.

## Finding and choice

All 19 acceptance workflows use the same `QA_TENANT_FIXTURES_JSON` registry and subsets of the same six `QA_SCHOOL_{A,B}_{ADMIN,TEACHER,STUDENT}` credential names. The isolated read runner also signs in and closes its own sessions (`scripts/sprint-14-isolation.mjs`, around lines 98–101 and 137–138). Other suites create and clean up designated mutable fixture records; for example resource assignments exercise withdrawal, and teacher loading rollout runs `sprint-14-actions.mjs`. `scripts/check-browser-qa-triggers.mjs` deliberately enforces the shared serial lock. Therefore independent groups would remove an existing account/environment isolation control.

The supplied brief accurately describes GitHub's **default** one-pending-run cancellation, but its two implementation choices omit a newer native option. GitHub announced larger concurrency queues on [7 May 2026](https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues/). Its [current documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency#example-queueing-multiple-pending-runs) supports:

```yaml
concurrency:
  group: sprint-14-isolation-qa
  queue: max
  cancel-in-progress: false
```

**Choice: retain shared serialization and enable `queue: max` in all 19 workflows.** This is smaller than introducing an orchestrator, preserves each suite's push/path/manual/schedule entrypoints and keeps the shared mutable accounts isolated. Only one run holds the group at a time; up to 100 pending runs wait rather than replacing one another. Dispatch order is not guaranteed, and a full 100-run queue can still reject additional runs. This change does not promise an unbounded queue or that stale frontend commits will pass the existing exact-source gate.

No workflow jobs, credential references, permissions, timeouts, reviewed-main checks, activation guards, exact-production-source waits, artifact paths, cleanup or test commands change. Manual-only learner acceptance stays manual-only. Sanitized mobile receipts remain the only mobile artifact; raw screenshots/traces/authentication files are not restored.

## Validation and remaining owner action

The dependency checker now enforces the serial group, explicit non-cancellation and expanded queue for every workflow using the designated fixture registry, including manual-only suites. Browser path-trigger checks retain their main-only and exact-source guards. Regression cases reject absent/single queues, split groups and cancellation, including a manual-only fixture workflow.

Focused validation: 13 trigger/concurrency tests pass and all 19 fixture workflows pass the queue check; all 12 covered browser graphs retain their complete dependency paths. `npm run typecheck` and the full `npm test` suite pass: 1,661 tests, zero failures, skips or cancellations (Node 24.22.1 locally). Current-source GitHub CI, including its Node 22/browser/PostgreSQL jobs, remains a separate merge requirement. These are local static/executable checks, not a GitHub scheduler or authenticated production run.

After owner review/merge and the required CI gates, the owner should verify that the triggered main-branch suites wait/run under the common group rather than cancelling each other. Each suite's `workflow_dispatch` remains available. Then re-run **Mobile browser QA** twice on the same reviewed deployed main commit, as C2 requires, retaining sanitized receipts and any actual failure separately. Do not reintroduce the obsolete Playwright auth setup or sensitive failed-run recordings.

B.12.3/B.12, owner usability, the English C47/subject-expansion pause and all independent release/content gates remain open. This patch prepares C1; its scheduler acceptance and C2 remain unverified until the owner-run main workflow evidence exists.
