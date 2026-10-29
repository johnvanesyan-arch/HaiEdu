# B.12.3 — Original teacher error and ordinary demo account

2026-10-29 · Working preparation, not a completed delivery. Deployed source remains `4961996d5d5ea81e26c0eb0a6e7ac59eae9103ac`. B.12.3 stays open and subject expansion stays paused. The authoritative gate register is [project status](project-status.md); this note prepares the two items in the [single defect register](workspace-defect-register.md).

## Original teacher error

Read-only Supabase inspection covers six teacher/writing/feedback endpoints in the requested 24-hour window ending 2026-10-29 16:35 UTC. It returns 2,391 HTTP200, five HTTP401 and 624 HTTP403 responses, with no HTTP5xx. The dataset includes QA traffic; denials are not all attributed to a particular actor or cause. No request headers, tokens or learner text are collected in the evidence.

The original browser tab is currently signed out. Its retained logs contain no HaiEdu exception trace. An extension-metadata error is not treated as an application diagnosis. Current-source 316 native checks and 73 guarded teacher-feedback reads are reused; no authenticated UI reproduction is claimed from the signed-out tab. Backend success does not rule out a client exception.

**UI-ERROR-01 remains historically unconfirmed.** The earlier repaired late SDK session rejection remains a separate reproduction. During the owner's concrete review, if the generic toast recurs, retain the exact exception, time and route before changing the page. A recurrence blocks acceptance until investigated. No speculative runtime repair or new telemetry service is added.

## Prepared demo account

Both current active teacher identities are designated multi-subject QA fixtures. The class in the owner's original deep link is `English Unit 1 QA A`, with an intentional English assignment. This explains that class/subject context; it is not evidence of unauthorized Physics-to-English access.

| Field | Prepared scope |
| --- | --- |
| School | Test School |
| Role | Teacher |
| Subject/programme | Physics, Grade 7 only |
| Class | A separate empty class, «Ֆիզիկա 7 · ցուցադրական» |
| Recipient | Selected explicitly by John; targeted Auth lookup returned zero matches. Address omitted from public documentation. |
| Existing QA accounts, classes, grants and credentials | Preserved |

Use the existing authorized school/master-admin invitation flow. `provision-staff-account` validates the actor's live session, role/MFA where required, school/subject scope and target email; Auth sends the activation invitation. The recipient alone chooses their password. After acceptance, use the existing class/assignment workflow and verify Physics-only access. Do not write raw Auth/profile/membership/grant rows or infer an email alias to bypass the supported flow. No invitation has been sent and no account or class has been created.

**Current dependency:** the recipient is selected and confirmed unused. The first secure browser sign-in reached the content-team workspace, whose account cannot manage school invitations; it was signed out through the normal control. A separate administrator sign-in was rejected with the site's address/password error. No invitation was submitted. Continue through secure administrator sign-in or the documented authentication handoff; never request credentials in chat. Account creation, recipient acceptance and post-acceptance class setup remain pending; no completed-demo claim is made.

[Investigation and preparation evidence](evidence/b123-final-followup-investigation-20261029.json) contains aggregate results and the prepared procedure, without account emails or credentials. The follow-up used normal sign-in/sign-out only; no account, invitation, class or grant was created. Batch final authoritative documentation and source-verified Notion closure after administrator authentication and recipient activation are resolved. Existing content/audio approvals, all 45 capability mappings, classroom speaking, English C47 hold and the separate four-subject gate remain.
