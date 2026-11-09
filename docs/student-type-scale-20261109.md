# Student type and shape scale — 9 November 2026

This is Phase 5 of the 7 November student design review: the design system. John approved D1 and D3 as recommended on 9 November 2026 («Proceed as you recommend»). D2 (merging the remaining text sizes) was deferred, and D4 (merging token families and removing literal colours in shared stylesheets) was not taken up.

**Scope.** `web/student-forest.css` only, scoped to student pages. No shared stylesheet changes, so teacher, staff and admin pages are unchanged.

## Audit (rendered, synthetic fixtures)

Measured on every visible text element of Home, Courses, My work, the five course tabs and the learning player, at 390 and 1280 px.

| Measure | Before | Notes |
|---|---|---|
| Contrast below WCAG AA | 0 | Already sound |
| Text colours | 9 | One Forest palette |
| Font sizes rendered | 13 | 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 29.44, 32 px |
| Font weights | 5 | 500 used 4 times, 800 used 32 times |
| Corner radii | 9 | 8, 10, 10.4, 12, 13, 14, 16, 20 px, pill |

**Correction to the review.** The review's «about 25 font sizes» counted stylesheet declarations; most are overridden before they reach a student. About 175 literal colours and three token families (`--amp`, `--student`, `--hm`) remain in shared files. They are not visible to students and are not changed here (D4).

## Changes

**D1 — one size per heading level**, as student tokens:

| Level | Phone (≤ 640 px) | Larger screens |
|---|---|---|
| Page title | 24 px | 28 px |
| Section heading | 20 px | 22 px |
| Card heading | 18 px | 18 px |

Before, the same level used several sizes:
- page titles: 20, 29.44 and 32 px;
- tab banner titles: 24 and 28 px;
- section headings: 20 and 22 px;
- card headings: 17 and 18 px.

**Kept exceptions:**
- **Long course unit titles on phones** stay at 20 px (Phase 2c).
- **The learning player's compact title** stays at 18 px (Phase 1).
- **The unframed completed-work heading on phones** stays at 16 px (31 October). At 20 px, «աշխատանքներ» split across lines at 360 px with 200% text. The existing readability regression caught this, so the exception was kept.
- **The readiness figure («3 / 10»)** is a large number display (32 and 24 px), not a heading. It is unchanged.

**D3 — four corner sizes and three weights:**
- **Corners:**
  - 12 px for controls (buttons, button links, tab and filter items, icon tiles, the logo box), previously 10 or 14 px;
  - 16 px for cards and containers (header, tab bars, the My work filter, the course banner, the next-step card), previously 13, 14 or 20 px;
  - pill for badges (readiness and status badges, previously 10.4 px);
  - 8 px only for the skip link.
- **Weights:** answer options 500 → 600; phone menu labels 800 → 700.

## Result (same fixtures)

| Measure | Before | After |
|---|---|---|
| Font sizes rendered | 13 | 11. The remaining 13 and 15 px small text is D2, deferred; 24 and 32 px also appear as the readiness figure. |
| Font weights | 5 | 3 (400, 600, 700) |
| Corner radii | 9 | 4 (8, 12, 16 px, pill) |
| Contrast below WCAG AA | 0 | 0 |

## Production acceptance audit (before merge)

No production script reads font sizes, weights or radii. The Mobile suite only sets 100% and 200% text before its existing layout checks. The phone menu labels move from weight 800 to 700, which is narrower, so they cannot newly clip.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New Chromium regressions**, both failing on the previous source:
  - **Home, Courses and My work** at 390 and 1280 px: one page-title size, one section size, card headings 18 px, corners within 8/12/16 px/pill, weights within 400/600/700.
  - **The five course tabs and the learning player:** the same checks, with the course phone title at 20 px.
- **Existing readability regressions pass unchanged**, including history at 200% text, the BF-10 phone menu and Mastery rules at 200%.
- **Owner usability acceptance:** not given.

## Release and production verification (9 November 2026)

**PR CI.** `role-layout-browser` failed once in `supplementary-resources` at 360 px with 200% text, an overflow of the resource library page. It passed on re-run and five local runs.
- It had not failed in the previous 40 CI runs.
- The page measures identically on main and the branch (no overflow).
- It is recorded as a probable timing flake: the test resizes and measures before the phone menu settles.

**Release.** PR451 merged at `bd65885`.
- Vercel built it in seconds but did not assign `www.haiedu.am`/`haiedu.am` for over 15 minutes. All 12 waiting suites were cancelled, and with John's approval the build was promoted manually; the domains moved at 16:48:40 UTC.
- The following merge (`77b8b08`) switched on its own after about 7 minutes.
- John confirmed «Auto-assign Custom Production Domains» is enabled. The cause is presumed to be a slow domain assignment on Vercel's side; it is not confirmed.

**QA on `bd65885`: 12/13.**
- English Unit 3 first stopped in the release wait (production not yet switched) and passed on re-run.
- Chapter III failed 29/30 twice. The designated School A QA learner had completed the Chapter III diagnostic (16/16) and a practice session (8/8) by hand on 9 November, 19:03–19:17 Asia/Yerevan, and the suite required an incomplete baseline.
- No production script reads anything this change touches.

**QA after the Chapter III QA fix (PR452, `77b8b08`, same student pages): all 10 triggered suites passed.**
- Chapter III passed 123/123, including the completed-diagnostic browser branch on its first run.
- Mobile passed on re-run. A server slowdown (8–16 s responses) stopped its first isolation step before the negative controls.
