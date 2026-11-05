# Student phone header and evidence badge — 5 November 2026

This is the Sprint 16.5B refinement that follows the course page (#413) and My work (#416) changes. John approved both items on 5 November 2026.

**Scope.** It is shared core and applies to every subject, grade, school and release:
- the header change affects every Forest student learning page (pages with `data-haiedu-student` or `data-forest-surface`, without `data-student-utility`) on phones up to 640 px;
- the badge change affects the course page skills list.

Utility pages (account, privacy, access) keep their own header layout.

## Changes

| Area | Before (375 px) | After |
|---|---|---|
| Header on Home, Courses, My work | 165 px: account button on its own row below the title | 84 px on Home and Courses (115 px on My work, where the title wraps); account button beside the title |
| Header on course page | 355 px: full-width «Դասընթացներ» button and account button on separate rows; title 22.4 px on 4 lines | 228 px: back link and account share one top row; title 20 px |
| Header on Materials | 230 px | 154 px, same pattern |
| Course page, secondary sections | In the section navigation, before the current work | «Ուղեցույցներ · Գրավոր աշխատանքներ · Նյութերի գրադարան» in a second `nav.course-tabs` («Լրացուցիչ բաժիններ») directly after the current work, as in the mockup. Links, URLs and `.course-tabs` helpers are unchanged. |
| Course page spacing (≤ 640 px) | 24 px gaps; 3-line chapter chips; roomy current-work card | 16 px gaps; smaller chapter chips; tighter current-work padding |
| Skill badge with too few answers | «Ամրապնդում է պետք» (needs strengthening) | «Դեռ քիչ պատասխաններ» (too few answers yet), neutral colours |

**Result.** Measured with the synthetic fixture, the course page's «Շարունակել» button is now fully visible above the bottom navigation at 375 × 812 and 360 × 780:

| Viewport | Before #413 (top of button) | After #413 | Now (top–bottom of button) | Mobile nav starts at |
|---|---|---|---|---|
| 375 × 812 | 1,527 px | 860 px | 586–636 px | 727 px |
| 360 × 780 | 1,582 px | 912 px | 586–636 px | 695 px |
| 320 × 700 | 1,656 px | 992 px | 692–742 px | 615 px |

**Limitation:** on very small phones (320 × 700) the button is still about 130 px below the first screen.

**Badge rule: no new threshold.** The badge shows the server's existing mastery status, `insufficient_evidence`:
- the shared mastery service (`supabase/functions/_shared/mastery.ts`) sets this status below 3 answers;
- governed analytics configurations set it through their `minimumEvidenceCount`.

The browser applies no answer-count rule of its own. Server readiness (`ready: true`) always wins. Readiness criteria, gates and scoring are unchanged.

## Verification (isolated, synthetic fixtures — not a live production check)

- **Course page:**
  - back link and account on one row;
  - header ≤ 240 px;
  - «Շարունակել» fully above the mobile navigation at 375 × 812;
  - secondary links directly after the current work;
  - a skill with `insufficient_evidence` shows the neutral «Դեռ քիչ պատասխաններ» badge, while a weak skill still shows «Ամրապնդում է պետք».
- **My work:** account button beside the title; header ≤ 120 px; target of at least 44 px.
- **Unit:** the badge mirrors the server status, never overrides `ready: true`, and applies no browser threshold.
- **New tests on old source:** all three new browser tests fail on the previous source and pass on this change.
- **Owner usability acceptance:** not given. **Live production check:** not performed.
