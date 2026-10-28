# Teacher feedback workspace — 16.5B.11

2026-10-28 · Shared core · Contract `teacher-feedback-v1` · Implementation/verification in progress.

## Scope and teacher procedure

Home → Continue reviewing, a pending-writing class card, or Classes → exact unit → Writing review opens the same workspace. The submitted response stays beside its governed rubric on wide screens and precedes it on narrow screens. Full descriptors can be disclosed. The rubric is read from the pinned writing-task definition; no subject, language, grade or scoring rule is hard-coded into this feedback service.

1. Read the prompt, submitted version and applicable criteria. Fill some or all rubric choices and write feedback.
2. Wait for the private saved acknowledgement, use Save draft or Ctrl/⌘+S. Autosave waits 750 ms after input. Incomplete rubric choices are valid in a private draft. Unsaved, saving, restored, saved and sent states have distinct text.
3. Optionally maintain personal generic comments under `Իմ պատրաստի մեկնաբանությունները`. Insert adds text to the review draft; it never sends. Edit/archive/restore are manual, versioned actions. Native Tab/Shift+Tab and the feedback-focus button support keyboard use.
4. Explicitly send a complete assessment and feedback, or return the response with revision instructions. The learner sees the published review on the existing writing page. Returned work permits a revised submission; previous submissions/reviews remain immutable. Regrading retains the required reason. Human writing marks do not become automatic mastery evidence.
5. Use Next work or Return to queue with the existing exact class context. The original class/unit route remains available. Archived/ended access keeps the existing read-only limits, including an explicitly private read-only draft where authorized.

A failed save retains typed text. Retry of an identical committed save returns its acknowledgement without another revision. A stale tab disables save/send, preserves copyable text and offers an explicit reload with a discard confirmation. A lost publication reply freezes review fields and retries the same request identity; it cannot silently send a second review. Navigation/disposal clears timers/listeners, ignores late replies and warns for unacknowledged review or personal-comment edits. Account changes and authorization denial remove old private response/editor content. No feedback/comment text is stored in localStorage or sessionStorage.

## API and consistency

`POST /functions/v1/manage-teacher-feedback`: live active teacher authentication, actor/session derived by the Edge, strict body/action keys, no asserted actor/student/school selector, body ≤30 KB. Every response is `no-store`. The public SQL wrapper is service-role-only, SECURITY INVOKER; narrow private definer functions have an empty search path. Existing auth helper and writing authorization are reused.

| Action | Context and payload | Result/contract |
| --- | --- | --- |
| `open` | Exact assignment/release/unit; `workId` | Existing `written-work-v1` projection plus this teacher's draft and first 20 active personal comments, in one browser request. No draft/write on opening. |
| `save_draft` | Same context; work ID, expected work revision, expected draft revision, data | CAS acknowledgement. Data has partial nullable governed scores, feedback ≤4,000 and change reason ≤1,000 characters. Frozen current submission/work revision is mandatory. |
| `publish` | Same context; work/revision/draft revision, `assessed` or `return`, client UUID request ID | Publishes the acknowledged draft through the existing authoritative review service. Atomic immutable review + receipt; exact retry replays one receipt, changed payload with same identity conflicts. |
| `snippets` | Empty context; optional archived flag and offset | Own-only pages of 20 plus hasMore, ordered updated time/ID. Offset is bounded at 100,000. |
| `save_snippet` | Empty context; client UUID, expected revision, title/body/archived | Own-only CAS create/edit/archive/restore. Title ≤80, body ≤2,000; maximum 50 active comments per teacher, serialized under an actor lock. An identical lost-reply retry is idempotent. |

401 denies authentication; 403 denies inactive account/session, unavailable context or read-only mutation; 409 denotes a stale work/draft/comment or reused request identity; 400 rejects malformed data, incomplete published rubric or the active-comment bound; 503 redacts unexpected service errors. Successful responses use `teacher-feedback-v1`. Current role/live session are rechecked after the SQL call. Work actions reauthorize through the existing exact writing context before/after locks; personal comments confer no learner or school access.

Lock order is existing teacher context → written work → private draft, including legacy writing clients. A trigger on any work revision change removes obsolete drafts for every teacher. New submission and legacy publication therefore cannot leave a publishable stale private draft. Publication retries still reauthorize; a receipt grants no new access.

## Data ownership, privacy and shared consumers

Three private RLS-enabled tables deny direct access to public/anon/authenticated/service_role; access is only through scoped functions. Draft PK is teacher + work; co-teachers can see the authorized submitted response but cannot see each other's draft. Comment IDs never confer another teacher's ownership. Receipts bind actor/request/work/review and exact request data. FK indexes cover cascade/lookup paths; list results are bounded. No public RLS policy is intentionally added to these private service-only tables.

Teacher My account/privacy inventory adds own draft, comment and publication-receipt counts. Existing export/deletion-request procedures remain; this slice does not promise a new automatic export. Deleting a teacher profile cascades private drafts/comments/receipts while the existing published-review audit anonymizes its actor and preserves the judgment. Learner/work/submission erasure cascades linked private drafts/receipts. Published student feedback/history retains the existing educational-record rules. Generic comments should contain no learner name or copied response; stored text remains teacher personal data.

Affected consumers: teacher Today direct review, original class/unit writing review, learner writing/history and course/task surfaces, read-only teacher history, role-specific privacy inventory, Armenian teacher guide, all production QA entrypoints importing the writing module. Only the new Edge imports the new feedback helper. Existing `auth.ts` and the writing-handler bundle remain unchanged; the legacy writing API is covered by the invalidation trigger. Get-my-privacy has a new own-count service call. Shared dependency QA triggers retain main-only frontend/source guards, designated fixtures and serialized isolation cleanup. No curriculum/audio/bank release, content approval, recipient assignment or automatic scoring rule changes.

## Verification and release boundary

Actual SQL/API tests cover private restore/CAS, complete rubric validation, return/resubmit/regrade history, two authorized co-teachers, role/grant/session/archive denial, snippets, privacy/direct denial/cascades and legacy-review invalidation. Native Chromium tests use the actual SQL/handlers with synthetic identities: edit/autosave/reload, committed lost replies, duplicate click, two tabs, stale/context/account changes, receipt, archive/restore, keyboard/focus and 360/768/1280 px at 200% text. Existing teacher-to-learner native writing journeys remain. PostgreSQL 17 independent-connection races cover competing drafts, duplicate publication, legacy review versus autosave, revocation/session expiry and concurrent comment limits.

Production verification is deliberately read-only for this slice: six designated identities, intended frontend commit before/after, own bounded list/privacy/Today/native reads, exact pending-work opening if available, cross-school/role/direct RPC denial, all run sessions closed and 54 before + 54 after isolation. No production learner answer, grade or personal comment is created or modified for QA. This distinguishes native actual-SQL positive write evidence from production read evidence. B.10's unchanged staff CRUD/tenant and curriculum/audio approvals are reused. Required CI still includes all five jobs and the aggregate gate; Vercel deployment-check configuration evidence is separate from a successful build.

Release receipt, actual required-gate counts, source parity and production results will be attached at technical closure. Local browser-install failure is not a passing native check; isolated GitHub Chromium is the execution environment.

## Remaining gates

B.12 retains student-safe sharing preview, purposeful motion, final cross-role owner usability, paired response-opening speed and PERF-02. B.7 measured detail median/p95 5.87/7.88 s and unit switch 6.84/8.86 s remain unresolved targets. DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, all 45 capability/dependency mappings, English C47 pause and the full four-subject 16.5C gate remain. Batch feedback/publication is not exposed: it needs a separately bounded recipient preview, per-item results and audit contract. This slice does not declare the complete staff redesign accepted.
