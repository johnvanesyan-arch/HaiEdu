# B.12.3 — Cross-role usability acceptance

2026-10-29 Asia/Yerevan · In progress: technical verification, then owner usability decision.

This is the remaining workspace exit, covering the available production programmes and neutral fixtures. It does not activate subjects, change content approvals or close the separate full four-subject gate. The 45 capability/dependency rows remain unchanged. Speaking stays classroom-assessed. WRITE-CREATE, RESOURCE-SUBMIT, DEMO-01 and batch feedback remain separately scoped.

## Acceptance matrix

| ID | Requirement | Technical evidence and scope |
| --- | --- | --- |
| U01 | Shared Forest navigation, context and predictable account/logout across roles | Current required native suite: real page layouts at 360/768/1280 px and 200% text; school/master/reviewer presentation uses simulated authorization. Student/teacher/school-admin production accounts are designated fixtures. No live master-admin session is claimed. |
| U02 | Teacher publishes/assigns to class or selected learners → intended My work → exact PDF → cancellation | Guarded resource-assignment workflow, run-owned synthetic resources/assignments only; recipient denial, immutable pinning and cleanup. Fresh results pending. |
| U03 | Learner My work → exact writing unit → existing feedback → same-context return | New read-only production journey pairs a pre-existing reviewed response with its teacher view where one exists. Empty school coverage remains explicit; no new writing submission or grade is manufactured. Complete submit/return/revise/assess lifecycle remains isolated actual-SQL/native evidence. |
| U04 | Teacher Home → class → review → next work, with zero/unknown/failed states | Current native SQL Today/feedback journeys; current source review navigation and read-only production context. Zero pending work never hides Reviewed/Returned filters. |
| U05 | Archive search, history and restore | Current native directory/paging/stale-response checks plus fresh production archive discovery. Existing restore service/action evidence is reused where source is unchanged; no historical record is deleted. |
| U06 | Private draft protection, retry and account/logout boundaries | Pending native regressions cover refresh/logout confirmation before abandoning feedback, initial session rejection, a late rejected session read after valid Home, synchronous/asynchronous auth callbacks and malformed dashboard responses. Existing stale-response, two-tab, publication receipt and logout tests remain. |
| U07 | Keyboard, readable focus, reduced motion and responsive layout | Shared skip link now retains sufficient contrast under role themes and an existing link's target main remains focusable. Actual shared UX/styles are audited across all 28 HTML consumers, with business/auth modules isolated. Existing functional pages retain 360/768/1280 and 200% text cases. |
| U08 | Teacher loading budgets and bounded reads | Recheck the existing guarded 150-observation desktop/4G profile, same two designated teachers and unchanged budgets; no fabricated pending work. Fresh results pending. |
| U09 | Tenant/recipient, role and session restrictions | Existing server contracts retained; required SQL races/isolation plus guarded production before/after isolation. No service credentials in isolated browser tests. |
| U10 | Forty-five mappings, subject/grade neutrality and feature readiness | Compare the unchanged 45-row coverage document and source hashes; UI changes contain no subject/grade default. No future feature becomes live by renaming or approval. |
| U11 | Release and provenance | All five PR/main CI gates, exact deployed frontend source/assets, run-owned cleanup, merged status/roadmap/backlog/API notes and exact-source Notion sync. Verification pending. |
| U12 | Owner usability acceptance | Remains a human decision after the concrete review packet/results below. The project exit rule requires owner acceptance before further subject/chapter work. |

## Repairs being verified

A delayed SDK startup session read can reject after INITIAL_SESSION has already opened a valid teacher Home. The old top-level await could produce an unhandled rejection and generic toast. The new auth-generation/settled-workspace guard ignores that superseded result. A genuine initial failure exposes the existing retry; unexpected dashboard data/render failures become a recoverable unknown state instead of an unhandled promise or invented zero. Refresh and logout ask before abandoning unsaved private feedback. No server authorization or session revocation check is removed.

This failure-injection reproduction establishes a real path to the reported symptom. The original user's exception was not captured, so its historical cause remains unconfirmed. UI-ERROR-01 cannot be described as historically diagnosed; if the generic message recurs in owner review, keep the gate open and obtain that exception.

The shared keyboard repair keeps the skip link readable under staff link colours and gives its actual main target keyboard focus, including pages with a pre-existing skip link. No business action or listener is added by that focus correction.

## Concrete owner review

Technical results will be filled in before requesting sign-off. Review is of the interface/workflows, not a repeat content/audio/bank approval.

- [Teacher Home](https://www.haiedu.am/teacher?view=home): useful current work, classes and available next actions; no false progress or pending count.
- [Writing review](https://www.haiedu.am/teacher?view=review): choose class/unit and Pending/Returned/Reviewed/All; inspect the existing reviewed QA example without publishing another mark.
- [Teacher guide](https://www.haiedu.am/teacher-workflows.html): publication versus assignment, writing submission/review and the explicitly future PDF-response/custom-authoring capabilities.
- [Student My work](https://www.haiedu.am/index.html?view=work) and [Library](https://www.haiedu.am/materials.html): assigned work and optional browsing have distinct destinations; writing/feedback return retains context.
- [Account](https://www.haiedu.am/privacy.html): role-appropriate return and logout. School/master/reviewer homes retain their own navigation and authority.

Automated viewport/text enlargement is not an actual-device or assistive-technology survey. True browser-chrome zoom and screen-reader usability are not claimed from headless emulation. The owner may check 200% browser zoom on their actual browser and report any issue; complete WCAG certification or measured user engagement is not implied.

## Owner decision record

Pending. A request to perform acceptance authorizes verification and fixes; it is not evidence that John has inspected and accepted the final result. No owner decision, human task-completion time or engagement metric is invented. Full B.12.3/B.12 and the English C47 hold remain until that decision is recorded.
