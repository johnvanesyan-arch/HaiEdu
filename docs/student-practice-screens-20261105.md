# Student practice screens: outcome and connection-lost states — 5 November 2026

This is the Sprint 16.5B refinement of the governed learning player (`web/learning-player.mjs`) and the shared answer-recovery presentation (`web/answer-response-recovery.mjs`). John approved it on 5 November 2026.

**Scope.** It is shared core and presentation only:
- the recovery panel applies to all five answer screens that use the shared helper (governed player, Home practice, practice, mastery check, diagnostic);
- the outcome colours and question header apply to the governed player.

**Design reference.** The 5 November refinement canvas: «Վարժանք · պատասխանից հետո» and «Վարժանք · կապը ընդհատվեց». Forest style guide v1.0 §Semantic states.

## Changes

| Area | Before | After |
|---|---|---|
| Question header | «Հարց x/y» | The skill name (from the existing session-item reply), then «Հարց x/y» and a thin progress bar. The bar is decorative (`aria-hidden`) because the text already states the position. |
| Outcome after an answer | Same neutral box for every result | Correct: success colours. Incorrect or partly correct: attention colours («more practice needed», not error red). Accepted without revealed result (diagnostic and mastery check): neutral. The wording, grading data and «Հաջորդը» button are unchanged. |
| Unknown answer outcome (lost reply) | Neutral box with the existing message | Attention colours, because the answer may have been recorded and this is not a failure. «Կապը ընդհատվեց» heading when no reply arrived at all. The existing BF-04 message is unchanged. Added line: «Ձեր պատասխանը մնում է այս էջում՝ անփոփոխ։». |
| Failed operation (known error) | Neutral box | Error colours with the existing message |
| After a successful retry | Not applicable | The recovery panel disappears with the result. |

**Not changed:**
- the answer request and retry logic;
- the identical-retry guarantee;
- control locking;
- button labels («Ուղարկել պատասխանը», «Կրկին փորձել», «Հաջորդը»), which tests and production acceptance scripts rely on;
- hints;
- focus handling (BF-11 remains with its owner);
- grading;
- scoring.

**Mockup items deliberately not built:**
- The difficulty chip («Դժվարություն 2 / 5») is internal item metadata; BF-32 covers removing learner-facing debug detail.
- The mockup's «Պատասխանը ճիշտ է ինքնուրույն» needs a hint-use signal that the answer reply does not provide, so the existing «Ճիշտ պատասխան։» wording stays.
- Showing the typed answer value inside the recovery panel is not built. The answer controls already keep the value visibly.

## Corrections included

- **Unclosed My work CSS block (live since PR417).** When the PR416 and PR417 stylesheet additions were merged, the closing brace of PR416's `@media (max-width: 420px)` block was lost. Browsers close the block at end of file, so every later rule (PR417's compact phone header and course spacing) applied only up to 420 px instead of 640 px. Phones of 360–420 px (all PR417 measurements) were unaffected; 421–640 px screens kept the previous header. The block is closed, and `tests/web-css-balance.test.mjs` now fails on any unbalanced web stylesheet (verified failing on the defective file).
- **Mobile production QA selector.** Since PR417 the course page has two `.course-tabs` navs (primary and secondary). The live mobile suite failed on Playwright strict mode at `expect(page.locator('.course-tabs')).toBeVisible()`. The check now targets the first nav; the tab clicks it performs are unchanged.

## Verification (isolated, synthetic fixtures — not a live production check)

- **New Chromium regressions** in `tests/browser/student-workspace.browser.test.mjs` (3 tests, all fail on the previous source):
  - skill name and progress bar;
  - correct outcome in success colour and incorrect outcome in attention colour, with the next button kept;
  - a lost reply shows the attention recovery with its heading and «kept» line, and keeps the chosen answer;
  - retry sends once more, then the recovery panel is replaced by the correct outcome.
- **Existing recovery suites** pass unchanged: native legacy pages, governed form and deadline recovery against real Edge/SQL fixtures.
- **Owner usability acceptance:** not given. **Live production check:** not performed.
