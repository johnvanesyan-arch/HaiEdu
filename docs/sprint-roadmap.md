# Armenian Curriculum Mastery Platform — Sprint Roadmap

**2026-10-30 — B.12.3.2 custom sending preparation continues, not deployed.** The working branch adds a saved-task → recipient preview → explicit send → durable receipt path. Isolated SQL/Edge checks verify frozen definitions, exact retry receipts after later edits, selected/class recipients, stale roster/draft rejection, duplicate prevention and foreign-owner denial. Sixteen focused authoring/source/delivery checks pass. The prior CI passed 1,591 unit/integration and PostgreSQL/concurrency checks but retained one narrow/200% heading overflow (328/329 native); the heading correction and new send regression require current-source CI. Delivery SQL is an isolated proposal, not a production migration or deployed endpoint. Learner text/document/link submission, My-work integration, teacher review/cancellation, privacy/retention and release acceptance remain unfinished. B.12.3/B.12 stay open; subjects paused.

**2026-10-30 — B.12.3.2 expanded teacher-task authoring is in progress, not deployed.** John authorizes independent task source (editable text/private PDF/HTTPS link) and required student response (HaiEdu text/PDF-or-DOCX/HTTPS link), private drafts, reuse, preview, class/selected recipients, durable receipts and feedback/revision history. The working branch connects private draft listing/editor navigation, conflict recovery and private PDF source upload; the published course-task path is retained. Fourteen focused definition/form/SQL/Edge/client checks pass at the PDF-source checkpoint. New native authoring coverage is prepared; current full CI/native, immutable custom-task delivery/submission/review, storage-policy/retention verification and release evidence remain pending. No live custom-authoring or learner file/link submission capability is claimed. [Contract](teacher-assignment-authoring-contract.md). **B.12.3/B.12 remain open; subject expansion is paused.** All 45 mappings, content/audio approvals, classroom speaking, English C47 and the separate four-subject gate remain.

**2026-10-29 — B.12.3 demo setup completed by owner; usability review next.** John changed the ordinary demo scope to English Grade 7 and confirmed completing the instructed teacher/class setup. DEMO-01 is operationally complete on that owner confirmation; no independent account/class audit or authenticated role-isolation pass is claimed. The original teacher error was investigated but its historical cause remains unconfirmed; recurrence requires the actual exception before acceptance. [Follow-up dispositions](workspace-final-followups.md) and [owner evidence](evidence/b123-demo-owner-completion-20261029.json) separate setup completion from final usability acceptance. **Next: John reviews the four teacher/student journeys. B.12.3/B.12 stay open; subject expansion stays paused.** All 45 mappings, existing content/audio approvals, classroom speaking, English C47 hold and the separate four-subject gate remain.

**Historical 2026-10-29 — B.12.3 PROCESS-01/U13 workflow simplicity delivered; owner usability remains open.** [PR362](https://github.com/johnvanesyan-arch/HaiEdu/pull/362) names material preparation → explicit recipients → delivery receipt, clarifies learner draft/submitted/feedback actions and places current feedback before revision. Teacher review explains assessed/return requirements, counts actual rubric criteria and focuses a missing score. Cancellation visibly locks receipt navigation until acknowledgement. Required implementation PR/main gates pass (**1,569 unit/integration; 316 native**). [Functional production QA](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40905555878) passes **196/196**, 54+54 isolation and run-owned cleanup on runtime `dad2e02b7501cf497cfabec5910160f0a9bc3e5d`; all eight changed frontend files match. No production learner writing or grade is manufactured. The closing batch further shortens the read-only account-status label, retaining its full accessible meaning and unchanged controller behavior; its final native image is a merge condition. Functional production evidence is reused explicitly for this label-only change ; final public source/bytes must match. [Four-journey review/state matrix](workflow-simplicity-review.md) · [SOP 1.5](teacher-workflows-sop.md) · [Evidence](evidence/workflow-simplicity-release-20261029.json). **Next: remaining single-register investigative/operational dispositions, then John's concrete usability decision. B.12.3/B.12 remain open; subject expansion stays paused.** All 45 mappings, content/audio approvals, English C47 hold and the separate four-subject gate remain.

**Historical 2026-10-29 — B.12.3 account/session recovery checkpoint; current process slice is recorded above.** [PR360](https://github.com/johnvanesyan-arch/HaiEdu/pull/360) gives every affected interactive logout entry point one outcome controller: confirmed local clearing, an explicit retry for a retained session, or a read-only status check for an unknown result. New logins release stale recovery locks; old results cannot change the newer account. Writing saves before logout, unknown submission/feedback publication stays guarded, and account input/results are fenced on identity changes. Temporary account/identity reads expose retry without forcing logout. Required PR/main gates pass (**1,569 unit/integration; 314 native**); [current-source production QA](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40894872170) passes **196/196**, 54+54 isolation and run-owned cleanup. All **23 changed frontend files** match the public runtime. No production learner submission or grade is manufactured. [Contract/consumer audit](account-session-recovery.md) · [Evidence](evidence/workspace-stabilization-account-release-20261029.json) · [Single defect register](workspace-defect-register.md). **Next: focused process-simplicity review of the four core teacher/student journeys**, then remaining defect dispositions and John's final usability decision. **B.12.3/B.12 remain open; subject expansion stays paused.** All 45 mappings, content/audio approvals, English C47 hold and the separate four-subject gate remain.

**Historical 2026-10-29 — writing recovery batch 2 checkpoint; superseded by the current delivery above.** [PR358](https://github.com/johnvanesyan-arch/HaiEdu/pull/358) reconciles lost submission replies through authorized history reads, preserves text during an unknown outcome, prevents duplicate sends and unsafe navigation, and offers a clear status-check/reload action with keyboard focus. The real learner shell and computed 200% text are covered; writing and course labels reflow on narrow screens. All five PR/main gates pass (**1,561 unit/integration; 281 native**). [Current-source live QA](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40861216601) passes **196/196**, 54+54 isolation and run-owned cleanup; thirty runner hashes plus the course stylesheet give **31** public byte matches. Positive existing reviewed-work/feedback evidence is from school A; school B verifies discovery/navigation without a reviewed response. No production learner submission or grade is manufactured. [Evidence](evidence/workspace-stabilization-writing-release-20261029.json) · [Single defect register](workspace-defect-register.md). At the writing checkpoint, account/logout recovery was next; the current next slice is recorded above. Logical, simple processes remain required; **B.12.3/B.12 are open and subject expansion stays paused**. All 45 mappings, earlier content/audio approvals, English C47 hold and the separate four-subject gate remain.

**Historical 2026-10-29 — B.12.3 assignment stabilization checkpoint; superseded by the current delivery above.** John approved an audit → defect register → shared fixes → journey verification → owner usability decision cycle. Logical, simple, easy-to-follow forms, submissions and interfaces are now explicit acceptance criteria. [Single defect register and process standard](workspace-defect-register.md) records severity, reproduction, evidence and remaining investigations. Batch 1 is delivered through [PR356](https://github.com/johnvanesyan-arch/HaiEdu/pull/356): assignment drafts are protected, stale rosters retain selected-audience intent and instructions, and recipient selection has a focused layout with clear return actions. All five implementation PR/main gates pass (1,561 unit/integration; 275 native). Live delivery passes 196/196, thirty frontend hashes, 54+54 isolation and run-owned cleanup. [Evidence](evidence/workspace-stabilization-assignment-release-20261029.json). Writing submission acknowledgement and logout failure recovery remain bounded investigations. Earlier passed checks are baseline evidence; **full B.12.3/B.12 is not accepted**. All 45 mappings, existing approvals, English C47 pause and the separate four-subject gate remain.

**Historical 2026-10-29 — B.12.3 technical verification complete; owner usability acceptance pending.** [PR354](https://github.com/johnvanesyan-arch/HaiEdu/pull/354) repairs superseded startup-session rejection, recoverable dashboard errors, private-feedback refresh/logout guards and shared keyboard navigation. All five implementation PR/main gates pass (**1,561 unit/integration; 273 native checks**). Guarded production acceptance passes **196/196**, with **54 before + 54 after** isolation, thirty frontend byte matches, existing writing/feedback receipts and complete run-owned cleanup. All **150** desktop/4G observations meet unchanged limits: useful Home p95 **2.29/1.72 s** cold/reload, selected class **1.33 s**, loaded navigation **42 ms**. [Acceptance matrix, evidence and owner review](cross-role-usability-acceptance.md). The closing batch broadens shared keyboard coverage to all 28 pages at three widths and 100/200% text, and records the fixture dependency trigger; runtime is unchanged. The original historical exception remains unconfirmed. **Next: final owner usability decision.** Full B.12, all 45 mappings, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, English C47 hold and the full four-subject gate remain.


**2026-10-29 — B.12.3.1 permanent writing-review navigation delivered.** [PR352](https://github.com/johnvanesyan-arch/HaiEdu/pull/352) adds «Գրավորի ստուգում», explicit active/archive class and governed unit selection, and visible Pending, Returned, Reviewed and All filters. Reviewed work remains discoverable with zero pending submissions. Exact deep-link/back context, private-feedback leave guards, historical read-only access and scoped retry/account cleanup remain; the obsolete B.9 prototype footer link is removed. All five implementation PR/main gates pass (**1,561 unit/integration; 266 native checks**). [Guarded production reads](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40828266585) pass **73/73**, with **54 before + 54 after** isolation, ten exact frontend hashes and run-owned session cleanup. No backend, permissions, content/audio, learner submission or grade is changed. [Contract/evidence](teacher-writing-review-navigation.md). **Next: remaining B.12.3 cross-role/recipient journeys and final owner usability acceptance.** The earlier generic JavaScript toast remains unresolved without its underlying exception. Full B.12, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, all 45 mappings, English C47 hold and the four-subject gate remain.


**2026-10-29 — B.12.2 teacher loading performance delivered.** Batched exact reads, verified-identity reuse, local SDK/font delivery and one-use role-gated startup overlap retain live/final authorization. All 150 final guarded observations complete on the recorded desktop/4G profile: useful Home p95 **2.47 s cold /1.75 s reload**, class opening **1.33 s**, loaded navigation **42 ms**; the unchanged 3 s /2 s /200 ms budgets pass. Original polling clocks, precise-before calibration, failed-target iterations and all samples remain in [the report](teacher-performance.md). All five required PR/main CI jobs pass (**1,561 unit/integration; 260 native checks**). Current frontend, all 22 teacher Edge file instances and six SQL bodies/grants match source; fixture sizes, existing evidence and run-owned cleanup are verified. [Measurement evidence](evidence/teacher-performance-final-20261029.json). **Next: B.12.3 cross-role/recipient journeys and final owner usability acceptance.** Full B.12, all 45 mappings, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, English C47 hold and full four-subject gates remain.

**Historical 2026-10-29 — B.12.1 learner-view sharing previews delivered.** [PR340](https://github.com/johnvanesyan-arch/HaiEdu/pull/340) reuses the actual student material/assignment card projection for teacher previews, with current instructions and inactive delivery actions. Published previews preserve unsaved edits; platform materials use the permitted catalogue read, and the control is visible above the editor form. Real disclosure/receipt motion respects reduced motion. All five required PR/main jobs pass (**1,529 unit/integration; 247 native checks**). Current-source [production acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40764554290) passes **158/158**, with **54 before + 54 after** isolation, two-school teacher-preview-to-student PDF delivery and run-owned cleanup. Nineteen frontend files match, with six changed-file hashes rechecked after acceptance; compatibility passes **142/142**. No backend, scoring, curriculum or audio change. [Contract/evidence](teacher-sharing-preview.md). **Next: B.12.2 teacher performance/PERF-02; B.12.3 retains final cross-role and owner usability acceptance.** All 45 mappings, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, English C47 hold and full four-subject gates remain.

**2026-10-29 — 16.5B.11 feedback workspace delivered.** [PR338](https://github.com/johnvanesyan-arch/HaiEdu/pull/338) adds governed rubric/response review, private feedback autosave, personal reusable comments, keyboard flow and explicit draft/sent states. Conflicts preserve text; lost publication replies retry one atomic receipt. Existing return/revision/regrade history and separate human marks remain. All five required PR/main jobs pass (**1,526 unit/integration; 241 native browser checks**), including six PostgreSQL 17 races. Current-source [production reads](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40756871503) pass **47/47**, with **54 before + 54 after** isolation; fresh compatibility passes **123/123**. All five frontend files, six SQL bodies, feedback Edge v1 and privacy Edge v10 match source. Positive publication/learner receipt uses isolated actual-SQL/native fixtures; no production grade was manufactured. [Contract and evidence](teacher-feedback-workspace.md). **Next: B.12 sharing preview, purposeful motion and final owner usability/performance acceptance.** PERF-02, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, all 45 mappings, English C47 pause and the full four-subject gate remain.

**Historical 2026-10-28 — 16.5B.10 Today workspace and live class cards delivered.** [PR336](https://github.com/johnvanesyan-arch/HaiEdu/pull/336) adds a timestamped, oldest-first writing-review queue, exact class filters, direct review/next/return and governed subject class cards. Recent context is teacher scoped, tab only and reauthorized; unknown/partial counts stay explicit, with no class-by-class analytics fan-out. Required PR/main gates pass all five jobs (**1,507 unit/integration; 237 native browser checks**). Current-source [production staff acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40741449470) passes **206/206**, with **54 before + 54 after** isolation and run-owned cleanup; preserved-programme reads pass **123/123**. All five changed frontend files, new Edge v1 and three SQL bodies match source. Nonzero direct-review flows use actual SQL/handlers in isolated native fixtures; live production queues are empty, without fabricated submissions. [Contract and evidence](teacher-today-workspace.md). Metadata p50/p95 is **1.36/1.78 s** across ten two-teacher reads; it is not paired response-opening timing. **Next: B.11 feedback ergonomics. B.12 retains final owner usability and PERF-02 performance acceptance.** DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, all 45 mappings, English C47 pause and full four-subject gates remain.

**Historical 2026-10-28 — 16.5B.9 shared Forest staff layout and teacher prototype delivered.** Common Forest/cream tokens, Armenian typography, compact headings/breadcrumbs and visible account/logout cover teacher, school/master administration, reviewer and shared account/resource/writing surfaces. All 23 accepted student palette values remain identical. The labelled, local-only [Home → Classes → Review prototype](https://www.haiedu.am/teacher-workspace-preview.html) includes ready/loading/empty/error/archived states and existing subject artwork. [PR333](https://github.com/johnvanesyan-arch/HaiEdu/pull/333) and [PR334](https://github.com/johnvanesyan-arch/HaiEdu/pull/334) pass all five required PR/main jobs (**1,488 unit/integration; 234 native browser checks**). Current-source [staff acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40725434252) passes **147/147**, with **54 before + 54 after** isolation checks and run-owned cleanup: four new classes archived and two new memberships ended. All **21 changed frontend files** match production; the scheduling change leaves runtime unchanged. Fresh compatibility passes **154 English + 123 preserved-programme reads**, without learning writes. [Delivery/evidence](forest-staff-workspace.md). **Next: B.10 scoped Today queue and live visual class cards.** PERF-02, DEMO-01, all 45 mappings, English C47 hold, B.12 final owner usability and full four-subject gates remain.

**Historical 2026-10-28 — 16.5B.8.2 workflow separation and teacher SOP delivered.** «Իմ աշխատանքները» contains assigned resources and writing/submissions/feedback; optional browsing is «Նյութերի գրադարան», consistently named across current student/staff/reviewer navigation. The duplicate My-work library button is removed. Teachers have separate class/unit-scoped Library, Resource assignment and Writing review entry points, with distinct library publication and explicit recipient sending. [SOP v1](teacher-workflows-sop.md) and the Armenian in-product guide cover all four supported procedures; custom teacher writing creation and PDF/link responses remain future capabilities. [PR330](https://github.com/johnvanesyan-arch/HaiEdu/pull/330) and [scheduling PR331](https://github.com/johnvanesyan-arch/HaiEdu/pull/331) pass all five required PR/main jobs (**1,488 unit/integration; 216 native browser checks**). Guarded production acceptance passes **149/149**, both teacher entry points in both schools, optional publication without a task, explicit assignment and exact student PDF bytes, **18-file source parity**, **54 before + 54 after** isolation and run-owned cleanup. [Delivery/evidence](workflow-boundaries.md). **Next: B.9 Forest staff layout and Home → Classes → Review prototype.** PERF-02, DEMO-01, all 45 mappings, English C47 hold and full four-subject gates remain.

**Historical 2026-10-28 — 16.5B.8.1 PDF-first teacher form correction delivered.** The latest PDF draft had no attachment and failed `file_required` QA; the former live test started with an API-prepared source and missed this authoring path. PDF selection is now upfront, the title is filled from the filename, optional metadata is folded, and one action saves/uploads/checks/publishes before explicit recipient confirmation. [PR327](https://github.com/johnvanesyan-arch/HaiEdu/pull/327) and [scheduling PR328](https://github.com/johnvanesyan-arch/HaiEdu/pull/328) pass all five required PR/main jobs (**1,488 unit/integration; 209 native browser checks**). Actual teacher-form creation through student PDF download in both schools passes **126/126** live checks, **54 before + 54 after** isolation checks, exact nine-file source parity and run-owned cleanup. Original user materials are preserved. [Correction and evidence](resource-pdf-first.md). **Next: B.9 shared Forest staff layout and Home → Classes → Review prototype.** PERF-02, DEMO-01, all 45 capabilities, English C47 hold and full four-subject gates remain.

**Historical 2026-10-28 — 16.5B.8 class/selected-student resource assignments delivered.** Teachers can explicitly send a published material to the current class roster or selected students, with a pinned material version, durable recipient receipt and audited cancellation/history. Intended learners receive it in «Իմ աշխատանքները» with protected PDF/link delivery. Publication alone remains optional library availability; opening a resource does not create completion or assessment evidence. [Contract and evidence](resource-assignments.md). [PR324](https://github.com/johnvanesyan-arch/HaiEdu/pull/324) delivers the runtime; [PR325](https://github.com/johnvanesyan-arch/HaiEdu/pull/325) schedules its isolated live QA slot without changing runtime code. All five required PR/main jobs pass (**1,488 unit/integration; 201 native browser checks**). Guarded production [acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40584068878) passes **123/123 checks**, both schools' teacher-to-My-work PDF journeys, retries, version pinning, cancellation and withdrawal, with run-owned cleanup and exact eight-file frontend parity. Assignment Edge v1, privacy Edge v9 and all ten SQL functions match source. **Next: B.9 shared Forest staff layout and Home → Classes → Review prototype.** PERF-02, all 45 capabilities, English C47 hold and full four-subject gates remain. **DEMO-01 stays open:** provision a normal Physics-only demonstration identity through supported administration; existing multi-subject QA grants remain intact.

**Historical 2026-10-27 — 16.5B.7 teacher loading repair delivered and measured.** [PR320](https://github.com/johnvanesyan-arch/HaiEdu/pull/320) adds bounded class discovery, on-demand detail/invitations, paged archive search and in-page navigation. Same-fixture production measurements pass **140 before + 140 after**: cold Home p95 **14.74 s → 4.61 s**, Classes **9.79 s → 0.04 s**. Class detail now loads on demand; remaining timing-target gaps and the trade-off are explicit in the [performance report](teacher-performance.md). Required PR/main gates pass **1,474 unit/integration and 195 native browser checks**; exact frontend, Edge v22 and SQL source parity are verified. Current-source staff acceptance passes **147/147**, with run-owned cleanup; fresh English compatibility passes **154/154**. [Release evidence](evidence/teacher-performance-release-20261027.json). **Next: B.8 class/student resource assignments**, then B.9–B.12. All 45 capabilities, English C47 hold and full four-subject gates remain.

**Historical 2026-10-27 — Cross-role B.6–B.12 accepted; B.6 navigation repair delivered.** [PR317](https://github.com/johnvanesyan-arch/HaiEdu/pull/317) keeps writing under My work on desktop/mobile with an authorized enrollment/release/unit return link. Implementation PR/main CI passes all five jobs (**1,465 unit/integration; 187 native browser checks**); production `f9d366bf47dcd4a387df35d0f2906bbe2a3ac2fd` and all three changed frontend files match. The closing batch adds the empty-writing-list regression. [B.6–B.12](cross-role-workspace-sprints.md) is the owner-approved priority before further subjects/chapters: **B.7 teacher performance was next at this checkpoint**, then B.8 class/student resource assignments, B.9 shared Forest staff layout/prototype, B.10 Today/class cards, B.11 feedback and B.12 usability acceptance. The reported PDF is published and its private storage object exists in the English QA context; optional library publication does not create an individual assignment/My work task. No resource was changed. All 45 mappings and English C47 remain; full four-subject 16.5C separately gates Sprint17. [Triage and evidence](evidence/cross-role-workspace-triage-20261027.json).

**Historical Sprint 16.5B.5 — teacher account/archive repairs delivered; broader design proposed, 2026-10-27.** [PR315](https://github.com/johnvanesyan-arch/HaiEdu/pull/315) restores role-aware shared-account styling with neutral loading and stale-response protection, searchable/collapsible year groups with incremental class display, closed school/resource history and clear resource recipients. Implementation PR/main CI passes all five jobs (**1,465 unit/integration; 185 native browser checks**); production `69a8ae3aaf6af70394395bed8588021ba64753f0` and all eleven changed frontend files match. Fresh signed-in staff acceptance passes **147/147**, including archive search/restoration, with run-owned cleanup. The closing batch also corrects collection-heading, shared notice and skip-link reflow at 200% text, covered by the native gate. The dedicated QA teachers legitimately hold English assignments; separation from a Physics-only demonstration account remains open. The cross-role Forest teacher design is a proposal, not yet approved. All 45 student capabilities, English C47 bookmark and full 16.5C gates remain. [Delivery and proposal](teacher-workspace-corrections.md) · [Evidence](evidence/teacher-workspace-release-20261027.json).


**Historical Sprint 16.5B.4 — subject illustrations and Forest continuity delivered, 2026-10-27.** [PR313](https://github.com/johnvanesyan-arch/HaiEdu/pull/313) restores English/Physics art and adds Mathematics, Armenian, Chemistry, Geography, Biology and History symbols. Account loading is Forest from first paint; the public landing page also uses Forest/cream. Required PR/main CI passes all five jobs (**1,464 unit/integration tests; 177 native browser checks**). Production `5c0683a2d81f292ab371b3aceddb7e157eb19d8b` and all seven changed frontend files match; fresh English/preserved-programme reads pass **154/154**, staff analytics **10/10**. All 45 capability mappings and release gates remain; future symbols do not activate subjects. Final owner usability sign-off and full four-subject 16.5C remain open. [Delivery](student-visual-corrections.md) · [Evidence](evidence/student-visual-release-20261027.json).

**Historical Sprint 16.5B.3 — supplementary materials delivered; available dashboard acceptance complete, 2026-10-27.** [PR311](https://github.com/johnvanesyan-arch/HaiEdu/pull/311) completes «Հավելյալ նյութեր» below My work: illustrated/searchable student cards, teacher-class sharing, platform publication with MFA, immutable revisions/QA, private PDF delivery up to 5 MiB and HTTPS links. Required PR/main CI passes all five jobs, including **1,464 unit/integration tests and 169 native-browser checks**. Production source `ace33de8d0f82795614ed7b49ea4eef816be4baa`, changed frontend assets, eight SQL function bodies and three Edge files match. Live materials acceptance passes **73 checks**, with two-school isolation before/after and both synthetic resources withdrawn; fresh English/staff acceptance and retained Physics evidence are recorded separately. All 45 capability mappings remain, with future service dependencies intact. Available-scope dashboard technical acceptance is complete; **full 16.5C/four-subject acceptance remains open before Sprint17**. English stays paused after C47 pending the dashboard handoff, then resumes at Unit3 learner/audio/writing acceptance and Units4–6. [Materials delivery](student-supplementary-materials-implementation.md) · [Dashboard acceptance](student-dashboard-acceptance.md) · [Release evidence](evidence/student-supplementary-release-20261027.json).

**Historical Sprint 16.5B.2 — all existing student subpages delivered, 2026-10-27.** [PR309](https://github.com/johnvanesyan-arch/HaiEdu/pull/309) extends Forest across shared and legacy course/assessment/progress/task/results, guides, writing/teacher feedback, account/privacy, join and the shared identity gateway. All five required PR/main CI jobs pass, including **1,456 unit/integration tests and 165 native-browser checks**. Production source `e7efc028d90e351270bec6606078b6867546db8c` and all 18 changed frontend assets match; authenticated acceptance passes **324 Physics, 154 English and 10 staff-analytics checks**. All 45 capabilities and service dependencies remain; no backend/content/scoring/replay changes. S45 complete resource authoring/delivery and full 16.5C/four-subject acceptance remain open. English stays paused after C47. [Subpage delivery](student-subpages-implementation.md) · [Release evidence](evidence/student-subpages-release-20261027.json).

**Historical Sprint 16.5A accepted; 16.5B.1 delivered — 2026-10-27.** John's full design/style-guide approval preserves all 45 mapped capabilities and their dependencies. [PR307](https://github.com/johnvanesyan-arch/HaiEdu/pull/307) deploys the Forest shared student shell, authorized Home course/unit selection, saved-work continuation, course-scoped My work, course-only Progress navigation and visible logout. Required PR/main CI passes all five jobs, with **1,454 unit/integration tests and 139 native-browser checks**. Production source `a5f9f09218b1220bb8793f21381858dc0ad786ed` and all 12 changed frontend/font assets match; authenticated acceptance passes **324 Physics, 154 English and 10 staff-analytics checks**, retaining two-school controls. The canceled English run was replaced through the existing guarded main workflow. The previously verified Vercel blocking configuration is reused; connector scope prevents a fresh settings readback. Remaining 16.5B surfaces, S45 and full 16.5C/four-subject gates stay open. English remains paused after C47. [Delivery](student-home-implementation.md) · [Release evidence](evidence/student-home-release-20261027.json).

**Historical Sprint 16.5A student style guide v1.0 — 2026-10-27.** John requests a reusable student-page style guide based on the selected Forest/cream direction. The written specification, visual component guide and namespaced CSS token reference now cover colour, Armenian typography, layout, navigation/logout, components, learning states, illustrations, motion, accessibility and future feature slots. V1 explicitly specifies larger essential labels, a normalized spacing/radius scale, stronger control outlines and additional hover/error tokens for 16.5B; it does not claim those refinements are already deployed or separately owner-accepted. All 27 selected contrast pairs, four iframe-viewport layout checks (320/360/768/1280 px) and ten specimen interactions pass. The existing dashboard preview, production code, 45 capabilities and English C47 bookmark remain unchanged. Complete design acceptance and 16.5B/C remain open. [Style guide](student-style-guide.md) · [Visual guide](design/student-dashboard/haiedu-student-style-guide.html) · [Evidence](evidence/student-style-guide-20261027.json).

**Historical 16.5A Forest selection and logout clarity — 2026-10-27.** John selects Forest green with warm cream for the student redesign. The review now uses that choice without a palette switcher. Logout was already under the top-right avatar → Account, but its generic “Open” action was hard to find; the preview now adds a labelled «Դուրս գալ» action at the desktop sidebar bottom and directly below the account identity on all sizes, including mobile and focused-work access. Both use the existing preview explanation; no real session is ended. The 45-function matrix and course-only Progress destination remain. Earlier unchanged colour/learning evidence is reused; targeted logout/layout evidence is recorded separately. Full design acceptance and 16.5B/C remain open; this palette decision does not claim production rollout. English stays paused after C47. [Decision](student-dashboard-visual-options.md) · [Preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) · [Evidence](evidence/student-dashboard-forest-logout-20261027.json).

**Historical 16.5A refinement — engaging supplementary materials, 2026-10-27.** The review design now presents illustrated practice/reading cards, clear learning goals, search and purpose filters, with topic/provider/format filters disclosed on demand. Approximate durations and explicit teacher recommendations are provider-supplied examples, not measured activity or automatic personalization. Brief interaction motion respects reduced-motion preferences; the review toolbar also offers a no-motion view. All 57 responsive layout checks and 21 interaction checks pass. The 45-entry matrix is retained, with S45 refined. This is design-only: complete design acceptance, the 16.5B resource/authoring implementation and 16.5C production acceptance remain pending. English stays paused after C47. [Refined scope](student-supplementary-materials.md) · [Preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) · [Delta evidence](evidence/student-materials-engagement-20261027.json).

**Historical 16.5A addition — «Հավելյալ նյութեր», 2026-10-27.** John requests supplementary subject materials from teachers and HaiEdu. The review preview now places the section directly below «Իմ աշխատանքները», with course/topic, provider and format filters, details and empty/withdrawn examples. The current coverage matrix has 45 entries. PDF worksheets and HTTPS links are the recommended first delivery; teacher class sharing and platform-reviewed publication require a bounded 16.5B resource service/authoring slice and 16.5C acceptance. Optional resources do not change grades or mastery. This delivery changes design/planning only; live uploads, files, APIs and student UI remain unimplemented. English stays paused after C47 and complete dashboard design acceptance remains pending. [Materials scope](student-supplementary-materials.md) · [Preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) · [Delta evidence](evidence/student-materials-design-20261027.json).

**Historical 2026-10-26 design checkpoint — Student dashboard redesign brought forward; concrete review prepared.** John pauses subject expansion and prioritizes the shared student interface. English is parked after C47 on `d32fede819cd077d028f7c66d90b084243961125`: Unit3 activation/read acceptance complete; full learner/audio/writing acceptance resumes first when subject work returns, then Units4–6 and English closure. A source-based audit, 44-entry current/planned function matrix and interactive Armenian preview extend the retained 7 October design. The preview covers 15 scenarios at 360/768/1280 px container widths and 13 interaction checks, using fictional local data. Future account/history/assignment/AI capabilities have explicit dependency contracts; none is enabled by the mockup. Owner design review remains before production implementation; full four-subject and formal-pilot gates remain open. [Design review](student-dashboard-redesign.md) · [Function matrix](student-dashboard-function-coverage.md) · [Clickable preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) · [Evidence](evidence/student-dashboard-design-20261026.json).

**Sprint 16.1C.47 — Unit 3 provisional pilot activated; guarded read acceptance enabled.** The owner-authorized dashboard route commits the unchanged rehearsed transaction at 16:25:36 UTC on 26 October 2026. Independent readback verifies all 471 configuration rows, four policies, five forms/100 ordered slots and sixty Mastery version bindings. All 117 preservation scopes match; 106 whole-table fingerprints remain unchanged. Six technical gates pass; independent specialist review remains owner-deferred/pending. Existing English learners can access the accepted 52 core Practice questions, five 20-question forms, eight guides and W01; eight optional Practice questions remain outside initial delivery. All sixteen recordings remain private. The two exact existing QA contexts are installed, and the main-only Unit3 workflow now covers its full dependency graph. Exact-deployment read outcomes are recorded in the release PR and source-verified Notion closure; full learner/audio/writing actions remain the next slice. [Activation delivery](english-7-unit-03-pilot-activation.md) · [Verified activation record](evidence/english-7-unit-03-pilot-activation.json).

**Historical C47 preparation — Unit 3 activation authorized; inactive configuration imported and rehearsed; connector commit blocked.** John's “I do” accepts the exact C46 provisional pilot and specialist-review deferral. Fifteen bounded imports register 471 exact configuration rows and 160 normal serialization fences; all prior rows across 117 tables are preserved, with 107 tables wholly unchanged. Actual database rehearsal matches four policies and sixty Mastery bindings; rollback restores every table fingerprint. Nineteen focused tests pass, including 43 new operator guards. Two final commit requests expire at the connector; direct reads confirm Unit3 stays draft, with zero active policy bindings and seven pending gates. No learner activation or live Unit3 acceptance is claimed. The approved scope remains 52 core Practice questions, five 20-question forms, eight guides and W01; eight optional questions stay outside initial delivery. The owner decision is complete; next is execution through restored connector access or an approved dashboard fallback, then fixture installation and learner acceptance. [Execution handoff](english-7-unit-03-activation-preparation.md) · [Owner authorization](evidence/english-7-unit-03-owner-activation-20261026.json) · [Evidence](evidence/english-7-unit-03-activation-preparation-20261026.json).

**Historical Sprint 16.1C.46 — Unit 3 final pilot packet and guarded read acceptance prepared.** The exact packet binds the accepted C45 policy/configuration, all nine published materials and existing source-use instructions. Initial delivery proposes 52 core Practice questions, five 20-question forms, eight guides and W01; eight optional questions remain outside core delivery. All 27 task sets and 13 of 16 recordings are allocated. Narrow checks confirm private storage, all sixteen objects, zero recorded exposure and unchanged publication/derived writing hashes. Fifty-six focused regressions pass, including both earlier English units and the S02 exception. Two existing QA enrollment contexts are planned for activation; the shared fixture manifest is unchanged. Independent specialist review is proposed deferred, not approved. Unit3 stays draft with seven pending gates and no production writes. Next: one bounded provisional-pilot decision, then scoped activation and learner acceptance. [Final decision](english-7-unit-03-final-release-decision.md) · [Manifest](content/english-7-unit-03-release-decision.json) · [Evidence](evidence/english-7-unit-03-final-packet-20261026.json).

**Historical Sprint 16.1C.45 — Unit 3 materials published; accepted configuration rehearsed.** John accepts the nine exact v1 materials and complete C44 numerical policy. The normal signed-in reviewer workflow publishes all eight guides and W01 with nine real MFA-backed events; independent readback verifies unchanged content/QA fingerprints and the exact derived writing task. Five 20-question forms, 52/40/60 core pool memberships and four policies are compiled into 471 prepared rows. Actual database binding validators and 29 focused checks pass; rollback restores all 117 table fingerprints. No configuration is permanently bound or allocated, no learner activation is authorized, and seven stored gates remain pending. Next: exact source-protection/specialist dispositions and the final bounded learner-release packet. [Delivery](english-7-unit-03-release-preparation.md) · [Acceptance](evidence/english-7-unit-03-policy-material-acceptance-20261026.json) · [Evidence](evidence/english-7-unit-03-configuration-preparation-20261026.json).

**Historical Sprint 16.1C.44 — Unit 3 curriculum registered; combined materials/policy decision ready.** Current 31-N/60-N traceability now covers twelve programme outcomes plus one separate written-interaction standard target, thirteen skills, seventeen links and all 160 families. The guarded operation inserts 410 metadata rows and updates fourteen draft-snapshot rows; rollback and independent committed readback pass, with preservation across 117 tables. C43 approvals and existing content/history remain intact. Five 20-question forms and a 52-core/8-optional Practice split are prepared; 36 checks pass the proposed 16/20 threshold, skill minima, single-item S02 exception, readiness and separate writing. Nine unchanged v1 materials await one combined owner acceptance with the numerical policy. No material publication, policy adoption or learner activation; seven gates remain pending. [Curriculum](english-7-unit-03-curriculum-registration.md) · [Decision package](english-7-unit-03-policy-proposal.md) · [Policy evidence](evidence/english-7-unit-03-policy-proposal-20261026.json).

**Historical Sprint 16.1C.43 — Unit 3 bank accepted under the temporary MVP batch workflow.** John accepts expedited whole-bank approval with individual manual question review waived. The existing service approves **159 current versions** and preserves **one existing approval**: **all 160 questions (60 Practice / 40 Diagnostic / 60 Mastery) are approved**, with 160 passing QA/source checks. Each new approval records the owner decision, exact version and waiver; unchanged saved QA and C39 comparison evidence are reused. Rollback restores all 117 table fingerprints; independent committed readback preserves all prior rows/history and leaves 115 tables entirely unchanged. No content, schema, runtime, authorization, materials or learner-policy change is made. Unit3 stays draft with seven pending gates. Next: material acceptance, current-programme reconciliation and exact policy/form/qualification before separately authorized learner release. [MVP policy](mvp-bank-approval-policy.md) · [Delivery](english-7-unit-03-batch-approval.md) · [Evidence](evidence/english-7-unit-03-batch-approval-20261026.json).

**Historical Sprint 16.1C.42 — Unit 3 remaining source integration complete.** Fourteen passages and four publisher audio uses are registered, linking **42 reading and six publisher-listening questions** at v2 with saved passing QA. Unit3 now has **160 QA passes / zero source-registration holds**. The subject-neutral QA check now accepts valid standalone audio as well as shared task sets; deployed v15 and its three unchanged dependencies match source, and 18 targeted regressions pass. Rollback/independent committed readback preserve all prior history and unaffected rows; 110 of 117 table fingerprints remain unchanged. All 40 previous private audio objects remain, with four uploaded additions. Owner green-light is recorded as the source-acceptance basis; ordinary question/material approvals and all seven draft-release gates remain separate. Next: review the complete bank and nine materials, reconcile the current programme and settle exact policy/form/qualification before bounded learner release. [Delivery](english-7-unit-03-source-registration.md) · [Evidence](evidence/english-7-unit-03-source-registration-20261026.json).

**Historical Sprint 16.1C.41 — Unit 3 original-audio source integration complete.** John confirms the requested private upload. All **twelve original recordings and twelve shared task sets** are registered; **25 questions (five Practice / eight Diagnostic / twelve Mastery)** now have immutable v2 source links and saved passing QA. Unit3 has **112 QA passes / 48 remaining source holds: 42 reading and six publisher-listening questions**. Rollback restores all 117 table fingerprints; independent committed readback and deployed-QA reevaluation pass. Question meaning, keys, prior history, all 40 private audio objects and Unit1/2 evidence are preserved. Ordinary question/material approval remains separate; Unit3 stays draft with seven pending gates. Next: accept/register the fourteen passages and four publisher uses, then curriculum reconciliation and exact policy/form/release work. [Delivery](english-7-unit-03-audio-registration.md) · [Evidence](evidence/english-7-unit-03-audio-registration-20261026.json).

**Historical Sprint 16.1C.40 — Unit 3 recording intake prepared; private upload and integration pending.** John supplied all twelve original recordings and directed continuation. Technical intake passes 12/12 MP3 decodes; an unchanged-byte upload package maps them to **25 questions: five Practice, eight Diagnostic and twelve Mastery**. The existing audio contract requires SHA-256 filenames; all twelve exact objects are absent from the private bucket. The Supabase connector has no file-upload operation and the dashboard is signed out, so owner upload is the next dependency. No database/storage/runtime changes, source links or new QA passes are claimed. C39’s 87 passes and 73 source-registration holds remain; fourteen reading passages/four publisher uses and ordinary content acceptance remain separate. Unit3 stays draft; all seven gates remain pending. [Upload handoff](english-7-unit-03-audio-intake.md) · [Evidence](evidence/english-7-unit-03-audio-intake-20261026.json).

**Historical Sprint 16.1C.39 — Unit 3 whole-unit authoring and inactive reviewer staging complete.** John accepts the exact C38 manifest. All **160 questions (60 Practice / 40 Diagnostic / 60 Mastery)**, fourteen passages, twelve new recording scripts, eight guides and W01 are authored; 160 question drafts and nine material drafts are visible in the existing reviewer workflows. Complete unchanged-bank refresh covers 392 questions/511 versions; all 160 candidate comparisons and 12,720 within-batch pairs are recorded, with five assessment candidates reworked. Actual QA gives **87 standalone passes and 73 expected source-registration holds (42 reading, 31 listening)**; 600 MC and 45 structured grading cases and nine material checks pass. Rollback and independent committed readback preserve every prior row across 117 tables. All seven new release gates remain pending. Next: ordinary content/source acceptance, twelve named recordings and four publisher-use reviews, then source registration/linking. Numerical policy, curriculum reconciliation and learner release follow. Unit1/2 acceptance is reused; speaking stays classroom-assessed. [Delivery](english-7-unit-03-authoring.md) · [Evidence](evidence/english-7-unit-03-authoring-20261025.json).

**Historical Sprint 16.1C.38 — Unit 3 source map and whole-unit proposal complete; authoring decision pending.** All 25 activities on pp.54–71 and all 23 activity-25 subprompts are mapped in textbook order. The current consolidated 2026 programme is captured, including compulsory natural-wonder work and the L4 discussion/L5 essay distinction. Complete comparison covers 392 English questions, 511 saved versions, sources/guides and related outcomes with matching readback. The concrete proposal is **60 Practice / 40 Diagnostic / 60 Mastery**, five 20-question forms, eight guides and one separate writing response; twelve new recordings plus four retained publisher candidates. Three optional songs/poem use standalone audio items, not one-member task sets. No questions are authored or registered and no policy, approval or learner state changes. Unit 1/2 acceptance is reused. Next: acceptance of the exact 160-slot authoring scope and its 100 bounded protected-parallel proposals, then one complete authoring/reviewer batch. [Source map](english-7-unit-03-preparation.md) · [Proposal](english-7-unit-03-bank-proposal.md) · [Comparison/evidence](english-7-unit-03-bank-comparison.md).

**Sprint 16.1C.37 technically complete — Unit 2 learner, audio and writing acceptance.** [Continuation 40097115949](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40097115949) passes 783/783 checks on exact deployed source `73cf2cfb6347223a191965489c969e8fd9787a1a`, continuing the same retained Diagnostic after two bounded shared-player timing repairs. Diagnostic 24/24, three ordinary Practice sessions, an unscored audio exit, failed Mastery 17/24, required Review 12/12 and passed retake 24/24 are retained. Two assessed plays, rejected third play, pause/reload and shared counts, ordinary replay, W01 draft/submission/return/revision/four-criterion feedback and teacher/school/isolation checks pass. Independent scoped readback preserves three distinct Mastery forms with no shared items or source families and all writing history. Required CI and deployment passed for both repairs; the material-publication preflight now covers all nine exact versions and W01's derived task. Owner approvals are reused; specialist review remains deferred/pending. Unit 3 is next, followed by Units 4–6 before Mathematics. [Acceptance and repair evidence](english-7-unit-02-learner-acceptance.md).


**Roadmap version:** 4.112
**Updated:** 2026-10-29 Asia/Yerevan · B.12.1 previews and B.12.2 performance delivered; B.12.3 final owner usability next; PERF-02 measured targets met; DEMO-01 owner-confirmed complete in English Grade 7; English paused after C47; full four-subject gate remains

**English-first course continuation — 2026-10-24.** John directs completion of English Grade 7 through textbook Units 1–6 before starting Mathematics. Unit 1 evidence is retained. John reports all outstanding Unit 2 approvals complete; this report is accepted without repeating his review or auditing approval clicks. Retained Unit 2 exact-deployment read acceptance passes 136/136 checks plus 54/54 nested isolation checks on source `96a1e6b1a3448fb6b5e282386d012d89dc89e48d`. Unit 2 learner/audio/writing acceptance is now verified under C37. Next: Units 3, 4, 5 and 6 in order, with whole-unit batches and course closure. New unit counts/forms/policies require source and whole-bank evidence; none are pre-approved by this sequencing decision. Existing release controls, source protection, classroom speaking and deferred specialist gates remain. Sprint 16.2 follows English course closure. [Delivery plan](english-7-course-continuation.md) · [Owner record](evidence/english-7-course-continuation-decision-20261024.json).

**Reviewer home resume — 2026-10-24.** The duplicate Quick access links are replaced by «Շարունակել ստուգումը», showing the last successfully opened question, curriculum context and current dashboard status. Bank totals move into a collapsed summary. New reviewers and unavailable/archived items get a clear next action; mobile priority badges sit below the question context. Account-bound browser-local history stores only navigation metadata for 30 days (up to 20 accounts), not question content. Existing same-tab filtered-list context is reused when valid; otherwise the question opens directly. Seven new native Chromium cases cover desktop/tablet/mobile, persistence, account switching, sign-out races, failed details and expired/blocked storage; all 35 relevant browser cases and 1,423 non-browser tests pass. Shared subject-neutral UI, no backend or content changes; Unit 2 publication and Sprint 16.5 scope remain unchanged. [QA record](reviewer-home-resume-qa.md).

**Advanced question editing — 2026-10-24.** Raw stimulus JSON, feedback codes, question-family/misconception configuration, structured-answer locale codes and typed-answer normalization settings now use native collapsed «Ընդլայնված» sections. Question text, options, correct/accepted answers, numeric tolerance and units, ordering codes/sequences, audio/material selectors and existing hint views stay outside them. Hidden fields retain their values in the saved revision. Required settings for new structured rows open automatically; invalid JSON or a missing family opens and focuses the relevant field, and structured validation exposes its settings. Four new Chromium cases plus expanded matching/ordering checks verify all seven supported answer formats, desktop/mobile, keyboard toggling, exact payload preservation and error recovery. Existing navigation, action-panel and observer coverage remains green. Shared editors are subject-neutral; no backend, content, authorization, scoring or release-gate changes. Unit 2 publication and Sprint 16.5 scope remain unchanged. [QA record](reviewer-advanced-editing-qa.md).

**Question action-status panel — 2026-10-24.** One persistent panel now presents Save, QA and content approval, the next required step, and a visible reason for every unavailable action. Duplicate action buttons are removed from individual tabs. It distinguishes unsaved edits, missing/failed/stale QA, pending writes, completed approval, archived questions and template-controlled editing; it shows the first QA error and links to the full review details. Server-required QA reruns immediately block stale approval. A successful write followed by a failed read requires refresh before further actions. Pending writes freeze editor fields. SME status remains a separate governance note and approval does not claim learner activation. Four new native Chromium cases cover the sequence on desktop/mobile, read/server failure recovery and read-only/governance states; the previous navigation and observer regressions remain green. Shared question-editor behavior is subject-neutral. No backend, content, authorization or curriculum gate change; Unit 2 publication remains held and Sprint 16.5 retains its scope. [QA record](reviewer-action-status-qa.md).

**Reviewer list continuity — 2026-10-24.** The question bank and review queue now retain the selected filters, queue tab and scroll position when returning from a question. Previous/Next follows the exact opened list, with its position shown and stable order after approval. The shared, subject-neutral implementation uses bounded tab-local, account-bound navigation metadata; it stores no question content and confers no access. Direct links and unavailable storage remain usable. Unsaved-change warnings, pending-action guards and account isolation are preserved. Six new isolated Chromium cases cover desktop/mobile, two subjects/grades and multiple units, browser Back, approval, initial session events, duplicate QA, sign-out and expired/blocked storage. Existing observer regressions, syntax and QA dependency checks also pass. Required CI and the separate Production/Blocking Deployment Check govern release; final source/deployment evidence is synchronized to Notion. No curriculum, publication or Sprint 16.5 scope change. [QA record](reviewer-list-navigation-qa.md).

**Collapsible curriculum subjects — 2026-10-24.** At John’s narrowed request, the coverage page now starts each subject/programme card collapsed. Its subject, grade, programme version and existing summary counts stay visible; clicking the header or using Enter/Space reveals the existing units and bank links. Multiple cards can stay open. Native details/summary controls add no event handlers or storage. Two isolated Chromium cases verify desktop/mobile layout, keyboard and independent toggling, unchanged scoped links and empty programmes. All new styles target summary elements with the curriculum header class, whose only rendered consumer is this page. Browser syntax and QA dependency checks pass; required CI and the separate Production/Blocking Deployment Check govern release. No filters, counting changes, API/content changes or curriculum release decisions are included. The existing Unit 2 publication hold and Sprint 16.5 plan remain unchanged.

**Materials reviewer usability pass — 2026-10-24.** The shared materials page now uses the reviewer layout stylesheet, consistent spacing and controls, title-first cards and status badges, curriculum-section/type/status/search filters, a readable content preview, and grouped editing/reference/history sections. Refresh retains selection; failed refresh preserves edits and failed material reads offer retry. Seven native Chromium regressions and 1,423 non-browser tests pass locally. Scope is the common reviewer UI for all programmes/releases/units; no content, publication, QA criteria, API or curriculum gate changes. Required CI and deployment checks govern release. The 16.1C.36 publication/live-acceptance hold remains open. [QA record](materials-reviewer-ui-qa.md).

**Historical Sprint 16.1C.36 — Unit 2 pilot configuration activated; first read run found a material publication hold.** John authorizes the exact C35 provisional-pilot decision. The accepted four policies, five 24-question forms and 47/48/72 core pools are active; 516 configuration rows, 120 slots, 72 Mastery bindings and 117 unrelated preservation scopes are independently verified. Six technical gates pass; independent SME remains pending. Twenty-six focused tests, all five required CI jobs, production deployment and the Unit 1 live read run pass. Unit 2 live reads reach 29/30 executed checks plus 54/54 nested isolation checks before failing W01 availability. The eight accepted guides and W01 remain stored as draft with unchanged passed QA; no learner writing-task row exists. This publication hold was not detected by the fingerprint-only preflight. Owner acceptance is retained; the normal MFA-protected reviewer publication step remains, and the browser is signed out. No QA assertion or approval control is bypassed. Next: publish these nine unchanged materials through the existing reviewer flow, rerun exact-main reads, then full learner/audio/writing actions. [Pilot delivery](english-7-unit-02-pilot-release.md) · [Activation](evidence/english-7-unit-02-pilot-activation.json) · [Publication hold](evidence/english-7-unit-02-material-publication-hold-20261024.json).

**Historical Sprint 16.1C.35 — Unit 2 final pilot packet and guarded read acceptance prepared.** The packet binds the accepted C34 configuration, existing source-use instructions and proposed deferred-specialist pilot disposition. Initial allocation uses 47 core Practice questions, five 24-question assessment forms, eight guides and W01; 25 sets/11 recordings are allocated from the registered 28/14 catalogue. The 25 optional questions remain outside core delivery. All fourteen private audio objects are present, recorded Unit 2 exposure is zero, and nine material fingerprints match retained evidence. Forty-four focused regressions and guide-hash verification pass; Unit 1/same-programme isolation and class deduplication are covered. Live Unit 2 read QA remains activation-gated. No production writes or learner activation. Next: one final bounded pilot authorization, then activation and learner read/action acceptance. [Final decision](english-7-unit-02-final-release-decision.md) · [Manifest](content/english-7-unit-02-release-decision.json) · [Evidence](evidence/english-7-unit-02-final-packet-20261024.json).

**Historical Sprint 16.1C.34 — Unit 2 policy accepted; exact configuration rehearsed.** John accepts the complete C33 numerical contract, limited listening evidence, finite replacements and 47-core/25-optional treatment. A scoped immutable model/runtime binding, existing explicit lifecycle, three 47/48/72 pools, four policies and five 24-question forms are prepared. Fresh technical identities match all 120 assessed version bindings and twenty source families/ten recordings; no content/audio review or approval audit is repeated. The actual database rollback validates all four policy snapshots and 72 Mastery versions, restoring all 117 table fingerprints. Eighteen focused checks pass; C29–C33 evidence and C26 runtime timing repair are reused. No permanent configuration writes or learner activation. Next: final source-protection/specialist dispositions and the bounded pilot release/acceptance packet. [Preparation](english-7-unit-02-release-preparation.md) · [Acceptance](evidence/english-7-unit-02-policy-acceptance-20261024.json) · [Evidence](evidence/english-7-unit-02-configuration-preparation-20261024.json).

**Historical Sprint 16.1C.33 — Unit 2 policy proposal and five forms prepared.** The unchanged approved bank supplies five 24-question single-choice forms, twenty separate assessed source families and ten recordings. Retained C29/C31/C32 evidence is reused; no approval audit or repeat audition. Twenty-seven offline checks pass using the actual policy reader and SQL scoring/readiness functions. Proposed Mastery is 80% (at least 20/24) plus skill minima of 2/3, 3/4 or 1/2. The 47-core/25-optional Practice split is explicit; limited core listening evidence uses Diagnostic evidence and/or governed repeats without claiming independent coverage. Readiness, finite three-attempt/replacement rules, two assessed audio plays and separate writing are documented. No production data, policy binding, form allocation or learner activation changes. Next: owner decision on the concrete numerical contract, then immutable configuration and exact form/source qualification. [Proposal](english-7-unit-02-policy-proposal.md) · [Contract](content/english-7-unit-02-policy-proposal.json) · [Evidence](evidence/english-7-unit-02-policy-proposal-20261024.json).

**Historical Sprint 16.1C.32 — Unit 2 approval reported; formal curriculum registration complete.** John reports that everything is approved; his content/material review is accepted without repetition or an approval audit. The existing English governing source chain is reused. Ten official Topic 2 outcomes, fifteen skill reconciliations, nineteen skill–outcome links and 192 family traces are registered against the draft release. Exact Armenian bullets and current standard references are preserved; speaking stays classroom-assessed, written interaction remains one shared W01 sample, and supporting/extension Practice is not promoted to mandatory assessed coverage. Rollback and independent committed readback verify 470 additions and sixteen intended draft updates; all prior unrelated rows are preserved across 117 tables, with 104 entirely unchanged. Questions, materials, QA, audio, approvals and learner history are unchanged. Next: the exact Unit 2 scoring/readiness/attempt/replacement and form-qualification contract for five planned 24-question forms. All seven stored release gates remain pending; no numerical policy or learner activation is inferred. [Delivery](english-7-unit-02-curriculum-reconciliation.md) · [Manifest](content/english-7-unit-02-curriculum-registration.json) · [Evidence](evidence/english-7-unit-02-curriculum-registration-20261024.json).

**Historical Sprint 16.1C.31 — remaining Unit 2 sources integrated; all 192 questions pass QA.** Fourteen unchanged reading passages now support thirty questions; four Practice listening sets support ten questions, using three newly uploaded publisher recordings and the existing replacement. Eighteen shared sets, forty v2 revisions and forty saved QA passes clear all remaining source holds. The unit now has 28 registered sets and fourteen recordings. Rollback, guarded commit and independent readback verify 101 additive rows, unchanged wording/keys/source families and all prior history; 110 of 117 table fingerprints are unchanged. C29 comparison and C30 owner audio acceptance are reused. Publisher reconciliation records retain the untested room-cleaning inconsistency and other source limits; no independent human audition is claimed. Ordinary question/material approvals and all seven Unit 2 release gates remain pending. Next: normal review, formal curriculum reconciliation and the exact numerical/form-qualification/release contract. [Delivery](english-7-unit-02-source-integration.md) · [Manifest](content/english-7-unit-02-source-integration-manifest.json) · [Evidence](evidence/english-7-unit-02-source-integration-20261024.json).

**Historical Sprint 16.1C.30 — ten Unit 2 assessment recordings registered and linked.** John confirms all ten recordings are correct and exactly script-matched; that review is accepted without repeat listening or transcription. The unchanged files are uploaded to the existing private bucket, registered as ten immutable audio versions and ten shared task sets, and linked to twenty DA/DB/MA/MB/MC questions at v2. All twenty saved technical QA checks pass. The unchanged 192-question bank now has 152 QA passes and forty source holds: thirty reading and ten Practice listening. Rollback, guarded commit and independent readback verify sixty additive rows, unchanged question meaning and all prior history; 110 of 117 table fingerprints are unchanged. Ordinary question/material approvals and all seven Unit 2 release gates remain pending. Next: fourteen reading passages and the four retained Practice listening sources, then qualification/numerical/release work. [Delivery](english-7-unit-02-assessment-audio.md) · [Manifest](content/english-7-unit-02-assessment-audio-manifest.json) · [Evidence](evidence/english-7-unit-02-assessment-audio-20261023.json).

**Historical Sprint 16.1C.29 — Unit 2 whole-unit drafts authored and staged.** John accepts the complete 72 Practice / 48 Diagnostic / 72 Mastery scope. All 192 questions, eight guides and W01 now exist in the normal inactive reviewer catalogue. Fourteen passages and fourteen scripts include all ten new recording scripts in one private handoff. Full 200-item/259-version corpus refresh and 18,336 within-batch comparisons support the candidate review; 53 assessment candidates and one guide collision were reworked. Actual QA passes 132 standalone items and all nine materials; 30 reading and 30 listening questions retain only the expected source-registration hold. All 704 choice checks and 87 deployed structured-grading cases pass. Rollback, commit and independent readback preserve every prior row across 117 tables; 2,105 additive rows, no approvals or learner activation. Next: exact source/material review, ten recordings, retained-audio reconciliation and one shared-source registration/linking batch. Unit 1 evidence is reused. [Delivery](english-7-unit-02-authoring.md) · [Redacted manifest](content/english-7-unit-02-authoring-manifest.json) · [Evidence](evidence/english-7-unit-02-authoring-20261023.json).

**Historical Sprint 16.1C.28 — Unit 2 complete batch proposal prepared.** The full applicable English corpus is frozen: 200 current questions, all 259 immutable versions, linked sources/materials and related mappings; complete readback matches. The demand comparison supports a proposed 72 Practice / 48 Diagnostic / 72 Mastery bank, five 24-question forms and one separate writing response. All 192 planning slots, 28 shared sources, eight guide drafts and ten new assessment recordings are specified for one authoring/recording handoff. Supporting grammar and present perfect stay Practice-only; the 72 Practice slots comprise 47 core and 25 optional/supporting/extension candidates. These are proposals, not authored or approved questions. No production/runtime/approval/release changes; C27B audio and Unit 1 evidence are reused. Next: one bounded owner decision on the complete scope, then whole-unit authoring and candidate-level comparison. [Batch proposal](english-7-unit-02-bank-proposal.md) · [Comparison](english-7-unit-02-bank-comparison.md) · [Evidence](evidence/english-7-unit-02-bank-proposal-20261023.json).

**Historical Sprint 16.1C.27B — Unit 2 replacement audio registered in a draft scope.** John confirmed the upload. The private object’s name, size, MIME and single-part multipart ETag match the supplied One Song, Two Versions MP3. One draft unit, one draft release, its unit snapshot, seven pending gate rows and one immutable audio version are registered: eleven additions, every prior row across 117 tracked tables preserved, 112 tables entirely unchanged. Rollback and independent committed readback pass. No skills, scored questions, task sets, approvals, policies or learner activation are added. The reviewer picker requires actual question/skill scope, so authenticated playback follows that authoring step. Human listening review, including pace/speaker distinction, remains open. Do-Re-Mi stays excluded; Unit 1 evidence is reused. Next: the full applicable current/history-bank comparison and bounded Unit 2 proposal. [Audio registration](english-7-unit-02-audio-registration.md) · [Evidence](evidence/english-7-unit-02-audio-registration-20261023.json).

**Historical Sprint 16.1C.27A — Unit 2 replacement recording received.** John supplied One Song, Two Versions. The unchanged 46.99-second, 768,845-byte MP3 passes full decoding and automated comparison of all 135 script words; all five illustrative answers remain supported. The duplicate extension is corrected. Its approximately 172 words/minute exceeds the suggested 120–145 and remains a listening-review observation. Private upload/registration, human listening review and authenticated playback remain open. Do-Re-Mi stays excluded. No runtime, production, question-budget or release changes. Next: exact recording acceptance/upload and the whole-bank-supported Unit 2 proposal. [Audio handoff](english-7-unit-02-replacement-audio-handoff.md) · [Evidence](evidence/english-7-unit-02-replacement-audio-20261023.json).

**Historical Sprint 16.1C.27R — Unit 2 opening-song replacement prepared.** John excludes Do-Re-Mi, including the compressed review copy, from delivery. The original **One Song, Two Versions** script replaces activity 2 at the same textbook position; five illustrative unscored checks and a recording brief are ready. Three publisher recordings remain Unit 2 candidates; the new dialogue is unrecorded and unregistered. Historical audio evidence and Unit 1 approvals remain intact. No bank budget, scored question, policy, release or production data changes. Next: review/record the replacement and continue the whole-bank-supported Unit 2 proposal. [Replacement script](english-7-unit-02-music-replacement.md) · [Decision/evidence](evidence/english-7-unit-02-music-replacement-20261023.json).

**Historical Sprint 16.1C.27 — English Unit 2 source/activity/audio preparation complete.** All 34 activities on pp.28–53 retain textbook order and a programme-linked disposition. Fifteen proposed targets distinguish nine core automatic, three supporting, one textbook-extension and two writing targets; no skills or questions are registered. Four publisher audio hashes match prior evidence. A full-length 7,001,906-byte Do-Re-Mi delivery candidate fits the unchanged 8 MiB limit and passes decoding; audition, exact asset review and registration remain open. Editorial corrections and the one-response writing proposal are recorded. Unit 1 acceptance and C26 learner/audio/writing evidence are reused. Next: full applicable-bank comparison and a concrete Unit 2 question/assessment proposal; Units 2–6 have no accepted budgets. No production or runtime changes. [Preparation](english-7-unit-02-preparation.md) · [Evidence](evidence/english-7-unit-02-preparation-20261023.json).

**Historical Sprint 16.1C.26 — English Unit 1 learner, audio and writing verification complete.** The retained designated learner completed Diagnostic 28/28, seven ordinary Practice sessions with 17 responses, all twelve readiness checks and one Mastery attempt at 28/28. Four assessed recordings completed two shared plays each; all eight third-play probes were denied, pause/reload recovery and three Practice replays passed. W01 completed draft, submission, teacher return, revision, marking and learner feedback, with two submissions/two reviews and separate synthetic 8/12 marks. Matching teacher/school results, foreign-access denials and preserved programme dashboards pass. A shared audio timing defect was corrected without changing allowances; all 117 existing table fingerprints were preserved across its migration. The final continuation passed 90/90, reusing retained successful steps. Required implementation CI passed 1,410 tests, 95 native Chromium cases and all PostgreSQL/concurrency/release jobs. Owner approvals and the provisional pilot remain; independent specialist review is deferred. Next: Unit 2 source/activity and audio preparation in textbook order; no Unit 2–6 question budget is yet accepted. [Delivery](english-7-unit-01-live-learner-verification.md) · [Evidence](evidence/english-7-unit-01-learner-verification-20261023.json).

**Historical Sprint 16.1C.25 — English Unit 1 provisional pilot activated.** John confirms creating the recordings and free use of textbook adaptations, and authorizes proceeding with the bounded C24 proposal. The exact C22 model, four policies, 58/56/84 core pools and five 28-question forms are active. The 609-row transaction and independent readback preserve all 117 guarded scopes; six technical gates pass and independent specialist review stays pending. Two subject-specific QA classes and enrollments are established through the normal service functions, with existing records preserved. Shared QA now checks exact registered classes across subjects. Authenticated exact-deployment English read acceptance passed 118/118, including both schools, desktop/mobile navigation, exact policies, guide/W01 access and preserved programme state. All 117 tracked tables remained unchanged through the read-only checks. The existing six-chapter acceptance passed 324/324; the shared action flow passed 143/143 on its rerun with unchanged assertions, with run-owned cleanup and 54/54 isolation before and after. Required CI passed 1,404 tests, 94 native Chromium cases and all PostgreSQL/concurrency/release jobs. Production deployment succeeded. Completed learner/audio/writing exercises remain the next bounded slice. [Pilot release](english-7-unit-01-pilot-release.md) · [Evidence](evidence/english-7-unit-01-pilot-activation.json). [Acceptance evidence](evidence/english-7-unit-01-pilot-verification-20261023.json).

**Historical Sprint 16.1C.24 — final provisional release packet and guarded read acceptance prepared.** The exact C22 configuration and 27 task sets / 14 recordings now have a bounded learner-use decision manifest. A main-only, activation-gated runner checks English policy/material reads, two-school and cross-programme denials, desktop/mobile navigation and preserved learning state without learning writes. Seventeen focused cases pass. A narrow count found zero active English assignments/enrollments; designated English QA contexts must be prepared through normal controls. Existing content, audio, numerical and exposure approvals stand. Next: the final bounded pilot/source-use record, then guarded activation and live acceptance. English remains draft/inactive. [Final decision packet](english-7-unit-01-final-release-decision.md) · [Evidence](evidence/english-7-unit-01-final-release-preparation-20261022.json).

**Historical Sprint 16.1C.23 — scoped results and English learner/writing acceptance preparation.** Automatic results now name their assessed scope across learner, teacher and school views; the registered Physics extension uses consistent check-passed labels. The accepted English writing projection matches exactly, and both writing roles see its assistance rules and separate-score notice. A new isolated native-browser scenario exercises the exact accepted task through real Edge/SQL; live English acceptance remains unrun. Content, approvals, policies, audio and production data are unchanged. Next: remaining specialist/form and intended-scope reuse dispositions, then explicit learner activation and the bounded acceptance sequence. [Acceptance handoff](english-7-unit-01-learner-acceptance.md) · [Evidence](evidence/english-7-unit-01-learner-acceptance-20261022.json).

**Historical Sprint 16.1C.22 — policy accepted; exact English configuration rehearsed.** John approved the full numerical contract, finite replacement and 58-core/2-optional split. The separate English model, explicit immutable lifecycle, three pools, four policies and five 28-question forms are prepared. The production-schema rollback passed all actual validators, matched the four policy snapshots and 84 Mastery version bindings, and restored all 117 guarded tables. Eighteen focused checks pass; unchanged content, approval, QA and audio evidence is reused. No production configuration was committed and English remains draft/inactive. Next: scoped result wording and bounded learner/writing acceptance preparation, then remaining specialist/form, intended-scope reuse and explicit learner-release decisions. [Release preparation](english-7-unit-01-release-preparation.md) · [Acceptance](evidence/english-7-unit-01-policy-acceptance-20261022.json) · [Evidence](evidence/english-7-unit-01-configuration-preparation-20261022.json).

**Historical Sprint 16.1C.21 — English assessment policy proposal prepared; owner decision pending.** The five accepted 28-question forms now have an explicit scoring/readiness/retry proposal and four unbound mode recipes. Twenty-seven focused offline JS/SQL checks pass. Proposed rules: 80% of 28 equal-weight points plus whole-item skill minima, a dedicated 0.75-or-three-clean-response readiness model, up to three scored Mastery attempts and finite unscored replacement. The 60/56/84 bank remains unchanged; initial core Practice/Review allocation is proposed as 58, with P10/P11 retained as two optional extensions. No production data, content, approval, QA, audio or runtime changes. No numerical policy or learner release is adopted. Next: John’s explicit policy and optional-delivery decision, then exact configuration/qualification preparation. [Policy proposal](english-7-unit-01-policy-proposal.md) · [Evidence](evidence/english-7-unit-01-policy-proposal-20261022.json).

**Historical Sprint 16.1C.20 — owner exposure disposition recorded; formal curriculum registration complete.** John authorizes continuing with the existing bank for the provisional MVP despite its public availability. Two governing English source rows, ten official programme outcomes, fourteen skill reconciliations, seventeen skill–outcome links and 200 family traces are registered and bound to the draft release. Rollback restored all 27 guarded fingerprints; committed readback verifies 484 additions and fifteen intended draft updates. Questions, versions, approvals, saved QA, audio and materials are unchanged. No independent SME approval, assessment-policy adoption or learner activation is claimed. Next: the explicit English scoring/readiness/attempt/replacement contract. [Curriculum delivery](english-7-unit-01-curriculum-reconciliation.md) · [Evidence](evidence/english-7-unit-01-curriculum-registration-20261022.json).

**Historical Sprint 16.1C.19 — conditional assessment-form preparation complete; qualification held.** The five 28-question forms bind 140 distinct current versions and twenty separated source families (ten reading, ten listening); approved content and prior QA/playback evidence are reused without a new approval audit. Anonymous HTTP 200 downloads confirm that the public repository exposes all 140 assessment prompts/keys and twenty source texts/scripts. Actual third-party retrieval is unknown. The detailed form/reviewer packet is private; only sanitized evidence is committed. No form, policy or release is activated and no production data is changed. Next: explicit exposure disposition, formal curriculum reconciliation and the remaining assessment/qualification/release contract. [Qualification and decision brief](english-7-unit-01-form-qualification.md) · [Evidence](evidence/english-7-unit-01-form-preflight-20261022.json).

**Historical Sprint 16.1C.18 — learner teaching-guide delivery.** John reports accepting all nine guides and the writing package, including its rubric/workload proposal; that acceptance is recorded without repeating his review. The shared course workspace now has a Guides tab that reads approved teaching-guide versions in saved lesson order. Exact enrollment/release/unit authorization, diagnostic-first access and active-assessment restrictions are enforced on the server. The read-only projection excludes staff packages and writing models. The new SQL functions and Edge bundle are deployed and source-verified. Required CI passed 1,385 tests, all 93 native Chromium cases, PostgreSQL 17.6/concurrency checks and the aggregate release gate; Vercel production completed on the implementation commit. Final source synchronization is recorded in Notion. Existing question/audio evidence is reused. English remains inactive; next is source/protected-form qualification and the explicit assessment/release contract. [Guide delivery](unit-guide-delivery.md) · [Evidence](evidence/english-7-unit-01-guide-delivery-20261022.json).

**Historical Sprint 16.1C.17 — nine guides and writing package registered for review.** The shared unit-material reviewer supports immutable revisions, saved QA, source/support previews and real reviewer/MFA approval. All ten exact drafts pass saved QA; no new material has been human-approved or published as a writing task. John confirms the remaining question/audio/fix checks complete, and the narrow inventory records all 200 questions approved. The registration preserves all 71 tracked existing tables. Required CI passes 1,376 tests, 90 native Chromium cases and PostgreSQL 17.6/concurrency checks; eight SQL function bodies and both affected Edge bundles match source. English remains inactive. Next: acceptance of these ten materials, learner teaching-guide delivery, source/form qualification and the existing release gates. [Material handoff](english-7-unit-01-materials.md) · [Capability](unit-material-review.md) · [Evidence](evidence/english-7-unit-01-materials-20261022.json).

**Historical Sprint 16.1C.16 — six uploaded recordings registered; all 200 questions pass QA.** Six private audio versions and six ordered task sets now support DB/MB/MC-25–28 at v2. Independent readback verifies all twelve saved QA passes and source/audio catalog-preview matches. The bank is 60 Practice / 56 Diagnostic / 84 Mastery, with 176 in-app approvals, 200 QA passes and zero source holds. All 247 prior immutable versions, 176 approvals and unaffected rows are preserved; 64 of 71 tracked tables are entirely unchanged. Fourteen audio sets and thirteen reading sets are registered. Twenty-four ordinary Approve actions remain: twelve reading and twelve listening questions. Fresh authenticated playback of these six recordings remains an owner check; the agent browser is unavailable. English stays draft/inactive. Next: the nine-guide/writing onboarding slice, then source/form qualification and existing release gates. [Audio registration](english-7-unit-01-bcd-audio-registration.md) · [Evidence](evidence/english-7-unit-01-bcd-audio-registration-20261022.json).

**Historical Sprint 16.1C.15 — six new recordings supplied and technically verified; private upload/registration pending.** All six DB/MB/MC MP3s decode without errors, fit the existing 8 MiB limit and match the complete authored scripts under documented ASR normalization. All twelve question/key mappings are verified. An upload ZIP contains unchanged bytes under the hash filenames required by the existing audio schema, and a disabled six-audio/six-set/twelve-revision plan is prepared. Production still has 200 staged questions, 176 in-app approvals, 188 QA passes and twelve listening-source holds; all 71 table fingerprints match C14. The files are not yet in private Storage, and no new registration, QA clearance, audition, authenticated playback or learner release is claimed. [Audio handoff](english-7-unit-01-bcd-audio-preparation.md) · [Evidence](evidence/english-7-unit-01-bcd-audio-preparation-20261022.json).

**Historical Sprint 16.1C.14 — six accepted reading sources registered; all 12 linked questions pass QA at v2.** John accepted the exact passages and questions. The existing atomic editor attached the sources without changing wording, keys, source families or order. Independent readback verifies 12/12 QA passes and catalog/preview matches; 235 old immutable versions and all 176 current in-app approvals are preserved. The bank remains 60 Practice / 56 Diagnostic / 84 Mastery: 200 staged, 176 approved in-app, 188 QA passed and 12 listening-source holds. The 12 reading questions are owner-accepted in chat and ready for the authenticated reviewer Approve action; no in-app approval is fabricated. Thirteen reading sets and eight working audio sets are registered. English stays draft/inactive. [Reading delivery](english-7-unit-01-bcd-reading-registration.md) · [Acceptance](evidence/english-7-unit-01-bcd-reading-acceptance-20261022.json) · [Evidence](evidence/english-7-unit-01-bcd-reading-registration-20261022.json).

**Historical Sprint 16.1C.13 — complete 200-question bank authored and staged.** The accepted remainder is now in the reviewer catalogue: DB 28 / MB 28 / MC 28. Totals are 60 Practice / 56 Diagnostic / 84 Mastery, with 116 existing approvals preserved, 176 current QA passes and 84 new reviews. The 24 expected source holds comprise 12 reading questions awaiting six passage acceptances/registrations and 12 listening questions awaiting six recordings and source registration. Full private source previews and the six recording scripts are ready. Exact readback verifies 789 inserted rows; all prior rows in 71 guarded tables are preserved. The approved assessed-listening runtime is unchanged. English stays draft/inactive; no new approval, qualified form or learner release is claimed. [Delivery](english-7-unit-01-assessment-batch-bcd.md) · [Sources and scripts](english-7-unit-01-bcd-source-review.md) · [Evidence](evidence/english-7-unit-01-bcd-review-onboarding-20261022.json).

**Historical Sprint 16.1C.12 — owner-approved assessed listening deployed.** Diagnostic/Mastery can use an explicit v4 policy with two plays per shared recording, all related questions visible before listening, normal speed and no transcript/translation. Counts survive refresh and question changes; interrupted listening resumes from its checkpoint, and a persistent technical failure can end unscored while retaining responses and source exposure. Practice, Chapter Review and reviewer replay remain unlimited. Required CI passed, including 87 native Chromium cases and PostgreSQL 17.6 concurrency checks; the migration, all 16 function bodies and 13 affected Edge bundles are verified. All 70 tracked tables, 20 existing versioned policies and 116 English approvals/QA passes are preserved. No English policy, form or learner release is activated. Next: the accepted 84 DB/MB/MC questions, guides/writing, source/form qualification and the existing release gates. [Capability](assessed-listening-capability.md) · [Deployment evidence](evidence/assessed-listening-release-20261022.json).

**Historical Sprint 16.1C.11 — reviewer playback accepted; all 116 staged questions approved.** John reports that he checked and approved the remaining questions, the audios worked and everything looked good. Production readback verifies all 116 current versions are published/approved with passing QA and matching ordinary content approvals, including L01–L06 at v2. Zero source holds or ordinary reviews remain in the staged bank: 60 Practice / 28 Diagnostic / 28 Mastery. Eight registered audio sets support all 18 listening questions; seven reading sets are retained. This closes owner-reported reviewer playback acceptance; browser automation remains unavailable and no new automated UI or learner acceptance is claimed. English remains draft/inactive. The accepted target stays 60/56/84; next are assessed-listening policy/runtime, the remaining 84 DB/MB/MC questions, guides/writing and the existing qualification/release gates. [Current handoff](english-7-unit-01-audio-handoff.md) · [Approval/playback closure](evidence/english-7-unit-01-review-closure-20261022.json).

**Historical Sprint 16.1C.10 — five original recordings registered; 12 listening questions pass QA.** John supplied and accepted the five original recordings. Exact private bytes, five immutable audio versions and five ordered audio task sets are linked to L07–L10, DA-25–28 and MA-25–28 at v2. All 12 pass saved-version QA; 98 existing approvals are preserved. Current totals are 110 QA passes, 12 questions ready for ordinary review and six publisher-source holds (L01–L06). The rollback restored all 70 tracked tables; the commit preserved every unaffected row, with 63 tables unchanged. No question wording, key, source family, learner state or release gate changed. The accepted bank stays 60/56/84, with 84 DB/MB/MC questions still to author. Assessed-listening delivery, remaining publisher review/reuse, guides/writing, SME and learner release stay open. [Current handoff](english-7-unit-01-audio-handoff.md) · [Registration and playback evidence](evidence/english-7-unit-01-audio-registration-20261021.json).

**Historical Sprint 16.1C.9 — ordinary approvals verified; audio production handed off.** Fresh production readback confirms 98 approved questions with passing current-version QA (50 Practice / 24 Diagnostic / 24 Mastery), including all 17 reading questions at v2. Eighteen listening questions remain held solely for missing registered audio; seven reading sets and zero English audio versions are registered. All 20 publisher MP3s were retrieved and hash-verified. John is producing five original recordings externally from the unchanged, live-source-verified scripts; no recordings have been returned yet. The accepted bank remains 60/56/84, with 84 DB/MB/MC questions still to author. Practice audio integration comes first; assessed-listening policy/runtime, guides/writing, SME and learner release remain open. [Current handoff and dependencies](english-7-unit-01-audio-handoff.md) · [Evidence](evidence/english-7-unit-01-review-audio-handoff-20261021.json).

**Sprint 16.1C.8 — seven reading sources accepted and registered.** John accepted the exact passages for the MVP. Seven immutable text sets are now linked to all 17 reading questions at v2; saved current-version QA passes 17/17, and source catalog/preview checks match every question. Original wording, keys, families, order and v1 history are preserved. The bank now has 98 QA passes and 18 listening-source holds. A production rollback restored all 70 tracked tables; commit preserves unaffected rows, with 64 tables entirely unchanged. Ordinary question approval was subsequently verified under C9; audio and learner release remain open. Owner MVP authorization is recorded without claiming a publisher licence; adapted-text publication/reuse remains a release prerequisite. [Accepted passages](english-7-unit-01-reading-source-review.md) · [Acceptance](evidence/english-7-unit-01-reading-acceptance-20261021.json) · [Registration evidence](evidence/english-7-unit-01-reading-registration-20261021.json).

**Sprint 16.1C.7 — historical reading-source preparation.** Seven unchanged passages and all 17 linked questions (9 Practice / 4 Diagnostic / 4 Mastery) are consolidated for exact source review. The registration manifest preserves source families and question order, with neutral Practice source labels. Isolated rehearsal clears all 17 source holds after fixture registration, preserves v1/keys and rejects missing review/permission records and stale versions. Fresh production comparison matches the complete 116-question bank. At this preparation checkpoint no production source, revision or approval was created. C8 above supersedes the pending source acceptance/registration and clears all 17 reading holds; 18 listening holds remain. [Review batch](english-7-unit-01-reading-source-review.md) · [Evidence](evidence/english-7-unit-01-reading-review-20261021.json).

**Sprint 16.1C.6 — Unit 1 questions staged for review.** All 116 existing drafts (60 Practice / 28 Diagnostic / 28 Mastery) are now in the inactive English catalogue. Search **ENG7-U01** in the [review queue](https://www.haiedu.am/content-review.html). Private explanations and source drafts are available in question detail; 81 questions pass structural QA and 35 remain held for source registration (17 reading / 18 listening). Exact readback matches 1,073 new rows; all prior rows across 70 guarded tables are preserved. No content approval, qualified form, playable audio or learner release is claimed. Eighty-four accepted DB/MB/MC questions remain to author. [Reviewer handoff](english-7-unit-01-review-onboarding.md) · [Evidence](evidence/english-7-unit-01-review-onboarding-20261021.json).

**Sprint 16.1C.5 — Diagnostic A and Mastery A drafted.** The accepted batch now contains 56 protected assessment drafts: 28 Diagnostic and 28 Mastery, with 48 text questions and eight audio-held questions. Four reading texts and four original, unrecorded listening scripts accompany the full private review packet. Four initial near-collisions were substantively reworked before saving v1. Validation passes 95 isolated SQL grading cases and 276 stable-choice-ID/order checks; unchanged Practice evidence is reused. The bank now has 116 drafts (60 Practice / 28 Diagnostic / 28 Mastery), with 84 remaining for DB + MB + MC. All existing Practice content, textbook order and runtime contracts are preserved. Human/SME/exposure review, actual audio/rights, final assessment policy and learner release remain open; approved and qualified assessment capacity remains zero; the C5 zero-staging checkpoint is superseded by C6 above. [Review packet](english-7-unit-01-assessment-batch-a.md) · [Delivery evidence](evidence/english-7-unit-01-assessment-batch-a-20261021.json).

**Sprint 16.1C.4 — Unit 1 bank/audio plan accepted; Practice additions drafted.** John accepted 60 Practice / 56 Diagnostic / 84 Mastery and the playable-audio plan, including the exact bounded 140-slot assessment authoring manifest under existing criteria. The first 15 additions (eleven text, four audio-held) are drafted, with one original three-speaker practice script. Practice now has 60 drafts: 50 text and ten listening; the original 45 are unchanged. New content passes 57 isolated grading cases; prior 169-case evidence is reused. At this historical C4 checkpoint, Diagnostic/Mastery had zero drafts and 140 outstanding slots; C5 below the current status heading supersedes those counts. Human review, actual audio/permissions, assessed-playback/scoring policy and English release remain open. The accepted 56-question DA + MA batch is now drafted under C5; 84 DB + MB + MC questions remain. [Practice packet](english-7-unit-01-practice-additions.md) · [Owner acceptance](evidence/english-7-unit-01-owner-acceptance-20261021.json) · [Evidence](evidence/english-7-unit-01-practice-additions-20261021.json).

**Sprint 16.1C.3 — course-wide audio inventory and inclusion direction recorded.** John requires all possible, strategically relevant recordings to be included. The supplied book has 18 QR routes linking 20 MP3s: Unit counts 5/4/4/7/0/0. All 20 are retained for playable integration (12 core-listening and eight support/enrichment candidates); fifteen new technical checks pass and five Unit 1 checks are reused. Nineteen originals fit current delivery limits; Do-Re-Mi needs a reviewed smaller delivery version. Audition/permissions, two unresolved activity mappings, governed registration and browser playback remain open. No audio is live. Bank/audio-plan acceptance is now recorded under 16.1C.4; final scoring/assessed-playback policy remains open. [Course audio plan](english-7-course-audio-inventory.md) · [Evidence](evidence/english-7-course-audio-inventory-20261021.json).

**Sprint 16.1C.2 — concrete English Unit 1 bank/form proposal prepared.** Recommend 60 Practice, 56 Diagnostic and 84 Mastery questions (200 automatic items): two 28-question Diagnostic forms and three 28-question Mastery forms, with writing separate. The plan maps all 140 assessment slots and 15 Practice additions to explicit demands, and reserves ten protected reading plus ten protected listening sets. The bank and bounded authoring manifest are now accepted under 16.1C.4, with 60 Practice and 56 assessment drafts under 16.1C.5 and 84 assessment slots still unfilled; scoring/assessed-playback policy, content approval and learner release remain open. Current qualified assessment capacity remains zero. [Bank plan](english-7-unit-01-bank-plan.md) · [Manifest](content/english-7-unit-01-bank-plan.json) · [Planning evidence](evidence/english-7-unit-01-bank-plan-20261020.json).

**Sprint 16.1C.1 — first English 7 unit draft prepared and technically checked.** All 30 textbook activities retain their order and disposition. The private review packet contains 45 automatic practice drafts (39 text, six audio-held), nine guides, three reading sets, three proposed listening sets, and one 80–100-word writing task with practice/model/rubric. Current JS/SQL contracts pass 169 isolated scoring cases; the 87-word model and all mappings are checked. Whole-bank evidence finds no existing English corpus; 26 candidates have provisional new-coverage dispositions and 19 are intentional practice variants. No content is staged, approved or released; protected Diagnostic/Mastery capacity is zero. Human review, audio audition/permissions, final bank/scoring/listening/workload decisions and English release remain open. [Review handoff](english-7-unit-01-authoring-review.md) · [Complete packet](english-7-unit-01-review-packet.md) · [Evidence](evidence/english-7-unit-01-authoring-20261020.json).

**Sprint 16.1B.5 — shared reading/listening task sets deployed and verified.** Immutable ordered sources preserve each question’s skill and score. Source-family reservations and exposure protect related questions across modalities and curriculum releases. Reviewer selection/preview, private response evidence and whole-set delivery are available. Required PR/main CI passed **1,361 tests, 83 native Chromium checks and PostgreSQL 17.6/concurrency checks**. All **26 SQL definitions** and **two affected Edge bundles** match source. Production read acceptance passed **310/310**, including **54/54** two-school isolation checks; all **29 tracked data snapshots** remain unchanged. Audio retains replayable Practice/Chapter Review and per-question completion. No content, recording or policy is activated. 16.1C.1 now supplies the first-unit draft for review; audio audition/permissions, final listening/scoring/workload decisions and English release gates remain open. [Capability contract](shared-task-sets-capability.md) · [Release evidence](evidence/shared-task-sets-release-20261020.json).

**Sprint 16.1B.4 — protected audio deployed and verified.** Immutable reviewed recording references, authenticated private-byte delivery, replayable Practice/Chapter Review playback, failure-safe completion evidence, reviewer selection/preview and privacy coverage are available. Required PR/main CI passed **1,353 tests, 80 native Chromium checks and PostgreSQL 17.6/concurrency checks**. All **eight SQL definitions** and **two affected Edge bundles** match source; production read acceptance passed **289/289**, with **54/54** two-school isolation checks. All **24 tracked data snapshots** are unchanged. No recordings, English content or adopting policies are activated. Shared task sets are deployed and verified under 16.1B.5; transcripts and capped assessment playback remain unavailable pending their contracts. [Capability contract](protected-audio-capability.md) · [Release evidence](evidence/protected-audio-release-20261020.json).

**Sprint 16.1B.3 — matching and ordering deployed and verified.** One-to-one matching, categorisation with reusable targets, reviewed exact ordering sequences and private resumable drafts are available as explicit capabilities. Each question contributes at most one point; reports distinguish points from entirely correct answers. Required PR/main CI passed **1,347 tests, 77 native browser checks and PostgreSQL 17.6/concurrency checks**. All **8 SQL definitions** and **12 affected Edge bundles** match source; production acceptance passed **268/268** with two-school isolation **54/54**. All **24 tracked data snapshots** are unchanged. No English content or scoring policy is activated. Protected audio is delivered under 16.1B.4; shared task sets are deployed and verified under 16.1B.5. [Capability contract](matching-ordering-capability.md).

**Sprint 16.1B.2 — typed answers and gap-filling deployed and verified.** Bounded fields, reviewed alternatives, private resumable drafts, fractional item points and role-consistent reporting are available as an opt-in capability. Required PR/main CI passed (1,341 tests, 73 browser checks and PostgreSQL 17.6); exact-source production acceptance passed 268/268, with two-school isolation 54/54. All 15 SQL definitions and 16 affected Edge bundles match source; all 23 tracked content, policy and learner-data snapshots are unchanged. No English content or scoring policy is activated. Matching/ordering and protected audio are delivered under 16.1B.3/4; shared task sets are deployed and verified under 16.1B.5. [Capability contract](typed-fields-capability.md).

**Sprint 16.1B.1 — writing workspaces deployed and verified.** Students can save private drafts, submit, see feedback and revise. Teachers can mark declared rubric criteria, return work and retain regrade history. Required PR/main CI passed (1,336 tests and 70 browser checks); production read acceptance passed 264/264, including both roles and two-school denials. No English tasks or release are activated. Shared task sets are delivered under 16.1B.5; final English content/rubric and release gates remain open. [Writing workspaces](written-work-workspaces.md) · [Release evidence](evidence/written-work-release-20261020.json).
**Latest platform repair:** the shared guide-validator metadata correction is deployed as v11; all three bundle files read back exactly, 31 regressions and CI pass. Existing content and approvals are preserved. [Guide-validator repair evidence](evidence/remediation-guide-validator-metadata-fix-20261015.json). Earlier direct-read protection and reviewer approval repairs remain in force.
**Sprint 15F.6 — Chapter VI knowledge-only provisional pilot activated:** all **242 questions are approved, 146 guides published and 158 definitions active**. Diagnostic 19 / Practice 8 / Mastery 17 / Review 12. Mastery requires **14/17 plus one correct in each of twelve required skills**, with three attempts. Two Diagnostic and three Mastery forms contain 89 distinct approved versions; seven approved Mastery questions remain unallocated. Rollback restored all 59 tracked tables; exact readback verifies 719 configuration rows and 61 preservation scopes. Authenticated six-chapter production acceptance passed **231/231**, with two-school isolation **54/54**, desktop/mobile chapter switching and all 59 tracked tables unchanged through QA. Specialist/exposure review and performed practical assessment remain deferred. **English Grade 7 is the next subject**; textbook intake is recorded and its framework/source mapping is underway; Sprint 16 Physics course integration remains open. [Release](chapter-vi-pilot-release.md).

**Deployment-check follow-up closed — 2026-10-20:** owner-authorised signed-in browser inspection verified `Platform release checks` as **Production / Blocking** in persistent Vercel settings. The current deployment of `7a5571668950731d474b793cf425462c2acae145` lists the same check as **Required**. No settings were changed. The connector's earlier 403 remains a separate access limitation; browser verification closes the release-check attestation gap. [Evidence](evidence/vercel-deployment-check-verification-20261020.json).

**Sprint 15D.6 — Chapter IV knowledge-only provisional pilot activated:** John approved the exact contract and five revisions on 2026-10-18. All five v2 revisions passed saved-content QA and ordinary delegated approval through the signed-in reviewer UI; all 236 current questions are approved. Diagnostic 19, Practice 8, Mastery 15 (12/15 plus one correct in each of ten required skills), and Review 12 are active. The five forms contain 83 disjoint questions; 15 other Mastery items remain held outside the pools. Rollback restored all 59 table fingerprints; activation and exact 677-row readback passed 61 preservation scopes. Chapters I–III, learner records and numerical readiness parameters are preserved. Authenticated production acceptance passed **155/155**, plus two-school isolation **54/54**, on exact frontend `230925d0271bfaf55fc2973731650fe38ffeb99a`. Home → I at 1365 px, then I → II → III → IV → I at 390 px passed for both schools without page errors or attempted learning mutations. All 59 tracked public tables remain unchanged through acceptance. Specialist/exposure review is deferred; performed density/Hooke experiments remain unassessed. [Release evidence](chapter-iv-pilot-release.md).
**Sprint 15C.26 technical scope complete: Chapter III is active as the owner-authorized provisional pilot.** All 168 approved questions, 80 published guides and 344 active definitions are unchanged. Exact activation/readback verified 510 configuration rows, four v2 policy contracts and five forms; rollback and commit passed all 61 preservation scopes. Authenticated production acceptance passed **123/123**, including Home → Chapter I at 1365 px and Chapter I → II → III → I at 390 px, with two-school isolation **54/54**. All 59 tracked public table fingerprints remained unchanged after activation through acceptance. Chapters I/II and learner history are preserved. Independent specialist review, final exposure disposition and production promotion remain open. [Release and evidence](chapter-iii-pilot-release.md).
**Current programme status:** See the authoritative [project status register](project-status.md). Sprints 11/11.5/12/12.5/14 and 15A are complete for their recorded scope; Sprint 13 is closed for sequencing with the external SME production gate open. Sprint 14 and 15B.12E live switching acceptance is complete; the authorized Chapter II provisional pilot is verified. Chapter II database migrations, production configuration and activation are complete; independent SME/production gates stay open. English shared capabilities and Unit 1 are delivered. The current owner-directed sequence is Unit 2 technical closure, Units 3–6 and English course closure, then Mathematics 16.2; the remaining Sprints 16–26 milestones retain their stated scope and gates.

This file defines the canonical high-level sprint scope and sequence. [Project status](project-status.md) is the sole current delivery/gate register; [backlog](backlog.md) is the detailed implementation checklist. The overview mirrors that register. Dated execution records, content counts and pending-review statements below are historical checkpoints; later evidenced dispositions supersede them without rewriting their original observations.

## Subject-Neutral Core and Subject-Aware Extension Invariant — 2026-09-30

**Status: ✅ Adopted as a core project requirement.** The platform core must be subject-neutral; subject-specific behavior must use explicit, versioned configuration or extension points. The invariant now governs project policy, architecture decisions and future acceptance gates. Its canonical requirements and ten acceptance criteria are in `docs/subject-neutral-core.md`.

All subjects have equal architectural and product status. Physics is one subject taught and assessed through the platform; it is not a default, reference course, reference implementation or privileged path. Implementation sequence and differences in current content coverage record delivery status only and create no subject precedence. Adoption creates a bounded migration obligation for existing subject-coupled behavior. The four-subject integration gate must demonstrate that Physics, Mathematics, Armenian Language and English coexist without subject leakage or redesign of shared platform capabilities before the Grade 7 MVP is declared complete.

## Prospective assessment evidence-blueprint policy — 2026-10-02

**Status: ✅ Adopted for new authoring only.** Every new item template must declare the versioned `haiedu-evidence-blueprint-v1` profile, one or more required evidence purposes and an outcome-appropriate family size. Every attached item declares one valid evidence purpose. The protected QA path verifies family-level coverage before approval.

The shared purposes are **core understanding**, **application**, **misconception diagnosis** and **transfer reasoning**. They describe the evidence an item contributes, not its response format. Uniqueness is opt-in: a compact four-item family may require each purpose once, while a justified larger family may repeat a purpose and still cover all declared requirements.

The rule is deliberately prospective. Existing templates, approvals, immutable versions and learner evidence are not rewritten or re-approved. It does not create pools, blueprints, releases or learner visibility and does not weaken source, misconception, QA, human-review, SME or curriculum-release gates.

**Canonical policy:** [Prospective Assessment Evidence-Blueprint Policy](assessment-evidence-blueprint-policy.md).

## Whole-skill-bank comparison and textbook fidelity — 2026-10-06

**Status: mandatory platform-wide authoring/deployment-review requirement.** Before any future new or revised batch is deployed, compare its scenarios, illustrations and solution/inference paths against the entire applicable skill bank, across templates, releases and assessment purposes, including relevant history and related skill mappings. Classify new reasoning coverage, useful intentional practice variants and redundant items separately. Record the complete comparison/source evidence and refresh it when relevant content changes.

All questions must remain within the applicable textbook/programme; creative applications cannot invent untaught facts or procedures. Twelve-per-skill and other bank counts are planning targets, never reasons to pad. Report a defensible-content shortfall to John for a bank-plan decision; existing assessment delivery/scoring and release gates remain unchanged. Structural metadata and exact-text QA do not certify semantic diversity. The rule applies to all subjects, grades, chapters, schools, teachers/classes and Diagnostic/Practice/Review/Mastery banks, including new revisions in legacy families. It does not retroactively overwrite approved history.

[Canonical policy and required evidence](assessment-evidence-blueprint-policy.md) · [S02 whole-bank audit and correction](chapter-ii-s02-whole-bank-review.md).

## Platform-wide natural Armenian localization policy — 2026-09-30

**Status: ✅ Adopted as a permanent cross-platform release policy.** Every user-facing navigation item, page title, button, form label, instruction, empty state, confirmation, validation/error message, account/invitation/recovery flow, email, notification and analytics explanation must use natural, consistent Armenian across Student, Teacher, School Admin, Master Admin and Content Reviewer surfaces.

The same concept must use one approved Armenian term supplied through a centralized terminology/localization source rather than ad hoc page literals. Backend error codes remain stable and language-neutral; role surfaces map them to reviewed Armenian explanations. Technical identifiers, email addresses, curriculum/item codes and necessary international abbreviations may remain unchanged when translation would reduce accuracy. UI layouts must accommodate Armenian text naturally without letter-by-letter breaks or overflow.

This policy applies immediately to every new or modified interface. **Sprint 18** owns the centralized localization architecture, hard-coded-string removal, shared terminology dictionary and platform-wide localization regression gate. **Sprint 18.5** applies the standard to every rollover surface. Every later sprint must pass Armenian-language review before release. Working labels remain provisional until reviewed in their actual educational and administrative context.

**Canonical policy:** [Academic-Year Rollover, Continuity and Localization Policy](academic-year-rollover-localization-policy.md).

## Authenticated workspace navigation performance — 2026-10-01

**Status: ✅ First platform-wide latency/first-paint correction deployed.** Live Supabase logs showed that `get-content-quality-dashboard` averaged about **2.3 s** in the observed window, with peaks above **7 s**, and the same authenticated user could trigger several identical dashboard requests within fractions of a second during page/auth bootstrap. The visible symptom was a static header followed by a large blank area until authorization and data loading completed.

Implemented corrections:
- authenticated staff routes now render a stable HaiEdu loading shell/skeleton instead of a naked-header blank state;
- same-origin document transitions were originally enabled; the 2026-10-13 [navigation repair](evidence/shared-navigation-transition-repair-20261013.json) removes the automatic animation after reproducing browser errors, preserving native navigation;
- staff sidebar routes prefetch likely next documents during idle/hover;
- the global terminal-auth health check is deferred off the critical rendering path;
- Content Reviewer pages reuse a **20-second, user-scoped session cache** for the shared dashboard payload and coalesce in-flight loads; reviewer mutations invalidate the cache before authoritative refresh;
- Teacher, Master Admin and Security workspaces de-duplicate `getSession` / `onAuthStateChange` bootstrap work and ignore ordinary token refresh as a dashboard-reload trigger;
- School Admin uses the local session bootstrap instead of an additional remote `getUser` request and begins independent year/subject/roster/analytics reads in parallel;
- Student role routing coalesces simultaneous routing checks and the Student dashboard keeps one in-flight read instead of starting duplicates from initial auth callbacks.

Authorization remains server-authoritative. The loading shell contains no protected data, caches are keyed by authenticated user and short-lived, and existing protected endpoints/RLS/session checks remain unchanged.

Production static assets were verified after deployment. CI #1047 passed **648/648 tests**; the dedicated navigation-performance regression suite covers loading shells, content caching, auth-event de-duplication, deferred health checks, School Admin parallel reads and Student bootstrap coalescing.

**Deferred optimization:** if first-entry latency remains materially high after this correction, the next bounded performance slice is to split the Content Reviewer all-in-one dashboard read into purpose-specific summary/bank/item/curriculum payloads. The current change targets the observed duplicate-request and cross-page-navigation problem first without changing content-governance data contracts.

[Implementation record](authenticated-workspace-navigation-performance.md).

## Content Reviewer workspace information architecture — 2026-10-01

**Status: ✅ Deployed front-end restructuring; content-governance semantics unchanged.** The former monolithic Content Reviewer console was split into dedicated task surfaces so the reviewer sees the next action instead of every control at once.

- `/content` is now an action dashboard showing review queue, changes requested, QA failures, unreviewed items and a bounded priority list.
- `/content-review` is the day-to-day review queue.
- `/content-bank` is the browse/search question bank with curriculum scope and advanced filters.
- `/content-item?id=...` is the full-page item workspace with learner preview plus separate Content, Metadata, QA/Review and History tabs.
- `/content-curriculum` summarizes curriculum/program/unit coverage and quality gaps.
- `/content-evidence` isolates operational pilot evidence from ordinary content review and preserves the non-psychometric caveat.
- `/content-guides` remains the governed remediation-guide authoring workspace.
- Shared Content Reviewer navigation now exposes those dedicated pages consistently. Existing authorization, QA, versioning, approval, retirement, authoring, AAL and release gates remain server-authoritative and unchanged.
- Regression coverage now verifies the dedicated-page architecture, item tabs, curriculum navigation, review history and evidence routing. GitHub CI #994 passed **612/612 tests**, typecheck, browser-script syntax checks and institutional concurrency.
- Static production delivery was verified for `/content`, `/content-review`, `/content-bank`, `/content-curriculum` and `/content-evidence`.
- Follow-up visual QA normalized card padding across the reviewer home, review queue, bank filters/list header, item workspace, curriculum coverage, evidence surfaces and remediation-guide filters/list/editor. The redundant top-right **Դուրս գալ** control is now hidden on every Content Reviewer page; sign-out remains available once in the shared sidebar. CI #996 and #997 passed.
- The current Content Reviewer question workflow now uses **MVP Model A**: the reviewer is also the authorized editor. The item page exposes **Edit question → Save new version → Run QA → Approve**. `Submit review` and `Request changes` are no longer shown on the question reviewer page because there is no separate author recipient yet. Approval no longer silently saves edits or runs QA; it is enabled only for an explicitly saved current version with passing current-version QA. The dormant server actions remain for historical compatibility/future author-reviewer separation, but the current reviewer UI does not invoke them. CI #1002 passed **617/617 tests**.
- Technical QA is now separated from live governance state. New QA runs no longer emit `content_review_not_approved` or `sme_review_pending`; the reviewer UI suppresses those legacy codes on historical QA rows and displays **Բովանդակային հաստատում** and **Մասնագիտական (SME) ստուգում** as live status cards instead. Existing historical QA records remain immutable. `manage-content-quality` v5 is deployed. CI #1005 passed **618/618 tests**.
- Content revision saving now preserves an already-attached **draft misconception mapping** while still blocking new draft mappings. This fixes a live failure where Chapter II items carried governed draft misconception mappings, but the editor offered only active misconceptions and submitted an empty/invalid code during an unrelated wording edit. The database revision RPC now recovers the uniquely matching existing code for pre-fix browser bundles, the editor renders current non-active mappings explicitly, and generic non-2xx errors no longer falsely imply account suspension. Migration `20261001070000_content_revision_preserve_draft_misconceptions.sql` is applied. CI #1008 passed.
- The remediation-guide workspace now opens each guide in a focused, deep-linkable editor instead of keeping the long form beside the catalogue. **Բովանդակություն**, **Նախադիտում և ստուգում**, **Աղբյուրներ** and **Պատմություն** are separate tabs; technical mapping fields are under **Ընդլայնված կարգավորումներ**; question parameters render as readable labels; and history shows only changed fields by default. The former four-button lifecycle cluster is replaced by state-appropriate actions for **Սևագիր → Ստուգված → Հրապարակված**. Archiving is available only inside **Այլ գործողություններ** when the protected fallback gate permits it. Dirty reviewed content cannot be published until it is saved and reviewed again. MFA, append-only versioning, role/session checks, runtime isolation and fallback enforcement are unchanged. [PR #81](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/81) merged as `bc56b1d6eedb23afea8fe67c4f5fab7bd24d2e56`; CI #1017 and the authenticated authoring workflow passed, Vercel production succeeded, and focused tests passed 18/18.
- Screenshot QA then corrected the action footer: lifecycle actions now sit directly below the mandatory reason field, remain discoverable instead of appearing mysteriously disabled, and focus that field with an Armenian explanation when its value is missing. **Պահպանել փոփոխությունները** is hidden until there is an actual edit; reviewed dirty content still cannot be published, and publish/archive MFA requirements are unchanged.
- A second workflow QA pass removed the meaningless prose requirement from unchanged lifecycle transitions. **Նշել որպես ստուգված** and **Հրապարակել** now receive explicit server-generated audit descriptions; human-entered reasons remain mandatory for saved content edits, archiving and reopening. The reason field is hidden when it is irrelevant, and the server rejects attempts to mark unsaved edited content as reviewed. MFA and append-only history remain unchanged.
- A live Sprint 15B.4 review exposed a false **unsaved changes** block on **Նշել որպես ստուգված**. Root cause: governed Chapter II guides store canonical source provenance as `textbookSha256`, `textbookLocator` and `programmeOutcomeLocator`, while the reviewer form submitted modern alias fields (`sourceTitle`, `sourceLocator`, `sourceUrl`, `notes`). The lifecycle API now merges reference edits onto stored provenance, ignores newly introduced blank aliases, compares normalized stored content, and treats canonical textbook SHA+locator provenance as valid source traceability. The editor preserves unknown provenance keys, displays canonical provenance explicitly, and history comparison includes those fields. A related latent bug was also fixed: skill guides now submit only `misconceptionCode`, while template guides submit only `triggerErrorCode`; the server canonicalizes this by scope for old browser bundles as well. Existing guide/history rows were not rewritten. `manage-remediation-guides` v8 is live. CI #1061 passed **654/654 tests**, typecheck, browser-JS syntax and institutional concurrency.
- **Technical QA Phase 2 is complete (2026-10-02).** This non-browser pass covered repository/runtime contracts, live production data invariants, authorization boundaries, curriculum scoping, review/version history, SME-state separation, remediation-guide lifecycle integrity, error localization, loading/cache behavior and production static delivery. It found and corrected a Question Bank curriculum-filter defect: the curriculum companion module could observe a missing `detailPanel` on the dedicated bank page and could independently re-fetch the full dashboard after table mutations, undermining the shared-cache work. The bank now uses the shared authenticated dashboard loader, null-guards optional detail surfaces, consumes the shared dashboard event and does not launch a second refresh request. Reviewer action, evidence, review-history and remediation-guide API errors now have natural-Armenian UI mappings; known technical-QA diagnostics are fully mapped as well. The SME validation state is read-only to Content Reviewer and server-blocked from ordinary metadata/revision mutation. Live database checks found **0** item-code duplicates, **0** approved/published items without current passing QA, **0** option-key/answer integrity errors, **0** retired-published items, **0** unscoped items, and exactly one primary curriculum scope for all **284** items. Guide lifecycle checks found **23** published guides with **0** runtime-version audit mismatches, **0** reference mismatches and **0** learner-content mismatches; higher authoring-version numbers are intentional because authoring history counts lifecycle events independently of learner runtime versions. Authenticated negative authorization QA passed **19/19** across the principal Content Reviewer APIs. Final CI #1123 passed **715/715 tests**, typecheck, browser-JS syntax and institutional concurrency. Production static assets were verified after deployment. One non-blocking content-governance observation remains: 18 legacy Chapter I published guides still have empty reference metadata; no data was rewritten during QA. **Phase 3** is deliberately deferred: positive signed-in browser acceptance for filters/navigation, temporary dirty-state discard, curriculum/evidence drill-downs, guide browsing/lifecycle presentation and repeated navigation/cache behavior. [Phase 2 record](content-reviewer-technical-qa-phase2.md).
- Implementation commits: `8276165d`, `3699aae1`, `f6d6b1f8`, `0ebaa7b8`. [Implementation record](content-reviewer-workspace-ia.md).

## Sprint 15A authoring-tool decision — 2026-09-29

By product-owner approval, Sprint 15 begins with **15A — Content and Hint Authoring Tools**. It is a mandatory entry slice before bulk hint production or publication for Physics 7 Chapters II–VI. Curriculum/source mapping may proceed in parallel, but scaling the hint bank must wait until the governed reviewer workflow passes its acceptance gate. The editor is deterministic content-governance infrastructure; live AI hint generation and teacher editing remain outside this slice.

## Bounded code-review maintenance — 2026-09-28

Three immediate review actions are implemented as one bounded slice: CI parity for mirrored core modules with import-extension normalization, DOM-safe MFA factor rendering, and README correction for the live session-bound learning loop and retired HTTP-410 endpoint. [Implementation and verification record](qa-review-three-actions.md). This checkpoint does not close Sprint 14 or change authorization, curriculum/release gates, learning criteria or the remaining institutional acceptance scope. Hosted CI and delivery status are recorded with the implementation PR and Notion checkpoint.

## ChatGPT execution-mode routing

This roadmap also governs how ChatGPT should be used for each sprint. The mode is a default routing rule, not a substitute for judgment about a specific task.

### Mode definitions

- **Regular chat** — architecture, curriculum/standards reasoning, policy and governance decisions, metric definitions, acceptance criteria, evidence interpretation, disposition decisions and implementation planning.
- **Work mode** — multi-step execution across GitHub, Supabase, Vercel, Notion and browser QA; code changes; migrations; deployment; repetitive cross-role/cross-browser checks; evidence collection and synchronization.
- **Hybrid** — define and approve the slice in regular chat first, execute it in Work mode, then return to regular chat to audit evidence and decide the next slice.

### Routing invariant

1. Before substantial work starts, classify the requested slice as **Regular chat**, **Work mode**, or **Hybrid**.
2. A broad request such as "continue Sprint 14" must **not** be sent directly into open-ended Work mode. First define the next bounded slice, invariants, acceptance criteria and exclusions in regular chat unless those are already explicit in the roadmap/implementation plan.
3. Once a slice is execution-ready, use Work mode for repository/database/deployment/browser work rather than manually coordinating many implementation calls in regular chat.
4. After Work mode completes a material slice, review the evidence in regular chat before expanding scope or declaring the sprint complete.
5. Human authorization, curriculum interpretation, SME judgment, privacy-policy decisions and acceptance/disposition decisions are never delegated to Work mode as autonomous product decisions.
6. QA-only or implementation-only residuals should be treated as closure punch-list work, not as invitations to redesign the architecture unless testing reveals a genuine architectural defect.

### Default mode by sprint

| Sprint | Default mode | Routing rule |
|---|---|---|
| 0 | Work | Repository, Supabase, RLS, CI/CD and deployment execution. |
| 1 | Hybrid | Curriculum architecture in chat; structured implementation in Work. |
| 2 | Work | End-to-end vertical-slice implementation and verification. |
| 3 | Hybrid | Diagnostic/session rules in chat; implementation and regression in Work. |
| 4 | Work | Dashboard, queries, UI and integration testing. |
| 5 | Hybrid | Adaptive-learning rules in chat; code and regression in Work. |
| 6 | Hybrid | Mastery semantics in chat; protected workflow implementation in Work. |
| 7 | Work | Teacher-dashboard implementation and multi-surface verification. |
| 8 | Hybrid | QA/content-governance framework in chat; workflow implementation in Work. |
| 9 | Work | Browser/device/accessibility/localization QA and fixes. |
| 10 | Hybrid | Privacy/security policy in chat; RLS/auth/admin/deletion implementation in Work. |
| 10.5 | Work | Front-end implementation and cross-device/browser verification. |
| 11 | Hybrid | Governance/standards/evidence decisions in chat; residual QA, migrations and technical execution in Work. |
| 11.5 | Hybrid | Tester/pilot authorization and evidence rules in chat; cohort setup, operational QA and evidence collection in Work. |
| 12 | Hybrid | Calibration interpretation and decision rules in chat; data extraction/implementation in Work. |
| 12.5 | Hybrid | Academic policy and attention-model definitions in chat; state machine, data model, APIs, UI, analytics and QA in Work. |
| 13 | Work | Release checklist, deployment, migrations, regression and evidence reconciliation. |
| 14 | Hybrid | Multi-tenant academic architecture first in chat; bounded implementation slices in Work. |
| 15 | Hybrid | Content-governance and curriculum design in chat; reviewer editor, bulk ingestion and technical QA in Work. |
| 16 | Work | Physics course integration and regression through the shared subject-neutral contracts. |
| 16.1 | Hybrid | Reuse completed Unit 2 technical acceptance and deliver English Units 3–6 in textbook order using whole-unit source/bank/audio/writing batches. Course closure precedes Mathematics; existing approvals and unchanged evidence are reused. |
| 16.2 | Hybrid | Mathematics curriculum/evidence design in chat; vertical-slice implementation and QA in Work. |
| 16.3 | Hybrid | Armenian-language curriculum/evidence design in chat; vertical-slice implementation and QA in Work. |
| 16.4 | Work | Four-subject Grade 7 integration, regression and MVP-readiness verification. |
| 16.5 | Hybrid | Student dashboard audit and mockup review in chat; reviewed design implementation and browser/release acceptance in Work. |
| 17 | Hybrid | Four-subject pilot design and interpretation in chat; operational setup/QA/evidence handling in Work. |
| 18 | Work | Performance, observability, backups, CI/CD, security, data-integrity and curriculum-change operations. |
| 18.5 | Hybrid | Academic-year lifecycle/rollover rules in chat; lifecycle, handover and rollover implementation in Work. |
| 19 | Work | Institutional beta release, onboarding, support and operational verification. |
| 20 | Hybrid | Grade-specific curriculum modelling in chat; bulk implementation/QA in Work. |
| 21 | Hybrid | Post-MVP subject/grade selection and disciplinary modelling in chat; generalized implementation in Work. |
| 22 | Work | Repeated standards-driven subject onboarding once the framework is stable. |
| 23 | Hybrid | Longitudinal data model in chat; cross-grade/cross-subject implementation in Work. |
| 24 | Hybrid | Metric definitions, confidence/explainability and interpretation in chat; analytics queries/dashboards in Work. |
| 24.5 | Hybrid | Teacher intervention/assessment/remediation policy in chat; workflow implementation in Work. |
| 25 | Hybrid | AI boundaries/evaluation in chat; integrations, tests and telemetry in Work. |
| 26 | Hybrid | National-scale governance/architecture in chat; scale/security implementation in Work. |

### Historical Sprint 11 routing

Routing guidance before Sprint 11 technical handoff, preserved for history. That handoff and the later one-adult feasibility run are now complete; see the [status register](project-status.md):
- remaining **11F–11H** QA/disposition execution defaults to **Work mode** using the frozen closure punch-list;
- **Sprint 11 closes at technical handoff readiness**, not at completion of a human cohort;
- the existing 11L pilot authorization/cohort gates remain fail-closed and are carried forward intact into **Sprint 11.5**;
- informal/external testing may begin only within the permissions and safeguards available for that tester, but such evidence does not count as formal pilot/calibration evidence unless the Sprint 11.5 authorization gates are satisfied;
- final Sprint 11 technical evidence review happens in **regular chat** before declaring handoff readiness.

## Status legend

- ✅ Complete
- 🟡 In progress
- ⏳ Planned / pending
- ⚪ Explicitly deferred or accepted limitation

## Roadmap

| Sprint | Name | Status | Current disposition |
|---|---|---:|---|
| 0 | Technical Foundation | ✅ | Core repository, Supabase, deterministic grading, RLS and initial deployment foundation established. |
| 1 | Grade 7 Physics Curriculum Architecture | ✅ | Chapter I curriculum architecture completed; external Physics SME validation remains explicitly provisional where noted. |
| 2 | First Vertical Learning Slice | ✅ | First authenticated learner loop implemented. |
| 3 | Diagnostic + Bounded Learning Sessions | ✅ | Diagnostic and bounded session model implemented. |
| 4 | Diagnostic Results & Student Dashboard | ✅ | Diagnostic evidence and student-facing dashboard implemented. |
| 5 | Adaptive Practice v2 | ✅ | Adaptive practice, remediation and bounded-session behavior implemented. |
| 6 | Mastery Checks | ✅ | Protected Mastery Check workflow implemented. |
| 7 | Teacher Dashboard v1 | ✅ | Class, student, skill-matrix and intervention views implemented. |
| 8 | Content & Assessment Quality System | ✅ | Content review, QA and lifecycle controls implemented. |
| 9 | UX, Accessibility & Armenian Localization QA | ✅ | Armenian-first UX, accessibility and responsive hardening completed at source/QA level. |
| 10 | Security, Privacy & Administration | ✅ | Role, status, privacy, deletion and administration controls implemented. |
| 10.5 | Student Experience & Front-End Redesign | ✅ | Front-end redesign completed; deferred live browser matrix was later dispositioned in 11F.2. |
| 11 | Assessment Integrity, Standards Integrity & Technical Handoff Readiness | ✅ | Technical handoff complete. 11F–11H are passed/dispositioned; the carried-forward 11L entry gates are now satisfied by the prospective Sprint 11.5 pilot. |
| 11.5 | Controlled External Tester Pilot | ✅ | Closed one-adult feasibility run: eight eligible prospective sessions, smooth experience, no substantive content defects, historical Diagnostic excluded, and all closure gates passed. |
| 12 | Learning-Model Calibration | ✅ | 12A.1–12A.5 complete; 12B reviewed the feasibility evidence and recorded an immutable deferred/no-change disposition. No learning parameter changed. |
| 12.5 | Universal Chapter Review & Mastery-Retry Lifecycle | ✅ | Complete. 12.5A–Z, lifecycle branches, persisted MCQ randomization, authenticated desktop QA and authenticated mobile learner/teacher QA at 390 px and 430 px all pass. Production Mobile browser QA #2 passed on GitHub head `0c56fa8`. |
| 13 | Chapter I Standards-Verified Production Release | ✅ sequencing closure; release gate open | Product owner directed Sprint 14 to proceed. External Physics SME approval is still pending and the Chapter I release remains pilot, not standards-verified production. |
| 14 | Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture | ✅ technical scope | 14A deployed. 14B account/provisioning/recovery controls, school-admin operations and teacher workspace operations are deployed. Institutional classroom creation, class-bound bulk invitations, optional secure join codes, dedicated active/archive views, and authorized classroom renaming are complete. The 14C school-scoped learner onboarding, exact-context session stamping and teacher roster/evidence views pass their controlled production checks. Teacher offboarding and final school-administrator guards are deployed. Authenticated two-school read isolation passed 54/54 checks. Authenticated class/staff mutation-denial and teacher navigation/rename/offboarding action acceptance passed 141/141 checks, with read isolation passing 54/54 before and after. 14D school-wide analytics is complete: production acceptance passed 10/10 for both QA schools, including own-school reads, cross-school denials, aggregate-only payloads and authenticated board rendering. Authenticated Chapter I → II → I desktop/mobile switching passed 91/91 on the activated Chapter II pilot, closing the remaining Sprint 14 technical gate. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ✅ provisional-pilot technical scope | All six chapters are active provisional pilots. 15F.6 exact activation and authenticated production acceptance 231/231 are verified. Specialist/exposure/performance limits and Sprint 16 integration remain separate. [Current status](project-status.md). |
| 16 | Physics 7 Course Integration | ⏳ | Integrate the available Physics 7 course units through the same subject-neutral contracts and preserve unit-bound diagnostics/mastery with course-level aggregation. |
| 16.1 | English 7 Six-Unit Course Delivery | 🟡 Units 1–2 technically verified; Unit 3 next, Units 4–6 planned | John directs completion of English Grade 7 through textbook Units 1–6 before starting Mathematics. Unit 1 evidence is retained. John reports all outstanding Unit 2 approvals complete; this report is accepted without repeating his review or auditing approval clicks. Retained Unit 2 exact-deployment read acceptance passes 136/136 checks plus 54/54 nested isolation checks on source `96a1e6b1a3448fb6b5e282386d012d89dc89e48d`. Unit 2 learner/audio/writing acceptance is now verified under C37. Next: Units 3, 4, 5 and 6 in order, with whole-unit batches and course closure. New unit counts/forms/policies require source and whole-bank evidence; none are pre-approved by this sequencing decision. Existing release controls, source protection, classroom speaking and deferred specialist gates remain. Sprint 16.2 follows English course closure. |
| 16.2 | Mathematics 7 MVP Vertical Slice | ⏳ After English Units 1–6 closure | Build one production-ready, official-programme-derived Mathematics 7 unit through the complete learner, teacher, governance and QA pipeline. |
| 16.3 | Armenian Language 7 MVP Vertical Slice | ⏳ | Build one production-ready, official-programme-derived Armenian Language 7 unit through the complete learner, teacher, governance and QA pipeline. |
| 16.4 | Grade 7 Four-Subject MVP Integration | ⏳ | Integrate Physics, Mathematics, Armenian Language and English; verify subject isolation, shared workflows, analytics, assignments, tenant controls and release provenance. |
| 16.5 | Student Dashboard Design & Usability Pass | 🟡 | Owner-prioritized now. 16.5A audit, compatibility matrix and clickable review prepared; design approval, 16.5B implementation and 16.5C acceptance pending. |
| 17 | Grade 7 Four-Subject School MVP Pilot | ⏳ | Run the formal school-level MVP pilot only after Sprint 16.4 four-subject integration and Sprint 16.5 design/usability acceptance pass; technical QA may continue earlier. |
| 18 | Production Hardening & Curriculum-Change Operations | ⏳ | Address scale, performance, security, observability, incident response, backup/restore, data-integrity checks, controlled rollout, safe curriculum-version migration/rollback and centralized Armenian localization architecture. |
| 18.5 | Academic-Year Lifecycle, Rollover & Continuity | ⏳ | Approved design; implementation and acceptance pending. Headmaster approves progression and activates the year, then teachers create subject classrooms with fixed selectors; preserve account identity, eligibility checks and read-only history. Documentation reconciliation is complete. |
| 19 | Public / Institutional Beta | ⏳ | Controlled external beta with repeatable school onboarding, support/escalation, tenant-isolated administration, controlled enrollment and explicit curriculum-release identity. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand Physics vertically by mapping each grade to its applicable current programme rather than copying Physics 7 upward. |
| 21 | Post-MVP Subject / Grade Expansion | ⏳ | Onboard the next priority subject/grade combination using the four-subject Grade 7 evidence model and verify repeatability beyond the MVP bundle. |
| 22 | Multi-Subject Expansion Across Grades | ⏳ | Apply a repeatable standards-driven subject-onboarding pipeline across multiple subjects and valid grade combinations. |
| 23 | Cross-Grade / Cross-Subject Learner Profile | ⏳ | Build longitudinal, curriculum-version-aware learner state that survives grade/school changes and can support cross-grade/cross-subject prerequisites. |
| 24 | Advanced Teacher, School & Curriculum Analytics | ⏳ | Add evidence-confidence-aware instructional, cohort, school, curriculum-implementation, growth, engagement, question-quality and explainable analytics. |
| 24.5 | Teacher Assessment, Intervention & Remediation Workflows | ⏳ | Turn trusted analytics into teacher-controlled assessments, interventions, reassessment/retention queues, notifications and targeted remediation/homework. |
| 25 | Controlled AI Layer | ⏳ | Introduce provider-independent, bounded AI assistance while keeping official curriculum identity, grading, mastery evidence, permissions and progress deterministic/auditable. |
| 26 | National-Scale Readiness | ⏳ | Prepare multi-school governance, large-scale operations, curriculum-update governance, regional/national administration, security and support for national deployment. |

## Historical delivery record — Sprint 11

### 11A — Item-bank architecture and exposure model

**Status: ✅ Complete.**

### 11B — Repetition and selection policy

**Status: ✅ Complete.**

### 11C — Parameterised and parallel item variants

**Status: ✅ Complete.**

### 11D — Grade 7 Physics Chapter I bank expansion and content QA

**Status: ✅ Complete.** Production bank: 240 active pilot-eligible variants across 10 skills, with 120 Practice, 40 Diagnostic and 80 protected Mastery variants.

### 11E — Pilot analytics and item-quality evidence

**Status: ✅ Complete.** Operational evidence and assessment-integrity analytics are live; these metrics are pilot evidence, not validated psychometrics.

### 11F — Closed Grade 7 Physics Chapter I pilot readiness and production workflow

**Status: ✅ Complete for technical handoff.**

11F now represents the technical/production readiness portion of the pilot. The real-cohort closure gate is moved to 11L so that the final cohort runs against a standards-reconciled curriculum baseline.

| Phase | Status | Evidence / next step |
|---|---:|---|
| 11F.1 Technical preflight | ✅ | Automated/source, database, active-bank, security/RLS and session-collision preflight completed. |
| 11F.2 Authenticated rendered production smoke | ✅ | Student and teacher authenticated production rendering passed where executable. Four authenticated browser-control repetitions were explicitly accepted as limitations, not PASS results. |
| 11F.3 Final production workflow smoke | ✅ | Teacher evidence, suspension/session revocation, privacy and deletion behavior are closed by live production/database evidence; Mastery full lifecycle is explicitly deferred rather than forced. |
| 11F.4 Privacy/participation readiness boundary | ⚪ | Human participation authorization is explicitly deferred to Sprint 11.5; Sprint 11 preserves the fail-closed pilot controls. |
| 11F.5 Technical handoff report | ✅ | Consolidated report: `docs/sprint-11-technical-handoff-report.md`. |

Recent 11F.3 production work also surfaced and corrected course-entitlement, class-join verification, course-loading and authentication-state-flash defects. Teacher-side rendering of generated Diagnostic evidence has been manually verified. On 2026-09-18 the stale second Diagnostic was preserved and marked abandoned with an explicit QA disposition; Home and Progress retained the valid 13/20 result, Physics routing passed, and Mastery correctly remained closed for five unfinished skills. The remaining 11F residuals were closed on 2026-09-20 from live production/database evidence plus explicit accepted dispositions. Human cohort execution is not an 11F closure requirement; it is Sprint 11.5 work.

### 11G — Multi-Subject Learner Shell Architecture Spike

**Status: ✅ Complete for technical handoff; Mathematics isolation accepted with an explicit current-render tooling limitation.**

Sprint 11G was inserted before Sprint 12 because the global learner Home and navigation still structurally assumed one subject. Continuing with that assumption would make later multi-subject expansion unnecessarily expensive.

Implemented:

- global Home now has a cross-subject information hierarchy rather than exposing a full Physics-only dashboard as the primary learner Home;
- learner navigation is generated from actual active class/course entitlements;
- subject cards are grouped by `courseKey` (`subject + grade`);
- Physics 7 keeps its existing subject-specific course, assessment and progress routes;
- a generic entitled-course workspace exists for subjects whose learning module is not yet implemented;
- a draft Grade 7 Mathematics QA fixture and class were added solely to create a real two-subject learner state;
- `bestenglishac@gmail.com` has active Grade 7 Physics and Grade 7 Mathematics QA memberships for this architecture test;
- regression tests pass and Vercel deployment reports success.

Rendered evidence:

- user-provided authenticated production screenshots on 2026-09-17 confirm that the global Home renders both `Մաթեմատիկա 7` and `Ֆիզիկա 7` simultaneously and presents a cross-subject Home rather than the old full Physics-only dashboard.

Additional rendered evidence:

- on 2026-09-18 an authenticated Physics learner opened the Physics 7 course normally from the new shell.

Final disposition: live two-subject entitlement state plus source-level route/API isolation proves that Mathematics uses the generic workspace and does not invoke Physics evidence APIs. A fresh authenticated Mathematics render could not be rerun because the saved browser session was unavailable; this is recorded as an accepted tooling limitation, not a fresh rendered PASS.

See `docs/sprint-11g-multi-subject-learner-shell.md` for the detailed contract and evidence.

### 11H — Platform-wide Front-End Containment & Layout Polish

**Status: ✅ Complete for technical handoff with explicit authenticated-render limitations.**

Sprint 11H was added after the first authenticated two-subject screenshots exposed visual containment defects: Armenian labels touching or crossing button borders, insufficient internal card spacing, and flex/grid children capable of forcing content outside component boundaries.

Implemented:

- shared controls now enforce `min-width: 0`, `max-width: 100%`, wrapping and bounded line-height;
- button-like links have consistent internal padding;
- shared cards, headers, rows and their direct children use explicit width containment;
- top/header/action rows can wrap instead of overflowing;
- multi-subject next-action, subject, empty-state and generic-course cards now have explicit internal padding;
- subject-card statistics, metadata and CTA controls are responsive and contained;
- multi-subject cards collapse safely on narrow screens;
- legacy Home invalid radius token was corrected;
- assessment/mastery surfaces received the same containment treatment;
- the learner-facing distinction among course/practice, progress/evidence and assessment was clarified;
- diagnostics and mastery checks are now explicitly defined as unit-bound, while course progress aggregates unit evidence;
- regression coverage was added for containment and assessment-scope semantics.

Rendered evidence:

- on 2026-09-18 the authenticated single-subject learner Home, Physics workspace and Progress view showed no observed containment regression at a 1350 × 926 desktop viewport.

Final disposition: shared containment rules remain verified in source; prior authenticated learner/two-subject evidence is retained; fresh production rendering on 2026-09-20 found no containment defects on teacher/admin/content entry surfaces. Fresh authenticated Mathematics/internal staff reruns were unavailable because no reusable authenticated browser session remained and are recorded as tooling limitations, not fresh rendered PASSes.

See `docs/sprint-11h-frontend-containment-polish.md` and `docs/assessment-scope-model.md`.

### 11I — National Standards Baseline & Source Registry

**Status: ✅ Complete.**

Sprint 11I now provides a database-backed standards registry and subject-programme applicability matrix.

Implemented:

- registered the current national framework: N 439-Ն as amended by N 699-Ն, current revision effective 22 May 2026;
- registered the current Physics subject standard: N 42-Ն with its appendix replaced by N 37-Ն, effective 14 August 2026;
- registered the current Physics programme source: N 40-Ն as amended and reissued by N 36-Ն, effective 14 August 2026;
- stored base legal identifiers separately from amendment identifiers;
- added authorities, source class/type, subject/grade applicability, official URLs, dates, verification/revision state and supersession support;
- bound Physics 7 to a complete national framework → Physics standard → Grade 7 programme chain;
- classified the Sprint 11G Mathematics 7 navigation fixture as `fixture_exempt`, with no standards-alignment claim;
- added RLS, admin/content-admin write boundaries, integrity constraints and foreign-key indexes;
- documented an event-driven and per-term source-review procedure.

Post-migration verification found zero unbound subject programmes. Supabase advisor checks report no security or actionable performance finding on the new registry tables; newly created indexes appear only in the expected unused-index informational list.

Exit criterion satisfied: every current subject-programme row resolves either to a complete governing source set or to an explicit non-curriculum fixture exemption.

See `docs/sprint-11i-standards-source-registry.md`.

### 11J — Physics 7 Current-Standard Reconciliation

**Status: ✅ Complete.**

The current ARLIS programme appendix was extracted and verified, resolving the prior official-outcome blocker.

Implemented:

- stored the six current Grade 7 Physics Theme 1 outcomes verbatim: five mandatory and one additional;
- recorded the framework and Physics-standard context for every official outcome;
- reconciled all 10 existing Chapter I micro-skills without changing stable skill IDs;
- classified direct versus justified derived-supporting mappings explicitly;
- recorded a disposition for all 77 registered item families;
- recomputed the active Practice, Diagnostic and protected Mastery blueprints through the actual pool → item → template → family → outcome graph;
- verified all 240 active variants retain a Chapter I curriculum scope and a current programme trace;
- added RLS-protected reconciliation/provenance tables plus fail-closed completeness assertions;
- preserved all item, session, attempt and learner-history-bearing identifiers.

Disposition summary:

- 6 official outcomes: `new_official_outcome_missing` gap discovered and resolved;
- 10 skills: `mapping_updated`;
- 77 item families: `mapping_updated`;
- no wording change, material scope change, merge, split, removal or retirement required.

Post-migration read-back shows zero unmapped skills, zero unreconciled families and zero active items without traceability. Fresh reconciliation indexes produce only expected unused-index informational notices; there is no new-table security or actionable performance finding.

Skills remain in `review` status because standards reconciliation does not substitute for external Physics SME approval.

Exit criterion satisfied: every current Chapter I skill and assessment family is traceable to the current Physics 7 programme directly or as an explicitly justified derived micro-skill.

See `docs/sprint-11j-physics7-current-standard-reconciliation.md`.

### 11K — Curriculum Versioning, Provenance & Release Gates

**Status: ✅ Complete.**

Curriculum releases and assessment blueprints are now immutable, first-class identities. The active Physics 7 Unit 1 pilot release freezes 6 official outcomes, 10 skills, 77 item families, and exact 40/120/80 diagnostic/practice/mastery item memberships.

Implemented:

- an explicit legacy release for pre-11K evidence and an exact current pilot release for the reconciled 2026 baseline;
- release snapshots for units, outcomes, skills, item-family mappings, sources, reconciliation identity and content fingerprints;
- immutable assessment blueprints with exact item/version membership;
- non-null release, blueprint and provenance identity on sessions, attempts and exposure events;
- release-scoped mastery state and runtime reads;
- automatic session/evidence binding with cross-release mismatch protection;
- content-admin visibility for releases, gates and blueprints;
- fail-closed pilot/production activation gates, with external Physics SME approval required for production;
- RLS, governance write boundaries, composite foreign-key indexes and advisor hardening.

Historical evidence was not relabelled as current-standard evidence: 11 sessions, 94 attempts and 56 exposure events are bound to `physics7_u01_legacy_pre_11k`. New work resolves to `physics7_u01_2026_08_14_pilot_r1`.

Six pilot gates pass. `external_sme_approved` remains pending and blocks production promotion by design.

Invariant enforced:

> A curriculum update must create an auditable new version/release when semantics change; it must never silently reinterpret historical learner evidence.

See `docs/sprint-11k-curriculum-versioning-provenance-release-gates.md`.

### 11L — Re-baselined Chapter I Handoff & Pilot Controls

**Status: ✅ Complete for Sprint 11 handoff controls; controlled pilot remains blocked and continues in Sprint 11.5.**

The first 11L slice is implemented against `physics7_u01_2026_08_14_pilot_r1`:

- created a controlled pilot-run identity bound to the exact current curriculum release;
- classified the original 11 sessions and then reconciled three later exact-release QA sessions;
- current classification: 14 sessions total — 10 partially compatible legacy context and 4 incompatible sessions;
- the three later exact-release sessions are classified `outside_cohort` and excluded from formal pilot/calibration evidence;
- derived zero compatible/closure-eligible sessions, attempts or exposures;
- added six entry gates and five closure gates with technical, human or shared ownership;
- added RLS-protected governance tables and security-invoker reporting views;
- added a status guard that blocks advancement to entry-ready/running/observing/closed while required gates remain open.

Current pilot state at Sprint 11 handoff: **4/6 entry gates passed, 2/6 open; 0/5 closure gates passed**. The recorded pilot status remains `blocked`, with `entry_ready = false` and `closure_ready = false`.

Sprint 11 technical handoff closure is satisfied: 11F, 11G and 11H are passed/dispositioned, the evidence baseline is reconciled, and the pilot remains fail-closed with no false claim that a human cohort has run.

The following are intentionally deferred to **Sprint 11.5**: naming the operational participation-authorization owner, approving participant/guardian scope and handling, enrolling the cohort, and collecting real-user evidence. Analytics or research opt-in is not treated as operational participant/guardian authorization. No legacy evidence is counted as validation of the exact 11K release.

See `docs/sprint-11l-pilot-closure.md` and migration `0041_sprint_11l_pilot_evidence_classification.sql`.

## Sprint 11 closure gate — technical handoff readiness

Sprint 11 closure criteria are satisfied as of 2026-09-20:

1. 11F technical/production readiness is completed or each remaining item has an explicit accepted disposition.
2. Sprint 11G remaining route-level rendered QA is completed or explicitly dispositioned.
3. Sprint 11H post-deployment visual containment QA is completed or explicitly dispositioned.
4. 11I establishes the authoritative standards/source registry for the current implementation.
5. 11J reconciles Physics 7 Chapter I against the applicable current standard/programme.
6. 11K establishes curriculum-version/provenance rules sufficient to preserve historical interpretation and exact-release identity.
7. 11L confirms that historical evidence is classified, the exact-release pilot baseline is explicit, and pilot governance remains fail-closed until human gates are satisfied.
8. Critical technical, privacy, security, curriculum or scope defects discovered during handoff QA are fixed or explicitly accepted.
9. A **Sprint 11 technical handoff report** records implemented capability, accepted limitations, unresolved non-handoff blockers, and the exact conditions under which another person may begin testing. ✅ See `docs/sprint-11-technical-handoff-report.md`.

**Sprint 11 status: ✅ Complete for technical handoff readiness.**

Sprint 11 closure **does not claim** that a controlled human pilot has run, that participant/guardian authorization exists, or that the learning model is empirically calibrated.

## Sprint 11.5 — Controlled External Tester Pilot

Sprint 11.5 begins only after Sprint 11 is technically handoff-ready.

Purpose: let one or more real users/testers use the exact current release under a controlled operating process, while preserving the fail-closed governance already implemented in 11L.

Required before evidence can count toward formal pilot review or Sprint 12 calibration:

- name the operational participation-authorization owner;
- approve the participant/guardian information and authorization workflow where applicable;
- define cohort/tester scope, dates, teacher scope, identity minimization, withdrawal, suspension and deletion handling;
- enroll only authorized participants into the controlled cohort;
- preserve exact curriculum-release and blueprint provenance.

Then observe and record:

- Diagnostic → Practice → Mastery lifecycle;
- teacher/usability evidence;
- repetition/exposure behavior;
- item/content defects;
- standards-alignment observations;
- operational defects and accepted limitations.

A person may perform **informal QA/usability testing** after Sprint 11 handoff, but their activity must not be represented as formal pilot/calibration evidence unless the Sprint 11.5 authorization and cohort gates are satisfied. If the tester is a minor, any applicable participant/guardian authorization remains part of Sprint 11.5 rather than being bypassed.

Sprint 11.5 closes with an approved pilot/test report and an evidence sufficiency decision for Sprint 12.

See `docs/sprint-11-5-controlled-external-tester-pilot.md` for the execution plan.

## Sprint 12 — Learning-Model Calibration

**Status: ✅ Complete — 12A readiness complete; 12B closed with deferred/no-change disposition.**

Sprint 12 is split into two phases so technical preparation does not stall while informal review continues.

### 12A — Calibration Readiness

12A may run now, in parallel with asynchronous informal content/usability review. Informal reviewer activity remains QA/context only and is excluded from empirical calibration.

**12A.1–12A.3 are complete and have passed a methodology audit.** The audit corrections are now implemented:

- the learning-model baseline remains immutable as `baseline-2026-09-20-r1`;
- every future learning session is fail-closed stamped with its exact immutable learning-model configuration; prior sessions remain explicitly `unbound_legacy` rather than guessed;
- remediation guides have immutable version snapshots, and future help events preserve the exact rendered Armenian help text;
- learner recommendations have append-only issued/shown/clicked/action_started telemetry with dashboard and after-attempt policies kept distinct;
- the operative evidence contract is `contract-2026-09-20-r2`, using metric-specific eligibility and exact curriculum/blueprint/model provenance;
- the operative metric set is `metrics-2026-09-20-r2`, using learner-cluster-aware reporting, right-censoring where appropriate, expanded Hinting v2 analysis and no universal sample-size/interval rule;
- r1 contract/metric records remain immutable historical drafts;
- no learning parameter was changed.

**12A.4 is complete after closure-audit correction:** the read-only, service-role-only pipeline is pinned to an immutable pilot scope, enforces the full r2 entry/pilot-state boundary, models the actual 4/5 recovery event, provides analysis-ready learner/learner-skill outputs, preserves provenance, and exposes all 11 exact r2 metric keys.

**12A.5 is complete:** immutable protocol and decision records enforce hypothesis → eligible evidence → learner-aware sample/limitations → baseline/candidate comparison → side effects → explicit disposition → new approved configuration when changed → preserved history. Allowed outcomes include explicit `no_change` and `deferred`; observation counts never auto-authorize tuning. The one-adult feasibility pilot is now running prospectively, but its opening snapshot still has zero formal observations for all 11 metrics. No decision or model version was created and 12B remains evidence-gated.

See `docs/sprint-12a-methodology-audit-corrections.md` and `docs/sprint-12a5-calibration-decision-protocol.md`.

### 12A — Hinting & Remediation v2 foundation

The Practice help layer now supports deterministic task-aware scaffolding while retaining the existing skill-level fallback. The initial v2 rollout covers all 8 parameterized Chapter I templates (80 published variants) with progressive **orient → strategy → analogous worked example** help, safe raw-parameter interpolation and richer remediation telemetry.

Diagnostic and Mastery Check remain hint-free. The learning-model thresholds and assisted-positive evidence multiplier are unchanged. Fixed/authored templates receive specific guides selectively where they add pedagogical value rather than through mechanical full-bank duplication.

See `docs/sprint-12a-hinting-remediation-v2.md`.

### 12B — Empirical Calibration

12B reviewed the formal Sprint 11.5 feasibility evidence on 2026-09-21. The evidence was judged insufficient for tuning and the immutable decision `physics7-u01-feasibility-2026-09-21-deferred` was recorded. No parameter changed.

Sprint 12 then analyzes curriculum-compatible learner behavior:

- are students classified as mastered too early or too late?
- do some skills require excessive practice?
- are items easier/harder than intended?
- does hint use distort evidence?
- are diagnostic results consistent with later performance?
- are mastery checks producing plausible outcomes?
- how often do recommendation rules send learners in the wrong direction?
- do calibration conclusions differ by curriculum version or materially changed skill definition?

Calibration evidence must be curriculum-version aware. Evidence from materially different skill definitions or blueprints must not be pooled as though it were one construct.

Where calibration settings change, model/configuration versioning must preserve the meaning of historical evidence. Material mastery/confidence outputs must retain the model/configuration version that produced them. Calibration must explicitly support **Insufficient Evidence** rather than forcing a mastery conclusion, and consequential classifications/recommendations must be explainable from the evidence actually used. If evidence is insufficient, record a no-change/defer disposition rather than forcing a parameter change.

See `docs/sprint-12-learning-model-calibration.md` for the implementation plan and deployed-model baseline.

## Sprint 12.5 — Universal Chapter Review & Mastery-Retry Lifecycle

**Status: 🟡 Closure verification — 12.5A–Z deployed. Authenticated desktop learner/teacher QA and the required-Review/retry plus final-failure lifecycle branches pass. Only authenticated mobile-width learner/teacher rendering remains open. Sprint 13 remains on hold.**

Establish a universal, versioned platform policy for every present and future grade, subject, programme and unit:

- at most three Mastery Check attempts;
- a completed qualifying Chapter Review is required after failed Attempts 1 and 2;
- passing any attempt ends the mandatory retry loop;
- failed Attempt 3 creates final `mastery_failed_final` and prohibits Attempt 4;
- Chapter Review remains permanently available after pass or final failure;
- Chapter Review is a first-class session mode with required/voluntary contexts and auditable whole-chapter rotation;
- later Review evidence never revokes a historical Mastery pass and never contaminates pre-mastery Practice/calibration evidence;
- recommendations, learner UX and teacher analytics follow the server-authoritative state machine;
- historical records are migrated without fabricating attempt numbers or policy provenance.

The policy must be cross-subject and cross-grade. No school, teacher or chapter may silently override it. Administrative exceptions are outside the normal learner flow and require separate governance if introduced later.

Detailed specification: `docs/sprint-12-5-universal-chapter-review-mastery-retry.md`.

**QA correction — 2026-09-22:** authenticated voluntary Chapter Review testing exposed that the legacy shared item-exposure pipeline still rejected `chapter_review`. Migration `0076_sprint_12_5_chapter_review_exposure_integration.sql` extends served, answered and help exposure provenance to Chapter Review; rollback-only production probes verified question serving, exposure finalization and answer recording. Runtime provenance is `runtime-2026-09-22-r11`. This correction does not change learning parameters or lifecycle policy.

**Assessment-integrity correction — 2026-09-23 — 12.5Z:** authenticated QA exposed that single-choice options were always serialized in canonical authoring order, allowing repeated exposure to teach answer positions/keys. The shared assessment boundary now persists a private per-session-item option permutation for every single-choice item, randomizes new presentations server-side under `mcq-option-order-v1`, prevents an identical permutation on consecutive exposures of the same item to the same learner, and preserves the stored order across refresh/resume. Learner-visible A/B/C… labels are presentation positions only; canonical option identities remain private and are resolved server-side before grading. The mechanism is attached to `learning_session_items`, so it applies to Diagnostic, Practice, Mastery Check and Chapter Review and is not Physics-7-specific. Existing active unanswered items at rollout were grandfathered in canonical order to avoid changing a question already seen; answered history was not backfilled with fabricated presentation provenance. Direct learner/anonymous canonical option reads were removed. The current bank audit found 119/119 published MCQs structurally valid. A position-dependent-language audit found no current MCQ requiring fixed order; future fixed-order exceptions must explicitly set `shuffleOptions=false` with a non-empty `optionOrderRationale` or serving fails closed. An eight-exposure rollback/cleanup probe produced eight valid v1 mappings with no consecutive duplicate order, CI and Vercel are green, and active runtime provenance is `runtime-2026-09-23-r16`. No item-selection rule, score, mastery threshold, Hinting policy, Review policy or learning parameter changed.

## Sprint 13 — Chapter I Standards-Verified Production Release

Chapter I becomes the first reference-quality production unit only when all applicable gates are satisfied:

- current national-standard provenance recorded;
- current Physics subject-standard provenance recorded;
- Physics 7 programme mapping verified;
- unit/outcome/skill crosswalk verified;
- SME review completed;
- assessment pools sufficient and versioned;
- item defects corrected;
- mastery behavior calibrated where evidence allows;
- accessibility/UX stable;
- teacher workflow usable;
- no unresolved critical curriculum, privacy, security or technical defect.

Chapter I then becomes the gold-standard implementation against which later units are built.

## Sprint 14 — Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture

**Current closure — 2026-10-13:** authenticated Chapter I/II desktop/mobile switching passed 91/91 with 54/54 prerequisite read isolation; the shared repair also passed 143/143 institutional action and 10/10 analytics checks on the same reviewed revision. [Acceptance evidence](evidence/chapter-ii-pilot-read-acceptance-20261013.json) and [shared repair](evidence/shared-navigation-transition-repair-20261013.json). The dated checkpoints below retain their original scope and are superseded for the live second-release dependency.

**2026-09-30 Sprint 14D production closure:** [PR #62](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/62) activates the existing School Admin analytics area with academic-year, subject-programme/grade and class filters. The aggregate-only API enforces a live session, current school-admin membership (or platform-admin AAL2), authorized school/year/programme/class scope, active institutional enrollment and `academic_context_status='exact'`. It returns no learner identities and excludes `unbound_legacy` evidence. Participation, diagnostic completion/accuracy, Mastery Check pass contexts and Chapter Review counts use explicit documented denominators and return unavailable rates when the denominator is empty. CI #954 passed, and `get-school-performance-analytics` Edge Function v1 is deployed with source readback parity. [PR #63](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/63) added a permanent read-only production gate; [run 36757995069](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36757995069) passed **10/10** checks across both dedicated QA schools: authenticated identities, own-school aggregate success, reciprocal cross-school denial, aggregate-only payloads and authenticated Chromium rendering of the three filters. [Metric definitions, exclusions and verification gates](sprint-14d-school-performance-analytics.md). Sprint 14D is complete. Sprint 14 remains open only for live multi-context switching after a second authorized release exists.

**2026-09-28 action acceptance checkpoint:** [Production run 36354453046](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36354453046) passed **141/141 action-run checks**, plus **54/54 read checks before and after**, at `7787ed62e861ef6d42dad785a420e1501d2b4a6f`. Two generic UI defects were fixed and deployed: archived classroom URLs no longer request active evidence contexts (PR #53), and stale school-admin roster responses cannot duplicate or overwrite current cards (PR #55). CI passed 562 tests, typecheck, browser syntax and institutional concurrency checks. [Durable report, cleanup verification and exclusions](sprint-14-authenticated-actions.md). At this checkpoint Sprint 14 and 14D remained open; 14D closed on 2026-09-30.

**2026-09-28 acceptance checkpoint:** authenticated production two-school **read isolation passed 54/54 checks** with six real QA identities. [Live run](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36350990655); [scope, durable evidence and remaining gates](sprint-14-authenticated-isolation.md). This closes the read-isolation subgate only; no learner data or lifecycle action was changed.

**2026-09-27 bounded checkpoint deployed:** teacher offboarding and database-enforced final school-administrator protection ([PR #47](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/47), merge `5be0464d9c665d1c088cf5c67171d785a1f19f92`). CI #914 passed 512 tests, typecheck and nine real PostgreSQL concurrency scenarios. Production migration, three JWT-protected APIs and dashboard assets are verified. No real teacher was offboarded. See [checkpoint](sprint-14b-teacher-offboarding.md). Authenticated end-to-end action QA remains part of the open acceptance work. Other Sprint 14 gates remain open.

**14B checkpoint (2026-09-24): 🟡 Targeted enrollment, termination, guarded first-school bootstrap and staff-account provisioning deployed.** [Implementation record](./sprint-14b-targeted-institutional-enrollment.md). The platform admin issues the first school-admin invitation; an active school admin invites teachers to their own school and published subject. Recipients confirm email and set their own passwords; self-service reset uses an email link. The user reports successfully activating a school admin and teacher and receiving the teacher invitation after setting up SMTP. These are recipient reports; authenticated production verification remains pending. Pending staff invitations can be listed and revoked under current school/platform authority, with revoker audit. The school account console QA polish is on main; GitHub CI #797 passed at `1884db91`.

**Shared entry and learner account checkpoint (deployed 2026-09-24):** [PR #21](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/21) was merged at `ed08789e52ffb0ae3643a34082ce858d9d6b98bb`; [CI](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36048661361) and Vercel passed. One `/account-access` password form routes active known roles to their own workspaces, including school admin. The public home offers student self-registration and staff invitation guidance. A new student still starts with no classes; the existing eight-character legacy teacher code or link can enroll them only in an unscoped class. The sign-in return to `/join.html` accepts only a validated code. Unknown/missing profiles fail closed in the student home. Staff workspaces link to shared entry rather than collecting a second set of credentials. `manage-teacher-class` v5 rejects institutional teachers from legacy schoolless class actions; `get-teacher-dashboard` v8 returns their bounded dashboard state, and the UI shows a clear notice. Production public browser QA passed home, registration, class-code return and teacher sign-in link. Authenticated cross-role and two-school QA remain pending. A school-scoped institutional enrollment is still separate from legacy course entitlement: implement academic-context-scoped learner reads, assignment and evidence isolation, and a bounded school class invitation before claiming school student course access. Never write institutional memberships into `class_memberships` or infer a school for historical records.

**14B action acceptance (2026-09-28): passed** for reciprocal class/staff mutation denials, teacher navigation/rename/archive and school-admin offboarding cancel/confirm using six real QA identities. Only new empty classes and temporary teacher memberships were changed; original access and enrolments were preserved. See [scope and evidence](sprint-14-authenticated-actions.md). Live-session gates, admin MFA, safe role transitions, teacher offboarding and final school-administrator mutation guards are implemented. No institutional rollout, legacy evidence reassignment or automatic teacher handover is authorized by this checkpoint; permanent deletion remains Sprint 18.

**14A status (2026-09-23): 🟡 Identity and authorization foundation deployed.** Migrations 0080–0082 are applied. The server-only context resolver is exposed through an authenticated, read-only teacher endpoint; legacy class management, join codes and teacher evidence endpoints are fenced to school-unscoped classes. The database blocks legacy membership in a scoped class and freezes existing class school/year identity. Teacher analytics still assumes `PHY7-U01` and does not yet consume the new context; institutional enrollment, evidence scoping and the complete two-school release gate remain open. The bounded 14A implementation plan is recorded in [Notion](https://app.notion.com/p/3e4355a472bf81bca43bd8557727ca7f). Live schema inspection found five historical classes with no school assignment and four class memberships. Preserve these records as unbound legacy evidence; do not infer schools or backfill session identity. Begin with additive school/year/membership identities and a server-authorized academic-context contract, then verify two-school denial and two-chapter/subject coverage before release. Sprint 13's external SME release gate remains open.


Sprint 14 generalizes the platform across four coupled domains.

### Academic architecture

```text
Curriculum Framework Version
  -> Subject / Subject-Area Standard Version
      -> Subject Programme Version
          -> Units
              -> Topics
                  -> Learning Outcomes
                      -> Skills
```

Assessment engines must resolve the requested unit's skill set and blueprint. They must not assume `PHY7-U01`, 10 skills or 20 questions.

### Institution architecture

```text
Institution / School
  -> Academic Year
      -> Institutional Membership
          -> Grade / Cohort
              -> Class Instance
                  -> Subject Programme
```

The curriculum is shared centrally. Classes are school/teacher-specific delivery instances.

### Analytics scope boundary — Sprint 14C vs 14D

This distinction is binding for planning, implementation and closure claims:

- **Teacher analytics are core product functionality and a blocking Sprint 14C deliverable.** Teachers must be able to inspect authorized grade/class/student performance for everyday instructional decisions. Sprint 14C restores the already sanctioned teacher roster, skill matrix, filters and student drawer inside institutional classes; it does not invent a replacement dashboard.
- **School-wide analytics are later administrative aggregation and remain gated behind Sprint 14D.** School-wide, cross-class and administrative roll-ups must not delay, replace or redefine the teacher analytics required in 14C.
- Institutional teacher analytics must resolve the teacher's active assignment and exact school, academic year, class, subject programme, curriculum release and unit on the server. Client or URL state may preserve a selection but never grant access.
- Only evidence stamped `academic_context_status=exact` for that complete context may enter institutional class/student aggregates. `unbound_legacy` evidence remains excluded unless a separately approved legacy view explicitly identifies it.
- For any active `pilot` or `production` curriculum release, the immutable `curriculum_release_units` snapshot is authoritative for the unit code, title and sequence used by analytics. A mutable authoring record's editorial status or later metadata change must neither hide that released context nor silently rewrite its identity.
- The 14C teacher surface must expose class performance summary, skill matrix, support/review/inactivity filters and a student drill-down covering Diagnostic, Practice, Chapter Review and Mastery Check. Empty and partial data must remain visible and honest.
- Undefined cross-subject ability scores, school-wide roll-ups, bulk import and academic-year rollover are not part of the 14C teacher-analytics slice.

**14C acceptance:** an actively assigned teacher can select an authorized class/course/unit, inspect only that exact context's evidence, preserve the selection across refresh/back/deep-link navigation, and cannot cross school/class/assignment/programme/release/unit boundaries by changing identifiers.

**14D acceptance:** authorized school administrators receive separately verified school-wide aggregation only after the 14C evidence and isolation gate passes.

### 14C teacher-analytics production checkpoint — 2026-09-26

- The sanctioned institutional teacher experience is live without a replacement dashboard: the existing roster, class summary, skill matrix, support/review/inactivity filters and student drawer now consume server-authorized exact-context evidence.
- Authenticated production QA on the assigned Physics 7 class showed three rostered students: one learner with exact-context activity and two honest empty states. The learner drawer showed the single exact Chapter Review session (11/12 correct, 12 item attempts) and did not surface the learner's unbound legacy session.
- Stable navigation preserved the exact class, assignment, curriculum release and unit identifiers across refresh. The drawer identified Physics, Grade 7 and Chapter I before chapter-specific Review and skill evidence.
- A production-only gate mismatch was corrected: active pilot/production analytics now use the immutable release-unit snapshot even while the mutable authoring unit remains in editorial review. No curriculum content or lifecycle status was changed.
- GitHub PR [#31](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/31) delivered the restoration and CI #872 passed. PR [#32](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/32) delivered the release-snapshot correction and CI #874 passed. Vercel is green; Supabase runs `get-teacher-dashboard` v14 and `get-teacher-student` v9.
- Open before the complete Sprint 14 evidence/isolation gate: authenticated two-school mutual denial and live switching across a second authorized unit/course context. School-wide administrative aggregation remains 14D and is not activated by this checkpoint.

### Teacher analytics context scoping

Teacher analytics must never rely on an implicit or hard-coded "current chapter". Every learner-analytics request and rendered analytics surface must carry an explicit academic context:

```text
Class / course assignment
  -> Subject Programme Version
      -> Unit / Chapter
          -> Student analytics
```

The teacher UI must provide an explicit chapter/unit selector within the selected class/course context. A chapter-scoped student drawer must display the subject/grade, chapter sequence/code and localized chapter title immediately above chapter-specific analytics such as mastery attempts, Chapter Review, skill evidence and interventions.

The API contract must expose a canonical context object sufficient to render and authorize that scope, including at least:

- class/course assignment identity;
- subject and grade identity/display label;
- subject-programme version;
- curriculum release/version;
- unit/chapter ID and code;
- unit/chapter sequence or display number;
- localized unit/chapter title.

Teacher-dashboard queries must resolve skills, attempts, learning sessions, mastery checks, Chapter Reviews and recommendations from the selected programme/unit. They must not use global constants such as `UNIT_CODE`, code-prefix filters such as `PHY7-U01-S%`, or UI strings that assume Physics 7 / Chapter I.

The selected academic context must be server-validated against the teacher's legitimate class/course assignment before analytics are returned. Changing the selected chapter must not leak or mix evidence from another unit, subject, grade, class or curriculum release.

The UI should preserve the selected class/course/unit context in stable navigation state (URL/query state or equivalent) so refresh, back-navigation and deep links return to the same scoped analytics view.

Course-level aggregation is a separate presentation layer. Chapter-level mastery/review metrics remain chapter-scoped and must not be silently aggregated across units.

**Sprint 14 acceptance checks for this slice:**

- one teacher can switch between at least two chapters in the same course and see distinct chapter-specific analytics;
- the same teacher can switch between at least two assigned subject/course contexts without cross-context evidence bleed;
- student drawer headings and roster analytics identify or inherit an unambiguous selected chapter context;
- APIs reject a unit/programme context not assigned to the requesting teacher/class;
- no teacher analytics path depends on `PHY7-U01`, a fixed skill count, or a singleton `UNIT_CODE`;
- existing Physics 7 Chapter I data remains valid under the generalized context model;
- regression coverage proves that class/course/chapter context survives refresh/navigation and that records from different units/releases cannot collide.

The current Physics 7 Chapter I heading introduced during Sprint 12.5 is a transitional UX clarification only; Sprint 14 replaces that fixed display context with this data-driven selector and API contract.

### Authorization architecture

Target roles/scopes:

- platform/super admin — cross-platform administration only where required;
- central content admin/reviewer — centrally governed standards/curriculum/content;
- school admin — own institution only;
- teacher — legitimately assigned classes/courses only;
- student — own account and entitled learning contexts only;
- future bounded roles such as school leadership, support operator or parent/guardian.

A role name alone must never grant cross-school visibility.

### Enrollment architecture

Account identity and institutional membership are separate concepts.

Production-compatible enrollment must support controlled paths such as:

- school invitation / roster provisioning;
- bounded school registration token;
- teacher/class invitation linked to a school;
- revocable/expiring/usage-limited join codes;
- school-membership requirement before joining restricted classes where configured.

Open account creation, if retained, must not grant school or course access automatically.

### Student invitation actor boundary

The authorized chain is platform admin → school admin → teacher → student:

- the school admin invites and authorizes teachers;
- an actively assigned teacher issues student invitations from inside the exact assigned class;
- each student invitation is bound to that teacher's active school, academic year, class and subject programme assignment;
- invitations remain single-use, expiring and revocable, and the student chooses their own password;
- the school admin may inspect tenant-scoped institutional rosters but does not issue ordinary student invitations.

Any change to this actor boundary requires an explicit approved roadmap decision before implementation.

### Central content governance

Official national curriculum, standards mappings, canonical skills, assessment blueprints and validated assessment pools remain centrally governed.

Schools/teachers may control local delivery context such as:

- classes;
- assignments;
- deadlines;
- pacing;
- supplementary/local activities.

Locally created content must not silently enter the canonical national assessment bank.

### Time-aware identity and lifecycle foundation

Learner identity persists across academic years and school changes while institutional memberships are historical, time-bounded relationships. The data model must support Academic Year as a first-class entity; time-bounded student enrollments, classroom memberships and teacher assignments; teacher/classroom handover without rewriting historical authorship; and later rollover without renaming/overwriting prior-year structures.

### IAM, audit and accommodation foundations

Account, role and membership remain separate. Privileged access follows an authorized chain of trust, protected requests are authorized server-side, and significant role/membership/admin actions retain actor + institutional scope in the audit trail. The architecture must also permit private, authorized learner accommodations without changing the curriculum standard being assessed.

### Tenant-isolation release gate

Create at least two schools and multiple users:

```text
School A
  -> Admin A
  -> Teacher A
  -> Student X

School B
  -> Admin B
  -> Teacher B
  -> Student Y
```

Verify:

- Admin A cannot access School B;
- Teacher A cannot access School B;
- Teacher A sees only legitimate course/class evidence;
- Student X cannot claim School B membership without authorization;
- central canonical content is shared without sharing private learner records;
- learning state cannot collide across subjects, grades, schools or classes;
- audit events preserve actor, scope and institutional context.

This is a Sprint 14 release gate.

### Architecture readiness checkpoint

Before Sprint 14 closes, verify that the implemented foundations can support curriculum/question versioning, evidence confidence/uncertainty and model provenance, multi-tenant IAM/audit, academic-year rollover/teacher handover, and historical data-integrity checks **without redesigning the core identity/evidence model**. This is a release checkpoint inside Sprint 14, not a separate sprint.

### 14B school-admin operational overview checkpoint — 2026-09-25

**Status: ✅ deployed and authenticated production-render verified; Sprint 14 remains open.**

- GitHub implementation merges: `de9720c1ce4607dfe45efc546e3a7bedde421116` (PR #23) and `5b24cbadcd26c67d98fa95eebbf6cdbc91c78083` (PR #24 sidebar correction).
- Added read-only `get-school-admin-overview` Edge Function v1 with live-session validation and role/tenant-derived authorization.
- Preserved the approved HaiEdu school overview—brand sidebar, header, summary cards and quick actions—and removed the teacher hierarchy from that page.
- The approved `Ուսուցիչներ` view remains the teacher directory. Active teacher names now open a dedicated teacher page; assigned classes/grades are shown there, and each class expands to its tenant-scoped student roster.
- CI #852 and #854 passed, both Vercel deployments succeeded, and authenticated production QA passed the complete overview → Teachers → teacher → class accordion flow.
- Production evidence currently contains 1 teacher, 1 class, 0 enrolled students and 1 authorized subject; the expanded class correctly shows the empty-roster state.
- Performance analytics remain explicitly gated. No score, progress or intervention metric is shown until Sprint 14C establishes trustworthy context-scoped learner evidence.
- Existing test data needs cleanup: class name `Math 7A` is currently paired with the authoritative Physics subject assignment.
- 14C foundation deployed in PRs #25–#27 and corrected in PR #30 to the sanctioned actor boundary: only the actively assigned teacher issues a student invitation from the exact assigned class; the School Admin retains roster visibility but does not issue ordinary student invitations. Exact school/year/class/teacher-assignment/subject-programme enrollment, assigned-class teacher roster, immutable institutional session context and negative authorization coverage are preserved.
- Historical evidence remains explicit: all 58 pre-existing sessions are `unbound_legacy`; no legacy row was falsely backfilled.
- Automated suite passed 115/115 after the teacher-owned invitation correction; production migrations `0108`–`0110` plus `20260925214539`, Edge Functions and Vercel deployments are live.
- The narrow Supabase Auth student-invitation return URL is allow-listed. A controlled invitation to an existing learner account was accepted successfully on 2026-09-26.
- Controlled closure passed on 2026-09-26: the assigned teacher issued the invitation, the learner accepted it, the pending invitation cleared, the assigned class roster increased from two to three learners, and the first newly created post-enrollment session was stamped with exact institutional context.
- Still open: remaining offboarding/last-admin controls, authenticated two-school mutual-denial evidence, teacher chapter selection, student evidence drawer/API work and later trustworthy analytics.


### 14C controlled production closure verification — 2026-09-26

**Status: ✅ student onboarding and exact-context session stamping passed; Sprint 14 remains open.**

- The actively assigned teacher issued invitation `a379cdf2-9ce3-4a33-a761-497575b193d9` inside the exact Test School / 2026–2027 / Math 7A / Physics assignment. Acceptance `7898d74f-2f13-425a-9c9f-a0f8faf64326` created active enrollment `83e94781-c436-4a1c-b8a0-2d344d9fd682`.
- Authenticated production teacher QA passed after refresh: the pending invitation disappeared, the class count changed from two to three, and Hovhannes Vanesyan appeared in the assigned class roster.
- Historical Review session `a94ea905-7515-4404-9c79-b862ba829081` remained correctly `unbound_legacy`; no historical evidence was rewritten.
- The first newly created post-enrollment session `b3ad7e27-bae2-4345-8282-eb2f6169c048` completed 12/12 with 11 correct and `academic_context_status=exact`. It retains the exact enrollment, school, academic year, class, teacher assignment, subject programme, curriculum release, assessment blueprint, learning-model configuration and runtime build.
- The rollback-only authorization probe passed again: the actively assigned teacher could issue/revoke within the exact assignment, the School Admin was denied ordinary student-invitation authority, and no probe data persisted.
- This closes the controlled production action for onboarding and session stamping only. Tenant-isolated evidence APIs, authenticated two-school mutual denial, teacher chapter selection and the student evidence drawer remain separate open 14C work.

### 14B/14C teacher workspace completion checkpoint — 2026-09-26

**Status: ✅ implemented, merged and deployed; Sprint 14 remains open.**

- [PR #34](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/34) (`f423fefdc52651c02458537e8e822aedd98138c7`) completed the missing institutional classroom-creation wiring for invited school teachers, including authorized school/year/subject context and bounded prerequisite messaging.
- [PR #35](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/35) (`cb341d9f0019b01db0579890005530b902180d56`) added validated, deduplicated bulk email invitations for up to 20 learners while preserving a distinct single-use invitation per recipient and safe quota handling.
- [PR #36](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/36) (`92bcc95e8bbe496bfbf2213765e126228dab66fc`) restored optional 72-hour, one-use institutional join codes tied to the exact active teacher assignment, school, academic year, classroom and subject. Redemption adds only that classroom enrollment and preserves the learner account and every existing enrollment.
- [PR #37](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/37) (`b4371a0d26db30ef1579397ac8a30df8b5bfff22`) replaced the brittle roster grid with Armenian-safe responsive flex wrapping. [PR #39](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/39) (`f69e3469f9bd868cadf61c186c9975ce094424a4`) extended that responsive contract across student, teacher, school-admin, master-admin and content-reviewer dashboards.
- [PR #38](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/38) (`dcfa241c81113c867d17a0841064e605a33580c4`) made account-data/privacy inventories role-specific at both server and client layers; staff profiles no longer receive or render the learner-performance inventory.
- [PR #40](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/40) (`f26539ac9b424793624151f116d7ac4d56510c5d`) converted the teacher sidebar into URL-addressable Home, Profile, Active Classrooms and Archive views, kept classroom creation as an action, and moved archived classrooms to their own dedicated page.
- [PR #41](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/41) (`01d35ef542fefcf789e2f6cf9be5366b62d1eea7`) added 2–120 character classroom renaming for legacy and institutional classrooms. Authorization remains owner/active-assignment scoped; institutional changes use a service-only audited RPC, and renaming preserves classroom identity, enrollments and evidence.
- Automated CI and the corresponding Vercel production deployments passed for these slices. Rollback-only database probes covered institutional join-code and classroom-rename authorization without persisting probe data.
- **Do not redo these items in later Sprint 14 work.** Teacher offboarding and remaining last-admin mutation controls were subsequently deployed on 2026-09-27. The authenticated two-school class/staff mutation and teacher navigation/rename/offboarding action gates subsequently passed on 2026-09-28. Residual Sprint 14 work includes multi-unit/multi-context switching after a second authorized release exists. School-wide administrative analytics remains the separate 14D gate.

## Sprint 15 — Grade 7 Physics Expansion — Chapters II–VI

### 15A — Content and Hint Authoring Tools — mandatory entry slice

**Status: ✅ Complete — 15A.1–15A.3 deployed and authenticated closure passed.**

The governed foundation is live through [PR #65](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/65), the authoring-history parent-index correction through [PR #66](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/66), the reviewer-ergonomics/QA slice through [PR #69](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/69) (`f71dc0fe95e0eb573f4f0880fe8a81968a94e024`), and authenticated closure through [PR #71](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/71). It provides an append-only authoring history, a protected lifecycle API, complete academic catalogue and real-variant selection, immutable version comparison, guided TOTP enrollment/step-up and strengthened analogous-example/answer-leakage checks while preserving the existing learner runtime resolver. `manage-remediation-guides` v4 is active with JWT verification. Production contains 19 published guide snapshots, service-only history access and immutable-history enforcement.

15A.3 passed authenticated Content Reviewer and Platform Admin browser acceptance, first-factor and existing-factor MFA step-up, AAL1 draft/review isolation, AAL2 publish/archive, fallback and restored-publish probes. The isolated `PHY7-U01-S07-T-VOLUME-TO-L / missing_unit` guide finished published at authoring version 8/runtime version 4 with its learner-facing hash unchanged. Workflow run `36776729692` passed 7/7 anonymous, wrong-role and revoked-session checks; full CI run `36776729557` passed. The production-only `user_role` enum/text defect found by the lifecycle probe is corrected and regression-tested.

Before bulk hint production or publication for Chapters II–VI, implement a protected Content Reviewer authoring workspace that works across subjects, grades, programmes, units, skills and item templates even though Physics 7 is its first production use.

Required capabilities:

- browse, search and filter skill-level and item-template remediation guides by subject, grade, programme, unit/chapter, skill, template, guide scope and lifecycle status;
- edit the Armenian title, strategy, Hint 1, Hint 2, analogous worked example, optional error-code specialization, allowed raw-parameter placeholders and source/reference metadata;
- preview parameterized guides against real item variants without evaluating derived answers;
- support draft → review → publish → archive, with only authorized Content Reviewer/Content Admin or bounded Platform Admin sessions able to publish or archive;
- require server-side authorization for every read/write action and AAL2/step-up protection for publish/archive actions;
- preserve immutable guide versions, exact rendered-text snapshots, actor, timestamp and change rationale; production content must never be silently overwritten;
- validate missing/disallowed placeholders, fallback resolution and obvious answer leakage; analogous examples must use different values or context from the live item;
- retain the runtime resolver order: error-specific template guide → default template guide → skill fallback;
- regression-test permissions, version history, preview/rendering, placeholder safety, fallback behavior and authenticated browser workflows.

Entry gate:

- Chapters II–VI curriculum and textbook mapping may proceed in parallel.
- The 15A gate has passed. Bulk hint authoring and import for Chapters II–VI may begin only through the governed workflow; publication still requires content/SME review, pilot evidence and the applicable release gate.
- The existing Chapter I hints remain operational through the unchanged learner resolver and are editable through the deployed governed workspace.

Explicit exclusions:

- no live AI/LLM hint generation;
- no teacher authority to edit or publish canonical hints;
- no change to mastery thresholds, assisted-evidence weighting, diagnostic or Mastery Check hint policy;
- teacher-facing hint reporting/dispute intake may be added later through the governed content-correction workflow.

After the 15A gate, every remaining Physics 7 unit follows the same controlled pipeline:

```text
current Physics 7 programme
  -> official outcomes
      -> textbook/navigation mapping
          -> HaiEdu skills
              -> prerequisites
                  -> item bank
                      -> unit diagnostic
                          -> skill practice
                              -> unit mastery verification
                                  -> SME/content QA
                                      -> pilot evidence
                                          -> production
```

No invariant requires every unit to contain 10 skills. Assessment blueprints derive from the unit's actual skill structure.

### 15B.1 — Chapter II governed curriculum foundation

**Status: ✅ Deployed as a review-only foundation; content/SME and release gates remain open.**

The bounded slice is specified in [Sprint 15B.1 — Ֆիզիկա 7, Գլուխ II-ի կառավարվող հիմք](sprint-15b1-physics7-chapter-ii-foundation.md). It introduces:

- five Chapter II topics aligned to the current official programme and the saved 2023 textbook's Chapter II;
- seven normalized official outcomes and nine candidate micro-skills with explicit outcome and prerequisite mappings;
- `review`/`draft` status throughout, with no Chapter II items, pools, blueprints or learner runtime exposure;
- a protected service-only operation that creates a guide as runtime-inactive draft and records authoring version 1 atomically;
- per-unit release reconciliations and an activation invariant requiring one completed reconciliation plus Diagnostic, Practice and Mastery Check blueprints for every unit;
- a draft Chapters I–II successor candidate whose unresolved outcomes, skills, assessment, QA and external-SME gates prevent activation.

15B.2 may author the first small Chapter II item family only after the candidate curriculum map is reviewed. Draft authoring does not imply publication, pilot eligibility or production readiness.

[PR #72](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/72) merged the foundation as `72d1340ee1ac3d00c9e5c1a1bf3120169448f09f`; pre-merge CI #978 and the authenticated negative-authorization workflow passed. Production migrations added the review-only unit, source mappings and blocked successor candidate, and `manage-remediation-guides` v5 is active with JWT verification. Production verification found 5 review topics, 7 review outcomes, 9 review skills, 8 prerequisite edges, zero Chapter II item families/items/pools/blueprints, no active `PHY7-U02` release and the same 19 published remediation guides. The post-migration advisor check identified one new composite foreign-key index finding, closed by the follow-up migration `20261001003000_sprint_15b_release_reconciliation_index.sql`; all other reported advisor findings predate this slice.

### 15B.2 — Chapter II skill-map review and first governed item family

**Status: ✅ Implemented as learner-inactive draft content; external SME, content-QA, assessment and release gates remain open.**

The review found that `PHY7-U02-S01` duplicated the existing Chapter I body/substance/phenomenon skill. The duplicate candidate is archived rather than used, `PHY7-U01-S02` is now the cross-unit prerequisite for particulate-structure reasoning, and the eight-skill Chapter II map is approved for draft authoring only. This does not constitute external Physics SME approval.

The first family, `PHY7-U02-S02-F01-PARTICULATE-EVIDENCE`, contains four source-backed parallel single-choice drafts, explicit answer keys, unit scopes, version-1 snapshots, draft misconception mappings and one append-only draft remediation guide. It is specified in [Sprint 15B.2 — Chapter II skill review and first item family](sprint-15b2-physics7-chapter-ii-first-item-family.md). No assessment pool or blueprint was created, the successor release remains draft, and the learner resolver has no active `PHY7-U02` release.

[PR #74](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/74) merged the initial slice as `e316317262126e41fbc4ca90364a42cdb34567f1`; pre-merge CI #982 passed. [PR #76](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/76) merged the forward-only QA-contract correction as `33bfa2144cdbc9b983f782c656068c580e919cf3`; CI #987 and the second automated review passed, and both production migrations completed successfully. Production verification found 8 current Chapter II skills, the `PHY7-U01-S02 → PHY7-U02-S02` prerequisite at `0.72`, 1 draft family, 1 fixed authored-catalogue template, 4 learner-inactive items at version 2, 16 options, 4 answer keys, 4 unit scopes, 3 draft misconceptions, 12 response mappings and 1 versioned draft guide. The correction recomputed semantic fingerprints from skill, normalized prompt, answer and ordered options; all four fingerprints are distinct and match the governed formula, while version-1 history remains preserved. Chapter II still has zero assessment pools, zero assessment blueprints and no active release; the Chapter I pilot remains unchanged. The final advisor pass found no new high-severity issue, with only the already-known RLS/no-policy information notices, leaked-password-protection warning and pre-existing performance suggestions remaining.

### 15B.3 — First-family content review and mapping-integrity closure

**Status: ✅ Complete; final human-review gate closed.**

The product owner completed the first review pass and approved all four questions. Production reconciliation then found that I03 version 3 had lost its three misconception mappings during a wording revision, while technical QA treated the missing mappings as a warning. The wording also contained the Armenian case error `դիտարկմանը` where the sentence required the subject form `դիտարկումը`.

[PR #78](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/78) merged the platform-wide integrity correction as `a68acc229a4eaf220a2efe34fada5db83c337406`; [PR #79](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/79) merged the trigger-privilege follow-up as `0e06086d5afaf5023476d599515bd12ee113ca78`. The revision RPC now preserves omitted mappings, requires explicit confirmation before clearing every existing mapping, and correctly reinserts previously attached draft mappings. Strict templates may opt into `all_distractors`; the QA function and database publication/mutation guards then require every distractor to be mapped. Internal trigger functions are not client-callable.

Production now has I01, I02 and I04 approved with passing QA at version 2 and I03 approved with passing QA at version 4. Every item has three mappings and zero unmapped distractors. I03 uses the corrected wording `Ո՞ր եզրակացությանն է աջակցում այս դիտարկումը։`. The remediation guide is published at runtime version 2 / authoring version 6. The product owner approved the three exact Armenian misconception definitions, and migration `20261001120500_sprint_15b3_activate_approved_misconceptions.sql` activated only those definitions after validating their text and the complete mapping matrix. Chapter II still has zero first-family pool links, zero candidate-release assessment blueprints and no active release.

Closure evidence:

1. four of four current item versions are approved and have passing current-version QA;
2. the guide is published and all three approved misconception definitions are active;
3. the production matrix has twelve response mappings, exactly three per item;
4. the first family has zero assessment-pool links, and the Chapter I–II candidate release remains `draft` with zero blueprints;
5. [PR #85](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/85) merged as `26db3f4e6774b9bda690d23735edd9aeb7b3054c`; CI #1025 passed, and the production migration completed successfully.

Implementation record: [Sprint 15B.3 — First-family review and mapping integrity](sprint-15b3-first-family-review.md).

### 15B.4 — Second governed Chapter II item family

**Status: ✅ Questions approved and learner-inactive; remediation guide published at version 2 (verified 2026-10-05); misconception definitions remain draft.**

The second family uses `PHY7-U02-S03 — Տարբերակել ատոմը, մոլեկուլը և քիմիական տարրը`, the direct successor to the completed S02 family and prerequisite for S04 and S05. It contains four source-backed fixed-catalogue questions and twelve distractor mappings under the strict `all_distractors` policy. The product owner approved all four questions. The answer-position integrity checkpoint later re-keyed I02–I04 without changing option meaning; all four current versions now pass technical QA and are approved, while I01 remains unchanged. The five misconception definitions remain draft. The remediation guide is published at version 2, verified on 2026-10-05. The family has zero assessment-pool links and zero learner exposure. Implementation record: [Sprint 15B.4 — Chapter II second item family](sprint-15b4-physics7-chapter-ii-second-item-family.md).

### 15B.5 — Third governed Chapter II item family

**Status: ✅ Questions approved and learner-inactive; remediation guide published at version 2 (verified 2026-10-05); misconception definitions remain draft.**

The third family uses `PHY7-U02-S04 — Մոլեկուլների չափերը համեմատել այլ մարմինների չափերի հետ`, directly mapped to Theme 2 mandatory outcome 1(2). It contains four source-backed fixed-catalogue questions covering the angstrom-to-metre relation, numerical molecule-size ordering, the textbook’s apple–Earth scale analogy and row-based small-particle measurement. Twelve distractors are mapped under the strict `all_distractors` policy to four draft misconception definitions, and one scope-correct versioned draft remediation guide is included.

The product owner approved all four questions. The answer-position integrity checkpoint later re-keyed I02–I04 without changing option meaning; all four current versions now pass technical QA and are approved, while I01 remains unchanged. The misconception definitions remain draft. The remediation guide is published at version 2, verified on 2026-10-05. No assessment pool, blueprint, pilot or learner release is created. Implementation record: [Sprint 15B.5 — Chapter II third item family](sprint-15b5-physics7-chapter-ii-third-item-family.md).

### 15B answer-position integrity checkpoint

**Status: ✅ Complete; all revised current versions passed QA and human approval.**

The production audit confirmed that the shared server-side `mcq-option-order-v1` path covers all 131 active single-choice items: 12 opt in explicitly and 119 inherit the secure default, with zero fixed-order exceptions. Diagnostic, Practice, Mastery Check and Chapter Review use the same persisted per-session-item presentation order and server-side canonical-key translation. The mechanism is platform-wide for the shared assessment architecture and applies to future subjects and grades that use that boundary.

Chapter II’s private canonical-key distribution was revised from `A=8, B=1, C=3, D=0` to `A=3, B=3, C=3, D=3`, with every four-item family using each position once. The seven affected items had no pool link or learner exposure; their approved pre-change versions are preserved, their revised current versions passed technical QA and human approval on 2026-10-01, semantic fingerprints were recomputed, and misconception mappings followed the moved distractors. All twelve questions across S02–S04 are again `published / approved` while remaining disconnected from learner delivery. Content QA now warns on avoidable family-level answer-position concentration and rejects an explicit shuffle opt-out without a written fixed-order rationale.

[PR #89](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/89) merged as `00a0ab9918ee669d07f6d159a32c6388bbde4621`; pre-merge CI #1067 and main CI #1068 passed, `manage-content-quality` v7 is active with JWT verification, the production migration and post-change checks passed, and Vercel production succeeded. [PR #90](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/90) records the detailed deployment evidence. Final production verification passed for all 7 revised current versions with no QA errors or warnings. Implementation and audit record: [Sprint 15B — Correct-answer position integrity](sprint-15b-answer-position-integrity.md).

### 15B.6 — Fourth governed Chapter II item family

**Status: ✅ Questions approved and learner-inactive; remediation guide published at version 2 (verified 2026-10-05); misconception definitions remain draft.**

The fourth family covers `PHY7-U02-S05 — Նկարագրել ատոմների և մոլեկուլների շարժումը նյութում`, directly mapped to Theme 2 mandatory outcome 1(3). It contains four source-backed fixed-catalogue questions on continuous irregular motion, collision-driven direction changes, a molecule’s broken path and the distinction between instantaneous particle speed and net travel. Diffusion examples/rates and the temperature–speed relation remain reserved for S06–S08.

All twelve distractors are mapped under `all_distractors` to four draft misconception definitions. Canonical answer keys use `A/B/C/D` once each from the outset, while `shuffleOptions=true` preserves the platform-wide server-side presentation shuffle. The scope-correct remediation guide is published at version 2, verified on 2026-10-05; its append-only history is retained.

[PR #92](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/92) merged as `2e715c2edde8d661ede757b95f139f77a573edf6`; PR CI #1073, main CI #1074 and Vercel production passed. Migration `20261001163711_sprint_15b6_fourth_item_family` is applied. The product owner completed question QA on 2026-10-01: all four current items are `published / approved`, each has passing current-version technical QA with zero errors and zero warnings, and the family remains learner-inactive. At the 2026-10-01 checkpoint, production retained 16 options, 12 misconception mappings, 4 draft misconceptions, 1 versioned draft guide, 4 unique semantic fingerprints, balanced `A/B/C/D`, zero pool links and zero learner exposures; the candidate release remains `draft`. No assessment pool, blueprint, pilot or learner release is created. Implementation record: [Sprint 15B.6 — Chapter II fourth item family](sprint-15b6-physics7-chapter-ii-fourth-item-family.md).

### 15B.7 — Fifth governed Chapter II item family

**Status: ✅ Questions approved and learner-inactive; remediation guide and misconception definitions remain draft.**

The fifth family covers `PHY7-U02-S06 — Դիֆուզիան բացատրել օրինակներով`, directly mapped to Theme 2 mandatory outcome 1(4). Its four source-backed fixed-catalogue questions assess the definition of diffusion and its explanation through the textbook’s copper-sulfate/water experiment, vegetable pickling and oxygen transfer from air to blood. Diffusion-rate comparison, the temperature–speed relation and thermometer operation remain reserved for S07–S09.

All twelve distractors are mapped under `all_distractors` to four draft misconception definitions. Canonical answer keys use `A/B/C/D` once each, and `shuffleOptions=true` preserves the platform-wide server-side presentation shuffle. One scope-correct remediation guide and its append-only authoring version remain draft.

[PR #94](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/94) merged as `7f837e24ce53afb5224e607f92417831ef6b1f45`; PR CI #1078 and main CI #1079 passed. Production migration `sprint_15b7_fifth_item_family` is applied. The product owner completed question QA on 2026-10-01: all four current items are `published / approved`, and each has passing current-version technical QA with zero errors and zero warnings. They remain learner-inactive. Production retains 16 options, 12 misconception mappings, 4 draft misconceptions, 1 versioned draft guide, 4 unique semantic fingerprints, balanced `A/B/C/D`, zero pool links and zero blueprints; the candidate release remains `draft`. The post-migration advisor counts exactly match the preceding baseline, so this slice introduced no new advisory finding. The associated Vercel build was not produced because the account reached its build-rate limit; this bounded slice changes only repository documentation/tests and the Supabase content migration, so no web runtime asset depends on that build. Implementation record: [Sprint 15B.7 — Chapter II fifth item family](sprint-15b7-physics7-chapter-ii-fifth-item-family.md).

### 15B.8 — Sixth governed Chapter II item family and prospective evidence blueprint

**Status: ✅ Question QA and human approval verified on 2026-10-05; remediation guide and six misconception definitions remain draft.**

All four current S07 version-1 questions are `published / approved`, each with passing current-version QA, zero errors and zero warnings. No assessment-pool link exists for these items. SME validation and curriculum-release gates remain open.

The sixth family covers `PHY7-U02-S07 — Համեմատել դիֆուզիայի արագությունը նյութի տարբեր ագրեգատային վիճակներում`, directly mapped to Theme 2 additional outcome 2(1). Its source boundary is Physics 7 (2023), Chapter II, §10, printed pages 30–32. The family assesses the relative diffusion-rate order in gases, liquids and solids, the lead–gold solid-diffusion observation, and the textbook's particle-spacing explanation for the gas–liquid difference. Temperature effects remain reserved for S08 and thermometer operation for S09.

This is the first family governed by `haiedu-evidence-blueprint-v1`. Its four items are explicitly planned as core understanding, application, misconception diagnosis and transfer reasoning; this template requires each purpose once. The family uses three single-choice items and one true/false item, ten response-to-misconception mappings, six draft misconception definitions, one versioned draft remediation guide and learner-inactive semantic fingerprints. The prospective database contract rejects unprofiled new templates and missing or invalid item evidence purposes, while protected QA verifies whole-family coverage. Each profiled QA result stores a family-state fingerprint over template evidence requirements, active membership, sibling versions and evidence-purpose assignments. The fingerprint comparison, human-review insert and approval update execute in one database transaction while family and template mutations take the same transaction-scoped lock. Any intervening template change, retirement, restoration, revision or reassignment therefore requires a new QA run even when the family still covers all required purposes.

No existing family is backfilled. No assessment pool, blueprint, pilot status or learner release is created, and the Chapters I–II candidate release remains `draft`. Implementation record: [Sprint 15B.8 — Chapter II sixth item family](sprint-15b8-physics7-chapter-ii-sixth-item-family.md). Canonical cross-subject policy: [Prospective Assessment Evidence-Blueprint Policy](assessment-evidence-blueprint-policy.md).

[PR #97](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/97), [PR #98](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/98), [PR #99](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/99) and [PR #100](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/100) delivered the prospective policy, sixth family, authoritative uniqueness flag, live revalidation, exact family fingerprint, natural-Armenian rerun guidance and atomic approval. PR CI #1084, #1086, #1088, #1091 and #1092 passed; the final automated review returned no findings. Production migrations `sprint_15b8_prospective_evidence_blueprint`, `sprint_15b8_unique_evidence_flag` and `sprint_15b8_atomic_family_approval` are applied; `manage-content-quality` v10 is active with JWT verification. Transactional rollback probes passed both successful atomic approval and stale-family rejection without persisting fixtures. Vercel reported the merge-commit production deployment successful, the production reviewer route loaded, and the post-deploy advisor counts matched the preceding baseline.

### 15B.9 — Seventh governed Chapter II item family

**Status: ✅ S08 question review, current-version QA and approval complete; learner-inactive. Guide and misconception review remain open.**

Targets `PHY7-U02-S08` and Theme 2 mandatory outcome 1(5). Four purpose-distinct single-choice items cover the temperature–particle-motion relationship, a controlled diffusion comparison, the 0 °C misconception and reasoning from the textbook's equal-temperature hydrogen/oxygen data. The family uses the existing subject-neutral `haiedu-evidence-blueprint-v1` profile with purpose uniqueness, balanced A/B/C/D canonical keys and delivery shuffling. Twelve distractor mappings, eight draft misconception definitions, one versioned draft guide and exact source/curriculum provenance accompany the questions. The recovered textbook matches the established SHA-256.

[PR #114](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/114) merged after CI #1155 passed 969 tests and all Platform release checks. Production migration `20261005083017_sprint_15b9_seventh_item_family.sql` is applied. Read-back verified the full content matrix, zero pool links and blueprints, and unchanged fingerprints for all 24 previously approved Chapter II items, their versions and all releases. The earlier rollback-only probe also preserved every existing item, item version and curriculum release. No pool, blueprint or learner release is created. Human content review, protected QA, guide/misconception review and SME/release gates remain separate. [Implementation and verification record](sprint-15b9-physics7-chapter-ii-seventh-item-family.md).

Read-only production verification at 08:52:38 UTC on 2026-10-05 confirmed all four `PHY7-U02-S08-I01`–`I04` questions are `published / approved` at version 1, each with passing matching-version QA, zero errors and zero warnings. Approval timestamps span 08:40:23–08:48:37 UTC. Chapter II now has 28 approved questions. The S08 guide and all eight misconception definitions remain draft; all four items retain `provisional_no_sme_review` and zero assessment-pool links. The candidate release remains draft with zero blueprints, and the existing Chapter I release remains pilot. Question approval does not close guide, misconception, SME or learner-release gates.

The following family, **S09 — thermometer operation**, is recorded below. [Question-review checkpoint](evidence/sprint-15b9-review-20261005.json).

### 15B.10 — Eighth governed Chapter II item family

**Status: ✅ S09 question review, current-version QA and approval complete; learner-inactive. Guide and misconception review remain open.**

Targets `PHY7-U02-S09` and Theme 2 additional outcome 2(2), explaining thermometer operation. The source boundary is Physics 7 (2023), §12, printed pages 36–37 and figure 34. Four purpose-distinct single-choice questions cover thermal expansion, cooling, expansion versus creation of new liquid, and the role of a narrow capillary. The family retains the subject-neutral evidence-blueprint contract, canonical A/B/C/D balance and delivery shuffling.

The draft content includes 16 options, 12 distractor mappings, nine misconception definitions and one versioned guide. The rollback probe passed the content contracts and verified preservation of all pre-existing item/version/release rows, gate decisions and prior gate evidence. A separate read confirmed zero persisted S09 rows after rollback and 28 earlier Chapter II questions still approved. No pool, blueprint or learner release is created. Question review, guide/misconception review, external SME validation and curriculum-release gates remain separate. [Implementation and verification record](sprint-15b10-physics7-chapter-ii-eighth-item-family.md).

[PR #117](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/117) merged after CI #1161 passed 969 tests and all Platform release checks. Production migration `20261005090747_sprint_15b10_eighth_item_family.sql` is applied. Read-back confirms the complete draft content matrix, zero pool links, zero candidate blueprints and unchanged pre-existing records and gate decisions/evidence. Advisor category counts are unchanged. The question-review gate has subsequently closed; guide and misconception review remain separate. [Deployment evidence](evidence/sprint-15b10-20261005.json).

Read-only production verification at 09:17:41 UTC on 2026-10-05 confirmed all four `PHY7-U02-S09-I01`–`I04` questions are `published / approved` at version 1. Each has passing latest matching-version QA, zero errors and zero warnings. Approvals span 09:14:21–09:16:32 UTC. All four retain `provisional_no_sme_review` and zero pool links. The S09 guide and nine misconception definitions remain draft. The candidate curriculum release remains draft with zero blueprints; the existing Chapter I release remains pilot.

The eight initial Chapter II families (S02–S09) contain 32 approved questions. This morning checkpoint is superseded by 15B.11 below: all eight guides are now published. Forty misconception definitions across S03–S09 remain draft. The initial family pass does not establish a sufficient protected Diagnostic/Practice/Review/Mastery bank. External SME, content-QA, pilot and release gates remain open.

[Question-review and remaining-content checkpoint](evidence/sprint-15b10-review-20261005.json).

### 15B.11 — Chapter II outcome and assessment coverage audit

**Status: ✅ Read-only audit and remaining-review packet complete. Assessment design decisions and release gates remain open.**

Live checks on 2026-10-05 at 15:53:51 and 16:00:46 UTC confirm 32 approved current question versions, eight published guides, three active S02 misconceptions and 40 draft definitions across S03–S09. All current-version QA records pass; S02-I01 retains two historical warning entries, including pending SME, so the bank is not described as warning-free or SME-approved. There are zero Chapter II pool links or learner session-item links, and the candidate release remains draft with zero blueprints.

Seven official outcomes have directly mapped initial families: five mandatory and two additional. S03 supports mandatory 1(1); it is not a separate official outcome. S01 remains archived in favour of the existing Chapter I prerequisite.

The reviewable **192-question option** contains 96 practice/review questions, 32 diagnostic questions across two 16-question forms and 64 protected mastery questions. The existing 32 are proposed for practice, leaving 160 to author. This is a Chapter II planning option, not a universal count, activated blueprint or approved scoring change. Assessment length, treatment of additional/supporting outcomes, readiness/pass rules and final budget need explicit decisions.

Production `start-learning-session` v22 matches repository source and still fixes the Chapter I unit, skills, form pool and course entitlement. Other dashboard/status/session/UI consumers also contain fixed scope or counts. Adding content alone cannot release Chapter II. **15B.12** is the bounded shared-core migration to authorized context and versioned assessment policy, with a full consumer/deployment audit, two-unit/two-subject isolated acceptance, existing learner-history preservation and no draft-content activation. Live multi-context acceptance remains blocked until a second authorized release exists.

[Audit, assessment option and 15B.12 acceptance criteria](sprint-15b11-chapter-ii-coverage-audit.md) · [40-definition misconception review packet](sprint-15b11-chapter-ii-misconception-review.md) · [Read-only evidence](evidence/sprint-15b11-audit-20261005.json).


### 15B.11A — Dedicated misconception definition review

**Implemented and deployed — 2026-10-05; session-handling closure included in the follow-up release.** The authorized bounded addition is a subject-neutral Content Reviewer page at `/content-misconceptions`, with subject/grade/chapter/skill/status filters, linked question responses, draft text editing, request-changes decisions, individual MFA-protected approval and immutable review history. Admin/content-admin authorization and active-session checks apply server-side. Optimistic review tokens and database locks prevent stale or duplicate decisions. Existing active definitions are read-only; definition approval does not approve questions, publish guides, create pools, change learner evidence or open a curriculum release. All 40 reviewed Chapter II definitions are now active; production readback confirms 43 active definitions in the chapter and zero drafts. This page does not replace or renumber the planned 15B.12 context/policy migration. [Implementation and release evidence](misconception-review-workspace.md).


### 15B.12 — Authorized learning context and assessment policy

**Current closure — 2026-10-13:** authenticated Chapter I/II desktop/mobile switching passed 91/91 with 54/54 prerequisite read isolation; the shared repair also passed 143/143 institutional action and 10/10 analytics checks on the same reviewed revision. [Acceptance evidence](evidence/chapter-ii-pilot-read-acceptance-20261013.json) and [shared repair](evidence/shared-navigation-transition-repair-20261013.json). The dated checkpoints below retain their original scope and are superseded for the live second-release dependency.

**Historical implementation checkpoint — 15B.12A/B foundations and 15B.12C/D learning API, navigation, role dashboard and analytics consumers are complete, deployed and release-verified. 15B.12E isolated acceptance and deployed parity are complete; authenticated governed learner switching remains gated on a second authorized release.** The new subject-neutral student resolver and protected `get-learning-context` endpoint validate exact institutional enrollment, school/year/class, teacher assignment and subject grant, programme, curriculum release and frozen chapter identity. Blueprint lookup is release/unit/mode scoped. The prospective versioned assessment contract has no subject, grade, count or scoring defaults; missing rules remain unconfigured. A declared contract is not permission to launch a session.

Production readback on 2026-10-05 confirms **43 active Chapter II misconception definitions, zero drafts**, including all 40 John reviewed. This supersedes the earlier pending-review counts without changing historical inventory evidence or opening a curriculum release.

15B.12A is read-only; 15B.12B adds the authoritative policy/session database foundation without switching current learning API or dashboard consumers. Existing learner evidence and release gates remain intact. 15B.12C now migrates every affected learning/help/retry/telemetry consumer and explicit legacy compatibility mapping, including all importing deployed Edge dependencies. 15B.12D now migrates student navigation, policy-driven status/instructions and original-contract role analytics. Full 15B.12 remains open for authorized live learner acceptance (15B.12E); complete isolated acceptance and deployed parity have passed. No platform-wide runtime migration completion is claimed. The subsequent [Option B decision](chapter-ii-option-b-and-s02-expansion.md) selected 16 Diagnostic and 16 Mastery questions, two per each of eight skills, passing 13/16 plus one correct per skill, and the 96/32/64 bank target. Numeric readiness/model parameters, governed bindings and release approval remain separate; the assessment-length/bank-option decision is no longer outstanding.

**Platform-wide content requirement:** relevant source-textbook illustrations must accompany question finalization across all subjects, grades, chapters, curriculum releases and assessment modes, with source references, accuracy, mobile readability, Armenian alternative text and answer-disclosure checks. Any scope exception requires John's decision. [Illustration policy](question-illustration-policy.md).

**15B.12A verification:** [PR #127](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/127) passed 1,043 Node tests, 22 native Chromium tests, both PostgreSQL jobs and aggregate release checks. The JWT-protected new endpoint is ACTIVE; all five files match source; live preflight succeeds and signed-out access is denied. All 18 content/release inventories remain unchanged. GitHub's runner incident blocked the original verification runs, which the owner later cancelled and deleted. Evidence CI #1192 attempt 2 passed after recovery; the captured error/recovery record is retained. The persistent Production / Blocking check was reverified on 2026-10-06. Evidence PR #128 merged as `f07af23aafabb648414aa9626611de11ef6cc3e8`; main CI #1194 passed all five required jobs and the exact production revision was verified. 15B.12A is complete. [Implementation and boundaries](sprint-15b12-learning-context.md) · [Captured evidence](evidence/sprint-15b12a-release-20261005.json).

**15B.12B verification — 2026-10-06:** PR #129 merged as `03b51d5fdd455aa06e6b45d24000cb737d7f1d92`. PR CI #1199 and main CI #1200 passed 1,125 Node checks, 22 native Chromium checks, both PostgreSQL jobs and aggregate release checks; all 16 PostgreSQL 17.6 policy/session race cases passed. Production migration `20261006062951_sprint_15b12b_policy_session_bindings` is applied. Ten function bodies, RLS/privileges and exact production source were verified; all 30 checked table counts/history checksums are unchanged. Governed policies remain unseeded. Lifetime baselines use frozen programme/unit identity and cannot follow catalogue edits or collide across reused subject chapter labels. Mastery/review lifecycle allocation and all live learning consumers migrate in 15B.12C. [Implementation and boundaries](sprint-15b12b-policy-session-bindings.md) · [Captured deployment evidence](evidence/sprint-15b12b-release-20261006.json).

**15B.12C verification — 2026-10-06:** PR #131 merged as `8bdb030bae4057cbb777a34dd3f32bfcb34f7bad`; PR CI #1208 and independent main CI #1209 passed all five jobs (1,164 Node, 22 Chromium, both PostgreSQL jobs and aggregate). All 24 added PostgreSQL 17.6 learning-runtime races passed. Both migration sources, twenty SQL functions/privileges, all eleven deployed Edge bundles and all 85 runtime files match the reviewed source. Seven immutable legacy mappings preserve old evidence; no prospective policy or Chapter II release is activated. All 37 checked content/model/learner-history tables and eighteen older builds are unchanged; only a new immutable runtime build and its active pointer were added. Production serves the exact merged SHA, persistent Production / Blocking was reverified, and existing two-school analytics/actions passed 10/10 and 143/143. [Implementation and boundaries](sprint-15b12c-learning-runtime.md) · [Deployment evidence](evidence/sprint-15b12c-release-20261006.json). 15B.12D navigation/dashboard/analytics migration is now complete; full governed authenticated switching remains 15B.12E-gated until a second authorized release exists.


**15B.12D verification — 2026-10-06:** PRs #133–#135 migrated authorized student navigation, policy-driven dashboards/instructions and original-contract role analytics, including authorized read-only history. The live action suite exposed two teacher dashboard timeouts; shared current authorization reads resolved them without relaxing QA guards. Final PR CI #1222 and independent main CI #1223 passed all five jobs (1,207 Node, 30 native Chromium and both PostgreSQL checks). Five added PostgreSQL 17.6 dashboard/context races passed. SQL source/privileges and all 38 files across six affected Edge bundles match the reviewed implementation. All 33 checked content/model/learner-history tables and every older build are unchanged; three immutable implementation builds and their active pointer record D deployment/corrections. Production served exact implementation SHA `af0a4dae70c91181a9364e28bf35af1ed271ff1c`; persistent Production / Blocking was independently verified. Existing authenticated two-school analytics/actions passed 10/10 and 143/143, with 54/54 read isolation before and after and complete disposable-resource cleanup. [Implementation and boundaries](sprint-15b12d-navigation-analytics.md) · [Deployment evidence](evidence/sprint-15b12d-release-20261006.json). 15B.12E isolated acceptance and deployed parity are complete; governed live learner switching still requires a second authorized release. Chapter II and prospective assessment criteria remain inactive/unapproved.

**15B.12E isolated acceptance — 2026-10-06:** [PR #137](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/137) added connected actual Edge-handler/SQL journeys across two chapters in each of two subjects, two schools and Grades 7/8. The tests exposed and corrected a malformed UUID validator in the shared student dashboard. PR CI #1227 and independent main CI #1228 passed all five jobs (1,220 Node, 32 native Chromium, both PostgreSQL jobs and aggregate). Thirteen connected checks passed against PGlite and PostgreSQL 17.6; two new native journeys use actual course/player scripts and real SQL. All 28 scoped SQL bodies/privileges and 107 files across 15 Edge bundles match reviewed source. The corrected dashboard is deployed at version 24; all 33 checked content/model/learner-history tables and 22 older builds are unchanged. Production served exact implementation main SHA `bb5756f877968b948e56fa81fad0ce3fa9f5e161`; persistent Production / Blocking was independently verified. Auth credentials, PostgREST and Deno test boundaries are explicit. Existing authenticated two-school analytics passed 10/10; an unchanged action retry passed 143/143 with 54/54 read isolation before and after. The initial home-navigation/HTTP 520 sign-out failure and complete class/membership cleanup are preserved in the evidence; no test guard was relaxed. [Acceptance matrix](sprint-15b12e-acceptance.md) · [Release evidence](evidence/sprint-15b12e-release-20261006.json). **Remaining:** authenticated governed multi-context learner switching after a second authorized release. No production content or criteria are activated; the overall 15B.12/Sprint 14 live gate stays open.


[Implementation plan, boundaries and verification](sprint-15b12-learning-context.md).

### 15B.13 — Selected Option B and Chapter II content expansion

**Option B selected on 2026-10-06; first S02 expansion human review complete and learner-inactive.** John selected the all-eight-skills option from the [decision packet](chapter-ii-assessment-decision-packet.md). Diagnostic and mastery each deliver 16 questions, two per skill. Mastery requires at least 13/16 plus one correct answer in each skill; all eight skills participate in initial readiness. The selected 192-question target is 96 practice/review, 32 diagnostic (two forms) and 64 protected mastery. Numeric readiness/model parameters and ordinary governed bindings remain separate.

The first bounded expansion adds four now-approved, learner-inactive S02 practice questions, I05–I08, with four distinct evidence purposes, twelve mappings to existing active misconceptions and one new template guide, now published at runtime version 2. Three questions use source-textbook figures 22–24 with crop provenance and Armenian alternative text. The shared Content Reviewer preview renders image/text stimuli using the same subject-neutral renderer as the learner player. Existing 32 approved questions and all published guides remain unchanged.

[Selected decision and batch](chapter-ii-option-b-and-s02-expansion.md) · [Media provenance](evidence/chapter-ii-s02-textbook-media-20261006.json). [PR #140](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/140) and independent main CI passed all five jobs (1,222 Node tests and 35 native Chromium tests). Actual production rollback preserved all 100 public-table hashes; post-deployment checks preserve every existing row across 14 append-only table changes, with 86 whole tables unchanged. All four saved current versions have passing technical QA without warnings. Production serves the reviewed frontend and all three asset hashes. [Deployment evidence](evidence/sprint-15b13-option-b-20261006.json). Read-only production verification at 15:18:59 UTC on 2026-10-06 confirms I05–I08 version 1 are published/approved, each with a recorded content-review approval and passing matching-version QA. Chapter II now has **36 approved questions; 156 remain un-authored** toward 192. The template guide **Ինչպե՞ս կապել դիտումը մասնիկային մոդելի հետ** was published at 15:34:55 UTC on 2026-10-06. Fresh production readback at 15:36:13 UTC confirms published authoring version 4 points to runtime version 2, with recorded review/publication history. This completes human review of the four-question/one-guide batch. [Guide publication checkpoint](evidence/sprint-15b13-guide-publication-20261006.json). [Approval checkpoint](evidence/sprint-15b13-question-approvals-20261006.json). External SME, assessment/model binding, whole-chapter content, pilot and release gates remain open. Chapter II stays draft with no pool membership, blueprint or learner activation. The remaining 15B.12E authenticated governed switching gate still requires a second authorized release.

**Second S02 batch — 15B.13B:** I09–I12 and one separate guide are deployed as learner-inactive drafts, completing the twelve-question authored practice/review target for S02 pending their review. Chapter II now has **40 authored questions: 36 approved and four drafts; 152 remain to author**. The four evidence purposes cover visibility versus structure, heating/compression comparison, an invalid incompressibility inference and closed/open system comparison. Two questions reuse textbook figures 22/23. [PR #145](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/145), PR CI #1243 and independent main CI #1244 passed all five jobs (1,224 Node and 35 Chromium tests); the production migration exactly matches reviewed SQL. The complete rollback preserved all 100 table checksums, and final readback preserves every prior row across 14 appended tables plus 86 unchanged complete tables. Fresh deployed-evaluator QA and guide validation pass all four drafts without errors or warnings; advisor findings are unchanged. Human question/guide review remains pending. No prior approvals, guide edits, shared runtime or release/model gates change. [Review links and verification](chapter-ii-s02-practice-completion.md) · [Deployment evidence](evidence/sprint-15b13-s02-completion-20261006.json).

**Whole-bank correction — 15B.13C:** Subsequent readback confirms all twelve S02 current questions approved, including John's I09 v2 edit; the second guide remains draft. I10 v1 combines already-used heating/compression solution paths and is not sufficient new coverage. Its deployed v2 uses the textbook mixing experiment to distinguish qualitative explanation from an unsupported exact numerical claim. I11 is recorded as intentional misconception practice. The migration preserves historical versions/reviews and all other items/guides, adds one draft misconception, requires I10 review again and refreshes the four-item family QA. The full comparison and source check cover all twelve current items and twenty saved versions, with related-skill/protected-bank collision checks. The new universal rule prevents count-driven padding; twelve items do not mean twelve independent reasoning paths. No learner release or assessment criteria change. [Audit, source and review handoff](chapter-ii-s02-whole-bank-review.md). [PR #147](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/147), PR CI #1247 and independent main CI #1248 passed all five jobs (1,226 Node / 35 Chromium). The production migration exactly matches reviewed SQL; rollback preserved all 100 table hashes. Final readback preserves all history/guides and every row outside ten authorized edits, with only the expected additions in eight tables and 92 whole tables unchanged. Four current family QA results and guide validation pass without errors/warnings; advisors are unchanged and implementation production delivery is verified. Current Chapter II inventory is 39 approved + I10 v2 awaiting review; the new misconception and T03 guide remain draft. [Deployment evidence](evidence/sprint-15b13-s02-diversity-20261006.json).

**S02 review closure — 2026-10-06:** Production readback at 18:21:23 UTC confirms John's current **I10 v4** is published/approved, with matching-version passing QA and a recorded approval at 18:00:51 UTC. The new misconception is active, with a draft-to-active review event at 18:20:11 UTC. The edited **Ինչպե՞ս ստուգել մասնիկային բացատրությունը** guide is published at **runtime v2**; authoring v4 records publication at 18:19:32 UTC and the immutable runtime snapshot matches current content. I10's final wording change is editorial; its options, answer, stimulus and solution demand are unchanged, and the other eleven S02 content projections match the whole-bank comparison. The diversity/source rationale remains valid.

All twelve S02 questions and all **40 authored Chapter II questions** are now approved. Four fresh technical-QA records pass for the current I09 v2 / I10 v4 / I11 v1 / I12 v1 family state; the edited guide validates against all four variants without errors or warnings. These automated records do not create human approvals. Current content/guide hashes are unchanged by the QA refresh. **This completes the S02 practice/review expansion's human-review checkpoint.** The next content slice is S03 practice/review expansion, beginning with the textbook and whole-bank comparison. The 192-question plan remains a quality-constrained target (152 un-authored); no new questions, protected pools, model bindings or learner release were created. Chapter II remains draft, and SME, readiness/model, protected-bank, illustration/content, pilot and release gates remain open. [Review readback evidence](evidence/sprint-15b13-s02-review-complete-20261006.json).

**S03 practice/review expansion — 15B.13D (deployed drafts; human review pending):** Textbook §8 and the complete applicable bank/history comparison selected I05–I08: one explicit visual practice variant and three added reasoning demands. Figures 25–27 accompany three questions; one separate draft guide and five accurately scoped draft misconception definitions require human review. The four-question slice takes S03 to eight authored items; four target slots remain unfilled under the platform-wide no-padding rule. Chapter II has 44 authored items (40 approved, four drafts), with 148 still un-authored toward the quality-constrained 192-item plan. No existing content/approvals or release/model/assessment contracts are changed. Implementation PR #150 and independent main CI #1254 passed all five jobs (1,228 Node / 35 Chromium). The reviewed migration is deployed verbatim; four current-family technical-QA records and guide validation pass. All old rows are preserved across 15 appended tables and 85 unchanged tables; the three source images are delivered with matching hashes. Questions, definitions and guide remain draft for owner review. [Whole-bank comparison and review handoff](chapter-ii-s03-whole-bank-review.md) · [Verification evidence](evidence/sprint-15b13-s03-expansion-20261006.json).

### 15B.14 — Chapter II assessment qualification

**15B.14A preparation complete — 2026-10-13.** The editorial approvals are verified. The current version manifest, independent Physics reviewer packet and conservative historical exposure hold are prepared. This is read-only preparation; no protected allocation, SME flag, policy/model binding, pilot or release is approved. [Scope and evidence](chapter-ii-assessment-qualification.md).

**15B.14B / 15B.14C — implementation merged; database deployment blocked.** John directed “You can release Chapter II; we will do the specialist review later.” PR #206 merged the exact disjoint form allocation, governed configuration, runtime safeguards and chapter navigation. All five final CI jobs passed; the frontend is deployed. Two Supabase connector failures prevented the first migration from applying, as confirmed by readback. Database migrations, production rollback rehearsal, committed allocation/bindings, activation and authenticated chapter switching remain pending. Chapter I stays on its original active release; Chapter II remains draft and inactive. Independent SME and final production exposure qualification remain open, and the existing six pilot gates remain required. [Scope and evidence](chapter-ii-pilot-release.md) · [Deployment blocker](evidence/chapter-ii-pilot-deployment-blocker-20261013.json).

### 15F.5 — Chapter VI review and image corrections

**2026-10-20 11:29 Asia/Yerevan checkpoint:** 242 questions — **241 approved and only `PHY7-U06-S06-I01` v3 awaiting review**; **146 published guides**; **33 active and 125 draft misconception definitions**. These counts record the observed review checkpoint.

The owner supplied figure 92 alone for `PHY7-U06-S06-I01`. Version 3 uses `p131-communicating-vessels-v3.png` and an accessible description of the three connected-vessel pairs. The prompt, four choices, answer `C`, explanation, hints, mappings and v1/v2 history are preserved. The image is live and matches the supplied 1,619,301-byte PNG (1028 × 1024); the guarded save and current-version QA passed with zero errors or warnings.

The October 19 delivery replaced nine images and clarified S13-I05 while preserving answer C and supporting content. All nine original v2 technical checks passed. Eight of those corrections subsequently received ordinary approval; S06-I01 now uses the owner's October 20 figure-92-only replacement at v3. Original assets and snapshots remain available.

Release `physics7_u06_2026_08_14_draft_r6` remains draft and never activated, with zero U06 pool, form, session or exposure rows. Exact-version review of S06-I01 v3 and the remaining definitions is still open. Assessment contract, qualification, allocation and learner release remain separate.

[S06 v3 evidence](evidence/chapter-vi-s06-image-v3-20261020.json) · [Correction record](chapter-vi-image-corrections.md).

### 15F.4 — Chapter VI Batch 3 staging

**Draft staging complete; ordinary exact-version review pending for Batches 1–3.** Batch 3 contains **82 draft questions: 48 Practice, 14 Diagnostic and 20 Mastery** across S09/S10/S11/S12/S13, plus **48 draft guides and 58 draft misconception definitions**. S13 remains Practice-only, non-gating and unable to establish performed laboratory work.

The comparison froze the complete post-Batch-2 bank: 1,169 current questions, 1,054 immutable item versions, 2,711 current/historical/authoring guide records and 975 definitions—5,909 searchable profiles in total—then assessed all 3,321 within-batch pairs. It caused two substantive rewrites before staging; the final set has zero substantive overlaps and zero untaught-science holds. [Comparison](chapter-vi-batch-03-comparison.md).

Rollback rehearsal matched every authored item, option, key, mapping, definition, snapshot and guide. The guarded content commit preserved every pre-existing row; exact deployed-source replay passed **82/82 questions** and **48/48 guides** with zero errors or warnings in rollback and production catalogues. The separate QA transaction added 82 actor-null records and changed no other staged table fingerprint.

Chapter VI now contains **242 drafts: 146 Practice, 38 Diagnostic and 58 Mastery**, with 146 guides and 158 definitions. Every item remains `draft`, `needs_review`, `provisional_no_sme_review`, non-visible and non-allocatable. Production has zero U06 pools, form links, reviews, learning-session items or exposures; release `physics7_u06_2026_08_14_draft_r6` remains draft and never activated. No assessment contract, scoring rule, allocation, activation or learner release is authorized. [Staging](chapter-vi-batch-03-staging.md) · [Evidence](evidence/chapter-vi-batch-03-staging-20261019.json).

### 15F.3 — Chapter VI Batch 2 staging

**Historical checkpoint; superseded by 15F.4.** Batch 2 contains **90 draft questions: 54 Practice, 14 Diagnostic and 22 Mastery** across S05/S06/S07/S08/S15/S16, plus **54 draft guides and 56 draft misconception definitions**. S15 and S16 remain Practice-only and non-gating.

The comparison froze the complete post-Batch-1 corpus: 1,079 current questions, 964 immutable item versions, 416 current guides and their complete recorded histories, 919 definitions, 1,290 review records and 44 exposure-linked versions. It assessed 5,511 searchable profiles and all 4,005 within-batch pairs. Close or ambiguous drafts were reworked before staging; the final set has zero substantive overlaps and zero untaught-science holds. Five exact textbook crops support Practice only. [Comparison](chapter-vi-batch-02-comparison.md).

Rollback restored all 63 governed table fingerprints. The guarded content commit produced only the planned deltas, and the QA transaction added 90 actor-null technical records. Exact deployed-source replay passed **90/90 questions** and **54/54 guides** with zero errors or warnings in both rollback and production catalogues. All ten Batch 1 catalogue projections exactly match their committed baseline.

At this checkpoint, Chapter VI contained **160 drafts: 98 Practice, 24 Diagnostic and 38 Mastery**, with 98 guides and 100 definitions. Every item remains `draft`, `needs_review`, `provisional_no_sme_review`, non-visible and non-allocatable. Production has zero U06 pools and zero Batch 2 form links, reviews, learning-session items or exposures; the release remains draft and never activated. Batch 3 retained 82 planned slots. No assessment contract, scoring rule, allocation, activation or learner release is authorized. [Staging](chapter-vi-batch-02-staging.md) · [Evidence](evidence/chapter-vi-batch-02-staging-20261019.json).

### 15F.2 — Chapter VI inactive foundation and Batch 1 staging

**Foundation and draft staging complete; ordinary exact-version review pending.** The owner accepted the 16-skill, 242-slot plan and its 70/90/82 split. The governed foundation now contains one review-status unit, six topics, 15 exact programme outcomes, 16 review-status skills, 24 skill–outcome mappings and never-activated draft release `physics7_u06_2026_08_14_draft_r6`. Rollback rehearsal and guarded commit passed across 63 public tables. [Foundation evidence](evidence/chapter-vi-foundation-20261019.json).

Batch 1 contains **70 draft questions: 44 Practice, 10 Diagnostic and 16 Mastery** across S01/S02/S03/S04/S14, plus **44 draft guides and 44 draft misconception definitions**. The frozen comparison covered 5,195 current/historical profiles and 2,415 within-batch pairs. Four close drafts were substantively reworked; the final set has zero substantive overlaps and zero untaught-science holds. Exact deployed-source QA passed **70/70 questions** and **44/44 guides** with zero errors or warnings. [Comparison](chapter-vi-batch-01-comparison.md) · [Staging](chapter-vi-batch-01-staging.md).

Every item remains `draft`, `needs_review`, `provisional_no_sme_review`, non-visible and non-allocatable. Final readback shows zero U06 pools, form links, policy/model bindings, ordinary reviews, learning-session items or exposures. This historical checkpoint is superseded by Batch 2 staging under 15F.3; ordinary review remains the next content gate. No assessment contract, scoring rule, allocation, activation or learner release is authorized.

### 15F.1 — Chapter VI map and proposed three-batch plan

**Historical preparation checkpoint; accepted under 15F.2.** The approved *Ֆիզիկա 7* source (§§40–55, printed pp.118–163) and current programme Theme 6 were reconciled into 11 mandatory and four additional outcomes, 16 skills and 33 authoring briefs. The accepted ceiling is **242 candidates: 146 Practice, 38 Diagnostic and 58 Mastery**, split across three large batches of **70/90/82**. Larger batches reduce review and CI overhead without weakening Armenian, physics, hint, image, key or whole-bank comparison checks. [Full plan](chapter-vi-preparation.md).

S13 supports experimental planning/data interpretation through Practice only; S14–S16 cover additional outcomes through Practice only. Five practical records are separate from question evidence. By owner decision, no separate learner or teacher-observed gas-buoyancy procedure is in the Chapter VI MVP. The §50 demonstration supports knowledge-only questions, and the selected-response pilot will not claim performed-work completion for the gas portion of M9. This is a scope boundary, not an unresolved release gap.

At this historical checkpoint, the read-only catalogue contained no U06 unit, skill, item or release-unit row. Sprint 15F.2 subsequently created the inactive governed foundation, froze the complete related corpus, assessed Batch 1 and staged the defensible final set. It created no approval, allocation, activation, API or learner-runtime behavior. [Decision evidence](evidence/chapter-vi-gas-buoyancy-scope-decision-20261019.json).

### 15E.6 — Chapter V provisional pilot activation

**Sprint 15E.6 complete for the knowledge-only provisional pilot:** Chapter V is active with **152 approved questions, 88 published guides and 108 active definitions**. D12/P8/M12/R12; Mastery **10/12 plus one correct in each of eight required skills**, three attempts. Five disjoint forms contain 60 approved versions; four retained Mastery questions remain unallocated. Rollback/458-row readback and 61 preservation scopes pass. Authenticated production acceptance passed **191/191**, plus two-school isolation **54/54**, with desktop/mobile switching across Chapters I–V and all 59 tracked tables unchanged through QA. Specialist/exposure review and performed laboratory assessment remain deferred. Chapter VI has advanced separately to inactive Batch 1 staging under 15F.2. [Release](chapter-v-pilot-release.md).

15E.5 ordinary-review closure and contract validation remain preserved as historical preparation evidence. John adopted the exact contract and knowledge-only pilot on 2026-10-19. 15E.6 activation and authenticated acceptance are verified (191/191; isolation 54/54). All 59 tables remain unchanged through QA. The evidence record and Notion synchronization are complete for closure source `f37f7d9436c7538f7e20280a21cb09305aa044b5`: roadmap 4.10, the exact source stamp and all 11 native child pages were verified. [Recovery verification](evidence/chapter-v-interruption-recovery-20261019.json) records that checkpoint; later documentation changes receive their own source-stamp refresh and readback. Chapter VI has advanced separately to inactive Batch 1 staging under 15F.2. Specialist/exposure review and the performed-laboratory workflow remain separate gates.

### 15E.4 / 15E.3 — Historical completion of Batches 2 and 3

Batch 2 staged 49 questions/28 guides/29 definitions with five held proposals. Batch 3 added 44 planned slots and all five substantive reworks: 49 questions/28 guides/25 definitions. This completed 152 question drafts, 88 guides and 108 definitions. The draft/review-pending checkpoint is superseded by 15E.5 above. [Batch 2](chapter-v-batch-02-comparison.md) · [Batch 3](chapter-v-batch-03-comparison.md).

### 15E.2R — Chapter V held-proposal rework

> Historical staging checkpoint; all subsequent ordinary approvals are verified under 15E.5 above.

**Sprint 15E.2R — Chapter V Batch 1 rework staged; ordinary review pending:** John requested keeping the themes of the 17 held proposals while changing their tasks. All **17 revised assessment candidates (7 Diagnostic / 10 Mastery)** and **19 new misconception definitions** are now draft-staged. Batch 1 totals **54 questions (32 Practice / 8 Diagnostic / 14 Mastery), 32 guides and 54 definitions**, all awaiting ordinary review. The revisions are bounded protected parallel candidates, not 17 independent new reasoning paths or qualified form slots. All 17 passed exact-source technical QA; previous content and learner records are preserved. The 152-slot chapter ceiling is unchanged, with 98 proposed slots in Batches 2/3 still to author. Chapter V remains inactive. [Rework evidence](chapter-v-batch-01-rework-17.md).

The exact 17-slot manifest is fulfilled at the draft-authoring level. One first-rework cancellation-error draft was replaced again after a strong Chapter III match. All existing v1 items, approvals, guides and learner records remain intact. No new public worked guides expose these assessment stimuli. Next: ordinary review and the remaining lever/pulley Batch 2 preparation under unchanged source/protection criteria. The final contract, practical tasks, qualification and release remain separate.

### 15E.2 — Chapter V foundation and Batch 1

> Historical 2026-10-18 checkpoint; the held-proposal shortfall below was subsequently addressed by 15E.2R above.

**Sprint 15E.2 — Chapter V foundation and Batch 1 staged; ordinary review pending:** John accepted the plan on 2026-10-18. The inactive foundation has 10 skills and six programme outcomes. All 54 first-batch proposals were assessed; **37 questions (32 Practice / 1 Diagnostic / 4 Mastery), 32 guides and 35 misconception definitions** are saved as drafts. **17 assessment proposals are held for overlap/rework**, preserving the shortfall against the 54-slot ceiling. Technical QA passed 37/37 and guide validation 32/32; no ordinary approval, allocation or learner release is claimed. The 152-slot chapter budget remains provisional. [Batch 1 evidence](chapter-v-batch-01-comparison.md).

The 54-slot first-batch ceiling is not numerically fulfilled: 7 Diagnostic and 10 Mastery proposals remain held. All 32 Practice slots are staged, including the two optional horsepower questions. No held question was archived or deleted from an existing bank; these are unstaged proposals. Next: ordinary review, an explicit bank-plan decision on the shortfall, and preparation of Batch 2 under unchanged source/protection criteria. No chapter-specific assessment contract or release is authorized. The source-verified Notion sync is a post-merge closure step.

### 15E.1 — Chapter V map and proposed three-batch plan

> Historical preparation checkpoint, superseded for current execution status by 15E.2 above.

**2026-10-18 · mapping complete; execution plan proposed.** Verified the unchanged approved textbook and freshly downloaded official programme. Theme 5 has four mandatory and two additional outcomes; §§32–39 cover printed pp.99–117. Ten skills, 152 provisional slots (88 Practice / 24 Diagnostic / 40 Mastery), 20 candidate briefs, two performance rubrics and five exact source crops are documented. The three proposed batches contain 54, 54 and 44 slots. Optional S09/S10 are Practice only. No session/form/scoring contract is approved, and all assessment capacity remains unqualified.

Read-only catalogue confirms no Chapter V unit, skill or release. No database, learner runtime, schema, content or approval changes. Laboratory execution, ordinary review, specialist/exposure qualification and any Chapter-V-specific release decision remain separate. Previous chapter-specific pilot/parallel exceptions do not carry over.

**Preparation handoff subsequently executed under 15E.2 and 15E.2R:** the accepted plan, inactive foundation and initial Batch 1 staging are recorded above. Seventeen initially held proposals were later reworked at the owner’s request and staged as bounded parallel candidates; ordinary review and qualification remain open. [Map](chapter-v-preparation.md) · [Manifest](evidence/chapter-v-preparation-20261018.json) · [QA](evidence/chapter-v-preparation-qa-20261018.json). Source-verified Notion synchronization follows merge and is recorded separately.

### 15D.4R2 — Chapter IV ordinary review closure

**2026-10-18 09:34 UTC / 13:34 Asia/Yerevan · review complete; chapter remains inactive.** After John reported all batches approved, read-only verification confirmed 236 published/approved v1 questions with matching current approvals and passing QA, 138 published guides and 150 active definitions. No ordinary review queue remains. All staged question text/options/keys/mappings, hints/examples and definition wording are unchanged; existing immutable histories remain preserved. Guide publication uses authoring v3/runtime v2. The earlier partial Batch 1 checkpoint below remains historical. [Closure and evidence](chapter-iv-review-closure.md).

### 15D.5 — Chapter IV assessment proposal and conditional forms prepared

**2026-10-18 · proposal complete; owner decisions pending.** Recommend Diagnostic 19 (two disjoint forms, one completed attempt), Mastery 15 (three disjoint forms, at most three attempts), 12/15 plus at least one correct in each of ten required skills, Practice 8 and Chapter Review 12. Supporting S03/S09/S12 and additional S14 remain in Diagnostic and Practice; Mastery uses required knowledge/interpretation only.

Five offline revisions strengthen M5 unit/example evidence and replace A1-only resultant-motion cases with direct M11 evidence. No current question or approval changed. The exact conditional plan contains 78 current approved versions and five proposed v2 slots; fifteen other approved Mastery items remain held, not deleted or automatic reserves. Current whole-bank comparison/QA and fresh approval must precede staging/allocation of the new versions.

Four current JS policy validations, four read-only SQL scope validations and five SQL scoring cases pass. These are configuration/scoring checks, not full release rehearsal or authenticated acceptance. A single missed question in one of the five singly represented required skills fails the proposed Mastery minimum even at 14/15; the proposal records this pilot trade-off and alternatives.

Recommend a separately authorized knowledge-only pilot for the MVP. Actual M3 density measurement and M8 Hooke experiment performance remain unassessed until a governed teacher evidence workflow exists; no result may certify them. Prior Chapter II/III specialist or release exceptions are not inherited. Once the owner decides the contract, bounded revisions and pilot scope, complete comparison/new-version review, exact-version qualification/protection/exposure disposition, configuration/rollback, activation and production chapter switching. [Proposal](chapter-iv-assessment-contract-proposal.md) · [Metadata](evidence/chapter-iv-assessment-contract-proposal-20261018.json).

### 15D.4R — Historical Batch 1 question approval and guide-review checkpoint

**2026-10-17 21:46 UTC / 2026-10-18 Asia/Yerevan · partial ordinary approval; no chapter release.** The owner requested “Let’s try to approve Batch 1”. Authenticated UI operations saved 64 distinct v1 content approvals and 49 guide-review transitions. Batch 1 now has 84 approved questions, one published guide, 49 reviewed/unpublished guides and 65 draft definitions. All 84 current QA records pass without errors or warnings. No new question/content revision or duplicate approval was created.

The guide-publication step requested authenticator MFA. Automatic approval review rejected secure credential submission because guide publication was judged outside the explicit request. No credential, SQL or alternate-path bypass was attempted; definition approvals also require MFA and remain pending. Complete explicit authorization and secure verification for the remaining 49 guide publications and 65 definitions. This is a current action-time block, not a revocation of the earlier ordinary-review delegation.

All 56 unaffected tracked tables match exactly. Baseline hashes also match for the other three tables after excluding the 64 new reviews and 49 authoring events and restoring only the 64 approved items’ lifecycle metadata for comparison. Existing content, history, Batches 2/3, allocations and inactive release are preserved. [Checkpoint](chapter-iv-batch-01-approval.md) · [Evidence](evidence/chapter-iv-batch-01-approval-20261018.json).

### 15D.4 — Chapter IV batch 3 and completed authoring manifest

**2026-10-17 20:49 UTC / 2026-10-18 Asia/Yerevan · staging and technical verification complete.** Added 66 questions (38 Practice / 12 Diagnostic / 16 Mastery), 38 guides and 39 definitions across S11–S14. Whole-bank comparison includes 791 current questions, 671 immutable versions and all current/historical guides, with 28 matching table fingerprints and 2,145 within-batch dependency records. Exact saved readback passes 66 question and 38 guide checks using verified deployed-v11 evaluator replay. Every pre-existing row across 59 tracked tables is unchanged.

All 236 accepted question slots are authored (138 Practice / 38 Diagnostic / 60 Mastery). Twenty are approved and 216 remain draft; guides total 138 (one published), definitions 150 (all draft). The owner explicitly directed creating batch 3 first and returning to approve each batch afterward. No approvals were written or browser recovery attempted in this delivery. Existing exact-version approval, final assessment/practical contracts, independent SME/exposure qualification, allocation and learner-release requirements remain open. [Staging](chapter-iv-batch-03-staging.md) · [Comparison](chapter-iv-batch-03-comparison.md).

The following dated entries preserve earlier counts and browser observations; the current continuation is above and in the authoritative status register.

### 15D.3 — Chapter IV batch 2

**2026-10-17 10:54 UTC · staging and technical verification complete.** Added 86 questions (50 Practice / 14 Diagnostic / 22 Mastery), 50 guides and 46 definitions across S06–S10. Full comparison uses 705 current questions and 585 immutable versions, with 28 matching table fingerprints; 3,655 within-batch dependencies are retained. Exact production readback and deployed-v11 evaluator replay pass for 86 questions and 50 guides. All old rows in 59 tracked tables, including prior approvals, are unchanged. Two textbook figures are attached to practice content.

Chapter total: 170 questions, 100 guides and 111 definitions; 20 questions approved and one guide published at the pre-batch baseline. This delivery saved no approvals. The user's “it should work now” prompted another permitted browser check; credential protection still blocked observation after origin recovery, so browser automation stopped. Remaining 66-question batch is already authorized. Final contract, M3/M8 practical evidence, independent SME/exposure qualification and release remain open. [Staging](chapter-iv-batch-02-staging.md) · [Comparison](chapter-iv-batch-02-comparison.md).

The following 15D.2R/15D.2/15D.1 entries preserve their dated observations; current counts and continuation are above and in the status register.

### 15D.2R — Delegated approval checkpoint

**2026-10-17 10:05 UTC · partial approval, no learner release.** Secure sign-in succeeded. The normal authenticated reviewer recorded **19 distinct v1 approvals**; 65 questions, 50 guides and 65 definitions still await their authorized approval. There are 22 approval audit rows because three unchanged versions received repeated approval actions; those audit rows are preserved and are not counted as extra approved questions. All content remains byte/field-equivalent to the checked batch and all pre-existing rows in 59 tracked tables are preserved. Subsequent browser credential protection prevented further interaction after the documented recovery attempt. No content re-approval decision is requested; restore usable reviewer access, then continue the already authorized batches. [Checkpoint](evidence/chapter-iv-batch-01-approval-checkpoint-20261017.json).

The 15D.2 staging snapshot below records the earlier signed-out state and is superseded by this checkpoint for approval counts and browser access.

### 15D.2 — Chapter IV three-batch delivery and delegated approvals

**2026-10-17 · foundation and batch 1 staging/QA complete; authenticated approval pending sign-in.** Owner direction accepts the 236-slot plan, replaces the earlier 28-brief feasibility handoff with three batches, and delegates ordinary content decisions after checks. Batch 1: 84 questions (50/12/22) across S01–S05; batch 2: 86 (50/14/22) across S06–S10; batch 3: 66 (38/12/16) across S11–S14. Questions, hints and definitions no longer require a separate owner review round. Actual approvals must still use the authenticated current-version workflow with delegation provenance.

The first 84 questions, 50 guides and 65 definitions are saved as drafts. All question/guide checks pass; all old rows in 59 tracked tables are preserved. No assessment allocation, chapter contract or learner release is implied. M3/M8 performance evidence and independent SME/exposure review remain separate. [Delivery](chapter-iv-batch-01-staging.md) · [Comparison](chapter-iv-batch-01-comparison.md) · [Authorization](evidence/chapter-iv-three-batch-authorization-20261017.json).

### 15D.1 — Historical Chapter IV source preparation and assessment planning

> Preparation-time checkpoint; owner acceptance, authoring and pilot closure subsequently completed under 15D.2–15D.6. Chapter V now has its separate 15E.1 map.

**2026-10-17 · preparation complete; owner plan review pending.** Verified the current programme appendix and supplied textbook §§19–31, printed pp.60–98. Theme 4 has 11 mandatory and two additional outcomes. Prepared 14 proposed skills (10 mandatory, three supporting, one additional), a 236-question planning budget (138/38/60), 28 unassessed candidate briefs for one large feasibility batch, three practical-task drafts and five source crops with exact provenance. Four rendered-page textbook issues have recorded corrections/exclusions.

Mandatory M3 and M8 require performed experiments; question responses can assess preparation/interpretation only. No student session length, pass rule, form count or practical-evidence workflow is approved. Live catalogue read confirms no Chapter IV unit/skill/release; this sprint stages no questions or database foundation and extends no Chapter II/III pilot exception. Next **15D.2**: owner plan review, governed inactive foundation, fresh whole-bank/related-bank comparison and assessment of the complete 28-brief queue. Chapters I–III remain under their existing pilot/qualification boundaries; V–VI remain unmodeled.

[Preparation and source crosswalk](chapter-iv-preparation.md) · [Candidate queue](chapter-iv-candidate-briefs.md) · [Manifest](evidence/chapter-iv-preparation-20261017.json) · [Preparation QA](evidence/chapter-iv-preparation-qa-20261017.json).

### 15C.26 — Chapter III provisional activation and production acceptance

Owner-authorized activation and authenticated production acceptance are complete for the bounded provisional pilot; independent specialist/exposure and production-promotion gates remain open. Earlier preparation under 15C.25 is preserved in the [dated preparation report](chapter-iii-release-preparation.md).

**Sprint 15C.26 technical scope complete: Chapter III is active as the owner-authorized provisional pilot.** All 168 approved questions, 80 published guides and 344 active definitions are unchanged. Exact activation/readback verified 510 configuration rows, four v2 policy contracts and five forms; rollback and commit passed all 61 preservation scopes. Authenticated production acceptance passed **123/123**, including Home → Chapter I at 1365 px and Chapter I → II → III → I at 390 px, with two-school isolation **54/54**. All 59 tracked public table fingerprints remained unchanged after activation through acceptance. Chapters I/II and learner history are preserved. Independent specialist review, final exposure disposition and production promotion remain open. [Release and evidence](chapter-iii-pilot-release.md).

### 15C.24R — Revised content ordinary review complete

**Sprint 15C.24R ordinary review verified complete:** **168 approved current questions, 80 published guides and 344 active definitions; zero ordinary review pending.** S03-D05 v2, S03-M10 v2 and all five new S03 definitions were approved without wording changes. Passing technical QA, source and whole-bank comparisons remain valid for the unchanged content. Five offline conditional forms retain their memberships and direct M1–M5 author coverage; the two new approvals are bound to their exact saved versions. [Review closure and next gate](chapter-iii-revision-review-20261017.md). Independent SME/exposure qualification remains pending; zero qualified allocations and no Chapter III release. All assessment criteria are unchanged.

### 15C.24 — Two versioned trajectory corrections

**Historical staging checkpoint:** both revised questions and all five definitions were approved without content edits under 15C.24R above. Counts and review requests below preserve the original staging handoff.

**Sprint 15C.24 targeted corrections saved and technically verified:** **S03-D05 v2 and S03-M10 v2** address the two trajectory-classification drafting gaps. Review these two questions and five new S03 misconception definitions on the existing reviewer pages. Chapter III remains **168 questions: 166 approved current versions + two awaiting review**, with **80 published guides, 339 active definitions and five definition drafts**. Five offline forms retain their memberships and now represent M1–M5 using the pending v2 drafts; this is author coverage, not qualification. [Revision, preservation and review evidence](chapter-iii-trajectory-revisions-20261017.md). Independent SME/exposure and release remain open; zero qualified allocations. All assessment criteria are unchanged.

### 15C.23 — Qualification preparation and two coverage gaps

**Historical preparation checkpoint:** the bounded correction decision and draft revisions are completed under 15C.24 above; ordinary review is complete under 15C.24R; independent review remains open.

**Sprint 15C.23 qualification preparation complete; assessment qualification remains blocked:** all **168 questions are approved**, **80 guides published** and **339 definitions active**. Five offline disjoint 16-question forms and eight reserves are version-bound and structurally checked. One Diagnostic and one Mastery form lack direct trajectory-classification evidence (mandatory M4); two targeted revisions within the existing bank are recommended for a bounded owner decision. [Preflight, conditional forms and correction scope](chapter-iii-assessment-qualification.md). Independent SME/exposure decisions remain pending; zero forms are qualified or allocated and Chapter III remains inactive. No content or learning criteria changed.

### 15C.22R — Ordinary review closure

**Sprint 15C.22R ordinary review closure verified:** all **168 Chapter III questions are approved**, all **80 guides are published**, and all **339 definitions are active**; the ordinary review queue is empty. John authorized Codex to approve the 101 pending definitions through the existing MFA-protected reviewer workflow. Question approvals already existed and were verified read-only on their current versions. [Delegated approval and preservation evidence](chapter-iii-definition-approval-20261017.md). All planned authoring is complete. Chapter III remains inactive/unallocated; independent SME/exposure qualification, qualified disjoint forms and release remain open.

### 15C.22 — Remaining Chapter III Mastery batch 19

**Historical staging checkpoint:** ordinary review subsequently closed under 15C.22R; pending counts below preserve the original handoff.

**Sprint 15C.22 is staged and technically verified:** all 24 remaining Chapter III Mastery drafts and 58 supporting draft definitions are saved. The planned bank is fully authored: **168 questions (120 approved, 48 awaiting review)** = 80 Practice + 32 Diagnostic + 56 Mastery; 80 published guides and 339 definitions (238 active, 101 draft). [Batch 19 evidence and combined review](chapter-iii-batch-19-staging.md). The v2 contract remains implemented. Chapter III is inactive with zero qualified allocations; human review, independent SME/exposure, form qualification and release remain open.

Owner authorized every remaining question in one larger delivery to reduce repeated CI. Twenty-four candidates across all eight skills were compared against the complete applicable current/history/protected bank, eighty exposed practice examples and all 276 new pairs. Natural Armenian and textbook physics were checked separately. Exact saved-content QA passes 24/24, and all 39 preservation scopes pass. No new guides, allocations or learner release. One documentation PR uses the existing required PR and main-push checks.

**Next:** combined ordinary review, exact-version SME/exposure qualification and disjoint assessment-form preparation. The numerical bank is complete; zero forms are qualified.

### 15C.20–15C.21 — Two bounded assessment batches 17–18

**Historical staging checkpoint; review remains pending.** Its sixteen questions and thirty definitions are included in the current Batches 16–19 queue under 15C.22 above.

**Sprints 15C.20–15C.21 are staged and technically verified:** eight new Chapter III Diagnostic drafts, eight Mastery drafts and 30 draft definitions. Batch 16 remains pending and can be reviewed with these two batches. Chapter III has **144 questions (120 approved, 24 awaiting review)**: 80 Practice, 32 Diagnostic and 32 Mastery candidates; 80 published guides and 281 definitions (238 active, 43 draft). [Batches 17–18 evidence and review](chapter-iii-batches-17-18-staging.md). The approved v2 contract remains implemented and production-verified. Chapter III is inactive with zero qualified allocations; human review, SME/exposure, form qualification and release gates remain open.

All 128 prior questions, their review state and published guides are unchanged. The two batches were compared against current/history/guide/protected content and all 120 new pairs, including 64 cross-batch pairs. Exact saved-content QA passes 16/16 with no errors or warnings; rollback and all 39 preservation scopes pass. Numerical gaps: zero Diagnostic and 24 Mastery. No learner hints, guides, runtime changes, allocations or activation were added.

### 15C.18R–15C.19 — Review closure and bounded Diagnostic batch 16

**Historical Batch 16 checkpoint:** its eight questions and thirteen definitions still await review. Current combined counts and the remaining budget are recorded in 15C.20–15C.21 above.

**Sprint 15C.19 is staged and technically verified:** eight new Chapter III Diagnostic drafts, one per S01–S08, and 13 draft definitions. Batches 13–15 ordinary review is verified complete under [15C.18R](chapter-iii-batches-13-15-review.md). Chapter III has **128 questions (120 approved, 8 awaiting review)**: 80 Practice, 24 Diagnostic and 24 Mastery candidates; 80 published guides and 251 definitions (238 active, 13 draft). [Batch 16 evidence and review](chapter-iii-batch-16-staging.md). The approved v2 contract remains implemented and production-verified. Chapter III is inactive with zero qualified allocations; new-content review, SME/exposure, form qualification and release gates remain open.

The live review closure verified 24 question approvals and 32 definition approvals without content changes. Eight new Diagnostic candidates were then compared against the full applicable current/history/guide/protected bank and all 28 new pairs. Exact saved-content QA passes 8/8, rollback and all 39 preservation scopes pass. Remaining numerical budget: 8 Diagnostic + 32 Mastery. No hints, guides, runtime changes, allocations or release activation were added.

### 15C.18 — Bounded Mastery batch 15

**Historical staging checkpoint; ordinary review verified complete under 15C.18R.** The pending counts below preserve the original handoff; the current queue is recorded above.

**2026-10-16 · Staging and technical verification complete.** **Sprint 15C.18 is staged and technically verified:** eight new Chapter III Mastery drafts across S01/S03/S04/S06/S07 and 11 draft definitions. Chapter III has **120 questions (96 approved, 24 awaiting review)**: 80 Practice, 16 Diagnostic and 24 Mastery candidates; 80 published guides and 238 definitions (206 active, 32 draft). [Batch 15 evidence and review](chapter-iii-batch-15-staging.md). Batches 13–14 review remains pending and can be combined with this batch. The approved v2 contract is implemented and production-verified. Chapter III remains inactive with zero qualified allocations; human review, SME/exposure, form qualification and release gates remain open.

All 28 within-batch pairs and applicable current/history/guide/protected neighbors were compared. Exact saved-content QA passes 8/8; rollback and all 39 preservation scopes pass. No learner hints, guides or runtime changes were added. Remaining numerical budget: 16 Diagnostic + 32 Mastery. Review may be combined across Batches 13–15; no approval, qualified form or release is inferred.

### 15C.17 — Bounded Mastery batch 14

**Historical staging checkpoint; ordinary review verified complete under 15C.18R.** The pending counts below preserve the original handoff; the current queue is recorded above.

**2026-10-16 · Staging and technical verification complete.** **Sprint 15C.17 is staged and technically verified:** eight new Chapter III Mastery drafts (one M02 per S01–S08) and 12 draft definitions. Chapter III has **112 questions (96 approved, 16 awaiting review)**: 80 Practice, 16 Diagnostic and 16 Mastery candidates; 80 published guides and 227 definitions (206 active, 21 draft). [Batch 14 evidence and review](chapter-iii-batch-14-staging.md). Batch 13 review remains pending. The approved v2 contract is implemented and production-verified. Chapter III remains inactive with zero qualified allocations; human review, SME/exposure, form qualification and release gates remain open.

All 28 new pairs and current/history/guide/protected neighbors were compared. Exact saved-content QA passes 8/8; the rollback and 39 preservation scopes pass. No learner hints, guides or runtime changes were added. Remaining numerical budget: 16 Diagnostic + 40 Mastery. Review may be combined with Batch 13; no approval, qualified form or release is inferred.

### 15C.16 — Bounded Diagnostic batch 13

**Historical staging checkpoint; ordinary review verified complete under 15C.18R.** The pending counts below preserve the original handoff; the current queue is recorded above.

**2026-10-16 · Sprint 15C.16 staged and technically verified:** eight new Chapter III Diagnostic drafts and nine draft definitions. Chapter III has **104 questions (96 approved, 8 awaiting review)**: 80 Practice, 16 Diagnostic and 8 Mastery candidates; 80 published guides and 215 definitions (206 active, 9 draft). [Batch 13 evidence and review](chapter-iii-batch-13-staging.md). The approved v2 assessment contract is implemented and production-verified. Chapter III remains inactive with zero qualified allocations; human review, SME/exposure, form qualification and release gates remain open.

The eight slots are S01-D02, S03-D02/D03, S04-D02/D03, S06-D02 and S07-D02/D03. All 28 new pairs and current/history/guide/protected neighbors were compared. The new questions add candidate capacity only. No learner hints/guides or runtime changes were added. Remaining numerical gap: 16 Diagnostic + 48 Mastery. Next: site review, followed by a separately bounded batch; qualification and release stay gated.

### 15C.15 — Versioned scoring, readiness and reporting implementation

**Complete for the approved technical scope, 2026-10-15.** The opt-in v2 contract separates delivered, scored and readiness-required skills and persists separate result groups. SQL, all 14 affected Edge consumers, learner/player/history and staff analytics are deployed and verified. CI, PostgreSQL 17.6, 68 Chromium tests, authenticated Chapter I/II switching and staff/analytics acceptance pass. Existing v1 criteria, content and learner history remain preserved. [Implementation and durable release evidence](assessment-policy-v2.md).

The corrected repeat acceptance preserves an existing October 13 diagnostic instead of requiring an empty QA account. Chapter III remains inactive with zero qualified forms. Next: a separately bounded authoring manifest for the remaining assessment budget, then version/exposure/SME/form qualification and release gates. No additional questions or release are authorized by technical closure.

### 15C.13R–15C.14 — Review closure and assessment/readiness proposal

**Sprint 15C.16 is staged and technically verified:** eight new Chapter III Diagnostic drafts and nine draft definitions. Chapter III has **104 questions (96 approved, 8 awaiting review)**: 80 Practice, 16 Diagnostic and 8 Mastery candidates; 80 published guides and 215 definitions (206 active, 9 draft). [Batch 13 evidence and review](chapter-iii-batch-13-staging.md). The approved v2 assessment contract is implemented and production-verified. Chapter III remains inactive with zero qualified allocations; human review, SME/exposure, form qualification and release gates remain open.

The proposal retains sixteen-question delivery and the 168-question planning budget, shifts one supporting S05 slot to mandatory S04, and requires 8/10 mandatory answers plus one correct in each required skill. The explicit implementation and acceptance scope is recorded before requesting the owner decision. No new question batch, learner release or database mutation is included.

### 15C.12–15C.13 — Chapter III first assessment-candidate batches

**Historical staging checkpoint; review closed under 15C.13R above.** The pending counts and next steps below record the original handoff, not the current queue.

**Sprints 15C.12 and 15C.13 are staged and verified:** eight Diagnostic and eight Mastery candidates, one of each per S01–S08, plus 29 draft misconception definitions. John selected this bounded candidate scope while the assessment rules remain open. Full textbook, current/history/guide/protected-bank and 120-pair comparisons are recorded. All 16 exact saved questions pass technical QA; both rollback rehearsals and 39 preservation scopes per batch pass.

Chapter III now has **96 questions: 80 Practice + 8 Diagnostic candidates + 8 Mastery candidates (41 approved, 55 draft)**, **80 guides (40 published, 40 draft)** and **206 definitions (87 active, 119 draft)**. **Combined site-review queue, Batches 06–12: 55 questions, 40 guides and 119 definitions.** Existing wording, approvals and learner history are unchanged. No learner hints or guides were added for these assessment candidates.

All 16 additions are provisional protected parallel candidates: **zero new independent reasoning claims and zero qualified allocation capacity**. The remaining planning gaps are 24 Diagnostic and 48 Mastery questions; this bounded instruction does not authorize all remaining slots. **Next:** review the combined queue and settle the Chapter III counts/weights, supporting/additional-skill readiness treatment and pass rules before allocation. Independent SME/exposure review, version-bound disjoint forms and release checks remain required. Chapter III stays inactive/unallocated; the Chapter II specialist-review deferral is not extended. [Batches 11–12 staging](chapter-iii-batches-11-12-staging.md).

### 15C.10–15C.11 — Chapter III practice inventory complete (historical checkpoint)

**Historical handoff, superseded by 15C.13R–15C.14 above:** the review queue is closed and the concrete assessment/readiness proposal awaits a separate decision.

**Sprints 15C.10 and 15C.11 are staged and verified:** two batches of eight practice questions, sixteen guides and forty definitions. All 32 hints and 16 worked examples received separate natural-Armenian, physics and pedagogical checks. Question QA and saved-guide validation pass 16/16; both rollback rehearsals, independent exact readbacks and all 39 preservation scopes per batch pass.

Chapter III now has **80 practice questions (41 approved + 39 draft), 80 guides (40 published + 40 draft), and 177 definitions (87 active + 90 draft)**. One new authenticated approval of S01-I06 v1 was verified before staging; other earlier pending reviews remain open. **Combined review queue, Batches 06–10: 39 questions, 40 guides and 90 definitions.**

**The planned 80/80 practice slots are drafted.** All sixteen additions are intentional practice variants; no independent reasoning or protected qualification is claimed. **Next:** complete the combined site review and agree the explicit Chapter III assessment/readiness contract before protected assessment authoring and allocation. Diagnostic 32 and Mastery 56 remain unqualified planning budgets. S02 and S05 remain supporting skills, with no compulsory mastery gate inferred. Chapter III stays inactive/unallocated; Chapter I/II pilots and specialist/release gates remain unchanged. [Batches 09–10 staging](chapter-iii-batches-09-10-staging.md).

[Guide-validator repair evidence](evidence/remediation-guide-validator-metadata-fix-20261015.json) records the deployed shared validation correction and its limits.

### 15C.9 — Chapter III eighth practice batch; combined review queue (historical checkpoint)

**Review closed under 15C.13R above:** all Chapter III ordinary content reviews are complete. Earlier counts and next steps below are historical.

**Sprint 15C.9 is staged and verified:** eight practice questions across seven skills, eight guides and twenty definitions. Question QA and guide validation pass 8/8; rollback rehearsal, exact independent readback and all 39 preservation scopes pass. **All 16 hints and 8 worked examples received separate Armenian, physics and pedagogical checks.** Chapter III now has **64 questions (40 approved + 24 draft), 64 guides (40 published + 24 draft), and 137 definitions (87 active + 50 draft)**.

**Batches 06, 07 and 08 await review together: 24 questions, 24 guides and 50 definitions.** No prior approval is inferred or changed. [Prior pending-queue verification](chapter-iii-batch-08-prior-state.md). The whole-bank comparison includes all prior Chapter III drafts and expands to Chapter II S02 current/history/guide material. All eight additions are intentional practice variants; no independent reasoning or protected qualification is claimed.

**Next:** complete the combined site review, continue the remaining 16 practice slots within the unequal skill budgets, and prepare the explicit assessment/readiness contract. S02 and S05 have reached their supporting practice budgets. Chapter III remains inactive and unallocated; Chapter I/II pilots and assessment/specialist/release gates are unchanged. [Batch 08 staging](chapter-iii-batch-08-staging.md).

### 15C.8 — Chapter III seventh practice batch; combined review queue (historical staging checkpoint)

**Review closed under 15C.13R above:** all Chapter III ordinary content reviews are complete. Earlier counts and next steps below are historical.

**Sprint 15C.8 is staged and verified:** eight more practice questions across S01–S08, eight guides and fourteen definitions. Question QA and guide validation pass 8/8; rollback rehearsal, exact independent readback and all 39 preservation scopes pass. **All 16 new hints and 8 worked examples received separate language and pedagogical checks.** Chapter III now has **56 questions (40 approved + 16 draft), 56 guides (40 published + 16 draft), and 117 definitions (87 active + 30 draft)**.

**Batch 06 and Batch 07 both await review: 16 questions, 16 guides and 30 definitions.** The continuation request did not approve the preceding batch; its content and all prior approvals remain unchanged. [Prior pending-queue verification](chapter-iii-batch-07-prior-state.md). The expanded comparison includes the complete Chapter I S10 measurement-method bank. All new questions are intentional practice variants, with no new independent reasoning or protected qualification claimed.

**Next:** review both batches together on the site, continue the remaining 24 practice slots, and prepare the explicit assessment/readiness contract. S02 has reached its six-question practice budget. Chapter III remains inactive and unallocated; Chapter I/II pilots and the existing assessment/specialist/release gates are unchanged. [Batch 07 staging](chapter-iii-batch-07-staging.md).

### 15C.7 — Chapter III sixth practice batch and worked-example review (historical staging checkpoint)

**Review closed under 15C.13R above:** all Chapter III ordinary content reviews are complete. Earlier counts and next steps below are historical.

**Sprint 15C.7 is staged and verified:** eight new practice questions across all eight skills, eight guides and sixteen definitions. Question QA and guide validation pass 8/8; rollback rehearsal, exact independent readback and all 39 preservation scopes pass. **All 16 hints and all 8 worked examples received separate language and pedagogical checks.** Chapter III now has **48 questions (40 approved + 8 draft), 48 guides (40 published + 8 draft), and 103 definitions (87 active + 16 draft)**.

All prior approvals and publication snapshots are verified. The revised S04-I05 worked example is correct and compared; the S03-I05 automatic grammar objection was checked against the textbook and approved wording retained. [Batch 05 review closure](chapter-iii-batch-05-review.md). All new questions are intentional practice variants, with no independent-new-reasoning or protected qualification claimed.

**Next:** review the new batch on the site, continue the remaining 32 practice slots, and prepare the explicit assessment/readiness contract. Chapter III remains inactive and unallocated; Chapter I/II pilots are unchanged. Unequal skill budgets and supporting/additional-skill, specialist and release gates remain in force. [Batch 06 staging](chapter-iii-batch-06-staging.md).

### 15C.6 — Chapter III fifth practice batch and hint-language review (historical checkpoint)

**Superseded by 15C.6R/15C.7 above:** all 40 prior questions/guides and 87 definitions are reviewed. The edited S04 example is verified and the S03 grammar flag source-checked. Earlier counts and pending statements below are historical.

**Sprint 15C.6 is staged and verified:** eight new practice questions across all eight skills, eight guides and eighteen definitions. Question QA and guide validation pass 8/8; rollback rehearsal, exact independent readback and all 39 preservation scopes pass. **All 16 hints received a separate natural-Armenian and progressive-help review.** The exact textbook ruler image is live and hash-verified. Chapter III now has **40 practice questions (32 approved + 8 draft), 40 guides (32 published + 8 draft), and 87 definitions (69 active + 18 draft)**.

All earlier reviews are verified against exact current versions and publication snapshots. Four Batch 04 guides were edited and compared. [Batch 04 review closure](chapter-iii-batch-04-review.md). Six historical classification labels are conservatively superseded by a version-bound author-decision addendum; approved content and original provenance are preserved. All current Chapter III questions are intentional practice variants, with no independent-new-reasoning or protection qualification claimed. [Current disposition reconciliation](chapter-iii-disposition-reconciliation.md).

**Next:** review the new batch on the existing site pages, continue the remaining 40 source-grounded practice slots, and prepare the explicit assessment/readiness contract. Chapter III remains inactive and unallocated; Chapter I/II pilots are unchanged. The 168 total is a planning budget, not protected capacity or student workload. Supporting/additional-skill treatment, specialist and release gates remain open. [Batch 05 staging](chapter-iii-batch-05-staging.md).

### 15C.5 — Chapter III fourth practice batch and prior review closure (historical checkpoint)

**Superseded by 15C.5R/15C.6 above:** all 32 prior questions/guides and 69 definitions are reviewed. Four edited guides have a current comparison; old classification labels are superseded by the current disposition addendum. Earlier counts and pending statements below are historical.

**Sprint 15C.5 is staged and verified:** eight new practice questions across all eight skills, eight guides and seventeen definitions. Question QA and guide validation pass 8/8 with zero errors/warnings; rollback rehearsal, exact independent readback and all 39 preservation scopes pass. Chapter III now has **32 practice questions (24 approved + 8 draft), 32 guides (24 published + 8 draft), and 69 definitions (52 active + 17 draft)**.

All earlier reviews are verified against current versions and approved snapshots. Five Batch 03 guides were edited and their comparisons refreshed. The exact **S04-I01 correction is published at authoring v7 / runtime v3**; that publication follow-up is closed. [Batch 03 review closure](chapter-iii-batch-03-review.md).

**Next:** review the new batch on the existing site pages, continue the remaining 48 source-grounded practice slots, and prepare the explicit assessment/readiness contract. Chapter III remains inactive and unallocated; Chapter I/II pilots are unchanged. The 168 total is a planning budget, not protected capacity or student workload. Supporting/additional-skill treatment, specialist and release gates remain open. [Batch 04 staging](chapter-iii-batch-04-staging.md).

### 15C.4 — Chapter III third practice batch and guide correction (historical checkpoint)

**Superseded by 15C.4R/15C.5 above:** this batch is now reviewed; the exact correction is published at authoring v7 / runtime v3. Earlier counts and pending observations below are retained as history.

**Sprint 15C.4 is staged and verified:** eight new practice questions across seven skills, eight guides and nineteen definitions. All eight questions pass current-version technical QA with zero errors/warnings; all eight guides pass structural validation. Rollback rehearsal, independent exact readback and all 39 preservation scopes pass. Chapter III now has **24 practice questions (16 approved + 8 draft), 24 guides (16 published runtime + 8 draft), and 52 definitions (33 active + 19 draft)**.

The exact S04-I01 correction approved by John in chat is saved as **authoring v5, draft**, with published runtime v2 and prior approval/history preserved. The reviewer browser is signed out, so authenticated publication remains pending. The current guide queue therefore contains **9 authoring drafts: eight new guides plus this approved correction**. No human or SME approval was fabricated.

The chapter remains inactive and unallocated; Chapter I/II pilots are unchanged. **Next:** review the new batch on the existing reviewer pages and publish the approved correction when signed in; continue the remaining 56 source-grounded practice slots against the 80-question budget and prepare the explicit assessment/readiness contract. The 168 total is a planning budget, not protected capacity or student workload. Supporting/additional-skill treatment, specialist and learner-release gates remain open. [Batch 03 and guide correction](chapter-iii-batch-03-staging.md).

### 15C.3R — Chapter III review closure, 2026-10-14 (historical checkpoint)

**Guide correction publication is closed under 15C.4R/15C.5 above; the recorded approval closure is preserved.**

**Sprint 15C.3R review closure is verified:** all **16 practice questions are approved, 16 guides are published and 33 definitions are active**. Read-only production verification at 2026-10-13 21:28 UTC / 2026-10-14 01:28 Asia/Yerevan confirms current-version human approvals, question QA 16/16, matching definition snapshots and matching published guide snapshots. No ordinary site review remains pending. All questions and definition texts are unchanged from staging; eight guides contain human edits, with version-bound comparison recorded. All 16 guides pass saved deployed-helper structural validation.

One edited S04-I01 worked example needs a physics clarification: sampled equal distances are compatible with uniform motion but do not establish it between measurements. The exact Armenian replacement is prepared in the closure record; it has not been staged or approved. Preserve the existing approval/history and use a fresh guide revision before learner release.

Chapter III remains inactive and draft, with zero pools or allocations. This verification made no production write; Chapter I/II pilots are unchanged. The 168-question total remains a planning budget. **Next:** stage the single guide clarification, continue source-grounded practice families (64 remaining against the 80-question practice budget), and prepare the explicit assessment/readiness contract, including supporting/additional-skill treatment. Specialist, protected-capacity and learner-release gates remain open. [Review closure and prepared clarification](chapter-iii-review-closure-20261014.md).

### 15C.3 — Chapter III second governed practice batch (historical staging checkpoint)

**Review status superseded by 15C.3R above.**

**Sprint 15C.3 is staged and verified:** eight more practice questions, eight draft guides and fourteen new misconception definitions across all eight Chapter III skills. Chapter III now contains **16 practice questions, 16 draft guides and 33 draft definitions**, all awaiting the ordinary human site workflow. The new questions pass technical QA 8/8 with zero errors or warnings; the eight guides also pass exact deployed-helper validation. The comparison records seven intentional practice variants and one additional question demand, with no protected assessment qualification.

The Chapter III release remains inactive and draft, with zero pools or allocations. Chapter I and II remain their existing pilots. No human approvals, specialist events, scoring/readiness rules, runtime prerequisites, model bindings or release changes were created. The 168-question total remains a planning budget; an explicit assessment contract and protected-capacity qualification are still required.

**Next:** review both Chapter III batches together on the existing questions, guides and misconceptions pages, filtered by `PHY7-U03`. Continue the remaining source-grounded practice families and prepare the explicit assessment/readiness contract; obtain the owner decision before implementing supporting/additional-skill pass requirements. Specialist and learner-release gates remain separate. [Staging](chapter-iii-batch-02-staging.md).

### 15C.2 — Chapter III first governed practice batch

**2026-10-13: staging and verification complete; human site review and later qualification remain open.** The owner-accepted Chapter III plan and exact eight v1 questions have progressed to governed draft staging. **8 practice questions, 8 draft guides and 19 draft misconception definitions are committed**, across all eight skills. The Chapter III-only release is draft and inactive, with six official outcomes, zero pool allocations and zero fabricated human approval records. Fresh whole-bank comparison retained five intentional practice variants and three distinct question demands; no protected qualification is claimed. Exact committed snapshots and technical QA pass for all eight questions with zero errors/warnings. All three textbook assets return HTTP 200 with the approved hashes. The 168-question total remains a planning budget; readiness/pass rules, supporting/additional-skill treatment, specialist review and learner release remain open. Chapter II was not retried during this staging checkpoint; the later owner-authorized resume is recorded above. [Staging](chapter-iii-batch-01-staging.md) · [Fresh comparison](chapter-iii-batch-01-comparison.md).

### 15C.1 — Chapter III source mapping and offline preparation (historical checkpoint)

**2026-10-13: complete for preparation only.** John authorized this work while Chapter II deployment is paused, requiring textbook-grounded facts, natural Armenian and source images. The verified current programme has five mandatory and one additional Theme 3 outcomes. The 2023 textbook's §§14–18, printed pp.42–59, support eight proposed skills and their prerequisite graph, a proposed 80/32/56 bank (168 total), one practical-task outline, and eight offline practice drafts with explanations/hints/distractor rationales. Three source illustrations are extracted and checked; the drop-trace panels are stacked for mobile readability.

The numerical bank/weighting proposal is not an approved assessment policy. Supporting/additional-skill gates, protected capacity and source-family feasibility remain decisions. The offline comparison screen is preliminary and stale; refresh all applicable current/history/guide/protected evidence before staging. No content review, SME status, bank/pool/model binding or learner release is manufactured. Chapter II's bounded protected-parallel and deferred-SME authorizations do not extend to Chapter III. [Preparation](chapter-iii-preparation.md) · [Draft practice batch](chapter-iii-preparation-batch-01.md) · [Comparison boundary](chapter-iii-preparation-comparison.md).

**Historical next step, superseded by 15C.2/15C.3:** the foundation and two draft batches are now staged. Current next work is recorded in 15C.3; Chapter II pilot activation and authenticated acceptance are complete.

### 15F.6 — Chapter VI provisional pilot release

**Sprint 15F.6 — Chapter VI knowledge-only provisional pilot activated:** all **242 questions are approved, 146 guides published and 158 definitions active**. Diagnostic 19 / Practice 8 / Mastery 17 / Review 12. Mastery requires **14/17 plus one correct in each of twelve required skills**, with three attempts. Two Diagnostic and three Mastery forms contain 89 distinct approved versions; seven approved Mastery questions remain unallocated. Rollback restored all 59 tracked tables; exact readback verifies 719 configuration rows and 61 preservation scopes. Authenticated six-chapter production acceptance passed **231/231**, with two-school isolation **54/54**, desktop/mobile chapter switching and all 59 tracked tables unchanged through QA. Specialist/exposure review and performed practical assessment remain deferred. **English Grade 7 is the next subject**; textbook intake is recorded and its framework/source mapping is underway; Sprint 16 Physics course integration remains open. [Release](chapter-vi-pilot-release.md).

## Sprint 16 — Physics 7 Course Integration

The Physics 7 course includes:

- all curriculum units;
- unit diagnostics;
- adaptive skill practice;
- remediation;
- unit mastery checks;
- recommendations;
- prerequisite-aware remediation where the curriculum model supports it;
- student-facing mastery states that distinguish Secure / Practising / Needs Work / Not Attempted or equivalent evidence-aware states;
- progress;
- teacher dashboard;
- course-level aggregation across units.

Course-level progress summarizes unit evidence. A future cumulative/final course assessment, if added, remains a separate assessment type.

## Grade 7 four-subject MVP gate

Technical, content and browser QA may continue before this gate. The **formal school MVP pilot must not start** until the production-qualified Grade 7 bundle contains:

1. Physics;
2. Mathematics;
3. Armenian Language;
4. English.

For each of the four subjects, the minimum MVP scope is one **production-ready vertical slice**, not a shell, navigation fixture or unreviewed placeholder. Each slice must include:

- an applicable current official standard/programme source chain and immutable curriculum-release identity;
- reviewed outcomes, skills and subject-appropriate evidence design;
- one coherent unit with sufficient reviewed items/content to exercise Diagnostic, Practice, Review/remediation and Mastery Check;
- deterministic or explicitly governed scoring appropriate to the supported task types;
- learner progress, teacher assignment/visibility and school analytics;
- role, tenant, grade, subject, programme and release isolation;
- desktop/mobile, accessibility, localization and end-to-end regression evidence;
- an explicit content/SME release disposition.

Sprint 16.5 design/usability acceptance is an additional prerequisite for formal school pilot entry.

This is the minimum gate for testing a multi-subject institutional MVP. A subject may have additional released units when the gate is evaluated, but additional coverage does not give that subject reference, default or privileged status and does not reduce the production requirements for any other subject.

## Sprint 16.1 — English 7 Six-Unit Course Delivery

**Owner sequencing decision, 2026-10-24:** Complete the six-unit English 7 course before Sprint 16.2. [Accepted delivery sequence](english-7-course-continuation.md). The latest Unit 2 approval report is accepted without a fresh owner-review audit; C37 now completes technical learner/audio/writing acceptance; Unit 3 authoring, source integration, bank approval and current-programme registration are complete. C44 prepares the material/numerical-policy decision before qualification and bounded learner release.

**Owner decisions, 2026-10-20:** English Grade 7 is the next subject; speaking is assessed by teachers in class and excluded from platform assessment. No microphone, learner voice recording, pronunciation grading or speaking-mark entry workflow is planned. Reading, listening, vocabulary, grammar and writing remain in scope.

The [Unit 1 preparation map](english-7-unit-01-preparation.md) reconciles the Grigoryan/Zangak 2023 textbook with the current August 2026 subject standard and in-force Grade 7 programme. Fourteen skills, thirty activity dispositions and formal source/outcome/family trace are registered. The course inventory covers all twenty QR-linked publisher recordings, including five for Unit 1. Fourteen owner-supplied recordings, thirteen reading sets, the complete 60/56/84 bank, nine guides and separate W01 remain accepted. C22 records the numerical policy and 58-core/2-optional split; C25 records the bounded owner source-use decision and activates that exact configuration as a provisional pilot. The [assessment contract](english-7-unit-01-assessment-contract.md) and [pilot delivery](english-7-unit-01-pilot-release.md) define the active scope. English authenticated reads and the C26 full learner/audio/writing journey are verified. The [Unit 2 preparation](english-7-unit-02-preparation.md) preserves all 34 textbook activities and excludes Do-Re-Mi. John directs completion of English Grade 7 through textbook Units 1–6 before starting Mathematics. Unit 1 evidence is retained. John reports all outstanding Unit 2 approvals complete; this report is accepted without repeating his review or auditing approval clicks. Retained Unit 2 exact-deployment read acceptance passes 136/136 checks plus 54/54 nested isolation checks on source `96a1e6b1a3448fb6b5e282386d012d89dc89e48d`. Unit 2 learner/audio/writing acceptance is now verified under C37. Next: Units 3, 4, 5 and 6 in order, with whole-unit batches and course closure. New unit counts/forms/policies require source and whole-bank evidence; none are pre-approved by this sequencing decision. Existing release controls, source protection, classroom speaking and deferred specialist gates remain. Sprint 16.2 follows English course closure. Limited listening readiness and finite technical replacements remain as accepted; W01 stays separate and speaking classroom-assessed.

| Stage | Work | Current status |
| --- | --- | --- |
| 16.1A | Reconcile sources, map Unit 1 and define the assessment contract | Source/map preparation and C20 registration complete; C22 records numerical policy acceptance. The exact configuration is active under C25; independent specialist qualification remains deferred. |
| 16.1B | Implement reusable response/stimulus/scoring capabilities across authoring, learner delivery and reporting | Writing, typed fields, matching/ordering, private audio and shared task sets are deployed. C12 adds assessed listening with two shared plays through opt-in v4. C25 binds the accepted English policies; C26 verifies full learner/audio/writing delivery and repairs shared audio timing under request jitter. |
| 16.1C | Author, review and verify complete English units in governed batches | John directs completion of English Grade 7 through textbook Units 1–6 before starting Mathematics. Unit 1 evidence is retained. John reports all outstanding Unit 2 approvals complete; this report is accepted without repeating his review or auditing approval clicks. Retained Unit 2 exact-deployment read acceptance passes 136/136 checks plus 54/54 nested isolation checks on source `96a1e6b1a3448fb6b5e282386d012d89dc89e48d`. Unit 2 learner/audio/writing acceptance is now verified under C37. Next: Units 3, 4, 5 and 6 in order, with whole-unit batches and course closure. New unit counts/forms/policies require source and whole-bank evidence; none are pre-approved by this sequencing decision. Existing release controls, source protection, classroom speaking and deferred specialist gates remain. Sprint 16.2 follows English course closure. |

Controlled writing may use deterministic accepted-answer rules. Extended writing requires criterion-level assessment; teacher rubric review is implemented under 16.1B.1. John reports accepting the first unit’s writing task, rubric and workload proposal under C18: one teacher-reviewed 80–100-word note combining description and written interaction, with four 0–3 criteria. This acceptance does not set deadlines, establish measured workload or activate a pass threshold; the rubric is not a ministry grading rule. Unassessed outcomes and classroom speaking must not be converted into passed platform skills. English counts, weights, hints and mastery/readiness rules use the separately accepted C22 contract, active under C25; existing Physics configurations are not platform defaults.

### Current English execution order — six-unit continuation

**Paused on 2026-10-26:** complete the prioritized student-dashboard redesign first. Resume at full Unit3 learner/audio/writing acceptance after C47; do not repeat activation or approved content review. The unit order below is retained for resumption.

1. Retain Unit 1's C25/C26 implementation/evidence and all accepted content, recordings, numerical policies and owner source-use directions. Accept John's latest Unit 2 approval report without repeating his review or auditing approval actions.
2. Reuse the saved Unit 2 exact-deployment read acceptance: 136/136 checks plus 54/54 nested isolation checks on `96a1e6b1a3448fb6b5e282386d012d89dc89e48d`. C37 now completes full Diagnostic/Practice/readiness/Mastery/Review behavior, guide delivery after Diagnostic, audio playback limits/resume/unscored handling and W01 draft/submission/return/revision/teacher feedback on exact deployed source `73cf2cfb6347223a191965489c969e8fd9787a1a`. The retained continuation passes 783/783 checks and independent scoped readback preserves all attempts, exposures and writing history. Both shared audio timing repairs and publication/derived-task preflight are covered. Reuse this evidence for unchanged dependencies; the first failed C36 run and two interrupted C37 runs remain historical.
3. Continue with Unit 3, then Units 4, 5 and 6 in textbook order. For each unit, map sources/outcomes, compare the full applicable bank, prepare a whole-unit question/material/audio/writing package, establish defensible counts and exact policy/forms, integrate sources and complete normal new-content review and release/learner acceptance. Do not copy earlier unit counts as quotas.
4. Close the full English course: all six activity/outcome maps, course navigation/progress, unit-specific policy/history, teacher visibility and source/cross-unit/other-subject isolation. Speaking stays classroom-assessed; independent specialist and production dispositions remain explicit.
5. Close every delivery with evidence, aligned merged documentation, required CI/separate deployment checks and source-verified Notion. Reuse unchanged evidence and keep one primary agent. Start Sprint 16.2 Mathematics after English course closure; later subject/integration/design milestones retain their scope.

[Six-unit continuation plan](english-7-course-continuation.md) · [Unit 1 verified delivery](english-7-unit-01-live-learner-verification.md) · [Unit 2 delivery](english-7-unit-02-pilot-release.md).

## Sprint 16.2 — Mathematics 7 MVP Vertical Slice

**Dependency:** Begin after the owner-prioritised English 7 six-unit delivery and technical course closure. Its representative-unit scope remains unchanged.

Model and implement one representative Mathematics 7 unit from the applicable official programme. The slice must test mathematics-specific skill structure, answer representation and deterministic grading rather than reusing the existing Mathematics navigation fixture as curriculum.

## Sprint 16.3 — Armenian Language 7 MVP Vertical Slice

Model and implement one representative Armenian Language 7 unit from the applicable official programme. The slice must test language-appropriate outcomes, content and evidence while preserving the distinction between automatically scored evidence and any human-reviewed work.

## Sprint 16.4 — Grade 7 Four-Subject MVP Integration

Verify the four subjects as one institutional product:

- entitlement and navigation behavior across all four subjects;
- no collision of learner state, sessions, attempts, mastery or recommendations across subjects;
- assignments, rosters and teacher visibility scoped to valid teacher/subject/class relationships;
- subject-aware dashboards and course progress;
- curriculum-release, blueprint, runtime and learning-model provenance;
- shared Review/mastery lifecycle behavior where applicable, with explicit subject-specific differences;
- two-school tenant isolation;
- authenticated desktop and mobile browser QA;
- production deployment and rollback readiness.

## Sprint 16.5 — Student Dashboard Design & Usability Pass

**Owner-approved cross-role extension, 2026-10-27:** complete [B.6–B.12](cross-role-workspace-sprints.md) before resuming subject/chapter work. Sequence: navigation → measured teacher performance → class/student resource assignments → shared Forest staff layout and reviewable prototype → Today/class cards → feedback ergonomics → sharing preview/motion/usability acceptance. This includes teacher, school-admin and master-admin presentation, preserves the student capabilities, and audits shared reviewer consumers. Broad notifications/assessment/intervention functions remain in their owning sprints. The available-scope workspace exit precedes subject resumption; full four-subject 16.5C still follows integration and gates Sprint17.

**Status:** 16.5A owner-accepted; 16.5B.1 Home, 16.5B.2 all existing student subpages and 16.5B.3 complete S45 authoring/protected delivery are deployed. [Available-scope dashboard technical acceptance](student-dashboard-acceptance.md) is complete with required CI and exact-production evidence. Final owner usability sign-off and full 16.5C/four-subject acceptance remain open; Sprint17 prerequisites are unchanged. English remains paused after C47 for this handoff, then resumes at Unit3 full learner/audio/writing acceptance.

Improve the shared student experience across authorized subjects, grades and learning contexts, using the existing subject-neutral core and governed learning policies.

### Scope

- Audit the current student home, subject/course overview, assessment entry points and progress views; record observed layout and usability problems before choosing the redesign.
- Add «Հավելյալ նյութեր» directly below «Իմ աշխատանքները»: optional materials by authorized subject/topic, with illustrated learning-purpose cards, goals, search, purpose filters and disclosed provider/format filters. Show estimates or explicit recommendations only when supplied by the authorized provider; retain reduced-motion support. Implement teacher sharing, platform publication and protected delivery as one bounded 16.5B capability slice; include 16.5C end-to-end acceptance. See the [resource scope and dependencies](student-supplementary-materials.md).
- Clarify the relationship between home, courses, assessments and progress. Per the 27 October owner request, remove «Առաջընթաց» from main/mobile navigation and keep the complete progress view inside each selected course; preserve legacy progress URLs and exact context during implementation. Give the authorized next learning action a clear primary position, including diagnostic-required and other blocked states.
- Use John’s selected Forest/cream direction from the [visual decision packet](student-dashboard-visual-options.md). Retain illustrated course cards, expandable learning steps and brief reduced-motion-aware feedback. Keep «Դուրս գալ» labelled at the desktop sidebar bottom and under account identity on mobile/all sizes. The full design and style guide are owner-accepted on 27 October; production delivery remains evidence-gated. No persistent student-theme preference is introduced.
- Follow the [student style guide v1.0](student-style-guide.md) and [CSS token reference](design/student-dashboard/student-style-tokens.css). Apply its explicit 16.5B refinements for type size, spacing, essential control contrast and targets; do not treat specimen checks as production acceptance.
- Standardize visual hierarchy, typography, spacing, card density, colors, button alignment and navigation. Use natural Armenian labels, accommodate long Armenian text and retain the requested assessments-before-course ordering where applicable.
- Make the selected learning context, progress and mastery states understandable without implying unsupported precision or completion. Year/grade displays and previous-year history must follow the Sprint 18.5 contract when its data is available.
- Cover desktop and mobile layouts, loading/error/empty states, students without enrollments, multiple subjects, different progress states and unavailable learning actions.
- Apply shared shell/style changes consistently to every affected consumer while preserving tenant, role, release and evidence boundaries. Keep scoring, diagnostic prerequisites, hint penalties and content/SME gates under their existing governed policies.

### Mandatory functionality and compatibility gate

- The redesigned interface must serve all existing and future student accounts across every authorized subject, grade, school, class, academic year and curriculum release. Shared components must read governed context and configuration; prototype names, years, skill counts and sample percentages are not implementation rules.
- Before 16.5A design approval, create a student-function coverage matrix from the existing application and the current roadmap. For every existing and planned capability, record its source/owning sprint, availability or dependency, screen/navigation/action, required UI states, authorized data/context and acceptance evidence. Refresh the matrix when relevant plans change.
- Preserve every existing student function and workflow. Provide an explicit place and integration contract for each planned function; enable it only when its owning sprint, backend, permissions and release gates are ready. Accommodating a feature does not authorize implementing it early or showing a working control for unavailable functionality.
- Cover new and returning accounts, no/single/multiple enrollments, different subjects and grades, current and prior academic years, permitted school/context changes, learning/assessment states, and loading, empty, insufficient-evidence, blocked, error and read-only history states. Historical results remain attached to their original year, curriculum release and evidence model.
- Before implementation approval, resolve unmapped functionality and compatibility conflicts. Any proposed loss of functionality or exception requires John's explicit decision; the visual design must not silently remove, narrow or redefine a capability.
- 16.5C acceptance must trace implemented capabilities to regression evidence and planned capabilities to reviewed integration/dependency contracts. Future student-facing sprints must update that mapping and pass the relevant shared-interface regressions. No scoring, diagnostic prerequisite, hint penalty, mastery criterion, authorization boundary or content/release gate is changed by this design pass.

The retained single-subject reference is now extended by the [26 October interactive review](design/student-dashboard/haiedu-student-review-2026-10-26.html) and [45-entry coverage matrix](student-dashboard-function-coverage.md), including multiple subjects, another grade/school and future year/history states. John explicitly accepts these materials and the complete style guide on 27 October 2026. The owner-prioritized redesign may now proceed without waiting for new subject authoring; full four-subject acceptance remains required before Sprint17. Sprint18.5 still owns rollover/history implementation.

### Saved design reference

Start 16.5A by reviewing the [student dashboard mockup from 2026-10-07](design/student-dashboard/haiedu-student-mockup-2026-10-07.html); its [original editable fragment](design/student-dashboard/haiedu-student-mockup-2026-10-07.fragment.html) is preserved alongside the standalone export. This is the current mockup John asked to carry forward, not a new design or final implementation approval.

The reference covers Armenian Home and Progress, desktop/phone presentation, active/new/no-enrollment learner states, skill filters and detail panels. Preserve it as the starting visual reference, then extend and review it against the mandatory platform-wide function coverage matrix. Its Physics 7 identity, account name, year, skill count, percentages and availability states are illustrative data, not curriculum policy or a restriction on future accounts, subjects, grades or years. The export retains the original mockup content; font assets may load from the approved external font service. Both files are design documentation outside the deployed web directory.

### Delivery and acceptance

1. **16.5A — Audit and mockups:** produce the student-function coverage matrix, an annotated issue list and desktop/mobile mockups with realistic Armenian content and representative states. Obtain product-owner review of the concrete mockups and complete functionality mapping before implementation.
2. **16.5B — Implementation:** implement the reviewed design across the in-scope student surfaces; use shared design tokens and reusable components rather than subject-specific layout assumptions. The supplementary-materials slice includes teacher upload/manage/share, platform author/reviewer publication and authorized learner delivery; presentation alone does not complete it.
3. **16.5C — Browser and release acceptance:** verify enrollment/context selection, required diagnostic, next learning action, assessment entry and progress journeys using authorized fixtures across all four MVP subjects. Check 360 px, 768 px and 1280 px layouts, 200% zoom, Armenian wrapping, keyboard/focus behavior and accessible status meaning; require no unintended horizontal overflow or clipped controls. Record before/after screenshots and unresolved issues, pass the required CI/browser/aggregate release checks, and verify the deployed implementation through the established production gate.

Sprint 17 formal pilot entry requires both Sprint 16.4 integration acceptance and Sprint 16.5C design/usability acceptance. Planning or mockup approval alone does not close this sprint. Sprint 18.5 lifecycle work retains its separate implementation gate.

## Sprint 17 — Grade 7 Four-Subject School MVP Pilot

Run the formal Grade 7 MVP under controlled school conditions only after the Sprint 16.4 integration gate and Sprint 16.5C design/usability gate pass:

- all four MVP subjects represented;
- several classes;
- multiple teachers, including valid subject assignments;
- school-admin workflows;
- controlled student enrollment;
- progression between units and subjects;
- standards-aligned curriculum coverage;
- teacher interventions;
- retention;
- usability;
- operational support;
- student behavior over time;
- engagement/active-learning telemetry;
- teacher intervention recording;
- actionable early-warning/notification behavior;
- approved assessment accommodations where configured.

Pilot reporting must keep subject, unit, curriculum release and evidence model visible. Results from one subject must not be generalized to the other three without evidence.

## Sprint 18 — Production Hardening & Curriculum-Change Operations

Engineering hardening:

- performance;
- observability;
- monitoring;
- backups;
- recovery;
- error tracking;
- CI/CD;
- database optimization;
- security regression;
- tenant-isolation regression;
- capacity testing;
- operational data-quality/integrity checks;
- incident-response procedures and security-event handling;
- tested backup **and restore** procedures;
- feature flags / controlled rollout and rollback for material platform/model changes;
- centralized localization architecture so UI/content-language behavior is not hard-coded;
- one reviewed Armenian terminology dictionary shared by browser surfaces, emails and notifications;
- backend error-code mapping to natural Armenian explanations;
- automated checks for missing translations, inconsistent terminology, fallback text and Armenian layout overflow;
- an Armenian-language review gate for every new or modified interface.

Curriculum-change operations:

```text
new official standard/programme/amendment
  -> register version
      -> diff against active release
          -> identify affected outcomes/skills/items
              -> expert review
                  -> publish new curriculum release
                      -> migrate active delivery safely
                          -> preserve historical evidence
```

Bad curriculum releases must be reversible without corrupting historical learner evidence. Content corrections/disputes must preserve question provenance and prior versions rather than silently editing validated production history.

## Sprint 18.5 — Academic-Year Lifecycle, Rollover & Continuity

**Status:** Approved design; implementation, migration execution and acceptance pending. The summary reconciliation is complete as of 2026-10-10. Current disposition is in the [status register](project-status.md); the [detailed rollover policy](academic-year-rollover-localization-policy.md), including final decisions dated 2026-10-05, governs implementation.

Core invariant: **students and teachers keep their accounts; academic structures change; history is never overwritten.**

### Approved authority and order

The School Admin / Headmaster authorizes teaching subjects, manages academic years, approves student progression and resolves exceptional conflicts/handover. Teachers create their own subject classrooms after year activation. Routine Headmaster allocation of teachers to grades/classes is not introduced. Students take no rollover action; annual progression does not use invitations intended for new arrivals or corrections.

1. Create the next year in **setup**. Teachers cannot create subject classrooms in a setup year.
2. Prepare persistent school-class placements and class-continuation mappings; do not infer the school roster by unioning subject enrollments. Resolve Promote / Repeat / Internal transfer / Leaving / Pending outcomes with the Headmaster.
3. Preview and validate the approved placement set and cutover dependencies using versioned, resumable and idempotent batches. Unresolved cases remain explicit. Missing target subject classrooms are a pending-delivery condition, not a prerequisite blocking year activation.
4. Activate after the required placement/cutover checks. Atomically switch the school's current-year context and fence outgoing-year academic writes, moving outgoing records into read-only history. Do not archive accounts or create teacher subject classrooms during activation. Failed activation leaves the old current year intact.
5. After activation, authorized teachers create subject classrooms with fixed subject, grade and **uppercase Latin A–E** selectors. Titles are generated; no custom names or letter-alias conversion. The system records the corresponding teacher assignment.
6. Enroll only approved placements whose current membership, teacher subject authorization, classroom and published programme/release are all valid at commit time. Missing delivery dependencies remain pending; no forced active enrollment.

### Required implementation and acceptance

- Same-teacher retries are idempotent. Competing ordinary same-subject claims from different teachers are denied and sent to a dedicated Headmaster conflict-resolution page; co-teaching and split groups are outside this slice.
- Each student's application is atomic; school-wide batches are resumable. Concurrency, revocation, stale preview and stale-tab writes must fail safely. Record unfinished assessment disposition without deleting or fabricating evidence.
- `teacher_assignments` becomes authoritative through additive, reviewed legacy mappings and verified migration stages. Ambiguous class/teacher history stays unresolved until reviewed; do not invent mappings or authorship.
- Persistent placement determines current year/grade; subject labels do not. Prior-year mastery informs context but does not automatically satisfy new-year mastery. History and analytics resolve explicit year, school and authorization scope.
- Recovery restores the existing identity, revokes replaced credentials/sessions where required, and never creates duplicate learners. Rollover does not depend on possession of an old email/password.
- Inter-school transfer does not grant either school unrestricted access to the other's institutional history or later learner activity.
- Headmaster year/placement/conflict/recovery surfaces, teacher creation/current/archive views and student current-year/pending/history views require natural Armenian. Students receive no rollover controls.
- Complete reviewed migration evidence, isolated concurrency/retry/cutover checks, authenticated two-school denials and role-specific browser acceptance before implementation closure. The approved policy alone is not a deployed feature.

## Sprint 19 — Public / Institutional Beta

Controlled external institutions may begin adoption only after:

- school onboarding;
- school-admin onboarding;
- teacher onboarding;
- controlled student enrollment;
- institutional account management;
- tenant isolation;
- privacy documentation;
- support processes;
- explicit academic-year/programme/curriculum-release identity;
- stable production deployment;
- repeatable school onboarding/configuration;
- structured support and issue-escalation workflow.

## Sprint 20 — Physics Grade Expansion — Physics 8–12

For each grade:

```text
current Physics subject standard
  -> applicable grade programme
      -> units
          -> outcomes
              -> skills
                  -> assessment and learning system
```

This phase should primarily require curriculum mapping, skill modelling, content development, assessment development and QA—not another architecture redesign.

## Sprint 21 — Post-MVP Subject / Grade Expansion

Select the next priority subject/grade combination after the four-subject Grade 7 MVP. Begin with:

```text
applicable subject / subject-area standard
  -> grade programme
      -> units/outcomes
          -> skills
              -> subject-appropriate assessment design
```

The objective is to prove that the standards-driven onboarding and evidence model are repeatable beyond the Grade 7 MVP bundle, across different disciplinary evidence models, item types, teacher workflows and content structures.

Architecture/navigation fixtures do not satisfy this sprint; the selected course must carry real curriculum provenance, reviewed content and an explicit release disposition.

## Sprint 22 — Multi-Subject Expansion Across Grades

Use a repeatable subject-onboarding pipeline:

1. identify official standard;
2. register standard version;
3. identify applicable grade programme;
4. map official outcomes;
5. model skills;
6. complete expert review;
7. design unit assessment blueprints;
8. build content;
9. run content/technical QA;
10. pilot;
11. production release.

The standards registry determines valid subject/grade combinations rather than assuming every subject exists in every grade.

## Sprint 23 — Cross-Grade / Cross-Subject Learner Profile

Build a longitudinal profile in which historical evidence persists across:

- academic years;
- grades;
- subjects;
- school transfers where policy permits continuity;
- curriculum versions.

Cross-grade and eventual cross-subject prerequisite relationships become structurally possible without rewriting historical learner evidence. Retention-of-learning/reassessment history can span years while remaining curriculum-version aware.

## Sprint 24 — Advanced Teacher, School & Curriculum Analytics

Add analytics only after sufficient longitudinal/multi-course evidence exists:

- class progress trends;
- engagement, usage and retention analytics with active-learning time separated from simple tab-open duration;
- baseline-diagnostic and learning-growth indicators;
- intervention groups;
- skill-gap clusters;
- misconception patterns and prerequisite-linked gap hypotheses;
- mastery evidence confidence and explicit Insufficient Evidence states;
- inspectable explanations for consequential analytics/recommendations;
- cohort progression;
- teacher-facing recommendations;
- curriculum coverage;
- official-outcome coverage;
- assessment/question quality analytics;
- standards-implementation gaps;
- school leadership reporting;
- export/reporting and authorized data portability;
- privacy-preserving benchmarking only when cohort size, privacy thresholds and statistical validity are sufficient;
- assessment-integrity/anti-gaming signals as review indicators, never automatic cheating determinations.

Analytics must respect tenant, class/course and role boundaries. Metric definitions must be governed so terms such as mastery, coverage, active learner and growth have stable, documented meanings.

## Sprint 24.5 — Teacher Assessment, Intervention & Remediation Workflows

Turn trusted evidence into teacher-controlled action:

- teacher assessment builder using validated-bank items and explicit assessment blueprints;
- intervention tracking and teacher override-with-reason while preserving raw/system evidence;
- early-warning and prioritized teacher notification workflows;
- retention-of-learning / reassessment queue;
- analytics-driven homework/remediation proposed from diagnosed gaps, prerequisite relationships and evidence confidence;
- teacher preview/edit/approve/reject/assign before automated recommendations become learner work;
- resulting practice/reassessment evidence feeds the same evidence model.

AI-generated assessment items or remediation content remain unreviewed unless explicitly approved under content governance.

## Sprint 25 — Controlled AI Layer

Implement a provider-independent AI service/model gateway so platform functions are not coupled throughout the codebase to one vendor/model. AI receives only task-relevant context and remains subordinate to curriculum, evidence, permissions and deterministic governance.

Potential uses:

- open-response feedback;
- misconception classification;
- personalized explanation generation;
- teacher-support summaries;
- language feedback;
- hint generation;
- content-authoring assistance;
- draft curriculum-mapping assistance.

Deterministic/auditable systems remain authoritative for:

- grading where rules are deterministic;
- mastery evidence;
- assessment eligibility;
- item exposure;
- curriculum identity;
- permissions;
- official progress records.

AI may propose a standards mapping, but it must not become the authority for what an official national standard says.

## Sprint 26 — National-Scale Readiness

National-scale preparation includes:

- multi-school tenancy at scale;
- regional/national administrative delegation;
- large-scale database architecture;
- high availability;
- disaster recovery;
- governance;
- curriculum-version management;
- official-source monitoring;
- curriculum-update impact analysis;
- staged curriculum rollout;
- institutional integrations;
- security at scale;
- privacy/compliance processes;
- high-volume analytics;
- operational support and escalation;
- centrally governed state-standard configuration as the default for every school;
- Master Admin-controlled approval for legitimate school-specific additions/exceptions without allowing schools to redefine the national curriculum baseline.

## Architectural invariant from Sprint 11G onward

The learner-facing shell must not assume that:

- a learner is always Grade 7;
- the platform has a default or privileged subject;
- a learner takes only one course;
- global Home owns subject-specific diagnostics, practice, assessments or mastery;
- course visibility can be inferred without an active entitlement.

## Subject-neutral core invariant from 2026-09-30 onward

The platform core must be subject-neutral. Subject-specific behavior belongs in explicit, versioned configuration or extension points.

Shared identity, tenancy, enrollment, curriculum versioning, sessions, evidence provenance, authorization, navigation and analytics must not assume a subject, grade, course code, skill/item count, response format, mastery rule, language or content model. No subject is a platform default, reference model or privileged path; existing subject-specific behavior is treated as an extension or migration concern.

The complete boundary, exception rule and acceptance criteria are defined in `docs/subject-neutral-core.md`. Future subject onboarding and the Grade 7 four-subject MVP gate must verify subject isolation and prove that new subjects do not require redesign of the shared core.

## Assessment-scope invariant from Sprint 11H onward

The learning model must preserve these scope distinctions:

- Diagnostic = unit-bound learning guidance;
- Practice = skill-bound activity inside a unit;
- Mastery Check = unit-bound independent verification;
- Course Progress = aggregation of unit evidence;
- cumulative/final course assessment, if introduced, = separate explicit assessment type.

No global rule may assume every unit has 10 skills or every assessment has 20 questions.

## Curriculum-governance invariant from Sprint 11I onward

Implemented curriculum must be traceable through:

```text
official national framework
  -> applicable subject / subject-area standard
      -> grade-specific programme
          -> unit/outcome
              -> HaiEdu skill
```

Curriculum/version changes must not silently reinterpret historical evidence.

## UI invariant from Sprint 11H onward

Shared role surfaces must not assume that:

- Armenian labels fit on one line;
- flex/grid children can rely on intrinsic width without `min-width: 0`;
- button borders may hug text without internal padding;
- cards can omit explicit internal spacing when they contain generated/dynamic content;
- desktop-only width assumptions are acceptable for learner-facing actions and status text.

## Multi-tenant invariant from Sprint 14 onward

The platform must not assume that:

- one central operator manually manages every school/user;
- a school admin can see another school's data;
- a teacher role implies access to every student or subject;
- a user account automatically implies school membership;
- a class code alone is sufficient proof of institutional membership at scale;
- a school owns the learner's global identity/history;
- local school content is equivalent to centrally validated national curriculum content.

The target operating model is centrally governed canonical curriculum/content with tenant-isolated school administration, time-aware memberships and controlled enrollment.

## Final milestone structure

### Milestone A — Technical proof

**Sprints 0–2**  
The learning loop works.

### Milestone B — Coherent learning product

**Sprints 3–7**  
Students and teachers can actually use it.

### Milestone C — Pilot-ready product

**Sprints 8–10.5**  
Quality, UX, privacy, administration and production QA foundations are in place.

### Milestone D — Trustworthy, standards-aligned learning evidence

**Sprints 11–13, including Sprint 11.5**

Assessment integrity  
→ standards/source integrity  
→ curriculum versioning  
→ technical handoff readiness  
→ controlled external tester pilot  
→ calibration  
→ first standards-verified production unit.

### Milestone E — Version-aware multi-tenant academic platform

**Sprint 14**

The architecture supports multiple subjects and grades across tenant-isolated institutions.

### Milestone F — Grade 7 four-subject MVP bundle

**Sprints 15–16.4**

Physics 7, Mathematics 7, Armenian Language 7 and English 7 each meet the same minimum production-ready vertical-slice gate and pass integrated MVP readiness. Additional coverage in any subject does not change their equal platform status.

### Milestone G — Four-subject school validation and institutional readiness

**Sprints 16.5–19, including Sprint 18.5**

Reviewed and implemented student dashboard design with browser/release acceptance  
→ four-subject Grade 7 school testing  
→ production/curriculum-change hardening  
→ academic-year lifecycle/rollover continuity  
→ controlled external adoption.

### Milestone H — Multi-grade Physics

**Sprint 20**

Physics expands through Grades 8–12 using applicable official programmes.

### Milestone I — Multi-grade, multi-subject expansion

**Sprints 21–23**

Next subject/grade onboarding  
→ broader standards-driven expansion  
→ longitudinal cross-grade/cross-subject learner model.

### Milestone J — Institutional intelligence and national scale

**Sprints 24–26, including Sprint 24.5**

Advanced analytics  
→ teacher assessment/intervention/remediation workflows  
→ controlled AI  
→ national-scale governance and operations.

**S03 review complete — 15B.13D:** Production readback confirms I05 v2, I06 v1, I07 v2 and I08 v2 approved, all ten S03 definitions active, and the edited new guide published at runtime v2 / authoring v4 with matching immutable content. The original guide remains v3. Four automated QA refreshes preserve all user edits and approvals. S03 has eight approved items, with four planning slots open. [Review evidence](evidence/sprint-15b13-s03-review-complete-20261006.json).

**S04 practice/review expansion — 15B.13E (deployment checkpoint; human review completed below):** Three source-backed drafts, I05–I07, add row-gap bias, image-to-real-size calculation and small-body/large-particle-count reasoning. The entire 304-item / 139-snapshot bank was screened, including related/protected measurement content. Repetitive L/N and unit-conversion candidates were omitted. Two textbook figures, four draft definitions and one separate guide accompany the batch. S04 has seven authored items and five unfilled planning slots; Chapter II has 47 authored items (44 approved, three drafts), leaving 145 un-authored toward the unchanged quality-constrained 192 target. No protected bank, model, scoring or release gate changes. [Comparison and handoff](chapter-ii-s04-whole-bank-review.md).

**15B.13E verification:** PR #152 / CI #1257 and independent main CI #1258 passed all five jobs (1,230 Node / 35 Chromium). Migration `20261006202205` exactly matches reviewed SQL. Three automated QA records and guide validation pass without errors/warnings. All prior rows are preserved across 15 appended tables and 85 unchanged tables; advisor groups are unchanged. Vercel and `/release.json` verify main `91e603f20f2454bf514a1e350467878889916ea6`, and figures 28–29 return matching bytes. No Chapter II learner, pool, form or exposure links exist; release remains draft. The original human-review handoff is closed by the 2026-10-07 checkpoint below. [Evidence](evidence/sprint-15b13-s04-expansion-20261006.json).


**S04 review complete — 15B.13E (2026-10-07):** All seven current questions are approved, including edited I05 v3, I06 v2 and I07 v3; all eight definitions are active. The new guide is published at runtime v2 / authoring v3 with matching immutable content; the original remains v3. Three automated current-family QA refreshes and guide validation pass without changing human edits or approvals. S04 remains 7/12 with five planning slots open. [Review evidence](evidence/sprint-15b13-s04-review-complete-20261007.json).

**S05 practice/review expansion — 15B.13F (deployed; human review pending):** Two textbook-backed drafts address continued motion after visible uniformity and two-way random motion with unequal aggregate transfer. Comparison covers all 307 current items and 147 snapshots, including related skills and protected banks. Figures 30–31, two draft definitions and a separate guide accompany the batch. Verified inventory: S05 six authored (four approved, two drafts), six slots open; Chapter II 49 authored (47 approved, two drafts), 143 un-authored toward the unchanged quality-constrained 192 target. S03 four-slot and S04 five-slot shortfalls remain unresolved; no reduced bank plan is inferred. [Comparison](chapter-ii-s05-whole-bank-review.md).


**15B.13F verification:** PR #157 / CI #1273 and independent main CI #1274 passed all five jobs (1,232 Node / 63 Chromium). Production migration `20261007071149` exactly matches reviewed SQL. Both new questions pass current-family technical QA; the separate guide validates both variants. All pre-existing rows are preserved across 15 appended and 85 unchanged tables, with unchanged advisors. Vercel and public release/image readbacks match main `fc5b91d50696798b86a26bd37964c636fedd81ef`. Chapter II remains draft, with zero learner, pool, form or exposure links. Next: human review of the two S05 questions, two definitions and guide; then S06 textbook/whole-bank comparison. S05 six-slot, S04 five-slot and S03 four-slot bank-plan gaps remain open. [Evidence and review links](chapter-ii-s05-whole-bank-review.md).

**S05/S06 combined review — 15B.13G (drafts deployed; human review pending):** John authorized S06 before finishing S05 so both can be reviewed together. S05 I05 is edited/approved at v2; I06 v1, two definitions and its separate guide remain pending. Two current-family technical QA refreshes and guide validation pass without changing those human decisions. S06 adds two bounded drafts after the 309-item / 150-snapshot comparison: one intentional practice variant and one new reasoning demand, three draft definitions and one guide. It reaches six authored of twelve, with six slots still open. No reduction of the bank plan or release gates is implied. [S06 comparison](chapter-ii-s06-whole-bank-review.md) · [S05 partial review](evidence/sprint-15b13-s05-partial-review-20261007.json).

**15B.13G verification:** PR #159 / CI #1277 and independent main CI #1278 passed all five jobs (1,234 Node / 63 Chromium). Production migration `20261007080810` matches reviewed SQL; current-family QA, guide validation, all-row preservation and public commit/image readbacks pass. Fifteen tables receive expected additions and 85 are unchanged; advisor findings are unchanged. Chapter II has 51 authored questions: 48 approved, one S05 draft and two S06 drafts; 141 remain un-authored toward the unchanged quality-constrained 192 target. S06 has six authored questions and six open slots. Review the three pending questions, five new definitions and two guides together; S05 I05 v2 stays approved. No pool/form/learner/exposure links or release/model/scoring changes. After review, proceed to S07 source/whole-bank comparison. [Combined review links](chapter-ii-s06-whole-bank-review.md) · [Evidence](evidence/sprint-15b13-s06-expansion-20261007.json).

**S05/S06 review complete — 15B.13F/G (2026-10-07):** All twelve current questions are approved: S05 I05/I06 v2, S06 I05 v2 and I06 v1. All five new definitions are active. Both edited expansion guides are published at runtime v2 / authoring v4 with matching immutable content; original guides remain v3. Four current-family technical QA refreshes and guide validation pass, preserving human edits and decisions. Chapter II has 51 approved authored questions. Six-slot gaps for both S05 and S06 remain open. [Review evidence](evidence/sprint-15b13-s05-s06-review-complete-20261007.json).

**S07 practice/review expansion — 15B.13H (draft deployed; human review pending):** The complete 311-item / 154-snapshot comparison selects one intentional practice variant applying the book's very slow solid diffusion to a short-observation error. Figure 32, two draft definitions and a separate guide accompany it. This brings S07 to five authored of twelve planned, with seven open slots. It is not counted as new independent reasoning coverage. Other ranking/mechanism repetitions and unsupported numerical/temperature tasks were omitted. Prior bank-plan gaps and all assessment/model/SME/release gates remain open. [Comparison](chapter-ii-s07-whole-bank-review.md).

**15B.13H verification:** PR #161 / CI #1281 and independent main CI #1282 passed all five jobs (1,236 Node / 63 Chromium). Production migration `20261007134437` matches reviewed SQL. Current-family QA, guide validation, all-row preservation and public commit/image readbacks pass; 15 tables receive expected additions and 85 are unchanged, with unchanged advisors. Chapter II has 52 authored questions: 51 approved and one S07 draft; 140 remain un-authored toward the unchanged quality-constrained 192 target. S07 has five authored and seven open slots. Review one question, two definitions and the separate guide. S05/S06 human review is complete. No pool/form/learner/exposure links or release/model/scoring changes. After review, proceed to S08 source/whole-bank comparison. [Review links](chapter-ii-s07-whole-bank-review.md) · [Evidence](evidence/sprint-15b13-s07-expansion-20261007.json).


## Sprint 15B.13I — S08 bounded expansion and S07 review closure — 2026-10-07

S07 human review is complete: five approved questions, both expansion definitions active and edited guide published at runtime v2 / authoring v4. Read-only technical checks pass; human edits and approvals are preserved. Evidence PR #162 merged with all five CI #1283 jobs successful; Notion v3.13 closeout preserves unrelated content and native references. [S07 completion](evidence/sprint-15b13-s07-review-complete-20261007.json).

S08 comparison of 312 current questions, 155 snapshots and all relevant mappings supports two drafts: characteristic versus individual molecular speed (new assessed distinction) and a temperature/evaporation application (intentional practice variant). Three new draft definitions and a separate guide accompany them. Printed textbook pp34–35 directly support the tasks; no matching illustration is available. The original four questions and guide remain unchanged. [S08 comparison](chapter-ii-s08-whole-bank-review.md).

Target inventory after verified deployment: 54 authored Chapter II questions, 52 approved and two S08 drafts; 138 remain unauthored toward the unchanged quality-constrained 192 plan. S08 reaches 6/12, leaving six planning slots; earlier S03/S04/S05/S06/S07 gaps remain 4/5/6/6/7. Technical deployment evidence and human review remain pending until recorded below. No learner activation, protected assessment bank, scoring/model change or SME approval is implied. After human review, proceed to S09 textbook/whole-bank comparison.


**15B.13I deployment verified; S08 human review pending:** PR #163 / CI #1286 and independent main CI #1287 passed all five jobs. The corrected 14-table source guard includes pool/form membership. Exact migration SQL, two current QA records, guide compatibility, all-row preservation across 100 tables, unchanged advisors and the production commit are verified. S08 reaches 6/12, with six slots open; Chapter II has 54 authored, 52 approved and two S08 drafts, leaving 138 unauthored. Review the two questions, three definitions and separate guide; then proceed to S09. Original content, human decisions and all learner/assessment/SME/release gates are preserved. [Review links](chapter-ii-s08-whole-bank-review.md) · [Evidence](evidence/sprint-15b13-s08-expansion-20261007.json).


## Sprint 15B.13J — S09 prepared; shortfall decision pending — 2026-10-07

S08 review is complete: both new questions are user-edited v2 and approved, all definitions active, and the edited guide published at runtime v2 / authoring v4. One stale family-QA result was refreshed without modifying human content. Chapter II currently has 54 approved authored questions.

S09 comparison supports two candidates: operating range/liquid state adds question coverage; mechanism versus calibrated readout is an intentional practice variant. Three draft definitions and a separate guide are prepared in PR #165. If deployed, S09 would reach 6/12 and Chapter II 56 authored (54 approved, two drafts), leaving 136 questions toward the unchanged 192 plan. The explicit proposed bank decision is to stage these two drafts for human review, retain twelve as the S09 planning target, and keep six unfilled slots open without padding or lowering assessment/release criteria. John’s decision must be recorded before merge/application; no S09 expansion has been applied.

The corrected 18-table freshness guard includes family records/reconciliations and assessment memberships/purpose/protection headers. Required technical checks and transaction rollback evidence accompany the proposal. All earlier gaps, human review, protected banks, model approval, older illustration audit, SME, pilot and release gates remain open. [Comparison and proposed decision](chapter-ii-s09-whole-bank-review.md) · [S08 completion](evidence/sprint-15b13-s08-review-complete-20261007.json).


## Sprint 15B.13J — S09 deployment verified; human review pending — 2026-10-07

John explicitly approved staging the two S09 drafts, three definitions and guide at 23:13:37 Asia/Yerevan, retaining the twelve-question target and six open slots. This decision was recorded in PR #165 before merge/application. It does not approve question content, a smaller overall bank or Chapter II activation. [Owner decision](evidence/sprint-15b13-s09-staging-decision-20261007.json).

PR #165 / corrected-head CI #1292 and independent main CI #1293 passed all five jobs. Main `e65839d0602c7837a0cf68face803b2b8424f70c` matches the reviewed tree. The corrected 18-table guard includes family records/reconciliations, assessment memberships and pool/form purpose/protection headers. Production migration `20261007191924` matches the reviewed SQL exactly. Both drafts pass current technical QA with automated actor-null provenance; guide validation and immutable item/guide histories match. All existing rows across 100 tables are preserved, with expected additions in 15 tables and 85 unchanged. Advisors are unchanged and public `/release.json` verifies the implementation commit.

S09 now has 6/12 authored, leaving six slots open; Chapter II has 56 authored, 54 approved and two drafts, leaving 136 toward the unchanged 192 plan. Review the two questions, three new definitions and separate guide; publish questions before the guide. Chapter II remains draft and inactive with zero pool/form/learner/exposure links and zero candidate blueprints. All earlier gaps, protected-bank separation, model, older illustration audit, SME, pilot and release gates remain open. After human review, close S09 and reconcile remaining chapter bank gaps. [Review links](chapter-ii-s09-whole-bank-review.md) · [Deployment evidence](evidence/sprint-15b13-s09-expansion-20261007.json).

## Sprint 15B.13K — S09 review closure and Chapter II bank reconciliation — 2026-10-07 UTC

**Completed bounded work:** Verified S09 I05/I06 v2 approvals, twelve active definitions and the edited guide's runtime v2 / authoring v4 publication. Immutable instructional snapshots match. The deployed evaluator and structural guide validation pass; one stale I05 technical-QA record was refreshed without changing content or human decisions. I06's current QA is retained. Evidence PR #166's independent main CI #1296 passed all five jobs. [S09 review evidence](evidence/sprint-15b13-s09-review-complete-20261007.json).

Live chapter inventory is **56 approved questions, 66 active definitions and 17 published guides**. Practice counts S02–S09 are **12/8/7/6/6/5/6/6**, leaving **0/4/5/6/6/7/6/6** slots respectively. Diagnostic and protected mastery questions remain unauthored: **32 + 64**. Total remaining is **136**, including **40 practice**. No allocated pools/forms, candidate blueprints, policy/model bindings or learner/exposure links exist; the release remains draft and inactive. The historical S02-I01 QA warning is retained, and chapter content-QA remains pending.

The reconciliation synthesizes committed source/whole-bank decisions and records a bounded next slice: assess protected-bank feasibility for S02, starting with source-backed diagnostic candidates and a reserve map for mastery, while keeping all forty practice gaps and the 96/32/64 target open. It does not certify enough distinct protected questions, authorize reuse of practice scenarios, reduce the bank target or change sixteen-question delivery/passing. Any proposed bank-plan change still needs John's explicit decision under `AGENTS.md`; read-only preparation is authorized by the continuation request.

Two S09 follow-ups are recorded for governed revision/review: the embedded `D.` in I06 option text and the guide worked example's reuse of I06's erased-scale situation. They are preserved rather than silently changed. The older 32-question illustration audit, external SME, model parameters, protected-bank validity, pilot and release gates remain open. **No S10 or Chapter II release is implied.** [Reconciliation and next-slice specification](chapter-ii-bank-reconciliation.md) · [Inventory evidence](evidence/chapter-ii-bank-reconciliation-20261007.json).

## Sprint 15B.13L — S02 diagnostic/mastery feasibility — 2026-10-07 UTC

**Completed bounded work:** Frozen current/history, related outcome mappings, teaching guides, protected allocations and exposure evidence; inspected the supplied textbook and compared twelve candidate directions. Three are conditional development leads (two diagnostic, one mastery), nine are omitted from the proposed reserve, and zero assessment items are governed or cleared. The complete 4/8 reserve is not established. This is a first bounded pass, not proof that further defensible content is impossible.

The saved private reviewer packet contains candidate/source/overlap profiles, three Armenian prototypes with provisional answer rationales, explicit unresolved reviews and the complete frozen item-version inventory. Public evidence contains opaque candidate references and hashes. Both diagnostic leads still need direct experimental-evidence partners; source exposure, outcome alignment and difficulty remain review issues. No existing content, history, approval, allocation, runtime or release state changed; all 38 guarded table counts/fingerprints match. Observation timestamps are recorded separately.

**Next bank-plan decision:** Recommend retaining all targets while undertaking one bounded refinement/review of the three leads before any staging proposal, with nine unresolved slots explicit. Alternatively pause S02 protected authoring for subject-review guidance on outcome decomposition. `AGENTS.md` requires John's decision after a defensible-content shortfall. The continuation request does not approve a smaller bank. Chapter II still has 56 approved practice items, 66 active definitions and 17 published guides; 40 practice + 32 diagnostic + 64 mastery = 136 unauthored. Option B's 16/16 delivery, 13/16 and per-skill mastery requirements, readiness, S09 follow-ups, SME/model/pilot/release gates remain unchanged.

[Feasibility findings and reserve map](chapter-ii-s02-assessment-feasibility.md) · [Sanitized evidence](evidence/sprint-15b13-s02-feasibility-20261007.json).

## Sprint 15B.13M — S02 candidate refinement and review handoff — 2026-10-07 UTC

**Completed bounded work:** John approved proceeding with refinement after the bank-count clarification, retaining all targets. Revalidated the source and whole-bank guard; refined two prototypes and set aside the third after attempted repairs did not resolve the protected-content overlap. There is now one conditional diagnostic and one conditional mastery prototype for human content review, ten slots without a retained candidate, and zero governed or cleared assessment items. A planning revision is not a database item version.

The separately saved 11-page private packet preserves candidate prompts, provisional keys, scenario/inference/solution comparisons, source rationale, illustration decisions, misconception-mapping plans and open gates. Review questions are on pages 3 and 6. Public records contain opaque references and hashes. Earlier specifications and the original feasibility packet remain preserved. Current before/after full-row fingerprints and counts match across 38 tables and the prior final guard; the older content snapshot retains its original observation time. No production writes occurred.

**Next handoff:** John/content reviewer marks each retained prototype accept-for-governed-draft-proposal, revise or omit with a reason. This is a content-review handoff, not another approval of the same bank targets. Ten gaps remain; no further valid questions are promised or declared impossible. Future staging still requires a fresh whole-bank/source comparison, governed drafts/history, accurate mappings, technical QA, human approval and separate SME/assessment/release gates. Chapter II remains 56 approved practice items, 66 active definitions and 17 published guides; 136 remain unauthored toward the unchanged 192. Option B's 16/16 delivery, passing/readiness and attempt limits are unchanged. Both S09 follow-ups, the older illustration audit and model/SME/pilot/release work remain open.

[Refinement and review handoff](chapter-ii-s02-candidate-refinement.md) · [Sanitized evidence](evidence/sprint-15b13-s02-refinement-20261007.json).

## Sprint 15B.13N — S02 accepted candidates staged for site review — 2026-10-08 UTC

**Completed bounded work:** After reviewing the revision-2 questions on private packet pages 3 and 6 and the proposal to create unpublished governed drafts in the Content Reviewer workspace, John replied “accept both.” The two exact accepted specifications are now diagnostic D01 and mastery M01 v1 drafts with initial immutable history, separate fixed templates/families, source/evidence metadata and accurate mappings. Four new misconception definitions remain draft; no human approval was manufactured. S02-F-D02 remains omitted.

The fresh whole-bank/source guard matched the prior corpus; the production rollback preserved all 38 table fingerprints, and committed staging preserved every prior guarded row with only expected additive records. Actual deployed-v11 evaluator replay against fresh production readback passed both questions without errors/warnings, recorded with automated provenance and null actor. This was not authenticated live Edge or browser acceptance. No schema, runtime or frontend change was needed. Protected text, answers and staging SQL remain in the privately saved audit; public evidence is sanitized.

**Next handoff:** Review [diagnostic D01](https://www.haiedu.am/content-item.html?id=c5837b19-b157-4151-ab13-831ccc5de7d4&from=review), [mastery M01](https://www.haiedu.am/content-item.html?id=620f717e-013d-4c32-9b02-c40a65a52257&from=review) and the four draft definitions on [Misconceptions](https://www.haiedu.am/content-misconceptions.html), under PHY7-U02-S02. Further edits/approvals use the normal governed site workflow. No additional PDF review is required.

Chapter II now has 58 authored questions: 56 approved practice plus two assessment drafts, with 66 active/four draft definitions and 17 published guides. The unchanged 96/32/64 = 192 target leaves 40/31/63 = 134 unauthored. S02 retains ten unfilled assessment slots (three diagnostic, seven mastery), and zero assessment questions are approved/eligible. Option B delivery, scoring, readiness and attempts are unchanged. No pool/form, exposure, model/policy binding or release row changed; chapter activation, source/outcome/protected-use review, empirical/SME/model/pilot gates, the older illustration audit and two S09 follow-ups remain open.

[Staging and site-review handoff](chapter-ii-s02-draft-staging.md) · [Committed comparison matrix](chapter-ii-s02-accepted-comparison.md) · [Sanitized evidence](evidence/sprint-15b13-s02-draft-staging-20261008.json).

## Sprint 15B.13O — S02 saved reviews verified; editorial follow-up — 2026-10-08 UTC

**Verified human review:** After John reported done, readback confirms D01 and M01 approved/published at user-edited v2, with their existing current-version technical QA passing and all four new misconception definitions active. Immutable content projections and family fingerprints match; seven semantic mappings are unchanged. Twenty-nine complete tables and all rows outside the reviewed records in nine changed tables are preserved. This verification performed zero production writes and created no duplicate QA or human approval.

The v2 source/comparison review retains the earlier scenario/inference distinctions. D01’s revisions remain within the explicit model task. M01 gained explanatory examples in one response, creating an avoidable option-detail cue. **Recommended next correction:** remove that parenthesis through a new governed version with QA and human review; preserve v2/history. This is an editorial risk judgment, not a demonstrated effect on learner scores. The approved text is unchanged. After that follow-up, assess one source-backed direct experimental-evidence diagnostic partner against the whole current/historical/teaching/protected bank; no new candidate is yet authored or promised.

Chapter II now has 58 content-approved questions (56 practice, one diagnostic, one mastery), 70 active definitions and 17 published guides. There are still 134 unauthored toward the unchanged 192 target; S02 has three diagnostic and seven mastery gaps. Content publication does not activate the draft chapter or allocate assessments. Option B delivery, scoring, readiness and attempt limits remain unchanged. The M01 editorial follow-up, source/outcome/protected-use and empirical evidence, SME/model/pilot/release gates, older illustration audit and both S09 follow-ups remain open.

[Review verification and next step](chapter-ii-s02-review-readback.md) · [Sanitized evidence](evidence/sprint-15b13-s02-review-readback-20261008.json).

### 15B.13O owner decision — retain M01 v2 — 2026-10-08

At 10:32:04 Armenia time (06:32:04 UTC), John replied **“let’s keep it”** to the proposed parenthesis removal. Keep the approved M01 v2 exactly as saved; close **S02-M01-OPTION-CUE** by explicit owner retention. Preserve the original editorial observation and approved history. No question, version, QA, approval, allocation or release state is changed, and no additional review is required merely to keep the existing version.

The next bounded step is assessment of one source-backed direct experimental-evidence diagnostic partner for S02 against the whole bank. The retention decision removes the proposed wording revision from that sequence; it does not establish new content, protected-use/empirical validity or a full feasible reserve. All targets, inventory counts, readiness/scoring/attempt rules, remaining source/SME/model/pilot/release gates and S09 follow-ups are unchanged.

[Owner retention decision](evidence/sprint-15b13-s02-m01-retain-decision-20261008.json).


## 15B.13P — Cross-skill assessment batch 01 — 2026-10-08

Cross-skill assessment batch 01 (15B.13P) is staged for Content Reviewer review: eight candidates across S03–S09 were assessed, three mastery drafts qualify (S04/S07/S08), and five redundant candidates were omitted. John authorized 6–8 candidates per batch with unchanged quality, direct reviewer staging and one consolidated checkpoint. All three drafts pass current-version technical QA. Chapter II now has 61 authored questions: 58 approved (56 practice, one diagnostic, one mastery) plus three mastery drafts; 70 active and six draft definitions; 17 published guides; 131 unauthored toward 192. S02 M01 v2 remains unchanged by owner decision. No diagnostic candidate qualified in this batch; diagnostic/remaining bank gaps, all assessment/model/SME/release gates and both S09 follow-ups remain open. Chapter II remains unreleased and unallocated. See [batch 01 comparison and handoff](chapter-ii-assessment-batch-01.md).

The protected comparison includes 318 current items, 167 immutable versions and current/historical guidance. Source and 38-table freshness/preservation guards passed; a production-schema rollback rehearsal and deployed-evaluator replay verified the three candidates before additive staging. Exact protected text stays in the reviewer workspace and private audit. Six draft definitions require review. Counts are planning inventory, not empirical validity or release authorization. The remaining 131 unauthored comprise 40 practice, 31 diagnostic and 60 mastery slots. This workflow supersedes the previous one-candidate handoff sequence without changing the bank plan. [Production evidence](evidence/sprint-15b13-assessment-batch-01-20261008.json).

## 15B.13Q — Cross-skill assessment batch 02 — 2026-10-08

Cross-skill assessment batch 02 (15B.13Q) is staged for Content Reviewer review: eight candidates across seven skills were assessed; one diagnostic (S08) and two mastery drafts (S03/S09) qualify, and five redundant candidates were omitted. Batch-01 review is complete: all three unchanged v1 questions are approved and all six definitions active. The three new drafts pass current-version technical QA. Chapter II now has 64 authored questions: 61 approved (56 practice, one diagnostic, four mastery) plus three drafts; 76 active and six draft definitions; 17 published guides; 128 unauthored toward 192 (40 practice, 30 diagnostic, 58 mastery). S02 M01 v2 remains unchanged by owner decision. All assessment/model/SME/release gates and both S09 follow-ups remain open. Chapter II remains unreleased and unallocated. See [batch 02 comparison and handoff](chapter-ii-assessment-batch-02.md).

The protected comparison covers 321 current items, 170 immutable versions, 99 families/templates and current/historical guidance, including the newly approved batch-01 questions. The pre-staging comparison was committed remotely before the guarded additive transaction. Production-schema rollback, exact specification/snapshot readback and deployed-v11 evaluator replay pass; staging preserves every prior row and final table counts/fingerprints confirm exact additions. All three mappings are derived supporting evidence for existing outcomes; they do not independently certify the complete outcomes. Six new definitions require review, filtered by S03/S08/S09. The 6–8-candidate workflow continues without lowering quality or treating the count as a drafting quota. No guide, learner allocation or release change was added. [Production evidence](evidence/sprint-15b13-assessment-batch-02-20261008.json) · [Batch-01 review verification](evidence/sprint-15b13-batch-01-review-complete-20261008.json).

## 15B.13R — Cross-skill assessment batch 03 — 2026-10-08

Cross-skill assessment batch 03 (15B.13R) is staged while John defers batch-02 review. Eight candidates across all eight active Chapter II skills were assessed; S04-M02 mastery and S09-D01 diagnostic qualify, and six concepts were omitted for overlap or source limits. Both new drafts pass current-version technical QA. The private eight-profile comparison was saved and its bound public inventory committed before staging. Chapter II now has 66 authored questions: 61 approved plus five drafts; 76 active and eleven draft definitions; 17 published guides; 126 unauthored toward 192 (40 practice, 29 diagnostic, 57 mastery). The pending queue is five questions and eleven definitions across batches 02–03. All earlier approvals, S02 M01 v2 owner retention, both S09 follow-ups and assessment/model/SME/release gates remain unchanged. Chapter II remains unreleased and unallocated. See [batch 03 comparison and handoff](chapter-ii-assessment-batch-03.md).

The comparison covers 324 current items, 173 immutable versions, 102 families/templates and current/historical guidance, including every pending batch-02 question. All eight private profiles have durable pre-staging artifact/member hashes; both staged specifications bind exact immutable v1 records. Production-schema rollback, fresh locked guards, exact specifications/snapshots and deployed-v11 evaluator replay pass. Staging preserves every prior row; final readback verifies exact additions across twelve tables and 26 unchanged tables. The two mappings remain derived supporting evidence, with no whole-outcome mastery claim. Five new definitions require eventual review. Deferring review does not approve drafts or change learner eligibility. The 6–8-candidate workflow and 192-question target remain unchanged. [Production evidence](evidence/sprint-15b13-assessment-batch-03-20261008.json).


## 15B.13S — Cross-skill assessment batch 04 — 2026-10-08

Cross-skill assessment batch 04 (15B.13S) is staged after verifying all five edited batch-02/03 questions approved and all eleven definitions active. Eight candidates across all eight active skills were assessed; one S03 mastery candidate qualifies and seven concepts were omitted. The new draft passes current-version technical QA. The private eight-profile archive and bound comparison commit preceded staging. Chapter II now has 67 authored questions: 66 approved plus one draft; 87 active and two draft definitions; 17 published guides; 125 unauthored toward 192 (40 practice, 29 diagnostic, 56 mastery). The pending queue is one question and two definitions, all S03. Prior approvals/history, S02 M01 retention, both S09 follow-ups and assessment/model/SME/pilot/release gates are preserved. A nonblocking punctuation/conjunction follow-up for human-edited S09 M01 v2 is recorded without changing its approval. Chapter II remains unreleased and unallocated. See [batch 04 comparison and handoff](chapter-ii-assessment-batch-04.md).

[Verified staging and preceding review evidence](evidence/sprint-15b13-assessment-batch-04-20261008.json).

## 15B.13S follow-up — S03-M02 verbal wording correction — 2026-10-08

S03-M02 wording correction (15B.13S follow-up) is saved as v2 / draft / needs_review after John's screenshot showed a misleading reference to a picture. The text now explicitly describes a group and asks for counts; no image is required. Data, choices, key, reasoning and mappings are unchanged; v1 history is preserved. Guarded comparison, exact saved snapshot and current-version technical QA pass. No additional question or coverage is claimed. Chapter II remains 67 authored = 66 approved + one draft, 87 active/two draft definitions and 17 published guides; 125 unauthored toward 192. All earlier approvals and release/SME/pilot gates remain intact. See [wording correction evidence](chapter-ii-s03-m02-wording-correction.md).

## 15B.13T — Cross-skill assessment batch 05 — 2026-10-08

Cross-skill assessment batch 05 (15B.13T) is staged after verifying S03-M02 v2 approved and both definitions active. Eight candidates across all eight active skills were assessed; one S05 mastery application candidate qualifies and seven concepts were omitted. The new task applies the textbook three-trial data-reduction procedure while preserving the measured quantity's meaning; existing qualitative motion teaching is acknowledged overlap. The archived exact specification, production snapshot and current-version technical QA pass. Private comparison and its reachable commit preceded staging. Chapter II now has 68 authored questions: 67 approved plus one draft; 89 active and two draft definitions; 17 published guides; 124 unauthored toward 192 (40 practice, 29 diagnostic, 55 mastery). The pending queue is one question and two definitions, all S05. Prior approvals/history, S02 retention, all S09 follow-ups and assessment/model/SME/pilot/release gates remain intact. Chapter II stays draft, inactive and unallocated. See [batch 05 comparison and handoff](chapter-ii-assessment-batch-05.md).

[Verified staging and preceding review evidence](evidence/sprint-15b13-assessment-batch-05-20261008.json).

### Sprint 15B.13U — Reopen S04/S09 assessment candidates

**Status: staged; human review pending.** John explicitly reopened B05-C03/B05-C08 after the exclusion recheck. The dated supplement preserves original decisions and archives while superseding these two dispositions. Shared methods alone do not establish equivalence: S04 requires repairing invalidated magnification metadata; S09 requires own-calibration comparison despite misleading raw heights. Both are source-backed derived-supporting transfer candidates, not entire-outcome certification.

[S04-M03](https://www.haiedu.am/content-item.html?id=85376508-614f-45e0-b9d4-868a9be82987&from=review) and [S09-M02](https://www.haiedu.am/content-item.html?id=a5ccbcec-5e9c-4829-8892-dd9a724ce4c3&from=review) are v1 drafts; four new definitions await review under S04/S09 on [Misconceptions](https://www.haiedu.am/content-misconceptions.html). Exact saved content/snapshots/mappings and current-version technical QA pass. S05-M01 and its two definitions are reviewed. Current Chapter II:70 authored=68 approved+two drafts;91 active+four draft definitions;17 guides;122 unauthored toward192 (40/29/53). Chapter remains inactive/unallocated and every release gate remains.

[Comparison](chapter-ii-assessment-batch-05-reopened.md) · [Production evidence](evidence/sprint-15b13-reopened-s04-s09-20261008.json) · [Full version inventory](evidence/sprint-15b13-reopened-s04-s09-inventory-20261008.json).

### Sprint 15B.13V — Expanded twelve-candidate cross-skill batch

**Status: staged; human review pending.** John requested continued questions in larger batches. Twelve candidates were compared with the complete fresh current/historical bank, related skills, guides, releases and protected content; all 66 within-batch pairs were considered. Eight survived: seven practice questions across S03–S09 and one S09 mastery candidate. Six useful practice variants are counted separately from two new reasoning candidates. Three redundant protected tasks were omitted; a fourth remains a potential practice variant, not a blanket rejection for sharing a formula. Source exposure for the textbook-based mastery candidate is explicitly acknowledged.

Eight exact v1 drafts, seven separate draft practice guides and twelve draft definitions are saved. Current-version QA and deployed guide-validation replay pass; no human approval is synthesized. Prior S04-M03/S09-M02 v1 reviews and four definitions are complete. Chapter II has78 authored=70 approved+8 drafts;63/3/12 by bank;95 active+12 draft definitions;17 published+7 draft guides;114 unauthored toward192 (33/29/52). Review on the [site queue](https://www.haiedu.am/content-review.html), [Guides](https://www.haiedu.am/content-guides.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html). All learner/release/SME gates and prior follow-ups remain.

[Comparison and review links](chapter-ii-assessment-batch-06.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-06-20261009.json) · [Full version inventory](evidence/sprint-15b13-assessment-batch-06-inventory-20261009.json).

### Sprint 15B.13W — Twelve-candidate batch with nine retained drafts

**Status: staged; human review pending.** John confirmed the previous review and continued the larger-batch workflow. Fresh production verifies all eight batch06 approvals (including edited S04-I08/S06-I07 v2), twelve active definitions and seven published guides with exact snapshots. The current-version QA provenance remains two human-run v2 records and six actor-null technical v1 records; no approval or human QA was manufactured.

Twelve candidates were compared against the complete fresh current/historical bank, related skill mappings, guides, releases and protected content, including all 66 within-batch pairs. Nine were retained: eight explicitly useful practice variants across S03–S09 and one S09 mastery reasoning candidate. Two repeated candidates were omitted and one deferred because its atom-color interpretation lacks a sufficient source/outcome basis. Shared arithmetic alone is not a rejection or novelty criterion. Numeric targets do not authorize padding or certify feasibility.

Nine exact v1 drafts, eight draft practice guides and fifteen draft definitions are saved; current-version technical QA and deployed-guide validation replay pass with zero errors/warnings. The saved private comparison archive and reachable comparison commit preceded guarded staging. All pre-existing rows were preserved: fifteen additive tables and 23 unchanged. No schema/runtime/auth/learner/release change is included. Chapter II has87 authored=78 approved+9 drafts;71/3/13 by bank;107 active+15 draft definitions;24 published+8 draft guides;105 unauthored toward192 (25/29/51). Practice counts are12/10/10/8/8/7/8/8 for S02–S09. Review on the [site queue](https://www.haiedu.am/content-review.html), [Guides](https://www.haiedu.am/content-guides.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html). All existing follow-ups and human/SME/pilot/release gates remain.

[Comparison and individual links](chapter-ii-assessment-batch-07.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-07-20261009.json) · [Full version inventory](evidence/sprint-15b13-assessment-batch-07-inventory-20261009.json).

### Sprint 15B.13X — Twelve-candidate batch with nine retained drafts

**Status: staged; human review pending.** John confirmed the preceding review under the ongoing larger-batch workflow. Fresh production verifies all nine batch07 human approvals, including five edited v2 questions, fifteen active definitions and eight published guides. Current-version QA provenance remains five human-run v2 records and four prior actor-null technical v1 records. No approvals were synthesized.

Twelve candidates were assessed against the complete fresh current/historical corpus, related skill mappings, guides, releases and protected banks, including all 66 within-batch pairs. Nine were retained across six skills: eight declared practice variants and one new reasoning mastery candidate. Two repeated candidates were omitted and one protected inventory alternative deferred. No existing question was dropped. Shared arithmetic is neither an automatic rejection nor a novelty criterion; numerical targets do not authorize padding or certify feasibility.

Nine exact v1 drafts, eight draft guides and thirteen draft definitions are saved. Current-version technical QA and deployed-helper validation replay pass with zero errors/warnings. The immutable private archive and reachable comparison commit preceded staging. Existing rows were preserved, with fifteen additive tables and 23 unchanged. Chapter II has 96 authored=87 approved+9 drafts;79/3/14 by bank;122 active+13 draft definitions;32 published+8 draft guides;96 unauthored toward192 (17/29/50). Practice counts are12/11/12/9/9/7/9/10 for S02–S09. Review on the [site queue](https://www.haiedu.am/content-review.html), [Guides](https://www.haiedu.am/content-guides.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html), filtered by S03/S04/S05/S06/S08/S09. Routine user handoffs omit archive links per John’s preference.

S09-I08 published guide strategy copyedit “բանաձը” → “բանաձևը” is newly recorded for the versioned guide-review workflow. Preserve all earlier S09-I06/S09-M01 issues, S02-M01 owner retention, Sprint 16.5 before formal pilot and rollover-summary reconciliation. No schema/runtime/auth/learner/release/model/scoring change is included; all human/SME/pilot/release gates remain.

[Comparison and individual links](chapter-ii-assessment-batch-08.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-08-20261009.json) · [Full version inventory](evidence/sprint-15b13-assessment-batch-08-inventory-20261009.json).


### Sprint 15B.13Y — Next batch staged while review is deferred

**Status: staged; combined human review pending.** The owner authorized preparation of the next batch without requiring completion of the previous queue. Fresh pre-staging data showed 96 questions, 89 content-approved and seven still awaiting review. The quoted batch07 handoff is historical; recorded approvals and the owner's unfinished personal review are distinguished, and no approval is inferred from continuation.

Twelve candidates were assessed against the frozen current/historical bank, related skills and guide exposure, with all 66 within-batch pairs recorded. Nine were retained: eight declared practice variants across S03/S05/S06/S07/S08/S09 and one protected mastery candidate. Two proposed candidates were omitted and one protected alternative deferred. No existing question was dropped.

Nine exact v1 drafts, eight draft guides and fifteen draft definitions are staged. Exact immutable snapshots/mappings, current family-fingerprint technical QA and deployed-guide validation replay pass with zero errors/warnings. The private comparison archive and reachable comparison commit preceded staging. Prior records were preserved across fifteen additive and 23 unchanged tables. These are local deployed-code replays, not authenticated live Edge/browser acceptance.

The 2026-10-10 10:13:16 UTC observation is **105 authored = 89 content-approved + 16 pending**, with 87 practice, three Diagnostic and 15 protected Mastery items. The combined review queue has **16 questions, 16 guides and 28 definitions**. There are 87 unauthored toward192 (9 practice/29 Diagnostic/49 Mastery); counts do not establish feasibility or independent coverage. Chapter II remains draft, inactive, unallocated and subject to all existing gates. The authoritative current inventory is maintained only in [project status](project-status.md).

Review together on [Questions](https://www.haiedu.am/content-review.html), [Guides](https://www.haiedu.am/content-guides.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html), filtering Chapter II and pending/draft status. Existing S09 versioned editorial follow-ups remain; the rollover-summary reconciliation stays closed. No schema/runtime/API/auth/model/scoring or learner-delivery change is included.

[Comparison and individual links](chapter-ii-assessment-batch-09.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-09-20261010.json) · [Full version inventory](evidence/sprint-15b13-assessment-batch-09-inventory-20261010.json).


### Sprint 15B.13Z — Final batch before combined human review

**Status: staged; new question authoring paused for combined review.** The owner authorized one more batch while the prior queue remained unfinished. Eight candidates were assessed across S05–S09 against the fresh current/historical bank, related skills, guide exposure and all 28 within-batch pairs. Six intentional practice variants were retained; two proposed protected candidates were omitted for complete-chain overlap. No existing question is dropped, and no independent new reasoning coverage is claimed for these practice variants.

Six exact v1 draft/needs-review questions, six draft guides and eight draft definitions are staged. Immutable snapshots/mappings and current-family technical QA match the exact specifications. Replays of the exact deployed evaluator and guide helper pass with zero errors/warnings; they are not authenticated live Edge/browser acceptance. The saved private archive and reachable comparison commit preceded guarded staging. Existing rows were preserved across 15 additive and 23 unchanged tables.

At 2026-10-10 10:49:36 UTC, Chapter II has **111 authored = 89 content-approved + 22 pending**, with 93 practice, three Diagnostic and 15 protected Mastery questions. The combined queue is **22 questions, 22 guides and 36 definitions**. Eighty-one questions remain unauthored toward192: three practice, 29 Diagnostic and 49 Mastery. These are planning gaps, not an instruction to pad or proof that every slot is defensible.

Review together on [Questions](https://www.haiedu.am/content-review.html), [Guides](https://www.haiedu.am/content-guides.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html), filtered to Chapter II and pending/draft status across S03–S09. Current counts and gates belong to the [status register](project-status.md). Existing approvals, S09 versioned editorial follow-ups, the closed rollover-summary reconciliation and all SME/pilot/assessment/release gates remain intact. Chapter II remains inactive and unallocated. No schema/runtime/API/auth/model/scoring change is included.

[Comparison and individual links](chapter-ii-assessment-batch-10.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-10-20261010.json) · [Full version inventory](evidence/sprint-15b13-assessment-batch-10-inventory-20261010.json).


### Sprint 15B.13AA — Larger batch after completed combined review

**Date: 2026-10-11.** The owner completed the accumulated review and asked to proceed in larger batches. The production baseline verified all **111 prior questions approved, 54 guides published and 158 definitions active**, including current human wording edits. Batch 11 assessed **16 candidates across S02–S09** and staged **11 v1 drafts: 5 Mastery, 3 Diagnostic and 3 Practice**. Three S07 guides and eight definitions remain draft. Five candidates were omitted before staging for existing complete-solution overlap or untaught statistical procedure; no existing question was removed. The three practice additions are explicit rehearsal variants; eight protected candidates add judged source-supported reasoning demands, subject to human and SME review.

Whole-bank comparison includes 371 current items, 241 immutable versions, current/historical guides and related mappings, plus all 120 within-batch pairs. Exact private evidence was saved and the comparison commit made reachable before guarded staging. The rollback restored all 38 guarded tables. Committed readback, immutable snapshots and mappings matched the specifications; exact deployed quality-helper replay passed 11/11 and guide validation 3/3 without errors or warnings. Eleven actor-null technical QA records were stored with current family fingerprints; these are not human approvals or authenticated browser/Edge tests.

At 18:59:18 UTC, Chapter II has **122 authored questions: 111 approved and 11 pending** (96 Practice, 6 Diagnostic, 20 Mastery), **54 published + 3 draft guides**, and **158 active + 8 draft definitions**. The practice planning count is authored; the protected planning shortfall is 26 Diagnostic + 44 Mastery. Counts do not authorize padding or establish that the remaining target is feasible. Chapter II remains draft, inactive and unallocated; all Option B delivery/scoring, SME, pilot and release gates remain unchanged. The current S08-M02 distractor-A wording duplication joins the recorded versioned editorial follow-ups.

[Batch decision and verification](chapter-ii-assessment-batch-11.md) · [Sanitized comparison inventory](evidence/sprint-15b13-assessment-batch-11-inventory-20261011.json) · [Committed production evidence](evidence/sprint-15b13-assessment-batch-11-20261011.json). The [project status register](project-status.md) remains authoritative.

**Batch 11 reviewability correction:** PR #187 review requested a readable committed comparison record alongside the hashes. The [sanitized matrix](chapter-ii-assessment-batch-11-comparison.md) now records all 16 source/nearest-match decisions and 120 pair comparisons without protected stimuli or solutions. It was added after staging; the exact private matrix was already frozen before staging. Content and production rows are unchanged.

### Sprint 15B.13AB — Protected batch after all prior reviews

**Date: 2026-10-12 (Asia/Yerevan).** The owner completed all prior reviews and authorized the next large batch. The production baseline confirmed all **122 prior current question versions approved, 57 guides published and 166 definitions active**. Batch 12 assessed **16 candidates across S02–S09** and staged **nine v1 drafts: four Diagnostic and five Mastery**, with **twelve draft misconception definitions**. Four proposals repeated existing complete reasoning chains and three required untaught assumptions; those seven proposals were omitted before staging. No existing question was removed or changed. The practice planning count remains 96, all approved.

Whole-bank comparison covers 382 current items, 254 immutable versions, current/historical guides and related mappings, plus all 120 candidate pairs. Exact private evidence and the readable sanitized matrix were saved before staging; comparison commit `a1a1d0c00e21a009af3fbd1e7c42eb219e700adb` was reachable before the guarded transaction. The rollback restored all 38 guarded tables. Committed readback matched every specification, immutable snapshot and mapping; existing records were preserved across 12 additive and 26 unchanged tables. Exact deployed quality-evaluator replay passed **9/9 with zero errors or warnings** on both rehearsal and committed catalogues. Nine actor-null technical QA records carry current version/family fingerprints; this is not human approval or authenticated live Edge/browser acceptance.

At **2026-10-11 20:35:36 UTC**, Chapter II has **131 authored questions: 122 approved and nine pending** (96 Practice, 10 Diagnostic, 25 Mastery), **57 published guides**, and **166 active plus twelve draft definitions**. The review queue is **nine questions and twelve definitions** on the [Questions](https://www.haiedu.am/content-review.html) and [Misconceptions](https://www.haiedu.am/content-misconceptions.html) pages. The remaining planning shortfall is 22 Diagnostic and 39 Mastery; these counts do not establish feasibility or authorize padding. Chapter II remains draft, inactive and unallocated; Option B delivery/scoring, external SME, pilot and release gates remain unchanged.

[Batch decision and review links](chapter-ii-assessment-batch-12.md) · [Readable comparison matrix](chapter-ii-assessment-batch-12-comparison.md) · [Committed production evidence](evidence/sprint-15b13-assessment-batch-12-20261012.json). The [project status register](project-status.md) remains authoritative. The earlier reviewer-button repair is verified live on merged source `7036dd00e9136053d9cc8f2766fa923895498f20`; no schema, shared runtime, API, UI, authorization or scoring change is included in this content batch.


**Batch 12 review closure — 2026-10-12 (Asia/Yerevan):** the next fresh baseline confirmed all 131 current questions approved, 57 guides published and 178 definitions active. The prior queue is closed; its dated counts above are retained as history.

### Sprint 15B.13AC — Batch 13 and protected-coverage checkpoint

**Date: 2026-10-12 (Asia/Yerevan).** The owner completed the previous review and authorized continuation. Batch 13 assessed 16 leads across S02–S09 and staged **five protected v1 questions: three Diagnostic and two Mastery**, plus **ten draft definitions**. Eight proposals repeated existing full reasoning and three required untaught science; those eleven were omitted before staging. No existing item was removed or revised. No new guides are needed.

Comparison covers 391 current items, 264 immutable versions, current/historical guides, related mappings and all 120 candidate pairs. The private exact archive and readable sanitized matrix preceded production staging; comparison commit `51a9fe293384635f250be70a50d8575cac600560` was reachable before the guarded transaction. Rehearsal restored all 38 table hashes. Committed specifications/snapshots/mappings match; all pre-existing rows were preserved across 12 additive and 26 unchanged tables. Exact deployed evaluator replay passed 5/5 with zero errors/warnings in both catalogues; five actor-null QA records store current-version/family evidence. This is technical QA, not authenticated live browser/Edge or human approval.

At **2026-10-11 21:34:59 UTC**, Chapter II has **136 questions: 131 approved and five pending** (96 Practice, 13 Diagnostic, 27 Mastery),**57 published guides**, and **178 active plus ten draft definitions**. Review the five questions and ten definitions on the site. The nominal gap is 56 questions (19 Diagnostic, 37 Mastery); it does not establish feasible independent coverage. **Next proposed part is a source/coverage feasibility checkpoint and owner bank-plan decision before further count-led expansion.** S07 still has zero Diagnostic and one Mastery item; current drafts included, the per-skill gap to one pair-per-skill form is five Diagnostic and one Mastery. No 192 target, 16-question assessment length, 13/16 threshold, per-skill rule or release gate changes.

[Batch and review links](chapter-ii-assessment-batch-13.md) · [Comparison](chapter-ii-assessment-batch-13-comparison.md) · [Production evidence](evidence/sprint-15b13-assessment-batch-13-20261012.json) · [Concrete bank-plan checkpoint](chapter-ii-bank-plan-checkpoint.md). Chapter II remains draft, inactive and unallocated. Human content/SME, model, pilot and release gates remain open. No schema, runtime, API, UI, authorization or scoring change is included. The [project status register](project-status.md) is authoritative.


### Sprint 15B.13AD — Completed coverage audit and concrete bank-plan decision

**Date: 2026-10-12 (Asia/Yerevan).** The owner completed Batch 13 review and authorized the prepared next part. Fresh production records at **07:07:55 UTC** confirm all **136 current questions content-approved, 57 guides published and 188 definitions active**. The read-only audit inspected all current Chapter II questions and focused S07 guide exposure, carrying prior history/related-bank judgments only for unchanged evidence. The complete 28-table corpus was bracketed by matching 38-table guards through **07:20:00 UTC**. No production write or new batch was performed.

The audit separates taught-claim coverage from protected capacity. S07 has 12 Practice, 0 Diagnostic and 1 Mastery. The per-skill shortfall is **6** for one form of each purpose, **41** for two Diagnostic forms and three disjoint Mastery attempts without guaranteed spares (177 total, preserving S09's seventh Mastery), or **56** for the agreed 192 target. These are arithmetic bounds, not proven source-supported supplies. No universal source-exhaustion claim is made.

**Decision pending at the 15B.13AD checkpoint (subsequently resolved by the four-candidate authorization in 15B.13AE):** retain the 192 planning target while explicitly authorizing a prospective protected-parallel-variant feasibility pilot: eight candidate leads across S03/S05/S07/S08, targeting six immediate gaps. This is a documented proposal to change authoring disposition criteria, not an adopted policy, new approval or release waiver. Current whole-bank rules remain in force. The eight overlapping and three source-unsupported Batch 13 proposals were not automatically reopened; existing questions were not removed. The recorded editorial queue still requires versioned correction/review.

[Completed audit](chapter-ii-coverage-feasibility-audit.md) · [Concrete owner decision](chapter-ii-bank-plan-checkpoint.md) · [Current-version inventory and audit evidence](evidence/sprint-15b13-coverage-audit-20261012.json). Chapter II remains draft, inactive and unallocated. Option B, SME, governed model/policy binding, pilot and release gates are unchanged. The [project status register](project-status.md) remains authoritative.


### Sprint 15B.13AE — Four-candidate parallel-assessment pilot staged

**Subsequent review closure:** all four questions and five definitions were approved by the owner; see 15B.13AF below. The staging counts in this entry are historical.

**Owner authorization: 2026-10-12 11:42 Asia/Yerevan.** John selected exactly two S07 Diagnostic, one S07 Mastery and one S03 Diagnostic candidate, superseding the eight-/sixteen-candidate suggestions. The bounded subject-neutral `haiedu-protected-parallel-pilot-v1` addendum was committed before staging. It permits a repeated taught claim/procedure with a substantively new stimulus requiring fresh interpretation, with full source, history/within-batch comparison and protection evidence. It does not count variants as independent reasoning coverage or certify empirical equivalence.

All four candidates qualified for draft review; one answer was refined before staging. Four question drafts and five definition drafts were committed at **08:12:56 UTC**, following a clean rollback rehearsal and reachable comparison commit `e927db7a3bd13257b9fe562c6f63ef264785156f`. Separate readback matched exact specifications, immutable v1 snapshots and mappings. Exact deployed-v11 evaluator replay passed 4/4 in both phases, zero errors/warnings. Four actor-null QA records include current family fingerprints; 38-table guards verify 12 additive and 26 unchanged tables with all prior rows preserved.

At **08:13:45 UTC**, the bank contains **140 questions: 136 approved and four pending** (96 Practice, 16 Diagnostic, 28 Mastery), **188 active plus five draft definitions**, and **57 published guides**. Review on the site, filtered to S03/S07. No new learner guide exposes these protected solutions. The remaining target gap is 52; a single two-per-skill Diagnostic form still lacks S05/S08 capacity even if all drafts pass. No pool/form allocation or release activation was performed.

The four-candidate authoring/staging work is complete; human question/definition and SME/exposure review remain open. No broader rollout, reserve revision, prior-omission reinstatement or release approval is inferred. Wider use of this disposition requires the owner’s next decision. Repository CI/merge and the verified Notion source stamp complete the documentation handoff; they do not close content or release gates.

[Batch 14 handoff](chapter-ii-assessment-batch-14.md) · [Comparison](chapter-ii-assessment-batch-14-comparison.md) · [Committed evidence](evidence/sprint-15b13-assessment-batch-14-20261012.json) · [Owner decision](chapter-ii-bank-plan-checkpoint.md) · [Current status](project-status.md).

### Sprint 15B.13AF — First parallel pilot review verified; next scope prepared

**Date: 2026-10-12, 10:31 UTC (14:31 Asia/Yerevan).** John reported all review done. Read-only records confirm all four Batch 14 questions approved at current v1, with passing current-version QA, and all five definition records matching their latest human-approved snapshots. Across Chapter II, every one of 140 current questions has a matching human content approval; all 193 definitions are active and all 57 guides published. No content is pending. This verification created no production write, content version, approval or duplicate QA.

The first bounded pilot is complete for authoring and human content review, not external SME/exposure validation or empirical equivalence. The remaining 192-target gap is 52 (16 Diagnostic and 36 Mastery); S05 and S08 still each need one Diagnostic for a single two-per-skill form. Chapter II remains draft, inactive and unallocated.

**Concrete next recommendation, awaiting owner decision:** one S05 Diagnostic, one S08 Diagnostic and two S07 Mastery candidates, under the same bounded acceptance criteria. This prioritizes single-form Diagnostic coverage and S07 retake reserves. No second manifest or broader exception is adopted by this closure; no new questions were authored/staged. Existing Option B, readiness, scoring, lifecycle and release gates remain.

[Review closure evidence](evidence/sprint-15b13-batch-14-review-complete-20261012.json) · [Next proposed manifest](chapter-ii-bank-plan-checkpoint.md#second-authorized-manifest--batch-15) · [Authoritative status](project-status.md).

### Sprint 15B.13AG — Second four-candidate batch staged

**Subsequent review closure:** all four current v1 questions and six definitions received human approval; see 15B.13AH below. The staging counts in this entry are historical.

**Owner authorization: 2026-10-12 14:41:04 Asia/Yerevan.** John directed “Proceed with these four”: B15-C01 S05 Diagnostic, B15-C02 S08 Diagnostic, B15-C03 and B15-C04 S07 Mastery. All four qualified under `haiedu-protected-parallel-pilot-v1`; one was reworked within its original lead before staging. No extra candidate, prior-omission reinstatement or independent new reasoning claim is made.

Guarded staging committed at **11:06:14 UTC**, after the immutable private source/comparison archive and reachable comparison commit `78594df085a018026da07b83439a0cadf6bd0eed`. The comparison covers 400 current items, 273 immutable versions, complete guide history and all six within-batch pairs. The 38-table baseline was fresh and unchanged before staging. Rollback and committed byte-exact deployed-v11 evaluator replay passed 4/4, zero errors/warnings. Separate readback matched specifications, mappings and immutable v1 snapshots; four actor-null QA records bind current family fingerprints. Every prior row was preserved, with 12 additive and 26 unchanged tables.

At **11:07:12 UTC**, Chapter II contains **144 questions: 140 approved and four pending** (96 Practice, 18 Diagnostic, 30 Mastery), **193 active plus six draft definitions**, and **57 published guides**. Review the questions and definitions on the site, filtered to S05/S07/S08. No learner solution guides, pool/form allocation or release activation were created.

The unchanged 192 target leaves 48 unauthored: 14 Diagnostic and 34 Mastery. If approved, nominal single-form two-per-skill capacity is present; protected eligibility, disjoint reserves, empirical equivalence and release readiness remain unestablished. S07 has four authored Mastery questions, two pending; the three-attempt arithmetic floor is six. Further disposition use requires a subsequent owner decision. Repository CI/merge and a verified Notion source stamp complete the documentation handoff, not human or release approval.

[Batch 15 handoff](chapter-ii-assessment-batch-15.md) · [Comparison](chapter-ii-assessment-batch-15-comparison.md) · [Committed evidence](evidence/sprint-15b13-assessment-batch-15-20261012.json) · [Owner scope](chapter-ii-bank-plan-checkpoint.md#second-authorized-manifest--batch-15) · [Current status](project-status.md).

### Sprint 15B.13AH — Second parallel batch review verified; next scope prepared

**Date: 2026-10-12, 11:49 UTC (15:49 Asia/Yerevan).** John reported review done at 15:45:04 Asia/Yerevan. Read-only records confirm all four Batch 15 questions approved at current v1, with passing current-version QA, and all six definition records matching their latest human-approved snapshots. Across Chapter II, all 144 current questions have matching human content approvals; all 199 definitions are active and all 57 guides published. No content is pending. This verification created no production write, content version, approval or duplicate QA.

Both authorized bounded manifests are complete for authoring and human content review. External SME/exposure review, empirical equivalence, protected eligibility and learner release remain open. The retained 192-target gap is 48: 14 Diagnostic and 34 Mastery. Every skill now has nominal capacity for one two-question form of each purpose; S02, S05 and S06 each have only two approved Mastery questions. Chapter II remains draft, inactive and unallocated.

**Concrete next recommendation, awaiting owner decision:** four Mastery candidate slots—two S02, one S05 and one S06—under the same bounded acceptance criteria. This starts extending the three smallest Mastery reserves; chapter order breaks the tie for the fourth slot. Candidate qualification remains subject to fresh source/current/history/guide and within-batch comparison. No third manifest or broader exception is adopted by this closure; no new questions were authored or staged. Existing Option B, readiness, scoring, lifecycle and release gates remain.

[Review closure evidence](evidence/sprint-15b13-batch-15-review-complete-20261012.json) · [Next proposed manifest](chapter-ii-bank-plan-checkpoint.md#third-authorized-manifest--batch-16) · [Authoritative status](project-status.md).

### Sprint 15B.13AI — Third four-candidate batch staged

**Subsequent review closure:** all four current v1 questions and six definitions received human approval; see 15B.13AJ below. The staging counts in this entry are historical.

**Owner authorization: 2026-10-12 16:18:37 Asia/Yerevan.** John directed “proceed” with two S02 Mastery, one S05 Mastery and one S06 Mastery candidates. All four qualified provisionally under the bounded protocol. C03 was reworked within its original lead after source checking rejected an unsupported calculation and incorrect locator. No extra lead, reinstated omission or independent new reasoning coverage is claimed.

Guarded staging committed at **12:48:31 UTC**, after the frozen private comparison payload and reachable comparison commit `1d928f4e8bbce6be8520082449bbd8cf1b2a4257`. The full comparison covers 404 current items, 277 immutable versions, complete guide history and all six within-batch pairs. All 38 baseline guards matched immediately before staging. Rollback and committed byte-exact deployed-v11 evaluator replay passed 4/4, zero errors/warnings. Separate readback matched specifications, mappings and immutable v1 snapshots; four actor-null QA rows bind current family fingerprints. All prior rows were preserved, with 12 additive and 26 unchanged tables.

Automatic PR review later found the saved archive copy incomplete. Before merge, version 1 restored the original pre-staging ZIP byte for byte; materialized readback verified its original SHA-256 and all 63 entries. No candidate, judgment or production data changed. [Repair evidence](evidence/sprint-15b13-assessment-batch-16-archive-repair-20261012.json).

At **12:49:16 UTC**, Chapter II has **148 questions: 144 approved and four pending** (96 Practice, 18 Diagnostic, 34 Mastery), **199 active plus six draft definitions**, and **57 published guides**. Review questions and definitions on the site, filtered to S02/S05/S06. No new learner guide, pool/form allocation or release activation was created.

The unchanged 192 target leaves 44 unauthored: 14 Diagnostic and 30 Mastery. Authored Mastery reserves are S02: four, S05: three and S06: three, including pending drafts; each remains below the six-item arithmetic floor for three disjoint attempts. Protected eligibility, empirical equivalence and learner release remain separate gates. Further use of the bounded disposition needs another owner decision. Repository CI/merge and a verified Notion source stamp complete the documentation handoff, not human or release approval.

[Batch 16 handoff](chapter-ii-assessment-batch-16.md) · [Comparison](chapter-ii-assessment-batch-16-comparison.md) · [Committed evidence](evidence/sprint-15b13-assessment-batch-16-20261012.json) · [Owner scope](chapter-ii-bank-plan-checkpoint.md#third-authorized-manifest--batch-16) · [Current status](project-status.md).

### Sprint 15B.13AJ — Third parallel batch review verified; next scope prepared

**Date: 2026-10-12, 14:33 UTC (18:33 Asia/Yerevan).** John reported review done at 18:28:14 Asia/Yerevan. Read-only records confirm all four Batch 16 questions approved at current v1, with passing current-version QA, and all six definition records matching their latest human-approved snapshots. Across Chapter II, all 148 current questions have matching human content approvals; all 205 definitions are active and all 57 guides published. No content is pending. This verification created no production write, content version, approval or duplicate QA.

All three authorized bounded manifests are complete for authoring and human content review. External SME/exposure review, empirical equivalence, protected eligibility and learner release remain open. The retained 192-target gap is 44: 14 Diagnostic and 30 Mastery. S05 and S06 have the smallest approved Mastery reserves at three each; S02, S03, S07 and S08 each have four. Chapter II remains draft, inactive and unallocated.

**Concrete next recommendation, awaiting owner decision:** four Mastery candidate slots—one each for S05, S06, S02 and S03—under the same bounded acceptance criteria. This first extends the two smallest reserves; chapter order selects S02/S03 among the four-item reserves for the other two slots. Candidate qualification remains subject to fresh source/current/history/guide and within-batch comparison. No fourth manifest or broader exception is adopted by this closure; no new questions were authored or staged. Existing Option B, readiness, scoring, lifecycle and release gates remain.

[Review closure evidence](evidence/sprint-15b13-batch-16-review-complete-20261012.json) · [Next proposed manifest](chapter-ii-bank-plan-checkpoint.md#fourth-authorized-manifest--batch-17) · [Authoritative status](project-status.md).

### Sprint 15B.13AK — Fourth four-candidate batch staged

**Subsequent review closure:** all four questions and five definitions are human-approved; see 15B.13AL. The staging counts below are historical.

**Owner authorization: 2026-10-12 18:43:12 Asia/Yerevan.** John directed “I approve” with one Mastery candidate each for S05, S06, S02 and S03. All four qualified provisionally under the bounded protocol. No extra lead, reinstated omission or independent new reasoning coverage is claimed.

Guarded staging committed at **15:14:43 UTC**, after the private comparison archive was saved, freshly materialized and verified byte for byte, and comparison commit `00116b0181a7902466f47014e97f34043165ce6f` was reachable. The complete 28-table corpus contains 408 current items, 281 immutable versions and guide history. Fresh target-skill inspection covered all 70 current items, 28 differing historical versions, 25 current guides and 20 distinct historical guide texts, with 105 related prompt/key screens. All six within-batch pairs were compared; scope limitations are explicit in the evidence.

All 38 baseline guards matched immediately before staging. Rollback and committed byte-exact deployed-v11 evaluator replay passed 4/4, with zero errors/warnings. Separate readback matched specifications, mappings and immutable v1 snapshots; four actor-null QA rows bind current family fingerprints and match a fresh persisted read. Every prior row was preserved, with 12 additive and 26 unchanged tables. This replay is not authenticated live Edge/browser acceptance.

At **2026-10-12 15:15:45 UTC**, Chapter II has **152 questions: 148 approved and four pending** (96 Practice, 18 Diagnostic, 38 Mastery), **205 active plus five draft definitions**, and **57 published guides**. Review questions and definitions on the site, filtered to S02/S03/S05/S06. No learner guide, pool/form allocation or release activation was created.

The unchanged 192 target leaves 40 unauthored: 14 Diagnostic and 26 Mastery. Including drafts, S02/S03 have five Mastery items each and S05/S06 four each; all remain below the six-item arithmetic floor for three disjoint attempts. Protected eligibility, empirical equivalence and learner release remain separate gates. Further use of the bounded disposition needs another owner decision. Repository CI/merge and a verified Notion source stamp complete the documentation handoff, not human or release approval.

[Batch 17 handoff](chapter-ii-assessment-batch-17.md) · [Comparison](chapter-ii-assessment-batch-17-comparison.md) · [Committed evidence](evidence/sprint-15b13-assessment-batch-17-20261012.json) · [Owner scope](chapter-ii-bank-plan-checkpoint.md#fourth-authorized-manifest--batch-17) · [Current status](project-status.md).

### Sprint 15B.13AL — Batch 17 review verified

**2026-10-12 15:36:37 UTC (19:36 Asia/Yerevan).** All four current v1 Batch 17 questions have matching human content approvals and passing current QA; all five definitions match their approved active snapshots. Chapter II has 152 approved questions, 210 active definitions and 57 published guides, with nothing pending. This read-only verification created no approval, version or QA record. The target gap remains 40: 14 Diagnostic and 26 Mastery. [Review closure evidence](evidence/sprint-15b13-batch-17-review-complete-20261012.json).

### Sprint 15B.13AM — Fifth four-candidate batch staged

John directed “Done. reviewed. Proceed.” at 2026-10-12 19:34:33 Asia/Yerevan, authorizing the next four-candidate batch. Codex selected S05/S06/S07/S08 by the established smallest-reserve priority; John did not separately enumerate the skill names. All four qualified provisionally; no extra lead, reinstated omission or independent new reasoning coverage is claimed.

Guarded staging committed at **16:11:30 UTC**, after the private archive was saved, freshly materialized and verified byte for byte, and comparison commit `a7569320710cd68cbc7501f9935d4808a1910c7f` was reachable. The complete 28-table corpus contains 412 current items, 285 immutable versions and 474 guide-history records. All S07/S08 current items, differing versions and current/distinct historical guides were freshly inspected; prior S05/S06 substantive review was carried only under fresh exact continuity checks, including the unchanged approved Batch 17 additions. Related screening and image-inspection limits are explicit in the comparison. All six within-batch pairs were assessed. [PR review follow-up](evidence/sprint-15b13-assessment-batch-18-review-followup-20261012.json) adds fresh inspection of all 11 referenced image assets and source figure 33 after staging and before final handoff, preserving the original archive and its stated limitations. Current/historical hashes match; all four candidates remain provisionally qualified.

Rollback and committed replay of the freshly retrieved, byte-exact deployed-v11 evaluator passed 4/4 with zero errors/warnings. Separate production readback matched exact specifications, mappings and immutable v1 snapshots. Four actor-null QA rows bind current family fingerprints and match a fresh persisted read. All prior rows and approvals were preserved; 12 tables gained rows and 26 remained unchanged. This is evaluator replay through a read-only catalogue adapter, not authenticated live Edge/browser acceptance.

At **2026-10-12 16:12:15 UTC**, Chapter II has **156 questions: 152 approved and four pending** (96 Practice, 18 Diagnostic, 42 Mastery), **210 active plus six draft definitions**, and **57 published guides**. Review four Mastery questions and six misconception definitions on the site, filtered to **S05/S06/S07/S08**. No new guides require review. No learner guide, pool/form allocation or release activation was created.

The unchanged 192 target leaves **36 questions: 14 Diagnostic and 22 Mastery**. Including drafts, S02–S08 each have five Mastery items and S09 has seven. S02–S08 remain below the six-item arithmetic minimum for three disjoint two-question attempts. Counts do not establish protected eligibility, empirical equivalence or disjoint retake reserves. Human content/definition, SME/exposure, allocation and release gates remain; further scope needs another owner direction.

[Batch 18 handoff](chapter-ii-assessment-batch-18.md) · [Comparison](chapter-ii-assessment-batch-18-comparison.md) · [Committed evidence](evidence/sprint-15b13-assessment-batch-18-20261012.json) · [Owner scope](chapter-ii-bank-plan-checkpoint.md#fifth-authorized-manifest--batch-18) · [Current status](project-status.md).

### Sprint 15B.13AN — Batch 18 review resolved; one question archived

**2026-10-12 18:35:04 UTC (22:35 Asia/Yerevan).** Current human approvals and passing QA are verified for S05-M05 v2, S06-M05 v1 and S08-M05 v1. John archived S07-M05 v1 at 22:28 Asia/Yerevan because the question did not make sense. It has no content approval; the archived record and earlier authoring/QA evidence are preserved. All six definitions match their approved active snapshots. [Review outcome evidence](evidence/sprint-15b13-batch-18-review-outcome-20261012.json).

Chapter II has **155 approved non-archived questions: 96 Practice, 18 Diagnostic and 41 Mastery**, plus **one archived historical question**, **216 active definitions**, and **57 published guides**. There is no pending non-archived content. The 156 retained records include the archived question; the unchanged 192 capacity target is therefore short by **37: 14 Diagnostic and 23 Mastery**. S07 has four approved Mastery questions; S02/S03/S04/S05/S06/S08 have five each and S09 seven.

**Gate at this checkpoint (subsequently closed for the author comparison by 15B.13AO below):** S05-M05 was edited to v2 before human approval. Read-only snapshot comparison finds the prompt and four options rephrased, with the numeric observations, keyed answer, solution steps and distractor inferences preserved; current content matches immutable v2. The evidence records both content SHA-256 fingerprints. The committed specification/comparison still binds v1, so full applicable bank/history/guide-exposure, related-mapping, source and within-batch comparison must be refreshed for v2 before protected qualification or allocation. Human approval remains valid as a recorded content decision. The 155-question count and 37-question gap describe nominal inventory, not certified protected capacity.

The author accepts the clarity/assessment failure: the abstract mixing endpoint and awkward observation record obscure the physics, while adding a second causal judgment. Structural QA and a consistent intended inference do not substitute for question quality. No restoration, replacement, new batch, production mutation or automatic approval was performed. SME/exposure, allocation and release gates remain open; Chapter II remains draft, inactive and unallocated.


### Sprint 15B.13AO — S05-M05 v2 comparison and Armenian/source check

**Version comparison refreshed — 2026-10-12 19:30 UTC:** the [S05-M05 v2 comparison refresh](chapter-ii-s05-m05-v2-comparison.md) binds the approved immutable v2 and the current bank. Full S05 current/history/guide comparison, full related current/history/guide comparison, related mappings, source and all six Batch 18 pairs were assessed. Retain v2 as a protected parallel assessment variant, with zero independent new reasoning coverage. No blocking Armenian or physics issue was found; the approved wording and human approval are preserved. The prior v1 specification remains historical provenance. This closes the version-specific author comparison only; SME/exposure, disjoint allocation, empirical qualification and release remain open. The 155-question inventory and nominal gap of 37 are unchanged.

The frozen corpus contains 416 current questions, 290 immutable question versions and 474 guide-history records. The fresh S05 review covers 19 current questions, 23 immutable versions, eight current guides and six additional distinct historical guide texts across 49 records. All 90 related current questions with full options, 60 related immutable versions and 107 related guide-history records were also compared, including nine differing question versions and 14 additional distinct guide texts. All six within-batch pairs were compared. All 38 table guards remain identical through 19:30:40 UTC. The restricted comparison archive was saved and freshly materialized with identical SHA-256, ZIP CRCs and all 33 member hashes verified. Automated PR review identified the initial related-screening gap; the full related comparison closes it in a companion archive with all 14 member hashes verified. [Sanitized evidence](evidence/sprint-15b13-s05-m05-v2-comparison-20261012.json).

The applicable textbook was checked for terminology, taught physics and diagrams. The approved S05 wording is retained. Natural, age-appropriate Armenian is now explicit in the authoring instructions and policy. A mixed-script token found in one existing related guide is recorded for versioned correction/review; its approval was not overwritten. S07-M05 stays archived. No new candidate, production content change, runtime change, allocation or release activation was performed.

### Sprint 15B.13AP–AQ — Final two batches drafted to the retained target

**2026-10-13 Asia/Yerevan · authoring/staging/technical QA complete; human review pending.** John explicitly directed all remaining questions in two batches, superseding the earlier four-candidate cadence. [Batch 19](chapter-ii-assessment-batch-19.md) contains 19 questions and 24 definitions; [Batch 20](chapter-ii-assessment-batch-20.md) contains 18 questions and 23 definitions. All 37 questions passed exact source-version/family QA, saved-snapshot and post-commit readback checks. Both private comparisons were saved and verified before the reachable comparison commit; all 666 new pairs were assessed and two candidate slots reworked. No independent new reasoning coverage is claimed.

Chapter II has 96 Practice + 32 Diagnostic + 64 Mastery candidates, 192 non-archived total: 155 approved and 37 drafts. All eight skills reach 12/4/8 nominal inventory; the archived S07-M05 is an additional history record. There are 47 pending definitions and no new guides. Review on the Content Reviewer question and misconception pages. The 16-question Diagnostic, 16-question Mastery, 13/16 plus per-skill minimum, all-eight-skill readiness and three-attempt contract are unchanged. Content/SME/exposure qualification, allocation and release remain open; the release stays inactive and unallocated. [Production evidence](evidence/sprint-15b13-assessment-batches-19-20-production-20261013.json).

### Sprint 15B.13AR — Final two batches approved; target bank review complete

**2026-10-13 06:22:58 UTC (10:22 Asia/Yerevan).** John reported all review complete. Read-only production verification confirms all 37 final-batch questions approved at unchanged v1, with identical content/options/keys/mappings/immutable snapshots and zero current-QA errors/warnings. All 47 new definitions are active and exactly match their human-approved snapshots. Every one of the 192 current non-archived Chapter II questions has a matching human content approval.

The approved bank reaches 96 Practice + 32 Diagnostic + 64 Mastery, or 12/4/8 per skill, with zero nominal authoring or content-approval gap. There are 263 active definitions, 57 published guides and no pending content. S07-M05 remains an additional archived historical record. Existing comparison evidence remains applicable to the unchanged 37 v1 questions; no independent new reasoning coverage or empirical parallelism is inferred from approval.

**Next:** complete the recorded versioned editorial corrections, then independent source/protection/SME qualification, disjoint assessment allocation, policy/model binding, pilot and release gates. All 192 questions remain `provisional_no_sme_review`; Chapter II remains draft, inactive and unallocated with zero pool/form memberships. No production write, new QA record, approval or learner-runtime change was made by this closure. The assessment delivery/scoring/readiness contract remains unchanged.

[Review closure evidence](evidence/sprint-15b13-batches-19-20-review-complete-20261013.json) · [Authoritative status](project-status.md).

### Sprint 15B.13AR follow-up — Shared direct question-read protection

**2026-10-13 06:52 UTC (10:52 Asia/Yerevan).** Automated PR review flagged an assessment-access risk. Live evidence confirmed that the old published-item policy hid only questions already assigned to active protected pools; anonymous reads exposed 372 question rows, including all 37 final-batch questions. Options and answer keys were already blocked. The subject-neutral correction removes anonymous prompt reads and retains authenticated staff reads; student delivery remains through governed endpoints.

Production role probes confirm zero prompts/options/keys for anonymous, student and school-admin roles, with existing staff/service reads retained. Two isolated database/runtime regressions passed, including three curriculum contexts and inactive-release denial. All 38 content/evidence tables remain unchanged. No Edge/browser code, content approval or release was modified; the deployed change is the RLS policy and migration record.

Previous anonymous-role readability is confirmed, but third-party retrieval and historical non-exposure are unestablished. Record that exposure-risk disposition before protected assessment use. Content approvals stay valid; Chapter II remains inactive and unallocated. [Repair and scope](direct-question-read-protection-20261013.md) · [Production evidence](evidence/direct-question-read-protection-20261013.json).

### Sprint 15B.13AS — Recorded editorial corrections staged

**2026-10-13 07:32:50 UTC (11:32 Asia/Yerevan).** The next-part direction authorizes the recorded cleanup. S09-I06, S09-M01 and S08-M02 are saved as v3 / review / needs_review; the corresponding old v2 approvals and immutable snapshots remain. Three corrected guide drafts are authoring v5 over unchanged published runtime v2: S09-I05/I06, S09-I08 and S06-I09. Changes remove duplicated text/labels, correct two guide typos and remove one repeated worked-example scenario. No answers, misconception mappings or bank identities change; zero new coverage is claimed.

Whole-bank comparison covers all 48 S08/S09 and 188 related current questions, 109 applicable immutable versions through 15 distinct historical text deltas, 76 distinct guide texts and all three revision pairs. The textbook supports the retained physics. The private archive was saved and freshly read back with matching SHA-256, CRC and 42 member hashes before reachable comparison commit `590e42ba94afbaac69ca6c6656373d77b6c51925` and staging at 07:30:35 UTC. The rollback restored all 38 table guards. Committed readback matches exact specifications and snapshots. Deployed evaluator replay passes 3/3 questions, with three actor-null QA records; guide validation passes 3/3 across four variants. This is SQL/read-only-adapter verification, not new authenticated browser/HTTP acceptance.

Current bank: **192 non-archived questions, 189 approved current versions and three pending**, plus one archived historical record; **263 active definitions**, **57 published runtime guides and three draft guide revisions**. All old reviews/history and published guides are preserved. Final deltas are three changed item rows, two changed option rows, three new immutable snapshots, three new authoring drafts and three new QA rows; 33 other table fingerprints are identical. Chapter II remains draft, inactive and unallocated. Review the six corrected records on the site; historical exposure disposition, source/protection/SME qualification, disjoint forms, model/policy binding, pilot and release remain open.

[Editorial handoff](chapter-ii-editorial-corrections-20261013.md) · [Production evidence](evidence/chapter-ii-editorial-production-20261013.json) · [Authoritative status](project-status.md).

### Sprint 15B.13AT / 15B.14A — Editorial review closed; qualification preparation complete

**2026-10-13, 08:14–08:18 UTC.** Three v3 question approvals and three guide publications at authoring v7 / runtime v3 are verified against unchanged reviewed content and saved snapshots. All 192 questions are approved, all 263 definitions active and all 57 guides published. S07-M05 remains archived; nothing awaits content review.

The next slice prepares a version-bound inventory and independent Physics review packet covering eight skills, seven outcomes, 192 questions, 263 definitions and 57 guides. All 96 Diagnostic/Mastery candidates retain the protected-allocation hold pending SME and historical exposure decisions. The earlier direct-read gap does not establish actual third-party retrieval or historical non-exposure. All governed delivery and allocation counts are zero. No runtime, content, approval or release-gate record was changed. [Qualification handoff](chapter-ii-assessment-qualification.md) · [Reviewer packet](grade7-physics-chapter2-sme-review.md) · [Evidence](evidence/chapter-ii-qualification-preflight-20261013.json).

### Sprint 15B.14B / 15B.14C — Pilot implementation merged; production database deployment blocked

**2026-10-13.** The owner's subsequent direction authorizes the provisional Chapter II pilot with specialist review deferred, superseding the preceding allocation hold for this bounded use. [PR #206](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/206) merged at `a64269e1ab83d2b52d1a8af0d65559bab580aeec`. All five final CI jobs passed in [run 38386280582](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38386280582), including 1,282 passing Node tests and zero failures. Vercel production was verified `READY` on that implementation commit.

Both attempts to apply the first database migration through the Supabase connector returned `Invalid or expired requestState` (JSON-RPC `-32602`, `invalid_request_state`). Readback confirms the new private release-unit registry/governance function and corresponding migration-history entry are absent. All 37 tracked preflight content/source/learner table counts and digests remain unchanged. The frontend deployment does not activate Chapter II: it remains draft, inactive and unallocated. Database deployment, production rehearsal, allocation/binding commit, activation and authenticated Chapter I/II acceptance remain pending. Independent SME and final production exposure disposition also remain open. [Deployment evidence and blocker](evidence/chapter-ii-pilot-deployment-blocker-20261013.json) · [Current release procedure](chapter-ii-pilot-release.md) · [Authoritative status](project-status.md).

### Sprint 15B.14B / 15B.14C — Browser deployment and pilot activation

**Activated at 17:38:42 UTC / 21:38 Asia/Yerevan on 2026-10-13.** After explicit owner authorization for browser fallback, both exact reviewed migrations were applied through the Supabase SQL Editor with atomic migration-history records and matching SHA-256 hashes. The rollback rehearsal passed all 53 preservation scopes; fresh readback confirmed the draft and all 37 baseline table digests were unchanged. The identical activation transaction then committed: Chapter II is `pilot`, with three active pools, four blueprints/policy bindings, two Diagnostic and three Mastery forms, and one governed model/runtime binding. All 53 preservation checks passed. Chapter I remains its original pilot; Chapter III remains draft with zero allocations. The six internal pilot gates passed and `external_sme_approved` remains pending. Authenticated production acceptance subsequently passed; see the dated closure below. [Activation evidence](evidence/chapter-ii-pilot-activation-20261013.json).

### Sprint 15B.14C / 15B.12E — Authenticated pilot acceptance complete

**Authenticated production acceptance passed 91/91** on exact frontend revision `ed3f1c291e38e77c8469699e361205893e652327` in [workflow 38446467319](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38446467319). The six designated QA identities, reciprocal two-school controls, protected direct-read denials, exact Chapter II contract and Chapter I → II → I desktop/mobile navigation passed. The runner created no learner session, answer or exposure; before/after chapter evidence is unchanged, and only its own login sessions were closed. [Production acceptance](evidence/chapter-ii-pilot-read-acceptance-20261013.json). This closes the live switching dependency for Sprint 14 / 15B.12E and the authorized provisional Chapter II pilot slice 15B.14C. It does not grant independent specialist approval, production promotion, empirical form equivalence, cross-release prerequisite routing or full Sprint 15 course completion.
