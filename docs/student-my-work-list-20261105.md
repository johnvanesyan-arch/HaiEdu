# Student My work as one list — 5 November 2026

This builds on the PR416 status filter: one merged My work list from a new read-only endpoint. John approved it on 5 November 2026, including a new Edge Function.

**Scope.** It is shared core and applies to every subject, grade, school and release. There is no schema or SQL change. Authorization stays in the three existing service functions.

## What changes for the learner

- **One list.** Teacher tasks, writing assignments and material assignments appear newest first, instead of in three sections.
- **Exact counts** on «Կատարելու · Վերադարձված · Ներկայացված». If a source has more than 1,000 items, the count is marked `+`. If a source fails to load, the counts are hidden and the failed source is named.
- **Course filter** («Դասընթաց»), shown when the learner has work in two or more courses.
- **One «Թարմացնել»** reloads the single endpoint.
- **Cancelled work** sits in one «Չեղարկված աշխատանքներ» disclosure. It is never counted or filtered.
- **Opening an item reuses the existing flows:**
  - teacher tasks open in place, through the existing deep link, with its unsaved-work, recovery and submission rules. «Վերադառնալ ցանկին» returns to the list only after the same «leave without saving?» confirmation.
  - writing uses its existing `open` request and lands on the pinned task.
  - materials use the existing PDF download or external-link dialog.

## Server: `get-student-work` (`student-work-v1`)

`supabase/functions/get-student-work/index.ts` → `supabase/functions/_shared/student-work-handler.mjs`.

- The same identity checks as the per-source handlers: verified user token, `session_id`/`aal` claims, and the live-session gate before and after the reads.
- It calls `service_teacher_task_student_work`, `service_writing_assignments` and `service_resource_assignments` with their `inbox` action, as the same actor and session. Rows pass through unchanged.
- Each source is paged until `hasMore` is false, at most 20 pages of 50. A non-advancing offset or a malformed page marks that source unavailable.
- Any authorization error from any source denies the whole request (403). Other failures mark only that source `unavailable`.
- It is read-only: it writes no rows, opens no work and records no activity.

The full contract is in [API contract](api-contract.md).

## Fallback and compatibility

- **Until the function is deployed**, or whenever its first load fails, My work shows the PR416 three-section view. The site keeps working without the function.
- **Fallback never fires while a teacher task is open**, so unsaved text is never discarded.
- **List buttons keep the per-source attributes** (`data-task-open`, `data-wa-open`, `data-assignment-open`; list container `data-task-body`). The production acceptance scripts therefore work in both modes.

## Verification (isolated — not a live production check)

- **Real SQL** (`tests/student-work-handler.test.mjs`, 6 tests):
  - rows equal each source's own inbox exactly, newest first, with no writes to five work tables;
  - teacher, unsigned, inactive and widened requests are rejected;
  - history returns only cancelled work;
  - an unavailable source is reported while an authorization failure denies everything;
  - paging to the end, the 20-page bound and non-advancing offsets;
  - merge ordering.
- **Browser, synthetic fixture** (`tests/browser/student-work.browser.test.mjs`, 8 new tests; the 7 earlier tests now cover the fallback):
  - one newest-first list at 375 and 1280 px with exact counts and 44 px targets;
  - course filter and single refresh;
  - a named unavailable source with counts withheld;
  - `+` for unloaded pages, and history without actions;
  - writing open landing on the pinned task;
  - fallback to the sections when the endpoint is unavailable;
  - acceptance selectors kept.
- **Browser, real teacher-task backend** (`tests/browser/student-teacher-tasks.browser.test.mjs`):
  - a list item opens the task in place;
  - unsaved text survives a cancelled «leave» confirmation;
  - the saved draft returns to the list as «Սևագիր»;
  - the deep link clears;
  - nothing is submitted.

**Deployment status:** the Edge Function is not deployed by this change. Deployment and read-back need the owner's go-ahead.

**Owner usability acceptance:** not given.
