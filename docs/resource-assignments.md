# Sprint 16.5B.8 — Resource assignments

2026-10-28 Asia/Yerevan · assignment capability deployed and verified; normal demonstration-account provisioning remains open.

Teachers can send a published PDF or HTTPS material to a whole class or selected students. Intended students receive it in «Իմ աշխատանքները» → «Ուսուցչի առաջադրանքները». This is the resource-assignment subset brought forward from S37; assessment builders, notifications and intervention services retain their own later contracts.

Owner authorization: implement this capability while preserving the B.6–B.12 sequence. Base source: `48211d1e780f951963769f240e7fa57cc8448cd8`. One primary agent; English remains paused after C47; PERF-02 and all 45 capability/dependency mappings remain.

## Using the feature

**B.8.2 workflow distinction:** select the dedicated Resource assignment entry in the teacher class/unit workspace. The separate Library entry and `Հրապարակել գրադարանում` action publish optional material without sending. Explicit Assign opens recipient confirmation and creates the My-work task only on send. The student library label is now «Նյութերի գրադարան». Structured writing is separate; this endpoint does not accept student responses/files or marks. [Teacher SOP](teacher-workflows-sop.md).

The [B.8.1 correction](resource-pdf-first.md) adds a PDF-first authoring path: choose «Ավելացնել նյութ», select the PDF, confirm its title/source and content declarations, then «Հրապարակել և ընտրել ստացողներին». It proceeds to the same recipient confirmation below. The correction is deployed and verified through actual teacher-form creation and student PDF download in both designated schools (126 live checks). Existing published materials retain the direct assignment action.

1. Open the teacher resource library and select the authorized class, course and unit.
2. Choose a published material and select «Ուղարկել առաջադրանք». Publishing to the library alone does not send a task.
3. Choose «Ամբողջ դասարանը» or «Ընտրված աշակերտները», review the recipients, optionally add instructions, then select «Ուղարկել առաջադրանքը».
4. The confirmation retains the assignment ID, time and recipient count. «Ուղարկված առաջադրանքները» opens receipts, recipient lists and reasoned cancellation/history.
5. Students open My work to see and download/open the assigned material with its class, subject, unit and instructions.

The existing library audience remains visible in the teacher confirmation. Selecting one task recipient does not make an already-published class/programme material private to that learner.

## Version 1 contract

- Optional library publication stays separate. An explicit teacher Assign action creates an immutable assignment tied to the selected teaching assignment, programme, release, unit and material version. Only an active authorized teacher can assign, using a currently published, QA-passed material for that context. Teacher-created materials remain in their original class context; platform materials retain their existing programme audience.
- Class mode snapshots the current eligible enrollment roster. Selected mode captures exact chosen enrollment IDs from that same roster. Both require the server preview fingerprint; changed membership, roster, material or authority must be reviewed again. Operational limits are 50 rows per page and 500 recipients per assignment; neither is a subject/grade assumption.
- Later joiners require another explicit assignment. Existing recipients, instructions and material version never change silently. Publishing a new material version does not replace the assigned version. Withdrawing the logical material makes previous assignments unavailable, even if a later version is republished. Cancellation is separate, reasoned, idempotent and audited.
- The teacher receives a durable assignment ID, timestamp, original recipient count and a recipient list with current account display names. Student names are not copied into immutable events. Deleted accounts/enrollments remove their recipient rows through the existing cascade pattern; the teacher's original count and non-personal audit remain. Account inventories include assignment records by role.
- A selected recipient list governs assignment visibility, not the already-published library audience. Teacher confirmation states that distinction. This slice does not create a new assignment-only publication model.
- Students see a paged current inbox in My work, with exact class/subject/unit context, teacher instructions and protected PDF/link delivery. Canceled records are folded into history. Every open rechecks recipient, live session, current enrollment/context, cancellation and withdrawal after file preparation. There is no public/signed file URL.
- No due dates, reminders, learner Done marker, read receipt or completion/grade/mastery inference in this version. Those need their own contracts. Resource opening is not assessment evidence.
- Retries reuse the original request UUID and exact payload. Reusing it for another payload conflicts; double-clicks cannot create multiple assignments. Old account/context responses cannot update a new page. Recipient search/history/inbox are bounded; no per-class eager analytics is introduced.


## Verification

All five required jobs pass on implementation PR [40581820805](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40581820805), implementation main [40582617726](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40582617726), acceptance-scheduling PR [40583298498](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40583298498) and acceptance main [40584068872](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40584068872): **1,488 unit/integration and 201 native Chromium checks**. They include ten assignment SQL cases, four actual-SQL handler cases, seven independent PostgreSQL 17 race cases and six new native assignment journeys. Browser coverage includes lost-response retry, selected recipients, stale rosters, late account/context changes, keyboard use and 360/768/1280-pixel layouts at 200% text. The dependency graph covers ten browser acceptance targets.

Reviewed-main production [40584068878](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40584068878) passes **123/123 checks** against `c8303acdf31cfd2732ddcf93d5e11cbd59bebbee`:
- Ordinary designated teacher/student sessions in both schools; real teacher-browser whole-class send and 360-pixel student My work PDF download.
- Selected-student service send, exact retry deduplication, foreign-school denial and role-specific account inventory.
- Pinned PDF after a replacement publication, audited cancellation and logical withdrawal denial.
- Exact source/hash parity for all eight affected frontend files, before/after tenant isolation, and cancellation/withdrawal of only run-created assignments/materials.

Same-class unselected-recipient denial, platform-material assignment, stale roster/revocation, deletion compatibility and concurrent writes are isolated SQL/handler/browser evidence, not additional live learner claims. No learner answers, mastery, writing submissions or original user materials are changed.

Fresh staff production acceptance [40582617676](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40582617676) passes **147/147**. A separately triggered Chapter VI read run [40582617916](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40582617916) records **323/324**, then rejects the changed frontend commit at its final revision check after PR325 deployment. It is explicitly superseded evidence, not a full pass or a new curriculum regression claim. Previously verified unchanged assessment/audio/writing evidence is retained; the new assignment run verifies the affected feature on the current source.

## Deployment and release controls

[PR324](https://github.com/johnvanesyan-arch/HaiEdu/pull/324) merges as `40f9b4bc6ae708e996312efb6a2af0d2d8fbbde1`. The initial assignment live run was canceled in GitHub's shared pending QA queue before any job started. [PR325](https://github.com/johnvanesyan-arch/HaiEdu/pull/325) schedules the guarded run alone with a workflow-comment/documentation change; runtime files are unchanged. It merges as `c8303acdf31cfd2732ddcf93d5e11cbd59bebbee`, whose production deployment `dpl_F19fZ1mqC3jY6g7ySbnwLaPkxGDe` is READY. The final documentation closure reuses these unchanged runtime checks.

Local execution was unavailable. Pinned Supabase CLI **2.122.0** ran in isolated [40574946019](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40574946019), discovered its help and created `supabase/migrations/20261027200600_sprint_16_5b_resource_assignments.sql`. No production credentials were supplied to isolated CI. The additive migration is applied as remote history `20261027205636`.

All ten deployed SQL function bodies, all four files bundled with **manage-resource-assignments v1**, and **get-my-privacy v9** match repository source. The new endpoint imports unchanged auth/supplementary helpers; existing supplementary functions do not need redeployment. Three RLS tables have no direct anon/authenticated/service_role DML grants. The new tables' no-policy notices reflect intentional deny-by-default, and unused-index notices were recorded before live use.

The existing Production/Blocking deployment-check configuration attestation from [2026-10-20](evidence/vercel-deployment-check-verification-20261020.json) is reused unchanged. Successful CI or Vercel READY alone is not presented as a fresh configuration verification. [Release evidence](evidence/resource-assignments-release-20261028.json) · [Redacted live report](evidence/resource-assignments-acceptance-20261028.json).

## Remaining scope

**DEMO-01:** read-only inspection finds two active teacher profiles, both designated multi-subject QA. A normal Physics-only demonstration identity still needs selection/provisioning through supported account/invitation administration. No QA subject grants or credentials were removed. Existing institutional deletion/offboarding restrictions remain; this ledger adds no general permanent-delete operation.

**Next: 16.5B.9**, shared Forest staff layout and a reviewable Teacher Home → Classes → Review prototype, then B.10–B.12. PERF-02 remains open before B.12 performance acceptance. All 45 mapped capabilities, the English C47 pause and full four-subject gate remain; resource delivery does not close them. Final owner workspace usability acceptance remains separate.


## B.12.3 stabilization batch 1 — 2026-10-29

The recipient composer exposes unsent instructions/selections to its host leave guard. History, context changes and closing require a discard decision; page unload also warns. A stale roster keeps the instruction and selected-audience intent, clears stale recipient IDs and requires a fresh selection before sending. Pending/uncertain sends retain the existing request identity and prevent destructive navigation. Recipient choice is a focused second step, with explicit return to materials/history and distinct headings. [Defect register and process acceptance criteria](workspace-defect-register.md). All five implementation PR/main gates pass (1,561 unit/integration; 275 native), with 196/196 live checks, 54+54 isolation, thirty frontend hashes and complete run-owned cleanup. [Evidence](evidence/workspace-stabilization-assignment-release-20261029.json). Endpoints and backend authorization are unchanged; full workspace stabilization remains open.
