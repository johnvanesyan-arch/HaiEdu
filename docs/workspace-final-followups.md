# B.12.3 — Final follow-up dispositions and owner review

2026-10-29 Asia/Yerevan · DEMO-01 owner-confirmed complete; final usability acceptance pending. This documentation-only checkpoint reuses the deployed application at `4961996d5d5ea81e26c0eb0a6e7ac59eae9103ac`. B.12.3/B.12 stay open and subject expansion stays paused. [Project status](project-status.md) is authoritative; [the single register](workspace-defect-register.md) owns current defects.

## Ordinary demo setup — owner-confirmed complete

John selected the recipient, then changed the requested ordinary demo from Physics to **English Grade 7**. He took over the supported invitation/class setup and confirmed “I did it” after being instructed to activate the invitation, sign in as the new demo teacher and create a separate empty class in Test School. The requested class name was «Անգլերեն 7 · ցուցադրական»; no actual class ID/name or new live permission read is asserted here. Accept that confirmation as operational completion of DEMO-01 without repeating the owner's work.

The recipient email and credentials are omitted from public documentation. Existing designated multi-subject QA identities/classes/grants remain protected. This checkpoint performs no production account, grant, class, learner, writing or grade mutation and claims no new authenticated demo-isolation result. [Owner-completion evidence](evidence/b123-demo-owner-completion-20261029.json) records the scope and source of completion.

## Original teacher error — bounded investigation complete

The earlier read-only Supabase investigation covered six teacher/writing/feedback endpoints in the requested 24-hour window ending 2026-10-29 16:35 UTC: 2,391 HTTP200, five HTTP401 and 624 HTTP403 responses, no HTTP5xx. The dataset includes QA traffic; denials are not all attributed to a particular actor/cause. No request headers, tokens or learner text were collected.

The original browser tab was signed out and retained no HaiEdu exception trace. An extension-metadata error is not an application diagnosis. Backend success does not rule out a client exception. The earlier repaired late SDK session rejection remains a separate reproduction. **UI-ERROR-01's historical cause is still unconfirmed.** During owner review, a recurrence needs the actual exception, time, route and triggering action, then investigation before acceptance. No speculative runtime fix or telemetry service is added.

[Earlier investigation/preparation evidence](evidence/b123-final-followup-investigation-20261029.json) preserves the initial Physics plan and subsequent failed administrator sign-in as historical checkpoints. Its pending-authentication status is superseded by the owner's completion above. The agent sent no invitation in those attempts.

## Owner usability review

The demo setup is complete; the following review is still pending. It concerns usability and logical, simple, easy-to-follow processes, not renewed content/audio approval.

| Journey | Owner observation | Necessary context |
| --- | --- | --- |
| Teacher prepares and sends a PDF/link | Attachment is upfront; publication and sending are distinct; class/selected recipients are clear; acknowledged receipt names the destination. Back/cancel preserve valid input. | Ordinary demo permits form/navigation/empty-state review. Sending needs a permitted class with at least one test learner. |
| Learner finds and submits writing | My work differs from optional Library; task requirements and next action are clear; saved draft and frozen submitted version have distinct states. | Existing permitted test learner/task. Do not manufacture a production submission or real learner evidence solely for agent QA. |
| Teacher reviews and sends feedback | Permanent «Գրավորի ստուգում» is discoverable; class/unit/status are clear; private save differs from send; assessment/return requirements and next action are understandable. | Existing reviewed example can be inspected without another mark. An empty demo review queue is expected, not a failure. |
| Learner reads feedback and revises | Current feedback precedes revision; action opens the correct editor; previous submission/history and return context remain clear. | Existing permitted writing/feedback example. Record a step not exercised rather than claim it passed from an empty class. |

Also check role-appropriate account return/logout and usable navigation on the owner's normal screen. The current technical packet already contains native narrow/enlarged-text and failure/retry coverage; owner setup confirmation is not an actual-device or assistive-technology certification. Report any remaining defect with page, triggering action, expected and actual behavior. A recurring generic teacher error must retain its underlying exception before navigating away.

John's explicit final usability decision is still required to close B.12.3/B.12. Subject expansion remains paused. All 45 capability mappings, existing content/audio approvals, classroom-assessed speaking, English C47 hold and the separate four-subject gate remain.

## Reused verified evidence

Runtime is unchanged from PR363/main `4961996d5d5ea81e26c0eb0a6e7ac59eae9103ac`: 1,569 unit/integration and 316 native checks; final native recovery-label visual review; 196 functional production checks with 54+54 isolation and run-owned cleanup; 73 final-source teacher-feedback reads with 54+54 isolation. See [release evidence](evidence/workflow-simplicity-release-20261029.json). No repeat authenticated QA, content/audio review or new performance claim is needed for this documentation-only disposition. Required repository CI and source-verified Notion synchronization still gate its delivery closure.
