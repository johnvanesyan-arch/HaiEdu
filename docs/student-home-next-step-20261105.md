# Student Home: next step first — 5 November 2026

Sprint 16.5B refinement of the shared student Home (`index.html`, default view). Shared core; applies to every subject, grade, school and release because it changes only the order and presentation of governed data that Home already renders. Design reference: the owner-accepted Forest style guide v1.0, §2 "Give the current learning action the strongest emphasis", and the 5 November refinement canvas.

## Problem (observed)

Rendered from the repository with the synthetic `student-home-fixture` at 375 px, the continuation action («Շարունակել») sat about 1,400 px from the top. That is roughly two phone screens down, below:

- the pilot notice, styled as an attention/warning state;
- a decorative welcome banner;
- the course and unit selectors.

At 1280 px it was below the fold.

## Change

| Area | Before | After |
|---|---|---|
| Home order | Welcome banner → selectors → next step → courses | **Next step** (section heading «Ձեր հաջորդ քայլը») → selectors → courses |
| Decorative welcome on Home | Shown | Removed from Home only; unchanged on «Դասընթացներ» and «Իմ աշխատանքները» |
| No-selection guidance | «…վերևի ցանկերից» (lists above) | «…ստորև՝ ցանկերից» (lists below), matching the new order |
| Pilot notice on Home | Before all content | After all content (`.student-pilot-note`) |
| Student `.notice` style (Home, join, progress, Physics 7 legacy page) | Attention colours (`--student-attention*`) | Neutral context (`--student-quiet` background, `--student-muted` text, ink heading) |

**Not changed:** governed context, selection and URL behaviour, dashboard calls, readiness, scoring, assessment gates, navigation, logout, course cards, teacher/staff pages.

**Contrast** (computed with the WCAG relative-luminance formula):
- muted `#58695F` on quiet `#EEF1EB` is 5.11:1;
- ink `#23392F` on quiet is 10.85:1.

## Verification (isolated, synthetic fixture — not a live production check)

- **New Chromium regressions** in `tests/browser/student-home.browser.test.mjs`:
  - at 375 and 1280 px, the next step precedes the selectors and course cards;
  - no welcome banner on Home;
  - the pilot note follows the content and uses neutral colours;
  - the continuation action is visible in the first viewport, above the fixed mobile navigation;
  - the no-selection text points below;
  - the courses view keeps its welcome banner.
  
  All three new tests fail on the previous source and pass on this change.
- **Existing suites:** 183/183 pass locally across the student, Forest, workspace-usability, role-layout, account-signout and ux-startup browser suites. `scripts/check-browser-qa-triggers.mjs` passes.
- **Owner usability acceptance:** not given. **Live production check:** not performed.
