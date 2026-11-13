# Teacher workspace fixes C1–C3 — 13 November 2026

John approved C1–C3 from the teacher cross-role design review on 13 November 2026 («Start with C1-C3»). The review, with measurements, the cross-role comparison and the remaining unapproved proposals, is [teacher-workspace-design-review-20261113.md](teacher-workspace-design-review-20261113.md).

**Scope.** Teacher pages only:
- `web/teacher.html`
- `web/teacher.css`
- `web/teacher-today.css`

School admin, master admin, content reviewer and student pages are unchanged. Shared stylesheets (`styles.css`, `components.css`, `role-layout.css`, `staff-forest.css`, `writing-assignments.css`) are unchanged, as are the JavaScript modules and teacher bundles, the backend and the content.

## Changes

| Item | Before | After |
|---|---|---|
| **C1** Assign writing picker | The class/unit card had 0 px inner padding at every width. Text and dropdowns touched the card edge, and on a 390 px phone the visible dropdown started 12 px outside it. Cause: `teacher.css` padded only `#teacherReviewRoot .teacher-review-picker`. | The same `clamp(16px, 2.4vw, 28px)` padding as the review picker, which shares the markup. |
| **C2** Writing mode switch («Դասընթացի գրավորները» / «Իմ կազմած աշխատանքները») | Before a class and unit were chosen, the container had the `hidden` attribute but `.wa-actions{display:flex}` showed it anyway. Two buttons appeared that did nothing when pressed. Once active, the selected mode had `aria-pressed="true"` but looked the same as the other mode. | The container stays hidden until a class and unit exist. The selected mode uses the same accent style as the review state filters, and the hover state does not hide it. |
| **C3** Duplicate page titles | Profile: H1 and H2 «Իմ պրոֆիլը». Create: H1 and H2 «Նոր դասարան». Archive: H1, H2 and H3 «Արխիվացված դասարաններ», each with a label and a near-copy of the subtitle. | One H1 per view, as Classes has had since PR374. The repeated kicker, H2 and duplicate text are removed. Each view region is named by the page title. The archive's own sentence and the back links stay. |
| **C3** Heading outline | Card titles under those views were H3 directly after the H1. | Card titles are H2 with the same visual size (18 px). The archive list title is now «Դասարանների ցանկ» instead of repeating the page title. |
| **C3** Tap targets | Home «Բոլոր դասարանները» link 26 px tall; the review and assign guide links 26 px; skill-matrix cells 43 px wide | All at least 44 × 44 px |

**Wording change for Armenian review.** «Դասարանների ցանկ» is new teacher-facing text. Every other text is unchanged or removed.

**Not changed:**
- the H1 and subtitle text of every view;
- the view routes, URL parameters, navigation, actions, permissions and requests;
- the content of the mode switch, the review and assignment flows, the class page and the matrix data;
- the kicker «ԻՄ ՊՐՈՖԻԼԸ» on the profile card;
- the shared phone menu and page-header layout (proposals A1/A2, not approved).

## Production acceptance audit (before merge)

`node scripts/check-browser-qa-triggers.mjs` passes. Its dependency map routes `web/teacher.html`, `web/teacher.css` and `web/teacher-today.css` to five suites:
- Mobile;
- Teacher feedback;
- Resource assignments;
- Chapter VI pilot read;
- Sprint 14 actions.

None of their scripts, or the helpers they import, reference:
- the removed headings or ids (`teacherProfileViewTitle`, `teacherCreateViewTitle`, `teacherArchiveViewTitle`);
- the kickers, the card headings or the archive list title;
- `data-review-kind`, the picker classes, `today-heading` or `skill-evidence-link`.

The selectors they use (`.hm-role-nav`, `#classList`, `.teacher-class-button`, `.archive-group`, `#rosterAnalyticsCard`, `#teacherWorkflowEntries`, `data-today`, `#teacherPageTitle`) are unchanged. No QA script update is needed.

The rebuilt browser manifest (`web-build/current.json`) also matches the path triggers of other production workflows. Those runs skip while `PRODUCTION_QA_AUTORUN` is unset.

**Affected production QA:** Mobile, Teacher feedback, Resource assignments, Chapter VI pilot read, Sprint 14 actions. Production QA not run (paused by owner).

## Verification (isolated, synthetic fixtures — not a live production check)

**New native Chromium regressions** in `tests/browser/teacher-workspace-polish.browser.test.mjs`. All four failed on the previous source and pass on this change:
1. **C1:** at 390, 768 and 1280 px, the assign-writing picker padding is at least 16 px, the visible controls sit at least 16 px from the card edge, and the padding equals the review picker's.
2. **C2:** in both writing views the mode container is hidden before a class/unit exists. In a real SQL-backed custom-task review the selected mode has `aria-pressed="true"`, looks different from the other mode, and the selection follows a mode change.
3. **C3:** Profile, Create and Archive each show the page title once, have no heading-level skip, and name their view region by the page title.
4. **C3:** at 390 px, the Home «Բոլոր դասարանները» link and both guide links are at least 44 px tall, and a skill-matrix cell is at least 44 × 44 px.

**Local checks:**
- `npm test`: 1,839 passed, 0 failed.
- `npm run build:web-assets`: 29 pages, 127 assets.
- `npm run check:web-assets` passes; `npm run check:teacher-bundle` passes (bundles unchanged).
- `node scripts/check-browser-qa-triggers.mjs` passes.
- Full native browser suite: see the PR description.

Exact-head CI is required before merge.

**Owner usability acceptance:** not given.

## Release

Not released. Specific PR approval, exact-head CI and the merge procedure in AGENTS.md apply.
