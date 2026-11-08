# Student course page clean-up — 9 November 2026

This is Phase 2c of the 7 November student design review: items D1, D2 and a reduced D3. John approved it on 9 November 2026.

**Scope.** Shared core presentation of the student course page (`web/course-page.js`, `web/student-forest.css`) for every subject, grade, school and release.

## Owner decision recorded with this change

**Home still never starts an attempt** (16.5B.1). On 9 November John chose to keep this rule rather than add a one-tap «Start» on Home. Home's next-step buttons («Անցնել ախտորոշիչին», «Անցնել վարժանքին», «Անցնել ստուգմանը») keep opening the course's assessments, where the student reads the rules and starts.

## Changes

| Item | Before | After |
|---|---|---|
| D1 title | `#courseTitle` «Course · grade · unit» (four lines on a phone for long units); subtitle «school · class · year · Թողարկում N» | `#courseTitle` is the unit title (three lines for the longest pilot title at 390 px). The subtitle reads «Course · grade · class · year», without school or release. |
| D2 chapter row | Horizontal chips on phones, cut off with no cue | The row fades the edge where more chapters are scrolled away, on either side, and updates as it scrolls. The selected chapter is still scrolled into view. |
| D3 (reduced) | The current-work card on the Course, Assessments and Progress tabs | It is not shown on Progress. It stays on Course and Assessments. |

**Why D3 is reduced.** The review proposed showing the current-work card and the section links on the Course tab only. Production acceptance depends on both elsewhere:
- **Section links:** English Units 1–3 and Mobile navigate Assessments → Progress → Guides → Writing through `.course-tabs a[href*="tab=…"]`, so every tab keeps them.
- **Current-work card:** Chapters II–VI and English 1–3 check `.course-active-session` and its `a.course-resume` on Assessments, so that tab keeps the card.

Hiding them would have broken nine production suites. The links also remain a useful way to move between sections.

**Side effect.** While practising (Phase 1), the subtitle is hidden, so the player now shows the unit title without the course name.

## Production acceptance audit (before merge)

- `#courseTitle` still contains `unitTitleHy` (Chapters II–VI, English 1–3, Mobile).
- `.course-tabs a[href*="tab=assessment|progress|guides|writing"]` exist on every tab.
- `.course-active-session` and `a.course-resume` are unchanged on Course and Assessments.
- `.course-chapters a[aria-current="page"]` is unchanged; only a CSS mask is added.
- No script reads `#courseSubtitle`.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New Chromium regressions** in `tests/browser/student-course-page.browser.test.mjs`, all failing on the previous source:
  - the unit-only title and the course · grade · class · year subtitle, with no release or school;
  - the title within three lines at 390 px;
  - the chapter-row fade before and after scrolling;
  - Progress without the current-work card, and every tab keeping all section links.
- **Updated by design:** three tests that looked for the course name in `#courseTitle` now read the subtitle or header (`learning-acceptance`, `request-isolation`, `student-home`).
- **Owner usability acceptance:** not given.

## Production verification (9 November 2026, designated QA fixtures)

- **Release:** PR441 merged at `cdfb321`.
- **`cdfb321`: 13/13 suites on the first attempt.** This includes Chapters II–VI, English Units 1–3 and Mobile, which read `#courseTitle` and navigate the course page's section links.
