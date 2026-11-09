# Student results presentation — 9 November 2026

This is Phase 4 of the 7 November student design review: how results and progress are shown to students. John approved R1–R6 on 9 November 2026 («Yes, build R1–R6»). He also asked whether the per-card «Սկզբնական տարբերակները» fold-out was clutter; on inspection it lists eight internal IDs, so it is removed from student pages. The scope comes from a fresh audit of the course page's Course, Assessments and Progress tabs at 390 and 1280 px with the synthetic fixture.

**Scope.** Student pages only:
- `web/assessment-reporting.mjs` (new optional student filter);
- `web/course-page.js`;
- `web/learning-player.mjs` (end-of-session result);
- `web/student-course-presentation.mjs`;
- `web/student-forest.css`.

Teacher and school views call the shared result renderer without the new option and are unchanged.

## Changes

| Item | Before | After |
|---|---|---|
| R1 skill bars | Every bar was the same green. A 72% skill marked «Ամրապնդում է պետք» looked like a 73% skill marked «Պատրաստ է». | The bar takes the colour of the server's readiness status: success for ready, attention for needs strengthening, muted otherwise. Readiness is not a percentage cut-off, so the bar no longer suggests one. |
| R2 phone Progress rows | About 200 px each: the name, the evidence, the bar and the status chip on separate lines | The name has its own line; the status chip and the evidence share the next. The cells can shrink and wrap at 200% text. Course-tab rows, which carry a «Վարժանք» link, keep their existing layout. |
| R3 groups with nothing assessed | Every completed-work card added «Այլ հմտություն՝ Չի գնահատվել» | Omitted on student pages (history, baseline, end-of-session screen). Teachers keep every group. |
| R4 repeated Mastery score | «Ստուգարքը չի անցել · 22.39/28 միավոր · 80%» and the same numbers again in «Պարտադիր հմտություններ՝ …» | The pass-determining line is dropped only when it is the **only** remaining group and repeats the score exactly. Beside other assessed groups it stays, because its label says what the score covers. |
| R5 explanations on Progress | A banner paragraph plus two scope paragraphs before the skills; the baseline in a separate card | The baseline result sits in the Progress banner. The scope notes fold into «Ինչի մասին են այս ցուցանիշները». |
| R6 skill codes | «MATH8-U02-S01 — Կիրառական …» | The skill name only. The code appears small after the name only when two skills in the list share a name. |
| Provenance fold-out | «Սկզբնական տարբերակները» on every student card, listing release, session, question-set, rules-binding, model, code build and attempt-policy IDs and the origin status | Removed from student pages. The data is still stored and returned by the API. |

**Phone page heights** (synthetic fixture: 10 skills, 3 completed sessions):
- Progress: 4,135 → 3,066 px;
- Assessments: 2,623 → 2,370 px;
- Course: 2,363 → 2,314 px.

**Desktop:** Progress 2,444 → 2,100 px.

**Rules kept:**
- **No new or inferred outcomes.** Only the saved groups and the saved score are shown. A failed Mastery check at its pass percentage still shows no reason, because the saved result carries none; showing one would need the server to return it.
- **Unchanged:** the numbers themselves, including two-decimal points.
- **Unchanged:** the «Արդյունքների սահմանները» scope note on the history list and the mode cards' rules.

**Not included:** the recovered draft also renamed the end-of-session button «Թարմացնել արդյունքները» to «Վերադառնալ դասընթացին». That was not part of R1–R6 and is not included.

## How this phase started

A run of this session at 16:38–16:43 audited and partly built R1, R2, R3 and R5. Its conversation record was lost when the session's container restarted at about 16:47; its uncommitted files remained.
- **Kept aside first.** Those files were saved as a patch, main was restored, the audit was repeated against the live source, and John then approved the plan.
- **Reused after review.** The draft was then reused after a line-by-line review.
- **Corrections to the draft:**
  - its phone layout also caught the Course-tab rows (fixed: scoped to rows without a practice link);
  - it overflowed at 449 px with 200% text (fixed: cells may shrink and the badge may wrap);
  - its unrequested button rename was reverted.
- **R4 narrowed.** The first R4 also removed a labelled required-outcomes line beside other groups. An existing English Chapter test caught this, and R4 now applies only to a lone repeated group.

## Production acceptance audit (before merge)

The production scripts read:
- the mode cards (counts, question totals, «Պարտադիր վերջնարդյունքներ՝ 10 հարց» in the Mastery rules);
- `#courseHistoryTitle`;
- `[data-assessment-scope]` inside the Mastery card on the Assessments tab.

None of these changes. No script reads the history card contents, the provenance fold-out, the skill rows, `meter` elements or `.course-overview`.

## Verification (isolated, synthetic fixtures — not a live production check)

**Unit** (`tests/assessment-reporting.test.mjs`):
- student results drop unassessed groups and a lone group that repeats the score;
- a group that differs from the score stays;
- beside other assessed groups the required line stays;
- teacher output keeps both.

**New Chromium regressions** (`tests/browser/student-workspace.browser.test.mjs`), all failing on the previous source:
- bar colour follows the readiness status;
- phone Progress rows put status and evidence on one line under the name;
- skill names without codes, with codes only for duplicate names;
- Progress folds its explanations and shows the baseline in the banner;
- history cards carry no internal IDs and stay contained at 200% text.

**Updated by design:**
- the saved-Practice-cards test no longer opens the removed fold-out and checks the Mastery score appears once;
- the 200% provenance test now checks that the IDs are absent while the page stays contained.

**Owner usability acceptance:** not given.

## Production verification (9 November 2026, designated QA fixtures)

- **Release:** PR449 merged at `f7ba460`, after John's «Yes merge it». Main was unchanged and no workflow was running.
- **`f7ba460`: 13/13 suites.** Sprint 14 authenticated action QA was first in the queue. Its first attempt stopped in the release wait during the deploy switch-over («Production browser manifest does not match the reviewed source»), before any check ran, and it passed 206/206 on re-run. The other twelve suites passed on the first attempt, including Chapters II–VI and English Units 1–3, which read the mode cards, the session-history heading and the Mastery scope note on the course page.
