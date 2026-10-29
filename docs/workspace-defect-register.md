# Workspace stabilization — single defect register

2026-10-29 · B.12.3 remains open; subject/chapter expansion remains paused.

John authorized a stabilization cycle and added logical, simple, easy-to-follow forms, submissions and interfaces as acceptance requirements. The earlier technical checks are bounded baseline evidence, not whole-product usability acceptance. This register owns current defects; the backlog and Notion summarize/link it rather than maintaining competing lists.

## Process acceptance standard

Every supported process must show its purpose and class/subject/unit context, ask for necessary inputs in a logical order, identify required and optional fields, and provide a clear primary action for the current step. Publication, assignment, saving a draft and sending a response/grade must remain distinct. Students must know where to find the result and what to do next.

Back, cancel and retry must be discoverable and safe. Recoverable errors must preserve valid input and identify a useful next action. Pending or uncertain submissions must prevent duplicate sends and destructive navigation. Success must follow an acknowledged result and identify the recipient/destination. Repeated initialization, old responses or an account change must not restore another draft or recipient list. Keep protected delivery, authorization and assessment gates; simplicity does not waive them.

Use consistent labels, status language, focus/keyboard behavior and Forest controls across affected roles and pages. Implemented workflows and future capabilities must be clearly distinguished. Check normal, empty, invalid, failed, pending, retried and completed states at the agreed viewport/text sizes. These are acceptance criteria, not a claim that every process already meets them.

## Severity and exit

- P0: access/tenant violations, destructive data corruption or similarly blocking failures. Stop dependent rollout.
- P1: lost work, unintended recipients, blocked submission/review, misleading completion or a significantly confusing core process. Fix before closing the affected workflow.
- P2: usable workflow with a minor visual/copy defect; it may remain in the backlog with an explicit disposition.
- Investigation: a source risk or report whose runtime failure is not yet reproduced. Preserve the uncertainty and name the next check.

Exit requires no known P0/P1 defects in the agreed journeys, recorded verification and John's final usability acceptance. The separate four-subject gate, all 45 capability/dependency mappings, speaking-in-class policy and existing content/audio approvals remain. This approval is for stabilization; it is not final workspace acceptance.

## Defects and investigations

| ID | Priority/state | Reproduction and impact | Disposition/evidence |
| --- | --- | --- | --- |
| UX-ASSIGN-01 | P1 · batch 1 verification pending | Open a published material for assignment; select learners/type instructions; choose history, change context or leave. The composer exposes only busy/pending state, so unsubmitted choices can be discarded without a draft warning. | Add draft state to component/parent leave guards; preserve cancel/back state and restore focus. Native SQL regression covers history, context, close and browser reload; required CI pending. |
| UX-ASSIGN-02 | P1 · batch 1 verification pending | Select one learner, type instructions, then change the roster before sending. The stale-preview refresh redraws an empty instruction field and defaults to the whole class. A subsequent click can target more learners than the original selection. | Preserve instructions and selected-audience intent; clear stale learner IDs, keep send disabled until recipients are chosen, and retain the refreshed-roster explanation. Existing SQL/browser regression extended. |
| UX-ASSIGN-03 | P1 · batch 1 verification pending | Open recipient selection and then sent history. There is no explicit route back to materials or a fresh recipient choice; material browsing and the active form remain together. | Reuse the focused editor layout, add named return actions and distinct compose/history/receipt headings; disable navigation while a send is pending. This is the first process-simplicity batch. |
| UX-WRITE-01 | P1 candidate · next bounded investigation | Source audit: writing submission is not replayable at the old revision (`tests/written-work.test.mjs` asserts conflict on duplicate submit), while the client restores editing after a lost submit reply without a dedicated outcome-recovery action. | Reproduce a committed submit followed by a lost reply in the actual-SQL browser fixture. Determine safe readback/reconciliation before implementation. No new production learner submission or grade is authorized for QA. |
| UX-ACCOUNT-01 | Investigation · open | Shared account page awaits `signOut()` but redirects without inspecting its returned error. Runtime failure/role-wide consumer scope is not yet established. | Inject a rejected/returned logout failure and audit all logout consumers before selecting a shared fix. Do not claim successful sign-out or alter session protections from source inspection alone. |
| UI-ERROR-01 | Investigation · historical cause unconfirmed | Owner-reported generic teacher error lacks its underlying exception. A separate late SDK rejection path was reproduced/fixed in PR354. | Retain the original issue; capture its exception if it recurs. The earlier bounded repair is not proof of the historical cause. |
| DEMO-01 | Operational follow-up · open | Designated multi-subject QA teachers are unsuitable as a Physics-only demonstration identity. Their English grants are intentional test fixtures. | Provision an ordinary authorized demonstration identity through supported administration. Keep designated QA grants and tenant checks intact. |

## Journey audit coverage

Baseline source is `9951c2c0bac99e91ca3ed6d60309d7d89a906dbc`. The [earlier acceptance matrix](cross-role-usability-acceptance.md) and its evidence remain available; passed scenarios are reused where unchanged. An empty finding cell is not whole-interface acceptance.

| Complete journey | Boundary inspection and baseline | Current audit result |
| --- | --- | --- |
| Teacher prepares PDF/link → publishes → chooses recipients → sends → inspects/cancels | Actual client actions → existing material/assignment handlers and SQL → durable receipt; prior two-school 196-check production run and 54+54 isolation. | Batch 1 addresses the three assignment issues above; rights/safety gates, selected-recipient authorization, exact-context requests and idempotent send remain. |
| Intended learner → My work → assigned PDF/link; optional Library remains separate | Assignment inbox/open, learner cards and protected delivery; prior production exact PDF/version/cancellation evidence. | Student behavior unchanged; fresh bounded delivery verification follows batch 1. PDF response submission remains an explicitly future capability. |
| Learner → writing → draft → submit → returned revision → feedback → context return | Actual-SQL native lifecycle plus prior production read-only existing response/score and exact My-work return. | Happy-path baseline is retained. Lost-submit acknowledgement requires UX-WRITE-01; do not mark the workflow fully stabilized yet. |
| Teacher → Home/class/review → private feedback → publish/return → next work | Existing actual-SQL autosave, two-tab conflict, replayable publication, account revocation and rubric/text enlargement tests. | Baseline retained; inspect usability/error states with writing recovery in the next slice. Batch grading remains separately scoped. |
| Account → role-appropriate return → logout | Prior six-role-account production checks and native role layouts. | Normal-path baseline retained; failure recovery is UX-ACCOUNT-01. Live master-admin acceptance is not implied by school-admin fixtures. |
| Navigation → course/work distinction → review/archive → return; keyboard/responsive | Prior exact context journeys, 168 shared-UX cases, archive paging/stale-response tests and 150 timing observations. | Preserve baseline and recheck changed consumers. Actual-device, screen-reader and real browser-chrome zoom remain explicitly unverified. |

## Batch 1 delivery record

Implementation is in progress. Local syntax, QA trigger coverage and 25 assignment/handler/dependency checks pass. The local browser download is truncated; native browser verification must run in the credential-free CI gate. No browser result or owner acceptance is inferred from source inspection. Required PR/main gates, exact deployed source, bounded production delivery, cleanup, merged documentation and source-verified Notion synchronization are still delivery conditions.
