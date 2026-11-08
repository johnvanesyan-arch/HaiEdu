# Student Home and Courses clean-up — 8–9 November 2026

This is Phase 2a of the 7 November student design review: items B1–B6, B8, B9, C1 and C2. John approved it on 8 November 2026.

**Scope.** Shared core presentation for every subject, grade, school and release: student Home and the Courses view (`web/multi-subject-home.js`, `web/student-home-model.mjs`, `web/student-forest.css`).

## Changes

| Item | Before | After |
|---|---|---|
| B1 next step | Without a session: «Ձեր հաջորդ ուսումնական քայլը» / «Բացել դասընթացը» | The card names the step from the unit path's rules:<br>• diagnostic still to do: «Սկսեք ախտորոշիչից» (with its question count) → «Անցնել ախտորոշիչին»;<br>• practice open: «Շարունակեք վարժանքով» → «Անցնել վարժանքին»;<br>• mastery check available: «Կարող եք անցնել յուրացման ստուգմանը» → «Անցնել ստուգմանը».<br>Otherwise it is unchanged. |
| B5 diagnostic-first label | «Դիտել գնահատումները» | «Անցնել ախտորոշիչին» when the diagnostic is configured; «Անցնել գնահատումներին» when it is not |
| B2 hero | White card with a green left rule | The page's one pale-green hero card (style guide `hero`), with hero ink and muted text |
| B3 readiness | A readiness ring inside the next-step card, the path, and the selected course card | The ring is removed. Readiness stays in the path and on the selected course card (John's 6 November choice). |
| B4 context | Three lines: course · unit, then school · class · year | One line: course · unit |
| B6 dropdowns | «Course · class · school» and «Unit · Թողարկում N» | The course and unit names only. Class and then school are added only when two of the student's courses would read the same; the release is added only when two units share a title. |
| B8 join link | Inside the «Իմ դասընթացները» heading row | After the course list: «Ուսուցիչը տվե՞լ է նոր դասարանի կոդ։ Միանալ դասարանին» (Home and Courses; not on My work) |
| B9 Home course cards | A letter tile | The subject illustration in a small tile |
| C1 Courses | A decorative welcome banner first | It opens on «Իմ դասընթացները» |
| C2 Courses cards on phones | Artwork (about 150 px) above the text | Artwork beside the course text; the open link and unit list span the card |

**Deliberate limits:**
- **Home still never starts an attempt** (16.5B.1, `docs/student-home-implementation.md`). Every next-step button is an entry link to the course's assessments, so a one-tap start from Home would need an owner decision to change that rule.
- **Very long unit titles can still be truncated inside the unit dropdown.** This is the native select control; the titles themselves are long.
- **The navigation** (BF-10's two-row phone menu) is unchanged.

**Measured with the synthetic fixture:** the Courses view on a 390 px phone is 1,526 px tall. There is no horizontal overflow, the minimum text size is 12 px, and there are no page errors on Home (selected, diagnostic-required, empty) or Courses at 390 and 1280 px.

## Production acceptance audit (before merge)

- No production script reads the next-step card, its texts, the dropdown option labels, the join link or the Courses banner.
- `selectOption` occurs only on teacher pages (`#rosterSchool`, `#teacherUnitFilter`).
- **Course card hooks are unchanged:**
  - `#mySubjects .amp-subject-card` (chapter, English, Mobile and B12.3 scripts);
  - the enrollment and unit links inside it;
  - its single `summary`;
  - `.amp-subject-class-list a` with «unit · Թողարկում N» text, which is unchanged.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New regressions, all failing on the previous source:**
  - `tests/student-home-model.test.mjs`: every next-step case names its step, opens the assessment or course tab, and never carries `action`;
  - `tests/browser/student-home.browser.test.mjs`:
    - the concrete next step for diagnostic, practice, mastery-retry and active states;
    - entry links only;
    - one context line;
    - no ring;
    - the hero background;
    - short and distinguishable dropdown options;
    - the join hint after the list on Home and Courses;
    - the illustration on Home cards;
    - artwork beside the title on Courses at 390 px;
    - Courses opening on the list.
- **Updated by design:**
  - the Courses-banner test now expects no banner (C1);
  - the subject-illustration test keeps all nine distinct decorative illustrations, with a phone size floor of 88 × 50 px instead of 150 × 90 px (C2).
- **Owner usability acceptance:** not given.

## Production verification (9 November 2026, designated QA fixtures)

- **Release:** PR439 merged at `291250e`; the Vercel production deployment was READY.
- **`291250e`: 13/13 suites on the first attempt.** This includes Chapters II–VI, English Units 1–3, Mobile and B12.3 usability reads through Resource. Those suites open Home and Courses and use the course card hooks.
