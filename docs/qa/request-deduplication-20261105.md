# BF-07 — request measurement and isolation

Date: 5 November 2026. Status: implemented in draft PR421; corrected final-head CI, deployment and production acceptance remain open. BF-02 remains deferred. This report does not close independent review, account/evidence publication, owner usability, content or BF-37 transport gates.

## Baseline and measured change

The baseline is main `071e5e5d6feabef1a3ea55fd9763620b1a69932e`, including PR412–419 student Home, course and My work changes. Test-only commit `7a9841875c8c4a0d04be3a8431b452550000c17f` passes all five jobs in [CI42081822366](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42081822366), including 489 native Chromium tests. The request fixture loads the real HTML/modules with synthetic accounts/services and a fixed 60ms service delay. It waits for startup timers and settled requests. Counts are service invocations, not all network resources or a WAN latency benchmark.

| Native path | Baseline | First implementation | What is removed |
| --- | ---: | ---: | --- |
| Home with a selected course | 4 | 2 | Two redundant access-list reads; navigation and selected-course dashboards remain |
| Course entry | 4 | 2 | Three access reads become one; contextual dashboard remains |
| First governed practice question | 7 | 5 | Same two access duplicates; start, bound policy and item reads remain |
| Teacher class → assign writing | 3 | 2 | Repeated class-detail read; directory and freshly authorized catalog remain |
| Legacy practice with an active session | 5 | 5 | No duplicate observed in this fixture; keep its dashboard/status/lifecycle/item and one navigation read |

The first implementation is `308ca69b359b4d8d41329d2699d1e5934f1a1b35`. Its [CI42084005661](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42084005661) passes 1,769 unit/integration checks but fails nine native cases (489/498). Those failures are retained, not acceptance: six expose sign-out/stale-session repaint handling, one compiled test still expects the deliberately removed Home request, and two new fixture cases need a precise selector and explicit pending join read. The corrected candidate prevents reloading signed-out course content and rejects an SDK snapshot contradicting a newer Auth event. Final native verification remains required.

The first-question causal chain remains five required stages: access → dashboard → start → bound policy → item. The trace's `wave` field counts overlapping busy intervals, so baseline duplicate reads can make consecutive stages appear in one interval; it is not a latency or dependency-depth result. No production learner answer/recovery write is performed for measurement.

## Implementation and consumer audit

- `learner-access.mjs` shares only a pending access-list read for one SDK client and account/token generation. Settled successes and failures are discarded. Auth changes, token refresh, explicit access refresh, successful join, page departure and persisted restoration invalidate pending work. Old completion cannot remove a replacement promise. A contradictory late SDK snapshot fails closed.
- `app.js` owns Home navigation; `course-page.js` owns course navigation. `course-gate.js` no longer independently fetches those owners' data. Its extension check remains on compatibility pages. Course context uses the exact enrollment/release/unit; contextual dashboards and answer writes are not globally cached.
- `home-class.js` uses the shared read with response fencing, a settling observer and neutral course copy. Its legacy visible-card path is covered separately from modern Home, where it is hidden. `join.js` keeps one pending mutation, invalidates access after success, verifies membership with a post-mutation read and fences late success/redirect against account changes.
- Same-account token rotation preserves active course input and does not start a second learning session. Navigation is reauthorized; revoked access clears work. Sign-out/account changes clear private evidence immediately. Browser history and persisted restoration reread access. Pending writing flushes cannot resume a superseded view.
- Teacher pending-read keys now include Auth generation, and old completion clears only its own entry. `teacher-review.mjs` uses the existing shared dashboard reader for directory/class reads.
- One in-page class→review/assign-writing transition may hand off only the current class's selector labels and exact assignment/release/unit. The handoff is consumed once and requires unchanged actor, Auth generation and dashboard generation. It excludes roster, analytics and permission flags. It is not a fulfilled authorization cache: catalog, review queue and every action authorize freshly on the server; direct entry, history entry, changed context and token rotation require a new class read.
- Shared shell imports cover student Home, course and compatibility pages; the teacher dependency bundle is rebuilt from canonical sources. QA dependency closure includes the new helpers. Existing immutable assets/releases are retained, and the current compiled manifest is regenerated. No subject, grade or curriculum is privileged by these helpers.

Coverage includes native account switch/sign-out, token refresh with active answer, access revocation, history navigation, persisted-page restoration, pending pre-join access, single join submission, stale join/redirect, legacy observer behavior, teacher denial and token-bound context handoff. Existing actual-service/SQL authorization and two-school isolation tests remain in the required gates. Synthetic UI tests do not replace signed-in production acceptance.

## Pre-existing production failures retained

All 13 production suites for baseline071 finished before advancing main. Seven failed and six passed. English Unit2 run42073819463 (108/109), ChapterV42073819511 (173/174), ChapterII42073819643 (85/86) and additional ChapterIII/VI runs retain preservation failures. ChapterIV42073819881 separately fails the learner-A own-enrollment control403 and its local Auth closure403 at18:14UTC; those failures have not been reclassified as a preservation or transport failure. The bounded read-only investigation finds 24 ChapterII answers by designated learner A between17:44:14 and18:12:43 UTC, with respectively1,2 and3 answers inside the first three named run windows. These are concurrent fixture activity, not BF-07 writes; no answers, sessions or history are deleted or restored. A fresh stable-fixture pass is still required.

Resource run42073819609 retains204/207: its guard blocks PR419's new `get-student-work` inbox request during writing delivery. The updated guard admits only a designated student POST with exact `{action:'inbox',payload:{state:'current'|'history'}}`; staff, writes, extra identity/context fields and widened payloads remain rejected. PR419's merge record reports its Edge deployment; BF-07 neither deploys nor changes that endpoint. Existing compatibility open attributes remain available on the combined list. All run-owned resource/delivery cleanup and six local Auth session closures204 succeeded.

## Remaining delivery checks

1. All five required jobs, including native Chromium and `Platform release checks`, must pass on the corrected final PR head and merged main.
2. Verify canonical `release.json`, current compiled manifest, changed page/chunk bytes and cache policy against the exact merged source.
3. Keep that source fixed while the production acceptance queue runs. Inspect failures and owned cleanup; retain prior failed receipts. Do not change existing learner evidence to make preservation checks pass.
4. Update authoritative project status, roadmap, backlog, README, defect register and Notion from the verified merged source. BF-08 follows BF-07 technical closure; existing owner/input gates remain separate.

Machine-readable baseline, counts and retained failures: [request-deduplication-20261105.json](../evidence/request-deduplication-20261105.json).
