# Student navigation shell clean-up — 9 November 2026

This is Phase 3 of the 7 November student design review: the navigation shell, meaning the header, desktop sidebar, phone bottom menu and account entry. John approved S1–S5 on 9 November 2026 («you have my green light»). The scope comes from a fresh audit of Home, Courses, My work and the course page at 390, 768 and 1280 px with the synthetic fixture.

**Scope.** Shared core presentation for every subject, grade, school and release:
- `web/student-mobile-navigation.mjs` and `web/student-shell.css` (phone menu);
- `web/student-shell.js` and `web/index.html` (header subtitle);
- `web/student-forest.css` (header actions, sidebar).

## Changes

| Item | Before | After |
|---|---|---|
| S1 phone bottom menu | Two rows with the icon above each label (10.9 px text): 157 px. That is 19% of a 390 × 844 screen. On 667 px-tall phones it exceeded BF-10's 20% limit and moved before the page content. | When the menu needs two rows, each link puts its icon beside the full label (12 px text, 48 px rows): 109 px. It stays fixed at the bottom at 390 × 844 (13%), 390 × 667 (16%), 360 × 640 (17%) and 320 × 568 (19%). The inline layout is used only when every label's longest word still fits whole; otherwise BF-10's stacked and in-flow layouts apply unchanged. |
| S2 header subtitle | «Ձեր ուսուցումը՝ քայլ առ քայլ։» under the title on Home, Courses and My work | Removed for signed-in students. The signed-out landing keeps its subtitle. |
| S3 desktop header (≥ 1101 px, sidebar showing) | «Դուրս գալ» and «Իմ հաշիվը» in the header and again in the sidebar. The course page repeated «Իմ հաշիվը». | The header copies are hidden while the sidebar shows; the sidebar keeps both. They stay in the page and reappear when the sidebar is hidden (a focused task or the learning player). |
| S4 tablet header (761–1100 px) | The two header buttons wrapped under the title: Home header 184 px | Buttons on the title row: Home header 90 px. On the course page: 175 → 159 px. |
| S5 sidebar labels | «Իմ աշխատանքները» and «Նյութերի գրադարան» wrapped to two lines | Slightly smaller text (15 px) and tighter padding; all four labels fit on one line at 1101 and 1280 px. |

**Header heights (Home):** phone 84 → 74 px; tablet 184 → 90 px; desktop 114 → 90 px.

**Not changed:**
- **The course page's «Դասընթացներ» back link.** It returns to My work when the student came from there, and the Resource suite clicks it. On desktop it still sits under the long unit title, so that header stays 184 px.
- **The phone label «Գրադարան».** The short form fits small phones.
- **The menu's destinations, links, order and current-page marking.**
- **The enlarged-text and short-screen fallbacks of BF-10.** A menu taller than 20% of the screen still moves into the page flow, and text-only labels still apply when icons do not fit.

## Production acceptance audit (before merge)

**Mobile suite.** The Mobile suite runs `scripts/mobile-navigation-layout.mjs` on the live menu. It requires:
- four destinations;
- tap targets of at least 44 px;
- no clipped or split word;
- a fixed menu no taller than 20% of the screen, with its height reserved.

The new layout passes it at every size above. The existing BF-10 regression also passes: 9 widths × 100% and 200% text.

**Other scripts.** The only other shell hook in a production script is the sidebar's current-page text (`.amp-nav-link[aria-current=page]`, B12.3), which is unchanged. No script reads the header buttons, the tagline or the new `data-inline` attribute.

## Verification (isolated, synthetic fixtures — not a live production check)

**New Chromium regressions** (`tests/browser/student-home.browser.test.mjs`), all failing on the previous source:
- **Phone menu:** at 390 × 844, 390 × 667, 360 × 640 and 320 × 568 the menu is fixed and inline. It is at most 120 px and 20% of the screen, with the icon beside each label, text of at least 12 px and links of at least 44 px. `mobileNavigationLayout` reports no errors.
- **Tagline:** Home, Courses and My work show no tagline.
- **Desktop header:** at 1101 and 1280 px, no header sign-out or account button; the sidebar has both; the four sidebar links are equal-height single lines.
- **Tablet header:** at 768 px the header actions sit on the title row and the header is at most 110 px.

**Bug found and fixed during development.** A layout pass measured words while the previous pass's inline styling was still applied. At 320 px with 200% text, this let the in-flow menu keep its icons and overflow by 9 px. The pass now measures in the stacked state first, as before. The BF-10 enlarged-text regression covers it.

**Owner usability acceptance:** not given.

## Production verification (9 November 2026, designated QA fixtures)

- **Release:** PR447 merged at `51a2e0a`. Before merging, main was unchanged since PR446 and no workflow was running. John said «you do it» without confirming the Codex question, and Codex activity cannot be seen from this session.
- **`51a2e0a`: 13/13 suites.**
  - **Mobile** passed on the live menu for both schools, as student and as teacher, at 390 and 430 px.
  - **Chapter V** was first in the queue. Its first attempt stopped in the release wait during the deploy switch-over («Production browser manifest does not match the reviewed source»), before any check ran. It passed 191/191 on re-run.
  - **The other eleven suites** passed on the first attempt.
