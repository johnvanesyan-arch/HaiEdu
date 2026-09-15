# Sprint 10.5F — Progress + Responsive / Accessibility QA

## Objective

Finish the student-facing redesign before the closed Physics pilot by adding a dedicated Progress page and hardening the student experience for Armenian text, mobile/tablet layouts, keyboard navigation, focus visibility, touch interaction and regression safety.

This phase does **not** change grading, mastery, diagnostic, recommendation, session, remediation or security truth. It renders the existing server-authoritative state.

---

## 1. Student Progress page

New canonical route: `web/progress.html`.

The page deliberately keeps three forms of learning evidence separate:

1. **Diagnostic evidence** — latest bounded Chapter I diagnostic result and per-skill 0/2–2/2 evidence.
2. **Practice mastery/progress** — the existing 0–100 learner-facing mastery/progress score plus a plain-language summary of recorded practice responses.
3. **Verified completion** — only after the independent Chapter I Mastery Check passes.

The page never exposes Bayesian alpha/beta values and explicitly states that the mastery/progress score is **not a school percentage grade**.

### Summary cards

- Chapter I progress / verification state
- Latest Chapter I diagnostic
- Mastery Check state

### Skill rows

Each of the 10 skills shows:

- code and Armenian name;
- Knowledge / Application / Reasoning / Transfer layer;
- student-facing learning state;
- latest diagnostic result and band;
- mastery/progress score;
- recorded practice-response count in student language;
- context-safe action.

### Recommendation

The next-action card follows backend/session state in this priority:

1. verified Chapter I result;
2. active learning/assessment session;
3. no diagnostic yet;
4. required remediation before Mastery Check retry;
5. Mastery Check eligibility;
6. backend-recommended practice skill;
7. Physics 7 browser fallback.

The Progress page does not create its own prerequisite or mastery rules.

---

## 2. Navigation completion

Sprint 10.5F enables the fourth permanent student destination:

- Home
- Physics 7
- Assessment
- **Progress**

All four routes now exist.

Focused Practice, Diagnostic and Mastery Check remain secondary task routes and continue to suppress browsing navigation while a question is active.

---

## 3. Responsive hardening

QA target widths:

- wide desktop: >= 1280 px
- compact desktop / tablet landscape: 821–1279 px
- tablet / mobile: <= 820 px
- narrow phone: <= 560 px
- very narrow phone: <= 390 px

### Shared shell requirements

- no horizontal scrolling for core learning tasks;
- fixed desktop rail does not cover content;
- four-item mobile navigation tolerates Armenian labels;
- bottom navigation respects device safe-area insets;
- topbars and action rows wrap instead of clipping;
- cards and grid children use `min-width: 0` where long Armenian text could overflow;
- focused task pages remain single-column on small screens.

### Progress-specific responsive behavior

- 3-column summary -> 1 column on tablet/mobile;
- 4-part skill rows -> 3-column intermediate layout -> 2-column tablet layout -> 1-column narrow phone layout;
- action buttons become full-width when space is constrained;
- legend wraps and becomes a compact grid on phones.

---

## 4. Accessibility hardening

Required behaviors:

- skip-to-main link from the shared UX layer;
- visible `:focus-visible` outline for links, buttons and form controls;
- minimum 44 px practical interactive target size;
- no color-only skill status: text labels accompany semantic colors;
- form controls have visible labels and/or explicit accessible names;
- progress bars include `role=progressbar`, minimum/maximum and current values;
- asynchronous status/error areas use appropriate `role=status`, `role=alert` or `aria-live` semantics;
- reduced-motion media query disables nonessential movement;
- forced-colors mode retains borders/status readability;
- long Armenian strings wrap rather than clip;
- assessment/practice question transitions place keyboard focus on the new task/result heading where implemented.

---

## 5. Cross-page route cleanup

The final redesign removes transitional route assumptions left from earlier 10.5 phases:

- active Diagnostic links go to `diagnostic.html`, not legacy Home query-state URLs;
- Assessment and Progress are permanent enabled shell destinations;
- student terminology/localization detection includes all new student routes;
- legacy Home question markup may remain temporarily for regression safety, but intended Practice and Diagnostic entry points no longer depend on it.

This is deliberate: deleting the old Home state machine immediately before pilot QA would create avoidable regression risk without improving the pilot experience.

---

## 6. Automated QA

Static regression tests cover:

- permanent navigation routes enabled;
- Progress route uses shared design system and has explicit loading/error states;
- Progress distinguishes diagnostic / practice mastery / verified completion;
- no privileged key/answer-key references in Progress code;
- all dedicated assessment/practice pages retain viewport metadata and focused-task semantics where appropriate;
- Armenian overflow/responsive breakpoints are present;
- focus-visible, reduced-motion, forced-colors and minimum-control-size rules remain present;
- Diagnostic/Practice collision links use canonical dedicated routes;
- browser JavaScript syntax checking includes `progress.js` and other Sprint 10.5 modules.

---

## 7. Validation boundary

Repository CI can validate source-level regressions, syntax and deterministic tests. A true cross-browser visual smoke test with a real authenticated student account still requires an interactive browser session. Do not mark that specific gate as passed based only on CI.

Before Sprint 11 begins, perform the live pilot-account matrix documented in this file:

| Device/browser class | Required smoke flow |
| --- | --- |
| Desktop Chromium | sign in -> Home -> Physics 7 -> Practice -> Assessment -> Diagnostic/Mastery state -> Progress |
| Desktop Firefox/Safari-class browser | Home/nav + one Practice question + Progress |
| Tablet width | Home + Physics browser + Assessment hub + Progress; verify no clipping |
| Phone width | four-item bottom nav + Practice question + Diagnostic question + Progress skill rows |
| Keyboard-only | skip link -> primary nav -> CTA -> answer controls -> submit -> next; visible focus throughout |

### Armenian text checks

Verify particularly long labels and names at 320–390 px widths:

- `Բնության ուսումնասիրության ֆիզիկական մեթոդները`
- `Ֆիզիկական մեծություններ, միավորներ և չափիչ սարքեր`
- `Չափման փորձի պլանավորում և անկանոն մարմնի ծավալի որոշում`
- `Գաղտնիություն և հաշիվ`
- `Աջակցություն է պետք`

No label may overlap another control or be clipped without an accessible full name.

---

## 8. Definition of done for code implementation

- [x] Dedicated Progress route added.
- [x] Diagnostic / practice mastery / verified completion visually distinct.
- [x] Progress recommendation follows server state.
- [x] Progress navigation enabled.
- [x] Responsive layouts defined through narrow phone widths.
- [x] Armenian overflow protections strengthened.
- [x] Shared accessibility rules retained/strengthened.
- [x] Transitional Diagnostic route references cleaned up.
- [x] Automated regression tests expanded.
- [x] Browser JS syntax checks expanded.
- [ ] Live authenticated cross-browser/device smoke matrix completed.

The final unchecked item is an explicit pre-Sprint-11 operational gate, not something repository CI can prove.
