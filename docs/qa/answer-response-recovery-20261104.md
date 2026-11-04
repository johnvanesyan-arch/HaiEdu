# BF-04 — Saved answer response recovery

**2026-11-04 — Branch candidate; not merged or deployed.** Report aliases P3:N1/N2/N3 map to UX-ANSWER-RECOVERY-01. Production remains main `7b88f1b18db4571f87b4eb7e120e12d6a584ffc6`. This is shared core recovery with the existing registered legacy adapter retained; it adds no subject-specific rule to the core.

## Reproduction and resulting behavior

An actual legacy answer handler backed by isolated SQL accepted an answer, but an identical retry returned HTTP409 (`409 !== 200`) after the original reply was discarded. The saved attempt remained. The new handler returns the original saved feedback and progression without another attempt or mastery update. Governed answer transactions now store the complete result with the answer; legacy recording freezes the committed grade/mastery/session core, then one finalizer stores the first completed API response and its recommendation issuance. Partial response builders resume from that core without grading again.

Receipts are keyed by assigned session item and endpoint kind, private, immutable after finalization and inaccessible to client/service roles directly. Service-only functions recheck the live Auth session and owned learning context. Exact payload comparison includes response, timing and governed draft revision. Changed requests return409; revoked/context-ineligible callers receive no saved feedback. Completed final-item results can replay. Concurrent builders serialize on the same session/item. Legacy recommendation issuance stays optional; a failed issuance is frozen as null and not retried. An already-issued recommendation during the SQL-before-Edge rollout window is reused.

All five answer interfaces keep an immutable pending request, deduplicate a running submit and retry only on explicit learner action. The shared caller has a15-second end-to-end deadline, aborts the SDK call, bounds identity/error-body reads, ignores stale results and presents Armenian recovery messages. Unknown outcomes lock answer fields and retain the same payload for Retry; terminal conflicts offer Reload. Assessed-audio calls retain their explicit longer budgets. Diagnostic/Mastery deferred feedback remains deferred. No grading formula, threshold, saved pass result, content approval or curriculum release changes.

## Affected consumers

| Layer | Complete audited set |
|---|---|
| Browser answer interfaces | `web/app.js`, `web/practice.js`, `web/diagnostic.js`, `web/mastery.js`, `web/learning-player.mjs` |
| Shared form synchronization | `web/ux.js` respects uncertain/blocked state |
| Changed answer handlers | `submit-answer`, `submit-mastery-answer` |
| Every importer of changed governed helper | `submit-answer`, `submit-mastery-answer`, `get-student-classes`, `start-learning-session`, `get-remediation-help`, `record-recommendation-event`, `get-chapter-mastery-lifecycle`, `get-session-item`, `get-mastery-check-status` |
| SQL | New migration `20261104070205_answer_response_recovery.sql`; two original service implementations moved to private delegating cores; one new service-only receipt API |

Five explicit workflow dependency paths are extended; the static trigger audit passes for every designated acceptance flow. Existing shared QA lock, `queue: max`, source/fixture guards and all five required release jobs remain.

## Verification and limits

- Full local suite:1,693/1,693 passing, zero skipped/cancelled before two added cases. CI41796404966 on5cd711d passes1,695/1,695. The final current-head aggregate is linked from [PR401](https://github.com/johnvanesyan-arch/HaiEdu/pull/401); prior passing jobs do not substitute for it.
- Actual pinned FunctionsClient:6/6 passing, including lost/stalled replies, immutable retries, one in-flight call, stale actor/context and Armenian error redaction. Existing four-interface ownership tests:30/30 passing.
- Actual Edge handlers with PGlite receipt SQL cover legacy and governed recovery, two governed subjects, completed Diagnostic/Mastery results, payload conflicts, revoked Auth, immutable storage, privacy/cascades and rollback. All13 focused cases pass locally, including issued-event reuse and server-owned help versus ignored client hint flags. Final legacy Mastery rendering uses its frozen lifecycle/result without an extra status read.
- Native CI41797331239 on0ab3529 passes414/414, including all six new cases: four production legacy submit callbacks in native DOM with pinned SDK/actual Edge/SQL, plus two real governed-player lost/stalled response cases. Legacy startup/Auth/course inputs are synthetic; these are not full signed-in production journeys. No local Chromium is installed; these results are native CI execution.
- All eight independent-connection PostgreSQL17.6 races pass in CI41796042949, before a separate handler-harness failure. The latter incorrectly inferred scalar normalized JSON as an integer and opened unused governed SQL bridges; explicit jsonb binding and fixture-owned connections correct those test adapters. Final current-head CI must verify all13 receipt/handler cases and the complete PostgreSQL job. The recovery step has a three-minute ceiling and explicit fixture/lock waits. Two superseded PostgreSQL jobs remained running after their assertions; cancellation of the second was rejected by automatic approval review, so no further cancellation was attempted. The original failures remain visible. Local psycopg/pgserver was retrieved later, but the local runtime cannot create the required unprivileged server account or change process groups; no local PostgreSQL execution is claimed.
- Typecheck, five-module core parity, dependency-trigger coverage and whitespace checks pass. The initial full-suite fixture failures (missing injected helpers) were corrected; baseline Diagnostic prerequisites still deny before answer processing.

Historical answers without a receipt cannot reconstruct frozen original feedback: return an explicit unavailable/conflict outcome without fabrication or regrading. For a legacy core committed before its full response exists, later response construction preserves frozen grading/mastery but cannot promise a historical HTTP response that never existed. Sessionless legacy calls retain their prior semantics and have no automatic retry UI. BF-37's unrelated Actions dashboard HTTP0 root cause remains open.

## Release prerequisites and ordered handoff

**Main protection configured:** active ruleset26520838 now protects main with PR-only changes, strict GitHub Actions aggregate checks and no force push/deletion or bypass. [Actual readback](main-branch-protection-20261104.md). **Held:** BF-02 tested recovery and applicable risky-change review. The initial, pre-configuration GitHub reads showed `main.protected=false` and repository rulesets `[]`; those are retained as the original finding. Supabase is ACTIVE_HEALTHY on PostgreSQL17.6.1.166, but that does not prove backup or restoration. The backup UI redirected to sign-in; no backup/drill evidence was obtained. Do not infer that backups are absent. No production SQL, Edge deployment, learner write, merge or promotion occurred for BF-04.

1. Retain verified main protection and obtain a usable backup with an isolated restore drill. Keep CODEOWNERS/independent risky-change review separately tracked; branch rules do not establish human review or waive it.
2. Require all five current-head PR jobs including native browser and PostgreSQL17 races. Review the new private receipt storage and service-function wrapper signatures against the intended production bodies.
3. Prepare the exact SQL delta and preservation/readback manifest; do not replay the unmatched legacy migration ledger. The Supabase CLI could not be retrieved in this environment, so the new UTC timestamped migration filename was prepared manually; no historical migration was edited or renamed.
4. After release gates permit it, merge and require main CI. Apply this one additive migration, then deploy all nine audited Edge consumers and read back every changed bundled dependency. SQL precedes Edge; keep the compatibility window bounded and verify no overlapping old builder is treated as historical exact feedback.
5. Verify the persistent Vercel Production/Blocking deployment check separately, then intended frontend commit and all changed public assets. A READY deployment alone is insufficient.
6. Run guarded designated-fixture acceptance for lost reply/final item, ordinary progress and isolation, with own-record cleanup. Preserve original failed evidence. Update the register/Notion to the merged source and only then record live closure; owner usability/content/security and EnglishC47 gates remain independent.

The private JSON adds per-answer storage (core plus frozen response for legacy). Foreign-key indexes support ownership/cascade paths. Retention follows deletion of the owning session/item/attempt/profile; no TTL or extra learner-history erasure is introduced. Monitor receipt growth after authorized rollout. Future replacements of the two service functions must retain recovery wrappers.
