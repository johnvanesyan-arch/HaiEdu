# Sprint 16.5A — Student dashboard design review

**Date:** 2026-10-26; updated 2026-10-27 Asia/Yerevan for the accepted Forest direction and visible logout · **Status:** Concrete design and compatibility review prepared; owner design decision pending. No production interface or backend change.

## Priority and subject checkpoint

John directs a pause in subject expansion and brings the student dashboard redesign forward: “mark where we stopped in the area of subjects and jump right into the student dashboard redesign.” This supersedes the earlier scheduling requirement to wait until 16.4. It does not waive design review, feature dependencies, or the four-subject acceptance required before the formal school pilot.

English is parked after **16.1C.47** at merged commit `d32fede819cd077d028f7c66d90b084243961125`, [PR #300](https://github.com/johnvanesyan-arch/HaiEdu/pull/300). Unit 3 provisional activation and guarded production read acceptance are complete. The next subject slice is **full designated Unit 3 learner attempts, assessed audio limits/resume/unscored exits, and W01 draft/submission/return/revision/teacher feedback**. Those actions have not been completed by read acceptance. Then resume Units 4–6, English course closure, Mathematics and Armenian in the existing order. Do not repeat activation, owner content/audio review or unchanged evidence. Existing pilot access remains active; pausing development does not disable learning. Specialist review remains owner-deferred/pending. Speaking stays classroom-assessed.

## Sources and observed interface issues

The audit uses the exact merged source above: `web/index.html`, `multi-subject-home.js`, `student-shell.js`, `student-courses.js`, `learning-navigation.mjs`, `course-page.js`, `learning-player.mjs`, `written-work.mjs`, `unit-guides.mjs`, `privacy.html`, `account-access.js`, `role-router.js`, existing browser regressions, the roadmap, and the academic-year policy. Findings below are source observations, not a new authenticated production-user study.

The [7 October reference](design/student-dashboard/haiedu-student-mockup-2026-10-07.html) is retained unchanged. Its blue/white shell, warm accent, welcoming Home, progress ring, skill filters and responsive navigation inform this extension. The new [clickable review](design/student-dashboard/haiedu-student-review-2026-10-26.html) uses fictional local data and makes no service calls.

| Observed issue | Consequence | Proposed correction |
| --- | --- | --- |
| Multi-subject Home is predominantly a list of unit links; legacy next-action cards are hidden | The first screen offers little guidance or visual reward | Selected-context continuation card, concise course tiles and explicit resume action |
| Home heading retains a Physics-specific explanation while the shared home renders multiple subjects | The relationship between account and course is unclear | Neutral Home copy; subject/grade/class/year stated at the action |
| Course tabs share a dense renderer containing modes, skill tables and work history | Repeated information competes with the student's next action | Assessments → Course → Progress ordering, distinct sections and progressive disclosure |
| Writing and guide entry links sit among course controls | Returned work/teacher feedback is easy to overlook | A visible My work destination, initially a contextual index of existing writing routes; aggregate counts only when supported |
| The old reference assumes one subject, grade and year | It cannot establish compatibility for future accounts | Multi-course, Grade 8, second school, new/empty accounts, pending delivery and read-only history examples |
| Student shell, privacy, join and legacy focused routes have separate presentation code | A home-only repaint would fragment the experience | Shared token/navigation audit and full consumer list in 16.5B; retain canonical bookmarked routes |
| Skill numbers and readiness need careful interpretation | Practice confidence could appear to certify completion | Label practice readiness, diagnostic results and verified mastery separately; no aggregate cross-subject percentage |
| Future history, notifications and longitudinal account functions lack a concrete layout contract | Later features could crowd or redefine navigation | Dedicated capability slots with explicit enablement and provenance contracts |

## Proposed experience

**Home:** a friendly greeting, clear selected school/year/grade, an explicit course selector, one dominant continuation action in a lighter illustrated card, and illustrated course cards. Expandable learning steps explain the existing stage and open the relevant course tab; the readiness ring is a shortcut to that selected course’s skill map. The student chooses the course; the current server-authorized action inside that context remains authoritative. The design does not invent a cross-subject ranking. Initials are a visual account marker, not an implemented avatar-upload feature.

**Courses:** course selection plus a visual unit path; assessments appear before course content and progress. Each unit retains its configured prerequisite/readiness, publication, retry, optional-content and history states. Open guide/writing actions remain separate from automatic mastery.

**Progress — owner navigation correction, 2026-10-27:** remove the duplicate main/mobile menu entry. Retain the complete Progress tab within each selected course, including skill filters and the detail panel; Home shortcuts lead there with the same course context. Implementation must preserve legacy progress URLs, history and policy context. This relocates navigation without removing a learner function. Color always has a text label. Counts show their denominators and evidence kind. No unsupported course percentage, streak, XP or ranking is introduced.

**My work:** writing status, saved draft, returned revision and teacher feedback. The new navigation entry can index existing course-scoped routes in 16.5B without inventing a cross-context work API. An aggregate inbox/count remains conditional on a reviewed authorized projection. The preview demonstrates a fictional returned task and local draft interaction; it does not submit or grade anything.

**Supplementary materials — owner request 2026-10-27:** add «Հավելյալ նյութեր» directly below My work, plus course/work shortcuts. Use illustrated practice/reading cards, learning goals, search, purpose chips and disclosed topic/provider/format filters. Show approximate duration and explicit teacher recommendations only when supplied; retain neutral fallbacks and restrained/reduced motion. Preserve authorized context and teacher/platform provenance; handle no materials, no matching filters and withdrawn resources. Five fictional cards demonstrate the interface. PDFs/worksheets and HTTPS links are the recommended first delivery. A complete 16.5B slice must include teacher sharing, platform publication and protected resource delivery, with 16.5C acceptance. This addition does not implement uploads or change mastery. See the [scope](student-supplementary-materials.md) and S45 in the now 45-entry matrix.

**Account:** current sign-in/security/privacy/join/deletion paths remain reachable. «Դուրս գալ» is directly labelled at the desktop sidebar bottom and immediately below account identity on all sizes. On mobile or in focused work, the top-right avatar opens that account page. Both buttons reuse the same preview action; 16.5B must retain existing real signout and cleanup behavior. Year/history and placement use the separate 18.5 policy once implemented. No student rollover action, invented current-grade inference or school-wide history access.

## Compatibility and integration

The [function coverage matrix](student-dashboard-function-coverage.md) maps every inventoried current capability and planned student-facing roadmap category to a place, required states, source/dependency and acceptance evidence. No function is proposed for removal. A mapped future slot is not backend implementation or owner acceptance of an additional feature.

All production contexts must bind the actual actor, school, academic year, class, enrollment, programme, release and unit. Missing canonical current placement must remain “not available”; do not infer it from course names or the highest grade. A visual theme/icon is optional presentation metadata with a neutral fallback, never the selector for access or subject behavior. Existing URLs and registered legacy extensions remain compatible.

Hide unavailable future controls in ordinary production. The design-review toolbar explicitly reveals future scenarios so the layout can be reviewed. Historical views are read-only with original context/provenance, no current-year totals and no “continue” action. Placement pending, subject delivery pending, empty enrollment, revoked access and service failure are distinct states.

## Representative preview scenarios

The review selector includes returning/multiple subjects; new learner/diagnostic prerequisite; one course; no enrollment; another authorized school; Grade 8 with future curriculum data; previous-year history; placement pending; subject delivery pending; loading; service error; access revoked; mastery ready; mastered unit; exhausted attempts. Future data examples are labelled in the review toolbar and are not available curriculum releases. Main/mobile navigation now contains Home, Courses, My work and Supplementary materials; Account remains a utility and future History remains separately enabled. Progress is inside the selected course, following the owner’s removal request. The 27 October extension adds no-materials and withdrawn-material review scenarios; the original 15 remain. Mobile navigation uses the short visible label «Նյութեր» and full accessible name «Հավելյալ նյութեր». Course tabs retain Assessments → Course → Progress order. Filters, course selection, skill details, focus-task entry/exit, local draft save and error retry are interactive.

## Ideas for owner consideration

1. **Learning journey:** a restrained visual trail of real skills/units; a small completion acknowledgement only after a persisted result. No change to marks or eligibility.
2. **Personal study goal:** optional weekly goal with a forgiving progress display. Needs a separate preference/event contract; do not equate browser-open time with learning time.
3. **Personalization:** a small approved avatar/theme selection, with reduced-motion support. Needs persistent account preferences and accessibility review.
4. **Work and feedback inbox:** combine returned writing and later teacher-approved assignments when authorized projections are available. Existing writing stays available through course routes first.

These are suggestions, not silently approved gamification or new backend scope. The preview uses the first idea as a presentation of sample evidence and shows the existing writing workflow. Goals, avatars, push notifications and badges are not represented as live functionality.

## Style guide handoff

The owner-requested [student style guide v1.0](student-style-guide.md), [visual guide](design/student-dashboard/haiedu-student-style-guide.html) and [namespaced CSS reference](design/student-dashboard/student-style-tokens.css) consolidate the selected Forest direction. They distinguish retained decisions from v1 implementation refinements: larger essential labels, normalized spacing/radii, stronger essential control edges and target sizes, and hover/error tokens. The existing dashboard review is unchanged. Guide-only evidence covers 27 contrast pairs, four iframe widths and ten specimen interactions; production font delivery, actual-viewport/zoom checks and authenticated acceptance remain open.

## Delivery gates and next action

**Historical 27 October colour/navigation evidence:** [visual options](student-dashboard-visual-options.md) and [evidence](evidence/student-dashboard-colors-20261027.json) record three palettes, 93 responsive layout checks, 18 interaction checks and 18 targeted contrast pairs (minimum 4.78:1). All pass. A mobile readiness-ring caption overflow seen in visual review was corrected by retaining the count in the ring and its explanation beside it. Palette changes preserve course/tab/filter/draft state. The owner requested global Progress removal. John subsequently selected Forest/cream; the current preview fixes that palette and adds clearly labelled sidebar/account logout actions. See the [targeted revision evidence](evidence/student-dashboard-forest-logout-20261027.json). Complete design acceptance remains pending. Original palette comparisons remain historical evidence, not a persistent theme feature.

**Historical 27 October materials-refinement evidence:** [engagement-design evidence](evidence/student-materials-engagement-20261027.json) records 57 layout checks at 360/768/1280 px (17 scenarios plus open filters and Physics materials at each width) and 21 interaction checks. Search preserves focus; combined search/filter reset, Armenian case handling, metadata omission, dialog Escape, no-motion/loading behavior and course/work shortcuts pass. The [updated screenshot](design/student-dashboard/haiedu-student-materials-engaging-20261027.jpg) shows the complete materials view. These are fictional design checks, not proof of increased student engagement, actual 200% browser zoom or production delivery. The review-only no-motion toggle does not create a persistent account setting.

**Historical 27 October addition evidence:** the materials extension passes 51 native Chromium layout checks (17 scenarios × 360/768/1280 px container widths) and 12 targeted interaction checks, including filters, keyboard focus, detail/Escape, work/course shortcuts and account access. A mobile filter-width overlap found during visual review was corrected; final layout checks include filter and navigation clipping. See [delta evidence](evidence/student-materials-design-20261027.json) and the [screenshot](design/student-dashboard/haiedu-student-materials-20261027.jpg). These checks do not establish live resource delivery or production acceptance; the original evidence remains historical.

16.5A requires John's review of this concrete design and the matrix, as retained in [the roadmap](sprint-roadmap.md#sprint-165--student-dashboard-design--usability-pass): “Obtain product-owner review of the concrete mockups and complete functionality mapping before implementation.” The priority switch authorizes bringing the design work forward; it does not approve an unseen design. No unmapped capability or proposed removal is known from this source audit; future data availability and full four-subject rollout remain explicit dependencies.

After design acceptance, 16.5B implements one coherent shared-shell/Home/course-navigation slice first, preserving every existing route and governed action. Follow with course/assessment/progress and work/account surfaces. Include every shared consumer: Home; generic course; registered legacy course, diagnostic, practice, mastery, assessment and progress; join; privacy/account; signed-out/blocked routing. Shared staff CSS consumers require regression review if tokens are changed.

16.5C requires native browser evidence at 360/768/1280 px and 200% zoom; keyboard/focus, reduced motion and Armenian wrapping; loading/empty/blocked/error and stale-account/context response handling; current and planned capability traceability; governed next actions/assessment/practice/audio/writing and preserved history; two-school and all four MVP subject coverage when those programmes exist. Full 16.4/16.5C and formal Sprint 17 acceptance remain open. Required CI, separate deployment control and exact-frontend production acceptance remain unchanged.

This design-only delivery is validated locally as described in [design evidence](evidence/student-dashboard-design-20261026.json), then closed through required CI, merged documentation and a source-verified Notion update. It is not a claim of live student usability acceptance or changed learning behavior.
