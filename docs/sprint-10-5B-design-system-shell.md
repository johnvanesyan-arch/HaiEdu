# Sprint 10.5B — Shared Design System & Student Application Shell

## Status

**Implemented.**

Sprint 10.5B establishes the reusable visual foundation and authenticated student shell that Phases C–F will build on. It intentionally avoids moving or rewriting grading, mastery, recommendation, remediation, session, role or security logic.

---

## 1. New shared CSS architecture

The student pages now load styles in this order:

1. `tokens.css` — semantic design tokens
2. `base.css` — document/type/focus foundations
3. `styles.css` — current legacy page rules, retained for compatibility
4. `ux.css` — Sprint 9 accessibility/responsive guards
5. `components.css` — reusable Sprint 10.5 component overrides
6. `student-shell.css` — authenticated navigation/layout shell

This order lets Sprint 10.5 progressively modernize the interface without a high-risk all-at-once rewrite of legacy selectors.

### Design-token groups

`web/tokens.css` now defines:

- semantic background/surface/text/border colors;
- primary, success, warning, danger, info and focus colors;
- spacing scale;
- typography scale;
- radius scale;
- elevation rules;
- application content/nav/header dimensions;
- minimum control target size;
- motion timing.

The tokens are platform-owned and intentionally do not reproduce IXL's proprietary palette or scoring visual language.

---

## 2. Shared component primitives

`web/components.css` provides reusable styling for:

- cards;
- notices;
- primary / secondary / quiet actions;
- links styled as controls;
- form controls;
- pills/status badges;
- progress indicators;
- feedback states;
- loading / empty / error states.

Semantic status styles include visible text-compatible states so color is not the only carrier of meaning.

---

## 3. Student application shell

`web/student-shell.js` + `web/student-shell.css` add the reusable student navigation shell.

### Desktop/tablet

- persistent dark left navigation rail;
- platform identity block;
- four frozen architecture destinations: Home, Physics 7, Assessment, Progress;
- privacy/account utility access separated from learning navigation;
- page canvas moves beside the navigation rail.

### Mobile

- four-destination bottom navigation;
- content remains single-column and free of shell-induced horizontal scrolling;
- the browsing navigation is suppressed during focused question work.

### Focused-task rule

The shell automatically hides primary browsing navigation when:

- `#practicePanel` is active on the current student page; or
- `#questionPanel` is active on the Mastery Check page.

This keeps question work focused while preserving the shell on dashboard/pre-check/result states.

---

## 4. Authentication and state behavior

The shell is presentation-only.

On `index.html`, it becomes active only when the existing `authPanel` is hidden by the current authentication logic. The shell does not create its own Supabase client and does not make authorization decisions.

On the existing authenticated Mastery Check route, the page opts into the shell with `data-shell-auth="always"`; the existing Mastery Check JavaScript remains responsible for assessment/auth behavior.

Role routing remains in `web/role-router.js`.

---

## 5. Route rollout safety

The architecture already reserves:

- Physics 7
- Assessment
- Progress

but those destination pages are intentionally not implemented until Phases C, E and F.

Therefore Sprint 10.5B renders those navigation entries as visible **disabled destinations** rather than shipping dead links. They will be enabled when the relevant route exists.

Home is the only active primary destination in 10.5B.

---

## 6. Existing pages upgraded

### `web/index.html`

Now loads the design-system cascade and student shell. Before sign-in, the authentication surface remains shell-free. After sign-in, the current dashboard gains the desktop/mobile application shell. When practice starts, the shell navigation is suppressed automatically.

### `web/mastery.html`

Now uses the shared tokens/components/shell. The pre-check/result states can use the browsing shell, while the active 20-question state suppresses navigation.

No assessment rules were changed.

---

## 7. Regression protection

`tests/student-shell.test.mjs` verifies:

- design-system cascade order on Home;
- shared design primitives on Mastery Check;
- the shell contains no Supabase/answer-key/mastery-engine ownership;
- future routes remain safely disabled until implemented;
- required token groups exist;
- desktop rail, mobile navigation and focused-task suppression exist.

CI also runs `node --check web/student-shell.js`.

---

## 8. Deliberately unchanged

Sprint 10.5B does **not** change:

- deterministic grading;
- mastery evidence or thresholds;
- prerequisite/recommendation logic;
- adaptive practice scheduler;
- remediation sequence or help evidence;
- diagnostic semantics;
- mastery-check eligibility or pass rules;
- role permissions;
- Supabase RLS;
- privacy/deletion behavior;
- content data;
- teacher analytics.

---

## 9. Acceptance criteria

- [x] Shared design tokens created.
- [x] Shared base styles created.
- [x] Reusable cards/buttons/forms/status/progress/feedback styles created.
- [x] Desktop authenticated student navigation rail implemented.
- [x] Mobile bottom navigation implemented.
- [x] Focused practice/assessment navigation suppression implemented.
- [x] Home shell activates only after existing authentication state indicates sign-in.
- [x] Mastery Check adopts the shared design system.
- [x] Privacy/account utility separated from primary learning navigation in the shell.
- [x] Unimplemented Phase C/E/F destinations are non-broken and disabled.
- [x] Existing educational/security logic remains authoritative and unchanged.
- [x] Automated design-system/shell regression tests added.
- [x] Browser JavaScript syntax gate includes `student-shell.js`.

## Next

**Sprint 10.5C — Student Home + Physics 7 browser** will use these primitives to:

- redesign Home around the next-action hierarchy;
- create the real `physics-7.html` route;
- enable the Physics 7 navigation destination;
- add Chapter I topic/skill discovery;
- show Chapters II–VI as unavailable until content exists.
