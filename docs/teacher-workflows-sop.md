# Teacher workflow SOP — version 1.1

2026-10-28 Asia/Yerevan · B.8.2 procedures retained; B.10 adds a direct Today review shortcut.

The in-product Armenian [teacher guide](https://www.haiedu.am/teacher-workflows.html) is reachable from each teacher entry point and resource management. This document is the operating contract for those procedures. Source baseline: `3a92b4ec132df1d0b4978d7a2ec6afa5e38651ab`.

## Purpose and scope

The student destinations have different purposes: **Իմ աշխատանքները** contains assigned resource tasks and discovery of the learner's curriculum writing, submissions and feedback; **Նյութերի գրադարան** is independent supplementary-material browsing. A resource and an assignment referring to it are different records. Library publication does not send a task. Submitted work and feedback are stages of structured writing, not separate assignment types.

Teacher entry points are separate Library, Resource assignments and Writing review cards, all bound to the selected authorized class, subject, release and unit. Loading, failed/stale selection and account changes hide the entries and clear old links. The UI does not grant authority; every existing service rechecks context. Legacy/archived access retains its existing limits. No subject or grade is privileged.

## SOP 01 — Publish an optional resource

**Owner/trigger:** an active assigned teacher wants supplementary reading/practice available to the class, without sending work.

**Inputs:** exact class/unit; PDF up to 5 MiB or HTTPS link; title/source and explicit rights/protected-assessment declarations. Optional metadata stays optional. Platform content publication retains its separate reviewer/MFA flow.

**Steps:** teacher selects class/unit → Library card → `Բացել գրադարանը` → `Ավելացնել նյութ` → attach PDF/add link and confirm metadata/declarations → `Հրապարակել գրադարանում`. The existing coordinator saves, uploads, checks and publishes; `Պահպանել սևագիրը` stops before publication.

**Confirmation/result:** published status and explicit no-assignment message. Eligible class learners can browse it in Library; no My-work task, submission, completion or grade is created. A saved draft is not student-visible. Editing substantive content requires a new version and reason.

**Recovery:** a known failed upload retains the draft. Retry reconciles an ambiguous upload against stored bytes. An ambiguous create/revise blocks unsafe repetition and offers `Թարմացնել և գտնել սևագիրը`; inspect the saved draft before creating another. Invalid/oversize files must be replaced. Failed QA does not publish.

## SOP 02 — Assign a PDF or link

**Owner/trigger:** an active assigned teacher wants a class or selected learners to follow instructions using a published resource.

**Steps:** select class/unit → Resource assignments card → `Ուղարկել առաջադրանք` → choose a published material's Assign action, or add a new material and choose `Հրապարակել և ընտրել ստացողներին` → choose class/selected roster, add instructions, review recipient summary → `Ուղարկել առաջադրանքը`.

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

**Steps:** Writing card → `Բացել գրավոր աշխատանքները` → `Սպասում են ստուգման` → open learner submission → inspect full prompt/rubric/text → either score every criterion and provide feedback with `Պահպանել գնահատականը`, or provide revision instructions with `Վերադարձնել վերանայման`.

**Today shortcut (16.5B.10):** Home → `Շարունակել ստուգումը`, or a class card's pending-writing button → open the exact submission → use the same review/return actions above. The queue is oldest first across current authorized school contexts; its timestamp and selected-class label define coverage. After the saved result appears, `Հաջորդ աշխատանքը` opens the next pending response. `Վերադառնալ հերթին` retains the class filter. Reload reauthorizes the selected response; an unavailable queue is not a zero count. The original class/unit route remains available, including its existing historical read-only access.

**Confirmation/result:** saved assessed/returned state, visible on the learner's same writing page. Returned work allows a revised draft and new submission. Every submitted/reviewed version remains in history. Regrading requires a reason. Human writing scores remain separate from automatic assessment/mastery.

**Recovery:** teacher feedback is not autosaved; confirm its save before leaving. Empty queue requires checking class/unit/filter and whether work was actually submitted. A stale revision is a conflict, not permission to overwrite another review. Archived/ended contexts retain read-only controls. No push-notification delivery is implied by saving feedback.

## Explicit future capabilities

- **WRITE-CREATE:** ordinary-teacher custom prompt/rubric creation and explicit class/selected-student writing assignment; requires its own versioned content/recipient/publication contract.
- **RESOURCE-SUBMIT:** text or file responses to PDF/link resource assignments, submission history, review and grading; requires its own response/storage/privacy/audit lifecycle.
- Resource deadlines, completion states, read receipts and notifications retain later S37 dependencies. Personal feedback snippets, feedback autosave and batch review retain B.11 contracts.

None of these is enabled or implied by the new names, entry cards, guide or resource publication buttons. Existing writing submissions/feedback remain functional. All 45 capability mappings and existing release gates are preserved.

## Verification and evidence — B.8.2 origin

This presentation/client-coordination slice changes no SQL, Edge bundle, grants, privacy, source access, scoring or content approvals. Existing server contracts and verified writing/tenant evidence are reused unchanged. Native regressions must distinguish optional publication from My-work delivery, teacher links from writing review, current/stale/account-switched contexts, and guide/mobile/200%-text usability. Required CI and current deployment/source evidence close the slice. Final owner usability acceptance and the full four-subject gate remain separate.

Release verification: all five required PR/main gates pass (1,488 unit/integration; 216 native browser checks), focused native workflows 94/94, guarded live workflows 149/149 and 54+54 tenant isolation. Same-class exclusion, ambiguous publication, context/account changes and writing review retain isolated/current-source evidence; no new production writing submission or content approval is claimed. [Delivery record](workflow-boundaries.md) · [Release evidence](evidence/workflow-boundaries-release-20261028.json).

**B.10 verification:** [Today delivery contract](teacher-today-workspace.md) records the new scoped metadata service and direct review path. It does not change writing publication, submission, grading or the original class/unit review procedure. Final owner usability remains B.12.
