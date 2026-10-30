# Teacher task privacy, retention and account erasure

2026-10-30 Asia/Yerevan · B.12.3.2 · staged in draft PR365, not deployed.

This shared core slice extends the existing account inventory and two-stage student deletion procedure to teacher-created tasks. It applies across governed subjects, grades and roles. It does not change curriculum release gates, mastery, classroom speaking or owner content/audio acceptance. B.12.3/B.12 remain open and subject expansion remains paused.

## Inventory and ownership

`get-my-privacy` adds `dataInventory.teacherTasks`, derived only from the authenticated account. Counts cover own drafts/copies, sent deliveries, source PDFs/bytes, private/published teacher feedback, received tasks, private response drafts, submitted versions, response files/bytes, received published feedback and pending file cleanup. Teacher totals never include other learners' response/file contents or private draft counts. Learners never receive private teacher feedback. The account page renders named positive integer counts; no storage paths, answers, filenames, recipient identities or signed URLs are projected.

Source PDFs belong to their teacher. Deleting a recipient removes that learner's work, submission/review history and recipient rows, while preserving the teacher's source PDF, frozen task, delivery/event and other learners' work. The immutable delivery's original recipient count remains a historical aggregate. Teacher/staff account removal continues to require existing offboarding/reassignment controls; this procedure cannot erase teacher-owned resources by changing a role.

## Two-stage student deletion

**Integration compatibility:** final execution requires body `executionProtocol: "teacher-task-privacy-v1"`. Cached legacy consoles receive HTTP409 `deletion_client_update_required` with a refresh instruction before any preparation, ban, revocation or data/file change. The current client opts in explicitly; this does not change admin/MFA authorization. See the [production integration contract](teacher-task-production-integration.md).

Approval still only marks the existing request `processing` and profile `deletion_pending`. The learner can cancel, or the administrator reject, until explicit final execution begins. The existing active master-admin/live-session/AAL2 gate and typed `DELETE` confirmation remain.

| Phase | Action and recovery |
| --- | --- |
| `prepared` | Lock request/target, pin target and inventory, set `execution_started_at`. Further cancellation/rejection/reset is denied in SQL as well as UI. |
| `data_erased` | After an acknowledged Auth ban, verify `banned_until`, revoke target sessions, lock work in order, queue response files, erase only that learner's custom work/feedback/recipient rows. Retain a durable job. |
| File cleanup | Wait until each upload lease expires. Remove at most 100 generated paths through the Storage API, read back absence with bounded list requests, acknowledge confirmed files only. Scrub path/owner/asset from acknowledged queue rows. |
| `profile_erased` | Only after all queued files are confirmed absent, run the original learning/profile cascade. Persist its inventory atomically so a lost reply can replay after the profile is gone. |
| `completed` | Delete Auth user, independently verify Auth/profile absence and no pending files, then complete/scrub target identifiers and write one aggregate-only audit receipt. |

The API returns HTTP202 with `completed:false`, remaining file count and upload-drain retry time when work remains. No background completion is implied. The admin's same request exposes **«Շարունակել ջնջումը»**; retries resume the committed phase, without starting a second job or repeating confirmation. A failed/lost Storage, SQL or Auth response leaves that same request recoverable. If the final reply is lost but live same-account readback already confirms that request completed, the admin page reports completion without another delete attempt. A missing Auth user is reconciled; SQL still verifies final absence. HTTP200 completion is returned only after final verification. Browser mutations suppress duplicates and discard results after an account change or unreadable session. Account columns adapt to text size across roles; student/staff account views and admin execution controls are checked at 390/768/1280px with 200% text. Short account labels, wrapping controls and an accurate in-progress status retain the Forest palette. Text must fit its own control/column as well as the page. Deletion progress stays inline below its table so it cannot cover Resume; the refresh control wraps as a whole word. The concise platform-admin heading is scoped to `data-role-workspace="platform"`; the other `admin.css` consumer, `admin-security.html` (`platformSecurity`), keeps its existing header.

The original immutable UPDATE guards remain. DELETE exceptions use a private, ungranted, transaction/backend-bound scope for the exact target student or exact orphan asset. No client-controlled setting, general history-delete RPC, broad Storage policy or trigger-disabling application path is introduced. Public tables/RPCs remain inaccessible to ordinary browser roles. Service wrappers recheck a live active admin transaction; Edge execution retains MFA. Legacy `erase_student_data` is fenced behind the prepared job and acknowledged file cleanup.

## Upload drain and reference safety

Source/response reservations carry a monotonic 15-minute upload lease, refreshed before pending upload I/O. Hosted Supabase Functions currently permit at most 400 seconds wall time on paid plans (150 seconds free); the lease exceeds both. Erasure may remove metadata while the old authorized invocation drains, but never confirms file deletion until that lease ends. New reservations after metadata removal get new immutable paths. No automatic overwrite or path reuse is allowed.

Before orphan cleanup, reference checks include **all draft definitions and copy initial definitions**, every frozen version's PDF FK/JSON, private learner work JSON and every immutable submission's FK/JSON. Copy provenance and its initial PDF remain protected even after current text changes. Binding a source or response takes KEY SHARE on the actual file row; cleanup locks that row FOR UPDATE, rechecks references/lease and refuses a stale manifest. Profile → asset locking is consistent with erasure. Saved drafts, assigned/cancelled tasks, submitted work and feedback have no new automatic expiry.

## Reviewed orphan cleanup procedure

`scripts/teacher-task-file-cleanup.mjs` is an operator tool, not a student/teacher form or automatic schedule. It refuses a dirty/non-main checkout or a HEAD differing from `EXPECTED_MAIN_SHA`. Use only after the reviewed migration, Edge deployment/readback and existing production source checks have passed. Do not use this draft branch to clean production.

1. Use a clean exact reviewed `main`. Set `EXPECTED_MAIN_SHA` and `HAIEDU_ADMIN_ACCESS_TOKEN` securely in the process environment. Use an ordinary unexpired MFA master-admin session; never a service key or learner impersonation. Do not paste credentials into command arguments, logs or repository files.
2. Choose the operational cutoff explicitly. Preview (default, read-only): `node scripts/teacher-task-file-cleanup.mjs --before 2026-10-28T00:00:00Z`. The server requires a cutoff at least one day old and expired leases. It returns at most 50 candidates' aggregate count/bytes, `hasMore` and a fingerprint, never paths. This minimum is an orphan-upload safeguard, not a policy for expiring saved work.
3. Review the preview. Execute with the same cutoff, fingerprint and a new stable UUID: `node scripts/teacher-task-file-cleanup.mjs --before 2026-10-28T00:00:00Z --execute --fingerprint PREVIEW_SHA256 --request-id STABLE_UUID --confirm REMOVE_UNREFERENCED_TASK_FILES`. Changed candidates/references reject the entire manifest for a new preview; the command cannot silently expand it.
4. Preserve the cleanup ID/nonce. A lost reply retries the exact reviewed request. Pending/failed removal resumes using `node scripts/teacher-task-file-cleanup.mjs --cleanup-id CLEANUP_UUID --confirm REMOVE_UNREFERENCED_TASK_FILES`. No new preview or nonce is needed to finish that queue. Review a fresh preview separately for another batch when `hasMore` was true.

No cleanup command was run against production in this slice. Queue and receipt operations use SQL; actual bytes use `storage.from('teacher-task-files').remove(...)` and bounded readback. SQL never deletes `storage.objects`, which would leave physical bytes behind.

## Endpoint and deployment consumer audit

| Consumer | Staged change / release obligation |
| --- | --- |
| `get-my-privacy` | Own custom-task aggregate RPC; deploy/read back new bundle with migration. |
| `manage-my-privacy` | Cancellation respects execution marker and atomic trigger race. |
| `get-admin-dashboard` | Include execution marker on deletion rows. |
| `manage-admin-account` | Resumable erase and preview/enqueue/resume orphan cleanup; imports `_shared/teacher-task-privacy.mjs`. |
| `web/privacy.js`, `web/admin.js` | Shared `task-privacy-view.mjs`, accurate pending/resume/completed controls, account fences. |
| Source/student file SQL | Upload leases and file binding locks; existing file handlers need no new path/format contract. |

The four privacy/admin Edge consumers require actual deployment/source readback at release, alongside the already staged teacher draft/source/student/review endpoints and the still-unindexed custom delivery endpoint. Shared repository changes do not update deployed functions. Production migrations/proposal promotion, all required main checks, guarded production/source acceptance, merged documentation/Notion closure and final owner usability remain separate gates.

## Evidence and limits

Local actual-SQL/Edge tests cover PDF/Word cleanup, own inventory, immutable history/RLS/grants, other learners/shared sources, reversible approval, staff denial, upload leases, queue isolation, storage failure and lost purge/profile/Auth/final acknowledgements. Storage/Auth HTTP services are explicit doubles; they establish handler ordering and retry behavior, not hosted erasure. Separate PostgreSQL17 tests use independent connections and observed lock waits for source/response binding versus cleanup, prepare versus cancel, duplicate purge/profile erase/completion. Native tests use the real account controller and actual extracted admin deletion handlers/HTML/styles, with fixture SQL/Edge, duplicate/unknown/late-account cases and 390/768/1280px at 200% text. The admin component fixture does not claim full production admin/MFA initialization.

Current-source CI/PG17/native receipts and inspected visual artifacts are recorded on [draft PR365](https://github.com/johnvanesyan-arch/HaiEdu/pull/365) and its source-verified Notion checkpoint. [Local evidence](evidence/teacher-task-privacy-local-20261030.json). Reuse unchanged PDF/editor/review evidence from source `e1a16846164a27733bc32c6a8f8fdf1938bba1ea`, CI41034066851 (all five gates; 1,612 unit/integration; 349 native; eight copy/review races). No production learner, SQL, Edge or Storage write is claimed here.

Primary operational sources checked 2026-10-30: [Storage object deletion](https://supabase.com/docs/guides/storage/management/delete-objects), [Auth user deletion caveats](https://supabase.com/docs/guides/auth/managing-user-data), [hosted Function limits](https://supabase.com/docs/guides/functions/limits). This describes implemented technical controls, not a new legal retention schedule.
