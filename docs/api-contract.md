# Learning API contract

**Verified:** 2026-10-10 against repository source and deployed `submit-answer` v18 (ACTIVE, JWT verification enabled; all 12 bundle files match). [Verification evidence](evidence/documentation-status-audit-20261010.json). [Current delivery status and release gates](project-status.md) are maintained separately.

This replaces the standalone `submit-answer v0.1` example with the current session workflow and retained legacy behavior. It does not authorize a new release or claim completed live multi-context acceptance.

## Chapter II content boundary — 2026-10-13

The 192-question Chapter II bank now has **189 approved current versions and three editorial v3 revisions awaiting review**, with **263 active definitions** and **57 published runtime guides, three with new authoring v5 drafts**. Earlier approvals and immutable history are preserved. [Editorial handoff](chapter-ii-editorial-corrections-20261013.md) and [production evidence](evidence/chapter-ii-editorial-production-20261013.json). Content counts do not enable learner delivery: the release remains `draft`, has no activation timestamp and has zero pool/form memberships. No API/runtime code, scoring or delivery contract changed.

The versioned maintenance transaction changed three existing question rows and two option texts, appended three immutable item snapshots and three guide drafts, and stored three actor-null technical QA records. Guide runtime rows, answers, mappings, human review records, releases and allocations are unchanged. The exact deployed `manage-content-quality` v11 evaluator and guide v10 helper pass through a read-only catalogue replay plus production SQL readback; this does not claim a new authenticated live Edge/browser acceptance run. Reviewers use the existing content and guide workflow to approve/publish the new versions.

The earlier [shared RLS repair](direct-question-read-protection-20261013.md) continues to deny direct anonymous/student question reads; governed endpoints retain server-side delivery. Its role probes and unchanged-table proof describe that repair's scope. Historical prompt exposure still requires a disposition before protected assessment use.

## Authentication and workflow

Use `POST /functions/v1/<function-name>`, `Content-Type: application/json` and the signed-in learner's `Authorization: Bearer <access_token>` through the configured Supabase client. The server verifies the user and live account/session. Never put service-role credentials or answer keys in a client. `OPTIONS` is the CORS preflight; unsupported methods return 405.

1. For governed contexts, obtain authorized choices through `get-learning-context`. Call `start-learning-session` with `enrollmentId`, `curriculumReleaseId`, `unitId` and `mode` (`diagnostic`, `practice`, `mastery_check` or `chapter_review`). Optional `targetSkillId` and `recommendationInstanceId` must be UUIDs. Context, frozen blueprint and published policy must be valid. A matching active session resumes before a new session is allocated.
2. Call `get-session-item` with the returned `sessionId`. Keep the returned `sessionItemId`, item identity, response type and displayed options together. Serving records exposure.
3. Use `submit-answer` for Diagnostic, Practice and Chapter Review. The Mastery client uses **`submit-mastery-answer`**, which enforces the Mastery mode contract. Submit the identities of that served item.
4. Continue through the session APIs and their completion/lifecycle response. Help uses `get-remediation-help` and is unavailable in Diagnostic/Mastery assessments. Retry availability is decided by the server's lifecycle policy.

The registered `legacy-physics7-u01-v1` adapter retains the existing Chapter I clients, including start requests without explicit context selectors. This is a scoped compatibility path, not the contract for new contexts. Governed answer requests derive enrollment/release/policy identity from the immutable session binding; they do not accept context selectors or client scoring rules.

`get-practice-item` is retired: an authenticated POST passing its live-session checks returns **410 `legacy_practice_delivery_retired`**. It no longer delivers assessable items. Unauthorized/inactive-session requests retain their authorization errors. Replacement: `start-learning-session` then `get-session-item`.

## Answer request

Illustrative single-choice request; substitute UUIDs returned by the session APIs:

```json
{
  "sessionId": "<session UUID>",
  "sessionItemId": "<session-item UUID>",
  "itemId": "<item UUID>",
  "response": { "value": "B" },
  "responseTimeMs": 18400,
  "hintUsed": false
}
```

| Field | Contract |
| --- | --- |
| `sessionId` | Required UUID for governed submission and the current client workflow; identifies the learner's authorized session. |
| `sessionItemId` | Required UUID for governed submission; belongs to that session and matches the served item. |
| `itemId` | Required item identity; cannot substitute for session-item identity. |
| `response` | Required object. Single choice uses the displayed option key in `value`; true/false uses a boolean `value`. |
| `responseTimeMs` | Optional response-time metadata, not a scoring instruction. Current clients may send `null`. |
| `hintUsed` | Compatibility field. Session-bound grading derives assistance from persisted server help state, not this boolean. |

The governed answer router allows only these six top-level fields. Extra keys return `invalid_session_request`. Its current scorer supports **single choice and true/false**; numeric/quantity grading remains available through the declared legacy adapter. A core module supporting a format does not enable it in a governed policy/runtime.

Single-choice `A/B/C/…` values are **presentation positions**, not canonical authoring keys. The served option presentation is persisted and stable on refresh/resume. The server resolves the selected position through the private session-item mapping before grading. Never reconstruct canonical order or reuse a presentation key from another exposure. Protected keys and private mappings are not returned.

## Success responses

Success is HTTP 200; fields vary by mode and adapter. These are response descriptions, not interchangeable fixed schemas.

| Flow | Response behavior |
| --- | --- |
| Governed Practice / Chapter Review | `attemptId`, `itemId`, `skillId`, session/release/blueprint identity; `grading` (`correct`, `score`, `errorCode`, `feedbackCode`, `usedHelp`); `mastery` (`score`, `evidenceCount`, `status`); policy-scoped `recommendation`; nullable `chapterReview` lifecycle result. |
| Governed Diagnostic / Mastery | `accepted: true`, `revealCorrect: false`, `attemptId`, learner-safe `session`, release/blueprint/provenance identity and nullable `finalResult`. No per-item `grading` object; session correctness is withheld during assessment. Completed Mastery may return `finalResult` containing `passed`, score totals/percent, `passCriteria`, `skillResults` and lifecycle. |
| Legacy Mastery via `submit-mastery-answer` | The active Chapter I client receives only `accepted: true`, `revealCorrect: false`, `session` (`status`, `planned`, `answered`) and nullable `finalResult`; it does not receive top-level `attemptId` or release/blueprint/provenance identities. On completion, `finalResult` contains `passed`, `score` (`correct`, `answered`, `percent`), `passCriteria` (`overallPercent`, `minCorrectPerSkill`), `skillResults`, `failedSkills` and `lifecycle`. This adapter retains 80% overall plus one correct per skill; these are not governed platform defaults. |
| Legacy Diagnostic via `submit-answer` | `accepted: true`, `revealCorrect: false`, `attemptId`, release/blueprint/provenance identity and session summary. No per-item `grading` object. The legacy summary still includes `correct_count`; it is not the governed learner-safe projection. |
| Legacy Practice / Chapter Review via `submit-answer` | Grading/mastery/recommendation with provenance, optional session counts and `remediation` (`helpWasUsed`, `independentCheckNeeded`, `helpAvailableAfterMistake`, `messageHy`). Completed Review can include `chapterReview` and `reviewCoverage`. These legacy-specific fields are not promised by governed answers. |

Recommendations and criteria come from the bound policy/model and authorized context. Do not hard-code Chapter I quantities, Chapter II Option B criteria or one recommendation action into shared clients. Content approval and an assessment plan do not create a session binding.

## Duplicates and failures

Answer recording and mastery evidence use transactional RPCs. Session-bound `submit-answer` and governed Mastery reject repeated answers with **409 `session_item_already_answered`**; they do not promise an idempotent cached HTTP 200. Legacy Mastery wraps an upstream duplicate error as `grading_failed` with `detail: "session_item_already_answered"`, retaining HTTP 409. A completed session can instead return `session_not_active`. After a timeout or ambiguous error, reload session state before another submission: a write may have committed before a later response/read or Mastery finalization failed. Preserve the served item identity; do not allocate a new identity to bypass duplicate protection.

Errors use `{ "error": "<code>" }`. Representative mappings, not an exhaustive list for every endpoint:

| HTTP | Code / condition |
| --- | --- |
| 400 | Governed validation: `invalid_context_selection`, `session_context_required`, `session_item_required`, `answer_required`, `invalid_session_request`. Legacy validation: `itemId_and_response_required`, `sessionId_and_sessionItemId_required`, `invalid_option_presentation_key`. |
| 401 | `unauthorized` — missing or invalid authenticated user. |
| 403 | `account_or_session_inactive`; governed `learning_context_unavailable` for authorization, unsupported/unavailable context or unexposed internal failures; legacy `course_access_required`. The governed router does not expose raw SQL/tenant details. |
| 409 | Governed policy/state errors include `assessment_policy_unconfigured`, `chapter_diagnostic_required`, `skills_not_ready`, `mastery_check_not_allowed`, `chapter_review_not_available`, `session_item_already_answered`, `session_not_active`, `invalid_option_presentation_key`, `help_not_available_in_assessment`, `remediation_guide_missing`. Legacy session errors include `session_not_active`, `session_item_mismatch`, `session_item_already_answered`. |
| 404 | Legacy published item lookup: `item_not_found`. |
| 405 | `method_not_allowed`. |
| 410 | Retired `get-practice-item`: `legacy_practice_delivery_retired`. |
| 500 / 503 | Configuration/storage/service failures, including `server_not_configured`, legacy `attempt_record_failed`, governed `learning_context_service_unavailable` or unavailable legacy curriculum release. These do not authorize choosing another release or writing directly. |

## Legacy endpoint compatibility

**Legacy Mastery is always session-bound.** It requires `sessionId`, `sessionItemId`, `itemId` and `response`, checks owned active Mastery mode, and forwards grading to `submit-answer` before finalizing the completed assessment. Its distinct errors include 400 `missing_required_fields`, 404 `session_not_found`, 409 `not_mastery_check` / `session_not_active`, and 500 `session_refresh_failed` / `submit_mastery_answer_failed`. Upstream failures retain their HTTP status but use `{ "error": "grading_failed", "detail": "<upstream error>" }`; the outer 500 catch can also include `detail`. Clients must not assume the governed error projection applies to this wrapper.

Legacy `submit-answer` still accepts `itemId` and `response` without session IDs after its authentication, course, release and practice/diagnostic checks. If either session ID is supplied, both are required. The standalone branch uses `service_record_answer_atomic` and the client `hintUsed` boolean; it lacks session-bound presentation/help semantics. This is retained implementation behavior, not the request shape used by current browser clients or an entrance to governed contexts. Retirement of `get-practice-item` did not remove this branch.

## Implementation references

- [Answer endpoint](../supabase/functions/submit-answer/index.ts) and [Mastery endpoint](../supabase/functions/submit-mastery-answer/index.ts).
- [Governed router](../supabase/functions/_shared/governed-learning-runtime.mjs), [context resolver](../supabase/functions/_shared/student-learning-context.mjs), [assessment policy parser](../supabase/functions/_shared/assessment-policy.mjs).
- [Governed transaction and response projection](../supabase/migrations/20261006065508_sprint_15b12c_learning_runtime.sql).
- [Runtime scope](sprint-15b12c-learning-runtime.md), [navigation/analytics](sprint-15b12d-navigation-analytics.md), [live acceptance boundary](sprint-15b12e-acceptance.md).

The deployment comparison covers the `submit-answer` bundle, not a fresh deployment-parity certification of every endpoint mentioned. This reconciliation changes documentation only.

## Content Reviewer dashboard reads

`POST /functions/v1/get-content-quality-dashboard` is a separate reviewer API, restricted to an active signed-in `admin` or `content_admin`. Its response keeps `items`, `stats`, `catalog` and `curriculumProvenance`; `latestQa` and `latestReview` belong to the current saved item version. Complete, bounded and paginated reads are required. A related QA/review/mapping/version read failure returns HTTP 500 `content_quality_dashboard_failed` with `failedRead`; it must not be represented as an empty successful dataset. The shared browser loader does not cache failed responses. After a failed post-QA refresh, refreshing the data does not itself rerun QA or approve anything.

[Repair and deployed-verification boundary](reviewer-approval-repair-20261011.md). Human approval still rechecks current technical QA and the family fingerprint atomically; SME/release eligibility is independent.
