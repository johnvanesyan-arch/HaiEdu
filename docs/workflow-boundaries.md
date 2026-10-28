# Sprint 16.5B.8.2 — Library, assignments and writing procedures

2026-10-28 Asia/Yerevan · owner-authorized correction · verification in progress.

John accepts the distinction between assigned work and optional resources, the Library rename and separate teacher entry points with a clear SOP. Custom writing creation and student submissions for PDF tasks stay future work. This bounded slice precedes B.9; it does not implement the full Forest staff redesign.

## Shared delivery

- Student My work retains assigned-resource inbox/history plus course-scoped writing, drafts, submissions and feedback. Its duplicate Library button is removed.
- «Հավելյալ նյութեր» becomes «Նյութերի գրադարան» across current student desktop/mobile navigation, courses, student/staff pages and all staff/reviewer resource links. Existing URLs and authorization remain unchanged; mobile uses the compact visible «Գրադարան» with the full accessible name.
- The teacher class/unit workspace has separate Library, Resource assignments and Writing review cards. Links share only the current authorized context; they clear during loading/errors, navigation/account changes and stale responses. Writing review stays lazy, with no extra class/queue fan-out.
- The teacher material form exposes `Հրապարակել գրադարանում` separately from `Հրապարակել և ընտրել ստացողներին` and draft saving. Both use the existing file validation, save/upload/QA/publication and retry coordinator. Library publication does not open recipient confirmation or create My-work assignments. Assignment sending remains explicit.
- `intent=assign` is an actor-neutral display hint, retained across authorized teacher context changes; it has no access or side-effect authority. Platform authoring keeps manual reviewer/MFA publication.
- An accessible Armenian [teacher guide](https://www.haiedu.am/teacher-workflows.html) is reachable from all three entry points and resource management. [SOP v1](teacher-workflows-sop.md) specifies trigger, actor, inputs, steps, confirmation, learner result, recovery and limits for optional publishing, resource assignment, curriculum writing submission and teacher review/revision.

## Scope and data boundaries

This shared core correction applies across governed subjects/grades/roles and preserves all 45 mapped capabilities. An assignment references an immutable published resource version; it does not duplicate the file or make class-library publication private to selected recipients. No SQL, Edge, RLS/grants, storage policy, content approval, scoring, audio or release configuration changes. Existing verified server/writing/tenant evidence is reused unchanged.

WRITE-CREATE (ordinary-teacher custom writing prompt/rubric/recipient creation) and RESOURCE-SUBMIT (responses/files, submission history and grading for PDF/link tasks) are explicitly unimplemented. Current structured writing and its human feedback remain functional where tasks are published. Resource downloading creates no completion/grade/submission. Due dates, notifications and read/completion tracking retain later S37 contracts. Teacher feedback autosave/snippets/batch review retain B.11 contracts.

## Verification scope

Native real-page regressions distinguish optional publication from My-work creation, show the same immutable PDF in the Library and assigned-work context, reconcile an ambiguous library publication without another publish, and verify separate teacher links without eager review reads. Existing file-first/lost-request/session, structured writing, student navigation and platform/MFA tests remain. Guide and teacher-entry reflow cover 360/768/1280 px and 200% text, keyboard and reduced-motion behavior.

The existing main-only guarded resource acceptance now starts from both real teacher entry points: create/upload/publish through Library, prove no My-work task, then use the distinct assignment entry, confirm recipients and download the exact PDF from My work. It checks all eighteen frontend files and retains both schools, server denials, pinning/cancellation/withdrawal, before/after isolation and run-owned cleanup. No production credentials enter isolated checks. Dependency graphs cover the new guide and its shared styles; computed context URLs were manually reviewed. Focused isolated browser verification passes **94/94** in [40702569559](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40702569559). Production results are pending.

The first required PR run passes all 216 native browser checks and both PostgreSQL/concurrency jobs; six VM role-boundary checks stop on the old DOM stub missing `removeAttribute`. The test double is updated to support that standard method; product code and all authorization assertions are unchanged. Required PR/main CI, exact deployment/source, scoped live acceptance and cleanup will be recorded before delivery closure. Reuse the unchanged independently verified persistent Production/Blocking attestation; successful CI/READY alone is not a fresh settings attestation. Documentation and source-verified Notion closure preserve the 13 native child pages. B.9 is next after this correction; PERF-02, DEMO-01, English C47 pause, final owner usability acceptance and full four-subject gates remain.
