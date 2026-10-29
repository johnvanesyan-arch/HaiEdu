# B.12.3 — Four teacher/student workflow simplicity review

2026-10-29 · PROCESS-01/U13 · Shared core presentation/control slice. Functional implementation verified; final label-only polish follows the closing CI/visual gate. B.12.3/B.12 remain open and subject expansion stays paused.

## Purpose and scope

Each process must show its current purpose/context, necessary ordered inputs, one primary action, safe return/cancel/retry, preserved input and an acknowledged result. John approved simplifying the four core journeys. Optional Library publication remains a supporting procedure with a separate result, not a student assignment. [SOP 1.5](teacher-workflows-sop.md) and the Armenian in-product guide describe the same procedures.

| Journey | What changed | Retained boundary |
| --- | --- | --- |
| Teacher prepare → recipients → send/receipt | Preparation names the next step; recipient summary states class versus selected audience and count; the receipt names the My-work destination. Cancellation locks reason, cancel and header navigation together and focuses a missing reason. | Publication and sending remain separate. Exact class/unit, pinned source, live roster, request identity and reasoned/idempotent cancellation remain server governed. |
| Learner find → requirements → write/submit/status | Task Open actions reflect current state; each task shows what to do next and distinguishes a private draft from a submitted version. | Existing prompt, assistance policy, rubric, baseline prerequisite, autosave, immutable submission and unknown-outcome recovery remain. |
| Teacher find → review/private save or send → continue | Required assessed/return inputs are explicit; completed-criterion count derives from the actual rubric; an invalid assessed send focuses the first missing score. | Private autosave and explicit publication stay separate; returning feedback needs no scores. Existing regrade reason, nonce/revision, conflict, pending and Today next/back rules remain. |
| Learner feedback → revise → return/submit | Latest feedback/result appears before the editable draft; a direct action focuses revision; previous submitted text is folded while full history remains. | A revision creates another frozen version. Assessed/read-only work stays noneditable. No private teacher draft is exposed. |

UX-ACCOUNT-04 shares the concise visible status-check label `Կրկին ստուգել`; its accessible name states logout status and that logout is not repeated. The underlying account controller/Auth scopes are unchanged.

## State review and evidence matrix

The entries below name required observations and the existing/current native suites that must pass. They are not human usability acceptance or an assertion that every production failure was injected. Positive writing/feedback mutations use isolated actual SQL/handler/browser fixtures. Production checks use existing writing receipts and run-owned resource records only.

| State | Teacher material/send | Learner writing/submission | Teacher review/feedback | Learner feedback/revision |
| --- | --- | --- | --- | --- |
| Normal | PDF/link preparation then explicit recipients, optional instructions and preview | My-work course links to the exact writing task; requirements before input | Today/permanent queue opens frozen text and rubric | Same task shows current feedback before revision and an edit-focus action |
| Empty | No material/roster or selected count zero has a clear message; zero recipients cannot send | No published task/required baseline is explicit | Empty Pending is distinct from Reviewed/Returned/All | No review means pending, never an invented zero/result |
| Invalid | File/declarations/recipient/reason validation retains valid input; missing cancel reason gets focus | Blank/invalid response remains editable with guidance | Missing required comment uses native validity; missing score gets focus; return does not require grade | Noneditable historical/assessed work never offers revision |
| Failed | Existing create/upload/send recovery retains input and recipient intent | Draft failure preserves text; failed status read retains unknown submission | Failed save retains private text; conflict cannot overwrite another review | Lost/rejected reads cannot restore another account/task |
| Pending | Duplicate sends locked; cancellation header/reason/action visibly disabled | Uncertain submit blocks mutation/navigation; exact-text status read only | Uncertain publish freezes fields and blocks unsafe leave/logout | No edit/submit replay while the current submission outcome is unknown |
| Retried | Same send nonce; stale roster still requires an explicit new recipient selection | Immutable IDs plus exact text confirm a committed submission; unchanged draft permits explicit retry | Same publication request ID/receipt, no duplicate review | Reopen/reload retains exact task/context and version history |
| Completed | Durable receipt/count/destination; canceled task leaves current inbox, source stays in Library | Submitted version is visible and waits for review | Assessed/returned acknowledgement; Next/queue retain authorized scope | Score/feedback visible; revision adds a new submission and keeps previous history |

Native sources: `tests/browser/resource-assignments.browser.test.mjs`, `written-work.browser.test.mjs`, `teacher-feedback.browser.test.mjs`, `teacher-review.browser.test.mjs`, `teacher-today.browser.test.mjs`, `account-signout.browser.test.mjs` and the teacher-workflow guide. Existing failure, account-switch, permission and narrow/200%-text assertions remain. New assertions cover held cancellation, missing-score focus/partial criterion count, feedback-before-editor order and concise status action/accessibility.

## Consumer and server audit

- `supplementary-resources.mjs` serves teacher resource preparation; role-gated text changes do not alter reviewer publication controls.
- `resource-assignments.mjs` serves teacher composer/receipt and learner inbox. New locking affects receipt mutation/navigation; student recipient/source authorization is unchanged.
- `written-work.mjs` and its stylesheet serve student Course and all mounted teacher class/unit, Review and Today paths. Teacher response/rubric remains visible; learner feedback moves without changing returned data.
- `teacher-feedback.mjs` is used through that shared mount, including Today; its generated teacher dependency bundle is rebuilt. Startup bundle and SDK/dependency versions are unchanged.
- `account-signout.mjs` remains shared by all fourteen interactive consumers; only visible/accessible label text changes. Reuse the prior SDK/scope/identity-safety evidence and rerun native consumers.

No SQL, Edge, grants, authentication policy, storage, source delivery, scoring, content/audio, question approval, assessment or learner release changes. No custom teacher writing creator, PDF-response submission, notification/deadline/completion tracking or batch grading is added. All 45 capability mappings, English C47 hold and the separate four-subject gate remain.

## Delivery and remaining acceptance

Implementation PR/main CI passes 1,569 unit/integration and 316 native checks. Functional [production acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40905555878) passes 196/196, 54+54 isolation and complete run-owned cleanup on `dad2e02b7501cf497cfabec5910160f0a9bc3e5d`; all eight frontend files match public bytes. The closing runtime changes only the visible status-check label plus docs/tests: reuse the unchanged functional production evidence explicitly, rerun the required closing PR/main gates, inspect the final enlarged-label native image before merge and verify final public source/eight-file parity. Source-verified Notion synchronization follows the merged closing commit. [Technical index](evidence/workflow-simplicity-release-20261029.json) preserves sources, checks, initial pre-auth stopped read attempt and scope. Earlier assignment/writing/account evidence is reused only for unchanged contracts, with current native checks required for changed display/control paths. No fresh latency, actual-device/assistive-technology survey, persistent Deployment Check configuration or full four-role authenticated acceptance is claimed.

After verified delivery, resolve remaining single-register investigations/operational dispositions, then obtain John's final concrete usability decision. UI-ERROR-01's original historical cause remains unconfirmed; DEMO-01 must retain intentional QA grants. Subject expansion stays paused.


## Enlarged-text visual correction before closure

PR362 passes 316 native checks, but its downloaded 390 px / computed 200% text image still splits the final Armenian article from the initially shortened status label. Geometry remains 390/390 with no outside elements; passing reflow alone did not establish readable word wrapping. The final visible action is shortened further to `Կրկին ստուգել`; its full accessible name explicitly checks logout status without a second logout mutation. The final native screenshot must be visually inspected before merging the closing batch; a passing geometry check alone is insufficient. This is a label-only correction; all account outcome/scoping behavior is unchanged.
