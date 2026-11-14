# Agent handover: teacher workspace — 14 November 2026

Open work from the Claude session of 13–14 November 2026 (teacher workspace audit, fixes C1–C3, Phase 2 design specification and prototype). Rules for every agent are in [AGENTS.md](../AGENTS.md); `docs/project-status.md` remains the authoritative status register. This note lists the state and open items only; it is not updated after 14 November.

## 1. State at handover

| Item | State |
|---|---|
| Branch | `claude/gifted-maxwell-toy1j4`, pushed. Seven commits on top of `main` `8a55009`: `8bccf4e`, `8975ea9`, `20de6bb`, `acf8007`, `219280b`, `fb30bc9`, `835aff7`, plus this note. |
| `main` | Has moved to `704dff2` (BF-16 server installation and maintenance, BF-17 school-creation MFA; five commits). |
| Overlap with `main` | Only the top entries of `README.md`, `docs/project-status.md`, `docs/sprint-roadmap.md` and `docs/backlog.md`. Keep both sets of entries, newest first. |
| `main` changes to web files | None, so the C1–C3 web build manifest should still be valid after a rebase. Confirm with `npm run check:web-assets`. |
| `main` changes to CI | `.github/workflows/ci.yml` changed, so exact-head CI must run on the rebased commit. |
| Pull request | None opened. John has not yet said whether to open one. |
| Merge or release | Nothing merged or released. |
| Production | No production write, deployment, setting change, QA dispatch, sign-in or email. |
| Read-only production lookups | One aggregate SQL count (3 active teacher memberships, 129 active assigned classes, at most 2 students in any class, 5 active enrollments; no personal data). One Vercel Web Analytics query (no data in the last 31 days). |
| Environment change | John approved adding `mikehakobyan.com` and `www.mikehakobyan.com` to the Default cloud environment's allowed hosts; the session used them as a design reference. He may want them removed. The WebFetch tool still could not resolve that host, but `curl` through the session proxy could. |

## 2. Delivered on the branch

### C1–C3: teacher fixes (approved by John; not released)

[Record](teacher-workspace-polish-20261113.md). Teacher-only CSS and HTML:
- `web/teacher.html`
- `web/teacher.css`
- `web/teacher-today.css`
- the rebuilt `web-build/` manifest and assets

The changes:
- **C1:** padding on the Assign writing picker.
- **C2:** the writing mode switch is hidden until a class and unit exist, and the selected mode is visible.
- **C3:** one page title on Profile, Create and Archive, with an ordered heading outline; 44 px targets for the remaining small links and matrix cells. New wording: «Դասարանների ցանկ».

Verification (local, isolated, synthetic data):
- Four native regressions in `tests/browser/teacher-workspace-polish.browser.test.mjs` fail on the previous source and pass.
- `npm test`: 1,839 passed.
- Full native browser suite: 700 of 700 passed.
- Typecheck, core parity, the bundle check and the web-asset check passed.

**Affected production QA:** Mobile, Teacher feedback, Resource assignments, Chapter VI pilot read, Sprint 14 actions. No QA script references the changed elements. Production QA not run (paused by owner).

The C2 rules were moved from `writing-assignments.css` to `teacher.css` on purpose. `writing-assignments.css` is also loaded by student pages, and keeping the change out of it limits the affected suites.

### Design review and Phase 2

- **[Cross-role design review](teacher-workspace-design-review-20261113.md):** audit, Nielsen heuristic findings H-1 to H-20 with severity, proposals A1–A3, B1–B8, C1–C6 and D. Appendix A has the teacher view measurements; Appendix B the second pass over the remaining teacher pages.
- **[Design specification](teacher-workspace-spec-20261113.md):** principles, shared elements, every screen, QA impact and test hooks, decisions, build order, and new Armenian wording.
- **Prototype:** `docs/design/teacher-workspace-prototype-20261113.html`, version 5.
  - Published privately at https://claude.ai/artifact/7Pw7LFMeAm2X57QHfmbAkB; only people John shares it with can open it.
  - Covers every teacher screen, including sign-in, the personal-account path, detail panels, previews, per-flow errors and the unsaved-changes guard.
  - Prototype controls: screen, width, data state, teacher type, action result, design notes.
  - Last check (13 November): 17 screens × 5 data states × 2 teacher types × 2 widths with one H1, no sideways scrolling and no script errors; 14 click paths pass at both widths.
  - One later CSS-only change (drawer scroll margin) was not re-checked.
  - To update it, edit the file and republish the same file path with the Artifact tool. From a new chat, pass the URL as `url`; it must be read first.

## 3. Decisions waiting for John

1. **Pull request for C1–C3** and its merge, under the AGENTS.md merge procedure.
2. **Display name rule (B5, H-15):** required 2–100 characters (today's teacher Profile rule), or optional up to 80 (today's account-page rule). The account page is shared by every role.
3. **Per-class support summary (B1, option B):** approve a small server summary later (with its own schema and Edge approval), or keep support counts on the class page only.
4. **A1/A2 scope:** the phone menu and page header for all staff roles (recommended: they share one layout), or a teacher-only exception.
5. **Phone menu items:** Գլխավոր, Դասարաններ, Ստուգում, Ավելին as drawn.
6. **Pilot notice:** sidebar label only (reverses the PR374 choice), or keep the visible notice on Home.
7. **One «Հանձնարարել» entry (B8),** with «Իմ առաջադրանքները» as its own menu item.
8. **Review button wording:** one set for course writing and own tasks. The prototype placeholder is «Ուղարկել ստուգումը» / «Վերադարձնել վերանայման». Armenian review needed.
9. **C4–C6 fixes:**
   - C4: material-assignment card padding. The library page is shared with other staff roles.
   - C5: class-page writing review padding.
   - C6: library guide link to 44 px.

   About 2.5 hours, same method as C1–C3.
10. **Investigation (0.5 day):** whether the existing reads can supply the cross-class returned and checked review lists, own tasks across classes, and the combined «Հանձնարարություններ» tab. This decides B4 and part of B8.
11. **Old preview page:** retire or keep `teacher-workspace-preview.html` (H-20). Removing a published page is a production change.
12. **Armenian review** of the new wording listed in spec §8 and «Դասարանների ցանկ».
13. **Validation:** one or two real teachers trying the prototype (tasks in spec §6).
14. **Device use:** do teachers mostly use phones or computers? This changes the build order.

John said he will report later if any path (for example personal-account teachers) is being phased out.

## 4. Next steps when John approves

1. Rebase the branch on `main` and resolve the four document conflicts, keeping both entries.
2. Add a dated status entry for the Phase 2 specification and prototype. Align README, roadmap and backlog as the documentation policy requires.
3. Re-run:
   - `npm test`
   - `npm run check:web-assets`
   - `npm run check:teacher-bundle`
   - `node scripts/check-browser-qa-triggers.mjs`
   - the teacher browser tests
4. Open the PR only on John's explicit request. Use the PR template, include «Affected production QA», and end with the attribution line.
5. Before merging:
   - ask John to confirm no other agent is merging;
   - check that no workflow is running or queued on `main`;
   - wait for exact-head CI.
6. After merging:
   - confirm CI on the merged commit;
   - confirm `haiedu.am` and `www.haiedu.am` serve the new build;
   - report «production QA not run (paused by owner)» with the affected suites;
   - sync Notion to the merged commit.
7. Build in this order after decisions (spec §7):
   1. C4–C6;
   2. B2 + B3 (class page);
   3. B1;
   4. B4 (after the investigation);
   5. A2 + A1;
   6. B5;
   7. A3 migration.

   Each slice needs regressions that fail on the previous source, QA-script updates with `data-testid` hooks, a dated record with "Owner usability acceptance: not given", and status alignment.

## 5. Working notes

- **Synthetic teacher fixtures:**
  - `tests/fixtures/teacher-performance-browser.mjs`: mocked dashboard.
  - `tests/fixtures/teacher-today-browser.mjs`: real handlers on an in-memory database. Its `initialURL` must be `?view=home`; navigate afterwards.
  - `tests/fixtures/teacher-task-review-browser.mjs`: harness page, not `teacher.html`.
- **Harness pages:** several flow tests (writing assignments, task authoring, custom review) render in a harness that loads the teacher styles but not the teacher layout. Container-dependent findings from those pages, such as the custom-review picker padding, are harness artefacts.
- **Screenshots and metrics:** setting `STUDENT_LAYOUT_SCREENSHOTS_DIR` makes many browser tests save screenshots. The audit added metrics through a Playwright preload (`node --import <preload> --test …`) that wrapped `chromium.launch`. The audit scripts lived in the session scratchpad and are not in the repository.
- **Headless dates:** headless Chromium shows dates in English even though the code formats them with `hy-AM`. This is not a product defect.
- **Not yet audited:** other staff roles' own page content (only their shared layout was rendered), real devices and screen readers.

## 6. Other open work (unchanged by this session)

From the [10 November handover](agent-handover-20261110.md) and the status register. Check the current register first, because `main` has moved:
- BF-16 activation and observation steps;
- [PR #43](https://github.com/johnvanesyan-arch/HaiEdu/pull/43) Chapter Review coverage;
- Dependabot PRs #467–#470, three of them major updates;
- draft [PR #407](https://github.com/johnvanesyan-arch/HaiEdu/pull/407);
- owner usability acceptance of the student design phases;
- Supabase egress;
- the earlier design proposals (first-time and empty states, account page check, desktop back link, D2/D4).
