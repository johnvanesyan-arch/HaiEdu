# Teacher workflow SOP — version 1.5

**B.12.3.2 authoring preparation — not deployed.** The working draft route is Assign writing → explicit class/unit → My task drafts → New / Reopen / Create copy → independent task-source and required-response controls → Preview → Save private draft. Saving never sends work. Text/link copies become separate drafts; PDF copies explicitly require reattachment while asset reuse/retention is completed. Unknown save replies lock editing/navigation/logout until exact replay; conflicts retain text and offer deliberate latest-version reload. The published course-task path remains separate. Custom send/recipient receipt and student text/document/link submission/review are still under implementation; do not instruct teachers to use them in production. [Contract](teacher-assignment-authoring-contract.md).

2026-10-29 Asia/Yerevan · B.8.2 procedures retained; B.10 adds a direct Today shortcut; B.11 adds private drafts and personal comments; B.12.3.1 adds permanent writing-review navigation.

The in-product Armenian [teacher guide](https://www.haiedu.am/teacher-workflows.html) is reachable from each teacher entry point and resource management. This document is the operating contract for those procedures. Original B.8.2 baseline: `3a92b4ec132df1d0b4978d7a2ec6afa5e38651ab`; B.11 implementation: `358af1ed89746f1919ea78582895ffcb96e346bd`; B.12.1 preview implementation: `df051fd1853b6f76421cf11ca24be903e1177694`.

## Purpose and scope

The student destinations have different purposes: **Իմ աշխատանքները** contains assigned resource tasks and discovery of the learner's curriculum writing, submissions and feedback; **Նյութերի գրադարան** is independent supplementary-material browsing. A resource and an assignment referring to it are different records. Library publication does not send a task. Submitted work and feedback are stages of structured writing, not separate assignment types.

Teacher entry points are separate Library, Resource assignments and Writing review cards, all bound to the selected authorized class, subject, release and unit. Loading, failed/stale selection and account changes hide the entries and clear old links. The UI does not grant authority; every existing service rechecks context. Legacy/archived access retains its existing limits. No subject or grade is privileged.

## SOP 01 — Publish an optional resource

**Owner/trigger:** an active assigned teacher wants supplementary reading/practice available to the class, without sending work.

**Inputs:** exact class/unit; PDF up to 5 MiB or HTTPS link; title/source and explicit rights/protected-assessment declarations. Optional metadata stays optional. Platform content publication retains its separate reviewer/MFA flow.

**Steps:** teacher selects class/unit → Library card → `Բացել գրադարանը` → `Ավելացնել նյութ` → attach PDF/add link and confirm metadata/declarations → `Հրապարակել գրադարանում`. The existing coordinator saves, uploads, checks and publishes; `Պահպանել սևագիրը` stops before publication.

**Preview:** after publication, `Աշակերտի տեսքի նախադիտում` shows the shared student library card. Delivery is inactive; no task/activity is created. Teacher file inspection remains separate.

**Confirmation/result:** published status and explicit no-assignment message. Eligible class learners can browse it in Library; no My-work task, submission, completion or grade is created. A saved draft is not student-visible. Editing substantive content requires a new version and reason.

**Recovery:** a known failed upload retains the draft. Retry reconciles an ambiguous upload against stored bytes. An ambiguous create/revise blocks unsafe repetition and offers `Թարմացնել և գտնել սևագիրը`; inspect the saved draft before creating another. Invalid/oversize files must be replaced. Failed QA does not publish.

## SOP 02 — Assign a PDF or link

**Owner/trigger:** an active assigned teacher wants a class or selected learners to follow instructions using a published resource.

**Steps:** select class/unit → Resource assignments card → `Ուղարկել առաջադրանք` → choose a published material's Assign action, or add a new material and choose `Հրապարակել և ընտրել ստացողներին` → choose class/selected roster, add instructions, review recipient summary → `Ուղարկել առաջադրանքը`.

**Preview before sending:** expand `Նախադիտում․ ինչ կտեսնի աշակերտը` to check the exact instructions/material card; this does not send or open a learner account. Recipient selection and final send remain explicit.

**Confirmation/result:** durable assignment ID, time and original recipient count. Exact selected recipients see it in My work → Teacher assignments and can open/download the pinned version. Confirming publication never sends automatically. A selected assignment audience does not restrict already-published class/programme library access.

**Inspection/cancellation:** `Ուղարկված առաջադրանքները` → `Ստացողներ և պատմություն`; reasoned cancellation retains history and does not withdraw the source from Library. Source withdrawal is a separate governed action and revokes future assigned-source opens.

**Recovery:** stale roster/material requires fresh preview and explicit recipient confirmation. A lost send reply uses `Կրկնել նույն ուղարկումը`, retaining the same request identity; inspect sent history if uncertain. Later joiners require a new explicit send. Ended permissions cannot be bypassed by a retained link.

**Limits:** resource assignments support delivery, not student text/file submission, teacher marking, deadline, notification, read receipt or completion tracking. Downloading is not completion or assessment evidence.

## SOP 03 — Curriculum writing and student submission

**Owner/trigger:** an authorized content reviewer publishes a governed writing package; the learner then completes the available unit task. An ordinary teacher directs students to the task and reviews their submitted work.

**Prerequisites:** an approved/published task definition and rubric for the exact active programme/release/unit; authorized learner enrollment; any declared baseline prerequisite. Publication authority, content QA and activation are separate controls.

**Steps:** student My work → course → `Բացել գրավոր աշխատանքները` → open task → read prompt, assistance policy and rubric → complete required baseline if applicable → write with server autosave/manual `Պահպանել սևագիրը` → `Ներկայացնել ուսուցչին`.

**Confirmation/result:** immutable submitted version, pending teacher review. A private draft is never the teacher's queue item. Pending review is not a zero or automatic pass. No teacher-selected class/student writing-send operation or custom writing builder exists in this version.

**Recovery:** unavailable task means inspect exact class/unit/publication/prerequisites; never use an unrelated PDF as if it created a structured-writing response. Conflicting drafts preserve visible text and require explicit reconciliation. Do not repeat owner content approvals merely to investigate navigation.

## SOP 04 — Review, feedback and revision

**Owner/trigger:** the current authorized teacher reviews a submitted writing version in the selected class/unit.

**Permanent entry:** sidebar → `Գրավորի ստուգում` → select active/archived class and exact unit → choose Pending, Returned, Reviewed or All → open a response. URL state retains the authorized class/assignment/release/unit and status filter. No class is selected implicitly on a fresh entry; no writing queue is read until a valid class/unit is selected. Already-reviewed work remains discoverable with zero pending submissions. Existing class/unit review is also retained.

**Steps:** Writing card → `Բացել գրավոր աշխատանքները` → `Սպասում են ստուգման` → open learner submission → inspect full prompt/rubric/text → either score every criterion and provide feedback with `Ուղարկել գնահատականն ու մեկնաբանությունը`, or provide revision instructions with `Վերադարձնել վերանայման`.

**Today shortcut (16.5B.10):** Home → `Շարունակել ստուգումը`, or a class card's pending-writing button → open the exact submission → use the same review/return actions above. The queue is oldest first across current authorized school contexts; its timestamp and selected-class label define coverage. After the saved result appears, `Հաջորդ աշխատանքը` opens the next pending response. `Վերադառնալ հերթին` retains the class filter. Reload reauthorizes the selected response; an unavailable queue is not a zero count. The original class/unit route remains available, including its existing historical read-only access.

**Draft step:** partial rubric choices and feedback autosave after 750 ms; `Պահպանել սևագիրը` or Ctrl/⌘+S saves explicitly. The acknowledged draft is private to this teacher and frozen submission. Personal comments can be created/edited/archived/restored and inserted into this draft; insertion never sends. Tab/Shift+Tab and the feedback focus shortcut remain native keyboard controls.

**Confirmation/result:** explicitly sent assessed/returned state, visible on the learner's same writing page. Returned work allows a revised draft and new submission. Every submitted/reviewed version remains in history. Regrading requires a reason. Human writing scores remain separate from automatic assessment/mastery.

**Recovery:** wait for the private saved acknowledgement before leaving. A failed save preserves text and can be retried. An uncertain publication freezes the review fields and offers `Կրկնել նույն ուղարկումը` with the original request ID. A stale-tab conflict preserves the text; copy what you need before explicitly reloading the last version. Empty queue requires checking class/unit/filter and whether work was actually submitted. A stale revision is a conflict, not permission to overwrite another review. Archived/ended contexts retain read-only controls. No push-notification delivery is implied by saving feedback.

## SOP 05 — Learner feedback and revision

**Trigger:** the learner's same writing task is reviewed or returned. My work → course → writing uses state-specific actions to open the result or revision.

**Steps:** open the task → read the current next-step guidance and teacher feedback above the editor → if returned, choose `Անցնել խմբագրմանը`, revise the existing draft and choose `Ներկայացնել ուսուցչին` → wait for the acknowledged submitted state. The previous frozen text is folded below the editor; complete submission/review history remains available. Assessed and historical read-only work has no editable response.

**Recovery:** draft-save failure preserves text; an unknown submission result keeps the existing read-only status recovery and blocks a duplicate send. Reopening or signing out retains the account/session safety contract. A teacher's private draft is never learner feedback.

## Four core journey shortcuts — PROCESS-01/U13

| Goal | Ordered route | Acknowledged result |
| --- | --- | --- |
| Teacher sends a material | Prepare material → explicit class/selected recipients and optional instructions → Send | Receipt and My-work destination; publication alone does not send |
| Learner submits writing | My work → writing task → requirements → write/save → Submit | Immutable submitted version and pending review |
| Teacher reviews | Writing review or Today → response/rubric → private save or explicit assess/return | Sent result; then Next/return to queue |
| Learner revises | Same writing task → current feedback → edit/save → Submit | New submitted version, earlier history preserved |

Teacher review shows the number of completed criteria and focuses the first missing score on an incomplete assessed send. Returning instructions requires a comment, not rubric scores; existing regrade-reason requirements remain. Cancellation keeps all receipt controls busy until its result. The shared status-check label is concise; its accessible name retains the read-only logout meaning. These are presentation/control changes; current verification and bounded production-evidence reuse are recorded in [the review record](workflow-simplicity-review.md).

## Explicit future capabilities

- **WRITE-CREATE:** ordinary-teacher custom prompt/rubric creation and explicit class/selected-student writing assignment; requires its own versioned content/recipient/publication contract.
- **RESOURCE-SUBMIT:** text or file responses to PDF/link resource assignments, submission history, review and grading; requires its own response/storage/privacy/audit lifecycle.
- Resource deadlines, completion states, read receipts and notifications retain later S37 dependencies. B.11 adds private feedback autosave and personal snippets under the [feedback contract](teacher-feedback-workspace.md). Batch publication remains unimplemented until a separate bounded preview/per-item result/audit contract is accepted.

None of these is enabled or implied by the new names, entry cards, guide or resource publication buttons. Existing writing submissions/feedback remain functional. All 45 capability mappings and existing release gates are preserved.

## Verification and evidence — B.8.2 origin

This presentation/client-coordination slice changes no SQL, Edge bundle, grants, privacy, source access, scoring or content approvals. Existing server contracts and verified writing/tenant evidence are reused unchanged. Native regressions must distinguish optional publication from My-work delivery, teacher links from writing review, current/stale/account-switched contexts, and guide/mobile/200%-text usability. Required CI and current deployment/source evidence close the slice. Final owner usability acceptance and the full four-subject gate remain separate.

Release verification: all five required PR/main gates pass (1,488 unit/integration; 216 native browser checks), focused native workflows 94/94, guarded live workflows 149/149 and 54+54 tenant isolation. Same-class exclusion, ambiguous publication, context/account changes and writing review retain isolated/current-source evidence; no new production writing submission or content approval is claimed. [Delivery record](workflow-boundaries.md) · [Release evidence](evidence/workflow-boundaries-release-20261028.json).

**B.10 verification:** [Today delivery contract](teacher-today-workspace.md) records the new scoped metadata service and direct review path. It does not change writing publication, submission, grading or the original class/unit review procedure. Final owner usability remains B.12.

**B.11 verification:** [Feedback contract/evidence](teacher-feedback-workspace.md) records private autosave, own comments and explicit atomic publication. PR/main gates pass 1,526 unit/integration and 241 native checks; production reads pass 47/47 with 54+54 isolation. Positive learner receipt/return/revision is isolated actual-SQL/native evidence. No production learner grade is created for QA.

**B.12.1 verification:** [Sharing-preview delivery](teacher-sharing-preview.md) records the shared learner projection and inert preview controls. PR/main gates pass 1,529 unit/integration and 247 native; production passes 158/158 with 54+54 isolation and run-owned cleanup. No learner task is sent by previewing. B.12.2 performance and B.12.3 final owner usability remain.

**B.12.3.1 verification:** [Permanent writing-review delivery](teacher-writing-review-navigation.md) passes all five PR/main gates (1,561 unit/integration; 266 native), both schools’ four real status queues and 73 production checks with 54+54 isolation. The existing publication/learner receipt contract remains. Full owner usability and the separate generic JavaScript error remain open.


## B.12.3 owner review context — 2026-10-29

John confirms completing the instructed separate ordinary English Grade 7 demo setup. Use that class to review teacher navigation, subject/context selection and empty states. With no enrolled learner or submitted writing, an empty roster/review queue is expected; it is not delivery/submission evidence. The [four-journey review checklist](workspace-final-followups.md#owner-usability-review) distinguishes those checks from delivery, writing and feedback in a permitted class with a test learner. Existing actual-SQL/native and guarded production evidence is reused; no fresh production submission/grade or API capability is added. SOP 1.5 procedures are unchanged.
