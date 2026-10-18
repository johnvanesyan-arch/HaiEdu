# Learning API contract


**Historical baseline verified:** 2026-10-10 against repository source and then-deployed `submit-answer` v18 (ACTIVE, JWT verification enabled; all 12 bundle files matched). [Verification evidence](evidence/documentation-status-audit-20261010.json). [Current delivery status and release gates](project-status.md) are maintained separately.

This replaces the standalone `submit-answer v0.1` example with the current session workflow and retained legacy behavior. The historical 2026-10-10 comparison does not authorize a release; the separate 2026-10-13 pilot activation and authenticated acceptance are recorded below.

**Chapter IV proposal boundary (15D.5, 2026-10-18):** all 236 current v1 questions remain published/approved, 138 guides published and 150 definitions active. Four offline v2 policy recipes use Diagnostic 19/all 14 skills, Practice 8/all 14, Mastery 15/ten required skills, and Review 12/all 14. Mastery requires 12/15 and one correct per required skill; the existing numerical readiness model and three-attempt lifecycle are proposed unchanged. Current JS shape validation and read-only SQL scope/scoring functions accept the recipes and five pass/fail cases. No model, blueprint, pool, form, policy binding or release is deployed; full activation validation/rehearsal remains pending. Five proposed revisions have no v2 approval/QA IDs and cannot reuse v1 approvals. The draft release and current learner state are unchanged. [Proposal](chapter-iv-assessment-contract-proposal.md).

**Versioned assessment scope (15C.15, 2026-10-15):** John approved the Chapter III contract. `haiedu-assessment-policy-v2` explicitly declares `deliveredSkillIds`, partitioned `reportingGroups`, and Mastery-only `scoredSkillIds` / `readinessSkillIds`. Group objects contain `key`, `label`, `skillIds`; duplicate, missing, out-of-scope or mixed scored/unscored groups fail validation. The v1 schema stays closed. Completion and history return `assessmentResult` / `haiedu-assessment-result-v2`; `score` is the pass score, `overallScore` is descriptive, and `groups` retain each scale. Teacher latest results/session reporting and school `reportingGroups` / `passScore` use saved session results. Active assessment correctness remains hidden. `requiredForReadiness` in status/dashboard distinguishes required skills. Finalization independently recomputes v2 passing from frozen items. That 15C.15 capability deployment introduced no new endpoint, auth relaxation or Chapter III activation. The capability is deployed: nine SQL functions and all 14 affected Edge bundles match source (`submit-answer` v19). CI verifies v2 completion and a second subject; authenticated production verifies preserved v1 Chapter I/II switching and staff/analytics access. At that October 15 checkpoint Chapter III v2 was not active; the separate October 17 activation and acceptance below supersede that release state. [Implementation and release evidence](assessment-policy-v2.md).

**Shared guide validator (deployed v11):** declared render keys select eligible variant inputs. For authoredCatalog variants with no declared keys, copied-input detection uses full prompt quantities and adjacent labels, excluding unrelated authoring metadata such as candidateRevision. Legacy generated-variant parameter handling is retained. This fixes a false rejection without an item/subject exception. All three deployed bundle files match the intended source and verify_jwt remains true. Existing and new guide checks use actual saved variant metadata; the verification is exact-source replay and bundle readback, not an authenticated live publish. [Guide-validator repair evidence](evidence/remediation-guide-validator-metadata-fix-20261015.json).

**Chapter III provisional pilot (15C.26, 2026-10-17):** activation committed at 07:40 UTC with four exact v2 policy contracts, three pools, five forms and the existing deployed runtime. Exact configuration readback and all 61 preservation scopes passed; Chapters I/II retain their prior contracts and learner history. Chapter III is now an active authorized learning context. D16 / Practice8 / M16 / Review12, 10 pass-scored questions, 8/10 and four mandatory skills remain the approved contract. Authenticated production acceptance passed 123/123, with two-school isolation 54/54, on exact frontend `23603eb522d6acc58647826a70ce4f077447d7ef`. Home → Chapter I at 1365 px, Chapter I → II → III → I at 390 px and v2 dashboard contracts passed without creating learner sessions, answers or exposures; all 59 tracked public tables remained unchanged through QA. Existing teacher prompt/key access is retained; only teacher direct-option denial is certified. [Production evidence](evidence/chapter-iii-pilot-read-acceptance-20261017.json). Independent specialist/exposure review is deferred. [Activation evidence](evidence/chapter-iii-pilot-activation-20261017.json).

**Ordinary revision review closure (15C.24R):** read-only production verification confirms both current v2 approvals and five MFA-protected definition approval events, with unchanged content. All 168 current questions have matching approvals and passing QA; 80 guides are published and 344 definitions active. This verification made no database writes; all 39 table fingerprints stayed unchanged during it. Exact form approval bindings were refreshed offline. No API/schema/runtime/scoring, qualified allocation or release change. [Review closure](chapter-iii-revision-review-20261017.md).

**Historical versioned content correction (15C.24; approved under 15C.24R):** two existing S03 questions were saved as v2 / review / needs_review, with five supporting definition drafts and two actor-null current-version QA records. Old snapshots, approvals and every unrelated row are preserved; 28 tables are wholly unchanged. Only inactive content/family/template/source descriptions and current mappings changed. No API, schema, runtime, scoring/readiness, allocation or release change. Conditional form coverage uses pending drafts and does not confer qualification. [Revision evidence](chapter-iii-trajectory-revisions-20261017.md).

**Historical qualification preparation (15C.23; coverage drafts now saved under 15C.24):** five offline conditional forms and eight reserves were prepared; two mandatory trajectory-classification gaps were identified and subsequently addressed by the pending 15C.24 drafts. No API, schema, runtime, scoring/readiness rule, content, approval, allocation or release row changed. All 39 guarded database fingerprints remain unchanged. This is a content representativeness check, not a new runtime per-outcome pass rule. [Preparation evidence](chapter-iii-assessment-qualification.md).

**Definition approval closure (15C.22R, 2026-10-16 UTC / 2026-10-17 Asia/Yerevan):** 101 owner-authorized delegated approvals completed through the existing authenticated, MFA-protected misconception-review workflow, with matching immutable audit events and unchanged content. All 168 Chapter III question approvals already existed and pass current-version read-only verification. Inventory at that checkpoint: 168 approved questions, 80 published guides and 339 active definitions; no ordinary review pending. The subsequent 15C.24R closure is stated above. No API, schema, runtime, scoring, allocation or release change. Independent qualification and release remain open. [Approval evidence](chapter-iii-definition-approval-20261017.md).

**Historical content-only Batch 19 boundary (15C.22, 2026-10-16 UTC; review counts superseded by 15C.22R above):** 24 remaining Mastery drafts and 58 definitions were added through guarded content transactions. Saved-content deployed-v11 evaluator replay passed 24/24; this was not an authenticated live Edge invocation. No endpoint, schema, runtime, scoring/readiness rule, learner guide, pool/form allocation or release binding changed. Chapter III remains inactive with 168 questions: 120 approved and 48 pending across Batches 16–19. Planned authoring completion, ordinary approval, qualification and release are separate. [Current content status](chapter-iii-batch-19-staging.md).

## Chapter II content boundary — 2026-10-13

The 192-question Chapter II bank is content-approved, with 263 active definitions and 57 published guides; no content is pending. The owner approved the three editorial questions at unchanged v3 and published the three guide corrections at authoring v7 / runtime v3. [Review closure and qualification evidence](evidence/chapter-ii-qualification-preflight-20261013.json). Earlier approvals and immutable history remain preserved.

Sprint 15B.14A is a read-only qualification preflight and reviewer handoff. It creates no new endpoint, approval, QA record, SME flag, release-gate transition or runtime change. The ordinary reviewer approval flow records content approval; SME status remains separately governed, as the current interface states. No API contract, scoring or delivery rule changed.

The owner authorized a provisional Chapter II pilot with specialist review deferred. Both reviewed database migrations are deployed with exact source hashes; production rollback rehearsal and committed activation passed all 53 preservation scopes. Chapter II is `pilot`, with exact form allocation and model/policy bindings. Authenticated production acceptance passed 91/91. The six pilot gates passed; independent SME and final exposure disposition remain production requirements. [Activation evidence](evidence/chapter-ii-pilot-activation-20261013.json). The shared RLS repair still denies direct anonymous/student reads; zero governed exposure events does not establish historical non-exposure.

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

## Deployed runtime extensions — 2026-10-13

The following changes merged in PR #206 at `a64269e1ab83d2b52d1a8af0d65559bab580aeec` and passed all five final CI jobs. Both exact database migrations were subsequently applied through the owner-authorized dashboard route, with atomic migration history and matching hashes. Chapter II activation is committed and read back; authenticated production acceptance passed 91/91. This database verification supplements the earlier Edge bundle verification; no Edge source/deployment change was needed. [Deployment evidence](evidence/chapter-ii-pilot-activation-20261013.json) · [Pilot record](chapter-ii-pilot-release.md).

### Optional whole-form Mastery selection

A Mastery blueprint can opt in through `assessment_blueprints.configuration_snapshot.masteryFormSelection`, alongside `assessmentPolicy`. This is server configuration, not a new session-request field or a member of the assessment-policy v1 object. Illustrative configuration, with actual form UUIDs substituted:

```json
{
  "masteryFormSelection": {
    "schemaVersion": "haiedu-mastery-form-selection-v1",
    "formIds": ["<first form UUID>", "<second form UUID>", "<third form UUID>"],
    "selectionStrategy": "ordered-unseen-whole-form-v1"
  }
}
```

`formIds` is an ordered list of 1–100 distinct active forms in the blueprint's protected Mastery pool, with at least as many forms as the bound maximum Mastery attempts. Every form must match the bound planned count and per-skill coverage, use the blueprint's current published item versions, and share no item with another declared form. Declared items cannot also be enabled in a Diagnostic, Practice, Review or unprotected pool. Binding saves an immutable private manifest of the ordered selection, form versions and item versions/skills. Allocation changes require a new reviewed blueprint/version; removing the opt-in field cannot silently restore dynamic selection.

For a new attempt, the server selects the first declared form whose entire membership is unseen. Any recorded assignment, exposure or answer attempt for a constituent item, across purposes and releases, excludes the whole form. The complete form is assigned atomically; unused pool items and reserves are not substituted. If no declared form remains eligible, allocation fails closed. An existing matching active session resumes before new allocation. The selection is not a claim of empirical form equivalence.

The opt-in path requires Read Committed transaction isolation, as used by the API. It changes neither the learner request shape nor the bound scoring, readiness or attempt-limit rules. Blueprints without this option retain their existing selection behavior, and the Chapter I legacy adapter remains unchanged. No new public error projection is introduced: unavailable or invalid form configuration passes through the existing governed `403 learning_context_unavailable` boundary.

### Disjoint active curriculum releases

The deployed registry permits active releases within one programme when their unit snapshots are disjoint. A unit can belong to only one active release; activation still requires the applicable pilot/production gates. Activated release identity and unit scope cannot be rewritten to move existing sessions to another release. The deployed browser code groups courses by enrollment and programme, while chapter links and API requests retain the exact enrollment/release/unit identities. The committed Chapter II pilot is now available to authorized enrollments. Clients must not infer one active release per programme or substitute another release when a context is unavailable.

Release-governance writes require Read Committed; this is not a new learner request requirement. Cross-release prerequisite routing remains outside this change. See [release-unit governance, consumer scope and limitations](disjoint-release-unit-governance.md).

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
- Deployed and migration-history hashes verified: [whole-form Mastery selection](../supabase/migrations/20261013101825_governed_mastery_form_selection.sql) and [disjoint release-unit governance](../supabase/migrations/20261013101644_disjoint_curriculum_release_units.sql).
- [Runtime scope](sprint-15b12c-learning-runtime.md), [navigation/analytics](sprint-15b12d-navigation-analytics.md), [live acceptance boundary](sprint-15b12e-acceptance.md).

The 2026-10-10 deployment comparison covers the `submit-answer` bundle, not a fresh deployment-parity certification of every endpoint mentioned. The separate 2026-10-13 activation evidence verifies the deployed database extensions and committed pilot; authenticated production acceptance passed 91/91.

## Content Reviewer dashboard reads

`POST /functions/v1/get-content-quality-dashboard` is a separate reviewer API, restricted to an active signed-in `admin` or `content_admin`. Its response keeps `items`, `stats`, `catalog` and `curriculumProvenance`; `latestQa` and `latestReview` belong to the current saved item version. Complete, bounded and paginated reads are required. A related QA/review/mapping/version read failure returns HTTP 500 `content_quality_dashboard_failed` with `failedRead`; it must not be represented as an empty successful dataset. The shared browser loader does not cache failed responses. After a failed post-QA refresh, refreshing the data does not itself rerun QA or approve anything.

[Repair and deployed-verification boundary](reviewer-approval-repair-20261011.md). Human approval still rechecks current technical QA and the family fingerprint atomically; SME/release eligibility is independent.

## Chapter II authenticated production read acceptance — 2026-10-13

**Authenticated production acceptance passed 91/91** on exact frontend revision `ed3f1c291e38e77c8469699e361205893e652327` in [workflow 38446467319](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38446467319). The six designated QA identities, reciprocal two-school controls, protected direct-read denials, exact Chapter II contract and Chapter I → II → I desktop/mobile navigation passed. The runner created no learner session, answer or exposure; before/after chapter evidence is unchanged, and only its own login sessions were closed. [Production acceptance](evidence/chapter-ii-pilot-read-acceptance-20261013.json). This closes the live switching dependency for Sprint 14 / 15B.12E and the authorized provisional Chapter II pilot slice 15B.14C. It does not grant independent specialist approval, production promotion, empirical form equivalence, cross-release prerequisite routing or full Sprint 15 course completion.
