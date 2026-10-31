# B.12.3 — Final follow-up dispositions and owner review

**2026-10-31 — Teacher skill evidence corrected; final usability continues.** PR372 fixes UX-ANALYTICS-01 across the matrix, roster, support filters/counts and learner details: separate results, insufficient observations, unavailable indicators and no evidence have distinct labels; each original classification stays separate. Functional release `b927b2c23bc9572a143c7896e1524df52fb5cd51` is public/source-verified with all six changed web files exact. All five PR/main CI gates pass (1,633 unit/integration;366 native); three enlarged-text images are inspected. [Evidence and limits](teacher-skill-evidence-20261031.md). Backend/scoring/content/audio and the completed327/327 delivery acceptance are retained unchanged. **Next: compact Home/Today layout, clearer Practice history and remaining role-specific journey review. B.12.3/B.12 stay open; subject expansion stays paused.** All45 capability mappings, prior owner approvals, classroom speaking, English C47 and the separate four-subject gate remain.


2026-10-31 Asia/Yerevan · current technical prerequisite complete on6892b730: manual resource41191092937 passes327/327,54+54 isolation,49 frontend hashes and all run-owned cleanup. The owner-confirmed English7 demo setup stays accepted. Final role-specific consistency/usability is the next gate; B.12.3/B.12 stay open and subjects paused. [Current receipt](evidence/teacher-task-hosted-acceptance-20261031.json) · [Authoritative status](project-status.md) · [Single register](workspace-defect-register.md).

## Ordinary demo setup — owner-confirmed complete

John selected the recipient, then changed the requested ordinary demo from Physics to **English Grade 7**. He took over the supported invitation/class setup and confirmed “I did it” after being instructed to activate the invitation, sign in as the new demo teacher and create a separate empty class in Test School. The requested class name was «Անգլերեն 7 · ցուցադրական»; no actual class ID/name or new live permission read is asserted here. Accept that confirmation as operational completion of DEMO-01 without repeating the owner's work.

The recipient email and credentials are omitted from public documentation. Existing designated multi-subject QA identities/classes/grants remain protected. This checkpoint performs no production account, grant, class, learner, writing or grade mutation and claims no new authenticated demo-isolation result. [Owner-completion evidence](evidence/b123-demo-owner-completion-20261029.json) records the scope and source of completion.

## Original teacher error — bounded investigation complete

The earlier read-only Supabase investigation covered six teacher/writing/feedback endpoints in the requested 24-hour window ending 2026-10-29 16:35 UTC: 2,391 HTTP200, five HTTP401 and 624 HTTP403 responses, no HTTP5xx. The dataset includes QA traffic; denials are not all attributed to a particular actor/cause. No request headers, tokens or learner text were collected.

The original browser tab was signed out and retained no HaiEdu exception trace. An extension-metadata error is not an application diagnosis. Backend success does not rule out a client exception. The earlier repaired late SDK session rejection remains a separate reproduction. **UI-ERROR-01's historical cause is still unconfirmed.** During owner review, a recurrence needs the actual exception, time, route and triggering action, then investigation before acceptance. No speculative runtime fix or telemetry service is added.

[Earlier investigation/preparation evidence](evidence/b123-final-followup-investigation-20261029.json) preserves the initial Physics plan and subsequent failed administrator sign-in as historical checkpoints. Its pending-authentication status is superseded by the owner's completion above. The agent sent no invitation in those attempts.

## Owner usability review

The demo setup is complete; the following review is still pending. It concerns usability and logical, simple, easy-to-follow processes, not renewed content/audio approval. Use ordinary authorized teacher/learner accounts. The preserved demo class currently needs a separate ordinary learner if selected for paired delivery/submission, because its sole dedicated QA enrollment was intentionally ended; this does not reopen the accepted class/teacher setup. Existing permitted accounts/work may be used instead. Do not alter the protected multi-subject QA grants.

| Journey | Owner observation | Necessary context |
| --- | --- | --- |
| Teacher creates and sends own work | Assign writing → Create my task / drafts → choose editable text, private PDF or HTTPS source independently of the required HaiEdu text/PDF-DOCX/link response → preview → save → explicit recipients/send. Private save and send are distinct; the receipt names the destination. | Ordinary authorized class/unit. Sending needs at least one permitted test learner; later draft edits leave sent versions frozen. |
| Teacher shares optional materials | Library publication and sending a resource assignment are distinct. Optional Library remains separate from My Work; PDF attachment, selected recipients and cancellation are understandable. | Legacy resource assignments are read/download-only; choose a custom task when a learner response is required. |
| Learner finds and submits writing | My work differs from optional Library; task requirements and next action are clear; saved draft and frozen submitted version have distinct states. | Existing permitted test learner/task. Do not manufacture a production submission or real learner evidence solely for agent QA. |
| Teacher reviews and sends feedback | Permanent «Գրավորի ստուգում» is discoverable; class/unit/status are clear; private save differs from send; assessment/return requirements and next action are understandable. | Existing reviewed example can be inspected without another mark. An empty demo review queue is expected, not a failure. |
| Learner reads feedback and revises | Current feedback precedes revision; action opens the correct editor; previous submission/history and return context remain clear. | Existing permitted writing/feedback example. Record a step not exercised rather than claim it passed from an empty class. |

### Learning, analytics and role balance

| Role | Concrete route | What the owner checks |
| --- | --- | --- |
| Student | Courses → authorized unit → Diagnostic/Practice/Chapter or Unit Review/Mastery → personal progress | Existing policy prerequisites/results, weak areas and next actions remain clear. Missing evidence is labelled separately from weak performance; writing marks are distinct from automatic mastery. Use existing results where possible. |
| Teacher | Home → Classes → authorized subject/unit performance; then Assign writing and Writing review | Learning/skill progress, labelled colors/legend and support needs are discoverable alongside review. The selected school/class/subject/unit persists; course writing and own tasks are distinct. |
| School admin | School dashboard → governed year/programme/class/release/unit filters | School aggregates and labels are understandable and scoped to this school; no learner identities leak through the aggregate endpoint. |
| Master admin | Platform dashboard → explicit permitted school → oversight/security/audit | Platform responsibilities remain distinct, with original AAL2/access controls. This is owner review, not a claim of a new agent-authenticated master-admin pass. |

All45 mapped capabilities and their future dependencies remain; this checklist does not activate future features or change scoring. Current native/failure tests, Home/guide images and existing stable analytics evidence are reused. The fresh hosted run verifies delivery/navigation/account projections; it does not manufacture new scored attempts or human writing grades.

Also check role-appropriate account return/logout and usable navigation on the owner's normal screen. The current technical packet already contains native narrow/enlarged-text and failure/retry coverage; owner setup confirmation is not an actual-device or assistive-technology certification. Report any remaining defect with page, triggering action, expected and actual behavior. A recurring generic teacher error must retain its underlying exception before navigating away.

John's explicit final usability decision is still required to close B.12.3/B.12. Subject expansion remains paused. All 45 capability mappings, existing content/audio approvals, classroom-assessed speaking, English C47 hold and the separate four-subject gate remain.

## Reused verified evidence

Earlier baseline, reused only for unchanged consumers — PR363/main `4961996d5d5ea81e26c0eb0a6e7ac59eae9103ac`: 1,569 unit/integration and 316 native checks; final native recovery-label visual review; 196 functional production checks with 54+54 isolation and run-owned cleanup; 73 final-source teacher-feedback reads with 54+54 isolation. See [release evidence](evidence/workflow-simplicity-release-20261029.json). No repeat authenticated QA, content/audio review or new performance claim is needed for this documentation-only disposition. Required repository CI and source-verified Notion synchronization still gate its delivery closure.

Current custom-task/navigation source6892b730 retains1,630 unit/integration and364 native checks, seven new busy-read cases and the verified backend/runtime contracts. Fresh resource41191092937 passes327/327 with54+54 isolation and complete run-owned cleanup. The source/report/artifact and four synthetic captures are retained in [the current receipt](evidence/teacher-task-hosted-acceptance-20261031.json). This clears the technical prerequisite; it does not replace the explicit final owner decision.
