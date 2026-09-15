# Sprint 10.5A — UX Architecture

## Status

**Implemented as the architecture gate for Sprint 10.5.**

Sprint 10.5A does not redesign production pages yet. It freezes the information architecture, navigation model, page/state contracts, component boundaries and low-fidelity layouts that Phases B–F will implement.

The existing deterministic grading, mastery, recommendation, assessment, session, remediation, role-routing and security logic remain authoritative.

---

## 1. Current-state inventory

The current browser application is a static multi-page app under `web/`.

### Student surface

| Current file | Current responsibility | Sprint 10.5 observation |
| --- | --- | --- |
| `web/index.html` + `web/app.js` | Authentication, student dashboard, diagnostic launch, practice session, diagnostic session, completion states, skill map | Too many distinct student jobs are combined into one page/state machine. Keep the backend semantics but separate major experiences. |
| `web/remediation.js` | Hint 1 → Hint 2 → worked-example help | Must remain practice-only and server-authoritative. |
| `web/session-watchdog.js` | Session/freeze protection | Must be preserved during practice extraction. |
| `web/mastery.html` + `web/mastery.js` | Mastery-check eligibility, active check and results | Already separated; retain its canonical route while moving it into the shared student shell. |
| `web/join.html` + `web/join.js` | Student class join | Utility/account flow; not a primary learning nav destination. |
| `web/privacy.html` + related JS/CSS | Privacy controls, data inventory and deletion controls | Account utility route; must remain reachable from the authenticated shell. |
| `web/styles.css` | Shared legacy visual rules | Phase B will progressively replace ad-hoc rules with tokens/components. |
| `web/ux.css` + `web/ux.js` | Shared responsive/accessibility/dead-session UX guards | Preserve behavior; absorb visual responsibilities into the new design system only when regression-safe. |
| `web/role-router.js` | Routes authenticated roles to their permitted surfaces | Remains authoritative for role-based destination decisions. |

### Staff surfaces

| Current file | Responsibility | Sprint 10.5 treatment |
| --- | --- | --- |
| `web/teacher.html` + JS/CSS | Teacher dashboard, classes, matrix, student drawer | Do not redesign analytics. Apply shared shell/tokens later only where safe. |
| `web/content.html` + JS/CSS | Content QA/review console | Out of student UX scope. |
| `web/admin.html` + JS/CSS | Administration/security/privacy operations | Out of student UX scope. |

### Main structural problem

`index.html` currently acts as **Home + Progress + Diagnostic + Practice**. This makes the product feel like one engineering prototype screen rather than a coherent learning application. Sprint 10.5 will separate information architecture while reusing the same backend contracts.

---

## 2. Target information architecture

### Primary authenticated student navigation

1. **Home** — `index.html`
2. **Physics 7** — `physics-7.html`
3. **Assessment** — `assessment.html`
4. **Progress** — `progress.html`

These four destinations are the permanent student navigation model. Future subjects may be added without changing this top-level structure.

### Secondary learning routes

- **Practice** — `practice.html`
- **Diagnostic** — `diagnostic.html`
- **Mastery Check** — `mastery.html` (existing canonical path retained)

These are task routes, entered from Home, Physics 7, Assessment or Progress. They are not top-level navigation destinations because they represent focused activities rather than browsing destinations.

### Utility/account routes

- **Join class** — `join.html`
- **Privacy & account data** — `privacy.html`
- Sign out — action in the account menu

### Staff routes retained

- Teacher — `teacher.html`
- Content quality — `content.html`
- Administration — `admin.html`

Role routing remains responsible for preventing a non-student account from treating the student shell as its canonical landing environment.

---

## 3. Route contract

| Route | Page purpose | Primary backend source | Important states |
| --- | --- | --- | --- |
| `/` / `index.html` | Student Home | `get-student-dashboard`, mastery status | loading, active session, recommended skill, assessment available, chapter verified, error |
| `/physics-7.html` | Grade 7 Physics browser | student dashboard skill data + curriculum metadata already present in the app/data model | Chapter I active, Chapters II–VI unavailable, skill not started/support/developing/secure/verified |
| `/practice.html` | Focused adaptive practice | `start-learning-session`, `get-session-item`, `submit-answer`, `get-remediation-help` | loading, unanswered, hint 1, hint 2, worked example, correct, incorrect, adapted next question, session complete |
| `/assessment.html` | Assessment hub | latest diagnostic + mastery-check status | diagnostic available/in progress/completed; mastery locked/ready/remediation required/verified |
| `/diagnostic.html` | Chapter I diagnostic | existing bounded diagnostic session functions | intro, active 1–20, answer recorded, complete, results |
| `/mastery.html` | Independent mastery check | existing mastery-check endpoints | locked, ready, active 1–20, pass, fail/remediation |
| `/progress.html` | Student progress | dashboard + diagnostic + mastery-check status | no diagnostic, partial learning, eligible for check, verified |
| `/join.html` | Join teacher class | existing join-class flow | signed out, ready, joined, error |
| `/privacy.html` | Privacy/account controls | Sprint 10 privacy endpoints | loading, preferences, deletion pending, error |

### Route compatibility rule

Existing external/bookmarked routes (`index.html`, `mastery.html`, `join.html`, `privacy.html`, staff pages) remain valid. Sprint 10.5 must not break role routing, account deletion recovery or security redirects.

---

## 4. Student navigation behavior

### Desktop/tablet

A persistent left navigation rail contains:

- Home
- Physics 7
- Assessment
- Progress

The header contains page title/breadcrumb context and an account control. Privacy, Join class and Sign out live under the account area rather than competing with learning navigation.

### Mobile

Use a four-item bottom navigation for the four primary destinations. Focused activity pages (Practice, Diagnostic, Mastery Check) suppress the full bottom navigation when necessary to protect question focus, but retain an explicit safe exit/back action.

### Navigation priority

Home must answer **“What should I do next?”** above the fold. The backend recommendation remains authoritative; the UI must never derive a competing recommendation from visible scores.

---

## 5. Page contracts

### Home

Home is a decision page, not a full analytics page.

Priority order:

1. Resume an active session.
2. Otherwise show the backend-recommended next skill/action.
3. Surface assessment status when diagnostic/mastery action is relevant.
4. Summarize Chapter I progress.
5. Show recent/recommended skills as secondary content.

The full 10-skill analytical view moves to Progress/Physics 7 rather than dominating Home.

### Physics 7

Hierarchy is fixed as:

`Physics 7 → Chapter → Topic → Skill`

For the current MVP:

- Chapter I is active.
- Chapters II–VI may be visible as unavailable/coming later.
- Skill rows show code, Armenian name, competency layer, student-facing state, mastery/progress score and action.
- Raw Bayesian evidence values are never shown.

Student-facing states:

- Not started
- Needs support
- Developing
- Secure
- Verified

`Verified` requires the relevant mastery check, not merely a high practice score.

### Practice

Practice is a focused learning surface. The central hierarchy is:

skill context → mastery/progress (secondary) → question/stimulus → answer controls → help → result → next action.

The existing remediation hierarchy is preserved exactly:

1. Hint 1
2. Hint 2
3. Worked example

Incorrect answers must lead to remediation/adaptation, not immediate pointless repetition. Help usage remains server-authoritative and continues to affect mastery evidence.

### Assessment

Assessment is a hub, not another practice screen. It shows two distinct cards/areas:

- Chapter I Diagnostic
- Chapter I Mastery Check

The diagnostic is explicitly labelled as **Chapter I**, not as a whole-Grade-7 diagnostic.

### Diagnostic

Diagnostic has a distinct assessment presentation:

- purpose before start;
- 20 questions;
- no help;
- no per-item correctness;
- neutral answer-recorded transition;
- skill-level results at completion;
- direct CTA to the backend-recommended learning action.

### Mastery Check

Retain locked / ready / active / result states. The pass rule remains labelled provisional and must not be presented as a national standard.

### Progress

Progress is the analytical student page. It combines:

- Chapter I completion/verification state;
- 10 skill states;
- mastery/progress score;
- latest diagnostic evidence;
- mastery-check status;
- recommended next action.

Diagnostic evidence, practice mastery and verified completion must remain visually and semantically distinct.

---

## 6. Component architecture for Phase B

Phase B will implement a shared design system using these component boundaries.

### Shell/navigation

- `AppShell`
- `SideNav`
- `MobileNav`
- `TopHeader`
- `AccountMenu`
- `PageHeader`
- `Breadcrumbs`

### Core presentation

- `Card`
- `SectionHeader`
- `PrimaryButton`
- `SecondaryButton`
- `QuietButton`
- `StatusBadge`
- `ProgressBar`
- `MasteryIndicator`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- `FeedbackBanner`

### Learning components

- `NextActionCard`
- `SkillRow`
- `ChapterCard`
- `AssessmentCard`
- `QuestionCard`
- `AnswerControl`
- `RemediationPanel`
- `AssessmentProgress`
- `SkillResultRow`

### Rule

Components render backend state. They do not own mastery thresholds, prerequisite rules, eligibility rules, grading rules or recommendation logic.

---

## 7. CSS/token architecture for Phase B

The target cascade is:

1. `tokens.css` — design tokens only
2. `base.css` — reset, typography, document defaults, accessible focus behavior
3. `components.css` — reusable cards/buttons/badges/progress/forms/feedback
4. `student-shell.css` — authenticated shell/navigation/responsive layout
5. page-specific CSS only where a reusable component is insufficient

### Token groups

- color: background, surface, text, muted text, border, primary, success, warning, danger, info, focus;
- spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 scale;
- type: caption / body / body-strong / heading-3 / heading-2 / heading-1;
- radius: small / medium / large / pill;
- elevation: none / low / medium;
- layout: content max width, nav width, header height;
- motion: fast / normal, with reduced-motion override;
- control: minimum touch target and input/button heights.

Semantic state colors must never be the only carrier of meaning; every mastery/assessment state also has text/iconography.

---

## 8. Data and state ownership

The redesign must preserve these ownership boundaries:

- Supabase/Edge Functions own authentication, authorization, grading, mastery, recommendation, sessions, remediation and mastery-check truth.
- Page modules own loading/error/empty presentation and navigation transitions.
- Components own rendering only.
- Query strings or DOM state may request a skill/session but never elevate permissions or override backend eligibility.
- Answer keys remain server-side.

No new student-facing AI is introduced in Sprint 10.5.

---

## 9. Responsive architecture

### Breakpoint intent

- **Desktop:** persistent left rail + wide content canvas.
- **Tablet:** compact rail or collapsible rail; two-column content only where readable.
- **Mobile:** bottom navigation on browsing pages; single-column cards; focused assessment/practice pages; no horizontal scrolling for core tasks.

Long Armenian labels and skill names are first-class constraints. Navigation and buttons must support wrapping or width growth rather than clipping.

---

## 10. Accessibility architecture

Phase B and later implementations must preserve or improve the Sprint 9/10 accessibility layer:

- visible keyboard focus;
- semantic headings/landmarks;
- explicit labels for inputs;
- `aria-live` only for meaningful asynchronous feedback;
- minimum practical touch targets;
- no color-only status meaning;
- reduced-motion-safe interactions;
- predictable focus after route/state transitions;
- error messages attached to the relevant action/state.

Focused assessment pages must not trap keyboard users inside the question card.

---

## 11. Migration sequence

To minimize regression risk:

**10.5B:** implement tokens, reusable components and the shared shell while leaving current learning logic intact.

**10.5C:** move the current dashboard into Home and add the Physics 7 browser.

**10.5D:** extract/rebuild Practice from the current `index.html` state machine, preserving remediation and session watchdog behavior.

**10.5E:** extract Diagnostic and reskin/re-shell the existing Mastery Check; add Assessment hub.

**10.5F:** add Progress page, complete responsive/accessibility QA and run live student-account regression testing.

---

## 12. Phase A acceptance criteria

- [x] Current `web/` student/staff surfaces inventoried.
- [x] Primary student navigation frozen to Home / Physics 7 / Assessment / Progress.
- [x] Secondary task routes defined for Practice / Diagnostic / Mastery Check.
- [x] Utility/account routes separated from primary learning navigation.
- [x] Static multi-page routing strategy selected; no framework rewrite required.
- [x] Page/state contracts defined.
- [x] Component architecture defined.
- [x] CSS/token architecture defined.
- [x] Backend/state ownership boundary documented.
- [x] Responsive and accessibility architecture documented.
- [x] Migration sequence defined for 10.5B–F.
- [x] Low-fidelity layouts captured in `docs/sprint-10-5A-wireframes.md`.

## Decision

Sprint 10.5A deliberately chooses **evolution of the current static multi-page application**, not a React/Next/Vue rewrite. The current app is small enough that a framework migration would add delivery risk immediately before the closed pilot without improving the learning engine. Shared modules and CSS components are sufficient for this pilot-stage redesign.
