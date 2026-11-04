# Fresh production answer-recovery acceptance — 4 November 2026

Status: **first/final live recovery and completed replay verified; original aggregate failed on a strict revocation-code assertion; zero-answer Auth/isolation followup prepared**. [Run41906362478](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41906362478) ran on reviewed main8fa0d9b after all-five PR/main gates and seven exact public assets. The original failed run is retained. No production Auth, grading, runtime or schema change is required.

## Bounded scope

Use only the existing six designated synthetic QA identities, with learner B as the writer and learner A as the foreign-actor control. Read-only inventory confirms B has no sessions, attempts or mastery evidence. The already-used English practice targets reach their completion gate immediately; do not weaken that gate or consume a Mastery form to manufacture a test. Instead use B’s normal, unused registered legacy diagnostic: one retained session, its original20-item limit and its original approved40-item pool. The exact release, unit, blueprint and item allowlist are in [the scope manifest](live-answer-recovery-scope.json).

This is an explicitly subject-aware QA fixture, not a shared-core default. Synthetic responses select the first displayed choice, or0 with an ordinary unit when required; correctness is irrelevant to exactly-once recording. The retained baseline is exposed synthetic QA history, not personal attainment or a claim of an unseen form. Do not reset, delete, overwrite or abandon pre-existing learner history. The workflow refuses an existing baseline or active session and does not automatically retry a failed execution.

## Execution gates and checks

1. Merge through protected main with every required CI job passing. Dispatch only the exact main commit after all five successful main CI jobs and canonical frontend commit verification; acknowledge the manual execute input. The production credentials exist only in the manual execution step. No service key is used.
2. Preserve the shared non-cancelling QA queue, run54 isolation controls before and54 after, verify all six signed-in IDs against the designated fixture, and close only this execution’s Auth sessions.
3. Create one new normal diagnostic. Drive the deployed diagnostic document/controller at390px. The browser request guard permits only the owned session/item and approved pool; help, Mastery, unrelated writes and unobserved telemetry are denied.
4. Forward the first and final answer requests to the real server, confirm HTTP200, then discard the reply. Check Armenian uncertainty text, locked inputs and explicit normal Retry. Verify the identical payload restores the original attempt and frozen response; evidence/counters must remain unchanged on retry.
5. Complete exactly20 answers. Replay the completed final answer, conflict with a changed payload, attempt recovery as the other QA learner, and revoke only the writer’s own Auth session before checking recovery denial. Never replay an unknown mutation automatically.
6. Inspect redacted JSON and QA screenshots. Independently SELECT production state: one completed20-answer diagnostic,20 unique attempts,20 saved receipts, no duplicate session-item attempts, and no changes to A’s pre-existing session/attempt fingerprints. Mastery changes must be bounded to those original synthetic answers. Retain the diagnostic/attempts/receipts and all failed-run evidence.

If interrupted after session creation, inspect the saved own-session ledger and production state before any continuation. The fresh-run workflow intentionally refuses existing work; no database reset or blind rerun is permitted.

## Separate review

Technical verification does not grant John’s usability acceptance. For BF-05, review Teacher skill detail with Practice first and Diagnostic/Mastery/Review separate; expand additional results and context/provenance; then check School Admin and Master Admin class/year/programme/chapter scope. Different original contracts/builds remain separate unless equivalence is demonstrated. B.12.3/B.12, EnglishC47, full S2, independent review and deferred BF-02 recovery are unchanged.

## Executed result and bounded followup — 5 November Asia/Dubai

Both committed response losses (positions1/20) recover the identical immutable request, original attempt/frozen response and unchanged mastery/counters through normal UI Retry. The completed final replay, changed-payload409 and foreign-learner409 checks also pass. Independent database readback confirms one completed20-item diagnostic,20 distinct attempted slots/attempts and20 valid saved receipts; no extra attempts exist, both evidence counters total20 and the other designated learner’s full session/attempt fingerprints are unchanged. All six own main Auth sessions close with204. [Sanitized execution receipt](../evidence/live-answer-recovery-20261105.json).

The original aggregate is103/104, **failed**, because its last Auth check required only403. Actual revoked-session recovery returned401. The deployed handler checks `auth.getUser()` before its application live-session check, so rejection can occur at either boundary; the test must permit only401 `unauthorized` or403 `account_or_session_inactive`, each with exactly one error field and no feedback. This matches [Supabase’s server-side Auth guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) and the deployed source. The original denial body was not captured, so its safe shape is not retrospectively claimed.

The new optional `followup_run_id=41906362478` is pinned to that completed original report/source, its20 unique attempts, both recoveries, the one known failure and six acknowledged closures. It authenticates the same designated actors, verifies the same completed baseline, and sends an intentionally incomplete no-answer request. A valid session must reach400 missing-answer validation; after only its own local signout, the identical probe must return one of the exact safe Auth denial bodies. Because it has no item/response, even unexpected authentication success cannot grade anything. It runs54 isolation controls before and54 after and closes only its own Auth sessions. It cannot start a learner session, consume a form, resume answers or reset history. Ordinary fresh execution continues to refuse the completed learner.

The original postflight54 controls and terminal zero-page-error/blocked-request assertion were not reached after the strict-code failure. They are not marked passed. The followup supplies new Auth/isolation evidence; the two original successful UI recoveries retain their own scope. No blanket zero-browser-error or personal usability certification is claimed.
