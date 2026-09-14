# Sprint 9 — UX, Accessibility & Armenian Localization QA

## Objective
Make the Grade 7 Physics product usable by real students across phone, tablet and desktop, while improving Armenian terminology, input/error handling, keyboard accessibility, feedback clarity and answer-key protection.

## Scope implemented

### Responsive UX
A shared `web/ux.css` layer now applies across the student, mastery-check, class-join, teacher and content-quality pages.

Responsive contracts:
- desktop: >= 1025 px
- tablet/small laptop: 761–1024 px
- phone: 481–760 px
- narrow phone: <= 480 px

The layer stacks multi-column student cards on smaller screens, converts quantity inputs to one column, makes teacher/content layouts single-column where needed, keeps tables horizontally scrollable, makes the student drawer full-width on phones, and preserves large readable touch targets.

### Accessibility
Implemented:
- visible `:focus-visible` keyboard focus
- minimum 44 px interactive targets
- skip-to-main-content link
- Armenian `lang="hy"` on learner pages
- `aria-live` status/feedback regions
- progress bars exposed with `role="progressbar"`
- answer option groups exposed as radio groups
- content-quality table rows keyboard-operable with Enter/Space
- teacher student drawer exposed as a modal dialog and closable with Escape
- reduced-motion support
- forced-colors/high-contrast fallback
- explicit labels/ARIA labels for dynamically created numeric/unit inputs

This is an accessibility hardening pass, not a WCAG conformance certification. Formal assistive-technology testing remains a later production-readiness activity.

### Armenian localization
Student-facing terminology was normalized toward Armenian rather than mixed English/product jargon. Key choices:
- `Mastery check` → `Յուրացման ստուգում`
- `mastery` → `յուրացման մակարդակ`
- `Chapter I` → `Գլուխ I`
- `adaptive practice` → `հարմարեցվող վարժանք`
- `remediation` → `ամրապնդող վարժանք`
- `join code` → `միանալու կոդ`

The teacher page was also partially normalized (`roster` → `աշակերտների ցուցակ`, skill matrix explanatory copy localized). Technical content-admin terminology such as QA, review, version and lifecycle is intentionally retained where it is useful to the authoring workflow.

### Input validation
The shared `web/ux.js` layer now validates and normalizes:
- email format
- password minimum length
- exactly 8 alphanumeric characters for class join codes
- numeric answers
- quantity units

Decimal input accepts common learner variants by normalizing comma/Arabic decimal separators to `.` and typographic minus signs to `-`. Invalid fields receive `aria-invalid`, an inline Armenian error, and keyboard focus.

Submit buttons for answer forms remain disabled until a valid answer is present. The UX layer explicitly avoids re-enabling Submit after the backend has already accepted the response.

### Error states
Implemented:
- Armenian versions of common authentication/network errors
- explicit online/offline notifications
- global handling for otherwise-unhandled promise failures
- existing 12-second question-loading watchdog retained (`session-watchdog.js`) with retry path
- user-facing validation errors instead of silent invalid submissions

### Feedback clarity
Diagnostic and mastery-check modes continue to defer correctness until completion. Practice mode may say correct/incorrect immediately, but never exposes the protected answer key. Help text explicitly states that hints should not reveal the current answer.

### No-answer-leakage checks
Automated regression tests verify:
- neutral numeric/quantity placeholders contain no answer examples
- `get-session-item` does not query `item_answer_keys`
- learner item-delivery code does not expose `canonical_unit` or `accepted_units` from the protected key table
- `submit-mastery-answer` returns `revealCorrect: false` before final results
- diagnostic UI explicitly defers correct/incorrect feedback

## Automated QA
`tests/ux-quality.test.mjs` covers the shared learner-page hooks, neutral placeholders, responsive/accessibility CSS contracts, input validation, and answer-leakage invariants.

CI was expanded to syntax-check all major browser JavaScript files, including `web/ux.js`. Latest Sprint 9 CI after the submit-state regression fix passed successfully.

## Manual visual/device QA gate
Automated/static QA cannot prove that the deployed site visually behaves correctly in every browser. Before closing Sprint 9, perform a short live smoke test against the deployed Vercel build.

### Viewport matrix
1. **Phone — 360 px wide**
   - no page-wide horizontal overflow
   - dashboard cards stack cleanly
   - buttons remain tappable
   - question text/stimuli stay readable
   - quantity fields stack vertically
2. **Tablet — ~768 px wide**
   - cards/layout do not overlap
   - scale stimuli can scroll if necessary
   - dashboard and mastery pages remain readable
3. **Desktop — >=1366 px wide**
   - normal multi-column layout remains intact
   - teacher/content tables remain usable

### Interaction checks
- keyboard Tab navigation shows a visible focus indicator
- skip link works
- Enter/Space works for selectable content-table rows
- invalid email/password/join code shows an Armenian inline error
- join code is forced to uppercase/alphanumeric and limited to 8 characters
- numeric input accepts `2,5` and normalizes it to `2.5`
- disconnected network produces a visible offline message
- diagnostic never reveals correctness question-by-question
- mastery check never reveals correctness question-by-question
- practice hint/example does not reveal the current item's answer
- after a response is accepted, Submit does not become active again for the same question

## Known limitation
The current connector environment cannot independently render the public Vercel deployment in a browser/device viewport, so manual visual/device verification is intentionally kept as the only remaining Sprint 9 acceptance gate.
