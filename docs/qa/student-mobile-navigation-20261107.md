# BF-10 student navigation on small phones

## Failure and scope

The shared student menu used non-shrinking, minimum-content flex links inside a horizontally scrolling bar. Earlier checks focused each link before checking its bounds, which scrolled hidden links into view; they did not establish that all four destinations were simultaneously available. An isolated cloud-browser fixture using the real styles and Armenian UI font reproduces the fourth destination ending at about 470 px in a 390 px viewport (menu scroll width 476 px). This is a synthetic layout reproduction, separate from signed-in production evidence.

This is subject-neutral navigation presentation. The consumer audit covers the shared shell and Forest/responsive cascade on Home, course, materials, Join Class, account/privacy, the six legacy topic/practice/assessment/progress routes, and the shared account-access/resource-library/teacher-workflows documents. Existing role gates determine whether their student shell is active. The authenticated learning player continues to suppress browsing navigation. Desktop staff navigation, permissions, course eligibility, assessment rules, scores and learner records are unchanged. No Edge Function or database deployment is required.

## Delivered behavior

The menu uses a grid sized from actual rendered words. All four destination labels, icons where there is room, current-page state and exact governed URLs are retained. Full words remain intact. The smaller layout changes columns rather than hiding destinations in horizontal scrolling. At the narrowest enlarged-text size, decorative icons yield their space to the full labels.

A fixed menu may use at most 20% of the available viewport height. This is a project usability target, not a claimed accessibility standard. If it needs more room, the complete menu sits before the main workspace in normal document flow. It cannot cover the page content. Fixed menus reserve their measured height in workspace padding, including the bottom safe area. Side safe areas are respected. Focused learning/assessment and blocked or signed-out role states keep their existing navigation suppression.

One controller per menu coalesces content, font and resize updates. It observes the menu only, does not own authentication or fetch application data, and does not replace its links on resize. Repeated installation returns the same controller. Static content initialization starts with the non-obstructing flow layout until measurement completes.

## Verification

The isolated preview uses real styles/font and the layout module with synthetic labels and no account or learning data. It is not an authenticated journey, physical-device test or personal usability acceptance. Sixteen preview combinations, 320/360/375/390/430/449/768/1100 px at ordinary and 200% text, finish without horizontal menu scroll or off-menu links. The first candidate still clipped the longest label at 320 px/200%; the decorative-icon fallback corrects it. The full native regression separately uses actual student HTML, modules, styles and the pinned SDK, with synthetic auth/Edge responses.

Native regressions now check initial geometry before focusing links, whole words, all four destinations, touch-target bounds, current/selected-course links, padding versus actual fixed height, flow placement, short/landscape viewports, focus retention and observer settling after repeated initialization/resize. The matrix includes 320/360/375/390/430/449 px at ordinary and 200% text, with tablet/desktop compatibility. Existing focused-player and cross-role/account tests remain in the required Chromium gate.

The guarded production mobile suite retains its original two-school student/teacher journeys at 390/430 px. It adds a read-only student-navigation matrix at 320/360/375/390/430/449 px and both text sizes on the already open Home document, then restores the original viewport/text size. No extra sign-in, learning session, answer, submission, mark or feedback publication is created. Receipts allowlist only supported dimensions/text scales. All fixture, main-source, request-denial and local-session cleanup guards remain.

The browser dependency audit identified five explicit workflow path lists that needed the new layout module; they now include it. The other consumers are covered by their existing source patterns. The dependency-trigger checker passes all twelve checked browser workflow entrypoints and retains twenty shared serialization/queue guards.

Local focused source and QA-policy tests pass. The local native run could not launch because this workspace has no Playwright Chromium executable; no browser was downloaded as a workaround. Hosted native/CI and signed-in production compatibility are pending. The candidate must pass all five release jobs before merge and retain the configured persistent production Deployment Check.

## Remaining gates

BF-09 remains technically verified with its original 13/13 production record, including the unchanged Chapter VI 324/324 retry and retained timeout. BF-37's historic transport cause remains unconfirmed; BF-02 remains deferred. B.12.3/B.12 owner usability acceptance, paused subject expansion, the completed U1 repair evidence and independent content/security/account gates are preserved. No owner usability approval is inferred from this repair.
