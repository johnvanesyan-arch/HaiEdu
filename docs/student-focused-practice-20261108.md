# Student focused practice — 8 November 2026

This is Phase 1 of the 7 November student design review: items E1 (practice without page clutter) and E2 (rules panel collapsed). John approved it on 8 November 2026.

**Scope.** Shared core presentation for every subject, grade, school and release. It applies to every governed learning-player session on the course page (practice, diagnostic, mastery check and chapter review), because they share `web/learning-player.mjs` and the `body[data-student-player=active]` state.

## Changes

| Area | Before | After |
|---|---|---|
| Course header while a session is open | Eyebrow, the full title (up to 4 lines at 20 px on phones, about 29 px on desktop), school/year subtitle, «Դասընթացներ» link | The title only, at 18 px (still the full unit title), plus «← Դասընթացի էջ». That link opens the same course page without `action`. An unfinished session stays resumable there, as before. |
| Section links while a session is open | Primary (Գնահատումներ · Դասընթաց · Առաջընթաց) and secondary (Ուղեցույցներ · Գրավոր աշխատանքներ · Նյութերի գրադարան) rows above the question | Hidden. They return as soon as the player closes or the student leaves. |
| Rules panel «Աշխատանքի կանոնները» | Open above every question | Open on question 1; collapsed from question 2. It can still be opened at any time; the content is unchanged. |

**Measured with the synthetic fixture** (practice, question 1, rules open):

| Viewport | Question heading: before → after | Submit button bottom: before → after |
|---|---|---|
| 390 × 844 | 616 → 366 px | 999 → 749 px (now on the first screen) |
| 360 × 640 | 668 → 391 px | 1,051 → 774 px |
| 1280 × 900 | 577 → 340 px | 960 → 723 px |

From question 2 the collapsed rules panel moves the question up by roughly another 100–130 px.

**Not changed:**
- the session, answer, retry, recovery and scoring logic;
- the identical-retry guarantee;
- button labels;
- hints;
- the menus' existing hiding while practising;
- the title text, which production acceptance reads through `#courseTitle`.

## Production acceptance audit (before merge)

- No production script opens the learning player or starts a session. None references `action=`, `#learningPlayer`, `.student-rule-details`, `start-learning-session` or `submit-answer`.
- `#courseTitle` is read by the Chapter II–VI, English 1–3 and Mobile scripts outside practice. Its text is unchanged; only its size changes, and only while practising.
- `#courseCollectionLink` is clicked by `b123-usability-reads.mjs` outside practice. It is hidden only while practising.
- The `.course-tabs` hooks used by the Mobile script are hidden only while practising.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New Chromium regressions** in `tests/browser/student-workspace.browser.test.mjs`, all failing on the previous source:
  - the question comes first at 360, 390 and 1280 px, with the section links, eyebrow, subtitle and collection link hidden and the title kept;
  - the exit link keeps the unit and drops `action`;
  - the rules panel is open on question 1, collapsed on question 2, and openable either way;
  - leaving restores the course sections.
- **Existing focused-player regressions** (Mastery rules at 390/768/1280 and 200% text; the hidden-menu checks) pass unchanged.
- **Owner usability acceptance:** not given. **Live production check:** after merge.
