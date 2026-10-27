# Sprint 16.5B.8 — Resource assignments

2026-10-28 Asia/Yerevan · implementation in progress; not deployed.

Owner authorization: implement class or selected-student material assignment with delivery into «Իմ աշխատանքները», preserving the approved B.6–B.12 sequence. Base source: `48211d1e780f951963769f240e7fa57cc8448cd8`. One primary agent; English remains paused after C47; PERF-02 and all 45 capability/dependency mappings remain.

## Version 1 contract

- Optional library publication stays separate. An explicit teacher Assign action creates an immutable assignment tied to the selected teaching assignment, programme, release, unit and material version. Only an active authorized teacher can assign, using a currently published, QA-passed material for that context. Teacher-created materials remain in their original class context; platform materials retain their existing programme audience.
- Class mode snapshots the current eligible enrollment roster. Selected mode captures exact chosen enrollment IDs from that same roster. Both require the server preview fingerprint; changed membership, roster, material or authority must be reviewed again. Operational limits are 50 rows per page and 500 recipients per assignment; neither is a subject/grade assumption.
- Later joiners require another explicit assignment. Existing recipients, instructions and material version never change silently. Publishing a new material version does not replace the assigned version. Withdrawing the logical material makes previous assignments unavailable, even if a later version is republished. Cancellation is separate, reasoned, idempotent and audited.
- The teacher receives a durable assignment ID, timestamp, original recipient count and a recipient list with current account display names. Student names are not copied into immutable events. Deleted accounts/enrollments remove their recipient rows through the existing cascade pattern; the teacher's original count and non-personal audit remain. Account inventories include assignment records by role.
- A selected recipient list governs assignment visibility, not the already-published library audience. Teacher confirmation states that distinction. This slice does not create a new assignment-only publication model.
- Students see a paged current inbox in My work, with exact class/subject/unit context, teacher instructions and protected PDF/link delivery. Canceled records are folded into history. Every open rechecks recipient, live session, current enrollment/context, cancellation and withdrawal after file preparation. There is no public/signed file URL.
- No due dates, reminders, learner Done marker, read receipt or completion/grade/mastery inference in this version. Those need their own contracts. Resource opening is not assessment evidence.
- Retries reuse the original request UUID and exact payload. Reusing it for another payload conflicts; double-clicks cannot create multiple assignments. Old account/context responses cannot update a new page. Recipient search/history/inbox are bounded; no per-class eager analytics is introduced.

## Verification and closure

Use real SQL/handler tests for same-class selected/excluded recipients, foreign school/class/subject, stale rosters, revocation, immutable version delivery, withdrawal/republish, cancellation, retries and deletion compatibility; PostgreSQL races and native browser flows cover concurrent writes and stale responses. Production QA remains reviewed-main/designated-fixture-only and cleans up only its own records. Deploy/read back each changed Edge consumer. Close with required CI, exact production source, evidence, aligned merged summaries and source-verified Notion.

Local execution is unavailable. The pinned Supabase CLI 2.122.0 ran in isolated [preparation 40574946019](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40574946019), discovered its help and created `supabase/migrations/20261027200600_sprint_16_5b_resource_assignments.sql`. No production credentials were supplied to that runner. Backend drafts below are not a deployed capability.
