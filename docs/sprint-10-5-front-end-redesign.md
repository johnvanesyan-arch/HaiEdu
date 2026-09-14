# Sprint 10.5 — Student Experience & Front-End Redesign

## Purpose

Insert a focused front-end sprint between Sprint 10 (Security, Privacy & Administration) and Sprint 11 (Closed Physics Pilot).

The goal is to make the platform feel like a mature adaptive-learning product before we put it in front of pilot students and teachers.

The UX reference is **IXL's current product architecture and interaction model**: dashboard-first navigation, clear skill discovery, personalized recommendations, visible progress, focused practice, and separate assessment experiences. This is an inspiration target, **not a pixel-for-pixel clone and not a copy of IXL branding, icons, illustrations, wording, proprietary scoring, or trade dress**.

## Product direction

The front end should feel:

- structured rather than experimental;
- student-first and low-friction;
- visually calm but engaging;
- mastery-oriented rather than speed-oriented;
- suitable for Armenian schools;
- usable on desktop, tablet and phone;
- consistent across diagnostic, practice and mastery-check flows.

The existing deterministic learning engine, curriculum model, mastery model, security boundaries and Supabase data model remain authoritative. This sprint changes presentation and interaction, not educational truth.

---

## 1. Global application shell

Create one coherent application shell for authenticated users.

### Desktop/tablet

- Persistent left navigation rail.
- Compact top header.
- Main content canvas with consistent max width and spacing.
- Clear current location and page title.
- Student profile/account access separated from learning navigation.

### Proposed student navigation

1. **Home** — student dashboard / next steps.
2. **Physics 7** — chapter and skill browser.
3. **Assessment** — diagnostic and mastery checks.
4. **Progress** — skill mastery and chapter completion.

Future subjects should be able to appear in the same shell without redesigning the navigation model.

### Mobile

- Collapsible navigation / bottom navigation where appropriate.
- Practice screen optimized for one-question focus.
- No horizontal scrolling for core learning tasks.

---

## 2. Student Home dashboard

The signed-in student should land on the dashboard.

### Above the fold

- Greeting / learner identity.
- **Continue learning** card for an active session.
- **Recommended next skill** card when there is no active session.
- **Assessment status** card when a diagnostic or mastery check is due/available.

### Secondary sections

- Recommended skills.
- Recently practiced skills.
- Chapter progress.
- Current Physics 7 progress summary.
- Optional lightweight achievement/progress celebrations.

### Priority rule

The dashboard must answer one question immediately:

> **What should I do next?**

Backend recommendation logic remains the source of truth. The UI should not invent recommendations independently.

---

## 3. Physics 7 subject landing page

Build an IXL-style skill-discovery experience adapted to the Armenian Grade 7 Physics structure.

### Page hierarchy

`Physics 7 → Chapter → Topic → Skill`

For the current prototype, Chapter I is active and Chapters II–VI may be shown as unavailable / coming later until content exists.

### Skill rows/cards

Each skill should show:

- skill code;
- Armenian skill name;
- layer: Knowledge / Application / Reasoning / Transfer;
- current learning state;
- visible progress indicator;
- CTA such as **Practice**, **Continue**, or **Ready for check**.

### Student-facing mastery states

Use plain-language states instead of exposing raw Bayesian terminology:

- **Not started**
- **Needs support**
- **Developing**
- **Secure**
- **Verified** — after the relevant mastery check is passed

A 0–100 progress display may be used for readability, derived from the platform mastery score. It must be labelled as a **mastery/progress score**, not a percentage grade and not as IXL SmartScore.

---

## 4. Practice experience

The practice page should become the strongest part of the student experience.

### Layout

- Breadcrumb / back-to-skill navigation.
- Skill title and short objective.
- Progress / mastery indicator visible but secondary to the question.
- Large central question card.
- Answer controls with generous spacing.
- **Help** control available only in practice mode.
- Clear submit state.
- Immediate result state in practice mode.
- Explicit next action.

### Correct answer state

- Short positive confirmation.
- Updated progress/mastery state.
- Continue button.

### Incorrect answer state

- Clear but non-punitive feedback.
- Remediation/help panel.
- Explanation / worked example when available.
- Continue to an adapted next question.

### Help hierarchy

Preserve the existing three-stage remediation model:

1. Hint 1
2. Hint 2
3. Worked example

Help usage must remain server-authoritative and must continue to affect mastery evidence exactly as it does now.

### Do not add

- speed scoring;
- countdown pressure;
- punitive animations;
- leaderboards based on rapid answering.

The platform should reward durable mastery, not rushing.

---

## 5. Diagnostic experience

The diagnostic should visually resemble an assessment arena rather than ordinary practice.

### Requirements

- Distinct assessment header/theme while staying within the same design system.
- Explain the purpose before starting.
- Show question number / total.
- No hints.
- No correctness feedback after individual answers.
- Neutral **Answer recorded** transition.
- Clear completion screen.
- Results organized by skill, not only total score.
- Direct CTA to recommended next learning action.

The current Chapter I diagnostic remains 20 questions and must not be presented as a whole-Grade-7 diagnostic.

---

## 6. Mastery Check experience

Keep mastery checks clearly separate from practice.

### Pre-check state

- Explain eligibility.
- Display locked / ready / remediation-required state.
- Show the provisional pass rule without presenting it as a validated national standard.

### During check

- 20-question assessment flow.
- No help.
- No correctness feedback during the check.
- Progress indicator only.

### Result state

- Pass/fail outcome.
- Overall result.
- Per-skill breakdown.
- If failed: clear remediation plan and next required skill practice.
- If passed: mark Chapter I as **Verified / Complete**.

---

## 7. Progress page

Create a student-friendly progress view inspired by mastery-learning dashboards.

### Show

- Chapter I completion state.
- 10 skill rows/cards.
- mastery/progress score;
- evidence / practice history summarized in student language;
- latest diagnostic result;
- mastery-check status;
- recommended next action.

### Avoid

Do not expose internal alpha/beta evidence values or implementation-specific mastery-engine terminology to students.

---

## 8. Visual design system

Create reusable tokens/components before page-by-page polishing.

### Foundations

- spacing scale;
- typography scale;
- border radius system;
- elevation/shadow rules;
- semantic state colors;
- focus states;
- responsive breakpoints;
- button hierarchy;
- card patterns;
- form/input patterns;
- progress indicators;
- badges/status pills;
- feedback banners;
- navigation components.

### Visual character

Aim for the qualities that make IXL approachable — clean white space, strong hierarchy, friendly cards, visible progress, clear calls to action — while giving the Armenian platform its own visual identity.

Do not reproduce IXL logos, mascots, illustrations, proprietary icons, exact color palette, SmartScore mountain, wording, or page composition.

---

## 9. Armenian-first localization

The redesign must be built around Armenian text rather than treating Armenian as a translated afterthought.

Acceptance requirements:

- Armenian labels never overlap or clip.
- Long Armenian skill names wrap predictably.
- Buttons tolerate longer strings.
- Numerals, units and physics notation render correctly.
- Russian and English can be added later without redesigning components.

---

## 10. Accessibility and interaction quality

Required before Sprint 11 pilot:

- keyboard-operable primary workflows;
- visible focus indicators;
- semantic labels for form controls;
- sufficient text/background contrast;
- no color-only mastery meaning;
- usable touch targets;
- reduced-motion-safe behavior for any celebrations;
- loading, empty and error states for every major page;
- session-resume behavior preserved.

---

## 11. Teacher-facing consistency

Do **not** rebuild teacher analytics in this sprint. Sprint 7 functionality remains intact.

Apply only enough shared shell/design-system work so teacher pages no longer feel like a separate prototype. Deeper teacher UX can be handled in a later dedicated analytics sprint.

---

## 12. Implementation sequence

### Phase A — UX architecture

- Inventory current `web/` pages and states.
- Define route/navigation map.
- Define component/tokens architecture.
- Produce low-fidelity layouts for Home, Physics 7, Practice, Assessment and Progress.

### Phase B — Design system

- Build shared CSS variables/tokens.
- Build shell, navigation, cards, buttons, progress and state components.
- Remove duplicated ad-hoc styling where safe.

### Phase C — Student dashboard + subject browser

- Redesign authenticated landing page.
- Add chapter/skill browser.
- Wire all states to existing backend responses.

### Phase D — Practice redesign

- Rebuild question presentation.
- Integrate help/remediation into the new layout.
- Preserve session watchdog and previous freeze regression fix.

### Phase E — Assessment redesign

- Diagnostic flow.
- Mastery-check flow.
- Result states.

### Phase F — Progress + responsive/accessibility QA

- Student progress page.
- Mobile/tablet behavior.
- Keyboard/contrast/focus QA.
- Cross-browser smoke testing.

---

## 13. Definition of Done

Sprint 10.5 is complete when:

- [ ] Student lands on a polished dashboard after sign-in.
- [ ] Global navigation is consistent across student pages.
- [ ] Physics 7 has a chapter/topic/skill browsing page.
- [ ] Active session and recommended next skill are obvious from Home.
- [ ] Practice has a focused question-card experience with integrated remediation.
- [ ] Diagnostic has a distinct assessment flow with deferred feedback.
- [ ] Mastery Check has locked/ready/active/result states in the new design system.
- [ ] Progress page clearly distinguishes diagnostic evidence, practice mastery and verified chapter completion.
- [ ] Existing grading, mastery, recommendation, security and session semantics are unchanged unless separately approved.
- [ ] No answer keys or privileged data are exposed by the redesign.
- [ ] Desktop, tablet and mobile layouts pass smoke tests.
- [ ] Armenian text passes clipping/overflow QA.
- [ ] Keyboard navigation and focus states pass basic accessibility QA.
- [ ] Existing Sprint 5 practice/remediation freeze regression remains fixed.
- [ ] CI passes.
- [ ] Live student-account browser QA passes before Sprint 11 begins.

---

## 14. Explicitly out of scope

- Reimplementing or copying IXL SmartScore.
- Copying IXL's brand identity or exact UI.
- Leaderboards or speed-based competition.
- Full awards/gamification system.
- New AI features.
- Rewriting the mastery engine.
- Expanding Physics content beyond the content roadmap.
- Full teacher-analytics redesign.

---

## Sprint placement

**Sprint 10 — Security, Privacy & Administration**

→ **Sprint 10.5 — Student Experience & Front-End Redesign**

→ **Sprint 11 — Closed Physics Pilot**

This placement is intentional: the pilot should test the learning system through a credible student experience rather than through the current prototype UI.