# Teacher task production integration

2026-10-31 Asia/Yerevan · B.12.3.2 · six migrations staged; final privacy confirmation, runtime deployment, frontend activation and usability acceptance pending.

**Current blocker:** Supabase returned an expired confirmation three times for the final privacy migration. The third was reopened only after the exact SQL passed all required CI gates and the reviewable source was explicitly shown. Readback confirms no privacy execution column/job table and no history entry for that phase. The six successful migrations preserve all 117 original public tables exactly. No runtime or frontend is activated and no learner work, mark or account erasure is created. [Staging receipt](evidence/teacher-task-production-integration-20261031.json).

This promotes the already tested published-writing delivery and custom-task authoring/source/delivery/student/review/privacy capability from draft PR365. The assessment engine, learning criteria, curriculum, owner content/audio decisions and speaking policy remain unchanged. All 45 mapped capabilities, English C47 and the separate four-subject gate are retained. The [newly approved consistency contract](dashboard-consistency-acceptance.md) follows this integration; B.12.3/B.12 remain open and subjects stay paused.

## Ordered backend expansion

Apply the reviewed SQL in dependency order: existing writing assignments; private task drafts; teacher PDF attachments; frozen custom delivery; private learner responses/submissions; teacher review/cancellation; privacy/retention/erasure. The last four proposals are promoted into CLI-created migrations without changing their SQL bodies. Existing isolated actual-SQL tests and all sixteen copy/review/privacy PostgreSQL races continue to use those canonical migration files. The new delivery entrypoint boots the tested handler with the same live-session and pinned SDK configuration as the other task endpoints.

Inspect production schema/history and fingerprint the existing 117 public tables before expansion. Read back applied function definitions/grants and migration history afterwards. Align migration filenames to the actual tool-recorded production versions without modifying server migration history or reapplying SQL. A stage may add schema before frontend activation; it is not a release claim. All current-source CI, deployment/source and guarded production gates still have to pass before closure.

## Old-client deletion compatibility

`manage-admin-account.execute_deletion` now requires `executionProtocol: "teacher-task-privacy-v1"` in the JSON body. The current admin client sends that opt-in. An older cached client receives HTTP409 `deletion_client_update_required` with a refresh instruction **before** request preparation, Auth ban, session revocation or data/file changes. It cannot mistake a resumable HTTP202 for completion. The opt-in does not grant authority: active master admin, live session, AAL2, approved request and existing final confirmation remain required. SQL continues to enforce every execution phase.

The native admin test uses the actual current browser handler against the actual fixture SQL/Edge implementation; the added backend regression verifies missing, null and unknown protocol values leave target sessions, request marker, recipients and Storage unchanged. Valid current clients retain pending/resume, lost-reply and final-completion recovery.

## Runtime consumer audit

| Consumers | Required deployment/readback |
| --- | --- |
| `manage-writing-assignments` | Existing published course-writing delivery, separate from custom definitions. |
| `manage-teacher-task-drafts`, `manage-teacher-task-sources` | Own drafts/copies and private PDF source bytes. |
| `manage-teacher-task-delivery` | Newly indexed endpoint for exact preview, immutable send receipt, get/list. |
| `manage-teacher-task-student-work`, `manage-teacher-task-student-files` | Own inbox/draft/submission and protected source/response download/upload. |
| `manage-teacher-task-review`, `manage-teacher-task-review-files` | Submitted-version review, private/published feedback, cancellation and protected submitted documents. |
| `get-my-privacy`, `manage-my-privacy`, `get-admin-dashboard`, `manage-admin-account` | Own inventory, execution marker, reversible pre-execution approval and resumable cleanup/erasure. |

All twelve runtime entrypoints require JWT verification. Upload the entire static relative dependency closure; read back and compare each deployed file to repository bytes. The unchanged shared auth helper does not require redeploying unrelated consumers. The four modified existing privacy/admin functions pin the same Supabase SDK 2.57.4 used by the new task endpoints.

## Guarded hosted acceptance

The existing resource-assignment production workflow retains reviewed-main, exact deployed revision, designated two-school accounts, shared non-cancelling mutex and cleanup. Its new custom-task helper creates only uniquely named synthetic teacher drafts, uploads one original synthetic PDF per school, uses the actual teacher form to select only the designated learner, replays the same send nonce, opens the actual My-work task and verifies exact protected PDF bytes. It checks foreign-school denial, independent PDF-source/link-response requirements, immutable assigned content after editing the source draft, empty pending review before submission, role inventory and audited cancellation.

No learner answer, file submission, score, feedback publication or account erasure is created in production. Existing actual-SQL/native fixtures cover those positive submission/review/revision and deletion cases. Production source checks include the admin page/script/styles and all new student/teacher task modules. Clean up only this run's deliveries by cancellation; private teacher drafts, pinned PDFs and immutable delivery/cancellation audit are retained under the normal retention contract, as existing synthetic resource/assignment audit is retained. Never broaden deletion or retention rules for QA cleanup.

Record migration/runtime versions and hashes, 117-table staging preservation, advisor deltas, current-source PR/main gates, production source parity and hosted acceptance in the release evidence. Reuse unchanged verified content/audio and actual-SQL/native evidence explicitly. Merge aligned documentation and synchronize Notion to the actual merged source. Then perform the bounded consistency pass and present John with concrete usability paths; scope approval and technical passing checks are not final owner usability acceptance.

## Recovery boundary

Keep old-client refusal and resumable erasure fencing in place during frontend rollback. Do not drop new tables, erase saved work or rewrite immutable task/submission history to restore a prior screen. Use the existing reviewed rollback/promotion controls and reconcile the same uncertain send/submission/deletion request. No unreviewed background cleanup or new automatic expiry is introduced.


## Bounded visual correction after the first current CI

Source `ed1d83d53b9a356ddbedfb2a05675dcb44a3464d`, CI41126541610 passes all five gates: 1,628 unit/integration, 357 native and sixteen task-specific PostgreSQL17 races. Artifact13011162460 is downloaded and SHA-256 verified (`a45fab2a8fbc5769d020a21fd10e35ebc8409c7bc2189b4126d7ec8c3a908a9b`). Its three actual Home images show the new progress/review paths, but also expose a pre-existing welcome grid that squeezes copy to one character per line at desktop 200%, narrow-screen heading splits and undersized class-card columns at enlarged text. Geometry-only passing tests were insufficient; these images are not accepted visual evidence.

The corrective batch uses font-relative welcome/onboarding/class grids, smaller secondary headings and shorter onboarding copy. A shared native word-range check now covers the institutional Home and the legacy staff Home at 100/200% text, alongside the existing page bounds, role, keyboard and account/logout checks. Screenshots scroll to the page top before capture so an off-viewport fixed skip link is not drawn into a full-page screenshot after keyboard scrolling. No runtime skip-link behavior or evidence/assessment rule changes. The correction needs its own current-source CI and fresh inspected images before visual acceptance.
