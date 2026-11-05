# Student course page: current work first — 5 November 2026

This is the Sprint 16.5B refinement of the shared student course page (`course.html`, `course-page.js`).

**Scope.** It is shared core and applies to every subject, grade, school and release. It changes only the order and presentation of governed data that the page already renders. No subject, grade or course-code condition was added.

**Design reference.** Forest style guide v1.0, §2 "Give the current learning action the strongest emphasis", and the 5 November refinement canvas (artboard «Դասընթաց · հեռախոս · առաջարկ»).

## Problem (observed)

The page was rendered from the repository with the synthetic `student-home-fixture` at 375 × 812 px. The current-work action («Շարունակել · Վարժանք») started:

- 1,527 px from the top with two chapters;
- 1,768 px from the top with six chapters.

That is two or more phone screens down, below:

- a full-width button per chapter;
- six equally weighted section buttons in a 2-column grid;
- a decorative banner (subject artwork and slogan).

On phones, the skills table scrolled horizontally.

## Change

| Area | Before | After |
|---|---|---|
| Section navigation (`nav.course-tabs`) | Six equal buttons | **Three primary sections** («Գնահատումներ · Դասընթաց · Առաջընթաց»), segmented, on one row from 360 px. **Secondary pill links** for «Ուղեցույցներ», «Գրավոր աշխատանքներ» and «Նյութերի գրադարան», in the same `nav` so the existing focus and readability helpers still apply. |
| Order on every tab | Navigation → banner → baseline → current work | Navigation → (banner, except on the course tab) → **current work** → baseline |
| Decorative banner, course tab | Shown | Removed. The readiness summary («N / M Պահանջվող հմտություններ») moves into the «Հմտություններ» section via the new `readinessSummary()`, so no evidence is lost. |
| Decorative banner, other tabs | Shown | Unchanged. Assessments, Progress, Guides and Written work keep their heading and description; Progress keeps the readiness meter. |
| Current-work card | Text only | Adds a progress bar for answered/planned. It is `aria-hidden` because the visible text already states the numbers. The link text («Շարունակել · {mode}») and `a.course-resume` are unchanged; the pilot acceptance scripts rely on them. |
| Skills (≤ 640 px) | Table with horizontal scroll | **One card per skill**: name, then evidence, then readiness badge and «Վարժանք» on one line. Column headings stay available to assistive technology only. Explicit ARIA table roles keep row and cell semantics where `display` changes would drop them. Wider screens still use the table. |
| Chapter links (≤ 760 px) | One full-width button per chapter | One horizontally scrollable row. The selected chapter is scrolled into view horizontally on load (no vertical page scroll). |

**Not changed:**
- URLs (`tab=assessment|course|progress|guides|writing`, `?action=`, `writingTask`);
- the chapter links, the legacy topics link and the history;
- the mode cards and their gating;
- the learning player;
- written work and guides mounting;
- dashboard calls, scoring, readiness and assessment gates;
- teacher and staff pages.

**Contrast** (WCAG relative-luminance formula):

| Pair | Ratio |
|---|---|
| White on accent `#285B45` | 7.86:1 |
| Accent on selected `#E3EEE5` | 6.60:1 |
| Ink `#23392F` on quiet `#EEF1EB` | 10.85:1 |
| Ink on white | 12.37:1 |
| Progress bar (accent vs divider `#DCE4DA`) | 6.04:1 |

## Result (same fixture, 375 × 812 px)

The current-work action now starts at 860 px with both two and six chapters (previously 1,527 px and 1,768 px). At 360 px it starts at 912 px (previously 1,582 px).

**Remaining limitation:** the action is still about 130 px below the first screen on an 812 px phone with the fixed bottom navigation. Most of the remaining space is the shared page header card (title, «Դասընթացներ» and account buttons, about 380 px). That header is shared with other student pages and was not changed here. Compacting it is a separate, cross-page decision.

## Verification (isolated, synthetic fixture — not a live production check)

- **New Chromium regressions** in `tests/browser/student-course-page.browser.test.mjs`:
  - three primary and three secondary sections, with correct URLs and current-page state;
  - no banner on the course tab;
  - current work directly after the navigation;
  - section targets of at least 44 px, unclipped, on one row at 375 px;
  - the decorative progress bar is hidden from assistive technology;
  - readiness shown in the skills section;
  - phone skill cards keep table/row roles, with badge and action on one line, and the desktop table is unchanged;
  - the other tabs keep their banner, and the secondary links show the current page;
  - a six-chapter course keeps one phone row with the selected chapter visible, without vertical scroll, and chapter navigation still works;
  - no learning session is started and no answer is submitted.

  All five fail on the previous source and pass on this change.
- **Unit test:** `readinessSummary()` matches the banner's evidence and is empty when readiness is unknown.
- **Existing suites and checks:**
  - the browser suites (`node --test tests/browser/*.test.mjs`) and the unit tests (`npm test`) are run before merge (see the PR);
  - `scripts/check-browser-qa-triggers.mjs` passes;
  - the immutable browser build is regenerated with `npm run build:web-assets`.
- **Owner usability acceptance:** not given. **Live production check:** not performed.
