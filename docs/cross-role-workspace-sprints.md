# Cross-role workspace repair and Forest redesign

2026-10-28 · owner-authorized scope and priority · roadmap 4.98.

John accepts the shared Forest/cream direction, role-specific homes, teacher Today workspace, feedback improvements, visual class cards, explicit sharing and restrained motion. He requires the reported navigation, delivery and performance problems to be addressed before additional subjects or chapters. Work proceeds through independently verifiable slices with one primary agent. Approval of the direction does not claim implementation, measured performance or completion of future services.

## Sequencing and exit rule

| Slice | Deliverable | Dependencies | Current state |
| --- | --- | --- | --- |
| 16.5B.6 | Correct My work navigation; trace the reported resource; establish this task map | B.1–B.5 | Delivered; evidence below |
| 16.5B.7 | Measured teacher performance repair | B.6 | Delivered; measured limits in [report](teacher-performance.md) |
| 16.5B.8 | Explicit resource assignments to a class or selected students, with learner delivery | B.6, B.7 | Runtime deployed; CI/source parity passed; live acceptance pending |
| 16.5B.9 | Shared Forest staff layout and concrete Teacher Home → Classes → Review prototype, then rollout | B.7; B.8 contract informs sharing states | Planned; direction accepted |
| 16.5B.10 | Teacher Today workspace and visual class cards | B.7, B.9; scoped queue projection | Planned |
| 16.5B.11 | Faster rubric/feedback workflow | B.9, B.10; feedback persistence contracts | Planned |
| 16.5B.12 | Sharing preview, purposeful motion and cross-role usability acceptance | B.6–B.11 | Planned |

Complete and verify these bounded slices, then obtain owner usability acceptance before resuming English after C47: Unit 3 full learner/audio/writing acceptance, Units 4–6 and course closure; Mathematics/Armenian follow their existing sequence. Full four-subject 16.4/16.5C acceptance still gates Sprint 17. It cannot be a prerequisite for resuming the subject work needed to supply the remaining subjects: this workspace exit covers available production programmes and subject-neutral fixtures, not a claim of four production-ready subjects.

## B.6 — Navigation repair and evidence-based triage

- **NAV-01:** My work → subject/unit writing list must keep My work active in desktop and mobile navigation. Provide an explicit My work return link with the same authorized enrollment/release/unit; direct writing links and reloads behave identically. Courses continues to own ordinary course/assessment/progress/guides views.
- Exercise draft/submitted/reviewed list states, chapter switches, work↔course navigation, denied/account-switched contexts and absence of assessment or writing mutations from browsing. Preserve draft flush, scoring, audio, submission and feedback services.
- **DELIVERY-01 finding:** read-only production inspection of the supplied URL finds one published PDF resource, “my hobbies”, with passed QA and a complete create → attach → QA → publish audit trail. Its assignment belongs to **English Unit 1 QA A**. The supplied learner URL selects **Test Physics 7A**. The same learner also has an active enrollment in the English class. The private storage object is present (4,798,188 bytes recorded). This confirms persistence, storage presence and class mapping; it is not a fresh signed-in download test.
- Existing S45 publication exposes optional materials in the selected class/release/unit library. It does not create homework, deadlines, individual recipient rows, completion evidence or a My work assignment. “Published” must not be reported as “assigned”. No user resource is moved, republished or withdrawn during this investigation.
- **PERF-01 finding:** the current teacher page hides its dashboard until profile and dashboard requests finish; the dashboard service loads class/roster data and exact analytics for available class contexts before returning. Class selection also requests invitation data. Existing concurrency is bounded at four and empty-class analytics are already skipped. These are code-confirmed optimization candidates, not measured proof of the user's end-to-end delay or permission to remove authorization rechecks.

## B.7 — Teacher performance

1. Capture cold/warm Home, Classes, Archive, selected class, unit switch and Review timings and request counts on the same designated fixtures; include a normal small account and a substantial archive. Record network/device profile, payload size, failures and p50/p95 over at least ten reads per scenario. Separate browser, Edge and database time; never log tokens or learner response bodies.
2. Make Home/class discovery independent of full learner analytics and invitation history. Load selected-class detail and review data on demand. Bound archive queries and rendering; avoid repeated bank/version reads where an exact request-local projection can be shared safely.
3. Keep fast in-page navigation, deduplicate concurrent identical reads, cancel/ignore old responses on class/account changes, and show usable loading/error/retry states. Any cache is actor/context/version scoped and cannot grant access after revocation.
4. Establish the measured budget before editing the loading architecture. Proposed initial targets under the recorded desktop/4G profile: p95 useful Home ≤3 s, selected-class opening ≤2 s, already-loaded navigation ≤200 ms. These are targets, not current measurements or guarantees; document any budget revision and reason. Regression checks must bound request count independently of archived-class growth.
5. Verify renamed/restored/offboarded classes, current/historical contexts, expired sessions and two-school isolation. Audit/deploy/read back every Edge consumer if a shared helper changes. Do not replace missing analytics with zero or compute school-wide totals from one class.

## B.8 — Resource assignments and learner delivery

Deliver two end-to-end increments rather than a recipient picker without a service:

- **B.8a class assignments:** retain optional library publication; add an explicit Assign action, authorized class/context selection and a recipient summary. Persist an assignment pinned to the immutable resource version and intended context. Display it in the intended learners' My work with a link to the protected resource. Return a durable assignment receipt and allow the teacher to inspect/cancel it through an audited lifecycle.
- **B.8b selected students:** add a searchable roster restricted to the selected active teaching assignment; persist exact recipient enrollments and verify intended learners can read the assignment while unselected, foreign-class and foreign-school learners cannot. Reject stale rosters, mixed contexts and ended grants on the server. Assignment recipients and existing library visibility are distinct: assigning an already class-published resource to one learner does not make that resource private. The teacher preview must state its existing audience. A new assignment-only file needs an explicit restricted-publication contract before it can be described as private to those recipients.
- Accepted implementation contract: class-wide assignment captures eligible current enrollments at assignment time; later joiners require explicit inclusion. Version replacement must not silently change an existing assignment. Specify optional due dates/timezone, future-enrollment handling, cancellation/withdrawal, historical access and any self-reported completion before implementing them. Resource opening or a learner's Done action is not mastery, submission or teacher assessment evidence.
- Require idempotent retries, concurrency/version guards, immutable audit, clear draft/published/assigned/canceled states and a teacher-visible recipient receipt. Exercise publish → assign → intended student My work → open/download → teacher receipt → cancellation, plus excluded-recipient denial. Preserve the original resource and existing publication history.
- Separate clean Physics-only demonstration use from dedicated multi-subject QA. Either create a normal-use identity through supported provisioning or migrate the English QA identity/CI configuration before ending the old grants; no removal of designated fixtures as a shortcut.
- This brings forward only the resource-assignment subset of S37. Assessment builders, intervention recommendations and general notifications remain in their owning sprints; no unimplemented bell, due-date automation or bulk assessment control.

[B.8 implementation and exact contract](resource-assignments.md): published teacher/platform materials, 50-row pages, maximum 500 recipients, class snapshot/selected enrollment IDs, idempotent request UUID, pinned source, protected open and reasoned cancellation. Due dates, reminders and completion remain unimplemented. The normal Physics-only demonstration identity is still open: read-only inspection finds only two existing active teacher profiles, both used by multi-subject QA. A normal-use identity must be chosen and provisioned through the supported account/invitation flow; no QA grant or credential is changed by this slice.

## B.9 — Shared Forest staff layout and prototype

Use role-neutral Forest/cream tokens, Armenian typography, subject-code artwork/fallbacks, spacing, controls, focus/status language, loading/error states, breadcrumbs and predictable account/logout placement. Preserve the accepted student design and all 45 mappings. Audit shared account/resource/writing pages and affected reviewer consumers as well as teacher, school admin and master admin.

Create a concrete desktop/mobile Home → Classes → Review prototype with realistic Armenian content, empty/loading/error/archived states and a clearly labelled synthetic dataset. Make the prototype reviewable before broad rollout and validate it against the accepted direction and existing design/release controls. This owner-approved sequence does not require fresh blanket authorization at every slice; material scope changes and final owner usability acceptance remain separate. Apply common presentation across affected role pages without coupling theme to student authorization.

| Role | Home priority | Boundary |
| --- | --- | --- |
| Student | Continue learning, assigned work and feedback | Exact learner enrollment and evidence context |
| Teacher | Review work, classes and learner support | Assigned classes/subjects only |
| School admin | Teachers, assignments and school oversight | Own institution and permitted aggregates |
| Master admin | Schools, governance and platform health | Bounded, audited administration; no implicit impersonation |

Remove repeated headings and oversized sections; keep necessary status explanations concise and accessible. Reuse B.5 folded archives. Permanent deletion is not part of this plan.

## B.10 — Today and visual class cards

Provide pending reviews, recent/selected classes and Continue reviewing with stable return context. Add subject artwork and compact class summaries linked to their exact filters. A cross-class review count requires a scoped, paginated backend projection with timestamps and explicit partial/error states. Never present a selected-class count as all-class coverage. Recently used context must be actor scoped and reauthorized; shared devices must not inherit another teacher's state. Do not add per-class fan-out that reverses B.7 performance gains.

Acceptance: nonzero/zero/unknown queues, multiple subjects/schools, oldest/next review navigation, reviewed item removal, reload, revocation and account switch. No student rankings or fabricated percentages. Measure finding/opening the next submission against the B.7 baseline. PERF-02 carries the measured selected-class/unit delay (detail median/p95 5.87/7.88 s; unit switch 6.84/8.86 s): profile and batch exact evidence reads while preserving final authorization. Resolve and remeasure the Home/detail target gaps before closing B.12 performance acceptance.

## B.11 — Rubric and feedback ergonomics

Keep the applicable rubric beside the response, reusable personal feedback snippets, keyboard navigation and explicit unsaved/saved/sent states. Preserve revisions, changed-review reasons and the learner's returned/reviewed history. Student writing autosave already exists; teacher feedback autosave and snippet persistence are new work and need version/conflict/retry/session-change contracts. Batch feedback/publication requires a separately bounded recipient preview, per-item result and audit contract before exposure; this plan does not enable indiscriminate sending.

Acceptance: edit/save/return/assess/revise feedback, stale-tab conflict, interrupted save, duplicate click, account/context switch and learner receipt. Validate with the real teacher-to-learner writing flow, preserving the distinction between human writing marks and automatic mastery.

## B.12 — Preview, motion and acceptance

- Complete a student-safe material/assignment preview using the learner projection. Teacher preview must not impersonate a learner, mark work read or expose protected assessed answers.
- Add restrained card/filter/disclosure and save/completion feedback using real states. Respect reduced motion and keyboard/focus; information must remain available without animation. Show completed review work only from actual records, without compulsory streaks or decorative score claims.
- Verify every affected page/role at 360/768/1280 px, 200% text and browser zoom where supported; distinguish actual-device/assistive-tech gaps. Retain all 45 capability/dependency mappings and subject/grade neutrality.
- Complete the reported journeys: teacher selects class/student and sends → intended learner sees My work → opens resource; learner My work → writing → feedback → returns; teacher Home → class → review → next work; archive search/restore; account/logout and cross-role navigation. Recheck affected speed budgets and tenant/recipient denial.
- Require appropriate CI/native/aggregate gates, exact production source/assets and affected API/runtime readback, then owner usability acceptance. Record any unresolved issue honestly; do not treat the full 16.5C four-subject gate as closed.

## Delivery discipline

Batch related code, tests and documentation within each capability slice; one primary agent. Reuse source-verified unchanged evidence. Add meaningful regression coverage for the reported failure; no production credentials in isolated tests. Preserve release/MFA/content-review controls and run-owned QA cleanup. Align project-status, roadmap, backlog, API and coverage notes as applicable, merge evidence and source-verify Notion while preserving native child pages. No invented dates or duration estimates are attached to these slices.

## Historical B.6 delivery evidence

[PR317](https://github.com/johnvanesyan-arch/HaiEdu/pull/317) implements NAV-01. Required [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40550515844) and [main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40551181197) pass all five jobs: 1,465 unit/integration and 187 native browser checks. The two new real-page journeys use synthetic services at 360/1280 px and cover draft/submitted/reviewed lists, chapter switches, reload/return, ordinary Courses, account switching and absence of learning writes. The closing batch adds an empty writing-list journey matching the reported Physics case; its required native gate is additional coverage, not a new learner/backend action.

Production `f9d366bf47dcd4a387df35d0f2906bbe2a3ac2fd` and `course.html`, `course-page.js`, `student-courses.js` match exactly. The closing documentation/test change leaves those frontend files unchanged. [Evidence](evidence/cross-role-workspace-triage-20261027.json) retains the read-only resource findings, source-confirmed performance candidates and reused unchanged service evidence. Persistent Vercel blocking configuration is reused from its independently verified reliability record, not inferred from a successful build. At that B.6 checkpoint B.7–B.12 remained open; its evidence did not claim a performance improvement, new assignment endpoint or completed staff redesign. B.7 is now delivered below.

## B.7 delivery evidence

**2026-10-27 — 16.5B.7 teacher loading repair delivered and measured.** [PR320](https://github.com/johnvanesyan-arch/HaiEdu/pull/320) adds bounded class discovery, on-demand detail/invitations, paged archive search and in-page navigation. Same-fixture production measurements pass **140 before + 140 after**: cold Home p95 **14.74 s → 4.61 s**, Classes **9.79 s → 0.04 s**. Class detail now loads on demand; remaining timing-target gaps and the trade-off are explicit in the [performance report](teacher-performance.md). Required PR/main gates pass **1,474 unit/integration and 195 native browser checks**; exact frontend, Edge v22 and SQL source parity are verified. Current-source staff acceptance passes **147/147**, with run-owned cleanup; fresh English compatibility passes **154/154**. [Release evidence](evidence/teacher-performance-release-20261027.json). **Next: B.8 class/student resource assignments**, then B.9–B.12. All 45 capabilities, English C47 hold and full four-subject gates remain.
