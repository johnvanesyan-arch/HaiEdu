# Written work in student and teacher workspaces

**16.1B.1 · 2026-10-20 · Implemented; production release verification pending.** John authorised implementation after reviewing the dashboard gap. This is the reusable writing capability slice of 16.1B. English content, final rubric/pass rules, automatic response formats and audio delivery remain separate work.

## Student and teacher mechanics

The governed course page has a **Գրավոր աշխատանքներ** tab. Approved tasks belong to an explicit programme, curriculum release and unit. Students see the prompt, suggested length and the complete rubric before writing. Drafts autosave after a short pause; manual saving is also available. Drafts are private to the student. Submission freezes a version and enters the teacher queue. Pending review is neither a zero nor a pass and does not block unrelated automatic work.

The assigned teacher opens **Գրավոր աշխատանքների ստուգում** in the existing institutional class workspace, filtered to the selected release/unit. The queue offers submitted, returned, reviewed and all submitted work. The teacher can record one integer level for each declared rubric criterion with feedback, or return the response for revision without assigning marks. The student sees feedback, edits a new draft and submits a new version. Regrading requires a reason and retains the original judgment. History includes the exact submitted text and every review.

Teacher feedback is saved when the teacher submits the review; it is not autosaved. Leaving an unsaved review prompts before discarding it. Student drafts are stored on the server, never as plaintext in local storage. The interface prevents duplicate submissions and ignores late responses after disposal/account changes. Repeated same-account auth refresh does not discard the current draft. Conflicts from another tab preserve the visible text and ask the user to refresh after keeping a copy.

Word count uses `unicode-whitespace-v1`: whitespace-separated tokens, with contractions and hyphenated expressions counted as one token. The declared min/max length is guidance, not an automatic failing grade. The UI does not enable spelling assistance unless the reviewed task explicitly declares it; a browser setting cannot guarantee that external help was absent.

## Versioned task contract and content gate

`written_task_versions.definition` has schema `extended-text-v1`: `title`, `prompt`, `locale`, `minWords`, `maxWords`, `wordCountConvention`, `baselineRequired`, `assistance`, `source`, `outcomes`, and `criteria`. Each criterion has a unique `key`, `label`, and an ordered array of descriptors (index 0 is the lowest score). There are 1–12 criteria and 2–11 levels per criterion; these are format bounds, not English assessment rules. This version reports the sum of the declared criterion levels without a pass threshold or weighting claim.

The task is bound to an actual programme/release/unit. Approval requires an active content reviewer/admin and recorded QA, review and source-comparison references. Approved definitions are immutable; substantive changes require a new version. A retired task can preserve already submitted evidence. Task authoring/publication UI is not included in this slice; reviewed content onboarding uses the governed catalogue transaction process. No English or synthetic task is seeded in production by this feature migration.

## API

`POST /functions/v1/manage-written-work` uses the signed-in Supabase client and returns `Cache-Control: no-store`. Top-level request: `{action, context, payload}`. Student context is `{enrollmentId,curriculumReleaseId,unitId}`; teacher context substitutes `assignmentId` for `enrollmentId`. Actor, school and class are derived on the server. Responses carry `version: "written-work-v1"`.

| Action | Role | Payload and result |
| --- | --- | --- |
| `tasks` | Student | Empty payload; task list and current state. |
| `open` | Student | `taskId`; prompt, rubric, private draft, submission/review history. Opening creates no record. |
| `save` | Student | `taskId`, `text`, `expectedRevision`; saves a draft, first save creates work. |
| `submit` | Student | Same payload; freezes a nonempty submission and increments revision. |
| `queue` | Teacher | Optional `state` and `offset`; up to 51 rows for a 50-row page and next-page detection. Draft-only work is omitted. |
| `inspect` | Teacher | `workId`; submitted versions and reviews, never the private draft. |
| `review` | Teacher | `workId`, `expectedRevision`, `decision` (`assessed` or `return`), `feedback`; `scores` for assessed, `changeReason` on regrade. |

Text is limited to 20,000 characters, feedback to 4,000, and request bodies to 100 KB. Conflicting revisions return 409; invalid input 400; unavailable context/role/session 403; unauthenticated access 401. Browser roles cannot query the four new tables or call the service RPC directly. The public RPC wrapper is invoker-only; the private worker is a narrowly granted definer function with an empty search path. Only the Edge service can execute it.

## Access, history and privacy

The transaction validates the live Auth session, account, exact membership/enrollment or teacher assignment/grant, class/year, programme, release and unit. It locks authority rows and rechecks expiry after waits. Archived/ended teacher contexts are read-only. A valid replacement teacher assignment can review prior submissions in that exact class/year/subject context. Legacy contexts without governed institutional selectors are not given a new bypass.

The state machine is `draft → submitted → reviewed`, with `submitted/reviewed → changes_requested → submitted` for revision. New submissions and reviews append immutable versions; optimistic revisions and row locks prevent competing saves/submits/marks from overwriting each other. No automatic attempts, mastery records, release policy or Physics content is changed.

The privacy inventory counts student writing and teacher-owned marks. Authorised student erasure cascades through drafts, submissions and reviews. Staff deletion removes the assessor/reviewer link while preserving the judgment and content-review evidence. Ordinary users cannot delete immutable versions. Broader school/year archival follows existing governance.

## Verification and release boundary

The local full regression run passed **1,335 tests**; the new read-only acceptance guard passed separately. Thirteen focused SQL/Edge/privacy tests and two native Chromium writing flows passed. The browser uses actual student/teacher pages, the real writing module and Edge handler, and the real SQL migration in PGlite; credential verification is an explicit synthetic double. Local Chromium is 153.0.8010.0 from the separately installed test runtime, not an installed production dependency. The required CI job additionally runs isolated PostgreSQL 17.6 concurrency and the project's pinned Playwright browser.

Production acceptance extends the existing reviewed-main, designated-two-school read workflow: authorised empty task/queue responses, cross-school denials, direct-table denials and native student/teacher empty states. It creates no tasks, student text, marks or learning attempts. End-to-end writing submissions are verified in the isolated fixtures; production content-specific acceptance belongs to the first published writing task. This feature does not declare an English unit mastered or activated.

Release checklist: passing required CI/aggregate; applied migration and exact function readback; both affected Edge bundles (`manage-written-work`, `get-my-privacy`) verified; exact production frontend revision; guarded production read acceptance; aligned status and merged-source Notion sync. [Current status](project-status.md) is authoritative.
