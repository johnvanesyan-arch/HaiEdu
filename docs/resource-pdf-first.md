# Sprint 16.5B.8.1 — PDF-first resource authoring

2026-10-28 · owner-requested correction; deployed and verified.

## Finding

Read-only inspection after the previous closure finds one new PDF material, zero new assignments and a draft with no file bytes. Its audit contains creation and failed QA (`file_required`), with no attachment event. The original draft is left intact. The former form defaulted to a link and exposed PDF attachment after saving; multiple separate save, upload, QA, publish and send actions obscured the next step.

The earlier B.8 production acceptance proved assigning and downloading an API-prepared PDF. It did not prove teacher form creation/upload. That coverage gap is corrected rather than describing the earlier acceptance as a full authoring test.

## Teacher flow

1. Select the authorized class/course/unit and «Ավելացնել նյութ».
2. Select the PDF immediately (up to 5 MiB); its filename supplies an editable title. Check the local preview if needed, enter the source and retain the explicit rights/protected-assessment declarations. Description is optional; topic, purpose, language, duration, goal and recommendation are folded under additional details.
3. Select «Հրապարակել և ընտրել ստացողներին». The form saves the draft, attaches the PDF, runs existing QA and publishes. Progress and recoverable errors are visible. Library browsing controls are hidden while composing; the current context and Close action remain visible.
4. Review the whole class or selected students and explicitly confirm sending. A receipt identifies the assignment and recipient count. Students receive it under «Իմ աշխատանքները» → «Ուսուցչի առաջադրանքները» and open the protected PDF.

«Պահպանել սևագիրը» keeps the draft and attachment without publication or assignment. HTTPS materials remain supported. Existing missing-file drafts can be opened, attached and continued through the same primary action. Existing published material cards retain direct assignment. Selected task recipients do not restrict the already-published class library audience; the form states that audience before publication.

## Reliability and shared consumers

This is a subject-neutral browser correction to the shared supplementary module and stylesheet, used by teacher/platform authoring and the student library. Platform authoring gets upfront PDF selection but retains separate MFA-backed publication. Student cards and assignment service contracts remain unchanged. No Edge bundle, SQL function, grants, storage policy or migration changes; previously verified unchanged B.8 backend evidence is reused.

PDF validation happens before creation, including size/header/EOF and valid normalization of an empty browser MIME field. The server independently validates the upload. An unknown upload response keeps the same draft and reconciles its authorized stored bytes by SHA-256 before retry. Unknown create/revision outcomes block unsafe duplicate creation and provide explicit catalog recovery. Writes lock context/actions; session/context changes invalidate old work and clear local files. New material versions retain reasons and immutable storage. No silent assignment, due-date, notification or completion inference is added.

## Verification and release evidence

New native real-page regressions use the actual SQL/HTTP handler fixture: file-first creation → publication → selected recipient → exact student My-work PDF bytes; invalid/oversize rejection; lost upload reply without duplicate upload/version; lost create recovery into an existing missing-PDF draft; locked context while uploading; sign-out during upload; keyboard and 360/768/1280 px at 200% text. Existing link, draft, QA, revision, selected/class assignment, late response and student library cases remain. These are isolated tests, not live learner evidence.

The guarded main-only production runner now creates, attaches, checks and publishes through the actual teacher page in both designated schools before class assignment and student PDF-byte verification. Its network guard permits only the run's uniquely named sources, exact PDF, created version IDs and existing fixture context; original material IDs are rejected. Existing selected-send, retry, pinning, cancellation, withdrawal, tenant isolation and run-owned cleanup remain. Nine frontend files must match the reviewed deployment before mutation. Original user materials and learning evidence remain untouched.

Focused isolated native browser verification passes **18/18** on [40638822283](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40638822283). The first two attempts exposed the 360 px/200% implicit grid-width overflow; the corrected grid passes all three sizes. [PR327](https://github.com/johnvanesyan-arch/HaiEdu/pull/327) and [scheduling PR328](https://github.com/johnvanesyan-arch/HaiEdu/pull/328) pass all five required PR/main jobs: **1,488 unit/integration and 209 native browser checks**. Implementation CI: [PR](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40639199541), [main](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40639527014). Scheduling CI: [PR](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40639644583), [main](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40640219348).

The first assignment run was canceled in GitHub's shared pending queue before any job started. PR328 changes its scheduling comment and documentation only; runtime, shared concurrency and reviewed-main guards remain unchanged. Its production deployment `dpl_EDnTmvj2qYduRwzamcpuKygP1dZR` is READY, and the guarded [acceptance run](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40640219356) verifies source `6753afaaad37ee562e8e6d37fcfe9380c31fc6fc` and all nine frontend files before proceeding.

**Live acceptance passes 126/126 checks**, including actual browser creation, PDF upload, QA/publication and whole-class send in both designated schools, followed by student My-work download of the exact PDF bytes. Selected send, retry, version pinning, cancellation, withdrawal and account inventories also pass. Tenant isolation passes **54 checks before and 54 after**. All four run-owned assignments are canceled and both run-owned logical materials withdrawn. Readback confirms the original user draft's status, missing-file state, fingerprint and two-event history remain unchanged. Same-class excluded-recipient and failure/race cases remain isolated evidence; no additional learner/content approvals are inferred.

Fresh [English Unit 3 compatibility](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40639527009) passes **154/154** against the unchanged implementation runtime. The other canceled pending English runs are recorded without fresh-pass claims. Existing unchanged backend/audio/writing evidence is reused. No Edge function, SQL, grants, storage policy or assessment changes are needed.

[Release evidence](evidence/resource-pdf-first-release-20261028.json) · [Redacted live report](evidence/resource-pdf-first-acceptance-20261028.json). The separately verified persistent Vercel Production/Blocking attestation is reused unchanged; CI or READY alone does not establish that setting. The final documentation closure leaves verified runtime source unchanged.

B.9 is next: shared Forest staff layout and Home → Classes → Review prototype. PERF-02, DEMO-01, all 45 mappings, English C47 hold and full four-subject gates remain. Final owner workspace usability acceptance is separate.
