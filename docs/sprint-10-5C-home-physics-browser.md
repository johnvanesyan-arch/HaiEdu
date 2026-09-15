# Sprint 10.5C — Student Home + Physics 7 Browser

## Objective

Turn the authenticated landing page into a clear **“What should I do next?”** dashboard and activate the first subject-discovery route:

`Physics 7 → Chapter → Topic → Skill`

This phase changes presentation/navigation only. Existing Supabase functions remain the source of truth for recommendation, active-session state, diagnostic evidence, mastery, mastery-check eligibility and session creation.

---

## 1. Student Home redesign

`web/index.html` remains the authenticated landing page and still hosts the legacy in-page practice/diagnostic panel until Phases D/E extract those activities into focused routes.

The signed-in Home hierarchy is now:

1. **Next recommended action** — highest visual priority.
2. **Chapter I progress** — completed/secure skill count.
3. **Latest Chapter I diagnostic** — explicitly separate from mastery.
4. **Mastery Check status** — locked / ready / active / remediation / verified.
5. **Physics 7 browser CTA**.
6. **Three-skill quick preview**.
7. Secondary diagnostic/practice entry cards.

The primary action is still driven by backend state. Home does not calculate its own mastery or prerequisite rules.

### Mastery-check integration

`web/home-dashboard.js` reads `get-mastery-check-status` and adjusts the primary Home action only when mastery-check state has priority:

- passed → show Chapter I verified result;
- active mastery check → resume it;
- eligible → offer the check;
- retry blocked → route to required remediation;
- active diagnostic/practice session → preserve the existing dashboard resume action.

This restores the cross-mode priority behavior without moving educational truth into the browser.

---

## 2. Physics 7 browser

New route:

`web/physics-7.html`

The page is authenticated and uses the shared student shell introduced in Sprint 10.5B.

### Active curriculum slice

**Chapter I — Բնության ուսումնասիրության ֆիզիկական մեթոդները**

The current provisional platform map is presented as five topic groups:

1. `PHY7-U01-T01` — Ֆիզիկայի ուսումնասիրման առարկան և ֆիզիկական երևույթները → S01–S02
2. `PHY7-U01-T02` — Ֆիզիկոսներ և հայ անվանի ֆիզիկոսներ → S03
3. `PHY7-U01-T03` — Դիտումներ, փորձեր և գիտական հետազոտություն → S04–S05
4. `PHY7-U01-T04` — Ֆիզիկական մեծություններ և չափումներ → S06–S09
5. `PHY7-U01-T05` — Չափման փորձ և խնդիրների լուծում → S10

This grouping is derived from the existing provisional Chapter I curriculum architecture and textbook mapping. It does **not** create or imply new official 2026 learning outcomes.

### Chapters II–VI

The browser also shows textbook chapter titles for orientation, but clearly marks them unavailable until their platform content is built:

- Chapter II — Նյութի կառուցվածքը
- Chapter III — Մեխանիկական շարժում
- Chapter IV — Մարմինների փոխազդեցությունը
- Chapter V — Աշխատանք և հզորություն
- Chapter VI — Ճնշում. ճնշումն առօրյա կյանքում և տեխնիկայում

No student can start unpublished skills from these chapters.

---

## 3. Skill-row contract

Each Chapter I skill row shows:

- stable skill code;
- Armenian skill name;
- layer: Knowledge / Application / Reasoning / Transfer;
- latest diagnostic evidence, if available;
- student-facing mastery/progress score;
- state label;
- next action.

Student-facing states are:

- **Չսկսված** — Not started
- **Աջակցություն է պետք** — Needs support
- **Զարգացող** — Developing
- **Ամրապնդված** — Secure
- **Հաստատված** — Verified after a passed Chapter I Mastery Check

The displayed 0–100 mastery value is labelled as a **mastery/progress score**, not a percentage grade. Raw Bayesian alpha/beta values remain hidden.

---

## 4. Session-safe actions

A student can start an incomplete skill directly from the Physics 7 browser.

Flow:

`Physics 7 skill → start-learning-session(targetSkillId) → Home ?resume=1 → resume active practice`

The browser will not silently destroy a current learning task:

- same active practice skill → **Continue**;
- different active practice skill → new skill actions disabled until current session ends;
- active diagnostic → practice actions disabled;
- active mastery check → browser points the student back to the mastery check.

This preserves the bounded-session model and avoids accidental mode switching from the skill browser.

---

## 5. Navigation change

The permanent student navigation now exposes:

- Home — enabled
- Physics 7 — **enabled in 10.5C**
- Assessment — disabled until 10.5E
- Progress — disabled until 10.5F

The shell remains presentation-only and contains no Supabase grading/mastery logic.

---

## 6. Files

### Added

- `web/home.css`
- `web/home-dashboard.js`
- `web/physics-7.html`
- `web/physics-7.css`
- `web/physics-7.js`

### Updated

- `web/index.html`
- `web/student-shell.js`
- `web/components.css`
- `.github/workflows/ci.yml`
- `tests/student-shell.test.mjs`

No database migration or Edge Function deployment was required.

---

## 7. Security / educational-truth boundary

The new browser does not receive answer keys and does not use service-role credentials.

The page consumes existing authenticated Edge Functions:

- `get-student-dashboard`
- `get-mastery-check-status`
- `start-learning-session`

The browser does not independently determine:

- correctness;
- mastery updates;
- prerequisite eligibility;
- recommendation ordering;
- mastery-check pass/fail;
- session authorization.

---

## 8. QA and regression coverage

Automated tests cover:

- Home design-system load order;
- next-action-before-summary hierarchy;
- Physics 7 route enabled while Assessment/Progress remain disabled;
- Chapter/topic/skill browser presence;
- S01–S10 mapping presence;
- use of authenticated dashboard/mastery/session endpoints;
- absence of answer-key/service-role data;
- separation of diagnostic, practice mastery and verified completion.

CI also syntax-checks:

- `web/home-dashboard.js`
- `web/physics-7.js`

---

## 9. Known transitional state

Sprint 10.5C intentionally does **not** extract practice or diagnostic out of `index.html` yet. Those workflows remain functional in the legacy Home page state machine so we do not rewrite multiple session flows at once.

Next phases:

- **10.5D** — focused Practice redesign/extraction while preserving remediation and session-watchdog behavior.
- **10.5E** — Assessment hub + dedicated Diagnostic + Mastery Check redesign.
- **10.5F** — dedicated Progress page + final responsive/accessibility/live-browser pilot QA.

This staged migration reduces regression risk before the closed Physics pilot.