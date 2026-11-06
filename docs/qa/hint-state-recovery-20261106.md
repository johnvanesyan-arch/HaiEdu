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
