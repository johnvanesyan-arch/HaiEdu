# BF-08 hint state recovery

The bug register's two-tab case reproduced through the isolated Edge handlers and database. Two requests for the same displayed state both succeeded, consuming levels 1 and 2 and creating two events. The legacy page also sent an empty body, so a stale tab could select the session's current item instead of its displayed item.

## Change

- Current clients send the exact session and item IDs, last known hint level and whether the learner has an accepted wrong answer. The governed operation verifies authorization before comparing the state under its session lock. The shared recorder checks the current phase, item position and level in the transaction that records the event.
- Only the known stale-state database error maps to HTTP 409 `hint_state_conflict`. An unexpected failure remains HTTP 500. Opening the refresh action retrieves authorized session state without consuming another hint. A draft stays in place when the same item remains active.
- Help stays available during Practice and Chapter Review, including after an accepted wrong answer on the active question. The panel takes focus when it opens. Refresh, subsequent help and the next action follow it in reading order. Assessment and correct-answer help restrictions apply. Legacy input already entered before submitting still hides pre-answer help.
- Open tabs on an earlier archived bundle retain their API compatibility. The expected-state check needs the current bundle, which sends the state the learner saw. No grading policy, guide content, learner history or assessment definitions are migrated.

## Verification

- The isolated Edge and SQL regression recorded one hint and returned one conflict for two same-stage requests. A forced SQL check violation with the same message returned HTTP 500 and rolled back the level. The test also covers another learner, an invalid level, a wrong answer between hint requests and help after advancing.
- Legacy controller tests cover pending duplicate activation, late replies and failures, account and item changes, draft input, distinct retry/refresh behavior and post-answer help.
- Native Chromium regression covers two tabs, a preserved draft after refresh, the opened hint's focus and keyboard access to the next action at 390 CSS pixels and 200% root text. The local container denied Chromium's socket creation. Hosted CI is required.
- The immutable asset build and workflow dependency checks pass locally. Production requires the migration, exact source readback for every consumer of the changed Edge module, CI and the canonical production checks. B.12.3 stays open for owner usability acceptance. BF-02 remains deferred.

## Backend rollout

The [reviewed backend candidate](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42264505784) passed all five required jobs, including 511 Chromium tests and the two-tab regression. The [answer-recovery follow-up](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42264968797) passed all five jobs with the lost-answer-reply case. Its backend bytes are identical. The earlier PostgreSQL job exposed a fixture that included diagnostic context in the primary error message. The earlier Chromium run exposed stale selectors for Next and a test that selected the diagnostic session. The corrected runs retain the original regressions and assertions.

On 6 November 2026 the shared Edge module and help endpoint were rolled out and read back before the SQL was applied. All 82 source files across the nine bundles matched the candidate byte for byte. Every function retains gateway JWT verification.

| Edge Function | Previous version | Verified version |
| --- | --- | --- |
| get-chapter-mastery-lifecycle | 8 | 9 |
| get-mastery-check-status | 16 | 17 |
| get-remediation-help | 17 | 18 |
| get-session-item | 21 | 22 |
| get-student-classes | 14 | 15 |
| record-recommendation-event | 8 | 9 |
| start-learning-session | 28 | 29 |
| submit-answer | 23 | 24 |
| submit-mastery-answer | 12 | 13 |

The migration ledger has one `hint_state_recovery` entry at `20261106175539`. The checked-in filename uses that assigned version, with the tested SQL unchanged (SHA-256 `8d4c7aef35c9e2c90656b459ead78639c643abc2d109f780095e1a1a3550d307`). The live recorder and governed wrapper body digests are `a1300cc87e38560303ebe18e61467e99` and `6683c60837e237b31d88c0369f54ef7a`. Their invoker/definer settings, empty search paths and service-role-only execute privileges matched the preflight. This migration replaces function definitions and does not write learner records.

Vercel's persistent GitHub check `Platform release checks` was read back in Production with Blocking selected. Final frontend CI and production verification are tracked on [PR430](https://github.com/johnvanesyan-arch/HaiEdu/pull/430).

## Production verification

[PR430](https://github.com/johnvanesyan-arch/HaiEdu/pull/430) merged at `beb26011cf298f459d9002cc9f3c2dfe92e675c1`. [Main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338724) passed all five jobs, with 1,780 unit and integration tests and 511 native Chromium tests. The 390 CSS pixel and 200% text regression exercised two-tab recovery, a preserved draft, recovery of a lost wrong-answer reply, post-error help focus and keyboard access to Next. The legacy controller tests also verify that account changes suppress stale responses and a stalled sign-in read cannot dispatch after the deadline.

Vercel deployed `dpl_2ERxCiBwB6zPuub17njJxELx1caD`. The canonical commit and browser manifest matched the reviewed source, with exact hashes and expected cache headers for all 29 rendered pages and 122 current assets in build `4a0ff2c548195f7960c3bd19baaf7cefc47169bea01c36c4f2b8cdc0e4c6fc2b`.

All 13 authenticated production suites passed on that commit. The first Chapter VI attempt stopped at the artifact preflight during the deploy transition. It reported a mismatch for `content-bank.html` before signing in. Full canonical verification passed after the transition, and the same Chapter VI run passed 324/324 checks on attempt 2.

| Production suite | Run | Accepted attempt | Result |
| --- | --- | --- | --- |
| Chapter II pilot read acceptance | [42267338748](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338748) | 1 | Passed |
| Chapter III pilot read acceptance | [42267338774](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338774) | 1 | Passed |
| Chapter IV pilot read acceptance | [42267338618](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338618) | 1 | Passed |
| Chapter V pilot read acceptance | [42267338620](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338620) | 1 | Passed |
| Chapter VI pilot read acceptance | [42267338614](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338614) | 2 | Passed |
| English Unit 1 pilot read acceptance | [42267338751](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338751) | 1 | Passed |
| English Unit 2 pilot read acceptance | [42267338757](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338757) | 1 | Passed |
| English Unit 3 pilot read acceptance | [42267338646](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338646) | 1 | Passed |
| Mobile browser QA | [42267338743](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338743) | 1 | Passed |
| Resource assignment production acceptance | [42267338630](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338630) | 1 | Passed |
| Sprint 14 authenticated action QA | [42267338703](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338703) | 1 | Passed |
| Sprint 14D authenticated analytics QA | [42267338826](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338826) | 1 | Passed |
| Teacher feedback production acceptance | [42267338692](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42267338692) | 1 | Passed |

The live suite results establish production coverage on the released source. The two-tab race and lost-answer-reply checks use isolated fixtures. B.12.3 remains open for the owner's usability acceptance.
