# Student My work clean-up — 9 November 2026

This is Phase 2d of the 7 November student design review: the My work page. John approved it on 9 November 2026 («Yes, then do next»).

The detailed My work findings from the 7 November review were not retained in the working record. The items below come from a fresh audit of the current page with the synthetic fixture at 390 px and 1280 px.

**Scope.** Shared core presentation for every subject, grade, school and release:
- `web/multi-subject-home.js` (My work course cards);
- `web/student-work-hub.mjs` and `web/student-work-list.mjs` (state counts);
- `web/student-forest.css`.

## Changes

| Item | Before | After |
|---|---|---|
| F1 gap under «Ուսուցչի առաջադրանքները» | An empty status line left about 56 px between the heading and the first item | The empty status line takes no space. It keeps `role="status"` and `aria-live`, so messages are still announced. |
| F2 toolbar on phones | 271 px:<br>• «Կատարելու», «Վերադարձված», «Ներկայացված» wrapped to two rows;<br>• the course filter took a row;<br>• «Թարմացնել» took a full-width row. | About 150 px:<br>• the three states share one row with the count under each label;<br>• the course filter and «Թարմացնել» share the next row.<br>Very narrow phones (about 320 px) still wrap the states. Desktop is unchanged. |
| F3 «Գրավոր աշխատանքներ՝ ըստ դասընթացի» cards | Repeated the Courses page's illustrated cards, about 310 px each on a phone | Compact cards:<br>• a small illustration tile beside the course name and class · school · year;<br>• «Բացել գրավոր աշխատանքները» and the unit list span the card.<br>About 230 px each on a phone; the large artwork stays on Courses. |

**Phone page height** (synthetic fixture with four current items and three courses, 390 px): 2,672 → 2,416 px. **Desktop** (1280 px): 1,860 → 1,636 px.

**Counts.** The count text is unchanged (« · 4», « · 3+»). Only the separator is now its own element, so phones can hide it when the number sits under the label.

**Not changed:**
- the work items;
- their actions and states;
- the cancelled-work history;
- the fallback source sections;
- the Courses page;
- navigation (Phase 3).

## Production acceptance audit (before merge)

**Resource suite** (`b123-usability-reads.mjs`). These hooks are kept, and a new regression clicks through them:
- `.amp-subject-card` filtered by its enrollment link;
- `.student-unit-links summary`;
- the unit's `tab=writing` link inside `.student-unit-links`;
- the return through `#courseCollectionLink` to `.amp-subject-card`.

**Writing delivery** (`writing-assignment-delivery-acceptance.mjs`): `[data-work-filter="…"]` buttons and `[data-wa-open]`, unchanged.

**Resource delivery and the custom-task script:**
- `[data-assignment-open]`, `[data-task-body] article` and `[data-task-open]`, unchanged.
- `workBucket` is still exported from `student-work-hub.mjs`. The new count helper touches the DOM only when called.

**Count text:** no production script reads it.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New Chromium regressions** in `tests/browser/student-home.browser.test.mjs`, both failing on the previous source:
  - **Phone layout (390 px):** the three states share one row with the count under each label; the course filter and refresh share a row; the first item is within 16 px of the list heading; the status region is kept; no horizontal overflow.
  - **Compact cards:** My work cards have no large artwork and are at most 275 px tall on a phone. The writing link spans the card, opens `tab=writing` without `action`, and the unit list opens to the exact unit's writing link.
- **Updated by design:** the subject-illustration test now expects the small illustration tiles (at least 60 × 40 px) on My work and keeps the 88 × 50 px floor on Courses.
- **Unchanged tests pass**, including the exact count texts in `student-work` and `student-teacher-tasks`.
- **Owner usability acceptance:** not given.

## Production verification (9 November 2026, designated QA fixtures)

- **Release:** PR445 merged at `7697175`, after the branch was brought up to date with the docs-only PR444 and every required check passed again.
- **`7697175`: 13/13 suites on the first attempt.** This includes Resource, whose B12.3 usability reads open My work, find the course card by its enrollment link, open the unit list, follow the unit's writing link and return to My work.
