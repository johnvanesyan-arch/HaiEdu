# Student Home: completing the refinement mockup — 6 November 2026

This change continues the Sprint 16.5B Home refinement. PR412 delivered only the first part of the 5 November Home mockup («Գլխավոր · հեռախոս · առաջարկ», next step first). On 6 November John asked for the rest of the mockup. It is delivered in steps, cheapest and lowest-risk first.

**Scope.** Shared core presentation for every subject, grade, school and release. The greeting runs on every student page that loads `role-router.js`; the path block appears on the Home view only.

## Step 1 — greeting and unit path

| Area | Before | After |
|---|---|---|
| Home title | «Գլխավոր» | «Բարև, {display name}» from the student's own profile. It falls back to «Գլխավոր» when no name is set. «Դասընթացներ» and «Իմ աշխատանքները» are unchanged. |
| Unit path | Not shown | «Ձեր ուղին այս բաժնում»: Diagnostic → Practice → Mastery check for the selected unit. Each step shows its state: done, in progress, next, locked or not activated. It appears after the next step and before the selectors, and only once a unit is selected. |

**No extra requests.**
- The name comes from the profile read that `role-router.js` already makes for the role check. Only the `display_name` column is added to that request. The name is cleared on any account change.
- The path uses the same `get-student-dashboard` reply as the next step. A browser test asserts there is exactly one dashboard read.

**Same rules as the course page.** `homeLearningPath` (`web/student-home-model.mjs`) mirrors the course page's mode-card rules:
- practice is locked until the baseline exists;
- the mastery check opens only when all required skills are ready, or on a `mastery_retry_*_ready` lifecycle state, and is deferred while another session is active;
- a required review blocks the mastery check;
- `mastery_passed` and `mastery_failed_final` count as done.

It starts nothing and decides no eligibility of its own.

**Deliberate differences from the mockup:**
- **No diagnostic score** («16 / 20»). The course page only states that the diagnostic is complete, and assessment result reporting follows governed rules. Home does not add a second, unreviewed score display.
- **«բաժին» (unit), not «գլուխ» (chapter).** The heading is subject-neutral; English units are not chapters.
- **The greeting subtitle is unchanged.** The mockup's year · school · class line is already in the next-step card.
- **The two selectors stay** (course, then unit) instead of one picker. Production acceptance scripts depend on them.

## Step 2 — compact course cards, teacher feedback, desktop layout

John's decisions on 6 November:
- course readiness on the **selected course only**, with no extra request per course;
- **build** the feedback card, accepting one extra request.

| Area | Before | After |
|---|---|---|
| Home course cards | Large illustration, «Բացել դասընթացը», unit list | Compact card: subject initial, course, class · school · year, the same «Բացել դասընթացը» link and unit list. The selected course is outlined, marked «Ընտրված դասընթաց», and shows «Ստուգման պատրաստ x / y» with a meter. «Պատրաստ է ստուգման» appears when all required skills are ready. Other cards show no readiness. The Courses and My work views keep their full cards. |
| Teacher feedback | Not on Home | «Ուսուցչի արձագանք» card when work is returned for revision: a teacher task in `returned` or writing in `changes_requested`. It shows the count, the newest item and «Դիտել արձագանքը», which opens My work on «Վերադարձված» (`?view=work&show=returned`). It is hidden when there is nothing returned or on any failure. |
| Desktop (≥ 1024 px) | One column | Next step beside the unit path; course cards beside the feedback card. Either side widens when its partner is empty. Phones keep one column. |

**Requests.** Home now makes one `get-student-work` read (`{action:'inbox', payload:{state:'current'}}`) per load. There is still exactly one selected-unit dashboard read; BF-07's request-count test still shows two dashboard calls on Home.

**My work tab link.** `show=todo|returned|submitted` chooses the opening tab in both the combined list and the fallback sections. Unknown values open «Կատարելու».

**More deliberate differences:**
- **No «Ամրապնդում է պետք» chip on partly ready courses.** The count and meter already state it, and a course-level judgement is not a server status.
- **Reviewed (final) work is not feedback to act on.** Only work returned for revision appears, so old graded work does not keep the card visible forever.
- **The existing desktop sidebar is unchanged.** The live shell already has one; its contents, such as join-by-code and account at the bottom, are navigation, owned by BF-10.
- **«Բոլոր դասընթացները» is not added.** The bottom navigation already links to Courses.

## Production acceptance audit (before merge)

All production scripts that open Home were searched for the changed selectors, title and requests:
- none reads the Home `h1`, `#studentNextStep`, `.student-selection` or the new `#studentPath`;
- the profile request lists (`chapter-ii-pilot-read-acceptance.mjs`, `mobile-qa-policy.mjs`) check only `GET` on `/rest/v1/profiles`, so the added column is allowed.
- **Step 2:** Home's new `get-student-work` read would have been blocked by both shared request lists:
  - `allowedBrowserRequest`, used by Chapters II–VI, English Units 1–3 and written-work reads;
  - `mobileReadAllowed`, used by Mobile.

  Both now allow exactly that read through `studentWorkReadBody` (shared with PR422's Resource rule), with unit tests for accepted and rejected shapes. The Resource script already allowed it.
- **Trigger paths:** Chapters III–VI now depend on `scripts/student-work-qa-read.mjs` and on the `get-student-work` source that Home calls. Their workflows list these paths, so a change to either re-runs them (`check-browser-qa-triggers.mjs` passes).
- **Course cards:** the scripts' hooks are kept on Home's compact cards: `#mySubjects .amp-subject-card`, its single `summary`, and `.amp-subject-class-list a[href*="unit=…"]`.

## Verification (isolated, synthetic fixtures — not a live production check)

- **Unit:** `tests/student-home-model.test.mjs` covers every path state, including retry, required review, both final states, unknown readiness, unconfigured modes and the absence of scores.
- **Chromium** (`tests/browser/student-home.browser.test.mjs`):
  - greeting by display name and plain fallback;
  - three steps in the right order and states;
  - one dashboard read;
  - placement after the next step;
  - no horizontal overflow at 390 px.
- **Contrast:** step markers are 7.86:1 (white on accent) and 5.16:1 (success on success background); details 5.11:1 or higher.
- **Step 2 Chromium tests:**
  - compact cards keep their hooks;
  - readiness on the selected course only;
  - one dashboard read;
  - the feedback card's exact request, content and «Returned» link;
  - no card when there is nothing returned or the list fails;
  - desktop side-by-side placement and phone single column;
  - containment at 200% text.
- **Owner usability acceptance:** not given. **Live production check:** after merge.
